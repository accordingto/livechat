# WORD WOLF — one different card

The restored object-description game for **3–9 players**: most players receive
the same word and exactly one receives a related, different word. Everyone
describes their own card, listens and votes for the person they suspect. Nobody
is told whether they hold the shared or different card before the result.
English item names have Traditional Chinese reading aids; controls use the
Hub's existing EN/ZH switch.

## Real entry and files

Open **WORD WOLF** in the existing Hub menu (`index.html` → `word-wolf.html`).
The current room roster is imported; **Deal the first cards** publishes
Word Wolf pointers to those players' original `play.html` links. There is no
extra joining form or new player link. The shared host page is an unseated
moderator; a host who plays uses their own original player card.

- `word-wolf-content.js` — the editable authority for all 80 restored pairs
  from `12d64cd^`, stable `ww-001…ww-080` IDs and bilingual item names. Do not
  append a second copy of the old bank.
- `word-wolf-art.js` — immutable local bitmap manifest for all **160 unique
  items in the 80 pairs**, derived from `CONTENT.PAIRS` ids. It keeps the
  existing `item(id)` / `ids` interface and adds `get(id)` / `manifest`; names
  stay exclusively in the content authority.
- `assets/word-wolf/cards-v1/{item-id}.webp` — one independent **640×640**
  illustrated card per word, including food, feelings, places, professions,
  weather and other abstract concepts. No pack falls back to a generic icon
  or unillustrated known-word card.
- `word-wolf-engine.js` — pure canonical rules, selection/history, private
  projections, voting and result calculation.
- `word-wolf-ui.js` — private card, public stage, bilingual copy and
  `CARD_TABLE.define({ game: 'wordwolf', key: 'ww', ... })` integration.
- `word-wolf-host.js`, `word-wolf.html`, `word-wolf.css` — setup and optional
  shared table, restrained ink-green/ivory cards, local illustration layout.
- `card-table.js`, `card-table-ui.js`, `card-table.css` — shared synchronization,
  original-card lifecycle, controls and presentation base; see
  [card-table-mode.md](card-table-mode.md).

Own files use cache tag `ww-art-2`, shared files `ct-2`. Both the host page and
`play.html` load content, art, engine and UI in dependency order; only the host
page loads `word-wolf-host.js`. `word-wolf.html?demo=1` is the separate
one-device preview with a five-player demo roster, not a new live room.

## Illustrated cards

The previous 42 small vector studies are replaced by a complete family of
standalone editorial gouache illustrations on warm ivory paper. Objects use
clear forms and recognizable materials; feelings and other abstract answers
use a small expressive situation. Near-neighbor pairs have distinct visual
cues: a flute versus clarinet, an open canoe versus a covered kayak, a flower
vase versus a soil-filled flowerpot, and so on. There are no names, labels,
logos or comparison panels painted into the images. The source prompt set and
built-in generation provenance are maintained in
`docs/word-wolf-art-prompts.json`.

The private card resolves only `me.item.id` through the manifest. It renders
one square image followed by live, readable English and Traditional Chinese
names; Chinese remains a reading aid when controls are English. The global
EN/ZH switch still controls actual interface copy. An image's empty alt avoids
announcing those adjacent names twice. Unknown ids have no guessed image URL.
The public screen never renders either secret image before reveal; only the
existing result projection permits both cards to appear together. Images
neither change the canonical answer nor select a pair on a client.

Describe uses a large square image. On short 320-pixel phone screens it scales
to 162 pixels so the name and main actions remain visible; larger phone cards
allow up to 234 pixels. Voting uses a 76-pixel image beside the same readable
names, leaving space for ballots. Result cards show both pictures with their
own labels. Fixed intrinsic dimensions and `object-fit: contain` preserve the
whole composition while avoiding layout shifts and cropping. The compact
name/round header and removal of a repeated describe headline keep the focus
on the card and current action. Rules, history, packs, voting and scoring are
unchanged by this art revision.

## Packs and pair history

The default pack is **Everyday objects: 21 pairs**. **Food: 9**, **Other original
pairs: 50** and **All original pairs: 80** are also available. A deal uniformly
selects an unused pair from the selected pack, independently chooses one
active seat as the different card, and randomly chooses which side of the
pair is shared. One round keeps that exact deal throughout describing,
selecting speakers, voting, pause and reconnection.

