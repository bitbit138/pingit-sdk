import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The whole suite shares a single Postgres test DB; running files in
    // parallel would cause truncate-between-tests to clobber other files.
    fileParallelism: false,
    globals: false,
    setupFiles: ['./test/helpers/setup.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
