# Crazy Talk automatic role balance — 2026-10-16

Published gameplay source `7ec1925` on the existing frontend and executor. This
follow-up supersedes the earlier fixed two-director cap and minimum 3 Director
setup. It changes no room system, source bank or external voice controls.

## Behavior

For every supported Hub count 2–9, desired directors = floor(active participants/2)
and actors = ceil(active participants/2). The splits are 1/1, 1/2, 2/2, 2/3, 3/3,
3/4, 4/4, 4/5 respectively. Directors never outnumber actors. Explicit free stays free.

The count is derived from the current active, non-pending participant roster,
not hardcoded per room size and not capped at two. Old automatic directorCount 2
and oversized metadata are migrated by authoritative pulses. Membership and
legacy exclude paths rebalance the roles and keep main sharing assigned to an
actor. At fewer than 2 active participants, the existing safe free fallback retains
the Director preference. New Director setup supports 2 people with 1/1.

An actor's active task is never cancelled to make room for another director.
The system retains existing directors where possible, caps them at floor(N/2),
and fills additional seats from idle actors. If all candidates are busy, there
can temporarily be fewer directors; the inequality remains safe and the target
fills as tasks close. Single-pair rotation and fixed-target queue rules remain.

UI copy in both languages describes even splitting, an extra actor for odd
counts and rotation. No extra settings or player buttons were added. The open
composer, quiet 140-second check-in, 30-second reminder, exact prompt controls,
private vault and round ending are unchanged. Scoped Talk caches: vnext-6 and
talk-vnext-6. Existing explicitly free sessions are not converted to Director.

## Verification and deployment

- Final complete `node --test tests/*.test.cjs`: **2017/2017 pass**, zero failures,
  cancellations or skips. Log: outputs/talk-role-balance-final-regression.log.
- Pure role/presence/lifecycle suites 61/61, UI/host/settings 88/88. All 2–9 sizes,
  legacy count migration, excessive metadata, add/remove/sit-out, pending-actor
  underfill and refill, two-player rotation, actor-only main sharing and explicit
  free compatibility are covered. Authenticated service tests also exercise all
  sizes, director-only submission, private delivery and exactly-once completion.
- Actual Chrome native selector/mission-focus/draft/IME/vault regression and
  bilingual host demo pass. Host setup is tested for every supported count 2–9;
  player editor cases 2/6/9 and invalid one-active setup are covered.
- Production synthetic rooms for 2, 6, 7, 8, 9 participants pass **902 checks** in total:
  respectively 110, 174, 190, 206, 222. The real service projects 1/1, 3/3, 3/4, 4/4, 4/5;
  directors can write, actors cannot, secret text stays private, and completing
  the actor mission awards 1 and reaches sorting. Every fixture cleans exactly
  N+2 owned nodes with marker/session/archive-ownership/ETag guards: **42/42**,
  zero cleanup failures. No existing room is read or changed. Log:
  outputs/talk-role-balance-production.log. Unlike the earlier presence test,
  this short ratio smoke does not claim to re-wait 140/150 seconds.
- Stable frontend https://livechat-two-alpha.vercel.app/ matches source `7ec1925`:
  Talk 19/19 and shared executor 62/62 asset checks pass, API ready/CORS/synthetic
  rejection/private runtime blocking pass. Final Life Story assets pass 164/164;
  service ready, CORS and synthetic rejection pass; private response bodies blocked 14/14.
- Read-only production host demo: 17/17 actually loaded assets SHA256-match,
  all 13 flags, generic English/Chinese balance hint and minimum 2 label confirmed;
  16 EN/ZH 320/375 screenshots have no overflow/errors. Zero room/API requests,
  external SDKs stubbed. Report/harness/PNGs:
  outputs/talk-role-balance-production-demo/ .
- Existing independent service deployment **dpl_7ECbSUcAJvdqoiPmZPDaTbC2fAei**
  is READY at https://icebreaker-youtube-search.vercel.app/api/hub-executor .
  Deployment URL: https://icebreaker-youtube-search-d60qkm4q2-willintaiwan.vercel.app .
  Explicit existing willintaiwan CLI scope succeeded; no secret/account changes.
- Package 61 files, 55 exact Hub source/assets. All 62 files including ignore config
  are synchronized back to the original service source. Fifteen changed JS/CJS
  syntax checks and git diff --check pass. Unrelated search handlers and all 96
  Life Story questions remain packaged.

Local/browser tests use synthetic authenticated clients and injected clocks;
production role smoke uses the real HTTP/Firebase authority. Neither establishes
physical-phone, human group voice play or mobile OS suspension behavior. Existing
same-room/original-player-link vault ownership and provider-delay limits remain.
Previous release evidence is retained in talk-2026-10-16-acceptance.md and
talk-vnext-acceptance.md under their own source/version scopes.

## Changed files

20 files compared with b95784e, including documentation/tests:

- `CLAUDE.md`
- `docs/talk-director-balance-acceptance.md`
- `hub-launcher.js`
- `lets-talk.html`
- `play.html`
- `scripts/talk-vnext-production-smoke.cjs`
- `talk-engine.js`
- `talk-host.js`
- `talk-mode.md`
- `talk-ui.js`
- `talk-vnext.js`
- `tests/party-membership.test.cjs`
- `tests/talk-host.test.cjs`
- `tests/talk-ui.test.cjs`
- `tests/talk-vnext-host.browser.cjs`
- `tests/talk-vnext-presence.test.cjs`
- `tests/talk-vnext-production-smoke.test.cjs`
- `tests/talk-vnext-roles.test.cjs`
- `tests/talk-vnext-service.test.cjs`
- `tests/talk-vnext.test.cjs`
