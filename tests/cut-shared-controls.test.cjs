// Shared CUT card controls run against the real rules, adapter and sealed service.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../cut-engine.js');
const UI = require('../cut-ui.js');
const { adapters: { cut: adapter } } = require('../runtime/party-executor.cjs');
const { createExecutor } = require('../runtime/hub-executor-core.cjs');
let serial = 0;
const create = () => C.create({ id: 'shared-cut-room', now: 1000, seed: 19,
  roster: [1, 2, 3].map(playerNum => ({ playerNum, name: 'Player ' + playerNum })) });
const ctx = (state, playerNum = 2) => ({ code: 'CUTX', actor: playerNum, seat: { playerNum },
  now: state.lastChangeAt + 1, seed: 91, revision: 12, hostLiveUntil: 10 });
const command = (state, type, extra = {}) => ({ id: 'shared-command-' + ++serial, type,
  sessionId: state.sessionId, turnId: state.turnId, ...extra });
const act = (state, type, playerNum = 2, extra = {}) => adapter.apply(state, command(state, type, extra), ctx(state, playerNum));
const project = (state, playerNum = 2) => adapter.project(state, { playerNum }, ctx(state, playerNum));

test('a different active player can finish settings left open by an absent player', () => {
  let state = act(create(), 'begin');
  state = adapter.pulse(state, { ...ctx(state), now: state.phaseUntil });
  const topic = structuredClone(state.topic), stats = structuredClone(state.stats), sequence = state.speakerSequence;
  state = act(state, 'settings', 1);
  assert.equal(state.phase, 'setup'); assert.equal(state.deadline, null);
  state = act(state, 'configure', 2, { speed: 'chill', category: 'absurd' });
  assert.equal(state.phase, 'ready'); assert.equal(state.speed, 'chill'); assert.equal(state.category, 'absurd');
  assert.deepEqual(state.topic, topic); assert.deepEqual(state.stats, stats); assert.equal(state.speakerSequence, sequence);
  assert.equal(state.deadline, null); assert.equal(state.phaseUntil, null);
  state = act(state, 'settings', 2); state = act(state, 'cancelSettings', 3);
  assert.equal(state.phase, 'ready'); assert.equal(state.speed, 'chill');
  const view = project(state).cut;
  assert.equal(view.sharedControls, true);
  for (const privateField of ['deadline', 'speakingDurationMs', 'pendingDurationMs', 'stats', 'seen', 'replies']) assert.equal(privateField in view, false);
});

test('shared settings validate options and refuse stale saves without losing the edit state', () => {
  const state = act(create(), 'settings');
  for (const extra of [{ speed: 'invalid' }, { category: '<script>' }]) {
    const next = act(state, 'configure', 3, extra);
    assert.equal(next.phase, 'setup'); assert.equal(next.speed, state.speed);
    assert.equal(next.replies[3].error, 'invalid_options');
  }
  const stale = act(state, 'configure', 3, { turnId: state.turnId - 1, speed: 'chaos', category: 'real' });
  assert.equal(stale.phase, 'setup'); assert.equal(stale.replies[3].error, 'stale_turn');
  const wrongSession = act(state, 'cancelSettings', 3, { sessionId: 'another-room' });
  assert.deepEqual(wrongSession, state);
});

test('restart resets the game once while preserving the sealed session, roster, settings and dedup fences', () => {
  let state = act(create(), 'exclude', 2, { playerNum: 3, active: false });
  state = act(state, 'settings'); state = act(state, 'configure', 1, { speed: 'chaos', category: 'real' });
  state = act(state, 'begin'); state = adapter.pulse(state, { ...ctx(state), now: state.phaseUntil });
  state = act(state, 'stop');
  const before = structuredClone(state), input = command(state, 'restart');
  const next = adapter.apply(state, input, ctx(state, 1));
  assert.equal(next.phase, 'ready'); assert.equal(next.sessionId, before.sessionId);
  assert.equal(next.turnId, before.turnId + 1); assert.equal(next.round, 1);
  assert.equal(next.speed, before.speed); assert.equal(next.category, before.category);
  assert.deepEqual(next.roster, before.roster); assert.deepEqual(next.stats, {}); assert.deepEqual(next.recent, []);
  assert.equal(next.speakerSequence, 0); assert.equal(next.cutsCompleted, 0);
  assert.equal(next.pause, null); assert.equal(next.deadline, null); assert.equal(next.phaseUntil, null);
  assert.equal(next.topicHistory.length, 1); assert.equal(next.topic.category, 'real');
  assert.ok(before.seen[2].every(id => next.seen[2].includes(id)));
  assert.equal(next.replies[1].id, input.id); assert.equal(next.replies[1].error, '');
  assert.deepEqual(adapter.apply(next, input, ctx(next, 1)), next, 'replaying the same restart is ignored');
  const competing = adapter.apply(next, { ...input, id: 'competing-restart' }, ctx(next, 2));
  assert.equal(competing.turnId, next.turnId); assert.deepEqual(competing.topic, next.topic);
  assert.equal(competing.replies[2].error, 'stale_turn');
  for (const type of ['stop', 'settings', 'begin', 'configure']) {
    const late = act(next, type, 2, { turnId: before.turnId, speed: 'normal' });
    assert.equal(late.phase, 'ready'); assert.equal(late.turnId, next.turnId); assert.equal(late.replies[2].error, 'stale_turn');
  }
  const oldTimer = C.apply(next, { ...input, id: 'old-deadline', type: 'tick', actor: 0, now: 900000, seed: 5 });
  assert.equal(oldTimer, next);
});

