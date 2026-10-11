const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const E = require('../sketch-relay-engine.js');
const ART = require('../sketch-relay-art.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value) });

// Firebase drops empty containers and nulls; numeric keys and arrays are kept
// as written here because canonical state is stored as JSON text anyway.
function normalize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const clean = normalize(entry); if (clean !== null) output[key] = clean; }
  return Object.keys(output).length ? output : null;
}
function database() {
  let tree = { '.info': { connected: true, serverTimeOffset: 0 } };
  const listeners = new Map(); let tail = Promise.resolve(); const hooks = new Map(); let writes = 0; const log = [];
  const parts = path => path.split('/').filter(Boolean);
  function get(path) { let node = tree; for (const p of parts(path)) { if (node == null || typeof node !== 'object') return null; node = node[p]; } return node ?? null; }
  function set(path, value) {
    const keys = parts(path); const clean = normalize(clone(value));
    if (!keys.length) { tree = clean || {}; }
    else {
      let node = tree;
      for (const k of keys.slice(0, -1)) { if (node[k] == null || typeof node[k] !== 'object') node[k] = {}; node = node[k]; }
      if (clean === null) delete node[keys.at(-1)]; else node[keys.at(-1)] = clean;
    }
    writes++; log.push({ path, size: JSON.stringify(clean ?? null).length });
    for (const [p, fns] of listeners) {
      if (p === path || p.startsWith(path + '/') || path.startsWith(p + '/')) for (const fn of fns) queueMicrotask(() => fn(snap(get(p))));
    }
  }
  const api = {
    get, set, hooks, log, get writes() { return writes; },
    ref(path) {
      const ref = {
        path, key: parts(path).at(-1),
        child: name => api.ref(path + '/' + name),
        on(_e, fn) { if (!listeners.has(path)) listeners.set(path, new Set()); listeners.get(path).add(fn); queueMicrotask(() => fn(snap(get(path)))); },
        off(_e, fn) { listeners.get(path)?.delete(fn); },
        once: async () => snap(get(path)),
        set: async value => { set(path, value); },
        transaction(updater) {
          const task = tail.then(async () => {
            const hook = hooks.get(path); if (hook) { hooks.delete(path); await hook(); }
            const next = updater(clone(get(path)));
            if (next === undefined) return { committed: false, snapshot: snap(get(path)) };
            set(path, next); return { committed: true, snapshot: snap(get(path)) };
          });
          tail = task.catch(() => {}); return task;
        },
      };
      return ref;
    },
  };
  return api;
}
const turn = () => new Promise(resolve => setImmediate(resolve));
async function settle(...hosts) {
  for (let n = 0; n < 12; n++) { await turn(); await Promise.all(hosts.map(h => h.serial)); }
}
function setup(count = 4) {
  let clock = 500000; const db = database();
  const extras = {}, timers = new Map(); let timerId = 0;
  class ClockDate extends Date { static now() { return clock; } }
  const paths = Array.from({ length: count }, (_, i) => `rooms/RELAY/players/card-${i + 1}`);
  const room = { code: 'RELAY', count, name: i => ['Amy', 'Ben', 'Cai', 'Dee', 'Eli', 'Fay'][i],
    getExtra: key => extras[key], setExtra: (key, value) => { extras[key] = value; }, playerRef: i => db.ref(paths[i]) };
  const storages = [];
  const context = vm.createContext({ crypto, Date: ClockDate, SKETCH_RELAY_ENGINE: E, JSON, Math, Object, Array, Number, String, Promise, Set, Map,
    setInterval: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearInterval: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(require.resolve('../sketch-relay-sync.js'), 'utf8'), context);
  function host(storage = (() => { const m = new Map(); const s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; storages.push(s); return s; })()) {
    const h = new context.SKETCH_RELAY_SYNC.Host({ db, room, storage, onChange: state => { h.latest = state; }, onStatus: status => { h.lastStatus = status; } });
    h.connect(); return h;
  }
  const f = {
    db, room, paths, host, extras,
    card: n => clone(db.get(paths[n - 1])),
    base: () => `rooms/RELAY/players/${extras.sketchRelayControlToken}`,
    get now() { return clock; }, set now(v) { clock = v; },
    async send(n, type, extra = {}) {
      const card = f.card(n);
      const action = { id: crypto.randomUUID(), type, sessionId: card.relay.sessionId, turnId: card.relay.turnId, ...extra };
      await db.ref(paths[n - 1]).transaction(old => ({ ...old, relayAction: action }));
      return action;
    },
  };
  return f;
}
const doodle = n => ART.encode([{ color: n % 7, size: 1, points: [n * 30, 100, 500, 500, 900, 120 + n] }]);
async function ready(f, h) { for (let n = 1; n <= f.room.count; n++) { await f.send(n, 'ready'); await settle(h); } }
async function answerAll(f, h) {
  for (let n = 1; n <= f.room.count; n++) {
    const task = f.card(n).relay.me.task;
    if (!task || task.submitted || task.skipped) continue;
    await f.send(n, 'submit', task.kind === 'sketch' ? { book: task.book, kind: 'sketch', art: doodle(n) } : { book: task.book, kind: 'guess', text: 'guess ' + n });
    await settle(h);
  }
}

test('a host claims the lease, opens the game on every card and keeps the lease separate from the drawings', async () => {
  const f = setup(4); f.db.set(f.paths[2], { game: 'cut', cut: { sessionId: 'old' } });
  const h = f.host(); await settle(h);
  assert.equal(h.lastStatus, 'ready');
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  const base = f.base();
  assert.equal(typeof f.db.get(base + '/core/stateJson'), 'string');
  assert.equal(f.db.get(base + '/lease/owner'), h.client);
  assert.equal(f.db.get(base + '/opening'), null, 'opening guard is cleared once every card is written');
  for (let n = 1; n <= 4; n++) {
    const card = f.card(n);
    assert.equal(card.game, 'sketchrelay'); assert.equal(card.playerNum, n); assert.equal(card.relay.phase, 'word');
    assert.equal(card.relay.me.card.length, 6); assert.equal(card.relayLive.sessionId, card.relay.sessionId);
    assert.ok(!JSON.stringify(card).includes(f.extras.sketchRelayControlToken));
  }
  // Lease renewal never rewrites the canonical game.
  const before = f.db.log.length;
  for (let i = 0; i < 5; i++) { f.now += 5000; await h.renew(); }
  await settle(h);
  const after = f.db.log.slice(before).map(w => w.path);
  assert.ok(after.every(p => p.endsWith('/lease')), after.join(','));
  h.close();
});

test('cards drive a whole round; requests are batched, replies reach the sender and unchanged cards are not rewritten', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'mixed', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  // Simultaneous ready taps are applied in one canonical write.
  const coreWrites = () => f.db.log.filter(w => w.path.endsWith('/core')).length;
  const startWrites = coreWrites();
  await Promise.all([1, 2, 3, 4].map(n => f.send(n, 'ready'))); await settle(h);
  assert.equal(h.latest.phase, 'play');
  assert.ok(coreWrites() - startWrites <= 2, `batched (${coreWrites() - startWrites})`);
  const task = f.card(1).relay.me.task;
  assert.equal(task.kind, 'sketch'); assert.equal(task.own, true);
  const sent = await f.send(1, 'submit', { book: task.book, kind: 'sketch', art: doodle(1) }); await settle(h);
  assert.equal(f.card(1).relay.reply.id, sent.id); assert.equal(f.card(1).relay.reply.error, '');
  assert.equal(f.card(1).relay.me.task.submitted.art, doodle(1));
  const bad = await f.send(2, 'submit', { book: f.card(2).relay.me.task.book, kind: 'sketch', art: '<b>' }); await settle(h);
  assert.equal(f.card(2).relay.reply.id, bad.id); assert.equal(f.card(2).relay.reply.error, 'invalid_sketch');
  await answerAll(f, h);
  assert.equal(h.latest.step, 1);
  // Guessers see only the drawing they received.
  const guess = f.card(2).relay.me.task;
  assert.equal(guess.kind, 'guess'); assert.equal(guess.prompt.art, doodle(1));
  assert.ok(!JSON.stringify(f.card(2)).includes(h.latest.books[0].pages[0].text) || h.latest.books[1].pages[0].text === h.latest.books[0].pages[0].text);
  for (let i = 0; i < 3; i++) await answerAll(f, h);
  assert.equal(h.latest.phase, 'reveal');
  assert.equal(f.card(3).relay.reveal.pages.length, 1);
  // Only the presenter's card and the host can turn pages.
  await f.send(2, 'revealNext', { book: 0, shown: 1 }); await settle(h);
  assert.equal(f.card(2).relay.reply.error, 'not_available');
  await f.send(1, 'revealNext', { book: 0, shown: 1 }); await settle(h);
  assert.equal(f.card(4).relay.reveal.pages.length, 2);
  // A reply to one player only rewrites that player's card.
  const writes = f.db.log.length;
  await f.send(3, 'revealNext', { book: 0, shown: 2 }); await settle(h);
  const touched = new Set(f.db.log.slice(writes).map(w => w.path));
  assert.ok(touched.has(f.paths[2])); assert.ok(!touched.has(f.paths[0]) && !touched.has(f.paths[3]), [...touched].join(','));
  h.close();
});

