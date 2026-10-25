'use strict';
// Actual WORD WOLF host + original play.html cards against isolated Firebase-compatible memory.
// Run: node tests/word-wolf-ui.browser.cjs [path-to-playwright-package]
// WW_QA_PLAYERS=4 or9; WW_QA_LAYOUT=0 skips captures; no real room/network is accessed.
const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),game='wordwolf',KEY='ww',PAGE='word-wolf.html',HOST='WORD_WOLF_HOST',EXTRA='wordWolfControlToken';
const playerCount=Number(process.env.WW_QA_PLAYERS||4);assert.ok([4,9].includes(playerCount),'This end-to-end fixture covers 4 or 9 players');
const output=path.resolve(process.env.WW_QA_OUTPUT||path.join(root,'..','word-wolf-browser-qa-'+playerCount));
const code='WW_BROWSER_QA_'+playerCount,tokens=Array.from({length:playerCount},(_,i)=>'qa-player-'+(i+1));
const names=['Amy','Kevin','Jason','Willy','Riley','Morgan','Alexandra-Marie','Sam','Robin'].slice(0,playerCount);
const CONTENT=require('../word-wolf-content.js'),ART=require('../word-wolf-art.js');
const sourceFiles=['word-wolf.html','word-wolf-content.js','word-wolf-art.js','word-wolf-engine.js','word-wolf-ui.js','word-wolf-host.js','word-wolf.css','card-table.js','card-table-ui.js','card-table.css','play.html',...ART.ids.map(id=>ART.get(id).src)];
const sourceHashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : Object.values(value || {});
const normalize = value => {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  const clean = Array.isArray(value) ? [] : {};
  for (const [key, entry] of Object.entries(value)) { const item = normalize(entry); if (item !== null) clean[key] = item; }
  return Object.keys(clean).length ? clean : null;
};
function makeDatabase() {
  let tree = { '.info': { connected: true, serverTimeOffset: 0 } };
  const get = location => location.split('/').filter(Boolean).reduce((value, key) => value?.[key], tree) ?? null;
  const put = (location, value) => {
    const keys = location.split('/').filter(Boolean); let parent = tree;
    for (const key of keys.slice(0, -1)) parent = parent[key] ||= {};
    const clean = normalize(clone(value));
    if (clean === null) delete parent[keys.at(-1)]; else parent[keys.at(-1)] = clean;
  };
  return { get, put, dump: () => clone(tree), request(request) {
    const current = clone(get(request.path));
    if (request.type === 'get') return { value: current };
    if (request.type === 'cas' && JSON.stringify(current) !== JSON.stringify(request.expected)) return { committed: false, conflict: true, value: current };
    if (request.type === 'cas' && !request.hasValue) return { committed: false, value: current };
    put(request.path, request.type === 'update' ? Object.assign({}, current, request.value) : request.value);
    return { committed: true, value: clone(get(request.path)) };
  } };
}
// Installed before any page script. Transaction updaters run twice and
// compare-and-set retries run on conflicts, exposing impure or racy code.
function installFirebase({ code, tokens, names, epoch }) {
  Date.now = () => epoch;
  const listeners = new Map();
  const snapshot = value => ({ val: () => structuredClone(value ?? null) });
  const request = value => window.__qaFirebase(value);
  const getPath = (tree, location) => location.split('/').filter(Boolean).reduce((value, key) => value?.[key], tree) ?? null;
  window.__qaDeliver = tree => {
    for (const [location, entries] of listeners) {
      const value = getPath(tree, location);
      for (const entry of entries) if (JSON.stringify(value) !== entry.last) { entry.last = JSON.stringify(value); entry.handler(snapshot(value)); }
    }
  };
  function reference(location) {
    return { key: location.split('/').at(-1), path: location,
      child: child => reference(location + '/' + child),
      on(event, handler) {
        if (event !== 'value') throw new Error('Unexpected Firebase event: ' + event);
        const entry = { handler, last: undefined };
        if (!listeners.has(location)) listeners.set(location, new Set());
        listeners.get(location).add(entry);
        request({ type: 'get', path: location }).then(({ value }) => {
          if (!listeners.get(location)?.has(entry)) return;
          entry.last = JSON.stringify(value); handler(snapshot(value));
        });
        return handler;
      },
      off(event, handler) {
        for (const entry of listeners.get(location) || []) if (!handler || entry.handler === handler) listeners.get(location).delete(entry);
      },
      once: async () => snapshot((await request({ type: 'get', path: location })).value),
      set: value => request({ type: 'set', path: location, value }),
      update: value => request({ type: 'update', path: location, value }),
      remove: () => request({ type: 'set', path: location, value: null }),
      onDisconnect: () => ({
        remove: () => request({ type: 'disconnectRemove', path: location }),
        cancel: () => request({ type: 'disconnectCancel', path: location }),
      }),
      async transaction(updater) {
        for (let attempt = 0; attempt < 50; attempt++) {
          const { value: current } = await request({ type: 'get', path: location });
          updater(structuredClone(current));
          const next = updater(structuredClone(current));
          const result = await request({ type: 'cas', path: location, expected: current, value: next ?? null, hasValue: next !== undefined });
          if (!result.conflict) return { committed: result.committed, snapshot: snapshot(result.value) };
        }
        throw new Error('QA transaction retry limit');
      },
    };
  }
  const database = () => ({ ref: reference });
  database.ServerValue = { TIMESTAMP: Date.now() };
  window.firebase = { apps: [], initializeApp() { this.apps.push({}); return {}; }, database };
  if (!localStorage.getItem('room-session-' + code)) localStorage.setItem('room-session-' + code, JSON.stringify({ tokens, playerCount: tokens.length, names }));
  localStorage.setItem('room-last-session', code);
  if (!localStorage.getItem('site-lang')) localStorage.setItem('site-lang', 'en');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const normKey = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const db = makeDatabase(), pages = new Set(), errors = [], blocked = new Set(), epoch = Date.now();
  let offset = 0;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' }); response.end(fs.readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, channel: process.env.WW_QA_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let delivery = Promise.resolve();
  const disconnects = new Map();
  const deliver = () => {
    const tree = db.dump();
    delivery = delivery.then(() => Promise.all([...pages].map(page => page.isClosed() ? null : page.evaluate(tree => window.__qaDeliver?.(tree), tree).catch(() => {}))));
  };
  await context.exposeBinding('__qaFirebase', (source, request) => {
    if (request.type === 'disconnectRemove' || request.type === 'disconnectCancel') {
      if (!disconnects.has(source.page)) disconnects.set(source.page, new Set());
      const paths = disconnects.get(source.page);
      if (request.type === 'disconnectRemove') paths.add(request.path); else paths.delete(request.path);
      return { committed: false };
    }
    const result = db.request(request);
    if (result.committed) setTimeout(deliver, 0);
    return result;
  });
  await context.addInitScript(installFirebase, { code, tokens, names, epoch });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    blocked.add(url);
    return route.fulfill({ status: 200, contentType: url.includes('.css') ? 'text/css' : 'text/javascript', body: '' });
  });
  const open = async url => {
    const item = await context.newPage(); pages.add(item);
    item.on('pageerror', error => errors.push({ url: item.url(), message: error.message }));
    const disconnect = () => {
      // A reload/navigation closes the old Firebase connection too. Model its
      // registered cleanup even if an async pagehide remove was interrupted.
      for (const location of disconnects.get(item) || []) db.put(location, null);
      disconnects.delete(item); deliver();
    };
    item.on('framenavigated', frame => { if (frame === item.mainFrame()) disconnect(); });
    item.on('close', () => { pages.delete(item); disconnect(); });
    await item.goto(base + '/' + url);
    return item;
  };
  const report = { entry: `${PAGE} + ${playerCount} original play.html links`, game, playerCount,
    fixture: 'isolated Firebase-compatible memory database; controlled clock via serverTimeOffset; external network intercepted; desktop Chromium emulates viewport sizes, not physical phones', sourceHashes:sourceHashes(),checks: [], views: [], layoutIssues: [] };
  const check = label => { report.checks.push(label); if (process.env.WW_QA_VERBOSE) console.log('PASS ' + label); };
  const wait = async (predicate, label = 'state') => {
    for (let i = 0; i < 400; i++) { await delivery; if (await predicate()) return; await pause(25); }
    throw new Error('Browser state did not settle: ' + label);
  };
  let host = null, players = [];
  const control = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[1] || null;
  const tableToken = () => Object.entries(db.get(`rooms/${code}/players`) || {}).find(([, value]) => value?.stateJson)?.[0] || null;
  // The canonical table, read straight from the database: no page has to be open.
  const state = async () => { const table = control(); return table?.stateJson ? JSON.parse(table.stateJson) : null; };
  const status = () => host.evaluate(name => window[name].status, HOST);
  const cards = () => Promise.all(players.map(page => page.evaluate(() => window.CARD_TABLE_CARD?.view() || null)));
  const card = n => players[n - 1];
  const advance = async ms => { offset += ms; db.put('.info/serverTimeOffset', offset); deliver(); await delivery; };
  const allCards = async predicate => wait(async () => (await cards()).every(value => value && predicate(value[KEY], value)), 'cards');
  const phase = async target => {
    await wait(async () => (await state())?.phase === target, 'phase ' + target);
    const s = await state();
    await allCards(view => view.sessionId === s.sessionId && view.stage === s.stage && view.turnId === s.turnId);
  };
  const settle = async () => { const s = await state(); await allCards(view => view.sessionId === s.sessionId && view.turnId === s.turnId); };
  const tap = async (page, selector) => {
    const button = page.locator(selector).first();
    await button.waitFor({ state: 'visible' });
    await wait(async () => !(await button.isDisabled()), 'enabled ' + selector);
    await button.click();
  };
  // Table controls live in a folded panel at the bottom of every active card.
  const controls = async page => {
    const panel = page.locator('[data-ct-controls]');
    await panel.waitFor({ state: 'visible' });
    if (!(await panel.evaluate(element => element.open))) await panel.locator('summary').click();
    return panel;
  };
  const tool = async (page, selector) => { await controls(page); await tap(page, '[data-ct-controls] ' + selector); };
  const twice = async (page, selector) => {
    await tool(page, selector);
    await wait(async () => (await page.locator(`[data-ct-controls] ${selector}.is-armed`).count()) === 1, 'armed ' + selector);
    await tool(page, selector);
  };
  const text = page => page.evaluate(() => document.body.innerText);
  const capture = async (page, label, { width, height, lang, target = null }) => {
    if (process.env.WW_QA_LAYOUT === '0') return;
    await page.setViewportSize({ width, height });
    await page.evaluate(value => I18N.setLang(value), lang);
    await page.evaluate(() => window.scrollTo(0, 0));
    for (const image of await page.locator('img.ww-object-art').all()) {
      await image.evaluate(element => element.decode());
      assert.equal(await image.evaluate(element => element.complete && element.naturalWidth === 640 && element.naturalHeight === 640), true, 'the real card bitmap has loaded at its full authored size');
    }
    await pause(100);
    const metrics = await page.evaluate(target => {
      const shown = e => e.getClientRects().length && (!e.checkVisibility || e.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }));
      const clipped = [...document.querySelectorAll('.ct-card *, .ww-stage *, #ww-setup *, .ct-controls *')].filter(e => {
        if (!shown(e) || e.closest('[hidden],svg')) return false;
        const css = getComputedStyle(e);
        return e.scrollWidth > e.clientWidth + 1 && css.overflowX === 'visible' && !['inline','contents'].includes(css.display) && e.clientWidth > 0 && e.children.length === 0;
      }).map(e => e.className || e.tagName);
      const badTargets = [...document.querySelectorAll('button,summary,select')].filter(e => {
        if (!shown(e) || e.closest('dialog:not([open])')) return false;
        const r = e.getBoundingClientRect(), minimum = innerWidth <= 500 ? 43.99 : 31.99;
        return r.height < minimum || r.width < minimum;
      }).map(e => ({ text: e.textContent.trim().slice(0, 32), height: e.getBoundingClientRect().height, width: e.getBoundingClientRect().width }));
      let action = null;
      if (target) {
        const e = [...document.querySelectorAll(target)].find(shown);
        if (e) {
          const initial = e.getBoundingClientRect();
          e.scrollIntoView({ block:'center', behavior:'instant' });
          const r = e.getBoundingClientRect(), hit = document.elementFromPoint(Math.floor(r.x+r.width/2),Math.floor(r.y+r.height/2));
          action = { height:r.height,width:r.width,clickable:e.contains(hit),initiallyVisible:initial.top>=0&&initial.bottom<=innerHeight };
          window.scrollTo(0,0);
        }
      }
      return { overflow:document.documentElement.scrollWidth-innerWidth,clipped,badTargets,action };
    },target);
    const screenshot = `${label}-${width}x${height}-${lang}.png`;
    await page.screenshot({ path:path.join(output,screenshot),fullPage:true,animations:'disabled',timeout:90000 });
    report.views.push({ label,width,height,lang,screenshot,...metrics });
    if (['card-different-private','card-shared-private','card-picked'].includes(label)) assert.equal(metrics.action?.initiallyVisible,true,label+': the main action fits on the phone without scrolling');
    if (metrics.overflow>1 || metrics.clipped.length || metrics.badTargets.length || (target&&(!metrics.action||!metrics.action.clickable||metrics.action.height<43.99||metrics.action.width<43.99))) report.layoutIssues.push({ label,width,height,lang,...metrics });
  };
  const PHONES=[[390,844],[320,568]],HOSTS=[[1280,800],[390,844],[320,568]];
  const views = async (page,label,target=null,sizes=PHONES) => { for(const [width,height] of sizes)for(const lang of ['en','zh'])await capture(page,label,{width,height,lang,target}); };
  const detailViews = async (page,label,selector) => {
    if(process.env.WW_QA_LAYOUT==='0')return;
    const panel=page.locator(selector).first();
    assert.equal(await panel.evaluate(element=>element.open),false,'optional details start closed');
    await panel.locator('summary').click();
    await views(page,label,selector+' summary');
    assert.equal(await panel.evaluate(element=>element.open),true,'optional details stay open during language repaints');
    if(await panel.evaluate(element=>element.open))await panel.locator('summary').click();
  };
  const ownerItems = async () => {
    const s=await state(),pair=CONTENT.get(s.round.pairId),all=await cards();
    for(let i=0;i<all.length;i++){
      const v=all[i].ww,n=i+1,side=n===s.round.odd?(s.round.majoritySide==='a'?'b':'a'):s.round.majoritySide;
      assert.deepEqual(v.me.item,pair[side]);
      assert.equal(v.result,null);assert.equal(v.deadline,null);
      for(const field of ['odd','majoritySide','pairId','votes'])assert.equal(v[field],undefined,'no secret table field '+field);
      assert.equal(await card(n).locator('[data-ww-item]').count(),1);
      assert.equal(await card(n).locator('[data-ww-item]').getAttribute('data-ww-item'),pair[side].id);
      assert.equal(await card(n).locator('[data-ww-item] h2').innerText(),pair[side].en);
    }
    const counts=Object.values(all.reduce((acc,v)=>(acc[v.ww.me.item.id]=(acc[v.ww.me.item.id]||0)+1,acc),{})).sort((a,b)=>a-b);
    assert.deepEqual(counts,[1,playerCount-1]);
    return s;
  };
  const onePresence = actor => Object.values(control()?.presence||{}).filter(entry=>entry.actor===actor).length;
  try {
    host=await open(PAGE);
    await wait(async()=>await host.locator('#ww-start').isEnabled(),'host ready');
    assert.equal(await host.locator('#ww-category').inputValue(),'objects');
    players=await Promise.all(tokens.map((token,i)=>open(`play.html?s=${code}&p=${token}&n=${encodeURIComponent(names[i])}`)));
    assert.equal(await host.locator('[data-ww-item]').count(),0);
    await views(host,'host-setup','#ww-start',HOSTS);
    await tap(host,'#ww-start');await phase('describe');
    let s=await ownerItems();const originalSession=s.sessionId,originalTable=tableToken(),firstPair=s.round.pairId,firstRound=s.round.id;
    assert.ok(s.round.pairId&&CONTENT.pool('objects').some(pair=>pair.id===s.round.pairId));
    assert.equal(await host.locator('[data-ww-item]').count(),0,'shared screen shows no secret objects');
    assert.equal(await host.evaluate(()=>WORD_WOLF_HOST.view().me.item),null);
    for(let n=1;n<=playerCount;n++){
      const pointer=db.get(`rooms/${code}/players/${tokens[n-1]}`);
      assert.equal(pointer.game,'wordwolf');assert.deepEqual(pointer.ww,{version:1,table:originalTable});
      assert.equal(pointer.stateJson,undefined);assert.equal(pointer.item,undefined);
      const image=card(n).locator('img.ww-object-art');
      assert.equal(await image.count(),1,'each private item has one independent local bitmap');
      await image.evaluate(element=>element.decode());
      assert.equal(await image.evaluate(element=>element.naturalWidth===640&&element.naturalHeight===640),true,'a missing or broken image cannot pass');
      assert.equal(await image.getAttribute('src'),ART.get((await cards())[n-1].ww.me.item.id).src);
    }
    await views(host,'host-describe','[data-host-action="pick"]',HOSTS);
    await views(card(s.round.odd),'card-different-private','[data-ct-main] [data-ct-action="pick"]');
    const majority=s.round.seats.find(n=>n!==s.round.odd);
    await views(card(majority),'card-shared-private','[data-ct-main] [data-ct-action="vote"]');
    await detailViews(card(majority),'card-clue-tips-open','[data-ct-tail] .ww-more');
    check('actual host and original player links deal one authoritative 3–9-seat round: one different item, own-card text/art only, no role indication or shared-screen item');

    await host.close();host=null;
    await wait(()=>onePresence(0)===0,'host presence cleanup');
    const picked=[];
    for(let i=0;i<playerCount;i++){
      const before=(await state()).stage;
      await tap(card(i%playerCount+1),'[data-ct-main] [data-ct-action="pick"]');
      await wait(async()=>(await state()).stage!==before,'picked');await settle();
      const after=await state();picked.push(after.round.picked);
      assert.equal(after.round.id,firstRound);assert.equal(after.round.pairId,firstPair);
      for(const value of await cards())assert.equal(value.ww.picked,after.round.picked);
    }
    assert.equal(new Set(picked).size,playerCount);
    const last=picked.at(-1),previousStage=(await state()).stage;
    await tap(card(1),'[data-ct-main] [data-ct-action="pick"]');await wait(async()=>(await state()).stage!==previousStage);await settle();
    assert.notEqual((await state()).round.picked,last);
    await views(card(1),'card-picked','[data-ct-main] [data-ct-action="pick"]');
    check('host closed: every original card can pick, the whole random circle contains everyone once, and a new circle avoids an immediate repeat without redealing');

    await tool(card(1),'[data-ct-action="pause"]');await phase('paused');
    const paused=clone(await state());await advance(600000);await pause(350);
    assert.equal((await state()).phase,'paused');assert.deepEqual((await state()).round,paused.round);
    await ownerItems();await views(card(2),'card-paused','[data-ct-main] [data-ct-action="resume"]');
    await tap(card(2),'[data-ct-main] [data-ct-action="resume"]');await phase('describe');
    const untimed=clone(await state());await advance(600000);await pause(350);
    assert.deepEqual((await state()).round,untimed.round);assert.equal((await state()).phase,'describe');assert.equal((await state()).deadline,null);
    await card(2).reload();await allCards(v=>v.sessionId===originalSession&&v.phase==='describe');
    await wait(()=>onePresence(2)===1,'reloaded actor has one presence');await ownerItems();
    assert.equal(tableToken(),originalTable);assert.equal((await state()).round.id,firstRound);
    check('pause/resume, ten untimed minutes and an original-link reload preserve the same private deal; old reconnect presence is removed and no countdown or host is required');

    await tap(card(3),'[data-ct-main] [data-ct-action="vote"]');await phase('vote');
    for(let n=1;n<=playerCount;n++){
      assert.equal(await card(n).locator('[data-ct-main] [data-ct-action="ballot"]').count(),playerCount-1);
      assert.equal(await card(n).locator(`[data-ct-action="ballot"][data-ct-arg-target="${n}"]`).count(),0);
    }
    await views(card(1),'card-vote-empty','[data-ct-main] [data-ct-action="ballot"]');
    await tap(card(1),'[data-ct-action="ballot"][data-ct-arg-target="2"]');await wait(async()=>(await state()).round.votes[1]===2);await settle();
    let all=await cards();assert.equal(all[0].ww.me.vote,2);assert.equal(all[0].ww.votesCast,1);
    for(const value of all.slice(1)){assert.equal(value.ww.me.vote,null);assert.equal(value.ww.votesCast,1);assert.equal(value.ww.result,null);}
    for(let n=2;n<=playerCount;n++)assert.equal(await card(n).locator('[data-ct-action="ballot"][aria-pressed="true"]').count(),0);
    await tap(card(1),'[data-ct-action="ballot"][data-ct-arg-target="3"]');await wait(async()=>(await state()).round.votes[1]===3);await settle();
    assert.equal((await cards())[0].ww.votesCast,1);await views(card(1),'card-vote-change','[data-ct-action="ballot"][aria-pressed="true"]');
    check('private voting offers every other seat, forbids a self button, hides another player’s ballot and lets a player change their one vote before reveal');

    s=await state();const odd=s.round.odd;
    const cast=async n=>{const target=n===odd?1:odd;await tap(card(n),`[data-ct-action="ballot"][data-ct-arg-target="${target}"]`);};
    for(let n=2;n<playerCount-1;n++){await cast(n);await wait(async()=>(await state()).round.votes[n]!=null);await settle();}
    await Promise.all([cast(playerCount-1),cast(playerCount)]);await phase('result');
    s=await state();assert.equal(s.result.winner,'majority');assert.equal(s.result.odd,odd);assert.equal(Object.keys(s.result.votes).length,playerCount);assert.equal(s.history.length,1);
    for(const value of await cards()){assert.deepEqual(value.ww.result,s.result);assert.deepEqual(value.ww.standings,[]);}
    assert.equal(await card(1).locator('.ww-pair [data-ww-item]').count(),2);
    await views(card(1),'card-result','[data-ct-main] [data-ct-action="next"]');
    await detailViews(card(1),'card-results-open','[data-ct-main] .ww-more');
    check('concurrent last ballots merge through CAS, reveal one complete result and one history entry, expose both cards only after voting, and add no cumulative score');

    await card(1).evaluate(({code,extra})=>{const key='room-session-'+code,s=JSON.parse(localStorage.getItem(key));delete s[extra];localStorage.setItem(key,JSON.stringify(s));},{code,extra:EXTRA});
    host=await open(PAGE);await wait(async()=>(await status())==='ready','host adopts active pointers');
    assert.equal(await host.evaluate(()=>WORD_WOLF_HOST.state.sessionId),originalSession);assert.equal(await host.evaluate(()=>WORD_WOLF_HOST.state.round.id),firstRound);
    assert.equal(await host.evaluate(({code,extra})=>JSON.parse(localStorage.getItem('room-session-'+code))[extra],{code,extra:EXTRA}),originalTable);
    await views(host,'host-result','[data-host-action="next"]',HOSTS);
    await host.close();host=null;
    await advance(600000);await pause(300);assert.equal((await state()).phase,'result');
    await tap(card(4),'[data-ct-main] [data-ct-action="next"]');await phase('describe');
    assert.equal((await state()).roundNo,2);assert.notEqual((await state()).round.pairId,firstPair);assert.equal((await state()).usedPairs.length,2);await ownerItems();
    check('a reopened host adopts the same table even without its saved token; an untimed result waits for a player’s Next, which deals a fresh pair on the same links');

    await tap(card(1),'[data-ct-main] [data-ct-action="vote"]');await phase('vote');
    await tap(card(1),'[data-ct-action="ballot"][data-ct-arg-target="2"]');await wait(async()=>(await state()).round.votes[1]===2);await settle();
    await tap(card(2),'[data-ct-action="ballot"][data-ct-arg-target="1"]');await wait(async()=>(await state()).round.votes[2]===1);await settle();
    host=await open(PAGE);await wait(async()=>(await status())==='ready');
    await tap(host,'[data-host-action="close"]');await phase('result');
    assert.equal((await state()).result.winner,'tie');assert.equal((await state()).result.top.length,2);assert.equal((await state()).history.length,2);
    await views(card(1),'card-tied-result','[data-ct-main] [data-ct-action="next"]');
    await host.close();host=null;
    check('the host can reveal after at least one vote; a tied highest count has no winner and does not invent scores');

    await tap(card(1),'[data-ct-main] [data-ct-action="next"]');await phase('describe');
    await tool(card(1),'[data-ct-action="pause"]');await phase('paused');
    const out=playerCount;
    await twice(card(1),`[data-ct-action="exclude"][data-ct-arg-player-num="${out}"]`);await phase('result');
    assert.equal((await state()).result.cancelled,true);assert.equal((await state()).result.winner,'cancelled');
    assert.equal((await state()).roster.find(p=>p.playerNum===out).active,false);
    const cancelled=clone((await state()).result);
    for(const value of await cards())assert.deepEqual(value.ww.result,cancelled,'sit-out result is consistent for every seat');
    await views(card(1),'card-cancelled-round','[data-ct-main] [data-ct-action="next"]');
    await tap(card(out),'[data-ct-main] [data-ct-action="exclude"][data-ct-arg-active="true"]');await wait(async()=>(await state()).roster.find(p=>p.playerNum===out).active);await settle();
    await tap(card(2),'[data-ct-main] [data-ct-action="next"]');await phase('describe');await ownerItems();
    assert.equal((await state()).round.seats.length,playerCount);assert.equal(new Set((await state()).usedPairs).size,4);
    check('sitting anyone out during a paused round cancels it consistently for all seats, and the returning player rejoins the next fresh private deal');

    host=await open(PAGE);await wait(async()=>(await status())==='ready');
    const renamed=names.map((name,i)=>i===1?'Kevin renamed':name);
    await host.evaluate(({code,names})=>{const key='room-session-'+code,s=JSON.parse(localStorage.getItem(key));s.names=names;localStorage.setItem(key,JSON.stringify(s));ROOM.names=names;},{code,names:renamed});
    await host.reload();await wait(async()=>(await status())==='ready');
    await wait(async()=>(await state()).roster[1].name==='Kevin renamed','Hub rename carried through');await settle();
    assert.equal((await state()).sessionId,originalSession);assert.equal(tableToken(),originalTable);await ownerItems();
    check('Hub renames follow seat identity on host adoption without replacing the active table or changing any private object');

    const switchedIndex=2,switchPath=`rooms/${code}/players/${tokens[switchedIndex]}`,beforeSwitch=clone(await state());
    db.put(switchPath,{game:'qa-other-game',playerNum:switchedIndex+1,name:renamed[switchedIndex]});deliver();await delivery;
    await wait(async()=>(await status())==='switched');await wait(async()=>await card(switchedIndex+1).locator('.ww-card').count()===0,'old card unmounted');
    await advance(60000);await pause(350);assert.equal(db.get(switchPath).game,'qa-other-game');assert.deepEqual(await state(),beforeSwitch);
    await views(host,'host-switched','#ww-continue',HOSTS);
    await tap(host,'#ww-continue');await wait(async()=>(await status())==='ready');await allCards(v=>v.sessionId===originalSession&&v.phase==='describe');
    assert.deepEqual((await state()).round,beforeSwitch.round);await wait(()=>onePresence(switchedIndex+1)===1,'one returning presence');await ownerItems();
    check('switching one original link unmounts its old card and leaves the new game untouched; explicit Bring back restores the exact running deal and one presence');

    await twice(card(1),'[data-ct-action="stop"]');await phase('finished');
    for(const value of await cards()){assert.equal(value.ww.me.item,null);assert.equal(value.ww.result,null);}
    for(const page of players)assert.equal(await page.locator('[data-ww-item]').count(),0);
    await views(card(1),'card-finished','[data-ct-main] [data-ct-action="restart"]');
    check('End removes the private object/result from every active card and leaves the existing new-game action');

    const demo=await open(PAGE+'?demo=1');await tap(demo,'#ww-start');await demo.locator('.ww-stage').waitFor();await pause(650);
    assert.equal(await demo.evaluate(()=>WORD_WOLF_HOST.state.phase),'describe');
    await demo.locator('#ww-demo-view').selectOption('1');await demo.locator('[data-ww-item]').waitFor();
    await tap(demo,'[data-ct-main] [data-ct-action="pick"]');await demo.locator('[data-ww-picked]').waitFor();
    await demo.close();
    check('the actual one-device demo starts, shows its own private card and can pick without creating a live room or throwing a timer error');

    assert.deepEqual(report.layoutIssues,[],'layout issues');assert.deepEqual(errors,[],'page errors');
    for(const url of blocked)assert.match(url,/gstatic\.com\/firebasejs/,'only Firebase SDK requests are intercepted');
    for(const page of [...pages])await page.close();await delivery;
    report.presenceAfterClose=Object.keys(control()?.presence||{}).length;assert.equal(report.presenceAfterClose,0);
    report.errors=errors;report.blocked=[...blocked];report.ok=true;
    report.sourceHashesAtEnd=sourceHashes();
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(`Word Wolf browser (${playerCount} players): ${report.checks.length} checks, ${report.views.length} captures, 0 page errors → ${output}`);
  } catch(error) {
    report.ok=false;report.failure=String(error.stack||error);report.errors=errors;report.state=await state().catch(()=>null);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    try{for(const [i,page]of players.entries())if(!page.isClosed())await page.screenshot({path:path.join(output,`failure-card-${i+1}.png`),fullPage:true});if(host&&!host.isClosed())await host.screenshot({path:path.join(output,'failure-host.png'),fullPage:true});}catch{}
    console.error(error.stack);console.error('page errors:',JSON.stringify(errors));process.exitCode=1;
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})();
