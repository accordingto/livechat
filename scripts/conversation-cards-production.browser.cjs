'use strict';
/* Real released host pages + four original player links, one round per game.
 * Offline review: node scripts/conversation-cards-production.browser.cjs --self-test
 * AFTER release/review only: node scripts/conversation-cards-production.browser.cjs --live <playwright-package>
 * Seven fresh capability nodes only. Never reads a room/list or touches an
 * existing node. Game mutations are actual UI clicks, with real SDK/time.
 * Full capabilities live only in fixture-owned.json OUTSIDE the public repo.
 */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const BASE = 'https://livechat-two-alpha.vercel.app/';
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const HUB = path.resolve(__dirname, '..');
const GAMES = Object.freeze([
  { game: 'wordlimit', key: 'wl', extra: 'wordLimitControlToken', page: 'word-limit-theater.html', host: 'WORD_LIMIT_HOST', pointerVersion: 1 },
  { game: 'wordwolf', key: 'ww', extra: 'wordWolfControlToken', page: 'word-wolf.html', host: 'WORD_WOLF_HOST', pointerVersion: 1 },
  { game: 'whoknows', key: 'wk', extra: 'whoKnowsControlToken', page: 'who-knows.html', host: 'WHO_KNOWS_HOST', pointerVersion: 2 },
]);
const uid = () => randomBytes(16).toString('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const list = value => Array.isArray(value) ? value.filter(x => x != null) : Object.values(value || {});
function canonical(node) { try { return typeof node?.stateJson === 'string' ? JSON.parse(node.stateJson) : null; } catch (_) { return null; } }
function fixture() {
  const code = 'CQ' + randomBytes(4).toString('hex').toUpperCase();
  const f = { code, marker: uid(), tokens: Array.from({ length: 4 }, uid), tableTokens: GAMES.map(uid), names: Array.from({ length: 4 }, (_, i) => `Disposable Card QA ${i + 1}`) };
  f.paths = [...f.tokens, ...f.tableTokens].map(token => `rooms/${code}/players/${token}`);
  assert.equal(new Set(f.paths).size, 7, 'fixture_capability_collision');
  return f;
}
function nodeStamp(f, index) { return { kind: 'conversation-cards-production-qa', marker: f.marker, code: f.code, index }; }
function hasStamp(value, f, index) {
  const q = value?.qaConversationCards;
  return q?.kind === 'conversation-cards-production-qa' && q.marker === f.marker && q.code === f.code && q.index === index;
}
function allowedPath(f, target, descendants = false) {
  if (typeof target !== 'string' || !target || target.split('/').some(part => !part || part === '.' || part === '..')) return false;
  return f.paths.some(root => target === root || (descendants && target.startsWith(root + '/')));
}
function outsideHub(target) {
  const relative = path.relative(HUB, path.resolve(target));
  return !!relative && (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative));
}
function tableProof(value, f, index, sessions) {
  const state = canonical(value);
  return index >= 4 && index <= 6 && hasStamp(value, f, index) && state?.version === 1 && sessions[index]?.has(state.sessionId) &&
    list(state.roster).length === 4 && f.names.every((name, i) => list(state.roster).some(p => p.playerNum === i + 1 && p.name === name));
}
function pointerProof(value, f, index, proofs, sessions) {
  if (index < 0 || index > 3 || value?.playerNum !== index + 1 || value.name !== f.names[index]) return false;
  const gameIndex = GAMES.findIndex(g => value.game === g.game);
  if (gameIndex < 0) return false;
  const g = GAMES[gameIndex], p = value[g.key], controlIndex = 4 + gameIndex;
  return p?.version === g.pointerVersion && p.table === f.tableTokens[gameIndex] && tableProof(proofs[controlIndex], f, controlIndex, sessions);
}
function owned(value, f, index, proofs, sessions) {
  if (!hasStamp(value, f, index)) return false;
  if (index >= 4) return !value.stateJson ? !value.state : tableProof(value, f, index, sessions);
  return value.game === 'qa-fixture'
    ? value.playerNum === index + 1 && value.name === f.names[index] && !value.wl && !value.ww && !value.wk
    : pointerProof(value, f, index, proofs, sessions);
}
function cleanupReason(error) {
  const label = String(error?.message || '');
  return new Set(['outside_exact_node_allowlist', 'qa_request_budget_exhausted', 'exact_node_read_failed',
    'untracked_node_cleanup_refused', 'ownership_cleanup_refused', 'active_presence_cleanup_refused',
    'conditional_cleanup_failed', 'conditional_cleanup_conflict', 'marked_node_ownership_not_proven',
    'projection_ownership_not_proven', 'projection_marker_write_failed', 'projection_marker_conflict']).has(label)
    ? label : error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'exact_node_timeout' : 'exact_node_transport_failed';
}
async function waitForPresence({ store, attempted, proofs, limitMs = 30000, now = Date.now, sleepImpl = sleep }) {
  const started = now(), until = started + limitMs, indexes = [4, 5, 6].filter(i => attempted.has(i));
  const failures = new Map(); let settled = indexes.length === 0;
  while (!settled && now() < until) {
    let successful = 0;
    for (const index of indexes) {
      const remaining = until - now(); if (remaining <= 0) break;
      try { proofs[index] = (await store.read(index, { timeoutMs: remaining })).value; successful++; failures.delete(index); }
      catch (error) { failures.set(index, cleanupReason(error)); }
    }
    settled = successful === indexes.length && indexes.every(i => !Object.keys(proofs[i]?.presence || {}).length);
    if (!settled && now() < until) await sleepImpl(Math.min(300, until - now()));
  }
  return { limitMs, elapsedMs: Math.max(0, now() - started), settled,
    remaining: indexes.map(index => ({ index, count: Object.keys(proofs[index]?.presence || {}).length })),
    readFailures: [...failures].map(([index, reason]) => ({ index, reason })) };
}