test('stopped games allow sitting-out seats to return without starting, and restart requires two active players', () => {
  let state = act(create(), 'stop');
  state = act(state, 'exclude', 2, { playerNum: 1, active: false });
  state = act(state, 'exclude', 2, { playerNum: 3, active: false });
  assert.equal(state.phase, 'stopped'); assert.equal(state.deadline, null);
  assert.equal(act(state, 'restart', 2).replies[2].error, 'not_enough_players');
  assert.equal(act(state, 'restart', 1).replies[1].error, 'not_available');
  const turn = state.turnId;
  state = act(state, 'exclude', 1, { playerNum: 1, active: true });
  assert.equal(state.phase, 'stopped'); assert.equal(state.turnId, turn + 1);
  assert.equal(state.deadline, null); assert.equal(state.speaker, null);
  state = act(state, 'restart', 1); assert.equal(state.phase, 'ready');
  assert.equal(state.roster.find(p => p.playerNum === 3).active, false);
});

test('ordinary legacy players cannot elevate settings, stop or restart with a forged shared flag', () => {
  const state = create();
  for (const type of ['settings', 'configure', 'cancelSettings', 'stop', 'restart']) {
    const next = C.apply(state, { ...command(state, type), actor: 2, now: 1001, seed: 6, sharedControls: true });
    assert.equal(next.phase, 'ready'); assert.equal(next.replies[2].error, 'not_available');
    assert.equal(next.sharedControls, undefined);
  }
  const legacyHost = C.apply(state, { ...command(state, 'restart'), actor: 0, now: 1001, seed: 6 });
  assert.equal(legacyHost.replies[0].error, 'not_available');
});

function cardFixture() {
  const sent = [], handlers = {}, status = { textContent: '' }, connection = { textContent: '' };
  let html = '', writes = 0, form = null, details = null, online = true;
  const element = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value; writes++;
      details = html.includes('data-cut-management') ? { open: false } : null;
      form = null;
      if (html.includes('data-cut-settings>')) {
        const fields = {};
        for (const name of ['speed', 'category']) {
          const select = html.match(new RegExp('<select name="' + name + '"[^>]*>(.*?)</select>', 's'))[1];
          fields[name] = { value: select.match(/<option value="([^"]+)" selected/)[1], disabled: false };
        }
        for (const name of ['customMinSeconds', 'customMaxSeconds']) {
          const input = html.match(new RegExp('<input type="number" name="' + name + '"[^>]*value="([^"]+)"'));
          fields[name] = { value: input[1], disabled: false, required: false, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } };
        }
        const save = { disabled: false }, customFields = { hidden: true }, customError = { textContent: '' };
        form = { fields, save, customFields, customError, closest: selector => selector === '[data-cut-settings]' ? form : null,
          querySelector: selector => selector === '[data-cut-settings-save]' ? save : selector === '[data-cut-custom-fields]' ? customFields : selector === '[data-cut-custom-error]' ? customError : fields[selector.match(/name="(\w+)"/)?.[1]] || null,
          querySelectorAll: () => Object.values(fields) };
      }
    },
    querySelector(selector) {
      if (selector === '[data-cut-settings]') return form;
      if (selector === '[data-cut-management]') return details;
      if (selector === '[data-cut-action-status]') return status;
      if (selector === '[data-cut-connection]') return connection;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { handlers[type] = handler; },
    removeEventListener(type, handler) { assert.equal(handlers[type], handler); delete handlers[type]; },
  };
  const card = new UI.Card(element, { now: () => 100000, connected: () => online, send: async input => { sent.push(input); } });
  return { card, sent, element, status, connection, handlers,
    get writes() { return writes; }, get form() { return form; }, get details() { return details; }, set online(value) { online = value; },
    click(type) { handlers.click({ target: { closest: selector => selector === '[data-cut-action]' ? ({ disabled: false, dataset: { cutAction: type } }) : null } }); },
    change(name, value) { form.fields[name].value = String(value); handlers.input({ target: { closest: selector => selector === '[data-cut-settings]' ? form : null } }); },
    submit() { let prevented = false; handlers.submit({ target: form, preventDefault() { prevented = true; } }); assert.equal(prevented, true); } };
}

