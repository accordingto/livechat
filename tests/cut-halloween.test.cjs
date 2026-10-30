// CUT! 🎃 Halloween edition: its own topic pools, same rules, kept across restarts.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../cut-engine.js');
const T = require('../cut-topics.js');
const J = require('../cut-jump-topics.js');
const H = require('../cut-halloween-topics.js');
const root = path.resolve(__dirname, '..');
let serial = 0;
const roster = count => Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Person ' + (i + 1) }));
const create = (extra = {}) => E.create({ id: 'halloween-session', now: 1000, seed: 31, roster: roster(4), ...extra });
const act = (s, type, extra = {}) => E.apply(s, { id: 'hw-command-' + ++serial, sessionId: s.sessionId, turnId: s.turnId,
  seed: serial * 613, now: s.lastChangeAt + 1, actor: 0, type, ...extra });
const error = s => s.replies?.[0]?.error || '';
const takeIds = new Set(H.take.items.map(topic => topic.id));
const jumpIds = new Set(H.jump.items.map(topic => topic.id));

test('the Halloween banks are original, simple, separate from the classic pools and never gory', () => {
  assert.equal(H.take.items.length, 40); assert.equal(H.jump.items.length, 30);
  const all = [...H.take.items, ...H.jump.items];
  assert.equal(new Set(all.map(t => t.id)).size, all.length);
  assert.equal(new Set(all.map(t => t.question)).size, all.length);
  for (const topic of all) {
    assert.equal(topic.category, 'halloween');
    assert.ok(topic.question.length >= 20 && topic.question.length <= 110, topic.question);
    assert.doesNotMatch(topic.question + ' ' + (topic.starter || ''), /\b(blood|bloody|gore|kill|killed|dead body|corpse|murder|knife|stab|guts)\b/i);
    assert.doesNotMatch(topic.question + ' ' + (topic.starter || ''), /[<>]/);
  }
  for (const topic of H.take.items) assert.match(topic.starter, /…$/, 'a Mode 1 opening is a half-sentence to continue');
  for (const topic of H.jump.items) assert.equal(topic.starter, undefined);
  const classic = new Set([...T.items, ...J.items].map(t => t.id));
  assert.ok(all.every(t => !classic.has(t.id)), 'never mixed with the classic pools');
  assert.ok(!T.categories.includes('halloween') && !J.categories.includes('halloween'));
});

test('Mode 1 and Mode 2 draw from the Halloween pools, avoid repeats and keep the rules', () => {
  let s = create({ edition: 'halloween' });
  assert.equal(s.edition, 'halloween'); assert.ok(takeIds.has(s.topic.id));
  assert.ok(s.topic.starter.endsWith('…'));
  const seen = new Set([s.topic.id]);
  for (let i = 0; i < 12; i++) {
    s = act(s, 'endTopic'); assert.equal(error(s), '');
    s = act(s, 'next'); assert.equal(error(s), '');
    assert.ok(takeIds.has(s.topic.id), 'every new topic is a Halloween one');
    seen.add(s.topic.id);
  }
  assert.equal(seen.size, 13, 'recent Halloween topics are not repeated');
  s = act(s, 'begin'); s = act(s, 'tick', { now: s.phaseUntil });
  assert.equal(s.phase, 'speaking', 'countdown and speaking work as in the classic edition');
  let j = create({ edition: 'halloween', mode: 'jump' });
  assert.ok(jumpIds.has(j.topic.id));
  const jumpSeen = new Set([j.topic.id]);
  for (let i = 0; i < 29; i++) { j = act(act(j, 'endTopic'), 'next'); assert.ok(jumpIds.has(j.topic.id)); jumpSeen.add(j.topic.id); }
  assert.equal(jumpSeen.size, 30, 'all 30 Mode 2 Halloween topics before any repeat');
  j = act(act(j, 'endTopic'), 'next'); assert.ok(jumpIds.has(j.topic.id));
});

