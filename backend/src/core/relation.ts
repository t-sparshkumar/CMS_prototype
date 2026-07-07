import type { Knex } from 'knex';
import { validateCollectionName } from './collection.js';
import type { SchemaOnDelete } from '../types/relation.js';

/**
 * Build a deterministic junction table name from two collection names.
 */
export function getJunctionTableName(collectionA: string, collectionB: string): string {
  const [first, second] = [collectionA, collectionB].sort();
  return `${first}_${second}`;
}

/**
 * Build junction FK column names for each collection side.
 */
export function getJunctionColumnNames(collectionA: string, collectionB: string): {
  junctionTable: string;
  columnA: string;
  columnB: string;
} {
  const [first, second] = [collectionA, collectionB].sort();
  return {
    junctionTable: `${first}_${second}`,
    columnA: `${collectionA}_id`,
    columnB: `${collectionB}_id`,
  };
}

/**
 * Build a many-to-any junction table name for a collection.
 */
export function getM2aJunctionTableName(collectionName: string): string {
  return `${collectionName}_m2a`;
}

/**
 * Validate that a related collection name is usable in a relationship.
 */
export function validateRelatedCollection(name: string): void {
  validateCollectionName(name);
}

/**
 * Determine relation kind from a field interface value.
 */
export function getRelationKind(interfaceName: string): 'm2o' | 'o2m' | 'm2m' | 'm2a' | null {
  if (interfaceName === 'many-to-one' || interfaceName === 'collection-item-dropdown') return 'm2o';
  if (interfaceName === 'one-to-many' || interfaceName === 'tree-view') return 'o2m';
  if (interfaceName === 'many-to-many' || interfaceName === 'collection-item-multiple-dropdown') return 'm2m';
  if (interfaceName === 'many-to-any') return 'm2a';
  return null;
}

export function isManyToManyInterface(interfaceName: string): boolean {
  return interfaceName === 'many-to-many' || interfaceName === 'collection-item-multiple-dropdown';
}

export function isOneToManyInterface(interfaceName: string): boolean {
  return interfaceName === 'one-to-many' || interfaceName === 'tree-view';
}

export function isManyToOneInterface(interfaceName: string): boolean {
  return interfaceName === 'many-to-one' || interfaceName === 'collection-item-dropdown';
}

/**
 * Check if a field interface represents a virtual relation (no column on this collection).
 */
export function isVirtualRelationInterface(interfaceName: string): boolean {
  return (
    interfaceName === 'one-to-many' ||
    interfaceName === 'tree-view' ||
    interfaceName === 'many-to-many' ||
    interfaceName === 'collection-item-multiple-dropdown' ||
    interfaceName === 'many-to-any' ||
    interfaceName === 'translations'
  );
}

/**
 * Check if a field interface is presentational (no SQL column).
 */
const PRESENTATIONAL_INTERFACE_SET = new Set([
  'header',
  'divider',
  'presentation-buttons',
  'notice',
  'presentation-m2a',
  'super-header',
  'group-accordion',
  'group-detail',
  'group-raw',
  'group-tabs',
  'group-tab',
]);

export function isPresentationalInterface(interfaceName: string): boolean {
  return PRESENTATIONAL_INTERFACE_SET.has(interfaceName);
}

export function isRelationInterface(interfaceName: string): boolean {
  return getRelationKind(interfaceName) !== null || interfaceName === 'translations';
}

export function fieldCreateRequiresType(interfaceName: string | undefined): boolean {
  if (!interfaceName) return true;
  if (isPresentationalInterface(interfaceName)) return false;
  if (isRelationInterface(interfaceName)) return false;
  return true;
}

/**
 * Map schema_on_delete metadata to Knex onDelete clause.
 */
export function mapSchemaOnDelete(onDelete: SchemaOnDelete | null | undefined): string {
  const value = onDelete ?? 'SET NULL';
  return value.replace(' ', '_');
}

/**
 * Create a junction table for a many-to-many relationship.
 */
export async function createJunctionTable(
  trx: Knex,
  collectionA: string,
  collectionB: string,
  options: { withSort?: boolean } = {},
): Promise<string> {
  const { junctionTable, columnA, columnB } = getJunctionColumnNames(collectionA, collectionB);

  const exists = await trx.schema.hasTable(junctionTable);
  if (exists) {
    return junctionTable;
  }

  await trx.schema.createTable(junctionTable, (table) => {
    table.increments('id').primary();
    table.uuid(columnA).notNullable().references('id').inTable(collectionA).onDelete('CASCADE');
    table.uuid(columnB).notNullable().references('id').inTable(collectionB).onDelete('CASCADE');
    if (options.withSort) {
      table.integer('sort').nullable();
    }
    table.unique([columnA, columnB]);
  });

  return junctionTable;
}

/**
 * Register junction collection in cms_collections meta table.
 */
export async function registerJunctionCollection(trx: Knex, junctionTable: string): Promise<void> {
  const existing = await trx('cms_collections').where({ collection: junctionTable }).first();
  if (!existing) {
    await trx('cms_collections').insert({
      collection: junctionTable,
      note: 'Auto-generated junction table',
      singleton: false,
      hidden: true,
      system: true,
    });
  }
}

/**
 * Create a junction table for many-to-any relationships.
 */
export async function createM2aJunctionTable(trx: Knex, collectionName: string): Promise<string> {
  const junctionTable = getM2aJunctionTableName(collectionName);
  const exists = await trx.schema.hasTable(junctionTable);
  if (exists) {
    return junctionTable;
  }

  const sourceColumn = `${collectionName}_id`;

  await trx.schema.createTable(junctionTable, (table) => {
    table.increments('id').primary();
    table.uuid(sourceColumn).notNullable().references('id').inTable(collectionName).onDelete('CASCADE');
    table.uuid('item').notNullable();
    table.string('collection', 255).notNullable();
    table.integer('sort').nullable();
    table.index([sourceColumn, 'collection']);
  });

  return junctionTable;
}
