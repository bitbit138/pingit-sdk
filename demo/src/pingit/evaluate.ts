// Faithful TypeScript port of the SDK's eval/Evaluator.kt — same fixed order
// (download → upload → latency → jitter → loss), same first-failing reason
// strings, same null-range skipping.
import type { Metrics, Range, Requires, Verdict } from './types';

function belowMin(range: Range | undefined, value: number): boolean {
  if (range?.min == null) return false;
  return value < range.min;
}

function aboveMax(range: Range | undefined, value: number): boolean {
  if (range?.max == null) return false;
  return value > range.max;
}

export function evaluate(requires: Requires, m: Metrics): Verdict {
  if (belowMin(requires.downloadMbps, m.downloadMbps)) return { passed: false, reason: 'download too low' };
  if (belowMin(requires.uploadMbps, m.uploadMbps)) return { passed: false, reason: 'upload too low' };
  if (aboveMax(requires.latencyMs, m.latencyMs)) return { passed: false, reason: 'latency too high' };
  if (aboveMax(requires.jitterMs, m.jitterMs)) return { passed: false, reason: 'jitter too high' };
  if (aboveMax(requires.packetLossPct, m.packetLossPct)) return { passed: false, reason: 'packet loss too high' };
  return { passed: true, reason: 'ok' };
}
