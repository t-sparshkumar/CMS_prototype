import type { Knex } from 'knex';

/**
 * Revert collection hierarchy columns and remove demo group rows.
 */
export async function up(knex: Knex): Promise<void> {
  const hasParent = await knex.schema.hasColumn('cms_collections', 'parent');
  if (!hasParent) {
    return;
  }

  await knex('cms_collections').whereIn('collection', ['pages_group', 'page_components']).delete();

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
