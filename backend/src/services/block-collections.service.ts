import type { Knex } from 'knex';
import {
  createM2aJunctionTable,
  getM2aJunctionTableName,
  registerJunctionCollection,
} from '../core/relation.js';
import type { CreateFieldInput, SqlFieldType } from '../types/field.js';
import { createCollection } from './collections.service.js';
import { createField, restoreFieldMetadata } from './fields.service.js';
import { insertRelation } from './relations.service.js';

export const PAGE_BLOCK_COLLECTIONS = [
  'site_header',
  'site_footer',
  'hero_banners',
  'hero_carousels',
  'service_tiles',
  'promo_grids',
  'paragraphs',
  'info_boxes',
] as const;

export type PageBlockCollection = (typeof PAGE_BLOCK_COLLECTIONS)[number];

export const ALLOWED_PAGE_SECTIONS: PageBlockCollection[] = [...PAGE_BLOCK_COLLECTIONS];

const BLOCK_SYSTEM_FIELDS = { status: true, sort: true, accountability: true };

const THEME_CHOICES = [
  { text: 'Dark', value: 'dark' },
  { text: 'Light', value: 'light' },
];

const NAV_LINK_REPEATER_FIELDS = [
  { field: 'label', type: 'string', interface: 'input', note: 'Label' },
  { field: 'url', type: 'string', interface: 'input', note: 'URL' },
] as const;

const FOOTER_LINKS_REPEATER_FIELDS = [
  { field: 'title', type: 'string', interface: 'input', note: 'Column title' },
  {
    field: 'links',
    type: 'json',
    interface: 'repeater',
    note: 'Links in this column',
    options: { fields: NAV_LINK_REPEATER_FIELDS },
  },
] as const;

