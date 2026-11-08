# Biton: The Reckoning

A browser fighting game about our friend group. You play as Biton. Four friends stand
in your way, three rounds each: Nitzan, Ori, Tom and Ilay. Live at
https://biton-the-reckoning.vercel.app/

## How to play

Open `index.html` in Chrome, Edge or Firefox (double-click it). No install needed.
On a phone, turn it sideways and use the on-screen buttons.

| Key | Action |
| --- | --- |
| A / D or arrows | move |
| W / Space | jump |
| S | block |
| Left click / J | punch |
| K | kick |
| L | throw a slipper (costs 30 meter). At 100 meter: **call his mom** |
| T | taunt: fills your meter and makes the boss TILTED (hits harder, takes more damage) |
| P / Esc | pause |
| H | help |
| M | sound on/off |
| B (map) | baby mode (enemies hit half as hard) |

Secret: press **B five times on the title screen** for big head mode.

## The campaign

Every fight earns coins (75 for a win, +50 the first time you beat a round, 20 for a loss).
Spend them in the lobby's gear chest on weapons (gloves, foam bat, frying pan: more punch damage)
and outfits. After each friend's three rounds comes **Roast Time**, where you pick the insult.

| Chapter | Round 1 | Round 2 | Round 3 (ULTRA) |
| --- | --- | --- | --- |
| Nitzan | **The Return Shot**: boomerang hat | **Say Cheese**: Ori films selfies from the background; the flash blinds you unless you block or pose | **Ultra Nitzan**: powers up, fakes injuries, tries to rage quit |
| Ori | **Turn It Up**: blame-finger and a scream that inflates his head | **It Was Him**: tag team with Nitzan, the one on the bench heals | **Group Selfie**: both at once, block on the count of 1 |
| Tom | **Just One Spoon**: syrup jars, sticky puddles, force-feeding | **Sugar Rush**: every spoon makes him faster until he crashes asleep | **The Infomercial**: jar rain, syrup waves, the price tag drops with his health |
| Ilay | **Going Up**: knock the bottle out of his hands in the elevator | **The Hydration Lecture**: jump the words, mind the wet floor | **Bottle Ascension**: lasers, blackouts, final boss |

ULTRA rounds: the boss gets a bigger head, an aura, extra speed and a red sky. Nitzan and Ilay
also rage quit at low health (chase them, they come back with +25% HP).

Other things that happen: slow-motion K.O. where the loser's head pops off, combo titles
("UNCALLED FOR", "CALL HIS MOM"), rank grades, sarcastic tips when you lose, and baby mode
offered after two losses on the same round.

## Changing names, jokes and difficulty

Everything lives in `config.js`: names, dialogue, taunts, roasts, and per-round `hp`,
`aggression`, `block` and `dmg`. Each round's `mods` switch gimmicks on. Universal ones
work for any boss: `ultra`, `phone`, `flop`, `rageQuit`, `excuses`. The rest belong to one
boss (`selfie`, `tag`, `duo`, `groupSelfie`, `jars`, `eat`, `offer`, `jarRain`, `wave`,
`infomercial`, `elevator`, `drink`, `lecture`, `splash`, `laser`, `lightsOut`, `ascend`).

Faces are cut-out photos in `assets/faces/`. Lobby art is in `assets/clubhouse/`.

## Files

- `index.html`: page, help dialog, touch buttons
- `config.js`: all text and level settings
- `game.js`: engine (fighters, hits, menus, HUD, campaign progress)
- `bosses.js`: each boss's special moves, round gimmicks, universal mods and backgrounds
- `lobby.js`, `lobby.css`: the clubhouse lobby, locker and gear chest
- `economy.js`: coins, chest and loadout (saved in the browser)
- `audio.js`: sound effects and music, synthesized in the browser (no audio files)

Debug URLs: `?level=5&fight` jumps straight into round index 5 (0–11), `?god` for infinite health,
`?notimer` to stop the clock.
