import type { Knex } from 'knex';

export interface ActivityLogInput {
  action: string;
  user?: string | null;
  collection?: string | null;
  item?: string | null;
  comment?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  data?: Record<string, unknown> | null;
  delta?: Record<string, unknown> | null;
}

/**
 * Check whether activity should be logged for a collection.
 */
export async function isActivityTrackingEnabled(
  db: Knex,
  collection: string | null | undefined,
): Promise<boolean> {
  if (!collection) {
    return true;
  }

  const hasColumn = await db.schema.hasColumn('cms_collections', 'activity_tracking');
  if (!hasColumn) {
    return true;
  }

  const row = await db('cms_collections')
    .where({ collection })
    .select('activity_tracking')
    .first<{ activity_tracking?: boolean | number }>();

  if (!row) {
    return true;
  }

  return row.activity_tracking !== false && row.activity_tracking !== 0;
}

/**
 * Log an activity event and optionally store a revision snapshot.
 */
export async function logActivity(db: Knex, input: ActivityLogInput): Promise<number | null> {
  if (input.collection) {
    const enabled = await isActivityTrackingEnabled(db, input.collection);
    if (!enabled) {
      return null;
    }
  }

  const insertResult = await db('cms_activity').insert({
    action: input.action,
    user: input.user ?? null,
    timestamp: new Date().toISOString(),
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
    collection: input.collection ?? null,
    item: input.item ?? null,
    comment: input.comment ?? null,
  });

  let resolvedId: number;
  if (Array.isArray(insertResult)) {
    const first = insertResult[0];
    resolvedId = typeof first === 'object' && first !== null && 'id' in first
      ? Number((first as { id: number }).id)
      : Number(first);
  } else {
    resolvedId = Number(insertResult);
  }

  if (!resolvedId || Number.isNaN(resolvedId)) {
    const latest = await db('cms_activity').orderBy('id', 'desc').first<{ id: number }>();
    resolvedId = Number(latest?.id ?? 0);
  }

  if (input.data && input.collection && input.item) {
    await db('cms_revisions').insert({
      activity: resolvedId,
      collection: input.collection,
      item: input.item,
      data: JSON.stringify(input.data),
      delta: input.delta ? JSON.stringify(input.delta) : null,
      parent: null,
    });
  }

  return resolvedId;
}

export interface ActivityEntry {
  id: number;
  action: string;
  user: string | null;
  user_name: string | null;
  user_email: string | null;
  timestamp: string;
  collection: string | null;
  item: string | null;
  comment: string | null;
}

export interface ListActivityOptions {
  action?: string;
  collection?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListActivityResult {
  data: ActivityEntry[];
  total: number;
}

interface ActivityRow {
  id: number;
  action: string;
  user: string | null;
  timestamp: string | Date;
  collection: string | null;
  item: string | null;
  comment: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/**
 * List activity log entries with user details.
 */
export async function listActivity(db: Knex, options: ListActivityOptions = {}): Promise<ListActivityResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  let query = db<ActivityRow>('cms_activity as a')
    .leftJoin('cms_users as u', 'a.user', 'u.id')
    .select(
      'a.id',
      'a.action',
      'a.user',
      'a.timestamp',
      'a.collection',
      'a.item',
      'a.comment',
      'u.first_name',
      'u.last_name',
      'u.email',
    );

  let countQuery = db('cms_activity as a');

  if (options.action) {
    query = query.where('a.action', options.action);
    countQuery = countQuery.where('a.action', options.action);
  }

  if (options.collection) {
    query = query.where('a.collection', options.collection);
    countQuery = countQuery.where('a.collection', options.collection);
  }

  if (options.search?.trim()) {
    const term = `%${options.search.trim().toLowerCase()}%`;
    const searchFilter = (builder: Knex.QueryBuilder) => {
      builder
        .whereRaw('lower(coalesce(a.comment, "")) like ?', [term])
        .orWhereRaw('lower(coalesce(a.collection, "")) like ?', [term])
        .orWhereRaw('lower(coalesce(a.item, "")) like ?', [term]);
    };
    query = query.where(searchFilter);
    countQuery = countQuery.where(searchFilter);
  }

  const [rows, countRow] = await Promise.all([
    query.orderBy('a.timestamp', 'desc').limit(limit).offset(offset),
    countQuery.count<{ count: string | number }>({ count: '*' }).first(),
  ]);

  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      user: row.user,
      user_name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      user_email: row.email ?? null,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : new Date(row.timestamp).toISOString(),
      collection: row.collection,
      item: row.item,
      comment: row.comment,
    })),
    total: Number(countRow?.count ?? 0),
  };
}

/**
 * Clear all activity log entries.
 */
export async function clearActivity(db: Knex): Promise<number> {
  await db('cms_revisions').del();
  const deleted = await db('cms_activity').del();
  return deleted;
}
