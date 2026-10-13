'use strict';
// Read-only production verification. No credentials, room/player reads, game
// creation, deployment or writes. The only POST contains a synthetic bad ticket.
// Usage: node scripts/life-story-verify-release.cjs [release] [--preserve-games]
//        node scripts/life-story-verify-release.cjs --check-local
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hub = 'https://livechat-two-alpha.vercel.app/';
const service = 'https://icebreaker-youtube-search.vercel.app/';
const args = process.argv.slice(2);
const release = args.find(arg => !arg.startsWith('--')) || 'life-story-1';
const cacheVersion = 'life-story-1';
const entries = ['index.html', 'play.html', 'dixit.html', 'bluff-king-live-chat.html', 'bomb-relay.html',
  'crack-the-word.html', 'cut.html', 'kangaroo-court.html', 'lets-talk.html', 'once-upon-a-time.html',
  'open-mic-rescue.html', 'persuade-together.html', 'pick-a-side.html', 'say-it-without-saying-it.html',
  'sketch-relay.html', 'sophies-choice.html', 'youre-in-the-scene.html'];
const browserAssets = ['room.js', 'hub-executor.js', 'life-story-engine.js', 'life-story-ui.js', 'life-story.css',
  'dixit-engine.js', 'dixit-sync.js', 'dixit-ui.js', 'dixit-host.js', 'dixit-card-host.js', 'dixit-deck.js',
  'dixit.css', 'talk-sync.js', 'i18n.js', 'shared.css', 'hub-membership.css', 'firebase-config.js',
  'assets/dixit/manifest.json', 'assets/dixit-v2/manifest.json', 'assets/dixit-expansion-1/manifest.json'];
const preservedAssets = ['once-upon-a-time-engine.js', 'once-upon-a-time-sync.js', 'once-upon-a-time-ui.js',
  'once-upon-a-time-host.js', 'talk-engine.js', 'talk-sync.js', 'talk-ui.js', 'talk-host.js',
  'cut-engine.js', 'cut-sync.js', 'cut-ui.js', 'cut-host.js', 'cut.css', 'open-mic-engine.js',
  'open-mic-sync.js', 'open-mic-ui.js', 'open-mic-host.js', 'bluff-king-engine.js', 'bluff-king-sync.js',
  'bluff-king-ui.js', 'bluff-king-topics.js', 'chat-wolf.html', 'chat-wolf-engine.js', 'chat-wolf-sync.js',
  'chat-wolf-v3-engine.js', 'chat-wolf-v3-ui.js', 'bomb-relay-engine.js', 'bomb-relay-sync.js',
  'bomb-relay-ui.js', 'bomb-relay-host.js'];
const privatePaths = ['runtime/hub-executor-core.cjs', 'runtime/story-executor.cjs', 'runtime/life-story-state.cjs',
  'life-story-questions.cjs', 'assets/life-story/life_story_questions.zh-TW.en.json',
  'assets/life-story/question_batch.schema.json', 'assets/life-story/QUESTION_GENERATOR_PROMPT.md'];
const sha256 = (bytes, file) => crypto.createHash('sha256').update(/\.(?:html|js|css|json|svg)$/.test(file)
  ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes).digest('hex');

function localManifest() {
  const deck = require('../dixit-deck.js');
  if (deck.cards.length !== 126 || new Set(deck.cards.map(card => card.id)).size !== 126) throw new Error('Expected the current 126-card original Hub pack');
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'assets/life-story/life_story_questions.zh-TW.en.json'), 'utf8'));
  if (bank.questions.length !== 96 || bank.totalQuestions !== 96) throw new Error('Local server bank must contain all 96 questions');
  let roomEntries = 0;
  for (const entry of entries) {
    const html = fs.readFileSync(path.join(root, entry), 'utf8');
    const sources = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
    const roomScripts = sources.filter(src => new URL(src, hub).pathname === '/room.js');
    if (roomScripts.length) {
      roomEntries++;
      if (roomScripts.some(src => new URL(src, hub).searchParams.get('v') !== cacheVersion)) throw new Error('Stale Room cache URL: ' + entry);
    }
    if (sources.some(src => src.includes('life-story-questions.cjs'))) throw new Error('Server question source loaded by browser: ' + entry);
    if (['dixit.html', 'play.html'].includes(entry)) {
      for (const file of ['life-story-engine.js', 'life-story-ui.js', 'dixit-engine.js', 'dixit-sync.js', 'dixit-ui.js', 'hub-executor.js']) {
        const matches = sources.filter(src => new URL(src, hub).pathname === '/' + file);
        if (matches.length !== 1 || new URL(matches[0], hub).searchParams.get('v') !== cacheVersion) throw new Error('Missing/current script cache URL: ' + entry + ' / ' + file);
      }
      if (!html.includes('life-story.css?v=' + cacheVersion)) throw new Error('Stale Life Story stylesheet cache: ' + entry);
    }
  }
  const files = [...new Set([...entries, ...browserAssets, ...deck.cards.map(card => card.image),
    ...(args.includes('--preserve-games') ? [...preservedAssets, ...(deck.legacyCards || []).map(card => card.image)] : [])])];
  for (const file of files) if (!fs.statSync(path.join(root, file)).isFile()) throw new Error('Missing browser asset: ' + file);
  return { files, roomEntries };
}

