const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../open-mic-genius.js'), 'utf8');
// Metadata and synthetic widget text only: no copyrighted lyrics in fixtures.
const song = (id = 1, extra = {}) => ({ id, title: 'Example Song', artist: 'Example Artist',
  url: 'https://genius.com/Example-artist-example-song-lyrics', lyricsState: 'complete', ...extra });
const payload = songs => ({ source: 'genius', songs, fetchedAt: '2026-10-08T00:00:00.000Z' });
const response = (data, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status,
  headers: { get: key => headers[key] ?? null }, json: async () => data });
const plain = value => JSON.parse(JSON.stringify(value));
function setup(fetch = async () => response(payload([]))) {
  const calls = [], timers = new Map(); let serial = 0, now = 1000;
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({ module: { exports: {} }, URL, AbortController, Date: Clock,
    fetch: async (...args) => { calls.push(args); return fetch(...args); },
    setTimeout: (callback, ms) => { const id = ++serial; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id) });
  vm.runInContext(source, context);
  return { G: context.module.exports, calls, timers, context, advance: ms => { now += ms; } };
}

test('CommonJS and browser globals expose only the metadata and official embed API', () => {
  assert.deepEqual(Object.keys(require('../open-mic-genius.js')), ['search', 'matches', 'embedDocument']);
  const browser = vm.createContext({ URL, AbortController, setTimeout, clearTimeout });
  vm.runInContext(source, browser);
  assert.equal(typeof browser.OPEN_MIC_GENIUS.search, 'function');
  assert.equal(typeof browser.OPEN_MIC_GENIUS.matches, 'function');
  assert.equal(typeof browser.OPEN_MIC_GENIUS.embedDocument, 'function');
});

test('metadata search uses only the fixed API with normalized encoded fields and no credentials', async () => {
  const h = setup(async () => response(payload([song()])));
  const result = await h.G.search({ title: ' Ｏｕｒ  Song & Friends ', artist: ' A/B Artist ', endpoint: 'https://evil.invalid/', token: 'Ignored' });
  assert.equal(h.calls.length, 1);
  const [requestURL, options] = h.calls[0], url = new URL(requestURL);
  assert.equal(url.origin + url.pathname, 'https://icebreaker-youtube-search.vercel.app/api/open-mic-lyrics');
  assert.deepEqual([...url.searchParams], [['title', 'Our Song & Friends'], ['artist', 'A/B Artist']]);
  assert.equal(options.credentials, 'omit'); assert.equal(options.mode, 'cors'); assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(plain(result), [{ ...song(), id: '1' }]); assert.equal(h.timers.size, 0);
  await h.G.search({ title: 'Unknown track', artist: 'Unknown artist' });
  assert.equal(h.calls.length, 2, 'metadata query does not perform an automatic reverse lookup');
});

test('empty, hidden-control, oversized and nonstring fields reject before requesting; one nonempty field is valid', async () => {
  const h = setup();
  for (const input of [null, [], {}, { title: '  ', artist: '' }, { title: 4 }, { title: 'x'.repeat(161) },
    { title: 'Hidden\u0000text' }, { title: 'Valid', artist: {} }, { title: '\ufb03'.repeat(54) }]) {
    await assert.rejects(h.G.search(input), { code: 'genius_invalid_query' });
  }
  assert.equal(h.calls.length, 0);
  assert.deepEqual(plain(await h.G.search({ title: 'Track only' })), []);
  assert.equal(new URL(h.calls[0][0]).searchParams.get('artist'), '');
  assert.deepEqual(plain(await h.G.search({ artist: 'Artist only' })), []);
  assert.equal(new URL(h.calls[1][0]).searchParams.get('title'), '');
  assert.equal(h.calls.length, 2);
});

