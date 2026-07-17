import type { Knex } from 'knex';

/**
 * Remove per-page global layout toggle; global_layout remains a regular singleton collection.
 */
export async function up(knex: Knex): Promise<void> {
  await knex('cms_fields').where({ collection: 'pages', field: 'use_global_layout' }).delete();

  const hasColumn = await knex.schema.hasColumn('pages', 'use_global_layout');
  if (hasColumn) {
    await knex.schema.alterTable('pages', (table) => {
      table.dropColumn('use_global_layout');
    });
  }

  await knex('cms_collections')
    .where({ collection: 'global_layout' })
    .update({
      note: 'Site header and footer configuration (singleton)',
    });
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('pages', 'use_global_layout');
  if (!hasColumn) {
    await knex.schema.alterTable('pages', (table) => {
      table.boolean('use_global_layout').notNullable().defaultTo(true);
    });
  }

  const existing = await knex('cms_fields').where({ collection: 'pages', field: 'use_global_layout' }).first();
  if (!existing) {
    await knex('cms_fields').insert({
      collection: 'pages',
      field: 'use_global_layout',
      type: 'boolean',
      interface: 'toggle',
      default_value: 'true',
      note: 'When enabled, this page uses the global header and footer from Global Layout.',
      sort: 14,
      width: 12,
      required: false,
      readonly: false,
      hidden: false,
      nullable: false,
      searchable: false,
    });
  }

  await knex('cms_collections')
    .where({ collection: 'global_layout' })
    .update({
      note: 'Global header and footer applied to all pages by default',
    });
}