Canonical `usedPairs` is retained across Next, Restart and a new game created
on the same table; reopening the host page does not redraw. Changing the pack
only affects the next deal. When the selected pack is exhausted, only that
pack's used IDs are removed and selection recycles from its full pool; there
is no hard-coded fallback pair. `CONFIG.historyMax` bounds pair memory at 160
IDs. Separately, `history` keeps up to 30 round summaries; Restart clears
those summaries and resets the round number while preserving `usedPairs`.
A genuinely new table without previous canonical state has fresh history.

## Describe, vote, reveal

`Start → describe → vote → result → Next → describe`

Describing is untimed. Each card shows its own item, one reminder to keep the
name/card private, and **Pick someone** / **Open the vote**. Players may take
turns naturally. Optional Pick shuffles all round seats into a circle, names
each once before beginning another circle and avoids an immediate repeated
name at the circle boundary. It only suggests the next speaker; it does not
replace the card or require a line, judgment or button press from that person.
Opening the vote is an explicit action and does not require finishing a Pick
circle. Any active card or the optional host page can manage the round.

In `vote`, each participating player privately selects one other active player;
self-voting and voting from the public host view are rejected. A player may
change their ballot before reveal. Everyone sees the number of votes cast;
only the owner sees their selected target. All participating seats voting
automatically reveals the result. The host's **Reveal the votes**, or the
existing phase-end control on an active card, can reveal earlier after at least
one ballot; an empty vote cannot be closed into a result.

The result reveals both cards, the different-card holder and all cards/ballots
in an expandable list. A unique highest-voted suspect with the different card
means the majority found them; a unique highest-voted shared-card holder means
the different card escaped. A tie for highest count has no winner. There are
no cumulative scores or standings. The result stays until someone explicitly
selects **Next pair**, which deals a fresh pair directly into untimed describing.
There is no automatic next round, per-person timer or answer recognition.

## Pause, leaving and controls

Pause preserves the same deal and ballots; Resume returns to the paused phase.
Refresh/reconnect also restores the existing phase, own card, Pick progress
and own vote. There are no deadlines (`deadline: null`, `TIMED: []`) and no
add-time action. Closing the optional host page does not stop the game.

If any in-round seat is explicitly sat out during describing, voting or pause,
the whole round becomes the same cancelled result for everyone, regardless of
which card that seat held. It awards no winner. Merely closing a browser tab
marks presence offline; it does not silently sit someone out or reveal the
round. A returning player can use **I'm back** and joins the next deal; the
cancelled round does not resume. At least three active players are required
for Next or Restart. The existing **Cancel this round** also produces a
cancelled result. Restart redeals with the pair-memory rules above. End removes
the private item/result and shows the new-game action. Destructive controls
retain the shared two-tap confirmation.

Player cards put own identity/item and the current action first. Clue tips,
player list, result details and table controls are lower, folded sections.
Clue/result details remain open across same-round/same-phase language or sync
repaints, and reset closed for a different round or phase. The public stage
shows progress and players, never an unrevealed item or private ballot.

## Authority and privacy

One `CARD_TABLE` node holds canonical JSON at
`rooms/{code}/players/{tableToken}/stateJson`; presence is beside it. The room
session stores its independent token as `wordWolfControlToken`. Original
player nodes contain only the normal pointer
`{ game: 'wordwolf', playerNum, name, ww: { version: 1, table } }`.
Every page derives its own filtered `WORD_WOLF_ENGINE.view(state, seat)`;
clients do not deal their own words. Commands use session/stage fences,
captured time/seed, ID replay protection and compare-and-set retries. Compatible
simultaneous ballots merge, while duplicate/stale actions cannot reveal twice
or skip pairs.

A reopened host adopts the table referenced by its original links, even if its
saved token is missing. Hub renames update the existing seat without changing
the deal. Changed room/roster or links borrowed by another game are guarded;
an old page cannot automatically overwrite them. Explicit **Bring every card
back to this game** restores the running deal to the original cards. Leaving
or switching the card unmounts its old UI, subscriptions and presence.

This is the existing browser-run table architecture, without an independent
executor, new service secret or AI/voice API. Screens hide other players'
items, roles and unrevealed ballots, but participating clients can read the
canonical table and public content in developer tools. It has the same
accepted trust boundary as the other CARD_TABLE games, not server-enforced
secret storage.

## Checks and verification boundary

```sh
node --test tests/word-wolf-*.test.cjs
node tests/word-wolf-ui.browser.cjs <path-to-playwright-package>
```

