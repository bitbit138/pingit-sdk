# @pingit/portal

The PingIt admin/developer **web portal** — a Vite + React 18 + TypeScript SPA.

- **Login** (JWT) with role-aware navigation (admin vs developer).
- **Profiles** — edit readiness thresholds; saving bumps the global version.
- **Apps & keys** — register apps (issues `appId` + one-time API key), revoke.
- **Analytics / Dashboard** — KPI cards + pass-rate, latency-trend, and test-count
  charts (Recharts), scoped by `appId` for developers.
- **History / Health / Crashes** pages.

It uses the typed client and types from `@pingit/contracts`, so request shapes and
URLs never drift from the server.

## Commands

```bash
pnpm --filter @pingit/portal dev        # Vite dev server on :5173 (proxies API → :8080)
pnpm --filter @pingit/portal build      # static build → dist/
pnpm --filter @pingit/portal test       # vitest (jsdom)
pnpm --filter @pingit/portal typecheck
```

In dev, all API paths (`/admin`, `/profiles`, `/results`, `/health`, `/download`,
`/upload`, `/ping`, `/crashes`) are proxied to the server at `localhost:8080`, so
the browser uses a single origin. For separate hosting set `VITE_API_BASE`.

See [../../docs/dashboard-guide.html](../../docs/dashboard-guide.html) for the operator walkthrough.
