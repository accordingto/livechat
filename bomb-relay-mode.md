# 💣 Bomb Relay / 妙傳爆趣 — shared prompt edition

Read one shared prompt, say one fitting answer, and pass the hidden-fuse bomb.
An ordinary answer counts. A word, person, object, action, phrase, short line or
simple English description is enough; funny answers earn no extra points.
Full grammar, a true personal experience and private stories are not required.
Avoid obvious repeated answers within one bomb; specific elaborations can count.
The next bomb permits previous answers again. Players judge loosely by voice;
there is no answer input, recognition, recording, AI or automatic judging.

## Classic and Halloween appearance — 2026-10-25

The approved v5 artwork is now part of the actual host and original player
links. Host setup and Host controls choose Classic or Halloween, with Pumpkin,
Ghost and Furry monsters. Every active player can choose one of four avatars
and change the room's next monster from the existing card. There is one monster
choice, shared by the main character and the next chase; no separate chase picker.

The trusted-host control node's canonical state owns `appearance`, roster
`avatar`, frozen `roundAppearance`, `cosmeticClock` and one `lastChase`.
Ready shows pending preferences; GO freezes that bomb's edition and monster.
Changing preferences after GO affects the next bomb without invalidating a
pending pass, drawing a prompt or changing the fuse. Restart and host takeover
preserve preferences and seat avatars, including after a player rename.

Ten seconds of active time changes the classic bomb to its angry image or the
monster to its warning image. Paused time is excluded. This cosmetic clock
never decides when the bomb explodes, and no remaining fuse/duration/deadline
is projected. Actual BOOM uses the monster's flaming-eye rage image or an 850ms
classic blast/smoke sequence. Public `boom.at` synchronizes that brief graphic;
reconnecting after it has finished does not replay it. The original 4500ms
settlement, 45000ms discussion, manual next/GO, timing settings, audio PCM,
scoring, prompt bank and activity history remain unchanged.

At a Halloween explosion, `lastChase` freezes the loser's avatar and this
bomb's monster. The host recap and only that loser's card show the chase
through the following preview and running bomb, even when the next monster
changes. The next explosion replaces it. Classic explosions, Restart and End
clear it. A single connected upper-body image holds each character's head,
torso and arms fixed; only thigh/knee layers run in place at a shared 480ms
cycle. There are no detached arms, body bobbing or moving chase lanes.
Reduced motion freezes the legs; pause freezes the animation. Keyed DOM and
animation progress survive passes, cosmetic updates and language changes.

`bomb-relay-art.js` is the asset/crop authority for sixteen approved transparent
WebP files under `assets/bomb-relay/characters/`. `bomb-relay-visuals.js` only
renders those public cosmetics: it owns no room storage, gameplay timer,
commands, RNG or audio. Both `bomb-relay.html` and `play.html` load art then
visuals then the shared UI. Changed presentation/engine/sync cache tag is
`br-halloween-1`; deck/selector/timing remain `br-pacing-3-1`, audio `br-sound-4`.
This game still uses its trusted host, so this frontend release requires no
independent executor deployment. Refresh host and player pages together at a
natural break to load the new controls; existing old rooms migrate lazily.

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

- `content/bomb-relay-prompts.json` is the single editable source, including
  retained disabled records for saved-card lookup and activity history.
  `node scripts/bomb-relay-build-catalog.cjs` generates the existing classic/CJS
  `bomb-relay-deck.js` and `content/bomb-relay-catalog-manifest.json`.
  `--check` rejects stale outputs. The real host and original player links load
  that generated deck, rather than a second standalone MJS or catalog page.
- The v2 audit found the existing 120 prompts exactly matched all five supplied
  fields (ID, pack, family, English, Traditional Chinese), with no additional
  custom prompts or local edits. All 120 are retained once, plus the supplied
  600 additions, then the approved v3 editorial migration revises 166 records
  and defers 20 without deleting their original text. There are 720 retained
  bilingual records, 700 eligible prompts and 534 unchanged wordings. The v3
  audit again found all supplied before fields matched: no missing IDs, local
  edits or custom records were present; no conflicts were overwritten.
  Future valid custom additions/edits belong in the JSON and are retained by
  the builder; it validates duplicates without imposing a 720-item limit.
- Everyday / 日常聯想: 351 eligible / 360 retained prompts.
  Playful / 趣味聯想: 349 eligible / 360 retained prompts.
  There are 34 distinct families across the bank. Mixed / 混合 is the initial
  default with relative weights 1:1.
  This is a playtest starting point, not a validated optimum or alternation.
