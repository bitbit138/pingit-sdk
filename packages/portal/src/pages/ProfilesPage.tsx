import { useEffect, useState } from 'react';
import type { ProfileId } from '@pingit/contracts';
import { useListProfiles } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { ProfileEditor } from './ProfileEditor';
import { ErrorBanner } from '@/components/ErrorBanner';

export function ProfilesPage() {
  const { role } = useAuth();
  const { data: profiles, isLoading, error } = useListProfiles();
  const [selectedId, setSelectedId] = useState<ProfileId | null>(null);

  // Default the selection to the first profile once loaded.
  useEffect(() => {
    const first = profiles?.[0];
    if (!selectedId && first) setSelectedId(first.id);
  }, [profiles, selectedId]);

  const editable = role === 'admin';
  const selected = profiles?.find((p) => p.id === selectedId) ?? null;

  return (
    <div>
      <div className="page-header">
        <h1>Readiness profiles</h1>
        <p>
          {editable
            ? 'Tune the min/max thresholds per metric. Saving bumps the profile version.'
            : 'Read-only view of the curated readiness thresholds.'}
        </p>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Loading profiles…</p>
      ) : profiles && profiles.length > 0 ? (
        <div className="two-col">
          <div className="card">
            <ul className="profile-list">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  className={
                    p.id === selectedId
                      ? 'profile-list__item profile-list__item--active'
                      : 'profile-list__item'
                  }
                  onClick={() => setSelectedId(p.id)}
                >
                  <span>{p.id}</span>
                  <span className="badge badge--version">v{p.version}</span>
                </li>
              ))}
            </ul>
          </div>

          {selected ? (
            <ProfileEditor key={selected.id} profile={selected} editable={editable} />
          ) : (
            <div className="card muted">Select a profile to view its thresholds.</div>
          )}
        </div>
      ) : (
        <div className="card muted">No profiles found.</div>
      )}
    </div>
  );
}
