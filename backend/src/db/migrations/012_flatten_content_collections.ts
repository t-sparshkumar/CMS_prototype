import type { Knex } from 'knex';
import { PAGE_BLOCK_COLLECTIONS } from '../../services/block-collections.service.js';

const WEBSITE_ROOT_COLLECTIONS = ['pages', 'global_layout', 'page_groups'] as const;

const BLOCK_SORT: Record<string, number> = {
  hero_banners: 10,
  hero_carousels: 11,
  service_tiles: 12,
  promo_grids: 13,
  paragraphs: 14,
  info_boxes: 15,
};

const WEBSITE_SORT: Record<string, number> = {
  pages: 20,
  global_layout: 21,
  page_groups: 22,
};

/**
 * Flatten page block collections to Content root (no page_components group).
 */
export async function up(knex: Knex): Promise<void> {
  await knex('cms_collections')
    .whereIn('collection', [...PAGE_BLOCK_COLLECTIONS])
    .update({ parent: null, hidden: false });

  await knex('cms_collections').where({ collection: 'page_components' }).delete();

  await knex('cms_collections')
    .whereIn('collection', [...WEBSITE_ROOT_COLLECTIONS])
    .update({ parent: null, hidden: false });

  for (const [collection, sort] of Object.entries(BLOCK_SORT)) {
    await knex('cms_collections').where({ collection }).update({ sort });
  }

  for (const [collection, sort] of Object.entries(WEBSITE_SORT)) {
    await knex('cms_collections').where({ collection }).update({ sort });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex('cms_collections').where({ collection: 'page_components' }).first();
  if (!exists) {
    await knex('cms_collections').insert({
      collection: 'page_components',
      icon: 'folder',
      note: 'Reusable page block instances',
      is_group: true,
      sort: 5,
      hidden: false,
    });
  }

  await knex('cms_collections')
    .whereIn('collection', [...PAGE_BLOCK_COLLECTIONS])
    .update({ parent: 'page_components' });
}
