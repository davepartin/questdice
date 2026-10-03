// Physical dice on a canvas. The page already knows the roll, so the tumble is a
// performance: it spins in the well, then the face toward the camera shows the
// true result. A CSS cube cannot survive the scrolling page (overflow flattens
// 3D), and this stays dependency-free.
//
// WELL is where the die sits inside its mat cell, as fractions of the cell.
// The character art owns the rest of the cell. mat.js uses the same anchors.

export const WELL = {
  NW: [0.68, 0.70],
  N: [0.50, 0.64],
  NE: [0.32, 0.70],
  W: [0.70, 0.52],
  C: [0.50, 0.50],
  E: [0.30, 0.52],
  SW: [0.66, 0.36],
  S: [0.50, 0.38],
  SE: [0.34, 0.36],
};

const SOLIDS = {
  4: tetra(),
  6: cube(),
  8: octa(),
  10: dipyramid(5),
};

const INK = { '': '#1a140e', red: '#fffaf8', blue: '#f4fbff', heart: '#2a1c04', sym: '#fbf8ff' };
const FACE = { '': '#f3ecdf', red: '#ff4d4d', blue: '#3aa4f5', heart: '#ffd23d', sym: '#b07dff' };
const EDGE = { '': '#2a2118', red: '#4a0c14', blue: '#062038', heart: '#6a4a08', sym: '#241038' };
const YAW = { N: 0.05, NW: 0.12, NE: -0.1, W: -0.08, C: 0.02, E: 0.09, SW: 0.07, S: -0.04, SE: -0.11 };

const loops = new WeakMap();

function tetra() {
  const v = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  return { v: scale(v, 1.05), f: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]] };
}
function cube() {
  const v = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  return { v: scale(v, 0.92), f: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]] };
}
function octa() {
  const v = [[1, 0, 0], [-1, 0, 0], [0, 1.05, 0], [0, -1.05, 0], [0, 0, 1], [0, 0, -1]];
  return { v, f: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [0, 5, 2], [2, 5, 1], [1, 5, 3], [3, 5, 0]] };
}
function dipyramid(n) {
  const v = [[0, 1.15, 0], [0, -1.15, 0]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    v.push([Math.cos(a) * 0.92, 0, Math.sin(a) * 0.92]);
  }
  const f = [];
  for (let i = 0; i < n; i++) {
    const a = 2 + i;
    const b = 2 + ((i + 1) % n);
    f.push([0, b, a], [1, a, b]);
  }
  return { v, f };
}
function scale(vs, k) { return vs.map((p) => p.map((n) => n * k)); }

function rot(p, ax, ay, az) {
  let [x, y, z] = p;
  let c = Math.cos(ax); let s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}
