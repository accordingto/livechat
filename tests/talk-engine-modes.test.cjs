const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../talk-engine.js');
const topic = { id: 'modes', question: 'What would a talking chair say?' };
let sequence = 0;
const create = (options = {}) => E.create({ id: 'mode-session', topic, now: 1000,
  roster: [7, 2, 5].map(playerNum => ({ playerNum, name: 'Player ' + playerNum })), ...options });
const act = (state, type, actor = 0, extra = {}) => E.apply(state, { id: 'mode-action-' + ++sequence,
  sessionId: state.sessionId, turnId: state.turnId, now: 2000, seed: sequence * 991, type, actor, ...extra });

test('assigned conversation follows the saved roster through rounds regardless of readiness or legacy requests', () => {
  let state = create({ conversationMode: 'assigned' });
  state = act(state, 'wait', 7); state = act(state, 'ready', 5); state = act(state, 'start');
  for (let round = 1; round <= 5; round++) {
    for (const expected of [7, 2, 5]) {
      assert.equal(state.round, round); assert.equal(state.speaker, expected);
      for (const seat of state.roster) if (seat.playerNum !== expected) state = act(state, 'share', seat.playerNum);
      state = act(state, 'end', expected);
    }
  }
  assert.equal(E.view(state, 7, 0).talk.conversationMode, 'assigned');
});

test('assigned recovery skips absent participants and retains roster order for the next round', () => {
  let state = act(create({ conversationMode: 'assigned', sharedControls: true }), 'start');
  state = act(state, 'recover', 2, { onlineNums: [2, 5] });
  assert.equal(state.speaker, 2); assert.deepEqual(E.order(state), [5]);
  state = act(state, 'end', 5, { onlineNums: [2, 5] }); assert.equal(state.speaker, 5);
  state = act(state, 'end', 2, { onlineNums: [2, 5] }); assert.equal(state.speaker, 2);
  assert.deepEqual(E.order(state), [5]);
});

test('free conversation starts with all participants and never assigns or advances an individual speaker', () => {
  let state = act(create({ conversationMode: 'free', sharedControls: true, gameMode: 'crazy', gameSeconds: 60, crazyTaskSeconds: 30, crazyMinSeconds: 5, crazyMaxSeconds: 5 }), 'start', 2);
  assert.equal(state.phase, 'talking'); assert.equal(state.speaker, null); assert.equal(state.turnId, 1);
  assert.deepEqual(state.remaining, []); assert.deepEqual(E.order(state), []);
  for (const seat of state.roster) {
    const view = E.view(state, seat.playerNum, 0).talk;
    assert.equal(view.conversationMode, 'free'); assert.equal(view.actions.end, false); assert.equal(view.isNext, false);
  }
  const turn = state.turnId;
  state = act(state, 'end', 2); assert.equal(state.replies[2].error, 'not_available');
  state = act(state, 'recover', 5, { onlineNums: [2, 5] });
  assert.equal(state.speaker, null); assert.equal(state.turnId, turn);
  state = act(state, 'crazySend', 2); assert.deepEqual(state.crazy.prompts, {});
  state = act(state, 'crazyTick', 2, { now: state.crazy.nextAssignAt });
  assert.equal(Object.keys(state.crazy.prompts).length, 1); assert.equal(state.speaker, null);
  assert.equal(state.crazy.nextAt, undefined);
  const active = Object.values(state.crazy.prompts)[0];
  assert.equal(active.expiresAt - active.at, 30000);
  assert.deepEqual(E.view(state, 2, active.at).talk.scores, [7, 2, 5].map(playerNum => ({ playerNum, score: 0 })));
  state = act(state, 'clockTick', 0, { now: state.gameDeadline });
  assert.equal(state.phase, 'ended'); assert.equal(state.speaker, null);
  assert.equal(Object.values(state.crazy.prompts)[0].status, 'cancelled');
});

test('legacy states retain random conversation and mixed prompts without losing saved assignments', () => {
  let state = act(create({ gameMode: 'crazy' }), 'start');
  state = act(state, 'crazyTick', 0, { now: state.crazy.nextAssignAt });
  delete state.conversationMode; delete state.crazy.source;
  const previous = JSON.stringify(state.crazy.prompts);
  const view = E.view(state, 2, 0).talk;
  assert.equal(view.conversationMode, 'random'); assert.equal(view.crazy.source, 'mixed');
  state = act(state, 'end', 0, { now: state.crazy.lastAssignAt + 1 }); assert.equal(JSON.stringify(state.crazy.prompts), previous);
});

test('new topic accepts, preserves and validates both conversation and Crazy prompt-source settings', () => {
  const options = { confirm: true, topic, mode: 'think', seconds: 45, gameMode: 'crazy', crazySeconds: 60,
    showStarters: true, conversationMode: 'free', crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 300 };
  let state = act(create({ sharedControls: true }), 'newTopic', 2, options);
  assert.equal(state.conversationMode, 'free'); assert.equal(state.crazy.source, 'players');
  const { conversationMode, crazySource, crazySeconds, crazyMinSeconds, crazyMaxSeconds, ...legacyOptions } = options;
  state = act(state, 'newTopic', 5, legacyOptions);
  assert.equal(state.conversationMode, 'free'); assert.equal(state.crazy.source, 'players');
  assert.equal(state.crazy.minSeconds, 5); assert.equal(state.crazy.maxSeconds, 300);
  for (const extra of [{ conversationMode: 'unknown' }, { crazySource: 'unknown' }, { crazySource: true },
    { crazyMinSeconds: 4 }, { crazyMaxSeconds: 301 }, { crazyMinSeconds: 10, crazyMaxSeconds: 5 }, { crazyMinSeconds: 5.5 }]) {
    const next = act(state, 'newTopic', 2, { ...options, ...extra });
    assert.equal(next.sessionId, state.sessionId); assert.equal(next.replies[2].error, 'invalid_settings');
  }
});
