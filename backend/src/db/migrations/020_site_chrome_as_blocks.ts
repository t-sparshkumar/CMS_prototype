import type { Knex } from 'knex';
import {
  ensureBlockCollectionsModule,
  ensureSiteChromeBlockCollections,
} from '../../services/block-collections.service.js';

const HOME_PAGE_SECTIONS = [
  { collection: 'site_header', label: 'Home Site Header', sort: 1 },
  { collection: 'hero_carousels', label: 'Home Hero Carousel', sort: 2 },
  { collection: 'service_tiles', label: 'Home Service Tiles', sort: 3 },
  { collection: 'promo_grids', label: 'Home Promo Grid', sort: 4 },
  { collection: 'site_footer', label: 'Home Site Footer', sort: 5 },
] as const;

/**
 * Promote site_header/site_footer to regular page block collections and wire them into the home page.
 */
export async function up(knex: Knex): Promise<void> {
  await ensureBlockCollectionsModule(knex);
  await ensureSiteChromeBlockCollections(knex);

  const hasJunction = await knex.schema.hasTable('pages_m2a');
  if (!hasJunction) {
    return;
  }

  const homePage = await knex('pages').where({ slug: 'home' }).first<{ id: string }>();
  if (!homePage) {
    return;
  }

  const refs: Array<{ collection: string; item: string; sort: number }> = [];

  for (const section of HOME_PAGE_SECTIONS) {
    const item = await knex(section.collection).where({ label: section.label }).first<{ id: string }>();
    if (item) {
      refs.push({
        collection: section.collection,
        item: String(item.id),
        sort: section.sort,
      });
    }
  }

  if (refs.length === 0) {
    return;
  }

  await knex('pages_m2a').where({ pages_id: homePage.id }).delete();
  await knex('pages_m2a').insert(
    refs.map((ref) => ({
      pages_id: homePage.id,
      collection: ref.collection,
      item: ref.item,
      sort: ref.sort,
    })),
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex('cms_collections')
    .whereIn('collection', ['site_header', 'site_footer'])
    .update({ singleton: true });
}
