import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import { ADMIN_ROLE_ID, ADMIN_USER_ID, PUBLIC_ROLE_ID } from '../../constants/roles.js';

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

/**
 * Seed default roles, admin user, and wildcard Administrator permissions.
 * Idempotent — safe to run multiple times.
 */
export async function seed(knex: Knex): Promise<void> {
  const existingAdminRole = await knex('cms_roles').where({ id: ADMIN_ROLE_ID }).first();

  if (!existingAdminRole) {
    await knex('cms_roles').insert([
      {
        id: ADMIN_ROLE_ID,
        name: 'Administrator',
        description: 'Full system access',
        icon: 'verified_user',
        admin_access: true,
        app_access: true,
      },
      {
        id: PUBLIC_ROLE_ID,
        name: 'Public',
        description: 'Unauthenticated API access',
        icon: 'public',
        admin_access: false,
        app_access: false,
      },
    ]);
  }

  const existingAdminUser = await knex('cms_users').where({ email: 'admin@example.com' }).first();

  if (!existingAdminUser) {
    const passwordHash = await bcrypt.hash('admin', 12);
    await knex('cms_users').insert({
      id: ADMIN_USER_ID,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      password: passwordHash,
      role: ADMIN_ROLE_ID,
      status: 'active',
    });
  }

  for (const action of PERMISSION_ACTIONS) {
    const existingPermission = await knex('cms_permissions')
      .where({ role: ADMIN_ROLE_ID, collection: '*', action })
      .first();

    if (!existingPermission) {
      await knex('cms_permissions').insert({
        role: ADMIN_ROLE_ID,
        collection: '*',
        action,
        fields: JSON.stringify(['*']),
      });
    }
  }

  const existingPublicRead = await knex('cms_permissions')
    .where({ role: PUBLIC_ROLE_ID, collection: 'articles', action: 'read' })
    .first();

  if (!existingPublicRead) {
    await knex('cms_permissions').insert({
      role: PUBLIC_ROLE_ID,
      collection: 'articles',
      action: 'read',
      fields: JSON.stringify(['id', 'title', 'date_created']),
      permissions: JSON.stringify({ filter: {} }),
    });
  }
}
