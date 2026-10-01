'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { HistoryScope, mergeHistory } = require('../chat-wolf-history.js');
const clone = x => JSON.parse(JSON.stringify(x));
class Store {
  constructor() { this.values = new Map(); this.failAfterRoom = false; this.roomCommits = 0; }
  async get(path) {
    const value = clone(this.values.get(path) || null);
    return { value, etag: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
  }
  async put(path, value, etag) {
    const current = this.values.get(path) || null;
    if (etag && createHash('sha256').update(JSON.stringify(current)).digest('hex') !== etag) return { conflict: true };
    this.values.set(path, clone(value));
    if (path === 'private/room') {
      this.roomCommits++;
      if (this.failAfterRoom) { this.failAfterRoom = false; throw Object.assign(new Error('lost response'), { code: 'NETWORK' }); }
    }
    return { value: clone(value) };
  }
}
const token = 'a'.repeat(64);
const history = number => ({ version: 1, serial: number, wolfTasks: [{ exposureId: 'exposure-' + number, canonicalTaskKey: 'wolf-' + number }],
  villageTasks: [], deals: [{ matchId: 'match-' + number }] });
const create = (store, owner = 'first', clock) => new HistoryScope({ store, token, owner, clock });
async function proposal(store, n = 1) {
  return { roomPath: 'private/room', baseEtag: (await store.get('private/room')).etag,
    nextDoc: { data: JSON.stringify({ room: { matchId: 'match-' + n } }) }, history: history(n), roomCode: 'ABC234', id: 'transaction-' + n };
}
test('history and room commit once; shared wolf exposure is not counted by repeated reads', async () => {
  const store = new Store(), scope = create(store);
  await scope.acquire();
  assert.deepEqual(scope.historyFor('ABC234', null).wolfTasks, []);
  const p = await proposal(store);
  assert.deepEqual(await scope.commit(p), { conflict: false });
  for (let i = 0; i < 3; i++) {
    const next = create(store, 'reader-' + i);
    await next.acquire(); assert.deepEqual(next.historyFor('ABC234', null), history(1)); await next.release();
  }
  assert.equal(store.roomCommits, 1);
});
test('failed selection can release without any exposure or room mutation', async () => {
  const store = new Store(), scope = create(store);
  await scope.acquire(); await scope.release();
  assert.equal(JSON.parse((await store.get(scope.path)).value.data).history, null);
  assert.equal(store.roomCommits, 0);
});
test('room CAS conflict does not count a proposed exposure or overwrite the competing state', async () => {
  const store = new Store(), scope = create(store);
  await scope.acquire(); const p = await proposal(store);
  await store.put('private/room', { other: true });
  assert.deepEqual(await scope.commit(p), { conflict: true });
  assert.deepEqual((await store.get('private/room')).value, { other: true });
  assert.equal(JSON.parse((await store.get(scope.path)).value.data).history, null);
});
test('new room recovers a crash after successful room write before drawing', async () => {
  const store = new Store(), scope = create(store);
  await scope.acquire(); const p = await proposal(store);
  store.failAfterRoom = true;
  await assert.rejects(scope.commit(p), { code: 'NETWORK' });
  const next = create(store, 'new-room');
  await next.acquire();
  assert.deepEqual(next.historyFor('NEW234', null), history(1));
  assert.equal(store.roomCommits, 1, 'recover by persisted transaction marker, never redraw');
  await next.release();
});
test('a pending allocation is completed before another room acquires history', async () => {
  const store = new Store(), scope = create(store);
  await scope.acquire(); const p = await proposal(store);
  const state = JSON.parse(scope.lock.value.data);
  state.pending = { ...p, nextDoc: { ...p.nextDoc, historyTransactionId: p.id } };
  await store.put(scope.path, { data: JSON.stringify(state), owner: 'crashed', leaseUntil: 1 }, scope.lock.etag);
  const next = create(store, 'next');
  await next.acquire();
  assert.deepEqual(next.historyFor('NEW234', null), history(1));
  assert.equal(store.roomCommits, 1);
  await next.release();
});
test('two rooms cannot hold one history allocation lock and stale owner cannot commit', async () => {
  const store = new Store(); let now = 100;
  const first = create(store, 'first', () => now), second = create(store, 'second', () => now);
  await first.acquire();
  await assert.rejects(second.acquire(), { code: 'ACTION_PENDING' });
  const stale = await proposal(store);
  now += 30001;
  await second.acquire();
  await assert.rejects(first.commit(stale), { code: 'ACTION_CONFLICT' });
  assert.equal(store.roomCommits, 0);
  await second.release();
});
test('separate histories preserve latest shared ordering, do not evict wolves with village cards', () => {
  const shared = history(3), local = history(1);
  local.villageTasks = Array.from({ length: 70 }, (_, i) => ({ exposureId: 'v-' + i }));
  const result = mergeHistory(shared, local);
  assert.deepEqual(result.wolfTasks.map(x => x.canonicalTaskKey), ['wolf-1', 'wolf-3']);
  assert.equal(result.villageTasks.length, 60);
  assert.equal(result.serial, 3);
});
test('simultaneous scope acquisition has exactly one winner', async () => {
  const store = new Store(), first = create(store,'one'), second = create(store,'two');
  const results = await Promise.allSettled([first.acquire(),second.acquire()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await first.release(); await second.release();
});