The unit/integration suites check all 80 pairs, a safe immutable 160-item
bitmap manifest, complete distinct 640-square files, bilingual renderer
labels and own-image-only rendering, 3–9-seat
one-different deals, private projections, Pick circles, mutable private
ballots, all vote outcomes, history/recycling, pause/reconnect, stale/duplicate
commands, sit-out cancellation, renames and actual Hub/`play.html` wiring.

The browser fixture uses real `word-wolf.html` and original `play.html` pages
with an isolated Firebase-compatible compare-and-set database. Set
`WW_QA_PLAYERS=4` or `9`; `WW_QA_OUTPUT` changes its report directory and
`WW_QA_LAYOUT=0` skips captures. Final 2026-10-26 runs passed 12 flows and 72
captures each (144 total), covering host-closed play, full Pick circles,
private/changeable ballots, concurrent last ballots, single settlement, early
reveal/ties, fresh Next, pause/reload, sit-out cancellation/rejoin, host
adoption/rename, switched links/Bring back, End and the one-device demo.
EN/ZH at 320/390 player and host widths plus the 1280 shared screen had no
page errors, horizontal overflow, clipped text, undersized mobile button/
summary/select targets (44px) or primary-action occlusion. All pages closing
left zero fixture presence; checked source hashes stayed unchanged.

These are automated Chromium pages with emulated viewports and isolated
transport. They do not verify production Firebase permissions/latency,
physical iOS/Android devices or a completed human voice-session playtest.

Separate production verification on 2026-10-26 passes a combined 99-check smoke
with Word Limit and Who Knows using four real original links. Word Wolf checks
one different private item, hidden pre-reveal role/pair, a complete Pick cycle,
four private ballots producing one identical result, a fresh Next pair and
card End after the host disconnects/closes. The real Firebase SDK/clock and
language-asserted EN/ZH phone captures are used; all seven disposable nodes
were conditionally deleted. Physical devices and a human voice-session game
remain unverified. See [release acceptance](docs/conversation-cards-2026-10-26-acceptance.md)
for the full coverage, first-run recovery and publication evidence.

The production smoke above predates this illustrated-card revision. New art
validation requires the complete real bitmap set, decoded image checks and
fresh phone/multiplayer regression; its results must be recorded separately
in `docs/cards-art-2026-10-26-acceptance.md`. The renderer-only audit
`tests/word-wolf-art.browser.cjs` checks every item in large/compact layouts at
320 pixels and selected long names at 390; it uses no Firebase or game state
and does not replace the real-entry multiplayer fixture. Missing image files
fail both asset coverage and browser startup; metadata or placeholders cannot
stand in for a completed 160-card deck.

For this art revision, the engine/integration/art suite passes **15/15**. It
checks every one of the 160 actual files for a valid complete WebP container,
640×640 dimensions and a distinct SHA256, plus the exact known-id manifest,
own-image-only output and readable live EN/ZH labels for every item. The
isolated renderer audit passes **324 inspections** with **12 representative
captures**: all 160 items in describe and compact voting layouts at 320 pixels,
plus four long-name layouts at 390. It reports no decode, overflow or clipped
label errors. Report: `../word-wolf-art-renderer-final/report.json`.

Fresh real-entry fixtures with four and nine players each pass **12 flows and
72 captures** (24 flows, 144 captures total), zero page errors or layout
findings. They decode the real own/revealed bitmaps, retain all earlier
authority/privacy/voting/Next/reconnect checks, and verify the main describe
actions fit on the phone before scrolling. Source and all 160 bitmap hashes
match before/after both runs, and all fixture presence is empty after closing
the pages. Reports: `../word-wolf-art-final-4/report.json` and
`../word-wolf-art-final-9/report.json`. Actual 320-pixel English private cards,
Chinese voting and result cards, and long-word renderer captures were visually
reviewed. These new runs use isolated transport and emulated viewports; this
section does not claim a new production Firebase or physical-phone playtest.

The subsequent actual-production four-link run passes **109 combined checks**
with Word Limit and Who Knows, including the own-card 640px image decode,
private words, Pick cycle, one full vote/reveal, new pair and original-link
switching after host disconnection/closure. All 211 frontend assets, including
every bitmap, match the published source; seven new test nodes deleted and
reread empty. No page errors. See
[current release acceptance](docs/cards-art-2026-10-26-acceptance.md).
Physical phones and completed human voice play remain unverified.
