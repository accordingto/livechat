// Mode 2 · Jump In: one Main Speaker per round with free interruptions.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../cut-engine.js');
const UI = require('../cut-ui.js');
const C = require('../cut-config.js');
const T = require('../cut-topics.js');
const J = require('../cut-jump-topics.js');
let serial = 0;
const create = (count = 4, extra = {}) => E.create({ id: 'jump-session', now: 1000, seed: 4242, mode: 'jump',
  roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })), ...extra });
const act = (s, type, extra = {}) => E.apply(s, { id: 'jump-command-' + ++serial, sessionId: s.sessionId, turnId: s.turnId,
  seed: serial * 977, now: s.lastChangeAt + 1, actor: 0, type, ...extra });
const due = s => s.phase === 'speaking' ? s.deadline : s.phaseUntil;
const tick = s => act(s, 'tick', { now: due(s) });
const speaking = (count = 4, extra = {}) => tick(act(create(count, extra), 'begin'));
const error = (s, actor = 0) => s.replies?.[actor]?.error || '';

test('a round counts only the Main Speaker\'s talking time and ends when it is used up', () => {
  let s = speaking(), spoken = 0, cuts = 0; const main = s.speaker, firstCut = s.deadline - s.lastChangeAt;
  assert.equal(s.phase, 'speaking'); assert.ok(firstCut >= 25000 && firstCut <= 45000);
  for (let guard = 0; guard < 60 && s.phase !== 'timeup'; guard++) {
    if (s.phase === 'speaking') { spoken += due(s) - s.lastChangeAt; s = tick(s); }
    else if (s.phase === 'interrupt') {
      cuts++; assert.notEqual(s.interrupter, main); assert.equal(s.speaker, main);
      assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null); assert.equal(s.mainClock.runningSince, null);
      const frozen = s.mainClock.elapsedMs;
      assert.equal(E.apply(s, { id: 'idle-' + guard, type: 'tick', actor: 0, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 600000, seed: 1 }), s);
      s = act(s, cuts % 2 ? 'done' : 'skip', { now: s.lastChangeAt + 90000 });
      assert.equal(s.phase, 'back'); assert.equal(s.mainClock.elapsedMs, frozen); assert.equal(s.interrupter, null);
    } else { assert.equal(s.phase, 'back'); assert.equal(s.phaseUntil - s.lastChangeAt, C.jump.backMs); s = tick(s); }
  }
  assert.equal(s.phase, 'timeup'); assert.equal(spoken, 4 * 60000); assert.ok(cuts >= 3 && cuts <= 7);
  assert.equal(s.speaker, main); assert.equal(s.deadline, null); assert.equal(s.mainClock.runningSince, null);
  assert.equal(E.apply(s, { id: 'no-auto-end', type: 'tick', actor: 0, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 3600000, seed: 1 }), s, 'time alone never ends the topic');
  s = act(s, 'endTopic'); assert.equal(s.phase, 'break'); assert.equal(s.roundEnd, 'ended'); assert.equal(s.previousSpeaker, main);
  s = act(s, 'next'); assert.equal(s.phase, 'ready'); assert.notEqual(s.speaker, main);
  assert.ok(J.items.some(topic => topic.id === s.topic.id));
});

test('only the interrupter or the host may finish a legacy interruption, and views hide private timing', () => {
  let s = tick(speaking()); assert.equal(s.phase, 'interrupt');
  const guest = s.interrupter, other = [1, 2, 3, 4].find(n => n !== guest && n !== s.speaker);
  assert.equal(error(act(s, 'done', { actor: other }), other), 'not_available');
  assert.equal(error(act(s, 'begin', { actor: guest }), guest), 'not_available');
  const view = E.view(s, guest, s.lastChangeAt).cut;
  assert.equal(view.mode, 'jump'); assert.equal(view.interrupter, guest); assert.equal(view.canFinish, true);
  assert.equal(E.view(s, other, s.lastChangeAt).cut.canFinish, false);
  for (const hidden of ['deadline', 'lastStretch', 'speakingDurationMs', 'mainStats', 'interruptStats', 'interruptRecent']) assert.equal(hidden in view, false);
  s = act(s, 'skip', { actor: guest }); assert.equal(error(s, guest), ''); assert.equal(s.phase, 'back');
  const talking = E.view(tick(s), 1, 0).cut;
  assert.equal(talking.phase, 'speaking'); assert.equal('deadline' in talking, false); assert.ok(Number.isFinite(talking.mainClock.runningSince));
});

test('the two modes keep separate pools and switching in settings opens a fresh topic', () => {
  assert.equal(J.items.length, 80); assert.equal(new Set(J.items.map(topic => topic.id)).size, 80);
  assert.ok(J.items.every(topic => !T.items.some(old => old.id === topic.id || old.question === topic.question)));
  let s = E.create({ id: 'switch', now: 1000, seed: 5, roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'P' + playerNum })) });
  assert.equal(E.view(s, 0, 0).cut.mode, 'classic'); assert.ok(T.items.some(topic => topic.id === s.topic.id));
  s = act(act(s, 'settings'), 'configure', { mode: 'jump', mainMinutes: 3 });
  assert.equal(error(s), ''); assert.equal(s.mode, 'jump'); assert.equal(s.phase, 'ready'); assert.equal(s.deadline, null);
  assert.ok(J.items.some(topic => topic.id === s.topic.id)); assert.equal(s.mainClock.durationMs, 180000);
  s = tick(act(s, 'begin')); assert.equal(s.phase, 'speaking');
  s = act(act(s, 'settings'), 'configure', { mode: 'classic' });
  assert.equal(s.mode, 'classic'); assert.equal(s.phase, 'ready'); assert.equal(s.deadline, null); assert.equal(s.interrupter, null);
  assert.ok(T.items.some(topic => topic.id === s.topic.id));
  assert.equal(error(act(act(s, 'settings'), 'configure', { mode: 'other' })), 'invalid_options');
});