test('records sanitize metadata, drop unsafe IDs and URLs, deduplicate and never expose lyric or provider fields', async () => {
  const h = setup(async () => response(payload([
    null, {}, song(0), song(-1), song(1.5), song(Number.MAX_SAFE_INTEGER + 1), song('01'), song('1<script>'),
    song({}, { url: 'https://genius.com/Safe-lyrics' }), song(2, { url: 'https://genius.com.evil.invalid/Song' }),
    song(3, { url: 'https://evil@genius.com/Song' }), song(4, { url: 'javascript:alert(1)' }),
    song(5, { url: 'http://genius.com/Song' }), song(6, { url: 'https://genius.com:8443/Song' }),
    song(7, { url: 'https://genius.com/\\evil' }), song(8, { title: '', artist: '' }),
    song(9, { title: ' Ｆｕｌｌ\n\u0000 title ', artist: 'An artist'.repeat(30), lyrics: 'Must never escape', rawProvider: { token: 'Must never escape' } }),
    song(9, { title: 'Duplicate ID' }), song('9007199254740991'), song(10, { lyricsState: 'unknown' }),
    song(11, { title: '<img src=x onerror=alert(1)>', lyricsState: 'unreleased' }),
  ])));
  const result = await h.G.search({ title: 'Filter sample' });
  assert.deepEqual(Array.from(result, r => r.id), ['9', '9007199254740991', '10', '11']);
  assert.equal(result[0].title, 'Full title'); assert.equal(result[0].artist.length, 160);
  assert.deepEqual(Object.keys(result[0]), ['id', 'title', 'artist', 'url', 'lyricsState']);
  assert.equal(result[2].lyricsState, 'unknown'); assert.equal(result[3].lyricsState, 'unknown');
  assert.equal(result[3].title, '<img src=x onerror=alert(1)>', 'metadata is plain text and never interpreted as HTML');
});

test('metadata results are bounded to twenty and bad provider bodies are unavailable', async () => {
  const h = setup(async () => response(payload(Array.from({ length: 50 }, (_, i) => song(i + 1)))));
  const result = await h.G.search({ title: 'Many matches' });
  assert.equal(result.length, 20); assert.equal(result[0].id, '1'); assert.equal(result.at(-1).id, '20');
  for (const data of [null, [], { source: 'other', songs: [song()] }, { source: 'genius', songs: {} }]) {
    await assert.rejects(setup(async () => response(data)).G.search({ title: 'Malformed' }), { code: 'genius_unavailable' });
  }
});

test('five-minute metadata cache is detached and bounded and never caches an error', async () => {
  let failing = false;
  const h = setup(async () => failing ? response({}, 502) : response(payload([song()])));
  const first = await h.G.search({ title: 'Cached song' }); first[0].title = 'Client edit';
  const second = await h.G.search({ title: 'Cached song' });
  assert.equal(h.calls.length, 1); assert.notEqual(second[0].title, 'Client edit');
  h.advance(300001); await h.G.search({ title: 'Cached song' }); assert.equal(h.calls.length, 2);
  for (let i = 0; i < 12; i++) await h.G.search({ title: 'Other ' + i });
  await h.G.search({ title: 'Cached song' }); assert.equal(h.calls.length, 15);
  failing = true; await assert.rejects(h.G.search({ title: 'Retry' }), { code: 'genius_unavailable' });
  failing = false; await h.G.search({ title: 'Retry' }); assert.equal(h.calls.length, 17);
});

