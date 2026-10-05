// Face art for the dice: a vector icon set, chunky carved numerals, and the atlas painter that
// turns a die's face list into four maps (albedo, normal, ORM, emissive) with canvas 2D.
//
// ORM channel packing (read by MeshPhysicalMaterial): R = "resin" mask (1 = translucent body, 0 = opaque
// inlay; used by the inner-glow shader), G = roughness, B = metalness.

import * as THREE from 'three';
import { mulberry32, hashStr } from '../noise.js';

// ------------------------------------------------------------------------------- icons
// All icons live in a 100x100 box, y down.
const SVG = {
  mend: 'M37 8 H63 V37 H92 V63 H63 V92 H37 V63 H8 V37 H37 Z',
  spark: 'M50 2 C54 34 66 46 98 50 C66 54 54 66 50 98 C46 66 34 54 2 50 C34 46 46 34 50 2 Z',
  surge: 'M62 2 L18 56 H44 L34 98 L84 38 H56 Z',
  pierce: 'M50 2 L90 50 L50 98 L10 50 Z',
  arrow: 'M50 3 L90 46 H64 V97 H36 V46 H10 Z',
  tri: 'M50 6 L96 90 H4 Z',
  disc: 'M50 4 A46 46 0 1 1 49.9 4 Z',
  coin: 'M50 4 A46 46 0 1 1 49.9 4 Z M50 20 A30 30 0 1 0 50.1 20 Z',
  shield: 'M50 4 L90 16 V50 C90 74 72 90 50 98 C28 90 10 74 10 50 V16 Z',
  sword: 'M50 0 L60 14 V68 H40 V14 Z M18 68 H82 V80 H18 Z M44 80 H56 V94 H44 Z M50 100 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0',
  dagger: 'M50 6 L59 22 V60 H41 V22 Z M26 60 H74 V70 H26 Z M44 70 H56 V90 H44 Z',
  longsword: 'M50 0 L58 10 V72 H42 V10 Z M14 72 H86 V83 H14 Z M44 83 H56 V96 H44 Z',
  spear: 'M50 0 L66 30 L54 26 V100 H46 V26 L34 30 Z M38 38 H62 V44 H38 Z',
  bow: 'M74 2 C14 18 14 82 74 98 L72 92 C28 76 28 24 72 8 Z M72 6 H76 V94 H72 Z M18 48 H92 V53 H18 Z M96 50 L82 40 V60 Z M18 44 L10 40 V60 L18 56 Z',
  staff: 'M47 36 H53 V100 H47 Z M50 4 A15 15 0 1 1 49.9 4 Z M30 30 C26 16 36 4 42 2 C32 12 34 24 42 30 Z M70 30 C74 16 64 4 58 2 C68 12 66 24 58 30 Z',
  bracer: 'M22 6 H78 L86 32 H14 Z M12 38 H88 L80 66 H20 Z M20 72 H80 L84 94 H16 Z',
  helmet: 'M14 56 C14 22 32 6 50 6 C68 6 86 22 86 56 V90 H66 V74 H34 V90 H14 Z M32 44 H68 V56 H32 Z',
  boots: 'M26 6 H58 V48 C58 56 64 60 78 64 C92 68 96 76 96 86 V94 H14 V72 C14 62 26 56 26 46 Z',
  heart: 'M50 94 C8 62 0 36 18 18 C32 4 48 12 50 28 C52 12 68 4 82 18 C100 36 92 62 50 94 Z',
  gauntlet: 'M20 48 H78 V92 H20 Z M20 48 V32 C20 24 34 24 34 32 V40 C34 24 48 20 48 32 V38 C48 24 62 22 62 34 V40 C62 28 78 28 78 40 V48 Z M78 60 C92 56 98 66 90 76 L78 78 Z',
  skull: 'M50 4 C24 4 12 22 12 42 C12 54 18 60 24 64 V82 H38 V74 H44 V82 H56 V74 H62 V82 H76 V64 C82 60 88 54 88 42 C88 22 76 4 50 4 Z',
  fist: 'M20 48 H78 V92 H20 Z M22 48 V34 C22 26 34 26 34 34 V42 C34 26 48 22 48 34 V40 C48 26 62 24 62 36 V42 C62 30 78 30 78 42 V50 Z',
};
const paths = new Map();
export function iconPath(name) {
  if (!paths.has(name)) paths.set(name, new Path2D(SVG[name] || SVG.spark));
  return paths.get(name);
}
export const hasIcon = (n) => !!SVG[n];
const evenodd = new Set(['helmet', 'coin']);
// Draw an icon centred at (x,y) with size px, using whatever fill/stroke the context already has.
export function drawIcon(ctx, name, x, y, size, { stroke = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); const s = size / 100; ctx.scale(s, s); ctx.translate(-50, -50);
  const p = iconPath(name);
  if (stroke) { ctx.lineWidth = stroke / s; ctx.lineJoin = 'round'; ctx.stroke(p); }
  ctx.fill(p, evenodd.has(name) ? 'evenodd' : 'nonzero');
  ctx.restore();
}
export function starPath(n, ro, ri) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2; const r = i % 2 ? ri : ro; const x = 50 + Math.cos(a) * r; const y = 50 + Math.sin(a) * r; if (i) p.lineTo(x, y); else p.moveTo(x, y); }
  p.closePath(); return p;
}
const burst = () => starPath(8, 48, 24);
export function drawPip(ctx, kind, x, y, size) {
  ctx.save(); ctx.translate(x, y); const s = size / 100; ctx.scale(s, s); ctx.translate(-50, -50);
  if (kind === 'stagger') ctx.fill(burst()); else ctx.fill(iconPath({ gold: 'coin', pierce: 'pierce', magic: 'spark', heal: 'mend' }[kind] || 'spark'), kind === 'gold' ? 'evenodd' : 'nonzero');
  ctx.restore();
}
export const PIP_COLOR = { gold: '#f6c445', pierce: '#b98cff', magic: '#ffe45a', heal: '#4fe69a', stagger: '#ff8a3a', atk: '#ff3b3b', def: '#3aa4ff', boost: '#ffffff' };
// The corner symbol language: one shape + one colour per meaning.
const SYM_ICON = { atk: 'burst', def: 'shield', pierce: 'arrow', magic: 'tri', gold: 'disc', heal: 'mend', stagger: 'fist', boost: 'mend' };
export function drawSym(ctx, kind, x, y, size, stroke = 0) {
  const ic = SYM_ICON[kind] || 'spark';
  if (ic === 'burst') {
    ctx.save(); ctx.translate(x, y); const k = size / 100; ctx.scale(k, k); ctx.translate(-50, -50);
    const p = starPath(8, 50, 26); if (stroke) { ctx.lineWidth = stroke / k; ctx.lineJoin = 'round'; ctx.stroke(p); } ctx.fill(p); ctx.restore();
  } else drawIcon(ctx, ic, x, y, size, { stroke });
}
// distance from point to the polygon's nearest edge (px)
function edgeGap(pts, x, y) {
  let m = 1e9;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length]; const dx = b[0] - a[0]; const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    m = Math.min(m, Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)));
  }
  return m;
}

