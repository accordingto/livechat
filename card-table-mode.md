# Card-run table — WORD LIMIT THEATER, ROOM SURVEY and WORD WOLF

These three games run on the same model as WHO KNOWS? (see who-knows-mode.md,
“Authority and privacy”), packaged once so new games can reuse it. The host
page only starts a game; after that the players' own cards run it. No page has
to stay open.

## Files

- `card-table.js` — `CARD_TABLE.define({ game, key, engine, extra, fields })`
  returns `Table` (every card and the host page) and `HostTable` (start,
  pointers, Hub renames, room checks, adopting a table, bringing borrowed links
  back). `fields` lists the command fields that may reach the rules.
- `card-table-ui.js` — `CARD_TABLE_UI`: shared bilingual strings (`ct`
  namespace), live countdowns/rings/cool-downs (`paintTimers`), the folded
  **Table controls** panel (`Controls`), the player `Card` base class, final
  standings and the optional host page controller (`host(spec)`, including the
  one-device `?demo=1`). A game's settings form receives the view
  (`settingsForm(settings, view)`) and may name what else it depends on
  (`settingsScope(view)`; WORD LIMIT THEATER no longer needs it since its
  points boxes are always 1–6). Shared error strings include `duplicate`,
  `taken` (kept for older tables; buzzing now queues) and `locked` for ROOM
  SURVEY's writing and buzzing.
- `card-table.css` — structure shared by all three games; each game styles itself
  through `--ct-*` tokens on its own page and card class.
- Cache tag `ct-2` on these three files in all three host pages and `play.html`;
  the games' own files use `wl-4`, `rs-3` and `ww-1` respectively.

## Authority

- Canonical state is JSON text in one table node:
  `rooms/{code}/players/{token}/stateJson`, with `.../presence/{client}`
  beside it. Each game has its own room-session token: `wordLimitControlToken`,
  `roomSurveyControlToken` or `wordWolfControlToken`; they never share a table.
- Start writes a pointer to every original link and nothing else:
  `{ game: 'wordlimit', playerNum, name, wl: { version: 1, table } }`,
  `{ game: 'roomsurvey', playerNum, name, rs: { version: 1, table } }` or
  `{ game: 'wordwolf', playerNum, name, ww: { version: 1, table } }`.
  `play.html` follows a pointer only when `table` is a 32-hex token.
- Every card renders `ENGINE.view(state, ownSeat)` and applies its own command
  with one compare-and-set transaction, fenced to the `sessionId` and `stage`
  it showed. Compare-and-set retries merge compatible simultaneous commands
  (for example private ballots); a changed stage rejects stale input. Each
  command carries its own time and seed, so a retried transaction gives the
  same result; repeated command ids are ignored.
- Timed games: deadlines are absolute, server-corrected. Every client checks every
  250 ms; presence ranks who ticks first (host page if open, then the lowest
  visible card, others 0.9 s apart, background cards last). Ticks are fenced
  commands, so extra ticks change nothing and idle ticks write nothing.
  WORD WOLF is untimed: its `deadline` is null and `TIMED` is empty; the
  shared pulse creates no artificial timer or automatic progression for it.
- Host page (optional): reopened anywhere it adopts the table its links point
  at; if another game borrows a link it offers “Bring every card back to this
  game”; a saved game for a different number of seats is never shown
  (`rosterChanged`); Hub renames follow into the running game. Only the Hub
  rename is host-page-only.

## Table controls (every active card, and the host page)

Pause/Resume, add time, end the current phase (two taps where it would cut a
writing phase, a scene or a guessing round short), sit a player out (two
taps) or back in, next-round settings, cancel this round, restart with scores at
0 and end the game (two taps each). Each game exposes only applicable actions:
WORD WOLF has pause/phase end but no add-time action or cumulative scores.
ROOM SURVEY adds “Make next Keeper”. A
paused card shows Resume, a card sitting out shows “I'm back”, the final
standings show “Start a new game”.

## WORD LIMIT THEATER — speaking turns (2026-10-26)

The canonical round now saves `speakingOrder`, `speaker` and `speakingTurn`.
One random order is dealt for the scene; accepted **I said a line** actions
score only the current speaker and move to the next active actor, wrapping
through the same order. The current and next speakers appear on cards and the
shared stage. Listeners see a waiting cue instead of a scoring button. The
original line cooldown remains, and stage/turn fences prevent a delayed or
double tap from scoring again or skipping an actor. Moving speakers does not
reset the scene clock or scheduled limit swaps. A speaker sat out is skipped;
legacy saves missing speaking fields acquire a stable order on normalization.

