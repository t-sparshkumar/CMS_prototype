import type { Knex } from 'knex';
import {
  createJunctionTable,
  createM2aJunctionTable,
  getRelationKind,
  isPresentationalInterface,
  isVirtualRelationInterface,
  mapSchemaOnDelete,
  registerJunctionCollection,
} from '../core/relation.js';
import {
  applyColumnType,
  getDefaultInterface,
  getFieldIndexName,
  getFieldUniqueIndexName,
  isSystemField,
  parseJsonColumn,
  validateFieldName,
} from '../core/field.js';
import { applyResolvedConditions, type FieldWithResolvedConditions } from '../core/conditions.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CmsFieldRow,
  CreateFieldInput,
  FieldMeta,
  UpdateFieldInput,
} from '../types/field.js';
import { SQL_FIELD_TYPES, type SqlFieldType } from '../types/field.js';
import type { SchemaOnDelete } from '../types/relation.js';
import { getCollection } from './collections.service.js';
import {
  assertRelatedCollectionExists,
  deleteRelationForField,
  insertRelation,
} from './relations.service.js';

function toFieldMeta(row: CmsFieldRow): FieldMeta {
  return {
    ...row,
    readonly: Boolean(row.readonly),
    hidden: Boolean(row.hidden),
    required: Boolean(row.required),
    unique: Boolean(row.unique),
    nullable: row.nullable !== false,
    is_indexed: Boolean(row.is_indexed),
    searchable: row.searchable !== false,
    options: parseJsonColumn(row.options as unknown as Record<string, unknown>),
    display_options: parseJsonColumn(row.display_options as unknown as Record<string, unknown>),
    conditions: parseJsonColumn(row.conditions as unknown as Record<string, unknown>),
    validation: parseJsonColumn(row.validation as unknown as Record<string, unknown>),
    is_system: isSystemField(row.field),
  };
}

function normalizeFieldRow(row: CmsFieldRow): CmsFieldRow {
  return {
    ...row,
    readonly: Boolean(row.readonly),
    hidden: Boolean(row.hidden),
    required: Boolean(row.required),
    unique: Boolean(row.unique),
    nullable: row.nullable !== false,
    is_indexed: Boolean(row.is_indexed),
    searchable: row.searchable !== false,
    options: parseJsonColumn(row.options as unknown as Record<string, unknown>),
    display_options: parseJsonColumn(row.display_options as unknown as Record<string, unknown>),
    conditions: parseJsonColumn(row.conditions as unknown as Record<string, unknown>),
    validation: parseJsonColumn(row.validation as unknown as Record<string, unknown>),
  };
}

function resolveNullability(required: boolean, nullable?: boolean): { required: boolean; nullable: boolean } {
  if (required) {
    return { required: true, nullable: false };
  }
  return { required: false, nullable: nullable !== false };
}

/**
 * List all fields for a collection ordered by sort.
 */
export async function listFields(
  db: Knex,
  collectionName: string,
  options: { formData?: Record<string, unknown> } = {},
): Promise<FieldMeta[] | FieldWithResolvedConditions[]> {
  await getCollection(db, collectionName);

  const rows = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName })
    .orderBy('sort', 'asc')
    .orderBy('field', 'asc');

  const fields = rows.map((row) => toFieldMeta(normalizeFieldRow(row)));

  if (options.formData) {
    return applyResolvedConditions(fields, options.formData);
  }

  return fields;
}

/**
 * Add a new field: creates a real SQL column and stores metadata.
 */
export async function createField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
): Promise<FieldMeta> {
  await getCollection(db, collectionName);

  try {
    validateFieldName(input.field);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid field name';
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }

  if (isSystemField(input.field)) {
    throw new AppError(`Field "${input.field}" is reserved as a system field`, 400, 'VALIDATION_ERROR');
  }

  const fieldInterface = input.interface ?? (input.type ? getDefaultInterface(input.type as never) : 'input');

  if (isPresentationalInterface(fieldInterface) || input.type === 'alias') {
    return createVirtualField(db, collectionName, input, fieldInterface);
  }

  if (fieldInterface === 'file' || fieldInterface.startsWith('file-')) {
    return createFileField(db, collectionName, input, fieldInterface);
  }

  const relationKind = getRelationKind(fieldInterface);

  if (relationKind) {
    return createRelationField(db, collectionName, input, fieldInterface, relationKind);
  }

  if (!input.type || !SQL_FIELD_TYPES.includes(input.type as never)) {
    throw new AppError(`Unsupported field type "${input.type ?? ''}"`, 400, 'VALIDATION_ERROR');
  }

  return createScalarField(db, collectionName, input, fieldInterface);
}

