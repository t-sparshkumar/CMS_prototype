import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errorHandler.js';
import type { CmsUserRow } from '../types/user.js';

export interface UserListEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_name: string | null;
  status: string;
  last_access: string | null;
}

export interface CreateUserInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  status?: string;
}

export interface UpdateUserInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  role?: string;
  status?: string;
}

/**
 * List all CMS users with role names.
 */
export async function listUsers(db: Knex): Promise<UserListEntry[]> {
  const rows = await db('cms_users as u')
    .leftJoin('cms_roles as r', 'u.role', 'r.id')
    .select(
      'u.id',
      'u.first_name',
      'u.last_name',
      'u.email',
      'u.role',
      'u.status',
      'u.last_access',
      'r.name as role_name',
    )
    .orderBy('u.first_name', 'asc');

  return rows.map((row) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role,
    role_name: row.role_name ?? null,
    status: row.status,
    last_access: row.last_access
      ? row.last_access instanceof Date
        ? row.last_access.toISOString()
        : new Date(row.last_access).toISOString()
      : null,
  }));
}

/**
 * Create a new CMS user.
 */
export async function createUser(db: Knex, input: CreateUserInput): Promise<UserListEntry> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.first_name.trim() || !input.last_name.trim() || !input.password) {
    throw new AppError('Name, email, and password are required', 400, 'VALIDATION_ERROR');
  }

  const existing = await db<CmsUserRow>('cms_users').where({ email }).first();
  if (existing) {
    throw new AppError('A user with this email already exists', 409, 'USER_EXISTS');
  }

  const role = await db('cms_roles').where({ id: input.role }).first();
  if (!role) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const id = randomUUID();

  await db('cms_users').insert({
    id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email,
    password: passwordHash,
    role: input.role,
    status: input.status ?? 'active',
  });

  const users = await listUsers(db);
  const created = users.find((u) => u.id === id);
  if (!created) {
    throw new AppError('Failed to create user', 500, 'INTERNAL_ERROR');
  }
  return created;
}

/**
 * Update an existing CMS user.
 */
export async function updateUser(db: Knex, userId: string, input: UpdateUserInput): Promise<UserListEntry> {
  const existing = await db<CmsUserRow>('cms_users').where({ id: userId }).first();
  if (!existing) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const updates: Partial<CmsUserRow> = {};

  if (input.first_name !== undefined) {
    updates.first_name = input.first_name.trim();
  }
  if (input.last_name !== undefined) {
    updates.last_name = input.last_name.trim();
  }
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const duplicate = await db<CmsUserRow>('cms_users').where({ email }).whereNot({ id: userId }).first();
    if (duplicate) {
      throw new AppError('A user with this email already exists', 409, 'USER_EXISTS');
    }
    updates.email = email;
  }
  if (input.role !== undefined) {
    const role = await db('cms_roles').where({ id: input.role }).first();
    if (!role) {
      throw new AppError('Role not found', 404, 'NOT_FOUND');
    }
    updates.role = input.role;
  }
  if (input.status !== undefined) {
    updates.status = input.status;
  }
  if (input.password) {
    updates.password = await bcrypt.hash(input.password, 12);
  }

  if (Object.keys(updates).length > 0) {
    await db('cms_users').where({ id: userId }).update(updates);
  }

  const users = await listUsers(db);
  const updated = users.find((u) => u.id === userId);
  if (!updated) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return updated;
}

/**
 * Delete a CMS user. Prevents deleting self or the last administrator.
 */
export async function deleteUser(db: Knex, userId: string, currentUserId: string): Promise<void> {
  const existing = await db<CmsUserRow>('cms_users').where({ id: userId }).first();
  if (!existing) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (userId === currentUserId) {
    throw new AppError('You cannot delete your own account', 400, 'VALIDATION_ERROR');
  }

  const role = await db('cms_roles').where({ id: existing.role }).first();
  if (role?.admin_access) {
    const adminRoleIds: string[] = await db('cms_roles').where({ admin_access: true }).pluck('id');
    const adminCountRow = await db('cms_users').whereIn('role', adminRoleIds).count('* as count').first();
    const adminCount = Number(adminCountRow?.count ?? 0);
    if (adminCount <= 1) {
      throw new AppError('Cannot delete the last administrator', 400, 'VALIDATION_ERROR');
    }
  }

  await db('cms_users').where({ id: userId }).delete();
}
