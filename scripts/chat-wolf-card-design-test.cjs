'use strict';
// Isolated Chrome + public original artwork + local synthetic projections only.
// This does not access Firebase, use a player credential or write a live room.
const assert=require('node:assert/strict'),path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(__dirname,'..');
const proof=process.env.CHAT_WOLF_UI_PROOF_DIR;
const preview=spawn(process.execPath,[path.join(root,'scripts/chat-wolf-ui-preview.cjs')],{
  cwd:root,env:{...process.env,CHAT_WOLF_UI_PREVIEW_PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true,
});
const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Local synthetic preview did not start')),15000);
  let output='';
  preview.stdout.on('data',data=>{
    output+=data;
    const url=output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
    if(url){clearTimeout(timer);resolve(url);}
  });
  preview.stderr.on('data',data=>{output+=data;});
  preview.once('exit',code=>{clearTimeout(timer);reject(new Error('Local preview exited '+code+': '+output));});
});
(async()=>{
  let browser;
  const reports=[];
  try{
    const base=await ready;
    browser=await chromium.launch({headless:true,channel:process.env.CHAT_WOLF_UI_BROWSER||'chrome'});
    for(const [width,height] of [[320,667],[375,812],[390,844],[800,900],[1280,800]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[],remote=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{
        const url=route.request().url();
        if(url.startsWith(base)||url.startsWith('data:'))return route.continue();
        remote.push(url);return route.abort();
      });
      for(const [role,art] of [['DIRECTOR','wolf'],['JESTER','jester'],['VILLAGER','villager']]){
        await page.goto(base+'?role='+role+'&planning=1',{waitUntil:'load'});
        const img=page.locator('[data-wolf-role-art]');
        assert.equal(await img.count(),1,role+' has its own portrait only');
        await img.evaluate(async image=>{if(!image.complete)await new Promise(resolve=>image.addEventListener('load',resolve,{once:true}));});
        assert.equal(await img.evaluate(image=>image.complete&&image.naturalWidth>0),true,art+' portrait loaded');
        assert.match(await img.getAttribute('src'),new RegExp('/'+art+'-v1\\.webp$'));
        const geometry=await page.evaluate(()=>{
          const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
          const box=selector=>rect(document.querySelector(selector));
          const task=document.querySelector('.v7-task-actions');
          return {overflow:document.documentElement.scrollWidth>innerWidth+1,
            image:box('[data-wolf-role-art]'),hero:box('.v4-role-header'),topic:box('.v4-topic-full'),
            primary:task?rect(task.querySelector(':scope > .btn')):null,
            support:task?rect(task.querySelector('.v7-task-support')):null,
            taskVisibility:[...document.querySelectorAll('[data-player-task] .task-condition')].every(el=>el.getBoundingClientRect().height>0)};
        });
        assert.equal(geometry.overflow,false,width+' '+role+' has no sideways scrolling');
        assert.equal(geometry.taskVisibility,true,'task instructions stay expanded');
        assert.ok(geometry.image.height>geometry.image.width,'portrait is upright');
        assert.ok(geometry.hero.bottom<=geometry.topic.top+1,'role and question keep their reading order');
        if(geometry.primary){
          assert.ok(geometry.primary.height>=44,'completion button is a full tap target');
          assert.ok(geometry.primary.right<=geometry.support.left+1,'completion left, quiet cooperation right');
        }
        if(proof&&width===390)await page.screenshot({path:path.join(proof,'chat-wolf-'+art+'-phone.png'),fullPage:true});
      }
      await page.goto(base+'?role=DIRECTOR&planning=1',{waitUntil:'load'});
      const stable=await page.evaluate(()=>{
        const original=document.querySelector('[data-wolf-role-art]');
        for(let i=0;i<20;i++){
          state.public.revision=(state.public.revision||0)+1;
          state.public.serverNow=(state.public.serverNow||0)+500;
          if(state.private.tasks[0])state.private.tasks[0].volunteerIds=i%2?[state.private.playerId]:[];
          ui.mount(document.querySelector('#app'));
          if(document.querySelector('[data-wolf-role-art]')!==original)return false;
        }
        const app=document.querySelector('#app');
        state.private.playerId='different-synthetic-seat';ui.mount(app);
        const second=document.querySelector('[data-wolf-role-art]');
        if(second===original)return false;
        state.public.matchId='different-synthetic-match';ui.mount(app);
        return document.querySelector('[data-wolf-role-art]')!==second;
      });
      assert.equal(stable,true,'receipt/cooperation updates preserve images; a different player or match does not');
      await page.goto(base+'?role=HOST',{waitUntil:'load'});
      assert.equal(await page.locator('[data-wolf-role-art]').count(),0,'host never mounts a private role portrait');
      await page.goto(base+'?role=TARGET',{waitUntil:'load'});
      assert.equal(await page.locator('[role="dialog"][aria-modal="true"]').count(),1,'Director direction stays central');
      assert.equal(await page.locator('[data-direction-notice-close]').count(),0,'pending direction cannot be casually dismissed');
      assert.equal(await page.locator('[role="dialog"] [data-v3-action="completeDirection"]').count(),1);
      assert.equal(errors.length,0,errors.join('\n'));assert.equal(remote.length,0,'local visual test has no external room traffic');
      reports.push({width,height,roles:3,stableUpdates:20,hostPrivateArt:false,directorPopup:true});
      await context.close();
    }
    console.log(JSON.stringify({status:'passed',syntheticOnly:true,physicalDevicesTested:false,reports},null,2));
  }finally{
    if(browser)await browser.close();preview.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
