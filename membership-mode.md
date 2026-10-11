# Mid-game player changes

Dixit, Once Upon a Time, Bluff Party, CUT, Open Mic and Talk support changing the
Hub roster while retaining the current game. Chat Wolf is intentionally excluded.

The homepage watches completed room count/name edits. It discovers only exact
player and manager nodes whose bearer links are already held by this browser,
then asks the approved independent service to update the current table. It never
starts a game, asks for an own-name selector, or releases a session to change a
name/count. The same private links continue working after seats are appended.
New players start at zero; existing hands, scores, topics, clocks and history stay.
Dixit entrants wait for the next round. Once entrants wait for a safe narrative
turn without a rollback, vote or private discard pending. Bluff entrants wait for
a fresh topic/role assignment. CUT, Open Mic and Talk add entrants to future
speaking/spotlight opportunities without changing the current speaker.

The home manager and trusted active players may mark participants as sitting out.
Cards show Playing, Joining next round/turn or Sitting out. Away participants can
return themselves through the original card; they cannot manage anyone else.
Away hands/scores are retained. Missing requirements are skipped; departure of a
storyteller or critical secret role advances/replaces an unscored round. A game
waits below its minimum: Dixit/Bluff 3, Once/CUT/Open Mic/Talk 2. Supported retained
seat limits remain Dixit 8, Once 6, other games 9. Removed Hub suffix seats are
stored as away rather than erased or renumbered. Increasing Hub count restores
only those suffix seats; explicit manual sitting out remains in effect.

`updateRoster` requires the current manager capability and a complete append-only
list of original tokens. `setParticipant` accepts a trusted active actor/manager
or a returning actor targeting itself. The server preserves canonical session
identity and publishes guarded private cards before acknowledging success.
Same-session membership capsule lineage upgrades retained old links without
letting an old capsule authorize a newcomer. New sessions clear lineage and
receipts. All reactivation paths, including legacy exclude/recover commands,
verify exact current card ownership before canonical commit. Away cards used by
another game never block other participants and are never overwritten.

The browser stores an exact pending roster request locally before sending it.
Timeout/partial publication retries use the same request and command identifier;
definitive validation/game-switch errors retire the pending request. Hub card
checks skip ongoing membership games, including their still-empty newcomer seat,
so setup cannot race private publication. Registered managers delegate room
membership decisions to the service rather than cached browser counts.

Runtime changes require both the independent service and frontend release. Keep
its existing Production secret, Singapore placement, search endpoint and retired
lyrics endpoint. `scripts/hub-membership-production-smoke.cjs --live` uses only
fresh disposable exact nodes, checks all six adapters, and removes only verified
owned nodes through conditional ETags. Never test using existing player rooms.
