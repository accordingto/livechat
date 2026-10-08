// Exercise the real HTTP handler with a synthetic environment and executor.
// No test reads process.env or calls Firebase/the network.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { keyFrom } = require('../runtime/hub-executor-core.cjs');
const source = fs.readFileSync(require.resolve('../api/hub-executor.js'), 'utf8');
const SECRET = 'a1'.repeat(32);
const normalize = value => value == null ? value : JSON.parse(JSON.stringify(value));
function harness(options = {}) {
  const made = [], calls = [];
  const methods = {};
  for (const operation of ['register', 'execute', 'release']) methods[operation] = async body => {
    calls.push({ operation, body: normalize(body) });
    if (options.fail) throw options.fail;
    return options.result || { ok: true, operation };
  };
  const context = vm.createContext({ module: { exports: {} },
    process: { env: options.env === undefined ? { HUB_EXECUTOR_SECRET: SECRET } : options.env },
    require(name) {
      assert.equal(name, '../runtime/hub-executor-core.cjs');
      return { keyFrom, createExecutor(config) { made.push(normalize(config)); keyFrom(config.secret); return methods; } };
    } });
  vm.runInContext(source, context, { filename: 'api/hub-executor.js' });
  async function request(input = {}) {
    const res = { statusCode: 200, headers: {}, ended: false,
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = normalize(value); this.ended = true; return this; },
      end() { this.ended = true; return this; } };
    await context.module.exports({ method: input.method || 'POST', headers: input.headers || {}, body: input.body }, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.ended, true);
    return res;
  }
  return { request, made, calls };
}
function assertNoPrivateDetails(res, markers) {
  const wire = JSON.stringify({ statusCode: res.statusCode, headers: res.headers, body: res.body });
  for (const marker of markers) assert.equal(wire.includes(marker), false, 'Response leaked synthetic private data: ' + marker);
}

test('GET reports unavailable for missing/invalid configuration without constructing an executor', async () => {
  for (const secret of [undefined, null, 42, '', 'x'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), ' ' + SECRET]) {
    const h = harness({ env: secret === undefined ? {} : { HUB_EXECUTOR_SECRET: secret } });
    const res = await h.request({ method: 'GET' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ready: false, version: 1 });
    assert.equal(h.made.length, 0);
    assert.equal(h.calls.length, 0);
  }
});

test('GET reveals only readiness and protocol version for a valid secret', async () => {
  for (const secret of [SECRET, SECRET.toUpperCase()]) {
    const h = harness({ env: { HUB_EXECUTOR_SECRET: secret } });
    const res = await h.request({ method: 'GET', headers: { origin: 'https://livechat-two-alpha.vercel.app' } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ready: true, version: 1 });
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://livechat-two-alpha.vercel.app');
    assert.equal(h.made.length, 0);
    assertNoPrivateDetails(res, [secret]);
  }
});

test('CORS permits both known deployments and explicit local development origins', async () => {
  for (const origin of ['https://livechat-two-alpha.vercel.app', 'https://icebreaker-youtube-search.vercel.app',
    'http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:4173']) {
    const h = harness();
    const res = await h.request({ method: 'GET', headers: { origin } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
    assert.equal(res.headers.Vary, 'Origin');
    assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
    assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
  }
});

test('CORS rejects untrusted and suffix-spoofed origins before readiness or operation dispatch', async () => {
  for (const origin of ['https://attacker.example', 'null', 'https://livechat-two-alpha.vercel.app.attacker.example',
    'https://icebreaker-youtube-search.vercel.app/', 'http://localhost.attacker.example:3000',
    'http://127.0.0.1.attacker.example', 'https://localhost:3000']) {
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const h = harness();
      const res = await h.request({ method, headers: { origin }, body: { operation: 'execute', token: 'private-token' } });
      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { error: 'origin_denied' });
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
      assert.equal(h.made.length, 0);
      assert.equal(h.calls.length, 0);
      assertNoPrivateDetails(res, [SECRET, 'private-token']);
    }
  }
});

test('OPTIONS succeeds without a configured executor or request body', async () => {
  const h = harness({ env: {} });
  const res = await h.request({ method: 'OPTIONS', headers: { origin: 'http://localhost:8080' } });
  assert.equal(res.statusCode, 204);
  assert.equal(res.body, undefined);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'http://localhost:8080');
  assert.equal(res.headers.Vary, 'Origin');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
  assert.equal(h.made.length, 0);
});

