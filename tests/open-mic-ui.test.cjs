const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(extraGlobals = {}) {
  const storage = new Map(), timers = new Map(); let timerId = 0;
  const context = vm.createContext({ URL, AbortController,
    sessionStorage: { getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    setInterval: fn => { timers.set(++timerId, fn); return timerId; }, clearInterval: id => timers.delete(id), ...extraGlobals });
  vm.runInContext(fs.readFileSync(require.resolve('../open-mic-ui.js'), 'utf8'), context);
  const Game = context.OPEN_MIC_UI.Game;
  return { Game, storage, timers, context };
}

function lyricsEditor() {
  const f = setup(), g = Object.create(f.Game.prototype);
  const videoId = 'nfWlot6h_JM', editor = { value: 'Our saved party line.', matches: selector => selector === '[data-om-lyrics-editor]' };
  const labels = new Map(); let complete; const sent = [];
  const dialog = { open: true, close() { this.open = false; }, showModal() { this.open = true; } };
  Object.assign(g, { actor: 1, data: { sessionId: 'lyrics-session', selectedSong: { videoId, title: 'Our party song' },
    songLyrics: {}, spotlight: 1, round: 1 }, lyricsEditVideo: videoId, lyricsEditSession: 'lyrics-session',
    lyricsDrafts: {}, lyricsEditDialog: dialog, lyricsFindDialog: { open: false }, canControl: () => true,
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
      this.lyricsFindDialog = dialog();
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

const nextTask = () => new Promise(resolve => setImmediate(resolve));
const originalFixture = 'Our little party finds a tune.\nWe share a smile beneath the moon.';
function lyricRecord(overrides = {}) {
  return { id: '101', title: 'Our Party Song', artist: 'Our Players', album: 'Our First Album',
    lyrics: originalFixture, instrumental: false, ...overrides };
}
function lyricsLookup(actor = 0) {
  const requests = [], sent = [], nodes = new Map(), control = { available: true };
  const api = {
    infer: song => ({ title: song.title, artist: song.artist, query: '' }),
    search(fields, options) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ fields, signal: options?.signal, resolve, reject }); return promise;
    },
  };
  const f = setup({ OPEN_MIC_LYRICS: api }), g = Object.create(f.Game.prototype);
  function node() { return { value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, open: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, focus() {} }; }
  const dialog = () => ({ open: false, close() { this.open = false; }, showModal() { this.open = true; } });
  Object.assign(g, { actor, destroyed: false, pending: false, error: '', notice: '',
    data: { sessionId: 'lookup-session', turnId: 5, round: 1, spotlight: 1, teamScore: 2,
      phase: 'singing', singingState: 'singing', singingStartedAt: 100000, duration: 35,
      selectedSong: { videoId: 'nfWlot6h_JM', title: 'Our Party Song', artist: 'Our Players' }, songLyrics: {} },
    lyricsDrafts: {}, lyricsEditVideo: null, lyricsEditSession: null, lyricsEditGeneration: 0,
    lyricsLookupRecords: [], lyricsLookupPicked: null, lyricsLookupGeneration: 0, lyricsLookupAbort: null,
    lyricsLookupBusy: false, lyricsLookupMode: null, lyricsLookupStatus: null, lyricsLookupSong: null, lyricsAutoAttemptKey: null,
    lyricsEditDialog: dialog(), lyricsFindDialog: dialog(), previewDialog: dialog(), duetDialog: dialog(),
    playlistDialog: dialog(), lyricsReadDialog: dialog(),
    canControl: () => control.available, render: () => {},
    find: selector => { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); },
    action: async (type, extra) => {
      sent.push({ type, extra: JSON.parse(JSON.stringify(extra)) });
      if (type === 'setLyrics') g.data.songLyrics[extra.videoId] = extra.lyrics;
      return true;
    },
    close: target => { target.open = false; },
  });
  return { ...f, g, api, requests, sent, nodes, control,
    fields: () => api.infer(g.data.selectedSong),
    async response(records, mode = 'auto') {
      const work = g.searchLyrics(this.fields(), mode);
      requests.at(-1).resolve(records); await work;
    } };
}

