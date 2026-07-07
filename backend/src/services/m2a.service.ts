import type { Knex } from 'knex';
import { getM2aJunctionTableName } from '../core/relation.js';
import { AppError } from '../middleware/errorHandler.js';
import type { ItemRecord } from '../types/item.js';

export interface M2aItemRef {
  collection: string;
  item: string;
  sort?: number;
}

/**
 * Load many-to-any relation values for an item.
 */
export async function loadM2aValues(
  db: Knex,
  collectionName: string,
  itemId: string,
): Promise<M2aItemRef[]> {
  const junctionTable = getM2aJunctionTableName(collectionName);
  const hasTable = await db.schema.hasTable(junctionTable);
  if (!hasTable) {
    return [];
  }

  const sourceColumn = `${collectionName}_id`;
  const rows = await db(junctionTable)
    .where(sourceColumn, itemId)
    .orderBy('sort', 'asc')
    .select('collection', 'item', 'sort') as Array<{ collection: string; item: string; sort: number | null }>;

  return rows.map((row) => ({
    collection: row.collection,
    item: row.item,
    ...(row.sort !== null ? { sort: row.sort } : {}),
  }));
}

/**
 * Sync many-to-any junction rows for an item.
 */
export async function syncM2aRelations(
  db: Knex,
  collectionName: string,
  itemId: string,
  fieldName: string,
  value: unknown,
): Promise<void> {
  if (!Array.isArray(value)) {
    return;
  }

  const junctionTable = getM2aJunctionTableName(collectionName);
  const hasTable = await db.schema.hasTable(junctionTable);
  if (!hasTable) {
    throw new AppError(`M2A junction table for "${collectionName}" not found`, 404, 'NOT_FOUND');
  }

  const sourceColumn = `${collectionName}_id`;
  const refs = value.filter(
    (entry): entry is M2aItemRef =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as M2aItemRef).collection === 'string' &&
      typeof (entry as M2aItemRef).item === 'string',
  );

  for (const ref of refs) {
    const exists = await db(ref.collection).where({ id: ref.item }).first();
    if (!exists) {
      throw new AppError(
        `Item "${ref.item}" not found in collection "${ref.collection}"`,
        404,
        'NOT_FOUND',
      );
    }
  }

  await db.transaction(async (trx) => {
    await trx(junctionTable).where(sourceColumn, itemId).delete();
    if (refs.length > 0) {
      await trx(junctionTable).insert(
        refs.map((ref, index) => ({
          [sourceColumn]: itemId,
          collection: ref.collection,
          item: ref.item,
          sort: ref.sort ?? index + 1,
        })),
      );
    }
  });
}

/**
 * Enrich an item with M2A relation data.
 */
export async function enrichItemWithM2a(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  fieldName: string,
): Promise<ItemRecord> {
  const refs = await loadM2aValues(db, collectionName, item.id as string);
  return { ...item, [fieldName]: refs };
}
