// Vice Sunset Cover Lab — cover rendering engine.
// Draws GTA-style multi-panel cover art onto any canvas: panel layouts,
// photo pan/zoom crops, sunset and neon colour grades, bold outlined
// lettering with a script subtitle, film grain and vignette. Pure canvas
// 2D, no dependencies, no network. The same code draws the live preview,
// the exported PNG and the screenshot-mode covers.

export const GRADES = {
  dusk: {
    label: 'Vice Dusk',
    stops: ['#ffb347', '#ff5e62', '#c6427a', '#2b1055'],
    wash: 'rgba(255, 94, 98, 0.15)',
    titleTop: '#ffffff',
    titleBottom: '#ffd166',
    sub: '#ffe29a',
  },
  neon: {
    label: 'Neon Strip',
    stops: ['#ff2ea6', '#7b2ff7', '#00e5ff', '#0b1035'],
    wash: 'rgba(0, 229, 255, 0.13)',
    titleTop: '#ffffff',
    titleBottom: '#ff5ce1',
    sub: '#7df9ff',
  },
  palms: {
    label: 'Palm Teal',
    stops: ['#8ff5d2', '#2bb3a3', '#1b6ca8', '#0a2540'],
    wash: 'rgba(46, 196, 182, 0.13)',
    titleTop: '#ffffff',
    titleBottom: '#a7f3d0',
    sub: '#d8fff1',
  },
  gold: {
    label: 'Gold Hour',
    stops: ['#ffe259', '#ffa751', '#e25822', '#3d0c02'],
    wash: 'rgba(255, 167, 81, 0.14)',
    titleTop: '#fffbe6',
    titleBottom: '#ffb347',
    sub: '#fff3c4',
  },
};

export const LAYOUTS = {
  triptych: { label: 'Triptych', panels: 3 },
  quad: { label: 'Quad Grid', panels: 4 },
  heroDuo: { label: 'Hero + Duo', panels: 3 },
  full: { label: 'Full Bleed', panels: 1 },
};

export const TITLE_SPOTS = {
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
  'top-left': 'Top left',
};

// Panel rectangles as fractions of the cover, per layout. A thin gutter
// separates panels so the poster-grid look survives at any size.
export function panelGeometry(layout, W, H) {
  const g = 0.014 * Math.min(W, H);
  const x0 = g;
  const y0 = g;
  const x1 = W - g;
  const y1 = H - g;
  const w = x1 - x0;
  const h = y1 - y0;
  if (layout === 'quad') {
    const hw = w / 2 - g / 2;
    const hh = h / 2 - g / 2;
    return [
      { x: x0, y: y0, w: hw, h: hh },
      { x: x0 + hw + g, y: y0, w: hw, h: hh },
      { x: x0, y: y0 + hh + g, w: hw, h: hh },
      { x: x0 + hw + g, y: y0 + hh + g, w: hw, h: hh },
    ];
  }
  if (layout === 'triptych') {
    const pw = w / 3 - (2 * g) / 3;
    return [
      { x: x0, y: y0, w: pw, h },
      { x: x0 + pw + g, y: y0, w: pw, h },
      { x: x0 + 2 * (pw + g), y: y0, w: pw, h },
    ];
  }
  if (layout === 'full') {
    return [{ x: 0, y: 0, w: W, h: H }];
  }
  // heroDuo: one tall hero panel left, two stacked panels right.
  const heroW = w * 0.58 - g / 2;
  const sideX = x0 + heroW + g;
  const sideW = w - heroW - g;
  const sh = h / 2 - g / 2;
  return [
    { x: x0, y: y0, w: heroW, h },
    { x: sideX, y: y0, w: sideW, h: sh },
    { x: sideX, y: y0 + sh + g, w: sideW, h: sh },
  ];
}

