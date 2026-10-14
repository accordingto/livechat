'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWakeQueue, createWakeHandler, TOPIC, REGION } = require('../runtime/talk-wake-queue.cjs');
const { fixture } = require('./helpers/talk-vnext-fixture.cjs');
const { unseal, keyFrom } = require('../runtime/hub-executor-core.cjs');
const clone = value => value == null ? value : structuredClone(value);
const flush = () => new Promise(resolve => setImmediate(resolve));
const ticket = 'synthetic_encrypted_ticket';
const plan = (extra = {}) => ({ ticket, key: 'opaque-job-id', delayMs: 1501, ...extra });
const env = { HUB_EXECUTOR_SECRET: '31'.repeat(32), CRAZY_TALK_ARCHIVE_SECRET: '73'.repeat(32) };
const privateError = code => Object.assign(new Error('rooms/PRIVATE/players/bearer private-card-text secret-value'), { code });
const response = () => ({ headers: {}, statusCode: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; }, end() { this.ended = true; return this; } });
function fakeNative(send = async () => ({ messageId: 'native-message' })) {
  const client = { calls: [], acknowledged: 0, failures: [],
    async send(...args) { client.calls.push(clone(args)); return send(...args); },
    handleNodeCallback(consume, options) {
      client.consumer = consume; client.options = options;
      return async (req, res) => {
        try { await consume(req.decoded); client.acknowledged++; return res.status(200).json({ status: 'success' }); }
        catch (error) { client.failures.push({ error, retry: options.retry(error, { deliveryCount: 1 }) }); return res.status(503).json({ error: 'retry' }); }
      };
    } };
  return client;
}

test('publisher sends only encrypted ticket with native delay, region, retention and stable idempotency', async () => {
  const made = [], order = [], client = fakeNative(async () => { order.push('accepted'); });
  const queue = createWakeQueue({ clientFactory(options) { made.push(options); return client; } });
  assert.equal(made.length, 0);
  const wake = { ...plan(), room: 'PRIVATE', controlToken: 'not-for-queue', text: 'not-for-queue' };
  const service = { async noteWake(value) { order.push('noted'); assert.deepEqual(value, { ticket, stage: 'scheduled' }); } };
  assert.deepEqual(await queue.queueWake(wake, service), { scheduled: true });
  await queue.queueWake(wake, service);
  assert.deepEqual(made, [{ region: REGION }]);
  assert.deepEqual(client.calls, [0, 1].map(() => [TOPIC, { ticket }, { delaySeconds: 2, retentionSeconds: 120, idempotencyKey: wake.key }]));
  assert.deepEqual(order, ['accepted', 'noted', 'accepted', 'noted']);
  assert.doesNotMatch(JSON.stringify(client.calls), /PRIVATE|controlToken|not-for-queue/);
});

test('publisher waits for durable acceptance before marking or resolving and keeps zero delay valid', async () => {
  let release, noted = false, finished = false;
  const gate = new Promise(resolve => { release = resolve; });
  const client = fakeNative(() => gate), queue = createWakeQueue({ client });
  const pending = queue.queueWake(plan({ delayMs: 0 }), { async noteWake() { noted = true; } }).then(() => { finished = true; });
  await flush(); assert.equal(noted, false); assert.equal(finished, false);
  release({ messageId: null }); await pending;
  assert.equal(noted, true); assert.equal(finished, true); assert.equal(client.calls[0][2].delaySeconds, 0);
});

test('invalid plans fail closed before loading the SDK or publishing, while absent work is harmless', async () => {
  let clients = 0;
  const queue = createWakeQueue({ clientFactory() { clients++; throw Error('must not load'); } });
  assert.equal(await queue.queueWake(null), null);
  for (const wake of [{}, plan({ ticket: '' }), plan({ ticket: 'not a sealed ticket' }), plan({ key: '' }),
    plan({ key: 'k'.repeat(257) }), plan({ delayMs: -1 }), plan({ delayMs: Infinity }), plan({ delayMs: '5' }), plan({ delayMs: 120000 })]) {
    await assert.rejects(queue.queueWake(wake), { code: 'wake_queue_unavailable', status: 503 });
  }
  assert.equal(clients, 0);
});

test('publish and post-send marker failures are sanitized and retried with exactly the same key', async () => {
  let fail = true, notes = 0;
  const client = fakeNative(async () => { if (fail) throw privateError('storage_unavailable'); });
  const queue = createWakeQueue({ client }), service = { async noteWake() { notes++; } };
  await assert.rejects(queue.queueWake(plan(), service), error => {
    assert.equal(error.code, 'wake_queue_unavailable'); assert.doesNotMatch(error.message, /PRIVATE|bearer|card-text|secret-value/); return true;
  });
  assert.equal(notes, 0); fail = false;
  await assert.rejects(queue.queueWake(plan(), { async noteWake() { throw privateError('storage_unavailable'); } }), { code: 'wake_queue_unavailable' });
  await queue.queueWake(plan(), service);
  assert.equal(notes, 1); assert.deepEqual(client.calls[0], client.calls[1]); assert.deepEqual(client.calls[1], client.calls[2]);
});

