const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../open-mic-discovery.js');
const fixture = (overrides = {}) => ({ source: 'youtube', region: 'TW', fetchedAt: '2026-10-08T00:00:00Z',
  songs: [{ videoId: 'abcdefghijk', title: 'Our Party Song', channelTitle: 'Our Players', publishedAt: '2026-10-07T00:00:00Z' }], ...overrides });
const response = (body, status = 200, retryAfter) => ({ ok: status === 200, status,
  headers: { get: () => retryAfter ?? null }, json: async () => body });

test('discovery uses the same-origin route for normalized queries without any browser credential', async () => {
  const calls = [], client = service.createClient({ fetch: async (...args) => { calls.push(args); return response(fixture()); } });
  const data = await client.search('  Our   Party Song  ', { region: 'TW' });
  assert.equal(calls[0][0], '/api/open-mic-discovery?mode=search&region=TW&q=Our%20Party%20Song');
  assert.equal(calls[0][1].credentials, 'same-origin');
  assert.deepEqual(Object.keys(calls[0][1].headers), ['Accept']);
  assert.equal(data.songs[0].title, 'Our Party Song');
});

test('public music discovery preserves its region and validated update timestamp', async () => {
  let url;
  const client = service.createClient({ fetch: async input => { url = input; return response(fixture({ region: 'KR' })); } });
  const data = await client.popular({ region: 'KR' });
  assert.equal(url, '/api/open-mic-discovery?mode=popular&region=KR');
  assert.equal(data.source, 'youtube'); assert.equal(data.fetchedAt, '2026-10-08T00:00:00.000Z');
});

test('invalid queries and unsupported regions are rejected without a network request', async () => {
  let calls = 0;
  const client = service.createClient({ fetch: async () => { calls++; return response(fixture()); } });
  for (const query of ['', '   ', 'a'.repeat(101), 'bad\u0000query', null]) {
    await assert.rejects(client.search(query), error => error.code === 'discovery_invalid_query');
  }
  await assert.rejects(client.popular({ region: 'INVALID' }), error => error.code === 'discovery_invalid_region');
  assert.equal(calls, 0);
});

test('discovery rejects unsafe IDs and duplicate videos and generates its own trusted thumbnails', () => {
  const data = service.normalizeResponse(fixture({ songs: [
    { videoId: 'bad/<script', title: 'Bad record' },
    { videoId: 12345678901, title: 'A numeric video ID' },
    { videoId: 'abcdefghijk', title: 'Our\nParty Song', channelTitle: 'Players\u0000Channel', thumbnail: 'javascript:bad' },
    { videoId: 'abcdefghijk', title: 'Duplicate' },
    { videoId: '1234567890_', title: '   ' },
  ] }), 'TW');
  assert.equal(data.songs.length, 1);
  assert.equal(data.songs[0].thumbnail, 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(data.songs[0].title, 'Our Party Song'); assert.equal(data.songs[0].channelTitle, 'Players Channel');
});

test('discovery metadata and result counts remain bounded', () => {
  const songs = Array.from({ length: 50 }, (_, index) => ({ videoId: String(index).padStart(11, '0'), title: 'x'.repeat(900), channelTitle: 'y'.repeat(900) }));
  const data = service.normalizeResponse(fixture({ songs }), 'TW');
  assert.equal(data.songs.length, 12); assert.equal(data.songs[0].title.length, 120); assert.equal(data.songs[0].channelTitle.length, 120);
});

test('wrong sources, regions, timestamps, and response shapes do not masquerade as YouTube results', async () => {
  const bodies = [fixture({ source: 'other' }), fixture({ region: 'US' }), fixture({ fetchedAt: 'invalid' }), fixture({ songs: null }), null];
  for (const body of bodies) {
    const client = service.createClient({ fetch: async () => response(body) });
    await assert.rejects(client.popular(), error => error.code === 'discovery_unavailable');
  }
});

test('setup-needed and rate-limit responses are typed without exposing upstream error text', async () => {
  const missing = service.createClient({ fetch: async () => response({ error: 'discovery_setup_needed' }, 503) });
  await assert.rejects(missing.popular(), error => error.code === 'discovery_setup_needed');
  const limited = service.createClient({ fetch: async () => response({ error: 'discovery_rate_limit' }, 429, '60') });
  await assert.rejects(limited.search('Party Song'), error => error.code === 'discovery_rate_limit' && error.retryAfter === 60);
  const unavailable = service.createClient({ fetch: async () => response({ error: 'private upstream message' }, 403) });
  await assert.rejects(unavailable.popular(), error => error.code === 'discovery_unavailable' && !error.message.includes('private'));
});

test('a cancelled discovery request aborts the network operation and cannot return late data', async () => {
  let complete, signal;
  const controller = new AbortController();
  const client = service.createClient({ fetch: (_url, options) => { signal = options.signal; return new Promise(resolve => { complete = resolve; }); } });
  const work = client.search('Party Song', { signal: controller.signal });
  controller.abort(); assert.equal(signal.aborted, true); complete(response(fixture()));
  await assert.rejects(work, error => error.name === 'AbortError');
});

test('pre-cancelled requests never fetch and timeout cannot accept a late successful response', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const cancelled = service.createClient({ fetch: async () => { calls++; return response(fixture()); } });
  await assert.rejects(cancelled.popular({ signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(calls, 0);
  let timeout, cleared = false, finish;
  const client = service.createClient({ fetch: () => new Promise(resolve => { finish = resolve; }),
    setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => { cleared = true; } });
  const work = client.popular(); timeout(); finish(response(fixture()));
  await assert.rejects(work, error => error.code === 'discovery_unavailable');
  assert.equal(cleared, true);
});

test('malformed JSON remains a recoverable in-page service failure', async () => {
  const client = service.createClient({ fetch: async () => ({ ok: true, status: 200, json: async () => { throw new Error('invalid JSON'); } }) });
  await assert.rejects(client.popular(), error => error.code === 'discovery_unavailable');
});
