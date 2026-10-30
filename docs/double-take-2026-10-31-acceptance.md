# DOUBLE TAKE — interface and pacing acceptance, 2026-10-31

The user supplied the original two identical implementation prompts as context
for Claude's existing bingo game, then requested better UI, longer tasks and
an English name. This revision edits the real Hub entry and original player
links. It does not replace the game with a standalone demo.

## Changed behavior

- DOUBLE TAKE / BINGO CLUB branding on the Hub, page, card title and icon.
- Warm paper/deep green UI, restrained team colors with A/B labels and shapes.
- Ready/Start near the top, concise phase progress and task/role first.
- Boards/history/other rosters, director-line composition and host controls
  remain available in named disclosures. Important recovery controls auto-open.
- Current story/taboo turn comes first. Story topic is large during sharing,
  then expandable during questions, picking, confirmation and singing.
- Countdown uses m:ss. New defaults in seconds: 20 nomination, 45 answers,
  60 each song, 180 scene, 120 story, 60 follow-up answer, 45 song selection,
  90 singing, 60 taboo. Follow-up questions stay untimed; scene extension 30.
- Hosts can adjust legal values or apply recommended values in a lobby.
  Existing/custom values (including old lower bounds), live deadlines, pause,
  reconnect, boards, scores, privacy projections and called numbers survive.

## Actual checks

- `node --test tests/*.test.cjs`: **2435 passed**, 0 failed.
- Bingo engine: **32 tests**, including long-task deadlines, reminder behavior,
  saved settings and authorized timer reset without live timer changes.
- `node scripts/bingo-party-build-content.cjs --check`: 60 cards current.
- `tests/bingo-party.browser.cjs`: latest **72/72**, 0 page errors. Real host
  and original play.html links, six players plus one watcher in independent
  contexts, one isolated Firebase-compatible database. All five challenges,
  standard/quick finishes, singing disabled, private-line and song payloads,
  duplicate/stale commands, reconnection, IME and host/card takeover.
- Phone 390px and desktop 1280px, English and long names, overflow checks;
  actual screenshots in `../bingo-ui-final/`. Phone-named captures normalize
  the viewport to 390px even when the chosen seat is the desktop host card.
- JavaScript syntax and `git diff --check` passed.

The first local check exposed Windows CRLF checkout differences in the two
generated content files. Their exact HEAD bytes were restored without changing
their Git content. Browser checks also caught a recovery button inside a closed
disclosure; recovery now auto-opens it. Timer-expiry tests now advance to the
actual authoritative deadline instead of assuming the old 60/35-second values.

## Scope and capacity

Modified public files: bingo-party.html, .css, -ui.js, -host.js, -engine.js,
index.html, play.html and assets/bingo-party/mark.svg. Also mode/release notes,
this acceptance record, engine/browser tests and the pre-existing capacity
policy carried into this workspace. No content bank, sync transport, shared
theme, other game's runtime, package or independent executor was changed.

No new bitmap/font/dependency/API. The changed public runtime files add about
10 KB of normalized Git bytes. Screenshots/logs stay outside the repository.
Actual frontend Vercel team Usage/remaining allowance is still inaccessible;
this code-size delta is not a storage or billing guarantee. Use one consolidated
frontend publication, not repeated asset-batch deployments.

Not verified: physical phones/keyboards, live Firebase rooms and real spoken
play. Voice remains in the existing external call and is judged by humans.
The existing trusted-host-browser boundary is unchanged. Production status
and byte read-back are checked separately when this release is published.
