const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../cut-engine.js');
const C = require('../cut-config.js');
let serial = 0;
const create = (extra = {}, count = 4) => E.create({ id: 'topic-clock-room', now: 1000, seed: 8192,
  roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) })),
  speed: 'custom', customMinSeconds: 120, customMaxSeconds: 120, ...extra });
const act = (state, type, extra = {}) => E.apply(state, { id: 'clock-command-' + ++serial,
  sessionId: state.sessionId, turnId: state.turnId, actor: 0, type,
  seed: serial * 753, now: state.lastChangeAt + 1, ...extra });
const tick = (state, extra = {}) => act(state, 'tick', {
  now: state.phase === 'speaking' ? state.deadline : state.phaseUntil, ...extra });
const go = (state, now = state.lastChangeAt) => {
  const prepared = act(state, 'begin', { now });
  return prepared.phase === 'countdown' ? tick(prepared) : prepared;
};
const elapsed = (state, now) => state.topicClock.elapsedMs +
  (Number.isFinite(state.topicClock.runningSince) ? Math.max(0, now - state.topicClock.runningSince) : 0);
const withoutLedger = state => {
  const clone = structuredClone(state); delete clone.seen; delete clone.replies; return clone;
};

test('topic clock defaults to 10 minutes and only the first GO starts its visible countdown', () => {
  assert.deepEqual(C.topicTiming, { defaultMinutes: 10, minMinutes: 1, maxMinutes: 60 });
  assert.ok(Object.isFrozen(C.topicTiming));
  const ready = create();
  assert.equal(ready.topicMinutes, 10);
  assert.deepEqual(ready.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: null });
  const countdown = act(ready, 'begin', { now: 900000 });
  assert.equal(countdown.phase, 'countdown'); assert.equal(countdown.phaseUntil, 903000);
  assert.deepEqual(countdown.topicClock, ready.topicClock);
  assert.equal(tick(countdown, { now: 902999 }), countdown);
  const live = tick(countdown);
  assert.equal(live.phase, 'speaking');
  assert.deepEqual(live.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: 903000 });
  assert.equal(elapsed(live, 909000), 6000);
  assert.deepEqual(ready.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: null });
});

test('overall time reaching zero never CUTs, ends, or changes a topic, and handoffs remain available', () => {
  const live = go(create({ topicMinutes: 1 }));
  const atReminder = live.topicClock.runningSince + 60000;
  assert.equal(tick(live, { now: atReminder }), live);
  assert.equal(live.phase, 'speaking'); assert.equal(live.cutsCompleted, 0);
  const cut = tick(live);
  assert.equal(cut.phase, 'cut'); assert.equal(cut.cutsCompleted, 1);
  assert.deepEqual(cut.topic, live.topic); assert.equal(cut.round, live.round);
  assert.deepEqual(cut.topicClock, live.topicClock);
  const late = cut.lastChangeAt + 900000;
  assert.equal(tick(cut, { now: late }), cut);
  assert.equal(E.view(cut, cut.nextSpeaker, late).cut.canBegin, true);
  const continued = act(cut, 'begin', { now: late, actor: cut.nextSpeaker });
  assert.equal(continued.phase, 'speaking'); assert.equal(continued.deadline, late + 120000);
  assert.deepEqual(continued.topic, live.topic); assert.equal(continued.cutsCompleted, 1);
  assert.equal(continued.speakerSequence, 2); assert.deepEqual(continued.topicClock, live.topicClock);
  const ended = act(continued, 'endTopic', { now: late + 2000 });
  assert.equal(ended.phase, 'break'); assert.equal(ended.topicClock.runningSince, null);
  assert.equal(ended.topicClock.elapsedMs, late + 2000 - live.topicClock.runningSince);
  assert.ok(ended.topicClock.elapsedMs > ended.topicClock.durationMs);
});

