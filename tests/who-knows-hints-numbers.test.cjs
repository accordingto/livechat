'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../who-knows-engine.js'), W = require('../who-knows-words.js'), UI = require('../who-knows-ui.js');
const clone = value => JSON.parse(JSON.stringify(value));
function game(settings = {}, count = 5, seed = 71) {
  let now = 1000000, serial = 0;
  const g = { state: E.create({ id: 'new-questions-' + seed, roster: Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: 'Player ' + (i + 1) })), settings, now, seed }) };
  g.cmd = (actor, type, extra = {}) => {
    const input = { id: 'command-' + ++serial, type, actor, sessionId: g.state.sessionId, stage: g.state.stage, now, seed: serial * 173, ...extra };
    g.state = E.apply(g.state, input);
    return g.state.replies?.[actor]?.error || '';
  };
  g.choose = () => { assert.equal(g.cmd(g.state.round.mayor, 'choose', { wordId: g.state.round.options[0] }), ''); };
  g.begin = () => { g.choose(); now += 5000; g.cmd(0, 'tick'); assert.equal(g.state.phase, 'questions'); };
  g.advance = value => { now += value; };
  g.asker = () => g.state.round.players.find(n => n !== g.state.round.mayor);
  g.ask = answer => { const n = g.asker(); g.cmd(n, 'raise', { text: 'What does this number remind you of?' }); return g.cmd(g.state.round.mayor, 'answer', { askId: g.state.round.current.id, answer }); };
  return g;
}

test('opening clues stay broad in every selectable word pool, not just the full catalog', () => {
  for (const difficulty of ['mixed', ...W.LEVELS]) {
    const words = difficulty === 'mixed' ? W.items : W.pool(difficulty), groups = new Map();
    for (const word of words) {
      const hint = W.broadHint(word.id, difficulty);
      assert.ok(hint.en && hint.zh, word.id);
      assert.doesNotMatch(hint.en + hint.zh, /[<>]|\d/);
      const key = JSON.stringify(hint); groups.set(key, (groups.get(key) || 0) + 1);
      assert.notEqual(hint.en.toLowerCase(), word.en.toLowerCase());
      assert.notEqual(hint.zh, word.zh);
    }
    assert.ok(Math.min(...groups.values()) >= 8, difficulty + ': no near-singleton clue groups');
  }
  assert.match(W.broadHint(W.items.find(word => word.en === 'Snowman').id, 'hard').en, /Physical things/);
  assert.match(W.broadHint(W.items.find(word => word.en === 'Money').id).en, /Objects/);
  assert.equal(W.broadHint('not-a-word'), null);
});

test('the normal word game and hidden opening clue remain the defaults; new options validate strictly', () => {
  const g = game(); assert.equal(g.state.settings.targetKind, 'word'); assert.equal(g.state.settings.broadHint, false); assert.equal(g.state.settings.numberMax, 1000);
  g.begin(); assert.equal(E.view(g.state, 0).wk.broadHint, null);
  for (const settings of [{ broadHint: 'yes' }, { targetKind: 'anything' }, { numberMax: 1 }, { numberMax: 200 }, { numberMax: 100.5 }]) assert.throws(() => game(settings), /invalid_options/);
});

test('a chosen word freezes one public bilingual clue, shared by host and every seat without revealing the word', () => {
  const g = game({ broadHint: true, difficulty: 'hard' });
  assert.equal(E.view(g.state, 0).wk.broadHint, null, 'no clue before choosing an answer');
  g.choose(); const round = g.state.round, expected = W.broadHint(round.wordId, 'hard');
  assert.deepEqual(round.hintSnapshot, expected);
  for (let n = 0; n <= 5; n++) {
    const wk = E.view(g.state, n).wk; assert.deepEqual(wk.broadHint, expected); assert.equal(wk.word, null);
    assert.ok(UI.stage(E.view(g.state, 0).wk).includes(expected.en));
  }
  g.state.round.hintSnapshot = { en: 'An already revealed broad clue', zh: '已公開的大範圍' };
  g.cmd(0, 'pause'); assert.deepEqual(E.view(g.state, 0).wk.broadHint, g.state.round.hintSnapshot, 'a reconnect uses saved wording');
});

test('changing clue or answer type mid-round only affects the next deal, retaining the current word, clock and histories', () => {
  const g = game(); g.begin(); const saved = clone(g.state), wordId = saved.round.wordId;
  g.cmd(0, 'settings', { settings: { broadHint: true, targetKind: 'number', numberMax: 1000 } });
  assert.equal(g.state.round.wordId, wordId); assert.equal(g.state.deadline, saved.deadline);
  assert.equal(g.state.round.targetKind, 'word'); assert.equal(E.view(g.state, 0).wk.broadHint, null);
  assert.deepEqual(g.state.wordHistory, saved.wordHistory); assert.deepEqual(g.state.scores, saved.scores);
  g.cmd(0, 'void'); g.cmd(0, 'next');
  assert.equal(g.state.round.targetKind, 'number'); assert.equal(g.state.round.numberMax, 1000); assert.equal(g.state.round.broadHint, true);
});