const playRound = (state, finish = 'done') => {
  const log = { main: state.speaker, cuts: [], guests: [], spoken: 0 };
  let s = tick(act(state, 'begin'));
  for (let guard = 0; guard < 80 && s.phase !== 'timeup'; guard++) {
    if (s.phase === 'speaking') {
      log.spoken += due(s) - s.lastChangeAt; s = tick(s);
      if (s.phase === 'interrupt') { log.cuts.push(log.spoken / 1000); log.guests.push(s.interrupter); }
    } else if (s.phase === 'interrupt') s = act(s, finish, { now: s.lastChangeAt + 7000 });
    else s = tick(s);
  }
  assert.equal(s.phase, 'timeup');
  return { state: act(s, 'endTopic'), log };
};

test('CUT gaps are random inside their range and a four-minute round has about four to six of them', () => {
  assert.deepEqual(C.jump.mainMinutes, { options: [3, 4, 5], default: 4 });
  const counts = [], firsts = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const { log } = playRound(create(4, { seed }));
    assert.equal(log.spoken, 240000);
    assert.ok(log.cuts[0] >= C.jump.firstCut.minSeconds && log.cuts[0] <= C.jump.firstCut.maxSeconds);
    for (let i = 1; i < log.cuts.length; i++) {
      const gap = log.cuts[i] - log.cuts[i - 1];
      assert.ok(gap >= C.jump.cutInterval.minSeconds && gap <= C.jump.cutInterval.maxSeconds);
    }
    assert.ok(240 - log.cuts.at(-1) >= C.jump.quietEndSeconds);
    assert.ok(log.cuts.length >= 3 && log.cuts.length <= 7);
    counts.push(log.cuts.length); firsts.add(Math.round(log.cuts[0]));
  }
  const average = counts.reduce((sum, n) => sum + n, 0) / counts.length;
  assert.ok(average >= 4 && average <= 6); assert.ok(firsts.size >= 12, 'the first CUT is not on a fixed second');
  for (const [minutes, low, high] of [[3, 3, 5], [5, 5, 8]]) {
    const { log } = playRound(create(4, { mainMinutes: minutes }));
    assert.equal(log.spoken, minutes * 60000); assert.ok(log.cuts.length >= low && log.cuts.length <= high);
  }
  assert.throws(() => create(4, { mainMinutes: 7 }), /invalid_options/);
});

test('everyone leads one round before anyone repeats, and interruptions stay balanced without a fixed order', () => {
  let s = create(5, { seed: 77 }); const mains = [], picks = {}, orders = new Set();
  for (let round = 0; round < 15; round++) {
    const played = playRound(s, round % 2 ? 'skip' : 'done'); mains.push(played.log.main);
    for (const guest of played.log.guests) { assert.notEqual(guest, played.log.main); picks[guest] = (picks[guest] || 0) + 1; }
    orders.add(played.log.guests.join(','));
    s = act(played.state, 'next');
  }
  for (const start of [0, 5, 10]) assert.deepEqual(mains.slice(start, start + 5).sort(), [1, 2, 3, 4, 5]);
  mains.forEach((main, i) => { if (i) assert.notEqual(main, mains[i - 1]); });
  const totals = [1, 2, 3, 4, 5].map(n => picks[n] || 0);
  assert.ok(Math.max(...totals) - Math.min(...totals) <= 5, 'SKIP counts like DONE, so nobody is asked far more often');
  assert.ok(orders.size >= 10);
  const openings = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    let t = create(4, { seed }); const cycle = [];
    for (let round = 0; round < 4; round++) { cycle.push(t.speaker); t = act(act(tick(act(t, 'begin')), 'endTopic'), 'next'); }
    assert.deepEqual([...cycle].sort(), [1, 2, 3, 4]); openings.add(cycle.join(''));
  }
  assert.ok(openings.size >= 5);
});

