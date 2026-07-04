/**
 * Mock-data seeder for demos and screenshots. Fills the `results` table (and a
 * few `crashes`) for the web-demo app `app_demo` with a realistic spread across
 * the last 30 days and several devices, so the dashboard, history, and analytics
 * pages look populated. Idempotent: it clears `app_demo` rows first.
 *
 * Run: `pnpm --filter @pingit/server db:seed:mock`
 */
import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { makePool, closePool, type Pool } from '../db/pool.js';

const APP_ID = 'app_demo';
const DEVICES = [
  'device-aurora',
  'device-borealis',
  'device-cirrus',
  'device-delta',
  'device-echo',
  'device-fjord',
];
const DAYS = 30;
const DAY_MS = 86_400_000;

interface Metrics {
  dl: number;
  ul: number;
  lat: number;
  jit: number;
  loss: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

// Connection "tiers" with rough real-world shapes and how often they occur.
const TIERS: Array<{ p: number; gen: () => Metrics }> = [
  { p: 0.45, gen: () => ({ dl: rnd(40, 200), ul: rnd(20, 80), lat: rnd(8, 38), jit: rnd(1, 8), loss: rnd(0, 1) }) }, // strong wifi
  { p: 0.25, gen: () => ({ dl: rnd(8, 22), ul: rnd(2, 7), lat: rnd(45, 120), jit: rnd(8, 24), loss: rnd(0, 2) }) }, // good mobile
  { p: 0.2, gen: () => ({ dl: rnd(0.6, 3), ul: rnd(0.2, 1.2), lat: rnd(140, 380), jit: rnd(18, 55), loss: rnd(1, 6) }) }, // weak
  { p: 0.1, gen: () => ({ dl: rnd(0.1, 0.7), ul: rnd(0.05, 0.3), lat: rnd(300, 800), jit: rnd(40, 120), loss: rnd(3, 10) }) }, // poor
];

function pickMetrics(): Metrics {
  const r = Math.random();
  let acc = 0;
  for (const t of TIERS) {
    acc += t.p;
    if (r <= acc) return t.gen();
  }
  return TIERS[0]!.gen();
}

// Quality score, matching the SDK's Score weighting (download .35, upload .15,
// latency .25, jitter .10, loss .15).
const sat = (v: number, full: number): number => (v <= 0 ? 0 : Math.min(1, v / full));
const dec = (v: number, good: number, bad: number): number =>
  v <= good ? 1 : v >= bad ? 0 : Math.max(0, 1 - (v - good) / (bad - good));
function score(m: Metrics): number {
  const c =
    0.35 * sat(m.dl, 25) +
    0.15 * sat(m.ul, 10) +
    0.25 * dec(m.lat, 20, 300) +
    0.1 * dec(m.jit, 5, 60) +
    0.15 * dec(m.loss, 0, 10);
  return Math.max(0, Math.min(100, Math.trunc(c * 100)));
}

type Row = [string, string, number, number, number, number, number, number, string];

async function insertResults(pool: Pool, rows: Row[]): Promise<void> {
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((row, idx) => {
      const b = idx * 9;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`);
      params.push(...row);
    });
    await pool.query(
      `INSERT INTO results
         (app_id, device_id, download_mbps, upload_mbps, latency_ms, jitter_ms, packet_loss_pct, score, created_at)
       VALUES ${values.join(',')}`,
      params,
    );
  }
}

export async function runMockSeed(databaseUrl: string): Promise<void> {
  const pool = makePool(databaseUrl);
  try {
    await pool.query('DELETE FROM results WHERE app_id = $1', [APP_ID]);
    await pool.query('DELETE FROM crashes WHERE app_id = $1', [APP_ID]);

    const now = Date.now();
    const rows: Row[] = [];

    for (let d = DAYS - 1; d >= 0; d--) {
      const perDay = 8 + Math.floor(Math.random() * 12); // 8..19 per day
      for (let i = 0; i < perDay; i++) {
        const m = pickMetrics();
        const ts = new Date(now - d * DAY_MS + Math.floor(Math.random() * DAY_MS));
        rows.push([
          APP_ID,
          pick(DEVICES),
          round2(m.dl),
          round2(m.ul),
          round1(m.lat),
          round1(m.jit),
          round1(m.loss),
          score(m),
          ts.toISOString(),
        ]);
      }
    }
    // Guarantee a handful of rows for "today" so the Tests-today KPI is non-zero.
    for (let i = 0; i < 10; i++) {
      const m = pickMetrics();
      const ts = new Date(now - Math.floor(Math.random() * 36_000_000));
      rows.push([
        APP_ID,
        DEVICES[i % DEVICES.length]!,
        round2(m.dl),
        round2(m.ul),
        round1(m.lat),
        round1(m.jit),
        round1(m.loss),
        score(m),
        ts.toISOString(),
      ]);
    }

    await insertResults(pool, rows);

    const crashMessages = [
      'NullPointerException in SyncWorker',
      'SocketTimeoutException reaching /upload',
      'IllegalStateException: profile cache miss',
      'OutOfMemoryError while decoding response',
      'JsonDecodingException in /results parser',
    ];
    for (let i = 0; i < 7; i++) {
      const ts = new Date(now - Math.floor(Math.random() * DAYS * DAY_MS));
      await pool.query(
        `INSERT INTO crashes (app_id, device_id, message, stack, platform, app_version, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          APP_ID,
          DEVICES[i % DEVICES.length]!,
          crashMessages[i % crashMessages.length]!,
          'at com.pingit.android.work.UploadWorker.doWork(UploadWorker.kt:48)\n  at ...',
          'Android',
          `1.${i}.0`,
          ts.toISOString(),
        ],
      );
    }

    // eslint-disable-next-line no-console
    console.log(`Mock data inserted for ${APP_ID}: ${rows.length} results across ${DAYS} days, 7 crashes.`);
  } finally {
    await closePool(pool);
  }
}

const isMain = process.argv[1]?.endsWith('mock.ts') || process.argv[1]?.endsWith('mock.js');
if (isMain) {
  runMockSeed(loadConfig().DATABASE_URL)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
