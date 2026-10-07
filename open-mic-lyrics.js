/* Read-only LRCLIB search. Results are plain text; callers render text, never HTML.
 * Official API: https://lrclib.net/docs — no account or API key required.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_LYRICS = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var ENDPOINT = 'https://lrclib.net/api/search';
  var TIMEOUT_MS = 12000;
  var MAX_LYRICS_CHARS = 16000;
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var MAX_CACHE_ENTRIES = 12;
  var cache = new Map();
  var hiddenControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

  function failure(code, retryAfter) {
    var error = new Error(code);
    error.code = code;
    if (Number.isFinite(retryAfter)) error.retryAfter = retryAfter;
    return error;
  }
  function canceled() {
    var error = new Error('Lyrics request canceled');
    error.name = 'AbortError';
    return error;
  }
  function metadata(value, limit) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
  }
  function queryField(value, limit) {
    if (value == null) return '';
    if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) throw failure('invalid_lyrics_query');
    return value.replace(/\s+/g, ' ').trim();
  }
  function queryURL(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('invalid_lyrics_query');
    var title = queryField(input.title, 160);
    var artist = queryField(input.artist, 160);
    var query = queryField(input.query, 320);
    if (!query && !title) throw failure('invalid_lyrics_query');
    var url = new URL(ENDPOINT);
    if (query) url.searchParams.set('q', query);
    else {
      url.searchParams.set('track_name', title);
      if (artist) url.searchParams.set('artist_name', artist);
    }
    return url.toString();
  }
  function plainText(value, synced) {
    if (typeof value !== 'string' || value.length > 64000) return '';
    var text = value.replace(/\r\n?/g, '\n').replace(hiddenControls, '');
    if (synced) {
      text = text.split('\n').filter(function (line) {
        return !/^\s*\[(?:ar|al|ti|by|offset|re|ve|length):[^\]]*\]\s*$/i.test(line);
      }).map(function (line) {
        return line.replace(/^(?:\s*\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+\s*/, '')
          .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, '');
      }).join('\n');
    }
    text = text.trim();
    // Avoid presenting a silently truncated song as a complete lyric match.
    return text.length <= MAX_LYRICS_CHARS ? text : '';
  }
  function records(payload) {
    if (!Array.isArray(payload)) throw failure('lyrics_unavailable');
    var seen = new Set();
    var results = [];
    for (var index = 0; index < Math.min(payload.length, 200) && results.length < 20; index++) {
      var record = payload[index];
      if (!record || typeof record !== 'object') continue;
      var id = String(record.id == null ? '' : record.id);
      if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)) || seen.has(id)) continue;
      var title = metadata(record.trackName || record.name, 160);
      if (!title) continue;
      var lyrics = plainText(record.plainLyrics, false) || plainText(record.syncedLyrics, true);
      var instrumental = record.instrumental === true;
      if (!lyrics && !instrumental) continue;
      seen.add(id);
      results.push({ id: id, title: title, artist: metadata(record.artistName, 160), album: metadata(record.albumName, 160),
        lyrics: instrumental ? '' : lyrics, instrumental: instrumental });
    }
    return results;
  }
  function detached(records) { return records.map(function (record) { return Object.assign({}, record); }); }
  function retrySeconds(response, fallback) {
    var value = response.headers && typeof response.headers.get === 'function' ? response.headers.get('Retry-After') : null;
    var seconds = value && /^\d+$/.test(value.trim()) ? Number(value) : value ? Math.ceil((Date.parse(value) - Date.now()) / 1000) : fallback;
    return Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : fallback;
  }

  async function search(input, options) {
    var url = queryURL(input);
    var signal = options && options.signal;
    if (signal && signal.aborted) throw canceled();
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw failure('lyrics_unavailable');
    var cached = cache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      cache.delete(url); cache.set(url, cached);
      return detached(cached.records);
    }
    cache.delete(url);
    if (typeof global.fetch !== 'function' || typeof global.AbortController !== 'function') throw failure('lyrics_unavailable');
    var controller = new global.AbortController();
    var interrupt;
    var interrupted = new Promise(function (_, reject) { interrupt = reject; });
    var onAbort = function () { interrupt(canceled()); controller.abort(); };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    var timer = global.setTimeout(function () { interrupt(failure('lyrics_unavailable')); controller.abort(); }, TIMEOUT_MS);
    try {
      var request = (async function () {
        var response = await global.fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'error',
          headers: { Accept: 'application/json' }, signal: controller.signal });
        if (response.status === 429) throw failure('lyrics_rate_limit', retrySeconds(response, 30));
        if (response.status === 400) throw failure('invalid_lyrics_query');
        if (!response.ok) throw failure('lyrics_unavailable', retrySeconds(response, response.status === 503 ? 1 : 5));
        return records(await response.json());
      }());
      var result = await Promise.race([request, interrupted]);
      if (signal && signal.aborted) throw canceled();
      cache.set(url, { at: Date.now(), records: detached(result) });
      while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
      return detached(result);
    } catch (error) {
      if (signal && signal.aborted) throw canceled();
      if (error && ['lyrics_unavailable', 'lyrics_rate_limit', 'invalid_lyrics_query'].includes(error.code)) throw error;
      throw failure('lyrics_unavailable');
    } finally {
      global.clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  var decoration = /(?:\bofficial\b\s*(?:music\s*)?(?:video|audio|mv|visuali[sz]er)?|\bmusic\s*video\b|\blyric(?:s|\s*video)?\b|\bvisuali[sz]er\b|(?:高清|官方|正式|完整版|中文字幕|字幕|歌詞|歌词)(?:版|音樂|音乐|影片|视频|mv)*|\b(?:mv|hd|4k|1080p|720p)\b)/i;
  function cleanTitle(value) {
    var text = metadata(value, 320);
    text = text.replace(/\(([^)]*)\)|\[([^\]]*)\]|【([^】]*)】/g, function (whole, a, b, c) {
      return decoration.test(a || b || c || '') ? '' : whole;
    });
    text = text.replace(/\s*(?:[-–—|]\s*)?(?:official\s*(?:music\s*)?(?:video|audio|mv|visuali[sz]er)|lyrics?\s*(?:video)?|music\s*video|官方\s*(?:mv|音樂影片|音乐视频)|(?:高清|中文字幕|歌詞版|歌词版))\s*$/i, '');
    text = text.replace(/\s+/g, ' ').trim();
    var wrapped = text.match(/^["“「『《【](.*?)["”」』》】]$/);
    return wrapped ? wrapped[1].trim() : text;
  }
  function originalAlias(title) {
    var parts = title.split(/\s+\/\s+/);
    if (parts.length !== 2) return title;
    var han = /[\u3400-\u9fff\uf900-\ufaff]/;
    if (han.test(parts[0]) && !han.test(parts[1])) return parts[0].trim();
    if (han.test(parts[1]) && !han.test(parts[0])) return parts[1].trim();
    return title;
  }
  function infer(song) {
    song = song && typeof song === 'object' ? song : {};
    var title = cleanTitle(song.title);
    var artist = metadata(song.artist, 160);
    if (!artist) {
      var split = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      var quoted = !split && title.match(/^(.+?)\s*[【「『《“"](.+?)[】」』》”"]$/);
      if (split || quoted) { artist = (split || quoted)[1].trim(); title = (split || quoted)[2].trim(); }
    }
    title = originalAlias(cleanTitle(title)).slice(0, 160);
    artist = artist.replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.+$/i, '').trim();
    // Hub Mandarin cards display both local and English names; search the original.
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(title)) {
      var localArtist = artist.match(/^([\u3400-\u9fff\uf900-\ufaff·・]+)(?:\s+[A-Za-z]|(?=[A-Za-z]))/);
      if (localArtist) artist = localArtist[1];
    }
    return { title: title, artist: artist.slice(0, 160), query: '' };
  }
  return { search: search, infer: infer };
}));
