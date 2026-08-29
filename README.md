# IceBreak Hub

Online icebreaker games for English voice chat rooms and conversation classes.
The host shares their screen while participants respond via voice — no camera,
no app, no login required.

Everything secret (the wolf's word, the taboo card, the jury's vote) is dealt to
each player's phone through a private link, so it never appears on the screen the
host is sharing.

## Games

| Game | Players | Description |
|------|---------|-------------|
| 🗡️ Dungeon Party | 3–6 | Co-op: everyone is dealt a class with one skill to spend, then the party descends 3, 5 or 7 floors on one shared health bar. Each monster is a challenge dealt secretly to the players' cards |
| ⚖️ Kangaroo Court | 4–9 | One player stands trial on a ridiculous charge. Prosecutor and defense make their case, the jury secretly votes twice — before and after |
| 🏰 Dare Conquest | 2–6 | Roll the dice, move around the board, and pull off a silly dare — confess, sing, joke, roast — to claim the land, or steal it from a rival |
| 📜 Secret Rule | 2–6 | Everyone secretly gets a different person to treat the room as — your students, your boss, total strangers. Just chat, then guess who everyone thought they were talking to |
| 🙊 Say It Without Saying It | 2–6 | One player describes a secret word without saying the forbidden words, one referees, and everyone else hits the buzzer to guess |
| 🐺 Word Wolf | 3–6 | Almost everyone gets the same secret word — one Wolf gets something different. Talk it out and find the Wolf |
| 🤐 Forbidden Words | 2–6 | Two teams each get a common word. Trick the other team into saying it first, without ever telling them |
| 🎴 Emotion Cards | 2–6 | Every player secretly gets an emotion — speak in it and let the room guess which one |
| 🔥 Pick a Side! | 2+ | Spin for a bold opinion; everyone votes 👍 / 🤷 / 👎 from their own card and the tally fills in live |
| 🤔 Sophie's Choice | 2+ | A morally impossible situation with two extreme choices — pick one and defend it, or take option C and argue your own |
| 🤝 Persuade Together! | 3+ | One player is dealt the judge, everyone else teams up to convince them |
| 🎭 You're In The Scene | 2–6 | Draw a chaotic situation — every player is dealt their own role and hint. No script, just improv |
| 🚪 Scene Crashers | 3–8 | Two leads get a location and a shared history, then new characters keep barging in with a twist of their own |

## How it works

- `index.html` is the menu; each game has its own host page.
- `play.html` is the single player card page shared by **all thirteen games** — it
  switches layout from the `game` field in the room data.
- One room code and one set of player links work across every game, so the host
  can switch games without re-sending anything.

## Firebase

Live host → player sync runs on a free Firebase Realtime Database. Copy your own
project's values into `firebase-config.js` (setup steps and the required
database rules are documented at the top of that file).

Without Firebase configured:

- **Button is locked** — Kangaroo Court, Say It Without Saying It and Dungeon
  Party refuse to deal at all (the jury's votes, the clue giver's word and every
  dungeon challenge have nowhere private to go).
- **Warns, but still deals** — Secret Rule, Emotion Cards, Word Wolf and
  Forbidden Words show a banner; the cards go nowhere, so in practice these
  need Firebase too.
- **Still fully playable** — the other six. They only lose the on-phone voting
  and buzzer interactions; the host screen carries the whole game.

## Features

- Screen-share friendly: large text, high contrast, clean layout
- All game prompts live in `game-data.js` — no network call to play
- Player links can be handed out as a copyable list or as QR codes

## Stack

Vanilla HTML / CSS / JavaScript — no build step, no backend.

- Firebase Realtime Database (compat SDK, loaded from CDN) for host → player sync
- `qrcode.js` — vendored qrcode-generator 1.4.4 (MIT)
- `lrclib.net` — free lyrics lookup used by the Lyrics Finder on the Emotion
  Cards page (optional; the page works without it)
