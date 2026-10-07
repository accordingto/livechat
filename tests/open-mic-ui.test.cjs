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

function presentation(actor = 0, extraGlobals = {}) {
  const f = setup(extraGlobals), g = Object.create(f.Game.prototype), nodes = new Map(), classes = new Set(), sent = [], videoWrites = [];
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
    discoverySongs: [], discoveryGeneration: 0, discoveryAbort: null, discoveryBusy: false,
    discoveryStatus: null, discoveryMode: null, discoveryRegion: 'TW', discoveryFetchedAt: null,
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

function discoveredSong(overrides = {}) {
  return { videoId: 'JGwWNGJdvx8', title: 'Our newly discovered song', channelTitle: 'Our Music Channel',
    publishedAt: '2026-10-01T12:00:00.000Z', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', ...overrides };
}

function discovery(actor = 0) {
  const requests = [], control = { available: true };
  const request = (mode, query, options = {}) => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    requests.push({ mode, query, region: options.region, signal: options.signal, resolve, reject }); return promise;
  };
  const api = { search: (query, options) => request('search', query, options),
    popular: options => request('popular', null, options) };
  const f = presentation(actor, { OPEN_MIC_DISCOVERY: api });
  f.g.discoveryStarted = true;
  f.g.canControl = () => control.available;
  return { ...f, requests, control,
    result(songs = [discoveredSong()], region = 'TW') {
      return { songs, fetchedAt: '2026-10-08T10:00:00.000Z', source: 'youtube', region };
    } };
}

test('the newest search or popular request owns the discovery results even when canceled requests resolve late', async () => {
  for (const modes of [['search', 'search'], ['popular', 'search'], ['search', 'popular']]) {
    const f = discovery(), first = f.g.requestDiscovery(modes[0], 'Earlier original song');
    const second = f.g.requestDiscovery(modes[1], 'Latest original song');
    assert.equal(f.requests.length, 2); assert.equal(f.requests[0].signal.aborted, true);
    assert.equal(f.requests[1].region, 'TW');
    f.requests[1].resolve(f.result([discoveredSong({ title: 'Latest original song' })])); await second;
    f.requests[0].resolve(f.result([discoveredSong({ title: 'Earlier original song' })])); await first;
    assert.equal(f.g.discoverySongs.length, 1); assert.equal(f.g.discoverySongs[0].title, 'Latest original song');
    assert.equal(f.g.discoveryBusy, false); assert.equal(f.sent.length, 0);
  }
});

test('session replacement and teardown abort discovery and discard late responses without reviving old results', async () => {
  for (const change of ['session', 'destroy']) {
    const f = discovery(); f.g.render(); const work = f.g.requestDiscovery('search', 'Our song');
    if (change === 'session') f.g.update({ openmic: { ...f.g.data, sessionId: 'new-discovery-session' } });
    else f.g.destroy();
    const writes = f.videoWrites.length;
    assert.equal(f.requests[0].signal.aborted, true);
    f.requests[0].resolve(f.result()); await work;
    assert.equal(f.g.discoverySongs.length, 0); assert.equal(f.sent.length, 0);
    assert.equal(f.videoWrites.length, writes);
    if (change === 'destroy') assert.equal(f.g.data, null);
  }
});

test('host, Spotlight, and listeners search and preview locally even when shared game controls are unavailable', async () => {
  for (const actor of [0, 1, 2]) {
    const f = discovery(actor); f.g.render(); const state = JSON.stringify(f.g.data), writes = f.videoWrites.length;
    f.control.available = false; f.g.pending = true;
    const work = f.g.requestDiscovery('search', 'Our song');
    f.requests[0].resolve(f.result()); await work;
    f.g.previewTrack(f.g.discoverySongs[0]);
    assert.equal(f.g.previewDialog.open, true); assert.equal(f.g.previewSong.videoId, discoveredSong().videoId);
    assert.match(f.node('[data-om-preview-video]').innerHTML, /youtube\.com\/embed\/JGwWNGJdvx8/);
    assert.doesNotMatch(f.node('[data-om-preview-video]').innerHTML, /autoplay=1/);
    assert.equal(f.sent.length, 0); assert.equal(JSON.stringify(f.g.data), state); assert.equal(f.videoWrites.length, writes);
    assert.equal(f.g.data.selectedSong.videoId, 'nfWlot6h_JM', 'previewing a result never selects it for the turn');
  }
});

test('discovery addition saves only the chosen title and canonical video URL without selecting or scoring it', async () => {
  for (const actor of [0, 1, 2]) {
    const f = discovery(actor); f.g.render(); const before = JSON.stringify(f.g.data), writes = f.videoWrites.length;
    const song = discoveredSong({ title: 'Our complete YouTube title', channelTitle: 'Our Channel', ownerPlayerNum: 99,
      artist: 'Untrusted guessed artist', url: 'javascript:alert(1)' });
    f.g.discoverySongs = [song]; await f.g.addDiscoverySong(song.videoId);
    assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'addSong');
    assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0].extra)), { title: song.title,
      url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8' });
    assert.equal(f.g.category, 'my-songs'); assert.equal(JSON.stringify(f.g.data), before);
    assert.equal(f.videoWrites.length, writes);
  }
});

