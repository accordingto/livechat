'use strict';
// Local-only harness for the opt-in production checker. Its fetch dependency
// never reaches the network; real engines/service logic run over exact nodes.
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, qaSettings } = require('../scripts/once-upon-a-time-service-test.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { adapters } = require('../runtime/story-executor.cjs');
const DECK = require('../once-upon-a-time-deck.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', ...headers }
});

// Match actual RTDB: omit null/empty containers, retain sparse numeric slots,
// and optionally return every list as a numeric-key object.
function firebaseWire(value, numericLists = false) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const values = value.map(item => firebaseWire(item, numericLists));
    while (values.length && values.at(-1) == null) values.pop();
    if (!values.length) return null;
    return numericLists ? Object.fromEntries(values.map((item, index) => [index, item]).filter(([, item]) => item != null)) : values;
  }
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, firebaseWire(item, numericLists)]).filter(([, item]) => item != null);
  if (!entries.length) return null;
  if (!numericLists && entries.every(([key]) => /^\d+$/.test(key))) {
    const maximum = Math.max(...entries.map(([key]) => Number(key)));
    if (maximum < entries.length * 2) {
      const result = Array(maximum + 1).fill(null); for (const [key, item] of entries) result[Number(key)] = item;
      return result;
    }
  }
  return Object.fromEntries(entries);
}

function isolatedBoundary({ numericLists = false } = {}) {
  const nodes = new Map(), versions = new Map(), requests = [], deleted = [], created = new Set();
  const boundary = {
    nodes, requests, deleted, created, lobbyHandOmissions: 0, afterService: null,
    async databaseFetch(raw, options = {}) {
      const url = new URL(raw);
      assert.equal(url.origin, DATABASE);
      const path = url.pathname.slice(1).replace(/\.json$/, '');
      assert.match(path, /^rooms\/OQ[A-F0-9]{10}\/players\/[a-f0-9]{32}$/,
        'the checker and service may touch only its seven exact synthetic nodes');
      const etag = '"' + (versions.get(path) || 0) + '"', method = options.method || 'GET';
      requests.push({ method, path });
      if (method === 'GET') {
        const value = nodes.get(path);
        if (value?.once?.phase === 'LOBBY' && !Object.hasOwn(value.once, 'hand')) boundary.lobbyHandOmissions++;
        return json(value || null, 200, { etag });
      }
      const headers = new Headers(options.headers);
      assert.ok(headers.get('If-Match'), 'creation, commands and cleanup must be conditional');
      if (headers.get('If-Match') !== etag) return json({ error: 'conflict' }, 412);
      if (method === 'PUT') {
        if (!nodes.has(path)) created.add(path);
        nodes.set(path, firebaseWire(JSON.parse(options.body), numericLists)); versions.set(path, (versions.get(path) || 0) + 1);
        return json(nodes.get(path));
      }
      assert.equal(method, 'DELETE');
      const value = nodes.get(path);
      assert.ok(value.qaOnce?.marker, 'cleanup must keep the provenance marker');
      deleted.push({ path, marker: value.qaOnce.marker });
      nodes.delete(path); versions.set(path, (versions.get(path) || 0) + 1);
      return json(null);
    },
    async fetchImpl(raw, options = {}) {
      const url = new URL(raw);
      if (url.origin === DATABASE) return boundary.databaseFetch(raw, options);
      assert.equal(url.href, SERVICE, 'no other external service is used');
      if (!options.method || options.method === 'GET') return json({ ready: true });
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      const value = body.operation === 'register' ? await service.register(body) : await service.execute(body);
      if (boundary.afterService) await boundary.afterService();
      return json(value);
    }
  };
  const service = createExecutor({ secret: '71'.repeat(32), databaseURL: DATABASE,
    fetchImpl: boundary.databaseFetch.bind(boundary), now: () => Date.now(), games: adapters });
  return boundary;
}

