import type { Knex } from 'knex';

const COMPONENT_TYPE_CHOICES = [
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
];

/**
 * Extend site_components.component_type dropdown with Liberty block types.
 */
export async function up(knex: Knex): Promise<void> {
  await knex('cms_fields')
    .where({ collection: 'site_components', field: 'component_type' })
    .update({
      options: JSON.stringify({ choices: COMPONENT_TYPE_CHOICES }),
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex('cms_fields')
    .where({ collection: 'site_components', field: 'component_type' })
    .update({
      options: JSON.stringify({
        choices: [
          { text: 'Hero', value: 'hero' },
          { text: 'Banner', value: 'banner' },
          { text: 'Cards', value: 'cards' },
          { text: 'Form', value: 'form' },
          { text: 'Custom', value: 'custom' },
        ],
      }),
    });
}