/**
 * Restore cms_fields metadata for an existing SQL column without altering schema.
 */
export async function restoreFieldMetadata(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput & { type: string; special?: string | null },
): Promise<void> {
  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    return;
  }

  const fieldInterface = input.interface ?? (input.type ? getDefaultInterface(input.type as never) : 'input');
  const relationKind = getRelationKind(fieldInterface);
  const { required, nullable } = resolveNullability(Boolean(input.required), input.nullable);

  const metaRow = buildMetaRow(collectionName, input, {
    type: input.type,
    special: input.special ?? (relationKind === 'm2o' ? 'm2o' : relationKind === 'o2m' ? 'o2m' : null),
    interface: fieldInterface,
    sort: input.sort ?? 99,
    required,
    nullable,
  });

  await db('cms_fields').insert(metaRow);
}

async function createVirtualField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
  fieldInterface: string,
): Promise<FieldMeta> {
  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    throw new AppError(`Field "${input.field}" already exists`, 409, 'FIELD_EXISTS');
  }

  const maxSortResult = await db('cms_fields')
    .where({ collection: collectionName })
    .max<{ max_sort: number | string | null }>({ max_sort: 'sort' })
    .first();

  const nextSort = input.sort ?? Number(maxSortResult?.max_sort ?? 0) + 1;
  const { required, nullable } = resolveNullability(Boolean(input.required), input.nullable);

  const metaRow = buildMetaRow(collectionName, input, {
    type: 'alias',
    special: isPresentationalInterface(fieldInterface) ? fieldInterface : null,
    interface: fieldInterface,
    sort: nextSort,
    required,
    nullable,
  });

  await db('cms_fields').insert(metaRow);
  return loadCreatedField(db, collectionName, input.field);
}

