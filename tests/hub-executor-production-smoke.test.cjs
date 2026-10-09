// Exercise the opt-in production script with real engines/executor and a fake
// HTTP boundary. These tests cannot contact Firebase or the deployed service.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { run } = require('../scripts/hub-executor-production-smoke.cjs');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const clone = value => value == null ? null : structuredClone(value);
function firebaseValue(value) {
  if (value == null || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, child]) => [key, firebaseValue(child)]).filter(([, child]) => child != null);
  if (!entries.length) return null;
  if (Array.isArray(value)) { const result = []; for (const [key, child] of entries) result[Number(key)] = child; return result; }
  return Object.fromEntries(entries);
}
function harness({ stopAtTalk = false, foreignMarker = false, deleteConflict = false, openingCollision = false } = {}) {
  const nodes = new Map(), versions = new Map(), pathsRead = new Set(), created = new Set(), deleted = [], deleteAttempts = [], registrations = [], executions = [], states = [];
  let clock = 1750000000000, alteredPath = null;
  const initialClock = clock;
  const response = (status, value, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => clone(value) });
  const set = (path, value) => { nodes.set(path, firebaseValue(clone(value))); versions.set(path, (versions.get(path) || 0) + 1); };
  const storage = async (url, options = {}) => {
    assert.equal(new URL(url).origin, DATABASE, 'all storage stays behind this mock');
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    assert.match(path, /^rooms\/HX[A-F0-9]{8}\/players\/[a-f0-9]{20,32}$/, 'no parent room, listing or unrelated path');
    const method = options.method || 'GET';
    if (openingCollision && !nodes.size && method === 'GET') { alteredPath = path; set(path, { game: 'another-game', foreign: true }); }
    const etag = '"' + (versions.get(path) || 0) + '"';
    if (method === 'GET') { pathsRead.add(path); return response(200, nodes.get(path), { etag }); }
    assert.ok(options.headers?.['If-Match'], 'every mutation including cleanup is conditional');
    if (method === 'DELETE') {
      deleteAttempts.push(path);
      if (deleteConflict && !alteredPath) { alteredPath = path; set(path, { ...nodes.get(path), concurrentChange: true }); return response(412, null); }
    }
    if (options.headers['If-Match'] !== etag) return response(412, null);
    if (method === 'PUT') {
      if (!nodes.has(path)) created.add(path);
      set(path, JSON.parse(options.body)); return response(200, nodes.get(path));
    }
    assert.equal(method, 'DELETE');
    nodes.delete(path); versions.set(path, (versions.get(path) || 0) + 1); deleted.push(path); return response(200, null);
  };
  const service = createExecutor({ secret: '12'.repeat(32), fetchImpl: storage, now: () => clock });
  const fetchImpl = async (url, options = {}) => {
    // Distinct HTTP requests receive distinct timestamps, including enqueue
    // then skip. This also exercises fresh-queue/same-timestamp protections.
    clock += 2;
    if (new URL(url).origin === DATABASE) return storage(url, options);
    assert.equal(url, SERVICE, 'no outgoing network fallback exists');
    assert.equal(options.credentials, 'omit');
    if (!options.method || options.method === 'GET') return response(200, { ready: true }, { date: new Date(clock).toUTCString() });
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    if (body.operation === 'register') {
      registrations.push(clone(body));
      if (body.game === 'letstalk' && (stopAtTalk || foreignMarker)) {
        if (foreignMarker) {
          alteredPath = 'rooms/' + body.code + '/players/' + body.seats[0].token;
          set(alteredPath, { ...nodes.get(alteredPath), qaSmoke: { marker: 'foreign', game: body.game } });
        }
        return response(503, { error: 'synthetic_upstream_failure' });
      }
    } else {
      assert.equal(body.operation, 'execute'); executions.push(clone(body));
    }
    try {
      const data = await service[body.operation](body);
      for (const registration of registrations) {
        const canonical = nodes.get('rooms/' + registration.code + '/players/' + registration.controlToken);
        if (canonical?.stateJson) states.push({ game: registration.game, state: JSON.parse(canonical.stateJson), time: clock });
      }
      return response(200, data);
    } catch (error) { return response(error.status || 400, { error: error.code || 'synthetic_failure' }); }
  };
  return { fetchImpl, delay: async milliseconds => { assert.ok(milliseconds <= 6000); clock += milliseconds; }, now: () => clock,
    nodes, pathsRead, created, deleted, deleteAttempts, registrations, executions, states, alteredPath: () => alteredPath, elapsed: () => clock - initialClock };
}