test('automatic lyrics share one exact result after deduplicating identical text and protect concurrent manual saves', async () => {
  const f = lyricsLookup(), progress = [f.g.data.turnId, f.g.data.teamScore, f.g.data.singingStartedAt, f.g.data.phase];
  f.g.maybeAutoLyrics(); await nextTask(); assert.equal(f.requests.length, 1);
  f.requests[0].resolve([lyricRecord(), lyricRecord({ id: '102', album: 'Our Reissued Album' })]); await nextTask();
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'setLyrics');
  assert.equal(f.sent[0].extra.lyrics, originalFixture); assert.equal(f.sent[0].extra.onlyIfEmpty, true);
  assert.equal(f.g.lyricsLookupRecords.length, 1); assert.equal(f.g.lyricsLookupStatus.key, 'lyricsImported');
  assert.deepEqual([f.g.data.turnId, f.g.data.teamScore, f.g.data.singingStartedAt, f.g.data.phase], progress);
  f.g.maybeAutoLyrics(); await nextTask(); assert.equal(f.requests.length, 1, 'already shared lyrics do not refetch');
});

test('ambiguous versions, mismatched metadata, and instrumental records never automatically share lyrics', async () => {
  const cases = [
    [lyricRecord(), lyricRecord({ id: '102', lyrics: 'A different original verse from our group.' })],
    [lyricRecord({ title: 'A Different Party Song' })],
    [lyricRecord({ artist: 'A Different Group' })],
    [lyricRecord({ instrumental: true, lyrics: '' })],
  ];
  for (const records of cases) {
    const f = lyricsLookup(); await f.response(records);
    assert.equal(f.sent.length, 0); assert.equal(f.g.getLyrics('nfWlot6h_JM'), '');
  }
});

test('existing shared text and manual drafts suppress automatic lookup before any network request', async () => {
  for (const kind of ['shared', 'draft', 'editor']) {
    const f = lyricsLookup(), videoId = f.g.data.selectedSong.videoId;
    if (kind === 'shared') f.g.data.songLyrics[videoId] = 'A manually shared original line.';
    if (kind === 'draft') f.g.storeDraft(f.g.draftKey(videoId), { text: 'A local original draft.', dirty: true });
    if (kind === 'editor') { f.g.lyricsEditDialog.open = true; f.g.lyricsEditVideo = videoId; }
    f.g.maybeAutoLyrics(); await nextTask(); assert.equal(f.requests.length, 0); assert.equal(f.sent.length, 0);
  }
});

test('manual text or a draft created while lookup is pending is preserved when the result arrives', async () => {
  for (const kind of ['shared', 'draft', 'editor']) {
    const f = lyricsLookup(), videoId = f.g.data.selectedSong.videoId;
    const work = f.g.searchLyrics(f.fields(), 'auto');
    if (kind === 'shared') f.g.data.songLyrics[videoId] = 'A new manually shared original line.';
    if (kind === 'draft') f.g.storeDraft(f.g.draftKey(videoId), { text: 'A newer local draft.', dirty: true });
    if (kind === 'editor') { f.g.lyricsEditDialog.open = true; f.g.lyricsEditVideo = videoId; }
    f.requests[0].resolve([lyricRecord()]); await work;
    assert.equal(f.sent.length, 0);
    if (kind === 'shared') assert.equal(f.g.getLyrics(videoId), 'A new manually shared original line.');
    if (kind === 'draft') {
      assert.equal(f.g.loadDraft(f.g.draftKey(videoId)).text, 'A newer local draft.');
      assert.equal(f.g.loadDraft(f.g.draftKey(videoId)).dirty, true);
    }
  }
});

test('late automatic responses cannot save after session, turn, round, video, actor, ownership, or teardown changes', async () => {
  const changes = [
    f => { f.g.data.sessionId = 'another-session'; },
    f => { f.g.data.turnId++; },
    f => { f.g.data.round++; },
    f => { f.g.data.selectedSong = { ...f.g.data.selectedSong, videoId: 'JGwWNGJdvx8' }; },
    f => { f.g.actor = 1; },
    f => { f.control.available = false; },
    f => { f.g.destroyed = true; },
  ];
  for (const change of changes) {
    const f = lyricsLookup(), work = f.g.searchLyrics(f.fields(), 'auto');
    change(f); f.requests[0].resolve([lyricRecord()]); await work;
    assert.equal(f.sent.length, 0);
  }
});

