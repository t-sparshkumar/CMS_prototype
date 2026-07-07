import type { Knex } from 'knex';

export interface IntrospectedTable {
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  proposed_collection: {
    collection: string;
    note: string;
    singleton: boolean;
    hidden: boolean;
    system: boolean;
  };
  proposed_fields: Array<{
    field: string;
    type: string;
    interface: string;
    required: boolean;
    nullable: boolean;
  }>;
}

const META_TABLE_PREFIX = 'cms_';
const SYSTEM_TABLES = new Set(['knex_migrations', 'knex_migrations_lock', 'sqlite_sequence']);

/**
 * List physical tables not registered in cms_collections and propose metadata.
 */
export async function introspectUnregisteredTables(db: Knex): Promise<IntrospectedTable[]> {
  const registered = await db('cms_collections').select('collection');
  const registeredSet = new Set(registered.map((row: { collection: string }) => row.collection));

  const tableNames = await listPhysicalTables(db);
  const unregistered = tableNames.filter(
    (name) => !registeredSet.has(name) && !name.startsWith(META_TABLE_PREFIX) && !SYSTEM_TABLES.has(name),
  );

  const results: IntrospectedTable[] = [];

  for (const tableName of unregistered) {
    const columns = await listTableColumns(db, tableName);
    results.push({
      table: tableName,
      columns,
      proposed_collection: {
        collection: tableName,
        note: 'Discovered via schema introspection',
        singleton: false,
        hidden: false,
        system: false,
      },
      proposed_fields: columns
        .filter((col) => !['id', 'date_created', 'date_updated', 'user_created', 'user_updated'].includes(col.name))
        .map((col) => ({
          field: col.name,
          type: mapSqlTypeToFieldType(col.type),
          interface: mapTypeToInterface(col.type),
          required: !col.nullable,
          nullable: col.nullable,
        })),
    });
  }

  return results;
}

async function listPhysicalTables(db: Knex): Promise<string[]> {
  const client = db.client.config.client;

  if (client === 'sqlite3' || client === 'better-sqlite3') {
    const rows = await db('sqlite_master')
      .where({ type: 'table' })
      .select('name') as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }

  const rows = await db
    .select<{ table_name: string }[]>('table_name')
    .from('information_schema.tables')
    .where({ table_schema: 'public', table_type: 'BASE TABLE' });

  return rows.map((row) => row.table_name);
}

async function listTableColumns(
  db: Knex,
  tableName: string,
): Promise<Array<{ name: string; type: string; nullable: boolean }>> {
  const client = db.client.config.client;

  if (client === 'sqlite3' || client === 'better-sqlite3') {
    const rows = await db.raw<{ name: string; type: string; notnull: number }[]>(`PRAGMA table_info(${tableName})`);
    const columns = Array.isArray(rows) ? rows : (rows as { rows?: typeof rows }).rows ?? [];
    return columns.map((col) => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
    }));
  }

  const rows = await db
    .select<{ column_name: string; data_type: string; is_nullable: string }[]>(
      'column_name',
      'data_type',
      'is_nullable',
    )
    .from('information_schema.columns')
    .where({ table_schema: 'public', table_name: tableName });

  return rows.map((col) => ({
    name: col.column_name,
    type: col.data_type,
    nullable: col.is_nullable === 'YES',
  }));
}

function mapSqlTypeToFieldType(sqlType: string): string {
  const normalized = sqlType.toLowerCase();
  if (normalized.includes('int')) return 'integer';
  if (normalized.includes('bool')) return 'boolean';
  if (normalized.includes('json')) return 'json';
  if (normalized.includes('uuid')) return 'uuid';
  if (normalized.includes('text')) return 'text';
  if (normalized.includes('date') && !normalized.includes('time')) return 'date';
  if (normalized.includes('time') && !normalized.includes('date')) return 'time';
  if (normalized.includes('timestamp') || normalized.includes('datetime')) return 'datetime';
  if (normalized.includes('decimal') || normalized.includes('numeric')) return 'decimal';
  if (normalized.includes('float') || normalized.includes('real') || normalized.includes('double')) return 'float';
  if (normalized.includes('blob') || normalized.includes('binary')) return 'binary';
  return 'string';
}

function mapTypeToInterface(sqlType: string): string {
  const fieldType = mapSqlTypeToFieldType(sqlType);
  switch (fieldType) {
    case 'text':
      return 'textarea';
    case 'integer':
    case 'bigInteger':
    case 'float':
    case 'decimal':
      return 'number';
    case 'boolean':
      return 'toggle';
    case 'datetime':
    case 'date':
    case 'time':
      return 'datetime';
    case 'json':
      return 'json';
    default:
      return 'input';
  }
}
