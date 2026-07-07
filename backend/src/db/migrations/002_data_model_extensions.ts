import type { Knex } from 'knex';

/**
 * Extend meta tables for Directus-style data model features.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.boolean('hidden').notNullable().defaultTo(false);
    table.boolean('system').notNullable().defaultTo(false);
  });

  await knex.schema.alterTable('cms_fields', (table) => {
    table.boolean('unique').notNullable().defaultTo(false);
    table.boolean('nullable').notNullable().defaultTo(true);
    table.boolean('is_indexed').notNullable().defaultTo(false);
    table.boolean('searchable').notNullable().defaultTo(true);
    table.json('validation').nullable();
  });

  await knex.schema.alterTable('cms_relations', (table) => {
    table.string('schema_on_delete', 32).nullable().defaultTo('SET NULL');
  });

  // Mark existing auto-generated junction tables
  await knex('cms_collections')
    .where('note', 'Auto-generated junction table')
    .update({ hidden: true, system: true });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_relations', (table) => {
    table.dropColumn('schema_on_delete');
  });

  await knex.schema.alterTable('cms_fields', (table) => {
    table.dropColumn('validation');
    table.dropColumn('searchable');
    table.dropColumn('is_indexed');
    table.dropColumn('nullable');
    table.dropColumn('unique');
  });

  await knex.schema.alterTable('cms_collections', (table) => {
    table.dropColumn('system');
    table.dropColumn('hidden');
  });
}
