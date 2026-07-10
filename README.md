# IceBreak Hub

Online icebreaker games for English voice chat rooms and conversation classes. The host shares their screen while participants respond via voice — no camera or login required.

## Games

| Game | Description |
|------|-------------|
| 🔥 Hot Take Roulette | Spin for a bold opinion; room votes Agree / It Depends / Disagree and debates |
| 🤔 Sophie's Choice | Two tough options — pick one and defend your decision |
| 🤝 Persuade Together! | Team debate scenarios where players argue both sides |
| 🎭 You're In The Scene | Improv scene prompts with role assignments |

## Features

- Screen-share friendly: large text, high contrast, clean layout
- All game prompts stored locally in `game-data.js` — works fully offline
- Five-star ratings per prompt stored in Supabase, with a results overview (`ratings.html`)

## Stack

- Vanilla HTML / CSS / JavaScript — no build step
- [Supabase](https://supabase.com) for ratings (REST API, no SDK)
