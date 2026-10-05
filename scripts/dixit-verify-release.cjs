'use strict';
// Read-only release verification: never reads or writes room/player data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'..');
const base='https://livechat-two-alpha.vercel.app/',release=process.argv[2]||'dixit-1';
const deck=require('../dixit-deck.js');
const assets=[...new Set(['index.html','play.html','dixit.html','dixit.css','dixit-deck.js','dixit-engine.js','dixit-sync.js','dixit-ui.js','dixit-host.js','dixit-card-host.js','assets/dixit/manifest.json',...(deck.version>=2?['assets/dixit-v2/manifest.json']:[]),...deck.cards.map(c=>c.image),...(deck.legacyCards||[]).map(c=>c.image)])];
const hash=(buffer,file)=>crypto.createHash('sha256').update(/\.(html|js|css|json)$/.test(file)?buffer.toString('utf8').replace(/\r\n/g,'\n'):buffer).digest('hex');
(async()=>{let next=0;const results=[];await Promise.all(Array.from({length:4},async()=>{while(next<assets.length){const file=assets[next++],response=await fetch(base+file+'?release='+encodeURIComponent(release),{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await response.arrayBuffer());results.push({file,status:response.status,match:response.ok&&hash(bytes,file)===hash(fs.readFileSync(path.join(root,file)),file)});}}));
  results.filter(r=>!r.match).forEach(r=>console.log('NOT CURRENT',r));const n=results.filter(r=>r.match).length;console.log('DIXIT PRODUCTION ASSETS '+n+'/'+assets.length);if(n!==assets.length)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
