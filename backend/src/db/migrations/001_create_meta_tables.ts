import type { Knex } from 'knex';

/**
 * Create all CMS meta tables for schema, auth, files, and activity tracking.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cms_roles', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable().unique();
    table.text('description').nullable();
    table.string('icon', 64).nullable();
    table.boolean('admin_access').notNullable().defaultTo(false);
    table.boolean('app_access').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('cms_users', (table) => {
    table.uuid('id').primary();
    table.string('first_name', 255).notNullable();
    table.string('last_name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255).notNullable();
    table.uuid('role').notNullable().references('id').inTable('cms_roles').onDelete('RESTRICT');
    table.string('token', 512).nullable();
    table.dateTime('last_access').nullable();
    table.string('status', 32).notNullable().defaultTo('active');
  });

  await knex.schema.createTable('cms_collections', (table) => {
    table.string('collection', 255).primary();
    table.string('icon', 64).nullable();
    table.text('note').nullable();
    table.boolean('singleton').notNullable().defaultTo(false);
    table.string('sort_field', 255).nullable();
    table.string('archive_field', 255).nullable();
    table.string('archive_value', 255).nullable();
    table.string('unarchive_value', 255).nullable();
  });

  await knex.schema.createTable('cms_fields', (table) => {
    table.increments('id').primary();
    table
      .string('collection', 255)
      .notNullable()
      .references('collection')
      .inTable('cms_collections')
      .onDelete('CASCADE');
    table.string('field', 255).notNullable();
    table.string('type', 64).notNullable();
    table.string('special', 64).nullable();
    table.string('interface', 64).notNullable();
    table.json('options').nullable();
    table.string('display', 64).nullable();
    table.json('display_options').nullable();
    table.boolean('readonly').notNullable().defaultTo(false);
    table.boolean('hidden').notNullable().defaultTo(false);
    table.integer('sort').notNullable().defaultTo(0);
    table.integer('width').notNullable().defaultTo(12);
    table.boolean('required').notNullable().defaultTo(false);
    table.string('group', 255).nullable();
    table.json('conditions').nullable();
    table.text('note').nullable();
    table.text('default_value').nullable();
    table.unique(['collection', 'field']);
    table.index(['collection']);
  });

  await knex.schema.createTable('cms_relations', (table) => {
    table.increments('id').primary();
    table.string('many_collection', 255).notNullable();
    table.string('many_field', 255).notNullable();
    table.string('one_collection', 255).notNullable();
    table.string('one_field', 255).notNullable();
    table.string('junction_collection', 255).nullable();
    table.string('sort_field', 255).nullable();
  });

  await knex.schema.createTable('cms_permissions', (table) => {
    table.increments('id').primary();
    table.uuid('role').notNullable().references('id').inTable('cms_roles').onDelete('CASCADE');
    table.string('collection', 255).notNullable();
    table.enum('action', ['create', 'read', 'update', 'delete']).notNullable();
    table.json('permissions').nullable();
    table.json('validation').nullable();
    table.json('presets').nullable();
    table.json('fields').nullable();
    table.index(['role', 'collection', 'action']);
  });

  await knex.schema.createTable('cms_files', (table) => {
    table.uuid('id').primary();
    table.string('storage', 64).notNullable().defaultTo('local');
    table.string('filename_disk', 512).notNullable();
    table.string('filename_download', 512).notNullable();
    table.string('title', 255).nullable();
    table.string('type', 128).nullable();
    table.string('folder', 255).nullable();
    table.uuid('uploaded_by').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
    table.dateTime('uploaded_on').notNullable();
    table.integer('filesize').notNullable();
    table.integer('width').nullable();
    table.integer('height').nullable();
  });

  await knex.schema.createTable('cms_activity', (table) => {
    table.increments('id').primary();
    table.string('action', 64).notNullable();
    table.uuid('user').nullable().references('id').inTable('cms_users').onDelete('SET NULL');
    table.dateTime('timestamp').notNullable();
    table.string('ip', 64).nullable();
    table.string('user_agent', 512).nullable();
    table.string('collection', 255).nullable();
    table.string('item', 255).nullable();
    table.text('comment').nullable();
  });

  await knex.schema.createTable('cms_revisions', (table) => {
    table.increments('id').primary();
    table
      .integer('activity')
      .notNullable()
      .references('id')
      .inTable('cms_activity')
      .onDelete('CASCADE');
    table.string('collection', 255).notNullable();
    table.string('item', 255).notNullable();
    table.json('data').notNullable();
    table.json('delta').nullable();
    table.integer('parent').nullable();
  });

  await knex.schema.createTable('cms_sessions', (table) => {
    table.string('token', 512).primary();
    table.uuid('user').notNullable().references('id').inTable('cms_users').onDelete('CASCADE');
    table.dateTime('expires').notNullable();
    table.string('ip', 64).nullable();
    table.string('user_agent', 512).nullable();
    table.index(['user']);
    table.index(['expires']);
  });
}

/**
 * Drop all CMS meta tables in reverse dependency order.
 */
export async function down(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('cms_sessions');
    await trx.schema.dropTableIfExists('cms_revisions');
    await trx.schema.dropTableIfExists('cms_activity');
    await trx.schema.dropTableIfExists('cms_files');
    await trx.schema.dropTableIfExists('cms_permissions');
    await trx.schema.dropTableIfExists('cms_relations');
    await trx.schema.dropTableIfExists('cms_fields');
    await trx.schema.dropTableIfExists('cms_collections');
    await trx.schema.dropTableIfExists('cms_users');
    await trx.schema.dropTableIfExists('cms_roles');
  });
}
