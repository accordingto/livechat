# 💣 Bomb Relay / 妙傳爆趣 — shared prompt edition

Read one shared prompt, say one fitting answer, and pass the hidden-fuse bomb.
An ordinary answer counts. A word, person, object, action, phrase, short line or
simple English description is enough; funny answers earn no extra points.
Full grammar, a true personal experience and private stories are not required.
Avoid obvious repeated answers within one bomb; specific elaborations can count.
The next bomb permits previous answers again. Players judge loosely by voice;
there is no answer input, recognition, recording, AI or automatic judging.

## Real entry and why old prompts were places

`index.html` links directly to `bomb-relay.html`. This game uses its existing
trusted host, not the independent `hub-executor` service or `hub-launcher`.
Original player links still open `play.html`, whose `bombrelay` branch mounts
`BOMB_RELAY_UI.Card` from the authority's filtered projection.

The former `bomb-relay-deck.js` contained 60 short scene titles: everyday 22,
nature 14, fun 14, fantasy 10. Nearly every title was a place or situated event.
The default Mixed used an unweighted shuffle of these 60 cards; it did not
filter to everyday, favor a category, or fetch a remote bank. English titles
always remained the main content; Chinese mode added a translation. Inspection
found no storage cache or load-failure fallback selecting a different bank.
Place-heavy content and the old “name one thing in the picture” instruction
caused the narrow impression, rather than an identified sampling bug.

## Source and drawing

- `content/bomb-relay-prompts.json` is the single editable active source.
  `node scripts/bomb-relay-build-catalog.cjs` generates the existing classic/CJS
  `bomb-relay-deck.js` and `content/bomb-relay-catalog-manifest.json`.
  `--check` rejects stale outputs. The real host and original player links load
  that generated deck, rather than a second standalone MJS or catalog page.
- The v2 audit found the existing 120 prompts exactly matched all five supplied
  fields (ID, pack, family, English, Traditional Chinese), with no additional
  custom prompts or local edits. All 120 are retained once, plus the supplied
  600 additions, with no wording edits. Final active count: 720 bilingual prompts,
  not 1440. Original-data SHA-256 is recorded in the generated manifest.
  Future valid custom additions/edits belong in the JSON and are retained by
  the builder; it validates duplicates without imposing a 720-item limit.
- Everyday / 日常聯想: 360 prompts. Playful / 趣味聯想: 360 prompts.
  There are 34 distinct families across the bank. Mixed / 混合 is the initial
  default with relative weights 1:1.
  This is a playtest starting point, not a validated optimum or alternation.
- `bomb-relay-selector.js` adapts the supplied pure selector to the existing
  classic browser/CJS architecture. It owns no storage, timer or network.
- `bomb-relay-engine.js` calls it once when preparing each new bomb, or for a
  host-only preview reroll. Future prompts are not predealt. `order` stores
  revealed IDs only; `promptHistory` stores the returned selector history.
- Configurable `CONFIG.promptWeights` and `familyWindow` (default 3) are copied
  into the canonical state. Sync `start` can set weights/familyWindow and keeps
  current values when omitted; engine restart can update them too.
- Exact ID reuse waits until the enabled pool is exhausted. Mixed draws the
  other pack when one is exhausted; only eligible seen IDs recycle. Recent
  families are avoided within the selected pack when alternatives exist;
  fallback is finite and avoids immediately repeating the last ID if possible.
- Unknown filters have an empty pool and invalid settings are rejected. Missing
  prompts show a reload message, with no silent fallback to old scenes.

The old 60 scene cards are in `content/bomb-relay-legacy-scenes.json`, generated
as `legacyItems`, and their SVGs remain on disk for
comparison and saved-card lookup. They are excluded from every new pool.
Legacy in-progress saves keep their displayed card, fuse, score and actual old
game length; future bombs use the new bank. Old category names map to Mixed
for future prompts. The legacy art builder uses `legacyItems` only.

## Reading, timer, passing and scores

The existing `ready` phase is an untimed full-table reading preview. Once
everyone understands the prompt, the holder lights it on their original
player card; the host retains the proxy Light button. The host can Change
prompt only during `ready`. Skipped previews also consume history. No extra
three-second timer is needed because this existing explicit preview is retained.

