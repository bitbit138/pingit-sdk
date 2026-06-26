# Server Architecture — PingIt SDK

**Project:** PingIt SDK (Mobile)
**Course:** Mobile Development / SDK Class
**Author:** Tom Bitran
**Date:** 2026-06-13
**Status:** Draft v2
**Based on:** [PRD.md](./PRD.md)

---

## 1. Purpose of the Server

The SDK can't measure connection quality alone — it needs a known, controlled
endpoint to measure *against*. The server's jobs:

1. **Be the measurement target** — serve download data, accept upload data,
   answer pings (and run a packet-loss probe).
2. **Serve readiness profiles** — the use-case thresholds, stored in a DB so they
   can be tuned without an app release.
3. **Optionally store history** — only for apps that opt into `SERVER_HISTORY`.

Because we own this server, the SDK is **not dependent on a single external
source** (public endpoints are a fallback only). The server is kept **light**:
the heavy measurement traffic never touches the database.

---

## 2. High-Level Diagram

```
                ┌─────────────────────────────┐
                │        Mobile App           │
                │  ┌───────────────────────┐  │
                │  │      PingIt SDK       │  │
                │  └───────────┬───────────┘  │
                └──────────────┼──────────────┘
                               │  HTTPS (+ UDP/WebRTC for loss)
                               ▼
        ┌──────────────────────────────────────────────┐
        │            Measurement Server (ours)          │
        │                                               │
        │  Measurement endpoints   API / data endpoints │
        │  ┌───────────────────┐   ┌──────────────────┐ │
        │  │ /download         │   │ /profiles        │ │
        │  │ /upload           │   │ /results (POST)  │ │
        │  │ /ping             │   │ /results (GET)   │ │
        │  │ /probe (loss)     │   │ /health          │ │
        │  └───────────────────┘   └────────┬─────────┘ │
        └───────────────────────────────────┼───────────┘
                                             ▼
                          ┌────────────────────────────────┐
                          │          Postgres               │
                          │  • profiles (always, tiny)      │
                          │  • results  (only SERVER_HISTORY)│
                          └────────────────────────────────┘

   Public fallback (Cloudflare / M-Lab NDT) ← used only if our server is down
   Web Portal (login-gated) ──────────────── edits profiles / reads analytics
```

---

## 3. Two Kinds of Endpoints (and why)

The server has two very different workloads; keeping them separate is the main
architectural decision.

| Type | Endpoints | Traffic profile | Notes |
|------|-----------|-----------------|-------|
| **Measurement** | `/download`, `/upload`, `/ping`, `/probe` | High-bandwidth, short bursts | Fast & raw. **No DB.** |
| **API / data** | `/profiles`, `/results`, `/health` | Low-bandwidth JSON | Talks to Postgres. |

> A heavy speed test never slows down the small JSON/DB calls, and we can scale
> or host the two sides differently. This is *why* the server stays light.

---

## 4. Endpoint Specifications

### 4.1 Measurement endpoints (no database)

**`GET /download?bytes=N`**
- Streams `N` bytes of incompressible random data.
- SDK measures: bytes received ÷ elapsed time = download Mbps.
- `N` is adaptive and **capped** (mobile data budget, §7); oversized `N` refused.

**`POST /upload`**
- SDK sends `N` bytes; server reads and **discards** them (a sink).
- SDK measures: bytes sent ÷ elapsed time = upload Mbps. Size capped.

**`GET /ping`**
- Tiny response (timestamp / empty 200).
- Called repeatedly (e.g. ×10) to compute **latency** (avg RTT) and **jitter**
  (mean abs. deviation between consecutive RTTs, RFC 3550).

**`/probe` (packet loss, enhancement)**
- UDP / WebRTC DataChannel: SDK sends N probes, server echoes them.
- **packet loss %** = (sent − echoed) ÷ sent. Real loss needs UDP; over plain
  HTTP we can only approximate via timeouts.

### 4.2 API / data endpoints (talk to Postgres)

**`GET /profiles`**
- Returns all profiles + a global `version`. The SDK caches the response and
  only refetches when `version` changes or its (jittered, ~daily) cache expires.
```json
{
  "version": 7,
  "profiles": [
    { "id": "VIDEO_CALL",
      "requires": { "downloadMbps": {"min":1.5}, "uploadMbps": {"min":1.0},
                    "latencyMs": {"max":200}, "jitterMs": {"max":40},
                    "packetLossPct": {"max":3} } },
    { "id": "CLOUD_GAMING",
      "requires": { "downloadMbps": {"min":15}, "latencyMs": {"max":40},
                    "jitterMs": {"max":10} } }
  ]
}
```

**`POST /results`** *(only when the app uses `SERVER_HISTORY`)*
- Body: `{ appId, deviceId, downloadMbps, uploadMbps, latencyMs, jitterMs,
  packetLossPct, score }`. Server validates `appId`, stamps the time, stores it.

**`GET /results?appId=...&deviceId=...&limit=N`**
- Returns the last `N` results for that device (for trend display). Scoped by
  `appId` so apps never see each other's data.

**`GET /health`**
- `200 OK`. Used by the SDK's fallback logic and by monitoring.

---

## 5. Where the Pass/Fail Decision Happens

**On the device, not the server.**

```
SDK fetches profiles (cached) → runs measurements → compares locally
```

- The server only *publishes thresholds*; the SDK compares its measured values
  and returns `{ passed, reason, measured }`.
