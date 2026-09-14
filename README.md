# Golden Crust Pie Co.

A scroll-driven pie shop website, built as a learning project for GitHub and prompt engineering.

Inspired by an "anatomy of a pie" scroll experiment (Apple-style pinned scroll storytelling), this
site turns each pie on the menu into its own scroll-driven cross-section: the puff pastry lid lifts
away, each filling layer highlights in turn, and the shortcrust base settles in at the end — all
paired with text that fades in as you scroll.

## Pages

- `index.html` — home page
- `menu.html` — full menu, links to every pie's anatomy page
- `pies/chicken.html` — classic chicken, mushroom & mixed veg — real 240-frame photo sequence
- `pies/mince-and-triple-cheese.html` — loaded mince pie with a grilled cheddar/mozzarella/parmesan
  cap — real 240-frame photo sequence
- `pies/steak-and-cheese.html` — diced steak, thick gravy, cheese
- `pies/vege.html` — roast pumpkin, kumara & mixed veg, vegetarian
- `pies/singapore-nz.html` — Singapura Curry Pie, a Singapore x NZ limited edition
- `pies/cutie-pie.html` — mini mandarin & vanilla custard dessert pie, a concept placeholder page
  (no scroll sequence yet — no photography exists for it)

The classic single-cheese Mince & Cheese pie was retired as its own menu item — it's no longer
linked as a page — but its icon still appears as a small "built on" reference inside the Mince &
Triple Cheese card on `menu.html`, since that pie is the loaded version of it.

Each finished pie page ends with an ingredients list and a nutrition information panel (per pie /
per 100 g). All pricing and nutrition figures are illustrative sample data for this demo project,
not a real product.

## How it works

- Plain HTML/CSS/JS, no build step — open any `.html` file directly, or serve the folder with any
  static file server.
- Scroll animation is driven by [GSAP](https://gsap.com/) + ScrollTrigger (loaded from cdnjs) on
  every pie page, via one of two reusable engines:
  - `assets/js/anatomy.js` — drives the three illustrated pies (Steak & Cheese, Vege, Singapura
    Curry Pie). No photography for these; the cross-section is hand-built inline SVG, and the lid
    lifts/fades while each filling layer highlights in turn.
  - `assets/js/frame-sequence.js` — drives the Chicken and Mince & Triple Cheese pies, which instead
    scrub through a real 240-image photographed sequence (`assets/frames/chicken-pie/` and
    `assets/frames/mince-triple-cheese/`) on a pinned `<canvas>`, the same technique the original
    "Anatomy of a NZ chicken pie" scroll demo used. See *Frame loading performance* below.
  - Cutie Pie has no engine yet — it's a static "coming soon" page with no photography or frame
    sequence behind it.
  - Both engines take a per-pie config (frame/layer timings + overlay copy) from the inline
    `<script>` at the bottom of each `pies/*.html` file.
- If the animation library fails to load (e.g. blocked by an ad blocker), every pie page falls back
  to a simplified scroll-linked reveal so the content still works.

## Frame loading performance

The two real-photo pies (Chicken, Mince & Triple Cheese) each ship 240 JPEGs. Two things keep that
from being a slow page:

- **Frames are resized and compressed for the web**, not left at their original export size —
  1280px wide, quality 30, 4:2:0 chroma subsampling. On a smooth studio-grey background this is
  visually lossless at normal viewing sizes but cuts the combined payload from ~16.5MB to ~11MB.
  (Re-run this if you swap in a new sequence: resize to 1280px wide, re-encode as progressive JPEG,
  quality ~30, `subsampling=2` — see git history for the exact script.)
- **The page doesn't wait for all 240 frames.** `frame-sequence.js` loads images in a spread-out
  (bit-reversal) order rather than 1, 2, 3…, so a small, evenly-distributed set is available almost
  immediately; the loader dismisses and scrolling becomes usable as soon as the poster frame (or a
  dozen spread frames, if that one fails) has decoded, while the rest continue downloading in the
  background. `nearestDrawable()` always draws the closest frame that has loaded so far, so a frame
  the visitor scrolls to before it's downloaded shows its nearest neighbour instead of a blank canvas.

## Deploying

This is a static site — it can be published as-is with GitHub Pages (Settings → Pages → deploy from
branch, root folder).
