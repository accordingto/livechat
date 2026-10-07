'use strict';
// Read-only deployed-file verification; never reads or writes rooms or cards.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const release=process.argv[2]||'talk-crazy-1';
const base='https://livechat-two-alpha.vercel.app/';
const html=fs.readFileSync(path.join(root,'lets-talk.html'),'utf8');
const runtime=Array.from(html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g),m=>m[1]).filter(file=>!/^https?:/.test(file));
const assets=[...new Set(['index.html','play.html','lets-talk.html',...runtime])];
const hash=bytes=>crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
(async()=>{
  let next=0;const results=[];
  async function worker(){while(next<assets.length){const asset=assets[next++];
    const local=fs.readFileSync(path.join(root,asset.split('?')[0]));
    const response=await fetch(base+asset+(asset.includes('?')?'&':'?')+'release='+encodeURIComponent(release),{signal:AbortSignal.timeout(30000)});
    const remote=Buffer.from(await response.arrayBuffer());
    results.push({asset,status:response.status,matches:response.ok&&hash(local)===hash(remote)});
  }}
  await Promise.all(Array.from({length:4},worker));
  const matched=results.filter(r=>r.matches).length;
  for(const result of results.filter(r=>!r.matches)) console.log('NOT CURRENT',result);
  console.log(`TALK PRODUCTION ASSETS ${matched}/${assets.length}`);
  if(matched!==assets.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
