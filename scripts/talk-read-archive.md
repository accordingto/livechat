
# Private Crazy Talk archive reader

This operator-only command reads handwritten challenges from one named room. It creates no player interface and never changes the archive, room or game state.

Run from a clean directory without .env files, using the existing Vercel auth directory. Use absolute CLI and reader paths:

    node "<VERCEL_CLI>/dist/index.js" env run --environment production --project icebreaker-youtube-search --scope willintaiwan --global-config "<EXISTING_AUTH_DIRECTORY>" -- node "<REPOSITORY>/scripts/talk-read-archive.cjs" --room ABCD1234 --limit 100 --date 2026-10-10

--room is required: uppercase A–Z / 0–9, 4–12 characters. --limit defaults to 100 and permits 1–200. Optional --date YYYY-MM-DD selects the Taiwan calendar day using createdAt. The reader has no all-room, database URL, path or output-file argument.

The command reads only CRAZY_TALK_ARCHIVE_SECRET from its child-process environment. This is an independent 64-digit hex encryption key, not HUB_EXECUTOR_SECRET. Never pass its value as an argument, print the environment or use debug tracing. Missing, malformed or [SENSITIVE] values stop before any archive access. Vercel local files and inherited environment variables override downloaded values; the launcher should remove an inherited CRAZY_TALK_ARCHIVE_SECRET before starting Vercel and should not pull variables into an .env file.

Output is one JSON object: {room,count,total,records}. total counts records matching the date filter before the limit. The newest matching records are returned in chronological order. Unknown creation times become null, sort before known dates, and are excluded by a date filter. Output contains challenge text/type/status, relevant timestamps, participant names and topic question; IDs, encrypted envelopes, capsules, tokens and storage paths are omitted.

Read or decryption failures produce only a fixed error message. Transport forbids redirects and browser credentials, with a bounded timeout. Review output only within the authorized private task; do not publish it.

Offline verification:

    node --test tests/talk-read-archive.test.cjs

Tests use synthetic records and an in-memory encrypted store; they access no user room or production environment values.

