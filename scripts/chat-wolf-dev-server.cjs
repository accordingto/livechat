'use strict';
// Static local preview; like production, the page uses the existing Firebase.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'chat-wolf.html' : pathname.slice(1);
  if (!/^(chat-wolf[\w.-]*\.(html|css|js)|play\.html|index\.html|[a-z][a-z0-9-]*\.(js|css)|apple-touch-icon\.png)$/.test(relative)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.CHAT_WOLF_DEV_PORT || 8088), '127.0.0.1', () =>
  console.log('Chat Wolf static preview: http://127.0.0.1:8088/chat-wolf.html (real Firebase)'));
