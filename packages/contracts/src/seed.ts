import type { Profile } from './profiles';

/** Initial profiles version (bumped server-side on any edit). */
export const SEED_VERSION = 1;

/**
 * The canonical readiness thresholds — the SINGLE SOURCE OF TRUTH.
 *
 *   - The server seeds the Postgres `profiles` table from this.
 *   - The contracts build emits dist/profiles.json from this, which is copied
 *     into the Android SDK as bundled (offline) defaults.
 *
 * VIDEO_CALL and CLOUD_GAMING are verbatim from SERVER_ARCHITECTURE.md; the rest
 * are documented "starting values" and are tunable later via the portal.
 *
 *   min  = measured must be >=   (download/upload floors)
 *   max  = measured must be <=   (latency/jitter/loss ceilings)
 */
export const CANONICAL_PROFILES: Profile[] = [
  { id: 'MESSAGING', requires: { downloadMbps: { min: 0.1 }, latencyMs: { max: 1000 }, packetLossPct: { max: 10 } } },
  { id: 'WEB_BROWSING', requires: { downloadMbps: { min: 1.0 }, latencyMs: { max: 500 }, packetLossPct: { max: 8 } } },
  { id: 'MUSIC_STREAMING', requires: { downloadMbps: { min: 0.5 }, latencyMs: { max: 600 }, packetLossPct: { max: 8 } } },
  {
    id: 'VOICE_CALL',
    requires: {
      downloadMbps: { min: 0.1 },
      uploadMbps: { min: 0.1 },
      latencyMs: { max: 300 },
      jitterMs: { max: 30 },
      packetLossPct: { max: 5 },
    },
  },
  {
    id: 'VIDEO_CALL',
    requires: {
      downloadMbps: { min: 1.5 },
      uploadMbps: { min: 1.0 },
      latencyMs: { max: 200 },
      jitterMs: { max: 40 },
      packetLossPct: { max: 3 },
    },
  },
  { id: 'HD_STREAMING', requires: { downloadMbps: { min: 5.0 }, latencyMs: { max: 500 }, packetLossPct: { max: 5 } } },
  { id: 'UHD_4K_STREAMING', requires: { downloadMbps: { min: 25.0 }, latencyMs: { max: 500 }, packetLossPct: { max: 5 } } },
  { id: 'CLOUD_GAMING', requires: { downloadMbps: { min: 15.0 }, latencyMs: { max: 40 }, jitterMs: { max: 10 } } },
  {
    id: 'LIVE_BROADCAST',
    requires: {
      downloadMbps: { min: 2.0 },
      uploadMbps: { min: 5.0 },
      latencyMs: { max: 150 },
      jitterMs: { max: 30 },
      packetLossPct: { max: 2 },
    },
  },
  { id: 'LARGE_UPLOAD', requires: { uploadMbps: { min: 10.0 }, latencyMs: { max: 1000 }, packetLossPct: { max: 5 } } },
];
