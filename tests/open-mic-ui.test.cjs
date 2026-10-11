const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../open-mic-ui.js'), 'utf8');

function setup(extra = {}) {
  const timers = new Map(); let next = 0;
  const context = vm.createContext({ URL, AbortController,
    setInterval(fn) { const id = ++next; timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); }, ...extra });
  vm.runInContext(source, context);
  return { Game: context.OPEN_MIC_UI.Game, context, timers };
}
function classes() {
  const values = new Set();
  return { add(...names) { names.forEach(name => values.add(name)); }, remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); }, toggle(name, force) { const enabled = force == null ? !values.has(name) : !!force;
      if (enabled) values.add(name); else values.delete(name); return enabled; } };
}
function node(selector = '') {
  const result = { innerHTML: '', textContent: '', value: '', open: false, hidden: false, disabled: false, placeholder: '', dataset: {},
    classList: classes(), attributes: {}, style: {},
    setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'open') this.open = true;
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value); },
    getAttribute(key) { return this.attributes[key] ?? null; }, hasAttribute(key) { return Object.hasOwn(this.attributes, key); },
    removeAttribute(key) { delete this.attributes[key]; if (key === 'open') this.open = false; },
    matches(query) { return query === selector || query === 'details' && /chooser|details|alternatives/.test(selector); },
    closest(query) { return this.matches(query) ? this : null; },
    showModal() { this.open = true; }, close() { this.open = false; }, scrollIntoView() {}, focus() {} };
  const attribute = selector.match(/^\[([a-z0-9-]+)\]$/);
  if (attribute) result.setAttribute(attribute[1], '');
  return result;
}
function state(extra = {}) {
  const song = { videoId: 'nfWlot6h_JM', title: 'A music memory', artist: 'Our group', tags: ['for-you'] };
  return { version: 1, sessionId: 'text-session', turnId: 2, round: 1, spotlight: 1, phase: 'choice',
    challengeResult: 'success', singingState: 'idle', duration: 35, teamScore: 2,
    roster: [{ playerNum: 1, name: 'One', active: true }, { playerNum: 2, name: 'Two', active: true }],
    challenge: { id: 'one', title: { en: 'A challenge' }, situation: 'Talk together', challenge: 'Say hello', successRule: 'Keep talking' },
    songLibrary: [song, { videoId: 'omtxt000001', title: 'Original tune', artist: 'Your own creation', tags: ['for-you', 'original'] }],
    selectedSong: song, mySongs: {}, songLyrics: { nfWlot6h_JM: 'Retired copyrighted content must never reach the DOM.' }, ...extra };
}
function fixture(extra = {}, globals = {}) {
  const f = setup(globals), nodes = new Map(), listeners = new Map(), sent = [];
  const element = { innerHTML: '', classList: classes(), dataset: {}, attributes: {},
    setAttribute(key, value) { this.attributes[key] = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value); },
    getAttribute(key) { return this.attributes[key] ?? null; }, removeAttribute(key) { delete this.attributes[key]; },
    contains: () => true, querySelector(selector) {
      const key = ['.om-browser', '[data-om-chooser]', '[data-om-library-details]'].includes(selector) ? '[data-om-chooser]' : selector;
      if (!nodes.has(key)) {
        const value = node(key);
        if (key === '[data-om-chooser]') { value.setAttribute('data-om-library-details', ''); value.open = /<details[^>]*data-om-chooser[^>]*\sopen(?:[\s>])/.test(this.innerHTML); }
        nodes.set(key, value);
      }
      return nodes.get(key);
    },
    addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); } };
  const g = new f.Game(element, { actor: extra.actor || 0, canControl: () => true,
    send: async (type, payload) => { sent.push({ type, payload }); return {}; } });
  g.discoveryStarted = true; g.data = state(); Object.assign(g, extra);
  return { ...f, g, element, nodes, sent, listeners,
    html(selector) { return element.querySelector(selector).innerHTML; } };
}
function click(g, action, extra = {}) {
  const target = { disabled: false, dataset: { omAction: action, ...extra } };
  g.handleClick({ target: { closest(selector) { return selector === '[data-om-action]' ? target : null; } } });
}
function submitted(title, artist = '') {
  return { target: { elements: { title: { value: title }, artist: { value: artist } }, resetCount: 0,
    matches(selector) { return selector === '[data-om-add-form]'; }, reset() { this.resetCount++; } }, preventDefault() {} };
}

 test('UI source and constructed DOM contain no player, preview, lyrics or playlist implementation', () => {
  assert.doesNotMatch(source, /OPEN_MIC_(?:LYRICS|GENIUS|YOUTUBE)|<iframe|<img|youtube(?:-nocookie)?\.com\/embed|i\.ytimg|stagePlayIntent|srcdoc|\.playVideo\(/);
  const f = fixture();
  assert.doesNotMatch(f.element.innerHTML, /iframe|<img|data-om-(?:lyrics|playlist|preview)|focusToggle/);
  for (const type of ['click', 'input', 'submit']) assert.ok(f.listeners.has(type)); assert.equal(f.timers.size, 1);
  f.g.destroy(); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0);
});

