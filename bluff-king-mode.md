> Independent execution (2026-10-09): the optional, configured room service lets remaining players continue with the original private-card links after the host closes the page. See [service activation and recovery](hub-executor-mode.md). Without the deployment secret, the legacy browser-host requirements below still apply.

# BLUFF PARTY

An original conversation adaptation for **3–9 real players**, appended after
Dixit at the bottom of the existing IceBreak Hub menu. English topic cards;
English controls by default, with the existing Traditional Chinese switch.

## Starting a game

1. Use the existing Hub room setup and open **BLUFF PARTY**.
2. The current Hub's 3–9 participants and seat order are imported automatically.
   Changed names, seat count or original links open a fresh lobby, as does
   returning after the original cards switched to another game. An unchanged
   active table reconnects to its existing round. In registered service mode,
   the management page may close after opening completes.
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
and can join the formal roster next game. Standalone imports keep their fixed
active-roster guard. The trusted Hub manager can replace an outdated group with
its current roster without finishing the previous group's game. Restoring an
unchanged integrated active table keeps its service epoch, roles, scores,
Spotlight and knowledge history.

Hub opening and restart pause legacy polling until original-card publication and
service registration finish, including any private refresh already in progress.
If an earlier interrupted registration left a partial service epoch, the current
Hub manager can rebuild that epoch after confirming all original seat bindings
still belong to this table. This keeps its active round, roles, scores and personal
knowledge history. A valid existing epoch reconnects normally; a newer game's
original cards are not overwritten during this repair.

A completed registration returns its public host view. Reopening and observing
an already published table reads the canonical state and verifies every exact
original/private seat binding in parallel, then displays a cloned public view
without running a full service synchronization or saving knowledge history.
Private roles remain hidden. A private projection may briefly lag a same-epoch
action; an absent, legacy or wrong-epoch card still triggers guarded service
repair. Every actual command and each player pulse continues through the service.
Deferred opening seeds only missing formal private cards with conditional writes,
preserving existing mailboxes and history until complete registration. The Hub
function runs beside the Singapore database to reduce guarded read/write latency.
Independent original cards are checked afresh on write conflicts. The browser
waits for the service's supported execution window when a command needs it.
An interrupted Hub connection shows Retry connection and retains the same roster.

## The Classic · Thinker conversation

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

## Topic packs (2026-10-24)

Two packs, chosen in the waiting room before **Start one full circle**:
**Classic** (the 60 nature and culture cards below, the default) and
**🎃 Halloween** (44 cards), plus **Mix both** (104). Room state keeps `deck`
(`classic` / `halloween` / `mixed`); a saved room without it plays Classic.
`setDeck {deck}` is a lobby-only manager command (host, or a seated player on a
service-run table); the pack is fixed once a circle starts and survives
Play another game. Packs filter the same verified pool, known-truth history and
used-topic rules; totals in the header count only the chosen pack.
`projectView` adds `deck` and `decks: [{id, count}]`; public topics carry
`deck`. The card UI shows the picker only when `decks` lists two or more packs,
and the manager's fast host snapshot drops `decks` unless the service's own
private projections already list them, so a newer page never sends a pack
choice to an older service. Halloween topics get a pumpkin tag, a warmer topic
card and the reveal heading “Here’s the real story”.

The Halloween pack (`server/questions/halloween.json`, `deck: "halloween"`,
ids `bk-halloween-001…044`) covers old customs (souling, Stingy Jack, Punkie
Night, barmbrack, Snap-Apple Night, guising, Samhain, calaveras, La Catrina,
Hyakumonogatari), famous places and true stories (Tower ravens, Whitby,
Bodie curse, Mary Celeste, CROATOAN, Brown Lady, Borley, Winchester House,
Room 217, Annie's room, Bran Castle, Houdini séance, Villa Diodati, Surgeon's
Photograph), folklore (púca, Ichabod Crane, will-o'-the-wisp, zashiki-warashi,
tsukumogami, Golem, Baba Yaga, kelpie) and spooky science or tricks (St. Elmo's
fire, foxfire, Vic Tandy's 19 Hz ghost, Pepper's ghost, Phantasmagoria, the Fox
sisters, Ghost Club, Mothman, Marfa lights). Prompts ask about a custom, place,
legend or story rather than only a word meaning. Simple English; spooky, never
gory (a test rejects gore words). Each card was checked against its fetched
source on 2026-10-24. Brocken spectre stays in Classic only.

Runtime note: the independent service runs this engine and bundle, so the
service must be redeployed for service-run (normal Hub) tables to offer packs.

## Everyone votes mode (2026-10-25)