test('starting a new game over a finished one reopens every card under the new session', async () => {
  const f = setup(5); const h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  const first = f.card(1).relay.sessionId;
  for (let round = 0; round < 2; round++) {
    // Slow card writes give the opening guard every chance to be removed too early.
    for (let n = 2; n <= 5; n++) f.db.hooks.set(f.paths[n - 1], async () => { await turn(); await turn(); });
    await h.start({ deck: 'tricky', sketchSeconds: 90, scoring: 'none' }); await settle(h);
    assert.equal(h.lastStatus, 'ready');
    const session = h.latest.sessionId;
    assert.notEqual(session, first);
    for (let n = 1; n <= 5; n++) assert.equal(f.card(n).relay.sessionId, session, 'card ' + n);
    assert.equal(f.db.get(f.base() + '/opening'), null);
  }
  h.close();
});

test('sketch deadline: the host skips missing drawings only after the grace period', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'mixed', sketchSeconds: 45, scoring: 'none' }); await settle(h);
  await ready(f, h);
  const deadline = h.latest.deadline;
  f.now = deadline + E.AUTO_SKIP_GRACE_MS - 1; await h.renew(); h.pulse(); await settle(h);
  assert.equal(h.latest.step, 0);
  f.now = deadline + E.AUTO_SKIP_GRACE_MS; await h.renew(); h.pulse(); await settle(h);
  assert.equal(h.latest.step, 1);
  assert.ok(h.latest.books.every(b => b.pages[1].skipped));
  h.close();
});

