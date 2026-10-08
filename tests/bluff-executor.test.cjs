'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bluff-king-engine.js');
const A = require('../runtime/bluff-executor.cjs').adapters.bluffking;
const bank = Array.from({ length: 16 }, (_, i) => ({ id: 'service-topic-' + i, canonicalKnowledgeId: 'service-knowledge-' + i, locale: 'en', term: 'Topic ' + i, publicPrompt: 'Explain this.', hintMode: 'none', publicHints: [], secretAnswer: 'PRIVATE_SERVICE_ANSWER_' + i, supportingFacts: ['Private supporting fact'], revealExplanation: 'Test only', sources: [{ title: 'Test', url: 'https://example.invalid/test' }], verificationStatus: 'verified', enabled: true }));
function fixture(count = 4) {
  let serial = 0;
  const state = E.blankStore(), code = 'OFFBLUFF';
  const hostId = 'host-identity', options = { now: 1000, rng: () => 0, uuid: () => 'service-member-' + ++serial };
  E.applyCommand(state, hostId, { room: code, action: 'create', name: 'Host', participate: false }, bank, options);
  const seats = [], members = { [hostId]: { token: 'f'.repeat(64), historyToken: 'e'.repeat(64) } };
  for (let i = 1; i <= count; i++) {
    const identityId = 'identity-' + i, token = i.toString(16).repeat(64), historyToken = (i + 4).toString(16).repeat(64);
    E.applyCommand(state, identityId, { room: code, action: 'join', name: 'P' + i, participate: true }, bank, options);
    seats.push({ playerNum: i, token, identityId, path: 'rooms/bluffking-' + code + '/players/' + token });
    members[identityId] = { token, historyToken };
  }
  state.transport = { members, cardRoster: seats.map(s => ({ ...s, originalToken: "source-card-0000" + s.playerNum, historyToken: members[s.identityId].historyToken })), accepted: {}, acknowledgements: {}, executorSessionId: 'registered-service-session', publicationRevision: 0 };
  let now = 1000, onlineNums = seats.map(s => s.playerNum), number = 0;
  const ctx = s => ({ code, now, seat: s, actor: s?.playerNum || 0, seats, onlineNums, bank, ...options, now });
  function act(action, num = 1, payload = {}) {
    const room = state.rooms[code], command = { action, commandId: 'service-command-' + ++number, expectedVersion: room.version, roundId: room.round?.id, ...payload };
    A.apply(state, command, ctx(num ? seats[num - 1] : undefined));
    const identityId = num ? seats[num - 1].identityId : hostId;
    return { command, ack: state.transport.acknowledgements[identityId] };
  }
  A.pulse(state, ctx());
  function discussion() { assert.ok(act('start').ack.ok); assert.ok(act('confirmTopic').ack.ok); assert.ok(act('beginDiscussion').ack.ok); A.pulse(state, ctx()); }
  return { state, seats, ctx, act, discussion, room: () => state.rooms[code], setOnline(nums, timestamp = 70001) { onlineNums = nums; now = timestamp; A.pulse(state, ctx()); } };
}
test('server envelope preserves metadata and one registered session through rounds and restart', () => {
  const f = fixture(), raw = { data: JSON.stringify(f.state), owner: 'server', executor: { epoch: 'preserved' }, revision: 1 };
  const state = A.decode(raw); assert.equal(A.session(state), 'registered-service-session');
  f.discussion(); const initial = A.session(f.state); assert.ok(f.act('cancelRound', 4).ack.ok); assert.equal(A.session(f.state), initial);
  const encoded = A.encode(raw, f.state); assert.equal(encoded.owner, 'server'); assert.equal(encoded.executor.epoch, 'preserved'); assert.equal(A.decode(encoded).rooms.OFFBLUFF.round.id, f.room().round.id);
  delete state.transport.executorSessionId; assert.throws(() => A.session(state), e => e.code === 'executor_not_registered');
});
test('remaining original cards start, prepare, continue and restart without an open host', () => {
  const f = fixture(); assert.ok(f.act('start', 4).ack.ok); assert.ok(f.act('confirmTopic', 3).ack.ok); assert.ok(f.act('beginDiscussion', 4).ack.ok);
  assert.equal(f.room().round.thinkerId, f.room().members[1].id);
  assert.equal(f.act('identify', 4, { targetId: f.room().round.truthfulId }).ack.error.code, 'thinker_only');
  for (let i = 0; i < 3; i++) assert.ok(f.act('nextSpotlight', 1).ack.ok);
  assert.ok(f.act('identify', 1, { targetId: f.room().round.truthfulId }).ack.ok);
  const scores = structuredClone(f.room().scores);
  const applied = f.act('nextRound', 4); assert.ok(applied.ack.ok); A.apply(f.state, applied.command, f.ctx(f.seats[3]));
  assert.equal(f.room().roundIndex, 1); assert.deepEqual(f.room().scores, scores);
});
test('an offline Thinker cancels the round without scoring and selects the next online Thinker with a fresh topic', () => {
  const f = fixture(); f.discussion();
  const prior = f.room().round, score = structuredClone(f.room().scores), knownId = bank.find(q => q.id === prior.questionId).canonicalKnowledgeId;
  assert.ok(f.state.identities['identity-2'].known[knownId]);
  f.setOnline([2, 3, 4]); assert.ok(f.act('recover', 3).ack.ok);
  assert.equal(f.room().phase, 'topic_check'); assert.notEqual(f.room().round.id, prior.id); assert.notEqual(f.room().round.questionId, prior.questionId);
  assert.equal(f.room().round.thinkerId, f.room().members[2].id); assert.deepEqual(f.room().scores, score); assert.equal(f.room().history.length, 0); assert.ok(f.state.identities['identity-2'].known[knownId]);
});
test('an offline Truth Teller replaces the topic instead of leaking the same answer to a replacement', () => {
  const f = fixture(); f.discussion(); const prior = f.room().round;
  f.setOnline([1, 3, 4]); assert.ok(f.act('recover', 4).ack.ok);
  assert.equal(f.room().round.thinkerId, prior.thinkerId); assert.notEqual(f.room().round.questionId, prior.questionId); assert.equal(f.room().round.truthfulId, null);
  assert.equal(f.room().history.length, 0); assert.equal(Object.values(f.room().scores).reduce((a, b) => a + b, 0), 0);
  assert.ok(f.act('confirmTopic', 3).ack.ok); assert.notEqual(f.room().round.truthfulId, prior.truthfulId);
});
test('offline Bluffer Spotlight is skipped, while active Thinker decision remains private', () => {
  const f = fixture(); f.discussion(); const roundId = f.room().round.id;
  f.setOnline([1, 2, 4]); assert.ok(f.act('nextSpotlight', 1).ack.ok);
  assert.equal(f.room().round.spotlightOrder[f.room().round.spotlightIndex], f.room().members[4].id);
  assert.ok(f.room().round.skippedIds.includes(f.room().members[3].id)); assert.equal(f.room().round.id, roundId); assert.equal(f.room().phase, 'discussion');
  assert.ok(f.act('nextSpotlight', 1).ack.ok); assert.ok(f.act('identify', 1, { targetId: f.room().round.truthfulId }).ack.ok);
});
test('brief reconnect preserves roles; fewer than three online cannot manufacture scores or a random identification', () => {
  const f = fixture(); f.discussion(); const prior = structuredClone(f.room().round), score = structuredClone(f.room().scores);
  f.setOnline([1, 2, 3, 4], 40000); assert.equal(f.act('recover', 3).ack.error.code, 'no_offline_player'); assert.deepEqual(f.room().round, prior);
  f.setOnline([3, 4]); assert.equal(f.act('recover', 3).ack.error.code, 'player_count'); assert.deepEqual(f.room().round, prior); assert.deepEqual(f.room().scores, score);
});
test('private projections and public host never include another role, canonical bearer, key or credential', () => {
  const f = fixture(); f.discussion();
  for (const seat of f.seats) {
    const payload = A.project(f.state, seat, f.ctx(seat)), view = JSON.parse(payload.viewJson);
    assert.equal(view.privateCard.playerId, f.room().members[seat.playerNum].id); assert.equal(payload.hostGrant, null);
    assert.equal(Object.hasOwn(view.privateCard, 'secretAnswer'), seat.playerNum === 2);
    assert.doesNotMatch(payload.viewJson, /identityId|historyToken|privateKey|truthfulId|hostToken/);
    for (const other of f.seats.filter(s => s !== seat)) assert.ok(!JSON.stringify(payload).includes(other.token));
  }
  const host = JSON.parse(A.project(f.state, { playerNum: 0 }, f.ctx()).viewJson); assert.equal(host.privateCard, null); assert.ok(!JSON.stringify(host).includes('PRIVATE_SERVICE_ANSWER_'));
  const writes = A.historyWrites(f.state); assert.equal(writes.length, 5); assert.ok(writes.some(w => Object.keys(w.history.known).length === 1)); assert.ok(writes.every(w => /^rooms\/bluff-identities\/players\/[a-f0-9]{64}$/.test(w.path)));
});
test('seat binding uses canonical token and original slot; forged identity or mailbox replay cannot impersonate Thinker', () => {
  const f = fixture(); f.discussion();
  const spoof = { ...f.seats[3], identityId: 'identity-1' };
  A.apply(f.state, { action: 'nextSpotlight', commandId: 'spoofed-command-123', expectedVersion: f.room().version, roundId: f.room().round.id }, f.ctx(spoof));
  assert.equal(f.state.transport.acknowledgements['identity-4'].error.code, 'thinker_only');
  assert.throws(() => A.project(f.state, { ...f.seats[0], playerNum: 2 }, f.ctx()), e => e.code === 'invalid_card_session');
  const cmd = f.act('nextSpotlight'); assert.equal(A.command({ command: cmd.command }, { ...f.ctx(f.seats[0]), state: f.state }), null);
});
test('legacy mode keeps host-only management and no new offline recovery permission', () => {
  const f = fixture(); delete f.room().sharedControls;
  const room = f.room(), input = { room: room.code, action: 'start', commandId: 'legacy-command-0001', expectedVersion: room.version };
  assert.throws(() => E.applyCommand(f.state, 'identity-3', input, bank, { now: 1000, rng: () => 0 }), e => e.code === 'host_only');
  E.applyCommand(f.state, 'host-identity', input, bank, { now: 1000, rng: () => 0 });
  assert.throws(() => E.applyCommand(f.state, 'identity-3', { ...input, action: 'recover', commandId: 'legacy-command-0002', expectedVersion: room.version, roundId: room.round.id }, bank, { now: 100000 }), e => e.code === 'host_only');
});