- **Why on-device:** the connection being tested may be weak — the answer must
  not depend on a server round-trip. **If there is no connection at all**, the
  SDK can't measure (numbers would be meaningless), so it returns an explicit
  `{ passed:false, reason:"no connection" }` instead of a fake pass.

---

## 6. Database Schema (Postgres)

### `profiles` (always present, tiny)
| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | e.g. `VIDEO_CALL` |
| `requires` | jsonb | threshold object (min/max per metric) |
| `version` | int | bumped on any change |
| `updated_at` | timestamptz | |

> Change a profile = `UPDATE` the row + bump `version`. The SDK sees it on its
> next `/profiles` fetch. No app/SDK release needed.

### `apps` (registered developer apps)
| Column | Type | Notes |
|--------|------|-------|
| `app_id` | text (PK) | issued in the portal; used by the SDK |
| `name` | text | display name |
| `created_at` | timestamptz | |

### `results` (only used by `SERVER_HISTORY` apps)
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial (PK) | |
| `app_id` | text | scopes data to an app |
| `device_id` | text | anonymous, persists across restarts |
| `download_mbps` / `upload_mbps` | numeric | |
| `latency_ms` / `jitter_ms` | numeric | |
| `packet_loss_pct` | numeric | |
| `score` | int | optional |
| `created_at` | timestamptz | indexed |

Index: `results (app_id, device_id, created_at DESC)` — serves "last N for this
device, newest first" directly (no sort, no scan).

---

## 7. Efficiency — the Main Decisions

What makes this light and fast, and *why*:

1. **Split read/write workloads.** MB-sized measurement bursts never touch
   Postgres; only tiny JSON hits the DB. The two scale independently.
2. **Decide on the device.** Pass/fail is computed locally → no server round-trip
   per check, and it still works on a weak link.
3. **History is opt-in.** Default `LAST_LOCAL` keeps only the most recent result
   in the device cache — **zero server writes** for most apps. Only
   `SERVER_HISTORY` apps write to Postgres.
4. **Version-gated profile cache + jittered daily refresh.** The SDK caches
   `/profiles` and refetches ~once a day at a **randomized time** (so devices
   don't stampede the server) or when `version` changes. Most checks need no
   network for thresholds.
5. **Stable identity without accounts.** `(appId, deviceId)` — `appId` scopes
   data to an app, `deviceId` is an anonymous UUID in private storage that
   survives restarts; **IP changes don't matter** because we never key on IP.
6. **Append-only writes + bounded outbox.** `results` is insert-only (no
   locks/updates); the SDK buffers unsent results and retries in the background,
   so a closing or offline app never blocks.
7. **`jsonb` thresholds.** New metrics need no schema migration; profiles are
   tuned with an `UPDATE` + version bump.

> **Why keep the DB at all?** Profiles must be tunable server-side (a tiny,
> essential table). History is the only heavy part — and we made it optional, so
> the storage cost only exists for apps that explicitly want trends.

---

## 8. No-Single-Source & Offline

```
Measurement target:
  1. Our server (GET /health OK?)  →  2. Public endpoint (Cloudflare / NDT)
Profiles:
  1. /profiles  →  2. last cached  →  3. bundled defaults
Offline (no connection at all):
  → cannot measure; return { passed:false, reason:"no connection" }
```

- Measurement is **method-based**, so a different target still yields valid
  numbers.
- Readiness keeps working from cached/bundled profiles **as long as there is a
  connection to measure**. With no connection, the SDK reports offline honestly
  rather than faking a result.

---

## 9. Tech Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Measurement server | **Node.js** | Simple streaming download/upload; quick to build. *Go is the scale path if bandwidth bottlenecks.* |
| API server | Node.js (same or separate) | Keep simple; can split later. |
| Database | **Postgres** | Relational, `jsonb` thresholds, easy history queries. |
| Transport | HTTPS (speed/ping), UDP/WebRTC (loss) | |
| Hosting | A cloud region near target users | Low, consistent measurement latency. |

---

## 10. Abuse Protection & Data Cost

- **API key (`appId`) required** — unknown callers rejected.
- **Rate limiting** per `appId` and per IP on measurement endpoints.
- **Payload caps** — server refuses oversized `/download` / `/upload` sizes.
- **Data-saver mode** — SDK can run smaller payloads / shorter tests for users on
  metered plans (developer opt-in, can follow the OS data-saver flag).
- **Monitoring** via `/health` to catch abnormal bandwidth use.

---

## 11. Request Flow Example (a `CLOUD_GAMING` check)

```
1. First launch: SDK → GET /profiles → caches thresholds (version 7)
2. App: pingIt.isReadyFor(CLOUD_GAMING)
3. If offline → return { passed:false, reason:"no connection" }  (stop)
4. SDK → /download, /upload, /ping ×10  → measures
5. SDK compares measured vs cached CLOUD_GAMING thresholds (on-device)
6. SDK returns { passed:false, reason:"latency too high", measured:{...} }
7. If historyMode == SERVER_HISTORY → POST /results (buffered + retried)
```

---

## 12. Next Steps

1. Pin down profile threshold starting values.
2. Define the SDK API per platform (iOS/Android).
3. Stand up a minimal server (`/download` + `/ping` + `/profiles`) as a prototype.
4. Build the login-gated portal (profile editing + per-app analytics).
