// Synthetic server execution: no Host object, Firebase or live room needed.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { adapters: A } = require('../runtime/party-executor.cjs');
const CUT = require('../cut-engine.js');
const MIC = require('../open-mic-engine.js');
const roster = [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Person ' + playerNum }));
const create = engine => engine.create({ id: 'independent-room', roster, now: 1000, seed: 456 });
let serial = 0;
const context = (state, number = 2, extra = {}) => ({ code: 'EXAMPLE', now: state.lastChangeAt + 1, actor: number,
  seat: { playerNum: number, token: 'private-seat-token', path: 'private-seat-path' }, seats: roster,
  onlineNums: [1, 2, 3, 4], seed: 715, ...extra });
const cmd = (state, type, extra = {}) => ({ id: 'command-' + ++serial, sessionId: state.sessionId, turnId: state.turnId, type, ...extra });
const act = (adapter, state, type, number = 2, extra = {}, ctx = {}) => adapter.apply(state, cmd(state, type, extra), context(state, number, ctx));

test('party adapters load original engines and preserve canonical document metadata', () => {
  for (const [name, engine] of [['cut', CUT], ['openmic', MIC]]) {
    const original = create(engine), raw = { state: original, revision: 9, owner: 'server-owner', leaseUntil: 9000, opening: { sessionId: original.sessionId } };
    assert.deepEqual(A[name].decode(raw), original);
    const encoded = A[name].encode(raw, A[name].pulse(original, context(original)));
    assert.equal(encoded.revision, 10); assert.equal(encoded.owner, raw.owner); assert.equal(encoded.leaseUntil, raw.leaseUntil);
    assert.deepEqual(encoded.opening, raw.opening); assert.equal(encoded.state, undefined);
    assert.equal(A[name].decode(encoded).sharedControls, true);
    assert.equal(A[name].session(A[name].decode(encoded)), original.sessionId);
  }
});

test('CUT stays on the same topic through unlimited server-driven handoffs until players agree to end it', () => {
  let state = create(CUT);
  state = act(A.cut, state, 'begin'); assert.equal(state.phase, 'countdown');
  state = A.cut.pulse(state, context(state, 2, { now: state.phaseUntil })); assert.equal(state.phase, 'speaking');
  const topic = state.topic.id, round = state.round;
  for (let turn = 0; turn < 25; turn++) {
    const speaker = state.speaker, deadline = state.deadline;
    state = A.cut.pulse(state, context(state, 2, { now: deadline }));
    assert.equal(state.phase, 'cut'); assert.equal(state.cutEvent.from, speaker);
    assert.equal(state.cutEvent.final, false); assert.equal(state.topic.id, topic); assert.equal(state.round, round);
    assert.equal(A.cut.pulse(state, context(state, 2, { now: deadline + 1000000 })), state, 'waiting does not end this topic');
    const earlyNext = act(A.cut, state, 'next', 3);
    assert.equal(earlyNext.replies[3].error, 'not_available'); assert.equal(earlyNext.topic.id, topic);
    state = act(A.cut, state, 'begin', 3); assert.equal(state.phase, 'speaking');
  }
  assert.equal(state.cutsCompleted, 25);
  const ending = cmd(state, 'endTopic');
  state = A.cut.apply(state, ending, context(state, 3)); assert.equal(state.phase, 'break');
  assert.equal(state.deadline, null); assert.equal(state.topic.id, topic);
  assert.equal(A.cut.apply(state, ending, context(state, 3)), state, 'repeated consent click has no second effect');
  const endedStats = state.stats;
  state = act(A.cut, state, 'next', 3); assert.equal(state.round, round + 1); assert.equal(state.phase, 'ready');
  assert.notEqual(state.topic.id, topic); assert.deepEqual(state.stats, endedStats);
  state = act(A.cut, state, 'pause', 4); assert.equal(state.phase, 'paused');
  state = act(A.cut, state, 'resume', 3); assert.equal(state.phase, 'ready');
});

test('custom time survives server execution, settings and next topic while each hidden deadline stays private', () => {
  let state = CUT.create({ id: 'custom-runtime-room', roster, now: 1000, seed: 456,
    speed: 'custom', customMinSeconds: 18, customMaxSeconds: 18 });
  state = act(A.cut, state, 'begin');
  state = A.cut.pulse(state, context(state, 2, { now: state.phaseUntil }));
  assert.equal(state.deadline - state.lastChangeAt, 18000);
  const payload = A.cut.project(state, { playerNum: 2 }, context(state));
  assert.equal(payload.cut.customMinSeconds, 18); assert.equal(payload.cut.customMaxSeconds, 18);
  assert.equal(payload.cut.deadline, undefined); assert.equal(payload.cut.speakingDurationMs, undefined);
  const topic = state.topic.id;
  state = act(A.cut, state, 'settings', 0);
  state = act(A.cut, state, 'configure', 0, { speed: 'custom', customMinSeconds: 30, customMaxSeconds: 30 });
  assert.equal(state.phase, 'ready'); assert.equal(state.topic.id, topic);
  state = act(A.cut, state, 'begin', 1);
  state = A.cut.pulse(state, context(state, 1, { now: state.phaseUntil }));
  assert.equal(state.deadline - state.lastChangeAt, 30000);
  state = act(A.cut, state, 'endTopic', 2); state = act(A.cut, state, 'next', 1);
  assert.equal(state.speed, 'custom'); assert.equal(state.customMinSeconds, 30); assert.equal(state.customMaxSeconds, 30);
});

test('server controls do not expose CUT timing, next draw, room paths, or credentials', () => {
  let state = act(A.cut, create(CUT), 'begin');
  state = A.cut.pulse(state, context(state, 2, { now: state.phaseUntil }));
  const payload = A.cut.project(state, { playerNum: 2, token: 'private-seat-token', path: 'private-seat-path' }, context(state, 2, { revision: 16 }));
  assert.equal(payload.cut.sharedControls, true); assert.equal(payload.cut.canManage, true); assert.equal(payload.cut.revision, 16);
  for (const key of ['deadline', 'speakingDurationMs', 'stats', 'recent', 'nextSpeaker', 'runtimeOfflineNums']) assert.equal(payload.cut[key], undefined);
  assert.doesNotMatch(JSON.stringify(payload), /private-seat-token|private-seat-path/);
});

test('legacy rooms cannot opt into management by forging a player command flag', () => {
  for (const [engine, type] of [[CUT, 'pause'], [MIC, 'success']]) {
    const state = create(engine);
    const result = engine.apply(state, { ...cmd(state, type), actor: 2, now: 1001, seed: 1, sharedControls: true });
    assert.equal(result.replies[2].error, 'not_available'); assert.equal(result.sharedControls, undefined);
  }
});

test('server binds actor, timestamp and randomness instead of trusting mailbox authority', () => {
  const state = create(CUT), command = cmd(state, 'tick', { actor: 0, now: 999999, seed: 2 });
  const result = A.cut.apply(state, command, context(state));
  assert.equal(result.replies[2].error, 'not_available'); assert.equal(result.phase, 'ready');
  assert.equal(result.replies[0], undefined);
  assert.equal(act(A.cut, state, 'tick').replies[2].error, 'not_available');
});

test('CUT recovery skips only confirmed missing seats and replaces the absent speaker without counting a turn', () => {
  let state = act(A.cut, create(CUT), 'begin');
  state = A.cut.pulse(state, context(state, 2, { now: state.phaseUntil }));
  const missing = state.speaker, onlineNums = roster.map(p => p.playerNum).filter(n => n !== missing), number = onlineNums[0];
  const fairnessCount = state.speakerSequence, recovery = cmd(state, 'recover', { playerNum: number, active: false, actor: 0 });
  const next = A.cut.apply(state, recovery, context(state, number, { onlineNums }));
  assert.equal(next.phase, 'ready'); assert.notEqual(next.speaker, missing); assert.equal(next.speakerSequence, fairnessCount);
  assert.equal(next.roster.find(p => p.playerNum === missing).active, false);
  assert.equal(next.roster.find(p => p.playerNum === number).active, true, 'mailbox cannot forge the recovery roster');
  assert.deepEqual(next.runtimeOfflineNums, [missing]); assert.equal(next.replies[number].id, recovery.id);
  assert.equal(A.cut.apply(next, recovery, context(next, number, { onlineNums })), next, 'same recovery cannot run twice');
});

test('no pulse automatically removes players, and recovery without presence knows nobody is absent', () => {
  for (const [name, engine] of [['cut', CUT], ['openmic', MIC]]) {
    const state = create(engine), ctx = context(state, 2, { onlineNums: [] });
    assert.ok(A[name].pulse(state, ctx).roster.every(p => p.active));
    const unknown = A[name].apply(state, cmd(state, 'recover'), context(state, 2, { onlineNums: undefined }));
    assert.ok(unknown.roster.every(p => p.active)); assert.equal(unknown.replies[2].error, '');
  }
});

test('recovery restores returned seats, preserves manual sit-outs and rejects stale or absent requests', () => {
  for (const [name, engine] of [['cut', CUT], ['openmic', MIC]]) {
    let state = act(A[name], create(engine), 'exclude', 2, { playerNum: 4, active: false });
    state = act(A[name], state, 'recover', 2, {}, { onlineNums: [1, 2, 4] });
    assert.deepEqual(state.runtimeOfflineNums, [3]);
    const stale = A[name].apply(state, cmd(state, 'recover', { turnId: state.turnId - 1 }), context(state));
    assert.equal(stale.replies[2].error, 'stale_turn'); assert.deepEqual(stale.roster, state.roster);
    const absent = act(A[name], state, 'recover', 3, {}, { onlineNums: [1, 2, 4] });
    assert.equal(absent.replies[3].error, 'not_available');
    const restored = act(A[name], state, 'recover', 3, {}, { onlineNums: new Set([1, 2, 3, 4]) });
    assert.equal(restored.roster.find(p => p.playerNum === 3).active, true);
    assert.equal(restored.roster.find(p => p.playerNum === 4).active, false);
    assert.deepEqual(restored.runtimeOfflineNums, []);
    const selfReturn = act(A[name], restored, 'exclude', 4, { playerNum: 4, active: true });
    assert.equal(selfReturn.roster.find(p => p.playerNum === 4).active, true);
  }
});

test('long recovery IDs remain valid for every synthetic exclusion and are acknowledged once', () => {
  for (const [name, engine] of [['cut', CUT], ['openmic', MIC]]) {
    const state = create(engine), command = cmd(state, 'recover', { id: 'x'.repeat(100) });
    const next = A[name].apply(state, command, context(state, 2, { onlineNums: [2, 4] }));
    assert.deepEqual(next.runtimeOfflineNums.sort(), [1, 3]);
    assert.equal(next.roster.find(p => p.playerNum === 1).active, false);
    assert.equal(next.roster.find(p => p.playerNum === 3).active, false);
    assert.equal(next.replies[2].id, command.id);
  }
});

test('Open Mic cooperative players judge and rotate, while the server never judges or advances on time', () => {
  let state = create(MIC);
  state = act(A.openmic, state, 'success', 2); assert.equal(state.phase, 'choice'); assert.equal(state.teamScore, 2);
  const repeated = act(A.openmic, state, 'success', 3); assert.equal(repeated.teamScore, 2); assert.equal(repeated.replies[3].error, 'not_available');
  const ticked = A.openmic.pulse(state, context(state, 2, { now: 999999 })); assert.equal(ticked, state);
  assert.equal(act(A.openmic, state, 'selectSong', 3, { videoId: state.songLibrary[0].videoId }).replies[3].error, 'not_available');
  state = act(A.openmic, state, 'next', 3); assert.equal(state.spotlight, 2); assert.equal(state.phase, 'challenge'); assert.equal(state.teamScore, 2);
  state = act(A.openmic, state, 'failed', 4); assert.equal(state.phase, 'choice'); assert.equal(state.teamScore, 2);
  state = act(A.openmic, state, 'selectSong', 2, { videoId: state.songLibrary[0].videoId });
  state = act(A.openmic, state, 'startSinging', 2); assert.equal(state.phase, 'singing');
  assert.equal(A.openmic.pulse(state, context(state, 2, { now: 999999 })), state);
  state = act(A.openmic, state, 'finishSinging', 2); assert.equal(state.teamScore, 3);
  assert.equal(act(A.openmic, state, 'finishSinging', 2).teamScore, 3);
  state = act(A.openmic, state, 'next', 4); assert.equal(state.spotlight, 3); assert.equal(state.teamScore, 3);
});

test('absent Open Mic Spotlight recovery starts the next turn without awarding an unfinished activity', () => {
  let state = act(A.openmic, create(MIC), 'success', 3);
  state = act(A.openmic, state, 'selectSong', 1, { videoId: state.songLibrary[0].videoId });
  state = act(A.openmic, state, 'startSinging', 1);
  const staleFinish = cmd(state, 'finishSinging');
  state = act(A.openmic, state, 'recover', 3, {}, { onlineNums: [2, 3, 4] });
  assert.equal(state.spotlight, 2); assert.equal(state.phase, 'challenge'); assert.equal(state.teamScore, 2);
  const result = A.openmic.apply(state, staleFinish, context(state, 1));
  assert.equal(result.replies[1].error, 'stale_turn'); assert.equal(result.teamScore, 2);
  const view = A.openmic.project(state, { playerNum: 3 }, context(state, 3));
  assert.equal(view.openmic.sharedControls, true); assert.equal(view.openmic.canManage, true); assert.deepEqual(view.openmic.songLyrics, {});
  assert.equal(view.openmic.runtimeOfflineNums, undefined);
});


test('server topic clocks survive timeout, pauses and shared settings without exposing hidden CUT deadlines', () => {
  let state = CUT.create({ id:'topic-clock-service', roster, now:1000, seed:456, topicMinutes:1, speed:'custom', customMinSeconds:5, customMaxSeconds:5 });
  state = act(A.cut,state,'begin');
  state = A.cut.pulse(state,context(state,2,{now:state.phaseUntil}));
  const started = state.topicClock.runningSince, topic = state.topic.id, hiddenDeadline = state.deadline;
  state = A.cut.pulse(state,context(state,2,{now:hiddenDeadline}));
  assert.equal(state.phase,'cut'); assert.equal(state.topicClock.runningSince,started);
  const expired = started+60001;
  assert.equal(A.cut.pulse(state,context(state,2,{now:expired})),state,'clock expiry alone never advances CUT or writes an idle tick');
  const view = A.cut.project(state,{playerNum:3},context(state,3,{now:expired})).cut;
  assert.equal(view.topicMinutes,1); assert.equal(view.topicClock.durationMs,60000); assert.equal(view.topicClock.runningSince,started);
  assert.equal(view.deadline,undefined); assert.equal(view.pendingDurationMs,undefined); assert.equal(view.speakingDurationMs,undefined);
  state = act(A.cut,state,'begin',3,{}, {now:expired});
  assert.equal(state.phase,'speaking'); assert.equal(state.topic.id,topic);
  state = act(A.cut,state,'pause',2,{}, {now:expired+1});
  const frozen = state.topicClock.elapsedMs; assert.ok(frozen>=60001); assert.equal(state.topicClock.runningSince,null);
  const persisted = A.cut.decode(A.cut.encode({revision:1},state));
  assert.deepEqual(persisted.topicClock,state.topicClock);
  state = act(A.cut,persisted,'settings',3,{}, {now:expired+5000});
  state = act(A.cut,state,'configure',2,{topicMinutes:2},{now:expired+5001});
  assert.equal(state.topicMinutes,2); assert.equal(state.topicClock.durationMs,120000); assert.equal(state.topicClock.elapsedMs,frozen);
  state = act(A.cut,state,'endTopic',3,{}, {now:expired+5002});
  state = act(A.cut,state,'next',2,{}, {now:expired+5003});
  assert.deepEqual(state.topicClock,{durationMs:120000,elapsedMs:0,runningSince:null});
});
