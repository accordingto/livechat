'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const E=require('../talk-engine.js'),{adapters}=require('../runtime/story-executor.cjs');
const {createExecutor}=require('../runtime/hub-executor-core.cjs'),{createStore}=require('../runtime/talk-archive-store.cjs');
const {fixture}=require('./helpers/talk-vnext-fixture.cjs');
test('vNext five client authority dispatches immediately, caps three and preserves exact retry score',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');
 const first=await f.act(1,'crazyAssign',{target:2,text:'Claim your cup is your boss.'});
 assert.equal(f.card(2).talk.crazy.prompt.text,'Claim your cup is your boss.');
 assert.equal(f.state().crazy.queue.length,0);assert.equal(f.state().crazy.prompts[2].at,f.now());
 await f.shown(2);await f.act(1,'crazyAssign',{target:3,text:'Speak like a tiny robot.'});await f.shown(3);
 await f.act(1,'crazyAssign',{target:4,text:'Cluck softly.'});await f.shown(4);await f.act(1,'crazyAssign',{target:5,text:'Apologize to your sock.'});
 assert.equal(Object.values(f.state().crazy.prompts).filter(p=>p.status==='pending').length,3);assert.equal(f.state().crazy.queue.length,1);
 const p=f.card(2).talk.crazy.prompt;const done=await f.act(2,'crazyDone',{promptId:p.id});await f.run(done.body);
 assert.equal(f.state().scores[2],1);assert.equal(f.card(5).talk.crazy.prompt.text,'Apologize to your sock.');
 assert.equal(f.state().crazy.receivers[2].cooldownUntil,f.now()+30000);
 const serialized=JSON.stringify(f.card(3));assert.ok(!serialized.includes('Claim your cup is your boss.'));assert.ok(!serialized.includes('crazyVault'));assert.ok(!serialized.includes('ownerIdentity'));
 const records=await f.store.readRoom(f.code);assert.ok(records.some(r=>r.category==='event'));assert.ok(records.some(r=>!r.category&&r.status==='done'));
});
test('vNext forged host commands fail, actual owner locks and drains without cutting pending tasks',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');await f.act(1,'crazyAssign',{target:2,text:'Praise a potato.'});await f.shown(2);
 f.advance(60000);await f.service.execute({capsule:f.capsule(),token:f.seats[1].token,clock:true});
 assert.equal(f.state().crazy.roundStage,'decision');assert.equal(f.state().crazy.prompts[2].status,'pending');
 const forged=f.command(1,'crazyExtend',{seconds:180,actor:0,hostAuthorized:true});await f.run(forged);assert.notEqual(f.state().replies[1].error,'');assert.equal(f.state().crazy.roundStage,'decision');
 await f.act(0,'crazyExtend',{seconds:180});assert.equal(f.state().crazy.roundStage,'extension');assert.equal(f.state().crazy.queueLocked,true);
 const blocked=f.command(1,'crazyAssign',{text:'New forbidden card.'});await f.run(blocked);assert.notEqual(f.state().replies[1].error,'');
 await f.act(0,'crazyDrain');assert.equal(f.state().crazy.roundStage,'draining');assert.equal(f.state().crazy.prompts[2].status,'pending');
 await f.act(2,'crazyDone',{promptId:f.state().crazy.prompts[2].id});assert.equal(f.state().scores[2],1);assert.equal(f.state().crazy.roundStage,'sorting');
});
test('vNext automatic render acknowledgement cannot overwrite a pending manual receipt',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');await f.act(1,'crazyAssign',{target:2,text:'Marry your mug.'});
 const before=f.state().replies[2];const ack=await f.shown(2);assert.equal(ack.result.technical.rendered,true);assert.deepEqual(f.state().replies[2],before);
 await f.run(ack.body);assert.equal(f.state().crazy.prompts[2].renderAckAt,f.now());
 f.advance(30000);await f.service.execute({capsule:f.capsule(),token:f.seats[1].token,clock:true});assert.equal(f.state().crazy.prompts[2].status,'pending');
 f.advance(120000);await f.service.execute({capsule:f.capsule(),token:f.seats[1].token,clock:true});assert.equal(f.state().crazy.prompts[2].status,'expired');assert.equal(f.state().crazy.receivers[2].paused,true);
});
test('vNext signed background wake advances without any client and rejects replay/forged wake',async()=>{
 const f=fixture();const registered=await f.register();assert.ok(registered._wake?.ticket);const originalHostSeen=f.nodes.get(f.canonical).executor.hostSeenAt;
 f.advance(20000);const result=await f.service.wake({ticket:registered._wake.ticket});assert.ok(result._wake);await f.service.noteWake({ticket:result._wake.ticket,stage:'scheduled'});assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt,originalHostSeen);
 assert.deepEqual(await f.service.wake({ticket:registered._wake.ticket}),{ok:true,obsolete:true});
 await assert.rejects(f.service.wake({ticket:'invalid'}),{code:'invalid_ticket'});
 f.advance(20000);const second=await f.service.wake({ticket:result._wake.ticket});assert.ok(second._wake);
 f.advance(5000);await f.service.wake({ticket:second._wake.ticket});assert.equal(f.state().phase,'talking');
});
module.exports={fixture};
test('vNext unused cards default private, author consent drives reveal and vault survives new verified session',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');
 await f.act(1,'crazyAssign',{target:2,text:'Pretend your hat is a chicken.'});await f.shown(2);
 await f.act(1,'crazyAssign',{target:2,text:'Secret unused potato mission.'});
 await f.act(2,'crazyDone',{promptId:f.state().crazy.prompts[2].id});await f.act(0,'crazyDrain');
 assert.equal(f.state().crazy.roundStage,'sorting');
 const own=f.card(1).talk.crazy;assert.equal(own.unusedCards.length,1);assert.equal(own.library.length,1);
 const id=own.library[0].id;assert.ok(!JSON.stringify(f.card(3)).includes('Secret unused potato mission.'));
 await f.act(0,'crazyReveal');assert.equal(f.card(3).talk.crazy.revealCards.length,1);assert.equal(f.card(3).talk.crazy.revealCards[0].text,'Pretend your hat is a chicken.');
 await f.act(1,'crazySort',{saveIds:[id]});assert.equal(f.card(3).talk.crazy.revealCards.length,1);
 const impostor=f.command(2,'crazyLibraryUpdate',{cardId:id,text:'STOLEN',actorIdentity:f.state().crazyIdentities[1]});await f.run(impostor);assert.notEqual(f.state().replies[2].error,'');
 assert.equal(f.card(1).talk.crazy.library[0].text,'Secret unused potato mission.');
 await f.act(1,'crazyLibraryUpdate',{cardId:id,text:'Ask your spoon for a raise.'});
 const fresh=E.create({id:'vnext-fresh-session',topic:{question:'Invent a funny hotel.'},now:f.now(),roster:f.seats.map(s=>({playerNum:s.playerNum,name:'Renamed '+s.playerNum})),gameMode:'crazy',crazySource:'players',conversationMode:'free'});
 f.set(f.canonical,{state:fresh,revision:1});for(const seat of f.seats)f.set(f.path(seat.playerNum),E.view(fresh,seat.playerNum,f.now()));
 await f.service.register({game:'letstalk',code:f.code,controlToken:f.controlToken,seats:f.seats,sessionId:fresh.sessionId});
 assert.equal(f.card(1).talk.crazy.library[0].text,'Ask your spoon for a raise.');assert.equal(f.card(2).talk.crazy.library.length,0);
 await f.act(0,'start');await f.act(1,'crazyLibrarySend',{cardId:id,target:3});assert.equal(f.card(3).talk.crazy.prompt.text,'Ask your spoon for a raise.');
 await f.act(1,'crazyLibraryDelete',{cardId:id});assert.equal(f.card(1).talk.crazy.library.length,0);
 const records=await f.store.readRoom(f.code);assert.ok(records.some(r=>r.category==='vault'&&r.cardId===id&&r.status==='deleted'));
});
test('vNext two directors and three actors retain role-safe FIFO cards and atomic exchange',async()=>{
 const f=fixture({crazyPlayStyle:'director',crazyRotationSeconds:60});await f.register();await f.act(0,'start');
 assert.deepEqual(f.state().crazy.directors,[1,2]);assert.equal(f.card(3).talk.crazy.canAssign,false);
 const forbidden=f.command(3,'crazyAssign',{target:4,text:'Unauthorized actor card.'});await f.run(forbidden);assert.notEqual(f.state().replies[3].error,'');
 await f.act(1,'crazyAssign',{target:3,text:'Cluck like a chicken.'});await f.shown(3);
 await f.act(2,'crazyAssign',{target:3,text:'Describe your cup as royalty.'});await f.act(1,'crazyAssign',{target:4,text:'Sing to your sock.'});await f.shown(4);
 f.advance(60000);await f.service.execute({capsule:f.capsule(),token:f.controlToken,clock:true});
 assert.equal(f.state().crazy.directors.length,2);assert.ok(!f.state().crazy.directors.includes(3));assert.ok(!f.state().crazy.directors.includes(4));
 assert.equal(f.state().crazy.prompts[3].status,'pending');assert.equal(f.state().crazy.prompts[4].status,'pending');
 assert.equal(f.state().crazy.queue.filter(c=>c.target===3).length,1);
 assert.ok(!JSON.stringify(f.card(5)).includes('Describe your cup as royalty.'));
});
test('vNext background lease is renewed for a new session and membership capsule instead of stranding timers',async()=>{
 const f=fixture();const first=await f.register();const second=await f.act(0,'newTopic',{confirm:true,topic:{question:'Another funny topic?'},mode:'think',seconds:45,showStarters:true,gameMode:'crazy'});
 assert.ok(second.result._wake?.ticket);assert.notEqual(first._wake.ticket,second.result._wake.ticket);
 f.advance(20000);assert.deepEqual(await f.service.wake({ticket:first._wake.ticket}),{ok:true,obsolete:true});
 const woke=await f.service.wake({ticket:second.result._wake.ticket});assert.ok(woke._wake);
 const newToken='6'.repeat(32);f.set('rooms/'+f.code+'/players/'+newToken,{game:'scene',playerNum:6,name:'Synthetic 6'});
 const added=await f.service.updateRoster({capsule:f.capsule(),token:f.controlToken,commandId:'vnext-wake-append',roster:[...f.seats.map(s=>({playerNum:s.playerNum,originalToken:s.token,name:'Synthetic '+s.playerNum})),{playerNum:6,originalToken:newToken,name:'Synthetic 6'}],hubCount:6});
 assert.ok(added._wake?.ticket);f.advance(20000);assert.deepEqual(await f.service.wake({ticket:woke._wake.ticket}),{ok:true,obsolete:true});
 assert.equal((await f.service.wake({ticket:added._wake.ticket})).ok,true);
});