test('late discovery-add completion cannot switch the new session, owner, round, actor, or newer results into My Songs', async () => {
  const changes = [
    f => { f.g.data.sessionId = 'another-discovery-session'; },
    f => { f.g.data.spotlight = 2; },
    f => { f.g.data.round++; },
    f => { f.g.actor = 1; },
    f => { f.g.discoveryGeneration++; },
    f => { f.g.destroy(); },
  ];
  for (const change of changes) {
    const f = discovery(); f.g.discoverySongs = [discoveredSong()]; f.g.category = 'english-pop';
    let complete; f.g.send = (type, extra) => { f.sent.push({ type, extra }); return new Promise(resolve => { complete = resolve; }); };
    const work = f.g.addDiscoverySong(discoveredSong().videoId); assert.equal(f.sent.length, 1);
    change(f); complete(); await work;
    assert.equal(f.g.category, 'english-pop'); assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].type, 'addSong', 'the old completion must not follow up with selectSong');
  }
});

test('discovery cannot add a missing result, invalid video ID, or song while game writes are unavailable', async () => {
  for (const blocked of ['offline', 'pending', 'missing', 'invalid']) {
    const f = discovery(2); f.g.discoverySongs = [discoveredSong()];
    if (blocked === 'offline') f.control.available = false;
    if (blocked === 'pending') f.g.pending = true;
    if (blocked === 'missing') f.g.discoverySongs = [];
    if (blocked === 'invalid') f.g.discoverySongs = [discoveredSong({ videoId: '\" onload=\"bad' })];
    await f.g.addDiscoverySong(blocked === 'invalid' ? '\" onload=\"bad' : discoveredSong().videoId);
    assert.equal(f.sent.length, 0); assert.equal(f.g.category, 'for-you');
  }
});

