# Crazy Talk shorter rotation and director inspiration — 2026-10-17

## Behavior and historical evidence

The new default exchanges one director and one actor every **120 seconds**.
Setup still offers 2/4/6 minutes and accepts existing valid custom intervals
from 60 to 900 whole seconds. An actor's active mission remains intact and can
delay their exchange. No role count, external microphone, scoring, private card
projection or round-closing rule changes.

The user's original formal vNext specification described approximately four
minutes per exchange. The first director implementation, commit `48cc21e`, also
used 240 seconds. The subsequent style/role-balance changes did not increase that
setting; no earlier shorter plan was found in the reviewed source/documentation.
There is a separate reason tenure can feel longer: only one director leaves per
exchange. With D directors and idle candidates, a steady director tenure is about
D times the interval. Increasing the automatic director count to three or four
therefore made that tenure longer without changing the interval. At the new
default, all nine idle participants can have a first director turn within ten
minutes. This is a deterministic model/test result, not a human playtest claim.

Settings use `lets-talk-settings.v4`. A one-time v3/v2 migration treats a missing
or former-default 240-second value as 120, preserving other preferences and valid
custom intervals. The old storage had no provenance to distinguish an automatic
240 from a deliberate choice; either migrates once. Choosing four minutes again
in v4 preserves it. Existing authoritative live sessions retain their interval
and next exchange, including inherited new-topic choices.

The director's existing open composer gains a folded **Need ideas? / 找點靈感**
helper. It shows three short English/Traditional Chinese examples sampled from
16 curated existing public tasks. Refresh avoids the current three. Choosing an
example appends to the draft and focuses the same textarea for editing; it never
auto-sends, truncates or removes the existing draft. A combination over the
120-character limit leaves the draft untouched and displays a local explanation.
The receiving player still gets one ordinary private task through the existing
authoritative submission flow.

The complete 136-card pool, IDs and original English wording remain unchanged,
protected by a full-pool hash regression. Inspiration reads no archive, vault,
private task or room history and uses no AI/provider/network generation. Actors
do not receive the composer/helper. Existing focus, Chinese IME, native recipient
selector, reload draft and pending-send receipt protections remain required.

## Validation and publication

Gameplay source **554e2d5** is published on the existing frontend and executor.
Earlier acceptance records belong to their own source/deployment versions.

- Final complete `node --test --test-concurrency=4 tests/*.test.cjs`: **2033/2033
  pass**, zero failures/cancellations/skips. Evidence:
  `outputs/talk-director-help-final-regression.log`. The initial full run found
  two check-in fixtures that assumed the former rotation duration; those isolated
  reminder tests now explicitly use four minutes, while separate tests enforce
  the new default. An unrelated frozen-tab wall-clock test passed in isolation
  14/14 and in the final full suite; no unrelated product change was made.
- Timing/settings/host focused tests 81/81; content/helper and existing Crazy
  tests 38/38; UI unit tests 60/60. The final service/presence/timing set passes
  37/37. Custom/live durations, migration, busy actors, nine-person coverage,
  public-bank integrity, draft limits, role gating and frozen requests are tested.
- Actual Chrome host inspiration passes all 12 flags and four expanded EN/ZH
  320/375 screenshots with no overflow/errors/dialogs. Evidence:
  `outputs/talk-director-inspiration/report.json`. Existing selector/mission/vault
  browser tests pass five submissions/ten native popups. Five actual play.html
  clients pass all 14 integration flags; the host demo passes 11 flags. The
  three-client foreground/injected-clock check-in test passes its 140/150-second
  lifecycle, EN/ZH, focus/caret and 12 layouts with no errors/dialogs.
- Final production read-only inspiration browser for source 554e2d5 passes
  **17/17** SHA256-matched loaded assets, all **12** flags, four bilingual mobile
  screenshots and no errors/dialogs/overflow. It makes zero room/API requests;
  external SDKs are stubbed. Evidence: `outputs/talk-director-help/report.json`,
  prepared harness and four PNGs alongside.
- Actual owned five-player production smoke passes **183 checks**, including
  default 120-second rotation, two directors/three actors, director-only writing,
  private actor delivery, exactly-once completion and closing. After sending,
  rendering and completing one task, the fixture waits until the real rotation
  deadline without an execute/clock call or an open player page. The private
  native Queue automatically swaps exactly one director/actor and republishes
  all receiving roles; the test checks the authoritative state and every private
  canAssign projection. **7/7** exact owned nodes are conditionally cleaned, zero
  cleanup failures. Evidence: `outputs/talk-director-help-production.log` and
  its wrapper. No existing user room was read or changed.
- Stable frontend Talk **19/19**, shared executor **62/62** and Life Story
  **164/164** asset checks pass. Existing API ready, CORS and synthetic-ticket
  rejection pass. Private runtime/question response bodies remain blocked
  **14/14**. These are direct stable-host checks, separate from local tests.
- Existing executor deployment **dpl_J2tHRv2CRDyaeCL1rhRWSHFvzGdw** is **READY**
  at https://icebreaker-youtube-search.vercel.app/api/hub-executor . Deployment
  URL: https://icebreaker-youtube-search-pwcyfgjre-willintaiwan.vercel.app .
  An initial CLI deploy reported Not authorized; read-only account/project checks
  succeeded, and the scoped retry completed. No account or secret was changed.
- Isolated service package contains 61 files, verified against 55 exact Hub
  sources/assets and all 96 Life Story questions. All 62 files including the
  ignore manifest were SHA256-verified back into the existing service source.
  All 19 changed JS/CJS files pass syntax checks. Talk cache tags are vnext-7
  and talk-vnext-7; the unchanged shared browser executor retains life-story-1.

## Scope and limits

This remains the existing `game: letstalk`, `gameMode: crazy` implementation,
using the same rooms, original private player links, Firebase/CAS authority and
private native Queue wake consumer. No new dependency, secret, account, room
system or archive permission was introduced. Normal Let's Talk, other Hub games
and the separate search handlers must retain their existing behavior.

One pair changes at a time; a two-minute interval does not mean every director
leaves after two minutes. A busy selected actor can defer rotation. Existing live
rooms keep their chosen interval until changed through the normal setup flow.
Local multi-client browsers use an isolated authenticated authority and injected
time; the final 183-check probe uses actual HTTP/Firebase/native Queue time and
synthetic identities. Neither is a physical-phone or real human voice playtest.
Mobile OS suspension behavior and the existing same-room/original-link vault
identity limits remain outside this follow-up's verification.

## Changed files

25 files compared with bed089a, including final documentation:

- `CLAUDE.md`
- `docs/talk-director-help-acceptance.md`
- `hub-launcher.js`
- `lets-talk.html`
- `play.html`
- `scripts/talk-vnext-production-smoke.cjs`
- `talk-crazy.js`
- `talk-engine.js`
- `talk-host.js`
- `talk-mode.md`
- `talk-settings.js`
- `talk-ui.js`
- `talk-vnext.js`
- `talk.css`
- `tests/talk-crazy-content.test.cjs`
- `tests/talk-director-timing.test.cjs`
- `tests/talk-host.test.cjs`
- `tests/talk-inspiration.browser.cjs`
- `tests/talk-settings.test.cjs`
- `tests/talk-ui.browser.cjs`
- `tests/talk-ui.test.cjs`
- `tests/talk-vnext-presence.browser.cjs`
- `tests/talk-vnext-production-smoke.test.cjs`
- `tests/talk-vnext-service.test.cjs`
- `tests/talk-vnext.test.cjs`