test('an expired-host card submits settings with current fences and preserves an unsaved draft through heartbeats', async () => {
  const f = cardFixture(); let state = create();
  try {
    f.card.update(project(state)); assert.equal(f.card.canAction('settings'), true);
    assert.match(f.element.innerHTML, /data-cut-action="settings"/); assert.equal(f.connection.textContent, '');
    f.details.open = true; f.click('settings'); await Promise.resolve();
    assert.equal(f.sent.length, 1); assert.equal(f.sent[0].sessionId, state.sessionId); assert.equal(f.sent[0].turnId, state.turnId);
    state = adapter.apply(state, f.sent[0], ctx(state)); f.card.update(project(state));
    assert.equal(state.phase, 'setup'); assert.equal(f.details.open, true); assert.equal(f.card.pending, null);
    assert.match(f.element.innerHTML, /data-cut-settings/); assert.doesNotMatch(f.element.innerHTML, /data-cut-action="begin"/);
    f.form.fields.speed.value = 'chill'; f.form.fields.category.value = 'absurd';
    const form = f.form, writes = f.writes;
    f.card.update({ ...project(state), cut: { ...project(state).cut, revision: 13, hostLiveUntil: 5 } });
    assert.equal(f.writes, writes); assert.equal(f.form, form); assert.equal(f.form.fields.speed.value, 'chill');
    f.submit(); f.submit(); await Promise.resolve();
    assert.equal(f.sent.length, 2); assert.equal(f.sent[1].type, 'configure');
    assert.equal(f.sent[1].speed, 'chill'); assert.equal(f.sent[1].category, 'absurd');
    assert.equal(f.sent[1].turnId, state.turnId); assert.equal(f.form.save.disabled, true);
    assert.equal(f.form.fields.speed.disabled, true);
    state = adapter.apply(state, f.sent[1], ctx(state)); f.card.update(project(state));
    assert.equal(state.phase, 'ready'); assert.equal(f.card.pending, null); assert.equal(f.form, null);
    assert.equal(f.card.canBegin(), true);
  } finally { f.card.destroy(); assert.deepEqual(Object.keys(f.handlers), []); }
});

test('another card can cancel a stranded setup and invalid saves have a useful recoverable message', async () => {
  const f = cardFixture(); let state = act(create(), 'settings', 1);
  try {
    f.card.update(project(state)); f.click('cancelSettings'); await Promise.resolve();
    assert.equal(f.sent[0].type, 'cancelSettings'); assert.equal(f.sent[0].turnId, state.turnId);
    state = adapter.apply(state, f.sent[0], ctx(state)); f.card.update(project(state));
    assert.equal(state.phase, 'ready'); assert.equal(f.card.pending, null);
    state = act(state, 'settings', 1);
    const pending = command(state, 'configure', { speed: 'invalid' });
    f.card.update({ ...project(state), cutAction: pending });
    assert.equal(f.card.pending, pending); assert.equal(f.form.save.disabled, true);
    state = adapter.apply(state, pending, ctx(state)); f.card.update(project(state));
    assert.equal(f.card.pending, null); assert.match(f.status.textContent, /有效的速度/); assert.equal(f.form.save.disabled, false);
    f.online = false; f.card.paint(); assert.equal(f.form.save.disabled, true); assert.equal(f.card.canAction('cancelSettings'), false);
  } finally { f.card.destroy(); }
});

