'use strict';
// Run: node tests/bomb-relay-ui.browser.cjs [path-to-playwright-package]
// Set BOMB_QA_PLAYERS=3, 6 or 8 and distinct BOMB_QA_OUTPUT directories for
// participant-scaling regression runs. BOMB_QA_LAYOUT=0 skips captures only.
// Serves the REAL host/player pages against one isolated Firebase-compatible
// in-memory authority. All external requests are intercepted; no live room is touched.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.BOMB_QA_OUTPUT || path.join(root, '..', 'bomb-browser-qa'));
const playerCount = Number(process.env.BOMB_QA_PLAYERS || 4);
assert.ok(Number.isInteger(playerCount) && playerCount >= 3 && playerCount <= 9, 'BOMB_QA_PLAYERS must be 3–9');
const code = 'BOMB_BROWSER_QA_' + playerCount;
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
function observeAudio() {
  window.__qaBufferCues = [];
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  const original = Audio.prototype.createBufferSource;
  Audio.prototype.createBufferSource = function () {
    const source = original.call(this), start = source.start.bind(source), connect = source.connect.bind(source);
    let output;
    source.connect = target => { output = target; return connect(target); };
    source.start = (...args) => {
      const actual = source.buffer.getChannelData(0), kind = actual.length < this.sampleRate * .1 ? 'tick' : 'boom';
      const expected = BOMB_RELAY_AUDIO.getSamples(kind, this.sampleRate);
      window.__qaBufferCues.push({ kind, duration: source.buffer.duration, gain: output.gain.value,
        state: this.state, exactPCM: actual.length === expected.length && actual.every((value, index) => value === expected[index]) });
      return start(...args);
    };
    return source;
  };
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const db = makeDatabase(), pages = new Set(), errors = [], blockedRequests = new Set(), epoch = Date.now();
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let delivery = Promise.resolve();
  const deliver = () => {
    const tree = db.dump();
    delivery = delivery.then(() => Promise.all([...pages].map(page => page.isClosed() ? null : page.evaluate(tree => window.__qaDeliver?.(tree), tree).catch(() => {}))));
  };
  await context.exposeBinding('__qaFirebase', (_source, request) => {
    const result = db.request(request);
    if (result.committed) setTimeout(deliver, 0);
    return result;
  });
  await context.addInitScript(installFirebase, { code, tokens, names, epoch });
  await context.addInitScript(observeAudio);
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    blockedRequests.add(url);
    return route.fulfill({ status: 200, contentType: url.includes('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const page = async url => {
    const item = await context.newPage(); pages.add(item);
    item.on('pageerror', error => errors.push({ url: item.url(), message: error.message }));
    item.on('close', () => pages.delete(item));
    await item.goto(base + '/' + url);
    await item.evaluate(() => {
      window.__qaSoundEvents = [];
      for (const method of ['tick', 'pass', 'bounce', 'boom']) {
        const original = BOMB_RELAY_UI.Sound.prototype[method];
        BOMB_RELAY_UI.Sound.prototype[method] = function (...arguments_) {
          window.__qaSoundEvents.push(method); return original.apply(this, arguments_);
        };
      }
    });
    return item;
  };
  let host;
  const report = { entry: `bomb-relay.html + ${playerCount} original play.html links`, playerCount, catalogSize: DECK.items.length,
    fixture: 'isolated Firebase-compatible memory database; controlled clock via serverTimeOffset; external network intercepted; desktop Chromium emulates viewport sizes, not physical phones', checks: [], views: [], roundFuses: [] };
  const check = label => { report.checks.push(label); if (process.env.BOMB_QA_VERBOSE) console.log('PASS ' + label); };
  const wait = async predicate => {
    for (let i = 0; i < 240; i++) { await delivery; if (await predicate()) return; await pause(25); }
    throw new Error('Browser state did not settle');
  };
  const state = () => host.evaluate(() => structuredClone(BOMB_RELAY_HOST.state));
  const promptId = value => value.promptId || value.cardId || value.order?.[value.cardIndex];
  const cards = () => Promise.all(players.map(page => page.evaluate(() => structuredClone(__qaReceived))));
  const setTime = async at => {
    db.put('.info/serverTimeOffset', at - epoch); deliver(); await delivery;
  };
  const samePrompt = async () => {
    const canonical = await state();
    assert.ok(DECK.get(promptId(canonical)) && /^tb-(everyday|playful)-\d{3}$/.test(promptId(canonical)), 'live entry must use the authoritative expanded catalog');
    assert.equal(DECK.isEligible(DECK.get(promptId(canonical))), true, 'deferred cards never re-enter actual draws');
    await wait(async () => (await cards()).every(projection => promptId(projection?.bomb || {}) === promptId(canonical)));
    const projections = await cards();
    for (const projection of projections) {
      assert.equal(promptId(projection.bomb), promptId(canonical));
      for (const hidden of ['roundFuse', 'roundId', 'explodeAt', 'remainingMs', 'litAt', 'durationMs', 'startedAtMs', 'explodeAtMs', 'discussionUntil']) assert.equal(Object.hasOwn(projection.bomb, hidden), false, hidden + ' stays private');
    }
    for (const page of [host, ...players]) {
      await page.locator('.br-scene-title[data-br-prompt-id]').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.br-scene-title[data-br-prompt-id]').getAttribute('data-br-prompt-id'), promptId(canonical));
    }
    return canonical;
  };
  const verifyFuse = (canonical, count, speedMode, scaleWithPlayers) => {
    const snapshot = canonical.roundFuse, base = { fast: [30000, 60000], normal: [30000, 90000], chill: [30000, 120000] }[speedMode];
    const added = scaleWithPlayers ? Math.max(0, Math.min(count, 8) - 3) * 7000 : 0;
    assert.equal(snapshot.activePlayerCountAtStart, count);
    assert.equal(snapshot.speedModeAtStart, speedMode); assert.equal(snapshot.scaleWithPlayersAtStart, scaleWithPlayers);
    assert.equal(snapshot.minMsAtStart, (canonical.settingsTiming.baseMinSeconds ?? base[0] / 1000) * 1000); assert.equal(snapshot.maxMsAtStart, (canonical.settingsTiming.baseMaxSeconds ? canonical.settingsTiming.baseMaxSeconds * 1000 : base[1]) + added);
    assert.ok(snapshot.durationMs >= snapshot.minMsAtStart && snapshot.durationMs <= snapshot.maxMsAtStart);
    assert.equal(snapshot.durationMs, snapshot.explodeAtMs - snapshot.startedAtMs);
    assert.equal(canonical.roundId, snapshot.roundId); assert.equal(canonical.explodeAt, snapshot.explodeAtMs);
    report.roundFuses.push(clone(snapshot));
  };
  const manageTiming = async (speedMode, scaleWithPlayers, baseMaxSeconds, baseMinSeconds) => {
    await host.click('#br-manage-open');
    await host.selectOption('#br-manage-speed', speedMode);
    await wait(async () => (await state()).settingsTiming.speedMode === speedMode);
    await host.locator('#br-manage-scale:not([disabled])').waitFor();
    await host.locator('#br-manage-scale').setChecked(scaleWithPlayers);
    await wait(async () => (await state()).settingsTiming.scaleWithPlayers === scaleWithPlayers);
    if (baseMinSeconds !== undefined) {
      await host.locator('#br-manage-min:not([disabled])').waitFor();
      await host.fill('#br-manage-min', baseMinSeconds === null ? '' : String(baseMinSeconds));
      await host.locator('#br-manage-min').blur();
      await wait(async () => (await state()).settingsTiming.baseMinSeconds === (baseMinSeconds ?? undefined));
    }
    if (baseMaxSeconds !== undefined) {
      await host.locator('#br-manage-max:not([disabled])').waitFor();
      await host.fill('#br-manage-max', baseMaxSeconds === null ? '' : String(baseMaxSeconds));
      await host.locator('#br-manage-max').blur();
      await wait(async () => (await state()).settingsTiming.baseMaxSeconds === (baseMaxSeconds ?? undefined));
    }
    await host.locator('#br-manage .br-dialog-header button').click();
  };
  const layout = async (item, label, selector, width, lang, height = 900, requireTogether = true) => {
    if (process.env.BOMB_QA_LAYOUT === '0') return;
    await item.setViewportSize({ width, height });
    await item.evaluate(language => I18N.setLang(language), lang);
    await item.evaluate(() => window.scrollTo(0, 0));
    const metrics = await item.evaluate(selector => {
      const prompt = document.querySelector('.br-scene-title[data-br-prompt-id]') || document.querySelector('.br-prompt-card') || document.querySelector('.br-scene-title');
      const button = document.querySelector(selector);
      const box = element => { const rect = element?.getBoundingClientRect(); return rect && { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      const rect = prompt?.getBoundingClientRect();
      const promptOccluded = rect && [0.25, 0.5, 0.9].some(portion => {
        const x = Math.floor(rect.x + rect.width / 2), y = Math.floor(rect.y + rect.height * portion);
        return y >= 0 && y < innerHeight && !prompt.contains(document.elementFromPoint(x, y));
      });
      return { width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, prompt: box(prompt), button: box(button), promptText: prompt?.innerText || '', promptOccluded };
    }, selector);
    const file = label + '-' + width + (height === 900 ? '' : 'x' + height) + '-' + lang + '.png';
    await item.screenshot({ path: path.join(output, file), fullPage: true });
    const capture = { label, width, height, lang, ...metrics, togetherInViewport: !!metrics.button && metrics.button.y >= 0 && metrics.button.bottom <= height && metrics.prompt.y >= 0 && metrics.prompt.bottom <= height, screenshot: file };
    report.views.push(capture);
    assert.ok(metrics.prompt && metrics.prompt.width > 0, label + ' prompt visible');
    assert.ok(metrics.overflow <= 1, label + ' has no horizontal overflow: ' + metrics.overflow);
    assert.equal(metrics.promptOccluded, false, label + ' prompt is not covered by controls');
    if (selector) {
      assert.ok(metrics.button?.width >= 44 && metrics.button.height >= 44, label + ' action tap target >= 44px');
      if (requireTogether) {
        assert.ok(metrics.button.y >= 0 && metrics.button.bottom <= height, label + ' action in first viewport');
        assert.ok(metrics.prompt.y >= 0 && metrics.prompt.bottom <= height, label + ' prompt in first viewport');
      } else {
        // The shared host can have a longer roster than a phone card. Verify
        // ordinary scrolling exposes the full prompt and a usable action,
        // rather than treating all below-fold content as an overlap failure.
        await item.locator('.br-scene-title[data-br-prompt-id]').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
        capture.scrolledPrompt = await item.locator('.br-scene-title[data-br-prompt-id]').evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, occluded: [.25, .5, .9].some(part => {
            const hit = document.elementFromPoint(Math.floor(rect.x + rect.width / 2), Math.floor(rect.y + rect.height * part));
            return !element.contains(hit);
          }) };
        });
        assert.ok(capture.scrolledPrompt.top >= -1 && capture.scrolledPrompt.bottom <= height + 1, label + ' complete prompt reachable by ordinary scroll');
        assert.equal(capture.scrolledPrompt.occluded, false, label + ' scrolled prompt not covered');
        await item.locator(selector).evaluate(element => element.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
        capture.scrolledAction = await item.locator(selector).evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, clickable: element.contains(document.elementFromPoint(Math.floor(rect.x + rect.width / 2), Math.floor(rect.y + rect.height / 2))) };
        });
        assert.ok(capture.scrolledAction.top >= 0 && capture.scrolledAction.bottom <= height + 1, label + ' action reachable by ordinary scroll');
        assert.equal(capture.scrolledAction.clickable, true, label + ' scrolled action not covered');
        await item.locator(selector).click({ trial: true });
      }
    }
    return metrics;
  };
  const surface = async (item, label, width, height, lang, focus = null) => {
    if (process.env.BOMB_QA_LAYOUT === '0') return;
    await item.setViewportSize({ width, height });
    await item.evaluate(language => I18N.setLang(language), lang);
    await item.evaluate(() => window.scrollTo(0, 0));
    if (focus) await item.locator(focus).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const metrics = await item.evaluate(label => {
      const selectors = ['body', '.br-panel', '.br-stage', '.br-scene-title', '.br-scene-title h2', '.br-zh', '.br-button.br-primary', '.br-pass', '.br-who', '.br-seat-name', '.br-seat.is-holder', '.br-rank-name', '.br-library-card', '.br-dialog', '.name-banner', '.br-zone-hot'];
      const resultsOccluded = /results/.test(label) && [...document.querySelectorAll('.br-rank')].some(rank => {
        const rect = rank.getBoundingClientRect();
        return [0.25, 0.5, 0.9].some(portion => {
          // Chromium rounds fractional hit-test coordinates at the viewport
          // edge (799.94 can become 800 and return null). Probe real pixels.
          const x = Math.floor(rect.x + rect.width / 2), y = Math.floor(rect.y + rect.height * portion);
          return y >= 0 && y < innerHeight && !rank.contains(document.elementFromPoint(x, y));
        });
      });
      return { overflow: document.documentElement.scrollWidth - innerWidth, resultsOccluded,
        seatNameColors: [...document.querySelectorAll('.br-seat-name')].map(element => getComputedStyle(element).color),
        rankNameColors: [...document.querySelectorAll('.br-rank-name')].map(element => getComputedStyle(element).color),
        bannerInline: document.querySelector('.br-card .name-banner')?.getAttribute('style') || null,
        styles: Object.fromEntries(selectors.flatMap(selector => {
        const element = document.querySelector(selector);
        if (!element || !element.getClientRects().length) return [];
        const style = getComputedStyle(element);
        return [[selector, { color: style.color, background: style.backgroundColor, border: style.borderColor, shadow: style.boxShadow, font: style.fontFamily, fontWeight: style.fontWeight }]];
      })) };
    }, label);
    const file = `${label}-${width}x${height}-${lang}.png`;
    await item.screenshot({ path: path.join(output, file), fullPage: !focus });
    report.views.push({ label, width, height, lang, ...metrics, screenshot: file });
    assert.ok(metrics.overflow <= 1, label + ' has no horizontal overflow');
    assert.equal(metrics.resultsOccluded, false, label + ' standings are not covered by controls');
    return metrics;
  };
  let players = [];
  try {
    host = await page('bomb-relay.html');
    if (process.env.BOMB_QA_TRACE) await host.evaluate(() => {
      window.__qaTimingTrace = [];
      const note = (kind, value, stack = '') => {
        window.__qaTimingTrace.push({ at: performance.now(), kind, value, stack,
          disabled: document.querySelector('#br-manage-scale').disabled,
          canonical: BOMB_RELAY_HOST.state?.settingsTiming });
        if (window.__qaTimingTrace.length > 100) window.__qaTimingTrace.shift();
      };
      const element = document.querySelector('#br-manage-scale');
      const checked = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
      Object.defineProperty(element, 'checked', { get() { return checked.get.call(this); },
        set(value) { note('checked-setter', value, new Error().stack); return checked.set.call(this, value); } });
      for (const kind of ['pointerdown', 'mousedown', 'click', 'input', 'change']) document.addEventListener(kind, event => {
        if (event.target === element) note('native-' + kind, element.checked);
      }, true);
    });
    players = await Promise.all(tokens.map(token => page('play.html?s=' + code + '&p=' + token)));
    await host.waitForFunction(() => !document.querySelector('#br-start').disabled);
    for (const [width, height] of [[1280, 800], [375, 740], [320, 568]]) for (const lang of ['en', 'zh']) await surface(host, 'host-setup', width, height, lang);
    await host.locator('#br-library > summary').click();
    await host.waitForFunction(count => document.querySelectorAll('.br-library-card').length === count, DECK.pool('mixed').length);
    for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) await surface(host, 'host-library', width, height, lang, '#br-library');
    await host.locator('#br-library > summary').click();
    assert.deepEqual(await host.locator('#br-category option').evaluateAll(options => options.map(option => option.value)), ['mixed', 'everyday', 'playful']);
    assert.equal(await host.inputValue('#br-category'), 'mixed');
    assert.deepEqual(await host.locator('#br-fuse option').evaluateAll(options => options.map(option => option.value)), ['fast', 'normal', 'chill']);
    assert.equal(await host.inputValue('#br-fuse'), 'normal'); assert.equal(await host.isChecked('#br-scale'), true);
    const added = Math.max(0, Math.min(playerCount, 8) - 3) * 7;
    assert.match(await host.locator('#br-timing-range').innerText(), new RegExp(`30–${90 + added}`));
    assert.equal(DECK.items.length, 720); assert.equal(DECK.pool('mixed').length, 700);
    assert.equal(await host.locator('#br-max').inputValue(), '');
    assert.equal(await host.locator('#br-min').inputValue(), '');
    await host.selectOption('#br-fuse', 'fast'); await host.fill('#br-min', '20'); await host.locator('#br-min').blur();
    await host.fill('#br-max', '45'); await host.locator('#br-max').blur();
    assert.match(await host.locator('#br-timing-range').innerText(), new RegExp(`20–${45 + added}`));
    await host.locator('#br-scale').setChecked(false);
    assert.equal(await host.locator('#br-max').inputValue(), '45');
    assert.equal(await host.locator('#br-min').inputValue(), '20');
    assert.match(await host.locator('#br-timing-range').innerText(), /20–45/);
    await host.selectOption('#br-fuse', 'normal');
    assert.equal(await host.locator('#br-max').inputValue(), '', 'changing mode returns to its automatic upper bound');
    assert.equal(await host.locator('#br-min').inputValue(), '', 'changing mode returns to its automatic lower bound');
    await host.locator('#br-scale').setChecked(true);
    await host.selectOption('#br-cards', '5');
    await host.click('#br-start');
    await wait(async () => (await state())?.phase === 'ready' && (await cards()).every(card => card?.bomb?.phase === 'ready'));
    let current = await samePrompt();
    assert.equal(current.explodeAt, null); assert.equal(current.roundFuse, null);
    assert.deepEqual(current.settingsTiming, { speedMode: 'normal', scaleWithPlayers: true });
    for (const item of [host, ...players]) assert.match(await item.locator('[data-br-ready-range]').innerText(), new RegExp(`30–${90 + added}`));
    check('real entry retains 720 lookups and 700 eligible prompts, shows actual participant-adjusted ranges, rescales custom host bounds, and keeps Ready untimed');
    const readyTurn = current.turnId, readyPrompt = promptId(current);
    await manageTiming('normal', true, 75, 35);
    for (const item of [host, ...players]) await wait(async () => (await item.locator('[data-br-ready-range]').innerText()).includes(`35–${75 + added}`));
    assert.equal((await state()).turnId, readyTurn); assert.equal(promptId(await state()), readyPrompt);
    assert.equal((await state()).explodeAt, null);
    await manageTiming('normal', true, null, null);
    for (const item of [host, ...players]) await wait(async () => (await item.locator('[data-br-ready-range]').innerText()).includes(`30–${90 + added}`));
    check('pending custom-bound changes immediately update every Ready page without drawing a prompt, starting a fuse or requiring a new turn');
    for (const width of [1280, 375, 320]) for (const lang of ['en', 'zh']) await layout(host, 'host-ready', '#br-light', width, lang);
    const starter = players[current.holder - 1];
    for (const width of [375, 320]) for (const lang of ['en', 'zh']) await layout(starter, 'player-ready', '[data-br-action="light"]', width, lang);
    const reroll = host.locator('#br-reroll');
    if (await reroll.count()) {
      const old = promptId(current);
      await reroll.click();
      await wait(async () => promptId(await state()) !== old);
      current = await samePrompt(); assert.equal(current.phase, 'ready'); assert.equal(current.explodeAt, null);
      check('host reroll consumes a fresh prompt only during ready preview');
    }
    await starter.locator('[data-br-action="light"]').click();
    await wait(async () => (await state()).phase === 'ticking' && (await cards()).every(card => card.bomb.phase === 'ticking'));
    current = await samePrompt();
    const id = promptId(current), fuse = current.explodeAt, holder = current.holder;
    verifyFuse(current, playerCount, 'normal', true);
    const firstSnapshot = clone(current.roundFuse), firstTurn = current.turnId;
    await manageTiming('fast', false, 45, 20);
    current = await samePrompt(); assert.equal(current.turnId, firstTurn);
    assert.equal(current.explodeAt, fuse); assert.deepEqual(current.roundFuse, firstSnapshot);
    const excluded = Array.from({ length: playerCount }, (_, index) => index + 1).find(number => number !== holder);
    await host.evaluate(playerNum => BOMB_RELAY_HOST.command('exclude', { playerNum, active: false }), excluded);
    await wait(async () => (await state()).roster.find(seat => seat.playerNum === excluded)?.active === false);
    current = await samePrompt(); assert.equal(current.explodeAt, fuse); assert.deepEqual(current.roundFuse, firstSnapshot);
    assert.equal(await host.locator('[data-br-ready-range]').count(), 0);
    for (const item of players) assert.equal(await item.locator('[data-br-ready-range]').count(), 0);
    check('real in-round pace/scaling/custom-bound controls and participation exclusion update next-GO preferences without resampling the current snapshot or deadline');
    for (const width of [1280, 375, 320]) for (const lang of ['en', 'zh']) await layout(host, 'host-ticking', '#br-pass', width, lang);
    for (const width of [375, 320]) for (const lang of ['en', 'zh']) await layout(players[holder - 1], 'player-ticking', '[data-br-action="pass"]', width, lang);
    assert.equal((await state()).explodeAt, fuse); assert.equal(promptId(await state()), id);
    if (process.env.BOMB_QA_LAYOUT !== '0') check('EN/ZH switching preserves prompt ID and deadline, desktop/320/375 layouts have readable prompt and usable controls');
    if (await reroll.count()) assert.equal(await reroll.isVisible(), false);
    assert.equal(await players[holder - 1].locator('input:not([type=hidden]),textarea').count(), 0, 'no answer input required');
    assert.equal(await players[holder - 1].locator('[role=progressbar],progress').count(), 0, 'no precise fuse progress');
    await players[holder - 1].locator('[data-br-action="pass"]').click({ force: true }); // existing hot-card animation deliberately moves the tap target
    await wait(async () => (await state()).holder !== holder);
    current = await samePrompt(); assert.equal(current.explodeAt, fuse); assert.equal(promptId(current), id);
    const nextHolder = current.holder;
    assert.equal(await players[holder - 1].locator('[data-br-action="pass"]').count(), 0);
    check('player pass works without typed/recognized answer, unchanged prompt/fuse, original clockwise holder rules');
    const challenger = current.roster.find(seat => seat.active !== false && seat.playerNum !== holder && seat.playerNum !== nextHolder)?.playerNum || nextHolder;
    const bounce = players[challenger - 1].locator('[data-br-action="bounce"]');
    if (await bounce.count()) {
      await bounce.click({ force: true }); await wait(async () => (await state()).holder === holder);
      current = await samePrompt(); assert.equal(current.explodeAt, fuse); assert.equal(promptId(current), id);
      check('existing optional player challenge returns bomb with unchanged prompt/fuse');
      await players[holder - 1].locator('[data-br-action="pass"]').click({ force: true }); await wait(async () => (await state()).holder === nextHolder);
    }
    await host.evaluate(() => BOMB_RELAY_HOST.command('pause'));
    await wait(async () => (await state()).phase === 'paused' && (await cards()).every(card => card.bomb.phase === 'paused'));
    for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) {
      await surface(host, 'host-paused', width, height, lang);
      await surface(players[nextHolder - 1], 'player-paused', Math.min(width, 375), height, lang);
    }
    await host.evaluate(() => BOMB_RELAY_HOST.command('resume'));
    await wait(async () => (await state()).phase === 'ticking');
    assert.equal((await state()).explodeAt, fuse);
    const beforeReload = await state();
    report.soundEvents = await host.evaluate(() => __qaSoundEvents);
    report.bufferCues = await host.evaluate(() => __qaBufferCues);
    await host.reload();
    await host.evaluate(() => {
      window.__qaSoundEvents = [];
      for (const method of ['tick', 'pass', 'bounce', 'boom']) {
        const original = BOMB_RELAY_UI.Sound.prototype[method];
        BOMB_RELAY_UI.Sound.prototype[method] = function (...arguments_) {
          window.__qaSoundEvents.push(method); return original.apply(this, arguments_);
        };
      }
    });
    await setTime(epoch + 15000); // the departed tab's 14s authority lease expires
    await wait(async () => (await state())?.sessionId === beforeReload.sessionId && !await host.locator('#br-pass').isDisabled());
    current = await samePrompt(); assert.equal(current.explodeAt, fuse); assert.equal(promptId(current), id);
    assert.deepEqual(current.promptHistory, beforeReload.promptHistory);
    assert.deepEqual(current.roundFuse, beforeReload.roundFuse); assert.deepEqual(current.settingsTiming, beforeReload.settingsTiming);
    assert.equal(current.settingsTiming.baseMaxSeconds, 45);
    assert.equal(current.settingsTiming.baseMinSeconds, 20);
    check('host reload and expired authority lease reclaim the same session, prompt/deadline/history, frozen fuse and pending settings');
    await players[nextHolder - 1].reload();
    await wait(async () => (await cards())[nextHolder - 1]?.bomb?.phase === 'ticking');
    await samePrompt(); check('player reload resumes the same prompt and holder');
    let loser;
    for (let round = 0; round < 5; round++) {
      current = await state();
      if (current.phase === 'ready') {
        assert.equal(current.roundFuse, null); assert.equal(current.explodeAt, null);
        // Large deliberate server-clock jumps also expire the normal 14 s
        // host lease. Let its existing renew loop reacquire before a human
        // button click; a rejected click is not automatically replayed.
        const controlPath = await host.evaluate(() => 'rooms/' + ROOM.code + '/players/' + ROOM.getExtra('bombRelayControlToken'));
        await wait(() => db.get(controlPath)?.leaseUntil > epoch + (db.get('.info/serverTimeOffset') || 0));
        await host.click('#br-light'); await wait(async () => (await state()).phase === 'ticking'); current = await state();
        if (round === 1) {
          verifyFuse(current, playerCount - 1, 'fast', false);
          const saved = clone(current.roundFuse), deadline = current.explodeAt;
          await host.evaluate(playerNum => BOMB_RELAY_HOST.command('exclude', { playerNum, active: true }), excluded);
          await wait(async () => (await state()).roster.find(seat => seat.playerNum === excluded)?.active === true);
          await manageTiming('chill', true);
          current = await samePrompt(); assert.deepEqual(current.roundFuse, saved); assert.equal(current.explodeAt, deadline);
        } else if (round >= 2) verifyFuse(current, playerCount, 'chill', true);
      }
      loser = current.holder; const deadline = current.explodeAt;
      await setTime(deadline);
      await wait(async () => (await state()).phase === 'boom' && (await cards()).every(card => card.bomb.phase === 'boom'));
      current = await samePrompt(); assert.equal(current.boom.loser, loser);
      for (const card of await cards()) assert.equal(card.bomb.boom.loser, loser);
      assert.equal(await host.locator('.br-burst').count(), 1);
      assert.ok(await players[loser - 1].locator('.is-boom').count());
      if (round === 0) for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) {
        await surface(host, 'host-boom', width, height, lang);
        await surface(players[loser - 1], 'player-boom', Math.min(width, 375), height, lang);
      }
      const settled = clone(current), originalPrompt = promptId(current), score = JSON.stringify(current.penalties);
      assert.equal(settled.discussionUntil, settled.phaseUntil + 45000);
      if (round === 0) {
        await setTime(settled.phaseUntil - 1); await pause(150); await delivery;
        assert.equal((await state()).phase, 'boom', 'the original explosion hold remains 4.5 seconds');
        await setTime(settled.phaseUntil);
        await wait(async () => (await state()).phase === 'discussion' && (await cards()).every(card => card.bomb.phase === 'discussion'));
        current = await samePrompt();
        assert.equal(promptId(current), originalPrompt); assert.equal(current.phaseUntil, settled.discussionUntil);
        assert.deepEqual(current.boom, settled.boom); assert.deepEqual(current.promptHistory, settled.promptHistory);
        assert.deepEqual(current.history, settled.history); assert.equal(JSON.stringify(current.penalties), score);
        assert.equal(await host.locator('.br-phase-discussion.br-static').count(), 1);
        assert.equal(await host.locator('.br-exploding,[role="timer"],progress,[role="progressbar"]').count(), 0);
        assert.equal(await host.locator('#br-next').isVisible(), true);
        for (const [index, player] of players.entries()) {
          const eligible = current.roster.find(seat => seat.playerNum === index + 1)?.active !== false;
          assert.equal(await player.locator('[data-br-action="next"]').count(), eligible ? 1 : 0);
          assert.equal(await player.locator('[data-br-action="light"],[data-br-action="pass"],[role="timer"],progress').count(), 0);
        }
        for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) await layout(host, 'host-discussion', '#br-next', width, lang, height, false);
        for (const [width, height] of [[375, 740], [320, 568]]) for (const lang of ['en', 'zh']) await layout(players[loser - 1], 'player-discussion', '[data-br-action="next"]', width, lang, height, false);
        await players[loser - 1].reload();
        await wait(async () => (await cards())[loser - 1]?.bomb?.phase === 'discussion');
        await samePrompt();
        assert.equal((await state()).phaseUntil, settled.discussionUntil, 'reconnecting a player cannot restart discussion');
        await setTime(settled.discussionUntil - 1); await pause(150); await delivery;
        assert.equal((await state()).phase, 'discussion'); assert.equal(promptId(await state()), originalPrompt);
        assert.equal(JSON.stringify((await state()).penalties), score);
        await setTime(settled.discussionUntil);
        await wait(async () => (await state()).phase === 'ready' && (await cards()).every(card => card.bomb.phase === 'ready'));
        current = await samePrompt();
        assert.notEqual(promptId(current), originalPrompt); assert.equal(current.cardIndex, settled.cardIndex + 1);
        assert.equal(current.explodeAt, null); assert.equal(current.roundFuse, null); assert.equal(current.phaseUntil, null);
        for (const item of [host, ...players]) assert.match(await item.locator('[data-br-ready-range]').innerText(), /20–45/);
        const preview = clone(current);
        await setTime(settled.discussionUntil + 60000); await pause(150); await delivery;
        current = await samePrompt();
        assert.equal(current.phase, 'ready'); assert.equal(current.turnId, preview.turnId);
        assert.equal(promptId(current), promptId(preview)); assert.equal(current.explodeAt, null);
        assert.equal(JSON.stringify(current.penalties), score);
        check('4.5-second explosion is followed by one full 45-second synchronized discussion with the original prompt/result, quiet mobile UI and reconnect-safe deadline; expiry reveals exactly one untimed preview and never auto-starts');
      } else if (round === 1) {
        await players[loser - 1].locator('[data-br-action="next"]').click();
        await wait(async () => (await state()).phase === 'ready');
        const advanced = await samePrompt();
        await setTime(settled.discussionUntil + 1); await pause(150); await delivery;
        current = await samePrompt();
        assert.equal(current.turnId, advanced.turnId); assert.equal(current.cardIndex, settled.cardIndex + 1);
        assert.equal(current.phase, 'ready'); assert.equal(current.explodeAt, null);
        assert.equal(JSON.stringify(current.penalties), score);
        check('an active player can use the existing Next action during BOOM; the cancelled old discussion deadline cannot skip the new preview');
      } else if (round === 2) {
        await setTime(settled.phaseUntil);
        await wait(async () => (await state()).phase === 'discussion' && (await cards()).every(card => card.bomb.phase === 'discussion'));
        await host.click('#br-next');
        await wait(async () => (await state()).phase === 'ready');
        const advanced = await samePrompt();
        await setTime(settled.discussionUntil + 1); await pause(150); await delivery;
        current = await samePrompt();
        assert.equal(current.turnId, advanced.turnId); assert.equal(current.cardIndex, settled.cardIndex + 1);
        assert.equal(current.phase, 'ready'); assert.equal(current.explodeAt, null);
        assert.equal(JSON.stringify(current.penalties), score);
        check('the host can use the same Next action during discussion without waiting 45 seconds; the invalidated deadline cannot advance again');
      } else if (round === 4) {
        await setTime(settled.phaseUntil);
        await wait(async () => (await state()).phase === 'discussion');
        assert.equal(promptId(await samePrompt()), originalPrompt);
        await setTime(settled.discussionUntil - 1); await pause(150); await delivery;
        assert.equal((await state()).phase, 'discussion', 'the final prompt also gets the full discussion');
        await setTime(settled.discussionUntil);
      } else await host.click('#br-next');
      await wait(async () => ['ready', 'finished'].includes((await state()).phase));
    }
    current = await state(); assert.equal(current.phase, 'finished');
    for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) {
      await surface(host, 'host-results', width, height, lang);
      await surface(players[loser - 1], 'player-results', Math.min(width, 375), height, lang);
    }
    assert.equal(Object.values(current.penalties).flat().length, 5);
    check('five speech-only rounds complete with synchronized explosion loser, animation classes and exactly five penalty cards');
    check('subsequent GO uses eligible player count, Fast scaling-off and Chill scaling-on; exact deadline expires once and rejoining never changes the active fuse');
    report.soundEvents.push(...await host.evaluate(() => __qaSoundEvents));
    for (const event of ['tick', 'pass', 'bounce', 'boom']) assert.ok(report.soundEvents.includes(event), 'existing ' + event + ' sound cue invoked');
    check('approved tick/boom and original pass/bounce sound paths invoked (audible speaker output requires human testing)');
    report.bufferCues.push(...await host.evaluate(() => __qaBufferCues));
    for (const kind of ['tick', 'boom']) assert.ok(report.bufferCues.some(cue => cue.kind === kind), kind + ' audio played through the real host');
    assert.ok(report.bufferCues.every(cue => cue.exactPCM && cue.state === 'running' && cue.gain === Math.fround(.6)));
    check('real host AudioContext plays the approved recorded tick and bass-reduced boom at the demo gain with exact PCM');
    assert.equal(await host.locator('#br-again').isVisible(), true);
    const history = clone(current.promptHistory);
    await host.click('#br-again'); await wait(async () => (await state()).phase === 'ready');
    current = await samePrompt();
    if (history?.seenIds) for (const seen of history.seenIds) assert.ok(current.promptHistory.seenIds.includes(seen));
    check('ordinary Play again starts new scores while preserving the activity prompt history');
    await host.click('#br-manage-open');
    for (const [width, height] of [[1280, 800], [375, 740]]) for (const lang of ['en', 'zh']) await surface(host, 'host-controls', width, height, lang);
    await host.locator('#br-manage .br-dialog-header button').click();
    for (const pack of ['everyday', 'playful']) {
      await host.click('#br-manage-open'); await host.click('#br-stop'); await wait(async () => (await state()).phase === 'finished');
      await host.click('#br-settings'); await host.selectOption('#br-category', pack); await host.click('#br-start');
      await wait(async () => (await state()).phase === 'ready' && (await state()).category === pack);
      current = await samePrompt(); assert.ok(promptId(current).startsWith('tb-' + pack + '-'));
    }
    check('both explicit packs select matching prompt IDs through the real settings/start flow');
    if (process.env.BOMB_QA_LAYOUT !== '0') {
      await Promise.all(players.map(player => player.reload()));
      // Deterministic visual stress fixture: edit ONLY the isolated authority's
      // ready prompt to the real catalog's longest English prompt, then let the
      // unchanged sync project it to the real player pages and light normally.
      const longest = await host.evaluate(() => BOMB_RELAY_DECK.pool('mixed').slice().sort((a, b) => b.en.length - a.en.length)[0].id);
      const control = await host.evaluate(() => 'rooms/' + ROOM.code + '/players/' + ROOM.getExtra('bombRelayControlToken'));
      const document_ = db.get(control), canonical = JSON.parse(document_.stateJson);
      canonical.order[canonical.cardIndex] = longest;
      const longestPrompt = DECK.get(longest);
      canonical.promptSnapshot = { id: longestPrompt.id, pack: longestPrompt.pack, family: longestPrompt.family, en: longestPrompt.en, zhHant: longestPrompt.zhHant };
      canonical.turnId++; // same rendering fence used by a real ready-phase reroll
      if (!canonical.promptHistory.seenIds.includes(longest)) canonical.promptHistory.seenIds.push(longest);
      db.put(control, { ...document_, stateJson: JSON.stringify(canonical), revision: document_.revision + 1 }); deliver(); await delivery;
      await wait(async () => promptId(await state()) === longest); await samePrompt();
      await host.click('#br-light'); await wait(async () => (await state()).phase === 'ticking');
      const holding = (await state()).holder, phone = players[holding - 1];
      for (const [width, height] of [[1280, 800], [375, 740], [320, 740], [375, 667], [320, 568]]) for (const lang of ['en', 'zh']) {
        await layout(host, 'host-longest', '#br-pass', width, lang, height, height >= 740);
        await layout(phone, 'player-longest', '[data-br-action="pass"]', width, lang, height, height >= 568);
      }
      report.longestPrompt = longest;
      check('longest supplied prompt rendered through isolated authority on desktop800px and phones740/667/568px, EN/ZH; host full prompt and action remain reachable by ordinary scroll');
    }
    if (process.env.BOMB_QA_LAYOUT !== '0') {
      await host.emulateMedia({ reducedMotion: 'reduce' });
      const spark = await host.locator('.br-bomb.is-live .br-object-spark').evaluate(element => ({ animation: getComputedStyle(element).animationName, opacity: getComputedStyle(element).opacity }));
      assert.equal(spark.animation, 'none'); assert.equal(spark.opacity, '1');
      await host.emulateMedia({ reducedMotion: 'no-preference' });
      check('reduced-motion keeps a visible static red spark without animated movement');
    }
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    report.blockedExternalRequests = [...blockedRequests]; report.errors = errors; report.finalPrompt = promptId(current);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks, views: report.views.length, output, errors }));
  } catch (error) {
    report.error = error.stack; report.errors = errors; report.blockedExternalRequests = [...blockedRequests];
    if (host && !host.isClosed()) {
      report.hostState = await state().catch(() => null);
      report.timingControlTrace = await host.evaluate(() => window.__qaTimingTrace || []).catch(() => []);
      await host.screenshot({ path: path.join(output, 'failure-host.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(output, 'failure-host.html'), await host.content().catch(() => ''));
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    throw error;
  } finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
