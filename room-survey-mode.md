# ROOM SURVEY — the room is the survey

A spoken guessing game for 3–9 players on the existing room and original player
links, after the street-survey segments on variety TV (the user pointed to
Running Man): a fun, open prompt is answered by many people, the answers are
ranked by how many gave them, and players try to name the top answers. Here the
room writes the answers itself, so every guess is about the people in the call.
Prompts and wording are original.

2026-10-24 revision (user request): guessing is a buzz-in like Say It Without
Saying It instead of fixed turns; the same answer may not be written in two of
one player's boxes; merging is called stacking, and the Keeper's table shows the
rank and worth each stack would get; every tile shows what a hit is worth.
Scoring stays one point per writer, which already rises with the rank (the
board is ranked by the number of writers); it is now shown on each tile.

Second 2026-10-24 revision (user request): buzzing while someone else is
answering joins a line instead of being refused, so nobody has to rush. When
the answer ends (hit, miss, give-up, timeout, or the buzzer leaving) the first
in line answers at once with a fresh answer clock. A locked player cannot join
the line; a player can leave it; a pause keeps it.

## Entry and files

`index.html` lists ROOM SURVEY last, after WORD LIMIT THEATER (👥 3–9).
`room-survey.html` is the optional host screen; original links open `play.html`,
whose card-table branch follows the game's table (see card-table-mode.md).

- `room-survey-content.js` — 98 bilingual prompts (`rs-<pack>-NN`) in seven packs:
  love, life, work & school, food, phone & internet, small secrets, what if. The
  user's examples are included (search history you'd hate your partner to see; a
  worry you only have after you start dating).
- `room-survey-engine.js` — pure rules: create/apply/view, no DOM or Firebase.
- `room-survey-ui.js` — bilingual strings, chalk tallies (正 in Chinese, five-bar
  gates in English), original flat SVG art, the shared board and the player
  Card; `SYNC` is its `CARD_TABLE` definition.
- `room-survey-host.js`, `room-survey.html`, `room-survey.css` — host page and the
  scoped “blackboard + paper slips + red stamp” design (also used by the card
  page through `body.rs-card-page`).
- `assets/room-survey/` — Hub/header mark and a self-hosted Latin subset of
  Patrick Hand with its SIL OFL licence.
- Cache tag `rs-2` (game) and `ct-2` (shared table) in both entry pages.

## Round flow

1. **Choose.** The Keeper rotates fairly (everyone keeps once before anyone keeps
   twice, never twice in a row; any player may name the next Keeper). Only the
   Keeper's card shows three prompts from the chosen pack (5 rerolls) or lets
   them write their own (≤100 characters, markup removed).
2. **Write** (60/90/120/180 s, default 90). Everyone, the Keeper included,
   privately writes 1–3 short answers (default 2, ≤40 characters each), a
   different one in each box: two boxes that are the same answer ignoring case,
   width and punctuation (“Keys” / “keys!”) are flagged on the card while
   typing, Send waits, and the rules refuse them (`duplicate`). Answers can be
   edited until time is up. Typed answers go in by themselves just before the
   end (a repeat is left out then rather than losing them all); when everyone
   has sent, the table moves on.
3. **Sort** (2 min, Keeper only). Answers that differ only in case, width or
   punctuation are already stacked. The Keeper stacks slips that mean the same
   thing (tap one, then its twin; the others show “Stack here”), unstacks, and
   can remove or restore a slip. The table lists the biggest stacks first with
   the rank and worth each would have on the board. Fewer than two different
   answers cancels the round.
4. **Guess** (3/4/5/6/8 min, default 4). The board is ranked by how many people
   wrote each answer (ties share a rank); each hidden tile shows its length and
   what a hit is worth. Any guesser buzzes in from their own card (“I've got
   one!”); the first one holds the buzz and says an answer out loud, with
   0/10/15/20/30 s to answer (default 15). Others who buzz meanwhile (“Get in
   line”) wait in buzz order; cards show “You're next” / “You're #N in line” with
   “Leave the line”, and every screen shows who is in line. When an answer ends,
   the first in line holds the buzz with a fresh clock (a new buzz number, so a
   late Keeper tap can't judge them); during a pause their clock waits for
   Resume. The Keeper taps the
   tile and confirms, or taps “Not on the board”; the buzzer may give up. A hit
   scores **one point per person who wrote it** (higher on the board = more) and
   opens buzzing to everyone again. A miss, giving up or running out of time
   locks that buzzer until every other guesser has missed once too, then
   everyone is open again. The rules know the writers: an answer the buzzer
   wrote themselves **burns** (revealed, no points, buzzer locked), so nobody
   can repeat it for points. The Keeper can reveal a first letter as a hint at
   any time. The round ends when the board is clear, the clock runs out, no
   guesser is left, or a player ends it.
5. **Result**: every answer is revealed with the points; round points are added
   to the scores now. Who wrote what stays hidden unless the room turns on “show
   who wrote each answer” (off by default so people write freely).

The Keeper judges and does not guess. The Keeper leaving cancels the round; a
buzzer leaving passes the buzz down the line; leaving drops a player from it. Prompts used at the table are not offered again
soon (60 remembered, also across Restart). A table saved by the earlier version
in the middle of guessing drops its fixed turn and carries on with buzzing.

## Privacy

The shared screen (`view(state, 0)`) never contains a hidden answer or who wrote
it; a guesser's card gets only face-down tiles plus its own answers; the
Keeper's card shows the answers to judge them but never their writers. The
no-server trade-off in card-table-mode.md applies.

## Validation

`node --test tests/room-survey-engine.test.cjs` (14): content, Keeper rotation,
choosing/reroll/custom, writing (repeated answers refused) and auto-advance,
auto-stacking/stack/unstack/remove with rank preview, ranking and worth,
buzz-in (one holder, the line in buzz order with leave/locked/pause/leaving
and fresh clocks, locks and reopening, hits, burned own answers, give-up), answer and round clocks with pause, people leaving, privacy of the
shared screen and guessers, table controls and fencing, Chinese/English
normalisation and hints, tables saved by the earlier version. The shared table,
page wiring and browser checks are in card-table-mode.md.
