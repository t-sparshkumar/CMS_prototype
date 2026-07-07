import type { Knex } from 'knex';

export interface DashboardStats {
  page_groups: number;
  components: number;
  users: number;
  drafts_pending: number;
  assets: number;
  pages: number;
}

/**
 * Aggregate dashboard statistics for the admin home page.
 */
export async function getDashboardStats(db: Knex): Promise<DashboardStats> {
  const [pageGroups, components, users, drafts, assets, pages] = await Promise.all([
    tableCount(db, 'page_groups'),
    tableCount(db, 'site_components'),
    db('cms_users').count<{ count: string | number }>({ count: '*' }).first(),
    tableCountWhere(db, 'pages', { status: 'draft' }),
    db('cms_files').count<{ count: string | number }>({ count: '*' }).first(),
    tableCount(db, 'pages'),
  ]);

  return {
    page_groups: pageGroups,
    components,
    users: Number(users?.count ?? 0),
    drafts_pending: drafts,
    assets: Number(assets?.count ?? 0),
    pages,
  };
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
