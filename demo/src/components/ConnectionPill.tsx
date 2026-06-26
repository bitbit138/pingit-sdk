import type { TestResult } from '../pingit/types';

function toneFor(label: string): string {
  switch (label) {
    case 'Excellent':
      return 'good';
    case 'Good':
      return 'good';
    case 'Fair':
      return 'fair';
    default:
      return 'poor';
  }
}

export function ConnectionPill({ result, busy }: { result: TestResult | null; busy: boolean }) {
  if (busy) {
    return <span className="pill pill--neutral">Checking connection…</span>;
  }
  if (!result) {
    return <span className="pill pill--neutral">Connection unknown</span>;
  }
  return (
    <span className={`pill pill--${toneFor(result.label)}`} title={`score ${result.score}/100`}>
      {result.label} · {Math.round(result.downloadMbps)} Mbps · {Math.round(result.latencyMs)} ms
    </span>
  );
}
