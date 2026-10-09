
'use strict';
// Run with: node tests/talk-ui.browser.cjs [path-to-playwright-package]
// This uses an isolated card fixture, never a real room or player mailbox.
const {chromium}=require(process.argv[2] || 'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:375,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<style>.secret-card{display:flex;flex-direction:column;gap:14px}.talk-card-top{height:160px}.talk-topic-card{height:240px}.talk-card-roster{height:100px}select,textarea{display:block;min-width:220px;min-height:44px}.talk-assignment-body{display:grid;gap:12px}[hidden]{display:none}</style><main id="card"></main>');
    const base=String(process.env.TALK_QA_BASE||'').replace(/\/$/,'');
    await page.addScriptTag(base ? {url:base+'/talk-ui.js?native-picker-regression=1'} : {path:path.resolve(__dirname,'../talk-ui.js')});
    await page.evaluate(()=>{
      window.__now=1000;window.__online=true;window.__sent=[];window.__scrollCalls=0;
      Element.prototype.scrollIntoView=function(){window.__scrollCalls++;};
      window.__talk={version:1,sessionId:'browser-round',turnId:2,phase:'talking',round:1,mode:'think',
        gameMode:'crazy',conversationMode:'free',speaker:null,gameDeadline:901000,topic:{question:'Invent a silly restaurant together.'},
        roster:[{playerNum:1,name:'Alex'},{playerNum:2,name:'Sam'},{playerNum:3,name:'Jo'},{playerNum:4,name:'Lee'}],
        questions:[],notes:[],interests:[],sharedControls:true,hostControls:false,
        crazy:{enabled:true,source:'mixed',paused:false,canAssign:true,prompt:null,myQueuedCount:0}};
      window.__card=new TALK_PLAYER.Card(document.getElementById('card'),{send:async command=>window.__sent.push(structuredClone(command)),
        nameBanner:()=>'<span>Sam</span>',now:()=>window.__now,connected:()=>window.__online});
      window.__update=()=>__card.update({game:'letstalk',playerNum:2,name:'Sam',talk:structuredClone(__talk),talkAction:window.__mailbox});
      __update();
      const composer=document.querySelector('.talk-assignment');composer.open=true;
      window.__refs={composer,target:composer.querySelector('[data-talk-assignment-field="target"]'),
        kind:composer.querySelector('[data-talk-assignment-field="kind"]'),text:composer.querySelector('textarea'),
        ancestors:[]};
      for(let n=__refs.target;n;n=n.parentNode)__refs.ancestors.push(n);
      window.__removed=0;
      new MutationObserver(records=>records.forEach(record=>record.removedNodes.forEach(node=>{
        if(node===__refs.target||node.contains?.(__refs.target))window.__removed++;
      }))).observe(document.getElementById('card'),{subtree:true,childList:true});
      window.__nativeOpen=CSS.supports('selector(select:open)');
    });
    const target='[data-talk-assignment-field="target"]',kind='[data-talk-assignment-field="kind"]',text='[data-talk-assignment-field="text"]',send='[data-talk-action="crazyAssign"]';
    const stable=async()=>assert.equal(await page.evaluate(()=>__refs.target===document.querySelector('[data-talk-assignment-field="target"]')&&
      __refs.kind===document.querySelector('[data-talk-assignment-field="kind"]')&&__refs.text===document.querySelector('[data-talk-assignment-field="text"]')&&
      __refs.ancestors.every(n=>n.isConnected)&&__refs.composer.open&&__removed===0),true);
    let nativePickerChecks=0;
    for(let i=0;i<5;i++) {
      await page.locator(target).click();
      const opened=await page.locator(target).evaluate(el=>CSS.supports('selector(select:open)')&&el.matches(':open'));
      await page.evaluate(i=>{
        for(let n=0;n<6;n++){__talk.revision=i*10+n;__talk.crazy.prompt={id:'incoming-'+i,text:'Private mission '+i,kind:'task',status:'pending',expiresAt:800000};__update();}
      },i);
      await stable();assert.equal(await page.locator(target).evaluate(el=>document.activeElement===el),true);
      if(opened){assert.equal(await page.locator(target).evaluate(el=>el.matches(':open')),true);nativePickerChecks++;}
      await page.keyboard.press('Home');for(let n=0;n<1+i%3;n++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      assert.equal(await page.inputValue(target),['1','3','4'][i%3]);
      await page.locator(kind).click();
      const kindOpened=await page.locator(kind).evaluate(el=>CSS.supports('selector(select:open)')&&el.matches(':open'));
      await page.evaluate(()=>{for(let n=0;n<3;n++)__update();});await stable();
      if(kindOpened){assert.equal(await page.locator(kind).evaluate(el=>el.matches(':open')),true);nativePickerChecks++;}
      await page.keyboard.press('Home');if(i%2)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      await page.fill(text,'Mission '+i);await page.click(send);await page.waitForFunction(()=>__sent.length>0&&__card.pending);
      assert.equal(await page.locator(send).isDisabled(),true);assert.equal(await page.locator(target).isDisabled(),false);
      assert.equal(await page.locator(kind).isDisabled(),false);assert.equal(await page.locator(text).isDisabled(),false);
      if(i===0) {
        await page.fill(text,'My next draft');await page.selectOption(target,'4');
        await page.evaluate(()=>{__now=201000;__card.paint();});
        await page.click('[data-talk-action="retry"]');
        const sent=await page.evaluate(()=>__sent);assert.deepEqual(sent[1],sent[0]);
      }
      await page.evaluate(()=>{const command=__sent.at(-1);__mailbox=command;__talk.reply={id:command.id,error:''};__talk.crazy.myQueuedCount++;__update();});
      assert.equal(await page.inputValue(text),i===0?'My next draft':'');assert.equal(await page.locator(send).isDisabled(),false);await stable();
    }
    assert.equal(await page.evaluate(()=>__scrollCalls),0);
    await page.fill(text,'Keep this draft');
    await page.locator(text).evaluate(el=>{el.focus();el.setSelectionRange(4,8);});
    const scroll=await page.evaluate(()=>scrollY);
    await page.evaluate(()=>{__talk.crazy.prompt={id:'while-typing',text:'A fresh private task',kind:'task',status:'pending',expiresAt:800000};for(let n=0;n<6;n++)__update();});
    await stable();assert.equal(await page.locator(text).evaluate(el=>document.activeElement===el&&el.selectionStart===4&&el.selectionEnd===8),true);
    assert.equal(await page.evaluate(()=>scrollY),scroll);assert.equal(await page.evaluate(()=>__scrollCalls),0);
    await page.selectOption(target,'3');
    await page.evaluate(()=>{__talk.roster=[{playerNum:1,name:'Alex renamed'},{playerNum:2,name:'Sam'},{playerNum:4,name:'Lee'},{playerNum:5,name:'New friend'}];__update();});
    await stable();assert.equal(await page.inputValue(target),'random');assert.equal(await page.inputValue(text),'Keep this draft');
    assert.deepEqual(await page.locator(target).evaluate(el=>Array.from(el.options).map(o=>[o.value,o.textContent])),[['random','隨機玩家'],['1','Alex renamed'],['4','Lee'],['5','New friend']]);
    await page.click(send);
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:'queue_full'};__update();});
    assert.equal(await page.inputValue(text),'Keep this draft');assert.equal(await page.locator(send).isDisabled(),false);
    await page.selectOption(target,'5');await page.click(send);
    assert.equal(await page.evaluate(()=>__sent.at(-1).target),5);
    await page.locator(text).dispatchEvent('compositionstart');await page.fill(text,'雞叫');
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__update();});
    assert.equal(await page.inputValue(text),'雞叫');await page.locator(text).dispatchEvent('compositionend');await stable();
    await page.evaluate(()=>{__online=false;__card.paint();});assert.equal(await page.locator(target).isDisabled(),true);
    await page.evaluate(()=>{__online=true;__card.paint();});assert.equal(await page.locator(target).isDisabled(),false);
    await page.evaluate(()=>{__talk.crazy.canAssign=false;__update();});assert.equal(await page.locator(target).isDisabled(),true);
    await page.evaluate(()=>{__talk.crazy.canAssign=true;__talk.crazy.paused=true;__update();});assert.equal(await page.locator(target).isDisabled(),false);
    await page.locator(text).dispatchEvent('compositionstart');
    await page.evaluate(()=>{__talk.phase='ended';__update();});
    assert.equal(await page.locator('.talk-assignment').count(),0);
    await page.evaluate(()=>{__talk.sessionId='new-round';__talk.phase='thinking';__talk.turnId=0;__talk.reply=null;__talk.crazy.prompt=null;__update();});
    assert.equal(await page.inputValue(text),'');assert.equal(await page.inputValue(target),'random');
    assert.equal(await page.evaluate(()=>__refs.target===document.querySelector('[data-talk-assignment-field="target"]')),false);
    assert.equal(errors.length,0);
    assert.ok(nativePickerChecks>=5,'Native picker must open and stay open across state updates.');
    console.log(JSON.stringify({consecutiveSubmissions:5,nativePickerChecks,connectedSelectors:true,nextDraft:true,frozenRetry:true,queueErrorRetry:true,rosterChange:true,composition:true,offlineRecovery:true,endedRemoval:true,newSession:true,errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});

