import type { Knex } from 'knex';

/**
 * One-time revert of the abandoned collection-hierarchy experiment (007 → 008 → 009).
 *
 * Removes hierarchy columns from cms_collections. The original delete used typo names
 * (`pages_group`, `page_components`) and was a no-op. Real website collections are
 * `page_groups` and `site_components` (see website.service.ts) — only delete rows
 * that were incorrectly marked as navigation groups during the experiment.
 */
export async function up(knex: Knex): Promise<void> {
  const hasParent = await knex.schema.hasColumn('cms_collections', 'parent');
  if (!hasParent) {
    return;
  }

  // Clean up typo names from the original experiment (harmless on most DBs).
  await knex('cms_collections').whereIn('collection', ['pages_group', 'page_components']).delete();

  // Only remove hierarchy demo groups; leave real content collections intact.
  await knex('cms_collections')
    .whereIn('collection', ['page_groups', 'site_components'])
    .where({ is_group: true })
    .delete();

  await knex.schema.alterTable('cms_collections', (table) => {
    table.dropColumn('sort');
    table.dropColumn('is_group');
    table.dropColumn('parent');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.string('parent', 255).nullable().references('collection').inTable('cms_collections').onDelete('SET NULL');
    table.boolean('is_group').notNullable().defaultTo(false);
    table.integer('sort').notNullable().defaultTo(0);
  });
}
