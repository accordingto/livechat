'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const E = require('../bluff-king-engine.js');
const { loadBank, validateQuestions } = require('../server/bluff-bank.cjs');
const bank = loadBank();

test('the released English bank contains 60 distinct sourced and verified topics', () => {
  assert.equal(bank.length, 60);
  assert.deepEqual(validateQuestions(bank), []);
  assert.equal(new Set(bank.map(q => q.id)).size, 60);
  assert.equal(new Set(bank.map(q => q.canonicalKnowledgeId)).size, 60);
  for (const q of bank) {
    assert.equal(q.locale, 'en', q.id);
    assert.equal(q.enabled, true, q.id);
    assert.equal(q.verificationStatus, 'verified', q.id);
    assert.match(q.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, q.id);
    assert.ok(q.secretAnswer.length >= 15 && q.secretAnswer.length <= 250, q.id);
    assert.ok(q.supportingFacts.length >= 2 && q.supportingFacts.length <= 3, q.id);
    assert.ok(q.tags.length > 0, q.id);
    for (const source of q.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:', q.id);
      assert.ok(source.title.trim().length > 4, q.id);
      assert.doesNotMatch(url.hostname, /(?:example\.(?:com|org|invalid)|localhost)$/i, q.id);
    }
  }
});

test('all three hint experiences are present and public topic projections omit answer evidence', () => {
  assert.deepEqual([...new Set(bank.map(q => q.hintMode))].sort(), ['category', 'choices', 'none']);
  for (const q of bank) {
    const projection = E.publicQuestion(q);
    assert.equal(projection.term, q.term);
    assert.equal(projection.publicHints.length, { category: 1, choices: 3, none: 0 }[q.hintMode]);
    assert.deepEqual(Object.keys(projection).sort(), ['canonicalKnowledgeId', 'hintMode', 'id', 'locale', 'publicHints', 'publicPrompt', 'term']);
    assert.equal(JSON.stringify(projection).includes(q.secretAnswer), false, q.id);
    assert.equal(JSON.stringify(projection).includes(q.revealExplanation), false, q.id);
    for (const fact of q.supportingFacts) assert.equal(JSON.stringify(projection).includes(fact), false, q.id);
  }
});

