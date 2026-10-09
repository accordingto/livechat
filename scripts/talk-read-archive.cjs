
'use strict';
// Private operator-only reader. This never changes room or game state.
const USAGE = 'Use --room CODE [--limit 1..200] [--date YYYY-MM-DD].';
const READ_ERROR = 'Archive read failed.';
function parseArgs(args) {
  if (!Array.isArray(args)) throw new Error(USAGE);
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    if (!['--room', '--limit', '--date'].includes(flag) || Object.hasOwn(values, flag) || typeof value !== 'string') throw new Error(USAGE);
    values[flag] = value;
  }
  const room = values['--room'];
  if (!/^[A-Z0-9]{4,12}$/.test(room || '')) throw new Error(USAGE);
  const rawLimit = values['--limit'] ?? '100';
  const limit = Number(rawLimit);
  if (!/^\d+$/.test(rawLimit) || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error(USAGE);
  let dateBounds = null;
  if (values['--date'] != null) {
    const date = values['--date'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(USAGE);
    const midnight = Date.parse(date + 'T00:00:00.000Z');
    if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== date) throw new Error(USAGE);
    const start = Date.parse(date + 'T00:00:00.000+08:00');
    dateBounds = [start, start + 24 * 60 * 60 * 1000];
  }
  return { room, limit, dateBounds };
}
const timestamp = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8640000000000000 ? value : null;
const string = value => typeof value === 'string' ? value : null;
function safeRecord(record) {
  return {
    text: string(record?.text), kind: string(record?.kind), status: string(record?.status),
    createdAt: timestamp(record?.createdAt), assignedAt: timestamp(record?.assignedAt), closedAt: timestamp(record?.closedAt),
    authorName: string(record?.author?.name) ?? string(record?.authorName), recipientName: string(record?.recipient?.name) ?? string(record?.recipientName),
    targetName: string(record?.target?.name) ?? string(record?.targetName), topicQuestion: string(record?.topic?.question) ?? string(record?.topicQuestion),
  };
}
function write(sink, value) { if (typeof sink === 'function') sink(value); else sink.write(value); }
function defaultStoreFactory(options) { return require('../runtime/talk-archive-store.cjs').createStore(options); }
async function run(args, { env = process.env, storeFactory = defaultStoreFactory, stdout = process.stdout, stderr = process.stderr, fetchImpl = globalThis.fetch } = {}) {
  let options;
  try { options = parseArgs(args); }
  catch { write(stderr, USAGE + '\n'); return 2; }
  const secret = env.CRAZY_TALK_ARCHIVE_SECRET;
  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) {
    write(stderr, 'Archive key is unavailable.\n'); return 1;
  }
  try {
    const store = storeFactory({ secret, fetchImpl: (url, init = {}) => fetchImpl(url, {
      ...init, credentials: 'omit', redirect: 'error',
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    }) });
    const records = await store.readRoom(options.room);
    if (!Array.isArray(records)) throw new Error(READ_ERROR);
    const matching = records.map(safeRecord).filter(record => !options.dateBounds ||
      (record.createdAt != null && record.createdAt >= options.dateBounds[0] && record.createdAt < options.dateBounds[1]));
    matching.sort((a, b) => a.createdAt == null ? (b.createdAt == null ? 0 : -1) : b.createdAt == null ? 1 : a.createdAt - b.createdAt);
    const recent = matching.slice(-options.limit);
    write(stdout, JSON.stringify({ room: options.room, count: recent.length, total: matching.length, records: recent }) + '\n');
    return 0;
  } catch {
    write(stderr, READ_ERROR + '\n'); return 1;
  }
}
module.exports = { run };
if (require.main === module) run(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(() => { process.stderr.write(READ_ERROR + '\n'); process.exitCode = 1; });