const HERO_SLIDE_REPEATER_FIELDS = [
  { field: 'headline', type: 'string', interface: 'input', note: 'Headline' },
  { field: 'subheadline', type: 'text', interface: 'textarea', note: 'Subheadline' },
  { field: 'cta_label', type: 'string', interface: 'input', note: 'CTA label' },
  { field: 'cta_url', type: 'string', interface: 'input', note: 'CTA URL' },
  { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Hero image' },
  {
    field: 'image_web',
    type: 'uuid',
    interface: 'file-image',
    note: 'Web image (1024px+)',
  },
  {
    field: 'image_tablet',
    type: 'uuid',
    interface: 'file-image',
    note: 'Tablet image (640–1023px)',
  },
  {
    field: 'image_mobile',
    type: 'uuid',
    interface: 'file-image',
    note: 'Mobile image (below 640px)',
  },
  {
    field: 'theme',
    type: 'string',
    interface: 'select-dropdown',
    note: 'Theme',
    options: { choices: THEME_CHOICES },
  },
] as const;

const SERVICE_TILE_REPEATER_FIELDS = [
  { field: 'title', type: 'string', interface: 'input', note: 'Title' },
  { field: 'subtitle', type: 'string', interface: 'input', note: 'Subtitle' },
  { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Tile image' },
  { field: 'url', type: 'string', interface: 'input', note: 'Link URL' },
] as const;

const PROMO_ITEM_REPEATER_FIELDS = [
  { field: 'title', type: 'string', interface: 'input', note: 'Title' },
  { field: 'body', type: 'text', interface: 'textarea', note: 'Body' },
  { field: 'cta_label', type: 'string', interface: 'input', note: 'CTA label' },
  { field: 'cta_url', type: 'string', interface: 'input', note: 'CTA URL' },
  { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Card image' },
] as const;

type BlockFieldDef = CreateFieldInput & {
  field: string;
  type: SqlFieldType | 'alias';
  interface: string;
  sort: number;
};

type BlockCollectionDef = {
  collection: PageBlockCollection;
  display_name: string;
  icon: string;
  note: string;
  display_template: string;
  sort: number;
  fields: BlockFieldDef[];
};

const BLOCK_DEFINITIONS: BlockCollectionDef[] = [
  {
    collection: 'site_header',
    display_name: 'Site Header',
    icon: 'web_asset',
    note: 'Reusable site header blocks — logo, navigation, and CTA',
    display_template: '{{label}}',
    sort: 8,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'logo', type: 'uuid', interface: 'file-image', sort: 11, width: 6 },
      { field: 'title', type: 'string', interface: 'input', sort: 12, width: 6 },
      {
        field: 'nav_links',
        type: 'json',
        interface: 'repeater',
        options: { fields: NAV_LINK_REPEATER_FIELDS },
        note: 'Navigation links',
        sort: 13,
        width: 12,
      },
      { field: 'cta_label', type: 'string', interface: 'input', sort: 14, width: 6 },
      { field: 'cta_url', type: 'string', interface: 'input', sort: 15, width: 6 },
    ],
  },
  {
    collection: 'site_footer',
    display_name: 'Site Footer',
    icon: 'web_asset',
    note: 'Reusable site footer blocks — logo, link columns, and copyright',
    display_template: '{{label}}',
    sort: 9,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'logo', type: 'uuid', interface: 'file-image', sort: 11, width: 6 },
      { field: 'title', type: 'string', interface: 'input', sort: 12, width: 6 },
      { field: 'description', type: 'text', interface: 'textarea', sort: 13, width: 12 },
      {
        field: 'links',
        type: 'json',
        interface: 'repeater',
        options: { fields: FOOTER_LINKS_REPEATER_FIELDS },
        note: 'Footer link columns',
        sort: 14,
        width: 12,
      },
      { field: 'copyright', type: 'string', interface: 'input', sort: 15, width: 12 },
    ],
  },
  {
    collection: 'hero_banners',
    display_name: 'Hero Banner',
    icon: 'image',
    note: 'Reusable hero banner blocks',
    display_template: '{{label}}',
    sort: 10,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'headline', type: 'string', interface: 'input', sort: 11, width: 12 },
      { field: 'subheadline', type: 'text', interface: 'textarea', sort: 12, width: 12 },
      {
        field: 'image_web',
        type: 'uuid',
        interface: 'file-image',
        note: 'Desktop / web hero image (1024px and above)',
        sort: 13,
        width: 4,
      },
      {
        field: 'image_tablet',
        type: 'uuid',
        interface: 'file-image',
        note: 'Tablet hero image (640px to 1023px)',
        sort: 14,
        width: 4,
      },
      {
        field: 'image_mobile',
        type: 'uuid',
        interface: 'file-image',
        note: 'Mobile hero image (below 640px)',
        sort: 15,
        width: 4,
      },
      {
        field: 'image',
        type: 'uuid',
        interface: 'file-image',
        hidden: true,
        note: 'Legacy image field. Use image_web, image_tablet, and image_mobile instead.',
        sort: 16,
        width: 6,
      },
      { field: 'cta_label', type: 'string', interface: 'input', sort: 17, width: 6 },
      { field: 'cta_url', type: 'string', interface: 'input', sort: 18, width: 12 },
    ],
  },
  {
    collection: 'hero_carousels',
    display_name: 'Hero Carousel',
    icon: 'slideshow',
    note: 'Reusable hero carousel blocks',
    display_template: '{{label}}',
    sort: 11,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      {
        field: 'slides',
        type: 'json',
        interface: 'repeater',
        options: { fields: HERO_SLIDE_REPEATER_FIELDS },
        note: 'Carousel slides with headline, CTA, and responsive images',
        sort: 11,
        width: 12,
      },
    ],
  },
  {
    collection: 'service_tiles',
    display_name: 'Service Tiles',
    icon: 'grid_view',
    note: 'Reusable service tile row blocks',
    display_template: '{{label}}',
    sort: 12,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      {
        field: 'tiles',
        type: 'json',
        interface: 'repeater',
        options: { fields: SERVICE_TILE_REPEATER_FIELDS },
        note: 'Service tiles with image, title, and link',
        sort: 11,
        width: 12,
      },
    ],
  },
  {
    collection: 'promo_grids',
    display_name: 'Promo Grid',
    icon: 'view_module',
    note: 'Reusable promo grid blocks',
    display_template: '{{label}}',
    sort: 13,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'section_title', type: 'string', interface: 'input', sort: 11, width: 12 },
      {
        field: 'items',
        type: 'json',
        interface: 'repeater',
        options: { fields: PROMO_ITEM_REPEATER_FIELDS },
        note: 'Promo cards with image, copy, and CTA',
        sort: 12,
        width: 12,
      },
    ],
  },
  {
    collection: 'paragraphs',
    display_name: 'Paragraph',
    icon: 'article',
    note: 'Reusable paragraph text blocks',
    display_template: '{{label}}',
    sort: 14,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'body', type: 'text', interface: 'wysiwyg', sort: 11, width: 12 },
    ],
  },
  {
    collection: 'info_boxes',
    display_name: 'Info Box',
    icon: 'info',
    note: 'Reusable info box blocks',
    display_template: '{{label}}',
    sort: 15,
    fields: [
      { field: 'label', type: 'string', interface: 'input', required: true, sort: 10, width: 12 },
      { field: 'title', type: 'string', interface: 'input', sort: 11, width: 12 },
      { field: 'body', type: 'text', interface: 'textarea', sort: 12, width: 12 },
      { field: 'icon', type: 'uuid', interface: 'file-image', sort: 13, width: 6 },
    ],
  },
];

