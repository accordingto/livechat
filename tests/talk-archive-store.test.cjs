// Private challenge archives use synthetic REST/ETag storage only.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createStore, DEFAULT_DB } = require('../runtime/talk-archive-store.cjs');
const SECRET = '73'.repeat(32);
const ROOM = 'ARCHIVE1';
const copy = value => value == null ? null : structuredClone(value);

class MemoryFirebase {
  constructor() {
    this.nodes = new Map(); this.versions = new Map(); this.requests = [];
    this.writes = []; this.conflicts = 0; this.forceConflicts = 0;
    this.dropEtags = false; this.failMethod = ''; this.fetchFailure = null;
  }
  get(path) { return copy(this.nodes.get(path)); }
  set(path, value) {
    this.nodes.set(path, copy(value));
    this.versions.set(path, (this.versions.get(path) || 0) + 1);
  }
  async fetch(url, options = {}) {
    const parsed = new URL(url), path = parsed.pathname.slice(1).replace(/\.json$/, '');
    const method = options.method || 'GET';
    this.requests.push({ url, path, method, options });
    assert.equal(parsed.origin, 'http://localhost', 'all tests stay inside the synthetic transport');
    assert.equal(parsed.search, '', 'credentials never appear in a query string');
    if (this.fetchFailure) throw this.fetchFailure;
    if (this.failMethod === method) return {
      ok: false, status: 503, headers: new Headers(),
      json: async () => ({ error: 'upstream room secret and private challenge text' })
    };
    const etag = '"' + (this.versions.get(path) || 0) + '"';
    if (method === 'GET') {
      const snapshot = this.get(path);
      return { ok: true, status: 200, headers: new Headers(this.dropEtags ? {} : { etag }), json: async () => copy(snapshot) };
    }
    assert.equal(method, 'PUT');
    const headers = new Headers(options.headers);
    assert.ok(headers.get('If-Match'), 'every archive write has a compare-and-swap fence');
    if (this.forceConflicts > 0) {
      this.forceConflicts--; this.set(path, this.get(path)); this.conflicts++;
      return { ok: false, status: 412, headers: new Headers(), json: async () => null };
    }
    if (headers.get('If-Match') !== etag) {
      this.conflicts++;
      return { ok: false, status: 412, headers: new Headers(), json: async () => null };
    }
    const value = JSON.parse(options.body);
    this.set(path, value); this.writes.push({ path, value: copy(value) });
    return { ok: true, status: 200, headers: new Headers(), json: async () => copy(value) };
  }
}
function fixture(secret = SECRET) {
  const db = new MemoryFirebase();
  const store = createStore({ secret, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db) });
  return { db, store };
}
function entry(overrides = {}) {
  return {
    id: 'synthetic-session:1:submission-1', version: 1,
    text: 'Pretend our table is a tiny spaceship.', kind: 'task', status: 'queued',
    author: { playerNum: 1, name: 'Synthetic writer' }, target: { playerNum: 2, name: 'Synthetic recipient' }, recipient: null,
    topic: { title: 'Our cafe', question: 'Plan our unusual cafe' },
    sessionId: 'synthetic-session', createdAt: 1000, updatedAt: 1000,
    ...overrides
  };
}
function genericError(error) {
  assert.match(error.code || '', /^[a-z][a-z0-9_]*$/);
  assert.equal(error.message, error.code, 'errors contain a generic code only');
  assert.doesNotMatch(JSON.stringify({ code: error.code, message: error.message }), /rooms\/|spaceship|ARCHIVE1|73{8}|upstream room secret/);
  return true;
}
function pathOf(db) {
  const paths = [...new Set(db.requests.map(request => request.path))];
  assert.equal(paths.length, 1, 'one explicit room never causes enumeration or another room read');
  assert.match(paths[0], /^rooms\/talk-archive\/players\/[a-f0-9]{64}$/);
  return paths[0];
}

test('archive round-trip stores only encrypted records at one opaque room path', async () => {
  const { db, store } = fixture(); const record = entry();
  await store.writeRoom(ROOM, [record]);
  const path = pathOf(db), encoded = JSON.stringify(db.get(path));
  for (const marker of [ROOM, SECRET, record.text, record.topic.title, record.topic.question, record.author.name, record.target.name, record.sessionId, record.id]) {
    assert.ok(!encoded.includes(marker), 'private field is encrypted: ' + marker);
    assert.ok(!path.includes(marker), 'private field is absent from storage path');
  }
  assert.deepEqual(await store.readRoom(ROOM), [record]);
});

