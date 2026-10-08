'use strict';
// Opt-in browser UI check. Only the explicitly labelled synthetic demo is used;
// no room, player credential, Firebase write or existing browser profile is used.
const assert=require('node:assert/strict'),path=require('node:path');
const deck=require('../once-upon-a-time-deck.js'),ui=require('../once-upon-a-time-ui.js');
const engine=require('../once-upon-a-time-engine.js');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=(process.env.ONCE_UI_BASE||'http://127.0.0.1:8095/').replace(/\/?$/,'/');
const proof=process.env.ONCE_UI_PROOF_DIR;
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.ONCE_UI_BROWSER||'chrome'});
  const reports=[];
  try{
    for(const [width,height] of [[320,667],[375,812],[390,844],[800,900],[1280,800]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[],roomTraffic=[];
      page.on('pageerror',error=>errors.push(error.message));
      const roomEndpoint=/https:\/\/[^/]+\.(?:firebaseio\.com|firebasedatabase\.app)\//;
      page.on('request',request=>{if(roomEndpoint.test(request.url()))roomTraffic.push(request.url());});
      await page.route(roomEndpoint,route=>route.abort());
      await page.goto(base+'once-upon-a-time.html?demo=1',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Choose first Storyteller',exact:true}).click();
      await page.locator('#once-demo-view').selectOption('1');
      for(let i=0;i<5;i++){
        await page.locator('.once-hand [data-once-card]').first().click();
        await page.getByRole('button',{name:'Play card',exact:true}).click();
      }
      assert.equal(await page.locator('.once-history-latest .once-history-item').count(),4);
      assert.equal(await page.locator('[aria-current="step"]').count(),1);
      assert.match(await page.locator('.is-current .once-history-number').innerText(),/^5 · /);
      assert.equal(await page.locator('.once-ending-dock').getAttribute('open'),'','Ending is visible by default at every size');
      assert.equal(await page.getByRole('button',{name:'Continue story',exact:true}).count(),0);
      const geometry=await page.evaluate(()=>{
        const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width,left:r.left};};
        const latest=document.querySelector('.once-history-latest');
        const storyCards=[...latest.querySelectorAll('.once-card')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height};});
        return {story:box('.once-history-panel'),hand:box('.once-hand-panel'),ending:box('.once-ending-dock'),endingCard:box('.once-ending-dock .once-card'),handCard:box('.once-hand .once-card'),storyCards,storyNumbers:[...latest.querySelectorAll('.once-history-number')].map(el=>parseInt(el.textContent,10)),overflow:document.documentElement.scrollWidth>innerWidth,tableOverflow:latest.scrollWidth>latest.clientWidth+1,titlesFit:[...latest.querySelectorAll('.once-card-title')].every(el=>el.scrollHeight<=el.clientHeight+1),fourVisible:[...latest.querySelectorAll('.once-card')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})};
      });
      assert.equal(geometry.overflow,false);assert.equal(geometry.tableOverflow,false);
      assert.equal(geometry.titlesFit,true);assert.equal(geometry.fourVisible,true);
      assert.deepEqual(geometry.storyNumbers,[2,3,4,5],'latest four keep chronological story numbers');
      assert.ok(geometry.endingCard.height>0,'default-open Ending actually occupies visible layout');
      assert.equal(Math.round(geometry.handCard.height),224,'hand portrait size is unchanged');
      assert.ok(geometry.hand.top-geometry.story.bottom<=13,'hand directly follows Story');
      if(width<=760){
        const [a,b,c,d]=geometry.storyCards;
        assert.ok(geometry.storyCards.every(card=>card.height>card.width&&Math.round(card.height)===200),'all phone Story cards are upright 200px portraits');
        assert.ok(Math.abs(a.top-b.top)<=1&&a.left<b.left&&c.top>a.top&&Math.abs(c.top-d.top)<=1&&c.left<d.left,'phone portraits appear left-to-right, then top-to-bottom');
        assert.ok(geometry.story.height<640,'phone latest four use compact portrait rows');
      }
      if(width<=1000)assert.ok(geometry.ending.top>=geometry.hand.bottom,'Ending does not separate Story and hand');
      else assert.ok(geometry.ending.left>geometry.story.left,'desktop Ending remains beside Story');
      reports.push({width,height,...geometry});
      if(proof&&(width===375||width===1280))await page.screenshot({path:path.join(proof,'once-mobile-'+width+'.png'),fullPage:true});
      const selected=await page.locator('.once-hand [aria-pressed="true"]').count();
      await page.getByRole('button',{name:'Your ending',exact:true}).click();
      assert.equal(await page.locator('.once-ending-dock').getAttribute('open'),'');
      assert.equal(await page.locator('.once-hand [aria-pressed="true"]').count(),selected);
      await page.locator('.once-ending-dock > summary').click();
      assert.equal(await page.locator('.once-ending-dock').getAttribute('open'),null);
      await page.locator('[data-once-action="toggleHistory"]').click();
      assert.equal(await page.locator('.once-history-older .once-history-item').count(),1);
      assert.equal(await page.locator('[aria-current="step"]').count(),1);
      await page.locator('[data-once-action="toggleHistory"]').click();
      while(await page.locator('.once-hand [data-once-card]').count()){
        await page.locator('.once-hand [data-once-card]').first().click();
        await page.getByRole('button',{name:'Play card',exact:true}).click();
      }
      assert.equal(await page.locator('.once-ending-dock').getAttribute('open'),'','last Story play opens Ending once');
      await page.locator('.once-ending-dock [data-once-card]').click();
      await page.getByRole('button',{name:'Play ending',exact:true}).click();
      await page.getByRole('button',{name:'Confirm',exact:true}).click();
      for(const seat of ['2','3','4']){
        await page.locator('#once-demo-view').selectOption(seat);
        await page.getByRole('button',{name:'Accept ending',exact:true}).click();
      }
      assert.match(await page.locator('.once-winner').innerText(),/Alex finished the story!/);
      assert.deepEqual(errors,[],'no browser script errors');
      assert.deepEqual(roomTraffic,[],'demo never attempts a room connection');
      await context.close();
    }
    // Independent, explicitly synthetic DOM fixture. Repeated lease/revision
    // updates and local selection must not rebuild already visible artwork.
    const stabilityContext=await browser.newContext({viewport:{width:375,height:812}});
    try{
      const page=await stabilityContext.newPage();
      await page.route(/https:\/\/[^/]+\.(?:firebaseio\.com|firebasedatabase\.app)\//,route=>route.abort());
      await page.goto(base+'once-upon-a-time.html?demo=1',{waitUntil:'domcontentloaded'});
      let state=engine.create({id:'once-browser-stability-fixture',roster:[1,2,3,4].map(playerNum=>({playerNum,name:'Synthetic '+playerNum})),seed:713,now:1000});
      state=engine.apply(state,{id:'synthetic-deal',sessionId:state.sessionId,turnId:state.turnId,type:'deal',actor:0,seed:891,now:2000});
      state=engine.apply(state,{id:'synthetic-first',sessionId:state.sessionId,turnId:state.turnId,type:'chooseFirst',actor:0,playerNum:1,now:3000});
      for(let index=0;index<2;index++)state=engine.apply(state,{id:'synthetic-history-'+index,sessionId:state.sessionId,turnId:state.turnId,type:'play',actor:1,cardId:state.hands[1][0],now:4000+index});
      const played=engine.apply(state,{id:'synthetic-next-play',sessionId:state.sessionId,turnId:state.turnId,type:'play',actor:1,cardId:state.hands[1][0],now:5000});
      let fresh=engine.create({id:'once-browser-fresh-session',roster:[1,2,3,4].map(playerNum=>({playerNum,name:'Synthetic '+playerNum})),seed:976,now:6000});
      fresh=engine.apply(fresh,{id:'synthetic-fresh-deal',sessionId:fresh.sessionId,turnId:fresh.turnId,type:'deal',actor:0,seed:491,now:7000});
      const stability=await page.evaluate(async projections=>{
        const data=projections.initial;
        const fixture=document.createElement('div');fixture.id='once-synthetic-image-stability';document.body.appendChild(fixture);
        const component=new ONCE_UI.Card(fixture,{now:()=>3000,send:async()=>{}});component.update(data);
        const images=[...fixture.querySelectorAll('img')],cards=[...fixture.querySelectorAll('.once-card')];
        // Load all fixture images, even those below the demo's visible viewport.
        // This affects only this disposable test fixture, not game behavior.
        images.forEach(img=>{img.loading='eager';});
        await Promise.all(images.map(img=>img.decode().catch(()=>{})));
        let imageNodeChanges=0,imageSourceChanges=0;
        const observer=new MutationObserver(records=>{
          for(const record of records){
            if(record.type==='attributes'&&record.target.tagName==='IMG')imageSourceChanges++;
            for(const node of [...record.addedNodes,...record.removedNodes]){
              if(node.nodeType===1)imageNodeChanges+=(node.tagName==='IMG'?1:0)+(node.querySelectorAll?.('img').length||0);
            }
          }
        });
        observer.observe(fixture,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});
        for(let index=0;index<20;index++)component.update({...data,once:{...data.once,revision:data.once.revision+index,hostLiveUntil:10000+index}});
        fixture.querySelector('.once-hand [data-once-card]').click();
        const selected=!!fixture.querySelector('.once-hand [aria-pressed="true"]');
        component.update({...data,once:{...data.once,hostLiveUntil:2000}});
        const expired=fixture.querySelector('.once-connection').textContent;
        component.update({...data,once:{...data.once,hostLiveUntil:20000}});
        const renewed=fixture.querySelector('.once-connection').textContent;
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const liveImages=[...fixture.querySelectorAll('img')],liveCards=[...fixture.querySelectorAll('.once-card')];
        const result={imageCount:images.length,cardCount:cards.length,imagesLoaded:images.every(img=>img.complete&&img.naturalWidth>0),imagesRetained:images.length===liveImages.length&&images.every((img,index)=>img===liveImages[index]),cardsRetained:cards.length===liveCards.length&&cards.every((card,index)=>card===liveCards[index]),imageNodeChanges,imageSourceChanges,selected,leaseStatusUpdates:expired!==renewed};
        observer.disconnect();
        const priorHand=new Map([...fixture.querySelectorAll('.once-hand [data-once-card]')].map(card=>[card.dataset.onceCard,card]));
        const priorHistoryImages=[...fixture.querySelectorAll('.once-history-latest img')];
        component.update(projections.played);
        const unchangedHand=[...fixture.querySelectorAll('.once-hand [data-once-card]')];
        result.unplayedHandRetained=unchangedHand.length===priorHand.size-1&&unchangedHand.every(card=>priorHand.get(card.dataset.onceCard)===card);
        const afterHistoryImages=[...fixture.querySelectorAll('.once-history-latest img')];
        result.previousStoryImagesRetained=priorHistoryImages.every((img,index)=>afterHistoryImages[index]===img);
        result.newPlayVisible=fixture.querySelectorAll('.once-history-latest .once-history-item').length===3;
        const privateBeforeSeat=[...fixture.querySelectorAll('.once-hand [data-once-card],.once-ending-dock [data-once-card]')];
        component.update(projections.changedSeat);
        result.oldSeatPrivateCardsCleared=privateBeforeSeat.every(card=>!card.isConnected);
        const privateBeforeSession=[...fixture.querySelectorAll('.once-hand [data-once-card],.once-ending-dock [data-once-card]')];
        component.update(projections.fresh);
        result.oldSessionPrivateCardsCleared=privateBeforeSession.every(card=>!card.isConnected);
        component.destroy();fixture.remove();return result;
      },{initial:engine.view(state,1,3000),played:engine.view(played,1,5000),changedSeat:engine.view(played,2,5000),fresh:engine.view(fresh,2,7000)});
      assert.ok(stability.imageCount>0&&stability.cardCount>0,'synthetic stability fixture has actual card images');
      assert.equal(stability.imagesLoaded,true,'the retained image nodes contain fully loaded artwork');
      assert.equal(stability.imagesRetained,true,'heartbeats and selection retain loaded image nodes');
      assert.equal(stability.cardsRetained,true,'heartbeats and selection retain card nodes');
      assert.equal(stability.imageNodeChanges,0,'no artwork is removed/reinserted by heartbeats or selection');
      assert.equal(stability.imageSourceChanges,0,'unchanged artwork src is never rewritten');
      assert.equal(stability.selected,true,'card selection still visibly highlights');
      assert.equal(stability.leaseStatusUpdates,true,'host connection status still responds to lease updates');
      assert.equal(stability.unplayedHandRetained,true,'a genuine play retains every untouched private hand card');
      assert.equal(stability.previousStoryImagesRetained,true,'a genuine play retains earlier visible Story images');
      assert.equal(stability.newPlayVisible,true,'the genuine next play still appears on the table');
      assert.equal(stability.oldSeatPrivateCardsCleared,true,'changing synthetic seat removes the old private card DOM');
      assert.equal(stability.oldSessionPrivateCardsCleared,true,'a new session removes old private card DOM');
      console.log('ONCE IMAGE STABILITY: '+JSON.stringify(stability));
    }finally{await stabilityContext.close();}
    // All public vocabulary/art is tested for text fit, not just the dealt sample.
    // A standalone rendered fixture contains no private or authoritative state.
    for(const width of [320,375]){
      const context=await browser.newContext({viewport:{width,height:812}}),page=await context.newPage();
      const cards=deck.storyCards.map(c=>'<div class="once-history-item">'+ui.cardHTML(c,'history')+'</div>').join('');
      const endings=deck.endingCards.map(c=>'<details class="once-panel once-ending-dock" open><summary>Your ending</summary><div class="once-ending-content">'+ui.cardHTML(c,'ending')+'</div></details>').join('');
      await page.setContent('<!doctype html><html><head><base href="'+base+'"><link rel="stylesheet" href="shared.css"><link rel="stylesheet" href="once-upon-a-time.css"></head><body class="once-card-page"><div id="content"><div class="once-game once-game--reference"><div class="once-panel"><div class="once-history once-history-latest">'+cards+'</div></div>'+endings+'</div></div></body></html>',{waitUntil:'load'});
      const clipped=await page.locator('.once-card-title').evaluateAll(elements=>elements.filter(el=>el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
      assert.deepEqual(clipped,[],width+'px: all '+deck.storyCards.length+' Story titles and '+deck.endingCards.length+' Ending sentences fit');
      await context.close();
    }
    console.log(JSON.stringify(reports.map(r=>({width:r.width,height:r.height,storyHeight:r.story.height,storyToHandGap:r.hand.top-r.story.bottom,handCard:[r.handCard.width,r.handCard.height],overflow:r.overflow})),null,2));
    console.log('ONCE BROWSER UI: 5 viewport layouts, portrait chronological phone tables, default-visible Endings, 5 complete synthetic games, all'+(deck.storyCards.length+deck.endingCards.length)+' card texts at320/375px passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
