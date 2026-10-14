// Run the actual production-smoke script through a local in-memory HTTP router.
// Every URL is intercepted; no environment, credential or live data is used.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../scripts/talk-archive-production-smoke.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { createStore, DEFAULT_DB } = require('../runtime/talk-archive-store.cjs');
const { adapters } = require('../runtime/story-executor.cjs');
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const SERVICE_SECRET = '39'.repeat(32), ARCHIVE_SECRET = '64'.repeat(32);
const clone = value => value == null ? null : structuredClone(value);
const challenges = records => records.filter(record => !record.category || record.category === 'challenge');
const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
const response = (status, value, headers = {}) => ({ ok: status >= 200 && status < 300, status,
  headers: new Headers(headers), json: async () => clone(value) });

function firebaseValue(value, observed) {
  if (value == null) { observed.nulls++; return null; }
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, firebaseValue(item, observed)]).filter(([, item]) => item != null);
  if (!entries.length) { observed.empties++; return null; }
  const numeric = entries.every(([key]) => /^(0|[1-9]\d*)$/.test(key) && Number.isSafeInteger(Number(key)));
  const maximum = numeric ? Math.max(...entries.map(([key]) => Number(key))) : -1;
  if (numeric && entries.length > (maximum + 1) / 2) {
    if (!Array.isArray(value)) observed.numericMaps++;
    const array = []; for (const [key, item] of entries) array[Number(key)] = item; return array;
  }
  return Object.fromEntries(entries);
}
function harness({ uncertainCreate = false, foreignMarker = false, foreignArchive = false, firebaseNormalization = false } = {}) {
  const nodes = new Map(), versions = new Map(), created = new Set(), deleted = [], deleteAttempts = [], pathsRead = new Set();
  const registrations = [], executions = [], states = [], archiveSnapshots = [], archiveCiphertexts = [], requests = [], failures = [];
  const normalization = { nulls: 0, empties: 0, numericMaps: 0 };
  let clock = 1760000000000, changedPath = null, lostResponse = false;
  const set = (path, value) => {
    if (value == null) nodes.delete(path); else nodes.set(path, firebaseNormalization ? firebaseValue(clone(value), normalization) : clone(value));
    versions.set(path, (versions.get(path) || 0) + 1);
  };
  const storage = async (url, options = {}) => {
    const parsed = new URL(url); assert.equal(parsed.origin, DEFAULT_DB, 'storage never leaves this fake');
    assert.equal(parsed.search, '');
    const path = parsed.pathname.slice(1).replace(/\.json$/, '');
    assert.match(path, /^rooms\/(?:QHA[A-F0-9]{8}\/players\/[a-f0-9]{20,32}|talk-archive\/players\/[a-f0-9]{64})$/, 'only exact fresh fixture and opaque archive paths');
    const method = options.method || 'GET'; requests.push({ path, method });
    const tag = () => '"' + (versions.get(path) || 0) + '"';
    if (method === 'GET') {
      pathsRead.add(path); return response(200, nodes.get(path), { etag: tag() });
    }
    assert.equal(method, 'PUT');
    const headers = new Headers(options.headers); assert.ok(headers.get('If-Match'), 'every mutation and cleanup is conditional');
    const value = JSON.parse(options.body);
    if (value == null) deleteAttempts.push(path);
    if (headers.get('If-Match') !== tag()) return response(412, null);
    if (value != null && !nodes.has(path)) created.add(path);
    set(path, value);
    if (value != null && path.startsWith('rooms/talk-archive/')) archiveCiphertexts.push(JSON.stringify(value));
    if (value == null) deleted.push(path);
    if (uncertainCreate && !lostResponse && value?.qaArchive?.marker && value.talk && !value.hubExecutor) {
      lostResponse = true; changedPath = path;
      throw new Error('synthetic initial create committed but its response was lost');
    }
    return response(200, value);
  };
  const service = createExecutor({ secret: SERVICE_SECRET, archiveSecret: ARCHIVE_SECRET,
    fetchImpl: storage, now: () => clock, games: adapters });
  const store = createStore({ secret: ARCHIVE_SECRET, fetchImpl: storage });
  const fetchImpl = async (url, options = {}) => {
    if (new URL(url).origin === DEFAULT_DB) return storage(url, options);
    assert.equal(url, SERVICE, 'no network fallback or unrelated endpoint exists');
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.ok(['register', 'execute', 'release'].includes(body.operation));
    if (body.operation === 'register') registrations.push(clone(body)); else executions.push(clone(body));
    try {
      const value = await service[body.operation](body);
      const registration = registrations[0];
      if (registration) {
        const canonical = nodes.get('rooms/' + registration.code + '/players/' + registration.controlToken);
        if (canonical?.state) states.push(clone(canonical.state));
        if (foreignArchive && body.command?.type === 'crazyDrain' && !changedPath) {
          await store.writeRoom(registration.code, [{ id: 'foreign-owned-vault-record', version: 1, category: 'vault',
            ownerIdentity: 'f2'.repeat(32), cardId: 'foreign-library-card', text: 'FOREIGN LIBRARY MUST REMAIN',
            kind: 'task', status: 'saved', createdAt: clock, updatedAt: clock }]);
          changedPath = [...nodes.keys()].find(path => path.startsWith('rooms/talk-archive/'));
        }
        archiveSnapshots.push(await store.readRoom(registration.code));
      }
      if (foreignMarker && body.operation === 'register' && !changedPath) {
        changedPath = 'rooms/' + body.code + '/players/' + body.seats[0].token;
        set(changedPath, { ...nodes.get(changedPath), qaArchive: { marker: 'foreign-owned-marker' } });
      }
      return response(200, value);
    } catch (error) {
      failures.push({ operation: body.operation, type: body.command?.type || null, name: error.name, code: error.code || null,
        locations: String(error.stack || '').split('\n').slice(1, 4).map(line => line.trim()) });
      return response(error.status || 503, { error: error.code || 'synthetic_unavailable' });
    }
  };
  return { fetchImpl, now: () => clock, delay: async () => {
    assert.fail('immediate handwritten delivery needs no scheduler wait');
  }, env: { CRAZY_TALK_ARCHIVE_SECRET: ARCHIVE_SECRET }, nodes, created, deleted, deleteAttempts, pathsRead,
  registrations, executions, states, archiveSnapshots, archiveCiphertexts, requests, failures, normalization,
  changedPath: () => changedPath, lostResponse: () => lostResponse };
}

