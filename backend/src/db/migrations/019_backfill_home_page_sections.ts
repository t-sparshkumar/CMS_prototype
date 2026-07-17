import type { Knex } from 'knex';

const HOME_SECTIONS = [
  { collection: 'hero_carousels', label: 'Home Hero Carousel', sort: 1 },
  { collection: 'service_tiles', label: 'Home Service Tiles', sort: 2 },
  { collection: 'promo_grids', label: 'Home Promo Grid', sort: 3 },
] as const;

/**
 * Backfill Liberty homepage M2A sections when block items exist but pages_m2a is empty.
 */
export async function up(knex: Knex): Promise<void> {
  const hasJunction = await knex.schema.hasTable('pages_m2a');
  if (!hasJunction) {
    return;
  }

  const homePage = await knex('pages').where({ slug: 'home' }).first<{ id: string }>();
  if (!homePage) {
    return;
  }

  const existing = await knex('pages_m2a').where({ pages_id: homePage.id }).first();
  if (existing) {
    return;
  }

  const refs: Array<{ collection: string; item: string; sort: number }> = [];

  for (const section of HOME_SECTIONS) {
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
  const homePage = await knex('pages').where({ slug: 'home' }).first<{ id: string }>();
  if (!homePage) {
    return;
  }

  await knex('pages_m2a').where({ pages_id: homePage.id }).delete();
}
