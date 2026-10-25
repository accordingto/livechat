'use strict';
// Isolated audit of the actual itemCard renderer and shipped bitmaps. This is
// not a live game, room test or replacement for word-wolf-ui.browser.cjs.
// Run: node tests/word-wolf-art.browser.cjs <playwright-package>
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), C = require('../word-wolf-content.js'), A = require('../word-wolf-art.js');
const items = C.PAIRS.flatMap(pair => [pair.a, pair.b]);
const output = path.resolve(process.env.WW_ART_QA_OUTPUT || path.join(root, '..', 'word-wolf-art-renderer-qa'));
const relative = path.relative(root, output);
assert.ok(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'QA output must be outside the public Hub');
const missing = A.ids.filter(id => !fs.existsSync(path.join(root, A.get(id).src)));
assert.equal(missing.length, 0, `Actual images required before renderer QA: ${missing.length} missing`);
fs.mkdirSync(output, { recursive: true });
const sourceFiles = ['shared.css', 'card-table-ui.js', 'card-table.css', 'word-wolf-ui.js', 'word-wolf.css', 'word-wolf-content.js', 'word-wolf-art.js', ...A.ids.map(id => A.get(id).src)];
const hashes = () => Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const before = hashes(), mime = { '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const report = { fixture: 'isolated actual itemCard renderer; no Firebase, no game state and no external network; Chromium phone viewport, not a physical phone', items: items.length, inspections: [], screenshots: [], errors: [] };
const shell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/shared.css"><link rel="stylesheet" href="/card-table.css"><link rel="stylesheet" href="/word-wolf.css"><script>window.I18N={lang:'en',dicts:{},registerDict(ns,dict){this.dicts[ns]=dict},t(ns,key){return this.dicts[ns]?.[key]?.[this.lang]||key}};</script><script src="/card-table-ui.js"></script><script src="/word-wolf-content.js"></script><script src="/word-wolf-art.js"></script><script src="/word-wolf-ui.js"></script></head><body class="ct-card-page ww-card-page"><main class="secret-card ct-card ww-card"><div data-ct-main></div></main></body></html>`;
(async () => {
  const browser = await chromium.launch({ channel: process.env.WW_QA_CHANNEL || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://word-wolf-art.test') return route.abort();
      if (url.pathname === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: shell });
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://word-wolf-art.test/');
    const render = async (id, compact, width = 320) => {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      await page.evaluate(({ id, compact }) => {
        const item = WORD_WOLF_CONTENT.PAIRS.flatMap(pair => [pair.a, pair.b]).find(item => item.id === id);
        document.querySelector('[data-ct-main]').innerHTML = WORD_WOLF_UI.itemCard(item, 'YOUR SECRET CARD', compact);
      }, { id, compact });
      await page.locator('img.ww-object-art').evaluate(image => image.decode());
      const metrics = await page.evaluate(() => {
        const image = document.querySelector('img.ww-object-art'), frame = image.parentElement, en = document.querySelector('.ww-item-caption h2'), zh = document.querySelector('.ww-item-zh');
        const fit = element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
        return { overflow: document.documentElement.scrollWidth - innerWidth, natural: [image.naturalWidth, image.naturalHeight], frameWidth: frame.getBoundingClientRect().width,
          frameHeight: frame.getBoundingClientRect().height, objectFit: getComputedStyle(image).objectFit,
          en: en.innerText, zh: zh.innerText, enFits: fit(en), zhFits: fit(zh), enFont: parseFloat(getComputedStyle(en).fontSize), zhFont: parseFloat(getComputedStyle(zh).fontSize) };
      });
      assert.ok(metrics.overflow <= 1, id + ': horizontal overflow'); assert.deepEqual(metrics.natural, [640, 640], id + ': decoded bitmap');
      assert.ok(Math.abs(metrics.frameWidth - metrics.frameHeight) <= 1, id + ': square image frame'); assert.equal(metrics.objectFit, 'contain');
      assert.ok(metrics.enFits && metrics.zhFits, id + ': unclipped labels'); assert.ok(metrics.enFont >= (compact ? 20 : 24) && metrics.zhFont >= 14, id + ': readable labels');
      assert.ok(compact ? metrics.frameWidth <= 90 : metrics.frameWidth >= 150, id + ': full artwork versus compact voting card');
      report.inspections.push({ id, compact, width, ...metrics });
    };
    const representatives = new Set(['american-football', 'flight-attendant', 'disappointed', 'measuring-tape', 'radio-show', 'modem']);
    for (const item of items) for (const compact of [false, true]) {
      await render(item.id, compact);
      const metrics = report.inspections.at(-1); assert.equal(metrics.en, item.en); assert.equal(metrics.zh, item.zh);
      if (representatives.has(item.id)) {
        const file = item.id + (compact ? '-vote' : '-describe') + '-320.png';
        await page.screenshot({ path: path.join(output, file), fullPage: true }); report.screenshots.push(file);
      }
    }
    for (const id of ['american-football', 'flight-attendant']) for (const compact of [false, true]) await render(id, compact, 390);
    assert.deepEqual(report.errors, []); assert.deepEqual(hashes(), before, 'source and images stay unchanged during inspection');
    report.ok = true;
  } catch (error) { report.ok = false; report.failure = error.message; throw error; }
  finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify({ ok: report.ok, items: report.items, inspections: report.inspections.length, screenshots: report.screenshots.length, errors: report.errors.length, output }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