test('players can add time, and a finished clock waits for them instead of ending the topic', () => {
  let s = speaking(3); const main = s.speaker, other = [1, 2, 3].find(n => n !== main), cutAt = s.deadline;
  assert.equal(E.view(s, other, s.lastChangeAt).cut.canExtend, true); assert.equal(E.view(s, other, 0).cut.extendMinutes, 1);
  s = act(s, 'extend', { actor: other, now: s.lastChangeAt + 5000 });
  assert.equal(error(s, other), ''); assert.equal(s.phase, 'speaking'); assert.equal(s.mainClock.durationMs, 300000);
  assert.equal(s.deadline, cutAt, 'adding time does not move or reveal the pending CUT');
  s = tick(s); assert.equal(s.phase, 'interrupt');
  s = act(s, 'extend'); assert.equal(s.phase, 'interrupt'); assert.equal(s.mainClock.durationMs, 360000);
  let last = speaking(3, { mainMinutes: 3 });
  for (let guard = 0; guard < 40 && !last.lastStretch; guard++) last = last.phase === 'interrupt' ? act(last, 'done') : tick(last);
  assert.equal(last.phase, 'speaking'); assert.equal(last.lastStretch, true);
  const stretched = act(last, 'extend', { now: last.lastChangeAt + 1000 });
  assert.ok(stretched.deadline > last.lastChangeAt + 1000); assert.equal(stretched.mainClock.durationMs, 240000);
  let up = tick(last); assert.equal(up.phase, 'timeup');
  const view = E.view(up, other, up.lastChangeAt).cut;
  assert.equal(view.canExtend, true); assert.equal(view.canEndTopic, false, 'a legacy player cannot end it alone'); assert.equal(E.view(up, 0, 0).cut.canEndTopic, true);
  assert.match(UI.scene(view, other, up.lastChangeAt), new RegExp(UI.t('jumpTimeUp') + '.*data-cut-action="extend"', 's'));
  assert.equal(error(act(up, 'done')), 'not_available'); assert.equal(error(act(up, 'begin')), 'not_available');
  const resumed = act(act(up, 'pause'), 'resume'); assert.equal(resumed.phase, 'timeup');
  up = act(up, 'extend', { actor: other }); assert.equal(up.phase, 'back'); assert.equal(up.speaker, last.speaker);
  up = tick(up); assert.equal(up.phase, 'speaking'); assert.equal(up.deadline - up.lastChangeAt, 60000);
  assert.equal(up.mainStats[up.speaker].count, 1);
  let capped = speaking(3);
  for (let i = 0; i < C.jump.maxExtraMinutes; i++) capped = act(capped, 'extend');
  assert.equal(error(act(capped, 'extend')), 'not_available'); assert.equal(E.view(capped, 0, 0).cut.canExtend, false);
  const next = act(act(capped, 'endTopic'), 'next'); assert.equal(next.mainClock.durationMs, 240000, 'extra time belongs to one round');
  const classic = E.create({ id: 'c', now: 1000, seed: 2, roster: [1, 2].map(playerNum => ({ playerNum, name: 'P' })) });
  assert.equal(error(act(classic, 'extend')), 'not_available');
});

test('Pause freezes the Main Speaker clock and resume keeps the pending CUT private', () => {
  let s = speaking(); const main = s.speaker, pending = s.deadline - s.lastChangeAt;
  s = act(s, 'pause', { now: s.lastChangeAt + 10000 });
  assert.equal(s.phase, 'paused'); assert.equal(s.mainClock.elapsedMs, 10000);
  assert.equal(s.mainClock.runningSince, null); assert.equal(s.deadline, null);
  s = act(s, 'resume', { now: s.lastChangeAt + 60000 });
  assert.equal(s.phase, 'back'); assert.equal(s.speaker, main); assert.equal(s.mainClock.elapsedMs, 10000);
  assert.equal('pendingDurationMs' in E.view(s, main, s.lastChangeAt).cut, false);
  s = tick(s);
  assert.equal(s.phase, 'speaking'); assert.equal(s.deadline - s.lastChangeAt, pending - 10000);
  assert.equal(s.mainStats[main].count, 1, 'resuming is not another round');
  s = tick(s); const guest = s.interrupter;
  s = act(act(s, 'pause'), 'resume', { now: s.lastChangeAt + 5000 });
  assert.equal(s.phase, 'interrupt'); assert.equal(s.interrupter, guest);
  assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null);
  let late = speaking(); late = act(late, 'pause', { now: late.deadline - 500 });
  late = tick(act(late, 'resume'));
  assert.equal(late.deadline - late.lastChangeAt, C.jump.resumeQuietSeconds * 1000, 'no CUT lands the instant play resumes');
});

test('settings freeze a round, keep its speaker and used time, and a shorter length can end it', () => {
  let s = speaking(4, { mainMinutes: 5 }); const main = s.speaker, topic = s.topic.id;
  s = act(s, 'settings', { now: s.lastChangeAt + 20000 });
  assert.equal(s.phase, 'setup'); assert.equal(s.deadline, null); assert.equal(s.mainClock.elapsedMs, 20000);
  assert.equal(error(act(s, 'begin')), 'not_available');
  assert.equal(error(act(s, 'configure', { mainMinutes: 7 })), 'invalid_options');
  s = act(s, 'configure', { mainMinutes: 3 });
  assert.equal(s.phase, 'ready'); assert.equal(s.speaker, main); assert.equal(s.topic.id, topic);
  assert.deepEqual(s.mainClock, { durationMs: 180000, elapsedMs: 20000, runningSince: null });
  s = tick(act(s, 'begin'));
  assert.equal(s.phase, 'speaking'); assert.equal(s.mainStats[main].count, 1);
  const gap = s.deadline - s.lastChangeAt;
  assert.ok(gap >= C.jump.cutInterval.minSeconds * 1000 && gap <= C.jump.cutInterval.maxSeconds * 1000);
  s = tick(s); assert.equal(s.phase, 'interrupt');
  s = act(s, 'settings'); assert.equal(s.interrupter, null); assert.equal(s.cutEvent, null);
  s = act(s, 'cancelSettings'); assert.equal(s.phase, 'ready'); assert.equal(s.speaker, main);
  let over = act(playRound(create()).state, 'settings');
  over = act(over, 'cancelSettings'); assert.equal(over.phase, 'break', 'a finished round stays finished');
});