test('the stopped card keeps a fenced Restart while inactive and legacy cards retain their own limits', async () => {
  const f = cardFixture(); let state = act(create(), 'stop');
  try {
    f.card.update(project(state)); assert.match(f.element.innerHTML, /data-cut-action="restart"/);
    assert.equal(f.card.canAction('restart'), true); assert.equal(f.card.canAction('stop'), false);
    assert.equal(f.card.canAction('pause'), false); assert.equal(f.card.canBegin(), false);
    f.click('restart'); f.click('restart'); await Promise.resolve(); assert.equal(f.sent.length, 1);
    const priorTurn = state.turnId; state = adapter.apply(state, f.sent[0], ctx(state)); f.card.update(project(state));
    assert.equal(state.turnId, priorTurn + 1); assert.equal(f.card.pending, null); assert.equal(f.card.canBegin(), true);
    state = act(state, 'exclude', 1, { playerNum: 2, active: false }); state = act(state, 'stop', 1);
    f.card.update(project(state)); assert.equal(f.card.canAction('restart'), false); assert.equal(f.card.canAction('settings'), false);
    assert.equal(f.card.canAction('exclude', { playerNum: 2, active: true }), true);
    assert.doesNotMatch(f.element.innerHTML, /data-cut-action="restart"|data-cut-settings/);
    f.card.update(C.view(create(), 2, 100000));
    assert.equal(f.card.canAction('settings'), false); assert.equal(f.card.canAction('restart'), false);
    assert.doesNotMatch(f.element.innerHTML, /data-cut-management|data-cut-settings/);
  } finally { f.card.destroy(); }
});

test('sealed service accepts card settings, stop and restart without a host and rejects late old-turn operations', async () => {
  let clock = 1000; const code = 'CUTX', controlToken = 'f'.repeat(32);
  const seats = [1, 2, 3].map(playerNum => ({ playerNum, token: String(playerNum).repeat(32) }));
  const path = token => `rooms/${code}/players/${token}`;
  const values = new Map([[path(controlToken), { stateJson: JSON.stringify(create()), revision: 1 }]]), revisions = new Map();
  for (const seat of seats) values.set(path(seat.token), { game: 'previous', playerNum: seat.playerNum });
  const clone = value => value == null ? null : structuredClone(value);
  const fetchImpl = async (url, input = {}) => {
    const p = new URL(url).pathname.slice(1).replace(/\.json$/, '');
    const etag = '"' + (revisions.get(p) || 0) + '"';
    if (input.method === 'PUT') {
      assert.equal(input.headers['If-Match'], etag, 'every service write must be conditional');
      values.set(p, JSON.parse(input.body)); revisions.set(p, (revisions.get(p) || 0) + 1);
    }
    return { ok: true, status: 200, headers: { get: name => name === 'etag' ? etag : null }, json: async () => clone(values.get(p)) };
  };
  const service = createExecutor({ secret: '42'.repeat(32), databaseURL: 'http://localhost:9999', games: { cut: adapter }, now: () => clock, fetchImpl });
  await service.register({ game: 'cut', code, controlToken, seats });
  const state = () => JSON.parse(values.get(path(controlToken)).stateJson);
  const card = n => values.get(path(seats[n - 1].token));
  const capsule = card(2).hubExecutor.capsule;
  async function perform(n, type, extra = {}) {
    const input = command(state(), type, extra), token = seats[n - 1].token;
    const p = path(token); values.set(p, { ...card(n), cutAction: input }); revisions.set(p, (revisions.get(p) || 0) + 1);
    clock++;
    await service.execute({ capsule: card(n).hubExecutor.capsule, token });
    return input;
  }
  await perform(2, 'settings'); assert.equal(card(3).cut.phase, 'setup');
  await perform(3, 'configure', { speed: 'chill', category: 'absurd' }); assert.equal(state().phase, 'ready');
  await perform(2, 'stop'); assert.equal(card(3).cut.phase, 'stopped');
  const oldTurn = state().turnId, restart = await perform(3, 'restart');
  assert.equal(state().phase, 'ready'); assert.equal(state().turnId, oldTurn + 1);
  assert.equal(card(1).hubExecutor.capsule, capsule); assert.equal(card(2).cut.sessionId, 'shared-cut-room');
  assert.equal(card(3).cut.reply.id, restart.id); assert.equal(card(3).cut.reply.error, '');
  await perform(2, 'stop', { turnId: oldTurn });
  assert.equal(state().phase, 'ready'); assert.equal(card(2).cut.reply.error, 'stale_turn');
  await service.execute({ capsule, token: seats[2].token, command: restart });
  assert.equal(state().turnId, oldTurn + 1); assert.equal(state().phase, 'ready');
});


