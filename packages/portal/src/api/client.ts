import { createPingItAdminClient, type PingItAdminClient } from '@pingit/contracts';
import { getStoredToken, clearSession } from '@/auth/token';

/**
 * One shared, app-wide client instance. It pulls the bearer token from
 * localStorage on every request (so it always sees the freshest session) and,
 * on a 401, clears the session and hands control to a registered handler
 * (wired up by AuthProvider so it can navigate to /login).
 */
let onUnauthorizedHandler: (() => void) | null = null;

/** AuthProvider registers a navigation-aware 401 handler here. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorizedHandler = fn;
}

export const apiClient: PingItAdminClient = createPingItAdminClient({
  baseUrl: import.meta.env.VITE_API_BASE ?? '',
  getToken: () => getStoredToken(),
  onUnauthorized: () => {
    clearSession();
    onUnauthorizedHandler?.();
  },
});
