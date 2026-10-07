const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createHandler } = require('../api/open-mic-genius.js');
const TOKEN = 'synthetic-token-not-a-real-credential';
const tick = () => new Promise(resolve => setImmediate(resolve));
const hit = (id = 1, extra = {}) => ({ type: 'song', result: { id, title: 'A little original song',
  primary_artist: { name: 'Our friends' }, url: 'https://genius.com/Our-friends-original-song-lyrics', lyrics_state: 'complete', ...extra } });
const body = hits => ({ meta: { status: 200 }, response: { hits } });
const upstream = (data, status = 200, headers = {}) => ({ status, ok: status >= 200 && status < 300,
  headers: { get: key => headers[key] ?? null }, json: async () => data });
function response() {
  return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; },
    end(text) { this.body = text ? JSON.parse(text) : null; return this; } };
}
function setup(fetcher = async () => upstream(body([hit()])), options = {}) {
  const calls = [], timers = new Map(); let timerId = 0, clock = Date.parse('2026-10-08T03:00:00Z');
  const handler = createHandler({ env: { GENIUS_ACCESS_TOKEN: TOKEN }, now: () => clock,
    fetch: async (...args) => { calls.push(args); return fetcher(...args); },
    setTimeout: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id), ...options });
  return { handler, calls, timers, now: () => clock, advance: ms => { clock += ms; },
    async get(query = { title: 'A little original song', artist: 'Our friends' }, extra = {}) {
      const result = response(); await handler({ method: 'GET', query, ...extra }, result); return result;
    } };
}

test('exports a Vercel metadata handler and an isolated factory', () => {
  assert.equal(typeof require('../api/open-mic-genius.js'), 'function');
  assert.equal(require('../api/open-mic-genius.js').createHandler, createHandler);
});

