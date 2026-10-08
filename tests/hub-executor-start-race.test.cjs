// A real Talk Host and helper over synthetic storage. REST writes intentionally
// arrive before Firebase value events; once() still reads the actual node.
'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const crypto=require('node:crypto').webcrypto, E=require('../talk-engine.js');
const clone=v=>v==null?null:structuredClone(v), snapshot=v=>({val:()=>clone(v)});
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function storage() {
  const values=new Map([['.info/connected',true],['.info/serverTimeOffset',0]]), listeners=new Map(), tails=new Map();
  let heldEvents=0;
  const put=(path,value,hold=false)=>{values.set(path,clone(value));for(const fn of listeners.get(path)||[]){if(hold)heldEvents++;else queueMicrotask(()=>fn(snapshot(value)));}};
  return {values,put,get heldEvents(){return heldEvents;},ref(path){return {key:path.split('/').at(-1),
    on(event,fn){if(!listeners.has(path))listeners.set(path,new Set());listeners.get(path).add(fn);queueMicrotask(()=>fn(snapshot(values.get(path))));},
    off(event,fn){listeners.get(path)?.delete(fn);},once:async()=>snapshot(values.get(path)),
    transaction(update){const task=(tails.get(path)||Promise.resolve()).then(()=>{update(clone(values.get(path)));const next=update(clone(values.get(path)));
      if(next===undefined)return{committed:false,snapshot:snapshot(values.get(path))};put(path,next);return{committed:true,snapshot:snapshot(next)};});tails.set(path,task.catch(()=>{}));return task;}
  };}};
}

test('start waits for background registration, refreshes canonical after delayed value events and then opens the requested topic', async()=>{
  const db=storage(), token='a'.repeat(32), canonical='rooms/RACE/players/'+token, posts=[];
  const extras={letsTalkControlToken:token}, room={code:'RACE',count:2,answers:{},name:i=>'Person '+(i+1),getExtra:k=>extras[k],setExtra:(k,v)=>extras[k]=v,
    playerRef:i=>db.ref('rooms/RACE/players/'+String(i+1).repeat(20))};
  const old=E.create({id:'old-canonical',topic:{question:'Old topic?'},now:Date.now(),roster:[{playerNum:1,name:'Person 1'},{playerNum:2,name:'Person 2'}]});
  db.put(canonical,{state:old,revision:1});for(let i=0;i<2;i++)db.put(room.playerRef(i).key? 'rooms/RACE/players/'+room.playerRef(i).key : '',E.view(old,i+1,Date.now()));
  let releaseReady;const readyGate=new Promise(r=>releaseReady=r);
  const context=vm.createContext({crypto,Date,Promise,AbortSignal,structuredClone,TALK_ENGINE:E,setInterval:()=>1,clearInterval(){},
    document:{hidden:false,documentElement:{lang:'en'},getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},
    async fetch(url,input={}){
      if(!input.method){await readyGate;return{ok:true,json:async()=>({ready:true})};}
      const body=JSON.parse(input.body);posts.push(body);let raw=clone(db.values.get(canonical));
      if(body.operation==='register'){
        const capsule='test-ticket-'+body.sessionId;raw={...raw,owner:'server',leaseUntil:0,state:{...raw.state,sharedControls:true},executor:{v:1,game:'letstalk',sessionId:body.sessionId,capsule}};
        db.put(canonical,raw,true);
        for(let i=0;i<2;i++)db.put('rooms/RACE/players/'+room.playerRef(i).key,{...E.view(raw.state,i+1,Date.now()),hubExecutor:{v:1,game:'letstalk',sessionId:body.sessionId,capsule}});
        return{ok:true,json:async()=>({capsule,game:'letstalk',sessionId:body.sessionId})};
      }
      if(body.operation==='release'){assert.equal(body.capsule,raw.executor.capsule);delete raw.executor;delete raw.state.sharedControls;raw.owner=null;raw.leaseUntil=0;db.put(canonical,raw,true);}
      return{ok:true,json:async()=>({ok:true})};
    }});
  vm.runInContext(fs.readFileSync(require.resolve('../talk-sync.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(require.resolve('../hub-executor.js'),'utf8'),context);context.HUB_EXECUTOR.install();
  const host=new context.TALK_SYNC.Host({db,room,onChange(){},onStatus(){}});host.connect();
  try{
    await flush();assert.equal(host.own,true);assert.equal(host.executorRegistering,true);assert.equal(host.doc.state.sessionId,'old-canonical');
    let finished=false;const starting=host.start({topic:{question:'The newly requested topic?'},seconds:30}).then(value=>{finished=true;return value;});
    await flush();assert.equal(finished,false);assert.equal(posts.length,0);
    releaseReady();const started=await starting;assert.notEqual(started.sessionId,'old-canonical');assert.equal(started.topic.question,'The newly requested topic?');
    await context.HUB_EXECUTOR.ensureHost(host,'letstalk');
    assert.ok(db.heldEvents>=2,'service response can precede browser value events');
    assert.deepEqual(posts.filter(p=>p.operation==='register').map(p=>p.sessionId),['old-canonical',started.sessionId]);
    assert.equal(posts.filter(p=>p.operation==='release').length,1);assert.equal(host.doc.executor.sessionId,started.sessionId);assert.equal(host.own,false);
    for(let i=0;i<2;i++){const card=db.values.get('rooms/RACE/players/'+room.playerRef(i).key);assert.equal(card.talk.sessionId,started.sessionId);assert.equal(card.hubExecutor.capsule,host.doc.executor.capsule);}
  }finally{releaseReady();host.close();}
});
