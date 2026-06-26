import { useState, type FormEvent } from 'react';
import type { AppCreatedResponse, AppRecord } from '@pingit/contracts';
import { useApps, useCreateApp, useRevokeApp } from '@/api/queries';
import { useAuth } from '@/auth/useAuth';
import { DataTable, type Column } from '@/components/DataTable';
import { ApiKeyReveal } from '@/components/ApiKeyReveal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { fmtDate } from '@/lib/format';

export function AppsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data: apps, isLoading, error } = useApps();
  const createApp = useCreateApp();
  const revokeApp = useRevokeApp();

  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [revealed, setRevealed] = useState<AppCreatedResponse | null>(null);

  const onRegister = (e: FormEvent) => {
    e.preventDefault();
    createApp.mutate(
      { name, ownerEmail: isAdmin && ownerEmail ? ownerEmail : undefined },
      {
        onSuccess: (app) => {
          setRevealed(app);
          setName('');
          setOwnerEmail('');
        },
      },
    );
  };

  const columns: Column<AppRecord>[] = [
    { key: 'name', header: 'Name', render: (a) => a.name },
    { key: 'appId', header: 'App ID', render: (a) => <code>{a.appId}</code> },
    { key: 'owner', header: 'Owner', render: (a) => a.ownerEmail ?? <span className="muted">—</span> },
    { key: 'created', header: 'Created', render: (a) => fmtDate(a.createdAt) },
    {
      key: 'status',
      header: 'Status',
      render: (a) =>
        a.revokedAt ? (
          <span className="badge badge--bad">revoked</span>
        ) : (
          <span className="badge badge--ok">active</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (a) =>
        isAdmin && !a.revokedAt ? (
          <button
            className="btn btn--danger"
            type="button"
            disabled={revokeApp.isPending}
            onClick={() => {
              if (confirm(`Revoke "${a.name}"? This cannot be undone.`)) revokeApp.mutate(a.appId);
            }}
          >
            Revoke
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Apps &amp; keys</h1>
        <p>{isAdmin ? 'Every registered app.' : 'Your registered app.'}</p>
      </div>

      <ErrorBanner error={error} />
      <ErrorBanner error={createApp.error} />
      <ErrorBanner error={revokeApp.error} />

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3>Register app</h3>
        <form className="row" onSubmit={onRegister} style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="app-name">App name</label>
            <input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="My mobile app"
            />
          </div>
          {isAdmin ? (
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="app-owner">Owner email (optional)</label>
              <input
                id="app-owner"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="dev@example.com"
              />
            </div>
          ) : null}
          <button className="btn" type="submit" disabled={createApp.isPending || !name}>
            {createApp.isPending ? 'Registering…' : 'Register app'}
          </button>
        </form>
      </div>

      {isLoading ? (
        <p className="loading">Loading apps…</p>
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            rows={apps ?? []}
            rowKey={(a) => a.appId}
            emptyMessage="No apps registered yet."
          />
        </div>
      )}

      {revealed ? <ApiKeyReveal app={revealed} onClose={() => setRevealed(null)} /> : null}
    </div>
  );
}
