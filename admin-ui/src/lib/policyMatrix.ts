import type { PolicyRule } from './api';

export const MATRIX_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type ActionKey = (typeof MATRIX_ACTIONS)[number];
export type MatrixState = Record<string, Partial<Record<ActionKey, boolean>>>;

export const WILDCARD_COLLECTION = '*';

function ruleKey(collection: string, action: ActionKey): string {
  return `${collection}:${action}`;
}

export function rulesToPerCollectionMatrix(rules: PolicyRule[]): MatrixState {
  const matrix: MatrixState = {};
  for (const rule of rules) {
    const row = matrix[rule.collection] ?? {};
    row[rule.action] = true;
    matrix[rule.collection] = row;
  }
  return matrix;
}

export function matrixToRules(matrix: MatrixState, existingRules?: PolicyRule[]): PolicyRule[] {
  const existingByKey = new Map<string, PolicyRule>();
  if (existingRules) {
    for (const rule of existingRules) {
      existingByKey.set(ruleKey(rule.collection, rule.action), rule);
    }
  }

  const rules: PolicyRule[] = [];
  for (const [collection, actions] of Object.entries(matrix)) {
    for (const action of MATRIX_ACTIONS) {
      if (actions[action]) {
        const existing = existingByKey.get(ruleKey(collection, action));
        rules.push({
          collection,
          action,
          fields: existing?.fields ?? '*',
          permissions: existing?.permissions ?? undefined,
        });
      }
    }
  }
  return rules;
}

export function validateMatrix(matrix: MatrixState): string | null {
  const hasPermission = Object.values(matrix).some((actions) =>
    MATRIX_ACTIONS.some((action) => actions[action]),
  );
  if (!hasPermission) {
    return 'Add at least one collection permission';
  }
  return null;
}

export function hasWildcardRow(matrix: MatrixState): boolean {
  return WILDCARD_COLLECTION in matrix;
}
