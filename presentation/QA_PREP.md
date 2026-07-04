# PingIt SDK - Q&A Prep

Fifteen questions you are likely to get, with short answers to rehearse. Keep
answers to one or two sentences when you present.

### 1. What problem does PingIt actually solve?
Apps can't tell whether the connection is good enough for what the user is about
to do. PingIt measures the connection and answers a plain "ready or not" for a
specific activity, so the app can act before the user hits a problem.

### 2. How is this different from just running a speed test?
A speed test hands you raw numbers and leaves you to interpret them. PingIt maps
a live measurement to a named use case and returns pass or fail with a reason,
decides on the device, and keeps working with a fallback when the server is down.

### 3. What are "profiles" and why use them instead of raw Mbps?
Profiles are named use cases (video call, HD streaming, cloud gaming, going live,
big upload). You ask about the activity; we compare the measurement to that
profile's thresholds. The thresholds are tuned server-side, so you never hard-code
magic numbers.

### 4. How does a developer add it to an app?
Add the SDK, and it initializes itself on app startup from a couple of manifest
values (using AndroidX App Startup). Then call `isReadyFor(profile)`. That is
essentially the whole integration.

### 5. Won't this slow the app down or drain battery and data?
No. Tests are short bursts (a few seconds) with capped payloads, run only when you
ask, and skip TCP slow-start for accuracy. Profiles are cached and refreshed about
once a day, and there is an optional data-saver mode. The decision is made on the
device, so a check does not require a server round trip.

### 6. What happens when the phone is offline?
It returns not-ready with the reason "no connection" and no measurement. It never
fakes a pass, because there is no connection to measure.

### 7. What if your measurement server is down?
Measurement falls back to a public endpoint, and the thresholds fall back to the
last cached copy and then to defaults bundled in the SDK. The decision is always
made on the device, so there is no single point of failure.

### 8. How do you measure the numbers, and how accurate are they?
Download times a stream of bytes from the server, upload times a byte push, and
latency and jitter come from repeated pings (jitter is the RFC 3550 mean deviation
between consecutive round-trips). Warm-up is skipped so a short test still reflects
steady-state speed; the goal is repeatability within about 15% on the same link.
Packet loss is not truly measured in this version (a UDP/WebRTC probe is future
work).

### 9. How can the thresholds change without shipping a new app version?
Profiles live in the server database with a version number. An operator edits them
in the dashboard, the version bumps, and the SDK picks up the new values on its
next refresh. No app release required.

### 10. How do you identify an app and a device without accounts?
Two IDs. `appId` is issued in the dashboard and set once in the SDK; it scopes all
data to that app. `deviceId` is an anonymous UUID the SDK generates on first run
and stores on the device; it survives restarts. Neither is a hardware ID.

### 11. What data do you collect, and is it private?
Only the measurement metrics plus the anonymous `deviceId`. No precise location and
no personal data. History is opt-in per app (keep nothing, keep the last result on
the device, or send results to the server).

### 12. What platforms does it support?
Android (Kotlin) today. The measurement-and-decision logic is a pure-Kotlin core,
so it is unit-tested and portable; iOS is planned. The backend is Node and
Postgres, and the dashboard is React.

### 13. How does it catch bugs before the app closes?
On an uncaught exception, the SDK writes the crash to the device immediately, then
uploads it in the background on the next launch through WorkManager. So a crash
right before the app closes is not lost, and it shows up in the dashboard.

### 14. How is talking to the server kept efficient?
Heavy measurement traffic is kept off the database path, decisions happen on the
device (no round trip per check), and thresholds are cached with a randomized daily
refresh so devices do not all call at once. On the read side, the results table has
a composite index that serves "the latest results for one device" without a scan.

### 15. How do you stop abuse or secure it?
Every request needs a valid `appId`, so unknown callers are rejected. There is rate
limiting per app and per IP, payload caps on the download and upload endpoints, and
the dashboard is protected by login and roles, with each developer scoped to their
own app.
