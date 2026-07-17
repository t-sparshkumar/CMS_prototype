import type { Knex } from 'knex';
import {
  MANAGE_CONTENT_POLICY_ID,
  READ_ALL_DATA_POLICY_ID,
} from '../../constants/policies.js';
import type { PolicyRule } from '../../types/policy.js';
import { syncRolePermissionsFromPolicies } from '../../services/policies.service.js';
import { ensureLanguagesCollection, LANGUAGES_COLLECTION } from '../../services/languages.service.js';

async function patchPolicies(knex: Knex): Promise<void> {
  const policyIds = [READ_ALL_DATA_POLICY_ID, MANAGE_CONTENT_POLICY_ID];

  for (const policyId of policyIds) {
    const policy = await knex('cms_policies').where({ id: policyId }).first<{ rules: string }>();
    if (!policy) continue;

    const rules = JSON.parse(policy.rules) as PolicyRule[];
    const existing = new Set(rules.map((rule) => `${rule.collection}:${rule.action}`));

    for (const action of ['read', 'create', 'update', 'delete'] as const) {
      const key = `${LANGUAGES_COLLECTION}:${action}`;
      if (!existing.has(key)) {
        rules.push({ collection: LANGUAGES_COLLECTION, action, fields: '*' });
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

/**
 * Create the global languages registry collection for translations.
 */
export async function up(knex: Knex): Promise<void> {
  await ensureLanguagesCollection(knex);
  await patchPolicies(knex);
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable(LANGUAGES_COLLECTION)) {
    await knex.schema.dropTable(LANGUAGES_COLLECTION);
  }
  await knex('cms_collections').where({ collection: LANGUAGES_COLLECTION }).delete();
}
