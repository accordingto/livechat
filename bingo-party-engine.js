/* bingo-party-engine.js — 雙選賓果 / DUAL-PICK BINGO rules.
 *
 * Pure and deterministic: apply(state, command) returns a NEW state and never
 * reads the clock or Math.random. The trusted authority (the host page, or the
 * host's own card in the same browser — bingo-party-sync.js) supplies
 * command.now, command.seed and command.uid, and is the only place this runs
 * for a live room. view(state, viewer) builds the per-seat projection that is
 * written to that seat's private Firebase node; secrets that a seat may not
 * see are never copied into it.
 *
 * Flow per round: type announced → both teams secretly nominate a number →
 * simultaneous reveal → card + roles → the type's own challenge → result
 * preview (A / B / BOTH / NEITHER) → host confirms → numbers called once,
 * lines and winners computed atomically → summary → next round.
 *
 * Spec: CODEX_FULL_IMPLEMENTATION_PROMPT.md (2026-10-29) plus the user's
 * 2026-10-30 addition of a fourth public director button, Speak English,
 * which returns the scene to its default English performance language. */
var BINGO_ENGINE = (() => {
  'use strict';
  const GAME = 'bingoparty';
  const TYPES = ['guess_person', 'song_relay', 'improv_scene', 'story_exchange', 'taboo_description'];
  const TEAMS = ['A', 'B'];
  const RESULTS = ['A', 'B', 'BOTH', 'NEITHER'];
  const DIRECTOR_KINDS = ['new_line', 'speak_mandarin', 'speak_taiwanese', 'speak_english'];
  const LANG_OF = { speak_mandarin: 'zh', speak_taiwanese: 'tw', speak_english: 'en' };
  const COMMAND_GAP_MS = 2000;      // shared public director anti-spam gap
  const DIRECTOR_FRESH_MS = 3500;   // a public command older than this is stale
  const LINE_MAX = 120;
  const LINE_QUEUE = 2;             // waiting lines per actor, plus one active
  const ALL_DONE_GRACE_MS = 3000;   // everyone answered → lock shortly after
  const DEFAULTS = Object.freeze({
    qLang: 'en', targetLines: 3, songTurns: 4, singing: true, sceneLang: 'en',
    t: Object.freeze({ nominate: 15, guess: 25, songTurn: 20, improv: 60, improvExtend: 30, story: 45, reply: 20, pick: 20, sing: 30, taboo: 35 }),
  });
  const LINES = (() => {
    const out = [];
    for (let r = 0; r < 5; r++) out.push({ id: 'r' + r, cells: [0, 1, 2, 3, 4].map(c => r * 5 + c) });
    for (let c = 0; c < 5; c++) out.push({ id: 'c' + c, cells: [0, 1, 2, 3, 4].map(r => r * 5 + c) });
    out.push({ id: 'd1', cells: [0, 6, 12, 18, 24] });
    out.push({ id: 'd2', cells: [4, 8, 12, 16, 20] });
    return out;
  })();
  // While paused only these player commands are accepted (drafting text and
  // handling an already-delivered private line). Host tools always work.
  const PAUSE_SAFE = new Set(['ready', 'songSuggest', 'stSuggestQ', 'stPropose', 'imLineResolve', 'imLineCancel', 'setSelfAway']);
  const HOST_ONLY = new Set(['setTeam', 'autoTeams', 'setSettings', 'setHost', 'start', 'addSeats', 'renameSeats', 'pause', 'resume',
    'extend', 'lockNow', 'beginChallenge', 'skipCard', 'swapRole', 'setAway', 'confirmResult', 'setResult', 'nextRound', 'endGame',
    'newGame', 'songJudge', 'songCorrect', 'imJudge', 'imExtend', 'imLineHide', 'tbFinish', 'tbCorrect', 'stEchoSkip', 'gpTalkDone', 'gpReopen']);

  /* ── small helpers ── */
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const other = team => team === 'A' ? 'B' : team === 'B' ? 'A' : null;
  const clampInt = (value, lo, hi, fallback) => Number.isInteger(value) && value >= lo && value <= hi ? value : fallback;
  function hash32(text) {
    let h = 0x811c9dc5;
    for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function cleanText(value, max) {
    const flat = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return Array.from(flat).slice(0, max).join('');
  }
  function tooLong(value, max) { return Array.from(String(value == null ? '' : value).replace(/\s+/g, ' ').trim()).length > max; }
  // Same-song check: trim, fold case/width and collapse spaces. Translations,
  // aliases and covers stay a host judgement; there is no song catalogue.
  const normSong = title => String(title || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  function bank() {
    if (typeof BINGO_PARTY_CONTENT !== 'undefined') return BINGO_PARTY_CONTENT;
    if (typeof require === 'function') return require('./bingo-party-content.js');
    throw new Error('content_missing');
  }
  const cardById = id => bank().cards.find(c => c.id === id) || null;
  const pick = (pair, lang) => pair ? (pair[lang] || pair.en || pair.zh || '') : '';

  /* ── roster ── */
  const roster = state => list(state.roster);
  const seat = (state, n) => roster(state).find(p => p.playerNum === n) || null;
  const members = (state, team) => roster(state).filter(p => p.team === team);
  const present = (state, team) => members(state, team).filter(p => !p.away);
  const nameOf = (state, n) => seat(state, n)?.name || ('#' + n);
  const isHost = (state, actor) => actor === 0 || (Number.isInteger(state.hostPlayerNum) && state.hostPlayerNum > 0 && actor === state.hostPlayerNum);
  const teamOf = (state, n) => seat(state, n)?.team || null;

  /* ── boards and lines ── */
  function makeBoards(seed) {
    const r = rng(seed ^ 0xb1a90);
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    const A = shuffle(nums, r);
    let B = shuffle(nums, r);
    while (B.every((n, i) => n === A[i])) B = shuffle(nums, r);
    return { A, B };
  }
  function linesDone(board, called) {
    const set = new Set(list(called));
    return LINES.filter(line => line.cells.every(cell => set.has(board[cell]))).map(line => line.id);
  }

  /* ── clocks (one live clock per round) ── */
  function setClock(state, kind, seconds, now, soft = false) {
    state.round.clock = { kind, soft, endsAt: state.paused ? null : now + seconds * 1000, frozen: state.paused ? seconds * 1000 : null, expired: false };
  }
  function clearClock(state) { if (state.round) state.round.clock = null; }
  function clockLeft(clock, now) {
    if (!clock) return null;
    if (clock.frozen != null) return clock.frozen;
    return clock.endsAt == null ? null : Math.max(0, clock.endsAt - now);
  }
  function timerDue(state, now) {
    const clock = state?.round?.clock;
    return !!(state && state.phase === 'playing' && !state.paused && clock && clock.endsAt != null && !clock.expired && now >= clock.endsAt);
  }

  /* ── log, replies ── */
  function log(state, cmd, kind, info) {
    state.logSeq = (state.logSeq || 0) + 1;
    state.log = [...list(state.log), { seq: state.logSeq, at: cmd.now, by: cmd.actor, kind, info: info || null, round: state.round?.no || 0 }].slice(-80);
  }
  const actorKey = actor => String(actor);
  function remember(state, cmd, error) {
    const key = actorKey(cmd.actor);
    state.seen = state.seen || {};
    state.seen[key] = [...list(state.seen[key]), cmd.id].slice(-48);
    state.replies = state.replies || {};
    state.replies[key] = { id: cmd.id, error: error || '', at: cmd.now };
    // Several taps can be in flight; keep each one's own answer for a while.
    state.replyLog = state.replyLog || {};
    state.replyLog[key] = [...list(state.replyLog[key]), { id: cmd.id, error: error || '' }].slice(-12);
    state.revision = (state.revision || 0) + 1;
    return state;
  }
  function fail(code) { const e = new Error(code); e.code = code; throw e; }

  /* ── fairness rotation ── */
  function stat(state, n) {
    state.stats = state.stats || {};
    return state.stats[n] = state.stats[n] || { lead: 0, leadAt: 0, support: 0, supportAt: 0, song: 0, songAt: 0 };
  }
  // Least-used first, then longest since last turn, then a reproducible tie.
  function rotate(state, candidates, key, salt, exclude = []) {
    const skip = new Set(exclude);
    const pool = candidates.filter(p => !skip.has(p.playerNum));
    const use = pool.length ? pool : candidates;
    if (!use.length) return null;
    const ranked = use.map(p => {
      const s = stat(state, p.playerNum);
      const avoid = list(state.round?.declined).includes(p.playerNum) ? 1 : 0;
      return { n: p.playerNum, avoid, count: s[key], at: s[key + 'At'], tie: hash32(`${state.seed}:${salt}:${p.playerNum}`) };
    }).sort((a, b) => a.avoid - b.avoid || a.count - b.count || a.at - b.at || a.tie - b.tie);
    return ranked[0].n;
  }
  function credit(state, n, key) {
    if (!n) return;
    const s = stat(state, n);
    s[key] += 1; s[key + 'At'] = state.round?.no || 0;
  }

  /* ── create / lobby ── */
  function normalizeSettings(input, base) {
    const s = clone(base || DEFAULTS);
    s.t = Object.assign({}, DEFAULTS.t, s.t || {});
    if (!input) return s;
    if (input.qLang === 'zh' || input.qLang === 'en') s.qLang = input.qLang;
    if (input.targetLines === 2 || input.targetLines === 3) s.targetLines = input.targetLines;
    if (Number.isInteger(input.songTurns)) s.songTurns = clampInt(input.songTurns, 2, 6, s.songTurns);
    if (typeof input.singing === 'boolean') s.singing = input.singing;
    if (['en', 'zh', 'tw'].includes(input.sceneLang)) s.sceneLang = input.sceneLang;
    if (input.t && typeof input.t === 'object') {
      const limits = { nominate: [10, 60], guess: [15, 90], songTurn: [10, 60], improv: [30, 180], improvExtend: [15, 60], story: [20, 120], reply: [10, 60], pick: [10, 60], sing: [15, 90], taboo: [20, 90] };
      for (const [key, [lo, hi]] of Object.entries(limits)) if (Number.isInteger(input.t[key])) s.t[key] = clampInt(input.t[key], lo, hi, s.t[key]);
    }
    return s;
  }
  function autoTeams(state, seed) {
    const players = roster(state).filter(p => p.team !== null || p.autoTeam !== false);
    const order = shuffle(players.map(p => p.playerNum), rng(seed ^ 0x7ea4));
    order.forEach((n, i) => { seat(state, n).team = i % 2 === 0 ? 'A' : 'B'; });
  }
  function create({ sessionId, seed, now, roster: seats, settings, hostPlayerNum = 0 }) {
    const state = {
      v: 1, game: GAME, sessionId: String(sessionId), seed: seed >>> 0, createdAt: now, phase: 'lobby', revision: 0,
      settings: normalizeSettings(settings), hostPlayerNum: 0,
      roster: list(seats).map(p => ({ playerNum: p.playerNum, name: cleanText(p.name, 40) || ('#' + p.playerNum), team: null, away: false, ready: false })),
      called: [], boards: null, stats: {}, round: null, history: [], log: [], logSeq: 0, seen: {}, replies: {}, paused: null,
    };
    autoTeams(state, state.seed);
    if (Number.isInteger(hostPlayerNum) && seat(state, hostPlayerNum)) state.hostPlayerNum = hostPlayerNum;
    return state;
  }
  function startCheck(state) {
    const a = present(state, 'A').length, b = present(state, 'B').length, total = members(state, 'A').length + members(state, 'B').length;
    if (a < 2 || b < 2) return 'team_too_small';
    if (members(state, 'A').length > 6 || members(state, 'B').length > 6) return 'team_too_large';
    if (total < 4 || total > 12) return 'player_count';
    return '';
  }
  function startMatch(state, cmd) {
    const problem = startCheck(state);
    if (problem) fail(problem);
    const r = rng(state.seed ^ 0x5eed);
    state.phase = 'playing';
    state.boards = makeBoards(state.seed);
    state.called = [];
    state.fallbackFirst = r() < 0.5 ? 'A' : 'B';
    state.firsts = { song_relay: r() < 0.5 ? 'A' : 'B', improv_scene: r() < 0.5 ? 'A' : 'B', story_exchange: r() < 0.5 ? 'A' : 'B', taboo_description: r() < 0.5 ? 'A' : 'B' };
    state.typeBag = null; state.lastType = null; state.used = {}; state.lastCard = {};
    state.startedAt = cmd.now;
    state.roundNo = 0;
    log(state, cmd, 'start', { targetLines: state.settings.targetLines });
    newRound(state, cmd);
  }

  /* ── type bag and deck ── */
  function activeTypes(state) { return TYPES.filter(t => t !== 'song_relay' || state.settings.singing); }
  function drawType(state, random) {
    if (state.roundNo === 1) { state.typeBag = shuffle(activeTypes(state).filter(t => t !== 'guess_person'), random); return 'guess_person'; }
    let bag = list(state.typeBag).filter(t => activeTypes(state).includes(t));
    if (!bag.length) {
      bag = shuffle(activeTypes(state), random);
      // Never the same type twice in a row across bags.
      if (bag.length > 1 && bag[0] === state.lastType) { const swap = 1 + Math.floor(random() * (bag.length - 1)); [bag[0], bag[swap]] = [bag[swap], bag[0]]; }
    }
    const type = bag.shift();
    state.typeBag = bag;
    return type;
  }
  function drawCard(state, type, random) {
    const deck = bank().cards.filter(c => c.type === type).map(c => c.id);
    state.used = state.used || {};
    let used = list(state.used[type]);
    let pool = deck.filter(id => !used.includes(id));
    if (!pool.length) { used = []; pool = deck.filter(id => id !== state.lastCard?.[type]); if (!pool.length) pool = deck; }
    const id = pool[Math.floor(random() * pool.length)];
    state.used[type] = [...used, id];
    state.lastCard = Object.assign({}, state.lastCard, { [type]: id });
    return id;
  }
  function newRound(state, cmd) {
    state.roundNo = (state.roundNo || 0) + 1;
    const random = rng((cmd.seed >>> 0) ^ hash32(state.sessionId + ':' + state.roundNo));
    const type = drawType(state, random);
    state.lastType = type;
    const cardId = drawCard(state, type, random);
    const fallbackTeam = state.roundNo % 2 === 1 ? state.fallbackFirst : other(state.fallbackFirst);
    state.round = {
      id: 'r' + state.roundNo + '-' + String(cmd.uid || cmd.id).slice(0, 8), no: state.roundNo, type, cardId, fallbackTeam,
      stage: 'nominating', version: 1, declined: [],
      nominations: { A: { votes: {}, pick: null, auto: false }, B: { votes: {}, pick: null, auto: false } },
      roles: {}, sub: null, proposed: null, override: null, result: null, settled: null, clock: null, startedAt: cmd.now,
    };
    setClock(state, 'nominate', state.settings.t.nominate, cmd.now);
  }

  /* ── nominations ── */
  function voters(state, team) { return present(state, team).map(p => p.playerNum); }
  function allVoted(state) {
    const n = state.round.nominations;
    return TEAMS.every(team => voters(state, team).every(pn => Number.isInteger(n[team].votes[pn])));
  }
  function tallyTeam(state, team) {
    const votes = state.round.nominations[team].votes, called = new Set(state.called);
    const counts = new Map();
    for (const [pn, number] of Object.entries(votes)) {
      if (!voters(state, team).includes(Number(pn)) || called.has(number)) continue;
      counts.set(number, (counts.get(number) || 0) + 1);
    }
    const salt = `${state.seed}:${state.round.no}:${team}`;
    if (!counts.size) {
      const open = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !called.has(n));
      return { pick: open[hash32(salt + ':auto') % open.length], auto: true };
    }
    const top = Math.max(...counts.values());
    const tied = [...counts.entries()].filter(([, c]) => c === top).map(([n]) => n).sort((a, b) => a - b);
    // A reproducible draw among tied numbers, not a bias toward the smallest.
    return { pick: tied[hash32(salt + ':tie:' + tied.join(',')) % tied.length], auto: false, tied: tied.length > 1 };
  }
  function lockNominations(state, cmd) {
    for (const team of TEAMS) Object.assign(state.round.nominations[team], tallyTeam(state, team));
    state.round.stage = 'revealed';
    state.round.revealedAt = cmd.now;
    clearClock(state);
    assignRoles(state, cmd);
  }

  /* ── roles per type ── */
  function assignRoles(state, cmd) {
    const round = state.round, type = round.type, no = round.no;
    if (type === 'guess_person') {
      round.roles = { protagonist: {} };
      for (const team of TEAMS) round.roles.protagonist[team] = rotate(state, present(state, team), 'lead', `gp:${no}:${team}`);
    } else if (type === 'song_relay') {
      round.roles = { first: state.firsts.song_relay };
    } else if (type === 'improv_scene') {
      const first = state.firsts.improv_scene;
      round.roles = { first, actors: {} };
      for (const team of TEAMS) {
        const one = rotate(state, present(state, team), 'lead', `im:${no}:${team}:1`);
        const two = rotate(state, present(state, team), 'lead', `im:${no}:${team}:2`, [one]);
        round.roles.actors[team] = [one, two];
      }
    } else if (type === 'story_exchange') {
      const first = state.firsts.story_exchange;
      round.roles = { first, sharer: {}, interviewer: {} };
      for (const team of TEAMS) round.roles.sharer[team] = rotate(state, present(state, team), 'lead', `st:${no}:${team}`);
      for (const team of TEAMS) round.roles.interviewer[team] = rotate(state, present(state, team), 'support', `si:${no}:${team}`, [round.roles.sharer[team]]);
    } else if (type === 'taboo_description') {
      const first = state.firsts.taboo_description;
      round.roles = { first, describer: {} };
      for (const team of TEAMS) round.roles.describer[team] = rotate(state, present(state, team), 'lead', `tb:${no}:${team}`);
    }
  }
  function beginChallenge(state, cmd) {
    const round = state.round, t = state.settings.t;
    round.stage = 'challenge';
    round.challengeAt = cmd.now;
    const random = rng((cmd.seed >>> 0) ^ hash32(round.id + ':sub'));
    if (round.type === 'guess_person') {
      const eligible = {};
      for (const team of TEAMS) eligible[team] = present(state, team).map(p => p.playerNum).filter(n => n !== round.roles.protagonist[team]);
      round.sub = { stage: 'answer', answers: { A: null, B: null }, guesses: {}, eligible, hits: null };
      setClock(state, 'guess', t.guess, cmd.now);
    } else if (round.type === 'song_relay') {
      const first = round.roles.first, turns = [];
      for (let i = 1; i <= state.settings.songTurns; i++) for (const team of [first, other(first)]) turns.push({ turnId: `${round.id}-s${turns.length + 1}`, team, idx: i, performer: null, status: 'pending', title: '', mode: 'sing', dup: false, timeUp: false });
      round.sub = { turns, cur: 0, suggestions: { A: [], B: [] }, roundCount: {} };
      startSongTurn(state, cmd);
    } else if (round.type === 'improv_scene') {
      const first = round.roles.first;
      round.sub = { cur: 0, segs: [first, other(first)].map((team, i) => ({
        segmentId: `${round.id}-m${i + 1}`, team, actors: round.roles.actors[team].slice(), stage: 'ready', lang: state.settings.sceneLang,
        events: [], seq: 0, lastCmdAt: 0, lines: [], complete: null, extended: 0 })) };
    } else if (round.type === 'story_exchange') {
      const first = round.roles.first;
      round.sub = { stage: 'cycles', cur: 0, echo: { by: null, done: false }, cycles: [first, other(first)].map((team, i) => ({
        cycleId: `${round.id}-c${i + 1}`, team, sharer: round.roles.sharer[team], interviewer: round.roles.interviewer[other(team)],
        stage: 'share', qSuggest: {}, proposals: [], song: null, songVersion: 0, singResult: null, songLog: [] })) };
      setClock(state, 'story', t.story, cmd.now, true);
    } else if (round.type === 'taboo_description') {
      const first = round.roles.first, card = cardById(round.cardId);
      const targets = shuffle(card.targets, random);
      round.sub = { cur: 0, segs: [first, other(first)].map((team, i) => ({
        segmentId: `${round.id}-t${i + 1}`, team, describer: round.roles.describer[team], stage: 'ready', idx: 0,
        targets: targets.slice(i * 2, i * 2 + 2).map(x => ({ tid: x.id, result: null, at: null })) })) };
    }
    if (!round.credited) { for (const n of rolePlayers(state)) credit(state, n.n, n.key); round.credited = true; }
    // Next time this type comes back, the other team goes first.
    if (!round.flipped && state.firsts?.[round.type]) { state.firsts[round.type] = other(state.firsts[round.type]); round.flipped = true; }
  }
  function rolePlayers(state) {
    const r = state.round.roles, out = [];
    if (state.round.type === 'guess_person') TEAMS.forEach(t => out.push({ n: r.protagonist[t], key: 'lead' }));
    if (state.round.type === 'improv_scene') TEAMS.forEach(t => r.actors[t].forEach(n => out.push({ n, key: 'lead' })));
    if (state.round.type === 'story_exchange') TEAMS.forEach(t => { out.push({ n: r.sharer[t], key: 'lead' }); out.push({ n: r.interviewer[t], key: 'support' }); });
    if (state.round.type === 'taboo_description') TEAMS.forEach(t => out.push({ n: r.describer[t], key: 'lead' }));
    return out.filter(x => x.n);
  }

  /* ── guess_person ── */
  function guessComplete(state) {
    const sub = state.round.sub;
    return TEAMS.every(t => sub.answers[t]) && TEAMS.every(t => sub.eligible[t].every(n => sub.guesses[n]));
  }
  function guessDeadline(state, cmd) {
    const sub = state.round.sub;
    if (!TEAMS.every(t => sub.answers[t])) {
      // A missing protagonist answer is never invented: stop and let the host
      // extend, replace the protagonist or redraw without leaking anything.
      sub.stage = 'blocked'; state.round.clock.expired = true;
      return;
    }
    revealGuess(state, cmd);
  }
  function revealGuess(state, cmd) {
    const sub = state.round.sub;
    sub.hits = {};
    for (const team of TEAMS) {
      const eligible = sub.eligible[team];
      sub.hits[team] = { hit: eligible.filter(n => sub.guesses[n] === sub.answers[team]).length, of: eligible.length };
    }
    sub.stage = 'reveal';
    clearClock(state);
    sub.revealedAt = cmd.now;
  }
  function guessResult(sub) {
    const a = sub.hits.A, b = sub.hits.B;
    // Cross-multiplied ratios: a.hit/a.of vs b.hit/b.of with no floats.
    const left = a.hit * b.of, right = b.hit * a.of;
    const aZero = a.hit === 0, bZero = b.hit === 0;
    if (aZero && bZero) return 'NEITHER';
    if (left > right) return 'A';
    if (right > left) return 'B';
    return 'BOTH';
  }

  /* ── song_relay ── */
  function startSongTurn(state, cmd) {
    const sub = state.round.sub, turn = sub.turns[sub.cur];
    if (!turn) return;
    turn.performer = pickSinger(state, turn.team, cmd);
    turn.status = 'live';
    turn.startedAt = cmd.now;
    setClock(state, 'songTurn', state.settings.t.songTurn, cmd.now, true);
  }
  function pickSinger(state, team, cmd, exclude = []) {
    const sub = state.round.sub, candidates = present(state, team).filter(p => !exclude.includes(p.playerNum));
    if (!candidates.length) return present(state, team)[0]?.playerNum || null;
    // Everyone sings once before anyone repeats this round; across rounds the
    // people who did not get a turn last time go first.
    const ranked = candidates.map(p => ({ n: p.playerNum, here: sub.roundCount[p.playerNum] || 0, s: stat(state, p.playerNum),
      avoid: list(state.round.declined).includes(p.playerNum) ? 1 : 0, tie: hash32(`${state.seed}:${state.round.no}:${sub.cur}:${p.playerNum}`) }))
      .sort((a, b) => a.here - b.here || a.avoid - b.avoid || a.s.song - b.s.song || a.s.songAt - b.s.songAt || a.tie - b.tie);
    const n = ranked[0].n;
    sub.roundCount[n] = (sub.roundCount[n] || 0) + 1;
    const s = stat(state, n); s.song += 1; s.songAt = state.round.no;
    return n;
  }
  function acceptedSongs(sub, exceptTurn) {
    return sub.turns.filter(t => t.status === 'valid' && t.turnId !== exceptTurn).map(t => ({ norm: normSong(t.title), title: t.title, team: t.team, turnId: t.turnId }));
  }
  function songScores(sub) {
    const out = { A: 0, B: 0 };
    for (const t of sub.turns) if (t.status === 'valid') out[t.team] += 1;
    return out;
  }
  function songsFinished(sub) { return sub.turns.every(t => ['valid', 'invalid', 'skipped'].includes(t.status)); }
  const scoreResult = s => s.A === 0 && s.B === 0 ? 'NEITHER' : s.A > s.B ? 'A' : s.B > s.A ? 'B' : 'BOTH';

  /* ── improv_scene ── */
  const curSeg = state => state.round?.sub?.segs?.[state.round.sub.cur] || null;
  function promoteLine(seg, target) {
    if (seg.lines.some(l => l.target === target && l.status === 'active')) return;
    const next = seg.lines.find(l => l.target === target && l.status === 'waiting');
    if (next) { next.status = 'active'; }
  }
  function closeSegmentLines(seg) {
    for (const line of seg.lines) {
      if (line.status === 'waiting' || line.status === 'active') line.status = 'expired';
      line.text = ''; // private text is kept only while the segment is live
    }
  }
  function improvResult(sub) {
    const done = sub.segs.map(s => s.complete === true);
    const team = sub.segs.map(s => s.team);
    if (done[0] && done[1]) return 'BOTH';
    if (!done[0] && !done[1]) return 'NEITHER';
    return done[0] ? team[0] : team[1];
  }

  /* ── story_exchange ── */
  const curCycle = state => state.round?.sub?.cycles?.[state.round.sub.cur] || null;
  function finishCycle(state, cmd, cycle) {
    cycle.stage = 'done';
    const sub = state.round.sub;
    if (sub.cur < sub.cycles.length - 1) {
      sub.cur += 1;
      setClock(state, 'story', state.settings.t.story, cmd.now, true);
    } else {
      sub.stage = 'echo';
      clearClock(state);
    }
  }
  function newSong(cycle, fields, source, by, cmd) {
    cycle.songVersion = (cycle.songVersion || 0) + 1;
    cycle.song = { version: cycle.songVersion, title: fields.title, artist: fields.artist || '', reason: fields.reason || '', by, source, at: cmd.now };
    cycle.songLog = [...cycle.songLog, { version: cycle.songVersion, title: fields.title, source, by }].slice(-8);
  }

  /* ── taboo ── */
  const curTaboo = state => state.round?.sub?.segs?.[state.round.sub.cur] || null;
  function tabooScores(sub) {
    const out = { A: 0, B: 0 };
    for (const seg of sub.segs) out[seg.team] += seg.targets.filter(t => t.result === 'hit').length;
    return out;
  }
  function advanceTaboo(state, cmd, seg) {
    if (seg.idx >= seg.targets.length) {
      seg.stage = 'done';
      clearClock(state);
      const sub = state.round.sub;
      if (sub.cur < sub.segs.length - 1) sub.cur += 1;
      else toResult(state, cmd);
    }
  }

  /* ── results and settlement ── */
  function computeResult(state) {
    const round = state.round, sub = round.sub;
    if (!sub) return null;
    if (round.type === 'guess_person') return sub.hits ? guessResult(sub) : null;
    if (round.type === 'song_relay') return songsFinished(sub) ? scoreResult(songScores(sub)) : null;
    if (round.type === 'improv_scene') return sub.segs.every(s => s.stage === 'judged') ? improvResult(sub) : null;
    if (round.type === 'story_exchange') return sub.stage === 'done' ? 'BOTH' : null;
    if (round.type === 'taboo_description') return sub.segs.every(s => s.stage === 'done') ? scoreResult(tabooScores(sub)) : null;
    return null;
  }
  function toResult(state, cmd) {
    const round = state.round;
    round.stage = 'result';
    round.proposed = computeResult(state);
    round.version += 1;
    round.resultAt = cmd.now;
    clearClock(state);
  }
  function refreshProposed(state) {
    if (state.round?.stage === 'result') { state.round.proposed = computeResult(state); state.round.version += 1; }
  }
  function settle(state, cmd) {
    const round = state.round;
    const result = round.override || round.proposed;
    if (!RESULTS.includes(result)) fail('no_result');
    const picks = { A: round.nominations.A.pick, B: round.nominations.B.pick };
    const toCall = result === 'A' ? [picks.A] : result === 'B' ? [picks.B] : result === 'BOTH' ? [picks.A, picks.B] : [picks[round.fallbackTeam]];
    const before = { A: linesDone(state.boards.A, state.called), B: linesDone(state.boards.B, state.called) };
    const fresh = [...new Set(toCall)].filter(n => !state.called.includes(n));
    // Every number of the round joins the one shared set first; only then are
    // both boards counted. Nobody wins on the first of two numbers.
    state.called = [...state.called, ...fresh];
    const after = { A: linesDone(state.boards.A, state.called), B: linesDone(state.boards.B, state.called) };
    const target = state.settings.targetLines;
    const reached = TEAMS.filter(t => after[t].length >= target);
    const winner = reached.length === 2 ? 'BOTH' : reached[0] || null;
    round.result = result;
    round.settled = { called: fresh, picks, result, newLines: { A: after.A.filter(id => !before.A.includes(id)), B: after.B.filter(id => !before.B.includes(id)) },
      lines: { A: after.A.length, B: after.B.length }, winner, at: cmd.now };
    round.stage = 'summary';
    clearClock(state);
    // Story suggestions, proposals and follow-up drafts are round-only.
    if (round.type === 'story_exchange') for (const c of round.sub.cycles) { c.qSuggest = {}; c.proposals = []; }
    if (round.type === 'improv_scene') for (const s of round.sub.segs) closeSegmentLines(s);
    state.history = [...list(state.history), { no: round.no, type: round.type, cardId: round.cardId, result, called: fresh, picks, fallbackTeam: round.fallbackTeam,
      lines: round.settled.lines, winner }].slice(-60);
    log(state, cmd, 'settle', { result, called: fresh });
    if (winner) {
      state.phase = 'finished';
      state.finished = { winner, early: false, at: cmd.now };
    }
  }

  /* ── command handling ── */
  function requirePlaying(state) { if (state.phase !== 'playing' || !state.round) fail('not_playing'); }
  function requireStage(state, stage) { requirePlaying(state); if (state.round.stage !== stage) fail('wrong_stage'); }
  function requireType(state, type) { requireStage(state, 'challenge'); if (state.round.type !== type) fail('wrong_stage'); }
  function requireMember(state, actor) {
    const p = seat(state, actor);
    if (!p || !p.team) fail('not_participant');
    if (p.away) fail('away');
    return p;
  }
  function tick(state, cmd) {
    if (!timerDue(state, cmd.now)) return;
    const round = state.round, clock = round.clock;
    if (clock.soft) {
      clock.expired = true;
      if (round.type === 'song_relay' && round.sub?.turns[round.sub.cur]) round.sub.turns[round.sub.cur].timeUp = true;
      return;
    }
    if (round.stage === 'nominating') return lockNominations(state, cmd);
    if (round.type === 'guess_person' && round.sub?.stage === 'answer') return guessDeadline(state, cmd);
    if (round.type === 'improv_scene') {
      const seg = curSeg(state);
      if (seg?.stage === 'live') { seg.stage = 'wrapup'; clock.expired = true; return; }
    }
    if (round.type === 'taboo_description') {
      const seg = curTaboo(state);
      if (seg?.stage === 'live') { seg.stage = 'timeup'; clock.expired = true; return; }
    }
    clock.expired = true;
  }

  const handlers = {
    /* lobby */
    ready(state, cmd) {
      if (state.phase !== 'lobby') fail('wrong_stage');
      const p = seat(state, cmd.actor); if (!p) fail('not_participant');
      p.ready = cmd.ready !== false;
    },
    setTeam(state, cmd) {
      if (state.phase !== 'lobby') fail('wrong_stage');
      const p = seat(state, cmd.playerNum); if (!p) fail('bad_player');
      if (![null, 'A', 'B'].includes(cmd.team)) fail('bad_team');
      if (cmd.team && members(state, cmd.team).filter(m => m.playerNum !== p.playerNum).length >= 6) fail('team_too_large');
      p.team = cmd.team; p.autoTeam = cmd.team !== null;
    },
    autoTeams(state, cmd) {
      if (state.phase !== 'lobby') fail('wrong_stage');
      autoTeams(state, cmd.seed);
    },
    setSettings(state, cmd) {
      if (state.phase !== 'lobby') fail('wrong_stage');
      state.settings = normalizeSettings(cmd.settings, state.settings);
    },
    setHost(state, cmd) {
      const n = Number(cmd.playerNum) || 0;
      if (n && !seat(state, n)) fail('bad_player');
      state.hostPlayerNum = n;
      log(state, cmd, 'host', { playerNum: n });
    },
    start(state, cmd) {
      if (state.phase !== 'lobby') fail('wrong_stage');
      startMatch(state, cmd);
    },
    addSeats(state, cmd) {
      // Late arrivals watch this match and play from the next one.
      for (const s of list(cmd.seats)) {
        if (!Number.isInteger(s.playerNum) || s.playerNum < 1 || s.playerNum > 12) continue;
        const existing = seat(state, s.playerNum);
        if (existing) { if (cleanText(s.name, 40)) existing.name = cleanText(s.name, 40); continue; }
        state.roster = [...roster(state), { playerNum: s.playerNum, name: cleanText(s.name, 40) || ('#' + s.playerNum), team: null, away: false, ready: false, autoTeam: false, late: state.phase !== 'lobby' }];
      }
      state.roster.sort((a, b) => a.playerNum - b.playerNum);
    },
    renameSeats(state, cmd) {
      for (const s of list(cmd.seats)) { const p = seat(state, s.playerNum); if (p && cleanText(s.name, 40)) p.name = cleanText(s.name, 40); }
    },
    setAway(state, cmd) {
      const p = seat(state, cmd.playerNum); if (!p) fail('bad_player');
      p.away = cmd.away === true;
      log(state, cmd, 'away', { playerNum: p.playerNum, away: p.away });
    },
    setSelfAway(state, cmd) {
      const p = seat(state, cmd.actor); if (!p) fail('not_participant');
      p.away = cmd.away === true;
      log(state, cmd, 'away', { playerNum: p.playerNum, away: p.away, self: true });
    },
    /* host flow */
    pause(state, cmd) {
      requirePlaying(state);
      if (state.paused) return;
      state.paused = { at: cmd.now };
      const clock = state.round.clock;
      if (clock && clock.endsAt != null) { clock.frozen = Math.max(0, clock.endsAt - cmd.now); clock.endsAt = null; }
      log(state, cmd, 'pause');
    },
    resume(state, cmd) {
      requirePlaying(state);
      if (!state.paused) return;
      const clock = state.round.clock;
      if (clock && clock.frozen != null) { clock.endsAt = cmd.now + clock.frozen; clock.frozen = null; }
      state.paused = null;
      log(state, cmd, 'resume');
    },
    extend(state, cmd) {
      requirePlaying(state);
      const seconds = clampInt(cmd.seconds, 5, 120, 15), clock = state.round.clock;
      const sub = state.round.sub;
      if (state.round.type === 'guess_person' && sub?.stage === 'blocked') {
        sub.stage = 'answer'; setClock(state, 'guess', seconds, cmd.now);
      } else if (state.round.type === 'taboo_description' && curTaboo(state)?.stage === 'timeup') {
        curTaboo(state).stage = 'live'; setClock(state, 'taboo', seconds, cmd.now);
      } else if (state.round.type === 'improv_scene' && curSeg(state)?.stage === 'wrapup') {
        return handlers.imExtend(state, Object.assign({}, cmd, { segmentId: curSeg(state).segmentId }));
      } else {
        if (!clock) fail('no_clock');
        if (clock.frozen != null) clock.frozen += seconds * 1000;
        else if (clock.expired || clock.endsAt <= cmd.now) { clock.endsAt = cmd.now + seconds * 1000; clock.expired = false; }
        else clock.endsAt += seconds * 1000;
      }
      log(state, cmd, 'extend', { seconds });
    },
    lockNow(state, cmd) {
      requirePlaying(state);
      if (state.round.stage === 'nominating') { lockNominations(state, cmd); log(state, cmd, 'lock', { what: 'nominations' }); return; }
      if (state.round.type === 'guess_person' && state.round.sub?.stage === 'answer') {
        guessDeadline(state, cmd); log(state, cmd, 'lock', { what: 'guess' }); return;
      }
      fail('wrong_stage');
    },
    beginChallenge(state, cmd) {
      requireStage(state, 'revealed');
      beginChallenge(state, cmd);
    },
    skipCard(state, cmd) {
      requirePlaying(state);
      const round = state.round;
      if (!['revealed', 'challenge'].includes(round.stage)) fail('wrong_stage');
      // Same type, a fresh card; nominations and the board stay untouched.
      const random = rng((cmd.seed >>> 0) ^ hash32(round.id + ':skip:' + cmd.id));
      round.cardId = drawCard(state, round.type, random);
      if (round.type === 'improv_scene' && round.sub) for (const s of round.sub.segs) closeSegmentLines(s);
      round.sub = null; round.stage = 'revealed'; round.version += 1; clearClock(state);
      log(state, cmd, 'skipCard', { cardId: round.cardId });
    },
    swapRole(state, cmd) {
      requirePlaying(state);
      const round = state.round, team = cmd.team;
      if (!TEAMS.includes(team)) fail('bad_team');
      if (!['revealed', 'challenge'].includes(round.stage)) fail('wrong_stage');
      const chosen = Number.isInteger(cmd.playerNum) ? cmd.playerNum : null;
      const valid = n => present(state, team).some(p => p.playerNum === n);
      if (chosen != null && !valid(chosen)) fail('bad_player');
      const choose = (current, key, excludeMore = []) => {
        if (current) round.declined = [...list(round.declined), current];
        return chosen != null ? chosen : rotate(state, present(state, team), key, `swap:${cmd.id}`, [current, ...excludeMore].filter(Boolean));
      };
      if (round.type === 'guess_person') {
        if (round.sub?.stage === 'reveal') fail('wrong_stage');
        const old = round.roles.protagonist[team];
        const n = choose(old, 'lead');
        round.roles.protagonist[team] = n; credit(state, n, 'lead');
        if (round.sub) {
          round.sub.answers[team] = null;
          round.sub.eligible[team] = present(state, team).map(p => p.playerNum).filter(x => x !== n);
          for (const g of Object.keys(round.sub.guesses)) if (teamOf(state, Number(g)) === team) delete round.sub.guesses[g];
          if (round.sub.stage !== 'reveal') { round.sub.stage = 'answer'; setClock(state, 'guess', state.settings.t.guess, cmd.now); }
        }
      } else if (round.type === 'song_relay') {
        const turn = round.sub?.turns[round.sub.cur];
        if (!turn || turn.team !== team || turn.status !== 'live') fail('wrong_stage');
        if (turn.performer) { round.declined = [...list(round.declined), turn.performer]; round.sub.roundCount[turn.performer] = Math.max(0, (round.sub.roundCount[turn.performer] || 1) - 1); }
        turn.performer = chosen != null ? chosen : pickSinger(state, team, cmd, [turn.performer]);
        if (chosen != null) round.sub.roundCount[chosen] = (round.sub.roundCount[chosen] || 0) + 1;
        turn.title = ''; turn.dup = false; turn.timeUp = false;
        setClock(state, 'songTurn', state.settings.t.songTurn, cmd.now, true);
      } else if (round.type === 'improv_scene') {
        const slot = cmd.slot === 1 ? 1 : 0;
        const seg = round.sub?.segs.find(s => s.team === team);
        if (seg && !['ready', 'live'].includes(seg.stage)) fail('wrong_stage');
        const actors = seg ? seg.actors : round.roles.actors[team];
        const n = choose(actors[slot], 'lead', [actors[1 - slot]]);
        if (n === actors[1 - slot]) fail('bad_player');
        const replaced = actors[slot];
        actors[slot] = n; credit(state, n, 'lead');
        if (seg) {
          for (const line of seg.lines) if (line.target === replaced && ['active', 'waiting'].includes(line.status)) { line.status = 'expired'; line.text = ''; }
          round.roles.actors[team] = seg.actors.slice();
        }
      } else if (round.type === 'story_exchange') {
        const role = cmd.role === 'interviewer' ? 'interviewer' : 'sharer';
        const n = choose(round.roles[role][team], role === 'sharer' ? 'lead' : 'support', [role === 'interviewer' ? round.roles.sharer[team] : round.roles.interviewer[team]]);
        round.roles[role][team] = n; credit(state, n, role === 'sharer' ? 'lead' : 'support');
        if (round.sub) for (const c of round.sub.cycles) {
          if (c.stage === 'done') continue;
          if (role === 'sharer' && c.team === team) c.sharer = n;
          if (role === 'interviewer' && other(c.team) === team) c.interviewer = n;
        }
      } else if (round.type === 'taboo_description') {
        const seg = round.sub?.segs.find(s => s.team === team);
        if (seg && seg.stage !== 'ready') fail('wrong_stage');
        const n = choose(round.roles.describer[team], 'lead');
        round.roles.describer[team] = n; credit(state, n, 'lead');
        if (seg) seg.describer = n;
      }
      round.version += 1;
      log(state, cmd, 'swap', { team, role: cmd.role || null });
    },
    setResult(state, cmd) {
      requireStage(state, 'result');
      if (cmd.result != null && !RESULTS.includes(cmd.result)) fail('bad_result');
      state.round.override = cmd.result || null;
      state.round.version += 1;
      log(state, cmd, 'override', { result: cmd.result || null });
    },
    confirmResult(state, cmd) {
      requireStage(state, 'result');
      if (Number.isInteger(cmd.version) && cmd.version !== state.round.version) fail('stale_version');
      settle(state, cmd);
    },
    nextRound(state, cmd) {
      requireStage(state, 'summary');
      newRound(state, cmd);
    },
    endGame(state, cmd) {
      if (state.phase !== 'playing') fail('wrong_stage');
      if (state.round?.type === 'improv_scene' && state.round.sub) for (const s of state.round.sub.segs) closeSegmentLines(s);
      state.phase = 'finished';
      state.finished = { winner: null, early: true, at: cmd.now };
      state.paused = null; clearClock(state);
      log(state, cmd, 'endGame');
    },
    newGame(state, cmd) {
      if (state.phase === 'lobby') fail('wrong_stage');
      const next = create({ sessionId: cmd.uid || (state.sessionId + '-n'), seed: cmd.seed, now: cmd.now, roster: roster(state), settings: state.settings, hostPlayerNum: state.hostPlayerNum });
      // Keep the teams the room just played with; the lobby can reshuffle.
      // A chosen spectator (team null) stays a spectator; only late arrivals join.
      for (const p of roster(next)) { const old = seat(state, p.playerNum); if (old) { p.team = old.team; p.autoTeam = old.autoTeam; } p.away = old?.away === true; }
      for (const p of roster(next)) {
        const old = seat(state, p.playerNum);
        if (!old?.late || p.team) continue;
        const a = members(next, 'A').length, b = members(next, 'B').length;
        if (Math.min(a, b) < 6) p.team = a <= b ? 'A' : 'B';
      }
      return next;
    },
    /* nominations */
    vote(state, cmd) {
      requireStage(state, 'nominating');
      const p = requireMember(state, cmd.actor), n = cmd.number;
      if (!Number.isInteger(n) || n < 1 || n > 25) fail('bad_number');
      if (state.called.includes(n)) fail('already_called');
      state.round.nominations[p.team].votes[p.playerNum] = n;
      if (allVoted(state) && state.round.clock?.endsAt != null) state.round.clock.endsAt = Math.min(state.round.clock.endsAt, cmd.now + ALL_DONE_GRACE_MS);
    },
    /* guess_person */
    gpAnswer(state, cmd) {
      requireType(state, 'guess_person');
      const sub = state.round.sub, p = requireMember(state, cmd.actor);
      if (sub.stage !== 'answer') fail('wrong_stage');
      if (state.round.roles.protagonist[p.team] !== p.playerNum) fail('not_your_role');
      if (!cardById(state.round.cardId).options.some(o => o.id === cmd.option)) fail('bad_option');
      sub.answers[p.team] = cmd.option;
      if (guessComplete(state) && state.round.clock?.endsAt != null) state.round.clock.endsAt = Math.min(state.round.clock.endsAt, cmd.now + ALL_DONE_GRACE_MS);
    },
    gpGuess(state, cmd) {
      requireType(state, 'guess_person');
      const sub = state.round.sub, p = requireMember(state, cmd.actor);
      if (sub.stage !== 'answer') fail('wrong_stage');
      if (!sub.eligible[p.team].includes(p.playerNum)) fail('not_your_role');
      if (!cardById(state.round.cardId).options.some(o => o.id === cmd.option)) fail('bad_option');
      sub.guesses[p.playerNum] = cmd.option;
      if (guessComplete(state) && state.round.clock?.endsAt != null) state.round.clock.endsAt = Math.min(state.round.clock.endsAt, cmd.now + ALL_DONE_GRACE_MS);
    },
    gpTalkDone(state, cmd) {
      requireType(state, 'guess_person');
      if (state.round.sub.stage !== 'reveal') fail('wrong_stage');
      toResult(state, cmd);
    },
    gpReopen(state, cmd) {
      // Restart the question without revealing anything (e.g. a protagonist
      // never answered). Guesses and answers of both teams are cleared.
      requireType(state, 'guess_person');
      const sub = state.round.sub;
      if (sub.stage === 'reveal') fail('wrong_stage');
      sub.answers = { A: null, B: null }; sub.guesses = {}; sub.stage = 'answer';
      setClock(state, 'guess', state.settings.t.guess, cmd.now);
      log(state, cmd, 'reopen');
    },
    /* song_relay */
    songSubmit(state, cmd) {
      requireType(state, 'song_relay');
      const sub = state.round.sub, turn = sub.turns[sub.cur];
      if (!turn || turn.turnId !== cmd.turnId || turn.status !== 'live') fail('stale_turn');
      if (turn.performer !== cmd.actor && !isHost(state, cmd.actor)) fail('not_your_role');
      if (tooLong(cmd.title, 80)) fail('too_long');
      const title = cleanText(cmd.title, 80);
      if (!title) fail('empty');
      turn.title = title;
      turn.mode = cmd.mode === 'alt' ? 'alt' : 'sing';
      turn.dup = acceptedSongs(sub).some(s => s.norm === normSong(title));
    },
    songSuggest(state, cmd) {
      requireType(state, 'song_relay');
      const p = requireMember(state, cmd.actor);
      if (tooLong(cmd.title, 80)) fail('too_long');
      const title = cleanText(cmd.title, 80); if (!title) fail('empty');
      const sub = state.round.sub;
      sub.suggestions[p.team] = [...list(sub.suggestions[p.team]), { id: String(cmd.id).slice(0, 12), by: p.playerNum, title }].slice(-12);
    },
    songJudge(state, cmd) {
      requireType(state, 'song_relay');
      const sub = state.round.sub, turn = sub.turns[sub.cur];
      if (!turn || turn.turnId !== cmd.turnId || turn.status !== 'live') fail('stale_turn');
      if (!['valid', 'invalid', 'skipped'].includes(cmd.verdict)) fail('bad_verdict');
      if (cmd.title != null) {
        if (tooLong(cmd.title, 80)) fail('too_long');
        const title = cleanText(cmd.title, 80);
        if (title) { turn.title = title; }
      }
      if (cmd.mode === 'alt' || cmd.mode === 'sing') turn.mode = cmd.mode;
      if (cmd.verdict === 'valid') {
        if (!turn.title) fail('title_required');
        if (acceptedSongs(sub).some(s => s.norm === normSong(turn.title))) fail('duplicate_song');
      }
      turn.status = cmd.verdict; turn.judgedAt = cmd.now; turn.dup = false;
      log(state, cmd, 'song', { turnId: turn.turnId, verdict: cmd.verdict, title: turn.title });
      if (sub.cur < sub.turns.length - 1) { sub.cur += 1; startSongTurn(state, cmd); }
      else { sub.cur = sub.turns.length; toResult(state, cmd); }
    },
    songCorrect(state, cmd) {
      requirePlaying(state);
      if (state.round.type !== 'song_relay' || !['challenge', 'result'].includes(state.round.stage)) fail('wrong_stage');
      const sub = state.round.sub, turn = sub.turns.find(t => t.turnId === cmd.turnId);
      if (!turn || !['valid', 'invalid', 'skipped'].includes(turn.status)) fail('stale_turn');
      if (!['valid', 'invalid', 'skipped'].includes(cmd.verdict)) fail('bad_verdict');
      if (cmd.verdict === 'valid') {
        if (!turn.title) fail('title_required');
        if (acceptedSongs(sub, turn.turnId).some(s => s.norm === normSong(turn.title))) fail('duplicate_song');
      }
      log(state, cmd, 'songCorrect', { turnId: turn.turnId, from: turn.status, to: cmd.verdict });
      turn.status = cmd.verdict;
      refreshProposed(state);
    },
    /* improv_scene */
    imStart(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId || seg.stage !== 'ready') fail('stale_segment');
      if (!isHost(state, cmd.actor) && !seg.actors.includes(cmd.actor)) fail('not_your_role');
      if (seg.actors.some(n => !n || seat(state, n)?.away)) fail('actor_missing');
      seg.stage = 'live'; seg.lang = state.settings.sceneLang; seg.startedAt = cmd.now;
      setClock(state, 'improv', state.settings.t.improv, cmd.now);
    },
    imCmd(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      if (seg.stage === 'wrapup') fail('scene_closing');
      if (seg.stage !== 'live') fail('stale_segment');
      const p = requireMember(state, cmd.actor);
      if (p.team === seg.team) fail('not_director');
      if (!DIRECTOR_KINDS.includes(cmd.kind)) fail('bad_command');
      if (Number.isFinite(cmd.sentAt) && cmd.now - cmd.sentAt > DIRECTOR_FRESH_MS) fail('too_late');
      if (seg.lastCmdAt && cmd.now - seg.lastCmdAt < COMMAND_GAP_MS) fail('cooldown');
      seg.seq += 1;
      seg.lastCmdAt = cmd.now;
      seg.events = [...seg.events, { seq: seg.seq, kind: cmd.kind, by: p.playerNum, at: cmd.now }].slice(-40);
      if (LANG_OF[cmd.kind]) seg.lang = LANG_OF[cmd.kind];
    },
    imLine(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      if (seg.stage === 'wrapup') fail('scene_closing');
      if (!['ready', 'live'].includes(seg.stage)) fail('stale_segment');
      const p = requireMember(state, cmd.actor);
      if (p.team === seg.team) fail('not_director');
      if (!seg.actors.includes(cmd.target)) fail('bad_target');
      if (tooLong(cmd.text, LINE_MAX)) fail('too_long');
      const text = cleanText(cmd.text, LINE_MAX);
      if (!text) fail('empty');
      const queued = seg.lines.filter(l => l.target === cmd.target && (l.status === 'active' || l.status === 'waiting')).length;
      if (queued >= 1 + LINE_QUEUE) fail('queue_full');
      const lineId = 'L' + hash32(seg.segmentId + ':' + cmd.actor + ':' + cmd.id).toString(36);
      const hasActive = seg.lines.some(l => l.target === cmd.target && l.status === 'active');
      seg.lines = [...seg.lines, { lineId, author: p.playerNum, target: cmd.target, text, status: hasActive ? 'waiting' : 'active', at: cmd.now }];
    },
    imLineResolve(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      const line = seg.lines.find(l => l.lineId === cmd.lineId);
      if (!line || line.target !== cmd.actor) fail('not_your_line');
      if (line.status !== 'active') fail('stale_line');
      if (!['done', 'skipped', 'reported'].includes(cmd.action)) fail('bad_action');
      line.status = cmd.action; line.resolvedAt = cmd.now;
      if (cmd.action === 'reported') { line.reported = true; log(state, cmd, 'lineReported', { lineId: line.lineId, target: line.target }); }
      promoteLine(seg, line.target);
    },
    imLineCancel(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      const line = seg.lines.find(l => l.lineId === cmd.lineId);
      if (!line || line.author !== cmd.actor) fail('not_your_line');
      if (!['active', 'waiting'].includes(line.status)) fail('stale_line');
      line.status = 'cancelled'; line.text = '';
      promoteLine(seg, line.target);
    },
    imLineHide(state, cmd) {
      requireType(state, 'improv_scene');
      for (const seg of state.round.sub.segs) {
        const line = seg.lines.find(l => l.lineId === cmd.lineId);
        if (!line) continue;
        if (!['reported', 'active', 'waiting'].includes(line.status)) fail('stale_line');
        const wasActive = line.status === 'active';
        line.status = 'hidden'; line.text = '';
        if (wasActive) promoteLine(seg, line.target);
        log(state, cmd, 'lineHidden', { lineId: line.lineId });
        return;
      }
      fail('not_your_line');
    },
    imExtend(state, cmd) {
      requireType(state, 'improv_scene');
      const seg = curSeg(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      if (!['live', 'wrapup'].includes(seg.stage)) fail('wrong_stage');
      const seconds = state.settings.t.improvExtend;
      if (seg.stage === 'wrapup') { seg.stage = 'live'; setClock(state, 'improv', seconds, cmd.now); }
      else if (state.round.clock?.frozen != null) state.round.clock.frozen += seconds * 1000;
      else state.round.clock.endsAt += seconds * 1000;
      seg.extended += 1;
      log(state, cmd, 'extend', { seconds, segmentId: seg.segmentId });
    },
    imJudge(state, cmd) {
      requirePlaying(state);
      if (state.round.type !== 'improv_scene' || !['challenge', 'result'].includes(state.round.stage)) fail('wrong_stage');
      const sub = state.round.sub, seg = sub.segs.find(s => s.segmentId === cmd.segmentId);
      if (!seg) fail('stale_segment');
      if (typeof cmd.complete !== 'boolean') fail('bad_verdict');
      if (state.round.stage === 'result') {
        if (seg.stage !== 'judged') fail('wrong_stage');
        log(state, cmd, 'improvCorrect', { segmentId: seg.segmentId, from: seg.complete, to: cmd.complete });
        seg.complete = cmd.complete; refreshProposed(state); return;
      }
      if (seg !== curSeg(state) || !['live', 'wrapup'].includes(seg.stage)) fail('stale_segment');
      seg.complete = cmd.complete; seg.stage = 'judged'; seg.judgedAt = cmd.now;
      closeSegmentLines(seg);
      clearClock(state);
      log(state, cmd, 'improv', { segmentId: seg.segmentId, complete: cmd.complete });
      if (sub.cur < sub.segs.length - 1) sub.cur += 1;
      else toResult(state, cmd);
    },
    /* story_exchange */
    stAdvance(state, cmd) {
      requireType(state, 'story_exchange');
      const sub = state.round.sub, cycle = curCycle(state);
      if (sub.stage !== 'cycles' || !cycle || cycle.cycleId !== cmd.cycleId) fail('stale_cycle');
      if (cycle.stage !== cmd.from) fail('stale_cycle');
      const host = isHost(state, cmd.actor), t = state.settings.t;
      if (cycle.stage === 'share') {
        if (!host && cmd.actor !== cycle.sharer) fail('not_your_role');
        cycle.stage = 'ask'; clearClock(state);
      } else if (cycle.stage === 'ask') {
        if (!host && cmd.actor !== cycle.interviewer) fail('not_your_role');
        cycle.stage = 'reply'; setClock(state, 'reply', t.reply, cmd.now, true);
      } else if (cycle.stage === 'reply') {
        if (!host && cmd.actor !== cycle.sharer) fail('not_your_role');
        if (state.settings.singing) { cycle.stage = 'pick'; setClock(state, 'pick', t.pick, cmd.now, true); }
        else { cycle.singResult = 'off'; finishCycle(state, cmd, cycle); }
      } else fail('wrong_stage');
    },
    stSuggestQ(state, cmd) {
      requireType(state, 'story_exchange');
      const cycle = curCycle(state);
      if (!cycle || cycle.cycleId !== cmd.cycleId || !['share', 'ask'].includes(cycle.stage)) fail('stale_cycle');
      const p = requireMember(state, cmd.actor);
      if (p.playerNum === cycle.sharer || p.playerNum === cycle.interviewer) fail('not_your_role');
      if (tooLong(cmd.text, LINE_MAX)) fail('too_long');
      const text = cleanText(cmd.text, LINE_MAX);
      if (!text) { delete cycle.qSuggest[p.playerNum]; return; }
      cycle.qSuggest[p.playerNum] = text;
    },
    stPropose(state, cmd) {
      requireType(state, 'story_exchange');
      const cycle = curCycle(state);
      if (!cycle || cycle.cycleId !== cmd.cycleId || cycle.stage !== 'pick') fail('not_open_yet');
      const p = requireMember(state, cmd.actor);
      if (p.team !== other(cycle.team)) fail('not_your_role');
      if (tooLong(cmd.title, 80) || tooLong(cmd.artist, 60) || tooLong(cmd.reason, LINE_MAX)) fail('too_long');
      const title = cleanText(cmd.title, 80); if (!title) fail('empty');
      if (cycle.proposals.filter(x => x.by === p.playerNum).length >= 3) fail('queue_full');
      cycle.proposals = [...cycle.proposals, { id: 'P' + hash32(cycle.cycleId + ':' + cmd.id).toString(36), by: p.playerNum, title, artist: cleanText(cmd.artist, 60), reason: cleanText(cmd.reason, LINE_MAX), at: cmd.now }].slice(-12);
    },
    stPick(state, cmd) {
      requireType(state, 'story_exchange');
      const cycle = curCycle(state);
      if (!cycle || cycle.cycleId !== cmd.cycleId || cycle.stage !== 'pick') fail('stale_cycle');
      if (cmd.actor !== cycle.interviewer && !isHost(state, cmd.actor)) fail('not_your_role');
      let fields;
      if (cmd.proposalId) {
        const proposal = cycle.proposals.find(x => x.id === cmd.proposalId);
        if (!proposal) fail('stale_song');
        fields = { title: proposal.title, artist: proposal.artist, reason: proposal.reason };
      } else {
        if (tooLong(cmd.title, 80) || tooLong(cmd.artist, 60) || tooLong(cmd.reason, LINE_MAX)) fail('too_long');
        fields = { title: cleanText(cmd.title, 80), artist: cleanText(cmd.artist, 60), reason: cleanText(cmd.reason, LINE_MAX) };
        if (!fields.title) fail('empty');
      }
      newSong(cycle, fields, 'opponent', cmd.actor, cmd);
      cycle.stage = 'confirm';
      clearClock(state);
    },
    stConfirm(state, cmd) {
      requireType(state, 'story_exchange');
      const cycle = curCycle(state), t = state.settings.t;
      if (!cycle || cycle.cycleId !== cmd.cycleId) fail('stale_cycle');
      if (cmd.actor !== cycle.sharer && !isHost(state, cmd.actor)) fail('not_your_role');
      const action = cmd.action;
      // An old confirmation can never land on a newer song request.
      if (['accept', 'done'].includes(action) && (!cycle.song || cmd.version !== cycle.song.version)) fail('stale_song');
      if (action === 'accept') {
        if (cycle.stage !== 'confirm') fail('stale_cycle');
        cycle.stage = 'sing'; setClock(state, 'sing', t.sing, cmd.now, true);
      } else if (action === 'replace') {
        if (!['confirm', 'sing'].includes(cycle.stage)) fail('stale_cycle');
        if (cycle.song && Number.isInteger(cmd.version) && cmd.version !== cycle.song.version) fail('stale_song');
        cycle.songLog = [...cycle.songLog, { version: cycle.song?.version || 0, title: cycle.song?.title || '', source: 'replace_request', by: cmd.actor }].slice(-8);
        cycle.song = null; cycle.stage = 'pick'; setClock(state, 'pick', t.pick, cmd.now, true);
      } else if (action === 'self') {
        if (!['pick', 'confirm', 'sing'].includes(cycle.stage)) fail('stale_cycle');
        if (tooLong(cmd.title, 80) || tooLong(cmd.artist, 60)) fail('too_long');
        const title = cleanText(cmd.title, 80); if (!title) fail('empty');
        newSong(cycle, { title, artist: cleanText(cmd.artist, 60) }, 'self', cmd.actor, cmd);
        cycle.stage = 'sing'; setClock(state, 'sing', t.sing, cmd.now, true);
      } else if (action === 'skip') {
        if (!['pick', 'confirm', 'sing'].includes(cycle.stage)) fail('stale_cycle');
        cycle.singResult = 'skipped'; finishCycle(state, cmd, cycle);
      } else if (action === 'done') {
        if (cycle.stage !== 'sing') fail('stale_cycle');
        cycle.singResult = 'sang'; finishCycle(state, cmd, cycle);
      } else fail('bad_action');
    },
    stEcho(state, cmd) {
      requireType(state, 'story_exchange');
      const sub = state.round.sub;
      if (sub.stage !== 'echo') fail('wrong_stage');
      const p = requireMember(state, cmd.actor);
      if (cmd.done === true) {
        if (sub.echo.by !== p.playerNum && !isHost(state, cmd.actor)) fail('not_your_role');
        sub.echo.done = true; sub.stage = 'done'; toResult(state, cmd); return;
      }
      if (sub.echo.by) fail('taken');
      if (sub.cycles.some(c => c.sharer === p.playerNum)) fail('not_your_role');
      sub.echo.by = p.playerNum; sub.echo.at = cmd.now;
    },
    stEchoSkip(state, cmd) {
      requireType(state, 'story_exchange');
      const sub = state.round.sub;
      if (sub.stage !== 'echo') fail('wrong_stage');
      sub.echo.done = true; sub.stage = 'done'; toResult(state, cmd);
    },
    /* taboo_description */
    tbStart(state, cmd) {
      requireType(state, 'taboo_description');
      const seg = curTaboo(state);
      if (!seg || seg.segmentId !== cmd.segmentId || seg.stage !== 'ready') fail('stale_segment');
      if (!isHost(state, cmd.actor) && cmd.actor !== seg.describer) fail('not_your_role');
      if (present(state, seg.team).length < 2 || seat(state, seg.describer)?.away) fail('team_too_small');
      seg.stage = 'live'; seg.startedAt = cmd.now;
      setClock(state, 'taboo', state.settings.t.taboo, cmd.now);
    },
    tbMark(state, cmd) {
      requireType(state, 'taboo_description');
      const seg = curTaboo(state);
      if (!seg || seg.segmentId !== cmd.segmentId) fail('stale_segment');
      if (!['hit', 'foul', 'skip'].includes(cmd.result)) fail('bad_verdict');
      const host = isHost(state, cmd.actor) && cmd.actor !== seg.describer || cmd.actor === 0;
      if (seg.stage === 'timeup') { if (!host) fail('time_up'); }
      else if (seg.stage !== 'live') fail('stale_segment');
      else if (!host && cmd.actor !== seg.describer) fail('not_your_role');
      if (cmd.idx !== seg.idx) fail('stale_target');
      const target = seg.targets[seg.idx];
      if (!target || target.result) fail('stale_target');
      target.result = cmd.result; target.at = cmd.now; target.by = cmd.actor;
      seg.idx += 1;
      if (seg.stage === 'timeup') seg.idx = seg.targets.length; // after time only the open item may be settled
      advanceTaboo(state, cmd, seg);
    },
    tbFinish(state, cmd) {
      requireType(state, 'taboo_description');
      const seg = curTaboo(state);
      if (!seg || seg.segmentId !== cmd.segmentId || !['live', 'timeup'].includes(seg.stage)) fail('stale_segment');
      for (const t of seg.targets) if (!t.result) t.result = 'none';
      seg.idx = seg.targets.length;
      advanceTaboo(state, cmd, seg);
    },
    tbCorrect(state, cmd) {
      requirePlaying(state);
      if (state.round.type !== 'taboo_description' || !['challenge', 'result'].includes(state.round.stage)) fail('wrong_stage');
      const seg = state.round.sub.segs.find(s => s.segmentId === cmd.segmentId);
      const target = seg?.targets[cmd.idx];
      if (!seg || seg.stage !== 'done' || !target || !target.result) fail('stale_target');
      if (!['hit', 'foul', 'skip', 'none'].includes(cmd.result)) fail('bad_verdict');
      log(state, cmd, 'tabooCorrect', { segmentId: seg.segmentId, idx: cmd.idx, from: target.result, to: cmd.result });
      target.result = cmd.result;
      refreshProposed(state);
    },
  };

  function apply(input, cmd) {
    const state = clone(input);
    if (!state || !cmd || typeof cmd !== 'object') return input;
    if (cmd.type === 'tick') { tick(state, cmd); return JSON.stringify(state) === JSON.stringify(input) ? input : state; }
    if (typeof cmd.id !== 'string' || !cmd.id || cmd.id.length > 100 || !Number.isFinite(cmd.now)) return input;
    if (!Number.isInteger(cmd.actor) || cmd.actor < 0) return input;
    if (list(state.seen?.[actorKey(cmd.actor)]).includes(cmd.id)) return input; // a resend changes nothing
    if (cmd.sessionId !== state.sessionId) return remember(state, cmd, 'stale_session');
    if (cmd.roundId && cmd.roundId !== state.round?.id) return remember(state, cmd, 'stale_round');
    const handler = handlers[cmd.type];
    if (!handler) return remember(state, cmd, 'bad_command');
    if (HOST_ONLY.has(cmd.type) && !isHost(state, cmd.actor)) return remember(state, cmd, 'host_only');
    if (cmd.actor !== 0 && !seat(state, cmd.actor)) return remember(state, cmd, 'not_participant');
    if (state.paused && !isHost(state, cmd.actor) && !PAUSE_SAFE.has(cmd.type)) return remember(state, cmd, 'paused');
    if (state.paused && isHost(state, cmd.actor) && !HOST_ONLY.has(cmd.type) && !PAUSE_SAFE.has(cmd.type)) return remember(state, cmd, 'paused');
    try {
      const replaced = handler(state, cmd);
      if (replaced && replaced !== state) return remember(replaced, cmd, '');
      return remember(state, cmd, '');
    } catch (error) {
      if (!error.code) throw error;
      return remember(clone(input), cmd, error.code);
    }
  }

  /* ── projections ── */
  function publicRoster(state) {
    return roster(state).map(p => ({ playerNum: p.playerNum, name: p.name, team: p.team, away: p.away === true, ready: p.ready === true, late: p.late === true }));
  }
  function cardPublic(state, round, lang, viewer) {
    const card = cardById(round.cardId);
    if (!card) return null;
    const out = { type: card.type, prompt: pick(card.prompt, lang) };
    // A taboo card's title or id would let someone look up its four answers.
    if (card.type !== 'taboo_description') { out.id = card.id; out.title = pick(card.title, lang); }
    else out.title = lang === 'zh' ? '禁詞傳話' : 'Taboo relay';
    if (card.type === 'guess_person') { out.options = card.options.map(o => ({ id: o.id, text: pick(o.text, lang) })); }
    if (card.type === 'song_relay') out.rule = pick(card.rule, lang);
    if (card.type === 'improv_scene') out.roles = card.roles.map(r => pick(r, lang));
    if (card.type === 'story_exchange') { out.safety = pick(card.safety, lang); }
    return out;
  }
  function viewSub(state, round, me, lang) {
    const sub = round.sub, myTeam = me?.team || null, n = me?.playerNum || 0, host = me ? isHost(state, n) : false;
    if (!sub) return null;
    const card = cardById(round.cardId);
    if (round.type === 'guess_person') {
      const reveal = sub.stage === 'reveal';
      const out = { stage: sub.stage, eligibleCount: { A: sub.eligible.A.length, B: sub.eligible.B.length },
        answered: { A: !!sub.answers.A, B: !!sub.answers.B },
        guessedCount: { A: sub.eligible.A.filter(x => sub.guesses[x]).length, B: sub.eligible.B.filter(x => sub.guesses[x]).length } };
      if (myTeam && round.roles.protagonist[myTeam] === n) out.myAnswer = sub.answers[myTeam];
      if (myTeam && sub.eligible[myTeam].includes(n)) { out.canGuess = true; out.myGuess = sub.guesses[n] || null; }
      if (reveal) {
        out.answers = clone(sub.answers); out.hits = clone(sub.hits);
        out.guesses = Object.fromEntries(Object.entries(sub.guesses).map(([k, v]) => [k, v]));
        out.followUp = pick(card.followUp, lang);
        out.preview = guessResult(sub);
      }
      return out;
    }
    if (round.type === 'song_relay') {
      const turns = sub.turns.map(t => ({ turnId: t.turnId, team: t.team, idx: t.idx, performer: t.performer, status: t.status, title: t.status === 'live' ? (t.title || '') : t.title, mode: t.mode, dup: t.dup, timeUp: t.timeUp }));
      return { cur: sub.cur, perTeam: state.settings.songTurns, turns, scores: songScores(sub),
        accepted: acceptedSongs(sub).map(s => ({ title: s.title, team: s.team })),
        suggestions: myTeam ? clone(sub.suggestions[myTeam] || []) : [] };
    }
    if (round.type === 'improv_scene') {
      const segs = sub.segs.map((seg, i) => {
        const out = { segmentId: seg.segmentId, team: seg.team, actors: seg.actors.slice(), stage: seg.stage, lang: seg.lang, complete: seg.complete,
          events: seg.events.slice(-12), lastCmdAt: seg.lastCmdAt, extended: seg.extended, current: i === sub.cur,
          // Public: only that an actor has a private line waiting, never its text.
          received: Object.fromEntries(seg.actors.map(a => [a, seg.lines.filter(l => l.target === a && ['active', 'waiting'].includes(l.status)).length])) };
        if (seg.actors.includes(n)) out.myLines = seg.lines.filter(l => l.target === n && ['active', 'waiting'].includes(l.status))
          .map(l => ({ lineId: l.lineId, status: l.status, text: l.status === 'active' ? l.text : '', author: l.author }))
          .concat([]).slice(0, 3);
        if (myTeam && myTeam !== seg.team) out.sent = seg.lines.filter(l => l.author === n).map(l => ({ lineId: l.lineId, target: l.target, status: l.status, text: ['active', 'waiting'].includes(l.status) ? l.text : '' })).slice(-8);
        if (host) out.reported = seg.lines.filter(l => l.status === 'reported').map(l => ({ lineId: l.lineId, target: l.target }));
        return out;
      });
      return { cur: sub.cur, segs, cmdGapMs: COMMAND_GAP_MS };
    }
    if (round.type === 'story_exchange') {
      const cycles = sub.cycles.map((c, i) => {
        const out = { cycleId: c.cycleId, team: c.team, sharer: c.sharer, interviewer: c.interviewer, stage: c.stage, current: i === sub.cur && sub.stage === 'cycles',
          song: c.song ? clone(c.song) : null, singResult: c.singResult, songLog: c.songLog.map(x => ({ version: x.version, title: x.title, source: x.source })),
          proposalCount: c.proposals.length, suggestionCount: Object.keys(c.qSuggest).length };
        if (n === c.interviewer) { out.qSuggest = Object.entries(c.qSuggest).map(([by, text]) => ({ by: Number(by), text })); out.backupQ = pick(card.followUp, lang); }
        else if (c.qSuggest[n]) out.mySuggest = c.qSuggest[n];
        if (myTeam && myTeam === other(c.team)) out.proposals = clone(c.proposals);
        return out;
      });
      return { stage: sub.stage, cur: sub.cur, cycles, echo: clone(sub.echo), singing: state.settings.singing };
    }
    if (round.type === 'taboo_description') {
      const segs = sub.segs.map((seg, i) => {
        const out = { segmentId: seg.segmentId, team: seg.team, describer: seg.describer, stage: seg.stage, idx: seg.idx, current: i === sub.cur,
          score: seg.targets.filter(t => t.result === 'hit').length,
          blocked: present(state, seg.team).length < 2,
          targets: seg.targets.map((t, j) => {
            const row = { idx: j, result: t.result };
            // An answer becomes public only once its own item has ended.
            if (t.result) { const x = card.targets.find(c => c.id === t.tid); row.answer = pick(x.answer, lang); }
            return row;
          }) };
        if (n === seg.describer && (seg.stage === 'live' || seg.stage === 'timeup') && seg.idx < seg.targets.length) {
          const x = card.targets.find(c => c.id === seg.targets[seg.idx].tid);
          out.secret = { idx: seg.idx, answer: pick(x.answer, lang), forbidden: x.forbidden[lang] || x.forbidden.en };
        }
        return out;
      });
      return { cur: sub.cur, segs, scores: tabooScores(sub) };
    }
    return null;
  }
  function roundView(state, round, me, lang) {
    if (!round) return null;
    const n = me?.playerNum || 0, myTeam = me?.team || null;
    const nom = round.nominations, open = round.stage === 'nominating';
    const nominations = {};
    for (const team of TEAMS) {
      const votes = nom[team].votes, voted = Object.keys(votes).length;
      if (open) {
        nominations[team] = { voted, of: voters(state, team).length };
        if (myTeam === team) {
          const tally = {};
          for (const v of Object.values(votes)) tally[v] = (tally[v] || 0) + 1;
          nominations[team].tally = tally;
          nominations[team].mine = votes[n] || null;
        }
      } else nominations[team] = { pick: nom[team].pick, auto: nom[team].auto === true, tied: nom[team].tied === true };
    }
    const out = { id: round.id, no: round.no, type: round.type, stage: round.stage, fallbackTeam: round.fallbackTeam, version: round.version,
      clock: round.clock ? { kind: round.clock.kind, soft: round.clock.soft, endsAt: round.clock.endsAt, frozen: round.clock.frozen, expired: round.clock.expired } : null,
      nominations };
    if (!open) { out.card = cardPublic(state, round, lang); out.roles = clone(round.roles); }
    if (round.sub) out.sub = viewSub(state, round, me, lang);
    if (['result', 'summary'].includes(round.stage)) { out.proposed = round.proposed; out.override = round.override; }
    if (round.stage === 'summary') out.settled = clone(round.settled);
    return out;
  }
  function view(state, viewer, now = 0) {
    if (!state) return null;
    const lang = state.settings.qLang;
    const playerNum = Number.isInteger(viewer?.playerNum) ? viewer.playerNum : 0;
    const p = playerNum ? seat(state, playerNum) : null;
    const me = p ? { playerNum, name: p.name, team: p.team, away: p.away === true, ready: p.ready === true, host: isHost(state, playerNum), spectator: !p.team } : null;
    const finished = state.phase === 'finished';
    const out = {
      v: 1, game: GAME, sessionId: state.sessionId, phase: state.phase, revision: state.revision || 0, me,
      hostPlayerNum: state.hostPlayerNum || 0, settings: clone(state.settings), roster: publicRoster(state),
      called: list(state.called).slice(), paused: state.paused ? { at: state.paused.at } : null,
      finished: state.finished ? clone(state.finished) : null, roundNo: state.roundNo || 0,
    };
    if (state.phase !== 'lobby') {
      out.lines = { A: linesDone(state.boards.A, state.called).length, B: linesDone(state.boards.B, state.called).length };
      if (me?.team) { out.board = state.boards[me.team].slice(); out.myLines = linesDone(out.board, state.called); }
      if (finished) out.boards = clone(state.boards);
      out.round = roundView(state, state.round, me, lang);
      out.history = list(state.history).map(h => ({ no: h.no, type: h.type, result: h.result, called: h.called, picks: h.picks, fallbackTeam: h.fallbackTeam, lines: h.lines }));
    } else {
      out.startProblem = startCheck(state);
    }
    const key = viewer === 'host' ? '0' : actorKey(playerNum);
    if (state.replies?.[key]) out.reply = clone(state.replies[key]);
    out.replies = list(state.replyLog?.[key]).slice(-12);
    out.acks = list(state.seen?.[key]).slice(-16);
    if (viewer === 'host' || me?.host) out.log = list(state.log).slice(-30);
    return out;
  }

  return { GAME, TYPES, TEAMS, RESULTS, LINES, DIRECTOR_KINDS, DEFAULTS, COMMAND_GAP_MS, LINE_MAX,
    create, apply, view, timerDue, clockLeft, linesDone, makeBoards, normSong, hash32, list, cardById, startCheck, HOST_ONLY, PAUSE_SAFE };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BINGO_ENGINE;
