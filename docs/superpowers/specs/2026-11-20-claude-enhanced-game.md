# Surgical Apocalypse: Claude Code enhanced version

Linked from the landing page's "Claude Code Enhanced" button at `claude-enhanced/index.html`.

## Files

- `claude-enhanced/index.html`: page, styles, dialogs. Plain `<script>` tags, so it runs from disk or GitHub Pages with no build step.
- `claude-enhanced/engine.js`: all game rules, no DOM. Also loads in Node.
- `claude-enhanced/art.js`: inline SVG scenes, implant and item icons, body diagram.
- `claude-enhanced/ui.js`: rendering, input, sound, saving.
- `tools/balance-sim.js`: balance simulator (`node tools/balance-sim.js 3000`).

## What changed from the hand-built Twine game

| Area | Hand-built | Enhanced |
|---|---|---|
| Randomness | Independent coin flips in every passage; "Lie down and rest" kills instantly | Seeded RNG. Every floor's encounters come from a fixed-mix deck shuffled at the start; the same seed gives the same hospital |
| Length | Progress counter to 60, with random +1/+2/+5 steps | Floors × hallway sections, shown in the top bar |
| Body parts | 4 (leg, arm, eye, heart); the same part could be lost twice | 5 (ear added); each part is hurt at most once, and the number of injuries per rank is fixed (3 / 4 / 5) |
| Biometrics | Prints the raw variables | Vitals stay hidden (monitor shows "No signal") until a bionic eye or arm is installed; then exact vitals, exact stat changes and a qualitative scanner read on fights. Choice hints never show numbers, and karma is never shown |
| Karma | Lowers the chance of meeting zombies | 70+ adds service stairs, 30 or less adds a zombie group; survivors help or rob you |
| New systems | none | Items, a growing horde (fleeing grows it), intersections, drug cabinets, cochlear hearing, a final horde at the doors, scoring, grades, endings |
| Bugs fixed | Fight damage could go negative (heal) at high attack; Flee reused a stale damage value; HP had no cap | Damage is clamped, HP is capped at 100, and every value is computed fresh |

## Balance (simulated, 1,500–3,000 runs per row)

Win rate for a sensible bot and a random clicker:

| Version | Sensible | Random clicker |
|---|---|---|
| Hand-built (Twine rules) | 99.9% | 9% (88% of runs die to "Lie down and rest") |
| Enhanced: Intern | ~100% | ~80% |
| Enhanced: Resident | ~86% | ~15% |
| Enhanced: Attending | ~48% | ~2% |

The hand-built game is close to binary: careful play almost never loses, and a single trap option causes nearly every loss. The enhanced ranks give a smooth, skill-sensitive curve, and winning-run length varies by only about 6% (coefficient of variation).
