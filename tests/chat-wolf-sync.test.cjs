'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Client, FirebaseREST, stamp } = require('../chat-wolf-sync.js');
const E = require('../chat-wolf-engine.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v) }; };
const copy = x => x === undefined ? null : JSON.parse(JSON.stringify(x));
test('REST calls browser fetch without an illegal receiver', async () => {
  let receiver;
  const store = new FirebaseREST('https://example.invalid', async function () {
    receiver = this;
    if (this !== undefined) throw new TypeError('Illegal invocation');
    return { ok: true, status: 200, headers: { get: () => 'null_etag' }, json: async () => null };
  });
  assert.deepEqual(await store.get('test'), { value: null, etag: 'null_etag' });
  assert.equal(receiver, undefined);
});
test('REST requires an exposed ETag before any conditional update', async () => {
  const store = new FirebaseREST('https://example.invalid', async () => ({
    ok: true, status: 200, headers: { get: () => null }, json: async () => null,
  }));
  await assert.rejects(store.get('test'), { code: 'NETWORK' });
});
// Firebase-compatible ETag store, including omitted null/empty containers.
class Store {
  constructor() { this.data = {}; this.version = 0; }
  async get(path) {
    const value = copy(path.split('/').reduce((v,k) => v?.[k], this.data));
    return { value, etag: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
  }
  async put(path, value, etag) {
    const current = copy(path.split('/').reduce((v,k) => v?.[k], this.data));
    if (etag !== undefined && etag !== createHash('sha256').update(JSON.stringify(current)).digest('hex')) return { conflict: true };
    const parts = path.split('/'); let parent = this.data;
    for (const part of parts.slice(0,-1)) parent = parent[part] ||= {};
    parent[parts.at(-1)] = copy(value); this.version++;
    return { value: copy(value) };
  }
}
async function setup(t, count = 6) {
  const store = new Store(); const hostStorage = storage();
  let now = 1000000;
  const host = new Client({ store, storage: hostStorage, clock: () => now, interval: 25 });
  const created = await host.create({ name: 'Host', settings: { playerCount: count, wolfCount: 2 } });
  const code = created.state.public.code;
  const clients = [{ client: host, token: created.token, id: created.state.private.playerId }];
  t.after(() => clients.forEach(p => p.client.close()));
  for (let i = 1; i < count; i++) {
    const client = new Client({ store, storage: storage(), clock: () => now });
    const joined = await client.join({ room: code, name: `Player ${i}` });
    clients.push({ client, token: joined.token, id: joined.state.private.playerId });
  }
  const read = async p => p.client.read(code, p.token);
  const send = async (p, body) => { await read(p); return p.client.command(code, p.token, body); };
  const canonical = async () => JSON.parse((await store.get(host.path(code, host.host.control))).value.data);
  return { store, host, hostStorage, clients, code, read, send, canonical, clock: () => now, advance: ms => { now += ms; } };
}

test('six clients join with encrypted tokens; two wolves share notes and villagers get only their cards', async t => {
  const s = await setup(t);
  for (const p of s.clients) await s.send(p, { action: 'ready', ready: true });
  await s.send(s.clients[0], { action: 'startGame' });
  const views = await Promise.all(s.clients.map(s.read));
  const wolves = s.clients.filter((_,i) => views[i].private.role === 'WOLF');
  const villagers = views.filter(v => v.private.role === 'VILLAGER');
  assert.equal(wolves.length, 2);
  assert.equal((await s.read(wolves[0])).private.tasks.length, 2);
  for (const view of villagers) { assert.equal(view.private.tasks, null); assert.equal(view.private.wolfTeam, null); assert.equal(view.public.reveal, undefined); }
  const roster = JSON.stringify((await s.store.get(s.host.lobby(s.code))).value);
  for (const p of s.clients) assert.equal(roster.includes(p.token), false);
  assert.equal(roster.includes(s.host.host.control), false);
  assert.equal(roster.includes('privateKey'), false);
  const taskId = (await s.read(wolves[0])).private.tasks[0].id;
  await s.send(wolves[0], { action: 'taskNote', taskId, note: '共同備註' });
  assert.equal((await s.read(wolves[1])).private.tasks[0].note, '共同備註');
  const villager = s.clients.find(p => !wolves.includes(p));
  await assert.rejects(s.send(villager, { action: 'taskNote', taskId, note: '偽造', role: 'WOLF', isHost: true }), { code: 'WOLF_ONLY' });
  await assert.rejects(s.send(s.clients[1], { action: 'cancelGame', isHost: true, playerId: s.clients[0].id }), { code: 'HOST_ONLY' });
});

test('simultaneous bell/end commands advance once; stale actions cannot affect the next speaker or a replay', async t => {
  const s = await setup(t, 4);
  for (const p of s.clients) await s.send(p, { action: 'ready', ready: true });
  await s.send(s.clients[0], { action: 'startGame' });
  for (const p of s.clients) await s.send(p, { action: 'ackRole' });
  await Promise.all(s.clients.map(s.read));
  const bells = await Promise.allSettled(s.clients.slice(1,3).map(p => p.client.command(s.code, p.token, { action: 'ringBell' })));
  assert.equal(bells.filter(x => x.status === 'fulfilled').length, 1);
  const room = (await s.canonical()).room;
  const speaker = s.clients.find(p => p.id === room.currentRoundState.order[0]);
  await Promise.all(s.clients.map(s.read));
  const commands = speaker === s.clients[0] ? [speaker, s.clients[1]] : [speaker, s.clients[0]];
  await Promise.allSettled(commands.map(p => p.client.command(s.code,p.token,{ action:'endTurn' })));
  assert.equal((await s.canonical()).room.currentRoundState.speakerIndex, 1);
  const stale = s.clients[0].client.lastView;
  await s.send(s.clients[0], { action: 'cancelGame' });
  await s.send(s.clients[0], { action: 'replay' });
  s.clients[0].client.lastView = stale;
  await assert.rejects(s.clients[0].client.command(s.code,s.clients[0].token,{action:'endTurn'}),{code:'STALE_ACTION'});
  assert.equal((await s.canonical()).room.phase,'LOBBY');
});

test('host replacement restores persisted state, retains remaining time, and fences the older tab', async t => {
  const s = await setup(t, 4);
  for (const p of s.clients) await s.send(p, { action: 'ready', ready: true });
  await s.send(s.clients[0], { action: 'startGame' });
  await s.send(s.clients[0], { action: 'beginTalk' });
  s.host.close(); if (s.host.running) await s.host.running;
  const before = (await s.store.get(s.host.path(s.code,s.host.host.control))).value;
  const room = JSON.parse(before.data).room;
  const replacement = new Client({ store:s.store, storage:s.hostStorage, clock:s.clock, interval:25 });
  t.after(()=>replacement.close());
  await replacement.read(s.code,s.clients[0].token);
  assert.equal((await s.store.get(s.host.path(s.code,s.host.host.control))).value.owner,s.host.owner);
  s.advance(300000);
  await replacement.cycle();
  const after=(await s.store.get(s.host.path(s.code,s.host.host.control))).value;
  assert.equal(after.owner,replacement.owner);
  assert.equal(JSON.parse(after.data).room.deadlineAt-s.clock(),room.deadlineAt-before.lastHostAt);
  assert.equal(JSON.parse(after.data).room.currentRoundState.speakerIndex,0);
  s.host.stopped=false; await s.host.cycle(); s.host.close();
  assert.equal((await s.store.get(s.host.path(s.code,s.host.host.control))).value.owner,replacement.owner);
  assert.equal((await replacement.read(s.code,s.clients[0].token)).private.playerId,s.clients[0].id);
});

test('timeout and host skip use the displayed turn, not the newly advanced turn', async t => {
  const s=await setup(t,4);
  for(const p of s.clients) await s.send(p,{action:'ready',ready:true});
  await s.send(s.clients[0],{action:'startGame'});
  await s.send(s.clients[0],{action:'beginTalk'});
  s.host.close(); if(s.host.running) await s.host.running;
  const path=s.host.path(s.code,s.host.host.control);
  const doc=(await s.store.get(path)).value;
  const room=JSON.parse(doc.data).room;
  // Simulate an active host at the exact timer deadline.
  s.advance(room.deadlineAt-s.clock()); doc.leaseUntil=s.clock()+10000; doc.lastHostAt=s.clock();
  await s.store.put(path,doc);
  const cardPath=s.host.path(s.code,s.clients[0].token), card=(await s.store.get(cardPath)).value;
  card.request={seq:card.reply.seq+1,id:'race',context:stamp(room),body:{action:'endTurn'}};
  await s.store.put(cardPath,card);
  s.host.stopped=false; await s.host.cycle(); s.host.close();
  const next=(await s.canonical()).room;
  assert.equal(next.currentRoundState.speakerIndex,1);
  assert.equal((await s.store.get(cardPath)).value.reply.error,'STALE_ACTION');
});