test('number options are three distinct integers in the configured pool; only authorized identities see the chosen answer', () => {
  for (const mode of E.MODES) for (const count of [4, 9]) {
    const numberMax = 1000;
    const g = game({ mode, targetKind: 'number', numberMax }, count, count + numberMax);
    const r = g.state.round, options = E.view(g.state, r.mayor).wk.me.options;
    assert.equal(options.length, 3); assert.equal(new Set(options.map(x => x.id)).size, 3);
    assert.ok(options.every(x => x.kind === 'number' && Number.isInteger(Number(x.en)) && Number(x.en) >= 1 && Number(x.en) <= numberMax));
    for (let n = 0; n <= count; n++) if (n !== r.mayor) assert.equal(E.view(g.state, n).wk.me?.options ?? null, null);
    g.begin(); assert.equal(g.state.round.tokens, 0, 'open answers do not consume a yes/no budget');
    for (let n = 0; n <= count; n++) {
      const wk = E.view(g.state, n).wk, role = g.state.round.roles[n], knows = n === r.mayor || ['insider', 'seer', 'werewolf'].includes(role);
      assert.equal(wk.targetKind, 'number'); assert.equal(wk.word, null); assert.equal(wk.broadHint, null);
      if (n > 0) { assert.equal(!!wk.me.word, knows); assert.equal('numberMax' in wk.settings, false); }
    }
  }
});

test('old saved 1–100 settings upgrade the next deal without changing the active number, clue, clock or history', () => {
  for (const mode of E.MODES) {
    const g = game({ mode, targetKind: 'number', broadHint: true });
    // A real earlier-version snapshot had a per-round pool and three options.
    g.state.settings.numberMax = 100; g.state.round.numberMax = 100;
    g.state.round.options = ['wk-n-11', 'wk-n-27', 'wk-n-95'];
    g.begin();
    const before = clone(g.state), hint = E.view(g.state, 0).wk.broadHint;
    assert.equal(g.state.settings.numberMax, 1000, 'future settings migrate automatically');
    assert.equal(g.state.round.numberMax, 100); assert.equal(g.state.round.wordId, 'wk-n-11');
    assert.deepEqual(hint, { en: 'An integer from 1 to 100', zh: '1 到 100 之間的整數' });
    assert.equal(E.view(before, 0).wk.settings.numberMax, 1000);
    g.cmd(0, 'settings', { settings: { numberMax: 100 } });
    assert.equal(g.state.settings.numberMax, 1000, 'legacy form submissions cannot keep future rounds at 100');
    assert.equal(g.state.round.numberMax, 100); assert.equal(g.state.round.wordId, before.round.wordId);
    assert.equal(g.state.deadline, before.deadline); assert.deepEqual(g.state.wordHistory, before.wordHistory);
    assert.deepEqual(g.state.scores, before.scores); assert.deepEqual(E.view(g.state, 0).wk.broadHint, hint);
    g.cmd(0, 'void'); g.cmd(0, 'next');
    assert.equal(g.state.round.numberMax, 1000); assert.equal(g.state.round.targetKind, 'number');
    g.choose(); assert.deepEqual(E.view(g.state, 0).wk.broadHint, { en: 'An integer from 1 to 1000', zh: '1 到 1000 之間的整數' });
    assert.ok(g.state.wordHistory.used.includes('wk-n-11'), 'old question memory survives the upgrade');
  }
  assert.equal(game({ targetKind: 'number', numberMax: 100 }).state.round.numberMax, 1000, 'new games normalize legacy settings too');
});

test('free spoken number answers advance the existing question queue without shortening or restarting the clock', () => {
  for (const mode of E.MODES) {
    const g = game({ mode, targetKind: 'number' }); g.begin(); const deadline = g.state.deadline, id = g.state.round.wordId;
    assert.deepEqual(E.view(g.state, g.state.round.mayor).wk.me.answers, ['spoken', 'correct']);
    assert.equal(g.ask('spoken'), '');
    assert.equal(g.state.phase, 'questions'); assert.equal(g.state.round.current, null);
    assert.equal(g.state.round.log.at(-1).answer, 'spoken'); assert.equal(g.state.round.tokensUsed, 0);
    assert.equal(g.state.deadline, deadline); assert.equal(g.state.round.wordId, id);
  }
});

