# WORD LIMIT THEATER — act one scene, every line exactly your limit

A spoken improv game for 2–9 players on the existing room and original player
links. Everyone draws a role in one scene and a line limit from 1 to 6. Players
take turns in one saved order; each line must contain exactly the actor's
limit of English words or Chinese characters. Limits of 1–5 are common and
may repeat across players; six is occasional. After speaking, the current
actor taps **Line done · next actor** on their own card, scores the points of
their current limit and passes the floor. Points default to one per word;
every limit's points remain configurable. Limits redraw a few times during
the scene. There is one scene clock and no individual speaking countdown.

The exercise is the classic improv game of limited words per line; the user's
reference was a short video of it. Every scene, role and word of copy here is
original. Nothing in this game is secret: roles, limits and points are public so
anyone can catch a foul.

2026-10-24 revision (user request): the MVP vote and the plot twists are gone
(the vote added pressure; the twists were removed for now — the 40 twist cards
stay in the content file, unused, so they can come back); limits swap 3 times
per scene by default instead of once; scoring is the self-reported line.

2026-10-26 revision (user request): replaces the distinct 1–6 bag with weighted
short limits that may repeat, and adds a synchronized speaking order. The
earlier ladder and distinct-bag policies are historical, not the current
draw policy. The scene, role content, self-reported scoring, swaps and foul
rules stay in the existing game.

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
- Cache tag `wl-4` (game) and `ct-2` (shared table) in both entry pages.

## Limit draw policy

`WORD_LIMIT_ENGINE.CONFIG.dealValues` is 1–6, with base weights
`dealWeights = [22, 22, 20, 18, 13, 5]` respectively. Values 1–5 draw with
replacement, so several players can hold the same short limit. A new cast or
swap may contain no six and contains at most one six. Seat draw order is
shuffled before weighting, so an earlier seat does not reserve that slot.
The previous limit is excluded for each actor; remaining weights are
renormalized. Once six is drawn it is removed from the other actors' choices.
These are conditional weights, not a promise that exactly 5% of all assigned
limits are six. No current draw assigns 7–10.

A swap preserves an inactive actor's existing limit. If that actor holds six
(or an older saved long limit), the draw reserves the long slot so returning
cannot introduce a second newly drawn six. Rerolling the scene redraws the
scene and roles and restores reading time; it does not independently redraw
the limits or the saved speaking order.

## Round flow

1. **Cast** (20 s). Each card shows its own role and limit on a big letterboard;
   every card and the shared screen list the whole cast with limits, and the
   shared screen shows what a line at each dealt limit scores. Any player can
   start early or draw a different scene (5 per round). The roles are the
   scene's first N roles dealt at random. Limits follow the weighted policy
   above, excluding each actor's previous-scene limit. One shuffled
   `speakingOrder` is saved when the scene is dealt; the cast screen identifies
   who will start.
2. **Scene** (2/3/4/5 min, default 3) on a stopwatch, so a pause never loses
   time or swaps. The limits swap 0/1/2/3/4 times (default 3), spread evenly
   (3 in 3 minutes: at 0:45, 1:30, 2:15); each swap gives everyone still playing
   a weighted 1–6 limit, never the one they held (“was N” shows for a few
   seconds), and
   cards and the shared screen count down to the next swap. Only the current
   speaker has **Line done · next actor** (3 s cool-down, own seat only): it
   scores the points of the limit they hold at that moment, shows as “+N” on every card and
   counts in the live standings at once, then advances once to the next active
   actor in the saved circular order. The scene clock and swap schedule keep
   running throughout a turn and are not restarted by the handoff. Anyone may
   tap **Foul** on another player who broke their limit (no penalty, just a count and a “Foul on you!”
   banner; 2.5 s per caller and target).
3. **Result** straight after the scene: points and lines per actor, the top
   scorer in the spotlight, the fouls. The scene's points join the scores now;
   a cancelled scene scores nothing; ending the game mid-scene keeps the lines
   already said. Any player starts the next scene.

Settings (setup and Table controls, from the next scene): length, unit, swaps
per scene and the points of each limit 1–6 (0–50; points an earlier table
saved for 7–10 are kept, unused). The shared screen's legend lists all six.
Units default to the host's reading language (English → words,
Chinese → characters). The table remembers up to 30 scenes, also across
Restart, so they don't repeat soon.

