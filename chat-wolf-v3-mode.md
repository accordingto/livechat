# Chat Wolf — special wolves and task-quality update

## Current UI cleanup — compact private cards (2026-10-04)

- Removed `Shared by all wolves` and the shared-task `? Rules` row from modern
  wolf cards. Team names, task progress, translation toggle and the separate
  role-ability/global game rules remain available.
- Private cards omit the redundant topic short title and main-topic eyebrow.
  The complete current question and round remain; follow-up/temporary-topic
  labels and the collapsed original question still distinguish topic changes.
  Host presentation keeps its existing topic labels.
- Completion remains the primary left-hand action, with unchanged wording,
  15.2px text and a natural height of at least 48px. Its box no longer stretches
  to match wrapped planning names in the subdued right-hand support column.
- Local synthetic in-app-browser checks passed at 320px, 360px and 390px:
  no horizontal content overflow and primary buttons stayed about 57px high
  even when the right-hand column grew to 88px. These are simulated mobile
  viewports, not physical-device or live-player tests.
- Targeted card tests: 34/34 passed. Full repository rerun with
  `node --test --test-concurrency=1 tests/*.test.cjs`: 322/322 passed. The initial
  parallel run was 321/322 because an unchanged, unrelated `next-round` test
  races a 1ms real-time deadline; its narrow rerun also passed. No other game's
  production code or tests were changed to obtain the passing rerun.

This is a UI-only update. No roles, tasks, rewards, votes, game outcomes or sync
mechanisms changed. Refresh the host page and each player card; no redeal is
needed. Use the original `/chat-wolf.html` entry, not the archived v4 preview.

## Previous update — noticeable wolf tasks and cooperation (2026-10-04)

Incremental changes only: no new roles, outcomes, profession rewards, votes or
round flow. Fellow Fan remains disabled. The existing trusted-host/Firebase
architecture is retained; no new service, credentials, environment settings or
paid AI calls are required. The host page still needs to remain open.

- Every new formal deal has at least `ceil(sharedTaskCount / 2)` explicitly
  reviewed, audible small-tell tasks. The default three-task deal includes at
  least two. Ordinary conversational wording is not counted merely because it
  has quotation marks. New goals have new canonical history keys; real near
  variants retain shared mechanic groups. Exact-minimum draws are preferred,
  but more tells are allowed when needed. Existing generic/voice caps and strict
  recent-history exclusions remain; no silent repeat or ordinary-task fallback.
- Each unfinished shared wolf task has its primary completion control on the
  left. `Let me do it` and the intending players sit in a subdued right column
  in the same compact row, including on mobile. The private wolf team sees
  the intending players, and each can undo only their own intent. Both wolves
  may volunteer, either can still complete a task, and volunteering does not
  count as completion or affect the result. This metadata never enters the
  public game state, host presentation or final public recap.
- An unfinished Director direction remains a central popup through free chat
  and wrap-up. There is no `Got it`, timed dismissal, Escape or outside-click
  dismissal. `I did it` completes and closes it; entering a meeting/final-clue
  stage automatically folds it without completion, exposing turns and ballots.
  After that it remains available through `View direction`, including in the
  next chat round. A swapped direction starts its own persistent notice.
  Refresh, a second recipient session and old read acknowledgements cannot hide
  an unfinished current-chat direction. The older thirty-second receipt fields
  remain for saved-data compatibility, not as a dismissal unlock.

Verification performed for this update:

- Full repository automated suite: 320/320 passed, including new shared-task
  intent, persistent Director notice, actual content quota and transport tests.
- Authored bank: 501 active self-action tasks, including 328 reviewed small
  tells. All 48 topics passed 100 seeded sequences of eleven same-topic deals:
  52,800 successful strict draws, zero shortages, repeats, cap violations or
  below-half deals. These are default three-task engine tests, not a promise of
  unlimited capacity for twelve tasks across repeated games. Readable content
  audit found no duplicate English instruction or out-of-range 6–14-word task.
- Six independently credentialed synthetic original Hub cards passed the real
  Firebase test: concurrent wolf volunteering/withdrawal, rejected village
  impersonation, unchanged completion, no private metadata leaks, actual
  thirty-second elapsed persistence, reconnect, fresh swap, meeting auto-fold,
  all three rounds/votes/rewards and fresh restart. Only this run's temporary
  paths were cleaned; no existing player rooms were used.
- Functional in-app-browser localhost checks at 390px and 360px: prominent
  pending popup, refresh persistence, explicit completion/fold/reopen, and
  meeting auto-fold without completion. Separate local visual fixtures show
  the three wolf task controls. These are synthetic sessions and simulated
  mobile viewport sizes, not physical-phone or human voice-play tests.

