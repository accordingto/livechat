# Once Upon a Time — V2 artwork / reference table

An incremental, English storytelling card game inside IceBreak Hub. Its existing
menu entry and private player links are retained. No existing game is replaced.
Players speak through their existing voice service; the app manages cards and
state, not speech. No microphone, transcript, AI judge, paid model call, points,
missions, classes, or additional rounds are used.

## Play in the existing room

1. Open the Hub and complete the usual room setup for **2–6 players**.
2. Send each participant their existing **private player link**. Do not put all
   private links in a public chat. The same links work when switching games.
3. Choose the last game, **Once Upon a Time**, then **Open this table**.
4. The host taps **Deal cards** directly. Player **Ready** buttons are optional
   signals, not a prerequisite for starting or receiving cards.
5. A random Story Card is revealed and discarded. The host chooses who looks
   most like it to begin; **Choose randomly instead** is an optional alternative.
6. Tell one continuous story. Tap a hand card to highlight it, then tap **Play
   card** (or another available action). There is no enlarged-card/Select step.
   Only the current Storyteller may play or pass.

The table shows the **latest four** played cards in order, with their original
story numbers. Earlier cards form a small decorative pile on the left; tap it
to expand or close the older-only history below. This is a local view change,
not a draw/discard or a change to canonical story history. There is no table
carousel to scroll to the latest play. Mobile uses a compact 2×2 landscape set
with complete titles and thumbnails. On phones the earlier pile is a small button.

The private Ending is a smaller **right-side table card on desktop**, independent
of the Story panel's height. At tablet/phone widths it becomes a collapsed drawer
**after the hand/actions**, not between the Story table and hand. **Your ending**
opens it and brings it into view without selecting
or playing it. Desktop Story/hand cards measure 144×224, with ivory frames and
cream name plates; category icons retain subtle distinguishing colors. No
viewport-height compression forces the whole game into one screen. The drawer
opens when the last Story Card leaves the hand, without auto-selecting or playing
the Ending; it can still be manually closed. Select
the Ending itself when it becomes playable, then use **Play Ending** and the
existing confirmation. The host's shared table never shows a private hand or
unrevealed Ending. The hand follows the table with a right-side action rail on
desktop; narrower screens place the same controls below the hand. The header,
turn indicator and public counts are compact, without shrinking button targets
or adding Korean/language-learning controls.

The host page is a shared table, not a private hand. A participating host uses
their own original player-card link to play. Keep the host page open; on normal
refresh it resumes the saved game rather than re-dealing. If it disconnects,
players wait for it to reconnect. Another host tab cannot simultaneously control
the same game. The host may finish a stalled vote, cancel without a winner, or
start another shuffled game once finished/cancelled.

## Rules implemented

- Each player gets one private Ending and `max(5, 11 - playerCount)` Story Cards:
  9 / 8 / 7 / 6 / 5 cards for 2 / 3 / 4 / 5 / 6 players.
- Normal Story Cards leave the hand and appear chronologically in Story So Far.
  Players judge aloud whether the element really matters to the story.
- A non-Storyteller can manually interrupt with a mentioned hand element. The
  card is played, the old Storyteller draws one, and the interrupter takes over.
  No automatic vote. A **Dispute** opens a vote among uninvolved players only.
  An invalid interrupt discards the interrupt card, draws two for the failed
  interrupter, removes the old Storyteller's provisional draw, and restores them.
- Interrupt cards also play normally. Their category ability responds only to
  the latest actual played card of the same category, not to spoken words or an
  interruption. The opportunity remains open until the next story action or
  **Continue story**. A confirmation explains the distinction.
- Concurrent interruption attempts use an authoritative transaction. The first
  accepted request wins; later attempts do not lose cards or receive penalties.
- **Pass** draws one, then offers **Discard this card** or **Keep all cards**;
  after that choice, the story passes left (the next seat, wrapping around).
