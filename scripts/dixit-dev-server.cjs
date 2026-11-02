'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{let relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'dixit.html';}catch{res.writeHead(400);res.end();return;}
  if(!/^[a-z][a-z0-9.-]*\.(html|js|css|png|webp|svg|json)$/.test(relative)&&!/^assets\/(?:dixit(?:-v2)?|once-upon-a-time)\/(?:[a-z0-9-]+\/)?[a-z0-9.-]+\.(png|webp|svg|json)$/.test(relative)){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.DIXIT_DEV_PORT||8096),'127.0.0.1',()=>console.log('Dixit preview http://127.0.0.1:8096/dixit.html'));
