# Bluff King · Live Chat

An original conversation adaptation for **3–9 real players**, appended after
Dixit at the bottom of the existing IceBreak Hub menu. English topic cards;
English controls by default, with the existing Traditional Chinese switch.

## Starting a game

1. Use the existing Hub room setup and open **Bluff King · Live Chat**.
2. The existing 3–9 participants and seat order are imported automatically.
   Keep the host table open and the device awake throughout the game.
3. Existing `play.html` links switch automatically to each original player's
   own card. There is no second name form, login, or join button.
4. The host table is an unseated moderator and adds no extra playing seat.
   The host plays through their own original Hub player link, just like everyone
   else. The shared table displays only public information.
5. Click **Start one full circle**, check the topic, then **Use this topic & deal
   roles**. Every original card shows its own role, readiness, live Spotlight,
   reveal and score. The first Thinker is random; later
   Thinkers follow fixed seat order. Every seat is Thinker once per game.

Each original link belongs to its original seat, including when two seats have
the same name. The host privately sends each link only that seat's credential.
Credentials travel in the embedded card's URL fragment and cannot take over the
host. Different original cards opened in one browser remain distinct seats.
Personal knowledge history is merged automatically when a card opens and remains
available to that browser in future rooms. Only distribute a person's own link.

Opening the game outside an existing Hub room retains the separate invitation
flow: open a host table and invite friends. Late invitees watch an ongoing game
and can join the formal roster next game. Existing active games created before
original-card integration retain their fixed roster until completion; the host
can then click **Play another game** to import the original Hub seats. Restoring
an integrated active table never resets its roles, scores or Spotlight.

## The conversation

`lobby → topic_check → prepare → discussion → reveal → results`

Before roles are dealt, any formal player can mark **I already know this** to
exclude that knowledge and draw a new topic. The Thinker or host confirms the
topic. The Truth Teller is independently randomized among all other formal
players each round, with no previous-role exclusion.

Preparation lasts as long as the group needs. A 25-second suggestion is soft;
there is no forced start. Only aggregate readiness is public. Private cards do
not require written answers.

The first Spotlight is random and the rest follow seat order, skipping the
Thinker. Everyone may immediately question, joke, and challenge the explanation.
The Thinker manually moves the Spotlight; no timer advances it. After the last
player, **We've heard everyone** removes the Spotlight while retaining the same
discussion state. The Thinker can then continue asking or select the Truth
Teller with a second confirmation.

**Call a bluff** is one irrevocable public challenge at any point in discussion.
It does not expose a role, cancel someone's opportunity, prevent a final choice,
mute, or eliminate them. Fixed follow-up suggestions use no secret answer and
no AI. The discussion clock gives a Thinker-only reminder after five minutes.

Reveal shows the chosen role, the real Truth Teller, the answer, supporting
facts, sources, and per-player point changes and reasons. It stays open until
the Thinker or host continues. There are no invented quotes, written claims,
voice recordings, votes, AI judges, opening speeches, or final-defense stages.

## Defaults and scoring

`BLUFF_ENGINE.RULES` in `bluff-king-engine.js` is the single default configuration:

- One Thinker turn per formal seat; 3–9 formal players.
- Correct final identification: Thinker +2, Truth Teller +2.
- Incorrect identification: selected Bluffer +2.
- Challenge a Bluffer and identify correctly: Thinker another +1.
- Challenge the Truth Teller: Thinker −2 regardless of the final choice.
- Negative scores allowed; equal scores share rank.
- Preparation suggestion 25 seconds; discussion reminder 300 seconds.

Each round saves a rules snapshot. `scoreRound` is the only point calculation.
Scores, roles, and Spotlight order are preserved across refresh and reconnection.

## Synchronization and the accepted trust boundary

The user explicitly chose the existing **trusted-host model** instead of adding
a server or secrets. No new environment variables, Firebase Rules changes,
paid API, Firebase Admin credential, microphone permission, or installation is
needed. `firebase-config.js` retains the existing public Firebase configuration.

Firebase REST stores the canonical game as a JSON envelope at an unguessable
256-bit host-token path. Encrypted RSA-OAEP/AES-GCM join requests keep identity,
player tokens, and personal knowledge histories out of the public join roster.
Each original seat has its own opaque player node and independent history
credential, precreated by the host using the existing Hub roster. Original card
pages restore this seat directly, without a join request. Each player receives a
filtered projection containing public state and their own private role; only
the Truth Teller receives the answer before reveal. The normal host projection
contains no private card. Player/card pages do not load the engine or topic
bundle. Firebase ETag transactions, canonical versions, round IDs, command IDs,
and monotonic projection revisions reject retries and stale operations without
skipping players or awarding scores twice.

This is real cross-device Firebase synchronization, but **the host browser is
the game authority** and can inspect hidden state. Static topic content can also
be fetched by someone deliberately inspecting site files. This game therefore
relies on the table rules against looking at other screens, inspecting hidden
data, searching topics, or communicating secretly. It is not hostile-host or
hostile-client security. The host must keep a presentation table open; suspended
host tabs or a sleeping host device pause command processing. Host transfer
grants the canonical executor token to the new host, who opens their host table.

