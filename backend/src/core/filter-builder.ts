import type { Knex } from 'knex';
import { AppError } from '../middleware/errorHandler.js';
import type { FilterOperator } from '../types/item.js';

/**
 * Apply parsed filters to a Knex query using a whitelisted set of column names.
 */
export function applyFilters(
  query: Knex.QueryBuilder,
  filters: Record<string, Partial<Record<FilterOperator, string | string[]>>>,
  allowedFields: Set<string>,
): void {
  for (const [field, operators] of Object.entries(filters)) {
    if (!allowedFields.has(field)) {
      throw new AppError(`Invalid filter field "${field}"`, 400, 'VALIDATION_ERROR');
    }

    for (const [operator, rawValue] of Object.entries(operators)) {
      applyFilterOperator(query, field, operator as FilterOperator, rawValue);
    }
  }
}

function applyFilterOperator(
  query: Knex.QueryBuilder,
  field: string,
  operator: FilterOperator,
  rawValue: string | string[],
): void {
  switch (operator) {
    case '_eq':
      query.where(field, coerceValue(rawValue));
      break;
    case '_neq':
      query.whereNot(field, coerceValue(rawValue));
      break;
    case '_lt':
      query.where(field, '<', coerceValue(rawValue));
      break;
    case '_lte':
      query.where(field, '<=', coerceValue(rawValue));
      break;
    case '_gt':
      query.where(field, '>', coerceValue(rawValue));
      break;
    case '_gte':
      query.where(field, '>=', coerceValue(rawValue));
      break;
    case '_in': {
      const values = Array.isArray(rawValue)
        ? rawValue
        : String(rawValue)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
      query.whereIn(field, values);
      break;
    }
    case '_contains':
      query.where(field, 'like', `%${String(rawValue)}%`);
      break;
    case '_null': {
      const scalar = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      const isNull = scalar === 'true' || scalar === '1';
      if (isNull) {
        query.whereNull(field);
      } else {
        query.whereNotNull(field);
      }
      break;
    }
    default:
      throw new AppError(`Unsupported filter operator "${operator}"`, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Apply full-text search across searchable string/text columns.
 */
export function applySearch(
  query: Knex.QueryBuilder,
  search: string,
  searchableFields: string[],
): void {
  if (searchableFields.length === 0) {
    return;
  }

  query.where((builder) => {
    for (const field of searchableFields) {
      builder.orWhere(field, 'like', `%${search}%`);
    }
  });
}

/**
 * Apply sort columns to a Knex query with field whitelist validation.
 */
export function applySort(
  query: Knex.QueryBuilder,
  sort: Array<{ column: string; order: 'asc' | 'desc' }>,
  allowedFields: Set<string>,
): void {
  for (const { column, order } of sort) {
    if (!allowedFields.has(column)) {
      throw new AppError(`Invalid sort field "${column}"`, 400, 'VALIDATION_ERROR');
    }
    query.orderBy(column, order);
  }
}

function coerceValue(value: string | string[]): string | number | boolean {
  const scalar = Array.isArray(value) ? value[0] : value;
  if (scalar === 'true') return true;
  if (scalar === 'false') return false;
  if (scalar !== undefined && scalar !== '' && !Number.isNaN(Number(scalar)) && /^-?\d+(\.\d+)?$/.test(scalar)) {
    return Number(scalar);
  }
  return scalar ?? '';
}
