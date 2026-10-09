// Real Talk adapter + service CAS, without a browser Host or live writes.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const { adapters } = require('../runtime/story-executor.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const clone = value => value == null ? null : structuredClone(value);
class MemoryFirebase {
  constructor() { this.nodes = new Map(); this.revisions = new Map(); this.conflict = null; this.conflicts = 0; }
  set(path, value) { this.nodes.set(path, clone(value)); this.revisions.set(path, (this.revisions.get(path) || 0) + 1); }
  get(path) { return clone(this.nodes.get(path)); }
  async fetch(url, options = {}) {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, ''), etag = '"' + (this.revisions.get(path) || 0) + '"';
    if (!options.method) return { ok: true, headers: new Headers({ etag }), json: async () => this.get(path) };
    assert.equal(options.method, 'PUT'); assert.equal(typeof options.headers['If-Match'], 'string');
    if (this.conflict === path) { this.conflict = null; this.conflicts++; this.set(path, this.get(path)); return { ok: false, status: 412 }; }
    if (options.headers['If-Match'] !== etag) return { ok: false, status: 412 };
    this.set(path, JSON.parse(options.body)); return { ok: true, json: async () => this.get(path) };
  }
}

test('ordinary Talk cards manage pending questions, settings and new-topic ticket rotation through the real service', async () => {
  const db = new MemoryFirebase(), code = 'TALKTEST', controlToken = 'a'.repeat(32);
  const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: String(playerNum).repeat(20) }));
  const path = num => 'rooms/' + code + '/players/' + seats[num - 1].token, canonical = 'rooms/' + code + '/players/' + controlToken;
  let clock = 1000, sequence = 0;
  const original = E.create({ id: 'service-talk', topic: { id: 'original', question: 'What should we build?', followUps: ['For whom?', 'Where?'] },
    roster: seats.map(p => ({ playerNum: p.playerNum, name: 'Player ' + p.playerNum })), now: clock, seconds: 45 });
  db.set(canonical, { state: original, owner: 'former-browser', revision: 1 });
  for (const seat of seats) db.set(path(seat.playerNum), E.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret: '57'.repeat(32), databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db), now: () => clock, games: adapters });
  await service.register({ game: 'letstalk', code, controlToken, sessionId: original.sessionId, seats });
  const state = () => adapters.letstalk.decode(db.get(canonical)), card = num => db.get(path(num));
  const requests = [];
  const perform = async (num, type, extra = {}, expectedError = '') => {
    const s = state(), command = { id: 'card-action-' + ++sequence, sessionId: s.sessionId, turnId: s.turnId, type, ...extra };
    const body = { capsule: card(num).hubExecutor.capsule, token: seats[num - 1].token, command }; requests.push(body);
    await service.execute(body); assert.equal(card(num).talk.reply.id, command.id); assert.equal(card(num).talk.reply.error, expectedError);
    return command;
  };
  await perform(2, 'start'); const currentSpeaker = state().speaker, asker = seats.find(p => p.playerNum !== currentSpeaker).playerNum;
  await perform(asker, 'ask');
  await perform(2, 'end', {}, 'pending_questions'); assert.equal(state().speaker, currentSpeaker);
  await perform(2, 'end', { confirm: true }); assert.notEqual(state().speaker, currentSpeaker);
  const originalSession = state().sessionId, turn = state().turnId;
  await perform(3, 'extend', { index: 1 }); assert.equal(state().extension, 'Where?'); assert.equal(state().turnId, turn);
  await perform(3, 'extend', { text: 'What would help us begin?' }); assert.equal(card(1).talk.topic.followUp, 'What would help us begin?');
  await perform(1, 'starters', { show: false }); assert.equal(card(3).talk.showStarters, false);
  const oldCapsule = card(2).hubExecutor.capsule; db.conflict = canonical; clock = 2000;
  await perform(2, 'newTopic', { actor: 0, confirm: true, topic: { question: 'Imagine a friendly shop.', followUps: ['Who visits?'] },
    mode: 'write', seconds: 30, gameMode: 'crazy', crazySeconds: 60, crazyMinSeconds: 5, crazyMaxSeconds: 5, gameSeconds: 120, crazyTaskSeconds: 30, showStarters: true });
  assert.equal(db.conflicts, 1); assert.notEqual(state().sessionId, originalSession); assert.equal(state().sharedControls, true);
  assert.equal(state().deadline, 32000); assert.equal(state().mode, 'write'); assert.equal(state().crazy.intervalSeconds, 60);
  assert.equal(state().gameSeconds, 120); assert.equal(state().crazy.taskSeconds, 30);
  const capsule = card(2).hubExecutor.capsule; assert.notEqual(capsule, oldCapsule);
  for (const seat of seats) { assert.equal(card(seat.playerNum).hubExecutor.capsule, capsule); assert.equal(card(seat.playerNum).talk.sessionId, state().sessionId); assert.equal(card(seat.playerNum).talk.actions.newTopic, true); }
  await assert.rejects(service.execute({ capsule: oldCapsule, token: seats[1].token, command: { id: 'obsolete', type: 'start', sessionId: originalSession, turnId: turn } }), /stale_session/);
  await perform(1, 'start'); await perform(3, 'crazySend');
  assert.deepEqual(state().crazy.prompts, {});
  for (let i = 0; i < 3; i++) {
    clock = state().crazy.nextAssignAt;
    await service.execute({ capsule: card(3).hubExecutor.capsule, token: seats[2].token, clock: true });
  }
  assert.equal(Object.values(state().crazy.prompts).filter(prompt => prompt.status === 'pending').length, 2);
  assert.equal(state().crazy.nextAt, undefined); assert.equal(state().gameDeadline, 122000);
  const publicView = adapters.letstalk.project(state(), { playerNum: 0 }, { now: clock });
  assert.equal(publicView.talk.crazy.prompt, null); assert.equal(publicView.talk.hostControls, false);
  assert.deepEqual(publicView.talk.scores, seats.map(({ playerNum }) => ({ playerNum, score: 0 })));
  for (const seat of seats) {
    assert.equal(card(seat.playerNum).talk.crazy.prompts, undefined);
    const own = card(seat.playerNum).talk.crazy.prompt;
    if (own) assert.equal(own.expiresAt - own.at, 30000);
    assert.equal(card(seat.playerNum).talk.gameDeadline, state().gameDeadline);
    const serialized = JSON.stringify(card(seat.playerNum)); assert.ok(!serialized.includes(controlToken));
    for (const other of seats.filter(p => p !== seat)) {
      assert.ok(!serialized.includes(other.token));
      const privatePrompt = state().crazy.prompts[other.playerNum];
      if (privatePrompt) { assert.ok(!serialized.includes(privatePrompt.id)); assert.ok(!serialized.includes(privatePrompt.text)); }
    }
  }
  assert.ok(requests.every(body => body.token !== controlToken && !Object.hasOwn(body, 'controlToken')));
});