test('stage displays only metadata and original activity guidance while ignoring stored legacy lyrics', () => {
  const f = fixture(); f.g.renderStage();
  const html = f.html('[data-om-stage-info]');
  assert.match(html, /A music memory/); assert.match(html, /Music memory/); assert.match(html, /Original improvisation/); assert.match(html, /Rhythm relay/);
  assert.doesNotMatch(html, /Retired copyrighted|iframe|<img|youtube/);
  f.g.data.selectedSong = { videoId: 'omtxt000002', title: 'Rhythm relay' }; f.g.renderStage();
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Rhythm relay/);
});

test('legacy song titles and artists are escaped and cannot introduce media elements', () => {
  const f = fixture(); f.g.data.selectedSong.title = '<iframe src="https://evil.test">'; f.g.data.selectedSong.artist = '<img src=x onerror=alert(1)>';
  f.g.renderStage(); f.g.renderSongs();
  assert.match(f.html('[data-om-stage-info]'), /&lt;iframe/); assert.match(f.html('[data-om-songs]'), /&lt;img/);
  assert.doesNotMatch(f.html('[data-om-songs]'), /<iframe|<img|evil\.test"/);
});

test('song list keeps favorites and selection beside plain titles without loading artwork', () => {
  const f = fixture(); f.g.data.mySongs = { 1: ['nfWlot6h_JM'] }; f.g.renderSongs();
  const html = f.html('[data-om-songs]');
  assert.match(html, /data-om-action="toggleFavorite"/); assert.match(html, /Remove from My Songs/);
  assert.match(html, /data-om-action="selectSong"/); assert.doesNotMatch(html, /<img|<iframe|Preview|autoplay|i\.ytimg/);
  f.g.category = 'my-songs'; f.g.renderSongs(); assert.doesNotMatch(f.html('[data-om-songs]'), /Original tune/);
});

test('source links are explicit canonical navigation and never link synthetic text IDs or supplied URLs', () => {
  const f = fixture(); const link = f.g.sourceLink({ videoId: 'nfWlot6h_JM', url: 'javascript:alert(1)' });
  assert.match(link, /href="https:\/\/www\.youtube\.com\/watch\?v=nfWlot6h_JM"/);
  assert.match(link, /target="_blank" rel="noopener noreferrer"/); assert.doesNotMatch(link, /autoplay|javascript/);
  assert.equal(f.g.sourceLink({ videoId: 'omtxt000001' }), ''); assert.equal(f.g.sourceLink({ videoId: 'bad"id' }), '');
});

test('change and remove stay in the original action row in choice, singing and finished', () => {
  const f = fixture();
  for (const phase of ['choice', 'singing', 'finished']) {
    f.g.data.phase = phase; f.g.data.singingState = phase === 'singing' ? 'singing' : phase === 'finished' ? 'finished' : 'idle';
    f.g.renderStage(); const controls = f.html('[data-om-stage-controls]');
    assert.match(controls, /<div class="om-actions">.*data-om-action="changeSong".*data-om-action="clearSong".*data-om-action="next"/s);
    if (phase === 'finished') assert.doesNotMatch(controls, /data-om-action="(?:startSinging|finishSinging|skip)"/);
  }
});

test('stage controls preserve host and Spotlight authority and keep listeners read only', () => {
  const f = fixture({ actor: 2 }); f.g.renderStage();
  assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="(?:startSinging|changeSong|clearSong|next)"/);
  f.g.actor = 1; f.g.renderStage(); assert.match(f.html('[data-om-stage-controls]'), /startSinging/); assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="next"/);
  f.g.actor = 0; f.g.data.phase = 'challenge'; f.g.data.challengeResult = null; f.g.renderStage();
  assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action/);
});

test('direct discovery selection sends one selection without saving a favorite or starting a timer', async () => {
  const f = fixture(); f.g.discoverySongs = [{ videoId: 'JGwWNGJdvx8', title: 'A new title', channelTitle: 'Channel' }];
  await f.g.selectDiscoverySong('JGwWNGJdvx8');
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'selectSong'); assert.equal(f.sent[0].payload.videoId, 'JGwWNGJdvx8');
  assert.doesNotMatch(JSON.stringify(f.sent), /autoplay|addSong|startSinging|lyrics/);
});

test('library selection uses the same text-only command for original cards', async () => {
  const f = fixture(); await f.g.selectStageSong(f.g.library().find(song => song.videoId === 'omtxt000001'));
  assert.equal(f.sent[0].type, 'selectSong'); assert.equal(f.sent[0].payload.videoId, 'omtxt000001');
  assert.deepEqual(Object.keys(f.sent[0].payload).sort(), ['title', 'videoId']);
});

