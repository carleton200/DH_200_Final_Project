# Surgical Apocalypse landing page: design

## Intent

`index.html` is the front door to the DH 200 final project, the game "Surgical Apocalypse": a surgeon in a zombie apocalypse gets injured and chooses implants, and each implant changes their stats and survival odds. The page has two jobs: sell that theme (biomedical engineering, played for cartoon fun) and send visitors to one of two versions of the game, so the class can compare a hand-built game with a Claude Code-enhanced one. The page itself is part of the showcase of what Claude Code can do.

## Goals

- Two prominent buttons: the hand-built game and the Claude Code-enhanced game.
- A button fixed in the bottom-right corner that opens the AI Usage Log.
- On-theme cartoon artwork: surgeon, zombies, implants.
- Works when opened from disk and when served by GitHub Pages.
- Readable and usable on a phone.

## Non-goals

- No game logic. The games are built later.
- No build step, framework or external image files.

## Anti-goals

- Gore or horror that is unpleasant rather than cartoonish.
- Artwork that looks like placeholder emoji.

## Approaches

1. **One self-contained `index.html` with inline CSS and hand-drawn inline SVG (chosen).** No dependencies, nothing to break on GitHub Pages, and the art scales cleanly at any size.
2. Emoji and CSS shapes only. Quicker, but it looks cheap and differs between devices.
3. Generated raster images. Not available in this workflow, and it adds files to manage.

## Design

- **Scene:** night-time comic-book view of a ruined hospital skyline under a sickly green moon, with zombies shambling along the bottom of the page.
- **Hero:** dripping "SURGICAL APOCALYPSE" title, a one-line tagline, and a cartoon surgeon with a bionic arm holding a scalpel.
- **Main buttons:**
  - "Hand-Built Game" links to `hand-built/index.html`. Scrappy, stitched-together look.
  - "Claude Code Enhanced" links to `claude-enhanced/index.html`. Glowing, upgraded look.
- **Implant teaser:** four cards (bionic arm, titanium leg, pacemaker, ocular implant), each with a cartoon icon and playful stat bars showing a gain and a trade-off.
- **AI Usage Log:** fixed bottom-right button styled as a clipboard chart, linking to `ai-log/AI-Use-Log.html` (written by the ai-use-log plugin).
- **Footer:** one line naming the class project.
- **Polish:** light animations (zombie shamble, moon glow, title wobble) that switch off under `prefers-reduced-motion`; visible keyboard focus; text alternatives on the artwork.

## Decided by the project owner

- The two game paths above are correct; the games are added later, so those links 404 until then.
- Publishing `ai-log/` with the repository is intended.

## Left to the builder

Exact colours, fonts, drawing details, copy for the tagline and stat bars.

## Verification

Playwright: screenshots at desktop and phone widths, no console errors, no horizontal scroll on a phone, and all three links resolve to the expected paths.
