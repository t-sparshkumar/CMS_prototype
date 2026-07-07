import type { ParsedQs } from 'qs';
import type { FilterOperator, ItemQueryOptions } from '../types/item.js';
import { FILTER_OPERATORS } from '../types/item.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFilterValue(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return String(value);
}

/**
 * Parse filter query object from Express query params.
 */
export function parseFilterQuery(
  filterQuery: unknown,
): Record<string, Partial<Record<FilterOperator, string | string[]>>> {
  if (!isRecord(filterQuery)) {
    return {};
  }

  const result: Record<string, Partial<Record<FilterOperator, string | string[]>>> = {};

  for (const [field, operators] of Object.entries(filterQuery)) {
    if (!isRecord(operators)) {
      continue;
    }

    const fieldFilters: Partial<Record<FilterOperator, string | string[]>> = {};
    for (const [op, value] of Object.entries(operators)) {
      if (!FILTER_OPERATORS.includes(op as FilterOperator) || value === undefined) {
        continue;
      }
      fieldFilters[op as FilterOperator] = parseFilterValue(value);
    }

    if (Object.keys(fieldFilters).length > 0) {
      result[field] = fieldFilters;
    }
  }

  return result;
}

/**
 * Parse sort string like "-date_created,title" into column/order pairs.
 */
export function parseSortQuery(sortQuery: unknown): Array<{ column: string; order: 'asc' | 'desc' }> {
  if (!sortQuery || typeof sortQuery !== 'string') {
    return [];
  }

  return sortQuery
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('-')) {
        return { column: part.slice(1), order: 'desc' as const };
      }
      return { column: part, order: 'asc' as const };
    });
}

/**
 * Parse fields selection preserving dot notation for nested relations.
 */
export function parseFieldsQueryRaw(fieldsQuery: unknown): string[] | null {
  if (!fieldsQuery || typeof fieldsQuery !== 'string') {
    return null;
  }

  const fields = fieldsQuery
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  return fields.length > 0 ? fields : null;
}

/**
 * Parse fields selection string into top-level field names for SQL select.
 */
export function parseFieldsQuery(fieldsQuery: unknown): string[] | null {
  const raw = parseFieldsQueryRaw(fieldsQuery);
  if (!raw) {
    return null;
  }

  const topLevel = raw
    .map((f) => f.split('.')[0] ?? f)
    .filter((f, index, arr) => arr.indexOf(f) === index);

  return topLevel.length > 0 ? topLevel : null;
}

/**
 * Build nested field map from a raw fields selection list.
 */
export function parseNestedFieldsMap(rawFields: string[] | null): Map<string, string[]> {
  const nested = new Map<string, string[]>();
  if (!rawFields) {
    return nested;
  }

  for (const fieldPath of rawFields) {
    if (!fieldPath.includes('.')) {
      continue;
    }
    const [parent, ...rest] = fieldPath.split('.');
    if (!parent || rest.length === 0) {
      continue;
    }
    const existing = nested.get(parent) ?? [];
    existing.push(rest.join('.'));
    nested.set(parent, existing);
  }

  return nested;
}

/**
 * Parse full item list query options from Express req.query.
 */
export function parseItemQueryOptions(query: ParsedQs): ItemQueryOptions {
  const limitRaw = query.limit;
  const offsetRaw = query.offset;

  let limit = DEFAULT_LIMIT;
  if (typeof limitRaw === 'string') {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  let offset = 0;
  if (typeof offsetRaw === 'string') {
    const parsed = Number.parseInt(offsetRaw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : null;

  const includeArchived = query.include_archived === 'true';

  const fieldsRaw = parseFieldsQueryRaw(query.fields);

  return {
    filter: parseFilterQuery(query.filter),
    sort: parseSortQuery(query.sort),
    limit,
    offset,
    fields: parseFieldsQuery(query.fields),
    fieldsRaw,
    search,
    includeArchived,
  };
}
