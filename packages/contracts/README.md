# @pingit/contracts

The **single source of truth** for the PingIt system: shared TypeScript types,
zod validation schemas, the canonical route table, a typed admin API client, and
the canonical readiness-profile thresholds.

Both the **server** and the **portal** import this package, so request shapes and
URLs can never drift. The **Android SDK** embeds the generated `profiles.json` as
its offline defaults.

## What's inside (`src/`)

| File | Exports |
|------|---------|
| `metrics.ts` | `METRIC_KEYS`, `MetricBound`, `Requires` |
| `profiles.ts` | `PROFILE_IDS`, `Profile`, `ProfilesResponse` |
| `results.ts` | `MeasuredResult`, `ResultSubmission`, `ResultRecord` |
| `readiness.ts` | `HistoryMode`, `ReadinessResult` |
| `admin.ts` | login / app / analytics / crash DTOs, `Role`, `JwtClaims` |
| `routes.ts` | `ROUTES` (method + path table) |
| `schemas.ts` | zod schemas mirroring the types (runtime validation) |
| `seed.ts` | `CANONICAL_PROFILES`, `SEED_VERSION` — the threshold table |
| `client.ts` | `createPingItAdminClient(...)` typed fetch client |

## Build

```bash
pnpm --filter @pingit/contracts build   # tsup → dist/*  +  dist/profiles.json
pnpm --filter @pingit/contracts test     # validates the seed
```

`pnpm gen:profiles` regenerates `dist/profiles.json` **and** copies it to
`sdk-android/core/src/main/resources/profiles.json` — keeping the server DB seed
and the Android bundled defaults provably identical.
