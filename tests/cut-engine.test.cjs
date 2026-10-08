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
const advance = s => s.phase === 'cut' ? begin(s) : tick(s);
const finishRound = state => {
  let s = state.phase === 'ready' ? begin(state) : state;
  const expectedCuts = s.cutsCompleted + 8;
  for (let guard = 0; guard < 40 && s.cutsCompleted < expectedCuts; guard++) s = advance(s);
  assert.equal(s.phase, 'cut'); assert.equal(s.cutsCompleted, expectedCuts);
  s = act(s, 'endTopic');
  assert.equal(s.phase, 'break'); return s;
};

test('Normal weighted bins keep the longer requested range and distribution', () => {
  assert.deepEqual(C.speeds.normal.bins.map(b => [b.from, b.to, b.weight]), [[15, 18, .20], [18, 22, .45], [22, 25, .35]]);
  const bins = [0, 0, 0]; let total = 0;
  for (let seed = 0; seed < 50000; seed++) {
    const duration = R.duration('normal', 0, R.create(seed));
    assert.ok(duration >= 15000 && duration <= 25000);
    bins[duration < 18000 ? 0 : duration < 22000 ? 1 : 2]++;
    total += duration;
  }
  bins.forEach((count, i) => assert.ok(Math.abs(count / 50000 - [.20, .45, .35][i]) < .015));
  assert.ok(total / 50000 >= 20000 && total / 50000 <= 21500);
});

test('anti-repeat reduces repeated short Chaos and long Normal draws without eliminating them', () => {
  assert.equal(C.antiRepeat.shortBelowSeconds, 10);
  assert.equal(C.antiRepeat.longFromSeconds, 22);
  const rates = { baseShort: 0, repeatedShort: 0, baseLong: 0, repeatedLong: 0 };
  for (let seed = 0; seed < 20000; seed++) {
    if (R.duration('chaos', 0, R.create(seed)) < 10000) rates.baseShort++;
    if (R.duration('normal', 0, R.create(seed)) >= 22000) rates.baseLong++;
    if (R.duration('chaos', 9000, R.create(seed)) < 10000) rates.repeatedShort++;
    if (R.duration('normal', 23000, R.create(seed)) >= 22000) rates.repeatedLong++;
  }
  assert.ok(rates.repeatedShort > 0 && rates.repeatedShort < rates.baseShort * .75);
  assert.ok(rates.repeatedLong > 0 && rates.repeatedLong < rates.baseLong * .9);
});

test('Chill 25–40 seconds and Chaos 8–16 seconds keep their own bounds', () => {
  assert.deepEqual(C.speeds.chill.bins.map(b => [b.from, b.to, b.weight]), [[25, 30, .20], [30, 35, .45], [35, 40, .35]]);
  assert.deepEqual(C.speeds.chaos.bins.map(b => [b.from, b.to, b.weight]), [[8, 10, .30], [10, 13, .45], [13, 16, .25]]);
  for (const speed of ['chill', 'chaos']) for (let seed = 1; seed <= 1000; seed++) {
    const ms = R.duration(speed, 0, R.create(seed));
    assert.ok(ms >= C.speeds[speed].minSeconds * 1000 && ms <= C.speeds[speed].maxSeconds * 1000);
  }
});

test('expanded topic bank preserves all 60 original prompts and adds 40 personal and thought openings', () => {
  const original = require('./fixtures/cut-original-topics.json');
  assert.deepEqual(T.items.slice(0,60), original);
  assert.equal(T.items.length,100);
  for (const [category,count] of [['real',36],['absurd',24],['personal',20],['ideas',20]]) {
    assert.equal(T.items.filter(topic=>topic.category===category).length,count);
    assert.equal(create(4,{category}).topic.category,category);
  }
  assert.equal(new Set(T.items.map(topic=>topic.id)).size,100);
  assert.equal(new Set(T.items.map(topic=>topic.question)).size,100);
  assert.ok(T.items.every(topic=>topic.question && topic.starter));
});

test('mixed draws include all four topic groups and avoid recent IDs without altering ongoing stories', () => {
  const counts={real:0,absurd:0,personal:0,ideas:0};
  for(let seed=0;seed<3000;seed++)counts[create(4,{seed}).topic.category]++;
  for(const [category,weight] of Object.entries(C.mixedTopicWeights))assert.ok(Math.abs(counts[category]/3000-weight)<0.04,category+' appears in mixed');
  let state=create(4,{category:'personal'});
  state=act(state,'endTopic');
  for(let i=0;i<16;i++) {
    const previousIds=state.topicHistory.slice();
    state=act(state,'next');
    assert.equal(state.topic.category,'personal'); assert.ok(!previousIds.includes(state.topic.id));
    state=act(state,'endTopic');
  }
  state=create(4,{category:'real'}); const topic=structuredClone(state.topic);
  state=act(state,'settings'); state=act(state,'configure',{category:'ideas'});
  assert.deepEqual(state.topic,topic,'changing category keeps the current topic');
  state=act(state,'endTopic'); state=act(state,'next'); assert.equal(state.topic.category,'ideas');
});

