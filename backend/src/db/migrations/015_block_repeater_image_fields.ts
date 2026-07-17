import type { Knex } from 'knex';

const THEME_CHOICES = [
  { text: 'Dark', value: 'dark' },
  { text: 'Light', value: 'light' },
];

const REPEATER_FIELD_UPDATES = [
  {
    collection: 'hero_carousels',
    field: 'slides',
    note: 'Carousel slides with headline, CTA, and responsive images',
    options: {
      fields: [
        { field: 'headline', type: 'string', interface: 'input', note: 'Headline' },
        { field: 'subheadline', type: 'text', interface: 'textarea', note: 'Subheadline' },
        { field: 'cta_label', type: 'string', interface: 'input', note: 'CTA label' },
        { field: 'cta_url', type: 'string', interface: 'input', note: 'CTA URL' },
        { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Hero image' },
        { field: 'image_web', type: 'uuid', interface: 'file-image', note: 'Web image (1024px+)' },
        { field: 'image_tablet', type: 'uuid', interface: 'file-image', note: 'Tablet image (640–1023px)' },
        { field: 'image_mobile', type: 'uuid', interface: 'file-image', note: 'Mobile image (below 640px)' },
        {
          field: 'theme',
          type: 'string',
          interface: 'select-dropdown',
          note: 'Theme',
          options: { choices: THEME_CHOICES },
        },
      ],
    },
  },
  {
    collection: 'service_tiles',
    field: 'tiles',
    note: 'Service tiles with image, title, and link',
    options: {
      fields: [
        { field: 'title', type: 'string', interface: 'input', note: 'Title' },
        { field: 'subtitle', type: 'string', interface: 'input', note: 'Subtitle' },
        { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Tile image' },
        { field: 'url', type: 'string', interface: 'input', note: 'Link URL' },
      ],
    },
  },
  {
    collection: 'promo_grids',
    field: 'items',
    note: 'Promo cards with image, copy, and CTA',
    options: {
      fields: [
        { field: 'title', type: 'string', interface: 'input', note: 'Title' },
        { field: 'body', type: 'text', interface: 'textarea', note: 'Body' },
        { field: 'cta_label', type: 'string', interface: 'input', note: 'CTA label' },
        { field: 'cta_url', type: 'string', interface: 'input', note: 'CTA URL' },
        { field: 'image_url', type: 'uuid', interface: 'file-image', note: 'Card image' },
      ],
    },
  },
] as const;

/**
 * Switch JSON code fields to repeater editors with image pickers.
 */
export async function up(knex: Knex): Promise<void> {
  for (const update of REPEATER_FIELD_UPDATES) {
    await knex('cms_fields')
      .where({ collection: update.collection, field: update.field })
      .update({
        interface: 'repeater',
        note: update.note,
        options: JSON.stringify(update.options),
      });
  }
}

export async function down(knex: Knex): Promise<void> {
  const legacy = [
    {
      collection: 'hero_carousels',
      field: 'slides',
      note: 'Array of slide objects (headline, subheadline, cta_label, cta_url, image_url, theme)',
      options: { language: 'json' },
    },
    {
      collection: 'service_tiles',
      field: 'tiles',
      note: 'Array of tile objects (title, subtitle, image_url, url)',
      options: { language: 'json' },
    },
    {
      collection: 'promo_grids',
      field: 'items',
      note: 'Array of promo card objects',
      options: { language: 'json' },
    },
  ] as const;

  for (const update of legacy) {
    await knex('cms_fields')
      .where({ collection: update.collection, field: update.field })
      .update({
        interface: 'input-code',
        note: update.note,
        options: JSON.stringify(update.options),
      });
  }
}
