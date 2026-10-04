'use strict';
// Read-only static preview. Real Hub rooms still use the existing Firebase;
// ?demo=1 is the explicit synthetic mode with no database connection.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
  let relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'once-upon-a-time.html';}catch(e){res.writeHead(400);res.end();return;}
  const permitted=/^[a-z][a-z0-9.-]*\.(html|css|js|png|json)$/.test(relative)||/^assets\/once-upon-a-time\/(?:[a-z-]+\/)?[a-z0-9.-]+\.(png|svg|json)$/.test(relative);
  if(!permitted){res.writeHead(404);res.end('Not found');return;}
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.ONCE_DEV_PORT||8095),'127.0.0.1',()=>console.log('Once Upon a Time: http://127.0.0.1:8095/once-upon-a-time.html?demo=1 (synthetic demo) or /index.html (real Firebase room)'));