test('a Main Speaker who leaves ends the round, and a missing interrupter is replaced', () => {
  let s = speaking(); const main = s.speaker;
  const left = act(s, 'exclude', { playerNum: main, active: false });
  assert.equal(left.phase, 'break'); assert.equal(left.roundEnd, 'none');
  assert.equal(left.speaker, null); assert.equal(left.deadline, null); assert.equal(left.mainClock.runningSince, null);
  s = tick(s); const guest = s.interrupter;
  const replaced = act(s, 'exclude', { playerNum: guest, active: false });
  assert.equal(replaced.phase, 'interrupt'); assert.notEqual(replaced.interrupter, guest); assert.notEqual(replaced.interrupter, main);
  assert.equal(replaced.cutEvent.to, replaced.interrupter); assert.equal(replaced.cutEvent.id, s.cutEvent.id);
  let ready = create(); const first = ready.speaker;
  ready = act(ready, 'exclude', { playerNum: first, active: false });
  assert.equal(ready.phase, 'ready'); assert.notEqual(ready.speaker, first); assert.equal(ready.mainClock.elapsedMs, 0);
  let two = tick(speaking(2)); const other = two.interrupter;
  two = act(two, 'exclude', { playerNum: other, active: false });
  assert.equal(two.phase, 'paused'); assert.equal(two.pauseReason, 'not_enough_players');
  assert.equal(error(act(two, 'resume')), 'not_enough_players');
  two = act(act(two, 'exclude', { playerNum: other, active: true }), 'resume');
  assert.equal(two.phase, 'interrupt'); assert.equal(two.interrupter, other);
  const stopped = act(tick(speaking()), 'stop');
  assert.equal(stopped.phase, 'stopped'); assert.equal(stopped.interrupter, null); assert.equal(stopped.deadline, null);
  assert.equal(E.apply(stopped, { id: 'late-tick', type: 'tick', actor: 0, sessionId: stopped.sessionId, turnId: stopped.turnId, now: 9e9, seed: 1 }), stopped);
});

test('a seat that joins or returns starts level with the table instead of being picked to catch up', () => {
  let s = create(3);
  for (let round = 0; round < 3; round++) s = act(playRound(s).state, 'next');
  assert.deepEqual([1, 2, 3].map(n => s.mainStats[n].count), [1, 1, 1]);
  const least = Math.min(...[1, 2, 3].map(n => s.interruptStats[n]?.count || 0));
  const joined = E.membership(s, { added: [{ playerNum: 4, name: 'New' }] }, { now: s.lastChangeAt + 1, id: 'join', seed: 4 });
  assert.equal(joined.roster.length, 4); assert.equal(joined.phase, 'ready'); assert.equal(joined.speaker, s.speaker);
  assert.equal(joined.mainStats[4].count, 1); assert.ok(least > 0); assert.equal(joined.interruptStats[4].count, least);
  let away = act(create(4), 'exclude', { playerNum: 4, active: false });
  for (let round = 0; round < 3; round++) away = act(playRound(away).state, 'next');
  const back = act(away, 'exclude', { playerNum: 4, active: true });
  assert.equal(back.mainStats[4].count, 1);
  assert.ok(back.interruptStats[4].count >= Math.min(...[1, 2, 3].map(n => back.interruptStats[n]?.count || 0)));
});

test('a saved game from before modes stays Mode 1 and never draws from the Mode 2 pool', () => {
  let legacy = E.create({ id: 'legacy', now: 1000, seed: 9, roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'P' + playerNum })) });
  for (const key of ['mode', 'mainMinutes', 'mainClock', 'interrupter', 'roundEnd', 'lastStretch', 'jumpTopicHistory', 'mainStats', 'interruptStats', 'interruptRecent', 'interruptSequence']) delete legacy[key];
  const view = E.view(legacy, 1, 1000).cut;
  assert.equal(view.mode, 'classic'); assert.equal(view.mainMinutes, 4); assert.deepEqual(view.mainOptions, [3, 4, 5]);
  for (const key of ['mainClock', 'interrupter', 'canFinish', 'roundEnd']) assert.equal(key in view, false);
  const topic = legacy.topic.id;
  let s = act(act(legacy, 'settings'), 'configure', { mode: 'classic', speed: 'chill' });
  assert.equal(s.phase, 'ready'); assert.equal(s.topic.id, topic); assert.equal(s.speed, 'chill'); assert.equal(s.mode, undefined);
  assert.equal(error(act(s, 'done')), 'not_available'); assert.equal(error(act(s, 'skip')), 'not_available');
  s = tick(tick(act(s, 'begin'))); assert.equal(s.phase, 'cut'); assert.equal(s.interrupter, undefined);
  for (let round = 0; round < 30; round++) { s = act(act(s, 'endTopic'), 'next'); assert.ok(T.items.some(item => item.id === s.topic.id)); }
});

