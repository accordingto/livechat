'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../hub-launcher.js'),'utf8');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.attributes={};this.hidden=false;this.value='';this.textContent='';this.disabled=false;}
 append(child){this.children.push(child);}
 replaceChildren(){this.children=[];this.value='';}
 addEventListener(event,fn){this.events[event]=fn;}
 setAttribute(key,value){this.attributes[key]=value;}
 removeAttribute(key){delete this.attributes[key];}
 remove(){this.removed=true;}
 async fire(event='click',extra={}){const packet={button:0,preventDefault(){this.prevented=true;},...extra};await this.events[event]?.(packet);return packet;}
}
function fixture({ready=true,registrationFails=false}={}){
 const ids=['hub-player-seat','hub-launch-status','hub-launch-error','hub-launch-legacy','hub-player-label','hub-launch-help'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id==='hub-player-seat'?'select':'div')]));
 const links=['lets-talk.html','chat-wolf.html','once-upon-a-time.html','dixit.html','bluff-king-live-chat.html','cut.html','open-mic-rescue.html','kangaroo-court.html'];
 const anchors=links.map(href=>Object.assign(new Element('a'),{href:'https://hub.invalid/'+href}));
 const scripts=[],state=new Map(),tokens=[1,2,3,4].map(i=>String(i).repeat(20)),names=['<img src=x onerror=bad()>','B','C','D'],extras={},navigations=[];
 const refs=tokens.map(token=>({key:token,once:async()=>({val:()=>state.get(token)}),async set(card){state.set(token,card);}}));
 const room={enabled:true,code:'ABC234',count:4,name:i=>names[i],playerRef:i=>refs[i],getExtra:k=>extras[k],setExtra:(k,v)=>{extras[k]=v;}};
 const stored=new Map(),storage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},change=[];
 let ensureCalls=0,closed=0,starts=0,loadFailure=false,holdRegistration=null;
 const context=vm.createContext({Promise,Date,URL,setTimeout,clearTimeout,console,ROOM:room,localStorage:storage,firebase:{database:()=>({})},
  location:{href:'https://hub.invalid/index.html',assign:url=>navigations.push(url)},I18N:{lang:'en',onChange:fn=>change.push(fn)},
  document:{getElementById:id=>elements[id],querySelectorAll:()=>anchors,createElement:tag=>new Element(tag),
   head:{append(script){scripts.push(script.src);queueMicrotask(()=>loadFailure?script.onerror():script.onload());}}}
 });
 const Host=class{
  constructor(){this.connected=false;this.own=false;this.doc=null;this.ref={once:async()=>({val:()=>this.raw})};}
  connect(){this.connected=true;this.own=true;}
  async start(){starts++;this.doc={state:{sessionId:'new-session'}};return this.doc.state;}
  close(){closed++;}
 };
 const executor={async ready(){return ready;},install(){},async ensureHost(host,game){
  ensureCalls++;if(holdRegistration)await holdRegistration;if(registrationFails)throw Object.assign(new Error('secret internal failure'),{code:'storage_unavailable'});
  host.raw={state:host.doc.state,revision:2,executor:{v:1,game,sessionId:'new-session',capsule:'opaque'}};
  tokens.forEach((token,i)=>state.set(token,{game,playerNum:i+1,[game]:{sessionId:'new-session'},hubExecutor:{...host.raw.executor,revision:2}}));
 }};
 context.CUT_SYNC={Host};context.OPEN_MIC_SYNC={Host};context.HUB_EXECUTOR=executor;
 vm.runInContext(source,context);
 const ui=context.HUB_LAUNCHER.install();
 return {context,room,names,tokens,refs,state,elements,anchors,scripts,storage,stored,change,navigations,ui,
  failLoading(value){loadFailure=value;},hold(value){holdRegistration=value;},calls:()=>({ensureCalls,closed,starts})};
}
test('optional player-card launcher intercepts its seven games and preserves deliberate new-tab navigation',async()=>{
 const f=fixture();assert.equal(f.anchors.filter(a=>a.events.click).length,7);
 assert.equal(f.anchors[7].events.click,undefined);
 const event=await f.anchors[5].fire('click',{ctrlKey:true});assert.equal(event.prevented,undefined);
 assert.deepEqual(f.scripts,[]);assert.equal(f.navigations.length,0);
});