User request: an added mode with no Thinker — everyone takes a turn in random
order, then all players vote for the Truth Teller, never for themselves. The
user may make it the main mode later; for now **Classic · Thinker stays the
default** and the Thinker rules above are unchanged.

- Room state `mode`: `thinker` (default; saved rooms without it) or `vote`.
  `setMode {mode}` is a lobby-only manager command like `setDeck`; the mode is
  fixed once the game starts and survives Play another game. Each round
  snapshots `round.mode`; vote rounds have `thinkerId: null`.
- Rounds = number of formal players (`thinkerOrder` only counts rounds; offline
  players do not skip vote rounds). Each round deals one secret Truth Teller
  uniformly among connected players; everyone else is a Bluffer.
- Discussion: `beginDiscussion` fully shuffles every connected player
  (Truth Teller included) into `spotlightOrder`. `nextSpotlight` is allowed for
  the current speaker (“I’m done →”) or a lead (host; any formal player on a
  service table, who must confirm “Next player” on a card). `challenge` and
  `identify` return `wrong_mode`.
- `openVote` (lead, after everyone has spoken, confirmed) → phase `vote`.
  `castVote {targetId}`: formal current players only, not yourself
  (`self_vote`), changeable; the vote finishes automatically when every
  connected eligible voter has voted. `closeVote` (lead, ≥1 vote, confirmed)
  reveals with the votes so far. `recover` in the vote phase finishes a vote
  that only waits for offline players; an offline Truth Teller still needs
  recovery and replaces the round without scoring. Membership drops a leaver's
  ballot and any ballot for them.