test('repeated CUT waits and direct Starts retain one continuous topic clock anchor', () => {
  let state = go(create({ topicMinutes: 1, customMinSeconds: 5, customMaxSeconds: 5 }));
  const anchor = state.topicClock.runningSince, topic = structuredClone(state.topic);
  for (let turn = 0; turn < 12; turn++) {
    state = tick(state);
    assert.equal(state.phase, 'cut'); assert.equal(state.cutsCompleted, turn + 1);
    const nextTime = state.lastChangeAt + 70000;
    assert.equal(tick(state, { now: nextTime }), state);
    state = act(state, 'begin', { now: nextTime });
    assert.deepEqual(state.topicClock, { durationMs: 60000, elapsedMs: 0, runningSince: anchor });
    assert.deepEqual(state.topic, topic);
  }
  assert.ok(elapsed(state, state.lastChangeAt) > 60000);
  assert.equal(state.speakerSequence, 13);
});

test('speaking pause and its resume preparation freeze both clocks until GO without another fairness count', () => {
  const live = go(create());
  const pauseAt = live.lastChangeAt + 21000;
  const paused = act(live, 'pause', { now: pauseAt });
  assert.deepEqual(paused.topicClock, { durationMs: 600000, elapsedMs: 21000, runningSince: null });
  assert.equal(paused.pause.remainingMs, 99000);
  assert.equal(tick(paused, { now: pauseAt + 900000 }), paused);
  const preparation = act(paused, 'resume', { now: pauseAt + 600000 });
  assert.equal(preparation.phase, 'handoff');
  assert.deepEqual(preparation.topicClock, paused.topicClock);
  const resumed = tick(preparation);
  assert.deepEqual(resumed.topicClock, { durationMs: 600000, elapsedMs: 21000, runningSince: preparation.phaseUntil });
  assert.equal(resumed.deadline, preparation.phaseUntil + 99000);
  assert.deepEqual(resumed.stats, live.stats); assert.equal(resumed.speakerSequence, 1);
  const again = act(resumed, 'pause', { now: resumed.lastChangeAt + 2000 });
  assert.equal(again.topicClock.elapsedMs, 23000); assert.equal(again.topicClock.runningSince, null);
});

test('paused CUT freezes accumulated speaking and waiting time, then resumes waiting time immediately', () => {
  const live = go(create());
  const cut = tick(live), pauseAt = cut.lastChangeAt + 230000;
  const paused = act(cut, 'pause', { now: pauseAt });
  assert.equal(paused.pause.phase, 'cut');
  assert.deepEqual(paused.topicClock, { durationMs: 600000, elapsedMs: 350000, runningSince: null });
  const resumeAt = pauseAt + 900000, resumed = act(paused, 'resume', { now: resumeAt });
  assert.equal(resumed.phase, 'cut'); assert.equal(resumed.phaseUntil, null);
  assert.deepEqual(resumed.topicClock, { durationMs: 600000, elapsedMs: 350000, runningSince: resumeAt });
  assert.equal(elapsed(resumed, resumeAt + 9000), 359000);
  assert.equal(resumed.cutEvent.id, cut.cutEvent.id); assert.deepEqual(resumed.stats, cut.stats);
  assert.equal(tick(resumed, { now: resumeAt + 9000 }), resumed);
});

test('ready, setup, and opening countdown pauses never start the overall clock', () => {
  const ready = create();
  const setup = act(ready, 'settings');
  const countdown = act(ready, 'begin', { now: 10000 });
  for (const before of [ready, setup, countdown]) {
    const paused = act(before, 'pause', { now: before.lastChangeAt + 100 });
    const resumed = act(paused, 'resume', { now: before.lastChangeAt + 900000 });
    assert.equal(resumed.phase, before.phase);
    assert.deepEqual(resumed.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: null });
    if (before.phase === 'countdown') assert.equal(tick(resumed).topicClock.runningSince, resumed.phaseUntil);
  }
});

