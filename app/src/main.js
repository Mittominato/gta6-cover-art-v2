// Vice Sunset Cover Lab — editor wiring.
// Connects the controls in index.html to the cover engine in cover.js:
// photo loading (file input, drag-and-drop, samples), tray assignment,
// panel selection + drag-to-pan + zoom, layouts, grades, caption edits
// (including title position) and PNG export at 1080x1080 / 1080x1350 /
// 1920x1080.

import { GRADES, LAYOUTS, TITLE_SPOTS, freshState, sanitizeState, composeCover, makeExportCanvas } from './cover.js';

const $ = (id) => document.getElementById(id);
const state = freshState();
// Loaded photos: { name, img } in tray order.
const trayPhotos = [];
let panDrag = null; // active pan drag { x, y, crop }

const stage = $('stage');
const sctx = stage.getContext('2d');
const noticeEl = $('notice');

function setNotice(msg) {
  noticeEl.textContent = msg;
}

function sizeStage() {
  // Fixed internal resolution; CSS scales the canvas to the column.
  stage.width = 960;
  stage.height = state.layout === 'full' ? 540 : 600;
  redraw();
}

function redraw() {
  const images = trayPhotos.map((p) => p.img);
  composeCover(sctx, state, stage.width, stage.height, images);
  refreshPanelUI();
}

function refreshPanelUI() {
  document.querySelectorAll('.panel-pick').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === state.active);
  });
  const crop = state.crops[state.active] || { zoom: 1 };
  $('zoomRange').value = String(Math.round((crop.zoom - 1) * 100));
  $('zoomReadout').textContent = `${crop.zoom.toFixed(2)}x`;
}

// ---- Photo loading ---------------------------------------------------

function addPhotoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      trayPhotos.push({ name: file.name || 'photo', img });
      renderPhotoTray();
      setNotice(`Loaded ${file.name || 'photo'} — ${trayPhotos.length} photo(s) in the tray.`);
      resolve(true);
    };
    img.onerror = () => {
      setNotice(`Could not read ${file.name || 'that file'} — try a JPG or PNG.`);
      resolve(false);
    };
    img.src = url;
  });
}

async function loadSamplePhoto(path, name) {
  const res = await fetch(path);
  const blob = await res.blob();
  await addPhotoFile(new File([blob], name, { type: blob.type || 'image/jpeg' }));
}

function renderPhotoTray() {
  const tray = $('photoTray');
  if (!tray) return; // shot mode replaced the editor DOM
  tray.innerHTML = '';
  trayPhotos.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'tray-item';
    btn.type = 'button';
    btn.title = `Photo ${i + 1}: ${p.name} — click to assign to the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    btn.appendChild(thumb);
    const tag = document.createElement('span');
    tag.textContent = `#${i + 1}`;
    btn.appendChild(tag);
    btn.addEventListener('click', () => {
      state.slots[state.active] = i;
      setNotice(`Photo #${i + 1} assigned to panel ${state.active + 1}.`);
      redraw();
    });
    tray.appendChild(btn);
  });
  if (!trayPhotos.length) {
    tray.innerHTML = '<p class="hint">No photos yet — add your own or try a sample below.</p>';
  }
  redraw();
}

// ---- Layout / grade / caption controls -------------------------------

function buildControlRows() {
  const layoutBox = $('layoutRow');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = def.label;
    b.dataset.layout = key;
    b.addEventListener('click', () => {
      state.layout = key;
      sanitizeState(state);
      document.querySelectorAll('#layoutRow .chip').forEach((c) => c.classList.toggle('active', c === b));
      buildPanelPicker();
      sizeStage();
      setNotice(`Layout: ${def.label}.`);
    });
    if (key === state.layout) b.classList.add('active');
    layoutBox.appendChild(b);
  });

  const gradeBox = $('gradeRow');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip grade-chip';
    b.dataset.grade = key;
    b.style.setProperty('--g1', def.stops[0]);
    b.style.setProperty('--g2', def.stops[2]);
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('#gradeRow .chip').forEach((c) => c.classList.toggle('active', c === b));
      redraw();
      setNotice(`Grade: ${def.label}.`);
    });
    if (key === state.grade) b.classList.add('active');
    gradeBox.appendChild(b);
  });

  const spotSelect = $('titleSpotSelect');
  Object.entries(TITLE_SPOTS).forEach(([key, label]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    if (key === state.titleSpot) opt.selected = true;
    spotSelect.appendChild(opt);
  });
}

function buildPanelPicker() {
  const box = $('panelPicker');
  box.innerHTML = '';
  const count = LAYOUTS[state.layout].panels;
  if (state.active >= count) state.active = 0;
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip panel-pick';
    b.dataset.panel = String(i);
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.active = i;
      refreshPanelUI();
      setNotice(`Panel ${i + 1} selected — drag on the preview to pan, use the zoom slider.`);
    });
    box.appendChild(b);
  }
}

