import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnv } from '../config/env.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Resolve the absolute SQLite database file path from environment configuration.
 */
export function getSqliteDbPath(): string {
  const env = getEnv();
  const dbFile = env.DB_FILE;
  return path.isAbsolute(dbFile) ? dbFile : path.resolve(backendRoot, dbFile);
}

/**
 * Ensure the parent directory for the SQLite database exists and is writable.
 */
export async function ensureSqliteDataDir(): Promise<string> {
  const env = getEnv();
  if (env.DB_CLIENT !== 'sqlite3') {
    return '';
  }

  const dbPath = getSqliteDbPath();
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });

  const probe = path.join(dir, '.write_probe');
  await fs.writeFile(probe, 'ok');
  await fs.unlink(probe);

  return dbPath;
}