test('remote knowledge merges by the bound history token without dropping current exposure', () => {
  const f = fixture(); f.discussion();
  const history = A.historyWrites(f.state).find(w => w.path.endsWith('6'.repeat(64)));
  const prior = structuredClone(f.state.identities['identity-2'].known);
  A.mergeHistories(f.state, [{ ...history, remote: { known: { 'another-room-known': { at: 5, reason: 'reveal_received' } }, seen: { 'another-room-seen': 10 } } },
    { path: 'rooms/bluff-identities/players/' + '0'.repeat(64), remote: { known: { unbound: true } } }]);
  assert.deepEqual(Object.entries(f.state.identities['identity-2'].known).filter(([id]) => id !== 'another-room-known'), Object.entries(prior));
  assert.ok(f.state.identities['identity-2'].known['another-room-known']); assert.equal(f.state.identities['identity-2'].seen['another-room-seen'], 10);
  assert.ok(Object.values(f.state.identities).every(i => !i.known.unbound));
});
test('public host receives only its action acknowledgement and releasing service restores legacy controls', () => {
  const f = fixture(); f.discussion();
  const failed = f.act('identify', 0, { targetId: f.room().round.truthfulId }); assert.equal(failed.ack.error.code, 'thinker_only');
  const payload = A.project(f.state, { playerNum: 0 }, f.ctx()); assert.equal(payload.ack.commandId, failed.command.commandId); assert.equal(payload.ack.ok, false);
  assert.equal(JSON.parse(payload.viewJson).privateCard, null); A.release(f.state); assert.equal(f.room().sharedControls, undefined);
  assert.throws(() => E.applyCommand(f.state, 'identity-3', { action: 'cancelRound', room: f.room().code, commandId: 'released-legacy-command', expectedVersion: f.room().version, roundId: f.room().round.id }, bank), e => e.code === 'host_only');
});


