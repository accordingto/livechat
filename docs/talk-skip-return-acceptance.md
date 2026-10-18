# Crazy Talk source-aware skip and private card returns — 2026-10-18

## Implemented behavior

- Completing either source still awards exactly +1 and starts the existing
  30-second personal rest.
- Skipping a player-authored task deducts exactly 1, including from zero to -1,
  and starts the same 30-second rest. Normal expiry or a stale command does not
  incur that manual-skip penalty. Crazy score normalization now preserves signed
  integers through pulses/reconnects; Normal Talk retains its previous rules.
- Skipping a system task costs zero and starts no rest. The engine tries one
  immediate different system card for that same eligible player with a fresh
  task lifetime. It excludes both the previous ID and previous text. Eligible
  queued handwriting retains priority. Role, receiving, pause, source, capacity
  and round-state rules still apply; no new system card is issued during
  decision, extension or draining, and an unfilled redraw is not retained as a
  stale request that can overwrite later work.
- Repeated requests cannot deduct twice, duplicate a return or replace the new
  prompt again. The private last-result projection contains only the current
  recipient's bounded result metadata, with no task text or author identity.
  The UI uses source-specific Skip labels/hints and quiet eight-second feedback.

## Returned-card workflow and privacy

A skipped handwritten card creates a separate deterministic returned copy in
the existing identity-keyed encrypted vault. Its original verified owner was
captured when the card was accepted; a new token at the same player number/name
cannot inherit it. The original executed card and its archived/reveal text stay
unchanged. The recipient's penalty and the author's returned-copy creation share
the existing authoritative action/CAS/persistence flow.

Only the author receives `crazy.returnedCards`. Pending returns are excluded from
the ordinary saved library and are never automatically queued or resent. The
private return section is immediately below the composer, or below the topic for
an author who is now an actor. Each entry has a prefilled editable task and two
actions: Save privately (original or edited text), and Delete this card. Saving
moves it to the existing library for a later explicit Send again; deleting marks
the returned copy with a versioned tombstone. Generic library commands cannot
bypass the unresolved-return choice. The author can resolve it after rotation,
while inactive, after a round ends or in a later same-room session.

Unresolved returns stay private until handled. Save/Delete do not rewrite the
already executed original recap; a revised private task cannot leak through that
recap. The original skipped performance can still appear in the existing final
reveal. Pending returned editors remain connected across ordinary sync updates,
with focus, selection and Chinese composition protected. A Save receipt arriving
while a newer draft is being composed preserves it in the vault editor, including
during sorting/end. New sessions and lost authoritative ownership still enforce
the existing privacy fences.

The existing archive supports encrypted vault status `returned` and restores its
pending-return flag during hydration. Save/Delete versioning and acknowledgement
fences prevent stale records from resurrecting a handled copy. A bounded
`skip_penalty` event records `points:-1`, actor/recipient/prompt/card/source and
time without adding secret text to metadata. Persistence failures withhold success
receipts and are safely retried without repeating score or return creation.

## Validation and release evidence

Gameplay source **1992fe4** is published on both existing hosts. It is based on
remote main **516715f**, preserving the concurrently published Talk Bomb v3.1
changes. Earlier acceptance records retain their own source/deployment scope.

- Final merged full suite: `node --test --test-concurrency=4 tests/*.test.cjs`,
  **2131/2131 pass**, zero failures/cancellations/skips. Evidence:
  `outputs/talk-skip-return-final-regression.log`. The pre-merge Crazy change
  also passed 2055/2055 before integrating the new Bomb tests. Obsolete Skip score
  expectations were updated without weakening role/deadline/snapshot checks.
  An unrelated 1ms frozen-tab test repeatedly raced its own arm call; only its
  test now controls time deterministically, retaining overdue/once-only behavior.
  No next-round game code changed.
- Focused backend rules/module/service/archive/reset checks pass 109/109; six
  independent authenticated service/privacy cases cover concurrent/exact retries,
  original owner after rebinding/rotation/inactivity, hydration, tombstones,
  immutable recap and persistence-failure receipts. The owned production-script
  fixture passes 8/8 locally, including strict exact-node cleanup.
