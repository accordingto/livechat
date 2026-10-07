const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/open-mic-discovery.js');
const FAKE_KEY = 'mock-provider-key-never-a-real-credential';
const idFor = n => String(n).padStart(11, '0');
const item = (n = 1, extra = {}) => ({ id: idFor(n), snippet: { title: 'Example song', channelTitle: 'Example channel',
  publishedAt: '2026-09-01T12:00:00Z', liveBroadcastContent: 'none' }, status: { embeddable: true, privacyStatus: 'public' }, ...extra });
const searchItem = (n = 1, extra = {}) => ({ ...item(n), id: { kind: 'youtube#video', videoId: idFor(n) }, ...extra });
const upstream = (body, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status,
  headers: { get: key => headers[key] ?? null }, json: async () => body });
function response() {
  return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    end(text) { this.body = JSON.parse(text); return this; } };
}
function setup(fetch = async () => upstream({ items: [item()] }), extra = {}) {
  const calls = [], timers = new Map(); let timerId = 0, clock = Date.parse('2026-10-08T03:00:00Z');
  const handler = createHandler({ env: { YOUTUBE_API_KEY: FAKE_KEY }, now: () => clock,
    fetch: async (...args) => { calls.push(args); return fetch(...args); },
    setTimeout: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id), ...extra });
  return { handler, calls, timers, advance: ms => { clock += ms; }, now: () => clock,
    async get(query = {}, more = {}) { const result = response(); await handler({ method: 'GET', query, ...more }, result); return result; } };
}

test('default CommonJS export is a Vercel handler with a testable factory', () => {
  const exported = require('../api/open-mic-discovery.js');
  assert.equal(typeof exported, 'function'); assert.equal(exported.createHandler, createHandler);
});