test('selection rejects offline, pending, inactive, challenge and other player attempts', async () => {
  for (const override of [g => { g.canControl = () => false; }, g => { g.pending = true; }, g => { g.actor = 1; g.data.roster[0].active = false; }, g => { g.data.phase = 'challenge'; }, g => { g.actor = 2; }]) {
    const f = fixture(); override(f.g); await f.g.selectStageSong({ videoId: 'JGwWNGJdvx8', title: 'Next title' }); assert.equal(f.sent.length, 0);
    await f.g.clearStageSong(); assert.equal(f.sent.length, 0);
  }
});

test('pending selection acknowledgements never play media or alter the new session UI', async () => {
  const f = fixture(); let finish;
  f.g.send = (type, payload) => { f.sent.push({ type, payload }); return new Promise(resolve => { finish = resolve; }); };
  const selecting = f.g.selectStageSong({ videoId: 'JGwWNGJdvx8', title: 'Next title' });
  f.g.data = state({ sessionId: 'new-session' }); finish({}); await selecting;
  assert.equal(f.sent.length, 1); assert.equal(f.g.data.sessionId, 'new-session');
  assert.doesNotMatch(f.element.innerHTML + f.html('[data-om-stage-info]'), /<iframe|<img|autoplay/);
});

test('change only opens the browser and remove sends one clear command', async () => {
  const f = fixture(); let scrolled = 0, focused = 0;
  f.element.querySelector('.om-browser').scrollIntoView = () => scrolled++;
  f.element.querySelector('[data-om-search]').focus = () => focused++;
  f.g.changeStageSong(); assert.equal(scrolled, 1); assert.equal(focused, 1); assert.equal(f.sent.length, 0);
  await f.g.clearStageSong(); assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'clearSong');
});

test('removed action names cannot invoke dynamic methods or send retired room commands', () => {
  const f = fixture(); let shown = 0; f.g.show = () => shown++;
  for (const action of ['preview', 'discoveryPreview', 'playlistOpen', 'playlistAdd', 'lyricsEdit', 'lyricsRead', 'lyricsFind', 'lyricsVideoFind', 'geniusChoose', 'setLyrics', 'unexpectedCommand']) click(f.g, action);
  assert.equal(shown, 0); assert.equal(f.sent.length, 0);
});

test('text-only manual addition sends only title and optional artist', async () => {
  const f = fixture(); const event = submitted('  My own title  ', '  My own artist  ');
  await f.g.handleSubmit(event);
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0].type, 'addSong');
  assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0].payload)), { title: 'My own title', artist: 'My own artist' });
  assert.equal(event.target.resetCount, 1); assert.equal(f.g.category, 'my-songs');
});

test('text-only manual addition rejects empty, oversized or control-character fields', async () => {
  for (const [title, artist] of [['', ''], ['A'.repeat(141), ''], ['Good', 'B'.repeat(141)], ['Bad\u0001title', ''], ['Good', 'Bad\u0002artist']]) {
    const f = fixture(); await f.g.handleSubmit(submitted(title, artist)); assert.equal(f.sent.length, 0);
    assert.match(f.element.querySelector('[data-om-form-error]').textContent, /title|artist/i);
  }
});

test('late manual-add completions preserve a new session, round, actor or owner', async () => {
  for (const change of [g => { g.data.sessionId = 'new'; }, g => { g.data.round++; }, g => { g.actor = 2; }, g => { g.data.spotlight = 2; }]) {
    const f = fixture(); let complete; f.g.action = () => new Promise(resolve => { complete = resolve; });
    const event = submitted('A memory'); const saving = f.g.handleSubmit(event); change(f.g); complete(true); await saving;
    assert.equal(event.target.resetCount, 0); assert.equal(f.g.category, 'for-you');
  }
});

test('local discovery remains usable offline with escaped metadata and no artwork or preview', async () => {
  const api = { search: async () => ({ songs: [{ videoId: 'JGwWNGJdvx8', title: '<img src=x>', channelTitle: '<iframe>', url: 'https://evil.test' }] }) };
  const f = fixture({ canControl: () => false }, { OPEN_MIC_DISCOVERY: api }); await f.g.requestDiscovery('search', 'Music');
  const html = f.html('[data-om-discovery-results]'); assert.match(html, /&lt;img/); assert.match(html, /&lt;iframe/);
  assert.doesNotMatch(html, /<img|<iframe|Preview|evil\.test|autoplay/); assert.match(html, /data-om-action="discoverySelect"[^>]* disabled/);
});

