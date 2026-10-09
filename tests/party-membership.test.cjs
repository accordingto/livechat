// Dynamic membership uses only synthetic canonical states, never live cards.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CUT = require('../cut-engine.js');
const MIC = require('../open-mic-engine.js');
const TALK = require('../talk-engine.js');
const { adapters: party } = require('../runtime/party-executor.cjs');
const { adapters: story } = require('../runtime/story-executor.cjs');
const roster = [1, 2, 3].map(playerNum => ({ playerNum, name: 'Player ' + playerNum }));
let sequence = 0;
const create = (engine, options = {}) => engine.create({ id: 'membership-room', roster, now: 1000, seed: 51,
  topic: { question: 'What would we build together?' }, sharedControls: true, ...options });
const act = (engine, state, type, extra = {}) => engine.apply(state, { id: 'action-' + ++sequence,
  sessionId: state.sessionId, turnId: state.turnId, actor: 0, now: Math.max(2000, (state.lastChangeAt || 0) + 1), seed: 59, type, ...extra });
const join = (engine, state, change = {}, extra = {}) => engine.membership(state, { added: [], roster: [], inactiveNums: [], ...change },
  { id: 'members-' + ++sequence, now: Math.max(2000, (state.lastChangeAt || 0) + 1), seed: 17, ...extra });
const seat4 = { playerNum: 4, name: 'New friend', token: 'secret-card', originalToken: 'secret-original', identityId: 'private-identity', historyToken: 'private-history' };

test('CUT appends a future draw without touching its current speaker, topic clock or session fairness', () => {
  let state = act(CUT, create(CUT), 'begin');
  state = CUT.apply(state, { id: 'go', sessionId: state.sessionId, turnId: state.turnId, actor: 0, type: 'tick', now: state.phaseUntil, seed: 7 });
  const before = structuredClone(state), next = join(CUT, state, { added: [seat4] });
  assert.deepEqual(state, before); assert.equal(next.sessionId, state.sessionId); assert.equal(next.phase, 'speaking');
  for (const key of ['speaker', 'turnId', 'deadline', 'speakingDurationMs', 'topicMinutes', 'round', 'cutsCompleted', 'speakerSequence']) assert.equal(next[key], state[key]);
  for (const key of ['topic', 'topicClock', 'stats', 'recent', 'topicHistory']) assert.deepEqual(next[key], state[key]);
  assert.deepEqual(next.roster.at(-1), { playerNum: 4, name: 'New friend', active: true });
  assert.doesNotMatch(JSON.stringify(next), /secret-card|secret-original|private-identity|private-history/);
  let drawn = false;
  for (let seed = 1; seed <= 60; seed++) {
    const chosen = CUT.apply(next, { id: 'cut-' + seed, sessionId: next.sessionId, turnId: next.turnId,
      actor: 0, type: 'tick', now: next.deadline, seed });
    if (chosen.nextSpeaker === 4) drawn = true;
  }
  assert.equal(drawn, true, 'newcomer is eligible on the next actual draw');
});

test('CUT marks a departing speaker away, preserves earned records and pauses meaningfully below two', () => {
  const state = create(CUT), speaker = state.speaker, remaining = roster.filter(p => p.playerNum !== speaker).map(p => p.playerNum);
  const next = join(CUT, state, { inactiveNums: [speaker] });
  assert.notEqual(next.speaker, speaker); assert.equal(next.phase, 'ready'); assert.equal(next.roster.find(p => p.playerNum === speaker).active, false);
  assert.equal(next.speakerSequence, state.speakerSequence); assert.deepEqual(next.stats, state.stats);
  const paused = join(CUT, next, { inactiveNums: [speaker, remaining[0]] });
  assert.equal(paused.phase, 'paused'); assert.equal(paused.pauseReason, 'not_enough_players');
  const restored = join(CUT, paused, { inactiveNums: [speaker] });
  assert.equal(restored.phase, 'paused', 'adding a player never secretly resumes a paused clock');
});

test('CUT membership preserves an already paused topic and lets the host deliberately resume after returns', () => {
  let state = act(CUT, create(CUT), 'begin'); state = act(CUT, state, 'pause');
  const next = join(CUT, state, { added: [seat4] });
  assert.deepEqual(next.pause, state.pause); assert.equal(next.phase, 'paused'); assert.deepEqual(next.topicClock, state.topicClock);
  assert.equal(act(CUT, next, 'resume').phase, 'countdown');
});

