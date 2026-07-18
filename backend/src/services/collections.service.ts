import type { Knex } from 'knex';
import {
  createCollectionTable,
  insertSystemFields,
  validateCollectionName,
} from '../core/collection.js';
import { insertRelation } from './relations.service.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CollectionMeta,
  CreateCollectionInput,
  CmsCollectionRow,
  UpdateCollectionInput,
} from '../types/collection.js';

function toCollectionMeta(
  collection: CmsCollectionRow,
  fieldCount: number,
  childCount = 0,
): CollectionMeta {
  return {
    ...collection,
    singleton: Boolean(collection.singleton),
    hidden: Boolean(collection.hidden),
    system: Boolean(collection.system),
    activity_tracking: collection.activity_tracking !== false,
    is_group: Boolean(collection.is_group),
    parent: collection.parent ?? null,
    sort: Number(collection.sort ?? 0),
    field_count: fieldCount,
    child_count: childCount,
  };
}

async function validateParentCollection(
  db: Knex,
  parentName: string | null | undefined,
  collectionName?: string,
): Promise<void> {
  if (parentName === undefined) return;
  if (parentName === null) return;

  if (collectionName && parentName === collectionName) {
    throw new AppError('A collection cannot be its own parent', 400, 'VALIDATION_ERROR');
  }

  const parent = await db<CmsCollectionRow>('cms_collections')
    .where({ collection: parentName })
    .first();

  if (!parent) {
    throw new AppError(`Parent collection "${parentName}" not found`, 404, 'NOT_FOUND');
  }
}

/**
 * List all user-created collections with field counts.
 */
export async function listCollections(
  db: Knex,
  options: { includeHidden?: boolean; parent?: string | null } = {},
): Promise<CollectionMeta[]> {
  const query = db<CmsCollectionRow>('cms_collections').select('*').orderBy([
    { column: 'sort', order: 'asc' },
    { column: 'collection', order: 'asc' },
  ]);

  if (!options.includeHidden) {
    query.where({ hidden: false });
  }

  if (options.parent !== undefined) {
    if (options.parent === null) {
      query.whereNull('parent');
    } else {
      query.where({ parent: options.parent });
    }
  }

  const collections = await query;

  const fieldCounts = await db('cms_fields')
    .select('collection')
    .count<{ collection: string; count: string | number }[]>({ count: '*' })
    .groupBy('collection');

  const childCounts = await db('cms_collections')
    .select('parent')
    .count<{ parent: string | null; count: string | number }[]>({ count: '*' })
    .whereNotNull('parent')
    .groupBy('parent');

  const countMap = new Map(
    fieldCounts.map((row) => [row.collection, Number(row.count)]),
  );
  const childCountMap = new Map(
    childCounts.map((row) => [row.parent, Number(row.count)]),
  );

  return collections.map((collection) =>
    toCollectionMeta(
      collection,
      countMap.get(collection.collection) ?? 0,
      childCountMap.get(collection.collection) ?? 0,
    ),
  );
}

/**
 * Create a new collection: meta row, physical SQL table, and system fields.
 */
