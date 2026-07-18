import type { Knex } from 'knex';
import {
  MANAGE_CONTENT_POLICY_ID,
  READ_ALL_DATA_POLICY_ID,
} from '../../constants/policies.js';
import type { PolicyRule } from '../../types/policy.js';
import { syncRolePermissionsFromPolicies } from '../../services/policies.service.js';
import { ensureBlockCollectionsModule } from '../../services/block-collections.service.js';

const BLOCK_CONTENT_COLLECTIONS = [
  'page_components',
  'hero_banners',
  'hero_carousels',
  'service_tiles',
  'promo_grids',
  'paragraphs',
  'info_boxes',
];

async function patchExistingContentPolicies(knex: Knex): Promise<void> {
  const patches: Array<{ id: string; actions: PolicyRule['action'][] }> = [
    { id: READ_ALL_DATA_POLICY_ID, actions: ['read'] },
    { id: MANAGE_CONTENT_POLICY_ID, actions: ['create', 'read', 'update'] },
  ];

  for (const { id, actions } of patches) {
    const policy = await knex('cms_policies').where({ id }).first<{ rules: string }>();
    if (!policy) continue;

    const rules = JSON.parse(policy.rules) as PolicyRule[];
    const existing = new Set(rules.map((rule) => `${rule.collection}:${rule.action}`));

    for (const collection of BLOCK_CONTENT_COLLECTIONS) {
      for (const action of actions) {
        const key = `${collection}:${action}`;
        if (!existing.has(key)) {
          rules.push({ collection, action, fields: '*' });
        }
      }
    }

    await knex('cms_policies').where({ id }).update({ rules: JSON.stringify(rules) });
  }

  const rolePolicies = await knex('cms_role_policies').select('role');
  const roles = [...new Set(rolePolicies.map((row) => String(row.role)))];
  for (const role of roles) {
    await syncRolePermissionsFromPolicies(knex, role);
  }
}

async function ensureDisplayNameColumn(knex: Knex): Promise<void> {
  const hasDisplayName = await knex.schema.hasColumn('cms_collections', 'display_name');
  if (!hasDisplayName) {
    await knex.schema.alterTable('cms_collections', (table) => {
      table.string('display_name', 255).nullable();
    });
  }
}

/**
 * Bootstrap page_components block collections and pages.sections M2A field.
 */
export async function up(knex: Knex): Promise<void> {
  await ensureDisplayNameColumn(knex);
  await ensureBlockCollectionsModule(knex);
  await patchExistingContentPolicies(knex);
}

export async function down(knex: Knex): Promise<void> {
  await knex('cms_fields').where({ collection: 'pages', field: 'sections' }).delete();
  await knex('cms_relations').where({ many_collection: 'pages', many_field: 'sections' }).delete();

  const junctionTable = 'pages_m2a';
  const hasJunction = await knex.schema.hasTable(junctionTable);
  if (hasJunction) {
    await knex.schema.dropTable(junctionTable);
    await knex('cms_collections').where({ collection: junctionTable }).delete();
  }

  for (const collection of [
    'hero_banners',
    'hero_carousels',
    'service_tiles',
    'promo_grids',
    'paragraphs',
    'info_boxes',
  ]) {
    const hasTable = await knex.schema.hasTable(collection);
    if (hasTable) {
      await knex.schema.dropTable(collection);
    }
    await knex('cms_fields').where({ collection }).delete();
    await knex('cms_collections').where({ collection }).delete();
  }

  await knex('cms_collections').where({ collection: 'page_components' }).delete();

  await knex('cms_collections')
    .where({ collection: 'site_components' })
    .update({ hidden: false });
}
