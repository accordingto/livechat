# Conversation cards release — 2026-10-26

Scope: BLUFF PARTY's optional private story starters, WORD LIMIT THEATER's
turns and repeated weighted short assignments, WHO KNOWS broad starting hints
and numeric targets, restored WORD WOLF, and their simpler player cards.
Original room/player links are reused. Bomb Relay, CUT, Crazy Talk and unrelated
game rules/timers/audio were not changed. No dependency or database rule change.

## Implementation

- Bluff engine/UI/CSS plus its real host page; optional public-topic-only guides
  go to bluffers' private projections in prepare/discussion. Both editions work.
- Word Limit engine/UI/CSS and host page: canonical floor and speaking-turn
  token, weights 22/22/20/18/13/5 for limits 1–6, at most one six. Existing
  scene/swap timers and scoring remain.
- Who Knows engine/host/UI/word metadata/CSS/page: hints default off, original
  300 word IDs, number type with host-only 100/1000 pool choice, private three
  choices, free spoken answers and original Insider/Werewolf endings.
- New Word Wolf content/art/engine/UI/host/CSS/page/mark. Original 80 pairs:
  Objects 21, Food 9, Other 50. Forty-two clear SVG object illustrations.
  Single CARD_TABLE stateJson; hidden individual items and ballots in normal UI;
  untimed discussion, optional speaker cycle, one settlement, uniform departure
  cancellation. The shared client-authority privacy limits are documented.
- Index and original play.html load all four changes. Cache wl-4 / wk-4 /
  ww-1 / bluff-guides-1 (Bluff CSS v9).

## Executed before frontend publication

- Entire Hub: **2378/2378 tests pass**, no failures/skips.
- Independent search/lyrics service suite: **39/39** before and after code sync.
- Production service-mode smoke safety: **4/4** tests.
- New card production harness: **70 offline safety checks**, including exact
  seven-node allowlist, collision refusal, conditional writes/deletes, foreign
  ownership refusal and active-presence cleanup refusal.
- Frontend SHA verifier: 51-file manifest and 12 offline test cases pass.
- Isolated real HTML/browser multiplayer: Bluff 26 scenarios /30 captures;
  Word Limit 4/9 players, 40 checks /144 captures; Who Knows five combinations,
  131 checks /194 captures; Word Wolf 4/9 players, 24 checks /144 captures.
  EN/ZH phone viewports 320/390 and desktop 1280; no reported page errors,
  overflow, clipping or primary-action target failures. These fixtures replace
  Firebase transport and are distinct from real production checks.
- Unchanged Room Survey three-player regression: **24 checks pass**.

## Independent service publication

Existing project, stable alias and secrets preserved. Deployment
`dpl_9LtXv32fvoGkihnemUADsb1YkFgW` is READY; immutable deployment
`https://icebreaker-youtube-search-k939b02ht-willintaiwan.vercel.app`.

New live service smoke: **30 checks pass** (Bluff Everyone-votes/Halloween
private optional guides, private ballots, self-vote rejection, once-only scoring;
original Once opening/redraw/random-first; ready/CORS/synthetic-ticket rejection,
private-source blocking, search 200 and retired lyrics 410). Fifteen fresh nodes
tracked: fourteen deleted, one already empty, zero cleanup failures. Existing
user rooms were never listed or modified.

An isolated 64-file previous-code snapshot and deployment package are retained
outside the public repo. Four unrelated search/lyrics handlers are byte-identical.
All 64 allowlisted code/config files match the service workspace after sync;
only bluff-king-engine.js changed. No environment/auth file was copied, printed
or rotated. Previous deployment: `dpl_DHqo856YvqAcNkhzDxv7zbRmbcfz`.

## Frontend and real production cards

Publication, asset readback and finite live browser results will be recorded
here after they run. A source/unit or isolated fixture pass alone does not
establish real Firebase synchronization.

Physical phones, human voice-session play and hardware speaker output have not
been tested for this release.
