const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Y = require('../open-mic-youtube.js');
const source = fs.readFileSync(require.resolve('../open-mic-youtube.js'), 'utf8');
const videoId = 'dQw4w9WgXcQ', playlistId = 'PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj';

test('public playlist parsing accepts playlist/watch/share URLs and rejects foreign origins and injection', () => {
  for (const url of [`https://www.youtube.com/playlist?list=${playlistId}`, `https://m.youtube.com/watch?v=${videoId}&list=${playlistId}`, `https://youtu.be/${videoId}?list=${playlistId}`]) {
    assert.equal(Y.parsePlaylistURL(url), playlistId);
  }
  for (const url of ['https://youtube.com.evil.com/playlist?list=' + playlistId, 'https://youtube.com@evil.com/?list=' + playlistId, 'javascript:alert(1)', 'https://youtube.com/playlist?list=x', 'https://youtube.com/playlist?list=<script>', 'https://user:pass@youtube.com/playlist?list=' + playlistId]) {
    assert.equal(Y.parsePlaylistURL(url), null);
  }
  assert.equal(Y.parseVideoURL(`https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`), videoId);
  assert.equal(Y.parseVideoURL(`https://evil.com/watch?v=${videoId}`), null);
});

function environment(extra = {}) {
  let options, destroyed = 0;
  const context = vm.createContext({ URL, Promise, setTimeout, clearTimeout, location: { origin: 'https://hub.example' },
    document: { createElement: () => ({}) },
    YT: { Player: function (_mount, supplied) { options = supplied; this.getVideoUrl = () => `https://www.youtube.com/watch?v=${videoId}`; this.destroy = () => destroyed++; queueMicrotask(() => supplied.events.onReady({ target: this })); } },
    ...extra });
  vm.runInContext(source, context);
  return { api: context.OPEN_MIC_YOUTUBE, element: { isConnected: true, replaceChildren() {} }, options: () => options, destroyed: () => destroyed };
}

test('playlist player uses the actual current video and documented API, never autoplaying or selecting by itself', async () => {
  const f = environment({ fetch: async url => { assert.match(url, /^https:\/\/www.youtube.com\/oembed\?/); return { ok: true, json: async () => ({ title: 'Actual current song', author_name: 'Artist' }) }; } });
  const controller = await f.api.createPlaylistPlayer(f.element, playlistId);
  assert.equal(f.options().playerVars.list, playlistId);
  assert.equal(f.options().playerVars.autoplay, 0);
  assert.equal(f.options().playerVars.origin, 'https://hub.example');
  const song = await controller.currentVideo();
  assert.equal(song.videoId, videoId); assert.equal(song.title, 'Actual current song');
  controller.destroy(); assert.equal(f.destroyed(), 1);
  await assert.rejects(controller.currentVideo(), /youtube_unavailable/);
});

test('metadata failures preserve a usable video URL and empty title for manual entry', async () => {
  for (const fetch of [async () => { throw new Error('CORS blocked'); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ title: {}, author_name: null }) })]) {
    const f = environment({ fetch }), song = await f.api.metadata(videoId);
    assert.equal(song.videoId, videoId); assert.equal(song.url, `https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(song.title, ''); assert.equal(song.artist, '');
  }
});

test('unready playlist videos and disconnected mounts reject without introducing fake songs', async () => {
  const f = environment();
  await assert.rejects(f.api.createPlaylistPlayer({ isConnected: false }, playlistId), /youtube_unavailable/);
  await assert.rejects(f.api.createPlaylistPlayer(f.element, '<script>'), /invalid_playlist/);
  const g = environment({ YT: { Player: function (_mount, supplied) { this.getVideoUrl = () => 'https://www.youtube.com/playlist?list=' + playlistId; this.destroy = () => {}; queueMicrotask(() => supplied.events.onReady({ target: this })); } } });
  const player = await g.api.createPlaylistPlayer(g.element, playlistId);
  await assert.rejects(player.currentVideo(), /choose_youtube_video/); player.destroy();
});
