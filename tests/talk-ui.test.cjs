'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const E = require('../talk-engine.js');
const clone = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(require.resolve('../talk-ui.js'), 'utf8');
const sample = (extra = {}) => ({ version: 1, sessionId: 'ui-topic', turnId: 2, phase: 'talking', round: 1,
  mode: 'think', gameMode: 'normal', speaker: 1, deadline: 10000, topic: { question: 'What would you sell in a cafe?' },
  roster: [{ playerNum: 1, name: 'Alex' }, { playerNum: 2, name: 'Sam' }], questions: [], notes: [], interests: [],
  hostLiveUntil: 10000, crazy: { enabled: false, paused: false, intervalSeconds: 120, prompt: null, pendingCount: 0 }, ...extra });
const prompt = (extra = {}) => ({ id: 'ui-topic:crazy:2:1', text: 'My soup has a secret plan.', kind: 'line', status: 'pending', at: 1000, ...extra });
const crazy = (extra = {}) => sample({ gameMode: 'crazy', crazy: { enabled: true, paused: false, intervalSeconds: 120,
  prompt: prompt(), pendingCount: 1, ...extra } });
function fixture(send = async () => {}, options = {}) {
  let html = '', buttons = [], scrolls = 0, clock = 1000, online = true;
  const handlers = new Map(), nodes = new Map(), timers = new Set();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', open: false, scrollIntoView() { scrolls++; } });
    return nodes.get(selector);
  };
  const element = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(match => {
        const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(entry => [entry[1], entry[2]]));
        return { disabled: /(?:^|\s)disabled(?:\s|$)/.test(match[1]), hidden: false,
          dataset: Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value])) };
      });
    },
    contains: button => buttons.includes(button),
    querySelector(selector) {
      if (selector === '.talk-crazy-prompt') return /class="talk-crazy-prompt"/.test(html) ? node(selector) : null;
      if (selector === '[data-talk-note]' || selector === '.talk-shared') return null;
      return node(selector);
    },
    querySelectorAll(selector) { return selector === '[data-talk-action]' ? buttons : []; },
    addEventListener(type, callback) { handlers.set(type, callback); },
    removeEventListener(type, callback) { assert.equal(handlers.get(type), callback); handlers.delete(type); },
  };
  const context = vm.createContext({ crypto: webcrypto, document: { title: '', activeElement: null },
    setInterval(callback) { timers.add(callback); return callback; }, clearInterval(callback) { timers.delete(callback); },
    I18N: { registerDict() {}, t(namespace, key) { return english[key] || key; } } });
  const english = { crazyTitle: 'Crazy Talk', crazyPrivate: 'Your secret line', crazyDone: 'Said it!', crazySkip: 'Skip this line',
    crazyCompleted: 'Line complete', crazySkipped: 'Skipped', crazyPaused: 'New lines are paused', crazyWaiting: 'Your surprise line will appear here',
    end: "I'm done", offline: 'Connection lost', hostAway: 'Waiting for the host page', stale_turn: 'The conversation has moved on',
    error: 'Could not sync', ready: 'I have an idea', wait: 'I need more time', noteLabel: 'A short thought', sendNote: 'Share this thought' };
  vm.runInContext(source, context, { filename: 'talk-ui.js' });
  const card = new context.TALK_PLAYER.Card(element, { send, nameBanner: () => '<span>Sam</span>', now: () => clock, connected: () => online, ...options });
  const update = (talk = sample(), extra = {}) => card.update({ game: 'letstalk', playerNum: 2, name: 'Sam', talk: clone(talk), ...extra });
  const click = action => {
    const button = buttons.find(value => value.dataset.talkAction === action);
    if (button) handlers.get('click')?.({ target: { closest: () => button } });
  };
  return { card, element, context, update, click, node, timers, handlers, buttons: () => buttons,
    scrolls: () => scrolls, setClock: value => { clock = value; }, setOnline: value => { online = value; } };
}

test('Normal Talk keeps thinking, main-turn, question and listener controls without any Crazy notice', () => {
  const f = fixture();
  try {
    for (const talk of [sample({ phase: 'thinking' }), sample({ speaker: 2 }), sample({ activeQuestion: { id: 'q', playerNum: 2 } }), sample()]) {
      f.update(talk);
      assert.doesNotMatch(f.element.innerHTML, /talk-crazy-|data-prompt-id|crazyDone|crazySkip/);
    }
    f.update(sample({ phase: 'thinking', mode: 'write' }));
    assert.match(f.element.innerHTML, /data-talk-note/); assert.match(f.element.innerHTML, /data-talk-action="ready"/);
    f.update(sample({ speaker: 2 })); assert.match(f.element.innerHTML, /data-talk-action="end"/);
    f.update(sample()); assert.match(f.element.innerHTML, /data-talk-action="ask"/); assert.match(f.element.innerHTML, /data-talk-action="share"/);
    f.update(sample({ crazy: { enabled: true, prompt: prompt() } }));
    assert.doesNotMatch(f.element.innerHTML, /talk-crazy-prompt|My soup/);
  } finally { f.card.destroy(); }
});

