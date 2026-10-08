const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../cut-engine.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Firebase removes empty arrays/maps and null children. Transactions retry the
// same updater and listeners receive independent snapshots, as in live rooms.
function normalize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) {
    const clean = normalize(entry); if (clean !== null) output[key] = clean;
  }
  return Object.keys(output).length ? output : null;
}
function database() {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]);
  const listeners = new Map(), tails = new Map(), hooks = new Map(); let writes = 0;
  function put(path, value) {
    values.set(path, normalize(clone(value))); writes++;
    for (const fn of listeners.get(path) || []) queueMicrotask(() => fn(snap(values.get(path))));
  }
  return {
    values, put, hooks, listeners, get writes() { return writes; },
    ref(path) {
      return {
        path,
        on(_event, fn) {
          if (!listeners.has(path)) listeners.set(path, new Set());
          listeners.get(path).add(fn); queueMicrotask(() => fn(snap(values.get(path))));
        },
        off(_event, fn) { listeners.get(path)?.delete(fn); },
        transaction(updater) {
          const task = (tails.get(path) || Promise.resolve()).then(async () => {
            const hook = hooks.get(path); if (hook) { hooks.delete(path); await hook(); }
            updater(clone(values.get(path)));
            const next = updater(clone(values.get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(values.get(path)) };
            put(path, next); return { committed: true, snapshot: snap(values.get(path)) };
          });
          tails.set(path, task.catch(() => {})); return task;
        },
      };
    },
  };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) {
  for (let n = 0; n < 10; n++) { await turn(); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); }
}
function setup() {
  let clock = 100000; const db = database(), extras = {}, hosts = [], timers = new Map(); let timerId = 0;
  class ClockDate extends Date { static now() { return clock; } }
  const paths = [1, 2, 3, 4].map(n => `rooms/CUTTEST/players/card-${n}`);
  const room = { code: 'CUTTEST', count: 4, answers: {}, name: i => `Person ${i + 1}`,
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date: ClockDate, CUT_ENGINE: E,
    setInterval: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearInterval: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(require.resolve('../cut-sync.js'), 'utf8'), context);
  function host() {
    const h = new context.CUT_SYNC.Host({ db, room, onChange: state => { h.latest = state; }, onStatus: status => { h.lastStatus = status; } });
    hosts.push(h); h.connect(); return h;
  }
  return { db, room, paths, host, hosts, extras, timers,
    card: n => clone(db.values.get(paths[n - 1])),
    state: () => JSON.parse(db.values.get(`rooms/CUTTEST/players/${extras.cutControlToken}`).stateJson),
    get now() { return clock; }, set now(value) { clock = value; },
    async advance(h, value) {
      // A live, awake host renews every four seconds even during a long turn.
      // Move the test clock in lease-renewal steps rather than suspending it.
      while (clock + 4000 < value) { clock += 4000; await h.renew(); await settle(h); }
      clock = value; await h.renew(); await settle(h); h.pulse(); await settle(h);
    },
    async action(n, type, extra = {}) {
      const card = this.card(n);
      const action = { id: crypto.randomUUID(), type, sessionId: card.cut.sessionId, turnId: card.cut.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, cutAction: action })); return action;
    },
  };
}

async function firstCut(f, host) {
  await host.command('begin'); await settle(host);
  await f.advance(host, host.latest.phaseUntil);
  await f.advance(host, host.latest.deadline);
  assert.equal(host.latest.phase, 'cut'); assert.equal(host.latest.cutEvent.final, false);
}