Refresh the trusted host page and each original player card after publishing.
Existing seats, roles and dealt text are retained; use a new game/redeal for the
new authored task pool. The game still relies on honest human completion, not
speech recognition or an objective audio referee.

## Previous update — Director instruction popup (2026-10-03)

The read-to-dismiss behavior below is historical and superseded by the current
completion-or-meeting popup rule.

This is an incremental card/UI update; roles, tasks, rewards, voting and game
outcomes are unchanged. A received Secret Direction now opens in a large central
dialog on the recipient's private card. The original Hub card frame scrolls into
view via a same-origin, same-frame, content-free message; no instruction, role or
sender data is sent to the parent page.

- `Got it` is disabled for 30 seconds after the card first displays the dialog.
  The host-authoritative room stores this receipt and unlock deadline, so refresh,
  duplicate actions and another device do not restart or shorten the wait. A
  hidden/background card does not start a new reading window.
- After acknowledgement the instruction folds into its existing card section;
  the fixed `View direction` shortcut reopens it without another reading lock.
  `Got it` means read, not performed: `I did it` remains a separate action and no
  wolf progress or village reward changes. A swapped instruction starts a fresh
  30-second window. Old assignment actions cannot close the replacement.
- Reading/acknowledgement remain available while the game is paused or in a
  meeting, without changing any game timer or allowing task completion there.
  Finished/restarted matches do not keep the popup. Receipt metadata is private
  to the recipient, not a Director receipt or a public recap field.

No new service, credentials, environment variables, database policy or AI calls.
The existing trusted host must still keep its page open to process card commands.
`node scripts/chat-wolf-direction-popup-preview.cjs` opens a localhost-only,
fixed synthetic recipient at `http://127.0.0.1:8093/`; it is an interactive test
fixture, never a production player-card selector or Firebase tool.

Verification for this popup revision:

- Full repository automated suite: 291/291 passed. New coverage includes 8 engine,
  6 multi-client transport, 3 UI/focus/visibility and 5 actual parent-frame/host-card
  tests. Existing game, card bridge and other Hub game regressions also passed.
- Six independently credentialed synthetic original Hub cards passed the real
  Firebase test: actual elapsed 30-second lock, premature acknowledgement rejected,
  same saved receipt across reconnect/duplicate clients, private metadata, fresh
  swap notice, unchanged task progress, and all three rounds/votes/rewards/restart.
  Only this run's synthetic paths were cleaned. The maintenance script also waits
  for committed Topic Shifter data to publish to all cards before checking it.
- In-app browser checked the functional localhost fixture: central visible popup,
  disabled button, refresh continuing the countdown, acknowledgement/fold/reopen,
  refresh after acknowledgement, swap reopening, and Escape not dismissing. Mobile
  viewport checks at 390 and 360 pixels kept the dialog within the card width.

These are local browser/simulated viewport and actual database-session checks,
not physical-phone or human voice-chat verification. Publishing is verified by
comparing the root game assets plus the changed original `play.html` card shell.
After publishing, refresh both the trusted host page and participants' original
cards to load the new engine and UI; their persisted seats and roles are retained.

## Previous update — special-wolves-v6 (2026-10-03)

Incremental release at the original `chat-wolf.html` entry. Existing dealt cards
remain snapshots until redeal. No change to votes, Jester outcomes, profession
rewards, three-round flow, shared completion, host presentation or the accepted
trusted-host/Firebase architecture. Fellow Fan and Control/Puppet Wolf remain off.

- Every new deal randomly assigns exactly one Director Wolf. The optional Lobby
  Topic Shifter occupies one additional wolf seat; remaining wolves are normal.
  The host sets the pool, never the player identities.
- Director sees five saved options from different families, one target list
  (`Random` plus all non-wolves, including Jester), and `Send Direction`. One use
  during unpaused free chat. Only the recipient sees `Secret Direction`, `I did
  it`, and a once-only, low-pressure swap. Completion never changes wolf progress;
  no public confirmation or sender identity is available until the final recap.
- Topic Shifter has one short input (150 characters) and one use. The public
  Temporary Topic defaults to 180 seconds, adjustable in the Lobby from 60–300.
  It preserves the round, accumulated chat time, roles, tasks and follow-up history.
  Pause and host lease recovery retain remaining time. Expiry or host early end
  returns to Main Topic. Text rules prohibit vote manipulation; there is no AI
  moderation or objective speech verification.
- Red Wolf, yellow Jester, green Village labels remain. Abilities follow visible
  tasks; `? Role Rules` is closed by default. Host chat time is still collapsed.
- Reviewed all 575 village cards against 48 main topics and 384 follow-ups.
  Removed/replaced two unrelated first-impression mappings; changed 145 cards:
  35 wording edits and 110 goal rewrites, including all 96 Judge tasks. Each Judge
  task is now a personal spoken action; its final tie reward is unchanged.
