/**
 * React Query key factory. Centralising keys keeps invalidation honest — e.g. a
 * profile save invalidates both `qk.profiles.list()` and `qk.profiles.public()`
 * so the version badge refreshes.
 */
export interface AnalyticsRange {
  appId?: string;
  from?: string;
  to?: string;
}

export const qk = {
  profiles: {
    all: ['profiles'] as const,
    list: () => ['profiles', 'admin-list'] as const,
    public: () => ['profiles', 'public'] as const,
  },
  apps: {
    all: ['apps'] as const,
    list: () => ['apps', 'list'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    range: (r: AnalyticsRange) => ['analytics', r.appId ?? 'org', r.from ?? '', r.to ?? ''] as const,
  },
  health: ['health'] as const,
  crashes: {
    all: ['crashes'] as const,
    list: (appId?: string) => ['crashes', appId ?? 'org'] as const,
  },
};
