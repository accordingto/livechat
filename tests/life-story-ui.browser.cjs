'use strict';
// Real Hub manager + four original play.html links, isolated Firebase ETags and
// the real trusted service. Every browser receives only subscribed nodes.
const { chromium, expect } = require(process.argv[2] || '@playwright/test');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const E = require('../dixit-engine.js');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const locale = process.env.LIFE_STORY_QA_LOCALE === 'zh-TW' ? 'zh-TW' : 'en';
const root = path.resolve(__dirname, '..'), output = path.resolve(root, '../test-results/hub-life-story-'+locale);
const code = 'LIFEQA24', control = 'a'.repeat(32), tokens = [1,2,3,4].map(n => String(n).repeat(32)), names = ['A','B','C','D'];
const clone = value => value == null ? null : structuredClone(value);
const nodes = new Map([['.info/connected',true],['.info/serverTimeOffset',0]]), versions = new Map();
const subscriptions = new Map(), pages = new Set(), errors = [], readAudit = [];
let delivery = Promise.resolve(), browser, server;
function put(key,value) {
  nodes.set(key,clone(value)); versions.set(key,(versions.get(key)||0)+1);
  for (const [page, paths] of subscriptions) if (paths.has(key) && !page.isClosed()) {
    const copied = clone(value); delivery = delivery.then(() => page.evaluate(({key,value}) => window.__lsDeliver?.(key,value),{key,value:copied}).catch(()=>{}));
  }
}
tokens.forEach((token,i)=>put(`rooms/${code}/players/${token}`,{game:'scene',round:1,playerNum:i+1}));
const service = createExecutor({secret:'89'.repeat(32),databaseURL:'http://localhost',now:()=>Date.now(),fetchImpl:async(url,input={})=>{
  const key = new URL(url).pathname.slice(1).replace(/\.json$/,''), etag='"'+(versions.get(key)||0)+'"';
  if (!input.method||input.method==='GET') return new Response(JSON.stringify(nodes.get(key)??null),{headers:{etag}});
  if(new Headers(input.headers).get('if-match')!==etag)return new Response('null',{status:412});
  const value=JSON.parse(input.body);put(key,value);return new Response(JSON.stringify(value));
}});
function installFirebase({code,tokens,names,control,manager,locale}) {
  const listeners=new Map(),copy=v=>v==null?null:structuredClone(v),snap=value=>({val:()=>copy(value)});
  window.__lsReceived=[];
  window.__lsDeliver=(key,value)=>{for(const fn of listeners.get(key)||[]){if(value?.game==='dixit')window.__lsReceived.push(copy(value));fn(snap(value));}};
  function ref(key){return{key:key.split('/').at(-1),child:child=>ref(key+'/'+child),
    async once(){return snap((await window.__lsDB({type:'get',key})).value);},
    on(event,fn){if(event!=='value')throw Error('unexpected event');if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);window.__lsDB({type:'subscribe',key}).then(({value})=>{if(listeners.get(key)?.has(fn)){if(value?.game==='dixit')window.__lsReceived.push(copy(value));fn(snap(value));}});return fn;},
    off(event,fn){if(fn)listeners.get(key)?.delete(fn);else listeners.delete(key);if(!listeners.get(key)?.size)void window.__lsDB({type:'unsubscribe',key});},
    set:value=>window.__lsDB({type:'set',key,value}),update:value=>window.__lsDB({type:'update',key,value}),remove:()=>window.__lsDB({type:'set',key,value:null}),
    async transaction(update){for(let i=0;i<30;i++){const current=(await window.__lsDB({type:'get',key})).value;update(copy(current));const next=update(copy(current));const result=await window.__lsDB({type:'cas',key,expected:current,hasValue:next!==undefined,value:next??null});if(!result.conflict)return{committed:result.committed,snapshot:snap(result.value)};}throw Error('CAS retries exhausted');}
  };}
  const database=()=>({ref});database.ServerValue={TIMESTAMP:Date.now()};window.firebase={apps:[],initializeApp(){this.apps.push({});},database};
  localStorage.setItem('site-lang',locale==='zh-TW'?'zh':'en');
  if(manager){localStorage.setItem('room-last-session',code);localStorage.setItem('room-session-'+code,JSON.stringify({tokens,playerCount:4,names,dixitControlToken:control,dixitHostPlayerNum:1}));}
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  server=http.createServer((req,res)=>{const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(relative==='__classic-visual.html'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="shared.css"><link rel="stylesheet" href="dixit.css"><link rel="stylesheet" href="life-story.css"><script src="i18n.js"></script><script src="dixit-deck.js"></script><script src="life-story-ui.js"></script><script src="dixit-ui.js"></script></head><body class="dixit-card-page"><div id="i18n-toggle"></div><div id="content"></div></body></html>');return;}const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL||'msedge',headless:true});
  async function pageFor(index){
    const manager=index===0,context=await browser.newContext({viewport:index===4?{width:390,height:844}:{width:1280,height:900},hasTouch:index===4,isMobile:index===4});
    await context.exposeBinding('__lsDB',({page},input)=>{
      const allowed=manager?new Set([`.info/connected`,`.info/serverTimeOffset`,`rooms/${code}/players/${control}`,...tokens.map(t=>`rooms/${code}/players/${t}`)]):new Set([`.info/connected`,`.info/serverTimeOffset`,`rooms/${code}/players/${tokens[index-1]}`]);
      assert(allowed.has(input.key),'browser attempted another seat or canonical path');
      if(input.type==='unsubscribe'){subscriptions.get(page)?.delete(input.key);return{value:null};}
      const wire=nodes.get(input.key);readAudit.push({index,key:input.key,type:input.type,sensitive:wire?.dixit?.mode==='life_story'&&wire.dixit.hand?.length>0});
      const current=clone(nodes.get(input.key)??null);if(input.type==='subscribe'){if(!subscriptions.has(page))subscriptions.set(page,new Set());subscriptions.get(page).add(input.key);}
      if(['get','subscribe'].includes(input.type))return{value:current};
      if(input.type==='cas'&&JSON.stringify(input.expected)!==JSON.stringify(current))return{conflict:true,committed:false,value:current};
      if(input.type==='cas'&&!input.hasValue)return{committed:false,value:current};
      const next=input.type==='update'?{...current,...input.value}:input.value;put(input.key,next);return{committed:true,value:clone(next)};
    });
    await context.addInitScript(installFirebase,{code,tokens:manager?tokens:[],names:manager?names:[],control:manager?control:'',manager,locale});
    await context.route('**/*',async route=>{
      const url=route.request().url();if(url.startsWith(base))return route.continue();
      if(url==='https://icebreaker-youtube-search.vercel.app/api/hub-executor'){
        const headers={'Access-Control-Allow-Origin':base,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Expose-Headers':'X-Icebreak-Life-Story','X-Icebreak-Life-Story':'1'};
        if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
        if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({ready:true,version:1})});
        const body=route.request().postDataJSON();try{const result=await service[body.operation](body);return route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(result)});}catch(error){return route.fulfill({status:error.status||503,contentType:'application/json',headers,body:JSON.stringify({error:error.code||error.message})});}
      }
      return route.fulfill({status:200,contentType:'text/javascript',body:''});
    });
    const page=await context.newPage();pages.add(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/'+(manager?'dixit.html':`play.html?s=${code}&p=${tokens[index-1]}&n=${names[index-1]}`));return page;
  }
  const host=await pageFor(0),players=await Promise.all([1,2,3,4].map(pageFor));
  await expect(host.locator('#dx-open')).toBeEnabled();await host.getByTestId('dixit-mode').selectOption('life_story');await host.locator('#dx-life-locale').selectOption(locale);await host.locator('#dx-open').click();
  const phase=async(p,value)=>expect(p.getByTestId('phase')).toHaveAttribute('data-phase',value);
  for(const p of [host,...players])await phase(p,'LOBBY');
  await host.getByTestId('start-game').click();for(const p of players)await phase(p,'PREPARE');
  const comparisons=[];let originalSerial=0;
  const originalAct=(s,type,actor=0,extra={})=>E.apply(s,{type,actor,id:'classic-visual-'+(++originalSerial),sessionId:s.sessionId,turnId:s.turnId,seed:24,now:Date.now(),...extra});
  let original=E.create({id:'classic-visual',roster:names.map((name,i)=>({playerNum:i+1,name})),seed:24,now:Date.now()});original=originalAct(original,'deal',0,{firstPlayerNum:1});
  const classicHand=original;
  original=originalAct(original,'story',1,{cardId:original.hands[1][0],clueMode:'spoken'});
  for(const seat of [2,3,4])original=originalAct(original,'submit',seat,{cardIds:[original.hands[seat][0]]});
  for(const seat of [2,3,4])original=originalAct(original,'vote',seat,{cardId:seat===3?original.submissions[1][0]:original.submissions[3][0]});
  original=originalAct(original,'reveal');original=originalAct(original,'advanceReveal',0,{now:original.revealPopularAt});
  const classicReveal=original;
  const classicPages=[];
  for(const width of [1280,390]){const context=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});await context.addInitScript(({locale})=>localStorage.setItem('site-lang',locale==='zh-TW'?'zh':'en'),{locale});const page=await context.newPage();await page.goto(base+'/__classic-visual.html');classicPages.push(page);}
  async function metric(page,kind){return page.evaluate(kind=>{const style=selector=>{const e=document.querySelector(selector);if(!e)return null;const s=getComputedStyle(e);return{font:s.font,fontFamily:s.fontFamily,fontSize:s.fontSize,columns:s.gridTemplateColumns,padding:s.padding,gap:s.gap,border:s.borderWidth,radius:s.borderRadius,aspectRatio:s.aspectRatio,width:Math.round(e.getBoundingClientRect().width*100)/100};};return{game:style('.dx-game'),phase:style('.dx-phase-bar'),title:style('.dx-phase-bar h2'),grid:style(kind==='hand'?'.dx-hand-grid':'.dx-reveal-layout'),card:style(kind==='hand'?'.dx-hand-grid .dx-picture':'.dx-story-reveal .dx-picture')};},kind);}
  async function compare(kind){for(let i=0;i<2;i++){const life=players[i===0?0:3],classic=classicPages[i],state=kind==='hand'?classicHand:classicReveal;await classic.evaluate(payload=>{window.__visualCard?.destroy();window.__visualCard=new DIXIT_UI.Card(document.getElementById('content'),{now:Date.now()});window.__visualCard.update(payload);},E.view(state,1,Date.now()));const a=await metric(life,kind),b=await metric(classic,kind);for(const field of ['fontFamily','fontSize'])assert.equal(a.game[field],b.game[field],kind+' game '+field);for(const field of ['fontFamily','fontSize','padding','radius','border'])assert.equal(a.title[field],b.title[field],kind+' title '+field);for(const field of ['padding','gap','radius','border'])assert.equal(a.phase[field],b.phase[field],kind+' phase '+field);if(kind==='reveal')for(const field of ['columns','gap'])assert.equal(a.grid[field],b.grid[field],kind+' grid '+field);else assert(a.grid.columns.split(' ').length>b.grid.columns.split(' ').length,'Life hand shows more columns');for(const field of ['aspectRatio','radius','border'])assert.equal(a.card[field],b.card[field],kind+' card '+field);if(kind==='reveal')assert.equal(a.card.width,b.card.width,kind+' card width');else assert(a.card.width<b.card.width,'Life hand cards are smaller');comparisons.push({viewport:life.viewportSize(),kind,life:a,classic:b});await classic.screenshot({path:path.join(output,'classic-'+kind+'-'+(i?'mobile':'desktop')+'.png'),fullPage:true});}}
  await compare('hand');await host.screenshot({path:path.join(output,'shared-prompts-desktop.png'),fullPage:true});await players[3].screenshot({path:path.join(output,'shared-prompts-mobile.png'),fullPage:false});
  async function cardPick(p,confirm=false,offset=0){const card=p.getByTestId('hand-card').nth(offset),id=await card.getAttribute('data-card-id');await card.click();if(confirm)await p.getByTestId('choose-card').click();return id;}
  let staleVoteRetries=0;
  async function voteAndWait(p,index,target){
    await p.locator(`[data-testid="table-card"][data-card-id="${target}"]`).click();
    const key=`rooms/${code}/players/${tokens[index]}`;
    for(let attempt=0;attempt<3;attempt++){
      await expect(p.getByTestId('cast-vote')).toBeEnabled();const previousReply=nodes.get(key).dixit.reply?.id;await p.getByTestId('cast-vote').click();
      await expect.poll(()=>{const view=nodes.get(key).dixit;return view.vote?'accepted':view.reply?.id!==previousReply?view.reply?.error||'waiting':'waiting';}).not.toBe('waiting');
      const view=nodes.get(key).dixit;if(view.vote){await delivery;return;}
      assert.match(view.reply?.error||'',/stale_revision/,'only an explicitly rejected stale vote may be retried');staleVoteRetries++;await delivery;
    }
    throw Error('Vote was not accepted after a fresh-revision retry');
  }
  async function playTurn(index,normal){
    const p=players[index];await phase(p,'PREPARE');await expect(p.getByTestId('question-option')).toHaveCount(normal?3:0);
    if(normal){for(const item of [host,...players])await expect(item.getByTestId('question-option')).toHaveCount(3);await p.locator('[data-ls-question]').first().click();await expect(host.locator('.ls-question-option.is-selected')).toHaveCount(1);}
    await expect(p.getByTestId('start-story')).toBeEnabled();await p.getByTestId('start-story').click();
    for(let i=0;i<4;i++)if(i!==index){await phase(players[i],'STORYTELLING');await cardPick(players[i]);await players[i].getByTestId('submit-card').click();await expect(players[i].getByTestId('withdraw-card')).toBeVisible();}
    await expect(p.getByTestId('finish-story')).toBeDisabled();
    await cardPick(p,true);await expect(p.getByTestId('finish-story')).toBeEnabled();
    const answer=await cardPick(p,true,1);await expect(p.getByTestId('finish-story')).toBeEnabled();
    if(index===0){for(const item of [host,...players])await expect(item.locator('[data-ls-selected-question]')).toHaveCount(1);await p.getByTestId('hand-card').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,'story-hand-desktop.png')});await players[3].getByTestId('hand-card').first().scrollIntoViewIfNeeded();await players[3].screenshot({path:path.join(output,'story-hand-mobile.png')});}
    await phase(p,'STORYTELLING');for(const item of players)await expect(item.getByTestId('follow-up')).toHaveCount(0);
    await p.getByTestId('finish-story').click();for(const item of players)await phase(item,'VOTING');
    const originalTable=await players[1].getByTestId('table-card').evaluateAll(items=>items.map(e=>e.getAttribute('data-token')));await players[1].reload();await phase(players[1],'VOTING');assert.deepEqual(await players[1].getByTestId('table-card').evaluateAll(items=>items.map(e=>e.getAttribute('data-token'))),originalTable);
    for(let i=0;i<4;i++)if(i!==index){const item=players[i],view=nodes.get(`rooms/${code}/players/${tokens[i]}`).dixit,choices=view.table.filter(c=>c.token!==view.ownTableToken&&c.cardId!==answer),target=index===2&&i!==3?choices[i%choices.length].cardId:answer;await voteAndWait(item,i,target);}
    for(const item of [host,...players])await phase(item,'VOTING');await expect(host.getByTestId('reveal')).toBeEnabled();await host.getByTestId('reveal').click();await phase(host,'REVEALING');await expect(host.locator('[data-dx-reveal-stage="countdown"]')).toBeVisible();
    if(index===0)await host.screenshot({path:path.join(output,'countdown-desktop.png')});
    await expect(host.locator('[data-dx-reveal-stage="answer"]')).toBeVisible({timeout:10000});assert(!nodes.get(`rooms/${code}/players/${tokens[index]}`).dixit.result);if(index===0)await host.screenshot({path:path.join(output,'answer-desktop.png')});
    for(const item of [host,...players]){await phase(item,'REVEAL_DISCUSS');await expect(item.getByTestId('follow-up')).toHaveCount(0);}
    if(index===0){await host.screenshot({path:path.join(output,'normal-reveal-manager.png'),fullPage:true});await players[3].screenshot({path:path.join(output,'normal-reveal-mobile.png'),fullPage:true});}
    if(index===2){await compare('reveal');for(const item of [host,...players])await expect(item.locator('[data-dx-voters-toggle]').first()).toHaveAttribute('aria-expanded','false');const voters=host.locator('[data-dx-voters-toggle]').first();await voters.click();await expect(voters).toHaveAttribute('aria-expanded','true');await expect(host.locator('.dx-voter-list').first()).toBeVisible();await host.screenshot({path:path.join(output,'reveal-manager.png'),fullPage:true});await players[0].screenshot({path:path.join(output,'reveal-desktop.png'),fullPage:true});await players[3].screenshot({path:path.join(output,'reveal-mobile.png'),fullPage:true});}
    assert.equal(nodes.get(`rooms/${code}/players/${tokens[index]}`).dixit.deltas[index+1],2);
    await host.getByTestId('finish-discussion').click();for(const item of players)await phase(item,'FOLLOW_UP');
  }
  await playTurn(0,true);await players[2].getByTestId('follow-up').click();await playTurn(2,false);
  await host.getByTestId('next-in-order').click();await playTurn(1,true);
  await host.getByTestId('next-in-order').click();await playTurn(3,true);
  assert.equal(nodes.get(`rooms/${code}/players/${tokens[0]}`).dixit.cycleNumber,2);
  await players[3].getByTestId('follow-up').click();await phase(players[3],'PREPARE');await expect(players[3].getByTestId('question-option')).toHaveCount(0);
  const raw=nodes.get(`rooms/${code}/players/${control}`);assert(raw.lifeStateCipher);assert(!JSON.stringify(raw.state).includes('"lifeRoom"'));assert(!JSON.stringify(raw.state).includes('"hands"'));
  for(const p of players){const snapshots=await p.evaluate(()=>window.__lsReceived);for(const s of snapshots){assert(!('hands' in s.dixit));if(s.dixit.phase==='VOTING')assert(s.dixit.table.every(c=>!('ownerPlayerNum'in c)&&!('isAnswer'in c)&&!('voterNums'in c)));}}
  assert(!readAudit.some(read=>read.index===0&&read.sensitive),'shared manager never fetched a dealt private hand');
  assert((await host.evaluate(()=>window.__lsReceived)).every(s=>!s.dixit?.hand?.length),'shared manager never received dealt private cards');
  // Rendering stress checks use a private projection only in browser memory;
  // no synthetic layout payload is written to Firebase or the trusted service.
  const compactLayouts=[];
  const legalQuestion=locale==='zh-TW'?'你曾在一個平常的日子裡，因為意料之外的小事改變原本安排嗎？聊聊那天你在哪裡、正準備做什麼，以及後來發生了什麼。如果有讓你到現在還記得的畫面或細節，也可以就從你最先想起的地方慢慢說。':'Tell us about a small unexpected incident in an ordinary day. Where were you, what first caught your attention, and what happened next? Include any detail that helps you picture that moment again, as clearly as you like.';
