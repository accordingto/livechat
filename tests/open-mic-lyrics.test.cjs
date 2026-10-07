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
  const h = setup(async () => response([track(1, { trackName: 'Our Song & Friends', artistName: 'A/B Artist' })]));
  const result = await h.L.search({ title: ' Our Song & Friends ', artist: 'A/B Artist' });
  const [requestURL, options] = h.calls[0]; const url = new URL(requestURL);
  assert.equal(url.origin + url.pathname, 'https://lrclib.net/api/search');
  assert.equal(url.searchParams.get('track_name'), 'Our Song & Friends'); assert.equal(url.searchParams.get('artist_name'), 'A/B Artist');
  assert.equal(url.searchParams.has('q'), false); assert.equal(options.credentials, 'omit'); assert.equal(options.method, 'GET');
  assert.equal(options.mode, 'cors'); assert.ok(options.signal instanceof AbortSignal);
  assert.equal(h.calls.length, 1, 'an exact structured match needs no broad fallback');
  assert.deepEqual(plain(result[0]), { id: '1', title: 'Our Song & Friends', artist: 'A/B Artist', album: 'Example Album',
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

test('infer chooses only an explicitly written artist alias for WAIT and cleans compact official titles', () => {
  const { L } = setup(async () => response([]));
  for (const [song, expected] of [
    [{ title: '瘦子E.SO【WAIT】Official Music Video' }, { title: 'WAIT', artist: 'E.SO', query: '' }],
    [{ title: 'WAIT', artist: '瘦子 E.SO' }, { title: 'WAIT', artist: 'E.SO', query: '' }],
    [{ title: 'WAIT (Lyric Video)', artist: '瘦子E.SO' }, { title: 'WAIT', artist: 'E.SO', query: '' }],
    [{ title: '稻香/Love the Fields', artist: '周杰倫Jay Chou' }, { title: '稻香', artist: '周杰倫', query: '' }],
    [{ title: 'Our Fictional English Song', artist: 'Example Artist 原創歌手' }, { title: 'Our Fictional English Song', artist: 'Example Artist', query: '' }],
    [{ title: '原創中文歌', artist: 'Example Artist 原創歌手' }, { title: '原創中文歌', artist: '原創歌手', query: '' }],
    [{ title: '周杰倫-稻香 (Official MV)' }, { title: '稻香', artist: '周杰倫', query: '' }],
    [{ title: 'WAIT', artist: '瘦子' }, { title: 'WAIT', artist: '瘦子', query: '' }],
    [{ title: '瘦子 WAIT', channelTitle: 'An unrelated upload channel' }, { title: '瘦子 WAIT', artist: '', query: '' }],
    [{ title: '虛構中文-另一段' }, { title: '虛構中文-另一段', artist: '', query: '' }],
    [{ title: 'DDU-DU DDU-DU (Official Music Video)' }, { title: 'DDU-DU DDU-DU', artist: '', query: '' }],
    [{ title: 'Our Song (Live Remix)', artist: 'Example Artist' }, { title: 'Our Song (Live Remix)', artist: 'Example Artist', query: '' }],
  ]) assert.deepEqual(plain(L.infer(song)), expected);
});

test('the explicitly named E.SO WAIT signature stays a precise one-request lookup', async () => {
  const h = setup(async () => response([track(71, { trackName: 'WAIT', artistName: 'E.SO' }),
    track(72, { trackName: 'WAIT', artistName: 'E.SO', albumName: 'Another synthetic album' })]));
  const fields = h.L.infer({ title: '瘦子E.SO【WAIT】Official Music Video' });
  const matches = await h.L.search(fields);
  assert.equal(h.calls.length, 1); const url = new URL(h.calls[0][0]);
  assert.equal(url.searchParams.get('track_name'), 'WAIT'); assert.equal(url.searchParams.get('artist_name'), 'E.SO');
  assert.equal(matches.length, 2); assert.ok(matches.every(record => record.autoEligible !== false));
});

test('a mismatching romanized artist retries the original title broadly with manual-only candidates', async () => {
  const h = setup(async url => new URL(url).searchParams.has('q')
    ? response([track(8, { trackName: '原創歌名', artistName: '原創歌手' })]) : response([]));
  const matches = await h.L.search({ title: '原創歌名', artist: 'Explicit Romanized Artist' });
  assert.equal(h.calls.length, 2); const precise = new URL(h.calls[0][0]), broad = new URL(h.calls[1][0]);
  assert.equal(precise.searchParams.get('artist_name'), 'Explicit Romanized Artist');
  assert.equal(broad.searchParams.get('q'), '原創歌名'); assert.equal([...broad.searchParams].length, 1);
  assert.equal(matches[0].title, '原創歌名'); assert.equal(matches[0].artist, '原創歌手'); assert.equal(matches[0].autoEligible, false);
});

test('a compact mixed-language keyword can use all metadata fields without guessing an upload artist', async () => {
  const h = setup(async url => new URL(url).searchParams.has('q')
    ? response([track(17, { trackName: 'WAIT', artistName: '原創歌手' })]) : response([]));
  const input = h.L.infer({ title: '原創歌手WAIT', channelTitle: 'Upload Channel' });
  assert.equal(input.artist, '');
  const matches = await h.L.search(input);
  assert.equal(new URL(h.calls[1][0]).searchParams.get('q'), '原創歌手 WAIT');
  assert.equal(matches[0].autoEligible, false); assert.equal(matches[0].artist, '原創歌手');
});

test('broader results are deduplicated by metadata and text, preserve distinct versions, and remain capped at twenty', async () => {
  const h = setup(async url => new URL(url).searchParams.has('q') ? response([
    track(2, { trackName: 'Original Song', artistName: 'Alternate Artist' }),
    track(3, { trackName: 'Original Song', artistName: 'Alternate Artist', plainLyrics: 'A different invented version' }),
    track(4, { trackName: 'Original Song', artistName: 'Alternate Artist' }),
  ]) : response([track(1, { trackName: 'Original Song', artistName: 'Alternate Artist' })]));
  const matches = await h.L.search({ title: 'Original Song', artist: 'Declared Artist' });
  assert.deepEqual(Array.from(matches, record => record.id), ['2', '3']);
  assert.ok(matches.every(record => record.autoEligible === false));
  matches[0].lyrics = 'A client edit';
  const repeated = await h.L.search({ title: 'Original Song', artist: 'Declared Artist' });
  assert.equal(h.calls.length, 2); assert.notEqual(repeated[0].lyrics, 'A client edit');
  const capped = setup(async url => response(Array.from({ length: 30 }, (_, i) => track(i + (new URL(url).searchParams.has('q') ? 100 : 1),
    { trackName: 'Different Song ' + i, artistName: 'Different Artist ' + i }))));
  const many = await capped.L.search({ title: 'Missing Song', artist: 'Declared Artist' });
  assert.equal(capped.calls.length, 2); assert.equal(many.length, 20); assert.ok(many.every(record => record.autoEligible === false));
});

test('an empty library match stays empty after only one bounded fallback without inventing script or artist mappings', async () => {
  const h = setup(async () => response([]));
  const fields = { title: '虛構繁體歌名', artist: '明示歌手' };
  const matches = await h.L.search(fields);
  assert.equal(matches.length, 0); assert.equal(h.calls.length, 2);
  assert.equal(new URL(h.calls[1][0]).searchParams.get('q'), fields.title);
  await h.L.search(fields); assert.equal(h.calls.length, 2, 'both successful empty requests use the bounded cache');
  h.advance(300001); await h.L.search(fields); assert.equal(h.calls.length, 4);
  const direct = setup(async () => response([track()]));
  const free = await direct.L.search({ query: 'A chosen manual keyword', title: 'Example Song', artist: 'Example Artist' });
  assert.equal(direct.calls.length, 1); assert.equal(free[0].autoEligible, false);
});

test('the fallback shares the original twelve-second deadline and cancellation prevents late results or extra attempts', async () => {
  const pendingResponses = [], h = setup(() => new Promise(resolve => pendingResponses.push(resolve)));
  const work = h.L.search({ title: 'Original Song', artist: 'Declared Artist' });
  h.advance(4000); pendingResponses[0](response([])); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 1);
  assert.equal(h.timers.values().next().value.ms, 8000);
  const signal = h.calls[1][1].signal;
  h.timers.values().next().value.callback();
  await assert.rejects(work, { code: 'lyrics_unavailable' }); assert.equal(signal.aborted, true); assert.equal(h.timers.size, 0);
  const aborted = setup(() => new Promise(resolve => pendingResponses.push(resolve))), controller = new AbortController();
  const canceledWork = aborted.L.search({ title: 'Original Song', artist: 'Declared Artist' }, { signal: controller.signal });
  pendingResponses[2](response([])); await new Promise(resolve => setImmediate(resolve));
  assert.equal(aborted.calls.length, 2); controller.abort();
  await assert.rejects(canceledWork, { name: 'AbortError' });
  assert.equal(aborted.calls[1][1].signal.aborted, true); assert.equal(aborted.timers.size, 0);
  pendingResponses[3](response([track(44)])); await new Promise(resolve => setImmediate(resolve));
  aborted.context.fetch = async () => response([track(45)]);
  const fresh = await aborted.L.search({ title: 'Original Song', artist: 'Declared Artist' });
  assert.equal(fresh[0].id, '45', 'the abandoned broad response must not populate its cache');
});

test('a failed broad lookup keeps useful primary candidates manual, while primary failure and cancellation stay errors', async () => {
  for (const status of [429, 503]) {
    const h = setup(async url => new URL(url).searchParams.has('q') ? response([], status, { 'Retry-After': '15' })
      : response([track(9, { trackName: 'Original Song', artistName: 'Alternate Artist' })]));
    const matches = await h.L.search({ title: 'Original Song', artist: 'Declared Artist' });
    assert.equal(h.calls.length, 2); assert.equal(matches.length, 1); assert.equal(matches[0].autoEligible, false);
    assert.equal(matches[0].id, '9'); assert.equal(h.timers.size, 0);
  }
  const firstFailure = setup(async () => response([], 429));
  await assert.rejects(firstFailure.L.search({ title: 'Original Song', artist: 'Declared Artist' }), { code: 'lyrics_rate_limit' });
  assert.equal(firstFailure.calls.length, 1);
  let finish;
  const canceledFallback = setup(async url => new URL(url).searchParams.has('q') ? new Promise(resolve => { finish = resolve; })
    : response([track(9, { trackName: 'Original Song', artistName: 'Alternate Artist' })]));
  const cancel = new AbortController(), work = canceledFallback.L.search({ title: 'Original Song', artist: 'Declared Artist' }, { signal: cancel.signal });
  await new Promise(resolve => setImmediate(resolve)); cancel.abort();
  await assert.rejects(work, { name: 'AbortError' }); finish(response([track(10)]));
  assert.equal(canceledFallback.timers.size, 0);
});
