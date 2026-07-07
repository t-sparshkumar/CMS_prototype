import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex, { type Knex } from 'knex';
import { getEnv } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

let db: Knex | null = null;

/**
 * Returns a singleton Knex database instance.
 */
export function getDb(): Knex {
  if (db) {
    return db;
  }

  const env = getEnv();
  const migrationsDir = path.join(backendRoot, 'src/db/migrations');
  const seedsDir = path.join(backendRoot, 'src/db/seeds');

  const baseConfig: Knex.Config = {
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
    },
    seeds: {
      directory: seedsDir,
      extension: 'ts',
    },
  };

  if (env.DB_CLIENT === 'pg' || env.DB_CLIENT === 'postgresql') {
    db = knex({
      ...baseConfig,
      client: 'pg',
      connection: {
        host: env.DB_HOST ?? 'localhost',
        port: env.DB_PORT ?? 5432,
        user: env.DB_USER ?? 'cms',
        password: env.DB_PASSWORD ?? 'cms',
        database: env.DB_NAME ?? 'cms',
      },
    });
  } else {
    db = knex({
      ...baseConfig,
      client: 'better-sqlite3',
      connection: {
        filename: path.resolve(backendRoot, env.DB_FILE),
      },
      useNullAsDefault: true,
    });
  }

  return db;
}

/**
 * Destroy the Knex connection pool. Used during graceful shutdown.
 */
export async function destroyDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
