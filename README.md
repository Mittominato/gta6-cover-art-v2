# Vice Sunset Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Mittominato/gta6-cover-art-v2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Mittominato/gta6-cover-art-v2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos + a caption into bold
multi-panel cover art in the style of a sunset poster, exported as
a PNG to share. Original design — no game logos, artwork or fonts.

## Run it

```sh
node serve.ts
# open http://localhost:8080/app/  (or http://localhost:8080/app/?demo=1
# to preload the two sample photos)
```

Any static file server works too — the app is plain files under `app/`
with no build step and no network requests.

## Use it

1. Add photos from your machine (file picker or drag & drop), or try a
   sample photo (Boulevard / Pier).
2. Pick a layout: Triptych, Quad Grid, Hero + Duo, or Full Bleed.
3. Edit the title (Anton) and subtitle (Lobster script), and move the
   title: bottom left, bottom right, or top left.
4. Pick a grade — Vice Dusk, Neon Strip, Palm Teal, or Gold Hour — and
   toggle film grain / vignette.
5. Click a panel to select it; drag on the preview to pan its photo,
   use the zoom slider to crop; click a tray photo then a panel to
   assign it; "Fill all panels" puts one photo everywhere.
6. Export a PNG: 1080 × 1080, 1080 × 1350, or 1920 × 1080.

## Files

- `main.ts` — entry program: copies `app/` + `screenshots/` to
  `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json`.
- `app/index.html`, `app/style.css` — editor page and dark neon UI.
- `app/src/cover.js` — cover rendering engine (layouts, grades,
  lettering, grain, vignette, export render).
- `app/src/main.js` — editor wiring (photos, tray, pan/zoom, export).
- `app/src/shots.js` — `?shot=cover&size=WxH` full-viewport cover mode
  used for screenshots, drawn through the real render path.
- `app/fonts/` — Anton & Lobster, SIL Open Font License
  (see `app/fonts/OFL.txt`).
- `app/samples/` — two free-to-use sample photos.

## Screenshots

`screenshots/` holds four real captures of the app running in headless
Chromium: the 1920×1080 cover, the editor with photos loaded, and the
1080×1350 and 1080×1080 covers (each drawn through the app's own render
path via `?shot=cover&size=…`).

## Design notes

- Four layouts, not three: Triptych (three tall panels) joins Hero +
  Duo and Quad Grid, so a square, a portrait and a landscape cover
  each get a layout that fits.
- The title can sit bottom left, bottom right or top left — a cover
  with a bright sky at the bottom still gets readable lettering.
- Grain is seeded, so two exports of the same cover are identical.
- Keyboard: keys 1–4 select a panel, G cycles the grade.

## Round 2

This repository is a from-scratch rebuild of the round-1 entry
(`Mittominato/gta6-cover-art`), rewritten in a single recorded session
so its transcripts witness every line. Same bounty, new code.

## License

MIT — see `LICENSE`. Fonts are under the SIL Open Font License.

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run it twice into two directories and `diff -r` them — the outputs are
byte-identical (the build is deterministic).

---

Entered on [make.fun](https://make.fun/?ref=6xedf17w&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