test('homepage opens every independent game management page without a player selection or automatic game start',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const helper=require('../hub-launcher.js');
 for(const spec of Object.values(helper.specs)){
  assert.ok(html.includes('href="'+spec.href+'"'),'original host/settings link: '+spec.href);
  const manager=fs.readFileSync(require.resolve('../'+spec.href),'utf8');
  assert.match(manager,/hub-executor\.js\?v=/,'host page keeps independent execution: '+spec.href);
 }
 assert.doesNotMatch(html,/id="hub-player-seat"|hub-launcher\.js|HUB_LAUNCHER/);
 assert.match(html,/HUB_EXECUTOR\.watchHub\(ROOM\)/,'homepage keeps the running table roster in sync');
 assert.doesNotMatch(html,/HUB_EXECUTOR\.(?:ensureHost|ensureBluff|registerWolf)\(/,'homepage does not start or register a game');
});

test('own card must be chosen explicitly, malicious-looking names are text, and failed selection never starts a room',async()=>{
 const f=fixture(),select=f.elements['hub-player-seat'];
 assert.equal(select.value,'');assert.equal(select.children[1].textContent,f.names[0]);
 assert.equal(select.children[1].innerHTML,undefined);
 await f.anchors[5].fire();assert.match(f.elements['hub-launch-error'].textContent,/Choose your own/);
 assert.equal(f.calls().starts,0);assert.equal(f.navigations.length,0);assert.equal(select.disabled,false);
});
test('seat choice persists by original private token; room or token changes clear it instead of silently choosing another person',async()=>{
 const f=fixture(),select=f.elements['hub-player-seat'];select.value='3';await select.fire('change');
 assert.equal(JSON.parse(f.stored.get('hub-launch-seat:ABC234')).token,f.tokens[2]);
 f.names[2]='Renamed C';f.ui.refresh();assert.equal(select.value,'3');assert.equal(select.children[3].textContent,'Renamed C');
 f.room.code='DEF567';f.ui.refresh();assert.equal(select.value,'');
 f.room.code='ABC234';f.refs[2].key='e'.repeat(20);f.ui.refresh();assert.equal(select.value,'');
});
test('loading blocks duplicate game clicks, then closes the temporary initializer before navigating to the chosen card',async()=>{
 const f=fixture();f.elements['hub-player-seat'].value='2';let release;f.hold(new Promise(r=>{release=r;}));
 const first=f.anchors[5].fire();await new Promise(r=>setImmediate(r));
 assert.equal(f.ui.busy,true);assert.equal(f.elements['hub-player-seat'].disabled,true);assert.equal(f.anchors[5].attributes['aria-disabled'],'true');
 await f.anchors[6].fire();assert.equal(f.calls().starts,1);assert.equal(f.elements['hub-player-seat'].disabled,true);
 release();await first;assert.equal(f.calls().closed,1);assert.equal(f.ui.busy,false);
 assert.equal(f.navigations.length,1);assert.equal(new URL(f.navigations[0]).searchParams.get('p'),f.tokens[1]);
});
test('service failure shows normal actionable text and offers an explicit setup link without automatically opening it',async()=>{
 for(const options of [{ready:false},{registrationFails:true}]){
  const f=fixture(options);f.elements['hub-player-seat'].value='1';await f.anchors[5].fire();
  assert.equal(f.navigations.length,0);assert.equal(f.elements['hub-launch-error'].hidden,false);
  assert.ok(!/private|server|backend|storage_unavailable|secret/.test(f.elements['hub-launch-error'].textContent));
  assert.equal(f.elements['hub-launch-legacy'].hidden,false);assert.equal(f.elements['hub-launch-legacy'].href,'cut.html');
  f.context.I18N.lang='zh';f.change.forEach(fn=>fn());assert.equal(f.elements['hub-player-label'].textContent,'我的玩家卡');
 }
});
test('shared script dependencies load once; a failed file can be retried without leaving the selector disabled',async()=>{
 const f=fixture();f.elements['hub-player-seat'].value='1';f.failLoading(true);
 await f.anchors[5].fire();assert.match(f.elements['hub-launch-error'].textContent,/files could not load/);
 assert.equal(f.elements['hub-player-seat'].disabled,false);assert.equal(f.navigations.length,0);
 f.failLoading(false);await f.anchors[5].fire();assert.equal(f.navigations.length,1);
 assert.equal(f.scripts.filter(src=>src.startsWith('cut-config.js')).length,2);
 await f.anchors[5].fire();assert.equal(f.navigations.length,2);
 assert.equal(f.scripts.filter(src=>src.startsWith('cut-engine.js')).length,1);
});
test('localized player-count error tells the organizer how to repair the room setup without writing any cards',async()=>{
 const f=fixture();f.context.I18N.lang='zh';f.room.count=2;f.ui.refresh();f.elements['hub-player-seat'].value='1';
 await f.anchors[3].fire();assert.match(f.elements['hub-launch-error'].textContent,/3–8/);assert.match(f.elements['hub-launch-error'].textContent,/編輯房間人數/);
 assert.equal(f.calls().starts,0);assert.equal(f.navigations.length,0);
});
