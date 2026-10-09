// Real membership, Talk adapter, encrypted archive store and isolated REST/ETag nodes.
// All credentials and room content are synthetic; no environment or live rooms are read.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const { adapters } = require('../runtime/story-executor.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { createStore } = require('../runtime/talk-archive-store.cjs');
const SECRET = '61'.repeat(32), ARCHIVE_SECRET = '93'.repeat(32);
const ARCHIVE_PREFIX = 'rooms/talk-archive/players/';
const clone = value => value == null ? null : structuredClone(value);

class MemoryFirebase {
  constructor() {
    this.nodes = new Map(); this.versions = new Map(); this.writes = [];
    this.failArchivePut = false; this.beforePut = null; this.afterPut = null;
  }
  get(path) { return clone(this.nodes.get(path)); }
  set(path, value) {
    this.nodes.set(path, clone(value));
    this.versions.set(path, (this.versions.get(path) || 0) + 1);
  }
  async fetch(url, options = {}) {
    const parsed = new URL(url), path = parsed.pathname.slice(1).replace(/\.json$/, '');
    assert.equal(parsed.origin, 'http://localhost'); assert.equal(parsed.search, '');
    const etag = () => '"' + (this.versions.get(path) || 0) + '"';
    if (!options.method || options.method === 'GET') {
      const value = this.get(path), tag = etag();
      return new Response(JSON.stringify(value), { headers: { etag: tag } });
    }
    assert.equal(options.method, 'PUT');
    if (path.startsWith(ARCHIVE_PREFIX) && this.failArchivePut) return new Response('null', { status: 503 });
    const value = JSON.parse(options.body);
    if (this.beforePut) await this.beforePut(path, value);
    assert.ok(new Headers(options.headers).get('If-Match'));
    if (new Headers(options.headers).get('If-Match') !== etag()) return new Response('null', { status: 412 });
    this.set(path, value); this.writes.push({ path, value: clone(value) });
    if (this.afterPut) await this.afterPut(path, value);
    return new Response(JSON.stringify(value));
  }
}
async function fixture() {
  const db = new MemoryFirebase(), code = 'ARCHMEMB', controlToken = 'a'.repeat(32);
  const tokens = [1, 2, 3, 4].map(n => String(n).repeat(32));
  const seats = tokens.slice(0, 3).map((token, i) => ({ playerNum: i + 1, token }));
  const canonical = 'rooms/' + code + '/players/' + controlToken;
  const path = num => 'rooms/' + code + '/players/' + tokens[num - 1];
  let clock = 1000, sequence = 0;
  const original = E.create({
    id: 'archive-membership-session', roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Synthetic ' + s.playerNum })),
    topic: { title: 'Synthetic cafe', question: 'What should our imaginary cafe sell?' }, now: clock,
    gameMode: 'crazy', crazySource: 'players', conversationMode: 'free',
    crazyMinSeconds: 5, crazyMaxSeconds: 5, crazyTaskSeconds: 30, gameSeconds: 300
  });
  db.set(canonical, { state: original, revision: 1 });
  for (const seat of seats) db.set(path(seat.playerNum), E.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret: SECRET, archiveSecret: ARCHIVE_SECRET, databaseURL: 'http://localhost',
    fetchImpl: db.fetch.bind(db), now: () => clock, games: adapters });
  const store = createStore({ secret: ARCHIVE_SECRET, databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db) });
  const state = () => adapters.letstalk.decode(db.get(canonical));
  const capsule = () => db.get(canonical).executor.capsule;
  const card = n => db.get(path(n));
  const body = (actor, type, extra = {}, cap = capsule()) => ({
    capsule: cap, token: actor === 0 ? controlToken : tokens[actor - 1],
    command: { id: 'synthetic-command-' + ++sequence, sessionId: state().sessionId, turnId: state().turnId, type, ...extra }
  });
  const act = (actor, type, extra) => service.execute(body(actor, type, extra));
  const roster = count => tokens.slice(0, count).map((originalToken, i) => ({
    playerNum: i + 1, originalToken, name: 'Synthetic ' + (i + 1)
  }));
  const appendBody = (extra = {}) => ({
    capsule: capsule(), token: controlToken, commandId: 'synthetic-append-' + ++sequence, roster: roster(4), hubCount: 4, ...extra
  });
  const removalBody = () => ({
    capsule: capsule(), token: controlToken, commandId: 'synthetic-away-' + ++sequence, playerNum: 2, active: false
  });
  await service.register({ game: 'letstalk', code, controlToken, seats, sessionId: original.sessionId });
  return { db, code, tokens, controlToken, canonical, path, service, store, state, capsule, card, body, act,
    appendBody, removalBody, advance: value => { clock = value; },
    pulse: actor => service.execute({ capsule: capsule(), token: tokens[actor - 1], clock: true }) };
}
const unpersisted = f => E.archiveEntries(f.state());
const deferred = () => {
  let resolve; const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
async function waitFor(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('synthetic race did not reach its barrier')), 5000);
    })]);
  } finally { clearTimeout(timer); }
}