async function createFileField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
  fieldInterface: string,
): Promise<FieldMeta> {
  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    throw new AppError(`Field "${input.field}" already exists`, 409, 'FIELD_EXISTS');
  }

  const maxSortResult = await db('cms_fields')
    .where({ collection: collectionName })
    .max<{ max_sort: number | string | null }>({ max_sort: 'sort' })
    .first();

  const nextSort = input.sort ?? Number(maxSortResult?.max_sort ?? 0) + 1;
  const { required, nullable } = resolveNullability(Boolean(input.required), input.nullable);
  const isUnique = Boolean(input.unique);
  const isIndexed = Boolean(input.is_indexed);

  const metaRow = buildMetaRow(collectionName, input, {
    type: 'uuid',
    special: 'file',
    interface: fieldInterface,
    sort: nextSort,
    required,
    nullable,
  });

  try {
    await db.transaction(async (trx) => {
      await trx.schema.table(collectionName, (table) => {
        const column = table.uuid(input.field);
        if (required) column.notNullable();
        else column.nullable();
        if (isUnique) column.unique();
      });
      if (isIndexed) {
        await trx.schema.table(collectionName, (table) => {
          table.index([input.field], getFieldIndexName(collectionName, input.field));
        });
      }
      await trx('cms_fields').insert(metaRow);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create file field';
    throw new AppError(message, 500, 'SCHEMA_ERROR');
  }

  return loadCreatedField(db, collectionName, input.field);
}

async function createScalarField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
  fieldInterface: string,
): Promise<FieldMeta> {
  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    throw new AppError(`Field "${input.field}" already exists`, 409, 'FIELD_EXISTS');
  }

  const maxSortResult = await db('cms_fields')
    .where({ collection: collectionName })
    .max<{ max_sort: number | string | null }>({ max_sort: 'sort' })
    .first();

  const nextSort = input.sort ?? Number(maxSortResult?.max_sort ?? 0) + 1;
  const { required, nullable } = resolveNullability(Boolean(input.required), input.nullable);
  const isUnique = Boolean(input.unique);
  const isIndexed = Boolean(input.is_indexed);
  const fieldType = input.type as SqlFieldType;

  const metaRow = buildMetaRow(collectionName, input, {
    type: fieldType,
    special: null,
    interface: fieldInterface,
    sort: nextSort,
    required,
    nullable,
  });

  try {
    await db.transaction(async (trx) => {
      await trx.schema.table(collectionName, (table) => {
        applyColumnType(table, input.field, fieldType, required, input.default_value);
        if (isUnique) {
          table.unique([input.field], { indexName: getFieldUniqueIndexName(collectionName, input.field) });
        }
      });
      if (isIndexed) {
        await trx.schema.table(collectionName, (table) => {
          table.index([input.field], getFieldIndexName(collectionName, input.field));
        });
      }
      await trx('cms_fields').insert(metaRow);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create field';
    throw new AppError(message, 500, 'SCHEMA_ERROR');
  }

  return loadCreatedField(db, collectionName, input.field);
}

async function createRelationField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
  fieldInterface: string,
  relationKind: 'm2o' | 'o2m' | 'm2m' | 'm2a',
): Promise<FieldMeta> {
  if (relationKind === 'm2a') {
    return createM2aField(db, collectionName, input, fieldInterface);
  }

  const relatedCollection = input.options?.related_collection as string | undefined;
  if (!relatedCollection) {
    throw new AppError('options.related_collection is required for relation fields', 400, 'VALIDATION_ERROR');
  }

  await assertRelatedCollectionExists(db, relatedCollection);

  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    throw new AppError(`Field "${input.field}" already exists`, 409, 'FIELD_EXISTS');
  }

  const maxSortResult = await db('cms_fields')
    .where({ collection: collectionName })
    .max<{ max_sort: number | string | null }>({ max_sort: 'sort' })
    .first();

  const nextSort = input.sort ?? Number(maxSortResult?.max_sort ?? 0) + 1;
  const { required, nullable } = resolveNullability(Boolean(input.required), input.nullable);
  const schemaOnDelete = (input.options?.schema_on_delete as SchemaOnDelete | undefined) ?? 'SET NULL';

  if (relationKind === 'm2o') {
    const metaRow = buildMetaRow(collectionName, input, {
      type: 'uuid',
      special: 'm2o',
      interface: fieldInterface,
      sort: nextSort,
      required,
      nullable,
    });

    await db.transaction(async (trx) => {
      await trx.schema.table(collectionName, (table) => {
        const column = table.uuid(input.field);
        if (required) column.notNullable();
        else column.nullable();
        column.references('id').inTable(relatedCollection!).onDelete(mapSchemaOnDelete(schemaOnDelete));
      });
      await trx('cms_fields').insert(metaRow);
      await insertRelation(trx, {
        many_collection: collectionName,
        many_field: input.field,
        one_collection: relatedCollection!,
        one_field: 'id',
        junction_collection: null,
        sort_field: null,
        schema_on_delete: schemaOnDelete,
      });
    });
  } else if (relationKind === 'o2m') {
    const relatedField = input.options?.related_field as string | undefined;
    if (!relatedField) {
      throw new AppError('options.related_field is required for one-to-many fields', 400, 'VALIDATION_ERROR');
    }

    const fkField = await db('cms_fields')
      .where({ collection: relatedCollection!, field: relatedField })
      .first();

    if (!fkField) {
      throw new AppError(
        `Related field "${relatedField}" not found on collection "${relatedCollection}"`,
        404,
        'NOT_FOUND',
      );
    }

    const metaRow = buildMetaRow(collectionName, input, {
      type: 'alias',
      special: 'o2m',
      interface: fieldInterface,
      sort: nextSort,
      required: false,
      nullable: true,
    });

    await db.transaction(async (trx) => {
      await trx('cms_fields').insert(metaRow);
      await insertRelation(trx, {
        many_collection: relatedCollection!,
        many_field: relatedField,
        one_collection: collectionName,
        one_field: 'id',
        junction_collection: null,
        sort_field: input.field,
        schema_on_delete: schemaOnDelete,
      });
    });
  } else {
    const withSort = Boolean(input.options?.with_sort);
    const metaRow = buildMetaRow(collectionName, input, {
      type: 'alias',
      special: 'm2m',
      interface: fieldInterface,
      sort: nextSort,
      required: false,
      nullable: true,
    });

    await db.transaction(async (trx) => {
      const junctionTable = await createJunctionTable(trx, collectionName, relatedCollection!, { withSort });
      await registerJunctionCollection(trx, junctionTable);
      await trx('cms_fields').insert(metaRow);
      await insertRelation(trx, {
        many_collection: collectionName,
        many_field: input.field,
        one_collection: relatedCollection!,
        one_field: 'id',
        junction_collection: junctionTable,
        sort_field: withSort ? 'sort' : null,
        schema_on_delete: schemaOnDelete,
      });
    });
  }

  return loadCreatedField(db, collectionName, input.field);
}

