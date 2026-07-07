import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('cms_collections', 'activity_tracking');
  if (!hasColumn) {
    await knex.schema.alterTable('cms_collections', (table) => {
      table.boolean('activity_tracking').notNullable().defaultTo(true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('cms_collections', 'activity_tracking');
  if (hasColumn) {
    await knex.schema.alterTable('cms_collections', (table) => {
      table.dropColumn('activity_tracking');
    });
  }
}
