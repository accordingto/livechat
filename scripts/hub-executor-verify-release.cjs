'use strict';
// Read-only deployment check. Never accesses live room/player data.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), base = 'https://livechat-two-alpha.vercel.app/';
const release = process.argv[2] || 'executor-1';
const files = ['index.html', 'room.js', 'hub-membership.css', 'hub-launcher.js', 'talk-topics.js', 'talk.css', 'play.html', 'hub-executor.js', 'dixit.html', 'dixit-engine.js', 'dixit-sync.js', 'dixit-ui.js', 'dixit-host.js',
  'once-upon-a-time.html', 'once-upon-a-time.css', 'once-upon-a-time-deck.js', 'once-upon-a-time-engine.js', 'once-upon-a-time-sync.js', 'once-upon-a-time-ui.js', 'once-upon-a-time-host.js',
  'lets-talk.html', 'talk-engine.js', 'talk-sync.js', 'talk-ui.js', 'talk-host.js', 'cut.html', 'cut-engine.js', 'cut-sync.js', 'cut-ui.js', 'cut-host.js', 'cut.css',
  'open-mic-rescue.html', 'open-mic-engine.js', 'open-mic-sync.js', 'open-mic-ui.js', 'open-mic-host.js',
  'bluff-king-live-chat.html', 'bluff-king-engine.js', 'bluff-king-sync.js', 'bluff-king-ui.js',
  'chat-wolf.html', 'chat-wolf-copy.js', 'chat-wolf-engine.js', 'chat-wolf-sync.js', 'chat-wolf-v3-engine.js', 'chat-wolf-v3-ui.js', 'chat-wolf.js'];
const hash = bytes => crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
(async () => {
  let next = 0;
  const results = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < files.length) {
      const file = files[next++], response = await fetch(base + file + '?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000) });
      results.push({ file, status: response.status, match: response.ok && hash(Buffer.from(await response.arrayBuffer())) === hash(fs.readFileSync(path.join(root, file))) });
    }
  }));
  const current = results.filter(result => result.match).length;
  for (const result of results.filter(result => !result.match)) console.log('NOT CURRENT', result);
  console.log('EXECUTOR PRODUCTION ASSETS ' + current + '/' + files.length);
  const healthResponse = await fetch('https://icebreaker-youtube-search.vercel.app/api/hub-executor?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  let health = null; try { health = await healthResponse.json(); } catch {}
  const healthy = healthResponse.status === 200 && health?.version === 1 && health.ready === true;
  console.log('EXECUTOR API', { status: healthResponse.status, ready: health?.ready ?? null, valid: healthy });
  const cors = await fetch('https://icebreaker-youtube-search.vercel.app/api/hub-executor', { method:'OPTIONS', headers:{Origin:'https://livechat-two-alpha.vercel.app','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}, signal:AbortSignal.timeout(30000) });
  const corsValid=cors.status===204 && cors.headers.get('access-control-allow-origin')==='https://livechat-two-alpha.vercel.app';
  const invalid = await fetch('https://icebreaker-youtube-search.vercel.app/api/hub-executor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({operation:'execute',capsule:'invalid-synthetic-ticket',token:'1'.repeat(32)}), signal:AbortSignal.timeout(30000) });
  let invalidBody;try{invalidBody=await invalid.json();}catch{}
  const runtimeValid=invalid.status===403 && invalidBody?.error==='invalid_ticket';
  console.log('OWNED SERVICE CORS / RUNTIME', {cors: corsValid, syntheticRejection: runtimeValid});

  const privateResponse = await fetch(base + 'runtime/hub-executor-core.cjs?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000) });
  const dedicatedPrivate = await fetch('https://icebreaker-youtube-search.vercel.app/runtime/hub-executor-core.cjs?release=' + encodeURIComponent(release), { signal: AbortSignal.timeout(30000) });
  const privateBlocked = privateResponse.status === 404 && dedicatedPrivate.status === 404;
  console.log('SERVER RUNTIME BLOCKED', { status: privateResponse.status, valid: privateBlocked });
  if (current !== files.length || !healthy || !privateBlocked || !corsValid || !runtimeValid) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
