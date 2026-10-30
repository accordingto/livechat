# DOUBLE TAKE / BINGO CLUB — mode notes (2026-10-31)

## Interface and pacing revision — 2026-10-31

The user requested a much clearer, more refined UI, an English-only game
name and more time to perform/share. Public branding is now DOUBLE TAKE,
with BINGO CLUB as a small subtitle. URLs, `bingoparty`, protocol version,
room/seat identities, boards and existing saves are unchanged.

Warm paper/forest-green styling is scoped to this game's host/card. Primary
actions lead each screen. Ready/start are near the top; other rosters, room
management, called-number history, boards during challenges, song order and
private-line composition use named native disclosures. A three-step round
indicator stays visible. Current story/taboo turns precede completed/upcoming
turns. Inputs/IME/focus/disclosure choices retain the existing preservation.
No new bitmap, font, API, package, audio or permission was added.

New defaults (seconds): nomination 20, teammate answers 45, each song 60,
each scene 180, story sharing 120, follow-up answer 60, song pick 45,
singing 90, taboo 60. Scene extension remains 30. The lobby's timer controls
use 5-second nomination steps and 15-second other steps, plus a host-only
"Use recommended times" action. Optional maximums: scenes/stories 300,
replies/singing 180, guesses/song turns/song picks/taboo 120. Minimums and
integer validation still apply.

Saved custom settings are NOT migrated silently. Live deadlines, pause,
remaining time, reconnects and host authority do not reset. Recommended
defaults apply to new lobbies; existing lobbies can opt in. Reminder stages
remain reminders and do not auto-skip the story/song. Scoring, private
projections and atomic calls are unchanged. These are first-play pacing
choices, not a human-validated duration guarantee. The spoken follow-up question
itself remains untimed.

Cache tags: UI/CSS/host/engine `bp-2`; unchanged content/sync `bp-1`.
This engine is run by the bingo host/card, not the independent executor;
no executor package, rules or service deployment is required.

Spec: `CODEX_FULL_IMPLEMENTATION_PROMPT.md` (2026-10-29 package, treated as the
only rules source) plus the user's 2026-10-30 addition: the director stage has
a fourth public button **講英文**, which returns the scene to the English
default. Card bank: `content/bingo-party-cards.final.json` (60 cards, 12 per
type) → `bingo-party-content.js` via `scripts/bingo-party-build-content.cjs`
(`--check` verifies it is current and that no legacy twist/timer fields exist).

## Files

