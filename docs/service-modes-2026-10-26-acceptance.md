# Complete the pending Claude service release — 2026-10-26

The user requested completion of recent Claude Hub changes that appeared not
to be deployed. Frontend main was 8b8ed79 and clean. Public frontend readback
already matched 64/64 files; the independent service was still the October 22
deployment and failed the new functionality probe. The older local livechat
checkout was also clean, and its HEAD is included in the current main history.

## Released behavior

- BLUFF PARTY: 44 Halloween topics, selectable in the lobby, with Classic kept.
- BLUFF PARTY: Everyone votes mode, no Thinker; full speaking order, private
  ballots, self-vote rejection and the existing new-mode scoring.
- Once Upon a Time: 100 bilingual opening stories, redraw before selecting the
  first player, random/picked first player retained, no new starter-card draw.

These existing frontend implementations were retained. The missing step was
publishing their current engines/content/adapters to the existing independent
service; no additional game design or rule change was introduced.

## Deployment

Stable service: https://icebreaker-youtube-search.vercel.app/api/hub-executor

READY deployment: dpl_DHqo856YvqAcNkhzDxv7zbRmbcfz at
https://icebreaker-youtube-search-mii5hui8k-willintaiwan.vercel.app .

Used scripts/hub-executor-package-service.cjs, original project metadata and
the existing authenticated Vercel CLI with explicit scope willintaiwan.
The release contains 63 packaged source/config entries plus .vercelignore;
all JS/CJS parses, the six relevant runtime/content files match main, and
search/lyrics implementation hashes remain identical. Environment files and
login credentials are excluded. The existing Production secrets are unchanged.

The code allowlist is synced back to the original service workspace and
verified against the release, so a later discovery deployment retains the
new game runtime. 64 files verified, 10 updated. The previous allowlisted code
snapshot and previous deployment are retained locally for rollback. The
service's older test expecting no package dependencies was corrected to require
exactly its already-existing @vercel/queue 0.8.0 dependency.

## Checks actually executed

- Full Hub suite: 2337/2337; no failures or skips.
- Release-smoke isolated safety/functional tests: 4/4.
- Existing discovery/lyrics service suite: 39/39, including after source sync.
- Before deployment: live probe failed at bluff:open because the remote
  projection lacked the new modes/decks; cleanup 7 deleted + 4 empty, 0 failed.
- After deployment: service-modes-production-smoke.cjs --live passes 26 checks;
  Bluff 16 and Once 5 plus 5 service-boundary checks. It plays the new voting
  round, validates ballot privacy/self-vote/scoring, deals/redraws an opening
  and starts the story through the actual deployed service.
- After-probe cleanup: 14 deleted + 1 empty, all 15 accounted for, 0 failures.
  Every create/write/delete is limited to fresh exact nodes with collision,
  ownership/session and ETag checks. No existing user room is accessed.
- Readback: all 64 frontend assets match; service ready, expected Hub CORS,
  invalid synthetic-ticket rejection and runtime 404 checks pass.
- Discovery returns 200 both before and after; retired lyrics returns 410.

No physical-phone, hardware speaker or human voice-session playtest is claimed.
