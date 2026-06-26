/**
 * The five connection-quality metrics PingIt measures, and the threshold shape
 * used by readiness profiles.
 *
 * Semantics of a bound:
 *   - `min` → the measured value must be >= min   (e.g. downloadMbps min 1.5)
 *   - `max` → the measured value must be <= max   (e.g. latencyMs max 200)
 */
export const METRIC_KEYS = [
  'downloadMbps',
  'uploadMbps',
  'latencyMs',
  'jitterMs',
  'packetLossPct',
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export interface MetricBound {
  min?: number;
  max?: number;
}

/** A profile only constrains the metrics it cares about. */
export type Requires = Partial<Record<MetricKey, MetricBound>>;