test('participant removal durably closes delivered and authored queued handwriting before public success', async () => {
  const f = await fixture(); await f.act(1, 'start');
  const delivered = 'Pretend the synthetic spoon is our captain.';
  const queued = 'Introduce an imaginary upside-down sandwich.';
  await f.act(1, 'crazyAssign', { text: delivered, target: 2, kind: 'task' });
  f.advance(6000); await f.pulse(3);
  assert.equal(f.state().crazy.prompts[2].status, 'pending');
  await f.act(2, 'crazyAssign', { text: queued, target: 3, kind: 'line' });
  const request = f.removalBody(); let projections = 0;
  f.db.beforePut = async (path, value) => {
    if (![1, 2, 3].some(n => path === f.path(n)) || value.talk?.roster?.[1]?.active !== false) return;
    projections++;
    const records = await f.store.readRoom(f.code);
    assert.equal(records.length, 2);
    assert.ok(records.every(record => record.status === 'cancelled' && record.closedAt === 6000));
  };
  const result = await f.service.setParticipant(request);
  assert.equal(result.ok, true); assert.deepEqual(result.inactiveNums, [2]); assert.ok(projections > 0);
  assert.equal(f.state().crazy.prompts[2].status, 'cancelled'); assert.equal(f.state().crazy.queue.length, 0);
  assert.deepEqual(unpersisted(f), []);
  assert.ok((await f.store.readRoom(f.code)).every(record => record.status === 'cancelled'));
});

test('failed removal storage withholds successful membership projection and same-id retry persists one cancellation', async () => {
  const f = await fixture();
  await f.act(1, 'crazyAssign', { text: 'Give a synthetic mug a fake award.', target: 2 });
  const request = f.removalBody(), oldCards = [1, 2, 3].map(f.card);
  f.db.failArchivePut = true;
  await assert.rejects(f.service.setParticipant(request), { code: 'archive_unavailable' });
  assert.equal(f.state().roster[1].active, false); assert.equal(unpersisted(f)[0].status, 'cancelled');
  assert.deepEqual([1, 2, 3].map(f.card), oldCards);
  assert.equal((await f.store.readRoom(f.code))[0].status, 'queued');
  const revision = f.db.get(f.canonical).executor.membershipRevision;
  f.db.failArchivePut = false;
  const result = await f.service.setParticipant(request);
  assert.equal(result.ok, true); assert.deepEqual(result.inactiveNums, [2]);
  assert.equal(f.db.get(f.canonical).executor.membershipRevision, revision);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1);
  assert.equal(records[0].status, 'cancelled'); assert.deepEqual(unpersisted(f), []);
  assert.equal(f.card(1).talk.roster[1].active, false);
});

test('retained old same-session ticket resolves appended seats before draining a failed handwritten acceptance', async () => {
  const f = await fixture(), oldCapsule = f.capsule(), append = f.appendBody();
  await f.service.updateRoster(append);
  assert.notEqual(f.capsule(), oldCapsule); assert.equal(f.state().roster.length, 4);
  const request = f.body(1, 'crazyAssign', { text: 'Make a speech for a synthetic cloud.', target: 2 }, oldCapsule);
  f.db.failArchivePut = true;
  await assert.rejects(f.service.execute(request), { code: 'archive_unavailable' });
  assert.equal(unpersisted(f).length, 1);
  f.db.failArchivePut = false;
  await f.service.execute(request);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1);
  assert.equal(records[0].text, request.command.text); assert.equal(f.state().crazy.queue.length, 1);
  assert.deepEqual(unpersisted(f), []);
  assert.equal(f.card(1).talk.reply.id, request.command.id);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).hubExecutor.capsule, f.capsule());
  const revision = f.db.get(f.canonical).executor.membershipRevision;
  const retried = await f.service.updateRoster(append); assert.equal(retried.ok, true);
  assert.equal(f.db.get(f.canonical).executor.membershipRevision, revision);
  assert.equal((await f.store.readRoom(f.code)).length, 1);
});

test('retained pre-append ticket drains latest binding before rejecting a card that switched games', async () => {
  const f = await fixture(), oldCapsule = f.capsule();
  await f.service.updateRoster(f.appendBody());
  const request = f.body(1, 'crazyAssign', { text: 'Sell a synthetic invisible hat.', target: 2 }, oldCapsule);
  f.db.failArchivePut = true;
  await assert.rejects(f.service.execute(request), { code: 'archive_unavailable' });
  const foreign = { game: 'taboo', playerNum: 1, word: 'Synthetic foreign card' };
  f.db.set(f.path(1), foreign); f.db.failArchivePut = false;
  await assert.rejects(f.service.execute(request), { code: 'game_switched' });
  assert.deepEqual(f.card(1), foreign); assert.deepEqual(unpersisted(f), []);
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1);
  assert.equal(records[0].text, request.command.text);
});