test('the Mode 2 pool is 80 open questions in simple English across five kinds', () => {
  const kinds = {};
  for (const topic of J.items) {
    kinds[topic.category] = (kinds[topic.category] || 0) + 1;
    assert.match(topic.id, /^jump-[a-z]+-\d\d$/); assert.equal('starter' in topic, false);
    assert.ok(topic.question.length <= 120, topic.question); assert.match(topic.question, /[.?]$/);
    assert.doesNotMatch(topic.question, /[<>]/); assert.ok(topic.question.split(' ').length >= 8, 'not a one-word question: ' + topic.question);
  }
  assert.deepEqual(kinds, { stories: 20, self: 15, opinions: 15, whatif: 16, group: 14 });
  assert.deepEqual(Object.keys(C.jump.topicWeights).sort(), J.categories.filter(kind => kind !== 'mixed').sort());
  let s = create(4, { seed: 3 }); const seen = new Set();
  for (let round = 0; round < C.jump.topicHistorySize; round++) { assert.equal(seen.has(s.topic.id), false); seen.add(s.topic.id); s = act(act(s, 'endTopic'), 'next'); }
  const library = UI.topicLibrary(J.items, 'whatif', 'animals');
  assert.equal(library.count, 1); assert.equal(library.total, 80); assert.doesNotMatch(library.html, /cut-library-starter/);
});

const { adapters: { cut: adapter } } = require('../runtime/party-executor.cjs');
const ctx = (state, playerNum, extra = {}) => ({ code: 'JUMP', actor: playerNum, seat: { playerNum }, now: state.lastChangeAt + 1, seed: 77, revision: 3, hostLiveUntil: 10, ...extra });
const command = (state, type, extra = {}) => ({ id: 'jump-shared-' + ++serial, type, sessionId: state.sessionId, turnId: state.turnId, ...extra });

test('the independent service runs Mode 2 clocks and lets any shared player hand the floor back', () => {
  let s = create(3);
  s = adapter.apply(s, command(s, 'begin'), ctx(s, 2));
  assert.equal(s.phase, 'countdown'); assert.equal(s.sharedControls, true);
  s = adapter.pulse(s, ctx(s, 1, { now: s.phaseUntil }));
  assert.equal(s.phase, 'speaking');
  assert.equal(adapter.pulse(s, ctx(s, 1, { now: s.deadline - 1 })), s, 'an early pulse writes nothing');
  s = adapter.pulse(s, ctx(s, 1, { now: s.deadline }));
  assert.equal(s.phase, 'interrupt');
  assert.equal(adapter.pulse(s, ctx(s, 1, { now: s.lastChangeAt + 3600000 })), s, 'an interruption never times out');
  const guest = s.interrupter, other = [1, 2, 3].find(n => n !== guest && n !== s.speaker);
  for (const seat of [1, 2, 3]) {
    const view = adapter.project(s, { playerNum: seat }, ctx(s, seat)).cut;
    assert.equal(view.canFinish, true); assert.equal(view.interrupter, guest);
    for (const hidden of ['deadline', 'lastStretch', 'speakingDurationMs', 'previousDurationMs', 'mainStats', 'interruptStats']) assert.equal(hidden in view, false);
  }
  const before = s;
  s = adapter.apply(s, command(s, 'done'), ctx(s, other));
  assert.equal(s.phase, 'back'); assert.equal(s.replies[other].error, '');
  const late = adapter.apply(s, command(before, 'skip'), ctx(s, guest));
  assert.equal(late.phase, 'back'); assert.equal(late.turnId, s.turnId); assert.equal(late.replies[guest].error, 'stale_turn');
  s = adapter.pulse(s, ctx(s, 1, { now: s.phaseUntil }));
  assert.equal(s.phase, 'speaking');
  s = adapter.apply(s, command(s, 'settings'), ctx(s, 1));
  s = adapter.apply(s, command(s, 'configure', { mainMinutes: 5 }), ctx(s, 3));
  const turn = s.turnId, restart = command(s, 'restart');
  s = adapter.apply(s, restart, ctx(s, 2));
  assert.equal(s.mode, 'jump'); assert.equal(s.mainMinutes, 5); assert.equal(s.phase, 'ready'); assert.equal(s.turnId, turn + 1);
  assert.deepEqual(s.mainStats, {}); assert.deepEqual(s.interruptStats, {}); assert.equal(s.interrupter, null); assert.equal(s.deadline, null);
  assert.ok(J.items.some(topic => topic.id === s.topic.id));
  assert.deepEqual(adapter.apply(s, restart, ctx(s, 2)), s, 'a repeated restart is ignored');
  const source = require('node:fs').readFileSync(require.resolve('../runtime/hub-executor-core.cjs'), 'utf8');
  assert.match(source, /\['countdown','speaking','handoff','back'\]\.includes\(state\.phase\)/, 'one card polls the return beat every 500ms');
});

test('the legacy host clock ticks the return beat but never an open interruption', async () => {
  const SYNC = require('../cut-sync.js'), calls = [];
  const host = phase => ({ stopped: false, suspended: false, own: true, connected: true, ticking: false, sameRoom: () => true, now: () => 5000, status() {},
    doc: { state: { phase, phaseUntil: phase === 'back' ? 4000 : null, deadline: null } },
    command(type) { calls.push(phase + ':' + type); return Promise.resolve(); } });
  for (const phase of ['back', 'interrupt']) SYNC.Host.prototype.pulse.call(host(phase));
  await Promise.resolve();
  assert.deepEqual(calls, ['back:tick']);
});

