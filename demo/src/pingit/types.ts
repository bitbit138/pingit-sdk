// Minimal types mirroring the PingIt SDK's public model (vendored so the demo
// stays independent of the monorepo).

export type ProfileId =
  | 'MESSAGING'
  | 'WEB_BROWSING'
  | 'MUSIC_STREAMING'
  | 'VOICE_CALL'
  | 'VIDEO_CALL'
  | 'HD_STREAMING'
  | 'UHD_4K_STREAMING'
  | 'CLOUD_GAMING'
  | 'LIVE_BROADCAST'
  | 'LARGE_UPLOAD';

export interface Range {
  min?: number;
  max?: number;
}

export interface Requires {
  downloadMbps?: Range;
  uploadMbps?: Range;
  latencyMs?: Range;
  jitterMs?: Range;
  packetLossPct?: Range;
}

export interface ProfileSpec {
  id: ProfileId;
  requires: Requires;
}

export interface ProfileTable {
  version: number;
  profiles: ProfileSpec[];
}

/** The five raw measured metrics. */
export interface Metrics {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
}

/** Output of a measurement run (mirrors the SDK's TestResult). */
export interface TestResult extends Metrics {
  score: number;
  label: string;
  timestamp: number;
}

export interface Verdict {
  passed: boolean;
  reason: string;
}

/** Output of isReadyFor (mirrors the SDK's ReadinessResult). */
export interface ReadinessResult {
  profile: ProfileId;
  passed: boolean;
  reason: string;
  measured: TestResult | null;
}