test('exact canonical JSON and filtered cards wait for Begin, then keep CUT and NEXT until manual speaking starts', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const raw = f.db.values.get(`rooms/CUTTEST/players/${f.extras.cutControlToken}`);
  assert.equal(typeof raw.stateJson, 'string'); assert.equal(raw.state, undefined);
  assert.ok(Array.isArray(f.state().roster)); assert.ok(Array.isArray(f.state().recent));
  assert.equal(f.card(1).game, 'cut'); assert.equal(f.card(4).cut.phase, 'ready');
  const readyTurn = h.latest.turnId, topic = h.latest.topic.id, firstSpeaker = h.latest.speaker;
  await f.advance(h, f.now + 60000);
  assert.equal(h.latest.phase, 'ready'); assert.equal(h.latest.turnId, readyTurn);
  assert.equal(h.latest.topic.id, topic); assert.equal(h.latest.speaker, firstSpeaker);
  assert.equal(h.latest.deadline, null); assert.equal(h.latest.phaseUntil, null);
  assert.equal(f.card(4).cut.canBegin, true); assert.equal(f.card(4).cut.phaseUntil, undefined);
  await h.command('begin'); await settle(h); assert.equal(h.latest.phase, 'countdown');
  const session = h.latest.sessionId, countdown = h.latest.phaseUntil;
  await f.advance(h, countdown - 1); assert.equal(h.latest.phase, 'countdown');
  await f.advance(h, countdown); assert.equal(h.latest.phase, 'speaking');
  const speaker = h.latest.speaker, deadline = h.latest.deadline;
  assert.ok(deadline > f.now + 4000);
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n), serialized = JSON.stringify(card);
    assert.equal(card.cut.speaker, speaker); assert.equal(card.cut.nextSpeaker ?? null, null);
    assert.equal(card.cut.deadline, undefined); assert.equal(card.cut.phaseUntil ?? null, null);
    assert.ok(!serialized.includes(f.extras.cutControlToken)); assert.ok(!serialized.includes('stats'));
  }
  await f.advance(h, deadline - 1); assert.equal(h.latest.phase, 'speaking');
  await f.advance(h, deadline); assert.equal(h.latest.phase, 'cut');
  assert.notEqual(h.latest.nextSpeaker, speaker); assert.equal(h.latest.sessionId, session);
  assert.equal(f.card(2).cut.cutEvent.id, h.latest.cutEvent.id);
  const cutEvent = clone(h.latest.cutEvent), waitingTurn = h.latest.turnId, next = h.latest.nextSpeaker;
  await f.advance(h, f.now); assert.equal(h.latest.cutEvent.id, cutEvent.id, 'the same due clock is not applied twice');
  await f.advance(h, f.now + 180000);
  assert.equal(h.latest.phase, 'cut'); assert.equal(h.latest.turnId, waitingTurn);
  assert.deepEqual(clone(h.latest.cutEvent), cutEvent); assert.equal(h.latest.nextSpeaker, next);
  assert.equal(h.latest.deadline, null); assert.equal(h.latest.phaseUntil, null);
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n).cut;
    assert.equal(card.phase, 'cut'); assert.equal(card.nextSpeaker, next);
    assert.deepEqual(card.cutEvent, cutEvent); assert.equal(card.canBegin, true);
    assert.equal(card.phaseUntil, undefined); assert.equal(card.deadline, undefined);
  }
  const writes = f.db.writes;
  for (let index = 0; index < 100; index++) h.pulse(); await settle(h);
  assert.equal(f.db.writes, writes, 'waiting CUT pulses perform no network writes');
  const count = h.latest.stats[next]?.count || 0, sequence = h.latest.speakerSequence;
  await h.command('begin'); await settle(h); assert.equal(h.latest.phase, 'speaking');
  assert.equal(h.latest.turnId, waitingTurn + 1); assert.equal(h.latest.speaker, next);
  assert.equal(h.latest.nextSpeaker, null); assert.equal(h.latest.phaseUntil, null);
  assert.ok(h.latest.deadline > f.now); assert.equal(h.latest.stats[next].count, count + 1);
  assert.equal(h.latest.speakerSequence, sequence + 1);
  assert.equal(f.card(1).cut.deadline, undefined); assert.equal(f.card(1).cut.phaseUntil, undefined); h.close();
});

test('one host lease owns RNG and clocks; replacement retains the exact ongoing state', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first);
  await first.command('begin'); await settle(first);
  await f.advance(first, first.latest.phaseUntil);
  const original = [first.latest.sessionId, first.latest.turnId, first.latest.speaker, first.latest.deadline];
  const second = f.host(); await settle(first, second);
  assert.equal(first.own, true); assert.equal(second.own, false);
  await assert.rejects(second.command('pause')); await assert.rejects(second.start());
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true);
  assert.deepEqual([second.latest.sessionId, second.latest.turnId, second.latest.speaker, second.latest.deadline], original);
  first.close(); await settle(second); assert.equal(second.own, true);
  await second.command('pause'); await settle(second); assert.equal(second.latest.phase, 'paused');
  second.close();
});

