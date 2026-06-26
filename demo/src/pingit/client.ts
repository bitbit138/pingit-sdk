// A thin JavaScript client that talks to the PingIt server exactly the way the
// Android SDK does — measure against /download, /upload, /ping; fetch /profiles;
// decide readiness with the ported Score + Evaluator; optionally POST /results.
// Isomorphic: uses global `fetch` + `performance` (works in the browser and Node).
import { PINGIT_APP_ID, PINGIT_ENDPOINT } from './config';
import { evaluate } from './evaluate';
import { label, score } from './score';
import type { Metrics, ProfileId, ProfileTable, ReadinessResult, Requires, TestResult } from './types';

export interface PingItConfig {
  endpoint?: string;
  appId?: string;
}

export interface MeasureOptions {
  downloadBytes?: number;
  uploadBytes?: number;
  pingCount?: number;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** RFC 3550 mean absolute deviation between consecutive RTTs. */
function jitterOf(rtts: number[]): number {
  if (rtts.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < rtts.length; i++) sum += Math.abs(rtts[i] - rtts[i - 1]);
  return sum / (rtts.length - 1);
}

export class PingItClient {
  readonly endpoint: string;
  readonly appId: string;
  private profilesCache: ProfileTable | null = null;

  constructor(cfg: PingItConfig = {}) {
    this.endpoint = cfg.endpoint ?? PINGIT_ENDPOINT;
    this.appId = cfg.appId ?? PINGIT_APP_ID;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { 'x-app-id': this.appId, ...extra };
  }

  /** GET /profiles (cached). Normalizes {version,profiles} or a bare array. */
  async getProfiles(force = false): Promise<ProfileTable> {
    if (this.profilesCache && !force) return this.profilesCache;
    const res = await fetch(`${this.endpoint}/profiles`, { headers: this.headers() });
    if (!res.ok) throw new Error(`/profiles → ${res.status}`);
    const body: unknown = await res.json();
    const table: ProfileTable = Array.isArray(body)
      ? { version: 0, profiles: body }
      : (body as ProfileTable);
    this.profilesCache = table;
    return table;
  }

  async measureDownloadMbps(bytes: number): Promise<number> {
    const t0 = performance.now();
    const res = await fetch(`${this.endpoint}/download?bytes=${bytes}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`/download → ${res.status}`);
    const buf = await res.arrayBuffer();
    const seconds = (performance.now() - t0) / 1000;
    return seconds > 0 ? (buf.byteLength * 8) / seconds / 1e6 : 0;
  }

  async measureUploadMbps(bytes: number): Promise<number> {
    const payload = new Uint8Array(bytes);
    const t0 = performance.now();
    const res = await fetch(`${this.endpoint}/upload`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/octet-stream' }),
      body: payload,
    });
    if (!res.ok) throw new Error(`/upload → ${res.status}`);
    await res.json().catch(() => ({}));
    const seconds = (performance.now() - t0) / 1000;
    return seconds > 0 ? (bytes * 8) / seconds / 1e6 : 0;
  }

  async measurePings(count: number): Promise<{ latencyMs: number; jitterMs: number }> {
    const rtts: number[] = [];
    for (let i = 0; i < count; i++) {
      const t0 = performance.now();
      const res = await fetch(`${this.endpoint}/ping`, { headers: this.headers() });
      await res.text().catch(() => '');
      rtts.push(performance.now() - t0);
    }
    return { latencyMs: mean(rtts), jitterMs: jitterOf(rtts) };
  }

  /** Full measurement → TestResult (download, upload, latency, jitter, score, label). */
  async runTest(opts: MeasureOptions = {}): Promise<TestResult> {
    const downloadBytes = opts.downloadBytes ?? 4_000_000;
    const uploadBytes = opts.uploadBytes ?? 2_000_000;
    const pingCount = opts.pingCount ?? 10;

    const downloadMbps = await this.measureDownloadMbps(downloadBytes);
    const uploadMbps = await this.measureUploadMbps(uploadBytes);
    const { latencyMs, jitterMs } = await this.measurePings(pingCount);

    // v1 doesn't measure packet loss (matches the SDK).
    const metrics: Metrics = { downloadMbps, uploadMbps, latencyMs, jitterMs, packetLossPct: 0 };
    const s = score(metrics);
    return { ...metrics, score: s, label: label(s), timestamp: Date.now() };
  }

  /** Decide a single profile against an already-measured (or freshly measured) result. */
  async isReadyFor(profileId: ProfileId, measured?: TestResult): Promise<ReadinessResult> {
    const table = await this.getProfiles();
    const spec = table.profiles.find((p) => p.id === profileId);
    const result = measured ?? (await this.runTest());
    if (!spec) return { profile: profileId, passed: true, reason: 'ok', measured: result };
    const verdict = evaluate(spec.requires, result);
    return { profile: profileId, passed: verdict.passed, reason: verdict.reason, measured: result };
  }

  /** Pure helper: evaluate arbitrary metrics against a profile's requirements. */
  evaluateAgainst(requires: Requires, metrics: Metrics) {
    return evaluate(requires, metrics);
  }

  /** POST /results so the portal's analytics/history reflect this device. */
  async postResult(measured: Metrics & { score?: number }, deviceId: string): Promise<void> {
    await fetch(`${this.endpoint}/results`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        appId: this.appId,
        deviceId,
        downloadMbps: round(measured.downloadMbps),
        uploadMbps: round(measured.uploadMbps),
        latencyMs: round(measured.latencyMs),
        jitterMs: round(measured.jitterMs),
        packetLossPct: round(measured.packetLossPct),
        score: measured.score,
      }),
    });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Mirrors the SDK's `PingIt.init(appId, config)` entry point. */
export function init(cfg: PingItConfig = {}): PingItClient {
  return new PingItClient(cfg);
}
