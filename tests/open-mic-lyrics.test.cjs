const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../open-mic-lyrics.js'), 'utf8');
// Synthetic fixtures only: no copyrighted song text is stored or printed.
const track = (id = 1, extra = {}) => ({ id, trackName: 'Example Song', artistName: 'Example Artist', albumName: 'Example Album',
  plainLyrics: 'A made-up first line\nAn invented second line', syncedLyrics: null, instrumental: false, ...extra });
const response = (data, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status,
  headers: { get: key => headers[key] ?? null }, json: async () => data });
const plain = value => JSON.parse(JSON.stringify(value));
function setup(fetch, extra = {}) {
  const calls = [], timers = new Map(); let serial = 0, now = 1000;
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({ module: { exports: {} }, URL, AbortController, Date: Clock,
    fetch: async (...args) => { calls.push(args); return fetch(...args); },
    setTimeout: (callback, ms) => { const id = ++serial; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id), ...extra });
  vm.runInContext(source, context);
  return { L: context.module.exports, calls, timers, context, advance: ms => { now += ms; } };
}

test('browser global and CommonJS exports expose the same small search API', () => {
  const browser = vm.createContext({ URL, AbortController, setTimeout, clearTimeout });
  vm.runInContext(source, browser);
  assert.equal(typeof browser.OPEN_MIC_LYRICS.search, 'function'); assert.equal(typeof browser.OPEN_MIC_LYRICS.infer, 'function');
  assert.equal(typeof require('../open-mic-lyrics.js').search, 'function');
});

test('structured search uses encoded track and optional artist fields on the official endpoint without credentials', async () => {
  const h = setup(async () => response([track()]));
  const result = await h.L.search({ title: ' Our Song & Friends ', artist: 'A/B Artist' });
  const [requestURL, options] = h.calls[0]; const url = new URL(requestURL);
  assert.equal(url.origin + url.pathname, 'https://lrclib.net/api/search');
  assert.equal(url.searchParams.get('track_name'), 'Our Song & Friends'); assert.equal(url.searchParams.get('artist_name'), 'A/B Artist');
  assert.equal(url.searchParams.has('q'), false); assert.equal(options.credentials, 'omit'); assert.equal(options.method, 'GET');
  assert.equal(options.mode, 'cors'); assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(plain(result[0]), { id: '1', title: 'Example Song', artist: 'Example Artist', album: 'Example Album',
    lyrics: 'A made-up first line\nAn invented second line', instrumental: false });
  assert.equal(h.timers.size, 0);
});

test('free search q overrides structured fields and never allows a supplied URL or extra query parameter', async () => {
  const h = setup(async () => response([]));
  await h.L.search({ title: 'Ignored', artist: 'Ignored', query: 'Chinese 歌曲 &track_name=anything' });
  const url = new URL(h.calls[0][0]);
  assert.equal(url.searchParams.get('q'), 'Chinese 歌曲 &track_name=anything'); assert.equal([...url.searchParams].length, 1);
  assert.equal(url.hostname, 'lrclib.net');
  await h.L.search({ title: 'Only song' }); assert.equal(new URL(h.calls[1][0]).searchParams.has('artist_name'), false);
});

test('empty, nonstring, oversized, and hidden-control queries fail before making a request', async () => {
  const h = setup(async () => response([]));
  for (const input of [null, [], {}, { artist: 'Artist only' }, { title: '   ' }, { title: 2 },
    { title: 'x'.repeat(161) }, { query: 'x'.repeat(321) }, { title: 'Hidden\u0000text' }, { title: 'Valid', artist: {} }]) {
    await assert.rejects(h.L.search(input), { code: 'invalid_lyrics_query' });
  }
  assert.equal(h.calls.length, 0);
});

test('synced-only records become plain multiline lyrics without timing or LRC metadata', async () => {
  const h = setup(async () => response([track(3, { plainLyrics: null,
    syncedLyrics: '[ar:Synthetic Artist]\r\n[ti:Example]\r\n[00:01.00][00:02.000]First invented line\r\n[00:03]Second <00:03.500>invented line\r\n[Chorus]\r\n[00:05.00]Last invented line' })]));
  const result = await h.L.search({ title: 'Synced sample' });
  assert.equal(result[0].lyrics, 'First invented line\nSecond invented line\n[Chorus]\nLast invented line');
});

