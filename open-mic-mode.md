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

Change Song and Remove Song share the original stage action row with singing,
duet, skip, and host Next controls. They remain available to the controller
after the round finishes. Change Song opens the local song browser, including from Focus on
singing. During choice, singing, or finished, the host or current active
Spotlight may select a different library/discovered song to replace the stage.
Replacing a singing performance stops its timer and returns to choice without
awarding a point; Start Singing can then begin the new song. Reselecting the
same song during singing or finished is an acknowledged no-op. Remove Song uses
`clearSong` to clear the stage, timer, and duet while retaining the shared
library, lyrics, and personal favorites. In a finished round, selection or
removal is playback-only: the round remains finished with its awarded score,
and singing cannot restart. The host advances with Next. Stale completion commands
cannot finalize a replaced or removed performance.

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
- `open-mic-discovery.js`: calls the owner's standalone official YouTube
  metadata service without cookies or browser credentials. The original
  `api/open-mic-discovery.js` is retained as the reusable server core source.
- `play.html`: renders this same UI with the original card's own seat identity.

State and favorites survive host reload within the same session. Starting a new
session resets its score and song list. Custom songs enter the owner's My Songs
immediately. Supported URLs are watch, youtu.be, embed, and shorts; URLs are
normalized to safe 11-character video IDs. No audio download or extraction.
YouTube playback is device-local with `playsinline=1`; restricted embeds have an
Open on YouTube link. Sing using the existing call or real-world setup.

## YouTube discovery and shared lyrics

The starter recommendations remain a curated room library. Above them, in-game
YouTube search and public popular music for Taiwan, the United States, and South
Korea provide current videos, channel labels, and a fetch timestamp. This is
public regional discovery rather than a personal Home feed. Every viewer can
search and preview without leaving the game. Play on Stage lets the host or
current active Spotlight select a result during choice, singing, or finished without first
saving it. A single `selectSong {videoId,title}` command validates and registers
an unknown video in the shared library and selects it, leaving every player's
My Songs unchanged. Existing videos retain their metadata and shared lyrics.
Add to My Songs remains a separate option for advance preparation. Channel names
are not stored as artist names; a bounded safe video title supports lyrics lookup.
The existing host/Spotlight selection rules apply.

The service uses the official `search.list` and `videos.list` APIs through a
server-only key (`YOUTUBE_API_KEY`, or `YOUTUBE_KEY` as an alias), with fixed provider URLs, bounded metadata, safe
video IDs, music category filtering, and an 8-second upstream timeout. Search
results cache for 10 minutes and public popular music for 15 minutes; displayed
timestamps describe when metadata was fetched. Repeated requests share work and
cached responses retain their original expiry. Cache and admission limits are
best-effort per server instance, with CDN caching; they are not distributed
quota controls. Unconfigured, empty, unavailable, and rate-limited responses
remain inside the game and leave the original room library available.

Queries and discovery results stay local. Superseded searches and input changes
cancel or fence older responses. Session changes and teardown clear requests;
late add or selection completions cannot alter the next player's view. Searching,
previewing, and adding a favorite leave stage playback and scoring unchanged.
Library, My Songs, and discovery use the same direct selection flow, labeled
Replace & Play when a different song is already on stage. Selection changes the
stage song and attempts autoplay only on the device
that requested it; other viewers receive the selected song without autoplay.
Browser playback restrictions may still require pressing the video's play button.
Selection never starts the singing timer or awards points. External search and
Home buttons have been replaced by this in-game interface.

A public playlist URL under Other ways to add songs can still load its current
videos in a separate, live YouTube playlist player.
`open-mic-youtube.js` loads the official IFrame API on demand; the current video
is read using `getVideoUrl`, with optional oEmbed title lookup and editable title
fallback. Choosing a playlist video adds it to My Songs; it does not select the
stage song or start singing. Playlist playback needs no Data API key or account permission.
Private playlists, unavailable videos, and network failures show a link to
YouTube. Playlist playback is separate from the new Data API discovery service.

### Enable live discovery

The current game uses the owner-managed Vercel project
`willintaiwan/icebreaker-youtube-search` at
`https://icebreaker-youtube-search.vercel.app/api/open-mic-discovery`. Its
Production Secret holds the key; the original game deployment needs no secret.
The standalone service permits browser reads only from
`https://livechat-two-alpha.vercel.app`, exposes `Retry-After`, and receives no
cookies. CORS is not authentication or a distributed quota limit. Only the API
is routed publicly; server source, configuration, and private files return 404.

1. In a Google Cloud project, enable YouTube Data API v3, create a dedicated API
   key, and restrict its API access to YouTube Data API v3. Leave the existing
   Firebase key unchanged. This server function does not use browser referrers;
   a key restricted to website referrers will fail server-side requests.
2. In the standalone Vercel project Settings → Environment Variables, set
   `YOUTUBE_API_KEY` (or the existing `YOUTUBE_KEY`)
   for Production. Keep the value in the deployment environment, never in client
   scripts, Git, chat, or a `NEXT_PUBLIC_` variable.
3. Deploy the current code after saving the variable, or redeploy if the code
   was already deployed. Verify the standalone `/api/open-mic-discovery?mode=popular&region=TW`
   and an in-game keyword search return `source: "youtube"` with current records.
   Without the variable the route returns HTTP 503 `discovery_setup_needed`.

Provider quotas apply and may change; consult the project's actual Google Cloud
quota. The UI does not offer a player-facing credential or login form.