test('lease acquisition upgrades a legacy automatic handoff once; a blocked host cannot migrate it', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first); await firstCut(f, first);
  const controlPath = `rooms/CUTTEST/players/${f.extras.cutControlToken}`;
  const waiting = f.state(), originalRaw = clone(f.db.values.get(controlPath));
  const legacy = { ...waiting, phase: 'handoff', speaker: waiting.nextSpeaker, nextSpeaker: waiting.nextSpeaker,
    countOnGo: true, pendingDurationMs: null, phaseUntil: f.now + 3000, deadline: null,
    turnId: waiting.turnId + 1, lastChangeAt: f.now };
  f.db.put(controlPath, { ...originalRaw, stateJson: JSON.stringify(legacy) }); await settle(first);
  const legacyJson = f.db.values.get(controlPath).stateJson, revision = originalRaw.revision;
  const second = f.host(); await settle(first, second); assert.equal(second.own, false);
  await second.renew(); await settle(first, second);
  assert.equal(f.db.values.get(controlPath).stateJson, legacyJson);
  assert.equal(f.db.values.get(controlPath).revision, revision);
  assert.equal(f.state().phase, 'handoff', 'a rejected lease cannot rewrite the canonical legacy state');
  first.close(); await settle(first, second); await second.renew(); await settle(second);
  assert.equal(second.own, true);
  const upgradedRaw = clone(f.db.values.get(controlPath)), upgraded = f.state();
  assert.equal(typeof upgradedRaw.stateJson, 'string'); assert.equal(upgradedRaw.state, undefined);
  assert.equal(upgradedRaw.revision, revision + 1); assert.equal(upgraded.phase, 'cut');
  assert.equal(upgraded.turnId, legacy.turnId + 1); assert.equal(upgraded.lastChangeAt, f.now);
  assert.equal(upgraded.nextSpeaker, legacy.nextSpeaker); assert.equal(upgraded.speaker, legacy.cutEvent.from);
  assert.deepEqual(upgraded.topic, legacy.topic); assert.deepEqual(upgraded.cutEvent, legacy.cutEvent);
  assert.deepEqual(upgraded.stats, legacy.stats); assert.deepEqual(upgraded.recent, legacy.recent);
  assert.deepEqual(upgraded.topicHistory, legacy.topicHistory); assert.equal(upgraded.speakerSequence, legacy.speakerSequence);
  assert.equal(upgraded.cutsCompleted, legacy.cutsCompleted); assert.equal(upgraded.phaseUntil, null); assert.equal(upgraded.deadline, null);
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).cut.phase, 'cut'); assert.equal(f.card(n).cut.nextSpeaker, legacy.nextSpeaker);
    assert.equal(f.card(n).cut.phaseUntil, undefined); assert.equal(f.card(n).cut.canBegin, true);
  }
  f.now += 1000; await second.renew(); await settle(second); await second.renew(); await settle(second);
  assert.equal(f.db.values.get(controlPath).stateJson, upgradedRaw.stateJson);
  assert.equal(f.db.values.get(controlPath).revision, revision + 1, 'renewal is idempotent after the first migration');
  second.close();
});

test('player actor spoofing cannot pause or advance and concurrent projection preserves its acknowledgement', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const original = [h.latest.phase, h.latest.turnId, h.latest.speaker];
  const [action] = await Promise.all([f.action(2, 'pause', { actor: 0 }), h.renew()]); await settle(h);
  assert.deepEqual([h.latest.phase, h.latest.turnId, h.latest.speaker], original);
  assert.equal(f.card(2).cutAction.id, action.id);
  assert.equal(f.card(2).cut.reply.id, action.id); assert.ok(f.card(2).cut.reply.error);
  const revision = f.card(1).cut.revision;
  await f.db.ref(f.paths[1]).transaction(old => ({ ...old, cutAction: action })); await settle(h);
  assert.equal(f.card(1).cut.revision, revision, 'repeated action does not cause another canonical write');
  h.close();
});

