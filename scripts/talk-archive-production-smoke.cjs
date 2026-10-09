// Real service + private archive verification, using fresh owned fixtures only.
// Run through private env-run; never pass, save or log the encryption key.
'use strict';
const crypto = require('node:crypto');
const E = require('../talk-engine.js');
const { createStore, DEFAULT_DB } = require('../runtime/talk-archive-store.cjs');
const { run: readArchive } = require('./talk-read-archive.cjs');
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const clone = v => structuredClone(v), uid = () => crypto.randomBytes(16).toString('hex');
async function run({ env = process.env, fetchImpl = globalThis.fetch, delay = ms => new Promise(r => setTimeout(r, ms)), now = Date.now } = {}) {
  const report = { ok: false, checks: 0, cleaned: 0, cleanupFailed: 0, step: 'initial' };
  const secret = env.CRAZY_TALK_ARCHIVE_SECRET;
  if (!/^[a-f0-9]{64}$/i.test(secret || '')) return { ...report, error: 'archive_key_unavailable' };
  const store = createStore({ secret, fetchImpl }), code = 'QHA' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const marker = uid(), control = uid(), initialSession = code + ':test';
  const seats = [1, 2].map(playerNum => ({ playerNum, token: crypto.randomBytes(10).toString('hex') }));
  const node = num => 'rooms/' + code + '/players/' + (num === 0 ? control : seats[num - 1].token);
  const archivePath = 'rooms/talk-archive/players/' + crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update('crazy-talk-archive-room-v1:' + code).digest('hex');
  const initialized = new Set(), ownedSession = id => typeof id === 'string' && (id === initialSession || id.startsWith(initialSession + ':topic:'));
  const check = condition => { if (!condition) throw new Error('smoke_failed'); report.checks++; };
  const url = path => DEFAULT_DB + '/' + path + '.json';
  const http = (target, options = {}) => fetchImpl(target, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000), ...options });
  async function snapshot(path) {
    const response = await http(url(path), { headers: { 'X-Firebase-ETag': 'true' } });
    check(response.ok); const etag = response.headers.get('etag'); check(!!etag);
    return { value: await response.json(), etag };
  }
  async function put(path, value, etag) {
    const response = await http(url(path), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': etag }, body: JSON.stringify(value) });
    check(response.ok); return response;
  }
  async function api(body) {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json(); check(response.ok && !data.error); return data;
  }
  async function current() { return (await snapshot(node(0))).value.state; }
  let seq = 0;
  async function command(actor, type, extra = {}) {
    const card = (await snapshot(node(actor))).value, state = await current();
    await api({ operation: 'execute', capsule: card.hubExecutor.capsule, token: seats[actor - 1].token,
      command: { id: 'archive-qa-' + ++seq, type, sessionId: state.sessionId, turnId: state.turnId, ...extra } });
    const result = (await snapshot(node(actor))).value;
    check(result.talk.reply?.error === ''); return result;
  }
  try {
    report.step = 'fresh-fixture';
    const emptyArchive = await snapshot(archivePath); check(emptyArchive.value == null); initialized.add(archivePath);
    const state = E.create({ id: initialSession, topic: { question: 'Invent a silly restaurant together.' }, now: now(),
      roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Archive QA ' + s.playerNum })), gameMode: 'crazy',
      crazySource: 'players', crazyMinSeconds: 5, crazyMaxSeconds: 5, crazyTaskSeconds: 30, gameSeconds: 900, conversationMode: 'free' });
    for (const num of [0, 1, 2]) {
      const path = node(num), before = await snapshot(path); check(before.value == null);
      const data = num === 0 ? { game: 'letstalk', state, revision: 1 } : E.view(state, num, now());
      initialized.add(path); await put(path, { ...data, qaArchive: { marker } }, before.etag);
    }
    await api({ operation: 'register', game: 'letstalk', code, controlToken: control, sessionId: initialSession, seats });
    report.step = 'queued-private';
    await command(1, 'crazyAssign', { text: 'Cluck like a tiny chicken.', kind: 'task', target: 2 });
    let records = await store.readRoom(code); check(records.length === 1 && records[0].status === 'queued');
    check(records[0].text === 'Cluck like a tiny chicken.' && records[0].author.name === 'Archive QA 1' && records[0].target.playerNum === 2);
    for (const num of [1, 2]) {
      const card = (await snapshot(node(num))).value;
      check(!JSON.stringify(card).includes('challengeArchive') && !JSON.stringify(card).includes('archiveId'));
      check(!JSON.stringify(card).includes('Cluck like a tiny chicken.'));
    }
    await command(1, 'start'); await delay(5500);
    const driver = (await snapshot(node(2))).value;
    await api({ operation: 'execute', capsule: driver.hubExecutor.capsule, token: seats[1].token, clock: true });
    const recipient = (await snapshot(node(2))).value; check(recipient.talk.crazy.prompt?.source === 'player');
    check(recipient.talk.crazy.prompt.text === 'Cluck like a tiny chicken.');
    records = await store.readRoom(code); check(records[0].status === 'pending' && records[0].recipient.playerNum === 2);
    report.step = 'completed';
    await command(2, 'crazyDone', { promptId: recipient.talk.crazy.prompt.id });
    records = await store.readRoom(code); check(records[0].status === 'done' && Number.isFinite(records[0].closedAt));
    check((await current()).scores[2] === 1);
    report.step = 'new-topic-cancelled';
    await command(1, 'newTopic', { confirm: true, topic: { question: 'Invent a funny pet together.' }, gameMode: 'crazy', mode: 'think', seconds: 45, showStarters: true, conversationMode: 'free', crazySeconds: 120, gameSeconds: 900, crazyTaskSeconds: 30, crazySource: 'players', crazyMinSeconds: 300, crazyMaxSeconds: 300 });
    await command(1, 'crazyAssign', { text: 'Say meow in a sad voice.', kind: 'task' });
    records = await store.readRoom(code); check(records.length === 2 && records.some(r => r.status === 'queued' && r.target === null));
    await command(1, 'start'); await command(1, 'finish');
    records = await store.readRoom(code); check(records.some(r => r.status === 'done') && records.some(r => r.status === 'cancelled'));
    check((await current()).challengeArchive.records == null || (await current()).challengeArchive.records.length === 0);
    report.step = 'survives-game-switch';
    for (const num of [1, 2]) {
      const before = await snapshot(node(num)); check(before.value.qaArchive?.marker === marker);
      await put(node(num), { game: 'taboo', playerNum: num, name: 'Archive QA ' + num, qaArchive: { marker } }, before.etag);
    }
    check((await store.readRoom(code)).length === 2);
    let output = '', errors = '';
    const result = await readArchive(['--room', code], { env: { CRAZY_TALK_ARCHIVE_SECRET: secret }, fetchImpl,
      stdout: text => output += text, stderr: text => errors += text });
    check(result === 0 && !errors); const readBack = JSON.parse(output);
    check(readBack.count === 2 && readBack.total === 2);
    check(!output.includes(secret) && !output.includes(control) && !output.includes('cipher') && !output.includes('sessionId'));
    report.ok = true; report.step = 'complete';
  } catch { report.error = 'smoke_failed'; }
  finally {
    // Exact conditional deletion only. Prove every value is this fixture's.
    for (const path of [...initialized].reverse()) {
      try {
        const before = await snapshot(path);
        if (before.value == null) continue;
        if (path === archivePath) {
          const records = await store.readRoom(code);
          if (!records.length || !records.every(r => ownedSession(r.sessionId) && r.author?.name === 'Archive QA 1')) throw new Error();
        } else if (before.value.qaArchive?.marker !== marker) throw new Error();
        await put(path, null, before.etag); report.cleaned++;
      } catch { report.cleanupFailed++; }
    }
    if (report.cleanupFailed) report.ok = false;
  }
  return report;
}
module.exports = { run };
if (require.main === module) run().then(report => { console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1; }).catch(() => { console.log(JSON.stringify({ ok: false, error: 'smoke_failed' })); process.exitCode = 1; });
