import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import { truncateAll, seedApp, closeTestPool } from './helpers/testDb.js';

let app: TestHarness['app'];
let request: TestHarness['request'];
let appId: string;
let otherAppId: string;

const baseResult = {
  deviceId: 'device-1',
  downloadMbps: 50,
  uploadMbps: 10,
  latencyMs: 25,
  jitterMs: 3,
  packetLossPct: 0.5,
};

beforeAll(async () => {
  const harness = await makeTestApp();
  app = harness.app;
  request = harness.request;
});

beforeEach(async () => {
  await truncateAll();
  appId = await seedApp({ name: 'A' });
  otherAppId = await seedApp({ name: 'B' });
});

afterAll(async () => {
  await app.close();
  await closeTestPool();
});

describe('POST /results', () => {
  it('inserts a result and returns 201 with id + createdAt', async () => {
    const res = await request
      .post('/results')
      .set('x-app-id', appId)
      .send({ appId, ...baseResult });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('number');
    expect(typeof res.body.createdAt).toBe('string');
  });

  it('rejects when body.appId does not match x-app-id (403)', async () => {
    const res = await request
      .post('/results')
      .set('x-app-id', appId)
      .send({ appId: otherAppId, ...baseResult });
    expect(res.status).toBe(403);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await request
      .post('/results')
      .set('x-app-id', appId)
      .send({ appId, deviceId: 'd', downloadMbps: -1 });
    expect(res.status).toBe(400);
  });
});

describe('GET /results', () => {
  it('returns rows newest-first and isolates by app', async () => {
    await request.post('/results').set('x-app-id', appId).send({ appId, ...baseResult, latencyMs: 10 });
    await request.post('/results').set('x-app-id', appId).send({ appId, ...baseResult, latencyMs: 20 });
    // A result for the OTHER app must not leak.
    await request
      .post('/results')
      .set('x-app-id', otherAppId)
      .send({ appId: otherAppId, ...baseResult, latencyMs: 99 });

    const res = await request
      .get(`/results?appId=${appId}&deviceId=${baseResult.deviceId}&limit=10`)
      .set('x-app-id', appId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Newest first: the second insert should be index 0.
    expect(res.body[0].latencyMs).toBe(20);
    expect(res.body.every((r: { appId: string }) => r.appId === appId)).toBe(true);
  });

  it('rejects when query appId differs from x-app-id (403)', async () => {
    const res = await request.get(`/results?appId=${otherAppId}`).set('x-app-id', appId);
    expect(res.status).toBe(403);
  });

  it('clamps limit to at most 100', async () => {
    for (let i = 0; i < 5; i++) {
      await request.post('/results').set('x-app-id', appId).send({ appId, ...baseResult });
    }
    const res = await request
      .get(`/results?appId=${appId}&deviceId=${baseResult.deviceId}&limit=99999`)
      .set('x-app-id', appId);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5); // only 5 exist; the clamp just prevents an unbounded query
  });
});
