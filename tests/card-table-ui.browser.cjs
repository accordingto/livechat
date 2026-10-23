'use strict';
// Run: node tests/card-table-ui.browser.cjs [path-to-playwright-package]
// CT_QA_GAME=wordlimit|roomsurvey, CT_QA_PLAYERS=n, CT_QA_OUTPUT=<dir outside the Hub>,
// CT_QA_LAYOUT=0 skips the captures. Serves the REAL host page and the original
// play.html links against one isolated Firebase-compatible in-memory database.
// The host page is CLOSED right after Start: the players' cards then run the
// table (clock, Table controls, next rounds) on their own; the host page is
// reopened later only as an optional viewer. Every external request is
// intercepted; no live room is touched.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const game = process.env.CT_QA_GAME || 'wordlimit';
assert.ok(['wordlimit', 'roomsurvey'].includes(game), 'CT_QA_GAME must be wordlimit or roomsurvey');
const WL = game === 'wordlimit';
const playerCount = Number(process.env.CT_QA_PLAYERS || (WL ? 4 : 3));
assert.ok(Number.isInteger(playerCount) && playerCount >= (WL ? 4 : 3) && playerCount <= 9, `CT_QA_PLAYERS must be ${WL ? 4 : 3}–9`);
const output = path.resolve(process.env.CT_QA_OUTPUT || path.join(root, '..', `card-table-browser-qa-${game}-${playerCount}`));
const code = `CT_BROWSER_QA_${game.toUpperCase()}_${playerCount}`;
const tokens = Array.from({ length: playerCount }, (_, index) => 'qa-player-' + (index + 1));
const names = ['Amy', 'Kevin', 'Jason', 'Willy', 'Riley', 'Morgan', 'Alexandra-Marie', 'Sam', 'Robin'].slice(0, playerCount);
const KEY = WL ? 'wl' : 'rs', PAGE = WL ? 'word-limit-theater.html' : 'room-survey.html', HOST = WL ? 'WORD_LIMIT_HOST' : 'ROOM_SURVEY_HOST';
const EXTRA = WL ? 'wordLimitControlToken' : 'roomSurveyControlToken';
const CONTENT = WL ? require('../word-limit-content.js') : require('../room-survey-content.js');
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
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
  window.__qaDeliver = tree => {
    for (const [location, entries] of listeners) {
      const value = getPath(tree, location);
      for (const entry of entries) if (JSON.stringify(value) !== entry.last) { entry.last = JSON.stringify(value); entry.handler(snapshot(value)); }
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
          entry.last = JSON.stringify(value); handler(snapshot(value));
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
      onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
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
const normKey = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const db = makeDatabase(), pages = new Set(), errors = [], blocked = new Set(), epoch = Date.now();
  let offset = 0;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' }); response.end(fs.readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.CT_QA_CHANNEL ? { channel: process.env.CT_QA_CHANNEL } : {}) });
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
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    blocked.add(url);
    return route.fulfill({ status: 200, contentType: url.includes('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const open = async url => {
    const item = await context.newPage(); pages.add(item);
    item.on('pageerror', error => errors.push({ url: item.url(), message: error.message }));
    item.on('close', () => pages.delete(item));
    await item.goto(base + '/' + url);
    return item;
  };
  const report = { entry: `${PAGE} + ${playerCount} original play.html links`, game, playerCount,
    fixture: 'isolated Firebase-compatible memory database; controlled clock via serverTimeOffset; external network intercepted; desktop Chromium emulates viewport sizes, not physical phones', checks: [], views: [], layoutIssues: [] };
  const check = label => { report.checks.push(label); if (process.env.CT_QA_VERBOSE) console.log('PASS ' + label); };
  const wait = async (predicate, label = 'state') => {
    for (let i = 0; i < 400; i++) { await delivery; if (await predicate()) return; await pause(25); }
    throw new Error('Browser state did not settle: ' + label);
  };
  let host = null, players = [];
  const control = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[1] || null;
  const tableToken = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[0] || null;
  // The canonical table, read straight from the database: no page has to be open.
  const state = async () => { const table = control(); return table?.stateJson ? JSON.parse(table.stateJson) : null; };
  const status = () => host.evaluate(name => window[name].status, HOST);
  const cards = () => Promise.all(players.map(page => page.evaluate(() => window.CARD_TABLE_CARD?.view() || null)));
  const card = n => players[n - 1];
  const advance = async ms => { offset += ms; db.put('.info/serverTimeOffset', offset); deliver(); await delivery; };
  const allCards = async predicate => wait(async () => (await cards()).every(value => value && predicate(value[KEY], value)), 'cards');
  const phase = async target => {
    await wait(async () => (await state())?.phase === target, 'phase ' + target);
    const s = await state();
    await allCards(view => view.sessionId === s.sessionId && view.stage === s.stage && view.turnId === s.turnId);
  };
  const settle = async () => { const s = await state(); await allCards(view => view.sessionId === s.sessionId && view.turnId === s.turnId); };
  const tap = async (page, selector) => {
    const button = page.locator(selector).first();
    await button.waitFor({ state: 'visible' });
    await wait(async () => !(await button.isDisabled()), 'enabled ' + selector);
    await button.click();
  };
  // Table controls live in a folded panel at the bottom of every active card.
  const controls = async page => {
    const panel = page.locator('[data-ct-controls]');
    await panel.waitFor({ state: 'visible' });
    if (!(await panel.evaluate(element => element.open))) await panel.locator('summary').click();
    return panel;
  };
  const tool = async (page, selector) => { await controls(page); await tap(page, '[data-ct-controls] ' + selector); };
  const twice = async (page, selector) => {
    await tool(page, selector);
    await wait(async () => (await page.locator(`[data-ct-controls] ${selector}.is-armed`).count()) === 1, 'armed ' + selector);
    await tool(page, selector);
  };
  const text = page => page.evaluate(() => document.body.innerText);
  // ── layout captures with overflow, clipping, occlusion and tap-target checks ──
  const capture = async (page, label, { width, height = 900, lang, target = null } = {}) => {
    if (process.env.CT_QA_LAYOUT === '0') return;
    await page.setViewportSize({ width, height });
    await page.evaluate(language => I18N.setLang(language), lang);
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(80);
    const metrics = await page.evaluate(target => {
      const overflow = document.documentElement.scrollWidth - innerWidth;
      const clipped = [...document.querySelectorAll('.ct-card *, .wl-stage *, .rs-stage *, .wl-setup *, .rs-setup *, .ct-controls *')].filter(element => {
        if (!element.getClientRects().length || element.closest('[hidden], svg') || (element.checkVisibility && !element.checkVisibility({ contentVisibilityAuto: true }))) return false;
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 1 && style.overflowX === 'visible' && !['inline', 'contents'].includes(style.display) && element.clientWidth > 0 && element.children.length === 0;
      }).map(element => element.className || element.tagName).slice(0, 5);
      let action = null;
      if (target) {
        const element = [...document.querySelectorAll(target)].find(item => item.getClientRects().length);
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
    metrics.contrast = await contrastAudit(page, `${label}-${width}x${height}-${lang}`);
    report.views.push({ label, width, height, lang, ...metrics, screenshot: file });
    // Collected, not thrown: one run lists every layout problem; the run fails at the end.
    const where = `${label} ${width} ${lang}`;
    if (metrics.overflow > 1) report.layoutIssues.push(`${where}: horizontal overflow ${metrics.overflow}`);
    if (metrics.clipped.length) report.layoutIssues.push(`${where}: clipped text ${metrics.clipped.join(', ')}`);
    if (target && !metrics.action) report.layoutIssues.push(`${where}: ${target} missing`);
    if (metrics.action && !(metrics.action.height >= 44 && metrics.action.width >= 44)) report.layoutIssues.push(`${where}: ${target} tap target ${metrics.action.width}x${metrics.action.height}`);
    if (metrics.action && !metrics.action.clickable) report.layoutIssues.push(`${where}: ${target} is covered`);
    for (const item of metrics.contrast) report.layoutIssues.push(`${where}: contrast ${item}`);
  };
  // Rendered contrast: shoot the page with and without its glyphs, then compare
  // each text's colour with the pixels really behind the glyphs (10th
  // percentile, so a stray pattern pixel does not count, a dark half does).
  const contrastAudit = async (page, name = 'shot') => {
    // Read every text's colour and boxes first: some colours have transitions,
    // so nothing is read while the glyphs are being hidden or shown again.
    await page.evaluate(() => {
      // Judge what stays on screen: one-off entrance animations (a flip, a fade) jump to their end.
      for (const animation of document.getAnimations()) { try { if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish(); } catch (_) {} }
      const parse = value => { const m = String(value).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
      const scope = '.ct-card, .wl-stage, .rs-stage, .ct-panel, .ct-controls, .ct-bottom, .ct-actions, .topbar, .header, .ct-feedback, .ct-shell';
      const shown = element => !element.checkVisibility || element.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
      // A transient toast (fixed on screen) may cover text for a few seconds; covered text is not judged.
      const toasts = [...document.querySelectorAll('body *')].filter(element => element.id !== 'i18n-toggle' && getComputedStyle(element).position === 'fixed' && element.getClientRects().length && shown(element))
        .map(element => { const r = element.getBoundingClientRect(); return { element, box: [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY] }; });
      const covered = (element, [x, y, w, h]) => toasts.some(({ element: toast, box: [l, t, r, b] }) => !toast.contains(element) && x < r && x + w > l && y < b && y + h > t);
      const items = [];
      for (const element of document.querySelectorAll(scope.split(', ').map(item => `${item}, ${item} *`).join(', '))) {
        const nodes = [...element.childNodes].filter(node => node.nodeType === 3 && /[\p{L}\p{N}]/u.test(node.textContent));
        if (!nodes.length || !element.getClientRects().length || !shown(element) || element.closest('[hidden], svg, :disabled, [aria-disabled="true"], #i18n-toggle')) continue;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden') continue;
        let opacity = 1; for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        const ink = parse(style.color); if (!ink || opacity === 0) continue;
        const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700;
        const rects = [];
        for (const node of nodes) { const range = document.createRange(); range.selectNodeContents(node); for (const rect of range.getClientRects()) { const box = [rect.left + scrollX, rect.top + scrollY, rect.width, rect.height]; if (!covered(element, box)) rects.push(box); } }
        if (!rects.length) continue;
        items.push({ name: `${String(element.className || element.tagName).slice(0, 36)} “${nodes.map(node => node.textContent).join('').trim().slice(0, 24)}”`, ink, opacity, need: size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5, rects });
      }
      window.__qaText = items;
    });
    const normal = await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 90000 });
    const style = await page.addStyleTag({ content: '.qa-still * { transition: none !important; } .qa-no-text *, .qa-no-text *::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }' });
    await page.evaluate(() => document.documentElement.classList.add('qa-still', 'qa-no-text'));
    const shot = await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 90000 });
    if (process.env.CT_QA_DEBUG_SHOTS) fs.writeFileSync(path.join(output, `notext-${name}.png`), shot);
    // Colours snap back with transitions still off, so the page is exactly as before.
    await page.evaluate(() => { document.documentElement.classList.remove('qa-no-text'); void document.body.offsetHeight; getComputedStyle(document.body).color; document.documentElement.classList.remove('qa-still'); });
    await style.evaluate(element => element.remove());
    if (process.env.CT_QA_DEBUG_SHOTS) await page.evaluate(() => { window.__qaVerbose = true; });
    return page.evaluate(async ([png, withText]) => {
      const load = async source => {
        const image = new Image(); image.src = 'data:image/png;base64,' + source; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
        return { canvas, context };
      };
      const { canvas, context } = await load(png), glyphs = (await load(withText)).context;
      const scale = canvas.width / document.documentElement.scrollWidth;
      const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const found = [];
      for (const item of window.__qaText) {
        const ratios = [];
        for (const [left, top, width, height] of item.rects) {
          const x0 = Math.max(0, Math.floor(left * scale)), y0 = Math.max(0, Math.floor(top * scale));
          const w = Math.min(canvas.width - x0, Math.ceil(width * scale)), h = Math.min(canvas.height - y0, Math.ceil(height * scale));
          if (w < 2 || h < 2) continue;
          // Judge the pixels the glyphs really cover (where the page with text
          // differs from the page without); a badge drawn over a line box is not text.
          const data = context.getImageData(x0, y0, w, h).data, shown = glyphs.getImageData(x0, y0, w, h).data;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (Math.abs(data[i] - shown[i]) + Math.abs(data[i + 1] - shown[i + 1]) + Math.abs(data[i + 2] - shown[i + 2]) < 24) continue;
            const back = [data[i], data[i + 1], data[i + 2]];
            const a = item.ink[3] * item.opacity, text = [0, 1, 2].map(k => item.ink[k] * a + back[k] * (1 - a));
            ratios.push(ratio(text, back));
          }
        }
        // Text so faint it barely changes a pixel is judged against its whole box.
        if (ratios.length < 6) for (const [left, top, width, height] of item.rects) {
          const x0 = Math.max(0, Math.floor(left * scale)), y0 = Math.max(0, Math.floor(top * scale));
          const w = Math.min(canvas.width - x0, Math.ceil(width * scale)), h = Math.min(canvas.height - y0, Math.ceil(height * scale));
          if (w < 2 || h < 2) continue;
          const data = context.getImageData(x0, y0, w, h).data;
          for (let i = 0; i < data.length; i += 16) {
            const back = [data[i], data[i + 1], data[i + 2]];
            const a = item.ink[3] * item.opacity, text = [0, 1, 2].map(k => item.ink[k] * a + back[k] * (1 - a));
            ratios.push(ratio(text, back));
          }
        }
        if (!ratios.length) continue;
        ratios.sort((a, b) => a - b);
        const low = ratios[Math.floor(ratios.length * 0.1)];
        if (low < item.need) found.push(`${item.name} ${low.toFixed(2)}<${item.need}` + (window.__qaVerbose ? ` ink=${item.ink.map(v => Math.round(v * 100) / 100)} opacity=${item.opacity.toFixed(2)} at=${item.rects[0].map(Math.round)}` : ''));
      }
      delete window.__qaText;
      return [...new Set(found)].slice(0, 10);
    }, [shot.toString('base64'), normal.toString('base64')]);
  };
  const views = async (page, label, target, sizes) => {
    for (const [width, height] of sizes) for (const lang of ['en', 'zh']) await capture(page, label, { width, height, lang, target });
    await page.evaluate(() => I18N.setLang('en'));
    await page.setViewportSize({ width: page === host ? 1280 : 390, height: 900 });
  };
  const PHONES = [[390, 844], [320, 568]], HOSTS = [[1280, 800], [390, 844]];

  // ── common opening: the real entry, Start, pointers, then close the host page ──
  async function opening(prepare) {
    host = await open(PAGE);
    players = await Promise.all(tokens.map(token => open('play.html?s=' + code + '&p=' + token)));
    for (const page of players) await page.setViewportSize({ width: 390, height: 900 });
    await wait(async () => (await status()) === 'ready' && !(await host.locator(`#${KEY}-start`).isDisabled()), 'host ready');
    assert.equal(await host.locator(`#${KEY}-setup`).isVisible(), true);
    assert.match(await host.locator(`#${KEY}-setup .ct-note`).innerText(), /you can close this page/);
    await views(host, 'host-setup', `#${KEY}-start`, [[1280, 800], [390, 844], [320, 568]]);
    for (const page of players) assert.match(await text(page), /Waiting for the host|等待主持人/);
    check('real entry: the host page waits on setup, every original link waits on the neutral card');
    await prepare();
    await host.click(`#${KEY}-start`);
    await phase(WL ? 'cast' : 'choose');
    const table = tableToken();
    for (let i = 0; i < playerCount; i++)
      assert.deepEqual(db.get(`rooms/${code}/players/${tokens[i]}`), { game, playerNum: i + 1, name: names[i], [KEY]: { version: 1, table } }, 'each link only points at the table');
    check('Start points every original link at the table; the links carry nothing else');
  }
  async function closing(firstPhase) {
    // The host page, reopened on "another computer", follows the table.
    await card(1).evaluate(([roomCode, extra]) => {
      const key = 'room-session-' + roomCode, saved = JSON.parse(localStorage.getItem(key));
      delete saved[extra]; localStorage.setItem(key, JSON.stringify(saved));
    }, [code, EXTRA]);
    const session = (await state()).sessionId;
    host = await open(PAGE);
    await wait(async () => (await status()) === 'ready', 'host adopted');
    assert.equal(await host.evaluate(name => window[name].state?.sessionId, HOST), session);
    assert.equal(await host.locator(`#${KEY}-game`).isVisible(), true);
    check('a host page without the saved table token finds the running game through the player links');
    // Another game borrows a link: bring the cards back.
    db.put(`rooms/${code}/players/${tokens[1]}`, { game: 'bombrelay', playerNum: 2, bomb: { version: 1, sessionId: 'other-game' } }); deliver();
    await wait(async () => (await status()) === 'switched', 'switched');
    await host.locator(`#${KEY}-continue`).waitFor({ state: 'visible' });
    await views(host, 'host-switched', `#${KEY}-continue`, [[1280, 800], [390, 844]]);
    await host.click(`#${KEY}-continue`);
    await wait(async () => (await status()) === 'ready', 'continued');
    assert.equal((await state()).sessionId, session);
    await allCards(view => view.sessionId === session);
    check('when another game borrows a link, the host page brings every card back to the same game');
    await host.close(); host = null;
    // End the game from a card, then start a new one from a card.
    await twice(card(2), '[data-ct-action="stop"]');
    await phase('finished');
    await wait(async () => (await card(1).locator('.ct-rank').count()) === playerCount, 'standings');
    await views(card(1), 'card-finished', '[data-ct-main] [data-ct-action="restart"]', PHONES);
    await tap(card(1), '[data-ct-main] [data-ct-action="restart"]');
    await phase(firstPhase);
    const s = await state();
    assert.equal(s.roundNo, 1); assert.deepEqual(s.scores, {});
    check('a player ends the game from Table controls (two taps) and another starts a new game from the final standings');
    // The optional host page keeps its own controls.
    host = await open(PAGE);
    await wait(async () => (await status()) === 'ready', 'host final');
    const panel = host.locator(`#${KEY}-controls`);
    await panel.waitFor({ state: 'visible' });
    if (!(await panel.evaluate(element => element.open))) await panel.locator('summary').click();
    await views(host, 'host-controls', `#${KEY}-controls [data-ct-action="stop"]`, [[1280, 800], [390, 844]]);
    await host.click(`#${KEY}-controls [data-ct-action="stop"]`);
    await wait(async () => (await host.locator(`#${KEY}-controls [data-ct-action="stop"].is-armed`).count()) === 1, 'host stop armed');
    await host.click(`#${KEY}-controls [data-ct-action="stop"]`);
    await phase('finished');
    await wait(async () => (await host.locator('.ct-rank').count()) === playerCount, 'host standings');
    await views(host, 'host-finished', '[data-host-action="again"]', HOSTS);
    await host.click('[data-host-action="again"]');
    await phase(firstPhase);
    assert.equal((await state()).roundNo, 1);
    check('the optional host page still has Host controls and Play again when it is open');
  }

  // ═════════════════════════ WORD LIMIT THEATER ═════════════════════════
  async function wordLimit() {
    await opening(async () => {
      assert.equal(await host.locator('input[name="wl-unit"][value="words"]').isChecked(), true, 'an English host starts with words');
      await host.selectOption('#wl-minutes', '2');
    });
    let s = await state();
    assert.equal(s.round.sceneMs, 120000); assert.equal(s.round.unit, 'words');
    for (const n of s.round.players) {
      await wait(async () => (await card(n).locator('[data-ct-main] .wl-board-num b').count()) === 1, 'board ' + n);
      assert.equal(await card(n).locator('[data-ct-main] .wl-board-num b').innerText(), String(s.round.limits[n]), `card ${n} shows its own limit`);
      assert.equal(await card(n).locator('[data-ct-main] .wl-cast-row').count(), playerCount);
      assert.equal(await card(n).locator('[data-ct-main] .wl-cast-row.is-me').count(), 1);
    }
    const hostText = await text(host);
    for (const n of s.round.players) assert.ok(hostText.includes(String(CONTENT.scene(s.round.sceneId).roles[s.round.roles[n]].en)), 'the shared screen lists every role');
    check('every card shows its own role and limit on the letterboard; the whole cast with limits is public');
    await views(host, 'host-cast', '[data-host-action="close"]', HOSTS);
    await views(card(1), 'card-cast', '[data-ct-main] [data-ct-action="close"]', PHONES);
    await host.close(); host = null;
    check('the host page is closed from here on: the cards run the table');

    // ── cast: reroll and start from the cards ──
    const before = s.round.sceneId;
    await tap(card(2), '[data-ct-main] [data-ct-action="reroll"]');
    await wait(async () => (await state()).round.sceneId !== before, 'reroll');
    await settle();
    s = await state();
    assert.match(await card(4).innerText('body'), new RegExp(CONTENT.scene(s.round.sceneId).title.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await tap(card(3), '[data-ct-main] [data-ct-action="close"]');
    await phase('scene');
    check('one card draws a different scene, another raises the curtain early');

    // ── scene: a foul and a twist ──
    await views(card(1), 'card-scene', '[data-ct-main] .wl-foul-btn', PHONES);
    await tap(card(1), '[data-ct-main] .wl-foul-btn[data-ct-arg-target="2"]');
    await wait(async () => (await state()).round.fouls[2] === 1, 'foul');
    await card(2).locator('.wl-flash.is-foul.is-mine.is-live').waitFor({ state: 'visible' });
    await card(3).locator('.wl-flash.is-foul.is-live').waitFor({ state: 'visible' });
    await wait(async () => (await card(4).locator('[data-ct-main] .wl-cast-row .wl-fouls').count()) === 1, 'foul count on cards');
    await views(card(2), 'card-foul-on-you', '[data-ct-main] .wl-twist-btn', [[390, 844], [320, 568]]);
    check('anyone calls a foul from their card; the fouled player sees “Foul on you!”, everyone sees the count');
    await tap(card(4), '[data-ct-main] .wl-twist-btn');
    await wait(async () => (await state()).round.twists.length === 1, 'twist');
    assert.equal((await state()).round.twists[0].by, 4);
    await settle();
    for (const n of [1, 2, 3]) await card(n).locator('[data-ct-main] .wl-cue').waitFor({ state: 'visible' });
    await wait(async () => (await card(1).locator('[data-ct-main] .wl-twist-btn.is-cooling').count()) === 1, 'cooling');
    assert.equal(await card(1).locator('[data-ct-main] .wl-twist-btn').getAttribute('aria-disabled'), 'true');
    await card(1).locator('[data-ct-main] .wl-twist-btn').click({ force: true });
    await pause(150); await delivery;
    assert.equal((await state()).round.twists.length, 1, 'a cooling twist button does nothing');
    await views(card(1), 'card-twist', null, [[390, 844]]);
    check('a player drops a plot twist; it shows on every card and the twist button cools down for everyone');

    // ── Table controls: pause, resume, add time ──
    s = await state();
    const runBase = s.round.runBase, elapsedAtPause = (epoch + offset) - s.round.runSince + runBase;
    await tool(card(2), '[data-ct-action="pause"]');
    await phase('paused');
    assert.equal((await state()).remainingMs, 120000 - elapsedAtPause);
    await views(card(3), 'card-paused', '[data-ct-main] [data-ct-action="resume"]', [[390, 844]]);
    await advance(30000);
    await tap(card(3), '[data-ct-main] [data-ct-action="resume"]');
    await phase('scene');
    const view = (await cards())[0].wl;
    assert.equal(view.sceneEndsAt - (epoch + offset), 120000 - elapsedAtPause, 'a pause loses no scene time');
    await tool(card(4), '[data-ct-action="extend"]');
    await wait(async () => (await state()).round.sceneMs === 180000, 'extended');
    check('one player pauses from Table controls, another resumes from their card (nothing lost), a third adds a minute');

    // ── the scripted twist, the limit shuffle and the end of the scene, from the cards' own clocks ──
    const limits = clone((await state()).round.limits);
    let shuffled = false;
    for (let guard = 0; guard < 8 && (await state()).phase === 'scene'; guard++) {
      s = await state();
      const turnId = s.turnId;
      await advance(Math.max(0, s.deadline - (epoch + offset)) + 400);
      await wait(async () => (await state()).turnId !== turnId, 'scene tick');
      s = await state();
      if (!shuffled && s.round.shuffles === 1) {
        shuffled = true; await settle();
        await card(1).locator('[data-ct-main] .wl-board-was.is-live').waitFor({ state: 'visible' });
        await card(1).locator('.wl-flash.is-shuffle.is-live').waitFor({ state: 'visible' });
        await views(card(1), 'card-shuffle', null, [[390, 844], [320, 568]]);
      }
    }
    await phase('vote');
    s = await state();
    assert.equal(shuffled, true);
    assert.ok(s.round.twists.some(item => item.by === 0), 'the script dropped its own twist');
    for (const n of s.round.players) assert.notEqual(s.round.limits[n], limits[n], `seat ${n} got a different limit`);
    assert.equal(s.round.endReason, 'time');
    check('with no host page, the cards fire the scripted twist, swap every limit (“was N” shown) and end the scene on time');

    // ── MVP vote: secret ballots, no self-vote ──
    await views(card(1), 'card-vote', '[data-ct-main] .wl-target', PHONES);
    assert.equal(await card(1).locator('[data-ct-main] .wl-target[data-ct-arg-target="1"]').count(), 0, 'no button to vote for yourself');
    const ballots = { 1: 2, 2: 1 };
    for (let n = 3; n < playerCount; n++) ballots[n] = 2;
    ballots[playerCount] = 0;
    for (const [voter, target] of Object.entries(ballots)) {
      const selector = target ? `[data-ct-main] .wl-target[data-ct-arg-target="${target}"]` : '[data-ct-main] .wl-skip';
      await tap(card(Number(voter)), selector);
      await wait(async () => (await state()).phase === 'result' || Object.hasOwn((await state()).round.votes, voter), 'vote ' + voter);
      if ((await state()).phase === 'vote') {
        for (const item of await cards()) assert.equal(JSON.stringify(item.wl.result), 'null', 'no ballot is public before everyone has voted');
      }
    }
    await phase('result');
    s = await state();
    assert.deepEqual(s.round.mvp, [2]);
    assert.equal(s.scores[2], playerCount - 2); assert.equal(s.scores[1], 1);
    await wait(async () => (await card(2).locator('.secret-card.is-mvp').count()) === 1, 'mvp card');
    assert.match(await card(5 <= playerCount ? 5 : 3).locator('[data-ct-main] .wl-mvp-name').innerText(), /Kevin/);
    await views(card(2), 'card-result-mvp', '[data-ct-main] .wl-next', PHONES);
    check('everyone votes on their own card (skip allowed, no self-vote); the MVP card lights up and each vote is a point');

    // The shared screen is optional: reopening it just shows the game.
    host = await open(PAGE);
    await wait(async () => (await status()) === 'ready', 'host reopened');
    await host.locator('.wl-phase-result').waitFor({ state: 'visible' });
    await views(host, 'host-result', '[data-host-action="next"]', HOSTS);
    await host.close(); host = null;
    check('reopening the host page shows the same result; closing it again changes nothing');

    // ── next scene from a card ──
    const firstScene = s.round.sceneId;
    await tap(card(3), '[data-ct-main] .wl-next');
    await phase('cast');
    s = await state();
    assert.equal(s.roundNo, 2); assert.notEqual(s.round.sceneId, firstScene);
    check('any player starts the next scene: a new scene, roles and limits');

    // ── sit out (two taps), cancel the round, play on without them, “I’m back” ──
    const out = 3;
    await tool(card(1), `[data-ct-action="exclude"][data-ct-arg-player-num="${out}"]`);
    await wait(async () => /Tap again/.test(await card(1).locator(`[data-ct-controls] [data-ct-action="exclude"][data-ct-arg-player-num="${out}"]`).innerText()), 'sit-out armed');
    assert.equal((await state()).roster.find(p => p.playerNum === out).active, true, 'one tap sits nobody out');
    await tool(card(1), `[data-ct-action="exclude"][data-ct-arg-player-num="${out}"]`);
    await wait(async () => (await state()).roster.find(p => p.playerNum === out).active === false, 'sat out');
    await views(card(1), 'card-controls-players', '[data-ct-controls] [data-ct-action="void"]', [[390, 844], [320, 568]]);
    await twice(card(1), '[data-ct-action="void"]');
    await phase('result');
    assert.equal((await state()).round.outcome.voided, true);
    await tap(card(1), '[data-ct-main] .wl-next');
    await phase('cast');
    assert.equal((await state()).round.players.includes(out), false);
    await card(out).locator('[data-ct-main] [data-ct-action="exclude"][data-ct-arg-active="true"]').waitFor({ state: 'visible' });
    await views(card(out), 'card-sitting-out', '[data-ct-main] [data-ct-action="exclude"]', [[390, 844]]);
    await tap(card(out), '[data-ct-main] [data-ct-action="exclude"][data-ct-arg-active="true"]');
    await wait(async () => (await state()).roster.find(p => p.playerNum === out).active === true, 'back');
    check('a player sits someone out (two taps) and cancels a round; the scene goes on without them; they return with “I’m back”');

    // ── next-scene settings from a card, then a scene with no vote ──
    await controls(card(4));
    await card(4).selectOption('[data-ct-controls] [data-ct-set="sceneMinutes"]', '3');
    await card(4).selectOption('[data-ct-controls] [data-ct-set="unit"]', 'chars');
    await card(4).locator('[data-ct-controls] [data-ct-set="vote"]').uncheck();
    await views(card(4), 'card-controls-settings', '[data-ct-controls] [data-ct-save-settings]', [[390, 844], [320, 568]]);
    await tap(card(4), '[data-ct-controls] [data-ct-save-settings]');
    await wait(async () => (await state()).settings.unit === 'chars' && (await state()).settings.vote === false && (await state()).settings.sceneMinutes === 3, 'settings saved');
    assert.match(await card(4).locator('[data-ct-controls] [data-ct-note]').innerText(), /next round/);
    assert.equal((await state()).round.unit, 'words', 'the scene in progress keeps its unit');
    await twice(card(4), '[data-ct-action="void"]');
    await phase('result');
    await tap(card(2), '[data-ct-main] .wl-next');
    await phase('cast');
    s = await state();
    assert.equal(s.round.sceneMs, 180000); assert.equal(s.round.unit, 'chars'); assert.equal(s.round.voteOn, false);
    assert.match(await card(1).locator('[data-ct-main] .wl-board-unit').innerText(), /Chinese character/);
    await tap(card(2), '[data-ct-main] [data-ct-action="close"]');
    await phase('scene');
    await twice(card(2), '[data-ct-action="close"]');
    await phase('result');
    assert.deepEqual(list((await state()).round.mvp), []);
    check('a player changes length, unit and vote for the next scene from their card; with the vote off, ending the scene goes straight to the result');

    await closing('cast');
  }

  // ═════════════════════════ ROOM SURVEY ═════════════════════════
  async function roomSurvey() {
    await opening(async () => {
      await host.selectOption('#rs-write', '60');
      await host.selectOption('#rs-guess', '3');
    });
    let s = await state();
    let keeper = s.round.keeper;
    const others = () => s.round.players.filter(n => n !== keeper);
    const optionTexts = s.round.options.map(id => CONTENT.get(id).en);
    for (const n of s.round.players) {
      const shown = await text(card(n));
      for (const option of optionTexts) assert.equal(shown.includes(option), n === keeper, `card ${n}: ${option}`);
    }
    for (const option of optionTexts) assert.equal((await text(host)).includes(option), false, 'the shared screen never shows the options');
    assert.equal(await card(keeper).locator('[data-ct-main] .rs-option').count(), 3);
    check('the Keeper alone sees three prompt options; other cards and the shared screen do not');
    await views(host, 'host-choose', null, HOSTS);
    await views(card(keeper), 'card-choose-keeper', '[data-ct-main] .rs-option', PHONES);
    await views(card(others()[0]), 'card-choose-player', null, [[390, 844]]);
    await host.close(); host = null;
    check('the host page is closed from here on: the cards run the table');

    // ── reroll, then the Keeper's own prompt ──
    const options = s.round.options.join();
    await tap(card(keeper), '[data-ct-main] [data-ct-action="reroll"]');
    await wait(async () => (await state()).round.options.join() !== options, 'reroll');
    await settle();
    await tap(card(keeper), '[data-ct-main] [data-ct-ui="custom"]');
    await card(keeper).locator('[data-rs-custom]').waitFor({ state: 'visible' });
    await card(keeper).locator('[data-rs-custom-input]').fill('Something you <always> forget at home');
    await views(card(keeper), 'card-custom', '[data-rs-custom-use]', [[390, 844], [320, 568]]);
    await tap(card(keeper), '[data-rs-custom-use]');
    await phase('write');
    s = await state();
    assert.equal(s.round.question.custom, true);
    assert.equal(s.round.question.en, 'Something you always forget at home');
    for (const n of s.round.players) assert.match(await card(n).locator('[data-ct-main] .rs-prompt-text').innerText(), /Something you always forget at home/);
    check('the Keeper draws new options, then writes their own prompt (cleaned of markup); it shows on every card');

    // ── writing: answers stay private; typing is never interrupted ──
    const plan = { 1: ['Keys', 'Umbrella'], 2: ['keys!', 'Phone charger'], 3: ['My keys', 'Wallet'], 4: ['Wallet', 'Lunch box'],
      5: ['Phone charger', 'Glasses'], 6: ['Umbrella', 'ID card'], 7: ['Keys', 'Headphones'], 8: ['Glasses', 'Bus pass'], 9: ['Lunch box', 'Gym bag'] };
    const writers = s.round.players;
    const last = writers[writers.length - 1];
    await views(card(1), 'card-write', '[data-rs-send]', PHONES);
    // A slow typist keeps the same field, text and focus while others send theirs.
    const slow = card(last).locator('[data-rs-input="0"]');
    await slow.click(); await slow.pressSequentially('Pho');
    const field = await slow.evaluateHandle(element => element);
    for (const n of writers.filter(n => n !== last)) {
      await card(n).locator('[data-rs-input="0"]').fill(plan[n][0]);
      await card(n).locator('[data-rs-input="1"]').fill(plan[n][1]);
      await tap(card(n), '[data-rs-send]');
      await wait(async () => !!(await state()).round.submitted?.[n], 'submitted ' + n);
    }
    await settle();
    assert.equal(await slow.inputValue(), 'Pho');
    assert.equal(await card(last).evaluate(element => document.activeElement === element, field), true);
    assert.equal(await field.evaluate(element => element.isConnected), true);
    await slow.fill(plan[last][0]);
    await card(last).locator('[data-rs-input="1"]').fill(plan[last][1]);
    await card(last).evaluate(() => document.activeElement?.blur());
    for (const n of writers.filter(n => n !== last)) {
      const shown = await text(card(n));
      for (const other of writers.filter(m => m !== n)) for (const answer of plan[other]) if (!plan[n].map(normKey).includes(normKey(answer)))
        assert.equal(shown.includes(answer), false, `card ${n} never shows ${other}'s answer ${answer}`);
    }
    check('each player writes on their own card; nobody sees another answer, and a half-typed answer keeps its field and focus');
    // The last one never taps Send: it goes in by itself just before time is up.
    s = await state();
    await advance(s.deadline - (epoch + offset) - 1000);
    await phase('sort');
    s = await state();
    assert.deepEqual(s.round.answers[last].map(answer => answer.text), plan[last]);
    check('a typed answer goes in by itself just before the writing time ends');

    // ── sorting on the Keeper's card ──
    const groupOf = (state, text) => state.round.groups.find(group => normKey(group.text) === normKey(text));
    assert.ok(groupOf(s, 'keys').members.length >= 2, '“Keys” and “keys!” were merged on their own');
    await card(keeper).locator('[data-ct-main] .rs-slip').first().waitFor({ state: 'visible' });
    assert.equal(await card(keeper).locator('[data-ct-main] .rs-slip').count(), s.round.groups.length);
    for (const n of others()) {
      assert.equal(await card(n).locator('[data-ct-main] .rs-slip').count(), 0);
      await card(n).locator('[data-ct-main] .rs-mine').waitFor({ state: 'visible' });
    }
    await views(card(keeper), 'card-sort-keeper', '[data-ct-main] .rs-slip', PHONES);
    const myKeys = groupOf(s, 'my keys').id, keys = groupOf(s, 'keys').id;
    await tap(card(keeper), `[data-ct-main] .rs-slip[data-group="${myKeys}"]`);
    await card(keeper).locator(`[data-ct-main] .rs-slip[data-group="${myKeys}"].is-selected`).waitFor();
    await tap(card(keeper), `[data-ct-main] .rs-slip[data-group="${keys}"]`);
    await wait(async () => !(await state()).round.groups.some(group => group.id === myKeys), 'merged');
    await card(keeper).locator(`[data-ct-main] .rs-slip[data-group="${keys}"] .rs-slip-variants`).waitFor({ state: 'visible' });
    await views(card(keeper), 'card-sort-merged', `[data-ct-main] [data-ct-action="split"]`, [[390, 844]]);
    await tap(card(keeper), `[data-ct-main] [data-ct-action="split"][data-ct-arg-group="${keys}"]`);
    await wait(async () => groupOf(await state(), 'my keys') != null, 'split');
    s = await state();
    await tap(card(keeper), `[data-ct-main] .rs-slip[data-group="${groupOf(s, 'my keys').id}"]`);
    await tap(card(keeper), `[data-ct-main] .rs-slip[data-group="${groupOf(s, 'keys').id}"]`);
    await wait(async () => groupOf(await state(), 'my keys') == null, 'merged again');
    s = await state();
    const umbrella = groupOf(s, 'umbrella').id;
    await tap(card(keeper), `[data-ct-main] [data-ct-action="drop"][data-ct-arg-group="${umbrella}"]`);
    await wait(async () => groupOf(await state(), 'umbrella').dropped === true, 'dropped');
    await tap(card(keeper), `[data-ct-main] [data-ct-action="drop"][data-ct-arg-group="${umbrella}"]`);
    await wait(async () => groupOf(await state(), 'umbrella').dropped === false, 'restored');
    check('the Keeper merges two slips by tapping both, splits them back, removes and restores one');
    await tap(card(keeper), '[data-ct-main] [data-ct-action="startGuess"]');
    await phase('guess');
    s = await state();
    const order = s.round.order;
    assert.deepEqual(order, [...others().filter(n => n > keeper), ...others().filter(n => n < keeper)]);

    // ── guessing ──
    const hiddenTexts = () => s.round.groups.filter(group => !group.dropped && !s.round.revealed[group.id]).map(group => group.text);
    const authors = group => [...new Set(group.members.map(member => member.playerNum))];
    for (const n of others()) {
      const shown = await text(card(n));
      for (const hidden of hiddenTexts()) if (!plan[n].map(normKey).includes(normKey(hidden))) assert.equal(shown.includes(hidden), false, `card ${n} board stays face down: ${hidden}`);
    }
    await wait(async () => (await card(keeper).locator('[data-ct-main] [data-ct-ui="tile"]').count()) === s.round.board.length, 'keeper tiles');
    await wait(async () => (await card(order[0]).locator('.secret-card.is-turn').count()) === 1, 'turn card');
    await views(card(keeper), 'card-guess-keeper', '[data-ct-main] [data-ct-ui="tile"]', PHONES);
    await views(card(order[0]), 'card-guess-turn', '[data-ct-main] .rs-zone.is-turn [data-ct-action="pass"]', PHONES);
    if (order[1]) await views(card(order[1]), 'card-guess-waiting', null, [[390, 844]]);
    check('the Keeper judges from a board of every answer; the guesser’s card says it is their turn; the other boards stay face down');
    const tileFor = id => `[data-ct-main] [data-ct-ui="tile"][data-tile="${id}"]`;
    const judgeHit = async id => {
      const serial = (await state()).round.turn.serial;
      await tap(card(keeper), tileFor(id));
      await card(keeper).locator('[data-ct-main] .rs-confirm').waitFor({ state: 'visible' });
      await tap(card(keeper), '[data-ct-main] .rs-confirm [data-ct-action="hit"]');
      await wait(async () => (await state()).round.revealed[id] != null, 'revealed ' + id);
      assert.notEqual((await state()).round.turn?.serial, serial);
    };
    // A hit someone else wrote: +1 per writer.
    let guesser = s.round.turn.playerNum;
    let target = s.round.board.map(id => s.round.groups.find(group => group.id === id)).find(group => !authors(group).includes(guesser));
    await judgeHit(target.id);
    s = await state();
    assert.deepEqual(s.round.revealed[target.id], { how: 'hit', by: guesser, points: authors(target).length });
    await settle();
    for (const n of s.round.players) assert.ok((await text(card(n))).includes(target.text), `card ${n} shows the found answer`);
    check(`a found answer flips over on every card and scores one point per writer (+${authors(target).length})`);
    // Your own answer burns.
    guesser = s.round.turn.playerNum;
    const own = s.round.board.map(id => s.round.groups.find(group => group.id === id)).find(group => !s.round.revealed[group.id] && authors(group).includes(guesser));
    if (own) {
      await judgeHit(own.id);
      s = await state();
      assert.deepEqual(s.round.revealed[own.id], { how: 'own', by: guesser, points: 0 });
      await card(guesser).locator('.rs-tile.is-own').first().waitFor({ state: 'visible' });
      check('guessing your own answer burns it: revealed, no points');
    }
    // A miss and a hint.
    const missTurn = (await state()).round.turn.serial;
    await tap(card(keeper), '[data-ct-main] .rs-miss');
    await wait(async () => (await state()).round.turn.serial !== missTurn && (await state()).round.log.at(-1).result === 'miss', 'miss');
    s = await state();
    const hintTile = s.round.board.find(id => !s.round.revealed[id]);
    await tap(card(keeper), '[data-ct-main] [data-ct-ui="hint"]');
    await card(keeper).locator('[data-ct-main] [data-ct-ui="tile"].is-hinting').first().waitFor({ state: 'visible' });
    await tap(card(keeper), tileFor(hintTile));
    await wait(async () => (await state()).round.hints[hintTile] === true, 'hint');
    await settle();
    for (const n of others()) await card(n).locator('[data-ct-main] .rs-hint').first().waitFor({ state: 'visible' });
    check('“Not on the board” passes the turn; a hint shows the first letter on every card');
    // The guesser passes from their own card.
    guesser = (await state()).round.turn.playerNum;
    await tap(card(guesser), '[data-ct-main] .rs-zone.is-turn [data-ct-action="pass"]');
    await wait(async () => (await state()).round.log.at(-1).result === 'pass', 'pass');
    // The turn clock runs out with no host page.
    s = await state();
    guesser = s.round.turn.playerNum;
    await advance(s.round.turn.endsAt - (epoch + offset) + 400);
    await wait(async () => (await state()).round.log.at(-1).result === 'timeout', 'timeout');
    assert.notEqual((await state()).round.turn.playerNum === guesser && order.length > 1, true);
    check('the guesser passes from their card; a turn that runs out passes by itself');
    // The shared board, reopened mid-round, keeps every hidden answer hidden.
    host = await open(PAGE);
    await wait(async () => (await status()) === 'ready', 'host reopened');
    await host.locator('.rs-phase-guess').waitFor({ state: 'visible' });
    s = await state();
    const shared = await text(host);
    for (const hidden of hiddenTexts()) assert.equal(shared.includes(hidden), false, 'the shared board never shows ' + hidden);
    assert.ok(shared.includes(target.text));
    await views(host, 'host-guess', '[data-host-action="pause"]', HOSTS);
    await host.close(); host = null;
    check('the reopened shared screen shows found answers only; closing it again changes nothing');
    // Pause from Table controls keeps both clocks.
    s = await state();
    const guessLeft = s.round.guessEndsAt - (epoch + offset), turnLeft = s.round.turn.endsAt - (epoch + offset);
    await tool(card(keeper), '[data-ct-action="pause"]');
    await phase('paused');
    await views(card(order[0]), 'card-paused', '[data-ct-main] [data-ct-action="resume"]', [[390, 844]]);
    await advance(45000);
    await tap(card(order[0]), '[data-ct-main] [data-ct-action="resume"]');
    await phase('guess');
    s = await state();
    assert.equal(s.round.guessEndsAt - (epoch + offset), guessLeft);
    assert.equal(s.round.turn.endsAt - (epoch + offset), turnLeft);
    check('pausing keeps the round clock and the turn clock');
    // End the round early (two taps); everything is revealed.
    await twice(card(order[0]), '[data-ct-action="close"]');
    await phase('result');
    s = await state();
    assert.equal(s.round.endReason, 'host');
    for (const n of s.round.players) assert.equal(await card(n).locator('.rs-tile.is-hidden').count(), 0, `card ${n}: nothing hidden after the round`);
    const scorer = s.round.revealed[target.id].by;
    await wait(async () => (await card(scorer).locator('[data-ct-main] .rs-over-you').count()) === 1, 'own points');
    await views(card(scorer), 'card-result', '[data-ct-main] [data-ct-action="next"]', PHONES);
    check('a player ends the round from Table controls (two taps); every answer is revealed with the points');

    // ── next round: the Keeper moves on; settings and the next Keeper from a card ──
    const firstKeeper = keeper;
    await tap(card(others()[0]), '[data-ct-main] [data-ct-action="next"]');
    await phase('choose');
    s = await state(); keeper = s.round.keeper;
    assert.notEqual(keeper, firstKeeper); assert.equal(s.roundNo, 2);
    const chosen = others().find(n => n !== firstKeeper) ?? firstKeeper;
    await tool(card(1), `[data-ct-action="setNext"][data-ct-arg-player-num="${chosen}"]`);
    await wait(async () => (await state()).rotation.next === chosen, 'next keeper');
    await controls(card(2));
    await card(2).selectOption('[data-ct-controls] [data-ct-set="answers"]', '1');
    await card(2).selectOption('[data-ct-controls] [data-ct-set="category"]', 'food');
    await views(card(2), 'card-controls-settings', '[data-ct-controls] [data-ct-save-settings]', [[390, 844], [320, 568]]);
    await tap(card(2), '[data-ct-controls] [data-ct-save-settings]');
    await wait(async () => (await state()).settings.answers === 1 && (await state()).settings.category === 'food', 'settings');
    assert.equal((await state()).round.answersPer, 2, 'this round keeps its settings');
    // The Keeper picks a ready-made prompt this time.
    await tap(card(keeper), '[data-ct-main] .rs-option >> nth=0');
    await phase('write');
    assert.equal((await state()).round.question.custom, false);
    // The Keeper leaving cancels the round; they come back on their own card.
    const manager = others()[0];
    await twice(card(manager), `[data-ct-action="exclude"][data-ct-arg-player-num="${keeper}"]`);
    await phase('result');
    assert.equal((await state()).round.outcome.reason, 'keeper_left');
    await card(keeper).locator('[data-ct-main] [data-ct-action="exclude"][data-ct-arg-active="true"]').waitFor({ state: 'visible' });
    await views(card(keeper), 'card-keeper-left', '[data-ct-main] [data-ct-action="exclude"]', [[390, 844]]);
    await tap(card(keeper), '[data-ct-main] [data-ct-action="exclude"][data-ct-arg-active="true"]');
    await wait(async () => (await state()).roster.find(p => p.playerNum === keeper).active === true, 'keeper back');
    await tap(card(manager), '[data-ct-main] [data-ct-action="next"]');
    await phase('choose');
    s = await state();
    assert.equal(s.round.keeper, chosen); assert.equal(s.round.answersPer, 1); assert.equal(s.round.category, 'food');
    for (const id of s.round.options) assert.equal(CONTENT.get(id).cat, 'food');
    await tap(card(chosen), '[data-ct-main] .rs-option >> nth=0');
    await phase('write');
    assert.equal(await card(1).locator('[data-rs-field="1"]').isHidden(), true, 'one answer field when the round asks for one');
    check('players set the next Keeper and next-round settings from their cards; a Keeper leaving cancels the round; “I’m back” returns them');

    await closing('choose');
  }

  try {
    if (WL) await wordLimit(); else await roomSurvey();
    assert.deepEqual(report.layoutIssues, [], 'layout issues');
    assert.deepEqual(errors, []);
    for (const url of blocked) assert.match(url, /gstatic\.com\/firebasejs/, 'only the Firebase SDK is intercepted: ' + url);
    report.blocked = [...blocked];
    report.errors = errors;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${game} browser QA (${playerCount} players): ${report.checks.length} checks, ${report.views.length} captures, 0 page errors → ${output}`);
  } catch (error) {
    report.failure = String(error.stack || error);
    report.errors = errors;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    try { for (const [i, page] of players.entries()) if (!page.isClosed()) await page.screenshot({ path: path.join(output, `failure-card-${i + 1}.png`), fullPage: true }); } catch (_) {}
    try { await host?.screenshot({ path: path.join(output, 'failure-host.png'), fullPage: true }); } catch (_) {}
    console.error(error); console.error('page errors:', JSON.stringify(errors, null, 1));
    process.exitCode = 1;
  } finally {
    await browser.close(); server.close();
  }
})();
