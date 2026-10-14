'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/talk-vnext-fixture.cjs');
const { createExecutor, keyFrom, unseal } = require('../runtime/hub-executor-core.cjs');

const SECRET = '51'.repeat(32);
const clone = value => structuredClone(value);
const lostResponse = () => Object.assign(new Error('synthetic uncertain write'), {
  code: 'storage_unavailable', status: 503
});

async function setup() {
  const f = fixture();
  const registration = await f.register();
  await f.act(0, 'start');
  await f.act(1, 'crazyAssign', { target: 2, text: 'Award your spoon a tiny medal.' });
  await f.shown(2);
  await f.act(2, 'crazyDone', { promptId: f.state().crazy.prompts[2].id });
  await f.act(1, 'crazyAssign', { target: 3, text: 'Introduce your sock as our new chef.' });
  assert.equal(f.state().scores[2], 1);
  const originalJob = clone(f.nodes.get(f.canonical).executor.crazyWake);
  let armed = null, attemptedJob = null, foreignJob = null;
  const fetchImpl = async (url, options = {}) => {
    const path = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    const next = options.method === 'PUT' ? JSON.parse(options.body) : null;
    if (armed && path === f.canonical && next?.executor?.crazyWake?.id
        && next.executor.crazyWake.id !== originalJob.id) {
      const mode = armed; armed = null;
      attemptedJob = clone(next.executor.crazyWake);
      if (mode === 'beforeCommit') throw lostResponse();
      const committed = await f.fetchImpl(url, options);
      if (!committed.ok) return committed;
      if (mode === 'anotherJob') {
        const current = clone(f.nodes.get(f.canonical));
        foreignJob = { ...current.executor.crazyWake, id: 'synthetic-other-writer-job' };
        current.executor.crazyWake = foreignJob; f.set(f.canonical, current);
      } else if (mode === 'anotherBinding') {
        const current = clone(f.nodes.get(f.canonical));
        current.executor.capsule = 'synthetic-newer-binding'; f.set(f.canonical, current);
      }
      throw lostResponse();
    }
    return f.fetchImpl(url, options);
  };
  const service = createExecutor({ secret: SECRET, archiveSecret: '82'.repeat(32),
    databaseURL: 'http://localhost', fetchImpl, now: f.now });
  return { f, service, registration, originalJob, arm: mode => { armed = mode; },
    attempted: () => attemptedJob, foreign: () => foreignJob };
}

test('a committed successor with a lost PUT response is returned and continues without foreground requests', async () => {
  const h = await setup(), { f, service, registration, originalJob } = h;
  const beforeExecutor = clone(f.nodes.get(f.canonical).executor);
  const originalPending = f.state().crazy.prompts[3].id;
  h.arm('afterCommit'); f.advance(20000);
  const result = await service.wake({ ticket: registration._wake.ticket });
  assert.ok(result._wake?.ticket, 'the committed successor must still reach the scheduler');
  const actual = f.nodes.get(f.canonical).executor.crazyWake;
  const signed = unseal(result._wake.ticket, keyFrom(SECRET));
  assert.notEqual(actual.id, originalJob.id); assert.equal(actual.id, h.attempted().id);
  assert.equal(signed.id, actual.id); assert.equal(signed.capsule, f.capsule());
  assert.equal(signed.expiresAt, actual.leaseUntil); assert.equal(actual.claimId, undefined);
  assert.ok(result._wake.delayMs >= 0 && result._wake.delayMs <= 20000);
  assert.equal(f.state().crazy.prompts[3].id, originalPending);
  await service.noteWake({ ticket: result._wake.ticket, stage: 'scheduled', status: 202 });
  assert.deepEqual(await service.wake({ ticket: registration._wake.ticket }), { ok: true, obsolete: true });

  let next = result._wake;
  for (let step = 0; next && step < 12; step++) {
    f.advance(next.delayMs);
    const wake = await service.wake({ ticket: next.ticket }); next = wake._wake;
  }
  assert.equal(f.state().crazy.roundStage, 'decision');
  assert.equal(f.state().scores[2], 1);
  assert.equal(Object.values(f.state().scores).reduce((sum, score) => sum + score, 0), 1);
  assert.equal(f.state().crazy.prompts[3].id, originalPending, 'retry must not manufacture another assignment');
  assert.equal(f.state().crazy.prompts[3].status, 'withdrawn');
  const finalExecutor = f.nodes.get(f.canonical).executor;
  assert.equal(finalExecutor.crazyWake, undefined);
  assert.equal(finalExecutor.hostSeenAt, beforeExecutor.hostSeenAt);
  assert.deepEqual(finalExecutor.presence, beforeExecutor.presence, 'background recovery cannot create player heartbeats');
});

test('a failure before successor commit propagates and preserves the exact original job for retry', async () => {
  const h = await setup(), { f, service, registration, originalJob } = h;
  h.arm('beforeCommit'); f.advance(20000);
  await assert.rejects(service.wake({ ticket: registration._wake.ticket }), { code: 'storage_unavailable' });
  const current = f.nodes.get(f.canonical).executor.crazyWake;
  assert.equal(current.id, originalJob.id); assert.equal(current.claimId, undefined);
  const pendingId = f.state().crazy.prompts[3].id;
  const before = clone(f.nodes.get(f.canonical).executor);
  const retry = await service.wake({ ticket: registration._wake.ticket });
  assert.ok(retry._wake?.ticket); assert.notEqual(f.nodes.get(f.canonical).executor.crazyWake.id, originalJob.id);
  assert.equal(f.state().crazy.prompts[3].id, pendingId); assert.equal(f.state().scores[2], 1);
  assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt, before.hostSeenAt);
  assert.deepEqual(f.nodes.get(f.canonical).executor.presence, before.presence);
});

test('uncertain write recovery cannot adopt another writer job or a changed session binding', async () => {
  for (const mode of ['anotherJob', 'anotherBinding']) {
    const h = await setup(), { f, service, registration } = h;
    h.arm(mode); f.advance(20000);
    await assert.rejects(service.wake({ ticket: registration._wake.ticket }), { code: 'storage_unavailable' });
    const current = f.nodes.get(f.canonical);
    if (mode === 'anotherJob') {
      assert.equal(current.executor.crazyWake.id, h.foreign().id);
      assert.notEqual(current.executor.crazyWake.id, h.attempted().id);
    } else assert.equal(current.executor.capsule, 'synthetic-newer-binding');
    assert.equal(f.state().scores[2], 1);
  }
});
