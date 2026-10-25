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
- New card production harness: **78 offline safety checks**, including exact
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

Frontend feature commit **4e854d63cf914d8a737cb5d5b371034ce93afb43** is on main.
Vercel Production deployment **BUXq2x2qv4ZNz969dDuHoKfn6u6S** succeeded at the
unchanged `https://livechat-two-alpha.vercel.app/` URL. SHA256 readback matches
**51/51** affected frontend assets and **64/64** broader preservation assets;
service health, CORS, synthetic rejection and private-source boundaries pass.

The final finite live browser run passes **99 checks** with the actual released
host pages, four original `play.html` links, real Firebase SDK and real clock.
No local engine/transport replacement or clock manipulation was used.

- Word Limit: cast preview consumes no scene time; cards continue after host
  disconnect/close; four actors complete one circle with only the current
  actor's line control, one score per completion and one unchanged deadline.
  Reload preserves floor/score/deadline and one live seat presence; card End
  succeeds before switching the same links to the next game.
- Word Wolf: the same four links receive exactly three shared items and one
  different item, no pre-reveal role/pair. A Pick cycle covers everyone once;
  four private ballots reveal one identical full result, then Next selects a
  new pair while recording one prior result. Host page stays closed.
- Who Knows: Numbers/Insider/4, optional hint on, pool 100. Only Master gets
  numeric choices; only Master/Insider sees the chosen answer; every card gets
  one exact frozen bilingual clue without exposing the hidden pool setting.
  Two raised hands queue; only Master has spoken/correct answer controls.
  Spoken advances the queue without token cost, one Correct tap does not end
  guessing, and confirmation enters the unchanged post-guess speaking phase.
  Other identity/hint/pool combinations are covered by the isolated fixtures,
  not this limited production browser run.
- Seven production screenshots: real language-button clicks and assertions on
  I18N, HTML language, active button and stored preference; English at 390px,
  Traditional Chinese at 320px. Root visually inspected all three card styles.
  Zero page errors/horizontal overflow. All SDK requests stayed inside the
  seven owned node subtrees. Seven nodes conditionally deleted, zero cleanup
  failures; native disconnects left zero presence before deletion.

### Initial harness findings and recovery

The initial live run passed 89 game checks with zero page errors, but its
language seed used the wrong storage key (`icebreak-lang`, actual `site-lang`)
and its abrupt natural host closure left one stale actor-0 presence in the
finished WHO table. Cleanup correctly refused that nonempty-presence table:
six nodes deleted, one refused. With every test browser already closed, root
verified the remaining node's marker, known session, four fixture names,
stopped/finished state and stale host-only presence, then conditionally deleted
it using its current ETag. All seven exact nodes were read back as null. The
first report remains recorded as a cleanup failure with a separate successful
recovery proof; it is not counted as a clean pass.

The harness now uses the correct language seed plus real visible UI selection,
explicit native SDK goOffline before each host closure, bounded presence
settlement, and safe per-index cleanup diagnostics. Its final new seven-node
run passes 99 checks and cleans up completely. No existing user room was
listed, opened or modified during either run.

The underlying WHO sync release-order race predates this change and was not
modified: it cancels onDisconnect before a fire-and-forget presence removal.
Abrupt closure may leave that presence. It does not change canonical deadlines,
scores or settlement; a residue still marked visible can delay tick ranking.
A future narrow fix needs disconnect/ack and rapid retarget tests, rather than
changing shared synchronization as part of this feature release.

Physical phones, human voice-session play and hardware speaker output have not
been tested for this release.
