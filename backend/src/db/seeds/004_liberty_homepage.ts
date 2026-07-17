import type { Knex } from 'knex';

/**
 * Legacy seed superseded by 005_liberty_homepage.ts (M2A page sections).
 */
export async function seed(_knex: Knex): Promise<void> {
  // No-op: Liberty homepage content is seeded via block collections in seed 005.
}
