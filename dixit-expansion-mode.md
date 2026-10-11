# Dixit 42-card original expansion

The game now contains 126 original cards: 84 unchanged base pictures and 42 new
pictures d085–d126. The expansion includes all 8 approved conversation previews.
New games mix the complete pool automatically; rules and hand sizes stay the
same. Existing 84-card games keep their exact hands, pile, scores and artwork
until an explicit restart upgrades the session.

Every new picture is an independent 768×1024 WebP. The collection mixes abstract
relationships, metaphorical objects, dream places and fable scenes. Characters
are rare; primary silhouettes, palettes and secondary clue details vary. Titles
are production metadata, not captions shown on the card. Spoken clues remain
open-ended. Commercial cards and Disney characters are not included.

Artwork, dimensions and hashes: assets/dixit-expansion-1/manifest.json.
Built-in imagegen prompt set: assets/dixit-expansion-1/art-prompts.json.
Originals remain in the generated-image folder; project assets never reference
local source paths. The public manifests contain no room/player information.

DIXIT_ENGINE session deckVersion 3 selects 126 IDs independently of artwork
version. Unmarked older sessions select 84. Commands cannot enlarge an active
pool; restart creates a fresh 126-card session. DIXIT_DECK version 3 retains
stable base and legacy mappings. DIXIT_UI supports expanded IDs even with a
cached 84-item manifest. Both the independent runtime and frontend must be
released. Package the latest repository graph, retain Production configuration
and copy deployed runtime dependencies back into the owned service source.
Do not rotate or read secrets.

Validation covers card conservation after exhaust/refill, old/new membership
and restart, private/vote/reveal browser views, 42 independent file hashes/image
decodes and production checks using only fresh disposable room fixtures.