test('discovery metadata is displayed as text and untrusted URLs cannot enter a preview iframe', async () => {
  const f = discovery(), work = f.g.requestDiscovery('search', 'Our song');
  const song = discoveredSong({ title: '<img src=x onerror="alert(1)">', channelTitle: '<script>alert(2)</script>',
    thumbnail: 'javascript:alert(3)', url: 'https://evil.example/iframe', ownerPlayerNum: 0 });
  f.requests[0].resolve(f.result([song])); await work; f.g.renderDiscovery();
  const results = f.node('[data-om-discovery-results]').innerHTML;
  assert.doesNotMatch(results, /<script\b|<img\b[^>]*\bonerror\s*=|(?:src|href)=["']javascript:/i);
  assert.match(results, /&lt;img/); assert.match(results, /&lt;script/);
  f.g.previewTrack(song); const preview = f.node('[data-om-preview-video]').innerHTML;
  assert.match(preview, /https:\/\/www\.youtube\.com\/embed\/JGwWNGJdvx8/);
  assert.doesNotMatch(preview, /evil\.example|javascript:|<script\b/i);
  const previous = preview; f.g.previewTrack(discoveredSong({ videoId: '\" onload=\"bad' }));
  assert.equal(f.node('[data-om-preview-video]').innerHTML, previous);
  assert.equal(f.sent.length, 0);
});

test('empty discovery and service failures explain a useful in-game retry or manual-add fallback without exposing setup secrets', async () => {
  const cases = [null, 'discovery_setup_needed', 'discovery_rate_limit', 'discovery_unavailable', 'discovery_invalid_query', 'discovery_invalid_region'];
  for (const code of cases) {
    const f = discovery(); f.g.render(); const work = f.g.requestDiscovery('search', 'Our song');
    if (code) f.requests[0].reject(Object.assign(new Error('sensitive server setup details'), { code, retryAfter: 23 }));
    else f.requests[0].resolve(f.result([]));
    await work; f.g.renderDiscovery();
    const text = Array.from(f.nodes.values()).map(node => node.textContent + ' ' + node.innerHTML).join(' ');
    assert.equal(f.g.discoveryBusy, false); assert.equal(f.g.discoverySongs.length, 0); assert.equal(f.sent.length, 0);
    assert.doesNotMatch(text, /sensitive server setup details|discovery_setup_needed|API[_ -]?KEY|AIza/);
    assert.match(text, /song|search|again|try|playlist|link|歌|搜尋|再試|網址|播放清單/i);
    assert.equal(f.node('[data-om-action="addOpen"]').disabled, false, 'manual in-game song addition remains available');
  }
});

test('changing the search text or region invalidates in-flight discovery without changing the game or current player', async () => {
  for (const selector of ['[data-om-discovery-query]', '[data-om-discovery-region]']) {
    const f = discovery(); f.g.render(); const original = JSON.stringify(f.g.data), writes = f.videoWrites.length;
    const work = f.g.requestDiscovery('search', 'Earlier original song');
    const input = { value: selector.includes('region') ? 'US' : 'Our edited search', matches: value => value === selector };
    f.g.handleInput({ target: input });
    assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.g.discoverySongs.length, 0);
    f.requests[0].resolve(f.result()); await work;
    assert.equal(f.g.discoverySongs.length, 0); assert.equal(f.g.discoveryBusy, false);
    assert.equal(JSON.stringify(f.g.data), original); assert.equal(f.videoWrites.length, writes); assert.equal(f.sent.length, 0);
    if (selector.includes('region')) assert.equal(f.g.discoveryRegion, 'US');
    else assert.equal(f.g.discoveryQuery, 'Our edited search');
  }
});

test('public popular music loads once per session and room updates keep the local results and selected player intact', async () => {
  const f = discovery(2); f.g.discoveryStarted = false; f.g.render();
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].mode, 'popular');
  f.requests[0].resolve(f.result()); await nextTask(); const song = f.g.discoverySongs[0], writes = f.videoWrites.length;
  f.g.render(); f.g.update({ openmic: { ...f.g.data, revision: 20, mySongs: { 2: ['nfWlot6h_JM'] } } });
  assert.equal(f.requests.length, 1); assert.equal(f.g.discoverySongs[0], song); assert.equal(f.videoWrites.length, writes);
  assert.equal(f.g.data.teamScore, 2); assert.equal(f.sent.length, 0);
  f.g.update({ openmic: { ...f.g.data, sessionId: 'another-popular-session' } });
  assert.equal(f.requests.length, 2); assert.equal(f.requests[1].mode, 'popular');
  f.requests[1].resolve(f.result([discoveredSong({ title: 'A new public song' })])); await nextTask();
  assert.equal(f.g.discoverySongs[0].title, 'A new public song');
});

test('discovery rejects empty, oversized searches and unsupported regions before making a request', async () => {
  for (const input of ['', ' '.repeat(4), 'x'.repeat(101), 'unsupported-region']) {
    const f = discovery(); if (input === 'unsupported-region') f.g.discoveryRegion = 'XX';
    await f.g.requestDiscovery('search', input === 'unsupported-region' ? 'Our song' : input);
    assert.equal(f.requests.length, 0); assert.equal(f.g.discoveryBusy, false); assert.equal(f.sent.length, 0);
    assert.equal(f.g.discoverySongs.length, 0);
    assert.match(f.node('[data-om-discovery-status]').textContent, /song|artist|Taiwan|歌|台灣/);
  }
});

