const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/open-mic-genius.js');

function response(native = false) {
  const result = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    end(text) { this.body = text ? JSON.parse(text) : null; return this; } };
  if (!native) {
    result.status = function (code) { this.statusCode = code; return this; };
    result.json = function (body) { this.body = body; return this; };
  }
  return result;
}

test('former lyrics endpoint exports a retirement handler and isolated factory', () => {
  assert.equal(typeof require('../api/open-mic-genius.js'), 'function');
  assert.equal(require('../api/open-mic-genius.js').createHandler, createHandler);
});

test('every former query and method returns a no-store 410 without reading configuration or upstream', async () => {
  let accesses = 0;
  const untouched = new Proxy({}, { get() { accesses++; throw new Error('retired configuration must remain unread'); } });
  const handler = createHandler(untouched);
  for (const request of [{}, { method: 'GET', query: { title: 'Some song', artist: 'Some singer' } },
    { method: 'GET', url: '/api/open-mic-genius?title=' + 'x'.repeat(5000) },
    { method: 'POST', body: { lyrics: 'unused original fixture' } }]) {
    for (const native of [false, true]) {
      const res = response(native); await handler(request, res);
      assert.equal(res.statusCode, 410); assert.deepEqual(res.body, { error: 'lyrics_retired' });
      assert.equal(res.headers['Cache-Control'], 'no-store');
      assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
      assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
      assert.deepEqual(Object.keys(res.body), ['error']);
    }
  }
  assert.equal(accesses, 0);
});

test('canonical and legacy token getters, transport and timers are never reached after retirement', async () => {
  let calls = 0;
  function forbidden() { calls++; throw new Error('retired provider must never run'); }
  const env = { get GENIUS_ACCESS_TOKEN() { return forbidden(); }, get Willie() { return forbidden(); } };
  const handler = createHandler({ env, fetch: forbidden, setTimeout: forbidden, now: forbidden });
  const res = response(); await handler({ method: 'GET', query: { title: 'Test', artist: 'Singer' } }, res);
  assert.equal(res.statusCode, 410); assert.equal(calls, 0);
});
