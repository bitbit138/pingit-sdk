import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import {
  truncateAll,
  seedAdmin,
  seedApp,
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

const crash = {
  deviceId: 'crash-device',
  message: 'Something broke',
  platform: 'android',
  stack: 'at foo()\nat bar()',
  appVersion: '1.2.3',
};

describe('crashes', () => {
  it('POST /crashes inserts a crash and returns 201 with id', async () => {
    const res = await request.post('/crashes').set('x-app-id', appId).send({ appId, ...crash });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('number');
  });

  it('POST /crashes validates the body (400)', async () => {
    const res = await request.post('/crashes').set('x-app-id', appId).send({ appId, deviceId: 'd' });
    expect(res.status).toBe(400);
  });

  it('POST /crashes requires a valid appId (401)', async () => {
    const res = await request.post('/crashes').set('x-app-id', 'app_nope').send({ appId, ...crash });
    expect(res.status).toBe(401);
  });

  it('GET /admin/crashes returns crashes scoped to an app', async () => {
    await request.post('/crashes').set('x-app-id', appId).send({ appId, ...crash });
    const otherApp = await seedApp({ name: 'other' });
    await request.post('/crashes').set('x-app-id', otherApp).send({ appId: otherApp, ...crash });

    const res = await request.get(`/admin/crashes?appId=${appId}`).set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].appId).toBe(appId);
    expect(res.body[0].message).toBe('Something broke');
  });

  it('GET /admin/crashes requires auth', async () => {
    const res = await request.get('/admin/crashes');
    expect(res.status).toBe(401);
  });
});
