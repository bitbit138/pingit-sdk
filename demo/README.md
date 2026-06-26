# PingIt Demo — "Hub"

A small, casual everyday app ("Hub") that shows **how the PingIt SDK helps**: every
action — message, video call, watch, cloud gaming, photo backup — quietly asks the
SDK *"is the connection good enough for this?"* before it runs, and responds in
context (start the call, drop to SD, suggest backing up later…).

This folder is **independent** of the monorepo (its own `package.json` + install).
It uses a thin JavaScript client (`src/pingit/`) that calls the PingIt server the
same way the Android SDK does — `/download`, `/upload`, `/ping`, `/profiles`,
`/results` — and decides readiness with a **faithful port of the SDK's `Score` and
`Evaluator`** (same weights, same metric order, same reason strings). It's the SDK's
behavior, in the browser.

## Run it

The PingIt **server must be running and seeded** (it creates the demo's `app_demo`):

```bash
# from the repo root, once:
pnpm db:up && pnpm db:seed && pnpm dev:server     # server on :8080

# then, here:
cd demo
npm install
npm run dev            # opens http://localhost:5174
```

Open <http://localhost:5174>.

## Demoing it to someone

1. It measures your real connection on load, and every tile shows **Ready**.
2. Flip the **network selector** to **Mobile (sim)**. *Cloud gaming* and *Photo
   backup* switch to **Not ready** with plain reasons ("download too low",
   "upload too low").
3. Flip to **Weak (sim)**. Only *Messages* stays ready; the rest show casual
   fallbacks when you tap them ("start audio-only?", "switching to SD").
4. Hit **Show measurement** to reveal the raw numbers plus the `appId`/`deviceId`
   and the "reported to server" status.
5. Open the **portal** (`:5173`, sign in as `admin@pingit.dev`) → **Analytics /
   History** → the demo device's results are there. That's the full loop:
   **measure → decide → report → portal**.

> The "Mobile/Weak" presets are a demo aid so the SDK's decisions are visible even
> against a perfect localhost link — the real measurement still runs live.

## Scripts

```bash
npm run dev        # Vite dev server on :5174
npm run build      # typecheck + production build
npm test           # unit tests (Score/Evaluator port fidelity)
npm run smoke      # Node: run the client against the live server, print readiness
```

Override the target with `VITE_PINGIT_ENDPOINT` / `VITE_PINGIT_APP_ID` (browser) or
`PINGIT_ENDPOINT` / `PINGIT_APP_ID` (the smoke script).