test('automatic lookup belongs to the host; manual sharing belongs to host or current Spotlight only', async () => {
  for (const actor of [1, 2]) {
    const f = lyricsLookup(actor); f.g.maybeAutoLyrics(); await nextTask();
    assert.equal(f.requests.length, 0, 'participants do not duplicate host automatic requests');
    await f.response([lyricRecord()], 'manual'); f.g.chooseLyrics('101');
    await f.g.useLyricsCandidate();
    assert.equal(f.sent.length, actor === 1 ? 1 : 0);
    if (actor === 1) { assert.equal(f.sent[0].type, 'setLyrics'); assert.equal(f.sent[0].extra.onlyIfEmpty, undefined); }
  }
});

test('a newer manual search cancels an older automatic response before it can publish', async () => {
  const f = lyricsLookup(), first = f.g.searchLyrics(f.fields(), 'auto');
  const second = f.g.searchLyrics({ title: 'Another Original Song', artist: 'Our Players', query: '' }, 'manual');
  assert.equal(f.requests[0].signal.aborted, true);
  f.requests[1].resolve([lyricRecord({ id: '202', title: 'Another Original Song' })]); await second;
  f.requests[0].resolve([lyricRecord()]); await first;
  assert.equal(f.sent.length, 0); assert.equal(f.g.lyricsLookupRecords[0].id, '202');
});

test('results fetched for an earlier turn or round cannot be reused as the current candidate', async () => {
  for (const field of ['turnId', 'round']) {
    const f = lyricsLookup(); await f.response([lyricRecord()], 'manual'); f.g.chooseLyrics('101');
    const next = { ...f.g.data, [field]: f.g.data[field] + 1 };
    f.g.update({ openmic: next });
    assert.equal(f.g.lyricsLookupRecords.length, 0, 'saved lyrics persist, but fetched candidates belong to one displayed context');
    assert.equal(f.g.lyricsLookupPicked, null); await f.g.useLyricsCandidate(); assert.equal(f.sent.length, 0);
  }
});

function presentation(actor = 0) {
  const f = setup(), g = Object.create(f.Game.prototype), nodes = new Map(), classes = new Set(), sent = [], videoWrites = [];
  let mounted = true;
  function node(selector) {
    if (nodes.has(selector)) return nodes.get(selector);
    const attributes = new Map(), localClasses = new Set();
    const entry = { value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, open: false, style: {},
      classList: { toggle: (name, on) => on ? localClasses.add(name) : localClasses.delete(name),
        add: name => localClasses.add(name), remove: name => localClasses.delete(name), contains: name => localClasses.has(name) },
      setAttribute: (key, value) => attributes.set(key, String(value)), getAttribute: key => attributes.get(key) ?? null,
      scrollIntoView() {}, focus() {}, removeAttribute: key => attributes.delete(key) };
    nodes.set(selector, entry); return entry;
  }
  const element = { contains: () => true, addEventListener() {}, removeEventListener() {},
    classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
      add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    querySelector: selector => mounted ? node(selector) : null,
    querySelectorAll: selector => mounted ? selector.split(',').map(part => node(part.trim())) : [],
    get innerHTML() { return ''; }, set innerHTML(_value) { mounted = false; } };
  const dialog = () => ({ open: false, close() { this.open = false; }, showModal() { this.open = true; } });
  const song = { videoId: 'nfWlot6h_JM', title: 'Our Party Song', artist: 'Our Players', tags: [] };
  Object.assign(g, { element, actor, destroyed: false, pending: false, error: '', notice: '', query: '', category: 'for-you',
    focusPreferred: false, videoKey: null, lyricsFont: 24, lastControl: true,
    data: { version: 1, sessionId: 'presentation-session', turnId: 5, round: 1, spotlight: 1,
      roster: [{ playerNum: 1, name: 'Amy', active: true }, { playerNum: 2, name: 'Bob', active: true }],
      phase: 'choice', challengeResult: 'success', teamScore: 2, singingState: 'idle', singingStartedAt: null, duration: 35,
      selectedSong: song, songLibrary: [song], mySongs: {}, songLyrics: { [song.videoId]: originalFixture },
      challenge: { title: 'Our small challenge', situation: 'It is our party.', challenge: 'Say hello.', successRule: 'Say hello.' } },
    previewSong: null, playlistPlayer: null, playlistBusy: false, playlistGeneration: 0,
    lyricsDrafts: {}, lyricsEditVideo: null, lyricsEditSession: null, lyricsEditGeneration: 0,
    lyricsLookupRecords: [], lyricsLookupPicked: null, lyricsLookupGeneration: 0, lyricsLookupAbort: null,
    lyricsLookupBusy: false, lyricsLookupMode: null, lyricsLookupStatus: null, lyricsLookupSong: null,
    lyricsLookupContext: null, lyricsAutoAttemptKey: null, lyricsFindGeneration: 0,
    lyricsEditDialog: dialog(), lyricsFindDialog: dialog(), previewDialog: dialog(), addDialog: dialog(), duetDialog: dialog(),
    playlistDialog: dialog(), lyricsReadDialog: dialog(), canControl: () => true, now: () => 100000,
    send: async (type, extra) => { sent.push({ type, extra }); },
    set: (selector, html) => { node(selector).innerHTML = html; if (selector === '[data-om-stage-video]') videoWrites.push(html); },
  });
  return { ...f, g, nodes, node, classes, sent, videoWrites,
    click(action) {
      const target = node('[data-om-action="' + action + '"]'); target.dataset = { omAction: action };
      const origin = { closest: selector => selector === '[data-om-action]' ? target : null };
      g.handleClick({ target: origin });
    },
    controls: () => node('[data-om-stage-controls]').innerHTML,
    challenge: () => node('[data-om-challenge]').innerHTML,
  };
}

