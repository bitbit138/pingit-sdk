import { randomBytes } from 'node:crypto';
import type { AppRecord, AppCreatedResponse } from '@pingit/contracts';
import type { Pool } from '../pool.js';
import type { AppRow } from '../../types.js';
import { hash } from '../../services/password.js';

/** True only if the app row exists and has not been revoked. */
export async function appExists(pool: Pool, appId: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    'SELECT 1 AS exists FROM apps WHERE app_id = $1 AND revoked_at IS NULL',
    [appId],
  );
  return res.rowCount! > 0;
}

export async function getApp(pool: Pool, appId: string): Promise<AppRecord | null> {
  const res = await pool.query<AppRow>(
    'SELECT app_id, name, owner_email, revoked_at, created_at FROM apps WHERE app_id = $1',
    [appId],
  );
  const row = res.rows[0];
  return row ? toRecord(row) : null;
}

export async function createApp(
  pool: Pool,
  input: { name: string; ownerEmail: string | null },
): Promise<AppCreatedResponse> {
  const appId = 'app_' + randomBytes(8).toString('hex'); // 16 hex chars
  const apiKey = randomBytes(16).toString('hex'); // 32 hex chars
  const apiKeyHash = await hash(apiKey);

  const res = await pool.query<AppRow>(
    `INSERT INTO apps (app_id, name, owner_email, api_key_hash, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING app_id, name, owner_email, revoked_at, created_at`,
    [appId, input.name, input.ownerEmail, apiKeyHash],
  );
  const row = res.rows[0]!;
  return { ...toRecord(row), apiKey };
}

export async function listApps(
  pool: Pool,
  opts: { ownerEmail?: string } = {},
): Promise<AppRecord[]> {
  if (opts.ownerEmail !== undefined) {
    const res = await pool.query<AppRow>(
      `SELECT app_id, name, owner_email, revoked_at, created_at FROM apps
       WHERE owner_email = $1 ORDER BY created_at DESC`,
      [opts.ownerEmail],
    );
    return res.rows.map(toRecord);
  }
  const res = await pool.query<AppRow>(
    'SELECT app_id, name, owner_email, revoked_at, created_at FROM apps ORDER BY created_at DESC',
  );
  return res.rows.map(toRecord);
}

export async function revokeApp(pool: Pool, appId: string): Promise<boolean> {
  const res = await pool.query(
    'UPDATE apps SET revoked_at = now() WHERE app_id = $1 AND revoked_at IS NULL',
    [appId],
  );
  return res.rowCount! > 0;
}

function toRecord(r: AppRow): AppRecord {
  return {
    appId: r.app_id,
    name: r.name,
    ownerEmail: r.owner_email,
    createdAt: new Date(r.created_at).toISOString(),
    revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : null,
  };
}
