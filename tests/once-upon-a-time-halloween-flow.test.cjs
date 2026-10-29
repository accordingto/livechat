'use strict';
// Real Once engine, UI, transport and server core; every database boundary below
// is isolated in memory. This is not a live-Firebase or physical-device test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../once-upon-a-time-engine.js');
const D = require('../once-upon-a-time-deck.js');
const H = require('../once-upon-a-time-halloween-deck.js');
const UI = require('../once-upon-a-time-ui.js');
const { adapters: A } = require('../runtime/story-executor.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Halloween Seat ' + (i + 1) }));
let serial = 0;
const command = (s, type, actor = 0, extra = {}) => ({ id: 'halloween-flow-' + ++serial, sessionId: s.sessionId, turnId: s.turnId, now: 2000 + serial, seed: serial * 7919, type, actor, ...extra });
function act(s, type, actor = 0, extra = {}) {
  const next = E.apply(s, command(s, type, actor, extra));
  assert.equal(next.replies[actor]?.error, '', type + ' should be accepted');
  return next;
}
const create = (count = 6, handSize = null, seed = 31, extra = {}) => E.create({ id: 'halloween-' + ++serial, roster: roster(count), world: 'halloween', handSize, seed, now: 1000, ...extra });
const start = (count = 6, handSize = 5, seed = 31, extra) => act(act(create(count, handSize, seed, extra), 'deal'), 'chooseFirst', 0, { playerNum: 1 });
function conservation(s) {
  const story = [...E.list(s.storyDeck), ...E.list(s.storyDiscard), ...E.list(s.storyHeld), ...Object.values(s.hands || {}).flatMap(E.list)];
  assert.equal(story.length, 150); assert.equal(new Set(story).size, 150);
  assert.deepEqual(story.slice().sort(), H.storyCards.map(card => card.id).sort());
  const endings = [...E.list(s.endingDeck), ...E.list(s.endingDiscard), ...Object.values(s.endings || {}).filter(Boolean), ...(s.endingPlayed ? [s.endingPlayed.cardId] : [])];
  assert.equal(endings.length, 20); assert.equal(new Set(endings).size, 20);
  assert.deepEqual(endings.slice().sort(), H.endingCards.map(card => card.id).sort());
}
function assertPrivate(s, views) {
  for (const viewer of [0, ...s.roster.map(seat => seat.playerNum)]) {
    const view = views ? views(viewer) : E.view(s, viewer).once;
    const text = JSON.stringify(view);
    for (const seat of s.roster) if (seat.playerNum !== viewer) {
      for (const id of E.list(s.hands[seat.playerNum])) assert.equal(text.includes(JSON.stringify(id)), false, 'another hand stays private');
      assert.equal(text.includes(JSON.stringify(s.endings[seat.playerNum])), false, 'another Ending stays private');
    }
    for (const key of ['hands', 'endings', 'storyDeck', 'endingDeck', 'rngState', 'rollback']) assert.equal(Object.hasOwn(view, key), false);
    if (!viewer) { assert.equal(view.hand, undefined); assert.equal(view.ending, undefined); }
    else { assert.deepEqual(E.list(view.hand).map(card => card.id), E.list(s.hands[viewer])); assert.equal(view.ending.id, s.endings[viewer]); }
  }
}
function give(s, seat, cardId) {
  if (s.starterCard === cardId) {
    const replacement = s.storyDeck.find(id => id !== cardId);
    s.storyDeck = s.storyDeck.filter(id => id !== replacement);
    s.storyDiscard = s.storyDiscard.filter(id => id !== cardId); s.storyDiscard.push(replacement); s.starterCard = replacement;
  }
  for (const key of ['storyDeck', 'storyDiscard', 'storyHeld']) s[key] = s[key].filter(id => id !== cardId);
  for (const hand of Object.values(s.hands)) { const index = hand.indexOf(cardId); if (index >= 0) hand.splice(index, 1); }
  s.hands[seat].push(cardId);
}
function emptyHand(s, seat) { s.storyDiscard.push(...s.hands[seat]); s.hands[seat] = []; }
function finish(s, choice) { for (const seat of E.list(s.vote.eligible)) s = act(s, 'vote', seat, { voteId: s.vote.id, choice }); return s; }

