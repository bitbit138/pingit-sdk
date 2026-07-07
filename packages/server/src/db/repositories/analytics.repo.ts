import type { MetricKey, ProfileId } from '@pingit/contracts';
import type { Pool } from '../pool.js';

export interface AnalyticsFilters {
  appId?: string | null;
  from?: string;
  to?: string;
}

export interface AnalyticsKpisRow {
  total_tests: number;
  tests_today: number;
  avg_latency_ms: number;
  distinct_devices: number;
}

export interface DailyTrendRow {
  day: string;
  avg_latency_ms: number;
  count: number;
}

export interface ProfilePassRow {
  profile_id: ProfileId;
  total: number;
  pass_count: number;
}

/** Builds `alias.column op $n` clauses for the shared appId/from/to filters. */
function buildFilters(opts: AnalyticsFilters, alias: string): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.appId) {
    params.push(opts.appId);
    clauses.push(`${alias}.app_id = $${params.length}`);
  }
  if (opts.from) {
    params.push(opts.from);
    clauses.push(`${alias}.created_at >= $${params.length}`);
  }
  if (opts.to) {
    params.push(opts.to);
    clauses.push(`${alias}.created_at <= $${params.length}`);
  }
  return { sql: clauses.length ? clauses.join(' AND ') : 'TRUE', params };
}

/** Total/today/avg-latency/distinct-devices in one aggregate query — no rows leave Postgres. */
export async function getKpis(pool: Pool, filters: AnalyticsFilters): Promise<AnalyticsKpisRow> {
  const { sql: where, params } = buildFilters(filters, 'results');
  const res = await pool.query<AnalyticsKpisRow>(
    `SELECT
       COUNT(*)::int AS total_tests,
       COUNT(*) FILTER (
         WHERE (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date
       )::int AS tests_today,
       COALESCE(AVG(COALESCE(latency_ms, 0)), 0)::float8 AS avg_latency_ms,
       COUNT(DISTINCT device_id)::int AS distinct_devices
     FROM results
     WHERE ${where}`,
    params,
  );
  return res.rows[0]!;
}

/** Per-UTC-day average latency and test count, grouped and sorted in SQL. */
export async function getDailyTrend(pool: Pool, filters: AnalyticsFilters): Promise<DailyTrendRow[]> {
  const { sql: where, params } = buildFilters(filters, 'results');
  const res = await pool.query<DailyTrendRow>(
    `SELECT
       (created_at AT TIME ZONE 'UTC')::date::text AS day,
       AVG(COALESCE(latency_ms, 0))::float8 AS avg_latency_ms,
       COUNT(*)::int AS count
     FROM results
     WHERE ${where}
     GROUP BY day
     ORDER BY day ASC`,
    params,
  );
  return res.rows;
}

const METRIC_COLUMNS: Array<{ key: MetricKey; column: string }> = [
  { key: 'downloadMbps', column: 'download_mbps' },
  { key: 'uploadMbps', column: 'upload_mbps' },
  { key: 'latencyMs', column: 'latency_ms' },
  { key: 'jitterMs', column: 'jitter_ms' },
  { key: 'packetLossPct', column: 'packet_loss_pct' },
];

/** A result passes a profile when every metric the profile constrains is within bound. */
const PASS_CONDITION = METRIC_COLUMNS.map(
  ({ key, column }) => `
    (p.requires->'${key}'->>'min' IS NULL OR COALESCE(r.${column}, 0) >= (p.requires->'${key}'->>'min')::numeric)
    AND (p.requires->'${key}'->>'max' IS NULL OR COALESCE(r.${column}, 0) <= (p.requires->'${key}'->>'max')::numeric)`,
).join(' AND ');

/**
 * Pass/total per profile, re-evaluated against stored metrics. A LEFT JOIN
 * (filters applied in ON, not WHERE) keeps every profile in the result even
 * when it has zero matching results.
 */
export async function getPassRateByProfile(
  pool: Pool,
  filters: AnalyticsFilters,
): Promise<ProfilePassRow[]> {
  const { sql: on, params } = buildFilters(filters, 'r');
  const res = await pool.query<ProfilePassRow>(
    `SELECT
       p.id AS profile_id,
       COUNT(r.id)::int AS total,
       COUNT(r.id) FILTER (WHERE ${PASS_CONDITION})::int AS pass_count
     FROM profiles p
     LEFT JOIN results r ON ${on}
     GROUP BY p.id
     ORDER BY p.id`,
    params,
  );
  return res.rows;
}
