# 🖍️ Sketch Relay（畫畫傳話）

A Telestrations-style drawing telephone game for the Hub. Same concept and
rules as the published party game, with an original word list, original
interface and no commercial artwork, card text or branding. Entry page
`sketch-relay.html`, played on the existing Hub room and original `play.html`
player links. 4–9 players (the boxed game is 4–8; the 12-player edition uses
the same rules, and the Hub supports up to 9).

## Rules

1. **Secret word.** Every player gets a private card of six English words.
   One shared die roll picks the same number on every card. A player who does
   not know their word may move to the next word on their card (up to five
   times) before tapping *I'm ready*. When everyone is ready — or the host
   taps *Start without waiting* — the first page begins.
2. **Even number of players:** each player first draws their own word.
   **Odd number:** each word goes straight to the next player, who draws it.
   This is the published rule, so every sketchbook comes home ending with a
   guess.
3. **Pass it on.** After every page all sketchbooks move one seat onward
   together (roster order, shown on the shared screen). Receive a word or a
   guess → draw it. Receive a drawing → write what it shows (1–40 characters,
   English encouraged). Drawing pages are timed (45 / **60** / 90 / 120 s or no
   timer); guessing pages are not. Handing in is final for that baton. A blank
   drawing cannot be handed in manually. Drawings are privately saved during
   play; at time-out the player submits its final snapshot, and after a 20-second
   network grace the host submits the latest saved drawing if the card is asleep.
   With no saved ink, the page is explicitly skipped.
4. **Reveal.** When every book is home, books are shown one at a time, page by
   page. The owner turns pages on their own card; the host can too. When an
   owner is sitting out, anyone can present their book.
5. **Scoring (optional, chosen before dealing).**
   - *Friendly*: for each book the owner picks a favourite drawing
     and a favourite guess (never their own page); each earns its maker 1
     point. If the last guess matches the secret word, the owner gets 1 point.
   - *Competitive*: every guess that matches what its artist was drawing earns
     the guesser 1 point and that artist 1 point; a last guess that matches the
     secret word earns the owner 1 point.
   - *Just for laughs* (default): no points.
   A book ending with a drawing after skipped pages has no final guess bonus;
   an earlier guess is never treated as its ending. Matches are pre-filled with
   a loose comparison (case, articles, plurals and
   punctuation ignored) and the presenter decides; after the last book only the
   host can correct a decision. Highest total wins; ties share. *Play another
   round* deals fresh words and keeps totals; *New game* resets them.

Rule references: the publisher's friendly scoring (favourite sketch, favourite
guess, last guess matches) and competitive scoring (guesser and sketcher points
for matches, owner point for a matching last guess); odd groups pass the word
first, even groups draw their own word first; drawing is timed with the sand
timer, about 60 seconds.

## Absent players

Nobody's page is invented. The host can mark a player as sitting out (and a
player can do it from their own card); their current page and future pages are
skipped until they return. A skipped page is transparent: the next player
answers the last *real* page of that book, so drawings and guesses keep
alternating (the next player may therefore draw instead of guess). If a drawing
card disappears, the host uses its last saved drawing 20 seconds after the
deadline or skips it if no ink was saved. *Don't wait — skip unfinished pages*
explicitly skips unfinished work. At least two players must stay in. Pause
freezes inputs and book passage, including when someone sits out; remaining
drawing time is preserved on resume.

## Screens

- **Shared host screen** (`sketch-relay.html`, meant for screen sharing): a
  colour-coded stage bar (what is happening now, page *n* of *m*, timer and
  done count), a page rail (🔒 word → ✏️ → 💭 → …), every player's status,
  and the passing direction. During play it never shows any word or drawing.
  During the reveal it shows the current book large, with page turning,
  favourites and *Next sketchbook*; afterwards results and a full gallery.
- **Player card** (`play.html`): the stage bar always says what to do next.
  Word stage shows the word card with the rolled number highlighted. Drawing
  stage shows the prompt on a sticky note above a cream sketchbook page with
  colours, four pen sizes, eraser, undo and clear, sized to fit the screen.
  Guess stage shows the drawing large with one input, including IME composition
  protection. After handing in, the card shows the locked page and who is still
  working. Drafts are saved locally and privately synced, so a reload or sleeping
  card retains saved ink. Clear/undo and the current held stroke are captured.
  In-game dialogs handle clearing, sitting out, skipping and ending. Cancel/ESC
  preserves the drawing; a confirmation cannot act on a newer page. Pen taps
  produce visible round dots.
- `?demo=1` (or `?demo=1&players=5`) is a one-device simulation with a view
  switcher and *Let the other players finish*. It never touches Firebase.

## Files

