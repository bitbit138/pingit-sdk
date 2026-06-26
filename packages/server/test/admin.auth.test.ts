import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import {
  truncateAll,
  seedAdmin,
  seedApp,
  seedDeveloper,
  closeTestPool,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from './helpers/testDb.js';

let app: TestHarness['app'];
let request: TestHarness['request'];

beforeAll(async () => {
  const harness = await makeTestApp();
  app = harness.app;
  request = harness.request;
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await app.close();
  await closeTestPool();
});

describe('POST /admin/login', () => {
  it('logs in an admin and returns a token', async () => {
    await seedAdmin();
    const res = await request.post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.role).toBe('admin');
    expect(res.body.email).toBe(ADMIN_EMAIL);
    expect(typeof res.body.expiresAt).toBe('string');
    expect(res.body.appId).toBeUndefined();
  });

  it('includes appId for a developer login', async () => {
    const appId = await seedApp({ ownerEmail: 'dev@x.com' });
    await seedDeveloper('dev@x.com', appId);
    const res = await request.post('/admin/login').send({ email: 'dev@x.com', password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('developer');
    expect(res.body.appId).toBe(appId);
  });

  it('rejects bad credentials with 401', async () => {
    await seedAdmin();
    const res = await request.post('/admin/login').send({ email: ADMIN_EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown user with 401', async () => {
    const res = await request.post('/admin/login').send({ email: 'nobody@x.com', password: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('role enforcement', () => {
  it('forbids a developer from the admin-only profiles list (403)', async () => {
    const appId = await seedApp({ ownerEmail: 'dev@x.com' });
    await seedDeveloper('dev@x.com', appId);
    const login = await request.post('/admin/login').send({ email: 'dev@x.com', password: ADMIN_PASSWORD });
    const token = login.body.token as string;

    const res = await request.get('/admin/profiles').set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a missing token with 401', async () => {
    const res = await request.get('/admin/profiles');
    expect(res.status).toBe(401);
  });
});
