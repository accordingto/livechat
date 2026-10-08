'use strict';
// Opt-in browser UI check. Only the explicitly labelled synthetic demo is used;
// no room, player credential, Firebase write or existing browser profile is used.
const assert=require('node:assert/strict'),path=require('node:path');
const deck=require('../once-upon-a-time-deck.js'),ui=require('../once-upon-a-time-ui.js');
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
      assert.equal(await page.locator('.once-ending-dock').getAttribute('open'),width>1000?'':null);
      assert.equal(await page.getByRole('button',{name:'Continue story',exact:true}).count(),0);
      const geometry=await page.evaluate(()=>{
        const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width,left:r.left};};
        const latest=document.querySelector('.once-history-latest');
        return {story:box('.once-history-panel'),hand:box('.once-hand-panel'),ending:box('.once-ending-dock'),handCard:box('.once-hand .once-card'),overflow:document.documentElement.scrollWidth>innerWidth,tableOverflow:latest.scrollWidth>latest.clientWidth+1,titlesFit:[...latest.querySelectorAll('.once-card-title')].every(el=>el.scrollHeight<=el.clientHeight+1),fourVisible:[...latest.querySelectorAll('.once-card')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})};
      });
      assert.equal(geometry.overflow,false);assert.equal(geometry.tableOverflow,false);
      assert.equal(geometry.titlesFit,true);assert.equal(geometry.fourVisible,true);
      assert.equal(Math.round(geometry.handCard.height),224,'hand portrait size is unchanged');
      assert.ok(geometry.hand.top-geometry.story.bottom<=13,'hand directly follows Story');
      if(width<=760)assert.ok(geometry.story.height<400,'phone latest four are compact, not two tall portrait rows');
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
    // All public vocabulary/art is tested for text fit, not just the dealt sample.
    // A standalone rendered fixture contains no private or authoritative state.
    for(const width of [320,375]){
      const context=await browser.newContext({viewport:{width,height:812}}),page=await context.newPage();
      const cards=deck.storyCards.map(c=>'<div class="once-history-item">'+ui.cardHTML(c,'history')+'</div>').join('');
      const endings=deck.endingCards.map(c=>'<details class="once-panel once-ending-dock" open><summary>Your ending</summary><div class="once-ending-content">'+ui.cardHTML(c,'ending')+'</div></details>').join('');
      await page.setContent('<!doctype html><html><head><base href="'+base+'"><link rel="stylesheet" href="shared.css"><link rel="stylesheet" href="once-upon-a-time.css"></head><body class="once-card-page"><div id="content"><div class="once-game once-game--reference"><div class="once-panel"><div class="once-history once-history-latest">'+cards+'</div></div>'+endings+'</div></div></body></html>',{waitUntil:'load'});
      const clipped=await page.locator('.once-card-title').evaluateAll(elements=>elements.filter(el=>el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
      assert.deepEqual(clipped,[],width+'px: all 114 Story titles and 51 Ending sentences fit');
      await context.close();
    }
    console.log(JSON.stringify(reports.map(r=>({width:r.width,height:r.height,storyHeight:r.story.height,storyToHandGap:r.hand.top-r.story.bottom,handCard:[r.handCard.width,r.handCard.height],overflow:r.overflow})),null,2));
    console.log('ONCE BROWSER UI: 5 viewport layouts, 5 complete synthetic games, all165 card texts at320/375px passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
