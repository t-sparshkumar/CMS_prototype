import type { Knex } from 'knex';
import { PAGE_BLOCK_COLLECTIONS } from './block-collections.service.js';

export interface DashboardStats {
  collections: number;
  components: number;
  users: number;
  drafts_pending: number;
  assets: number;
  pages: number;
  flows: number;
}

/**
 * Aggregate dashboard statistics for the admin home page.
 */
export async function getDashboardStats(db: Knex): Promise<DashboardStats> {
  const [collections, components, users, drafts, assets, pages, flows] = await Promise.all([
    countContentCollections(db),
    countBlockItems(db),
    db('cms_users').count<{ count: string | number }>({ count: '*' }).first(),
    tableCountWhere(db, 'pages', { status: 'draft' }),
    db('cms_files').count<{ count: string | number }>({ count: '*' }).first(),
    tableCount(db, 'pages'),
    tableCount(db, 'cms_flows'),
  ]);

  return {
    collections,
    components,
    users: Number(users?.count ?? 0),
    drafts_pending: drafts,
    assets: Number(assets?.count ?? 0),
    pages,
    flows,
  };
}

async function countContentCollections(db: Knex): Promise<number> {
  const row = await db('cms_collections')
    .where({ is_group: false, hidden: false, system: false })
    .whereNot('collection', 'like', 'cms_%')
    .count<{ count: string | number }>({ count: '*' })
    .first();
  return Number(row?.count ?? 0);
}

async function countBlockItems(db: Knex): Promise<number> {
  const counts = await Promise.all(
    PAGE_BLOCK_COLLECTIONS.map((collection) => tableCount(db, collection)),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

async function tableCount(db: Knex, table: string): Promise<number> {
  const exists = await db.schema.hasTable(table);
  if (!exists) {
    return 0;
  }
  const row = await db(table).count<{ count: string | number }>({ count: '*' }).first();
  return Number(row?.count ?? 0);
}

async function tableCountWhere(db: Knex, table: string, where: Record<string, unknown>): Promise<number> {
  const exists = await db.schema.hasTable(table);
  if (!exists) {
    return 0;
  }
  const row = await db(table).where(where).count<{ count: string | number }>({ count: '*' }).first();
  return Number(row?.count ?? 0);
}
