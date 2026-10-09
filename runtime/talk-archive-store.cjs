// Private handwritten challenges, independent of replaceable player cards.
// Only the service and a room-scoped operator reader hold this encryption key.
'use strict';
const crypto = require('node:crypto');
const DEFAULT_DB = 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
const CODE = /^[A-Z0-9]{4,12}$/;
const STATUSES = new Set(['queued', 'pending', 'done', 'skipped', 'expired', 'cancelled']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hashId = id => crypto.createHash('sha256').update(id).digest('hex');
function cleanRecord(input) {
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !input.id || input.id.length > 65536
      || !Number.isSafeInteger(input.version) || input.version < 1 || typeof input.text !== 'string'
      || !input.text.trim() || input.text.length > 120 || !['line', 'task'].includes(input.kind)
      || !STATUSES.has(input.status)) fail('archive_invalid_record');
  const record = { id: input.id, version: input.version, text: input.text, kind: input.kind, status: input.status };
  if (input.sessionId != null) {
    if (typeof input.sessionId !== 'string' || input.sessionId.length > 32768) fail('archive_invalid_record');
    record.sessionId = input.sessionId;
  }
  for (const field of ['createdAt', 'updatedAt', 'assignedAt', 'closedAt']) {
    if (input[field] == null) continue;
    if (!Number.isFinite(input[field]) || input[field] < 0) fail('archive_invalid_record');
    record[field] = input[field];
  }
  for (const field of ['author', 'target', 'recipient']) {
    const person = input[field];
    if (person == null) { if (field === 'target' || field === 'recipient') record[field] = null; continue; }
    if (typeof person !== 'object' || person.playerNum != null && (!Number.isInteger(person.playerNum) || person.playerNum < 1 || person.playerNum > 9)
        || person.name != null && (typeof person.name !== 'string' || person.name.length > 100)) fail('archive_invalid_record');
    record[field] = { playerNum: person.playerNum ?? null, ...(person.name == null ? {} : { name: person.name }) };
  }
  if (input.topic != null) {
    if (typeof input.topic !== 'object') fail('archive_invalid_record');
    record.topic = {};
    for (const [field, max] of [['title', 80], ['question', 500]]) {
      if (input.topic[field] == null) continue;
      if (typeof input.topic[field] !== 'string' || input.topic[field].length > max) fail('archive_invalid_record');
      record.topic[field] = input.topic[field];
    }
  }
  if (input.legacy === true) record.legacy = true;
  // Keep every accepted plaintext within the authenticated ciphertext limit,
  // including Unicode whose byte count exceeds its JavaScript string length.
  if (Buffer.byteLength(JSON.stringify(record), 'utf8') > 160000) fail('archive_invalid_record');
  return record;
}
function createStore({ secret, fetchImpl = globalThis.fetch, databaseURL = DEFAULT_DB } = {}) {
  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) fail('archive_invalid_key');
  if (databaseURL !== DEFAULT_DB && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(databaseURL)) fail('archive_invalid_database');
  const key = Buffer.from(secret, 'hex');
  function location(code) {
    if (typeof code !== 'string' || !CODE.test(code)) fail('archive_invalid_room');
    const token = crypto.createHmac('sha256', key).update('crazy-talk-archive-room-v1:' + code).digest('hex');
    return databaseURL + '/rooms/talk-archive/players/' + token + '.json';
  }
  const aad = (code, id) => Buffer.from('crazy-talk-private-archive-v1:' + code + ':' + id);
  function seal(code, id, record) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad(code, id));
    const bytes = Buffer.concat([cipher.update(JSON.stringify(record), 'utf8'), cipher.final()]);
    return { version: record.version, cipher: Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url') };
  }
  function open(code, id, entry) {
    try {
      if (!entry || !Number.isSafeInteger(entry.version) || entry.version < 1 || typeof entry.cipher !== 'string'
          || entry.cipher.length > 240000 || !/^[\w-]+$/.test(entry.cipher)) throw new Error();
      const bytes = Buffer.from(entry.cipher, 'base64url');
      if (bytes.length < 29) throw new Error();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
      decipher.setAAD(aad(code, id)); decipher.setAuthTag(bytes.subarray(12, 28));
      const record = cleanRecord(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')));
      if (record.version !== entry.version || hashId(record.id) !== id) throw new Error();
      return record;
    } catch { fail('archive_corrupt'); }
  }
  function document(value) {
    if (value == null) return { version: 1, entries: {} };
    if (value.version !== 1 || value.entries != null && (typeof value.entries !== 'object' || Array.isArray(value.entries))) fail('archive_corrupt');
    return { version: 1, entries: value.entries || {} };
  }
  async function request(url, options = {}) {
    try {
      const response = await fetchImpl(url, { credentials: 'omit', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.timeout(8000), ...options });
      return response;
    } catch { fail('archive_unavailable'); }
  }
  async function snapshot(url, etag = false) {
    const response = await request(url, { method: 'GET', ...(etag ? { headers: { 'X-Firebase-ETag': 'true' } } : {}) });
    if (!response.ok) fail('archive_unavailable');
    let value; try { value = await response.json(); } catch { fail('archive_corrupt'); }
    return { value: document(value), etag: response.headers.get('etag') };
  }
  async function readRoom(code) {
    const { value } = await snapshot(location(code));
    return Object.entries(value.entries).map(([id, entry]) => open(code, id, entry));
  }
  async function writeRoom(code, inputs) {
    const url = location(code);
    if (!Array.isArray(inputs)) fail('archive_invalid_record');
    const records = inputs.map(cleanRecord), versions = records.map(({ id, version }) => ({ id, version }));
    if (!records.length) return versions;
    for (let attempt = 0; attempt < 8; attempt++) {
      const old = await snapshot(url, true);
      if (!old.etag) fail('archive_unsafe_storage');
      const next = { version: 1, entries: { ...old.value.entries } }; let changed = false;
      for (const record of records) {
        const id = hashId(record.id), prior = next.entries[id] ? open(code, id, next.entries[id]) : null;
        if (prior?.version > record.version) continue;
        if (prior?.version === record.version) {
          if (JSON.stringify(prior) !== JSON.stringify(record)) fail('archive_conflict');
          continue;
        }
        next.entries[id] = seal(code, id, record); changed = true;
      }
      if (!changed) return versions;
      const response = await request(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': old.etag }, body: JSON.stringify(next) });
      if (response.status === 412) continue;
      if (!response.ok) fail('archive_unavailable');
      return versions;
    }
    fail('archive_busy');
  }
  return Object.freeze({ readRoom, writeRoom });
}
module.exports = { createStore, DEFAULT_DB };