const { createExecutor } = require('../runtime/hub-executor-core.cjs');
const { createHash } = require('node:crypto');
class GuardFirebase {
  constructor() { this.nodes=new Map(); this.writes=[]; }
  set(path,node) { this.nodes.set(path,structuredClone(node)); }
  get(path) { return structuredClone(this.nodes.get(path)||null); }
  fetch=async(url,options={})=>{
    const path=new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'');
    const current=this.get(path), etag=createHash('sha256').update(JSON.stringify(current)).digest('hex');
    if(!options.method || options.method==='GET') return new Response(JSON.stringify(current),{status:200,headers:{etag}});
    if(new Headers(options.headers).get('if-match')!==etag)return new Response('null',{status:412});
    const next=JSON.parse(options.body);this.set(path,next);this.writes.push({path,node:structuredClone(next)});
    return new Response(JSON.stringify(next),{status:200});
  }
}
async function serviceFixture() {
  const f=fixture(),db=new GuardFirebase(),code=f.room().code,controlToken='a'.repeat(64);
  const canonicalPath='rooms/bluffking-'+code+'/players/'+controlToken;
  db.set(canonicalPath,{data:JSON.stringify(f.state),revision:1});
  const originalPath=entry=>'rooms/'+code+'/players/'+entry.originalToken;
  for(const entry of f.state.transport.cardRoster){
    db.set(originalPath(entry),{game:'cut',name:entry.name||'Player',cut:{sessionId:'previous-cut-session',phase:'speaking'}});
    db.set(f.seats[entry.playerNum-1].path,A.project(f.state,f.seats[entry.playerNum-1],f.ctx(f.seats[entry.playerNum-1])));
  }
  const service=createExecutor({secret:'56'.repeat(32),databaseURL:'http://localhost',fetchImpl:db.fetch,now:()=>1000,games:{bluffking:A}});
  const registered=await service.register({game:'bluffking',code,controlToken,seats:f.seats});
  const pulse=()=>service.execute({capsule:registered.capsule,token:f.seats[1].token});
  const publish=()=>{
    for(const entry of f.state.transport.cardRoster)db.set(originalPath(entry),{
      game:'bluffking',name:entry.name||'Player',bluff:{version:2,room:code,token:entry.token,identityId:entry.identityId,historyToken:entry.historyToken}
    });
  };
  const state=()=>A.decode(db.get(canonicalPath));
  return {...f,db,service,registered,pulse,publish,state,canonicalPath,originalPath};
}
test('Bluff service allows initial previous-game original cards and persists exact binding before player-only execution',async()=>{
  const f=await serviceFixture();
  assert.deepEqual(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen,{});
  f.publish();await f.pulse();
  assert.equal(Object.keys(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen).length,4);
  const r=await f.service.register({game:'bluffking',code:f.room().code,controlToken:'a'.repeat(64),seats:f.seats});
  assert.equal(r.capsule,f.registered.capsule);
  assert.equal(Object.keys(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen).length,4);
  await f.service.execute({capsule:r.capsule,token:f.seats[2].token,command:{action:'start',commandId:'original-guard-start',expectedVersion:f.state().rooms[f.room().code].version}});
  assert.equal(f.state().rooms[f.room().code].phase,'topic_check');
});
for(const change of ['another-game','another-room','another-token','another-identity','another-history']){
  test('Bluff retained ticket cannot execute or project after original card switches '+change,async()=>{
    const f=await serviceFixture();f.publish();await f.pulse();
    const entry=f.state().transport.cardRoster[0],path=f.originalPath(entry),source=f.db.get(path);
    // ROOM.update retains unrelated fields, including obsolete game credentials.
    const changed={...source,hubExecutor:f.db.get(f.seats[0].path).hubExecutor,bluff:{...source.bluff}};
    if(change==='another-game'){changed.game='onceupon';changed.once={sessionId:'new-once-session'};}
    if(change==='another-room')changed.bluff.room='NEWBLUFF';
    if(change==='another-token')changed.bluff.token='b'.repeat(64);
    if(change==='another-identity')changed.bluff.identityId='another-identity';
    if(change==='another-history')changed.bluff.historyToken='c'.repeat(64);
    f.db.set(path,changed);
    const before=f.db.get(f.canonicalPath),cards=f.seats.map(s=>f.db.get(s.path)),histories=A.historyWrites(f.state()).map(w=>[w.path,f.db.get(w.path)]),writes=f.db.writes.length;
    await assert.rejects(f.service.execute({capsule:f.registered.capsule,token:f.seats[1].token,
      command:{action:'start',commandId:'ghost-guard-start',expectedVersion:f.state().rooms[f.room().code].version}}),{code:'game_switched',status:409});
    assert.equal(f.db.writes.length,writes);assert.deepEqual(f.db.get(f.canonicalPath),before);
    f.seats.forEach((s,i)=>assert.deepEqual(f.db.get(s.path),cards[i]));
    histories.forEach(([ref,node])=>assert.deepEqual(f.db.get(ref),node));
  });
}


