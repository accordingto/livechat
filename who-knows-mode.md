# WHO KNOWS? — one secret word, two modes

One player secretly picks a word. Everyone else finds it with spoken yes-or-no
questions. Someone else already knows the word. WHO KNOWS? puts two versions of
this idea in one game, played on the existing room and original player links:

| | Insider mode (default) | Werewolf mode |
|---|---|---|
| Answerer | **Master** (public) | **Mayor** (public) |
| Answers | Yes / No / I don't know / Correct | Yes / No / Maybe / So close / Way off / Correct |
| Hidden roles | 1 **Insider** (knows the word), the rest **Commons** | 1 **Seer** + 1–2 **Werewolves** (both know the word), the rest **Villagers** |
| Word found | discuss → judge the guesser → vote | Werewolves are revealed and hunt the Seer |
| Word not found | everyone loses, or the Master's one guess (option) | everyone votes to find a Werewolf |

The mechanics are adapted from the party games known as Insider (Oink Games,
2016) and Werewords (Bézier Games, 2017). Names, art, words and wording here are
original; neither title is used as the game name. Players need 4–9 seats.

## Entry and files

`index.html` lists WHO KNOWS? right after Bomb Relay (before BLUFF PARTY, whose
last-four order is locked by tests). `who-knows.html` is the shared host screen.
Original player links open `play.html`, whose `whoknows` branch mounts
`WHO_KNOWS_UI.Card`. Cards only render projections; they never load the words,
engine or sync modules.

- `who-knows-words.js` — 300 bilingual guessable words: easy 120, medium 120,
  hard 60, stable ids `wk-e001`…, categories for future filtering.
- `who-knows-engine.js` — pure rules: create/apply/view, no DOM or Firebase.
- `who-knows-sync.js` — trusted-host Firebase transport (Bomb Relay/CUT model).
- `who-knows-ui.js` — bilingual dictionary, original flat SVG role art, shared
  stage renderer and the player Card.
- `who-knows-host.js`, `who-knows.html`, `who-knows.css` — host page and the
  scoped moonlit design (also used by the card page via `body.wk-card-page`).
- `assets/who-knows/mark.svg` — Hub and header mark.
- Cache tag `wk-1` on every WHO KNOWS asset in both entry pages.

## Round flow

1. **Choose.** The answerer rotates fairly: everyone answers once before anyone
   answers twice, never twice in a row; the host may name the next answerer.
   Their card offers three words (Mixed = one easy, one medium, one hard) and up
   to 10 rerolls. Words used in this room are not offered again until a level
   runs out. Every other card shows its secret role; the shared screen shows only
   the public role counts.
2. **Countdown** 5 s (host can start now).
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
   - Insider: discussion lasts as long as the guessing took (30 s minimum), then
     everyone except the guesser judges “is the guesser the Insider?” (30 s). A
     majority Yes reveals the guesser. Otherwise everyone votes for a suspect
     (45 s, the answerer cannot be chosen); the most votes is revealed and a tie
     is broken by the guesser's own vote, if it went to a tied player.
   - Werewolf: the Werewolves are revealed and have 30 s (15 s in the box; longer
     here for tapping cards online) to pick the Seer. As in the published Deluxe
     rules, each Werewolf may pick a different player; any correct pick wins.
5. If the word is not found:
   - Insider: everyone loses, or (default on) the Master gets one 30 s guess at
     the Insider.
   - Werewolf: everyone votes (90 s) for a Werewolf. The most-voted player(s) are
     revealed only with at least two votes; a Werewolf among them is caught.
6. **Result** reveals every role, the word, ballots and points on every screen.
   Any active player (or the host) starts the next round.

Scores add up across rounds: Commons win (Insider caught, or the Master's guess)
→ the Master and every Common +1; the Insider escapes → +3. Word found and Seer
safe → every villager +2, the Seer +1 more; a Werewolf caught in the vote →
villagers +1; Werewolves win → +2 each. A cancelled round scores nothing.
Werewolf mode by default keeps the Mayor an honest Villager; the advanced option
deals the Mayor a secret role too (a Werewolf Mayor may give misleading tokens).
Werewolves: auto = 2 from 7 active players, otherwise 1; “2” needs 6 players.

## Authority and privacy

Same trusted-host architecture as Bomb Relay and CUT. The canonical state —
including the word and every role — lives only in the host control node
`rooms/{code}/players/{whoKnowsControlToken}` with a 14 s lease renewed every 4 s.
Only the leased host runs the clock (200 ms pulse; idle ticks never write) and
the RNG (host-captured `now`/`seed`, so replayed transactions stay identical).

- `view(state, 0)` (shared screen) never contains the word before the guess, the
  three options, or any seat→role pair; only public role counts.
- Each card gets `view(state, n)`: its own role, its Werewolf teammates, and the
  word only if its role knows it. Cards are written in parallel by full
  replacement of `wk`, so no field from an earlier phase lingers.
- A card writes one `wkAction` inside a transaction fenced to the shown
  `sessionId` and `stage` (the phase counter). Only whitelisted fields reach the
  rules; ids are deduplicated; each actor gets an exact reply.
- Host buttons that advance the table (close/extend/next) are stage-fenced too,
  so a double click cannot skip a phase. Closing the questions or any vote needs
  a second tap; cancelling a round, restarting and ending the game too.
- Opening baselines: a new game only takes cards still showing what they showed
  when Start was pressed. A link taken by another game suspends this one
  (`switched`); Start begins a fresh game. A saved game for a different number of
  seats is never projected (`rosterChanged`). Names edited in the Hub follow into
  the running game (`rename`), keeping seats, scores and secrets.
- Firebase drops empty arrays; canonical state is JSON text and the UI reads
  projections through `list()`.

The shared host page holds the canonical state in memory; like the other
trusted-host games it must stay open, and a player acting as host could inspect
it with developer tools. Pause keeps at least 3 s; a sleeping host catches up
once on wake. A reloaded host takes the lease back and continues the same game.

## Host controls

Pause/Resume, +1 min (questions) / +30 s (other timed phases), phase close,
Next round, and Host controls: sit a player out or back in (the answerer leaving
during choose/countdown/questions cancels the round; a voter leaving completes
the ballot), choose the next answerer, settings for the next round (including
switching modes), cancel this round, restart with scores at 0, end game.
`who-knows.html?demo=1` runs a whole game on one device with a switchable card
view and no Firebase.

## Validation

- `node --test tests/who-knows-*.test.cjs` — engine (22), sync (7) and
  integration (6): roles, fair rotation, options/history, privacy of the shared
  screen and non-knowers, line/answers/tokens, every ending, pause/extend,
  idempotency, leaving players, rename, stale-stage fences, lease takeover,
  game-switch suspension, roster change, page wiring and complete EN/ZH strings.
- `node tests/who-knows-ui.browser.cjs <playwright>` with `WK_QA_MODE` and
  `WK_QA_PLAYERS` drives the real host page and original play.html links against
  an isolated Firebase-compatible fixture with a controlled clock (no external
  network, no live room): 18 checks and ~60 EN/ZH captures at 1280/390/320,
  overflow, clipped-text, tap-target (≥44 px) and occlusion checks.
- Not verified here: real Firebase from this environment, physical phones and
  a human voice-session playtest.
