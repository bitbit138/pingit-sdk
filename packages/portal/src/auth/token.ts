import type { Role } from '@pingit/contracts';

/**
 * Thin localStorage wrapper for the portal session. We persist the raw JWT plus
 * the decoded role/appId/expiry so a reload can rehydrate without re-decoding.
 */
const KEY_JWT = 'pingit.jwt';
const KEY_ROLE = 'pingit.role';
const KEY_APP_ID = 'pingit.appId';
const KEY_EXPIRES = 'pingit.expiresAt';

export interface StoredSession {
  token: string;
  role: Role;
  appId: string | null;
  /** ISO-8601 expiry. */
  expiresAt: string;
}

export function loadSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(KEY_JWT);
    const role = localStorage.getItem(KEY_ROLE) as Role | null;
    const expiresAt = localStorage.getItem(KEY_EXPIRES);
    if (!token || !role || !expiresAt) return null;
    return {
      token,
      role,
      appId: localStorage.getItem(KEY_APP_ID),
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession): void {
  try {
    localStorage.setItem(KEY_JWT, s.token);
    localStorage.setItem(KEY_ROLE, s.role);
    localStorage.setItem(KEY_EXPIRES, s.expiresAt);
    if (s.appId) localStorage.setItem(KEY_APP_ID, s.appId);
    else localStorage.removeItem(KEY_APP_ID);
  } catch {
    /* storage unavailable (private mode) — session stays in-memory only */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY_JWT);
    localStorage.removeItem(KEY_ROLE);
    localStorage.removeItem(KEY_APP_ID);
    localStorage.removeItem(KEY_EXPIRES);
  } catch {
    /* ignore */
  }
}

/** Read just the token (used by the API client's getToken). */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(KEY_JWT);
  } catch {
    return null;
  }
}

/** True when the session is missing or its ISO expiry is in the past. */
export function isExpired(expiresAt: string | undefined | null): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}