A table saved by the earlier version keeps working: old settings read as
today's (an old “shuffle off” is no swaps; twist and vote options are dropped),
an old scripted twist is skipped, a scene dealt from the old ladder keeps its
limits (its next swap uses today's weighted 1–6 policy), and an old MVP vote
just runs out into the result (votes no longer score). Missing speaking fields
are filled from the existing round roster, without redrawing limits, resetting
scores, clearing scene memory or restarting a live deadline.

## Authority, turns and card layout

The shared `CARD_TABLE` adapter stores one canonical JSON state at
`rooms/{code}/players/{wordLimitControlToken}/stateJson`. Each original
`play.html` link follows its pointer to that table. Every card renders its own
projection; none independently chooses a speaking order or limit. The optional
host page can close after Start, and the cards continue the same clock and game.
See card-table-mode.md for the existing transaction, presence and tick model.

The round owns `speakingOrder`, `speaker` and a monotonically increasing
`speakingTurn`. Only that active speaker may score a line. The actual card
command includes `speakingTurn`; session/stage fences, command idempotency and
the turn check reject replays, races and a stale tap after the floor has moved.
One accepted line scores once and advances once, including a double click.
Pause, swaps and reloading keep the same floor and global scene time. Sitting
out the speaker advances once without adding points; sitting out another actor
does not move the floor. Returning an actor joins their place in the saved
cycle, and a change while paused does not resume the scene clock. Settings
capture scene duration, units, swap count and point values for the next scene.

Cards place the current/next speaker and scene clock, the player's own role
and large limit, a short scene brief and the current action first. Waiting
actors retain their own role and limit but have no other actor's scoring
button. **Cast & scene details** below folds the personal scene totals, swap timer,
point legend, complete cast, foul controls and standings into a secondary area;
the open state survives ordinary rerenders. Existing Table controls remain
lower down. This is a spoken game: there is no microphone API, recognition,
automatic word counter or AI referee.

## Validation

- Engine (21), card UI (4), shared table (9) and shared integration (7) tests
  pass **41/41**, run with `node --test tests/word-limit-engine.test.cjs
  tests/word-limit-ui.test.cjs tests/card-table.test.cjs
  tests/card-table-integration.test.cjs`. They cover content, weighted short
  repeated limits and the six cap, no-repeat redraws, inactive long-slot
  reservation, 2–9-player circular turns, one-score/one-handoff races and stale
  tokens, late taps, pause/swaps/reconnect, speaker/non-speaker sit-out, legacy
  migration, unchanged scene clocks and memory, scoring, settings, fouls,
  cancellation, permissions, projections, wiring and the card hierarchy.
- `tests/card-table-ui.browser.cjs` with `CT_QA_GAME=wordlimit` drives the real
  `word-limit-theater.html` and original `play.html` pages against an isolated
  Firebase-compatible fixture. Four and nine players each passed **20 checks
  and 72 captures** (40 checks, 144 captures total), with no page errors,
  overflow, clipped text, contrast or action-target findings. EN/ZH phone
  viewports include 390 and 320 pixels; host captures also include 1280 pixels.
  The host closes after Start; cards
  play a full saved-order circuit, double click scores once, and a reloaded
  current actor retains floor, score, limits, scene deadline and one presence.
  Pause, swaps, sit-out and the existing table flows are also exercised.
  Reports are outside the public Hub in `wl-turns-browser-final-4/report.json`
  and `wl-turns-browser-final-9/report.json`; final 320-pixel cards were also
  visually inspected. Existing Room Survey's three-player core regression
  separately passed 24 checks.
- `scripts/conversation-cards-production.browser.cjs` passes **78 offline safety
  checks** and a separate **99-check combined production run** with Word Wolf
  and Who Knows. Four real original links complete one speaking circuit after
  the host disconnects/closes; only the current speaker scores, the scene
  deadline never resets, reload preserves floor/score/deadline and one presence,
  and card End works before switching games. Real SDK/clock, language-asserted
  English/Chinese phone captures; seven new nodes conditionally deleted with
  zero final cleanup failures. The initial run/recovery and finite coverage are
  detailed in [release acceptance](docs/conversation-cards-2026-10-26-acceptance.md).
  Physical phones and a human spoken-session playtest remain unverified.