test('vNext signed wake retries a transient archive outage without a foreground heartbeat',async()=>{
 const f=fixture({crazySource:'mixed',crazyMinSeconds:5,crazyMaxSeconds:5});const registered=await f.register();await f.act(0,'start');
 const hostSeen=f.nodes.get(f.canonical).executor.hostSeenAt;f.advance(20000);f.failArchive(true);
 await assert.rejects(f.service.wake({ticket:registered._wake.ticket}));
 assert.ok(f.nodes.get(f.canonical).executor.crazyWake);assert.equal(f.nodes.get(f.canonical).executor.crazyWake.claimId,undefined);
 f.failArchive(false);const result=await f.service.wake({ticket:registered._wake.ticket});assert.ok(result._wake);await f.service.noteWake({ticket:result._wake.ticket,stage:'scheduled'});
 assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt,hostSeen);
 assert.ok(Object.values(f.state().crazy.prompts).some(p=>p?.status==='pending'));
 assert.deepEqual(await f.service.wake({ticket:registered._wake.ticket}),{ok:true,obsolete:true});
});

test('vNext director rotation keeps assigned and random main sharing on actors',async()=>{
 for(const conversationMode of ['assigned','random']) {
  const f=fixture({crazyPlayStyle:'director',crazyRotationSeconds:60,conversationMode,gameSeconds:900});await f.register();await f.act(0,'start');
  const before=f.state();assert.ok(!before.crazy.directors.includes(before.speaker));
  f.advance(60000);await f.service.execute({capsule:f.capsule(),token:f.controlToken,clock:true});
  const after=f.state();assert.deepEqual(after.crazy.directors,[2,3]);assert.ok(!after.crazy.directors.includes(after.speaker));
  assert.ok(after.remaining.every(n=>!after.crazy.directors.includes(n)));assert.ok(after.speaker===1||after.remaining.includes(1));
 }
});