test('unsupported methods are rejected before constructing a service', async () => {
  for (const method of ['HEAD', 'PUT', 'PATCH', 'DELETE']) {
    const h = harness();
    const res = await h.request({ method, body: { operation: 'execute' } });
    assert.equal(res.statusCode, 405);
    assert.deepEqual(res.body, { error: 'method_not_allowed' });
    assert.equal(h.made.length, 0);
    assert.equal(h.calls.length, 0);
  }
});

test('missing, primitive and array POST bodies are invalid requests, not service failures', async () => {
  for (const body of [undefined, null, 'null', '', '   ', [], 'true', '42', '[]', 'false', '0']) {
    const h = harness();
    const res = await h.request({ body });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'invalid_request' });
    assert.equal(h.made.length, 0);
    assert.equal(h.calls.length, 0);
  }
});

test('malformed JSON receives a client error without leaking the request', async () => {
  for (const body of ['{', '[}', '{"operation":"execute", "token":"secret-player-token",}']) {
    const h = harness();
    const res = await h.request({ body });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'invalid_request' });
    assert.equal(h.made.length, 0);
    assert.equal(h.calls.length, 0);
    assertNoPrivateDetails(res, ['secret-player-token']);
  }
});

test('oversized structured or JSON requests are rejected before operation dispatch', async () => {
  const body = { operation: 'execute', capsule: 'x'.repeat(36001), token: 'secret-player-token' };
  for (const candidate of [body, JSON.stringify(body)]) {
    const h = harness();
    const res = await h.request({ body: candidate });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'invalid_request' });
    assert.equal(h.made.length, 0);
    assert.equal(h.calls.length, 0);
    assertNoPrivateDetails(res, ['secret-player-token', 'x'.repeat(100)]);
  }
});

test('unknown operations dispatch no executor method', async () => {
  for (const body of [{ operation: 'admin' }, {}, { operation: null }, { operation: 'EXECUTE' }]) {
    const h = harness();
    const res = await h.request({ body });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'invalid_operation' });
    assert.equal(h.calls.length, 0);
  }
});

test('POST dispatches each supported operation exactly once from object and JSON bodies', async () => {
  for (const operation of ['register', 'execute', 'release']) {
    for (const stringify of [false, true]) {
      const body = { operation, game: 'cut', code: 'TEST', token: 'synthetic-player-token', capsule: 'synthetic-capsule' };
      const h = harness({ result: { ok: true, receipt: operation, revision: 8 } });
      const res = await h.request({ body: stringify ? JSON.stringify(body) : body });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { ok: true, receipt: operation, revision: 8 });
      assert.deepEqual(h.calls, [{ operation, body }]);
      assert.deepEqual(h.made, [{ secret: SECRET }]);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
      assertNoPrivateDetails(res, [SECRET, 'synthetic-player-token', 'synthetic-capsule']);
    }
  }
});

test('POST without configured secret returns a safe readiness error and dispatches no command', async () => {
  for (const env of [{}, { HUB_EXECUTOR_SECRET: 'wrong-config-format' }]) {
    const h = harness({ env });
    const res = await h.request({ body: { operation: 'execute', token: 'synthetic-player-token' } });
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'executor_not_configured' });
    assert.equal(h.calls.length, 0);
    assertNoPrivateDetails(res, ['wrong-config-format', 'synthetic-player-token']);
  }
});

test('executor error status/code remain actionable while private upstream details stay private', async () => {
  const markers = [SECRET, 'rooms/SECRET/players/private-token', 'private-token', 'sealed-private-ticket', 'private-card-content'];
  for (const [code, status] of [['storage_unavailable', 503], ['stale_executor', 409], ['invalid_ticket', 403]]) {
    const fail = Object.assign(new Error(markers.join(' / ')), { code, status,
      path: markers[1], token: markers[2], capsule: markers[3], upstreamBody: { hand: markers[4] } });
    const h = harness({ fail });
    const res = await h.request({ body: { operation: 'execute', token: markers[2], capsule: markers[3] } });
    assert.equal(res.statusCode, status);
    assert.deepEqual(res.body, { error: code });
    assert.equal(h.calls.length, 1);
    assertNoPrivateDetails(res, markers);
  }
});

test('unexpected errors return a stable generic code without raw messages or stacks', async () => {
  const markers = [SECRET, 'rooms/PRIVATE/players/private-bearer', 'private-hand-payload'];
  const fail = new Error(markers.join(' / '));
  const h = harness({ fail });
  const res = await h.request({ body: { operation: 'register', controlToken: 'private-bearer' } });
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { error: 'executor_unavailable' });
  assert.equal(h.calls.length, 1);
  assertNoPrivateDetails(res, [...markers, 'private-bearer', 'stack']);
});
