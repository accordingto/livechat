'use strict';
// Run: node tests/who-knows-ui.browser.cjs [path-to-playwright-package]
// WK_QA_MODE=insider|werewolf, WK_QA_PLAYERS=4..9, WK_QA_OUTPUT=<dir outside the Hub>,
// WK_QA_TARGET=word|number, WK_QA_HINT=0|1, WK_QA_NUMBER_MAX=100|1000.
// WK_QA_CAPTURE_FILTER=<label fragment> keeps the entire flow but captures one surface.
// WK_QA_LAYOUT=0 skips the captures. Serves the REAL who-knows.html host and the
// original play.html links against one isolated Firebase-compatible in-memory
// database. The host page is CLOSED right after Start: the cards then run the
// table (clock, Table controls, next rounds) on their own; the host page is
// reopened later only as an optional viewer. Every external request is
// intercepted; no live room is touched.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const mode = process.env.WK_QA_MODE || 'insider';
const targetKind = process.env.WK_QA_TARGET || process.env.WHO_QA_TARGET || 'word';
const showHint = (process.env.WK_QA_HINT || process.env.WHO_QA_HINT || '0') === '1';
const numberMax = Number(process.env.WK_QA_NUMBER_MAX || 100);
assert.ok(['word', 'number'].includes(targetKind)); assert.ok([100, 1000].includes(numberMax));
assert.ok(['insider', 'werewolf'].includes(mode), 'WK_QA_MODE must be insider or werewolf');
const playerCount = Number(process.env.WK_QA_PLAYERS || 5);
assert.ok(Number.isInteger(playerCount) && playerCount >= 4 && playerCount <= 9, 'WK_QA_PLAYERS must be 4–9');
const output = path.resolve(process.env.WK_QA_OUTPUT || path.join(root, '..', `who-knows-browser-qa-${mode}-${playerCount}`));
const code = `WK_BROWSER_QA_${mode.toUpperCase()}_${playerCount}`;
const tokens = Array.from({ length: playerCount }, (_, index) => 'qa-player-' + (index + 1));
const names = ['Amy', 'Kevin', 'Jason', 'Willy', 'Riley', 'Morgan', 'Alexandra-Marie', 'Sam', 'Robin'].slice(0, playerCount);
const WORDS = require('../who-knows-words.js');
const answerForId = id => WORDS.get(id) || (/^wk-n-([1-9]\d*)$/.test(id) ? { id, en: id.slice(5), zh: id.slice(5), kind: 'number' } : null);
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
// Firebase drops empty arrays and maps; read projections the way the UI does.
const list = value => Array.isArray(value) ? value : Object.values(value || {});
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
// Installed before any page script. Transaction updaters run twice and
// compare-and-set retries run on conflicts, exposing impure or racy code.
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
        if (value?.game === 'whoknows' && value.wk) window.__qaReceived = structuredClone(value);
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
          if (value?.game === 'whoknows' && value.wk) window.__qaReceived = structuredClone(value);
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
      onDisconnect: () => ({
        remove: () => request({ type: 'disconnectRemove', path: location }),
        cancel: () => request({ type: 'disconnectCancel', path: location }),
      }),
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
  if (!localStorage.getItem('site-lang')) localStorage.setItem('site-lang', 'en');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Exact matches only: "Secret" is a word in the bank and also part of the key "mayorSecret".