// The same fail-closed browser guard is exercised with a fake transport in the
// offline test. It observes sent session IDs; it never substitutes game state.
function installBrowserGuard({ roots, tables }) {
  const accepts = target => typeof target === 'string' && !!target && !target.split('/').some(p => !p || p === '.' || p === '..') && roots.some(root => target === root || target.startsWith(root + '/'));
  window.__conversationQa = { sessions: [], violations: [] };
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (payload) {
    if (!/firebasedatabase\.app|firebaseio\.com/.test(this.url || '')) return send.call(this, payload);
    let frame; try { frame = JSON.parse(payload); } catch (_) { throw Error('qa_uninspectable_firebase_frame'); }
    const body = frame?.d?.b;
    if (typeof body?.p === 'string') {
      const target = body.p.replace(/^\/+|\/+$/g, '');
      const info = ['.info/connected', '.info/serverTimeOffset'].includes(target);
      if ((!accepts(target) && !info) || (info && !['q', 'n', 'g'].includes(frame.d.a))) {
        window.__conversationQa.violations.push('outside_owned_node_allowlist'); throw Error('qa_outside_owned_node_allowlist');
      }
      // Multi-location update keys must stay within the already allowed node.
      if (frame.d.a === 'm' && body.d && typeof body.d === 'object') for (const key of Object.keys(body.d)) {
        if (!accepts(target + '/' + key)) { window.__conversationQa.violations.push('outside_owned_update'); throw Error('qa_outside_owned_update'); }
      }
      const index = tables.findIndex(root => target === root + '/stateJson');
      if (index >= 0 && frame.d.a === 'p' && typeof body.d === 'string') {
        let state; try { state = JSON.parse(body.d); } catch (_) {}
        if (state?.version === 1 && /^[a-f0-9]{32}$/.test(state.sessionId || '')) window.__conversationQa.sessions.push({ index: index + 4, sessionId: state.sessionId });
      }
    }
    return send.call(this, payload);
  };
}

function makeStore({ f, fetchImpl, attempted, saveRecovery, sessions, proofs }) {
  let requests = 0;
  const http = async (index, options = {}, timeoutMs = 25000) => {
    if (!Number.isInteger(index) || !allowedPath(f, f.paths[index])) throw Error('outside_exact_node_allowlist');
    if (++requests > 1800) throw Error('qa_request_budget_exhausted');
    return fetchImpl(`${DATABASE}/${f.paths[index]}.json`, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(25000, Math.floor(timeoutMs)))), ...options });
  };
  const read = async (index, { timeoutMs = 25000 } = {}) => {
    const response = await http(index, { headers: { 'X-Firebase-ETag': 'true' } }, timeoutMs);
    if (!response.ok || !response.headers.get('etag')) throw Error('exact_node_read_failed');
    return { value: await response.json(), etag: response.headers.get('etag') };
  };
  const write = (index, before, method, value) => http(index, { method, headers: { 'Content-Type': 'application/json', 'If-Match': before.etag }, ...(method === 'PUT' ? { body: JSON.stringify(value) } : {}) });
  return {
    read,
    async createAll() {
      // Refuse a collision anywhere before writing any of the seven nodes.
      const before = [];
      for (let i = 0; i < 7; i++) { before[i] = await read(i); if (before[i].value !== null) throw Error('fresh_node_collision'); }
      for (let i = 0; i < 7; i++) {
        const value = { qaConversationCards: nodeStamp(f, i), ...(i < 4 ? { game: 'qa-fixture', playerNum: i + 1, name: f.names[i] } : {}) };
        attempted.add(i); saveRecovery(); // A failed PUT can still have committed.
        const response = await write(i, before[i], 'PUT', value);
        if (!response.ok) throw Error('conditional_fresh_node_create_failed');
      }
    },
    async restoreMarker(index) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const before = await read(index), value = before.value;
        if (hasStamp(value, f, index)) {
          if (!owned(value, f, index, proofs, sessions)) throw Error('marked_node_ownership_not_proven');
          return;
        }
        if (value?.qaConversationCards || !pointerProof(value, f, index, proofs, sessions)) throw Error('projection_ownership_not_proven');
        const response = await write(index, before, 'PUT', { ...value, qaConversationCards: nodeStamp(f, index) });
        if (response.status === 412) continue;
        if (!response.ok) throw Error('projection_marker_write_failed');
        return;
      }
      throw Error('projection_marker_conflict');
    },
    async remove(index) {
      if (!attempted.has(index)) throw Error('untracked_node_cleanup_refused');
      const before = await read(index);
      if (before.value === null) return 'empty';
      if (!owned(before.value, f, index, proofs, sessions)) throw Error('ownership_cleanup_refused');
      if (index >= 4 && Object.keys(before.value.presence || {}).length) throw Error('active_presence_cleanup_refused');
      const response = await write(index, before, 'DELETE');
      if (response.status === 412) throw Error('conditional_cleanup_conflict');
      if (!response.ok) throw Error('conditional_cleanup_failed');
      return 'deleted';
    },
    requests: () => requests,
  };
}