test('production smoke verifies global Talk scheduling, TTL, scores and clocks then deletes exactly eight owned nodes', async () => {
  const f = harness(), report = await run(f);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.step, 'finish-cancels-pending');
  assert.equal(report.cleaned, 8); assert.equal(report.cleanupFailed, 0);
  assert.equal(f.created.size, 8); assert.equal(f.nodes.size, 0);
  assert.deepEqual(new Set(f.deleted), f.created); assert.equal(f.deleted.length, 8);
  assert.deepEqual(f.pathsRead, f.created);
  assert.equal(f.registrations.length, 2);
  const controlTokens = f.registrations.map(registration => registration.controlToken);
  assert.ok(f.executions.every(body => !controlTokens.includes(body.token)), 'after registration only ordinary player credentials are sent');
  const talk = f.states.filter(item => item.game === 'letstalk').map(item => item.state);
  assert.ok(talk.some(state => state.gameMode === 'normal' && state.phase === 'ended'));
  assert.ok(talk.some(state => state.gameMode === 'crazy' && state.phase === 'ended' && state.scores[3] === 1));
  assert.ok(talk.some(state => Object.values(state.crazy?.prompts || {}).some(prompt => prompt.status === 'expired')));
  assert.ok(talk.every(state => Object.values(state.crazy?.prompts || {}).filter(prompt => prompt.status === 'pending').length <= 2));
  assert.ok(talk.every(state => !state.availablePlayerNums || state.availablePlayerNums.length === 3), 'rotating pulses preserve the synthetic roster');
  assert.ok(f.elapsed() < 180000, 'planned wait budget stays below three minutes');
  assert.deepEqual(Object.keys(report).sort(), ['cleaned','cleanupFailed','ok','passed','phase','step']);
});

test('a service failure cleans the exact eight created nodes without continuing Talk commands', async () => {
  const f = harness({ stopAtTalk: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.cleaned, 8); assert.equal(report.cleanupFailed, 0);
  assert.equal(f.created.size, 8); assert.equal(f.nodes.size, 0); assert.deepEqual(new Set(f.deleted), f.created);
});

test('cleanup rejects a changed ownership marker and leaves that node untouched', async () => {
  const f = harness({ foreignMarker: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.cleaned, 7); assert.equal(report.cleanupFailed, 1);
  assert.equal(f.nodes.size, 1); assert.equal(f.nodes.get(f.alteredPath()).qaSmoke.marker, 'foreign');
  assert.ok(!f.deleteAttempts.includes(f.alteredPath()), 'ownership must be checked before DELETE');
});

test('cleanup does not retry a conflicting DELETE against a newer node version', async () => {
  const f = harness({ stopAtTalk: true, deleteConflict: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.cleaned, 7); assert.equal(report.cleanupFailed, 1);
  assert.equal(f.nodes.size, 1); assert.equal(f.nodes.get(f.alteredPath()).concurrentChange, true);
  assert.equal(f.deleteAttempts.filter(path => path === f.alteredPath()).length, 1);
});

test('an opening collision prevents all writes and leaves the preexisting node intact', async () => {
  const f = harness({ openingCollision: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.cleaned, 0); assert.equal(report.cleanupFailed, 0);
  assert.equal(f.created.size, 0); assert.equal(f.deleteAttempts.length, 0); assert.equal(f.nodes.size, 1);
  assert.equal(f.nodes.get(f.alteredPath()).foreign, true);
});
