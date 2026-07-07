import { parseFilterQuery } from '../core/query-parser.js';
import type { FilterOperator, ItemQueryOptions } from '../types/item.js';

/**
 * Parse a GraphQL JSON filter argument into the items service filter shape.
 */
export function parseGraphqlFilter(
  filter: unknown,
): Record<string, Partial<Record<FilterOperator, string | string[]>>> {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return {};
  }

  return parseFilterQuery(filter);
}

/**
 * Parse a GraphQL sort argument (array of field names, `-` prefix for DESC).
 */
export function parseGraphqlSort(sort: unknown): ItemQueryOptions['sort'] {
  if (!Array.isArray(sort)) {
    return [];
  }

  return sort
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((part) => {
      if (part.startsWith('-')) {
        return { column: part.slice(1), order: 'desc' as const };
      }
      return { column: part, order: 'asc' as const };
    });
}
