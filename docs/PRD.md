# PRD — PingIt SDK (Mobile)

**Project:** PingIt SDK
**Course:** Mobile Development / SDK Class
**Author:** Tom Bitran
**Date:** 2026-06-13
**Status:** Draft v3

---

## 1. Summary

**PingIt** is a **lightweight mobile SDK** that measures the **real quality of a
device's internet connection** — download, upload, latency, jitter (and packet
loss as an enhancement).

The point of PingIt is to be **small, fast, battery- and data-friendly, and
resilient**. The interesting engineering is in the **architecture**: how it
measures efficiently, what it keeps on the device vs. on the server, how it
identifies a device without accounts, and how it never depends on a single
external source.

On top of the raw measurement, PingIt can also answer practical questions
through **readiness checks** — e.g. `isReadyFor("VIDEO_CALL")` → pass/fail — so a
developer needn't interpret raw numbers. This is a **useful capability, not the
whole product**: the core value is an efficient, reliable measurement engine plus
a well-designed data strategy.

Measurements run against our **own measurement server**, with optional fallback
to public endpoints.

---

## 2. Problem

Mobile apps live and die on connection quality, but mobile networks are highly
variable (cellular ↔ wifi, moving between cells, weak signal). Developers have
no simple, **lightweight** way to know the real state of the connection right
now — without shipping their own measurement code, their own server to measure
against, and their own logic to interpret the result.

PingIt gives them that as a drop-in SDK: a few lines, low overhead, and a clear
answer.

---

## 3. Target Users

- **Mobile app developers** who need a quick, low-overhead read on the network.
- Example uses:
  - A streaming app picks quality based on measured download.
  - A calling app warns the user before starting a weak video call.
  - A backup app defers a large upload until the link is strong enough.

---

## 4. Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | Speed test | Measure download & upload throughput (Mbps). |
| F2 | Latency test | Round-trip time (ms) via repeated pings. |
| F3 | Jitter | Variation between consecutive pings (RFC 3550). |
| F4 | Packet loss | % of probe packets lost (UDP/WebRTC enhancement). |
| F5 | Readiness checks | Pass/fail against named use-case profiles. |
| F6 | Quality score | Optional 0–100 score + label for raw output. |
| F7 | Configurable history | Dev chooses: none / last-in-cache / full server history. |
| F8 | Resilient sources | Public fallback + explicit offline handling. |

Lightweight and efficient by design (see §7) — short tests, capped data,
battery-aware, and an optional **data-saver** mode (see §11).

---

## 5. Readiness Checks (one capability)

A developer can ask about a **use case** instead of reading numbers; PingIt
compares the measurement to that profile's thresholds and returns pass/fail.

### Profiles (curated but interesting)

| Profile | Real-world meaning | Roughly needs |
|---------|--------------------|---------------|
| `MESSAGING` | Text / chat, light sync | Any working link, latency-tolerant |
| `WEB_BROWSING` | Pages load snappily | Modest download, low latency |
| `MUSIC_STREAMING` | Audio streaming (Spotify) | Modest steady download |
| `VOICE_CALL` | VoIP audio | Low latency & jitter, low loss |
| `VIDEO_CALL` | Real-time video | Higher up+down, low latency/jitter/loss |
| `HD_STREAMING` | Watch HD video | Higher download, latency less critical |
| `UHD_4K_STREAMING` | Watch 4K video | High sustained download |
| `CLOUD_GAMING` | Game streaming (GeForce Now) | **Ultra-low latency & jitter**, good download |
| `LIVE_BROADCAST` | Going live from the phone | **High upload** + low latency |
| `LARGE_UPLOAD` | Backups / big file send | High sustained upload |

> Threshold numbers per profile are stored **server-side** so they can be tuned
> without shipping a new SDK version. The SDK caches them (see §7).

### Developer experience

```kotlin
val ready = pingIt.isReadyFor(Profile.CLOUD_GAMING)
if (!ready.passed) {
    showWarning("Connection may not handle cloud gaming")
    // ready.reason -> e.g. "latency too high" / "no connection"
}
```

A check returns `{ profile, passed, reason, measured }`. A numeric score and the
raw `runTest()` output remain available for developers who want them.

---

## 6. SDK Surface (developer-facing)

```
// Setup — appId scopes all data to this app (see §7 identification)
PingIt.init(appId, { historyMode, dataSaver, endpoint })

// Readiness
pingIt.isReadyFor(Profile.VIDEO_CALL)   -> { passed, reason, measured }

// Raw test
pingIt.runTest()   -> { downloadMbps, uploadMbps, latencyMs, jitterMs,
                        packetLossPct, score, label, timestamp }
pingIt.ping()      -> latencyMs

// History (only meaningful when historyMode != NONE)
pingIt.getHistory(limit)

// Maintenance
pingIt.refreshProfiles()   // force a threshold refresh
pingIt.cancel()            // abort an in-flight test
```

---

## 7. Data Strategy & Efficiency (the important part)

The architecture is deliberately **light**. Key decisions:

### What lives where
- **Profiles (thresholds)** live on the server in a tiny table and are **cached
  on the device**. They change rarely.
- **The decision (pass/fail) is computed on the device** — the server only
  publishes thresholds. A weak link must still get an answer fast.
- **History is optional and developer-controlled** (next point).

### History mode — the developer chooses
Set once in `init(...)`:

