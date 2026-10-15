'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const { fixture } = require('./helpers/talk-vnext-fixture.cjs');
const clone = value => structuredClone(value);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Actual play.html pages use isolated browser storage and authenticated synthetic
// seats. Every SDK/API operation stays inside this disposable in-memory room.
async function main() {
  const f = fixture({ count: 3, crazyPlayStyle: undefined, gameSeconds: 900, now: Date.now() });
  await f.register(); await f.act(0, 'start');
  const root = path.resolve(__dirname, '..');
  const pages = [], errors = [], dialogs = [], requests = [], mailboxWrites = [];
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/qa/node') {
        const key = url.searchParams.get('path');
        if (req.method === 'GET') {
          const result = await f.fetchImpl('http://localhost/' + key + '.json');
          res.setHeader('etag', result.headers.get('etag'));
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(await result.json())); return;
        }
        let body = ''; for await (const chunk of req) body += chunk;
        const outgoing = JSON.parse(body);
        if (outgoing?.talkAction) mailboxWrites.push({ key, command: clone(outgoing.talkAction) });
        const result = await f.fetchImpl('http://localhost/' + key + '.json', {
          method: 'PUT', headers: { 'If-Match': req.headers['if-match'] }, body
        });
        res.statusCode = result.status; res.end('null'); return;
      }
      const file = path.resolve(root, '.' + url.pathname);
      if (!file.startsWith(root + path.sep)) throw Error('outside fixture root');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
      res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch {
      res.statusCode = 404; res.end('missing');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const fakeSdk = `window.firebase = {
    initializeApp: () => ({}), database: () => ({ref: path => {
      const ref = {key: path.split('/').pop()};
      const read = async () => {
        if (path.startsWith('.info')) return path === '.info/connected' ? true : 0;
        const value = await (await fetch('/qa/node?path=' + encodeURIComponent(path))).json();
        ref._value = value; return value;
      };
      ref.once = async () => { const value = await read(); return {val: () => value}; };
      ref.on = (event, fn) => {
        if (path.startsWith('.info')) { fn({val: () => path === '.info/connected' ? true : 0}); return; }
        let old;
        const poll = async () => { try {
          const value = await read(), serialized = JSON.stringify(value);
          if (serialized !== old) { old = serialized; fn({val: () => value}); }
        } catch {} };
        poll(); ref._timer = setInterval(poll, 150);
      };
      ref.off = () => clearInterval(ref._timer);
      ref.transaction = async change => {
        for (let attempt = 0; attempt < 8; attempt++) {
          const response = await fetch('/qa/node?path=' + encodeURIComponent(path));
          const before = await response.json(), next = change(before);
          if (next === undefined) return {committed: false};
          const put = await fetch('/qa/node?path=' + encodeURIComponent(path), {
            method: 'PUT', headers: {'if-match': response.headers.get('etag')}, body: JSON.stringify(next)
          });
          if (put.status === 412) continue;
          if (!put.ok) throw Error('synthetic storage failure');
          ref._value = next; return {committed: true, snapshot: {val: () => next}};
        }
        throw Error('synthetic transaction retries exhausted');
      };
      ref.set = value => ref.transaction(() => value);
      ref.update = value => ref.transaction(before => ({...before, ...value}));
      return ref;
    }})
  };`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (let num = 1; num <= 3; num++) {
      const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
      await context.addInitScript(clock => { window.__qaClock = clock; Date.now = () => window.__qaClock; }, f.now());
      await context.route('https://www.gstatic.com/firebasejs/**/firebase-app-compat.js', route => route.fulfill({ contentType: 'text/javascript', body: fakeSdk }));
      await context.route('https://www.gstatic.com/firebasejs/**/firebase-database-compat.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
      await context.route('https://icebreaker-youtube-search.vercel.app/api/hub-executor', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: { ready: true, version: 1 }, headers: { 'X-Icebreak-Crazy-Talk': '2' } }); return;
        }
        const entry = { body: route.request().postDataJSON() }; requests.push(entry);
        try {
          const result = await f.service[entry.body.operation](entry.body);
          delete result._wake; entry.done = true;
          await route.fulfill({ json: result });
        } catch (error) {
          entry.error = error.code || 'executor_unavailable';
          await route.fulfill({ status: error.status || 503, json: { error: entry.error } });
        }
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push({ num, message: error.message }));
      page.on('dialog', async dialog => { dialogs.push({ num, type: dialog.type() }); await dialog.dismiss(); });
      await page.goto(base + '/play.html?s=' + f.code + '&p=' + f.seats[num - 1].token + '&n=Synthetic' + num, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.talk-player'); pages.push(page);
    }
    const page = num => pages[num - 1];
    const wait = async (description, predicate) => {
      for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await delay(100); }
      throw Error('Timed out: ' + description);
    };
    const advanceTo = async now => {
      assert.ok(now >= f.now()); f.advance(now - f.now());
      await Promise.all(pages.map(p => p.evaluate(clock => { window.__qaClock = clock; }, f.now())));
      await f.service.execute({ capsule: f.capsule(), token: f.controlToken, clock: true });
    };
    const write = async (target, text) => {
      const p = page(1);
      if (!await p.locator('.talk-assignment').evaluate(node => node.open)) await p.locator('.talk-assignment > summary').click();
      await p.selectOption('[data-talk-assignment-field="target"]', String(target));
      await p.fill('[data-talk-assignment-field="text"]', text);
      await p.click('[data-talk-action="crazyAssign"]');
      await wait('accepted director handwriting', () => p.inputValue('[data-talk-assignment-field="text"]').then(value => value === ''));
    };
    const assertLayouts = async () => {
      let checked = 0;
      for (const language of ['en', 'zh']) {
        for (const [index, p] of pages.entries()) {
          await p.evaluate(lang => I18N.setLang(lang), language);
          await wait('language update', () => p.evaluate(lang => document.documentElement.lang === (lang === 'zh' ? 'zh-Hant' : 'en'), language));
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, language + ' seat ' + (index + 1));
          assert.equal(await p.locator('.talk-assignment').count(), index === 0 ? 1 : 0);
          assert.equal(await p.locator('[role="dialog"], [role="alertdialog"]').count(), 0);
          checked++;
        }
      }
      return checked;
    };
    assert.equal(f.state().crazy.playStyle, 'director');
    assert.deepEqual(f.state().crazy.directors, [1]);
    assert.deepEqual([1, 2, 3].map(num => f.card(num).talk.crazy.role), ['director', 'player', 'player']);
    assert.ok([1, 2, 3].every(num => f.card(num).talk.crazy.effectivePlayStyle === 'director'));
    assert.equal(await page(1).locator('.talk-assignment').evaluate(node => node.open), true);
    for (const num of [2, 3]) assert.equal(await page(num).locator('.talk-assignment').count(), 0);

    await write(2, 'Cluck like a chicken.');
    await write(3, 'Sing to your cup.');
    await wait('both actual actor pages automatically confirm rendering', () => [2, 3].every(num => f.state().crazy.prompts[num]?.renderAckAt > 0));
    for (const num of [2, 3]) await wait('render receipt reaches actor DOM ' + num, () => page(num).locator('[data-talk-check-in]').count().then(count => count === 1));
    await delay(350);
    const first = Object.fromEntries([2, 3].map(num => [num, clone(f.state().crazy.prompts[num])]));
    assert.ok([2, 3].every(num => first[num].renderedVersion === 1));
    assert.ok([2, 3].every(num => first[num].expiresAt - first[num].at === 150000));
    assert.ok(Object.values(f.state().scores).every(score => score === 0));

    const draft = 'Keep this draft 中文草稿';
    await page(1).fill('[data-talk-assignment-field="text"]', draft);
    await page(1).locator('[data-talk-assignment-field="text"]').evaluate(node => { node.focus(); node.setSelectionRange(5, 12); });
    await page(2).locator('[data-talk-action="crazySkip"]').focus();
    assert.equal(await page(2).evaluate(() => { window.__qaFocusedTaskButton = document.activeElement; return document.activeElement?.dataset.talkAction; }), 'crazySkip', 'actor focus is set before time advances');
    await advanceTo(Math.max(first[2].at, first[3].at) + 140000);
    for (const num of [2, 3]) await wait('quiet check-in on actor ' + num, () => page(num).locator('[data-talk-check-in]').isVisible());
    assert.equal(await page(2).evaluate(() => document.activeElement?.dataset.talkAction), 'crazySkip', 'the quiet check-in never steals actor focus');
    assert.equal(await page(2).evaluate(() => window.__qaFocusedTaskButton.isConnected && document.activeElement === window.__qaFocusedTaskButton), true, 'authoritative check-in keeps the same connected task action');
    assert.deepEqual(await page(1).locator('[data-talk-assignment-field="text"]').evaluate(node => ({ value: node.value, start: node.selectionStart, end: node.selectionEnd, focused: document.activeElement === node })),
      { value: draft, start: 5, end: 12, focused: true }, 'a presence update preserves the director draft and caret');
    assert.equal(mailboxWrites.some(entry => entry.command.type === 'crazyHere'), false, 'presence requires the player to click');
    const layouts = await assertLayouts();
    assert.match(await page(2).locator('[data-talk-check-in]').innerText(), /你還在嗎/);
    assert.deepEqual(dialogs, []);

    await page(2).click('[data-talk-action="crazyHere"]');
    await wait('authenticated actor check-in receipt', () => mailboxWrites.some(entry => entry.command.type === 'crazyHere')
      && f.state().crazy.prompts[2].interactedAt === f.now());
    await wait('accepted Here is no longer visible on the current task', () => page(2).locator('[data-talk-action="crazyHere"]').isVisible().then(visible => !visible));
    const here = { capsule: f.capsule(), token: f.seats[1].token, command: clone(mailboxWrites.find(entry => entry.command.type === 'crazyHere').command) };
    assert.equal(here.command.promptId, first[2].id); assert.equal(here.command.renderVersion, 1);
    assert.equal(f.state().crazy.prompts[2].expiresAt, first[2].expiresAt);
    assert.equal(f.state().crazy.prompts[2].status, 'pending'); assert.equal(f.state().scores[2], 0);
    const interactedAt = f.state().crazy.prompts[2].interactedAt;
    await f.service.execute(here); await f.service.execute(here);
    assert.equal(f.state().crazy.prompts[2].interactedAt, interactedAt);
    assert.equal(f.state().crazy.prompts[2].expiresAt, first[2].expiresAt); assert.equal(f.state().scores[2], 0);
    const checkedIn = (await f.store.readRoom(f.code)).filter(record => record.category === 'event' && record.eventType === 'checked_in' && record.promptId === first[2].id);
    assert.equal(checkedIn.length, 1, 'duplicate receipt retries record one deliberate check-in');

    await advanceTo(Math.max(first[2].expiresAt, first[3].expiresAt));
    await wait('both original missions expire', () => [2, 3].every(num => f.state().crazy.prompts[num].status === 'expired'));
    assert.equal(f.state().crazy.receivers[2].paused, false); assert.equal(f.state().crazy.receivers[3].paused, true);
    assert.ok(Object.values(f.state().scores).every(score => score === 0));
    for (const num of [2, 3]) {
      await wait('expired actor UI clears its old prompt', () => page(num).locator('.talk-crazy-prompt').count().then(count => count === 0));
      assert.equal(await page(num).locator('[data-talk-action="crazyHere"]').count(), 0);
    }
    await write(3, 'A waiting task for the paused actor.');
    assert.equal(f.state().crazy.queue.length, 1); assert.equal(f.state().crazy.prompts[3].status, 'expired');
    await write('random', 'Tell your spoon a tiny secret.');
    await wait('the checked-in actor receives and renders the next challenge', () => f.state().crazy.prompts[2]?.text === 'Tell your spoon a tiny secret.' && f.state().crazy.prompts[2].renderAckAt > 0);
    const next = clone(f.state().crazy.prompts[2]);
    assert.notEqual(next.id, first[2].id); assert.equal(f.state().crazy.receivers[2].paused, false);
    assert.equal(f.state().crazy.receivers[3].paused, true); assert.equal(f.state().crazy.queue.length, 1);
    assert.equal(f.state().crazy.queue[0].target, 3); assert.ok(Object.values(f.state().scores).every(score => score === 0));

    const stale = f.command(2, 'crazyHere', { promptId: first[2].id, renderVersion: 1 });
    await f.run(stale);
    assert.equal(f.state().replies[2].error, 'stale_prompt');
    assert.equal(f.state().crazy.prompts[2].id, next.id); assert.equal(f.state().crazy.prompts[2].expiresAt, next.expiresAt);
    assert.equal(f.state().crazy.prompts[2].interactedAt, undefined); assert.equal(f.state().scores[2], 0);
    const staleUiId = 'obsolete-browser-check-in';
    f.set(f.path(2), { ...f.card(2), talkAction: { ...here.command, id: staleUiId } });
    await delay(700);
    assert.equal(mailboxWrites.some(entry => entry.command.id === staleUiId), false, 'stale mailbox recovery cannot resend Here for an old prompt');
    assert.equal(requests.some(entry => entry.body.command?.id === staleUiId), false, 'stale recovery cannot replay an old Here through a direct authenticated RPC');
    assert.equal(await page(2).locator('[data-talk-action="crazyHere"]').isVisible(), false);
    assert.equal(await page(2).locator('[data-talk-action="crazyDone"]').isEnabled(), true);
    assert.match(await page(2).locator('.talk-crazy-prompt').innerText(), /Tell your spoon a tiny secret/);
    assert.doesNotMatch(await page(2).locator('.talk-crazy-prompt').innerText(), /Cluck like a chicken/);
    const finalLayouts = await assertLayouts();
    assert.deepEqual(errors, []); assert.deepEqual(dialogs, []);
    console.log(JSON.stringify({ foregroundInjectedClock: true, threeIndependentPlayerPages: true, defaultOneDirectorTwoActors: true,
      directorComposerOpen: true, actorsCannotCompose: true, automaticRenderAck: true,
      quietCheckInAt140Seconds: true, focusDraftAndCaretPreserved: true, hereDoesNotExtendTtlOrScore: true,
      duplicateCheckInIdempotent: true, expiryAt150Seconds: true, responsiveActorKeepsReceiving: true,
      silentActorPaused: true, stalePromptAndUiFenced: true, languages: ['en', 'zh'], width: 375,
      layoutChecks: layouts + finalLayouts, pageErrors: errors, dialogs }));
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
