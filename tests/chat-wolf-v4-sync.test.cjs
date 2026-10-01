'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Client } = require('../chat-wolf-sync.js');
const clone = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k,v) => map.set(k,v), map }; };
class Store {
  constructor() { this.data = {}; }
  async get(path) {
    const value = clone(path.split('/').reduce((v,k) => v?.[k], this.data));
    return { value, etag: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
  }
  async put(path, value, etag) {
    const current = path.split('/').reduce((v,k)=>v?.[k],this.data) ?? null;
    if (etag && createHash('sha256').update(JSON.stringify(current)).digest('hex') !== etag) return { conflict: true };
    const parts = path.split('/'); let node = this.data;
    for (const key of parts.slice(0,-1)) node = node[key] ||= {};
    node[parts.at(-1)] = clone(value); return { value: clone(value) };
  }
}
async function setup(t, options = {}) {
  const store = options.store || new Store(), hostStorage = options.storage || storage();
  let now = 100000;
  const host = new Client({ store, storage: hostStorage, clock: () => now, interval: 10, hostPresentation: true });
  const legacy = { code: 'ABC234', playerCount: 6,
    tokens: Array.from({length:6},(_,i) => String(i+1).repeat(20)),
    names: ['Alex','Blair','Casey','Drew','Ellis','Flynn'] };
  const made = await host.create({ name: 'Alex', legacy, hostSeat: 0,
    settings: { mode:'free-chat-v3', playerCount:6, wolfCount:2, topicId:'topic_v2_01', talkSeconds:30, ...options.settings } });
  const code = made.state.public.code;
  await host.connectCards();
  const players = [];
  for (const source of legacy.tokens) {
    const link = (await store.get('rooms/ABC234/players/' + source)).value.chatWolf;
    const client = new Client({ store, storage: storage(), clock: () => now, allowHostRecovery: false });
    const view = await client.read(code,link.token);
    players.push({ client, token:link.token, id:view.private.playerId });
  }
  const hostPlayer = { client:host, token:made.token, id:made.state.private.playerId };
  t.after(() => [host,...players.map(p=>p.client)].forEach(c=>c.close()));
  const read = p => p.client.read(code,p.token);
  const send = async(p,body) => { await read(p); return p.client.command(code,p.token,body); };
  const data = async() => JSON.parse((await store.get(host.path(code,host.host.control))).value.data);
  const elapse = async ms => { while(ms>0) {const step=Math.min(9000,ms);now+=step;ms-=step;await host.cycle();} };
  return {store,hostStorage,host,hostPlayer,players,code,read,send,data,elapse,
    now:()=>now, jump:ms=>{now+=ms;}};
}
test('v4 synced elapsed talk stays open in overtime, host-only reminder, and a hidden timer changes no state', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'});
  await s.send(s.hostPlayer,{action:'beginTalk'});
  await s.elapse(31000);
  const host = await s.read(s.hostPlayer), player = await s.read(s.players[1]);
  assert.equal(host.public.phase,'TALK'); assert.equal(host.public.deadlineAt,null);
  assert.equal(host.private.talkReminder.due,true);
  assert.equal(player.private.talkReminder,null);
  assert.equal(host.private.role,null);
  assert.equal(host.public.talkClock.activeSince,player.public.talkClock.activeSince);
  const before = (await s.data()).room.talkClock;
  await s.read(s.hostPlayer); await s.read(s.players[1]);
  assert.deepEqual((await s.data()).room.talkClock,before);
  const views = await Promise.all(s.players.map(s.read));
  const wolf = s.players[views.findIndex(v=>v.private.role==='WOLF')];
  await s.send(wolf,{action:'completeTask',taskId:views.find(v=>v.private.role==='WOLF').private.tasks[0].id});
  assert.equal((await s.read(wolf)).private.tasks.filter(v=>v.completed).length,1);
});
test('v4 meeting commands race without skipping two people, and non-speakers cannot end a turn', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'}); await s.send(s.hostPlayer,{action:'beginTalk'});
  await s.send(s.hostPlayer,{action:'endTalk'});
  const first = await s.read(s.hostPlayer), m = first.public.meeting;
  assert.equal(first.public.phase,'MEETING_TURNS'); assert.equal(new Set(m.order).size,6);
  const speaker = s.players.find(p=>p.id===m.currentSpeakerId);
  const other = s.players.find(p=>p.id!==m.currentSpeakerId && p.id!==s.hostPlayer.id);
  await assert.rejects(s.send(other,{action:'endMeetingTurn',meetingId:m.id}));
  await Promise.all([s.read(s.hostPlayer),s.read(speaker)]);
  const results = await Promise.allSettled([
    s.host.command(s.code,s.hostPlayer.token,{action:'skipMeetingTurn',meetingId:m.id}),
    speaker.client.command(s.code,speaker.token,{action:'endMeetingTurn',meetingId:m.id})
  ]);
  assert.ok(results.some(x=>x.status==='fulfilled'));
  const next = await s.read(s.hostPlayer);
  assert.equal(next.public.meeting.speakerIndex,1);
  assert.deepEqual(next.public.meeting.completedPlayerIds,[m.currentSpeakerId]);
  const oldDeadline = next.public.deadlineAt;
  await s.send(s.hostPlayer,{action:'setMeetingTurnSeconds',seconds:20});
  assert.equal((await s.read(s.hostPlayer)).public.deadlineAt,oldDeadline);
  await s.send(s.hostPlayer,{action:'skipMeetingTurn',meetingId:m.id});
  assert.equal((await s.read(s.hostPlayer)).public.meeting.turnSeconds,20);
});
test('same-host new room reuses private committed history; different browser gets a separate scope', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'});
  const first = await s.data(), keys = first.room.tasks.map(x=>x.canonicalTaskKey);
  const shared = s.hostStorage.getItem('chat-wolf-history-scope-v1');
  assert.match(shared,/^[a-f0-9]{64}$/);
  const second = await setup(t,{store:s.store,storage:s.hostStorage});
  await second.send(second.hostPlayer,{action:'startGame'});
  const next = await second.data();
  assert.equal(next.historyScopeToken,shared);
  assert.ok(next.room.tasks.every(x=>!keys.includes(x.canonicalTaskKey)));
  assert.equal(next.room.exposureHistory.deals.length,2);
  for (const p of second.players) {
    const serialized=JSON.stringify(await second.read(p));
    assert.equal(serialized.includes(shared),false);
    assert.equal(serialized.includes('exposureHistory'),false);
  }
  assert.equal(JSON.stringify(s.hostStorage.map.get('chat-wolf-history-scope-v1')).includes('wolfTasks'),false);
  const third = await setup(t,{store:s.store});
  assert.notEqual((await third.data()).historyScopeToken,shared);
});
test('host lease recovery preserves elapsed time, role and scope credential without counting sleeping time', async t => {
  const s = await setup(t);
  await s.send(s.hostPlayer,{action:'startGame'}); await s.send(s.hostPlayer,{action:'beginTalk'});
  await s.elapse(5000); const before = await s.data();
  s.host.close(); s.jump(120000);
  const recovered = new Client({store:s.store,storage:s.hostStorage,clock:s.now,interval:10,hostPresentation:true});
  t.after(()=>recovered.close());
  const view = await recovered.read(s.code,s.hostPlayer.token);
  assert.equal(view.public.phase,'TALK');
  assert.equal(view.public.talkClock.elapsedMs,5000);
  assert.equal(view.public.talkClock.activeSince,s.now());
  const after = JSON.parse((await s.store.get(recovered.path(s.code,recovered.host.control))).value.data);
  assert.equal(after.historyScopeToken,before.historyScopeToken);
  assert.deepEqual(after.room.tasks,before.room.tasks);
  assert.deepEqual(after.room.exposureHistory,before.room.exposureHistory);
});
