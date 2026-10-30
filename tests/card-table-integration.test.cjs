'use strict';
// WORD LIMIT THEATER and ROOM SURVEY wiring: pages, cache tags, the Hub
// listing, play.html, bilingual strings, fonts, and shared screens that never
// show a hidden answer. Run: node --test tests/card-table-integration.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(lang = 'en') {
  const dicts = {};
  const I18N = { lang, registerDict: (ns, dict) => { dicts[ns] = dict; }, t: (ns, key) => dicts[ns]?.[key]?.[lang] ?? key, onChange: () => {} };
  const context = vm.createContext({ crypto: require('node:crypto').webcrypto, I18N, setInterval: () => 0, clearInterval: () => {}, console });
  for (const file of ['card-table.js', 'card-table-ui.js', 'word-limit-content.js', 'word-limit-engine.js', 'word-limit-ui.js',
    'room-survey-content.js', 'room-survey-engine.js', 'room-survey-ui.js']) vm.runInContext(read(file), context, { filename: file });
  const get = name => vm.runInContext(name, context);
  return { C: get('CARD_TABLE_UI'), WL: get('WORD_LIMIT_UI'), WE: get('WORD_LIMIT_ENGINE'), RS: get('ROOM_SURVEY_UI'), RE: get('ROOM_SURVEY_ENGINE'), dicts };
}
const GAMES = [
  { page: 'word-limit-theater.html', title: 'WORD LIMIT THEATER', prefix: 'wl', tag: 'wl-6', files: ['word-limit-content.js', 'word-limit-engine.js', 'word-limit-ui.js'], host: 'word-limit-host.js', css: 'word-limit-theater.css', mark: 'assets/word-limit-theater/mark.svg', ns: 'wordlimit' },
  { page: 'room-survey.html', title: 'ROOM SURVEY', prefix: 'rs', tag: 'rs-3', files: ['room-survey-content.js', 'room-survey-engine.js', 'room-survey-ui.js'], host: 'room-survey-host.js', css: 'room-survey.css', mark: 'assets/room-survey/mark.svg', ns: 'roomsurvey' },
];
const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('each host page loads the shared table, then its own modules, in order, with cache tags; every file parses', () => {
  for (const game of GAMES) {
    const html = read(game.page);
    assert.equal(game.page, slug(game.title) + '.html', 'the file name is the slug of the title');
    assert.match(html, new RegExp(`<h1>${game.title}</h1>`));
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    const local = scripts.filter(src => !src.startsWith('http'));
    assert.deepEqual(local.slice(local.indexOf('room.js?v=life-story-1')), ['room.js?v=life-story-1', 'card-table.js?v=ct-2', 'card-table-ui.js?v=ct-2',
      ...game.files.map(file => `${file}?v=${game.tag}`), `${game.host}?v=${game.tag}`]);
    assert.ok(scripts.indexOf('firebase-config.js') < scripts.indexOf('room.js?v=life-story-1'));
    assert.ok(html.indexOf('src="i18n.js"') < html.indexOf('</head>'), 'i18n loads first');
    assert.match(html, /href="card-table\.css\?v=ct-2"/);
    assert.match(html, new RegExp(`href="${game.css.replace('.', '\\.')}\\?v=${game.tag}"`));
    assert.match(html, /href="index\.html\?step=2"/);
    for (const id of ['setup', 'setup-needed', 'switched', 'continue', 'start', 'game', 'scene', 'actions', 'controls', 'status', 'error', 'demo-bar', 'demo-view', 'demo-link', 'count-note', 'room-label'])
      assert.match(html, new RegExp(`id="${game.prefix}-${id}"`), `${game.page}: #${game.prefix}-${id}`);
    assert.match(html, /id="room-mount"/);
    assert.ok(fs.existsSync(path.join(root, game.mark)));
    for (const file of ['card-table.js', 'card-table-ui.js', ...game.files, game.host]) new vm.Script(read(file), { filename: file });
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});

test('original player links follow either table: play.html loads the rules and the table client, never a host page', () => {
  const play = read('play.html');
  const ct = [...play.matchAll(/<script src="((?:card-table|word-limit|room-survey)[^"?]*\.js)\?v=([a-z0-9-]+)"><\/script>/g)].map(match => `${match[1]}?v=${match[2]}`);
  assert.deepEqual(ct, ['card-table.js?v=ct-2', 'card-table-ui.js?v=ct-2', 'word-limit-content.js?v=wl-6', 'word-limit-engine.js?v=wl-6', 'word-limit-ui.js?v=wl-6',
    'room-survey-content.js?v=rs-3', 'room-survey-engine.js?v=rs-3', 'room-survey-ui.js?v=rs-3']);
  assert.ok(!/word-limit-host\.js|room-survey-host\.js/.test(play), 'cards never load a host page');
  for (const css of ['card-table.css?v=ct-2', 'word-limit-theater.css?v=wl-6', 'room-survey.css?v=rs-3']) assert.ok(play.includes(`<link rel="stylesheet" href="${css}">`), css);
  assert.match(play, /wordlimit: \{ key: 'wl', page: 'wl-card-page', title: 'WORD LIMIT THEATER', ui: \(\) => WORD_LIMIT_UI \}/);
  assert.match(play, /roomsurvey: \{ key: 'rs', page: 'rs-card-page', title: 'ROOM SURVEY', ui: \(\) => ROOM_SURVEY_UI \}/);
  assert.match(play, /data\[spec\.key\]\?\.version === 1 && \/\^\[a-f0-9\]\{32\}\$\/\.test\(data\[spec\.key\]\.table \|\| ''\)/, 'only a well-formed table token is followed');
  assert.match(play, /new \(spec\.ui\(\)\.SYNC\.Table\)\(\{ db, code: session, token: table, actor: playerNum,/);
  assert.match(play, /send: command => ctTable \? ctTable\.command\(command\.type, command\)/);
  assert.match(play, /setCardTitle\(data\.name \|\| urlName\);\n\s+if \(renderCtCard\(data\)\) return;/, 'these games render before any other game');
  assert.match(play, /ctTable\?\.setVisible\(!document\.hidden\)/, 'a card in the background lets visible cards tick first');
  assert.match(play, /wkTable\?\.close\(\); wkTable = null; closeCt\(\);/, 'pagehide releases the table');
  assert.match(play, /closeCt\(\);\n\s+document\.body\.classList\.remove\('ct-card-page', 'wl-card-page', 'rs-card-page', 'ww-card-page'\);/, 'leaving to a waiting/error card releases it');
  assert.match(play, /'whoknows', 'wordlimit', 'roomsurvey', 'wordwolf'\]\.includes\(latestData\?\.game\)/);
  assert.match(play, /if \(ctCard\) ctCard\.paint\(\);/);
  for (const match of play.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});

test('the Hub lists both new games at the bottom, after Sketch Relay, with bilingual copy', () => {
  const hub = read('index.html');
  const links = [...hub.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)].map(match => match[1]);
  // 雙選賓果 (2026-10-30) was added after them as the last entry.
  assert.deepEqual(links.slice(-4), ['sketch-relay.html', 'word-limit-theater.html', 'room-survey.html', 'bingo-party.html']);
  for (const game of GAMES) assert.equal(links.filter(link => link === game.page).length, 1);
  assert.match(hub, /<h2>WORD LIMIT THEATER<\/h2>/); assert.match(hub, /<h2>ROOM SURVEY<\/h2>/);
  assert.match(hub, /assets\/word-limit-theater\/mark\.svg/); assert.match(hub, /assets\/room-survey\/mark\.svg/);
  assert.match(hub, /href="word-limit-theater\.html">[\s\S]*?👥 2–9/); assert.match(hub, /href="room-survey\.html">[\s\S]*?👥 3–9/);
  for (const key of ['tagWordLimit', 'descWordLimit', 'tagRoomSurvey', 'descRoomSurvey']) assert.match(hub, new RegExp(`${key}: \\{ en: '[^']+', zh: '[^']+' \\}`));
});

// Every first argument of t(…) in a file, without the template/prefix ones.
function keysUsed(source) {
  const keys = new Set();
  for (const match of source.matchAll(/(?<![\w$])(?:this\.|spec\.|this\.owner\.)?t\(/g)) {
    if (source.slice(Math.max(0, match.index - 5), match.index + 1).includes('I18N')) continue;
    let depth = 0, end = match.index + match[0].length;
    for (; end < source.length; end++) {
      const c = source[end];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) { if (!depth) break; depth--; }
      else if (c === ',' && !depth) break;
    }
    // Template literals build their key at run time; those are listed as dynamic keys.
    // So do 'prefix_' + (…) concatenations: drop the part after the plus.
    const argument = source.slice(match.index + match[0].length, end).replace(/`[^`]*`/g, '').replace(/\+\s*\((?:[^()]|\([^()]*\))*\)/g, '').replace(/(?:===|!==)\s*'[A-Za-z][A-Za-z0-9_]*'/g, '');
    for (const literal of argument.matchAll(/'([A-Za-z][A-Za-z0-9_]*)'/g)) if (!literal[1].endsWith('_')) keys.add(literal[1]);
  }
  return keys;
}

test('every interface string exists in English and Traditional Chinese', () => {
  const { C, WL, WE, RS, RE } = load();
  for (const [name, dict] of [['common', C.COMMON], ['wordlimit', WL.dict], ['roomsurvey', RS.dict]]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(Array.isArray(value) && value.length === 2 && value[0] && value[1], `${name}.${key}`);
      assert.doesNotMatch(value[0] + value[1], /[<>]/, `${name}.${key}`);
      assert.match(value[0], /[㐀-鿿]|^[A-Z !?’'.]+$/, `${name}.${key} has a Chinese half`);
    }
  }
  const all = { wordlimit: WL.t.dict, roomsurvey: RS.t.dict };
  const check = (dict, keys, where) => { for (const key of keys) assert.ok(Object.hasOwn(dict, key), `${where}: missing string ${key}`); };
  check(all.wordlimit, [...keysUsed(read('word-limit-ui.js')), ...keysUsed(read('word-limit-host.js'))], 'wordlimit');
  check(all.roomsurvey, [...keysUsed(read('room-survey-ui.js')), ...keysUsed(read('room-survey-host.js'))], 'roomsurvey');
  for (const dict of Object.values(all)) check(dict, keysUsed(read('card-table-ui.js')), 'card-table-ui');
  check(all.wordlimit, [...WE.CONFIG.units.flatMap(unit => [`unit_${unit}_one`, `unit_${unit}_many`, `unitOption_${unit}`]),
    ...WE.TIMED.flatMap(phase => ['close_' + phase, 'extend_' + phase]), 'shufflesOff', 'shufflesOne', 'shufflesN', 'linesOne', 'linesN'], 'wordlimit dynamic');
  check(all.roomsurvey, RE.TIMED.flatMap(phase => ['close_' + phase, 'extend_' + phase]), 'roomsurvey clock labels');
  check(all.roomsurvey, [...RE.CONFIG.categories.map(cat => 'cat_' + cat), 'cat_custom', ...['all', 'time', 'host', 'nobody'].map(r => 'over_' + r),
    ...['few_answers', 'keeper_left', 'host'].map(r => 'voided_' + r),
    ...[...read('room-survey-engine.js').matchAll(/logEntry\(round, [\w.]+, '([a-z]+)'/g)].map(m => 'log_' + m[1])], 'roomsurvey dynamic');
  for (const dict of Object.values(all)) check(dict, ['stale_turn', 'not_available', 'not_enough_players', 'invalid_options', 'invalid_roster', 'offline', 'cooldown', 'empty', 'duplicate', 'taken', 'locked', 'error',
    'connecting', 'switched', 'rosterChanged', 'roomChanged', 'noFirebase', 'tableEmpty'], 'status and errors');
  for (const game of GAMES) {
    const html = read(game.page);
    for (const match of html.matchAll(/data-i18n="([a-z]+)\.([A-Za-z_]+)"/g)) {
      if (match[1] === 'common') continue;
      const dict = match[1] === 'ct' ? C.COMMON : match[1] === game.ns ? (game.ns === 'wordlimit' ? WL.dict : RS.dict) : null;
      assert.ok(dict && Object.hasOwn(dict, match[2]), `${game.page}: ${match[1]}.${match[2]}`);
    }
  }
});

test('self-hosted fonts and their licences ship with the games; nothing loads from another site', () => {
  for (const css of ['word-limit-theater.css', 'room-survey.css', 'card-table.css']) {
    const text = read(css);
    for (const match of text.matchAll(/url\(([^)]+)\)/g)) {
      const file = match[1].replace(/['"]/g, '');
      assert.ok(!/^https?:/.test(file), `${css}: ${file} is local`);
      assert.ok(fs.existsSync(path.join(root, file)), `${css}: ${file} exists`);
    }
    assert.doesNotMatch(text, /@import/);
  }
  for (const licence of ['assets/word-limit-theater/OFL-Anton.txt', 'assets/word-limit-theater/OFL-CourierPrime.txt', 'assets/room-survey/OFL-PatrickHand.txt'])
    assert.match(read(licence), /SIL OPEN FONT LICENSE/i, licence);
});

function playSurvey(E, settings = {}) {
  let clock = 3_000_000, serial = 0;
  const roster = [1, 2, 3, 4].map(n => ({ playerNum: n, name: ['Amy', 'Kevin', 'Jason', 'Willy'][n - 1] }));
  const g = { state: E.create({ id: 'rs-ui', roster, settings, now: clock, seed: 11 }) };
  g.cmd = (actor, type, extra = {}) => {
    const next = E.apply(g.state, Object.assign({ id: `c-${++serial}-xxxxxxxx`, type, actor, sessionId: g.state.sessionId, stage: g.state.stage, now: clock, seed: serial }, extra));
    const error = next.replies?.[actor]?.error; assert.equal(next !== g.state && !error, true, `${type}: ${error || 'unchanged'}`); g.state = next;
  };
  g.advance = ms => { clock += ms; };
  return g;
}

test('ROOM SURVEY: the shared screen never shows a hidden answer, and typed text never becomes markup', () => {
  for (const lang of ['en', 'zh']) {
    const { RS, RE } = load(lang);
    const stage = g => RS.stage(RE.view(g.state, 0).rs);
    const g = playSurvey(RE);
    const keeper = g.state.round.keeper;
    assert.doesNotMatch(stage(g), /class="rs-option/, 'the prompt options stay on the Keeper’s card');
    for (const id of g.state.round.options) assert.equal(stage(g).includes(RE.CONTENT.get(id).en), false);
    g.cmd(keeper, 'custom', { text: 'What do you <b>hide</b> from your mom?' });
    assert.equal(stage(g).includes('<b>'), false);
    assert.ok(stage(g).includes('What do you b hide /b from your mom?'));
    const secret = ['zebra-one <img src=x>', 'zebra-two', 'zebra-three', 'zebra-four'];
    g.cmd(1, 'submit', { answers: [secret[0], 'Socks'] });
    g.cmd(2, 'submit', { answers: [secret[1], 'socks!'] });
    g.cmd(3, 'submit', { answers: [secret[2], 'Phone'] });
    g.cmd(4, 'submit', { answers: [secret[3], 'phone'] });
    assert.equal(g.state.phase, 'sort');
    const hidden = html => secret.concat(['Socks', 'Phone']).filter(text => html.includes(text.replace(/[<>]/g, '')));
    assert.deepEqual(hidden(stage(g)), [], 'sorting: nothing visible');
    g.cmd(keeper, 'startGuess');
    assert.deepEqual(hidden(stage(g)), [], 'guessing: tiles stay face down');
    assert.match(stage(g), /rs-turn is-open/, 'buzzing is open');
    const first = g.state.round.board[0], firstText = g.state.round.groups.find(group => group.id === first).text;
    const buzzer = g.state.round.players.find(n => n !== keeper);
    g.cmd(buzzer, 'buzz');
    assert.ok(stage(g).includes(['Amy', 'Kevin', 'Jason', 'Willy'][buzzer - 1]), 'the shared screen names the buzzer');
    assert.equal(hidden(stage(g)).length, 0, 'buzzing reveals nothing');
    g.cmd(keeper, 'hit', { group: first, buzz: g.state.round.buzz.serial });
    assert.ok(stage(g).includes(firstText), 'a found answer flips over');
    assert.equal(hidden(stage(g)).length, 1);
    g.cmd(1, 'pause'); assert.match(stage(g), /rs-paused/); assert.equal(hidden(stage(g)).length, 1);
    g.cmd(1, 'resume');
    g.cmd(2, 'close');
    const result = stage(g);
    assert.equal(hidden(result).length, 6, 'everything is revealed at the end');
    assert.equal(result.includes('<img'), false, 'answers never become markup');
    g.cmd(1, 'stop');
    assert.match(stage(g), /rs-phase-finished/);
  }
});

test('WORD LIMIT THEATER: the shared screen shows the scene, every role, limit and line value, and renders each phase', () => {
  for (const lang of ['en', 'zh']) {
    const { WL, WE } = load(lang);
    let clock = 4_000_000, serial = 0;
    const roster = [1, 2, 3, 4, 5].map(n => ({ playerNum: n, name: ['Amy', 'Kevin', 'Jason', 'Willy', 'Mia'][n - 1] }));
    let state = WE.create({ id: 'wl-ui', roster, settings: { sceneMinutes: 2, unit: lang === 'zh' ? 'chars' : 'words', points: { 6: 9 } }, now: clock, seed: 7 });
    const cmd = (actor, type, extra = {}) => {
      const next = WE.apply(state, Object.assign({ id: `w-${++serial}-xxxxxxxx`, type, actor, sessionId: state.sessionId, stage: state.stage, now: clock, seed: serial }, extra));
      assert.equal(next !== state && !next.replies?.[actor]?.error, true, `${type}: ${next.replies?.[actor]?.error || 'unchanged'}`); state = next;
    };
    const stage = () => WL.stage(WE.view(state, 0).wl);
    const scene = WE.CONTENT.scene(state.round.sceneId);
    const pick = item => lang === 'zh' ? item.zh : item.en;
    assert.ok(stage().includes(pick(scene.title)));
    for (const n of state.round.players) {
      const html = stage();
      assert.ok(html.includes(pick(scene.roles[state.round.roles[n]])), `role of seat ${n} is public`);
      assert.match(html, new RegExp(`>${state.round.limits[n]}<`), `limit of seat ${n} is public`);
    }
    assert.match(stage(), /wl-values[\s\S]*\+9/, 'the legend shows what each limit scores');
    cmd(2, 'close');
    assert.match(stage(), /wl-phase-scene|data-ct-ring/);
    assert.match(stage(), /class="wl-swap"/, 'the next swap is counted down');
    assert.doesNotMatch(stage(), /wl-cue|twist/i, 'no plot twists');
    cmd(3, 'foul', { target: 1 });
    const speaker = state.round.speaker;
    cmd(speaker, 'line', { speakingTurn: state.round.speakingTurn });
    assert.match(stage(), /wl-pop/, 'a line pops its points');
    cmd(1, 'pause'); assert.match(stage(), /wl-paused/); cmd(1, 'resume');
    cmd(5, 'close');
    assert.equal(state.phase, 'result');
    assert.ok(stage().includes(roster.find(p => p.playerNum === speaker).name), 'the actual current speaker who scored is named');
    assert.match(stage(), /wl-tally/);
    cmd(1, 'stop');
    assert.match(stage(), /wl-phase-finished/);
  }
});
