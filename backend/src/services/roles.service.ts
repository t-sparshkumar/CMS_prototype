import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { ADMIN_ROLE_ID, PUBLIC_ROLE_ID } from '../constants/roles.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CmsRoleRow } from '../types/user.js';

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  app_access?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  app_access?: boolean;
}

function isSystemRole(roleId: string): boolean {
  return roleId === ADMIN_ROLE_ID || roleId === PUBLIC_ROLE_ID;
}

/**
 * Create a custom CMS role (non-administrator).
 */
export async function createRole(db: Knex, input: CreateRoleInput): Promise<CmsRoleRow> {
  const name = input.name.trim();
  if (!name) {
    throw new AppError('Role name is required', 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsRoleRow>('cms_roles').where({ name }).first();
  if (existing) {
    throw new AppError('A role with this name already exists', 409, 'ROLE_EXISTS');
  }

  const id = randomUUID();
  await db('cms_roles').insert({
    id,
    name,
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || 'shield',
    admin_access: false,
    app_access: input.app_access ?? true,
  });

  const role = await db<CmsRoleRow>('cms_roles').where({ id }).first();
  if (!role) {
    throw new AppError('Failed to create role', 500, 'INTERNAL_ERROR');
  }
  return role;
}

/**
 * Update an existing role. System roles have limited editable fields.
 */
export async function updateRole(db: Knex, roleId: string, input: UpdateRoleInput): Promise<CmsRoleRow> {
  const role = await db<CmsRoleRow>('cms_roles').where({ id: roleId }).first();
  if (!role) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }

  const updates: Partial<CmsRoleRow> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new AppError('Role name is required', 400, 'VALIDATION_ERROR');
    }
    if (isSystemRole(roleId) && name !== role.name) {
      throw new AppError('System role names cannot be changed', 400, 'VALIDATION_ERROR');
    }
    const duplicate = await db<CmsRoleRow>('cms_roles').where({ name }).whereNot({ id: roleId }).first();
    if (duplicate) {
      throw new AppError('A role with this name already exists', 409, 'ROLE_EXISTS');
    }
    updates.name = name;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.icon !== undefined) {
    updates.icon = input.icon?.trim() || null;
  }

  if (input.app_access !== undefined) {
    if (roleId === ADMIN_ROLE_ID && !input.app_access) {
      throw new AppError('Administrator must retain app access', 400, 'VALIDATION_ERROR');
    }
    if (roleId === PUBLIC_ROLE_ID && input.app_access) {
      throw new AppError('Public role cannot have app access', 400, 'VALIDATION_ERROR');
    }
    updates.app_access = input.app_access;
  }

  if (Object.keys(updates).length === 0) {
    return role;
  }

  await db('cms_roles').where({ id: roleId }).update(updates);
  const updated = await db<CmsRoleRow>('cms_roles').where({ id: roleId }).first();
  if (!updated) {
    throw new AppError('Failed to update role', 500, 'INTERNAL_ERROR');
  }
  return updated;
}

/**
 * Delete a custom role. System roles and roles assigned to users cannot be deleted.
 */
export async function deleteRole(db: Knex, roleId: string): Promise<void> {
  if (isSystemRole(roleId)) {
    throw new AppError('System roles cannot be deleted', 400, 'VALIDATION_ERROR');
  }

  const role = await db<CmsRoleRow>('cms_roles').where({ id: roleId }).first();
  if (!role) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }

  const userCount = await db('cms_users').where({ role: roleId }).count('* as count').first();
  const assigned = Number(userCount?.count ?? 0);
  if (assigned > 0) {
    throw new AppError(
      `Cannot delete role assigned to ${assigned} user${assigned === 1 ? '' : 's'}`,
      409,
      'ROLE_IN_USE',
    );
  }

  await db('cms_roles').where({ id: roleId }).delete();
}