test('bounded scalar queries reject duplicates, hidden controls, empty fields and malformed Unicode before reading secrets', async () => {
  let reads = 0; const env = { get GENIUS_ACCESS_TOKEN() { reads++; return TOKEN; } };
  const h = setup(undefined, { env });
  for (const query of [{}, { title: ' ', artist: ' ' }, { title: null }, { title: 12 }, { title: ['one', 'two'] },
    { title: 'x'.repeat(161) }, { artist: 'x'.repeat(161) }, { title: 'hidden\u0000title' }, { title: 'line\nline' },
    { artist: '\u202eArtist' }, { title: 'lone\ud800' }, { title: '\ufb03'.repeat(60) }]) {
    const result = await h.get(query); assert.equal(result.statusCode, 400); assert.deepEqual(result.body, { error: 'genius_invalid_query' });
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  const method = await h.get({ title: 'Valid' }, { method: 'POST' });
  assert.equal(method.statusCode, 405); assert.equal(method.headers.Allow, 'GET'); assert.equal(reads, 0); assert.equal(h.calls.length, 0);
});

test('server-only token stays in the Bearer header and arbitrary URLs remain query text', async () => {
  const h = setup(); const title = 'https://evil.example/anything?token=override';
  const result = await h.get({ title, artist: ' Ａｒｔｉｓｔ  🎤 ', url: 'https://evil.example', token: 'override' },
    { headers: { cookie: 'synthetic-private-cookie', authorization: 'caller-token' } });
  assert.equal(result.statusCode, 200); const url = new URL(h.calls[0][0]), init = h.calls[0][1];
  assert.equal(url.origin + url.pathname, 'https://api.genius.com/search'); assert.deepEqual([...url.searchParams.keys()], ['q']);
  assert.equal(url.searchParams.get('q'), 'Artist 🎤 ' + title); assert.equal(url.toString().includes(TOKEN), false);
  assert.deepEqual(init.headers, { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN });
  assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(Object.keys(result.body), ['source', 'songs', 'fetchedAt']); assert.equal(result.body.source, 'genius');
  assert.equal(result.body.fetchedAt, '2026-10-08T03:00:00.000Z'); assert.equal(result.headers['Cache-Control'], 'public, max-age=0, s-maxage=300');
  assert.equal(JSON.stringify(result).includes(TOKEN), false); assert.equal(JSON.stringify(result).includes('synthetic-private-cookie'), false);
  assert.equal(h.timers.size, 0);
});

test('title-only and artist-only URLs work while repeated fields and oversized URLs are rejected', async () => {
  const h = setup();
  for (const url of ['/api/open-mic-genius?title=%E5%8E%9F%E5%89%B5%E6%AD%8C', '/api/open-mic-genius?artist=Our%20friends']) {
    const res = response(); await h.handler({ method: 'GET', url }, res); assert.equal(res.statusCode, 200);
  }
  assert.equal(new URL(h.calls[0][0]).searchParams.get('q'), '原創歌'); assert.equal(new URL(h.calls[1][0]).searchParams.get('q'), 'Our friends');
  for (const url of ['/api/open-mic-genius?title=one&title=two', '/api/open-mic-genius?artist=one&artist=two',
    '/api/open-mic-genius?title=' + 'x'.repeat(4200)]) {
    const res = response(); await h.handler({ method: 'GET', url }, res); assert.equal(res.statusCode, 400);
  }
  assert.equal(h.calls.length, 2);
});

test('full 160-character title and artist accept their bounded percent-encoded Unicode URL', async () => {
  const h = setup(), title = '歌'.repeat(160), artist = '人'.repeat(160), res = response();
  const url = '/api/open-mic-genius?title=' + encodeURIComponent(title) + '&artist=' + encodeURIComponent(artist);
  assert.ok(url.length > 2048 && url.length < 4096);
  await h.handler({ method: 'GET', url }, res); assert.equal(res.statusCode, 200);
  assert.equal(new URL(h.calls[0][0]).searchParams.get('q'), artist + ' ' + title);
});

test('missing, mistyped or header-unsafe tokens produce uncached setup errors without calling the provider', async () => {
  for (const token of [undefined, null, 12, '', ' ', 'bad\r\ntoken', 'bad token', 'x'.repeat(4097)]) {
    const h = setup(undefined, { env: { GENIUS_ACCESS_TOKEN: token, OTHER_SECRET: 'synthetic-other-secret' } });
    const result = await h.get(); assert.equal(result.statusCode, 503); assert.deepEqual(result.body, { error: 'genius_setup_needed' });
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(h.calls.length, 0);
    assert.equal(JSON.stringify(result).includes('synthetic-other-secret'), false);
  }
});

test('metadata schema filters non-song, unsafe IDs and foreign URLs while preserving complete and explicitly unknown records', async () => {
  const h = setup(async () => upstream(body([
    hit(1, { title: '<b>Original</b> 🎤\u0000 song', primary_artists: [{ name: 'Friend A' }, { name: 'Friend B' }],
      url: 'https://www.genius.com/Original-song-lyrics?tracking=remove#fragment', lyrics: 'Never-return-this-original-lyric', secret: TOKEN }),
    hit(2, { title: 'T'.repeat(190), primary_artist: { name: 'A'.repeat(190) } }),
    hit(3, { lyrics_state: undefined }), hit(4, { lyrics_state: 'incomplete' }), hit(5, { lyrics_state: 'unreleased' }),
    { type: 'artist', result: hit(6).result }, hit('7'), hit(0), hit(-1), hit(Number.MAX_SAFE_INTEGER + 1), hit(1),
    hit(8, { url: 'https://evil.example/lyrics' }), hit(9, { url: 'https://genius.com.evil.example/lyrics' }),
    hit(10, { url: 'https://genius.com@evil.example/lyrics' }), hit(11, { url: 'http://genius.com/lyrics' }),
    hit(12, { url: 'https://user:password@genius.com/lyrics' }), hit(13, { url: 'https://genius.com:444/lyrics' }),
    hit(14, { url: 'https://genius.com/' }), hit(15, { url: 'https://genius.com/Bad%0a-song-lyrics' }),
    hit(16, { title: '' }), hit(17, { primary_artist: {} }), null,
  ])));
  const result = await h.get(); assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.songs.map(song => song.id), [1, 2, 3]);
  assert.deepEqual(result.body.songs[0], { id: 1, title: 'Original 🎤 song', artist: 'Friend A & Friend B',
    url: 'https://genius.com/Original-song-lyrics', lyricsState: 'complete' });
  assert.equal(result.body.songs[1].title.length, 160); assert.equal(result.body.songs[1].artist.length, 160);
  assert.equal(result.body.songs[2].lyricsState, 'unknown');
  assert.equal(JSON.stringify(result).includes('Never-return-this-original-lyric'), false); assert.equal(JSON.stringify(result).includes(TOKEN), false);
  assert.equal(JSON.stringify(result).includes('evil.example'), false);
});

test('empty search is typed metadata and valid results are capped at twenty unique songs', async () => {
  const empty = setup(async () => upstream(body([]))); const res = await empty.get();
  assert.deepEqual(res.body, { source: 'genius', songs: [], fetchedAt: '2026-10-08T03:00:00.000Z' });
  const h = setup(async () => upstream(body(Array.from({ length: 32 }, (_, index) => hit(index + 1)))));
  const result = await h.get(); assert.equal(result.body.songs.length, 20);
  assert.deepEqual(result.body.songs.map(song => song.id), Array.from({ length: 20 }, (_, index) => index + 1));
});

