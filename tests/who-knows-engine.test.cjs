'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const WORDS = require('../who-knows-words.js');
const E = require('../who-knows-engine.js');

const NAMES = ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo', 'Sam', 'Robin', 'Alex'];
function game(count = 5, settings = {}, seed = 11) {
  let clock = 1_000_000, serial = 0;
  const roster = Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: NAMES[i] }));
  const g = {
    state: E.create({ id: 'session-' + seed, roster, settings, now: clock, seed }),
    get now() { return clock; }, advance(ms) { clock += ms; },
    cmd(actor, type, extra = {}) {
      const input = Object.assign({ id: `cmd-${++serial}-xxxxxxxx`, type, actor, sessionId: g.state.sessionId, stage: g.state.stage, now: clock, seed: serial * 977 }, extra);
      g.state = E.apply(g.state, input);
      return g.state.replies?.[actor]?.id === input.id ? g.state.replies[actor].error : 'ignored';
    },
    get round() { return g.state.round; },
    role: role => Object.keys(g.state.round.roles).map(Number).filter(n => g.state.round.roles[n] === role),
    others: () => g.state.round.players.filter(n => n !== g.state.round.mayor),
    choose(index = 0) { assert.equal(g.cmd(g.round.mayor, 'choose', { wordId: g.round.options[index] }), ''); g.advance(E.CONFIG.countdownMs); assert.equal(g.cmd(0, 'tick'), ''); assert.equal(g.state.phase, 'questions'); },
    ask(asker, answer, text = '') {
      assert.equal(g.cmd(asker, 'raise', { text }), '');
      assert.equal(g.round.current.playerNum, asker);
      return g.cmd(g.round.mayor, 'answer', { askId: g.round.current.id, answer });
    },
  };
  return g;
}

test('the word bank has 300 unique bilingual guessable words in three levels', () => {
  assert.equal(WORDS.items.length, 300);
  assert.deepEqual(WORDS.LEVELS, ['easy', 'medium', 'hard']);
  assert.deepEqual(WORDS.LEVELS.map(level => WORDS.pool(level).length), [120, 120, 60]);
  assert.equal(new Set(WORDS.items.map(word => word.id)).size, 300);
  assert.equal(new Set(WORDS.items.map(word => word.en.toLowerCase())).size, 300);
  for (const word of WORDS.items) {
    assert.match(word.id, /^wk-[emh]\d{3}$/);
    assert.ok(word.en && word.zh && word.cat, word.id);
    assert.doesNotMatch(word.en + word.zh, /[<>]/);
    assert.equal(WORDS.get(word.id), word);
  }
});

test('games need four active players and reject invalid settings', () => {
  assert.throws(() => game(3), /not_enough_players/);
  assert.throws(() => game(5, { mode: 'mafia' }), /invalid_options/);
  assert.throws(() => game(5, { questionMinutes: 7 }), /invalid_options/);
  assert.throws(() => game(5, { tokens: 12 }), /invalid_options/);
  const g = game(4);
  assert.equal(g.state.phase, 'choose');
  assert.deepEqual(g.state.settings, { mode: 'insider', questionMinutes: 5, tokens: 36, difficulty: 'mixed', wolves: 'auto', mayorSecret: false, masterGuess: true });
  assert.equal(E.parseSettings({ mode: 'werewolf' }).questionMinutes, 4, 'each mode starts with its own usual length');
  assert.equal(E.parseSettings({ mode: 'werewolf' }, { ...E.defaultSettings('insider'), questionMinutes: 6 }).questionMinutes, 4);
  assert.equal(E.parseSettings({ tokens: 0 }, { ...E.defaultSettings('werewolf'), questionMinutes: 6 }).questionMinutes, 6);
});

test('Insider deals one public Master, one secret Insider and Commons', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = game(4 + (seed % 6), {}, seed);
    const roles = Object.values(g.round.roles);
    assert.equal(g.round.roles[g.round.mayor], 'master');
    assert.equal(roles.filter(role => role === 'master').length, 1);
    assert.equal(roles.filter(role => role === 'insider').length, 1);
    assert.equal(roles.length, g.round.players.length);
    assert.notEqual(g.round.roles[g.round.mayor], 'insider');
  }
});

