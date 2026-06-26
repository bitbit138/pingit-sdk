import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { TestHarness } from './helpers/testApp.js';
import { makeTestApp } from './helpers/testApp.js';
import { truncateAll, seedApp, closeTestPool } from './helpers/testDb.js';

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

describe('measurement endpoints', () => {
  it('GET /download returns the requested number of bytes', async () => {
    const res = await request
      .get('/download?bytes=65536')
      .set('x-app-id', appId)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBe('65536');
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect((res.body as Buffer).length).toBe(65536);
  });

  it('GET /download rejects out-of-range bytes with 400', async () => {
    const res = await request.get('/download?bytes=999999999').set('x-app-id', appId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bytes_out_of_range');
    expect(typeof res.body.max).toBe('number');
  });

  it('GET /download rejects a bad appId with 401', async () => {
    const res = await request.get('/download?bytes=1024').set('x-app-id', 'app_nope');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_app_id');
  });

  it('POST /upload returns 413 when the payload exceeds the cap', async () => {
    const tooBig = Buffer.alloc(1048576 + 1024, 1); // cap is 1 MiB in tests
    const res = await request
      .post('/upload')
      .set('x-app-id', appId)
      .set('content-type', 'application/octet-stream')
      .send(tooBig);
    expect(res.status).toBe(413);
  });

  it('POST /upload counts received bytes', async () => {
    const payload = Buffer.alloc(4096, 2);
    const res = await request
      .post('/upload')
      .set('x-app-id', appId)
      .set('content-type', 'application/octet-stream')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.bytesReceived).toBe(4096);
    expect(typeof res.body.elapsedMs).toBe('number');
  });

  it('GET /ping returns a timestamp', async () => {
    const res = await request.get('/ping').set('x-app-id', appId);
    expect(res.status).toBe(200);
    expect(typeof res.body.t).toBe('number');
  });

  it('GET /health needs no appId', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSec).toBe('number');
  });
});
