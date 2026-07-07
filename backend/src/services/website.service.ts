import type { Knex } from 'knex';
import { insertSystemFields } from '../core/collection.js';
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
  global_layout: { status: false, sort: false, accountability: true },
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
    sort: 14,
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

async function insertGlobalLayoutFields(db: Knex, metadataOnly = false): Promise<void> {
  const add = metadataOnly ? restoreFieldMetadata : createField;
  const collection = 'global_layout';
  await add(db, collection, {
    field: 'header_logo',
    type: 'uuid',
    interface: 'file-image',
    sort: 10,
    width: 6,
  });
  await add(db, collection, {
    field: 'header_title',
    type: 'string',
    interface: 'input',
    sort: 11,
    width: 6,
  });
  await add(db, collection, {
    field: 'header_nav_links',
    type: 'json',
    interface: 'input-code',
    options: { language: 'json' },
    note: 'Array of { label, url } objects',
    sort: 12,
    width: 12,
  });
  await add(db, collection, {
    field: 'header_cta_label',
    type: 'string',
    interface: 'input',
    sort: 13,
    width: 6,
  });
  await add(db, collection, {
    field: 'header_cta_url',
    type: 'string',
    interface: 'input',
    sort: 14,
    width: 6,
  });
  await add(db, collection, {
    field: 'footer_logo',
    type: 'uuid',
    interface: 'file-image',
    sort: 20,
    width: 6,
  });
  await add(db, collection, {
    field: 'footer_description',
    type: 'text',
    interface: 'textarea',
    sort: 21,
    width: 12,
  });
  await add(db, collection, {
    field: 'footer_links',
    type: 'json',
    interface: 'input-code',
    options: { language: 'json' },
    note: 'Array of { title, links: [{ label, url }] } columns',
    sort: 22,
    width: 12,
  });
  await add(db, collection, {
    field: 'footer_copyright',
    type: 'string',
    interface: 'input',
    sort: 23,
    width: 12,
  });
}

/**
 * Re-insert cms_fields metadata when tables exist but field rows were lost.
 */
export async function repairMissingWebsiteFieldMetadata(db: Knex): Promise<void> {
  const repairs: Array<{ collection: string; seed: (trx: Knex, metadataOnly: boolean) => Promise<void> }> = [
    { collection: 'page_groups', seed: insertPageGroupFields },
    { collection: 'site_components', seed: insertSiteComponentFields },
    { collection: 'pages', seed: insertPagesFields },
    { collection: 'global_layout', seed: insertGlobalLayoutFields },
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
      note: 'Reusable CMS components for page builder',
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

  await ensureGlobalLayout(db);
  await repairMissingWebsiteFieldMetadata(db);
}

/**
 * Ensure global header/footer singleton collection exists.
 */
export async function ensureGlobalLayout(db: Knex): Promise<void> {
  const exists = await db('cms_collections').where({ collection: 'global_layout' }).first();
  if (!exists) {
    await createCollection(db, {
      collection: 'global_layout',
      icon: 'web',
      singleton: true,
      note: 'Global header and footer applied to all pages by default',
      optional_system_fields: WEBSITE_SYSTEM_FIELDS.global_layout,
    });
    await insertGlobalLayoutFields(db);
  }
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
}
