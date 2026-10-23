# WHO KNOWS? — one secret word, two modes

One player secretly picks a word. Everyone else finds it with spoken yes-or-no
questions. Someone else already knows the word. WHO KNOWS? puts two versions of
this idea in one game, played on the existing room and original player links:

| | Insider mode (default) | Werewolf mode |
|---|---|---|
| Answerer | **Master** (public) | **Mayor** (public) |
| Answers | Yes / No / I don't know / Correct | Yes / No / Maybe / So close / Way off / Correct |
| Hidden roles | 1 **Insider** (knows the word), the rest **Commons** | 1 **Seer** + 1–2 **Werewolves** (both know the word), the rest **Villagers** |
| Word found | speaking turns → judge the guesser → vote | Werewolves are revealed and hunt the Seer |
| Word not found | everyone loses, or speaking turns → Master's one guess (option) | speaking turns → everyone votes to find a Werewolf |

The mechanics are adapted from the party games known as Insider (Oink Games,
2016) and Werewords (Bézier Games, 2017). Names, art, words and wording here are
original; neither title is used as the game name. Players need 4–9 seats.

## Entry and files

`index.html` lists WHO KNOWS? right after Bomb Relay (before BLUFF PARTY, whose
last-four order is locked by tests). `who-knows.html` is the shared host screen.
Original player links open `play.html`. Its `whoknows` branch follows the
game's table with `WHO_KNOWS_SYNC.Table` and mounts `WHO_KNOWS_UI.Card` in
table mode, so play.html loads the words, engine, sync and UI modules.

- `who-knows-words.js` — 300 bilingual guessable words: easy 120, medium 120,
  hard 60, stable ids `wk-e001`…, categories for future filtering.
- `who-knows-engine.js` — pure rules: create/apply/view, no DOM or Firebase.
- `who-knows-sync.js` — the card-run table: `Table` (every card and the host
  page) and `HostTable` (start, pointers, Hub renames, room checks).
- `who-knows-ui.js` — bilingual dictionary, original flat SVG role art, shared
  stage renderer and the player Card.
- `who-knows-host.js`, `who-knows.html`, `who-knows.css` — host page and the
  scoped moonlit design (also used by the card page via `body.wk-card-page`).
- `assets/who-knows/mark.svg` — Hub and header mark.
- Cache tag `wk-3` on every WHO KNOWS asset in both entry pages.

## Round flow

1. **Choose.** The answerer rotates fairly: everyone answers once before anyone
   answers twice, never twice in a row; any player may name the next answerer.
   Their card offers three words (Mixed = one easy, one medium, one hard) and up
   to 10 rerolls. Words used in this room are not offered again until a level
   runs out. Every other card shows its secret role; the shared screen shows only
   the public role counts.
2. **Countdown** 5 s (anyone can start now from Table controls).
3. **Questions** (Insider 5 min, Werewolf 4 min by default; 3/4/5/6/8). Players
   ask out loud. Tapping 🙋 on a card joins one shared line; an optional typed
   question (≤80 characters, markup and control characters removed) shows on the
   shared screen. The answerer taps a token for whoever is at the front. Voices
   overlap, so the answerer can also make any other player the asker
   ("Someone else said it?") or skip. **Correct** takes two taps (5 s window).
   Werewolf mode has a Yes/No budget (36 default; 20/30/36/no limit) — when it
   runs out the questions end. Every answer is logged against its asker on every
   screen, like the physical tokens.
4. After a correct guess the word is public (it was said aloud).
   - Insider: everyone, including the Master and guesser, gets a speaking turn, then
     everyone except the guesser judges “is the guesser the Insider?” (30 s). A
     majority Yes reveals the guesser. Otherwise everyone votes for a suspect
     (45 s, the answerer cannot be chosen); the most votes is revealed and a tie
     is broken by the guesser's own vote, if it went to a tied player.
   - Werewolf: the Werewolves are revealed and have 30 s (15 s in the box; longer
     here for tapping cards online) to pick the Seer. As in the published Deluxe
     rules, each Werewolf may pick a different player; any correct pick wins.
5. If the word is not found:
   - Insider: everyone loses, or (default on) everyone except the Master gets a
     speaking turn before the Master gets one 30 s guess at the Insider.
   - Werewolf: everyone, including the Mayor, gets a speaking turn before a
     45 s vote for a Werewolf. The most-voted player(s) are
     revealed only with at least two votes; a Werewolf among them is caught.
6. **Result** reveals every role, the word, ballots and points on every screen.
   Any active player (or the host) starts the next round.

Speaking turns use one shuffled order saved on the canonical table. Each player
gets 20, 25 or 30 seconds (default 25, a next-round setting captured when the
round starts), a small clock and “I'm done” on their own card. The clock or
“Next speaker” passes the floor once; skipping all remaining turns takes two
taps. Sitting out the speaker advances the floor; returning does not add a new
turn. Pause/Resume and time extensions keep working. A paused speaker leaving
does not resume the clock. No answer recognition or new question-time queue
is involved. If the word was not found it stays private during the turns.

