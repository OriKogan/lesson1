# Biton: The Reckoning

A browser fighting game about our friend group. Beat Biton three times, then take on
the Selfie Squad, the Silan Sommelier and the Hydration Monk (3 levels each).

## How to play

Open `index.html` in Chrome, Edge or Firefox (double-click it). No install needed.
On a phone, turn it sideways and use the on-screen buttons.

| Key | Action |
| --- | --- |
| A / D or arrows | move |
| W / Space | jump |
| S | block |
| J | punch |
| K | kick |
| L | throw a slipper (costs 30% meter). At 100% meter: **call his mom** |
| T | taunt: fills your meter and makes the boss TILTED (hits harder, takes more damage) |
| P / Esc | pause |
| M | sound on/off |
| B (map) | baby mode (enemies hit half as hard) |

Secret: press **B five times on the title screen** for big head mode.

## The levels

| Chapter | Boss | Levels |
| --- | --- | --- |
| 1 | Biton | Recess Rumble (checks his phone mid-fight), Biton Is Mad Now (throws excuses, fakes injuries), Ultra Biton (powers up, tries to rage quit) |
| 2 | The Selfie Squad (Sir Hat-a-Lot + Mr. Shook) | Say Cheese (selfie flashes blind you unless you block or pose), It Was Him (tag team, blame-finger attacks), Group Selfie (2 vs 1) |
| 3 | The Silan Sommelier | A Taste of Silan (sticky jars, force-feeding), Sugar Rush (eats to get faster, then crashes), The Infomercial (jar rain, syrup waves, price drops as he loses) |
| 4 | The Hydration Monk | Going Up (knock his bottle away), The Hydration Lecture (jump over words, wet floors), Bottle Ascension (lasers, lights go out) |

Each chapter ends with a **Roast Time** where you pick the insult. You'll also find combo titles,
a slow-mo K.O. where the loser's head pops off, rank grades and a sarcastic tip when you lose.

## Changing names, jokes and faces

Everything you'd want to change lives in `config.js`: names, dialogue, taunts, roasts and level difficulty.
The Selfie Squad, the Silan Sommelier and the Hydration Monk use cut-out photos from `assets/faces/`.
Biton and the player are drawn as cartoons.

## Files

- `index.html`: page, touch buttons
- `config.js`: all text and level settings
- `game.js`: engine (fighters, hits, menus, HUD)
- `bosses.js`: each boss's special moves, level gimmicks and backgrounds
- `audio.js`: sound effects and music, synthesized in the browser (no audio files)
