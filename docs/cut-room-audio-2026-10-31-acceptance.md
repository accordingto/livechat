# CUT room audio — 2026-10-31

The user requested music and effects on each player's own device, with the host
choosing tracks/effects and controlling volume. This extends the existing CUT
entry and original player cards; it does not add a separate player interface.

## Behavior and authority

- Host controls four background choices, Stop, eight manual effects, separate
  music/effects volumes, and a fixed or nonrepeating random CUT effect. Local
  audio loading is independent of publishing a room command. Volume dragging
  coalesces requests; its final change flushes immediately.
- Each player explicitly enables their own audio once and retains a local mute.
  Both legacy lease-host and independent-executor cards follow room settings.
  The host is also a follower, so it does not play a second local copy of an
  effect before the room event arrives. Host local mute does not mute players.
- Canonical `state.audio` stores version/revision, selected music and its
  server-time epoch, two volumes, autoScare/cutEffect, and the latest bounded
  manual `{id,at,key}` event. Engine authentication permits only host actor 0
  to change it, including through the real independent executor. Shared player
  gameplay control does not grant audio control. Player projections include
  only public audio data, their own audio acknowledgement and safe capabilities.
- Audio uses separate dedup/reply state and does not advance gameplay turns,
  modify topics/fairness/deadlines, or overwrite pending player game actions.
  Existing due server pulses still advance the game normally. Each new CUT
  captures one shared effect without consuming the gameplay random generator.
- Reconnect/unmute resumes current music from its server-time position, consumes
  old manual events, and never replays an old CUT. Session changes, mute, hiding,
  disconnection and teardown cancel pending playback. Network/decoder/device
  latency remains possible; this is not sample-perfect synchronized playback.

Classic CUT retains its existing cues with the room effects-volume multiplier.
Halloween uses the existing recordings, backgrounds and optional synthesized
music. Rules, timing, manual Start, pool weights and other Hub games are unchanged.

## Executed local checks

Full Hub regression: **2517/2517 passed**, recorded outside deployment in
`../cut-room-audio-review/hub-unit-results.txt`. The initial full run exposed
an older Mode 2 host-VM fixture missing the newly used timer API; the fixture
was corrected, its 20 checks passed, and the full suite was rerun successfully.

The focused command below passed **51/51** against the current integration:

`node --test tests/cut-room-audio.test.cjs tests/cut-room-audio-host.test.cjs tests/cut-room-audio-follow.test.cjs tests/hub-executor-manager.test.cjs`

Log: `../cut-halloween-review/room-audio-docs-focused.txt` outside deployment.
Coverage includes host-only control and validation, separate acknowledgements,
real authenticated executor transport, equivalent seeded game trajectories,
captured CUT choices, follower dedup/reconnect, pending async cancellation,
volume-drag coalescing/draft retention, publishing while local unlock is pending,
unchanged running clocks/topic DOM, restart choices and close cleanup.

The host UI and original CUT UI suite also passed **42/42** in
`../cut-halloween-review/room-audio-host-tests.txt`. The new controller contributes
four tests; the rest preserve existing player/host behavior. A real browser
range step mismatch discovered during QA was corrected by giving both volume
sliders one-point steps.

`tests/cut-room-audio.browser.cjs`: **18 checks, 4 screenshots, zero page
errors**, 390px and 1280px, zero measured horizontal overflow. A real CUT host
and three original `play.html` cards run in separate contexts over a
production-rules-compatible local database, decoding/starting/stopping the
actual MP3s. Verified room settings on every card, lazy/muted devices, host
track and volume changes, manual effect exactly once, volume changes without
music restart, local mute, late enable/reload without stale effects, one same
fixed/random CUT recording on every device, continuous music through settings
and manual-ready transitions, and Stop on every device. Report/captures:
`../cut-room-audio-review/browser-qa/report.json` and its sibling PNGs.

The earlier audio harness was also rerun against this integration: **6 grouped
checks passed**, with all ten recordings decoding at both widths. These are
objective playback-path checks. Physical phones, human listening, audio from
real speakers and a live spoken group session are not claimed here. Local
fixtures alone do not establish a successful cloud deployment.

## Assets and release verification

No new MP3, bitmap, font or dependency is introduced. The existing ten MP3s total
523,917 bytes; the complete 12-file media pack remains **547,229 bytes**.
The manifest and `LICENSES.md` remain the source of provenance, CC0 licenses,
recording/foley limitations and asset hashes. Source originals, conversion
tools, recordings and QA captures stay outside production. The executor stores
settings/events only; it does not include the MP3 directory or stream audio.
The isolated service source package contains **65 files / 2,659,025 bytes**;
only `cut-engine.js` differs semantically from the prior service package.

CUT scripts/styles use `cut-15`, media remains pack v1. Deploy the matched
frontend and existing independent executor, retaining existing secrets, routes
and unrelated games. Then run the production smoke against fresh marked nodes,
check host/player authority and owned-node cleanup, and read back the stable
frontend/cache/media bytes against the release commit. Record actual deployment
identities, cloud output measurements, full-suite results and production reports
only after those checks execute. Source/asset bytes do not establish current
Vercel Usage, retention storage, traffic or remaining account headroom.

## Verified production service

The existing service is READY as **dpl_7mHFen8vYoCRz9VExEWy2CK4qUAw**, aliased
to `https://icebreaker-youtube-search.vercel.app`. The expanded CUT smoke passes
**89 checks**, retaining 13 original/style-comparison draws and adding host
audio settings/events, idempotence, invalid-volume rejection, music epoch
preservation, player forgery denial and all-card projections. All **4/4** fresh
marked nodes were removed with no cleanup failures.

The first run stopped after 67 checks because RTDB reordered a nested event's
keys while canonical stateJson retained insertion order. The comparison now
normalizes that event, and the offline fake sorts keys like Firebase; all
**12 safety checks** and the live rerun pass. This required no engine change
or second service deployment. Boundary readback confirms readiness, CORS,
invalid-ticket rejection, private runtime 404, search 200 and retired lyrics 410.

No media is added. Nine changed public runtime files add **16,528 bytes** of
normalized local source. CLI reported a 58.3 KB incremental upload, which is
not full output size. The cloud build API reports hub-executor **913,467**,
talk-wake **912,545**, discovery **6,618**, lyrics **3,085** bytes: **1,835,715**
total reported function bytes, **2,938** more than the previous release. Hobby
was confirmed via API. Current Usage and frontend account headroom remain
unavailable; no storage/notification policy or paid plan was changed.

After the single frontend publication, record its GitHub Vercel success and
exact committed static/media readback in
`../cut-room-audio-review/production-readback.json`. The matching service source
comparison is included there; these release artifacts stay outside deployment.