test('new topics show their question and first speaker until the host or any active player starts', () => {
  for (const actor of [0, 1, 2, 3, 4]) {
    let s = create();
    assert.equal(s.version, 1); assert.equal(s.rulesVersion, 2); assert.equal(s.targetCuts, null); assert.equal(s.phase, 'ready');
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
  for (const type of ['settings', 'configure', 'cancelSettings', 'pause', 'resume', 'next', 'endTopic', 'stop', 'exclude']) {
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
  const cut = tick(live), handoff = act(act(live, 'pause'), 'resume'), completed = finishRound(live);
  const states = [ready, countdown, live, cut, handoff, completed, act(live, 'pause'), act(live, 'stop')];
  for (const before of states) {
    const after = act(before, 'settings');
    assert.equal(after.phase, 'setup'); assert.equal(after.version, 1);
    assert.deepEqual(after.topic, before.topic); assert.deepEqual(after.topicHistory, before.topicHistory);
    assert.equal(after.round, before.round); assert.equal(after.targetCuts, before.targetCuts);
    assert.deepEqual(after.roster, before.roster); assert.deepEqual(after.stats, before.stats);
    assert.deepEqual(after.recent, before.recent); assert.equal(after.speakerSequence, before.speakerSequence);
    assert.equal(after.cutsCompleted, before.cutsCompleted);
    assert.equal(after.deadline, null); assert.equal(after.phaseUntil, null);
    assert.equal(after.pendingDurationMs, null); assert.equal(after.speakingDurationMs, null);
    assert.equal(after.cutEvent, null); assert.equal(after.pause, null); assert.equal(after.nextSpeaker, null);
    if (before.phase === 'cut') assert.equal(after.speaker, before.nextSpeaker);
    else if (before.speaker != null) assert.equal(after.speaker, before.speaker);
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
  assert.ok(s.deadline - s.lastChangeAt >= 25000 && s.deadline - s.lastChangeAt <= 40000);
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
    assert.equal(denied.replies[0].error, 'invalid_options');
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

test('manually completed and stopped topics can be replayed after editing without resetting session fairness', () => {
  const completed = finishRound(create());
  for (const terminal of [completed, act(completed, 'stop'), act(completed, 'pause')]) {
    let s = act(terminal, 'settings');
    assert.equal(s.cutsCompleted, completed.cutsCompleted); assert.deepEqual(s.stats, completed.stats);
    assert.deepEqual(s.topic, completed.topic); assert.equal(s.round, completed.round);
    s = act(s, 'configure', { speed: 'normal' }); s = tick(begin(s));
    assert.equal(s.speakerSequence, completed.speakerSequence + 1);
    s = finishRound(s); assert.equal(s.cutsCompleted, completed.cutsCompleted + 8); assert.equal(s.targetCuts, null);
  }
});

test('editing during CUT preserves the intended next speaker and counts their fresh turn', () => {
  const cut = tick(speaking());
  assert.equal(cut.cutEvent.final, false); assert.equal(cut.targetCuts, null);
  for (const before of [cut, act(cut, 'pause')]) {
    const speaker = before.phase === 'paused' ? before.pause.nextSpeaker : before.nextSpeaker;
    const count = before.stats[speaker]?.count || 0;
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
  assert.ok(s.deadline >= 19000 && s.deadline <= 29000);
  assert.equal(act(s, 'tick', { now: s.deadline - 1 }), s);
  for (const actor of [0, 1, 2, 3, 4]) {
    const publicView = E.view(s, actor, 4000).cut;
    for (const key of ['deadline', 'phaseUntil', 'speakingDurationMs', 'pendingDurationMs', 'previousDurationMs', 'stats', 'recent', 'topicHistory', 'nextSpeaker', 'pause']) assert.equal(key in publicView, false, key);
  }
  assert.equal(s.stats[s.speaker].count, 1);
});

test('CUT holds the next speaker indefinitely; manual handoff starts speaking immediately with a fresh hidden timer', () => {
  let s = speaking(); const old = s.speaker, speakingEnd = s.deadline;
  s = tick(s); assert.equal(s.phase, 'cut'); assert.equal(s.previousSpeaker, old);
  assert.notEqual(s.nextSpeaker, old); assert.equal(s.cutEvent.to, s.nextSpeaker);
  assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
  assert.equal(E.view(s, 2, speakingEnd).cut.nextSpeaker, s.nextSpeaker);
  const next = s.nextSpeaker;
  assert.equal(s.stats[next], undefined);
  for (const waited of [60000, 300000, 1800000]) assert.equal(act(s, 'tick', { now: speakingEnd + waited }), s);
  for (const actor of [0, 1, 2, 3, 4]) {
    const view = E.view(s, actor, speakingEnd + 1800000).cut;
    assert.equal(view.canBegin, true); assert.equal(view.nextSpeaker, next);
    assert.equal('phaseUntil' in view, false); assert.equal('deadline' in view, false);
  }
  const go = speakingEnd + 1800000;
  s = act(s, 'begin', { actor: 1, now: go });
  assert.equal(s.phase, 'speaking'); assert.equal(s.speaker, next); assert.equal(s.phaseUntil, null);
  assert.equal(s.stats[next].count, 1); assert.equal(s.speakerSequence, 2);
  assert.ok(s.deadline - go >= 15000 && s.deadline - go <= 25000);
  assert.equal('nextSpeaker' in E.view(s, 1, go).cut, false);
});

test('host and player handoff requests apply once; stale, excluded and repeated starts cannot add turns', () => {
  const cut = tick(speaking());
  for (const actor of [0, 1, 2, 3, 4]) {
    const input = { id: 'handoff-' + actor, sessionId: cut.sessionId, turnId: cut.turnId,
      type: 'begin', actor, now: cut.lastChangeAt + 100000, seed: 555 };
    const started = E.apply(cut, input);
    assert.equal(started.phase, 'speaking'); assert.equal(started.speaker, cut.nextSpeaker);
    assert.equal(started.turnId, cut.turnId + 1); assert.equal(started.speakerSequence, cut.speakerSequence + 1);
    assert.deepEqual(E.apply(cut, input), started); assert.equal(E.apply(started, input), started);
    const competed = E.apply(started, { ...input, id: input.id + '-competing', actor: actor === 0 ? 1 : 0 });
    assert.equal(competed.speakerSequence, started.speakerSequence); assert.equal(competed.deadline, started.deadline);
    assert.equal(competed.replies[actor === 0 ? 1 : 0].error, 'stale_turn');
    const repeated = act(started, 'begin', { actor });
    assert.equal(repeated.replies[actor].error, 'not_available'); assert.equal(repeated.speakerSequence, started.speakerSequence);
  }
  const actor = cut.roster.find(player => player.playerNum !== cut.nextSpeaker).playerNum;
  const excluded = act(cut, 'exclude', { playerNum: actor, active: false });
  assert.equal(E.view(excluded, actor, 0).cut.canBegin, false);
  assert.equal(act(excluded, 'begin', { actor }).replies[actor].error, 'not_available');
  assert.equal(act(cut, 'begin', { actor: 88 }), cut);
  const invalidNext = { ...cut, nextSpeaker: 88 };
  assert.equal(E.view(invalidNext, 0, 0).cut.canBegin, false);
  assert.equal(act(invalidNext, 'begin').replies[0].error, 'not_available');
});

test('pausing CUT and losing either revealed player keeps a valid indefinite handoff without counting it', () => {
  const cut = tick(speaking(4));
  for (const removed of [cut.speaker, cut.nextSpeaker]) {
    let s = act(cut, 'pause');
    s = act(s, 'exclude', { playerNum: removed, active: false });
    s = act(s, 'resume', { now: s.lastChangeAt + 600000 });
    assert.equal(s.phase, 'cut'); assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
    assert.equal(s.speaker, cut.speaker); assert.notEqual(s.nextSpeaker, cut.speaker);
    assert.ok(s.roster.some(player => player.active && player.playerNum === s.nextSpeaker));
    assert.equal(s.cutEvent.id, cut.cutEvent.id); assert.equal(s.cutEvent.to, s.nextSpeaker);
    assert.deepEqual(s.stats, cut.stats); assert.equal(s.speakerSequence, cut.speakerSequence);
    assert.equal(tick(s, { now: s.lastChangeAt + 600000 }), s);
    s = begin(s); assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, cut.speakerSequence + 1);
  }
  let s = tick(speaking(2)); const next = s.nextSpeaker;
  s = act(s, 'exclude', { playerNum: next, active: false });
  assert.equal(s.phase, 'paused'); assert.equal(s.pause.phase, 'cut');
  assert.equal(act(s, 'resume').replies[0].error, 'not_enough_players');
  s = act(s, 'exclude', { playerNum: next, active: true }); s = act(s, 'resume');
  assert.equal(s.phase, 'cut'); assert.equal(s.nextSpeaker, next); assert.equal(s.phaseUntil, null);
  assert.equal(s.speakerSequence, 1);
});

test('a topic continues for at least 120 CUTs with untimed handoffs and no automatic end', () => {
  for (const count of [2, 5, 9]) {
    let s = speaking(count); const topic = structuredClone(s.topic), history = [...s.topicHistory];
    for (let cutNumber = 1; cutNumber <= 120; cutNumber++) {
      const previous = s.speaker;
      s = tick(s);
      assert.equal(s.phase, 'cut'); assert.equal(s.cutEvent.final, false); assert.equal(s.targetCuts, null);
      assert.equal(s.cutsCompleted, cutNumber); assert.equal(s.speakerSequence, cutNumber);
      assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
      assert.notEqual(s.nextSpeaker, previous); assert.equal(s.cutEvent.to, s.nextSpeaker);
      assert.deepEqual(s.topic, topic); assert.deepEqual(s.topicHistory, history); assert.equal(s.round, 1);
      assert.equal(tick(s, { now: s.lastChangeAt + 3600000 }), s);
      assert.equal(E.view(s, 0, 0).cut.canBegin, true);
      assert.equal(act(s, 'next').replies[0].error, 'not_available');
      if (cutNumber < 120) s = begin(s);
    }
    const counts = Object.values(s.stats).map(record => record.count);
    assert.equal(counts.reduce((sum, n) => sum + n, 0), 120);
    assert.equal(counts.length, count); assert.ok(Math.max(...counts) - Math.min(...counts) <= 8);
  }
});

test('host manual end clears all clocks and CUT UI while preserving the topic and fairness in every active phase', () => {
  const ready = create(), countdown = begin(ready), live = tick(countdown), cut = tick(live);
  const handoff = act(act(live, 'pause'), 'resume');
  const states = [ready, act(ready, 'settings'), countdown, live, cut, handoff,
    act(live, 'pause'), act(cut, 'pause'), act(act(ready, 'settings'), 'pause')];
  for (const before of states) {
    assert.equal(E.view(before, 0, 0).cut.canEndTopic, true);
    for (const actor of [1, 2, 3, 4]) {
      assert.equal(E.view(before, actor, 0).cut.canEndTopic, false);
      const denied = act(before, 'endTopic', { actor });
      assert.equal(denied.phase, before.phase); assert.equal(denied.replies[actor].error, 'not_available');
      assert.deepEqual(denied.stats, before.stats); assert.deepEqual(denied.topic, before.topic);
    }
    const input = { id: 'manual-end-' + before.turnId, sessionId: before.sessionId, turnId: before.turnId,
      actor: 0, type: 'endTopic', now: before.lastChangeAt + 1, seed: 448 };
    const after = E.apply(before, input);
    assert.equal(after.phase, 'break'); assert.equal(after.turnId, before.turnId + 1);
    assert.deepEqual(after.topic, before.topic); assert.deepEqual(after.topicHistory, before.topicHistory);
    assert.deepEqual(after.roster, before.roster); assert.deepEqual(after.stats, before.stats);
    assert.deepEqual(after.recent, before.recent); assert.equal(after.speakerSequence, before.speakerSequence);
    assert.equal(after.cutsCompleted, before.cutsCompleted); assert.equal(after.round, before.round);
    for (const key of ['deadline', 'phaseUntil', 'pendingDurationMs', 'speakingDurationMs', 'pause', 'cutEvent', 'speaker', 'nextSpeaker'])
      assert.equal(after[key], null, key);
    assert.equal(after.pauseReason, ''); assert.equal(after.targetCuts, null);
    assert.equal(E.view(after, 0, 0).cut.canEndTopic, false); assert.equal(E.view(after, 0, 0).cut.canBegin, false);
    assert.equal(E.apply(after, input), after); assert.deepEqual(E.apply(before, input), after);
    assert.equal(tick(after, { now: before.lastChangeAt + 3600000 }), after);
    assert.equal(act(after, 'begin').replies[0].error, 'not_available');
    assert.equal(act(after, 'endTopic').replies[0].error, 'not_available');
    const stale = act(before, 'endTopic', { turnId: before.turnId - 1 });
    assert.equal(stale.phase, before.phase); assert.equal(stale.replies[0].error, 'stale_turn');
    assert.equal(E.apply(after, { id: 'old-cut-timer', sessionId: after.sessionId, turnId: before.turnId,
      actor: 0, type: 'tick', now: 999999999, seed: 1 }), after);
  }
  const stopped = act(live, 'stop');
  assert.equal(E.view(stopped, 0, 0).cut.canEndTopic, false);
  assert.equal(act(stopped, 'endTopic').replies[0].error, 'not_available');
});

test('shared room controls permit active players to end a topic while excluding absent and unknown players', () => {
  const shared = { ...tick(speaking()), sharedControls: true };
  for (const actor of [0, 1, 2, 3, 4]) {
    assert.equal(E.view(shared, actor, 0).cut.canEndTopic, true);
    assert.equal(act(shared, 'endTopic', { actor }).phase, 'break');
  }
  const excluded = act(shared, 'exclude', { playerNum: 2, active: false });
  assert.equal(E.view(excluded, 2, 0).cut.canEndTopic, false);
  const denied = act(excluded, 'endTopic', { actor: 2 });
  assert.equal(denied.phase, 'cut'); assert.equal(denied.replies[2].error, 'not_available');
  assert.equal(E.view(shared, 88, 0).cut.canEndTopic, false);
  assert.equal(act(shared, 'endTopic', { actor: 88 }), shared);
});

test('legacy non-final CUT and automatic handoff upgrade once without drawing or counting a speaker', () => {
  const cut = tick(speaking());
  const legacyCut = { ...cut, rulesVersion: 1, targetCuts: 5, phaseUntil: cut.lastChangeAt + 900 };
  const legacyHandoff = { ...legacyCut, phase: 'handoff', speaker: cut.nextSpeaker,
    nextSpeaker: cut.nextSpeaker, countOnGo: true, pendingDurationMs: null, phaseUntil: cut.lastChangeAt + C.handoffMs };
  for (const old of [legacyCut, legacyHandoff]) {
    const upgraded = E.upgrade(old, old.lastChangeAt + 100000);
    assert.notEqual(upgraded, old); assert.equal(upgraded.phase, 'cut');
    assert.equal(upgraded.rulesVersion, 2); assert.equal(upgraded.targetCuts, null);
    assert.equal(upgraded.turnId, old.turnId + 1); assert.equal(upgraded.speaker, cut.speaker);
    assert.equal(upgraded.nextSpeaker, cut.nextSpeaker); assert.deepEqual(upgraded.cutEvent, cut.cutEvent);
    assert.equal(upgraded.phaseUntil, null); assert.equal(upgraded.deadline, null);
    assert.deepEqual(upgraded.stats, old.stats); assert.deepEqual(upgraded.recent, old.recent);
    assert.deepEqual(upgraded.topic, old.topic); assert.equal(upgraded.cutsCompleted, old.cutsCompleted);
    assert.equal(upgraded.speakerSequence, old.speakerSequence);
    assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 100000), upgraded);
    assert.equal(tick(upgraded, { now: upgraded.lastChangeAt + 600000 }), upgraded);
    const stale = act(upgraded, 'begin', { turnId: old.turnId });
    assert.equal(stale.phase, 'cut'); assert.equal(stale.replies[0].error, 'stale_turn');
    const started = begin(upgraded); assert.equal(started.phase, 'speaking'); assert.equal(started.speaker, cut.nextSpeaker);
    assert.equal(started.speakerSequence, old.speakerSequence + 1);
  }
});

test('legacy paused CUT and automatic handoff upgrade to paused waits while speaking resumes retain their clock', () => {
  const cut = tick(speaking());
  const oldCut = { ...cut, rulesVersion: 1, targetCuts: 5, phaseUntil: cut.lastChangeAt + 900 };
  const oldHandoff = { ...oldCut, phase: 'handoff', speaker: cut.nextSpeaker, nextSpeaker: cut.nextSpeaker,
    countOnGo: true, pendingDurationMs: null, phaseUntil: cut.lastChangeAt + C.handoffMs };
  for (const old of [oldCut, oldHandoff]) {
    const paused = { ...old, phase: 'paused', deadline: null, phaseUntil: null,
      pause: { phase: old.phase, remainingMs: 500, speaker: old.speaker, nextSpeaker: old.nextSpeaker,
        countOnGo: true, pendingDurationMs: null, refreshSpeaker: false } };
    const upgraded = E.upgrade(paused, paused.lastChangeAt + 100000);
    assert.equal(upgraded.rulesVersion, 2); assert.equal(upgraded.targetCuts, null);
    assert.equal(upgraded.phase, 'paused'); assert.equal(upgraded.pause.phase, 'cut'); assert.equal(upgraded.pause.remainingMs, 0);
    assert.equal(upgraded.pause.nextSpeaker, cut.nextSpeaker); assert.deepEqual(upgraded.stats, cut.stats);
    assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 1), upgraded);
    const resumed = act(upgraded, 'resume');
    assert.equal(resumed.phase, 'cut'); assert.equal(resumed.nextSpeaker, cut.nextSpeaker); assert.equal(resumed.phaseUntil, null);
    assert.equal(resumed.cutEvent.id, cut.cutEvent.id); assert.equal(resumed.speakerSequence, cut.speakerSequence);
  }
  const live = speaking(), paused = act(live, 'pause'), resumed = act(paused, 'resume');
  assert.equal(resumed.phase, 'handoff'); assert.equal(resumed.countOnGo, false);
  assert.ok(Number.isFinite(resumed.pendingDurationMs));
  for (const current of [create(), cut, paused, resumed, act(resumed, 'pause'), act(cut, 'pause')])
    assert.equal(E.upgrade(current, current.lastChangeAt + 100000), current);
});

test('legacy final CUT and paused final CUT become unlimited waits with a valid next speaker and preserved records', () => {
  const cut = tick(speaking(4));
  const final = { ...cut, rulesVersion: 1, targetCuts: cut.cutsCompleted, nextSpeaker: null,
    cutEvent: { ...cut.cutEvent, to: null, final: true }, phaseUntil: cut.lastChangeAt + 900 };
  const pausedFinal = { ...final, phase: 'paused', phaseUntil: null,
    pause: { phase: 'cut', remainingMs: 700, speaker: final.speaker, nextSpeaker: null,
      countOnGo: false, pendingDurationMs: null, refreshSpeaker: false } };
  for (const old of [final, pausedFinal]) {
    const snapshot = structuredClone(old), upgraded = E.upgrade(old, old.lastChangeAt + 100000);
    assert.deepEqual(old, snapshot);
    assert.equal(upgraded.rulesVersion, 2); assert.equal(upgraded.targetCuts, null);
    assert.equal(upgraded.phase, old.phase); assert.equal(upgraded.turnId, old.turnId + 1);
    assert.equal(upgraded.cutEvent.final, false); assert.equal(upgraded.cutEvent.id, old.cutEvent.id);
    assert.equal(upgraded.cutEvent.at, old.cutEvent.at); assert.equal(upgraded.cutEvent.from, old.cutEvent.from);
    const next = old.phase === 'paused' ? upgraded.pause.nextSpeaker : upgraded.nextSpeaker;
    assert.ok(upgraded.roster.some(player => player.active && player.playerNum === next));
    assert.notEqual(next, old.speaker); assert.equal(upgraded.cutEvent.to, next);
    assert.equal(upgraded.phaseUntil, null); assert.equal(upgraded.deadline, null);
    if (old.phase === 'paused') { assert.equal(upgraded.pause.phase, 'cut'); assert.equal(upgraded.pause.remainingMs, 0); }
    for (const key of ['topic', 'topicHistory', 'stats', 'recent']) assert.deepEqual(upgraded[key], old[key], key);
    assert.equal(upgraded.cutsCompleted, old.cutsCompleted); assert.equal(upgraded.speakerSequence, old.speakerSequence);
    assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 100000), upgraded);
    const waiting = old.phase === 'paused' ? act(upgraded, 'resume') : upgraded;
    assert.equal(tick(waiting, { now: waiting.lastChangeAt + 600000 }), waiting);
    const started = begin(waiting);
    assert.equal(started.phase, 'speaking'); assert.equal(started.speaker, next);
    assert.equal(started.speakerSequence, old.speakerSequence + 1); assert.equal(started.cutsCompleted, old.cutsCompleted);
    const again = tick(started);
    assert.equal(again.phase, 'cut'); assert.equal(again.cutEvent.final, false); assert.equal(again.cutsCompleted, old.cutsCompleted + 1);
  }
});