test('Own private silly line appears prominently above normal topic and is escaped', () => {
  const f = fixture();
  try {
    const unsafe = '<img src=x onerror="attack()"> & "soup"';
    f.update(crazy({ prompt: prompt({ text: unsafe }) }));
    const html = f.element.innerHTML;
    assert.ok(html.indexOf('talk-crazy-prompt') < html.indexOf('talk-player-topic'));
    assert.match(html, /&lt;img src=x onerror=&quot;attack\(\)&quot;&gt; &amp; &quot;soup&quot;/);
    assert.doesNotMatch(html, /<img|<script/);
    assert.match(html, /data-talk-action="crazyDone"[^>]*data-prompt-id="ui-topic:crazy:2:1"/);
    assert.match(html, /data-talk-action="crazySkip"[^>]*data-prompt-id="ui-topic:crazy:2:1"/);
    assert.match(html, /data-talk-action="ask"/);
    assert.equal(f.scrolls(), 1);
  } finally { f.card.destroy(); }
});

test('Prompt ID is escaped in notice and controls; normal mode never leaks an accidentally supplied prompt', () => {
  const f = fixture();
  try {
    const html = f.context.TALK_UI.crazyHTML(crazy({ prompt: prompt({ id: 'bad" onclick="attack()' }) }));
    assert.doesNotMatch(html, /onclick="attack\(\)"/);
    assert.match(html, /data-prompt-id="bad&quot; onclick=&quot;attack\(\)"/);
    assert.equal(f.context.TALK_UI.crazyHTML(sample({ crazy: { enabled: true, prompt: prompt() } })), '');
  } finally { f.card.destroy(); }
});

test('Done sends only the current prompt identity once, independent of the sharing turn', async () => {
  const sent = [], f = fixture(async command => { sent.push(clone(command)); });
  try {
    f.update(crazy()); f.click('crazyDone'); f.click('crazyDone'); await Promise.resolve();
    assert.equal(sent.length, 1);
    assert.deepEqual({ ...sent[0], id: 'request' }, { type: 'crazyDone', id: 'request', sessionId: 'ui-topic', turnId: 2, promptId: 'ui-topic:crazy:2:1' });
    assert.equal(sent[0].actor, undefined); assert.equal(sent[0].target, undefined);
    assert.ok(f.card.pending);
    f.update({ ...crazy(), turnId: 3, speaker: 2 });
    assert.equal(f.card.pending.id, sent[0].id);
    assert.ok(f.buttons().filter(button => button.dataset.talkAction !== 'retry').every(button => button.disabled));
    f.update({ ...crazy({ prompt: prompt({ status: 'done' }) }), turnId: 3, reply: { id: sent[0].id, error: '' } });
    assert.equal(f.card.pending, null);
    assert.doesNotMatch(f.element.innerHTML, /My soup|data-talk-action="crazyDone"|data-talk-action="crazySkip"/);
    assert.match(f.element.innerHTML, /Line complete/);
  } finally { f.card.destroy(); }
});

test('Skip works while dispatch is paused and keeps normal turn controls intact', async () => {
  const sent = [], f = fixture(async command => { sent.push(clone(command)); });
  try {
    f.update({ ...crazy({ paused: true }), speaker: 2 });
    assert.match(f.element.innerHTML, /New lines are paused/); assert.match(f.element.innerHTML, /data-talk-action="end"/);
    f.click('crazySkip'); await Promise.resolve();
    assert.equal(sent[0].type, 'crazySkip'); assert.equal(sent[0].promptId, prompt().id);
    f.update(crazy({ prompt: prompt({ status: 'skipped' }) }));
    assert.equal(f.card.pending, null); assert.doesNotMatch(f.element.innerHTML, /My soup/); assert.match(f.element.innerHTML, /Skipped/);
  } finally { f.card.destroy(); }
});

