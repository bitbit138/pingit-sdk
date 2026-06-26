import type { CrashRecord } from '@pingit/contracts';
import { useCrashes } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { DataTable, type Column } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { fmtDate } from '@/lib/format';

export function CrashesPage() {
  const { role } = useAuth();
  const { data, isLoading, error } = useCrashes();

  const columns: Column<CrashRecord>[] = [
    { key: 'createdAt', header: 'When', render: (c) => fmtDate(c.createdAt) },
    { key: 'appId', header: 'App ID', render: (c) => <code>{c.appId}</code> },
    { key: 'platform', header: 'Platform', render: (c) => c.platform },
    { key: 'version', header: 'App version', render: (c) => c.appVersion ?? <span className="muted">—</span> },
    { key: 'message', header: 'Message', render: (c) => c.message },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Crashes</h1>
        <p>{role === 'admin' ? 'Crash reports across all apps.' : 'Crash reports for your app.'}</p>
      </div>

      <ErrorBanner error={error} />

      {isLoading ? (
        <p className="loading">Loading crashes…</p>
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            rows={data ?? []}
            rowKey={(c) => c.id}
            emptyMessage="No crash reports."
          />
        </div>
      )}
    </div>
  );
}
