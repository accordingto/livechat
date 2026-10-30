'use strict';
// Run: node tests/bingo-party.browser.cjs [path-to-playwright-package]
// BP_QA_OUTPUT=<dir> for captures (default: ../bingo-party-browser-qa).
//
// Real host page + the ORIGINAL play.html links, each player in its OWN
// browser context (separate storage/session), against one isolated
// Firebase-compatible database that enforces the Hub's production rules.
// Seat 1 is the participating host: their card runs in the host's browser
// context, so it can take over when the host page closes. Seat 7 watches.
// Every external request is blocked; no live room is touched.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer, createDatabase } = require('./helpers/bingo-party-fixture.cjs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.BP_QA_OUTPUT || path.join(root, '..', 'bingo-party-browser-qa'));
const CODE = 'BPQA' + Math.floor(Math.random() * 9000 + 1000);
const NAMES = ['Willie', 'Amy', 'Kevin', 'Jason', 'Riley', 'Alexandra-Marie Long-Name', 'Sam'];
const TOKENS = NAMES.map((_, i) => (i + 1).toString(16).padStart(2, '0') + 'a0b1c2d3e4f5a6b7c8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) throw new Error('check failed: ' + name + ' ' + detail); }

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { server, port } = await createServer(root);
  const base = `http://127.0.0.1:${port}/`;
  const db = createDatabase();
  const controlWrites = [], inboxSets = [];
  db.state.onSet = (id, location, value) => { if (location.includes('/bpInbox/')) inboxSets.push({ id, key: location.split('/').pop(), type: value?.type, roundId: value?.roundId, at: db.now(), removed: value == null }); };
  db.state.onWrite = (id, location, value) => {
    if (!value?.stateJson) return;
    const st = JSON.parse(value.stateJson);
    controlWrites.push({ id, rev: value.revision, owner: String(value.owner).slice(0, 6), no: st.round?.no, stage: st.round?.stage, votes: st.round ? Object.keys(st.round.nominations.A.votes).length + Object.keys(st.round.nominations.B.votes).length : 0 });
  };
  const browser = await chromium.launch({ executablePath: process.env.BP_BROWSER_EXECUTABLE || undefined });
  const errors = [];
  const pages = {};
  const roomStorage = { ['room-session-' + CODE]: JSON.stringify({ tokens: TOKENS, playerCount: TOKENS.length, names: NAMES }), 'room-last-session': CODE, 'site-lang': 'zh' };

  async function open(id, context, url, opts = {}) {
    const page = await context.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.request().url().includes('gstatic.com') ? route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }) : route.abort());
    page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${id} console: ${m.text()}`); });
    await db.attach(page, id, opts);
    await page.goto(base + url);
    pages[id] = page;
    return page;
  }
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const host = await open('host', hostContext, 'bingo-party.html', { storage: roomStorage });
  // seat 1's card lives in the host's browser (same saved room → may host)
  const hostCardContext = hostContext;
  const contexts = {};
  const cardURL = i => `play.html?s=${CODE}&p=${TOKENS[i]}&n=${encodeURIComponent(NAMES[i])}`;
  await open('p1', hostCardContext, cardURL(0));
  for (let i = 1; i < NAMES.length; i++) {
    contexts[i] = await browser.newContext(phone);
    // seat 6 (the long English name) uses the English interface
    await open('p' + (i + 1), contexts[i], cardURL(i), { storage: { 'site-lang': i === 5 ? 'en' : 'zh' } });
  }
  const P = n => pages['p' + n];
  const cardView = n => P(n).evaluate(() => window.BINGO_CARD?.view?.() || null);
  const hostView = () => pages.host.evaluate(() => window.BINGO_HOST?.view?.() || null);
  async function until(fn, label, timeout = 15000) {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) { last = await fn(); if (last) return last; await pause(120); }
    throw new Error('timeout waiting for ' + label);
  }
  const eventually = (fn, ms = 6000) => until(fn, 'eventually', ms).then(() => true, () => false);
  const click = (page, selector) => page.locator(selector).first().click();
  async function openFold(page, key) {
    const fold = page.locator(`details[data-keep="${key}"]`);
    if (!(await fold.evaluate(node => node.open))) await fold.locator(':scope > summary').click();
  }
  async function shot(page, name) {
    const size = page.viewportSize();
    const phoneShot = name.includes('phone') && size?.width !== 390;
    if (phoneShot) await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    if (phoneShot) await page.setViewportSize(size);
  }
  async function hostDo(selector) { await click(host, selector); }
  const allSeats = [1, 2, 3, 4, 5, 6, 7];

  async function tool(page, act, attrs = '') {
    const details = page.locator('.bp-hosttools');
    if (await details.count() && !(await details.evaluate(d => d.open))) await page.locator('.bp-hosttools > summary').click();
    await page.locator(`.bp-hosttools [data-act="${act}"]${attrs}`).first().click({ timeout: 5000 });
  }
  const controlToken = () => Object.keys(db.dump().rooms[CODE].players).find(k => !TOKENS.includes(k));
  async function hostOrCardView() {
    if (pages.host && !pages.host.isClosed()) { const v = await hostView(); if (v) return v; }
    return cardView(1);
  }
  async function noOverflow() {
    for (let n = 2; n <= 7; n++) {
      // isMobile pages grow their layout viewport to fit wide content, so
      // compare with the device width itself, not innerWidth.
      const wide = await P(n).evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth));
      if (wide > 391) { console.log('overflow on p' + n, wide); return false; }
    }
    for (const page of [pages.host, pages.host2].filter(x => x && !x.isClosed())) {
      if (await page.evaluate(() => document.documentElement.scrollWidth) > 1281) { console.log('overflow on host page'); return false; }
    }
    return true;
  }
  // payload scan: has a page EVER received this text in any value?
  function receivedText(id, text) {
    // what this SEAT was sent on its own node (a trusted host browser may also
    // read other nodes while it runs the authority; that is checked separately)
    const page = db.state.pages.get(id), mine = `rooms/${CODE}/players/${TOKENS[Number(id.slice(1)) - 1]}`;
    return page.received.some(item => item.path.startsWith(mine) && item.json && item.json.includes(text));
  }
  function leakFree(text, allowedSeats, label) {
    const leaks = [...db.state.pages.keys()].filter(id => /^p\d+$/.test(id) && !allowedSeats.includes(Number(id.slice(1))) && receivedText(id, text));
    check(label, leaks.length === 0, leaks.length ? 'leaked to ' + leaks.join(',') : '');
  }
  async function domHas(page, text) { return page && !page.isClosed() ? (await page.evaluate(() => document.body.innerText)).includes(text) : false; }
  const LINES = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];
  function bestNumber(board, called) {
    let best = null, score = -1;
    for (const line of LINES) {
      const nums = line.map(i => board[i]), open = nums.filter(x => !called.has(x)), c = nums.length - open.length;
      if (open.length && c > score) { score = c; best = open[0]; }
    }
    return best;
  }
  async function noteText(page) { return (await page.locator('.bp-note').allInnerTexts().catch(() => [])).join(' | '); }

  try {
    /* ── lobby ── */
    await until(() => host.locator('#bp-open-lobby').isVisible(), 'open lobby button');
    await hostDo('#bp-open-lobby');
    await until(async () => (await hostView())?.phase === 'lobby', 'lobby');
    for (const n of allSeats) await until(async () => (await cardView(n))?.phase === 'lobby', 'card lobby ' + n);
    check('every original link switched into the lobby', true);
    // seat 7 watches; seat 1 (Willie) is the participating host
    await hostDo('[data-act="setTeam"][data-player="7"][data-team="-"]');
    await until(async () => (await hostView()).roster.find(p => p.playerNum === 7).team === null, 'seat 7 spectator');
    await hostDo('[data-act="autoTeams"]'); // re-balance the six players; the watcher stays out
    await until(async () => { const v = await hostView(); return v.roster.filter(p => p.team === 'A').length === 3 && v.roster.filter(p => p.team === 'B').length === 3; }, 'balanced teams');
    await openFold(host, 'lobby-admin');
    await hostDo('[data-act="setHost"][data-player="1"]');
    await until(async () => (await hostView()).hostPlayerNum === 1, 'host seat');
    await host.locator('details[data-keep="lobby-admin"] > summary').click();
    await openFold(host, 'timers');
    await hostDo('[data-act="setting"][data-key="t.improv"][data-value="195"]');
    await until(async () => (await hostView()).settings.t.improv === 195, 'custom scene time');
    await hostDo('[data-act="setting"][data-key="resetTimers"]');
    await until(async () => (await hostView()).settings.t.improv === 180 && (await hostView()).settings.t.story === 120, 'recommended pacing');
    check('lobby: custom timers and recommended pacing work through the real host controls', true);
    await host.locator('details[data-keep="timers"] > summary').click();
    let lv = await hostView();
    const teamOf = n => lv.roster.find(p => p.playerNum === n).team;
    let A = lv.roster.filter(p => p.team === 'A').map(p => p.playerNum), B = lv.roster.filter(p => p.team === 'B').map(p => p.playerNum);
    check('auto teams re-balance to 3 v 3 with one seat watching', A.length === 3 && B.length === 3, `A=${A} B=${B}`);
    for (const n of [2, 3]) { await click(P(n), '[data-act="ready"]'); }
    await until(async () => (await hostView()).roster.filter(p => p.ready).length === 2, 'ready marks');
    await shot(P(2), '01-phone-lobby');
    await shot(host, '01-desktop-lobby');
    const readyPosition = await P(2).locator('[data-act="ready"]').boundingBox();
    check('lobby: the ready action is in the first phone viewport', readyPosition && readyPosition.y + readyPosition.height < 844);
    await hostDo('[data-act="setting"][data-key="songTurns"][data-value="4"]');
    await hostDo('[data-act="setting"][data-key="qLang"][data-value="zh"]');
    await until(async () => (await hostView()).settings.qLang === 'zh', 'prompt language');
    await hostDo('[data-act="start"]');
    await until(async () => (await hostView())?.phase === 'playing', 'started');
    lv = await hostView();
    A = lv.roster.filter(p => p.team === 'A').map(p => p.playerNum); B = lv.roster.filter(p => p.team === 'B').map(p => p.playerNum);
    const team = n => A.includes(n) ? 'A' : B.includes(n) ? 'B' : null;

    /* ── round 1: nominations ── */
    let r = (await hostView()).round;
    check('round 1 is 默契猜人 and starts with secret nominations', r.type === 'guess_person' && r.stage === 'nominating');
    for (const n of allSeats) await until(async () => (await cardView(n))?.phase === 'playing', 'card playing ' + n);
    const boardA = (await cardView(A[0])).board, boardB = (await cardView(B[0])).board;
    check('each team sees only its own board; layouts differ', boardA && boardB && JSON.stringify(boardA) !== JSON.stringify(boardB) && (await cardView(7)).board === undefined && (await hostView()).board === undefined);
    // A votes 7,7,9 ; B votes 12,12,(none)
    await click(P(A[0]), '.bp-board [data-act="vote"][data-n="7"]');
    await click(P(A[1]), '.bp-board [data-act="vote"][data-n="7"]');
    await click(P(A[2]), '.bp-board [data-act="vote"][data-n="9"]');
    await click(P(B[0]), '.bp-board [data-act="vote"][data-n="12"]');
    await click(P(B[1]), '.bp-board [data-act="vote"][data-n="12"]');
    await until(async () => { const v = await cardView(A[0]); return v.round.nominations.A?.tally?.[7] === 2; }, 'team tally');
    const oppSees = await until(async () => { const v = await cardView(B[0]); return v.round.nominations.A.voted === 3 && v; }, 'opponent count');
    check('teammates see their own tally; opponents only a voted count', JSON.stringify(oppSees.round.nominations.A) === JSON.stringify({ voted: 3, of: 3 }));
    // forged / illegal requests written straight into a seat's own inbox
    const inject = (n, id, body) => P(n).evaluate(({ code, token, id, body }) => firebase.database().ref(`rooms/${code}/players/${token}/bpInbox/${id}`).set(Object.assign(body, { sentAt: firebase.database.ServerValue.TIMESTAMP })), { code: CODE, token: TOKENS[n - 1], id, body });
    const sid = (await cardView(A[0])).sessionId, rid = (await cardView(A[0])).round.id;
    await inject(7, 'dddddddddddddddd0001', { type: 'vote', number: 3, sessionId: sid, roundId: rid });
    const plain = A.find(n => n !== 1); // not the host seat
    await inject(plain, 'dddddddddddddddd0002', { type: 'lockNow', actor: 0, sessionId: sid });
    await inject(plain, 'dddddddddddddddd0003', { type: 'vote', number: 30, sessionId: sid, roundId: rid });
    await until(async () => (await cardView(7)).replies.some(x => x.id === 'dddddddddddddddd0001' && x.error === 'not_participant'), 'spectator refused');
    await until(async () => (await cardView(plain)).replies.some(x => x.id === 'dddddddddddddddd0002' && x.error === 'host_only'), 'forged host refused');
    await until(async () => (await cardView(plain)).replies.some(x => x.id === 'dddddddddddddddd0003' && x.error === 'bad_number'), 'bad number refused');
    check('a spectator cannot vote; a player claiming actor 0 is still only that player (host_only); invalid numbers are refused', (await hostView()).round.stage === 'nominating');
    await shot(P(A[0]), '02-phone-board-nomination');
    check('390px phones and the 1280px stage do not overflow (nomination)', await noOverflow());
    await tool(host, 'lockNow');
    r = (await until(async () => { const v = await hostView(); return v.round.stage === 'revealed' && v; }, 'revealed')).round;
    check('nominations lock: A=7 (majority), B=12', r.nominations.A.pick === 7 && r.nominations.B.pick === 12);
    for (const n of allSeats) await until(async () => (await cardView(n))?.round?.stage === 'revealed', 'reveal on ' + n);
    check('both nominations revealed together on every card', await eventually(async () => (await cardView(B[0])).round.nominations.A.pick === 7 && (await cardView(7)).round.nominations.B.pick === 12));
    await shot(host, '03-stage-nominations-revealed');


    async function nominate() {
      const called = new Set((await hostOrCardView()).called);
      for (const n of [...A, ...B]) {
        const cv = await until(async () => { const c = await cardView(n); return c?.round?.stage === 'nominating' && c; }, 'nominating card ' + n);
        await click(P(n), `.bp-board [data-act="vote"][data-n="${bestNumber(cv.board, called)}"]`);
      }
      await until(async () => { const x = await hostOrCardView(); return x.round.stage !== 'nominating' || (x.round.nominations.A.voted === A.length && x.round.nominations.B.voted === B.length); }, 'all voted');
      if ((await hostOrCardView()).round.stage === 'nominating') await tool(H, 'lockNow').catch(() => {});
    }
    async function cur() { return (await hostOrCardView()).round; }
    async function driveGuess(round, first) {
      const prot = round.roles.protagonist;
      const elig = { A: A.filter(n => n !== prot.A), B: B.filter(n => n !== prot.B) };
      await click(P(prot.A), '[data-act="gpAnswer"][data-option="a"]');
      await click(P(prot.B), '[data-act="gpAnswer"][data-option="b"]');
      if (first) {
        await until(async () => (await cardView(prot.B)).round.sub.myAnswer === 'b', 'answer stored');
        leakFree('"answers":', [], 'guess: no seat receives the protagonists’ answers before the reveal');
        check('guess: a teammate does not get their protagonist’s choice', (await cardView(elig.A[0])).round.sub.myAnswer === undefined && !receivedText('p' + elig.A[0], '"myAnswer"'));
        await shot(P(elig.A[0]), '04-phone-guess-teammate');
        check('no overflow during 默契猜人', await noOverflow());
      }
      for (const n of elig.A) await click(P(n), '[data-act="gpGuess"][data-option="a"]');
      for (const [i, n] of elig.B.entries()) await click(P(n), `[data-act="gpGuess"][data-option="${first && i === 1 ? 'c' : 'b'}"]`);
      await until(async () => (await cur()).sub.stage === 'reveal', 'guess reveal');
      if (first) {
        const sub = (await cur()).sub;
        check('guess: ratio decides (A 2/2 beats B 1/2), shown after the synchronous reveal', sub.preview === 'A' && sub.hits.A.hit === 2 && sub.hits.B.hit === 1);
        await until(async () => (await cardView(7)).round.sub?.stage === 'reveal', 'spectator reveal');
        await shot(P(7), '04b-phone-guess-reveal-spectator');
      }
      await click(H, '[data-act="gpTalkDone"]');
    }
    async function driveSong(round, first) {
      let i = 0;
      const titles = [];
      while ((await cur()).stage === 'challenge') {
        const r2 = await cur(), sub = r2.sub, turn = sub.turns[sub.cur];
        const performer = P(turn.performer);
        await until(async () => (await cardView(turn.performer)).round.sub?.cur === sub.cur, 'performer sees turn');
        const title = first && i === 2 ? titles[0].toUpperCase().replace(' ', '  ') : `Song ${roundNo}-${i}`;
        if (first && i === 1) {
          const mate = (turn.team === 'A' ? A : B).find(n => n !== turn.performer);
          await P(mate).locator('[data-keep="song-suggest"]').fill('Private Pick 4417');
          await click(P(mate), '[data-act="songSuggest"]');
          await until(async () => JSON.stringify(await cardView(mate)).includes('Private Pick 4417'), 'suggestion stored');
          leakFree('Private Pick 4417', turn.team === 'A' ? A : B, 'song: teammate suggestions never reach the other team or spectators');
          await P(turn.performer).locator('input[name="bp-song-mode"][value="alt"]').check();
          await shot(performer, '05-phone-song-performer');
          check('no overflow during 接歌接力', await noOverflow());
        }
        await performer.locator('[data-keep="song-title"]').fill(title);
        await click(performer, '[data-act="songSubmit"]');
        await until(async () => (await cur()).sub.turns[sub.cur].title === title.replace(/\s+/g, ' ').trim(), 'title submitted');
        if (first && i === 2) {
          check('song: an exact repeat of an accepted title is flagged', (await cur()).sub.turns[sub.cur].dup === true);
          await click(H, '[data-act="songJudge"][data-verdict="valid"]');
          await until(async () => /本回合已接受過|Already accepted/.test(await noteText(H)), 'duplicate refused');
          check('song: the host cannot accept the same song twice in a round', (await cur()).sub.cur === sub.cur);
          await click(H, '[data-act="songJudge"][data-verdict="invalid"]');
        } else await click(H, '[data-act="songJudge"][data-verdict="valid"]');
        await until(async () => { const c = await cur(); return c.stage !== 'challenge' || c.sub.cur > sub.cur; }, 'next turn');
        titles.push(title); i++;
      }
      const done = (await cur()).sub;
      if (first) {
        const perTeam = t => done.turns.filter(x => x.team === t).map(x => x.performer);
        check('song: 4 turns per team, alternating, everyone before repeats', done.turns.length === 8 && done.turns.every((x, k) => x.team === done.turns[k % 2].team) && new Set(perTeam('A').slice(0, 3)).size === 3 && new Set(perTeam('B').slice(0, 3)).size === 3);
      }
    }
    async function driveImprov(round, first) {
      for (let k = 0; k < 2; k++) {
        const seg = (await until(async () => { const c = await cur(); const sg = c.sub?.segs?.[c.sub.cur]; return sg?.stage === 'ready' && c; }, 'segment ready')).sub.segs[k];
        const actors = seg.actors, acting = seg.team === 'A' ? A : B, dirs = seg.team === 'A' ? B : A, mates = acting.filter(n => !actors.includes(n));
        await click(P(actors[0]), `[data-act="imStart"][data-seg="${seg.segmentId}"]`);
        await until(async () => (await cur()).sub.segs[k].stage === 'live', 'scene live');
        if (first && k === 0) {
          for (const n of dirs) await until(async () => (await cardView(n)).round.sub.segs[0].stage === 'live', 'director live');
          await shot(P(dirs[0]), '06-phone-director-buttons');
          await click(P(dirs[0]), '[data-act="imCmd"][data-kind="new_line"]');
          await click(P(dirs[1]), '[data-act="imCmd"][data-kind="speak_taiwanese"]');
          const watchers = [...allSeats.map(P), pages.host].filter(x => x && !x.isClosed());
          for (const page of watchers) await until(() => page.locator('.bp-flash:not([hidden])').filter({ hasText: /瞎說|Say something else/ }).count(), 'flash on every page', 4000);
          check('director: 瞎說! appears on every player card, the spectator and the public stage', true);
          await shot(P(7), '07-phone-spectator-public-command');
          if (pages.host && !pages.host.isClosed()) await shot(pages.host, '07b-stage-public-command');
          await until(async () => /剛送出指令|just went out/.test(await noteText(P(dirs[1]))), 'cooldown feedback');
          check('director: a second press inside 2 s is refused with feedback, not queued', (await cur()).sub.segs[0].events.length === 1);
          await pause(2200);
          await click(P(dirs[1]), '[data-act="imCmd"][data-kind="speak_taiwanese"]');
          for (const n of allSeats) await until(async () => (await cardView(n)).round.sub.segs[0].lang === 'tw', 'tw everywhere');
          check('director: 講台語 switches the scene language on every card; the prompt language stays 繁中', (await cardView(7)).settings.qLang === 'zh' && (await cur()).card.prompt && /[\u4e00-\u9fff]/.test((await cur()).card.prompt));
          await pause(2200);
          await click(P(dirs[2]), '[data-act="imCmd"][data-kind="speak_english"]');
          for (const n of allSeats) await until(async () => (await cardView(n)).round.sub.segs[0].lang === 'en', 'en everywhere');
          check('director: 講英文 returns the scene to English', true);
          // private line
          const SECRET = 'SECRET-LINE-' + Math.floor(Math.random() * 1e6) + ' 我其實是海盜';
          // Chinese IME: while a composition is open, live updates must not rebuild the field
          for (const n of dirs) await openFold(P(n), 'line-composer');
          const box = P(dirs[0]).locator('[data-keep="line-text"]');
          await box.click(); await box.fill('我其實');
          await box.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
          await click(P(dirs[2]), '[data-act="imCmd"][data-kind="new_line"]').catch(() => {});
          await pause(900);
          const kept = await box.evaluate(el => ({ same: el.isConnected && document.activeElement === el, value: el.value }));
          await box.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '是' })));
          check('IME: an open composition is not interrupted by live updates (field kept, focused, text intact)', kept.same && kept.value === '我其實');
          await pause(2200);
          await P(dirs[0]).locator('[data-keep="line-text"]').fill(SECRET);
          await P(dirs[0]).locator(`input[name="bp-line-target"][value="${actors[0]}"]`).check();
          await click(P(dirs[0]), '[data-act="imLine"]');
          await until(async () => (await P(actors[0]).locator('.bp-line-text').innerText().catch(() => '')).includes(SECRET), 'line delivered');
          await shot(P(actors[0]), '08-phone-actor-private-line');
          leakFree(SECRET, [dirs[0], actors[0]], 'director line: only the author and the chosen actor ever receive the text');
          check('director line: the public stage shows only that a line arrived', !(await domHas(pages.host, SECRET)) && await eventually(async () => (await cardView(7)).round.sub.segs[0].received[actors[0]] === 1));
          await P(dirs[1]).locator('[data-keep="line-text"]').fill('second line');
          await P(dirs[1]).locator(`input[name="bp-line-target"][value="${actors[0]}"]`).check();
          await click(P(dirs[1]), '[data-act="imLine"]');
          await P(dirs[2]).locator('[data-keep="line-text"]').fill('third line');
          await P(dirs[2]).locator(`input[name="bp-line-target"][value="${actors[0]}"]`).check();
          await click(P(dirs[2]), '[data-act="imLine"]');
          await until(async () => (await cardView(7)).round.sub.segs[0].received[actors[0]] === 3, 'three queued');
          await P(dirs[0]).locator('[data-keep="line-text"]').fill('fourth line');
          await P(dirs[0]).locator(`input[name="bp-line-target"][value="${actors[0]}"]`).check();
          await click(P(dirs[0]), '[data-act="imLine"]');
          await until(async () => /排滿|full/.test(await noteText(P(dirs[0]))), 'queue full feedback');
          check('director line: 1 active + 2 waiting per actor; a 4th is refused, nothing overwritten', await eventually(async () => (await cardView(actors[0])).round.sub.segs[0].myLines.length === 3));
          // reconnect: the actor reloads; the active line is restored, no old banner replays
          await P(actors[0]).reload();
          await until(async () => (await P(actors[0]).locator('.bp-line-text').innerText().catch(() => '')).includes(SECRET), 'line after reload');
          check('reconnect: the actor gets the still-active private line back, with no replayed command banner', await P(actors[0]).locator('.bp-flash').isHidden());
          await click(P(actors[0]), '[data-act="imLineResolve"][data-action="done"]');
          await until(async () => (await P(actors[0]).locator('.bp-line-text').innerText().catch(() => '')).includes('second line'), 'next line promoted');
          const lineDirs1 = (await cardView(dirs[2])).round.sub.segs[0].sent.find(l => l.status === 'waiting');
          await click(P(dirs[2]), `[data-act="imLineCancel"][data-line="${lineDirs1.lineId}"]`);
          await until(async () => (await cardView(actors[0])).round.sub.segs[0].myLines.length === 1, 'withdrawn');
          check('director line: done advances the queue; the author can withdraw a waiting line', true);
          // a late command (sent 10 s ago) is refused rather than replayed
          await P(dirs[0]).evaluate(({ code, token, seg, sessionId, roundId }) => firebase.database().ref(`rooms/${code}/players/${token}/bpInbox/aaaaaaaaaaaaaaaa1111`).set({ type: 'imCmd', kind: 'new_line', segmentId: seg, sessionId, roundId, sentAt: Date.now() - 10000 }),
            { code: CODE, token: TOKENS[dirs[0] - 1], seg: seg.segmentId, sessionId: (await cardView(dirs[0])).sessionId, roundId: round.id });
          await until(async () => (await cardView(dirs[0])).replies.some(x => x.id === 'aaaaaaaaaaaaaaaa1111' && x.error === 'too_late'), 'too_late');
          check('director: a stale command is refused (too_late), not played out of context', true);
          // time up → wrap-up; extension reopens commands
          await db.setSkew(db.state.skew + Math.max(0, (await cur()).clock.endsAt - db.now()) + 1000);
          await until(async () => (await cardView(dirs[0])).round.sub.segs[0].stage === 'wrapup', 'wrap-up');
          check('director: time up stops new commands (buttons disabled)', await P(dirs[0]).locator('[data-act="imCmd"]').first().isDisabled());
          await click(H, `[data-act="imExtend"][data-seg="${seg.segmentId}"]`);
          await until(async () => (await cardView(dirs[0])).round.sub.segs[0].stage === 'live', 'extended');
          check('director: the host extension reopens commands', !(await P(dirs[0]).locator('[data-act="imCmd"]').first().isDisabled()));
          check('phones never scroll sideways during the scene (390px)', await noOverflow());
        }
        await click(H, `[data-act="imJudge"][data-seg="${seg.segmentId}"][data-value="1"]`);
        await until(async () => { const c = await cur(); return c.stage !== 'challenge' || c.sub.segs[k].stage === 'judged'; }, 'judged');
        if (first && k === 0) {
          const next = (await cur()).sub.segs[1];
          check('director: the next team starts in the room language (English)', next.lang === 'en');
          await P(dirs[1]).evaluate(({ code, token, seg, sessionId, roundId }) => firebase.database().ref(`rooms/${code}/players/${token}/bpInbox/bbbbbbbbbbbbbbbb2222`).set({ type: 'imCmd', kind: 'new_line', segmentId: seg, sessionId, roundId, sentAt: firebase.database.ServerValue.TIMESTAMP }),
            { code: CODE, token: TOKENS[dirs[1] - 1], seg: seg.segmentId, sessionId: (await cardView(dirs[1])).sessionId, roundId: round.id });
          await until(async () => (await cardView(dirs[1])).replies.some(x => x.id === 'bbbbbbbbbbbbbbbb2222' && x.error === 'stale_segment'), 'stale segment');
          check('director: an old-segment command can never hit the next team', (await cur()).sub.segs[1].events.length === 0);
          check('director: ended segment purges unfinished private lines', !JSON.stringify(await cardView(actors[0])).includes('third line'));
        }
      }
    }
    async function driveStory(round, first) {
      for (let k = 0; k < 2; k++) {
        const c = (await cur()).sub.cycles[k];
        const sharer = c.sharer, interviewer = c.interviewer, pickers = c.team === 'A' ? B : A;
        const other = pickers.find(n => n !== interviewer);
        if (first && k === 0) {
          check('story: no song panel before the follow-up is answered', (await P(other).locator('[data-act="stPropose"]').count()) === 0);
          const helper = (c.team === 'A' ? A : B).find(n => n !== sharer);
          await P(helper).locator('details[data-keep="suggest-q"] > summary').click();
          await P(helper).locator('[data-keep="st-q"]').fill('Who were you with?');
          await click(P(helper), '[data-act="stSuggestQ"]');
          await until(async () => JSON.stringify(await cardView(interviewer)).includes('Who were you with?'), 'interviewer sees suggestion');
        }
        await click(P(sharer), `[data-act="stAdvance"][data-from="share"]`);
        await until(async () => (await cur()).sub.cycles[k].stage === 'ask', 'ask');
        await click(P(interviewer), `[data-act="stAdvance"][data-from="ask"]`);
        await until(async () => (await cur()).sub.cycles[k].stage === 'reply', 'reply');
        await click(P(sharer), `[data-act="stAdvance"][data-from="reply"]`);
        const singing = (await hostOrCardView()).settings.singing;
        if (!singing) { await until(async () => { const x = await cur(); return x.stage !== 'challenge' || x.sub.cur > k || x.sub.stage !== 'cycles'; }, 'cycle done (no singing)'); continue; }
        await until(async () => (await cur()).sub.cycles[k].stage === 'pick', 'pick');
        if (first && k === 1) {
          await click(P(sharer), `[data-act="stConfirm"][data-action="skip"]`);
          await until(async () => (await cur()).sub.stage !== 'cycles', 'skipped singing');
          check('story: the singer can pass without anyone proposing, no penalty', (await cur()).sub.cycles[1].singResult === 'skipped');
          continue;
        }
        await P(other).locator('[data-keep="st-song"]').fill('Proposal ' + k);
        await P(other).locator('[data-keep="st-artist"]').fill('Some Band');
        await click(P(other), '[data-act="stPropose"]');
        await until(async () => (await cardView(interviewer)).round.sub.cycles[k].proposals?.length === 1, 'proposal');
        if (first && k === 0) leakFree('Proposal 0', [...pickers], 'story: song proposals stay with the picking team until one is chosen');
        await click(P(interviewer), '[data-act="stPick"][data-proposal]');
        await until(async () => (await cur()).sub.cycles[k].stage === 'confirm', 'confirm');
        if (first && k === 0) {
          for (const n of allSeats) await until(async () => (await cardView(n)).round.sub.cycles[0].song?.title === 'Proposal 0', 'public song card ' + n);
          check('story: the public song card shows who it is for, on every card', true);
          await shot(P(sharer), '09-phone-story-song-confirm');
          check('no overflow during 故事點歌', await noOverflow());
          const v1 = (await cur()).sub.cycles[0].song.version;
          await click(P(sharer), '[data-act="stConfirm"][data-action="replace"]');
          await until(async () => (await cur()).sub.cycles[0].stage === 'pick', 'replacement requested');
          if (!(await P(interviewer).locator('details[data-keep="pick-own"]').evaluate(d => d.open))) await P(interviewer).locator('details[data-keep="pick-own"] > summary').click();
          await P(interviewer).locator('[data-keep="st-pick-title"]').fill('Second Choice');
          await click(P(interviewer), '[data-act="stPick"]:not([data-proposal])');
          await until(async () => (await cur()).sub.cycles[0].song?.title === 'Second Choice', 'second song');
          await P(sharer).evaluate(({ code, token, cycle, sessionId, roundId, v }) => firebase.database().ref(`rooms/${code}/players/${token}/bpInbox/cccccccccccccccc3333`).set({ type: 'stConfirm', action: 'accept', version: v, cycleId: cycle, sessionId, roundId, sentAt: firebase.database.ServerValue.TIMESTAMP }),
            { code: CODE, token: TOKENS[sharer - 1], cycle: c.cycleId, sessionId: (await cardView(sharer)).sessionId, roundId: round.id, v: v1 });
          await until(async () => (await cardView(sharer)).replies.some(x => x.id === 'cccccccccccccccc3333' && x.error === 'stale_song'), 'stale song');
          check('story: an old confirmation cannot accept the newer song request', (await cur()).sub.cycles[0].stage === 'confirm');
          await click(P(sharer), '[data-act="stConfirm"][data-action="accept"]');
          await until(async () => (await cur()).sub.cycles[0].stage === 'sing', 'singing');
          await P(sharer).locator(`details[data-keep="self-${c.cycleId}"] > summary`).click();
          await P(sharer).locator('[data-keep="st-self"]').fill('My Own Tune');
          await click(P(sharer), '[data-act="stConfirm"][data-action="self"]');
          await until(async () => (await cur()).sub.cycles[0].song?.source === 'self', 'self pick mid-song');
          check('story: mid-song the singer can switch to a song of their own', (await cur()).sub.cycles[0].stage === 'sing');
        } else {
          await click(P(sharer), '[data-act="stConfirm"][data-action="accept"]');
          await until(async () => (await cur()).sub.cycles[k].stage === 'sing', 'singing');
        }
        const version = (await cur()).sub.cycles[k].song.version;
        await click(P(sharer), `[data-act="stConfirm"][data-action="done"][data-version="${version}"]`);
        await until(async () => { const x = await cur(); return x.sub.cycles[k].stage === 'done'; }, 'cycle done');
      }
      await until(async () => (await cur()).sub.stage === 'echo' || (await cur()).stage === 'result', 'echo');
      if ((await cur()).stage === 'result') return;
      if (first) {
        const sharers = (await cur()).sub.cycles.map(x => x.sharer);
        const echoer = A.concat(B).find(n => !sharers.includes(n));
        await click(P(echoer), '[data-act="stEcho"]:not([data-done])');
        await until(async () => (await cur()).sub.echo.by === echoer, 'echo claimed');
        await click(P(echoer), '[data-act="stEcho"][data-done="1"]');
      } else await click(H, '[data-act="stEchoSkip"]');
      await until(async () => (await cur()).stage === 'result', 'story result');
      check(`story: the cooperative round proposes BOTH`, (await cur()).proposed === 'BOTH');
    }
    async function driveTaboo(round, first) {
      for (let k = 0; k < 2; k++) {
        const seg = (await until(async () => { const c = await cur(); return c.sub?.segs?.[k]?.current && c; }, 'taboo seg')).sub.segs[k];
        const d = seg.describer;
        await click(P(d), `[data-act="tbStart"][data-seg="${seg.segmentId}"]`);
        await until(async () => (await P(d).locator('.bp-word').count()) > 0, 'secret word');
        const word = (await P(d).locator('.bp-word').innerText()).trim();
        if (first && k === 0) {
          await shot(P(d), '10-phone-taboo-describer');
          check('no overflow during 禁詞傳話', await noOverflow());
          leakFree(`"${word}"`, [d], 'taboo: only the describer receives the word and its taboo words');
          check('taboo: the public stage does not show the hidden word', !(await domHas(pages.host, word)));
        }
        await click(P(d), '[data-act="tbMark"][data-result="hit"]');
        await until(async () => (await cur()).sub.segs[k].idx === 1, 'first item settled');
        if (first && k === 0) check('taboo: an item’s answer becomes public once it is settled', await eventually(async () => (await cardView(7)).round.sub.segs[0].targets[0].answer === word));
        if (first && k === 1) {
          await db.setSkew(db.state.skew + Math.max(0, (await cur()).clock.endsAt - db.now()) + 1000);
          await until(async () => (await cur()).sub.segs[1].stage === 'timeup', 'taboo time up');
          check('taboo: after time, the describer can no longer score', await eventually(async () => (await P(d).locator('[data-act="tbMark"]').count()) === 0 && (await cardView(d)).round.sub.segs[1].stage === 'timeup'));
          await click(H, `[data-act="tbFinish"][data-seg="${seg.segmentId}"]`);
        } else {
          await until(async () => (await P(d).locator('.bp-word').count()) > 0, 'second word');
          await click(P(d), `[data-act="tbMark"][data-result="${first ? 'foul' : 'hit'}"]`);
        }
        await until(async () => { const c = await cur(); return c.stage !== 'challenge' || c.sub.segs[k].stage === 'done'; }, 'taboo seg done');
      }
    }

    const seen = { guess_person: 0, song_relay: 0, improv_scene: 0, story_exchange: 0, taboo_description: 0 };
    let H = host; // the page currently holding host tools (host page or the host seat's own card)
    const driverFor = { guess_person: driveGuess, song_relay: driveSong, improv_scene: driveImprov, story_exchange: driveStory, taboo_description: driveTaboo };
    let roundNo = 1, closedHostPage = false;
    while (true) {
      const v = await hostOrCardView();
      r = v.round;
      if (r.stage === 'nominating') await nominate();
      await until(async () => (await hostOrCardView()).round.stage === 'revealed', 'revealed ' + roundNo);
      r = (await hostOrCardView()).round;
      const first = seen[r.type] === 0;
      await click(H, '[data-act="beginChallenge"]');
      await until(async () => (await hostOrCardView()).round.stage === 'challenge', 'challenge ' + roundNo);
      await driverFor[r.type]((await hostOrCardView()).round, first);
      seen[r.type] += 1;
      await until(async () => (await hostOrCardView()).round.stage === 'result', 'result ' + roundNo);
      const before = (await hostOrCardView()).called.length;
      await click(H, '[data-act="confirmResult"]');
      const after = await until(async () => { const x = await hostOrCardView(); return ['summary'].includes(x.round.stage) || x.phase === 'finished' ? x : null; }, 'settled ' + roundNo);
      const rs = after.round.settled;
      check(`round ${roundNo} (${r.type}) settles once: ${rs.result} calls ${rs.called.join(',') || '—'}`, after.called.length === before + rs.called.length && rs.called.length <= 2);
      if (roundNo === 1) {
        for (const n of [A[0], B[0]]) await until(async () => (await cardView(n))?.round?.stage === 'summary', 'summary card');
        await shot(P(A[0]), '10-phone-round-summary');
        await shot(host, '11-stage-round-summary');
      }
      if (after.phase === 'finished') break;
      // After round 2 the host closes the host page; their own card (same browser) keeps the game running.
      if (roundNo === 2 && !closedHostPage) {
        await host.close(); closedHostPage = true; H = P(1);
        await until(() => P(1).evaluate(() => window.BINGO_CARD.bridge()), 'host card authority', 20000);
        check('host page closed: the host seat card in the same browser took over the authority', true);
      }
      if (roundNo === 4 && closedHostPage) {
        // the host page reopens later; the card keeps the lease until it is handed over
        const again = await open('host2', hostContext, 'bingo-party.html', { storage: roomStorage });
        await until(async () => (await again.evaluate(() => window.BINGO_HOST?.status)) === 'other_host', 'reopened host page sees the card hosting');
        check('reopened host page waits instead of stealing the running game', true);
        await click(again, '#bp-takeover');
        await until(async () => (await again.evaluate(() => window.BINGO_HOST?.status)) === 'ready', 'takeover');
        pages.host = again; H = again; closedHostPage = false;
        check('the host page took the game back from the host card on request', true);
      }
      await click(H, '[data-act="nextRound"]');
      await until(async () => (await hostOrCardView()).round.no === roundNo + 1, 'next round ' + (roundNo + 1), 20000);
      roundNo += 1;
      if (roundNo > 30) throw new Error('game did not finish');
    }
    check('every challenge type was played at least once', Object.values(seen).every(n => n > 0), JSON.stringify(seen));
    const fin = await hostOrCardView();
    const lines = { A: fin.lines.A, B: fin.lines.B };
    check(`standard game ended at 3 lines: ${fin.finished.winner} (${lines.A}–${lines.B})`, fin.phase === 'finished' && !fin.finished.early && (fin.finished.winner === 'BOTH' ? lines.A >= 3 && lines.B >= 3 : lines[fin.finished.winner] >= 3));
    for (const n of allSeats) await until(async () => (await cardView(n))?.phase === 'finished', 'finished card ' + n);
    check('both boards revealed only at the end', !!(await cardView(B[0])).boards && !!(await cardView(7)).boards);
    await shot(P(A[1]), '12-phone-bingo-finished');
    await shot(H, '13-stage-bingo-finished');
    check('phones never scroll sideways (390px)', await noOverflow());

    /* ── quick game (2 lines) from the host's card ── */
    await click(H, '[data-act="newGame"]');
    await until(async () => (await hostOrCardView()).phase === 'lobby', 'new lobby');
    await click(H, '[data-act="setting"][data-key="targetLines"][data-value="2"]');
    await click(H, '[data-act="setting"][data-key="singing"][data-value="0"]');
    await click(H, '[data-act="setting"][data-key="qLang"][data-value="en"]'); // long English prompts this time
    await until(async () => { const x = await hostOrCardView(); return x.settings.targetLines === 2 && x.settings.singing === false; }, 'quick settings');
    await click(H, '[data-act="start"]');
    await until(async () => (await hostOrCardView()).phase === 'playing', 'quick started');
    lv = await hostOrCardView();
    A = lv.roster.filter(p => p.team === 'A').map(p => p.playerNum); B = lv.roster.filter(p => p.team === 'B').map(p => p.playerNum);
    check('new game keeps the teams and the watcher', A.length === 3 && B.length === 3 && lv.roster.find(p => p.playerNum === 7).team === null);
    const quickTypes = [];
    for (let q = 1; q < 30; q++) {
      const v = await hostOrCardView();
      if (v.round.stage === 'nominating') await nominate();
      await until(async () => (await hostOrCardView()).round.stage === 'revealed', 'q revealed');
      r = (await hostOrCardView()).round; quickTypes.push(r.type);
      await click(H, '[data-act="beginChallenge"]');
      await until(async () => (await hostOrCardView()).round.stage === 'challenge', 'q challenge');
      await driverFor[r.type]((await hostOrCardView()).round, false);
      await until(async () => (await hostOrCardView()).round.stage === 'result', 'q result');
      await click(H, '[data-act="confirmResult"]');
      const x = await until(async () => { const y = await hostOrCardView(); return y.round.stage === 'summary' || y.phase === 'finished' ? y : null; }, 'q settled');
      if (x.phase === 'finished') { check(`quick game ended at 2 lines (${x.lines.A}–${x.lines.B})`, Math.max(x.lines.A, x.lines.B) >= 2 && Math.max(x.lines.A, x.lines.B) < 5); break; }
      const qno = x.round.no;
      await click(H, '[data-act="nextRound"]');
      await until(async () => (await hostOrCardView()).round.no === qno + 1, 'quick next round', 20000);
    }
    check('singing off: no song relay was drawn', !quickTypes.includes('song_relay'), quickTypes.join(','));
    check('English prompts and the English interface fit 390px phones', await noOverflow() && /[A-Za-z]{4,}/.test(await P(6).evaluate(() => document.body.innerText)));
    await shot(P(6), '14-phone-english-ui');

    /* ── privacy over everything each page actually received ── */
    const own = id => id === 'host' || id === 'host2' ? null : TOKENS[Number(id.slice(1)) - 1];
    let foreign = 0, denied = 0;
    for (const [id, page] of db.state.pages) {
      denied += page.denied.length;
      if (['host', 'host2', 'p1'].includes(id)) continue; // the host browser is the trusted authority
      for (const item of page.received) if (!item.path.startsWith(`rooms/${CODE}/players/${own(id)}`)) foreign++;
    }
    check('player pages received only their own node (no other path, no denied read)', foreign === 0 && denied === 0, `foreign=${foreign} denied=${denied}`);
    check('no control-token path ever reached a non-host browser', [...db.state.pages].filter(([id]) => !['host', 'host2', 'p1'].includes(id)).every(([, p]) => p.received.every(x => !x.path.endsWith(controlToken()))));
  } catch (error) {
    console.error(error);
    results.push({ name: 'run', ok: false, detail: error.message });
    try {
      const v = await hostOrCardView();
      console.error('state at failure:', JSON.stringify({ phase: v?.phase, round: v?.round && { no: v.round.no, type: v.round.type, stage: v.round.stage, noms: v.round.nominations, sub: v.round.sub && (v.round.sub.stage || v.round.sub.cur) } }));
      const ctrl = db.dump().rooms[CODE].players[controlToken()];
      console.error('control lease:', ctrl.holder, ctrl.owner?.slice(0, 6), ctrl.leaseUntil - db.now(), 'rev', ctrl.revision);
      const canon = JSON.parse(ctrl.stateJson);
      if (pages.host && !pages.host.isClosed()) console.error('host health:', JSON.stringify(await pages.host.evaluate(() => window.BINGO_HOST.health())), 'server now', db.now(), 'clock', JSON.stringify(canon.round.clock));
      if (canon.round?.type === 'guess_person') console.error('guess sub:', JSON.stringify({ roles: canon.round.roles, sub: canon.round.sub }));
      console.error('canonical:', JSON.stringify({ phase: canon.phase, no: canon.round.no, stage: canon.round.stage, clock: canon.round.clock && { left: canon.round.clock.endsAt - db.now(), frozen: canon.round.clock.frozen }, votes: canon.round.nominations, paused: canon.paused }));
      console.error('control writes:', controlWrites.slice(-14).map(w => `${w.id}/${w.owner} r${w.rev} #${w.no} ${w.stage} v${w.votes}`).join('\n  '));
      console.error('inbox sets:', inboxSets.slice(-16).map(x => `${x.id} ${x.key.slice(0, 6)} ${x.type || ''} ${x.roundId || ''} ${x.removed ? 'REMOVED' : ''}`).join('\n  '));
      console.error('seen p2', JSON.stringify(canon.seen['2']?.slice(-4)), 'replyLog p2', JSON.stringify(canon.replyLog['2']?.slice(-3)), 'round', canon.round.id);
      const p1node = db.dump().rooms[CODE].players[TOKENS[0]];
      console.error('p1 node rev', p1node.bp?.revision, 'canon rev', canon.revision, 'p1 view round', JSON.parse(p1node.bp.viewJson).round?.no);
      for (const n of [2, 3]) console.error('replies p' + n, JSON.stringify((await cardView(n))?.replies), 'round', (await cardView(n))?.round?.id);
      console.error('log', JSON.stringify(db.state.log.filter(x => x.page === 'p2').slice(-12)));
      for (const n of allSeats) { const inbox = db.dump().rooms[CODE].players[TOKENS[n - 1]].bpInbox; if (inbox) console.error('inbox p' + n, JSON.stringify(inbox).slice(0, 300)); }
    } catch (e) { console.error('debug failed', e.message); }
    for (const [id, page] of Object.entries(pages)) await page.screenshot({ path: path.join(output, 'fail-' + id + '.png'), fullPage: true }).catch(() => {});
  } finally {
    console.log('page errors:', errors.length ? errors : 'none');
    await browser.close();
    server.close();
    const failed = results.filter(x => !x.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exitCode = failed.length || errors.length ? 1 : 0;
  }
})();
