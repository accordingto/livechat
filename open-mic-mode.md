# Open Mic Rescue / 開麥救場

`open-mic-rescue.html` is the final game in the Hub menu. It reuses the room
configured on `index.html` and each player's original `play.html` link. English
prompts stay English; interface controls follow the shared language setting.

## Play

2–9 players take turns as Spotlight. Everyone may ask questions and react during
the short challenge. Only the host judges Success or Failed. Success gives the
cooperative team +2 once. After either result, the Spotlight may choose any song,
invite one active partner, sing a section for +1, or Skip for no extra points.
Songs do not have to match the challenge. No quality, pitch, rhythm, applause, or
voice is evaluated.

Start Singing starts a 35-second visual timer. Reaching zero changes only the
hint; it never stops the iframe, scores, or rotates players. Finished Singing
awards the song point once. Host Next while singing also finalizes that point
before rotating. Skip while singing awards nothing. Only the host advances the
queue; participants do not receive judgment or Next controls.

## Implementation

- `open-mic-content.js`: 18 original short challenges, 13 starter songs, and 8
  data-driven categories. Challenge translations are retained for later uses.
- `open-mic-engine.js`: immutable deterministic rules, score constants,
  permissions, per-player favorites, safe YouTube parsing, and public views.
- `open-mic-sync.js`: existing Firebase private bearer nodes, one host lease,
  transaction fences, command acknowledgments, and guarded game switching.
- `open-mic-ui.js` / `open-mic.css`: shared host and participant renderer, stage,
  preview dialog, song browser, custom-song form, duet choice, and responsive UI.
- `open-mic-host.js`: room/session connection and an isolated `?demo=1` mode.
- `play.html`: renders this same UI with the original card's own seat identity.

State and favorites survive host reload within the same session. Starting a new
session resets its score and song list. Custom songs enter the owner's My Songs
immediately. Supported URLs are watch, youtu.be, embed, and shorts; URLs are
normalized to safe 11-character video IDs. No audio download or extraction.
YouTube playback is device-local with `playsinline=1`; restricted embeds have an
Open on YouTube link. Sing using the existing call or real-world setup.

## Synchronization and checks

Keep the host page open, following the Hub's trusted-host model. No new account,
voice system, database rules, payment, AI service, or environment secret is used.
Participants cannot acquire the host control token through their projection.
The host uses the card's real seat rather than a client-supplied actor. Old
sessions/turns and duplicate clicks do not award points twice. Switching games
suspends the old host; returning requires an explicit start. Closing/reopening
the host preserves an ongoing game and can resume after its lease expires.

Run `node --test tests/open-mic-*.test.cjs` for rules and Firebase-fake coverage;
run `node --test tests/*.test.cjs` for regressions. New-menu assertions retain
BLUFF PARTY and CUT in their original order, with Open Mic Rescue last.