test('queued missions execute through authenticated seats with scheduled private delivery and no overwrite', async () => {
  const db = new MemoryFirebase(), code = 'TALKWRITE', controlToken = 'b'.repeat(32);
  const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: String(playerNum + 3).repeat(20) }));
  const path = num => 'rooms/' + code + '/players/' + seats[num - 1].token;
  const canonical = 'rooms/' + code + '/players/' + controlToken;
  let clock = 1000, sequence = 0;
  const original = E.create({ id: 'service-written-talk', topic: { question: 'What would a funny pet do?' },
    roster: seats.map(p => ({ playerNum: p.playerNum, name: 'Player ' + p.playerNum })), now: clock,
    gameMode: 'crazy', conversationMode: 'assigned', crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5 });
  db.set(canonical, { state: original, owner: 'former-browser', revision: 1 });
  for (const seat of seats) db.set(path(seat.playerNum), E.view(original, seat.playerNum, clock));
  const service = createExecutor({ secret: '58'.repeat(32), databaseURL: 'http://localhost', fetchImpl: db.fetch.bind(db),
    now: () => clock, games: adapters });
  await service.register({ game: 'letstalk', code, controlToken, sessionId: original.sessionId, seats });
  const state = () => adapters.letstalk.decode(db.get(canonical)), card = num => db.get(path(num));
  const request = (num, type, extra = {}) => ({ capsule: card(num).hubExecutor.capsule, token: seats[num - 1].token,
    command: { id: 'written-' + ++sequence, type, sessionId: state().sessionId, turnId: state().turnId, ...extra } });
  const perform = async (num, type, extra = {}, error = '') => {
    const body = request(num, type, extra); await service.execute(body);
    assert.deepEqual(card(num).talk.reply, { id: body.command.id, error }); return body;
  };
  const pulse = num => service.execute({ capsule: card(num).hubExecutor.capsule, token: seats[num - 1].token, clock: true });
  const text = 'Please make a short speech to your missing sock.';
  const assignment = await perform(1, 'crazyAssign', { actor: 0, target: 2, text, kind: 'task' });
  assert.equal(state().crazy.queue[0].assignedBy, 1, 'authenticated seat overrides supplied actor');
  for (const seat of seats) {
    const serialized = JSON.stringify(card(seat.playerNum));
    assert.equal(serialized.includes(text), false); assert.equal(card(seat.playerNum).talk.crazy.prompt, null);
    assert.equal(card(seat.playerNum).talk.crazy.myQueuedCount, seat.playerNum === 1 ? 1 : 0);
    assert.equal(serialized.includes(controlToken), false); assert.equal(card(seat.playerNum).talk.crazy.queue, undefined);
    for (const other of seats.filter(p => p !== seat)) assert.equal(serialized.includes(other.token), false);
  }
  const revision = db.get(canonical).revision; await service.execute(assignment); assert.equal(db.get(canonical).revision, revision);
  await perform(2, 'start'); assert.equal(state().speaker, 1); assert.deepEqual(state().crazy.prompts, {});
  clock = 6000; await pulse(3); assert.equal(state().crazy.prompts[2].text, text);
  assert.equal(state().crazy.prompts[2].assignedBy, 1); assert.equal(Object.keys(state().crazy.prompts).length, 1);
  for (const seat of seats) assert.equal(JSON.stringify(card(seat.playerNum)).includes(text), seat.playerNum === 2);
  const promptId = state().crazy.prompts[2].id;
  const one = request(1, 'crazyAssign', { target: 2, text: 'My spoon is the new teacher.', kind: 'line' });
  const three = request(3, 'crazyAssign', { target: 2, text: 'Give your shoes a new job.', kind: 'task' });
  db.conflict = canonical; await Promise.all([service.execute(one), service.execute(three)]); await pulse(1);
  assert.equal(state().crazy.queue.length, 2); assert.equal(state().replies[1].error, ''); assert.equal(state().replies[3].error, '');
  assert.equal(state().crazy.prompts[2].text, text); assert.equal(state().crazy.sequence[2], 1);
  const oldTurn = state().turnId; await perform(3, 'end'); assert.equal(state().speaker, 2);
  await perform(1, 'crazyAssign', { turnId: oldTurn, target: 3, text: 'Old turn.', kind: 'line' }, 'stale_turn');
  const missingTurn = request(1, 'crazyAssign', { target: 3, text: 'Missing turn.', kind: 'line' });
  delete missingTurn.command.turnId; await service.execute(missingTurn); assert.equal(card(1).talk.reply.error, 'stale_turn');
  await perform(2, 'crazyDone', { turnId: oldTurn, promptId });
  assert.equal(state().crazy.prompts[2].status, 'done'); assert.equal(state().crazy.nextAssignAt, 11000);
  assert.equal(state().scores[2], 1);
  for (const seat of seats) assert.equal(card(seat.playerNum).talk.scores.find(row => row.playerNum === 2).score, 1);
  clock = 11000; await pulse(1); assert.equal(state().crazy.prompts[2].source, 'player'); assert.equal(state().crazy.queue.length, 1);
  const firstQueued = state().crazy.prompts[2];
  const scheduledAt = state().crazy.nextAssignAt;
  clock = 12000; await perform(2, 'crazyDone', { promptId: firstQueued.id });
  assert.equal(state().crazy.nextAssignAt, scheduledAt); assert.equal(state().scores[2], 2);
  clock = scheduledAt; await pulse(3); assert.equal(state().crazy.queue.length, 0); assert.equal(state().crazy.sequence[2], 3);
  assert.notEqual(state().crazy.prompts[2].id, firstQueued.id);
  assert.ok([one.command.text, three.command.text].includes(card(2).talk.crazy.prompt.text));
  const publicView = adapters.letstalk.project(state(), { playerNum: 0 }, { now: clock });
  assert.equal(publicView.talk.crazy.prompt, null); assert.equal(publicView.talk.crazy.myQueuedCount, 0);
  assert.equal(publicView.talk.crazy.minSeconds, 5); assert.equal(publicView.talk.crazy.maxSeconds, 5);
  assert.equal(publicView.talk.conversationMode, 'assigned'); assert.equal(publicView.talk.crazy.source, 'players');
  const capsule = card(1).hubExecutor.capsule;
  await perform(3, 'newTopic', { confirm: true, topic: { question: 'What do funny socks dream about?' }, mode: 'think',
    seconds: 45, showStarters: false, gameMode: 'crazy', conversationMode: 'free', crazySource: 'mixed', crazyMinSeconds: 10, crazyMaxSeconds: 30 });
  assert.notEqual(card(1).hubExecutor.capsule, capsule); await assert.rejects(service.execute({ ...one, capsule }), /stale_session/);
  assert.deepEqual(state().crazy.prompts, {}); assert.deepEqual(state().crazy.queue, []); assert.equal(state().conversationMode, 'free');
});
