'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../cut-engine.js');
const H = require('../cut-halloween-topics.js');
const T = require('../cut-topics.js');
const J = require('../cut-jump-topics.js');
const UI = require('../cut-ui.js');
const { adapters } = require('../runtime/party-executor.cjs');
const roster = [1, 2, 3, 4].map(playerNum => ({ playerNum, name: 'Player ' + playerNum }));
let serial = 0;
const create = options => E.create({ id: 'cut-story-style', roster, now: 1000, seed: 41, edition: 'halloween', ...options });
const command = (state, type, extra = {}) => ({ id: 'story-style-' + ++serial, type, actor: 0, sessionId: state.sessionId,
  turnId: state.turnId, now: state.lastChangeAt + 1, seed: serial * 619, ...extra });
const act = (state, type, extra) => E.apply(state, command(state, type, extra));
function ok(state, type, extra) {
  const next = act(state, type, extra);
  assert.equal(next.replies?.[extra?.actor || 0]?.error || '', '', type);
  return next;
}
const pool = (mode, style = 'story_openings') => (style === 'story_openings' ? H.storyOpenings : H)[mode === 'jump' ? 'jump' : 'take'].items;
const ids = (mode, style) => new Set(pool(mode, style).map(t => t.id));
const startSpeaking = state => { const prep = ok(state, 'begin'); return ok(prep, 'tick', { now: prep.phaseUntil }); };
const select = (state, extra) => ok(ok(state, 'settings'), 'configure', extra);

test('story openings are an additional original bank for both modes, with all old banks kept', () => {
  assert.equal(H.take.items.length, 40); assert.equal(H.jump.items.length, 30);
  assert.equal(H.storyOpenings.take.items.length, 40); assert.equal(H.storyOpenings.jump.items.length, 30);
  const all = [...H.take.items, ...H.jump.items, ...H.storyOpenings.take.items, ...H.storyOpenings.jump.items];
  assert.equal(new Set(all.map(t => t.id)).size, 140);
  const classicIds = new Set([...T.items, ...J.items].map(t => t.id));
  for (const row of [...H.storyOpenings.take.items, ...H.storyOpenings.jump.items]) {
    assert.ok(!classicIds.has(row.id));
    assert.equal(row.category, 'halloween');
    assert.ok(row.question.length >= 40 && row.question.length <= 300, row.id);
    assert.doesNotMatch(row.question, /^(?:Tell us|Describe|Imagine|What |If you |Do you |Would you )/i, 'an incident in progress rather than a situation question');
    assert.doesNotMatch(row.question + ' ' + (row.starter || ''), /[<>]|\b(?:blood|bloody|gore|corpse|murder|stab|guts)\b/i);
  }
  for (const row of H.storyOpenings.take.items) assert.match(row.starter, /…$/);
  for (const row of H.storyOpenings.jump.items) assert.equal(row.starter, undefined);
});

test('original situations stay the default, and legacy live rooms keep their topic, history and deadline', () => {
  for (const mode of ['classic', 'jump']) {
    let state = startSpeaking(create({ mode }));
    assert.equal(state.topicStyle, 'situations'); assert.ok(ids(mode, 'situations').has(state.topic.id));
    delete state.topicStyle;
    const before = structuredClone(state), view = E.view(state, 2, state.lastChangeAt + 5000).cut;
    assert.equal(view.topicStyle, 'situations');
    assert.deepEqual(view.topicStyles, ['situations', 'story_openings']);
    assert.deepEqual(state, before, 'projection never migrates or redraws canonical state');
    const untouched = E.apply(state, command(state, 'tick', { now: state.deadline - 1 }));
    assert.equal(untouched, state); assert.equal(untouched.deadline, before.deadline);
    assert.deepEqual(untouched.topic, before.topic);
    assert.deepEqual(untouched.topicHistory, before.topicHistory);
    assert.deepEqual(untouched.jumpTopicHistory, before.jumpTopicHistory);
  }
});

