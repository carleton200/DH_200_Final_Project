# Surgical Apocalypse Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `index.html` with a cartoon-themed landing page for "Surgical Apocalypse" that links to both game versions and the AI Usage Log.

**Architecture:** One self-contained `index.html`: inline `<style>`, inline SVG artwork, no JavaScript required for any link to work. Checks are run in a real browser through the Playwright plugin against a local static server.

**Tech Stack:** HTML, CSS, inline SVG. Playwright (MCP plugin) for verification. `python -m http.server` or `npx serve` as the local server.

**Spec:** `docs/superpowers/specs/2026-11-19-landing-page-design.md`

## Global Constraints

- Single file: `index.html`. No external image files, no build step, no framework.
- Fonts may come from Google Fonts, with a system fallback so the page still reads offline.
- Link targets, exactly: `hand-built/index.html`, `claude-enhanced/index.html`, `ai-log/AI-Use-Log.html` (all relative, so they work on GitHub Pages under a sub-path).
- Title text, exactly: "Surgical Apocalypse".
- Cartoonish, not gory.
- All animation disabled under `prefers-reduced-motion: reduce`.

## Review Focus

1. Phone width (375px): no horizontal scroll, both game buttons fully visible and tappable.
2. The fixed AI Usage Log button must not cover a game button or the implant cards' text at any width; the page needs bottom padding so the footer can scroll clear of it.
3. Google Fonts blocked or offline: title still legible with the fallback font.
4. Keyboard only: all three links reachable by Tab with a visible focus ring.
5. Very wide screens (1920px+): the scene fills the width without the artwork stretching or leaving bare bands.

---

### Task 1: Build the page

**Files:**
- Modify: `index.html` (full replacement)

**Interfaces:**
- Produces: stable hooks for the checks in Task 2: `a#play-hand-built`, `a#play-claude`, `a#ai-log-link`, `h1` containing "Surgical Apocalypse", `.implant-card` ×4.

- [ ] **Step 1: Write the document skeleton.** `<!DOCTYPE html>`, `<html lang="en">`, charset and viewport metas, `<title>Surgical Apocalypse</title>`, meta description.
- [ ] **Step 2: Write the scene.** Night sky, green moon, ruined hospital skyline (with a broken red cross sign) and a row of zombies as inline SVG, `aria-hidden="true"` on purely decorative art.
- [ ] **Step 3: Write the hero.** `h1` title with a drip effect, tagline, and the surgeon SVG (scrubs, mask, bionic arm, scalpel) with `role="img"` and an `aria-label`.
- [ ] **Step 4: Write the two game buttons** with the ids and hrefs above. Hand-built: stitched, patched-together look. Claude: glowing, upgraded look. Each has a title line and a one-line description.
- [ ] **Step 5: Write the implant teaser.** Four `.implant-card`s: Bionic Arm, Titanium Leg, Pacemaker, Ocular Implant. Each has an SVG icon and two or three stat bars showing a gain and a trade-off.
- [ ] **Step 6: Write the fixed AI Usage Log button** (`a#ai-log-link`, bottom-right, clipboard look) and the footer line.
- [ ] **Step 7: Add responsive rules, focus styles and the reduced-motion block.**

### Task 2: Verify in a browser with Playwright

**Files:**
- None changed unless a check fails; fixes go in `index.html`.

**Interfaces:**
- Consumes: the ids and classes from Task 1.

- [ ] **Step 1: Serve the folder locally** and open the page at 1440×900. Expected: no console errors (a 404 for a missing favicon is acceptable).
- [ ] **Step 2: Assert content.** `h1` text matches /surgical apocalypse/i; hrefs of the three links equal the Global Constraints values; four `.implant-card`s.
- [ ] **Step 3: Screenshot desktop** and look at it: art renders, nothing overlaps, text is readable.
- [ ] **Step 4: Resize to 375×812.** Assert `document.documentElement.scrollWidth <= window.innerWidth`. Screenshot and look at it. Assert the AI log button's rectangle does not intersect either game button's rectangle at scroll top.
- [ ] **Step 5: Resize to 1920×1080.** Screenshot and check for stretching or bare bands.
- [ ] **Step 6: Keyboard check.** Tab through; each of the three links takes focus and shows an outline.
- [ ] **Step 7: Click each link** and confirm the URL it navigates to ends with the expected path (the game pages 404 until they are built; the log page exists once the ai-use-log plugin has run).
- [ ] **Step 8: Fix anything that failed and re-run the failed check.**
