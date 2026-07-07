import type { Knex } from 'knex';
import { getJunctionColumnNames, getRelationKind, isManyToManyInterface, isOneToManyInterface } from '../core/relation.js';
import type { CmsRelationRow } from '../types/relation.js';
import type { FieldMeta } from '../types/field.js';
import type { ItemRecord } from '../types/item.js';
import { listFields } from './fields.service.js';
import { getRelationsMap } from './relations.service.js';

/**
 * Resolve nested relation fields on an item record.
 */
export async function resolveItemRelations(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  nestedFields: Map<string, string[]>,
  fieldsMeta: FieldMeta[],
): Promise<ItemRecord> {
  if (nestedFields.size === 0) {
    return item;
  }

  const relations = await getRelationsMap(db, collectionName);
  const result = { ...item };

  for (const [fieldName, subFields] of nestedFields.entries()) {
    const fieldMeta = fieldsMeta.find((f) => f.field === fieldName);
    if (!fieldMeta) {
      continue;
    }

    const relation = findRelationForField(relations, collectionName, fieldName, fieldMeta);
    if (!relation) {
      continue;
    }

    const kind = getRelationKind(fieldMeta.interface);
    if (kind === 'm2o') {
      const fkValue = item[fieldName];
      if (typeof fkValue === 'string' && fkValue) {
        const related = await db(relation.one_collection).where({ id: fkValue }).first<ItemRecord>();
        if (related) {
          result[fieldName] = projectFields(normalizeRow(related), subFields);
        }
      }
    } else if (kind === 'o2m') {
      const relatedItems = await db(relation.many_collection)
        .where(relation.many_field, item.id as string)
        .select('*') as ItemRecord[];
      result[fieldName] = relatedItems.map((row) => projectFields(normalizeRow(row), subFields));
    } else if (kind === 'm2m' && relation.junction_collection) {
      result[fieldName] = await loadM2mRelatedItems(db, collectionName, item.id as string, relation, subFields);
    }
  }

  return result;
}

/**
 * Sync many-to-many junction rows for an item.
 */
export async function syncManyToManyRelations(
  db: Knex,
  collectionName: string,
  itemId: string,
  input: Record<string, unknown>,
  fieldsMeta: FieldMeta[],
): Promise<void> {
  const relations = await getRelationsMap(db, collectionName);

  for (const field of fieldsMeta) {
    if (!isManyToManyInterface(field.interface) || !(field.field in input)) {
      continue;
    }

    const value = input[field.field];
    if (!Array.isArray(value)) {
      continue;
    }

    const relation = relations.find(
      (r) => r.many_collection === collectionName && r.many_field === field.field,
    );
    if (!relation?.junction_collection) {
      continue;
    }

    const { columnA, columnB } = getJunctionColumnNames(relation.many_collection, relation.one_collection);
    const sourceColumn = columnA.endsWith(`${collectionName}_id`) ? columnA : columnB;
    const targetColumn = sourceColumn === columnA ? columnB : columnA;
    const hasSort = relation.sort_field === 'sort';

    await db.transaction(async (trx) => {
      await trx(relation.junction_collection!).where(sourceColumn, itemId).delete();
      const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (ids.length > 0) {
        await trx(relation.junction_collection!).insert(
          ids.map((relatedId, index) => ({
            [sourceColumn]: itemId,
            [targetColumn]: relatedId,
            ...(hasSort ? { sort: index + 1 } : {}),
          })),
        );
      }
    });
  }
}

/**
 * Load M2M relation values as ID arrays for an item.
 */
export async function loadManyToManyValues(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  fieldsMeta: FieldMeta[],
): Promise<ItemRecord> {
  const relations = await getRelationsMap(db, collectionName);
  const result = { ...item };

  for (const field of fieldsMeta) {
    if (!isManyToManyInterface(field.interface)) {
      continue;
    }

    const relation = relations.find(
      (r) => r.many_collection === collectionName && r.many_field === field.field,
    );
    if (!relation?.junction_collection) {
      continue;
    }

    const ids = await getM2mRelatedIds(db, collectionName, item.id as string, relation);
    result[field.field] = ids;
  }

  return result;
}

/**
 * Load O2M relation values as related item arrays.
 */
