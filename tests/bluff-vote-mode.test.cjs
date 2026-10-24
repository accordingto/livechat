'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bluff-king-engine.js');

const bank = Array.from({ length: 40 }, (_, i) => ({ id: 'vote-' + i, canonicalKnowledgeId: 'vote-knowledge-' + i, locale: 'en', term: 'Vote topic ' + i, publicPrompt: 'What is this?', hintMode: 'none', publicHints: [], secretAnswer: 'SECRET_' + i, supportingFacts: ['One', 'Two'], revealExplanation: 'Test only.', sources: [{ title: 'Test', url: 'https://example.invalid/test' }], verificationStatus: 'verified', verifiedAt: '2026-10-25', enabled: true }));
let next = 0; let seq = 0;
const opts = (extra = {}) => ({ now: 1000, rng: n => (seq++ * 7) % n, uuid: () => 'generated-' + ++next, ...extra });
function setup(count = 4) { const s = E.blankStore(); E.applyCommand(s, 'identity-0', { room: 'VOTE', action: 'create', name: 'P0', participate: true }, bank, opts()); for (let i = 1; i < count; i++) E.applyCommand(s, 'identity-' + i, { room: 'VOTE', action: 'join', name: 'P' + i, participate: true }, bank, opts()); return s; }
function command(s, action, who = 'identity-0', data = {}, extra) { const room = s.rooms.VOTE; const input = { room: 'VOTE', action, commandId: 'command_' + String(++next).padStart(8, '0'), expectedVersion: room.version, roundId: room.round?.id, ...data }; E.applyCommand(s, who, input, bank, opts(extra)); return input; }
const who = (s, id) => s.rooms.VOTE.members.find(p => p.id === id).identityId;
function toDiscussion(s) { command(s, 'setMode', 'identity-0', { mode: 'vote' }); command(s, 'start'); command(s, 'confirmTopic'); command(s, 'beginDiscussion'); }
function speakAll(s) { const r = s.rooms.VOTE.round; while (!r.allCovered) command(s, 'nextSpotlight', who(s, r.spotlightOrder[r.spotlightIndex])); }
function toVote(s) { toDiscussion(s); speakAll(s); command(s, 'openVote'); }

test('a table starts in Thinker mode and lists both modes; the mode is a lobby choice that survives Play another game', () => {
  const s = setup(); const view = E.projectView(s, 'identity-1', 'VOTE', bank);
  assert.equal(view.mode, 'thinker'); assert.deepEqual(view.modes, ['thinker', 'vote']);
  assert.throws(() => command(s, 'setMode', 'identity-0', { mode: 'secret' }), e => e.code === 'invalid_mode');
  assert.throws(() => command(s, 'setMode', 'identity-1', { mode: 'vote' }), e => e.code === 'host_only');
  const first = command(s, 'setMode', 'identity-0', { mode: 'vote' }); const version = s.rooms.VOTE.version;
  E.applyCommand(s, 'identity-0', first, bank, opts()); assert.equal(s.rooms.VOTE.version, version, 'a retried mode command is a no-op');
  assert.throws(() => E.applyCommand(s, 'identity-0', { ...first, mode: 'thinker' }, bank, opts()), e => e.code === 'command_conflict');
  assert.equal(E.projectView(s, 'identity-2', 'VOTE', bank).mode, 'vote');
  command(s, 'start');
  assert.throws(() => command(s, 'setMode', 'identity-0', { mode: 'thinker' }), e => e.code === 'wrong_phase', 'the mode is fixed once the game starts');
  const room = s.rooms.VOTE; room.phase = 'results'; room.round = null; command(s, 'restart');
  assert.equal(room.phase, 'lobby'); assert.equal(room.mode, 'vote');
});

