'use strict';
// Five actual play.html pages with local authenticated authority and synthetic time.
// This never connects to a real room, service or Firebase database.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright'),{fixture}=require('./helpers/talk-vnext-fixture.cjs');
const root=path.resolve(__dirname,'..'),qaDir=path.resolve(root,'../../outputs/talk-returned-tasks');
(async()=>{
  fs.mkdirSync(qaDir,{recursive:true});
  const f=fixture({now:Date.now(),crazySource:'players',crazyPlayStyle:'director',crazyMinSeconds:5,crazyMaxSeconds:5,gameSeconds:900});
  await f.register();await f.act(0,'start');
  const requests=[],mailboxWrites=[],errors=[],dialogs=[],pages=[];let holdSave=null,saveArrived=false;
  const server=http.createServer(async(req,res)=>{try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/qa/node') {
      const key=url.searchParams.get('path'),snapshot=await f.fetchImpl('http://localhost/'+key+'.json',{headers:{'X-Firebase-ETag':'true'}});
      if(req.method==='GET'){res.setHeader('etag',snapshot.headers.get('etag'));res.end(JSON.stringify(await snapshot.json()));return;}
      let body='';for await(const chunk of req)body+=chunk;
      const action=JSON.parse(body)?.talkAction;if(action)mailboxWrites.push(structuredClone(action));
      const result=await f.fetchImpl('http://localhost/'+key+'.json',{method:'PUT',headers:{'If-Match':req.headers['if-match']},body});res.statusCode=result.status;res.end('null');return;
    }
    const file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(root+path.sep));let body=fs.readFileSync(file);
    if(url.pathname==='/talk-ui.js')body=Buffer.from(body.toString()+`\n;(()=>{const Card=TALK_PLAYER.Card;TALK_PLAYER.Card=class extends Card{constructor(...a){super(...a);window.__card=this;}};})();`);
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream');res.end(body);
  }catch{res.statusCode=404;res.end('missing');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const fake=`window.firebase={initializeApp:()=>({}),database:()=>({ref:path=>{const ref={key:path.split('/').pop(),on:(event,fn)=>{if(path.startsWith('.info')){fn({val:()=>path==='.info/connected'?true:0});return;}let old;const poll=async()=>{try{const v=await(await fetch('/qa/node?path='+encodeURIComponent(path))).json();ref._value=v;const json=JSON.stringify(v);if(json!==old){old=json;fn({val:()=>v});}}catch{}};poll();ref._timer=setInterval(poll,100);},off:()=>clearInterval(ref._timer),transaction:async change=>{for(let i=0;i<8;i++){const r=await fetch('/qa/node?path='+encodeURIComponent(path)),old=await r.json(),next=change(old);if(next===undefined)return{committed:false};const put=await fetch('/qa/node?path='+encodeURIComponent(path),{method:'PUT',headers:{'if-match':r.headers.get('etag')},body:JSON.stringify(next)});if(put.status===412)continue;if(!put.ok)throw Error('storage');ref._value=next;return{committed:true,snapshot:{val:()=>next}};}throw Error('retry');},set:async value=>ref.transaction(()=>value),update:async value=>ref.transaction(v=>({...v,...value}))};ref.once=async()=>{if(path.startsWith('.info'))return{val:()=>path==='.info/connected'?true:0};const v=await(await fetch('/qa/node?path='+encodeURIComponent(path))).json();return{val:()=>v};};return ref;}})};`;
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    for(let num=1;num<=5;num++) {
      const context=await browser.newContext({viewport:{width:375,height:900}});
      await context.addInitScript(clock=>{window.__qaClock=clock;Date.now=()=>__qaClock;},f.now());
      await context.route('https://www.gstatic.com/firebasejs/**/firebase-app-compat.js',route=>route.fulfill({contentType:'text/javascript',body:fake}));
      await context.route('https://www.gstatic.com/firebasejs/**/firebase-database-compat.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
      await context.route('https://icebreaker-youtube-search.vercel.app/api/hub-executor',async route=>{
        const request=route.request();if(request.method()==='GET')return route.fulfill({json:{ready:true,version:1},headers:{'X-Icebreak-Crazy-Talk':'2'}});
        const body=request.postDataJSON();requests.push(structuredClone(body));
        if(holdSave&&(body.command?.type==='crazyReturnSave'||body.operation==='execute'&&f.card(1)?.talkAction?.type==='crazyReturnSave')){saveArrived=true;await holdSave;}
        try{const result=await f.service[body.operation](body);delete result._wake;await route.fulfill({json:result});}
        catch(error){await route.fulfill({status:error.status||503,json:{error:error.code||'executor_unavailable'}});}
      });
      const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
      await page.goto(base+'/play.html?s='+f.code+'&p='+f.seats[num-1].token+'&n=Synthetic'+num);await page.waitForSelector('.talk-player');await page.evaluate(()=>I18N.setLang('en'));pages.push(page);
    }
    const page=num=>pages[num-1],wait=async check=>{for(let n=0;n<100;n++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,75));}throw Error('authoritative state wait');};
    const advance=async ms=>{f.advance(ms);await Promise.all(pages.map(p=>p.evaluate(clock=>window.__qaClock=clock,f.now())));await f.service.execute({capsule:f.capsule(),token:f.controlToken,clock:true});await new Promise(resolve=>setTimeout(resolve,300));};
    const screenshots=async(p,stage)=>{for(const language of ['en','zh']){await p.evaluate(lang=>I18N.setLang(lang),language);for(const width of [320,375]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:path.join(qaDir,stage+'-'+language+'-'+width+'.png'),fullPage:true});}}await p.evaluate(()=>I18N.setLang('en'));await p.setViewportSize({width:375,height:900});};
    const write=async(target,text)=>{await page(1).selectOption('[data-talk-assignment-field="target"]',String(target));await page(1).fill('[data-talk-assignment-field="text"]',text);await page(1).click('[data-talk-action="crazyAssign"]');await wait(()=>page(1).inputValue('[data-talk-assignment-field="text"]').then(value=>value===''));};
    const originalA='A private returned chicken challenge.',originalB='A second private returned cup challenge.';
    await write(3,originalA);await write(4,originalB);await wait(()=>f.state().crazy.prompts[3]?.renderedVersion===1&&f.state().crazy.prompts[4]?.renderedVersion===1);
    await wait(()=>page(3).locator('[data-talk-action="crazySkip"]').textContent().then(text=>text.includes('−1')));
    assert.match(await page(3).locator('.talk-skip-hint').textContent(),/returns the task to its author/);await screenshots(page(3),'player-skip');
    await page(3).click('[data-talk-action="crazySkip"]');await page(4).click('[data-talk-action="crazySkip"]');
    await wait(()=>f.state().scores[3]===-1&&f.state().scores[4]===-1);await page(1).waitForSelector('[data-talk-return-card]');
    await wait(()=>page(1).locator('[data-talk-return-card]').count().then(count=>count===2));
    for(const num of [2,3,4,5])assert.equal(f.card(num).talk.crazy.returnedCards.length,0);
    await advance(120000);await wait(()=>!f.state().crazy.directors.includes(1));await wait(()=>page(1).locator('.talk-assignment').count().then(count=>count===0));
    assert.equal(await page(1).locator('[data-talk-return-card]').count(),2);await page(1).reload();await page(1).waitForSelector('[data-talk-return-card]');await page(1).evaluate(()=>I18N.setLang('en'));
    assert.equal(await page(1).locator('.talk-assignment').count(),0);assert.equal(await page(1).locator('[data-talk-return-card]').count(),2);
    const returned=f.card(1).talk.crazy.returnedCards,cardA=returned.find(card=>card.text===originalA),cardB=returned.find(card=>card.text===originalB);
    assert.ok(cardA&&cardB);const article='[data-talk-return-card="'+cardA.id+'"]',field=article+' textarea';
    await page(1).fill(field,'退回卡片的中文草稿');await page(1).locator(field).focus();await page(1).locator(field).evaluate(el=>{window.__returnRefs={text:el,article:el.closest('[data-talk-return-card]'),save:el.closest('[data-talk-return-card]').querySelector('[data-talk-action="crazyReturnSave"]')};el.setSelectionRange(2,5);});
    await page(1).locator(field).dispatchEvent('compositionstart');await page(1).evaluate(()=>{for(let n=0;n<6;n++)__card.update(structuredClone(__card.data));});
    assert.equal(await page(1).locator(field).evaluate(el=>el===__returnRefs.text&&document.activeElement===el&&el.selectionStart===2&&el.selectionEnd===5&&Object.values(__returnRefs).every(node=>node.isConnected)),true);
    await page(1).locator(field).dispatchEvent('compositionend');await page(1).evaluate(()=>{for(let n=0;n<6;n++)__card.update(structuredClone(__card.data));});
    assert.equal(await page(1).locator(field).evaluate(el=>el===__returnRefs.text&&document.activeElement===el&&el.selectionStart===2&&el.selectionEnd===5&&__returnRefs.save===document.querySelector('[data-talk-return-card="'+el.dataset.talkLibraryField+'"] [data-talk-action="crazyReturnSave"]')),true);
    await screenshots(page(1),'returned-author');
    const edited='An edited challenge for my private collection.';await page(1).fill(field,edited);let releaseSave;holdSave=new Promise(resolve=>releaseSave=resolve);
    await page(1).locator(article+' [data-talk-action="crazyReturnSave"]').click();await wait(()=>saveArrived);const frozen=await page(1).evaluate(()=>structuredClone(__card.pending));
    assert.equal(frozen.text,edited);assert.equal(frozen.cardId,cardA.id);await page(1).locator(field).dispatchEvent('compositionstart');await page(1).fill(field,'Newer unsent private edit 中文');
    releaseSave();holdSave=null;await wait(()=>f.card(1).talk.crazy.library.some(card=>card.id===cardA.id));await wait(()=>page(1).evaluate(()=>!__card.pending));
    assert.equal(await page(1).inputValue(field),'Newer unsent private edit 中文');assert.equal(f.card(1).talk.crazy.library.find(card=>card.id===cardA.id).text,edited);
    await page(1).locator(field).dispatchEvent('compositionend');await wait(()=>page(1).locator('[data-talk-library-editor="'+cardA.id+'"]').evaluate(el=>el.open));
    const savedField='[data-talk-library-field="'+cardA.id+'"]';assert.equal(await page(1).inputValue(savedField),'Newer unsent private edit 中文');assert.equal(await page(1).locator(savedField).evaluate(el=>el===__returnRefs.text&&document.activeElement===el),true);
    assert.equal(await page(1).locator('.talk-private-library').evaluate(el=>el.open),true);
    await page(1).locator('[data-talk-return-card="'+cardB.id+'"] [data-talk-action="crazyReturnDelete"]').click();await wait(()=>f.card(1).talk.crazy.returnedCards.length===0);
    assert.equal(f.card(1).talk.crazy.library.some(card=>card.id===cardB.id),false);assert.equal(mailboxWrites.filter(command=>command.type==='crazyLibrarySend').length,0);
    for(const num of [2,3,4,5])assert.equal(JSON.stringify(f.card(num)).includes(edited),false);
    await f.act(0,'crazyDrain');await f.act(0,'newTopic',{topic:{question:'Make a silly system-only show.'},mode:'think',seconds:45,showStarters:true,gameMode:'crazy',crazyPlayStyle:'free',crazySource:'system',crazyMinSeconds:5,crazyMaxSeconds:5,gameSeconds:900,confirm:true});await f.act(0,'start');await advance(5000);
    const receiver=Object.keys(f.state().crazy.prompts).map(Number).find(num=>f.state().crazy.prompts[num].status==='pending');assert.ok(receiver);await wait(()=>f.state().crazy.prompts[receiver]?.renderedVersion===1);
    await wait(()=>page(receiver).locator('[data-talk-action="crazySkip"]').textContent().then(text=>text==='Swap for free'));
    await page(receiver).locator('[data-talk-action="crazyDone"]').hover();assert.deepEqual(await page(receiver).locator('[data-talk-action="crazyDone"]').evaluate(node=>({color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor})),{color:'rgb(255, 243, 247)',background:'rgb(116, 75, 102)'});
    await page(receiver).locator('[data-talk-action="crazySkip"]').hover();assert.deepEqual(await page(receiver).locator('[data-talk-action="crazySkip"]').evaluate(node=>({color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor})),{color:'rgb(73, 43, 61)',background:'rgb(242, 220, 230)'});
    await screenshots(page(receiver),'system-skip');
    const old=f.state().crazy.prompts[receiver];await page(receiver).click('[data-talk-action="crazySkip"]');await wait(()=>f.state().crazy.prompts[receiver]?.status==='pending'&&f.state().crazy.prompts[receiver]?.id!==old.id);
    assert.notEqual(f.state().crazy.prompts[receiver].text,old.text);assert.equal(f.state().scores[receiver],0);assert.equal(f.card(receiver).talk.crazy.lastResult.scoreDelta,0);
    await wait(()=>page(receiver).locator('.talk-skip-feedback').textContent().then(text=>text.includes('without losing points')));
    assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
    const result={fiveActualPlayerPages:true,authoritativeETags:true,playerSkipMinusOne:true,systemSwapFreeImmediate:true,returnAuthorOnly:true,actorAfterRotation:true,reloadRecovery:true,editableReturnSave:true,returnDelete:true,noAutoResend:true,pendingNewDraft:true,sameReturnDOM:true,returnIME:true,negativeScores:true,taskHoverContrast:true,languages:['en','zh'],widths:[320,375],screenshots:12,errors,dialogs};
    fs.writeFileSync(path.join(qaDir,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
