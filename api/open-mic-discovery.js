/* Official YouTube metadata only. API credentials stay in this server function.
 * https://developers.google.com/youtube/v3/docs/search/list
 * https://developers.google.com/youtube/v3/docs/videos/list
 * Cache and admission limits are best-effort per instance, not distributed.
 */
'use strict';

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const POPULAR_URL = 'https://www.googleapis.com/youtube/v3/videos';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const REGIONS = new Set(['TW', 'US', 'KR']);
const QUOTA_REASONS = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded']);
const ENTITIES = Object.freeze({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', copy: '©', reg: '®' });

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 4000).replace(/&(#x[\da-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (whole, entity) => {
    if (entity[0] !== '#') return Object.hasOwn(ENTITIES, entity.toLowerCase()) ? ENTITIES[entity.toLowerCase()] : whole;
    const point = /^#x/i.test(entity) ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
  }).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()
    .slice(0, 120).replace(/[\ud800-\udbff]$/, '');
}
function publishedAt(value) {
  const timestamp = typeof value === 'string' && value.length <= 40 ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}
function songsFrom(body, mode) {
  if (!body || !Array.isArray(body.items)) throw new Error('discovery_unavailable');
  const songs = [], seen = new Set();
  for (const item of body.items.slice(0, 100)) {
    if (!item || typeof item !== 'object') continue;
    const videoId = mode === 'search' ? item.id?.videoId : item.id;
    const snippet = item.snippet || {}, status = item.status || {};
    if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId) || seen.has(videoId)) continue;
    if ((mode === 'popular' && status.embeddable !== true) || status.embeddable === false || status.madeForKids === true || status.selfDeclaredMadeForKids === true ||
      (status.privacyStatus && status.privacyStatus !== 'public') || ['live', 'upcoming'].includes(snippet.liveBroadcastContent)) continue;
    const title = cleanText(snippet.title);
    if (!title) continue;
    seen.add(videoId);
    songs.push({ videoId, title, channelTitle: cleanText(snippet.channelTitle), publishedAt: publishedAt(snippet.publishedAt),
      thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' });
    if (songs.length === 12) break;
  }
  return songs;
}
function queryFor(request) {
  let fields;
  if (typeof request.url === 'string' && request.url.length > 2048) return { error: 'discovery_invalid_query' };
  if (request.query && typeof request.query === 'object') fields = request.query;
  else {
    if (typeof request.url !== 'string' || request.url.length > 2048) return { error: 'discovery_invalid_query' };
    try {
      const params = new URL(request.url, 'https://icebreaker-hub.invalid').searchParams;
      fields = Object.create(null);
      for (const key of ['mode', 'q', 'region']) {
        const values = params.getAll(key);
        if (values.length) fields[key] = values.length === 1 ? values[0] : values;
      }
    } catch (_) { return { error: 'discovery_invalid_query' }; }
  }
  const mode = fields.mode == null ? 'popular' : fields.mode;
  if (typeof mode !== 'string' || !['search', 'popular'].includes(mode)) return { error: 'discovery_invalid_query' };
  const rawRegion = fields.region == null ? 'TW' : fields.region;
  if (typeof rawRegion !== 'string' || !REGIONS.has(rawRegion)) return { error: 'discovery_invalid_region' };
  let query = '';
  if (mode === 'search') {
    if (typeof fields.q !== 'string' || fields.q.length > 100 || /[\u0000-\u001f\u007f]/.test(fields.q)) return { error: 'discovery_invalid_query' };
    query = fields.q.replace(/\s+/g, ' ').trim();
    if (!query) return { error: 'discovery_invalid_query' };
  }
  return { mode, region: rawRegion, query };
}
function retryAfter(response, now, fallback) {
  const value = response.headers?.get?.('Retry-After');
  const seconds = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : typeof value === 'string' ? Math.ceil((Date.parse(value) - now) / 1000) : fallback;
  return Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : fallback;
}
function upstreamURL(query, key) {
  const url = new URL(query.mode === 'search' ? SEARCH_URL : POPULAR_URL);
  url.searchParams.set('part', query.mode === 'search' ? 'snippet' : 'snippet,status');
  url.searchParams.set('maxResults', '12');
  url.searchParams.set('regionCode', query.region);
  url.searchParams.set('videoCategoryId', '10');
  if (query.mode === 'search') {
    url.searchParams.set('q', query.query); url.searchParams.set('type', 'video');
    url.searchParams.set('videoEmbeddable', 'true'); url.searchParams.set('videoSyndicated', 'true');
    url.searchParams.set('safeSearch', 'moderate');
  } else url.searchParams.set('chart', 'mostPopular');
  url.searchParams.set('key', key);
  return url.toString();
}
function json(response, status, body, cacheSeconds, retry) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=' + cacheSeconds + ', stale-while-revalidate=60' : 'no-store');
  if (retry) response.setHeader('Retry-After', String(retry));
  if (typeof response.status === 'function') response.status(status);
  else response.statusCode = status;
  const detached = JSON.parse(JSON.stringify(body));
  if (typeof response.json === 'function') return response.json(detached);
  return response.end(JSON.stringify(detached));
}