test('service checker settings default to Classic automatic and accept either world with 3–9 Story Cards', () => {
  const original = qaSettings({});
  assert.equal(original.world, 'classic'); assert.equal(original.handSize, null);
  assert.equal(original.resolvedHandSize, 5); assert.equal(original.pool, DECK.getWorld('classic'));
  for (const world of ['classic', 'modern-future']) for (let count = 3; count <= 9; count++) {
    const selected = qaSettings({ ONCE_QA_WORLD: world, ONCE_QA_HAND_SIZE: String(count) });
    assert.equal(selected.world, world); assert.equal(selected.handSize, count);
    assert.equal(selected.resolvedHandSize, count); assert.equal(selected.pool, DECK.getWorld(world));
  }
  assert.equal(qaSettings({ ONCE_QA_HAND_SIZE: 'auto' }).handSize, null);
});

test('malformed checker options are rejected before any network request or synthetic creation', async () => {
  let requests = 0;
  for (const world of ['other', 'mixed', 'unknown']) {
    await assert.rejects(run({ env: { ONCE_QA_WORLD: world }, fetchImpl: async () => { requests++; } }), /invalid_qa_world/);
  }
  for (const count of ['2', '10', '3.5', '-3', 'many', 'null']) {
    await assert.rejects(run({ env: { ONCE_QA_HAND_SIZE: count }, fetchImpl: async () => { requests++; } }), /invalid_qa_hand_size/);
  }
  assert.equal(requests, 0);
});

for (const [world, handSize] of [['classic', 'auto'], ['classic', '9'], ['modern-future', '3'], ['modern-future', '9']]) {
  test('local real-service boundary checks ' + world + '/' + handSize + ' configuration, private hands and exact cleanup', async () => {
    const boundary = isolatedBoundary();
    const report = await run({ env: { ONCE_QA_WORLD: world, ONCE_QA_HAND_SIZE: handSize },
      fetchImpl: boundary.fetchImpl.bind(boundary) });
    assert.equal(report.ok, true, 'failed stage: ' + report.stage);
    assert.equal(report.stage, 'passed'); assert.equal(report.world, world);
    assert.equal(report.resolvedHandSize, handSize === 'auto' ? 5 : Number(handSize));
    assert.equal(report.cleaned, 7); assert.equal(report.cleanupFailed, 0);
    assert.ok(boundary.lobbyHandOmissions > 0, 'actual RTDB omits empty lobby hand arrays');
    assert.equal(boundary.created.size, 7); assert.equal(boundary.nodes.size, 0);
    assert.equal(boundary.deleted.length, 7); assert.equal(new Set(boundary.deleted.map(item => item.path)).size, 7);
    assert.equal(new Set(boundary.deleted.map(item => item.marker)).size, 1);
    const text = JSON.stringify(report);
    assert.equal(/token|capsule|marker|sessionId|controlToken/.test(text), false,
      'the human-readable report must contain no capabilities or private identifiers');
  });
}

for (const world of ['classic', 'modern-future']) {
  test('numeric-key list projections and omitted empty lobby cards remain supported for ' + world, async () => {
    const boundary = isolatedBoundary({ numericLists: true });
    const report = await run({ env: { ONCE_QA_WORLD: world, ONCE_QA_HAND_SIZE: '9' },
      fetchImpl: boundary.fetchImpl.bind(boundary) });
    assert.equal(report.ok, true, 'failed stage: ' + report.stage);
    assert.equal(report.cleaned, 7); assert.equal(report.cleanupFailed, 0);
    assert.ok(boundary.lobbyHandOmissions > 0); assert.equal(boundary.nodes.size, 0);
  });
}

test('failed checker reports only a static label and still conditionally cleans its seven owned nodes', async () => {
  const boundary = isolatedBoundary();
  boundary.afterService = () => {
    for (const value of boundary.nodes.values()) if (value?.once?.phase === 'LOBBY') value.once.resolvedHandSize = 99;
  };
  const report = await run({ env: { ONCE_QA_WORLD: 'modern-future', ONCE_QA_HAND_SIZE: '3' },
    fetchImpl: boundary.fetchImpl.bind(boundary) });
  assert.equal(report.ok, false); assert.equal(report.failedCheck, 'lobby-resolved-hand-size');
  assert.equal(report.cleaned, 7); assert.equal(report.cleanupFailed, 0); assert.equal(boundary.nodes.size, 0);
  assert.equal(/token|capsule|marker|sessionId|controlToken/.test(JSON.stringify(report)), false);
});
