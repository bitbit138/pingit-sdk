import { randomBytes } from 'node:crypto';
import { makePool, closePool } from '../../src/db/pool.js';
import type { Pool } from '../../src/db/pool.js';
import { hash } from '../../src/services/password.js';
import { clearAppIdCache } from '../../src/services/appId.service.js';

const TEST_DATABASE_URL = 'postgres://pingit:pingit@localhost:5432/pingit_test';

let sharedPool: Pool | null = null;

export function getTestPool(): Pool {
  if (!sharedPool) sharedPool = makePool(TEST_DATABASE_URL);
  return sharedPool;
}

export async function closeTestPool(): Promise<void> {
  if (sharedPool) {
    await closePool(sharedPool);
    sharedPool = null;
  }
}

/** Reset every table to a clean state between tests. */
export async function truncateAll(): Promise<void> {
  const pool = getTestPool();
  await pool.query('TRUNCATE profiles, apps, users, results, crashes RESTART IDENTITY CASCADE');
  clearAppIdCache();
}

export const ADMIN_EMAIL = 'admin@pingit.dev';
export const ADMIN_PASSWORD = 'ChangeMe123!';

/** Insert the admin user (role 'admin'). */
export async function seedAdmin(
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<void> {
  const pool = getTestPool();
  const passwordHash = await hash(password);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, app_id) VALUES ($1, $2, 'admin', NULL)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, passwordHash],
  );
}

/** Insert a non-revoked app and return its id. */
export async function seedApp(
  opts: { name?: string; ownerEmail?: string | null } = {},
): Promise<string> {
  const pool = getTestPool();
  const appId = 'app_' + randomBytes(8).toString('hex');
  const apiKeyHash = await hash(randomBytes(16).toString('hex'));
  await pool.query(
    `INSERT INTO apps (app_id, name, owner_email, api_key_hash) VALUES ($1, $2, $3, $4)`,
    [appId, opts.name ?? 'Test App', opts.ownerEmail ?? null, apiKeyHash],
  );
  clearAppIdCache();
  return appId;
}

/** Insert a developer user scoped to an app. */
export async function seedDeveloper(
  email: string,
  appId: string,
  password = ADMIN_PASSWORD,
): Promise<void> {
  const pool = getTestPool();
  const passwordHash = await hash(password);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, app_id) VALUES ($1, $2, 'developer', $3)
     ON CONFLICT (email) DO UPDATE SET app_id = EXCLUDED.app_id`,
    [email, passwordHash, appId],
  );
}

/** Insert a profile row directly. */
export async function seedProfile(
  id: string,
  requires: unknown,
  version: number,
): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO profiles (id, requires, version) VALUES ($1, $2::jsonb, $3)`,
    [id, JSON.stringify(requires), version],
  );
}

/** Insert a result row directly (server-stamped created_at optional). */
export async function seedResult(row: {
  appId: string;
  deviceId: string;
  downloadMbps?: number;
  uploadMbps?: number;
  latencyMs?: number;
  jitterMs?: number;
  packetLossPct?: number;
  score?: number;
  createdAt?: string;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO results
       (app_id, device_id, download_mbps, upload_mbps, latency_ms, jitter_ms, packet_loss_pct, score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now()))`,
    [
      row.appId,
      row.deviceId,
      row.downloadMbps ?? 0,
      row.uploadMbps ?? 0,
      row.latencyMs ?? 0,
      row.jitterMs ?? 0,
      row.packetLossPct ?? 0,
      row.score ?? null,
      row.createdAt ?? null,
    ],
  );
}

/** Insert a crash row directly. */
export async function seedCrash(row: {
  appId: string;
  deviceId: string;
  message: string;
  platform: string;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO crashes (app_id, device_id, message, platform) VALUES ($1, $2, $3, $4)`,
    [row.appId, row.deviceId, row.message, row.platform],
  );
}
