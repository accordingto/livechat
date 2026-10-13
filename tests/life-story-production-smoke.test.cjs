'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { run, DATABASE, SERVICE } = require('../scripts/life-story-production-smoke.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const firebase = value => {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, firebase(item)]).filter(([, item]) => item != null);
  if (!entries.length) return null;
  if (Array.isArray(value)) { const result = []; for (const [key, item] of entries) result[Number(key)] = item; return result; }
  return Object.fromEntries(entries);
};
function fixture({ replaceOnFailure = false } = {}) {
  const nodes = new Map(), versions = new Map(), operations = [], publicWrites = new Set();
  let clock = Date.now(), failRegistration = replaceOnFailure, replacedPath;
  const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  async function fetchImpl(url, options = {}) {
    clock++;
    if (url === SERVICE) {
      if (!options.method || options.method === 'GET') return response({ ready: true, version: 1 }, 200, { 'X-Icebreak-Life-Story': '1', Date: new Date(clock).toUTCString() });
      const body = JSON.parse(options.body);
      if (failRegistration && body.operation === 'register') {
        failRegistration = false;
        replacedPath = [...nodes.keys()].find(path => path.endsWith('/' + body.seats[0].token));
        nodes.set(replacedPath, { foreign: true }); versions.set(replacedPath, versions.get(replacedPath) + 1);
        return response({ error: 'test_failure' }, 503);
      }
      try {
        const service = createExecutor({ secret: '47'.repeat(32), databaseURL: DATABASE, fetchImpl, now: () => clock });
        return response(await service[body.operation](body));
      } catch (error) { return response({ error: error.code || 'test_failure' }, error.status || 503); }
    }
    assert(url.startsWith(DATABASE + '/'), 'the smoke contacts only the existing database and service');
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    assert.match(path, /^rooms\/LS[A-F0-9]{8}\/players\/[a-f0-9]{20,32}$/, 'never list/read a room root or unrelated path');
    const method = options.method || 'GET', version = versions.get(path) || 0;
    operations.push({ method, path });
    if (method === 'GET') return response(nodes.get(path) ?? null, 200, { etag: '"' + version + '"' });
    assert(options.headers['If-Match'], 'all fixture writes/deletes are conditional');
    if (options.headers['If-Match'] !== '"' + version + '"') return response(null, 412);
    if (method === 'PUT') {
      const value = firebase(JSON.parse(options.body));
      if (!nodes.has(path)) { assert(value.qaLifeSmoke); publicWrites.add(path); }
      nodes.set(path, value); versions.set(path, version + 1); return response(value);
    }
    assert.equal(method, 'DELETE'); nodes.delete(path); versions.set(path, version + 1); return response(null);
  }
  return { fetchImpl, now: () => clock, nodes, operations, publicWrites, replaced: () => replacedPath };
}
test('production smoke completes through the actual executor locally and conditionally cleans exactly five fresh nodes', async () => {
  const f = fixture(), report = await run({ fetchImpl: f.fetchImpl, now: f.now });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.step, 'complete'); assert(report.passed > 100);
  assert.deepEqual(report.cleanup, { tracked: 5, deleted: 5, empty: 0, failed: 0 });
  assert.equal(f.publicWrites.size, 5); assert.equal(f.nodes.size, 0);
  assert.equal(new Set(f.operations.map(o => o.path)).size, 5);
  assert.equal(f.operations.filter(o => o.method === 'DELETE').length, 5);
  assert(!JSON.stringify(report).includes('capsule') && !JSON.stringify(report).includes('token') && !JSON.stringify(report).includes('marker'));
});
test('failed live registration still cleans owned nodes and never deletes a replaced foreign node', async () => {
  const f = fixture({ replaceOnFailure: true }), report = await run({ fetchImpl: f.fetchImpl, now: f.now });
  assert.equal(report.ok, false); assert.equal(report.step, 'register');
  assert.deepEqual(report.cleanup, { tracked: 5, deleted: 4, empty: 0, failed: 1 });
  assert.equal(f.nodes.size, 1); assert.deepEqual(f.nodes.get(f.replaced()), { foreign: true });
  assert(!f.operations.some(op => op.method === 'DELETE' && op.path === f.replaced()));
});
