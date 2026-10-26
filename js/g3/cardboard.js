// Cardboard camp cards (Crockpot / Grok Bot, 25 Oct 2026; Dave approved 10:21 PM CT wiring them into the live camp).
// Built from the approved mockups in docs/team/mockups/cards/bodycard/ (STRENGTH rev 4, TALENTS rev 10, HEART rev 3), but driven ONLY by the
// live hero and the CURRENT data.js / engine rules. These cards never change state themselves: every tap that buys something calls the
// callback the camp inspector hands in, which runs the game's existing purchase (HE.upgradeDie / HE.unlockDie / the talent face editor).
// No PROPOSED numbers: body costs are MIND_STEPS / STRENGTH_STEPS / SPEED_STEPS, talent faces cost talentFaceCost, Talent Two unlocks at
// UNLOCK_COST.SE, the act caps come from dieCapForAct. The Heart has no rank mechanic in the live game yet, so its card shows Level 1 (the
// base boosts) and unavailable covers. T23 enables purchases only in its isolated candidate, through HE.upgradeHeart.
import { h } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import { drawSym, drawIcon, drawNumeral } from '../gfx/dice/faces.js';
import { dieSpecs, faceImage } from '../gfx/dice/dice.js';
import { campDie } from './campart.js';
import { priceChip } from './price.js';
const ART = new URL('../../assets/cards/', import.meta.url).href;
const SERIF = '"Cormorant Garamond", Georgia, serif'; // the game's title serif (css/fonts.css); the mockups used Cinzel, which the game does not load
const load = (s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
const FIELD = { x: 86, y: 84, w: 548, h: 884 }; // frame pixels (720 x 1052)
const INSETS = [[63, 60], [655.5, 60], [61.5, 981], [657, 981]]; // the corner circles' fitted centres (mockup rev 10)
const EMB = [['atk', '#ff3b3b'], ['def', '#3aa4ff'], ['magic', '#a64dff'], ['heal', '#38e87a']];
const COL = { atk: '#ff3b3b', block: '#3aa4ff', def: '#3aa4ff', magic: '#a64dff', gold: '#ffd21a', heal: '#38e87a', pierce: '#ff8a1a' };
const KIND = (s) => (s === 'block' ? 'def' : s);
const cv = (px, f) => { const c = document.createElement('canvas'); c.width = c.height = px; f(c.getContext('2d'), px); return c.toDataURL(); };

// ---------------------------------------------------------------- the frame: kraft field set into the T17 frame, title plaque, stamped corners
function emblems(g) {
  const size = 34, n = 68;
  INSETS.forEach(([x, y], i) => { const [kind, tint] = EMB[i];
    const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d', { willReadFrequently: true });
    qg.fillStyle = '#000'; drawSym(qg, kind, n / 2, n / 2, size, 0, true); const d = qg.getImageData(0, 0, n, n).data;
    let x0 = n, x1 = -1, y0 = n, y1 = -1; for (let j = 0; j < n * n; j++) if (d[j * 4 + 3] > 0) { const px = j % n, py = (j / n) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const ox = x - (x0 + x1 + 1) / 2 + n / 2, oy = y - (y0 + y1 + 1) / 2 + n / 2; // centred by the icon's painted box
    const ink = (fill, dx, dy) => { g.fillStyle = fill; drawSym(g, kind, ox + dx, oy + dy, size, 0, true); };
    g.save(); ink('#000000b0', 1.2, 1.2); ink('#e8e2d0a0', -1.2, -1.2);
    qg.clearRect(0, 0, n, n); const m = qg.createLinearGradient(n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    qg.fillStyle = m; drawSym(qg, kind, n / 2, n / 2, size, 0, true); qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.14; qg.fillStyle = tint; qg.fillRect(0, 0, n, n);
    g.drawImage(q, ox - n / 2, oy - n / 2); g.restore(); });
}
const frames = new Map();
function frameArt(title) {
  if (frames.has(title)) return frames.get(title);
  const p = (async () => {
    await document.fonts.load(`600 40px ${SERIF}`).catch(() => {});
    const f = await load(`${ART}frame-t17.webp`); const W = 720, H = 1052; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(f, 0, 0); const { x, y, w, h: hh } = FIELD; const path = () => { g.beginPath(); g.roundRect(x, y, w, hh, 14); };
    g.save(); path(); g.clip();
    const k = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.45, 620); k.addColorStop(0, '#dcc394'); k.addColorStop(0.7, '#c6a574'); k.addColorStop(1, '#a8845a'); g.fillStyle = k; g.fillRect(x, y, w, hh);
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); // seeded grain: the same card every time
    for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? '#5a3a1a14' : '#fff4dc18'; g.fillRect(x + rnd() * w, y + rnd() * hh, 2, 2); }
    const sh = g.createLinearGradient(0, y, 0, y + 30); sh.addColorStop(0, '#2a160699'); sh.addColorStop(1, '#2a160600'); g.fillStyle = sh; g.fillRect(x, y, w, 30); g.restore();
    g.lineWidth = 4; g.strokeStyle = '#4a2e14'; path(); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#e8c88a66'; g.beginPath(); g.roundRect(x - 3, y - 3, w + 6, hh + 6, 17); g.stroke();
    const top = document.createElement('canvas'); top.width = W; top.height = H; const tg = top.getContext('2d');
    const cut = 236; const tmp = document.createElement('canvas'); tmp.width = tmp.height = cut; const t = tmp.getContext('2d', { willReadFrequently: true });
    for (const [cx, cy] of [[0, 0], [W - cut, 0], [0, H - cut], [W - cut, H - cut]]) {
      t.clearRect(0, 0, cut, cut); t.drawImage(f, cx, cy, cut, cut, 0, 0, cut, cut); const d = t.getImageData(0, 0, cut, cut); const px = d.data;
      for (let i = 0; i < px.length; i += 4) { const L = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; px[i + 3] *= Math.max(0, Math.min(1, (L - 62) / 40)) * Math.max(0, Math.min(1, (60 - (px[i] - px[i + 2])) / 25)); }
      t.putImageData(d, 0, 0); for (const q of [g, tg]) { q.save(); q.shadowColor = '#000c'; q.shadowBlur = 6; q.shadowOffsetY = 3; q.drawImage(tmp, cx, cy); q.restore(); }
    }
    const py = y + 22; g.save(); g.shadowColor = '#0009'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.drawImage(f, 74, 386, 572, 60, 160, py, 400, 54); g.restore();
    const col = g.getImageData(W / 2 - 60, py, 1, 54).data; let t0 = -1, t1 = -1;
    for (let i = 0; i < 54; i++) { const L = 0.3 * col[i * 4] + 0.59 * col[i * 4 + 1] + 0.11 * col[i * 4 + 2]; if (L < 60) { if (t0 < 0) t0 = i; t1 = i; } }
    const mid = t0 < 0 ? py + 27 : py + (t0 + t1 + 1) / 2;
    g.font = `700 38px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; const m = g.measureText(title);
    const tx = W / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2; const base = mid + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2; // ink box centred on the plaque
    g.fillStyle = '#1a0e06'; g.fillText(title, tx, base + 2); g.fillStyle = '#f0d49a'; g.fillText(title, tx, base);
    emblems(g);
    return { card: c.toDataURL('image/jpeg', 0.9), corners: top.toDataURL() };
  })();
  frames.set(title, p); p.catch(() => frames.delete(title)); return p;
}
function shell(title, cls, label, kids) {
  const fr = h('img', { class: 'cb-fr', alt: '' }), cn = h('img', { class: 'cb-fr cb-cn', alt: '' });
  frameArt(title).then((u) => { fr.src = u.card; cn.src = u.corners; }).catch(() => { fr.src = `${ART}frame-t17.webp`; });
  return h('article', { class: `cb-card ${cls}`, 'aria-label': label }, fr, h('div', { class: 'cb-panel' }, ...kids), cn);
}
const coin = () => h('i', { class: 'cb-coin', 'aria-hidden': 'true' });
const price = (n, poor = false) => priceChip(n, { poor, cls: 'cb-cp' }); // the one shared price chip (price.js)
const seal = (act) => h('span', { class: 'cb-seal', 'aria-hidden': 'true' }, h('i', {}, 'ACT'), h('b', {}, D.ROMAN[act] || String(act)));
const press = (fn) => ({ role: 'button', tabindex: '0', onclick: (e) => { e.stopPropagation(); fn(); }, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } } });

// ---------------------------------------------------------------- STRENGTH: Head, Left Hand, Right Hand, Feet on one card
const BODY = [{ k: 'N', name: 'Head', icon: 'helmet', kind: 'mind' }, { k: 'W', name: 'Left Hand', icon: 'gauntlet', kind: 'strength' },
  { k: 'E', name: 'Right Hand', icon: 'gauntlet', kind: 'strength', flip: true }, { k: 'S', name: 'Feet', icon: 'boots', kind: 'speed' }];
const SIZES = [4, 6, 8, 10];
const iconArt = new Map();
const bodyIcon = (name, flip) => { const key = `${name}${flip}`; if (!iconArt.has(key)) iconArt.set(key, cv(160, (g) => { const gr = g.createLinearGradient(0, 10, 0, 150); gr.addColorStop(0, '#8a5a2a'); gr.addColorStop(1, '#4a2c12'); g.fillStyle = gr; g.shadowColor = '#fff6'; g.shadowOffsetY = 2; drawIcon(g, name, 80, 80, 132, { flip }); })); return iconArt.get(key); };
const bodySize = (hero, c) => (c.kind === 'mind' ? E.mindSize(hero) : c.kind === 'speed' ? E.feetSize(hero) : hero.strength[c.k]);
const bodySteps = (c) => (c.kind === 'mind' ? D.MIND_STEPS : c.kind === 'speed' ? D.SPEED_STEPS : D.STRENGTH_STEPS);
const bodyUp = (hero, c) => (c.kind === 'mind' ? E.mindUpgrade(hero) : c.kind === 'speed' ? E.speedUpgrade(hero) : E.strengthUpgrade(hero, c.k));
// onGrow(slot): the inspector's existing purchase for that die (HE.upgradeDie). focus: the die the player tapped on the grid.
export function strengthCard(hero, focus, { onGrow, say } = {}) {
  const act = hero.campaign?.act || 1; const cap = D.dieCapForAct(act);
  const head = BODY.map((c) => h('div', { class: `cb-ic ${c.k === focus ? 'on' : ''}` }, h('img', { src: bodyIcon(c.icon, c.flip), alt: c.name })));
  const cells = [];
  for (const z of SIZES) for (const c of BODY) {
    const cur = bodySize(hero, c); const max = c.kind === 'speed' ? E.maxFeetOf(hero) : 10; const steps = bodySteps(c);
    const cls = `cb-cell ${c.k === focus ? 'on' : ''}`;
    if (z > max) { cells.push(h('div', { class: `${cls} cap`, 'aria-label': `${c.name} d${z}: not available` }, h('i', { class: 'cb-x' }))); continue; }
    if (z <= cur) { cells.push(h('div', { class: cls, 'aria-label': `${c.name} d${z}${z === cur ? ', current size' : ''}` }, campDie(hero, c.k, z))); continue; }
    const from = D.PREV_SIZE?.[z] ?? SIZES[SIZES.indexOf(z) - 1]; const cost = steps[from]?.[0];
    const isNext = from === cur; const up = isNext ? bodyUp(hero, c) : null;
    const actLock = c.kind !== 'speed' && z > cap ? Math.ceil((z - 4) / 2) : 0; // the same rule as engine actGate (feet have no act gate today)
    const ready = isNext && up?.ok;
    const tapCover = () => { if (ready) onGrow?.(c.k); else if (!isNext) say?.(`Grow ${c.name} to d${D.NEXT_SIZE[cur]} first`); else if (actLock) say?.(`${c.name} grows again in Act ${D.ROMAN[actLock]}`); else say?.(`Need ${cost - hero.gold} more gold`); };
    cells.push(h('div', { class: cls }, h('div', { class: `cb-cov ${ready ? 'ready' : ''}`, 'data-slot': c.k, 'aria-label': `${c.name}: grow to d${z} for ${cost} gold${actLock ? `, needs Act ${D.ROMAN[actLock]}` : ''}`, ...press(tapCover) },
      price(cost, hero.gold < cost), actLock ? seal(actLock) : null)));
  }
  return shell('STRENGTH', 'cb-strength', `Strength dice card: ${BODY.map((c) => `${c.name} d${bodySize(hero, c)}`).join(', ')}`, [h('div', { class: 'cb-sgrid' }, ...head, ...cells)]);
}

// ---------------------------------------------------------------- TALENTS: Talent One and Talent Two side by side
const EM = { core: '#237f86', mid: '#14565c', edge: '#082a30', trim: '#cfeeee' };
const FOUR_FONT = '"Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif';
function x2Ink(g, cx, cy, inR) { // the game's own X2 face ink (faces.js buildAtlas, 'SURGE', clean style), mockup rev 8
  g.save(); g.translate(cx, cy);
  const th2 = inR * 0.78, ny2 = -inR * 0.12, xx = -inR * 0.18, kx = inR * 0.32, ky = inR * 0.16; const nyx = ny2 + th2 * 0.3875 - ky - th2 * 0.07;
  const times = (c, w) => { c.lineCap = 'butt'; c.lineWidth = w; c.beginPath(); c.moveTo(kx - ky, nyx - ky); c.lineTo(kx + ky, nyx + ky); c.moveTo(kx + ky, nyx - ky); c.lineTo(kx - ky, nyx + ky); c.stroke(); };
  const wgt = th2 * 0.2, k = inR / 82.5;
  const word = (c, w) => { c.font = `900 ${Math.round(inR * 0.3)}px ${FOUR_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; const y = ny2 + th2 * 0.5 + inR * 0.26; const fit = Math.min(1, (inR * 1.5) / c.measureText('STRENGTH').width); c.save(); c.translate(0, y); c.scale(fit, 1); if (w) { c.lineJoin = 'round'; c.lineWidth = w / fit; c.strokeText('STRENGTH', 0, 0); } c.fillText('STRENGTH', 0, 0); c.restore(); };
  for (const [col, grow, w2, ww] of [['#05060a', 4 * k, wgt + 4 * k, 5 * k], ['#ffffff', 0, wgt, 0]]) { g.fillStyle = col; g.strokeStyle = col; drawNumeral(g, '2', xx, ny2, th2, { grow, cap: 'round' }); times(g, w2); word(g, ww); }
  g.restore();
}
const triMemo = new Map();
const triFace = (kind) => { if (!triMemo.has(kind)) triMemo.set(kind, cv(160, (g) => {
  g.beginPath(); const P = [[80, 10], [152, 140], [8, 140]]; for (let i = 0; i < 3; i++) { const a = P[i], b = P[(i + 1) % 3], c = P[(i + 2) % 3]; if (i === 0) g.moveTo(a[0] + (b[0] - a[0]) * 0.1, a[1] + (b[1] - a[1]) * 0.1); g.arcTo(b[0], b[1], c[0], c[1], 14); } g.closePath();
  const gr = g.createRadialGradient(70, 80, 10, 80, 100, 110); gr.addColorStop(0, EM.core); gr.addColorStop(0.6, EM.mid); gr.addColorStop(1, EM.edge);
  g.save(); g.shadowColor = '#2a160677'; g.shadowBlur = 6; g.shadowOffsetY = 4; g.fillStyle = gr; g.fill(); g.restore(); g.lineWidth = 4; g.strokeStyle = `${EM.trim}99`; g.stroke();
  if (kind === 'x2') x2Ink(g, 80, 97.6, 42.4); })); return triMemo.get(kind); };
const chitMemo = new Map();
const chit = (sym) => { if (!chitMemo.has(sym)) chitMemo.set(sym, cv(160, (g, s) => {
  const r = s * 0.44, c = s / 2, t = s * 0.028;
  g.save(); g.shadowColor = '#1e100666'; g.shadowBlur = s * 0.025; g.shadowOffsetY = s * 0.012; g.beginPath(); g.arc(c, c + t / 2, r, 0, 7); g.fillStyle = '#6e4c24'; g.fill(); g.restore();
  const eg = g.createLinearGradient(0, c, 0, c + r + t); eg.addColorStop(0, '#9a7040'); eg.addColorStop(1, '#5a3c1a'); g.beginPath(); g.arc(c, c + t / 2, r, 0, 7); g.fillStyle = eg; g.fill();
  g.beginPath(); g.arc(c, c - t / 2, r, 0, 7); const gr = g.createRadialGradient(c * 0.8, c * 0.7, 2, c, c, r); gr.addColorStop(0, '#f1dcae'); gr.addColorStop(1, '#cfa96c'); g.fillStyle = gr; g.fill();
  g.lineWidth = s * 0.012; g.strokeStyle = '#6a4a2288'; g.beginPath(); g.arc(c, c - t / 2, r * 0.8, 0, 7); g.stroke();
  g.fillStyle = COL[sym]; g.strokeStyle = '#1a1208'; drawSym(g, KIND(sym), c, c - t / 2, s * 0.46, s * 0.025, true); })); return chitMemo.get(sym); };
const SHAPE = { 6: 'M5 5 H35 V35 H5 Z', 8: 'M20 1 L38 20 L20 39 L2 20 Z', 10: 'M20 1 L34.5 31.7 L20 39 L5.5 31.7 Z' };
const sizeTag = (z) => { const s = h('span', { class: `cb-sz z${z}` }); s.innerHTML = `${SHAPE[z] ? `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${SHAPE[z]}"/></svg>` : ''}<b>d${z}</b>`; return s; };
const TAL_NAME = { SW: 'TALENT ONE', SE: 'TALENT TWO' };
// handlers: onFace(slot, faceIndex) opens that face in the existing editor; onGrow(slot) = HE.upgradeDie(hero,'special',slot); onUnlock(slot) = HE.unlockDie.
export function talentsCard(hero, focus, { selected = null, onFace, onGrow, onUnlock, say } = {}) {
  const act = hero.campaign?.act || 1; const cap = D.dieCapForAct(act);
  const column = (slot) => {
    if (!E.isActive(hero, slot)) { const u = E.unlockInfo(hero, slot);
      return h('div', { class: 'cb-tcol' }, h('div', { class: 'cb-th' }, TAL_NAME[slot]),
        h('div', { class: `cb-cov cb-big ${u.ok ? 'ready' : ''}`, 'data-slot': slot, 'aria-label': `Unlock ${TAL_NAME[slot]} for ${u.cost} gold`, ...press(() => (u.ok ? onUnlock?.(slot) : say?.(`Need ${u.cost - hero.gold} more gold`))) }, price(u.cost, hero.gold < u.cost), h('small', {}, 'UNLOCK'))); }
    const size = hero.special[slot]; const info = E.talentInfo(hero, slot); const stored = hero.talent?.[slot] || [];
    const sym = (f) => (Array.isArray(stored[f]) ? stored[f][0] : stored[f]);
    const hole = (f) => { const n = info.nums[f]; const k = f < info.faces ? sym(f) : null; const sel = selected && selected[0] === slot && selected[1] === f;
      if (k) return h('span', { class: `cb-hole set ${sel ? 'sel' : ''}`, 'aria-label': `Face ${n}: ${D.TALENT_SYMS[k]?.name || k}, pays ${n}. Inspect`, ...press(() => onFace?.(slot, f)) }, h('img', { src: chit(k), alt: '' }));
      return h('span', { class: `cb-hole open ${sel ? 'sel' : ''}`, 'aria-label': `Face ${n}: empty, ${info.costs[f]} gold to set. Choose a symbol`, ...press(() => onFace?.(slot, f)) }, h('i', {}, String(n)), priceChip(info.costs[f], { poor: hero.gold < info.costs[f], cls: 'cb-fee' })); };
    const d4 = h('div', { class: 'cb-tr d4' }, sizeTag(4), h('div', { class: 'cb-pf' }, h('img', { src: triFace('blank'), alt: 'Face 1: blank' }), h('img', { src: triFace('x2'), alt: 'Face 2: doubles this hand' }), h('img', { src: triFace('blank'), alt: 'Face 3: blank' }), hole(0)));
    const rows = [6, 8, 10].map((z) => {
      const idx = { 6: [1, 2], 8: [3, 4], 10: [5, 6] }[z]; let cover = null;
      if (z > size) { const from = { 6: 4, 8: 6, 10: 8 }[z]; const cost = D.SPECIAL_STEPS[from]?.[0]; const isNext = from === size; const up = isNext ? E.specialUpgrade(hero, slot) : null;
        const actLock = z > cap ? Math.ceil((z - 4) / 2) : 0; const ready = isNext && up?.ok;
        cover = h('div', { class: `cb-cov ${ready ? 'ready' : ''}`, 'data-slot': slot, 'aria-label': `Grow ${TAL_NAME[slot]} to d${z} for ${cost} gold${actLock ? `, needs Act ${D.ROMAN[actLock]}` : ''}`,
          ...press(() => (ready ? onGrow?.(slot) : say?.(!isNext ? `Grow to d${D.NEXT_SIZE[size]} first` : actLock ? `Grows again in Act ${D.ROMAN[actLock]}` : `Need ${cost - hero.gold} more gold`))) }, price(cost, hero.gold < cost), actLock ? seal(actLock) : null); }
      return h('div', { class: 'cb-tr' }, sizeTag(z), h('div', { class: 'cb-sl' }, ...idx.map((f) => (z <= size ? hole(f) : h('span', { class: 'cb-hole' })))), cover); });
    return h('div', { class: `cb-tcol ${slot === focus ? 'on' : ''}` }, h('div', { class: 'cb-th' }, TAL_NAME[slot]), d4, ...rows);
  };
  return shell('TALENTS', 'cb-talents', 'Talent dice card', [h('div', { class: 'cb-tcols' }, column('SW'), column('SE'))]);
}

// ---------------------------------------------------------------- HEART: what each face lifts, and its level
function miniGrid(lit) { return cv(120, (g) => { g.fillStyle = '#3a2410'; g.beginPath(); g.roundRect(2, 2, 116, 116, 14); g.fill();
  D.SLOTS.forEach((s, i) => { const x = 10 + (i % 3) * 35, y = 10 + ((i / 3) | 0) * 35; g.beginPath(); g.roundRect(x, y, 30, 30, 6); g.fillStyle = lit[s] || (s === 'C' ? '#7a3040' : '#6a5038'); g.fill(); if (lit[s]) { g.lineWidth = 2.5; g.strokeStyle = '#1a0e06'; g.stroke(); } }); }); }
let GRIDS = null;
export function heartCard(hero, { onGrow, say } = {}) {
  GRIDS ||= { str: miniGrid({ N: '#f6efe0', W: '#f6efe0', E: '#f6efe0', S: '#f6efe0' }), wpn: miniGrid({ NW: '#e8343c', NE: '#2f8ef0' }) };
  const spec = dieSpecs(hero).C; const fi = (i) => h('img', { class: 'cb-hface', src: faceImage(spec, i, 120), alt: `Heart face ${i}` });
  const rank = E.heartRankOf(hero); const up = E.heartUpgrade(hero);
  const level = (n, body) => h('div', { class: 'cb-slot' }, h('div', { class: 'cb-lv' }, h('span', { class: 'cb-lt' }, `LEVEL ${n}${D.EXPERIMENT.heartUpgrades && n === rank ? " NOW" : ""}`), body));
  const later = (n, act) => h('div', { class: 'cb-slot' }, h('div', { class: 'cb-cov cb-soon', 'aria-label': `Level ${n}: not in the game yet. Needs Act ${D.ROMAN[act]}` }, h('b', {}, `LEVEL ${n}`), h('small', {}, 'Not in the game yet'), seal(act)));
  return shell('HEART', 'cb-heart', 'Heart die card', [
    h('div', { class: 'cb-key' }, h('div', { class: 'cb-fs' }, fi(1), fi(2), fi(3), fi(4)), h('div', { class: 'cb-map' }, h('img', { src: GRIDS.str, alt: 'dice grid: head, hands and feet' }), h('span', {}, 'Upgrades', h('br'), 'STRENGTH dice'))),
    h('div', { class: 'cb-key' }, h('div', { class: 'cb-fs' }, fi(5), fi(6)), h('div', { class: 'cb-map' }, h('img', { src: GRIDS.wpn, alt: 'dice grid: the two weapon dice' }), h('span', {}, 'Upgrades', h('br'), 'WEAPON dice'))),
    h('div', { class: 'cb-lvls' }, ...[1, 2, 3].map((n) => {
      const step = D.HEART_RANKS[n];
      const body = h('p', {}, h('span', {}, D.EXPERIMENT.heartUpgrades ? 'Each match ' : 'STRENGTH dice ', h('b', {}, `+${step.amp}`)), h('span', {}, D.EXPERIMENT.heartUpgrades ? 'Each lane ' : 'WEAPON dice ', h('b', {}, `+${step.lane}`)));
      if (n <= rank) return level(n, body);
      if (!D.EXPERIMENT.heartUpgrades) return later(n, step.act);
      const locked = (hero.campaign?.act || 1) < step.act; const ready = n === up.next && up.ok;
      const why = locked ? `Requires Act ${D.ROMAN[step.act]}` : n !== up.next ? `Buy Level ${n - 1} first` : `Need ${Math.max(0, step.cost - hero.gold)} more gold`;
      return h('div', { class: 'cb-slot' }, h('div', { class: `cb-cov ${ready ? 'ready' : ''}`, 'data-heart-rank': n,
        'aria-label': `Level ${n}: +${step.amp} each matching strength die, +${step.lane} each matching weapon lane. ${step.cost} gold. ${ready ? 'Buy upgrade' : why}`,
        ...press(() => ready ? onGrow?.(n) : say?.(why)) }, price(step.cost, hero.gold < step.cost), h('small', {}, `LEVEL ${n}: +${step.amp} / +${step.lane}`), locked ? seal(step.act) : null));
    })),
  ]);
}

// ---------------------------------------------------------------- WEAPON (Dave 11:23 PM CT): the approved T17 weapon card, rev 15 sized layout
// (docs/team/mockups/cards/t17/card17.*, T17.md rev 14/15): the painted weapon on top, the metal frame and title, one row per size d4..d10 with a
// painted dice cover over every size above the weapon's die, a sell chip beside the highest uncovered size, no wear. Drawn by the game's own
// card code (js/g3/cards.js, which only READS). Owned rows split the current die's actual faces.
// A purchase re-renders every row because the released face tables are not cumulative. Only the camp inspector supplies purchase callbacks.
// The sell chip shows engine sellValue; an equipped weapon is sold from the pack (sellItem).
import * as CW from './cards.js';
export function weaponCard(hero, slot, inst, { say, onBuy, onBought } = {}) {
  const size = E.weaponSize(inst); const SZ = [4, 6, 8, 10];
  if (inst.diamond || inst.id === 'fists' || !SZ.includes(size)) return CW.weaponCardOf(inst, { label: 'Sell', value: inst.diamond ? undefined : 0 });
  const d = CW.weaponData(inst, { label: 'Sell', value: 0 }); const faces = d.faces;
  // Dave's reference (T17 Bronze Dagger): each size row shows only the faces that size adds, drawn as that size's die. The data has no nested face
  // ladder, so the weapon's real face list is split in order: d4 faces 1-4, d6 5-6, d8 7-8, d10 9-10 (each row's die is built from faces[0..size)).
  const live = E.weaponTrainingOn() && !D.WEAPONS[inst.id]?.legendary;
  d.rows = SZ.map((s, i) => ({ size: s, from: SZ[i - 1] || 0,
    faces: s <= size ? faces.slice(0, s) : E.weaponFaces({ ...inst, size: s }), owned: s <= size,
    price: live ? D.WEAPON_TRAINING.prices[SZ[i - 1]] || 0 : 0 }));
  const soon = D.WEAPONS[inst.id]?.legendary ? 'This legendary has a fixed size' : 'Bigger weapon dice are not in the game yet';
  const card = CW.weaponCardEl(d, { onBuy: (step) => {
    if (!live) return soon;
    if (!onBuy) return 'Open this weapon from your camp dice grid to upgrade it';
    const t = E.trainInfo(hero, inst.uid);
    if (t.next !== step) return 'Open the weapon card again';
    if (!t.ok) return t.why === 'gold' ? `Need ${t.cost - hero.gold} more gold` : 'Not available';
    return onBuy(step);
  }, onBought });
  card.classList.add('cb-weapon'); card.setAttribute('aria-label', `${d.metal} ${d.name}, d${size}`);
  for (const r of card.querySelectorAll('.row')) { const s = +r.dataset.size;
    const cov = r.querySelector('.cov.tok'); if (cov) {
      cov.querySelector('.ct small').textContent = `d${SZ[SZ.indexOf(s) - 1]} → d${s}`;
      if (live) {
        const cost = D.WEAPON_TRAINING.prices[SZ[SZ.indexOf(s) - 1]];
        cov.querySelector('.cp').replaceChildren(priceChip(cost, { poor: hero.gold < cost }));
      } else {
        cov.setAttribute('aria-label', `Dice cover d${s}: ${soon}`);
        cov.querySelector('.cp').replaceChildren(h('small', { class: 'cb-ny' }, 'NOT YET'));
      }
    } }
  const value = E.sellValue(inst);
  const chip = h('button', { type: 'button', class: 'sl17 cb-off', 'aria-disabled': 'true', 'aria-label': `Worth ${value} gold when sold. Sell it from your pack`,
    onclick: (e) => { e.stopPropagation(); say?.(`Sells for ${value} gold from your pack. Swap it out first.`); } },
  h('small', {}, 'SELL'), priceChip(value));
  card.querySelector('.art17')?.append(chip); void slot; // The chip sits in the art window.
  return card;
}

// ---------------------------------------------------------------- the Camp Store, cardboard (Dave approved 26 Oct 2026: shop mockup v2, f05b1e7)
// Cardboard item cards on a wood table, each with a paper price tag whose coin is drawn in pencil. A card never buys by itself: its tag runs the
// onBuy the store hands in (the game's existing HE.* purchase). Prices and conditions are read by the caller from engine.js; nothing is typed here.
const icanvas = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 112; c.className = 'cst-ink'; const g = c.getContext('2d'); g.lineJoin = 'round'; draw(g); return c; };
export const storeIcon = (name, col) => icanvas((g) => { g.fillStyle = col; g.strokeStyle = '#1a1208'; drawIcon(g, name, 56, 56, 92, { stroke: 7 }); });
export const storeSym = (k) => icanvas((g) => { g.fillStyle = COL[k] || '#ffe08a'; g.strokeStyle = '#1a1208'; drawSym(g, KIND(k), 56, 56, 90, 6, true); });
export const storeText = (t, col = '#f4ead0', px = 64) => icanvas((g) => { g.font = `900 ${px}px Oxanium, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#1a1208'; g.fillStyle = col; g.strokeText(t, 56, 60); g.fillText(t, 56, 60); });
// the tag's coin: the mockup's yellow coin (docs/team/mockups/cards/shop.css .coin), drawn in CSS so it matches it exactly
export function priceTag(price, { poor = false, onBuy = null, aria = '', label = '' } = {}) {
  const t = h(onBuy ? 'button' : 'span', { class: `cst-tag ${poor ? 'poor' : ''}`, type: onBuy ? 'button' : null, 'aria-label': aria || `${price} gold`, disabled: onBuy && poor ? true : null, onclick: onBuy && !poor ? onBuy : null },
    label ? h('small', {}, label) : null, priceChip(price, { poor })); // the paper tag stays; its price is the shared chip (price.js)
  return t;
}
// one cardboard item card: art window, title, short lines, then a tag (or a sticker for a gate like "Needs Level 4", or a stamp like "Sold")
export function storeCard({ cls = '', art, title, lines = [], tag = null, sticker = '', stamp = '', ribbon = '', onOpen = null, aria = '' } = {}) {
  const body = h(onOpen ? 'button' : 'div', { class: 'cst-face', type: onOpen ? 'button' : null, onclick: onOpen, 'aria-label': onOpen ? aria || `See ${title}` : null },
    h('span', { class: 'cst-art' }, art), h('b', { class: 'cst-title' }, title), ...lines.filter(Boolean).map((l) => (typeof l === 'string' ? h('small', {}, l) : l)));
  return h('div', { class: `cst-card ${cls}` }, h('span', { class: 'cst-band' }), ribbon ? h('span', { class: 'cst-ribbon' }, ribbon) : null, body,
    sticker ? h('span', { class: 'cst-sticker' }, sticker) : null, stamp ? h('span', { class: 'cst-stamp' }, stamp) : null, tag);
}