- Formal wolf draws now use only self-actions: 501 cards, with 42 targeted Soft
  Tell rewrites and 80 additions. 379 existing self-actions retain their text;
  246 interaction cards are archived, never a shortage fallback. Some unchanged
  wolf cards retain broader topic mappings; this was not a complete wolf rewrite.
- Director pool: 48 reviewed voice-only directions, 16 `shared_soft_tell` and
  32 `director_only`, across 12 families. Formal wolf mechanic counts and actual
  reviewed samples are in [the current QA report](docs/chat-wolf-v6-content-qa.md).

### Running and multiplayer access

No new service, schema, key or AI API is required. Keep the existing Firebase
configuration. Open the original Hub, create a Chat Wolf room, invite participants
using their original `play.html` private cards, and have them use Ready and game
controls there. The host presentation contains no personal role/card; the host
plays through the separate private card. As before, the trusted host tab must stay
open and awake to process commands. It is not an independently hosted server.

For local viewing, run `node scripts/chat-wolf-dev-server.cjs` from this repository.
The separate `scripts/chat-wolf-ui-preview.cjs` is explicitly a localhost-only
visual sample with inert actions; it is never a production player or room tool.

### Verification performed for this revision

- Full repository automated suite: 269/269 passed, including 186 Chat Wolf tests
  and the existing Hub/other-game regressions. Production HTML/browser content
  dependency order and current report consistency were checked too.
- Strict actual-engine draws: 48 topics × 100 seeds × 11 deals = 52,800 successes,
  zero exhaustion, repeats, cap violations, history resets or silent overrides.
- Twenty consecutive Director sends and recipient completions across saved
  redeals: five different families per offer, zero adjacent offer repeats and zero
  changes to wolf/village tasks or rewards. The recorded seed used 43 distinct
  directions out of 100 offers; max single-direction appearances was five.
- Opt-in real Firebase test passed six independently credentialed synthetic Hub
  card sessions, Director/Jester/private swap/once-only races, six matching
  Temporary Topic deadlines, pause/resume, reconnection and host early end,
  plus all three rounds, rewards, private votes, final Judge and fresh restart.
  Only this run's temporary paths were cleaned. The network test used host early
  end; the full 180-second expiry is verified with an authoritative simulated clock.
- In-app browser and Chrome checked local visual cards and text entry. Mobile
  viewport checks at 360/390 pixels had no horizontal overflow, correct colors,
  closed rules and no private role on the host view. These are visual samples,
  not a claim that the sample's inert buttons control a live match.

Not verified: physical phones on different networks, a human voice-chat group,
fun/balance, or objective completion. Publishing is verified separately by fetching
the production assets and comparing hashes; a push alone is not deployment proof.

Reproduce the current editorial/capacity report:

```powershell
node scripts/chat-wolf-v6-report.cjs --write
$env:CHAT_WOLF_LIVE_TEST = '1'
$env:CHAT_WOLF_TEST_CARDS = '1'
node scripts/chat-wolf-v3-live-test.cjs
```

## Previous release — readable-v5 (historical counts and checks)

This is an incremental content/UI release on the existing production entry.
No role, profession power, Jester victory, vote priority, three-round flow, three
shared wolf tasks, meeting, timer or trusted-host architecture was changed.

### What changed

- Wolf role names/borders are red, Jester yellow and villagers green. Text labels
  remain, so color is not the only identifier. Host presentation still shows no role.
- The private-card top no longer shows **Read your card** or room number. A closed
  **Room info** disclosure at the bottom retains room number and stage for reconnect help.
- One complete current question appears directly above tasks. No duplicate sticky
  question or duplicate progress. Follow-ups remain manual; original context is collapsed.
- **Wolf tasks 0/3**, **Shared by all wolves**, and closed **? Rules** replace repeated
  explanatory paragraphs. Tasks remain visible without opening anything.
- All 48 English/Chinese main questions were shortened; all 384 follow-ups remain.

### Content quality and actual counts

All 1,425 previous wolf-card wordings were removed from active draws, not destroyed:
existing match snapshots and audit/migration data remain recoverable. The curated
pool has **667 unique cards**: **246 interaction / 421 self-action**. Of these,
**39** are same-goal rewrites with their original canonical identity retained.
English average **9.21 words**, median **9**; **0 over 14**, **0 under 6**.

The root editor read 120 final sample rows. Independent reviews also covered all
274 A cards and 198 B cards, including context/wording corrections. C's 182 cards
were checked during authoring and sampled again. No active task requires object
personification, naming, nicknames or invented words. Public fantasy topics remain;
their wolf tasks are ordinary conversational actions. This is editorial review by
coding agents, not a claim that human players have proved the content balanced.

