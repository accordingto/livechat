'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { adapters: A } = require('../runtime/story-executor.cjs');
const DX = require('../dixit-engine.js');
const ON = require('../once-upon-a-time-engine.js');
const OD = require('../once-upon-a-time-deck.js');
const TK = require('../talk-engine.js');
const OnceUI = require('../once-upon-a-time-ui.js');
const DixitUI = require('../dixit-ui.js');
const clone = value => JSON.parse(JSON.stringify(value));
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) }));
const topic = { id: 'safe-topic', question: 'Where would you live?', followUp: 'With whom?' };
let serial = 0;
const ctx = (actor = 2, extra = {}) => ({ code: 'TEST', now: 10000 + ++serial, seed: 2731 + serial,
  actor, seat: { playerNum: actor, token: 'secret-seat-token', path: 'secret/player/path' }, ...extra });
const act = (game, state, type, actor = 2, extra = {}, onlineNums) => A[game].apply(state,
  { id: 'request-' + ++serial, type, sessionId: state.sessionId, turnId: state.turnId, ...extra }, ctx(actor, { onlineNums }));
const dx = (count = 4, shared = true) => DX.create({ id: 'dixit-server', roster: roster(count), seed: 731, now: 1000, sharedControls: shared });
const once = (count = 4, shared = true) => ON.create({ id: 'once-server', roster: roster(count), seed: 731, now: 1000, sharedControls: shared });
const talk = (count = 4, shared = true, extra = {}) => TK.create({ id: 'talk-server', topic, roster: roster(count), now: 1000, sharedControls: shared, ...extra });
const dxStarted = () => act('dixit', dx(), 'deal', 3, { firstPlayerNum: 1 });
const onceStarted = (count = 4) => act('onceupon', act('onceupon', once(count), 'deal'), 'chooseFirst', 2, { playerNum: 1 });
function story(s) { return act('dixit', s, 'story', s.storyteller, { cardId: s.hands[s.storyteller][0], clueMode: 'spoken' }); }
function table(s) { s = story(s); for (const p of s.roster.filter(p => p.playerNum !== s.storyteller)) s = act('dixit', s, 'submit', p.playerNum, { cardIds: s.hands[p.playerNum].slice(0, s.roster.length === 3 ? 2 : 1) }); return s; }
function finish(s) {
  s = act('dixit', s, 'reveal', 2);
  return A.dixit.pulse(s, ctx(2, { now: s.revealPopularAt }));
}
function conserveDX(s) {
  const cards = [...DX.list(s.deck), ...DX.list(s.discard), ...s.roster.flatMap(p => DX.list(s.hands[p.playerNum])), ...s.roster.flatMap(p => DX.list(s.submissions[p.playerNum]))];
  assert.equal(cards.length, 84); assert.equal(new Set(cards).size, 84);
}
function conserveOnce(s) {
  const cards = [...ON.list(s.storyDeck), ...ON.list(s.storyDiscard), ...ON.list(s.storyHeld), ...s.roster.flatMap(p => ON.list(s.hands[p.playerNum]))];
  assert.equal(cards.length, OD.storyCards.length); assert.equal(new Set(cards).size, cards.length);
}
test('canonical envelope decoding and encoding preserve lease metadata and support legacy stateJson', () => {
  const state = dx(), raw = { state, revision: 7, owner: 'preserved', extra: { bootstrap: true } };
  const decoded = A.dixit.decode(raw); decoded.round = 11;
  assert.equal(raw.state.round, 0);
  const next = A.dixit.encode(raw, decoded); assert.equal(next.revision, 8); assert.equal(next.owner, raw.owner); assert.deepEqual(next.extra, raw.extra);
  const json = { stateJson: JSON.stringify(state), revision: 2, retained: true };
  assert.deepEqual(A.onceupon.decode(json), state);
  const wire = A.onceupon.encode(json, decoded); assert.equal(JSON.parse(wire.stateJson).round, 11); assert.equal(wire.retained, true); assert.equal(wire.state, undefined);
  assert.equal(A.letstalk.decode({ stateJson: '{broken' }), null);
});
test('server binds actor, now and seed, overriding a forged host actor and caller randomness', () => {
  const s = dx(), c = ctx(3, { now: 12345, seed: 55 });
  const input = { id: 'fixed', type: 'deal', actor: 0, now: 1, seed: 999, firstPlayerNum: 1 };
  const first = A.dixit.apply(s, input, c), second = A.dixit.apply(s, { ...input, actor: 8, seed: 2, now: 0 }, c);
  assert.deepEqual(first, second); assert.equal(first.replies[3].error, '');
  assert.equal(first.replies[0], undefined);
  assert.throws(() => A.dixit.apply(s, input, ctx(99)), /not_eligible/);
  assert.equal(A.dixit.apply(dx(4, false), input, ctx(3)).replies[3].error, 'not_available');
  assert.equal(A.dixit.apply(dx(4, false), input, ctx(0)).phase, 'CLUE');
});
test('server projections expose shared actions while retaining own-hand and spectator privacy', () => {
  const s = dxStarted(), c = ctx(3, { revision: 42, hostLiveUntil: 999999 });
  const mine = A.dixit.project(s, { playerNum: 3 }, c), publicView = A.dixit.project(s, 0, c);
  assert.equal(mine.dixit.hostControls, true); assert.equal(mine.dixit.actions.pause, true);
  assert.deepEqual(mine.dixit.hand, s.hands[3]); assert.equal(mine.dixit.revision, 42); assert.equal(mine.dixit.hostLiveUntil, 0);
  assert.equal(publicView.dixit.hand, undefined);
  const json = JSON.stringify(mine);
  assert.ok(!json.includes(c.seat.token)); assert.ok(!json.includes(c.seat.path));
  for (const p of s.roster.filter(p => p.playerNum !== 3)) for (const id of s.hands[p.playerNum]) assert.ok(!json.includes(JSON.stringify(id)));
  assert.equal(A.dixit.command({ dixitAction: { type: 'vote' } }).type, 'vote');
  assert.equal(A.onceupon.command({}), null);
});
test('Dixit recovery skips an absent decoy submitter, without changing their hand or awarding phantom points', () => {
  let s = story(dxStarted()); const absentHand = s.hands[4].slice();
  for (const n of [2, 3]) s = act('dixit', s, 'submit', n, { cardIds: [s.hands[n][0]] });
  assert.equal(s.phase, 'SUBMIT');
  s = act('dixit', s, 'recover', 2, { onlineNums: [4] }, [1, 2, 3]);
  assert.equal(s.phase, 'VOTE'); assert.deepEqual(s.hands[4], absentHand); assert.equal(s.submissions[4], undefined);
  assert.deepEqual(s.roundPlayerNums, [1, 2, 3]); conserveDX(s);
  for (const n of [2, 3]) s = act('dixit', s, 'vote', n, { cardId: s.submissions[1][0] });
  s = finish(s);
  assert.equal(s.lastRound.totalVoters, 2); assert.equal(s.votes[4], undefined);
  assert.equal(s.lastRound.rows.find(r => r.playerNum === 4).delta, 0); conserveDX(s);
});
test('Dixit recovery keeps an already displayed absent-player card, omits their missing vote and points', () => {
  let s = table(dxStarted()); const oldTable = s.table.slice(), absentCard = s.submissions[4][0];
  s = act('dixit', s, 'vote', 2, { cardId: absentCard });
  s = act('dixit', s, 'vote', 3, { cardId: s.submissions[1][0] });
  s = act('dixit', s, 'recover', 2, {}, [1, 2, 3]);
  assert.deepEqual(s.table, oldTable); assert.equal(s.votes[4], undefined);
  s = finish(s); const away = s.lastRound.rows.find(r => r.playerNum === 4);
  assert.equal(away.base, 0); assert.equal(away.bonus, 0); assert.equal(away.voteCardId, null); conserveDX(s);
});
test('Dixit preserves a real ballot already cast before a player disconnects', () => {
  let s = table(dxStarted());
  for (const n of [2, 3, 4]) s = act('dixit', s, 'vote', n, { cardId: s.submissions[1][0] });
  s = act('dixit', s, 'recover', 2, {}, [1, 2, 3]); s = finish(s);
  assert.equal(s.lastRound.totalVoters, 3); assert.equal(s.lastRound.correctCount, 3);
});
test('Dixit safely cancels an absent storyteller round, returning every submitted card without scoring', () => {
  let s = table(dxStarted()); const held = Object.fromEntries(s.roster.map(p => [p.playerNum, [...s.hands[p.playerNum], ...s.submissions[p.playerNum]].sort()]));
  s = act('dixit', s, 'recover', 3, {}, [2, 3, 4]);
  assert.equal(s.phase, 'CLUE'); assert.equal(s.storyteller, 2); assert.equal(s.round, 2);
  assert.equal(s.lastRound, null); assert.equal(s.roundNotice.type, 'round_skipped'); assert.deepEqual(s.scores, { 1: 0, 2: 0, 3: 0, 4: 0 });
  for (const p of s.roster) assert.deepEqual(s.hands[p.playerNum].slice().sort(), held[p.playerNum]);
  assert.equal(s.clue, ''); assert.equal(s.table.length, 0); conserveDX(s);
  assert.match(DixitUI.tableHTML(A.dixit.project(s, 3, ctx(3))), /round was not scored/);
});
test('Dixit waits below three online players and does not recover automatically from presence alone', () => {
  const s = story(dxStarted()), pulse = A.dixit.pulse(s, ctx(2, { onlineNums: [2] }));
  assert.equal(pulse, s);
  const next = act('dixit', s, 'recover', 2, {}, [2, 3]);
  assert.equal(next.replies[2].error, 'waiting_players'); assert.equal(next.round, s.round);
  assert.deepEqual(next.hands, s.hands); assert.deepEqual(next.submissions, s.submissions);
});
test('Dixit rejoining players enter the next round, while legacy artwork and target stay preserved', () => {
  let s = dxStarted(); s.artworkVersion = 1; s.targetScore = 100;
  s = story(s); for (const n of [2, 3]) s = act('dixit', s, 'submit', n, { cardIds: [s.hands[n][0]] });
  s = act('dixit', s, 'recover', 2, {}, [1, 2, 3]);
  const rejected = act('dixit', s, 'vote', 4, { cardId: s.submissions[1][0] });
  assert.equal(rejected.replies[4].error, 'not_available');
  for (const n of [2, 3]) s = act('dixit', s, 'vote', n, { cardId: s.submissions[1][0] });
  s = act('dixit', finish(s), 'nextRound', 3, {}, [1, 2, 3, 4]);
  assert.deepEqual(s.roundPlayerNums, [1, 2, 3, 4]); assert.equal(s.artworkVersion, 1); assert.equal(s.targetScore, 100); conserveDX(s);
});
test('Dixit timed pulse needs no browser lease and cannot leak answer or score before deadlines', () => {
  let s = table(dxStarted()); for (const n of [2, 3, 4]) s = act('dixit', s, 'vote', n, { cardId: s.submissions[1][0] });
  s = act('dixit', s, 'reveal', 3);
  assert.equal(A.dixit.pulse(s, ctx(2, { now: s.revealAnswerAt - 1 })), s);
  assert.equal(A.dixit.project(s, 2, ctx(2, { now: s.revealAnswerAt - 1 })).dixit.answerCardId, undefined);
  s = A.dixit.pulse(s, ctx(2, { now: s.revealAnswerAt })); assert.equal(s.revealStage, 'answer');
  assert.equal(A.dixit.project(s, 2, ctx(2, { now: s.revealAnswerAt })).dixit.result, null);
  const frozen = act('dixit', s, 'pause', 3); assert.equal(A.dixit.pulse(frozen, ctx(2, { now: s.revealPopularAt + 10000 })), frozen);
  const done = A.dixit.pulse(s, ctx(2, { now: s.revealPopularAt }));
  assert.equal(done.phase, 'REVEAL'); assert.equal(A.dixit.pulse(done, ctx(2)), done);
});
test('Once shared managers still play their private cards and see only their own ending', () => {
  const s = onceStarted(), p = A.onceupon.project(s, 1, ctx(1)), pub = A.onceupon.project(s, 0, ctx(0));
  assert.equal(p.once.actions.play, true); assert.equal(p.once.actions.cancel, true); assert.equal(p.once.hostControls, true);
  assert.equal(pub.once.hand, undefined); assert.equal(pub.once.ending, undefined);
  const html = OnceUI.tableHTML(p); assert.match(html, /data-once-card=/); assert.match(html, /data-once-action="cancel"/);
  assert.ok(!JSON.stringify(p).includes(JSON.stringify(s.endings[2])));
  assert.equal(act('onceupon', once(4, false), 'deal', 2).replies[2].error, 'not_available');
});
test('Once absent storyteller safely passes once with no invented discard, and duplicate recovery cannot draw again', () => {
  const start = onceStarted(), hand = start.hands[1].slice(), c = ctx(2, { onlineNums: [2, 3, 4] });
  const command = { id: 'recover-once', type: 'recover', sessionId: start.sessionId, turnId: start.turnId };
  const s = A.onceupon.apply(start, command, c);
  assert.equal(s.storyteller, 2); assert.equal(s.hands[1].length, hand.length + 1);
  assert.deepEqual(s.hands[1].slice(0, hand.length), hand); conserveOnce(s);
  assert.deepEqual(A.onceupon.apply(s, command, c), s);
});
test('Once absent pass-discard player keeps cards and does not receive a second pass draw', () => {
  const s = act('onceupon', onceStarted(), 'pass', 1), hand = s.hands[1].slice();
  const next = act('onceupon', s, 'recover', 2, {}, [2, 3, 4]);
  assert.equal(next.phase, 'STORYTELLING'); assert.equal(next.storyteller, 2); assert.deepEqual(next.hands[1], hand); conserveOnce(next);
});
test('Once missing eligible ballots abstain while online uncast votes still block recovery', () => {
  let s = act('onceupon', onceStarted(), 'challenge', 2);
  const pending = act('onceupon', s, 'recover', 3, {}, [1, 2, 3]);
  assert.equal(pending.replies[3].error, 'waiting_votes'); assert.equal(pending.vote.id, s.vote.id);
  s = act('onceupon', s, 'vote', 3, { voteId: s.vote.id, choice: 'lose' });
  s = act('onceupon', s, 'recover', 3, {}, [1, 2, 3]);
  assert.equal(s.phase, 'STORYTELLING'); assert.equal(s.storyteller, 1, 'one of two eligible votes is not a majority'); assert.equal(s.vote, null); conserveOnce(s);
});
test('Once social judgement remains explicit and a sole online player cannot silently pass', () => {
  let s = act('onceupon', onceStarted(2), 'challenge', 2);
  const noAgreement = act('onceupon', s, 'recover', 2, {}, [1, 2]);
  assert.equal(noAgreement.replies[2].error, 'social_agreement_required');
  s = act('onceupon', s, 'resolveSocial', 2, { voteId: s.vote.id, choice: 'continue' });
  assert.equal(s.phase, 'STORYTELLING');
  const waiting = act('onceupon', s, 'recover', 2, {}, [2]); assert.equal(waiting.replies[2].error, 'waiting_players');
  assert.equal(waiting.storyteller, 1); assert.deepEqual(waiting.hands, s.hands);
});
test('restarts preserve shared-control mode without publishing canonical secrets', () => {
  const ds = act('dixit', dxStarted(), 'restart', 3), os = act('onceupon', onceStarted(), 'restart', 3);
  assert.equal(ds.sharedControls, true); assert.equal(os.sharedControls, true);
  assert.equal(A.onceupon.project(os, 3, ctx(3)).once.actions.deal, true);
  assert.match(OnceUI.tableHTML(A.onceupon.project(os, 3, ctx(3))), /data-once-action="deal"/);
  assert.equal(A.dixit.project(ds, 99, ctx(3)).dixit.hostControls, false);
});
test('Talk thinking deadline auto-starts on the server, preserves readiness and waits for two players', () => {
  const s = talk(3), before = A.letstalk.pulse(s, ctx(2, { now: s.deadline - 1 }));
  assert.equal(before, s); assert.equal(A.letstalk.pulse(s, ctx(2, { now: s.deadline, onlineNums: [2] })), s);
  const ready = act('letstalk', s, 'ready', 3);
  const next = A.letstalk.pulse(ready, ctx(2, { now: s.deadline, onlineNums: [2, 3] }));
  assert.equal(next.phase, 'talking'); assert.equal(next.speaker, 3); assert.equal(next.remaining.includes(1), false);
  assert.equal(A.letstalk.pulse(next, ctx(2, { now: s.deadline + 1000 })), next);
});
test('Talk recovery removes an absent question and advances an absent speaker without claiming they spoke', () => {
  let s = act('letstalk', talk(3), 'start', 2);
  const current = s.speaker, others = s.roster.map(p => p.playerNum).filter(n => n !== current);
  s = act('letstalk', s, 'ask', others[0]); s = act('letstalk', s, 'invite', current, { target: s.questions[0].id });
  const returnFloor = act('letstalk', s, 'recover', current, {}, [current, others[1]]);
  assert.equal(returnFloor.activeQuestion, null); assert.equal(returnFloor.speaker, current); assert.equal(returnFloor.turnId, s.turnId);
  const next = act('letstalk', returnFloor, 'recover', others[1], {}, others);
  assert.notEqual(next.speaker, current); assert.equal(next.spoken.includes(current), false);
  assert.equal(act('letstalk', talk(3, false), 'start', 2).replies[2].error, 'not_available');
});
test('Crazy Talk server timer sends only each seat own prompt and shared managers remain normal players', () => {
  let s = act('letstalk', talk(3, true, { gameMode: 'crazy' }), 'start', 2);
  const due = s.crazy.nextAssignAt;
  s = A.letstalk.pulse(s, ctx(2, { now: due + 1 }));
  const num = s.roster.find(p => s.crazy.prompts[p.playerNum]?.status === 'pending').playerNum;
  const p = A.letstalk.project(s, num, ctx(num, { now: due + 1 })), pub = A.letstalk.project(s, 0, ctx(0, { now: due + 1 }));
  assert.equal(pub.talk.crazy.prompt, null); assert.ok(p.talk.crazy.prompt);
  assert.equal(p.talk.hostControls, true);
  assert.equal(p.talk.crazy.prompt.expiresAt - p.talk.crazy.prompt.at, 150000);
  s = A.letstalk.apply(s, { id: 'finish-private-prompt', type: 'crazyDone', sessionId: s.sessionId, turnId: s.turnId, promptId: p.talk.crazy.prompt.id }, ctx(num, { now: due + 2 }));
  assert.equal(s.replies[num].error, ''); assert.equal(s.scores[num], 1);
  assert.equal(A.letstalk.project(s, num, ctx(num, { now: due + 2 })).talk.scores.find(row => row.playerNum === num).score, 1);
  const paused = A.letstalk.apply(s, { id: 'pause-new-scheduler', type: 'crazyPause', sessionId: s.sessionId, turnId: s.turnId, paused: true }, ctx(2, { now: due + 3 }));
  assert.equal(A.letstalk.pulse(paused, ctx(2, { now: due + 1000 })), paused);
  const ended = A.letstalk.pulse(paused, ctx(2, { now: paused.gameDeadline }));
  assert.equal(ended.phase, 'ended'); assert.equal(ended.scores[num], 1);
  assert.equal(A.letstalk.project(ended, num, ctx(num, { now: ended.gameDeadline })).talk.actions.addTime, false);
});