test('a queued native preview close cannot clear a reopened preview and remains safe after teardown', () => {
  const f = setup(), queued = [], nodes = new Map(); let mounted = true;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', value: '', hidden: false, disabled: false,
      classList: { toggle() {}, add() {} }, setAttribute() {}, removeAttribute() {} });
    return nodes.get(selector);
  };
  const dialog = () => {
    const handlers = new Map();
    return { open: false, addEventListener: (type, callback) => handlers.set(type, callback),
      querySelector: () => node('[data-om-preview-video]'), showModal() { this.open = true; },
      close() { this.open = false; const callback = handlers.get('close'); if (callback) queued.push(callback); } };
  };
  const element = { addEventListener() {}, removeEventListener() {}, querySelector: selector => mounted ? node(selector) : null,
    get innerHTML() { return ''; }, set innerHTML(_value) { mounted = false; } };
  class PreviewGame extends f.Game {
    build() {
      this.previewDialog = dialog(); this.addDialog = dialog(); this.duetDialog = dialog(); this.playlistDialog = dialog();
      this.lyricsEditDialog = dialog(); this.lyricsReadDialog = dialog(); this.lyricsFindDialog = dialog();
    }
  }
  const g = new PreviewGame(element, {});
  g.previewTrack(discoveredSong()); g.previewDialog.close();
  g.previewTrack(discoveredSong({ videoId: 'nfWlot6h_JM', title: 'Our next preview' }));
  const current = node('[data-om-preview-video]').innerHTML;
  queued.shift()();
  assert.equal(g.previewDialog.open, true); assert.equal(g.previewSong.videoId, 'nfWlot6h_JM');
  assert.equal(node('[data-om-preview-video]').innerHTML, current);
  g.destroy(); assert.doesNotThrow(() => queued.forEach(callback => callback())); assert.equal(f.timers.size, 0);
});

test('service query and region errors provide their specific correction while keeping the entered query', async () => {
  for (const code of ['discovery_invalid_query', 'discovery_invalid_region']) {
    const f = discovery(), input = f.node('[data-om-discovery-query]'); input.value = 'Our original query';
    const work = f.g.requestDiscovery('search', input.value);
    f.requests[0].reject(Object.assign(new Error('private provider details'), { code })); await work;
    assert.equal(f.node('[data-om-discovery-status]').textContent,
      f.context.OPEN_MIC_UI.t(code));
    assert.equal(input.value, 'Our original query'); assert.equal(f.g.discoveryBusy, false); assert.equal(f.sent.length, 0);
  }
});

test('an unavailable discovery client keeps the built-in playlist, manual song form, and live stage usable', async () => {
  const f = presentation(2); f.g.discoveryStarted = true; f.g.render(); const original = JSON.stringify(f.g.data), writes = f.videoWrites.length;
  await f.g.requestDiscovery('search', 'Our original song');
  assert.equal(f.node('[data-om-discovery-status]').textContent, f.context.OPEN_MIC_UI.t('discovery_setup_needed'));
  assert.match(f.node('[data-om-songs]').innerHTML, /Our Party Song/);
  assert.equal(f.node('[data-om-action="addOpen"]').disabled, false);
  f.click('addOpen'); assert.equal(f.g.addDialog.open, true);
  assert.equal(JSON.stringify(f.g.data), original); assert.equal(f.videoWrites.length, writes); assert.equal(f.sent.length, 0);
});

