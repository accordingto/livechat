(function(){
  'use strict';
  const byId=id=>document.getElementById(id),t=DIXIT_UI.t,demo=new URLSearchParams(location.search).get('demo')==='1';
  I18N.registerDict('dixitHost',{
    seat:{zh:'HOST 是哪位玩家？',en:'Which player is the host?'},
    seatHint:{zh:'這位玩家可以在自己的卡片發牌、揭曉與換下一輪。',en:'This player can deal, reveal and start the next round from their own card.'},
    ownCard:{zh:'開啟我的 HOST 玩家卡片',en:'Open my host player card'},
    room:{zh:'房間 {code} · {n} 人',en:'Room {code} · {n} players'},
    hostCardActive:{zh:'HOST 玩家卡片正在同步遊戲。',en:'Your host player card is keeping the game in sync.'},
    targetScore:{zh:'勝利分數',en:'Winning score'},
    targetHint:{zh:'5–100 分；這輪結束時達標，以最高分獲勝。預設 30 分。',en:'5–100 points; the highest score wins when the target is reached at round end. Default: 30.'},
    invalidTarget:{zh:'請輸入 5–100 的整數勝利分數。',en:'Enter a whole-number winning score from 5 to 100.'},
    switchHint:{zh:'玩家目前在其他遊戲。按「開啟這桌遊戲」即可把原玩家卡片切換過來。',en:'Players are in another game. Open this table to switch their existing cards to Dixit.'},
  });
  const ht=(key,params={})=>I18N.t('dixitHost',key).replace(/\{(\w+)\}/g,(_,name)=>params[name]??'');
  let sync=null,card=null,payload=null,state=null,status='loading',busy=false,problem='',demoTimer=null;
  const requested=Number(new URLSearchParams(location.search).get('players')),count=[3,4,5,6,7,8].includes(requested)?requested:4;
  const roster=['Alex','Jamie','Sam','Riley','Taylor','Robin','Morgan','Casey'].slice(0,count).map((name,i)=>({playerNum:i+1,name}));
  const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0],demoView=()=>Number(byId('dx-demo-view').value);
  const validTarget=value=>Number.isInteger(Number(value))&&Number(value)>=5&&Number(value)<=100;
  const canOpen=()=>demo||!!(sync?.connected&&sync.own&&['ready','switched'].includes(status));
  function targetScore(){const value=Number(byId('dx-target-score').value);if(!validTarget(value))throw new Error('invalid_target_score');return value;}
  function setSeats(players,selected){
    byId('dx-host-seat').innerHTML=players.map(p=>'<option value="'+p.playerNum+'">'+DIXIT_UI.esc(p.name)+'</option>').join('');
    byId('dx-host-seat').value=String(players.some(p=>p.playerNum===Number(selected))?Number(selected):players[0].playerNum);
  }
  function hostLink(){
    const link=byId('dx-own-card');link.hidden=true;
    if(demo||!payload||!ROOM.code||status==='switched')return;
    const seat=payload.dixit.hostPlayerNum;
    try{
      const saved=JSON.parse(localStorage.getItem('room-session-'+ROOM.code)||'null'),token=saved?.tokens?.[seat-1];
      if(!token)return;
      const url=new URL('play.html',location.href);url.searchParams.set('s',ROOM.code);url.searchParams.set('p',token);url.searchParams.set('n',ROOM.name(seat-1));
      link.href=url.href;link.hidden=false;
    }catch(e){}
  }
  function labels(){
    byId('dx-host-seat-label').textContent=ht('seat');byId('dx-host-seat-hint').textContent=ht('seatHint');byId('dx-own-card').textContent=ht('ownCard');
    byId('dx-target-score-label').textContent=ht('targetScore');byId('dx-target-score-hint').textContent=ht('targetHint');
    byId('dx-setup-help').textContent=status==='switched'?ht('switchHint'):t(status==='setupNeeded'?'setupHint':'lobbyHint');
    byId('dx-host-status').textContent=problem||({setupNeeded:t('setupHint'),noFirebase:t('offline'),offline:t('offline'),other_host:t('otherHost'),host_card_active:ht('hostCardActive'),switched:t('switched'),error:t('offline'),loading:'',ready:''}[status]||'');
    byId('dx-open').disabled=busy||!canOpen();byId('dx-setup-link').hidden=demo;byId('dx-setup').hidden=!!payload&&status!=='switched';
    byId('dx-table').hidden=status==='switched';
    byId('dx-host-seat-field').hidden=status==='setupNeeded'||status==='noFirebase';
    byId('dx-target-score-field').hidden=status==='setupNeeded'||status==='noFirebase';
    if(!demo&&ROOM.code)byId('dx-room-label').textContent=ht('room',{code:ROOM.code,n:ROOM.count});
    hostLink();
    if(card){card.options.disabled=()=>!demo&&status!=='ready';card.paint();}
  }
  function show(next){payload=next;const target=validTarget(next.dixit.targetScore)?Number(next.dixit.targetScore):30;
    byId('dx-target-score').value=String(target);if(!demo&&ROOM.code&&Number(ROOM.getExtra('dixitTargetScore'))!==target)ROOM.setExtra('dixitTargetScore',target);
    if(!card)card=new DIXIT_UI.Card(byId('dx-table'),{
    host:demo?demoView()===0:true,now:()=>sync?.now()||Date.now(),connected:()=>demo||!!sync?.connected,
    send:async command=>{if(demo){state=DIXIT_ENGINE.apply(state,{...command,actor:demoView(),seed:seed(),now:Date.now()});show(DIXIT_ENGINE.view(state,demoView(),Date.now()));}else await sync.command(command.type,command);}
  });card.update(next);labels();}
  byId('dx-host-seat').addEventListener('change',()=>{if(!demo&&ROOM.code)ROOM.setExtra('dixitHostPlayerNum',Number(byId('dx-host-seat').value));});
  byId('dx-target-score').addEventListener('change',()=>{try{const target=targetScore();problem='';if(!demo&&ROOM.code)ROOM.setExtra('dixitTargetScore',target);}catch(error){problem=ht('invalidTarget');}labels();});
  byId('dx-open').addEventListener('click',async()=>{if(busy||!canOpen())return;busy=true;problem='';labels();try{
    const hostPlayerNum=Number(byId('dx-host-seat').value),target=targetScore();
    if(demo){state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:seed(),now:Date.now(),hostPlayerNum,targetScore:target});show(DIXIT_ENGINE.view(state,demoView(),Date.now()));}
    else await sync.start({hostPlayerNum,targetScore:target});
  }catch(e){problem=e.message==='invalid_target_score'?ht('invalidTarget'):DIXIT_UI.errorText(e.message);}finally{busy=false;labels();}});
  byId('dx-demo-view').addEventListener('change',()=>{card?.destroy();card=null;show(DIXIT_ENGINE.view(state,demoView(),Date.now()));});
  if(demo){
    status='ready';byId('dx-demo-bar').hidden=false;byId('dx-demo-link').hidden=true;
    byId('dx-demo-view').insertAdjacentHTML('beforeend',roster.map(p=>'<option value="'+p.playerNum+'">'+DIXIT_UI.esc(p.name)+'</option>').join(''));setSeats(roster,1);
    state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:18,now:Date.now(),hostPlayerNum:1,targetScore:targetScore()});show(DIXIT_ENGINE.view(state,0,Date.now()));
    demoTimer=setInterval(()=>{
      if(state?.phase!=='REVEALING'||state.paused)return;
      const now=Date.now(),deadline=state.revealStage==='answer'?state.revealPopularAt:state.revealAnswerAt;
      if(now<deadline)return;
      state=DIXIT_ENGINE.apply(state,{type:'advanceReveal',id:crypto.randomUUID(),actor:0,sessionId:state.sessionId,turnId:state.turnId,now});show(DIXIT_ENGINE.view(state,demoView(),now));
    },200);
  }else{
    let saved=null;try{saved=JSON.parse(localStorage.getItem('room-session-'+localStorage.getItem('room-last-session'))||'null');}catch(e){}
    if(!saved?.tokens?.length||!Number.isInteger(saved.playerCount)||saved.playerCount<3||saved.playerCount>8)status='setupNeeded';
    else if(!ROOM.enabled)status='noFirebase';
    else{
      ROOM.init({mount:'dx-room-mount',hideSetup:true,accent:'#e8b96b',counts:[3,4,5,6,7,8],defaultCount:4,onPlayerData:(n,data)=>sync?.receive(n,data)});
      setSeats(Array.from({length:ROOM.count},(_,i)=>({playerNum:i+1,name:ROOM.name(i)})),ROOM.getExtra('dixitHostPlayerNum'));
      const savedTarget=ROOM.getExtra('dixitTargetScore');byId('dx-target-score').value=String(validTarget(savedTarget)?Number(savedTarget):30);
      sync=new DIXIT_SYNC.Host({room:ROOM,db:firebase.database(),isActive:()=>!document.hidden,onChange:show,onStatus:next=>{status=next;labels();}});sync.connect();
    }
    labels();
  }
  I18N.onChange(()=>{labels();if(payload)card?.render();});
  document.addEventListener('visibilitychange',()=>sync?.setActive(!document.hidden));
  window.addEventListener('focus',()=>sync?.setActive(true));
  window.addEventListener('pagehide',()=>{clearInterval(demoTimer);card?.destroy();sync?.close();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