- `content/bomb-relay-editorial-v3-patch.json` is the supplied read-only migration
  data, not a second maintained live catalog. The v3 and v3.1 attachment content
  is byte-identical. `node scripts/bomb-relay-apply-editorial-patch.cjs` merges by
  stable ID and all four before fields, skips already-applied after text, retains
  extra metadata/custom records/prior disabled choices, and reports conflicts or
  missing IDs without overwriting or inserting. `--check` verifies idempotence.
  A deferred record has `disabled:true`; the source preserves its wording/reason.
- Generated `DECK.items` keeps all 720 source records. `DECK.isEligible` excludes
  `disabled:true` or `enabled:false`; `DECK.pool` and the selector apply it to
  every mode and recycle/fallback path. The selector's known-ID set still uses
  the complete catalog, so deferring a card never erases its seen history.
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

Canonical `promptSnapshot` freezes the current card's bilingual text through
Ready, ticking, pause, explosion and discussion; `view()` projects it as
`bomb.prompt` for host and players. Existing saves without a snapshot use the
generated `getPrevious(id)` only for revised records whose current content and
editorial provenance still match this exact patch. That previous text comes
from the read-only patch.before, not another hand-maintained bank. Subsequent
local edits/custom prompts fall back to their current text. New draws and
preview rerolls snapshot the reviewed current wording.

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

The current Bomb rules/presentation/deck/timing cache tag is `br-pacing-3-1`;
audio remains
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
unchanged by the v3.1 timing/content revision.
Phone player cards keep the prompt before Pass; host results and short host
viewports use normal scrolling so controls cannot cover content.

Before v2, the actual engine used Classic 10–60 s (default), Quick 8–25 s,
Relaxed 20–80 s, with one uniform seeded random draw:
`round((min + seededRandom * (max-min))*1000)`.
There was no participant adjustment, Easy/Hard or custom-seconds UI, automatic
answer-speed extension, or client-side fuse resampling. Untimed Ready and
pass-without-reset were already correct. These are measured source facts,
not an inference from the reported number of laps.

Before this v3.1 revision, the actual v2 policy used two-uniform triangular
sampling and added 10 s per active player above three to both ends, capped at
50 s. With scaling on, its Fast / Normal / Chill ranges were:

- 3 players: 30–60 / 60–100 / 90–150 s.
- 6 players: 60–90 / 90–130 / 120–180 s.
- 8 players: 80–110 / 110–150 / 140–200 s.

`bomb-relay-timing.js` adapts the v3.1 pure policy to classic/CJS. New rooms
still select Normal and participant scaling unless a prior preference exists.
At 2–3 eligible players: Fast 30–60 s (mean 45), Normal 30–90 s (mean 60),
Chill 30–120 s (mean 75). Each GO uses two independent uniforms:
`round(minMs + (maxMs-minMs)*(u1+u2)/2)`, a symmetric triangular distribution.
The existing participant toggle now applies
`7 * min(5, max(0, activePlayerCount - 3))` seconds to the upper bound only.
Without a host override, the lower bound remains 30 s. This replaces v2's entire adjustment, without
adding its +10 or the superseded v3.0 proposal's +4. The actual new Fast /
Normal / Chill ranges with scaling on and no host override are:

- 3 players: 30–60 / 30–90 / 30–120 s.
- 6 players: 30–81 / 30–111 / 30–141 s.
- 8 players: 30–95 / 30–125 / 30–155 s.

Each extra participant increases the ceiling by 7 s and the mean by 3.5 s,
up to +35 / +17.5 s; it does not add seven fixed seconds to every sampled fuse.
Off uses base ranges at every count; nine players show the capped adjustment.
The existing host setup/settings area optionally accepts both `baseMinSeconds`
and `baseMaxSeconds`. A blank field means its automatic value: minimum 30 s and
the selected mode's default maximum. The custom minimum must be an integer
from 1 to the chosen base maximum minus one. The custom maximum must be an
integer from 2 to the selected mode's default ceiling and exceed the selected
minimum. For example, min 20 / max 25 is valid; leaving minimum blank selects
30 and consequently requires max at least 31. The base minimum must be
strictly lower than the base maximum before population scaling; extra
participants cannot make an invalid base range valid. Changing mode clears
BOTH overrides. Toggling scaling, changing language and ordinary Restart retain
both. The effective minimum is `baseMinSeconds ?? 30`, and the effective ceiling
is `(baseMaxSeconds ?? modeMax) + 7*extraPlayers`, applied once. The same triangle
is rescaled to both endpoints, so its mean and probabilities follow those
choices. The standard ranges above retain the 30 s floor; only a host's explicit
minimum override can allow a fuse below 30 s. Pending changes affect the next GO
only. Preparation text includes
the current mode, eligible count and effective range on host/player screens;
the sampled current duration never appears. Defaults have no 10–20 s early tail;
shorter durations require an explicit host minimum override. There is no
forced full lap, pass-count extension, per-player safe period or extra mode.
Counts come from distinct active roster seats, not
connections or the separate host display. Sit-out/rejoin changes only the next
GO count. The existing Hub room-count switch still fences the old coordinator;
it does not rewrite a running session's roster in place.

