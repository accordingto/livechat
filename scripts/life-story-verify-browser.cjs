'use strict';
// Read-only production entry checks in new, empty browser contexts. Multiplayer
// flows are exercised by the separate real-page and disposable-service suites.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const release = process.argv[2] || 'life-story-3';
const output = path.resolve(__dirname, '../../test-results/hub-life-story-production-ui3');
const report = { release, locales: [], writes: 0, roomRequests: 0 };
const expected = {
  'life-story-ui.js': 'life-story-3', 'life-story.css': 'life-story-3',
  'life-story-engine.js': 'life-story-2', 'dixit-ui.js': 'life-story-2',
  'dixit-sync.js': 'life-story-2', 'dixit-host.js': 'life-story-2',
  'room.js': 'life-story-1', 'hub-executor.js': 'life-story-1'
};
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    for (const locale of ['en', 'zh']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(value => localStorage.setItem('site-lang', value), locale);
      await context.route('**/*', async route => {
        const request = route.request();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          report.writes++; return route.abort();
        }
        if (/firebasedatabase\.app|firebaseio\.com/.test(request.url())) {
          report.roomRequests++; return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://livechat-two-alpha.vercel.app/dixit.html?v=' + encodeURIComponent(release), { waitUntil: 'networkidle', timeout: 60000 });
      // With no saved Hub room, setup is intentionally hidden and launch is
      // disabled. Inspect available modes without manufacturing a room/session.
      const result = await page.evaluate(async () => ({
        mode: [...document.querySelector('#dx-mode').options].map(item => item.value),
        packs: [...document.querySelector('#dx-life-pack').options].map(item => item.value),
        language: [...document.querySelector('#dx-life-locale').options].map(item => item.value),
        note: document.querySelector('#dx-art-note').textContent,
        disabled: document.querySelector('#dx-open').disabled,
        roomStorage: localStorage.getItem('room-last-session'),
        assets: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(item => item.getAttribute('src') || item.getAttribute('href')),
        helpers: { card: typeof DIXIT_UI.cardHTML, reveal: typeof DIXIT_UI.revealHTML,
          life: typeof LIFE_STORY_UI.Card, tick: await DIXIT_SYNC.Host.prototype.tickClock() },
        ready: await HUB_EXECUTOR.lifeStoryReady()
      }));
      assert.deepEqual(result.mode, ['classic', 'life_story']);
      assert.deepEqual(result.packs, ['dixit_original', 'dixit_base84']);
      assert.deepEqual(result.language, ['en', 'zh-TW']);
      assert(result.note.includes('126') && !result.note.includes('{n}'));
      assert(result.disabled && result.roomStorage === null && result.ready);
      assert.deepEqual(result.helpers, { card: 'function', reveal: 'function', life: 'function', tick: false });
      for (const [file, version] of Object.entries(expected)) {
        const matches = result.assets.filter(value => new URL(value, page.url()).pathname === '/' + file);
        assert.equal(matches.length, 1, file);
        assert.equal(new URL(matches[0], page.url()).searchParams.get('v'), version, file);
      }
      assert.deepEqual(errors, []);
      report.locales.push({ locale, ...result, pageErrors: errors });
      await page.screenshot({ path: path.join(output, locale + '-manager.png'), fullPage: true });
      await context.close();
    }
    assert.equal(report.writes, 0); assert.equal(report.roomRequests, 0);
    report.ok = true;
    console.log('Production EN/ZH entry checks passed; zero room requests, writes or page errors.');
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
