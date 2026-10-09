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
  let html = '', buttons = [], fields = [], scrolls = 0, clock = 1000, online = true, language = 'en';
  const dictionaries = {}; let focusedAction = null;
  const handlers = new Map(), nodes = new Map(), timers = new Set();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', open: false, scrollIntoView() { scrolls++; } });
    return nodes.get(selector);
  };
  const element = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      fields = [...html.matchAll(/<(?:select|textarea|input)\b([^>]*)>/g)].map(match => {
        const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(entry => [entry[1], entry[2]]));
        return { disabled: false, dataset: Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value])) };
      });
      buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(match => {
        const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(entry => [entry[1], entry[2]]));
        return { focus() { focusedAction = this.dataset.talkAction; }, disabled: /(?:^|\s)disabled(?:\s|$)/.test(match[1]), hidden: false,
          dataset: Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value])) };
      });
    },
    contains: button => buttons.includes(button),
    querySelector(selector) {
      const action = selector.match(/^\[data-talk-action="([^"]+)"\]$/); if (action) return buttons.find(b => b.dataset.talkAction === action[1]) || null;
      if (selector === '.talk-crazy-prompt') return /class="talk-crazy-prompt"/.test(html) ? node(selector) : null;
      if (selector === '.talk-management') return html.includes('class="talk-management"') ? node(selector) : null;
      if (selector === '[data-talk-note]' || selector === '.talk-shared') return null;
      return node(selector);
    },
    querySelectorAll(selector) { return selector === '[data-talk-action]' ? buttons : selector.includes('[data-talk-assignment-field]') ? fields : []; },
    addEventListener(type, callback) { handlers.set(type, callback); },
    removeEventListener(type, callback) { assert.equal(handlers.get(type), callback); handlers.delete(type); },
  };
  const context = vm.createContext({ crypto: webcrypto, document: { title: '', activeElement: null },
    setInterval(callback) { timers.add(callback); return callback; }, clearInterval(callback) { timers.delete(callback); },
    I18N: { registerDict(namespace, dict) { dictionaries[namespace] = dict; }, get lang() { return language; }, t(namespace, key) { return language === 'en' && english[key] || dictionaries[namespace]?.[key]?.[language] || key; } } });
  const english = { crazyTitle: 'Crazy Talk', crazyPrivate: 'Your secret line', crazyDone: 'Said it!', crazySkip: 'Skip this line',
    crazyCompleted: 'Line complete', crazySkipped: 'Skipped', crazyPaused: 'New lines are paused', crazyWaiting: 'Your surprise line will appear here',
    end: "I'm done", offline: 'Connection lost', hostAway: 'Waiting for the host page', stale_turn: 'The conversation has moved on',
    error: 'Could not sync', ready: 'I have an idea', wait: 'I need more time', noteLabel: 'A short thought', sendNote: 'Share this thought' };
  vm.runInContext(fs.readFileSync(require.resolve('../talk-topics.js'), 'utf8'), context);
  vm.runInContext(source, context, { filename: 'talk-ui.js' });
  const card = new context.TALK_PLAYER.Card(element, { send, nameBanner: () => '<span>Sam</span>', now: () => clock, connected: () => online, ...options });
  const update = (talk = sample(), extra = {}) => card.update({ game: 'letstalk', playerNum: 2, name: 'Sam', talk: clone(talk), ...extra });
  const click = action => {
    const button = buttons.find(value => value.dataset.talkAction === action);
    if (button) handlers.get('click')?.({ target: { closest: () => button } });
  };
  const field = (kind, key, value, eventType = 'input') => {
    const target = { dataset: { [kind === 'editor' ? 'talkEditorField' : kind === 'assignment' ? 'talkAssignmentField' : 'talkSharedInput']: key }, value, checked: value === true, matches: () => false };
    handlers.get(eventType)?.({ target });
  };
  return { card, element, context, update, click, node, timers, handlers, buttons: () => buttons,
    assignmentField: (key,value,eventType = 'input') => field('assignment',key,value,eventType),
    editorField: (key, value, eventType) => field('editor', key, value, eventType), sharedField: (key, value, eventType = 'change') => field('shared', key, value, eventType), setLanguage: value => { language = value; },
    fields: () => fields, scrolls: () => scrolls, focusedAction: () => focusedAction, setClock: value => { clock = value; }, setOnline: value => { online = value; } };
}

