'use strict';
// Real host demo and game modules, with a synthetic clock and no room network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:375,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__time=1700000000000;Date.now=()=>__time;});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='http://talk-host.local')return route.fulfill({status:200,contentType:'application/javascript',body:''});
   assert.ok(!url.pathname.includes('/rooms/')&&!url.pathname.startsWith('/api/'));
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(url.pathname==='/talk-host.js')body=Buffer.from("(()=>{const create=TALK_ENGINE.create,apply=TALK_ENGINE.apply,view=TALK_ENGINE.view;TALK_ENGINE.create=(...a)=>window.__state=create(...a);TALK_ENGINE.apply=(...a)=>window.__state=apply(...a);TALK_ENGINE.view=(...a)=>{window.__state=a[0];return view(...a);};})();\n"+body.toString());
   return route.fulfill({body,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'});
  });
  await page.goto('http://talk-host.local/lets-talk.html?demo=1');await page.evaluate(()=>I18N.setLang('en'));
  await page.selectOption('#talk-game-mode','crazy');assert.equal(await page.inputValue('#talk-crazy-play-style'),'director');
  assert.match(await page.locator('#talk-crazy-play-style option:checked').textContent(),/2\+ players/);
  assert.match(await page.locator('#talk-crazy-style-hint').textContent(),/Directors and actors split evenly/);
  await page.evaluate(()=>I18N.setLang('zh'));assert.match(await page.locator('#talk-crazy-style-hint').textContent(),/奇數時演員多 1 人/);
  await page.evaluate(()=>I18N.setLang('en'));await page.selectOption('#talk-crazy-play-style','free');await page.locator('#talk-crazy-advanced>summary').click();
  await page.selectOption('#talk-crazy-source','mixed');await page.fill('#talk-game-seconds','1');
  await page.fill('#talk-crazy-min-seconds','5');await page.fill('#talk-crazy-max-seconds','5');await page.click('#talk-open');
  assert.equal(await page.locator('#talk-clock').isVisible(),true);assert.equal(await page.locator('#talk-clock-toggle').isVisible(),false);
  await page.click('#talk-start');assert.equal(await page.locator('#talk-clock').isVisible(),false);
  await page.click('#talk-clock-toggle');assert.equal(await page.locator('#talk-clock').isVisible(),true);await page.click('#talk-clock-toggle');
  await page.evaluate(()=>{__time=__state.crazy.nextAssignAt;});await page.waitForFunction(()=>Object.values(__state.crazy.prompts).some(p=>p.status==='pending'));
  const receiver=await page.evaluate(()=>Number(Object.keys(__state.crazy.prompts).find(n=>__state.crazy.prompts[n].status==='pending'))),author=receiver===1?2:1;
  const view=async n=>page.selectOption('#talk-demo-view',String(n));
  const shown=async n=>{await view(n);await page.waitForFunction(num=>__state.crazy.prompts[num]?.renderedVersion===1,n);};
  await shown(receiver);const original=await page.locator('.talk-crazy-prompt>blockquote').textContent();
  const send=async text=>{
   await view(author);assert.equal(await page.locator('.talk-assignment').evaluate(el=>el.open),true);
   await page.selectOption('[data-talk-assignment-field="target"]',String(receiver));
   await page.fill('[data-talk-assignment-field="text"]',text);await page.click('[data-talk-action="crazyAssign"]');
   await page.waitForFunction(()=>!document.querySelector('[data-talk-action="crazyAssign"]')?.disabled);
  };
  await send('Dance like a tiny chicken.');await view(receiver);
  assert.equal(await page.locator('.talk-crazy-prompt>blockquote').textContent(),original);assert.match(await page.locator('.talk-crazy-offer').textContent(),/Dance like a tiny chicken/);
  await page.click('[data-talk-action="crazyKeep"]');assert.equal(await page.locator('.talk-crazy-offer').count(),0);
  await send('Speak like a very serious duck.');await view(receiver);assert.equal(await page.locator('.talk-crazy-prompt>blockquote').textContent(),original);
  await page.click('[data-talk-action="crazyReplace"]');await shown(receiver);assert.equal(await page.locator('.talk-crazy-prompt>blockquote').textContent(),'Speak like a very serious duck.');
  await page.click('[data-talk-action="crazyDone"]');assert.equal(await page.evaluate(n=>__state.scores[n],receiver),1);
  await send('A private unused challenge.');await view(0);await page.click('#talk-vnext-panel [data-talk-action="crazyDrain"]');
  for(let i=0;i<12;i++){const pending=await page.evaluate(()=>Object.keys(__state.crazy.prompts).filter(n=>__state.crazy.prompts[n].status==='pending').map(Number));if(!pending.length)break;await shown(pending[0]);await page.click('[data-talk-action="crazyDone"]');}
  await page.waitForFunction(()=>__state.crazy.roundStage==='sorting');await view(author);
  assert.ok(await page.locator('[data-talk-sort-card]').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>n.checked)));
  await page.click('[data-talk-action="crazySort"]');await view(0);await page.click('#talk-vnext-panel [data-talk-action="crazyReveal"]');
  assert.equal(await page.evaluate(()=>__state.crazy.roundStage),'reveal');assert.match(await page.locator('.talk-reveal-cards').textContent(),/Received by:/);assert.doesNotMatch(await page.locator('.talk-reveal-cards').textContent(),/private unused/);
  await page.click('#talk-new');await page.selectOption('#talk-crazy-play-style','director');await page.fill('#talk-game-seconds','10');await page.selectOption('#talk-crazy-source','players');
  await page.click('#talk-open');assert.equal(await page.evaluate(()=>__state.roster.length),5);assert.equal(await page.evaluate(()=>__state.crazy.maxActive),3);await page.click('#talk-start');
  const directors=await page.evaluate(()=>__state.crazy.directors.slice()),actor=await page.evaluate(()=>__state.roster.find(p=>!__state.crazy.directors.includes(p.playerNum)).playerNum);
  assert.equal(directors.length,2);await view(actor);assert.equal(await page.locator('.talk-assignment').count(),0);assert.equal(await page.locator('#talk-demo-player .talk-receivers').count(),0);
  await view(directors[0]);assert.equal(await page.locator('.talk-assignment').evaluate(el=>el.open),true);assert.equal(await page.locator('#talk-demo-player .talk-receivers').count(),1);
  await page.evaluate(()=>{__time=__state.crazy.nextRotateAt;});await page.waitForFunction(old=>JSON.stringify(__state.crazy.directors)!==JSON.stringify(old),directors);
  await view(0);await page.evaluate(()=>{__time=__state.gameDeadline;});await page.waitForFunction(()=>__state.crazy.roundStage==='decision');
  assert.match(await page.locator('#talk-vnext-panel').textContent(),/Queued/);await page.click('#talk-vnext-panel [data-talk-action="crazyExtend"][data-seconds="180"]');assert.equal(await page.evaluate(()=>__state.crazy.roundStage),'extension');
  for(const language of ['en','zh']){await page.evaluate(lang=>I18N.setLang(lang),language);for(const width of [320,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}}
  assert.deepEqual(errors,[]);process.stdout.write(JSON.stringify({fiveDemoSeats:true,prepareTime:true,optionalRoundTime:true,autoRenderAck:true,keepReplaceBothTexts:true,privateSort:true,hostReveal:true,recapAttribution:true,twoDirectorsThreeActors:true,directorRotation:true,hostExtension:true,languages:['en','zh'],widths:[320,375],errors})+'\n');
 }finally{await browser.close();}
})().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
