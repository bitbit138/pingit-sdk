import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import { truncateAll, seedApp, seedProfile, closeTestPool } from './helpers/testDb.js';

let app: TestHarness['app'];
let request: TestHarness['request'];
let appId: string;

beforeAll(async () => {
  const harness = await makeTestApp();
  app = harness.app;
  request = harness.request;
});

beforeEach(async () => {
  await truncateAll();
  appId = await seedApp();
});

afterAll(async () => {
  await app.close();
  await closeTestPool();
});

describe('GET /profiles', () => {
  it('returns version 0 and no profiles when the table is empty', async () => {
    const res = await request.get('/profiles').set('x-app-id', appId);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(0);
    expect(res.body.profiles).toEqual([]);
  });

  it('returns the max version and the profile list', async () => {
    await seedProfile('MESSAGING', { downloadMbps: { min: 0.1 } }, 1);
    await seedProfile('VIDEO_CALL', { latencyMs: { max: 200 } }, 3);

    const res = await request.get('/profiles').set('x-app-id', appId);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(3);
    expect(res.body.profiles).toHaveLength(2);
    const ids = res.body.profiles.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual(['MESSAGING', 'VIDEO_CALL']);
  });

  it('requires a valid appId', async () => {
    const res = await request.get('/profiles');
    expect(res.status).toBe(401);
  });
});
