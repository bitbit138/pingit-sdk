import { useAnalytics } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { LatencyTrendChart } from '@/components/LatencyTrendChart';
import { DataTable, type Column } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { fmtDay, fmtMs } from '@/lib/format';

/** One merged daily row built from the analytics trend series. */
interface HistoryRow {
  date: string;
  count: number;
  avgLatencyMs: number | null;
}

export function HistoryPage() {
  const { role } = useAuth();
  const { data, isLoading, error } = useAnalytics();

  // Merge testCounts + latencyTrend into a single per-day history table.
  const latencyByDate = new Map<string, number>(
    (data?.latencyTrend ?? []).map((d) => [d.date, d.avgLatencyMs]),
  );
  const rows: HistoryRow[] = (data?.testCounts ?? [])
    .map((d) => ({
      date: d.date,
      count: d.count,
      avgLatencyMs: latencyByDate.get(d.date) ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const columns: Column<HistoryRow>[] = [
    { key: 'date', header: 'Date', render: (r) => fmtDay(r.date) },
    { key: 'count', header: 'Tests', render: (r) => r.count },
    { key: 'latency', header: 'Avg latency', render: (r) => fmtMs(r.avgLatencyMs) },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>History</h1>
        <p>{role === 'admin' ? 'Recent measurement history (org-wide).' : 'Recent measurement history for your app.'}</p>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Loading history…</p>
      ) : data ? (
        <div className="stack">
          <div className="card chart-card">
            <h3>Latency trend</h3>
            <LatencyTrendChart data={data.latencyTrend} />
          </div>
          <div className="card">
            <h3>Daily results</h3>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.date}
              emptyMessage="No history in range."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