test('record envelopes use fresh randomness while same versions are idempotent', async () => {
  const a = fixture(), b = fixture(), record = entry();
  await a.store.writeRoom(ROOM, [record]); await b.store.writeRoom(ROOM, [record]);
  assert.notDeepEqual(a.db.get(pathOf(a.db)), b.db.get(pathOf(b.db)), 'same plaintext must not reuse an IV');
  const before = a.db.writes.length, encoded = a.db.get(pathOf(a.db));
  await a.store.writeRoom(ROOM, [record, record]);
  await assert.rejects(a.store.writeRoom(ROOM, [{ ...record, text: 'Altered replay of the same version.' }]), { code: 'archive_conflict' });
  assert.equal(a.db.writes.length, before, 'same-version replays do not reseal or overwrite');
  assert.deepEqual(a.db.get(pathOf(a.db)), encoded);
  assert.deepEqual(await a.store.readRoom(ROOM), [record]);
});

test('exact room reads are isolated and perform one GET without listing', async () => {
  const { db, store } = fixture();
  await store.writeRoom(ROOM, [entry()]);
  await store.writeRoom('ARCHIVE2', [entry({ id: 'second-record', text: 'Speak as a confused toaster.' })]);
  const paths = [...db.nodes.keys()]; assert.equal(paths.length, 2); assert.notEqual(paths[0], paths[1]);
  let before = db.requests.length;
  assert.deepEqual(await store.readRoom(ROOM), [entry()]);
  assert.equal(db.requests.length - before, 1); assert.equal(db.requests.at(-1).method, 'GET');
  assert.equal(db.requests.at(-1).path, paths[0]);
  before = db.requests.length;
  assert.deepEqual(await store.readRoom('MISSING1'), []);
  assert.equal(db.requests.length - before, 1); assert.equal(db.requests.at(-1).method, 'GET');
});

test('higher versions win and old or duplicated versions cannot reopen a completed challenge', async () => {
  const { db, store } = fixture(); const queued = entry();
  const pending = entry({ version: 2, status: 'pending', recipient: { playerNum: 2, name: 'Synthetic recipient' }, assignedAt: 5000, updatedAt: 5000 });
  const done = entry({ version: 3, status: 'done', recipient: { playerNum: 2, name: 'Synthetic recipient' }, assignedAt: 5000, closedAt: 9000, updatedAt: 9000 });
  await store.writeRoom(ROOM, [queued]); await store.writeRoom(ROOM, [done]);
  const writes = db.writes.length;
  await store.writeRoom(ROOM, [pending, queued, done]);
  assert.equal(db.writes.length, writes); assert.deepEqual(await store.readRoom(ROOM), [done]);
});

test('concurrent submissions and resolutions retry ETags without losing records or terminal versions', async () => {
  const { db, store } = fixture(); const queued = entry();
  const done = entry({ version: 3, status: 'done', recipient: { playerNum: 2, name: 'Synthetic recipient' }, closedAt: 9000, updatedAt: 9000 });
  const other = entry({ id: 'other-submission', author: { playerNum: 2 }, target: { playerNum: 1 }, text: 'Narrate the next sip like a sports final.' });
  await store.writeRoom(ROOM, [queued]);
  await Promise.all([
    store.writeRoom(ROOM, [done]),
    store.writeRoom(ROOM, [entry({ version: 2, status: 'pending', recipient: { playerNum: 2, name: 'Synthetic recipient' }, updatedAt: 5000 })]),
    store.writeRoom(ROOM, [other])
  ]);
  assert.ok(db.conflicts > 0, 'the fake actually exercised simultaneous ETag conflicts');
  const records = await store.readRoom(ROOM);
  assert.equal(records.length, 2);
  assert.deepEqual(records.find(record => record.id === queued.id), done);
  assert.deepEqual(records.find(record => record.id === other.id), other);
});

test('ETag retries are bounded to eight attempts and do not bypass conditional writes', async () => {
  const { db, store } = fixture(); db.forceConflicts = 2;
  await store.writeRoom(ROOM, [entry()]); assert.equal(db.conflicts, 2);
  assert.equal(db.requests.filter(request => request.method === 'PUT').length, 3);
  const blocked = fixture(); blocked.db.forceConflicts = 100;
  await assert.rejects(blocked.store.writeRoom(ROOM, [entry()]), genericError);
  assert.equal(blocked.db.requests.filter(request => request.method === 'PUT').length, 8);
  assert.equal(blocked.db.writes.length, 0);
});

