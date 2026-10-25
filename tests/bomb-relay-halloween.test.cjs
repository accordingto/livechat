'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
// Approval baselines from the v5 preview. They are intentionally independent
// of production metadata, and need no private preview files to run in CI.
const APPROVED_ASSETS = {
  'avatar-boy': '0bade972de952625518e5ca296027d1325e5d730e8f26e3b81fffce88a87a9fd',
  'avatar-girl': '27a0205733dcc9ddf3e56aeeaf09a3d6f860a2dfd5a4942ccd9476d848462d65',
  'avatar-curly': 'fe2e388d06e2b224b33ce19039c37c1d5ea908bf22f77b29c3b72cec33af9c55',
  'avatar-ponytail': '648a29418da1bbfc9a3259ff0e912aab0c02cc9217b65a942f212a5642c49825',
  pumpkin: '5555e43bfec643e106f54ea0d175521e34f43aa7520af6ffca4b5357240b3e5f',
  ghost: '646ecff26dac666108962acee05b2eb78380276a805eab38b79264db78db591d',
  furry: 'dbf8057628066bf781b89041b327dfa8a82d33072069fa08d05597becc50dee8',
  'normal-bomb': 'b8f7db70831436770e2a5318f3310b52cb4c8cb34dc5da9d60f9f8534e23a81e',
  bomb: '0f5aeedd37f76cf5596463ffb359dfea109fec5637a7f12a35c6aef0aae357f2',
  'upper-boy': 'ff61021532c91c87feed95521fafcfa9a766f814a25a53a5ef19763b00eb56a4',
  'upper-girl': '0e22f3af58564e3165194c30c9cd119f26a839ccc861234f9fd5cf4f2085e62f',
  'upper-curly': '3991ebee9e52b19ae44f4bc5d67dff9992783c344719e10b2b2e0ed057416d26',
  'upper-ponytail': '9f01bdf005a520e47a63e677fd3f69601f6ad98e3f61a809c5def3b88031526d',
  'upper-pumpkin': 'dc793e60b3320ab4377a7f7ec6008bbc830066f193a85c5e53a9590c4bd887dd',
  'upper-ghost': '6ed685068e9a63d094f0b2af157e5dc524b28e4d5d98eeba29e533b33e1c5660',
  'upper-furry': '3c0f3c8fd1a17ff09eaa2b29927739345ca812fc1879e4822b68d8907c7f84f5',
};
const APPROVED_GEOMETRY = {
  boy: 'da495c2050ebfad4e57cdacd992cc051b01e43e8811529e50ed344f63fb680a0',
  girl: 'acebb8615486950af43db41d364f7f82035db83d7712103326ae01f924cfddb7',
  curly: '77b2f432a7f7f1518b8c15eae97b33f52fb223eedd163721874f7c7789927ff3',
  ponytail: 'e23da5a4cf3187281d09344de94d37249eb45afc9d4ad7bb8481e0d46e0c3c98',
  pumpkin: '11d7bc1200c046c5782b76948643886d45a41f97ade410dbd795c9388048d22e',
  ghost: '509a6344380d9a3db5fc0d7524ce9974546089616aebf37fd6b093d0d0bcb763',
  furry: 'c4ddb4abd77800c0d2214983770bd2ff9ec4da431184557def0f0c7609663e22',
};
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).filter(key => key !== 'source').sort().map(key => [key, canonical(value[key])])) : value;

