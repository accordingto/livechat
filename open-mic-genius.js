/* Genius metadata adapter; lyrics stay in the isolated official embed.
 * The API returns song metadata only and never receives room credentials.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_GENIUS = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var ENDPOINT = 'https://icebreaker-youtube-search.vercel.app/api/open-mic-lyrics';
  var TIMEOUT_MS = 12000;
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var MAX_CACHE_ENTRIES = 12;
  var cache = new Map();

  function failure(code, retryAfter) {
    var error = new Error(code);
    error.code = code;
    if (Number.isFinite(retryAfter)) error.retryAfter = retryAfter;
    return error;
  }
  function canceled() {
    var error = new Error('Genius request canceled');
    error.name = 'AbortError';
    return error;
  }
  function queryField(value) {
    if (value == null) return '';
    if (typeof value !== 'string' || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) throw failure('genius_invalid_query');
    var text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (text.length > 160) throw failure('genius_invalid_query');
    return text;
  }
  function queryFields(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('genius_invalid_query');
    var title = queryField(input.title), artist = queryField(input.artist);
    if (!title && !artist) throw failure('genius_invalid_query');
    return { title: title, artist: artist };
  }
  function metadata(value) {
    return typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  }
  function songId(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    var id = String(value);
    return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id)) ? id : '';
  }
  function songURL(value) {
    if (typeof value !== 'string' || value.length > 1024 || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'genius.com' || url.username || url.password || url.port || url.pathname === '/') return '';
      return url.toString();
    } catch (_) { return ''; }
  }
  function records(payload) {
    if (!payload || payload.source !== 'genius' || !Array.isArray(payload.songs)) throw failure('genius_unavailable');
    var seen = new Set(), result = [];
    for (var i = 0; i < Math.min(200, payload.songs.length) && result.length < 20; i++) {
      var song = payload.songs[i];
      if (!song || typeof song !== 'object') continue;
      var id = songId(song.id), title = metadata(song.title), artist = metadata(song.artist), url = songURL(song.url);
      if (!id || !title || !artist || !url || seen.has(id)) continue;
      seen.add(id);
      result.push({ id: id, title: title, artist: artist, url: url, lyricsState: song.lyricsState === 'complete' ? 'complete' : 'unknown' });
    }
    return result;
  }
  function detached(songs) { return songs.map(function (song) { return Object.assign({}, song); }); }
  function retrySeconds(response, fallback) {
    var value = response.headers && typeof response.headers.get === 'function' ? response.headers.get('Retry-After') : null;
    var seconds = value && /^\d+$/.test(value.trim()) ? Number(value) : value ? Math.ceil((Date.parse(value) - Date.now()) / 1000) : fallback;
    return Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : fallback;
  }

  async function search(input, options) {
    var fields = queryFields(input), signal = options && options.signal;
    if (signal && signal.aborted) throw canceled();
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw failure('genius_unavailable');
    var url = new URL(ENDPOINT);
    url.searchParams.set('title', fields.title);
    url.searchParams.set('artist', fields.artist);
    var key = url.toString(), cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      cache.delete(key); cache.set(key, cached);
      return detached(cached.songs);
    }
    cache.delete(key);
    if (typeof global.fetch !== 'function' || typeof global.AbortController !== 'function') throw failure('genius_unavailable');
    var deadline = Date.now() + TIMEOUT_MS, controller = new global.AbortController(), interrupt;
    var interrupted = new Promise(function (_, reject) { interrupt = reject; });
    var onAbort = function () { interrupt(canceled()); controller.abort(); };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    var timer = global.setTimeout(function () { interrupt(failure('genius_unavailable')); controller.abort(); }, Math.max(1, deadline - Date.now()));
    try {
      var operation = (async function () {
        var response = await global.fetch(key, { method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'error',
          headers: { Accept: 'application/json' }, signal: controller.signal });
        if (response.status === 429) throw failure('genius_rate_limit', retrySeconds(response, 30));
        if (response.status === 400) throw failure('genius_invalid_query');
        if (!response.ok) {
          if (response.status === 503) {
            var body;
            try { body = await response.json(); } catch (_) {}
            if (body && body.error === 'genius_setup_needed') throw failure('genius_setup_needed');
          }
          throw failure('genius_unavailable', retrySeconds(response, 5));
        }
        return records(await response.json());
      }());
      var result = await Promise.race([operation, interrupted]);
      if (signal && signal.aborted) throw canceled();
      cache.set(key, { at: Date.now(), songs: detached(result) });
      while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
      return detached(result);
    } catch (error) {
      if (signal && signal.aborted) throw canceled();
      if (error && ['genius_invalid_query', 'genius_setup_needed', 'genius_rate_limit', 'genius_unavailable'].includes(error.code)) throw error;
      throw failure('genius_unavailable');
    } finally {
      global.clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  function normalized(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function artistAliases(value) {
    var text = String(value || '').normalize('NFKC').trim(), aliases = [normalized(text)];
    var parts = text.match(/^([^()]+?)\s*\(([^()]+)\)$/);
    if (parts) {
      var latin = /^[A-Za-z][A-Za-z0-9 .’‘'·_-]*$/;
      var otherScript = /^[\p{L}\p{N} .’‘'·・-]+$/u;
      var first = parts[1].trim(), second = parts[2].trim();
      var firstOther = otherScript.test(first) && /\p{L}/u.test(first) && !/[A-Za-z]/.test(first);
      var secondOther = otherScript.test(second) && /\p{L}/u.test(second) && !/[A-Za-z]/.test(second);
      // Only names explicitly displayed in two scripts are aliases. Parentheses
      // such as "Official", "Remix" or "feat. Artist" are not alias evidence.
      if (latin.test(first) && secondOther || latin.test(second) && firstOther) {
        aliases.push(normalized(first), normalized(second));
      }
    }
    return aliases;
  }
  function matches(songs, input) {
    var fields = queryFields(input), title = normalized(fields.title), artist = normalized(fields.artist);
    var inputArtists = artistAliases(fields.artist), reversedArtists = artistAliases(fields.title);
    var candidates = records({ source: 'genius', songs: songs });
    var exact = candidates.filter(function (song) {
      if (!title || !artist) return false;
      var songTitle = normalized(song.title), artists = artistAliases(song.artist);
      return songTitle === title && artists.some(function (name) { return inputArtists.includes(name); }) ||
        songTitle === artist && artists.some(function (name) { return reversedArtists.includes(name); });
    });
    return { exact: detached(exact), auto: exact.length === 1 && exact[0].lyricsState === 'complete' ? Object.assign({}, exact[0]) : null,
      candidates: detached(candidates) };
  }

  function embedDocument(value) {
    var id = songId(value);
    if (!id) throw failure('genius_invalid_song');
    // Parser-inserted script is required: Genius uses document.write. The caller
    // supplies an allow-scripts sandbox without allow-same-origin on this frame.
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>body{margin:0;padding:0;background:white}</style></head><body>' +
      '<div id="rg_embed_link_' + id + '" class="rg_embed_link" data-song-id="' + id + '"></div>' +
      '<script>(function(){"use strict";var id="' + id + '",done=false,timer,observer;' +
      'function finish(type){if(done)return;done=true;clearTimeout(timer);if(observer)observer.disconnect();' +
      'window.removeEventListener("error",failed,true);parent.postMessage({source:"openmic-genius",type:type,songId:id},"*");}' +
      'function check(){var body=document.querySelector(".rg_embed_body");if(body&&body.textContent.trim().length>0)finish("ready");}' +
      'function failed(event){if(event.target&&event.target.tagName==="SCRIPT")finish("fail");}' +
      'window.addEventListener("error",failed,true);window.addEventListener("DOMContentLoaded",check,{once:true});' +
      'if(typeof MutationObserver==="function"){observer=new MutationObserver(check);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});}' +
      'timer=setTimeout(function(){check();if(!done)finish("fail");},12000);' +
      '}());</script><script src="https://genius.com/songs/' + id + '/embed"></script></body></html>';
  }

  return { search: search, matches: matches, embedDocument: embedDocument };
}));