- UI unit checks pass **65/65**. Five actual play.html clients with synthetic
  authenticated HTTP/ETag authority pass **15 flags** and **12 EN/ZH 320/375
  captures**, with no errors/dialogs. This was rerun after the Bomb integration.
  Native selector/mission/vault tests retain five sends/ten popups; inspiration
  and host regressions pass. Independent native Chrome MutationObserver review
  confirms zero editor removals while composing during an ended-phase Save ACK,
  then the same focused node/newer draft enters the open vault after composition.
  Evidence: `outputs/talk-returned-tasks/report.json` and 12 PNGs.
- Actual production API smoke passes **396 checks**: free immediate different
  system card with full TTL/no rest, queued handwriting priority, exact-once
  penalty/private return, foreign-owner rejection, unchanged/edit/save/delete
  choices, immutable original recap, encrypted cross-session vault and one
  persisted penalty event per skipped player task. It uses the real executor,
  Firebase, encrypted archive and synthetic identities. **7/7** exact owned
  nodes are conditionally cleaned, zero cleanup failures. No existing room is
  accessed. Evidence: `outputs/talk-skip-return-production.log` and its wrapper.
- Read-only stable production host demo: **17/17** actually loaded assets
  SHA256-match source 1992fe4 before instrumentation, **11 flags**, **12 EN/ZH
  320/375 captures**, no overflow/errors/dialogs, zero room/API requests; two
  external SDKs are stubbed. Player/system labels, private author editor, role
  change, save/delete, IME and task-button hover contrast are confirmed. Evidence:
  `outputs/talk-skip-return/report.json`, prepared production helper and PNGs.
- Direct stable-host file checks pass Talk **19/19**, shared executor **62/62**,
  Life Story **164/164**, and preserved Talk Bomb v3.1 **15/15**. API ready, CORS,
  synthetic-invalid-ticket rejection and private response-body blocking **14/14**
  pass. No local success is presented as a human/physical-device playtest.
- Existing independent executor deployment **dpl_FLkWvRXnGHnoHXDk8rHZyoSbqFpV**
  is **READY** at https://icebreaker-youtube-search.vercel.app/api/hub-executor .
  Deployment URL: https://icebreaker-youtube-search-6xynm1bgb-willintaiwan.vercel.app .
  The first CLI attempt reported Not authorized; the existing identity check
  succeeded and the scoped retry deployed the integrated package. No credential
  or account was changed. Frontend stays https://livechat-two-alpha.vercel.app/ .
- Final isolated package contains **61 files** and matches **55 exact Hub
  sources/assets**, including all 96 Life Story questions. **62** files including
  the ignore manifest are SHA256-verified back into the existing service source.
  All **21** changed/new JS/CJS files pass syntax checks; diff whitespace checks
  pass. Talk caches advance to vnext-8/talk-vnext-8. Bomb br-pacing-3-1, its
  timing module and unrelated search handlers are preserved.

## Limits

This uses the existing Let’s Talk Crazy mode, Hub rooms, Firebase authority,
private native Queue wake consumer and archive secrets. No second multiplayer
system, dependency, AI service, account or new secret was introduced. Private
vault identity remains scoped to the same room and original verified player
token; names are not credentials. An unresolved returned card persists across
reloads; a not-yet-saved editor revision follows the existing vault editor's
memory-only behavior across a full page reload. No physical-phone or human voice
playtest is implied by synthetic-client browser or production API tests.

## Changed files

27 files compared with 516715f, including final documentation:

- `CLAUDE.md`
- `docs/talk-skip-return-acceptance.md`
- `hub-launcher.js`
- `lets-talk.html`
- `play.html`
- `runtime/hub-executor-core.cjs`
- `runtime/story-executor.cjs`
- `runtime/talk-archive-store.cjs`
- `scripts/hub-executor-production-smoke.cjs`
- `scripts/talk-vnext-production-smoke.cjs`
- `talk-engine.js`
- `talk-mode.md`
- `talk-ui.js`
- `talk-vnext.js`
- `talk.css`
- `tests/next-round.test.cjs`
- `tests/talk-challenge-archive.test.cjs`
- `tests/talk-crazy.test.cjs`
- `tests/talk-director-timing.test.cjs`
- `tests/talk-return-privacy.test.cjs`
- `tests/talk-returned.browser.cjs`
- `tests/talk-skip-rules.test.cjs`
- `tests/talk-ui.browser.cjs`
- `tests/talk-ui.test.cjs`
- `tests/talk-vnext-production-smoke.test.cjs`
- `tests/talk-vnext-roles.test.cjs`
- `tests/talk-vnext.test.cjs`
