/* Official Genius song metadata only. The browser displays the official widget;
 * this handler never fetches, extracts, stores, or returns lyric bodies.
 * https://docs.genius.com/
 * Cache and admission limits are best-effort per instance, not distributed.
 */
'use strict';

const SEARCH_URL = 'https://api.genius.com/search';
const CACHE_SECONDS = 300;
const CANCELLED = Symbol('cancelled request');
const HIDDEN_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

function queryFor(request) {
  if (typeof request.url === 'string' && request.url.length > 4096) return { error: 'genius_invalid_query' };
  let fields = request.query;
  if (!fields || typeof fields !== 'object') {
    if (typeof request.url !== 'string') return { error: 'genius_invalid_query' };
    try {
      const params = new URL(request.url, 'https://icebreaker-hub.invalid').searchParams;
      fields = Object.create(null);
      for (const key of ['title', 'artist']) {
        const values = params.getAll(key);
        if (values.length) fields[key] = values.length === 1 ? values[0] : values;
      }
    } catch (_) { return { error: 'genius_invalid_query' }; }
  }
  const clean = {};
  for (const key of ['title', 'artist']) {
    const value = fields[key] === undefined ? '' : fields[key];
    if (typeof value !== 'string' || value.length > 160 || HIDDEN_CONTROLS.test(value)) return { error: 'genius_invalid_query' };
    const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (normalized.length > 160 || /[\ud800-\udfff]/u.test(normalized)) return { error: 'genius_invalid_query' };
    clean[key] = normalized;
  }
  const query = [clean.artist, clean.title].filter(Boolean).join(' ');
  return query ? { query } : { error: 'genius_invalid_query' };
}

function plainText(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 4000).normalize('NFKC').replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/[\ud800-\udfff]/gu, '').replace(/\s+/g, ' ').trim()
    .slice(0, 160).replace(/[\ud800-\udbff]$/, '');
}

function songURL(value) {
  if (typeof value !== 'string' || value.length > 1200) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['genius.com', 'www.genius.com'].includes(url.hostname) || url.port || url.username || url.password ||
      !url.pathname || url.pathname === '/' || /[<>\u0000-\u001f\u007f]|%0[0-9a-f]|%1[0-9a-f]|%7f/i.test(url.pathname)) return '';
    return 'https://genius.com' + url.pathname;
  } catch (_) { return ''; }
}

function songsFrom(body) {
  if (!body || !Array.isArray(body.response?.hits)) throw new Error('genius_unavailable');
  const songs = [], seen = new Set();
  for (const hit of body.response.hits.slice(0, 100)) {
    if (!hit || hit.type !== 'song' || !hit.result || typeof hit.result !== 'object') continue;
    const result = hit.result, id = result.id;
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    const lyricsState = result.lyrics_state === 'complete' ? 'complete' : result.lyrics_state == null ? 'unknown' : '';
    if (!lyricsState) continue;
    const title = plainText(result.title);
    const artists = Array.isArray(result.primary_artists) ? result.primary_artists.slice(0, 10).map(artist => plainText(artist?.name)).filter(Boolean) : [];
    const artist = plainText(artists.length ? artists.join(' & ') : result.primary_artist?.name);
    const url = songURL(result.url);
    if (!title || !artist || !url) continue;
    seen.add(id); songs.push({ id, title, artist, url, lyricsState });
    if (songs.length === 20) break;
  }
  return songs;
}

function retryAfter(response, now) {
  const value = response.headers?.get?.('Retry-After');
  const seconds = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value)
    : typeof value === 'string' ? Math.ceil((Date.parse(value) - now) / 1000) : 60;
  return Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : 60;
}

function json(response, status, body, cacheSeconds, retry) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=' + cacheSeconds : 'no-store');
  if (retry) response.setHeader('Retry-After', String(retry));
  if (typeof response.status === 'function') response.status(status);
  else response.statusCode = status;
  const detached = JSON.parse(JSON.stringify(body));
  return typeof response.json === 'function' ? response.json(detached) : response.end(JSON.stringify(detached));
}