test('Halloween lobby selection is fenced, saved and public while cards remain undealt', () => {
  const initial = E.create({ id: 'halloween-select', roster: roster(6), seed: 3 });
  const denied = E.apply(initial, command(initial, 'configure', 2, { actor: 2, world: 'halloween', handSize: 4 }));
  assert.equal(denied.replies[2].error, 'not_available'); assert.equal(denied.world, 'classic');
  const request = command(initial, 'configure', 0, { world: 'halloween', handSize: 4 });
  const saved = E.apply(initial, request);
  assert.equal(saved.world, 'halloween'); assert.equal(saved.handSize, 4); assert.equal(saved.interruptProfile, 3);
  assert.equal(E.apply(saved, request), saved, 'retry reuses the one settings receipt');
  for (const seat of [0, 1, 6]) {
    const view = E.view(saved, seat).once;
    assert.equal(view.world, 'halloween'); assert.equal(view.resolvedHandSize, 4);
    assert.equal(view.actions.configure, seat === 0); assert.equal(view.ending, seat ? null : undefined);
  }
  const stale = E.apply(saved, command(saved, 'configure', 0, { turnId: initial.turnId, world: 'classic' }));
  assert.equal(stale.replies[0].error, 'stale_turn'); assert.equal(stale.world, 'halloween');
  const dealt = act(saved, 'deal'), locked = E.apply(dealt, command(dealt, 'configure', 0, { world: 'classic' }));
  assert.equal(locked.replies[0].error, 'not_available'); assert.deepEqual(locked.hands, dealt.hands);
});

test('Halloween supports every 2–6-player automatic or 3–9-card opening without mixing worlds or leaking hands', () => {
  for (const count of [2, 3, 4, 5, 6]) for (const size of [null, 3, 4, 5, 6, 7, 8, 9]) {
    const s = act(create(count, size, 317 + count), 'deal'), expected = size || Math.max(5, 11 - count);
    assert.equal(s.phase, 'CHOOSING_FIRST'); assert.equal(s.world, 'halloween');
    for (const hand of Object.values(s.hands)) {
      assert.equal(hand.length, expected);
      const kinds = {}; for (const id of hand) { const category = D.storyById[id].category; kinds[category] = (kinds[category] || 0) + 1; }
      assert.ok(Object.keys(kinds).length >= Math.min(expected, expected >= 7 ? 4 : 3));
      assert.ok(Math.max(...Object.values(kinds)) <= Math.ceil(expected * 0.4));
    }
    conservation(s); assertPrivate(s);
    assert.deepEqual(E.view(clone(s), 3 <= count ? 3 : 1).once, E.view(s, 3 <= count ? 3 : 1).once, 'JSON reconnect preserves exact cards');
  }
});

test('all 42 current Halloween Interrupts take over by category; saved profiles keep the released 40', () => {
  const released = new Set(H.profile2InterruptIds);
  for (const card of H.storyCards.filter(item => item.isInterrupt)) for (const profile of [3, 2, 1]) {
    let s = start(); if (profile === 1) delete s.interruptProfile; else s.interruptProfile = profile;
    const normal = H.storyCards.find(item => item.category === card.category && !item.isInterrupt && item.id !== s.starterCard);
    give(s, 1, normal.id); give(s, 2, card.id); s = act(s, 'play', 1, { cardId: normal.id });
    const view = E.view(s, 2).once;
    if (profile < 3 && !released.has(card.id)) {
      // Only cards held alone can prove the saved mix: drop any other same-category Interrupt.
      s.storyDiscard.push(...s.hands[2].filter(id => id !== card.id)); s.hands[2] = [card.id];
      const saved = E.view(s, 2).once;
      assert.equal(saved.hand[0].isInterrupt, false, card.id + ' is not an Interrupt in a profile-' + profile + ' game');
      assert.equal(saved.actions.categoryInterrupt, false);
      continue;
    }
    assert.equal(view.hand.find(item => item.id === card.id).isInterrupt, true, card.id);
    assert.equal(view.actions.categoryInterrupt, true);
    const html = UI.tableHTML({ game: 'onceupon', once: view }, { selectedId: card.id });
    assert.match(html, /data-once-action="interrupt"[^>]*data-mode="category"/);
    const request = command(s, 'interrupt', 2, { cardId: card.id, mode: 'category', opportunityId: s.categoryOpportunity.id });
    const old = s.hands[1].length; s = E.apply(s, request);
    assert.equal(s.replies[2].error, ''); assert.equal(s.storyteller, 2); assert.equal(s.hands[1].length, old + 1);
    assert.equal(s.history.at(-1).cardId, card.id); assert.equal(s.history.at(-1).mode, 'category');
    assert.equal(E.apply(s, request), s, 'retry never adds a second penalty draw'); conservation(s);
  }
});

