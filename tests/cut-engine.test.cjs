const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../cut-engine.js');
const R = require('../cut-random.js');
const C = require('../cut-config.js');
const T = require('../cut-topics.js');
let serial = 0;
const create = (count = 4, extra = {}) => E.create({ id: 'session-one', now: 1000, seed: 8192,
  roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })), ...extra });
const act = (s, type, extra = {}) => E.apply(s, { id: 'command-' + ++serial, sessionId: s.sessionId, turnId: s.turnId,
  seed: serial * 753, now: s.lastChangeAt + 1, actor: 0, type, ...extra });
const due = s => s.phase === 'speaking' ? s.deadline : s.phaseUntil;
const tick = (s, extra = {}) => act(s, 'tick', { now: due(s), ...extra });
const begin = s => act(s, 'begin', { now: s.lastChangeAt });
const speaking = (count = 4, extra = {}) => tick(begin(create(count, extra)));
const finishRound = state => {
  let s = state.phase === 'ready' ? begin(state) : state;
  for (let guard = 0; guard < 100 && s.phase !== 'break'; guard++) s = tick(s);
  assert.equal(s.phase, 'break'); return s;
};

test('Normal weighted bins have the requested distribution, safety period and hard maximum', () => {
  assert.deepEqual(C.speeds.normal.bins.map(b => [b.from, b.to, b.weight]), [[9, 12, .20], [12, 15, .45], [15, 18, .35]]);
  const bins = [0, 0, 0]; let total = 0;
  for (let seed = 0; seed < 50000; seed++) {
    const duration = R.duration('normal', 0, R.create(seed));
    assert.ok(duration >= 9000 && duration <= 18000);
    bins[duration < 12000 ? 0 : duration < 15000 ? 1 : 2]++;
    total += duration;
  }
  bins.forEach((count, i) => assert.ok(Math.abs(count / 50000 - [.20, .45, .35][i]) < .015));
  assert.ok(total / 50000 >= 13000 && total / 50000 <= 15000);
});

test('anti-repeat reduces both kinds of repeated extremes without eliminating them', () => {
  const rates = { baseShort: 0, repeatedShort: 0, baseLong: 0, repeatedLong: 0 };
  for (let seed = 0; seed < 20000; seed++) {
    const base = R.duration('normal', 0, R.create(seed));
    if (R.duration('chaos', 0, R.create(seed)) < 6000) rates.baseShort++;
    if (base >= 13000) rates.baseLong++;
    if (R.duration('chaos', 5000, R.create(seed)) < 6000) rates.repeatedShort++;
    if (R.duration('normal', 14000, R.create(seed)) >= 13000) rates.repeatedLong++;
  }
  assert.ok(rates.repeatedShort > 0 && rates.repeatedShort < rates.baseShort * .75);
  assert.ok(rates.repeatedLong > 0 && rates.repeatedLong < rates.baseLong * .9);
});

test('Chill is slower and Chaos is slightly longer; both remain within their own bounds', () => {
  assert.deepEqual(C.speeds.chill.bins.map(b => [b.from, b.to, b.weight]), [[12, 16, .20], [16, 20, .45], [20, 24, .35]]);
  assert.deepEqual(C.speeds.chaos.bins.map(b => [b.from, b.to, b.weight]), [[5, 7, .30], [7, 9, .45], [9, 12, .25]]);
  for (const speed of ['chill', 'chaos']) for (let seed = 1; seed <= 1000; seed++) {
    const ms = R.duration(speed, 0, R.create(seed));
    assert.ok(ms >= C.speeds[speed].minSeconds * 1000 && ms <= C.speeds[speed].maxSeconds * 1000);
  }
});

test('extensible topic bank contains 60 easy English openings at a 60/40 split', () => {
  assert.equal(T.items.length, 60);
  assert.equal(T.items.filter(t => t.category === 'real').length, 36);
  assert.equal(T.items.filter(t => t.category === 'absurd').length, 24);
  assert.equal(new Set(T.items.map(t => t.id)).size, T.items.length);
  assert.ok(T.items.every(t => t.question && t.starter && !t.question.includes('favorite food')));
  for (const category of ['real', 'absurd']) assert.equal(create(4, { category }).topic.category, category);
});