test('a vote round has no Thinker: every player speaks once in a random order, including the Truth Teller', () => {
  const s = setup(5); toDiscussion(s); const room = s.rooms.VOTE, r = room.round;
  assert.equal(r.mode, 'vote'); assert.equal(r.thinkerId, null);
  assert.ok(room.roster.includes(r.truthfulId));
  assert.equal(r.spotlightOrder.length, 5); assert.deepEqual([...r.spotlightOrder].sort(), [...room.roster].sort());
  const view = E.projectView(s, 'identity-0', 'VOTE', bank);
  assert.equal(view.round.mode, 'vote'); assert.equal(view.round.thinkerId, null);
  const roles = room.roster.map(id => E.projectView(s, who(s, id), 'VOTE', bank, { private: true }).privateCard.role);
  assert.equal(roles.filter(x => x === 'truthful').length, 1); assert.equal(roles.filter(x => x === 'bluffer').length, 4); assert.ok(!roles.includes('thinker'));
  assert.throws(() => command(s, 'challenge', 'identity-0', { targetId: room.roster[1] }), e => e.code === 'wrong_mode');
  assert.throws(() => command(s, 'identify', 'identity-0', { targetId: room.roster[1] }), e => e.code === 'wrong_mode');
  assert.throws(() => command(s, 'openVote'), e => e.code === 'spotlight_incomplete');
});

test('random speaking orders really vary between rounds', () => {
  const orders = new Set();
  for (let i = 0; i < 6; i++) { const s = setup(5); seq = i * 3; toDiscussion(s); orders.add(s.rooms.VOTE.round.spotlightOrder.map(id => s.rooms.VOTE.roster.indexOf(id)).join('')); }
  assert.ok(orders.size > 1);
});

test('the speaker taps I’m done; another player cannot skip them without host rights; the host can', () => {
  const s = setup(4); toDiscussion(s); const r = s.rooms.VOTE.round;
  const speaker = who(s, r.spotlightOrder[0]); const other = ['identity-1', 'identity-2', 'identity-3'].find(id => id !== speaker);
  assert.throws(() => command(s, 'nextSpotlight', other), e => e.code === 'host_only');
  command(s, 'nextSpotlight', speaker); assert.deepEqual(r.coveredIds, [r.spotlightOrder[0]]);
  command(s, 'nextSpotlight', 'identity-0'); assert.equal(r.coveredIds.length, 2, 'the host can move the Spotlight');
});

test('everyone votes in secret, nobody votes for themselves, votes can change, and the last vote reveals', () => {
  const s = setup(4); toVote(s); const room = s.rooms.VOTE, r = room.round; const truth = r.truthfulId;
  assert.equal(room.phase, 'vote');
  const [a, b, c, d] = room.roster; const bluffers = room.roster.filter(id => id !== truth);
  assert.throws(() => command(s, 'castVote', who(s, a), { targetId: a }), e => e.code === 'self_vote');
  assert.throws(() => command(s, 'castVote', who(s, a), { targetId: 'nobody' }), e => e.code === 'invalid_target');
  // First bluffer votes another bluffer, then changes to the Truth Teller.
  command(s, 'castVote', who(s, bluffers[0]), { targetId: bluffers[1] });
  command(s, 'castVote', who(s, bluffers[0]), { targetId: truth });
  assert.equal(r.votes[bluffers[0]], truth);
  const mine = E.projectView(s, who(s, bluffers[0]), 'VOTE', bank, { private: true });
  assert.equal(mine.round.myVoteId, truth); assert.deepEqual(mine.round.votedIds, [bluffers[0]]); assert.equal(mine.round.voterCount, 4);
  for (const id of [truth, bluffers[1]]) { const view = E.projectView(s, who(s, id), 'VOTE', bank, { private: true }); assert.equal(view.round.myVoteId, null); assert.ok(!JSON.stringify(view.round).includes('"votes"'), 'nobody sees other ballots before the reveal'); }
  assert.equal(E.projectView(s, 'identity-0', 'VOTE', bank).round.myVoteId, null, 'the public table never shows a ballot');
  command(s, 'castVote', who(s, bluffers[1]), { targetId: bluffers[2] });
  command(s, 'castVote', who(s, truth), { targetId: bluffers[2] });
  assert.equal(room.phase, 'vote');
  command(s, 'castVote', who(s, bluffers[2]), { targetId: truth });
  assert.equal(room.phase, 'reveal');
  // Two found the Truth Teller (+2 each); the Truth Teller earns +1 per finder; bluffers[2] got two votes (+1 each).
  const points = Object.fromEntries(Object.entries(r.result.delta).map(([id, x]) => [id, x.points]));
  assert.deepEqual(points, { [truth]: 2, [bluffers[0]]: 2, [bluffers[1]]: 0, [bluffers[2]]: 4 });
  assert.deepEqual(room.scores, points);
  const view = E.projectView(s, 'identity-0', 'VOTE', bank);
  assert.equal(view.round.reveal.truthfulId, truth); assert.equal(view.round.reveal.votes[bluffers[1]], bluffers[2]);
  assert.equal(view.round.reveal.roles[truth], 'truthful'); assert.ok(!Object.values(view.round.reveal.roles).includes('thinker'));
  assert.equal(view.history[0].mode, 'vote'); assert.equal(Object.keys(view.history[0].votes).length, 4);
  assert.throws(() => command(s, 'castVote', who(s, a), { targetId: b }), e => e.code === 'wrong_phase');
  void c; void d;
});

