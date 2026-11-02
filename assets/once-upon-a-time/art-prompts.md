# Once Upon a Time artwork provenance

## V2 — individual meaning-matched paintings (2026-10-05)

The current deck uses **165 distinct original illustrations**, not category
fallbacks: 114 Story Cards and 51 Endings. Each was generated separately with
the built-in `image_gen` tool, then visually inspected against its English title
or full Ending sentence. The three user-supplied reference images informed the
fairy-tale painting and ornate gold-frame presentation. No commercial card scan
was copied, no CLI/API-key generator was used, and no AI runs during gameplay.

Exact per-image prompts, semantic descriptions, inspection notes, saved source
paths and native generated output paths are preserved in:

- [Character, Thing and first nine Endings](art-v2-character-thing.json)
- [Place, Aspect and next nine Endings](art-v2-place-aspect.json)
- [Event and remaining Endings](art-v2-event-ending.json)

Current deployable paths are
`assets/once-upon-a-time/<category>/<slug>-v2.webp` (768px width) and
`<slug>-v2-thumb.webp` (384px width). The exact paths are also mapped by stable
card ID in `art-manifest.json`. Original `<slug>-v2.png` paintings remain locally
preserved and gitignored, alongside the unchanged native generated output files.
The build script only resizes/encodes deployment copies to WebP; it does not
invent, alter or replace the visual subjects. It needs Sharp only at build time.

Card labels/titles are HTML. `card-backs/card-frame.svg` and the two card backs
are original code-native UI ornaments, separate from generated illustrations.
Portraits are shown intact in all variants; a dim blurred copy of the same
image fills any side area. This avoids cutting off a giant's head, a broken
blade, or an object needed to understand the word.

The following V1 records are retained as historical provenance. Those generic
paintings are no longer assigned to cards by the current deck/renderer.

## V1 — category fallback artwork

Six distinct original category paintings were generated with the built-in `image_gen` tool on 2026-10-05. No CLI, API key, commercial card scan, or reference artwork was used. The paintings are shared category fallbacks, not 165 unique illustrations. Each card retains a distinct `artKey` for future replacement.

All six selected outputs were inspected with `view_image`: full-bleed painterly artwork, clear subjects and category palette, no baked-in title, card frame, text, logo or watermark. No generated pixels were edited. The selected PNG files were copied into this project; their original generated files remain in place.

Story and Ending card backs are separately hand-authored original SVG ornaments in `card-backs/`; they are not image generation outputs.

## character

- Final project file: `assets/once-upon-a-time/character/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-7aef78b9-fc3d-422f-8fe3-ff6aabc31d92.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop story card, Character category fallback.
Primary request: an original wise cloaked traveler standing on an old forest path, warm gold category identity.
Scene/backdrop: ancient woodland path and distant soft mist, timeless European fairy-tale setting.
Subject: one kindly mature traveler in a warm ochre cloak, holding a simple wooden walking staff, face clearly visible and expressive.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, waist-up traveler is the strong central focal point, woodland fills the edges, readable silhouette at small card size.
Lighting/mood: gentle golden light, inviting wonder and quiet wisdom.
Color palette: antique gold and warm yellow with deep forest shadows and natural skin tones.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```

## thing

- Final project file: `assets/once-upon-a-time/thing/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-e7bbb4ca-2de2-411c-9d42-7113a30dceec.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop story card, Thing category fallback.
Primary request: an original ornate magic key beside a weathered sword, emerald green category identity.
Scene/backdrop: mossy stone in a quiet enchanted woodland clearing.
Subject: a large antique brass key and one old steel sword arranged diagonally on the mossy stone, simple recognizable magical objects with elegant craft details but no lettering or runes.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, key and sword dominate the middle, close view, distinct silhouettes and restrained background that fills the edges.
Lighting/mood: soft emerald reflected light and warm metallic highlights, mysterious and precious.
Color palette: emerald green, moss green, antique brass and subdued steel silver.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```

