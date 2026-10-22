/* WHO KNOWS? — pure authoritative rules. No DOM, Firebase or timers.
 *
 * One game, two modes, both "twenty questions with a secret":
 *
 *  INSIDER   One player is the Master: they pick the secret word and may only
 *            answer Yes / No / I don't know. One hidden Insider also knows the
 *            word and quietly guides everyone. Guess it before time runs out —
 *            or everybody loses — then find the Insider. (Adapted mechanics of
 *            the party game known as "Insider".)
 *  WEREWOLF  One player is the Mayor: they pick the word and answer with
 *            tokens (Yes / No / Maybe / So close / Way off). A hidden Seer knows
 *            the word and helps; hidden Werewolves know it and mislead. Word
 *            guessed → the Werewolves get one chance to find the Seer. Not
 *            guessed → everyone votes to find a Werewolf. (Adapted mechanics of
 *            the party game known as "Werewords".)
 *
 * Questions are spoken aloud. A player taps "I have a question" on their own
 * card to join one shared line; the answerer taps a token for whoever is at the
 * front. Every answer is logged against its asker, like the physical tokens
 * that pile up in front of each player.
 *
 * The canonical state (secret word and hidden roles included) lives in one
 * table node. view() gives the shared screen (actor 0) nothing private and
 * gives each card only its own role — plus the word when that role knows it.
 * Any active player may also run the table (pause, add time, sit someone out,
 * change settings, start over), so no host page has to stay open. Every
 * command carries its own captured time and seed, so a retried Firebase
 * transaction always produces the same result.
 */