- Scoring (`scoreVoteRound`): a vote for the Truth Teller +2; the Truth Teller
  +1 per player who found them; a Bluffer +1 per vote received (the Truth
  Teller's own ballot counts for a Bluffer). Reasons `vote_found_truthful`,
  `truthful_found`, `bluff_votes` (with `count`). RULES gains
  `voteFindPoints 2`, `truthFoundPoints 1`, `bluffVotePoints 1`.
- Privacy: during the vote only `votedIds` and `voterCount` are public;
  `myVoteId` is in the owner's private projection only. After the reveal,
  `round.reveal.votes` and history `votes` show who voted for whom.
- `projectView` adds `mode` and `modes: ['thinker','vote']`. Like packs, the
  manager's fast host snapshot drops `modes` unless the service's private
  projections list them, so an older service never receives `setMode`.
  `recovery.available` includes the `vote` phase in the engine, sync snapshot
  and runtime executor.
- UI: waiting-room mode picker in the pack style (“Everyone votes” + New tag)
  shown only when `modes` lists both; vote-mode lobby copy and rules dialog;
  phase bar shows “🗳️ Everyone votes” instead of the Thinker; the speaker's card
  gets “I’m done →”; a “Start the vote” bar replaces the Thinker actions; the
  vote panel lists every other player as candidates with “Your vote” marked,
  “N / M voted” progress and roster Voted/Voting statuses; the Truth Teller is
  told to vote for the most convincing Bluffer; the reveal lists votes per
  player (Truth Teller first) with the round points. Vote confirmations close
  automatically if the last vote reveals the truth first.

Runtime note: this is an engine change, so normal Hub tables (service-run)
offer the mode only after the independent service is redeployed.

## Optional fiction starts and quieter player cards (2026-10-26)

Bluffers can open **Story starting points · optional** on their own card during
`prepare` and `discussion`. This applies to Classic and Halloween topics in
both Thinker and Everyone votes modes, including topics drawn from Mix both.
The panel explicitly labels its contents as invented directions rather than
facts. Players may use one, combine ideas or ignore everything; no story has to
follow a template and no extra action is required before Ready or speaking.

`bluff-king-engine.js` owns the original bilingual scaffolds: six Classic
starting frames and six Halloween starting frames. Each eligible private
projection gets two distinct starts and three short steps: choose or ignore
the starts, add who/where/one concrete detail, then give a simple reason that
can be changed freely during follow-ups. Examples include an unexpected use, a
misunderstood name, a caretaker's repeated sound or an ordinary house rule that
grew into a spooky warning. These are prompts to invent, never extra evidence.

`storyGuide(publicTopic, roundAndSeatKey)` uses only public topic ID, deck and
term, plus the current round and seat identity. Its deterministic selection
stays the same on reconnect, does not consume game randomness and does not
write room state or knowledge history. `projectView` adds
`privateCard.storyGuide` only for an eligible Bluffer in preparation or
discussion. The Thinker, Truth Teller, public host screen, spectators and later
phases receive no guide. In particular, `secretAnswer`, supporting facts,
research, explanation and other players' unrevealed roles do not feed it.
The Truth Teller still sees the complete real answer and every supporting fact
without expanding a panel. Hiding the private role also removes the fiction
starts; showing the role again begins with that panel closed.

The original `play.html` card still embeds the same real game page. Its
single-column layout puts the topic, own role/evidence, current speaker and
available action first. The optional fiction panel is closed initially and
appears below those actions. The player/score roster is folded under
**Players & scores** during preparation, discussion and voting; the shared
host table retains its expanded roster. Existing follow-up inspiration is
also folded, and **Another idea** only changes that local suggestion. Open
panels survive ordinary sync/language repaints while still present. Player
cards use restrained ink, charcoal and warm gold, smaller role art and a quiet
header; shared table presentation and all game rules remain unchanged.

The guide is part of the engine's private projection, so normal service-run
Hub tables need the updated independent runtime as well as the frontend. The
frontend engine/UI tag is `bluff-guides-1`, CSS is `v=9`; the unchanged sync
tag remains `vote-1`. There is no second guide data bundle to maintain.

Local verification for this change passed 172 Bluff/executor tests, including
all 104 real topics, deterministic detached guides, secret-field independence,
role/phase privacy, escaped output, Hide/Show and folded panels. The isolated
real-page fixture `tests/bluff-guides.browser.cjs <playwright>` passed 26
scenarios and 30 captures across EN/ZH, 320/390 player cards and the 1280 shared
screen, with no page errors, overflow, clipped text or target findings. Its
transport is a read-only stub; it does not establish production-service
deployment, live multiplayer correctness or physical-phone validation.

## Topic content and maintenance

**104 verified, enabled English cards; 0 unverified playable cards.** Classic has
30 nature/science topics and 30 cultural objects, tools, traditions and foods.
Each contains a plain English original core explanation, two source-backed
supporting facts, reveal text, and a reliable source link. Twenty cards use one
category hint, twenty three candidate categories, and twenty no category hint.
Candidate category order is randomized once and saved for the round. Hint amount
does not change the fixed two-point base score.

Development source files are `server/questions/nature.json`, `culture.json` and
`halloween.json` (optional `deck`: `classic` default or `halloween`).
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

## Compact card interface (2026-10-07)

The English-first screen now groups the illustrated public topic with the current
speaker and the player's private card. The two Thinker actions open a full-name,
numbered-seat picker, then a separate confirmation. Final choice still waits for
every Spotlight opportunity; a modal begun in an old round is closed on a round
change. Rules and room management open only on demand. Facts, sources and score
reasons are expandable. The visible Truth Teller answer is never clipped.

The generic night-garden background is `assets/bluff/topic-night-v1.webp`,
1672 × 941 and 160,134 bytes. It was made with built-in image generation; the full
prompt and generation mode are recorded in `topic-night-v1.source.json`. It does
not illustrate any specific topic or expose a topic answer. Numeric colored
avatars depend only on stable seat order, never secret roles.

Original `play.html` cards use the same compact screen. Their frame reports the
body's intrinsic height, so earlier long layouts do not leave a permanent blank
scroll area. Legacy participating hosts can still open their private card before
dealing to report a known topic. Unseated original-Hub moderators receive no extra
seat. Roster import also rechecks host authority inside its compare-and-swap to
reject an import racing a host transfer.

UI update validation: **643 repository tests passed** before the additional
pre-deal private-link regression; the final focused suite passed **54/54**.
This includes 23 UI tests and five HTTP transport suites. Actual Firebase browser
fixtures checked three original cards and a nine-seat room with long names,
desktop and 390 × 844 mobile layouts, private-role visibility, selection and
confirmation, manual Spotlight progress, and original-frame sizing. Earlier 121
live Firebase assertions apply to the original-card release; this UI update did
not repeat that entire network suite. Browser tests are automated clients, not
a claim that a human group completed a game.

The production verifier checks fourteen exact assets including the binary WebP, SVGs and
four development-only paths excluded from deployment.

## Party branding and live action guidance (2026-10-07)

The public name is now **BLUFF PARTY**, with an original confetti/chat-bubble SVG
shared by the Hub card, game header, lobby and browser icon. Existing URLs,
`bluffking` room markers and all stored credentials remain compatible.
The player panel is labeled **Your role**. The user confirmed only the Thinker
is public during play; Truth Teller and Bluffer identities remain secret until
the reveal, and only the Truth Teller receives the unrevealed answer.

Compact guidance follows the public state: the current speaker can Explain and
Defend; listeners and the Thinker can Follow up and Question even while another
player speaks. After everyone is heard, the Thinker is prompted to continue
asking or choose. Preparation cues explain what to think about before Ready.
These chips describe things to say in the group's existing conversation; they
do not simulate chat messages, introduce speaking permissions or send room
commands. The real Thinker controls retain their original guards.

Validation: all **655 repository tests** passed, including **58 focused Bluff
tests**. A three-player real Firebase browser check used the original player
links and confirmed that moving the Spotlight changes a listener's guidance
from Explain / Defend to Follow up / Question without exposing other roles.
The Thinker card fits 1366 × 768 and the listener card fits 390 × 844 without
horizontal or vertical scrolling. The production check covers eleven assets
and four excluded development paths. The isolated browser-test nodes are
removed after verification; these checks do not claim a human group playtest.

## Simplified illustrated role cards (2026-10-07)

The owner's card no longer has a Your role / Private heading row. It leads with
one clear role title, an original scalable illustration and a one-sentence goal.
The Thinker uses a luminous brain, the Truth Teller an open book with a check,
and the Bluffer a friendly theatrical mask. Illustrations and subtle watermarks
only describe the current owner's role; they never color the public roster.

The Truth Teller receives the complete answer and every supporting fact directly
on the card, with a brief reminder not to invent uncertain details. No expansion
is needed to read the evidence. Sources and scoring explanations at reveal keep
their existing disclosure controls. Thinker and Bluffer cards stay concise.
The chips retain the same live public-state logic, with Anytime beside Follow up
and Question. Longer contextual hints remain accessible through the group label.
Hide removes the entire role identity, illustration, watermark, goal, evidence
and action cues together. Engine, scoring, stored credentials and links are unchanged.

The five-minute Thinker reminder is now a compact no-rush caption beside the
clock, with the original suggestion available on hover. It adds no new row and
never advances play. Verification: **659 repository tests** passed, including
**60 focused Bluff tests**. Real Firebase browser checks used three original
player links, confirmed live Spotlight/guide updates and Hide/Show privacy, and
checked 1366 × 768 desktop and 390 × 844 mobile layouts. The genuine longer
Truth Teller answer, both facts, tip and roster fit together without scrolling.
All three role SVGs are included in the fourteen-asset production verifier.
These are automated-client checks, not a claim of a completed human playtest.

## Clear role identity and action sentences (2026-10-07)

The own-card heading now says **YOU ARE** above Thinker, Truth Teller or Bluffer.
It does not restore the extra Your role / Private label row. The public table
still names the current Thinker without presenting that role as the viewer's own.
The page heading and browser title use BLUFF PARTY without a Live Chat suffix.

Discussion chips are replaced by one visible short instruction. The speaker
reads “Explain your answer. Respond to questions.” Other players read “Ask
questions or follow up while others speak.” The Thinker can ask questions
anytime; after everyone is heard, their sentence offers the final choice.
Other players and the public table retain conversation guidance without final
choice permissions. Preparation instructions and complete Truth Teller evidence
remain visible. Hide removes YOU ARE and the instruction with the private card.
These are spoken conversation cues; they never create messages or room commands.

Validation: all **661 repository tests** passed, including **60 focused Bluff
tests**. The original player link was checked against a real Firebase room at
390 × 844: YOU ARE, the longer Hornbook answer, every fact, the short instruction
and roster fit without scrolling. Hide/Show removes and restores the whole card;
the Chinese toggle displays the corresponding role label and instruction.

## Main files

`index.html` adds the final menu card. `play.html` recognizes `game: 'bluffking'`
and embeds the player's own page without handing it host credentials.
`bluff-king-cards.js` validates the original setup, constructs the per-seat private
frame URL and restores fragment credentials. New files:
`bluff-king-live-chat.html`, `bluff-king.css`, `bluff-king-ui.js`,
`bluff-king-engine.js`, `bluff-king-sync.js`, `bluff-king-topics.js`, question
source/validator files, tests, and preview/content/live-verification scripts.
Other games retain their existing architecture and rules.

## Current Hub roster verification — 2026-10-09

Full regression: 1209/1209 passed. Current-room import, changed names/count/tokens,
returning after another game, persisted cross-tab changes, delayed old-game
publication, complete registration and unchanged active reconnection are covered.
Real Client/service integration verifies old epochs cannot modify the new table
and a current player can start it after the management page closes.


## Authoritative original-card publication — 2026-10-09

Opening uses exact-token server reads and ETag conditional writes, rather than
SDK transaction callbacks that may initially contain uncached null. Normal
presence updates causing 412 are reread/retried. Newer game/round bindings remain
protected, matching cards keep their mailbox and metadata, and all cards are
rechecked before service registration. UI version 9 includes this correction.

Primary behavior references: [SDK transaction initial values](https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions)
and [REST conditional requests](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests).

Validation: full regression 1213/1213; UI 43/43. The prior UI reproduces the
reported game-switch error with a provisional-null SDK callback; authoritative
publication passes the same controlled scenario.
