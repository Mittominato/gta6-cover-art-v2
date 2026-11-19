// Vice Sunset Cover Lab — screenshot / demo mode.
// Handles ?shot=cover&size=WxH&layout=...&grade=...&title=...: hides the
// editor chrome and draws the cover full-viewport using the app's real
// render path (composeCover from cover.js), so a screenshot of this page
// IS the exported cover. The layout is picked to fit the aspect unless
// the query names one, and the grade/title come from the query too.

import { GRADES, LAYOUTS, freshState, composeCover } from './cover.js';

function loadSampleImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function layoutForAspect(W, H, wanted) {
  if (wanted && LAYOUTS[wanted]) return wanted;
  if (W > H) return 'heroDuo';
  if (W === H) return 'quad';
  return 'triptych';
}

async function runShotMode() {
  const params = new URLSearchParams(location.search);
  if (params.get('shot') !== 'cover') return;

  const size = params.get('size') || '1920x1080';
  const [W, H] = size.split('x').map((n) => parseInt(n, 10) || 0);
  if (!W || !H || W > 3840 || H > 3840) return;

  document.documentElement.classList.add('shot-mode');
  document.body.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'shot-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Exported cover ${W} by ${H}`);
  canvas.width = W;
  canvas.height = H;
  document.body.appendChild(canvas);

  // Wait for the bundled fonts so lettering renders in Anton/Lobster.
  try { await document.fonts.ready; } catch (e) { /* fall back to system fonts */ }

  const state = freshState();
  state.layout = layoutForAspect(W, H, params.get('layout'));
  // Fill every panel of the chosen layout with a sample photo, so a
  // four-panel cover never shows an empty placeholder.
  const panelCount = LAYOUTS[state.layout].panels;
  for (let i = 0; i < panelCount; i++) {
    if (state.slots[i] == null) state.slots[i] = i % 2;
  }
  state.title = params.get('title') || 'VICE SUNSET';
  state.subtitle = params.get('subtitle') || 'chrome, palms & midnight drives';
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const spot = params.get('spot');
  if (spot === 'bottom-right' || spot === 'top-left') state.titleSpot = spot;
  // ?grain=0 / ?vignette=0 let a shot show the clean grade alone.
  if (params.get('grain') === '0') state.grain = false;
  if (params.get('vignette') === '0') state.vignette = false;
  const sizeScale = Number(params.get('titleSize'));
  if (sizeScale >= 60 && sizeScale <= 140) state.titleSize = sizeScale / 100;

  const images = [];
  try {
    images[0] = await loadSampleImage('samples/boulevard.jpg');
    images[1] = await loadSampleImage('samples/pier.jpg');
  } catch (e) {
    // Render anyway with placeholder panels.
  }

  const ctx = canvas.getContext('2d');
  composeCover(ctx, state, W, H, images);
  window.__shotReady = true;
  document.title = `Vice Sunset Cover ${W}x${H} — ${state.title}`;
}

runShotMode();
