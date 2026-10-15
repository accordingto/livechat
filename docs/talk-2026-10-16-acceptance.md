# Crazy Talk three-player roles and presence check-in — 2026-10-16

This follow-up changes the existing game letstalk / gameMode crazy. It does not
create another room or multiplayer transport. Earlier full vNext evidence is in
[talk-vnext-acceptance.md](talk-vnext-acceptance.md); those previous counts are
not evidence for this follow-up.

## Product behavior

- New Crazy setup defaults to Director mode, with1 director/2 actors for3 players,
  2/2 for4, and2/3 for5. Actors chat/perform and cannot submit challenges; this is
  enforced by authority as well as UI. Directors retain the original4-minute
  single-pair rotation and wait for busy actors. Main sharing order follows roles
  through rotation, membership and departure. Free play remains selectable.
- New Director setup needs3 active people. Existing Director sessions falling
  below3 safely use free play without discarding the preference. A2-person new
  room can explicitly select free play. Existing saved free games are not
  silently converted during a pending task.
- Setup preferences now use lets-talk-settings.v3. An old v2 record's automatic
  free default migrates to director once while retaining other settings; an
  explicit free choice saved in v3 persists. Existing authoritative live settings
  remain visible when reconnecting to their room.
- The challenge composer starts open and opens again for a new session. Manual
  collapse remains respected during updates. Drafts, IME, caret, native recipient
  pickers, next-message editing and exact frozen retries remain intact.
- Retain the quiet30-second reminder. A rendered pending mission without related
  manual response gets one private nonmodal Are you still here? / 你還在嗎？ box
  at140 seconds for the default150-second task. Shorter tasks use10 seconds before
  expiry; longer tasks still check at140 seconds. There is no deadline countdown,
  sound, focus jump or blocking modal. Done and Skip remain available.
- I'm here / 我在，繼續接任務 sends crazyHere with the exact session, recipient,
  prompt ID and version. Duplicate requests produce one checked_in event. It
  changes neither score, task expiry nor cooldown. At expiry the old task still
  closes and frees its slot, while that participant remains able to receive the
  next task. No response still pauses receiving; Resume remains available.
  Technical render ACK is separate and never counts as a human response.
- Here applies only to its task lifecycle. A replacement/new task has fresh
  response state. Missing sessions, another recipient, stale/expired tasks and
  repeated IDs cannot carry activity or points into a new task.
- The private native queue wake includes the check-in boundary. Authority records
  checkInReadyAt and check_in_available once to force projection even when the
  previous publication was less than15 seconds ago. Pulse markers include that
  state and participation so later expiry is not deduplicated incorrectly. The
  player paints visibility using authoritative checkInAt as a clock fallback.
- Hidden check-in/reminder rows exist before technical ACK. Publishing a timer,
  ACK or check-in update for the same task retains focused action nodes, including
  a pointer already held over Skip. New task/text/offer/session changes still
  refresh their actual content. No previous task can remain actionable.

## Release and verification

- Final gameplay frontend source: 0764c2d.
- Backend source2f2f205; deployment dpl_33zZiGdg9DhkJ19T1KoM9iR8iG18 is READY.
  Stable service https://icebreaker-youtube-search.vercel.app/api/hub-executor .
  Deployment https://icebreaker-youtube-search-r7dbfma1k-willintaiwan.vercel.app .
- Stable frontend https://livechat-two-alpha.vercel.app/ . Scoped Talk caches are
  vnext-5 / talk-vnext-5; unchanged shared browser executor stays life-story-1.
- Final integrated `node --test tests/*.test.cjs`: **2006/2006** pass, no
  failures, cancellations or skips. Final log: outputs/talk-1016-final-regression.log.
  Changed JS/CJS syntax35/35 and git diff --check pass.
- Existing real Chrome native-picker/draft/IME, five-player authority and bilingual
  host harnesses pass after the initial follow-up. Final `tests/talk-ui.browser.cjs` keeps the same focused Skip node through
  pre-ACK, ACK,30s and140s updates; pointerdown/update/pointerup submits on the
  first click. It also retains five sends, ten native popups, drafts, caret, IME
  and vault editors. New `tests/talk-vnext-presence.browser.cjs` passes with three
  independent actual play.html contexts, default role/compose permissions, real
  DOM render ACK, Here/duplicate/expiry divergence, redispatch, stale mailbox AND
  direct-RPC fencing. All12 EN/ZH375px layout checks pass, zero page errors or
  dialogs. These local browser checks use a foreground injected clock and
  synthetic authenticated authority; they do not establish queue autonomy.
