# CUT Halloween — recorded audio and story openings, 2026-10-31

The user requested more realistic Halloween audio and a separate story-opening
topic choice to compare with the existing situations. The entry remains
`cut.html`; original `play.html` seats, room authority, rules and manual Start
remain in use. Topic content is simple English; interface controls remain
bilingual. No microphone, voice API, AI judgment or package dependency was added.

## Resulting behavior

- Original situations remain the default: 40 Take Over + 30 Jump In topics,
  unchanged as serialized data against the pre-change Git version. An additional
  40 + 30 story openings have separate IDs: 140 Halloween topics total.
  The four pools live in `cut-halloween-topics.js` and never mix automatically.
- Host and supported shared-player settings select `situations` or
  `story_openings`. Changing the Halloween style opens a new ready topic and
  waits for Start. Saving the same style or cancelling preserves the topic and
  elapsed clock; reload retains the live topic, deadline and style. Ordinary
  next/restart retain the selected style and existing restart-history policy.
- Canonical `topicStyle` and the existing topic histories stay in the original
  authoritative state. Players receive public style metadata, not histories or
  hidden CUT deadlines. An older service without `topicStyles` gets no new
  card control. Browsing the new library does not redraw the active topic.
- Eight self-hosted recorded effects replace synthesized scares. Wind and rain
  are optional 18-second recorded ambience loops; original musicbox and crawl
  synth tunes remain separate choices. CUT random scares avoid immediate
  repeats; disabling random scares uses a short recorded bell. GO/time/tick use
  compact bell/heartbeat excerpts; no extra reveal hit layers over a CUT.
- Audio loads after a gesture. Quiet cards create no AudioContext or media
  request. Each card stays muted until its own user enables it. Failed loads
  show a retry message without a synthetic scare fallback or gameplay command.
  Mute, hide, disconnect and teardown stop cues; stale resume/module/decode
  completion cannot replay or repaint. Sound does not close a borrowed host
  Board; a card closes its own Board and context.

## Actual local checks

- Full Hub suite: **2480 passed, 0 failed**, recorded in
  `../cut-halloween-review/hub-unit-results.txt`. This is local execution,
  not evidence of a production deployment.
- Focused command:
  `node --test tests/cut-halloween-audio.test.cjs tests/cut-halloween-card-audio.test.cjs tests/cut-halloween-stories.test.cjs tests/cut-integration.test.cjs`:
  **48 passed** (Board 17, adapter/card 15, story/authority 10, integration 6).
  Includes load/decode retry, no synth fallback, late-work cancellation,
  ownership, classic cue preservation, pool/history boundaries and cache tags.
- The adapter regressions caught an unconditional post-unlock card repaint and
  a stale unlock failure overwriting the muted status. Epoch/context guards and
  callback-owned painting now pass both pending-success and pending-rejection
  branches.
- `tests/cut-halloween.browser.cjs`: **24 workflow checks**, **12 screenshots**,
  zero page errors, zero measured horizontal overflow/topic clipping at 390px
  and 1280px. Real host and three original player links use separate browser
  contexts with the real trusted-host sync over an isolated Firebase-compatible
  in-memory fixture. Covers both styles/modes, player selection, host/card
  reload, live clock/deadline preservation, next/restart, topic library and an
  older-service projection. External network was blocked.
- `tests/cut-halloween-audio.browser.cjs`: **6 grouped checks**, **2 screenshots**,
  zero page errors, real Chrome Web Audio decoding and source start/stop using
  the ten shipped MP3 files. Both viewports verify lazy loading, eight mono
  effects, wind/rain, hidden-page cleanup, an original player card's recorded
  CUT and mute suppression, and no effect oscillators. Chrome resampled the
  encoded 44.1 kHz files to its 48 kHz context. This is objective playback-path
  verification, not a human listening test.