test('typed server errors and bounded retry hints do not expose upstream messages', async () => {
  for (const [status, body, headers, code, retryAfter] of [
    [400, { error: 'genius_invalid_query', detail: 'Private upstream text' }, {}, 'genius_invalid_query', undefined],
    [503, { error: 'genius_setup_needed', token: 'Private token' }, {}, 'genius_setup_needed', undefined],
    [503, {}, {}, 'genius_unavailable', 5], [504, {}, {}, 'genius_unavailable', 5],
    [429, {}, { 'Retry-After': '18' }, 'genius_rate_limit', 18], [429, {}, {}, 'genius_rate_limit', 30],
    [429, {}, { 'Retry-After': '999999' }, 'genius_rate_limit', 3600],
  ]) {
    const h = setup(async () => response(body, status, headers));
    await assert.rejects(h.G.search({ title: 'Failure' }), error => error.code === code && error.message === code && error.retryAfter === retryAfter);
    assert.equal(h.calls.length, 1); assert.equal(h.timers.size, 0);
  }
  const dated = setup(async () => response({}, 429, { 'Retry-After': new Date(46000).toUTCString() }));
  await assert.rejects(dated.G.search({ title: 'Date retry' }), error => error.retryAfter === 45);
  for (const fetch of [async () => { throw new TypeError('Private network details'); },
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Private malformed body'); } })]) {
    await assert.rejects(setup(fetch).G.search({ title: 'Network failure' }), { code: 'genius_unavailable', message: 'genius_unavailable' });
  }
});

test('one twelve-second deadline includes JSON parsing and rejects an unresponsive provider', async () => {
  let jsonResolve;
  const h = setup(async () => ({ ok: true, status: 200, json: () => new Promise(resolve => { jsonResolve = resolve; }) }));
  const pending = h.G.search({ title: 'Slow response' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.timers.size, 1); assert.equal(h.timers.values().next().value.ms, 12000);
  h.timers.values().next().value.callback();
  await assert.rejects(pending, { code: 'genius_unavailable' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.timers.size, 0);
  jsonResolve(payload([song(99)])); await new Promise(resolve => setImmediate(resolve));
  h.context.fetch = async () => response(payload([song(100)]));
  assert.equal((await h.G.search({ title: 'Slow response' }))[0].id, '100', 'late timed-out metadata does not populate the cache');
});

test('cancellation skips cached and pre-aborted requests and never aborts another caller', async () => {
  const pending = [], h = setup(() => new Promise(resolve => pending.push(resolve)));
  const pre = new AbortController(); pre.abort();
  await assert.rejects(h.G.search({ title: 'Cancel' }, { signal: pre.signal }), { name: 'AbortError' });
  assert.equal(h.calls.length, 0);
  const one = new AbortController(), two = new AbortController();
  const first = h.G.search({ title: 'Cancel' }, { signal: one.signal });
  const second = h.G.search({ title: 'Cancel' }, { signal: two.signal });
  one.abort(); await assert.rejects(first, { name: 'AbortError' });
  assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(h.calls[1][1].signal.aborted, false);
  pending[1](response(payload([song(12)]))); assert.equal((await second)[0].id, '12');
  pending[0](response(payload([song(13)]))); await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.G.search({ title: 'Cancel' }))[0].id, '12');
  await assert.rejects(h.G.search({ title: 'Cancel' }, { signal: pre.signal }), { name: 'AbortError' });
  assert.equal(h.timers.size, 0);
});

test('only one complete exact title and artist pair can be automatic, including reversed metadata order', () => {
  const { G } = setup();
  for (const fields of [{ title: 'Ｅｘａｍｐｌｅ Song!', artist: 'Example Artist' }, { title: 'Example Artist', artist: 'Example Song' }]) {
    const result = G.matches([song(), song(), song(2, { title: 'Other title' })], fields);
    assert.equal(result.exact.length, 1); assert.equal(result.auto.id, '1'); assert.equal(result.candidates.length, 2);
  }
  const result = G.matches([song(), song(2)], { title: 'Example Song', artist: 'Example Artist' });
  assert.equal(result.exact.length, 2); assert.equal(result.auto, null, 'two distinct IDs stay a manual choice');
  assert.equal(G.matches([song(1, { lyricsState: 'unknown' })], { title: 'Example Song', artist: 'Example Artist' }).auto, null);
});

test('matching never guesses romanizations, translations, missing artists, or alternate versions', () => {
  const { G } = setup();
  for (const fields of [{ title: 'Example Song' }, { artist: 'Example Artist' }, { title: 'Example Song', artist: '別名歌手' },
    { title: '歌曲翻譯', artist: 'Example Artist' }, { title: 'Example Song (Live)', artist: 'Example Artist' }]) {
    const result = G.matches([song()], fields);
    assert.equal(result.exact.length, 0); assert.equal(result.auto, null); assert.equal(result.candidates.length, 1);
  }
  const han = song(8, { title: '原創歌曲', artist: '原創歌手' });
  assert.equal(G.matches([han], { title: '原創歌曲', artist: 'Written Romanization' }).auto, null);
  const result = G.matches([han], { title: '原創歌曲', artist: '原創歌手' });
  assert.equal(result.auto.id, '8'); result.auto.title = 'Local draft';
  assert.equal(result.exact[0].title, '原創歌曲'); assert.equal(result.candidates[0].title, '原創歌曲');
});

test('matching can use an artist alias explicitly displayed in parentheses while translated titles stay manual', () => {
  const { G } = setup(), displayed = song(7, { title: 'WAIT', artist: 'E.SO (瘦子)' });
  for (const artist of ['E.SO', '瘦子', 'E.SO (瘦子)']) {
    assert.equal(G.matches([displayed], { title: 'WAIT', artist }).auto.id, '7');
  }
  assert.equal(G.matches([displayed], { title: 'E.SO', artist: 'WAIT' }).auto.id, '7');
  assert.equal(G.matches([song(7, { title: 'WAIT', artist: 'E.SO' })], { title: 'WAIT', artist: 'E.SO (瘦子)' }).auto.id, '7');
  for (const candidate of [song(8, { title: 'WAIT (English Translation)', artist: 'E.SO (瘦子)' }),
    song(9, { title: 'WAIT (Romanized)', artist: 'E.SO (瘦子)' }), song(10, { title: 'WAIT', artist: 'E.SO (Official)' }),
    song(11, { title: 'WAIT', artist: 'E.SO (feat. Another Artist)' }), song(13, { title: 'WAIT', artist: 'E.SO (2026)' })]) {
    assert.equal(G.matches([candidate], { title: 'WAIT', artist: 'E.SO' }).auto, null);
  }
  assert.equal(G.matches([displayed, song(12, { title: 'WAIT', artist: '瘦子' })], { title: 'WAIT', artist: 'E.SO (瘦子)' }).auto, null,
    'explicit aliases still require a unique matching song ID');
});

function widgetHarness(G, id = 378195) {
  const html = G.embedDocument(id), scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
  const messages = [], listeners = new Map(), timers = new Map(); let content = null, observe, disconnects = 0;
  const window = { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) };
  const document = { documentElement: {}, querySelector: selector => { assert.equal(selector, '.rg_embed_body'); return content; } };
  const context = vm.createContext({ window, document, parent: { postMessage: (...args) => messages.push(args) },
    MutationObserver: class { constructor(callback) { observe = callback; } observe() {} disconnect() { disconnects++; } },
    setTimeout: (callback, ms) => { timers.set(1, { callback, ms }); return 1; }, clearTimeout: id => timers.delete(id) });
  vm.runInContext(scripts[0][1], context);
  return { html, messages, listeners, timers, observe: () => observe(), content: value => { content = value; }, disconnects: () => disconnects };
}

