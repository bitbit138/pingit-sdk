import { useEffect, useState } from 'react';
import { METRIC_KEYS, type AdminProfile, type MetricBound, type MetricKey, type Requires } from '@pingit/contracts';
import { ThresholdField } from '@/components/ThresholdField';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useUpdateProfile } from '@/api/queries';

const METRIC_LABELS: Record<MetricKey, string> = {
  downloadMbps: 'Download (Mbps)',
  uploadMbps: 'Upload (Mbps)',
  latencyMs: 'Latency (ms)',
  jitterMs: 'Jitter (ms)',
  packetLossPct: 'Packet loss (%)',
};

export interface ProfileEditorProps {
  profile: AdminProfile;
  /** Admins may edit; developers are read-only. */
  editable: boolean;
}

export function ProfileEditor({ profile, editable }: ProfileEditorProps) {
  const [requires, setRequires] = useState<Requires>(profile.requires);
  const update = useUpdateProfile();

  // Reset local form when the selected profile changes.
  useEffect(() => {
    setRequires(profile.requires);
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.version]);

  const setBound = (key: MetricKey, next: MetricBound | undefined) => {
    setRequires((prev) => {
      const copy: Requires = { ...prev };
      if (next === undefined) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const onSave = () => {
    update.mutate({ id: profile.id, requires });
  };

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{profile.id}</h2>
        <span className="badge badge--version">v{profile.version}</span>
      </div>

      <ErrorBanner error={update.error} />

      <div>
        {METRIC_KEYS.map((key) => (
          <ThresholdField
            key={key}
            label={METRIC_LABELS[key]}
            bound={requires[key]}
            disabled={!editable}
            onChange={(next) => setBound(key, next)}
          />
        ))}
      </div>

      {editable ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {update.isSuccess ? <span className="badge badge--ok">Saved — version bumped</span> : null}
          <button className="btn" type="button" onClick={onSave} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <p className="muted">Read-only — only admins can edit thresholds.</p>
      )}
    </div>
  );
}
