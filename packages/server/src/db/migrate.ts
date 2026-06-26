import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runner } from 'node-pg-migrate';
import type { Config } from '../config/env.js';
import { loadConfig } from '../config/env.js';

/**
 * Apply every pending migration (up, unbounded) against the configured DB.
 * Migrations live in <cwd>/migrations so this works for the package dir, the
 * built Docker image, and the test harness alike.
 */
export async function runMigrations(config: Config): Promise<void> {
  await runner({
    databaseUrl: config.DATABASE_URL,
    dir: path.join(process.cwd(), 'migrations'),
    direction: 'up',
    count: Infinity,
    migrationsTable: 'pgmigrations',
    log: () => {},
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await import('dotenv/config');
  const config = loadConfig();
  await runMigrations(config);
  // eslint-disable-next-line no-console
  console.log('Migrations applied.');
  process.exit(0);
}