`vercel.json` and `.vercelignore` exclude development question JSON, tests, and
scripts from static production delivery. They do not turn the static game into
a private server or hide the host's playable topic bundle.

## Knowledge history

The stable anonymous identity stores a separate random credential for persistent
Firebase history under `rooms/bluff-identities/players/{historyToken}`. Records
distinguish public topic exposure from known truth. A Truth Teller's answer is
recorded when its private projection is delivered, before normal reveal. A
known-topic report and a revealed truth are recorded separately. Cancelling,
restarting scores, transferring host, changing rooms, and changing interface
language preserve history. The host imports every member's cloud history before
new selections. Canonical knowledge IDs, rather than translations or room IDs,
control exclusion.

Known truths for any formal player and topics already used in this game are
excluded. Exhaustion shows the actual remaining count and never resets history
or reuses a known truth. Cancelling before final identification replaces the
topic for the same Thinker without scoring. Revealed results cannot be cancelled.

## Topic content and maintenance

**60 verified, enabled English cards; 0 unverified playable cards.** There are
30 nature/science topics and 30 cultural objects, tools, traditions and foods.
Each contains a plain English original core explanation, two source-backed
supporting facts, reveal text, and a reliable source link. Twenty cards use one
category hint, twenty three candidate categories, and twenty no category hint.
Candidate category order is randomized once and saved for the round. Hint amount
does not change the fixed two-point base score.

Development source files are `server/questions/nature.json` and `culture.json`.
These are source-data files; there is no runtime server. Add new independently
checked cards using the same schema and a stable `canonicalKnowledgeId`.
Unverified/disabled candidates remain out of the playable bundle.

```sh
node scripts/bluff-compile-topics.cjs
node scripts/bluff-compile-topics.cjs --check
```

The validator checks IDs/canonical IDs, required text fields, verified dates,
source URLs, facts, hint counts, and public projections for secret fields.
`bluff-king-topics.js` is the generated host topic bundle. Do not hand-edit it.

## Local preview and checks

```sh
node scripts/bluff-dev-server.cjs
# http://localhost:4175/bluff-king-live-chat.html
node --test tests/bluff-*.test.cjs
node --test tests/*.test.cjs
node scripts/bluff-live-test.cjs
node scripts/bluff-cards-live-test.cjs
```

The local preview still uses real Firebase. Run network checks only in new,
isolated test rooms. The live test creates independent device contexts, uses
the shipped transport over real Firebase, completes a full three-player circle,
and removes only its generated test-room and history nodes. It writes a bounded
verification report outside the source checkout. Pure rule tests cover 3/6/9
players, six score examples, confirmation, one challenge, incomplete Spotlight,
stale/duplicate commands, privacy projections, reconnect, cancellation, and
canonical knowledge exclusion. Transport tests use actual HTTP with Firebase-like
empty-subtree normalization. UI tests exercise the actual page handlers.

The app remains vanilla HTML/CSS/JavaScript with no framework build or type-check
configuration. Syntax checks, the bank compilation check, automated tests, live
Firebase checks, and browser visual/interaction checks are the applicable gates.
Deploy through the existing repository's `main`/Vercel workflow.

Initial release verification on 2026-10-07: all **622 repository tests** passed, including
the 32 focused Bluff tests. Real Firebase checks passed **75 assertions**: a
complete three-player circle, reconnects, spectators, replay protection,
cross-room knowledge exclusion, and current-source host transfer. All 25 nodes
generated by these network checks were cleaned up. Desktop and 390px mobile
browser checks confirmed private-card readiness, real live discussion, public
host privacy, and no horizontal overflow. These checks do not test microphone
or voice-chat software, which remains the group's existing external service.

Original-card update verification on 2026-10-07: all **636 repository tests**
passed, including **46 focused Bluff tests**. Real Firebase original-card checks
passed **58 assertions**, covering a complete circle with no join/name requests,
separate seats in a shared browser, reconnects, invalid credentials, persistent
history and spectator-only legacy invitees. All 44 generated network-test nodes
were cleaned up. Browser checks used the actual Hub wizard and three original
`play.html` cards: every card automatically displayed its own role and progress
without a registration form.
The latest separate invitation-flow regression also passed all 63 assertions:
**121 live Firebase checks passed in this update**. Its 15 generated nodes were
cleaned separately. Detailed reports distinguish the previous release, this
update and temporary connection retries.

After publishing, verify exact production assets and excluded development paths:

```sh
node scripts/bluff-verify-release.cjs <release-commit>
```

## Main files

`index.html` adds the final menu card. `play.html` recognizes `game: 'bluffking'`
and embeds the player's own page without handing it host credentials.
`bluff-king-cards.js` validates the original setup, constructs the per-seat private
frame URL and restores fragment credentials. New files:
`bluff-king-live-chat.html`, `bluff-king.css`, `bluff-king-ui.js`,
`bluff-king-engine.js`, `bluff-king-sync.js`, `bluff-king-topics.js`, question
source/validator files, tests, and preview/content/live-verification scripts.
Other games retain their existing architecture and rules.
