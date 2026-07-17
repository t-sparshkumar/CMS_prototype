import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { SYSTEM_POLICY_IDS } from '../constants/policies.js';
import { ADMIN_ROLE_ID } from '../constants/roles.js';
import { AppError } from '../middleware/errorHandler.js';
import type { PermissionAction } from '../types/permission.js';
import type {
  CmsPolicyRow,
  CreatePolicyInput,
  PolicyMeta,
  PolicyRule,
  RoleWithStats,
  UpdatePolicyInput,
} from '../types/policy.js';
import { upsertPermission } from './permissions.service.js';

function parseRules(value: unknown): PolicyRule[] {
  if (Array.isArray(value)) {
    return value as PolicyRule[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as PolicyRule[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toPolicyMeta(row: CmsPolicyRow, roleCount = 0): PolicyMeta {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    rules: parseRules(row.rules),
    is_system: Boolean(row.is_system),
    role_count: roleCount,
  };
}

function mergePolicyRules(rules: PolicyRule[]): PolicyRule[] {
  const map = new Map<string, PolicyRule>();

  for (const rule of rules) {
    const key = `${rule.collection}:${rule.action}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...rule, fields: rule.fields ?? '*' });
      continue;
    }

    const mergedFields =
      existing.fields === '*' || rule.fields === '*'
        ? '*'
        : [...new Set([...(existing.fields ?? []), ...(rule.fields ?? [])])];

    const existingFilter = existing.permissions?.filter;
    const nextFilter = rule.permissions?.filter;
    const mergedPermissions =
      !existingFilter || Object.keys(existingFilter as object).length === 0
        ? existing.permissions
        : !nextFilter || Object.keys(nextFilter as object).length === 0
          ? rule.permissions
          : existing.permissions;

    map.set(key, {
      collection: rule.collection,
      action: rule.action,
      fields: mergedFields,
      permissions: mergedPermissions ?? null,
    });
  }

  return [...map.values()];
}

/**
 * Replace a role's permissions with the merged rules from assigned policies.
 */
export async function syncRolePermissionsFromPolicies(db: Knex, roleId: string): Promise<void> {
  const role = await db('cms_roles').where({ id: roleId }).first();
  if (!role || role.admin_access) {
    return;
  }

  await db('cms_permissions').where({ role: roleId }).delete();

  const policyIds = await db('cms_role_policies').where({ role: roleId }).pluck('policy');
  if (policyIds.length === 0) {
    return;
  }

  const policies = await db<CmsPolicyRow>('cms_policies').whereIn('id', policyIds);
  const merged = mergePolicyRules(policies.flatMap((policy) => parseRules(policy.rules)));

  for (const rule of merged) {
    await upsertPermission(db, {
      role: roleId,
      collection: rule.collection,
      action: rule.action,
      fields: rule.fields ?? '*',
      permissions: rule.permissions ?? null,
    });
  }
}

/**
 * List all policies with role assignment counts.
 */
export async function listPolicies(db: Knex): Promise<PolicyMeta[]> {
  const rows = await db<CmsPolicyRow>('cms_policies').orderBy('name', 'asc');
  const counts = await db('cms_role_policies')
    .select('policy')
    .count('* as count')
    .groupBy('policy');

  const countMap = new Map<string, number>(
    counts.map((row) => [String(row.policy), Number(row.count)]),
  );

  return rows.map((row) => toPolicyMeta(row, countMap.get(row.id) ?? 0));
}

/**
 * List roles with user and policy assignment stats.
 */
export async function listRolesWithStats(db: Knex): Promise<RoleWithStats[]> {
  const roles = await db('cms_roles').select('*').orderBy('name', 'asc');
  const userCounts = await db('cms_users').select('role').count('* as count').groupBy('role');
  const policyLinks = await db('cms_role_policies').select('role', 'policy');

  const userCountMap = new Map<string, number>(
    userCounts.map((row) => [String(row.role), Number(row.count)]),
  );
  const policyMap = new Map<string, string[]>();
  for (const link of policyLinks) {
    const roleId = String(link.role);
    const list = policyMap.get(roleId) ?? [];
    list.push(String(link.policy));
    policyMap.set(roleId, list);
  }

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    icon: role.icon,
    admin_access: Boolean(role.admin_access),
    app_access: Boolean(role.app_access),
    user_count: userCountMap.get(role.id) ?? 0,
    policy_count: policyMap.get(role.id)?.length ?? 0,
    policy_ids: policyMap.get(role.id) ?? [],
  }));
}

/**
 * Get policy IDs assigned to a role.
 */
export async function getRolePolicyIds(db: Knex, roleId: string): Promise<string[]> {
  return db('cms_role_policies').where({ role: roleId }).pluck('policy');
}

/**
 * Replace policy assignments for a role and sync permissions.
 */
export async function setRolePolicies(db: Knex, roleId: string, policyIds: string[]): Promise<string[]> {
  const role = await db('cms_roles').where({ id: roleId }).first();
  if (!role) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }

  if (role.admin_access) {
    throw new AppError('Administrator permissions cannot be managed via policies', 400, 'VALIDATION_ERROR');
  }

  const uniqueIds = [...new Set(policyIds)];
  if (uniqueIds.length > 0) {
    const found = await db('cms_policies').whereIn('id', uniqueIds).select('id');
    if (found.length !== uniqueIds.length) {
      throw new AppError('One or more policies were not found', 404, 'NOT_FOUND');
    }
  }

  await db.transaction(async (trx) => {
    await trx('cms_role_policies').where({ role: roleId }).delete();
    for (const policyId of uniqueIds) {
      await trx('cms_role_policies').insert({ role: roleId, policy: policyId });
    }
  });

  await syncRolePermissionsFromPolicies(db, roleId);
  return uniqueIds;
}

/**
 * Create a custom policy.
 */
export async function createPolicy(db: Knex, input: CreatePolicyInput): Promise<PolicyMeta> {
  const name = input.name.trim();
  if (!name) {
    throw new AppError('Policy name is required', 400, 'VALIDATION_ERROR');
  }
  validateRules(input.rules);

  const existing = await db('cms_policies').where({ name }).first();
  if (existing) {
    throw new AppError('A policy with this name already exists', 409, 'POLICY_EXISTS');
  }

  const id = randomUUID();
  await db('cms_policies').insert({
    id,
    name,
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || 'shield',
    rules: JSON.stringify(input.rules),
    is_system: false,
  });

  const row = await db<CmsPolicyRow>('cms_policies').where({ id }).first();
  if (!row) {
    throw new AppError('Failed to create policy', 500, 'INTERNAL_ERROR');
  }
  return toPolicyMeta(row, 0);
}

/**
 * Update a policy. System policy names are protected; rules remain editable.
 */
export async function updatePolicy(db: Knex, policyId: string, input: UpdatePolicyInput): Promise<PolicyMeta> {
  const row = await db<CmsPolicyRow>('cms_policies').where({ id: policyId }).first();
  if (!row) {
    throw new AppError('Policy not found', 404, 'NOT_FOUND');
  }

  const updates: Partial<CmsPolicyRow> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new AppError('Policy name is required', 400, 'VALIDATION_ERROR');
    }
    if (row.is_system && name !== row.name) {
      throw new AppError('System policy names cannot be changed', 400, 'VALIDATION_ERROR');
    }
    const duplicate = await db('cms_policies').where({ name }).whereNot({ id: policyId }).first();
    if (duplicate) {
      throw new AppError('A policy with this name already exists', 409, 'POLICY_EXISTS');
    }
    updates.name = name;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.icon !== undefined) {
    updates.icon = input.icon?.trim() || null;
  }

  if (input.rules !== undefined) {
    validateRules(input.rules);
    updates.rules = JSON.stringify(input.rules);
  }

  if (Object.keys(updates).length > 0) {
    await db('cms_policies').where({ id: policyId }).update(updates);
  }

  const affectedRoles = await db('cms_role_policies').where({ policy: policyId }).pluck('role');
  for (const roleId of affectedRoles) {
    await syncRolePermissionsFromPolicies(db, roleId);
  }

  const updated = await db<CmsPolicyRow>('cms_policies').where({ id: policyId }).first();
  const roleCount = await db('cms_role_policies').where({ policy: policyId }).count('* as count').first();
  return toPolicyMeta(updated!, Number(roleCount?.count ?? 0));
}

/**
 * Delete a custom policy.
 */
export async function deletePolicy(db: Knex, policyId: string): Promise<void> {
  if (SYSTEM_POLICY_IDS.has(policyId)) {
    throw new AppError('System policies cannot be deleted', 400, 'VALIDATION_ERROR');
  }

  const row = await db('cms_policies').where({ id: policyId }).first();
  if (!row) {
    throw new AppError('Policy not found', 404, 'NOT_FOUND');
  }

  const affectedRoles = await db('cms_role_policies').where({ policy: policyId }).pluck('role');
  await db('cms_policies').where({ id: policyId }).delete();

  for (const roleId of affectedRoles) {
    if (roleId !== ADMIN_ROLE_ID) {
      await syncRolePermissionsFromPolicies(db, roleId);
    }
  }
}

function validateRules(rules: PolicyRule[]): void {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new AppError('At least one permission rule is required', 400, 'VALIDATION_ERROR');
  }

  const actions = new Set<PermissionAction>(['create', 'read', 'update', 'delete']);
  for (const rule of rules) {
    if (!rule.collection?.trim() || !actions.has(rule.action)) {
      throw new AppError('Each rule requires a collection and valid action', 400, 'VALIDATION_ERROR');
    }
  }
}

export function normalizePolicyRow(row: CmsPolicyRow): CmsPolicyRow {
  return {
    ...row,
    rules: parseRules(row.rules),
  };
}

export { parseRules, mergePolicyRules };