test('settings save changes only the duration, retains elapsed time, and waits for GO again', () => {
  const live = go(create());
  const setup = act(live, 'settings', { now: live.lastChangeAt + 23000 });
  assert.equal(setup.phase, 'setup');
  assert.deepEqual(setup.topicClock, { durationMs: 600000, elapsedMs: 23000, runningSince: null });
  const saved = act(setup, 'configure', { topicMinutes: 3, now: setup.lastChangeAt + 300000 });
  assert.equal(saved.phase, 'ready'); assert.equal(saved.topicMinutes, 3);
  assert.deepEqual(saved.topicClock, { durationMs: 180000, elapsedMs: 23000, runningSince: null });
  assert.deepEqual(saved.topic, live.topic); assert.deepEqual(saved.stats, live.stats);
  const countdown = act(saved, 'begin', { now: saved.lastChangeAt + 120000 });
  assert.deepEqual(countdown.topicClock, saved.topicClock);
  const continued = tick(countdown);
  assert.equal(continued.topicClock.elapsedMs, 23000);
  assert.equal(continued.topicClock.runningSince, countdown.phaseUntil);
  assert.deepEqual(continued.stats, live.stats);
  const cut = tick(continued), intended = cut.nextSpeaker;
  const edit = act(cut, 'settings', { now: cut.lastChangeAt + 14000 });
  assert.equal(edit.speaker, intended); assert.equal(edit.topicClock.runningSince, null);
  assert.equal(edit.topicClock.elapsedMs, 23000 + 120000 + 14000);
  const cancelled = act(edit, 'cancelSettings', { now: edit.lastChangeAt + 300000 });
  assert.equal(cancelled.phase, 'ready'); assert.equal(cancelled.topicMinutes, 3);
  assert.deepEqual(cancelled.topicClock, edit.topicClock);
  assert.deepEqual(cancelled.topic, live.topic);
});

test('extending or shortening expired topic time preserves overtime and never auto-ends', () => {
  const live = go(create({ topicMinutes: 1 }));
  const cut = tick(live);
  const edit = act(cut, 'settings', { now: cut.lastChangeAt + 130000 });
  assert.equal(edit.topicClock.elapsedMs, 250000);
  const extended = act(edit, 'configure', { topicMinutes: 10 });
  assert.deepEqual(extended.topicClock, { durationMs: 600000, elapsedMs: 250000, runningSince: null });
  const unchanged = act(act(extended, 'settings'), 'configure', { speed: 'chill' });
  assert.equal(unchanged.topicMinutes, 10); assert.equal(unchanged.topicClock.elapsedMs, 250000);
  const reduced = act(act(unchanged, 'settings'), 'configure', { topicMinutes: 1 });
  assert.deepEqual(reduced.topicClock, { durationMs: 60000, elapsedMs: 250000, runningSince: null });
  assert.equal(reduced.phase, 'ready'); assert.deepEqual(reduced.topic, live.topic);
  assert.equal(tick(reduced, { now: reduced.lastChangeAt + 600000 }), reduced);
  assert.equal(go(reduced).phase, 'speaking');
});

