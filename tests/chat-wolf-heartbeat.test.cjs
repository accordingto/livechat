'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../chat-wolf.js'),'utf8');

function setup(){
  const requests=[],applied=[],toasts=[],sync=[];
  const context={
    session:{room:'ABC234',token:'local-card'},state:{public:{revision:4,phase:'TALK',phaseVersion:3,matchId:'one'}},
    requestRunning:false,heartbeatRunning:null,C:{actionBusy:'busy'},
    apiRequest(method,body,displayedView){return new Promise((resolve,reject)=>requests.push({method,body,displayedView,resolve,reject}));},
    applyState(next,force){applied.push({next,force});context.state=next;},
    showToast:message=>toasts.push(message),setSync:kind=>sync.push(kind),errorMessage:code=>code,
    clearSession(){context.session=null;},renderEntry(){},Promise,
  };
  vm.createContext(context);
  // Test the real action/heartbeat implementation without booting a browser.
  vm.runInContext(source.slice(source.indexOf('  async function action('),source.indexOf('  async function poll('))+
    '\nglobalThis.ui={action,heartbeat};',context);
  return {context,requests,applied,toasts,sync,...context.ui};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('background heartbeat does not occupy the user-action lock, show busy UI, or force a render',async()=>{
  const h=setup(),pending=h.heartbeat();
  assert.equal(h.context.requestRunning,false);assert.deepEqual(h.sync,[]);assert.deepEqual(h.toasts,[]);
  h.requests[0].resolve({state:h.context.state});assert.equal(await pending,true);
  assert.equal(h.applied.length,1);assert.equal(h.applied[0].force,false);
  assert.equal(h.context.heartbeatRunning,null);
});

test('a click waits for an in-flight heartbeat and sends its original displayed-state fence',async()=>{
  const h=setup(),clicked=h.context.state;
  const presence=h.heartbeat();const click=h.action('completeTask',{taskId:'wolf-one'});
  assert.equal(h.context.requestRunning,true);assert.equal(h.requests.length,1);assert.deepEqual(h.toasts,[]);
  h.requests[0].resolve({state:{public:{revision:5,phase:'MEETING_DISCUSS',phaseVersion:4,matchId:'one'}}});
  await presence;await flush();
  assert.equal(h.requests.length,2);assert.equal(h.requests[1].body.action,'completeTask');
  assert.equal(h.requests[1].displayedView,clicked);assert.equal(h.applied.length,0);
  h.requests[1].reject({code:'STALE_ACTION'});assert.equal(await click,false);
  assert.deepEqual(h.toasts,['STALE_ACTION']);assert.equal(h.context.requestRunning,false);
});

test('heartbeat failures stay quiet and do not swallow the waiting action',async()=>{
  const h=setup();const presence=h.heartbeat();const click=h.action('ready',{ready:true});
  h.requests[0].reject({code:'ACTION_PENDING'});await presence;await flush();
  assert.deepEqual(h.toasts,[]);assert.equal(h.requests.length,2);
  assert.equal(await h.heartbeat(),false);assert.equal(h.requests.length,2);
  h.requests[1].resolve({state:h.context.state});assert.equal(await click,true);
  assert.equal(h.applied.length,1);assert.equal(h.applied[0].force,true);
});

test('waiting action is abandoned if the player changes session during the heartbeat',async()=>{
  const h=setup();const presence=h.heartbeat();const click=h.action('ready',{ready:true});
  h.context.session={room:'OTHER1',token:'other-card'};
  h.requests[0].resolve({state:h.context.state});await presence;
  assert.equal(await click,false);assert.equal(h.requests.length,1);assert.deepEqual(h.applied,[]);
});
