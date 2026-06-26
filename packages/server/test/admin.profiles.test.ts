import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import {
  truncateAll,
  seedAdmin,
  closeTestPool,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from './helpers/testDb.js';

let app: TestHarness['app'];
let request: TestHarness['request'];
let token: string;

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
});

afterAll(async () => {
  await app.close();
  await closeTestPool();
});

const auth = () => ({ authorization: `Bearer ${token}` });

describe('admin profiles CRUD + versioning', () => {
  it('creates a profile and bumps the version', async () => {
    const create = await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'MESSAGING', requires: { downloadMbps: { min: 0.1 } } });
    expect(create.status).toBe(201);
    expect(create.body.version).toBe(1);

    // A second create (different profile) gets the next version.
    const create2 = await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'WEB_BROWSING', requires: { downloadMbps: { min: 1 } } });
    expect(create2.body.version).toBe(2);
  });

  it('lists profiles as admin rows', async () => {
    await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'MESSAGING', requires: { downloadMbps: { min: 0.1 } } });
    const list = await request.get('/admin/profiles').set(auth());
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe('MESSAGING');
    expect(typeof list.body[0].version).toBe('number');
    expect(typeof list.body[0].updatedAt).toBe('string');
  });

  it('bumps the version on edit', async () => {
    await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'MESSAGING', requires: { downloadMbps: { min: 0.1 } } });

    const update = await request
      .put('/admin/profiles/MESSAGING')
      .set(auth())
      .send({ requires: { downloadMbps: { min: 0.5 }, latencyMs: { max: 800 } } });
    expect(update.status).toBe(200);
    expect(update.body.version).toBe(2);

    const list = await request.get('/admin/profiles').set(auth());
    const row = list.body.find((p: { id: string }) => p.id === 'MESSAGING');
    expect(row.version).toBe(2);
    expect(row.requires.downloadMbps.min).toBe(0.5);
  });

  it('deletes a profile and bumps the version', async () => {
    await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'MESSAGING', requires: { downloadMbps: { min: 0.1 } } });
    await request
      .post('/admin/profiles')
      .set(auth())
      .send({ id: 'WEB_BROWSING', requires: { downloadMbps: { min: 1 } } });

    const del = await request.delete('/admin/profiles/MESSAGING').set(auth());
    expect(del.status).toBe(200);
    expect(del.body.version).toBe(3);

    const list = await request.get('/admin/profiles').set(auth());
    expect(list.body).toHaveLength(1);
  });

  it('returns 404 when editing a missing profile', async () => {
    const res = await request
      .put('/admin/profiles/MESSAGING')
      .set(auth())
      .send({ requires: { downloadMbps: { min: 1 } } });
    expect(res.status).toBe(404);
  });
});