test('a newer search owns results even when the canceled request completes late', async () => {
  const waits = [], api = { search: (_query, options) => new Promise(resolve => waits.push({ resolve, signal: options.signal })) };
  const f = fixture({}, { OPEN_MIC_DISCOVERY: api });
  const first = f.g.requestDiscovery('search', 'First'), second = f.g.requestDiscovery('search', 'Second'); assert.equal(waits[0].signal.aborted, true);
  waits[1].resolve({ songs: [{ videoId: 'JGwWNGJdvx8', title: 'Second' }] }); await second;
  waits[0].resolve({ songs: [{ videoId: 'nfWlot6h_JM', title: 'First' }] }); await first;
  assert.equal(f.g.discoverySongs.length, 1); assert.equal(f.g.discoverySongs[0].title, 'Second');
});

test('session replacement and teardown abort discovery and discard stale responses', async () => {
  const waits = [], api = { search: (_query, options) => new Promise(resolve => waits.push({ resolve, signal: options.signal })) };
  const f = fixture({}, { OPEN_MIC_DISCOVERY: api });
  const first = f.g.requestDiscovery('search', 'First'); f.g.data = state({ sessionId: 'new' }); f.g.resetDiscovery();
  assert.equal(waits[0].signal.aborted, true); waits[0].resolve({ songs: [{ videoId: 'nfWlot6h_JM', title: 'Old' }] }); await first;
  assert.equal(f.g.discoverySongs.length, 0);
  const second = f.g.requestDiscovery('search', 'Second'); f.g.destroy(); assert.equal(waits[1].signal.aborted, true);
  waits[1].resolve({ songs: [{ videoId: 'JGwWNGJdvx8', title: 'Late' }] }); await second;
  assert.equal(f.element.innerHTML, ''); assert.equal(f.g.discoverySongs.length, 0);
});

test('search rejects empty or oversized queries and unsupported regions before requesting', async () => {
  let requests = 0; const api = { search: async () => { requests++; return {}; } }, f = fixture({}, { OPEN_MIC_DISCOVERY: api });
  await f.g.requestDiscovery('search', ''); await f.g.requestDiscovery('search', 'x'.repeat(101));
  f.g.discoveryRegion = 'ZZ'; await f.g.requestDiscovery('search', 'Song'); assert.equal(requests, 0);
});

test('discovery favorites remain optional and late additions do not open another owner list', async () => {
  const f = fixture(); f.g.discoverySongs = [{ videoId: 'JGwWNGJdvx8', title: 'Next title' }];
  let complete; f.g.action = (type, payload) => { f.sent.push({ type, payload }); return new Promise(resolve => { complete = resolve; }); };
  const saving = f.g.addDiscoverySong('JGwWNGJdvx8'); f.g.data.spotlight = 2; complete(true); await saving;
  assert.equal(f.sent[0].type, 'addSong'); assert.equal(f.sent[0].payload.url, 'https://www.youtube.com/watch?v=JGwWNGJdvx8');
  assert.equal(f.g.category, 'for-you'); assert.equal(f.g.data.teamScore, 2);
});

test('timer runs to zero without starting or controlling any media', () => {
  const f = fixture({ now: () => 45000 }); f.g.data.singingStartedAt = 0; f.g.data.singingState = 'singing'; f.g.lastControl = true;
  f.g.paint(); assert.equal(f.element.querySelector('[data-om-timer]').textContent, '0:00');
  assert.equal(f.element.querySelector('[data-om-progress]').style.width, '0%');
  assert.equal(f.sent.length, 0);
});

test('the command boundary also rejects retired lyric commands or unknown operations', async () => {
  const f = fixture();
  assert.equal(await f.g.action('setLyrics', { lyrics: 'old content' }), false);
  assert.equal(await f.g.action('unknown'), false);
  assert.equal(f.sent.length, 0);
});


test('server-managed listeners can judge, move to the next turn and recover without taking Spotlight choice authority', async () => {
  const f = fixture({ actor: 2 }); f.g.data.sharedControls = true;
  f.g.data.phase = 'challenge'; f.g.data.challengeResult = null; f.g.render();
  assert.match(f.html('[data-om-challenge]'), /data-om-action="success".*data-om-action="failed"/s);
  assert.match(f.html('[data-om-score]'), /data-om-action="recover"/);
  f.g.data.phase = 'choice'; f.g.data.challengeResult = 'success'; f.g.renderStage();
  assert.match(f.html('[data-om-stage-controls]'), /data-om-action="next"/);
  assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="(?:startSinging|changeSong|clearSong)"/);
  assert.equal(f.g.canSelectDiscovery(), false);
  await f.g.action('recover'); assert.equal(f.sent[0].type, 'recover');
  f.g.destroy(); assert.equal(f.timers.size, 0);
});

test('server-managed inactive listeners only see their return and recovery controls', () => {
  const f = fixture({ actor: 2 }); f.g.data.sharedControls = true; f.g.data.roster[1].active = false;
  f.g.data.phase = 'challenge'; f.g.data.challengeResult = null; f.g.render();
  assert.doesNotMatch(f.html('[data-om-challenge]'), /data-om-action="(?:success|failed)"/);
  assert.match(f.html('[data-om-score]'), /data-om-action="recover"/);
  assert.match(f.html('[data-om-score]'), /data-om-action="exclude" data-player="2" data-active="true"/);
  assert.equal(f.g.manager(), false); f.g.destroy();
});


