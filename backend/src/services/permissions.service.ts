import type { Knex } from 'knex';
import { PUBLIC_ROLE_ID } from '../constants/roles.js';
import { parseFilterQuery } from '../core/query-parser.js';
import { parseJsonColumn } from '../core/field.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedUser } from '../types/user.js';
import type {
  AccessContext,
  CmsPermissionRow,
  CreatePermissionInput,
  PermissionAction,
  PermissionFilter,
  PermissionMeta,
} from '../types/permission.js';
import type { ItemRecord } from '../types/item.js';

/**
 * Resolve access context for a role, collection, and action.
 */
export async function resolveAccess(
  db: Knex,
  user: AuthenticatedUser | null | undefined,
  collection: string,
  action: PermissionAction,
): Promise<AccessContext> {
  if (user?.admin_access) {
    return {
      allowed: true,
      fullAccess: true,
      roleId: user.role,
      action,
      collection,
      allowedFields: '*',
      rowFilter: {},
    };
  }

  const roleId = user?.role ?? PUBLIC_ROLE_ID;

  const permission = await findPermission(db, roleId, collection, action);
  if (!permission) {
    return {
      allowed: false,
      fullAccess: false,
      roleId,
      action,
      collection,
      allowedFields: [],
      rowFilter: {},
    };
  }

  return {
    allowed: true,
    fullAccess: false,
    roleId,
    action,
    collection,
    allowedFields: parseAllowedFields(permission.fields),
    rowFilter: extractRowFilter(permission.permissions),
  };
}

/**
 * Assert access is allowed or throw 403.
 */
export function assertAccess(access: AccessContext): void {
  if (!access.allowed) {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
  }
}

/**
 * Find the best matching permission row for a role, collection, and action.
 */
export async function findPermission(
  db: Knex,
  roleId: string,
  collection: string,
  action: PermissionAction,
): Promise<CmsPermissionRow | null> {
  const specific = await db<CmsPermissionRow>('cms_permissions')
    .where({ role: roleId, collection, action })
    .first();

  if (specific) {
    return normalizePermissionRow(specific);
  }

  const wildcard = await db<CmsPermissionRow>('cms_permissions')
    .where({ role: roleId, collection: '*', action })
    .first();

  return wildcard ? normalizePermissionRow(wildcard) : null;
}

/**
 * List all permissions, optionally filtered by role.
 */
export async function listPermissions(db: Knex, roleId?: string): Promise<PermissionMeta[]> {
  const query = db<CmsPermissionRow>('cms_permissions').orderBy(['role', 'collection', 'action']);
  if (roleId) {
    query.where({ role: roleId });
  }

  const rows = await query;
  return rows.map(toPermissionMeta);
}

/**
 * Create or replace a permission rule.
 */
export async function upsertPermission(db: Knex, input: CreatePermissionInput): Promise<PermissionMeta> {
  const existing = await db<CmsPermissionRow>('cms_permissions')
    .where({ role: input.role, collection: input.collection, action: input.action })
    .first();

  const fieldsValue = input.fields === '*' ? JSON.stringify(['*']) : JSON.stringify(input.fields ?? ['*']);
  const row = {
    role: input.role,
    collection: input.collection,
    action: input.action,
    fields: fieldsValue,
    permissions: input.permissions ? JSON.stringify(input.permissions) : null,
    validation: input.validation ? JSON.stringify(input.validation) : null,
    presets: input.presets ? JSON.stringify(input.presets) : null,
  };

  if (existing) {
    await db('cms_permissions').where({ id: existing.id }).update(row);
  } else {
    await db('cms_permissions').insert(row);
  }

  const saved = await db<CmsPermissionRow>('cms_permissions')
    .where({ role: input.role, collection: input.collection, action: input.action })
    .first();

  if (!saved) {
    throw new AppError('Failed to save permission', 500, 'INTERNAL_ERROR');
  }

  return toPermissionMeta(normalizePermissionRow(saved));
}

/**
 * Delete a permission by ID.
 */
export async function deletePermission(db: Knex, permissionId: number): Promise<void> {
  const deleted = await db('cms_permissions').where({ id: permissionId }).delete();
  if (!deleted) {
    throw new AppError('Permission not found', 404, 'NOT_FOUND');
  }
}

/**
 * Strip item fields not permitted for read responses.
 */
export function filterReadableFields(item: ItemRecord, access: AccessContext): ItemRecord {
  if (access.fullAccess || access.allowedFields === '*') {
    return item;
  }

  const allowed = new Set<string>(['id', ...access.allowedFields]);
  const filtered: ItemRecord = {};

  for (const [key, value] of Object.entries(item)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Remove write fields not permitted by the access context.
 */
export function filterWritableInput(
  input: Record<string, unknown>,
  access: AccessContext,
): Record<string, unknown> {
  if (access.fullAccess || access.allowedFields === '*') {
    return input;
  }

  const allowed = new Set(access.allowedFields);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

function normalizePermissionRow(row: CmsPermissionRow): CmsPermissionRow {
  return {
    ...row,
    permissions: parseJsonColumn(row.permissions as unknown as Record<string, unknown>),
    validation: parseJsonColumn(row.validation as unknown as Record<string, unknown>),
    presets: parseJsonColumn(row.presets as unknown as Record<string, unknown>),
    fields: parseFieldsColumn(row.fields),
  };
}

function toPermissionMeta(row: CmsPermissionRow): PermissionMeta {
  const normalized = normalizePermissionRow(row);
  return {
    id: normalized.id,
    role: normalized.role,
    collection: normalized.collection,
    action: normalized.action,
    fields: parseAllowedFields(normalized.fields),
    permissions: normalized.permissions,
    validation: normalized.validation,
    presets: normalized.presets,
    rowFilter: extractRowFilter(normalized.permissions),
  };
}

function parseFieldsColumn(value: unknown): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseAllowedFields(fields: string[] | null): string[] | '*' {
  if (!fields || fields.includes('*')) {
    return '*';
  }
  return fields;
}

function extractRowFilter(permissions: Record<string, unknown> | null): PermissionFilter {
  if (!permissions || !('filter' in permissions)) {
    return {};
  }
  return parseFilterQuery(permissions.filter);
}