test('archive production smoke completes lifecycle, scoped reader and conditional cleanup of exactly four owned nodes', async () => {
  const f = harness(), report = await run(f);
  assert.equal(report.ok, true, JSON.stringify({ report, failures: f.failures })); assert.equal(report.step, 'complete');
  assert.ok(report.checks > 50); assert.equal(report.cleaned, 4); assert.equal(report.cleanupFailed, 0);
  assert.equal(f.created.size, 4); assert.equal(f.nodes.size, 0);
  assert.equal(f.deleted.length, 4); assert.deepEqual(new Set(f.deleted), f.created); assert.deepEqual(f.pathsRead, f.created);
  assert.equal(f.registrations.length, 1); assert.equal(f.registrations[0].game, 'letstalk');
  const control = f.registrations[0].controlToken;
  const hostActions = f.executions.filter(request => request.token === control);
  assert.deepEqual(hostActions.map(request => request.command.type), ['crazyDrain', 'newTopic']);
  assert.ok(f.executions.filter(request => !hostActions.includes(request)).every(request =>
    f.registrations[0].seats.some(seat => seat.token === request.token)), 'every other action uses an original private player token');
  assert.ok(f.states.some(state => list(state.crazy.queue).length === 1 && list(state.crazy.prompts).length === 0));
  assert.ok(f.states.some(state => list(state.crazy.prompts).some(prompt => prompt.source === 'player' && prompt.status === 'pending')));
  assert.ok(f.states.some(state => list(state.crazy.prompts).some(prompt => prompt.renderedVersion === 1 && prompt.renderAckAt === f.now())));
  assert.ok(f.states.some(state => state.scores[2] === 1));
  assert.ok(f.states.some(state => state.phase === 'ended'));
  assert.ok(f.states.some(state => list(state.crazy.queue).length === 1 && state.crazy.receivers[2].cooldownUntil === f.now() + 30000
    && list(state.crazy.prompts).every(prompt => prompt.status !== 'pending')));
  assert.ok(f.states.some(state => state.crazy.roundStage === 'sorting' && state.phase === 'ended'));
  for (const status of ['queued', 'pending', 'done']) assert.ok(f.archiveSnapshots.map(challenges).some(records => records.length === 1 && records[0].status === status));
  assert.ok(f.archiveSnapshots.map(challenges).some(records => records.length === 2 && records.some(record => record.status === 'done') && records.some(record => record.status === 'cancelled')));
  assert.ok(f.archiveSnapshots.some(records => records.some(record => record.category === 'event')));
  assert.ok(f.archiveSnapshots.some(records => records.some(record => record.category === 'vault' && record.status === 'saved')));
  assert.ok(f.archiveCiphertexts.length > 0);
  for (const encoded of f.archiveCiphertexts) {
    assert.ok(!encoded.includes('Cluck like a tiny chicken.')); assert.ok(!encoded.includes('Say meow in a sad voice.'));
    assert.ok(!encoded.includes('Archive QA 1')); assert.ok(!encoded.includes(ARCHIVE_SECRET));
  }
  const serialized = JSON.stringify(report);
  for (const marker of [SERVICE_SECRET, ARCHIVE_SECRET, control, f.registrations[0].code, 'cipher', 'Cluck like', 'Archive QA']) assert.ok(!serialized.includes(marker));
});

