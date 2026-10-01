# Chat Wolf content / flow development preview — 2026-10-02

**Archived snapshot:** the completed update is now in the original `/chat-wolf.html`
entry with Hub card integration. See `chat-wolf-v3-mode.md` for the current release.
The following record describes the earlier preview at the time it was published.

## Release boundary

This is an isolated, playable **development preview**, not the completed content release.
Entry: `/chat-wolf-v4-preview/chat-wolf.html`. The original `/chat-wolf.html`
and Hub entry remain on the existing release. No new backend, credentials, paid
AI API, recording, or speech analysis is used.

The user confirmed: Kindred stays disabled; **all follow-ups are manual**,
including round 2; the chat clock starts collapsed and only the host can expand
it. Host presentation never displays its own private role or ballot.

## Implemented

- Host-confirmed free-chat ending by default; elapsed time continues beyond the
  suggestion. One private gentle reminder, snooze, pause/resume, no forced stop.
- Individual meeting turns with a saved order, rotated starting player in later
  meetings, self-end/skip and host override. Changing the turn duration applies
  to the next speaker. Final clue stage precedes final discussion and voting.
- Role → current complete question → direct task cards → reward reading order.
  English is the default; optional Chinese task explanations retain required
  English spoken lines. Mobile cards keep access to the current question.
- Unique village professions, ordinary villagers filling spare seats, existing
  wolf/Jester/vote/reward outcome priorities retained.
- Recent canonical task history, shared mechanic groups, family preference,
  maximum one generic and one vocal-performance self-task in a deal. Backtracking
  selection either returns a valid full deal or leaves the room unchanged.
- A shortage is shown to the host. Reusing recent tasks requires an explicit
  one-deal choice; it is never silent. Existing old matches keep saved content
  and their old flow; a new deal upgrades the flow.
- Cross-room recent history for the same host browser is persisted in Firebase.
  Only a random private history credential is stored locally. Conditional writes,
  a scope lock and a recoverable allocation journal prevent concurrent rooms or
  missed responses from counting an exposure twice. Clearing browser storage or
  using another browser creates a different host-history identity; there is no
  account login or automatic cross-device host-history identity.

## Content and outstanding gap

- 48 main topics, 384 related follow-ups (8 per topic), bilingual content.
- 564 authored wolf cards across the pool; **10–24 compatible cards per topic**.
  This does **not** meet the required 60 per topic / 20 interaction / 40 self-action.
- 575 village cards, 576 topic mappings: two alternatives for each of six enabled
  professions on all 48 topics. Kindred is not dealt.
- Action-group labels do not prove qualitative variety. Additional editorial
  review and playtesting are still needed, especially for near-similar utterances.
- Large custom task counts can exhaust a topic. Repeating one topic often needs
  the host's explicit repeat permission after a few games.

Actual-content simulation: 100 seeds × 10 deals each, six players / defaults:

| Scenario | Deals | Shortages requiring explicit retry | Voice pairs / invalid cards / silent repeats |
| --- | ---: | ---: | --- |
| Same topic | 1000 | 659 (earliest game 3) | 0 / 0 / 0 |
| Changing topic | 1000 | 20 (earliest game 4) | 0 / 0 / 0 |

82/100 changing-topic runs completed all ten games without a shortage. The
simulation explicitly grants permission only after a failed draw, not on behalf
of real users. The old release already preserved history across restart; this
update adds cross-room persistence and stronger avoidance, not a fix for an
imaginary history-reset bug.

## Files and running

The published preview directory contains its complete runnable source:
`chat-wolf-v3-engine.js` / `chat-wolf-v3-rules.js` (flow), `chat-wolf-sync.js` /
`chat-wolf-history.js` (sync and history), `chat-wolf-v3-ui.js` / `chat-wolf.js` /
`chat-wolf.css` (UI), and the six `chat-wolf-v4-*` content/taxonomy modules.
`asset-manifest.json` lists the 22 public runtime assets and normalized SHA-256s.

Serve the repository with any localhost static server, e.g.
`python -m http.server 8088`, then open
`http://localhost:8088/chat-wolf-v4-preview/chat-wolf.html`.
The existing Firebase configuration/rules are reused; no environment secrets or
migrations are required. HTTPS or localhost is required for browser cryptography.

Create a fresh preview room, copy its invite, and let participants join that
preview link. Each gets an operational private card. The host opens their own
private card separately and shares only the presentation tab. The isolated
preview intentionally does not replace existing Hub iframe-card links; use a
fresh preview invitation, not an old game's player link.

The host tab **must stay open and the device awake**. Data is stored remotely,
but the trusted host drives progression. Technically knowledgeable hosts can
inspect canonical secrets; the user explicitly accepted that trust model. This
is not hostile-host isolation or a server-executed game. Do not weaken database
rules or expose private session/history credentials.

Root-level flow/content changes remain local working changes for a future full
rollout. Only the isolated preview, its independent smoke tests and this handoff
are published, so the main entry is not silently upgraded.

## Verification record

- Local Node tests: final full working-source repository suite passed **216/216**,
  including three new content validators and two standalone preview smoke tests.
- Existing Firebase: six independent Node client sessions ran all three rounds,
  two intermediate votes, final judge boundary tie, wolf win and restart. Checked
  shared progress, host/private-card heartbeat race, roles, private ballots,
  follow-ups, pause, reconnect and cross-room history. Temporary scripted room
  and history paths from that run were cleaned. No real player rooms changed.
- Real browsers: Codex in-app browser host + Chrome player in a temporary room.
  Ready from card, immediate wolf tasks, Chinese explanation, manual follow-up
  sync, default-collapsed/expanded host clock, task completion, host skip and
  player self-end and a private ballot submission were exercised. Refresh kept
  the same identity/progress; round 2 kept the manual follow-up. Chrome narrow viewport had no horizontal
  overflow. This is not a physical phone test.
- Still unverified: real phones/tablets, multiple physical devices and live
  English-learning group balance.
- Deployment confirmed at commit `6da1806`: all **22/22** HTTPS runtime assets
  matched the published manifest. The original root HTML, main controller and
  v3 engine matched release `70d0c56` byte-for-byte; its entry was not upgraded.

Independent preview smoke test (works from a clean checkout):
`node --test tests/chat-wolf-v4-preview.test.cjs`.
