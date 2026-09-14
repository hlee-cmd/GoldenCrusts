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
- `pies/mince-and-cheese.html` — classic beef mince & cheese
- `pies/steak-and-cheese.html` — diced steak, thick gravy, cheese
- `pies/vege.html` — roast pumpkin, kumara & mixed veg, vegetarian
- `pies/singapore-nz.html` — Singapura Curry Pie, a Singapore x NZ limited edition

Each pie page ends with an ingredients list and a nutrition information panel (per pie / per 100 g).
All pricing and nutrition figures are illustrative sample data for this demo project, not a real
product.

## How it works

- Plain HTML/CSS/JS, no build step — open any `.html` file directly, or serve the folder with any
  static file server.
- Scroll animation is driven by [GSAP](https://gsap.com/) + ScrollTrigger (loaded from cdnjs) on
  every pie page, via one of two reusable engines:
  - `assets/js/anatomy.js` — drives the four illustrated pies (Mince & Cheese, Steak & Cheese, Vege,
    Singapura Curry Pie). No photography for these; the cross-section is hand-built inline SVG, and
    the lid lifts/fades while each filling layer highlights in turn.
  - `assets/js/frame-sequence.js` — drives the Chicken pie, which instead scrubs through a real
    240-image photographed sequence (`assets/frames/chicken-pie/`) on a pinned `<canvas>`, the same
    technique the original "Anatomy of a NZ chicken pie" scroll demo used.
  - Both engines take a per-pie config (frame/layer timings + overlay copy) from the inline
    `<script>` at the bottom of each `pies/*.html` file.
- If the animation library fails to load (e.g. blocked by an ad blocker), every pie page falls back
  to a simplified scroll-linked reveal so the content still works.

## Deploying

This is a static site — it can be published as-is with GitHub Pages (Settings → Pages → deploy from
branch, root folder).
