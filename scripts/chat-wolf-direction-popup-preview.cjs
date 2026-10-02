'use strict';
// Local-only functional test fixture. It never connects to Firebase and never
// exposes alternate players, credentials, role selectors or a production URL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../chat-wolf-v3-engine.js');
const root = path.resolve(__dirname, '..');
const PORT = 8093;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const allowedActions = new Set(['showDirectionNotice', 'acknowledgeDirection', 'completeDirection', 'swapDirection']);
const assets = new Map([
  ['/chat-wolf.css', 'text/css; charset=utf-8'],
  ['/chat-wolf-copy.js', 'text/javascript; charset=utf-8'],
  ['/chat-wolf-v3-rules.js', 'text/javascript; charset=utf-8'],
  ['/chat-wolf-v3-ui.js', 'text/javascript; charset=utf-8'],
]);

const room = E.createRoom({ code: 'SAMPLE', hostPlayerId: 'p0', hostSessionHash: 'local-only-host', hostName: 'Alex',
  settings: { playerCount: 6, wolfCount: 2, topicId: 'topic_v2_02', enabledProfessions: [],
    enabledWolfRoles: ['director'], talkEndBehavior: 'host_confirm' }, seed: 7, now: Date.now() });
for (let i = 1; i < 6; i++) E.addPlayer(room, { playerId: `p${i}`, sessionHash: `local-only-${i}`,
  name: ['', 'Jamie', 'Sam', 'Riley', 'Taylor', 'Morgan'][i], now: Date.now() });
E.dispatch(room, 'p0', 'startGame', {}, Date.now());
E.dispatch(room, 'p0', 'beginTalk', {}, Date.now());
const target = Object.values(room.players).find(player => player.role === 'JESTER');
const director = Object.values(room.players).find(player => player.wolfProfession === 'director');
if (!target || !director) throw new Error('Local fixture could not deal its fixed roles.');
E.dispatch(room, director.id, 'sendDirection', { targetId: target.id, directionId: director.wolfAbility.options[0].id }, Date.now());