test('Werewolf deals one Seer and 1–2 Werewolves; the Mayor is an honest villager unless the advanced option is on', () => {
  const expected = { 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2 };
  for (const [count, wolves] of Object.entries(expected)) {
    for (let seed = 1; seed <= 6; seed++) {
      const g = game(Number(count), { mode: 'werewolf' }, seed);
      assert.equal(g.role('werewolf').length, wolves, `${count} players`);
      assert.equal(g.role('seer').length, 1);
      assert.equal(g.round.roles[g.round.mayor], 'villager');
    }
  }
  assert.equal(game(6, { mode: 'werewolf', wolves: 2 }).role('werewolf').length, 2);
  assert.equal(game(5, { mode: 'werewolf', wolves: 2 }).role('werewolf').length, 1, 'two wolves need six players');
  const mayorRoles = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const g = game(5, { mode: 'werewolf', mayorSecret: true }, seed);
    mayorRoles.add(g.round.roles[g.round.mayor]);
    assert.equal(g.role('seer').length, 1); assert.equal(g.role('werewolf').length, 1);
    assert.equal(Object.keys(g.round.roles).length, 5);
  }
  assert.deepEqual([...mayorRoles].sort(), ['seer', 'villager', 'werewolf']);
});

test('the answerer rotates fairly and never twice in a row', () => {
  const g = game(5);
  const seen = []; const counts = new Map();
  for (let round = 0; round < 40; round++) {
    const mayor = g.round.mayor;
    if (seen.length) assert.notEqual(mayor, seen.at(-1));
    seen.push(mayor); counts.set(mayor, (counts.get(mayor) || 0) + 1);
    assert.equal(g.cmd(0, 'void'), '');
    assert.equal(g.cmd(0, 'next'), '');
  }
  assert.deepEqual([...counts.values()], [8, 8, 8, 8, 8]);
  assert.equal(g.cmd(0, 'void'), '');
  assert.equal(g.cmd(0, 'setNext', { playerNum: 3 }), '');
  assert.equal(g.cmd(0, 'next'), '');
  assert.equal(g.round.mayor, 3, 'the host may choose the next answerer once');
});

test('word options: one per level in Mixed, three of one level otherwise; rerolls and history avoid repeats', () => {
  const mixed = game(4);
  assert.deepEqual(mixed.round.options.map(id => WORDS.get(id).level), ['easy', 'medium', 'hard']);
  const easy = game(4, { difficulty: 'hard' });
  assert.equal(new Set(easy.round.options).size, 3);
  assert.ok(easy.round.options.every(id => WORDS.get(id).level === 'hard'));
  const before = easy.round.options.slice();
  assert.equal(easy.cmd(easy.round.mayor, 'reroll'), '');
  assert.ok(easy.round.options.every(id => !before.includes(id)), 'a reroll shows three different words');
  for (let i = 1; i < E.CONFIG.maxRerolls; i++) easy.cmd(easy.round.mayor, 'reroll');
  assert.equal(easy.cmd(easy.round.mayor, 'reroll'), 'not_available');
  assert.equal(easy.cmd(easy.others()[0], 'choose', { wordId: easy.round.options[0] }), 'not_available', 'only the answerer picks');
  assert.equal(easy.cmd(easy.round.mayor, 'choose', { wordId: 'wk-e001' }), 'not_available', 'only an offered word');
  const g = game(4, { difficulty: 'easy' });
  const used = new Set();
  for (let round = 0; round < 40; round++) {
    const pick = g.round.options[0];
    assert.ok(!used.has(pick), 'chosen words are not offered again until the level runs out');
    g.cmd(g.round.mayor, 'choose', { wordId: pick }); used.add(pick);
    g.cmd(0, 'void'); g.cmd(0, 'next');
  }
});