test('invalid input is rejected before credentials or upstream access', async () => {
  const h = setup(async () => { throw new Error('must not fetch'); }, { env: {} });
  for (const [query, error] of [[{ mode: 'other' }, 'discovery_invalid_query'], [{ mode: ['popular', 'search'] }, 'discovery_invalid_query'],
    [{ mode: 'search' }, 'discovery_invalid_query'], [{ mode: 'search', q: '   ' }, 'discovery_invalid_query'],
    [{ mode: 'search', q: 'x'.repeat(101) }, 'discovery_invalid_query'], [{ mode: 'search', q: ['one', 'two'] }, 'discovery_invalid_query'],
    [{ mode: 'search', q: 'line\nline' }, 'discovery_invalid_query'], [{ mode: 'popular', region: 'ZZ' }, 'discovery_invalid_region'],
    [{ mode: 'popular', region: ['TW', 'US'] }, 'discovery_invalid_region']]) {
    const result = await h.get(query); assert.equal(result.statusCode, 400); assert.deepEqual(result.body, { error });
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  assert.equal(h.calls.length, 0);
  const method = await h.get({}, { method: 'POST' }); assert.equal(method.statusCode, 405); assert.equal(method.headers.Allow, 'GET');
});

test('missing or blank server key gives an explicit uncached setup response without exposing any environment', async () => {
  for (const env of [{}, { YOUTUBE_API_KEY: '  ' }, { YOUTUBE_API_KEY: null, OTHER_SECRET: 'synthetic-other-secret' }]) {
    const h = setup(undefined, { env }); const result = await h.get({ mode: 'popular' });
    assert.equal(result.statusCode, 503); assert.deepEqual(result.body, { error: 'discovery_setup_needed' });
    assert.equal(h.calls.length, 0); assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(JSON.stringify(result).includes('synthetic-other-secret'), false);
  }
});

test('search calls only the fixed official endpoint with safe embeddable music filters', async () => {
  const h = setup(async () => upstream({ items: [searchItem()] }));
  const result = await h.get({ mode: 'search', q: ' Artist & Song ', region: 'US' });
  assert.equal(result.statusCode, 200); const url = new URL(h.calls[0][0]);
  assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/youtube/v3/search');
  for (const [key, value] of Object.entries({ part: 'snippet', q: 'Artist & Song', regionCode: 'US', maxResults: '12',
    type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true', videoCategoryId: '10', safeSearch: 'moderate', key: FAKE_KEY })) assert.equal(url.searchParams.get(key), value, key);
  assert.equal(h.calls[0][1].redirect, 'error'); assert.ok(h.calls[0][1].signal instanceof AbortSignal);
  assert.equal(result.body.region, 'US'); assert.equal(result.body.source, 'youtube');
  assert.equal(result.body.fetchedAt, '2026-10-08T03:00:00.000Z'); assert.equal(result.body.songs.length, 1);
  assert.ok(result.headers['Cache-Control'].includes('s-maxage=600'));
  assert.equal(JSON.stringify(result.body).includes(FAKE_KEY), false); assert.equal(h.timers.size, 0);
});

test('popular calls official regional music chart and keeps only public embeddable, non-live, non-kids videos', async () => {
  const h = setup(async () => upstream({ items: [item(1), item(2, { status: { embeddable: false } }),
    item(3, { status: { embeddable: true, madeForKids: true } }), item(4, { status: { embeddable: true, selfDeclaredMadeForKids: true } }),
    item(5, { snippet: { title: 'Live song', liveBroadcastContent: 'live' } }),
    item(6, { snippet: { title: 'Upcoming song', liveBroadcastContent: 'upcoming' } }),
    item(7, { status: { embeddable: true, privacyStatus: 'private' } }), item(8, { status: {} }), item(9)] }));
  const result = await h.get({ mode: 'popular', region: 'KR' }); const url = new URL(h.calls[0][0]);
  assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/youtube/v3/videos');
  assert.equal(url.searchParams.get('chart'), 'mostPopular'); assert.equal(url.searchParams.get('part'), 'snippet,status');
  assert.equal(url.searchParams.get('videoCategoryId'), '10'); assert.equal(url.searchParams.get('regionCode'), 'KR');
  assert.equal(url.searchParams.has('q'), false); assert.equal(url.searchParams.has('type'), false);
  assert.deepEqual(result.body.songs.map(song => song.videoId), [idFor(1), idFor(9)]);
  assert.ok(result.headers['Cache-Control'].includes('s-maxage=900'));
});

test('song records use bounded decoded text, safe IDs and canonical thumbnail URLs only', async () => {
  const h = setup(async () => upstream({ items: [searchItem(1, { snippet: { title: 'A &amp; B &#39;Live&#39; &#x1F3A4;',
    channelTitle: 'Channel &quot;One&quot; &ndash; Music', publishedAt: '2026-09-01T12:00:00Z', thumbnails: { default: { url: 'https://evil.example/image' } } } }),
    searchItem(2, { snippet: { title: 'T'.repeat(180), channelTitle: 'C'.repeat(180), publishedAt: 'not-a-date' } }),
    searchItem(3, { snippet: { title: 'Hidden\u0000&#x1B; text', channelTitle: '<b>Literal channel name</b>' } }),
    searchItem(4, { id: { videoId: 'bad/id?key=' + FAKE_KEY } }), searchItem(5, { id: { videoId: 'short' } }),
    searchItem(6, { snippet: { title: '' } }), searchItem(1)] }));
  const result = await h.get({ mode: 'search', q: 'metadata' });
  assert.equal(result.body.songs.length, 3);
  assert.equal(result.body.songs[0].title, "A & B 'Live' 🎤"); assert.equal(result.body.songs[0].channelTitle, 'Channel "One" – Music');
  assert.equal(result.body.songs[0].publishedAt, '2026-09-01T12:00:00.000Z');
  assert.equal(result.body.songs[1].title.length, 120); assert.equal(result.body.songs[1].channelTitle.length, 120); assert.equal(result.body.songs[1].publishedAt, '');
  assert.equal(result.body.songs[2].title, 'Hidden text'); assert.equal(result.body.songs[2].channelTitle, '<b>Literal channel name</b>');
  for (const song of result.body.songs) assert.equal(song.thumbnail, 'https://i.ytimg.com/vi/' + song.videoId + '/hqdefault.jpg');
  assert.equal(result.headers['Content-Type'], 'application/json; charset=utf-8'); assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(JSON.stringify(result.body).includes('evil.example'), false);
});

test('default region, real URL parsing and repeated-query guards behave consistently', async () => {
  const h = setup(async () => upstream({ items: [searchItem()] }));
  const result = response(); await h.handler({ method: 'GET', url: '/api/open-mic-discovery?mode=search&q=%E7%A8%BB%E9%A6%99' }, result);
  assert.equal(result.statusCode, 200); assert.equal(result.body.region, 'TW');
  assert.equal(new URL(h.calls[0][0]).searchParams.get('q'), '稻香');
  for (const url of ['/api/open-mic-discovery?mode=search&q=one&q=two', '/api/open-mic-discovery?region=TW&region=US', '/api/open-mic-discovery?' + 'a'.repeat(2100)]) {
    const rejected = response(); await h.handler({ method: 'GET', url }, rejected); assert.equal(rejected.statusCode, 400);
  }
  assert.equal(h.calls.length, 1);
});

test('arbitrary URLs inside a search remain encoded search text and never become an upstream destination', async () => {
  const h = setup(async () => upstream({ items: [] }));
  const q = 'https://evil.example/secret?key=override';
  const result = await h.get({ mode: 'search', q, url: 'https://evil.example', key: 'override' });
  assert.equal(result.statusCode, 200); const url = new URL(h.calls[0][0]);
  assert.equal(url.hostname, 'www.googleapis.com'); assert.equal(url.searchParams.get('q'), q); assert.equal(url.searchParams.get('key'), FAKE_KEY);
});

test('at most twelve unique valid songs are returned in provider order', async () => {
  const h = setup(async () => upstream({ items: Array.from({ length: 30 }, (_, i) => item(i + 1)) }));
  const result = await h.get(); assert.equal(result.body.songs.length, 12);
  assert.equal(result.body.songs[0].videoId, idFor(1)); assert.equal(result.body.songs.at(-1).videoId, idFor(12));
});

test('in-flight requests deduplicate and cache records are detached across viewers', async () => {
  let settle; const h = setup(() => new Promise(resolve => { settle = resolve; }));
  const one = h.get({ mode: 'popular' }), two = h.get({ mode: 'popular' });
  assert.equal(h.calls.length, 1); settle(upstream({ items: [item()] }));
  const [first, second] = await Promise.all([one, two]);
  first.body.songs[0].title = 'Viewer-local edit'; assert.equal(second.body.songs[0].title, 'Example song');
  const cached = await h.get({ mode: 'popular' }); assert.equal(h.calls.length, 1); assert.equal(cached.body.songs[0].title, 'Example song');
});

test('search expires after ten minutes, popular after fifteen, and cache capacity is bounded', async () => {
  const h = setup(async url => upstream({ items: new URL(url).pathname.endsWith('search') ? [searchItem()] : [item()] }), { maxCacheEntries: 2 });
  await h.get({ mode: 'search', q: 'one' }); h.advance(599999); await h.get({ mode: 'search', q: 'one' }); assert.equal(h.calls.length, 1);
  h.advance(2); await h.get({ mode: 'search', q: 'one' }); assert.equal(h.calls.length, 2);
  await h.get({ mode: 'popular' }); h.advance(899999); await h.get({ mode: 'popular' }); assert.equal(h.calls.length, 3);
  h.advance(2); await h.get({ mode: 'popular' }); assert.equal(h.calls.length, 4);
  await h.get({ mode: 'search', q: 'two' }); await h.get({ mode: 'search', q: 'three' }); await h.get({ mode: 'popular' });
  assert.equal(h.calls.length, 7);
});

test('best-effort instance admission limits upstream misses but leave cached songs available', async () => {
  const h = setup(async () => upstream({ items: [searchItem()] }), { maxRequestsPerMinute: 2 });
  await h.get({ mode: 'search', q: 'one' }); await h.get({ mode: 'search', q: 'two' });
  const blocked = await h.get({ mode: 'search', q: 'three' });
  assert.equal(blocked.statusCode, 429); assert.deepEqual(blocked.body, { error: 'discovery_rate_limit' }); assert.equal(blocked.headers['Retry-After'], '60');
  assert.equal((await h.get({ mode: 'search', q: 'one' })).statusCode, 200); assert.equal(h.calls.length, 2);
  h.advance(60000); assert.equal((await h.get({ mode: 'search', q: 'three' })).statusCode, 200); assert.equal(h.calls.length, 3);
});

test('cache hits send only their remaining CDN lifetime and do not renew metadata freshness', async () => {
  const h = setup(async url => upstream({ items: new URL(url).pathname.endsWith('search') ? [searchItem()] : [item()] }));
  const popular = await h.get({ mode: 'popular' });
  const search = await h.get({ mode: 'search', q: 'cached search' });
  h.advance(240000);
  const cachedSearch = await h.get({ mode: 'search', q: 'cached search' });
  assert.ok(cachedSearch.headers['Cache-Control'].includes('s-maxage=360,')); assert.equal(cachedSearch.body.fetchedAt, search.body.fetchedAt);
  h.advance(360000);
  const cachedPopular = await h.get({ mode: 'popular' });
  assert.ok(cachedPopular.headers['Cache-Control'].includes('s-maxage=300,')); assert.equal(cachedPopular.body.fetchedAt, popular.body.fetchedAt);
  h.advance(299999);
  const lastMoment = await h.get({ mode: 'popular' }); assert.ok(lastMoment.headers['Cache-Control'].includes('s-maxage=1,'));
  assert.equal(lastMoment.body.fetchedAt, popular.body.fetchedAt); assert.equal(h.calls.length, 2);
  h.advance(1);
  const refreshed = await h.get({ mode: 'popular' }); assert.ok(refreshed.headers['Cache-Control'].includes('s-maxage=900,'));
  assert.notEqual(refreshed.body.fetchedAt, popular.body.fetchedAt); assert.equal(h.calls.length, 3);
});

test('provider quota and 429 become bounded rate-limit hints without exposing error details or the key', async () => {
  for (const [status, body, headers, expected] of [[403, { error: { message: FAKE_KEY, errors: [{ reason: 'quotaExceeded' }] } }, {}, '3600'],
    [429, { error: { message: FAKE_KEY } }, { 'Retry-After': '15' }, '15'],
    [429, {}, { 'Retry-After': '999999' }, '3600'], [429, {}, { 'Retry-After': 'not-a-date' }, '60']]) {
    const h = setup(async () => upstream(body, status, headers)); const result = await h.get();
    assert.equal(result.statusCode, 429); assert.deepEqual(result.body, { error: 'discovery_rate_limit' }); assert.equal(result.headers['Retry-After'], expected);
    assert.equal(JSON.stringify(result).includes(FAKE_KEY), false);
    await h.get({ mode: 'popular', region: 'US' }); assert.equal(h.calls.length, 1);
    h.advance(Number(expected) * 1000); await h.get({ mode: 'popular', region: 'US' }); assert.equal(h.calls.length, 2);
  }
});

test('all other provider, parsing, redirect and network failures are uncached generic 502 errors', async () => {
  for (const fetch of [async () => upstream({ error: { message: FAKE_KEY, errors: [{ reason: 'accessNotConfigured' }] } }, 403),
    async () => upstream({ error: { message: FAKE_KEY } }, 500), async () => upstream({ wrong: 'shape' }),
    async () => ({ ok: true, status: 200, json: async () => { throw new Error(FAKE_KEY); } }),
    async () => { throw new Error('secret URL key=' + FAKE_KEY); }]) {
    const h = setup(fetch); const result = await h.get();
    assert.equal(result.statusCode, 502); assert.deepEqual(result.body, { error: 'discovery_unavailable' });
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(JSON.stringify(result).includes(FAKE_KEY), false);
    await h.get(); assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 0);
  }
});

test('eight-second deadline aborts slow work and a late success never enters the cache', async () => {
  const resolvers = []; const h = setup(() => new Promise(resolve => { resolvers.push(resolve); }));
  const pending = h.get(); const timer = h.timers.values().next().value;
  assert.equal(timer.ms, 8000); timer.callback();
  const failed = await pending; assert.equal(failed.statusCode, 502); assert.deepEqual(failed.body, { error: 'discovery_unavailable' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.timers.size, 0);
  resolvers[0](upstream({ items: [item()] })); await new Promise(resolve => setImmediate(resolve));
  const retry = h.get(); assert.equal(h.calls.length, 2); resolvers[1](upstream({ items: [item(2)] }));
  assert.equal((await retry).body.songs[0].videoId, idFor(2));
});

test('native Node response fallback returns valid JSON and the same security/cache headers', async () => {
  const h = setup(); const res = response(); delete res.status; delete res.json;
  await h.handler({ method: 'GET', query: { mode: 'popular' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.songs[0].videoId, idFor(1));
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
});