test('simultaneous host and active-player Begin requests start one countdown and cannot consume it twice', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const initial = { sessionId: h.latest.sessionId, turnId: h.latest.turnId };
  const originalSpeaker = h.latest.speaker;
  const results = await Promise.allSettled([
    f.action(1, 'begin', initial), f.action(2, 'begin', initial), h.command('begin'),
  ]);
  await settle(h);
  assert.equal(h.latest.phase, 'countdown'); assert.equal(h.latest.turnId, initial.turnId + 1);
  assert.equal(h.latest.speaker, originalSpeaker); assert.equal(h.latest.phaseUntil, f.now + 3000);
  const playerActions = results.slice(0, 2).map(result => result.value);
  assert.ok(playerActions.every(Boolean));
  for (let n = 1; n <= 2; n++) {
    assert.equal(f.card(n).cut.reply.id, playerActions[n - 1].id);
    assert.ok(['', undefined, 'stale_turn'].includes(f.card(n).cut.reply.error));
  }
  const accepted = Object.values(h.latest.replies).filter(reply => !reply.error);
  assert.equal(accepted.length, 1);
  const countdownTurn = h.latest.turnId;
  await f.action(3, 'begin', initial); await settle(h);
  assert.equal(h.latest.turnId, countdownTurn); assert.equal(h.latest.phase, 'countdown');
  assert.equal(f.card(3).cut.reply.error, 'stale_turn');
  await f.advance(h, h.latest.phaseUntil);
  assert.equal(h.latest.phase, 'speaking'); assert.equal(h.latest.turnId, countdownTurn + 1);
  h.close();
});

test('simultaneous manual CUT starts select the published NEXT once and stale requests cannot start another turn', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h); await firstCut(f, h);
  const waiting = { sessionId: h.latest.sessionId, turnId: h.latest.turnId };
  const next = h.latest.nextSpeaker, count = h.latest.stats[next]?.count || 0, sequence = h.latest.speakerSequence;
  const results = await Promise.allSettled([
    f.action(1, 'begin', waiting), f.action(2, 'begin', waiting), h.command('begin'),
  ]); await settle(h);
  assert.equal(h.latest.phase, 'speaking'); assert.equal(h.latest.turnId, waiting.turnId + 1);
  assert.equal(h.latest.speaker, next); assert.equal(h.latest.nextSpeaker, null);
  assert.equal(h.latest.stats[next].count, count + 1); assert.equal(h.latest.speakerSequence, sequence + 1);
  assert.equal(h.latest.phaseUntil, null); assert.ok(h.latest.deadline > f.now);
  assert.equal(f.card(2).cut.phaseUntil, undefined); assert.equal(f.card(2).cut.deadline, undefined);
  const actions = results.slice(0, 2).map(result => result.value); assert.ok(actions.every(Boolean));
  for (let n = 1; n <= 2; n++) {
    assert.equal(f.card(n).cut.reply.id, actions[n - 1].id);
    assert.ok(['', undefined, 'stale_turn'].includes(f.card(n).cut.reply.error));
  }
  assert.equal([0, 1, 2].map(n => h.latest.replies[n]).filter(reply => !reply.error).length, 1);
  const deadline = h.latest.deadline, speaker = h.latest.speaker;
  await f.action(3, 'begin', waiting); await settle(h);
  assert.equal(f.card(3).cut.reply.error, 'stale_turn'); assert.equal(h.latest.deadline, deadline);
  assert.equal(h.latest.speaker, speaker); assert.equal(h.latest.stats[next].count, count + 1);
  const writes = f.db.writes;
  await f.db.ref(f.paths[0]).transaction(old => ({ ...old, cutAction: actions[0] })); await settle(h);
  assert.equal(f.db.writes, writes + 1, 'replaying an acknowledged start only writes the submitted player intent'); h.close();
});