test('Refresh recovers only an unresolved own prompt request, even if the main turn changed', () => {
  const f = fixture(), command = { id: 'pending-request', sessionId: 'ui-topic', turnId: 1, type: 'crazyDone', promptId: prompt().id };
  try {
    f.update(crazy(), { talkAction: command }); assert.equal(f.card.pending, command);
    f.update({ ...crazy(), turnId: 9 }); assert.equal(f.card.pending, command);
    f.update({ ...crazy(), turnId: 9, reply: { id: command.id, error: 'not_available' } });
    assert.equal(f.card.pending, null); assert.equal(f.card.error, 'not_available');
    f.update(crazy(), { talkAction: { ...command, promptId: 'another-person-or-old-prompt' } }); assert.equal(f.card.pending, null);
    f.update(crazy(), { talkAction: { ...command, sessionId: 'previous-topic' } }); assert.equal(f.card.pending, null);
    f.update(crazy({ prompt: prompt({ status: 'done' }) }), { talkAction: command }); assert.equal(f.card.pending, null);
  } finally { f.card.destroy(); }
});

test('Changing topic or replacing the own prompt clears obsolete pending requests without auto-acknowledging', async () => {
  const sent = [], f = fixture(async command => { sent.push(command); });
  try {
    f.update(crazy()); f.click('crazyDone'); await Promise.resolve(); assert.equal(sent.length, 1);
    f.update(crazy({ prompt: prompt({ id: 'ui-topic:crazy:2:2', text: 'My chair is taking a holiday.' }) }));
    assert.equal(f.card.pending, null); assert.match(f.element.innerHTML, /My chair is taking a holiday/);
    f.click('crazySkip'); await Promise.resolve(); assert.equal(sent.length, 2);
    f.card.draft = 'Previous unsent thought';
    f.update(sample({ sessionId: 'next-normal-topic', turnId: 0, phase: 'thinking', mode: 'write' }));
    assert.equal(f.card.pending, null); assert.equal(f.card.draft, '');
    assert.doesNotMatch(f.element.innerHTML, /My chair|talk-crazy-|Previous unsent thought/);
    f.card.paint(); assert.equal(sent.length, 2);
  } finally { f.card.destroy(); }
});

