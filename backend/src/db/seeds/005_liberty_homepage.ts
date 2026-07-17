import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { ensureBlockCollectionsModule } from '../../services/block-collections.service.js';

const HERO_SLIDES = [
  {
    headline: 'Unbeatable Internet',
    subheadline: 'Fast, reliable fiber internet for your home',
    cta_label: 'Shop Internet',
    cta_url: 'https://www.libertypr.com/hogar/internet',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/hero-internet.jpg',
    theme: 'dark',
  },
  {
    headline: 'Planes desde $15',
    subheadline: 'Affordable mobile plans for everyone',
    cta_label: 'View Plans',
    cta_url: 'https://www.libertypr.com/movil/planes/liberty-mix',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/hero-mobile.jpg',
    theme: 'light',
  },
  {
    headline: '300 Megas',
    subheadline: 'Blazing speed for streaming and gaming',
    cta_label: 'Get Started',
    cta_url: 'https://www.libertypr.com/hogar/internet',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/hero-300mb.jpg',
    theme: 'dark',
  },
  {
    headline: 'Liberty SIMple',
    subheadline: 'Simple prepaid mobile service',
    cta_label: 'Learn More',
    cta_url: 'https://www.libertypr.com/movil/planes/prepago/ilimitado-pgreen',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/hero-simple.jpg',
    theme: 'light',
  },
  {
    headline: 'Samsung Galaxy S26+',
    subheadline: 'Get the latest device with Liberty',
    cta_label: 'Shop Devices',
    cta_url: 'https://www.libertypr.com/movil/equipos',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/hero-galaxy.jpg',
    theme: 'dark',
  },
];

const SERVICE_TILES = [
  {
    title: 'Internet+TV',
    subtitle: 'Bundle home internet and television',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/tile-internet-tv.jpg',
    url: 'https://www.libertypr.com/hogar/internet',
  },
  {
    title: 'Mobile Plans',
    subtitle: "Unlimited data on Puerto Rico's 5G network",
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/tile-mobile.jpg',
    url: 'https://www.libertypr.com/movil/planes/ilimitado-upick',
  },
];

const PROMO_ITEMS = [
  {
    title: '5G Mobile Network',
    body: 'Conéctate en todo Puerto Rico con nuestra red móvil 5G',
    cta_label: 'Explore Mobile',
    cta_url: 'https://www.libertypr.com/movil/planes/ilimitado',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/promo-5g.jpg',
  },
  {
    title: 'Unlimited Home Internet',
    body: 'Navega y Disfruta con el Internet ilimitado para el hogar',
    cta_label: 'Shop Internet',
    cta_url: 'https://www.libertypr.com/hogar/internet',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/promo-internet.jpg',
  },
  {
    title: 'Liberty Loop',
    body: 'Combina móvil y fijo y disfruta los beneficios de Liberty Loop',
    cta_label: 'Bundle & Save',
    cta_url: 'https://www.libertypr.com/ofertas',
    image_url: 'https://www.libertypr.com/content/dam/libertypr/home/promo-loop.jpg',
  },
];

async function upsertBlockItem(
  knex: Knex,
  collection: string,
  label: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const now = new Date().toISOString();
  const existing = await knex(collection).where({ label }).first();
  if (existing) {
    await knex(collection).where({ id: existing.id }).update({
      ...payload,
      label,
      date_updated: now,
    });
    return String(existing.id);
  }

  const id = randomUUID();
  await knex(collection).insert({
    id,
    label,
    status: 'published',
    sort: 1,
    date_created: now,
    date_updated: now,
    ...payload,
  });
  return id;
}

async function syncPageSections(
  knex: Knex,
  pageId: string,
  refs: Array<{ collection: string; item: string; sort: number }>,
): Promise<void> {
  await ensureBlockCollectionsModule(knex);

  const junctionTable = 'pages_m2a';
  const hasJunction = await knex.schema.hasTable(junctionTable);
  if (!hasJunction) {
    return;
  }

  await knex(junctionTable).where({ pages_id: pageId }).delete();
  if (refs.length > 0) {
    await knex(junctionTable).insert(
      refs.map((ref) => ({
        pages_id: pageId,
        collection: ref.collection,
        item: ref.item,
        sort: ref.sort,
      })),
    );
  }
}

