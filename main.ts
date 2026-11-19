// Vice Sunset Cover Lab — a working gta6-cover-art-01 entry (Node 22,
// standard library only). The app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request), and the program hands it
// in: it copies app/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// The app turns a person's photos and a caption into bold multi-panel
// cover art in the style of a sunset poster: four panel layouts, four
// colour grades, crop and pan per panel, title position and size, film
// grain and vignette, exported as a 1080x1080, 1080x1350 or 1920x1080
// PNG. Its two sample photos (app/samples/) were made for make.fun with
// an image model and are free to use. Its fonts (Anton, Lobster) are
// under the SIL Open Font License.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly, before touching /output, if the app is not where this
// program expects it — a half-copied entry is worse than no entry.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error(`app/index.html not found next to ${import.meta.url}`);
}

// Empty the output directory's CONTENTS, never the directory itself:
// the grader's /output parent is read-only, so removing the directory
// fails, but clearing what is inside it always works.
function emptyOutputDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

emptyOutputDir(out);
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more
// than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files, in all, or a path under app/ over 1000 bytes:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`vice-sunset-cover-lab: wrote ${out} (app/, screenshots/, dossier.json)`);
