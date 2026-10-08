/* The shared screen never renders canonical hands. Even its own host seat is
 * played through the original Hub private link. No new room/join system. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id),t=ONCE_UI.t;
  const demo=new URLSearchParams(location.search).get('demo')==='1';
  let sync=null,card=null,payload=null,state=null,status='loading',busy=false,problem='';
  const roster=[{playerNum:1,name:'Alex'},{playerNum:2,name:'Jamie'},{playerNum:3,name:'Sam'},{playerNum:4,name:'Riley'}];
  const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
  const canOpen=()=>demo||!!(sync?.connected&&(sync.own || sync.doc?.executor?.v === 1)&&['ready','switched'].includes(status));
  function labels(){
    byId('once-open').textContent=t('openTable');byId('once-setup-link').textContent=t('setup');
    byId('once-setup-help').textContent=t(status==='switched'?'switchTableHint':status==='setupNeeded'?'tableNeeded':'hostHint');
    byId('once-host-status').textContent=problem||({setupNeeded:t('tableNeeded'),noFirebase:t('offline'),offline:t('offline'),other_host:t('otherHost'),switched:t('switched'),error:t('offline'),loading:'',ready:''}[status]||'');
    byId('once-open').disabled=busy||!canOpen();
    byId('once-setup-link').hidden=demo;
    byId('once-setup').hidden=!!payload&&status!=='switched';
    byId('once-table').hidden=status==='switched';
    if(card){card.options.disabled=()=>!demo&&status!=='ready';card.render();}
  }
  function show(next){
    payload=next;
    if(!card)card=new ONCE_UI.Card(byId('once-table'),{
      host:demo?Number(byId('once-demo-view').value)===0:true,
      now:()=>sync?.now()||Date.now(),connected:()=>demo||!!sync?.connected,
      send:async command=>{
        if(demo){
          state=ONCE_ENGINE.apply(state,{...command,actor:Number(byId('once-demo-view').value),seed:seed(),now:Date.now()});
          show(ONCE_ENGINE.view(state,Number(byId('once-demo-view').value),Date.now()));
        }else await sync.command(command.type,command);
      }
    });
    card.update(next);labels();
  }
  byId('once-open').addEventListener('click',async()=>{
    if(busy||!canOpen())return;busy=true;problem='';labels();
    try{
      if(demo){state=ONCE_ENGINE.create({id:crypto.randomUUID(),roster,seed:seed(),now:Date.now()});show(ONCE_ENGINE.view(state,0,Date.now()));}
      else await sync.start();
    }catch(e){problem=ONCE_UI.errorText(e.message);}finally{busy=false;labels();}
  });
  byId('once-demo-view').addEventListener('change',()=>{
    card?.destroy();card=null;show(ONCE_ENGINE.view(state,Number(byId('once-demo-view').value),Date.now()));
  });
  if(demo){
    status='ready';byId('once-demo-bar').hidden=false;byId('once-demo-link').hidden=true;
    byId('once-demo-view').insertAdjacentHTML('beforeend',roster.map(p=>'<option value="'+p.playerNum+'">'+ONCE_UI.esc(p.name)+'</option>').join(''));
    state=ONCE_ENGINE.create({id:crypto.randomUUID(),roster,seed:18,now:Date.now()});
    for(const p of roster)state=ONCE_ENGINE.apply(state,{id:crypto.randomUUID(),type:'ready',actor:p.playerNum,value:true,sessionId:state.sessionId,turnId:state.turnId,now:Date.now()});
    state=ONCE_ENGINE.apply(state,{id:crypto.randomUUID(),type:'deal',actor:0,sessionId:state.sessionId,turnId:state.turnId,seed:18,now:Date.now()});
    show(ONCE_ENGINE.view(state,0,Date.now()));
  }else{
    let saved=null;try{saved=JSON.parse(localStorage.getItem('room-session-'+localStorage.getItem('room-last-session'))||'null');}catch(e){}
    if(!saved?.tokens?.length||!Number.isInteger(saved.playerCount)||saved.playerCount<2||saved.playerCount>6)status='setupNeeded';
    else if(!ROOM.enabled)status='noFirebase';
    else{
      ROOM.init({mount:'once-room-mount',hideSetup:true,accent:'#48d5d0',counts:[2,3,4,5,6],defaultCount:4,
        onPlayerData:(n,data)=>sync?.receive(n,data)});
      byId('once-room-label').textContent='Room '+ROOM.code+' · '+ROOM.count+' players';
      sync=new ONCE_SYNC.Host({room:ROOM,db:firebase.database(),onChange:show,onStatus:next=>{status=next;labels();}});
      sync.connect();
    }
    labels();
  }
  I18N.onChange(()=>{labels();if(payload)card?.update(payload);});
  window.addEventListener('pagehide',()=>{card?.destroy();sync?.close();});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();