One prompt remains visible to everyone from preview through explosion. English
is always shown; Chinese UI adds a static understanding aid. Language changes
do not issue commands or draw prompts. Text cards replace specific scene art
so visuals do not suggest an answer list. Neutral bomb marks, a recognizable
explosion reveal, vibration and Web Audio cues remain.

The current Bomb rules/presentation cache tag is `br-discussion-1`; unchanged
deck/selector/timing helpers remain `br-expansion-2`, and audio remains
`br-sound-4`. Presentation retains charcoal/olive surfaces, warm
paper, a restrained brass accent, neutral player identities and a charcoal CSS
bomb with red sparks and a brief red flame/wave burst. Print-style English
prompt typography and consistent controls cover setup, play, library and results.
`bomb-relay-audio.js` embeds the approved lighter 52.5 ms recorded tick, played
once per second, plus the approved .52 s bass-reduced explosion. Cue buffers
match the reviewed demo at .6 playback gain. Pass/bounce sounds remain, phone
audio stays opt-in, mute stops active cues and disposal closes the context.
The tick cadence never speeds up or reflects remaining time. Visual motion is
also fixed and honours reduced-motion. Audio and explosion animation are
unchanged by the v2 timing/content expansion.
Phone player cards keep the prompt before Pass; host results and short host
viewports use normal scrolling so controls cannot cover content.

Before v2, the actual engine used Classic 10–60 s (default), Quick 8–25 s,
Relaxed 20–80 s, with one uniform seeded random draw:
`round((min + seededRandom * (max-min))*1000)`.
There was no participant adjustment, Easy/Hard or custom-seconds UI, automatic
answer-speed extension, or client-side fuse resampling. Untimed Ready and
pass-without-reset were already correct. These are measured source facts,
not an inference from the reported number of laps.

`bomb-relay-timing.js` adapts the supplied pure policy to classic/CJS. For a
new room without an explicit prior preference, Normal and participant scaling
are selected. At 2–3 eligible players: Fast 30–60 s (mean 45), Normal 60–100 s
(mean 80), Chill 90–150 s (mean 120). Each GO uses two independent uniforms:
`round(minMs + (maxMs-minMs)*(u1+u2)/2)`, a symmetric triangular distribution.
The user-selectable adjustment adds
`10 * (min(8, max(3, activePlayerCount)) - 3)` seconds to both ends once.
Six players add 30 s; eight add 50 s; nine show the capped adjustment.
Off uses base ranges. Counts come from distinct active roster seats, not
connections or the separate host display. Sit-out/rejoin changes only the next
GO count. The existing Hub room-count switch still fences the old coordinator;
it does not rewrite a running session's roster in place.

Old explicit Quick/Classic/Relaxed preferences remain their original uniform
ranges, with no scaling, via `settingsTiming.legacyFuse`. The three-option UI
shows a retention note, with no extra legacy button. Ordinary Restart, reopening
and unrelated edits retain this preference. An explicit speed/scaling change
opts into the new policy. An already running or paused legacy bomb always keeps
its saved deadline/remaining time. New pending settings live in canonical
`settingsTiming`; host-only `settings` commands never redraw or restart a fuse.

Only a validated Light/GO calls the sampler. Canonical `roundFuse` records
`roundId`, `startedAtMs`, `durationMs`, `explodeAtMs`, policy, mode, count and
range at GO. It is an immutable audit snapshot. The existing `state.explodeAt`
remains the effective deadline: emergency pause/resume shifts it using the
saved remaining time and original 2.5 s floor, without drawing again. Expiry
must read that effective deadline, not the snapshot's initial deadline after
a pause. Firebase's possibly fractional clock offset is rounded to milliseconds.
Session/turn IDs fence callbacks and duplicate command IDs remain ignored.

`explodeAt`, remaining time and RNG seed never reach player projections; no
remaining-time counter or progress bar is rendered. Host ticks check every
100 ms, but the absolute deadline determines late actions.

Passing follows numbered seat order, skipping sitting-out players. Only the
holder can pass on a player card; existing host proxy passing remains. Every
pass, bounce and pre-deadline sit-out keeps the same fuse and prompt. The old
challenge button returns an obvious repeated/off-topic answer to its speaker
once, without pausing. No skip, per-person countdown or handoff grace is added.
Duplicate command IDs and stale turns are rejected. Late pass/bounce/pause and
now sit-out check expiry first; an expired holder cannot escape by sitting out.
Old tick requests are scoped to their turn, so restart invalidates them.