## place

- Final project file: `assets/once-upon-a-time/place/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-c2b734bc-8fb5-4473-892a-7ec041736406.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop story card, Place category fallback.
Primary request: an original fairy-tale castle seen through an autumn forest, burnt orange category identity.
Scene/backdrop: a winding old woodland path leads toward a modest medieval stone castle among hills.
Subject: an inviting castle with towers and an arched gate, framed naturally by autumn trees, with no figures necessary.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, castle clear in the upper middle and path in the foreground, painterly landscape fills every edge, strong recognizable structure at small card size.
Lighting/mood: late afternoon amber sunlight through copper leaves, adventurous and warm.
Color palette: burnt orange, russet, ochre, warm stone and muted forest greens.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```

## aspect

- Final project file: `assets/once-upon-a-time/aspect/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-d31d434d-0927-42c8-9a18-97c48afd1f44.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop story card, Aspect category fallback.
Primary request: an original moonlit enchanted veil drifting through a secluded glade, royal blue category identity.
Scene/backdrop: deep blue woodland clearing beneath a bright moon, quiet distant foliage.
Subject: a translucent silken veil suspended in a gentle breeze, a delicate magical transformation conveyed by the fabric catching moonlight, no human figure required.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, luminous veil forms a clear curved focal shape across the center, moon above and foliage at edges, artwork remains readable at small card size.
Lighting/mood: silver moonlight on royal blue shadows, dreamlike, mysterious, subtle natural magic.
Color palette: royal blue, indigo, moon silver and soft muted blue highlights.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```

## event

- Final project file: `assets/once-upon-a-time/event/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-906153b9-b66d-43d7-bbb8-b12bf57fdd58.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop story card, Event category fallback.
Primary request: an original brave rescue during a storm on a fairy-tale journey, violet category identity.
Scene/backdrop: a narrow stone bridge over a rushing stream, an old woodland trail beyond, storm clouds opening over distant hills.
Subject: one cloaked adult traveler reaching a steady hand to help another adult traveler safely up onto the stone bridge; clear supportive action, both people safe, no injury.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, the two travelers and their joined hands form the clear central action, bridge and clouds fill the edges, readable gesture at small card size.
Lighting/mood: dramatic violet storm light with a gentle break of warm light, courage and hope.
Color palette: violet, plum, muted lavender storm clouds, natural warm accents.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```

## ending

- Final project file: `assets/once-upon-a-time/ending/fallback.png`
- Original output: `C:\Users\user\.codex\generated_images\01a1087d-8d12-7472-97ac-4de26b89e204\exec-348aabad-c34e-4f11-8f1f-7bd4f0a9e801.png`
- Provenance: built-in `image_gen`, original generation, no input images, `transparent_background: false`.

Exact final prompt:

```text
Use case: illustration-story
Asset type: full-bleed square artwork for a premium fairy-tale tabletop Ending card fallback.
Primary request: an original traveler returning home to a cozy fairy-tale cottage, warm parchment palette.
Scene/backdrop: a humble cottage at the end of a woodland path, flower garden and quiet hills at twilight.
Subject: one small cloaked traveler approaching the open welcoming cottage doorway, warm light in the windows, peaceful sense of a tale coming to rest.
Style/medium: rich hand-painted storybook oil and gouache illustration, layered brushwork, subtle fine canvas texture, sophisticated classical fantasy tabletop art.
Composition/framing: square canvas, cottage and warm doorway are the strongest focal point, path and traveler lead toward it, scene fills every edge, clear composition at small card size.
Lighting/mood: gentle lamplight meeting blue dusk, belonging, calm and storybook warmth.
Color palette: warm parchment, honey gold, soft earth brown and muted blue dusk.
Constraints: finished painting only, full bleed to every edge, no card frame, no border, no title strip, no text, letters, labels, symbols resembling writing, watermarks, logos or UI. Original art, no imitation of any commercial card illustration. No emoji, no neon, no science fiction.
```