async function createM2aField(
  db: Knex,
  collectionName: string,
  input: CreateFieldInput,
  fieldInterface: string,
): Promise<FieldMeta> {
  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: input.field })
    .first();

  if (existing) {
    throw new AppError(`Field "${input.field}" already exists`, 409, 'FIELD_EXISTS');
  }

  const maxSortResult = await db('cms_fields')
    .where({ collection: collectionName })
    .max<{ max_sort: number | string | null }>({ max_sort: 'sort' })
    .first();

  const nextSort = input.sort ?? Number(maxSortResult?.max_sort ?? 0) + 1;
  const metaRow = buildMetaRow(collectionName, input, {
    type: 'alias',
    special: 'm2a',
    interface: fieldInterface,
    sort: nextSort,
    required: false,
    nullable: true,
  });

  await db.transaction(async (trx) => {
    const junctionTable = await createM2aJunctionTable(trx, collectionName);
    await registerJunctionCollection(trx, junctionTable);
    await trx('cms_fields').insert(metaRow);
    await insertRelation(trx, {
      many_collection: collectionName,
      many_field: input.field,
      one_collection: '*',
      one_field: 'id',
      junction_collection: junctionTable,
      sort_field: 'sort',
      schema_on_delete: 'CASCADE',
    });
  });

  return loadCreatedField(db, collectionName, input.field);
}

function buildMetaRow(
  collectionName: string,
  input: CreateFieldInput,
  overrides: {
    type: string;
    special: string | null;
    interface: string;
    sort: number;
    required: boolean;
    nullable: boolean;
  },
) {
  return {
    collection: collectionName,
    field: input.field,
    type: overrides.type,
    special: overrides.special,
    interface: overrides.interface,
    options: input.options ? JSON.stringify(input.options) : null,
    display: input.display ?? null,
    display_options: input.display_options ? JSON.stringify(input.display_options) : null,
    readonly: Boolean(input.readonly),
    hidden: Boolean(input.hidden),
    sort: overrides.sort,
    width: input.width ?? 12,
    required: overrides.required,
    nullable: overrides.nullable,
    unique: Boolean(input.unique),
    is_indexed: Boolean(input.is_indexed),
    searchable: input.searchable !== false,
    validation: input.validation ? JSON.stringify(input.validation) : null,
    group: input.group ?? null,
    conditions: null,
    note: input.note ?? null,
    default_value: input.default_value ?? null,
  };
}

async function loadCreatedField(db: Knex, collectionName: string, fieldName: string): Promise<FieldMeta> {
  const created = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!created) {
    throw new AppError('Failed to load created field', 500, 'INTERNAL_ERROR');
  }

  return toFieldMeta(normalizeFieldRow(created));
}

/**
 * Update field metadata. SQL type changes are not allowed.
 */
