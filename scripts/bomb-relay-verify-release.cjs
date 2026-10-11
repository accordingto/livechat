'use strict';
// Read-only production source checks; never reads or writes room/player data.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = 'https://livechat-two-alpha.vercel.app/';
const release = process.argv[2] || 'br-prompts-2';
const files = ['index.html', 'play.html', 'bomb-relay.html', 'bomb-relay.css',
  'bomb-relay-deck.js', 'bomb-relay-selector.js', 'bomb-relay-engine.js',
  'bomb-relay-sync.js', 'bomb-relay-ui.js', 'bomb-relay-host.js'];
const hash = bytes => crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
(async () => {
  let cursor = 0;
  const results = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++];
      const response = await fetch(base + file + '?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
      const bytes = Buffer.from(await response.arrayBuffer());
      results.push({ file, status: response.status, match: response.ok && hash(bytes) === hash(fs.readFileSync(path.join(root, file))) });
    }
  }));
  results.filter(result => !result.match).forEach(result => console.log('NOT CURRENT', result));
  const passed = results.filter(result => result.match).length;
  console.log('BOMB RELAY PRODUCTION ASSETS ' + passed + '/' + files.length);
  if (passed !== files.length) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
