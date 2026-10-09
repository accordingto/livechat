// Real Talk engine/adapter/store, isolated Firebase REST/ETag transport.
// These tests never use production credentials, environment variables or live rooms.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const { adapters } = require('../runtime/story-executor.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { createStore } = require('../runtime/talk-archive-store.cjs');
const SERVICE_SECRET = '51'.repeat(32), ARCHIVE_SECRET = '82'.repeat(32);
const ARCHIVE_PREFIX = 'rooms/talk-archive/players/';
const clone = value => value == null ? null : structuredClone(value);

class MemoryFirebase {
  constructor() {
    this.nodes = new Map(); this.versions = new Map(); this.writes = []; this.requests = [];
    this.failArchivePut = false; this.beforePut = null; this.afterPut = null; this.conflicts = 0;
  }
  get(path) { return clone(this.nodes.get(path)); }
  set(path, value) { this.nodes.set(path, clone(value)); this.versions.set(path, (this.versions.get(path) || 0) + 1); }
  async fetch(url, options = {}) {
    const parsed = new URL(url), path = parsed.pathname.slice(1).replace(/\.json$/, '');
    const method = options.method || 'GET'; this.requests.push({ path, method });
    assert.equal(parsed.origin, 'http://localhost'); assert.equal(parsed.search, '');
    const etag = () => '"' + (this.versions.get(path) || 0) + '"';
    if (method === 'GET') {
      const value = this.get(path), tag = etag();
      return { ok: true, status: 200, headers: new Headers({ etag: tag }), json: async () => clone(value) };
    }
    assert.equal(method, 'PUT');
    if (path.startsWith(ARCHIVE_PREFIX) && this.failArchivePut) return { ok: false, status: 503, headers: new Headers() };
    const value = JSON.parse(options.body);
    if (this.beforePut) await this.beforePut(path, value);
    assert.ok(new Headers(options.headers).get('If-Match'));
    if (new Headers(options.headers).get('If-Match') !== etag()) {
      this.conflicts++; return { ok: false, status: 412, headers: new Headers() };
    }
    this.set(path, value); this.writes.push({ path, value: clone(value) });
    if (this.afterPut) await this.afterPut(path, value);
    return { ok: true, status: 200, headers: new Headers(), json: async () => clone(value) };
  }
}
function fixture() {
  const db = new MemoryFirebase(), code = 'ARCHSERV', controlToken = 'a'.repeat(32);
  const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: String(playerNum).repeat(32) }));
  const canonical = 'rooms/' + code + '/players/' + controlToken;
  const path = num => 'rooms/' + code + '/players/' + seats[num - 1].token;
  let clock = 1000, sequence = 0;
  const original = E.create({ id: 'archive-service-session', roster: seats.map(({ playerNum }) => ({ playerNum, name: 'Synthetic ' + playerNum })),
    topic: { title: 'Space cafe', question: 'What should our space cafe sell?' }, now: clock,
    gameMode: 'crazy', crazySource: 'players', conversationMode: 'free', crazyMinSeconds: 5, crazyMaxSeconds: 5,
    crazyTaskSeconds: 30, gameSeconds: 300 });
  db.set(canonical, { state: original, revision: 1, owner: 'old-browser' });
  for (const seat of seats) db.set(path(seat.playerNum), E.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret: SERVICE_SECRET, archiveSecret: ARCHIVE_SECRET, databaseURL: 'http://localhost',
    fetchImpl: db.fetch.bind(db), now: () => clock, games: adapters });
  const store = createStore({ secret: ARCHIVE_SECRET, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db) });
  const state = () => adapters.letstalk.decode(db.get(canonical)), card = num => db.get(path(num));
  const body = (num, type, extra = {}) => ({ capsule: card(num).hubExecutor.capsule, token: seats[num - 1].token,
    command: { id: 'archive-command-' + ++sequence, sessionId: state().sessionId, turnId: state().turnId, type, ...extra } });
  const act = async (num, type, extra = {}) => {
    const request = body(num, type, extra), result = await service.execute(request); return { request, result };
  };
  return { db, code, controlToken, seats, canonical, path, service, store, state, card, body, act,
    register: () => service.register({ game: 'letstalk', code, controlToken, seats, sessionId: original.sessionId }),
    pulse: num => service.execute({ capsule: card(num).hubExecutor.capsule, token: seats[num - 1].token, clock: true }),
    advance: value => { clock = value; }, now: () => clock };
}
const newTopic = {
  confirm: true, topic: { title: 'Tiny hotel', question: 'What does our tiny hotel need?' }, mode: 'think', seconds: 45,
  gameMode: 'crazy', crazySource: 'players', conversationMode: 'free', crazyMinSeconds: 5, crazyMaxSeconds: 5,
  gameSeconds: 300, crazyTaskSeconds: 30, showStarters: true
};
const unpersisted = f => E.archiveEntries(f.state());


