import type { ProfileId } from './profiles';

export type Role = 'admin' | 'developer';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: Role;
  /** Present for developer accounts (their scoped app). */
  appId?: string;
  email: string;
  /** ISO-8601 expiry. */
  expiresAt: string;
}

export interface JwtClaims {
  sub: string;
  email: string;
  role: Role;
  appId?: string;
  exp: number;
}

export interface AppRecord {
  appId: string;
  name: string;
  ownerEmail: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

/** Returned ONCE on registration; the apiKey is never re-fetchable. */
export interface AppCreatedResponse extends AppRecord {
  apiKey: string;
}

export interface CreateAppRequest {
  name: string;
  /** Admin may assign an owner; developers always own what they create. */
  ownerEmail?: string;
}

/** A crash/error report uploaded by the SDK (the crash-capture feature). */
export interface CrashRecord {
  id: number;
  appId: string;
  deviceId: string;
  message: string;
  stack?: string | null;
  platform: string;
  appVersion?: string | null;
  createdAt: string;
}

export interface CrashSubmission {
  appId: string;
  deviceId: string;
  message: string;
  stack?: string;
  platform: string;
  appVersion?: string;
}

export interface AnalyticsSummary {
  scope: { appId: string | null; role: Role };
  range: { from: string; to: string };
  kpis: {
    testsToday: number;
    passRatePct: number;
    avgLatencyMs: number;
    fallbackRatePct: number;
    totalTests: number;
    distinctDevices: number;
  };
  passRateByProfile: Array<{ profile: ProfileId; passRatePct: number; count: number }>;
  latencyTrend: Array<{ date: string; avgLatencyMs: number }>;
  testCounts: Array<{ date: string; count: number }>;
}