test('side-by-side stage layout moves the existing video and lyrics nodes without replacing their contents', () => {
  const f = setup(), g = Object.create(f.Game.prototype); let contentWrites = 0;
  function treeNode(name) {
    const node = { name, children: [], parentNode: null, attributes: new Map(),
      classList: { add() {} }, setAttribute(key, value) { this.attributes.set(key, value); },
      appendChild(child) {
        if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
        this.children.push(child); child.parentNode = this; return child;
      },
      insertBefore(child, before) {
        if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
        this.children.splice(this.children.indexOf(before), 0, child); child.parentNode = this;
      },
      insertAdjacentHTML() {},
    };
    Object.defineProperty(node, 'innerHTML', { get: () => '', set: () => { contentWrites++; } });
    return node;
  }
  const stage = treeNode('stage'), top = treeNode('top'), video = treeNode('video'), iframe = treeNode('playing iframe');
  const footer = treeNode('footer'), info = treeNode('track info'), lyrics = treeNode('lyrics'), controls = treeNode('controls');
  stage.appendChild(top); stage.appendChild(video); stage.appendChild(footer); video.appendChild(iframe);
  footer.appendChild(info); footer.appendChild(controls); footer.appendChild(lyrics);
  const nodes = new Map([['.om-stage', stage], ['.om-stage-bottom', footer], ['.om-stage-top', top],
    ['[data-om-stage-video]', video], ['[data-om-stage-info]', info], ['[data-om-lyrics-panel]', lyrics]]);
  g.element = { ownerDocument: { createElement: () => treeNode('new wrapper') } }; g.find = selector => nodes.get(selector);
  g.buildStageLayout();
  const layout = stage.children[1], videoColumn = layout.children[0];
  assert.equal(layout.attributes.get('data-om-stage-layout'), '');
  assert.equal(videoColumn.children[0], video); assert.equal(videoColumn.children[1], info);
  assert.equal(layout.children[1], lyrics); assert.equal(video.children[0], iframe);
  assert.equal(stage.children[2], footer); assert.equal(footer.children[0], controls);
  assert.equal(contentWrites, 0, 'moving wrappers must keep the existing player and lyrics content');
});