The existing host emergency pause is retained (resume floor 2.5 s); it is not
a thinking aid or an automatic answer-dispute pause. Stop invalidates the fuse.
Explosion settles once: the holder takes one card. The existing 4.5 s explosion
presentation is followed by a fixed 45 s discussion, keeping the same prompt,
loser and result. Discussion uses the static explosion illustration and a short
chat hint; there is no countdown, alarm, duration setting or new control panel.
The existing Next button works for the host and every active player during both
boom and discussion, so nobody must wait all 45 s. Automatic expiry or Next
reveals only the next untimed Ready card; its holder or host still lights it.
The last card also gets the discussion before final standings; its existing
See the results button can finish early. After 5/10/15/20
cards (default 10), lowest card count wins, including ties. Ordinary Restart
clears that game's penalties and results, but preserves activity draw history.

## Authority and history lifecycle

The leased host writes the existing canonical Firebase document at
`rooms/{roomCode}/players/{bombRelayControlToken}`, JSON in `stateJson`.
`stateJson.promptHistory` has `seenIds`, `recentIds`, `recentFamilies`; recent
lists cap at 24. Only that host draws and runs the existing deadline pulse.
Player nodes receive the same current `cardId` via `engine.view`, never a
selector instance or a secret fuse. Firebase transaction retries use the same
captured time/seed and cannot consume another prompt.

The same canonical state schedules the conversation at explosion settlement:
`phaseUntil = now + 4500` in `boom`, then `discussionUntil = phaseUntil + 45000`.
At the first boundary, the authority changes `phase` to `discussion` and uses
that saved discussion deadline as `phaseUntil`, without drawing or scoring.
Old saved booms derive the missing deadline from their saved presentation end.
A late tick does not start a new 45 s period; a host sleeping past both deadlines
advances only once to Ready/results. Reconnecting preserves those boundaries.
Only the original leased-host pulse watches them; clients add no round timer.
Next/Restart/Stop discard the old deadline and advance session/turn fences;
stale ticks and duplicate Next cannot draw again or score twice. Host pagehide
or leaving the room stops its existing intervals, while saved deadlines remain
available for a valid reconnect/takeover.

History survives pass, language changes, pause/resume, reconnect, host lease
takeover, game switch back, settings edits, ordinary Restart and Play again.
New Room in the Hub starts a new activity/control token and fresh history.
Loading an older room resumes its retained history. Enabled-pool exhaustion
recycles only its seen IDs as described above; it does not clear other packs.
No cross-room or cross-user tracking is added.

The host page must stay open. Closing it does not reset or rerandomize the fuse;
on reconnect an overdue bomb settles under the existing host-authority model.
This remains a frontend-only release; no service deployment or secret change.

## Verification

Run the v2 attachment tests first, in its own directory:
`node scripts/build.mjs` and `node --test tests/*.test.mjs` (41 cases).
Do not replace Hub's package.json. Then check generated content:
`node scripts/bomb-relay-build-catalog.cjs --check`.
In the repository: `node --test tests/bomb-relay-*.test.cjs` and
`node --test tests/*.test.cjs`. Browser regression:
`node tests/bomb-relay-ui.browser.cjs <path-to-playwright>` uses disposable local
fixtures and a Firebase stand-in, never user rooms; run with
`BOMB_QA_PLAYERS=3`, `6`, `8` and a separate `BOMB_QA_OUTPUT` for each.
Read-only production assets:
`node scripts/bomb-relay-verify-release.cjs <commit>`.

After deployment, `node scripts/bomb-relay-production.browser.cjs --live
<path-to-playwright>` opens the real production host and three original player
pages with the real Firebase SDK. It creates only four fresh, random, marked
QA nodes; WebSocket and REST paths are allowlisted exactly. Cleanup requires
matching marker/session/browser owner plus ETag, and never deletes a parent.
The probe waits for a real Normal deadline without changing clocks or fuse
state. Host close releases its lease best-effort; the probe also accepts normal
lease expiry using the real server offset, then reloads and checks the saved
deadline. Firebase-omitted null holder fields are compared as null in boom views.
`--self-test` exercises ownership/lease guards offline without creating data.

Record actual release test counts and browser limits in `CLAUDE.md`. Unit tests
alone do not prove physical mobile or real multi-device voice-session behavior.