- **Challenge** is discussed verbally, then uninvolved players decide. Success
  draws one for the Storyteller and passes left. An optional checkbox returns
  their latest eligible card if it did not meaningfully happen. Failure/tie has
  no penalty.
- A current Storyteller with zero Story Cards can propose their Ending. It is
  then public and cannot be interrupted. All other players judge it. Acceptance
  wins; rejection discards/replaces the Ending, draws one Story Card, passes left.
- Invalid interrupt / successful challenge / rejected ending each require a
  majority of **all eligible voters**, not just submitted ballots. Missing votes
  abstain if the host finishes the vote. Ties preserve the interrupt/story or
  accept the Ending. If nobody is uninvolved (for example a two-player dispute),
  the group agrees aloud and the host explicitly confirms that social decision;
  it is never silently auto-resolved.
- Physical discard piles are reshuffled when needed. Chronological history is
  separate, so it remains visible when cards are recycled. Reversible latest
  cards are held out until their dispute/challenge opportunity closes.

## Architecture and privacy

The existing vanilla static Hub, `ROOM`, `play.html`, Firebase configuration,
and `TALK_SYNC.Host` transaction/lease mechanism are reused. There is no new
server, account, service, credential, database root, or security-rule change.

`ONCE_ENGINE` is the single rule authority. `ONCE_SYNC.Host` stores canonical
state at a random **host control token** under the existing room's per-token
player paths. That token is not part of player projections or the public roster.
The host publishes a distinct `ONCE_ENGINE.view` to each existing private player
path. A shared table contains counts and public cards only; each player gets
only their own hand/Ending/vote. Drawn card names and unrevealed Endings are not
in the public action log. UI hiding is not the privacy boundary.

The host binds a command's actor to its actual seat listener, never the actor
claimed by a client. Commands validate session, turn/vote/opportunity, ownership,
phase and host authority. Transactional updates, bounded request deduplication,
saved acknowledgements and retrying the same request ID prevent double draws
or plays. Firebase sparse/null-padded arrays are normalized before ballot
counting. Switching games suspends the previous controller.

**Trust limit:** this intentionally retains the Hub's trusted-host model. A
technical host can inspect canonical state. This is not a hostile-host-secure
server, and private links are bearer credentials: someone who receives another
person's link can use that card. The player's own device keeps the link/session,
not an authoritative game copy. Do not screen-share private player cards.

## Deck and art

All **114 original Story Cards + 51 original Endings** are in a dedicated data
file, with stable IDs and `artKey` / `imagePath` fields. No commercial deck or
card-back artwork was copied. Story titles are short English fairy-tale terms.
Interface/help follows the Hub's existing EN / Traditional Chinese switch;
card content remains English learning material. The 2026-10-09 vocabulary refresh
simplifies 79 titles to core depicted elements (Prince, Bottle, Bridge, Storm).
98/114 titles are single words and 112/114 have at most two words; a small set of
fairy-tale combinations remains (Glass Knight, Golden Apple, Change of Heart).
All card IDs, artwork, categories, 20 Interrupt flags and 51 Ending sentences
are unchanged. Legacy slugs describe original art; they are not display titles.

| Category | Story Cards | Special Interrupt cards (included) |
| --- | ---: | ---: |
| Character | 23 | 4 |
| Thing | 23 | 4 |
| Place | 23 | 4 |
| Aspect | 23 | 4 |
| Event | 22 | 4 |
| Total | 114 | 20 |

The original three artwork references guided V2: antique-gold corner
ornaments, parchment HTML titles, and Character gold / Thing green / Place orange /
Aspect blue / Event purple category identities. Full/mini/history/Ending
variants share one component. The references do not change gameplay rules.
The 2026-10-07 real-game photos now guide a quieter navy/ivory presentation,
not new card data or replacement illustrations. Semantic artwork is unchanged.

