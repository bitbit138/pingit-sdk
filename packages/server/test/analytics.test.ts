import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import {
  truncateAll,
  seedAdmin,
  seedApp,
  seedProfile,
  seedResult,
  closeTestPool,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from './helpers/testDb.js';

let app: TestHarness['app'];
let request: TestHarness['request'];
let token: string;
let appId: string;

beforeAll(async () => {
  const harness = await makeTestApp();
  app = harness.app;
  request = harness.request;
});

beforeEach(async () => {
  await truncateAll();
  await seedAdmin();
  const login = await request.post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = login.body.token;
  appId = await seedApp();
});

afterAll(async () => {
  await app.close();
  await closeTestPool();
});

const auth = () => ({ authorization: `Bearer ${token}` });

describe('GET /admin/analytics', () => {
  it('aggregates KPIs and re-evaluates pass rates against profiles', async () => {
    // Profile: latency must be <= 100ms.
    await seedProfile('VIDEO_CALL', { latencyMs: { max: 100 } }, 1);

    // 2 passing (latency 25/50), 1 failing (latency 500).
    await seedResult({ appId, deviceId: 'd1', latencyMs: 25 });
    await seedResult({ appId, deviceId: 'd2', latencyMs: 50 });
    await seedResult({ appId, deviceId: 'd1', latencyMs: 500 });

    const res = await request.get(`/admin/analytics?appId=${appId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.kpis.totalTests).toBe(3);
    expect(res.body.kpis.distinctDevices).toBe(2);
    expect(res.body.kpis.fallbackRatePct).toBe(0);

    const vc = res.body.passRateByProfile.find((p: { profile: string }) => p.profile === 'VIDEO_CALL');
    expect(vc.count).toBe(3);
    // 2 of 3 pass -> ~66.7%
    expect(vc.passRatePct).toBeCloseTo(66.7, 1);
  });

  it('returns empty KPIs when there is no data', async () => {
    const res = await request.get(`/admin/analytics?appId=${appId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.kpis.totalTests).toBe(0);
    expect(res.body.kpis.avgLatencyMs).toBe(0);
  });

  it('scopes results to the requested app', async () => {
    const otherApp = await seedApp({ name: 'other' });
    await seedResult({ appId, deviceId: 'd1', latencyMs: 10 });
    await seedResult({ appId: otherApp, deviceId: 'd2', latencyMs: 20 });

    const res = await request.get(`/admin/analytics?appId=${appId}`).set(auth());
    expect(res.body.kpis.totalTests).toBe(1);
    expect(res.body.scope.appId).toBe(appId);
  });

  it('requires authentication', async () => {
    const res = await request.get('/admin/analytics');
    expect(res.status).toBe(401);
  });
});