test('plain lyrics take priority; content is control-safe and metadata stays bounded plain text', async () => {
  const h = setup(async () => response([track(7, { trackName: 'Title'.repeat(80), artistName: 'Artist\n\u0000Name', albumName: 'Album'.repeat(80),
    plainLyrics: 'Original\u0000 first line\r\nAnother\tline', syncedLyrics: '[00:01]Should not replace plain' }),
    track(8, { trackName: '<img src=x onerror=alert(1)>', plainLyrics: '<b>Literal text</b>' })]));
  const result = await h.L.search({ title: 'Safe text' });
  assert.equal(result[0].lyrics, 'Original first line\nAnother\tline');
  assert.equal(result[0].title.length, 160); assert.equal(result[0].album.length, 160);
  assert.equal(result[0].artist, 'Artist Name');
  assert.equal(result[1].title, '<img src=x onerror=alert(1)>'); assert.equal(result[1].lyrics, '<b>Literal text</b>');
  assert.equal('document' in h.context, false); // No DOM or markup interpretation.
});

test('invalid, empty, overlong and duplicate records are filtered while instrumental records remain identifiable', async () => {
  const h = setup(async () => response([null, {}, track(0), track('not-an-id'), track(1, { trackName: {} }),
    track(2, { plainLyrics: null }), track(3, { plainLyrics: 'x'.repeat(16001) }),
    track(4, { instrumental: true, plainLyrics: null }), track(5), track(5, { plainLyrics: 'Duplicate' }),
    track(6, { plainLyrics: 'x'.repeat(16000) }), track(7, { trackName: '', name: 'Fallback name' })]));
  const result = await h.L.search({ title: 'Filter sample' });
  assert.deepEqual(Array.from(result, r => r.id), ['4', '5', '6', '7']);
  assert.equal(result[0].instrumental, true); assert.equal(result[0].lyrics, '');
  assert.equal(result[2].lyrics.length, 16000); assert.equal(result[3].title, 'Fallback name');
});

test('at most 20 candidates are returned without reordering the provider ranking', async () => {
  const h = setup(async () => response(Array.from({ length: 50 }, (_, i) => track(i + 1))));
  const result = await h.L.search({ title: 'Many matches' });
  assert.equal(result.length, 20); assert.equal(result[0].id, '1'); assert.equal(result.at(-1).id, '20');
});

test('bounded success cache returns detached records, expires, and does not cache failures', async () => {
  let failing = false;
  const h = setup(async () => failing ? response([], 500) : response([track()]));
  const first = await h.L.search({ title: 'Cached song' }); first[0].lyrics = 'Client edit';
  const second = await h.L.search({ title: 'Cached song' });
  assert.equal(h.calls.length, 1); assert.notEqual(second[0].lyrics, 'Client edit');
  h.advance(300001); await h.L.search({ title: 'Cached song' }); assert.equal(h.calls.length, 2);
  for (let i = 0; i < 12; i++) await h.L.search({ title: 'Other ' + i });
  await h.L.search({ title: 'Cached song' }); assert.equal(h.calls.length, 15);
  failing = true;
  await assert.rejects(h.L.search({ title: 'Retry song' }), { code: 'lyrics_unavailable' });
  failing = false; await h.L.search({ title: 'Retry song' }); assert.equal(h.calls.length, 17);
});

test('rate limits and server overload expose bounded retry hints; malformed bodies and network errors are unavailable', async () => {
  for (const [status, headers, code, retryAfter] of [
    [429, { 'Retry-After': '40' }, 'lyrics_rate_limit', 40],
    [429, {}, 'lyrics_rate_limit', 30], [429, { 'Retry-After': '999999' }, 'lyrics_rate_limit', 3600],
    [503, { 'Retry-After': '2' }, 'lyrics_unavailable', 2], [400, {}, 'invalid_lyrics_query', undefined]]) {
    const h = setup(async () => response([], status, headers));
    await assert.rejects(h.L.search({ title: 'Error sample' }), error => error.code === code && error.retryAfter === retryAfter);
    assert.equal(h.timers.size, 0);
  }
  const dateHint = setup(async () => response([], 429, { 'Retry-After': new Date(1000 + 45000).toUTCString() }));
  await assert.rejects(dateHint.L.search({ title: 'Date hint' }), error => error.retryAfter === 45);
  for (const fn of [async () => { throw new TypeError('network failed'); }, async () => response({ not: 'array' }),
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad JSON'); } })]) {
    const h = setup(fn); await assert.rejects(h.L.search({ title: 'Failure sample' }), { code: 'lyrics_unavailable' });
  }
});

test('caller cancellation aborts only its request and pre-aborted signals skip the network', async () => {
  const h = setup(() => new Promise(() => {}));
  const pre = new AbortController(); pre.abort();
  await assert.rejects(h.L.search({ title: 'Cancel' }, { signal: pre.signal }), { name: 'AbortError' });
  assert.equal(h.calls.length, 0);
  const one = new AbortController(); const pending = h.L.search({ title: 'Cancel' }, { signal: one.signal });
  one.abort(); await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.timers.size, 0);
  // A late successful result cannot populate the cache after cancellation.
  let settle;
  const fresh = setup(() => new Promise(resolve => { settle = resolve; }));
  const abort = new AbortController(); const abandoned = fresh.L.search({ title: 'Late' }, { signal: abort.signal });
  abort.abort(); await assert.rejects(abandoned, { name: 'AbortError' }); settle(response([track()]));
  await new Promise(resolve => setImmediate(resolve));
  fresh.context.fetch = async () => response([track(2)]);
  const result = await fresh.L.search({ title: 'Late' }); assert.equal(result[0].id, '2');
});