- Actual production three-player HTTP/Firebase/native-queue run passes192 checks
  and all5 flags: default1 director/2 actors; autonomous140-second private check-in
  publication; exact-once Here without extra time or points; real150-second expiry
  leaves the responsive actor ready while the silent actor pauses; next task plus
  stale-Here fencing. No production clock is injected. Exactly5 fixture nodes
  (canonical +3 private cards +encrypted sidecar) were removed with ownership and
  ETag checks, zero cleanup failures, no existing room access.
- Final stable-host source0764c2d: Talk19/19, shared executor62/62 and
  preserved Life Story164/164 assets match. Service health/CORS/invalid-ticket
  checks pass;14/14 private source/question bodies and both hosts' private
  callback GET/POST4/4 remain blocked. Read-only production host demo loads
  17/17 SHA256-matching assets, passes13 gameplay/default flags and16 EN/ZH
  320/375 screenshots without horizontal overflow or page errors. Zero room/API
  requests; external SDK requests are stubbed for this demo. Report/harness/PNGs
  are in outputs/talk-1016-production-demo/.
- Package61 files with55 exact Hub source/assets; all62 files including ignore
  configuration are synchronized to the original independent service source.
  The final browser-focus correction does not change any packaged backend file.
- Initial unscoped CLI deploy returned Not authorized. Project/account were
  verified, then the explicit existing willintaiwan scope succeeded. No secret or
  account was changed and no authentication material was printed.

Evidence: task outputs/talk-1016-regression.log,
talk-1016-production-check-in.log, talk-1016-production-demo/report.json, and
the repeatable new three-player browser harness and its reported command output.
The production long test uses synthetic identities and original real authority;
Chrome tests use local authenticated service/Firebase fixtures. These are not
human voice playtests or physical-phone/background-OS tests.

## Limitations retained

Vault ownership remains same room +original verified player link, not a cross-room
account. Draft restoration uses browser storage and the same session. Render ACK
proves DOM presentation only; Done remains self-reported. Queue/network latency
can delay scheduled delivery; no hard real-time guarantee is made. Physical
phones, OS suspension, real human voice play and varied mobile networks were not
validated. Existing free sessions must intentionally choose Director for a future
round if their authoritative current choice was free.

## Changed files

41 files compared with a667832 (including documentation and tests):

- `CLAUDE.md`
- `docs/talk-2026-10-16-acceptance.md`
- `hub-launcher.js`
- `lets-talk.html`
- `play.html`
- `runtime/hub-executor-core.cjs`
- `runtime/story-executor.cjs`
- `scripts/talk-archive-production-smoke.cjs`
- `scripts/talk-vnext-production-smoke.cjs`
- `talk-engine.js`
- `talk-host.js`
- `talk-mode.md`
- `talk-settings.js`
- `talk-ui.js`
- `talk-vnext.js`
- `talk.css`
- `tests/helpers/talk-vnext-fixture.cjs`
- `tests/hub-executor-manager.test.cjs`
- `tests/party-membership.test.cjs`
- `tests/story-executor.test.cjs`
- `tests/talk-archive-membership-service.test.cjs`
- `tests/talk-archive-membership.test.cjs`
- `tests/talk-archive-service.test.cjs`
- `tests/talk-challenge-archive.test.cjs`
- `tests/talk-crazy.test.cjs`
- `tests/talk-engine-modes.test.cjs`
- `tests/talk-host.test.cjs`
- `tests/talk-reset-carry.test.cjs`
- `tests/talk-round-clock.test.cjs`
- `tests/talk-service.test.cjs`
- `tests/talk-settings.test.cjs`
- `tests/talk-sync.test.cjs`
- `tests/talk-ui.browser.cjs`
- `tests/talk-ui.test.cjs`
- `tests/talk-vnext-host.browser.cjs`
- `tests/talk-vnext-presence.browser.cjs`
- `tests/talk-vnext-presence.test.cjs`
- `tests/talk-vnext-production-smoke.test.cjs`
- `tests/talk-vnext-service.test.cjs`
- `tests/talk-vnext-ui.browser.cjs`
- `tests/talk-vnext.test.cjs`
