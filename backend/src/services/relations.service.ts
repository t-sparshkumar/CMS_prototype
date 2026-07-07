import type { Knex } from 'knex';
import { AppError } from '../middleware/errorHandler.js';
import type { CmsRelationRow, RelationMeta } from '../types/relation.js';
import { getCollection } from './collections.service.js';

/**
 * List all relations in the system.
 */
export async function listAllRelations(db: Knex): Promise<RelationMeta[]> {
  return db<CmsRelationRow>('cms_relations').orderBy('id', 'asc');
}

/**
 * List all relations involving a collection.
 */
export async function listRelationsForCollection(db: Knex, collectionName: string): Promise<RelationMeta[]> {
  await getCollection(db, collectionName);

  return db<CmsRelationRow>('cms_relations')
    .where('many_collection', collectionName)
    .orWhere('one_collection', collectionName)
    .orderBy('id', 'asc');
}

/**
 * Get a relation record by ID.
 */
export async function getRelationById(db: Knex, relationId: number): Promise<RelationMeta> {
  const relation = await db<CmsRelationRow>('cms_relations').where({ id: relationId }).first();

  if (!relation) {
    throw new AppError(`Relation "${relationId}" not found`, 404, 'NOT_FOUND');
  }

  return relation;
}

/**
 * Get a relation record by collection and field name.
 */
export async function getRelationByField(
  db: Knex,
  collectionName: string,
  fieldName: string,
): Promise<RelationMeta | null> {
  const relation = await db<CmsRelationRow>('cms_relations')
    .where({ many_collection: collectionName, many_field: fieldName })
    .orWhere({ one_collection: collectionName, sort_field: fieldName })
    .first();

  return relation ?? null;
}

/**
 * Insert a relation metadata row.
 */
export async function insertRelation(
  trx: Knex,
  data: Omit<CmsRelationRow, 'id'>,
): Promise<void> {
  await trx('cms_relations').insert(data);
}

/**
 * Delete a relation by ID and optionally clean up junction table.
 */
export async function deleteRelationById(db: Knex, relationId: number): Promise<void> {
  const relation = await db<CmsRelationRow>('cms_relations').where({ id: relationId }).first();

  if (!relation) {
    throw new AppError(`Relation "${relationId}" not found`, 404, 'NOT_FOUND');
  }

  await db('cms_relations').where({ id: relationId }).delete();
  await cleanupJunctionTableIfUnused(db, relation.junction_collection);
}

/**
 * Delete relation metadata for a field and optionally clean up junction table.
 */
export async function deleteRelationForField(
  db: Knex,
  collectionName: string,
  fieldName: string,
): Promise<CmsRelationRow | null> {
  const relation = await db<CmsRelationRow>('cms_relations')
    .where({ many_collection: collectionName, many_field: fieldName })
    .orWhere({ one_collection: collectionName, sort_field: fieldName })
    .first();

  if (!relation) {
    return null;
  }

  await db('cms_relations').where({ id: relation.id }).delete();
  await cleanupJunctionTableIfUnused(db, relation.junction_collection);

  return relation;
}

async function cleanupJunctionTableIfUnused(db: Knex, junctionCollection: string | null): Promise<void> {
  if (!junctionCollection) {
    return;
  }

  const otherRelations = await db('cms_relations')
    .where({ junction_collection: junctionCollection })
    .count<{ count: string | number }>({ count: '*' })
    .first();

  if (Number(otherRelations?.count ?? 0) === 0) {
    await db.transaction(async (trx) => {
      await trx.schema.dropTableIfExists(junctionCollection);
      await trx('cms_fields').where({ collection: junctionCollection }).delete();
      await trx('cms_collections').where({ collection: junctionCollection }).delete();
    });
  }
}

/**
 * Load all relations where the given collection is the "one" or "many" side.
 */
export async function getRelationsMap(db: Knex, collectionName: string): Promise<CmsRelationRow[]> {
  return db<CmsRelationRow>('cms_relations')
    .where('many_collection', collectionName)
    .orWhere('one_collection', collectionName);
}

/**
 * Update relation metadata.
 */
export async function updateRelation(
  db: Knex,
  relationId: number,
  input: Partial<Pick<CmsRelationRow, 'schema_on_delete' | 'sort_field'>>,
): Promise<RelationMeta> {
  const relation = await getRelationById(db, relationId);
  const updates: Partial<CmsRelationRow> = {};

  if (input.schema_on_delete !== undefined) {
    updates.schema_on_delete = input.schema_on_delete;
  }
  if (input.sort_field !== undefined) {
    updates.sort_field = input.sort_field;
  }

  if (Object.keys(updates).length > 0) {
    await db('cms_relations').where({ id: relationId }).update(updates);
  }

  return getRelationById(db, relationId);
}

/**
 * Verify a related collection exists.
 */
export async function assertRelatedCollectionExists(db: Knex, relatedCollection: string): Promise<void> {
  try {
    await getCollection(db, relatedCollection);
  } catch {
    throw new AppError(`Related collection "${relatedCollection}" not found`, 404, 'NOT_FOUND');
  }
}
