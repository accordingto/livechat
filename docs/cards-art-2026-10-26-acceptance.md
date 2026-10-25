# Illustrated cards and clearer play — 2026-10-26

This follows the earlier conversation-card release. The user requested finished
Word Wolf art for every word, clearer Word Limit themes with optional folded
roles, Who Knows numbers from 1–1000, and simpler Bluff guidance.

## Changes and assets

- **Word Wolf:** 160 independently generated gouache-style illustrations for
  all original 80 pairs, including objects, food, feelings and other concepts.
  Built-in `image_gen.imagegen` was used once per item; no CLI/API key or stock
  images. Original PNGs are retained outside the public repository. The game
  uses 160 separate 640×640 WebP files at
  `assets/word-wolf/cards-v1/<item-id>.webp`, totaling 10,649,690 bytes. Only
  contain/resize and WebP compression were applied. Exact prompts, paths and
  final hashes: [art record](word-wolf-art-prompts.json).
- Names and IDs still have one authority in `word-wolf-content.js`. The art
  module derives an immutable known-ID manifest, one image per word. Large own
  art and English/Chinese labels lead the card; voting uses a compact 76px
  image. Short phones keep complete art at 162px, a compact header and reachable
  actions. The bank, weights, history, privacy projections, voting and timers
  were not changed. No unconnected product demo page was added.
- **Word Limit:** theme and one-sentence premise above the limit; player/host
  roles in closed optional-inspiration details. Native opening/closing of
  inspiration sends no command and changes no turn, limit or deadline.
  Engine, circle, scoring, shuffles and scene clock unchanged.
- **Who Knows:** all future number deals use 1–1000. Saved 100 settings migrate
  for the next deal; a running 1–100 round preserves its secret, frozen clue,
  deadline and history. Host UI shows the fixed range. Broad clues remain off
  by default; numeric choices omit duplicate translated digits.
- **Bluff:** two complete fictional explanations replace two abstract prompts
  plus three steps and a repeated title. Seventy-two original bilingual lines,
  selected from public topic words/categories only, never private answers or
  evidence. Optional, folded and private to bluffers in prepare/discussion.
  v2 keeps `starts` and empty `steps` for compatible consumers.
- Real index/host/play entry points updated; ww-art-2 / wl-5 / wk-5 /
  bluff-guides-2 (Bluff CSS10). No shared sync, dependency, Firebase rule,
  Bomb/CUT/Crazy Talk or other game-rule change.

## Executed verification

- Entire Hub: **2384/2384**, zero failures/skips.
- Word Wolf rules/integration/physical-art tests: **15/15**. Every bitmap is
  present, a complete valid 640×640 WebP, with 160 distinct SHA256 values and
  exact known-ID coverage. All words render only their own image and live labels.
- Renderer audit: **324 inspections**, 12 representative captures: all 160
  words in large/compact layouts at 320px plus four long names at 390px.
  Images decode, both labels fit, no horizontal overflow. This is explicitly a
  renderer-only audit, separate from multiplayer.
- Team visual audit: all eight contact sheets, 160 concepts; no required redraw.
  Near-pair distinctions include clothing, instruments, containers, vehicles,
  professions, feelings, rain/shower, snow/hail and nature. A rotor tip close
  to the image edge does not impair helicopter recognition.
- Bluff full rules/executor **174/174**; final bank/UI/guide **67/67**.
  Real-page isolated fixture **26 scenarios /38 captures**, including 12 open
  guide panels at 320/390 EN/ZH; no page/layout issues. Guide panels 248–290px.
- Word Limit/Who focused tests **92/92**. Word Limit real-page isolated
  four-player fixture **20 checks /72 captures**, plus a **21-check** core run
  verifying role toggles are local. Who Numbers/Insider/four/clue-on at 1–1000:
  **27 checks /100 captures**. No page errors/layout findings. Root visually
  inspected the theme-first card and new clue panel.