function state() {
  const serverNow = Date.now();
  return { state: E.projectState(room, target.id, serverNow), serverNow };
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function html(res, body) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
const wrapper = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Local Director notice test</title><style>
html{background:#0d0d1a;color:#b8b8d4;font:12px system-ui}body{box-sizing:border-box;margin:0;padding:8px;display:flex;flex-direction:column;align-items:center;min-height:100dvh}header{padding:2px 0 6px}#content{width:100%;max-width:760px}.chat-wolf-frame{display:block;width:100%;height:calc(100dvh - 24px);border:0;border-radius:16px}
</style></head><body><header>LOCAL SYNTHETIC TEST — no real players</header><main id="content"><iframe class="chat-wolf-frame" id="wolf-card" src="/card" title="Local Chat Wolf player card" referrerpolicy="no-referrer"></iframe></main><script>
const wolfCardFrame=document.getElementById('wolf-card');
window.addEventListener('message',event=>{
  if(!wolfCardFrame||event.origin!==location.origin||event.source!==wolfCardFrame.contentWindow||event.data?.type!=='chat-wolf-direction-notice')return;
  wolfCardFrame.scrollIntoView({block:'start',behavior:'instant'});
  window.scrollTo({top:0,behavior:'instant'});
});
</script></body></html>`;

const card = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Local recipient card</title><link rel="stylesheet" href="/chat-wolf.css"><style>
.local-fixture-label{padding:6px 12px;font-size:11px;color:#9696b6}.local-fixture-toast{position:fixed;left:16px;right:16px;bottom:12px;z-index:2200;background:#301b2a;color:#ffe0e0;border-radius:8px;padding:8px;pointer-events:none}.local-fixture-toast:empty{display:none}
</style></head><body><header class="site-header local-fixture-label">LOCAL SYNTHETIC TEST — fixed recipient only</header><main id="app"></main><div class="local-fixture-toast" role="status" id="local-toast"></div><script src="/chat-wolf-copy.js"></script><script src="/chat-wolf-v3-rules.js"></script><script src="/chat-wolf-v3-ui.js"></script><script>
let currentState=null,serverOffset=0,renderedRevision=null,reading=false;
const app=document.getElementById('app'),toast=document.getElementById('local-toast');
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showToast(message){toast.textContent=String(message);setTimeout(()=>{toast.textContent='';},3500);}
function render(){
  if(!currentState)return;
  const opened=Array.from(app.querySelectorAll('details[open][data-detail]')).map(node=>node.dataset.detail);
  app.innerHTML=ui.render();
  opened.forEach(key=>Array.from(app.querySelectorAll('details[data-detail]')).find(node=>node.dataset.detail===key)?.setAttribute('open',''));
  renderedRevision=currentState.public.revision;
  ui.updateDirectionNotice();
}
function accept(payload){
  currentState=payload.state;
  serverOffset=payload.serverNow-Date.now();
  if(renderedRevision!==currentState.public.revision)render();
  else ui.updateDirectionNotice();
}
async function action(name,payload={}){
  try{
    const response=await fetch('/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,...payload})});
    const result=await response.json();
    if(!response.ok){showToast(result.error||'Local action failed');return false;}
    accept(result);return true;
  }catch(error){showToast('Local test connection interrupted');return false;}
}
const ui=CHAT_WOLF_V3_UI.create({esc:escapeText,getState:()=>currentState,now:()=>Date.now()+serverOffset,embeddedCard:true,
  playerName:id=>currentState?.public.players.find(player=>player.id===id)?.name||'Player',
  roomBar:()=>'',playerRows:()=>'',timer:()=>'<span class="timer">Local test</span>',
  action,showToast,rerender:render,privateCardUrl:()=>'/card'});
async function read(){
  if(reading)return;reading=true;
  try{const response=await fetch('/state',{cache:'no-store'});if(!response.ok)throw new Error();accept(await response.json());}
  catch(error){showToast('Local test connection interrupted');}
  finally{reading=false;}
}
document.addEventListener('click',event=>{Promise.resolve(ui.handleClick(event)).catch(()=>showToast('Local click failed'));});
document.addEventListener('input',event=>ui.handleInput(event));
document.addEventListener('change',event=>ui.handleChange(event));
document.addEventListener('submit',event=>{Promise.resolve(ui.handleSubmit(event)).catch(()=>showToast('Local form failed'));});
document.addEventListener('keydown',event=>ui.handleKeydown(event));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)read();});
setInterval(()=>ui.updateDirectionNotice(),250);
setInterval(read,1000);
read();
</script></body></html>`;

async function readBody(req) {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (Buffer.byteLength(value) > 4096) throw Object.assign(new Error('REQUEST_TOO_LARGE'), { code: 'REQUEST_TOO_LARGE' });
  }
  return JSON.parse(value);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  if (url.search) { json(res, 400, { error: 'LOCAL_FIXTURE_HAS_NO_PLAYER_SELECTOR' }); return; }
  if (req.method === 'GET' && url.pathname === '/') { html(res, wrapper); return; }
  if (req.method === 'GET' && url.pathname === '/card') { html(res, card); return; }
  if (req.method === 'GET' && url.pathname === '/state') { json(res, 200, state()); return; }
  if (req.method === 'POST' && url.pathname === '/action') {
    // Browser pages on another origin cannot drive this local fixture.
    if (req.headers.origin && req.headers.origin !== ORIGIN) { json(res, 403, { error: 'LOCAL_ORIGIN_ONLY' }); return; }
    try {
      const body = await readBody(req);
      if (!body || !allowedActions.has(body.action)) { json(res, 403, { error: 'LOCAL_ACTION_NOT_ALLOWED' }); return; }
      // Only the fixed recipient can act; client-supplied player/role/time fields
      // are never used to dispatch, project, pick cards or bypass the 30 seconds.
      E.dispatch(room, target.id, body.action, { directionId: body.directionId }, Date.now());
      json(res, 200, state());
    } catch (error) {
      json(res, error.code ? 409 : 400, { error: error.code || 'INVALID_LOCAL_REQUEST' });
    }
    return;
  }
  if (req.method === 'GET' && assets.has(url.pathname)) {
    res.writeHead(200, { 'Content-Type': assets.get(url.pathname), 'Cache-Control': 'no-store' });
    fs.createReadStream(path.join(root, url.pathname.slice(1))).pipe(res);
    return;
  }
  json(res, 404, { error: 'LOCAL_ROUTE_NOT_FOUND' });
});
server.listen(PORT, '127.0.0.1', () => console.log(`${ORIGIN}/ — LOCAL SYNTHETIC TEST, fixed recipient; no Firebase`));
