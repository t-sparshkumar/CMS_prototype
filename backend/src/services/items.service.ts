import type { Knex } from 'knex';
import { isManyToManyInterface } from '../core/relation.js';
import { v4 as uuidv4 } from 'uuid';
import { validateItemInput } from '../core/validation.js';
import { applyFilters, applySearch, applySort } from '../core/filter-builder.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CreateItemInput,
  ItemListResult,
  ItemQueryOptions,
  ItemRecord,
  UpdateItemInput,
  ReorderItemsInput,
} from '../types/item.js';
import type { FieldMeta } from '../types/field.js';
import { isPhysicalField, listFields } from './fields.service.js';
import {
  enrichItemWithRelations,
  syncManyToManyRelations,
} from './relation-resolver.service.js';
import { findConfiguredTranslationsField, syncTranslationRows } from './translations.service.js';
import type { AccessContext } from '../types/permission.js';
import { getCollection } from './collections.service.js';
import { filterReadableFields, filterWritableInput } from './permissions.service.js';
import { logActivity } from './activity.service.js';
import { syncM2aRelations } from './m2a.service.js';

async function runItemEventFlows(
  db: Knex,
  context: {
    collection: string;
    event: 'create' | 'update' | 'delete';
    hook: 'filter' | 'action';
    keys?: string[];
    payload?: Record<string, unknown>;
    userId: string | null;
  },
): Promise<Record<string, unknown> | undefined> {
  const { runEventFlows } = await import('./flows/trigger.service.js');
  const result = await runEventFlows(db, {
    collection: context.collection,
    event: context.event,
    hook: context.hook,
    keys: context.keys,
    payload: context.payload,
    accountability: { user: context.userId, role: null },
  });
  return result.payload;
}

const SYSTEM_AUTO_FIELDS = new Set(['id', 'date_created', 'date_updated', 'user_created', 'user_updated']);

/**
 * List items in a collection with filtering, sorting, pagination, and search.
 */
export async function listItems(
  db: Knex,
  collectionName: string,
  options: ItemQueryOptions,
  access: AccessContext,
): Promise<ItemListResult> {
  const collection = await getCollection(db, collectionName);
  const fields = await listFields(db, collectionName);
  const physicalFields = fields.filter(isPhysicalField);
  const allowedFields = new Set(physicalFields.map((f) => f.field));
  const searchableFields = physicalFields
    .filter((f) => f.searchable !== false)
    .filter((f) => f.type === 'string' || f.type === 'text')
    .map((f) => f.field);

  const baseQuery = db(collectionName);
  const filteredQuery = db(collectionName);

  if (!access.fullAccess && Object.keys(access.rowFilter).length > 0) {
    applyFilters(filteredQuery, access.rowFilter, allowedFields);
    applyFilters(baseQuery, access.rowFilter, allowedFields);
  }

  if (
    !options.includeArchived &&
    collection.archive_field &&
    collection.archive_value !== null &&
    collection.archive_value !== undefined
  ) {
    const archiveFilter = {
      [collection.archive_field]: { _neq: collection.archive_value },
    };
    applyFilters(filteredQuery, archiveFilter, allowedFields);
    applyFilters(baseQuery, archiveFilter, allowedFields);
  }

  applyFilters(filteredQuery, options.filter, allowedFields);
  if (options.search) {
    applySearch(filteredQuery, options.search, searchableFields);
  }

  applyFilters(baseQuery, options.filter, allowedFields);
  if (options.search) {
    applySearch(baseQuery, options.search, searchableFields);
  }

  if (options.sort.length > 0) {
    applySort(baseQuery, options.sort, allowedFields);
  } else if (collection.sort_field) {
    applySort(baseQuery, [{ column: collection.sort_field, order: 'asc' }], allowedFields);
  } else {
    baseQuery.orderBy('date_created', 'desc');
  }

  const countResult = await filteredQuery.clone().count<{ count: string | number }>({ count: '*' }).first();
  const filterCount = Number(countResult?.count ?? 0);

  const selectFields = resolveSelectFields(options.fields, allowedFields, fields, access);
  baseQuery.select(selectFields);
  baseQuery.limit(options.limit).offset(options.offset);

  const rows = await baseQuery as ItemRecord[];

  let totalCount = filterCount;
  if (Object.keys(options.filter).length === 0 && !options.search) {
    const totalResult = await db(collectionName).count<{ count: string | number }>({ count: '*' }).first();
    totalCount = Number(totalResult?.count ?? 0);
  }

  if (collection.singleton && rows.length > 1) {
    return {
      items: await enrichRows(db, collectionName, rows.slice(0, 1), options.fieldsRaw, access),
      totalCount: 1,
      filterCount: 1,
    };
  }

  return {
    items: await enrichRows(db, collectionName, rows, options.fieldsRaw, access),
    totalCount,
    filterCount,
  };
}