test('waiting CUT survives pause, NEXT dropout and host reload without an automatic handoff', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first); await firstCut(f, first);
  const originalEvent = clone(first.latest.cutEvent), originalNext = first.latest.nextSpeaker;
  const count = first.latest.speakerSequence;
  await first.command('pause'); await settle(first); assert.equal(first.latest.phase, 'paused');
  await f.advance(first, f.now + 60000); assert.equal(first.latest.phase, 'paused');
  await first.command('resume'); await settle(first);
  assert.equal(first.latest.phase, 'cut'); assert.equal(first.latest.nextSpeaker, originalNext);
  assert.deepEqual(clone(first.latest.cutEvent), originalEvent); assert.equal(first.latest.phaseUntil, null);
  assert.equal(first.latest.deadline, null); assert.equal(first.latest.speakerSequence, count);
  await first.command('exclude', { playerNum: originalNext, active: false }); await settle(first);
  assert.equal(first.latest.phase, 'cut'); assert.notEqual(first.latest.nextSpeaker, originalNext);
  const replacement = first.latest.nextSpeaker, replacedEvent = clone(first.latest.cutEvent);
  assert.equal(replacedEvent.to, replacement); assert.equal(replacedEvent.id, originalEvent.id);
  assert.equal(replacedEvent.at, originalEvent.at); assert.equal(replacedEvent.from, originalEvent.from);
  assert.equal(first.latest.phaseUntil, null); assert.equal(first.latest.deadline, null);
  assert.equal(f.card(originalNext).cut.canBegin, false);
  await f.action(originalNext, 'begin', { actor: 0 }); await settle(first);
  assert.equal(first.latest.phase, 'cut'); assert.equal(f.card(originalNext).cut.reply.error, 'not_available');
  const session = first.latest.sessionId, waitingTurn = first.latest.turnId;
  first.close(); await settle(first); const restored = f.host(); await settle(restored);
  assert.equal(restored.own, true); assert.equal(restored.latest.sessionId, session);
  assert.equal(restored.latest.phase, 'cut'); assert.equal(restored.latest.turnId, waitingTurn);
  assert.equal(restored.latest.nextSpeaker, replacement); assert.deepEqual(clone(restored.latest.cutEvent), replacedEvent);
  await f.advance(restored, f.now + 120000);
  assert.equal(restored.latest.phase, 'cut'); assert.equal(restored.latest.nextSpeaker, replacement);
  assert.equal(restored.latest.speakerSequence, count); assert.deepEqual(clone(restored.latest.cutEvent), replacedEvent);
  const activePlayer = restored.latest.roster.find(player => player.active).playerNum;
  await f.action(activePlayer, 'begin'); await settle(restored);
  assert.equal(restored.latest.phase, 'speaking'); assert.equal(restored.latest.speaker, replacement);
  assert.equal(restored.latest.speakerSequence, count + 1); assert.ok(restored.latest.deadline > f.now); restored.close();
});

test('inactive players cannot Begin or impersonate host controls; an active player can Begin', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('exclude', { playerNum: 4, active: false }); await settle(h);
  assert.equal(f.card(4).cut.canBegin, false); assert.equal(f.card(3).cut.canBegin, true);
  const turnId = h.latest.turnId;
  const excludedBegin = await f.action(4, 'begin', { actor: 0 }); await settle(h);
  assert.equal(h.latest.phase, 'ready'); assert.equal(h.latest.turnId, turnId);
  assert.equal(f.card(4).cut.reply.id, excludedBegin.id); assert.equal(f.card(4).cut.reply.error, 'not_available');
  await f.action(3, 'settings', { actor: 0 }); await settle(h);
  assert.equal(h.latest.phase, 'ready'); assert.equal(f.card(3).cut.reply.error, 'not_available');
  await f.action(3, 'begin'); await settle(h);
  assert.equal(h.latest.phase, 'countdown'); assert.equal(h.latest.turnId, turnId + 1);
  assert.equal(f.card(3).cut.reply.error ?? '', ''); h.close();
});

test('host Settings holds setup indefinitely and blocks player Begin until Configure or Cancel returns ready', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const topic = h.latest.topic.id, session = h.latest.sessionId;
  await h.command('settings'); await settle(h);
  assert.equal(h.latest.phase, 'setup'); const setupTurn = h.latest.turnId;
  await f.advance(h, f.now + 60000);
  assert.equal(h.latest.phase, 'setup'); assert.equal(h.latest.turnId, setupTurn);
  assert.equal(h.latest.deadline, null); assert.equal(h.latest.phaseUntil, null);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).cut.canBegin, false);
  await f.action(1, 'begin'); await settle(h);
  assert.equal(h.latest.phase, 'setup'); assert.equal(f.card(1).cut.reply.error, 'not_available');
  await f.action(2, 'configure', { actor: 0, speed: 'chaos', category: 'absurd' }); await settle(h);
  assert.equal(h.latest.phase, 'setup'); assert.equal(h.latest.speed, 'normal');
  assert.equal(f.card(2).cut.reply.error, 'not_available');
  await h.command('configure', { speed: 'chaos', category: 'absurd' }); await settle(h);
  assert.equal(h.latest.phase, 'ready'); assert.equal(h.latest.speed, 'chaos'); assert.equal(h.latest.category, 'absurd');
  assert.equal(h.latest.topic.id, topic); assert.equal(h.latest.sessionId, session);
  await f.advance(h, f.now + 60000); assert.equal(h.latest.phase, 'ready');
  await f.action(2, 'begin'); await settle(h); assert.equal(h.latest.phase, 'countdown');
  await f.advance(h, h.latest.phaseUntil); assert.equal(h.latest.phase, 'speaking');
  assert.ok(h.latest.deadline > f.now); assert.equal(f.card(2).cut.deadline, undefined);
  await h.command('settings'); await settle(h); assert.equal(h.latest.phase, 'setup');
  assert.equal(h.latest.deadline, null); assert.equal(f.card(2).cut.phaseUntil, undefined);
  await f.action(3, 'begin'); await settle(h); assert.equal(h.latest.phase, 'setup');
  await h.command('cancelSettings'); await settle(h); assert.equal(h.latest.phase, 'ready');
  assert.equal(h.latest.speed, 'chaos'); assert.equal(h.latest.category, 'absurd');
  await f.advance(h, f.now + 60000); assert.equal(h.latest.phase, 'ready');
  await h.command('begin'); await settle(h); assert.equal(h.latest.phase, 'countdown'); h.close();
});

