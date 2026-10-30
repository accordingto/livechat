'use strict';
// Objective Web Audio checks in real Chrome, using actual local MP3 files.
// No live database, external network, microphone or subjective listening claim.
// Run: node tests/cut-halloween-audio.browser.cjs <playwright-package>
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { createServer, createDatabase } = require('./helpers/bingo-party-fixture.cjs');
const E = require('../cut-engine.js');
const root = path.resolve(__dirname, '..'), output = path.resolve(process.env.CUT_QA_OUTPUT || path.join(root, '..', 'cut-halloween-review', 'browser-qa'));
const manifest = require('../assets/cut-halloween/audio-v1/manifest.json');
const effects = ['scream', 'laugh', 'ghost', 'howl', 'door', 'thunder', 'heartbeat', 'bell'];
const report = { fixture: 'real Chrome Web Audio decode and source start/stop; actual local MP3; external network blocked; viewport emulation, not physical phones', checks: [], views: [], errors: [], humanListeningVerified: false };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 10000) { const start = Date.now(); while (Date.now() - start < timeout) { const result = await fn(); if (result) return result; await pause(60); } throw Error('Timed out: ' + label); }
function instrumentAudio() {
  window.__audioQA = { decoded: [], starts: [], stops: [], oscillators: 0 };
  window.__qaBoards = []; window.__qaSounds = [];
  const ctx = window.BaseAudioContext?.prototype, source = window.AudioBufferSourceNode?.prototype;
  if (ctx) {
    const decode = ctx.decodeAudioData, oscillator = ctx.createOscillator;
    ctx.decodeAudioData = function (...args) { return decode.apply(this, args).then(buffer => { window.__audioQA.decoded.push({ duration: buffer.duration, channels: buffer.numberOfChannels, sampleRate: buffer.sampleRate, frames: buffer.length }); return buffer; }); };
    ctx.createOscillator = function (...args) { window.__audioQA.oscillators++; return oscillator.apply(this, args); };
  }
  if (source) {
    const start = source.start, stop = source.stop, ids = new WeakMap(); let serial = 0;
    source.start = function (...args) { if (!ids.has(this)) ids.set(this, ++serial); window.__audioQA.starts.push({ id: ids.get(this), duration: this.buffer?.duration || 0, args }); return start.apply(this, args); };
    source.stop = function (...args) { window.__audioQA.stops.push({ id: ids.get(this) || null, args }); return stop.apply(this, args); };
  }
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { server, port } = await createServer(root), base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CUT_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    async function open(width, url, db, id) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } }), page = await context.newPage(), requests = [];
      page.on('pageerror', error => report.errors.push(id + ': ' + error.message));
      await page.addInitScript(instrumentAudio);
      await page.route('**/*', route => {
        const url = route.request().url(), pathname = new URL(url).pathname;
        if (!url.startsWith(base)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
        if (pathname.includes('/audio-v1/')) requests.push(pathname);
        if (pathname === '/hub-executor.js') return route.fulfill({ contentType: 'text/javascript', body: 'var HUB_EXECUTOR={install(){},observe(){}};' });
        if (pathname === '/cut-ui.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, pathname), 'utf8') + '\n;{const u=CUT_UI.Sound.prototype.unlock;CUT_UI.Sound.prototype.unlock=function(...a){if(!window.__qaSounds.includes(this))window.__qaSounds.push(this);return u.apply(this,a);};}' });
        if (pathname === '/cut-halloween-audio.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, pathname), 'utf8') + '\n;{const u=CUT_HALLOWEEN_AUDIO.Board.prototype.unlock;CUT_HALLOWEEN_AUDIO.Board.prototype.unlock=function(...a){if(!window.__qaBoards.includes(this))window.__qaBoards.push(this);return u.apply(this,a);};}' });
        return route.continue();
      });
      if (db) await db.attach(page, id);
      await page.goto(base + url); return { context, page, requests };
    }
    for (const width of [390, 1280]) {
      const classic = await open(width, 'cut.html?demo=1', null, 'classic-' + width);
      await classic.page.click('#cut-start'); await classic.page.locator('#cut-scene .cut-topic h2').waitFor();
      const before = await classic.page.locator('#cut-scene').innerHTML();
      await classic.page.locator('#cut-library').evaluate(node => node.open = true);
      await classic.page.selectOption('#cut-library-mode', 'halloween-story-take');
      await classic.page.fill('#cut-library-search', 'midnight'); await pause(250);
      assert.equal(await classic.page.locator('#cut-scene').innerHTML(), before, 'browsing the other bank does not redraw the active topic');
      assert.deepEqual(classic.requests, [], 'classic play and topic browsing fetch no Halloween media');
      report.checks.push(`${width}: classic and read-only topic browsing fetch no recordings or redraw the topic`);
      await classic.context.close();
      const host = await open(width, 'cut.html?demo=1&edition=halloween', null, 'audio-host-' + width), p = host.page;
      assert.deepEqual(host.requests, [], 'Halloween initial display remains lazy');
      await p.click('#cut-hw-unlock');
      await until(() => p.evaluate(() => window.__qaBoards[0]?.ready), 'all eight effects decode');
      const decoded = await p.evaluate(() => window.__audioQA.decoded);
      assert.equal(decoded.length, 8); assert.ok(decoded.every(clip => clip.channels === 1 && clip.sampleRate > 0 && clip.frames > 0));
      for (const key of effects) {
        const before = await p.evaluate(() => window.__audioQA.starts.length);
        await p.click(`[data-hw-fx="${key}"]`);
        await until(() => p.evaluate(count => window.__audioQA.starts.length > count, before), key + ' source starts');
        const voice = await p.evaluate(() => window.__audioQA.starts.at(-1));
        assert.ok(Math.abs(voice.duration - manifest.assets[key].duration) < .06, key + ' uses its decoded recording');
      }
      assert.equal(await p.evaluate(() => window.__audioQA.oscillators), 0, 'no oscillator used for the eight effects');
      for (const key of ['wind', 'rain']) {
        const before = await p.evaluate(() => window.__audioQA.starts.length);
        await p.click(`[data-hw-track="${key}"]`);
        await until(() => p.evaluate(({ count, key }) => window.__qaBoards[0]?.track === key && window.__audioQA.starts.length > count, { count: before, key }), key + ' ambience starts');
        assert.equal(await p.getAttribute(`[data-hw-track="${key}"]`, 'aria-pressed'), 'true');
        await p.click('#cut-hw-stop');
        await until(() => p.evaluate(() => window.__qaBoards[0]?.track === null), 'ambience stop');
      }
      assert.equal(await p.evaluate(() => window.__audioQA.decoded.length), 10);
      await p.click('[data-hw-fx="door"]');
      await until(() => p.evaluate(() => window.__qaBoards[0]?.fxVoices.size > 0), 'effect active before hiding');
      await p.click('#cut-edition-classic');
      assert.equal(await p.evaluate(() => window.__qaBoards[0].fxVoices.size), 0, 'hiding the board stops active effects');
      assert.equal(await p.evaluate(() => window.__qaBoards[0].track), null);
      report.checks.push(`${width}: first enable decodes eight mono effects; each plays a real buffer; wind/rain decode and play; hiding stops effects`);
      const metrics = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(metrics <= 1);
      await p.click('#cut-edition-halloween');
      await p.screenshot({ path: path.join(output, `${width}-recorded-audio-board.png`), fullPage: true });
      report.views.push({ width, decoded: await p.evaluate(() => window.__audioQA.decoded), starts: await p.evaluate(() => window.__audioQA.starts.length), requests: host.requests, screenshot: `${width}-recorded-audio-board.png` });
      await host.context.close();
      // The original shared player card owns its own opt-in and audio context.
      const db = createDatabase(), token = 'a'.repeat(20), state = E.create({ id: 'card-audio-' + width, edition: 'halloween', topicStyle: 'story_openings', now: Date.now(), seed: 12, roster: [{ playerNum: 1, name: 'Amy' }, { playerNum: 2, name: 'Kevin' }] });
      state.sharedControls = true; await db.put(`rooms/AUDIO${width}/players/${token}`, E.view(state, 1, Date.now()));
      const card = await open(width, `play.html?s=AUDIO${width}&p=${token}&n=Amy`, db, 'audio-card-' + width), c = card.page;
      await c.locator('[data-cut-sound]').waitFor(); assert.deepEqual(card.requests, [], 'original player card is quiet and fetches no clips initially');
      await c.click('[data-cut-sound]'); await until(() => c.evaluate(() => window.__qaSounds[0]?.halloweenBoard?.ready), 'player own gesture loads recordings');
      await c.evaluate(() => window.__qaSounds[0].cue('cut'));
      await until(() => c.evaluate(() => window.__qaSounds[0].halloweenBoard.fxVoices.size > 0), 'player recorded CUT plays');
      await c.click('[data-cut-sound]');
      assert.equal(await c.evaluate(() => window.__qaSounds[0].enabled), false);
      assert.equal(await c.evaluate(() => window.__qaSounds[0].halloweenBoard.fxVoices.size), 0, 'muting stops active recorded effect');
      const beforeMuted = await c.evaluate(() => window.__audioQA.starts.length);
      await c.evaluate(() => window.__qaSounds[0].cue('cut'));
      assert.equal(await c.evaluate(() => window.__audioQA.starts.length), beforeMuted, 'muted cues create no buffer source');
      assert.equal(await c.evaluate(() => window.__audioQA.oscillators), 0);
      report.checks.push(`${width}: original player card lazy-loads on its own gesture; recorded CUT plays; mute stops and suppresses sources`);
      await card.context.close();
    }
    assert.deepEqual(report.errors, []); report.ok = true;
    console.log(JSON.stringify({ ok: true, checks: report.checks.length, hostDecoded: report.views.map(view => view.decoded.length), humanListeningVerified: false, output }));
  } catch (error) { report.ok = false; report.error = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(output, 'audio-report.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