test('consumer accepts only the queue ticket and creates a fresh executor with the two existing secrets per message', async () => {
  const made = [], consumed = [], client = fakeNative();
  const queue = createWakeQueue({ client, env, serviceFactory(config) {
    made.push(config); return { async wake(value) { consumed.push(value); return { ok: true }; } };
  } });
  for (const message of [null, [], {}, { ticket: '' }, { ticket, actor: 0 }, { ticket, command: {} }]) await queue.consume(message);
  assert.equal(made.length, 0);
  await queue.consume({ ticket }); await queue.consume({ ticket });
  assert.deepEqual(made, [env, env].map(value => ({ secret: value.HUB_EXECUTOR_SECRET, archiveSecret: value.CRAZY_TALK_ARCHIVE_SECRET })));
  assert.deepEqual(consumed, [{ ticket }, { ticket }]); assert.equal(client.calls.length, 0);
});

test('native callback acknowledges only after successor publish and marker, with bounded native retry settings', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; }), order = [];
  const client = fakeNative(async () => { order.push('publishing'); await gate; order.push('accepted'); });
  const handler = createWakeHandler({ client, env, serviceFactory: () => ({
    async wake(value) { assert.deepEqual(value, { ticket }); order.push('advanced'); return { _wake: plan() }; },
    async noteWake(value) { order.push(value.stage); if (value.stage === 'response') assert.equal(value.status, 200); },
  }) });
  const res = response(), pending = handler({ method: 'POST', decoded: { ticket } }, res);
  await flush(); assert.equal(client.acknowledged, 0); assert.deepEqual(order, ['started', 'advanced', 'publishing']);
  release(); await pending;
  assert.deepEqual(order, ['started', 'advanced', 'publishing', 'accepted', 'scheduled', 'response']); assert.equal(client.acknowledged, 1);
  assert.equal(res.statusCode, 200); assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(client.options.visibilityTimeoutSeconds, 60); assert.deepEqual(client.options.retry(Error()), { afterSeconds: 2 });
});

test('native retry preserves storage and publish failures while terminal old-room jobs acknowledge', async () => {
  for (const code of ['invalid_wake', 'invalid_ticket', 'stale_session', 'game_switched', 'storage_unavailable', 'wake_busy', 'executor_not_configured']) {
    const client = fakeNative(), handler = createWakeHandler({ client, env,
      serviceFactory: () => ({ async wake() { throw privateError(code); } }) });
    const res = response(); await handler({ method: 'POST', decoded: { ticket } }, res);
    const terminal = ['invalid_wake', 'invalid_ticket', 'stale_session', 'game_switched'].includes(code);
    assert.equal(client.acknowledged, terminal ? 1 : 0, code);
    assert.equal(client.failures.length, terminal ? 0 : 1, code);
    if (!terminal) { assert.equal(client.failures[0].error.code, 'wake_queue_unavailable'); assert.deepEqual(client.failures[0].retry, { afterSeconds: 2 }); }
    assert.doesNotMatch(JSON.stringify(res), /PRIVATE|bearer|card-text|secret-value|synthetic_encrypted_ticket/);
  }
  const client = fakeNative(async () => { throw privateError('sdk_failure'); });
  const handler = createWakeHandler({ client, env, serviceFactory: () => ({ async wake() { return { _wake: plan() }; } }) });
  const res = response(); await handler({ method: 'POST', decoded: { ticket } }, res);
  assert.equal(client.acknowledged, 0); assert.equal(client.failures[0].error.code, 'wake_queue_unavailable');
});