// Fresh editor state. `slots` maps panel index -> photo index (or null);
// `crops` holds one pan/zoom crop per panel; photos themselves live in
// the editor's tray as HTMLImageElements, never in this state object.
export function freshState() {
  return {
    layout: 'heroDuo',
    grade: 'dusk',
    title: 'VICE SUNSET',
    subtitle: 'chrome, palms & midnight drives',
    titleSize: 1.0,
    titleSpot: 'bottom-left',
    grain: true,
    vignette: true,
    active: 0,
    slots: { 0: 0, 1: 1, 2: 0, 3: 1 },
    crops: {
      0: { zoom: 1.12, x: 0, y: 0 },
      1: { zoom: 1.18, x: 0, y: 0 },
      2: { zoom: 1.18, x: 0, y: 0 },
      3: { zoom: 1.18, x: 0, y: 0 },
    },
  };
}

// Draw one photo into a panel rect with cover-fit, zoom and pan. An
// empty panel gets a dark gradient placeholder with a diagonal sheen.
export function paintPhoto(ctx, img, rect, crop) {
  if (!img || !img.naturalWidth) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#43305c');
    grad.addColorStop(1, '#120e1e');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h * 0.3);
    ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  const zoom = crop?.zoom ?? 1;
  const px = crop?.x ?? 0;
  const py = crop?.y ?? 0;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + px * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + py * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Paint the grade: a diagonal wash of the grade's palette in overlay
// mode, then a soft tint, so every photo shares one poster palette
// while keeping its detail. A soft sun glow in the top-right corner
// ties the panels together into one poster sky.
export function paintGrade(ctx, W, H, gradeKey) {
  const g = GRADES[gradeKey] || GRADES.dusk;
  const grad = ctx.createLinearGradient(0, 0, W * 0.65, H);
  g.stops.forEach((c, i) => grad.addColorStop(i / (g.stops.length - 1), c));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g.wash;
  ctx.fillRect(0, 0, W, H);
  // Sun glow: a radial bloom in the palette's brightest stop.
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, Math.min(W, H) * 0.55);
  glow.addColorStop(0, g.stops[0]);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Deterministic film grain: a seeded generator, so an export drawn
// twice is byte-identical.
export function paintSpeckle(ctx, W, H) {
  let seed = 20261120;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const step = Math.max(2, Math.round(Math.min(W, H) / 400));
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      ctx.fillStyle = next() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.restore();
}