test('Open Mic appends a rotation seat and blank favorites without clearing team points or the current song', () => {
  let state = act(MIC, create(MIC), 'success');
  state = act(MIC, state, 'selectSong', { videoId: state.songLibrary[0].videoId }); state = act(MIC, state, 'startSinging');
  state.mySongs[1] = [state.songLibrary[0].videoId];
  const before = structuredClone(state), next = join(MIC, state, { added: [seat4] });
  assert.deepEqual(state, before);
  for (const key of ['teamScore', 'spotlight', 'phase', 'round', 'turnId', 'singingStartedAt', 'sessionId']) assert.equal(next[key], state[key]);
  assert.deepEqual(next.selectedSong, state.selectedSong); assert.deepEqual(next.songLibrary, state.songLibrary);
  assert.deepEqual(next.mySongs[1], state.mySongs[1]); assert.deepEqual(next.mySongs[4], []);
  let flow = next;
  for (const expected of [2, 3, 4, 1]) { flow = act(MIC, flow, 'next'); assert.equal(flow.spotlight, expected); }
});

test('Open Mic skips a departed Spotlight without awarding their unfinished singing and permits deliberate return', () => {
  let state = act(MIC, create(MIC), 'success'); state = act(MIC, state, 'selectSong', { videoId: state.songLibrary[0].videoId });
  state = act(MIC, state, 'startSinging'); const score = state.teamScore;
  const next = join(MIC, state, { inactiveNums: [1] });
  assert.equal(next.teamScore, score); assert.equal(next.spotlight, 2); assert.equal(next.phase, 'challenge');
  const restored = join(MIC, next); assert.equal(restored.roster[0].active, true); assert.equal(restored.spotlight, 2);
});

test('Talk joins the future queue with zero points and keeps the live topic, clocks, score and private missions', () => {
  let state = act(TALK, create(TALK, { conversationMode: 'assigned', gameMode: 'crazy' }), 'start');
  state.scores[2] = 3; state.crazy.prompts[3] = { id: 'private-prompt', text: 'Own secret task', status: 'pending', expiresAt: 100000 };
  const before = structuredClone(state), next = join(TALK, state, { added: [seat4] });
  assert.deepEqual(state, before); assert.equal(next.sessionId, state.sessionId); assert.equal(next.speaker, 1); assert.equal(next.scores[2], 3); assert.equal(next.scores[4], 0);
  for (const key of ['gameDeadline', 'deadline', 'phase', 'round', 'turnId']) assert.equal(next[key], state[key]);
  assert.deepEqual(next.topic, state.topic); assert.deepEqual(next.crazy, state.crazy); assert.deepEqual(TALK.order(next), [2, 3, 4]);
  assert.equal(story.letstalk.project(next, { playerNum: 4 }, { now: 2000 }).talk.crazy.prompt, null);
  assert.doesNotMatch(JSON.stringify(TALK.view(next, 4, 2000)), /secret-card|secret-original|private-prompt|Own secret task/);
});

test('Talk departure removes the absent speaker and questions, cancels only their unfinished task and preserves earned points', () => {
  let state = act(TALK, create(TALK, { conversationMode: 'assigned', gameMode: 'crazy' }), 'start');
  state.scores[1] = 5; state.crazy.prompts[1] = { id: 'departing-task', text: 'Old task', status: 'pending', expiresAt: 100000 };
  state.crazy.prompts[3] = { id: 'other-task', text: 'Kept task', status: 'pending', expiresAt: 100000 };
  state.questions = [{ id: 'absent-question', playerNum: 1 }, { id: 'other-question', playerNum: 3 }];
  state.activeQuestion = { id: 'absent-question', playerNum: 1 };
  const next = join(TALK, state, { inactiveNums: [1] });
  assert.equal(next.speaker, 2); assert.equal(next.scores[1], 5); assert.equal(next.crazy.prompts[1].status, 'cancelled');
  assert.deepEqual(next.crazy.prompts[3], state.crazy.prompts[3]); assert.equal(next.activeQuestion, null);
  assert.equal(next.gameDeadline, state.gameDeadline); assert.equal(next.phase, 'talking');
  const own = TALK.view(next, 1, 2000).talk; assert.equal(own.hostControls, false); assert.equal(own.actions.rejoin, true); assert.equal(own.crazy.prompt, null);
  const attack = act(TALK, next, 'addTime', { actor: 1, seconds: 60 });
  assert.equal(attack.replies[1].error, 'not_available'); assert.equal(attack.gameDeadline, next.gameDeadline);
  const done = act(TALK, next, 'crazyDone', { actor: 1, promptId: 'departing-task' }); assert.equal(done.scores[1], 5);
  const restored = act(TALK, next, 'exclude', { actor: 1, playerNum: 1, active: true });
  assert.equal(restored.roster[0].active, true); assert.equal(restored.speaker, 2); assert.equal(restored.scores[1], 5);
});

