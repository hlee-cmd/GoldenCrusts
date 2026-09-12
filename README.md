# Golden Crust Pie Co.

A scroll-driven pie shop website, built as a learning project for GitHub and prompt engineering.

Inspired by an "anatomy of a pie" scroll experiment (Apple-style pinned scroll storytelling), this
site turns each pie on the menu into its own scroll-driven cross-section: the puff pastry lid lifts
away, each filling layer highlights in turn, and the shortcrust base settles in at the end — all
paired with text that fades in as you scroll.

## Pages

- `index.html` — home page
- `menu.html` — full menu, links to every pie's anatomy page
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
- Scroll animation is driven by [GSAP](https://gsap.com/) + ScrollTrigger (loaded from cdnjs). Each
  pie page pins its cross-section illustration and scrubs a timeline as you scroll, revealing the
  lid, each filling layer, and the base — see `assets/js/anatomy.js` for the reusable engine and the
  inline `<script>` at the bottom of each `pies/*.html` file for that pie's layer timings and copy.
- If the animation library fails to load (e.g. blocked by an ad blocker), the page falls back to a
  simplified scroll-linked reveal so the content still works.
- Pie cross-sections are hand-built inline SVG (no photography), so the whole site is self-contained.

## Deploying

This is a static site — it can be published as-is with GitHub Pages (Settings → Pages → deploy from
branch, root folder).