test('12-second deadline aborts an unresponsive request and always removes the timer', async () => {
  const h = setup(() => new Promise(() => {}));
  const pending = h.L.search({ title: 'Slow' });
  assert.equal(h.timers.size, 1); const timer = h.timers.values().next().value;
  assert.equal(timer.ms, 12000); timer.callback();
  await assert.rejects(pending, { code: 'lyrics_unavailable' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.timers.size, 0);
});

test('canceling one concurrent search never aborts another caller for the same query', async () => {
  const resolvers = [];
  const h = setup(() => new Promise(resolve => { resolvers.push(resolve); }));
  const one = new AbortController(), two = new AbortController();
  const first = h.L.search({ title: 'Shared query' }, { signal: one.signal });
  const second = h.L.search({ title: 'Shared query' }, { signal: two.signal });
  one.abort(); await assert.rejects(first, { name: 'AbortError' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.calls[1][1].signal.aborted, false);
  resolvers[1](response([track(12)]));
  assert.equal((await second)[0].id, '12'); assert.equal(h.timers.size, 0);
  resolvers[0](response([track(13)]));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.L.search({ title: 'Shared query' }))[0].id, '12');
});

test('infer removes YouTube decorations and carefully splits artist/title without breaking hyphenated song names', () => {
  const { L } = setup(async () => response([]));
  for (const [song, expected] of [
    [{ title: 'Example Artist - Our Song (Official Music Video) [4K]' }, { title: 'Our Song', artist: 'Example Artist', query: '' }],
    [{ title: 'Our Song [Lyrics]', artist: 'Example Artist' }, { title: 'Our Song', artist: 'Example Artist', query: '' }],
    [{ title: 'Our Song - Official Audio', artist: 'Example Artist' }, { title: 'Our Song', artist: 'Example Artist', query: '' }],
    [{ title: 'DDU-DU DDU-DU', artist: 'BLACKPINK' }, { title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', query: '' }],
    [{ title: 'Goodbye (Officially Yours)', artist: 'Example' }, { title: 'Goodbye (Officially Yours)', artist: 'Example', query: '' }],
    [{ title: 'Our Song', artist: 'Example Artist ft. Another Artist' }, { title: 'Our Song', artist: 'Example Artist', query: '' }],
    [{ title: 'Artist — A/B Song' }, { title: 'A/B Song', artist: 'Artist', query: '' }],
    [{ title: '周杰倫 Jay Chou【稻香】Official MV' }, { title: '稻香', artist: '周杰倫', query: '' }]]) {
    assert.deepEqual(plain(L.infer(song)), expected);
  }
});

test('infer searches Mandarin original titles and artist names rather than display aliases', () => {
  const { L } = setup(async () => response([]));
  assert.deepEqual(plain(L.infer({ title: '告白氣球 / Love Confession', artist: '周杰倫 Jay Chou' })), { title: '告白氣球', artist: '周杰倫', query: '' });
  assert.deepEqual(plain(L.infer({ title: '愛人錯過 / Somewhere in Time', artist: '告五人 Accusefive' })), { title: '愛人錯過', artist: '告五人', query: '' });
  assert.deepEqual(plain(L.infer({ title: '周杰倫 - 稻香 / Rice Field (Official MV)' })), { title: '稻香', artist: '周杰倫', query: '' });
  assert.deepEqual(plain(L.infer({ title: 'Song / Version', artist: 'A/B Artist' })), { title: 'Song / Version', artist: 'A/B Artist', query: '' });
  assert.deepEqual(plain(L.infer(null)), { title: '', artist: '', query: '' });
});
