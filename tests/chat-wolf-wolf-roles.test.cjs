'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RULES = require('../chat-wolf-v3-rules.js');
const DIRECTIONS = require('../chat-wolf-v6-directions.js').directions;
const source = fs.readFileSync(path.resolve(__dirname, '../chat-wolf-v3-engine.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
function harness() {
  const topic = { id: 'fixture', category: 'Everyday life', mainQuestion: 'What surprised you this week?',
    entryPrompts: [], tags: ['fixture'], followUps: [{ id: 'f1', text: 'What happened next?' }, { id: 'f2', text: 'Would you try it again?' }] };
  const content = { version: 'wolf-role-fixture', topics: [topic], directorDirections: DIRECTIONS,
    villageTasks: [], exclusionClues: {}, legacyTaskMap: {},
    wolfTasks: Array.from({ length: 160 }, (_, i) => ({ id: `task-${i}`, text: `Task ${i}`,
      canonicalTaskKey: `task-${i}`, variantGroup: `group-${i}`, mechanicKey: `group-${i}`,
      family: `family-${i % 20}`, type: i < 140 ? 'self_action' : 'interaction',
      active: true, status: 'active', reviewed: true, compatibleTopicIds: ['fixture'],
      isGeneric: false, requiredOtherPlayerCount: i < 140 ? 0 : 1, actionTags: [], positiveClues: [] })) };
  const context = { module: { exports: {} }, require: name => name.includes('rules') ? RULES : content };
  vm.runInNewContext(source, context);
  const E = context.module.exports;
  let now = 100000;
  const send = (r, id, action, payload = {}) => E.dispatch(r, id, action, payload, ++now);
  const host = (r, action, payload = {}) => send(r, 'p0', action, payload);
  function room(settings = {}, seed = 123) {
    const r = E.createRoom({ code: 'QATEST', hostPlayerId: 'p0', hostSessionHash: 's0', hostName: 'Host',
      settings: { enabledProfessions: [], ...settings }, seed, now });
    for (let i = 1; i < r.settings.playerCount; i++) E.addPlayer(r, { playerId: `p${i}`, sessionHash: `s${i}`, name: `Player ${i}`, now });
    return r;
  }
  function started(settings = {}, seed) { const r = room(settings, seed); host(r, 'startGame'); return r; }
  function talk(settings = {}, seed) { const r = started(settings, seed); host(r, 'beginTalk'); return r; }
  function advance(r, milliseconds) { now += milliseconds; E.advanceExpired(r, now); }
  return { E, content, room, started, talk, host, send, advance, now: () => now };
}
const all = room => Object.values(room.players);
const director = room => all(room).find(p => p.wolfProfession === 'director');
const shifter = room => all(room).find(p => p.wolfProfession === 'topic_shifter');
const nonWolves = room => all(room).filter(p => p.role !== 'WOLF');
function fails(fn, code) { assert.throws(fn, e => e.code === code, code); }
function sendDirection(h, room, targetId = 'random') {
  const player = director(room);
  h.send(room, player.id, 'sendDirection', { targetId, directionId: player.wolfAbility.options[0].id });
  return all(room).find(p => p.secretDirection);
}

test('new formal games use self-action tasks, even when an older lobby saved an interaction quota', () => {
  const h = harness();
  assert.equal(h.E.normalizeSettings().interactionTaskCount, 0);
  const r = h.started({ interactionTaskCount: 1 });
  assert.equal(r.settings.interactionTaskCount, 0);
  assert.equal(r.tasks.length, 3);
  assert.ok(r.tasks.every(t => t.type === 'self_action'));
  r.settings.interactionTaskCount = 1;
  const snapshot = JSON.stringify(r.tasks);
  h.host(r, 'beginTalk'); h.advance(r, 1000);
  assert.equal(r.settings.interactionTaskCount, 1);
  assert.equal(JSON.stringify(r.tasks), snapshot);
});

test('one wolf is always Director; optional roles are unique and normal wolves fill remaining seats', () => {
  const h = harness();
  for (const [wolfCount, enabledWolfRoles, expected] of [
    [1, ['director', 'topic_shifter'], ['director']],
    [2, ['director'], ['director', 'normal']],
    [2, ['director', 'topic_shifter'], ['director', 'topic_shifter']],
    [3, ['director', 'topic_shifter'], ['director', 'normal', 'topic_shifter']],
  ]) {
    for (let seed = 1; seed <= 20; seed++) {
      const r = h.started({ playerCount: 8, wolfCount, enabledWolfRoles }, seed);
      assert.deepEqual(all(r).filter(p => p.role === 'WOLF').map(p => p.wolfProfession).sort(), expected);
      assert.ok(nonWolves(r).every(p => !p.wolfProfession && !p.wolfAbility));
    }
  }
  assert.deepEqual(copy(h.E.normalizeSettings({ enabledWolfRoles: [] }).enabledWolfRoles), ['director']);
  fails(() => h.E.normalizeSettings({ enabledWolfRoles: ['control'] }), 'INVALID_WOLF_ROLES');
  fails(() => h.E.normalizeSettings({ temporaryTopicSeconds: 301 }), 'INVALID_SETTING');
  fails(() => h.E.normalizeSettings({ temporaryTopicSeconds: 59 }), 'INVALID_SETTING');
});

test('Director target pool contains all non-wolves including Jester and a future third party, without camps', () => {
  const h = harness(), r = h.talk();
  const future = nonWolves(r).find(p => p.role === 'VILLAGER'); future.role = 'FUTURE_THIRD_PARTY';
  const p = director(r), view = h.E.projectState(r, p.id, h.now()).private;
  assert.deepEqual(copy(view.wolfAbility.targets), nonWolves(r).map(p => ({ id: p.id, name: p.name })));
  assert.ok(view.wolfAbility.targets.some(p => r.players[p.id].role === 'JESTER'));
  assert.ok(view.wolfAbility.targets.some(p => p.id === future.id));
  assert.ok(view.wolfAbility.targets.every(p => Object.keys(p).sort().join(',') === 'id,name'));
  for (const target of all(r).filter(p => p.role === 'WOLF')) {
    fails(() => h.send(r, p.id, 'sendDirection', { targetId: target.id, directionId: p.wolfAbility.options[0].id }), 'INVALID_TARGET');
  }
  fails(() => h.send(r, p.id, 'sendDirection', { targetId: future.id, directionId: 'unreviewed' }), 'INVALID_DIRECTION');
  assert.equal(r.players[p.id].wolfAbility.used, false);
});

test('Director sends once to Jester, refresh keeps stable options and usage, recipient alone receives direction', () => {
  const h = harness(), r = h.talk();
  const p = director(r), target = all(r).find(p => p.role === 'JESTER');
  const options = copy(h.E.projectState(r, p.id).private.wolfAbility.options);
  assert.deepEqual(copy(h.E.projectState(copy(r), p.id).private.wolfAbility.options), options);
  const tasks = JSON.stringify(r.tasks);
  sendDirection(h, r, target.id);
  assert.equal(r.players[p.id].wolfAbility.used, true);
  const privateTarget = h.E.projectState(r, target.id).private.secretDirection;
  assert.ok(privateTarget);
  assert.equal(privateTarget.completed, null); assert.equal(privateTarget.swapsRemaining, 1);
  assert.equal(privateTarget.id.includes(p.id), false);
  assert.deepEqual(Object.keys(privateTarget).sort(), ['completed', 'id', 'noticeAcknowledgedAt', 'noticeShownAt', 'noticeUnlockAt', 'swapsRemaining', 'text', 'textZh']);
  for (const other of all(r).filter(player => player.id !== target.id)) {
    const view = h.E.projectState(r, other.id);
    assert.equal(view.private.secretDirection, null);
    assert.equal(view.public.directionRecap, undefined);
    assert.equal(view.public.reveal, undefined);
    assert.equal(JSON.stringify(view.public).includes(privateTarget.id), false);
  }
  const restored = copy(r);
  assert.equal(h.E.projectState(restored, p.id).private.wolfAbility.used, true);
  assert.deepEqual(copy(h.E.projectState(restored, target.id).private.secretDirection), copy(privateTarget));
  fails(() => sendDirection(h, r, target.id), 'WOLF_ABILITY_ALREADY_USED');
  h.send(r, target.id, 'completeDirection', { directionId: privateTarget.id });
  const completion = copy(r.players[target.id].secretDirection.completed);
  h.send(r, target.id, 'completeDirection', { directionId: privateTarget.id });
  assert.deepEqual(copy(r.players[target.id].secretDirection.completed), completion);
  assert.equal(JSON.stringify(r.tasks), tasks);
  assert.equal(r.tasks.some(t => t.completed), false);
  assert.equal(r.phase, 'TALK');
});

test('random Director targets use the same non-wolf pool over multiple seeds', () => {
  const h = harness(), selectedCamps = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const r = h.talk({}, seed); const eligible = nonWolves(r).map(p => p.id);
    const target = sendDirection(h, r);
    assert.ok(eligible.includes(target.id)); selectedCamps.add(target.role);
  }
  assert.ok(selectedCamps.has('JESTER')); assert.ok(selectedCamps.has('VILLAGER'));
});

test('recipient may swap once for a different low-pressure mechanic; stale actions cannot complete old assignment', () => {
  const h = harness(), r = h.talk();
  const target = sendDirection(h, r), p = director(r);
  const old = copy(target.secretDirection);
  const directorView = JSON.stringify(h.E.projectState(r, p.id).private.wolfAbility);
  h.send(r, target.id, 'swapDirection', { directionId: old.id });
  const current = r.players[target.id].secretDirection;
  assert.notEqual(current.id, old.id); assert.notEqual(current.text, old.text);
  assert.notEqual(current.family, old.family); assert.equal(current.pressure, old.pressure);
  assert.equal(current.swapsRemaining, 0);
  assert.equal(r.players[p.id].wolfAbility.used, true);
  assert.equal(JSON.stringify(h.E.projectState(r, p.id).private.wolfAbility), directorView);
  fails(() => h.send(r, target.id, 'completeDirection', { directionId: old.id }), 'STALE_DIRECTION');
  fails(() => h.send(r, target.id, 'swapDirection', { directionId: old.id }), 'STALE_DIRECTION');
  fails(() => h.send(r, target.id, 'swapDirection', { directionId: current.id }), 'DIRECTION_SWAP_UNAVAILABLE');
  const outsider = nonWolves(r).find(p => p.id !== target.id);
  fails(() => h.send(r, outsider.id, 'completeDirection', { directionId: current.id }), 'SECRET_DIRECTION_UNAVAILABLE');
  h.send(r, target.id, 'completeDirection', { directionId: current.id });
  assert.ok(r.players[target.id].secretDirection.completed);
});

test('Director actions and completion require active, unpaused free chat', () => {
  const h = harness(), r = h.started(), p = director(r);
  const payload = { targetId: 'random', directionId: p.wolfAbility.options[0].id };
  fails(() => h.send(r, p.id, 'sendDirection', payload), 'WRONG_PHASE');
  h.host(r, 'beginTalk'); h.host(r, 'pause');
  fails(() => h.send(r, p.id, 'sendDirection', payload), 'GAME_PAUSED');
  h.host(r, 'resume'); const target = sendDirection(h, r);
  h.host(r, 'pause');
  fails(() => h.send(r, target.id, 'completeDirection', { directionId: target.secretDirection.id }), 'GAME_PAUSED');
  h.host(r, 'resume'); h.host(r, 'endTalk');
  fails(() => h.send(r, target.id, 'swapDirection', { directionId: target.secretDirection.id }), 'WRONG_PHASE');
  fails(() => h.send(r, target.id, 'completeDirection', { directionId: target.secretDirection.id }), 'WRONG_PHASE');
});

test('a recipient uncomfortable with singing can swap to a short spoken direction without notifying Director', () => {
  const h = harness();
  let r, singer;
  for (let seed = 1; seed <= 20 && !singer; seed++) {
    r = h.talk({}, seed); singer = director(r).wolfAbility.options.find(d => d.family === 'singing');
  }
  assert.ok(singer);
  const d = director(r), target = nonWolves(r)[0];
  h.send(r, d.id, 'sendDirection', { targetId: target.id, directionId: singer.id });
  const before = JSON.stringify(h.E.projectState(r, d.id).private.wolfAbility);
  h.send(r, target.id, 'swapDirection', { directionId: r.players[target.id].secretDirection.id });
  assert.ok(['short_phrase', 'unusual_opening', 'unusual_ending', 'repetition'].includes(r.players[target.id].secretDirection.family));
  assert.equal(r.players[target.id].secretDirection.pressure, 'low');
  assert.equal(JSON.stringify(h.E.projectState(r, d.id).private.wolfAbility), before);
});

test('Temporary Topic broadcasts one short question without its sender and restores Main Topic at authoritative expiry', () => {
  const h = harness(), r = h.talk({ enabledWolfRoles: ['director', 'topic_shifter'] });
  h.host(r, 'followUp', { followUpId: 'f1' });
  const player = shifter(r), tasks = JSON.stringify(r.tasks), clock = JSON.stringify(r.talkClock), round = r.round;
  h.send(r, player.id, 'changeTopic', { text: 'Which hobby would be hardest to quit?' });
  const deadline = r.temporaryTopic.deadlineAt;
  assert.equal(deadline, h.now() + 180000);
  assert.equal(JSON.stringify(r.talkClock), clock); assert.equal(r.round, round);
  assert.equal(JSON.stringify(r.tasks), tasks); assert.deepEqual(copy(r.usedFollowUpIds), ['f1']);
  const publicTopic = copy(h.E.projectState(r, 'p0', h.now()).public.temporaryTopic);
  for (const p of all(r)) assert.deepEqual(copy(h.E.projectState(r, p.id, h.now()).public.temporaryTopic), publicTopic);
  assert.deepEqual(Object.keys(publicTopic).sort(), ['deadlineAt', 'id', 'remainingMs', 'text']);
  assert.equal(publicTopic.id.includes(player.id), false);
  assert.deepEqual(copy(h.E.projectState(copy(r), player.id, h.now()).public.temporaryTopic), publicTopic);
  fails(() => h.send(r, player.id, 'changeTopic', { text: 'Another topic?' }), 'WOLF_ABILITY_ALREADY_USED');
  h.advance(r, deadline - h.now() - 1); assert.ok(r.temporaryTopic);
  h.advance(r, 1); assert.equal(r.temporaryTopic, null); assert.equal(r.activeFollowUp, null);
  assert.deepEqual(copy(r.usedFollowUpIds), ['f1']); assert.equal(JSON.stringify(r.tasks), tasks);
  assert.equal(r.round, round); assert.equal(r.phase, 'TALK'); assert.equal(JSON.stringify(r.talkClock), clock);
});

test('Temporary Topic pause freezes both deadlines; resume retains remaining duration and automatic round deadline', () => {
  const h = harness(), r = h.talk({ enabledWolfRoles: ['director', 'topic_shifter'], talkEndBehavior: 'automatic', talkSeconds: 300 });
  h.send(r, shifter(r).id, 'changeTopic', { text: 'Where would you travel?' });
  h.advance(r, 30000); h.host(r, 'pause');
  const remaining = r.temporaryTopic.remainingMs, mainRemaining = r.pausedRemainingMs;
  assert.equal(r.temporaryTopic.deadlineAt, null); assert.ok(remaining > 149000 && remaining < 150000);
  const copied = copy(r); h.advance(r, 500000);
  assert.equal(r.temporaryTopic.remainingMs, remaining);
  assert.deepEqual(copy(h.E.projectState(copied, 'p0', h.now()).public.temporaryTopic), copy(h.E.projectState(r, 'p0', h.now()).public.temporaryTopic));
  h.host(r, 'resume');
  assert.equal(r.temporaryTopic.deadlineAt, h.now() + remaining);
  assert.equal(r.deadlineAt, h.now() + mainRemaining);
  h.advance(r, remaining); assert.equal(r.temporaryTopic, null); assert.equal(r.phase, 'TALK');
});

test('Temporary Topic has length limits, role/phase guards, host recovery, and is cleared before meeting', () => {
  const h = harness(), r = h.talk({ enabledWolfRoles: ['director', 'topic_shifter'] });
  const p = shifter(r), d = director(r);
  for (const text of ['', ' '.repeat(5), 'x'.repeat(151)]) fails(() => h.send(r, p.id, 'changeTopic', { text }), 'INVALID_TEMPORARY_TOPIC');
  assert.equal(r.players[p.id].wolfAbility.used, false);
  fails(() => h.send(r, d.id, 'changeTopic', { text: 'A question?' }), 'WOLF_ABILITY_UNAVAILABLE');
  h.send(r, p.id, 'changeTopic', { text: '  Where\nwould you travel?  ' });
  assert.equal(r.temporaryTopic.text, 'Where would you travel?');
  fails(() => h.send(r, nonWolves(r).find(p => p.id !== 'p0').id, 'endTemporaryTopic'), 'HOST_ONLY');
  fails(() => h.host(r, 'endTemporaryTopic', { temporaryTopicId: 'old' }), 'STALE_ACTION');
  h.host(r, 'endTemporaryTopic', { temporaryTopicId: r.temporaryTopic.id });
  assert.equal(r.temporaryTopic, null); assert.equal(r.players[p.id].wolfAbility.used, true);
  const second = h.talk({ enabledWolfRoles: ['director', 'topic_shifter'] });
  h.send(second, shifter(second).id, 'changeTopic', { text: 'Another question?' });
  h.host(second, 'endTalk'); assert.equal(second.temporaryTopic, null);
  assert.equal(second.phase, 'MEETING_TURNS');
});

test('restart and replay clear current abilities and directions but retain option exposure history; reveal waits until finish', () => {
  const h = harness(), r = h.talk({ enabledWolfRoles: ['director', 'topic_shifter'] });
  sendDirection(h, r); h.send(r, shifter(r).id, 'changeTopic', { text: 'A temporary question?' });
  const firstHistory = copy(r.directionHistory), firstMatch = r.matchId;
  h.host(r, 'cancelGame');
  const finished = h.E.projectState(r, 'p0');
  assert.ok(finished.public.reveal.wolfProfessions);
  assert.equal(finished.public.reveal.directionRecap.length, 1);
  assert.equal(finished.private.secretDirection, null); assert.equal(finished.private.wolfAbility, null);
  assert.equal(r.temporaryTopic, null);
  h.host(r, 'replay');
  assert.ok(all(r).every(p => !p.secretDirection && !p.wolfAbility && !p.wolfProfession));
  assert.equal(r.directionRecap, undefined); assert.deepEqual(copy(r.directionHistory), firstHistory);
  h.host(r, 'startGame');
  assert.notEqual(r.matchId, firstMatch); assert.equal(r.directionHistory.length, 2);
  assert.deepEqual(copy(r.directionHistory[0]), firstHistory[0]);
  assert.ok(all(r).every(p => !p.secretDirection));
  h.host(r, 'beginTalk'); sendDirection(h, r);
  h.host(r, 'restart', { keepTopic: true });
  assert.ok(all(r).every(p => !p.secretDirection)); assert.deepEqual(copy(r.directionRecap), []);
  assert.equal(r.directionHistory.length, 3);
});

test('real Director pool has at least 40 short voice-only directions across eight families, and 20 deals stay diverse', () => {
  const h = harness(), r = h.started();
  assert.ok(DIRECTIONS.length >= 40); assert.ok(new Set(DIRECTIONS.map(d => d.family)).size >= 8);
  assert.ok(DIRECTIONS.every(d => d.text.split(/\s+/).length <= 15 && d.pressure === 'low' && d.reviewed));
  const selected = new Map(); let previous = [];
  for (let i = 0; i < 20; i++) {
    if (i) h.host(r, 'restart', { keepTopic: true });
    const options = h.E.projectState(r, director(r).id).private.wolfAbility.options;
    assert.ok(options.length >= 3 && options.length <= 5);
    assert.equal(new Set(options.map(d => d.family)).size, options.length);
    assert.equal(options.some(d => previous.includes(d.id)), false);
    previous = options.map(d => d.id);
    for (const d of options) selected.set(d.id, (selected.get(d.id) || 0) + 1);
    h.host(r, 'beginTalk'); const before = JSON.stringify(r.tasks), target = sendDirection(h, r);
    h.send(r, target.id, 'completeDirection', { directionId: target.secretDirection.id });
    assert.equal(JSON.stringify(r.tasks), before);
  }
  assert.ok(selected.size >= 30); assert.ok(Math.max(...selected.values()) <= 7);
});
