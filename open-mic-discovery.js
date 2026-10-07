(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_DISCOVERY = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var discoveryEndpoint = 'https://icebreaker-youtube-search.vercel.app/api/open-mic-discovery';
  var regions = ['TW', 'US', 'KR'];
  var videoPattern = /^[A-Za-z0-9_-]{11}$/;
  function failure(code, retryAfter) {
    var error = new Error(code);
    error.code = code;
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter;
    return error;
  }
  function cancelled() {
    var error = new Error('cancelled'); error.name = 'AbortError'; return error;
  }
  function cleanText(value, limit) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
  }
  function isoDate(value) {
    if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) return '';
    return new Date(value).toISOString();
  }
  function normalizeResponse(payload, region) {
    if (!payload || payload.source !== 'youtube' || !Array.isArray(payload.songs) || !isoDate(payload.fetchedAt) || payload.region !== region) throw failure('discovery_unavailable');
    var seen = Object.create(null), songs = [];
    payload.songs.slice(0, 50).forEach(function (item) {
      if (!item || typeof item.videoId !== 'string' || !videoPattern.test(item.videoId) || seen[item.videoId]) return;
      var title = cleanText(item.title, 120);
      if (!title || songs.length >= 12) return;
      seen[item.videoId] = true;
      songs.push({ videoId: item.videoId, title: title, channelTitle: cleanText(item.channelTitle, 120),
        publishedAt: isoDate(item.publishedAt), thumbnail: 'https://i.ytimg.com/vi/' + item.videoId + '/hqdefault.jpg' });
    });
    return { songs: songs, fetchedAt: isoDate(payload.fetchedAt), source: 'youtube', region: region };
  }
  function createClient(options) {
    options = options || {};
    var fetcher = options.fetch || global.fetch;
    var Abort = options.AbortController || global.AbortController;
    var later = options.setTimeout || global.setTimeout, clear = options.clearTimeout || global.clearTimeout;
    async function request(mode, query, settings) {
      settings = settings || {};
      var region = settings.region || 'TW';
      if (regions.indexOf(region) < 0) throw failure('discovery_invalid_region');
      if (mode === 'search') {
        if (typeof query !== 'string' || /[\u0000-\u001f\u007f]/.test(query) || query.trim().length > 100 || !query.trim()) throw failure('discovery_invalid_query');
        query = query.trim().replace(/\s+/g, ' ');
      }
      if (settings.signal && settings.signal.aborted) throw cancelled();
      if (typeof fetcher !== 'function' || typeof Abort !== 'function') throw failure('discovery_unavailable');
      var abort = new Abort(), timedOut = false;
      var onCancel = function () { abort.abort(); };
      if (settings.signal) settings.signal.addEventListener('abort', onCancel, { once: true });
      var timer = later(function () { timedOut = true; abort.abort(); }, 10000);
      var url = discoveryEndpoint + '?mode=' + mode + '&region=' + region;
      if (mode === 'search') url += '&q=' + encodeURIComponent(query);
      try {
        var response = await fetcher(url, { signal: abort.signal, headers: { Accept: 'application/json' }, credentials: 'omit' });
        if (settings.signal && settings.signal.aborted) throw cancelled();
        if (timedOut) throw failure('discovery_unavailable');
        if (!response.ok) {
          var body = null;
          try { body = await response.json(); } catch (_) {}
          var known = ['discovery_setup_needed', 'discovery_rate_limit', 'discovery_invalid_query', 'discovery_invalid_region'];
          var code = body && known.indexOf(body.error) >= 0 ? body.error : response.status === 429 ? 'discovery_rate_limit' : 'discovery_unavailable';
          var retryAfter = Number(response.headers && response.headers.get('Retry-After'));
          throw failure(code, retryAfter);
        }
        var payload = await response.json();
        if (settings.signal && settings.signal.aborted) throw cancelled();
        if (timedOut) throw failure('discovery_unavailable');
        return normalizeResponse(payload, region);
      } catch (error) {
        if (settings.signal && settings.signal.aborted) throw cancelled();
        if (!timedOut && error && error.code) throw error;
        throw failure('discovery_unavailable');
      } finally {
        clear(timer);
        if (settings.signal) settings.signal.removeEventListener('abort', onCancel);
      }
    }
    return { search: function (query, settings) { return request('search', query, settings); },
      popular: function (settings) { return request('popular', '', settings); } };
  }
  var client = createClient();
  client.createClient = createClient;
  client.normalizeResponse = normalizeResponse;
  return client;
}));