Scores add up across rounds: Commons win (Insider caught, or the Master's guess)
→ the Master and every Common +1; the Insider escapes → +3. Word found and Seer
safe → every villager +2, the Seer +1 more; a Werewolf caught in the vote →
villagers +1; Werewolves win → +2 each. A cancelled round scores nothing.
Werewolf mode by default keeps the Mayor an honest Villager; the advanced option
deals the Mayor a secret role too (a Werewolf Mayor may give misleading tokens).
Werewolves: auto = 2 from 7 active players, otherwise 1; “2” needs 6 players.

## Authority and privacy — no page has to stay open

The host page is needed only to start (or restart) WHO KNOWS? on the room's
links. After that the players' cards run the game; the host page is an optional
shared screen and can be closed or reopened at any time.

- The canonical state (word and roles included) lives in one table node,
  `rooms/{code}/players/{whoKnowsControlToken}/stateJson`. Start writes a pointer
  to every original link: `{ game:'whoknows', playerNum, name,
  wk:{ version:2, table } }`. Pointers carry no state, word or role.
- Every card subscribes to the table and renders `view(state, n)` for its own
  seat. A card applies its own command with one compare-and-set transaction on
  `stateJson`, fenced to the `sessionId` and `stage` it showed: two taps can
  never both win (the other gets “things moved on”), and nobody relays them.
  Each command carries its own captured time and seed, so a retried transaction
  computes the same result.
- Speaking advances additionally carry a round/turn token. A stale “I'm done”,
  “Next speaker” or skip-all action cannot advance the following speaker; each
  new speaker increments the stage and uses the existing absolute clock. A
  reconnect reads that deadline rather than restarting a turn. Saved older
  `discuss` or 90 s `accuse` rounds keep their current deadline and flow.
- The clock: deadlines are absolute, server-corrected times. Each client checks
  every 250 ms. Presence (`table/presence/{client}`, removed on disconnect) ranks
  who ticks an expired clock: the host page if open, then the lowest-numbered
  visible card, then others 0.9 s apart; a card in the background waits behind
  visible ones. A tick is a fenced command, so extra ticks are no-ops. Pause
  keeps at least 3 s.
- Any active player has the host's powers from their card (see below); only the
  Hub rename stays with the host page. Someone sitting out can only bring
  themselves back.
- `view(state, 0)` (shared screen) never contains the word before the guess, the
  three options, or any seat→role pair; each card's screen shows only its own
  role, its Werewolf teammates and the word if its role knows it.
- **Trade-off (no server):** every participating card can read the table node.
  No screen shows another player's secret, but a player using developer tools
  could. Player tokens are never shared, so other games keep their privacy. The
  previous version had the same exposure for the host's browser; full secrecy
  would need the independent game service, which must be deployed from the
  service's own project.
- Host page: reopened anywhere, it follows the table its links point at (even
  without the saved token). If another game borrows a link it shows
  `switched` with “Bring every card back to this game” (same game continues) or
  Start (new game). A saved game for a different number of seats is never reused
  (`rosterChanged`). Names edited in the Hub follow in (`rename`), keeping seats,
  scores and secrets. Links still showing an older lease-host view of the same
  session are migrated to pointers automatically; an older host page that sees
  pointers suspends itself.
- Firebase drops empty arrays; canonical state is JSON text and the UI reads
  views through `list()`.

## Table controls (every active card) and the host page

Every active player's card has a folded **Table controls** panel: Pause/Resume,
+1 min (questions) / +30 s, close the current phase (two taps when it ends the
questions or a vote), sit a player out (two taps) or back in, choose the next
answerer, settings for the next round (mode, time, difficulty, tokens, wolves,
advanced options), cancel this round (two taps), restart with scores at 0 (two
taps) and end the game (two taps). A paused card also shows Resume; a card
sitting out shows “I'm back”; the final standings show “Start a new game”. The
answerer leaving during choose/countdown/questions cancels the round; a voter
leaving completes the ballot.

The host page keeps the same controls in its own dialog. `who-knows.html?demo=1`
runs a whole game on one device with a switchable card view and no Firebase.

## Validation

- `node --test tests/who-knows-*.test.cjs` — engine (29), sync (11) and
  integration (6): roles, rotation, options/history, privacy of the shared
  screen and non-knowers, line/answers/tokens, every ending, pause/extend,
  shared table permissions, card-run rounds with the host page closed, CAS
  races, tick ranking, sit-out/self-return, settings, restart/end, host
  adoption, borrowed links, roster change, rename, migration, page wiring and
  complete EN/ZH strings. Speaking checks also cover each ending's eligibility,
  command races, reconnects, round-setting snapshots and paused speaker removal.
- `node tests/who-knows-ui.browser.cjs <playwright>` with `WK_QA_MODE` and
  `WK_QA_PLAYERS` drives the real host page and original play.html links against
  an isolated Firebase-compatible fixture with a controlled clock (no external
  network, no live room). The host page is closed right after Start; the cards
  then play every phase, keep the clock, pause/resume/extend, sit out and return,
  change next-round settings, let the question clock run out, end and restart.
  The host page is reopened as a viewer, adopts the table without its saved
  token and brings a borrowed link back. EN/ZH captures at 1280/390/320 with
  overflow, clipped-text, tap-target (≥44 px) and occlusion checks.
- Not verified here: real Firebase from this environment, physical phones and
  a human voice-session playtest.