test('accepted handwriting is durably encrypted before any success receipt is published', async () => {
  const f = fixture(); await f.register(); const text = 'Pretend the next drink is a secret potion.';
  const request = f.body(1, 'crazyAssign', { text, target: 2, kind: 'task' });
  let receiptWrites = 0, archiveCommitted = false;
  f.db.afterPut = async path => { if (path.startsWith(ARCHIVE_PREFIX)) archiveCommitted = true; };
  f.db.beforePut = async (path, value) => {
    if (f.seats.some(seat => path === f.path(seat.playerNum)) && value.talk?.reply?.id === request.command.id) {
      receiptWrites++; assert.equal(archiveCommitted, true, 'the success receipt follows the archive commit');
      const records = await f.store.readRoom(f.code);
      assert.equal(records.length, 1); assert.equal(records[0].text, text); assert.equal(records[0].status, 'queued');
    }
  };
  await f.service.execute(request); assert.equal(receiptWrites, 1);
  assert.equal(f.card(1).talk.reply.error, ''); assert.deepEqual(unpersisted(f), []);
  const record = f.state().challengeArchive.records[0]; assert.equal(record.persistedVersion, record.version);
  for (const seat of f.seats) {
    const serialized = JSON.stringify(f.card(seat.playerNum));
    for (const marker of [text, record.id, ARCHIVE_SECRET, 'challengeArchive', 'persistedVersion', ARCHIVE_PREFIX]) assert.ok(!serialized.includes(marker));
  }
  const stored = f.db.writes.find(write => write.path.startsWith(ARCHIVE_PREFIX)); assert.ok(stored);
  for (const marker of [text, 'Synthetic 1', f.controlToken, ARCHIVE_SECRET]) assert.ok(!JSON.stringify(stored.value).includes(marker));
});

test('archive storage failure keeps the committed journal, withholds ACK and same-id retry records only once', async () => {
  const f = fixture(); await f.register(); const request = f.body(1, 'crazyAssign', { text: 'Speak like a lost elevator.', kind: 'line' });
  const oldCard = f.card(1); f.db.failArchivePut = true;
  await assert.rejects(f.service.execute(request), { code: 'archive_unavailable' });
  assert.equal(f.state().crazy.queue.length, 1); assert.equal(unpersisted(f).length, 1);
  assert.equal(f.state().replies[1].id, request.command.id);
  assert.deepEqual(f.card(1), oldCard, 'committed canonical reply must not escape before durable storage');
  f.db.failArchivePut = false; await f.service.execute(request);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1); assert.equal(records[0].text, request.command.text);
  assert.equal(f.state().crazy.queue.length, 1); assert.deepEqual(unpersisted(f), []);
  assert.equal(f.card(1).talk.reply.id, request.command.id); assert.equal(f.card(1).talk.reply.error, '');
});

test('authenticated retry drains an accepted journal after switching games without reviving Talk cards', async () => {
  const f = fixture(); await f.register(); const request = f.body(1, 'crazyAssign', { text: 'Announce a tiny imaginary parade.', target: 2, kind: 'task' });
  f.db.failArchivePut = true; await assert.rejects(f.service.execute(request), { code: 'archive_unavailable' });
  const changed = { game: 'taboo', playerNum: 1, name: 'Synthetic 1', word: 'Synthetic Taboo word' };
  f.db.set(f.path(1), changed); f.db.failArchivePut = false;
  const before = f.db.writes.length;
  await assert.rejects(f.service.execute(request), { code: 'game_switched' });
  assert.deepEqual(f.card(1), changed); assert.deepEqual(unpersisted(f), []);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1); assert.equal(records[0].text, request.command.text);
  assert.equal(f.db.writes.slice(before).filter(write => f.seats.some(seat => write.path === f.path(seat.playerNum))).length, 0);
});

test('a late journal ACK preserves a newer unresolved version and never publishes its unflushed success receipt', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'start');
  const request = f.body(1, 'crazyAssign', { text: 'Treat our table as a pirate ship.', target: 2 });
  let finishRequest;
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = null; f.db.failArchivePut = true;
    finishRequest = f.body(2, 'finish');
    await assert.rejects(f.service.execute(finishRequest), { code: 'archive_unavailable' });
    f.db.failArchivePut = false;
  };
  await f.service.execute(request);
  assert.equal(f.state().phase, 'ended');
  const pending = unpersisted(f); assert.equal(pending.length, 1);
  assert.equal(pending[0].status, 'cancelled'); assert.equal(pending[0].version, 2); assert.equal(pending[0].persistedVersion, 1);
  assert.notEqual(f.card(2).talk.reply?.id, finishRequest.command.id, 'outer writer must not publish another request whose newer record is not saved');
  assert.equal((await f.store.readRoom(f.code))[0].status, 'queued');
  await f.pulse(3);
  assert.equal((await f.store.readRoom(f.code))[0].status, 'cancelled'); assert.deepEqual(unpersisted(f), []);
  assert.equal(f.card(2).talk.reply.id, finishRequest.command.id); assert.equal(f.card(1).talk.phase, 'ended');
});

