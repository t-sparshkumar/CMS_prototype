import type { Knex } from 'knex';

/**
 * Add asset folders table and optional description on files.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cms_folders', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.uuid('parent').nullable().references('id').inTable('cms_folders').onDelete('CASCADE');
    table.dateTime('created_on').notNullable();
    table.index(['parent']);
  });

  const hasDescription = await knex.schema.hasColumn('cms_files', 'description');
  if (!hasDescription) {
    await knex.schema.alterTable('cms_files', (table) => {
      table.text('description').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasDescription = await knex.schema.hasColumn('cms_files', 'description');
  if (hasDescription) {
    await knex.schema.alterTable('cms_files', (table) => {
      table.dropColumn('description');
    });
  }

  await knex.schema.dropTableIfExists('cms_folders');
}