test('shared players can end and reopen a new game from their card while stopped stage actions stay hidden', async () => {
  const f = fixture({ actor: 2 }); f.g.data.sharedControls = true;
  f.g.render(); assert.match(f.html('[data-om-score]'), /data-om-action="stop"/); assert.match(f.html('[data-om-score]'), /Reset score &amp; start new game/);
  await f.g.action('stop'); assert.equal(f.sent[0].type, 'stop');
  f.g.data.phase = 'stopped'; f.g.render();
  assert.match(f.html('[data-om-score]'), /data-om-action="restart"/);
  assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="(?:next|startSinging|finishSinging)"/);
  await f.g.action('restart'); assert.equal(f.sent[1].type, 'restart');
  f.g.data.roster[1].active = false; f.g.render();
  assert.doesNotMatch(f.html('[data-om-score]'), /data-om-action="(?:stop|restart)"/);
  f.g.destroy();
});

test('Life Song mode uses its own wording, life activity cards and a manager mode switch', () => {
  const f = fixture(); f.g.data = state({ mode: 'life', phase: 'challenge', challengeResult: null, round: 2 }); f.g.render();
  const challenge = f.html('[data-om-challenge]'), score = f.html('[data-om-score]');
  assert.match(challenge, /Story shared \+2/); assert.match(challenge, /Then: Keep talking/); assert.match(challenge, /pick one thing from the last story/);
  assert.doesNotMatch(challenge, /Success: /);
  assert.match(score, /Story \+2 · Song \+1/); assert.match(score, /data-mode="life"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-mode="life"/);
  f.g.data = state({ mode: 'life' }); f.g.renderStage();
  assert.match(f.html('[data-om-stage-info]'), /Sing a little/); assert.doesNotMatch(f.html('[data-om-stage-info]'), /Rhythm relay/);
  click(f.g, 'setMode', { mode: 'mission' });
  assert.equal(f.sent.at(-1).type, 'setMode'); assert.equal(f.sent.at(-1).payload.mode, 'mission');
  const sent = f.sent.length; click(f.g, 'setMode', { mode: 'life' }); assert.equal(f.sent.length, sent, 'current mode is not resent');
});

test('missing mode (older service) keeps Mission Rescue wording and players see the mode without a switch', () => {
  const f = fixture({ actor: 2 }); f.g.data = state({ phase: 'challenge', challengeResult: null }); f.g.render();
  assert.match(f.html('[data-om-challenge]'), /Success: Keep talking/);
  assert.match(f.html('[data-om-score]'), /Mission Rescue/); assert.doesNotMatch(f.html('[data-om-score]'), /data-om-action="setMode"/);
});

test('Now & Next shares Life Song wording, shows the follow-up line and offers three modes to managers', () => {
  const f = fixture(); f.g.data = state({ mode: 'next', phase: 'challenge', challengeResult: null,
    challenge: { id: 'next-x', title: { en: 'Battery' }, situation: 'Your energy', challenge: 'What percent?', followUp: { en: 'What charges you?', zh: '什麼幫你充電？' }, successRule: 'Which song charges you?' } });
  f.g.render();
  const challenge = f.html('[data-om-challenge]'), score = f.html('[data-om-score]');
  assert.match(challenge, /Story shared \+2/); assert.match(challenge, /Others can ask: What charges you\?/); assert.match(challenge, /Then: Which song charges you\?/);
  assert.equal((score.match(/data-om-action="setMode"/g) || []).length, 3);
  assert.match(score, /data-mode="next"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-mode="next"/);
  click(f.g, 'setMode', { mode: 'life' }); assert.equal(f.sent.at(-1).payload.mode, 'life');
  f.g.data = state({ mode: 'mission', phase: 'challenge', challengeResult: null }); f.g.render();
  assert.doesNotMatch(f.html('[data-om-challenge]'), /Others can ask/, 'missions have no follow-up line');
});


