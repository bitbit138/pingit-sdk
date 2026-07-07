import type { AnalyticsSummary, ProfileId, Role } from '@pingit/contracts';
import type { Pool } from '../db/pool.js';
import { getKpis, getDailyTrend, getPassRateByProfile } from '../db/repositories/analytics.repo.js';

interface ComputeOpts {
  appId: string | null;
  from?: string;
  to?: string;
  role: Role;
}

/**
 * All three aggregates run as SQL (COUNT/AVG/GROUP BY), not by pulling raw
 * result rows into the process — so this stays cheap as the results table
 * grows.
 */
export async function computeAnalytics(pool: Pool, opts: ComputeOpts): Promise<AnalyticsSummary> {
  const filters = { appId: opts.appId, from: opts.from, to: opts.to };
  const [kpis, trend, passRows] = await Promise.all([
    getKpis(pool, filters),
    getDailyTrend(pool, filters),
    getPassRateByProfile(pool, filters),
  ]);

  const passRateByProfile = passRows.map((row) => ({
    profile: row.profile_id as ProfileId,
    passRatePct: row.total ? round1((row.pass_count / row.total) * 100) : 0,
    count: row.total,
  }));

  const overallPassRatePct = passRateByProfile.length
    ? round1(passRateByProfile.reduce((s, p) => s + p.passRatePct, 0) / passRateByProfile.length)
    : 0;

  return {
    scope: { appId: opts.appId, role: opts.role },
    range: { from: opts.from ?? '', to: opts.to ?? '' },
    kpis: {
      testsToday: kpis.tests_today,
      passRatePct: overallPassRatePct,
      avgLatencyMs: round1(kpis.avg_latency_ms),
      fallbackRatePct: 0, // not tracked
      totalTests: kpis.total_tests,
      distinctDevices: kpis.distinct_devices,
    },
    passRateByProfile,
    latencyTrend: trend.map((t) => ({ date: t.day, avgLatencyMs: round1(t.avg_latency_ms) })),
    testCounts: trend.map((t) => ({ date: t.day, count: t.count })),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
