'use strict';

const TOPIC = 'crazy-talk-wake';
const REGION = 'sin1';
const RETENTION_SECONDS = 120;
const terminal = new Set(['invalid_wake', 'invalid_ticket', 'stale_session', 'game_switched']);

// The queue sees only an authenticated encrypted ticket. Authority, current
// membership and idempotent state transitions remain in the existing executor.
function retryError() {
  return Object.assign(new Error('wake_queue_unavailable'), { code: 'wake_queue_unavailable', status: 503 });
}
function validTicket(ticket) {
  return typeof ticket === 'string' && ticket.length > 0 && ticket.length <= 24000 && /^[A-Za-z0-9_-]+$/.test(ticket);
}
function createWakeQueue({ client, clientFactory, serviceFactory, env } = {}) {
  let queue = client, callback;
  const getQueue = () => {
    // Keep SDK loading lazy: importing runtime modules does not fetch tokens,
    // create a consumer, require a locally installed SDK, or read production env.
    if (!queue) queue = clientFactory ? clientFactory({ region: REGION })
      : new (require('@vercel/queue').QueueClient)({ region: REGION });
    return queue;
  };
  async function queueWake(wake, service) {
    if (wake == null) return null;
    if (!validTicket(wake.ticket) || typeof wake.key !== 'string' || !wake.key.trim()
        || wake.key.length > 256 || !Number.isFinite(wake.delayMs) || wake.delayMs < 0
        || Math.ceil(wake.delayMs / 1000) >= RETENTION_SECONDS) throw retryError();
    const ticket = wake.ticket, key = wake.key, delaySeconds = Math.ceil(wake.delayMs / 1000);
    try {
      await getQueue().send(TOPIC, { ticket }, {
        delaySeconds, retentionSeconds: RETENTION_SECONDS, idempotencyKey: key,
      });
      // Persist the enqueue marker only after native durable acceptance. If
      // this fails, retrying the same key cannot duplicate the queued message.
      if (typeof service?.noteWake === 'function') await service.noteWake({ ticket, stage: 'scheduled' });
      return { scheduled: true };
    } catch { throw retryError(); }
  }
  async function consume(message) {
    if (!message || typeof message !== 'object' || Array.isArray(message)
        || Object.keys(message).length !== 1 || !validTicket(message.ticket)) return;
    try {
      const values = env || process.env;
      const config = { secret: values.HUB_EXECUTOR_SECRET, archiveSecret: values.CRAZY_TALK_ARCHIVE_SECRET };
      const service = serviceFactory ? serviceFactory(config)
        : require('./hub-executor-core.cjs').createExecutor(config);
      if (typeof service.noteWake === 'function') await service.noteWake({ ticket: message.ticket, stage: 'started' });
      const result = await service.wake({ ticket: message.ticket });
      // The native consumer acknowledges only after its successor is durable,
      // including the enqueue marker. Transient storage/publish failures retry.
      await queueWake(result?._wake, service);
      if (typeof service.noteWake === 'function') await service.noteWake({ ticket: message.ticket, stage: 'response', status: 200 });
    } catch (error) {
      if (terminal.has(error?.code)) return;
      // Native SDK logging must not receive tokens, room paths or raw errors.
      throw retryError();
    }
  }
  function nativeCallback() {
    if (!callback) callback = getQueue().handleNodeCallback(consume, {
      visibilityTimeoutSeconds: 60,
      retry: () => ({ afterSeconds: 2 }),
    });
    return callback;
  }
  return { queueWake, consume, nativeCallback };
}

const defaultQueue = createWakeQueue();
function queueWake(wake, service) { return defaultQueue.queueWake(wake, service); }
function createWakeHandler(options) {
  const queue = createWakeQueue(options);
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(404).end();
    try { return await queue.nativeCallback()(req, res); }
    catch { return res.status(503).json({ error: 'wake_queue_unavailable' }); }
  };
}

module.exports = { TOPIC, REGION, RETENTION_SECONDS, createWakeQueue, queueWake, createWakeHandler };
