'use strict';
// Real CUT host + three ORIGINAL play.html cards. Production-compatible local
// Firebase fixture only; actual shipped MP3s/Web Audio, no live room/network.
// Run: node tests/cut-room-audio.browser.cjs <playwright-package>
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { createServer, createDatabase } = require('./helpers/bingo-party-fixture.cjs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.CUT_ROOM_AUDIO_QA_OUTPUT || path.join(root, '..', 'cut-room-audio-review', 'browser-qa'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { fixture: 'real CUT host and three original player pages, separate browser contexts, isolated production-rules-compatible database, actual MP3 decode/start/stop', checks: [], views: [], errors: [], humanListeningVerified: false, physicalPhoneVerified: false };
async function until(fn, label, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await pause(60); }
  throw Error('Timed out: ' + label);
}
function instrumentAudio() {
  window.__roomAudioQA = { decoded: [], starts: [], stops: [], oscillators: 0 };
  window.__qaSounds = []; window.__qaBoards = []; window.__qaMusicStarts = [];
  const encodedKeys = new WeakMap(), decodedKeys = new WeakMap(), ids = new WeakMap(); let serial = 0;
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const pathname = new URL(String(args[0]), location.href).pathname;
    if (pathname.includes('/audio-v1/') && pathname.endsWith('.mp3')) {
      const originalArrayBuffer = response.arrayBuffer.bind(response), key = pathname.split('/').at(-1).replace('.mp3', '');
      response.arrayBuffer = async () => { const bytes = await originalArrayBuffer(); encodedKeys.set(bytes, key); return bytes; };
    }
    return response;
  };
  const ctx = window.BaseAudioContext?.prototype, source = window.AudioBufferSourceNode?.prototype;
  if (ctx) {
    const decode = ctx.decodeAudioData, oscillator = ctx.createOscillator;
    ctx.decodeAudioData = function (...args) {
      const key = encodedKeys.get(args[0]) || 'unknown';
      return decode.apply(this, args).then(buffer => { decodedKeys.set(buffer, key); window.__roomAudioQA.decoded.push({ key, duration: buffer.duration, channels: buffer.numberOfChannels }); return buffer; });
    };
    ctx.createOscillator = function (...args) { window.__roomAudioQA.oscillators++; return oscillator.apply(this, args); };
  }
  if (source) {
    const start = source.start, stop = source.stop;
    source.start = function (...args) { if (!ids.has(this)) ids.set(this, ++serial); window.__roomAudioQA.starts.push({ id: ids.get(this), key: decodedKeys.get(this.buffer) || 'generated', duration: this.buffer?.duration || 0, args }); return start.apply(this, args); };
    source.stop = function (...args) { window.__roomAudioQA.stops.push({ id: ids.get(this) || null, args }); return stop.apply(this, args); };
  }
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { server, port } = await createServer(root), base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CUT_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const contexts = [];
  let diagnostics = async () => null;
  try {
    for (const width of [390, 1280]) {
      const code = 'CUTRA' + width, control = 'f'.repeat(32), tokens = ['1', '2', '3'].map(n => n.repeat(20)), names = ['Amy', 'Kevin', 'Mei'];
      const db = createDatabase(), controlPath = `rooms/${code}/players/${control}`;
      const saved = { tokens, names, playerCount: 3, cutControlToken: control };
      const storage = { ['room-session-' + code]: JSON.stringify(saved), 'room-last-session': code, 'site-lang': 'zh' };
      const state = () => { const raw = db.get(controlPath); return raw?.stateJson ? JSON.parse(raw.stateJson) : null; };
      const card = n => db.get(`rooms/${code}/players/${tokens[n - 1]}`);
      const pages = [], records = [], mediaRequests = new Map();
      async function open(id, url, stored) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } }); contexts.push(context);
        const page = await context.newPage(); mediaRequests.set(page, []);
        page.on('pageerror', error => report.errors.push(id + ': ' + error.message));
        await page.addInitScript(instrumentAudio);
        await page.route('**/*', route => {
          const url = route.request().url(), pathname = new URL(url).pathname;
          if (!url.startsWith(base)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
          if (pathname.includes('/audio-v1/')) mediaRequests.get(page).push(pathname);
          if (pathname === '/hub-executor.js') return route.fulfill({ contentType: 'text/javascript', body: 'var HUB_EXECUTOR={install(){},observe(){}};' });
          if (pathname === '/cut-ui.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'cut-ui.js'), 'utf8') + '\n;{const u=CUT_UI.Sound.prototype.update;CUT_UI.Sound.prototype.update=function(...a){if(!window.__qaSounds.includes(this))window.__qaSounds.push(this);return u.apply(this,a);};}' });
          if (pathname === '/cut-halloween-audio.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'cut-halloween-audio.js'), 'utf8') + '\n;{const p=CUT_HALLOWEEN_AUDIO.Board.prototype,u=p.unlock,s=p.startMusic;p.unlock=function(...a){if(!window.__qaBoards.includes(this))window.__qaBoards.push(this);return u.apply(this,a);};p.startMusic=function(...a){window.__qaMusicStarts.push({track:a[0],options:a[1]});return s.apply(this,a);};}' });
          return route.continue();
        });
        records.push(await db.attach(page, id, { storage: stored }));
        await page.goto(base + url); pages.push(page); return page;
      }
      const host = await open('host-' + width, 'cut.html?edition=halloween', storage), players = [];
      diagnostics = async () => ({ canonical: state(), host: await host.evaluate(() => ({ status: document.querySelector('#cut-status')?.textContent, audioStatus: document.querySelector('#cut-hw-status')?.textContent, musicInput: document.querySelector('#cut-hw-music-volume')?.value, effectsInput: document.querySelector('#cut-hw-effects-volume')?.value, enabled: window.__qaSounds[0]?.enabled, roomSnapshot: window.__qaSounds[0]?.roomSnapshot, audioContexts: window.__qaBoards.map(b => ({ ready: b.ready, track: b.track })) })).catch(() => null), log: db.state.log.slice(-30) });
      for (let n = 1; n <= 3; n++) players.push(await open(`p${n}-${width}`, `play.html?s=${code}&p=${tokens[n - 1]}&n=${names[n - 1]}`, { 'site-lang': n === 3 ? 'en' : 'zh' }));
      await until(() => host.locator('#cut-start').isEnabled(), 'host authority');
      await host.selectOption('#cut-speed', 'custom'); await host.fill('#cut-custom-min', '60'); await host.fill('#cut-custom-max', '60');
      await host.click('#cut-sound'); // Keep initial topic setup quiet on the host, too.
      await host.click('#cut-start');
      await until(() => state()?.phase === 'ready' && card(3)?.cut?.audio?.version === 1, 'new authoritative room audio projection');
      for (const player of players) await player.locator('[data-cut-sound]').waitFor();
      const initialGame = state(), gameIdentity = s => ({ topic: s.topic, turnId: s.turnId, phase: s.phase, deadline: s.deadline, clock: s.topicClock, stats: s.stats, recent: s.recent });
      const beforeAudioCommands = gameIdentity(initialGame);
      for (const page of [host, ...players]) assert.deepEqual(mediaRequests.get(page), [], 'no recording download before own sound gesture');
      assert.equal(card(1).cut.canControlAudio, false, 'player receives no host audio authority');
      for (const player of players) assert.equal(await player.locator('[data-hw-track],[data-hw-fx]').count(), 0, 'private card exposes no room mixer');
      report.checks.push(`${width}: authoritative audio reaches all original cards; each stays lazy/muted and has no host controls`);
      await host.click('#cut-sound'); await players[0].click('[data-cut-sound]'); await players[1].click('[data-cut-sound]');
      const audible = [host, players[0], players[1]], all = [host, ...players];
      const board = page => page.evaluate(() => { const b = window.__qaSounds[0]?.halloweenBoard; return b ? { ready: b.ready, track: b.track, musicVolume: b.musicVolume, effectsVolume: b.effectsVolume, voices: b.fxVoices.size } : null; });
      const starts = (page, key) => page.evaluate(k => window.__roomAudioQA.starts.filter(s => !k || s.key === k), key);
      const enabled = page => page.evaluate(() => window.__qaSounds[0]?.enabled);
      await until(async () => (await Promise.all(audible.map(board))).every(b => b?.ready), 'three own gestures decode effects');
      async function volume(id, value) { await host.locator(id).evaluate((node, v) => { node.value = String(v); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); }, value); }
      await volume('#cut-hw-music-volume', 21); await until(() => state()?.audio.musicVolume === .21, 'music volume authority');
      await volume('#cut-hw-effects-volume', 43); await until(() => state()?.audio.effectsVolume === .43, 'effects volume authority');
      await host.click('[data-hw-track="wind"]');
      await until(async () => state()?.audio.music === 'wind' && (await Promise.all(audible.map(board))).every(b => b?.track === 'wind' && b.musicVolume === .21 && b.effectsVolume === .43), 'music and both volumes reach all enabled devices');
      await until(async () => (await Promise.all(audible.map(p => starts(p, 'wind')))).every(a => a.length > 0), 'wind buffers actually begin on all enabled devices');
      assert.equal(await players[2].evaluate(() => window.__roomAudioQA.decoded.length), 0);
      assert.deepEqual(gameIdentity(state()), beforeAudioCommands);
      for (let n = 1; n <= 3; n++) {
        const audio = card(n).cut.audio;
        // Firebase drops null-valued public children; canonical stateJson does not.
        assert.deepEqual({ ...audio, music: audio.music ?? null, musicStartedAt: audio.musicStartedAt ?? null, event: audio.event ?? null }, state().audio);
      }
      report.checks.push(`${width}: host music/volume changes reach enabled devices without starting or changing the game`);
      const oldMusicAt = state().audio.musicStartedAt, priorWindStarts = await Promise.all(audible.map(p => starts(p, 'wind')));
      await volume('#cut-hw-music-volume', 17); await until(async () => (await Promise.all(audible.map(board))).every(b => b.musicVolume === .17), 'volume-only update follows');
      assert.equal(state().audio.musicStartedAt, oldMusicAt);
      assert.deepEqual((await Promise.all(audible.map(p => starts(p, 'wind')))).map(a => a.length), priorWindStarts.map(a => a.length), 'volume update does not restart music');
      const beforeDoor = await Promise.all(audible.map(p => starts(p, 'door')));
      await host.click('[data-hw-fx="door"]');
      await until(async () => (await Promise.all(audible.map(p => starts(p, 'door')))).every((a, i) => a.length === beforeDoor[i].length + 1), 'one host manual effect on all enabled devices');
      await pause(350);
      assert.deepEqual((await Promise.all(audible.map(p => starts(p, 'door')))).map(a => a.length), beforeDoor.map(a => a.length + 1));
      assert.deepEqual(gameIdentity(state()), beforeAudioCommands);
      report.checks.push(`${width}: manual host effect is broadcast exactly once; volume-only changes do not restart music`);
      await players[1].click('[data-cut-sound]'); await until(() => enabled(players[1]).then(v => v === false), 'local mute');
      await until(() => board(players[1]).then(b => b?.track === null && b.voices === 0), 'mute stops music and effects');
      const mutedCount = (await starts(players[1])).length;
      await host.click('[data-hw-track="rain"]');
      await until(async () => state()?.audio.music === 'rain' && (await Promise.all([host, players[0]].map(board))).every(b => b?.track === 'rain'), 'new music follows on audible clients');
      await host.click('[data-hw-fx="laugh"]'); await until(() => starts(players[0], 'laugh').then(a => a.length === 1), 'new manual effect on audible client');
      await pause(350); assert.equal((await starts(players[1])).length, mutedCount); assert.deepEqual(mediaRequests.get(players[2]), []);
      report.checks.push(`${width}: local mute suppresses new host events and silent clients download nothing`);
      // Joining/unmuting follows current music, never an old one-shot effect.
      await pause(350);
      await players[2].click('[data-cut-sound]'); await players[1].click('[data-cut-sound]');
      await until(async () => (await Promise.all(players.slice(1).map(board))).every(b => b?.track === 'rain'), 'late enable follows current music');
      await until(() => starts(players[2], 'rain').then(a => a.length > 0), 'late music buffer actually starts');
      assert.equal((await starts(players[2], 'laugh')).length, 0); assert.equal((await starts(players[1], 'laugh')).length, 0);
      assert.ok((await starts(players[2], 'rain'))[0].args[1] > 0, 'late music follower starts at current offset');
      const liveTopic = state().topic.id, liveTurn = state().turnId;
      await players[0].reload(); await players[0].locator('[data-cut-sound]').waitFor();
      assert.equal(await enabled(players[0]), false); assert.equal(await players[0].evaluate(() => window.__roomAudioQA.starts.length), 0);
      await players[0].click('[data-cut-sound]'); await until(() => board(players[0]).then(b => b?.track === 'rain'), 'reloaded player resumes current music after gesture');
      assert.equal((await starts(players[0], 'laugh')).length, 0); assert.equal((await starts(players[0], 'door')).length, 0);
      assert.equal(state().topic.id, liveTopic); assert.equal(state().turnId, liveTurn);
      report.checks.push(`${width}: late enable and original-link reload resume current music without replaying old effects`);
      await host.selectOption('#cut-hw-cut-effect', 'scream');
      await until(() => state()?.audio.cutEffect === 'scream', 'automatic effect selection');
      const beforeScream = await Promise.all(all.map(p => starts(p, 'scream')));
      await host.click('#cut-begin'); await until(() => state()?.phase === 'countdown', 'manual game Start');
      await db.setSkew(4000); await until(() => state()?.phase === 'speaking', 'GO');
      await db.setSkew(db.state.skew + state().deadline - db.now() + 200); await until(() => state()?.phase === 'cut', 'authoritative CUT');
      await until(async () => (await Promise.all(all.map(p => starts(p, 'scream')))).every((a, i) => a.length === beforeScream[i].length + 1), 'selected CUT effect reaches all four devices');
      await pause(350); assert.deepEqual((await Promise.all(all.map(p => starts(p, 'scream')))).map(a => a.length), beforeScream.map(a => a.length + 1));
      report.checks.push(`${width}: host-selected automatic CUT recording plays once on host and all three original cards`);
      await host.selectOption('#cut-hw-cut-effect', 'random'); await until(() => state()?.audio.cutEffect === 'random', 'random effect selection');
      const beforeRandom = await Promise.all(all.map(p => starts(p)));
      await host.click('#cut-begin'); await until(() => state()?.phase === 'speaking', 'next speaker manually starts');
      await db.setSkew(db.state.skew + state().deadline - db.now() + 200); await until(() => state()?.phase === 'cut', 'second CUT');
      const scareKeys = ['scream', 'laugh', 'ghost', 'howl', 'thunder'];
      await until(async () => (await Promise.all(all.map(p => starts(p)))).every((a, i) => a.slice(beforeRandom[i].length).some(s => scareKeys.includes(s.key))), 'same random CUT on all devices');
      const chosen = (await Promise.all(all.map(p => starts(p)))).map((a, i) => a.slice(beforeRandom[i].length).filter(s => scareKeys.includes(s.key)).map(s => s.key));
      assert.ok(chosen.every(keys => keys.length === 1 && keys[0] === chosen[0][0]));
      report.checks.push(`${width}: random CUT resolves to the same single recording on every device`);
      const musicRuns = await Promise.all(all.map(page => page.evaluate(() => window.__qaMusicStarts.length)));
      const topicBeforeSettings = state().topic.id;
      await host.click('#cut-settings-open'); await until(() => state()?.phase === 'setup' && [1, 2, 3].every(n => card(n)?.cut?.phase === 'setup'), 'room settings');
      assert.ok((await Promise.all(all.map(board))).every(b => b?.track === 'rain'));
      await host.click('#cut-start'); await until(() => state()?.phase === 'ready' && [1, 2, 3].every(n => card(n)?.cut?.phase === 'ready'), 'same topic settings saved');
      assert.equal(state().topic.id, topicBeforeSettings);
      assert.ok((await Promise.all(all.map(board))).every(b => b?.track === 'rain'));
      assert.deepEqual(await Promise.all(all.map(page => page.evaluate(() => window.__qaMusicStarts.length))), musicRuns, 'settings/ready changes do not restart room music');
      report.checks.push(`${width}: settings and manual-ready transitions keep current room music continuous`);
      await host.click('#cut-hw-stop'); await until(async () => state()?.audio.music == null && (await Promise.all(all.map(board))).every(b => b?.track === null), 'host stops music for everyone');
      for (const page of all) assert.equal(await page.evaluate(() => window.__roomAudioQA.oscillators), 0, 'recorded tracks/effects need no effect oscillators');
      const overflow = await Promise.all(all.map(page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))); assert.ok(overflow.every(v => v <= 1));
      await host.screenshot({ path: path.join(output, `${width}-host-room-audio.png`), fullPage: true });
      await players[2].screenshot({ path: path.join(output, `${width}-player-room-audio.png`), fullPage: true });
      report.views.push({ width, screenshots: [`${width}-host-room-audio.png`, `${width}-player-room-audio.png`], overflow, randomEffect: chosen[0][0], sourceStarts: await Promise.all(all.map(async p => (await starts(p)).length)) });
      report.checks.push(`${width}: host stop reaches every device; responsive host/player views have no horizontal overflow`);
      for (const record of records) assert.deepEqual(record.denied, []);
      for (const record of records.slice(1)) for (const received of record.received) {
        const payload = JSON.parse(received.json); if (payload?.game !== 'cut') continue;
        assert.equal(payload.cut.deadline, undefined); assert.equal(payload.cut.topicHistory, undefined); assert.ok(!received.json.includes(control));
      }
      for (const page of all) await page.close();
    }
    assert.deepEqual(report.errors, []); report.ok = true;
    console.log(JSON.stringify({ ok: true, checks: report.checks.length, screenshots: report.views.length * 2, pageErrors: report.errors.length, output }));
  } catch (error) { report.ok = false; report.error = error.stack; report.diagnostics = await diagnostics(); throw error; }
  finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