test('the host topic bundle matches the researched source bank and compiler output', () => {
  const bundle = require('../bluff-king-topics.js');
  assert.deepEqual(bundle, bank);
  const check = spawnSync(process.execPath, ['scripts/bluff-compile-topics.cjs', '--check'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr || check.stdout);
});

test('unverified and disabled cards cannot enter either the loaded bank or the next-topic pool', () => {
  const directory = fs.mkdtempSync(path.join(__dirname, 'bluff-bank-fixture-'));
  const q = bank[0];
  const cards = [q, { ...q, id: 'bk-disabled-fixture', canonicalKnowledgeId: 'bk-disabled-fixture', enabled: false },
    { ...q, id: 'bk-unverified-fixture', canonicalKnowledgeId: 'bk-unverified-fixture', verificationStatus: 'draft', sources: [], verifiedAt: null }];
  try {
    fs.writeFileSync(path.join(directory, 'fixture.json'), JSON.stringify(cards));
    assert.deepEqual(loadBank(directory).map(card => card.id), [q.id]);
    const store = E.blankStore();
    const room = { roster: ['one'], members: [{ id: 'one', identityId: 'identity-one' }], usedKnowledgeIds: [] };
    assert.deepEqual(E.availableQuestions(store, room, cards).map(card => card.id), [q.id]);
    store.identities['identity-one'].known[q.canonicalKnowledgeId] = { reason: 'answer_received', at: 1 };
    assert.deepEqual(E.availableQuestions(store, room, cards), []);
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(__dirname) + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('BLUFF PARTY and CUT keep their order before the last Open Mic Rescue game', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const cards = [...html.matchAll(/<a\b[^>]*\bclass="[^"]*\bgame-card\b[^"]*"[^>]*\bhref="([^"]+)"[^>]*>/g)];
  assert.ok(cards.length > 5);
  assert.equal(cards.at(-3)[1], 'bluff-king-live-chat.html');
  assert.equal(cards.at(-2)[1], 'cut.html');
  assert.equal(cards.at(-1)[1], 'open-mic-rescue.html');
  assert.equal(cards.filter(match => match[1] === 'bluff-king-live-chat.html').length, 1);
});

test('existing player links open legacy and original-seat private frames without host credentials', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../play.html'), 'utf8');
  const start = source.indexOf('function renderCard(data) {');
  const finish = source.indexOf("      const isDixit = data.game === 'dixit'", start);
  assert.ok(start >= 0 && finish > start);
  const classes = new Set();
  const frames = [];
  const context = vm.createContext({
    URL, BLUFF_CARDS: require('../bluff-king-cards.js'), location: { href: 'https://hub.example/play.html?s=EXISTING&p=player-bearer#session=old-host-secret' },
    document: { body: { classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name), remove: (...names) => names.forEach(name => classes.delete(name)) } },
      createElement: kind => { assert.equal(kind, 'iframe'); return { remove() { this.removed = true; } }; } },
    setCardTitle() {}, urlName: 'Existing player', el: { replaceChildren: frame => frames.push(frame) },
    bluffCardFrame: null, wolfCardFrame: null, talkCard: null, cutCard: null, openMicCard: null, openMicTimer: null, onceCard: null, dixitCard: null, dixitHostBridge: null,
  });
  vm.runInContext(source.slice(start, finish) + 'return false;\n}', context);
  const marker = { game: 'bluffking', name: 'A&B <player>', bluff: { version: 1, room: 'BKROOM', hostToken: 'do-not-forward', privateKey: 'do-not-forward' }, session: 'do-not-forward' };
  context.renderCard(marker);
  assert.equal(frames.length, 1);
  assert.ok(classes.has('bluff-king-card'));
  const url = new URL(frames[0].src);
  assert.equal(url.pathname, '/bluff-king-live-chat.html');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['card', 'name', 'room']);
  assert.equal(url.searchParams.get('card'), '1');
  assert.equal(url.searchParams.get('room'), 'BKROOM');
  assert.equal(url.searchParams.get('name'), marker.name);
  assert.equal(frames[0].referrerPolicy, 'no-referrer');
  assert.match(frames[0].title, /BLUFF PARTY/i);
  assert.equal(frames[0].src.includes('do-not-forward'), false);
  assert.equal(frames[0].src.includes('player-bearer'), false);
  context.renderCard(marker);
  assert.equal(frames.length, 1, 'a repeated marker keeps the existing private frame');
  const assigned = { version: 2, room: 'BKROOM', token: 'a'.repeat(64), identityId: 'b'.repeat(40), historyToken: 'c'.repeat(64) };
  context.renderCard({ ...marker, bluff: { ...assigned, hostToken: 'do-not-forward', otherSeats: ['do-not-forward'] } });
  assert.equal(frames.length, 2);
  const assignedURL = new URL(frames[1].src);
  assert.deepEqual([...assignedURL.searchParams.keys()].sort(), ['card', 'name', 'room']);
  assert.deepEqual(require('../bluff-king-cards.js').readCard(assignedURL.hash, 'BKROOM'), assigned);
  assert.equal(assignedURL.search.includes(assigned.token), false);
  assert.equal(assignedURL.href.includes('do-not-forward'), false);
  assert.equal(assignedURL.href.includes('old-host-secret'), false);
  const html = fs.readFileSync(path.resolve(__dirname, '../bluff-king-live-chat.html'), 'utf8');
  assert.match(html, /<html lang="en">/);
});

test('the shared player-card marker publishes no role, answer or host credential', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../bluff-king-ui.js'), 'utf8');
  const publication = source.match(/ROOM\.publish\(i=>\(\{game:'bluffking',[\s\S]*?\}\)\);/);
  assert.ok(publication, 'the existing player-link integration remains wired');
  let marker;
  const context = vm.createContext({ code: 'BKROOM', ROOM: { name: i => 'Player ' + (i + 1), publish: fn => { marker = fn(0); } },
    hostToken: 'secret-host-path', secretAnswer: 'secret-answer', privateKey: 'secret-host-key' });
  vm.runInContext(publication[0], context);
  assert.deepEqual(JSON.parse(JSON.stringify(marker)), { game: 'bluffking', bluff: { version: 1, room: 'BKROOM' }, name: 'Player 1' });
});

test('the Hub card and game page use the BLUFF PARTY name consistently', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../bluff-king-live-chat.html'), 'utf8');
  const hub = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const card = hub.match(/<a\b[^>]*href="bluff-king-live-chat\.html"[^>]*>([\s\S]*?)<\/a>/)?.[1];
  const title = page.match(/<title>([^<]+)<\/title>/)?.[1];
  const heading = page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(card); assert.match(card, /BLUFF PARTY/i);
  assert.equal(title, 'BLUFF PARTY · IceBreak Hub'); assert.equal(heading, 'BLUFF PARTY');
  assert.match(page, /href="bluff-king\.css\?v=6"/);
  assert.match(page, /src="bluff-king-ui\.js\?v=12"/);
  assert.doesNotMatch(title + heading + card, /Bluff King/);
  const icon = page.match(/<img\b[^>]*class="bk-brand-mark"[^>]*src="([^"]+)"/)?.[1];
  assert.ok(icon, 'the renamed game has its party mark');
  assert.ok(card.includes(icon), 'the Hub and game page share the same party icon');
  assert.ok(fs.statSync(path.resolve(__dirname, '..', icon)).size > 0, 'the party icon is included in the local release');
});