test('new topics show their question and first speaker until the host or any active player starts', () => {
  for (const actor of [0, 1, 2, 3, 4]) {
    let s = create();
    assert.equal(s.version, 1); assert.equal(s.phase, 'ready');
    assert.ok(s.topic.question); assert.ok(s.speaker); assert.equal(s.speakerSequence, 0);
    assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
    assert.equal(act(s, 'tick', { now: 999999 }), s);
    for (const player of [0, 1, 2, 3, 4]) {
      const view = E.view(s, player, 999999).cut;
      assert.equal(view.canBegin, true);
      for (const key of ['phaseUntil', 'deadline', 'nextSpeaker']) assert.equal(key in view, false);
    }
    assert.equal(E.view(s, 88, 999999).cut.canBegin, false);
    const question = s.topic.question, speaker = s.speaker;
    s = act(s, 'begin', { actor, now: 999999 });
    assert.equal(s.phase, 'countdown'); assert.equal(s.phaseUntil, 1002999);
    assert.equal(s.topic.question, question); assert.equal(s.speaker, speaker);
    assert.equal(E.view(s, actor, 1000000).cut.canBegin, false);
    s = tick(s); assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 1);
  }
});

test('manual Begin is guarded against replay, competing starts, excluded seats and extra player controls', () => {
  const initial = create();
  const command = { id: 'manual-begin', sessionId: initial.sessionId, turnId: initial.turnId,
    actor: 2, type: 'begin', now: 2000, seed: 222 };
  const once = E.apply(initial, command);
  assert.equal(once.phase, 'countdown'); assert.equal(once.phaseUntil, 5000);
  assert.deepEqual(E.apply(initial, command), once);
  assert.equal(E.apply(once, command), once);
  const competing = E.apply(once, { ...command, id: 'another-begin', actor: 3 });
  assert.equal(competing.phase, 'countdown'); assert.equal(competing.phaseUntil, 5000);
  assert.equal(competing.replies[3].error, 'stale_turn');
  assert.equal(act(once, 'begin', { actor: 1 }).replies[1].error, 'not_available');
  for (const type of ['settings', 'configure', 'cancelSettings', 'pause', 'resume', 'next', 'stop', 'exclude']) {
    const rejected = act(initial, type, { actor: 1, speed: 'chill', playerNum: 2, active: false });
    assert.equal(rejected.phase, 'ready'); assert.equal(rejected.replies[1].error, 'not_available');
  }
  const excluded = act(initial, 'exclude', { playerNum: 2, active: false });
  assert.equal(E.view(excluded, 2, 2000).cut.canBegin, false);
  assert.equal(act(excluded, 'begin', { actor: 2 }).replies[2].error, 'not_available');
  assert.equal(act(initial, 'begin', { actor: 88 }), initial);
});

test('returning to settings from every game phase blocks starts and preserves the topic, roster and fairness', () => {
  const ready = create(), countdown = begin(ready), live = tick(countdown);
  const cut = tick(live), handoff = tick(cut), completed = finishRound(live);
  const states = [ready, countdown, live, cut, handoff, completed, act(live, 'pause'), act(live, 'stop')];
  for (const before of states) {
    const after = act(before, 'settings');
    assert.equal(after.phase, 'setup'); assert.equal(after.version, 1);
    assert.deepEqual(after.topic, before.topic); assert.deepEqual(after.topicHistory, before.topicHistory);
    assert.equal(after.round, before.round); assert.equal(after.targetCuts, before.targetCuts);
    assert.deepEqual(after.roster, before.roster); assert.deepEqual(after.stats, before.stats);
    assert.deepEqual(after.recent, before.recent); assert.equal(after.speakerSequence, before.speakerSequence);
    assert.equal(after.cutsCompleted, before.phase === 'break' ? 0 : before.cutsCompleted);
    assert.equal(after.deadline, null); assert.equal(after.phaseUntil, null);
    assert.equal(after.pendingDurationMs, null); assert.equal(after.speakingDurationMs, null);
    assert.equal(after.cutEvent, null); assert.equal(after.pause, null); assert.equal(after.nextSpeaker, null);
    if (before.speaker != null) assert.equal(after.speaker, before.speaker);
    else assert.ok(after.roster.some(player => player.active && player.playerNum === after.speaker));
    assert.equal(act(after, 'tick', { now: after.lastChangeAt + 900000 }), after);
    for (const actor of [0, 1, 2, 3, 4]) {
      assert.equal(E.view(after, actor, 0).cut.canBegin, false);
      assert.equal(act(after, 'begin', { actor }).phase, 'setup');
    }
  }
});

