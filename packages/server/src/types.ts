import type { Role } from '@pingit/contracts';

/** The decoded JWT payload attached to `req.user`. */
export interface JwtUser {
  sub: string;
  email: string;
  role: Role;
  appId: string | null;
}

/** `profiles` table row. */
export interface ProfileRow {
  id: string;
  requires: unknown;
  version: number;
  updated_at: Date;
}

/** `apps` table row. */
export interface AppRow {
  app_id: string;
  name: string;
  owner_email: string | null;
  api_key_hash: string | null;
  revoked_at: Date | null;
  created_at: Date;
}

/** `users` table row. */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  app_id: string | null;
  created_at: Date;
}

/** `results` table row. */
export interface ResultRow {
  id: string;
  app_id: string;
  device_id: string;
  download_mbps: string | number | null;
  upload_mbps: string | number | null;
  latency_ms: string | number | null;
  jitter_ms: string | number | null;
  packet_loss_pct: string | number | null;
  score: number | null;
  created_at: Date;
}

/** `crashes` table row. */
export interface CrashRow {
  id: string;
  app_id: string;
  device_id: string;
  message: string;
  stack: string | null;
  platform: string;
  app_version: string | null;
  created_at: Date;
}