async function fieldCount(db: Knex, collectionName: string): Promise<number> {
  const row = await db('cms_fields').where({ collection: collectionName }).count('* as count').first();
  return Number(row?.count ?? 0);
}

async function insertBlockCollectionFields(
  db: Knex,
  def: BlockCollectionDef,
  metadataOnly = false,
): Promise<void> {
  for (const fieldDef of def.fields) {
    if (metadataOnly) {
      await restoreFieldMetadata(db, def.collection, fieldDef);
    } else {
      await createField(db, def.collection, fieldDef);
    }
  }
}

async function ensureHeroBannerResponsiveImages(db: Knex): Promise<void> {
  const hasTable = await db.schema.hasTable('hero_banners');
  if (!hasTable) {
    return;
  }

  const responsiveFields = [
    { field: 'image_web', note: 'Desktop / web hero image (1024px and above)', sort: 13 },
    { field: 'image_tablet', note: 'Tablet hero image (640px to 1023px)', sort: 14 },
    { field: 'image_mobile', note: 'Mobile hero image (below 640px)', sort: 15 },
  ] as const;

  for (const { field, note, sort } of responsiveFields) {
    const exists = await db('cms_fields').where({ collection: 'hero_banners', field }).first();
    if (exists) {
      continue;
    }

    const hasColumn = await db.schema.hasColumn('hero_banners', field);
    const fieldDef = {
      field,
      type: 'uuid' as const,
      interface: 'file-image',
      note,
      sort,
      width: 4,
    };

    if (hasColumn) {
      await restoreFieldMetadata(db, 'hero_banners', { ...fieldDef, special: 'file' });
    } else {
      await createField(db, 'hero_banners', fieldDef);
    }
  }

  const legacyImage = await db('cms_fields').where({ collection: 'hero_banners', field: 'image' }).first();
  if (legacyImage) {
    await db('cms_fields')
      .where({ collection: 'hero_banners', field: 'image' })
      .update({
        hidden: true,
        note: 'Legacy image field. Use image_web, image_tablet, and image_mobile instead.',
        sort: 16,
      });

    const hasWebColumn = await db.schema.hasColumn('hero_banners', 'image_web');
    const hasLegacyColumn = await db.schema.hasColumn('hero_banners', 'image');
    if (hasWebColumn && hasLegacyColumn) {
      await db('hero_banners')
        .whereNotNull('image')
        .whereNull('image_web')
        .update({ image_web: db.ref('image') });
    }
  }
}

