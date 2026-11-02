'use strict';
// Local-only visual fixtures. No Firebase, credentials, remote room or extra
// production endpoint. Never load this Node script from a player page.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const E=require('../chat-wolf-v3-engine.js');
const root=path.resolve(__dirname,'..');
const room=E.createRoom({code:'SAMPLE',hostPlayerId:'p0',hostSessionHash:'test-only',hostName:'Alex',
  settings:{topicId:'topic_v2_02',enabledWolfRoles:['director','topic_shifter']},seed:7,now:1});
for(let i=1;i<6;i++)E.addPlayer(room,{playerId:'p'+i,sessionHash:'test-'+i,name:['','Jamie','Sam','Riley','Taylor','Morgan'][i],now:1});
E.dispatch(room,'p0','startGame',{},2);E.dispatch(room,'p0','beginTalk',{},3);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/'){
    const roles=['DIRECTOR','SHIFTER','TARGET','WOLF','JESTER','VILLAGER','HOST'];
    const role=roles.includes(url.searchParams.get('role'))?url.searchParams.get('role'):'DIRECTOR';
    const sample=JSON.parse(JSON.stringify(room));
    const player=Object.values(sample.players).find(p=>role==='DIRECTOR'?p.wolfProfession==='director':role==='SHIFTER'?p.wolfProfession==='topic_shifter':p.role===(role==='HOST'?'WOLF':role==='TARGET'?'JESTER':role));
    if(role==='TARGET'){
      const director=Object.values(sample.players).find(p=>p.wolfProfession==='director');
      E.dispatch(sample,director.id,'sendDirection',{targetId:player.id,directionId:director.wolfAbility.options[0].id},4);
    }
    if(url.searchParams.get('temporary')==='1'){
      const shifter=Object.values(sample.players).find(p=>p.wolfProfession==='topic_shifter');
      E.dispatch(sample,shifter.id,'changeTopic',{text:'What hobby would be hardest to quit?'},4);
    }
    // Opt-in synthetic planning state for checking its quiet right-hand layout.
    // This local visual server never connects to Firebase or another room.
    if(url.searchParams.get('planning')==='1'&&player.role==='WOLF'){
      const teammate=Object.values(sample.players).find(p=>p.role==='WOLF'&&p.id!==player.id);
      E.dispatch(sample,teammate.id,'volunteerTask',{taskId:sample.tasks[0].id},4);
      E.dispatch(sample,player.id,'volunteerTask',{taskId:sample.tasks[1].id},4);
    }
    const state=E.projectState(sample,player.id,4);
    state.private.isHost=role==='HOST';
    if(url.searchParams.get('phase')==='reveal')state.public.phase='ROLE_REVEAL';
    const data=JSON.stringify(state).replace(/</g,'\\u003c');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local card design check</title><link rel="stylesheet" href="/chat-wolf.css"></head><body><nav style="padding:12px;font-size:12px">LOCAL VISUAL SAMPLE — no real players; controls are not connected · ${roles.map(r=>`<a href="/?role=${r}">${esc(r)}</a>`).join(' · ')}</nav><main id="app"></main><script src="/chat-wolf-copy.js"></script><script src="/chat-wolf-v3-rules.js"></script><script src="/chat-wolf-v3-ui.js"></script><script>
    const state=${data};
    const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ui=CHAT_WOLF_V3_UI.create({esc:escapeText,getState:()=>state,embeddedCard:${role!=='HOST'},
      playerName:id=>state.public.players.find(p=>p.id===id)?.name||'Player',
      roomBar:()=>'<div class="room-bar">Host presentation · SAMPLE</div>',playerRows:()=>'',timer:()=>'<span class="timer">0:45</span>',
      action:async()=>{},showToast:()=>{},rerender:()=>document.querySelector('#app').innerHTML=ui.render(),privateCardUrl:()=>'/'});
    document.querySelector('#app').innerHTML=ui.render();
    document.addEventListener('click',event=>ui.handleClick(event));
    </script></body></html>`);return;
  }
  const name=url.pathname.slice(1);
  if(!['chat-wolf.css','chat-wolf-copy.js','chat-wolf-v3-rules.js','chat-wolf-v3-ui.js'].includes(name)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});
  fs.createReadStream(path.join(root,name)).pipe(res);
});
server.listen(8091,'127.0.0.1',()=>console.log('Local sample cards: http://127.0.0.1:8091/ — no Firebase connection'));
