'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const WORDS = require('../who-knows-words.js');
const E = require('../who-knows-engine.js');
const UI = require('../who-knows-ui.js');

test('the host page loads its modules in dependency order and every file parses', () => {
  const html = read('who-knows.html');
  const files = [...html.matchAll(/<script src="(who-knows-[^"?]+\.js)(?:\?v=wk-5)?"/g)].map(match => match[1]);
  assert.deepEqual(files, ['who-knows-words.js', 'who-knows-engine.js', 'who-knows-sync.js', 'who-knows-ui.js', 'who-knows-host.js']);
  for (const file of files) { new vm.Script(read(file)); assert.match(html, new RegExp(file.replace('.', '\\.') + '\\?v=wk-5')); }
  assert.match(html, /<h1>WHO KNOWS\?<\/h1>/);
  assert.match(html, /href="who-knows\.css\?v=wk-5"/);
  assert.match(html, /href="index\.html\?step=2"/);
  assert.ok(html.indexOf('room.js') < html.indexOf('who-knows-words.js'));
  for (const id of ['wk-setup', 'wk-game', 'wk-scene', 'wk-manage', 'wk-start', 'wk-close', 'wk-next', 'wk-pause', 'wk-extend', 'wk-again', 'wk-void', 'wk-restart', 'wk-stop', 'wk-switched', 'wk-continue', 'room-mount'])
    assert.match(html, new RegExp(`id="${id}"`), id);
  assert.ok(fs.existsSync(path.join(root, 'assets/who-knows/mark.svg')));
});