// ------------------------------------------------------------------------------- numerals
// Skeletons in a 50 x 80 box (stroke centre-lines). Thick strokes make them read like chisel-cut capitals.
const DIGITS = {
  0: 'M25 9 C8 9 8 28 8 40 C8 52 8 71 25 71 C42 71 42 52 42 40 C42 28 42 9 25 9 Z',
  1: 'M12 26 L28 9 V71 M12 71 H44',
  2: 'M9 24 C9 5 41 5 41 24 C41 40 12 52 9 71 H43',
  3: 'M9 17 C14 5 41 6 41 23 C41 34 31 38 21 38 C33 38 43 44 43 55 C43 74 14 78 7 62',
  4: 'M34 71 V9 L8 52 H46',
  5: 'M40 9 H14 L11 36 C22 30 43 34 43 53 C43 74 13 77 7 62',
  6: 'M38 12 C20 14 8 30 8 50 C8 64 15 72 26 72 C37 72 43 63 43 53 C43 43 36 36 26 36 C18 36 10 41 8 50',
  7: 'M7 11 H43 L21 71',
  8: 'M25 9 C9 9 9 36 25 38 C41 36 41 9 25 9 Z M25 38 C6 40 6 72 25 72 C44 72 44 40 25 38 Z',
  9: 'M38 12 C20 14 8 30 8 50 C8 64 15 72 26 72 C37 72 43 63 43 53 C43 43 36 36 26 36 C18 36 10 41 8 50',
};
const dpaths = new Map();
function digitPath(d) { if (!dpaths.has(d)) dpaths.set(d, new Path2D(DIGITS[d === 9 ? 6 : d])); return dpaths.get(d); }
// Stroke the numeral `text` centred at (x, y) with total height `h` px. Caller sets stroke/fill style.
// `grow` adds extra stroke width (px) for outlines.
export function drawNumeral(ctx, text, x, y, h, { grow = 0, weight = 16, under = true } = {}) {
  const k = h / 80; const n = text.length;
  const wDigit = 50 * k * (n > 1 ? 0.8 : 1);
  const gap = n > 1 ? -2 * k : 0;
  const total = n * wDigit + (n - 1) * gap;
  ctx.save();
  ctx.lineJoin = 'miter'; ctx.miterLimit = 2.2; ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    const d = +text[i];
    const cx = x - total / 2 + i * (wDigit + gap) + wDigit / 2;
    ctx.save();
    ctx.translate(cx, y); ctx.scale(k * (n > 1 ? 0.8 : 1), k); ctx.translate(-25, -40);
    if (d === 9) { ctx.translate(25, 40); ctx.rotate(Math.PI); ctx.translate(-25, -40); }
    ctx.lineWidth = weight + grow / (k * (n > 1 ? 0.8 : 1));
    ctx.stroke(digitPath(d));
    ctx.restore();
  }
  if (under && (text === '6' || text === '9')) {
    ctx.lineWidth = (weight * 0.45 * k) + grow; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x - wDigit * 0.3, y + h * 0.5 + h * 0.13); ctx.lineTo(x + wDigit * 0.3, y + h * 0.5 + h * 0.13); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------- themes
const T = {
  bone: { name: 'bone', core: '#f4ecd8', mid: '#d6c9a6', edge: '#8c7a56', rough: 0.18, trim: ['#d8d2c0', '#8e8672', '#4a4436'], trimRough: 0.28, num: 'ink' },
  smoke: { name: 'smoke', core: '#4a4440', mid: '#2a2624', edge: '#0c0a0a', rough: 0.1, trim: ['#e9edf4', '#9aa4b4', '#4c5564'], trimRough: 0.22, num: 'bone' },
  heart: { name: 'heart', core: '#f4a822', mid: '#c4620a', edge: '#5e1e04', rough: 0.07, trim: ['#fff0b0', '#ffc94a', '#a8700f'], trimRough: 0.2, num: 'ink' },
  amethyst: { name: 'amethyst', core: '#7a3ee0', mid: '#4a1c9c', edge: '#170733', rough: 0.07, trim: ['#f0e8ff', '#b4a2e4', '#5a4a8e'], trimRough: 0.2, num: 'glow' },
  weapon: { name: 'weapon', rough: 0.08, trim: ['#ffe9a8', '#d9a83e', '#6e4a14'], trimRough: 0.2, num: 'metal' },
};
export const THEMES = T;
const WPN = {
  r: { core: '#e02a36', mid: '#8a0f1e', edge: '#150407', metal: ['#fffbe8', '#ffd96a', '#e0962a'], rim: '#3a0a10' },
  b: { core: '#2f8cf5', mid: '#124a9e', edge: '#040a18', metal: ['#ffffff', '#d4e8ff', '#8ab4e0'], rim: '#06142a' },
  rBlank: { core: '#b01a2c', mid: '#5a0c18', edge: '#0a0305' },
  bBlank: { core: '#2a6cc0', mid: '#123a70', edge: '#03070d' },
};

