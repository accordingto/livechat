# Chat Wolf role cards + Once story worlds — 2026-10-11

This is an incremental release. Dixit and all unrelated games keep their rules.
Chat Wolf roles, abilities, tasks, outcomes, Director notices, voting and history
remain unchanged. Private role art is small and decorative: red Wolf, yellow
Jester, green Village. The public host never renders a private role portrait.
Loaded portrait nodes are retained only for the same match, player and role.

## Once setup

Before dealing, a manager can choose Classic fairy tales or Modern & Future,
and Original (automatic) or 3–9 Story Cards (Hub custom). Each player still has
one Ending. Automatic follows the official rule: 11 minus player count, minimum
five. Supported 2–6 players therefore get 9/8/7/6/5 cards. This is not a new
official expansion or an official manual-hand-size rule.

Official source: https://www.atlas-games.com/atlas-cms/resources/pdfs/ouat3rulesweb.pdf

Classic remains exactly 129 Story + 51 Ending cards. Modern & Future is an
original separate 60 Story + 18 Ending pack, with five familiar categories and
two existing-rule Interrupt cards per category. A game uses only one world.
Shared basic vocabulary is intentional; each world has distinct immutable IDs
and its own meaning-matched paintings.

Configure is authenticated and LOBBY-only. A changed setting advances the turn,
so simultaneous deal/configure requests cannot silently rewrite the chosen pack.
An acknowledged configuration is required before dealing. Existing saved games
default to Classic/automatic without altering already-dealt cards. Restart keeps
world and hand settings but clears cards/Ending/history/readiness/interrupts/votes.
Newcomers use the selected manual hand size; automatic uses eligible seats.
No new player limit, role, scoring or speech interpretation is introduced.

Original varied dealing remains: opening hands favor several usable categories
without enforcing equal amounts or reserving all category Interrupts for each hand.
After the opening, draws and recycling follow the original physical deck order.

## Assets and runtime

- Main new module: once-upon-a-time-modern-future-deck.js, loaded BEFORE base deck.
- Base deck exports worlds/getWorld and global ID maps; classic exports stay stable.
- Engine, sync and views keep authenticated per-player projections.
- Both once-upon-a-time.html and play.html use once-worlds-1 asset tokens.
- Chat Wolf UI assets use wolf-role-cards-1; launcher uses hub-launch-3.
- New world paintings: assets/once-upon-a-time/modern-future/{category}/
- Three role portraits: assets/chat-wolf/roles/
- Every final image has its prompt/scene provenance in art-prompts-v1.json.
- Generated with built-in image_gen; print-sized PNG originals are preserved
  locally and ignored by Git. Optimized main/thumbnail WebPs are published.
- Playing requires no AI API, model call, recording or voice analysis.
- Existing Firebase and owned hub-executor endpoint/settings remain unchanged.
  Keep the existing production signing secret; do not rotate/export it.

Both frontend and the independent multiplayer service must be deployed. The
service package script follows the new deck's relative require automatically.
The updated service source must retain engine/base/new-world modules for future
deployments. A frontend push alone is not enough for world/hand configuration.

## Verification

Targeted engine/sync/adapter/ETag service/membership tests: 153 passed.
Opening stress check: 2,800 games / 16,800 hands passed diversity constraints.
UI settings: 47 unit tests; four isolated Chrome settings contexts passed.
Chat Wolf: 79 related tests and five Chrome viewport sizes passed (320–1280).
Once: both worlds passed five Chrome layouts and complete synthetic games;
all 258 card texts fit at 320/375px. Updates retained loaded image nodes/sources.
All 78 modern paintings and three portraits were visually checked; the modern
manifest, unique image hashes/dimensions and Classic compatibility tests passed.

Release checks must also use fresh marked service fixtures:
ONCE_UPON_SERVICE_TEST=1 ONCE_QA_WORLD=modern-future ONCE_QA_HAND_SIZE=9
and Classic/auto. The script touches only its seven exact fresh nodes and
removes them with ownership/session/ETag confirmation. RTDB omits empty arrays
and null properties; test checks normalize those rather than inventing state.

Physical phones, Safari/Firefox, cross-device hardware sessions and human
balance/English-learning results have not been verified in this release.

Independent production service deployment is READY:
https://icebreaker-youtube-search.vercel.app (deployment dpl_EiHZJHMv7sShbZNoUX1zag1N7G5A).
Real isolated service checks passed Classic/auto 471 checks and Modern & Future/9
711 checks, including configuration propagation, unique hand/Ending dealing,
private projections, play and reconnect. Each check removed its seven owned
temporary nodes, with zero cleanup failures. The first checker attempt exposed
RTDB omission of empty lobby hands; only the checker was normalized, then rerun.
Both legacy service engine/deck source files matched the current upstream before
the patch; the updated sources and new deck are retained for future deployments.