test('the authority draws the selected story pool, respects recent history and never mixes the original pools', () => {
  for (const mode of ['classic', 'jump']) {
    let state = create({ mode, topicStyle: 'story_openings' });
    const expected = ids(mode), count = mode === 'jump' ? 30 : 16, seen = new Set();
    for (let i = 0; i < count; i++) {
      assert.ok(expected.has(state.topic.id), state.topic.id);
      assert.ok(!seen.has(state.topic.id), 'no recent repeat'); seen.add(state.topic.id);
      assert.equal(state.phase, 'ready'); assert.equal(state.deadline, null);
      state = ok(ok(state, 'endTopic'), 'next');
    }
    assert.equal(seen.size, count);
  }
});

test('style comparison opens a new ready topic in setup, preserving clocks/settings/fairness/history boundaries', () => {
  for (const mode of ['classic', 'jump']) {
    let state = startSpeaking(create({ mode }));
    const before = structuredClone(state), oldId = state.topic.id;
    const key = mode === 'jump' ? 'jumpTopicHistory' : 'topicHistory';
    state = select(state, { topicStyle: 'story_openings' });
    assert.equal(state.topicStyle, 'story_openings'); assert.ok(ids(mode).has(state.topic.id));
    assert.equal(state.round, before.round + 1); assert.equal(state.phase, 'ready');
    assert.equal(state.deadline, null); assert.equal(state.phaseUntil, null);
    assert.ok(state[key].includes(oldId) && state[key].includes(state.topic.id), 'both histories survive the style comparison');
    assert.equal(state.sessionId, before.sessionId); assert.deepEqual(state.roster, before.roster);
    for (const field of ['stats', 'mainStats', 'interruptStats', 'recent', 'interruptRecent']) assert.deepEqual(state[field], before[field], field);
    assert.equal(state.speed, before.speed); assert.equal(state.mainMinutes, before.mainMinutes);
    assert.equal(state.topicMinutes, before.topicMinutes);
    state = select(state, { topicStyle: 'situations' });
    assert.ok(ids(mode, 'situations').has(state.topic.id));
    assert.notEqual(state.topic.id, oldId, 'switching back does not erase the original recent topic');
  }
});

test('same-style saves and cancel keep the current story and elapsed speaking time', () => {
  for (const mode of ['classic', 'jump']) {
    let state = startSpeaking(create({ mode, topicStyle: 'story_openings' }));
    const topic = structuredClone(state.topic), round = state.round;
    state = ok(state, 'settings', { now: state.lastChangeAt + 4300 });
    const key = mode === 'jump' ? 'mainClock' : 'topicClock', elapsed = state[key].elapsedMs;
    assert.ok(elapsed >= 4300);
    state = ok(state, 'configure', { topicStyle: 'story_openings', speed: 'chill' });
    assert.deepEqual(state.topic, topic); assert.equal(state.round, round);
    assert.equal(state[key].elapsedMs, elapsed); assert.equal(state[key].runningSince, null);
    state = ok(ok(state, 'settings'), 'cancelSettings');
    assert.deepEqual(state.topic, topic); assert.equal(state[key].elapsedMs, elapsed);
  }
});

test('mode changes and both restart branches preserve the chosen style and normal restart fences', () => {
  let state = { ...create({ topicStyle: 'story_openings' }), sharedControls: true };
  for (const mode of ['jump', 'classic']) {
    state = select(state, { mode });
    assert.equal(state.topicStyle, 'story_openings'); assert.ok(ids(mode).has(state.topic.id));
    const request = command(state, 'restart'), before = state;
    state = E.apply(state, request);
    assert.equal(state.replies[0].error, ''); assert.equal(state.topicStyle, 'story_openings');
    assert.equal(state.mode, mode); assert.ok(ids(mode).has(state.topic.id));
    assert.equal(state.sessionId, before.sessionId); assert.equal(state.turnId, before.turnId + 1);
    assert.equal(state.phase, 'ready'); assert.equal(state.deadline, null);
    assert.deepEqual(E.apply(state, request), state, 'a resend cannot restart twice');
  }
});

