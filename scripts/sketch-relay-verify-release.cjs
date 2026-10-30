'use strict';
// Read-only asset checks; never reads or writes room/player data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = 'https://livechat-two-alpha.vercel.app/';
const release = process.argv[2] || 'relay-3';
const assets = ['index.html', 'play.html', 'sketch-relay.html', 'sketch-relay.css',
  'sketch-relay-art.js', 'sketch-relay-engine.js', 'sketch-relay-words.js',
  'sketch-relay-sync.js', 'sketch-relay-ui.js', 'sketch-relay-host.js'];
const hash = bytes => crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
(async () => {
  let next = 0;
  const results = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < assets.length) {
      const file = assets[next++];
      const response = await fetch(base + file + '?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      results.push({ file, status: response.status, match: response.ok && hash(bytes) === hash(fs.readFileSync(path.join(root, file))) });
    }
  }));
  results.filter(r => !r.match).forEach(r => console.log('NOT CURRENT', r));
  const count = results.filter(r => r.match).length;
  console.log('SKETCH RELAY PRODUCTION ASSETS ' + count + '/' + assets.length);
  if (count !== assets.length) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
