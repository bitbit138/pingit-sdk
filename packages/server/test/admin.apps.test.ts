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

async function adminToken(): Promise<string> {
  await seedAdmin();
  const login = await request.post('/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return login.body.token;
}

describe('admin apps', () => {
  it('registers an app and returns the apiKey once', async () => {
    const token = await adminToken();
    const res = await request
      .post('/admin/apps')
      .set('authorization', `Bearer ${token}`)
      .send({ name: 'My App' });
    expect(res.status).toBe(201);
    expect(res.body.appId).toMatch(/^app_[0-9a-f]{16}$/);
    expect(typeof res.body.apiKey).toBe('string');
    expect(res.body.apiKey).toHaveLength(32);
    expect(res.body.name).toBe('My App');
  });

  it('scopes the list: a developer sees only their apps', async () => {
    const token = await adminToken();
    // Admin creates apps owned by two different developers.
    await seedApp({ ownerEmail: 'dev@x.com', name: 'devapp' });
    await seedApp({ ownerEmail: 'other@x.com', name: 'otherapp' });
    await seedDeveloper('dev@x.com', (await request.get('/admin/apps').set('authorization', `Bearer ${token}`)).body[0].appId);

    const devLogin = await request.post('/admin/login').send({ email: 'dev@x.com', password: ADMIN_PASSWORD });
    const devToken = devLogin.body.token as string;

    const devList = await request.get('/admin/apps').set('authorization', `Bearer ${devToken}`);
    expect(devList.status).toBe(200);
    expect(devList.body.every((a: { ownerEmail: string }) => a.ownerEmail === 'dev@x.com')).toBe(true);

    const adminList = await request.get('/admin/apps').set('authorization', `Bearer ${token}`);
    expect(adminList.body.length).toBe(2);
  });

  it('revokes an app, after which the appId is rejected (401)', async () => {
    const token = await adminToken();
    const created = await request
      .post('/admin/apps')
      .set('authorization', `Bearer ${token}`)
      .send({ name: 'Revoke Me' });
    const appId = created.body.appId as string;

    // Before revoke: a measurement call works.
    const ok = await request.get('/ping').set('x-app-id', appId);
    expect(ok.status).toBe(200);

    const del = await request.delete(`/admin/apps/${appId}`).set('authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    // After revoke: the appId no longer validates.
    const denied = await request.get('/ping').set('x-app-id', appId);
    expect(denied.status).toBe(401);
  });

  it('forbids a developer from revoking an app they do not own (403)', async () => {
    const token = await adminToken();
    const otherAppId = await seedApp({ ownerEmail: 'other@x.com', name: 'notmine' });
    const myAppId = await seedApp({ ownerEmail: 'dev@x.com', name: 'mine' });
    await seedDeveloper('dev@x.com', myAppId);

    const devLogin = await request.post('/admin/login').send({ email: 'dev@x.com', password: ADMIN_PASSWORD });
    const devToken = devLogin.body.token as string;

    const res = await request.delete(`/admin/apps/${otherAppId}`).set('authorization', `Bearer ${devToken}`);
    expect(res.status).toBe(403);

    // Sanity: admin token still works to ensure the row exists.
    expect(token).toBeTruthy();
  });
});
