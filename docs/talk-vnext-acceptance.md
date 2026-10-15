# Crazy Talk vNext acceptance record — 2026-10-15

Status: implemented, deployed and verified within the scopes below. Final integrated
local regression passes **1985/1985**, with zero failures, cancellations or skips.
Frontend gameplay source **a680d60** is published at
https://livechat-two-alpha.vercel.app/ . The existing independent executor is READY
as **dpl_Cx21Xhnn1RyTBpejyQtR8Jiy5bGP** at
https://icebreaker-youtube-search.vercel.app/api/hub-executor .

The production native-queue five-player lifecycle passes **339 checks**, including
real150-second expiry, and safely removes all7 owned fixture nodes. A separate
55-second no-foreground queue probe passes96 checks and cleans7/7. This probe
verifies the unchanged native queue transport from source9fa1559; the full
lifecycle and asset checks identify the final revision. These use
synthetic authorized identities in disposable rooms, not human group play or
physical mobile clients. Final documentation commits leave these runtime/assets
unchanged; the runtime source/version and exact asset checks are recorded here.

## Gameplay and defaults

1. Enter through the existing Hub and original player links. Talk setup retains
   Normal/Crazy and assigned/random/free conversation; Normal and random turns
   remain the defaults. Preparation is think 45 seconds, adjustable 15–120;
   round length 900 seconds, adjustable 60–3600. Shared topics remain 96 situations,
   13 categories and 672 main/follow-up questions.
2. Crazy defaults to free play, mixed system/player sources, maxActive 3
   (configured 1–9, effective cap bounded by receiving roles). Director mode
   requires 5 active players, normally 2 directors and 3 actors. Directors write;
   actors receive and have no composer/director status list. Rotation defaults
   to 240 seconds (setup 120/240/360, valid 60–900) and waits for busy selected actors.
   Membership below 5 temporarily uses free play while retaining the preference.
3. An active mission is above the topic. The composer immediately below is
   collapsed by default, recipient first, textarea second; random other player
   is the default. New tasks omit kind, accept 1–120 trimmed characters, and cap
   the waiting queue at 10 per author/20 per room. No Accept button is added.
4. Handwritten tasks have immediate priority when an eligible slot is available.
   Preparation, busy/fixed targets, receiving pause/cooldown and known offline
   targets can delay delivery; unknown presence is represented separately.
   The existing 136-card system bank remains unchanged. System fallback is lower
   priority, using internal random 60–180 seconds
   (valid min/max 5–300), and is absent in player-only mode. An active player card
   is not overwritten; a system-card replacement offers both full texts with
   explicit Keep/Replace choices.
5. Foreground valid DOM rendering sends automatic `crazyRendered` through a
   separate exact-ID technical RPC, independently of manual pending receipts.
   It does not mean the human read the card. Hidden pages wait. No confirmation
   within 30 seconds withdraws the display, requeues handwriting and pauses the
   recipient. A rendered mission gets one quiet reminder after 30 seconds.
6. Internal task expiry defaults 150 seconds from assignment, adjustable 30–300.
   Matching Done adds exactly 1; Skip adds 0. Both give a 30-second receiver
   cooldown. Expiry adds 0 and pauses receiving only without related manual interaction
   in that exact task lifecycle. Keeping the original card counts as a response;
   accepting a replacement creates a fresh lifecycle. Resume is shown only
   when paused. Duplicate/stale/expired acknowledgements cannot score twice.
   Global pause stops delivery while authoritative task/round deadlines continue.
7. The round timer is hidden by default behind a local View time toggle; new
   sessions hide it again. Preparation feedback remains visible. Playing UI
   renders no task-expiry, dispatch or rotation countdowns. Native selectors,
   composer ancestors, Chinese IME, focus/caret and frozen retries survive updates.
   Same-room verified original token/session restores the unsent local draft;
   unavailable browser storage falls back to memory, never name-based ownership.