function directDiscovery(actor = 0) {
  const f = discovery(actor), song = discoveredSong(); let complete, reject, scrolls = 0;
  f.g.discoverySongs = [song]; f.g.category = 'k-pop'; f.g.render();
  const original = JSON.parse(JSON.stringify(f.g.data));
  f.node('.om-stage').scrollIntoView = () => { scrolls++; };
  f.g.send = (type, extra) => { f.sent.push({ type, extra }); return new Promise((resolve, fail) => { complete = resolve; reject = fail; }); };
  return { ...f, song, original, scrolls: () => scrolls,
    complete: value => complete(value), reject: error => reject(error),
    selected(overrides = {}) {
      return { ...original, turnId: original.turnId + 1, selectedSong: { videoId: song.videoId, title: song.title, artist: '', tags: [] },
        songLibrary: [...original.songLibrary, { videoId: song.videoId, title: song.title, artist: '', tags: [] }], ...overrides };
    } };
}

test('direct discovery play sends one select command without saving a favorite or starting the singing timer', async () => {
  for (const actor of [0, 1]) {
    const f = directDiscovery(actor), work = f.g.selectDiscoverySong(f.song.videoId);
    assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'selectSong');
    assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0].extra)), { videoId: f.song.videoId, title: f.song.title });
    f.g.update({ openmic: f.selected() });
    assert.equal(f.videoWrites.length, 1, 'the new player waits for the command acknowledgement');
    f.complete(); await work;
    assert.equal(f.sent.length, 1); assert.equal(f.g.category, 'k-pop');
    assert.deepEqual(JSON.parse(JSON.stringify(f.g.data.mySongs)), {});
    assert.equal(f.g.data.phase, 'choice'); assert.equal(f.g.data.singingState, 'idle');
    assert.equal(f.g.data.singingStartedAt, null); assert.equal(f.g.data.teamScore, f.original.teamScore);
    assert.equal(f.videoWrites.length, 2); assert.match(f.videoWrites[1], /autoplay=1/);
    assert.equal(f.scrolls(), 1); assert.equal(f.g.stagePlayIntent, null);
  }
});

test('a busy host keeps its play intent when the selected view arrives before acknowledgement', async () => {
  const f = directDiscovery(), work = f.g.selectDiscoverySong(f.song.videoId);
  f.control.available = false;
  f.g.update({ openmic: f.selected() });
  assert.equal(f.g.pending, true); assert.ok(f.g.stagePlayIntent);
  assert.equal(f.videoWrites.length, 1); assert.equal(f.scrolls(), 0);
  f.control.available = true; f.complete(); await work;
  assert.equal(f.videoWrites.length, 2); assert.match(f.videoWrites[1], /autoplay=1/);
  assert.equal(f.scrolls(), 1); assert.equal(f.g.stagePlayIntent, null);
});

test('an acknowledgement arriving before the selected view waits, then autoplays only on the originating device', async () => {
  const f = directDiscovery(1), work = f.g.selectDiscoverySong(f.song.videoId);
  f.complete(); await work;
  assert.equal(f.videoWrites.length, 1); assert.equal(f.scrolls(), 0); assert.equal(f.g.stagePlayIntent.confirmed, true);
  f.g.update({ openmic: f.selected() });
  assert.equal(f.videoWrites.length, 2); assert.match(f.videoWrites[1], /autoplay=1/); assert.equal(f.scrolls(), 1);
  f.g.render(); f.g.renderFocus(); f.g.lyricsFont = 32; f.g.renderLyrics();
  f.g.update({ openmic: { ...f.g.data, songLyrics: { [f.song.videoId]: originalFixture }, mySongs: { 1: [f.song.videoId] } } });
  f.g.update({ openmic: { ...f.g.data, phase: 'singing', singingState: 'singing', singingStartedAt: 100000, turnId: f.g.data.turnId + 1 } });
  assert.equal(f.videoWrites.length, 2, 'later lyrics, font, favorite, and singing updates keep the playing iframe');
  assert.equal(f.scrolls(), 1);
  const remote = discovery(2); remote.g.render(); remote.g.update({ openmic: f.selected() });
  assert.equal(remote.videoWrites.length, 2); assert.doesNotMatch(remote.videoWrites[1], /autoplay=1/);
  remote.g.previewTrack(f.song); assert.doesNotMatch(remote.node('[data-om-preview-video]').innerHTML, /autoplay=1/);
  assert.equal(remote.sent.length, 0);
});