test('vote scoring: finders +2, Truth Teller +1 per finder, Bluffers +1 per vote; self votes never count', () => {
  const score = votes => Object.fromEntries(Object.entries(E.scoreVoteRound(['A', 'B', 'C', 'D'], 'B', votes).delta).map(([id, d]) => [id, d.points]));
  assert.deepEqual(score({ A: 'B', C: 'B', D: 'B', B: 'A' }), { A: 3, B: 3, C: 2, D: 2 });
  assert.deepEqual(score({ A: 'C', C: 'D', D: 'C', B: 'C' }), { A: 0, B: 0, C: 3, D: 1 });
  assert.deepEqual(score({ A: 'A', B: 'B', C: 'B' }), { A: 0, B: 1, C: 2, D: 0 });
  const result = E.scoreVoteRound(['A', 'B', 'C', 'D'], 'B', { A: 'B', C: 'D' });
  assert.deepEqual(result.foundIds, ['A']); assert.equal(result.voteCount, 2); assert.equal(result.correct, true);
  assert.deepEqual(result.delta.D.reasons, [{ points: 1, reason: 'bluff_votes', count: 1 }]);
});

test('a lead can reveal with the votes so far, but not before any vote', () => {
  const s = setup(4); toVote(s); const room = s.rooms.VOTE, r = room.round;
  assert.throws(() => command(s, 'closeVote'), e => e.code === 'no_votes');
  assert.throws(() => command(s, 'closeVote', 'identity-1'), e => e.code === 'host_only');
  const voter = room.roster.find(id => id !== r.truthfulId);
  command(s, 'castVote', who(s, voter), { targetId: r.truthfulId });
  command(s, 'closeVote');
  assert.equal(room.phase, 'reveal'); assert.equal(r.result.voteCount, 1);
});

test('the game runs one round per player, then shows the final scores', () => {
  const s = setup(3); command(s, 'setMode', 'identity-0', { mode: 'vote' }); command(s, 'start');
  for (let round = 0; round < 3; round++) {
    command(s, 'confirmTopic'); command(s, 'beginDiscussion'); speakAll(s); command(s, 'openVote');
    const room = s.rooms.VOTE; for (const id of room.roster) command(s, 'castVote', who(s, id), { targetId: id === room.round.truthfulId ? room.roster.find(x => x !== id) : room.round.truthfulId });
    assert.equal(room.phase, 'reveal'); command(s, 'nextRound');
  }
  assert.equal(s.rooms.VOTE.phase, 'results'); assert.equal(s.rooms.VOTE.history.length, 3);
});

