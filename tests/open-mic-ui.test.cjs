const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const storage = new Map(), timers = new Map(); let timerId = 0;
  const context = vm.createContext({ URL, AbortController,
    sessionStorage: { getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    setInterval: fn => { timers.set(++timerId, fn); return timerId; }, clearInterval: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(require.resolve('../open-mic-ui.js'), 'utf8'), context);
  const Game = context.OPEN_MIC_UI.Game;
  return { Game, storage, timers };
}

function lyricsEditor() {
  const f = setup(), g = Object.create(f.Game.prototype);
  const videoId = 'nfWlot6h_JM', editor = { value: 'Our saved party line.', matches: selector => selector === '[data-om-lyrics-editor]' };
  const labels = new Map(); let complete; const sent = [];
  const dialog = { open: true, close() { this.open = false; }, showModal() { this.open = true; } };
  Object.assign(g, { actor: 1, data: { sessionId: 'lyrics-session', selectedSong: { videoId, title: 'Our party song' },
    songLyrics: {}, spotlight: 1, round: 1 }, lyricsEditVideo: videoId, lyricsEditSession: 'lyrics-session',
    lyricsDrafts: {}, lyricsEditDialog: dialog, canControl: () => true,
    find: () => editor, setText: (selector, text) => labels.set(selector, text), render: () => {}, renderLyrics: () => {},
    action: (type, extra) => { sent.push({ type, extra }); return new Promise(resolve => { complete = resolve; }); } });
  return { ...f, g, editor, dialog, labels, sent, videoId, complete: result => complete(result),
    type(text) { editor.value = text; g.handleInput({ target: editor }); },
    key: () => g.draftKey(videoId, 'lyrics-session') };
}

test('lyrics typed during an asynchronous save remain an unsaved draft with the editor open', async () => {
  const f = lyricsEditor(), captured = f.editor.value;
  const saving = f.g.saveLyrics(); assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].type, 'setLyrics'); assert.equal(f.sent[0].extra.lyrics, captured);
  const newer = 'Our newer line is still being written.';
  f.type(newer); f.complete(true); await saving;
  assert.equal(f.g.lyricsDrafts[f.key()].text, newer);
  assert.equal(f.g.lyricsDrafts[f.key()].dirty, true); assert.equal(f.dialog.open, true);
  const persisted = JSON.parse(f.storage.get('openmic-lyrics-draft:' + f.key()));
  assert.equal(persisted.text, newer); assert.equal(persisted.dirty, true);
});

test('completion of an older lyrics save cannot close a newly reopened editor for the same song', async () => {
  const f = lyricsEditor(), saving = f.g.saveLyrics();
  f.g.close(f.dialog); assert.equal(f.dialog.open, false);
  f.g.openLyricsEditor(); assert.equal(f.dialog.open, true);
  f.complete(true); await saving;
  assert.equal(f.dialog.open, true, 'the reopened editor has its own lifecycle');
  assert.equal(f.g.lyricsEditVideo, f.videoId);
});

test('queued native dialog close events after teardown cannot access removed playlist controls', () => {
  const f = setup(), events = [], nodes = new Map(); let mounted = true, destroyedPlayer = 0;
  function node() { return { innerHTML: '', value: '', hidden: false, disabled: false,
    classList: { toggle() {} }, setAttribute() {}, removeAttribute() {} }; }
  function dialog() {
    const handlers = new Map();
    return { open: false, addEventListener: (event, fn) => handlers.set(event, fn), querySelector: () => node(),
      close() { this.open = false; const handler = handlers.get('close'); if (handler) events.push(handler); } };
  }
  const element = { addEventListener() {}, removeEventListener() {},
    querySelector: selector => mounted ? nodes.get(selector) : null,
    get innerHTML() { return ''; }, set innerHTML(_value) { mounted = false; } };
  const selectors = ['[data-om-preview-video]', '[data-om-playlist-player]', '[data-om-playlist-selection]',
    '[data-om-playlist-song-title]', '[data-om-playlist-current-title]', '[data-om-playlist-status]',
    '[data-om-playlist-load]', '[data-om-action="playlistCurrent"]', '[data-om-action="playlistAdd"]'];
  selectors.forEach(selector => nodes.set(selector, node()));
  class MountedGame extends f.Game {
    build() {
      this.previewDialog = dialog(); this.addDialog = dialog(); this.duetDialog = dialog();
      this.playlistDialog = dialog(); this.lyricsEditDialog = dialog(); this.lyricsReadDialog = dialog();
    }
  }
  const g = new MountedGame(element, {});
  g.playlistDialog.open = true;
  g.playlistPlayer = { destroy() { destroyedPlayer++; } };
  g.destroy(); assert.equal(destroyedPlayer, 1); assert.equal(f.timers.size, 0);
  assert.doesNotThrow(() => events.forEach(fn => fn()), 'a delayed close event must be safe after DOM removal');
  assert.equal(destroyedPlayer, 1);
});

test('lyrics and ordinary room updates preserve the current stage iframe', () => {
  const f = setup(), g = Object.create(f.Game.prototype), videoWrites = [];
  Object.assign(g, { actor: 0, videoKey: null, pending: false, canControl: () => true,
    data: { sessionId: 'iframe-session', round: 1, spotlight: 1, phase: 'singing', challengeResult: 'success',
      singingState: 'singing', duration: 35, selectedSong: { videoId: 'nfWlot6h_JM', title: 'Party song', artist: 'Our group' } },
    setText: () => {}, set: (selector, html) => { if (selector === '[data-om-stage-video]') videoWrites.push(html); } });
  g.renderStage(); assert.equal(videoWrites.length, 1); assert.match(videoWrites[0], /playsinline=1/);
  g.data.songLyrics = { nfWlot6h_JM: 'One shared party line.' }; g.renderStage();
  g.data.mySongs = { 1: ['nfWlot6h_JM'] }; g.renderStage();
  g.data.revision = 20; g.renderStage();
  assert.equal(videoWrites.length, 1, 'same selected song keeps its mounted video during updates');
  g.data.selectedSong = { videoId: 'JGwWNGJdvx8', title: 'Next song', artist: 'Our group' }; g.renderStage();
  assert.equal(videoWrites.length, 2);
});
