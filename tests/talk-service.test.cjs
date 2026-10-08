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
    mode: 'write', seconds: 30, gameMode: 'crazy', crazySeconds: 60, showStarters: true });
  assert.equal(db.conflicts, 1); assert.notEqual(state().sessionId, originalSession); assert.equal(state().sharedControls, true);
  assert.equal(state().deadline, 32000); assert.equal(state().mode, 'write'); assert.equal(state().crazy.intervalSeconds, 60);
  const capsule = card(2).hubExecutor.capsule; assert.notEqual(capsule, oldCapsule);
  for (const seat of seats) { assert.equal(card(seat.playerNum).hubExecutor.capsule, capsule); assert.equal(card(seat.playerNum).talk.sessionId, state().sessionId); assert.equal(card(seat.playerNum).talk.actions.newTopic, true); }
  await assert.rejects(service.execute({ capsule: oldCapsule, token: seats[1].token, command: { id: 'obsolete', type: 'start', sessionId: originalSession, turnId: turn } }), /stale_session/);
  await perform(1, 'start'); await perform(3, 'crazySend');
  const publicView = adapters.letstalk.project(state(), { playerNum: 0 }, { now: clock });
  assert.equal(publicView.talk.crazy.prompt, null); assert.equal(publicView.talk.hostControls, false);
  for (const seat of seats) {
    assert.ok(card(seat.playerNum).talk.crazy.prompt); assert.equal(card(seat.playerNum).talk.crazy.prompts, undefined);
    const serialized = JSON.stringify(card(seat.playerNum)); assert.ok(!serialized.includes(controlToken));
    for (const other of seats.filter(p => p !== seat)) assert.ok(!serialized.includes(other.token));
  }
  assert.ok(requests.every(body => body.token !== controlToken && !Object.hasOwn(body, 'controlToken')));
});