export async function createCollection(db: Knex, input: CreateCollectionInput): Promise<CollectionMeta> {
  try {
    validateCollectionName(input.collection);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid collection name';
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsCollectionRow>('cms_collections')
    .where({ collection: input.collection })
    .first();

  if (existing) {
    throw new AppError(`Collection "${input.collection}" already exists`, 409, 'COLLECTION_EXISTS');
  }

  const tableExists = await db.schema.hasTable(input.collection);
  if (tableExists) {
    const metaExists = await db<CmsCollectionRow>('cms_collections')
      .where({ collection: input.collection })
      .first();
    if (metaExists) {
      throw new AppError(`Collection "${input.collection}" already exists`, 409, 'COLLECTION_EXISTS');
    }
    // Recover from a previous failed create that left an orphan SQL table.
    await db.schema.dropTableIfExists(input.collection);
  }

  const isGroup = Boolean(input.is_group);
  if (isGroup && input.singleton) {
    throw new AppError('Group collections cannot be singletons', 400, 'VALIDATION_ERROR');
  }

  await validateParentCollection(db, input.parent, input.collection);

  const optionalSystemFields = input.optional_system_fields ?? { accountability: true };
  const tableOptions = {
    primaryKeyType: input.primary_key_type ?? 'uuid',
    optionalSystemFields,
  };

  const meta: CmsCollectionRow = {
    collection: input.collection,
    display_name: input.display_name ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    display_template: input.display_template ?? null,
    note: input.note ?? null,
    singleton: Boolean(input.singleton),
    sort_field: input.sort_field ?? (optionalSystemFields.sort ? 'sort' : null),
    archive_field: input.archive_field ?? (optionalSystemFields.status ? 'status' : null),
    archive_value: input.archive_value ?? (optionalSystemFields.status ? 'archived' : null),
    unarchive_value: input.unarchive_value ?? (optionalSystemFields.status ? 'draft' : null),
    hidden: Boolean(input.hidden),
    system: Boolean(input.system),
    activity_tracking: true,
    parent: input.parent ?? null,
    is_group: isGroup,
    sort: input.sort ?? 0,
  };

  try {
    await db.transaction(async (trx) => {
      await trx('cms_collections').insert(meta);

      if (!isGroup) {
        await createCollectionTable(trx, input.collection, tableOptions);
        await insertSystemFields(trx, input.collection, {
          optionalSystemFields,
          primaryKeyType: tableOptions.primaryKeyType,
        });

        if (optionalSystemFields.accountability) {
          await insertRelation(trx, {
            many_collection: input.collection,
            many_field: 'user_created',
            one_collection: 'cms_users',
            one_field: 'id',
            junction_collection: null,
            sort_field: null,
            schema_on_delete: 'SET NULL',
          });
          await insertRelation(trx, {
            many_collection: input.collection,
            many_field: 'user_updated',
            one_collection: 'cms_users',
            one_field: 'id',
            junction_collection: null,
            sort_field: null,
            schema_on_delete: 'SET NULL',
          });
        }
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create collection';
    throw new AppError(message, 500, 'SCHEMA_ERROR');
  }

  return getCollection(db, input.collection);
}

/**
 * Duplicate a collection structure (metadata + fields, no item data).
 */
export async function duplicateCollection(
  db: Knex,
  sourceName: string,
  targetName: string,
): Promise<CollectionMeta> {
  const source = await getCollection(db, sourceName);
  const sourceFields = await db('cms_fields').where({ collection: sourceName }).orderBy('sort', 'asc');

  const optionalSystemFields = {
    status: sourceFields.some((f: { field: string }) => f.field === 'status'),
    sort: sourceFields.some((f: { field: string }) => f.field === 'sort'),
    accountability: sourceFields.some((f: { field: string }) => f.field === 'date_created'),
  };

  await createCollection(db, {
    collection: targetName,
    icon: source.icon,
    color: source.color,
    display_template: source.display_template,
    note: source.note,
    singleton: source.singleton,
    sort_field: source.sort_field,
    archive_field: source.archive_field,
    archive_value: source.archive_value,
    unarchive_value: source.unarchive_value,
    hidden: source.hidden,
    optional_system_fields: optionalSystemFields,
  });

  for (const field of sourceFields.filter((f: { field: string; is_system?: boolean }) => !['id', 'status', 'sort', 'date_created', 'date_updated', 'user_created', 'user_updated'].includes(f.field))) {
    const { id: _id, collection: _c, ...fieldData } = field as Record<string, unknown>;
    await db('cms_fields').insert({
      ...fieldData,
      collection: targetName,
      options: fieldData.options ? JSON.stringify(fieldData.options) : fieldData.options,
      display_options: fieldData.display_options ? JSON.stringify(fieldData.display_options) : fieldData.display_options,
      conditions: fieldData.conditions ? JSON.stringify(fieldData.conditions) : fieldData.conditions,
      validation: fieldData.validation ? JSON.stringify(fieldData.validation) : fieldData.validation,
    });
  }

  return getCollection(db, targetName);
}

/**
 * Rename a collection (table + metadata).
 */
export async function renameCollection(db: Knex, oldName: string, newName: string): Promise<CollectionMeta> {
  validateCollectionName(newName);
  await getCollection(db, oldName);

  const exists = await db('cms_collections').where({ collection: newName }).first();
  if (exists) {
    throw new AppError(`Collection "${newName}" already exists`, 409, 'COLLECTION_EXISTS');
  }

  await db.transaction(async (trx) => {
    await trx('cms_collections').where({ parent: oldName }).update({ parent: newName });

    if (!(await trx.schema.hasTable(oldName))) {
      await trx('cms_collections').where({ collection: oldName }).update({ collection: newName });
      await trx('cms_fields').where({ collection: oldName }).update({ collection: newName });
    } else {
      await trx.schema.renameTable(oldName, newName);
      await trx('cms_collections').where({ collection: oldName }).update({ collection: newName });
      await trx('cms_fields').where({ collection: oldName }).update({ collection: newName });
    }
    await trx('cms_relations')
      .where('many_collection', oldName)
      .update({ many_collection: newName });
    await trx('cms_relations')
      .where('one_collection', oldName)
      .update({ one_collection: newName });
    await trx('cms_relations')
      .where('junction_collection', oldName)
      .update({ junction_collection: newName });
    await trx('cms_permissions').where({ collection: oldName }).update({ collection: newName });
  });

  return getCollection(db, newName);
}

/**
 * Delete a collection: drop the physical table and remove metadata.
 */
export async function deleteCollection(db: Knex, collectionName: string): Promise<void> {
  try {
    validateCollectionName(collectionName);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid collection name';
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsCollectionRow>('cms_collections')
    .where({ collection: collectionName })
    .first();

  if (!existing) {
    throw new AppError(`Collection "${collectionName}" not found`, 404, 'NOT_FOUND');
  }

  const childCount = await db('cms_collections')
    .where({ parent: collectionName })
    .count<{ count: string | number }>({ count: '*' })
    .first();

  if (Number(childCount?.count ?? 0) > 0) {
    throw new AppError(
      `Collection "${collectionName}" has sub-collections. Move or delete them first.`,
      400,
      'VALIDATION_ERROR',
    );
  }

  try {
    await db.transaction(async (trx) => {
      const isGroup = Boolean(existing.is_group);

      if (!isGroup) {
        const junctionRelations = await trx('cms_relations')
          .where('many_collection', collectionName)
          .orWhere('one_collection', collectionName)
          .whereNotNull('junction_collection')
          .select('junction_collection');

        const junctionTables = new Set(
          junctionRelations
            .map((row: { junction_collection: string | null }) => row.junction_collection)
            .filter((name): name is string => Boolean(name)),
        );

        for (const junctionTable of junctionTables) {
          await trx.schema.dropTableIfExists(junctionTable);
          await trx('cms_fields').where({ collection: junctionTable }).delete();
          await trx('cms_collections').where({ collection: junctionTable }).delete();
        }

        const m2aTable = `${collectionName}_m2a`;
        if (await trx.schema.hasTable(m2aTable)) {
          await trx.schema.dropTableIfExists(m2aTable);
          await trx('cms_fields').where({ collection: m2aTable }).delete();
          await trx('cms_collections').where({ collection: m2aTable }).delete();
        }

        await trx.schema.dropTableIfExists(collectionName);
        await trx('cms_fields').where({ collection: collectionName }).delete();

        await trx('cms_relations')
          .where('many_collection', collectionName)
          .orWhere('one_collection', collectionName)
          .orWhere('junction_collection', collectionName)
          .delete();

        await trx('cms_permissions').where({ collection: collectionName }).delete();
      }

      await trx('cms_collections').where({ collection: collectionName }).delete();
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete collection';
    throw new AppError(message, 500, 'SCHEMA_ERROR');
  }
}

/**
 * Get a single collection by name.
 */
export async function getCollection(db: Knex, collectionName: string): Promise<CollectionMeta> {
  const collection = await db<CmsCollectionRow>('cms_collections')
    .where({ collection: collectionName })
    .first();

  if (!collection) {
    throw new AppError(`Collection "${collectionName}" not found`, 404, 'NOT_FOUND');
  }

  const fieldCountResult = await db('cms_fields')
    .where({ collection: collectionName })
    .count<{ count: string | number }>({ count: '*' })
    .first();

  const childCountResult = await db('cms_collections')
    .where({ parent: collectionName })
    .count<{ count: string | number }>({ count: '*' })
    .first();

  return toCollectionMeta(
    collection,
    Number(fieldCountResult?.count ?? 0),
    Number(childCountResult?.count ?? 0),
  );
}

/**
 * Update collection metadata.
 */
export async function updateCollection(
  db: Knex,
  collectionName: string,
  input: UpdateCollectionInput,
): Promise<CollectionMeta> {
  await getCollection(db, collectionName);

  const updates: Partial<CmsCollectionRow> = {};
  if (input.display_name !== undefined) updates.display_name = input.display_name;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.color !== undefined) updates.color = input.color;
  if (input.display_template !== undefined) updates.display_template = input.display_template;
  if (input.note !== undefined) updates.note = input.note;
  if (input.singleton !== undefined) updates.singleton = Boolean(input.singleton);
  if (input.sort_field !== undefined) updates.sort_field = input.sort_field;
  if (input.archive_field !== undefined) updates.archive_field = input.archive_field;
  if (input.archive_value !== undefined) updates.archive_value = input.archive_value;
  if (input.unarchive_value !== undefined) updates.unarchive_value = input.unarchive_value;
  if (input.hidden !== undefined) updates.hidden = Boolean(input.hidden);
  if (input.activity_tracking !== undefined) {
    updates.activity_tracking = Boolean(input.activity_tracking);
  }
  if (input.parent !== undefined) {
    await validateParentCollection(db, input.parent, collectionName);
    updates.parent = input.parent;
  }
  if (input.is_group !== undefined) updates.is_group = Boolean(input.is_group);
  if (input.sort !== undefined) updates.sort = input.sort;

  if (Object.keys(updates).length > 0) {
    await db('cms_collections').where({ collection: collectionName }).update(updates);
  }

  return getCollection(db, collectionName);
}

/**
 * Batch reorder collections by updating their sort values.
 */
export async function reorderCollections(
  db: Knex,
  items: Array<{ collection: string; sort: number }>,
): Promise<void> {
  if (items.length === 0) return;

  const names = items.map((item) => item.collection);
  const existing = await db<CmsCollectionRow>('cms_collections').whereIn('collection', names);

  if (existing.length !== names.length) {
    throw new AppError('One or more collections were not found', 404, 'NOT_FOUND');
  }

  const parents = new Set(existing.map((row) => row.parent ?? null));
  if (parents.size > 1) {
    throw new AppError('All reordered collections must share the same parent', 400, 'VALIDATION_ERROR');
  }

  await db.transaction(async (trx) => {
    for (const item of items) {
      await trx('cms_collections').where({ collection: item.collection }).update({ sort: item.sort });
    }
  });
}
