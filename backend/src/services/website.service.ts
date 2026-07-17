import type { Knex } from 'knex';
import { insertSystemFields } from '../core/collection.js';
import { ensureBlockCollectionsModule } from './block-collections.service.js';

const HOME_PAGE_SECTIONS = [
  { collection: 'site_header', label: 'Home Site Header', sort: 1 },
  { collection: 'hero_carousels', label: 'Home Hero Carousel', sort: 2 },
  { collection: 'service_tiles', label: 'Home Service Tiles', sort: 3 },
  { collection: 'promo_grids', label: 'Home Promo Grid', sort: 4 },
  { collection: 'site_footer', label: 'Home Site Footer', sort: 5 },
] as const;
import { createCollection } from './collections.service.js';
import { createField, restoreFieldMetadata } from './fields.service.js';
import { insertRelation } from './relations.service.js';

type SystemFieldOptions = {
  status?: boolean;
  sort?: boolean;
  accountability?: boolean;
};

const WEBSITE_SYSTEM_FIELDS: Record<string, SystemFieldOptions> = {
  page_groups: { status: false, sort: true, accountability: true },
  site_components: { status: false, sort: true, accountability: true },
  pages: { status: true, sort: true, accountability: true },
};

async function fieldCount(db: Knex, collectionName: string): Promise<number> {
  const row = await db('cms_fields').where({ collection: collectionName }).count('* as count').first();
  return Number(row?.count ?? 0);
}

async function insertPageGroupFields(db: Knex, metadataOnly = false): Promise<void> {
  const add = metadataOnly ? restoreFieldMetadata : createField;
  const collection = 'page_groups';
  await add(db, collection, {
    field: 'title',
    type: 'string',
    interface: 'input',
    required: true,
    sort: 10,
    width: 12,
  });
  await add(db, collection, {
    field: 'slug',
    type: 'string',
    interface: 'input',
    required: true,
    unique: true,
    sort: 11,
    width: 12,
  });
  await add(db, collection, {
    field: 'description',
    type: 'text',
    interface: 'textarea',
    sort: 12,
    width: 12,
  });
  await add(db, collection, {
    field: 'active',
    type: 'boolean',
    interface: 'boolean',
    default_value: 'true',
    sort: 13,
    width: 6,
  });
}

async function insertSiteComponentFields(db: Knex, metadataOnly = false): Promise<void> {
  const add = metadataOnly ? restoreFieldMetadata : createField;
  const collection = 'site_components';
  await add(db, collection, {
    field: 'name',
    type: 'string',
    interface: 'input',
    required: true,
    sort: 10,
    width: 12,
  });
  await add(db, collection, {
    field: 'slug',
    type: 'string',
    interface: 'input',
    required: true,
    unique: true,
    sort: 11,
    width: 12,
  });
  await add(db, collection, {
    field: 'component_type',
    type: 'string',
    interface: 'select-dropdown',
    options: {
      choices: [
        { text: 'Hero', value: 'hero' },
        { text: 'Banner', value: 'banner' },
        { text: 'Cards', value: 'cards' },
        { text: 'Form', value: 'form' },
        { text: 'Custom', value: 'custom' },
        { text: 'Utility Bar', value: 'utility-bar' },
        { text: 'Hero Carousel', value: 'hero-carousel' },
        { text: 'Service Tiles', value: 'service-tiles' },
        { text: 'Promo Grid', value: 'promo-grid' },
        { text: 'Cookie Banner', value: 'cookie-banner' },
      ],
    },
    sort: 12,
    width: 6,
  });
  await add(db, collection, {
    field: 'category',
    type: 'string',
    interface: 'input',
    sort: 13,
    width: 6,
  });
  await add(db, collection, {
    field: 'schema',
    type: 'json',
    interface: 'input-code',
    options: { language: 'json' },
    sort: 14,
    width: 12,
  });
  await add(db, collection, {
    field: 'preview_image',
    type: 'uuid',
    interface: 'file-image',
    sort: 15,
    width: 12,
  });
}

async function insertPagesFields(db: Knex, metadataOnly = false): Promise<void> {
  const add = metadataOnly ? restoreFieldMetadata : createField;
  const collection = 'pages';
  await add(db, collection, {
    field: 'title',
    type: 'string',
    interface: 'input',
    required: true,
    sort: 10,
    width: 12,
  });
  await add(db, collection, {
    field: 'slug',
    type: 'string',
    interface: 'input',
    required: true,
    unique: true,
    sort: 11,
    width: 12,
  });
  await add(db, collection, {
    field: 'page_group',
    type: 'uuid',
    interface: 'many-to-one',
    options: { related_collection: 'page_groups', template: '{{title}}' },
    sort: 12,
    width: 6,
  });
  await add(db, collection, {
    field: 'active',
    type: 'boolean',
    interface: 'boolean',
    default_value: 'true',
    sort: 13,
    width: 6,
  });
  await add(db, collection, {
    field: 'components',
    type: 'json',
    interface: 'input-code',
    options: { language: 'json' },
    note: 'JSON array of component instances (managed via Page Builder UI)',
    hidden: true,
    sort: 15,
    width: 12,
  });

  const relationExists = await db('cms_relations')
    .where({ many_collection: 'pages', many_field: 'page_group' })
    .first();

  if (!relationExists) {
    await insertRelation(db, {
      many_collection: 'pages',
      many_field: 'page_group',
      one_collection: 'page_groups',
      one_field: 'id',
      junction_collection: null,
      sort_field: null,
      schema_on_delete: 'SET NULL',
    });
  }
}