test('the shared screen and non-knowers never receive the secret word or hidden roles', () => {
  for (const mode of ['insider', 'werewolf']) {
    const g = game(6, { mode });
    g.choose(1);
    const secret = WORDS.get(g.round.wordId);
    const knowers = mode === 'insider' ? [g.round.mayor, ...g.role('insider')] : [g.round.mayor, ...g.role('seer'), ...g.role('werewolf')];
    const shared = E.view(g.state, 0), host = JSON.stringify(shared);
    assert.ok(!host.includes(secret.en) && !host.includes(secret.zh) && !host.includes(secret.id), mode + ' host');
    assert.equal(shared.wk.me, undefined); assert.equal(shared.wk.result, null);
    // Only public role COUNTS appear; no seat is ever paired with a hidden role.
    for (const n of g.round.players) assert.ok(!new RegExp(`"${n}":"(insider|common|seer|werewolf|villager|master)"`).test(host), `${mode} host seat ${n}`);
    assert.ok(!host.includes('"roles"'));
    for (const n of g.round.players) {
      const card = E.view(g.state, n), text = JSON.stringify(card);
      assert.equal(card.wk.me.role, g.round.roles[n]);
      if (knowers.includes(n)) assert.equal(card.wk.me.word.en, secret.en);
      else assert.ok(!text.includes(secret.en) && !text.includes(secret.id), `${mode} non-knower ${n}`);
      const others = g.round.players.filter(other => other !== n && g.round.roles[other] !== g.round.roles[n]);
      for (const other of others) assert.ok(!text.includes(`"${other}":"${g.round.roles[other]}"`));
    }
    if (mode === 'werewolf') {
      const wolf = g.role('werewolf')[0];
      assert.deepEqual(E.view(g.state, wolf).wk.me.teammates, g.role('werewolf').filter(n => n !== wolf));
      assert.deepEqual(E.view(g.state, g.role('seer')[0]).wk.me.teammates, []);
    }
    assert.deepEqual(E.view(g.state, g.round.mayor).wk.me.options, null, 'the options disappear once the word is chosen');
  }
});

test('players raise hands into one line; the answerer answers the front with valid tokens only', () => {
  const g = game(5, { mode: 'werewolf' });
  const mayor = g.round.mayor, [a, b, c] = g.others();
  assert.equal(g.cmd(a, 'raise'), 'not_available', 'nothing to raise before questions begin');
  g.choose();
  assert.equal(g.cmd(mayor, 'raise'), 'not_available', 'the answerer cannot ask');
  assert.equal(g.cmd(a, 'raise', { text: '  Is it <b>alive</b>?  ' }), '');
  assert.equal(g.round.current.text, 'Is it  b alive /b ?'.replace(/\s+/g, ' '));
  assert.equal(g.cmd(a, 'raise'), 'already_in_line');
  assert.equal(g.cmd(b, 'raise'), ''); assert.equal(g.cmd(c, 'raise'), '');
  assert.deepEqual(g.round.queue.map(entry => entry.playerNum), [b, c]);
  assert.equal(E.view(g.state, c).wk.me.queuePos, 2);
  assert.equal(g.cmd(b, 'text', { text: 'Can I eat it?' }), '');
  assert.equal(g.cmd(mayor, 'answer', { askId: 'wrong', answer: 'yes' }), 'not_available');
  assert.equal(g.cmd(mayor, 'answer', { askId: g.round.current.id, answer: 'unknown' }), 'not_available', 'Insider tokens are not Werewolf tokens');
  assert.equal(g.cmd(mayor, 'answer', { askId: g.round.current.id, answer: 'maybe' }), '');
  assert.equal(g.round.current.playerNum, b);
  assert.equal(g.round.tokensUsed, 0, 'Maybe does not use a Yes/No token');
  assert.equal(g.cmd(mayor, 'answer', { askId: g.round.current.id, answer: 'yes' }), '');
  assert.equal(g.round.tokensUsed, 1);
  assert.deepEqual(g.round.log.map(entry => [entry.playerNum, entry.answer, entry.text]), [[a, 'maybe', 'Is it b alive /b ?'], [b, 'yes', 'Can I eat it?']]);
  assert.equal(g.cmd(c, 'lower'), '');
  assert.equal(g.round.current, null);
  // A question asked without raising a hand can still be answered.
  assert.equal(g.cmd(mayor, 'pickAsker', { playerNum: a }), '');
  assert.equal(g.cmd(b, 'raise'), '');
  assert.equal(g.cmd(mayor, 'pickAsker', { playerNum: b }), '');
  assert.deepEqual([g.round.current.playerNum, g.round.queue.map(entry => entry.playerNum)], [b, [a]]);
  assert.equal(g.cmd(mayor, 'skip'), '');
  assert.equal(g.round.current.playerNum, a);
  const view = E.view(g.state, 0).wk;
  assert.deepEqual(view.tallies[a], { maybe: 1 });
  assert.equal(view.current.playerNum, a);
});

