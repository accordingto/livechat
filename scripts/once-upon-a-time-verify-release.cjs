'use strict';
// Read-only verification. Never joins a room or touches player data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const base='https://livechat-two-alpha.vercel.app/';
const release=process.argv[2]||'once-v2';
function hash(bytes,file){
  const value=/\.(?:html|js|css|svg|json)$/.test(file)?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes;
  return crypto.createHash('sha256').update(value).digest('hex');
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);return entry.isDirectory()?walk(file):[file];
});}
(async()=>{
  const html=fs.readFileSync(path.join(root,'once-upon-a-time.html'),'utf8');
  const runtime=Array.from(html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g),m=>m[1]).filter(file=>!/^https?:/.test(file));
  const art=walk(path.join(root,'assets','once-upon-a-time')).filter(file=>/\.(?:webp|svg|json|png)$/.test(file)&&!file.endsWith('-v2.png')).map(file=>path.relative(root,file).replace(/\\/g,'/'));
  const assets=[...new Set(['index.html','play.html','once-upon-a-time.html',...runtime,...art])];
  const results=[];let next=0;
  async function worker(){while(next<assets.length){const asset=assets[next++];
    const file=asset.split('?')[0],local=fs.readFileSync(path.join(root,file));
    const response=await fetch(base+asset+(asset.includes('?')?'&':'?')+'release='+encodeURIComponent(release),{signal:AbortSignal.timeout(30000)});
    const remote=Buffer.from(await response.arrayBuffer());
    results.push({asset,status:response.status,matches:response.ok&&hash(local,file)===hash(remote,file)});
  }}
  await Promise.all(Array.from({length:8},worker));
  const matched=results.filter(result=>result.matches).length;
  results.filter(result=>!result.matches).forEach(result=>console.log('NOT CURRENT',result));
  console.log(`ONCE PRODUCTION ASSETS ${matched}/${assets.length}`);
  if(matched!==assets.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