test('Halloween normal play, disputed takeover, pass, Ending rejection and accepted Ending complete a game', () => {
  let s = start(4, 3);
  s = act(s, 'play', 1, { cardId: s.hands[1][0] }); const previous = clone(s.hands[1]);
  s = act(s, 'interrupt', 2, { cardId: s.hands[2][0], mode: 'normal' });
  s = act(s, 'dispute', 1, { interruptId: s.interrupt.id }); s = finish(s, 'invalid');
  assert.equal(s.storyteller, 1); assert.deepEqual(s.hands[1], previous); conservation(s);
  const top = s.storyDeck[0]; s = act(s, 'pass', 1); assert.equal(s.hands[1].at(-1), top);
  s = act(s, 'keepAll', 1); assert.equal(s.storyteller, 2);
  emptyHand(s, 2); const firstEnding = s.endings[2]; s = act(s, 'ending', 2); s = finish(s, 'reject');
  assert.ok(s.endingDiscard.includes(firstEnding)); assert.notEqual(s.endings[2], firstEnding);
  assert.equal(s.hands[2].length, 1); assert.equal(s.storyteller, 3); conservation(s);
  emptyHand(s, 3); s = act(s, 'ending', 3); s = finish(s, 'accept');
  assert.equal(s.phase, 'FINISHED'); assert.equal(s.winner, 3); conservation(s);
});

test('Halloween restart clears previous match data, keeps world/size and safely switches back to Classic', () => {
  let s = start(6, 4); s = act(s, 'play', 1, { cardId: s.hands[1][0] }); s = act(s, 'challenge', 2);
  const old = clone(s), late = command(s, 'vote', 3, { voteId: s.vote.id, choice: 'lose' });
  s = act(s, 'restart'); assert.notEqual(s.sessionId, old.sessionId);
  assert.equal(s.world, 'halloween'); assert.equal(s.handSize, 4); assert.equal(s.interruptProfile, 3);
  assert.equal(s.phase, 'LOBBY'); assert.equal(s.vote, null); assert.deepEqual(s.history, []);
  assert.deepEqual(s.hands, {}); assert.deepEqual(s.endings, {}); assert.deepEqual(s.readiness, {});
  assert.equal(E.apply(s, late), s); const redealt = act(s, 'deal'); conservation(redealt);
  assert.notDeepEqual(redealt.hands, old.hands);
  let classic = act(act(redealt, 'restart'), 'configure', 0, { world: 'classic', handSize: null }); classic = act(classic, 'deal');
  assert.ok(Object.values(classic.hands).flat().every(id => id.startsWith('once-') && !id.startsWith('once-hw-') && !id.startsWith('once-mf-')));
});

test('Halloween private UI shows the selected world and own cards, with Ending open and host secrets absent', () => {
  const lobby = create(6, 4), lobbyHTML = UI.tableHTML(E.view(lobby, 0), { host: true });
  assert.match(lobbyHTML, /<option value="halloween"[^>]*selected[^>]*>Spooky Halloween/);
  const s = act(lobby, 'deal'), publicHTML = UI.tableHTML(E.view(s, 0), { host: true });
  assert.match(publicHTML, /Spooky Halloween/); assert.doesNotMatch(publicHTML, /data-once-card=|once-ending-dock|once-hand-panel/);
  for (const seat of s.roster) {
    const html = UI.tableHTML(E.view(s, seat.playerNum));
    assert.match(html, /Spooky Halloween/); assert.match(html, /<details[^>]*class="[^"]*\bonce-ending-dock\b[^"]*"[^>]*open/);
    assert.ok(html.includes(UI.esc(D.endingById[s.endings[seat.playerNum]].text)));
    for (const id of s.hands[seat.playerNum]) assert.ok(html.includes('data-once-card="' + id + '"'));
    for (const other of s.roster.filter(p => p.playerNum !== seat.playerNum)) {
      assert.equal(html.includes('data-once-card="' + s.endings[other.playerNum] + '"'), false);
      for (const id of s.hands[other.playerNum]) assert.equal(html.includes('data-once-card="' + id + '"'), false);
    }
  }
});