- Production-browser safety **78 offline checks**; read-only asset verifier
  **211-file** manifest and offline cases pass; service-smoke safety **4/4**.

- Word Wolf real-page multiplayer fixtures: **4 and 9 players each pass 12
  flows /72 captures**, 24 flows /144 captures combined. The actual host and
  original play.html links use isolated Firebase-compatible CAS transport:
  host-closed play, one different card, own bitmap decode, private/changeable
  ballots, simultaneous final ballots settling once, new pair, early reveal,
  tie, pause/reload, departure cancellation/rejoin, host adoption/rename,
  switch/Bring back, End and the actual built-in demo. EN/ZH at 320/390 and
  desktop 1280: zero page/layout findings, no clipped labels, reachable first-
  screen description actions, zero remaining fixture presence, all 160 images
  and runtime source hashes unchanged. Root visually inspected a real player
  screenshot as well as renderer examples.

Isolated fixtures alone do not establish production synchronization or physical-
phone behavior. Final production frontend/browser results follow below.

## Independent executor publication

Bluff v2 is deployed to the existing service, preserving stable secrets and
unrelated search/lyrics handlers. Deployment
`dpl_4d5tGj7PXurFvZDdiECNedW3pouC`, immutable URL
`https://icebreaker-youtube-search-ks5ua6lk4-willintaiwan.vercel.app`, READY at
the unchanged production alias. **30 live service checks pass**, including v2
private guides, original voting/scoring, Once flows and service boundaries.
Fifteen disposable exact nodes: fourteen deleted, one empty, zero cleanup
failures. No existing user rooms were listed or modified.

All 64 allowlisted code/config files match the original service workspace
after guarded sync; only `bluff-king-engine.js` changed. Search/lyrics handlers
are byte-identical; search 200 and retired lyrics 410. Independent service
suite **39/39** before and after sync. Previous code snapshot and package remain
outside the public repository; environment/auth files were not copied or rotated.

## Frontend publication and live cards

Feature commit `18e6caf1c31f75fbb5180f9c5132712f2a5a3ae9` is published to main.
Vercel Production deployment `7XgAAuWv6ZVgWK1ieHHXh2HDtqNE` reports success at
the unchanged `https://livechat-two-alpha.vercel.app/` URL. Read-only SHA256
verification matches **211/211 frontend assets**, including every new bitmap,
and **64/64 broader preservation assets**. Executor readiness/CORS/synthetic
rejection and private runtime boundaries also pass.

The final actual-production browser smoke passes **109 checks** with four real
original player links and the released host pages, real Firebase SDK and clock.
It verifies theme-before-limit and closed optional roles on all four Word Limit
cards plus host; one scoring/handoff per speaker, unchanged deadline and reload;
Word Wolf own 640px bitmap decoding and private words, Pick cycle, synchronized
ballots/reveal/new pair; fixed numeric pool 1000, bilingual opening clue,
Master-only choices/replies, secret projections, free spoken queue and confirmed
Correct into the original post-guess phase. Cards continue after native host
disconnect/closure. The same original links switch between all three games.

Seven actual EN/ZH phone captures have language assertions; no page errors or
horizontal overflow. Seven exact disposable nodes conditionally deleted with
zero cleanup failures and independently reread as null after browser closure.
No existing user room was read or changed. Root visually inspected production
Word Wolf and Word Limit screenshots.

The first production attempt timed out waiting for the initial Word Limit
Start control before any round/check ran. It had zero page errors and all seven
test nodes were deleted. Its cause was not confirmed. A fresh retry passed all
109 checks without a product-code change or relaxed guard; only safe host
diagnostics were added to the harness. Both runs' seven exact paths were
independently verified empty. The initial timeout is retained as a failed
attempt, not counted as a successful game test.

Physical phones, completed human voice-session play and hardware audio output
remain unverified. The prior WHO abrupt-close presence race remains documented
in the previous acceptance; this release does not change synchronization code.