assert.equal(legalQuestion.length,locale==='zh-TW'?90:220);
  for(const width of [320,390,1280]){
    const context=await browser.newContext({viewport:{width,height:width===320?568:width===390?844:900},isMobile:width<600,hasTouch:width<600});await context.addInitScript(({locale})=>localStorage.setItem('site-lang',locale==='zh-TW'?'zh':'en'),{locale});const page=await context.newPage();pages.add(page);await page.goto(base+'/__classic-visual.html');page.on('pageerror',error=>errors.push(error.message));
    for(const stage of ['PREPARE','STORYTELLING','COLLECTING']){
      const wire=clone(nodes.get(`rooms/${code}/players/${tokens[0]}`));const q={id:'layout-question',question:{en:legalQuestion,'zh-TW':legalQuestion},optionalPrompts:{en:['Optional hint','Another optional hint'],'zh-TW':['選看提示','另一個選看提示']}};
      Object.assign(wire.dixit,{sessionId:'layout-only',turnId:'layout-'+stage,playerNum:1,storyteller:1,hostControls:false,phase:stage,locale,source:'normal',questionChosen:true,question:q,previousQuestion:null,candidates:[q,{...q,id:'layout-2'},{...q,id:'layout-3'}],storyCard:null,storyCardRequired:stage==='COLLECTING',submission:null,table:[],result:null,actions:{choose_question:stage==='PREPARE',refresh_questions:stage==='PREPARE',free_share:stage==='PREPARE',choose_story_card:true,start_story:stage==='PREPARE',finish_story:stage==='STORYTELLING'}});
      await page.evaluate(payload=>{window.__layoutCard?.destroy();window.__layoutCard=new DIXIT_UI.Card(document.getElementById('content'),{now:Date.now(),send:async()=>{throw Error('Layout check must never send');}});window.__layoutCard.update(payload);window.scrollTo(0,0);},wire);
      await expect(page.locator('[data-ls-story-dock]')).toBeVisible();await expect(page.locator('[data-ls-selected-question]')).toHaveText(legalQuestion.trim());assert.equal(await page.locator('.dx-choice-bar').count(),1);
      if(stage==='PREPARE'){assert.equal(await page.getByTestId('question-option').count(),3);assert.equal(await page.getByTestId('question-option').nth(1).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 241, 230)');}
      const card=page.getByTestId('hand-card').last();await card.evaluate(e=>e.scrollIntoView({block:'start'}));
      await expect.poll(()=>page.locator('.dx-hand-grid img.dx-art').evaluateAll(images=>images.filter(img=>{const b=img.getBoundingClientRect();return b.bottom>0&&b.top<innerHeight;}).every(img=>img.complete&&img.naturalWidth>0)),{timeout:10000}).toBe(true);
      const bounds=await page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height,width:b.width};},dock=document.querySelector('[data-ls-story-dock]'),topic=document.querySelector('[data-ls-sticky-topic]'),card=[...document.querySelectorAll('[data-testid="hand-card"]')].at(-1),controls=[...dock.querySelectorAll('.ls-dock-controls .dx-button')];const b=r(card),target=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{dock:r(dock),topic:r(topic),card:b,controls:controls.map(r),topicFull:topic.scrollHeight<=topic.clientHeight+1,viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth+1,cardHit:!!target?.closest('[data-testid="hand-card"]'),columns:getComputedStyle(document.querySelector('.dx-hand-grid')).gridTemplateColumns};});
      fs.writeFileSync(path.join(output,'compact-latest-bounds.json'),JSON.stringify({width,stage,...bounds},null,2));
      assert(!bounds.overflow,'no horizontal overflow at '+width+' '+stage);assert(bounds.topicFull,'legal main prompt fully readable without internal scroll at '+width+' '+stage);assert(bounds.dock.top>=0&&bounds.dock.bottom<bounds.viewport.height,'dock fits viewport');assert(bounds.topic.top>=bounds.dock.top&&bounds.topic.bottom<=bounds.dock.bottom,'theme stays visible inside dock');assert(bounds.card.top>=bounds.dock.bottom+10,'card scroll anchor clears dock');assert(bounds.card.bottom<=bounds.viewport.height+1,'one entire card remains visible');assert(bounds.cardHit,'visible card remains tappable');for(let i=0;i<bounds.controls.length;i++){const b=bounds.controls[i];assert(b.left>=bounds.dock.left&&b.right<=bounds.dock.right&&b.top>=bounds.topic.bottom&&b.bottom<=bounds.dock.bottom,'controls contained under theme');if(i)assert(bounds.controls[i-1].right<=b.left||bounds.controls[i-1].bottom<=b.top,'controls never overlap');}
      compactLayouts.push({width,stage,questionLength:legalQuestion.length,...bounds});await page.screenshot({path:path.join(output,'compact-'+stage.toLowerCase()+'-'+width+'.png')});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);await players[3].screenshot({path:path.join(output,'mobile-cross-cycle.png'),fullPage:true});await host.screenshot({path:path.join(output,'hub-manager.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,locale,entry:'existing dixit.html mode selector and four original play.html links',rounds:4,cycle:2,privateReads:readAudit.length,comparisons,compactLayouts,staleVoteRetries,errors,physicalPhones:false,liveFirebase:false},null,2));
  console.log('PASS Hub original manager + four independent private links: normal → follow-up → normal → cross-cycle; encrypted canonical, reconnect, touch mobile and projections');
}
main().catch(async error=>{
  console.error(error);console.error('Browser errors:',errors);
  for(const [index,page] of [...pages].entries())if(!page.isClosed()){
    await page.screenshot({path:path.join(output,'failure-'+index+'.png'),fullPage:true}).catch(()=>{});
    console.error('Page',index,await page.locator('#dx-host-status,[data-ls-message]').allTextContents());
  }
  const raw=nodes.get(`rooms/${code}/players/${control}`);console.error('Fixture state:',{mode:raw?.state?.mode,phase:raw?.state?.phase,encrypted:!!raw?.lifeStateCipher,registered:!!raw?.executor});
  process.exitCode=1;
}).finally(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});