test('a committed initial PUT with a lost response is still ownership-checked and conditionally cleaned', async () => {
  const f = harness({ uncertainCreate: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.error, 'smoke_failed'); assert.equal(report.step, 'fresh-fixture');
  assert.equal(f.lostResponse(), true); assert.equal(f.created.size, 2, 'control and first player were committed before the response failed');
  assert.equal(report.cleaned, 2); assert.equal(report.cleanupFailed, 0); assert.equal(f.nodes.size, 0);
  assert.deepEqual(new Set(f.deleted), f.created); assert.ok(f.deleted.includes(f.changedPath()));
  assert.equal(f.registrations.length, 0, 'the smoke stops gameplay after an uncertain initial create');
});

test('a changed ownership marker prevents deletion and reports cleanup failure without harming the foreign node', async () => {
  const f = harness({ foreignMarker: true }), report = await run(f);
  assert.equal(report.ok, false); assert.equal(report.cleanupFailed, 1); assert.equal(report.cleaned, 3);
  assert.equal(f.nodes.size, 1); assert.equal(f.nodes.get(f.changedPath()).qaArchive.marker, 'foreign-owned-marker');
  assert.ok(!f.deleteAttempts.includes(f.changedPath()), 'foreign ownership must be rejected before even attempting a conditional deletion');
  assert.ok(!f.deleted.includes(f.changedPath()));
});

test('a foreign encrypted vault record prevents archive deletion while other owned fixture nodes are cleaned', async () => {
  const f = harness({ foreignArchive: true }), report = await run(f);
  assert.equal(report.step, 'complete', JSON.stringify({ report, failures: f.failures }));
  assert.equal(report.ok, false); assert.equal(report.cleanupFailed, 1); assert.equal(report.cleaned, 3);
  assert.equal(f.created.size, 4); assert.equal(f.nodes.size, 1);
  assert.match(f.changedPath(), /^rooms\/talk-archive\/players\/[a-f0-9]{64}$/);
  assert.ok(!f.deleteAttempts.includes(f.changedPath()), 'foreign archive ownership is checked before conditional deletion');
  assert.ok(!f.deleted.includes(f.changedPath()));
  const store = createStore({ secret: ARCHIVE_SECRET, fetchImpl: f.fetchImpl });
  const remaining = await store.readRoom(f.registrations[0].code);
  assert.ok(remaining.some(record => record.category === 'vault' && record.text === 'FOREIGN LIBRARY MUST REMAIN'));
  assert.equal(challenges(remaining).length, 2, 'refusing to delete a shared encrypted node preserves all of its contents');
});

test('a missing or malformed archive key fails before creating a store or making any HTTP request', async () => {
  for (const env of [{}, { CRAZY_TALK_ARCHIVE_SECRET: '' }, { CRAZY_TALK_ARCHIVE_SECRET: 'invalid' }, { CRAZY_TALK_ARCHIVE_SECRET: '64'.repeat(31) }]) {
    let calls = 0;
    const report = await run({ env, fetchImpl: async () => { calls++; throw new Error('no network allowed'); }, now: () => 1000 });
    assert.equal(report.ok, false); assert.equal(report.error, 'archive_key_unavailable');
    assert.equal(report.cleaned, 0); assert.equal(report.cleanupFailed, 0); assert.equal(calls, 0);
  }
});

test('complete smoke survives Firebase null/empty omission and dense numeric maps becoming arrays', async () => {
  const f = harness({ firebaseNormalization: true }), report = await run(f);
  assert.equal(report.ok, true, JSON.stringify({ report, failures: f.failures })); assert.equal(report.step, 'complete');
  assert.equal(report.cleaned, 4); assert.equal(report.cleanupFailed, 0); assert.equal(f.nodes.size, 0);
  assert.equal(f.created.size, 4); assert.deepEqual(new Set(f.deleted), f.created);
  assert.ok(f.normalization.nulls > 0, 'the wire omitted actual null fields');
  assert.ok(f.normalization.empties > 0, 'the wire omitted actual empty containers');
  assert.ok(f.normalization.numericMaps > 0, 'the wire converted actual numeric object maps to arrays');
  assert.ok(f.states.some(state => Array.isArray(state.scores)), 'the real engine received array-shaped score maps');
  assert.ok(f.archiveSnapshots.map(challenges).some(records => records.length === 2 && records.some(record => record.status === 'done') && records.some(record => record.status === 'cancelled')));
});