export function paintShade(ctx, W, H) {
  const r = Math.hypot(W, H) / 2;
  const grad = ctx.createRadialGradient(W / 2, H / 2, r * 0.42, W / 2, H / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// Bold outlined title + script subtitle, over a dark scrim band so the
// lettering stays readable over any photo. The title can sit bottom
// left, bottom right or top left.
export function paintCaption(ctx, W, H, state) {
  const g = GRADES[state.grade] || GRADES.dusk;
  const pad = Math.round(W * 0.045);
  const base = Math.round(Math.min(W, H) * 0.108 * (state.titleSize || 1));
  const subSize = Math.round(base * 0.44);
  const bandH = base + subSize + pad * 1.7;
  const spot = state.titleSpot || 'bottom-left';
  const top = spot === 'top-left';
  const right = spot === 'bottom-right';
  const bandY = top ? 0 : H - bandH;

  const scrim = ctx.createLinearGradient(0, top ? 0 : bandY - pad, 0, top ? bandH + pad : H);
  if (top) {
    scrim.addColorStop(0, 'rgba(8,6,18,0.88)');
    scrim.addColorStop(0.65, 'rgba(8,6,18,0.72)');
    scrim.addColorStop(1, 'rgba(8,6,18,0)');
  } else {
    scrim.addColorStop(0, 'rgba(8,6,18,0)');
    scrim.addColorStop(0.35, 'rgba(8,6,18,0.72)');
    scrim.addColorStop(1, 'rgba(8,6,18,0.88)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, top ? 0 : bandY - pad, W, bandH + pad);

  // Thin neon rule above the title (below it when the title is on top).
  const rule = ctx.createLinearGradient(pad, 0, pad + W * 0.42, 0);
  rule.addColorStop(0, g.stops[0]);
  rule.addColorStop(1, g.stops[2]);
  ctx.fillStyle = rule;
  const ruleY = top ? bandY + bandH - pad * 0.35 : bandY + pad * 0.35;
  const ruleX = right ? W - pad - W * 0.42 : pad;
  ctx.fillRect(ruleX, ruleY, W * 0.42, Math.max(3, base * 0.045));

  const title = (state.title || 'VICE SUNSET').toUpperCase();
  let fit = base;
  ctx.font = `${fit}px Anton, 'Arial Black', sans-serif`;
  while (fit > base * 0.5 && ctx.measureText(title).width > W - pad * 2) {
    fit = Math.round(fit * 0.92);
    ctx.font = `${fit}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = right ? 'right' : 'left';
  const tx = right ? W - pad : pad;
  const titleY = top
    ? bandY + pad * 0.35 + fit
    : bandY + pad * 0.35 + fit * 1.05;
  ctx.font = `${fit}px Anton, 'Arial Black', sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,6,20,0.9)';
  ctx.lineWidth = Math.max(4, fit * 0.09);
  ctx.strokeText(title, tx, titleY);
  const tGrad = ctx.createLinearGradient(0, titleY - fit, 0, titleY);
  tGrad.addColorStop(0, g.titleTop);
  tGrad.addColorStop(0.7, g.titleBottom);
  tGrad.addColorStop(1, g.stops[0]);
  ctx.fillStyle = tGrad;
  ctx.fillText(title, tx, titleY);

  ctx.font = `${subSize}px Lobster, cursive`;
  ctx.fillStyle = g.sub;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = Math.max(4, subSize * 0.18);
  const subY = top ? titleY + subSize * 1.2 : titleY + subSize * 1.25;
  ctx.fillText(state.subtitle || '', right ? W - pad - 2 : pad + 2, subY);
  ctx.shadowBlur = 0;
}

// Clamp a state object into its valid ranges: title size, crop zoom and
// pan, and one crop + slot entry per panel of the current layout. The
// editor calls this whenever the layout changes, so a panel that no
// longer exists can never carry a stale crop.
export function sanitizeState(state) {
  state.titleSize = Math.max(0.6, Math.min(1.4, Number(state.titleSize) || 1));
  const count = LAYOUTS[state.layout]?.panels ?? 1;
  state.slots = state.slots || {};
  state.crops = state.crops || {};
  for (let i = 0; i < count; i++) {
    const crop = state.crops[i] || { zoom: 1.12, x: 0, y: 0 };
    crop.zoom = Math.max(1, Math.min(2.5, Number(crop.zoom) || 1));
    crop.x = Math.max(-0.6, Math.min(0.6, Number(crop.x) || 0));
    crop.y = Math.max(-0.6, Math.min(0.6, Number(crop.y) || 0));
    state.crops[i] = crop;
    if (state.slots[i] !== null && state.slots[i] !== undefined) {
      state.slots[i] = Math.max(0, Math.floor(state.slots[i]));
    }
  }
  return state;
}

// Full render: photos, grade, grain, vignette, lettering. `images` is
// an array of HTMLImageElements indexed by photo slot.
export function composeCover(ctx, state, W, H, images) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0a18';
  ctx.fillRect(0, 0, W, H);
  const rects = panelGeometry(state.layout, W, H);
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const slot = state.slots?.[i];
    const img = slot != null ? images[slot] : null;
    paintPhoto(ctx, img, rects[i], state.crops?.[i]);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.002);
    ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
    ctx.restore();
  }
  paintGrade(ctx, W, H, state.grade);
  if (state.vignette) paintShade(ctx, W, H);
  if (state.grain) paintSpeckle(ctx, W, H);
  paintCaption(ctx, W, H, state);
  return rects;
}

// Export helper: render at full size to an offscreen canvas and return it.
export function makeExportCanvas(state, W, H, images) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  composeCover(ctx, state, W, H, images);
  return canvas;
}