All **165 cards now have their own meaning-matched illustration**, generated
with the built-in image tool and visually inspected. A Glass Knight wears glass
armour, a Broken Sword is visibly broken, Frozen depicts actual ice, and each
Ending depicts its sentence rather than reusing a generic cottage. Full images
remain visible without cropping away the defining subject; a subdued copy of
the same artwork fills any side space. The five category fallbacks from V1 are
not used by current card rendering, including saved older host projections.

Every illustration has a 768px-wide WebP and a 384px-wide thumbnail. Small cards
lazy-load the thumbnail; the full-size card component can use the main image. Print-sized
original PNGs remain locally preserved and are not deployed. Titles, category
labels and frame ornaments remain separate HTML/SVG, not baked into paintings.
The complete 330-file main/thumbnail set is 46.53 MiB; a game loads only the
cards currently displayed, not the whole collection.
Two original SVG backs and a new original gold-frame SVG are separate UI assets.
No AI is called during gameplay; there is no model key, fee or new service setup.

`assets/once-upon-a-time/art-manifest.json` maps all card IDs to their public
artwork. `art-prompts.md` documents the process, and the three `art-v2-*.json`
files retain every exact prompt, semantic description, inspection record and
original output path. The local-only `/once-art-gallery.html` route displays the
public card pool for visual QA, never real players' private hands or assignments.

## Files

- `once-upon-a-time-deck.js`: all card data/categories/art paths.
- `once-upon-a-time-engine.js`: pure state machine, validation, projections.
- `once-upon-a-time-sync.js`: adapter using the existing Hub transactions/lease.
- `once-upon-a-time-ui.js`: cards, table, confirmations, own-card actions, I18N.
- `once-upon-a-time-host.js`, `.html`, `.css`: host integration/responsive shell.
- `assets/once-upon-a-time/`: 165 meaning-matched paintings with thumbnails,
  two backs, gold-frame ornament, public manifest and prompt provenance.
- `index.html`: appends the final game entry; no unrelated entries removed.
- `play.html`: adds the Once renderer and own-token command mailbox; old game
  renderers retain their existing routes and clean up when switching.
- `package.json`: adds focused test and local preview commands.
- `tests/once-upon-a-time-*.test.cjs`: deck, rules, sync, UI regressions.
- `scripts/once-upon-a-time-dev-server.cjs`: read-only local static preview.
- `scripts/once-upon-a-time-live-test.cjs`: opt-in isolated six-seat real Firebase
  integration check; cleans only its own newly created token paths.
- `scripts/once-upon-a-time-verify-release.cjs`: read-only production asset hashes.
- `scripts/once-upon-a-time-encode-art.cjs`: optional build-time WebP encoding
  using installed/bundled Sharp; not required to run the game.
- `scripts/once-upon-a-time-art-gallery.cjs`: local-only public-deck visual QA.

## Local launch and verification

Node 20+ is sufficient; no package installation, API key, or extra environment
setup is required for the existing configured Hub.

```sh
node scripts/once-upon-a-time-dev-server.cjs
```

With npm available, `npm run dev:once-upon-a-time` is the equivalent shortcut.

Open `http://127.0.0.1:8095/index.html`, set up 2–6 players and use the last game.
For multiple local browsers, use each original player link on the same origin.
For real phones, use the published HTTPS Hub, not a phone's `127.0.0.1` address.
All devices require internet access to the existing Firebase and CDN scripts.

`http://127.0.0.1:8095/once-upon-a-time.html?demo=1` is a prominently labelled,
synthetic four-player simulation with a viewpoint selector. It makes **no room
connection**, resets on reload, and cannot inspect/control real players. It is
for UI/rule trials, never proof of cross-device synchronization.

```sh
node --test tests/once-upon-a-time-*.test.cjs
node --test --test-concurrency=1 tests/*.test.cjs
```

The real-backend test is opt-in. In PowerShell:

```powershell
$env:ONCE_UPON_LIVE_TEST='1'
node scripts/once-upon-a-time-live-test.cjs
```