function createHandler(options = {}) {
  const now = options.now || Date.now;
  const setTimer = options.setTimeout || setTimeout, clearTimer = options.clearTimeout || clearTimeout;
  const maxCache = Number.isInteger(options.maxCacheEntries) && options.maxCacheEntries > 0 ? Math.min(128, options.maxCacheEntries) : 64;
  const maxRequests = Number.isInteger(options.maxRequestsPerMinute) && options.maxRequestsPerMinute > 0 ? Math.min(100, options.maxRequestsPerMinute) : 20;
  const maxConcurrent = Number.isInteger(options.maxConcurrentRequests) && options.maxConcurrentRequests > 0 ? Math.min(8, options.maxConcurrentRequests) : 4;
  const cache = new Map(), inflight = new Map();
  let window = [], cooldownUntil = 0;

  async function load(query, token, entry) {
    let resolveDeadline, resolveAbort;
    const deadline = new Promise(resolve => { resolveDeadline = resolve; });
    const abort = new Promise(resolve => { resolveAbort = resolve; });
    const onAbort = () => resolveAbort({ status: 502, error: 'genius_unavailable' });
    entry.controller.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimer(() => {
      resolveDeadline({ status: 504, error: 'genius_unavailable' }); entry.controller.abort();
    }, 8000);
    try {
      const work = (async () => {
        const fetcher = options.fetch || globalThis.fetch;
        if (typeof fetcher !== 'function') throw new Error('genius_unavailable');
        const url = new URL(SEARCH_URL); url.searchParams.set('q', query.query);
        const response = await fetcher(url.toString(), { method: 'GET', redirect: 'error', credentials: 'omit',
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + token }, signal: entry.controller.signal });
        if (response.status === 401) return { status: 503, error: 'genius_setup_needed' };
        if (response.status === 429) return { status: 429, error: 'genius_rate_limit', retry: retryAfter(response, now()) };
        if (!response.ok) return { status: 502, error: 'genius_unavailable' };
        const body = await response.json();
        if (body?.meta?.status === 401) return { status: 503, error: 'genius_setup_needed' };
        if (body?.meta?.status === 429) return { status: 429, error: 'genius_rate_limit', retry: retryAfter(response, now()) };
        if (body?.meta?.status !== undefined && body.meta.status !== 200) return { status: 502, error: 'genius_unavailable' };
        return { status: 200, data: { source: 'genius', songs: songsFrom(body), fetchedAt: new Date(now()).toISOString() } };
      })();
      return await Promise.race([work, deadline, abort]);
    } catch (_) {
      // Provider bodies/exceptions may include credentials: return only typed codes.
      return { status: 502, error: 'genius_unavailable' };
    } finally {
      clearTimer(timer); entry.controller.signal.removeEventListener('abort', onAbort);
    }
  }

  async function waitFor(entry, request, response) {
    if (request.aborted || request.signal?.aborted || response.destroyed) {
      if (!entry.waiters && !entry.done) { entry.cancelled = true; entry.controller.abort(); }
      return CANCELLED;
    }
    let resolveAbort;
    const abort = new Promise(resolve => { resolveAbort = resolve; });
    const onAbort = () => resolveAbort(CANCELLED);
    const onClose = () => { if (!response.writableEnded) onAbort(); };
    entry.waiters++;
    request.signal?.addEventListener?.('abort', onAbort, { once: true });
    request.once?.('aborted', onAbort);
    response.once?.('close', onClose);
    try { return await Promise.race([entry.promise, abort]); }
    finally {
      request.signal?.removeEventListener?.('abort', onAbort);
      if (typeof request.off === 'function') request.off('aborted', onAbort);
      else request.removeListener?.('aborted', onAbort);
      if (typeof response.off === 'function') response.off('close', onClose);
      else response.removeListener?.('close', onClose);
      entry.waiters--;
      if (!entry.waiters && !entry.done) { entry.cancelled = true; entry.controller.abort(); }
    }
  }

  return async function genius(request, response) {
    if (request.aborted || request.signal?.aborted || response.destroyed) return;
    if (String(request.method || 'GET').toUpperCase() !== 'GET') {
      response.setHeader('Allow', 'GET'); return json(response, 405, { error: 'genius_invalid_query' });
    }
    const query = queryFor(request);
    if (query.error) return json(response, 400, { error: query.error });
    const configured = (options.env || process.env).GENIUS_ACCESS_TOKEN;
    const token = typeof configured === 'string' ? configured.trim() : '';
    if (!token || token.length > 4096 || /[^\x21-\x7e]/.test(token)) return json(response, 503, { error: 'genius_setup_needed' });
    const cacheKey = query.query, cached = cache.get(cacheKey);
    if (cached && now() - cached.at < CACHE_SECONDS * 1000) {
      cache.delete(cacheKey); cache.set(cacheKey, cached);
      return json(response, 200, cached.data, Math.max(1, Math.ceil((CACHE_SECONDS * 1000 - Math.max(0, now() - cached.at)) / 1000)));
    }
    cache.delete(cacheKey);
    let entry = inflight.get(cacheKey);
    if (entry?.cancelled) { inflight.delete(cacheKey); entry = null; }
    if (!entry) {
      const clock = now();
      if (clock < cooldownUntil) return json(response, 429, { error: 'genius_rate_limit' }, null, Math.max(1, Math.ceil((cooldownUntil - clock) / 1000)));
      window = window.filter(at => clock - at < 60000);
      if (window.length >= maxRequests) return json(response, 429, { error: 'genius_rate_limit' }, null, Math.max(1, Math.ceil((window[0] + 60000 - clock) / 1000)));
      if (inflight.size >= maxConcurrent) return json(response, 429, { error: 'genius_rate_limit' }, null, 1);
      window.push(clock);
      entry = { controller: new AbortController(), waiters: 0, cancelled: false, done: false, promise: null };
      entry.promise = load(query, token, entry).then(result => {
        if (!entry.cancelled && result.status === 200) {
          cache.set(cacheKey, { at: now(), data: result.data });
          while (cache.size > maxCache) cache.delete(cache.keys().next().value);
        } else if (!entry.cancelled && result.status === 429) cooldownUntil = Math.max(cooldownUntil, now() + result.retry * 1000);
        return result;
      }).finally(() => {
        entry.done = true;
        if (inflight.get(cacheKey) === entry) inflight.delete(cacheKey);
      });
      inflight.set(cacheKey, entry);
    }
    const result = await waitFor(entry, request, response);
    if (result === CANCELLED || request.aborted || request.signal?.aborted || response.destroyed) return;
    return result.status === 200 ? json(response, 200, result.data, CACHE_SECONDS)
      : json(response, result.status, { error: result.error }, null, result.retry);
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
