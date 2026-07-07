import type { Knex } from 'knex';
import { SYSTEM_FIELDS } from './collection.js';
import type { SqlFieldType } from '../types/field.js';

const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export const SYSTEM_FIELD_NAMES = new Set(SYSTEM_FIELDS.map((f) => f.field));

const DEFAULT_INTERFACE_BY_TYPE: Record<SqlFieldType, string> = {
  string: 'input',
  text: 'textarea',
  integer: 'number',
  bigInteger: 'number',
  float: 'number',
  decimal: 'number',
  boolean: 'toggle',
  datetime: 'datetime',
  date: 'datetime',
  time: 'datetime',
  json: 'json',
  uuid: 'input',
  hash: 'hash',
  csv: 'textarea',
  binary: 'input',
};

/**
 * Validate a field name for use as a SQL column name.
 */
export function validateFieldName(name: string): void {
  if (!name || name.length > 64) {
    throw new Error('Field name must be between 1 and 64 characters');
  }

  if (!FIELD_NAME_PATTERN.test(name)) {
    throw new Error(
      'Field name must start with a letter and contain only lowercase letters, numbers, and underscores',
    );
  }
}

/**
 * Check whether a field is a built-in system field.
 */
export function isSystemField(fieldName: string): boolean {
  return SYSTEM_FIELD_NAMES.has(fieldName);
}

/**
 * Return the default admin interface for a SQL field type.
 */
export function getDefaultInterface(type: SqlFieldType): string {
  return DEFAULT_INTERFACE_BY_TYPE[type];
}

/**
 * Build a deterministic index name for a collection field.
 */
export function getFieldIndexName(collectionName: string, fieldName: string): string {
  return `idx_${collectionName}_${fieldName}`;
}

/**
 * Build a deterministic unique index name for a collection field.
 */
export function getFieldUniqueIndexName(collectionName: string, fieldName: string): string {
  return `uniq_${collectionName}_${fieldName}`;
}

/**
 * Apply a Knex column definition for the given field type.
 */
export function applyColumnType(
  table: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
  columnName: string,
  type: SqlFieldType,
  required: boolean,
  defaultValue: string | null | undefined,
): void {
  let column: Knex.ColumnBuilder;

  switch (type) {
    case 'string':
      column = table.string(columnName, 255);
      break;
    case 'text':
    case 'csv':
      column = table.text(columnName);
      break;
    case 'integer':
      column = table.integer(columnName);
      break;
    case 'bigInteger':
      column = table.bigInteger(columnName);
      break;
    case 'float':
      column = table.float(columnName);
      break;
    case 'decimal':
      column = table.decimal(columnName, 14, 4);
      break;
    case 'boolean':
      column = table.boolean(columnName);
      break;
    case 'datetime':
      column = table.dateTime(columnName);
      break;
    case 'date':
      column = table.date(columnName);
      break;
    case 'time':
      column = table.time(columnName);
      break;
    case 'json':
      column = table.json(columnName);
      break;
    case 'uuid':
      column = table.uuid(columnName);
      break;
    case 'hash':
      column = table.string(columnName, 255);
      break;
    case 'binary':
      column = table.binary(columnName);
      break;
    default:
      throw new Error(`Unsupported field type: ${type as string}`);
  }

  if (required) {
    column.notNullable();
  } else {
    column.nullable();
  }

  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
    applyDefaultValue(column, type, defaultValue);
  }
}

function applyDefaultValue(
  column: Knex.ColumnBuilder,
  type: SqlFieldType,
  defaultValue: string,
): void {
  switch (type) {
    case 'integer':
    case 'bigInteger':
      column.defaultTo(Number.parseInt(defaultValue, 10));
      break;
    case 'float':
    case 'decimal':
      column.defaultTo(Number.parseFloat(defaultValue));
      break;
    case 'boolean':
      column.defaultTo(defaultValue === 'true' || defaultValue === '1');
      break;
    case 'json':
      column.defaultTo(JSON.parse(defaultValue) as Knex.Value);
      break;
    default:
      column.defaultTo(defaultValue);
      break;
  }
}

/**
 * Parse a stored JSON column value from the database into an object.
 */
export function parseJsonColumn<T extends Record<string, unknown>>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return value as T;
  }
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return null;
}