export async function updateField(
  db: Knex,
  collectionName: string,
  fieldName: string,
  input: UpdateFieldInput,
): Promise<{ field: FieldMeta; warning?: string }> {
  await getCollection(db, collectionName);

  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!existing) {
    throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
  }

  let warning: string | undefined;
  if (input.type !== undefined && input.type !== existing.type) {
    warning = 'SQL column type cannot be changed after creation. Only metadata was considered for update.';
  }

  const updates: Record<string, unknown> = {};
  const isVirtual = isVirtualRelationInterface(existing.interface) || isPresentationalInterface(existing.interface);

  if (input.interface !== undefined) updates.interface = input.interface;
  if (input.options !== undefined) updates.options = input.options ? JSON.stringify(input.options) : null;
  if (input.display !== undefined) updates.display = input.display;
  if (input.display_options !== undefined) {
    updates.display_options = input.display_options ? JSON.stringify(input.display_options) : null;
  }
  if (input.readonly !== undefined) updates.readonly = input.readonly;
  if (input.hidden !== undefined) updates.hidden = input.hidden;
  if (input.sort !== undefined) updates.sort = input.sort;
  if (input.width !== undefined) updates.width = input.width;
  if (input.searchable !== undefined) updates.searchable = input.searchable;
  if (input.validation !== undefined) {
    updates.validation = input.validation ? JSON.stringify(input.validation) : null;
  }
  if (input.group !== undefined) updates.group = input.group;
  if (input.conditions !== undefined) {
    updates.conditions = input.conditions ? JSON.stringify(input.conditions) : null;
  }
  if (input.note !== undefined) updates.note = input.note;
  if (input.default_value !== undefined) updates.default_value = input.default_value;

  const nextRequired = input.required !== undefined ? Boolean(input.required) : Boolean(existing.required);
  const nextNullable =
    input.nullable !== undefined
      ? input.nullable
      : input.required !== undefined
        ? !input.required
        : existing.nullable !== false;

  if (input.required !== undefined || input.nullable !== undefined) {
    updates.required = nextRequired;
    updates.nullable = nextNullable;
  }

  if (input.unique !== undefined) updates.unique = input.unique;
  if (input.is_indexed !== undefined) updates.is_indexed = input.is_indexed;

  const uniqueChanged =
    input.unique !== undefined && Boolean(input.unique) !== Boolean(existing.unique);
  const indexedChanged =
    input.is_indexed !== undefined && Boolean(input.is_indexed) !== Boolean(existing.is_indexed);
  const nullabilityChanged =
    nextRequired !== Boolean(existing.required) || nextNullable !== (existing.nullable !== false);

  const schemaChanged =
    !isVirtual &&
    (((input.required !== undefined || input.nullable !== undefined) && nullabilityChanged) ||
      uniqueChanged ||
      indexedChanged);

  if (schemaChanged) {
    await db.transaction(async (trx) => {
      if ((input.required !== undefined || input.nullable !== undefined) && nullabilityChanged) {
        await trx.schema.alterTable(collectionName, (table) => {
          const column = table.specificType(fieldName, getAlterColumnType(existing.type));
          if (nextRequired) column.notNullable().alter();
          else column.nullable().alter();
        });
      }

      if (uniqueChanged) {
        const uniqueIndex = getFieldUniqueIndexName(collectionName, fieldName);
        if (input.unique) {
          await trx.schema.alterTable(collectionName, (table) => {
            table.unique([fieldName], { indexName: uniqueIndex });
          });
        } else {
          await trx.schema.alterTable(collectionName, (table) => {
            table.dropUnique([fieldName], uniqueIndex);
          }).catch(() => undefined);
        }
      }

      if (indexedChanged) {
        const indexName = getFieldIndexName(collectionName, fieldName);
        if (input.is_indexed) {
          await trx.schema.alterTable(collectionName, (table) => {
            table.index([fieldName], indexName);
          });
        } else {
          await trx.schema.alterTable(collectionName, (table) => {
            table.dropIndex([fieldName], indexName);
          }).catch(() => undefined);
        }
      }

      if (Object.keys(updates).length > 0) {
        await trx('cms_fields').where({ collection: collectionName, field: fieldName }).update(updates);
      }
    });
  } else if (Object.keys(updates).length > 0) {
    await db('cms_fields').where({ collection: collectionName, field: fieldName }).update(updates);
  }

  if (Object.keys(updates).length === 0 && !warning) {
    // Idempotent save — nothing changed, return the existing field.
    const unchanged = await db<CmsFieldRow>('cms_fields')
      .where({ collection: collectionName, field: fieldName })
      .first();
    if (!unchanged) {
      throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
    }
    return { field: toFieldMeta(normalizeFieldRow(unchanged)) };
  }

  const updated = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!updated) {
    throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
  }

  const result: { field: FieldMeta; warning?: string } = {
    field: toFieldMeta(normalizeFieldRow(updated)),
  };
  if (warning) {
    result.warning = warning;
  }
  return result;
}

function getAlterColumnType(type: string): string {
  switch (type) {
    case 'uuid':
      return 'uuid';
    case 'integer':
      return 'integer';
    case 'bigInteger':
      return 'bigint';
    case 'boolean':
      return 'boolean';
    case 'text':
    case 'csv':
      return 'text';
    case 'json':
      return 'json';
    case 'datetime':
      return 'datetime';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'binary':
      return 'blob';
    default:
      return 'varchar(255)';
  }
}

/**
 * Delete a field: drops the SQL column and removes metadata. System fields cannot be deleted.
 */