test('Updates and heartbeat never acknowledge a line and scroll a newly received line only once', async () => {
  const sent = [], f = fixture(async command => { sent.push(command); });
  try {
    f.update(crazy()); f.card.paint(); f.card.paint();
    f.update({ ...crazy(), turnId: 3, speaker: 2 }); f.update({ ...crazy(), turnId: 4 });
    await Promise.resolve(); assert.equal(sent.length, 0); assert.equal(f.scrolls(), 1);
    f.update(crazy({ prompt: prompt({ id: 'new-prompt' }) })); assert.equal(f.scrolls(), 2);
    f.update(crazy({ prompt: null })); assert.doesNotMatch(f.element.innerHTML, /blockquote|data-talk-action="crazy/);
    assert.equal(sent.length, 0);
    f.card.destroy(); assert.equal(f.timers.size, 0); assert.equal(f.handlers.size, 0);
  } finally { if (f.timers.size) f.card.destroy(); }
});

test('Disconnected or expired-host cards cannot send Crazy acknowledgements', async () => {
  const sent = [], f = fixture(async command => { sent.push(command); });
  try {
    f.update(crazy()); f.setOnline(false); f.card.paint(); f.click('crazyDone');
    assert.match(f.node('.talk-connection').textContent, /Connection lost/);
    f.setOnline(true); f.setClock(11000); f.card.paint(); f.click('crazySkip');
    assert.match(f.node('.talk-connection').textContent, /host page/);
    await Promise.resolve(); assert.equal(sent.length, 0);
  } finally { f.card.destroy(); }
});

test('Normal turn requests keep their stale-turn reset while Crazy requests retain prompt context', async () => {
  const sent = [], f = fixture(async command => { sent.push(command); });
  try {
    f.update(sample({ speaker: 2 })); f.click('end'); await Promise.resolve(); assert.equal(sent.length, 1);
    f.update(sample({ turnId: 3, speaker: 1 })); assert.equal(f.card.pending, null);
    f.update(sample(), { talkAction: { id: 'old-normal-end', sessionId: 'ui-topic', turnId: 1, type: 'end' } });
    assert.equal(f.card.pending, null);
  } finally { f.card.destroy(); }
});

test('Real engine projections render no other player line and host receives only safe counts', () => {
  let state = E.create({ id: 'private-ui', topic: { question: 'What should our cafe sell?' },
    gameMode: 'crazy', roster: [{ playerNum: 1, name: 'Alex' }, { playerNum: 2, name: 'Sam' }], now: 1000 });
  const command = (type, extra = {}) => { state = E.apply(state, { type, id: 'ui-' + type, actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: 2000, seed: 782, ...extra }); };
  command('start'); command('crazySend');
  const own = E.view(state, 2, 2000), other = E.view(state, 1, 2000), host = E.view(state, 0, 2000), f = fixture();
  try {
    f.card.update(own);
    assert.ok(f.element.innerHTML.includes(f.context.TALK_UI.esc(own.talk.crazy.prompt.text)));
    assert.ok(!f.element.innerHTML.includes(f.context.TALK_UI.esc(other.talk.crazy.prompt.text)));
    assert.ok(!f.element.innerHTML.includes(other.talk.crazy.prompt.id));
    assert.equal(host.talk.crazy.prompt, null); assert.equal(host.talk.crazy.pendingCount, 2);
    assert.equal(host.talk.crazy.prompts, undefined); assert.equal(host.talk.crazy.nextAt, undefined);
  } finally { f.card.destroy(); }
});

test('Host and original player page load current Talk UI; private action gate distinguishes prompt from turn', () => {
  const host = fs.readFileSync(require.resolve('../lets-talk.html'), 'utf8');
  const player = fs.readFileSync(require.resolve('../play.html'), 'utf8');
  const controller = fs.readFileSync(require.resolve('../talk-host.js'), 'utf8');
  assert.ok(host.indexOf('talk-crazy.js') < host.indexOf('talk-engine.js'));
  assert.match(host, /id="talk-game-mode"/); assert.match(host, /value="normal"/); assert.match(host, /value="crazy"/);
  assert.match(host, /id="talk-crazy-seconds"/); assert.match(host, /value="120" selected/);
  assert.match(controller, /gameMode: byId\('game-mode'\)\.value/);
  assert.match(controller, /crazySeconds: Number\(byId\('crazy-seconds'\)\.value\)/);
  assert.match(controller, /TALK_ENGINE\.view\(state, 0/);
  assert.doesNotMatch(controller, /state\.crazy\.prompts|state\.crazy\?\.prompts|JSON\.stringify\(state\)/);
  const start = player.indexOf("if (data.game === 'letstalk'");
  const gate = player.slice(start, player.indexOf('if (talkCard) { talkCard.destroy();', start));
  assert.match(gate, /TALK_UI\.crazyAction\(command\.type\)/);
  assert.match(gate, /prompt\?\.id !== command\.promptId/);
  assert.match(gate, /current\.talk\.turnId !== command\.turnId/);
});

test('Original player transport accepts prompt acknowledgements across turns but rejects obsolete or foreign contexts', async () => {
  const player = fs.readFileSync(require.resolve('../play.html'), 'utf8');
  const start = player.indexOf("if (data.game === 'letstalk'");
  const gate = player.slice(start, player.indexOf('if (talkCard) { talkCard.destroy();', start));
  for (const change of ['turn', 'normal-turn', 'prompt', 'resolved', 'session', 'normal-mode', 'game']) {
    let stored = { game: 'letstalk', playerNum: 2, talk: crazy(), keepOriginalField: true }, send, writes = 0;
    const command = { id: 'transport-request', type: change === 'normal-turn' ? 'end' : 'crazyDone', sessionId: 'ui-topic', turnId: 1, promptId: prompt().id };
    if (change === 'prompt') command.promptId = 'other-player-prompt';
    if (change === 'resolved') stored.talk.crazy.prompt.status = 'done';
    if (change === 'session') command.sessionId = 'old-topic';
    if (change === 'normal-mode') stored.talk.gameMode = 'normal';
    if (change === 'game') stored.game = 'cardcheck';
    const context = vm.createContext({ data: { game: 'letstalk', playerNum: 2, talk: crazy() }, talkCard: null, el: {}, nameBanner() {},
      talkClockOffset: 0, talkConnected: true, session: 'ONLY-OWN-ROOM', token: 'ONLY-OWN-CARD',
      TALK_UI: { crazyAction: type => type === 'crazyDone' || type === 'crazySkip' },
      TALK_PLAYER: { Card: class { constructor(element, options) { send = options.send; } update() {} } },
      db: { ref(node) { assert.equal(node, 'rooms/ONLY-OWN-ROOM/players/ONLY-OWN-CARD'); return {
        async transaction(update) { const next = update(clone(stored)); if (next === undefined) return { committed: false };
          stored = clone(next); writes++; return { committed: true }; },
      }; } },
    });
    vm.runInContext('(function () {' + gate + '})();', context);
    if (change === 'turn') {
      await send(command); assert.equal(writes, 1); assert.deepEqual(stored.talkAction, command); assert.equal(stored.keepOriginalField, true);
    } else {
      await assert.rejects(send(command), new RegExp(change === 'normal-turn' ? 'stale_turn' : 'stale_prompt'));
      assert.equal(writes, 0); assert.equal(stored.talkAction, undefined);
    }
  }
});
