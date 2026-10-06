'use strict';
// Read-only deployment verification. Never accesses any game room or player data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://livechat-two-alpha.vercel.app/';
const release=process.argv[2]||'bluff-king';
const assets=['index.html','play.html','bluff-king-live-chat.html','bluff-king.css','bluff-king-ui.js','bluff-king-engine.js','bluff-king-sync.js','bluff-king-topics.js'];
const hash=bytes=>crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
(async()=>{
  const results=await Promise.all(assets.map(async file=>{
    const response=await fetch(base+file+'?release='+encodeURIComponent(release),{signal:AbortSignal.timeout(30000)});
    const bytes=Buffer.from(await response.arrayBuffer());
    return {file,status:response.status,match:response.ok&&hash(bytes)===hash(fs.readFileSync(path.join(root,file)))};
  }));
  const excluded=await Promise.all(['server/questions/nature.json','server/questions/culture.json','scripts/bluff-live-test.cjs','tests/bluff-engine.test.cjs'].map(async file=>{
    const response=await fetch(base+file+'?release='+encodeURIComponent(release),{signal:AbortSignal.timeout(30000)});
    return {file,status:response.status,excluded:response.status===404};
  }));
  results.filter(r=>!r.match).forEach(r=>console.log('NOT CURRENT',r));
  excluded.filter(r=>!r.excluded).forEach(r=>console.log('NOT EXCLUDED',r));
  console.log('BLUFF PRODUCTION ASSETS '+results.filter(r=>r.match).length+'/'+assets.length);
  console.log('DEVELOPMENT PATHS EXCLUDED '+excluded.filter(r=>r.excluded).length+'/'+excluded.length);
  if(results.some(r=>!r.match)||excluded.some(r=>!r.excluded))process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
