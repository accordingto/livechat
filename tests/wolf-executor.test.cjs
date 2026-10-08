'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { Client, stamp } = require('../chat-wolf-sync.js');
const { adapters: { chatwolf: A } } = require('../runtime/wolf-executor.cjs');
const { createExecutor, unseal, keyFrom } = require('../runtime/hub-executor-core.cjs');
const E = require('../chat-wolf-engine.js');
const clone = value => value == null ? null : structuredClone(value);
function storage() { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) }; }
class Store {
  constructor() { this.values = new Map(); this.writes = 0; this.failJournalPath = null; this.failedJournal = null; }
  async get(path) { const value = clone(this.values.get(path)); return { value, etag: createHash('sha256').update(JSON.stringify(value)).digest('hex') }; }
  async put(path, value, etag) {
    const old = this.values.get(path) || null;
    if (etag && etag !== createHash('sha256').update(JSON.stringify(old)).digest('hex')) return { conflict: true };
    this.values.set(path, clone(value)); this.writes++;
    if (path === this.failJournalPath && value.historyTransactionId && value.historyTransactionId !== old.historyTransactionId) {
      this.failJournalPath = null; this.failedJournal = clone(value); throw new Error('lost room commit response');
    }
    return { value: clone(value) };
  }
  fetch = async (url, options = {}) => {
    const path = new URL(url).pathname.replace(/^\//, '').replace(/\.json$/, '');
    const method = options.method || 'GET', headers = new Headers(options.headers);
    if (method === 'GET') { const read = await this.get(path); return new Response(JSON.stringify(read.value), { status: 200, headers: { etag: read.etag } }); }
    const write = await this.put(path, JSON.parse(options.body), headers.get('if-match'));
    return new Response(JSON.stringify(write.value || null), { status: write.conflict ? 412 : 200 });
  };
}
async function setup(t, { settings = {}, store = new Store(), hostStorage = storage(), sourceCode = 'ABC234', playerCount = 6, registerViaCore = false, connectOriginal = true } = {}) {
  let now = 1000000;
  const host = new Client({ store, storage: hostStorage, clock: () => now, interval: 100000 });
  const legacy = { code: sourceCode, playerCount, tokens: Array.from({ length: playerCount }, (_, i) => (i + 1).toString(16).repeat(20)), names: Array.from({ length: playerCount }, (_, i) => String.fromCharCode(65 + i)) };
  const made = await host.create({ name: 'A', legacy, hostSeat: 0, settings: { mode: 'free-chat-v3', playerCount, wolfCount: 2, ...settings } });
  if (connectOriginal) await host.connectCards();
  else for (const token of legacy.tokens) await store.put('rooms/' + legacy.code + '/players/' + token, { game:'cut',cut:{sessionId:'previous-cut-session',phase:'speaking'} });
  host.close();
  const code = made.state.public.code, controlToken = host.host.control, canonicalPath = host.path(code, controlToken);
  let raw = (await store.get(canonicalPath)).value, data = A.decode(raw);
  const seats = data.cardLinks.map(link => ({ playerNum: link.playerNum, token: link.token, path: host.path(code, link.token) }));
  let ticket, capsule, service;
  if (registerViaCore) {
    const secret = '34'.repeat(32);
    service = createExecutor({ secret, databaseURL: 'http://localhost', fetchImpl: store.fetch, now: () => now, games: { chatwolf: A } });
    const registered = await service.register({ game: 'chatwolf', code, controlToken, seats });
    capsule = registered.capsule; ticket = unseal(capsule, keyFrom(secret));
  } else {
    const sessionId = A.session(data);
    ticket = { game: 'chatwolf', code, canonicalPath, controlToken, seats, sessionId, epoch: randomUUID() };
    capsule = 'synthetic-sealed-ticket-' + randomUUID();
    A.validateRegistration(data, ticket);
    await store.put(canonicalPath, { ...A.encode(raw, data), owner: 'server', leaseUntil: 0, executor: { v: 1, game: 'chatwolf', sessionId, epoch: ticket.epoch, capsule, presence: {}, createdAt: now } });
  }
  const players = seats.map(seat => ({ ...seat, client: new Client({ store, storage: storage(), clock: () => now, allowHostRecovery: false }) }));
  t.after(() => { host.close(); players.forEach(p => p.client.close()); });
  const pulse = (num = 2) => { const body = { capsule, token: num ? seats[num - 1].token : controlToken }; return service ? service.execute(body) : A.customExecute({ ticket, body, databaseURL: 'https://test.firebaseio.com', fetchImpl: store.fetch, now }); };
  async function queue(action, num = 2, payload = {}) {
    const ref = seats[num - 1].path, old = await store.get(ref), card = old.value, view = JSON.parse(card.view), current = A.decode((await store.get(canonicalPath)).value).room;
    const id = randomUUID().replace(/-/g, '');
    const body = { ...payload, action, matchId: current.matchId, phaseVersion: current.phaseVersion };
    const request = { seq: (card.reply?.seq || 0) + 1, id, context: stamp(current), body, bodyJson: JSON.stringify(body) };
    await store.put(ref, { ...card, request }, old.etag); return request;
  }
  async function act(action, num = 2, payload = {}) { await queue(action, num, payload); await pulse(num); return (await store.get(seats[num - 1].path)).value.reply; }
  await pulse();
  return { host, players, seats, store, code, ticket, capsule, canonicalPath, pulse, queue, act, service, legacy,
    async raw() { return (await store.get(canonicalPath)).value; }, async data() { return A.decode(await this.raw()); },
    async view(num) { return JSON.parse((await store.get(seats[num - 1].path)).value.view); }, advance(ms) { now += ms; }, now: () => now };
}
test('host closed: private original cards use complete coordinator, scoped allocation and shared management without role transfer', async t => {
  const f = await setup(t);
  const reply = await f.act('startGame', 2); assert.equal(reply.error, null);
  const data = await f.data(), raw = await f.raw(), scope = (await f.store.get('rooms/chatwolf-history/players/' + data.historyScopeToken)).value;
  assert.equal(data.room.phase, 'ROLE_REVEAL'); assert.equal(data.room.hostPlayerId, data.channels[f.seats[0].token].playerId);
  const participant = await f.view(2); assert.equal(participant.private.isHost, false); assert.equal(participant.private.canManage, true); assert.equal(participant.private.actions.canBeginTalk, true);
  const history = JSON.parse(scope.data); assert.equal(history.pending, null); assert.equal(history.history.deals.length, 1); assert.equal(history.history.deals[0].matchId, data.room.matchId);
  assert.equal(raw.executor.capsule, f.capsule); assert.equal(raw.executor.epoch, f.ticket.epoch); assert.ok(raw.historyTransactionId);
  const result = await f.pulse(0), publicHost = JSON.parse(result.payload.view); assert.equal(publicHost.private.role, null); assert.equal(publicHost.private.tasks, null); assert.equal(publicHost.private.wolfTeam, null);
  assert.equal((await f.act('beginTalk', 3)).error, null); assert.equal((await f.data()).room.phase, 'TALK');
});
test('server preserves real deadlines after host lease expires and completes meetings/votes with offline cards', async t => {
  const f = await setup(t, { settings: { talkEndBehavior: 'automatic', talkSeconds: 30, roundCount: 2, wrapUpSeconds: 0, clueSeconds: 0, meetingTurnSeconds: 10, voteSeconds: 10 } });
  await f.act('startGame'); await f.act('beginTalk');
  const before = await f.data(), deadline = before.room.deadlineAt;
  f.advance(deadline - f.now() + 65000); await f.pulse(2);
  assert.notEqual((await f.data()).room.phase, 'TALK', 'server does not move an expired deadline into the future');
  for (let i = 0; i < 45 && (await f.data()).room.phase !== 'FINISHED'; i++) {
    const room = (await f.data()).room;
    assert.ok(room.deadlineAt != null, room.phase + ' has a deadline');
    f.advance(Math.max(1, room.deadlineAt - f.now())); await f.pulse(2);
  }
  const final = (await f.data()).room; assert.equal(final.phase, 'FINISHED'); assert.ok(final.result);
  assert.ok(final.voteHistory.length); assert.ok((await f.store.get(f.seats[1].path)).value.hubExecutor.absentNums.includes(1));
});
test('private tasks and votes retain actor identity; service never publishes canonical keys or another role', async t => {
  const f = await setup(t); await f.act('startGame'); await f.act('beginTalk');
  const views = await Promise.all(f.seats.map((_, i) => f.view(i + 1))), wolves = views.filter(v => v.private.role === 'WOLF');
  assert.equal(wolves.length, 2);
  const villagerNum = views.findIndex(v => v.private.role !== 'WOLF') + 1, task = wolves[0].private.tasks[0];
  assert.equal((await f.act('completeTask', villagerNum, { taskId: task.id, role: 'WOLF', playerId: wolves[0].private.playerId })).error, 'TASK_NOT_AVAILABLE');
  for (let i = 0; i < views.length; i++) {
    const card = (await f.store.get(f.seats[i].path)).value;
    assert.ok(card.hubExecutor); assert.equal(card.hubExecutor.capsule, f.capsule);
    assert.ok(!JSON.stringify(card).includes(f.ticket.controlToken)); assert.ok(!JSON.stringify(card).includes((await f.data()).historyScopeToken));
    for (const other of f.seats.filter(s => s.token !== f.seats[i].token)) assert.ok(!JSON.stringify(card).includes(other.token));
    if (views[i].private.role !== 'WOLF') assert.ok(!card.view.includes(task.text));
  }
});
test('browser cannot resume authority after server registration, and stale ticket epoch cannot write', async t => {
  const f = await setup(t); await f.act('startGame'); const initial = await f.raw(), before = f.store.writes;
  f.advance(120000); f.host.stopped = false; await f.host.runCycle();
  assert.equal(f.store.writes, before); assert.deepEqual(await f.raw(), initial);
  await f.store.put(f.canonicalPath, { ...initial, executor: { ...initial.executor, epoch: randomUUID() } });
  const writes = f.store.writes; await assert.rejects(f.pulse(), { code: 'stale_session' }); assert.equal(f.store.writes, writes);
});
test('wrong player, forged bare action and wrong seat ordering do not reach the coordinator', async t => {
  const f = await setup(t), before = f.store.writes;
  const opts = { ticket: f.ticket, body: { capsule: f.capsule, token: '0'.repeat(64) }, databaseURL: 'https://test.firebaseio.com', fetchImpl: f.store.fetch, now: f.now() };
  await assert.rejects(A.customExecute(opts), { code: 'wrong_player' });
  await assert.rejects(A.customExecute({ ...opts, body: { capsule: f.capsule, token: f.seats[1].token, command: { action: 'startGame', playerId: 'host' } } }), { code: 'mailbox_required' });
  assert.throws(() => A.validateRegistration({}, f.ticket));
  const data = await f.data(); assert.throws(() => A.validateRegistration(data, { ...f.ticket, seats: [...f.seats].reverse() }), { code: 'invalid_roster' });
  assert.equal(f.store.writes, before);
});
test('lost journal commit response recovers deterministically before restart allocation, without losing executor epoch', async t => {
  const f = await setup(t); await f.queue('startGame'); f.store.failJournalPath = f.canonicalPath;
  await assert.rejects(f.pulse(), { code: 'NETWORK' });
  const persisted = await f.raw(), firstMatch = A.decode(persisted).room.matchId;
  assert.equal(persisted.executor.capsule, f.capsule); assert.equal(persisted.executor.epoch, f.ticket.epoch);
  const key = 'rooms/chatwolf-history/players/' + A.decode(persisted).historyScopeToken;
  assert.ok(JSON.parse((await f.store.get(key)).value.data).pending);
  await f.pulse(); assert.equal((await f.view(2)).public.matchId, firstMatch);
  await f.act('restart', 2, { keepTopic: true });
  const after = await f.data(), history = JSON.parse((await f.store.get(key)).value.data);
  assert.notEqual(after.room.matchId, firstMatch); assert.equal(history.pending, null);
  assert.equal(history.history.deals.filter(d => d.matchId === firstMatch).length, 1); assert.equal(history.history.deals.length, 2);
  assert.equal((await f.raw()).executor.sessionId, f.ticket.sessionId);
});
test('two server rooms retain shared HistoryScope allocation fencing and independent canonical authority', async t => {
  const store = new Store(), hostStorage = storage(), a = await setup(t, { store, hostStorage }), b = await setup(t, { store, hostStorage, sourceCode: 'DEF234' });
  assert.equal((await a.data()).historyScopeToken, (await b.data()).historyScopeToken);
  await a.queue('startGame'); await b.queue('startGame');
  await Promise.allSettled([a.pulse(), b.pulse()]); await a.pulse(); await b.pulse();
  const first = await a.data(), second = await b.data(), scope = JSON.parse((await store.get('rooms/chatwolf-history/players/' + first.historyScopeToken)).value.data);
  assert.equal(first.room.phase, 'ROLE_REVEAL'); assert.equal(second.room.phase, 'ROLE_REVEAL'); assert.equal(scope.pending, null);
  assert.equal(scope.history.deals.length, 2); assert.equal(new Set(scope.history.deals.map(d => d.matchId)).size, 2);
  assert.equal((await a.raw()).executor.epoch, a.ticket.epoch); assert.equal((await b.raw()).executor.epoch, b.ticket.epoch);
});


test('real core registration seals all twelve original seats, resumes the same session and releases shared controls', async t => {
  const f = await setup(t, { playerCount: 12, registerViaCore: true });
  assert.equal(f.ticket.seats.length, 12); assert.equal(f.ticket.canonicalPath, f.canonicalPath);
  assert.equal(f.ticket.controlToken, f.host.host.control); assert.equal(f.ticket.sessionId, (await f.data()).executorSessionId);
  assert.ok(f.ticket.expiresAt > f.now()); assert.notEqual(f.capsule, f.ticket.controlToken);
  assert.equal((await f.act('startGame', 12)).error, null); assert.equal((await f.data()).room.phase, 'ROLE_REVEAL');
  assert.equal((await f.view(12)).private.isHost, false); assert.equal((await f.view(12)).private.canManage, true);
  const seen = (await f.raw()).executor.originalCardsSeen;
  assert.equal(Object.keys(seen).length, 12);
  const registered = await f.service.register({ game: 'chatwolf', code: f.code, controlToken: f.ticket.controlToken, seats: f.seats });
  assert.equal(registered.capsule, f.capsule); assert.equal(registered.sessionId, f.ticket.sessionId);
  assert.deepEqual((await f.raw()).executor.originalCardsSeen, seen);
  const before = f.store.writes;
  await assert.rejects(f.service.execute({ capsule: f.capsule.slice(0, -1), token: f.seats[11].token }), { code: 'invalid_ticket' });
  await assert.rejects(f.service.register({ game: 'chatwolf', code: f.code, controlToken: f.ticket.controlToken,
    seats: [...f.seats, { playerNum: 13, token: 'a'.repeat(64) }] }), { code: 'invalid_roster' });
  assert.equal(f.store.writes, before);
  await f.service.release({ capsule: f.capsule, token: f.ticket.controlToken });
  assert.equal((await f.raw()).executor, undefined); assert.equal((await f.data()).room.sharedControls, undefined);
});

test('initial old source cards are allowed until published; switching a seen original card fences the old coordinator', async t => {
  const f = await setup(t, { registerViaCore: true, connectOriginal: false });
  await f.pulse(); assert.equal(Object.keys((await f.raw()).executor.originalCardsSeen).length, 0);
  await f.host.connectCards(); await f.pulse();
  assert.equal(Object.keys((await f.raw()).executor.originalCardsSeen).length, 6);
  await f.queue('startGame', 2);
  const before = await f.raw(), cardSnapshots = await Promise.all(f.seats.map(s => f.store.get(s.path)));
  await f.store.put('rooms/' + f.legacy.code + '/players/' + f.legacy.tokens[0], { game: 'onceupon', name: 'A' });
  f.advance(65000);
  await assert.rejects(f.pulse(2), { code: 'game_switched', status: 409 });
  const after = await f.raw(); assert.equal(after.data, before.data); assert.equal(after.revision, before.revision);
  assert.equal((await f.data()).room.phase, 'LOBBY');
  assert.equal((await f.store.get('rooms/chatwolf-history/players/' + (await f.data()).historyScopeToken)).value, null);
  for (let i = 0; i < f.seats.length; i++) assert.deepEqual((await f.store.get(f.seats[i].path)).value, cardSnapshots[i].value);
});

test('original private client commands wake the server and receive guarded replies without the host browser', async t => {
  const f = await setup(t, { registerViaCore: true }), original = globalThis.HUB_EXECUTOR, observed = [];
  let wakes = 0;
  globalThis.HUB_EXECUTOR = {
    observe(card, token) { observed.push({ card, token }); },
    pulse() { wakes++; return f.pulse(2); }
  };
  t.after(() => { if (original === undefined) delete globalThis.HUB_EXECUTOR; else globalThis.HUB_EXECUTOR = original; });
  const player = f.players[1].client, display = await player.read(f.code, f.seats[1].token);
  assert.equal(display.private.isHost, false); assert.equal(display.private.canManage, true);
  const started = await player.command(f.code, f.seats[1].token, { action: 'startGame' }, display);
  assert.equal(started.public.phase, 'ROLE_REVEAL'); assert.equal(started.private.isHost, false);
  assert.ok(['WOLF', 'VILLAGER', 'JESTER'].includes(started.private.role)); assert.ok(wakes > 0);
  assert.ok(observed.some(item => item.card.request?.body?.action === 'startGame' && item.card.hubExecutor?.capsule === f.capsule));
  assert.ok(observed.every(item => item.token === f.seats[1].token));
  const begun = await player.command(f.code, f.seats[1].token, { action: 'beginTalk' }, started);
  assert.equal(begun.public.phase, 'TALK'); assert.equal((await f.data()).room.hostPlayerId, started.public.players.find(p => p.isHost).id);
});


test('legacy saved speaking rounds allow an authenticated remaining player to skip absent speakers', async t => {
  const f = await setup(t, { settings:{mode:'classic'} });
  for (let n=1;n<=6;n++) assert.equal((await f.act('ready',n,{ready:true})).error,null);
  assert.equal((await f.act('startGame',2)).error,null);
  assert.equal((await f.act('beginTalk',2)).error,null);
  let room=(await f.data()).room;
  const oldSpeaker=room.currentRoundState.order[room.currentRoundState.speakerIndex];
  const data=await f.data(), remaining=f.seats.find(s=>data.channels[s.token].playerId!==oldSpeaker && data.channels[s.token].playerId!==room.hostPlayerId);
  assert.ok(remaining);
  assert.equal((await f.act('endTurn',remaining.playerNum)).error,null);
  room=(await f.data()).room;
  assert.equal(room.phase,'FREE_TALK'); assert.ok(room.currentRoundState.completed[oldSpeaker]);
});


for(const change of ['room','token']){
  test('Wolf same-game original-card rebinding to another '+change+' fences the retained ticket',async t=>{
    const f=await setup(t,{registerViaCore:true}),data=await f.data(),entry=data.cardLinks[0];
    const path='rooms/'+data.legacyRoom+'/players/'+entry.sourceToken,old=(await f.store.get(path)).value;
    const source={...old,hubExecutor:(await f.store.get(f.seats[0].path)).value.hubExecutor,chatWolf:{...old.chatWolf}};
    source.chatWolf[change]=change==='room'?'NEWROOM':'a'.repeat(64);
    await f.store.put(path,source);await f.queue('startGame',2);
    const before=await f.raw(),cards=await Promise.all(f.seats.map(s=>f.store.get(s.path)));
    await assert.rejects(f.pulse(),{code:'game_switched',status:409});
    assert.equal((await f.raw()).data,before.data);assert.equal((await f.raw()).revision,before.revision);
    for(let i=0;i<f.seats.length;i++)assert.deepEqual((await f.store.get(f.seats[i].path)).value,cards[i].value);
  });
}


for(const change of ['game','session']){
  test('Wolf registration baseline fences a source changed before any correct original card was observed: '+change,async t=>{
    const f=await setup(t,{registerViaCore:true,connectOriginal:false}),data=await f.data(),entry=data.cardLinks[0];
    assert.equal(Object.keys((await f.raw()).executor.originalCardsSeen).length,0);
    const path='rooms/'+data.legacyRoom+'/players/'+entry.sourceToken,prior=(await f.store.get(path)).value;
    const source={...prior,hubExecutor:(await f.store.get(f.seats[0].path)).value.hubExecutor,cut:{...prior.cut}};
    if(change==='game'){source.game='onceupon';source.once={sessionId:'another-game-session'};}
    else source.cut.sessionId='another-cut-session';
    await f.store.put(path,source);await f.queue('startGame',2);
    const before=await f.raw(),cards=await Promise.all(f.seats.map(s=>f.store.get(s.path)));
    await assert.rejects(f.pulse(),{code:'game_switched'});
    assert.equal((await f.raw()).data,before.data);assert.equal((await f.raw()).revision,before.revision);
    for(let i=0;i<f.seats.length;i++)assert.deepEqual((await f.store.get(f.seats[i].path)).value,cards[i].value);
    assert.equal((await f.data()).room.phase,'LOBBY');
  });
}
test('Wolf baseline permits previous-game progress and always accepts the expected original-card publication',async t=>{
  const f=await setup(t,{registerViaCore:true,connectOriginal:false});
  for(const token of f.legacy.tokens){
    const path='rooms/'+f.legacy.code+'/players/'+token,source=(await f.store.get(path)).value;
    await f.store.put(path,{...source,hubExecutor:(await f.store.get(f.seats[0].path)).value.hubExecutor,cut:{...source.cut,phase:'break',turnId:100},heartbeat:2000});
  }
  await f.pulse();assert.equal(Object.keys((await f.raw()).executor.originalCardsSeen).length,0);
  await f.host.connectCards();await f.pulse();assert.equal(Object.keys((await f.raw()).executor.originalCardsSeen).length,6);
});