test('failed or stale direct-play acknowledgements never autoplay or scroll even if a matching view appeared', async () => {
  for (const failed of ['response', 'reject']) {
    const f = directDiscovery(), work = f.g.selectDiscoverySong(f.song.videoId);
    f.g.update({ openmic: f.selected() }); assert.equal(f.videoWrites.length, 1);
    if (failed === 'response') f.complete({ error: 'stale_turn' }); else f.reject(new Error('stale_turn'));
    await work;
    assert.equal(f.sent.length, 1); assert.equal(f.videoWrites.length, 2);
    assert.doesNotMatch(f.videoWrites.join(' '), /autoplay=1/); assert.equal(f.scrolls(), 0); assert.equal(f.g.stagePlayIntent, null);
    assert.equal(f.g.category, 'k-pop');
  }
});

test('late direct-play work cannot autoplay or scroll after its session, player, turn, results, connection, or lifetime changes', async () => {
  const changes = [
    f => f.g.update({ openmic: f.selected({ sessionId: 'next-session' }) }),
    f => f.g.update({ openmic: f.selected({ round: f.original.round + 1 }) }),
    f => { f.g.actor = 1; f.g.update({ openmic: f.selected() }); },
    f => f.g.update({ openmic: f.selected({ spotlight: 2 }) }),
    f => f.g.update({ openmic: f.selected({ turnId: f.original.turnId + 2 }) }),
    f => f.g.update({ openmic: f.selected({ selectedSong: f.original.selectedSong }) }),
    f => { f.g.cancelDiscovery(); f.g.update({ openmic: f.selected() }); },
    f => f.g.update({ openmic: f.selected({ phase: 'singing', singingState: 'singing' }) }),
    f => f.g.update({ openmic: f.selected({ roster: f.original.roster.map(p => ({ ...p, active: false })) }) }),
    f => { f.g.now = () => 115001; f.g.update({ openmic: f.selected() }); },
    f => { f.control.available = false; f.g.update({ openmic: f.selected() }); },
    f => f.g.destroy(),
  ];
  for (const change of changes) {
    const f = directDiscovery(), work = f.g.selectDiscoverySong(f.song.videoId);
    change(f); const currentCategory = f.g.category; f.complete(); await work;
    assert.equal(f.sent.length, 1); assert.equal(f.scrolls(), 0); assert.doesNotMatch(f.videoWrites.join(' '), /autoplay=1/);
    assert.equal(f.g.stagePlayIntent, null); assert.equal(f.g.category, currentCategory);
  }
});

test('direct stage play enforces the current Spotlight, challenge result, choice phase, and connection before sending', async () => {
  const changes = [
    f => { f.g.actor = 2; }, f => { f.g.actor = 1; f.g.data.roster[0].active = false; },
    f => { f.g.data.challengeResult = null; }, f => { f.g.data.phase = 'challenge'; },
    f => { f.g.data.phase = 'singing'; }, f => { f.g.data.phase = 'finished'; },
    f => { f.control.available = false; }, f => { f.g.pending = true; },
    f => { f.g.discoverySongs = []; }, f => { f.g.discoverySongs[0].title = '   '; },
    f => { f.g.discoverySongs[0].title = '\u0000\n'; }, f => { f.g.data.selectedSong = f.song; },
    f => { f.g.data.turnId = Number.MAX_SAFE_INTEGER; },
  ];
  for (const change of changes) {
    const f = directDiscovery(); change(f); await f.g.selectDiscoverySong(f.song.videoId);
    assert.equal(f.sent.length, 0); assert.equal(f.scrolls(), 0); assert.doesNotMatch(f.videoWrites.join(' '), /autoplay=1/);
  }
});

