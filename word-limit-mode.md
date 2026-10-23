# WORD LIMIT THEATER — act one scene, every line exactly your limit

A spoken improv game for 2–9 players on the existing room and original player
links. Everyone draws a role in one scene and a line limit: every line they say
must be exactly that many English words (or Chinese characters). One actor can
only say “No!”, another has to fill eight words. After each line the actor taps
**I said a line** on their own card and scores the points of their current
limit (by default one point per word, so longer limits score more; every
limit's points are a setting). The limits swap a few times during the scene.

The exercise is the classic improv game of limited words per line; the user's
reference was a short video of it. Every scene, role and word of copy here is
original. Nothing in this game is secret: roles, limits and points are public so
anyone can catch a foul.

2026-10-24 revision (user request): the MVP vote and the plot twists are gone
(the vote added pressure; the twists were removed for now — the 40 twist cards
stay in the content file, unused, so they can come back); limits swap 3 times
per scene by default instead of once; scoring is the self-reported line.

## Entry and files

`index.html` lists WORD LIMIT THEATER after Sketch Relay, second-to-last
(👥 2–9). `word-limit-theater.html` is the optional host screen; original links
open `play.html`, whose card-table branch follows the game's table (see
card-table-mode.md).

- `word-limit-content.js` — 36 bilingual scenes (`wl-s01`…`wl-s36`: a screenplay
  slug, a title, a one-line situation and 9 roles, each with what the character
  wants) and 40 bilingual twists (`wl-t01`…`wl-t40`, not used by the rules for
  now). Simple English throughout.
- `word-limit-engine.js` — pure rules: create/apply/view, no DOM or Firebase.
- `word-limit-ui.js` — bilingual strings, original flat SVG art, the shared stage
  and the player Card; `SYNC` is its `CARD_TABLE` definition.
- `word-limit-host.js`, `word-limit-theater.html`, `word-limit-theater.css` —
  host page and the scoped “velvet curtain + felt letterboard” design (also used
  by the card page through `body.wl-card-page`).
- `assets/word-limit-theater/` — Hub/header mark and self-hosted Latin subsets
  of Anton and Courier Prime with their SIL OFL licences.
- Cache tag `wl-2` (game) and `ct-2` (shared table) in both entry pages.

## Round flow

1. **Cast** (20 s). Each card shows its own role and limit on a big letterboard;
   every card and the shared screen list the whole cast with limits, and the
   shared screen shows what a line at each dealt limit scores. Any player can
   start early or draw a different scene (5 per round). The roles are the
   scene's first N roles dealt at random; limits come from a ladder by the number
   of players — 2: 1/4, 3: 1/2/5, 4: 1/2/3/6, 5: 1/2/3/4/7, 6: 1–5/8, 7: 1–6/9,
   8: 1–7/10, 9: 1–8/10 (mostly short, one long line for contrast; the user
   asked whether 4 players' jump to 6 was a bug — it is this ladder) — dealt so
   nobody keeps last scene's limit if avoidable.
2. **Scene** (2/3/4/5 min, default 3) on a stopwatch, so a pause never loses
   time or swaps. The limits swap 0/1/2/3/4 times (default 3), spread evenly
   (3 in 3 minutes: at 0:45, 1:30, 2:15); each swap gives everyone still playing
   a different limit from the same set (“was N” shows for a few seconds), and
   cards and the shared screen count down to the next swap. After each line the
   actor taps **I said a line** (3 s cool-down, own seat only): it scores the
   points of the limit they hold at that moment, shows as “+N” on every card and
   counts in the live standings at once. Anyone may tap **Foul** on another
   player who broke their limit (no penalty, just a count and a “Foul on you!”
   banner; 2.5 s per caller and target).
3. **Result** straight after the scene: points and lines per actor, the top
   scorer in the spotlight, the fouls. The scene's points join the scores now;
   a cancelled scene scores nothing; ending the game mid-scene keeps the lines
   already said. Any player starts the next scene.

Settings (setup and Table controls, from the next scene): length, unit, swaps
per scene and the points of each limit (0–50; the boxes show the limits a room
this size is dealt, e.g. 1/2/3/6 for four players; the others keep their
points). Units default to the host's reading language (English → words,
Chinese → characters). The table remembers up to 30 scenes, also across
Restart, so they don't repeat soon.

A table saved by the earlier version keeps working: old settings read as
today's (an old “shuffle off” is no swaps; twist and vote options are dropped),
an old scripted twist is skipped, and an old MVP vote just runs out into the
result (votes no longer score).

## Validation

`node --test tests/word-limit-engine.test.cjs` (14): content, dealing and
ladders, reroll, three evenly spread swaps with pause, the swap setting and its
earlier on/off form, line scoring by the current limit with cool-down and live
standings, the points table (partial changes, validation, next-scene effect),
fouls, cancelled/stopped scenes, table controls, fencing and idempotency,
projection, scene memory, tables saved by the earlier version. The shared table, page wiring
and browser checks are in card-table-mode.md.