New deals and swaps draw limits 1–6 with relative weights
`[22, 22, 20, 18, 13, 5]`. Limits 1–5 may repeat across players; 6 is optional
and at most one is newly assigned to the cast. Drawing order is shuffled to
avoid giving a fixed seat first access to that rare slot. Each seat's previous
limit is excluded when drawing, so these weights are conditional rather than
a promise of fixed independent percentages. Swaps reserve an inactive seat's
existing six-or-longer limit so rejoining cannot introduce a second long slot.
Legacy 7–10 saved limits/points remain readable, while new draws stay 1–6.
Timing, scheduled swaps, foul rules, manually reported line scoring and point
settings retain their existing behavior. Compact cards lead with the current
speaker, own limit/role, scene and current action; detailed cast/points and
fouls are in the lower optional panel. See `word-limit-mode.md`.

## WORD WOLF — the third card-run game (2026-10-26)

The real Hub entry is `word-wolf.html`, using `word-wolf-{content,art,engine,ui,host}.js`
and the original `play.html` cards. It restores 80 original bilingual pairs,
defaults to 21 object pairs with 42 original SVG illustrations, and supports
3–9 players. Exactly one gets a different related card; nobody is told their
affiliation before the result. Describing and optional random Pick circles
are untimed. Voting hides each target until reveal, forbids self-votes and
allows changes until the final ballot automatically reveals. Existing phase
end controls can reveal earlier after at least one ballot; highest-vote ties
have no winner. There are no cumulative scores. Next explicitly deals a fresh
pair, retaining pair memory across Restart. Sitting out any in-round seat
cancels the round consistently; pause/reconnect preserves it. The host may
close after Start, and a reopened host adopts the same table. Full content,
history, UI and trust-boundary details: [word-wolf-mode.md](word-wolf-mode.md).

## Privacy trade-off (no server)

Every participating card can read the table node. No screen shows another
player's unrevealed secret (ROOM SURVEY's hidden answers/writers, WORD WOLF's
other item, affiliation and ballots), but a player
using developer tools could read them. Player tokens are never shared, so other
games keep their privacy. Full secrecy would need the independent game service.
This is the same trade-off as WHO KNOWS?.

## Validation

- `node --test tests/card-table.test.cjs` — both games through the real
  `CARD_TABLE` against a Firebase-like tree: pointers, cards playing whole
  rounds with the host page closed, CAS races, tick ranking, table controls,
  adoption, borrowed links, roster change, rename, refresh/offline.
- `node --test tests/card-table-integration.test.cjs` — page wiring, cache
  tags, Hub order, play.html branch, complete EN/ZH strings, local fonts and
  licences, shared screens never showing a hidden answer.
- `node --test tests/word-wolf-*.test.cjs` — the third game's bank/art,
  authoritative deals, privacy, voting, untimed lifecycle and page wiring.
- `node tests/card-table-ui.browser.cjs <playwright>` with
  `CT_QA_GAME=wordlimit|roomsurvey` and `CT_QA_PLAYERS` drives the real host
  page and original play.html links on an isolated Firebase-compatible fixture
  with a controlled clock (external network intercepted, no live room). The
  host page is closed right after Start. Captures EN/ZH at 1280/390/320 with
  overflow, clipped-text, tap-target (≥44 px), occlusion and rendered text
  contrast (glyph pixels against what is really behind them; 4.5:1, 3:1 for
  large text) checks; findings are collected and fail the run at the end.
  Text under a transient fixed toast, including its drop shadow, is not judged.
- `node tests/word-wolf-ui.browser.cjs <playwright>` with `WW_QA_PLAYERS=4|9`
  separately drives the actual WORD WOLF host and original cards against
  isolated compare-and-set transport, including concurrent ballots, reconnect,
  adoption and switch cleanup. Final runs passed 12 flows/72 captures per
  count, EN/ZH at 1280/390/320, zero page errors/layout findings and zero
  remaining presence. This fixture checks mobile 44px button/summary/select
  targets and action occlusion; it does not perform the other fixture's
  rendered-glyph contrast test. Neither fixture establishes physical-device
  coverage or a production Firebase deployment; use ownership-checked fresh
  nodes for separate live verification.
