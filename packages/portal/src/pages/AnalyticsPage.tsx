import { useState } from 'react';
import { useAnalytics } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { PassRateChart } from '@/components/PassRateChart';
import { LatencyTrendChart } from '@/components/LatencyTrendChart';
import { TestCountChart } from '@/components/TestCountChart';
import { ErrorBanner } from '@/components/ErrorBanner';

/** Default the range to the trailing 30 days as YYYY-MM-DD. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const { role } = useAuth();
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [from, setFrom] = useState(isoDay(monthAgo));
  const [to, setTo] = useState(isoDay(today));

  const { data, isLoading, error } = useAnalytics({ from, to });

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>{role === 'admin' ? 'Organisation-wide trends.' : 'Trends for your app.'}</p>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="from">From</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="to">To</label>
            <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Loading analytics…</p>
      ) : data ? (
        <div className="stack">
          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Pass rate by profile</h3>
              <PassRateChart data={data.passRateByProfile} />
            </div>
            <div className="card chart-card">
              <h3>Latency trend</h3>
              <LatencyTrendChart data={data.latencyTrend} />
            </div>
          </div>
          <div className="card chart-card">
            <h3>Test counts</h3>
            <TestCountChart data={data.testCounts} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