function outsideDetails(html) { return html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, ''); }
function chooseDisclosure(f, open) {
  const chooser = f.element.querySelector('[data-om-chooser]');
  chooser.open = open;
  f.listeners.get('toggle')?.({ target: chooser });
  return chooser;
}
function visibleMarker(f, marker) {
  const html = f.html('[data-om-challenge]');
  const found = html.match(new RegExp('<(?:span|p)\\b[^>]*\\b' + marker + '[^>]*>([\\s\\S]*?)<\\/(?:span|p)>'));
  assert.ok(found, marker + ' is present in the immediately visible challenge header');
  return found[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

test('the active challenge task stays immediately visible outside disclosures in every mode and role', () => {
  for (const mode of ['mission', 'life', 'next']) {
    for (const phase of ['challenge']) {
      for (const actor of [0, 1, 2]) {
        const f = fixture({ actor });
        f.g.update(state({ mode, phase, challengeResult: phase === 'challenge' ? null : 'success',
          challenge: { id: 'visible-' + mode, title: { en: 'Visible topic', zh: '中文題名' },
            situation: { en: 'Visible context', zh: '中文背景' }, challenge: { en: 'Always visible task', zh: '中文題目' },
            successRule: { en: 'Always visible rule', zh: '中文條件' },
            ...(mode === 'next' ? { followUp: { en: 'Visible follow-up?', zh: '中文追問' } } : {}) } }));
        const challenge = f.html('[data-om-challenge]'), visible = outsideDetails(challenge);
        assert.match(visible, /data-om-task/);
        assert.match(visible, /Always visible task/);
        assert.match(visible, /Always visible rule/);
        if (mode === 'next') assert.match(visible, /Visible follow-up\?/);
        assert.doesNotMatch(visible, /中文題名|中文背景|中文題目|中文條件|中文追問/);
        assert.equal(f.element.getAttribute('data-om-phase') || f.element.dataset.omPhase, phase);
        f.g.destroy();
      }
    }
  }
});

test('translated interface copy keeps the actual challenge and follow-up in English', () => {
  const i18n = { lang: 'zh', registerDict(_name, dictionary) { this.dictionary = dictionary; },
    onChange() {}, t(_name, key) { return this.dictionary[key]?.zh || this.dictionary[key]?.en || key; } };
  const f = fixture({}, { I18N: i18n });
  f.g.update(state({ mode: 'next', phase: 'challenge', challengeResult: null,
    challenge: { id: 'english', title: { en: 'English topic', zh: '中文題名' }, situation: { en: 'English situation', zh: '中文背景' },
      challenge: { en: 'English task', zh: '中文題目' }, followUp: { en: 'English follow-up', zh: '中文追問' },
      successRule: { en: 'English next step', zh: '中文條件' } } }));
  const visible = outsideDetails(f.html('[data-om-challenge]'));
  for (const text of ['English topic', 'English situation', 'English task', 'English follow-up', 'English next step']) assert.ok(visible.includes(text), text);
  assert.doesNotMatch(visible, /中文題名|中文背景|中文題目|中文追問|中文條件/);
  f.g.destroy();
});

test('the immediate cue identifies host, current performer and listener without granting new stage authority', () => {
  const host = fixture(), performer = fixture({ actor: 1 }), listener = fixture({ actor: 2 });
  for (const f of [host, performer, listener]) f.g.update(state({ phase: 'challenge', challengeResult: null, selectedSong: null }));
  assert.match(visibleMarker(host, 'data-om-role-badge'), /Hosting/);
  assert.match(visibleMarker(performer, 'data-om-role-badge'), /Your turn/);
  assert.match(visibleMarker(listener, 'data-om-role-badge'), /Listen & ask/);
  assert.match(visibleMarker(host, 'data-om-phase-cue'), /choose the result/);
  assert.match(visibleMarker(performer, 'data-om-phase-cue'), /card is yours/);
  assert.match(visibleMarker(listener, 'data-om-phase-cue'), /Listen to One/);
  for (const f of [host, performer, listener]) {
    f.g.update(state({ phase: 'choice', selectedSong: null }));
    if (f.g.actor === 2) assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="(?:startSinging|clearSong|next)"/);
    f.g.update(state({ phase: 'singing', singingState: 'singing' }));
    if (f.g.actor !== 2) assert.match(f.html('[data-om-stage-controls]'), /data-om-action="finishSinging"/);
    else assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="finishSinging"/);
    assert.equal(f.sent.length, 0, 'rendered cues never send commands');
    f.g.destroy();
  }
});

test('the song chooser is a persistent disclosure and remembers manual state during updates and new challenge sessions', () => {
  const f = fixture();
  f.g.update(state({ phase: 'challenge', challengeResult: null, selectedSong: null }));
  assert.match(f.element.innerHTML, /<details\b[^>]*data-om-chooser[^>]*>/);
  assert.match(f.element.innerHTML, /data-om-chooser-summary/);
  const chooser = chooseDisclosure(f, true);
  for (const next of [
    state({ phase: 'challenge', challengeResult: null, selectedSong: null, teamScore: 6 }),
    state({ sessionId: 'new-challenge-session', phase: 'challenge', challengeResult: null, selectedSong: null }),
  ]) {
    f.g.update(next);
    assert.equal(f.element.querySelector('[data-om-chooser]'), chooser);
    assert.equal(chooser.open, true);
  }
  chooseDisclosure(f, false);
  f.g.update(state({ sessionId: 'another-challenge-session', phase: 'challenge', challengeResult: null, selectedSong: null }));
  assert.equal(chooser.open, false);
  assert.equal(f.sent.length, 0);
  f.g.destroy();
});