| Mode | What it does | Cost |
|------|--------------|------|
| `NONE` | Keep nothing. | Zero storage, zero history calls. |
| `LAST_LOCAL` *(default)* | Keep only the **most recent result on the device** (cache). | No server writes. |
| `SERVER_HISTORY` | Send every result to our server for full history/trends. | Network + DB. |

> This keeps the server light by default: most apps need "last result" at most,
> and only opt into server history when they actually want trends.

### What we cache on the device
- The **profiles** (with their `version`).
- The **last result** (for `LAST_LOCAL`).
- A small **bounded outbox** of unsent results (for `SERVER_HISTORY` retries).

### Identifying a device without accounts
- **`appId`**: issued in the portal when a developer registers an app; passed to
  `init(...)`. It **scopes all data to that app** (so we know which tests are
  ours and which app they belong to).
- **`deviceId`**: an anonymous random UUID generated on first run and stored in
  the app's private storage. It **survives app restarts and updates**.
  - The device's **IP/address changing is irrelevant** — we key on
    `(appId, deviceId)`, never on IP.
  - A reinstall regenerates the id → counts as a new device. Acceptable for
    anonymous analytics.

### Refreshing profiles efficiently
- Refresh **about once a day, at a randomized time** (jittered, not a fixed
  hour) so devices don't all hit the server at once — cheaper for us, lighter
  for the device. Also refetch on demand via `refreshProfiles()`.

### If our server is down
- **Readiness/measurement:** fall back to a public measurement target (§8).
- **`SERVER_HISTORY` writes:** buffer in the bounded outbox and retry later in
  the background — a closing app never blocks on the network.

---

## 8. Offline & No-Single-Source Handling

- **Truly offline ⇒ no measurement is possible.** PingIt does **not** pretend a
  readiness check passes; it returns an explicit result:
  `{ passed: false, reason: "no connection" }` (or an `OFFLINE` status).
- **Measurement target selection:** try our server → if unreachable, use a
  public endpoint (Cloudflare / M-Lab NDT). Measurement is method-based, so a
  different target still yields valid numbers.
- **Profiles:** fresh from `/profiles` → else last cached → else bundled
  defaults. So even with the server down (but a live connection), checks work.

Net result: **no single point of failure**, and offline is handled honestly.

---

## 9. The Portal & Access

A small **web portal** for the people who operate PingIt and the developers who
use it. **Not part of the SDK; behind a login.**

- **Who can enter, and how:**
  - **PingIt operators / admins** — sign in (email + password, SSO later) to
    edit profile thresholds and watch overall health.
  - **Registered developers** — sign in to **register an app** (get an
    `appId`/API key) and see analytics **for their own app only**.
  - Access is **scoped by role and by `appId`** — a developer never sees another
    app's data.
- **What it does:** edit & publish profiles, view analytics/trends, server
  health, crash/error reports, manage API keys.

---

## 10. High-Level Architecture

```
[ Mobile App ]
   └── PingIt SDK (iOS / Android)
          │  HTTPS  (+ UDP/WebRTC for packet loss)
          ▼
[ Measurement Server ]  ← ours
   ├── Measurement:  /download  /upload  /ping  /probe
   └── API/data:     /profiles  /results  /health
          │
          ▼
[ Postgres ]  profiles (always) · results (only if SERVER_HISTORY)

[ Public fallback ]  (Cloudflare / NDT) — used only if our server is down
[ Web Portal ]  (login-gated) — edit profiles, analytics, health
```

Two workloads kept apart: heavy measurement traffic (no DB) vs. tiny JSON/DB
API. See [SERVER_ARCHITECTURE.md](./SERVER_ARCHITECTURE.md).

---

## 11. Solutions: Mobile Data Cost & Abuse

### Mobile data cost
- **Adaptive, capped payloads:** start small, grow only on fast links, cap total
  test data to a few MB.
- **Data-saver mode** (`dataSaver: true` in `init`): smaller payloads and
  shorter tests for end-users on metered/limited plans — the developer can wire
  it to the OS data-saver setting.

### Abuse protection
- **API key (`appId`) required** → unknown callers are rejected.
- **Rate limiting** per `appId` and per IP on measurement endpoints.
- **Payload caps** on `/download` and `/upload` (server refuses oversized `N`).
- **`/health` gating** + monitoring to spot abnormal bandwidth use.

---

## 12. Tech Direction (proposed)

- **SDK:** iOS (Swift), Android (Kotlin); shared core (Kotlin Multiplatform) TBD.
- **Server:** Node.js for measurement + API (Go noted as a scale path if
  bandwidth becomes the bottleneck).
- **Database:** Postgres — `jsonb` thresholds for profiles + optional history.
- **Transport:** HTTPS (speed/ping); UDP/WebRTC for packet loss.
- **Hosting:** a cloud region close to target users for low, consistent latency.

---

## 13. Success Criteria

- A full test runs in a few seconds and within a small, capped data budget.
- Results are reasonably consistent (±15%) across repeated runs on the same link.
- A developer integrates and gets a useful answer in **a few lines of code**.
- Works without any single external provider, and handles offline honestly.

---

## 14. Milestones (course missions)

1. Done — Idea confirmed: PingIt SDK (lightweight mobile connection-quality).
2. Done — Research: device data, crash capture, single-source risk.
3. Done — Server architecture (see SERVER_ARCHITECTURE.md).
4. Done — SDK API design (per platform).
5. Done — Implementation.