test('saving or cancelling settings waits for Begin; changed category applies only to the next topic', () => {
  const live = speaking(); const speaker = live.speaker, topic = live.topic;
  const stats = structuredClone(live.stats), sequence = live.speakerSequence;
  let s = act(live, 'settings');
  s = act(s, 'configure', { speed: 'chill', category: 'absurd' });
  assert.equal(s.phase, 'ready'); assert.equal(s.speed, 'chill'); assert.equal(s.category, 'absurd');
  assert.deepEqual(s.topic, topic); assert.equal(s.speaker, speaker);
  assert.deepEqual(s.stats, stats); assert.equal(s.speakerSequence, sequence);
  assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
  assert.equal(act(s, 'tick', { now: 999999 }), s);
  s = tick(begin(s));
  assert.equal(s.phase, 'speaking'); assert.equal(s.speaker, speaker);
  assert.ok(s.deadline - s.lastChangeAt >= 12000 && s.deadline - s.lastChangeAt <= 24000);
  assert.deepEqual(s.stats, stats); assert.equal(s.speakerSequence, sequence);
  s = finishRound(s); s = act(s, 'next');
  assert.equal(s.phase, 'ready'); assert.equal(s.topic.category, 'absurd');
  assert.notEqual(s.topic.id, topic.id);
  s = act(s, 'settings'); s = act(s, 'cancelSettings');
  assert.equal(s.phase, 'ready'); assert.equal(s.speed, 'chill'); assert.equal(s.category, 'absurd');
  assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null);
});

test('invalid or stale settings saves cannot change preferences or release the edit lock', () => {
  const s = act(create(), 'settings');
  for (const extra of [{ speed: 'fast', category: 'real' }, { speed: 'chill', category: 'unknown' }]) {
    const denied = act(s, 'configure', extra);
    assert.equal(denied.phase, 'setup'); assert.equal(denied.speed, s.speed); assert.equal(denied.category, s.category);
    assert.equal(denied.replies[0].error, 'invalid_setup');
  }
  const stale = act(s, 'configure', { turnId: s.turnId - 1, speed: 'chill' });
  assert.equal(stale.phase, 'setup'); assert.equal(stale.replies[0].error, 'stale_turn');
  assert.equal(act(create(), 'configure', { speed: 'chill' }).replies[0].error, 'not_available');
  assert.equal(act(create(), 'cancelSettings').replies[0].error, 'not_available');
});