test('the edition is public, defaults to classic for new and saved games, and is validated', () => {
  const classic = create();
  assert.equal(classic.edition, 'classic'); assert.ok(!takeIds.has(classic.topic.id));
  const view = E.view(create({ edition: 'halloween' }), 1, 2000).cut;
  assert.equal(view.edition, 'halloween'); assert.deepEqual(view.editions, ['classic', 'halloween']);
  const legacy = { ...classic }; delete legacy.edition;
  assert.equal(E.view(legacy, 0, 2000).cut.edition, 'classic', 'games saved before editions are classic');
  const next = act(act(legacy, 'endTopic'), 'next');
  assert.ok(T.items.some(topic => topic.id === next.topic.id));
  assert.throws(() => create({ edition: 'spooky' }), /invalid_options/);
});

test('changing the edition in settings opens a new topic from the new pool; restart keeps the edition', () => {
  for (const mode of ['classic', 'jump']) {
    let s = create({ mode });
    s = act(s, 'settings'); assert.equal(s.phase, 'setup');
    const round = s.round;
    s = act(s, 'configure', { edition: 'halloween', mode }); assert.equal(error(s), '');
    assert.equal(s.edition, 'halloween'); assert.equal(s.mode, mode); assert.equal(s.round, round + 1);
    assert.equal(s.phase, 'ready');
    assert.ok((mode === 'jump' ? jumpIds : takeIds).has(s.topic.id), mode + ' switches to a Halloween topic');
    s = act(s, 'settings'); s = act(s, 'configure', { edition: 'nope', mode }); assert.equal(error(s), 'invalid_options');
    s = act(s, 'cancelSettings');
    s = { ...s, sharedControls: true };
    s = act(s, 'restart'); assert.equal(error(s), '');
    assert.equal(s.edition, 'halloween'); assert.ok((mode === 'jump' ? jumpIds : takeIds).has(s.topic.id), 'restart keeps the edition');
    s = act(s, 'settings'); s = act(s, 'configure', { edition: 'classic', mode });
    assert.equal(s.edition, 'classic'); assert.ok(!(mode === 'jump' ? jumpIds : takeIds).has(s.topic.id));
  }
  // Same edition and mode: Mode 1 settings keep the topic, exactly as before.
  let s = create({ edition: 'halloween' }); const topic = s.topic.id;
  s = act(act(s, 'settings'), 'configure', { edition: 'halloween', speed: 'chaos' });
  assert.equal(error(s), ''); assert.equal(s.topic.id, topic); assert.equal(s.speed, 'chaos');
});

test('Halloween pages load the bank before the engine, share the font licence and keep one cache tag', () => {
  const html = fs.readFileSync(path.join(root, 'cut.html'), 'utf8');
  const order = [...html.matchAll(/<script src="(cut-[^"]+\.js)\?v=([^"]+)"/g)];
  const files = order.map(m => m[1]);
  assert.ok(files.indexOf('cut-halloween-topics.js') > files.indexOf('cut-jump-topics.js'));
  assert.ok(files.indexOf('cut-halloween-topics.js') < files.indexOf('cut-engine.js'));
  assert.ok(files.includes('cut-halloween-audio.js'));
  const launcher = fs.readFileSync(path.join(root, 'hub-launcher.js'), 'utf8');
  assert.match(launcher, /'cut-jump-topics\.js','cut-halloween-topics\.js','cut-engine\.js'/);
  assert.ok(fs.existsSync(path.join(root, 'assets/cut-halloween/creepster-latin-400.woff2')));
  assert.match(fs.readFileSync(path.join(root, 'assets/cut-halloween/OFL-Creepster.txt'), 'utf8'), /Font Diner[\s\S]*SIL Open Font License, Version 1\.1/);
  assert.match(fs.readFileSync(path.join(root, 'cut.css'), 'utf8'), /url\("assets\/cut-halloween\/creepster-latin-400\.woff2"\)/);
});