test('a correct number uses the original identity-specific ending and scoring pipeline', () => {
  for (const mode of E.MODES) {
    const g = game({ mode, targetKind: 'number' }); g.begin();
    assert.equal(g.ask('correct'), ''); assert.equal(g.state.phase, mode === 'insider' ? 'speaking' : 'hunt');
    const wk = E.view(g.state, 0).wk; assert.equal(wk.word.kind, 'number');
    if (mode === 'insider') assert.equal(wk.speaking.after, 'judge'); else assert.equal(wk.wolves.length, 1);
    assert.deepEqual(g.state.scores, {}, 'finding the answer alone does not settle identity points early');
  }
});

test('only an explicitly enabled opening clue exposes the configured numeric range', () => {
  const g = game({ targetKind: 'number', numberMax: 1000, broadHint: true }); g.begin();
  for (let n = 0; n <= 5; n++) assert.deepEqual(E.view(g.state, n).wk.broadHint, { en: 'An integer from 1 to 1000', zh: '1 到 1000 之間的整數' });
  g.cmd(2, 'settings', { settings: { questionMinutes: 6, targetKind: 'number', broadHint: false } });
  assert.equal(g.state.settings.numberMax, 1000, 'a player saving a redacted form cannot reset the host range');
  assert.ok(E.view(g.state, 2).wk.broadHint, 'already revealed round clue remains frozen');
  g.cmd(0, 'void'); g.cmd(0, 'next'); g.begin(); assert.equal(E.view(g.state, 2).wk.broadHint, null);
});

test('number history survives ordinary Restart and returns to words without deleting earlier word history', () => {
  const g = game({ targetKind: 'number' }); g.begin(); const used = g.state.round.wordId;
  g.cmd(0, 'restart'); assert.ok(g.state.wordHistory.used.includes(used)); assert.ok(!g.state.round.options.includes(used));
  g.cmd(0, 'settings', { settings: { targetKind: 'word' } }); g.cmd(0, 'restart');
  assert.ok(g.state.round.options.every(id => W.get(id))); assert.ok(g.state.wordHistory.used.includes(used));
});

test('older saved word rounds preserve their answer and live deadline when the new settings are introduced', () => {
  const g = game(); g.begin(); const saved = clone(g.state), deadline = g.state.deadline;
  for (const key of ['targetKind', 'numberMax', 'broadHint']) { delete g.state.settings[key]; delete g.state.round[key]; }
  delete g.state.round.hintSnapshot;
  assert.equal(E.view(g.state, 2).wk.targetKind, 'word'); assert.equal(E.view(g.state, 2).wk.broadHint, null);
  g.cmd(0, 'settings', { settings: { targetKind: 'number', numberMax: 1000, broadHint: true } });
  assert.equal(g.state.round.wordId, saved.round.wordId); assert.equal(g.state.deadline, deadline);
  assert.deepEqual(g.state.wordHistory, saved.wordHistory); assert.equal(g.state.round.targetKind, 'word');
});

test('number player copy permits open spoken replies and keeps range controls and secondary logs out of the main card', () => {
  const g = game({ targetKind: 'number', numberMax: 1000 }); g.begin();
  g.cmd(g.asker(), 'raise');
  const data = E.view(g.state, g.state.round.mayor), card = Object.create(UI.Card.prototype);
  Object.assign(card, { data, table: true, pending: null, showOther: false, armed: null, nameBanner: () => '' });
  const html = card.main(data), settings = card.settingsForm(data.wk.settings);
  assert.match(card.head(E.view(g.state, g.asker())), /Numbers/, 'an unknowing player can still see which guessing game is in progress');
  const askerHtml = card.main(E.view(g.state, g.asker()));
  assert.match(askerHtml, /Ask an open question or guess a number/); assert.doesNotMatch(askerHtml, /yes-or-no/);
  assert.match(html, /Answer questions freely|answer freely out loud/i); assert.match(html, /data-wk-arg-answer="spoken"/);
  assert.doesNotMatch(html, /Stay silent|Answer only Yes|Yes\/No left|An integer from 1 to 1000|wk-card-log/);
  assert.doesNotMatch(settings, /data-wk-set="numberMax"/);
  assert.match(card.tail(data), /<details[^>]+data-wk-detail="answers"/);
  const mayorWolf = game({ mode: 'werewolf', targetKind: 'number', mayorSecret: true });
  mayorWolf.state.round.roles[mayorWolf.state.round.mayor] = 'werewolf';
  const mayorHtml = card.ticket(E.view(mayorWolf.state, mayorWolf.state.round.mayor).wk);
  assert.match(mayorHtml, /spoken replies may mislead/); assert.doesNotMatch(mayorHtml, /your tokens may mislead/);
});