test('private API imports without queue SDK or secrets and non-POST never initializes either dependency', async () => {
  const actual = require('../api/talk-wake.js'), actualRes = response();
  await actual({ method: 'GET' }, actualRes); assert.equal(actualRes.statusCode, 404);
  let clients = 0, services = 0;
  const handler = createWakeHandler({ env: new Proxy({}, { get() { throw Error('must not read'); } }),
    clientFactory() { clients++; throw Error('must not load'); }, serviceFactory() { services++; } });
  for (const method of ['GET', 'OPTIONS', 'PUT']) { const res = response(); await handler({ method }, res); assert.equal(res.statusCode, 404); }
  assert.equal(clients, 0); assert.equal(services, 0);
  const missingSDK = createWakeHandler({ clientFactory() { throw privateError('sdk_unavailable'); } });
  const res = response(); await missingSDK({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 503); assert.deepEqual(res.body, { error: 'wake_queue_unavailable' });
});

function broker(f, { failSendAt = 0, failMarkerAt = 0 } = {}) {
  const jobs = [], sent = [], accepted = new Set(); let sends = 0, markers = 0, made = 0;
  const service = { wake: f.service.wake, async noteWake(value) {
    if (++markers === failMarkerAt) throw privateError('storage_unavailable');
    return f.service.noteWake(value);
  } };
  const client = { async send(topic, message, options) {
    sent.push(clone({ topic, message, options }));
    if (++sends === failSendAt) throw privateError('publish_failed');
    if (!accepted.has(options.idempotencyKey)) {
      accepted.add(options.idempotencyKey); jobs.push({ at: f.now() + options.delaySeconds * 1000, message: clone(message) });
    }
    return { messageId: 'opaque-native-' + sends };
  } };
  const queue = createWakeQueue({ client, env, serviceFactory: () => { made++; return service; } });
  return { queue, jobs, sent, service, made: () => made };
}

test('real core native messages advance well beyond self-HTTP recursion limits to 150s expiry and round decision without browser heartbeats', async () => {
  const f = fixture({ gameSeconds: 300 }), b = broker(f);
  await b.queue.queueWake((await f.register())._wake, b.service);
  await b.queue.queueWake((await f.act(0, 'start')).result._wake, b.service);
  await b.queue.queueWake((await f.act(1, 'crazyAssign', { target: 2, text: 'Ask your spoon to dance.' })).result._wake, b.service);
  await b.queue.queueWake((await f.shown(2)).result._wake, b.service);
  const presence = clone(f.nodes.get(f.canonical).executor.presence), hostSeenAt = f.nodes.get(f.canonical).executor.hostSeenAt;
  let messages = 0;
  while (b.jobs.length && messages++ < 40) {
    b.jobs.sort((a, c) => a.at - c.at); const job = b.jobs.shift(); f.advance(Math.max(0, job.at - f.now()));
    await b.queue.consume(job.message);
    if (f.state().crazy.roundStage === 'decision' && !b.jobs.length) break;
  }
  assert.ok(messages >= 15, 'the durable chain continues beyond several successful self-call hops');
  assert.equal(b.made(), messages); assert.equal(f.state().crazy.prompts[2].status, 'expired');
  assert.equal(f.state().crazy.receivers[2].paused, true); assert.equal(f.state().scores[2], 0);
  assert.equal(f.state().crazy.roundStage, 'decision'); assert.equal(b.jobs.length, 0);
  assert.deepEqual(f.nodes.get(f.canonical).executor.presence, presence); assert.equal(f.nodes.get(f.canonical).executor.hostSeenAt, hostSeenAt);
  for (const sent of b.sent) {
    assert.deepEqual(Object.keys(sent.message), ['ticket']); assert.equal(sent.topic, TOPIC);
    assert.equal(sent.options.retentionSeconds, 120); assert.ok(sent.options.idempotencyKey);
  }
});

for (const failure of ['send', 'marker']) test('real core retries a committed successor after ' + failure + ' failure without duplicate native messages', async () => {
  const f = fixture({ gameSeconds: 300 }), b = broker(f, failure === 'send' ? { failSendAt: 2 } : { failMarkerAt: 3 });
  await b.queue.queueWake((await f.register())._wake, b.service);
  await b.queue.queueWake((await f.act(0, 'start')).result._wake, b.service);
  const first = b.jobs.shift(); f.advance(first.at - f.now());
  await assert.rejects(b.queue.consume(first.message), { code: 'wake_queue_unavailable' });
  const successor = clone(f.nodes.get(f.canonical).executor.crazyWake);
  assert.ok(successor.predecessor); assert.equal(successor.enqueuedAt, undefined);
  await b.queue.consume(first.message);
  assert.equal(f.nodes.get(f.canonical).executor.crazyWake.id, successor.id);
  assert.equal(f.nodes.get(f.canonical).executor.crazyWake.enqueuedAt, f.now());
  assert.equal(b.jobs.length, 1); assert.equal(b.sent[1].options.idempotencyKey, b.sent[2].options.idempotencyKey);
  const firstTicket = unseal(b.sent[1].message.ticket, keyFrom('51'.repeat(32)));
  const retriedTicket = unseal(b.sent[2].message.ticket, keyFrom('51'.repeat(32)));
  assert.equal(firstTicket.id, retriedTicket.id); assert.equal(firstTicket.expiresAt, retriedTicket.expiresAt);
  assert.equal(firstTicket.capsule === retriedTicket.capsule, true, 'fresh encryption nonces still bind the same authenticated job');
});