test('a second host tab waits; a reloaded tab resumes its own lease at once; a closed host hands over', async () => {
  const f = setup(4); const storage = new Map(); const s = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  const a = f.host(s); await settle(a);
  await a.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(a);
  const b = f.host(); await settle(a, b);
  assert.equal(b.lastStatus, 'other_host');
  await assert.rejects(b.command('pause'), /other_host/);
  a.stopped = true; // simulate a reload without a clean release
  const again = f.host(s); await settle(again);
  assert.equal(again.client, a.client); assert.equal(again.lastStatus, 'ready');
  await again.command('pause'); await settle(again);
  assert.equal(again.latest.paused, true);
  again.close(); await settle(b);
  await b.renew(); await settle(b);
  assert.equal(b.lastStatus, 'ready');
  await b.command('resume'); await settle(b);
  assert.equal(b.latest.paused, false);
  b.close();
});

test('opening replaces a previous game even while its old host keeps refreshing, but never a newer game', async () => {
  const f = setup(4);
  f.db.set(f.paths[0], { game: 'cut', cut: { sessionId: 'old', hostLiveUntil: 1 } });
  const h = f.host(); await settle(h);
  // The old CUT host refreshes its card between our snapshot and our write.
  f.db.hooks.set(f.paths[0], async () => { f.db.set(f.paths[0], { game: 'cut', cut: { sessionId: 'old', hostLiveUntil: 2 }, cutAction: { id: 'x' } }); });
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  assert.equal(f.card(1).game, 'sketchrelay');
  assert.equal(h.lastStatus, 'ready');
  const g = setup(4); const k = g.host(); await settle(k);
  g.db.hooks.set(g.paths[3], async () => { g.db.set(g.paths[3], { game: 'dixit', dixit: { sessionId: 'brand-new' } }); });
  await k.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(k);
  assert.equal(g.card(4).game, 'dixit');
  assert.equal(k.lastStatus, 'switched');
  h.close(); k.close();
});