var WHO_KNOWS_ENGINE = (() => {
  'use strict';
  const WORDS = typeof WHO_KNOWS_WORDS !== 'undefined' ? WHO_KNOWS_WORDS : require('./who-knows-words.js');
  const MODES = Object.freeze(['insider', 'werewolf']);
  const CONFIG = Object.freeze({
    minPlayers: 4, maxPlayers: 9,
    modes: MODES,
    questionMinutes: Object.freeze([3, 4, 5, 6, 8]),
    defaultQuestionMinutes: Object.freeze({ insider: 5, werewolf: 4 }),
    // Werewolf mode only: how many Yes/No answers the Mayor can give (0 = no limit).
    tokenOptions: Object.freeze([0, 20, 30, 36]), defaultTokens: 36,
    difficulties: Object.freeze(['mixed', 'easy', 'medium', 'hard']), defaultDifficulty: 'mixed',
    wolfOptions: Object.freeze(['auto', 1, 2]),
    answers: Object.freeze({
      insider: Object.freeze(['yes', 'no', 'unknown', 'correct']),
      werewolf: Object.freeze(['yes', 'no', 'maybe', 'close', 'far', 'correct']),
    }),
    countdownMs: 5000,
    huntMs: 30000, accuseMs: 90000,
    discussMinMs: 30000, judgeMs: 30000, voteMs: 45000, masterGuessMs: 30000,
    extendQuestionsMs: 60000, extendOtherMs: 30000,
    resumeFloorMs: 3000,
    optionCount: 3, maxRerolls: 10, textMax: 80, logMax: 150, historyMax: 30, seenMax: 16,
    points: Object.freeze({
      village_word: Object.freeze({ team: 'village', points: 2, seerBonus: 1 }),
      village_vote: Object.freeze({ team: 'village', points: 1 }),
      wolves_seer: Object.freeze({ team: 'wolves', points: 2 }),
      wolves_hidden: Object.freeze({ team: 'wolves', points: 2 }),
      commons_found: Object.freeze({ team: 'commons', points: 1 }),
      master_found: Object.freeze({ team: 'commons', points: 1 }),
      insider_wins: Object.freeze({ team: 'insider', points: 3 }),
      nobody: Object.freeze({ team: null, points: 0 }),
      void: Object.freeze({ team: null, points: 0 }),
    }),
  });
  const TIMED = Object.freeze(['countdown', 'questions', 'hunt', 'accuse', 'discuss', 'judge', 'vote', 'masterGuess']);
  const VOTING = Object.freeze(['hunt', 'accuse', 'judge', 'vote', 'masterGuess']);
  const list = value => Array.isArray(value) ? value.filter(item => item != null) : Object.values(value || {});
  const copy = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
  const roster = state => list(state.roster);
  const seat = (state, n) => roster(state).find(player => player.playerNum === n) || null;
  const isActive = (state, n) => seat(state, n)?.active === true;
  const activeNums = state => roster(state).filter(player => player.active).map(player => player.playerNum).sort((a, b) => a - b);
  const nameOf = (state, n) => seat(state, n)?.name || '';

  function rng(seed) {
    let a = (Number(seed) >>> 0) || 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
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
  // Plain text only: the card and shared screen escape everything, but a
  // spoken-question memo has no reason to carry markup or control characters.
  function cleanText(value) {
    return String(value ?? '').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CONFIG.textMax);
  }

  // ── settings ───────────────────────────────────────────────────────────
  function defaultSettings(mode = 'insider') {
    return { mode, questionMinutes: CONFIG.defaultQuestionMinutes[mode], tokens: CONFIG.defaultTokens,
      difficulty: CONFIG.defaultDifficulty, wolves: 'auto', mayorSecret: false, masterGuess: true };
  }
  // Omitted fields keep the current choice; a mode change without an explicit
  // length takes that mode's usual length. Invalid values throw.
  function parseSettings(input = {}, current = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_options');
    const base = current ? Object.assign(defaultSettings(current.mode), current) : defaultSettings(input.mode || 'insider');
    const mode = input.mode === undefined ? base.mode : input.mode;
    if (!MODES.includes(mode)) throw new Error('invalid_options');
    const minutes = input.questionMinutes === undefined
      ? (mode !== base.mode ? CONFIG.defaultQuestionMinutes[mode] : base.questionMinutes) : Number(input.questionMinutes);
    if (!CONFIG.questionMinutes.includes(minutes)) throw new Error('invalid_options');
    const tokens = input.tokens === undefined ? base.tokens : Number(input.tokens);
    if (!CONFIG.tokenOptions.includes(tokens)) throw new Error('invalid_options');
    const difficulty = input.difficulty === undefined ? base.difficulty : input.difficulty;
    if (!CONFIG.difficulties.includes(difficulty)) throw new Error('invalid_options');
    const wolvesRaw = input.wolves === undefined ? base.wolves : input.wolves;
    const wolves = wolvesRaw === 'auto' ? 'auto' : Number(wolvesRaw);
    if (!CONFIG.wolfOptions.includes(wolves)) throw new Error('invalid_options');
    for (const key of ['mayorSecret', 'masterGuess']) if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error('invalid_options');
    return { mode, questionMinutes: minutes, tokens, difficulty, wolves,
      mayorSecret: input.mayorSecret ?? !!base.mayorSecret, masterGuess: input.masterGuess ?? base.masterGuess !== false };
  }
  function wolfCount(setting, players) {
    if (setting === 1) return 1;
    if (setting === 2) return players >= 6 ? 2 : 1;
    return players >= 7 ? 2 : 1;
  }

  // ── stage, mayor rotation, roles, words ────────────────────────────────
  function bump(state, now) { state.turnId++; state.lastChangeAt = now; }
  function enter(state, phase, now, ms = null) {
    state.phase = phase; state.stage++;
    state.deadline = Number.isFinite(ms) ? now + ms : null;
    state.pausedFrom = null; state.remainingMs = null;
  }
  // Everyone answers once before anyone answers twice; never twice in a row.
  function drawMayor(state, random) {
    const players = activeNums(state), rotation = state.rotation;
    if (rotation.next != null && players.includes(rotation.next)) {
      const chosen = rotation.next;
      rotation.next = null; rotation.bag = list(rotation.bag).filter(n => n !== chosen); rotation.last = chosen;
      return chosen;
    }
    rotation.next = null;
    let bag = list(rotation.bag).filter(n => players.includes(n));
    if (!bag.length) {
      bag = shuffle(players, random);
      if (bag.length > 1 && bag[0] === rotation.last) bag.push(bag.shift());
    }
    const chosen = bag.shift();
    rotation.bag = bag; rotation.last = chosen;
    return chosen;
  }
  function dealRoles(state, round, random) {
    const players = activeNums(state), others = players.filter(n => n !== round.mayor), roles = {};
    if (round.mode === 'insider') {
      roles[round.mayor] = 'master';
      const insider = others[Math.floor(random() * others.length)];
      for (const n of others) roles[n] = n === insider ? 'insider' : 'common';
    } else {
      const wolves = wolfCount(round.wolves, players.length);
      const receivers = round.mayorSecret ? players : others;
      const deck = ['seer', ...Array(wolves).fill('werewolf')];
      while (deck.length < receivers.length) deck.push('villager');
      shuffle(deck, random).forEach((role, index) => { roles[receivers[index]] = role; });
      if (!round.mayorSecret) roles[round.mayor] = 'villager';
    }
    round.roles = roles; round.players = players;
  }
  function drawOptions(state, round, random) {
    const used = new Set(list(state.wordHistory?.used)), shown = new Set(list(round.options)), picked = [];
    const pick = level => {
      const pool = WORDS.pool(level).filter(word => !shown.has(word.id) && !picked.includes(word.id));
      const fresh = pool.filter(word => !used.has(word.id));
      const source = fresh.length ? fresh : pool; // recycle only once a level is exhausted
      if (!source.length) return;
      picked.push(source[Math.floor(random() * source.length)].id);
    };
    if (round.difficulty === 'mixed') WORDS.LEVELS.forEach(pick);
    else for (let i = 0; i < CONFIG.optionCount; i++) pick(round.difficulty);
    round.options = picked;
  }
  function startRound(state, now, random) {
    if (activeNums(state).length < CONFIG.minPlayers) throw new Error('not_enough_players');
    const s = state.settings;
    state.roundNo++;
    const round = {
      no: state.roundNo, mode: s.mode, questionMs: s.questionMinutes * 60000,
      tokens: s.mode === 'werewolf' ? s.tokens : 0, difficulty: s.difficulty,
      wolves: s.wolves, mayorSecret: s.mode === 'werewolf' && s.mayorSecret, masterGuess: s.mode === 'insider' && s.masterGuess,
      mayor: null, players: [], roles: {}, options: [], rerolls: 0, wordId: null,
      startedAt: null, endedAt: null, endReason: null,
      queue: [], current: null, askSerial: 0, log: [], tokensUsed: 0, guess: null,
      votes: {}, judge: {}, picks: {}, masterPick: null, judgeResult: null, outcome: null, points: {},
    };
    round.mayor = drawMayor(state, random);
    dealRoles(state, round, random);
    drawOptions(state, round, random);
    state.round = round;
    enter(state, 'choose', now);
  }

  // ── helpers over the current round ─────────────────────────────────────
  const roleOf = (round, n) => round?.roles?.[n] || null;
  const inRound = (state, n) => !!roleOf(state.round, n);
  const playing = (state, n) => inRound(state, n) && isActive(state, n);
  const wolvesOf = round => Object.keys(round.roles).map(Number).filter(n => round.roles[n] === 'werewolf').sort((a, b) => a - b);
  const seerOf = round => Number(Object.keys(round.roles).find(n => round.roles[n] === 'seer')) || null;
  const insiderOf = round => Number(Object.keys(round.roles).find(n => round.roles[n] === 'insider')) || null;
  const knows = (round, n) => !!round && (round.mayor === n || ['seer', 'werewolf', 'insider'].includes(roleOf(round, n)));
  const word = round => round?.wordId ? WORDS.get(round.wordId) : null;
  const wordView = card => card ? { id: card.id, en: card.en, zh: card.zh, level: card.level } : null;
  const teamOf = (round, n) => round.mode === 'werewolf'
    ? (roleOf(round, n) === 'werewolf' ? 'wolves' : 'village')
    : (roleOf(round, n) === 'insider' ? 'insider' : 'commons');
  const roundPlayers = round => list(round?.players);

  function voters(state) {
    const round = state.round, phase = state.phase;
    const live = roundPlayers(round).filter(n => isActive(state, n));
    if (phase === 'hunt') return live.filter(n => roleOf(round, n) === 'werewolf');
    if (phase === 'judge') return live.filter(n => n !== round.guess?.playerNum);
    if (phase === 'masterGuess') return live.filter(n => n === round.mayor);
    if (phase === 'accuse' || phase === 'vote') return live;
    return [];
  }
  function targets(state, voter) {
    const round = state.round, phase = state.phase;
    const live = roundPlayers(round).filter(n => isActive(state, n) && n !== voter);
    if (phase === 'hunt') return live.filter(n => roleOf(round, n) !== 'werewolf' && (round.mayorSecret || n !== round.mayor));
    if (phase === 'vote' || phase === 'masterGuess') return live.filter(n => n !== round.mayor);
    if (phase === 'accuse') return live;
    return [];
  }
  const ballots = state => ({ hunt: 'picks', accuse: 'votes', vote: 'votes', judge: 'judge' }[state.phase]);
  function allVoted(state) {
    const who = voters(state);
    if (!who.length) return true;
    if (state.phase === 'masterGuess') return state.round.masterPick != null;
    const box = state.round[ballots(state)] || {};
    return who.every(n => own(box, n));
  }

  // ── round flow ─────────────────────────────────────────────────────────
  function beginQuestions(state, now) {
    const round = state.round;
    round.startedAt = now; round.queue = []; round.current = null;
    enter(state, 'questions', now, round.questionMs);
  }
  function nextAsker(round) { round.current = round.queue.length ? round.queue.shift() : null; }
  function endQuestions(state, now, reason) {
    const round = state.round;
    round.endReason = reason; round.endedAt = now; round.queue = []; round.current = null;
    if (round.mode === 'werewolf') {
      if (reason === 'correct') enter(state, 'hunt', now, CONFIG.huntMs);
      else enter(state, 'accuse', now, CONFIG.accuseMs);
    } else if (reason === 'correct') {
      // Classic Insider: the discussion lasts as long as the guessing took.
      const used = Math.max(0, now - (round.startedAt ?? now));
      enter(state, 'discuss', now, Math.max(CONFIG.discussMinMs, Math.min(round.questionMs, used)));
    } else if (round.masterGuess) enter(state, 'masterGuess', now, CONFIG.masterGuessMs);
    else finishRound(state, now, 'nobody');
  }
  function tally(box) {
    const counts = new Map();
    for (const target of Object.values(box || {})) if (Number.isInteger(target)) counts.set(target, (counts.get(target) || 0) + 1);
    const top = counts.size ? Math.max(...counts.values()) : 0;
    return { counts, top, leaders: [...counts].filter(([, n]) => n === top && top > 0).map(([target]) => target).sort((a, b) => a - b) };
  }
  function resolve(state, now) {
    const round = state.round;
    if (state.phase === 'hunt') {
      const seer = seerOf(round);
      const found = Object.values(round.picks).some(target => target === seer);
      finishRound(state, now, found ? 'wolves_seer' : 'village_word', { found: found ? seer : null });
    } else if (state.phase === 'accuse') {
      const { top, leaders } = tally(round.votes);
      // Nobody stands out when no one has two votes: the Werewolves stay hidden.
      const caught = top >= 2 ? leaders.filter(n => roleOf(round, n) === 'werewolf') : [];
      finishRound(state, now, caught.length ? 'village_vote' : 'wolves_hidden', { revealed: top >= 2 ? leaders : [], caught });
    } else if (state.phase === 'discuss') {
      enter(state, 'judge', now, CONFIG.judgeMs);
      if (allVoted(state)) resolve(state, now);
      return;
    } else if (state.phase === 'judge') {
      const answers = Object.values(round.judge);
      const yes = answers.filter(value => value === 'yes').length, no = answers.filter(value => value === 'no').length;
      const guesser = round.guess?.playerNum;
      round.judgeResult = { yes, no, accused: yes > no };
      if (yes > no) {
        // Majority says the guesser was the Insider: reveal them now.
        finishRound(state, now, roleOf(round, guesser) === 'insider' ? 'commons_found' : 'insider_wins', { accused: guesser, revealed: [guesser] });
      } else {
        enter(state, 'vote', now, CONFIG.voteMs);
        if (allVoted(state)) resolve(state, now);
      }
      return;
    } else if (state.phase === 'vote') {
      const { leaders } = tally(round.votes);
      // A tie is broken by the guesser's own vote, if it went to a tied player.
      const tieBreak = round.votes[round.guess?.playerNum];
      const accused = leaders.length === 1 ? leaders[0] : leaders.includes(tieBreak) ? tieBreak : null;
      finishRound(state, now, accused != null && accused === insiderOf(round) ? 'commons_found' : 'insider_wins',
        { accused, revealed: leaders, tieBreak: leaders.length > 1 ? tieBreak ?? null : null });
    } else if (state.phase === 'masterGuess') {
      const pick = round.masterPick;
      finishRound(state, now, pick != null && pick === insiderOf(round) ? 'master_found' : 'nobody', { accused: pick ?? null });
    }
  }
  function finishRound(state, now, key, extra = {}) {
    const round = state.round, rule = CONFIG.points[key];
    const winners = rule.team ? roundPlayers(round).filter(n => teamOf(round, n) === rule.team) : [];
    const points = {};
    for (const n of winners) points[n] = rule.points + (rule.seerBonus && roleOf(round, n) === 'seer' ? rule.seerBonus : 0);
    for (const [n, value] of Object.entries(points)) state.scores[n] = (state.scores[n] || 0) + value;
    round.points = points;
    round.outcome = Object.assign({ key, team: rule.team, winners }, extra);
    const card = word(round);
    state.history = [...list(state.history), { no: round.no, mode: round.mode, key, mayor: round.mayor, winners,
      word: card ? { en: card.en, zh: card.zh } : null }].slice(-CONFIG.historyMax);
    enter(state, 'result', now);
  }
  function voidRound(state, now, reason) {
    const round = state.round;
    round.queue = []; round.current = null;
    finishRound(state, now, 'void', { reason });
  }

  // ── create / apply ─────────────────────────────────────────────────────
  function create({ id, roster: seats, settings, now, seed, wordHistory } = {}) {
    if (!id || !Number.isFinite(now) || !Array.isArray(seats) || seats.length < 1 || seats.length > CONFIG.maxPlayers) throw new Error('invalid_roster');
    if (seats.some(player => !player || !Number.isInteger(player.playerNum) || player.playerNum < 1 || player.playerNum > CONFIG.maxPlayers)
      || new Set(seats.map(player => player.playerNum)).size !== seats.length) throw new Error('invalid_roster');
    const parsed = parseSettings(settings || {});
    const state = {
      version: 1, sessionId: String(id), turnId: 0, stage: 0, lastChangeAt: now,
      settings: parsed,
      roster: seats.map(player => ({ playerNum: player.playerNum, name: String(player.name || '').trim().slice(0, 80), active: player.active !== false }))
        .sort((a, b) => a.playerNum - b.playerNum),
      scores: {}, rotation: { bag: [], last: null, next: null },
      wordHistory: { used: list(wordHistory?.used).filter(item => typeof item === 'string' && WORDS.get(item)) },
      roundNo: 0, round: null, history: [],
      phase: 'choose', deadline: null, pausedFrom: null, remainingMs: null, stopped: false,
      seen: {}, replies: {},
    };
    if (activeNums(state).length < CONFIG.minPlayers) throw new Error('not_enough_players');
    startRound(state, now, rng(seed));
    return state;
  }

  function normalize(state) {
    state.roster = roster(state); state.history = list(state.history);
    state.scores = state.scores || {}; state.seen = state.seen || {}; state.replies = state.replies || {};
    state.rotation = Object.assign({ bag: [], last: null, next: null }, state.rotation || {});
    state.rotation.bag = list(state.rotation.bag);
    state.wordHistory = { used: list(state.wordHistory?.used) };
    const round = state.round;
    if (round) {
      round.players = list(round.players); round.options = list(round.options); round.queue = list(round.queue); round.log = list(round.log);
      for (const key of ['roles', 'votes', 'judge', 'picks', 'points']) round[key] = round[key] || {};
    }
  }
  const PLAYER_COMMANDS = new Set(['choose', 'reroll', 'raise', 'lower', 'text', 'pickAsker', 'skip', 'answer', 'vote', 'judge', 'pick', 'masterPick', 'next']);
  const HOST_COMMANDS = new Set(['tick', 'pause', 'resume', 'close', 'extend', 'void', 'setNext', 'exclude', 'restart', 'settings', 'stop', 'next', 'rename']);
  // The table runs without a host page: any active player may use these from
  // their own card, and anyone still seated may tick an expired clock. Only the
  // Hub's rename stays with the host page.
  const TABLE_COMMANDS = new Set(['tick', 'pause', 'resume', 'close', 'extend', 'void', 'setNext', 'exclude', 'restart', 'settings', 'stop']);
  function allowed(state, actor, type, input) {
    if (actor === 0) return HOST_COMMANDS.has(type);
    if (PLAYER_COMMANDS.has(type)) return true;
    if (!TABLE_COMMANDS.has(type)) return false;
    if (type === 'tick' || isActive(state, actor)) return true;
    // Someone sitting out can always bring themselves back.
    return type === 'exclude' && Number(input.playerNum) === actor && input.active === true;
  }

  function apply(current, input) {
    if (!current || !input || input.sessionId !== current.sessionId || typeof input.id !== 'string' || !input.id || input.id.length > 100) return current;
    const actor = Number(input.actor), host = actor === 0;
    if (!host && !seat(current, actor)) return current;
    if (list((current.seen || {})[actor]).includes(input.id)) return current;
    const now = Number(input.now);
    if (!Number.isFinite(now)) return current;
    const type = String(input.type || '');
    if (type === 'tick') {
      // Idle ticks never write.
      if (input.stage !== current.stage || !TIMED.includes(current.phase) || !(current.deadline > 0) || now < current.deadline) return current;
    }
    const state = copy(current);
    normalize(state);
    const random = rng(input.seed);
    const round = state.round;
    const fresh = input.stage === state.stage;
    let error = '';
    const fail = code => { error = code; };
    if (!allowed(current, actor, type, input)) fail('not_available');
    // Cards are fenced to the stage they showed; host buttons that advance
    // the table (close / extend / next) are fenced too, so a double click
    // cannot skip a whole phase.
    else if (!fresh && (!host || ['close', 'extend', 'next'].includes(type))) fail('stale_turn');
    else switch (type) {
      case 'tick':
      case 'close': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
        if (state.phase === 'countdown') beginQuestions(state, now);
        else if (state.phase === 'questions') endQuestions(state, now, type === 'tick' ? 'time' : 'host');
        else resolve(state, now);
        break;
      }
      case 'choose': {
        if (state.phase !== 'choose' || actor !== round.mayor || !isActive(state, actor) || !round.options.includes(input.wordId)) { fail('not_available'); break; }
        round.wordId = input.wordId;
        state.wordHistory.used = [...state.wordHistory.used.filter(item => item !== input.wordId), input.wordId].slice(-WORDS.items.length);
        enter(state, 'countdown', now, CONFIG.countdownMs);
        break;
      }
      case 'reroll': {
        if (state.phase !== 'choose' || actor !== round.mayor || round.rerolls >= CONFIG.maxRerolls) { fail('not_available'); break; }
        round.rerolls++;
        drawOptions(state, round, random);
        break;
      }
      case 'raise': {
        if (state.phase !== 'questions' || !playing(state, actor) || actor === round.mayor) { fail('not_available'); break; }
        if (round.current?.playerNum === actor || round.queue.some(entry => entry.playerNum === actor)) { fail('already_in_line'); break; }
        const entry = { id: `${round.no}-${++round.askSerial}`, playerNum: actor, text: cleanText(input.text) };
        if (!round.current) round.current = entry; else round.queue.push(entry);
        break;
      }
      case 'lower': {
        if (state.phase !== 'questions') { fail('not_available'); break; }
        if (round.current?.playerNum === actor) nextAsker(round);
        else if (round.queue.some(entry => entry.playerNum === actor)) round.queue = round.queue.filter(entry => entry.playerNum !== actor);
        else fail('not_available');
        break;
      }
      case 'text': {
        if (state.phase !== 'questions') { fail('not_available'); break; }
        const entry = round.current?.playerNum === actor ? round.current : round.queue.find(item => item.playerNum === actor);
        if (!entry) { fail('not_available'); break; }
        entry.text = cleanText(input.text);
        break;
      }
      case 'pickAsker': {
        const target = Number(input.playerNum);
        if (state.phase !== 'questions' || actor !== round.mayor || !playing(state, target) || target === round.mayor) { fail('not_available'); break; }
        if (round.current?.playerNum === target) break;
        const queued = round.queue.find(entry => entry.playerNum === target);
        round.queue = round.queue.filter(entry => entry.playerNum !== target);
        if (round.current) round.queue.unshift(round.current);
        round.current = { id: `${round.no}-${++round.askSerial}`, playerNum: target, text: queued?.text || '' };
        break;
      }
      case 'skip': {
        if (state.phase !== 'questions' || actor !== round.mayor || !round.current) { fail('not_available'); break; }
        nextAsker(round);
        break;
      }
      case 'answer': {
        const answer = String(input.answer || '');
        if (state.phase !== 'questions' || actor !== round.mayor || !round.current || round.current.id !== input.askId
          || !CONFIG.answers[round.mode].includes(answer)) { fail('not_available'); break; }
        const asked = round.current;
        round.log = [...round.log, { id: asked.id, playerNum: asked.playerNum, answer, text: asked.text || '', at: now - round.startedAt }].slice(-CONFIG.logMax);
        if (answer === 'yes' || answer === 'no') round.tokensUsed++;
        if (answer === 'correct') {
          round.guess = { playerNum: asked.playerNum, elapsedMs: Math.max(0, now - round.startedAt) };
          endQuestions(state, now, 'correct');
        } else if (round.tokens > 0 && round.tokensUsed >= round.tokens) endQuestions(state, now, 'tokens');
        else nextAsker(round);
        break;
      }
      case 'vote':
      case 'pick':
      case 'masterPick': {
        const phases = { vote: ['accuse', 'vote'], pick: ['hunt'], masterPick: ['masterGuess'] }[type];
        const target = Number(input.target);
        if (!phases.includes(state.phase) || !voters(state).includes(actor) || !targets(state, actor).includes(target)) { fail('not_available'); break; }
        if (type === 'masterPick') round.masterPick = target;
        else round[ballots(state)][actor] = target;
        if (allVoted(state)) resolve(state, now);
        break;
      }
      case 'judge': {
        if (state.phase !== 'judge' || !voters(state).includes(actor) || !['yes', 'no'].includes(input.choice)) { fail('not_available'); break; }
        round.judge[actor] = input.choice;
        if (allVoted(state)) resolve(state, now);
        break;
      }
      case 'next': {
        if (state.phase !== 'result' || (!host && !isActive(state, actor))) { fail('not_available'); break; }
        try { startRound(state, now, random); } catch (e) { fail(e.message); }
        break;
      }
      case 'pause': {
        if (!TIMED.includes(state.phase)) { fail('not_available'); break; }
        const from = state.phase, remaining = Math.max(CONFIG.resumeFloorMs, (state.deadline || now) - now);
        enter(state, 'paused', now);
        state.pausedFrom = from; state.remainingMs = remaining;
        break;
      }
      case 'resume': {
        if (state.phase !== 'paused') { fail('not_available'); break; }
        const from = state.pausedFrom, remaining = Math.max(CONFIG.resumeFloorMs, state.remainingMs || 0);
        enter(state, from, now, remaining);
        if (VOTING.includes(from) && allVoted(state)) resolve(state, now);
        break;
      }
      case 'extend': {
        if (!TIMED.includes(state.phase) || state.phase === 'countdown') { fail('not_available'); break; }
        state.deadline = Math.max(state.deadline || now, now) + (state.phase === 'questions' ? CONFIG.extendQuestionsMs : CONFIG.extendOtherMs);
        break;
      }
      case 'void': {
        if (!round || ['result', 'finished'].includes(state.phase)) { fail('not_available'); break; }
        voidRound(state, now, 'host');
        break;
      }
      case 'setNext': {
        const target = input.playerNum == null ? null : Number(input.playerNum);
        if (target != null && !isActive(state, target)) { fail('not_available'); break; }
        state.rotation.next = target;
        break;
      }
      case 'exclude': {
        const number = Number(input.playerNum), want = input.active === true, player = seat(state, number);
        if (!player || player.active === want) { fail('not_available'); break; }
        player.active = want;
        if (!want && round && !['result', 'finished'].includes(state.phase)) {
          const live = state.phase === 'paused' ? state.pausedFrom : state.phase;
          if (number === round.mayor && ['choose', 'countdown', 'questions'].includes(live)) { voidRound(state, now, 'answerer_left'); break; }
          if (round.current?.playerNum === number) nextAsker(round);
          round.queue = round.queue.filter(entry => entry.playerNum !== number);
          for (const box of ['votes', 'judge', 'picks']) {
            delete round[box][number];
            for (const [voter, target] of Object.entries(round[box])) if (target === number) delete round[box][voter];
          }
          if (round.masterPick === number) round.masterPick = null;
          if (VOTING.includes(state.phase) && allVoted(state)) resolve(state, now);
        }
        if (!want && state.rotation.next === number) state.rotation.next = null;
        break;
      }
      case 'settings': {
        try { state.settings = parseSettings(input.settings || {}, state.settings); } catch (e) { fail('invalid_options'); }
        break;
      }
      case 'rename': {
        // The Hub renamed someone: keep every seat, its score and its secret.
        let changed = false;
        for (const entry of list(input.names)) {
          const player = seat(state, Number(entry?.playerNum)), name = String(entry?.name ?? '').trim().slice(0, 80);
          if (player && name && player.name !== name) { player.name = name; changed = true; }
        }
        if (!changed) fail('not_available');
        break;
      }
      case 'restart': {
        let settings;
        try { settings = parseSettings(input.settings || {}, state.settings); } catch (e) { fail('invalid_options'); break; }
        if (activeNums(state).length < CONFIG.minPlayers) { fail('not_enough_players'); break; }
        state.settings = settings; state.scores = {}; state.history = []; state.roundNo = 0; state.stopped = false;
        state.rotation = { bag: [], last: null, next: state.rotation.next };
        startRound(state, now, random);
        break;
      }
      case 'stop': {
        if (state.phase === 'finished') { fail('not_available'); break; }
        if (round && !['result'].includes(state.phase)) { round.queue = []; round.current = null; }
        state.stopped = true;
        enter(state, 'finished', now);
        break;
      }
      default: fail('not_available');
    }
    if (!error) bump(state, now);
    state.seen[actor] = [...list(state.seen[actor]), input.id].slice(-CONFIG.seenMax);
    state.replies[actor] = { id: input.id, error };
    return state;
  }

  // ── projections ────────────────────────────────────────────────────────
  function standings(state) {
    const rows = roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active, score: state.scores?.[player.playerNum] || 0 }));
    const best = rows.length ? Math.max(...rows.map(row => row.score)) : 0;
    return rows.map(row => Object.assign(row, { leading: best > 0 && row.score === best }))
      .sort((a, b) => b.score - a.score || a.playerNum - b.playerNum);
  }
  function composition(round) {
    if (!round) return null;
    // The answerer is public; only a Werewolf-mode Mayor with a secret role
    // also counts toward the hidden roles.
    const counted = roundPlayers(round).filter(n => n !== round.mayor || (round.mode === 'werewolf' && round.mayorSecret));
    const counts = {};
    for (const n of counted) counts[roleOf(round, n)] = (counts[roleOf(round, n)] || 0) + 1;
    return { mode: round.mode, mayorSecret: !!round.mayorSecret, counts };
  }
  function tallies(round) {
    const out = {};
    for (const entry of list(round?.log)) {
      const row = out[entry.playerNum] ||= {};
      row[entry.answer] = (row[entry.answer] || 0) + 1;
    }
    return out;
  }
  function resultView(state) {
    const round = state.round;
    if (!round || !round.outcome) return null;
    return {
      outcome: copy(round.outcome), roles: copy(round.roles), word: wordView(word(round)), mayor: round.mayor,
      guess: round.guess ? copy(round.guess) : null, endReason: round.endReason,
      votes: copy(round.votes), judge: copy(round.judge), picks: copy(round.picks), masterPick: round.masterPick,
      judgeResult: round.judgeResult ? copy(round.judgeResult) : null, points: copy(round.points),
    };
  }
  function privateView(state, n) {
    const round = state.round, phase = state.phase, mine = seat(state, n);
    const role = roleOf(round, n), isMayor = !!round && round.mayor === n;
    const reveal = phase === 'result' || phase === 'finished';
    const me = {
      active: !!mine?.active, role, isMayor, inRound: !!role,
      word: !reveal && round?.wordId && knows(round, n) ? wordView(word(round)) : null,
      teammates: role === 'werewolf' && round ? wolvesOf(round).filter(other => other !== n) : [],
      options: isMayor && phase === 'choose' ? round.options.map(id => wordView(WORDS.get(id))).filter(Boolean) : null,
      rerollsLeft: isMayor && phase === 'choose' ? Math.max(0, CONFIG.maxRerolls - round.rerolls) : 0,
      queuePos: 0, asking: false, myText: '',
      canRaise: false, canAnswer: false, answers: round ? CONFIG.answers[round.mode] : [],
      vote: null, judge: null, pick: null, canVote: false, voteTargets: [], canJudge: false,
      canNext: phase === 'result' && !!mine?.active,
      // Table controls on the card: pause, add time, players, settings.
      canControl: mine?.active === true,
    };
    if (!round) return me;
    if (phase === 'questions') {
      const index = round.queue.findIndex(entry => entry.playerNum === n);
      me.asking = round.current?.playerNum === n;
      me.queuePos = me.asking ? 0 : index + 1;
      me.myText = (me.asking ? round.current.text : index >= 0 ? round.queue[index].text : '') || '';
      me.canRaise = playing(state, n) && !isMayor && !me.asking && index < 0;
      me.canAnswer = isMayor && mine?.active === true;
    }
    if (VOTING.includes(phase) && voters(state).includes(n)) {
      if (phase === 'judge') { me.canJudge = true; me.judge = round.judge[n] || null; }
      else {
        me.canVote = true; me.voteTargets = targets(state, n);
        me.vote = phase === 'hunt' ? round.picks[n] ?? null : phase === 'masterGuess' ? round.masterPick ?? null : round.votes[n] ?? null;
      }
    }
    return me;
  }
  // Shared screen and every card. Nothing here depends on who is looking,
  // except `me`, which carries only that seat's own secrets.
  function view(state, actor) {
    const n = Number(actor), round = state.round, phase = state.phase;
    const reveal = phase === 'result' || phase === 'finished';
    const guessed = !!round?.guess;
    const timed = TIMED.includes(phase);
    const ballotPhase = VOTING.includes(phase);
    const who = ballotPhase ? voters(state) : [];
    const box = ballotPhase ? (phase === 'masterGuess' ? (round.masterPick != null ? { [round.mayor]: round.masterPick } : {}) : round[ballots(state)] || {}) : {};
    const seats = roster(state).map(player => ({ playerNum: player.playerNum, name: player.name, active: player.active,
      score: state.scores?.[player.playerNum] || 0, inRound: !!roleOf(round, player.playerNum) }));
    const wk = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, stage: state.stage, phase,
      pausedFrom: phase === 'paused' ? state.pausedFrom : null,
      settings: copy(state.settings), roundNo: state.roundNo,
      mode: round?.mode || state.settings.mode, mayor: round?.mayor ?? null,
      composition: composition(round),
      deadline: timed ? state.deadline : null, remainingMs: phase === 'paused' ? state.remainingMs : null,
      questionMs: round?.questionMs ?? null, startedAt: round?.startedAt ?? null,
      tokens: round ? { used: round.tokensUsed, budget: round.tokens } : null,
      queue: phase === 'questions' || (phase === 'paused' && state.pausedFrom === 'questions') ? round.queue.map(entry => ({ playerNum: entry.playerNum, text: entry.text || '' })) : [],
      current: round?.current && (phase === 'questions' || phase === 'paused') ? { id: round.current.id, playerNum: round.current.playerNum, text: round.current.text || '' } : null,
      log: round ? round.log.map(entry => ({ id: entry.id, playerNum: entry.playerNum, answer: entry.answer, text: entry.text || '', at: entry.at })) : [],
      tallies: tallies(round),
      guess: round?.guess ? copy(round.guess) : null, endReason: round?.endReason || null,
      // The winning question was said aloud, so the word is public from then on.
      word: round && (guessed || reveal) ? wordView(word(round)) : null,
      wolves: round?.mode === 'werewolf' && (reveal || (guessed && ['hunt', 'paused'].includes(phase))) ? wolvesOf(round) : [],
      judgeTarget: round?.mode === 'insider' && guessed ? round.guess.playerNum : null,
      ballots: ballotPhase ? { cast: who.filter(voter => own(box, voter)).length, total: who.length, voted: who.filter(voter => own(box, voter)) } : null,
      result: reveal ? resultView(state) : null,
      standings: standings(state),
      history: list(state.history).slice(-12).map(copy),
      roster: seats, stopped: phase === 'finished' && state.stopped === true,
      nextAnswerer: state.rotation?.next ?? null,
      reply: (state.replies || {})[n] || null,
    };
    if (n > 0) wk.me = privateView(state, n);
    return { game: 'whoknows', playerNum: n, name: seat(state, n)?.name || null, wk };
  }

  return { CONFIG, MODES, WORDS, create, apply, view, standings, parseSettings, defaultSettings, wolfCount, rng, list, cleanText,
    voters, targets, roleOf, nameOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WHO_KNOWS_ENGINE;