test('ready and settings dropouts and pause/resume never start a countdown', () => {
  for (const edit of [false, true]) {
    let s = edit ? act(create(3), 'settings') : create(3);
    const expected = edit ? 'setup' : 'ready';
    const removed = s.speaker;
    s = act(s, 'exclude', { playerNum: removed, active: false });
    assert.equal(s.phase, expected); assert.notEqual(s.speaker, removed);
    assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null); assert.equal(s.speakerSequence, 0);
    const speaker = s.speaker;
    s = act(s, 'pause'); s = act(s, 'resume');
    assert.equal(s.phase, expected); assert.equal(s.speaker, speaker); assert.equal(s.phaseUntil, null);
    const other = s.roster.find(player => player.active && player.playerNum !== s.speaker).playerNum;
    s = act(s, 'exclude', { playerNum: other, active: false });
    assert.equal(s.phase, 'paused'); assert.equal(s.pause.phase, expected);
    s = act(s, 'exclude', { playerNum: other, active: true });
    s = act(s, 'resume'); assert.equal(s.phase, expected); assert.equal(s.speaker, speaker);
    assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null);
  }
  let s = act(create(2), 'exclude', { playerNum: 2, active: false });
  s = act(s, 'settings'); s = act(s, 'configure', { speed: 'chaos' });
  assert.equal(s.phase, 'ready'); assert.equal(E.view(s, 0, 0).cut.canBegin, false);
  assert.equal(act(s, 'begin').replies[0].error, 'not_enough_players');
});

test('completed and stopped topics can be replayed after editing without resetting session fairness', () => {
  const completed = finishRound(create());
  const finalCut = { ...completed, phase: 'cut', speaker: completed.previousSpeaker };
  for (const terminal of [completed, finalCut, act(completed, 'stop'), act(finalCut, 'pause')]) {
    let s = act(terminal, 'settings');
    assert.equal(s.cutsCompleted, 0); assert.deepEqual(s.stats, completed.stats);
    assert.deepEqual(s.topic, completed.topic); assert.equal(s.round, completed.round);
    s = act(s, 'configure', { speed: 'normal' }); s = tick(begin(s));
    assert.equal(s.speakerSequence, completed.speakerSequence + 1);
    s = finishRound(s); assert.equal(s.cutsCompleted, s.targetCuts);
  }
});

test('editing during a completed non-final CUT counts the restarted speaker as a fresh turn', () => {
  const cut = tick(speaking());
  assert.ok(cut.cutsCompleted < cut.targetCuts);
  for (const before of [cut, act(cut, 'pause')]) {
    const speaker = before.speaker, count = before.stats[speaker].count;
    let s = act(before, 'settings');
    assert.equal(s.cutsCompleted, before.cutsCompleted); assert.equal(s.speaker, speaker);
    assert.deepEqual(s.stats, before.stats);
    s = act(s, 'configure', { speed: 'normal' }); s = tick(begin(s));
    assert.equal(s.stats[speaker].count, count + 1);
    assert.equal(s.speakerSequence, before.speakerSequence + 1);
  }
});

test('countdown starts a fresh hidden timer only at GO; public projections contain no private clock', () => {
  let s = begin(create()); const countdownSpeaker = s.speaker;
  assert.equal(s.phase, 'countdown'); assert.equal(s.phaseUntil, 4000); assert.equal(s.deadline, null);
  assert.equal(E.view(s, 1, 1001).cut.phaseUntil, 4000);
  assert.equal(act(s, 'tick', { now: 3999 }), s);
  s = tick(s); assert.equal(s.speaker, countdownSpeaker); assert.equal(s.phase, 'speaking');
  assert.ok(s.deadline >= 13000 && s.deadline <= 22000);
  assert.equal(act(s, 'tick', { now: s.deadline - 1 }), s);
  for (const actor of [0, 1, 2, 3, 4]) {
    const publicView = E.view(s, actor, 4000).cut;
    for (const key of ['deadline', 'phaseUntil', 'speakingDurationMs', 'pendingDurationMs', 'previousDurationMs', 'stats', 'recent', 'topicHistory', 'nextSpeaker', 'pause']) assert.equal(key in publicView, false, key);
  }
  assert.equal(s.stats[s.speaker].count, 1);
});

