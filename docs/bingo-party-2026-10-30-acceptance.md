# 雙選賓果 — acceptance record (2026-10-30)

Only tests that were actually executed in this session are listed. Environment:
Linux, Node 22.23, Chromium via Playwright; Firebase replaced by the isolated,
rule-enforcing fixture `tests/helpers/bingo-party-fixture.cjs` (no live room,
no network).

## Executed

| Command | Result |
|---|---|
| `node scripts/bingo-party-build-content.cjs --check` | 60 cards, 12 per type, both languages; no legacy fields |
| `node --test tests/bingo-party-engine.test.cjs` | 30/30 pass |
| `node tests/bingo-party.browser.cjs` | Final code: two consecutive runs 72/72 and 71/71 checks, 0 page errors each (check count depends on the random round order). An earlier run before the last engine fix: 73/73. |
| `node --test tests/*.test.cjs` (whole Hub) | 2417/2417 pass, 0 fail, 0 skipped |

Baseline before any change: whole Hub 2387/2387.

## What the browser scenario does

Host page (1280 px) + seven original `play.html` links, each player in its own
browser context (390 px, touch), seat 1 = participating host (card in the
host's browser), seat 7 = spectator, seat 6 = English interface.

- Lobby on the existing links; watcher; re-balanced 3 v 3; host seat; settings.
- Round 1 默契猜人 with real votes (tally only to own team), forged requests
  (spectator vote, a player claiming actor 0, number 30) refused.
- Every type played through its own UI at least once in a full standard game
  that ends at 3 lines; then 再玩一局 → quick 2-line game with singing off and
  English prompts.
- 導演: 瞎說 on every card, spectator and stage; second press inside 2 s refused
  with feedback; 講台語 / 講英文 everywhere; IME composition not interrupted;
  private line received only by author and recipient (payload scan); 1+2 queue
  limit; actor reload restores the line without replaying the banner; done /
  withdraw; a 10 s old command refused (too_late); wrap-up and +30 s; next
  segment starts in English; an old-segment command cannot hit the next team;
  unfinished lines purged.
- 接歌: suggestions stay in-team; exact repeat flagged and cannot be accepted;
  4 per team alternating, everyone before repeats.
- 故事: no song panel before the answer; proposals stay with the picking team;
  public song card on every card; replace, stale confirmation refused (old
  version), accept, own song mid-song, pass without proposals; result BOTH.
- 禁詞: only the describer receives the word; stage never shows it; answer
  public after its item; after time the describer cannot score; host finishes.
- Host page closed → host seat card took over; reopened page waits, then takes
  the game back on request.
- 390 px phones and the 1280 px stage never overflow; zero page errors.
- Whole-run payload scan: player pages received only their own node; no denied
  read; the control-token path never reached a non-host browser.

## Publication

Feature commit df4ec17 pushed to main on 2026-10-31 after the user granted push
access; its tree is identical to the tree that passed every run above. Vercel
Production deployment jeoz9QD3HsFuz8Hqbf1oiowYyxom reports success. Production
read-back (web fetcher): index.html lists 雙選賓果 last with 👥 4–12;
bingo-party.html title/h1; bingo-party-engine.js, -ui.js and -sync.js contain
this release's code. No byte-hash comparison (the shell cannot reach the site);
play.html wiring and script tags were not read back (the fetcher strips them).

## Not verified

Real Firebase project in a live room, physical phones, real Chinese IME
hardware keyboards, screen readers, a human voice playtest.