test('Bluff release and new executor epoch reopen before republishing original cards, then enforce the new binding',async()=>{
  const f=await serviceFixture();f.publish();await f.pulse();
  const old=f.registered,originalSeen=f.db.get(f.canonicalPath).executor.originalCardBindingsSeen;
  assert.equal(Object.keys(originalSeen).length,4);
  for(const entry of f.state().transport.cardRoster)f.db.set(f.originalPath(entry),{...f.db.get(f.originalPath(entry)),game:'onceupon'});
  await assert.rejects(f.pulse(),{code:'game_switched'});
  await f.service.release({capsule:old.capsule,token:'a'.repeat(64)});
  assert.equal(f.db.get(f.canonicalPath).executor,undefined);
  const reopened=await f.service.register({game:'bluffking',code:f.room().code,controlToken:'a'.repeat(64),seats:f.seats});
  assert.notEqual(reopened.capsule,old.capsule);assert.equal(reopened.sessionId,old.sessionId);
  assert.deepEqual(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen,{});
  await assert.rejects(f.service.execute({capsule:old.capsule,token:f.seats[1].token}),{code:'stale_session'});
  f.publish();await f.service.execute({capsule:reopened.capsule,token:f.seats[1].token});
  assert.equal(Object.keys(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen).length,4);
  const entry=f.state().transport.cardRoster[0];f.db.set(f.originalPath(entry),{...f.db.get(f.originalPath(entry)),game:'cut'});
  await assert.rejects(f.service.execute({capsule:reopened.capsule,token:f.seats[1].token}),{code:'game_switched'});
});


