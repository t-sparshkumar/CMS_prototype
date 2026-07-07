import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { Knex } from 'knex';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationsDir = path.join(__dirname, 'src/db/migrations');
const seedsDir = path.join(__dirname, 'src/db/seeds');

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

function getSqliteConfig(): Knex.Config {
  const dbFile = process.env.DB_FILE ?? './data/cms.db';
  return {
    ...baseConfig,
    client: 'better-sqlite3',
    connection: {
      filename: path.resolve(__dirname, dbFile),
    },
    useNullAsDefault: true,
  };
}

function getPostgresConfig(): Knex.Config {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      ...baseConfig,
      client: 'pg',
      connection: {
        connectionString,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      },
    };
  }

  return {
    ...baseConfig,
    client: 'pg',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'cms',
      password: process.env.DB_PASSWORD ?? 'cms',
      database: process.env.DB_NAME ?? 'cms',
    },
  };
}

function getConfig(): Knex.Config {
  const client = process.env.DB_CLIENT ?? 'sqlite3';
  if (client === 'pg' || client === 'postgresql') {
    return getPostgresConfig();
  }
  return getSqliteConfig();
}

const config: { [key: string]: Knex.Config } = {
  development: getConfig(),
  production: getConfig(),
  test: getConfig(),
};

export default config;