function url(base, pathname) {
  const target = new URL(pathname, base); target.searchParams.set('release', release); return target;
}
async function get(base, pathname, options = {}) {
  return fetch(url(base, pathname), { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(30000), ...options });
}
async function parallel(items, task, concurrency = 4) {
  let cursor = 0;
  const result = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try { result.push(await task(item)); }
      catch (error) { result.push({ item, valid: false, error: error.message }); }
    }
  }));
  return result;
}

async function main() {
  const { files, roomEntries } = localManifest();
  console.log(`LOCAL RELEASE MANIFEST: ${files.length} browser assets, 126 existing images, 96 private server questions, ${roomEntries} current Room entry URLs`);
  if (args.includes('--check-local')) return;
  const assets = await parallel(files, async file => {
    const response = await get(hub, file), bytes = Buffer.from(await response.arrayBuffer());
    return { file, status: response.status, valid: response.ok && sha256(bytes, file) === sha256(fs.readFileSync(path.join(root, file)), file) };
  });
  for (const failure of assets.filter(result => !result.valid)) console.log('NOT CURRENT', failure);
  console.log(`LIFE STORY PRODUCTION ASSETS ${assets.filter(result => result.valid).length}/${files.length}`);

  const healthResponse = await get(service, 'api/hub-executor', { headers: { Origin: new URL(hub).origin } });
  let health; try { health = await healthResponse.json(); } catch {}
  const healthy = healthResponse.status === 200 && health?.ready === true && health?.version === 1 &&
    healthResponse.headers.get('x-icebreak-life-story') === '1' &&
    healthResponse.headers.get('access-control-allow-origin') === new URL(hub).origin &&
    (healthResponse.headers.get('access-control-expose-headers') || '').toLowerCase().includes('x-icebreak-life-story');
  console.log('LIFE STORY SERVICE READY', { status: healthResponse.status, ready: health?.ready ?? null,
    releaseHeader: healthResponse.headers.get('x-icebreak-life-story'), valid: healthy });

  const cors = await get(service, 'api/hub-executor', { method: 'OPTIONS', headers: {
    Origin: new URL(hub).origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' } });
  const corsValid = cors.status === 204 && cors.headers.get('access-control-allow-origin') === new URL(hub).origin &&
    (cors.headers.get('access-control-allow-methods') || '').includes('POST') &&
    (cors.headers.get('access-control-allow-headers') || '').toLowerCase().includes('content-type');
  const invalid = await get(service, 'api/hub-executor', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(hub).origin },
    body: JSON.stringify({ operation: 'execute', capsule: 'invalid-synthetic-ticket', token: '1'.repeat(32) }) });
  let invalidBody; try { invalidBody = await invalid.json(); } catch {}
  const rejected = invalid.status === 403 && invalidBody?.error === 'invalid_ticket';
  const deniedOrigin = await get(service, 'api/hub-executor', { headers: { Origin: 'https://invalid-verifier.example' } });
  let deniedBody; try { deniedBody = await deniedOrigin.json(); } catch {}
  const denied = deniedOrigin.status === 403 && deniedBody?.error === 'origin_denied';
  console.log('SERVICE CORS / SYNTHETIC REJECTION', { cors: corsValid, badTicket: rejected, foreignOrigin: denied });

  const paths = [hub, service].flatMap(base => privatePaths.map(file => ({ base, file })));
  const blocked = await parallel(paths, async ({ base, file }) => {
    const response = await get(base, file);
    // Do not consume an accidentally public server-source body.
    await response.body?.cancel();
    return { origin: new URL(base).origin, file, status: response.status, valid: response.status === 404 };
  });
  for (const failure of blocked.filter(result => !result.valid)) console.log('PRIVATE PATH NOT BLOCKED', failure);
  console.log(`PRIVATE RUNTIME / QUESTION ASSETS BLOCKED ${blocked.filter(result => result.valid).length}/${paths.length}`);
  if (assets.some(result => !result.valid) || blocked.some(result => !result.valid) || !healthy || !corsValid || !rejected || !denied) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