function rodrigues(v, axis, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const d = dot(axis, v);
  const cr = cross(axis, v);
  return [
    v[0] * c + cr[0] * s + axis[0] * d * (1 - c),
    v[1] * c + cr[1] * s + axis[1] * d * (1 - c),
    v[2] * c + cr[2] * s + axis[2] * d * (1 - c),
  ];
}
function outward(pts) {
  const a = pts[0]; const b = pts[1]; const c = pts[2];
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = cross(u, v);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
  if (dot(n, [cx, cy, cz]) < 0) n = n.map((q) => -q);
  return norm(n);
}
function mix(hex, t, toward) {
  const a = rgb(hex);
  const b = rgb(toward);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${a.map((n, i) => Math.round(n + (b[i] - n) * k)).join(',')})`;
}
function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function calm() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function posed(solid, slot, spinning) {
  if (spinning && !calm()) {
    const t = performance.now() / 1000 + (slot.charCodeAt(0) || 0) * 0.17;
    return solid.v.map((p) => rot(p, t * 7.2, t * 5.1 + (YAW[slot] || 0), t * 2.8));
  }
  const idx = solid.f[0];
  const n = outward(idx.map((i) => solid.v[i]));
  const target = norm([0, -0.14, 1]);
  const axis = cross(n, target);
  const sin = Math.hypot(axis[0], axis[1], axis[2]);
  const cos = Math.max(-1, Math.min(1, dot(n, target)));
  let verts = solid.v;
  if (sin > 1e-5) verts = verts.map((p) => rodrigues(p, norm(axis), Math.atan2(sin, cos)));
  else if (cos < 0) verts = verts.map((p) => rodrigues(p, [1, 0, 0], Math.PI));
  const pts = idx.map((i) => verts[i]);
  const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((v) => v / pts.length);
  let twist;
  if (pts.length >= 4) twist = -Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
  else {
    let top = pts[0];
    for (const p of pts) if (p[1] < top[1]) top = p;
    twist = -Math.PI / 2 - Math.atan2(top[1] - c[1], top[0] - c[0]);
  }
  twist += YAW[slot] || 0;
  return verts.map((p) => rodrigues(p, [0, 0, 1], twist));
}

function solidFor(el) {
  const n = Number(el.dataset.sides) || 6;
  return SOLIDS[n] || SOLIDS[6];
}

export function drawDie(el) {
  const canvas = el.querySelector('canvas');
  if (!canvas) return;
  const css = el.clientWidth;
  if (!css) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.max(1, Math.round(css * dpr));
  if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, px, px);

  const slot = el.dataset.slot || 'C';
  const tone = el.dataset.tone || '';
  const blank = el.classList.contains('blank');
  let face = FACE[tone] || FACE[''];
  let ink = INK[tone] || INK[''];
  const edge = EDGE[tone] || EDGE[''];
  if (blank) { face = mix(face, 0.22, '#6a645c'); ink = mix(ink, 0.2, '#8a847c'); }
  const spinning = el.classList.contains('rolling');
  const solid = solidFor(el);
  const verts = posed(solid, slot, spinning);

  const light = norm([-0.35, -0.78, 0.52]);
  const faces = solid.f.map((id) => {
    const pts = id.map((i) => verts[i]);
    const n = outward(pts);
    const z = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    return { pts, n, z };
  }).filter((f) => f.n[2] > 0.015).sort((a, b) => a.z - b.z);
  if (!faces.length) return;

  let [ax, ay] = WELL[slot] || [0.5, 0.5];
  if (el.classList.contains('sel')) ay -= 0.055;
  const project = (p) => {
    const f = 3.1 / (5.1 - p[2]);
    const span = px * (spinning ? 0.40 : 0.36);
    return [px * ax + p[0] * f * span, px * ay + p[1] * f * span];
  };

  ctx.save();
  const sg = ctx.createRadialGradient(px * ax, px * (ay + 0.16), px * 0.02, px * ax, px * (ay + 0.18), px * 0.24);
  sg.addColorStop(0, 'rgba(0,0,0,.50)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(px * ax, px * (ay + 0.17), px * 0.20, px * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  let front = faces[0];
  for (const f of faces) if (f.n[2] > front.n[2]) front = f;

  for (const f of faces) {
    const poly = f.pts.map(project);
    const lambert = Math.max(0, dot(f.n, light));
    const up = Math.max(0, -f.n[1]);
    const side = mix(mix(face, 0.5, '#140c12'), up * 0.35, '#fff6e4');
    trace(ctx, poly);
    ctx.lineJoin = 'round';
    if (f === front) {
      ctx.fillStyle = face;
      ctx.fill();
    } else {
      ctx.fillStyle = mix(side, 1 - (0.35 + lambert * 0.65), '#10080c');
      ctx.fill();
      ctx.lineWidth = Math.max(1, px * 0.012);
      ctx.strokeStyle = edge;
      ctx.stroke();
    }
    if (f === front) {
      gloss(ctx, poly);
      trace(ctx, poly);
      ctx.lineWidth = Math.max(1.4, px * 0.02);
      ctx.strokeStyle = 'rgba(255,248,236,.78)';
      ctx.stroke();
      const c = centroid(poly);
      const size = Math.min(spanOf(poly) * 0.46, faceSize(poly) * 1.35);
      const label = (el.querySelector('.num')?.textContent || '').trim();
      const chip = (el.querySelector('.chip')?.textContent || '').trim();
      const dy = chip && chip !== 'blank' ? -size * 0.16 : 0;
      drawMark(ctx, label || '–', c[0], c[1] + dy, size, ink, tone);
      if (chip && chip !== 'blank') drawMark(ctx, chip, c[0], c[1] + size * 0.42, size * 0.34, mix(ink, 0.25, face), tone, spanOf(poly) * 0.85);
      if (el.classList.contains('syn')) halo(ctx, poly, 'rgba(255,210,61,.95)', px);
      else if (el.classList.contains('sel')) halo(ctx, poly, 'rgba(255,255,255,.9)', px);
      else if (el.classList.contains('focus')) halo(ctx, poly, 'rgba(244,241,232,.55)', px);
    }
  }
}

function trace(ctx, poly) {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}
function centroid(poly) {
  const s = poly.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [s[0] / poly.length, s[1] / poly.length];
}
function faceSize(poly) {
  const c = centroid(poly);
  return Math.max(8, poly.reduce((m, p) => Math.min(m, Math.hypot(p[0] - c[0], p[1] - c[1])), 1e9));
}
function spanOf(poly) {
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const p of poly) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  return Math.min(maxX - minX, maxY - minY);
}
function gloss(ctx, poly) {
  const c = centroid(poly);
  const size = faceSize(poly);
  ctx.save();
  trace(ctx, poly);
  ctx.clip();
  const g = ctx.createLinearGradient(c[0] - size, c[1] - size * 1.2, c[0] + size * 0.3, c[1] + size);
  g.addColorStop(0, 'rgba(255,255,255,.5)');
  g.addColorStop(0.34, 'rgba(255,255,255,.06)');
  g.addColorStop(0.72, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.16)');
  ctx.fillStyle = g;
  ctx.fillRect(c[0] - size * 3, c[1] - size * 3, size * 6, size * 6);
  ctx.restore();
}
function halo(ctx, poly, color, px) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = px * 0.06;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, px * 0.02);
  trace(ctx, poly);
  ctx.stroke();
  ctx.restore();
}

const FONT = '"Archivo Black", "Arial Black", sans-serif';

function drawMark(ctx, text, x, y, size, color, tone, maxW) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bolt = text.includes('⚡');
  const plus = text === '✚' || text === '+';
  const gem = (text === '✦' || text === '◆') || ((text.startsWith('◆') || text.startsWith('✦')) && text.length < 3);
  const dash = text === '—' || text === '-' || text === '–';
  if (plus) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, 0); ctx.lineTo(size * 0.34, 0);
    ctx.moveTo(0, -size * 0.34); ctx.lineTo(0, size * 0.34);
    ctx.stroke();
  } else if (bolt) {
    ctx.beginPath();
    ctx.moveTo(size * 0.12, -size * 0.46);
    ctx.lineTo(-size * 0.26, size * 0.02);
    ctx.lineTo(size * 0.02, size * 0.02);
    ctx.lineTo(-size * 0.1, size * 0.46);
    ctx.lineTo(size * 0.3, -size * 0.08);
    ctx.lineTo(0, -size * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (gem) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.46);
    ctx.lineTo(size * 0.22, 0);
    ctx.lineTo(0, size * 0.46);
    ctx.lineTo(-size * 0.22, 0);
    ctx.closePath();
    ctx.fill();
  } else if (dash) {
    ctx.fillRect(-size * 0.28, -size * 0.07, size * 0.56, size * 0.14);
  } else {
    let s = Math.max(8, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${s}px ${FONT}`;
    const limit = maxW || s * 2.4;
    while (s > 7 && ctx.measureText(text).width > limit) {
      s *= 0.88;
      ctx.font = `800 ${s}px ${FONT}`;
    }
    const shadow = tone === 'red' || tone === 'blue' || tone === 'sym' ? 'rgba(0,0,0,.55)' : 'rgba(40,22,8,.40)';
    ctx.fillStyle = shadow;
    ctx.fillText(text, s * 0.04, s * 0.08);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

export function kickDie(el) {
  if (!el) return;
  if (!el.classList.contains('rolling') || calm()) { drawDie(el); return; }
  if (loops.has(el)) return;
  const step = () => {
    if (!el.isConnected || !el.classList.contains('rolling')) { loops.delete(el); drawDie(el); return; }
    drawDie(el);
    loops.set(el, requestAnimationFrame(step));
  };
  loops.set(el, requestAnimationFrame(step));
}

export function watchDie(el) {
  if (typeof ResizeObserver === 'undefined') return;
  const redraw = () => {
    if (el.classList.contains('rolling')) kickDie(el);
    else drawDie(el);
  };
  const ro = new ResizeObserver(redraw);
  ro.observe(el);
  const mo = new MutationObserver(redraw);
  mo.observe(el, { attributes: true, attributeFilter: ['class', 'data-tone'] });
  if (document.fonts?.ready) document.fonts.ready.then(() => drawDie(el)).catch(() => {});
}
