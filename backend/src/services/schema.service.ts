import type { Knex } from 'knex';
import { introspectUnregisteredTables, type IntrospectedTable } from '../db/introspect.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CmsCollectionRow } from '../types/collection.js';
import type { CmsFieldRow } from '../types/field.js';
import type { CmsRelationRow } from '../types/relation.js';
import { createCollection } from './collections.service.js';
import { createField } from './fields.service.js';

export interface SchemaSnapshot {
  collections: CmsCollectionRow[];
  fields: CmsFieldRow[];
  relations: CmsRelationRow[];
  captured_at: string;
}

export interface SchemaDiff {
  collections_to_create: string[];
  collections_to_delete: string[];
  fields_to_create: Array<{ collection: string; field: string }>;
  fields_to_delete: Array<{ collection: string; field: string }>;
  relations_to_create: CmsRelationRow[];
  relations_to_delete: number[];
}

/**
 * Capture a snapshot of current schema metadata.
 */
export async function captureSchemaSnapshot(db: Knex): Promise<SchemaSnapshot> {
  const [collections, fields, relations] = await Promise.all([
    db<CmsCollectionRow>('cms_collections').select('*').orderBy('collection', 'asc'),
    db<CmsFieldRow>('cms_fields').select('*').orderBy(['collection', 'sort']),
    db<CmsRelationRow>('cms_relations').select('*').orderBy('id', 'asc'),
  ]);

  return {
    collections,
    fields,
    relations,
    captured_at: new Date().toISOString(),
  };
}

/**
 * Diff two schema snapshots.
 */
export function diffSchemaSnapshots(current: SchemaSnapshot, target: SchemaSnapshot): SchemaDiff {
  const currentCollections = new Set(current.collections.map((c) => c.collection));
  const targetCollections = new Set(target.collections.map((c) => c.collection));

  const currentFieldKeys = new Set(current.fields.map((f) => `${f.collection}.${f.field}`));
  const targetFieldKeys = new Set(target.fields.map((f) => `${f.collection}.${f.field}`));

  const currentRelationIds = new Set(current.relations.map((r) => r.id));
  const targetRelationIds = new Set(target.relations.map((r) => r.id));

  return {
    collections_to_create: [...targetCollections].filter((name) => !currentCollections.has(name)),
    collections_to_delete: [...currentCollections].filter((name) => !targetCollections.has(name)),
    fields_to_create: target.fields
      .filter((f) => !currentFieldKeys.has(`${f.collection}.${f.field}`))
      .map((f) => ({ collection: f.collection, field: f.field })),
    fields_to_delete: current.fields
      .filter((f) => !targetFieldKeys.has(`${f.collection}.${f.field}`))
      .map((f) => ({ collection: f.collection, field: f.field })),
    relations_to_create: target.relations.filter((r) => !currentRelationIds.has(r.id)),
    relations_to_delete: current.relations.filter((r) => !targetRelationIds.has(r.id)).map((r) => r.id),
  };
}

/**
 * Apply a schema diff by creating missing collections and fields.
 */
export async function applySchemaDiff(db: Knex, diff: SchemaDiff, target: SchemaSnapshot): Promise<void> {
  for (const collectionName of diff.collections_to_create) {
    const meta = target.collections.find((c) => c.collection === collectionName);
    if (!meta) {
      continue;
    }
    const exists = await db('cms_collections').where({ collection: collectionName }).first();
    if (exists) {
      continue;
    }
    await createCollection(db, {
      collection: collectionName,
      icon: meta.icon,
      note: meta.note,
      singleton: meta.singleton,
      sort_field: meta.sort_field,
      archive_field: meta.archive_field,
      archive_value: meta.archive_value,
      unarchive_value: meta.unarchive_value,
      hidden: meta.hidden,
      system: meta.system,
    });
  }

  for (const { collection, field } of diff.fields_to_create) {
    const fieldMeta = target.fields.find((f) => f.collection === collection && f.field === field);
    if (!fieldMeta) {
      continue;
    }

    const exists = await db('cms_fields').where({ collection, field }).first();
    if (exists) {
      continue;
    }

    if (fieldMeta.type === 'alias') {
      await db('cms_fields').insert({
        ...fieldMeta,
        options: fieldMeta.options ? JSON.stringify(fieldMeta.options) : null,
        display_options: fieldMeta.display_options ? JSON.stringify(fieldMeta.display_options) : null,
        conditions: fieldMeta.conditions ? JSON.stringify(fieldMeta.conditions) : null,
        validation: fieldMeta.validation ? JSON.stringify(fieldMeta.validation) : null,
      });
      continue;
    }

    await createField(db, collection, {
      field: fieldMeta.field,
      type: fieldMeta.type as never,
      interface: fieldMeta.interface,
      options: fieldMeta.options,
      display: fieldMeta.display,
      display_options: fieldMeta.display_options,
      readonly: fieldMeta.readonly,
      hidden: fieldMeta.hidden,
      sort: fieldMeta.sort,
      width: fieldMeta.width,
      required: fieldMeta.required,
      nullable: fieldMeta.nullable,
      unique: fieldMeta.unique,
      is_indexed: fieldMeta.is_indexed,
      searchable: fieldMeta.searchable,
      validation: fieldMeta.validation,
      note: fieldMeta.note,
      default_value: fieldMeta.default_value,
    });
  }

  for (const relation of diff.relations_to_create) {
    const exists = await db('cms_relations').where({ id: relation.id }).first();
    if (!exists) {
      const { id: _id, ...data } = relation;
      await db('cms_relations').insert(data);
    }
  }
}