There are still near-variant actions, such as different concrete help offers or
thank-you remarks. They intentionally share mechanic groups; aliases migrate in
saved history. Same-deal duplication and three-deal near-variant exclusion remain.
There are no exact English duplicates. The eight deliberately generic self-actions
are shared across all topics, with at most one per deal; they are not counted as
48 separately authored sets. The old 60/20/40 content quota is superseded by the
user's readability-first requirement.

Per-topic candidate counts below are **before exposure exclusions**. The total
includes eight generic self-action candidates; the current-match rules still select
one interaction and two self-actions. A finite pool can eventually exhaust: the
existing explicit host recovery choice remains, with no silent fallback or reset.

| Topic | Available | Interaction | Self |
| --- | ---: | ---: | ---: |
| 01 · One Trip, Different Holidays | 52 | 18 | 34 |
| 02 · A Month Under One Roof | 51 | 17 | 34 |
| 03 · Four Hours in One Car | 56 | 18 | 38 |
| 04 · A Weekend With No Plans | 53 | 19 | 34 |
| 05 · A Shared Work Table | 79 | 27 | 52 |
| 06 · A Gathering Without Signal | 51 | 17 | 34 |
| 07 · A New Friend Joins Us | 51 | 17 | 34 |
| 08 · Dinner in One Kitchen | 50 | 16 | 34 |
| 09 · A Shop That Lets Us Rest | 52 | 16 | 36 |
| 10 · A Birthday on a Small Budget | 123 | 43 | 80 |
| 11 · Our Unusual Little Show | 54 | 20 | 34 |
| 12 · Ordinary Objects on Display | 50 | 16 | 34 |
| 13 · A Gathering Without Pressure | 51 | 17 | 34 |
| 14 · An Interesting Ordinary Street | 50 | 16 | 34 |
| 15 · A One-Day Swap Shop | 50 | 16 | 34 |
| 16 · A Room to Rest In | 50 | 16 | 34 |
| 17 · Powers That Only Help Neighbors | 51 | 15 | 36 |
| 18 · Borrowing a Friend’s Routine | 50 | 14 | 36 |
| 19 · One Hour Just for You | 49 | 13 | 36 |
| 20 · The Objects Have Complaints | 71 | 15 | 56 |
| 21 · A Ten-Second Redo | 50 | 14 | 36 |
| 22 · A Small Package From the Future | 48 | 15 | 33 |
| 23 · Watching an Ordinary Moment Again | 50 | 17 | 33 |
| 24 · Impossible Everyday Services | 53 | 17 | 36 |
| 25 · A Thoughtful Gift You Do Not Want | 79 | 22 | 57 |
| 26 · One Dinner, Different Bills | 53 | 16 | 37 |
| 27 · A Group Chat That Never Stops | 55 | 16 | 39 |
| 28 · A Photo You Do Not Want Shared | 53 | 17 | 36 |
| 29 · Help You Did Not Ask For | 83 | 23 | 60 |
| 30 · An Invitation Accepted Too Quickly | 51 | 16 | 35 |
| 31 · An Honest Response to a Friend’s Work | 60 | 19 | 41 |
| 32 · A Favorite Item Comes Back Worn | 80 | 23 | 57 |
| 33 · An Assistant That Knows Your Taste | 53 | 16 | 37 |
| 34 · Everyone Leaves the Planning to You | 61 | 20 | 41 |
| 35 · A Hobby or a Job? | 47 | 15 | 32 |
| 36 · Changing Your Mind in Front of Friends | 48 | 15 | 33 |
| 37 · Speaking Up for an Old Object | 53 | 15 | 38 |
| 38 · A Small Mistake Friends Keep Retelling | 44 | 12 | 32 |
| 39 · A First Impression Changes | 53 | 17 | 36 |
| 40 · A Habit Others Do Not Understand | 69 | 19 | 50 |
| 41 · A Purchase With a Different Ending | 63 | 18 | 45 |
| 42 · A Small Act of Care | 65 | 19 | 46 |
| 43 · A Good Day After Plans Failed | 57 | 16 | 41 |
| 44 · A Small Skill That Comes in Handy | 61 | 16 | 45 |
| 45 · What Makes an Ordinary Day Good | 48 | 16 | 32 |
| 46 · An Interest You Found by Accident | 50 | 16 | 34 |
| 47 · Effort People Do Not See | 74 | 24 | 50 |
| 48 · Enjoyment You Do Not Want to Outgrow | 70 | 19 | 51 |

The complete reproducible report, including family/mechanic distributions,
near-variant examples and the 120 sampled texts, is
[qa/chat-wolf-readable-report.json](qa/chat-wolf-readable-report.json).
Run `node scripts/chat-wolf-readable-report.cjs --write` to regenerate it.

### Validation in this revision

