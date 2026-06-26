// Faithful TypeScript port of the SDK's score/Score.kt — identical weights,
// normalization, and label buckets, so the demo scores exactly like the SDK.
import type { Metrics } from './types';

/** "more is better" → 0..1, reaching 1.0 at `full`. */
function saturating(value: number, full: number): number {
  if (value <= 0) return 0;
  return Math.min(1, value / full);
}

/** "less is better" → 1.0 at/below `good`, 0.0 at/above `bad`, linear between. */
function decreasing(value: number, good: number, bad: number): number {
  if (value <= good) return 1;
  if (value >= bad) return 0;
  return Math.max(0, 1 - (value - good) / (bad - good));
}

/** Weighted 0..100 score (download .35, upload .15, latency .25, jitter .10, loss .15). */
export function score(m: Metrics): number {
  const combined =
    0.35 * saturating(m.downloadMbps, 25) +
    0.15 * saturating(m.uploadMbps, 10) +
    0.25 * decreasing(m.latencyMs, 20, 300) +
    0.1 * decreasing(m.jitterMs, 5, 60) +
    0.15 * decreasing(m.packetLossPct, 0, 10);
  // Kotlin `.toInt()` truncates toward zero.
  return Math.min(100, Math.max(0, Math.trunc(combined * 100)));
}

/** Bucket a score into a human label (matches the SDK). */
export function label(s: number): string {
  if (s < 40) return 'Poor';
  if (s < 60) return 'Fair';
  if (s < 85) return 'Good';
  return 'Excellent';
}
