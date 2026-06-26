import type { Metrics } from '../pingit/types';

export function RawMetricsPanel({
  metrics,
  appId,
  deviceId,
  reported,
}: {
  metrics: Metrics & { score?: number; label?: string };
  appId: string;
  deviceId: string;
  reported: boolean;
}) {
  const rows: Array<[string, string]> = [
    ['Download', `${metrics.downloadMbps.toFixed(1)} Mbps`],
    ['Upload', `${metrics.uploadMbps.toFixed(1)} Mbps`],
    ['Latency', `${metrics.latencyMs.toFixed(0)} ms`],
    ['Jitter', `${metrics.jitterMs.toFixed(0)} ms`],
    ['Packet loss', `${metrics.packetLossPct.toFixed(0)} %`],
  ];
  if (metrics.score != null) rows.push(['Score', `${metrics.score}/100 (${metrics.label ?? ''})`]);

  return (
    <div className="raw">
      <table className="raw__table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="raw__meta">
        <code>appId={appId}</code>
        <code>deviceId={deviceId.slice(0, 8)}...</code>
        <span className={reported ? 'ok' : 'muted'}>
          {reported ? 'reported to server' : 'not reported'}
        </span>
      </div>
    </div>
  );
}