test('Insider answers are Yes, No, I don’t know and Correct', () => {
  const g = game(4);
  g.choose();
  const asker = g.others()[0];
  assert.equal(g.cmd(asker, 'raise'), '');
  assert.equal(g.cmd(g.round.mayor, 'answer', { askId: g.round.current.id, answer: 'maybe' }), 'not_available');
  assert.equal(g.cmd(g.round.mayor, 'answer', { askId: g.round.current.id, answer: 'unknown' }), '');
  assert.deepEqual(E.view(g.state, g.round.mayor).wk.me.answers, ['yes', 'no', 'unknown', 'correct']);
});

test('the Yes/No budget ends Werewolf questions; time ends them too', () => {
  const g = game(4, { mode: 'werewolf', tokens: 20 });
  g.choose();
  const asker = g.others()[0];
  for (let i = 0; i < 19; i++) assert.equal(g.ask(asker, i % 2 ? 'yes' : 'no'), '');
  assert.equal(g.state.phase, 'questions');
  assert.equal(g.ask(asker, 'no'), '');
  assert.equal(g.state.phase, 'accuse'); assert.equal(g.round.endReason, 'tokens');
  const t = game(4, { mode: 'werewolf' });
  t.choose();
  t.advance(t.round.questionMs - 1); const before = t.state;
  assert.equal(t.cmd(0, 'tick'), 'ignored'); assert.equal(t.state, before, 'early ticks do not write');
  t.advance(1); assert.equal(t.cmd(0, 'tick'), '');
  assert.equal(t.state.phase, 'accuse'); assert.equal(t.round.endReason, 'time');
  assert.equal(E.view(t.state, 0).wk.word, null, 'an unguessed word stays secret during the vote');
});

test('Werewolf: a correct guess reveals the word and Werewolves, who then hunt the Seer', () => {
  const found = game(6, { mode: 'werewolf' }, 3);
  found.choose();
  const seer = found.role('seer')[0], wolf = found.role('werewolf')[0];
  const guesser = found.others().find(n => n !== wolf);
  assert.equal(found.ask(guesser, 'correct', 'Is it a cat?'), '');
  assert.equal(found.state.phase, 'hunt');
  const view = E.view(found.state, 0).wk;
  assert.equal(view.word.id, found.round.wordId);
  assert.deepEqual(view.wolves, [wolf]);
  assert.ok(!E.view(found.state, wolf).wk.me.voteTargets.includes(found.round.mayor), 'an honest Mayor cannot be the Seer');
  assert.equal(found.cmd(seer, 'pick', { target: wolf }), 'not_available', 'only Werewolves hunt');
  assert.equal(found.cmd(wolf, 'pick', { target: seer }), '');
  assert.equal(found.state.phase, 'result');
  assert.equal(found.round.outcome.key, 'wolves_seer');
  assert.deepEqual(found.round.points, { [wolf]: 2 });

  const safe = game(6, { mode: 'werewolf' }, 3);
  safe.choose();
  safe.ask(safe.others().find(n => n !== safe.role('werewolf')[0]), 'correct');
  const decoy = E.view(safe.state, safe.role('werewolf')[0]).wk.me.voteTargets.find(n => n !== safe.role('seer')[0]);
  safe.cmd(safe.role('werewolf')[0], 'pick', { target: decoy });
  assert.equal(safe.round.outcome.key, 'village_word');
  const village = safe.round.players.filter(n => safe.round.roles[n] !== 'werewolf');
  for (const n of village) assert.equal(safe.round.points[n], safe.round.roles[n] === 'seer' ? 3 : 2);
  assert.equal(safe.state.scores[safe.role('werewolf')[0]], undefined);
});

test('Werewolf: if nobody picks in time the Seer is safe; two Werewolves each get one pick', () => {
  const g = game(8, { mode: 'werewolf' }, 5);
  g.choose();
  const wolves = g.role('werewolf'), seer = g.role('seer')[0];
  g.ask(g.others().find(n => !wolves.includes(n)), 'correct');
  assert.equal(g.cmd(wolves[0], 'pick', { target: E.view(g.state, wolves[0]).wk.me.voteTargets.find(n => n !== seer) }), '');
  assert.equal(g.state.phase, 'hunt', 'waits for the second Werewolf');
  assert.equal(g.cmd(wolves[1], 'pick', { target: seer }), '');
  assert.equal(g.round.outcome.key, 'wolves_seer');
  const late = game(6, { mode: 'werewolf' }, 5);
  late.choose(); late.ask(late.others().find(n => late.round.roles[n] !== 'werewolf'), 'correct');
  late.advance(E.CONFIG.huntMs); assert.equal(late.cmd(0, 'tick'), '');
  assert.equal(late.round.outcome.key, 'village_word');
});

