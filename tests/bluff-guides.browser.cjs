'use strict';
// Actual page/CSS/art against a read-only transport stub. No live Firebase,
// credentials, original room or external network is used by this layout audit.
// Run: node tests/bluff-guides.browser.cjs [path-to-playwright-package]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const E = require('../bluff-king-engine.js'), bank = require('../bluff-king-topics.js');
const root = path.resolve(__dirname, '..'), output = path.resolve(process.env.BLUFF_QA_OUTPUT || path.join(root, '..', 'bluff-guides-browser-qa'));
const stub = `window.BLUFF_SYNC={Client:class{constructor(options){this.options=options;this.lastView=window.__bluffView;window.__bluffOptions=options;}async connect(){this.options.onView(this.lastView);this.options.onStatus('connected');return this.lastView;}async refresh(){return this.lastView;}async command(input){window.__bluffCommands.push(input);return this.lastView;}close(){}}};`;
function fixture(deck, mode, phase, role, shared = false) {
  const store = E.blankStore(); let serial = 0;
  const options = { now: Date.now(), rng: () => 0, uuid: () => 'qa-guide-' + ++serial };
  const act = (action, extra = {}) => {
    const room = store.rooms.GUIDE;
    E.applyCommand(store, 'host', { room: 'GUIDE', action, commandId: 'qa-command-' + ++serial,
      expectedVersion: room?.version, roundId: room?.round?.id, ...extra }, bank, options);
  };
  act('create', { name: 'Host', participate: false });
  for (const [n, name] of ['Amy', 'Ben', 'Mei', 'Kai'].entries()) E.applyCommand(store, 'seat-' + n, { room: 'GUIDE', action: 'join', name, participate: true }, bank, options);
  act('setMode', { mode }); act('setDeck', { deck }); act('start'); act('confirmTopic');
  const room = store.rooms.GUIDE; room.sharedControls = true;
  if (phase === 'discussion') act('beginDiscussion');
  const identity = shared ? 'host' : room.members.find(player => room.roster.includes(player.id) && (role === 'thinker' ? player.id === room.round.thinkerId : role === 'truthful' ? player.id === room.round.truthfulId : player.id !== room.round.truthfulId && player.id !== room.round.thinkerId)).identityId;
  return E.projectView(store, identity, 'GUIDE', bank, { private: !shared, now: options.now });
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.resolve(root, pathname || 'bluff-king-live-chat.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port, browser = await chromium.launch({ headless: true, ...(process.env.QA_NO_CHANNEL ? {} : { channel: 'chrome' }) });
  const report = { fixture: 'real HTML/CSS/art; engine projections; read-only stub transport; external network blocked; desktop Chrome viewport emulation, not physical phones', targetPolicy: '44px phone cards; 32px unchanged desktop host controls; 1px rounding tolerance', checks: [], views: [], captures: [], errors: [] };
  try {
    const scenarios = [];
    for (const role of ['bluffer', 'truthful', 'thinker']) for (const width of [320, 390]) for (const lang of ['en', 'zh']) scenarios.push({ deck: 'classic', mode: 'thinker', phase: 'prepare', role, width, lang });
    for (const role of ['bluffer', 'truthful']) for (const width of [320, 390]) for (const lang of ['en', 'zh']) scenarios.push({ deck: 'halloween', mode: 'vote', phase: 'discussion', role, width, lang });
    for (const width of [320, 390]) for (const lang of ['en', 'zh']) scenarios.push({ deck: 'classic', mode: 'vote', phase: 'discussion', role: 'bluffer', width, lang });
    for (const width of [320, 390]) for (const lang of ['en', 'zh']) scenarios.push({ deck: 'classic', mode: 'thinker', phase: 'discussion', role: 'thinker', width, lang });
    for (const lang of ['en', 'zh']) scenarios.push({ deck: 'halloween', mode: 'vote', phase: 'discussion', role: 'host', width: 1280, lang, shared: true });
    for (const scenario of scenarios) {
      const { width, lang, shared = false } = scenario, view = fixture(scenario.deck, scenario.mode, scenario.phase, scenario.role, shared);
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 844 : 800 } });
      try {
        await context.addInitScript(({ view, lang }) => { window.__bluffView = view; window.__bluffCommands = []; window.BLUFF_ENGINE = {}; window.BLUFF_QUESTIONS = []; localStorage.setItem('icebreak-lang', lang); }, { view, lang });
        await context.route('**/*', route => {
          const url = route.request().url(), pathname = new URL(url).pathname;
          if (!url.startsWith(base)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
          if (pathname === '/firebase-config.js') return route.fulfill({ contentType: 'text/javascript', body: `var FIREBASE_CONFIG={databaseURL:'https://fixture.invalid'};` });
          if (pathname === '/room.js') return route.fulfill({ contentType: 'text/javascript', body: `var ROOM={enabled:false,init(){}};` });
          if (pathname === '/hub-executor.js') return route.fulfill({ contentType: 'text/javascript', body: `var HUB_EXECUTOR={install(){}};` });
          if (pathname === '/bluff-king-sync.js') return route.fulfill({ contentType: 'text/javascript', body: stub });
          return route.continue();
        });
        const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
        await page.goto(base + '/bluff-king-live-chat.html?room=GUIDE' + (shared ? '' : '&card=1'));
        await page.locator('.bk-topic').waitFor(); await page.evaluate(lang => I18N.setLang(lang), lang);
        const tag = [scenario.deck, scenario.mode, scenario.phase, scenario.role, width, lang].join('-');
        const audit = () => page.evaluate(() => {
          const clipped = [...document.querySelectorAll('h1,h2,p,li,button,summary')].filter(element => {
            const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && element.scrollWidth > element.clientWidth + 1;
          }).map(element => element.textContent.trim().slice(0, 80));
          const badTargets = [...document.querySelectorAll('button,summary')].filter(element => {
            const box = element.getBoundingClientRect(), minimum = innerWidth <= 500 ? 43 : 31; return box.width > 0 && box.height > 0 && (box.height < minimum || box.width < minimum);
          }).map(element => ({ text: element.textContent.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
          return { overflow: document.documentElement.scrollWidth - innerWidth, clipped, badTargets };
        });
        const metrics = await audit();
        await page.screenshot({ path: path.join(output, tag + '.png'), fullPage: true });
        report.captures.push(tag + '.png');
        report.views.push({ ...scenario, ...metrics, screenshot: tag + '.png' });
        assert.ok(metrics.overflow <= 1, tag + ' horizontal overflow'); assert.deepEqual(metrics.clipped, [], tag + ' clipped text');
        assert.deepEqual(metrics.badTargets, [], tag + ' tap targets');
        if (!shared) {
          assert.equal(await page.locator('#bk-card-players').getAttribute('open'), null);
          assert.ok((await page.locator('#bk-room-label').innerText()).includes(view.self.name));
        }
        assert.equal(await page.locator('#bk-followup,[data-bk-action="inspiration"]').count(), 0, tag + ' has no follow-up idea panel');
        if (scenario.role === 'bluffer') {
          const roleCard = page.locator('.bk-role-card.has-story'), guide = roleCard.locator('#bk-story-guide'), story = view.privateCard.storyGuide.story;
          assert.equal(await guide.count(), 1, tag + ' story sits on the role card');
          assert.equal(await roleCard.locator('.bk-secret-answer').count(), 1, 'one made-up answer only');
          assert.equal(await guide.locator('.bk-supporting-facts li').count(), 2, 'two made-up details, like the real card');
          const text = await guide.innerText();
          assert.ok(text.includes(story.answer[lang]), tag + ' answer'); for (const detail of story.details) assert.ok(text.includes(detail[lang]), tag + ' detail');
          assert.ok(await guide.isVisible(), 'shown openly, without expanding');
          await page.evaluate(() => window.__bluffOptions.onView({ ...window.__bluffView, version: window.__bluffView.version + 1 }));
          assert.equal(await guide.count(), 1, 'sync keeps the story');
          await page.locator('[data-bk-action="toggleRole"]').click(); assert.equal(await page.locator('#bk-story-guide').count(), 0, 'hiding role hides the story');
          await page.locator('[data-bk-action="toggleRole"]').click(); assert.equal(await page.locator('#bk-story-guide').count(), 1);
          assert.deepEqual(await page.evaluate(() => window.__bluffCommands), [], 'reading/toggling sends no game command');
          const cardHeight = await roleCard.evaluate(element => element.getBoundingClientRect().height);
          report.views.push({ ...scenario, storyCard: true, cardHeight });
          assert.ok(cardHeight <= 620, tag + ' story card stays compact');
        } else {
          assert.equal(await page.locator('#bk-story-guide').count(), 0);
          if (scenario.role === 'truthful') report.views.push({ ...scenario, truthCard: true, cardHeight: await page.locator('.bk-role-card').evaluate(element => element.getBoundingClientRect().height) });
        }
        report.checks.push(tag);
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []); report.ok = true;
    console.log(JSON.stringify({ ok: true, checks: report.checks.length, captures: report.captures.length, pageErrors: report.errors.length, output }));
  } catch (error) { report.ok = false; report.error = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