/**
 * Seed Liberty PR homepage: site header/footer + home page with M2A block sections.
 */
export async function seed(knex: Knex): Promise<void> {
  await ensureBlockCollectionsModule(knex);
  const now = new Date().toISOString();

  const generalGroup = await knex('page_groups').where({ slug: 'general' }).first();
  const generalGroupId = generalGroup?.id ?? null;

  const headerId = await upsertBlockItem(knex, 'site_header', 'Home Site Header', {
    title: 'Liberty',
    nav_links: JSON.stringify([
      { label: 'Hogar', url: 'https://www.libertypr.com/hogar/internet' },
      { label: 'Móvil', url: 'https://www.libertypr.com/movil/planes/liberty-mix' },
      { label: 'Ofertas', url: 'https://www.libertypr.com/ofertas' },
      { label: 'Ayuda', url: 'https://www.libertypr.com/ayuda' },
      { label: 'Internet+TV', url: 'https://www.libertypr.com/hogar/internet' },
      { label: 'Planes Móviles', url: 'https://www.libertypr.com/movil/planes/ilimitado-upick' },
    ]),
    cta_label: 'Mi Liberty',
    cta_url: 'https://www.libertypr.com/mi-cuenta',
  });

  const footerId = await upsertBlockItem(knex, 'site_footer', 'Home Site Footer', {
    title: 'Liberty',
    description:
      'Liberty Puerto Rico ofrece los mejores servicios de internet, móvil, TV y teléfono en la isla.',
    links: JSON.stringify([
      {
        title: 'Servicios',
        links: [
          { label: 'Internet', url: 'https://www.libertypr.com/hogar/internet' },
          { label: 'TV', url: 'https://www.libertypr.com/hogar/tv' },
          { label: 'Móvil', url: 'https://www.libertypr.com/movil/planes/liberty-mix' },
          { label: 'Prepago', url: 'https://www.libertypr.com/movil/planes/prepago/ilimitado-pgreen' },
        ],
      },
      {
        title: 'Ayuda',
        links: [
          { label: 'Centro de Ayuda', url: 'https://www.libertypr.com/ayuda' },
          { label: 'Contacto', url: 'https://www.libertypr.com/contacto' },
          { label: 'Tiendas', url: 'https://www.libertypr.com/tiendas' },
        ],
      },
      {
        title: 'Empresa',
        links: [
          { label: 'Acerca de Liberty', url: 'https://www.libertypr.com/acerca' },
          { label: 'Carreras', url: 'https://www.libertypr.com/carreras' },
          { label: 'Política de privacidad', url: 'https://www.libertypr.com/es/aviso-de-privacidad-del-sitio-web' },
        ],
      },
    ]),
    copyright: '© 2026 Liberty Puerto Rico. Todos los derechos reservados.',
  });

  const heroCarouselId = await upsertBlockItem(knex, 'hero_carousels', 'Home Hero Carousel', {
    slides: JSON.stringify(HERO_SLIDES),
  });
  const serviceTilesId = await upsertBlockItem(knex, 'service_tiles', 'Home Service Tiles', {
    tiles: JSON.stringify(SERVICE_TILES),
  });
  const promoGridId = await upsertBlockItem(knex, 'promo_grids', 'Home Promo Grid', {
    section_title: 'Otros servicios que te pueden interesar',
    items: JSON.stringify(PROMO_ITEMS),
  });

  const pagePayload = {
    title: 'Home',
    slug: 'home',
    page_group: generalGroupId,
    active: true,
    status: 'published',
    date_updated: now,
  };

  let pageId: string;
  const existingPage = await knex('pages').where({ slug: 'home' }).first();
  if (existingPage) {
    pageId = String(existingPage.id);
    await knex('pages').where({ slug: 'home' }).update(pagePayload);
  } else {
    pageId = randomUUID();
    await knex('pages').insert({
      id: pageId,
      ...pagePayload,
      date_created: now,
    });
  }

  await syncPageSections(knex, pageId, [
    { collection: 'site_header', item: headerId, sort: 1 },
    { collection: 'hero_carousels', item: heroCarouselId, sort: 2 },
    { collection: 'service_tiles', item: serviceTilesId, sort: 3 },
    { collection: 'promo_grids', item: promoGridId, sort: 4 },
    { collection: 'site_footer', item: footerId, sort: 5 },
  ]);
}