/**
 * Bootstrap per-type block collections at the Content root.
 */
export async function ensureBlockCollections(db: Knex): Promise<void> {
  for (const def of BLOCK_DEFINITIONS) {
    const exists = await db('cms_collections').where({ collection: def.collection }).first();
    if (!exists) {
      await createCollection(db, {
        collection: def.collection,
        display_name: def.display_name,
        icon: def.icon,
        note: def.note,
        display_template: def.display_template,
        parent: null,
        sort: def.sort,
        optional_system_fields: BLOCK_SYSTEM_FIELDS,
      });
      await insertBlockCollectionFields(db, def);
      continue;
    }

    const hasTable = await db.schema.hasTable(def.collection);
    if (hasTable && (await fieldCount(db, def.collection)) === 0) {
      await insertBlockCollectionFields(db, def, true);
    }

    await db('cms_collections')
      .where({ collection: def.collection })
      .update({
        parent: null,
        hidden: false,
        display_name: def.display_name,
        display_template: def.display_template,
        note: def.note,
        sort: def.sort,
      });
  }

  await ensureHeroBannerResponsiveImages(db);
  await ensureBlockRepeaterImageFields(db);
  await ensureSiteChromeBlockCollections(db);
}

/**
 * Upgrade legacy singleton site_header/site_footer into regular block collections.
 */
export async function ensureSiteChromeBlockCollections(db: Knex): Promise<void> {
  const chromeCollections = ['site_header', 'site_footer'] as const;

  for (const collection of chromeCollections) {
    const def = BLOCK_DEFINITIONS.find((entry) => entry.collection === collection);
    if (!def) {
      continue;
    }

    await db('cms_collections')
      .where({ collection })
      .update({
        singleton: false,
        hidden: false,
        parent: null,
        display_name: def.display_name,
        display_template: def.display_template,
        note: def.note,
        sort: def.sort,
      });

    const hasTable = await db.schema.hasTable(collection);
    if (!hasTable) {
      continue;
    }

    const defaultLabel = collection === 'site_header' ? 'Home Site Header' : 'Home Site Footer';
    const rowCount = Number(
      (await db(collection).count<{ count: number | string }>('* as count').first())?.count ?? 0,
    );

    const labelExists = await db('cms_fields').where({ collection, field: 'label' }).first();
    if (!labelExists) {
      await createField(db, collection, {
        field: 'label',
        type: 'string',
        interface: 'input',
        required: true,
        default_value: rowCount > 0 ? defaultLabel : undefined,
        sort: 10,
        width: 12,
      });
    }

    const statusExists = await db('cms_fields').where({ collection, field: 'status' }).first();
    if (!statusExists) {
      await createField(db, collection, {
        field: 'status',
        type: 'string',
        interface: 'select-dropdown',
        options: {
          choices: [
            { value: 'draft', text: 'Draft' },
            { value: 'published', text: 'Published' },
            { value: 'archived', text: 'Archived' },
          ],
        },
        default_value: rowCount > 0 ? 'published' : undefined,
        sort: 2,
        width: 12,
      });
    }

    const sortExists = await db('cms_fields').where({ collection, field: 'sort' }).first();
    if (!sortExists) {
      await createField(db, collection, {
        field: 'sort',
        type: 'integer',
        interface: 'input',
        sort: 3,
        width: 6,
      });
    }

    if (await db.schema.hasColumn(collection, 'label')) {
      await db(collection)
        .where((builder) => {
          builder.whereNull('label').orWhere('label', '');
        })
        .update({ label: defaultLabel });
    }

    if (await db.schema.hasColumn(collection, 'status')) {
      await db(collection).whereNull('status').update({ status: 'published' });
    }
  }
}