test('empty choice opens only for a controller, a new selection closes it and canceling reopens it', () => {
  for (const actor of [0, 1, 2]) {
    const f = fixture({ actor });
    f.g.update(state({ phase: 'challenge', challengeResult: null, selectedSong: null }));
    const chooser = chooseDisclosure(f, false);
    f.g.update(state({ phase: 'choice', selectedSong: null }));
    assert.equal(chooser.open, actor !== 2);
    chooseDisclosure(f, true);
    f.g.update(state({ phase: 'choice', selectedSong: { videoId: 'omtxt000001', title: 'Original tune', artist: '', tags: [] } }));
    assert.equal(chooser.open, false);
    f.g.update(state({ phase: 'choice', selectedSong: null }));
    assert.equal(chooser.open, actor !== 2);
    f.g.destroy();
  }
  const f = fixture();
  f.g.update(state({ phase: 'finished', singingState: 'finished' }));
  chooseDisclosure(f, false);
  f.g.update(state({ phase: 'finished', singingState: 'finished', selectedSong: null }));
  assert.equal(f.element.querySelector('[data-om-chooser]').open, true);
  f.g.destroy();
});

test('a manual close while choosing survives score, timer, query and category renders', () => {
  const f = fixture();
  f.g.update(state({ phase: 'choice', selectedSong: null }));
  const chooser = chooseDisclosure(f, false);
  f.g.update(state({ phase: 'choice', selectedSong: null, teamScore: 8, turnId: 3 }));
  assert.equal(chooser.open, false);
  f.g.query = 'Original'; f.g.renderSongs();
  f.g.category = 'my-songs'; f.g.renderSongs();
  f.g.render(); f.g.paint();
  assert.equal(chooser.open, false);
  assert.equal(f.sent.length, 0);
  f.g.destroy();
});

test('change expands the chooser and resets a stale title filter without changing a favorite or selection', () => {
  const f = fixture(); f.g.render();
  f.g.query = 'Old unmatched title'; f.g.category = 'my-songs';
  f.element.querySelector('[data-om-search]').value = f.g.query;
  const before = JSON.stringify(f.g.data);
  chooseDisclosure(f, false);
  f.g.changeStageSong();
  assert.equal(f.element.querySelector('[data-om-chooser]').open, true);
  assert.equal(f.g.query, ''); assert.equal(f.element.querySelector('[data-om-search]').value, '');
  assert.equal(JSON.stringify(f.g.data), before); assert.equal(f.sent.length, 0);
  f.g.destroy();
});

test('a single visible activity cue allows local alternatives without media or room mutations', () => {
  const f = fixture(); f.g.update(state({ mode: 'mission' }));
  const before = JSON.stringify(f.g.data);
  assert.match(f.html('[data-om-stage-info]'), /data-om-activity-cue/);
  assert.equal((f.html('[data-om-stage-info]').match(/data-om-activity-cue/g) || []).length, 1);
  assert.match(f.html('[data-om-stage-info]'), /data-om-alternatives/);
  click(f.g, 'activityMode', { mode: 'rhythm' });
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Rhythm relay/);
  assert.equal(JSON.stringify(f.g.data), before);
  assert.equal(f.sent.length, 0);
  click(f.g, 'activityMode', { mode: 'unexpected' });
  assert.equal(f.sent.length, 0); assert.equal(JSON.stringify(f.g.data), before);
  f.g.destroy();
});

test('local activity alternatives reset with mode, song and session instead of obscuring a new activity', () => {
  const f = fixture();
  f.g.update(state({ mode: 'mission' })); click(f.g, 'activityMode', { mode: 'rhythm' });
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Rhythm relay/);
  f.g.update(state({ mode: 'life' }));
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Sing a little/);
  assert.doesNotMatch(outsideDetails(f.html('[data-om-stage-info]')), /Rhythm relay/);
  click(f.g, 'activityMode', { mode: 'lifeWhy' });
  f.g.update(state({ mode: 'next', sessionId: 'fresh-next' }));
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Sing a little/);
  f.g.update(state({ mode: 'mission', selectedSong: { videoId: 'omtxt000001', title: 'New original', artist: '', tags: [] } }));
  assert.match(outsideDetails(f.html('[data-om-stage-info]')), /Original improvisation/);
  assert.equal(f.sent.length, 0);
  f.g.destroy();
});

