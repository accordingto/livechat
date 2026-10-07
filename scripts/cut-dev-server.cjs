'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const port = Number(process.env.CUT_DEV_PORT || 4177);
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }
  if (/^\/(server|tests|scripts|private|api|work)(\/|$)/i.test(pathname) || pathname.includes('/.') || pathname.includes('\\')) { res.writeHead(404); return res.end('Not found'); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/cut.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log('CUT! preview: http://localhost:' + port + '/cut.html'));
