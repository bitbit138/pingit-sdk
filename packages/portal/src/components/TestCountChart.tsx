import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsSummary } from '@pingit/contracts';
import { fmtDay } from '@/lib/format';

export function TestCountChart({ data }: { data: AnalyticsSummary['testCounts'] }) {
  if (!data || data.length === 0) return <p className="muted">No test counts for this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3eaf1" />
        <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={12} stroke="#5b6b7b" />
        <YAxis allowDecimals={false} fontSize={12} stroke="#5b6b7b" />
        <Tooltip
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(v: number) => [v, 'Tests']}
        />
        <Bar dataKey="count" fill="#147a92" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