| File | Role |
| --- | --- |
| `sketch-relay-words.js` | 286 easy + 156 tricky original words (simple English, no slang or culture-specific items). |
| `sketch-relay-art.js` | Drawing codec: 1000×1000 page, one style char + base64url points per stroke, `;` between strokes, ≤16 000 chars; validation, simplification, SVG/canvas rendering. |
| `sketch-relay-engine.js` | Pure rules: create/apply/view, chain math, skips, timer grace, reveal, scoring, projections. |
| `sketch-relay-sync.js` | Trusted-host Firebase transport (below). |
| `sketch-relay-ui.js` | Bilingual text, drawing pad, renderers and the player-card controller. |
| `sketch-relay-host.js`, `sketch-relay.html`, `sketch-relay.css` | Host page, demo and styles (`relay-2` asset version). |
| `tests/sketch-relay-*.test.cjs` | Engine, transport and UI tests (`npm run test:sketch-relay`). |
| `scripts/sketch-relay-verify-release.cjs` | Read-only production asset hash checks; never touches room data. |

## Transport and privacy

Same trusted-host bearer-node design as the other Hub games
(`rooms/{CODE}/players/{token}`), with three small changes for drawings:

- The canonical node under the host's random control token is split into
  `lease` (owner + expiry, renewed every 5 s), `core` (`stateJson`, written only
  when the game changes) and a one-time `opening` guard. Renewing the lease
  never rewrites the drawings.
- Card requests (`relayAction`) received together are applied in one canonical
  write; each seat receives a private bounded receipt history, and another tab
  cannot replace an unacknowledged request. Cards retry the same command ID.
  Receipts and deduplication both retain 40 IDs; old seen requests with missing
  receipts are acknowledged without replaying their actions.
  Each card's projection is rewritten only when that player's view changed,
  through a per-player latest-only queue.
- Host liveness goes to a tiny `relayLive` child of each card, so heartbeats
  never rewrite a card's drawing.

Opening compares each card's stable game/session identity, so a previous game's
still-open host refreshing its heartbeat cannot block the takeover, while a
newer game on any card suspends this host instead of being overwritten. A
reloaded host tab resumes its stored client with a new live-document fence.
Duplicating a tab displaces the old executor rather than creating two hosts;
the old document cannot steal ownership back or release the new lease. Changed
room counts require a fresh game and do not project old books into new seats.
Cards see only their own
word card, their own current prompt and their own page until the reveal; the
shared screen sees statuses only. The control token is never sent to a card.

**Limitation:** this game is not registered with the independent game service
(`api/hub-executor`), which would need a separate service deployment. The host
page runs the game and must stay open (it is also the screen everyone watches).
If it closes, cards keep their drafts and show *Waiting for the host page*; the
game continues when the host page is opened again in the same browser
(immediately on a reload; a brand-new tab may wait up to a minute for the old
lease to expire if the closed tab could not release it).

Rule sources: [The Op 2025 official rules](https://cdn.shopify.com/s/files/1/0611/3958/3198/files/Reduced_Telestrations_12P_Rules_2025.pdf?v=1750189801)
and [2Plus Taiwan rules](https://2plus.com.tw/product/q013-telestration/).

## Relay-2 validation (2026-10-11)

- Full repository regression: 1,728 tests pass, including 21 engine, 15 transport
  and 19 UI Sketch Relay cases. This includes the real player mailbox guard,
  duplicate host leases, legacy missing-receipt recovery and sleeping drafts.
- Actual browser demos: full four-player and five-player games, even/odd first
  holder, pause/resume, private prompt, manual drawing/guessing, locked hand-in,
  all books revealed, no-score results and another round. A final mobile pass
  confirmed pen taps, clear cancellation, confirmed clear and ESC cancellation.
- No horizontal overflow at 320, 375 and 1280 px. No browser console errors or
  warnings in the completed demo checks. These are browser-size checks, not
  physical-phone testing; transport tests use the in-memory Firebase stand-in.
- Production deployment is checked separately with the read-only asset hash
  verifier. This pass does not create production rooms or alter live player data.

## Original relay-1 validation (2026-10-11)

- `node --test tests/*.test.cjs`: full repository regression passes (see
  CLAUDE.md for the count), including 27 Sketch Relay engine/transport/UI cases.
- Local Chromium end-to-end with the real `sketch-relay.html` and four/five real
  `play.html` cards on an in-memory Firebase stand-in (the CDN is unavailable in
  the build sandbox): full English 4-player and Chinese 5-player games through
  word cards, drawing, guessing, owner-presented reveal, favourites, results and
  the next round; a player reload mid-drawing kept the draft; a host reload
  resumed immediately; no page errors, no horizontal overflow at 390 px and
  1280 px; the control token never appeared on a card. A timer run confirmed
  automatic hand-in at the deadline (including a blank page) and automatic
  skipping of a closed card after the 20 s grace.
- Not yet verified against the production Firebase project or on physical
  phones from this sandbox.
