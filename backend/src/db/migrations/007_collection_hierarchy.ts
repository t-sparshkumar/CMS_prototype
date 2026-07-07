import type { Knex } from 'knex';

/**
 * Add hierarchy fields for nested collection navigation (Directus-style groups).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.string('parent', 255).nullable().references('collection').inTable('cms_collections').onDelete('SET NULL');
    table.boolean('is_group').notNullable().defaultTo(false);
    table.integer('sort').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.dropColumn('sort');
    table.dropColumn('is_group');
    table.dropColumn('parent');
  });
}