test('switching games suspends publishing/ticks; an explicit new game restores the original cards', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  f.db.put(f.paths[0], { game: 'cardcheck', word: 'hello' }); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.lastStatus, 'switched');
  await h.renew(); await settle(h); f.now += 20000; h.pulse(); await settle(h);
  assert.equal(f.card(1).game, 'cardcheck'); await assert.rejects(h.command('pause'));
  await h.renew(); await settle(h);
  await h.start({ speed: 'chill', category: 'absurd' }); await settle(h);
  assert.equal(h.suspended, false); assert.equal(f.card(1).game, 'cut'); assert.equal(f.card(1).word, undefined);
  assert.equal(f.card(4).cut.speed, 'chill'); h.close();
});

test('reopening an old host after another game cannot reclaim its cards implicitly', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first);
  first.close(); await settle(first); f.db.put(f.paths[2], { game: 'dixit', card: 'other-game' });
  const restored = f.host(); await settle(restored);
  assert.equal(restored.suspended, true); assert.equal(f.card(3).game, 'dixit');
  await restored.renew(); await settle(restored); assert.equal(f.card(3).game, 'dixit'); restored.close();
});

test('a new game arriving during opening publication wins over the stale opening projection', async () => {
  const f = setup(), h = f.host(); await settle(h);
  f.db.put(f.paths[0], { game: 'cardcheck', word: 'old' }); await settle(h);
  f.db.hooks.set(f.paths[0], () => f.db.put(f.paths[0], { game: 'dixit', card: 'new' }));
  await h.start(); await settle(h);
  assert.equal(h.suspended, true); assert.equal(f.card(1).game, 'dixit'); assert.equal(f.card(1).card, 'new'); h.close();
});

test('a replacement host completes an interrupted opening without resetting the game', async () => {
  const f = setup(), first = f.host(); await settle(first);
  let release; const waiting = new Promise(resolve => { release = resolve; });
  f.db.hooks.set(f.paths[0], () => waiting);
  await first.start(); const session = first.latest.sessionId;
  first.close(); release(); await settle(first);
  const restored = f.host(); await settle(restored);
  assert.equal(restored.own, true); assert.equal(restored.latest.sessionId, session);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).cut.sessionId, session);
  const raw = f.db.values.get(`rooms/CUTTEST/players/${f.extras.cutControlToken}`);
  assert.equal(raw.opening, undefined); restored.close();
});

test('restart rejects old sessions; repeated handoffs keep the topic until an explicit End topic', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h);
  const previous = f.card(1).cut;
  await h.start({ category: 'real' }); await settle(h);
  assert.notEqual(h.latest.sessionId, previous.sessionId);
  await f.action(1, 'stop', { sessionId: previous.sessionId, turnId: previous.turnId, actor: 0 }); await settle(h);
  assert.equal(h.latest.phase, 'ready'); const topic = h.latest.topic.id;
  await f.action(1, 'begin'); await settle(h);
  await f.advance(h, h.latest.phaseUntil); assert.equal(h.latest.phase, 'speaking');
  for (let index = 0; index < 30; index++) {
    await f.advance(h, h.latest.deadline);
    assert.equal(h.latest.phase, 'cut'); assert.equal(h.latest.cutsCompleted, index + 1);
    assert.equal(h.latest.targetCuts, null); assert.equal(h.latest.cutEvent.final, false);
    assert.equal(h.latest.topic.id, topic); assert.equal(h.latest.round, 1);
    assert.equal(f.card(1).cut.canBegin, true); assert.equal(f.card(1).cut.phaseUntil, undefined);
    await h.command('begin'); await settle(h); assert.equal(h.latest.phase, 'speaking');
  }
  const stats = clone(h.latest.stats), sequence = h.latest.speakerSequence;
  await assert.rejects(h.command('next'), /not_available/);
  await h.command('endTopic'); await settle(h);
  assert.equal(h.latest.phase, 'break'); assert.equal(h.latest.cutsCompleted, 30);
  assert.equal(h.latest.deadline, null); assert.equal(h.latest.phaseUntil, null); assert.equal(h.latest.cutEvent, null);
  assert.equal(h.latest.topic.id, topic); assert.deepEqual(clone(h.latest.stats), stats); assert.equal(h.latest.speakerSequence, sequence);
  await f.advance(h, f.now + 60000); assert.equal(h.latest.phase, 'break'); assert.equal(h.latest.topic.id, topic);
  assert.equal(f.card(1).cut.score, undefined); assert.equal(f.timers.size, 2);
  await h.command('next'); await settle(h); assert.equal(h.latest.phase, 'ready'); assert.equal(h.latest.round, 2);
  const nextTurn = h.latest.turnId, nextTopic = h.latest.topic.id;
  await f.advance(h, f.now + 60000);
  assert.equal(h.latest.phase, 'ready'); assert.equal(h.latest.turnId, nextTurn); assert.equal(h.latest.topic.id, nextTopic);
  await h.command('begin'); await settle(h); assert.equal(h.latest.phase, 'countdown');
  h.close(); assert.equal(f.timers.size, 0);
});