test('the live art module ships the exact sixteen approved v5 WebP assets through public local URLs', () => {
  const art = require('../bomb-relay-art.js');
  assert.deepEqual(Object.keys(art.assets).sort(), Object.keys(APPROVED_ASSETS).sort());
  for (const [key, approved] of Object.entries(APPROVED_ASSETS)) {
    const url = art.assets[key];
    assert.equal(typeof url, 'string', key);
    assert.match(url, /^assets\/bomb-relay\//, key);
    assert.doesNotMatch(url, /(?:https?:|data:|blob:|file:|\.\.)/, key);
    const bytes = fs.readFileSync(path.join(root, url.split('?')[0]));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', key + ' WebP RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', key + ' WebP format');
    assert.equal(hash(bytes), approved, key + ' approved artwork');
  }
  assert.doesNotMatch(read('bomb-relay-art.js'), /[A-Z]:[\\/]Users[\\/]|codex-remote-attachments|generated_images|Preview-only/);
});

test('approved fixed uppers retain all seven exact leg lengths, hip roots and upper-image alignments', () => {
  const art = require('../bomb-relay-art.js');
  assert.deepEqual(Object.keys(art.geometry.avatars).sort(), ['boy', 'curly', 'girl', 'ponytail']);
  assert.deepEqual(Object.keys(art.geometry.monsters).sort(), ['furry', 'ghost', 'pumpkin']);
  for (const [key, config] of Object.entries({ ...art.geometry.avatars, ...art.geometry.monsters })) {
    const geometry = Object.fromEntries(['sheet', 'thigh', 'shin', 'hipsLocal', 'upper'].map(field => [field, config[field]]));
    if (config.targets) geometry.legTargets = { thighAnchorLength: config.targets.thighAnchorLength, shinPivotToSoleLength: config.targets.shinPivotToSoleLength };
    assert.equal(hash(JSON.stringify(canonical(geometry))), APPROVED_GEOMETRY[key], key + ' approved v5 geometry');
    assert.deepEqual(Object.keys(config.hipsLocal).sort(), ['back', 'front']);
    assert.ok(config.upper.rect.length === 4 && config.upper.sheet.length === 2);
    assert.doesNotMatch(JSON.stringify(config), /[A-Z]:[\\/]Users[\\/]|generated_images/);
    for (const source of [config.source, config.upper.source].filter(Boolean)) {
      assert.ok(Object.values(art.assets).includes(source), key + ' geometry uses a shipped public asset');
    }
  }
});

test('real host and original player links load the same production art and visuals before their UI', () => {
  for (const page of ['bomb-relay.html', 'play.html']) {
    const html = read(page);
    for (const module of ['art', 'visuals', 'ui']) {
      const reference = `bomb-relay-${module}.js?v=br-halloween-1`;
      assert.ok(html.includes(reference), page + ' ' + reference);
      new vm.Script(read(`bomb-relay-${module}.js`));
    }
    assert.ok(html.indexOf('bomb-relay-art.js?') < html.indexOf('bomb-relay-visuals.js?'), page + ' art before visuals');
    assert.ok(html.indexOf('bomb-relay-visuals.js?') < html.indexOf('bomb-relay-ui.js?'), page + ' visuals before UI');
    assert.ok(html.includes('bomb-relay.css?v=br-halloween-1'), page + ' current CSS');
    assert.doesNotMatch(html, /previews\/bomb-halloween|preview-template|br-halloween-preview-v5/, page);
  }
  assert.doesNotMatch(read('play.html'), /<script src="bomb-relay-(?:selector|engine|sync)\.js/, 'players continue to consume one room authority');
});

function visualAPI() {
  const context = vm.createContext({ BOMB_RELAY_ART: require('../bomb-relay-art.js'), I18N: { lang: 'en' }, Date });
  vm.runInContext(read('bomb-relay-visuals.js') + ';this.visuals = BOMB_RELAY_VISUALS;', context);
  return context.visuals;
}
function visualFixture() {
  let style = '';
  const crop = { getAttribute: () => style, setAttribute: (_key, value) => { style = value; } };
  const hero = { dataset: {}, querySelector: () => crop };
  const chase = { dataset: {} };
  return { hero, chase, container: { querySelectorAll: selector => selector === '[data-br-hero]' ? [hero] : selector === '[data-br-chase]' ? [chase] : [] } };
}

test('the ten-second face change reads elapsed GO time, freezes while paused and never uses a fuse deadline', () => {
  const V = visualAPI(), fixture = visualFixture();
  const bomb = { phase: 'ticking', appearance: { edition: 'halloween', monster: 'ghost' }, clock: { elapsedMs: 2000, startedAt: 1000 } };
  V.refresh(fixture.container, bomb, { now: 8999 });
  assert.equal(fixture.hero.dataset.brExpression, 'idle');
  V.refresh(fixture.container, bomb, { now: 9000 });
  assert.equal(fixture.hero.dataset.brExpression, 'warning');
  assert.equal(fixture.hero.dataset.brMonster, 'ghost');
  const passed = { ...bomb, holder: 3, passes: 8 };
  V.refresh(fixture.container, passed, { now: 9001 });
  assert.equal(fixture.hero.dataset.brExpression, 'warning', 'passing cannot restart the ten-second presentation clock');
  const paused = { ...bomb, phase: 'paused', clock: { elapsedMs: 9999, startedAt: null } };
  V.refresh(fixture.container, paused, { now: 900000 });
  assert.equal(fixture.hero.dataset.brExpression, 'idle');
  assert.equal(fixture.hero.dataset.brPaused, 'true'); assert.equal(fixture.chase.dataset.brPaused, 'true');
  const classic = { ...bomb, appearance: { edition: 'classic', monster: 'ghost' } };
  V.refresh(fixture.container, classic, { now: 9000 });
  assert.equal(fixture.hero.dataset.brExpression, 'angry');
  assert.doesNotMatch(read('bomb-relay-visuals.js'), /\b(?:explodeAt|remainingMs|roundFuse|durationMs|setInterval|setTimeout|localStorage|fetch)\b/);
});

test('chase rendering uses the immutable loser/avatar/monster snapshot and appears only to that player or the host', () => {
  const V = visualAPI();
  const bomb = { phase: 'ticking', appearance: { edition: 'halloween', monster: 'furry' },
    lastChase: { id: 'old-boom', edition: 'halloween', loser: 2, avatar: 'ponytail', monster: 'ghost' } };
  const host = V.chaseHTML(bomb, { name: '<Kevin>', playerNum: 0 });
  const loser = V.chaseHTML(bomb, { name: '<Kevin>', playerNum: 2 });
  assert.equal(loser, host);
  assert.equal(V.chaseHTML(bomb, { playerNum: 1 }), '');
  assert.match(host, /Ghost is chasing/); assert.match(host, /&lt;Kevin&gt;/);
  assert.ok(host.includes('upper-ghost.webp')); assert.ok(host.includes('upper-ponytail.webp'));
  assert.ok(!host.includes('upper-furry.webp'), 'the new round monster cannot rewrite the last explosion');
  assert.equal((host.match(/class="br-run-paint br-run-upper"/g) || []).length, 2, 'one joined upper per actor');
  assert.equal((host.match(/class="br-run-leg /g) || []).length, 4, 'only the four legs have joints');
  assert.doesNotMatch(host, /br-run-arm|br-run-shoulder|<script|<Kevin>/);
  assert.equal(V.chaseHTML({ ...bomb, lastChase: null }), '');
  assert.equal(V.chaseHTML({ ...bomb, lastChase: { ...bomb.lastChase, edition: 'classic' } }), '');
});

test('every live monster uses its own approved idle, warning and rage crop with no missing sprite geometry', () => {
  const V = visualAPI(), art = require('../bomb-relay-art.js');
  for (const monster of ['pumpkin', 'ghost', 'furry']) {
    const bomb = { phase: 'ticking', appearance: { edition: 'halloween', monster }, clock: { elapsedMs: 0, startedAt: 1000 } };
    assert.ok(V.heroHTML(bomb).includes(art.assets[monster]), monster + ' hero atlas');
    const fixture = visualFixture(), styles = [];
    for (const [phase, now, expected] of [['ticking', 1000, 'idle'], ['ticking', 11000, 'warning'], ['boom', 11000, 'rage']]) {
      V.refresh(fixture.container, { ...bomb, phase }, { now });
      assert.equal(fixture.hero.dataset.brExpression, expected);
      const style = fixture.hero.querySelector('.br-hero-crop').getAttribute('style');
      assert.ok(style.includes(art.assets[monster]), monster + ' ' + expected + ' atlas');
      assert.doesNotMatch(style, /NaN|Infinity|undefined/);
      styles.push(style);
    }
    assert.equal(new Set(styles).size, 3, monster + ' three distinct expressions');
  }
});