test('switching a card to another game suspends the host instead of overwriting it', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  f.db.set(f.paths[1], { game: 'dixit', dixit: { sessionId: 'newer' } }); await settle(h);
  assert.equal(h.lastStatus, 'switched');
  await assert.rejects(h.command('pause'), /not_available/);
  assert.equal(f.card(2).game, 'dixit');
  h.close();
});

test('heartbeat only touches the small relayLive child of cards in this game', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'friendly' }); await settle(h);
  const before = f.db.log.length, until = f.card(1).relayLive.until;
  f.now += 15000; h.heartbeat(); await settle(h);
  const paths = f.db.log.slice(before).map(w => w.path);
  assert.equal(paths.length, 4); assert.ok(paths.every(p => p.endsWith('/relayLive')));
  assert.ok(f.card(1).relayLive.until > until);
  h.close();
});

test('synced drafts survive a sleeping player card and stay private until the book passes', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 45, scoring: 'none' }); await settle(h);
  await ready(f, h);
  const task = f.card(1).relay.me.task, drawing = doodle(6);
  const before = f.db.log.length;
  const saved = await f.send(1, 'draft', { book: task.book, kind: 'sketch', art: drawing }); await settle(h);
  assert.equal(f.card(1).relay.reply.id, saved.id);
  assert.equal(f.card(1).relay.reply.error, '');
  assert.equal(f.card(1).relay.me.task.draft.art, drawing);
  assert.equal(h.latest.step, 0, 'saving a draft never passes a book');
  assert.equal(f.card(1).relay.progress.done, 0);
  for (let p = 2; p <= 4; p++) assert.ok(!JSON.stringify(f.card(p)).includes(drawing), 'draft private from player ' + p);
  assert.ok(!JSON.stringify(E.view(h.latest, 0, f.now)).includes(drawing), 'draft hidden from the shared projection');
  assert.ok(f.db.log.slice(before).every(w => w.path === f.paths[0] || w.path.endsWith('/core')), 'only the sender card updates');
  const deadline = h.latest.deadline;
  // No submit command arrives from player 1: their browser went to sleep.
  for (let p = 2; p <= 4; p++) {
    await f.send(p, 'submit', { book: f.card(p).relay.me.task.book, kind: 'sketch', art: doodle(p) }); await settle(h);
  }
  f.now = deadline + E.AUTO_SKIP_GRACE_MS; await h.renew(); h.pulse(); await settle(h);
  assert.equal(h.latest.step, 1);
  assert.equal(h.latest.books[0].pages[1].art, drawing);
  assert.equal(f.card(2).relay.me.task.prompt.art, drawing, 'next person gets the preserved drawing');
  assert.ok(!f.card(2).relay.me.task.draft, 'a previous holder draft is never projected to a new task');
  h.close();
});

