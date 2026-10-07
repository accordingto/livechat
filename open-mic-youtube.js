(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OPEN_MIC_YOUTUBE = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var apiPromise = null;
  var videoPattern = /^[A-Za-z0-9_-]{11}$/;
  var playlistPattern = /^[A-Za-z0-9_-]{10,150}$/;
  function youtubeURL(value) {
    try {
      var url = new URL(String(value || '').trim());
      var host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
      return /^https?:$/.test(url.protocol) && !url.username && !url.password &&
        ['youtube.com', 'youtu.be', 'youtube-nocookie.com'].indexOf(host) >= 0 ? url : null;
    } catch (_) { return null; }
  }
  function parsePlaylistURL(value) {
    var url = youtubeURL(value), id = url && url.searchParams.get('list');
    return id && playlistPattern.test(id) ? id : null;
  }
  function parseVideoURL(value) {
    var url = youtubeURL(value);
    if (!url) return null;
    var id = url.hostname.toLowerCase() === 'youtu.be' ? url.pathname.split('/')[1] : url.searchParams.get('v');
    return videoPattern.test(id || '') ? id : null;
  }
  function loadAPI() {
    if (global.YT && typeof global.YT.Player === 'function') return Promise.resolve(global.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      if (!global.document) { reject(new Error('youtube_unavailable')); return; }
      var oldReady = global.onYouTubeIframeAPIReady;
      var script = global.document.createElement('script');
      var done = false;
      var timer = global.setTimeout(function () { finish(new Error('youtube_unavailable')); }, 20000);
      function ready() {
        try { if (typeof oldReady === 'function') oldReady(); } catch (_) {}
        if (global.YT && typeof global.YT.Player === 'function') finish();
        else finish(new Error('youtube_unavailable'));
      }
      function finish(error) {
        if (done) return;
        done = true; global.clearTimeout(timer);
        if (global.onYouTubeIframeAPIReady === ready) global.onYouTubeIframeAPIReady = oldReady;
        script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve(global.YT);
      }
      global.onYouTubeIframeAPIReady = ready;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = function () { finish(new Error('youtube_unavailable')); };
      global.document.head.appendChild(script);
    });
    apiPromise.catch(function () { apiPromise = null; });
    return apiPromise;
  }
  async function metadata(videoId) {
    var result = { videoId: videoId, url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId), title: '', artist: '' };
    if (!videoPattern.test(videoId || '')) throw new Error('choose_youtube_video');
    if (typeof global.fetch !== 'function') return result;
    var abort = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    var timer;
    try {
      // Optional title lookup. The video ID, not remote markup, identifies the song.
      var request = global.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(result.url), abort ? { signal: abort.signal } : {}).then(function (response) { return response.ok ? response.json() : null; });
      var data = await Promise.race([request, new Promise(function (_, reject) {
        timer = global.setTimeout(function () { if (abort) abort.abort(); reject(new Error('metadata_timeout')); }, 6000);
      })]);
      if (data) {
        if (typeof data.title === 'string') result.title = data.title.trim().slice(0, 120);
        if (typeof data.author_name === 'string') result.artist = data.author_name.trim().slice(0, 120);
      }
    } catch (_) { /* Manual title entry remains available if oEmbed is blocked. */ }
    finally { global.clearTimeout(timer); }
    return result;
  }
  async function createPlaylistPlayer(element, playlistId, options) {
    options = options || {};
    if (!playlistPattern.test(String(playlistId || ''))) throw new Error('invalid_playlist');
    var API = await loadAPI();
    if (!element || element.isConnected === false || options.signal && options.signal.aborted) throw new Error('youtube_unavailable');
    return new Promise(function (resolve, reject) {
      var mount = global.document.createElement('div');
      element.replaceChildren(mount);
      var player, disposed = false, settled = false;
      var timer = global.setTimeout(function () { fail('youtube_unavailable'); }, 20000);
      function cleanup() {
        disposed = true; global.clearTimeout(timer);
        if (options.signal) options.signal.removeEventListener('abort', cancel);
        if (player) { try { player.destroy(); } catch (_) {} }
      }
      function fail(code) {
        if (!settled) { settled = true; cleanup(); reject(new Error(code)); }
        else if (!disposed && options.onError) options.onError(code);
      }
      function cancel() { if (!settled) fail('youtube_unavailable'); else cleanup(); }
      if (options.signal) options.signal.addEventListener('abort', cancel, { once: true });
      try { player = new API.Player(mount, {
        width: '100%', height: '100%',
        playerVars: { listType: 'playlist', list: playlistId, autoplay: 0, playsinline: 1, cc_load_policy: 1, origin: global.location && global.location.origin || '' },
        events: {
          onReady: function (event) {
            if (disposed) return;
            player = event.target || player;
            settled = true; global.clearTimeout(timer);
            var controller = {
              currentVideo: async function () {
                if (disposed) throw new Error('youtube_unavailable');
                var videoId = parseVideoURL(player.getVideoUrl());
                if (!videoId) throw new Error('choose_youtube_video');
                return metadata(videoId);
              },
              destroy: cleanup
            };
            if (options.onReady) options.onReady(controller);
            resolve(controller);
          },
          onError: function () { fail('youtube_unavailable'); }
        }
      }); } catch (_) { fail('youtube_unavailable'); }
    });
  }
  return { parsePlaylistURL: parsePlaylistURL, parseVideoURL: parseVideoURL, createPlaylistPlayer: createPlaylistPlayer, metadata: metadata };
}));
