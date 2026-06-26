import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsSummary } from '@pingit/contracts';
import { fmtDay, fmtMs } from '@/lib/format';

export function LatencyTrendChart({ data }: { data: AnalyticsSummary['latencyTrend'] }) {
  if (!data || data.length === 0) return <p className="muted">No latency data for this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3eaf1" />
        <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={12} stroke="#5b6b7b" />
        <YAxis fontSize={12} stroke="#5b6b7b" />
        <Tooltip
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(v: number) => [fmtMs(v), 'Avg latency']}
        />
        <Line
          type="monotone"
          dataKey="avgLatencyMs"
          stroke="#1fa8c9"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
