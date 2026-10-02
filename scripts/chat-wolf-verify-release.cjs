'use strict';
// Read-only verification of the root game entry and its actual runtime assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const base='https://livechat-two-alpha.vercel.app/';
const normalize=s=>s.replace(/\r\n/g,'\n');
const hash=s=>crypto.createHash('sha256').update(normalize(s)).digest('hex');
(async()=>{
  const html=fs.readFileSync(path.join(root,'chat-wolf.html'),'utf8');
  const assets=['chat-wolf.html','play.html',...Array.from(html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g),m=>m[1])];
  let matched=0;
  const results=await Promise.all(assets.map(async asset=>{
    const local=fs.readFileSync(path.join(root,asset.split('?')[0]),'utf8');
    const response=await fetch(base+asset+(asset.includes('?')?'&':'?')+'release='+encodeURIComponent(process.argv[2]||'content-flow-v4'));
    const matches=response.ok&&hash(await response.text())===hash(local);
    if(matches)matched++;
    return {asset,status:response.status,matches};
  }));
  for(const item of results)if(!item.matches)console.log('NOT CURRENT',item);
  console.log(`PRODUCTION ASSETS ${matched}/${assets.length}`);
  if(matched!==assets.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
