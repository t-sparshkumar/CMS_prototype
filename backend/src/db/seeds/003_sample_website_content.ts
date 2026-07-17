import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';

/**
 * Seed sample page groups for demo purposes.
 * Block instances are authored in Content block collections.
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
}
