# Once Upon a Time · Spooky Halloween — 2026-10-22

Incremental third world inside the existing Once game, not a separate room or a
replacement for Classic/Modern & Future. The user approved the six illustrated
funny Ending directions, then requested more than the initial 75 Story cards.

## Content and setup

- Select **Spooky Halloween** in Story world before dealing. Original player
  links, 2–6 seats, automatic/manual 3–9-card hands and one Ending each remain.
- 150 Story cards: 30 in each of the five existing categories; 20 original light,
  funny Endings. Short reusable words, not prescribed character biographies.
- 90 new Halloween Story paintings plus 20 new Ending paintings. Another 60
  same-title/category paintings are explicitly reused from the released worlds;
  every reuse has its exact source ID and unchanged image paths. All 170 cards
  have independent `once-hw-*` identities. A game deals only its selected world.
- Cozy spooky mystery is mixed with playful hooks such as Rubber Duck, Fake
  Teeth, Clumsy, Hiccup and Pizza Delivery. No gore or jump-scare art. The funny
  Endings include a hungry monster, a tiny cat, a villain washing dishes, a
  missed bus and a strange pet. This is original Hub content, not an official DLC.

## Interrupts

Only the physical pool composition changes, not the two takeover methods,
timing, penalties, voting or win rules. There is no per-hand Interrupt quota.

- Classic: 20/129 → **30/129 (23.3%)**, six per category.
- Modern & Future: 10/60 → **15/60 (25%)**, three per category.
- Spooky Halloween: **40/150 (26.7%)**, eight per category.

