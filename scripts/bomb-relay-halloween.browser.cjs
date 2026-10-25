'use strict';
// Run: node scripts/bomb-relay-halloween.browser.cjs [path-to-playwright-package]
// Set BOMB_QA_PLAYERS=3, 6 or 8 and distinct BOMB_QA_OUTPUT directories for
// participant-scaling regression runs. BOMB_QA_LAYOUT=0 skips captures only.
// BOMB_QA_CAPTURE_FILTER=<label fragment> captures one surface while retaining
// the complete gameplay flow; omit it for the release layout audit.
// Serves the REAL host/player pages against one isolated Firebase-compatible
// in-memory authority. All external requests are intercepted; no live room is touched.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.BOMB_QA_OUTPUT || path.join(root, '..', 'bomb-halloween-browser-qa'));
const playerCount = Number(process.env.BOMB_QA_PLAYERS || 4);
assert.ok(Number.isInteger(playerCount) && playerCount >= 3 && playerCount <= 9, 'BOMB_QA_PLAYERS must be 3–9');
const code = 'BOMB_HALLOWEEN_QA_' + playerCount;
const tokens = Array.from({ length: playerCount }, (_, index) => 'qa-player-' + (index + 1));
const names = ['Amy', 'Kevin', 'Jason', 'Willy', 'Riley', 'Morgan', 'Alex', 'Sam', 'Robin'].slice(0, playerCount);
const DECK = require('../bomb-relay-deck.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const normalize = value => {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const clean = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const item = normalize(entry); if (item !== null) clean[key] = item; }
  return Object.keys(clean).length ? clean : null;
};
function makeDatabase() {
  let tree = { '.info': { connected: true, serverTimeOffset: 0 } };
  const get = location => location.split('/').filter(Boolean).reduce((value, key) => value?.[key], tree) ?? null;
  const put = (location, value) => {
    const keys = location.split('/').filter(Boolean); let parent = tree;
    for (const key of keys.slice(0, -1)) parent = parent[key] ||= {};
    const clean = normalize(clone(value));
    if (clean === null) delete parent[keys.at(-1)]; else parent[keys.at(-1)] = clean;
  };
  return { get, put, dump: () => clone(tree), request(request) {
    const current = clone(get(request.path));
    if (request.type === 'get') return { value: current };
    if (request.type === 'cas' && JSON.stringify(current) !== JSON.stringify(request.expected)) return { committed: false, conflict: true, value: current };
    if (request.type === 'cas' && !request.hasValue) return { committed: false, value: current };
    put(request.path, request.type === 'update' ? Object.assign({}, current, request.value) : request.value);
    return { committed: true, value: clone(get(request.path)) };
  } };
}
// Installed before any page script. Transaction updaters execute twice and
// compare-and-set retries execute on conflicts, exposing impurity/concurrency bugs.
function installFirebase({ code, tokens, names, epoch }) {
  Date.now = () => epoch;
  const listeners = new Map();
  const snapshot = value => ({ val: () => structuredClone(value ?? null) });
  const request = value => window.__qaFirebase(value);
  const getPath = (tree, location) => location.split('/').filter(Boolean).reduce((value, key) => value?.[key], tree) ?? null;
  window.__qaReceived = null;
  window.__qaDeliver = tree => {
    for (const [location, entries] of listeners) {
      const value = getPath(tree, location);
      for (const entry of entries) if (JSON.stringify(value) !== entry.last) {
        entry.last = JSON.stringify(value);
        if (value?.game === 'bombrelay') window.__qaReceived = structuredClone(value);
        entry.handler(snapshot(value));
      }
    }
  };
  function reference(location) {
    return { key: location.split('/').at(-1), path: location,
      child: child => reference(location + '/' + child),
      on(event, handler) {
        if (event !== 'value') throw new Error('Unexpected Firebase event: ' + event);
        const entry = { handler, last: undefined };
        if (!listeners.has(location)) listeners.set(location, new Set());
        listeners.get(location).add(entry);
        request({ type: 'get', path: location }).then(({ value }) => {
          if (!listeners.get(location)?.has(entry)) return;
          entry.last = JSON.stringify(value);
          if (value?.game === 'bombrelay') window.__qaReceived = structuredClone(value);
          handler(snapshot(value));
        });
        return handler;
      },
      off(event, handler) {
        for (const entry of listeners.get(location) || []) if (!handler || entry.handler === handler) listeners.get(location).delete(entry);
      },
      once: async () => snapshot((await request({ type: 'get', path: location })).value),
      set: value => request({ type: 'set', path: location, value }),
      update: value => request({ type: 'update', path: location, value }),
      remove: () => request({ type: 'set', path: location, value: null }),
      async transaction(updater) {
        for (let attempt = 0; attempt < 50; attempt++) {
          const { value: current } = await request({ type: 'get', path: location });
          updater(structuredClone(current));
          const next = updater(structuredClone(current));
          const result = await request({ type: 'cas', path: location, expected: current, value: next ?? null, hasValue: next !== undefined });
          if (!result.conflict) return { committed: result.committed, snapshot: snapshot(result.value) };
        }
        throw new Error('QA transaction retry limit');
      },
    };
  }
  const database = () => ({ ref: reference });
  database.ServerValue = { TIMESTAMP: Date.now() };
  window.firebase = { apps: [], initializeApp() { this.apps.push({}); return {}; }, database };
  if (!localStorage.getItem('room-session-' + code)) localStorage.setItem('room-session-' + code, JSON.stringify({ tokens, playerCount: tokens.length, names }));
  localStorage.setItem('room-last-session', code);
  localStorage.setItem('site-lang', 'en');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const db = makeDatabase(), pages = new Set(), errors = [], blocked = new Set(), epoch = Date.now();
  let offset = 0;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' }); response.end(fs.readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let delivery = Promise.resolve();
  const deliver = () => {
    const tree = db.dump();
    delivery = delivery.then(() => Promise.all([...pages].map(page => page.isClosed() ? null : page.evaluate(tree => window.__qaDeliver?.(tree), tree).catch(() => {}))));
  };
  await context.exposeBinding('__qaFirebase', (_source, request) => {
    const result = db.request(request); if (result.committed) setTimeout(deliver, 0); return result;
  });
  await context.addInitScript(installFirebase, { code, tokens, names, epoch });
  await context.route('**/*', route => {
    const url = route.request().url(); if (url.startsWith(base)) return route.continue();
    blocked.add(url); return route.fulfill({ status: 200, contentType: url.includes('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const open = async url => {
    const page = await context.newPage(); pages.add(page);
    page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
    page.on('close', () => pages.delete(page)); await page.goto(base + '/' + url); return page;
  };
  const report = { entry: `bomb-relay.html + ${playerCount} original play.html links`, playerCount, checks: [], views: [],
    fixture: 'isolated Firebase-compatible authority; real host and player pages; controlled server clock; desktop Chrome viewport emulation, not physical phones' };
  const check = label => { report.checks.push(label); console.log('PASS ' + label); };
  const wait = async (predicate, label = 'state') => {
    for (let attempt = 0; attempt < 500; attempt++) { await delivery; if (await predicate()) return; await pause(25); }
    throw new Error('Browser state did not settle: ' + label);
  };
  let host, players = [];
  const state = () => host.evaluate(() => structuredClone(BOMB_RELAY_HOST.state));
  const cards = () => Promise.all(players.map(page => page.evaluate(() => structuredClone(window.__qaReceived))));
  const card = n => players[n - 1];
  const phase = async target => wait(async () => (await state())?.phase === target && (await cards()).every(value => value?.bomb?.phase === target), 'phase ' + target);
  const setTime = async now => { offset = now - epoch; db.put('.info/serverTimeOffset', offset); deliver(); await delivery; };
  const controlPath = () => host.evaluate(() => 'rooms/' + ROOM.code + '/players/' + ROOM.getExtra('bombRelayControlToken'));
  const authorityReady = async () => { const location = await controlPath(); await wait(() => db.get(location)?.leaseUntil > epoch + offset, 'host authority after a clock jump'); };
  const tap = async (page, selector) => { await page.locator(selector).first().waitFor({ state: 'visible' }); await page.locator(selector).first().click(); };
  const appearancePanel = async page => { const details = page.locator('.br-card-appearance'); if (!(await details.evaluate(element => element.open))) await details.locator('summary').click(); };
  const setAvatar = async (n, avatar) => { await appearancePanel(card(n)); await tap(card(n), `[data-br-avatar="${avatar}"]`); await wait(async () => (await state()).roster.find(player => player.playerNum === n)?.avatar === avatar, 'avatar synchronized'); };
  const setMonster = async (n, monster) => { await appearancePanel(card(n)); await card(n).selectOption('select[data-br-monster]', monster); await wait(async () => (await state()).appearance.monster === monster && (await cards()).every(value => value.bomb.settingsAppearance.monster === monster), 'monster synchronized'); };
  const hostAppearance = async (edition, monster) => {
    await authorityReady(); await host.click('#br-manage-open');
    await host.selectOption('#br-manage-edition', edition);
    await wait(async () => (await state()).appearance.edition === edition, 'edition preference');
    if (edition === 'halloween') { await host.selectOption('#br-manage-monster', monster); await wait(async () => (await state()).appearance.monster === monster, 'host monster preference'); }
    await host.locator('#br-manage .br-dialog-header button').click();
  };
  const assertPrivate = async () => {
    for (const value of await cards()) {
      const bomb = value.bomb;
      for (const field of ['roundFuse', 'roundId', 'explodeAt', 'remainingMs', 'litAt', 'durationMs', 'startedAtMs', 'explodeAtMs', 'discussionUntil']) assert.equal(Object.hasOwn(bomb, field), false, field + ' stays private');
      assert.deepEqual(Object.keys(bomb.clock).sort(), ['elapsedMs', 'startedAt']);
    }
  };
  const expression = target => wait(async () => (await Promise.all([host, ...players].map(page => page.locator('[data-br-hero]:visible').first().getAttribute('data-br-expression')))).every(value => value === target), 'all expressions ' + target);
  const capture = async (page, label, target = null, requireTogether = false) => {
    if (process.env.BOMB_QA_LAYOUT === '0') return;
    if (process.env.BOMB_QA_CAPTURE_FILTER && !label.includes(process.env.BOMB_QA_CAPTURE_FILTER)) return;
    for (const [width, height] of page === host ? [[1280, 800], [390, 844], [320, 568]] : [[390, 844], [320, 568]]) for (const lang of ['en', 'zh']) {
      await page.setViewportSize({ width, height }); await page.evaluate(value => I18N.setLang(value), lang);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (target && requireTogether) {
        // Use the player's real arrival behavior: if necessary, scroll to the
        // prompt. Centering just the pass button can hide a prompt even when
        // both comfortably fit on the same screen.
        await page.evaluate(selector => {
          const prompt = document.querySelector('.br-card-scene'), action = document.querySelector(selector);
          const a = action?.getBoundingClientRect(), p = prompt?.getBoundingClientRect();
          if (a && p && (a.bottom > innerHeight || a.top < 0 || p.top < 0 || p.bottom > innerHeight)) prompt.scrollIntoView({ block: 'start', behavior: 'instant' });
        }, target);
      } else if (target) await page.locator(target).first().scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(({ target, requireTogether }) => {
        const rect = element => { const r = element?.getBoundingClientRect(); return r && { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
        const action = target ? document.querySelector(target) : null, bounds = rect(action);
        const prompt = document.querySelector('.br-scene-title[data-br-prompt-id]');
        const promptRect = rect(prompt);
        const language = document.querySelector('#i18n-toggle')?.getBoundingClientRect(), question = prompt?.getBoundingClientRect();
        const languageOverlap = !!language && !!question && language.left < question.right && language.right > question.left && language.top < question.bottom && language.bottom > question.top;
        const clipped = [...document.querySelectorAll('.br-card *, .br-stage *')].filter(element => {
          if (!element.getClientRects().length || element.closest('[hidden],[aria-hidden="true"],svg') || element.children.length) return false;
          const style = getComputedStyle(element); return element.clientWidth > 0 && !['inline', 'contents'].includes(style.display) && style.overflowX === 'visible' && element.scrollWidth > element.clientWidth + 1;
        }).map(element => element.className || element.tagName).slice(0, 6);
        const hit = bounds && document.elementFromPoint(Math.floor(action.getBoundingClientRect().left + bounds.width / 2), Math.floor(bounds.top + bounds.height / 2));
        return { overflow: document.documentElement.scrollWidth - innerWidth, clipped, languageOverlap, action: bounds && { ...bounds, clickable: action.contains(hit) }, prompt: promptRect,
          // scrollY rounds to whole pixels while DOMRects remain fractional.
          together: !requireTogether || !!bounds && bounds.top >= -1 && bounds.bottom <= innerHeight + 1 && !!promptRect && promptRect.top >= -1 && promptRect.bottom <= innerHeight + 1 };
      }, { target, requireTogether });
      const filename = `${label}-${width}x${height}-${lang}.png`; await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' });
      report.views.push({ label, width, height, lang, ...metrics, screenshot: filename });
      assert.ok(metrics.overflow <= 1, label + ' overflow'); assert.deepEqual(metrics.clipped, [], label + ' clipped');
      assert.equal(metrics.languageOverlap, false, label + ' language control never covers the question');
      if (target) { assert.ok(metrics.action.width >= 44 && metrics.action.height >= 44, label + ' 44px target'); assert.equal(metrics.action.clickable, true, label + ' unoccluded target'); }
      assert.equal(metrics.together, true, label + ' complete prompt and action together');
    }
    await page.evaluate(() => I18N.setLang('en'));
  };
  try {
    host = await open('bomb-relay.html'); players = await Promise.all(tokens.map(token => open(`play.html?s=${code}&p=${token}`)));
    await Promise.all(players.map(page => page.setViewportSize({ width: 390, height: 844 })));
    await wait(async () => !(await host.locator('#br-start').isDisabled()), 'Start ready');
    await host.selectOption('#br-edition', 'halloween'); await host.selectOption('#br-monster', 'pumpkin');
    await host.locator('#br-scale').setChecked(false); await host.fill('#br-min', '30'); await host.locator('#br-min').blur();
    await host.fill('#br-max', '31'); await host.locator('#br-max').blur(); await host.selectOption('#br-cards', '5');
    await host.click('#br-start'); await phase('ready');
    let current = await state(); const firstPrompt = current.promptSnapshot.id;
    await setAvatar(2, 'ponytail'); await setMonster(2, 'ghost');
    const preview = await state();
    await wait(async () => (await cards()).every(value => value.bomb.roster.find(player => player.playerNum === 2).avatar === 'ponytail' && value.bomb.appearance.monster === 'ghost'));
    assert.equal(preview.turnId, current.turnId); assert.equal(preview.promptSnapshot.id, firstPrompt); assert.deepEqual(preview.promptHistory, current.promptHistory);
    await capture(host, 'host-halloween-ready', '#br-light');
    await capture(card(2), 'ready-avatar-picker', '[data-br-avatar="ponytail"]');
    check('real setup plus original player avatar/monster controls update one room authority without drawing a prompt or changing turns');
    await authorityReady(); await host.click('#br-light'); await phase('ticking');
    current = await state(); const lit = clone(current); const go = current.litAt;
    await expression('idle'); await assertPrivate();
    await setMonster(2, 'furry');
    await wait(async () => (await cards()).every(value => value.bomb.appearance.monster === 'ghost'));
    assert.deepEqual((await state()).roundAppearance, lit.roundAppearance); assert.deepEqual((await state()).roundFuse, lit.roundFuse);
    assert.equal((await state()).explodeAt, lit.explodeAt); assert.equal((await state()).turnId, lit.turnId);
    check('lit bomb retains its ghost look, random fuse, prompt/history and pass turn while a different next-bomb monster synchronizes');
    await setTime(go + 6000); await authorityReady(); await host.evaluate(() => BOMB_RELAY_HOST.command('pause')); await phase('paused');
    current = await state(); const pausedClock = clone(current.cosmeticClock); await setTime(go + 21000); await expression('idle');
    assert.deepEqual((await state()).cosmeticClock, pausedClock);
    await authorityReady(); await host.evaluate(() => BOMB_RELAY_HOST.command('resume')); await phase('ticking');
    current = await state(); const resumedAt = current.cosmeticClock.startedAt;
    await setTime(resumedAt + 3999); await expression('idle');
    await setTime(resumedAt + 4000); await expression('warning');
    current = await state(); const beforePass = clone(current); const holder = current.holder;
    await tap(card(holder), '[data-br-action="pass"]'); await wait(async () => (await state()).holder !== holder); await phase('ticking');
    current = await state(); assert.equal(current.explodeAt, beforePass.explodeAt); assert.deepEqual(current.cosmeticClock, beforePass.cosmeticClock); assert.equal(current.promptSnapshot.id, firstPrompt);
    await capture(host, 'host-halloween-warning', '#br-pass');
    await expression('warning'); await assertPrivate(); await capture(card(current.holder), 'warning-and-pass', '[data-br-action="pass"]', true);
    check('ten-second warning excludes paused time, stays warning through a real pass, and exposes elapsed presentation time without the secret fuse');
    const reloader = current.holder; await card(reloader).reload(); await phase('ticking'); await expression('warning');
    assert.deepEqual((await state()).cosmeticClock, current.cosmeticClock); assert.equal((await state()).explodeAt, current.explodeAt);
    check('reloading the original player link reconnects to the same warned bomb, holder and deadline');
    await setAvatar(current.holder, 'curly'); current = await state();
    await setTime(current.explodeAt); await phase('boom'); await expression('rage');
    const exploded = await state(); const chase = clone(exploded.lastChase), loser = exploded.boom.loser;
    assert.equal(chase.monster, 'ghost'); assert.equal(chase.avatar, 'curly'); assert.equal(chase.loser, loser);
    assert.equal(Object.values(exploded.penalties).flat().length, 1); assert.equal(exploded.promptSnapshot.id, firstPrompt);
    await wait(async () => (await host.locator('[data-br-chase]').count()) === 1 && (await card(loser).locator('[data-br-chase]').count()) === 1);
    for (let n = 1; n <= playerCount; n++) if (n !== loser) assert.equal(await card(n).locator('[data-br-chase]').count(), 0);
    await capture(host, 'host-halloween-boom', '#br-next');
    await capture(card(loser), 'halloween-boom-and-chase', '[data-br-action="next"]');
    check('actual explosion settles one penalty and snapshots the loser’s curly avatar plus this bomb’s ghost for host/loser chase');
    await setTime(exploded.phaseUntil); await phase('discussion'); await expression('rage');
    const discussion = await state(); const discussionUntil = discussion.discussionUntil;
    await card(loser).reload(); await phase('discussion'); assert.equal((await state()).discussionUntil, discussionUntil);
    await capture(card(loser), 'discussion-original-prompt', '[data-br-action="next"]');
    await setTime(discussionUntil - 1); await pause(150); assert.equal((await state()).phase, 'discussion');
    await setTime(discussionUntil); await phase('ready');
    current = await state(); assert.notEqual(current.promptSnapshot.id, firstPrompt); assert.equal(current.explodeAt, null); assert.deepEqual(current.lastChase, chase);
    await wait(async () => (await cards()).every(value => value.bomb.appearance.monster === 'furry'));
    await capture(host, 'host-next-preview-old-chase', '#br-light');
    const chaseNode = await card(loser).locator('[data-br-chase]').elementHandle();
    const upperNode = await card(loser).locator('.br-run-avatar .br-run-upper').elementHandle();
    const upperStart = await upperNode.evaluate(element => ({ animation: getComputedStyle(element).animationName, transform: getComputedStyle(element).transform }));
    const legs = await card(loser).locator('.br-run-leg').evaluateAll(elements => elements.map(element => ({ duration: getComputedStyle(element).animationDuration, name: getComputedStyle(element).animationName })));
    assert.equal(upperStart.animation, 'none'); assert.equal(upperStart.transform, 'none'); assert.ok(legs.every(leg => leg.duration === '0.48s' && leg.name !== 'none'));
    await pause(600); assert.deepEqual(await upperNode.evaluate(element => ({ animation: getComputedStyle(element).animationName, transform: getComputedStyle(element).transform })), upperStart);
    await capture(card(loser), 'next-preview-old-chase', '[data-br-action="light"]');
    assert.equal((await state()).phase, 'ready'); assert.equal((await state()).explodeAt, null);
    check('4.5-second BOOM and all 45 discussion seconds retain the old prompt/result; next preview adopts pending furry and waits for manual GO while old ghost chase continues');
    await card(loser).emulateMedia({ reducedMotion: 'reduce' });
    assert.ok((await card(loser).locator('.br-run-leg,.br-run-knee').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName))).every(name => name === 'none'));
    await capture(card(loser), 'reduced-motion-static-chase', '[data-br-action="light"]');
    await card(loser).emulateMedia({ reducedMotion: 'no-preference' });
    check('joined head/body/raised hands remain fixed, legs run a 480ms cycle, and reduced motion provides a static chase');
    const legNode = await card(loser).locator('.br-run-avatar .br-run-leg-front').elementHandle();
    const animationTime = () => legNode.evaluate(element => element.getAnimations()[0]?.currentTime ?? null);
    await wait(async () => typeof await animationTime() === 'number', 'leg animation resumed');
    // CSS animation timestamps are frame sampled. Warm the resumed track and
    // allow frames after each operation; an immediate strict comparison can
    // see the same frame despite an intact, continuously running animation.
    await pause(240);
    report.animationTimes = [];
    const beforeGoAnimation = await animationTime();
    await authorityReady(); await host.click('#br-light'); await phase('ticking'); current = await state();
    assert.deepEqual(current.lastChase, chase); assert.equal(current.roundAppearance.monster, 'furry');
    assert.equal(await chaseNode.evaluate(element => element.isConnected), true, 'old chase DOM survives GO');
    await pause(80); const afterGoAnimation = await animationTime(); report.animationTimes.push({ action: 'GO', before: beforeGoAnimation, after: afterGoAnimation });
    assert.ok(afterGoAnimation > beforeGoAnimation, 'GO preserves continuous leg animation time');
    const beforeCosmeticAnimation = await animationTime();
    await setMonster(2, 'pumpkin');
    assert.equal(await legNode.evaluate(element => element.isConnected), true, 'cosmetic redraw keeps the same leg node');
    await pause(80); const afterCosmeticAnimation = await animationTime(); report.animationTimes.push({ action: 'cosmetic', before: beforeCosmeticAnimation, after: afterCosmeticAnimation });
    assert.ok(afterCosmeticAnimation > beforeCosmeticAnimation, 'cosmetic redraw preserves animation phase');
    const beforePassAnimation = await animationTime();
    await tap(card(current.holder), '[data-br-action="pass"]'); await wait(async () => (await state()).holder !== current.holder);
    assert.equal(await legNode.evaluate(element => element.isConnected), true, 'pass redraw keeps the same leg node');
    await pause(80); const afterPassAnimation = await animationTime(); report.animationTimes.push({ action: 'pass', before: beforePassAnimation, after: afterPassAnimation });
    assert.ok(afterPassAnimation > beforePassAnimation, 'pass redraw preserves animation phase');
    assert.deepEqual((await state()).lastChase, chase);
    check('GO, synchronized cosmetic changes and a pass retain the exact chase/leg DOM nodes and continuously advancing animation phase');
    await hostAppearance('classic', 'furry');
    assert.equal((await state()).roundAppearance.edition, 'halloween');
    const second = await state(); await setTime(second.explodeAt); await phase('boom');
    const secondChase = clone((await state()).lastChase); assert.equal(secondChase.monster, 'furry');
    await card((await state()).boom.loser).locator('[data-br-action="next"]').click(); await phase('ready');
    current = await state(); assert.equal(current.appearance.edition, 'classic'); assert.deepEqual(current.lastChase, secondChase);
    await authorityReady(); await host.click('#br-light'); await phase('ticking'); current = await state();
    await setTime(current.litAt + 10000); await expression('angry');
    await capture(card(current.holder), 'classic-angry', '[data-br-action="pass"]', true);
    await setTime((await state()).explodeAt); await phase('boom');
    assert.equal((await state()).lastChase, null); await expression('burst');
    await setTime(epoch + offset + 1000); await expression('spent');
    check('classic edition stays pending until the following bomb, retains its light bomb reaction and clears Halloween chase on a classic explosion');
    await authorityReady(); await host.evaluate(() => BOMB_RELAY_HOST.command('restart')); await phase('ready');
    assert.equal((await state()).lastChase, null); assert.equal((await state()).cosmeticClock.startedAt, null);
    await authorityReady(); await host.evaluate(() => BOMB_RELAY_HOST.command('stop')); await phase('finished');
    assert.equal((await state()).lastChase, null); assert.equal(await host.locator('[data-br-chase]').count(), 0);
    check('ordinary Restart and End clean cosmetic chase/clock state while the existing game controls remain connected');
    assert.deepEqual(errors, []); report.errors = errors; report.blockedExternalRequests = [...blocked];
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`Bomb Halloween browser: ${report.checks.length} checks, ${report.views.length} captures, 0 page errors → ${output}`);
  } catch (error) {
    report.failure = String(error.stack || error); report.errors = errors; report.now = epoch + offset;
    report.state = await state().catch(() => null); report.cards = await cards().catch(() => []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await host?.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
