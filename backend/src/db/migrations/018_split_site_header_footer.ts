import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import {
  MANAGE_CONTENT_POLICY_ID,
  READ_ALL_DATA_POLICY_ID,
} from '../../constants/policies.js';
import type { PolicyRule } from '../../types/policy.js';
import { deleteCollection } from '../../services/collections.service.js';
import { syncRolePermissionsFromPolicies } from '../../services/policies.service.js';
import { ensureBlockCollectionsModule } from '../../services/block-collections.service.js';

const SITE_COLLECTIONS = ['site_header', 'site_footer'] as const;

const COLLECTION_SORT: Record<string, number> = {
  site_header: 21,
  site_footer: 22,
  page_groups: 23,
};

async function patchPolicies(knex: Knex): Promise<void> {
  const policyIds = [READ_ALL_DATA_POLICY_ID, MANAGE_CONTENT_POLICY_ID];

  for (const policyId of policyIds) {
    const policy = await knex('cms_policies').where({ id: policyId }).first<{ rules: string }>();
    if (!policy) continue;

    const rules = (JSON.parse(policy.rules) as PolicyRule[]).filter(
      (rule) => rule.collection !== 'global_layout',
    );
    const existing = new Set(rules.map((rule) => `${rule.collection}:${rule.action}`));

    for (const collection of SITE_COLLECTIONS) {
      for (const action of ['read', 'create', 'update'] as const) {
        const key = `${collection}:${action}`;
        if (!existing.has(key)) {
          rules.push({ collection, action, fields: '*' });
        }
      }
    }

    await knex('cms_policies').where({ id: policyId }).update({ rules: JSON.stringify(rules) });
  }

  const rolePolicies = await knex('cms_role_policies').select('role');
  const roles = [...new Set(rolePolicies.map((row) => String(row.role)))];
  for (const role of roles) {
    await syncRolePermissionsFromPolicies(knex, role);
  }
}

async function migrateLegacyLayout(knex: Knex): Promise<void> {
  const hasLegacyTable = await knex.schema.hasTable('global_layout');
  if (!hasLegacyTable) {
    return;
  }

  const legacy = await knex('global_layout').first<Record<string, unknown>>();
  if (!legacy) {
    return;
  }

  const now = new Date().toISOString();
  const headerPayload = {
    logo: legacy.header_logo ?? null,
    title: legacy.header_title ?? null,
    nav_links: legacy.header_nav_links ?? null,
    cta_label: legacy.header_cta_label ?? null,
    cta_url: legacy.header_cta_url ?? null,
    date_created: legacy.date_created ?? now,
    date_updated: legacy.date_updated ?? now,
    user_created: legacy.user_created ?? null,
    user_updated: legacy.user_updated ?? null,
  };

  const footerPayload = {
    logo: legacy.footer_logo ?? null,
    title: legacy.header_title ?? null,
    description: legacy.footer_description ?? null,
    links: legacy.footer_links ?? null,
    copyright: legacy.footer_copyright ?? null,
    date_created: legacy.date_created ?? now,
    date_updated: legacy.date_updated ?? now,
    user_created: legacy.user_created ?? null,
    user_updated: legacy.user_updated ?? null,
  };

  const existingHeader = await knex('site_header').first();
  if (existingHeader) {
    await knex('site_header').where({ id: existingHeader.id }).update(headerPayload);
  } else {
    await knex('site_header').insert({ id: randomUUID(), ...headerPayload });
  }

  const existingFooter = await knex('site_footer').first();
  if (existingFooter) {
    await knex('site_footer').where({ id: existingFooter.id }).update(footerPayload);
  } else {
    await knex('site_footer').insert({ id: randomUUID(), ...footerPayload });
  }
}

async function removeGlobalLayout(knex: Knex): Promise<void> {
  const exists = await knex('cms_collections').where({ collection: 'global_layout' }).first();
  if (!exists) {
    if (await knex.schema.hasTable('global_layout')) {
      await knex.schema.dropTable('global_layout');
    }
    return;
  }

  await deleteCollection(knex, 'global_layout');
}

/**
 * Split global_layout into site_header and site_footer singleton collections.
 */
export async function up(knex: Knex): Promise<void> {
  await ensureBlockCollectionsModule(knex);
  await migrateLegacyLayout(knex);
  await removeGlobalLayout(knex);
  await patchPolicies(knex);

  for (const [collection, sort] of Object.entries(COLLECTION_SORT)) {
    await knex('cms_collections').where({ collection }).update({ parent: null, hidden: false, sort });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Non-reversible without re-creating global_layout manually.
  await knex('cms_collections').whereIn('collection', SITE_COLLECTIONS).delete();
  if (await knex.schema.hasTable('site_header')) {
    await knex.schema.dropTable('site_header');
  }
  if (await knex.schema.hasTable('site_footer')) {
    await knex.schema.dropTable('site_footer');
  }
}