test('Halloween server adapter binds authenticated actors, retains selected world and projects only private ownership', () => {
  const ctx = actor => ({ now: 3000, seed: 72, seat: { playerNum: actor, token: 'synthetic-private-token', path: 'synthetic/private/path' }, actor });
  const initial = E.create({ id: 'halloween-adapter', roster: roster(6), seed: 4, sharedControls: true });
  const request = { ...command(initial, 'configure', 0, { world: 'halloween', handSize: 9 }), actor: 0 };
  let s = A.onceupon.apply(initial, request, ctx(3));
  assert.equal(s.replies[3].error, ''); assert.equal(s.replies[0], undefined); assert.equal(s.world, 'halloween');
  s = A.onceupon.apply(s, command(s, 'deal', 0), ctx(2)); conservation(s);
  const raw = A.onceupon.encode({ stateJson: JSON.stringify(s), revision: 6, retained: true }, s);
  const restored = A.onceupon.decode(raw); assert.deepEqual(restored.hands, s.hands); assert.equal(restored.world, 'halloween');
  assertPrivate(s, seat => A.onceupon.project(restored, { playerNum: seat }, ctx(seat)).once);
  for (const seat of [0, 1, 6]) assert.doesNotMatch(JSON.stringify(A.onceupon.project(s, { playerNum: seat }, ctx(seat))), /synthetic-private-token|synthetic\/private\/path/);
  assert.throws(() => A.onceupon.apply(s, request, ctx(99)), /not_eligible/);
});

