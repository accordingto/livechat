# Chat Wolf — content / flow release v4

## Current production update — 2026-10-02

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
