import { z } from 'zod';
import { METRIC_KEYS } from './metrics';
import { PROFILE_IDS } from './profiles';

/** A single metric bound — must carry at least one of min/max. */
export const metricBoundSchema = z
  .object({ min: z.number().optional(), max: z.number().optional() })
  .refine((b) => b.min !== undefined || b.max !== undefined, {
    message: 'metric bound needs min or max',
  });

/** `requires` object: optional bound per known metric. */
export const requiresSchema = z.object(
  Object.fromEntries(METRIC_KEYS.map((k) => [k, metricBoundSchema.optional()])),
);

export const profileIdSchema = z.enum(PROFILE_IDS);

export const profileSchema = z.object({
  id: profileIdSchema,
  requires: requiresSchema,
});

export const profilesResponseSchema = z.object({
  version: z.number().int().nonnegative(),
  profiles: z.array(profileSchema),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createAppSchema = z.object({
  name: z.string().min(1).max(120),
  ownerEmail: z.string().email().optional(),
});

export const resultSubmissionSchema = z.object({
  appId: z.string().min(1),
  deviceId: z.string().min(1),
  downloadMbps: z.number().nonnegative(),
  uploadMbps: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
  jitterMs: z.number().nonnegative(),
  packetLossPct: z.number().min(0).max(100),
  score: z.number().int().min(0).max(100).optional(),
});

export const crashSubmissionSchema = z.object({
  appId: z.string().min(1),
  deviceId: z.string().min(1),
  message: z.string().min(1).max(2000),
  stack: z.string().max(20000).optional(),
  platform: z.string().min(1).max(60),
  appVersion: z.string().max(60).optional(),
});

export const updateProfileSchema = z.object({ requires: requiresSchema });
export const createProfileSchema = z.object({ id: profileIdSchema, requires: requiresSchema });
