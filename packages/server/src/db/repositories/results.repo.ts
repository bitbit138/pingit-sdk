import type { ResultRecord, ResultSubmission } from '@pingit/contracts';
import type { Pool } from '../pool.js';
import type { ResultRow } from '../../types.js';

export async function insertResult(
  pool: Pool,
  row: ResultSubmission,
): Promise<{ id: number; createdAt: string }> {
  const res = await pool.query<{ id: string; created_at: Date }>(
    `INSERT INTO results
       (app_id, device_id, download_mbps, upload_mbps, latency_ms, jitter_ms, packet_loss_pct, score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     RETURNING id, created_at`,
    [
      row.appId,
      row.deviceId,
      row.downloadMbps,
      row.uploadMbps,
      row.latencyMs,
      row.jitterMs,
      row.packetLossPct,
      row.score ?? null,
    ],
  );
  const r = res.rows[0]!;
  return { id: Number(r.id), createdAt: new Date(r.created_at).toISOString() };
}

export async function listResults(
  pool: Pool,
  opts: { appId: string; deviceId?: string; limit: number },
): Promise<ResultRecord[]> {
  if (opts.deviceId !== undefined) {
    const res = await pool.query<ResultRow>(
      `SELECT * FROM results
       WHERE app_id = $1 AND device_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [opts.appId, opts.deviceId, opts.limit],
    );
    return res.rows.map(toRecord);
  }
  const res = await pool.query<ResultRow>(
    `SELECT * FROM results
     WHERE app_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [opts.appId, opts.limit],
  );
  return res.rows.map(toRecord);
}

/** Rows in a time range for analytics aggregation (server-side recompute). */
export async function listForAnalytics(
  pool: Pool,
  opts: { appId?: string | null; from?: string; to?: string },
): Promise<ResultRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.appId) {
    params.push(opts.appId);
    clauses.push(`app_id = $${params.length}`);
  }
  if (opts.from) {
    params.push(opts.from);
    clauses.push(`created_at >= $${params.length}`);
  }
  if (opts.to) {
    params.push(opts.to);
    clauses.push(`created_at <= $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await pool.query<ResultRow>(
    `SELECT * FROM results ${where} ORDER BY created_at ASC`,
    params,
  );
  return res.rows;
}

function num(v: string | number | null): number {
  return v === null ? 0 : typeof v === 'number' ? v : Number(v);
}

function toRecord(r: ResultRow): ResultRecord {
  const rec: ResultRecord = {
    id: Number(r.id),
    appId: r.app_id,
    deviceId: r.device_id,
    downloadMbps: num(r.download_mbps),
    uploadMbps: num(r.upload_mbps),
    latencyMs: num(r.latency_ms),
    jitterMs: num(r.jitter_ms),
    packetLossPct: num(r.packet_loss_pct),
    createdAt: new Date(r.created_at).toISOString(),
  };
  if (r.score !== null) rec.score = r.score;
  return rec;
}