test('focus toggle stays local for host, Spotlight, and listeners, including offline or pending controls', async () => {
  for (const actor of [0, 1, 2]) {
    const f = presentation(actor); f.g.render();
    const original = JSON.stringify(f.g.data), originalWrites = f.videoWrites.length;
    f.g.pending = true; f.g.canControl = () => false; f.g.renderFocus();
    assert.equal(f.node('[data-om-action="focusToggle"]').disabled, false);
    f.click('focusToggle');
    assert.equal(f.classes.has('om-is-focused'), true);
    assert.equal(f.node('[data-om-action="focusToggle"]').getAttribute('aria-pressed'), 'true');
    f.click('focusToggle'); await nextTask();
    assert.equal(f.classes.has('om-is-focused'), false);
    assert.equal(f.node('[data-om-action="focusToggle"]').getAttribute('aria-pressed'), 'false');
    assert.equal(f.sent.length, 0); assert.equal(JSON.stringify(f.g.data), original);
    assert.equal(f.videoWrites.length, originalWrites);
  }
});

test('focus, font size, shared lyrics, and singing phase updates preserve the mounted player', () => {
  const f = presentation(); f.g.render(); const videoNode = f.node('[data-om-stage-video]'), lyricsNode = f.node('[data-om-lyrics-copy]');
  assert.equal(f.videoWrites.length, 1);
  f.click('focusToggle'); f.click('lyricsLarger');
  assert.equal(f.g.lyricsFont, 26); assert.equal(lyricsNode.style.fontSize, '26px');
  f.g.update({ openmic: { ...f.g.data, phase: 'singing', singingState: 'singing', singingStartedAt: 100000, turnId: 6,
    songLyrics: { nfWlot6h_JM: 'An updated original line for our party.' } } });
  assert.equal(f.node('[data-om-stage-video]'), videoNode); assert.equal(f.node('[data-om-lyrics-copy]'), lyricsNode);
  assert.equal(lyricsNode.textContent, 'An updated original line for our party.'); assert.equal(f.videoWrites.length, 1);
  f.g.update({ openmic: { ...f.g.data, phase: 'finished', singingState: 'finished', turnId: 7 } });
  assert.equal(f.classes.has('om-is-focused'), false); assert.equal(f.videoWrites.length, 1);
  assert.equal(f.g.data.teamScore, 2); assert.equal(f.sent.length, 0);
});

test('focus preserves host judgment and Spotlight singing permissions in both presentations', () => {
  for (const actor of [0, 1, 2]) {
    const f = presentation(actor); f.g.render(); const normalControls = f.controls();
    f.click('focusToggle'); f.g.render(); assert.equal(f.controls(), normalControls);
    assert.equal(normalControls.includes('data-om-action="startSinging"'), actor !== 2);
    assert.equal(normalControls.includes('data-om-action="skip"'), actor !== 2);
    assert.equal(normalControls.includes('data-om-action="duetOpen"'), actor !== 2);
    assert.equal(normalControls.includes('data-om-action="next"'), actor === 0);
    f.g.update({ openmic: { ...f.g.data, phase: 'challenge', challengeResult: null, selectedSong: null, turnId: 8 } });
    assert.equal(f.node('[data-om-action="focusToggle"]').disabled, true); assert.equal(f.classes.has('om-is-focused'), false);
    assert.equal(f.challenge().includes('data-om-action="success"'), actor === 0);
    assert.equal(f.challenge().includes('data-om-action="failed"'), actor === 0);
    f.click('focusToggle'); assert.equal(f.sent.length, 0);
  }
});

test('a real session change remounts its player and teardown cannot revive the focused view', () => {
  const f = presentation(); f.g.render(); f.click('focusToggle');
  assert.equal(f.videoWrites.length, 1);
  f.g.update({ openmic: { ...f.g.data, sessionId: 'new-presentation-session' } });
  assert.equal(f.videoWrites.length, 2, 'a new session starts its own stage player');
  const writes = f.videoWrites.length; f.g.destroy();
  assert.doesNotThrow(() => { f.g.toggleFocus(); f.g.render(); });
  assert.equal(f.g.destroyed, true); assert.equal(f.g.data, null); assert.equal(f.videoWrites.length, writes);
  assert.equal(f.sent.length, 0);
});
