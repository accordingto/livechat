'use strict';
// Real CUT host + ORIGINAL play.html cards, with the real engine and sync code.
// All Firebase data lives in the local production-rules-compatible fixture.
// The external executor is disabled here; no live room or network is touched.
// Run: node tests/cut-halloween.browser.cjs <playwright-package>
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { createServer, createDatabase } = require('./helpers/bingo-party-fixture.cjs');
const E = require('../cut-engine.js'), H = require('../cut-halloween-topics.js');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.CUT_QA_OUTPUT || path.join(root, '..', 'cut-halloween-review', 'browser-qa'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pool = (mode, style) => (style === 'story_openings' ? H.storyOpenings : H)[mode === 'jump' ? 'jump' : 'take'].items;
const report = { fixture: 'real host and original play.html; real trusted-host sync; isolated in-memory Firebase; external network blocked; desktop Chrome viewport emulation, not physical phones', views: [], checks: [], errors: [], blocked: [], audio: 'Not exercised by this topic-workflow harness.' };
async function until(fn, label, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const result = await fn(); if (result) return result; await pause(80); }
  throw Error('Timed out: ' + label);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { server, port } = await createServer(root), base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CUT_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const contexts = [];
  try {
    for (const width of [390, 1280]) {
      const code = 'CUTHW' + width, control = 'f'.repeat(32), tokens = ['1', '2', '3'].map(n => n.repeat(20)), names = ['Amy', 'Kevin', 'Mei'];
      const db = createDatabase(), controlPath = `rooms/${code}/players/${control}`;
      const saved = { tokens, names, playerCount: 3, cutControlToken: control };
      const storage = { ['room-session-' + code]: JSON.stringify(saved), 'room-last-session': code, 'site-lang': 'zh' };
      const state = () => { const raw = db.get(controlPath); return raw?.stateJson ? JSON.parse(raw.stateJson) : null; };
      const card = n => db.get(`rooms/${code}/players/${tokens[n - 1]}`);
      const pages = [], records = [];
      async function open(id, url, stored) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } }); contexts.push(context);
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(id + ': ' + error.message));
        await page.route('**/*', route => {
          const url = route.request().url(), pathname = new URL(url).pathname;
          if (!url.startsWith(base)) { report.blocked.push(url); return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); }
          if (pathname === '/hub-executor.js') return route.fulfill({ contentType: 'text/javascript', body: 'var HUB_EXECUTOR={install(){},observe(){}};' });
          return route.continue();
        });
        records.push(await db.attach(page, id, { storage: stored }));
        await page.goto(base + url); pages.push(page); return page;
      }
      const host = await open('host-' + width, 'cut.html?edition=halloween', storage);
      const players = [];
      for (let n = 1; n <= 3; n++) players.push(await open('p' + n + '-' + width, `play.html?s=${code}&p=${tokens[n - 1]}&n=${names[n - 1]}`, { 'site-lang': n === 3 ? 'en' : 'zh' }));
      await until(() => host.locator('#cut-start').isEnabled(), 'host authority');
      // Keep automatic speaking deadlines far away during reload checks.
      await host.selectOption('#cut-speed', 'custom');
      await host.fill('#cut-custom-min', '60'); await host.fill('#cut-custom-max', '60');
      await host.click('#cut-sound');
      assert.equal(await host.locator('#cut-topic-style-field').isVisible(), true);
      assert.equal(await host.inputValue('#cut-topic-style'), 'situations');
      await host.click('#cut-start');
      await until(() => state()?.phase === 'ready' && card(3)?.game === 'cut', 'initial canonical projection');
      // Enable the existing shared-control projection in this local fixture.
      // The actual Host stays the only authority and processes original cards.
      const initial = state(); initial.sharedControls = true;
      await db.put(controlPath, { ...db.get(controlPath), stateJson: JSON.stringify(initial), revision: db.get(controlPath).revision + 1 });
      await until(() => card(3)?.cut?.sharedControls, 'shared controls');
      async function verify(label, mode, style) {
        const current = state();
        assert.equal(current.mode, mode); assert.equal(current.topicStyle, style);
        assert.ok(pool(mode, style).some(topic => topic.id === current.topic.id), label + ' canonical bank');
        await until(async () => {
          if (players.some((_, i) => card(i + 1)?.cut?.topic?.id !== current.topic.id)) return false;
          return (await Promise.all([host, ...players].map(p => p.locator('.cut-topic h2').first().textContent().catch(() => '')))).every(text => text === current.topic.question);
        }, label + ' all screens');
        for (let n = 1; n <= 3; n++) {
          const view = card(n).cut;
          assert.equal(view.topicStyle, style); assert.deepEqual(view.topicStyles, ['situations', 'story_openings']);
          assert.equal(view.deadline, undefined); assert.equal(view.topicHistory, undefined); assert.equal(view.jumpTopicHistory, undefined);
        }
        report.checks.push(`${width}: ${label}`);
      }
      async function capture(page, label) {
        const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, clippedTopics: [...document.querySelectorAll('.cut-topic h2,.cut-hw-opening')].filter(node => node.getBoundingClientRect().width > 0 && node.scrollWidth > node.clientWidth + 1).map(node => node.textContent) }));
        assert.ok(metrics.overflow <= 1, label + ' no horizontal overflow'); assert.deepEqual(metrics.clippedTopics, []);
        const name = `${width}-${label}.png`; await page.screenshot({ path: path.join(output, name), fullPage: true });
        report.views.push({ width, label, screenshot: name, ...metrics });
      }
      async function hostStyle(style, mode) {
        await host.click('#cut-settings-open'); await until(() => state()?.phase === 'setup', 'host setup');
        if (mode) await host.click('#cut-mode-' + mode);
        if (mode === 'jump') { await host.fill('#cut-first-min', '120'); await host.fill('#cut-first-max', '120'); }
        await host.selectOption('#cut-topic-style', style); await host.click('#cut-start');
        await until(() => state()?.phase === 'ready' && state()?.topicStyle === style && (!mode || state()?.mode === mode), 'host style saved');
      }
      async function playerStyle(style) {
        const player = players[0]; await player.locator('[data-cut-management]').evaluate(node => node.open = true);
        await player.click('[data-cut-action="settings"]'); await until(() => state()?.phase === 'setup', 'card setup');
        await until(() => player.locator('select[name="topicStyle"]').isVisible(), 'card style selector');
        await player.selectOption('select[name="topicStyle"]', style);
        assert.equal(await player.locator('[data-cut-topic-style-switch]').isVisible(), style !== state().topicStyle);
        await player.click('[data-cut-settings-save]');
        await until(() => state()?.phase === 'ready' && state()?.topicStyle === style, 'card style saved');
      }
      await verify('original situations Mode 1', 'classic', 'situations');
      await capture(host, 'host-situations-take');
      const originalTopic = state().topic.id;
      await playerStyle('story_openings'); await verify('card selects story Mode 1', 'classic', 'story_openings');
      assert.ok(state().topicHistory.includes(originalTopic));
      await capture(host, 'host-story-take'); await capture(players[0], 'card-story-take');
      const firstStory = state().topic.id;
      await host.click('#cut-end-topic'); await host.click('#cut-end-accept');
      await until(() => state()?.phase === 'break', 'manual end topic'); await host.click('#cut-next');
      await until(() => state()?.phase === 'ready' && state()?.topic.id !== firstStory, 'next story');
      await verify('next topic keeps story bank', 'classic', 'story_openings');
      await host.click('#cut-begin'); await until(() => state()?.phase === 'countdown', 'manual Begin');
      await db.setSkew(4000); await until(() => state()?.phase === 'speaking', 'spoken round starts');
      const speaking = state(), beforeReload = { topic: speaking.topic.id, deadline: speaking.deadline, turnId: speaking.turnId, clock: speaking.topicClock };
      await players[1].reload(); await host.reload();
      await until(() => host.locator('#cut-settings-open').isEnabled(), 'host reload reclaims lease', 22000);
      await verify('reload preserves active story bank', 'classic', 'story_openings');
      assert.equal(state().topic.id, beforeReload.topic); assert.equal(state().deadline, beforeReload.deadline);
      assert.equal(state().turnId, beforeReload.turnId); assert.deepEqual(state().topicClock, beforeReload.clock);
      report.checks.push(`${width}: host/card reload preserves active topic, clock and deadline`);
      await host.click('#cut-settings-open'); await until(() => state()?.phase === 'setup', 'pause into settings');
      const paused = state(); assert.ok(paused.topicClock.elapsedMs > 0);
      await host.click('#cut-start'); await until(() => state()?.phase === 'ready', 'save same style');
      assert.equal(state().topic.id, paused.topic.id); assert.equal(state().round, paused.round);
      assert.deepEqual(state().topicClock, paused.topicClock); assert.equal(state().deadline, null);
      report.checks.push(`${width}: same-style settings retain elapsed topic clock and await manual Begin`);
      await hostStyle('story_openings', 'jump'); await verify('host Mode 2 keeps selected story style', 'jump', 'story_openings');
      await capture(host, 'host-story-jump'); await capture(players[2], 'card-story-jump-en');
      await playerStyle('situations'); await verify('card compares original situations Mode 2', 'jump', 'situations');
      await capture(players[0], 'card-situations-jump');
      await hostStyle('story_openings'); await verify('host reselects story Mode 2', 'jump', 'story_openings');
      await host.click('#cut-manage-open'); await host.click('#cut-restart');
      await until(() => state()?.phase === 'ready' && state().sessionId !== speaking.sessionId, 'normal restart');
      await verify('ordinary restart keeps story style', 'jump', 'story_openings');
      await host.locator('#cut-library').evaluate(node => node.open = true);
      for (const [key, count] of [['halloween-story-take', 40], ['halloween-story-jump', 30]]) {
        await host.selectOption('#cut-library-mode', key);
        assert.equal(await host.locator('#cut-library-list article').count(), count);
      }
      report.checks.push(`${width}: both new story banks available in topic library`);
      // Check an actual original card with an older executor's public payload.
      await host.close(); await pause(120);
      const oldState = { ...state(), sharedControls: true, phase: 'setup' }, legacy = E.view(oldState, 2, db.now());
      delete legacy.cut.topicStyles; delete legacy.cut.topicStyle;
      await db.put(`rooms/${code}/players/${tokens[1]}`, legacy);
      await until(() => players[1].locator('[data-cut-settings]').isVisible(), 'legacy card setup');
      assert.equal(await players[1].locator('select[name="topicStyle"]').count(), 0);
      await players[1].selectOption('select[name="edition"]', 'classic');
      assert.equal(await players[1].locator('select[name="topicStyle"]').count(), 0);
      report.checks.push(`${width}: older-service card omits unsupported topic-style control`);
      for (const record of records) assert.deepEqual(record.denied, []);
      for (const record of records.slice(1)) for (const received of record.received) {
        const payload = JSON.parse(received.json); if (payload?.game !== 'cut') continue;
        assert.equal(payload.cut.deadline, undefined); assert.equal(payload.cut.topicHistory, undefined);
        assert.ok(!received.json.includes(control), 'control bearer never sent to player');
      }
      for (const page of players) await page.close();
    }
    assert.deepEqual(report.errors, []); report.ok = true;
    console.log(JSON.stringify({ ok: true, checks: report.checks.length, screenshots: report.views.length, pageErrors: report.errors.length, output }));
  } catch (error) { report.ok = false; report.error = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
