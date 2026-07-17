import type { Knex } from 'knex';
import {
  FULL_ACCESS_POLICY_ID,
  MANAGE_CONTENT_POLICY_ID,
  READ_ALL_DATA_POLICY_ID,
  READ_PUBLIC_PAGES_POLICY_ID,
} from '../../constants/policies.js';
import { PUBLIC_ROLE_ID } from '../../constants/roles.js';
import type { PolicyRule } from '../../types/policy.js';
import { syncRolePermissionsFromPolicies } from '../../services/policies.service.js';

const CONTENT_COLLECTIONS = [
  'pages',
  'page_groups',
  'site_components',
  'site_header',
  'site_footer',
  'languages',
  'articles',
  'hero_banners',
  'hero_carousels',
  'service_tiles',
  'promo_grids',
  'paragraphs',
  'info_boxes',
];

function contentRules(actions: Array<PolicyRule['action']>): PolicyRule[] {
  return CONTENT_COLLECTIONS.flatMap((collection) =>
    actions.map((action) => ({ collection, action, fields: '*' as const })),
  );
}

/**
 * Seed default permission policies and assign Public role baseline access.
 */
export async function seed(knex: Knex): Promise<void> {
  const policies = [
    {
      id: FULL_ACCESS_POLICY_ID,
      name: 'Full Access Policy',
      description: 'Grant complete administrative rights to all collections.',
      icon: 'shield',
      is_system: true,
      rules: (['create', 'read', 'update', 'delete'] as const).map((action) => ({
        collection: '*',
        action,
        fields: '*',
      })),
    },
    {
      id: READ_ALL_DATA_POLICY_ID,
      name: 'Read All Data Policy',
      description: 'Allows reading all content pages and layout.',
      icon: 'content',
      is_system: true,
      rules: contentRules(['read']),
    },
    {
      id: MANAGE_CONTENT_POLICY_ID,
      name: 'Manage Content Policy',
      description: 'Allows creating and editing pages, header, and footer.',
      icon: 'pages',
      is_system: true,
      rules: contentRules(['create', 'read', 'update']),
    },
    {
      id: READ_PUBLIC_PAGES_POLICY_ID,
      name: 'Read Public Pages Policy',
      description: 'Can only view published pages and public content.',
      icon: 'external',
      is_system: true,
      rules: [
        { collection: 'pages', action: 'read', fields: '*' },
        { collection: 'articles', action: 'read', fields: '*' },
      ],
    },
  ];

  for (const policy of policies) {
    const existing = await knex('cms_policies').where({ id: policy.id }).first();
    if (!existing) {
      await knex('cms_policies').insert({
        ...policy,
        rules: JSON.stringify(policy.rules),
      });
    }
  }

  const publicAssignment = await knex('cms_role_policies')
    .where({ role: PUBLIC_ROLE_ID, policy: READ_PUBLIC_PAGES_POLICY_ID })
    .first();

  if (!publicAssignment) {
    await knex('cms_role_policies').insert({
      role: PUBLIC_ROLE_ID,
      policy: READ_PUBLIC_PAGES_POLICY_ID,
    });
    await syncRolePermissionsFromPolicies(knex, PUBLIC_ROLE_ID);
  }
}