function playerCard(view, extra = {}) {
  const sent = [], nodes = { status: { textContent: '' }, connection: { textContent: '' } }; let click;
  const element = { innerHTML: '', querySelectorAll: () => [],
    querySelector: selector => selector === '[data-cut-action-status]' ? nodes.status : selector === '[data-cut-connection]' ? nodes.connection : null,
    addEventListener(type, handler) { if (type === 'click') click = handler; }, removeEventListener() {} };
  const card = new UI.Card(element, { now: () => 1000, send: async input => { sent.push(input); }, ...extra });
  card.update(view);
  return { card, sent, element, nodes, press: type => click({ target: { closest: selector => selector === '[data-cut-action]' ? { disabled: false, dataset: { cutAction: type } } : null } }) };
}

test('the interrupter\'s own card sends DONE or SKIP once, and other legacy cards cannot', async () => {
  const s = tick(speaking()), guest = s.interrupter, other = [1, 2, 3, 4].find(n => n !== guest && n !== s.speaker);
  const live = seat => { const view = E.view(s, seat, s.lastChangeAt); view.cut.hostLiveUntil = 5000; return view; };
  const mine = playerCard(live(guest)), theirs = playerCard(live(other)), main = playerCard(live(s.speaker));
  try {
    assert.match(mine.element.innerHTML, /data-cut-action="done".*data-cut-action="skip"/s);
    assert.doesNotMatch(mine.element.innerHTML, /data-cut-countdown|data-cut-topic-clock/);
    mine.press('skip'); mine.press('skip'); mine.press('done'); await Promise.resolve();
    assert.equal(mine.sent.length, 1);
    assert.deepEqual({ ...mine.sent[0], id: 'id' }, { id: 'id', sessionId: s.sessionId, turnId: s.turnId, type: 'skip' });
    assert.match(mine.nodes.status.textContent, /等待同步/);
    const returned = act(s, 'skip', { actor: guest, id: mine.sent[0].id });
    mine.card.update(E.view(returned, guest, returned.lastChangeAt));
    assert.equal(mine.card.pending, null); assert.match(mine.element.innerHTML, /繼續說/);
    for (const card of [theirs, main]) { card.press('done'); card.press('skip'); assert.equal(card.card.canAction('done'), false); }
    await Promise.resolve();
    assert.equal(theirs.sent.length + main.sent.length, 0);
    assert.doesNotMatch(theirs.element.innerHTML + main.element.innerHTML, /data-cut-action="(?:done|skip)"/);
    const expired = playerCard(live(guest), { now: () => 9000 });
    assert.equal(expired.card.canFinish(), false); expired.card.destroy();
  } finally { for (const card of [mine, theirs, main]) card.card.destroy(); }
});

test('a shared card can hand the floor back and saves the mode with its own length', () => {
  let s = tick(speaking(3)); s.sharedControls = true;
  const guest = s.interrupter, other = [1, 2, 3].find(n => n !== guest && n !== s.speaker);
  const helper = playerCard(E.view(s, other, s.lastChangeAt));
  const setup = act(s, 'settings'), editor = playerCard(E.view(setup, other, setup.lastChangeAt));
  try {
    assert.match(helper.element.innerHTML, new RegExp('data-cut-action="done"[^>]*>' + UI.t('backToMain')));
    assert.doesNotMatch(helper.element.innerHTML, /cut-jump-actions/); assert.equal(helper.card.canAction('done'), true);
    const html = editor.element.innerHTML;
    assert.match(html, /<select name="mode"[^>]*>.*<option value="jump" selected/s);
    assert.match(html, /<select name="mainMinutes"[^>]*>.*<option value="4" selected/s);
    assert.match(html, /data-cut-classic-fields hidden/); assert.doesNotMatch(html, /data-cut-jump-fields hidden/);
    const fields = { mode: { value: 'jump' }, mainMinutes: { value: '5' }, firstCutMinSeconds: { value: '25' }, firstCutMaxSeconds: { value: '45' }, cutIntervalMinSeconds: { value: '30' }, cutIntervalMaxSeconds: { value: '55' }, speed: { value: 'custom' }, category: { value: 'mixed' },
      topicMinutes: { value: '' }, customMinSeconds: { value: '90' }, customMaxSeconds: { value: '10' } };
    const form = { querySelector: selector => fields[selector.match(/name="(\w+)"/)?.[1]] || null, querySelectorAll: () => [] };
    const input = editor.card.settingsInput(form);
    assert.equal(input.mode, 'jump'); assert.equal(input.mainMinutes, 5); assert.equal(input.speed, 'normal');
    assert.equal(editor.card.canAction('configure', input), true, 'hidden Mode 1 fields cannot block a Mode 2 save');
    assert.equal(error(act(setup, 'configure', { ...input, actor: other }), other), '');
    fields.mainMinutes.value = '7'; assert.equal(editor.card.canAction('configure', editor.card.settingsInput(form)), false);
    fields.mode.value = 'classic'; fields.mainMinutes.value = '4';
    assert.equal(editor.card.canAction('configure', editor.card.settingsInput(form)), false, 'Mode 1 fields are checked again once they show');
  } finally { helper.card.destroy(); editor.card.destroy(); }
});

