import type { GraphQLSchema } from 'graphql';
import type { Knex } from 'knex';
import { buildGraphqlSchema } from './build-schema.js';

let cachedSchema: GraphQLSchema | null = null;
let cachedFingerprint = '';

/**
 * Compute a fingerprint of collections and fields metadata for schema cache invalidation.
 */
async function computeFingerprint(db: Knex): Promise<string> {
  const collections = await db('cms_collections')
    .select('collection', 'singleton')
    .orderBy('collection', 'asc');

  const fields = await db('cms_fields')
    .select('collection', 'field', 'type', 'interface', 'options', 'required')
    .orderBy(['collection', 'field']);

  return JSON.stringify({ collections, fields });
}

/**
 * Return a cached GraphQL schema, rebuilding when collections or fields change.
 */
export async function getGraphqlSchema(db: Knex): Promise<GraphQLSchema> {
  const fingerprint = await computeFingerprint(db);
  if (cachedSchema && fingerprint === cachedFingerprint) {
    return cachedSchema;
  }

  cachedSchema = await buildGraphqlSchema(db);
  cachedFingerprint = fingerprint;
  return cachedSchema;
}

/**
 * Force the next request to rebuild the GraphQL schema.
 */
export function invalidateGraphqlSchema(): void {
  cachedSchema = null;
  cachedFingerprint = '';
}