/**
 * Get a single item by ID with optional field selection.
 */
export async function getItem(
  db: Knex,
  collectionName: string,
  itemId: string,
  fields: string[] | null,
  fieldsRaw: string[] | null,
  access: AccessContext,
): Promise<ItemRecord> {
  await getCollection(db, collectionName);
  const fieldMeta = await listFields(db, collectionName);
  const physicalFields = new Set(fieldMeta.filter(isPhysicalField).map((f) => f.field));

  const selectFields = resolveSelectFields(fields, physicalFields, fieldMeta, access);
  const query = db(collectionName).where({ id: itemId });

  if (!access.fullAccess && Object.keys(access.rowFilter).length > 0) {
    applyFilters(query, access.rowFilter, physicalFields);
  }

  const item = await query.select(selectFields).first<ItemRecord>();

  if (!item) {
    throw new AppError(`Item "${itemId}" not found in "${collectionName}"`, 404, 'NOT_FOUND');
  }

  const enriched = await enrichItemWithRelations(
    db,
    collectionName,
    normalizeBooleanFields(normalizeItemRow(item), fieldMeta),
    fieldsRaw ?? fields,
  );
  return filterReadableFields(enriched, access);
}

/**
 * Create a new item in a collection.
 */
export async function createItem(
  db: Knex,
  collectionName: string,
  input: CreateItemInput,
  userId: string | null,
  access: AccessContext,
): Promise<ItemRecord> {
  const collection = await getCollection(db, collectionName);
  const fields = await listFields(db, collectionName);
  const sanitizedInput = filterWritableInput(input, access) as CreateItemInput;
  validateItemInput(fields, sanitizedInput, true);
  await validateFileFields(db, fields, sanitizedInput);

  const filteredPayload = await runItemEventFlows(db, {
    collection: collectionName,
    event: 'create',
    hook: 'filter',
    payload: sanitizedInput as Record<string, unknown>,
    userId,
  });
  const flowInput = (filteredPayload ?? sanitizedInput) as CreateItemInput;

  if (collection.singleton) {
    const existing = await db(collectionName).first();
    if (existing) {
      throw new AppError(`Singleton collection "${collectionName}" already has an item`, 409, 'SINGLETON_EXISTS');
    }
  }

  const payload = buildItemPayload(flowInput, fields, userId, true);
  await db(collectionName).insert(payload);
  await syncManyToManyRelations(db, collectionName, payload.id as string, flowInput, fields);
  await syncM2aFieldInputs(db, collectionName, payload.id as string, flowInput, fields);
  await syncTranslationRows(db, collectionName, payload.id as string, flowInput, fields, userId);

  const created = await db(collectionName).where({ id: payload.id as string }).first<ItemRecord>();
  if (!created) {
    throw new AppError('Failed to load created item', 500, 'INTERNAL_ERROR');
  }

  const normalized = normalizeItemRow(created);
  await logActivity(db, {
    action: 'create',
    user: userId,
    collection: collectionName,
    item: payload.id as string,
    data: normalized,
  });

  const enriched = await enrichItemWithRelations(db, collectionName, normalized, null);
  const result = filterReadableFields(enriched, access);

  void runItemEventFlows(db, {
    collection: collectionName,
    event: 'create',
    hook: 'action',
    keys: [payload.id as string],
    payload: normalized,
    userId,
  });

  return result;
}

/**
 * Update an existing item in a collection.
 */