test('concurrent newTopic persists cancellation and fences an old snapshot from overwriting the new session', async () => {
  const f = fixture(); await f.register(); const oldSession = f.state().sessionId;
  const request = f.body(1, 'crazyAssign', { text: 'Make a royal speech to the spoon.', target: 2 });
  let nestedRequest, newerRequest;
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = null;
    nestedRequest = (await f.act(2, 'newTopic', newTopic)).request;
    newerRequest = (await f.act(3, 'crazyAssign', { text: 'Promote the fork to hotel manager.', target: 1 })).request;
  };
  await f.service.execute(request);
  const currentSession = f.state().sessionId; assert.notEqual(currentSession, oldSession);
  for (const seat of f.seats) assert.equal(f.card(seat.playerNum).talk.sessionId, currentSession);
  assert.equal(f.card(3).talk.reply.id, newerRequest.command.id);
  assert.equal(f.card(2).talk.reply.id, nestedRequest.command.id);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 2);
  assert.equal(records.find(record => record.text === request.command.text).status, 'cancelled');
  assert.equal(records.find(record => record.text === newerRequest.command.text).status, 'queued');
  assert.deepEqual(unpersisted(f), []);
});

test('release, fresh create and changed-roster registration preserve history and reject late old-roster publication', async () => {
  const f = fixture(); await f.register();
  const request = f.body(1, 'crazyAssign', { text: 'Convince the mug it is famous.', target: 2 });
  const newerSeats = [1, 2, 3].map(playerNum => ({ playerNum, token: String(playerNum + 3).repeat(32) }));
  const newerPath = num => 'rooms/' + f.code + '/players/' + newerSeats[num - 1].token;
  let newSession;
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = null;
    const raw = f.db.get(f.canonical);
    await f.service.release({ capsule: raw.executor.capsule, token: f.controlToken });
    const released = f.db.get(f.canonical);
    const fresh = E.create({ id: 'new-roster-session', topic: newTopic.topic, roster: newerSeats.map(({ playerNum }) => ({ playerNum, name: 'New synthetic ' + playerNum })),
      now: f.now(), gameMode: 'crazy', crazySource: 'players', challengeArchive: released.state.challengeArchive });
    newSession = fresh.sessionId;
    f.db.set(f.canonical, { ...released, state: fresh, revision: released.revision + 1 });
    for (const seat of newerSeats) f.db.set(newerPath(seat.playerNum), E.view(fresh, seat.playerNum, f.now()));
    await f.service.register({ game: 'letstalk', code: f.code, controlToken: f.controlToken, seats: newerSeats, sessionId: fresh.sessionId });
  };
  await f.service.execute(request);
  assert.equal(f.state().sessionId, newSession);
  for (const seat of newerSeats) assert.equal(f.db.get(newerPath(seat.playerNum)).talk.sessionId, newSession);
  for (const seat of f.seats) assert.notEqual(f.card(seat.playerNum).talk.reply?.id, request.command.id);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1);
  assert.equal(records[0].text, request.command.text); assert.equal(records[0].status, 'cancelled');
  assert.deepEqual(unpersisted(f), []);
});

test('retained Talk tickets keep private archive receipts valid after a mid-game seat append', async () => {
  const f = fixture(); await f.register();
  const request = f.body(1, 'crazyAssign', { text: 'Introduce the spoon as your royal adviser.', target: 2 });
  const before = f.state(), newToken = '4'.repeat(32), newPath = 'rooms/' + f.code + '/players/' + newToken;
  const joined = await f.service.updateRoster({ capsule: request.capsule, token: f.controlToken, commandId: 'archive-live-append',
    roster: [...f.seats, { playerNum: 4, token: newToken }].map(seat => ({ playerNum: seat.playerNum, originalToken: seat.token, name: 'Synthetic ' + seat.playerNum })), hubCount: 4 });
  assert.notEqual(joined.capsule, request.capsule); assert.equal(f.state().sessionId, before.sessionId);
  assert.equal(f.state().scores[4], 0); assert.equal(f.db.get(newPath).hubExecutor.capsule, joined.capsule);
  let archived = false;
  f.db.afterPut = async path => { if (path.startsWith(ARCHIVE_PREFIX)) archived = true; };
  f.db.beforePut = async (path, value) => {
    if (path === f.path(1) && value.talk?.reply?.id === request.command.id) assert.equal(archived, true);
  };
  await f.service.execute(request);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1); assert.equal(records[0].text, request.command.text);
  assert.equal(f.card(1).talk.reply.id, request.command.id); assert.deepEqual(unpersisted(f), []);
  assert.equal(f.state().sessionId, before.sessionId); assert.equal(f.state().roster.length, 4);
});

