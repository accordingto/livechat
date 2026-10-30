const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
globalThis.SKETCH_RELAY_ART = require('../sketch-relay-art.js');
const UI = require('../sketch-relay-ui.js');
const E = require('../sketch-relay-engine.js');
const ART = globalThis.SKETCH_RELAY_ART;
const root = path.resolve(__dirname, '..');

let n = 0;
const id = () => 'ui-test-' + String(++n).padStart(4, '0');
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: ['Amy', 'Ben', 'Cai', 'Dee & "Q"', 'Eli'][i] }));
const act = (s, actor, type, extra = {}) => E.apply(s, { id: id(), type, actor, sessionId: s.sessionId, turnId: s.turnId, now: s.lastChangeAt + 5, seed: 3, ...extra });
const art = ART.encode([{ color: 2, size: 1, points: [10, 10, 900, 900] }]);
function played(scoring = 'friendly') {
  let s = E.create({ id: 'ui-session-1', roster: roster(4), settings: { deck: 'easy', sketchSeconds: 60, scoring }, now: 1000, seed: 11 });
  for (let p = 1; p <= 4; p++) s = act(s, p, 'ready');
  return s;
}
function answerAll(s) {
  for (let guard = 0; s.phase === 'play' && guard < 30; guard++) {
    for (let p = 1; p <= 4; p++) {
      const task = E.view(s, p).relay.me?.task;
      if (task && !task.submitted && !task.skipped) s = act(s, p, 'submit', { book: task.book, kind: task.kind, ...(task.kind === 'sketch' ? { art } : { text: 'guess ' + p }) });
    }
  }
  return s;
}

test('the shared screen never shows secret words or drawings while people are playing', () => {
  let s = played();
  s = act(s, 1, 'submit', { book: 0, kind: 'sketch', art });
  const html = UI.hostScene(E.view(s, 0, 2000).relay, 2000);
  for (const book of s.books) assert.ok(!html.includes('>' + book.pages[0].text + '<'), book.pages[0].text);
  assert.ok(!html.includes('<path'), 'no drawings on the shared screen during play');
  assert.match(html, /sr-st-done/); assert.match(html, /sr-st-drawing/);
  assert.ok(html.includes('Dee &amp; &quot;Q&quot;') && !html.includes('Dee & "Q"'), 'names are escaped');
  assert.match(html, /data-sr-timer/);
});

