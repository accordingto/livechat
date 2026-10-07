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
or current active Spotlight can explicitly save multiline plain text with
`setLyrics { videoId, lyrics }`, up to 16,000 characters per known song. This is a
manual lyrics field with links to find lyrics or lyric videos, not an automatic
lyrics service. Text is shared with every player's card and saved by video ID
in `songLyrics` for this session, survives turns/reload, and resets in a new
session. Empty text clears lyrics. Local drafts are never published implicitly.
Lyrics updates leave the stage iframe, timer, score, duet, and turn token intact.
Old rooms with no `songLyrics` are supported. Lyrics transport alone has a
34,000-character action envelope so valid escaped text fits; ordinary commands
retain their 4,000-character limit and actor/session/turn checks.

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

2026-10-08 lyrics/discovery validation: 41 Open Mic checks and 768 full-site
checks pass. Browser QA loaded a real public playlist, resolved and added its
current video, saved/read shared lyrics, preserved a real room's lyrics after
host reload, and checked the 390px reading layout. Latest CUT changes are retained.
Automatic lyrics retrieval and in-game personal Home recommendation feeds are
not implemented; the corresponding links open the source websites.
