import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Run Knex migrations + seeds (production startup).
 * Uses tsx so TypeScript migration/seed files work without a separate compile step.
 */
export function runMigrationsAndSeeds(): void {
  const env = {
    ...process.env,
    NODE_OPTIONS: '--import tsx',
  };

  console.log('==> Running migrations...');
  execSync('npx knex migrate:latest --knexfile knexfile.ts', {
    cwd: backendRoot,
    env,
    stdio: 'inherit',
  });

  console.log('==> Running seeds...');
  execSync('npx knex seed:run --knexfile knexfile.ts', {
    cwd: backendRoot,
    env,
    stdio: 'inherit',
  });
}
