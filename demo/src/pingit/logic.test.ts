import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate';
import { label, score } from './score';
import type { Metrics, Requires } from './types';

const VIDEO_CALL: Requires = {
  downloadMbps: { min: 1.5 },
  uploadMbps: { min: 1.0 },
  latencyMs: { max: 200 },
  jitterMs: { max: 40 },
  packetLossPct: { max: 3 },
};

const strong: Metrics = { downloadMbps: 50, uploadMbps: 20, latencyMs: 20, jitterMs: 5, packetLossPct: 0 };

describe('evaluate (mirrors SDK Evaluator)', () => {
  it('passes a strong link', () => {
    expect(evaluate(VIDEO_CALL, strong)).toEqual({ passed: true, reason: 'ok' });
  });

  it('reports each failing metric with the SDK reason string', () => {
    expect(evaluate(VIDEO_CALL, { ...strong, downloadMbps: 0.5 }).reason).toBe('download too low');
    expect(evaluate(VIDEO_CALL, { ...strong, uploadMbps: 0.5 }).reason).toBe('upload too low');
    expect(evaluate(VIDEO_CALL, { ...strong, latencyMs: 300 }).reason).toBe('latency too high');
    expect(evaluate(VIDEO_CALL, { ...strong, jitterMs: 80 }).reason).toBe('jitter too high');
    expect(evaluate(VIDEO_CALL, { ...strong, packetLossPct: 10 }).reason).toBe('packet loss too high');
  });

  it('short-circuits on the first failing metric in order', () => {
    const v = evaluate(VIDEO_CALL, { ...strong, downloadMbps: 0.5, latencyMs: 300 });
    expect(v.reason).toBe('download too low');
  });

  it('skips unconstrained metrics (null range)', () => {
    const onlyDownload: Requires = { downloadMbps: { min: 5 } };
    expect(evaluate(onlyDownload, { ...strong, latencyMs: 9999 }).passed).toBe(true);
  });
});

describe('score/label (mirrors SDK Score)', () => {
  it('rates a great link Excellent', () => {
    const s = score({ downloadMbps: 100, uploadMbps: 50, latencyMs: 10, jitterMs: 2, packetLossPct: 0 });
    expect(s).toBeGreaterThanOrEqual(85);
    expect(label(s)).toBe('Excellent');
  });

  it('rates a terrible link Poor', () => {
    const s = score({ downloadMbps: 0.1, uploadMbps: 0, latencyMs: 800, jitterMs: 200, packetLossPct: 50 });
    expect(s).toBeLessThan(40);
    expect(label(s)).toBe('Poor');
  });

  it('clamps to 0..100', () => {
    const s = score({ downloadMbps: 1e6, uploadMbps: 1e6, latencyMs: 0, jitterMs: 0, packetLossPct: 0 });
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});