test('CUT reveals the next speaker once and gives a complete handoff before their hidden timer', () => {
  let s = speaking(); const old = s.speaker, speakingEnd = s.deadline;
  s = tick(s); assert.equal(s.phase, 'cut'); assert.equal(s.previousSpeaker, old);
  assert.notEqual(s.nextSpeaker, old); assert.equal(s.cutEvent.to, s.nextSpeaker);
  assert.equal(s.phaseUntil, speakingEnd + C.cutRevealMs);
  assert.equal(E.view(s, 2, speakingEnd).cut.nextSpeaker, s.nextSpeaker);
  const next = s.nextSpeaker;
  assert.equal(s.stats[next], undefined);
  s = tick(s); assert.equal(s.phase, 'handoff'); assert.equal(s.speaker, next);
  const go = s.phaseUntil;
  assert.equal(go, speakingEnd + C.cutRevealMs + C.handoffMs); assert.equal(s.deadline, null);
  assert.equal(act(s, 'tick', { now: go - 1 }), s);
  s = tick(s); assert.equal(s.phase, 'speaking'); assert.equal(s.speaker, next);
  assert.ok(s.deadline - go >= 9000 && s.deadline - go <= 18000);
  assert.equal('nextSpeaker' in E.view(s, 1, go).cut, false);
});

test('transaction retries, duplicate ticks and old-session or old-turn commands cannot create a second CUT', () => {
  const initial = speaking();
  const command = { id: 'one-cut', actor: 0, type: 'tick', sessionId: initial.sessionId, turnId: initial.turnId, now: initial.deadline, seed: 9981 };
  const once = E.apply(initial, command);
  assert.deepEqual(E.apply(initial, command), once);
  assert.equal(E.apply(once, command), once);
  assert.equal(E.apply(once, { ...command, id: 'second-tick' }), once);
  assert.equal(E.apply(once, { ...command, id: 'old-session', sessionId: 'older' }), once);
  const stale = act(once, 'pause', { turnId: initial.turnId });
  assert.equal(stale.phase, 'cut'); assert.equal(stale.replies[0].error, 'stale_turn');
  assert.equal(stale.cutsCompleted, 1);
});

test('late reconnect advances one phase, giving the new speaker full prep or speaking time', () => {
  let s = begin(create());
  s = tick(s, { now: 100000 }); assert.equal(s.phase, 'speaking');
  assert.ok(s.deadline >= 109000 && s.deadline <= 118000);
  s = tick(s, { now: 300000 }); assert.equal(s.phase, 'cut'); assert.equal(s.cutsCompleted, 1);
  assert.equal(s.phaseUntil, 300900);
  s = tick(s, { now: 600000 }); assert.equal(s.phase, 'handoff'); assert.equal(s.phaseUntil, 603000);
});

test('every topic ends after its target CUT count; next is manual and retains whole-session fairness', () => {
  for (let count = 2; count <= 9; count++) {
    let s = create(count); const target = s.targetCuts;
    assert.ok(target >= 4 && target <= 8);
    const premature = act(s, 'next'); assert.equal(premature.replies[0].error, 'not_available');
    s = finishRound(s); assert.equal(s.cutsCompleted, target); assert.equal(s.cutEvent.final, true); assert.equal(s.cutEvent.to, null);
    assert.equal(s.speakerSequence, target); assert.equal(s.speaker, null);
    const stats = JSON.stringify(s.stats), sequence = s.speakerSequence, topic = s.topic.id;
    assert.equal(act(s, 'tick', { now: s.lastChangeAt + 100000 }), s);
    s = act(s, 'next'); assert.equal(s.round, 2); assert.equal(s.phase, 'ready');
    assert.equal(s.cutsCompleted, 0); assert.equal(s.cutEvent, null); assert.notEqual(s.topic.id, topic);
    assert.equal(JSON.stringify(s.stats), stats); assert.equal(s.speakerSequence, sequence);
  }
});