/**
 * Re-insert cms_fields metadata when tables exist but field rows were lost.
 */
export async function repairMissingWebsiteFieldMetadata(db: Knex): Promise<void> {
  const repairs: Array<{ collection: string; seed: (trx: Knex, metadataOnly: boolean) => Promise<void> }> = [
    { collection: 'page_groups', seed: insertPageGroupFields },
    { collection: 'site_components', seed: insertSiteComponentFields },
    { collection: 'pages', seed: insertPagesFields },
  ];

  for (const { collection, seed } of repairs) {
    const meta = await db('cms_collections').where({ collection }).first();
    if (!meta) {
      continue;
    }

    const hasTable = await db.schema.hasTable(collection);
    if (!hasTable) {
      continue;
    }

    if ((await fieldCount(db, collection)) > 0) {
      continue;
    }

    const systemOptions = WEBSITE_SYSTEM_FIELDS[collection] ?? { accountability: true };
    await db.transaction(async (trx) => {
      await insertSystemFields(trx, collection, { optionalSystemFields: systemOptions });
      await seed(trx, true);
    });
  }
}

/**
 * Ensure website builder collections exist (page groups, components, pages).
 */
export async function ensureWebsiteCollections(db: Knex): Promise<void> {
  const pageGroupsExists = await db('cms_collections').where({ collection: 'page_groups' }).first();
  if (!pageGroupsExists) {
    await createCollection(db, {
      collection: 'page_groups',
      icon: 'folder',
      note: 'Organize website pages into groups',
      optional_system_fields: WEBSITE_SYSTEM_FIELDS.page_groups,
    });
    await insertPageGroupFields(db);
  }

  const componentsExists = await db('cms_collections').where({ collection: 'site_components' }).first();
  if (!componentsExists) {
    await createCollection(db, {
      collection: 'site_components',
      icon: 'widgets',
      note: 'Legacy component templates (deprecated — use page_components block collections)',
      hidden: true,
      optional_system_fields: WEBSITE_SYSTEM_FIELDS.site_components,
    });
    await insertSiteComponentFields(db);
  }

  const pagesExists = await db('cms_collections').where({ collection: 'pages' }).first();
  if (!pagesExists) {
    await createCollection(db, {
      collection: 'pages',
      icon: 'article',
      display_template: '{{title}}',
      note: 'Website pages with component layouts',
      optional_system_fields: WEBSITE_SYSTEM_FIELDS.pages,
    });
    await insertPagesFields(db);
  }

  await repairMissingWebsiteFieldMetadata(db);
  await ensureBlockCollectionsModule(db);
}

/**
 * Repair website module metadata for existing databases.
 */
export async function repairWebsiteModule(db: Knex): Promise<void> {
  await repairMissingWebsiteFieldMetadata(db);

  const pageGroupField = await db('cms_fields')
    .where({ collection: 'pages', field: 'page_group' })
    .first<{ interface: string }>();

  if (pageGroupField && pageGroupField.interface !== 'many-to-one') {
    await db('cms_fields')
      .where({ collection: 'pages', field: 'page_group' })
      .update({ interface: 'many-to-one', special: 'm2o' });

    const relationExists = await db('cms_relations')
      .where({ many_collection: 'pages', many_field: 'page_group' })
      .first();

    if (!relationExists) {
      await db('cms_relations').insert({
        many_collection: 'pages',
        many_field: 'page_group',
        one_collection: 'page_groups',
        one_field: 'id',
      });
    }
  }

  await db('cms_fields')
    .where({ collection: 'pages', field: 'components' })
    .update({ hidden: true });

  await ensureBlockCollectionsModule(db);
  await repairHomePageSections(db);
}

/**
 * Backfill home page M2A sections when block items exist but pages_m2a is empty.
 */
export async function repairHomePageSections(db: Knex): Promise<void> {
  const hasJunction = await db.schema.hasTable('pages_m2a');
  if (!hasJunction) {
    return;
  }

  const homePage = await db('pages').where({ slug: 'home' }).first<{ id: string }>();
  if (!homePage) {
    return;
  }

  const existing = await db('pages_m2a').where({ pages_id: homePage.id }).first();
  if (existing) {
    return;
  }

  const refs: Array<{ collection: string; item: string; sort: number }> = [];

  for (const section of HOME_PAGE_SECTIONS) {
    const item = await db(section.collection).where({ label: section.label }).first<{ id: string }>();
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

  await db('pages_m2a').insert(
    refs.map((ref) => ({
      pages_id: homePage.id,
      collection: ref.collection,
      item: ref.item,
      sort: ref.sort,
    })),
  );
}