test('shared custom timing survives restart and unlimited CUTs without disclosing the drawn deadline', () => {
  let state = act(create(), 'settings', 1);
  state = act(state, 'configure', 2, { speed: 'custom', customMinSeconds: 30, customMaxSeconds: 30 });
  state = act(state, 'stop', 1); const before = state.turnId;
  state = act(state, 'restart', 2);
  assert.equal(state.turnId, before + 1); assert.equal(state.speed, 'custom');
  assert.equal(state.customMinSeconds, 30); assert.equal(state.customMaxSeconds, 30);
  const topic = state.topic.id;
  state = act(state, 'begin', 2);
  state = adapter.pulse(state, { ...ctx(state), now: state.phaseUntil });
  for (let turn = 0; turn < 12; turn++) {
    assert.equal(state.deadline - state.lastChangeAt, 30000);
    const visible = project(state).cut;
    assert.equal(visible.customMinSeconds, 30); assert.equal(visible.customMaxSeconds, 30);
    assert.equal(visible.canEndTopic, true); assert.equal('deadline' in visible, false);
    state = adapter.pulse(state, { ...ctx(state), now: state.deadline });
    assert.equal(state.phase, 'cut'); assert.equal(state.topic.id, topic); assert.equal(state.targetCuts, null);
    assert.equal(state.cutEvent.final, false); assert.equal(state.phaseUntil, null);
    state = act(state, 'begin', 1);
  }
  state = act(state, 'endTopic', 2); assert.equal(state.phase, 'break');
  state = act(state, 'next', 1); assert.equal(state.phase, 'ready'); assert.notEqual(state.topic.id, topic);
});

test('card custom seconds reject invalid ranges while inputs remain editable and presets preserve saved bounds', async () => {
  const f = cardFixture(); let state = act(create(), 'settings', 1);
  try {
    f.card.update(project(state));
    assert.match(f.element.innerHTML, /option value="custom"/);
    f.change('speed', 'custom'); assert.equal(f.form.customFields.hidden, false);
    assert.equal(f.form.fields.customMinSeconds.required, true);
    for (const [min, max] of [['', '25'], ['4', '25'], ['15.5', '25'], ['15', '121'], ['26', '25']]) {
      f.change('customMinSeconds', min); f.change('customMaxSeconds', max); f.submit();
      assert.equal(f.sent.length, 0); assert.equal(f.form.save.disabled, true);
      assert.equal(f.form.fields.customMinSeconds.disabled, false, 'invalid inputs must remain editable');
      assert.equal(f.form.fields.speed.disabled, false);
      assert.equal(f.form.fields.customMinSeconds.attributes['aria-invalid'], 'true');
      assert.match(f.form.customError.textContent, /5–120/);
    }
    f.change('customMinSeconds', '30'); f.change('customMaxSeconds', '30');
    assert.equal(f.form.save.disabled, false); assert.equal(f.form.customError.textContent, '');
    f.submit(); await Promise.resolve(); assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].customMinSeconds, 30); assert.equal(f.sent[0].customMaxSeconds, 30);
    state = adapter.apply(state, f.sent[0], ctx(state)); f.card.update(project(state));
    state = act(state, 'settings', 1); f.card.update(project(state));
    assert.equal(f.form.fields.customMinSeconds.value, '30'); assert.equal(f.form.fields.customMaxSeconds.value, '30');
    f.change('customMinSeconds', '130'); f.change('customMaxSeconds', ''); f.change('speed', 'normal');
    assert.equal(f.form.customFields.hidden, true); assert.equal(f.form.fields.customMinSeconds.disabled, true);
    assert.equal(f.form.fields.customMinSeconds.required, false); assert.equal(f.form.customError.textContent, '');
    assert.equal(f.form.save.disabled, false); f.submit(); await Promise.resolve();
    assert.equal(f.sent.length, 2); assert.equal(f.sent[1].speed, 'normal');
    assert.equal(f.sent[1].customMinSeconds, 30); assert.equal(f.sent[1].customMaxSeconds, 30);
    state = adapter.apply(state, f.sent[1], ctx(state)); assert.equal(state.phase, 'ready');
    assert.equal(state.customMinSeconds, 30); assert.equal(state.customMaxSeconds, 30);
  } finally { f.card.destroy(); }
});