async function ensureBlockRepeaterImageFields(db: Knex): Promise<void> {
  const repeaterUpdates = [
    {
      collection: 'site_header',
      field: 'nav_links',
      note: 'Navigation links',
      options: { fields: NAV_LINK_REPEATER_FIELDS },
    },
    {
      collection: 'site_footer',
      field: 'links',
      note: 'Footer link columns',
      options: { fields: FOOTER_LINKS_REPEATER_FIELDS },
    },
    {
      collection: 'hero_carousels',
      field: 'slides',
      note: 'Carousel slides with headline, CTA, and responsive images',
      options: { fields: HERO_SLIDE_REPEATER_FIELDS },
    },
    {
      collection: 'service_tiles',
      field: 'tiles',
      note: 'Service tiles with image, title, and link',
      options: { fields: SERVICE_TILE_REPEATER_FIELDS },
    },
    {
      collection: 'promo_grids',
      field: 'items',
      note: 'Promo cards with image, copy, and CTA',
      options: { fields: PROMO_ITEM_REPEATER_FIELDS },
    },
  ] as const;

  for (const update of repeaterUpdates) {
    const existing = await db('cms_fields')
      .where({ collection: update.collection, field: update.field })
      .first();

    if (!existing) {
      continue;
    }

    await db('cms_fields')
      .where({ collection: update.collection, field: update.field })
      .update({
        interface: 'repeater',
        note: update.note,
        options: JSON.stringify(update.options),
      });
  }
}

/**
 * Add pages.sections many-to-any field and junction table.
 */
export async function ensurePagesSectionsField(db: Knex): Promise<void> {
  const pagesExists = await db('cms_collections').where({ collection: 'pages' }).first();
  if (!pagesExists) {
    return;
  }

  const sectionsField = await db('cms_fields')
    .where({ collection: 'pages', field: 'sections' })
    .first();

  if (!sectionsField) {
    await createField(db, 'pages', {
      field: 'sections',
      type: 'alias',
      interface: 'many-to-any',
      options: { allowed_collections: ALLOWED_PAGE_SECTIONS },
      note: 'Ordered page sections referencing block collection items',
      sort: 15,
      width: 12,
    });
  } else {
    await db('cms_fields')
      .where({ collection: 'pages', field: 'sections' })
      .update({
        interface: 'many-to-any',
        special: 'm2a',
        options: JSON.stringify({ allowed_collections: ALLOWED_PAGE_SECTIONS }),
        hidden: false,
      });
  }

  const junctionTable = getM2aJunctionTableName('pages');
  const hasJunction = await db.schema.hasTable(junctionTable);
  if (!hasJunction) {
    await db.transaction(async (trx) => {
      await createM2aJunctionTable(trx, 'pages');
      await registerJunctionCollection(trx, junctionTable);
    });
  }

  const relationExists = await db('cms_relations')
    .where({ many_collection: 'pages', many_field: 'sections' })
    .first();

  if (!relationExists) {
    await insertRelation(db, {
      many_collection: 'pages',
      many_field: 'sections',
      one_collection: '*',
      one_field: 'id',
      junction_collection: junctionTable,
      sort_field: 'sort',
      schema_on_delete: 'CASCADE',
    });
  }

  await db('cms_fields')
    .where({ collection: 'pages', field: 'components' })
    .update({ hidden: true });
}

/**
 * Hide legacy site_components from user-facing navigation.
 */
export async function deprecateSiteComponents(db: Knex): Promise<void> {
  await db('cms_collections')
    .where({ collection: 'site_components' })
    .update({ hidden: true });
}

/**
 * Ensure the full block collections module (blocks at Content root, M2A sections).
 */
export async function ensureBlockCollectionsModule(db: Knex): Promise<void> {
  await ensureBlockCollections(db);
  await ensurePagesSectionsField(db);
  await deprecateSiteComponents(db);
}
