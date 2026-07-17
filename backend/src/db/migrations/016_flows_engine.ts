import type { Knex } from 'knex';

/**
 * Automation & workflow engine (Flows) — flows, operations graph, execution logs.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cms_flows', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.string('status', 16).notNullable().defaultTo('inactive');
    table.string('trigger_type', 32).notNullable();
    table.json('trigger_options').nullable();
    table.string('accountability', 32).notNullable().defaultTo('all');
    table.uuid('operation').nullable();
    table.timestamp('date_created').notNullable().defaultTo(knex.fn.now());
    table.timestamp('date_updated').notNullable().defaultTo(knex.fn.now());
    table.uuid('user_created').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
    table.uuid('user_updated').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
  });

  await knex.schema.createTable('cms_flow_operations', (table) => {
    table.uuid('id').primary();
    table.uuid('flow').notNullable().references('id').inTable('cms_flows').onDelete('CASCADE');
    table.string('name', 255).nullable();
    table.string('key', 64).notNullable();
    table.string('type', 64).notNullable();
    table.json('options').nullable();
    table.uuid('resolve').nullable();
    table.uuid('reject').nullable();
    table.integer('position_x').notNullable().defaultTo(1);
    table.integer('position_y').notNullable().defaultTo(1);
    table.timestamp('date_created').notNullable().defaultTo(knex.fn.now());
    table.timestamp('date_updated').notNullable().defaultTo(knex.fn.now());
    table.unique(['flow', 'key']);
  });

  await knex.schema.createTable('cms_flow_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('flow').notNullable().references('id').inTable('cms_flows').onDelete('CASCADE');
    table.string('status', 16).notNullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('finished_at').nullable();
    table.integer('execution_time').nullable();
    table.json('trigger_log').nullable();
    table.json('operations_log').nullable();
  });

  await knex.schema.alterTable('cms_flows', (table) => {
    table
      .foreign('operation')
      .references('id')
      .inTable('cms_flow_operations')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_flows', (table) => {
    table.dropForeign(['operation']);
  });
  await knex.schema.dropTableIfExists('cms_flow_logs');
  await knex.schema.dropTableIfExists('cms_flow_operations');
  await knex.schema.dropTableIfExists('cms_flows');
}
