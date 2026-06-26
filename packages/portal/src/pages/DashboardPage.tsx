import { useAnalytics } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { KpiCard } from '@/components/KpiCard';
import { LatencyTrendChart } from '@/components/LatencyTrendChart';
import { PassRateChart } from '@/components/PassRateChart';
import { ErrorBanner } from '@/components/ErrorBanner';
import { fmtMs, fmtPct } from '@/lib/format';

export function DashboardPage() {
  const { role } = useAuth();
  const { data, isLoading, error } = useAnalytics();

  const scope = role === 'admin' ? 'organisation-wide' : 'your app';

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Connection-quality at a glance — {scope}.</p>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Loading analytics…</p>
      ) : data ? (
        <>
          <div className="kpi-grid">
            <KpiCard label="Tests today" value={String(data.kpis.testsToday)} hint={`${data.kpis.totalTests} in range`} />
            <KpiCard label="Pass rate" value={fmtPct(data.kpis.passRatePct)} />
            <KpiCard label="Avg latency" value={fmtMs(data.kpis.avgLatencyMs)} />
            <KpiCard label="Fallback rate" value={fmtPct(data.kpis.fallbackRatePct)} hint={`${data.kpis.distinctDevices} devices`} />
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Latency trend</h3>
              <LatencyTrendChart data={data.latencyTrend} />
            </div>
            <div className="card chart-card">
              <h3>Pass rate by profile</h3>
              <PassRateChart data={data.passRateByProfile} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