test('same normalized in-flight query shares one request and cached metadata is detached per browser', async () => {
  let resolve; const h = setup(() => new Promise(done => { resolve = done; }));
  const first = h.get({ title: ' Original song ', artist: 'Our   friends' });
  const second = h.get({ title: 'Original song', artist: 'Our friends' }); assert.equal(h.calls.length, 1);
  resolve(upstream(body([hit()]))); const [one, two] = await Promise.all([first, second]);
  one.body.songs[0].title = 'A local edit'; assert.equal(two.body.songs[0].title, 'A little original song');
  const cache = await h.get({ title: 'Original song', artist: 'Our friends' }); assert.equal(h.calls.length, 1);
  assert.equal(cache.body.songs[0].title, 'A little original song');
});

test('five-minute cache expires without renewing CDN lifetime and uses bounded LRU capacity', async () => {
  const h = setup(undefined, { maxCacheEntries: 2 });
  const original = await h.get({ title: 'one' }); await h.get({ title: 'two' }); h.advance(120000);
  const cached = await h.get({ title: 'one' }); assert.equal(cached.headers['Cache-Control'], 'public, max-age=0, s-maxage=180');
  assert.equal(cached.body.fetchedAt, original.body.fetchedAt); assert.equal(h.calls.length, 2);
  await h.get({ title: 'three' }); await h.get({ title: 'two' }); assert.equal(h.calls.length, 4, 'LRU song two was evicted');
  const expiring = await h.get({ title: 'two' }); h.advance(299999);
  assert.equal((await h.get({ title: 'two' })).headers['Cache-Control'], 'public, max-age=0, s-maxage=1');
  h.advance(1); const refreshed = await h.get({ title: 'two' }); assert.equal(h.calls.length, 5);
  assert.notEqual(refreshed.body.fetchedAt, expiring.body.fetchedAt);
});

test('per-instance admission leaves cache and duplicate requests available, and bounds distinct concurrency', async () => {
  const h = setup(undefined, { maxRequestsPerMinute: 2 }); await h.get({ title: 'one' }); await h.get({ title: 'two' });
  const blocked = await h.get({ title: 'three' }); assert.equal(blocked.statusCode, 429); assert.equal(blocked.headers['Retry-After'], '60');
  assert.equal((await h.get({ title: 'one' })).statusCode, 200); assert.equal(h.calls.length, 2);
  h.advance(60000); assert.equal((await h.get({ title: 'three' })).statusCode, 200);
  const resolvers = [], concurrent = setup(() => new Promise(resolve => resolvers.push(resolve)), { maxConcurrentRequests: 1 });
  const one = concurrent.get({ title: 'one' }), duplicate = concurrent.get({ title: 'one' });
  const refused = await concurrent.get({ title: 'two' }); assert.equal(refused.statusCode, 429); assert.equal(refused.headers['Retry-After'], '1');
  assert.equal(concurrent.calls.length, 1); resolvers[0](upstream(body([]))); await Promise.all([one, duplicate]);
  const admitted = concurrent.get({ title: 'two' }); assert.equal(concurrent.calls.length, 2);
  resolvers[1](upstream(body([]))); assert.equal((await admitted).statusCode, 200);
});

test('provider 401 and wrapped authentication failures remain generic uncached setup hints', async () => {
  for (const fetcher of [async () => ({ status: 401, json: async () => { throw new Error(TOKEN); } }),
    async () => upstream({ meta: { status: 401, message: TOKEN } })]) {
    const h = setup(fetcher); const result = await h.get();
    assert.equal(result.statusCode, 503); assert.deepEqual(result.body, { error: 'genius_setup_needed' });
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(JSON.stringify(result).includes(TOKEN), false);
    await h.get(); assert.equal(h.calls.length, 2);
  }
});

test('429 Retry-After is bounded, supports HTTP dates, cools new misses, and never leaks provider bodies', async () => {
  const now = Date.parse('2026-10-08T03:00:00Z');
  for (const [header, expected] of [['15', 15], ['999999', 3600], ['not-a-date', 60], ['0', 1], [new Date(now + 23000).toUTCString(), 23]]) {
    const h = setup(async () => upstream({ error: TOKEN }, 429, { 'Retry-After': header }));
    const result = await h.get(); assert.equal(result.statusCode, 429); assert.deepEqual(result.body, { error: 'genius_rate_limit' });
    assert.equal(result.headers['Retry-After'], String(expected)); assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(JSON.stringify(result).includes(TOKEN), false);
    await h.get({ title: 'another' }); assert.equal(h.calls.length, 1); h.advance(expected * 1000);
    await h.get({ title: 'another' }); assert.equal(h.calls.length, 2);
  }
});

