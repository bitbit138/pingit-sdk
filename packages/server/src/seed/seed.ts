import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { CANONICAL_PROFILES, SEED_VERSION } from '@pingit/contracts';
import type { Config } from '../config/env.js';
import { loadConfig } from '../config/env.js';
import { makePool, closePool } from '../db/pool.js';
import { hash } from '../services/password.js';

const DEMO_DEV_EMAIL = 'dev@pingit.dev';
const DEMO_DEV_PASSWORD = 'ChangeMe123!';
const DEMO_APP_NAME = 'Demo App';

// A fixed, well-known appId so the web demo (demo/) works with zero config.
const FIXED_DEMO_APP_ID = 'app_demo';
const FIXED_DEMO_APP_NAME = 'PingIt Demo (web)';

/**
 * Idempotently seed canonical profiles, the admin user, and a demo app +
 * developer. Logs the demo appId so it can be reused for manual testing.
 */
export async function runSeed(config: Config): Promise<void> {
  const pool = makePool(config.DATABASE_URL);
  try {
    // --- Profiles (single source of truth) ---
    for (const p of CANONICAL_PROFILES) {
      await pool.query(
        `INSERT INTO profiles (id, requires, version, updated_at)
         VALUES ($1, $2::jsonb, $3, now())
         ON CONFLICT (id) DO UPDATE
           SET requires = EXCLUDED.requires, version = EXCLUDED.version, updated_at = now()`,
        [p.id, JSON.stringify(p.requires), SEED_VERSION],
      );
    }

    // --- Admin user ---
    const adminHash = await hash(config.ADMIN_PASSWORD);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, app_id, created_at)
       VALUES ($1, $2, 'admin', NULL, now())
       ON CONFLICT (email) DO NOTHING`,
      [config.ADMIN_EMAIL, adminHash],
    );

    // --- Demo app (idempotent: reuse if one already exists) ---
    const existing = await pool.query<{ app_id: string }>(
      `SELECT app_id FROM apps WHERE name = $1 AND revoked_at IS NULL ORDER BY created_at LIMIT 1`,
      [DEMO_APP_NAME],
    );

    let demoAppId: string;
    if (existing.rows[0]) {
      demoAppId = existing.rows[0].app_id;
    } else {
      demoAppId = 'app_' + randomBytes(8).toString('hex');
      const apiKey = randomBytes(16).toString('hex');
      const apiKeyHash = await hash(apiKey);
      await pool.query(
        `INSERT INTO apps (app_id, name, owner_email, api_key_hash, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [demoAppId, DEMO_APP_NAME, DEMO_DEV_EMAIL, apiKeyHash],
      );
    }

    // --- Demo developer (scoped to the demo app) ---
    const devHash = await hash(DEMO_DEV_PASSWORD);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, app_id, created_at)
       VALUES ($1, $2, 'developer', $3, now())
       ON CONFLICT (email) DO UPDATE SET app_id = EXCLUDED.app_id`,
      [DEMO_DEV_EMAIL, devHash, demoAppId],
    );

    // --- Fixed demo app for the web demo (stable appId, zero-config) ---
    await pool.query(
      `INSERT INTO apps (app_id, name, owner_email, created_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (app_id) DO NOTHING`,
      [FIXED_DEMO_APP_ID, FIXED_DEMO_APP_NAME, DEMO_DEV_EMAIL],
    );

    // eslint-disable-next-line no-console
    console.log(`Seed complete. Demo appId: ${demoAppId} · web-demo appId: ${FIXED_DEMO_APP_ID}`);
  } finally {
    await closePool(pool);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await import('dotenv/config');
  const config = loadConfig();
  await runSeed(config);
  process.exit(0);
}