- Full local suite: **233/233 passed**, no failures or skips.
- 100 seeded runs each: initial deal + 10 same-topic restarts (**1,100 deals**),
  10 same-topic normally completed games (**1,000 full games**), and 10 changing-topic
  deals (**1,000 deals, 900 actual topic changes**). Every run succeeded, with zero
  canonical/recent-variant repeats, same-deal mechanic collisions, history resets,
  generic/voice-cap violations or exhaustion. Tests use the actual curated bank.
- Opt-in real Firebase test passed with six independent synthetic original Hub cards:
  readiness, shared task progress, private projections, complete three-round votes,
  final Judge decision, result and fresh restart. Only its own test data was removed.
- In-app browser: actual red/yellow/green computed colors, one question/progress,
  closed Rules, accessible footer room/stage, private readiness button, host no-role
  presentation. Wolf card widths 360/390/430/1280 had no horizontal overflow.
- This revision does **not** claim a new Chrome/multi-browser pass or physical phone
  testing. Six network clients and viewport emulation are not six physical devices.
  Live voice-game naturalness and balance still need group play-testing.

### Running and publishing

Use the same original Hub/player-card links and `/chat-wolf.html`, not the archived
preview. Reload the host and private cards, then start/restart a game for the new
wording; an in-progress game deliberately keeps its original dealt content.
No new environment variables, server, credentials, migrations or AI usage fees.
Local serving remains `node scripts/chat-wolf-dev-server.cjs`.
Optional local-only visual samples: `node scripts/chat-wolf-ui-preview.cjs`;
these are clearly labeled synthetic samples, not real multiplayer sessions.

Runtime files changed: four `chat-wolf-v5-readable-*.js` banks,
`chat-wolf-v4-content.js`, `chat-wolf-v4-taxonomy.js`, `chat-wolf-v3-ui.js`,
`chat-wolf-copy.js`, `chat-wolf.css` and `chat-wolf.html`. Tests and report tools
are included. Production verification uses `node scripts/chat-wolf-verify-release.cjs <commit>`.

## Prior production record — content / flow v4 (2026-10-02)

The following describes the previous release. Its 1,425-card and 223-test figures
are historical, not the current curated pool or current test count.

The original `/chat-wolf.html` entry now contains the completed content/flow update.
The isolated `/chat-wolf-v4-preview/` directory is an archived development snapshot,
not the current game. Use the original Hub to distribute player cards and open Chat
Wolf. Keep **Use player cards already sent from Hub** enabled, choose the host's
seat, and create the room. Participants keep their original `play.html` links;
**Reconnect original cards** republishes only each card's own session if needed.
The host's own playable card opens separately from the public presentation.

### Latest decisions and behavior

- Kindred remains disabled. Professions are unique; surplus villagers are ordinary.
- Every follow-up is manual, including round 2. Eight related choices per main topic;
  the host can choose or draw an unused one and return to the main question.
- Host presentation does not display its role, tasks, private rewards or ballot.
- Chat time starts collapsed. The host can expand elapsed minutes/seconds; players
  do not get a large chat countdown. Manual ending is the default; a suggested-time
  reminder does not end conversation. Pause/reconnect preserves active elapsed time.
- Meetings give each person one timed turn (default 60 seconds), with self-end,
  skip and host recovery. The saved order rotates its starting player next meeting.
  Final tasks lock before private clues, then final discussion, then final voting.
- New flow task completion/undo is TALK-only, including when optional automatic
  timing is selected. No evidence forms, audio judging, or host task review.
- Existing running matches retain their saved cards. A new deal upgrades their
  flow; archived flow3 matches retain their earlier stage semantics until then.
- Default estimate: six players 50:50; eight players 56:50, excluding setup,
  pauses, extra chat and host choices. The estimate is not a forced time limit.
- Final Judge decisions cannot be bypassed by restart or cancel. The saved timeout
  still resolves a missing decision. Earlier win/Jester/vote priorities are unchanged.

### Content and allocation

There are 48 complete bilingual main topics, 384 follow-ups, 1,425 authored wolf
cards, and 575 village cards (576 mappings: two per enabled profession/topic).
Each topic has 62–117 unique canonical wolf candidates, at least 20 interactions,
40 self-actions and 21 broad normalized families. Cards shared by compatible topics
retain one canonical identity; this is not 48 independent copies of each bank.
Ordinary preference prediction, naming, third-person self-name and rejected
voice-roleplay are not active fallback mechanics. Editorial checks do not establish
play-tested fun or balance.

Recent 60 wolf canonicals, three-deal mechanic avoidance and five-deal soft family
preference are separate from village history. Bait shares applicable action groups.
Exposure records at assignment, not task completion or results. Restart, rerolls,
replay and new rooms retain host-scope history; repeated reads do not record again.
Aliases also migrate in saved history. A complete search precedes exhaustion;
only an explicit host choice relaxes recent exclusions for one deal.