async function run({ live = false, playwrightPath = 'playwright', fetchImpl = globalThis.fetch } = {}) {
  if (live !== true) throw Error('live_flag_required');
  const f = fixture(), attempted = new Set(), sessions = Array.from({ length: 7 }, () => new Set()), proofs = {};
  const output = path.resolve(process.env.CONVERSATION_PROD_QA_OUTPUT || path.join(HUB, '..', 'conversation-production-qa', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex')));
  if (!outsideHub(output)) throw Error('recovery_directory_must_be_outside_public_hub');
  fs.mkdirSync(output, { recursive: true });
  if (!outsideHub(fs.realpathSync(output))) throw Error('recovery_directory_resolves_inside_public_hub');
  const report = { ok: false, step: 'prepare', checks: [], games: [], screenshots: [], pageErrors: [], realFirebase: true, realProductionPages: true,
    actualUiActions: true, realClock: true, physicalPhoneVerified: false, humanVoicePlaytest: false, gameplayVerified: false,
    cleanup: { tracked: 0, deleted: 0, empty: 0, failed: 0, nodes: [], markerRestores: [] }, captureLanguages: [], output };
  const startAt = Date.now(), contexts = [], pages = [], players = [];
  let browser, hostContext, host, hostGameIndex = null;
  const saveRecovery = () => fs.writeFileSync(path.join(output, 'fixture-owned.json'), JSON.stringify({ fixture: f, attempted: [...attempted], sessions: sessions.map(s => [...s]) }, null, 2) + '\n');
  const store = makeStore({ f, fetchImpl, attempted, saveRecovery, sessions, proofs });
  const check = (condition, label) => { if (!condition) { report.failureCheck = label; throw Error(label); } report.checks.push(label); };
  const progress = step => { report.step = step; process.stdout.write('CONVERSATION_QA_PROGRESS ' + JSON.stringify({ step, checks: report.checks.length }) + '\n'); };
  const poll = async (predicate, timeout = 25000) => {
    const until = Date.now() + timeout;
    do {
      if (Date.now() - startAt > 8 * 60000) throw Error('qa_total_time_budget_exhausted');
      if (await predicate()) return;
      await sleep(200);
    } while (Date.now() < until);
    throw Error('production_state_timeout');
  };
  const tap = async (page, selector) => { await page.locator(selector + ':not([disabled])').click({ timeout: 15000 }); };
  const screenshot = async (page, label) => {
    // Use the real visible language switch. The storage seed alone must never
    // be accepted as evidence that a screenshot's labelled language is shown.
    const playerIndex = players.indexOf(page), expected = playerIndex >= 0 && playerIndex % 2 ? 'zh' : 'en';
    await tap(page, `#i18n-toggle button[data-lang="${expected}"]`);
    await poll(async () => page.evaluate(lang => window.I18N?.lang === lang && document.documentElement.lang === (lang === 'zh' ? 'zh-Hant' : 'en') &&
      document.querySelector(`#i18n-toggle button[data-lang="${lang}"]`)?.classList.contains('active') && localStorage.getItem('site-lang') === lang, expected));
    check(true, label + '-actual-language-' + expected);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), label + '-no-horizontal-overflow');
    await page.screenshot({ path: path.join(output, label + '.png'), fullPage: true }); report.screenshots.push(label + '.png');
    report.captureLanguages.push({ file: label + '.png', language: expected, viewport: page.viewportSize() });
  };
  const observeSessions = async () => {
    for (const page of pages) if (!page.isClosed()) {
      try {
        const sent = await page.evaluate(() => window.__conversationQa?.sessions || []);
        for (const item of sent) if ([4, 5, 6].includes(item.index) && /^[a-f0-9]{32}$/.test(item.sessionId)) sessions[item.index].add(item.sessionId);
      } catch (_) {}
    }
    saveRecovery();
  };
  const refreshProofs = async () => {
    await observeSessions();
    for (let i = 4; i < 7; i++) if (attempted.has(i)) proofs[i] = (await store.read(i)).value;
  };
  const state = async gi => canonical((await store.read(gi + 4)).value);
  const views = () => Promise.all(players.map(page => page.evaluate(() => window.CARD_TABLE_CARD?.view?.() || window.WHO_KNOWS_CARD?.view?.() || null)));
  async function synchronized(gi, expectedPhase) {
    const g = GAMES[gi], s = await state(gi);
    await poll(async () => (await views()).every(v => v?.game === g.game && v[g.key]?.sessionId === s.sessionId && v[g.key].stage === s.stage && v[g.key].turnId === s.turnId && v[g.key].phase === expectedPhase));
    return views();
  }
  async function openHost(gi) {
    const g = GAMES[gi]; host = await hostContext.newPage(); hostGameIndex = gi;
    await host.goto(BASE + g.page, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await host.locator(`#${g.key}-start:not([disabled])`).waitFor({ timeout: 45000 });
    check(await host.evaluate(name => !!window[name], g.host), g.game + '-actual-host-module');
  }
  async function closeHost() {
    await observeSessions();
    // Disconnect the real SDK while this page is alive, so the server executes
    // its registered onDisconnect removal before pagehide cancels it. Never
    // synthesize/remove presence data in the database from the harness.
    await host.evaluate(() => firebase.database().goOffline());
    await poll(async () => !Object.values((await store.read(hostGameIndex + 4)).value?.presence || {}).some(entry => entry?.actor === 0));
    check(true, GAMES[hostGameIndex].game + '-native-host-disconnect-clears-host-presence');
    await host.close(); host = null; hostGameIndex = null;
  }
  async function started(gi, phase) {
    const g = GAMES[gi]; await poll(async () => (await state(gi))?.phase === phase);
    await refreshProofs();
    check(tableProof(proofs[gi + 4], f, gi + 4, sessions), g.game + '-fresh-marked-canonical-session');
    for (let i = 0; i < 4; i++) await store.restoreMarker(i);
    await synchronized(gi, phase);
    for (let i = 0; i < 4; i++) check(await players[i].evaluate(expected => new URL(location.href).searchParams.get('p') === expected, f.tokens[i]), g.game + '-same-original-link-' + (i + 1));
  }
  async function endFromCard(gi) {
    const g = GAMES[gi], prefix = g.key === 'wk' ? 'wk' : 'ct', page = players[0];
    const details = page.locator(`[data-${prefix}-controls]`);
    if ((await details.getAttribute('open')) === null) await details.locator(':scope > summary').click();
    await tap(page, `[data-${prefix}-controls] [data-${prefix}-action="stop"]`);
    await page.locator(`[data-${prefix}-controls] [data-${prefix}-action="stop"].is-armed`).waitFor();
    await tap(page, `[data-${prefix}-controls] [data-${prefix}-action="stop"]`);
    await poll(async () => (await state(gi)).phase === 'finished'); await synchronized(gi, 'finished');
    check((await state(gi)).stopped === true, g.game + '-card-stop-before-switch');
    report.games.push(g.game);
  }
  try {
    saveRecovery(); progress('create-seven-fresh-exact-nodes'); await store.createAll();
    const { chromium } = require(playwrightPath);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--disable-background-timer-throttling'] });
    async function context(options, allowed, language) {
      const item = await browser.newContext(options); contexts.push(item); item.setDefaultTimeout(15000);
      await item.addInitScript(installBrowserGuard, { roots: allowed, tables: f.paths.slice(4) });
      await item.addInitScript(lang => { if (location.origin === 'https://livechat-two-alpha.vercel.app') localStorage.setItem('site-lang', lang); }, language);
      await item.route('**/*', route => {
        const url = new URL(route.request().url());
        if (/firebasedatabase\.app$|firebaseio\.com$/.test(url.hostname)) {
          if (url.pathname.startsWith('/.lp')) return route.abort();
          if (url.pathname.endsWith('.json') && !allowedPath({ paths: allowed }, decodeURIComponent(url.pathname.slice(1, -5)), true)) return route.abort();
        }
        return route.continue();
      });
      item.on('page', page => {
        pages.push(page);
        page.on('pageerror', () => report.pageErrors.push('production-page-javascript-error'));
      });
      return item;
    }
    hostContext = await context({ viewport: { width: 1280, height: 900 } }, f.paths, 'en');
    const boot = { code: f.code, tokens: f.tokens, names: f.names, playerCount: 4 };
    GAMES.forEach((g, i) => { boot[g.extra] = f.tableTokens[i]; });
    await hostContext.addInitScript(session => {
      if (location.origin !== 'https://livechat-two-alpha.vercel.app') return;
      localStorage.setItem('room-last-session', session.code);
      localStorage.setItem('room-session-' + session.code, JSON.stringify(session));
    }, boot);
    // Open the four original links before GO, so slow initial asset downloads
    // cannot consume the real twenty-second cast preview before we inspect it.
    progress('open-four-original-player-links');
    for (let i = 0; i < 4; i++) {
      const item = await context({ viewport: { width: i % 2 ? 320 : 390, height: i % 2 ? 568 : 844 }, isMobile: true, hasTouch: true }, [f.paths[i], ...f.paths.slice(4)], i % 2 ? 'zh' : 'en');
      const page = await item.newPage(); players.push(page);
      await page.goto(BASE + `play.html?s=${f.code}&p=${f.tokens[i]}&n=${encodeURIComponent(f.names[i])}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.locator('.theme-waiting').waitFor({ timeout: 45000 });
    }
    progress('wordlimit-host-start'); await openHost(0);
    await host.locator('#wl-minutes').selectOption('2'); await host.locator('#wl-shuffles').selectOption('0');
    await host.locator('input[name="wl-unit"][value="words"]').check();
    await tap(host, '#wl-start'); await poll(async () => (await state(0))?.phase === 'cast');
    check((await state(0)).round.runSince === null, 'wordlimit-cast-preview-does-not-run-scene-clock');
    await tap(host, '[data-host-action="close"]'); await started(0, 'scene'); await closeHost();
    let shown = await synchronized(0, 'scene');
    const first = shown[0].wl, initialDeadline = first.sceneEndsAt, order = first.speakingOrder.slice(), initialTurn = first.speakingTurn;
    check(order.length === 4 && new Set(order).size === 4 && first.speaker === order[0], 'wordlimit-one-saved-four-person-speaking-order');
    check(shown.every(v => v.wl.sceneEndsAt === initialDeadline), 'wordlimit-shared-global-scene-deadline');
    for (let turn = 0; turn < 4; turn++) {
      const n = order[turn], mine = shown[n - 1].wl.me;
      check(shown.filter(v => v.wl.me.canLine).length === 1 && mine.canLine, 'wordlimit-only-current-speaker-' + (turn + 1));
      const before = await state(0), score = Number(before.round.gained[n] || 0), worth = mine.worth;
      await tap(players[n - 1], '[data-ct-main] .wl-line-btn');
      await poll(async () => (await state(0)).round.speakingTurn === initialTurn + turn + 1);
      shown = await synchronized(0, 'scene');
      check(shown[n - 1].wl.me.gained === score + worth && shown[n - 1].wl.me.lines === 1, 'wordlimit-one-completed-line-one-score-' + (turn + 1));
      check(shown.every(v => v.wl.sceneEndsAt === initialDeadline && v.wl.speaker === order[(turn + 1) % 4]), 'wordlimit-handoff-keeps-scene-clock-' + (turn + 1));
    }
    const reloadedSpeaker = order[0], beforeReload = shown[reloadedSpeaker - 1].wl;
    await players[reloadedSpeaker - 1].reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    shown = await synchronized(0, 'scene');
    check(shown[reloadedSpeaker - 1].wl.speaker === reloadedSpeaker && shown[reloadedSpeaker - 1].wl.speakingTurn === beforeReload.speakingTurn &&
      shown[reloadedSpeaker - 1].wl.me.gained === beforeReload.me.gained && shown[reloadedSpeaker - 1].wl.sceneEndsAt === initialDeadline,
    'wordlimit-current-speaker-reload-preserves-floor-score-and-deadline');
    await poll(async () => Object.values((await store.read(4)).value?.presence || {}).filter(entry => entry?.actor === reloadedSpeaker).length === 1);
    check(true, 'wordlimit-reloaded-seat-has-one-live-presence');
    await screenshot(players[0], 'wordlimit-phone-390-en'); await screenshot(players[1], 'wordlimit-phone-320-zh');
    await endFromCard(0);

    progress('wordwolf-same-original-links'); await openHost(1); await tap(host, '#ww-start'); await started(1, 'describe'); await closeHost();
    shown = await synchronized(1, 'describe');
    const pair = (await state(1)).round.pairId, items = shown.map(v => v.ww.me.item.id), counts = Object.values(items.reduce((o, id) => ({ ...o, [id]: (o[id] || 0) + 1 }), {})).sort();
    check(JSON.stringify(counts) === '[1,3]', 'wordwolf-four-private-items-have-exactly-one-different');
    for (let i = 0; i < 4; i++) {
      check(shown[i].ww.result === null && !('odd' in shown[i].ww.me) && !('pairId' in shown[i].ww) && !('round' in shown[i].ww), 'wordwolf-no-pre-reveal-role-or-pair-' + (i + 1));
      check(await players[i].locator('[data-ct-main] [data-ww-item]').count() === 1 && await players[i].locator('[data-ct-main] [data-ww-item]').getAttribute('data-ww-item') === items[i], 'wordwolf-actual-own-item-only-' + (i + 1));
    }
    const picked = [];
    for (let i = 0; i < 4; i++) {
      const previous = (await state(1)).stage;
      await tap(players[0], '[data-ct-main] [data-ct-action="pick"]');
      await poll(async () => (await state(1)).stage > previous);
      shown = await synchronized(1, 'describe'); picked.push(shown[0].ww.picked);
    }
    check(new Set(picked).size === 4, 'wordwolf-random-pick-covers-everyone-before-repeat');
    await screenshot(players[0], 'wordwolf-private-phone-390-en'); await screenshot(players[1], 'wordwolf-private-phone-320-zh');
    await tap(players[0], '[data-ct-main] [data-ct-action="vote"]'); await poll(async () => (await state(1)).phase === 'vote'); await synchronized(1, 'vote');
    const odd = items.findIndex(id => items.filter(other => other === id).length === 1) + 1;
    for (let i = 0; i < 4; i++) {
      const target = i + 1 === odd ? (odd === 1 ? 2 : 1) : odd;
      await tap(players[i], `[data-ct-main] [data-ct-action="ballot"][data-ct-arg-target="${target}"]`);
      await poll(async () => { const s = await state(1); return s.phase === 'result' || Object.keys(s.round.votes).length === i + 1; });
    }
    shown = await synchronized(1, 'result');
    check(shown.every(v => v.ww.result.odd === odd && Object.keys(v.ww.result.votes).length === 4 && v.ww.result.winner === 'majority' && v.ww.result.cards.length === 4), 'wordwolf-all-four-votes-reveal-identical-full-result');
    await screenshot(players[1], 'wordwolf-reveal-phone-320-zh');
    await tap(players[0], '[data-ct-main] [data-ct-action="next"]'); await poll(async () => (await state(1)).phase === 'describe'); await synchronized(1, 'describe');
    check((await state(1)).round.pairId !== pair && (await state(1)).usedPairs.length === 2 && (await state(1)).history.length === 1, 'wordwolf-next-pair-is-new-with-one-result-only');
    await endFromCard(1);

    progress('whoknows-number-and-optional-broad-clue'); await openHost(2);
    check(await host.locator('#wk-target-kind').inputValue() === 'word' && !(await host.locator('#wk-broad-hint').isChecked()), 'whoknows-default-words-and-no-opening-clue');
    await host.locator('#wk-target-kind').selectOption('number'); await host.locator('#wk-broad-hint').check();
    await host.locator('#wk-number-max').selectOption('100'); await tap(host, '#wk-start'); await started(2, 'choose');
    shown = await synchronized(2, 'choose');
    const mayor = shown[0].wk.mayor, answerer = players[mayor - 1], others = [1, 2, 3, 4].filter(n => n !== mayor);
    check(shown.filter(v => list(v.wk.me.options).length).length === 1 && shown[mayor - 1].wk.me.options.every(o => o.kind === 'number'), 'whoknows-only-master-chooses-numeric-options');
    await tap(answerer, '.wk-option:first-child');
    // Close the optional host and let the real five-second countdown finish on
    // the cards. A slow network must not turn a delayed Start now click into a
    // click on the questions phase's different Close action.
    await closeHost(); await poll(async () => (await state(2)).phase === 'questions');
    shown = await synchronized(2, 'questions');
    check(shown.every(v => v.wk.targetKind === 'number' && !!v.wk.broadHint && !('numberMax' in v.wk.settings)), 'whoknows-synchronized-broad-clue-without-hidden-pool-setting');
    const hint = JSON.stringify(shown[0].wk.broadHint);
    check(shown.every(v => JSON.stringify(v.wk.broadHint) === hint), 'whoknows-one-frozen-opening-clue');
    check(shown.every(v => v.wk.broadHint.en === 'An integer from 1 to 100' && v.wk.broadHint.zh === '1 到 100 之間的整數'), 'whoknows-correct-bilingual-hundred-number-opening-clue');
    const chosenNumber = shown[mayor - 1].wk.me.word?.id;
    check(!!chosenNumber && shown.every(v => v.wk.word === null && (['master', 'insider'].includes(v.wk.me.role) ? v.wk.me.word?.id === chosenNumber : v.wk.me.word === null)), 'whoknows-number-secret-only-on-master-and-insider-projections');
    for (let i = 0; i < 4; i++) {
      check(await players[i].locator('[data-wk-opening-hint]').count() === 1, 'whoknows-actual-opening-clue-' + (i + 1));
      check(await players[i].locator('[data-wk-action="answer"]').count() === 0, 'whoknows-no-answer-buttons-before-question-' + (i + 1));
    }
    await tap(players[others[0] - 1], '[data-wk-action="raise"]');
    await poll(async () => (await state(2)).round.current?.playerNum === others[0]);
    await tap(players[others[1] - 1], '[data-wk-action="raise"]');
    await poll(async () => (await state(2)).round.queue.length === 1); shown = await synchronized(2, 'questions');
    check(shown.every((v, i) => v.wk.me.canAnswer === (i + 1 === mayor)), 'whoknows-only-master-can-answer');
    for (let i = 0; i < 4; i++) {
      const controls = players[i].locator('[data-wk-action="answer"]');
      check(await controls.count() === (i + 1 === mayor ? 2 : 0), 'whoknows-answer-controls-only-on-master-card-' + (i + 1));
      if (i + 1 === mayor) check(await players[i].locator('[data-wk-action="answer"][data-wk-arg-answer="spoken"]').count() === 1 &&
        await players[i].locator('[data-wk-action="answer"][data-wk-arg-answer="correct"]').count() === 1, 'whoknows-master-has-spoken-and-correct-controls');
    }
    await tap(answerer, '[data-wk-action="answer"][data-wk-arg-answer="spoken"]');
    await poll(async () => (await state(2)).round.current?.playerNum === others[1] && (await state(2)).round.log.length === 1);
    shown = await synchronized(2, 'questions');
    check(shown.every(v => v.wk.log[0].answer === 'spoken' && v.wk.current.playerNum === others[1] && v.wk.tokens.used === 0), 'whoknows-free-spoken-answer-advances-shared-queue-without-token-cost');
    await screenshot(answerer, 'whoknows-number-answerer');
    await tap(answerer, '.wk-correct'); await answerer.locator('.wk-correct.is-armed').waitFor();
    check((await state(2)).phase === 'questions', 'whoknows-one-correct-tap-does-not-end-guessing');
    await tap(answerer, '.wk-correct'); await poll(async () => (await state(2)).phase === 'speaking');
    shown = await synchronized(2, 'speaking');
    check(shown.every(v => v.wk.guess?.playerNum === others[1] && v.wk.word?.kind === 'number'), 'whoknows-confirmed-correct-preserves-existing-post-guess-flow');
    await screenshot(players[1], 'whoknows-number-found-phone-320-zh'); await endFromCard(2);
    for (const page of pages) if (!page.isClosed()) {
      check((await page.evaluate(() => window.__conversationQa?.violations || [])).length === 0, 'sdk-confined-to-seven-owned-node-subtrees');
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      check(!horizontalOverflow, 'phone-layout-without-horizontal-overflow');
    }
    check(report.pageErrors.length === 0, 'no-production-page-javascript-errors');
    report.gameplayVerified = true; report.ok = true; progress('verified-before-owned-cleanup');
  } catch (error) {
    report.ok = false; report.error = 'production_step_failed:' + report.step;
    // Raw Playwright errors can contain player URLs. Retain a bounded,
    // redacted diagnostic, never raw links, tokens, sessions or recovery data.
    let safe = String(error?.message || 'unknown_error');
    for (const secret of [f.code, f.marker, ...f.tokens, ...f.tableTokens]) safe = safe.split(secret).join('[redacted]');
    report.diagnostic = safe.replace(/https?:\/\/[^\s)]+/g, '[url]').replace(/[a-f0-9]{32}/gi, '[capability]').slice(0, 450);
  } finally {
    // Capture proof before closing contexts. A failed Start may have replaced
    // one pointer but not yet restored its marker; prove it from the exact
    // marked control and an actually observed browser session before stamping.
    try { await refreshProofs(); } catch (_) {}
    report.cleanup.disconnect = { attempted: 0, failed: 0 };
    for (const page of pages) if (!page.isClosed()) {
      report.cleanup.disconnect.attempted++;
      try { await page.evaluate(() => { if (window.firebase?.database) firebase.database().goOffline(); }); }
      catch (_) { report.cleanup.disconnect.failed++; }
    }
    // Let native onDisconnect settle while pages are still alive. This is a
    // bounded read-only wait; unknown/still-live presence is never forced out.
    try { report.cleanup.presenceWait = await waitForPresence({ store, attempted, proofs }); }
    catch (error) { report.cleanup.presenceWait = { limitMs: 30000, settled: false, reason: cleanupReason(error) }; }
    if (browser) {
      for (const item of contexts) { try { await item.close(); } catch (_) {} }
      try { await browser.close(); } catch (_) {}
    }
    progress('conditional-seven-node-cleanup');
    // All SDKs and contexts are closed before conditional deletion. Every
    // proof/ETag used below is read again after closure.
    for (let i = 4; i < 7; i++) if (attempted.has(i)) {
      try { proofs[i] = (await store.read(i)).value; }
      catch (error) { report.cleanup.nodes.push({ index: i, kind: GAMES[i - 4].game + '-table', status: 'proof-read-failed', reason: cleanupReason(error) }); }
    }
    for (let i = 0; i < 4; i++) if (attempted.has(i)) {
      try { await store.restoreMarker(i); report.cleanup.markerRestores.push({ index: i, status: 'owned' }); }
      catch (error) { report.cleanup.markerRestores.push({ index: i, status: 'refused', reason: cleanupReason(error) }); }
    }
    report.cleanup.tracked = attempted.size;
    // Originals first: their proof refers to the still-present marked tables.
    for (let i = 0; i < 7; i++) if (attempted.has(i)) {
      const kind = i < 4 ? 'original-player-' + (i + 1) : GAMES[i - 4].game + '-table';
      try { const status = await store.remove(i); report.cleanup[status]++; report.cleanup.nodes.push({ index: i, kind, status }); }
      catch (error) { report.cleanup.failed++; report.ok = false; report.cleanup.nodes.push({ index: i, kind, status: 'failed', reason: cleanupReason(error) }); }
    }
    saveRecovery(); report.passed = report.checks.length; report.exactRestRequests = store.requests();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

async function selfTest() {
  const f = fixture(), sessions = Array.from({ length: 7 }, () => new Set()), proofs = {};
  assert.equal(f.paths.length, 7); assert.equal(new Set(f.paths).size, 7);
  for (const token of [...f.tokens, ...f.tableTokens]) assert.match(token, /^[a-f0-9]{32}$/);
  assert.ok(f.paths.every(p => allowedPath(f, p)));
  for (const p of ['', 'rooms', `rooms/${f.code}`, `rooms/${f.code}/players`, f.paths[0] + '-other', f.paths[0] + '/../../foreign', 'rooms/OTHER/players/' + f.tokens[0]]) assert.equal(allowedPath(f, p, true), false);
  assert.equal(allowedPath(f, f.paths[4] + '/stateJson'), false);
  assert.equal(allowedPath(f, f.paths[4] + '/presence/client', true), true);
  assert.equal(outsideHub(path.join(HUB, 'qa-output')), false);
  assert.equal(outsideHub(HUB), false); assert.equal(outsideHub(path.join(HUB, '..', 'conversation-production-qa')), true);
  let checks = 12;
  for (let gi = 0; gi < 3; gi++) {
    const g = GAMES[gi], index = gi + 4, sessionId = uid(); sessions[index].add(sessionId);
    proofs[index] = { qaConversationCards: nodeStamp(f, index), stateJson: JSON.stringify({ version: 1, sessionId, roster: f.names.map((name, i) => ({ name, playerNum: i + 1 })) }) };
    const original = { game: g.game, playerNum: 1, name: f.names[0], [g.key]: { version: g.pointerVersion, table: f.tableTokens[gi] }, qaConversationCards: nodeStamp(f, 0) };
    assert.ok(owned(original, f, 0, proofs, sessions)); assert.ok(owned(proofs[index], f, index, proofs, sessions));
    assert.equal(owned({ ...original, qaConversationCards: { ...original.qaConversationCards, marker: 'foreign' } }, f, 0, proofs, sessions), false);
    assert.equal(pointerProof({ ...original, [g.key]: { ...original[g.key], table: uid() } }, f, 0, proofs, sessions), false);
    assert.equal(pointerProof({ ...original, playerNum: 2 }, f, 0, proofs, sessions), false);
    const foreignSessions = sessions.map(() => new Set()); assert.equal(owned(proofs[index], f, index, proofs, foreignSessions), false);
    assert.equal(owned({ ...proofs[index], stateJson: '{invalid' }, f, index, proofs, sessions), false);
    checks += 7;
  }
  // Exercise the exact production browser guard without opening a browser or
  // connecting to Firebase, including its transaction/session observation.
  const vm = require('node:vm'), sent = [];
  class FakeSocket { constructor() { this.url = 'wss://qa.firebaseio.com/.ws'; } send(data) { sent.push(data); } }
  const sandbox = { window: {}, WebSocket: FakeSocket }; vm.createContext(sandbox);
  vm.runInContext('(' + installBrowserGuard.toString() + ')(' + JSON.stringify({ roots: f.paths, tables: f.paths.slice(4) }) + ')', sandbox);
  const socket = new sandbox.WebSocket();
  socket.send(JSON.stringify({ d: { a: 'p', b: { p: f.paths[4] + '/stateJson', d: proofs[4].stateJson } } }));
  assert.equal(sandbox.window.__conversationQa.sessions.length, 1); assert.equal(sent.length, 1);
  assert.throws(() => socket.send(JSON.stringify({ d: { a: 'q', b: { p: `rooms/${f.code}/players` } } })), /qa_outside/);
  assert.throws(() => socket.send(JSON.stringify({ d: { a: 'm', b: { p: f.paths[0], d: { '../../foreign': true } } } })), /qa_outside/);
  assert.throws(() => socket.send(JSON.stringify({ d: { a: 'p', b: { p: '.info/connected', d: true } } })), /qa_outside/);
  assert.equal(sent.length, 1); checks += 6;
  function mockStore(initial = {}, beforeWrite = () => {}) {
    const nodes = new Map(Object.entries(initial)), versions = new Map(), calls = [], attempted = new Set();
    const etag = index => '"version-' + (versions.get(index) || 0) + '"';
    const fetchImpl = async (url, options) => {
      const p = decodeURIComponent(new URL(url).pathname.slice(1, -5)), index = f.paths.indexOf(p);
      assert.ok(index >= 0, 'mock_refuses_unallowlisted_network_target'); calls.push({ index, method: options.method || 'GET', conditional: options.headers['If-Match'] });
      if (options.method) beforeWrite({ index, options, nodes, versions });
      if (options.method && options.headers['If-Match'] !== etag(index)) return { ok: false, status: 412 };
      if (options.method === 'PUT') { nodes.set(p, JSON.parse(options.body)); versions.set(index, (versions.get(index) || 0) + 1); }
      if (options.method === 'DELETE') { nodes.delete(p); versions.set(index, (versions.get(index) || 0) + 1); }
      return { ok: true, status: 200, headers: { get: key => key.toLowerCase() === 'etag' ? etag(index) : null }, json: async () => nodes.get(p) ?? null };
    };
    return { nodes, versions, calls, attempted, store: makeStore({ f, fetchImpl, attempted, saveRecovery() {}, sessions, proofs }) };
  }
  const collision = mockStore({ [f.paths[6]]: { preexisting: true } });
  await assert.rejects(collision.store.createAll(), /fresh_node_collision/);
  assert.equal(collision.calls.filter(c => c.method !== 'GET').length, 0); assert.equal(collision.attempted.size, 0); checks += 3;
  const fresh = mockStore(); await fresh.store.createAll();
  assert.equal(fresh.nodes.size, 7); assert.equal(fresh.attempted.size, 7);
  assert.ok(fresh.calls.filter(c => c.method === 'PUT').every(c => c.conditional === '"version-0"'));
  await assert.rejects(fresh.store.read(7), /outside_exact/);
  fresh.nodes.set(f.paths[4], proofs[4]);
  const pointer = { game: 'wordlimit', playerNum: 1, name: f.names[0], wl: { version: 1, table: f.tableTokens[0] } };
  fresh.nodes.set(f.paths[0], pointer); await fresh.store.restoreMarker(0);
  assert.ok(hasStamp(fresh.nodes.get(f.paths[0]), f, 0));
  fresh.nodes.set(f.paths[1], { ...pointer, playerNum: 2, name: f.names[1], wl: { version: 1, table: uid() } });
  await assert.rejects(fresh.store.restoreMarker(1), /ownership_not_proven/);
  await assert.rejects(fresh.store.remove(1), /ownership_cleanup_refused/);
  fresh.nodes.set(f.paths[2], { qaConversationCards: { ...nodeStamp(f, 2), marker: 'foreign' } });
  await assert.rejects(fresh.store.remove(2), /ownership_cleanup_refused/);
  assert.equal(await fresh.store.remove(0), 'deleted');
  assert.ok(fresh.calls.filter(c => c.method === 'DELETE').every(c => typeof c.conditional === 'string'));
  assert.ok(fresh.nodes.has(f.paths[1]) && fresh.nodes.has(f.paths[2]), 'foreign_nodes_were_preserved'); checks += 11;
  // An ETag can become stale after the proof read. Never retry an uncertain
  // DELETE unconditionally or overwrite a node that won a creation race.
  const createRace = mockStore({}, ({ index, options, nodes, versions }) => {
    if (index === 0 && options.method === 'PUT') { nodes.set(f.paths[0], { foreign: true }); versions.set(0, 1); }
  });
  await assert.rejects(createRace.store.createAll(), /conditional_fresh_node_create_failed/);
  assert.deepEqual(createRace.nodes.get(f.paths[0]), { foreign: true });
  assert.equal(createRace.attempted.size, 1);
  await assert.rejects(createRace.store.remove(0), /ownership_cleanup_refused/);
  const deleteRace = mockStore({}, ({ index, options, nodes, versions }) => {
    if (index === 0 && options.method === 'DELETE') { nodes.set(f.paths[0], { foreign: true }); versions.set(0, (versions.get(0) || 0) + 1); }
  });
  await deleteRace.store.createAll(); await assert.rejects(deleteRace.store.remove(0), /conditional_cleanup_conflict/);
  assert.deepEqual(deleteRace.nodes.get(f.paths[0]), { foreign: true });
  const presence = mockStore(); await presence.store.createAll();
  presence.nodes.set(f.paths[4], { ...proofs[4], presence: { connected: { actor: 1 } } });
  await assert.rejects(presence.store.remove(4), /active_presence_cleanup_refused/);
  assert.ok(presence.nodes.has(f.paths[4]));
  const clean = mockStore(); await clean.store.createAll();
  for (let i = 0; i < 7; i++) assert.equal(await clean.store.remove(i), 'deleted');
  assert.equal(clean.nodes.size, 0); checks += 16;
  // Presence cleanup can take longer than the old eight-second budget. Wait
  // at most thirty seconds in total, and never turn a timeout into a removal.
  let elapsed = 0, reads = 0;
  const presenceProofs = {}, presenceAttempts = new Set([4, 5, 6]);
  const delayedPresence = await waitForPresence({ attempted: presenceAttempts, proofs: presenceProofs, now: () => elapsed,
    sleepImpl: async ms => { elapsed += ms; }, store: { read: async (index, options) => {
      assert.ok([4, 5, 6].includes(index)); assert.ok(options.timeoutMs > 0 && options.timeoutMs <= 30000); reads++;
      return { value: elapsed < 10500 ? { presence: { nativeClient: { actor: index - 4 } } } : {} };
    } } });
  assert.equal(delayedPresence.settled, true); assert.ok(delayedPresence.elapsedMs >= 10500 && delayedPresence.elapsedMs <= 30000); assert.ok(reads > 3);
  elapsed = 0;
  const heldPresence = await waitForPresence({ attempted: new Set([6]), proofs: {}, now: () => elapsed,
    sleepImpl: async ms => { elapsed += ms; }, store: { read: async () => ({ value: { presence: { unknownClient: { actor: 0 } } } }) } });
  assert.equal(heldPresence.settled, false); assert.equal(heldPresence.elapsedMs, 30000); assert.deepEqual(heldPresence.remaining, [{ index: 6, count: 1 }]);
  assert.equal(cleanupReason(Error('ownership_cleanup_refused')), 'ownership_cleanup_refused');
  assert.equal(cleanupReason(Error('https://private.invalid/' + uid())), 'exact_node_transport_failed'); checks += 8;
  await assert.rejects(run(), /live_flag_required/); checks++;
  return { ok: true, offlineOnly: true, exactNodes: 7, games: GAMES.map(g => g.game), safetyChecks: checks, noNetworkRequests: true, liveRunPerformed: false };
}
module.exports = { run, fixture, allowedPath, outsideHub, owned, pointerProof, tableProof, cleanupReason, waitForPresence, makeStore, installBrowserGuard, selfTest };
if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest().then(result => console.log(JSON.stringify(result))).catch(() => { console.log('{"ok":false,"reason":"offline_self_test_failed"}'); process.exitCode = 1; });
  else if (!process.argv.includes('--live')) { console.log('{"ok":false,"reason":"live_flag_required"}'); process.exitCode = 1; }
  else run({ live: true, playwrightPath: process.argv.find((value, index) => index > 1 && value !== '--live') || 'playwright' })
    .then(report => { console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1; })
    .catch(() => { console.log('{"ok":false,"reason":"production_qa_setup_failed"}'); process.exitCode = 1; });
}