test('manual topic end and Stop freeze once, while Next and shared Restart reset full configured time', () => {
  const live = go(create({ topicMinutes: 7 }));
  const ended = act(live, 'endTopic', { now: live.lastChangeAt + 43000 });
  assert.deepEqual(ended.topicClock, { durationMs: 420000, elapsedMs: 43000, runningSince: null });
  assert.equal(tick(ended, { now: ended.lastChangeAt + 600000 }), ended);
  const next = act(ended, 'next', { now: ended.lastChangeAt + 600000 });
  assert.equal(next.topicMinutes, 7);
  assert.deepEqual(next.topicClock, { durationMs: 420000, elapsedMs: 0, runningSince: null });
  assert.notEqual(next.topic.id, live.topic.id); assert.deepEqual(next.stats, live.stats);
  const stopped = act(live, 'stop', { now: live.lastChangeAt + 47000 });
  assert.deepEqual(stopped.topicClock, { durationMs: 420000, elapsedMs: 47000, runningSince: null });
  assert.equal(tick(stopped, { now: stopped.lastChangeAt + 600000 }), stopped);
  const restarted = act({ ...stopped, sharedControls: true }, 'restart', { now: stopped.lastChangeAt + 900000 });
  assert.equal(restarted.phase, 'ready'); assert.equal(restarted.topicMinutes, 7);
  assert.deepEqual(restarted.topicClock, { durationMs: 420000, elapsedMs: 0, runningSince: null });
  assert.equal(restarted.speed, 'custom'); assert.equal(restarted.customMaxSeconds, 120);
  assert.deepEqual(restarted.stats, {}); assert.equal(restarted.speakerSequence, 0);
  const reopened = act(stopped, 'settings', { now: stopped.lastChangeAt + 100000 });
  assert.deepEqual(reopened.topicClock, stopped.topicClock);
});

test('roster changes keep active CUT time running and freeze replacement or insufficient-player preparation', () => {
  const live = go(create());
  const changed = act(live, 'exclude', { playerNum: live.roster.find(p => p.playerNum !== live.speaker).playerNum,
    active: false, now: live.lastChangeAt + 3000 });
  assert.equal(changed.phase, 'speaking'); assert.deepEqual(changed.topicClock, live.topicClock);
  const replaced = act(live, 'exclude', { playerNum: live.speaker, active: false, now: live.lastChangeAt + 7000 });
  assert.equal(replaced.phase, 'ready');
  assert.deepEqual(replaced.topicClock, { durationMs: 600000, elapsedMs: 7000, runningSince: null });
  const cut = tick(live);
  const newNext = act(cut, 'exclude', { playerNum: cut.nextSpeaker, active: false, now: cut.lastChangeAt + 9000 });
  assert.equal(newNext.phase, 'cut'); assert.deepEqual(newNext.topicClock, cut.topicClock);
  const smallLive = go(create({}, 2)), smallCut = tick(smallLive);
  const paused = act(smallCut, 'exclude', { playerNum: smallCut.nextSpeaker, active: false,
    now: smallCut.lastChangeAt + 11000 });
  assert.equal(paused.phase, 'paused');
  assert.deepEqual(paused.topicClock, { durationMs: 600000, elapsedMs: 131000, runningSince: null });
  const returned = act(paused, 'exclude', { playerNum: smallCut.nextSpeaker, active: true,
    now: paused.lastChangeAt + 100000 });
  assert.deepEqual(returned.topicClock, paused.topicClock);
  const resumed = act(returned, 'resume', { now: returned.lastChangeAt + 200000 });
  assert.equal(resumed.phase, 'cut'); assert.equal(resumed.topicClock.elapsedMs, 131000);
  assert.equal(resumed.topicClock.runningSince, returned.lastChangeAt + 200000);
});

test('illegal topic minutes reject create and configuration without changing timer or game state', () => {
  for (const topicMinutes of [1, 60]) {
    assert.equal(create({ topicMinutes }).topicClock.durationMs, topicMinutes * 60000);
  }
  const setup = act(go(create()), 'settings');
  const snapshot = structuredClone(setup);
  for (const topicMinutes of [0, 61, -1, 1.5, null, '10', NaN, Infinity, true, [], {}]) {
    assert.throws(() => create({ topicMinutes }), /invalid_options/);
    const denied = act(setup, 'configure', { topicMinutes, speed: 'chaos', category: 'ideas' });
    assert.equal(denied.replies[0].error, 'invalid_options');
    assert.deepEqual(withoutLedger(denied), withoutLedger(setup));
    assert.deepEqual(setup, snapshot);
  }
  for (const topicMinutes of [1, 60]) {
    const saved = act(setup, 'configure', { topicMinutes });
    assert.equal(saved.topicMinutes, topicMinutes);
    assert.equal(saved.topicClock.durationMs, topicMinutes * 60000);
    assert.equal(saved.topicClock.elapsedMs, setup.topicClock.elapsedMs);
  }
});