test('other provider, parsing, schema, redirect and network failures stay uncached generic gateway errors', async () => {
  for (const fetcher of [async () => upstream({ error: TOKEN }, 403), async () => upstream({ error: TOKEN }, 500),
    async () => upstream({ response: { hits: 'wrong type' } }), async () => upstream({ meta: { status: 500 }, response: { hits: [] } }),
    async () => ({ status: 200, ok: true, json: async () => { throw new Error(TOKEN); } }),
    async () => { throw new Error('Authorization Bearer ' + TOKEN); }]) {
    const h = setup(fetcher); const result = await h.get();
    assert.equal(result.statusCode, 502); assert.deepEqual(result.body, { error: 'genius_unavailable' });
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(JSON.stringify(result).includes(TOKEN), false);
    await h.get(); assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 0);
  }
});

test('eight-second deadline aborts upstream work, frees admission and never caches a late success', async () => {
  const resolvers = [], h = setup(() => new Promise(resolve => resolvers.push(resolve)), { maxConcurrentRequests: 1 });
  const first = h.get(); const timer = h.timers.values().next().value;
  assert.equal(timer.ms, 8000); timer.callback(); const failed = await first;
  assert.equal(failed.statusCode, 504); assert.deepEqual(failed.body, { error: 'genius_unavailable' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.timers.size, 0);
  resolvers[0](upstream(body([hit(1)]))); await tick();
  const next = h.get(); assert.equal(h.calls.length, 2); resolvers[1](upstream(body([hit(2)])));
  assert.equal((await next).body.songs[0].id, 2);
});

test('one cancelled viewer does not abort a shared lookup or write a reply to that viewer', async () => {
  let resolve; const h = setup(() => new Promise(done => { resolve = done; })); const controller = new AbortController();
  const one = h.get(undefined, { signal: controller.signal }), two = h.get(); assert.equal(h.calls.length, 1);
  controller.abort(); const cancelled = await one; assert.equal(cancelled.body, undefined);
  assert.equal(h.calls[0][1].signal.aborted, false); resolve(upstream(body([hit()])));
  assert.equal((await two).statusCode, 200); assert.equal((await h.get()).statusCode, 200); assert.equal(h.calls.length, 1);
});

test('the last cancelled viewer aborts the provider and cannot populate cache after its request ends', async () => {
  const resolvers = [], h = setup(() => new Promise(resolve => resolvers.push(resolve))); const req = new EventEmitter();
  Object.assign(req, { method: 'GET', query: { title: 'original' }, aborted: false }); const res = response();
  const work = h.handler(req, res); assert.equal(h.calls.length, 1);
  req.aborted = true; req.emit('aborted'); await work; await tick();
  assert.equal(res.body, undefined); assert.equal(req.listenerCount('aborted'), 0); assert.equal(h.calls[0][1].signal.aborted, true);
  assert.equal(h.timers.size, 0); resolvers[0](upstream(body([hit(1)]))); await tick();
  const next = h.get({ title: 'original' }); assert.equal(h.calls.length, 2); resolvers[1](upstream(body([hit(2)])));
  assert.equal((await next).body.songs[0].id, 2);
});

test('already cancelled requests never access credentials or upstream work', async () => {
  let reads = 0; const h = setup(undefined, { env: { get GENIUS_ACCESS_TOKEN() { reads++; return TOKEN; } } });
  const controller = new AbortController(); controller.abort();
  assert.equal((await h.get(undefined, { signal: controller.signal })).body, undefined);
  assert.equal((await h.get(undefined, { aborted: true })).body, undefined); assert.equal(reads, 0); assert.equal(h.calls.length, 0);
});

test('native response disconnection cancels the final lookup even when the GET request has already been read', async () => {
  const h = setup(() => new Promise(() => {})), res = Object.assign(new EventEmitter(), response(), { writableEnded: false, destroyed: false });
  const req = new EventEmitter(); Object.assign(req, { method: 'GET', query: { title: 'original' }, aborted: false });
  const pending = h.handler(req, res); assert.equal(h.calls.length, 1);
  res.destroyed = true; res.emit('close'); await pending; await tick();
  assert.equal(req.aborted, false); assert.equal(res.body, undefined); assert.equal(h.calls[0][1].signal.aborted, true);
  assert.equal(res.listenerCount('close'), 0); assert.equal(req.listenerCount('aborted'), 0); assert.equal(h.timers.size, 0);
});

test('native Node responses use the same valid JSON, metadata-only schema and security headers', async () => {
  const h = setup(), res = response(); delete res.status; delete res.json;
  await h.handler({ method: 'GET', url: '/api/open-mic-genius?title=original' }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.songs[0].id, 1);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8'); assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
});
