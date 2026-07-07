import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';

/**
 * Seed sample page groups and components for demo purposes.
 */
export async function seed(knex: Knex): Promise<void> {
  const groupCount = await knex('page_groups').count<{ count: number }>({ count: '*' }).first();
  if (Number(groupCount?.count ?? 0) === 0) {
    const generalId = randomUUID();
    const zmId = randomUUID();
    await knex('page_groups').insert([
      {
        id: generalId,
        title: 'General',
        slug: 'general',
        description: 'Core website pages',
        active: true,
        sort: 1,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      },
      {
        id: zmId,
        title: 'Zamtel Money',
        slug: 'zamtel-money',
        description: 'Money product pages',
        active: true,
        sort: 2,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      },
    ]);
  }

  const componentCount = await knex('site_components').count<{ count: number }>({ count: '*' }).first();
  if (Number(componentCount?.count ?? 0) === 0) {
    await knex('site_components').insert([
      {
        id: randomUUID(),
        name: 'Hero Banner',
        slug: 'hero-banner',
        component_type: 'hero',
        category: 'Marketing',
        schema: JSON.stringify([
          { field: 'headline', type: 'string', label: 'Headline', required: true },
          { field: 'subheadline', type: 'text', label: 'Subheadline' },
          { field: 'image', type: 'file', label: 'Background Image' },
          { field: 'cta_label', type: 'string', label: 'CTA Label' },
          { field: 'cta_url', type: 'string', label: 'CTA URL' },
        ]),
        sort: 1,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: 'Feature Cards',
        slug: 'feature-cards',
        component_type: 'cards',
        category: 'Content',
        schema: JSON.stringify([
          { field: 'section_title', type: 'string', label: 'Section Title' },
          { field: 'body', type: 'text', label: 'Description' },
        ]),
        sort: 2,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: 'Announcement Banner',
        slug: 'announcement-banner',
        component_type: 'banner',
        category: 'Marketing',
        schema: JSON.stringify([
          { field: 'title', type: 'string', label: 'Title', required: true },
          { field: 'message', type: 'text', label: 'Message' },
        ]),
        sort: 3,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      },
    ]);
  }
}