Official references: [search.list](https://developers.google.com/youtube/v3/docs/search/list),
[videos.list](https://developers.google.com/youtube/v3/docs/videos/list),
[Google credentials](https://developers.google.com/youtube/registering_an_application),
[Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).

The stage includes a lyrics reading area and a larger reading dialog. The host
tries LRCLIB when a song without saved lyrics is selected. Only a confident
title/artist match is loaded automatically; equivalent duplicates are collapsed.
In-game search lets the host or current Spotlight adjust the title/artist,
preview available versions, and apply a result without leaving the game.
Missing lyrics or network failures leave search and manual editing available.
The service requires no account or API key; availability varies by song.

Video metadata cleanup recognizes explicit bilingual artist names and keeps the
appropriate original alias for the song title, such as `WAIT` / `E.SO` from
`瘦子E.SO【WAIT】Official Music Video`. No artist is inferred from an upload
channel. When structured search has no confident match, one bounded title-keyword
fallback supplies manually selectable candidates (`autoEligible: false`);
fallback errors preserve any primary candidates, and cancellation still discards
the response. Reversed title/artist lookup is also bounded and never eligible for
automatic text imports. At most three requests share a 12-second deadline. Missing-library messages
offer in-game lyric-video search or pasting text. The lyric-video button fills the
existing YouTube search on this page; choosing its result replaces the stage
under the same authority and timing rules.

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

## Official Genius lyrics

When shared text and local drafts are empty, every device can automatically
search official Genius metadata through the separate service at
`https://icebreaker-youtube-search.vercel.app/api/open-mic-lyrics`. The server
uses `GENIUS_ACCESS_TOKEN` (the independent deployment also accepts its existing
`Willie` secret as a legacy alias); the browser never receives this credential or
sends room credentials. The main-repository API core is retained for service packaging
and tests; the main site's current deployment does not expose that unused route.

Exactly one complete song with a matching title and artist displays the official
Genius widget beside the MV. Explicit bilingual aliases and reversed title/artist
pairs are supported; other matches remain manually selectable inside the lyric
finder. Catalog gaps, translated versions, and ambiguous results are not treated
as exact. This improves coverage without guaranteeing lyrics for every song.

The official widget retains its branding, links, and provider behavior in an
opaque sandboxed iframe. No Genius lyric body is copied into `songLyrics`,
Firebase, client metadata caches, or server responses. Shared plain text and
dirty local drafts take priority. Pending responses are fenced by song, session,
round, turn, actor, connection, and lifetime. Timer and score changes preserve an
already mounted widget. Reading enlargement uses state-preserving DOM movement
where available and expands in place on older browsers; it does not reinsert a
loaded iframe with `appendChild`.

The service caches bounded metadata for five minutes, deduplicates concurrent
queries, enforces per-instance admission limits, and includes fixed original-site
CORS headers on success and errors. Missing credentials, limits, provider errors,
and widget failures have separate readable states. The current Hub is free and
noncommercial; no payment or commercial lyrics agreement was created.

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

Keep the host page open, following the Hub's trusted-host model. No new player
account, voice system, database rules, payment, or AI service is used. The
discovery key stays in the server's deployment environment.
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

2026-10-08 discovery validation: 111 Open Mic tests and 838 full-site tests pass.
New client, API, and UI cases cover official request construction, secret-free
errors, bounded metadata, input validation, cancellation, timeout, caching and
remaining CDN expiry, concurrent deduplication, rate limits, stale response/add
completion fences, local preview, and unchanged stage/scoring authority. Local
browser QA uses explicit server-side fixtures; real provider activation requires
the deployment key and a subsequent live search/popular verification.

2026-10-08 direct stage selection validation: 132 Open Mic cases and 859 full-site
tests pass. New cases cover atomic unknown-video registration without favorites,
shared selection and lyrics, stale/duplicate/forged commands, and both orders of
command acknowledgement and room projection. Local autoplay is consumed once;
failed, expired, disconnected, or superseded requests remain passive. Browser QA
directly selects an unsaved search result, then confirms optional saving and a
passive second-player view. Chinese and English controls fit a 375px viewport.

2026-10-08 editable-stage/lyrics validation: 159 Open Mic cases and 886 full-site
tests pass. Real LRCLIB verification resolves the official WAIT video metadata to
WAIT / E.SO and returns two records with lyrics. Native synchronization cases
cover replacement/removal fanout, timer reset, immutable favorites/lyrics,
same-song no-op, completed-round protection, forged/stale commands, and a queued
finish after replacement. Browser QA covers change from focus mode, live-song
replacement, empty-stage removal, and in-game lyric-video discovery.

2026-10-08 official Genius validation: 981 full-site tests and 62 independent
service tests pass. Browser QA uses fixed song metadata and the real official
Genius widget: lyrics load beside the MV, the original combined stage-action row
is retained, and the reading view opens/closes without losing the loaded widget.
The public production service now returns authenticated Genius metadata and
existing YouTube search results, rejects foreign origins, and keeps source,
environment files, and static output unavailable. Production browser QA in the
isolated demo displays Sia's Chandelier official widget beside its MV without
using a real room. WAIT / E.SO resolves through LRCLIB; its two identical text
records reduce to one exact candidate for automatic import. Genius has no
verified exact WAIT match in the tested queries, so it is not used for that song.
Both public game entry points and all 15 release assets match the tested version.