test('balanced speaker draws exclude the current player and keep counts close without fixed rotation', () => {
  for (let count = 2; count <= 9; count++) {
    const roster = create(count).roster; const stats = {}; let current = null, recent = [], repeatedAfterOne = 0, sequence = [];
    for (let i = 0; i < 1000; i++) {
      const next = R.speaker(roster, current, stats, recent, i, R.create('fair-' + i));
      assert.notEqual(next, current);
      if (sequence.at(-2) === next) repeatedAfterOne++;
      stats[next] = { count: (stats[next]?.count || 0) + 1, lastTurn: i + 1 };
      recent = [next, ...recent.filter(n => n !== next)].slice(0, 3);
      current = next; sequence.push(next);
    }
    const counts = Object.values(stats).map(p => p.count);
    assert.equal(counts.length, count); assert.ok(Math.max(...counts) - Math.min(...counts) <= 8);
    assert.ok(repeatedAfterOne > 0);
  }
  const roster = create(3).roster;
  assert.equal(R.speaker(roster, 3, { 1: { count: 10, lastTurn: 8 }, 2: { count: 10, lastTurn: 7 }, 3: { count: 10, lastTurn: 9 } }, [3, 1, 2], 9, () => 0), 1);
});

test('whole-session fairness and recent topic memory continue through many manual rounds', () => {
  let s = create(8);
  for (let round = 1; round <= 80; round++) {
    s = finishRound(s);
    if (round < 80) {
      const history = s.topicHistory.slice(); s = act(s, 'next');
      assert.equal(history.includes(s.topic.id), false);
    }
  }
  const counts = Object.values(s.stats).map(p => p.count);
  assert.equal(counts.length, 8); assert.ok(Math.max(...counts) - Math.min(...counts) <= 8);
});

test('pausing freezes hidden speaking time; resume preserves speaker and gives 3 seconds of prep', () => {
  let s = speaking(); const speaker = s.speaker, end = s.deadline, originalDuration = s.speakingDurationMs;
  s = act(s, 'pause', { now: end - 2300 }); assert.equal(s.phase, 'paused'); assert.equal(s.pause.remainingMs, 2300);
  assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null);
  assert.equal(act(s, 'tick', { now: end + 900000 }), s);
  assert.equal('pause' in E.view(s, speaker, end).cut, false);
  s = act(s, 'resume', { now: end + 10000 }); assert.equal(s.phase, 'handoff'); assert.equal(s.speaker, speaker);
  assert.equal(s.phaseUntil, end + 13000);
  s = tick(s); assert.equal(s.deadline, end + 15300); assert.equal(s.speakingDurationMs, originalDuration);
  assert.equal(s.stats[speaker].count, 1); assert.equal(s.speakerSequence, 1);
  s = tick(s); assert.equal(s.previousDurationMs, originalDuration); assert.equal(s.cutsCompleted, 1);
});

test('pausing the opening countdown keeps its remaining prep time and does not consume a speaking turn', () => {
  let s = act(begin(create()), 'pause', { now: 2500 }); assert.equal(s.pause.remainingMs, 1500);
  s = act(s, 'resume', { now: 10000 }); assert.equal(s.phase, 'countdown'); assert.equal(s.phaseUntil, 11500);
  assert.equal(s.speakerSequence, 0); s = tick(s); assert.equal(s.speakerSequence, 1);
});

test('removing an active speaker replaces them with fresh prep and invalidates their old timer', () => {
  let s = speaking(); const removed = s.speaker, oldTurn = s.turnId, oldEnd = s.deadline;
  s = act(s, 'exclude', { playerNum: removed, active: false, now: s.lastChangeAt + 1000 });
  assert.equal(s.phase, 'handoff'); assert.notEqual(s.speaker, removed); assert.equal(s.deadline, null);
  assert.equal(s.phaseUntil, 8000); assert.equal(s.speakingDurationMs, null);
  assert.equal(E.apply(s, { id: 'old-deadline', sessionId: s.sessionId, turnId: oldTurn, actor: 0, type: 'tick', now: oldEnd, seed: 1 }), s);
  const fresh = tick(s); assert.ok(fresh.deadline >= fresh.lastChangeAt + 9000);
  assert.equal(fresh.roster.find(p => p.playerNum === removed).active, false);
  assert.equal(fresh.cutsCompleted, 0);
});