test('Werewolf vote: a Werewolf among the most-voted (with at least two votes) is caught', () => {
  const g = game(5, { mode: 'werewolf' }, 8);
  g.choose(); g.advance(g.round.questionMs); g.cmd(0, 'tick');
  const wolf = g.role('werewolf')[0];
  const voters = g.round.players;
  for (const n of voters) assert.equal(g.cmd(n, 'vote', { target: n === wolf ? voters.find(x => x !== wolf) : wolf }), '');
  assert.equal(g.round.outcome.key, 'village_vote');
  for (const n of voters) assert.equal(g.round.points[n] ?? 0, n === wolf ? 0 : 1);

  const split = game(4, { mode: 'werewolf' }, 8);
  split.choose(); split.advance(split.round.questionMs); split.cmd(0, 'tick');
  const seats = split.round.players;
  seats.forEach((n, i) => split.cmd(n, 'vote', { target: seats[(i + 1) % seats.length] }));
  assert.equal(split.round.outcome.key, 'wolves_hidden', 'one vote each means nobody stands out');

  const tie = game(6, { mode: 'werewolf' }, 8);
  tie.choose(); tie.advance(tie.round.questionMs); tie.cmd(0, 'tick');
  const w = tie.role('werewolf')[0], v = tie.round.players.filter(n => n !== w);
  // Two votes for the wolf and two for one villager: both are revealed.
  const plan = new Map([[v[0], w], [v[1], w], [v[2], v[4]], [v[3], v[4]], [v[4], v[0]], [w, v[1]]]);
  for (const [voter, target] of plan) tie.cmd(voter, 'vote', { target });
  assert.equal(tie.round.outcome.key, 'village_vote');
  assert.deepEqual(tie.round.outcome.revealed, [w, v[4]].sort((a, b) => a - b));
  assert.equal(tie.cmd(v[0], 'vote', { target: w }), 'not_available', 'ballots close with the result');
});

test('Insider: discussion lasts as long as the guessing took, then the guesser is judged', () => {
  const g = game(6, {}, 21);
  g.choose();
  const insider = g.role('insider')[0];
  g.advance(95000);
  g.ask(insider, 'correct', 'Is it a window?');
  assert.equal(g.state.phase, 'discuss');
  assert.equal(g.state.deadline - g.now, 95000);
  assert.equal(E.view(g.state, 0).wk.judgeTarget, insider);
  const quick = game(6, {}, 21); quick.choose(); quick.ask(quick.others()[0], 'correct');
  assert.equal(quick.state.deadline - quick.now, E.CONFIG.discussMinMs, 'never shorter than 30 seconds');
  g.advance(95000); g.cmd(0, 'tick');
  assert.equal(g.state.phase, 'judge');
  assert.equal(g.cmd(insider, 'judge', { choice: 'no' }), 'not_available', 'the guesser does not judge themselves');
  for (const n of g.round.players.filter(n => n !== insider)) assert.equal(g.cmd(n, 'judge', { choice: 'yes' }), '');
  assert.equal(g.round.outcome.key, 'commons_found');
  assert.equal(g.state.scores[g.round.mayor], 1, 'the Master wins with the Commons');
  assert.equal(g.round.points[insider], undefined);
});

