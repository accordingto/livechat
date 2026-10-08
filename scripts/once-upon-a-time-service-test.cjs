// Opt-in production check: only cryptographically fresh, exact token nodes.
// No existing room reads, parent deletes, credential logging or host browser.
'use strict';
const { randomBytes } = require('node:crypto');
const ENGINE = require('../once-upon-a-time-engine.js');
const DECK = require('../once-upon-a-time-deck.js');
const DATABASE = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const SERVICE = 'https://icebreaker-youtube-search.vercel.app/api/hub-executor';
const uid = () => randomBytes(16).toString('hex');
const must = value => { if (!value) throw new Error('isolated_service_check_failed'); };
async function run() {
  const code = 'OQ' + randomBytes(5).toString('hex').toUpperCase(), marker = uid(), control = uid();
  const session = 'once-qa-' + uid(), seats = [1,2,3,4,5,6].map(playerNum => ({ playerNum, token: uid() }));
  const paths = [control, ...seats.map(s => s.token)].map(token => 'rooms/' + code + '/players/' + token);
  const attempted = new Set(), report = { ok: false, stage: 'health', checks: 0, cleaned: 0, cleanupFailed: 0 };
  const check = value => { must(value); report.checks++; };
  const http = (url, options = {}) => fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(20000), ...options });
  const stateOf = node => node?.state || (node?.stateJson ? JSON.parse(node.stateJson) : null);
  const owned = (node, num) => node?.qaOnce?.marker === marker && node.game === 'onceupon'
    && (num === 0 ? stateOf(node)?.sessionId : node.once?.sessionId) === session
    && (num === 0 || node.playerNum === num);
  async function read(num) {
    must(Number.isInteger(num) && num >= 0 && num < paths.length);
    const response = await http(DATABASE + '/' + paths[num] + '.json', { headers: { 'X-Firebase-ETag': 'true' } });
    must(response.ok); const etag = response.headers.get('etag'); must(etag);
    return { value: await response.json(), etag };
  }
  async function write(num, update, create = false) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const old = await read(num); must(create ? old.value === null : owned(old.value, num));
      const next = update(old.value); attempted.add(num);
      const response = await http(DATABASE + '/' + paths[num] + '.json', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': old.etag }, body: JSON.stringify(next)
      });
      if (response.status === 412 && !create) continue;
      must(response.ok); return;
    }
    must(false);
  }
  async function api(body) {
    const response = await http(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    must(response.ok); return response.json();
  }
  async function card(num) {
    const value = (await read(num)).value; must(owned(value, num));
    must(value.hubExecutor?.v === 1 && value.hubExecutor.game === 'onceupon'
      && value.hubExecutor.sessionId === session && value.once.sharedControls === true);
    const serialized = JSON.stringify(value);
    must(!serialized.includes(JSON.stringify(control)));
    for (const seat of seats.filter(s => s.playerNum !== num)) must(!serialized.includes(JSON.stringify(seat.token)));
    return value;
  }
  async function command(num, type, extra = {}) {
    const value = await card(num), action = { id: uid(), type, sessionId: session, turnId: value.once.turnId, ...extra };
    await write(num, old => ({ ...old, onceAction: action }));
    await api({ operation: 'execute', capsule: value.hubExecutor.capsule, token: seats[num - 1].token });
    const next = await card(num); check(next.once.reply?.id === action.id && next.once.reply.error === '');
    return next;
  }
  try {
    const response = await http(SERVICE), health = await response.json(); check(response.ok && health.ready === true);
    report.stage = 'isolated-registration';
    const now = Date.now(), state = ENGINE.create({ id: session, seed: randomBytes(4).readUInt32LE(), now,
      roster: seats.map(s => ({ playerNum: s.playerNum, name: 'Temporary Once player ' + s.playerNum })) });
    // Prove null with ETag immediately before every creation; never replace an existing node.
    await write(0, () => ({ game: 'onceupon', stateJson: JSON.stringify(state), revision: 1, qaOnce: { marker } }), true);
    for (const seat of seats) await write(seat.playerNum, () => ({ ...ENGINE.view(state, seat.playerNum, now), qaOnce: { marker } }), true);
    await api({ operation: 'register', game: 'onceupon', code, controlToken: control, sessionId: session, seats });
    report.stage = 'server-deal';
    const dealt = await command(1, 'deal');
    check(dealt.once.phase === 'CHOOSING_FIRST');
    check(dealt.once.deckCounts.story === DECK.storyCards.length - 6 * 5 - 1);
    check(dealt.once.deckCounts.ending === DECK.endingCards.length - 6);
    const views = await Promise.all(seats.map(s => card(s.playerNum)));
    const allIds = views.flatMap(v => v.once.hand.map(c => c.id));
    check(new Set(allIds).size === 30);
    check(new Set(views.map(v => v.once.ending.id)).size === 6);
    for (const value of views) {
      check(value.once.hand.length === 5);
      const counts = {};
      for (const c of value.once.hand) counts[c.category] = (counts[c.category] || 0) + 1;
      check(Object.keys(counts).length >= 3 && Math.max(...Object.values(counts)) <= 2);
      const serialized = JSON.stringify(value);
      for (const other of views.filter(v => v.playerNum !== value.playerNum)) {
        for (const c of other.once.hand) check(!serialized.includes(JSON.stringify(c.id)));
        check(!serialized.includes(JSON.stringify(other.once.ending.id)));
      }
    }
    report.stage = 'play-and-reconnect';
    await command(2, 'chooseFirst', { playerNum: 3 });
    const active = await card(3), played = active.once.hand[0].id;
    const next = await command(3, 'play', { cardId: played });
    check(next.once.hand.length === 4 && next.once.history.at(-1).cardId === played);
    check(next.once.deckCounts.story === DECK.storyCards.length - 31);
    const unchanged = (await card(4)).once;
    await api({ operation: 'execute', capsule: (await card(4)).hubExecutor.capsule, token: seats[3].token });
    const reconnected = (await card(4)).once;
    check(JSON.stringify(reconnected.hand) === JSON.stringify(unchanged.hand));
    check(reconnected.ending.id === unchanged.ending.id);
    report.ok = true; report.stage = 'passed';
  } catch (_) { report.ok = false; }
  finally {
    // Exact proven-owned nodes only. A foreign marker/session or ETag race is left untouched.
    for (const num of attempted) {
      try {
        const old = await read(num); if (old.value === null) continue; must(owned(old.value, num));
        const response = await http(DATABASE + '/' + paths[num] + '.json', { method: 'DELETE', headers: { 'If-Match': old.etag } });
        must(response.ok); check((await read(num)).value === null); report.cleaned++;
      } catch (_) { report.cleanupFailed++; report.ok = false; }
    }
  }
  return report;
}
module.exports = { run };
if (require.main === module) {
  if (process.env.ONCE_UPON_SERVICE_TEST !== '1') throw new Error('Set ONCE_UPON_SERVICE_TEST=1 to create and clean an isolated production service game.');
  run().then(report => { process.stdout.write(JSON.stringify(report) + '\n'); if (!report.ok) process.exitCode = 1; })
    .catch(() => { process.stdout.write('{"ok":false,"stage":"failed"}\n'); process.exitCode = 1; });
}