test('vNext accepted preparation handwriting is privately retained when a host replaces the topic',async()=>{
 const f=fixture();await f.register();await f.act(1,'crazyAssign',{target:2,text:'This private preparation card should survive.'});
 assert.equal(f.state().crazy.queue.length,1);
 await f.act(0,'newTopic',{confirm:true,topic:{question:'Replacement topic.'},mode:'think',seconds:45,showStarters:true,gameMode:'crazy'});
 assert.equal(f.state().crazy.queue.length,0);assert.equal(f.card(1).talk.crazy.library.length,1);
 assert.equal(f.card(1).talk.crazy.library[0].text,'This private preparation card should survive.');
 assert.ok(!JSON.stringify(f.card(2)).includes('This private preparation card should survive.'));
 assert.ok((await f.store.readRoom(f.code)).some(r=>r.category==='vault'&&r.text==='This private preparation card should survive.'));
});

test('vNext player membership never impersonates host presence and permits private inactive-owner edits',async()=>{
 const f=fixture();await f.register();await f.act(1,'crazyAssign',{target:2,text:'Private unused edit after sitting out.'});await f.act(0,'crazyDrain');
 const id=f.card(1).talk.crazy.library[0].id,hostSeen=f.nodes.get(f.canonical).executor.hostSeenAt;f.advance(50000);
 await f.service.setParticipant({capsule:f.capsule(),token:f.seats[0].token,commandId:'vnext-own-sit-out',playerNum:1,active:false});
 assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt,hostSeen);
 await f.act(1,'crazyLibraryUpdate',{cardId:id,text:'Private spoon update.'});
 assert.ok(Object.values(f.state().crazyVault[f.state().crazyIdentities[1]]).some(c=>c.id===id&&c.text==='Private spoon update.'));
 await f.act(1,'crazySort',{saveIds:[id]});await f.act(1,'crazyLibraryDelete',{cardId:id});
 assert.equal(f.state().crazyVault[f.state().crazyIdentities[1]][id].deleted,true);
 const forbidden=f.command(1,'crazyAssign',{text:'Inactive owner cannot send.'});await assert.rejects(f.run(forbidden),{code:'not_eligible'});
});
test('vNext explicit host takeover survives confirmed offline delegate without granting ordinary shared controls',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');await f.act(0,'crazyDelegate',{playerNum:1});await f.service.execute({capsule:f.capsule(),token:f.seats[0].token,clock:true});
 f.advance(60000);await f.service.execute({capsule:f.capsule(),token:f.seats[1].token,clock:true});
 assert.equal(f.state().crazy.roundStage,'decision');f.advance(30000);await f.service.execute({capsule:f.capsule(),token:f.seats[1].token,clock:true});
 assert.equal(f.card(2).talk.crazy.hostActions.claim,true);await f.act(2,'crazyClaimHost');assert.equal(f.state().crazy.hostDelegate,2);
 await f.act(2,'crazyExtend',{seconds:180});assert.equal(f.state().crazy.roundStage,'extension');
});

