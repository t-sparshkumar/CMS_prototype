import type { Knex } from 'knex';

const RESPONSIVE_IMAGE_FIELDS = [
  {
    field: 'image_web',
    note: 'Desktop / web hero image (1024px and above)',
    sort: 13,
  },
  {
    field: 'image_tablet',
    note: 'Tablet hero image (640px to 1023px)',
    sort: 14,
  },
  {
    field: 'image_mobile',
    note: 'Mobile hero image (below 640px)',
    sort: 15,
  },
] as const;

/**
 * Add responsive hero banner image fields (web, tablet, mobile).
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('hero_banners');
  if (hasTable) {
    for (const { field } of RESPONSIVE_IMAGE_FIELDS) {
      const hasColumn = await knex.schema.hasColumn('hero_banners', field);
      if (!hasColumn) {
        await knex.schema.alterTable('hero_banners', (table) => {
          table.uuid(field).nullable();
        });
      }
    }

    const hasLegacyImage = await knex.schema.hasColumn('hero_banners', 'image');
    const hasWebImage = await knex.schema.hasColumn('hero_banners', 'image_web');
    if (hasLegacyImage && hasWebImage) {
      await knex('hero_banners')
        .whereNotNull('image')
        .whereNull('image_web')
        .update({ image_web: knex.ref('image') });
    }
  }

  const heroBannersCollection = await knex('cms_collections').where({ collection: 'hero_banners' }).first();
  if (!heroBannersCollection) {
    return;
  }

  for (const { field, note, sort } of RESPONSIVE_IMAGE_FIELDS) {
    const existing = await knex('cms_fields').where({ collection: 'hero_banners', field }).first();
    if (!existing) {
      await knex('cms_fields').insert({
        collection: 'hero_banners',
        field,
        type: 'uuid',
        interface: 'file-image',
        special: 'file',
        note,
        sort,
        width: 4,
        required: false,
        readonly: false,
        hidden: false,
        nullable: true,
        searchable: false,
      });
    }
  }

  await knex('cms_fields')
    .where({ collection: 'hero_banners', field: 'image' })
    .update({
      hidden: true,
      note: 'Legacy image field. Use image_web, image_tablet, and image_mobile instead.',
      sort: 16,
    });

  // Shift CTA fields after image fields
  await knex('cms_fields').where({ collection: 'hero_banners', field: 'cta_label' }).update({ sort: 17, width: 6 });
  await knex('cms_fields').where({ collection: 'hero_banners', field: 'cta_url' }).update({ sort: 18, width: 12 });
}

export async function down(knex: Knex): Promise<void> {
  for (const { field } of RESPONSIVE_IMAGE_FIELDS) {
    await knex('cms_fields').where({ collection: 'hero_banners', field }).delete();
  }

  const hasTable = await knex.schema.hasTable('hero_banners');
  if (hasTable) {
    for (const { field } of RESPONSIVE_IMAGE_FIELDS) {
      const hasColumn = await knex.schema.hasColumn('hero_banners', field);
      if (hasColumn) {
        await knex.schema.alterTable('hero_banners', (table) => {
          table.dropColumn(field);
        });
      }
    }
  }

  await knex('cms_fields')
    .where({ collection: 'hero_banners', field: 'image' })
    .update({ hidden: false, note: null, sort: 13 });
}
