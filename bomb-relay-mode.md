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

- `bomb-relay-deck.js` is the one authoritative 120-prompt source, mechanically
  adapted from the supplied attachment: stable ID, pack, family, English and
  Traditional Chinese. No second editable JSON/MJS copy is shipped.
- Everyday / 日常聯想: 60 prompts, 15 families. Playful / 趣味聯想: 60 prompts,
  15 families. Mixed / 混合 is the initial default with relative weights 1:1.
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

The old 60 cards remain as `legacyItems` and their SVGs remain on disk for
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
so visuals do not suggest an answer list. Neutral bomb marks, existing palette,
explosion animation, vibration and Web Audio cues remain.

Fuse ranges are unchanged: Classic 10–60 s (default), Quick 8–25 s, Relaxed
20–80 s. The original formula is `round((min + seededRandom * (max-min))*1000)`.
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
Explosion settles once: holder takes one card, then starts the next bomb.
The 4.5 s explosion display and existing Next shortcut remain. After 5/10/15/20
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

Run attachment tests first: `node --test talk-bomb-selector.test.mjs` (17 cases).
In the repository: `node --test tests/bomb-relay-*.test.cjs` and
`node --test tests/*.test.cjs`. Browser regression:
`node tests/bomb-relay-ui.browser.cjs <path-to-playwright>` uses disposable local
fixtures and a Firebase stand-in, never user rooms. Read-only production assets:
`node scripts/bomb-relay-verify-release.cjs <commit>`.

Record actual release test counts and browser limits in `CLAUDE.md`. Unit tests
alone do not prove physical mobile or real multi-device voice-session behavior.
