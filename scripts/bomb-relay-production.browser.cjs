'use strict';
/* Real production pages + real Firebase SDK, only four newly owned QA nodes.
 * Prepare/review: node scripts/bomb-relay-production.browser.cjs --self-test
 * Explicit live run (after release): node scripts/bomb-relay-production.browser.cjs --live <playwright-package>
 * No room/list reads, no parent writes, no credentials, no fake timer or engine.
 */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const BASE = 'https://livechat-two-alpha.vercel.app/';
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const uid = () => randomBytes(16).toString('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
const canonical = node => typeof node?.stateJson === 'string' ? JSON.parse(node.stateJson) : null;

function fixture() {
  const code = 'BQ' + randomBytes(4).toString('hex').toUpperCase(), marker = uid();
  const controlToken = uid(), tokens = [uid(), uid(), uid()];
  const names = ['Disposable Bomb QA 1', 'Disposable Bomb QA 2', 'Disposable Bomb QA 3'];
  const paths = [controlToken, ...tokens].map(token => `rooms/${code}/players/${token}`);
  return { code, marker, controlToken, tokens, names, paths };
}
function nodeStamp(f, number) { return { marker: f.marker, code: f.code, kind: 'bomb-v2-production-qa', number }; }
function hasStamp(value, f, number) {
  const stamp = value?.qaBombV2;
  return stamp?.marker === f.marker && stamp.code === f.code && stamp.kind === 'bomb-v2-production-qa' && stamp.number === number;
}
function allowedPath(f, target) { return f.paths.includes(target); }
function leaseReleasedOrExpired(value, localNowMs, serverTimeOffsetMs) {
  const lease = value?.leaseUntil;
  return lease === 0 || (Number.isFinite(lease) && lease > 0 && lease <= Math.round(localNowMs + serverTimeOffsetMs));
}
function owned(value, f, number, sessions, owners) {
  if (!hasStamp(value, f, number)) return false;
  if (number === 0) {
    if (value.owner && !owners.has(value.owner)) return false;
    const state = canonical(value);
    return state ? sessions.has(state.sessionId) : !value.stateJson && !value.state;
  }
  if (value.game === 'qa-fixture') return value.playerNum === number && !value.bomb;
  return value.game === 'bombrelay' && value.playerNum === number && sessions.has(value.bomb?.sessionId);
}

async function run({ playwrightPath = 'playwright', fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const f = fixture(), attempted = new Set(), sessions = new Set(), owners = new Set();
  const output = path.resolve(process.env.BOMB_PROD_QA_OUTPUT || path.join(__dirname, '..', '..', 'bomb-production-qa', f.code));
  fs.mkdirSync(output, { recursive: true });
  const report = { ok: false, checks: [], step: 'prepare', screenshots: [], pageErrors: [],
    realFirebase: true, realProductionPages: true, realTimeDeadline: true,
    humanVoicePlaytest: false, physicalPhoneTest: false, hardwareAudioVerified: false,
    cleanup: { tracked: 0, deleted: 0, empty: 0, failed: 0 }, output };
  const check = (condition, label) => { if (!condition) { report.failureCheck = label; throw new Error(label); } report.checks.push(label); };
  const progress = step => { report.step = step; process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step, checks: report.checks.length }) + '\n'); };
  const recoveryFile = path.join(output, 'fixture-owned.json');
  function saveRecovery() {
    fs.writeFileSync(recoveryFile, JSON.stringify({ fixture: f, attempted: [...attempted], sessions: [...sessions], owners: [...owners] }, null, 2) + '\n');
  }
  const http = (url, options = {}) => fetchImpl(url, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000), ...options });
  const exactUrl = number => {
    const target = f.paths[number];
    if (!allowedPath(f, target)) throw new Error('outside_exact_node_allowlist');
    return `${DATABASE}/${target}.json`;
  };
  async function read(number) {
    const response = await http(exactUrl(number), { headers: { 'X-Firebase-ETag': 'true' } });
    if (!response.ok || !response.headers.get('etag')) throw new Error('exact_node_read_failed');
    return { value: await response.json(), etag: response.headers.get('etag') };
  }
  async function create(number) {
    const before = await read(number);
    if (before.value !== null) throw new Error('fresh_node_collision');
    const value = number === 0 ? { qaBombV2: nodeStamp(f, number) }
      : { game: 'qa-fixture', playerNum: number, name: f.names[number - 1], qaBombV2: nodeStamp(f, number) };
    // Track BEFORE PUT: a network failure can leave an uncertain committed write.
    attempted.add(f.paths[number]); saveRecovery();
    const response = await http(exactUrl(number), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': before.etag }, body: JSON.stringify(value) });
    if (!response.ok) throw new Error('conditional_fresh_node_create_failed');
  }
  async function restorePlayerMarker(number, sessionId) {
    // Fresh first projection replaces the fixture marker. Reattach it only to
    // the exact new projection whose session is proven by our marked control.
    if (!sessions.has(sessionId)) throw new Error('unknown_fixture_session');
    for (let attempt = 0; attempt < 6; attempt++) {
      const before = await read(number), value = before.value;
      if (value?.game !== 'bombrelay' || value.playerNum !== number || value.name !== f.names[number - 1] || value.bomb?.sessionId !== sessionId) throw new Error('projection_ownership_not_proven');
      if (value.qaBombV2 && !hasStamp(value, f, number)) throw new Error('foreign_projection_marker');
      if (hasStamp(value, f, number)) return;
      const response = await http(exactUrl(number), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': before.etag },
        body: JSON.stringify({ ...value, qaBombV2: nodeStamp(f, number) }) });
      if (response.status === 412) continue;
      if (!response.ok) throw new Error('projection_marker_write_failed');
      return;
    }
    throw new Error('projection_marker_conflict');
  }
  let browser, hostContext, host, players = [], contexts = [], serverTimeOffsetMs = 0;
  async function captureOwners() {
    if (!host || host.isClosed()) return;
    // Read-only transport observation: these owners were actually sent by this
    // browser to the exact marked control path; no RNG/state is substituted.
    const sent = await host.evaluate(() => (window.__bombQaOwners || []).slice());
    for (const owner of sent) if (/^[a-f0-9]{32}$/.test(owner)) owners.add(owner);
    saveRecovery();
  }
  async function state() { return host.evaluate(() => structuredClone(BOMB_RELAY_HOST.state)); }
  async function failureDiagnostic() {
    const result = { stage: report.step, capturedAtMs: now(), serverTimeOffsetMs, knownOwnerCount: owners.size, knownSessionCount: sessions.size };
    try {
      const current = await state();
      result.host = { phase: current?.phase || null, turnId: current?.turnId, cardIndex: current?.cardIndex,
        passes: current?.passes, explodeAt: current?.explodeAt, initialGoDeadline: current?.roundFuse?.explodeAtMs };
      result.hostStatus = await host.locator('#br-status').textContent();
    } catch (_) { result.host = { unavailable: true }; }
    try {
      const node = (await read(0)).value, current = canonical(node);
      result.control = { markerMatches: hasStamp(node, f, 0), ownerKnown: owners.has(node?.owner),
        sessionKnown: sessions.has(current?.sessionId), leaseUntil: node?.leaseUntil,
        leaseRemainingMs: Number.isFinite(node?.leaseUntil) ? Math.max(0, node.leaseUntil - Math.round(now() + serverTimeOffsetMs)) : null,
        phase: current?.phase || null, explodeAt: current?.explodeAt, turnId: current?.turnId };
    } catch (_) { result.control = { unavailable: true }; }
    return result;
  }
  async function poll(predicate, timeout = 30000) {
    const end = now() + timeout;
    do { if (await predicate()) return; await sleep(150); } while (now() < end);
    throw new Error('production_state_timeout:' + report.step);
  }
  async function card(number) {
    return players[number - 1].evaluate(async exact => (await firebase.database().ref(exact).once('value')).val(), f.paths[number]);
  }
  async function samePlayers(expectedPhase) {
    const current = await state(), id = current.order[current.cardIndex];
    await poll(async () => {
      const cards = await Promise.all([1, 2, 3].map(card));
      return cards.every(node => node?.bomb?.sessionId === current.sessionId && node.bomb.turnId === current.turnId && node.bomb.phase === expectedPhase);
    });
    const cards = await Promise.all([1, 2, 3].map(card));
    for (let number = 1; number <= 3; number++) {
      const node = cards[number - 1];
      check(owned(node, f, number, sessions, owners), `player-${number}-owned-${expectedPhase}`);
      check(node.bomb.cardId === id, `player-${number}-same-prompt-${expectedPhase}`);
      // Realtime Database omits null-valued children in the boom projection.
      check((node.bomb.holder ?? null) === (['ready', 'ticking', 'paused'].includes(expectedPhase) ? current.holder : null), `player-${number}-same-holder-${expectedPhase}`);
      check(!/"(?:roundFuse|roundId|explodeAt|remainingMs|litAt|durationMs|startedAtMs|explodeAtMs)"\s*:/.test(JSON.stringify(node.bomb)), `player-${number}-private-timing-${expectedPhase}`);
      const shown = await players[number - 1].locator('.br-scene-title[data-br-prompt-id]').getAttribute('data-br-prompt-id');
      check(shown === id, `player-${number}-actual-dom-prompt-${expectedPhase}`);
    }
    return cards;
  }
  async function screenshot(page, label) {
    const file = label + '.png'; await page.screenshot({ path: path.join(output, file), fullPage: true }); report.screenshots.push(file);
  }
  async function tapHolder(type) {
    const before = await state();
    await players[before.holder - 1].locator(`[data-br-action="${type}"]`).click({ force: true });
    await poll(async () => (await state()).turnId !== before.turnId);
    return state();
  }
  try {
    saveRecovery();
    progress('create-four-fresh-exact-nodes');
    for (const number of [0, 1, 2, 3]) await create(number);
    const { chromium } = require(playwrightPath);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--disable-background-timer-throttling'] });
    const boot = { code: f.code, tokens: f.tokens, names: f.names, playerCount: 3, bombRelayControlToken: f.controlToken };
    async function context(options, allowed) {
      const item = await browser.newContext(options); contexts.push(item);
      await item.addInitScript(({ allowed, control, marker }) => {
        window.__bombQaOwners = []; window.__bombQaViolations = []; window.__bombQaPaths = [];
        const originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function (payload) {
          let frame; try { frame = JSON.parse(payload); } catch (_) { return originalSend.call(this, payload); }
          const body = frame?.d?.b;
          if (typeof body?.p === 'string') {
            const target = body.p.replace(/^\/+|\/+$/g, '');
            if (!allowed.includes(target) && !['.info/connected', '.info/serverTimeOffset'].includes(target)) {
              window.__bombQaViolations.push('outside_exact_node_allowlist'); throw new Error('QA refused non-allowlisted Firebase path');
            }
            if (allowed.includes(target)) window.__bombQaPaths.push(target);
            if (target === control && body.d?.qaBombV2?.marker === marker && /^[a-f0-9]{32}$/.test(body.d?.owner || '')) window.__bombQaOwners.push(body.d.owner);
          }
          return originalSend.call(this, payload);
        };
      }, { allowed, control: f.paths[0], marker: f.marker });
      // Fail closed if SDK falls back to uninspected JSONP/long-poll traffic.
      await item.route('**/*', route => {
        const url = new URL(route.request().url());
        if (/firebasedatabase\.app$|firebaseio\.com$/.test(url.hostname) && url.pathname.startsWith('/.lp')) return route.abort();
        return route.continue();
      });
      item.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message.slice(0, 160))));
      return item;
    }
    hostContext = await context({ viewport: { width: 1280, height: 900 } }, f.paths);
    await hostContext.addInitScript(session => {
      if (location.origin !== 'https://livechat-two-alpha.vercel.app') return;
      localStorage.setItem('room-last-session', session.code);
      localStorage.setItem('room-session-' + session.code, JSON.stringify(session));
      localStorage.setItem('icebreak-lang', 'en');
    }, boot);
    host = await hostContext.newPage();
    progress('load-real-host-default-normal');
    await host.goto(BASE + 'bomb-relay.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await host.locator('#br-start:not([disabled])').waitFor({ timeout: 45000 });
    await captureOwners();
    check(await host.locator('#br-fuse').inputValue() === 'normal', 'new-room-default-normal');
    check(await host.locator('#br-scale').isChecked(), 'new-room-default-scaling-on');
    check(await host.evaluate(() => BOMB_RELAY_DECK.items.length) === 720, 'real-host-loaded-720-prompts');
    check(await host.evaluate(() => !!BOMB_RELAY_DECK.get('tb-everyday-360') && !!BOMB_RELAY_DECK.get('tb-playful-360')), 'real-host-loaded-both-expanded-pack-tails');
    await host.locator('#br-start').click();
    await poll(async () => (await state())?.phase === 'ready');
    await captureOwners();
    const control = (await read(0)).value;
    check(hasStamp(control, f, 0) && owners.has(control.owner), 'created-control-marker-and-browser-owner');
    sessions.add(canonical(control).sessionId); saveRecovery();
    for (const number of [1, 2, 3]) {
      await poll(async () => (await read(number)).value?.bomb?.sessionId === canonical(control).sessionId);
      await restorePlayerMarker(number, canonical(control).sessionId);
    }
    const ready = await state();
    check(ready.roundFuse === null && ready.explodeAt === null && ready.litAt === null, 'ready-does-not-start-fuse');
    for (const [index, width] of [320, 375, 390].entries()) {
      const item = await context({ viewport: { width, height: width === 320 ? 568 : 740 }, isMobile: true, hasTouch: true }, [f.paths[index + 1]]);
      const page = await item.newPage(); players.push(page);
      await page.goto(BASE + `play.html?s=${f.code}&p=${f.tokens[index]}&n=${encodeURIComponent(f.names[index])}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.locator('.br-scene-title[data-br-prompt-id]').waitFor({ timeout: 45000 });
      await page.evaluate(lang => I18N.setLang(lang), index === 1 ? 'zh' : 'en');
    }
    await samePlayers('ready');
    for (let attempt = 0; Number((await state()).order[0].split('-').at(-1)) <= 60 && attempt < 12; attempt++) {
      const turn = (await state()).turnId; await host.locator('#br-reroll').click(); await poll(async () => (await state()).turnId !== turn);
    }
    const selected = await state();
    check(Number(selected.order[0].split('-').at(-1)) > 60, 'authority-actually-revealed-new-expansion-prompt');
    await samePlayers('ready'); await screenshot(host, 'host-ready');
    for (let index = 0; index < players.length; index++) await screenshot(players[index], `player-${index + 1}-ready`);
    progress('real-go-and-six-player-link-passes');
    const first = await tapHolder('light'), deadline = first.explodeAt, promptId = first.order[0], snapshot = JSON.stringify(first.roundFuse);
    check(first.roundFuse.speedModeAtStart === 'normal' && first.roundFuse.scaleWithPlayersAtStart === true && first.roundFuse.activePlayerCountAtStart === 3, 'normal-go-snapshot-three-eligible-players');
    check(first.roundFuse.minMsAtStart === 60000 && first.roundFuse.maxMsAtStart === 100000 && first.roundFuse.durationMs >= 60000 && first.roundFuse.durationMs <= 100000, 'normal-go-real-60-to-100-seconds');
    report.realFuseDurationMs = first.roundFuse.durationMs;
    for (let pass = 0; pass < 6; pass++) {
      const next = await tapHolder('pass');
      check(next.explodeAt === deadline && JSON.stringify(next.roundFuse) === snapshot && next.order[0] === promptId, `pass-${pass + 1}-keeps-prompt-and-deadline`);
      await samePlayers('ticking');
    }
    for (let index = 0; index < players.length; index++) await screenshot(players[index], `player-${index + 1}-ticking`);
    progress('pending-fast-off-and-real-host-reload');
    await host.locator('#br-manage-open').click();
    await host.locator('#br-manage-speed').selectOption('fast');
    await poll(async () => (await state()).settingsTiming.speedMode === 'fast');
    await host.locator('#br-manage-scale').setChecked(false);
    await poll(async () => (await state()).settingsTiming.scaleWithPlayers === false);
    await host.locator('#br-manage .br-dialog-header button').click();
    check((await state()).explodeAt === deadline && JSON.stringify((await state()).roundFuse) === snapshot, 'pending-preferences-do-not-change-live-fuse');
    await captureOwners();
    serverTimeOffsetMs = await host.evaluate(async () => Number((await firebase.database().ref('.info/serverTimeOffset').once('value')).val()) || 0);
    const beforeClose = (await read(0)).value, pagehideAtMs = now();
    report.hostReconnection = { pagehideAtMs, initialLeaseUntil: beforeClose?.leaseUntil, serverTimeOffsetMs };
    progress('host-pagehide-close');
    // close() releases the lease best-effort. A disconnected transaction may
    // leave the normal 14 s lease to expire; neither path permits a new fuse.
    await host.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    progress('host-wait-released-or-expired-lease');
    let lastLeaseProgress = 0;
    await poll(async () => {
      const node = (await read(0)).value, current = canonical(node);
      if (!hasStamp(node, f, 0) || !owners.has(node?.owner) || !sessions.has(current?.sessionId)) throw new Error('lease_wait_ownership_changed');
      const ready = leaseReleasedOrExpired(node, now(), serverTimeOffsetMs);
      if (now() - lastLeaseProgress >= 4000) {
        lastLeaseProgress = now();
        process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step: report.step,
          waitElapsedMs: now() - pagehideAtMs, leaseRemainingMs: Math.max(0, node.leaseUntil - Math.round(now() + serverTimeOffsetMs)),
          ownerKnown: owners.has(node.owner), phase: current.phase }) + '\n');
      }
      if (ready) {
        report.hostReconnection.leaseWaitMs = now() - pagehideAtMs;
        report.hostReconnection.leaseEnd = node.leaseUntil === 0 ? 'released' : 'normally-expired';
      }
      return ready;
    }, 20000);
    progress('host-real-reload-and-lease-reacquire');
    await host.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await poll(async () => (await state())?.phase === 'ticking');
    await host.locator('#br-manage-open:not([disabled])').waitFor({ timeout: 30000 });
    await captureOwners();
    progress('host-reload-deadline-and-pending-settings-check');
    check((await state()).explodeAt === deadline && JSON.stringify((await state()).roundFuse) === snapshot, 'host-reload-resumes-original-deadline-and-go-snapshot');
    check((await state()).settingsTiming.speedMode === 'fast' && (await state()).settingsTiming.scaleWithPlayers === false, 'pending-preferences-survive-host-reload');
    await samePlayers('ticking');
    progress('wait-actual-saved-deadline-no-fake-clock');
    let lastProgress = 0;
    await poll(async () => {
      const current = await state();
      if (now() - lastProgress >= 10000) {
        lastProgress = now(); process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step: report.step, elapsedMs: Math.max(0, now() - first.litAt), approximateRemainingMs: Math.max(0, deadline - now()) }) + '\n');
      }
      return current.phase === 'boom';
    }, Math.max(15000, deadline - now() + 15000));
    const boom = await state(), views = await samePlayers('boom');
    check(boom.order[0] === promptId && boom.history.length === 1 && Object.values(boom.penalties).reduce((sum, cards) => sum + list(cards).length, 0) === 1, 'real-auto-explosion-settles-exactly-one-penalty');
    for (let index = 0; index < views.length; index++) {
      check(views[index].bomb.boom.loser === boom.boom.loser && views[index].bomb.standings.reduce((sum, row) => sum + row.count, 0) === 1, `player-${index + 1}-same-auto-explosion-and-score`);
      await screenshot(players[index], `player-${index + 1}-boom`);
    }
    await screenshot(host, 'host-boom');
    report.observedAutomaticExplosion = true;
    await poll(async () => (await state()).phase === 'ready' && (await state()).cardIndex === 1);
    progress('next-go-uses-fast-off-then-stop');
    const second = await tapHolder('light');
    check(second.roundFuse.speedModeAtStart === 'fast' && second.roundFuse.scaleWithPlayersAtStart === false && second.roundFuse.minMsAtStart === 30000 && second.roundFuse.maxMsAtStart === 60000, 'next-go-applies-pending-fast-off');
    check(second.promptHistory.seenIds.includes(promptId) && second.order[1] !== promptId, 'next-prompt-preserves-activity-history');
    await samePlayers('ticking');
    await host.locator('#br-manage-open').click(); await host.locator('#br-stop').click();
    await poll(async () => (await state()).phase === 'finished');
    check((await state()).history.length === 1 && (await state()).explodeAt === null, 'stop-cancels-second-fuse-without-extra-penalty');
    for (const item of contexts) for (const page of item.pages()) {
      const violations = await page.evaluate(() => (window.__bombQaViolations || []).slice());
      check(violations.length === 0, 'browser-sdk-used-only-allowlisted-exact-nodes');
    }
    check(report.pageErrors.length === 0, 'no-production-page-javascript-errors');
    report.ok = true; progress('verified-before-owned-cleanup');
  } catch (error) {
    report.ok = false; report.error = error.message.slice(0, 200);
    report.failureDiagnostic = await failureDiagnostic();
  } finally {
    try { await captureOwners(); } catch (_) {}
    // A failed assertion can occur between the first fresh projection and its
    // marker restoration. Recover only a session proved by BOTH our marker and
    // an owner actually observed leaving our host browser, never a foreign node.
    try {
      const proof = (await read(0)).value, saved = canonical(proof);
      if (hasStamp(proof, f, 0) && owners.has(proof.owner) && typeof saved?.sessionId === 'string') {
        sessions.add(saved.sessionId); saveRecovery();
        for (const number of [1, 2, 3]) {
          if (!attempted.has(f.paths[number])) continue;
          const before = (await read(number)).value;
          if (!before?.qaBombV2 && before?.game === 'bombrelay' && before.playerNum === number && before.name === f.names[number - 1] && before.bomb?.sessionId === saved.sessionId) {
            await restorePlayerMarker(number, saved.sessionId);
          }
        }
      }
    } catch (_) {}
    if (host && !host.isClosed()) {
      try { await host.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await sleep(700); } catch (_) {}
    }
    if (browser) { try { await browser.close(); } catch (_) {} }
    progress('conditional-exact-node-cleanup');
    report.cleanup.tracked = attempted.size;
    for (const number of [0, 1, 2, 3]) {
      if (!attempted.has(f.paths[number])) continue;
      try {
        const before = await read(number);
        if (before.value === null) { report.cleanup.empty++; continue; }
        if (!owned(before.value, f, number, sessions, owners)) throw new Error('ownership_cleanup_refused');
        const response = await http(exactUrl(number), { method: 'DELETE', headers: { 'If-Match': before.etag } });
        if (!response.ok) throw new Error('conditional_cleanup_failed');
        report.cleanup.deleted++;
      } catch (_) { report.cleanup.failed++; report.ok = false; }
    }
    saveRecovery(); report.passed = report.checks.length;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

function selfTest() {
  const f = fixture(), sessions = new Set(['test-session']), owners = new Set(['a'.repeat(32)]);
  assert.equal(new Set(f.paths).size, 4);
  for (const token of [f.controlToken, ...f.tokens]) assert.match(token, /^[a-f0-9]{32}$/);
  assert.ok(f.paths.every(target => allowedPath(f, target)));
  for (const target of ['', 'rooms', `rooms/${f.code}`, `rooms/${f.code}/players`, f.paths[1] + '/vote', 'rooms/OTHER/players/' + f.tokens[0]]) assert.equal(allowedPath(f, target), false);
  const node = { game: 'bombrelay', playerNum: 1, bomb: { sessionId: 'test-session' }, qaBombV2: nodeStamp(f, 1) };
  assert.equal(owned(node, f, 1, sessions, owners), true);
  assert.equal(owned({ ...node, qaBombV2: { ...node.qaBombV2, marker: 'foreign' } }, f, 1, sessions, owners), false);
  assert.equal(owned({ ...node, bomb: { sessionId: 'foreign' } }, f, 1, sessions, owners), false);
  assert.equal(owned({ qaBombV2: nodeStamp(f, 0), owner: 'b'.repeat(32), stateJson: JSON.stringify({ sessionId: 'test-session' }) }, f, 0, sessions, owners), false);
  assert.equal(owned({ qaBombV2: nodeStamp(f, 0), owner: 'a'.repeat(32), stateJson: JSON.stringify({ sessionId: 'foreign' }) }, f, 0, sessions, owners), false);
  assert.equal(leaseReleasedOrExpired({ leaseUntil: 0 }, 10000, 0), true);
  assert.equal(leaseReleasedOrExpired({ leaseUntil: 11000 }, 10000, 1000), true);
  assert.equal(leaseReleasedOrExpired({ leaseUntil: 11001 }, 10000, 1000), false);
  assert.equal(leaseReleasedOrExpired({ leaseUntil: 9000 }, 10000, -1000), true);
  assert.equal(leaseReleasedOrExpired({ leaseUntil: 9001 }, 10000, -1000), false);
  assert.equal(leaseReleasedOrExpired({}, 10000, 0), false);
  return { ok: true, offlineOnly: true, exactNodes: 4, leaseBoundaryCases: 6, noNetworkRequests: true };
}
module.exports = { run, fixture, allowedPath, owned, leaseReleasedOrExpired, selfTest };
if (require.main === module) {
  if (process.argv.includes('--self-test')) console.log(JSON.stringify(selfTest()));
  else if (!process.argv.includes('--live')) { console.log('{"ok":false,"reason":"live_flag_required"}'); process.exitCode = 1; }
  else run({ playwrightPath: process.argv.find((value, index) => index > 1 && value !== '--live') || 'playwright' })
    .then(report => { console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1; })
    .catch(error => { console.log(JSON.stringify({ ok: false, error: error.message.slice(0, 200) })); process.exitCode = 1; });
}
