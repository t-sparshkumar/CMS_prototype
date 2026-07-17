import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';

type LegacyComponentInstance = {
  id?: string;
  component_slug?: string;
  component_type?: string;
  component_name?: string;
  fields?: Record<string, unknown>;
};

const SLUG_TO_COLLECTION: Record<string, string> = {
  'hero-carousel': 'hero_carousels',
  'hero-banner': 'hero_banners',
  hero: 'hero_banners',
  'service-tiles': 'service_tiles',
  'promo-grid': 'promo_grids',
  paragraph: 'paragraphs',
  'info-box': 'info_boxes',
};

const SKIP_SECTION_TYPES = new Set(['utility-bar', 'cookie-banner']);

function parseLegacyComponents(raw: unknown): LegacyComponentInstance[] {
  if (Array.isArray(raw)) {
    return raw as LegacyComponentInstance[];
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseLegacyComponents(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function legacyLabel(instance: LegacyComponentInstance): string {
  const slug = instance.component_slug ?? instance.component_type ?? 'block';
  const name = instance.component_name ?? slug;
  return `Migrated ${name}`;
}

function mapLegacyFields(
  collection: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  switch (collection) {
    case 'hero_banners':
      return {
        headline: fields.headline,
        subheadline: fields.subheadline,
        image: fields.image,
        image_web: fields.image_web ?? fields.image,
        image_tablet: fields.image_tablet,
        image_mobile: fields.image_mobile,
        cta_label: fields.cta_label,
        cta_url: fields.cta_url,
      };
    case 'hero_carousels':
      return {
        slides: typeof fields.slides === 'string' ? fields.slides : JSON.stringify(fields.slides ?? []),
      };
    case 'service_tiles':
      return {
        tiles: typeof fields.tiles === 'string' ? fields.tiles : JSON.stringify(fields.tiles ?? []),
      };
    case 'promo_grids':
      return {
        section_title: fields.section_title ?? fields.title,
        items: typeof fields.items === 'string' ? fields.items : JSON.stringify(fields.items ?? []),
      };
    case 'paragraphs':
      return { body: fields.body ?? fields.message ?? '' };
    case 'info_boxes':
      return {
        title: fields.title,
        body: fields.body ?? fields.message,
        icon: fields.icon ?? fields.image,
      };
    default:
      return fields;
  }
}

async function createBlockFromLegacy(
  knex: Knex,
  collection: string,
  instance: LegacyComponentInstance,
): Promise<string> {
  const now = new Date().toISOString();
  const label = legacyLabel(instance);
  const fields = mapLegacyFields(collection, instance.fields ?? {});
  const id = randomUUID();

  await knex(collection).insert({
    id,
    label,
    status: 'published',
    sort: 1,
    date_created: now,
    date_updated: now,
    ...fields,
  });

  return id;
}

/**
 * Migrate legacy pages.components JSON to block collection rows + pages.sections M2A refs.
 */
export async function seed(knex: Knex): Promise<void> {
  const hasJunction = await knex.schema.hasTable('pages_m2a');
  if (!hasJunction) {
    return;
  }

  const pages = await knex('pages').select('id', 'slug', 'components');

  for (const page of pages) {
    const pageId = String(page.id);
    const existingSections = await knex('pages_m2a').where({ pages_id: pageId }).first();
    if (existingSections) {
      continue;
    }

    const legacy = parseLegacyComponents(page.components);
    if (legacy.length === 0) {
      continue;
    }

    const refs: Array<{ collection: string; item: string; sort: number }> = [];
    let sort = 1;

    for (const instance of legacy) {
      const typeKey = instance.component_slug ?? instance.component_type ?? '';
      if (SKIP_SECTION_TYPES.has(typeKey)) {
        continue;
      }

      const collection = SLUG_TO_COLLECTION[typeKey];
      if (!collection) {
        continue;
      }

      const hasTable = await knex.schema.hasTable(collection);
      if (!hasTable) {
        continue;
      }

      const itemId = await createBlockFromLegacy(knex, collection, instance);
      refs.push({ collection, item: itemId, sort: sort++ });
    }

    if (refs.length > 0) {
      await knex('pages_m2a').insert(
        refs.map((ref) => ({
          pages_id: pageId,
          collection: ref.collection,
          item: ref.item,
          sort: ref.sort,
        })),
      );
    }
  }
}