export async function deleteField(db: Knex, collectionName: string, fieldName: string): Promise<void> {
  await getCollection(db, collectionName);

  if (isSystemField(fieldName)) {
    throw new AppError(`System field "${fieldName}" cannot be deleted`, 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!existing) {
    throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
  }

  const isVirtual =
    isVirtualRelationInterface(existing.interface) || isPresentationalInterface(existing.interface);

  try {
    await db.transaction(async (trx) => {
      if (!isVirtual) {
        if (existing.is_indexed) {
          await trx.schema.alterTable(collectionName, (table) => {
            table.dropIndex([fieldName], getFieldIndexName(collectionName, fieldName));
          });
        }
        if (existing.unique) {
          await trx.schema.alterTable(collectionName, (table) => {
            table.dropUnique([fieldName], getFieldUniqueIndexName(collectionName, fieldName));
          });
        }
        await trx.schema.table(collectionName, (table) => {
          table.dropColumn(fieldName);
        });
      }
      await trx('cms_fields').where({ collection: collectionName, field: fieldName }).delete();
    });
    await deleteRelationForField(db, collectionName, fieldName);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete field';
    throw new AppError(message, 500, 'SCHEMA_ERROR');
  }
}

/**
 * Get a single field by name.
 */
export async function getField(db: Knex, collectionName: string, fieldName: string): Promise<FieldMeta> {
  await getCollection(db, collectionName);

  const row = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!row) {
    throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
  }

  return toFieldMeta(normalizeFieldRow(row));
}

/**
 * Check if a field is stored as a physical SQL column.
 */
export function isPhysicalField(field: FieldMeta): boolean {
  return (
    !isVirtualRelationInterface(field.interface) &&
    !isPresentationalInterface(field.interface) &&
    field.type !== 'alias'
  );
}

/**
 * Batch reorder fields for a collection.
 */
export async function reorderFields(
  db: Knex,
  collectionName: string,
  items: Array<{ field: string; sort: number; group?: string | null }>,
): Promise<void> {
  await getCollection(db, collectionName);

  await db.transaction(async (trx) => {
    for (const item of items) {
      const updates: Record<string, unknown> = { sort: item.sort };
      if (item.group !== undefined) {
        updates.group = item.group;
      }
      await trx('cms_fields').where({ collection: collectionName, field: item.field }).update(updates);
    }
  });
}

/**
 * Duplicate a field with a _copy suffix.
 */
export async function duplicateField(
  db: Knex,
  collectionName: string,
  fieldName: string,
): Promise<FieldMeta> {
  const existing = await getField(db, collectionName, fieldName);
  let newName = `${fieldName}_copy`;
  let counter = 1;
  while (await db('cms_fields').where({ collection: collectionName, field: newName }).first()) {
    newName = `${fieldName}_copy_${counter++}`;
  }

  const input: CreateFieldInput = {
    field: newName,
    type: existing.type as CreateFieldInput['type'],
    interface: existing.interface,
    options: existing.options,
    display: existing.display,
    display_options: existing.display_options,
    readonly: existing.readonly,
    hidden: existing.hidden,
    sort: existing.sort + 1,
    width: existing.width,
    required: existing.required,
    group: existing.group,
    note: existing.note,
    default_value: existing.default_value,
    unique: existing.unique,
    nullable: existing.nullable,
    is_indexed: existing.is_indexed,
    searchable: existing.searchable,
    validation: existing.validation,
  };

  return createField(db, collectionName, input);
}

/**
 * Rename a field (column + metadata).
 */
export async function renameField(
  db: Knex,
  collectionName: string,
  fieldName: string,
  newFieldName: string,
): Promise<FieldMeta> {
  if (isSystemField(fieldName)) {
    throw new AppError(`System field "${fieldName}" cannot be renamed`, 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsFieldRow>('cms_fields')
    .where({ collection: collectionName, field: fieldName })
    .first();

  if (!existing) {
    throw new AppError(`Field "${fieldName}" not found`, 404, 'NOT_FOUND');
  }

  const nameTaken = await db('cms_fields').where({ collection: collectionName, field: newFieldName }).first();
  if (nameTaken) {
    throw new AppError(`Field "${newFieldName}" already exists`, 409, 'FIELD_EXISTS');
  }

  const isVirtual =
    isVirtualRelationInterface(existing.interface) || isPresentationalInterface(existing.interface);

  await db.transaction(async (trx) => {
    if (!isVirtual && existing.type !== 'alias') {
      await trx.schema.alterTable(collectionName, (table) => {
        table.renameColumn(fieldName, newFieldName);
      });
    }
    await trx('cms_fields').where({ collection: collectionName, field: fieldName }).update({ field: newFieldName });
    await trx('cms_relations')
      .where({ many_collection: collectionName, many_field: fieldName })
      .update({ many_field: newFieldName });
  });

  return getField(db, collectionName, newFieldName);
}
