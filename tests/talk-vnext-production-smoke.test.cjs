'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../scripts/talk-vnext-production-smoke.cjs');
const {createExecutor}=require('../runtime/hub-executor-core.cjs'),{DEFAULT_DB}=require('../runtime/talk-archive-store.cjs');
const {adapters}=require('../runtime/story-executor.cjs');
const clone=v=>v==null?null:structuredClone(v);
function firebaseShape(value){
 if(value==null)return null;if(typeof value!=='object')return value;
 const pairs=Object.entries(value).map(([k,v])=>[k,firebaseShape(v)]).filter(([,v])=>v!=null);if(!pairs.length)return null;
 const keys=pairs.map(([k])=>k),numeric=keys.every(k=>/^(0|[1-9][0-9]*)$/.test(k));
 if(Array.isArray(value)||numeric&&Math.max(...keys.map(Number))<pairs.length*2){const result=[];for(const[k,v]of pairs)result[Number(k)]=v;return Array.from(result,v=>v??null)}
 return Object.fromEntries(pairs);
}
function harness(){const nodes=new Map(),versions=new Map(),jobs=[],deleted=[];let clock=1760000000000;const archiveSecret='64'.repeat(32);
const set=(p,v)=>{if(v==null)nodes.delete(p);else nodes.set(p,firebaseShape(v));versions.set(p,(versions.get(p)||0)+1)};
const response=(status,v,headers={})=>({status,ok:status>=200&&status<300,headers:new Headers(headers),json:async()=>clone(v)});
const storage=async(url,opts={})=>{const u=new URL(url);assert.equal(u.origin,DEFAULT_DB);assert.equal(u.search,'');const p=u.pathname.slice(1).replace(/\.json$/,'');assert.match(p,/^rooms\/(?:QVN[A-F0-9]{8}\/players\/[a-f0-9]{20,32}|talk-archive\/players\/[a-f0-9]{64})$/);const etag='"'+(versions.get(p)||0)+'"';if((opts.method||'GET')==='GET')return response(200,nodes.get(p),{etag});assert.equal(opts.method,'PUT');assert.ok(new Headers(opts.headers).get('If-Match'));if(new Headers(opts.headers).get('If-Match')!==etag)return response(412,null);const v=JSON.parse(opts.body);set(p,v);if(v==null)deleted.push(p);return response(200,v)};
const service=createExecutor({secret:'39'.repeat(32),archiveSecret,fetchImpl:storage,now:()=>clock,games:adapters});
const schedule=async result=>{if(result._wake){await service.noteWake({ticket:result._wake.ticket,stage:'scheduled'});if(!jobs.some(j=>j.key===result._wake.key))jobs.push({key:result._wake.key,at:clock+result._wake.delayMs,ticket:result._wake.ticket});delete result._wake}};
const fetchImpl=async(url,opts={})=>{if(new URL(url).origin===DEFAULT_DB)return storage(url,opts);assert.equal(url,'https://icebreaker-youtube-search.vercel.app/api/hub-executor');const body=JSON.parse(opts.body);try{const result=await service[body.operation](body);await schedule(result);return response(200,result)}catch(e){return response(e.status||503,{error:e.code||'executor_unavailable'})}};
const delay=async ms=>{const end=clock+ms;for(let i=0;i<2000;i++){jobs.sort((a,b)=>a.at-b.at);if(!jobs.length||jobs[0].at>end)break;const job=jobs.shift();clock=job.at;try{await schedule(await service.wake({ticket:job.ticket}))}catch{}}clock=end};
return{fetchImpl,now:()=>clock,delay,env:{CRAZY_TALK_ARCHIVE_SECRET:archiveSecret},nodes,deleted,jobs};}
test('five-seat production vNext harness proves autonomous 150s expiry, locked closing, encrypted vault and exact seven-node cleanup',async()=>{const h=harness();let failure;const report=await run({...h,onFailure:e=>failure=e.stack});if(!report.ok)console.error(failure);assert.equal(report.ok,true,JSON.stringify(report));assert.ok(report.checks>=100);assert.equal(report.cleaned,7);assert.equal(report.cleanupFailed,0);assert.equal(h.nodes.size,0);assert.equal(h.deleted.length,7);for(const flag of ['fiveSeatsTwoDirectorsThreeActors','privateReplacementChoice','cooldownFromCompletion','immediateAfterCooldown','autonomousRoundDecision','hostOnlyLockedExtension','autonomous150SecondExpiryPause','privateVaultAndConsentedReveal','crossSessionEditResendDelete','encryptedSystemAndPlayerDiagnostics'])assert.equal(report.flags[flag],true,flag)});
test('vNext production harness rejects a missing key before touching any room',async()=>{let requests=0;const report=await run({env:{},fetchImpl:async()=>{requests++}});assert.equal(report.ok,false);assert.equal(report.error,'archive_key_unavailable');assert.equal(requests,0)});

test('short owned production diagnostic verifies a background successor without any foreground pulse',async()=>{
 const h=harness(),r=await run({...h,diagnosticOnly:true});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.flags.autonomousFirstWake,true);assert.equal(r.cleaned,7);assert.equal(h.nodes.size,0);
});