test('Normal Talk shows topic, state and participants without speaking requests', () => {
  const f = fixture();
  try {
    for (const talk of [sample({ phase: 'thinking' }), sample({ speaker: 2 }), sample({ activeQuestion: { id: 'q', playerNum: 2 } }), sample()]) {
      f.update(talk);
      assert.doesNotMatch(f.element.innerHTML, /talk-crazy-|data-prompt-id|crazyDone|crazySkip/);
    }
    f.update(sample({ phase: 'thinking', mode: 'write' }));
    assert.match(f.element.innerHTML, /data-talk-note/); assert.doesNotMatch(f.element.innerHTML, /data-talk-action="(?:ready|wait|ask|share|more)"/);
    f.update(sample({ speaker: 2 })); assert.match(f.element.innerHTML, /data-talk-action="end"/);
    f.update(sample()); assert.match(f.element.innerHTML, /At the table/); assert.match(f.element.innerHTML, /Alex/); assert.match(f.element.innerHTML, /Listening/); assert.doesNotMatch(f.element.innerHTML, /data-talk-action="(?:ask|share|more)"/);
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
    assert.doesNotMatch(html, /data-talk-action="(?:ask|share|more)"/);
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
    f.update(crazy({ prompt: null })); assert.doesNotMatch(f.element.innerHTML, /blockquote|data-talk-action="crazy(?:Done|Skip)/);
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
    gameMode: 'crazy', crazyMinSeconds: 5, crazyMaxSeconds: 5, roster: [{ playerNum: 1, name: 'Alex' }, { playerNum: 2, name: 'Sam' }], now: 1000 });
  const command = (type, extra = {}) => { state = E.apply(state, { type, id: 'ui-' + type + '-' + (extra.now || 0), actor: 0, sessionId: state.sessionId, turnId: state.turnId, now: 2000, seed: 782, ...extra }); };
  command('start'); command('crazyTick', { now: 7000 }); command('crazyTick', { now: 12000 });
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
  assert.match(host, /id="talk-crazy-min-seconds"/); assert.match(host, /id="talk-crazy-max-seconds"/); assert.doesNotMatch(host, /id="talk-crazy-send"/);
  assert.match(controller, /gameMode: 'game-mode'/); assert.match(controller, /setupPreferences\(\)/);
  assert.match(controller, /crazyMinSeconds: 'crazy-min-seconds'/); assert.match(controller, /crazyMaxSeconds: 'crazy-max-seconds'/);
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

test('server-mode private card retains shared start while an old host heartbeat expires', async () => {
  const sent = [], f = fixture(async command => { sent.push(clone(command)); });
  try {
    f.setClock(20000);
    f.update(sample({ phase: 'thinking', sharedControls: true, hostControls: true, hostLiveUntil: 10000, actions: { start: true } }));
    assert.doesNotMatch(f.element.innerHTML, /data-talk-action="(?:ready|wait|ask|share|more)"/);
    const start = f.buttons().find(b => b.dataset.talkAction === 'start');
    assert.ok(start); assert.equal(start.disabled, false);
    assert.equal(f.node('.talk-connection').textContent, '');
    f.click('start'); await Promise.resolve(); await Promise.resolve();
    assert.equal(sent.length, 1); assert.equal(sent[0].type, 'start'); assert.equal(sent[0].actor, undefined);
    f.setOnline(false); f.card.paint();
    assert.ok(f.buttons().filter(b => b.dataset.talkAction !== 'retry').every(b => b.disabled));
  } finally { f.card.destroy(); }
});


const shared = (extra = {}) => sample({ sharedControls: true, hostControls: true, hostLiveUntil: 0,
  actions: { end: true, extend: true, starters: true, newTopic: true }, ...extra });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('shared handover with waiting questions needs a deliberate confirmation and stale confirmation is cleared', async () => {
  const sent = [], f = fixture(async command => sent.push(clone(command)));
  try {
    const talk = shared({ questions: [{ id: 'q', playerNum: 1 }] });
    f.update(talk); f.click('end');
    assert.equal(sent.length, 0); assert.equal(f.focusedAction(), 'confirmEnd'); assert.equal(f.scrolls(), 1); assert.match(f.element.innerHTML, /role="alertdialog"/); assert.match(f.element.innerHTML, /Skip these requests/);
    f.click('cancelConfirm'); assert.equal(sent.length, 0); assert.doesNotMatch(f.element.innerHTML, /role="alertdialog"/);
    f.click('end'); f.update({ ...talk, turnId: 3 });
    assert.doesNotMatch(f.element.innerHTML, /data-talk-action="confirmEnd"/);
    f.click('end'); f.click('confirmEnd'); await flush();
    assert.equal(sent.length, 1); assert.equal(sent[0].type, 'end'); assert.equal(sent[0].confirm, true); assert.equal(sent[0].actor, undefined); assert.equal(sent[0].turnId, 3);
  } finally { f.card.destroy(); }
});

test('pending-question rejection gives a clear confirmation instead of a generic connection failure', async () => {
  const f = fixture(async () => { throw new Error('pending_questions'); });
  try {
    f.update(shared()); f.click('end'); await flush();
    assert.equal(f.card.pending, null); assert.equal(f.card.error, 'pending_questions');
    assert.match(f.element.innerHTML, /Someone is waiting to ask/); assert.match(f.element.innerHTML, /data-talk-action="confirmEnd"/);
  } finally { f.card.destroy(); }
});

test('new topic preview and custom settings stay local through updates until explicit opening confirmation', async () => {
  const sent = [], f = fixture(async command => sent.push(clone(command)));
  try {
    f.update(shared()); f.node('.talk-management').open = true; f.click('randomTopic');
    assert.equal(sent.length, 0); assert.equal(f.card.editor.source, 'library'); assert.ok(f.card.editor.topicId);
    f.editorField('source', 'custom', 'change');
    f.editorField('question', '<img src=x onerror="boom"> What can we imagine?');
    f.editorField('title', 'Our next idea'); f.editorField('starter', 'Imagine freely.'); f.editorField('followUps', 'Who would join?\nWhat next?');
    f.editorField('mode', 'write', 'change'); f.editorField('seconds', '30', 'change'); f.editorField('gameMode', 'crazy', 'change');
    f.editorField('crazyMinSeconds', '60', 'change'); f.editorField('crazyMaxSeconds', '180', 'change'); f.editorField('showStarters', true, 'change');
    f.update(shared({ interests: [{ playerNum: 1, until: 8000 }] }));
    assert.match(f.element.innerHTML, /&lt;img src=x onerror=&quot;boom&quot;&gt;/); assert.doesNotMatch(f.element.innerHTML, /<img/);
    assert.equal(f.card.editor.question, '<img src=x onerror="boom"> What can we imagine?'); assert.equal(sent.length, 0);
    f.click('openTopic'); assert.equal(sent.length, 0); assert.equal(f.focusedAction(), 'confirmTopic'); assert.equal(f.scrolls(), 1); assert.match(f.element.innerHTML, /Current turns, missions/);
    f.click('confirmTopic'); await flush();
    assert.equal(sent.length, 1); const command = sent[0];
    assert.equal(command.type, 'newTopic'); assert.equal(command.confirm, true); assert.equal(command.seconds, 30); assert.equal(command.mode, 'write');
    assert.equal(command.gameMode, 'crazy'); assert.equal(command.crazyMinSeconds, 60); assert.equal(command.crazyMaxSeconds, 180); assert.equal(command.crazySeconds, undefined); assert.equal(command.showStarters, true);
    assert.equal(command.topic.followUps.length, 2); assert.equal(command.actor, undefined); assert.equal(command.sessionId, 'ui-topic');
    f.update(shared({ sessionId: 'new-topic', phase: 'thinking', turnId: 0 }));
    assert.equal(f.card.pending, null); assert.equal(f.card.settingsOpen, false); assert.equal(f.card.editor, null);
  } finally { f.card.destroy(); }
});

test('shared cards choose actual follow-ups, publish a custom follow-up and toggle explanations without host credentials', async () => {
  const sent = [], f = fixture(async command => sent.push(clone(command)));
  const talk = shared({ topic: { question: 'What would you build?', followUps: [{ question: 'For whom?' }, { question: 'Where?' }] } });
  const ack = () => f.update({ ...talk, reply: { id: sent.at(-1).id, error: '' } });
  try {
    f.update(talk); f.sharedField('followup', '1'); f.click('showFollowUp'); await flush();
    assert.equal(sent[0].type, 'extend'); assert.equal(sent[0].index, 1); ack();
    f.sharedField('extension', 'How would we begin?', 'input'); f.update(talk); f.click('showCustomFollowUp'); await flush();
    assert.equal(sent[1].type, 'extend'); assert.equal(sent[1].text, 'How would we begin?'); ack();
    f.sharedField('starters', false); await flush(); assert.equal(sent[2].type, 'starters'); assert.equal(sent[2].show, false);
    assert.ok(sent.every(command => command.actor === undefined && command.controlToken === undefined));
  } finally { f.card.destroy(); }
});

test('invalid settings never publish, changing turns clears opening confirmation and the shared editor is bilingual', () => {
  const f = fixture();
  try {
    f.update(shared()); f.click('settings'); f.editorField('source', 'custom', 'change'); f.editorField('question', 'A useful question?');
    f.editorField('seconds', '14', 'change'); f.click('openTopic');
    assert.equal(f.card.confirmation, null); assert.equal(f.card.error, 'invalid_settings'); assert.match(f.element.innerHTML, /15 to 120/);
    f.editorField('seconds', '45', 'change'); f.click('openTopic'); assert.equal(f.card.confirmation, 'topic');
    f.update(shared({ turnId: 3 })); assert.equal(f.card.confirmation, null);
    f.setLanguage('zh'); f.update(shared({ turnId: 3 })); assert.match(f.element.innerHTML, /話題與設定/); assert.match(f.element.innerHTML, /想聊的問題/);
    assert.equal(f.card.editor.question, 'A useful question?');
    f.update(sample({ hostControls: true, actions: { newTopic: true, starters: true, extend: true } }));
    assert.doesNotMatch(f.element.innerHTML, /data-talk-editor|data-talk-shared-input|class="talk-management"/);
  } finally { f.card.destroy(); }
});


test('free conversation has no nominated speaker, turn action or request buttons', () => {
  const f=fixture();
  try { f.update(shared({conversationMode:'free',speaker:null,actions:{end:false,newTopic:true}}));
    assert.match(f.element.innerHTML,/The floor is open/);
    assert.doesNotMatch(f.element.innerHTML,/data-talk-action="(?:end|ask|share|more|ready|wait)"|Participant 0/);
    assert.equal((f.element.innerHTML.match(/Join in/g)||[]).length,2);
  } finally { f.card.destroy(); }
});

test('typed player mission stays local through redraws, queues once and clears only after acknowledgement', async () => {
  const sent=[],f=fixture(async command=>sent.push(clone(command)));
  try {
    const talk={...crazy({source:'players',prompt:null}),conversationMode:'free',speaker:null};
    f.update(talk); f.assignmentField('target','1'); f.assignmentField('kind','task','change');
    f.assignmentField('text','<b>Report the conversation like a weather presenter.</b>');
    f.update({...talk,revision:3}); assert.equal(sent.length,0);
    assert.match(f.element.innerHTML,/&lt;b&gt;Report/); assert.doesNotMatch(f.element.innerHTML,/<b>Report/);
    f.click('crazyAssign');f.click('crazyAssign');await flush();assert.equal(sent.length,1);
    assert.deepEqual({...sent[0],id:'request'},{id:'request',type:'crazyAssign',target:1,kind:'task',text:'<b>Report the conversation like a weather presenter.</b>',sessionId:'ui-topic',turnId:2});
    assert.ok(f.card.crazyDraft.text);
    f.update({...talk,reply:{id:sent[0].id,error:''}}); assert.equal(f.card.crazyDraft.text,'');assert.match(f.element.innerHTML,/Queued/);
  } finally { f.card.destroy(); }
});

test('full queue keeps draft, displays actionable feedback and system-only mode hides composer', async () => {
  const f=fixture(async()=>{throw Error('queue_full')});
  try {
    f.update(crazy({source:'mixed'}));f.assignmentField('text','Announce a silly new holiday.');f.click('crazyAssign');await flush();
    assert.equal(f.card.error,'queue_full');assert.equal(f.card.crazyDraft.text,'Announce a silly new holiday.');assert.match(f.element.innerHTML,/The queue is full/);
    f.update(crazy({source:'system'}));assert.doesNotMatch(f.element.innerHTML,/data-talk-assignment-field|data-talk-action="crazyAssign"/);
  } finally {f.card.destroy();}
});


test('paused dispatch allows queueing and preserves mission draft, and Chinese composition defers redraw', () => {
 const f=fixture();try {
  f.update(crazy({source:'mixed',paused:true,canAssign:true}));
  assert.equal(f.buttons().find(b=>b.dataset.talkAction==='crazyAssign').disabled,false);
  f.assignmentField('text','用主播的口吻聊剛才的話');const html=f.element.innerHTML;
  f.handlers.get('compositionstart')();f.update({...crazy({source:'mixed',paused:true,canAssign:true}),revision:2});
  assert.equal(f.element.innerHTML,html);assert.equal(f.card.crazyDraft.text,'用主播的口吻聊剛才的話');
  f.handlers.get('compositionend')();assert.match(f.element.innerHTML,/用主播的口吻聊剛才的話/);
 } finally {f.card.destroy();}
});


test('handwritten missions default to a random recipient, remain invisible as prompts on acknowledgement and show only own queued count', async () => {
 const sent=[],f=fixture(async command=>sent.push(clone(command)));
 try {
  const talk=crazy({source:'mixed',prompt:null,myQueuedCount:0,canAssign:true});
  f.update(talk);
  assert.match(f.element.innerHTML, /value="random" selected/);assert.equal(f.card.crazyDraft.kind,'task');
  f.assignmentField('text','Cluck like a chicken.');f.click('crazyAssign');await flush();
  assert.equal(sent[0].target,undefined);assert.equal(sent[0].kind,'task');
  f.update({...talk,crazy:{...talk.crazy,myQueuedCount:1},reply:{id:sent[0].id,error:''}});
  assert.match(f.element.innerHTML,/Your cards waiting: 1/);assert.doesNotMatch(f.element.innerHTML,/blockquote/);
  assert.equal(f.card.crazyDraft.target,'random');
 }finally{f.card.destroy();}
});

test('thinking and paused cards can enqueue; a departed chosen recipient returns to random and overlong text is never sent', async () => {
 const sent=[],f=fixture(async command=>sent.push(clone(command)));
 try {
  const talk={...crazy({source:'players',paused:true,canAssign:true,prompt:null}),phase:'thinking',turnId:0};
  f.update(talk);f.assignmentField('target','1');
  f.update({...talk,roster:[{playerNum:2,name:'Sam'},{playerNum:3,name:'Jo'}]});
  assert.equal(f.card.crazyDraft.target,'random');
  f.assignmentField('text','x'.repeat(121));f.click('crazyAssign');await flush();
  assert.equal(sent.length,0);assert.equal(f.card.error,'invalid_crazy_assignment');
  f.assignmentField('text','Sing your next sentence.');f.click('crazyAssign');await flush();
  assert.equal(sent.length,1);assert.equal(sent[0].turnId,0);assert.equal(sent[0].target,undefined);
 }finally{f.card.destroy();}
});

test('shared range fields stay visible for player-only missions and invalid ranges cannot open a topic', () => {
 const f=fixture();try {
  f.update(shared());f.click('settings');f.editorField('gameMode','crazy','change');f.editorField('crazySource','players','change');
  assert.match(f.element.innerHTML,/data-talk-editor-field="crazyMinSeconds"/);assert.match(f.element.innerHTML,/data-talk-editor-field="crazyMaxSeconds"/);
  for(const [min,max] of [[4,10],[30,20],[5,301],[5.5,10]]) {
   f.editorField('crazyMinSeconds',String(min),'change');f.editorField('crazyMaxSeconds',String(max),'change');f.click('openTopic');
   assert.equal(f.card.error,'invalid_crazy_interval');assert.equal(f.card.confirmation,null);
  }
  f.editorField('crazyMinSeconds','5','change');f.editorField('crazyMaxSeconds','5','change');f.click('openTopic');
  assert.equal(f.card.confirmation,'topic');assert.equal(f.card.topicToOpen.crazyMinSeconds,5);
 }finally{f.card.destroy();}
});


test('switching back to Normal Talk cannot publish an invalid hidden Crazy range', async () => {
 const sent=[],f=fixture(async command=>sent.push(clone(command)));
 try {
  f.update(shared());f.click('settings');f.editorField('gameMode','crazy','change');
  f.editorField('crazyMinSeconds','30','change');f.editorField('crazyMaxSeconds','20','change');
  f.editorField('gameMode','normal','change');f.click('openTopic');assert.equal(f.card.confirmation,'topic');
  f.click('confirmTopic');await flush();
  assert.equal(sent[0].gameMode,'normal');assert.equal(sent[0].crazyMinSeconds,60);assert.equal(sent[0].crazyMaxSeconds,180);
 }finally{f.card.destroy();}
});


test('round and mission countdowns disable expired acknowledgements without giving local points', async () => {
 const sent=[],f=fixture(async command=>sent.push(clone(command)));
 try {
  const talk={...crazy({prompt:prompt({expiresAt:4000})}),gameDeadline:8000,scores:[{playerNum:1,score:0},{playerNum:2,score:2}]};
  f.update(talk);assert.match(f.node('[data-talk-round-clock]').textContent,/00:07/);assert.match(f.node('[data-talk-task-clock]').textContent,/00:03/);
  f.setClock(4000);f.card.paint();f.click('crazyDone');f.click('crazySkip');await flush();assert.equal(sent.length,0);
  assert.match(f.node('[data-talk-task-clock]').textContent,/00:00/);assert.equal(f.card.data.talk.scores[1].score,2);
  f.setClock(8000);f.card.paint();assert.match(f.node('[data-talk-round-clock]').textContent,/00:00/);
 }finally{f.card.destroy();}
});

test('rest view freezes results, escapes names and offers a new round without old task or turn controls', () => {
 const f=fixture();try {
  f.update({...shared({phase:'ended',speaker:2,gameMode:'crazy',scores:[{playerNum:1,score:3},{playerNum:2,score:1}],roster:[{playerNum:1,name:'<b>Alex</b>'},{playerNum:2,name:'Sam'}],actions:{newTopic:true,addTime:false,finish:false}}),crazy:{enabled:true,prompt:prompt(),canAssign:false}});
  assert.match(f.element.innerHTML,/Take a break|Round complete/);assert.match(f.element.innerHTML,/3 pts|1 pts/);assert.match(f.element.innerHTML,/&lt;b&gt;Alex&lt;\/b&gt;/);
  assert.doesNotMatch(f.element.innerHTML,/<b>Alex|My soup|data-talk-action="(?:crazyDone|crazySkip|end|addTime|crazyAssign)"/);
  f.click('settings');assert.equal(f.card.settingsOpen,true);assert.equal(f.card.editor.gameMinutes,15);assert.equal(f.card.editor.crazyTaskMinutes,2.5);
 }finally{f.card.destroy();}
});

test('shared player can add one minute with a server command and duration settings survive topic confirmation', async () => {
 const sent=[],f=fixture(async command=>sent.push(clone(command)));
 try {
  const talk=shared({gameSeconds:900,gameDeadline:901000,actions:{newTopic:true,addTime:true,finish:true}});
  f.update(talk);f.click('addTime');await flush();assert.equal(sent[0].type,'addTime');assert.equal(sent[0].seconds,60);assert.equal(sent[0].actor,undefined);
  f.update({...talk,reply:{id:sent[0].id,error:''}});f.click('settings');f.editorField('source','custom','change');f.editorField('question','Which sandwich should we invent?');
  f.editorField('gameMode','crazy','change');f.editorField('gameMinutes','15','change');f.editorField('crazyTaskMinutes','2.5','change');f.click('openTopic');f.click('confirmTopic');await flush();
  assert.equal(sent[1].gameSeconds,900);assert.equal(sent[1].crazyTaskSeconds,150);
 }finally{f.card.destroy();}
});

test('invalid round or task lengths keep a new topic local and give clear feedback', () => {
 const f=fixture();try {
  f.update(shared());f.click('settings');f.editorField('source','custom','change');f.editorField('question','What should we build?');
  for(const value of ['0','61','abc']) {f.editorField('gameMinutes',value,'change');f.click('openTopic');assert.equal(f.card.confirmation,null);assert.equal(f.card.error,'invalid_game_seconds');}
  f.editorField('gameMinutes','15','change');f.editorField('gameMode','crazy','change');
  for(const value of ['0','5.1','abc']) {f.editorField('crazyTaskMinutes',value,'change');f.click('openTopic');assert.equal(f.card.confirmation,null);assert.equal(f.card.error,'invalid_crazy_task_seconds');}
 }finally{f.card.destroy();}
});

test('pending queue request leaves the next card editable and ACK preserves a newer draft', async () => {
  const sent=[], f=fixture(async command=>sent.push(clone(command)));
  try {
    const talk={...crazy({source:'mixed',prompt:null,canAssign:true}),sharedControls:true}; f.update(talk);
    f.assignmentField('text','First mission'); f.click('crazyAssign'); await flush();
    assert.ok(f.card.pending); assert.equal(f.buttons().find(b=>b.dataset.talkAction==='crazyAssign').disabled,true);
    assert.ok(f.fields().filter(n=>n.dataset.talkAssignmentField).every(n=>n.disabled===false));
    f.assignmentField('target','1','change'); f.assignmentField('kind','line','change'); f.assignmentField('text','Next mission');
    f.setClock(201000); f.card.paint(); f.click('retry'); await flush();
    assert.deepEqual(sent[1],sent[0]); assert.equal(sent[1].text,'First mission'); assert.equal(sent[1].target,undefined);
    f.update({...talk,reply:{id:sent[0].id,error:''}});
    assert.equal(f.card.pending,null); assert.equal(f.card.crazyDraft.text,'Next mission'); assert.equal(f.card.crazyDraft.target,'1');
    f.click('crazyAssign'); await flush(); assert.equal(sent[2].text,'Next mission'); assert.equal(sent[2].target,1); assert.equal(sent[2].kind,'line');
    f.update({...talk,reply:{id:sent[2].id,error:''}}); assert.equal(f.card.crazyDraft.text,'');
  } finally {f.card.destroy();}
});

test('previously acknowledged mailbox IDs cannot recover a false pending lock after delayed projections', async () => {
  const sent=[],f=fixture(async command=>sent.push(clone(command)));
  try {
    const talk=crazy({source:'mixed',prompt:null,canAssign:true}); f.update(talk);
    for(let i=0;i<5;i++) {
      f.assignmentField('text','Mission '+i); f.click('crazyAssign'); await flush();
      const command=sent.at(-1); f.update({...talk,reply:{id:command.id,error:''}}, {talkAction:command});
      assert.equal(f.card.pending,null);
    }
    f.update({...talk,reply:{id:sent.at(-1).id,error:''}}, {talkAction:sent[0]});
    assert.equal(f.card.pending,null); assert.equal(f.buttons().find(b=>b.dataset.talkAction==='crazyAssign').disabled,false);
    f.update({...talk,sessionId:'next-session'}, {talkAction:sent.at(-1)});
    assert.equal(f.card.pending,null); assert.equal(f.card.settledActions.size,0);
  } finally {f.card.destroy();}
});

test('unacknowledged recovery keeps a frozen request while composer follows offline, blocked and ended states', () => {
  const f=fixture(),talk={...crazy({source:'players',prompt:null,canAssign:true}),sharedControls:true};
  const action={id:'unknown',type:'crazyAssign',text:'Original mission',kind:'task',sessionId:talk.sessionId,turnId:talk.turnId};
  try {
    f.update(talk,{talkAction:action}); f.setClock(201000); f.card.paint();
    assert.equal(f.card.pending,action); assert.ok(f.fields().filter(n=>n.dataset.talkAssignmentField).every(n=>!n.disabled));
    f.setOnline(false); f.card.paint(); assert.ok(f.fields().filter(n=>n.dataset.talkAssignmentField).every(n=>n.disabled));
    f.setOnline(true); f.update(crazy({source:'players',prompt:null,canAssign:false}),{talkAction:action});
    assert.ok(f.fields().filter(n=>n.dataset.talkAssignmentField).every(n=>n.disabled));
    f.handlers.get('compositionstart')(); f.update({...talk,phase:'ended'});
    assert.equal(f.card.pending,null); assert.doesNotMatch(f.element.innerHTML,/data-talk-assignment-field|data-talk-action="crazyAssign"/);
  } finally {f.card.destroy();}
});

test('Chinese composition of the next card survives ACK for the previously sent mission', async () => {
  const sent=[],f=fixture(async command=>sent.push(clone(command)));
  try {
    const talk=crazy({source:'mixed',prompt:null,canAssign:true}); f.update(talk);
    f.assignmentField('text','First'); f.click('crazyAssign'); await flush();
    f.handlers.get('compositionstart')(); f.assignmentField('text','雞叫');
    f.update({...talk,reply:{id:sent[0].id,error:''}}); f.handlers.get('compositionend')();
    assert.equal(f.card.pending,null); assert.equal(f.card.crazyDraft.text,'雞叫');
  } finally {f.card.destroy();}
});

test('ACK keeps reused mission text when recipient or type was changed for the next card', async () => {
  const sent=[],f=fixture(async command=>sent.push(clone(command)));
  try {
    const talk=crazy({source:'mixed',prompt:null,canAssign:true}); f.update(talk);
    f.assignmentField('text','Cluck like a chicken.'); f.click('crazyAssign'); await flush();
    f.assignmentField('target','1','change'); f.update({...talk,reply:{id:sent.at(-1).id,error:''}});
    assert.equal(f.card.crazyDraft.text,'Cluck like a chicken.');
    f.click('crazyAssign'); await flush(); f.assignmentField('kind','line','change');
    f.update({...talk,reply:{id:sent.at(-1).id,error:''}}); assert.equal(f.card.crazyDraft.text,'Cluck like a chicken.');
  } finally {f.card.destroy();}
});