test('Insider: accusing an innocent guesser hands the Insider the win; a tie uses the guesser’s vote', () => {
  const wrong = game(5, {}, 31);
  wrong.choose();
  const insider = wrong.role('insider')[0], innocent = wrong.role('common')[0];
  wrong.ask(innocent, 'correct');
  wrong.advance(E.CONFIG.discussMinMs); wrong.cmd(0, 'tick');
  for (const n of wrong.round.players.filter(n => n !== innocent)) wrong.cmd(n, 'judge', { choice: 'yes' });
  assert.equal(wrong.round.outcome.key, 'insider_wins');
  assert.deepEqual(wrong.round.points, { [insider]: 3 });

  const tie = game(6, {}, 41);
  tie.choose();
  const ins = tie.role('insider')[0], commons = tie.role('common');
  const guesser = commons[0];
  tie.ask(guesser, 'correct');
  tie.cmd(0, 'close'); assert.equal(tie.state.phase, 'judge');
  for (const n of tie.round.players.filter(n => n !== guesser)) tie.cmd(n, 'judge', { choice: 'no' });
  assert.equal(tie.state.phase, 'vote');
  assert.equal(tie.cmd(guesser, 'vote', { target: tie.round.mayor }), 'not_available', 'the Master is never a suspect');
  // Two-two tie between the Insider and commons[1]; the guesser picked the Insider.
  const plan = new Map([[guesser, ins], [commons[2], ins], [ins, commons[1]], [commons[3], commons[1]], [commons[1], commons[3]], [tie.round.mayor, commons[2]]]);
  for (const [voter, target] of plan) assert.equal(tie.cmd(voter, 'vote', { target }), '', `${voter}→${target}`);
  assert.equal(tie.round.outcome.key, 'commons_found');
  assert.equal(tie.round.outcome.accused, ins);
  assert.equal(tie.round.outcome.tieBreak, ins);
});

test('Insider: time out ends with nobody winning, or the Master’s single guess', () => {
  const g = game(5, { masterGuess: false }, 51);
  g.choose(); g.advance(g.round.questionMs); g.cmd(0, 'tick');
  assert.equal(g.state.phase, 'result'); assert.equal(g.round.outcome.key, 'nobody');
  assert.deepEqual(g.state.scores, {});
  const m = game(5, {}, 51);
  m.choose(); m.advance(m.round.questionMs); m.cmd(0, 'tick');
  assert.equal(m.state.phase, 'masterGuess');
  assert.equal(m.cmd(m.others()[0], 'masterPick', { target: m.role('insider')[0] }), 'not_available');
  assert.equal(m.cmd(m.round.mayor, 'masterPick', { target: m.role('insider')[0] }), '');
  assert.equal(m.round.outcome.key, 'master_found');
  assert.equal(m.round.points[m.round.mayor], 1);
});

test('pause and resume keep the remaining time; stale cards are rejected while paused', () => {
  const g = game(4);
  g.choose();
  const asker = g.others()[0], stage = g.state.stage;
  g.advance(60000);
  assert.equal(g.cmd(0, 'pause'), '');
  assert.equal(g.state.phase, 'paused'); assert.equal(g.state.remainingMs, g.round.questionMs - 60000);
  assert.equal(g.cmd(asker, 'raise', { stage }), 'stale_turn');
  g.advance(500000);
  assert.equal(g.cmd(0, 'resume'), '');
  assert.equal(g.state.phase, 'questions'); assert.equal(g.state.deadline - g.now, g.round.questionMs - 60000);
  assert.equal(g.cmd(0, 'extend'), '');
  assert.equal(g.state.deadline - g.now, g.round.questionMs);
  assert.equal(g.cmd(0, 'close', { stage: g.state.stage - 1 }), 'stale_turn', 'a double click cannot skip a phase');
});

test('commands are idempotent and the answerer leaving cancels the round without points', () => {
  const g = game(5, { mode: 'werewolf' });
  g.choose();
  const asker = g.others()[0];
  const input = { id: 'same-command-xxxxxxxx', type: 'raise', actor: asker, sessionId: g.state.sessionId, stage: g.state.stage, now: g.now, seed: 1 };
  g.state = E.apply(g.state, input);
  const once = g.state;
  assert.equal(E.apply(once, input), once, 'a replayed command changes nothing');
  assert.equal(g.cmd(0, 'exclude', { playerNum: g.round.mayor, active: false }), '');
  assert.equal(g.state.phase, 'result'); assert.equal(g.round.outcome.key, 'void'); assert.equal(g.round.outcome.reason, 'answerer_left');
  assert.deepEqual(g.state.scores, {});
  assert.equal(g.cmd(asker, 'next'), '');
  assert.equal(g.state.phase, 'choose');
  assert.ok(!g.round.players.includes(g.state.roster.find(p => !p.active).playerNum), 'sitting-out players get no role');
});