test('legacy free-chat break stays ended on upgrade and only a manual Next chooses another topic', () => {
  const done = finishRound(create());
  const old = { ...done, rulesVersion: 1, targetCuts: 8,
    cutEvent: { id: 'old-completed-cut', turnId: done.turnId - 1, at: done.lastChangeAt - 1,
      from: done.previousSpeaker, to: null, final: true } };
  const upgraded = E.upgrade(old, old.lastChangeAt + 100000);
  assert.equal(upgraded.rulesVersion, 2); assert.equal(upgraded.targetCuts, null); assert.equal(upgraded.phase, 'break');
  assert.equal(upgraded.cutEvent, null);
  for (const key of ['topic', 'topicHistory', 'stats', 'recent']) assert.deepEqual(upgraded[key], old[key]);
  assert.equal(upgraded.round, old.round); assert.equal(upgraded.cutsCompleted, old.cutsCompleted);
  assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 100000), upgraded);
  assert.equal(tick(upgraded, { now: upgraded.lastChangeAt + 600000 }), upgraded);
  assert.equal(act(upgraded, 'begin').replies[0].error, 'not_available');
  const next = act(upgraded, 'next');
  assert.equal(next.phase, 'ready'); assert.equal(next.round, old.round + 1);
  assert.notEqual(next.topic.id, old.topic.id); assert.equal(next.cutsCompleted, 0);
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