export async function loadOneToManyValues(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  fieldsMeta: FieldMeta[],
): Promise<ItemRecord> {
  const relations = await getRelationsMap(db, collectionName);
  const result = { ...item };

  for (const field of fieldsMeta) {
    if (!isOneToManyInterface(field.interface)) {
      continue;
    }

    const relatedCollection = field.options?.related_collection as string | undefined;
    const relatedField = field.options?.related_field as string | undefined;
    if (!relatedCollection || !relatedField) {
      continue;
    }

    const relation = relations.find(
      (r) =>
        r.one_collection === collectionName &&
        r.many_collection === relatedCollection &&
        r.many_field === relatedField,
    );
    if (!relation) {
      continue;
    }

    const relatedItems = await db(relation.many_collection)
      .where(relation.many_field, item.id as string)
      .select('*') as ItemRecord[];
    result[field.field] = relatedItems.map(normalizeRow);
  }

  return result;
}

/**
 * Enrich item with relation data for read responses.
 */
export async function enrichItemWithRelations(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  fieldsRaw: string[] | null,
): Promise<ItemRecord> {
  const fieldsMeta = await listFields(db, collectionName);
  const nested = parseNestedFromRaw(fieldsRaw);

  let enriched = await loadManyToManyValues(db, collectionName, item, fieldsMeta);
  enriched = await loadOneToManyValues(db, collectionName, enriched, fieldsMeta);

  if (nested.size > 0) {
    enriched = await resolveItemRelations(db, collectionName, enriched, nested, fieldsMeta);
  }

  return enriched;
}

async function loadM2mRelatedItems(
  db: Knex,
  collectionName: string,
  itemId: string,
  relation: CmsRelationRow,
  subFields: string[],
): Promise<ItemRecord[]> {
  const targetCollection =
    relation.many_collection === collectionName ? relation.one_collection : relation.many_collection;
  const ids = await getM2mRelatedIds(db, collectionName, itemId, relation);
  if (ids.length === 0) {
    return [];
  }
  const relatedItems = await db(targetCollection).whereIn('id', ids).select('*') as ItemRecord[];
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  relatedItems.sort((a, b) => (idOrder.get(String(a.id)) ?? 0) - (idOrder.get(String(b.id)) ?? 0));
  return relatedItems.map((row) => projectFields(normalizeRow(row), subFields));
}

async function getM2mRelatedIds(
  db: Knex,
  collectionName: string,
  itemId: string,
  relation: CmsRelationRow,
): Promise<string[]> {
  if (!relation.junction_collection) {
    return [];
  }

  const { columnA, columnB } = getJunctionColumnNames(relation.many_collection, relation.one_collection);
  const sourceColumn = `${collectionName}_id`;
  const targetColumn = sourceColumn === columnA ? columnB : columnA;

  let query = db(relation.junction_collection).where(sourceColumn, itemId);

  if (relation.sort_field === 'sort') {
    query = query.orderBy('sort', 'asc');
  }

  const junctionRows = await query.select(targetColumn) as Array<Record<string, string>>;

  return junctionRows.map((row) => row[targetColumn]).filter((id): id is string => Boolean(id));
}

function findRelationForField(
  relations: CmsRelationRow[],
  collectionName: string,
  fieldName: string,
  fieldMeta: FieldMeta,
): CmsRelationRow | undefined {
  const kind = getRelationKind(fieldMeta.interface);
  if (kind === 'm2o' || kind === 'm2m') {
    return relations.find((r) => r.many_collection === collectionName && r.many_field === fieldName);
  }
  if (kind === 'o2m') {
    const relatedCollection = fieldMeta.options?.related_collection as string | undefined;
    const relatedField = fieldMeta.options?.related_field as string | undefined;
    return relations.find(
      (r) =>
        r.one_collection === collectionName &&
        r.many_collection === relatedCollection &&
        r.many_field === relatedField,
    );
  }
  return undefined;
}

function projectFields(item: ItemRecord, subFields: string[]): ItemRecord {
  if (subFields.length === 0) {
    return item;
  }

  const projected: ItemRecord = { id: item.id };
  for (const subField of subFields) {
    const top = subField.split('.')[0];
    if (top && top in item) {
      projected[top] = item[top];
    }
  }
  return projected;
}

function normalizeRow(row: ItemRecord): ItemRecord {
  const normalized: ItemRecord = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function parseNestedFromRaw(rawFields: string[] | null): Map<string, string[]> {
  const nested = new Map<string, string[]>();
  if (!rawFields) return nested;

  for (const fieldPath of rawFields) {
    if (!fieldPath.includes('.')) continue;
    const [parent, ...rest] = fieldPath.split('.');
    if (!parent || rest.length === 0) continue;
    const existing = nested.get(parent) ?? [];
    existing.push(rest.join('.'));
    nested.set(parent, existing);
  }
  return nested;
}
