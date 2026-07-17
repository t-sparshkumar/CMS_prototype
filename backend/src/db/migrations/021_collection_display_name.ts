import type { Knex } from 'knex';

const BLOCK_DISPLAY_NAMES: Record<string, string> = {
  site_header: 'Site Header',
  site_footer: 'Site Footer',
  hero_carousels: 'Hero Carousel',
  service_tiles: 'Service Tiles',
  promo_grids: 'Promo Grid',
  hero_banners: 'Hero Banner',
  paragraphs: 'Paragraph',
  info_boxes: 'Info Box',
};

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.string('display_name', 255).nullable();
  });

  for (const [collection, displayName] of Object.entries(BLOCK_DISPLAY_NAMES)) {
    await knex('cms_collections').where({ collection }).update({ display_name: displayName });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cms_collections', (table) => {
    table.dropColumn('display_name');
  });
}