export async function updateItem(
  db: Knex,
  collectionName: string,
  itemId: string,
  input: UpdateItemInput,
  userId: string | null,
  access: AccessContext,
): Promise<ItemRecord> {
  await getCollection(db, collectionName);
  const fields = await listFields(db, collectionName);
  const sanitizedInput = filterWritableInput(input, access) as UpdateItemInput;
  validateItemInput(fields, sanitizedInput, false);
  await validateFileFields(db, fields, sanitizedInput);

  const physicalFields = new Set(fields.filter(isPhysicalField).map((f) => f.field));
  const existingQuery = db(collectionName).where({ id: itemId });
  if (!access.fullAccess && Object.keys(access.rowFilter).length > 0) {
    applyFilters(existingQuery, access.rowFilter, physicalFields);
  }
  const existing = await existingQuery.first();
  if (!existing) {
    throw new AppError(`Item "${itemId}" not found in "${collectionName}"`, 404, 'NOT_FOUND');
  }

  const filteredPayload = await runItemEventFlows(db, {
    collection: collectionName,
    event: 'update',
    hook: 'filter',
    keys: [itemId],
    payload: sanitizedInput as Record<string, unknown>,
    userId,
  });
  const flowInput = (filteredPayload ?? sanitizedInput) as UpdateItemInput;

  const payload = buildItemPayload(flowInput, fields, userId, false);
  const hasM2m = fields.some((f) => isManyToManyInterface(f.interface) && f.field in flowInput);
  const hasM2a = fields.some((f) => f.interface === 'many-to-any' && f.field in flowInput);
  const configuredTranslationsField = findConfiguredTranslationsField(fields);
  const hasTranslations = configuredTranslationsField
    ? configuredTranslationsField.field in flowInput
    : false;

  if (Object.keys(payload).length === 0 && !hasM2m && !hasM2a && !hasTranslations) {
    throw new AppError('No valid fields to update', 400, 'VALIDATION_ERROR');
  }

  if (Object.keys(payload).length > 0) {
    await db(collectionName).where({ id: itemId }).update(payload);
  }
  await syncManyToManyRelations(db, collectionName, itemId, flowInput, fields);
  await syncM2aFieldInputs(db, collectionName, itemId, flowInput, fields);
  await syncTranslationRows(db, collectionName, itemId, flowInput, fields, userId);

  const updated = await db(collectionName).where({ id: itemId }).first<ItemRecord>();
  if (!updated) {
    throw new AppError(`Item "${itemId}" not found in "${collectionName}"`, 404, 'NOT_FOUND');
  }

  const normalized = normalizeItemRow(updated);
  await logActivity(db, {
    action: 'update',
    user: userId,
    collection: collectionName,
    item: itemId,
    data: normalized,
    delta: flowInput as Record<string, unknown>,
  });

  const enriched = await enrichItemWithRelations(db, collectionName, normalized, null);
  const result = filterReadableFields(enriched, access);

  void runItemEventFlows(db, {
    collection: collectionName,
    event: 'update',
    hook: 'action',
    keys: [itemId],
    payload: normalized,
    userId,
  });

  return result;
}

/**
 * Delete an item from a collection.
 */
export async function deleteItem(
  db: Knex,
  collectionName: string,
  itemId: string,
  userId: string | null,
  access: AccessContext,
): Promise<void> {
  await getCollection(db, collectionName);
  const fields = await listFields(db, collectionName);
  const physicalFields = new Set(fields.filter(isPhysicalField).map((f) => f.field));

  const query = db(collectionName).where({ id: itemId });
  if (!access.fullAccess && Object.keys(access.rowFilter).length > 0) {
    applyFilters(query, access.rowFilter, physicalFields);
  }

  const existing = await query.first();
  if (!existing) {
    throw new AppError(`Item "${itemId}" not found in "${collectionName}"`, 404, 'NOT_FOUND');
  }

  await runItemEventFlows(db, {
    collection: collectionName,
    event: 'delete',
    hook: 'filter',
    keys: [itemId],
    payload: normalizeItemRow(existing as ItemRecord),
    userId,
  });

  await enforceSchemaOnDelete(db, collectionName, itemId);
  await logActivity(db, {
    action: 'delete',
    user: userId,
    collection: collectionName,
    item: itemId,
    data: normalizeItemRow(existing as ItemRecord),
  });

  await db(collectionName).where({ id: itemId }).delete();

  void runItemEventFlows(db, {
    collection: collectionName,
    event: 'delete',
    hook: 'action',
    keys: [itemId],
    payload: normalizeItemRow(existing as ItemRecord),
    userId,
  });
}

