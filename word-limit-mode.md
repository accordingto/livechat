# WORD LIMIT THEATER — act one scene, every line exactly your limit

A spoken improv game for 2–9 players on the existing room and original player
links. Everyone draws a role in one scene and a line limit: every line they say
must be exactly that many English words (or Chinese characters). One actor can
only say “No!”, another has to fill eight words. Part-way through, a plot twist
lands and the limits swap. When the scene ends, everyone votes for an MVP.

The exercise is the classic improv game of limited words per line; the user's
reference was a short video of it. Every scene, role, twist and word of copy here
is original. Nothing in this game is secret: roles and limits are public so
anyone can catch a foul.

## Entry and files

`index.html` lists WORD LIMIT THEATER after Sketch Relay, second-to-last
(👥 2–9). `word-limit-theater.html` is the optional host screen; original links
open `play.html`, whose card-table branch follows the game's table (see
card-table-mode.md).

- `word-limit-content.js` — 36 bilingual scenes (`wl-s01`…`wl-s36`: a screenplay
  slug, a title, a one-line situation and 9 roles, each with what the character
  wants) and 40 bilingual twists (`wl-t01`…`wl-t40`). Simple English throughout.
- `word-limit-engine.js` — pure rules: create/apply/view, no DOM or Firebase.
- `word-limit-ui.js` — bilingual strings, original flat SVG art, the shared stage
  and the player Card; `SYNC` is its `CARD_TABLE` definition.
- `word-limit-host.js`, `word-limit-theater.html`, `word-limit-theater.css` —
  host page and the scoped “velvet curtain + felt letterboard” design (also used
  by the card page through `body.wl-card-page`).
- `assets/word-limit-theater/` — Hub/header mark and self-hosted Latin subsets
  of Anton and Courier Prime with their SIL OFL licences.
- Cache tag `wl-1` (game) and `ct-1` (shared table) in both entry pages.

## Round flow

1. **Cast** (20 s). Each card shows its own role and limit on a big letterboard;
   every card and the shared screen list the whole cast with limits. Any player
   can start early or draw a different scene (5 per round). The roles are the
   scene's first N roles dealt at random; limits come from a ladder by the number
   of players — 2: 1/4, 3: 1/2/5, 4: 1/2/3/6, 5: 1/2/3/4/7, 6: 1–5/8, 7: 1–6/9,
   8: 1–7/10, 9: 1–8/10 — dealt so nobody keeps last scene's limit if avoidable.
2. **Scene** (2/3/4/5 min, default 3) on a stopwatch, so a pause never loses
   time or events. Options (default on): a scripted twist at about a third, and a
   limit shuffle at about two-thirds in which everyone gets a different limit
   (“was N” shows for a few seconds). Anyone may drop more twists (15 s cool-down
   for the table) and tap **Foul** on another player who broke their limit (no
   penalty, just a count and a “Foul on you!” banner; 2.5 s per caller and
   target).
3. **Vote** (30 s, option, default on): secret ballots for the MVP, no voting for
   yourself, skipping allowed, changeable until it closes. Each vote is one point;
   ties share the MVP. With the vote off the scene ends straight on the result.
4. **Result**: MVP spotlight, who voted for whom, the fouls, and on the shared
   screen every twist in order. Any player starts the next scene.

Units default to the host's reading language (English → words, Chinese →
characters) and can be changed for the next scene. The table remembers up to 30
scenes and 30 twists, also across Restart, so they don't repeat soon.

## Validation

`node --test tests/word-limit-engine.test.cjs` (13): content, dealing and
ladders, reroll, stopwatch twist/shuffle with pause, manual twists, fouls and
cool-downs, secret ballots and MVP ties, vote off, clocks, table controls,
fencing and idempotency, projection, scene memory. The shared table, page wiring
and browser checks are in card-table-mode.md.
