
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
    await page.addScriptTag(base ? {url:base+'/talk-crazy.js?native-picker-regression=1'} : {path:path.resolve(__dirname,'../talk-crazy.js')});
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
      const composer=document.querySelector('.talk-assignment');if(!composer.open)throw Error('Composer must start expanded');
      window.__refs={composer,target:composer.querySelector('[data-talk-assignment-field="target"]'),
        text:composer.querySelector('textarea'),
        ancestors:[]};
      for(let n=__refs.target;n;n=n.parentNode)__refs.ancestors.push(n);
      window.__removed=0;
      new MutationObserver(records=>records.forEach(record=>record.removedNodes.forEach(node=>{
        if(node===__refs.target||node.contains?.(__refs.target))window.__removed++;
      }))).observe(document.getElementById('card'),{subtree:true,childList:true});
      window.__nativeOpen=CSS.supports('selector(select:open)');
    });
    const target='[data-talk-assignment-field="target"]',text='[data-talk-assignment-field="text"]',send='[data-talk-action="crazyAssign"]';
    const stable=async()=>assert.equal(await page.evaluate(()=>__refs.target===document.querySelector('[data-talk-assignment-field="target"]')&&
      __refs.text===document.querySelector('[data-talk-assignment-field="text"]')&&
      __refs.ancestors.every(n=>n.isConnected)&&__refs.composer.open&&__removed===0),true);
    let nativePickerChecks=0;
    await page.evaluate(()=>{__refs.composer.open=false;for(let n=0;n<3;n++)__update();});
    assert.equal(await page.locator('.talk-assignment').evaluate(el=>el.open),false);
    await page.locator('.talk-assignment>summary').click();await stable();
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
      await page.locator(target).click();
      const secondOpened=await page.locator(target).evaluate(el=>CSS.supports('selector(select:open)')&&el.matches(':open'));
      await page.evaluate(()=>{for(let n=0;n<3;n++)__update();});await stable();
      if(secondOpened){assert.equal(await page.locator(target).evaluate(el=>el.matches(':open')),true);nativePickerChecks++;}
      await page.keyboard.press('Escape');
      await page.fill(text,'Mission '+i);await page.click(send);await page.waitForFunction(()=>__sent.length>0&&__card.pending);
      assert.equal(await page.locator(send).isDisabled(),true);assert.equal(await page.locator(target).isDisabled(),false);
      assert.equal(await page.locator('[data-talk-assignment-field="kind"]').count(),0);assert.equal(await page.locator(text).isDisabled(),false);
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
    // A locally timed, authoritative check-in must not disturb the native
    // popup or a focused next draft when the projection has not arrived yet.
    await page.evaluate(()=>{__talk.crazy.prompt={id:'clock-check-in',text:'A quiet check-in card',kind:'task',status:'pending',
      renderVersion:1,rendered:true,reminder:true,checkIn:false,checkInAt:__now+1000,expiresAt:__now+11000};__update();});
    const here='[data-talk-action="crazyHere"]';
    assert.equal(await page.locator('[data-talk-check-in]').isVisible(),false);
    assert.equal(await page.locator('[data-talk-mission-reminder]').isVisible(),true);
    await page.locator(target).click();const checkInPicker=await page.locator(target).evaluate(el=>el.matches(':open'));
    await page.evaluate(()=>{__now+=1000;__card.paint();});await stable();
    assert.equal(await page.locator('[data-talk-check-in]').isVisible(),false);
    if(checkInPicker)assert.equal(await page.locator(target).evaluate(el=>el.matches(':open')),true);
    await page.keyboard.press('Escape');await page.locator(text).click();
    await page.fill(text,'Preserve the next draft');await page.locator(text).evaluate(el=>el.setSelectionRange(3,8));
    await page.evaluate(()=>__card.paint());
    assert.equal(await page.locator('[data-talk-check-in]').isVisible(),true);
    assert.equal(await page.locator('[data-talk-mission-reminder]').isVisible(),false);
    assert.equal(await page.locator(text).evaluate(el=>document.activeElement===el&&el.selectionStart===3&&el.selectionEnd===8),true);
    await page.click(here);assert.equal(await page.evaluate(()=>__sent.at(-1).type),'crazyHere');
    assert.equal(await page.evaluate(()=>__sent.at(-1).promptId),'clock-check-in');assert.equal(await page.evaluate(()=>__sent.at(-1).renderVersion),1);
    const checkInExpiry=await page.evaluate(()=>__talk.crazy.prompt.expiresAt);
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.prompt.checkInAt=0;__talk.crazy.prompt.checkIn=false;__update();});
    assert.equal(await page.locator('[data-talk-check-in]').isVisible(),false);assert.equal(await page.inputValue(text),'Preserve the next draft');
    assert.equal(await page.evaluate(()=>__talk.crazy.prompt.expiresAt),checkInExpiry);await stable();
    // Keep the actual pressed/focused mission control through render ACK,
    // reminder and check-in publications, including a press spanning update.
    await page.evaluate(()=>{__talk.crazy.roundStage='open';__talk.crazy.prompt={id:'focused-check-in',text:'Keep this mission button connected',kind:'task',status:'pending',
      renderVersion:1,rendered:false,reminder:false,checkIn:false,checkInAt:0,expiresAt:__now+150000};__update();});
    const skip='[data-talk-action="crazySkip"]';
    await page.locator(skip).focus();
    await page.evaluate(()=>{window.__focusedSkip=document.activeElement;});
    assert.equal(await page.locator('[data-talk-check-in]').count(),1,'check-in row exists before technical render ACK');
    for(const update of [{rendered:true,checkInAt:342000},{reminder:true},{checkIn:true}]) {
      await page.evaluate(update=>{Object.assign(__talk.crazy.prompt,update);if(update.checkIn)__now=342000;__update();},update);
      assert.equal(await page.evaluate(()=>__focusedSkip.isConnected&&document.activeElement===__focusedSkip&&__focusedSkip===document.querySelector('[data-talk-action="crazySkip"]')),true);
    }
    assert.equal(await page.locator('[data-talk-check-in]').isVisible(),true);
    assert.equal(await page.locator('[data-talk-mission-reminder]').isVisible(),false);
    // Blur to the retained composer flushes safely without stealing its caret.
    await page.locator(text).click();await page.locator(text).evaluate(el=>el.setSelectionRange(2,7));
    assert.equal(await page.locator(text).evaluate(el=>document.activeElement===el&&el.selectionStart===2&&el.selectionEnd===7),true);
    await page.locator(skip).scrollIntoViewIfNeeded();const skipBox=await page.locator(skip).boundingBox();
    await page.mouse.move(skipBox.x+skipBox.width/2,skipBox.y+skipBox.height/2);await page.mouse.down();
    await page.evaluate(()=>{window.__pressedSkip=document.activeElement;__talk.revision++;__update();});
    assert.equal(await page.evaluate(()=>__pressedSkip.isConnected&&document.activeElement===__pressedSkip&&__pressedSkip===document.querySelector('[data-talk-action="crazySkip"]')),true);
    const pressedCount=await page.evaluate(()=>__sent.length);await page.mouse.up();
    await page.waitForFunction(count=>__sent.length===count+1,pressedCount);
    assert.equal(await page.evaluate(()=>__sent.at(-1).type),'crazySkip');
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.prompt.status='skipped';__update();delete __talk.crazy.roundStage;});
    // The first control click after dismissing a picker must survive blur.
    for(const action of ['crazyDone','crazySkip','crazyHere']) {
      await page.evaluate(action=>{__talk.crazy.prompt={id:'direct-'+action,text:'First click mission',kind:'task',status:'pending',expiresAt:800000,checkIn:action==='crazyHere',renderVersion:1};__update();},action);
      const before=await page.evaluate(()=>__sent.length);
      await page.locator(target).click();await page.keyboard.press('Escape');
      await page.click('[data-talk-action="'+action+'"]');
      assert.equal(await page.evaluate(()=>__sent.length),before+1);
      assert.equal(await page.evaluate(()=>__sent.at(-1).type),action);
      await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.prompt.status='done';__talk.crazy.prompt.checkIn=false;__update();});
    }
    await page.evaluate(()=>{__talk.sharedControls=true;__talk.hostControls=true;__talk.actions={newTopic:true,extend:true};__talk.topic.followUps=[{question:'Which dish should we serve?'}];__update();});
    await page.locator(target).click();await page.keyboard.press('Escape');
    await page.locator('.talk-management>summary').click();
    assert.equal(await page.locator('.talk-management').evaluate(el=>el.open),true);
    await page.evaluate(()=>__update());assert.equal(await page.locator('.talk-management').evaluate(el=>el.open),true);
    await page.locator(target).click();await page.keyboard.press('Escape');
    await page.locator(text).click();
    assert.equal(await page.locator(text).evaluate(el=>document.activeElement===el),true);
    await page.fill(text,'Keep this draft');
    const scrollCallsBeforeTyping=await page.evaluate(()=>__scrollCalls);
    await page.locator(text).evaluate(el=>{el.focus();el.setSelectionRange(4,8);});
    await page.evaluate(()=>{__talk.crazy.prompt={id:'while-typing',text:'A fresh private task',kind:'task',status:'pending',expiresAt:800000};for(let n=0;n<6;n++)__update();});
    await stable();assert.equal(await page.locator(text).evaluate(el=>document.activeElement===el&&el.selectionStart===4&&el.selectionEnd===8),true);
    assert.equal(await page.evaluate(()=>__scrollCalls),scrollCallsBeforeTyping);
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
    // Vault editors must stay open with the same focused textarea and caret
    // while other players publish, including an unfinished Chinese IME draft.
    await page.evaluate(()=>{__talk.phase='talking';__talk.crazy={...__talk.crazy,roundStage:'open',queueLocked:false,role:'player',playStyle:'free',effectivePlayStyle:'free',receiverStatus:{paused:false},library:[{id:'saved-1',text:'Original saved challenge',target:null}]};__update();});
    await page.locator('.talk-private-library>summary').click();
    assert.equal(await page.locator('[data-talk-saved-card="saved-1"] textarea').count(),1);
    const savedText='[data-talk-library-field="saved-1"]';
    const savedTarget='[data-talk-library-target="saved-1"]';
    await page.locator(savedTarget).scrollIntoViewIfNeeded();await page.locator(savedTarget).click();
    const privatePickerOpen=await page.locator(savedTarget).evaluate(el=>el.matches(':open'));
    await page.locator(savedTarget).evaluate(el=>{window.__privatePicker=el;window.__privateOptions=Array.from(el.options);window.__privateY=el.getBoundingClientRect().y;});
    await page.evaluate(()=>{__talk.crazy.returnedCards=[{id:'arrival-above-library',text:'A return arriving above the picker.'}];for(let n=0;n<5;n++)__update();});
    assert.equal(await page.locator(savedTarget).evaluate(el=>el===__privatePicker&&el.isConnected&&document.activeElement===el&&el.getBoundingClientRect().y===__privateY&&__privateOptions.every((node,i)=>el.options[i]===node)),true);
    if(privatePickerOpen)assert.equal(await page.locator(savedTarget).evaluate(el=>el.matches(':open')),true);
    await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.inputValue(savedTarget),'1');
    assert.equal(await page.locator('[data-talk-return-card="arrival-above-library"]').count(),1);
    await page.fill(savedText,'An edited private challenge');
    await page.locator(savedTarget).click();await page.evaluate(()=>{__talk.crazy.returnedCards.push({id:'another-arrival',text:'Another return before the first Send click.'});__update();});await page.keyboard.press('Escape');
    const beforePrivateSend=await page.evaluate(()=>__sent.length);await page.click('[data-talk-action="crazyLibrarySend"]');
    assert.equal(await page.evaluate(()=>__sent.length),beforePrivateSend+1);assert.equal(await page.evaluate(()=>__sent.at(-1).target),1);assert.equal(await page.evaluate(()=>__sent.at(-1).text),'An edited private challenge');
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.library[0].text=__sent.at(-1).text;__update();});
    await page.locator(savedText).evaluate(el=>{window.__savedEditor=el;el.focus();el.setSelectionRange(3,9);});
    await page.evaluate(()=>{for(let n=0;n<12;n++){__talk.revision++;__update();}});
    assert.equal(await page.locator('.talk-private-library').evaluate(el=>el.open),true);
    assert.equal(await page.locator(savedText).evaluate(el=>el===__savedEditor&&document.activeElement===el&&el.selectionStart===3&&el.selectionEnd===9),true);
    assert.equal(await page.locator('[data-talk-action="crazyLibraryUpdate"]').isVisible(),true);
    await page.locator(savedText).dispatchEvent('compositionstart');await page.fill(savedText,'雞叫任務');
    await page.evaluate(()=>{for(let n=0;n<6;n++)__update();});
    assert.equal(await page.inputValue(savedText),'雞叫任務');
    assert.equal(await page.locator(savedText).evaluate(el=>el===__savedEditor&&document.activeElement===el),true);
    await page.locator(savedText).dispatchEvent('compositionend');
    await page.click('[data-talk-action="crazyLibraryUpdate"]');
    assert.equal(await page.evaluate(()=>__sent.at(-1).type),'crazyLibraryUpdate');
    assert.equal(await page.evaluate(()=>__sent.at(-1).text),'雞叫任務');
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.library[0].text='雞叫任務';__update();});
    assert.equal(await page.locator('.talk-private-library').evaluate(el=>el.open),true);
    // Sorting may move an acknowledged return into the normal vault, but an
    // in-progress private IME editor must not detach until composition ends.
    await page.evaluate(()=>{__talk.phase='ended';__talk.crazy.roundStage='sorting';__talk.crazy.queueLocked=true;__talk.crazy.library=[];__talk.crazy.returnedCards=[{id:'ended-ime-return',text:'A private returned task.',version:1}];__update();});
    const returnField='[data-talk-return-card="ended-ime-return"] textarea';await page.fill(returnField,'儲存前的任務');
    await page.click('[data-talk-action="crazyReturnSave"]');await page.locator(returnField).dispatchEvent('compositionstart');await page.fill(returnField,'尚未選字的新草稿');
    await page.locator(returnField).evaluate(el=>{window.__returnIME=el;window.__returnRemoved=0;new MutationObserver(records=>records.forEach(record=>record.removedNodes.forEach(node=>{if(node===__returnIME||node.contains?.(__returnIME))__returnRemoved++;}))).observe(document.getElementById('card'),{subtree:true,childList:true});});
    await page.evaluate(()=>{__talk.reply={id:__sent.at(-1).id,error:''};__talk.crazy.returnedCards=[];__talk.crazy.library=[{id:'ended-ime-return',text:'儲存前的任務',version:2}];__update();});
    assert.equal(await page.evaluate(()=>__returnIME.isConnected&&document.activeElement===__returnIME&&__card.composing&&__returnRemoved===0),true);
    await page.locator(returnField).dispatchEvent('compositionend');
    assert.equal(await page.locator('[data-talk-library-field="ended-ime-return"]').evaluate(el=>el===__returnIME&&document.activeElement===el&&el.value==='尚未選字的新草稿'),true);
    assert.equal(errors.length,0);
    assert.ok(nativePickerChecks>=5,'Native picker must open and stay open across state updates.');
    console.log(JSON.stringify({consecutiveSubmissions:5,nativePickerChecks,connectedSelectors:true,defaultOpen:true,manualCollapse:true,checkInLocalPaint:true,checkInNoFocusTheft:true,checkInFirstClick:true,focusedMissionNode:true,pressedMissionFirstClick:true,preAckCheckInRow:true,nextDraft:true,frozenRetry:true,queueErrorRetry:true,rosterChange:true,composition:true,offlineRecovery:true,endedRemoval:true,newSession:true,firstControlClick:true,firstSummaryClick:true,vaultEditorUpdates:18,vaultCaret:true,vaultIME:true,vaultSave:true,privatePickerArrival:true,privatePickerFirstSend:true,returnedSortingIME:true,errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});