/**
 * Reorder items using the collection's configured sort_field.
 */
export async function reorderItems(
  db: Knex,
  collectionName: string,
  input: ReorderItemsInput,
  access: AccessContext,
): Promise<void> {
  const collection = await getCollection(db, collectionName);
  if (!collection.sort_field) {
    throw new AppError('Collection has no sort_field configured', 400, 'VALIDATION_ERROR');
  }

  const sortField = collection.sort_field;
  const fields = await listFields(db, collectionName);
  const fieldMeta = fields.find((f) => f.field === sortField);
  if (!fieldMeta || !isPhysicalField(fieldMeta)) {
    throw new AppError(`Sort field "${sortField}" is not a physical field`, 400, 'VALIDATION_ERROR');
  }

  await db.transaction(async (trx) => {
    const physicalFields = new Set(fields.filter(isPhysicalField).map((f) => f.field));
    for (const item of input.items) {
      const query = trx(collectionName).where({ id: item.id });
      if (!access.fullAccess && Object.keys(access.rowFilter).length > 0) {
        applyFilters(query, access.rowFilter, physicalFields);
      }
      const existing = await query.first();
      if (!existing) {
        throw new AppError(`Item "${item.id}" not found in "${collectionName}"`, 404, 'NOT_FOUND');
      }
      await trx(collectionName).where({ id: item.id }).update({
        [sortField]: item.sort,
        date_updated: new Date().toISOString(),
      });
    }
  });
}

function resolveSelectFields(
  requested: string[] | null,
  physicalFields: Set<string>,
  allFields: FieldMeta[],
  access: AccessContext,
): string[] {
  let selected: string[];

  if (!requested) {
    selected = Array.from(physicalFields);
  } else {
    selected = [];
    const set = new Set<string>(['id']);
    for (const field of requested) {
      const topLevel = field.split('.')[0] ?? field;
      const meta = allFields.find((f) => f.field === topLevel);
      if (!meta) {
        throw new AppError(`Invalid fields parameter: "${topLevel}"`, 400, 'VALIDATION_ERROR');
      }
      if (isPhysicalField(meta)) {
        set.add(topLevel);
      }
    }
    selected = Array.from(set);
  }

  if (!access.fullAccess && access.allowedFields !== '*') {
    const allowed = new Set(access.allowedFields);
    selected = selected.filter((field) => field === 'id' || allowed.has(field));
  }

  return selected;
}

async function enrichRows(
  db: Knex,
  collectionName: string,
  rows: ItemRecord[],
  fieldsRaw: string[] | null,
  access: AccessContext,
): Promise<ItemRecord[]> {
  const fieldMeta = await listFields(db, collectionName);
  const enriched = await Promise.all(
    rows.map((row) =>
      enrichItemWithRelations(
        db,
        collectionName,
        normalizeBooleanFields(normalizeItemRow(row), fieldMeta),
        fieldsRaw,
      ),
    ),
  );
  return enriched.map((item) => filterReadableFields(item, access));
}

function buildItemPayload(
  input: CreateItemInput | UpdateItemInput,
  fields: FieldMeta[],
  userId: string | null,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (isCreate) {
    payload.id = typeof input.id === 'string' && input.id ? input.id : uuidv4();
    payload.date_created = new Date().toISOString();
    payload.user_created = userId;
  }

  payload.date_updated = new Date().toISOString();
  payload.user_updated = userId;

  for (const [key, value] of Object.entries(input)) {
    if (SYSTEM_AUTO_FIELDS.has(key)) {
      continue;
    }
    const fieldMeta = fields.find((f) => f.field === key);
    if (!fieldMeta) {
      throw new AppError(`Field "${key}" does not exist on this collection`, 400, 'VALIDATION_ERROR');
    }
    if (!isPhysicalField(fieldMeta)) {
      continue;
    }
    payload[key] = normalizeInputValue(value, fieldMeta);
  }

  if (isCreate) {
    for (const field of fields) {
      if (field.required && !field.is_system && isPhysicalField(field) && payload[field.field] === undefined) {
        throw new AppError(`Field "${field.field}" is required`, 400, 'VALIDATION_ERROR');
      }
    }
  }

  return payload;
}