| File | Role |
|---|---|
| `bingo-party.html`, `bingo-party-host.js` | Host page: open the lobby on the Hub's links, public stage (safe to screen-share), host tools, bingo-only seats 10–12 |
| `bingo-party-engine.js` | Pure rules: boards, nominations, five challenges, settlement, per-seat projections |
| `bingo-party-sync.js` | `Authority` (trusted runner with lease) and `Seat` (a card's own-node transport) |
| `bingo-party-ui.js`, `bingo-party.css` | One renderer for player cards, the public stage and host tools |
| `bingo-party-content.js` | Generated card bank — loaded only by the authority |
| `play.html` | Shows the card (`renderBingoCard`) before any other game; lazy-loads engine+bank only for the host seat's card |
| `index.html` | Hub entry, last in the list (👥 4–12) |

## Rules as implemented

- Two teams, 2–6 each, 4–12 players. Auto teams differ by ≤1; the host can move
  seats between A/B/watch and reshuffle. Starting needs ≥2 present per team.
- Each team has its own 5×5 board (1–25 once, layouts differ, generated once by
  the authority from the match seed; refresh never redraws). One shared
  `called` list; 12 lines (5 rows, 5 columns, 2 diagonals). Standard 3 lines,
  quick 2 lines, chosen in the lobby only.
- Round: type announced → 20 s secret nomination (own team sees its tally, the
  other team only "voted x/y"; all voted → locks 3 s later; host can extend or
  lock) → simultaneous reveal → card + roles → the type's own flow → result
  preview → host confirms → numbers join `called` together, then both boards
  are counted → summary. Ties among nominated numbers use a reproducible draw
  (seed+round+team), no votes → "系統代選". Same number on both teams is legal
  and called once.
- Results A / B / BOTH / NEITHER → A's number / B's / both / the fallback
  team's. The fallback team alternates by round from a random first team. Both
  teams reaching the target in one settlement = 共同勝利. Host early end is
  labelled 提前結束 with no winner. Confirmation is idempotent and versioned.
- Type bag: round 1 默契猜人, then shuffled bags of all five (four when singing
  is off), never the same type twice in a row. Cards don't repeat in a match
  until a type's deck is exhausted.
- 默契猜人: protagonists answer privately, eligible teammates (snapshot at start,
  away players excluded) guess; locks at 45 s or 3 s after everyone answered;
  ratios compared by cross-multiplication; a missing protagonist answer blocks
  (extend / swap / restart without revealing). Reveal shows answers, guesses,
  follow-up prompt; nothing can change the score afterwards.
- 接歌接力: one theme; A1 B1 A2 B2 … (default 4 per team, lobby 2–6; the next
  music round starts with the other team). Everyone sings before anyone
  repeats; across rounds the least-used go first. The performer sends a title
  (sing/hum or "title + link" alternative); the host judges valid / not valid /
  skip by turnId. Exact repeats of an accepted title (NFKC, case, spaces) are
  flagged and cannot be accepted; failed attempts do not lock a song.
  Teammates' title suggestions are visible to their own team only. Time-up
  only marks the turn; corrections before settlement are logged.
- 導演出招: two segments, each two actors; the other team directs. Four public
  buttons (瞎說！／講中文／講台語／講英文) — any present member of the directing
  team, 2 s shared server-side gap, refused (not queued) with feedback; a
  request older than 3.5 s (server timestamp) is refused as too late; the
  language badge applies to the acting pair until the next language command
  and resets to the room's scene language (default English) for the next
  segment. Private lines (≤120 chars) go to one of the two current actors: one
  active + two waiting per actor, then "full"; done / skip / report; the author
  can withdraw; the host can hide a reported line without seeing its text. At
  time-up the scene enters wrap-up (no new commands or lines); +30 s reopens.
  Segment end expires and blanks unfinished lines. The host judges completion
  per segment; skipping lines or never being directed never fails a team.
- 故事交換與點歌: per storyteller share → follow-up → answer → (singing on)
  the other team proposes songs, the interviewer confirms one → the storyteller
  accepts / asks for another / picks their own / skips → sing a bit (switch
  allowed mid-song), then the other team. Song picks open only after the
  answer. Stale confirmations are refused by song version. Optional single
  "我也有類似經驗" relay afterwards. Result is always BOTH. Singing off keeps
  story and follow-up and never enters the song steps.
- 禁詞傳話: four items per card, shuffled two per team; 60 s per describer, up
  to two items; hit 1 / foul or skip 0; each item settles once and its answer
  becomes public then; after time only the host settles the open item. A team
  with fewer than two present players waits.

## Authority, privacy and the trust boundary

The Hub has no general server for this game, so the authority is the **host's
browser**, exactly like the Hub's other trusted-host games:

- Canonical state: `rooms/{code}/players/{bingoPartyControlToken}`, a random
  token kept only in the host browser's saved room session (never in links).
- Lease (12 s, renewed every 4 s). The host page runs it; the **host seat's own
  card in the same browser** can take over when the page closes. A visible host
  page reclaims the lease when the host uses it; a reopened page waits and
  offers "在這一頁接手主持".
- Each seat's node gets `bp.viewJson`, built by `view(state, seat)`: own board
  only, own team's tally/suggestions/proposals, the protagonist's own answer,
  the describer's word, and director lines only for author and recipient.
  The public stage and spectators get the public view.
- Requests go into the seat's own `bpInbox/{id}` with a server timestamp. The
  authority takes the actor from the node path, never the body; ids are
  idempotent; session/round/segment/cycle/turn/song-version fences reject stale
  requests.

Limits (stated plainly):

1. The host's browser holds the full match state. Screens and every seat's
   payload exclude opponent secrets, including the host seat's own card, but a
   host using developer tools could read the canonical node. True secrecy from
   a participating host needs the independent service (`hub-executor`), which
   this release does not use.
2. The card bank is a public static file. Cards never load it and taboo cards
   are not identified to guessers, but a determined player could open the file
   and see each card's four candidate words.
3. If no host browser is open (host page closed and the host does not play, or
   the host seat's card closed too), the game waits; cards show "主持端暫時離線".
4. No voice, recording, recognition, AI or music API: songs, scenes and taboo
   fouls are human judgements.

## Verification

- `node --test tests/bingo-party-engine.test.cjs` — rules (boards, lines,
  mapping, atomic/idempotent settlement, co-win, bag, each challenge, privacy
  of projections, permissions, 12 players, extra seats).
- `node tests/bingo-party.browser.cjs` — real host page + original play.html
  links, one browser context per player (6 players + 1 watcher), on a
  Firebase-compatible in-memory database that enforces the production rules
  (`tests/helpers/bingo-party-fixture.cjs`). Plays a full standard game and a
  quick game with singing off, checks every page's received payload, host-page
  closure/takeover, reconnects, stale/late requests and 390 px layouts, and
  writes screenshots to `../bingo-party-browser-qa`.
- `node scripts/bingo-party-build-content.cjs --check` — card bank.

Not verified: real Firebase, physical phones, a human voice playtest.
