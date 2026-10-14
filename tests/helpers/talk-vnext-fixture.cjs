'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const E=require('../../talk-engine.js'),{adapters}=require('../../runtime/story-executor.cjs');
const {createExecutor}=require('../../runtime/hub-executor-core.cjs'),{createStore}=require('../../runtime/talk-archive-store.cjs');
const clone=v=>v==null?null:structuredClone(v),secret='51'.repeat(32),archiveSecret='82'.repeat(32);
function fixture(options={}) {
 const nodes=new Map(),versions=new Map();let clock=options.now || 1000,seq=0,failArchive=false;
 const set=(path,value)=>{nodes.set(path,clone(value));versions.set(path,(versions.get(path)||0)+1)};
 const fetchImpl=async(url,opts={})=>{const path=new URL(url).pathname.slice(1).replace(/\.json$/,'');const etag='"'+(versions.get(path)||0)+'"';if((opts.method||'GET')==='GET')return {ok:true,status:200,headers:new Headers({etag}),json:async()=>clone(nodes.get(path))};if(path.startsWith('rooms/talk-archive/')&&failArchive)return{ok:false,status:503,headers:new Headers()};if(new Headers(opts.headers).get('if-match')!==etag)return{ok:false,status:412,headers:new Headers()};set(path,JSON.parse(opts.body));return{ok:true,status:200,headers:new Headers(),json:async()=>clone(nodes.get(path))}};
 const code='VNEXTQA',controlToken='a'.repeat(32),seats=[1,2,3,4,5].map(playerNum=>({playerNum,token:String(playerNum).repeat(32)}));
 const canonical=`rooms/${code}/players/${controlToken}`,path=n=>`rooms/${code}/players/${seats[n-1].token}`;
 const initial=E.create({id:'vnext-service',topic:{question:'Build a ridiculous cafe together.'},now:clock,roster:seats.map(s=>({playerNum:s.playerNum,name:'Synthetic '+s.playerNum})),gameMode:'crazy',crazySource:'players',conversationMode:'free',gameSeconds:60,crazyTaskSeconds:150,...options});
 set(canonical,{state:initial,revision:1});for(const seat of seats)set(path(seat.playerNum),E.view(initial,seat.playerNum,clock));
 const service=createExecutor({secret,archiveSecret,databaseURL:'http://localhost',fetchImpl,now:()=>clock,games:adapters});
 const store=createStore({secret:archiveSecret,databaseURL:'http://localhost',fetchImpl});
 const state=()=>clone(nodes.get(canonical).state),card=n=>clone(nodes.get(path(n))),capsule=()=>nodes.get(canonical).executor.capsule;
 const command=(n,type,extra={})=>({capsule:capsule(),token:n===0?controlToken:seats[n-1].token,command:{id:'vnext-service-'+ ++seq,sessionId:state().sessionId,turnId:state().turnId,type,...extra}});
 const run=body=>service.execute(body),act=async(n,type,extra={})=>{const body=command(n,type,extra);const result=await run(body);if(type!=='crazyRendered')assert.equal(state().replies[n]?.error,'',type);return{body,result}};
 const shown=async n=>{const p=card(n).talk.crazy.prompt;assert.ok(p?.status==='pending');return act(n,'crazyRendered',{promptId:p.id,renderVersion:p.renderVersion||1})};
 return{code,controlToken,seats,path,nodes,set,canonical,fetchImpl,service,store,state,card,command,run,act,shown,capsule,advance:ms=>clock+=ms,now:()=>clock,failArchive:v=>failArchive=v,register:()=>service.register({game:'letstalk',code,controlToken,seats,sessionId:initial.sessionId})};
}

module.exports={fixture};
