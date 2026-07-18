import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex, { type Knex } from 'knex';
import { getEnv } from '../config/env.js';
import { ensureSqliteDataDir, getSqliteDbPath } from '../core/sqlite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

let db: Knex | null = null;
let dbInitPromise: Promise<Knex> | null = null;

/**
 * Returns a singleton Knex database instance.
 */
export function getDb(): Knex {
  if (db) {
    return db;
  }

  throw new Error('Database not initialized. Call initDb() during server startup.');
}

/**
 * Initialize the database connection pool (call once before handling requests).
 */
export async function initDb(): Promise<Knex> {
  if (db) {
    return db;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
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
      const connection = env.DATABASE_URL
        ? {
            connectionString: env.DATABASE_URL,
            ssl: env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
          }
        : {
            host: env.DB_HOST ?? 'localhost',
            port: env.DB_PORT ?? 5432,
            user: env.DB_USER ?? 'cms',
            password: env.DB_PASSWORD ?? 'cms',
            database: env.DB_NAME ?? 'cms',
          };

      db = knex({
        ...baseConfig,
        client: 'pg',
        connection,
      });
    } else {
      await ensureSqliteDataDir();
      db = knex({
        ...baseConfig,
        client: 'better-sqlite3',
        connection: {
          filename: getSqliteDbPath(),
        },
        useNullAsDefault: true,
        pool: {
          afterCreate(
            conn: { pragma: (statement: string) => void },
            done: (err: Error | null, connection: unknown) => void,
          ) {
            conn.pragma('foreign_keys = ON');
            done(null, conn);
          },
        },
      });
    }

    return db;
  })();

  return dbInitPromise;
}

/**
 * Destroy the Knex connection pool. Used during graceful shutdown.
 */
export async function destroyDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    dbInitPromise = null;
  }
}