test('fewer than two active players pauses; adding them back needs deliberate host resume', () => {
  let s = speaking(2); const speaker = s.speaker, other = s.roster.find(p => p.playerNum !== speaker).playerNum;
  const pauseTime = s.lastChangeAt + 500, remaining = s.deadline - pauseTime;
  s = act(s, 'exclude', { playerNum: other, active: false, now: pauseTime });
  assert.equal(s.phase, 'paused'); assert.equal(s.pauseReason, 'not_enough_players');
  const denied = act(s, 'resume'); assert.equal(denied.phase, 'paused'); assert.equal(denied.replies[0].error, 'not_enough_players');
  s = act(denied, 'exclude', { playerNum: other, active: true }); assert.equal(s.phase, 'paused');
  s = act(s, 'resume'); assert.equal(s.speaker, speaker); assert.equal(s.phase, 'handoff');
  s = tick(s); assert.equal(s.deadline - s.lastChangeAt, remaining); assert.equal(s.speakerSequence, 1);
});

test('removing a chosen next speaker before their GO replaces them and does not count a nonexistent turn', () => {
  let s = tick(speaking(4)); const pending = s.nextSpeaker, current = s.speaker;
  s = act(s, 'exclude', { playerNum: pending, active: false });
  assert.equal(s.phase, 'handoff'); assert.notEqual(s.speaker, pending); assert.notEqual(s.speaker, current);
  assert.equal(s.stats[pending], undefined); assert.equal(s.pendingDurationMs, null);
  s = tick(s); assert.equal(s.speakerSequence, 2);
});

test('pausing a final CUT then losing its last speaker still ends the topic without an extra turn', () => {
  let s = speaking(3);
  while (s.cutsCompleted < s.targetCuts) s = tick(s);
  assert.equal(s.phase, 'cut'); const finalSpeaker = s.speaker;
  s = act(s, 'pause'); s = act(s, 'exclude', { playerNum: finalSpeaker, active: false });
  s = act(s, 'resume'); assert.equal(s.phase, 'cut');
  const completed = s.cutsCompleted;
  s = tick(s); assert.equal(s.phase, 'break'); assert.equal(s.cutsCompleted, completed);
});

test('host-only controls, unknown players, malformed setup, and stop cannot affect a live speaker unexpectedly', () => {
  assert.throws(() => create(1), /invalid_setup/); assert.throws(() => create(10), /invalid_setup/);
  assert.throws(() => create(2, { roster: [{ playerNum: 1 }, { playerNum: 1 }] }), /invalid_roster/);
  let s = speaking(); const original = s.speaker;
  s = act(s, 'pause', { actor: original }); assert.equal(s.phase, 'speaking'); assert.equal(s.replies[original].error, 'not_available');
  assert.equal(act(s, 'stop', { actor: 88 }), s);
  s = act(s, 'exclude', { playerNum: 88, active: false }); assert.equal(s.speaker, original); assert.equal(s.replies[0].error, 'invalid_player');
  s = act(s, 'stop'); assert.equal(s.phase, 'stopped'); assert.equal(s.deadline, null); assert.equal(s.phaseUntil, null); assert.equal(s.speaker, null);
  assert.equal(act(s, 'tick', { now: 1000000 }), s);
  assert.equal(act(s, 'next').replies[0].error, 'not_available');
});

test('Firebase omission of empty containers preserves timing and controls', () => {
  const wire = value => {
    if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([k, v]) => [k, wire(v)]).filter(([, v]) => v != null);
    if (!entries.length) return null;
    return Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries);
  };
  let s = tick(wire(begin(create())));
  s = tick(wire(s)); s = tick(wire(s)); s = tick(wire(s));
  assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 2);
  s = act(wire(s), 'pause'); s = act(wire(s), 'resume'); s = tick(wire(s));
  assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 2);
  s = finishRound(wire(s)); s = act(wire(s), 'next'); assert.equal(s.phase, 'ready');
  assert.ok(E.view(wire(s), 1, 0).cut.topic.question);
});