// ------------------------------------------------------------------------------- style presets
// A style re-skins every die for readability without touching the rules or geometry. `classic` is the original look.
//  bodyK/selfK  brighten the resin (albedo multiplier / self-light); light  scales the tray lights
//  swirl        strength of the dark marbling; pipDisc  backing disc behind resource symbols ('dark'|'light'|null)
//  ink          numerals on pale dice: dark ink with a pale groove; numW  numerals on weapon dice: white with dark outline
export const STYLES = {
  classic: { name: 'classic', bodyK: 1, selfK: 1, light: 1, swirl: 1, pipDisc: null, pipK: 1, numW: false, ink: false },
  clear: {
    name: 'clear', bodyK: 0.9, selfK: 1.7, light: 1.2, swirl: 0.3, pipDisc: 'dark', pipK: 1.35, corners: true, numW: true, ink: true, numScale: 1.12,
    wpn: {
      r: { core: '#ff3b3b', mid: '#e0151f', edge: '#6a0510', metal: ['#ffffff', '#ffffff', '#ffe8e8'], rim: '#3a0a10' },
      b: { core: '#3aa4ff', mid: '#1470f0', edge: '#06307a', metal: ['#ffffff', '#ffffff', '#e4f2ff'], rim: '#06142a' },
      rBlank: { core: '#8a1424', mid: '#4a0a14', edge: '#12040a' }, bBlank: { core: '#1c4c92', mid: '#10305e', edge: '#04101e' },
    },
    themes: {
      bone: { core: '#fffaf0', mid: '#f0e4c4', edge: '#b8a47a', trim: ['#f2eee0', '#b4ac98', '#6a6450'] },
      smoke: { core: '#8a94a8', mid: '#5c6678', edge: '#2a3040', num: 'bone' },
      heart: { core: '#f0609a', mid: '#c02866', edge: '#58082e' },
      amethyst: { core: '#c4ccd8', mid: '#7e8898', edge: '#303846', neutral: true, trim: ['#f2f4f8', '#a8b0be', '#505868'] },
    },
    pip: { gold: '#ffd21a', pierce: '#ff8a1a', magic: '#a64dff', heal: '#38e87a', stagger: '#e8eef8', atk: '#ff3b3b', def: '#3aa4ff' },
  },
  vivid: {
    name: 'vivid', bodyK: 0.8, selfK: 2.4, light: 0.9, swirl: 0.15, pipDisc: 'light', pipK: 1.35, corners: true, numW: true, ink: true, numScale: 1.18,
    wpn: {
      r: { core: '#ff2a2a', mid: '#ff1010', edge: '#a00008', metal: ['#ffffff', '#ffffff', '#fff0f0'], rim: '#3a0a10' },
      b: { core: '#2a8cff', mid: '#0a5cff', edge: '#0430a0', metal: ['#ffffff', '#ffffff', '#eef6ff'], rim: '#06142a' },
      rBlank: { core: '#7a1020', mid: '#400812', edge: '#10040a' }, bBlank: { core: '#18428a', mid: '#0e2a58', edge: '#04101e' },
    },
    themes: {
      bone: { core: '#ffffff', mid: '#f6eed8', edge: '#c8b88c', trim: ['#fff8e8', '#c8c0aa', '#7a7458'] },
      smoke: { core: '#a8b4ca', mid: '#7a889e', edge: '#3a4458', num: 'bone' },
      heart: { core: '#ff70a8', mid: '#d02c70', edge: '#640a34' },
      amethyst: { core: '#d4dae6', mid: '#8a95a8', edge: '#363e4e', neutral: true, trim: ['#f6f8fb', '#b4bccb', '#586070'] },
    },
    pip: { gold: '#ffd000', pierce: '#ff7a00', magic: '#9a38ff', heal: '#18f070', stagger: '#e8eef8', atk: '#ff2a2a', def: '#2a8cff' },
  },
};
// CLEAN: the readable set. No marbling or speckle, flat colours. Head, feet and hands are ivory/tan, weapon faces are bright red or blue,
// the heart's faces take the colour of what they boost (with a + beside the symbol), the talent dice are deep teal (a colour used nowhere else).
STYLES.clean = {
  ...STYLES.clear, name: 'clean', clean: true, bodyK: { bone: 0.86, smoke: 0.8, heart: 0.9, amethyst: 0.9, weapon: 0.9 }, selfK: 1.0, light: 1.0, swirl: 0, numScale: 1.12,
  wpn: {
    r: { core: '#ff4646', mid: '#e8282f', edge: '#a40f1c', metal: ['#fff', '#fff', '#fff'], rim: '#3a0a10' },
    b: { core: '#3d9cff', mid: '#1f66ee', edge: '#0c3aa8', metal: ['#fff', '#fff', '#fff'], rim: '#06142a' },
    rBlank: { core: '#8a2a34', mid: '#64202a', edge: '#2a0a10' }, bBlank: { core: '#1f4f8c', mid: '#173a68', edge: '#071526' },
  },
  themes: {
    bone: { core: '#f8f0dc', mid: '#efe3c2', edge: '#c9b88e', trim: ['#f4ecd6', '#c2b690', '#7c7054'], num: 'ink', rough: 0.35 },
    smoke: { core: '#ecd6a4', mid: '#dcc088', edge: '#b09560', trim: ['#f4e6c0', '#c0a672', '#7a6642'], num: 'ink', rough: 0.35 },
    heart: { core: '#ffffff', mid: '#dddddd', edge: '#888888', trim: ['#fff2d0', '#e8b84c', '#8a5a14'], num: 'metal', rough: 0.3 },
    amethyst: { core: '#237f86', mid: '#14565c', edge: '#082a30', neutral: true, trim: ['#cfeeee', '#6fb4b4', '#2c6264'], num: 'metal', rough: 0.4 },
  },
};
const HEART_FACE = { 1: '#f2b81c', 2: '#ff8a1a', 3: '#a64dff', 4: '#a64dff', 5: '#3aa4ff', 6: '#ff3b3b' };
const HEART_KIND = { 1: 'gold', 2: 'pierce', 3: 'magic', 4: 'magic', 5: 'def', 6: 'atk' };
let ST = STYLES.classic;
export const diceStyle = () => ST;
export function setDiceStyle(name) {
  ST = STYLES[name] || STYLES.classic;
  Object.assign(PIP_COLOR, ST.pip || CLASSIC_PIP);
  return ST;
}
const CLASSIC_PIP = { ...PIP_COLOR };

