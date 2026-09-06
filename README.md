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
| ⚖️ Kangaroo Court | 4–9 | One player stands trial on a ridiculous charge. Prosecutor and defense make their case, the jury secretly votes twice — before and after |
| 🏰 Dare Conquest | 2–6 | Roll the dice, move around the board, and pull off a silly dare — confess, sing, joke, roast — to claim the land, or steal it from a rival |
| 🙊 Say It Without Saying It | 2–6 | One player describes a secret word without saying the forbidden words, one referees, and everyone else hits the buzzer to guess |
| 🐺 Word Wolf | 3–6 | Almost everyone gets the same secret word — one Wolf gets something different. Talk it out and find the Wolf |
| 🔥 Pick a Side! | 2+ | Spin for a bold opinion; everyone votes 👍 / 🤷 / 👎 from their own card and the tally fills in live |
| 🤔 Sophie's Choice | 2+ | A morally impossible situation with two extreme choices — pick one and defend it, or take option C and argue your own |
| 🤝 Persuade Together! | 3+ | One player is dealt the judge, everyone else teams up to convince them |
| 🎭 You're In The Scene | 2–6 | Draw a chaotic situation — every player is dealt their own role and hint. No script, just improv |

## How it works

- `index.html` is the menu; each game has its own host page.
- `play.html` is the single player card page shared by **all eight games** — it
  switches layout from the `game` field in the room data.
- One room code and one set of player links work across every game, so the host
  can switch games without re-sending anything.
- `CLAUDE.md` is the architecture log (written in Chinese): what every screen
  does and, more usefully, why each decision was made. Read it before changing
  anything shared — `room.js`, `play.html`, `index.html`, `game-data.js`,
  `i18n.js`, `shared.css` are relied on by all eight games at once.

## Firebase

Live host → player sync runs on a free Firebase Realtime Database. Copy your own
project's values into `firebase-config.js` (setup steps and the required
database rules are documented at the top of that file). The file ships with a
real project's values already in it, so this is a swap, not a fill-in-the-blank
— see [Running your own copy](#running-your-own-copy).

Without Firebase configured:

- **Button is locked** — Kangaroo Court and Say It Without Saying It refuse to
  deal at all (the jury's votes and the clue giver's word have nowhere private
  to go).
- **Warns, but still deals** — Word Wolf shows a banner; the cards go nowhere,
  so in practice it needs Firebase too.
- **Still fully playable** — the other five. They only lose the on-phone voting
  and buzzer interactions; the host screen carries the whole game.

## Running your own copy

Fork it, clone it, or just download the files — there is no build step and
nothing to install. Three things need doing before it actually works.

### 1. Point it at your own Firebase project

`firebase-config.js` is committed with **a real project's values in it**, not
blanks. Clone the repo, skip this step, and nothing breaks and no error appears
— the games quietly read and write to somebody else's database. Replace every
value with your own before you play a single round:

```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
};
```

Setup takes about five minutes on the free tier. The steps, and the database
rules you have to paste in, are in the comment block at the top of that same
file. The rules are not optional — they are the only thing keeping one player's
link from reading everyone else's cards.

### 2. Serve it over HTTP, not `file://`

```
git clone <your fork>
cd livechat
python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

Double-clicking the HTML files opens them as `file://`, which breaks the room
state (kept in `localStorage`) and the Firebase connection.

### 3. Deploy it somewhere public — the player cards cannot be tested locally

This is the step that is easy to miss. Every game deals its secrets to
`play.html`, which players open **on their own phones**. A phone cannot reach
the `localhost` on your laptop, so with only a local server you can drive all
eight host screens perfectly and never once see a player card — half of each
game (buzzers, votes, the jury, Truth or Dare calls) lives on that page.

Any static host will do, since the site is plain files with no build step —
"import the repo, deploy" is the entire process:

- **Vercel** — what the live site runs on
- **Netlify**, **Cloudflare Pages**, **GitHub Pages** — equivalent here

Deployed files are public even when the repo is private: anyone can fetch
`/firebase-config.js` from the deployed site. That is expected and safe as long
as step 1's database rules are in place — see `SECURITY.md`.

## Features

- Screen-share friendly: large text, high contrast, clean layout
- All game prompts live in `game-data.js` — no network call to play
- Player links can be handed out as a copyable list or as QR codes

## Stack

Vanilla HTML / CSS / JavaScript — no build step, no backend.

- Firebase Realtime Database (compat SDK, loaded from CDN) for host → player sync
- `qrcode.js` — vendored qrcode-generator 1.4.4 (MIT)

## License

MIT — see `LICENSE`.
