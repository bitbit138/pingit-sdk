import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsSummary } from '@pingit/contracts';
import { fmtPct } from '@/lib/format';

function barColor(pct: number): string {
  if (pct >= 90) return '#2eb872';
  if (pct >= 70) return '#e0a234';
  return '#d6504a';
}

export function PassRateChart({ data }: { data: AnalyticsSummary['passRateByProfile'] }) {
  if (!data || data.length === 0) return <p className="muted">No profile results for this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3eaf1" />
        <XAxis dataKey="profile" fontSize={10} stroke="#5b6b7b" interval={0} angle={-35} textAnchor="end" height={70} />
        <YAxis domain={[0, 100]} fontSize={12} stroke="#5b6b7b" />
        <Tooltip formatter={(v: number) => [fmtPct(v), 'Pass rate']} />
        <Bar dataKey="passRatePct" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.profile} fill={barColor(d.passRatePct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
