# Dixit / 妙語說書人

The last game on the Hub list. Uses existing Hub room/player links and the current standard Dixit base-game rules (3–8 players), with 84 independently generated original picture cards. This is an unofficial adaptation. No original commercial card art, logo, or branded board is included.

## Rules

Deal six cards per player (seven for three players). The Storyteller secretly picks one card and announces a clue. Everyone else submits one matching card (two each for three players). Shuffle all submitted cards once and number them publicly. Each non-Storyteller secretly votes for one card; nobody can vote for an own decoy. Votes lock after submission. Only after every vote may the host reveal all owners/votes and score.

- Some guesses correct: Storyteller +3 and each correct guess +3.
- Everyone or nobody correct: Storyteller 0; everyone else +2.
- Every non-Storyteller gets an extra +1 per vote on their cards in all branches, without an Odyssey bonus cap.

Discard played cards, refill hands, rotate the Storyteller to the next player in roster order. When the draw pile cannot replenish everyone, mix its remaining cards with discards before refilling. Finish after a round with any score at least30. Highest score wins; ties share the win. This deliberately follows the current base-game edition, not older deck-exhaustion endings or Odyssey double voting.

Sources checked 2026-10-05:
- https://www.libellud.com/game/dixit/
- https://cdn.svc.asmodee.net/production-libelludv2/uploads/2026/08/DIXIT_REFRESH_RULES_US-UK-AU_BD.pdf
- https://cdn.svc.asmodee.net/production-libelludv2/uploads/2026/08/DIXIT_RULES_EN-2020-V1-cnt_compressed.pdf

## Host and player operation

Set up 3–8 players in the Hub. Open Dixit, designate which player is HOST, then click Open this table. Use Open my host player card to open that player's existing private link. All gameplay and host operations work from that one private card: select the first Storyteller, deal, play/vote with your own hand, pause/resume, reveal, start the next round, cancel, and replay. Other players cannot issue host operations. Replays preserve the designated host; older saved games without a host seat use player 1.

When the designated host card is foreground and open in the same browser that owns the saved Hub room, it automatically runs the trusted-host executor. The shared table can be hidden or closed, and the host does not need to switch back to operate it. This requires the existing local room credentials; no control credential is added to player links or public projections. If the host card is on another device or browser without those saved credentials, keep the shared table open/awake as the executor. At least one authorized host page must remain awake and connected; game actions do not execute on a server.

The Storyteller selects a card, says the clue aloud on the call, then confirms submission. There is no clue text field or recording requirement. The shared table and other private cards tell everyone to listen to the Storyteller. Legacy rounds with a typed clue still display it. Three-player submissions require two distinct cards. The public screen has no private hand and does not vote. Cancel and replay confirmations appear within the host card rather than a browser popup.

The sticky information bar makes the current phase the primary heading, accompanied by the player's next action and live submission/vote progress. Round, Storyteller name, scores, and draw-pile information are secondary. Once all votes arrive, the host starts a shared 3–2–1 countdown. The Storyteller's card appears in the center after 3 seconds; highest-voted cards appear to its right 1.2 seconds later, followed by points and the full vote breakdown. All tied highest-voted cards are shown, including the Storyteller's card when it earns the most votes. Every revealed picture identifies its owner above the image, including the complete round gallery. The Storyteller heading appears above its picture and is not repeated in a banner over the artwork. Phones stack large pictures vertically. Shared deadlines persist through refresh; pausing freezes the reveal and resuming shifts its deadlines. Previously completed rounds appear directly without replaying the countdown.

Pictures dominate the page: three large columns on desktop, two on medium screens, and one full-width column on phones below 600px. The scoreboard and instructions are compact. Select cards by tapping the picture, then confirm separately. Enlargement buttons and the full-screen focus gallery have been removed; the existing large cards preserve the complete 3:4 composition.

The browser transport follows the Hub's established trusted-host Firebase design. Canonical game state persists at a random host control token, with a 14-second host lease and atomic per-path transactions. The foreground private host card has executor priority over the shared screen; a hidden private card releases its lease so an awake shared screen can resume. Refresh uses a per-tab resume identity to replace the previous executor without waiting for its lease to expire. Reconnection renews the lease, and delayed lease transactions refresh an already-expired captured deadline immediately. These paths prevent a background shared tab's timer throttling from making an actively used same-browser host card depend on that tab's heartbeat.

Outgoing projections use independent, latest-only queues for each player. A delayed write to one card cannot block all other players, and obsolete queued heartbeat updates are replaced rather than accumulated. The initial player snapshots for a new session persist under the secret control node, so a replacement executor can safely finish an interrupted opening without overwriting cards switched to another game. Existing mailboxes and pending requests survive projection updates.

