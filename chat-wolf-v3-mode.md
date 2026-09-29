# Chat Wolf — free-chat edition v3

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