function bindEditorInputs() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('titleSizeRange').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value) / 100;
    redraw();
  });
  $('titleSpotSelect').addEventListener('change', (e) => {
    state.titleSpot = e.target.value;
    redraw();
    setNotice(`Title position: ${TITLE_SPOTS[state.titleSpot]}.`);
  });
  $('grainToggle').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
  $('vignetteToggle').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
  $('zoomRange').addEventListener('input', (e) => {
    const crop = state.crops[state.active];
    crop.zoom = 1 + Number(e.target.value) / 100;
    $('zoomReadout').textContent = `${crop.zoom.toFixed(2)}x`;
    redraw();
  });
  $('fillPanels').addEventListener('click', () => {
    const slot = state.slots[state.active];
    if (slot == null) { setNotice('Load a photo first, then Fill all panels.'); return; }
    const count = LAYOUTS[state.layout].panels;
    for (let i = 0; i < count; i++) state.slots[i] = slot;
    redraw();
    setNotice('All panels now use the selected panel\u2019s photo.');
  });
  $('resetPanel').addEventListener('click', () => {
    state.crops[state.active] = { zoom: 1.12, x: 0, y: 0 };
    refreshPanelUI();
    redraw();
  });

  $('photoInput').addEventListener('change', async (e) => {
    for (const f of e.target.files) await addPhotoFile(f);
    e.target.value = '';
  });
  document.querySelectorAll('[data-sample]').forEach((b) => {
    b.addEventListener('click', () => loadSamplePhoto(b.dataset.sample, b.dataset.name || 'sample.jpg'));
  });

  // Drag-and-drop onto the whole editor.
  const drop = $('dropArea');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.remove('dragging');
  }));
  drop.addEventListener('drop', async (e) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    for (const f of files) await addPhotoFile(f);
    if (!files.length) setNotice('Drop image files (JPG/PNG) to add them.');
  });

  // Pan: drag inside the preview to move the active panel's photo.
  stage.addEventListener('pointerdown', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    panDrag = { x, y, crop: { ...state.crops[state.active] } };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!panDrag) return;
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const crop = state.crops[state.active];
    // Keep the pan inside the photo so a panel never goes blank.
    crop.x = Math.max(-0.6, Math.min(0.6, panDrag.crop.x + (x - panDrag.x)));
    crop.y = Math.max(-0.6, Math.min(0.6, panDrag.crop.y + (y - panDrag.y)));
    redraw();
  });
  stage.addEventListener('pointerup', () => { panDrag = null; });
  stage.addEventListener('pointercancel', () => { panDrag = null; });

  // Export buttons.
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => exportCoverPng(b.dataset.export));
  });

  // Keyboard: 1-4 selects a panel, G cycles the grade.
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= LAYOUTS[state.layout].panels) {
      state.active = n - 1;
      refreshPanelUI();
      setNotice(`Panel ${n} selected — drag on the preview to pan, use the zoom slider.`);
    } else if (e.key === 'g' || e.key === 'G') {
      const keys = Object.keys(GRADES);
      const next = keys[(keys.indexOf(state.grade) + 1) % keys.length];
      state.grade = next;
      document.querySelectorAll('#gradeRow .chip').forEach((c) => c.classList.toggle('active', c.dataset.grade === next));
      redraw();
      setNotice(`Grade: ${GRADES[next].label}.`);
    }
  });
}

// ---- Export ----------------------------------------------------------

function exportCoverPng(size) {
  const [w, h] = size.split('x').map(Number);
  const images = trayPhotos.map((p) => p.img);
  const canvas = makeExportCanvas(state, w, h, images);
  canvas.toBlob((blob) => {
    if (!blob) { setNotice('Export failed — the canvas could not produce a PNG.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-sunset-cover-${w}x${h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setNotice(`Exported ${w} x ${h} PNG (${Math.round(blob.size / 1024)} KB).`);
  }, 'image/png');
}

// ---- Demo / shot mode ------------------------------------------------
// ?demo=1 autoloads the sample photos so the editor is never empty.
// ?shot=cover&size=WxH renders the cover full-viewport (see shots.js).

async function bootEditor() {
  const params = new URLSearchParams(location.search);
  // In ?shot=cover mode shots.js owns the page and draws the cover
  // full-viewport; the editor must stay out of its way.
  if (params.get('shot') === 'cover') return;
  buildControlRows();
  buildPanelPicker();
  bindEditorInputs();
  if (params.get('demo') === '1') {
    await loadSamplePhoto('samples/boulevard.jpg', 'boulevard.jpg');
    await loadSamplePhoto('samples/pier.jpg', 'pier.jpg');
  }
  sizeStage();
  renderPhotoTray();
  if (!trayPhotos.length) setNotice('Add a photo to begin — or try a sample.');
  else setNotice('Sample photos loaded. Pick a layout, grade and caption, then export.');
}

bootEditor();