// Asynchronous Firebase SDK double: per-node atomicity plus updater retries.
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) { for (let i = 0; i < 10; i++) { await tick(); await Promise.all(hosts.flatMap(h => [h.serial, h.outgoing])); } }
function sdkFixture(t) {
  const values = new Map([['.info/connected', true], ['.info/serverTimeOffset', 0]]), listeners = new Map(), tails = new Map();
  const db = { values, put(path, value) { values.set(path, clone(value)); for (const cb of listeners.get(path) || []) queueMicrotask(() => cb({ val: () => clone(value) })); },
    ref(path) { return { on(event, cb) { if (!listeners.has(path)) listeners.set(path, new Set()); listeners.get(path).add(cb); queueMicrotask(() => cb({ val: () => clone(values.get(path)) })); },
      off(event, cb) { listeners.get(path)?.delete(cb); }, async once() { return { val: () => clone(values.get(path)) }; },
      transaction(update) { const pending = (tails.get(path) || Promise.resolve()).then(() => { const first = update(clone(values.get(path))), next = update(clone(values.get(path))); assert.deepEqual(next, first); if (next === undefined) return { committed: false, snapshot: { val: () => clone(values.get(path)) } }; db.put(path, next); return { committed: true, snapshot: { val: () => clone(next) } }; }); tails.set(path, pending.catch(() => {})); return pending; }
    }; } };
  const paths = roster(6).map(p => 'rooms/HALLOWEEN-UNIT/players/seat-' + p.playerNum), extras = {}, hosts = [];
  const room = { code: 'HALLOWEEN-UNIT', count: 6, answers: {}, name: i => 'Halloween Seat ' + (i + 1), getExtra: k => extras[k], setExtra: (k, v) => { extras[k] = v; }, playerRef: i => db.ref(paths[i]) };
  const context = vm.createContext({ crypto, Date, ONCE_ENGINE: E, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../once-upon-a-time-sync.js'), 'utf8'), context);
  const host = () => { const h = new context.ONCE_SYNC.Host({ db, room, onChange: value => { h.latest = value; } }); hosts.push(h); h.connect(); return h; };
  paths.forEach((p, i) => db.ref(p).on('value', snapshot => { room.answers[i + 1] = snapshot.val(); for (const h of hosts) h.receive(i + 1, snapshot.val()); }));
  t.after(async () => { for (const h of hosts) h.close(); await settle(...hosts); });
  const card = n => clone(values.get(paths[n - 1]));
  const send = async (h, n, type, extra = {}) => { const view = card(n).once; const request = { id: crypto.randomUUID(), sessionId: view.sessionId, turnId: view.turnId, type, ...extra }; await db.ref(paths[n - 1]).transaction(old => ({ ...old, onceAction: request })); await settle(h); return request; };
  return { host, db, room, card, send };
}

test('six asynchronous Halloween card clients synchronize settings, deal, reconnect and restart without private leakage', async t => {
  const f = sdkFixture(t), h = f.host(); await settle(h); await h.start(); await settle(h);
  await h.command('configure', { world: 'halloween', handSize: 4 }); await settle(h);
  for (const seat of roster(6)) { assert.equal(f.card(seat.playerNum).once.world, 'halloween'); assert.equal(f.card(seat.playerNum).once.resolvedHandSize, 4); }
  await Promise.all([1, 2, 3, 4, 5, 6].map(n => f.send(h, n, 'ready', { value: true })));
  await h.command('deal'); await settle(h); conservation(h.doc.state);
  assertPrivate(h.doc.state, seat => seat ? f.card(seat).once : h.latest.once);
  await h.command('chooseFirst', { playerNum: 1 }); await settle(h);
  const before = clone(h.doc.state), second = f.host(); await settle(h, second); assert.equal(second.own, false);
  h.close(); await settle(h, second); await second.renew(); await settle(second);
  assert.equal(second.own, true); assert.deepEqual(second.doc.state.hands, before.hands); assert.deepEqual(second.doc.state.endings, before.endings);
  const play = await f.send(second, 1, 'play', { cardId: before.hands[1][0] });
  for (const seat of roster(6)) { assert.equal(f.card(seat.playerNum).once.history.at(-1).cardId, before.hands[1][0]); assert.equal(f.card(seat.playerNum).once.world, 'halloween'); }
  assert.equal(f.card(1).once.reply.id, play.id);
  await second.command('restart'); await settle(second);
  assert.equal(second.doc.state.world, 'halloween'); assert.equal(second.doc.state.handSize, 4); assert.deepEqual(second.doc.state.hands, {});
  assert.notEqual(second.doc.state.sessionId, before.sessionId);
  for (const seat of roster(6)) { assert.deepEqual(f.card(seat.playerNum).once.hand, []); assert.equal(f.card(seat.playerNum).once.ending, null); }
});

// Full executor core against a local REST/ETag boundary, no network requests.
function firebaseWire(value) {
  if (value == null) return null;
  if (Array.isArray(value)) { const result = value.map(firebaseWire); while (result.length && result.at(-1) == null) result.pop(); return result.length ? result : null; }
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, firebaseWire(v)]).filter(([, v]) => v != null);
  if (!entries.length) return null;
  if (entries.every(([k]) => /^\d+$/.test(k))) { const result = []; for (const [k, v] of entries) result[Number(k)] = v; return result; }
  return Object.fromEntries(entries);
}
function serviceFixture() {
  const nodes = new Map(), versions = new Map(); let sequence = 0, conflicts = 0;
  const set = (p, v) => { nodes.set(p, firebaseWire(clone(v))); versions.set(p, (versions.get(p) || 0) + 1); };
  const get = p => clone(nodes.get(p));
  const code = 'HWUNIT', controlToken = 'a'.repeat(32), seats = roster(6).map(p => ({ playerNum: p.playerNum, token: String(p.playerNum).repeat(32) }));
  const canonical = 'rooms/' + code + '/players/' + controlToken, playerPath = n => 'rooms/' + code + '/players/' + seats[n - 1].token;
  const initial = E.create({ id: 'halloween-server-fixture', roster: roster(6), seed: 73, now: 1000 });
  set(canonical, { stateJson: JSON.stringify(initial), revision: 1, owner: 'old-browser', leaseUntil: 15000 });
  for (const seat of seats) set(playerPath(seat.playerNum), E.view(initial, seat.playerNum, 1000));
  const fetchImpl = async (raw, options = {}) => {
    const url = new URL(raw); assert.equal(url.origin, 'http://localhost'); const p = url.pathname.slice(1).replace(/\.json$/, '');
    assert.ok(p === canonical || seats.some(s => playerPath(s.playerNum) === p), 'service touches only its seven synthetic nodes');
    const etag = '"' + (versions.get(p) || 0) + '"';
    if (!options.method || options.method === 'GET') return { ok: true, status: 200, headers: new Headers({ etag }), json: async () => get(p) };
    assert.equal(options.method, 'PUT'); assert.ok(options.headers['If-Match']);
    if (options.headers['If-Match'] !== etag) { conflicts++; return { ok: false, status: 412 }; }
    set(p, JSON.parse(options.body)); return { ok: true, status: 200, json: async () => get(p) };
  };
  const service = createExecutor({ secret: '57'.repeat(32), databaseURL: 'http://localhost', fetchImpl, now: () => 1000, games: A });
  const state = () => A.onceupon.decode(get(canonical)), card = n => get(playerPath(n));
  const pulse = n => service.execute({ capsule: card(n).hubExecutor.capsule, token: seats[n - 1].token });
  const mailbox = (n, type, extra = {}) => { const s = state(), request = { id: 'halloween-service-' + ++sequence, sessionId: s.sessionId, turnId: s.turnId, type, ...extra }; set(playerPath(n), { ...card(n), onceAction: request }); return request; };
  const perform = async (n, type, extra = {}) => { const request = mailbox(n, type, extra); await pulse(n); assert.equal(card(n).once.reply.id, request.id); assert.equal(card(n).once.reply.error, '', type); return request; };
  const register = () => service.register({ game: 'onceupon', code, controlToken, seats, sessionId: initial.sessionId });
  return { service, state, card, perform, mailbox, pulse, register, seats, controlToken, conflicts: () => conflicts,
    publicView: () => A.onceupon.project(state(), 0, { now: 1000 }).once };
}