It creates only fresh randomized test paths after preflight, uses independent
player credentials and real Firebase REST transactions, and removes only those
test paths in `finally`. It never reads a whole room/database or uses an existing
player's credential. Do not enable this flag in a production player page.

## Verification status (2026-10-05)

Completed browser checks: local 1280px desktop and 320/375/390px phone-width synthetic game,
card preview/selection/play, private viewpoints, normal interrupt, disputed
invalid interrupt/rollback, empty hand, Ending review and accepted win. The Hub
menu visually shows Once Upon a Time last. A real Firebase browser host opened
a two-player lobby, resumed it after refresh, and cancelled it without declaring
a winner; this is separate from the synthetic demo.

- **Local automated checks:** all 417 tests passed together in the latest
  sequential run: 95 focused game tests (44 engine, 17 sync, 28 UI, 6 deck/art)
  and 322 existing tests. The artwork checks require 165 unique main-image hashes,
  all 330 correctly sized WebPs, and complete semantic/prompt provenance.
  Covers 2/4/6-player setup, repeated plays, both interruption modes, concurrent
  requests, invalid rollback, challenge success/failure/latest-card return,
  optional discard/keep, both Ending results/ties, restart, privacy and reconnect.
- **Actual Firebase backend:** an opt-in six-independent-token REST integration
  test passed against the existing database. Verified filtered private views,
  trusted actor identity, direct deal with zero Ready signals and five unready
  players (all still receive private hands), category interruption, competing interrupts
  (one winner/no late penalty), concurrent ballots and exact invalid rollback,
  failed challenge, keep-all pass, empty-hand Ending win, competing host leases,
  reconnect preserving hands/Endings, restart clearing old mailboxes, and
  game-switch suspension. Only its seven temporary token paths were cleaned;
  cleanup was verified. Existing rooms were not read or changed.
- **Live-test fix:** Firebase can serialize numeric ballot maps as null-padded
  arrays. Three regressions now ensure only eligible non-null valid ballots
  count, including higher-seat-first arrivals; lower seats may still vote.
- **Browser UI:** a local synthetic four-player full game passed through actual
  buttons; phone-width pages and card previews did not overflow horizontally.
  This is one in-app browser, not independent browser engines or physical phones.
- **V2 artwork checks (previous release):** desktop and 320/375/390px phone-width previews preserve
  complete subjects and readable category/Interrupt labels. Preview, selection
  and sequential plays still work; a real two-player browser host dealt directly
  while both players were Not ready, then cancelled the isolated test game.

- **Direct-selection update:** direct card selection highlights the card without a
  preview or Select step. Added regressions for latest-four history/older-only
  archive/global numbering, private Ending placement, locked vs available Ending
  selection, stale selection/session reset and disabled/pending card taps.
- **Actual player browser check:** in the isolated existing two-player test
  room, the host restarted/dealt with both players Not ready, selected a first
  Storyteller and received five consecutive plays from that player's original private link.
  The player saw only their own hand/Ending; the host showed public counts and
  cards. This uses actual Firebase and separate tabs, not the synthetic demo.
  Refresh retained the same player, hand, Ending and public history. Latest four
  showed cards 2–5, while expanding earlier history showed only card 1. The test
  game was cancelled afterward without declaring a winner.
- **Previous compact layout browser check (superseded):** actual player page at 1280×720, 320×667,
  375×812 and 390×844 kept the main table, private hand/Ending and Play/Pass
  controls within the first screen with history collapsed. Latest-four history
  had no horizontal overflow, and the full Ending sentence was not clipped.
  Rules/log/earlier history can deliberately expand the page; a long hand still
  scrolls sideways. This is viewport testing, not physical-phone verification.
