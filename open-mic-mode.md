> Independent execution (2026-10-09): the optional, configured room service lets remaining players continue with the original private-card links after the host closes the page. See [service activation and recovery](hub-executor-mode.md). Without the deployment secret, the legacy browser-host requirements below still apply.

# Open Mic Rescue / 開麥救場

## Current mode: text prompts and original activities

Open Mic Rescue remains the last game in the Hub menu. It uses the room set up
on `index.html` and each player's existing `play.html` link. Challenge prompts
remain English; interface controls follow the shared language setting.

The game displays song titles, optional artist names, and activity prompts. It
contains no embedded video or audio player, previews, remote thumbnails, live
playlist player, lyrics display, lyrics import, or lyrics editor. A saved song
is a text prompt for conversation, not a playable recording.

The three built-in activity cards offer:

- **Song memories:** use a song title to tell a memory, feeling, or personal story.
- **Original improvisation:** invent a new short melody or words of your own.
- **Rhythm relay:** make an original clap or tap pattern and invite a response.

A regular song title suggests the story activity. The original cards highlight
their corresponding activity. None of these prompts instruct players to
reproduce a commercial song's lyrics or melody. Activities happen through the
usual call or in the physical room; the game does not record or evaluate them.

## Turns and scoring

2–9 players take turns as Spotlight. Everyone may ask questions and react during
the short social challenge. Only the host judges Success or Failed. Success
awards the cooperative team +2 once. After either result, the host or current
active Spotlight can choose a title or activity card, invite one active
partner, and complete a short story or original activity for +1. Skip awards
no extra points. No quality, pitch, rhythm, applause, or voice is evaluated.

**Start my turn / 開始互動** starts a 35-second visual timer. Reaching zero
changes only the hint: it does not score or rotate players. **Finished my turn /
完成互動** awards +1 once. Host Next during an active turn also finalizes that
point before rotating; Skip during an active turn awards nothing. Only the
host advances the queue. Internal command and state names such as
`startSinging`, `finishSinging`, and `singingState` are retained for room
compatibility, while the interface describes the current activity.

**Change my choice** and **Remove my choice** stay in the original action row
alongside Start/Finish, partner, Skip, and host Next. Change opens the local
browser without changing the selected card. Selecting a different title or
card from the library, My Songs, or search results replaces the current choice
directly; saving to My Songs first is optional.

During an active turn, replacement stops its timer and returns to choice without
awarding a point. Removing the choice clears the selected card, timer, and
partner while retaining the shared title library and personal favorites.
Selecting the same card is an acknowledged no-op. Stale finish commands cannot
finalize a replaced or removed turn.

After a round finishes, replacement and removal remain available to the
controller. They preserve the settled score and finished phase; the activity
cannot restart. The host chooses Next to continue.

## Title library and favorites

The shared library includes curated song-title metadata and three original
activity cards. Category tabs and text search operate on the room library.
Every player can maintain My Songs for advance preparation. Adding a title or
saving a discovery result does not select it, start a timer, or score points.

The manual form accepts a title and optional artist name, each up to 140
characters. It sends `addSong {title, artist}` with no media URL. The engine
creates an opaque 11-character `omtxt` reference and saves it to the owner's
My Songs. These references also work with the existing selection and favorite
commands, but never produce a YouTube link. Starting a new session resets the
session's title library, favorites, and score; reloads preserve them.

## Optional YouTube metadata discovery

In-game search and public popular titles for Taiwan, the United States, and
South Korea remain available. Results show bounded text titles, upload-channel
labels, and a fetch timestamp. These are public regional results, not the
player's personal Home feed. Channel labels are not treated as artist names.
No thumbnail, preview, player, or autoplay is created.

Every role can search locally, including when shared game controls are offline.
Only the host or current active Spotlight may select or replace the shared
choice during choice, an active turn, or a finished round. A direct
`selectSong {videoId, title}` command can register an unknown search result
and select its text prompt without changing anyone's favorites. Selecting a
result never starts the activity timer or awards points.

Known real video IDs may have an ordinary **Open source on YouTube** link.
Opening that external source is a separate, explicit user action; the link
contains no autoplay parameter. Only a validated canonical YouTube URL is
constructed. Text-card IDs and supplied arbitrary URLs are never linked.
Search queries are sent to the metadata service. Queries and results are not
broadcast to the room; only an explicitly added or selected title enters shared
state. Superseded searches, input changes, session changes,
and teardown cancel or fence older responses. Late favorite-add completions
cannot switch the next player's view into the previous owner's list.

### Discovery service

The game calls the owner-managed service at
`https://icebreaker-youtube-search.vercel.app/api/open-mic-discovery`.
The service uses the official YouTube `search.list` and `videos.list` APIs
with a server-only `YOUTUBE_API_KEY` or existing `YOUTUBE_KEY` alias. The
original game deployment does not need the key. Provider URLs are fixed, video
IDs and metadata are validated, and upstream requests have an 8-second timeout.