Old pending Quick/Classic/Relaxed settings map to their corresponding
Fast/Normal/Chill preference and preserve their existing scaling choice under
v3.1. The new policy does not force a selected Fast room back to Normal.
An already running or paused bomb from any policy keeps its original GO audit
snapshot and saved effective deadline/remaining time. Pending settings live in canonical
`settingsTiming`; host-only `settings` commands never redraw or restart a fuse.
The host keeps its latest requested settings preview until the canonical value
event confirms it. A successful transaction can resolve before that event;
clearing the preview immediately used to briefly restore old controls and lose
new bounds on an immediate Restart. Older acknowledgements cannot clear a newer
preview, failures/session replacement discard it, and Restart includes the
committed pending bounds when its value event is still delayed.

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
Player nodes receive the same current `cardId` and public bilingual `prompt`
snapshot via `engine.view`, never a
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
After publication, refresh the host and every original player page once together
at a natural break. Already-open older UI ignores the new `bomb.prompt` snapshot
and continues using its previously loaded catalog. Do not force a reload during
an active bomb; the canonical room, deadlines and history remain retained.

## Verification

Run each review attachment's tests first, in its own directory:
`python scripts/build_content.py` and `node --test tests/*.test.mjs`
(v3: 31 cases; v3.1: 34 cases). v3.1 supersedes only v3's timing proposal.
Do not replace Hub's package.json. Then check generated content:
`node scripts/bomb-relay-apply-editorial-patch.cjs --check` and
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
The final v3.1 two-endpoint implementation passes 2109/2109 full-Hub tests,
with zero failures/skips. Its production runner's offline `--self-test` also
passes four exact-owned-node and six lease-boundary guards without network
access. Four actual-host-controller regressions cover delayed settings value
delivery, older acknowledgement races, failed/replaced-session cleanup and an
immediate pending-aware Restart; they fail with the preceding implementation.
Actual host/original-player-page local runs pass 20 checks and 86 EN/ZH captures
for each of 3/6/8 participants (60 checks, 258 captures, five GO snapshots per
room, zero JS errors). They use isolated authority fixtures, controlled clocks
and desktop Chromium phone viewports. Manual review includes the 375 px host
settings dialog and 320 px longest-prompt/PASS first screen. Reports are at
`../bomb-pacing-v31-final-qa-{3,6,8}/report.json` with matching logs.

Gameplay source `89536e64cd529926ed3151c3004eb1389662f353` is published on the
existing [production host](https://livechat-two-alpha.vercel.app/bomb-relay.html).
[Vercel deployment Dy9DpsRiPs9H6MDELHZLLAKgbMd5](https://vercel.com/accordingtos-projects/livechat/Dy9DpsRiPs9H6MDELHZLLAKgbMd5)
succeeded. Production Bomb sources 15/15 and shared assets 62/62 match; the
unchanged executor's readiness, CORS, synthetic-invalid-ticket rejection and
private-runtime 404 checks pass. No backend redeployment or secret update is
required for this scoped frontend revision.

The real production host and three independent original mobile-viewport player
pages pass 325 checks using genuine Firebase and clocks, with zero JS errors.
The first Normal/on three-player fuse lasted 60878 ms. Six passes and a real
13805 ms normal lease-expiry host takeover kept its deadline, snapshot and prompt;
pending Fast/off custom bounds 20–45 s survived reload. After the original 4.5 s
explosion presentation, the single canonical discussion lasted 45000 ms with the
same boundary after a player reload. Natural expiry revealed one untimed Ready
prompt; all four pages displayed 20–45 s and waited for manual Start. The second
manual GO used those bounds and exploded naturally. Active player 3 then used
the existing Next before the 45 s discussion ended, revealing one new untimed
prompt with exactly two total penalties. Stop added no penalty. No clock, RNG or
deadline substitution was used, and no existing room was read or written. All
four precisely owned test nodes were conditionally cleaned, with zero failures.
The report and 14 screenshots are outside Hub at
`../bomb-production-qa/BQA13B21A5/report.json`; log:
`../bomb-pacing-v31-production.log`. Physical phones, human-group conversation
and hardware speaker hearing remain unverified.