test('Mode 2 cues play the CUT once, chime on the way back and mark the end of the time', () => {
  const sound = new UI.Sound(), cues = [];
  sound.cue = cue => cues.push(cue);
  const base = { sessionId: 'sound', mode: 'jump', roster: [], topic: { question: 'Topic' }, speaker: 1 };
  sound.update({ ...base, turnId: 1, phase: 'speaking' }, 1000);
  const cut = { ...base, turnId: 2, phase: 'interrupt', interrupter: 2, cutEvent: { id: 'one-cut' } };
  sound.update(cut, 2000); sound.update(cut, 90000);
  sound.update({ ...cut, turnId: 3, interrupter: 3 }, 91000);
  assert.deepEqual(cues, ['cut', 'reveal']);
  sound.update({ ...base, turnId: 4, phase: 'back', phaseUntil: 95000 }, 92500);
  sound.update({ ...base, turnId: 4, phase: 'back', phaseUntil: 95000 }, 94500);
  sound.update({ ...base, turnId: 5, phase: 'speaking' }, 95000);
  assert.deepEqual(cues, ['cut', 'reveal', 'go']);
  sound.update({ ...base, turnId: 6, phase: 'timeup' }, 99000);
  assert.deepEqual(cues, ['cut', 'reveal', 'go', 'time']);
  sound.close();
});

function hostDemo() {
  const fs = require('node:fs'), vm = require('node:vm');
  let time = 1000, serial = 0, interval;
  const elements = new Map(), creations = [], commands = [];
  const defaults = { 'cut-first-min': '25', 'cut-first-max': '45', 'cut-interval-min': '30', 'cut-interval-max': '55', 'cut-speed': 'normal', 'cut-category': 'mixed', 'cut-custom-min': '15', 'cut-custom-max': '25', 'cut-topic-minutes': '10', 'cut-library-category': 'mixed', 'cut-library-search': '', 'cut-library-mode': 'classic' };
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', value: defaults[id] ?? '0', hidden: false, disabled: false, open: false, attributes: {}, events: {},
      addEventListener(type, callback) { this.events[type] = callback; }, setAttribute(name, value) { this.attributes[name] = value; }, querySelector: () => null,
      close() { this.open = false; }, showModal() { this.open = true; }, focus() {} });
    return elements.get(id);
  };
  class QuietSound { constructor() { this.enabled = false; this.context = null; } unlock() { return Promise.resolve(false); } update() {} silence() {} close() {} toggle() {} }
  const engine = { ...E, create(options) { creations.push(options); return E.create(options); },
    apply(state, input) { if (input.type !== 'tick') commands.push(input); return E.apply(state, input); } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../cut-host.js'), 'utf8'), {
    CUT_UI: { ...UI, Sound: QuietSound }, CUT_ENGINE: engine, CUT_TOPICS: T, CUT_JUMP_TOPICS: J, CUT_CONFIG: C, CUT_SYNC: { uid: () => 'jump-host-' + ++serial },
    CUT_HALLOWEEN_TOPICS: require('../cut-halloween-topics.js'),
    CUT_HALLOWEEN_AUDIO: { Board: class { constructor() { this.ready = false; this.track = null; this.musicVolume = .35; this.effectsVolume = .8; this.autoScare = true; } unlock() { return Promise.resolve(false); } stopMusic() {} close() {} cut() { return false; } } },
    I18N: { applyStatic() {}, onChange() {} }, location: { search: '?demo=1' }, URLSearchParams,
    document: { getElementById: element, querySelectorAll: () => [], body: { classList: { toggle() {} } } },
    crypto: { getRandomValues: array => { array[0] = 2718 + serial; return array; } }, Date: class extends Date { static now() { return time; } },
    setInterval: fn => { interval = fn; return 1; }, clearInterval() {}, setTimeout, clearTimeout, window: { addEventListener() {} } });
  const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  return { element, creations, commands, scene: () => element('cut-scene').innerHTML,
    click: async id => { element('cut-' + id).events.click?.({ target: { closest: () => null } }); await settle(); },
    submit: async () => { element('cut-setup').events.submit({ preventDefault() {} }); await settle(); },
    advance: milliseconds => { time += milliseconds; interval(); } };
}