- **Balanced layout restoration (previous release):** restored original card sizes,
  readable headings/buttons and panel spacing, removed all short-viewport
  compression and the table's forced minimum/sidebar height. Earlier public
  cards use a decorative left pile, with a local-only expand/collapse action;
  the newest four remain in order. The Ending is last in the private hand row,
  with a local shortcut, full sentence and immediate visibility when empty.
  Chrome synthetic-demo browser checks passed for consecutive direct plays,
  old-only expansion, the Ending shortcut without selection/submission, mobile
  two-row history, empty hand and the unchanged Ending confirmation. Desktop
  cards measure 138×214; 320×667 and 375×812 viewports do not overflow horizontally
  or clip the full Ending sentence. Scrolling is allowed; fitting one screen
  is no longer asserted. A read-only check of the existing cancelled test
  player's original private link also passed in the real play.html shell on
  desktop and at 375px; no room data was changed for that check. This is not a
  physical-device or spoken group test.

## Switching from an unfinished Hub game

Open the game's host page and click Open this table to switch the existing player links to its lobby. The previous game does not need an End control. A restored table whose players have already moved to another game exposes Open again while keeping its old gameplay controls inactive.

The old opening guard compared entire snapshots from the asynchronously filled ROOM.answers cache. Unread cards and normal previous-game timer/vote/receipt/heartbeat changes could be misidentified as a later game selection. Explicit start and restart now await actual reads of each known private token, then compare the active previous game's own stable session/round identity. Different games, sessions or legacy rounds still block stale writes. Merely restoring a saved canonical table leaves foreign player cards untouched; the host must explicitly open a new table. A fresh host page can reclaim an inactive old lease while the previous executor cannot fight it back.

All 588 repository tests passed after the switching fixes, including complete host entry-script tests, unread-card and mutable previous-game fixtures, inactive lease recovery and changed rosters. Actual Firebase QA used three original private links to switch Pick a Side → Once Upon a Time → Dixit → Once Upon a Time while the older host pages stayed open. Direct dealing and a Once card play worked; a fresh Once host page also took over its inactive old lease, opened a new lobby and dealt without waiting for the earlier host to close. Previous games were not ended and links were not reissued. The synthetic room was cancelled afterward.

## Reference UI refresh (2026-10-07)

This is a presentation-only follow-up using the user's real-game photo
references. Navy panels, thin ivory frames, cream titles, quieter category colors,
a compact turn/roster strip and the right-hand action rail replace the bright
gold/teal presentation. The private Ending is rendered exactly once beside the
desktop story panel and below it on smaller screens; it is never included in a
shared/host or lobby view. Earlier cards remain a local-only left pile, with the
latest four immediately visible. No Korean, new translation system, content
pool, recording or paid API has been added.

- Final local checks: **657/657** repository tests pass, including **108/108**
  Once tests (**30 UI**). The existing Bluff topic generator was run to restore
  its checkout's LF formatting for a Windows byte-comparison check; its output
  matches origin/main exactly and no topic content changed.
- UI regressions pass for the new Ending placement, direct selection/jump,
  private host/lobby exclusion, action rail, English empty-story prompt and all
  existing action/phase/confirmation permissions.
- Chrome browser checks pass at 1280/1001/800/375/320px viewport widths: no
  document/table horizontal overflow, complete longest Story title and Ending
  sentence, and wrapping long player names. A temporary synthetic public-deck
  fixture was used for extreme text lengths and is not part of the release.
- The synthetic four-player browser game completed through direct hand plays,
  local pile expansion/collapse, empty hand, Ending confirmation, three eligible
  votes and the accepted result. This is not a cross-device claim.
- The existing cancelled test player's original play.html link was inspected
  read-only on desktop and at 375px: the shell's content remains block layout,
  latest four cards and one private Ending display without clipping/overflow.
  No existing game or player state was changed in this check.
- Recent remote Dixit/BLUFF PARTY additions and story-game switching fixes are
  retained by a normal merge; they were not rolled back with the presentation.

### Current-card / Ending frame follow-up