test('embed document accepts only a safe numeric ID and uses the official parser-inserted script without hub data', () => {
  const { G } = setup();
  for (const id of [undefined, null, {}, 0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, '01', '1\" onload=alert(1)', 'https://evil.invalid/1']) {
    assert.throws(() => G.embedDocument(id), { code: 'genius_invalid_song' });
  }
  const html = G.embedDocument('378195');
  assert.match(html, /id="rg_embed_link_378195" class="rg_embed_link" data-song-id="378195"/);
  assert.match(html, /<script src="https:\/\/genius\.com\/songs\/378195\/embed"><\/script>/);
  assert.equal(/\basync\b|\bdefer\b|createElement|document\.write|parent\.document|firebase|roomId/.test(html), false);
  assert.equal([...html.matchAll(/src="([^"]+)"/g)].length, 1, 'only the fixed official script URL is generated');
});

test('embed readiness reports only status and ID after official content exists, with no lyric text extraction', () => {
  const { G } = setup(), widget = widgetHarness(G);
  assert.equal(widget.messages.length, 0);
  widget.content({ textContent: '   ' }); widget.observe(); assert.equal(widget.messages.length, 0);
  widget.content({ textContent: 'An invented widget line' }); widget.observe();
  assert.deepEqual(plain(widget.messages), [[{ source: 'openmic-genius', type: 'ready', songId: '378195' }, '*']]);
  assert.equal(widget.timers.size, 0); assert.equal(widget.disconnects(), 1);
  widget.observe(); assert.equal(widget.messages.length, 1, 'ready is sent once per embed document');
  assert.equal(widget.listeners.has('error'), false);
});

test('embed script failure and blank-content deadline reliably report fail; successful late content cannot overwrite fail', () => {
  const { G } = setup();
  const failed = widgetHarness(G);
  failed.listeners.get('error')({ target: { tagName: 'IMG' } }); assert.equal(failed.messages.length, 0);
  failed.listeners.get('error')({ target: { tagName: 'SCRIPT' } });
  assert.deepEqual(plain(failed.messages), [[{ source: 'openmic-genius', type: 'fail', songId: '378195' }, '*']]);
  failed.content({ textContent: 'A late invented line' }); failed.observe(); assert.equal(failed.messages.length, 1);
  const slow = widgetHarness(G); assert.equal(slow.timers.get(1).ms, 12000); slow.timers.get(1).callback();
  assert.equal(slow.messages[0][0].type, 'fail'); assert.equal(slow.timers.size, 0);
  const readyAtDeadline = widgetHarness(G); readyAtDeadline.content({ textContent: 'An invented line' }); readyAtDeadline.timers.get(1).callback();
  assert.equal(readyAtDeadline.messages[0][0].type, 'ready');
});