test('missing ETags fail closed and empty batches never write', async () => {
  const { db, store } = fixture();
  await store.writeRoom(ROOM, []); assert.equal(db.writes.length, 0);
  db.dropEtags = true;
  await assert.rejects(store.writeRoom(ROOM, [entry()]), genericError);
  assert.equal(db.requests.filter(request => request.method === 'PUT').length, 0);
});

test('invalid configuration, room codes and records fail before fetching', async () => {
  for (const secret of [undefined, '', 'x'.repeat(64), '73'.repeat(31), 42]) {
    const db = new MemoryFirebase();
    assert.throws(() => createStore({ secret, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db) }), genericError);
    assert.equal(db.requests.length, 0);
  }
  const db = new MemoryFirebase();
  assert.throws(() => createStore({ secret: SECRET, databaseURL: 'https://unapproved.invalid', fetchImpl: db.fetch.bind(db) }), genericError);
  assert.equal(db.requests.length, 0);
  for (const room of [null, 1234, {}, [], '', '../ROOM', 'AB', 'A'.repeat(13), 'TALK/TEST', 'ROOM?auth=private']) {
    const f = fixture();
    await assert.rejects(async () => f.store.writeRoom(room, [entry()]), genericError);
    await assert.rejects(async () => f.store.readRoom(room), genericError);
    assert.equal(f.db.requests.length, 0);
  }
  for (const overrides of [{ id: '' }, { version: 0 }, { version: 1.5 }, { text: '' }, { text: 'a'.repeat(121) },
    { kind: 'role' }, { status: 'secret' }, { author: 0 }, { createdAt: -1 }]) {
    const f = fixture();
    await assert.rejects(async () => f.store.writeRoom(ROOM, [entry(overrides)]), genericError);
    assert.equal(f.db.requests.length, 0);
  }
});