This is not a server-executed or malicious-host-proof game. The trusted host browser necessarily receives canonical state. The shared host UI receives view 0; each player projection receives only their own hand, submissions, and vote. During REVEALING, only the countdown deadlines are public initially; after the first deadline only the answer card is added. Owners, popularity, other ballots, and updated points remain hidden until the second deadline. The host lease owner advances these stages automatically. Listener identity determines request actor, and canonical hostPlayerNum determines host permission; supplied actor/hostControls flags cannot promote another player. Session/phase/action receipts and atomic mailboxes guard stale/duplicate requests. Restart requests from the host player's mailbox replace the session and clear old requests safely. Switching games suspends the old host instead of overwriting the newer player's card.

## Files and validation

`dixit-engine.js`: pure deterministic rules, physical card conservation, private/public projections. `dixit-sync.js`: Dixit-specific executor priority, lease recovery and per-player projection queues over the unchanged Hub transport. `dixit-card-host.js`: same-browser private host bridge using the saved room credentials. `dixit-ui.js`, `dixit-host.js`, `dixit.css`, `dixit.html`: one bilingual renderer for public and private screens. New entry in `index.html`; renderer and private host bridge loaded by `play.html`. No dependency or database rules changes.

`dixit-deck.js` artwork version2 uses84 individually served, text-free originals in `assets/dixit-v2/d001.webp` through `d084.webp`, with descriptive accessibility labels and a manifest recording dimensions. Objects, animals, empty scenes, and symbolic visual contradictions replace repetitive people-centered scenes. Official Revelations and Harmonies overview posters were studied for variety, silhouettes, palettes, and multiple possible interpretations; original commercial card images were neither passed to the generation tool nor included in the game. Each new card has greater source resolution than the earlier atlas cells. Images use complete3:4 framing and WebP quality94.

Artwork version is saved in the game state and included in player projections. Fresh games and restarts use version2. Existing games lacking the marker use version1 (`legacyCards` and seven original atlases), including when a player reloads after deployment, so card meanings remain consistent within an active game.

Artwork design references:
- https://cdn.svc.asmodee.net/production-libellud/uploads/2022/03/DIXIT_7_OVERVIEW.pdf
- https://cdn.svc.asmodee.net/production-libellud/uploads/2022/03/DIXIT_8_OVERVIEW.pdf

`npm run test:dixit` covers3/4/8 players, all scoring branches, uncapped bonus, reshuffling/card conservation, tied wins, private projections, stale/duplicate requests, lease refresh, game switching, safe rendering and player actions. `npm run dev:dixit` serves local preview at127.0.0.1:8096. `?demo=1` is explicitly labelled synthetic, never writes Firebase and is not a multiplayer demonstration. `?demo=1&players=3` exercises three-player rules.

Earlier 2026-10-06 release verification: all 488 repository tests passed. Targeted reveal/host checks covered early-result privacy, shared deadlines, paused reveal timing, ties, refreshed hosts, private-host mailbox restart, and forged host flags. Browser QA used the existing Firebase with 3 synthetic players for two rounds: restart/deal/first Storyteller, pause/resume, spoken submission, two-card decoys, secret votes (including the host's own), timed reveal, tied popularity, score totals, and next-round rotation. The private host card performed every game operation; that release's public host tab supplied synchronization. Desktop reveal cards fit fully; 375px phone results stacked pictures without page overflow.

### Current recovery and card cleanup verification

The 89 targeted Dixit tests pass, covering the card-host credential boundary, private/shared executor handoff and refresh recovery, latest per-seat projection queues, interrupted opening recovery, picture selection without enlargement controls, and owner labels above revealed pictures. The full repository run reported 506 tests: 505 passed and one existing next-round fixture failed because its 1 ms timing assumption flaked; the focused rerun of all 14 tests in that group passed.

Actual Firebase browser QA used 3 synthetic players with the shared host page closed. The private HOST card restarted the game, dealt with player 2 selected as Storyteller, and resumed immediately after two reloads. Spoken confirmation, two decoy submissions per non-Storyteller, secret votes, shared countdown, tied highest-voted pictures, and scores of 4, 3, and 0 all worked. Owners appeared above every revealed picture, with zero enlargement controls and zero duplicate Storyteller banners. At a 375 px phone viewport, the page's scroll width was 360 px with no horizontal overflow. The earlier 488-test result above remains historical verification of the previous release.