test('role cues, visible prompts and activity titles escape untrusted text', () => {
  const f = fixture({ actor: 1 });
  const attack = '<img src=x onerror=alert(1)>';
  f.g.update(state({ phase: 'challenge', challengeResult: null,
    roster: [{ playerNum: 1, name: attack, active: true }, { playerNum: 2, name: 'Other', active: true }],
    challenge: { id: 'escape', title: attack, situation: attack, challenge: attack, successRule: attack } }));
  const challenge = f.html('[data-om-challenge]');
  assert.match(challenge, /&lt;img/); assert.doesNotMatch(challenge, /<img|<iframe|onerror="/);
  f.g.update(state({ selectedSong: { videoId: 'omtxt000009', title: attack, artist: attack, tags: [] } }));
  assert.doesNotMatch(f.html('[data-om-stage-info]'), /<img|<iframe|Retired copyrighted/);
  assert.equal(f.sent.length, 0);
  f.g.destroy();
});


test('completed prompt disclosures never replace the current choice, timer or main action', () => {
  const f = fixture();
  for (const phase of ['choice', 'singing', 'finished']) {
    f.g.update(state({ phase, singingState: phase === 'singing' ? 'singing' : phase === 'finished' ? 'finished' : 'idle',
      singingStartedAt: phase === 'singing' ? 1000 : null, singingAwarded: phase === 'finished' }));
    assert.match(outsideDetails(f.html('[data-om-stage-info]')), /A music memory/);
    assert.match(outsideDetails(f.html('[data-om-stage-info]')), /data-om-activity-cue/);
    const controls = f.html('[data-om-stage-controls]');
    assert.match(controls, /data-om-action="changeSong".*data-om-action="clearSong"/s);
    assert.match(controls, new RegExp('data-om-action="' + (phase === 'choice' ? 'startSinging' : phase === 'singing' ? 'finishSinging' : 'next') + '"'));
    if (phase === 'singing') assert.match(f.html('[data-om-stage-timer]'), /data-om-timer/);
  }
  f.g.destroy();
});

test('shared management remains available inside its disclosure without granting listener choice authority', () => {
  const f = fixture({ actor: 2 });
  f.g.update(state({ sharedControls: true, phase: 'challenge', challengeResult: null }));
  assert.match(f.html('[data-om-challenge]'), /data-om-action="success".*data-om-action="failed"/s);
  assert.match(visibleMarker(f, 'data-om-phase-cue'), /choose the result/);
  const tools = f.html('[data-om-score]');
  assert.match(tools, /<details\b[^>]*data-om-management/);
  for (const action of ['setMode', 'exclude', 'restart', 'stop', 'recover']) assert.match(tools, new RegExp('data-om-action="' + action + '"'));
  const disclosure = f.element.querySelector('[data-om-management]'); disclosure.open = true;
  f.g.update(state({ sharedControls: true, phase: 'choice', teamScore: 4 }));
  assert.equal(f.element.querySelector('[data-om-management]').open, true);
  assert.match(f.html('[data-om-stage-controls]'), /data-om-action="next"/);
  assert.doesNotMatch(f.html('[data-om-stage-controls]'), /data-om-action="(?:startSinging|changeSong|clearSong)"/);
  f.g.data.roster[1].active = false; f.g.render();
  assert.match(visibleMarker(f, 'data-om-role-badge'), /Taking a break/);
  const inactiveTools = f.html('[data-om-score]');
  assert.match(inactiveTools, /data-om-action="recover"/);
  assert.match(inactiveTools, /data-om-action="exclude" data-player="2" data-active="true"/);
  assert.doesNotMatch(inactiveTools, /data-om-action="(?:setMode|restart|stop)"/);
  f.g.destroy();
});


test('completed prompt recap opens only on request, remembers same-round choice and resets for the next prompt', () => {
  const f = fixture();
  const challenge = { id: 'recap-one', title: { en: 'The completed topic' }, situation: 'Completed context',
    challenge: 'Unique active task', successRule: 'Completed rule' };
  f.g.update(state({ phase: 'challenge', challengeResult: null, selectedSong: null, challenge }));
  assert.match(outsideDetails(f.html('[data-om-challenge]')), /Unique active task/);
  assert.doesNotMatch(f.html('[data-om-challenge]'), /data-om-completed-prompt/);
  f.g.update(state({ phase: 'choice', challenge }));
  const html = f.html('[data-om-challenge]');
  assert.match(html, /<details\b[^>]*data-om-completed-prompt/);
  assert.match(html, /<summary>[\s\S]*The completed topic/);
  assert.doesNotMatch(outsideDetails(html), /Unique active task|Completed context|Completed rule/);
  const recap = f.element.querySelector('[data-om-completed-prompt]');
  assert.equal(recap.open, false);
  recap.open = true;
  f.g.update(state({ phase: 'singing', singingState: 'singing', teamScore: 5, challenge }));
  assert.equal(f.element.querySelector('[data-om-completed-prompt]').open, true);
  assert.match(f.html('[data-om-challenge]'), /data-om-completed-prompt open/);
  f.g.update(state({ phase: 'finished', singingState: 'finished', challenge }));
  assert.equal(f.element.querySelector('[data-om-completed-prompt]').open, true);
  f.g.update(state({ phase: 'choice', round: 2, challenge: { ...challenge, id: 'recap-two', challenge: 'Next task' } }));
  assert.equal(f.element.querySelector('[data-om-completed-prompt]').open, false);
  assert.equal(f.sent.length, 0);
  f.g.destroy();
});