The original 70d0c56 audit did **not** reproduce “restart clears history”: its
history survived every tested restart. It instead found a shared wolf/village
60-entry window, soft-only mechanic penalties, no cross-room host history and
heavy generic/vocal content. The baseline script preserves those factual results.

### Validation and reports

Run `node --test tests/*.test.cjs` for the regression suite.
The final local run passed **223/223** tests, with no failures or skipped tests.
The opt-in real Firebase six-card test also passed the complete three-round game
and restart. Automated test clients are not a claim of six physical devices.
Production commit `3afbd45` was pushed to the existing main branch. A read-only
check of the live original entry matched **23/23** runtime asset hashes (normalizing
line endings), and the live page opened in the in-app browser with original Hub
card setup enabled. Recheck with `node scripts/chat-wolf-verify-release.cjs 3afbd45`.
Run `node scripts/chat-wolf-v4-content-report.cjs --write` for the real-content
report at `qa/chat-wolf-v4-content-report.json`, including per-topic counts,
family distributions, candidate counts at every filter and 2,000 synthetic deals.
The 100-seed × 10-deal same-topic and changing-topic runs both have zero shortages,
silent canonical repeats, recent-group repeats, duplicate voice pairs or invalid
cards. Generic shares are 8/3000 and 5/3000. These use the actual authored pool,
not the separate synthetic exhaustive-search fixture in engine tests.

The real Firebase test can be rerun in PowerShell with:

```powershell
$env:CHAT_WOLF_LIVE_TEST='1'
$env:CHAT_WOLF_TEST_CARDS='1'
node scripts/chat-wolf-v3-live-test.cjs
```

It creates six independent test sessions and fresh synthetic original Hub cards,
checks readiness, privacy, all three rounds, votes, Judge result and restart, then
removes only its own temporary room/card/history data. Do not use real player links
as test fixtures. Chrome UI checks covered Hub setup, original-card connection,
private readiness/task completion, host follow-up synchronization, collapsed and
expanded timer, and 360/390/430 viewport widths without horizontal overflow.
Viewport emulation is **not** proof of separate physical-device testing. Physical
phones, long real voice sessions, and content balance remain user play-test work.

### Runtime, deployment and limits

No new service, secret, environment variable, migration or AI API is required.
Keep the existing public `firebase-config.js` connection and existing Firebase
rules. Local serving: `node scripts/chat-wolf-dev-server.cjs`, then open the printed
localhost address. The live site uses the existing Git-connected deployment.
This remains the explicitly accepted **trusted-host** design: the host browser
processes the room and must stay open/awake; the game persists in Firebase and
reconnects, but it is not a new always-on trusted server. Host presentation hides
secrets; a technical host can still inspect its authority state. Public projections
and other players' cards do not receive that state or individual ballots.

Cross-room history follows a private opaque credential in the same host browser.
Using another browser/device or clearing its storage creates a different scope;
no account-based cross-device host identity is claimed. Conditional updates and
the recovery journal serialize room/history allocation. No private credentials or
real participant content appear in the published audit report.

Main implementation files: `chat-wolf-v4-content.js`, the three expansion banks,
the three wolf banks, `chat-wolf-v4-village.js`, `chat-wolf-v4-taxonomy.js`,
`chat-wolf-v3-engine.js`, `chat-wolf-v3-rules.js`, `chat-wolf-history.js`,
`chat-wolf-sync.js`, `chat-wolf-v3-ui.js`, `chat-wolf.js`, copy/CSS/HTML, plus tests
and audit scripts. Other Hub games and the existing card bridge are retained.

---

# Archived free-chat edition v3 behavior

Incremental update, 2026-09-30. The existing room, Firebase connection, reconnect credentials, original Hub player cards, and deployment are retained. This document describes v3 only; saved legacy games retain their earlier rules.

## User decisions that override the attached specification

- The shared host presentation does not show the host's role, tasks, rewards, or ballot before the result. The host plays through a separate private card. All roles are revealed after the game ends.
- Round 2 automatically opens one unused, compatible follow-up. Later rounds do not automatically change the question.
- Kindred is not enabled. Its proposed reward remains deferred.
- Professions cannot repeat. Remaining village seats become ordinary villagers; unselected professions are never added to fill them.
- The user explicitly accepts the existing trusted-host architecture and publishing without a new backend.

## Playing and defaults

The default setup is 6 players: 2 wolves, 1 optional Jester, and 3 villagers. At least 2 village seats must remain. Roles are randomly dealt; the host cannot assign a specific player's role.

There are 3 continuous free-chat rounds of 600 seconds. Each ends with a 30-second wrap-up, 60-second discussion, and 45-second vote. Before the final discussion, tasks lock and players get 20 seconds to read private clues. A necessary final Judge decision lasts up to 15 seconds. The default estimated core duration is **37 minutes 20 seconds**, excluding setup, pauses, extensions, and extra conversation.

