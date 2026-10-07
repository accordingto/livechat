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
- `open-mic-lyrics.js`: public LRCLIB search, metadata cleanup, plain-text/LRC
  normalization, cancellation, timeout, and rate-limit handling.
- `play.html`: renders this same UI with the original card's own seat identity.

State and favorites survive host reload within the same session. Starting a new
session resets its score and song list. Custom songs enter the owner's My Songs
immediately. Supported URLs are watch, youtu.be, embed, and shorts; URLs are
normalized to safe 11-character video IDs. No audio download or extraction.
YouTube playback is device-local with `playsinline=1`; restricted embeds have an
Open on YouTube link. Sing using the existing call or real-world setup.

## YouTube discovery and shared lyrics

The starter recommendations are a curated list, not YouTube's personal Home
feed. Home and keyword searches open the real YouTube website. A public playlist
URL can load its current videos in a separate, live YouTube playlist player.
`open-mic-youtube.js` loads the official IFrame API on demand; the current video
is read using `getVideoUrl`, with optional oEmbed title lookup and editable title
fallback. Choosing a playlist video adds it to My Songs; it does not select the
stage song or start singing. No Data API key or account permission is required.
Private playlists, unavailable videos, and network failures show a link to
YouTube. This is not an embedded Home feed or Data API search/trending feed.

The stage includes a lyrics reading area and a larger reading dialog. The host
tries LRCLIB when a song without saved lyrics is selected. Only a confident
title/artist match is loaded automatically; equivalent duplicates are collapsed.
In-game search lets the host or current Spotlight adjust the title/artist,
preview available versions, and apply a result without leaving the game.
Missing lyrics or network failures leave search and manual editing available.
The service requires no account or API key; availability varies by song.

The host or current active Spotlight can explicitly save multiline plain text
with `setLyrics { videoId, lyrics }`, up to 16,000 characters per known song.
Automatic imports use `onlyIfEmpty: true`, checked by the authoritative engine
so a concurrent manual save cannot be overwritten. Text is shared with every
player's card and saved by video ID
in `songLyrics` for this session, survives turns/reload, and resets in a new
session. Empty text clears lyrics. Local drafts are never published implicitly
and prevent automatic imports. Async searches are fenced against song, session,
round, and turn changes; search can be cancelled.
Lyrics updates leave the stage iframe, timer, score, duet, and turn token intact.
Old rooms with no `songLyrics` are supported. Lyrics transport alone has a
34,000-character action envelope so valid escaped text fits; ordinary commands
retain their 4,000-character limit and actor/session/turn checks.

## MV and lyrics layout

The approved stage layout puts the MV and lyrics side by side on desktop and
stacks MV above lyrics on phones. Lyrics have their own bounded reading scroll;
the video remains visible while reading. Compact challenge/score information
sits above the full-width stage, with the song library below it. Small video
areas keep a 200px minimum height and preserve the full video frame.

Singing focus is a local presentation preference: it collapses the challenge
and song browser while retaining the Spotlight, score, MV, lyrics, timer, and
permitted stage actions. It is available to every viewer once a song is selected
in the choice or singing phase, including viewers whose room controls are
temporarily unavailable. The preference is saved on the device; a new challenge
restores the challenge and browser automatically. It sends no gameplay command.
Changing focus, lyric size, or saved text keeps the current stage iframe mounted.

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

2026-10-08 embedded lyrics validation: 65 Open Mic tests and 792 full-site tests
pass, including the lyric service, authority guard, and stale-search/manual-edit
protections. Browser QA automatically loads an English song, previews and applies
a Mandarin version inside the stage, and checks the 390px search layout without
horizontal overflow. Latest CUT changes are retained. YouTube personal Home
recommendations remain on YouTube; lyrics are read within the game.

2026-10-08 stage layout validation: 70 Open Mic tests and 797 full-site tests
pass. The five new UI regressions cover persistent video/lyrics nodes, local
focus for every role with unavailable room controls, font/lyrics/phase updates,
unchanged authority, and session teardown. Local browser QA verifies desktop
columns, a 375px phone with no horizontal overflow, a 200px video and 220px
scrolling lyrics area at 26px type, passive-view focus, and normal +1 singing
completion followed by restored host challenge controls on the next turn.