test('shared tables: offline voters do not block the reveal, an offline Truth Teller needs recovery', () => {
  const s = setup(4); const room = s.rooms.VOTE; room.sharedControls = true; for (const p of room.members) p.lastSeen = 1000;
  toVote(s); const r = room.round; const all = [...room.roster]; const offline = all.find(id => id !== r.truthfulId);
  const online = all.filter(id => id !== offline);
  for (const id of online.slice(0, -1)) command(s, 'castVote', who(s, id), { targetId: id === r.truthfulId ? offline : r.truthfulId }, { onlinePlayerIds: online });
  assert.equal(room.phase, 'vote');
  const last = online.at(-1); command(s, 'castVote', who(s, last), { targetId: last === r.truthfulId ? offline : r.truthfulId }, { onlinePlayerIds: online });
  assert.equal(room.phase, 'reveal', 'the last connected vote reveals the truth');

  const t = setup(4); const room2 = t.rooms.VOTE; room2.sharedControls = true; for (const p of room2.members) p.lastSeen = 1000;
  toVote(t); const truth = room2.round.truthfulId; const rest = room2.roster.filter(id => id !== truth); const voter = rest[0];
  assert.throws(() => command(t, 'castVote', who(t, voter), { targetId: rest[1] }, { onlinePlayerIds: rest }), e => e.code === 'recovery_required');
  const before = room2.round.id; command(t, 'recover', who(t, voter), {}, { onlinePlayerIds: rest });
  assert.equal(room2.phase, 'topic_check'); assert.notEqual(room2.round.id, before); assert.ok(Object.values(room2.scores).every(x => x === 0), 'a replaced round scores nothing');
  const view = E.projectView(t, who(t, voter), 'VOTE', bank, { private: true }); assert.equal(view.recovery.available, true);
});

test('shared tables: recovery finishes a vote that only waits for a player who went offline', () => {
  const s = setup(4); const room = s.rooms.VOTE; room.sharedControls = true; for (const p of room.members) p.lastSeen = 1000;
  toVote(s); const r = room.round; const late = room.roster.find(id => id !== r.truthfulId); const others = room.roster.filter(id => id !== late);
  for (const id of others) command(s, 'castVote', who(s, id), { targetId: id === r.truthfulId ? late : r.truthfulId });
  assert.equal(room.phase, 'vote', 'everyone is still counted as connected');
  command(s, 'recover', who(s, others[0]), {}, { onlinePlayerIds: others });
  assert.equal(room.phase, 'reveal'); assert.equal(r.result.voteCount, 3);
});

test('a player who leaves during the vote loses their ballot, and votes for them must be cast again', () => {
  const s = setup(5); const room = s.rooms.VOTE; room.sharedControls = true; for (const p of room.members) { p.lastSeen = 1000; }
  room.members.forEach((p, i) => { p.playerNum = i + 1; });
  toVote(s); const r = room.round; const leaver = room.roster.find(id => id !== r.truthfulId); const others = room.roster.filter(id => id !== leaver);
  command(s, 'castVote', who(s, leaver), { targetId: r.truthfulId });
  const voterForLeaver = others.find(id => id !== r.truthfulId); command(s, 'castVote', who(s, voterForLeaver), { targetId: leaver });
  const leaverNum = room.members.find(p => p.id === leaver).playerNum;
  E.membership(s, { inactiveNums: [leaverNum] }, { code: 'VOTE', bank, now: 1000 });
  assert.equal(room.phase, 'vote'); assert.deepEqual(r.votes, {}, 'the leaver’s vote and the vote for the leaver are removed');
  for (const id of others) command(s, 'castVote', who(s, id), { targetId: id === r.truthfulId ? others.find(x => x !== id) : r.truthfulId });
  assert.equal(room.phase, 'reveal');
});

test('Thinker mode is unchanged: a Thinker is dealt, and vote commands are refused', () => {
  const s = setup(4); command(s, 'start'); command(s, 'confirmTopic'); command(s, 'beginDiscussion');
  const r = s.rooms.VOTE.round; assert.equal(r.mode, 'thinker'); assert.ok(r.thinkerId); assert.equal(r.spotlightOrder.length, 3);
  for (let i = 0; i < 3; i++) command(s, 'nextSpotlight', who(s, r.thinkerId));
  assert.throws(() => command(s, 'openVote'), e => e.code === 'wrong_mode');
  assert.equal(E.projectView(s, 'identity-0', 'VOTE', bank).round.votedIds, undefined);
});

test('a saved room without a mode keeps playing Thinker mode', () => {
  const s = setup(3); delete s.rooms.VOTE.mode; const view = E.projectView(s, 'identity-0', 'VOTE', bank);
  assert.equal(view.mode, 'thinker'); command(s, 'start'); assert.ok(s.rooms.VOTE.round.thinkerId);
});