The main topic and optional short conversation starters appear during role reading. Follow-ups stay within that topic, preserve timers and task progress, and keep a used-question history. The host can return to the main question. To change the whole topic, use a confirmed redeal.

The wolf team shares M tasks: I interaction tasks and M−I self-actions. Defaults are M=3 and I=1. These are not personal tasks or a separate set per wolf. Any wolf can complete any task; every task must be completed for a possible wolf win. Interaction tasks need someone outside the wolf team, including the Jester if applicable.

Task completion is one button, only during free chat or wrap-up. No target list, notes, evidence, audio analysis, or host review is required. Completion is an honest player report, not objective verification. Finishing tasks does not end the game.

The six selectable village professions are Reporter, Experienced Voice, Bait, Dreamer, Other Side, and Judge. Their short tasks unlock private rewards. Every profession has at most one player; Experienced Voice plus Other Side has a combined default maximum of one. Ordinary villagers have normal conversation and voting rights without a task. Uncompleted village tasks do not prevent a village win.

Reporter, Bait, and Dreamer require a midgame vote, so configurations containing them need at least two rounds. Rewards and their availability windows are explained on the private card. Opening task swaps preserve the profession and reward. These proportions, clue rules, and tasks are play-test defaults, not proven balance.

## Votes and outcomes

Every player can choose 0–K different other players, where K is the wolf count. No self-vote is allowed. Abstaining is an explicit button; a missed deadline also abstains. Submitted votes lock. Draft choices are never submitted automatically.

Each vote is independent. Only candidates with positive totals can enter the room's top-K team guess; zero-vote candidates do not fill empty places. All-abstain means no team guess. A boundary tie is resolved once and persisted. An eligible Judge can privately decide a final boundary tie; a saved random draw handles missing decisions or remaining ties.

A complete wolf-team identification ends the game immediately with a village win. A wrong midgame guess reveals no hit count or identities. Final outcome priority is:

1. Exact identification of all wolves: villagers win.
2. Otherwise, Jester meets the final highest-vote condition: Jester wins alone.
3. Otherwise, every shared wolf task was reported complete: wolves win.
4. Otherwise: draw.

The default Jester condition is the unique highest total with at least one vote. The host may explicitly allow tied highest totals. Midgame votes never trigger a Jester win. Judge choices do not add votes or change the Jester's original totals.

## Host recovery and compatibility

The host can begin talking even if some players have not confirmed their cards, pause/resume, extend talk, end talk or discussion early, close voting with missing submissions treated as abstentions, and cancel without declaring a winner.

A confirmed redeal is available after dealing roles, including during voting and at results. It keeps the room, players, links, host, settings, and recent-content history; it can keep or replace the topic. It clears the current match, redeals roles/tasks, creates a new match ID, and returns to card reading. Old-match requests cannot affect the new deal.

New rooms use settings.mode = free-chat-v3 and rulesVersion = 3. Existing rooms are not silently converted midgame. A legacy host can select **Set up the new edition** in the old lobby or results page, keeping the room and player links. The upgrade returns to the v3 lobby so its settings can be reviewed. Otherwise legacy rendering and rules remain available.

Refresh both the host page and player cards before starting the updated edition. Existing original Hub cards continue to embed the same playable card rather than a second implementation.

## Architecture and privacy boundary

This is a static web app backed by the existing Firebase Realtime Database. The host browser executes the game engine; Firebase stores persistent shared state. The host page must stay open, connected, and awake. It is not a server-executed or hostile-host-secure game.

The transport uses ETag compare-and-swap updates, host leases, session credentials, command ordering, match IDs, and phase versions to prevent duplicate or stale transitions. Reconnection keeps the player's identity. Local storage saves session/recovery credentials, not authoritative game state.

Player card projections separate public state, wolf-team data, and individual rewards/ballots. The shared host presentation deliberately receives a display-safe private projection, while the host's separate card receives their player view. Before the result, ordinary public views contain neither dealt wolf tasks nor complete ballots or role lists. Candidate material is distributed as static game content; the actual deal and current progress are private projections.

This protects normal play and screen sharing, not against a technically malicious host: the host engine necessarily has canonical game data. Do not describe UI hiding or these Firebase bearer paths as server-enforced protection against the host. Keep private-card links private; a link is that player's credential.

## Files

