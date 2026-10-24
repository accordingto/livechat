'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bluff-king-engine.js');

const card = (deck, i) => ({ id: `${deck}-${i}`, canonicalKnowledgeId: `${deck}-knowledge-${i}`, ...(deck === 'classic' ? {} : { deck }), locale: 'en', term: `${deck} topic ${i}`, publicPrompt: 'What is this?', hintMode: 'none', publicHints: [], secretAnswer: `SECRET_${deck}_${i}`, supportingFacts: ['One', 'Two'], revealExplanation: 'Test only.', sources: [{ title: 'Test', url: 'https://example.invalid/test' }], verificationStatus: 'verified', verifiedAt: '2026-10-24', enabled: true });
const bank = [...Array.from({ length: 12 }, (_, i) => card('classic', i)), ...Array.from({ length: 8 }, (_, i) => card('halloween', i))];
let next = 0; const opts = { now: 1000, rng: () => 0, uuid: () => 'generated-' + ++next };
function setup(count = 3) { const s = E.blankStore(); E.applyCommand(s, 'identity-0', { room: 'PACK', action: 'create', name: 'P0', participate: true }, bank, opts); for (let i = 1; i < count; i++) E.applyCommand(s, 'identity-' + i, { room: 'PACK', action: 'join', name: 'P' + i, participate: true }, bank, opts); return s; }
function command(s, action, who = 'identity-0', data = {}) { const room = s.rooms.PACK; const input = { room: 'PACK', action, commandId: 'command_' + String(++next).padStart(8, '0'), expectedVersion: room.version, roundId: room.round?.id, ...data }; E.applyCommand(s, who, input, bank, opts); return input; }

test('a new table starts on the classic pack and lists every pack with its size', () => {
  const s = setup();
  const view = E.projectView(s, 'identity-0', 'PACK', bank);
  assert.equal(view.deck, 'classic');
  assert.deepEqual(view.decks, [{ id: 'classic', count: 12 }, { id: 'halloween', count: 8 }, { id: 'mixed', count: 20 }]);
  assert.equal(view.availability.totalVerified, 12);
  command(s, 'start');
  assert.match(s.rooms.PACK.round.questionId, /^classic-/);
  assert.equal(E.projectView(s, 'identity-0', 'PACK', bank).round.topic.deck, 'classic');
});

test('the host picks the Halloween pack in the waiting room and every round draws from it', () => {
  const s = setup();
  command(s, 'setDeck', 'identity-0', { deck: 'halloween' });
  assert.equal(s.rooms.PACK.deck, 'halloween');
  const lobby = E.projectView(s, 'identity-1', 'PACK', bank);
  assert.equal(lobby.deck, 'halloween'); assert.equal(lobby.availability.totalVerified, 8); assert.equal(lobby.availability.remaining, 8);
  command(s, 'start');
  for (let round = 0; round < 3; round++) {
    const room = s.rooms.PACK; assert.match(room.round.questionId, /^halloween-/);
    assert.equal(E.projectView(s, 'identity-0', 'PACK', bank).round.topic.deck, 'halloween');
    command(s, 'replaceTopic');
  }
  assert.throws(() => command(s, 'setDeck', 'identity-0', { deck: 'classic' }), e => e.code === 'wrong_phase', 'the pack is fixed once a circle starts');
});

test('a mixed table can draw from both packs, and the pack survives Play another game', () => {
  const s = setup();
  command(s, 'setDeck', 'identity-0', { deck: 'mixed' });
  const pool = E.availableQuestions(s, s.rooms.PACK, bank);
  assert.equal(pool.length, 20);
  assert.ok(pool.some(q => q.deck === 'halloween') && pool.some(q => !q.deck));
  const room = s.rooms.PACK; room.phase = 'results'; room.round = null;
  command(s, 'restart');
  assert.equal(room.phase, 'lobby'); assert.equal(room.deck, 'mixed');
});

test('pack choices reject unknown packs, non-managers and duplicates without changing anything', () => {
  const s = setup();
  assert.throws(() => command(s, 'setDeck', 'identity-0', { deck: 'secret' }), e => e.code === 'invalid_deck');
  assert.throws(() => command(s, 'setDeck', 'identity-1', { deck: 'halloween' }), e => e.code === 'host_only');
  assert.equal(s.rooms.PACK.deck, 'classic');
  const first = command(s, 'setDeck', 'identity-0', { deck: 'halloween' }); const version = s.rooms.PACK.version;
  E.applyCommand(s, 'identity-0', first, bank, opts); assert.equal(s.rooms.PACK.version, version, 'a retried pack command is a no-op');
  assert.throws(() => E.applyCommand(s, 'identity-0', { ...first, deck: 'classic' }, bank, opts), e => e.code === 'command_conflict');
});

test('shared-control players may pick the pack, and a saved room without a pack keeps playing classic', () => {
  const s = setup(); const room = s.rooms.PACK; room.sharedControls = true;
  for (const p of room.members) p.lastSeen = opts.now;
  command(s, 'setDeck', 'identity-2', { deck: 'halloween' }); assert.equal(room.deck, 'halloween');
  delete room.deck;
  const view = E.projectView(s, 'identity-0', 'PACK', bank);
  assert.equal(view.deck, 'classic'); assert.equal(view.availability.totalVerified, 12);
  command(s, 'start'); assert.match(room.round.questionId, /^classic-/);
});

test('a bank with one pack offers no pack choice and keeps the original totals', () => {
  const classic = bank.filter(q => !q.deck);
  assert.deepEqual(E.deckSummary(classic), [{ id: 'classic', count: 12 }]);
  const s = E.blankStore(); E.applyCommand(s, 'identity-0', { room: 'SOLO', action: 'create', name: 'P0' }, classic, opts);
  assert.throws(() => E.applyCommand(s, 'identity-0', { room: 'SOLO', action: 'setDeck', deck: 'halloween', commandId: 'command_solo_00001', expectedVersion: s.rooms.SOLO.version }, classic, opts), e => e.code === 'invalid_deck');
  assert.equal(E.projectView(s, 'identity-0', 'SOLO', classic).availability.totalVerified, 12);
});

test('Halloween answers stay out of public and other-seat projections', () => {
  const s = setup(); command(s, 'setDeck', 'identity-0', { deck: 'halloween' }); command(s, 'start'); command(s, 'confirmTopic');
  const room = s.rooms.PACK; const truthful = room.members.find(p => p.id === room.round.truthfulId);
  for (const p of room.members.filter(p => p.id !== room.round.truthfulId)) assert.doesNotMatch(JSON.stringify(E.projectView(s, p.identityId, 'PACK', bank, { private: true })), /SECRET_/);
  assert.match(E.projectView(s, truthful.identityId, 'PACK', bank, { private: true }).privateCard.secretAnswer, /^SECRET_halloween_/);
});