test('vNext private scheduler trace is bounded, ticket-authenticated and absent from player projections',async()=>{
 const f=fixture(),r=await f.register();for(let i=0;i<15;i++)await f.service.noteWake({ticket:r._wake.ticket,stage:'response',status:200});
 const raw=f.nodes.get(f.canonical);assert.equal(raw.executor.crazyWakeLog.length,12);
 assert.deepEqual(Object.keys(raw.executor.crazyWakeLog[0]).sort(),['at','job','stage','status']);
 assert.ok(!JSON.stringify(f.card(1)).includes('crazyWakeLog'));
 await assert.rejects(f.service.noteWake({ticket:'invalid',stage:'started'}),{code:'invalid_ticket'});
});

test('an early native delivery retries without consuming its authoritative wake or inventing presence',async()=>{
 const f=fixture(),r=await f.register(),before=f.nodes.get(f.canonical).executor;
 await assert.rejects(f.service.wake({ticket:r._wake.ticket}),{code:'wake_early'});
 const after=f.nodes.get(f.canonical).executor;assert.equal(after.crazyWake.id,before.crazyWake.id);
 assert.equal(after.crazyWake.claimId,undefined);assert.equal(after.hostSeenAt,before.hostSeenAt);assert.deepEqual(after.presence,before.presence);
 f.advance(20000);assert.ok((await f.service.wake({ticket:r._wake.ticket}))._wake);
});


