# IceBreak Hub

Online icebreaker games for English voice chat rooms and conversation classes.
The host shares their screen while participants respond via voice — no camera,
no app, no login required.

Everything secret (the taboo card, the jury's vote, each actor's role) is dealt to
each player's phone through a private link, so it never appears on the screen the
host is sharing.

## Games

| Game | Players | Description |
|------|---------|-------------|
| 💬 Let's Talk | 2–9 | A conversation mode: think first, optionally share a written thought, then take one main turn each round with spoken follow-up requests |
| ⚖️ Kangaroo Court | 4–9 | One player stands trial on a ridiculous charge. Prosecutor and defense make their case, the jury secretly votes twice — before and after |
| 🏰 Dare Conquest | 2–6 | Roll the dice, move around the board, and pull off a silly dare — confess, sing, joke, roast — to claim the land, or steal it from a rival |
| 🙊 Say It Without Saying It | 2–6 | One player describes a secret word without saying the forbidden words, one referees, and everyone else hits the buzzer to guess |
| 🔥 Pick a Side! | 2+ | Spin for a bold opinion; everyone votes 👍 / 🤷 / 👎 from their own card and the tally fills in live |
| 🤔 Sophie's Choice | 2+ | A morally impossible situation with two extreme choices — pick one and defend it, or take option C and argue your own |
| 🤝 Persuade Together! | 3+ | One player is dealt the judge, everyone else teams up to convince them |
| 🎭 You're In The Scene | 2–6 | Draw a chaotic situation — every player is dealt their own role and hint. No script, just improv |

## How it works

- `index.html` is the menu; each game has its own host page.
- `play.html` is the single player card page shared by **the seven games and Let's Talk** — it
  switches layout from the `game` field in the room data.
- One room code and one set of player links work across every game, so the host
  can switch games without re-sending anything.
- `CLAUDE.md` is the architecture log (written in Chinese): what every screen
  does and, more usefully, why each decision was made. Read it before changing
  anything shared — `room.js`, `play.html`, `index.html`, `game-data.js`,
  `i18n.js`, `shared.css` are relied on across the site.

### Let's Talk — first trial

Choose **Let's Talk** after the usual room setup; existing player links update
automatically. The host opens a topic and keeps that page open. Participants
use their own cards to signal readiness, request an oral question, invite the
question, and pass their main turn. Voice stays in your existing chat app.

Try [`lets-talk.html?demo=1`](https://livechat-two-alpha.vercel.app/lets-talk.html?demo=1)
on one phone without a room. Choose a topic, then switch the demo viewpoint
between the shared screen and four participants. This simulation does not
connect player cards and resets on reload.

Rules, synchronization design, limits, and verification steps are documented
in [`talk-mode.md`](talk-mode.md). Topics use plain English; interface controls
follow the site's Chinese / English switch. There are no scores, reaction
totals, required story lengths, or AI evaluations.

Choose from **48 topics across 8 categories**, with 4 follow-ups each (**240
questions** in total), or write your own topic. Search in Chinese or English,
preview a discussion path, and adapt a library topic. Custom drafts are saved
in the current browser. During a conversation, the host can choose a deeper
question or write one on the spot; it updates everyone's page while keeping
the current speaker, round, and spoken question requests.

A random question is ready at the top when the page opens. Draw another,
choose manually, or browse full questions and their follow-ups at the bottom.
Picking a question only changes the preview until you open it for everyone.
Prominent host controls can end a turn or return from a question if someone
leaves. The speaker's card shows a gold **Your turn!** banner and an **I'm done** button.

Each built-in topic includes an explanation of what the question means, its key
terms, and a way to begin answering. The host can turn **Show question explanations
(trial)** on or off for everyone's cards without interrupting a turn. Custom
topics can include their own explanation (up to 600 characters).

## Firebase

Live host → player sync runs on a free Firebase Realtime Database. Copy your own
project's values into `firebase-config.js` (setup steps and the required
database rules are documented at the top of that file). The file ships with a
real project's values already in it, so this is a swap, not a fill-in-the-blank
— see [Running your own copy](#running-your-own-copy).

Without Firebase configured:

- **Let's Talk** needs Firebase for real rooms. Its single-device demo works
  without a database connection.
- **Button is locked** — Kangaroo Court and Say It Without Saying It refuse to
  deal at all (the jury's votes and the clue giver's word have nowhere private
  to go).
- **Still fully playable** — the rest. They only lose the on-phone voting and
  buzzer interactions; the host screen carries the whole game.

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
every host screen perfectly and never once see a player card — half of each
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
- Game prompts live in `game-data.js`; Let's Talk's topics live in
  `talk-topics.js`. The host can override the former from a Google Sheet whose
  tabs are named after the games — `prompt-sheet-template.xlsx` is that sheet's
  starting content, generated from `game-data.js` by
  `tools/build-sheet-template.py`.
- Player links can be handed out as a copyable list or as QR codes

## Stack

Vanilla HTML / CSS / JavaScript — no build step, no backend.

- Firebase Realtime Database (compat SDK, loaded from CDN) for host → player sync
- `qrcode.js` — vendored qrcode-generator 1.4.4 (MIT)

Rule and transport regression tests require only Node.js:

```sh
node --test tests/*.test.cjs
```

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
— see `LICENSE`. Free to use, change, and share for any noncommercial purpose,
including schools and other educational institutions. Commercial use, such as
selling it or running it in paid classes, needs a separate licence from the
copyright holder.

`qrcode.js` is third-party (qrcode-generator, MIT) and keeps its own licence.
