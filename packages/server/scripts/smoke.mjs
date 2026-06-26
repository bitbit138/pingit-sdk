#!/usr/bin/env node
// Zero-dependency end-to-end smoke test against a running PingIt server.
// Uses the global fetch (Node 18+). Exits 1 on the first failed assertion.

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@pingit.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

async function main() {
  // 1. Admin login -> token
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(loginRes.ok, `login failed: ${loginRes.status}`);
  const login = await loginRes.json();
  assert(typeof login.token === 'string' && login.token.length > 0, 'no token in login response');
  const token = login.token;
  console.log('login ok');

  // 2. Create an app (Bearer) -> appId
  const appRes = await fetch(`${BASE_URL}/admin/apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'smoke' }),
  });
  assert(appRes.ok, `create app failed: ${appRes.status}`);
  const app = await appRes.json();
  assert(typeof app.appId === 'string' && app.appId.startsWith('app_'), 'no appId');
  assert(typeof app.apiKey === 'string', 'no apiKey');
  const appId = app.appId;
  console.log(`app created: ${appId}`);

  // 3. Download 1 MiB, assert Content-Length and actual body size.
  const dlBytes = 1048576;
  const dlRes = await fetch(`${BASE_URL}/download?bytes=${dlBytes}`, {
    headers: { 'x-app-id': appId },
  });
  assert(dlRes.ok, `download failed: ${dlRes.status}`);
  assert(
    dlRes.headers.get('content-length') === String(dlBytes),
    `content-length mismatch: ${dlRes.headers.get('content-length')}`,
  );
  const dlBuf = Buffer.from(await dlRes.arrayBuffer());
  assert(dlBuf.length === dlBytes, `download body size ${dlBuf.length} != ${dlBytes}`);
  console.log(`download ok (${dlBuf.length} bytes)`);

  // 4. Upload 512 KiB octet-stream, assert bytesReceived.
  const upBytes = 524288;
  const payload = Buffer.alloc(upBytes, 7);
  const upRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'x-app-id': appId, 'content-type': 'application/octet-stream' },
    body: payload,
  });
  assert(upRes.ok, `upload failed: ${upRes.status}`);
  const up = await upRes.json();
  assert(up.bytesReceived === upBytes, `bytesReceived ${up.bytesReceived} != ${upBytes}`);
  console.log(`upload ok (${up.bytesReceived} bytes, ${up.elapsedMs}ms)`);

  // 5. Ping x10 -> avg latency + jitter.
  const latencies = [];
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    const pRes = await fetch(`${BASE_URL}/ping`, { headers: { 'x-app-id': appId } });
    assert(pRes.ok, `ping failed: ${pRes.status}`);
    const body = await pRes.json();
    assert(typeof body.t === 'number', 'ping has no t');
    latencies.push(Date.now() - t0);
  }
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const jitter =
    latencies.slice(1).reduce((a, l, i) => a + Math.abs(l - latencies[i]), 0) /
    Math.max(1, latencies.length - 1);
  console.log(`ping ok (avg ${avg.toFixed(1)}ms, jitter ${jitter.toFixed(1)}ms)`);

  // 6. Post a result.
  const deviceId = 'smoke-device';
  const postRes = await fetch(`${BASE_URL}/results`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-id': appId },
    body: JSON.stringify({
      appId,
      deviceId,
      downloadMbps: 50.5,
      uploadMbps: 10.2,
      latencyMs: 25,
      jitterMs: 3,
      packetLossPct: 0.1,
      score: 88,
    }),
  });
  assert(postRes.status === 201, `post result expected 201, got ${postRes.status}`);
  const posted = await postRes.json();
  assert(typeof posted.id === 'number', 'posted result has no id');
  console.log(`result posted (id ${posted.id})`);

  // 7. Get results, assert our row present + newest.
  const getRes = await fetch(
    `${BASE_URL}/results?appId=${appId}&deviceId=${deviceId}&limit=10`,
    { headers: { 'x-app-id': appId } },
  );
  assert(getRes.ok, `get results failed: ${getRes.status}`);
  const list = await getRes.json();
  assert(Array.isArray(list) && list.length >= 1, 'no results returned');
  assert(list[0].id === posted.id, `newest result id ${list[0]?.id} != ${posted.id}`);
  console.log(`results listed (${list.length}, newest=${list[0].id})`);

  // 8. Negative: bogus x-app-id -> 401.
  const badRes = await fetch(`${BASE_URL}/download?bytes=1`, {
    headers: { 'x-app-id': 'app_bogusbogusbogus' },
  });
  assert(badRes.status === 401, `bogus appId expected 401, got ${badRes.status}`);
  console.log('bogus appId -> 401 ok');

  // 9. Negative: out-of-range bytes -> 400.
  const oorRes = await fetch(`${BASE_URL}/download?bytes=999999999`, {
    headers: { 'x-app-id': appId },
  });
  assert(oorRes.status === 400, `oversized bytes expected 400, got ${oorRes.status}`);
  console.log('oversized bytes -> 400 ok');

  console.log('SMOKE OK');
}

main().catch((err) => fail(err?.message ?? String(err)));