test('original player links run the table themselves; an older host page view still works', () => {
  // Source-layout checks are independent of Git's Windows CRLF checkout mode.
  // Only test input is normalized; the shipped page and game behavior are unchanged.
  const play = read('play.html').replace(/\r\n/g, '\n');
  const files = [...play.matchAll(/<script src="(who-knows-[^"?]+\.js)\?v=wk-5"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(files, ['who-knows-words.js', 'who-knows-engine.js', 'who-knows-sync.js', 'who-knows-ui.js'], 'cards load the rules and the table client, never the host page');
  assert.match(play, /<link rel="stylesheet" href="who-knows\.css\?v=wk-5">/);
  assert.match(play, /data\.wk\?\.version === 2 && \/\^\[a-f0-9\]\{32\}\$\/\.test\(data\.wk\.table \|\| ''\)/, 'only a well-formed table token is followed');
  assert.match(play, /new WHO_KNOWS_SYNC\.Table\(\{ db, code: session, token: pointer\.wk\.table, actor: playerNum,/);
  assert.match(play, /nameBanner, table: true,/);
  assert.match(play, /send: command => wkTable \? wkTable\.command\(command\.type, command\)/);
  assert.match(play, /wkTable\?\.setVisible\(!document\.hidden\)/, 'a card in the background lets visible cards tick first');
  assert.match(play, /wkTable\?\.close\(\); wkTable = null;/, 'pagehide releases the table');
  assert.match(play, /if \(wkTable\) \{ wkTable\.close\(\); wkTable = null; \}/, 'leaving to a waiting/error card releases the table');
  assert.match(play, /new WHO_KNOWS_UI\.Card/);
  assert.match(play, /current\?\.game !== 'whoknows' \|\| current\.wk\?\.sessionId !== command\.sessionId \|\| current\.wk\?\.stage !== command\.stage/);
  assert.match(play, /\{ wkAction: command \}/);
  assert.match(play, /if \(wkCard\) \{ wkCard\.destroy\(\); wkCard = null; \}\n\s+if \(wkTable\) \{ wkTable\.close\(\); wkTable = null; \}\n\s+document\.body\.classList\.remove\('wk-card-page'\);/, 'leaving to a waiting/error card removes it');
  assert.match(play, /wkCard\?\.destroy\(\); wkCard = null;/, 'pagehide disposes the card');
  assert.match(play, /'sketchrelay', 'whoknows'(?:, '[a-z]+')*\]\.includes\(latestData\?\.game\)/);
  assert.match(play, /if \(wkCard\) wkCard\.paint\(\);/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});

test('the Hub lists WHO KNOWS? once, right after Bomb Relay, with bilingual copy', () => {
  const hub = read('index.html');
  const links = [...hub.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(links.filter(link => link === 'who-knows.html').length, 1);
  assert.equal(links[links.indexOf('who-knows.html') - 1], 'bomb-relay.html');
  assert.equal(links[links.indexOf('who-knows.html') + 1], 'bluff-king-live-chat.html');
  assert.match(hub, /<h2>WHO KNOWS\?<\/h2>/);
  assert.match(hub, /assets\/who-knows\/mark\.svg/);
  assert.match(hub, /👥 4–9/);
  for (const key of ['tagWhoKnows', 'descWhoKnows']) assert.match(hub, new RegExp(`${key}: \\{ en: '[^']+', zh: '[^']+' \\}`));
});

test('every interface string exists in English and Traditional Chinese', () => {
  const dict = UI.dict;
  for (const [key, value] of Object.entries(dict)) {
    if (['ready'].includes(key)) continue;
    assert.ok(Array.isArray(value) && value.length === 2 && value[0] && value[1], key);
    assert.doesNotMatch(value[0] + value[1], /[<>]/, key);
  }
  const used = new Set();
  for (const file of ['who-knows-ui.js', 'who-knows-host.js']) for (const match of read(file).matchAll(/\bt\('([a-zA-Z_]+)'(?!\s*\+)/g)) if (match[1] !== 'whoknows') used.add(match[1]);
  for (const match of read('who-knows.html').matchAll(/data-i18n="whoknows\.([a-zA-Z_]+)"/g)) used.add(match[1]);
  const dynamic = [
    ...E.MODES.flatMap(mode => ['mode_', 'modeShort_', 'pitch_', 'tags_', 'answerer_', 'scoring_'].map(prefix => prefix + mode)),
    ...['master', 'insider', 'common', 'mayor', 'seer', 'werewolf', 'villager'].flatMap(role => ['role_' + role, 'goal_' + role]),
    'goal_mayor_seer', 'goal_mayor_werewolf',
    ...new Set(Object.values(E.CONFIG.answers).flat().map(answer => 'ans_' + answer)),
    ...WORDS.LEVELS.map(level => 'level_' + level),
    ...E.CONFIG.difficulties.map(difficulty => 'diff_' + difficulty),
    ...E.CONFIG.wolfOptions.map(option => 'wolves_' + option),
    ...['countdown', 'questions', 'speaking', 'hunt', 'accuse', 'discuss', 'judge', 'vote', 'masterGuess'].map(phase => 'close_' + phase),
    ...Object.keys(E.CONFIG.points).map(key => 'out_' + key),
    ...Object.keys(E.CONFIG.points).filter(key => key !== 'void').map(key => 'sub_' + key), 'sub_void_host', 'sub_void_answerer_left',
    ...['village', 'wolves', 'commons', 'insider', 'none', 'void'].map(team => 'win_' + team),
    'offline', 'connecting', 'switched', 'rosterChanged', 'noFirebase', 'roomChanged', 'setupNeeded', 'error', 'tableEmpty',
    'stale_turn', 'not_available', 'not_enough_players', 'invalid_options', 'invalid_roster', 'already_in_line',
  ];
  for (const key of [...used, ...dynamic]) assert.ok(Object.hasOwn(dict, key), 'missing string: ' + key);
});

function play(mode, count = 6, seed = 5) {
  let clock = 2_000_000, serial = 0;
  const roster = Array.from({ length: count }, (_, i) => ({ playerNum: i + 1, name: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia', 'Leo', 'Sam'][i] }));
  const g = { state: E.create({ id: 'ui-' + mode, roster, settings: { mode }, now: clock, seed }) };
  g.cmd = (actor, type, extra = {}) => { g.state = E.apply(g.state, Object.assign({ id: `c-${++serial}-xxxxxxxx`, type, actor, sessionId: g.state.sessionId, stage: g.state.stage, now: clock, seed: serial }, extra)); };
  g.advance = ms => { clock += ms; };
  g.stage = () => UI.stage(E.view(g.state, 0).wk);
  return g;
}

test('the shared screen never renders the word, the options or a hidden role before the reveal', () => {
  for (const mode of E.MODES) {
    const g = play(mode);
    const round = () => g.state.round;
    const options = round().options.map(id => WORDS.get(id));
    const roleWords = ['Insider', 'Seer', 'Werewolf'];
    const hiddenRoleBadge = html => [...html.matchAll(/class="wk-seat-role"[^>]*>[\s\S]*?<\/span>([^<]+)</g)].map(match => match[1].trim());
    const checkHidden = (html, word) => {
      for (const option of word ? [word] : options) { assert.equal(html.includes(option.en), false, `${mode}: ${option.en}`); assert.equal(html.includes(option.zh), false); }
      for (const badge of hiddenRoleBadge(html)) assert.ok(!roleWords.includes(badge), `${mode}: seat badge ${badge}`);
    };
    checkHidden(g.stage());
    g.cmd(round().mayor, 'choose', { wordId: round().options[0] });
    const word = WORDS.get(round().wordId);
    checkHidden(g.stage(), word);
    g.advance(E.CONFIG.countdownMs); g.cmd(0, 'tick');
    const asker = round().players.find(n => n !== round().mayor);
    g.cmd(asker, 'raise', { text: 'Is it <b>alive</b>?' });
    const html = g.stage();
    checkHidden(html, word);
    assert.equal(html.includes('<b>'), false, 'typed text can never inject markup');
    assert.ok(html.includes('“Is it b alive /b ?”'), 'typed text is cleaned and shown');
    g.cmd(round().mayor, 'answer', { askId: round().current.id, answer: 'yes' });
    checkHidden(g.stage(), word);
    g.cmd(0, 'pause'); checkHidden(g.stage(), word); assert.match(g.stage(), /PAUSED/);
    g.cmd(0, 'resume');
    g.cmd(asker, 'raise');
    g.cmd(round().mayor, 'answer', { askId: round().current.id, answer: 'correct' });
    // The guess was said aloud: from here the word is public, the roles are not.
    const after = g.stage();
    assert.ok(after.includes(word.en));
    for (const badge of hiddenRoleBadge(after)) assert.ok(!roleWords.includes(badge));
    if (mode === 'werewolf') assert.match(after, /The Werewolves: /);
    g.cmd(0, 'void');
    const result = g.stage();
    assert.match(result, /class="wk-reveal"/);
    assert.equal((result.match(/class="wk-reveal-card/g) || []).length, 6);
  }
});

test('host and card copy keep the tokens of each mode and show a singular point label', () => {
  assert.equal(UI.pts(1), '1 pt'); assert.equal(UI.pts(3), '3 pts'); assert.equal(UI.pts(0), '0 pts');
  const g = play('werewolf');
  const legend = g.stage();
  for (const answer of E.CONFIG.answers.werewolf) assert.match(legend, new RegExp(`wk-t-${answer}`));
  const insider = play('insider').stage();
  assert.doesNotMatch(insider, /wk-t-maybe|wk-t-close|wk-t-far/);
  assert.match(insider, /wk-t-unknown/);
});
