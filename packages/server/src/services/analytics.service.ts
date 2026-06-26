import type { AnalyticsSummary, MetricKey, ProfileId, Requires, Role } from '@pingit/contracts';
import { METRIC_KEYS } from '@pingit/contracts';
import type { Pool } from '../db/pool.js';
import type { ResultRow } from '../types.js';
import { listForAnalytics } from '../db/repositories/results.repo.js';
import { listAdmin } from '../db/repositories/profiles.repo.js';

interface ComputeOpts {
  appId: string | null;
  from?: string;
  to?: string;
  role: Role;
}

/** Measured metric values pulled from a stored result row. */
type Measured = Record<MetricKey, number>;

function num(v: string | number | null): number {
  return v === null ? 0 : typeof v === 'number' ? v : Number(v);
}

function toMeasured(r: ResultRow): Measured {
  return {
    downloadMbps: num(r.download_mbps),
    uploadMbps: num(r.upload_mbps),
    latencyMs: num(r.latency_ms),
    jitterMs: num(r.jitter_ms),
    packetLossPct: num(r.packet_loss_pct),
  };
}

/** Re-evaluate a measured result against a profile's `requires`. */
function passes(measured: Measured, requires: Requires): boolean {
  for (const key of METRIC_KEYS) {
    const bound = requires[key];
    if (!bound) continue;
    const value = measured[key];
    if (bound.min !== undefined && value < bound.min) return false;
    if (bound.max !== undefined && value > bound.max) return false;
  }
  return true;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function computeAnalytics(pool: Pool, opts: ComputeOpts): Promise<AnalyticsSummary> {
  const [rows, profiles] = await Promise.all([
    listForAnalytics(pool, { appId: opts.appId, from: opts.from, to: opts.to }),
    listAdmin(pool),
  ]);

  const totalTests = rows.length;
  const devices = new Set<string>();
  let latencySum = 0;

  const todayKey = dayKey(new Date());
  let testsToday = 0;

  // pass-rate per profile (re-evaluated server-side against stored metrics)
  const profilePass = new Map<string, { pass: number; count: number }>();
  for (const p of profiles) profilePass.set(p.id, { pass: 0, count: 0 });

  // overall pass: a result "passes" if it satisfies ALL profiles it is evaluated
  // against; we report passRatePct as the mean per-profile pass rate.
  const latencyByDay = new Map<string, { sum: number; count: number }>();
  const countByDay = new Map<string, number>();

  for (const r of rows) {
    const measured = toMeasured(r);
    devices.add(r.device_id);
    latencySum += measured.latencyMs;

    const created = new Date(r.created_at);
    const key = dayKey(created);
    if (key === todayKey) testsToday += 1;

    const lat = latencyByDay.get(key) ?? { sum: 0, count: 0 };
    lat.sum += measured.latencyMs;
    lat.count += 1;
    latencyByDay.set(key, lat);

    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);

    for (const p of profiles) {
      const agg = profilePass.get(p.id)!;
      agg.count += 1;
      if (passes(measured, p.requires)) agg.pass += 1;
    }
  }

  const passRateByProfile = profiles.map((p) => {
    const agg = profilePass.get(p.id)!;
    return {
      profile: p.id as ProfileId,
      passRatePct: agg.count ? round1((agg.pass / agg.count) * 100) : 0,
      count: agg.count,
    };
  });

  const overallPassRatePct = passRateByProfile.length
    ? round1(passRateByProfile.reduce((s, p) => s + p.passRatePct, 0) / passRateByProfile.length)
    : 0;

  const latencyTrend = [...latencyByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, avgLatencyMs: round1(v.sum / v.count) }));

  const testCounts = [...countByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    scope: { appId: opts.appId, role: opts.role },
    range: { from: opts.from ?? '', to: opts.to ?? '' },
    kpis: {
      testsToday,
      passRatePct: overallPassRatePct,
      avgLatencyMs: totalTests ? round1(latencySum / totalTests) : 0,
      fallbackRatePct: 0, // not tracked
      totalTests,
      distinctDevices: devices.size,
    },
    passRateByProfile,
    latencyTrend,
    testCounts,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
