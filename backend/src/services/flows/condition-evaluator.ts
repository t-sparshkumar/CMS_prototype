import type { FilterOperator } from '../../types/item.js';
import { getChainValue, parseTemplates } from './data-chain.js';
import type { DataChain } from '../../types/flow.js';

type FilterRule = {
  [key: string]:
    | Partial<Record<FilterOperator, unknown>>
    | FilterRule
    | FilterRule[]
    | undefined;
};

function coerceComparable(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    const num = Number(value);
    if (!Number.isNaN(num) && value.trim() !== '') {
      return num;
    }
    return value;
  }
  return String(value);
}

function compareValues(left: unknown, operator: FilterOperator, right: unknown): boolean {
  const a = coerceComparable(left);
  const b = coerceComparable(right);

  switch (operator) {
    case '_eq':
      return a === b;
    case '_neq':
      return a !== b;
    case '_lt':
      return Number(a) < Number(b);
    case '_lte':
      return Number(a) <= Number(b);
    case '_gt':
      return Number(a) > Number(b);
    case '_gte':
      return Number(a) >= Number(b);
    case '_in': {
      const values = Array.isArray(right)
        ? right.map(coerceComparable)
        : String(right)
            .split(',')
            .map((v) => coerceComparable(v.trim()));
      return values.includes(a);
    }
    case '_contains':
      return String(a).toLowerCase().includes(String(b).toLowerCase());
    case '_null': {
      const expectNull = right === true || right === 'true' || right === 1 || right === '1';
      return expectNull ? a === null : a !== null;
    }
    default:
      return false;
  }
}

/**
 * Evaluate a Directus-style filter rule against in-memory data.
 */
export function evaluateFilter(data: Record<string, unknown>, filter: FilterRule): boolean {
  for (const [field, rule] of Object.entries(filter)) {
    if (field === '_and' && Array.isArray(rule)) {
      if (!rule.every((entry) => evaluateFilter(data, entry as FilterRule))) {
        return false;
      }
      continue;
    }

    if (field === '_or' && Array.isArray(rule)) {
      if (!rule.some((entry) => evaluateFilter(data, entry as FilterRule))) {
        return false;
      }
      continue;
    }

    const value = data[field];
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
      const operators = rule as Partial<Record<FilterOperator, unknown>>;
      const isOperatorMap = Object.keys(operators).some((key) => key.startsWith('_'));

      if (isOperatorMap) {
        for (const [operator, operand] of Object.entries(operators)) {
          if (!compareValues(value, operator as FilterOperator, operand)) {
            return false;
          }
        }
      } else if (!evaluateFilter(value as Record<string, unknown>, rule as FilterRule)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Evaluate a condition filter that may reference data chain paths.
 */
export function evaluateConditionFilter(filter: FilterRule, chain: DataChain): boolean {
  const resolved = parseTemplates(filter, chain) as FilterRule;
  const scopePath =
    typeof (filter as Record<string, unknown>).scope === 'string'
      ? String((filter as Record<string, unknown>).scope)
      : '$trigger';

  const scopeData = getChainValue(chain, scopePath.replace(/^\$/, '$'));
  const data =
    scopeData && typeof scopeData === 'object' && !Array.isArray(scopeData)
      ? (scopeData as Record<string, unknown>)
      : (chain.$trigger as Record<string, unknown>);

  const { scope: _scope, ...rules } = resolved as Record<string, unknown>;
  return evaluateFilter(data, rules as FilterRule);
}