test('early pulses do no network writes; disconnect, close and room changes stop the clock', async () => {
  const f = setup(), h = f.host(); await settle(h); h.connect(); assert.equal(f.timers.size, 2);
  await h.start(); await settle(h); const writes = f.db.writes;
  for (let n = 0; n < 50; n++) h.pulse(); await settle(h); assert.equal(f.db.writes, writes);
  await h.command('begin'); await settle(h);
  f.db.put('.info/connected', false); await settle(h);
  f.now = h.latest.phaseUntil; h.pulse(); await settle(h); assert.equal(h.latest.phase, 'countdown');
  f.db.put('.info/connected', true); await settle(h); h.pulse(); await settle(h); assert.equal(h.latest.phase, 'speaking');
  f.room.code = 'NEWROOM'; f.now = h.latest.deadline; h.pulse(); await settle(h);
  assert.equal(h.suspended, true); assert.equal(h.own, false); assert.equal(h.latest.phase, 'speaking');
  const turnId = h.latest.turnId; h.close(); h.pulse(); await h.renew(); await settle(h);
  assert.equal(h.latest.turnId, turnId); assert.equal(f.timers.size, 0);
});

test('custom timing survives start, settings and host replacement while private speaking deadlines remain hidden', async () => {
  const f = setup(), first = f.host(); await settle(first);
  await first.start({ speed: 'custom', customMinSeconds: 37, customMaxSeconds: 37 }); await settle(first);
  assert.equal(first.latest.rulesVersion, 2); assert.equal(first.latest.speed, 'custom');
  for (let n = 1; n <= 4; n++) {
    assert.equal(f.card(n).cut.customMinSeconds, 37); assert.equal(f.card(n).cut.customMaxSeconds, 37);
    assert.equal(f.card(n).cut.deadline, undefined); assert.equal(f.card(n).cut.speakingDurationMs, undefined);
    assert.equal(f.card(n).cut.canEndTopic, false);
  }
  await first.command('begin'); await settle(first); await f.advance(first, first.latest.phaseUntil);
  assert.equal(first.latest.deadline - f.now, 37000);
  const topic = first.latest.topic.id, stats = clone(first.latest.stats), sequence = first.latest.speakerSequence;
  await first.command('settings'); await settle(first);
  await assert.rejects(first.command('configure', { speed: 'custom', customMinSeconds: 45, customMaxSeconds: 44 }), /invalid_options/);
  assert.equal(first.latest.phase, 'setup'); assert.equal(first.latest.customMinSeconds, 37); assert.equal(first.latest.customMaxSeconds, 37);
  await first.command('configure', { speed: 'custom', customMinSeconds: 50, customMaxSeconds: 60 }); await settle(first);
  assert.equal(first.latest.phase, 'ready'); assert.equal(first.latest.topic.id, topic);
  first.close(); await settle(first); const restored = f.host(); await settle(restored);
  assert.equal(restored.own, true); assert.equal(restored.latest.phase, 'ready'); assert.equal(restored.latest.customMinSeconds, 50);
  assert.equal(restored.latest.customMaxSeconds, 60); assert.deepEqual(clone(restored.latest.stats), stats);
  await restored.command('begin'); await settle(restored); await f.advance(restored, restored.latest.phaseUntil);
  assert.ok(restored.latest.deadline - f.now >= 50000 && restored.latest.deadline - f.now <= 60000);
  assert.equal(restored.latest.speakerSequence, sequence);
  assert.equal(f.card(1).cut.deadline, undefined); assert.equal(f.card(1).cut.speakingDurationMs, undefined);
  restored.close();
});