test('Talk free mode accepts new players without assigning a speaker or resetting the game countdown', () => {
  const state = act(TALK, create(TALK, { conversationMode: 'free' }), 'start'), next = join(TALK, state, { added: [seat4] });
  assert.equal(next.speaker, null); assert.deepEqual(next.remaining, []); assert.deepEqual(TALK.order(next), []);
  assert.equal(next.gameDeadline, state.gameDeadline); assert.equal(next.phase, 'talking');
  assert.equal(TALK.view(next, 4, 2000).talk.hostControls, true);
});

test('Talk preserves explicit away flags when choosing a fresh topic and never assigns Crazy work to away seats', () => {
  let state = act(TALK, create(TALK, { conversationMode: 'assigned', gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5 }), 'start');
  state = join(TALK, state, { inactiveNums: [3] });
  const due = state.crazy.nextAssignAt;
  state = act(TALK, state, 'clockTick', { now: due, onlineNums: [1, 2, 3] });
  assert.equal(state.crazy.prompts[3], undefined);
  const queued = act(TALK, state, 'crazyAssign', { actor: 1, target: 3, text: 'Do not deliver', now: due + 1 });
  assert.equal(queued.replies[1].error, 'invalid_target');
  const fresh = act(TALK, state, 'newTopic', { confirm: true, topic: { question: 'Choose our next plan.' }, mode: 'think', seconds: 45,
    gameMode: 'crazy', crazySeconds: 120, showStarters: true });
  assert.equal(fresh.roster[2].active, false); assert.equal(fresh.phase, 'thinking');
  assert.equal(act(TALK, fresh, 'start', { onlineNums: [1, 3] }).replies[0].error, 'waiting_players');
});

test('membership rejects duplicate seats, unknown away numbers and the tenth ordinal atomically', () => {
  for (const engine of [CUT, MIC, TALK]) {
    const state = create(engine), before = structuredClone(state);
    for (const change of [{ added: [roster[0]] }, { added: [seat4, seat4] }, { added: [{ playerNum: 10, name: 'Out of range' }] }, { inactiveNums: [99] }]) assert.throws(() => join(engine, state, change), /invalid_roster|invalid_player/);
    assert.deepEqual(state, before);
    assert.throws(() => engine.membership(state, {}, { now: NaN }), /invalid_time/);
  }
});

test('party adapters expose authenticated membership, remove explicit-away recovery markers and publish no capabilities', () => {
  for (const [name, engine] of [['cut', CUT], ['openmic', MIC]]) {
    const state = create(engine); state.runtimeOfflineNums = [3]; state.roster[2].active = false;
    const next = party[name].membership(state, { added: [seat4], roster: [{ playerNum: 2, name: 'Updated name' }], inactiveNums: [3] }, { id: 'authoritative-update', now: 2000, seed: 8 });
    assert.equal(next.sharedControls, true); assert.deepEqual(next.runtimeOfflineNums, []);
    assert.equal(next.roster[1].name, 'Updated name'); assert.equal(next.roster[2].active, false);
    const restored = party[name].apply(next, { id: 'recovery-click', sessionId: next.sessionId, turnId: next.turnId, type: 'recover' },
      { now: 2001, actor: 2, seat: { playerNum: 2 }, onlineNums: [1, 2, 3, 4], seed: 8 });
    assert.equal(restored.roster[2].active, false, 'presence recovery cannot undo an explicit away choice');
    assert.doesNotMatch(JSON.stringify(party[name].project(next, { playerNum: 4 }, { now: 2000 })), /secret-card|secret-original|private-identity|private-history/);
  }
});


test('Talk remains readable while everyone is away and resumes future turns with a new or returning seat', () => {
  const state = act(TALK, create(TALK, { conversationMode: 'assigned' }), 'start');
  const idle = join(TALK, state, { inactiveNums: [1, 2, 3] });
  assert.equal(idle.speaker, null); assert.equal(idle.phase, 'talking'); assert.equal(idle.gameDeadline, state.gameDeadline);
  assert.equal(TALK.view(idle, 2, 2000).talk.membership.activeCount, 0);
  const next = join(TALK, idle, { added: [seat4], inactiveNums: [1, 3] });
  assert.equal(next.roster[1].active, true); assert.equal(next.speaker, 4); assert.equal(next.gameDeadline, state.gameDeadline);
  assert.equal(TALK.view(next, 2, 2000).talk.membership.activeCount, 2);
});
