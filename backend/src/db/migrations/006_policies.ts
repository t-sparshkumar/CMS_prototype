import type { Knex } from 'knex';

/**
 * Create policy tables and role-to-policy assignments.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cms_policies', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable().unique();
    table.text('description').nullable();
    table.string('icon', 64).nullable();
    table.json('rules').notNullable();
    table.boolean('is_system').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('cms_role_policies', (table) => {
    table.uuid('role').notNullable().references('id').inTable('cms_roles').onDelete('CASCADE');
    table.uuid('policy').notNullable().references('id').inTable('cms_policies').onDelete('CASCADE');
    table.primary(['role', 'policy']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cms_role_policies');
  await knex.schema.dropTableIfExists('cms_policies');
}
