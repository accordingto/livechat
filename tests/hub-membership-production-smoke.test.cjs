'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../scripts/hub-membership-production-smoke.cjs');
const {createExecutor}=require('../runtime/hub-executor-core.cjs');
const registry={...require('../runtime/party-executor.cjs').adapters,...require('../runtime/story-executor.cjs').adapters,...require('../runtime/bluff-executor.cjs').adapters};
const clone=v=>v==null?null:structuredClone(v);
function firebaseValue(value){if(value==null)return null;if(typeof value!=='object')return value;const entries=Object.entries(value).map(([key,child])=>[key,firebaseValue(child)]).filter(([,child])=>child!==null);if(!entries.length)return null;const numeric=entries.every(([key])=>/^(0|[1-9][0-9]*)$/.test(key));const max=numeric?Math.max(...entries.map(([key])=>Number(key))):0;if(numeric&&entries.length>(max+1)/2){const result=Array(max+1).fill(null);entries.forEach(([key,child])=>{result[Number(key)]=child;});return result;}return Object.fromEntries(entries);}
function harness({collision=false,dropAdmissionReply=false,firebaseShape=false}={}){
 const nodes=new Map(),versions=new Map(),requests=[],seen=new Set();let collisionPath=null;
 const etag=path=>'"'+(versions.get(path)||0)+'"';
 const database=async(url,options={})=>{
  const path=new URL(url).pathname.slice(1).replace(/\.json$/,''),method=options.method||'GET';requests.push({method,path});
  assert.match(path,/^rooms\/(?:HM[A-F0-9]{8}|bluffking-HM[A-F0-9]{8}|bluff-identities)\/players\/[a-f0-9]{20,64}$/,'every request is an exact disposable capability node');
  if(method==='GET'){
   if(collision&&!collisionPath){collisionPath=path;nodes.set(path,{game:'foreign',keep:true});versions.set(path,1);}
   return new Response(JSON.stringify(firebaseShape?firebaseValue(nodes.get(path)):clone(nodes.get(path))),{headers:{etag:etag(path)}});
  }
  const match=new Headers(options.headers).get('if-match');assert.ok(match,'writes and deletes always retain their authoritative ETag');
  if(match!==etag(path))return new Response('null',{status:412});
  if(method==='DELETE'){assert.ok(seen.has(path),'cleanup only touches exact nodes this run created or its service generated');nodes.delete(path);versions.set(path,(versions.get(path)||0)+1);return new Response('null');}
  assert.equal(method,'PUT');const next=JSON.parse(options.body);nodes.set(path,clone(next));versions.set(path,(versions.get(path)||0)+1);seen.add(path);return new Response(JSON.stringify(next));
 };
 const service=createExecutor({secret:'91'.repeat(32),databaseURL:'http://localhost',fetchImpl:database,now:()=>100000,games:registry});
 const fetch=async(url,options={})=>{
  if(new URL(url).pathname==='/api/hub-executor'){
   if(!options.method||options.method==='GET')return new Response('{"ready":true,"version":1}',{headers:{date:new Date(100000).toUTCString()}});
   const body=JSON.parse(options.body);try{assert.ok(['register','execute','updateRoster','setParticipant'].includes(body.operation));const result=await service[body.operation](body);if(dropAdmissionReply&&body.operation==='updateRoster')return new Response('{"error":"storage_unavailable"}',{status:503});return new Response(JSON.stringify(result));}
   catch(error){return new Response(JSON.stringify({error:error.code||'executor_unavailable'}),{status:error.status||503});}
  }
  return database(url,options);
 };
 return{fetch,nodes,requests,getCollision:()=>collisionPath};
}

test('all six membership smoke fixtures verify actual sealed-service admission, retained tickets, departure and same-link return without network',async()=>{
 const h=harness(),report=await run({fetchImpl:h.fetch,now:()=>100000});
 assert.equal(report.ok,true,JSON.stringify(report));assert.equal(report.games.length,6);assert.ok(report.games.every(g=>g.ok&&g.passed>=12));assert.ok(report.passed>=100);
 assert.equal(report.cleanup.failed,0);assert.equal(report.cleanup.tracked,report.cleanup.deleted+report.cleanup.empty);assert.equal(h.nodes.size,0,'all generated exact nodes are cleaned');
 assert.ok(h.requests.some(r=>r.method==='DELETE'));assert.ok(h.requests.every(r=>!/\/rooms$|\/players$/.test(r.path)));
 assert.doesNotMatch(JSON.stringify(report),/capsule|token|identity|historyToken|originalToken|SECRET_|rooms\//,'report never contains capabilities or private content');
});

test('membership smoke rejects a preexisting exact creation node and never attempts to delete or overwrite it',async()=>{
 const h=harness({collision:true}),report=await run({fetchImpl:h.fetch,now:()=>100000,gameNames:['dixit']});
 assert.equal(report.ok,false);assert.equal(report.cleanup.tracked,0);assert.equal(report.cleanup.deleted,0);assert.deepEqual(h.nodes.get(h.getCollision()),{game:'foreign',keep:true});
 assert.equal(h.requests.filter(r=>r.method!=='GET').length,0);
});


test('Bluff lost admission reply discovers only its marked canonical capabilities and cleans newly generated private and history nodes',async()=>{
 const h=harness({dropAdmissionReply:true}),report=await run({fetchImpl:h.fetch,now:()=>100000,gameNames:['bluffking']});
 assert.equal(report.ok,false);assert.equal(report.step,'bluffking:admit');assert.equal(report.cleanup.failed,0,JSON.stringify(report));
 assert.ok(report.cleanup.tracked>=14);assert.equal(report.cleanup.tracked,report.cleanup.deleted+report.cleanup.empty);assert.equal(h.nodes.size,0);
});

test('membership smoke accepts Firebase omission of empty private hands and null projection fields',async()=>{const h=harness({firebaseShape:true}),report=await run({fetchImpl:h.fetch,now:()=>100000});assert.equal(report.ok,true,JSON.stringify(report));assert.equal(report.games.length,6);assert.equal(report.cleanup.failed,0);assert.equal([...h.nodes.values()].filter(node=>firebaseValue(node)!==null).length,0);});