Search metadata caches for 10 minutes and public popular metadata for 15
minutes. Fetch timestamps describe when the metadata was obtained. Repeated
requests share work, and cached responses retain their original expiry.
Admission and cache limits are best-effort per server instance, with CDN
caching; they are not distributed quota controls. Empty, unconfigured,
rate-limited, and unavailable responses provide in-game feedback while leaving
the original text library and manual form available.

The standalone service permits browser reads from
`https://livechat-two-alpha.vercel.app`, exposes `Retry-After`, and receives
no browser cookies or room credentials. CORS is not authentication. Only the
API routes are public; server source, configuration, and private files return
404. Keys remain deployment secrets and are never returned to the browser.

To configure discovery, enable YouTube Data API v3 in Google Cloud, restrict a
dedicated key to that API, save it as a Production Secret in the standalone
Vercel project, and redeploy that service. Do not change the room's Firebase
key. A website-referrer-only key does not work for server-side API requests.
Without a configured key, discovery returns HTTP 503
`discovery_setup_needed`. The existing key can continue serving metadata
without enabling any game media playback.

## Lyrics and media retirement

The host and participant entry pages no longer load the former YouTube-player,
LRCLIB, or Genius client modules. Their UI flows, automatic lookups, reading
views, editing forms, and playback controls are removed from the renderer.
The client command boundary rejects retired commands, and the authoritative
engine rejects `setLyrics` with `not_available`.

The former lyrics service is a tombstone: the standalone
`/api/open-mic-lyrics` and reusable `api/open-mic-genius.js` return HTTP
410 with `{error: "lyrics_retired"}` and `Cache-Control: no-store`. They do
not call Genius, read an access token, or retrieve lyrics. Existing Genius
credentials are no longer used by this code path.

Public room projections always expose an empty `songLyrics` object and
whitelist the title-library metadata fields. The current UI ignores legacy
stored lyric text. This prevents old saved lyrics from being displayed or
republished in current player views; it is not a claim that every historical
private database record has been physically deleted. Remaining room commands
use the ordinary 4,000-character envelope rather than the former expanded
lyrics transport allowance.

Already open host and player pages must refresh to load this release. A page
that has already loaded the older scripts or player cannot be retroactively
replaced by a static deployment. Do not start a new room merely to refresh;
the same room and player links continue working.

## Room synchronization and host lease

`open-mic-sync.js` keeps the existing Firebase private bearer nodes, one
host lease, transaction fences, command acknowledgments, and guarded game
switching. The lease lasts 14 seconds and renews every 4 seconds. Reloading a
host can briefly show another-host ownership while the previous tab's lease
expires; the room state remains intact.

Player projection updates carry both a revision and `hostLiveUntil`. A
projection with the same revision but a newer host lease may update the player
view. An older revision, or an older lease at the same revision, cannot
replace newer data. This keeps current player controls aware of host renewals
without weakening the existing session, turn, actor, or ownership checks.

## File responsibilities

- `open-mic-content.js`: original social challenges, original activity cards,
  song-title metadata, and categories.
- `open-mic-engine.js`: deterministic scoring and permissions, text-title
  additions, favorites, choice replacement/removal, retired-command rejection,
  and metadata-only public views.
- `open-mic-sync.js`: room ownership, transaction fences, acknowledgments,
  projection revisions, and host lease updates.
- `open-mic-ui.js` / `open-mic.css`: shared text-only host/player stage,
  original activity guidance, title browsing, manual text additions, partner
  selection, and responsive controls.
- `open-mic-discovery.js` / `api/open-mic-discovery.js`: client and reusable
  server core for bounded official YouTube metadata discovery.
- `api/open-mic-genius.js`: retired lyrics-route tombstone.
- `open-mic-host.js`: room connection and isolated `?demo=1` mode.
- `open-mic-rescue.html` / `play.html`: current entry points, using the
  original room and seat identities.

Official discovery references:
[search.list](https://developers.google.com/youtube/v3/docs/search/list),
[videos.list](https://developers.google.com/youtube/v3/docs/videos/list),
[Google credentials](https://developers.google.com/youtube/registering_an_application),
and [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).


## Player-card management

In a registered independent room, active players can judge challenges, advance,
manage sit-outs, end the game, or reset the team score and start a new game from
their own original card. Ending retains the final score and card contents;
restarting preserves saved song names, favorites and sit-outs. Both operations
use the current session/turn and deduplicate command IDs. A queued action from
the preceding turn cannot score the new game. Spotlight song/activity choices
remain the Spotlight player's own actions. Legacy rooms retain their host rules.
