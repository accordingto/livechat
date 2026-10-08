# Independent game execution

## Why browser-host games stalled

Firebase stores the cards and player requests; it does not run the game engine.
The recent games relied on the host browser to consume requests, advance clocks,
and publish private views. Closing that browser removed the executor. Several
rules also waited on a fixed roster's submissions or current speaker.

## New service

`api/hub-executor.js` runs the existing rules on the website server. An original
player card wakes it every five seconds and after reconnecting. One recently
connected card checks active CUT clocks and Dixit reveals every 500 ms; other
cards keep the regular heartbeat. Hidden CUT deadlines are never sent to players. Remaining players
can manage the table and explicitly continue without absent players after a
60-second reconnect grace. Recovery does not invent votes, card selections or
performance results. Each game retains its existing player-count rules; with fewer players it
waits or continues individual interaction according to those rules. With no connected player, no page is required to stay open;
the next connected card catches up the stored deadlines.

The initial host page registers the room once. It sends the existing canonical
and seat credentials to the service over HTTPS. The service encrypts them in an
AES-256-GCM ticket. Each card receives an opaque ticket and authenticates using
only its own existing token. Neither the host control token nor another player's
private cards or credentials are added to player links or public views.

Canonical updates and every projection use Firebase REST ETag conditional writes.
A persisted transport epoch prevents stale tickets and new browser executors
from taking over the service's game. Mailboxes and action receipts preserve the
existing duplicate/stale action guards. Player projections are independent, and
newer game cards cannot be overwritten by a preceding game's late publication.
Game/session checks apply even when a Hub update retains an old ticket. Bluff
and Wolf also verify the original Hub card bindings, including the first
migration before the new game has published its marker. Restarted sessions
receive a new sealed epoch. An uncompleted publication permits the preceding
ticket to retry delivery only; it cannot run commands or consume mailboxes.

Dixit restores cards and skips an absent Storyteller's unscored round; absent
submitters/voters do not receive invented actions or points. Once Upon a Time
can pass an absent speaker or finish a missing player's discard decision safely.
BLUFF PARTY cancels an absent Thinker/Truth Teller's round without scoring and
uses a new topic; it can skip an absent Bluffer's Spotlight. CUT and Open Mic
reuse their existing sit-out/return controls. Open Mic scoring remains a human
judgment. Let's Talk keeps its thinking and Crazy Talk clocks on the service.
Chat Wolf reuses its complete original coordinator, including encrypted joins,
request sequences, round/phase fences and the cross-room HistoryScope journal.
Remaining players receive management actions without changing their host
identity, role, profession, private tasks or vote. Original-card game switches
stop the preceding coordinator; host sleep no longer extends server deadlines.

## Activation

The service is **disabled until configured**. Missing configuration leaves the
legacy browser executor active and does not falsely advertise independent play.

In the Vercel project hosting this repository, set a Production environment
variable named `HUB_EXECUTOR_SECRET` to a newly generated 32-byte random value
encoded as 64 hexadecimal characters. Store it only in the deployment's server
environment. Do not put it in frontend files, Git, chat, or player links. No
Firebase Admin key or database-rule change is required for this capability-based
transport. Keep this value stable across deployments while rooms are active.

Redeploy, verify `GET /api/hub-executor` returns `{"ready":true,"version":1}`,
and refresh the participating host/player pages once. Open the existing room's
game table to register or migrate it. The original player-card links continue
working. Do not remove the deployment variable while active rooms use the
service; encrypted active tickets require the same key to remain readable.

The default browser endpoint is the same-origin `/api/hub-executor`. A separately
owned deployment needs this repository's runtime/game dependencies and an
explicit endpoint/CORS update; the YouTube search key is unrelated and is not
reused as a game secret.

## Validation

Tests use synthetic players and an in-memory Firebase REST/ETag boundary. They
cover host-absent commands and clocks, concurrent taps, stale epochs, forged
actors, private projections, disconnect grace, explicit recovery, mailboxes
written during publication, game switching, and unavailable storage. No live
room is changed by the test suite. Use `node --test tests/*.test.cjs` for the full
regression and `node scripts/hub-executor-verify-release.cjs <commit>` to check
production assets, API readiness and blocked server-source paths without
accessing any room.

The production routing configuration returns 404 for server-only paths before
the filesystem phase. Ordinary rewrites do not override existing static files;
keep this ordering when changing deployment routes.

Implementation references: [Firebase conditional writes](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests),
[Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js),
[Vercel routing order](https://vercel.com/docs/project-configuration/vercel-json#routes), and
[Vercel environment variables](https://vercel.com/docs/environment-variables).