The final canonical Story history event has a static gold outline and an
**↑ Current card** label outside its artwork. Exactly one public card is marked;
empty stories and expanded older cards are not marked. Returning the last card
or rolling back an invalid interruption recomputes the marker from actual history.
The Ending no longer uses the portrait-ratio SVG overlay or duplicate inset
pseudo-frame, and its outer dock has no panel border; its actual card edge and
keyboard/selection outline remain. This also fixes the spurious portrait rectangle
inside the tablet/phone horizontal Ending.

**Continue story** is removed from the player action rail. No automatic command
replaces it: Play, Pass, Ending and Challenge close opportunities normally, while
an unacted-on opportunity remains open. The engine command is retained for older
cached clients; no gameplay phase requires that optional button.

Follow-up local regressions: **659/659** repository tests and **110/110**
Once tests (**32 UI**) pass. The engine, sync and card data are unchanged.
After merging the latest unrelated BLUFF PARTY updates, the complete merged-tree
regression also passes: **661/661**, no failures or skips.
Browser checks confirm a single Current marker on the actual newest card,
movement after the next play, older-only expansion without another marker,
zero Continue buttons and no Ending pseudo-frames. Desktop and 320/375px layouts
retain complete Ending text without document/table horizontal overflow.

Not claimed: physical-phone play, two different browser engines, a live spoken
group playtest, or full balance testing. Same-browser tabs and resized viewports
are not labelled as different-device or different-browser-engine tests.

## Phone flow and flexible vocabulary (2026-10-09)

The single private Ending is now a native local drawer after hand/actions in
reading order. Desktop places it on the right and initially opens it; widths
at or below 1000px initially collapse it. The hand's **Your ending** shortcut
opens/scrolls to it without selecting a card or sending a game command. Drawer
choice survives ordinary sync updates, resets on a new session, and opens once
when the last Story Card leaves the hand. Players may subsequently close it.
No Ending/hand is added to the public host view. Phone Story cards are 88px-high
landscape tiles, keeping the latest four and one Current marker; private hand
portraits retain 144×224 sizing. The older-card pile remains locally expandable.
All canonical history, interruption opportunities and rules are unchanged.

79 Story titles were shortened to flexible core depicted elements. The artwork
manifest was checked for all 114 Story Cards, and their IDs/art/Interrupt pool
are unchanged; there are no additional decks, modes, AI calls or service keys.
New cache token `once-mobile-words-1` is shared by host and original play.html.

Verification in this update:

- **Local focused tests:** 116/116 pass (44 engine, 28 sync, 36 UI, 8 deck/art).
- **Full merged repository regression:** 929/929 pass, no failures or skips;
  the latest unrelated Open Mic changes from origin/main were retained.
- **Chrome automated browser:** five synthetic complete games at 320×667,
  375×812, 390×844, 800×900 and 1280×800, using direct selection, Play, older-pile
  expansion, Ending drawer/confirmation and all three acceptance ballots. All
  pass, with one Current cue, unchanged hand size and no horizontal overflow or
  clipped recent titles. Phone Story-to-hand gap is 8px (12px on larger layouts).
- **Full text-fit fixtures:** all 114 Story titles and all 51 Ending sentences
  fit without clipped text at 320px and 375px widths.
- This uses a fresh headless Chrome profile and the explicitly labelled demo,
  with Firebase room traffic blocked. It is not physical-device or live-room
  synchronization proof. Browser UI helper was unavailable this turn, so the
  opt-in independent browser runner was used instead; no user game was touched.

Repeat the optional browser check with an installed Chrome and Playwright:

```powershell
$env:PLAYWRIGHT_MODULE_PATH='absolute/path/to/playwright'
node scripts/once-upon-a-time-mobile-test.cjs
```

Run the local server above first. `ONCE_UI_BASE` may be set to the published site
for the same demo-only check. Optional `ONCE_UI_PROOF_DIR` saves rendered 375px /
1280px screenshots to an existing chosen output directory. This test is not
part of the game runtime and is never available to normal players.