test('the mailbox cannot replace a submitted drawing or save a draft while paused', async () => {
  const f = setup(4); const h = f.host(); await settle(h);
  await h.start({ deck: 'mixed', sketchSeconds: 60, scoring: 'none' }); await settle(h);
  await ready(f, h);
  const task = f.card(1).relay.me.task;
  await f.send(1, 'submit', { book: task.book, kind: 'sketch', art: doodle(1) }); await settle(h);
  await f.send(1, 'submit', { book: task.book, kind: 'sketch', art: doodle(2) }); await settle(h);
  assert.equal(f.card(1).relay.me.task.submitted.art, doodle(1));
  assert.equal(f.card(1).relay.reply.error, 'already_submitted');
  await h.command('pause'); await settle(h);
  const other = f.card(2).relay.me.task;
  await f.send(2, 'draft', { book: other.book, kind: 'sketch', art: doodle(2) }); await settle(h);
  assert.ok(f.card(2).relay.reply.error);
  assert.ok(!f.card(2).relay.me.task.draft);
  await h.command('resume'); await settle(h);
  await f.send(2, 'draft', { book: other.book, kind: 'sketch', art: doodle(2) }); await settle(h);
  assert.equal(f.card(2).relay.me.task.draft.art, doodle(2));
  h.close();
});

test('duplicated host tabs with copied sessionStorage cannot both execute the game', async () => {
  const f = setup(4), memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const a = f.host(storage); await settle(a);
  await a.start({ deck: 'easy', sketchSeconds: 60, scoring: 'none' }); await settle(a);
  const session = a.latest.sessionId;
  const b = f.host(storage); await settle(a, b);
  assert.equal(a.client, b.client, 'a browser duplicates this storage');
  assert.notEqual(a.instance, b.instance, 'each live document has a separate fence');
  assert.equal(a.own, false); assert.equal(b.own, true);
  assert.equal(a.lastStatus, 'other_host');
  assert.equal(b.latest.sessionId, session, 'the second tab resumes the same game');
  await a.renew(); await settle(a, b);
  assert.equal(a.own, false, 'a displaced tab must not steal the lease back');
  await assert.rejects(a.command('pause'), /other_host/);
  a.close(); await settle(b);
  assert.equal(b.own, true, 'closing the displaced tab must not release the live owner');
  await b.command('pause'); await settle(b);
  assert.equal(b.latest.paused, true);
  b.close();
});

test('two requests from one seat both get private receipts instead of stranding the first tab', async () => {
  const f = setup(4), h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'none' }); await settle(h);
  const first = await f.send(1, 'swapWord'); await settle(h);
  const second = await f.send(1, 'ready'); await settle(h);
  const receipts = f.card(1).relay.receipts;
  assert.ok(receipts.some(r => r.id === first.id && !r.error));
  assert.ok(receipts.some(r => r.id === second.id && !r.error));
  assert.ok(!JSON.stringify(f.card(2)).includes(first.id), 'other seats do not see receipts');
  h.close();
});

test('a changed room roster can open a fresh game without projecting the old books onto new seats', async () => {
  for (const count of [4, 6]) {
    const f = setup(5), memory = new Map();
    const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
    const a = f.host(storage); await settle(a);
    await a.start({ deck: 'easy', sketchSeconds: 60, scoring: 'none' }); await settle(a);
    const oldSession = a.latest.sessionId;
    a.close(); await settle(a);
    f.room.count = count;
    f.room.playerRef = i => f.db.ref(`rooms/RELAY/players/card-${i + 1}`);
    const b = f.host(storage); await settle(b);
    assert.equal(b.lastStatus, 'rosterChanged');
    assert.equal(b.suspended, false, 'a roster mismatch is recoverable from the setup screen');
    assert.equal(b.own, true);
    await assert.rejects(b.command('start'), /not_available/);
    if (count === 6) assert.equal(f.db.get('rooms/RELAY/players/card-6'), null, 'old game not projected into a new seat');
    await b.start({ deck: 'mixed', sketchSeconds: 60, scoring: 'none' }); await settle(b);
    assert.equal(b.lastStatus, 'ready');
    assert.equal(b.latest.roster.length, count);
    assert.notEqual(b.latest.sessionId, oldSession);
    for (let p = 1; p <= count; p++) {
      const card = f.db.get(`rooms/RELAY/players/card-${p}`);
      assert.equal(card.relay.sessionId, b.latest.sessionId);
      assert.equal(card.playerNum, p);
      assert.equal(card.relay.me.card.length, 6);
    }
    b.close();
  }
});

