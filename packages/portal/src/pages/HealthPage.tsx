import { useHealth } from '@/api/queries';
import { ErrorBanner } from '@/components/ErrorBanner';

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}h ${m}m ${s}s`;
}

export function HealthPage() {
  const { data, isLoading, error } = useHealth();
  const ok = data?.status === 'ok' || data?.status === 'healthy';

  return (
    <div>
      <div className="page-header">
        <h1>Health</h1>
        <p>Live status of the measurement server (auto-refreshes).</p>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Checking…</p>
      ) : data ? (
        <div className="card stack" style={{ maxWidth: 420 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="kpi__label">Status</span>
            <span className={ok ? 'badge badge--ok' : 'badge badge--bad'}>{data.status}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="kpi__label">Uptime</span>
            <strong>{fmtUptime(data.uptimeSec)}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
