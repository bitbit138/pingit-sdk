import type { Pool } from '../db/pool.js';
import { appExists } from '../db/repositories/apps.repo.js';

const TTL_MS = 60_000;

interface CacheEntry {
  valid: boolean;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Is `appId` a known, non-revoked app? Cached for 60s to keep the hot
 * measurement path off the DB on every request.
 */
export async function validateAppId(pool: Pool, appId: string): Promise<boolean> {
  if (!appId) return false;
  const now = Date.now();
  const cached = cache.get(appId);
  if (cached && cached.expires > now) return cached.valid;

  const valid = await appExists(pool, appId);
  cache.set(appId, { valid, expires: now + TTL_MS });
  return valid;
}

/** Test/seed hook: drop the cache so a freshly revoked app fails immediately. */
export function clearAppIdCache(): void {
  cache.clear();
}