test('legacy states initialize a fresh ten-minute clock once without guessing old elapsed or changing private timing', () => {
  const ready = create(), countdown = act(ready, 'begin'), live = tick(countdown), cut = tick(live);
  const states = [ready, countdown, live, cut, act(live, 'pause'), act(cut, 'pause'),
    act(live, 'settings'), act(live, 'endTopic'), act(live, 'stop'), act(act(live, 'pause'), 'resume')];
  for (const before of states) {
    const old = structuredClone(before);
    delete old.topicMinutes; delete old.topicClock;
    const snapshot = structuredClone(old), now = old.lastChangeAt + 900000;
    const upgraded = E.upgrade(old, now);
    assert.deepEqual(old, snapshot); assert.notEqual(upgraded, old);
    assert.equal(upgraded.topicMinutes, 10);
    assert.deepEqual(upgraded.topicClock, { durationMs: 600000, elapsedMs: 0,
      runningSince: ['speaking', 'cut'].includes(upgraded.phase) ? now : null });
    for (const key of ['phase', 'speaker', 'nextSpeaker', 'topic', 'topicHistory', 'stats', 'recent',
      'cutsCompleted', 'speakerSequence', 'deadline', 'phaseUntil', 'pendingDurationMs', 'pause', 'speakingDurationMs']) {
      assert.deepEqual(upgraded[key], old[key], key);
    }
    assert.equal(upgraded.turnId, old.turnId + 1);
    assert.equal(E.upgrade(upgraded, now + 900000), upgraded);
  }
});

test('legacy automatic handoff becomes waiting CUT with a fresh running clock and retains its revealed speaker', () => {
  const live = go(create()), cut = tick(live);
  const old = { ...structuredClone(cut), phase: 'handoff', speaker: cut.nextSpeaker,
    countOnGo: true, pendingDurationMs: null, phaseUntil: cut.lastChangeAt + 3000 };
  delete old.topicMinutes; delete old.topicClock;
  const now = old.lastChangeAt + 900000, upgraded = E.upgrade(old, now);
  assert.equal(upgraded.phase, 'cut'); assert.equal(upgraded.nextSpeaker, cut.nextSpeaker);
  assert.equal(upgraded.cutEvent.id, cut.cutEvent.id);
  assert.deepEqual(upgraded.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: now });
  assert.deepEqual(upgraded.stats, cut.stats); assert.deepEqual(upgraded.topic, cut.topic);
  assert.equal(E.upgrade(upgraded, now + 100000), upgraded);
  assert.equal(tick(upgraded, { now: now + 100000 }), upgraded);
  const pausedOld = { ...structuredClone(old), phase: 'paused', pause: { phase: 'handoff',
    speaker: cut.nextSpeaker, nextSpeaker: cut.nextSpeaker, remainingMs: 3000, countOnGo: true, pendingDurationMs: null } };
  const pausedUpgraded = E.upgrade(pausedOld, now);
  assert.equal(pausedUpgraded.phase, 'paused'); assert.equal(pausedUpgraded.pause.phase, 'cut');
  assert.deepEqual(pausedUpgraded.topicClock, { durationMs: 600000, elapsedMs: 0, runningSince: null });
  const resumed = act(pausedUpgraded, 'resume', { now: now + 100000 });
  assert.equal(resumed.topicClock.runningSince, now + 100000);
});