test('the real player-page mailbox guard never overwrites an unacknowledged request from another tab', () => {
  const source = fs.readFileSync(require.resolve('../play.html'), 'utf8');
  const start = source.indexOf("if (current?.game !== 'sketchrelay'");
  const end = source.indexOf('}, undefined, false).then(result => {', start);
  assert.ok(start > 0 && end > start);
  const update = new Function('current', 'command', source.slice(start, end));
  const first = { id: 'first-request', type: 'ready', sessionId: 'room-session', turnId: 2 };
  const second = { id: 'second-request', type: 'swapWord', sessionId: 'room-session', turnId: 2 };
  const card = { game: 'sketchrelay', relay: { sessionId: 'room-session', turnId: 2 }, relayAction: first };
  assert.equal(update(card, second), undefined, 'an offline host cannot cause a request to be lost');
  assert.equal(update(card, first).relayAction.id, first.id, 'same-ID retry is allowed');
  card.relay.receipts = { 0: { id: first.id, error: '' } };
  assert.equal(update(card, second).relayAction.id, second.id, 'a receipt releases the mailbox');
  assert.equal(update(card, { ...second, type: 'draft', turnId: 1 }), undefined, 'stale drafts never overwrite a newer turn');
  assert.equal(update({ ...card, game: 'dixit' }, second), undefined, 'game takeover is preserved');
});

test('retrying a seen request with an evicted legacy receipt releases the real mailbox without replaying the command', async () => {
  const f = setup(4), h = f.host(); await settle(h);
  await h.start({ deck: 'easy', sketchSeconds: 60, scoring: 'none' }); await settle(h);
  await ready(f, h);
  const book = f.card(1).relay.me.task.book;
  const sleepingTab = await f.send(1, 'draft', { book, kind: 'sketch', art: doodle(1) }); await settle(h);
  for (let i = 0; i < 15; i++) { await f.send(1, 'draft', { book, kind: 'sketch', art: doodle(2) }); await settle(h); }
  const corePath = f.base() + '/core', core = clone(f.db.get(corePath)), legacy = JSON.parse(core.stateJson);
  legacy.receipts[1] = legacy.receipts[1].slice(-12);
  assert.ok(legacy.seen[1].includes(sleepingTab.id));
  assert.ok(!legacy.receipts[1].some(r => r.id === sleepingTab.id));
  f.db.set(corePath, { ...core, stateJson: JSON.stringify(legacy), revision: core.revision + 1 }); await settle(h);
  const source = fs.readFileSync(require.resolve('../play.html'), 'utf8');
  const start = source.indexOf("if (current?.game !== 'sketchrelay'");
  const end = source.indexOf('}, undefined, false).then(result => {', start);
  const mailbox = new Function('current', 'command', source.slice(start, end));
  const retry = await f.db.ref(f.paths[0]).transaction(current => mailbox(current, sleepingTab));
  assert.equal(retry.committed, true, 'the sleeping tab can retry its original command');
  await settle(h);
  const restored = f.card(1).relay.receipts.find(r => r.id === sleepingTab.id);
  assert.deepEqual(restored, { id: sleepingTab.id, error: 'stale_turn' }, 'the host restores the missing acknowledgment');
  assert.equal(h.latest.drafts[book].art, doodle(2), 'old draft replay cannot roll back the other tab\'s work');
  assert.equal(h.latest.step, 0);
  const next = { id: crypto.randomUUID(), type: 'draft', sessionId: sleepingTab.sessionId, turnId: sleepingTab.turnId, book, kind: 'sketch', art: doodle(3) };
  const released = await f.db.ref(f.paths[0]).transaction(current => mailbox(current, next));
  assert.equal(released.committed, true, 'the restored receipt frees the mailbox for a new command');
  await settle(h);
  assert.equal(h.latest.drafts[book].art, doodle(3));
  assert.ok(f.card(1).relay.receipts.some(r => r.id === next.id && !r.error));
  h.close();
});
