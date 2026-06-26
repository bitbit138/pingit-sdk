import { ROUTES } from './routes';
import type {
  LoginRequest,
  LoginResponse,
  AppRecord,
  AppCreatedResponse,
  CreateAppRequest,
  AnalyticsSummary,
  CrashRecord,
} from './admin';
import type { Profile, ProfileId, ProfilesResponse } from './profiles';
import type { Requires } from './metrics';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ClientOptions {
  /** '' in portal dev (Vite proxy); a full origin when hosted separately. */
  baseUrl?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

/** An admin `profiles` row (includes server-managed version metadata). */
export interface AdminProfile extends Profile {
  version: number;
  updatedAt: string;
}

/**
 * Framework-agnostic typed client for the admin + public API. Works in the
 * browser (portal) and in Node (smoke tests). Both the server and portal import
 * the same `ROUTES`/types, so URLs and shapes never drift.
 */
export function createPingItAdminClient(opts: ClientOptions = {}) {
  const baseUrl = opts.baseUrl ?? '';
  const doFetch = opts.fetchImpl ?? fetch;

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = opts.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await doFetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) opts.onUnauthorized?.();

    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const rec = data as { message?: string; error?: string } | undefined;
      throw new ApiError(res.status, rec?.message ?? rec?.error ?? res.statusText, data);
    }
    return data as T;
  }

  return {
    login: (b: LoginRequest) => req<LoginResponse>('POST', ROUTES.login.path, b),
    getProfiles: () => req<ProfilesResponse>('GET', ROUTES.profiles.path),
    listProfiles: () => req<AdminProfile[]>('GET', ROUTES.adminListProfiles.path),
    createProfile: (id: ProfileId, requires: Requires) =>
      req<{ version: number }>('POST', ROUTES.adminCreateProfile.path, { id, requires }),
    updateProfile: (id: ProfileId, requires: Requires) =>
      req<{ version: number }>('PUT', `/admin/profiles/${id}`, { requires }),
    deleteProfile: (id: ProfileId) => req<{ version: number }>('DELETE', `/admin/profiles/${id}`),
    listApps: () => req<AppRecord[]>('GET', ROUTES.adminListApps.path),
    createApp: (b: CreateAppRequest) => req<AppCreatedResponse>('POST', ROUTES.adminCreateApp.path, b),
    revokeApp: (appId: string) => req<{ ok: true }>('DELETE', `/admin/apps/${appId}`),
    getAnalytics: (params: { appId?: string; from?: string; to?: string } = {}) =>
      req<AnalyticsSummary>('GET', withQuery(ROUTES.adminAnalytics.path, params)),
    getCrashes: (params: { appId?: string } = {}) =>
      req<CrashRecord[]>('GET', withQuery(ROUTES.adminCrashes.path, params)),
    getHealth: () => req<{ status: string; uptimeSec: number }>('GET', ROUTES.health.path),
  };
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export type PingItAdminClient = ReturnType<typeof createPingItAdminClient>;
