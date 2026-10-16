'use strict';
// Actual host demo/stylesheet with synthetic time, never a real room or mailbox.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),qaDir=path.resolve(root,'../../outputs/talk-director-inspiration');
(async()=>{
  fs.mkdirSync(qaDir,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:375,height:900}}),errors=[],dialogs=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
    await page.addInitScript(()=>{window.__time=1700000000000;Date.now=()=>__time;});
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!=='http://talk-inspiration.local')return route.fulfill({status:200,contentType:'application/javascript',body:''});
      assert.equal(route.request().method(),'GET');assert.ok(!url.pathname.includes('/rooms/')&&!url.pathname.startsWith('/api/'));
      const file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(root+path.sep));
      let body=fs.readFileSync(file);
      if(url.pathname==='/talk-host.js')body=Buffer.from(`(()=>{const create=TALK_ENGINE.create,apply=TALK_ENGINE.apply,Card=TALK_PLAYER.Card;TALK_ENGINE.create=(...a)=>window.__state=create(...a);TALK_ENGINE.apply=(...a)=>window.__state=apply(...a);TALK_PLAYER.Card=class extends Card{constructor(...a){super(...a);window.__card=this;}};})();\n`+body.toString());
      await route.fulfill({body,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'});
    });
    await page.goto('http://talk-inspiration.local/lets-talk.html?demo=1');await page.evaluate(()=>I18N.setLang('en'));
    await page.selectOption('#talk-game-mode','crazy');assert.equal(await page.inputValue('#talk-crazy-rotation-seconds'),'120');
    await page.locator('#talk-crazy-advanced>summary').click();await page.selectOption('#talk-crazy-source','players');await page.click('#talk-open');await page.click('#talk-start');await page.selectOption('#talk-demo-view','1');
    const panel='[data-talk-inspiration]',idea='[data-talk-action="inspirationUse"]',text='[data-talk-assignment-field="text"]',target='[data-talk-assignment-field="target"]';
    assert.equal(await page.locator(panel).isVisible(),true);assert.equal(await page.locator(panel).evaluate(e=>e.open),false);
    await page.locator(panel+'>summary').click();assert.equal(await page.locator(idea+':visible').count(),3);
    await page.evaluate(()=>{window.__inspirationRefs={text:document.querySelector('[data-talk-assignment-field="text"]'),target:document.querySelector('[data-talk-assignment-field="target"]'),panel:document.querySelector('[data-talk-inspiration]'),idea:document.querySelector('[data-talk-action="inspirationUse"]')};window.__sent=[];window.__originalSend=__card.send;__card.send=async command=>__sent.push(structuredClone(command));});
    const currentIds=()=>page.locator(idea).evaluateAll(nodes=>nodes.map(n=>n.dataset.talkIdeaId));
    const stable=()=>page.evaluate(()=>Object.values(__inspirationRefs).every(n=>n.isConnected)&&__inspirationRefs.text===document.querySelector('[data-talk-assignment-field="text"]')&&__inspirationRefs.target===document.querySelector('[data-talk-assignment-field="target"]')&&__inspirationRefs.panel.open);
    const firstIds=await currentIds(),firstIdea=await page.locator(idea).first().textContent();
    await page.fill(text,'My own idea.');await page.locator(idea).first().click();assert.equal(await page.inputValue(text),'My own idea.\n'+firstIdea);
    assert.equal(await page.evaluate(()=>__sent.length),0);assert.equal(await page.locator(text).evaluate(e=>document.activeElement===e&&e.selectionStart===e.value.length),true);
    await page.locator(text).evaluate(e=>e.setSelectionRange(2,6));
    await page.evaluate(()=>{for(let n=0;n<6;n++)__card.update(structuredClone(__card.data));});assert.equal(await stable(),true);
    assert.equal(await page.locator(text).evaluate(e=>document.activeElement===e&&e.selectionStart===2&&e.selectionEnd===6),true);assert.deepEqual(await currentIds(),firstIds);
    await page.locator(target).click();const pickerOpen=await page.locator(target).evaluate(e=>e.matches(':open'));
    await page.evaluate(()=>{for(let n=0;n<6;n++)__card.update(structuredClone(__card.data));});assert.equal(await stable(),true);
    if(pickerOpen)assert.equal(await page.locator(target).evaluate(e=>e.matches(':open')),true);await page.keyboard.press('Escape');await page.locator(text).click();
    await page.locator(text).dispatchEvent('compositionstart');await page.fill(text,'雞叫草稿');await page.locator(text).evaluate(e=>e.setSelectionRange(1,3));
    await page.evaluate(()=>{for(let n=0;n<6;n++)__card.update(structuredClone(__card.data));});assert.equal(await stable(),true);
    assert.equal(await page.inputValue(text),'雞叫草稿');assert.equal(await page.locator(text).evaluate(e=>document.activeElement===e&&e.selectionStart===1&&e.selectionEnd===3),true);
    assert.equal(await page.locator(idea).first().isDisabled(),true);await page.locator(text).dispatchEvent('compositionend');
    await page.fill(text,'A submitted draft.');await page.click('[data-talk-action="crazyAssign"]');await page.waitForFunction(()=>__card.pending);
    const frozen=await page.evaluate(()=>structuredClone(__card.pending));await page.fill(text,'The next idea.');
    assert.equal(await page.locator(idea).first().isDisabled(),false);await page.locator(idea).first().click();
    assert.equal(await page.inputValue(text),'The next idea.\n'+firstIdea);assert.deepEqual(await page.evaluate(()=>structuredClone(__card.pending)),frozen);assert.equal(await page.evaluate(()=>__sent.length),1);
    await page.evaluate(()=>__card.update({...__card.data,talk:{...__card.data.talk,reply:{id:__card.pending.id,error:''}}}));
    assert.equal(await page.inputValue(text),'The next idea.\n'+firstIdea);assert.equal(await page.evaluate(()=>__card.pending),null);
    await page.fill(text,'x'.repeat(119));await page.locator(idea).first().click();assert.equal(await page.inputValue(text),'x'.repeat(119));assert.equal(await page.locator('[data-talk-inspiration-notice]').isVisible(),true);
    await page.click('[data-talk-action="inspirationRefresh"]');assert.ok((await currentIds()).every(id=>!firstIds.includes(id)));assert.equal(await stable(),true);
    const refreshed=await currentIds();await page.fill(text,'');
    for(const language of ['en','zh']) {
      await page.evaluate(lang=>I18N.setLang(lang),language);assert.deepEqual(await currentIds(),refreshed);assert.equal(await stable(),true);
      const translated=await page.locator(idea).first().textContent();assert.equal(translated,await page.evaluate(lang=>lang==='zh'?__card.inspirationCards[0].zh:__card.inspirationCards[0].text,language));
      await page.locator(idea).first().click();assert.equal(await page.inputValue(text),translated);assert.equal(await page.evaluate(()=>__sent.length),1);
      await page.fill(text,'');
      for(const width of [320,375]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(qaDir,language+'-'+width+'.png'),fullPage:true});}
    }
    await page.evaluate(()=>{__card.send=__originalSend;});await page.selectOption('#talk-demo-view','3');assert.equal(await page.locator(panel).count(),0);assert.equal(await page.locator('.talk-assignment').count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
    const result={defaultRotation120:true,directorOnly:true,threePublicIdeas:true,explicitAppendNoSend:true,existingDraftSafe:true,wordLimitSafe:true,refreshExcludesCurrent:true,sameDOM:true,nativePicker:true,IME:true,frozenPending:true,bilingual:true,screenshots:4,widths:[320,375],errors,dialogs};
    fs.writeFileSync(path.join(qaDir,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