test('reveal controls appear only for the presenter; badges are read-only for others', () => {
  let s = answerAll(played());
  assert.equal(s.phase, 'reveal');
  const owner = UI.revealHTML(E.view(s, 1).relay, 1), other = UI.revealHTML(E.view(s, 2).relay, 2), host = UI.revealHTML(E.view(s, 0).relay, 0);
  assert.match(owner, /data-sr-action="revealNext"/); assert.match(host, /data-sr-action="revealNext"/);
  assert.doesNotMatch(other, /data-sr-action=/);
  s = act(s, 1, 'revealNext', { book: 0, shown: 1, all: true });
  const done = UI.revealHTML(E.view(s, 1).relay, 1), watching = UI.revealHTML(E.view(s, 3).relay, 3);
  assert.match(done, /data-sr-action="award" data-field="sketch"/);
  assert.match(done, /data-sr-action="nextBook"/);
  assert.doesNotMatch(watching, /data-sr-action/);
  assert.equal((done.match(/class="sr-page /g) || []).length, 5);
  // Amy's own first drawing can never be her favourite.
  assert.doesNotMatch(done.split('class="sr-page ')[2], /data-field="sketch"/);
});

test('results list every player, highlight winners and explain the points', () => {
  let s = answerAll(played());
  s = act(s, 1, 'revealNext', { book: 0, shown: 1, all: true });
  s = act(s, 1, 'award', { book: 0, field: 'sketch', page: 3 });
  for (let b = 0; b < 4; b++) {
    if (s.phase !== 'reveal') break;
    if (!s.reveal.complete) s = act(s, 0, 'revealNext', { book: b, shown: s.reveal.shown, all: true });
    s = act(s, 0, 'nextBook', { book: b });
  }
  const html = UI.scoresHTML(E.view(s, 0).relay, 0);
  assert.equal((html.match(/class="sr-score[ "]/g) || []).length, 4);
  assert.match(html, /sr-winners/); assert.match(html, /favorite drawing/);
  const none = answerAll(played('none'));
  assert.equal(UI.scoresHTML(E.view(none, 0).relay, 0), '');
});

test('drawings render as safe SVG and blank pages are labelled', () => {
  const svg = UI.art(art, 'x" onload="alert(1)');
  assert.ok(svg.startsWith('<svg') && !svg.includes('onload="alert'));
  const book = UI.bookHTML([{ kind: 'word', by: 1, byName: 'Amy', text: '<img src=x>' }, { kind: 'sketch', by: 2, byName: 'Ben', art: '' }], { owner: 1 });
  assert.ok(book.includes('&lt;img src=x&gt;') && !book.includes('<img'));
  assert.match(book, /sr-blank/);
});

test('play.html and the host page load Sketch Relay and guard every card request', () => {
  const play = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
  assert.match(play, /sketch-relay-art\.js\?v=relay-3/); assert.match(play, /sketch-relay-ui\.js\?v=relay-3/); assert.match(play, /sketch-relay\.css\?v=relay-3/);
  assert.match(play, /new SKETCH_RELAY_UI\.Card/); assert.match(play, /relayCard\.destroy\(\)/);
  assert.match(play, /current\.relay\?\.sessionId !== command\.sessionId/);
  assert.match(play, /current\.relay\.turnId !== command\.turnId/);
  assert.match(play, /relayAction: command/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const host = fs.readFileSync(path.join(root, 'sketch-relay.html'), 'utf8');
  const order = ['room.js', 'sketch-relay-words.js', 'sketch-relay-art.js', 'sketch-relay-engine.js', 'sketch-relay-ui.js', 'sketch-relay-sync.js', 'sketch-relay-host.js'].map(f => host.indexOf(f));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'scripts load in dependency order');
  assert.match(host, /<h1 data-i18n="sketchrelay.gameTitle">Sketch Relay<\/h1>/);
  assert.match(host, /<option value="none" selected/);
  for (const file of ['sketch-relay-host.js', 'sketch-relay-ui.js', 'sketch-relay-sync.js', 'sketch-relay-engine.js']) new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'));
  const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(hub, /href="sketch-relay\.html"/); assert.match(hub, /descSketchRelay/);
});

test('every interface string has both languages', () => {
  for (const [key, value] of Object.entries(UI.dict)) {
    assert.equal(value.length, 2, key);
    assert.ok(value[0] !== undefined && value[1] !== undefined, key);
  }
  const source = fs.readFileSync(path.join(root, 'sketch-relay-ui.js'), 'utf8') + fs.readFileSync(path.join(root, 'sketch-relay-host.js'), 'utf8');
  const used = new Set([...source.matchAll(/(?<![.\w])t\('([a-zA-Z_0-9]+)'(?!\s*\+)/g)].map(m => m[1]));
  for (const key of used) assert.ok(key in UI.dict, 'missing text: ' + key);
  const html = fs.readFileSync(path.join(root, 'sketch-relay.html'), 'utf8');
  for (const match of html.matchAll(/data-i18n="sketchrelay\.([^"]+)"/g)) assert.ok(match[1] in UI.dict, 'missing text: ' + match[1]);
});

function cardHarness({ state = played('none'), at = state.lastChangeAt, blank = false, send = async () => {} } = {}) {
  const fields = {};
  const field = (key, value = {}) => fields[key] = { textContent: '', disabled: false, classList: { toggle() {} }, ...value };
  field('[data-sr-feedback]'); field('[data-sr-connection]'); field('[data-sr-draft]');
  field('[data-sr-action="submitSketch"]', { dataset: { srAction: 'submitSketch' } });
  field('[data-sr-action="submitGuess"]', { dataset: { srAction: 'submitGuess' } });
  field('[data-sr-guess]', { value: 'cat' }); field('[data-sr-task]', { innerHTML: '' });
  const element = {
    querySelector: selector => fields[selector] || null,
    querySelectorAll: selector => selector === '[data-sr-action]' ? [fields['[data-sr-action="submitSketch"]'], fields['[data-sr-action="submitGuess"]']] : [],
  };
  const card = Object.create(UI.Card.prototype);
  Object.assign(card, {
    element, data: E.view(state, 1, at), now: () => at, connected: () => true, send, destroyed: false,
    pending: null, queuedSubmit: null, composing: false, editing: '', error: '', notice: '', autoSent: '',
    pendingSentAt: at, pendingRetryDelay: 5000, dispatchingId: '', pendingBusy: false,
    draftSynced: null, draftDirty: false, draftChangedAt: at, draftSnapshotAt: 0,
    pad: { disabled: false, encode: () => blank ? '' : art, isBlank: () => blank, setDisabled(value) { this.disabled = value; } },
    render() {},
  });
  card.padKey = card.padKeyFor(card.task());
  return { card, fields, time: value => at = value };
}

test('the pad snapshot includes a finger stroke that has not been lifted', () => {
  const pad = Object.create(UI.Pad.prototype);
  Object.assign(pad, { strokes: [], current: { color: 2, size: 1, points: [100, 100, 900, 850] } });
  assert.deepEqual(ART.decode(pad.encode()), [{ color: 2, size: 1, points: [100, 100, 900, 850] }]);
  assert.equal(pad.strokes.length, 0, 'taking a snapshot does not interrupt the finger');
  let saved = 0;
  Object.assign(pad, { active: 5, disabled: false, redraw() {}, paintTools() {}, onChange() { saved++; }, onFull() {} });
  pad.setDisabled(true);
  assert.equal(saved, 1); assert.equal(pad.current, null); assert.equal(pad.strokes.length, 1);
  assert.equal(pad.disabled, true, 'pausing freezes the pad after preserving the active stroke');
});

test('a finger tap remains a single-point stroke and renders as a visible dot', () => {
  const pad = Object.create(UI.Pad.prototype);
  Object.assign(pad, { strokes: [], current: { color: 0, size: 1, points: [500, 500] }, active: 2,
    redraw() {}, onChange() {}, onFull() {},
  });
  pad.finish({ pointerId: 2 });
  assert.deepEqual(pad.strokes[0].points, [500, 500]);
  const encoded = pad.encode();
  assert.notEqual(encoded, ''); assert.equal(ART.isBlank(encoded), false);
  assert.match(ART.svg(encoded), /M500 500l0\.1 0/);
});

test('a fully erased canvas counts as blank even when pen strokes remain in its history', () => {
  const pad = Object.create(UI.Pad.prototype);
  Object.assign(pad, { strokes: ART.decode(art), current: null, canvas: { width: 1 }, ctx: { getImageData: () => ({ data: new Uint8ClampedArray([255, 250, 240, 255]) }) } });
  assert.equal(pad.isBlank(), true);
  assert.equal(pad.encode(), '', 'a completely erased page syncs a canonical empty draft');
  pad.blankCache = null;
  pad.ctx.getImageData = () => ({ data: new Uint8ClampedArray([31, 36, 48, 255]) });
  assert.equal(pad.isBlank(), false);
});

test('pause freezes drawing, guesses and submission, and a blank deadline page is skipped', async () => {
  const sent = [];
  const h = cardHarness({ send: async command => sent.push(command) });
  h.card.data.relay.paused = true; h.card.paint();
  assert.equal(h.card.pad.disabled, true);
  assert.equal(h.fields['[data-sr-guess]'].disabled, true);
  assert.equal(h.fields['[data-sr-action="submitSketch"]'].disabled, true);
  await h.card.sendCommand('submit', { book: 0, kind: 'sketch', art });
  assert.equal(sent.length, 0);
  const b = cardHarness({ at: h.card.relay().deadline + 1, blank: true, send: async command => sent.push(command) });
  b.card.paint();
  assert.equal(b.card.pad.disabled, true);
  assert.equal(sent.length, 1, 'an empty page clears any older saved drawing');
  assert.equal(sent[0].type, 'draft'); assert.equal(sent[0].art, '');
  assert.match(b.fields['[data-sr-feedback]'].textContent, /blank page will be skipped/);
});

test('draft sync keeps the canvas usable and a queued submission waits for its own receipt', async () => {
  const sent = [];
  const { card, fields } = cardHarness({ send: async command => sent.push(command) });
  await card.sendCommand('draft', { book: 0, kind: 'sketch', art });
  assert.equal(card.pad.disabled, false);
  assert.equal(fields['[data-sr-action="submitSketch"]'].disabled, false);
  const draftId = card.pending.id;
  await card.sendCommand('submit', { book: 0, kind: 'sketch', art });
  assert.equal(sent.length, 1); assert.equal(card.pad.disabled, true);
  const next = structuredClone(card.data);
  next.relay.reply = { id: 'the-other-tab' };
  next.relay.receipts = [{ id: draftId }, { id: 'the-other-tab' }];
  card.update(next);
  assert.equal(sent.length, 2); assert.equal(sent[1].type, 'submit');
  assert.equal(card.draftSynced, art); assert.notEqual(sent[1].id, draftId);
});

test('a busy mailbox and an unacknowledged command retry with the same ID', async () => {
  const sent = [];
  let busy = true;
  const { card, time } = cardHarness({ send: async command => { sent.push(command); if (busy) throw new Error('action_busy'); } });
  await card.sendCommand('draft', { book: 0, kind: 'sketch', art });
  const originalId = card.pending.id;
  time(card.pendingSentAt + 1001); busy = false; card.paint(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 2); assert.equal(sent[1].id, originalId);
  time(card.pendingSentAt + 5001); card.paint(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 3); assert.equal(sent[2].id, originalId);
});

test('long active strokes sync before pointerup and IME composition never submits a guess', async () => {
  const sent = [];
  const { card } = cardHarness({ at: 4000, send: async command => sent.push(command) });
  card.pad.current = { points: [100, 100, 900, 900] };
  card.paint();
  assert.equal(sent.length, 1); assert.equal(sent[0].type, 'draft'); assert.equal(sent[0].art, art);
  card.data.relay.me.task.kind = 'guess'; card.pending = null; card.composing = true;
  card.submitGuess();
  assert.equal(sent.length, 1);
  card.composing = false; card.submitGuess();
  assert.equal(sent.length, 2); assert.equal(sent[1].kind, 'guess');
});

test('submitted cards show a lock, completion count and no edit action', () => {
  let state = played('none'); state = act(state, 1, 'submit', { book: 0, kind: 'sketch', art });
  const { card, fields } = cardHarness({ state });
  card.pad = null; card.renderTask();
  const html = fields['[data-sr-task]'].innerHTML;
  assert.match(html, /Locked in/); assert.match(html, /1 \/ 4 have passed/);
  assert.doesNotMatch(html, /data-sr-action="edit"/);
  assert.match(card.stage(), /TURN 1 OF 4/);
});

test('an empty deadline draft waits for an older draft receipt, then clears it once', async () => {
  const sent = [];
  const state = played('none');
  const { card, time } = cardHarness({ state, blank: true, send: async command => sent.push(command) });
  await card.sendCommand('draft', { book: 0, kind: 'sketch', art });
  const olderId = card.pending.id;
  card.pendingSentAt = state.deadline;
  time(state.deadline + 1); card.paint();
  assert.equal(card.autoSent, '', 'a pending draft does not swallow the final empty update');
  assert.equal(sent.length, 1);
  const next = structuredClone(card.data); next.relay.receipts = [{ id: olderId }];
  card.update(next); card.paint();
  assert.equal(sent.length, 2); assert.equal(sent[1].type, 'draft'); assert.equal(sent[1].art, '');
  card.paint(); assert.equal(sent.length, 2);
});

test('active strokes are saved locally on hide or destroy and secret-word progress says ready', () => {
  const previous = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = { get length() { return store.size; }, key: index => [...store.keys()][index], getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  try {
    const { card } = cardHarness();
    card.preserveDraft();
    assert.deepEqual(JSON.parse([...store.values()][0]), { art });
    card.pad.encode = () => ''; card.preserveDraft();
    assert.deepEqual(JSON.parse([...store.values()][0]), { art: '' }, 'cleared drafts survive reload too');
    assert.match(UI.progressHTML({ phase: 'word', progress: { done: 2, total: 4 } }), /2 \/ 4 are ready/);
  } finally { globalThis.localStorage = previous; }
});

function dialogHarness() {
  const previous = globalThis.document;
  const focus = { isConnected: true, restored: false, focus() { this.restored = true; } };
  let last = null;
  const node = () => ({ handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, focus() { this.focused = true; } });
  globalThis.document = {
    activeElement: focus,
    body: { appendChild(dialog) { last = dialog; } },
    createElement() {
      const cancel = node(), confirm = node();
      return {
        ...node(), attrs: {}, open: false, removed: false,
        setAttribute(key, value) { this.attrs[key] = value; },
        querySelector: selector => selector === '[data-sr-cancel]' ? cancel : confirm,
        showModal() { this.open = true; }, close() { this.open = false; this.handlers.close?.(); }, remove() { this.removed = true; },
      };
    },
  };
  return { get dialog() { return last; }, focus, click: yes => last.querySelector(yes ? '[data-sr-confirm]' : '[data-sr-cancel]').handlers.click(), restore: () => globalThis.document = previous };
}

test('HTML confirmations escape the message, cancel with Escape and restore focus', async () => {
  assert.equal(await UI.confirm('headless test'), true);
  const h = dialogHarness();
  try {
    const answer = UI.confirm('<img src=x onerror=alert(1)>');
    assert.equal(h.dialog.open, true); assert.match(h.dialog.innerHTML, /&lt;img/);
    assert.equal(h.dialog.querySelector('[data-sr-cancel]').focused, true);
    let prevented = false;
    h.dialog.handlers.cancel({ preventDefault() { prevented = true; } });
    assert.equal(await answer, false); assert.equal(prevented, true);
    assert.equal(h.dialog.removed, true); assert.equal(h.focus.restored, true);
    const yes = UI.confirm('Clear?'); h.click(true); assert.equal(await yes, true);
  } finally { h.restore(); }
});

test('clear confirmation preserves an active stroke and keeps a pause or expired pad locked', async () => {
  const h = dialogHarness();
  const pad = Object.create(UI.Pad.prototype);
  Object.assign(pad, { strokes: [], current: { color: 0, size: 1, points: [10, 10, 300, 300] }, active: 1,
    disabled: false, externalDisabled: false, confirming: false, destroyed: false, clearId: 0, root: { isConnected: true },
    redraw() {}, paintTools() {}, onChange() {}, onFull() {},
  });
  try {
    const cancel = pad.clear();
    assert.equal(pad.disabled, true); assert.equal(pad.current, null); assert.equal(pad.strokes.length, 1);
    h.click(false); await cancel;
    assert.equal(pad.disabled, false); assert.equal(pad.strokes.length, 1);
    const paused = pad.clear(); pad.setDisabled(true); h.click(true); await paused;
    assert.equal(pad.disabled, true); assert.equal(pad.strokes.length, 1, 'confirmation cannot clear after the host pauses or time expires');
    pad.setDisabled(false);
    const clear = pad.clear(); h.click(true); await clear;
    assert.equal(pad.strokes.length, 0); assert.equal(pad.disabled, false);
  } finally { h.restore(); }
});

test('an away confirmation cannot act on a new turn or a destroyed player card', async () => {
  const h = dialogHarness(), sent = [];
  const { card } = cardHarness({ send: async command => sent.push(command) });
  const event = { target: { closest: () => ({ disabled: false, dataset: { srAction: 'away' } }) } };
  try {
    const changed = card.onClick(event); card.data.relay.turnId++; h.click(true); await changed;
    assert.equal(sent.length, 0);
    const destroyed = card.onClick(event); card.destroyed = true; h.click(true); await destroyed;
    assert.equal(sent.length, 0);
    card.destroyed = false;
    const current = card.onClick(event); h.click(true); await current;
    assert.equal(sent.length, 1); assert.equal(sent[0].type, 'away');
  } finally { h.restore(); }
});
