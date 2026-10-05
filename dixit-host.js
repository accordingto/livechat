(function(){
  'use strict';
  const byId=id=>document.getElementById(id),t=DIXIT_UI.t,demo=new URLSearchParams(location.search).get('demo')==='1';
  I18N.registerDict('dixitHost',{
    seat:{zh:'HOST 是哪位玩家？',en:'Which player is the host?'},
    seatHint:{zh:'這位玩家可以在自己的卡片發牌、揭曉與換下一輪。',en:'This player can deal, reveal and start the next round from their own card.'},
    ownCard:{zh:'開啟我的 HOST 玩家卡片',en:'Open my host player card'},
    room:{zh:'房間 {code} · {n} 人',en:'Room {code} · {n} players'},
    hostCardActive:{zh:'HOST 玩家卡片正在同步遊戲。',en:'Your host player card is keeping the game in sync.'},
  });
  const ht=(key,params={})=>I18N.t('dixitHost',key).replace(/\{(\w+)\}/g,(_,name)=>params[name]??'');
  let sync=null,card=null,payload=null,state=null,status='loading',busy=false,problem='',demoTimer=null;
  const requested=Number(new URLSearchParams(location.search).get('players')),count=[3,4,5,6,7,8].includes(requested)?requested:4;
  const roster=['Alex','Jamie','Sam','Riley','Taylor','Robin','Morgan','Casey'].slice(0,count).map((name,i)=>({playerNum:i+1,name}));
  const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0],demoView=()=>Number(byId('dx-demo-view').value);
  function setSeats(players,selected){
    byId('dx-host-seat').innerHTML=players.map(p=>'<option value="'+p.playerNum+'">'+DIXIT_UI.esc(p.name)+'</option>').join('');
    byId('dx-host-seat').value=String(players.some(p=>p.playerNum===Number(selected))?Number(selected):players[0].playerNum);
  }
  function hostLink(){
    const link=byId('dx-own-card');link.hidden=true;
    if(demo||!payload||!ROOM.code)return;
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
    byId('dx-setup-help').textContent=t(status==='setupNeeded'?'setupHint':'lobbyHint');
    byId('dx-host-status').textContent=problem||({setupNeeded:t('setupHint'),noFirebase:t('offline'),offline:t('offline'),other_host:t('otherHost'),host_card_active:ht('hostCardActive'),switched:t('switched'),error:t('offline'),loading:'',ready:''}[status]||'');
    byId('dx-open').disabled=busy||!demo&&(!sync||!sync.own||status!=='ready');byId('dx-setup-link').hidden=demo;byId('dx-setup').hidden=!!payload&&status!=='switched';
    byId('dx-host-seat-field').hidden=status==='setupNeeded'||status==='noFirebase';
    if(!demo&&ROOM.code)byId('dx-room-label').textContent=ht('room',{code:ROOM.code,n:ROOM.count});
    hostLink();
    if(card){card.options.disabled=()=>!demo&&status!=='ready';card.paint();}
  }
  function show(next){payload=next;if(!card)card=new DIXIT_UI.Card(byId('dx-table'),{
    host:demo?demoView()===0:true,now:()=>sync?.now()||Date.now(),connected:()=>demo||!!sync?.connected,
    send:async command=>{if(demo){state=DIXIT_ENGINE.apply(state,{...command,actor:demoView(),seed:seed(),now:Date.now()});show(DIXIT_ENGINE.view(state,demoView(),Date.now()));}else await sync.command(command.type,command);}
  });card.update(next);labels();}
  byId('dx-host-seat').addEventListener('change',()=>{if(!demo&&ROOM.code)ROOM.setExtra('dixitHostPlayerNum',Number(byId('dx-host-seat').value));});
  byId('dx-open').addEventListener('click',async()=>{if(busy||!demo&&status!=='ready')return;busy=true;problem='';labels();try{
    const hostPlayerNum=Number(byId('dx-host-seat').value);
    if(demo){state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:seed(),now:Date.now(),hostPlayerNum});show(DIXIT_ENGINE.view(state,demoView(),Date.now()));}
    else await sync.start({hostPlayerNum});
  }catch(e){problem=DIXIT_UI.errorText(e.message);}finally{busy=false;labels();}});
  byId('dx-demo-view').addEventListener('change',()=>{card?.destroy();card=null;show(DIXIT_ENGINE.view(state,demoView(),Date.now()));});
  if(demo){
    status='ready';byId('dx-demo-bar').hidden=false;byId('dx-demo-link').hidden=true;
    byId('dx-demo-view').insertAdjacentHTML('beforeend',roster.map(p=>'<option value="'+p.playerNum+'">'+DIXIT_UI.esc(p.name)+'</option>').join(''));setSeats(roster,1);
    state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:18,now:Date.now(),hostPlayerNum:1});show(DIXIT_ENGINE.view(state,0,Date.now()));
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
      sync=new DIXIT_SYNC.Host({room:ROOM,db:firebase.database(),onChange:show,onStatus:next=>{status=next;labels();}});sync.connect();
    }
    labels();
  }
  I18N.onChange(()=>{labels();if(payload)card?.render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync?.renew();});
  window.addEventListener('focus',()=>sync?.renew());
  window.addEventListener('pagehide',()=>{clearInterval(demoTimer);card?.destroy();sync?.close();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