test('Talk release checks transaction-current missions and retains the background lease on a late assignment',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');
 const release={capsule:f.capsule(),token:f.controlToken};
 assert.ok(!Object.values(f.state().crazy.prompts).some(p=>p.status==='pending'));
 await f.act(1,'crazyAssign',{target:2,text:'A mission created after setup was opened.'});
 const before=f.nodes.get(f.canonical).executor,prompt=f.state().crazy.prompts[2];
 await assert.rejects(f.service.release(release),{code:'missions_active',status:409});
 assert.equal(f.nodes.get(f.canonical).executor.capsule,before.capsule);
 assert.deepEqual(f.nodes.get(f.canonical).executor.crazyWake,before.crazyWake);
 assert.equal(f.state().crazy.prompts[2].id,prompt.id);assert.equal(f.state().crazy.prompts[2].status,'pending');
 await f.shown(2);await f.act(2,'crazySkip',{promptId:prompt.id});
 assert.deepEqual(await f.service.release(release),{ok:true});assert.ok(!f.nodes.get(f.canonical).executor);
});


test('a confirmed activity switch permits the true host to release fenced Talk without treating mere silence as a switch',async()=>{
 const f=fixture();await f.register();await f.act(0,'start');await f.act(1,'crazyAssign',{target:2,text:'An older game mission.'});
 const release={capsule:f.capsule(),token:f.controlToken};
 await assert.rejects(f.service.release(release),{code:'missions_active'});
 const other={game:'dixit',playerNum:3,dixit:{sessionId:'explicit-other-activity'}};
 f.set(f.path(3),other);
 assert.deepEqual(await f.service.release(release),{ok:true});
 assert.equal(f.state().crazy.activitySuperseded,true);assert.ok(!f.nodes.get(f.canonical).executor);
 assert.deepEqual(f.nodes.get(f.path(3)),other,'release does not overwrite a card that switched activity');
 const retained=E.resetCarry(f.state(),f.now());assert.equal(retained.crazyIdentities[1],f.state().crazyIdentities[1]);
});


test('new three-seat Crazy authority defaults to one director and two actors, with actor handwriting rejected',async()=>{
 const f=fixture({count:3,crazyPlayStyle:undefined});await f.register();
 assert.equal(f.seats.length,3);assert.equal(f.state().crazy.playStyle,'director');assert.deepEqual(f.state().crazy.directors,[1]);
 assert.equal(f.card(1).talk.crazy.canAssign,true);assert.equal(f.card(2).talk.crazy.canAssign,false);assert.equal(f.card(3).talk.crazy.canAssign,false);
 assert.equal(f.card(2).talk.crazy.effectiveMaxActive,2);
 const unauthorized=f.command(2,'crazyAssign',{target:3,text:'An actor must not assign this.'});await f.run(unauthorized);assert.equal(f.state().replies[2].error,'not_director');
 await f.act(0,'start');await f.act(1,'crazyAssign',{target:2,text:'A tiny chicken runs this cafe.'});
 assert.equal(f.card(2).talk.crazy.prompt.text,'A tiny chicken runs this cafe.');assert.ok(!JSON.stringify(f.card(3)).includes('A tiny chicken runs this cafe.'));
});

