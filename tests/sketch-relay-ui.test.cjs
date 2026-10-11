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
  assert.match(play, /sketch-relay-art\.js\?v=relay-1/); assert.match(play, /sketch-relay-ui\.js\?v=relay-1/); assert.match(play, /sketch-relay\.css\?v=relay-1/);
  assert.match(play, /new SKETCH_RELAY_UI\.Card/); assert.match(play, /relayCard\.destroy\(\)/);
  assert.match(play, /current\.relay\?\.sessionId !== command\.sessionId/);
  assert.match(play, /current\.relay\.turnId !== command\.turnId/);
  assert.match(play, /relayAction: command/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const host = fs.readFileSync(path.join(root, 'sketch-relay.html'), 'utf8');
  const order = ['room.js', 'sketch-relay-words.js', 'sketch-relay-art.js', 'sketch-relay-engine.js', 'sketch-relay-ui.js', 'sketch-relay-sync.js', 'sketch-relay-host.js'].map(f => host.indexOf(f));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'scripts load in dependency order');
  assert.match(host, /<h1>🖍️ Sketch Relay<\/h1>/);
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