test('a voter leaving completes the ballot; too few players cannot start a round', () => {
  const g = game(5, { mode: 'werewolf' }, 9);
  g.choose(); g.advance(g.round.questionMs); g.cmd(0, 'tick');
  const wolf = g.role('werewolf')[0], [last, ...rest] = g.round.players.filter(n => n !== wolf);
  for (const n of rest) g.cmd(n, 'vote', { target: wolf });
  g.cmd(wolf, 'vote', { target: rest[0] });
  assert.equal(g.state.phase, 'accuse');
  assert.equal(E.view(g.state, 0).wk.ballots.cast, 4);
  assert.equal(g.cmd(0, 'exclude', { playerNum: last, active: false }), '');
  assert.equal(g.state.phase, 'result'); assert.equal(g.round.outcome.key, 'village_vote');
  assert.equal(g.cmd(0, 'exclude', { playerNum: rest[0], active: false }), '');
  assert.equal(g.cmd(0, 'next'), 'not_enough_players');
  assert.equal(g.cmd(0, 'exclude', { playerNum: last, active: true }), '');
  assert.equal(g.cmd(0, 'next'), '');
});

test('settings apply to the next round; restart clears scores but keeps used words', () => {
  const g = game(5);
  g.choose(0);
  const used = g.round.wordId;
  assert.equal(g.cmd(0, 'settings', { settings: { mode: 'werewolf', tokens: 20 } }), '');
  assert.equal(g.round.mode, 'insider', 'the running round keeps its mode');
  g.ask(g.role('insider')[0], 'correct'); g.cmd(0, 'close');
  for (const n of g.round.players.filter(n => n !== g.round.guess.playerNum)) g.cmd(n, 'judge', { choice: 'yes' });
  assert.ok(Object.keys(g.state.scores).length);
  g.cmd(0, 'next');
  assert.equal(g.round.mode, 'werewolf'); assert.equal(g.round.tokens, 20);
  assert.equal(g.cmd(0, 'restart', { settings: { mode: 'insider' } }), '');
  assert.deepEqual(g.state.scores, {}); assert.equal(g.state.roundNo, 1); assert.equal(g.round.mode, 'insider');
  assert.ok(g.state.wordHistory.used.includes(used));
  assert.equal(g.cmd(0, 'settings', { settings: { questionMinutes: 2 } }), 'invalid_options');
  assert.equal(g.cmd(0, 'stop'), '');
  assert.equal(g.state.phase, 'finished');
  assert.equal(E.view(g.state, 1).wk.stopped, true);
});

test('result views reveal every role, the word, votes and points to everyone', () => {
  const g = game(5, { mode: 'werewolf' }, 13);
  g.choose(2);
  g.ask(g.others().find(n => g.round.roles[n] !== 'werewolf'), 'correct');
  g.cmd(g.role('werewolf')[0], 'pick', { target: g.role('seer')[0] });
  const view = E.view(g.state, 0).wk;
  assert.equal(view.phase, 'result');
  assert.deepEqual(view.result.roles, g.round.roles);
  assert.equal(view.result.word.id, g.round.wordId);
  assert.deepEqual(view.result.picks, g.round.picks);
  assert.equal(view.history.at(-1).key, 'wolves_seer');
  assert.equal(E.view(g.state, 2).wk.me.canNext, true);
  assert.equal(E.view(g.state, 2).wk.me.word, null, 'after the reveal the public result carries the word');
});

test('names edited in the Hub follow into the game without touching seats, scores or secrets', () => {
  const g = game(5);
  const before = JSON.parse(JSON.stringify(g.state.round));
  assert.equal(g.cmd(0, 'rename', { names: [{ playerNum: 2, name: '  Kev  ' }, { playerNum: 4, name: '' }, { playerNum: 9, name: 'Ghost' }] }), '');
  assert.deepEqual(g.state.roster.map(player => player.name), ['Amy', 'Kev', 'Jason', 'Willy', 'Mia']);
  assert.deepEqual(g.state.round, before, 'the round, roles and word choices are untouched');
  assert.equal(E.view(g.state, 3).wk.roster.find(player => player.playerNum === 2).name, 'Kev');
  assert.equal(g.cmd(0, 'rename', { names: [{ playerNum: 2, name: 'Kev' }] }), 'not_available', 'nothing to change');
  assert.equal(g.cmd(2, 'rename', { names: [{ playerNum: 2, name: 'Me' }] }), 'not_available', 'only the host renames');
});