for(const change of ['game','session']){
  test('Bluff registration baseline fences a source changed before any correct original card was observed: '+change,async()=>{
    const f=await serviceFixture(),entry=f.state().transport.cardRoster[0],path=f.originalPath(entry),prior=f.db.get(path);
    assert.deepEqual(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen,{});
    const source={...prior,hubExecutor:f.db.get(f.seats[0].path).hubExecutor,cut:{...prior.cut}};
    if(change==='game'){source.game='onceupon';source.once={sessionId:'another-game-session'};}
    else source.cut.sessionId='another-cut-session';
    f.db.set(path,source);
    const before=f.db.get(f.canonicalPath),cards=f.seats.map(s=>f.db.get(s.path)),writes=f.db.writes.length;
    await assert.rejects(f.service.execute({capsule:f.registered.capsule,token:f.seats[1].token,
      command:{action:'start',commandId:'unobserved-ghost-start',expectedVersion:f.state().rooms[f.room().code].version}}),{code:'game_switched'});
    assert.equal(f.db.writes.length,writes);assert.deepEqual(f.db.get(f.canonicalPath),before);
    f.seats.forEach((s,i)=>assert.deepEqual(f.db.get(s.path),cards[i]));
  });
}
test('Bluff baseline permits previous-game progress and always accepts the expected original-card publication',async()=>{
  const f=await serviceFixture();
  for(const entry of f.state().transport.cardRoster){
    const path=f.originalPath(entry),source=f.db.get(path);
    f.db.set(path,{...source,hubExecutor:f.db.get(f.seats[0].path).hubExecutor,cut:{...source.cut,phase:'break',turnId:100},heartbeat:2000});
  }
  await f.pulse();assert.deepEqual(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen,{});
  f.publish();await f.pulse();assert.equal(Object.keys(f.db.get(f.canonicalPath).executor.originalCardBindingsSeen).length,4);
});