function normalizeInputValue(value: unknown, field: FieldMeta | undefined): unknown {
  if (value === undefined) {
    return value;
  }

  if (field?.type === 'json') {
    if (value === null || value === '') {
      return null;
    }
    if (typeof value === 'string') {
      if (!value.trim()) {
        return null;
      }
      try {
        JSON.parse(value);
        return value;
      } catch {
        throw new AppError(`Field "${field.field}" contains invalid JSON`, 400, 'VALIDATION_ERROR');
      }
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
  }

  if (field?.type === 'boolean') {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
  }

  return value;
}

function coerceBoolean(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return Boolean(value);
}

function normalizeBooleanFields(item: ItemRecord, fields: FieldMeta[]): ItemRecord {
  const normalized = { ...item };
  for (const field of fields) {
    if (field.type === 'boolean' && field.field in normalized) {
      normalized[field.field] = coerceBoolean(normalized[field.field]);
    }
  }
  return normalized;
}

function normalizeItemRow(row: ItemRecord): ItemRecord {
  const normalized: ItemRecord = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
    } else if (
      (key === 'date_created' || key === 'date_updated') &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      normalized[key] = new Date(value).toISOString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function isFileField(field: FieldMeta): boolean {
  return (
    field.special === 'file' ||
    field.interface === 'file' ||
    field.interface === 'file-image' ||
    field.interface === 'files' ||
    field.interface.startsWith('file-')
  );
}

async function assertFileExists(
  db: Knex,
  fileId: string,
  fieldName: string,
): Promise<void> {
  const file = await db('cms_files').where({ id: fileId }).first();
  if (!file) {
    throw new AppError(`File "${fileId}" not found for field "${fieldName}"`, 404, 'NOT_FOUND');
  }
}

async function validateFileFields(
  db: Knex,
  fields: FieldMeta[],
  input: Record<string, unknown>,
): Promise<void> {
  for (const field of fields) {
    if (!isFileField(field)) {
      continue;
    }
    if (!(field.field in input)) {
      continue;
    }
    const value = input[field.field];
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (field.interface === 'files') {
      if (!Array.isArray(value)) {
        throw new AppError(`Field "${field.field}" must be an array of file IDs`, 400, 'VALIDATION_ERROR');
      }
      for (const entry of value) {
        if (typeof entry !== 'string' || !entry) {
          throw new AppError(`Field "${field.field}" must contain file ID strings`, 400, 'VALIDATION_ERROR');
        }
        await assertFileExists(db, entry, field.field);
      }
      continue;
    }

    if (typeof value !== 'string') {
      throw new AppError(`Field "${field.field}" must be a file ID`, 400, 'VALIDATION_ERROR');
    }
    await assertFileExists(db, value, field.field);
  }
}

async function syncM2aFieldInputs(
  db: Knex,
  collectionName: string,
  itemId: string,
  input: Record<string, unknown>,
  fields: FieldMeta[],
): Promise<void> {
  for (const field of fields) {
    if (field.interface === 'many-to-any' && field.field in input) {
      await syncM2aRelations(db, collectionName, itemId, field.field, input[field.field]);
    }
  }
}

async function enforceSchemaOnDelete(db: Knex, collectionName: string, itemId: string): Promise<void> {
  const relations = await db('cms_relations')
    .where({ one_collection: collectionName, one_field: 'id' })
    .select('*');

  for (const relation of relations) {
    const onDelete = relation.schema_on_delete ?? 'SET NULL';
    const referencing = await db(relation.many_collection)
      .where(relation.many_field, itemId)
      .select('id');

    if (referencing.length === 0) {
      continue;
    }

    if (onDelete === 'RESTRICT' || onDelete === 'NO ACTION') {
      throw new AppError(
        `Cannot delete item: referenced by "${relation.many_collection}.${relation.many_field}"`,
        409,
        'FOREIGN_KEY_VIOLATION',
      );
    }

    if (onDelete === 'SET NULL') {
      await db(relation.many_collection)
        .where(relation.many_field, itemId)
        .update({ [relation.many_field]: null });
    } else if (onDelete === 'CASCADE') {
      await db(relation.many_collection).where(relation.many_field, itemId).delete();
    }
  }
}
