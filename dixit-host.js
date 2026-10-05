(function(){
  'use strict';
  const byId=id=>document.getElementById(id),t=DIXIT_UI.t,demo=new URLSearchParams(location.search).get('demo')==='1';
  let sync=null,card=null,payload=null,state=null,status='loading',busy=false,problem='';
  const requested=Number(new URLSearchParams(location.search).get('players')),count=[3,4,5,6,7,8].includes(requested)?requested:4;
  const roster=['Alex','Jamie','Sam','Riley','Taylor','Robin','Morgan','Casey'].slice(0,count).map((name,i)=>({playerNum:i+1,name}));
  const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
  function labels(){
    byId('dx-setup-help').textContent=t(status==='setupNeeded'?'setupHint':'lobbyHint');
    byId('dx-host-status').textContent=problem||({setupNeeded:t('setupHint'),noFirebase:t('offline'),offline:t('offline'),other_host:t('otherHost'),switched:t('switched'),error:t('offline'),loading:'',ready:''}[status]||'');
    byId('dx-open').disabled=busy||!demo&&(!sync||!sync.own||status!=='ready');byId('dx-setup-link').hidden=demo;byId('dx-setup').hidden=!!payload&&status!=='switched';
    if(card){card.options.disabled=()=>!demo&&status!=='ready';card.paint();}
  }
  function show(next){payload=next;if(!card)card=new DIXIT_UI.Card(byId('dx-table'),{
    host:demo?Number(byId('dx-demo-view').value)===0:true,now:()=>sync?.now()||Date.now(),connected:()=>demo||!!sync?.connected,
    send:async command=>{if(demo){state=DIXIT_ENGINE.apply(state,{...command,actor:Number(byId('dx-demo-view').value),seed:seed(),now:Date.now()});show(DIXIT_ENGINE.view(state,Number(byId('dx-demo-view').value),Date.now()));}else await sync.command(command.type,command);}
  });card.update(next);labels();}
  byId('dx-open').addEventListener('click',async()=>{if(busy||!demo&&status!=='ready')return;busy=true;problem='';labels();try{if(demo){state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:seed(),now:Date.now()});show(DIXIT_ENGINE.view(state,0,Date.now()));}else await sync.start();}catch(e){problem=DIXIT_UI.errorText(e.message);}finally{busy=false;labels();}});
  byId('dx-demo-view').addEventListener('change',()=>{card?.destroy();card=null;show(DIXIT_ENGINE.view(state,Number(byId('dx-demo-view').value),Date.now()));});
  if(demo){status='ready';byId('dx-demo-bar').hidden=false;byId('dx-demo-link').hidden=true;byId('dx-demo-view').insertAdjacentHTML('beforeend',roster.map(p=>'<option value="'+p.playerNum+'">'+DIXIT_UI.esc(p.name)+'</option>').join(''));state=DIXIT_ENGINE.create({id:crypto.randomUUID(),roster,seed:18,now:Date.now()});show(DIXIT_ENGINE.view(state,0,Date.now()));}
  else{let saved=null;try{saved=JSON.parse(localStorage.getItem('room-session-'+localStorage.getItem('room-last-session'))||'null');}catch(e){}
    if(!saved?.tokens?.length||!Number.isInteger(saved.playerCount)||saved.playerCount<3||saved.playerCount>8)status='setupNeeded';else if(!ROOM.enabled)status='noFirebase';else{ROOM.init({mount:'dx-room-mount',hideSetup:true,accent:'#e8b96b',counts:[3,4,5,6,7,8],defaultCount:4,onPlayerData:(n,data)=>sync?.receive(n,data)});byId('dx-room-label').textContent='Room '+ROOM.code+' · '+ROOM.count+' players';sync=new DIXIT_SYNC.Host({room:ROOM,db:firebase.database(),onChange:show,onStatus:next=>{status=next;labels();}});sync.connect();}labels();}
  I18N.onChange(()=>{labels();if(payload)card?.render();});window.addEventListener('pagehide',()=>{card?.destroy();sync?.close();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
