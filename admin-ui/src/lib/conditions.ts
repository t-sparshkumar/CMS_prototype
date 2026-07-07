import type { FieldMeta } from './api';

interface ConditionRule {
  field?: string;
  _eq?: unknown;
  _neq?: unknown;
  _null?: unknown;
  _nnull?: unknown;
  _contains?: unknown;
  _in?: unknown[];
}

function matchFieldRule(fieldValue: unknown, rule: ConditionRule): boolean {
  if (rule._eq !== undefined) return fieldValue === rule._eq;
  if (rule._neq !== undefined) return fieldValue !== rule._neq;
  if (rule._null !== undefined) return fieldValue === null || fieldValue === undefined || fieldValue === '';
  if (rule._nnull !== undefined) return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
  if (rule._contains !== undefined) return String(fieldValue ?? '').includes(String(rule._contains));
  if (rule._in !== undefined) return rule._in.map(String).includes(String(fieldValue));
  return false;
}

function evaluateRule(rule: ConditionRule | Record<string, ConditionRule>, formData: Record<string, unknown>): boolean {
  if ('field' in rule && typeof rule.field === 'string') {
    return matchFieldRule(formData[rule.field], rule);
  }

  for (const [fieldName, nestedRule] of Object.entries(rule)) {
    if (typeof nestedRule !== 'object' || nestedRule === null) {
      continue;
    }
    const fieldValue = formData[fieldName];
    if (nestedRule._eq !== undefined && fieldValue !== nestedRule._eq) {
      return false;
    }
    if (nestedRule._neq !== undefined && fieldValue === nestedRule._neq) {
      return false;
    }
  }

  return true;
}

interface FieldCondition {
  rule?: ConditionRule | Record<string, ConditionRule>;
  hidden?: boolean;
  readonly?: boolean;
  required?: boolean;
}

export function resolveFieldState(
  field: FieldMeta,
  formData: Record<string, unknown> = {},
): { hidden: boolean; readonly: boolean; required: boolean } {
  let hidden = Boolean(field.hidden);
  let readonly = Boolean(field.readonly);
  let required = Boolean(field.required);

  const conditions = field.conditions as { conditions?: FieldCondition[] } | FieldCondition[] | null;
  const conditionList = Array.isArray(conditions) ? conditions : conditions?.conditions ?? [];

  for (const condition of conditionList) {
    if (!condition.rule || !evaluateRule(condition.rule, formData)) {
      continue;
    }
    if (condition.hidden !== undefined) {
      hidden = condition.hidden;
    }
    if (condition.readonly !== undefined) {
      readonly = condition.readonly;
    }
    if (condition.required !== undefined) {
      required = condition.required;
    }
  }

  return { hidden, readonly, required };
}

export function applyFieldConditions(fields: FieldMeta[], formData: Record<string, unknown> = {}): FieldMeta[] {
  return fields.map((field) => {
    const state = resolveFieldState(field, formData);
    return {
      ...field,
      effective_hidden: state.hidden,
      effective_readonly: state.readonly,
      effective_required: state.required,
    };
  });
}