test('late reconnect starts one live phase and holds the next CUT until a manual handoff', () => {
  let s = begin(create());
  s = tick(s, { now: 100000 }); assert.equal(s.phase, 'speaking');
  assert.ok(s.deadline >= 115000 && s.deadline <= 125000);
  s = tick(s, { now: 300000 }); assert.equal(s.phase, 'cut'); assert.equal(s.cutsCompleted, 1);
  assert.equal(s.phaseUntil, null);
  assert.equal(tick(s, { now: 600000 }), s);
  s = act(s, 'begin', { now: 600000 }); assert.equal(s.phase, 'speaking');
  assert.ok(s.deadline >= 615000 && s.deadline <= 625000);
});

test('Next is available only after a manual topic end and keeps whole-session fairness', () => {
  for (let count = 2; count <= 9; count++) {
    let s = create(count);
    assert.equal(s.targetCuts, null);
    const ready = s, countdown = begin(s), live = tick(countdown), cut = tick(live);
    for (const before of [ready, countdown, live, cut, act(live, 'settings'), act(live, 'pause')]) {
      const premature = act(before, 'next');
      assert.equal(premature.phase, before.phase); assert.equal(premature.replies[0].error, 'not_available');
      assert.deepEqual(premature.topic, before.topic); assert.equal(premature.round, before.round);
    }
    s = finishRound(s); assert.equal(s.cutsCompleted, 8); assert.equal(s.cutEvent, null);
    assert.equal(s.speakerSequence, 8); assert.equal(s.speaker, null);
    const stats = JSON.stringify(s.stats), sequence = s.speakerSequence, topic = s.topic.id;
    assert.equal(act(s, 'tick', { now: s.lastChangeAt + 100000 }), s);
    s = act(s, 'next'); assert.equal(s.round, 2); assert.equal(s.phase, 'ready');
    assert.equal(s.cutsCompleted, 0); assert.equal(s.cutEvent, null); assert.notEqual(s.topic.id, topic);
    assert.equal(s.targetCuts, null); assert.equal(s.rulesVersion, 2);
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

test('removing an active speaker replaces them with manual prep and invalidates their old timer', () => {
  let s = speaking(); const removed = s.speaker, oldTurn = s.turnId, oldEnd = s.deadline;
  s = act(s, 'exclude', { playerNum: removed, active: false, now: s.lastChangeAt + 1000 });
  assert.equal(s.phase, 'ready'); assert.notEqual(s.speaker, removed); assert.equal(s.deadline, null);
  assert.equal(s.phaseUntil, null); assert.equal(s.speakingDurationMs, null);
  assert.equal(E.apply(s, { id: 'old-deadline', sessionId: s.sessionId, turnId: oldTurn, actor: 0, type: 'tick', now: oldEnd, seed: 1 }), s);
  const fresh = tick(begin(s)); assert.ok(fresh.deadline >= fresh.lastChangeAt + 15000);
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
  let s = tick(speaking(4)); const pending = s.nextSpeaker, current = s.speaker, event = s.cutEvent.id;
  s = act(s, 'exclude', { playerNum: pending, active: false });
  assert.equal(s.phase, 'cut'); assert.notEqual(s.nextSpeaker, pending); assert.notEqual(s.nextSpeaker, current);
  assert.equal(s.speaker, current); assert.equal(s.cutEvent.id, event); assert.equal(s.cutEvent.to, s.nextSpeaker);
  assert.equal(s.phaseUntil, null); assert.equal(s.deadline, null);
  assert.equal(s.stats[pending], undefined); assert.equal(s.pendingDurationMs, null);
  assert.equal(tick(s, { now: s.lastChangeAt + 600000 }), s);
  s = begin(s); assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 2);
});

test('paused topic can be ended manually even when too few active players remain', () => {
  let s = tick(speaking(2)); const removed = s.speaker;
  s = act(s, 'exclude', { playerNum: removed, active: false });
  assert.equal(s.phase, 'paused'); assert.equal(s.pauseReason, 'not_enough_players');
  const stats = structuredClone(s.stats), completed = s.cutsCompleted, topic = structuredClone(s.topic);
  s = act(s, 'endTopic');
  assert.equal(s.phase, 'break'); assert.equal(s.cutsCompleted, completed);
  assert.deepEqual(s.stats, stats); assert.deepEqual(s.topic, topic); assert.equal(s.cutEvent, null);
  assert.equal(act(s, 'next').replies[0].error, 'not_enough_players');
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
  s = tick(wire(s)); s = begin(wire(s));
  assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 2);
  s = act(wire(s), 'pause'); s = act(wire(s), 'resume'); s = tick(wire(s));
  assert.equal(s.phase, 'speaking'); assert.equal(s.speakerSequence, 2);
  s = finishRound(wire(s)); s = act(wire(s), 'next'); assert.equal(s.phase, 'ready');
  assert.ok(E.view(wire(s), 1, 0).cut.topic.question);
});


test('Custom defaults and boundary ranges drive every hidden speaking timer including equal minimum and maximum', () => {
  const defaults = create(4, { speed: 'custom' });
  assert.equal(defaults.customMinSeconds, 15); assert.equal(defaults.customMaxSeconds, 25);
  for (const [min, max] of [[5, 5], [120, 120], [5, 120], [17, 19], [15, 25]]) {
    let s = speaking(4, { speed: 'custom', customMinSeconds: min, customMaxSeconds: max });
    const durations = new Set();
    for (let turn = 0; turn < 60; turn++) {
      const duration = s.deadline - s.lastChangeAt;
      assert.ok(duration >= min * 1000 && duration <= max * 1000, String(duration));
      if (min === max) assert.equal(duration, min * 1000);
      durations.add(duration);
      s = begin(tick(s));
    }
    if (min < max) assert.ok(durations.size > 1);
  }
});

test('Custom ranges and pace persist after setup saves and pause/resume without exposing sampled durations', () => {
  let s = speaking(), originalTopic = structuredClone(s.topic);
  s = act(s, 'settings'); s = act(s, 'configure', { speed: 'custom', customMinSeconds: 20, customMaxSeconds: 20 });
  assert.equal(s.phase, 'ready'); assert.equal(s.speed, 'custom');
  assert.equal(s.customMinSeconds, 20); assert.equal(s.customMaxSeconds, 20);
  assert.deepEqual(s.topic, originalTopic);
  s = tick(begin(s)); assert.equal(s.deadline - s.lastChangeAt, 20000);
  for (const actor of [0, 1, 2, 3, 4]) {
    const view = E.view(s, actor, s.lastChangeAt).cut;
    assert.equal(view.speed, 'custom'); assert.equal(view.customMinSeconds, 20); assert.equal(view.customMaxSeconds, 20);
    for (const key of ['deadline', 'phaseUntil', 'speakingDurationMs', 'pendingDurationMs', 'previousDurationMs', 'pause'])
      assert.equal(key in view, false, key);
  }
  const end = s.deadline, speaker = s.speaker, stats = structuredClone(s.stats);
  s = act(s, 'pause', { now: end - 5000 }); s = act(s, 'resume', { now: end + 10000 });
  s = tick(s);
  assert.equal(s.speaker, speaker); assert.equal(s.deadline - s.lastChangeAt, 5000); assert.deepEqual(s.stats, stats);
  s = act(s, 'settings'); s = act(s, 'configure', { speed: 'chill' });
  assert.equal(s.speed, 'chill'); assert.equal(s.customMinSeconds, 20); assert.equal(s.customMaxSeconds, 20);
  s = act(s, 'settings'); s = act(s, 'configure', { speed: 'custom' });
  s = tick(begin(s)); assert.equal(s.deadline - s.lastChangeAt, 20000);
});

test('invalid custom options reject creation and setup saves atomically', () => {
  const invalid = [
    { speed: 'fast' }, { category: 'unknown' },
    { customMinSeconds: 4 }, { customMaxSeconds: 121 },
    { customMinSeconds: 26, customMaxSeconds: 25 },
    { customMinSeconds: 5.5 }, { customMaxSeconds: 25.5 },
    { customMinSeconds: NaN }, { customMaxSeconds: Infinity },
    { customMinSeconds: '15' }, { customMaxSeconds: '25' },
    { customMinSeconds: null }, { customMaxSeconds: null },
  ];
  const setup = act(speaking(), 'settings'), before = structuredClone(setup);
  for (const options of invalid) {
    assert.throws(() => create(4, { speed: 'custom', ...options }), /invalid_options/);
    const denied = act(setup, 'configure', { speed: 'custom', category: 'absurd', ...options });
    assert.equal(denied.replies[0].error, 'invalid_options');
    const stripReply = value => {
      const clone = structuredClone(value); delete clone.seen; delete clone.replies; return clone;
    };
    assert.deepEqual(stripReply(denied), stripReply(setup));
    assert.deepEqual(setup, before);
  }
  const valid = act(setup, 'configure', { speed: 'custom', customMinSeconds: 5, customMaxSeconds: 120 });
  assert.equal(valid.phase, 'ready'); assert.equal(valid.customMinSeconds, 5); assert.equal(valid.customMaxSeconds, 120);
});


test('legacy states without rulesVersion migrate once without resetting an active or paused speaking clock', () => {
  const ready = create(), live = speaking(), paused = act(live, 'pause', { now: live.deadline - 4321 });
  const resumePrep = act(paused, 'resume');
  for (const before of [ready, live, paused, resumePrep]) {
    const old = { ...before, targetCuts: 5 };
    delete old.rulesVersion; delete old.customMinSeconds; delete old.customMaxSeconds;
    const snapshot = structuredClone(old);
    const upgraded = E.upgrade(old, old.lastChangeAt + 100000);
    assert.deepEqual(old, snapshot);
    assert.equal(upgraded.rulesVersion, 2); assert.equal(upgraded.targetCuts, null);
    assert.equal(upgraded.customMinSeconds, 15); assert.equal(upgraded.customMaxSeconds, 25);
    assert.equal(upgraded.phase, old.phase); assert.equal(upgraded.speaker, old.speaker);
    assert.equal(upgraded.deadline, old.deadline); assert.equal(upgraded.phaseUntil, old.phaseUntil);
    assert.equal(upgraded.pendingDurationMs, old.pendingDurationMs); assert.deepEqual(upgraded.pause, old.pause);
    assert.equal(upgraded.speakingDurationMs, old.speakingDurationMs);
    for (const key of ['stats', 'recent', 'topic', 'topicHistory']) assert.deepEqual(upgraded[key], old[key], key);
    assert.equal(upgraded.cutsCompleted, old.cutsCompleted); assert.equal(upgraded.speakerSequence, old.speakerSequence);
    assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 100000), upgraded);
  }
});
