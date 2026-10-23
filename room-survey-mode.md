# ROOM SURVEY — the room is the survey

A spoken guessing game for 3–9 players on the existing room and original player
links, after the street-survey segments on variety TV (the user pointed to
Running Man): a fun, open prompt is answered by many people, the answers are
ranked by how many gave them, and players try to name the top answers. Here the
room writes the answers itself, so every guess is about the people in the call.
Prompts and wording are original.

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
- Cache tag `rs-1` (game) and `ct-1` (shared table) in both entry pages.

## Round flow

1. **Choose.** The Keeper rotates fairly (everyone keeps once before anyone keeps
   twice, never twice in a row; any player may name the next Keeper). Only the
   Keeper's card shows three prompts from the chosen pack (5 rerolls) or lets
   them write their own (≤100 characters, markup removed).
2. **Write** (60/90/120/180 s, default 90). Everyone, the Keeper included,
   privately writes 1–3 short answers (default 2, ≤40 characters each) and can
   edit until time is up. Typed answers go in by themselves just before the end;
   when everyone has sent, the table moves on.
3. **Sort** (2 min, Keeper only). Answers that differ only in case, width or
   punctuation are already merged. The Keeper merges slips that mean the same
   thing (tap one, then its twin), splits a merge back, and can remove or restore
   a slip. Fewer than two different answers cancels the round.
4. **Guess** (3/4/5/6/8 min, default 4; optional turn clock 15/20/30 s, default
   20). The board is ranked by how many people wrote each answer (ties share a
   rank) and shows only the length of each hidden answer. Turns go round from
   after the Keeper. The guesser says an answer out loud; the Keeper taps the
   tile and confirms. A hit scores **one point per person who wrote it**;
   guessing an answer you wrote yourself **burns** it (revealed, no points). “Not
   on the board”, skip (Keeper or guesser) and running out of turn time pass the
   turn. The Keeper can reveal a first letter as a hint. The round ends when the
   board is clear, the clock runs out or a player ends it.
5. **Result**: every answer is revealed with the points; round points are added
   to the scores now. Who wrote what stays hidden unless the room turns on “show
   who wrote each answer” (off by default so people write freely).

The Keeper judges and does not guess. The Keeper leaving cancels the round; the
current guesser leaving passes their turn. Prompts used at the table are not
offered again soon (60 remembered, also across Restart).

## Privacy

The shared screen (`view(state, 0)`) never contains a hidden answer or who wrote
it; a guesser's card gets only face-down tiles plus its own answers; the
Keeper's card shows the answers to judge them but never their writers. The
no-server trade-off in card-table-mode.md applies.

## Validation

`node --test tests/room-survey-engine.test.cjs` (12): content, Keeper rotation,
choosing/reroll/custom, writing and auto-advance, auto-merge/merge/split/remove,
ranking, turn order, points per writer, burned own answers, turn and round
clocks, people leaving, privacy of the shared screen and guessers, table
controls and fencing, Chinese/English normalisation and hints. The shared table,
page wiring and browser checks are in card-table-mode.md.