test('append plus removal during sidecar persistence fences old-roster ACK from newer cancellation', async () => {
  const f = await fixture(), oldCapsule = f.capsule();
  // Membership reads an empty journal and pauses before its first conditional
  // commit. Handwriting is then accepted; the ETag retry must retain that record
  // in the newly extended binding without acknowledging it through the old one.
  const gateReached = deferred(), releaseGate = deferred(); let gateUsed = false;
  f.db.beforePut = async (path, value) => {
    if (path === f.canonical && value.executor?.membershipRevision === 1 && !gateUsed) {
      gateUsed = true; gateReached.resolve(); await releaseGate.promise;
    }
  };
  const append = f.appendBody({ inactiveNums: [2] });
  const membershipWork = f.service.updateRoster(append); membershipWork.catch(() => {});
  await waitFor(gateReached.promise);
  const request = f.body(1, 'crazyAssign', { text: 'Declare the synthetic napkin mayor.', target: 2 });
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = null; f.db.failArchivePut = true; releaseGate.resolve();
    await assert.rejects(membershipWork, { code: 'archive_unavailable' });
    f.db.failArchivePut = false;
  };
  try { await f.service.execute(request); } finally { releaseGate.resolve(); }
  assert.equal(gateUsed, true);
  assert.notEqual(f.capsule(), oldCapsule); assert.equal(f.state().roster.length, 4);
  const pending = unpersisted(f); assert.equal(pending.length, 1);
  assert.equal(pending[0].status, 'cancelled'); assert.equal(pending[0].version, 2);
  assert.equal(Number(pending[0].persistedVersion) || 0, 0, 'old binding may not ACK even the older version in an appended binding');
  assert.equal((await f.store.readRoom(f.code))[0].status, 'queued');
  assert.notEqual(f.card(1).talk.reply?.id, request.command.id);
  await f.service.execute({ capsule: oldCapsule, token: f.tokens[0] });
  const records = await f.store.readRoom(f.code); assert.equal(records.length, 1);
  assert.equal(records[0].status, 'cancelled'); assert.deepEqual(unpersisted(f), []);
  assert.equal((await f.service.updateRoster(append)).ok, true);
  assert.equal((await f.store.readRoom(f.code)).length, 1);
});

test('delayed old snapshot never republishes a cancelled prompt during partial same-epoch removal publication', async () => {
  const f = await fixture(); await f.act(1, 'start');
  const delivered = 'Treat a synthetic teacup as a spaceship.';
  await f.act(1, 'crazyAssign', { text: delivered, target: 2 });
  f.advance(6000); await f.pulse(3);
  assert.equal(f.card(2).talk.crazy.prompt.status, 'pending');
  const oldCapsule = f.capsule(), oldEpoch = f.db.get(f.canonical).executor.epoch;
  const gateReached = deferred(), releaseGate = deferred();
  let gateUsed = false, membershipWork, staleWrites = [];
  f.db.beforePut = async (path, value) => {
    if (path === f.path(2) && value.talk?.roster?.[1]?.active === false && !gateUsed) {
      gateUsed = true; gateReached.resolve(); await releaseGate.promise;
    }
  };
  f.db.afterPut = async path => {
    if (!path.startsWith(ARCHIVE_PREFIX)) return;
    f.db.afterPut = async (writtenPath, value) => {
      if ([1, 2, 3].some(n => writtenPath === f.path(n)) &&
          f.state().roster[1].active === false && value.talk?.roster?.[1]?.active !== false) {
        staleWrites.push({ path: writtenPath, prompt: value.talk.crazy.prompt, pending: value.talk.crazy.pendingPlayerNums });
      }
    };
    membershipWork = f.service.setParticipant(f.removalBody());
    membershipWork.catch(() => {}); // The assertion below owns this pending result.
    await waitFor(gateReached.promise);
  };
  try {
    await f.act(1, 'crazyAssign', { text: 'Introduce a synthetic floating plate.', target: 3 });
    assert.equal(gateUsed, true);
    assert.equal(f.capsule(), oldCapsule); assert.equal(f.db.get(f.canonical).executor.epoch, oldEpoch);
    assert.equal(f.state().crazy.prompts[2].status, 'cancelled');
    assert.equal(f.card(1).talk.roster[1].active, false, 'one newer private projection has committed');
    assert.deepEqual(staleWrites, [], 'no old active participant or pending prompt may be written while the other newer card is still blocked');
  } finally {
    releaseGate.resolve();
    if (membershipWork) await membershipWork;
  }
  assert.equal(f.card(2).talk.roster[1].active, false); assert.equal(f.card(2).talk.crazy.prompt, null);
  assert.equal((await f.store.readRoom(f.code)).find(record => record.text === delivered).status, 'cancelled');
  assert.deepEqual(unpersisted(f), []);
});
