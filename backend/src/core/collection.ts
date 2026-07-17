import type { Knex } from 'knex';
import type { SystemFieldDefinition } from '../types/collection.js';

const COLLECTION_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

const RESERVED_COLLECTION_NAMES = new Set([
  'cms_activity',
  'cms_collections',
  'cms_fields',
  'cms_files',
  'cms_permissions',
  'cms_relations',
  'cms_revisions',
  'cms_roles',
  'cms_sessions',
  'cms_users',
  'knex_migrations',
  'knex_migrations_lock',
  'sqlite_sequence',
]);

/**
 * System fields automatically added to every new collection.
 */
export const SYSTEM_FIELDS: SystemFieldDefinition[] = [
  {
    field: 'id',
    type: 'uuid',
    special: 'uuid',
    interface: 'input',
    readonly: true,
    hidden: true,
    required: true,
    sort: 1,
    width: 12,
  },
  {
    field: 'date_created',
    type: 'datetime',
    special: 'date-created',
    interface: 'datetime',
    readonly: true,
    hidden: true,
    required: false,
    sort: 2,
    width: 12,
  },
  {
    field: 'date_updated',
    type: 'datetime',
    special: 'date-updated',
    interface: 'datetime',
    readonly: true,
    hidden: true,
    required: false,
    sort: 3,
    width: 12,
  },
  {
    field: 'user_created',
    type: 'uuid',
    special: 'user-created',
    interface: 'select-dropdown',
    readonly: true,
    hidden: true,
    required: false,
    sort: 4,
    width: 12,
  },
  {
    field: 'user_updated',
    type: 'uuid',
    special: 'user-updated',
    interface: 'select-dropdown',
    readonly: true,
    hidden: true,
    required: false,
    sort: 5,
    width: 12,
  },
];

/**
 * Validate a collection name for use as a SQL table name.
 */
export function validateCollectionName(name: string): void {
  if (!name || name.length > 64) {
    throw new Error('Collection name must be between 1 and 64 characters');
  }

  if (!COLLECTION_NAME_PATTERN.test(name)) {
    throw new Error(
      'Collection name must start with a letter and contain only lowercase letters, numbers, and underscores',
    );
  }

  if (name.startsWith('cms_')) {
    throw new Error('Collection names cannot start with cms_');
  }

  if (RESERVED_COLLECTION_NAMES.has(name)) {
    throw new Error(`Collection name "${name}" is reserved`);
  }
}

/**
 * Create the physical SQL table for a collection with system columns.
 */
export interface CreateTableOptions {
  primaryKeyType?: 'uuid' | 'integer';
  optionalSystemFields?: {
    status?: boolean;
    sort?: boolean;
    accountability?: boolean;
  };
}

export async function createCollectionTable(
  trx: Knex,
  collectionName: string,
  options: CreateTableOptions = {},
): Promise<void> {
  const pkType = options.primaryKeyType ?? 'uuid';
  const optional = options.optionalSystemFields ?? {};

  await trx.schema.createTable(collectionName, (table) => {
    if (pkType === 'integer') {
      table.increments('id').primary();
    } else {
      table.uuid('id').primary();
    }

    if (optional.accountability) {
      table.dateTime('date_created').nullable();
      table.dateTime('date_updated').nullable();
      table.uuid('user_created').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
      table.uuid('user_updated').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
    }

    if (optional.status) {
      table.string('status', 64).nullable();
    }

    if (optional.sort) {
      table.integer('sort').nullable();
    }
  });
}

export interface InsertSystemFieldsOptions {
  optionalSystemFields?: {
    status?: boolean;
    sort?: boolean;
    accountability?: boolean;
  };
  primaryKeyType?: 'uuid' | 'integer';
}

/**
 * Insert system field metadata rows for a collection.
 */
export async function insertSystemFields(
  trx: Knex,
  collectionName: string,
  options: InsertSystemFieldsOptions = {},
): Promise<void> {
  const optional = options.optionalSystemFields ?? {};
  const primaryKeyType = options.primaryKeyType ?? 'uuid';
  const rows: Array<Record<string, unknown>> = [
    {
      collection: collectionName,
      field: 'id',
      type: primaryKeyType === 'integer' ? 'integer' : 'uuid',
      special: primaryKeyType === 'integer' ? null : 'uuid',
      interface: 'input',
      readonly: true,
      hidden: true,
      required: true,
      sort: 1,
      width: 12,
    },
  ];

  let sort = 2;

  if (optional.status) {
    rows.push({
      collection: collectionName,
      field: 'status',
      type: 'string',
      special: null,
      interface: 'select-dropdown',
      readonly: false,
      hidden: false,
      required: false,
      sort: sort++,
      width: 12,
      options: JSON.stringify({
        choices: [
          { value: 'draft', text: 'Draft' },
          { value: 'published', text: 'Published' },
          { value: 'archived', text: 'Archived' },
        ],
      }),
    });
  }

  if (optional.sort) {
    rows.push({
      collection: collectionName,
      field: 'sort',
      type: 'integer',
      special: null,
      interface: 'input',
      readonly: false,
      hidden: true,
      required: false,
      sort: sort++,
      width: 12,
    });
  }

  if (optional.accountability) {
    for (const field of SYSTEM_FIELDS.filter((f) => f.field !== 'id')) {
      rows.push({
        collection: collectionName,
        field: field.field,
        type: field.type,
        special: field.special,
        interface: field.interface,
        readonly: field.readonly,
        hidden: field.hidden,
        required: field.required,
        sort: sort++,
        width: field.width,
      });
    }
  }

  await trx('cms_fields').insert(rows);
}