8. Crazy round deadline enters decision, locking new submissions without
   discarding active missions. Only authorized host/delegate can extend 180/300/
   600 seconds or drain. Extension plays the existing queue with system fallback
   stopped and new submissions still locked. Draining dispatches no more cards
   and waits for active ones to close before sorting. Normal's shared +1 minute/
   Finish and automatic rest remain separate. Trusted Hub launch forwards
   hostPlayerNum; Director role does not grant host authority. Host-absent
   claim is service-projected after 30 seconds of decision and host absence evidence
   (45 seconds since host activity). A confirmed-offline delegate cannot block takeover.
9. Unexecuted leftovers are privately saved by default to their verified author.
   Sorting starts all checked (private). Explicit confirmation publishes only
   unchecked cards to this room's recap. Host reveal does not wait for every
   author; unconfirmed cards remain private and their author can still sort in
   reveal. The UI does not reopen confirmed exposure. Reveal shows executed
   handwritten text, author, actual recipient and outcome, or honestly says an
   approved unused card was not sent this round. No other private vault is exposed.
10. My private challenges is folded. Authors can edit, explicitly confirm delete
    and resend under current role/source/queue gates. Nested editor draft/caret/IME
    survives live updates. The same verified original token retains its vault
    across same-room topic/session/rename/game switches; it is not an account or
    cross-room library. New rounds reset current scores/stages, not that vault. Preparation setup
    resubmission privately preserves accepted unused cards from transaction-current
    state, including unpersisted event/vault versions. Active missions block an
    ordinary restart in both browser and authoritative release. Confirmed activity
    switches can reopen Talk without keeping a fenced old room stuck; old closures
    are journaled without points, and unused handwriting stays private.

The previous system-only archive UI restriction is explicitly superseded by
vNext's author-only vault and consent-based room recap. The operator archive
remains encrypted/private, independent of player projections and public recap.
The existing `CRAZY_TALK_ARCHIVE_SECRET` and `HUB_EXECUTOR_SECRET` are retained;
no new provider or secret is introduced. Durable versioned archive/vault writes,
tombstones, exact retries, transaction-current retention, ACK fences and
membership publication guards remain required. Operator reading names exactly
one room; no all-room enumeration or public archive-read endpoint is added.

## Changed file groups

- Lifecycle/authority: new `talk-vnext.js`, `talk-engine.js`,
  `runtime/story-executor.cjs`, `runtime/hub-executor-core.cjs` and
  `api/hub-executor.js`, native private `api/talk-wake.js` and
  `runtime/talk-wake-queue.cjs`. Existing transaction/actor/session/membership/privacy
  checks remain in the executor; rendering acknowledgements use an independent
  response without replacing manual receipts.
- Persistence/operator tooling: `runtime/talk-archive-store.cjs`,
  `scripts/talk-read-archive.cjs` and archive/vault service fixtures. Private
  operator records and owner-scoped vault records remain encrypted and sanitized.
- Frontend/settings: `talk-ui.js`, `talk-host.js`, `talk.css`, `talk-settings.js`,
  `talk-sync.js`, `lets-talk.html`, `play.html` and `hub-launcher.js`. The launcher
  loads the lifecycle module before engine and forwards trusted hostPlayerNum.
- Packaging/release checks: `scripts/hub-executor-package-service.cjs`, new
  `scripts/talk-vnext-production-smoke.cjs`, adjusted archive/production smoke
  checks and their test fixtures. Native55-second probe and final150-second
  production lifecycle smoke both pass.
- Validation: `tests/talk-vnext.test.cjs`, `tests/talk-vnext-service.test.cjs`,
  `tests/talk-vnext-store.test.cjs`, `tests/talk-vnext-production-smoke.test.cjs`,
  `tests/talk-vnext-ui.browser.cjs`, `tests/talk-vnext-host.browser.cjs`,
  `tests/helpers/talk-vnext-fixture.cjs`, `tests/talk-wake-queue.test.cjs`,
  `tests/talk-vnext-queue-handoff.test.cjs`, `tests/talk-vnext-wake-recovery.test.cjs`, existing Talk UI/host/settings/sync/
  clock/engine/archive/membership tests, and executor integration regressions.
