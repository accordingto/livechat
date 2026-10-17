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
    realFirebase: true, realProductionPages: true, realTimeDeadline: true, realTimeDiscussion: true,
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
        phaseUntil: current?.phaseUntil, discussionUntil: current?.discussionUntil,
        passes: current?.passes, explodeAt: current?.explodeAt, initialGoDeadline: current?.roundFuse?.explodeAtMs };
      result.hostStatus = await host.locator('#br-status').textContent();
    } catch (_) { result.host = { unavailable: true }; }
    try {
      const node = (await read(0)).value, current = canonical(node);
      result.control = { markerMatches: hasStamp(node, f, 0), ownerKnown: owners.has(node?.owner),
        sessionKnown: sessions.has(current?.sessionId), leaseUntil: node?.leaseUntil,
        leaseRemainingMs: Number.isFinite(node?.leaseUntil) ? Math.max(0, node.leaseUntil - Math.round(now() + serverTimeOffsetMs)) : null,
        phase: current?.phase || null, explodeAt: current?.explodeAt, phaseUntil: current?.phaseUntil,
        discussionUntil: current?.discussionUntil, turnId: current?.turnId };
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
      check(!/"(?:roundFuse|roundId|explodeAt|remainingMs|litAt|durationMs|startedAtMs|explodeAtMs|discussionUntil)"\s*:/.test(JSON.stringify(node.bomb)), `player-${number}-private-timing-${expectedPhase}`);
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
    await players[before.holder - 1].locator(`[data-br-action="${type}"]`).click({ force: true, timeout: type === 'pass' ? 2500 : 15000 });
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
    check(await host.evaluate(() => BOMB_RELAY_DECK.pool('mixed').length === 700 && BOMB_RELAY_DECK.pool('everyday').length === 351 && BOMB_RELAY_DECK.pool('playful').length === 349), 'real-host-uses-700-eligible-reviewed-prompts');
    check(/30–90/.test(await host.locator('#br-timing-range').innerText()), 'real-three-player-setup-shows-effective-v31-normal-range');
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
    progress('real-v31-go-and-first-player-link-pass');
    const first = await tapHolder('light'), deadline = first.explodeAt, promptId = first.order[0], snapshot = JSON.stringify(first.roundFuse);
    check(first.roundFuse.speedModeAtStart === 'normal' && first.roundFuse.scaleWithPlayersAtStart === true && first.roundFuse.activePlayerCountAtStart === 3, 'normal-go-snapshot-three-eligible-players');
    check(first.roundFuse.policyVersion === 'talk-bomb-timing-3.1' && first.roundFuse.minMsAtStart === 30000 && first.roundFuse.maxMsAtStart === 90000 && first.roundFuse.durationMs >= 30000 && first.roundFuse.durationMs <= 90000, 'normal-go-real-v31-30-to-90-seconds');
    report.realFuseDurationMs = first.roundFuse.durationMs;
    // Begin the natural lease takeover early: v3.1 legitimately permits a
    // 30-second bomb, so do not spend its first half taking optional captures.
    for (let pass = 0; pass < 1; pass++) {
      const next = await tapHolder('pass');
      check(next.explodeAt === deadline && JSON.stringify(next.roundFuse) === snapshot && next.order[0] === promptId, `pass-${pass + 1}-keeps-prompt-and-deadline`);
      await samePlayers('ticking');
    }
    progress('pending-fast-off-and-real-host-reload');
    await host.locator('#br-manage-open').click();
    await host.locator('#br-manage-speed').selectOption('fast');
    await poll(async () => (await state()).settingsTiming.speedMode === 'fast');
    await host.locator('#br-manage-scale:not([disabled])').waitFor();
    await host.locator('#br-manage-scale').setChecked(false);
    await poll(async () => (await state()).settingsTiming.scaleWithPlayers === false);
    await host.locator('#br-manage-min:not([disabled])').waitFor();
    await host.locator('#br-manage-min').fill('20'); await host.locator('#br-manage-min').blur();
    await poll(async () => (await state()).settingsTiming.baseMinSeconds === 20);
    await host.locator('#br-manage-max:not([disabled])').waitFor();
    await host.locator('#br-manage-max').fill('45'); await host.locator('#br-manage-max').blur();
    await poll(async () => (await state()).settingsTiming.baseMaxSeconds === 45);
    await host.locator('#br-manage .br-dialog-header button').click();
    const afterPending = await state();
    check(JSON.stringify(afterPending.roundFuse) === snapshot && (afterPending.phase === 'ticking' ? afterPending.explodeAt === deadline :
      ['boom', 'discussion'].includes(afterPending.phase) && afterPending.history.length === 1),
      'pending-preferences-do-not-resample-the-original-fuse-or-delay-its-natural-settlement');
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
    await poll(async () => ['ticking', 'boom', 'discussion'].includes((await state())?.phase));
    await host.locator('#br-manage-open:not([disabled])').waitFor({ timeout: 30000 });
    await captureOwners();
    progress('host-reload-deadline-and-pending-settings-check');
    const reloaded = await state();
    check(JSON.stringify(reloaded.roundFuse) === snapshot, 'host-reload-preserves-original-go-snapshot-even-if-its-real-deadline-already-passed');
    if (reloaded.phase === 'ticking') check(reloaded.explodeAt === deadline, 'host-reload-resumes-original-active-deadline');
    else check(reloaded.explodeAt === null && reloaded.history.length === 1 &&
      Object.values(reloaded.penalties).reduce((sum, cards) => sum + list(cards).length, 0) === 1,
      'a-legally-short-bomb-may-settle-once-during-natural-host-lease-takeover');
    report.phaseAfterRealTakeover = reloaded.phase;
    check((await state()).settingsTiming.speedMode === 'fast' && (await state()).settingsTiming.scaleWithPlayers === false, 'pending-preferences-survive-host-reload');
    check((await state()).settingsTiming.baseMaxSeconds === 45, 'lowered-upper-bound-survives-real-host-reload');
    check((await state()).settingsTiming.baseMinSeconds === 20, 'custom-lower-bound-survives-real-host-reload');
    if (reloaded.phase !== 'ticking' || now() + serverTimeOffsetMs + 3000 < deadline) await samePlayers(reloaded.phase);
    report.successfulPassesBeforeFirstExplosion = 1;
    for (let pass = 1; pass < 6; pass++) {
      const beforePass = await state();
      if (beforePass.phase !== 'ticking' || now() + serverTimeOffsetMs >= deadline) break;
      let next;
      try { next = await tapHolder('pass'); }
      catch (error) {
        const afterClick = await state();
        if (!['boom', 'discussion'].includes(afterClick.phase)) throw error;
        next = afterClick;
      }
      check(JSON.stringify(next.roundFuse) === snapshot && next.order[0] === promptId, `pass-${pass + 1}-keeps-prompt-and-go-snapshot`);
      if (next.phase !== 'ticking') {
        check(['boom', 'discussion'].includes(next.phase) && next.history.length === 1 &&
          Object.values(next.penalties).reduce((sum, cards) => sum + list(cards).length, 0) === 1,
          'a-pass-reaching-the-real-deadline-settles-only-once');
        break;
      }
      check(next.explodeAt === deadline, `pass-${pass + 1}-keeps-the-original-active-deadline`);
      report.successfulPassesBeforeFirstExplosion++;
      if (now() + serverTimeOffsetMs + 3000 >= deadline) break;
      await samePlayers('ticking');
    }
    progress('wait-actual-saved-deadline-no-fake-clock');
    let lastProgress = 0;
    await poll(async () => {
      const current = await state();
      if (now() - lastProgress >= 10000) {
        lastProgress = now(); process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step: report.step, elapsedMs: Math.max(0, now() - first.litAt), approximateRemainingMs: Math.max(0, deadline - now()) }) + '\n');
      }
      return ['boom', 'discussion'].includes(current.phase);
    }, Math.max(15000, deadline - now() + 15000));
    const boom = await state(), views = await samePlayers(boom.phase);
    const animationEnd = boom.discussionUntil - 45000;
    report.explosionPresentationObserved = boom.phase === 'boom';
    check(boom.order[0] === promptId && boom.history.length === 1 && Object.values(boom.penalties).reduce((sum, cards) => sum + list(cards).length, 0) === 1, 'real-auto-explosion-settles-exactly-one-penalty');
    for (let index = 0; index < views.length; index++) {
      check(views[index].bomb.boom.loser === boom.boom.loser && views[index].bomb.standings.reduce((sum, row) => sum + row.count, 0) === 1, `player-${index + 1}-same-auto-explosion-and-score`);
      await screenshot(players[index], `player-${index + 1}-boom`);
    }
    await screenshot(host, 'host-boom');
    report.observedAutomaticExplosion = true;
    progress('wait-real-animation-settlement-then-discussion');
    check(boom.phase === 'boom' ? boom.discussionUntil === boom.phaseUntil + 45000 : boom.phaseUntil === boom.discussionUntil,
      'one-discussion-deadline-is-established-after-the-existing-explosion-hold');
    await poll(async () => (await state()).phase === 'discussion', Math.max(15000, animationEnd - now() + 15000));
    const discussion = await state(), discussionViews = await samePlayers('discussion');
    report.realDiscussion = { observedAtMs: now(), boomSettledAtMs: animationEnd,
      discussionUntil: discussion.phaseUntil, durationMs: discussion.phaseUntil - animationEnd };
    check(discussion.phaseUntil === boom.discussionUntil && report.realDiscussion.durationMs === 45000, 'real-discussion-is-exactly-45-seconds-after-settlement');
    check(discussion.order[0] === promptId && discussion.cardIndex === boom.cardIndex &&
      JSON.stringify(discussion.boom) === JSON.stringify(boom.boom) && JSON.stringify(discussion.history) === JSON.stringify(boom.history) &&
      JSON.stringify(discussion.penalties) === JSON.stringify(boom.penalties) && JSON.stringify(discussion.promptHistory) === JSON.stringify(boom.promptHistory), 'discussion-keeps-the-original-prompt-result-score-and-draw-history');
    check(await host.locator('#br-next').isVisible() && await host.locator('.br-phase-discussion.br-static').count() === 1,
      'host-shows-the-existing-next-action-and-a-static-discussion-result');
    check(await host.locator('[role="timer"],progress,[role="progressbar"],.br-exploding').count() === 0, 'discussion-adds-no-large-countdown-or-repeated-explosion-animation');
    for (let index = 0; index < players.length; index++) {
      check(discussionViews[index].bomb.boom.loser === boom.boom.loser && discussionViews[index].bomb.standings.reduce((sum, row) => sum + row.count, 0) === 1,
        `player-${index + 1}-same-discussion-result-and-single-score`);
      check(await players[index].locator('[data-br-action="next"]').isVisible(), `player-${index + 1}-can-advance-discussion-with-existing-next-action`);
      check(await players[index].locator('[data-br-action="light"],[data-br-action="pass"],[role="timer"],progress').count() === 0,
        `player-${index + 1}-discussion-has-no-active-fuse-or-countdown-ui`);
      await screenshot(players[index], `player-${index + 1}-discussion`);
    }
    await screenshot(host, 'host-discussion');
    progress('reload-one-real-player-during-discussion');
    await players[1].reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await players[1].locator('.br-zone-boom.br-static').waitFor({ timeout: 15000 });
    await samePlayers('discussion');
    check((await state()).phaseUntil === discussion.phaseUntil && (await state()).discussionUntil === discussion.discussionUntil,
      'real-player-reconnect-resumes-the-same-discussion-deadline');
    progress('wait-full-real-discussion-without-pressing-next');
    let lastDiscussionProgress = 0, discussionWaitSamples = 0;
    await poll(async () => {
      const current = await state();
      if (now() - lastDiscussionProgress >= 10000) {
        lastDiscussionProgress = now(); process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step: report.step,
          discussionElapsedMs: Math.max(0, now() - animationEnd), approximateRemainingMs: Math.max(0, discussion.phaseUntil - now()) }) + '\n');
      }
      if (current.phase === 'discussion') {
        if (current.phaseUntil !== discussion.phaseUntil || current.order[0] !== promptId || current.history.length !== 1) {
          check(false, 'waiting-discussion-retains-one-deadline-prompt-and-score');
        }
        discussionWaitSamples++;
      }
      return current.phase === 'ready' && current.cardIndex === 1;
    }, Math.max(15000, discussion.phaseUntil - now() + 15000));
    report.realDiscussion.waitSamples = discussionWaitSamples;
    check(discussionWaitSamples > 0, 'waiting-discussion-retains-one-deadline-prompt-and-score');
    const afterDiscussion = await state();
    await samePlayers('ready');
    check(afterDiscussion.explodeAt === null && afterDiscussion.roundFuse === null && afterDiscussion.phaseUntil === null &&
      afterDiscussion.discussionUntil === null && afterDiscussion.history.length === 1 && afterDiscussion.order[1] !== promptId,
      'discussion-expiry-reveals-exactly-one-new-prompt-and-never-auto-starts-the-fuse');
    for (const [index, item] of [host, ...players].entries()) {
      check(/20–45/.test(await item.locator('[data-br-ready-range]').innerText()), `ready-${index}-shows-pending-effective-custom-range`);
    }
    await sleep(1200);
    check((await state()).phase === 'ready' && (await state()).turnId === afterDiscussion.turnId && (await state()).explodeAt === null,
      'new-prompt-continues-waiting-for-manual-start');
    report.observedAutomaticDiscussionCompletion = true;
    progress('next-manual-go-uses-fast-off');
    const second = await tapHolder('light');
    check(second.roundFuse.speedModeAtStart === 'fast' && second.roundFuse.scaleWithPlayersAtStart === false && second.roundFuse.minMsAtStart === 20000 && second.roundFuse.maxMsAtStart === 45000, 'next-go-applies-pending-fast-off-and-custom-bounds');
    check(second.promptHistory.seenIds.includes(promptId) && second.order[1] !== promptId, 'next-prompt-preserves-activity-history');
    await samePlayers('ticking');
    progress('wait-second-real-fast-fuse-for-player-early-next');
    let lastSecondFuseProgress = 0;
    await poll(async () => {
      const current = await state();
      if (now() - lastSecondFuseProgress >= 10000) {
        lastSecondFuseProgress = now(); process.stdout.write('BOMB_QA_PROGRESS ' + JSON.stringify({ step: report.step,
          elapsedMs: Math.max(0, now() - second.litAt), approximateRemainingMs: Math.max(0, second.explodeAt - now()) }) + '\n');
      }
      return current.phase === 'boom';
    }, Math.max(15000, second.explodeAt - now() + 15000));
    const secondBoom = await state();
    await samePlayers('boom');
    check(secondBoom.cardIndex === 1 && secondBoom.history.length === 2 &&
      Object.values(secondBoom.penalties).reduce((sum, cards) => sum + list(cards).length, 0) === 2,
      'second-natural-explosion-adds-exactly-one-new-penalty');
    await poll(async () => (await state()).phase === 'discussion', Math.max(15000, secondBoom.phaseUntil - now() + 15000));
    const earlyDiscussion = await state(), earlyViews = await samePlayers('discussion');
    for (let index = 0; index < earlyViews.length; index++) check(earlyViews[index].bomb.boom.loser === secondBoom.boom.loser &&
      earlyViews[index].bomb.standings.reduce((sum, row) => sum + row.count, 0) === 2, `player-${index + 1}-same-second-discussion-and-score`);
    progress('real-player-presses-existing-next-before-45-seconds');
    const advancingNumber = secondBoom.boom.loser;
    await players[advancingNumber - 1].locator('[data-br-action="next"]').click();
    await poll(async () => (await state()).phase === 'ready' && (await state()).cardIndex === 2);
    const playerAdvanced = await state();
    report.playerEarlyNext = { playerNum: advancingNumber, clickedAtMs: now(), oldDiscussionUntil: earlyDiscussion.phaseUntil };
    check(now() + serverTimeOffsetMs < earlyDiscussion.phaseUntil, 'player-advances-before-the-discussion-deadline');
    check(playerAdvanced.phaseUntil === null && playerAdvanced.discussionUntil === null && playerAdvanced.explodeAt === null && playerAdvanced.roundFuse === null,
      'player-next-cancels-the-old-discussion-and-waits-for-manual-start');
    check(playerAdvanced.history.length === 2 && JSON.stringify(playerAdvanced.penalties) === JSON.stringify(earlyDiscussion.penalties) &&
      playerAdvanced.order[2] !== earlyDiscussion.order[1] && playerAdvanced.promptHistory.seenIds.length === earlyDiscussion.promptHistory.seenIds.length + 1 &&
      earlyDiscussion.promptHistory.seenIds.every(id => playerAdvanced.promptHistory.seenIds.includes(id)), 'player-next-draws-exactly-one-new-prompt-with-no-repeat-score');
    await samePlayers('ready');
    await screenshot(host, 'host-player-advanced-ready');
    await screenshot(players[advancingNumber - 1], 'player-advanced-ready');
    await sleep(1200);
    check((await state()).phase === 'ready' && (await state()).turnId === playerAdvanced.turnId && (await state()).explodeAt === null,
      'player-advanced-next-prompt-does-not-auto-start');
    progress('stop-from-next-untimed-preview');
    await host.locator('#br-manage-open').click(); await host.locator('#br-stop').click();
    await poll(async () => (await state()).phase === 'finished');
    check((await state()).history.length === 2 && (await state()).explodeAt === null && (await state()).phaseUntil === null &&
      (await state()).discussionUntil === null, 'stop-clears-all-deadlines-without-extra-penalty');
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
