/**
 * Canonical method + path table. The server mounts exactly these; the portal
 * client builds requests from them. No stringly-typed URLs duplicated.
 */
export const ROUTES = {
  // --- Public SDK endpoints ---
  health: { method: 'GET', path: '/health' },
  profiles: { method: 'GET', path: '/profiles' },
  download: { method: 'GET', path: '/download' },
  upload: { method: 'POST', path: '/upload' },
  ping: { method: 'GET', path: '/ping' },
  getResults: { method: 'GET', path: '/results' },
  postResult: { method: 'POST', path: '/results' },
  postCrash: { method: 'POST', path: '/crashes' },

  // --- Admin API (JWT) ---
  login: { method: 'POST', path: '/admin/login' },
  adminListProfiles: { method: 'GET', path: '/admin/profiles' },
  adminCreateProfile: { method: 'POST', path: '/admin/profiles' },
  adminUpdateProfile: { method: 'PUT', path: '/admin/profiles/:id' },
  adminDeleteProfile: { method: 'DELETE', path: '/admin/profiles/:id' },
  adminListApps: { method: 'GET', path: '/admin/apps' },
  adminCreateApp: { method: 'POST', path: '/admin/apps' },
  adminRevokeApp: { method: 'DELETE', path: '/admin/apps/:appId' },
  adminAnalytics: { method: 'GET', path: '/admin/analytics' },
  adminCrashes: { method: 'GET', path: '/admin/crashes' },
} as const;

export type RouteKey = keyof typeof ROUTES;