// ------------------------------------------------------------------------------- atlas
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cache = new Map();

function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }

function swirls(ctx, rnd, R, colors, n, alphaMax, width) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(rnd() * colors.length)];
    const a = rnd() * Math.PI * 2; const r0 = R * (0.2 + rnd() * 0.9);
    const x0 = Math.cos(a) * r0; const y0 = Math.sin(a) * r0;
    const b = a + (rnd() - 0.5) * 2.4; const r1 = R * (0.2 + rnd() * 0.9);
    const x1 = Math.cos(b) * r1; const y1 = Math.sin(b) * r1;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + (rnd() - 0.5) * R, y0 + (rnd() - 0.5) * R, x1 + (rnd() - 0.5) * R, y1 + (rnd() - 0.5) * R, x1, y1);
    for (const [k, al] of [[1, 0.25], [0.45, 0.6]]) {
      ctx.globalAlpha = alphaMax * al * (0.5 + rnd() * 0.5); ctx.strokeStyle = c; ctx.lineWidth = width * k * (0.4 + rnd());
      ctx.stroke();
    }
  }
  ctx.restore();
}
function speckle(ctx, rnd, R, color, n, size, alpha) {
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2; const r = Math.sqrt(rnd()) * R;
    ctx.globalAlpha = alpha * (0.3 + rnd() * 0.7); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, size * (0.3 + rnd()), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function cracks(ctxs, rnd, R, n, w) {
  for (const [k, ctx] of Object.entries(ctxs)) {
    if (k === 'E') continue;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = k === 'A' ? 'rgba(0,0,0,0.85)' : k === 'H' ? 'rgb(10,10,10)' : 'rgb(255,230,0)';
    const r2 = mulberry32(1234);
    for (let i = 0; i < n; i++) {
      let a = r2() * Math.PI * 2; let x = Math.cos(a) * R * (0.7 + r2() * 0.4); let y = Math.sin(a) * R * (0.7 + r2() * 0.4);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = w * (0.6 + r2() * 0.8);
      const steps = 4 + Math.floor(r2() * 4);
      for (let s = 0; s < steps; s++) { a += (r2() - 0.5) * 1.2; const d = R * (0.16 + r2() * 0.2); x -= Math.cos(a) * d * Math.sign(x || 1) * 0.8; y -= Math.sin(a) * d * Math.sign(y || 1) * 0.8; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// paint one shape on all maps with per-map styles ({A,H,O,E}); `fn(ctx)` issues the fill/stroke calls.
function layer(ctxs, styles, fn) {
  for (const k of ['A', 'H', 'O', 'E']) {
    const st = styles[k]; if (st == null) continue;
    const c = ctxs[k]; c.save(); c.fillStyle = st; c.strokeStyle = st; fn(c, k); c.restore();
  }
}

function normalFromHeight(hc, strength, blur) {
  const W = hc.width; const Hh = hc.height;
  const id = hc.getContext('2d').getImageData(0, 0, W, Hh); const px = id.data;
  let h = new Float32Array(W * Hh); for (let i = 0; i < h.length; i++) h[i] = px[i * 4] / 255;
  // two separable box-blur passes ~ gaussian
  const tmp = new Float32Array(h.length);
  for (let pass = 0; pass < 2; pass++) {
    const r = blur;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { let s = 0; for (let k = -r; k <= r; k++) s += h[y * W + Math.min(W - 1, Math.max(0, x + k))]; tmp[y * W + x] = s / (2 * r + 1); }
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { let s = 0; for (let k = -r; k <= r; k++) s += tmp[Math.min(Hh - 1, Math.max(0, y + k)) * W + x]; h[y * W + x] = s / (2 * r + 1); }
  }
  const out = new ImageData(W, Hh); const o = out.data;
  const at = (x, y) => h[Math.min(Hh - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * strength; let ny = dy * strength; const nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l;
    const i = (y * W + x) * 4; o[i] = (nx * 0.5 + 0.5) * 255; o[i + 1] = (ny * 0.5 + 0.5) * 255; o[i + 2] = (nz / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  const nc = mk(W, Hh); nc.getContext('2d').putImageData(out, 0, 0); return nc;
}

function tex(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}

const NUM_K = { 4: 1.42, 6: 1.34, 8: 1.45, 10: 1.6 };

/**
 * Paint the atlas for a die.
 * @param poly   makePoly(sides)
 * @param faces  array indexed by GEOMETRIC face: { text, tone:'r'|'b'|'', blank, pip, sym, badge, mark:'atk'|'block', wm: icon name }
 * @param theme  'bone'|'smoke'|'heart'|'amethyst'|'weapon'
 */
export function buildAtlas({ poly, faces, theme, quality = 'high', key = '' }) {
  const ck = `${ST.name}|${poly.sides}|${theme}|${quality}|${JSON.stringify(faces)}`;
  if (cache.has(ck)) return cache.get(ck);
  const th = ST.themes?.[theme] ? { ...T[theme], ...ST.themes[theme] } : T[theme];
  const WP = ST.wpn || WPN; const sw = ST.swirl;
  const n = poly.faces.length; const cells = n + 1;
  const cols = n <= 4 ? 3 : n <= 8 ? 3 : 4; const rows = Math.ceil(cells / cols);
  const qk = { high: 1, med: 0.75, low: 0.5 }[quality] ?? 1;
  const S = Math.round((poly.sides === 4 ? 384 : 256) * qk);
  const W = cols * S; const Hh = rows * S;
  let Hm = 0; poly.faces.forEach((f) => f.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); }));
  Hm *= 1.12;
  const mm = (S / 2) / Hm; // px per metre
  const A = mk(W, Hh); const Hc = mk(W, Hh); const O = mk(W, Hh); const E = mk(W, Hh);
  const ctxs = { A: A.getContext('2d'), H: Hc.getContext('2d', { willReadFrequently: true }), O: O.getContext('2d'), E: E.getContext('2d') };
  const rndSeed = hashStr(ck);
  ctxs.H.fillStyle = 'rgb(128,128,128)'; ctxs.H.fillRect(0, 0, W, Hh);
  ctxs.E.fillStyle = '#000'; ctxs.E.fillRect(0, 0, W, Hh);
  ctxs.A.fillStyle = '#000'; ctxs.A.fillRect(0, 0, W, Hh);
  ctxs.O.fillStyle = 'rgb(255,60,0)'; ctxs.O.fillRect(0, 0, W, Hh);

  const cellCenter = (ci) => [((ci % cols) + 0.5) * S, (Math.floor(ci / cols) + 0.5) * S];
  const nk = NUM_K[poly.sides];

  poly.faces.forEach((f, fi) => {
    const spec = faces[fi] || {};
    const [cx, cy] = cellCenter(fi);
    const rnd = mulberry32(rndSeed + fi * 7919);
    const pts = f.local.map((p) => [p[0] * mm, -p[1] * mm]); // px, y down
    let Rpx = 0; pts.forEach((p) => { Rpx = Math.max(Rpx, Math.hypot(p[0], p[1])); });
    const inR = f.inR2 * mm;
    for (const c of Object.values(ctxs)) { c.save(); c.beginPath(); c.rect(cx - S / 2, cy - S / 2, S, S); c.clip(); c.translate(cx, cy); }

    // ---- colours for this face
    const blank = !!spec.blank;
    let core; let mid; let edge; let rough = th.rough; const resin = blank ? 0 : 255;
    if (theme === 'weapon') {
      const t = spec.tone === 'b' ? 'b' : 'r';
      const P = blank ? WP[`${t}Blank`] : WP[t];
      core = P.core; mid = P.mid; edge = P.edge; if (blank) rough = 0.85;
    } else if (ST.clean && theme === 'heart') { const hc = new THREE.Color(HEART_FACE[+spec.text] || '#ffffff'); core = hc.clone().lerp(new THREE.Color('#ffffff'), 0.06).getStyle(); mid = hc.getStyle(); edge = hc.clone().multiplyScalar(0.55).getStyle(); } else if (theme === 'amethyst' && blank) { if (th.neutral) { core = '#4a505c'; mid = '#303640'; edge = '#14171e'; } else { core = '#3e2c66'; mid = '#241840'; edge = '#0c0618'; } rough = 0.8; } else if (theme === 'heart' && spec.tone === 'b') { core = '#f4a822'; mid = '#c4620a'; edge = '#5e1e04'; } else { core = th.core; mid = th.mid; edge = th.edge; }

    // ---- body: fill whole cell with edge colour, then the face gradient, swirls, speckle
    ctxs.A.fillStyle = edge; ctxs.A.fillRect(-S / 2, -S / 2, S, S);
    ctxs.O.fillStyle = `rgb(${resin},${Math.round(rough * 255)},0)`; ctxs.O.fillRect(-S / 2, -S / 2, S, S);
    const A = ctxs.A;
    const g = A.createRadialGradient(0, -inR * 0.1, 0, 0, 0, Rpx * 1.05);
    if (ST.clean) { g.addColorStop(0, core); g.addColorStop(0.8, mid); g.addColorStop(1, edge); } else { g.addColorStop(0, core); g.addColorStop(0.55, mid); g.addColorStop(1, edge); }
    A.fillStyle = g; A.beginPath(); pts.forEach((p, i) => (i ? A.lineTo(p[0], p[1]) : A.moveTo(p[0], p[1]))); A.closePath(); A.fill();
    A.save(); A.beginPath(); pts.forEach((p, i) => (i ? A.lineTo(p[0], p[1]) : A.moveTo(p[0], p[1]))); A.closePath(); A.clip();
    if (ST.clean) { /* flat colour: no swirls, no speckle */ } else if (theme === 'weapon') {
      const dark = blank ? ['#000', '#100508'] : ['#000', '#1a0408', spec.tone === 'b' ? '#031024' : '#2a0208'];
      const light = spec.tone === 'b' ? ['#7cc4ff', '#2f8cf5'] : ['#ff7a5a', '#ff3a3a'];
      swirls(A, rnd, Rpx, dark, 14, 0.7 * sw, inR * 0.5);
      if (!blank) swirls(A, rnd, Rpx, light, 8, 0.38, inR * 0.22);
      speckle(A, rnd, Rpx, blank ? '#888' : '#fff', 40, 1.4 * qk, 0.4);
    } else if (theme === 'bone') {
      swirls(A, rnd, Rpx, ['#9c7a4a', '#c9b48a', '#8a6a40'], 9, 0.28, inR * 0.3);
      swirls(A, rnd, Rpx, ['#fff8e8'], 6, 0.4, inR * 0.2);
      speckle(A, rnd, Rpx, '#6a4a28', 70, 1.3 * qk, 0.5);
    } else if (theme === 'smoke') {
      swirls(A, rnd, Rpx, ['#14100e', '#2a221d'], 10, 0.55, inR * 0.4);
      swirls(A, rnd, Rpx, ['#d8c8b0', '#a89888'], 7, 0.26, inR * 0.12);
      speckle(A, rnd, Rpx, '#e8dcc8', 55, 1.2 * qk, 0.5);
    } else if (theme === 'heart') {
      swirls(A, rnd, Rpx, ['#a83a04', '#c25a08', '#7a2204'], 12, 0.5, inR * 0.4);
      swirls(A, rnd, Rpx, ['#fff2a0', '#ffd860'], 8, 0.4, inR * 0.2);
      speckle(A, rnd, Rpx, '#fff6c0', 50, 1.5 * qk, 0.6);
    } else if (theme === 'amethyst' && th.neutral) {
      swirls(A, rnd, Rpx, blank ? ['#0c0e12', '#1c2028'] : ['#3c4452', '#58626f'], 10, 0.4 * sw + 0.1, inR * 0.4);
      if (!blank) { swirls(A, rnd, Rpx, ['#ffffff', '#dfe5ef'], 7, 0.3, inR * 0.15); speckle(A, rnd, Rpx, '#ffffff', 45, 1.3 * qk, 0.5); }
    } else if (theme === 'amethyst') {
      if (!blank) { swirls(A, rnd, Rpx, ['#2a0c5a', '#4a1a9a'], 10, 0.5, inR * 0.4); swirls(A, rnd, Rpx, ['#d8b8ff', '#b88aff'], 9, 0.35, inR * 0.16); speckle(A, rnd, Rpx, '#f0e0ff', 55, 1.4 * qk, 0.6); } else swirls(A, rnd, Rpx, ['#0a0414', '#1c1030'], 10, 0.6, inR * 0.4);
    }
    A.restore();
    // darker rim toward the polygon edge (ambient occlusion in the paint)
    A.save(); A.beginPath(); pts.forEach((p, i) => (i ? A.lineTo(p[0], p[1]) : A.moveTo(p[0], p[1]))); A.closePath(); A.clip();
    A.lineWidth = inR * 0.12; A.strokeStyle = ST.clean ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.35)'; A.stroke(); A.restore();

    // ---- blank: scratches and scorch, no glow
    if (blank) {
      if (!ST.clean) cracks(ctxs, rnd, Rpx * 0.9, 6, Math.max(1.2, inR * 0.025));
      if (!ST.clean) { A.save(); const sg = A.createRadialGradient(0, 0, 0, 0, 0, inR * 0.8); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); A.fillStyle = sg; A.fillRect(-S / 2, -S / 2, S, S); A.restore(); }
      // faint void sigil: a slashed ring (a miss) engraved shallow
      const ring = (c) => { c.lineWidth = inR * 0.07; c.beginPath(); c.arc(0, 0, inR * 0.42, 0, Math.PI * 2); c.moveTo(-inR * 0.3, inR * 0.3); c.lineTo(inR * 0.3, -inR * 0.3); c.stroke(); };
      layer(ctxs, { A: 'rgba(0,0,0,0.55)', H: 'rgb(96,96,96)' }, ring);
    }

    // ---- watermark (weapon identity), shallow
    if (spec.wm && !blank) {
      layer(ctxs, { A: spec.tone === 'b' ? 'rgba(160,210,255,0.16)' : 'rgba(255,170,130,0.16)', H: 'rgb(112,112,112)' }, (c) => drawIcon(c, spec.wm, 0, inR * 0.02, inR * 1.7));
    }

    // ---- numeral / symbol
    const CN = ST.corners && !blank && spec.sym !== 'TALENT';
    const hasPip = !!spec.pip && !blank && !CN;
    const numH = inR * nk * (CN ? (poly.sides === 6 ? 0.55 : 0.64) : hasPip ? (ST.pipDisc ? 0.5 : 0.82) : 1) * (ST.numScale && !hasPip ? ST.numScale : 1);
    const ny = hasPip ? -inR * (ST.pipDisc ? 0.34 : 0.2) : -inR * 0.04;
    if (spec.text != null && !blank && !spec.sym) {
      const txt = String(spec.text);
      // recess: groove outline (gold on ink dice) lower, inlay slightly higher than the groove
      const grow = numH * (ST.numW || ST.ink ? 0.2 : th.num === 'ink' ? 0.14 : 0.16);
      const grooveA = ST.ink && th.num === 'ink' ? '#fffaf0' : ST.numW && th.num === 'metal' ? 'rgba(10,0,8,0.96)' : th.num === 'ink' ? lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, ['#ffe9a8', '#d9a83e', '#8a5a14']) : 'rgba(0,0,0,0.9)';
      layer(ctxs, { H: 'rgb(34,34,34)', A: grooveA, O: th.num === 'ink' ? 'rgb(0,70,255)' : 'rgb(0,150,0)' }, (c) => drawNumeral(c, txt, 0, ny, numH, { grow }));
      let fillA; let metal = 0; let rr = 0.3;
      if (th.num === 'metal' && ST.numW) { fillA = '#ffffff'; metal = 0; rr = 0.25; } else if (th.num === 'metal') {
        const M = WP[spec.tone === 'b' ? 'b' : 'r'].metal; fillA = lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, M); metal = 70; rr = 0.3;
      } else if (th.num === 'ink' && ST.ink && (!spec.tone || ST.corners)) { fillA = '#140808'; rr = 0.12; } else if (th.num === 'ink') {
        fillA = spec.tone === 'b' ? lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, ['#3a78d8', '#143a86', '#0a1c4a']) : spec.tone === 'r' ? lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, ['#e04a3c', '#a01418', '#5a0408']) : lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, ['#3a2416', '#1c0f08', '#0a0504']);
        rr = 0.12;
      } else if (th.num === 'bone') {
        fillA = lin(ctxs.A, 0, ny - numH / 2, 0, ny + numH / 2, ['#ffffff', '#f6ead0', '#d8c69c']); rr = 0.32; metal = 0;
      } else fillA = '#fff';
      layer(ctxs, { A: 'rgba(0,0,0,0.55)' }, (c) => { c.save(); c.translate(numH * 0.03, numH * 0.04); drawNumeral(c, txt, 0, ny, numH, { grow: numH * 0.02 }); c.restore(); });
      layer(ctxs, { H: 'rgb(70,70,70)', A: fillA, O: `rgb(0,${Math.round(rr * 255)},${metal})` }, (c) => drawNumeral(c, txt, 0, ny, numH, { grow: -numH * 0.01 }));
      if (theme === 'weapon' && !blank) layer(ctxs, { E: spec.tone === 'b' ? 'rgba(120,180,255,0.18)' : 'rgba(255,140,90,0.2)' }, (c) => drawNumeral(c, txt, 0, ny, numH));
    }
    if (spec.sym === 'TALENT' && !blank) {
      // talent faces: one big symbol, or two side by side, centred (the same shapes and colours as everywhere else)
      const list = (spec.syms || []).slice(0, 2); const two = list.length === 2;
      const sz = inR * (two ? 1.0 : 1.5); const ow = sz * 0.1;
      list.forEach((kind, i) => {
        const bx = two ? (i ? 1 : -1) * inR * 0.5 : 0;
        layer(ctxs, { H: 'rgb(34,34,34)', A: kind === 'atk' || kind === 'def' ? '#fff6e0' : 'rgba(8,4,16,0.97)', O: 'rgb(0,150,0)' }, (c) => drawSym(c, kind === 'block' ? 'def' : kind, bx, inR * 0.02, sz, ow * 2));
        layer(ctxs, { H: 'rgb(78,78,78)', A: PIP_COLOR[kind === 'block' ? 'def' : kind], O: 'rgb(0,40,0)', E: PIP_COLOR[kind === 'block' ? 'def' : kind] }, (c) => drawSym(c, kind === 'block' ? 'def' : kind, bx, inR * 0.02, sz));
      });
    } else if (spec.sym && !blank && ST.corners) {
      // special dice: heal plus, magic triangle, or a bold "2x" -- the same shapes and colours as everywhere else
      if (spec.sym === 'SURGE') {
        const th2 = inR * 1.2; const ny2 = inR * 0.04; const xx = -inR * 0.26; const kx = inR * 0.45; const ky = inR * 0.24;
        const nyx = ny2 + th2 * 0.3875 - ky - th2 * 0.07; // x sits low: its bottom lines up with the foot of the 2
        const times = (c, w) => { c.lineCap = 'butt'; c.lineWidth = w; c.beginPath(); c.moveTo(kx - ky, nyx - ky); c.lineTo(kx + ky, nyx + ky); c.moveTo(kx + ky, nyx - ky); c.lineTo(kx - ky, nyx + ky); c.stroke(); };
        const wgt = th2 * 0.2;
        layer(ctxs, { H: 'rgb(34,34,34)', A: '#ffffff', O: 'rgb(0,150,0)' }, (c) => { drawNumeral(c, '2', xx, ny2, th2, { grow: th2 * 0.2 }); times(c, wgt + th2 * 0.16); });
        layer(ctxs, { H: 'rgb(78,78,78)', A: '#10131c', O: 'rgb(0,60,0)' }, (c) => { drawNumeral(c, '2', xx, ny2, th2, { grow: -th2 * 0.01 }); times(c, wgt); });
      } else {
        const kind = spec.sym === 'MEND' ? 'heal' : 'magic'; const sz = inR * 1.55; const ow = sz * 0.1;
        layer(ctxs, { H: 'rgb(34,34,34)', A: 'rgba(8,4,16,0.97)', O: 'rgb(0,150,0)' }, (c) => drawSym(c, kind, 0, inR * 0.02, sz, ow * 2));
        layer(ctxs, { H: 'rgb(78,78,78)', A: PIP_COLOR[kind], O: 'rgb(0,40,0)', E: PIP_COLOR[kind] }, (c) => drawSym(c, kind, 0, inR * 0.02, sz));
      }
    } else if (spec.sym && !blank) {
      const sym = { MEND: 'mend', SPARK: 'spark', SURGE: 'surge' }[spec.sym];
      const col = { MEND: ['#a0ffcc', '#33e08c', '#12904f'], SPARK: ['#fff2a8', '#ffd23d', '#d98a08'], SURGE: ['#f4ecff', '#c8aaff', '#8a62e8'] }[spec.sym];
      const glowC = { MEND: [0.2, 1.0, 0.55], SPARK: [1.0, 0.85, 0.2], SURGE: [0.82, 0.7, 1.0] }[spec.sym];
      const sz = inR * 1.75;
      layer(ctxs, { H: 'rgb(30,30,30)', A: 'rgba(8,2,20,0.95)', O: 'rgb(0,150,0)' }, (c) => drawIcon(c, sym, 0, inR * 0.02, sz * 1.14));
      layer(ctxs, { H: 'rgb(78,78,78)', A: lin(ctxs.A, 0, -sz / 2, 0, sz / 2, col), O: 'rgb(0,40,0)', E: `rgb(${glowC.map((x) => Math.round(x * 255)).join(',')})` }, (c) => drawIcon(c, sym, 0, inR * 0.02, sz));
    }
    // ---- resource pip under the numeral
    if (hasPip) {
      const ps = inR * 0.46 * ST.pipK; const py = inR * (ST.pipDisc ? 0.52 : 0.66);
      if (ST.pipDisc) layer(ctxs, { H: 'rgb(60,60,60)', A: ST.pipDisc === 'light' ? '#fffaf0' : 'rgba(14,8,28,0.96)', O: 'rgb(0,120,0)' }, (c) => { c.beginPath(); c.arc(0, py, ps * 0.78, 0, Math.PI * 2); c.fill(); });
      layer(ctxs, { H: 'rgb(40,40,40)', A: ST.pipDisc === 'light' ? 'rgba(20,10,30,0.95)' : 'rgba(0,0,0,0.9)', O: 'rgb(0,140,0)' }, (c) => drawPip(c, spec.pip, 0, py, ps * (ST.pipDisc ? 1.12 : 1.28)));
      layer(ctxs, { H: 'rgb(84,84,84)', A: PIP_COLOR[spec.pip], O: 'rgb(0,60,0)', E: spec.pip === 'gold' ? 'rgb(150,100,10)' : `${PIP_COLOR[spec.pip]}` }, (c) => drawPip(c, spec.pip, 0, py, ps));
    }
    // ---- corner symbols: the face's meaning (attack / defense), its resource, and any tier bonuses
    if (CN) {
      const typeSym = theme === 'weapon' ? (spec.tone === 'b' ? 'def' : 'atk') : spec.mark === 'atk' ? 'atk' : spec.mark === 'block' ? 'def' : null;
      const list = ST.clean && theme === 'heart' ? [HEART_KIND[+spec.text], 'boost'] : (spec.corners || [typeSym, spec.pip].filter(Boolean));
      // corners ordered clockwise from the top-most
      const cs = pts.map((p) => ({ p, a: (Math.atan2(p[0], -p[1]) + Math.PI * 2) % (Math.PI * 2) })).sort((u, v) => u.a - v.a);
      const topFirst = cs.findIndex((c) => c.a < 0.01 || c.a > Math.PI * 2 - 0.01);
      const ordered = cs; // clockwise from 12 o'clock; slot 0 is the first corner at or after it
      const kk = pts.length === 4 && poly.sides !== 10 ? 0.58 : pts.length === 3 ? 0.5 : 0.56;
      list.slice(0, ordered.length).forEach((kind, i) => {
        const v = ordered[i].p; const bx = v[0] * kk; const by = v[1] * kk;
        const r = Math.min(edgeGap(pts, bx, by) * 0.95, inR * 0.36); const sz = r * 2.0; const ow = Math.max(2, sz * 0.13);
        layer(ctxs, { H: 'rgb(44,44,44)', A: theme === 'weapon' && (kind === 'atk' || kind === 'def') ? '#fff6e0' : 'rgba(8,4,16,0.97)', O: 'rgb(0,140,0)' }, (c) => drawSym(c, kind, bx, by, sz, ow * 2));
        layer(ctxs, { H: 'rgb(84,84,84)', A: PIP_COLOR[kind], O: 'rgb(0,60,0)', E: kind === 'gold' ? 'rgb(120,92,6)' : PIP_COLOR[kind] }, (c) => drawSym(c, kind, bx, by, sz));
      });
    }
    // ---- colour badge (heart 5 / 6)
    if (spec.mark && !CN) {
      const bs = inR * 0.4; const bx = 0; const by = inR * 0.68;
      const ic = spec.mark === 'atk' ? 'sword' : 'shield'; const cc = spec.mark === 'atk' ? '#b0141c' : '#1c58b8';
      layer(ctxs, { H: 'rgb(40,40,40)', A: 'rgba(0,0,0,0.85)', O: 'rgb(0,140,0)' }, (c) => drawIcon(c, ic, bx, by, bs * 1.2));
      layer(ctxs, { H: 'rgb(84,84,84)', A: cc, O: 'rgb(0,60,0)' }, (c) => drawIcon(c, ic, bx, by, bs));
    }
    for (const c of Object.values(ctxs)) c.restore();
  });

  // ---- trim cell (all bevels and corners sample its centre)
  const [tx, ty] = cellCenter(n);
  const A2 = ctxs.A;
  A2.save(); A2.translate(tx, ty); A2.fillStyle = lin(A2, -S / 2, -S / 2, S / 2, S / 2, th.trim); A2.fillRect(-S / 2, -S / 2, S, S); A2.restore();
  ctxs.O.save(); ctxs.O.translate(tx, ty); ctxs.O.fillStyle = `rgb(0,${Math.round(th.trimRough * 255)},255)`; ctxs.O.fillRect(-S / 2, -S / 2, S, S); ctxs.O.restore();

  const normalC = normalFromHeight(Hc, 3.4, Math.max(1, Math.round(1.6 * qk)));
  const needE = faces.some((f) => f && (f.sym || f.syms || f.pip || f.corners || (ST.corners && (f.mark || (theme === 'weapon' && !f.blank))) || (theme === 'weapon' && !f.blank)));
  const textures = {
    map: tex(A, true), orm: tex(O, false), normalMap: tex(normalC, false), emissiveMap: needE ? tex(E, true) : null,
  };
  const uvOf = (fi, x, y) => { const [cx, cy] = cellCenter(fi); return [(cx + (x / Hm) * (S / 2)) / W, 1 - (cy - (y / Hm) * (S / 2)) / Hh]; };
  const [tcx, tcy] = cellCenter(n);
  const out = { textures, uvOf, trimUV: [tcx / W, 1 - tcy / Hh], canvases: { A, Hc, O, E, normalC }, size: [W, Hh], Hm };
  cache.set(ck, out);
  return out;
}

export const _internals = { mk };
