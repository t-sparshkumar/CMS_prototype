import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasDisplayName = await knex.schema.hasColumn('cms_collections', 'display_name');
  await knex.schema.alterTable('cms_collections', (table) => {
    table.string('color', 32).nullable();
    table.text('display_template').nullable();
    if (!hasDisplayName) {
      table.string('display_name', 255).nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.dropColumn('color');
    table.dropColumn('display_template');
  });
}