- chat-wolf-v3-rules.js: centralized defaults, limits, professions, and estimates.
- chat-wolf-v3-content.js: prewritten English topics, short tasks, and clue metadata.
- chat-wolf-v3-engine.js: state transitions, deals, rewards, votes, outcomes, and private projections.
- chat-wolf-engine.js: compatibility routing to legacy or v3 rules.
- chat-wolf-sync.js: existing Firebase transport, v3 request fencing, and host presentation projection.
- chat-wolf-v3-ui.js: new-mode rendering and actions.
- chat-wolf.js, chat-wolf-copy.js, chat-wolf.css, chat-wolf.html: shared entry, English copy, styles, and module loading.
- scripts/chat-wolf-v3-content-report.cjs: per-topic candidate and duplicate report.
- tests/chat-wolf-v3-*.test.cjs: engine, transport, rendering, and content checks.
- scripts/chat-wolf-v3-live-test.cjs: opt-in synthetic-player test against real Firebase.

No database migration, new cloud service, Firebase Admin credential, model API key, or new environment file is needed for the existing deployment. New-mode state uses the existing versioned room data. Never put service credentials in frontend files.

## Actual content inventory

- 48 main topics; 384 follow-ups; 144 optional entry prompts.
- 84 distinct wolf-card IDs: 60 reusable cards plus 24 topic-specific variants.
- 45 distinct wolf mechanics across 17 families.
- Each topic has 60–62 compatible wolf candidates: 20–21 interaction and 40–41 self-action cards, covering 17 families.
- 576 village cards: 96 for each of the six professions, giving 2 per profession per topic.
- The report finds no duplicate IDs, exact normalized wolf sentences, or exact normalized village sentences.

Shared candidates retain the same IDs across topics. Per-topic counts are not thousands of unique wolf tasks; related variants share mechanic/variant identifiers. The room keeps the latest 60 issued tasks and prefers unseen IDs/mechanics; restart also counts as a deal. If necessary, it relaxes older compatible history instead of drawing an incompatible card.

The minimum content targets are met. The optional stretch targets of 80–100 compatible wolf cards per common topic and 4+ village cards per profession/topic are **not yet met**. Real groups have not validated every wording or overall game balance.

## Local startup and multiplayer

From the repository:

```text
node scripts/chat-wolf-dev-server.cjs
```

Open http://127.0.0.1:8088/chat-wolf.html. This preview uses the real existing Firebase database, not local-only multiplayer. The preview server binds to loopback; that localhost address is not a phone-accessible deployment.

For normal multiplayer, use the existing hosted Chat Wolf page or the Hub's original player-card flow. Share the room invite or each player's own card, not the host's private card. Keep the main host page open while players use their own browsers/devices. Publishing continues through the existing repository deployment; this document alone does not assert a particular revision is deployed.

## Verification recorded during implementation

The following scopes were run successfully:

- Full repository regression run: **172/172 tests passed**, no failures or skips (`node --test tests/*.test.cjs`). The entries below are included scopes, not additional tests.

- 33 v3 engine tests.
- 17 synchronization tests (9 existing transport tests and 8 v3 tests).
- 9 v3 UI/rendering tests, including actual engine projections through a complete three-round game.
- 4 action/heartbeat integration tests protecting user clicks, focus, and stale-phase fencing.
- 6 v3 content validation tests.
- 20 existing legacy engine tests.
- Real Firebase smoke test with 6 synthetic player sessions, separate host presentation/card, concurrent host/card presence updates, shared progress, follow-ups, votes, recovery/redeal, and cleanup of the test's own data.

Useful commands:

```text
node --test tests/chat-wolf-v3-engine.test.cjs
node --test tests/chat-wolf-v3-sync.test.cjs
node --test tests/chat-wolf-sync.test.cjs
node --test tests/chat-wolf-heartbeat.test.cjs
node --test tests/chat-wolf-v3-ui.test.cjs
node --test tests/chat-wolf-v3-content.test.cjs
node --test tests/chat-wolf-engine.test.cjs
node scripts/chat-wolf-v3-content-report.cjs --summary
node scripts/chat-wolf-v3-content-report.cjs
```

The full content-report command prints the real per-topic counts and identified variant groups. The live smoke is deliberately opt-in; in PowerShell:

```powershell
$env:CHAT_WOLF_LIVE_TEST = '1'
node scripts/chat-wolf-v3-live-test.cjs
Remove-Item Env:CHAT_WOLF_LIVE_TEST
```

Browser checks on this computer used the Codex in-app browser and Chrome, with the real Firebase room: creation and six-player joining, private-card Ready, role persistence after refresh, host presentation without its role, one-click wolf progress seen on a teammate card, shared follow-ups, Round 2's automatic follow-up, a one-name ballot with K=2, abstention, a private village task, and time extension with an updated duration estimate. A 390-pixel mobile viewport had no horizontal overflow. These are browser and simulated-viewport checks, not physical-phone tests.

Physical-device cross-network play, real group play, and balance have not been verified. Deployment must be checked separately; test-only room actions do not prove a production revision has been published.