/**
 * Introspect database tables not yet registered as collections.
 */
export async function introspectSchema(db: Knex): Promise<IntrospectedTable[]> {
  return introspectUnregisteredTables(db);
}

/**
 * Register metadata for existing physical tables discovered via introspection.
 */
export async function importIntrospectedTables(db: Knex, tableNames: string[]): Promise<string[]> {
  const tables = await introspectUnregisteredTables(db);
  const imported: string[] = [];

  for (const tableName of tableNames) {
    const table = tables.find((entry) => entry.table === tableName);
    if (!table) {
      continue;
    }

    const exists = await db('cms_collections').where({ collection: tableName }).first();
    if (exists) {
      continue;
    }

    await db.transaction(async (trx) => {
      await trx('cms_collections').insert({
        collection: table.proposed_collection.collection,
        icon: null,
        note: table.proposed_collection.note,
        singleton: table.proposed_collection.singleton,
        sort_field: null,
        archive_field: null,
        archive_value: null,
        unarchive_value: null,
        hidden: table.proposed_collection.hidden,
        system: table.proposed_collection.system,
      });

      const columnNames = new Set(table.columns.map((col) => col.name));
      let sort = 1;

      for (const sysField of ['id', 'date_created', 'date_updated', 'user_created', 'user_updated']) {
        if (!columnNames.has(sysField)) {
          continue;
        }
        await trx('cms_fields').insert({
          collection: tableName,
          field: sysField,
          type: sysField === 'id' ? 'uuid' : sysField.startsWith('user_') ? 'uuid' : 'datetime',
          special: sysField === 'id' ? 'uuid' : sysField.replace('_', '-'),
          interface: sysField === 'id' ? 'input' : sysField.startsWith('user_') ? 'select-dropdown' : 'datetime',
          readonly: true,
          hidden: true,
          required: sysField === 'id',
          sort: sort++,
          width: 12,
        });
      }

      for (const proposed of table.proposed_fields) {
        await trx('cms_fields').insert({
          collection: tableName,
          field: proposed.field,
          type: proposed.type,
          interface: proposed.interface,
          required: proposed.required,
          nullable: proposed.nullable,
          sort: sort++,
          width: 12,
          searchable: true,
        });
      }
    });

    imported.push(tableName);
  }

  return imported;
}

/**
 * Diff current schema against a target snapshot.
 */
export async function diffAgainstSnapshot(db: Knex, target: SchemaSnapshot): Promise<SchemaDiff> {
  const current = await captureSchemaSnapshot(db);
  return diffSchemaSnapshots(current, target);
}

/**
 * Apply a target snapshot to the current database.
 */
export async function applySnapshot(db: Knex, target: SchemaSnapshot): Promise<SchemaDiff> {
  const diff = await diffAgainstSnapshot(db, target);
  if (
    diff.collections_to_create.length === 0 &&
    diff.fields_to_create.length === 0 &&
    diff.relations_to_create.length === 0
  ) {
    throw new AppError('No schema changes to apply', 400, 'VALIDATION_ERROR');
  }
  await applySchemaDiff(db, diff, target);
  return diff;
}