- All ten MP3 files decode without FFmpeg errors; file lengths and SHA256 match
  the manifest. Mono 44.1 kHz/64 kbps; FX range 1.78–8 seconds and both ambience
  files are 18 seconds. Maximum measured true peak is **−4.89 dBTP**. Entry/exit
  fades and a one-second ambience end/start crossfade are included.

Browser reports/captures stay outside the repo in
`../cut-halloween-review/browser-qa/{report.json,audio-report.json,...png}`;
asset validation is `../cut-halloween-review/audio-final-validation.json`.
No live Firebase rooms, physical phones/speakers, subjective sound-quality
listening, or real spoken group session were verified by these local checks.

## Sources and capacity

The authority for exact sources, licenses, excerpts, hashes and objective
measurements is `assets/cut-halloween/audio-v1/manifest.json`; human-readable
credits are in its `LICENSES.md`. All ten sources are **CC0-1.0**.
Scream/laugh/ghost use human voice/breath. NaturesTemper's howl is a processed
human imitation, not a wildlife recording. The heartbeat source does not say
whether it is a real heart or foley; its recording type remains unspecified.

Ten MP3s total **523,917 bytes**. The complete new media directory has 12 files
and **547,229 bytes** including manifest/credits; the largest files are wind
and rain at **144,656 bytes each**. These are measured local production asset
bytes. The eight effects load once per enabled Board; ambience loads on first
selection and uses browser caching. Source originals/archives, conversion
tools/intermediates and QA captures stay outside the production repository.

The new media total is not the total Vercel deployment output, retained
Deployment/Functions Storage, transfer, or remaining allowance. Current team
Usage and headroom require account access and remain unconfirmed here. No
retention policy, plan, notification threshold or paid service was changed.
Consolidate validated frontend changes into one release rather than repeated
full asset-batch deployments.

## Production service and release verification

The existing executor was deployed as **dpl_D971DLjZp7xx9uGab3shVwVVAqFo**,
READY and aliased to `https://icebreaker-youtube-search.vercel.app`.
Only `cut-engine.js` and `cut-halloween-topics.js` differ semantically from
the previous service package; other differences are Windows line endings.
Search handlers, service secrets, routes and regions are preserved.

- Expanded `scripts/cut-halloween-production-smoke.cjs`: **58 live checks
  passed**, 13 actual topic draws across both styles/modes, manual-ready
  transitions and both restarts. All **4/4** marked disposable nodes removed;
  no cleanup failures or existing-room access.
- `scripts/service-modes-production-smoke.cjs --live`: **34 checks passed**,
  BLUFF PARTY and Once Upon a Time, service readiness/CORS/invalid-ticket/private
  runtime protection, search 200 and retired lyrics 410. Cleanup: 15 tracked,
  14 deleted, 1 already empty, 0 failures.
- Existing independent search-service unit suite: **39/39 passed**.

The isolated CLI source package contains **65 files / 2,653,615 bytes** and no
MP3s, secrets or QA captures. CLI reported a 283.3 KB incremental upload; this
is not the full output size. Current Hobby plan was confirmed through the API.
The cloud build API reports four function bundles: hub-executor 911,998 bytes,
talk-wake 911,076, discovery 6,618, lyrics 3,085 (1,832,777 bytes total).
These reported bundle sizes are not a billed storage/headroom measurement.
The source package is below the documented Hobby CLI source-upload cap of
100 MB ([Vercel limits](https://vercel.com/docs/limits)). Current Usage remains
inaccessible; no claim of remaining allowance is made.

Publish this frontend revision once and verify the stable CUT pages, scripts,
cache tags and every shipped MP3 against committed Git bytes. Release identity
and final readback results are stored outside deployment in
`../cut-halloween-review/production-readback.json`; inspect the corresponding
GitHub commit's Vercel status for its frontend deployment identity. Both
deployments are required. CUT cache tags are `cut-14`, media pack v1; the
earlier `cut-13` smoke does not verify this release.
