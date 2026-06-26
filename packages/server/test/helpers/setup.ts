import { beforeAll } from 'vitest';

// Force the test environment BEFORE anything reads process.env / loadConfig.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://pingit:pingit@localhost:5432/pingit_test';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@pingit.dev';
process.env.ADMIN_PASSWORD = 'ChangeMe123!';
process.env.DOWNLOAD_MAX_BYTES = '26214400';
process.env.UPLOAD_MAX_BYTES = '1048576';
process.env.RATE_LIMIT_MAX = '100000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.LOG_LEVEL = 'silent';

// Migrate the test DB once for the whole (serially-run) suite.
beforeAll(async () => {
  const { loadConfig } = await import('../../src/config/env.js');
  const { runMigrations } = await import('../../src/db/migrate.js');
  await runMigrations(loadConfig());
}, 30000);