test('upgrading other legacy rules and reconnecting preserves an existing clock without resets or double counting', () => {
  const live = go(create({ topicMinutes: 6 }));
  const paused = act(live, 'pause', { now: live.lastChangeAt + 9000 });
  const again = go(act(paused, 'settings'), paused.lastChangeAt + 100000);
  for (const before of [live, tick(live), paused, again]) {
    const old = { ...structuredClone(before), rulesVersion: 1, targetCuts: 6 };
    const upgraded = E.upgrade(old, old.lastChangeAt + 900000);
    assert.deepEqual(upgraded.topicClock, before.topicClock);
    assert.equal(upgraded.topicMinutes, 6);
    assert.deepEqual(upgraded.stats, before.stats); assert.deepEqual(upgraded.topic, before.topic);
    assert.equal(E.upgrade(upgraded, upgraded.lastChangeAt + 900000), upgraded);
  }
  const copy = JSON.parse(JSON.stringify(tick(live)));
  assert.equal(E.upgrade(copy, copy.lastChangeAt + 900000), copy);
  assert.equal(tick(copy, { now: copy.lastChangeAt + 900000 }), copy);
  assert.deepEqual(copy.topicClock, live.topicClock);
});

test('public projection exposes exactly the overall clock while keeping sampled speaking timing and fairness private', () => {
  const live = go(create({ topicMinutes: 17 }));
  const cut = tick(live), paused = act(live, 'pause'), setup = act(live, 'settings');
  for (const state of [create(), live, cut, paused, setup, act(live, 'endTopic'), act(live, 'stop')]) {
    const snapshot = structuredClone(state);
    for (const actor of [0, 1, 2, 3, 4]) {
      const view = E.view(state, actor, state.lastChangeAt + 900000).cut;
      assert.equal(view.topicMinutes, state.topicMinutes);
      assert.deepEqual(view.topicClock, state.topicClock);
      assert.deepEqual(Object.keys(view.topicClock).sort(), ['durationMs', 'elapsedMs', 'runningSince']);
      for (const key of ['deadline', 'phaseUntil', 'speakingDurationMs', 'pendingDurationMs', 'previousDurationMs',
        'pause', 'stats', 'recent', 'speakerSequence', 'seen']) assert.equal(key in view, false, key);
      view.topicClock.elapsedMs = 999999; view.topicClock.runningSince = 999999;
    }
    assert.deepEqual(state, snapshot);
  }
  const omittedNull = structuredClone(paused); delete omittedNull.topicClock.runningSince;
  assert.equal(E.upgrade(omittedNull, paused.lastChangeAt + 900000), omittedNull);
  assert.deepEqual(E.view(omittedNull, 1, 0).cut.topicClock, paused.topicClock);
  const resumed = tick(act(omittedNull, 'resume', { now: paused.lastChangeAt + 900000 }));
  assert.equal(resumed.topicClock.elapsedMs, paused.topicClock.elapsedMs);
  assert.equal(resumed.topicClock.runningSince, resumed.lastChangeAt);
});

test('transaction retries and stale or repeated commands cannot accrue an elapsed span twice', () => {
  const live = go(create());
  const command = { id: 'pause-once', sessionId: live.sessionId, turnId: live.turnId, actor: 0,
    type: 'pause', now: live.lastChangeAt + 25000, seed: 1 };
  const paused = E.apply(live, command);
  assert.deepEqual(E.apply(live, command), paused); assert.equal(E.apply(paused, command), paused);
  assert.equal(paused.topicClock.elapsedMs, 25000);
  const stale = E.apply(paused, { ...command, id: 'pause-stale', now: command.now + 900000 });
  assert.equal(stale.replies[0].error, 'stale_turn'); assert.deepEqual(stale.topicClock, paused.topicClock);
  const denied = act(paused, 'pause', { now: paused.lastChangeAt + 900000 });
  assert.equal(denied.replies[0].error, 'not_available'); assert.deepEqual(denied.topicClock, paused.topicClock);
  const resumed = tick(act(paused, 'resume', { now: paused.lastChangeAt + 900000 }));
  const stopped = act(resumed, 'stop', { now: resumed.lastChangeAt + 3000 });
  assert.equal(stopped.topicClock.elapsedMs, 28000);
  assert.equal(E.upgrade(stopped, stopped.lastChangeAt + 900000), stopped);
});