test('Halloween six-player real executor core saves settings, deals only its world and finishes by original player links', async () => {
  const f = serviceFixture(); await f.register();
  await f.perform(3, 'configure', { actor: 0, world: 'halloween', handSize: 3 });
  for (const seat of f.seats) assert.equal(f.card(seat.playerNum).once.world, 'halloween');
  await f.perform(2, 'deal'); conservation(f.state()); assertPrivate(f.state(), n => n ? f.card(n).once : f.publicView());
  assert.equal(f.state().sharedControls, true); await f.perform(4, 'chooseFirst', { playerNum: 1 });
  for (const id of E.list(f.state().hands[1])) await f.perform(1, 'play', { cardId: id });
  await f.perform(1, 'ending'); assert.equal(f.state().phase, 'ENDING_REVIEW');
  const revealed = f.state().endingPlayed.cardId; assert.equal(f.publicView().endingCard.id, revealed);
  for (const n of E.list(f.state().vote.eligible)) await f.perform(n, 'vote', { voteId: f.state().vote.id, choice: 'accept' });
  assert.equal(f.state().phase, 'FINISHED'); assert.equal(f.state().winner, 1); conservation(f.state());
  const previous = f.state().sessionId; await f.perform(2, 'restart'); assert.notEqual(f.state().sessionId, previous);
  assert.equal(f.state().world, 'halloween'); assert.equal(f.state().handSize, 3); assert.equal(f.state().phase, 'LOBBY');
  for (const seat of f.seats) {
    const data = f.card(seat.playerNum), text = JSON.stringify(data);
    assert.equal(E.list(data.once.hand).length, 0); assert.equal(data.once.ending ?? null, null);
    assert.equal(text.includes(f.controlToken), false);
    for (const other of f.seats.filter(s => s.playerNum !== seat.playerNum)) assert.equal(text.includes(other.token), false);
  }
});

test('Halloween executor concurrent deals and duplicate player pulses commit one physical deal', async () => {
  const f = serviceFixture(); await f.register(); await f.perform(2, 'configure', { world: 'halloween', handSize: 5 });
  f.mailbox(2, 'deal', { actor: 0 }); f.mailbox(3, 'deal', { actor: 0 });
  await Promise.all([f.pulse(2), f.pulse(3), f.pulse(4)]);
  assert.ok(f.conflicts() > 0); assert.equal(f.state().phase, 'CHOOSING_FIRST'); conservation(f.state());
  const before = clone(f.state().hands), endings = clone(f.state().endings);
  await Promise.all([f.pulse(2), f.pulse(3)]);
  assert.deepEqual(f.state().hands, before); assert.deepEqual(f.state().endings, endings);
  assertPrivate(f.state(), n => n ? f.card(n).once : f.publicView());
});