function createHandler(options = {}) {
  const now = options.now || Date.now;
  const setTimer = options.setTimeout || setTimeout;
  const clearTimer = options.clearTimeout || clearTimeout;
  const maxCache = Number.isInteger(options.maxCacheEntries) && options.maxCacheEntries > 0 ? Math.min(128, options.maxCacheEntries) : 64;
  const maxRequests = Number.isInteger(options.maxRequestsPerMinute) && options.maxRequestsPerMinute > 0 ? Math.min(100, options.maxRequestsPerMinute) : 20;
  const cache = new Map(), inflight = new Map();
  let window = [], cooldownUntil = 0;

  async function load(query, key) {
    const controller = new AbortController();
    let rejectTimeout;
    const timeout = new Promise((_, reject) => { rejectTimeout = reject; });
    const timer = setTimer(() => { rejectTimeout(new Error('discovery_unavailable')); controller.abort(); }, 8000);
    try {
      const work = (async () => {
        const fetcher = options.fetch || globalThis.fetch;
        if (typeof fetcher !== 'function') throw new Error('discovery_unavailable');
        const response = await fetcher(upstreamURL(query, key), { method: 'GET', redirect: 'error',
          headers: { Accept: 'application/json' }, signal: controller.signal });
        if (response.status === 429) return { status: 429, error: 'discovery_rate_limit', retry: retryAfter(response, now(), 60) };
        const body = await response.json();
        if (!response.ok) {
          const quota = response.status === 403 && Array.isArray(body?.error?.errors) && body.error.errors.some(error => QUOTA_REASONS.has(error?.reason));
          return quota ? { status: 429, error: 'discovery_rate_limit', retry: retryAfter(response, now(), 3600) }
            : { status: 502, error: 'discovery_unavailable' };
        }
        return { status: 200, data: { songs: songsFrom(body, query.mode), fetchedAt: new Date(now()).toISOString(), source: 'youtube', region: query.region } };
      })();
      return await Promise.race([work, timeout]);
    } catch (_) {
      // Network exceptions and provider errors may contain the request URL/key.
      return { status: 502, error: 'discovery_unavailable' };
    } finally { clearTimer(timer); }
  }

  return async function discovery(request, response) {
    if (String(request.method || 'GET').toUpperCase() !== 'GET') {
      response.setHeader('Allow', 'GET');
      return json(response, 405, { error: 'discovery_invalid_query' });
    }
    const query = queryFor(request);
    if (query.error) return json(response, 400, { error: query.error });
    const configured = (options.env || process.env).YOUTUBE_API_KEY;
    const key = typeof configured === 'string' ? configured.trim() : '';
    if (!key) return json(response, 503, { error: 'discovery_setup_needed' });
    const seconds = query.mode === 'popular' ? 900 : 600;
    const cacheKey = [query.mode, query.region, query.query].join('\n');
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.at < seconds * 1000) {
      cache.delete(cacheKey); cache.set(cacheKey, cached);
      const age = Math.max(0, now() - cached.at);
      const remaining = Math.max(1, Math.ceil((seconds * 1000 - age) / 1000));
      return json(response, 200, cached.data, remaining);
    }
    cache.delete(cacheKey);
    let work = inflight.get(cacheKey);
    if (!work) {
      const clock = now();
      if (clock < cooldownUntil) return json(response, 429, { error: 'discovery_rate_limit' }, null, Math.max(1, Math.ceil((cooldownUntil - clock) / 1000)));
      window = window.filter(at => clock - at < 60000);
      if (window.length >= maxRequests) return json(response, 429, { error: 'discovery_rate_limit' }, null, Math.max(1, Math.ceil((window[0] + 60000 - clock) / 1000)));
      window.push(clock);
      work = load(query, key).then(result => {
        if (result.status === 200) {
          cache.set(cacheKey, { at: now(), data: result.data });
          while (cache.size > maxCache) cache.delete(cache.keys().next().value);
        } else if (result.status === 429) cooldownUntil = Math.max(cooldownUntil, now() + result.retry * 1000);
        return result;
      }).finally(() => { inflight.delete(cacheKey); });
      inflight.set(cacheKey, work);
    }
    const result = await work;
    return result.status === 200 ? json(response, 200, result.data, seconds)
      : json(response, result.status, { error: result.error }, null, result.retry);
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