**2026-10-30 (profile 3, current):** Classic **35/129 (27.1%)**, seven per
category (+Fox, Copper Mirror, Seaside Cave, Frozen, Hidden Truth); Modern &
Future **17/60 (28.3%)** (+Stranger, Escape); Halloween **42/150 (28.0%)**
(+Thief, Key). The official third-edition core deck has 23 Interrupts among 114
Story cards (20.2%, counted from Atlas Games' card list
https://www.atlas-games.com/pdf_storage/OUAT3CoreCardlistWEB.pdf); the Hub stays
about seven to eight points above it by request. New create/deal/restart saves
`interruptProfile:3`; a saved profile-2 game keeps `profile2InterruptIds` and a
game without a profile keeps `legacyInterruptIds` until its next deal.

The 2026-10-22 rule: new create/deal/restart used saved `interruptProfile:2`. Already-running saved
games without a profile retain the original 20/10 flags and powers until their
next game. Server validation and hand/starter/history/returnable-card projections
use that same profile. Client commands cannot change it. IDs, words, original
paintings, existing Interrupts and physical card order are preserved.

The official two Interrupt methods are described in Atlas Games' rules:
https://www.atlas-games.com/atlas-cms/resources/pdfs/ouat3rulesweb.pdf
The increased proportions above are this Hub's playtest tuning, not a claim
about the official printed deck's composition or tested human balance.

## Main files and assets

- `once-upon-a-time-halloween-deck.js`: independent immutable content module.
- `once-upon-a-time-deck.js`: three-world registry/global ID maps and Classic mix.
- `once-upon-a-time-modern-future-deck.js`: Modern mix and legacy Interrupt IDs.
- `once-upon-a-time-engine.js`: saved-game Interrupt profile/projections.
- `once-upon-a-time-ui.js`: third world in lobby/settings/title.
- `once-upon-a-time.html`, `play.html`, `hub-launcher.js`: ordered module loading
  and cache tags `once-spooky-1` / `hub-launch-5`.
- New optimized art: `assets/once-upon-a-time/halloween/{category}/*-v1.webp`
  and `*-v1-thumb.webp` (768×1152 / 384×576). Original generated PNGs are
  preserved locally and ignored by Git; existing art is not overwritten.
- Exact prompts/provenance:
  `assets/once-upon-a-time/halloween/art-prompts-{category}-v1.json`, for
  character, thing, place, aspect, event and ending. **Built-in image_gen** mode;
  no fallback API/CLI or new credentials. Generation is a one-time asset build,
  never an AI call while playing. Text and card frames remain editable UI.
- `scripts/once-upon-a-time-halloween-art-manifest.cjs`: read-only checks, or
  `--write` for a complete manifest only. Missing art/reviews do not publish a
  misleading complete manifest. Tests include builder failure fixtures.
- `scripts/once-upon-a-time-halloween-gallery.cjs`: public-art visual QA sheets,
  not private hands. Existing browser/service/release checkers cover the new world.

## Running and deployment

Local synthetic preview: `node scripts/once-upon-a-time-dev-server.cjs`, then
http://127.0.0.1:8095/once-upon-a-time.html?demo=1. Cancel/restart into Lobby,
select Spooky Halloween, save settings and deal. This labelled demo is local
only and never claims cross-device synchronization.

Real play continues through the existing Hub and original private player links.
No new environment variables or service are needed. Deploy frontend **and** the
existing independent `icebreaker-youtube-search` executor together using the
current package script. Preserve all unrelated runtime modules, search handlers,
queue configuration and existing signing credentials. Do not rotate/export keys.
After release, refresh host/player pages at a natural break for the new assets;
do not force a reload or change the rules of an in-flight game.

## Verification status

Final local regression: **2,220/2,220 passed**, zero failures/skips/cancellations,
206.17 seconds. This includes all existing games plus new world/flow/manifest/
actual-art tests. An initial full run found one unrelated WHO KNOWS assertion
that assumed LF-only HTML; its test input now normalizes CRLF to LF, without
changing that game or weakening the assertion. The full suite then passed.

New world checks include all 40 category Interrupts, 40 player/hand-size
combinations, deck conservation/isolation, private projections, restart, six
asynchronous SDK cards, host takeover and the real executor core with ETag
conflicts, complete Ending flow and simultaneous-deal protection. Old sessions
retain their original Interrupt flags; forged profile commands are rejected.

All 170 Halloween records were visually checked, including every new painting
and the 60 reused originals. The complete `art-manifest-v1.json` validates 110
new/60 reused images, source/provenance/reviews, dimensions and unique content.
New deployed main/thumbnail WebPs total **28,226,942 bytes (~26.9 MiB)**. Builder
failure fixtures and strict actual-art checks pass; no placeholder is shipped.

Native Chrome synthetic settings checks: three worlds × four contexts (320/
390/1280 shared player and 1280 public host), **12/12 passed**. Full browser
checks for each world passed five viewport layouts (320/375/390/800/1280), five
complete synthetic games, default-visible Endings, ordered upright phone cards,
latest-four/current-card/earlier-stack cues and no horizontal overflow. Halloween
also checked **all 428 card texts** across the three separate worlds at320/375px.
Loaded images/card nodes remain stable across sync; switching seat/session clears
old private cards. Phone/desktop screenshots were visually checked.

Existing independent production executor deployment is **READY**:
`dpl_2uaWr5WATv5DhLRFzrXUvn1CsqdM`, stable URL
https://icebreaker-youtube-search.vercel.app/api/hub-executor.
Real six-player disposable-service checks passed Halloween/manual9 **711**,
Classic/auto **471**, Modern & Future/manual9 **711**. Each removed exactly its
seven marked, ownership/session/ETag-checked nodes; cleanupFailed0. No existing
room was entered or changed. Current four Once source modules are also retained
in the existing service source tree for future maintenance.

Frontend gameplay source **bf735a3** is pushed to `accordingto/livechat` main and
published at https://livechat-two-alpha.vercel.app/once-upon-a-time.html.
Read-only production comparison matched **778/778 Once assets**, including every
new main/thumbnail painting and all provenance/manifests, plus **63/63 shared
executor/role/Bomb assets**. Stable service health/CORS/invalid-ticket rejection
passed; private runtime paths return404 on both hosts.

Native Chrome against the actual production website also passed Halloween's
five viewport layouts, five complete **synthetic demo** games, all428card texts
at320/375px and image stability/privacy cleanup. Its room/Firebase requests are
blocked; it is not confused with the separate real six-player service checks
above. Existing rooms/user browser profiles were not accessed. Production
375/1280px screenshots are saved in the task's
`halloween-preview/production-browser-qa/` directory.

Physical multi-device, Safari/Firefox, human voice and entertainment/balance
playtests are not claimed by these automated checks. All required implementation
and both production deployments are complete; no external setup is pending.
