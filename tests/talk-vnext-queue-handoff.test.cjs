'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/talk-vnext-fixture.cjs');
const { keyFrom, unseal } = require('../runtime/hub-executor-core.cjs');

const clone = value => structuredClone(value);
const jobOf = f => f.nodes.get(f.canonical).executor.crazyWake;
const signedJob = wake => unseal(wake.ticket, keyFrom('51'.repeat(32)));
const scheduled = (f, wake) => f.service.noteWake({ ticket: wake.ticket, stage: 'scheduled', status: 202 });

async function completedRoundWithWake() {
  const f = fixture(), registered = await f.register();
  const first = registered._wake;
  await scheduled(f, first);
  await f.act(0, 'start');
  await f.act(1, 'crazyAssign', { target: 2, text: 'Give the soup an award.' });
  await f.shown(2);
  await f.act(2, 'crazyDone', { promptId: f.state().crazy.prompts[2].id });
  await f.act(1, 'crazyAssign', { target: 3, text: 'Introduce your mug as a celebrity.' });
  await f.shown(3);
  assert.equal(f.state().scores[2], 1);
  return { f, first };
}

test('failed queue publication reoffers the same committed job and key on an exact command retry', async () => {
  const f = fixture(), registered = await f.register();
  const command = f.command(1, 'crazyAssign', { target: 2, text: 'Keep this private queue card exactly once.' });
  const accepted = await f.run(command), wake = accepted._wake;
  assert.ok(wake?.ticket); assert.equal(wake.key, registered._wake.key);
  const committed = clone(jobOf(f));
  assert.equal(wake.key, committed.id); assert.equal(committed.enqueuedAt, undefined);
  let publishCalls = 0;
  const published = new Map();
  const publish = async next => {
    publishCalls++;
    if (publishCalls === 1) throw Object.assign(new Error('synthetic queue unavailable'), { code: 'queue_unavailable' });
    published.set(next.key, next.ticket); await scheduled(f, next);
  };
  await assert.rejects(publish(wake), { code: 'queue_unavailable' });
  assert.equal(f.state().replies[1].id, command.command.id);
  const retried = await f.run(command);
  assert.equal(retried._wake.key, wake.key);
  assert.equal(signedJob(retried._wake).id, committed.id);
  assert.equal(signedJob(retried._wake).capsule, signedJob(wake).capsule);
  assert.deepEqual(jobOf(f), committed, 'retry must preserve due time and lease rather than minting another job');
  assert.equal(f.state().crazy.queue.length, 1);
  assert.equal(Object.values(f.state().crazy.roundCards).length, 1);
  assert.equal(f.state().crazy.events.filter(event => event.type === 'submitted').length, 1);
  const retained = (await f.store.readRoom(f.code)).filter(record => !record.category || record.category === 'challenge');
  assert.equal(retained.filter(record => record.text === command.command.text).length, 1);
  await publish(retried._wake);
  assert.equal(published.size, 1); assert.equal(jobOf(f).enqueuedAt, f.now());
  assert.equal((await f.run(command))._wake, undefined, 'durably enqueued jobs are not offered on every poll');
  assert.ok(Object.values(f.state().scores).every(score => score === 0));
  for (const num of [1, 2, 3, 4, 5]) {
    const projected = JSON.stringify(f.card(num));
    assert.ok(!projected.includes(wake.ticket)); assert.ok(!projected.includes(wake.key));
    assert.ok(!projected.includes('enqueuedAt'));
  }
});