test('all transport requests omit credentials, reject redirects and carry abort deadlines', async () => {
  assert.match(DEFAULT_DB, /^https:\/\//);
  const { db, store } = fixture();
  await store.writeRoom(ROOM, [entry()]); await store.readRoom(ROOM);
  for (const request of db.requests) {
    assert.equal(request.options.credentials, 'omit');
    assert.equal(request.options.redirect, 'error');
    assert.ok(request.options.signal instanceof AbortSignal);
    assert.equal(request.options.signal.aborted, false);
    assert.equal(new Headers(request.options.headers).get('Authorization'), null);
  }
});

test('upstream bodies and fetch exceptions never expose room paths or challenge text', async () => {
  for (const method of ['GET', 'PUT']) {
    const f = fixture(); f.db.failMethod = method;
    await assert.rejects(f.store.writeRoom(ROOM, [entry()]), genericError);
  }
  const f = fixture(); f.db.fetchFailure = new Error('upstream room secret rooms/ARCHIVE1/players/private and spaceship');
  await assert.rejects(f.store.readRoom(ROOM), genericError);
});

test('only the record allowlist survives encryption, including nested identity/topic fields', async () => {
  const { db, store } = fixture(); const record = entry();
  const privateToken = 'private-token-never-retained';
  await store.writeRoom(ROOM, [{ ...record, controlToken: privateToken, playerToken: privateToken,
    hubExecutor: { capsule: privateToken }, source: 'player', state: { secret: privateToken },
    author: { ...record.author, token: privateToken, email: 'private@example.invalid' },
    target: { ...record.target, path: 'rooms/other/players/' + privateToken },
    topic: { ...record.topic, keywords: [privateToken], otherPlayers: ['private-name'] }
  }]);
  const result = await store.readRoom(ROOM);
  assert.deepEqual(result, [record]);
  assert.ok(!JSON.stringify(db.get(pathOf(db))).includes(privateToken));
  assert.ok(!JSON.stringify(result).includes(privateToken));
  const keys = Object.keys(db.get(pathOf(db)).entries);
  assert.deepEqual(keys, [crypto.createHash('sha256').update(record.id).digest('hex')]);
});

test('all valid lifecycle statuses and line/task kinds round-trip without changing mission text', async () => {
  const { store } = fixture();
  const records = ['queued', 'pending', 'done', 'skipped', 'expired', 'cancelled'].map((status, index) =>
    entry({ id: 'status-' + status, status, kind: index % 2 ? 'line' : 'task', legacy: true }));
  await store.writeRoom(ROOM, records);
  const found = await store.readRoom(ROOM);
  assert.equal(found.length, records.length);
  for (const record of records) assert.deepEqual(found.find(item => item.id === record.id), record);
});

test('malformed envelopes, changed versions and modified ciphertext fail closed on exact reads', async () => {
  const mutations = [
    document => { document.version = 2; },
    document => { document.entries = []; },
    document => { Object.values(document.entries)[0].version++; },
    document => {
      const [id, envelope] = Object.entries(document.entries)[0]; delete document.entries[id];
      document.entries['f'.repeat(64)] = envelope;
    },
    document => {
      const envelope = Object.values(document.entries)[0], bytes = Buffer.from(envelope.cipher, 'base64url');
      bytes[bytes.length - 1] ^= 1; envelope.cipher = bytes.toString('base64url');
    },
    document => { Object.values(document.entries)[0].cipher = 'not valid encrypted content'; },
    document => { document.entries[Object.keys(document.entries)[0]] = entry(); }
  ];
  for (const mutate of mutations) {
    const { db, store } = fixture(); await store.writeRoom(ROOM, [entry()]);
    const path = pathOf(db), document = db.get(path); mutate(document); db.set(path, document);
    const writes = db.writes.length;
    await assert.rejects(store.readRoom(ROOM), { code: 'archive_corrupt' });
    assert.equal(db.writes.length, writes); assert.deepEqual(db.get(path), document);
  }
});

test('record and room AAD prevent transplanting authentic ciphertext to another identity or room', async () => {
  const { db, store } = fixture(); const original = entry(), other = entry({ id: 'other-record', text: 'Speak as a very polite pirate.' });
  await store.writeRoom(ROOM, [original, other]);
  const firstPath = pathOf(db), first = db.get(firstPath);
  const originalKey = crypto.createHash('sha256').update(original.id).digest('hex');
  const otherKey = crypto.createHash('sha256').update(other.id).digest('hex');
  const swapped = copy(first); swapped.entries[otherKey].cipher = swapped.entries[originalKey].cipher;
  db.set(firstPath, swapped);
  await assert.rejects(store.readRoom(ROOM), { code: 'archive_corrupt' });
  db.set(firstPath, first);
  await store.writeRoom('ARCHIVE2', [original]);
  const secondPath = [...db.nodes.keys()].find(path => path !== firstPath);
  db.set(secondPath, first);
  await assert.rejects(store.readRoom('ARCHIVE2'), { code: 'archive_corrupt' });
  assert.deepEqual(await store.readRoom(ROOM), [original, other]);
});

test('a corrupt existing record cannot be replaced by a new plaintext version', async () => {
  const { db, store } = fixture(); await store.writeRoom(ROOM, [entry()]);
  const path = pathOf(db), corrupt = db.get(path), envelope = Object.values(corrupt.entries)[0];
  const bytes = Buffer.from(envelope.cipher, 'base64url'); bytes[12] ^= 1;
  envelope.cipher = bytes.toString('base64url'); db.set(path, corrupt);
  const writes = db.writes.length;
  await assert.rejects(store.writeRoom(ROOM, [entry({ version: 2, status: 'done' })]), { code: 'archive_corrupt' });
  assert.equal(db.writes.length, writes); assert.deepEqual(db.get(path), corrupt);
});

test('separate archive keys produce isolated capabilities for the same explicit room code', async () => {
  const { db, store } = fixture();
  const second = createStore({ secret: '74'.repeat(32), databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db) });
  await store.writeRoom(ROOM, [entry()]);
  await second.writeRoom(ROOM, [entry({ id: 'other-key-record', text: 'Describe the floor as a dramatic weather report.' })]);
  assert.equal(db.nodes.size, 2);
  assert.deepEqual(await store.readRoom(ROOM), [entry()]);
  assert.deepEqual(await second.readRoom(ROOM), [entry({ id: 'other-key-record', text: 'Describe the floor as a dramatic weather report.' })]);
});

test('long retained session identities round-trip within the accepted record bounds', async () => {
  const { store } = fixture();
  const record = entry({ id: 'r'.repeat(65536), sessionId: 's'.repeat(32768) });
  await store.writeRoom(ROOM, [record]);
  assert.deepEqual(await store.readRoom(ROOM), [record], 'a record accepted for writing must remain readable');
});

test('one invalid entry rejects the complete batch before reading or writing storage', async () => {
  const { db, store } = fixture();
  await assert.rejects(store.writeRoom(ROOM, [entry(), entry({ id: 'invalid-tail', version: 0 })]), { code: 'archive_invalid_record' });
  assert.equal(db.requests.length, 0); assert.equal(db.writes.length, 0);
});

test('Unicode records beyond the encrypted size budget reject before fetching', async () => {
  const { db, store } = fixture();
  await assert.rejects(store.writeRoom(ROOM, [entry({ id: '漢'.repeat(65536) })]), { code: 'archive_invalid_record' });
  assert.equal(db.requests.length, 0); assert.equal(db.writes.length, 0);
});