test('authenticated 140-second check-in keeps receiving enabled without extending or scoring the current task',async()=>{
 const f=fixture({count:3,crazyPlayStyle:undefined,gameSeconds:900});await f.register();await f.act(0,'start');
 await f.act(1,'crazyAssign',{target:2,text:'Introduce your cup as royalty.'});await f.shown(2);
 const prompt=f.state().crazy.prompts[2];
 f.advance(140000);await f.service.execute({capsule:f.capsule(),token:f.controlToken,clock:true});
 assert.equal(f.card(2).talk.crazy.prompt.checkIn,true);assert.ok(f.state().crazy.prompts[2].checkInReadyAt);
 const forged=f.command(3,'crazyHere',{promptId:prompt.id,renderVersion:1});await f.run(forged);assert.equal(f.state().replies[3].error,'stale_prompt');
 const missing=f.command(2,'crazyHere',{promptId:prompt.id,renderVersion:1});delete missing.command.sessionId;await f.run(missing);assert.notEqual(f.state().replies[2]?.id,missing.command.id);assert.equal(f.state().crazy.prompts[2].interactedAt,undefined);
 const here=await f.act(2,'crazyHere',{promptId:prompt.id,renderVersion:1});await f.run(here.body);
 assert.equal(f.state().crazy.prompts[2].expiresAt,prompt.expiresAt);assert.equal(f.card(2).talk.crazy.prompt.checkIn,false);assert.equal(f.state().scores[2],0);
 assert.equal(f.state().crazy.receivers[2].cooldownUntil,0);
 f.advance(10000);await f.service.execute({capsule:f.capsule(),token:f.controlToken,clock:true});
 assert.equal(f.state().crazy.prompts[2].status,'expired');assert.equal(f.state().crazy.receivers[2].paused,false);
 await f.act(1,'crazyAssign',{target:2,text:'An active person receives another task.'});
 assert.equal(f.card(2).talk.crazy.prompt.text,'An active person receives another task.');
 const late=f.command(2,'crazyHere',{promptId:prompt.id,renderVersion:1});await f.run(late);assert.equal(f.state().replies[2].error,'stale_prompt');
 const events=await f.store.readRoom(f.code);assert.equal(events.filter(e=>e.eventType==='checked_in'&&e.promptId===prompt.id).length,1);
});

test('native wake plans the check-in window and publishes it even when the previous projection was recent',async()=>{
 const f=fixture({count:3,crazyPlayStyle:undefined,gameSeconds:900,crazyMinSeconds:300,crazyMaxSeconds:300});const registered=await f.register();await f.act(0,'start');
 await f.act(1,'crazyAssign',{target:2,text:'Wave hello to your imaginary chicken.'});await f.shown(2);
 // Consume a retained old lease near the window; its successor must wake at140s,
 // not at the150s expiry or the ordinary20s backup interval.
 f.advance(132000);const before=f.nodes.get(f.canonical).executor;
 const jobTicket=require('../runtime/hub-executor-core.cjs').seal({purpose:'crazy-wake-v1',capsule:f.capsule(),id:before.crazyWake.id,expiresAt:before.crazyWake.leaseUntil},Buffer.from('51'.repeat(32),'hex'));
 const wake=await f.service.wake({ticket:jobTicket});assert.ok(wake._wake);assert.equal(wake._wake.delayMs,8000);
 f.advance(8000);await f.service.wake({ticket:wake._wake.ticket});
 assert.equal(f.card(2).talk.crazy.prompt.checkIn,true);assert.equal(f.state().crazy.prompts[2].checkInReadyAt,f.now());
});
