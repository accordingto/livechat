'use strict';
// Opt-in native browser check on a fresh synthetic table only. There is no
// Firebase connection, real room credential, or player-card backdoor.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const files = new Set(['once-upon-a-time.css', 'once-upon-a-time-modern-future-deck.js', 'once-upon-a-time-halloween-deck.js', 'once-upon-a-time-deck.js', 'once-upon-a-time-engine.js', 'once-upon-a-time-ui.js']);
const html = '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/once-upon-a-time.css"><body class="once-card-page"><main id="content"></main>' +
  ['once-upon-a-time-modern-future-deck.js', 'once-upon-a-time-halloween-deck.js', 'once-upon-a-time-deck.js', 'once-upon-a-time-engine.js', 'once-upon-a-time-ui.js'].map(file => '<script src="/' + file + '"></script>').join('') + '</body></html>';
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!name) { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  const resolved = path.resolve(root, name);
  if ((!files.has(name) && !name.startsWith('assets/once-upon-a-time/')) || !resolved.startsWith(root + path.sep) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'application/javascript' : name.endsWith('.svg') ? 'image/svg+xml' : 'image/webp');
  fs.createReadStream(resolved).pipe(response);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.ONCE_UI_BROWSER || 'chrome' });
    for (const targetWorld of ['classic', 'modern-future', 'halloween']) for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }, { width: 1280, height: 800, host: true }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
      await page.evaluate(host => {
        window.testState = ONCE_ENGINE.create({ id: 'native-settings-fixture', roster: Array.from({ length: 6 }, (_, i) => ({ playerNum: i + 1, name: 'Seat ' + (i + 1) })), seed: 120, now: 1000, sharedControls: true });
        window.testCommands = []; window.holdSettings = true; window.now = 2000;
        window.accept = command => {
          testState = ONCE_ENGINE.apply(testState, { ...command, actor: host ? 0 : 2, seed: 243, now: ++window.now });
          window.testCard.update(ONCE_ENGINE.view(testState, host ? 0 : 2, window.now));
        };
        window.testCard = new ONCE_UI.Card(document.getElementById('content'), { host, send: async command => { testCommands.push(command); if (!holdSettings) accept(command); } });
        testCard.update(ONCE_ENGINE.view(testState, host ? 0 : 2, window.now));
      }, !!viewport.host);
      const world = page.locator('[data-once-setting="world"]'), size = page.locator('[data-once-setting="handSize"]');
      assert.equal(await size.inputValue(), 'original');
      assert.equal(await page.locator('.once-opening-count').innerText(), '5 Story Cards + 1 Ending per player');
      await world.selectOption(targetWorld); await size.selectOption('3');
      assert.equal(await page.getByRole('button', { name: 'Deal cards', exact: true }).isDisabled(), true);
      await page.evaluate(host => {
        const update = ONCE_ENGINE.view(testState, host ? 0 : 2, ++window.now); update.once.hostLiveUntil = 60000; update.once.revision++;
        testCard.update(update);
      }, !!viewport.host);
      assert.equal(await world.inputValue(), targetWorld); assert.equal(await size.inputValue(), '3');
      await page.getByRole('button', { name: 'Save settings', exact: true }).click();
      assert.equal(await world.isDisabled(), true); assert.equal(await size.isDisabled(), true);
      assert.equal(await page.evaluate(() => testCommands.length), 1);
      await page.evaluate(() => { accept(testCommands[0]); window.holdSettings = false; });
      assert.equal(await world.inputValue(), targetWorld); assert.equal(await size.inputValue(), '3');
      assert.equal(await world.isDisabled(), false); assert.equal(await size.isDisabled(), false);
      assert.equal(await page.getByRole('button', { name: 'Save settings', exact: true }).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Deal cards', exact: true }).isDisabled(), false);
      assert.equal(await page.locator('.once-opening-count').innerText(), '3 Story Cards + 1 Ending per player');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'settings stay inside the viewport');
      await page.getByRole('button', { name: 'Deal cards', exact: true }).click();
      assert.equal(await world.count(), 0, 'configuration disappears once cards are dealt');
      assert.equal(await page.locator('.once-hand [data-once-card]').count(), viewport.host ? 0 : 3);
      assert.ok((await page.locator('.once-world-tag').innerText()).includes({ classic: 'Classic fairy tales', 'modern-future': 'Modern & Future', halloween: 'Spooky Halloween' }[targetWorld]));
      assert.equal(await page.evaluate(() => testState.roster.every(p => testState.hands[p.playerNum].length === 3)), true);
      assert.equal(await page.evaluate(worldId => testState.roster.every(p => testState.hands[p.playerNum].every(id => ONCE_DECK.getWorld(worldId).storyCards.some(card => card.id === id))), targetWorld), true, 'world decks never mix');
      assert.deepEqual(errors, []);
      await page.evaluate(() => testCard.destroy()); await context.close();
      process.stdout.write('PASS settings: ' + targetWorld + ', ' + viewport.width + 'px, ' + (viewport.host ? 'public host' : 'shared player') + ', draft/acknowledgement/3-card separate-world deal\n');
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
