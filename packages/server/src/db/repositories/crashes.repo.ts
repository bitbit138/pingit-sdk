import type { CrashRecord, CrashSubmission } from '@pingit/contracts';
import type { Pool } from '../pool.js';
import type { CrashRow } from '../../types.js';

export async function insertCrash(
  pool: Pool,
  row: CrashSubmission,
): Promise<{ id: number }> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO crashes (app_id, device_id, message, stack, platform, app_version, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id`,
    [
      row.appId,
      row.deviceId,
      row.message,
      row.stack ?? null,
      row.platform,
      row.appVersion ?? null,
    ],
  );
  return { id: Number(res.rows[0]!.id) };
}

export async function listCrashes(
  pool: Pool,
  opts: { appId?: string | null; limit: number },
): Promise<CrashRecord[]> {
  if (opts.appId) {
    const res = await pool.query<CrashRow>(
      `SELECT * FROM crashes WHERE app_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [opts.appId, opts.limit],
    );
    return res.rows.map(toRecord);
  }
  const res = await pool.query<CrashRow>(
    `SELECT * FROM crashes ORDER BY created_at DESC LIMIT $1`,
    [opts.limit],
  );
  return res.rows.map(toRecord);
}

function toRecord(r: CrashRow): CrashRecord {
  return {
    id: Number(r.id),
    appId: r.app_id,
    deviceId: r.device_id,
    message: r.message,
    stack: r.stack,
    platform: r.platform,
    appVersion: r.app_version,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