test('legacy host controls reject player End topic while active shared controllers can end it exactly once', async () => {
  const f = setup(), h = f.host(); await settle(h); await h.start(); await settle(h); await firstCut(f, h);
  const before = h.latest.turnId, topic = h.latest.topic.id;
  await f.action(1, 'endTopic', { actor: 0 }); await settle(h);
  assert.equal(h.latest.phase, 'cut'); assert.equal(h.latest.turnId, before); assert.equal(f.card(1).cut.reply.error, 'not_available');
  const controlPath = 'rooms/CUTTEST/players/' + f.extras.cutControlToken;
  const raw = clone(f.db.values.get(controlPath)), shared = JSON.parse(raw.stateJson); shared.sharedControls = true;
  f.db.put(controlPath, { ...raw, stateJson: JSON.stringify(shared) }); await settle(h);
  for (let n = 1; n <= 4; n++) assert.equal(f.card(n).cut.canEndTopic, true);
  await h.command('exclude', { playerNum: 4, active: false }); await settle(h);
  assert.equal(f.card(4).cut.canEndTopic, false);
  await f.action(4, 'endTopic', { actor: 0 }); await settle(h);
  assert.equal(h.latest.phase, 'cut'); assert.equal(f.card(4).cut.reply.error, 'not_available');
  const waiting = { sessionId: h.latest.sessionId, turnId: h.latest.turnId }, stats = clone(h.latest.stats);
  const requests = await Promise.all([f.action(1, 'endTopic', waiting), f.action(2, 'endTopic', waiting)]); await settle(h);
  assert.equal(h.latest.phase, 'break'); assert.equal(h.latest.turnId, waiting.turnId + 1);
  assert.equal(h.latest.topic.id, topic); assert.deepEqual(clone(h.latest.stats), stats); assert.equal(h.latest.cutEvent, null);
  assert.equal(Object.values(h.latest.replies).filter(reply => requests.some(request => request.id === reply.id) && !reply.error).length, 1);
  assert.equal(f.card(1).cut.canEndTopic, false); assert.equal(f.card(1).cut.canBegin, false); h.close();
});

test('reopening a saved final CUT removes the old automatic topic limit without changing its topic or fairness', async () => {
  const f = setup(), first = f.host(); await settle(first); await first.start(); await settle(first); await firstCut(f, first);
  const controlPath = 'rooms/CUTTEST/players/' + f.extras.cutControlToken;
  const raw = clone(f.db.values.get(controlPath)), old = JSON.parse(raw.stateJson);
  old.rulesVersion = 1; old.targetCuts = old.cutsCompleted; old.nextSpeaker = null;
  old.cutEvent.final = true; old.cutEvent.to = null; old.phaseUntil = f.now + 900;
  delete old.customMinSeconds; delete old.customMaxSeconds;
  f.db.put(controlPath, { ...raw, stateJson: JSON.stringify(old) }); await settle(first);
  first.close(); await settle(first); const restored = f.host(); await settle(restored);
  assert.equal(restored.latest.rulesVersion, 2); assert.equal(restored.latest.targetCuts, null);
  assert.equal(restored.latest.phase, 'cut'); assert.equal(restored.latest.phaseUntil, null); assert.equal(restored.latest.cutEvent.final, false);
  assert.notEqual(restored.latest.nextSpeaker, old.speaker); assert.equal(restored.latest.cutEvent.id, old.cutEvent.id);
  assert.equal(restored.latest.topic.id, old.topic.id); assert.deepEqual(clone(restored.latest.stats), old.stats);
  await f.advance(restored, f.now + 60000); assert.equal(restored.latest.phase, 'cut');
  await restored.command('begin'); await settle(restored); assert.equal(restored.latest.phase, 'speaking');
  await f.advance(restored, restored.latest.deadline); assert.equal(restored.latest.phase, 'cut');
  assert.equal(restored.latest.cutsCompleted, old.cutsCompleted + 1); assert.equal(restored.latest.topic.id, old.topic.id);
  restored.close();
});