test('discovery results show a primary direct-play action, keep personal addition optional, and mark the selected video', () => {
  for (const actor of [0, 1, 2]) {
    const f = directDiscovery(actor); f.g.renderDiscovery();
    const html = f.node('[data-om-discovery-results]').innerHTML;
    const play = html.match(/<button\b[^>]*data-om-action="discoverySelect"[^>]*>[\s\S]*?<\/button>/)[0];
    const add = html.match(/<button\b[^>]*data-om-action="discoveryAdd"[^>]*>[\s\S]*?<\/button>/)[0];
    assert.match(play, /om-primary/); assert.match(play, /Play on Stage/); assert.equal(/ disabled/.test(play), actor === 2);
    assert.doesNotMatch(add, /om-primary/); assert.doesNotMatch(add, / disabled/);
    f.g.data.selectedSong = f.song; f.g.renderDiscovery();
    const selected = f.node('[data-om-discovery-results]').innerHTML;
    assert.match(selected, /om-selected/); assert.match(selected, /data-om-action="discoverySelect"[^>]* disabled>Selected/);
  }
});

test('the direct-play click uses only a safe video ID and bounded plain title, and ignores a repeated pending click', async () => {
  const f = directDiscovery(), unsafe = '<img onerror="alert(1)">\u0000\n' + 'x'.repeat(200);
  f.g.discoverySongs[0] = discoveredSong({ title: unsafe, channelTitle: 'Do not send this as artist', url: 'javascript:alert(2)' });
  const target = { dataset: { omAction: 'discoverySelect', video: f.song.videoId }, disabled: false };
  const event = { target: { closest: selector => selector === '[data-om-action]' ? target : null } };
  f.g.handleClick(event); f.g.handleClick(event);
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'selectSong');
  assert.deepEqual(Object.keys(f.sent[0].extra).sort(), ['title', 'videoId']);
  assert.equal(f.sent[0].extra.title.length, 140); assert.doesNotMatch(f.sent[0].extra.title, /[\u0000-\u001f\u007f]/);
  f.g.update({ openmic: f.selected({ selectedSong: { videoId: f.song.videoId, title: f.sent[0].extra.title } }) });
  f.complete(); await nextTask();
  assert.doesNotMatch(f.videoWrites[1], /<img|javascript:/); assert.match(f.videoWrites[1], /&lt;img/);
  const bad = directDiscovery(); bad.g.discoverySongs = [discoveredSong({ videoId: '\" onload=\"bad' })];
  await bad.g.selectDiscoverySong('\" onload=\"bad'); assert.equal(bad.sent.length, 0);
  bad.g.discoverySongs = [discoveredSong({ videoId: f.song.videoId + '\n' })];
  await bad.g.selectDiscoverySong(f.song.videoId + '\n'); assert.equal(bad.sent.length, 0);
});

test('an acknowledged local request that becomes offline before its matching view remains a passive player', async () => {
  for (const otherActionPending of [false, true]) {
    const f = directDiscovery(), work = f.g.selectDiscoverySong(f.song.videoId);
    f.complete(); await work; assert.equal(f.g.stagePlayIntent.confirmed, true);
    f.control.available = false; f.g.pending = otherActionPending;
    f.g.update({ openmic: f.selected() });
    assert.equal(f.videoWrites.length, 2); assert.doesNotMatch(f.videoWrites[1], /autoplay=1/);
    assert.equal(f.g.stagePlayIntent, null); assert.equal(f.scrolls(), 0);
    f.control.available = true; f.g.pending = false; f.g.render(); assert.equal(f.videoWrites.length, 2); assert.equal(f.scrolls(), 0);
  }
});

test('ordinary library selection keeps its original command and never acquires discovery autoplay', async () => {
  const f = directDiscovery(), target = { dataset: { omAction: 'selectSong', video: f.song.videoId }, disabled: false };
  f.g.handleClick({ target: { closest: selector => selector === '[data-om-action]' ? target : null } });
  assert.equal(f.sent.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0].extra)), { videoId: f.song.videoId });
  f.g.update({ openmic: f.selected() });
  assert.equal(f.videoWrites.length, 2); assert.doesNotMatch(f.videoWrites[1], /autoplay=1/);
  f.complete(); await nextTask(); assert.equal(f.videoWrites.length, 2); assert.equal(f.scrolls(), 0);
});
