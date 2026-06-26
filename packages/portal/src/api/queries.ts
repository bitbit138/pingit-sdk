import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminProfile,
  AnalyticsSummary,
  AppCreatedResponse,
  AppRecord,
  CrashRecord,
  CreateAppRequest,
  ProfileId,
  ProfilesResponse,
  Requires,
} from '@pingit/contracts';
import { apiClient } from './client';
import { qk, type AnalyticsRange } from './keys';
import { useAuth } from '@/auth/useAuth';

/* ----------------------------- Profiles ----------------------------- */

/** Public GET /profiles — global version + canonical list. */
export function useProfiles() {
  return useQuery<ProfilesResponse>({
    queryKey: qk.profiles.public(),
    queryFn: () => apiClient.getProfiles(),
  });
}

/** Admin GET /admin/profiles — rows with per-profile version + updatedAt. */
export function useListProfiles() {
  return useQuery<AdminProfile[]>({
    queryKey: qk.profiles.list(),
    queryFn: () => apiClient.listProfiles(),
  });
}

function useInvalidateProfiles() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.profiles.all });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: ({ id, requires }: { id: ProfileId; requires: Requires }) =>
      apiClient.updateProfile(id, requires),
    onSuccess: invalidate,
  });
}

export function useCreateProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: ({ id, requires }: { id: ProfileId; requires: Requires }) =>
      apiClient.createProfile(id, requires),
    onSuccess: invalidate,
  });
}

export function useDeleteProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (id: ProfileId) => apiClient.deleteProfile(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------- Apps ------------------------------- */

/** Admins see every app; developers see only their own scoped app. */
export function useApps() {
  const { role, appId } = useAuth();
  return useQuery<AppRecord[]>({
    queryKey: qk.apps.list(),
    queryFn: () => apiClient.listApps(),
    select: (apps) =>
      role === 'developer' && appId ? apps.filter((a) => a.appId === appId) : apps,
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation<AppCreatedResponse, Error, CreateAppRequest>({
    mutationFn: (body) => apiClient.createApp(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps.all }),
  });
}

export function useRevokeApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => apiClient.revokeApp(appId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps.all }),
  });
}

/* ----------------------------- Analytics ---------------------------- */

/**
 * Org-wide for admins; auto-scoped to the developer's own appId. An explicit
 * `range.appId` (admin filtering by app) wins over the implicit scope.
 */
export function useAnalytics(range: AnalyticsRange = {}) {
  const { role, appId } = useAuth();
  const effectiveAppId =
    role === 'developer' ? (appId ?? undefined) : range.appId;
  const params: AnalyticsRange = { ...range, appId: effectiveAppId };

  return useQuery<AnalyticsSummary>({
    queryKey: qk.analytics.range(params),
    queryFn: () => apiClient.getAnalytics(params),
  });
}

/* ------------------------------ Health ------------------------------ */

export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 30_000,
  });
}

/* ------------------------------ Crashes ----------------------------- */

/** Admins see org-wide crashes; developers are scoped to their own appId. */
export function useCrashes() {
  const { role, appId } = useAuth();
  const effectiveAppId = role === 'developer' ? (appId ?? undefined) : undefined;
  return useQuery<CrashRecord[]>({
    queryKey: qk.crashes.list(effectiveAppId),
    queryFn: () => apiClient.getCrashes({ appId: effectiveAppId }),
  });
}
