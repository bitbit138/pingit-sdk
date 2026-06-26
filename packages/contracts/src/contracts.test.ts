import { describe, it, expect } from 'vitest';
import { CANONICAL_PROFILES, SEED_VERSION } from './seed';
import { profilesResponseSchema, resultSubmissionSchema } from './schemas';
import { PROFILE_IDS } from './profiles';

describe('canonical profiles', () => {
  it('contains exactly the 10 known profile ids', () => {
    expect(CANONICAL_PROFILES.map((p) => p.id).sort()).toEqual([...PROFILE_IDS].sort());
  });

  it('passes schema validation as a /profiles response', () => {
    expect(() =>
      profilesResponseSchema.parse({ version: SEED_VERSION, profiles: CANONICAL_PROFILES }),
    ).not.toThrow();
  });

  it('matches the documented VIDEO_CALL thresholds verbatim', () => {
    const v = CANONICAL_PROFILES.find((p) => p.id === 'VIDEO_CALL');
    expect(v?.requires).toEqual({
      downloadMbps: { min: 1.5 },
      uploadMbps: { min: 1.0 },
      latencyMs: { max: 200 },
      jitterMs: { max: 40 },
      packetLossPct: { max: 3 },
    });
  });

  it('matches the documented CLOUD_GAMING thresholds verbatim', () => {
    const g = CANONICAL_PROFILES.find((p) => p.id === 'CLOUD_GAMING');
    expect(g?.requires).toEqual({
      downloadMbps: { min: 15.0 },
      latencyMs: { max: 40 },
      jitterMs: { max: 10 },
    });
  });
});

describe('result submission schema', () => {
  it('rejects a payload missing deviceId', () => {
    const r = resultSubmissionSchema.safeParse({
      appId: 'app_1',
      downloadMbps: 10,
      uploadMbps: 2,
      latencyMs: 30,
      jitterMs: 5,
      packetLossPct: 0,
    });
    expect(r.success).toBe(false);
  });
});
