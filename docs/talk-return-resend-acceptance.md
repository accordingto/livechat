# Crazy Talk one-field private card editing and direct resend — 2026-10-18

## Behavior

Returned and saved cards each have exactly one primary editable task field. The
saved-card static preview and separate folded lower editor are removed. Authors
can change the original visible field directly, then save or explicitly send it.
The existing outer private-library fold follows the player's preference.

Authors currently allowed to create tasks get a Random player / specific-player
recipient selector and Send on the returned card, matching the original composer.
Current text is sent without an extra Save step. On successful Return Send, a
new independent task enters the existing handwritten priority queue and the
returned copy becomes an ordinary saved card with its current text/target.
Saved-card Send likewise accepts current edits and saves them only after the
new task was accepted. Omitting text preserves backward compatibility; omitting
the recipient chooses random rather than silently reusing an old fixed target.

The normal personal rest, receiver availability, mission cap, per-author/room
queue limits and role/source/round rules still apply. Actors and inactive authors
may edit/save/delete their own cards, but do not gain permission to send tasks.
Rejected sends leave the original card/return state, text and version intact.
The editable local draft remains available. Exact retries create one new task;
an altered same-ID retry cannot change an already accepted task. Successful
private edits and sends retain the existing encrypted persistence-before-receipt
flow. The originally executed card and its eventual recap remain immutable.

Both returned and saved card mounts retain keyed textareas, native recipient
selectors and their ancestors through ordinary sync updates. Chinese composition,
selection/caret, frozen pending requests and newer unsent edits must remain
protected. New sessions and lost ownership still enforce the privacy fences.
Neither changing text nor choosing a recipient automatically sends anything.

## Verification and publication

Gameplay source `5ba9f250ff363e00a7ddf113b7e3eb1f15ca8fbb` is published on the
existing frontend, https://livechat-two-alpha.vercel.app/, and existing executor,
https://icebreaker-youtube-search.vercel.app/api/hub-executor. Backend deployment
`dpl_9FRqpH5u8Ja1z2UDep2p5noJSYu8` is READY and has the stable production alias.
Talk browser cache tags are `vnext-9` / `talk-vnext-9`. No new settings are added.

Executed checks for this release:

- Final frozen-source regression: **2,151/2,151** passing; no failures or skips.
  All 12 changed/new JS/CJS files pass syntax checks; `git diff --check` passes.
- Five actual `play.html` clients using the existing local authority: 19 behavior
  flags pass, 20 English/Traditional Chinese captures at 320/375px, no page errors
  or dialogs. The changed UI unit suite passes 67/67. Native Chrome checks pass
  five sends and ten open-picker updates, including a newly arriving return above
  a saved card, stable anchor/options, and the correct recipient on the first send.
- Authenticated **production API** scenario: **270 checks** pass, with seven
  uniquely marked test nodes safely cleaned and zero cleanup failures. It covers
  edited returned-card send to a specific actor, author-only content, exact retries
  producing one task, edited saved-card send, immutable original reveal, locked-round
  failure retaining the return, and original-token cross-session random resend.
  Production authority, private projections and encrypted archive were checked.
- Read-only production host-demo browser: 17 loaded assets SHA-match the source
  commit before diagnostic hooks; all 14 behavior flags pass and 12 bilingual
  320/375px captures were produced. No overflow, page errors, dialogs, non-GET,
  room or API requests; two external SDK requests were blocked. This browser gate
  uses synthetic local authority and is separate from the real production API test.
- Stable release checks: Talk 19/19, executor 62/62, Life Story 164/164, Talk Bomb
  15/15. Executor/Life Story readiness, CORS and synthetic invalid requests pass;
  private runtime/question response bodies remain blocked 14/14.
- Service package matches 55 Hub source/assets and loads all 96 private Life Story
  questions. Its 62 explicitly packaged files, including `.vercelignore`, were
  synchronized back to the existing service source and SHA-verified.

Local evidence is under `outputs/talk-returned-tasks/` (five-player browser),
`outputs/talk-return-resend/` (read-only production browser), and
`outputs/talk-return-resend-*.log` (regression, API and release checks) relative
to the task workspace. Earlier acceptance records describe their own releases.

Files changed from `cd40a18`:

- Authority and direct-send actions: `talk-engine.js`, `talk-vnext.js`.
- Player UI/styles: `talk-ui.js`, `talk.css`.
- Existing entry-point cache tags: `hub-launcher.js`, `lets-talk.html`, `play.html`.
- Production scenario: `scripts/talk-vnext-production-smoke.cjs`.
- Automated tests: `tests/talk-return-send.test.cjs`,
  `tests/talk-return-resend-privacy.test.cjs`, `tests/talk-ui.test.cjs`,
  `tests/talk-vnext-production-smoke.test.cjs`, `tests/talk-returned.browser.cjs`,
  `tests/talk-ui.browser.cjs`, `tests/talk-vnext-ui.browser.cjs`.
- Documentation: `talk-mode.md`, `CLAUDE.md`, this acceptance record.

## Scope and limits

This extends the existing Crazy Talk actions, private projections, library,
handwriting queue and Firebase authority. It creates no new multiplayer system,
provider, secret, storage schema or dependency. Original-token/same-room vault
ownership remains in force; other players never receive private card drafts.
The normal task skip penalties, system redraws, director rotation and end-of-round
rules are unchanged. Unsaved private-editor revisions remain memory-only across
a full page reload, as with the previous library editor; stored cards and accepted
requests retain their existing recovery behavior. No human voice or physical-phone
playtest is implied by synthetic-client browser or production API verification.
