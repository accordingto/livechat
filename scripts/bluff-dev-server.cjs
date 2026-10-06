'use strict';
// Static local preview. Real clients use configured Firebase. Keep host open.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const port = Number(process.env.BLUFF_DEV_PORT || process.env.PORT || 4175);
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'); let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { res.statusCode = 400; return res.end('Bad request'); }
  if (/^\/(server|tests|scripts|private|api|work)(\/|$)/i.test(pathname) || pathname.includes('/.') || pathname.includes('\\')) { res.statusCode = 404; return res.end('Not found'); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/bluff-king-live-chat.html' : pathname)); if (!file.startsWith(root + path.sep)) { res.statusCode = 404; return res.end('Not found'); }
  fs.stat(file, (err, stat) => { if (err || !stat.isFile()) { res.statusCode = 404; return res.end('Not found'); } res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); fs.createReadStream(file).pipe(res); });
}).listen(port, '0.0.0.0', () => console.log(`BLUFF PARTY static preview: http://localhost:${port}/bluff-king-live-chat.html (real Firebase; keep host table open)`));