test('a retried predecessor recovers only its unpublished successor without replaying game work', async () => {
  const { f, first } = await completedRoundWithWake();
  const originalId = signedJob(first).id;
  const before = clone(f.nodes.get(f.canonical).executor);
  f.advance(first.delayMs);
  const result = await f.service.wake({ ticket: first.ticket }), successor = result._wake;
  assert.ok(successor?.key); assert.notEqual(successor.key, first.key);
  assert.equal(jobOf(f).predecessor, originalId); assert.equal(jobOf(f).enqueuedAt, undefined);
  const afterExecution = clone(f.state()), currentJob = clone(jobOf(f));
  // The callback's queue publisher fails after the canonical successor exists.
  const failPublisher = async () => { throw new Error('synthetic callback publish failure'); };
  await assert.rejects(failPublisher(successor));
  f.advance(500);
  const retry = await f.service.wake({ ticket: first.ticket });
  assert.equal(retry.obsolete, true); assert.equal(retry._wake.key, successor.key);
  assert.equal(signedJob(retry._wake).id, currentJob.id);
  assert.equal(signedJob(retry._wake).expiresAt, currentJob.leaseUntil);
  assert.deepEqual(jobOf(f), currentJob); assert.deepEqual(f.state(), afterExecution);
  assert.equal(f.state().scores[2], 1);
  assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt, before.hostSeenAt);
  assert.deepEqual(f.nodes.get(f.canonical).executor.presence, before.presence);
});

test('a scheduled successor is never reoffered or cleared by predecessor retries or delayed predecessor ACKs', async () => {
  const { f, first } = await completedRoundWithWake();
  f.advance(first.delayMs);
  const successor = (await f.service.wake({ ticket: first.ticket }))._wake;
  const beforeLateAck = clone(jobOf(f));
  await scheduled(f, first);
  assert.deepEqual(jobOf(f), beforeLateAck, 'ACK of A cannot mark B as enqueued');
  await scheduled(f, successor);
  const enqueued = clone(jobOf(f)), state = clone(f.state());
  for (let repeat = 0; repeat < 2; repeat++) {
    assert.deepEqual(await f.service.wake({ ticket: first.ticket }), { ok: true, obsolete: true });
  }
  assert.deepEqual(jobOf(f), enqueued); assert.deepEqual(f.state(), state);
  assert.equal(f.state().scores[2], 1);
});

test('predecessor recovery rejects unrelated, claimed, expired and differently bound successors', async () => {
  for (const condition of ['unrelated', 'claimed', 'expired', 'differentBinding']) {
    const { f, first } = await completedRoundWithWake();
    f.advance(first.delayMs);
    await f.service.wake({ ticket: first.ticket });
    const altered = clone(f.nodes.get(f.canonical));
    if (condition === 'unrelated') altered.executor.crazyWake.predecessor = 'another-predecessor';
    if (condition === 'claimed') Object.assign(altered.executor.crazyWake, { claimId: 'another-consumer', claimUntil: f.now() + 30000 });
    if (condition === 'expired') altered.executor.crazyWake.leaseUntil = f.now() - 1;
    if (condition === 'differentBinding') altered.executor.capsule = 'synthetic-newer-session-binding';
    f.set(f.canonical, altered);
    const immutable = clone(f.nodes.get(f.canonical));
    const result = await f.service.wake({ ticket: first.ticket });
    assert.equal(result._wake, undefined, condition);
    assert.deepEqual(f.nodes.get(f.canonical), immutable, condition);
    assert.equal(f.state().scores[2], 1);
  }
});

test('a claimed unpublished job cannot be reoffered by foreground retries', async () => {
  const f = fixture(), registered = await f.register();
  const raw = clone(f.nodes.get(f.canonical));
  Object.assign(raw.executor.crazyWake, { claimId: 'live-consumer', claimUntil: f.now() + 30000 });
  f.set(f.canonical, raw);
  const body = f.command(1, 'crazyAssign', { text: 'Stay queued while the consumer owns its claim.', target: 2 });
  const result = await f.run(body);
  assert.equal(result._wake, undefined);
  assert.equal(jobOf(f).id, registered._wake.key); assert.equal(jobOf(f).claimId, 'live-consumer');
  assert.equal(f.state().crazy.queue.length, 1);
});
