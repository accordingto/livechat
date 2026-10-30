/* Sketch Relay rules. Pure and deterministic: every command carries its own
 * time and random seed, and the result is a new state object.
 *
 * Telestrations-style flow. Everyone gets a card of six secret words and one
 * shared die roll picks the same number on every card. Each player owns one
 * sketchbook whose first page is that word. With an even number of players
 * you first draw your own word; with an odd number your book passes straight
 * to the next player, who draws it. Books then pass one seat onward after
 * every page: whoever receives a word or guess draws it (on a timer), whoever
 * receives a drawing writes what they think it is. When every book is back
 * with its owner, the books are revealed one page at a time.
 *
 * The circle is fixed when drawing starts: only the players who are playing
 * at that moment own a sketchbook and receive pages, and the even/odd rule
 * uses their number. Seats that were empty or sitting out join the next round,
 * so a room with unused links still ends every book on a guess.
 *
 * Absent players never get invented pages. A page can be skipped; the next
 * player simply responds to the last real page of that book, so drawings and
 * guesses keep alternating inside every book. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SKETCH_RELAY_ENGINE = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const ART = node ? require('./sketch-relay-art.js') : root.SKETCH_RELAY_ART;
  const WORDS = node ? require('./sketch-relay-words.js') : root.SKETCH_RELAY_WORDS;

  const MIN_PLAYERS = 4, MAX_PLAYERS = 9, CARD_SIZE = 6, MAX_SWAPS = 5;
  const DECKS = Object.freeze(['mixed', 'easy', 'tricky']);
  const TIMERS = Object.freeze([45, 60, 90, 120, 0]);
  const SCORING = Object.freeze(['friendly', 'competitive', 'none']);
  const GUESS_MAX = 40;
  const AUTO_SKIP_GRACE_MS = 20000;
  const SEEN_LIMIT = 40;
  const RECEIPT_LIMIT = SEEN_LIMIT;
  const TURN_TYPES = new Set(['ready', 'swapWord', 'start', 'draft', 'submit', 'skip', 'tick', 'pause', 'resume']);
  const PAUSED_TYPES = new Set(['ready', 'swapWord', 'start', 'draft', 'submit', 'skip']);

  const copy = value => JSON.parse(JSON.stringify(value));
  const list = value => Array.isArray(value) ? value.filter(v => v != null) : Object.values(value || {});
  function rng(seed) {
    let a = (Number(seed) >>> 0) || 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const cleanText = value => String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  // Loose comparison for suggesting matches; people still decide.
  function normalize(value) {
    return cleanText(value).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9㐀-鿿]+/g, ' ').trim().split(' ')
      .filter((w, i, all) => w && !(all.length > 1 && i === 0 && ['a', 'an', 'the'].includes(w)))
      .map(w => w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
      .join(' ');
  }
  const sameWords = (a, b) => !!normalize(a) && normalize(a) === normalize(b);

  function validSettings(settings) {
    return !!settings && DECKS.includes(settings.deck) && TIMERS.includes(settings.sketchSeconds) && SCORING.includes(settings.scoring);
  }
  function deal(count, deck, used, random) {
    const pool = deck === 'easy' ? WORDS.easy : deck === 'tricky' ? WORDS.tricky : WORDS.easy.concat(WORDS.tricky);
    const seen = new Set(list(used));
    let fresh = pool.filter(w => !seen.has(w));
    let reset = false;
    if (fresh.length < count * CARD_SIZE) { fresh = pool.slice(); reset = true; }
    const drawn = shuffle(fresh, random).slice(0, count * CARD_SIZE);
    const cards = Array.from({ length: count }, (_, i) => drawn.slice(i * CARD_SIZE, (i + 1) * CARD_SIZE));
    return { cards, used: (reset ? [] : list(used)).concat(drawn) };
  }
  function freshRound(state, { now, seed }) {
    const random = rng(seed);
    const { cards, used } = deal(state.roster.length, state.settings.deck, state.usedWords, random);
    const die = 1 + Math.floor(random() * 6);
    const n = state.roster.length, offset = n % 2;
    Object.assign(state, {
      phase: 'word', die, turnId: (state.turnId || 0) + 1, usedWords: used.slice(-400),
      books: state.roster.map((p, i) => ({ owner: p.playerNum, card: cards[i], wordIndex: die - 1, pages: [] })),
      ready: {}, swaps: {}, offset, steps: n - offset, step: 0, submissions: {}, drafts: {}, circle: null,
      stepStartedAt: null, deadline: null, paused: false, pausedAt: null,
      reveal: null, awards: {}, result: null, roundStartedAt: now,
    });
    return state;
  }
  function create({ id, roster, settings, now, seed, totals = {}, usedWords = [] } = {}) {
    const players = list(roster);
    if (typeof id !== 'string' || id.length < 8 || id.length > 100) throw new Error('invalid_setup');
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('invalid_roster');
    const nums = players.map(p => Number(p.playerNum));
    if (nums.some(n => !Number.isInteger(n) || n < 1) || new Set(nums).size !== nums.length) throw new Error('invalid_roster');
    if (!validSettings(settings)) throw new Error('invalid_options');
    if (!Number.isFinite(now)) throw new Error('invalid_setup');
    const state = {
      version: 1, game: 'sketchrelay', sessionId: id, turnId: 0, round: 1, createdAt: now, lastChangeAt: now,
      roster: players.map((p, i) => ({ playerNum: nums[i], name: cleanText(p.name).slice(0, 40) || `Player ${nums[i]}`, active: true })),
      settings: { deck: settings.deck, sketchSeconds: settings.sketchSeconds, scoring: settings.scoring },
      totals: Object.fromEntries(nums.map(n => [n, Number(totals?.[n]) || 0])), usedWords: list(usedWords),
      seen: {}, replies: {}, receipts: {},
    };
    return freshRound(state, { now, seed });
  }

  const seat = (state, num) => state.roster.findIndex(p => p.playerNum === Number(num));
  const player = (state, num) => state.roster.find(p => p.playerNum === Number(num)) || null;
  const nameOf = (state, num) => player(state, num)?.name || `Player ${num}`;
  const isActive = (state, num) => player(state, num)?.active !== false;
  const activeNums = state => state.roster.filter(p => p.active !== false).map(p => p.playerNum);
  // The players passing books this round, in seat order. Games saved before
  // the circle existed used every roster seat.
  const circleOf = state => Array.isArray(state.circle) && state.circle.length ? state.circle : state.roster.map(p => p.playerNum);
  const inCircle = (state, num) => circleOf(state).includes(Number(num));
  // The book a seat is holding at a step, and the reverse.
  const holderOf = (state, book, step = state.step) => { const c = circleOf(state); return c[(book + step + state.offset) % c.length]; };
  function bookHeldBy(state, num, step = state.step) {
    const c = circleOf(state), i = c.indexOf(Number(num)), n = c.length;
    return i < 0 ? -1 : ((i - step - state.offset) % n + n) % n;
  }
  const nextInCircle = (state, num) => { const c = circleOf(state), i = c.indexOf(Number(num)); return i < 0 ? null : c[(i + 1) % c.length]; };
  const lastReal = (pages, before = pages.length) => {
    for (let i = before - 1; i >= 0; i--) if (!pages[i].skipped) return i;
    return -1;
  };
  function taskKind(state, book) {
    const pages = state.books[book].pages, last = pages[lastReal(pages)];
    return last?.kind === 'sketch' ? 'guess' : 'sketch';
  }
  // The text a drawing was trying to show, for guess page `index`.
  function sourceText(pages, index) {
    const sketch = lastReal(pages, index);
    if (sketch < 0 || pages[sketch].kind !== 'sketch') return null;
    const text = lastReal(pages, sketch);
    return text < 0 ? null : pages[text].text ?? null;
  }
  const finalGuess = pages => {
    const last = lastReal(pages);
    // A skipped page may leave a book ending in a drawing. An earlier guess
    // is not that book's final answer and must not earn the matching bonus.
    return last > 0 && pages[last].kind === 'guess' ? last : -1;
  };

  function hasOpenSketch(state) {
    return state.books.some((_, b) => !state.submissions[b] && taskKind(state, b) === 'sketch' && isActive(state, holderOf(state, b)));
  }
  function beginStep(state, now) {
    state.turnId++; state.submissions = {}; state.drafts = {}; state.stepStartedAt = now;
    state.books.forEach((_, b) => {
      const by = holderOf(state, b);
      if (!isActive(state, by)) state.submissions[b] = { kind: taskKind(state, b), by, skipped: true };
    });
    state.deadline = state.settings.sketchSeconds > 0 && hasOpenSketch(state) ? now + state.settings.sketchSeconds * 1000 : null;
    if (state.paused) state.pausedAt = now;
    completeStep(state, now);
  }
  function completeStep(state, now) {
    if (state.phase !== 'play' || state.paused || state.books.some((_, b) => !state.submissions[b])) return;
    state.books.forEach((book, b) => {
      const sub = state.submissions[b];
      book.pages.push(sub.skipped ? { kind: sub.kind, by: sub.by, skipped: true }
        : sub.kind === 'sketch' ? { kind: 'sketch', by: sub.by, art: sub.art, at: sub.at } : { kind: 'guess', by: sub.by, text: sub.text, at: sub.at });
    });
    state.step++;
    if (state.step >= state.steps) startReveal(state, now);
    else beginStep(state, now);
  }
  function startPlay(state, now) {
    // Fix the circle: everyone playing now owns a book; empty or sitting-out
    // seats join next round. Even circles draw their own word first, odd
    // circles pass it first, so every book comes home ending with a guess.
    const circle = activeNums(state);
    state.circle = circle;
    state.books = state.books.filter(book => circle.includes(book.owner));
    state.offset = circle.length % 2; state.steps = circle.length - state.offset;
    state.books.forEach(book => { book.pages = [{ kind: 'word', by: book.owner, text: book.card[book.wordIndex] }]; });
    state.phase = 'play'; state.step = 0; state.ready = {};
    beginStep(state, now);
  }
  function maybeStartPlay(state, now) {
    const active = activeNums(state);
    if (!state.paused && active.length && active.every(n => state.ready[n] === true)) startPlay(state, now);
  }
  function startReveal(state, now) {
    state.phase = 'reveal'; state.turnId++; state.submissions = {}; state.drafts = {}; state.deadline = null; state.stepStartedAt = null;
    state.paused = false; state.pausedAt = null;
    state.reveal = { book: 0, shown: 1, complete: false, startedAt: now };
  }
  function completeBook(state) {
    const reveal = state.reveal, book = state.books[reveal.book];
    reveal.shown = book.pages.length; reveal.complete = true;
    if (state.awards[reveal.book]) return;
    const pages = book.pages, last = finalGuess(pages);
    const awards = { sketch: null, guess: null, final: last > 0 && sameWords(pages[last].text, pages[0].text), matches: {} };
    if (state.settings.scoring === 'competitive') {
      // A guess matches when it names what its artist drew or the secret word.
      pages.forEach((page, i) => { if (page.kind === 'guess' && !page.skipped) awards.matches[i] = sameWords(page.text, sourceText(pages, i)) || sameWords(page.text, pages[0].text); });
    }
    state.awards[reveal.book] = awards;
  }

  // Points for this round, recomputed from the recorded human decisions.
  function roundScores(state) {
    const points = Object.fromEntries(state.roster.map(p => [p.playerNum, 0]));
    const reasons = Object.fromEntries(state.roster.map(p => [p.playerNum, []]));
    const add = (num, reason) => { if (num in points) { points[num]++; reasons[num].push(reason); } };
    if (state.settings.scoring === 'none') return { points, reasons };
    state.books.forEach((book, b) => {
      const awards = state.awards?.[b]; if (!awards) return;
      const pages = book.pages;
      if (state.settings.scoring === 'friendly') {
        if (pages[awards.sketch]?.kind === 'sketch' && pages[awards.sketch].by !== book.owner) add(pages[awards.sketch].by, { type: 'favoriteSketch', book: b });
        if (pages[awards.guess]?.kind === 'guess' && pages[awards.guess].by !== book.owner) add(pages[awards.guess].by, { type: 'favoriteGuess', book: b });
      } else {
        for (const [key, matched] of Object.entries(awards.matches || {})) {
          const i = Number(key), page = pages[i];
          if (!matched || page?.kind !== 'guess' || page.skipped) continue;
          add(page.by, { type: 'match', book: b });
          const sketch = lastReal(pages, i);
          if (sketch > 0 && pages[sketch].kind === 'sketch') add(pages[sketch].by, { type: 'helped', book: b });
        }
      }
      if (awards.final && finalGuess(pages) > 0) add(book.owner, { type: 'final', book: b });
    });
    return { points, reasons };
  }
  function finish(state, now) {
    const { points, reasons } = roundScores(state);
    const totals = Object.fromEntries(state.roster.map(p => [p.playerNum, (Number(state.totals?.[p.playerNum]) || 0) + points[p.playerNum]]));
    state.phase = 'finished'; state.turnId++; state.finishedAt = now;
    state.result = { points, reasons, totals };
  }

  function canPresent(state, actor) {
    if (actor === 0) return true;
    const owner = state.books[state.reveal?.book]?.owner;
    return actor === owner || (owner != null && !isActive(state, owner));
  }

  function handle(state, input) {
    const { type, actor, now } = input;
    const phase = state.phase;
    if (state.paused && PAUSED_TYPES.has(type)) return 'paused';
    switch (type) {
      case 'ready': {
        if (phase !== 'word' || actor < 1 || !isActive(state, actor)) return 'not_available';
        state.ready[actor] = true; maybeStartPlay(state, now); return '';
      }
      case 'swapWord': {
        if (phase !== 'word' || actor < 1 || !isActive(state, actor)) return 'not_available';
        const book = state.books.find(b => b.owner === actor);
        const swaps = Number(state.swaps[actor]) || 0;
        if (!book || swaps >= MAX_SWAPS) return 'not_available';
        book.wordIndex = (book.wordIndex + 1) % CARD_SIZE; state.swaps[actor] = swaps + 1; state.ready[actor] = false;
        return '';
      }
      case 'start': {
        if (actor !== 0 || phase !== 'word') return 'not_available';
        startPlay(state, now); return '';
      }
      case 'draft': {
        if (phase !== 'play' || actor < 1 || !isActive(state, actor)) return 'not_available';
        const book = Number(input.book);
        if (!Number.isInteger(book) || book < 0 || book >= state.books.length || holderOf(state, book) !== actor || taskKind(state, book) !== 'sketch' || input.kind !== 'sketch') return 'not_available';
        if (state.submissions[book]) return 'already_submitted';
        if (state.deadline > 0 && now >= state.deadline + AUTO_SKIP_GRACE_MS) return 'deadline_passed';
        if (!ART.valid(input.art)) return 'invalid_sketch';
        // A final clear may arrive just after the client clock has frozen.
        // Accept only blank drafts in the grace window so a saved earlier
        // drawing is not revived by the host's automatic hand-in.
        if (state.deadline > 0 && now >= state.deadline && !ART.isBlank(input.art)) return 'deadline_passed';
        state.drafts ||= {};
        state.drafts[book] = { kind: 'sketch', by: actor, art: input.art, at: now };
        return '';
      }
      case 'submit': {
        if (phase !== 'play' || actor < 1) return 'not_available';
        const book = Number(input.book);
        if (!Number.isInteger(book) || book < 0 || book >= state.books.length || holderOf(state, book) !== actor) return 'not_available';
        if (!isActive(state, actor) || state.submissions[book]?.skipped) return 'not_available';
        if (state.submissions[book]) return 'already_submitted';
        const kind = taskKind(state, book);
        if (input.kind !== kind) return 'not_available';
        if (kind === 'sketch') {
          // The grace window lets the final client submission reach the host.
          // Beyond it the host uses the last saved draft instead.
          if (state.deadline > 0 && now >= state.deadline + AUTO_SKIP_GRACE_MS) return 'deadline_passed';
          if (!ART.valid(input.art) || ART.isBlank(input.art)) return 'invalid_sketch';
          state.submissions[book] = { kind, by: actor, art: input.art, at: now };
        } else {
          const text = cleanText(input.text);
          if (!text || text.length > GUESS_MAX) return 'invalid_guess';
          state.submissions[book] = { kind, by: actor, text, at: now };
        }
        if (state.drafts) delete state.drafts[book];
        completeStep(state, now); return '';
      }
      case 'skip': {
        if (actor !== 0 || phase !== 'play') return 'not_available';
        state.books.forEach((_, b) => { if (!state.submissions[b]) state.submissions[b] = { kind: taskKind(state, b), by: holderOf(state, b), skipped: true }; });
        completeStep(state, now); return '';
      }
      case 'tick': {
        if (actor !== 0 || phase !== 'play' || state.paused || !(state.deadline > 0) || now < state.deadline + AUTO_SKIP_GRACE_MS) return '';
        state.books.forEach((_, b) => {
          if (!state.submissions[b] && taskKind(state, b) === 'sketch') {
            const draft = state.drafts?.[b];
            state.submissions[b] = draft && ART.valid(draft.art) && !ART.isBlank(draft.art)
              ? { kind: 'sketch', by: holderOf(state, b), art: draft.art, at: draft.at }
              : { kind: 'sketch', by: holderOf(state, b), skipped: true };
            if (state.drafts) delete state.drafts[b];
          }
        });
        state.deadline = null;
        completeStep(state, now); return '';
      }
      case 'away': {
        const num = Number(input.playerNum), away = input.away === true;
        if (!player(state, num) || typeof input.away !== 'boolean' || (actor !== 0 && actor !== num)) return 'not_available';
        if (isActive(state, num) !== away) return '';
        if (away && activeNums(state).length <= 2) return 'not_enough_players';
        if (away && phase === 'play' && inCircle(state, num) && circleOf(state).filter(n => isActive(state, n)).length <= 2) return 'not_enough_players';
        player(state, num).active = !away;
        if (away && phase === 'word') { delete state.ready[num]; maybeStartPlay(state, now); }
        if (away && phase === 'play') {
          const b = bookHeldBy(state, num);
          if (b >= 0 && !state.submissions[b]) state.submissions[b] = { kind: taskKind(state, b), by: num, skipped: true };
          completeStep(state, now);
        }
        return '';
      }
      case 'pause': {
        if (actor !== 0 || !['word', 'play'].includes(phase)) return 'not_available';
        if (!state.paused) { state.paused = true; state.pausedAt = now; }
        return '';
      }
      case 'resume': {
        if (actor !== 0) return 'not_available';
        if (!state.paused) return '';
        if (state.deadline > 0 && Number.isFinite(state.pausedAt)) state.deadline += Math.max(0, now - state.pausedAt);
        state.paused = false; state.pausedAt = null;
        if (phase === 'word') maybeStartPlay(state, now);
        else if (phase === 'play') completeStep(state, now);
        return '';
      }
      case 'revealNext': {
        if (phase !== 'reveal' || !canPresent(state, actor)) return 'not_available';
        if (Number(input.book) !== state.reveal.book || Number(input.shown) !== state.reveal.shown || state.reveal.complete) return '';
        const total = state.books[state.reveal.book].pages.length;
        if (input.all === true || state.reveal.shown + 1 >= total) completeBook(state);
        else state.reveal.shown++;
        return '';
      }
      case 'award': {
        if (!['reveal', 'finished'].includes(phase) || state.settings.scoring === 'none') return 'not_available';
        const b = Number(input.book), book = state.books[b], awards = state.awards[b];
        if (!book || !awards) return 'not_available';
        // The current presenter decides; after the last book only the host may correct.
        if (phase === 'reveal' ? b !== state.reveal.book || !canPresent(state, actor) : actor !== 0) return 'not_available';
        const page = Number(input.page), target = book.pages[page];
        if (input.field === 'sketch' || input.field === 'guess') {
          if (state.settings.scoring !== 'friendly' || !target || target.skipped || target.kind !== input.field || page < 1 || target.by === book.owner) return 'not_available';
          awards[input.field] = awards[input.field] === page ? null : page;
        } else if (input.field === 'match') {
          if (state.settings.scoring !== 'competitive' || !target || target.skipped || target.kind !== 'guess' || typeof input.value !== 'boolean') return 'not_available';
          awards.matches[page] = input.value;
        } else if (input.field === 'final') {
          if (typeof input.value !== 'boolean' || finalGuess(book.pages) < 1) return 'not_available';
          awards.final = input.value;
        } else return 'not_available';
        if (phase === 'finished') finishScores(state);
        return '';
      }
      case 'nextBook': {
        if (phase !== 'reveal' || !canPresent(state, actor)) return 'not_available';
        if (Number(input.book) !== state.reveal.book) return '';
        if (!state.reveal.complete) return 'not_available';
        if (state.reveal.book + 1 >= state.books.length) { finish(state, now); return ''; }
        state.reveal = { book: state.reveal.book + 1, shown: 1, complete: false, startedAt: now }; state.turnId++;
        return '';
      }
      case 'nextRound': {
        if (actor !== 0 || phase !== 'finished') return 'not_available';
        state.totals = state.result?.totals || state.totals; state.round = (state.round || 1) + 1;
        freshRound(state, input); return '';
      }
      case 'stop': {
        if (actor !== 0 || phase === 'stopped') return 'not_available';
        state.phase = 'stopped'; state.turnId++; state.deadline = null; state.paused = false; state.pausedAt = null; return '';
      }
      default: return 'not_available';
    }
  }
  function finishScores(state) {
    const { points, reasons } = roundScores(state);
    state.result = { points, reasons, totals: Object.fromEntries(state.roster.map(p => [p.playerNum, (Number(state.totals?.[p.playerNum]) || 0) + points[p.playerNum]])) };
  }

  function acknowledge(state, actor, id, error) {
    state.replies ||= {}; state.seen ||= {}; state.receipts ||= {};
    state.seen[actor] = list(state.seen[actor]).filter(seenId => seenId !== id).concat(id).slice(-SEEN_LIMIT);
    state.replies[actor] = { id, error };
    // Different tabs for one seat may issue commands in the same host batch.
    // Keep each acknowledgment so the last reply cannot strand an older tab.
    state.receipts[actor] = list(state.receipts[actor]).filter(r => r.id !== id).concat({ id, error }).slice(-RECEIPT_LIMIT);
    return state;
  }
  function apply(state, input) {
    if (!state || !input || input.sessionId !== state.sessionId) return state;
    const actor = Number(input.actor), id = input.id;
    if (typeof id !== 'string' || id.length < 8 || id.length > 100 || !Number.isFinite(input.now)) return state;
    if (actor !== 0 && !player(state, actor)) return state;
    if (list(state.seen?.[actor]).includes(id)) {
      if (list(state.receipts?.[actor]).some(r => r.id === id)) return state;
      // Older games retained only 12 receipts while keeping 40 seen IDs.
      // Restore an acknowledgment without ever running the command again;
      // its outcome may be unavailable after the original reply was replaced.
      const oldReply = state.replies?.[actor];
      return acknowledge(copy(state), actor, id, oldReply?.id === id ? oldReply.error || '' : 'stale_turn');
    }
    if (TURN_TYPES.has(input.type) && Number(input.turnId) !== state.turnId) return acknowledge(copy(state), actor, id, 'stale_turn');
    const next = copy(state);
    const error = handle(next, { ...input, actor, now: Math.max(input.now, state.lastChangeAt || 0) });
    if (error) return acknowledge(copy(state), actor, id, error);
    next.lastChangeAt = Math.max(input.now, state.lastChangeAt || 0);
    return acknowledge(next, actor, id, '');
  }

  // ----- projections -----
  function pageView(state, page, index) {
    const out = { index, kind: page.kind, by: page.by, byName: nameOf(state, page.by) };
    if (page.skipped) out.skipped = true;
    else if (page.kind === 'sketch') out.art = page.art;
    else out.text = page.text;
    return out;
  }
  function statusOf(state, num) {
    if (!isActive(state, num)) return 'away';
    if (state.phase === 'word') return state.ready[num] ? 'ready' : 'choosing';
    if (state.phase !== 'play') return 'idle';
    const b = bookHeldBy(state, num);
    if (b < 0) return 'nextRound';
    const sub = state.submissions[b];
    if (sub?.skipped) return 'skipped';
    if (sub) return 'done';
    return taskKind(state, b) === 'sketch' ? 'drawing' : 'guessing';
  }
  function scoreRows(state) {
    if (!state.result) return null;
    return state.roster.map(p => ({ playerNum: p.playerNum, name: p.name, round: state.result.points[p.playerNum] || 0,
      total: state.result.totals[p.playerNum] || 0, reasons: list(state.result.reasons?.[p.playerNum]).map(r => r.type) }));
  }
  function view(state, actor = 0, now = Date.now()) {
    actor = Number(actor) || 0;
    const relay = {
      version: 1, sessionId: state.sessionId, turnId: state.turnId, round: state.round, phase: state.phase,
      settings: { ...state.settings }, die: state.die, step: state.step, steps: state.steps,
      roster: state.roster.map(p => ({ playerNum: p.playerNum, name: p.name, active: p.active !== false, status: statusOf(state, p.playerNum) })),
      paused: state.paused === true, deadline: state.phase === 'play' ? state.deadline : null,
      pausedRemainingMs: state.paused && state.deadline > 0 ? Math.max(0, state.deadline - (Number.isFinite(state.pausedAt) ? state.pausedAt : now)) : null,
      graceMs: AUTO_SKIP_GRACE_MS,
    };
    if (['play', 'reveal', 'finished'].includes(state.phase)) relay.circle = circleOf(state).slice();
    if (state.phase === 'play') {
      const counts = { sketch: 0, guess: 0 }; let done = 0;
      state.books.forEach((_, b) => {
        const sub = state.submissions[b];
        if (sub) done++; else counts[taskKind(state, b)]++;
      });
      relay.progress = { done, total: state.books.length, drawing: counts.sketch, guessing: counts.guess };
    }
    if (state.phase === 'word') relay.progress = { done: activeNums(state).filter(n => state.ready[n]).length, total: activeNums(state).length };
    if (state.reveal && state.phase === 'reveal') {
      const b = state.reveal.book, book = state.books[b];
      relay.reveal = { book: b, books: state.books.length, owner: book.owner, ownerName: nameOf(state, book.owner), shown: state.reveal.shown,
        total: book.pages.length, complete: !!state.reveal.complete,
        pages: book.pages.slice(0, state.reveal.shown).map((page, i) => pageView(state, page, i)),
        awards: state.reveal.complete ? copy(state.awards[b] || null) : null };
      if (relay.reveal.awards) relay.reveal.awards.matches = Object.entries(relay.reveal.awards.matches || {}).map(([page, value]) => ({ page: Number(page), value }));
      relay.reveal.canPresent = canPresent(state, actor);
    }
    // Points exist only once every sketchbook has been shown.
    if (state.phase === 'finished') relay.scores = scoreRows(state);
    const me = actor > 0 ? player(state, actor) : null;
    if (me) {
      const own = state.books.find(b => b.owner === actor);
      const mine = { away: me.active === false };
      if (state.phase === 'word') Object.assign(mine, { card: own.card.slice(), wordIndex: own.wordIndex, ready: state.ready[actor] === true, swapsLeft: MAX_SWAPS - (Number(state.swaps[actor]) || 0) });
      if (own && state.phase !== 'word') mine.word = own.pages[0]?.text || own.card[own.wordIndex];
      if (state.phase === 'play' && !inCircle(state, actor)) mine.nextRound = true;
      else if (state.phase === 'play') {
        const b = bookHeldBy(state, actor), book = state.books[b], sub = state.submissions[b];
        const last = lastReal(book.pages), prompt = book.pages[last];
        const passTo = nextInCircle(state, actor);
        mine.task = { book: b, owner: book.owner, ownerName: nameOf(state, book.owner), own: book.owner === actor,
          kind: taskKind(state, b), page: book.pages.length, passTo, passToName: nameOf(state, passTo),
          prompt: { ...pageView(state, prompt, last), skippedBefore: last < book.pages.length - 1 } };
        if (sub?.skipped) mine.task.skipped = true;
        else if (sub) mine.task.submitted = sub.kind === 'sketch' ? { kind: 'sketch', art: sub.art } : { kind: 'guess', text: sub.text };
        else if (state.drafts?.[b]) mine.task.draft = { art: state.drafts[b].art };
      }
      if (state.phase === 'finished' && own) mine.book = own.pages.map((page, i) => pageView(state, page, i));
      relay.me = mine;
      const reply = state.replies?.[actor];
      if (reply) relay.reply = { id: reply.id, error: reply.error || '' };
      if (state.receipts?.[actor]) relay.receipts = list(state.receipts[actor]).map(r => ({ id: r.id, error: r.error || '' }));
    }
    return { game: 'sketchrelay', ...(me ? { playerNum: actor, name: me.name } : {}), relay };
  }

  return Object.freeze({
    MIN_PLAYERS, MAX_PLAYERS, CARD_SIZE, MAX_SWAPS, DECKS, TIMERS, SCORING, GUESS_MAX, AUTO_SKIP_GRACE_MS,
    create, apply, view, normalize, sameWords, roundScores, holderOf, bookHeldBy, circleOf, taskKind, sourceText, finalGuess, validSettings, cleanText,
  });
});