test('membership departure archive failure keeps the private receipt withheld and exact retry cancels once', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'crazyAssign', { text: 'Wear an imaginary crown.', target: 2 });
  const oldCards = f.seats.map(seat => f.card(seat.playerNum));
  const request = { capsule: f.card(1).hubExecutor.capsule, token: f.controlToken, commandId: 'archive-member-away', playerNum: 1, active: false };
  f.db.failArchivePut = true;
  await assert.rejects(f.service.setParticipant(request), { code: 'archive_unavailable' });
  assert.equal(f.state().roster[0].active, false); assert.equal(f.db.get(f.canonical).executor.membershipRevision, 1);
  assert.equal(unpersisted(f)[0].status, 'cancelled'); assert.equal(unpersisted(f)[0].version, 2);
  assert.deepEqual(f.seats.map(seat => f.card(seat.playerNum)), oldCards, 'no membership projection is acknowledged before cancellation is durable');
  f.db.failArchivePut = false; const result = await f.service.setParticipant(request);
  assert.equal(result.ok, true); assert.deepEqual(result.inactiveNums, [1]);
  assert.equal(f.db.get(f.canonical).executor.membershipRevision, 1, 'the duplicate receipt does not apply the membership hook again');
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1); assert.equal(records[0].status, 'cancelled'); assert.equal(records[0].version, 2);
  assert.deepEqual(unpersisted(f), []); assert.equal(f.card(2).talk.roster[0].active, false);
});

test('Hub append and omission retry uses its old membership capsule while persisting the cancelled archive', async () => {
  const f = fixture(); await f.register(); await f.act(1, 'crazyAssign', { text: 'Negotiate a peace treaty with the mug.', target: 3 });
  const oldCapsule = f.card(1).hubExecutor.capsule, newToken = '4'.repeat(32);
  const request = { capsule: oldCapsule, token: f.controlToken, commandId: 'archive-append-with-omission', hubCount: 2,
    roster: [...f.seats, { playerNum: 4, token: newToken }].map(seat => ({ playerNum: seat.playerNum, originalToken: seat.token, name: 'Synthetic ' + seat.playerNum })) };
  f.db.failArchivePut = true; await assert.rejects(f.service.updateRoster(request), { code: 'archive_unavailable' });
  const committedCapsule = f.db.get(f.canonical).executor.capsule; assert.notEqual(committedCapsule, oldCapsule);
  assert.equal(f.state().roster.length, 4); assert.equal(f.state().roster[2].active, false);
  assert.equal(f.card(1).hubExecutor.capsule, oldCapsule, 'the rotated player capability waits for durable cancellation');
  f.db.failArchivePut = false; const result = await f.service.updateRoster(request);
  assert.equal(result.capsule, committedCapsule); assert.deepEqual(result.inactiveNums, [3, 4]);
  assert.equal(f.db.get(f.canonical).executor.membershipRevision, 1); assert.equal(f.state().roster.length, 4);
  assert.equal((await f.store.readRoom(f.code))[0].status, 'cancelled'); assert.deepEqual(unpersisted(f), []);
  assert.equal(f.card(1).hubExecutor.capsule, committedCapsule);
});

test('an archive ACK racing live membership growth cannot restore old cards or lose the handwritten journal', async () => {
  const f = fixture(); await f.register(); const newToken = '4'.repeat(32), before = f.state();
  const request = f.body(1, 'crazyAssign', { text: 'Make a speech thanking the tiny fork.', target: 2 });
  let joined;
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = null;
    joined = await f.service.updateRoster({ capsule: request.capsule, token: f.controlToken, commandId: 'archive-racing-append', hubCount: 4,
      roster: [...f.seats, { playerNum: 4, token: newToken }].map(seat => ({ playerNum: seat.playerNum, originalToken: seat.token, name: 'Synthetic ' + seat.playerNum })) });
  };
  await f.service.execute(request);
  assert.equal(f.state().sessionId, before.sessionId); assert.equal(f.state().roster.length, 4);
  assert.equal(f.db.get(f.canonical).executor.capsule, joined.capsule);
  for (const seat of [...f.seats, { playerNum: 4, token: newToken }]) {
    const card = f.db.get('rooms/' + f.code + '/players/' + seat.token); assert.equal(card.hubExecutor.capsule, joined.capsule);
    assert.equal(card.talk.roster.length, 4); assert.equal(JSON.stringify(card).includes('challengeArchive'), false);
  }
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1); assert.equal(records[0].text, request.command.text);
  assert.equal(f.state().crazy.queue.length, 1); assert.deepEqual(unpersisted(f), []);
});