test('the host page starts Mode 2, finishes an interruption and switches modes from settings', async () => {
  const f = hostDemo(), clock = () => f.scene().match(/data-cut-main-time[^>]*>([^<]*)</)?.[1];
  assert.equal(f.element('cut-mode-classic').attributes['aria-pressed'], 'true'); assert.equal(f.element('cut-jump-options').hidden, true);
  assert.match(f.element('cut-main-minutes').innerHTML, /<option value="4" selected>/);
  await f.click('mode-jump');
  assert.equal(f.element('cut-mode-jump').attributes['aria-pressed'], 'true');
  assert.equal(f.element('cut-classic-options').hidden, true); assert.equal(f.element('cut-jump-options').hidden, false);
  assert.equal(f.element('cut-rules-jump').hidden, false); assert.equal(f.element('cut-rules-classic').hidden, true);
  f.element('cut-main-minutes').value = '5'; f.element('cut-topic-minutes').value = 'nonsense';
  await f.submit();
  assert.equal(f.creations.length, 1); assert.equal(f.creations[0].mode, 'jump'); assert.equal(f.creations[0].mainMinutes, 5);
  assert.equal(f.creations[0].topicMinutes, 10, 'a hidden Mode 1 field cannot block the start');
  assert.equal(clock(), '05:00'); assert.match(f.scene(), /data-cut-phase="ready"/); assert.doesNotMatch(f.scene(), /data-cut-topic-clock/);
  assert.equal(f.element('cut-begin').hidden, false); assert.equal(f.element('cut-done').hidden, true);
  await f.click('begin'); f.advance(3100);
  assert.match(f.scene(), /data-cut-phase="speaking"/);
  f.advance(46000);
  assert.match(f.scene(), /data-cut-phase="interrupt".*CUT!/s); assert.equal(clock(), '04:14');
  assert.equal(f.element('cut-done').hidden, false); assert.equal(f.element('cut-skip').hidden, false);
  assert.equal(f.element('cut-done').disabled, false); assert.equal(f.element('cut-begin').hidden, true); assert.equal(f.element('cut-pause').hidden, false);
  f.advance(120000);
  assert.match(f.scene(), /data-cut-phase="interrupt"/); assert.equal(clock(), '04:14', 'waiting for DONE costs the Main Speaker nothing');
  await f.click('skip');
  assert.equal(f.commands.at(-1).type, 'skip'); assert.match(f.scene(), /data-cut-phase="back"/); assert.equal(f.element('cut-done').hidden, true);
  f.advance(2600);
  assert.match(f.scene(), /data-cut-phase="speaking"/); assert.equal(clock(), '04:14');
  await f.click('settings-open');
  assert.equal(f.element('cut-setup').hidden, false); assert.equal(f.element('cut-mode-jump').attributes['aria-pressed'], 'true');
  assert.equal(f.element('cut-main-minutes').value, '5'); assert.equal(f.element('cut-mode-switch-hint').hidden, true);
  await f.click('mode-classic');
  assert.equal(f.element('cut-mode-switch-hint').hidden, false); assert.equal(f.element('cut-classic-options').hidden, false);
  f.element('cut-topic-minutes').value = '10';
  await f.submit();
  assert.equal(f.commands.at(-1).type, 'configure'); assert.equal(f.commands.at(-1).mode, 'classic');
  assert.equal(f.element('cut-setup').hidden, true); assert.equal(clock(), undefined);
  assert.match(f.scene(), /data-cut-phase="ready".*data-cut-topic-clock/s); assert.equal(f.element('cut-rules-classic').hidden, false);
  await f.click('restart');
  assert.equal(f.creations.at(-1).mode, 'classic'); assert.equal(f.creations.at(-1).mainMinutes, 5);
});

test('every Mode 2 screen keeps the Main Speaker visible and gives DONE and SKIP to the interrupter only', () => {
  let s = create(); const main = s.speaker, name = 'Person ' + main;
  const show = (state, actor) => UI.scene(E.view(state, actor, state.lastChangeAt).cut, actor, state.lastChangeAt);
  assert.match(show(s, 0), new RegExp('data-cut-main.*' + name, 's'));
  s = act(s, 'begin'); assert.match(show(s, main), /data-cut-countdown/);
  s = tick(s); assert.match(show(s, main), /data-cut-main-time[^>]*>04:00</);
  s = tick(s); const guest = s.interrupter;
  const host = show(s, 0), mine = show(s, guest), speaker = show(s, main);
  for (const html of [host, mine, speaker]) { assert.match(html, /CUT!/); assert.match(html, new RegExp('cut-main-name">' + name)); assert.doesNotMatch(html, /data-cut-countdown/); }
  assert.match(mine, /data-cut-action="done".*data-cut-action="skip"/s);
  assert.doesNotMatch(host + speaker, /data-cut-action="(?:done|skip)"/);
  s = act(s, 'done'); assert.match(show(s, 0), new RegExp(UI.t('backTo') + '.*' + name + '.*' + UI.t('keepGoing'), 's'));
  s = act(s, 'endTopic'); assert.equal(s.roundEnd, 'ended'); assert.match(show(s, 0), new RegExp(UI.t('jumpThanks', { name })));
});


test('host accepts independent manual delays, rejects bad ranges and restores saved values', async () => {
 const f=hostDemo();await f.click('mode-jump');
 f.element('cut-first-min').value='45';f.element('cut-first-max').value='20';await f.submit();
 assert.equal(f.creations.length,0);assert.match(f.element('cut-jump-error').textContent,/5.*300/);
 f.element('cut-first-max').value='45';f.element('cut-interval-min').value='11';f.element('cut-interval-max').value='11';await f.submit();
 assert.equal(f.creations.length,1);assert.equal(f.creations[0].firstCutMinSeconds,45);assert.equal(f.creations[0].cutIntervalMaxSeconds,11);
 await f.click('begin');f.advance(3100);f.advance(44000);assert.match(f.scene(),/data-cut-phase="speaking"/);
 f.advance(1000);assert.match(f.scene(),/data-cut-phase="interrupt"/);await f.click('done');f.advance(2600);
 f.advance(10000);assert.match(f.scene(),/data-cut-phase="speaking"/);f.advance(1000);assert.match(f.scene(),/data-cut-phase="interrupt"/);
 await f.click('settings-open');assert.equal(f.element('cut-first-min').value,'45');assert.equal(f.element('cut-interval-max').value,'11');
});