- Documentation: `talk-mode.md`, `CLAUDE.md` and this record. Unrelated topic
  banks, other games and existing search routes are preserved.

Changed host Talk cache tags are `vnext-3`; player/dynamic Talk tags are
`talk-vnext-3`. Unchanged browser executor retains `life-story-1`. Runtime changes
require both the existing independent service and frontend deployments.

## Native background delivery

The final implementation uses Vercel Queues in the existing executor project;
no self-HTTP recursion or per-client scheduling ownership is required. The private
`api/talk-wake.js` consumer has a `queue/v2beta` trigger for `crazy-talk-wake`,
region sin1, 60-second visibility and two-second retries. Only the encrypted signed
wake ticket enters the queue, with a stable job key, 120-second message retention
and a 180-second post-due signed delivery lease. No new user-managed secret is needed.

Foreground commands await durable publication before their HTTP success. An
unpublished job is offered again on exact retries; enqueue markers follow provider
acceptance. A retried predecessor can recover only its own unpublished successor.
Lost RTDB write responses recover only the exact newly committed job. Early
callbacks retry; duplicate/old callbacks cannot replay scores or cross sessions.
The bounded private wake log contains job hashes, stages, timestamps and outcomes.

Deployment `dpl_Cx21Xhnn1RyTBpejyQtR8Jiy5bGP` is READY on the existing stable
service URL. Public GETs and POSTs to the private consumer return404 on both
hosts. The original self-request prototype was discarded after real production
tests showed508. Final production verification uses the native transport. The
[official queue SDK](https://vercel.com/docs/queues/sdk) handles native delivery
and ACK; there is no public callback-route exception or self-request loop.

## Verified locally

Browser commands below use the configured bundled Playwright dependency exposed
through `NODE_PATH` and its real Chrome channel; they do not install a new package.

- `node --test tests/talk-ui.test.cjs tests/talk-host.test.cjs
  tests/talk-settings.test.cjs tests/talk-sync.test.cjs`: 91/91 passed before the
  final early-reveal consent case. The subsequent player UI-only run passes
  53/53, including retained unconfirmed reveal choices and closed confirmed choices.
- `node tests/talk-ui.browser.cjs`: 5 consecutive sends and 10 actual native
  recipient popups, connected nodes/ancestors, next draft, frozen retry, queue
  error retry, roster/session transitions, IME, offline recovery and first-click
  action/summary behavior pass. Also 18 live vault-editor updates preserve nested
  open state, caret/focus, Chinese IME and Save. Zero browser page errors.
- `node tests/talk-vnext-ui.browser.cjs`: 5 real `play.html` pages in independent
  browser contexts against the actual authenticated service/ETag fixture pass
  all14 reported flags: 2 directors/3 actors, authority, automatic render ACK,
  system-offer Keep, cooldown redispatch, round decision, locked extension,
  no-response receiving pause, default private sorting, recap isolation,
  vault edit/cross-session resend, reload draft and 375 px layout. Zero page errors.
- `node tests/talk-vnext-host.browser.cjs`:actual `lets-talk.html?demo=1`
  with 5 synthetic seats passes preparation/optional time, automatic ACK,
  Keep/Replace full texts, private sorting, real host Reveal, recap attribution,
  2 directors/3 actors, rotation and host extension. EN/ZH 320/375 layouts fit
  without horizontal overflow; screenshots inspected. Zero page errors.
- Final integrated `node --test tests/*.test.cjs`: **1985/1985 passed**, zero
  failures, cancellations or skips. This includes Normal Talk and other Hub games,
  real ETag/CAS races, authority/privacy, exact retries, role-safe assigned/random
  main sharing, inactive-owner vault management and host-absence takeover.
- A transient archive failure during a signed background wake retains the job;
  retrying the same ticket schedules its successor without a fabricated heartbeat.
  Duplicate encrypted vault writes normalize fixed/random recipients consistently.
- Preparation topic replacement privately retains accepted unused cards. Existing
  vault edits/tombstones survive reset. Native/browser checks were rerun after
  the final UI consent change and all passed.

The local browsers use synthetic local authority/demo data and an injected test clock.
They do not read or modify existing user rooms. Protocol visibility, delayed
updates, background/hidden document checks and render retry behavior have local
test coverage. Actual native background delivery is verified separately below;
local browser tests alone are not evidence of that delivery.

## Verified on production

All checks below target the existing stable hosts. Final gameplay and asset checks
identify sourcea680d60; the separately labeled earlier transport probe verifies
the same native queue implementation.
No existing player room was opened or changed. Fixture writes are limited to
uniquely marked disposable rooms with exact ownership/session/card guards and
ETag-conditional cleanup; no room-list enumeration is used.

- `node scripts/talk-verify-release.cjs a680d60`: **19/19** Talk assets match.
- `node scripts/hub-executor-verify-release.cjs a680d60`: **62/62** assets match;
  API status200/ready, trusted CORS, synthetic rejection and runtime404 pass.
- `node scripts/life-story-verify-release.cjs`: **164/164** assets match, all96
  private questions retained, service ready, trusted/foreign-origin checks pass,
  **14/14** private runtime/question response bodies blocked.
- Final read-only production `lets-talk.html?demo=1` browser harness:
  **17/17** actually loaded assets matcha680d60, all11 gameplay flags pass,
  **16** EN/ZH x320/375 x4-state screenshots have no horizontal overflow. Actor
  and recap screenshots were visually inspected. Zero page errors and zero
  room/API requests; external SDK requests are stubbed for the demo.
- Independent actual production no-foreground probe (source9fa1559, unchanged
  queue transport): no client command for55
  seconds; the native job advances, successor dueAt remains current, and a
  system card exists. **96 checks**, cleanup **7/7**, zero cleanup failures.
  This exceeds the prototype's four-hop failure point; it is not merely an ID
  change on the first wake.
- Actual production five-player HTTP/Firebase/native-queue lifecycle via
  `scripts/talk-vnext-production-smoke.cjs`, invoked inside the existing service's
  production `vercel env run`: **339 checks**, all11 reported flags, cleanup
  **7/7**, zero cleanup failures. The fixtures configure2 directors/3 actors and
  exercise actor permission denial; private system-card Keep with full offer;
  completion score;30-second rest; immediate queued handwriting after rest;
  autonomous natural round decision; host-only locked extension; autonomous
  real150-second no-response expiry/pause; rejection of an active-mission restart
  with original authority/prompt retained; private saved and explicitly consented
  unused-card recap; cross-session vault edit/resend/delete; encrypted system and
  player diagnostics. This uses real authoritative state and private projections,
  not mocked HTTP state or an injected production clock. Keep/Replace alternatives,
  simultaneous CAS races and rotation-busy behavior additionally pass local core
  and real-browser integration tests.
- Package verification: **61** packaged files, **55** Hub source/assets byte-match
  current source. These61 plus `.vercelignore` (**62**) byte-match the original
  independent service source after synchronization. All96 Life Story questions
  and unrelated search handlers are retained. **50** changed JS/CJS files pass
  `node --check`; `git diff --check` passes.

Evidence in the task's `outputs` directory:

- `talk-vnext-final-release-suite.log`:1985-test final local run.
- `talk-vnext-production-final.log`:339-check long production progress/report.
- `talk-vnext-production-host-independent/report.json`: final production demo,
  exact asset results,11 flags and16 captures, with harness/PNGs alongside.
- `talk-vnext-life-story-final.log`: preserved-game production release check.

Final reset-specific regressions additionally cover transaction-current stale
cache recovery, private original-author retention, edited/deleted vault versions,
active-reset authority preservation and confirmed activity-switch return. These
pass through the actual browser manager transport and authenticated service locally.

The frontend Vercel deployment ID is unavailable to the independent-service CLI
account; no ID is inferred. Sourcea680d60 and exact stable-host asset comparisons
identify the deployed gameplay. Backend deployment-specific URL is
https://icebreaker-youtube-search-8jtrq5b3n-willintaiwan.vercel.app .

## Known limits

No account sign-in or cross-room ownership system is introduced. Restoring with
a different original token, room or session does not restore another local
draft; a replacement token does not inherit the original author's vault. The
private vault persists across sessions in the same room with the original
verified identity. Browser-local drafts require the same device/storage scope.
Technical render ACK is not proof of attention or performance; Done remains
an authenticated recipient's self-report, with no speech recognition/AI judgement.
Physical phones, real human group play, actual voice/audio, device suspension
and real background/mobile network behavior have not been verified by these checks.
Native queue/provider outages or delayed delivery can defer scheduled processing;
authoritative expiry, session and idempotency checks remain in force. No hard
real-time/subsecond timing guarantee is made. Historical overwritten handwriting
cannot be reconstructed. No new provider secret or paid-plan upgrade was introduced.

## Complete changed-file manifest

Compared with baseline `db7a664`, the release changes57 files (including this
record). Unchanged136-card bank and unrelated game topic banks are not included.

- `CLAUDE.md`
- `api/hub-executor.js`
- `api/talk-wake.js`
- `docs/talk-vnext-acceptance.md`
- `hub-launcher.js`
- `lets-talk.html`
- `package.json`
- `play.html`
- `runtime/hub-executor-core.cjs`
- `runtime/story-executor.cjs`
- `runtime/talk-archive-store.cjs`
- `runtime/talk-wake-queue.cjs`
- `scripts/hub-executor-package-service.cjs`
- `scripts/hub-executor-production-smoke.cjs`
- `scripts/talk-archive-production-smoke.cjs`
- `scripts/talk-read-archive.cjs`
- `scripts/talk-vnext-production-smoke.cjs`
- `talk-engine.js`
- `talk-host.js`
- `talk-mode.md`
- `talk-settings.js`
- `talk-sync.js`
- `talk-ui.js`
- `talk-vnext.js`
- `talk.css`
- `tests/helpers/talk-vnext-fixture.cjs`
- `tests/hub-executor-api.test.cjs`
- `tests/hub-executor-manager.test.cjs`
- `tests/hub-executor-package-service.test.cjs`
- `tests/hub-executor-production-smoke.test.cjs`
- `tests/party-membership.test.cjs`
- `tests/story-executor.test.cjs`
- `tests/talk-archive-membership-service.test.cjs`
- `tests/talk-archive-membership.test.cjs`
- `tests/talk-archive-production-smoke.test.cjs`
- `tests/talk-archive-service.test.cjs`
- `tests/talk-challenge-archive.test.cjs`
- `tests/talk-crazy.test.cjs`
- `tests/talk-engine-modes.test.cjs`
- `tests/talk-engine.test.cjs`
- `tests/talk-host.test.cjs`
- `tests/talk-reset-carry.test.cjs`
- `tests/talk-round-clock.test.cjs`
- `tests/talk-service.test.cjs`
- `tests/talk-settings.test.cjs`
- `tests/talk-sync.test.cjs`
- `tests/talk-ui.browser.cjs`
- `tests/talk-ui.test.cjs`
- `tests/talk-vnext-host.browser.cjs`
- `tests/talk-vnext-production-smoke.test.cjs`
- `tests/talk-vnext-queue-handoff.test.cjs`
- `tests/talk-vnext-service.test.cjs`
- `tests/talk-vnext-store.test.cjs`
- `tests/talk-vnext-ui.browser.cjs`
- `tests/talk-vnext-wake-recovery.test.cjs`
- `tests/talk-vnext.test.cjs`
- `tests/talk-wake-queue.test.cjs`