test('invalid/stale/unauthorized style changes cannot replace a live or current topic', () => {
  assert.throws(() => create({ topicStyle: 'automatic_mix' }), /invalid_options/);
  for (const mode of ['classic', 'jump']) {
    let state = create({ mode });
    const direct = act(state, 'configure', { topicStyle: 'story_openings' });
    assert.equal(direct.replies[0].error, 'not_available'); assert.deepEqual(direct.topic, state.topic);
    state = ok(state, 'settings');
    const invalid = act(state, 'configure', { topicStyle: 'automatic_mix' });
    assert.equal(invalid.replies[0].error, 'invalid_options'); assert.deepEqual(invalid.topic, state.topic);
    const other = act(state, 'configure', { actor: 2, topicStyle: 'story_openings' });
    assert.equal(other.replies[2].error, 'not_available'); assert.deepEqual(other.topic, state.topic);
    const stale = act({ ...state, sharedControls: true }, 'configure', { actor: 2, topicStyle: 'story_openings', turnId: state.turnId - 1 });
    assert.equal(stale.replies[2].error, 'stale_turn'); assert.deepEqual(stale.topic, state.topic);
  }
});

test('classic edition remains on its original pools even if a Halloween style preference is saved', () => {
  for (const mode of ['classic', 'jump']) {
    let state = create({ mode, edition: 'classic', topicStyle: 'story_openings' });
    const classicPool = new Set((mode === 'jump' ? J : T).items.map(t => t.id));
    assert.ok(classicPool.has(state.topic.id));
    const topic = structuredClone(state.topic), round = state.round;
    state = select(state, { topicStyle: 'situations' });
    assert.deepEqual(state.topic, topic); assert.equal(state.round, round);
    state = select(state, { edition: 'halloween', topicStyle: 'story_openings' });
    assert.ok(ids(mode).has(state.topic.id));
  }
});

test('independent executor accepts the same authoritative style setting and exposes only public metadata', () => {
  let state = { ...create(), sharedControls: true };
  const apply = (type, extra = {}) => {
    const input = command(state, type, extra);
    const ctx = { seat: { playerNum: 2 }, now: input.now, seed: input.seed, onlineNums: [1, 2, 3, 4] };
    state = adapters.cut.apply(state, input, ctx); assert.equal(state.replies[2].error, '');
  };
  apply('settings'); apply('configure', { topicStyle: 'story_openings' });
  assert.ok(ids('classic').has(state.topic.id));
  for (const playerNum of [1, 2, 3, 4]) {
    const view = adapters.cut.project(state, { playerNum }, { now: state.lastChangeAt, revision: 12 }).cut;
    assert.equal(view.topicStyle, 'story_openings'); assert.deepEqual(view.topicStyles, ['situations', 'story_openings']);
    assert.equal(view.topic.id, state.topic.id);
    for (const secret of ['deadline', 'speakingDurationMs', 'stats', 'topicHistory', 'jumpTopicHistory']) assert.equal(secret in view, false);
  }
});

test('shared settings and input transport advertise story choices only when the executor supports them', t => {
  const state = ok({ ...create(), sharedControls: true }, 'settings');
  const cut = E.view(state, 1, state.lastChangeAt).cut;
  const element = { innerHTML: '', addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
  const card = new UI.Card(element, { send: async () => {}, now: () => state.lastChangeAt }); t.after(() => card.destroy());
  card.update({ playerNum: 1, name: 'Player 1', cut });
  assert.match(element.innerHTML, /name="topicStyle"/); assert.match(element.innerHTML, /value="story_openings"/);
  const values = { speed: 'normal', category: 'mixed', topicMinutes: '10', mode: 'classic', mainMinutes: '4', edition: 'halloween', topicStyle: 'story_openings' };
  const form = { querySelector(selector) { const key = /name="([^"]+)"/.exec(selector)?.[1]; return key in values ? { value: values[key] } : null; } };
  assert.equal(card.settingsInput(form).topicStyle, 'story_openings');
  assert.equal(card.canAction('configure', card.settingsInput(form)), true);
  delete values.topicStyle;
  assert.equal('topicStyle' in card.settingsInput(form), false, 'an old form adds no unsupported field');
  const legacy = { ...cut }; delete legacy.topicStyle; delete legacy.topicStyles;
  card.update({ playerNum: 1, name: 'Player 1', cut: legacy });
  assert.doesNotMatch(element.innerHTML, /name="topicStyle"/);
  assert.equal(card.canAction('configure', { ...card.settingsInput(form), topicStyle: 'story_openings' }), false);
});
