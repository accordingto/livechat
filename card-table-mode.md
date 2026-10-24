# Card-run table — shared by WORD LIMIT THEATER and ROOM SURVEY

Both games run on the same model as WHO KNOWS? (see who-knows-mode.md,
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
- `card-table.css` — structure shared by both games; each game styles itself
  through `--ct-*` tokens on its own page and card class.
- Cache tag `ct-2` on these three files in both host pages and `play.html`;
  the games' own files use `wl-3` and `rs-3`.

## Authority

- Canonical state is JSON text in one table node:
  `rooms/{code}/players/{token}/stateJson`, with `.../presence/{client}`
  beside it. The token is kept in the room session as `wordLimitControlToken`
  or `roomSurveyControlToken`, so the two games never share a table.
- Start writes a pointer to every original link and nothing else:
  `{ game: 'wordlimit', playerNum, name, wl: { version: 1, table } }` or
  `{ game: 'roomsurvey', playerNum, name, rs: { version: 1, table } }`.
  `play.html` follows a pointer only when `table` is a 32-hex token.
- Every card renders `ENGINE.view(state, ownSeat)` and applies its own command
  with one compare-and-set transaction, fenced to the `sessionId` and `stage`
  it showed. Two taps can never both win; the loser hears “the table moved on”.
  Each command carries its own time and seed, so a retried transaction gives
  the same result; repeated command ids are ignored.
- Clock: deadlines are absolute, server-corrected. Every client checks every
  250 ms; presence ranks who ticks first (host page if open, then the lowest
  visible card, others 0.9 s apart, background cards last). Ticks are fenced
  commands, so extra ticks change nothing and idle ticks write nothing.
- Host page (optional): reopened anywhere it adopts the table its links point
  at; if another game borrows a link it offers “Bring every card back to this
  game”; a saved game for a different number of seats is never shown
  (`rosterChanged`); Hub renames follow into the running game. Only the Hub
  rename is host-page-only.

## Table controls (every active card, and the host page)

Pause/Resume, add time, end the current phase (two taps where it would cut a
writing phase, a scene or a guessing round short), sit a player out (two
taps) or back in, next-round settings, cancel this round, restart with scores at
0 and end the game (two taps each). ROOM SURVEY adds “Make next Keeper”. A
paused card shows Resume, a card sitting out shows “I'm back”, the final
standings show “Start a new game”.

## Privacy trade-off (no server)

Every participating card can read the table node. No screen shows another
player's secret (ROOM SURVEY's hidden answers and their writers), but a player
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
- `node tests/card-table-ui.browser.cjs <playwright>` with
  `CT_QA_GAME=wordlimit|roomsurvey` and `CT_QA_PLAYERS` drives the real host
  page and original play.html links on an isolated Firebase-compatible fixture
  with a controlled clock (external network intercepted, no live room). The
  host page is closed right after Start. Captures EN/ZH at 1280/390/320 with
  overflow, clipped-text, tap-target (≥44 px), occlusion and rendered text
  contrast (glyph pixels against what is really behind them; 4.5:1, 3:1 for
  large text) checks; findings are collected and fail the run at the end.
  Text under a transient fixed toast, including its drop shadow, is not judged.