const carries = (json, word) => json.includes(`"id":"${word.id}"`) || json.includes(`"en":${JSON.stringify(word.en)}`);

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
  const browser = await chromium.launch({ headless: true, ...(process.env.WK_QA_CHANNEL ? { channel: process.env.WK_QA_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let delivery = Promise.resolve();
  const disconnects = new Map();
  const deliver = () => {
    const tree = db.dump();
    delivery = delivery.then(() => Promise.all([...pages].map(page => page.isClosed() ? null : page.evaluate(tree => window.__qaDeliver?.(tree), tree).catch(() => {}))));
  };
  await context.exposeBinding('__qaFirebase', (source, request) => {
    if (request.type === 'disconnectRemove' || request.type === 'disconnectCancel') {
      if (!disconnects.has(source.page)) disconnects.set(source.page, new Set());
      const paths = disconnects.get(source.page);
      if (request.type === 'disconnectRemove') paths.add(request.path); else paths.delete(request.path);
      return { committed: false };
    }
    const result = db.request(request);
    if (result.committed) setTimeout(deliver, 0);
    return result;
  });
  await context.addInitScript(installFirebase, { code, tokens, names, epoch });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    blocked.add(url);
    return route.fulfill({ status: 200, contentType: url.includes('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const open = async url => {
    const item = await context.newPage(); pages.add(item);
    item.on('pageerror', error => errors.push({ url: item.url(), message: error.message }));
    const disconnect = () => {
      // Firebase removes registered presence even when pagehide cannot finish
      // an async remove. Reload/navigation also closes the old connection;
      // keeping its presence would leave a ghost ahead of the live tickers.
      for (const location of disconnects.get(item) || []) db.put(location, null);
      disconnects.delete(item); deliver();
    };
    item.on('framenavigated', frame => { if (frame === item.mainFrame()) disconnect(); });
    item.on('close', () => { pages.delete(item); disconnect(); });
    await item.goto(base + '/' + url);
    return item;
  };
  const report = { entry: `who-knows.html + ${playerCount} original play.html links`, mode, targetKind, showHint, numberMax, playerCount, words: WORDS.items.length,
    fixture: 'isolated Firebase-compatible memory database; controlled clock via serverTimeOffset; external network intercepted; desktop Chromium emulates viewport sizes, not physical phones', checks: [], views: [] };
  const check = label => { report.checks.push(label); if (process.env.WK_QA_VERBOSE) console.log('PASS ' + label); };
  const wait = async (predicate, label = 'state') => {
    for (let i = 0; i < 400; i++) { await delivery; if (await predicate()) return; await pause(25); }
    throw new Error('Browser state did not settle: ' + label);
  };
  let host = null, players = [];
  const control = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[1] || null;
  const tableToken = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[0] || null;
  const presence = () => db.get(`rooms/${code}/players/${tableToken()}/presence`) || {};
  const oneConnection = n => Object.values(presence()).filter(entry => entry?.actor === n).length === 1;
  // The canonical table, read straight from the database: no page has to be open.
  const state = async () => { const table = control(); return table?.stateJson ? JSON.parse(table.stateJson) : null; };
  const status = () => host.evaluate(() => WHO_KNOWS_HOST.status);
  // What each card currently shows for its own seat.
  const cards = () => Promise.all(players.map(page => page.evaluate(() => window.WHO_KNOWS_CARD?.view() || null)));
  const card = n => players[n - 1];
  // The clock moves through serverTimeOffset; the cards tick it themselves.
  const advance = async ms => { offset += ms; db.put('.info/serverTimeOffset', offset); deliver(); await delivery; };
  const allCards = async predicate => wait(async () => (await cards()).every(value => value && predicate(value.wk, value)), 'cards');
  const phase = async target => {
    await wait(async () => (await state())?.phase === target, 'phase ' + target);
    const session = (await state()).sessionId, stage = (await state()).stage;
    await allCards(wk => wk.sessionId === session && wk.stage === stage);
  };
  const tap = async (page, selector) => {
    const button = page.locator(selector).first();
    await button.waitFor({ state: 'visible' });
    await wait(async () => !(await button.isDisabled()), 'enabled ' + selector);
    await button.click();
  };
  // Table controls live in a folded panel at the bottom of every active card.
  const controls = async page => {
    const panel = page.locator('[data-wk-controls]');
    await panel.waitFor({ state: 'visible' });
    if (!(await panel.evaluate(element => element.open))) await panel.locator('summary').click();
    return panel;
  };
  const tool = async (page, selector) => { await controls(page); await tap(page, '[data-wk-controls] ' + selector); };
  const text = page => page.evaluate(() => document.body.innerText);
  // "Table", "Clock" and "Secret" are valid answers as well as interface
  // copy. Check the actual word/option labels, plus each seat's projected
  // payload below, rather than treating fixed controls as a leaked answer.
  const renderedWord = async (page, word) => (await page.locator('.wk-option strong[lang="en"], .wk-paper strong[lang="en"]').allTextContents()).includes(word.en);
  const roleOf = (s, n) => s.round.roles[n];
  const nameOf = n => names[n - 1];
  // ── layout captures with overflow, occlusion and tap-target checks ──
  const capture = async (page, label, { width, height = 900, lang, target = null } = {}) => {
    if (process.env.WK_QA_LAYOUT === '0') return;
    if (process.env.WK_QA_CAPTURE_FILTER && !label.includes(process.env.WK_QA_CAPTURE_FILTER)) return;
    await page.setViewportSize({ width, height });
    await page.evaluate(language => I18N.setLang(language), lang);
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(60);
    const metrics = await page.evaluate(target => {
      const overflow = document.documentElement.scrollWidth - innerWidth;
      const clipped = [...document.querySelectorAll('.wk-card *, .wk-stage *, .wk-setup *')].filter(element => {
        if (!element.getClientRects().length || element.closest('[hidden], .wk-chip-art, svg')) return false;
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 1 && style.overflowX === 'visible' && !['inline', 'contents'].includes(style.display) && element.clientWidth > 0 && element.children.length === 0;
      }).map(element => element.className || element.tagName).slice(0, 5);
      let action = null;
      if (target) {
        const element = document.querySelector(target);
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'instant' });
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(Math.floor(rect.x + rect.width / 2), Math.floor(rect.y + rect.height / 2));
          action = { width: rect.width, height: rect.height, clickable: element.contains(hit) };
          window.scrollTo(0, 0);
        }
      }
      return { overflow, clipped, action };
    }, target);
    const file = `${label}-${width}x${height}-${lang}.png`;
    await page.screenshot({ path: path.join(output, file), fullPage: true, animations: 'disabled', timeout: 90000 });
    report.views.push({ label, width, height, lang, ...metrics, screenshot: file });
    assert.ok(metrics.overflow <= 1, `${label} ${width} ${lang}: horizontal overflow ${metrics.overflow}`);
    assert.deepEqual(metrics.clipped, [], `${label} ${width} ${lang}: clipped text`);
    if (target) {
      assert.ok(metrics.action, `${label}: ${target} present`);
      assert.ok(metrics.action.height >= 44 && metrics.action.width >= 44, `${label}: ${target} tap target ${metrics.action.width}x${metrics.action.height}`);
      assert.equal(metrics.action.clickable, true, `${label}: ${target} is not covered`);
    }
  };
  const views = async (page, label, target, sizes) => {
    for (const [width, height] of sizes) for (const lang of ['en', 'zh']) await capture(page, label, { width, height, lang, target });
    await page.evaluate(() => I18N.setLang('en'));
    await page.setViewportSize({ width: page === host ? 1280 : 390, height: 900 });
  };
  const PHONES = [[390, 844], [320, 568]], HOSTS = [[1280, 800], [390, 844]];

  const speakingTurns = async (after, { captureTurns = false, skipRest = false } = {}) => {
    await phase('speaking');
    let s = await state();
    const eligible = s.round.players.filter(n => s.roster.find(p => p.playerNum === n)?.active && !(after === 'masterGuess' && n === s.round.mayor));
    let turn = (await cards())[0].wk.speaking;
    assert.deepEqual(list(turn.order).slice().sort((a, b) => a - b), eligible);
    assert.equal(turn.after, after);
    await allCards(wk => wk.speaking?.turnId === turn.turnId && wk.speaking.playerNum === turn.playerNum);
    for (const n of s.round.players)
      assert.equal(await card(n).locator('[data-wk-main] [data-wk-action="speakerDone"]').count(), n === turn.playerNum ? 1 : 0, 'only the speaker has Done');
    if (!s.round.guess) {
      const secret = answerForId(s.round.wordId);
      const nonKnower = s.round.players.find(n => n !== s.round.mayor && !['insider', 'seer', 'werewolf'].includes(roleOf(s, n)));
      if (nonKnower) {
        assert.equal(await renderedWord(card(nonKnower), secret), false, 'unfound word stays private during speeches');
        assert.equal(carries(JSON.stringify((await cards())[nonKnower - 1]), secret), false, 'the non-knower projection carries no secret');
      }
    }
    if (captureTurns) {
      host = await open('who-knows.html');
      await wait(async () => (await status()) === 'ready', 'host speaking viewer');
      await views(host, 'host-speaking-' + after, '#wk-manage-open', HOSTS);
      await host.close(); host = null;
      await views(card(turn.playerNum), 'card-speaking-current-' + after, '[data-wk-main] [data-wk-action="speakerDone"]', PHONES);
      await views(card(eligible.find(n => n !== turn.playerNum) || turn.playerNum), 'card-speaking-listener-' + after, null, PHONES);
    }
    const deadline = s.deadline, beforeId = turn.turnId;
    const reloader = eligible.find(n => n !== turn.playerNum);
    await card(reloader).reload(); await allCards(wk => wk.speaking?.turnId === beforeId);
    await wait(() => oneConnection(reloader), 'reloaded speaker card has one live connection');
    assert.equal((await state()).deadline, deadline, 'reloading keeps the current speech deadline');
    await tap(card(turn.playerNum), '[data-wk-main] [data-wk-action="speakerDone"]');
    await wait(async () => (await state()).round.speaking.index === 1, 'speaker Done');
    await phase('speaking');
    turn = (await cards())[0].wk.speaking;
    await tool(card(eligible.find(n => n !== turn.playerNum) || turn.playerNum), '[data-wk-action="nextSpeaker"]');
    await wait(async () => (await state()).round.speaking.index === 2, 'Next speaker');
    await phase('speaking');
    s = await state(); turn = (await cards())[0].wk.speaking;
    await advance(s.deadline - (epoch + offset) + 5000);
    await wait(async () => (await state()).round.speaking.index === 3 || (await state()).phase === after, 'speech deadline');
    if ((await state()).phase === 'speaking' && skipRest) {
      const manager = eligible[0];
      await tool(card(manager), '[data-wk-action="close"]');
      assert.equal((await state()).phase, 'speaking', 'skipping remaining speeches takes two taps');
      if (captureTurns) await views(card(manager), 'card-speaking-skip-confirm', '[data-wk-controls] [data-wk-action="close"]', [[390, 844], [320, 568]]);
      // Capturing four translated layouts can outlast the real 4 s safety
      // confirmation. Re-arm if it expired, then exercise the second tap.
      if (!(await card(manager).locator('[data-wk-controls] [data-wk-action="close"]').evaluate(button => button.classList.contains('is-armed'))))
        await tool(card(manager), '[data-wk-action="close"]');
      await tool(card(manager), '[data-wk-action="close"]');
    } else {
      while ((await state()).phase === 'speaking') {
        await phase('speaking');
        const current = (await cards())[0].wk.speaking;
        const stage = (await state()).stage;
        await tap(card(current.playerNum), '[data-wk-main] [data-wk-action="speakerDone"]');
        await wait(async () => (await state()).phase !== 'speaking' || (await state()).stage !== stage, 'next speech');
      }
    }
    await phase(after);
    if (after === 'accuse') assert.equal((await state()).deadline - (epoch + offset), 45000);
    check(`shared speaking turns before ${after}: Done, Next speaker, timed handoff, reload with the same deadline${skipRest ? ', two-tap skip' : ''}`);
  };

  try {
    host = await open('who-knows.html');
    players = await Promise.all(tokens.map(token => open('play.html?s=' + code + '&p=' + token)));
    for (const page of players) await page.setViewportSize({ width: 390, height: 900 });
    await wait(async () => (await status()) === 'ready' && !(await host.locator('#wk-start').isDisabled()), 'host ready');
    assert.equal(await host.locator('#wk-setup').isVisible(), true);
    assert.match(await host.locator('#wk-setup .wk-note').innerText(), /you may close this page/);
    await views(host, 'host-setup', '#wk-start', [[1280, 800], [390, 844], [320, 568]]);
    for (const page of players) assert.match(await text(page), /Waiting for the host|等待主持人/);
    check('real entry: host waits on setup, every original link waits on the neutral card');

    // ── start, then close the host page ──
    if (mode === 'werewolf') {
      await host.click('[data-wk-mode-card="werewolf"]');
      assert.equal(await host.locator('#wk-tokens').isVisible(), true);
      assert.equal(await host.inputValue('#wk-minutes'), '4', 'Werewolf takes its own usual length');
    } else assert.equal(await host.locator('#wk-tokens').isVisible(), false);
    assert.equal(await host.inputValue('#wk-target-kind'), 'word');
    assert.equal(await host.locator('#wk-broad-hint').isChecked(), false, 'opening clues are off by default');
    assert.equal(await host.inputValue('#wk-number-max'), '100');
    await host.selectOption('#wk-target-kind', targetKind);
    await host.locator('#wk-broad-hint').setChecked(showHint);
    if (targetKind === 'number') {
      await host.selectOption('#wk-number-max', String(numberMax));
      assert.equal(await host.locator('#wk-difficulty').isVisible(), false);
      assert.equal(await host.locator('#wk-tokens').isVisible(), false, 'number replies do not use yes/no tokens');
    }
    if (targetKind === 'number' || showHint) await views(host, 'host-answer-options', '#wk-start', [[1280, 800], [320, 568]]);
    await host.click('#wk-start');
    await phase('choose');
    let s = await state();
    const table = tableToken();
    for (let i = 0; i < playerCount; i++)
      assert.deepEqual(db.get(`rooms/${code}/players/${tokens[i]}`), { game: 'whoknows', playerNum: i + 1, name: names[i], wk: { version: 2, table } }, 'each link only points at the table');
    const mayor = s.round.mayor, others = s.round.players.filter(n => n !== mayor);
    const optionWords = s.round.options.map(answerForId);
    assert.equal(s.round.targetKind, targetKind); assert.equal(s.round.broadHint, showHint);
    for (const n of s.round.players) {
      await wait(async () => (await card(n).locator('.wk-ticket-role').count()) === 1, 'ticket');
      const role = await card(n).locator('.wk-ticket-role').innerText();
      assert.ok(role.length > 0);
      for (const word of optionWords) assert.equal(await renderedWord(card(n), word), n === mayor, `card ${n} options: ${word.en}`);
    }
    for (const word of optionWords) assert.equal(await renderedWord(host, word), false, 'host never shows the options: ' + word.en);
    assert.equal(await card(mayor).locator('.wk-option').count(), 3);
    check(`${mode}: Start points every link at the table; each card shows its own role, only the answerer sees the three word options`);
    await views(host, 'host-choose', '#wk-manage-open', HOSTS);
    await views(card(mayor), 'card-choose-answerer', '.wk-option', PHONES);
    await views(card(others[0]), 'card-choose-player', null, [[390, 844]]);
    await host.close(); host = null;
    check('the host page is closed from here on: the cards run the table');

    // ── choose → countdown → questions, with no host page ──
    const rerollBefore = (await state()).round.options.join();
    await tap(card(mayor), '[data-wk-action="reroll"]');
    await wait(async () => (await state()).round.options.join() !== rerollBefore, 'reroll');
    await wait(async () => list((await cards())[mayor - 1].wk.me.options).map(option => option.id).join() === (await state()).round.options.join(), 'new options on the card');
    await tap(card(mayor), '.wk-option >> nth=1');
    await phase('countdown');
    s = await state();
    const secret = answerForId(s.round.wordId);
    const knowers = s.round.players.filter(n => n === mayor || ['insider', 'seer', 'werewolf'].includes(roleOf(s, n)));
    for (const n of s.round.players) {
      assert.equal(await renderedWord(card(n), secret), knowers.includes(n), `card ${n} word privacy on screen`);
      assert.equal(carries(JSON.stringify((await cards())[n - 1]), secret), knowers.includes(n), `card ${n} word privacy in projected payload`);
      assert.equal((await card(n).locator('.wk-paper').count()) > 0, knowers.includes(n));
      assert.equal(await card(n).locator('[data-wk-opening-hint]').count(), showHint ? 1 : 0);
      assert.deepEqual((await cards())[n - 1].wk.broadHint, showHint ? s.round.hintSnapshot : null);
      assert.equal('numberMax' in (await cards())[n - 1].wk.settings, false, 'a hidden number range is not leaked through the card settings');
    }
    check('after the answerer chooses, the word appears only on the cards whose role knows it');
    check('the optional broad clue is synchronized and frozen on every card, while the number pool is absent from card settings');
    await advance(6000);
    await phase('questions');
    check('with the host page closed, a card starts the questions when the five-second countdown runs out');

    // ── questions: raise, type, answer ──
    const [a, b, c] = others;
    const input = card(a).locator('[data-wk-input]');
    const firstQuestion = targetKind === 'number' ? 'How close is 50?' : 'Is it something you can eat?';
    if (targetKind === 'number') assert.match(await input.getAttribute('placeholder'), /How close is 50/);
    await input.fill(firstQuestion);
    await tap(card(a), '[data-wk-action="raise"]');
    await wait(async () => (await state()).round.current?.playerNum === a, 'a asking');
    await tap(card(b), '[data-wk-action="raise"]');
    await wait(async () => (await state()).round.queue.length === 1, 'b queued');
    await allCards(wk => wk.current?.playerNum === a && list(wk.queue).length === 1);
    assert.equal(await card(a).locator('.wk-zone-turn').count(), 1);
    assert.match(await card(b).innerText('body'), /#2|第 2/);
    assert.ok((await card(c).innerText('body')).includes(firstQuestion));
    if (targetKind === 'number') {
      assert.match(await card(a).locator('.wk-zone-turn').innerText(), /Ask an open question or guess a number/);
      assert.doesNotMatch(await card(a).locator('.wk-zone-turn').innerText(), /yes-or-no/);
    }
    check('raising a hand forms one shared line; the asker’s typed question shows on the other cards');
    await views(card(a), 'card-your-turn', '[data-wk-action="lower"]', PHONES);
    const firstAnswer = targetKind === 'number' ? 'spoken' : 'yes', secondAnswer = targetKind === 'number' ? 'spoken' : 'no';
    await views(card(mayor), 'card-answerer', `[data-wk-action="answer"][data-wk-arg-answer="${firstAnswer}"]`, PHONES);
    const draft = card(c).locator('[data-wk-input]');
    await draft.click(); await draft.pressSequentially('Is it bigger');
    const fieldBefore = await draft.evaluateHandle(element => element);
    await tap(card(mayor), `[data-wk-action="answer"][data-wk-arg-answer="${firstAnswer}"]`);
    await wait(async () => (await state()).round.log.length === 1 && (await state()).round.current?.playerNum === b, 'answered a');
    await allCards(wk => list(wk.log).length === 1);
    assert.equal(await draft.inputValue(), 'Is it bigger');
    assert.equal(await card(c).evaluate(element => document.activeElement === element, fieldBefore), true);
    assert.equal(await fieldBefore.evaluate(element => element.isConnected), true);
    await draft.pressSequentially(' than a car?');
    check('a player typing a question keeps the same field, text and focus while answers arrive');
    await tap(card(mayor), `[data-wk-action="answer"][data-wk-arg-answer="${secondAnswer}"]`);
    await wait(async () => (await state()).round.log.length === 2, 'answered b');
    await tap(card(c), '[data-wk-action="raise"]');
    await wait(async () => (await state()).round.current?.text === 'Is it bigger than a car?', 'c typed question');
    const third = targetKind === 'number' ? 'spoken' : mode === 'werewolf' ? 'close' : 'unknown';
    await tap(card(mayor), `[data-wk-action="answer"][data-wk-arg-answer="${third}"]`);
    await wait(async () => (await state()).round.log.length === 3, 'answered c');
    await allCards(wk => list(wk.log).length === 3);
    assert.deepEqual((await state()).round.log.map(entry => [entry.playerNum, entry.answer]), [[a, firstAnswer], [b, secondAnswer], [c, third]]);
    if (mode === 'werewolf' && targetKind === 'word') assert.match(await card(a).innerText('body'), /34 Yes\/No left/i);
    if (targetKind === 'number') { assert.equal((await state()).round.tokensUsed, 0); assert.equal((await state()).round.tokens, 0); }
    check(targetKind === 'number' ? 'the answerer can reply freely out loud and advance the same queue without a yes/no budget' : 'the answerer’s tokens log against each asker on every card' + (mode === 'werewolf' ? '; Yes/No tokens count down' : ''));

    // The shared screen is optional: reopening it mid-round just shows the game.
    host = await open('who-knows.html');
    await wait(async () => (await status()) === 'ready', 'host reopened');
    await wait(async () => (await host.locator('.wk-log-row').count()) === 3, 'host log');
    assert.equal(await host.locator('#wk-game').isVisible(), true);
    assert.equal(await renderedWord(host, secret), false, 'the shared screen still never shows the secret');
    assert.equal(await host.locator('[data-wk-opening-hint]').count(), showHint ? 1 : 0);
    await views(host, 'host-questions', '#wk-close', HOSTS);
    await host.close(); host = null;
    check('reopening the host page mid-round shows the same game without restarting it; closing it again changes nothing');

    // Voices overlap: the answerer can hand the turn to whoever really spoke.
    await tap(card(a), '[data-wk-action="raise"]');
    await wait(async () => (await state()).round.current?.playerNum === a, 'a asking again');
    await allCards(wk => wk.current?.playerNum === a);
    await tap(card(mayor), '[data-wk-ui="other"]');
    await card(mayor).locator('.wk-other').waitFor({ state: 'visible' });
    await views(card(mayor), 'card-answerer-other', `.wk-other [data-wk-arg-player-num="${b}"]`, [[390, 844], [320, 568]]);
    await tap(card(mayor), `.wk-other [data-wk-action="pickAsker"][data-wk-arg-player-num="${b}"]`);
    await wait(async () => (await state()).round.current?.playerNum === b && (await state()).round.queue[0]?.playerNum === a, 'picked b');
    await allCards(wk => wk.current?.playerNum === b);
    await tap(card(b), '[data-wk-action="lower"]');
    await wait(async () => (await state()).round.current?.playerNum === a, 'b stepped back');
    await tap(card(a), '[data-wk-action="lower"]');
    await wait(async () => !(await state()).round.current, 'line empty');
    await allCards(wk => !wk.current);
    check('the answerer can make whoever actually said it the asker; players can step out of the line');

    // ── Table controls on a card: pause, resume, add time ──
    const d = others[3] ?? others[2];
    await card(d).locator('[data-wk-input]').fill('Is it found in a kitchen?');
    await card(d).evaluate(() => document.activeElement?.blur());
    const before = await state();
    await controls(card(a));
    await views(card(a), 'card-controls', '[data-wk-controls] [data-wk-action="pause"]', PHONES);
    await tool(card(a), '[data-wk-action="pause"]');
    await phase('paused');
    assert.equal(await card(b).locator('.wk-zone h3').first().innerText(), 'PAUSED');
    await views(card(b), 'card-paused', '.wk-zone [data-wk-action="resume"]', [[390, 844]]);
    await advance(5000);
    await tap(card(b), '.wk-zone [data-wk-action="resume"]');
    await phase('questions');
    const resumed = await state();
    assert.equal(resumed.deadline - (epoch + offset), before.deadline - (epoch + offset - 5000));
    await tool(card(c), '[data-wk-action="extend"]');
    await wait(async () => (await state()).deadline === resumed.deadline + 60000, 'extended');
    assert.equal(await card(d).locator('[data-wk-input]').inputValue(), 'Is it found in a kitchen?', 'a pause keeps a half-typed question');
    await card(d).locator('[data-wk-input]').fill('');
    check('any player pauses from Table controls, another resumes from their card (remaining time kept), a third adds a minute');

    // ── a player reloads mid-round ──
    await card(b).reload();
    await wait(async () => (await card(b).locator('.wk-ticket-role').count()) === 1, 'reloaded card');
    await wait(() => oneConnection(b), 'reloaded player card has one live connection');
    assert.equal(await card(b).evaluate(() => window.WHO_KNOWS_CARD.view()?.wk?.me?.role), roleOf(await state(), b));
    assert.deepEqual(await card(b).evaluate(() => window.WHO_KNOWS_CARD.view()?.wk?.broadHint), showHint ? (await state()).round.hintSnapshot : null);
    check('a reloaded player link comes back to the same role and round');

    // ── the guess ──
    await tap(card(b), '[data-wk-action="raise"]');
    await wait(async () => (await state()).round.current?.playerNum === b, 'b asking again');
    await tap(card(mayor), '.wk-correct');
    await wait(async () => (await card(mayor).locator('.wk-correct.is-armed').count()) === 1, 'armed');
    assert.equal((await state()).phase, 'questions', 'one tap on Correct does nothing yet');
    await views(card(mayor), 'card-correct-armed', '.wk-correct', [[390, 844]]);
    if (!(await card(mayor).locator('.wk-correct').evaluate(button => button.classList.contains('is-armed'))))
      await tap(card(mayor), '.wk-correct');
    await tap(card(mayor), '.wk-correct');
    const guesser = b;
    if (mode === 'werewolf') {
      await phase('hunt');
      s = await state();
      const wolves = s.round.players.filter(n => roleOf(s, n) === 'werewolf');
      const seer = s.round.players.find(n => roleOf(s, n) === 'seer');
      await allCards(wk => wk.word?.id === s.round.wordId && list(wk.wolves).length === wolves.length);
      check('a correct guess makes the word public and reveals the Werewolves for the hunt');
      await views(card(wolves[0]), 'card-hunt-wolf', `[data-wk-action="pick"]`, PHONES);
      for (const wolf of wolves) {
        const target = list((await cards())[wolf - 1].wk.me.voteTargets).find(n => n !== seer);
        await tap(card(wolf), `[data-wk-action="pick"][data-wk-arg-target="${target}"]`);
        await wait(async () => (await state()).phase === 'result' || Object.keys((await state()).round.picks).includes(String(wolf)), 'pick');
      }
      await phase('result');
      s = await state();
      assert.equal(s.round.outcome.key, 'village_word');
      assert.equal(s.scores[seer], 3);
      check('the Werewolves miss the Seer: every villager +2, the Seer +3');
    } else {
      await phase('speaking');
      s = await state();
      await allCards(wk => wk.word?.id === s.round.wordId);
      check('a correct guess makes the word public and gives every player a timed speaking turn');
      await speakingTurns('judge', { captureTurns: true, skipRest: true });
      s = await state();
      check('a player starts the vote early from Table controls');
      await views(card(s.round.players.find(n => n !== guesser)), 'card-judge', '[data-wk-action="judge"]', PHONES);
      for (const n of s.round.players.filter(n => n !== guesser)) {
        await tap(card(n), '[data-wk-action="judge"][data-wk-arg-choice="no"]');
        await wait(async () => (await state()).phase !== 'judge' || (await state()).round.judge[n] === 'no', 'judge ' + n);
      }
      await phase('vote');
      s = await state();
      const insider = s.round.players.find(n => roleOf(s, n) === 'insider');
      for (const n of s.round.players) {
        const choices = list((await cards())[n - 1].wk.me.voteTargets);
        const target = choices.includes(insider) ? insider : choices[0];
        await tap(card(n), `[data-wk-action="vote"][data-wk-arg-target="${target}"]`);
        await wait(async () => (await state()).phase === 'result' || (await state()).round.votes[n] === target, 'vote ' + n);
      }
      await phase('result');
      s = await state();
      assert.equal(s.round.outcome.key, 'commons_found');
      for (const n of s.round.players) assert.equal(s.scores[n] || 0, n === insider ? 0 : 1);
      check('a majority No sends everyone to a vote; catching the Insider gives the Master and every Common +1');
    }
    for (const n of s.round.players) assert.equal((await card(n).locator('.wk-reveal-card').count()), playerCount);
    check('the result reveals every role, the word and the points on every card');
    await views(card(others[0]), 'card-result', '[data-wk-action="next"]', PHONES);

    // ── next round from a card ──
    const firstWord = s.round.wordId;
    await tap(card(others[0]), '[data-wk-action="next"]');
    await phase('choose');
    s = await state();
    assert.equal(s.roundNo, 2); assert.notEqual(s.round.mayor, mayor);
    assert.ok(!s.round.options.includes(firstWord), 'a used word is not offered again');
    assert.equal(s.history.length, 1);
    check('any active player starts the next round; the answerer rotates and used words are not repeated');

    // ── players manage the table: sit out, cancel, I'm back ──
    const out = s.round.players.find(n => n !== s.round.mayor);
    const manager = s.round.players.find(n => n !== out);
    await tool(card(manager), `[data-wk-action="exclude"][data-wk-arg-player-num="${out}"]`);
    await wait(async () => /Tap again/.test(await card(manager).locator(`[data-wk-controls] [data-wk-arg-player-num="${out}"][data-wk-action="exclude"]`).innerText()), 'sit-out armed');
    assert.equal((await state()).roster.find(p => p.playerNum === out).active, true, 'one tap does not sit anyone out');
    await tool(card(manager), `[data-wk-action="exclude"][data-wk-arg-player-num="${out}"]`);
    await wait(async () => (await state()).roster.find(p => p.playerNum === out).active === false, 'sat out');
    await views(card(manager), 'card-controls-players', '[data-wk-controls] [data-wk-action="void"]', [[390, 844], [320, 568]]);
    await tool(card(manager), '[data-wk-action="void"]');
    await tool(card(manager), '[data-wk-action="void"]');
    await phase('result');
    assert.equal((await state()).round.outcome.key, 'void');
    await card(out).locator('.wk-back').waitFor({ state: 'visible' });
    if (playerCount === 4) {
      await tap(card(manager), '[data-wk-action="next"]');
      await wait(async () => /At least 4 players/.test(await card(manager).locator('[data-wk-error]').innerText()), 'too few players');
      assert.equal((await state()).phase, 'result');
      await tap(card(out), '.wk-back');
      await wait(async () => (await state()).roster.find(p => p.playerNum === out).active === true, 'back');
      await tap(card(manager), '[data-wk-action="next"]');
      await phase('choose');
      check('a four-player table cannot start a round with someone sitting out; they tap “I’m back” on their own card and it starts');
    } else {
      await tap(card(manager), '[data-wk-action="next"]');
      await phase('choose');
      s = await state();
      assert.equal(s.round.players.includes(out), false);
      await wait(async () => (await card(out).locator('.wk-ticket.is-muted').count()) === 1, 'sitting out card');
      assert.match(await card(out).innerText('body'), /sitting out/i);
      await views(card(out), 'card-sitting-out', '.wk-back', [[390, 844]]);
      await tap(card(out), '.wk-back');
      await wait(async () => (await state()).roster.find(p => p.playerNum === out).active === true, 'back');
      check('a player sits someone out (two taps) and cancels a round from their card; the other comes back with “I’m back”');
    }

    // ── next-round settings from a card ──
    const other = mode === 'werewolf' ? 'insider' : 'werewolf';
    s = await state();
    const editor = s.round.players.find(n => n !== s.round.mayor);
    await controls(card(editor));
    await card(editor).selectOption('[data-wk-controls] [data-wk-set="mode"]', other);
    await card(editor).selectOption('[data-wk-controls] [data-wk-set="questionMinutes"]', '3');
    await card(editor).selectOption('[data-wk-controls] [data-wk-set="turnSeconds"]', '20');
    await card(editor).locator('[data-wk-controls] [data-wk-set="broadHint"]').setChecked(!showHint);
    await views(card(editor), 'card-controls-settings', '[data-wk-controls] [data-wk-save-settings]', [[390, 844], [320, 568]]);
    await tap(card(editor), '[data-wk-controls] [data-wk-save-settings]');
    await wait(async () => (await state()).settings.mode === other && (await state()).settings.questionMinutes === 3 && (await state()).settings.turnSeconds === 20, 'settings saved');
    assert.match(await card(editor).locator('[data-wk-controls-note]').innerText(), /next round/);
    assert.equal((await state()).round.mode, mode, 'the current round keeps its mode');
    assert.equal((await state()).round.broadHint, showHint, 'pending clue changes do not rewrite an active round');
    assert.equal((await state()).settings.numberMax, numberMax, 'saving the player form preserves the host-only number range');
    await tool(card(editor), '[data-wk-action="void"]'); await tool(card(editor), '[data-wk-action="void"]');
    await phase('result');
    await tap(card(editor), '[data-wk-action="next"]');
    await phase('choose');
    s = await state();
    assert.equal(s.round.mode, other); assert.equal(s.round.questionMs, 180000); assert.equal(s.round.turnSeconds, 20);
    assert.equal(s.round.broadHint, !showHint); assert.equal(s.round.targetKind, targetKind);
    check('a player changes the mode and question time for the next round from their card');

    // ── the question clock runs out with no host page ──
    await tap(card(s.round.mayor), '.wk-option >> nth=0');
    await phase('countdown');
    await advance(6000);
    await phase('questions');
    await advance(180000 + 2000);
    const expected = other === 'werewolf' ? 'accuse' : 'masterGuess';
    await speakingTurns(expected, { captureTurns: true });
    assert.equal((await state()).round.endReason, 'time');
    check(`the cards end the questions when time runs out (${expected}), with no host page open`);

    // ── the host page, reopened on "another computer", follows the table ──
    await card(1).evaluate(roomCode => {
      const key = 'room-session-' + roomCode, saved = JSON.parse(localStorage.getItem(key));
      delete saved.whoKnowsControlToken; localStorage.setItem(key, JSON.stringify(saved));
    }, code);
    const session = (await state()).sessionId;
    host = await open('who-knows.html');
    await wait(async () => (await status()) === 'ready', 'host adopted');
    assert.equal(await host.evaluate(() => WHO_KNOWS_HOST.state?.sessionId), session);
    assert.equal(await host.locator('#wk-game').isVisible(), true);
    check('a host page without the saved table token finds the running game through the player links');

    // ── another game borrows a link: bring the cards back ──
    db.put(`rooms/${code}/players/${tokens[2]}`, { game: 'bombrelay', playerNum: 3, bomb: { version: 1, sessionId: 'other-game' } }); deliver();
    await wait(async () => (await status()) === 'switched', 'switched');
    await host.locator('#wk-continue').waitFor({ state: 'visible' });
    await views(host, 'host-switched', '#wk-continue', [[1280, 800], [390, 844]]);
    await host.click('#wk-continue');
    await wait(async () => (await status()) === 'ready', 'continued');
    assert.equal((await state()).sessionId, session);
    await allCards(wk => wk.sessionId === session);
    check('when another game borrows a link, the host page brings every card back to the same game');
    await host.close(); host = null;

    // ── end the game from a card, then start a new one from a card ──
    await tool(card(2), '[data-wk-action="stop"]'); await tool(card(2), '[data-wk-action="stop"]');
    await phase('finished');
    await wait(async () => (await card(1).locator('.wk-rank').count()) === playerCount, 'standings');
    await views(card(1), 'card-finished', '[data-wk-main] [data-wk-action="restart"]', [[390, 844], [320, 568]]);
    await tap(card(1), '[data-wk-main] [data-wk-action="restart"]');
    await phase('choose');
    s = await state();
    assert.equal(s.roundNo, 1); assert.deepEqual(s.scores, {});
    check('a player ends the game from Table controls and another starts a new game from the final standings');

    host = await open('who-knows.html');
    await wait(async () => (await status()) === 'ready', 'host final');
    await host.click('#wk-manage-open');
    await host.click('#wk-stop'); await host.click('#wk-stop');
    await phase('finished');
    await wait(async () => (await host.locator('.wk-rank').count()) === playerCount, 'host standings');
    await views(host, 'host-finished', '#wk-again', HOSTS);
    check('the optional host page still has its own controls when it is open');

    assert.deepEqual(errors, []);
    for (const url of blocked) assert.match(url, /gstatic\.com\/firebasejs/, 'only the Firebase SDK is intercepted: ' + url);
    report.blocked = [...blocked];
    report.errors = errors;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`WHO KNOWS browser QA (${mode}, ${playerCount} players): ${report.checks.length} checks, ${report.views.length} captures, 0 page errors → ${output}`);
  } catch (error) {
    report.failure = String(error.stack || error);
    report.errors = errors;
    const failedState = await state();
    report.failureContext = { phase: failedState?.phase, stage: failedState?.stage, deadline: failedState?.deadline,
      now: epoch + offset, offset, presence: clone(presence()) };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    try { await host?.screenshot({ path: path.join(output, 'failure-host.png'), fullPage: true }); } catch (_) {}
    console.error(error); console.error('page errors:', JSON.stringify(errors, null, 1));
    process.exitCode = 1;
  } finally {
    await browser.close(); server.close();
  }
})();
