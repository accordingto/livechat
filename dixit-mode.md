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

Set up3–8 players in the Hub. Open Dixit, designate which player is HOST, then click Open this table. Use Open my host player card to open that player's existing private link. All gameplay and host operations now work from that one private card: select the first Storyteller, deal, play/vote with your own hand, pause/resume, reveal, start the next round, cancel, and replay. Other players cannot issue host operations. Replays preserve the designated host; older saved games without a host seat use player1. The shared table stays open/awake as the synchronization source, and the host can leave it in the background on a desktop without switching back to operate it.

The Storyteller selects a card, says the clue aloud on the call, then confirms submission. There is no clue text field or recording requirement. The shared table and other private cards tell everyone to listen to the Storyteller. Legacy rounds with a typed clue still display it. Three-player submissions require two distinct cards. The public screen has no private hand and does not vote. Cancel and replay confirmations appear within the host card rather than a browser popup.

The sticky information bar makes the current phase the primary heading, accompanied by the player's next action and live submission/vote progress. Round, Storyteller name, scores, and draw-pile information are secondary. Once all votes arrive, the host starts a shared3–2–1 countdown. The Storyteller's card appears in the center after3 seconds; highest-voted cards appear to its right1.2 seconds later, followed by points and the full vote breakdown. All tied highest-voted cards are shown, including the Storyteller's card when it earns the most votes. Phones stack large pictures vertically. Shared deadlines persist through refresh; pausing freezes the reveal and resuming shifts its deadlines. Previously completed rounds appear directly without replaying the countdown.

Pictures dominate the page: three large columns on desktop, two on medium screens, and one full-width column on phones below600px. The scoreboard and instructions are compact. Select cards by tapping the picture; separate Enlarge controls open a large focus gallery with previous/next navigation and a visual overview. Zooming never submits or changes selection. The complete3:4 composition is preserved.

The browser transport follows the Hub's established trusted-host Firebase design. Canonical game state persists at a random host control token, with a14-second host lease and atomic per-path transactions. The host page must stay open/awake. Refresh reconnects to the saved room and state. This is not a server-executed or malicious-host-proof game. The shared host UI receives view0; each player projection receives only their own hand, submissions, and vote. During REVEALING, only the countdown deadlines are public initially; after the first deadline only the answer card is added. Owners, popularity, other ballots, and updated points remain hidden until the second deadline. The host lease owner advances these stages automatically. Listener identity determines request actor, and canonical hostPlayerNum determines host permission; supplied actor/hostControls flags cannot promote another player. Session/phase/action receipts and atomic mailboxes guard stale/duplicate requests; outgoing projections preserve concurrent requests. Restart requests from the host player's mailbox replace the session and clear old requests safely. Switching games suspends the old host instead of overwriting the newer player's card.

## Files and validation

`dixit-engine.js`: pure deterministic rules, physical card conservation, private/public projections. `dixit-sync.js`: thin adapter over the unchanged Hub lease/transport. `dixit-ui.js`, `dixit-host.js`, `dixit.css`, `dixit.html`: one bilingual renderer for public and private screens. New entry in `index.html`; renderer loaded by `play.html`. No dependency or database rules changes.

`dixit-deck.js` artwork version2 uses84 individually served, text-free originals in `assets/dixit-v2/d001.webp` through `d084.webp`, with descriptive accessibility labels and a manifest recording dimensions. Objects, animals, empty scenes, and symbolic visual contradictions replace repetitive people-centered scenes. Official Revelations and Harmonies overview posters were studied for variety, silhouettes, palettes, and multiple possible interpretations; original commercial card images were neither passed to the generation tool nor included in the game. Each new card has greater source resolution than the earlier atlas cells. Images use complete3:4 framing and WebP quality94.

Artwork version is saved in the game state and included in player projections. Fresh games and restarts use version2. Existing games lacking the marker use version1 (`legacyCards` and seven original atlases), including when a player reloads after deployment, so card meanings remain consistent within an active game.

Artwork design references:
- https://cdn.svc.asmodee.net/production-libellud/uploads/2022/03/DIXIT_7_OVERVIEW.pdf
- https://cdn.svc.asmodee.net/production-libellud/uploads/2022/03/DIXIT_8_OVERVIEW.pdf

`npm run test:dixit` covers3/4/8 players, all scoring branches, uncapped bonus, reshuffling/card conservation, tied wins, private projections, stale/duplicate requests, lease refresh, game switching, safe rendering and player actions. `npm run dev:dixit` serves local preview at127.0.0.1:8096. `?demo=1` is explicitly labelled synthetic, never writes Firebase and is not a multiplayer demonstration. `?demo=1&players=3` exercises three-player rules.

2026-10-06 verification: all488 repository tests passed. Targeted reveal/host checks cover early-result privacy, shared deadlines, paused reveal timing, ties, refreshed hosts, private-host mailbox restart, and forged host flags. Browser QA used the existing Firebase with3 synthetic players for two rounds: restart/deal/first Storyteller, pause/resume, spoken submission, two-card decoys, secret votes (including the host's own), timed reveal, tied popularity, score totals, and next-round rotation. The private host card performed every game operation; the public host tab supplied synchronization. Desktop reveal cards fit fully alongside their enlarge buttons;375px phone results stack pictures without page overflow.
