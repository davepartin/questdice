// Weapon card dice (T05, ported from Grok's T17 rev 14 mockup): real polyhedra from the game (js/gfx/dice/poly.js, so shapes and bevels match the
// battle tray: d4 triangle, d6 square, d8 diamond, d10 kite), pure red (attack) / blue (block) bodies all the way to the bevels, and a unified
// number size and baseline across every face of the same die size so +0, +1, +4 all line up cleanly.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePoly, roundedGeometry } from '../gfx/dice/poly.js';
let SYM = {}; export const setSymbols = (s) => { SYM = s; }; // the game's symbol paths and colours (js/g3/cards.js SYM)
const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };
const BODY = { r: ['#c0141a', '#6e0508'], b: ['#1d5ed4', '#0b2a78'], z: ['#c0141a', '#6e0508'] };
let R, scene, cam, env, idle;
function setup() {
  clearTimeout(idle); if (R) return; R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.64; R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; pm.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(-2.2, 3.4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdce8ff, 0.9); rim.position.set(3, 1.5, -2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
}
function release() { idle = setTimeout(() => { try { env?.dispose(); R?.dispose(); R?.forceContextLoss(); } catch { /* already gone */ } R = scene = cam = env = null; }, 4000); }

function grain(g, W, H, seed, a, C = 24) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  const cells = Array.from({ length: (C + 1) * (C + 1) }, rnd);
  const at = (x, y) => { const gx = x / W * C, gy = y / H * C, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy; const v = (i, j) => cells[(iy + j) * (C + 1) + ix + i];
    return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fy) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fy; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const n = (at(x, y) - 0.5) * a + (rnd() - 0.5) * a * 0.55; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}

const RICH = { arrow_pierce: '#ee4400', arrow_fire: '#e0420a', arrow_frost: '#1f9ad6', atk: '#e07a00', block: '#0b3c9e', gold: '#e39400', pierce: '#ee4400', magic: '#7410cc', heal: '#08a83a', star: '#e88600' };
const icon = (g, k, x, y, s) => { const sym = SYM[k.startsWith('arrow_') ? 'arrow' : k] || SYM.star; const p = new Path2D(sym.d); const col = RICH[k] || sym.c;
  const u = s / 24; const white = Math.min(9.5, s * 0.09) / u;
  g.save(); g.translate(x - s / 2, y - s / 2); g.scale(u, u); g.lineJoin = 'round';
  g.save(); g.translate(0, 5 / u); g.lineWidth = white; g.strokeStyle = '#18050499'; g.stroke(p); g.restore();
  g.lineWidth = white; g.strokeStyle = '#fffdf6'; g.stroke(p); g.fillStyle = col; g.fill(p);
  g.save(); g.clip(p); g.lineWidth = 5.5 / u; g.translate(0, 2.8 / u); g.strokeStyle = '#0000004d'; g.stroke(p); g.translate(0, -5.6 / u); g.strokeStyle = '#ffffff66'; g.stroke(p); g.restore();
  g.restore(); };

const ROWS = { 1: [1], 2: [2], 3: [3], 4: [[2, 2], [4]], 5: [[3, 2], [2, 3]] };
function edgeDist(P, x, y, sg = 1) { let m = Infinity; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
  const ex = bx - ax, ey = by - ay, L = Math.hypot(ex, ey); const d = sg * ((x - ax) * ey - (y - ay) * ex) / L; m = Math.min(m, d); } return m; }
function layout(P, sign, nMarks, txtW, inR, extra = 0) {
  const inside = (x, y, r) => edgeDist(P, x, y, sign) >= r + extra;
  // Always reserve at least 1 icon row below the number so every face on the same row (+0, +1, +4) has the SAME number size and vertical position
  const effMarks = Math.max(2, nMarks);
  const plans = [].concat(ROWS[effMarks] ? (Array.isArray(ROWS[effMarks][0]) ? ROWS[effMarks] : [ROWS[effMarks]]) : [[effMarks]]);
  let best = null;
  for (const plan of plans) for (let oy = -0.45; oy <= 0.4501; oy += 0.04) {
    const fits = (k) => { const fs = k, is = k * 0.64, gap = is * 1.12; const rows = plan.length; const hT = fs * 0.76, hI = rows * gap;
      const top = oy * inR - (hT + hI) / 2; const ny = top + hT / 2; const tw = txtW * fs;
      for (const [cx, cy] of [[-tw / 2, ny - hT / 2], [tw / 2, ny - hT / 2], [-tw / 2, ny + hT / 2], [tw / 2, ny + hT / 2]]) if (!inside(cx, cy, 0)) return null;
      const pts = []; plan.forEach((n, r) => { for (let i = 0; i < n; i++) pts.push([(i - (n - 1) / 2) * gap, top + hT + gap * (r + .5)]); });
      const rr = is * 0.5 + Math.min(9, is * 0.085) / 2; for (const [x, y] of pts) if (!inside(x, y, rr)) return null;
      // Now compute the actual icon positions for the real `nMarks` using the same `top`, `hT`, `is`, `gap`
      const realPlan = !nMarks ? [] : (ROWS[nMarks] ? (Array.isArray(ROWS[nMarks][0]) ? ROWS[nMarks][0] : ROWS[nMarks]) : [nMarks]);
      const realPts = []; realPlan.forEach((n, r) => { for (let i = 0; i < n; i++) realPts.push([(i - (n - 1) / 2) * gap, top + hT + gap * (r + .5)]); });
      return { fs, is, ny, pts: realPts }; };
    let lo = 0, hi = inR * 1.6, got = null; for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; const r = fits(mid); if (r) { lo = mid; got = r; } else hi = mid; }
    if (got && (!best || got.fs > best.fs)) best = got; }
  return best;
}
function paintFace(g, poly, fi, f, cell, Hm) {
  const ppm = (cell / 2) / Hm; const F = poly.faces[fi]; const inR = F.inR2 * ppm; const txt = `+${f.v}`; const marks = f.icons.slice(0, 5);
  const P = F.local.map(([x, y]) => [x * ppm, -y * ppm]); let A = 0; P.forEach(([x, y], i) => { const [u, v] = P[(i + 1) % P.length]; A += x * v - u * y; }); const sign = A > 0 ? -1 : 1;
  const inset = R_BY[poly.sides] * ppm * 1.15 + inR * 0.05;
  g.font = `800 100px Oxanium, "Trebuchet MS", sans-serif`; const txtW = g.measureText('+4').width / 100 * 0.94;
  const L = layout(P, sign, marks.length, txtW, inR, inset);
  const { fs, is, ny, pts } = L || { fs: inR * .42, is: inR * .26, ny: -inR * .24, pts: marks.map((_, i) => [(i - (marks.length - 1) / 2) * inR * .3, inR * .2]) };
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000b'; g.fillText(txt, 0, ny + fs * .06); g.fillStyle = '#fff5'; g.fillText(txt, -fs * .02, ny - fs * .03);
  const [i0, i1] = ['#fffaf2', f.v === 0 ? '#cfc3b6' : '#eadbc0'];
  const tg = g.createLinearGradient(0, ny - fs / 2, 0, ny + fs / 2); tg.addColorStop(0, i0); tg.addColorStop(1, i1); g.fillStyle = tg; g.fillText(txt, 0, ny);
  marks.forEach((k, i) => { if (pts[i]) icon(g, k, pts[i][0], pts[i][1], is); });
}

function atlasForColor(poly, faces, baseCol = 'r', cell = 256) {
  const n = poly.faces.length; const cols = Math.ceil(Math.sqrt(n + 1)); const W = cols * cell; const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d', { willReadFrequently: true });
  const fillCol = BODY[baseCol === 'b' ? 'b' : 'r'][0];
  g.fillStyle = fillCol; g.fillRect(0, 0, W, W);
  let Hm = 0; poly.faces.forEach((f) => f.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); })); Hm *= 1.12;
  const ctr = (fi) => [(fi % cols + .5) * cell, ((fi / cols | 0) + .5) * cell];
  const uvOf = (fi, x, y) => { const [cx, cy] = ctr(fi); return [(cx + (x / Hm) * (cell / 2)) / W, 1 - (cy - (y / Hm) * (cell / 2)) / W]; };
  grain(g, W, W, 7, 24); grain(g, W, W, 31, 15, 110);
  faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi);
    g.save(); g.translate(cx, cy); paintFace(g, poly, fi, f, cell, Hm); g.restore(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  const b = new THREE.CanvasTexture(cv); b.flipY = true;
  const trim = ctr(n); return { t, b, uvOf, trimUV: [trim[0] / W, 1 - trim[1] / W], cv };
}

function cropToSquare(srcCanvas, outPx) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const out = document.createElement('canvas'); out.width = out.height = outPx;
  const g = out.getContext('2d');
  g.drawImage(srcCanvas, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return srcCanvas.toDataURL('image/png');
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const span = Math.max(bw, bh);
  const pad = Math.round(outPx * 0.03);
  const scale = (outPx - pad * 2) / span;
  const dw = bw * scale, dh = bh * scale;
  g.clearRect(0, 0, outPx, outPx);
  g.drawImage(srcCanvas, x0, y0, bw, bh, (outPx - dw) / 2, (outPx - dh) / 2, dw, dh);
  return out.toDataURL('image/png');
}

export function dieSet(sides, faces, { px = 220, from = 0 } = {}) {
  setup(); R.setSize(px, px, false);
  const poly = makePoly(sides);
  const needR = faces.some((f, i) => i >= from && f && f.c !== 'b');
  const needB = faces.some((f, i) => i >= from && f && f.c === 'b');
  const AR = needR ? atlasForColor(poly, faces, 'r') : null;
  const AB = needB ? atlasForColor(poly, faces, 'b') : null;
  const A0 = AR || AB;
  const geo = roundedGeometry(poly, { r: R_BY[sides], seg: 4, uvOf: A0.uvOf, trimUV: A0.trimUV });
  const mat = new THREE.MeshPhysicalMaterial({ map: A0.t, roughness: 0.5, metalness: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.5, bumpMap: A0.b, bumpScale: 1.4, envMapIntensity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh); const urls = [];
  const tilt = new THREE.Euler(-0.26, sides === 4 ? 0.2 : 0.22, 0); const dist = poly.outR / Math.tan((cam.fov / 2) * Math.PI / 180) * (sides === 4 ? 0.76 : 0.84);
  cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); mesh.position.y = sides === 4 ? -poly.outR * 0.08 : 0;
  for (let label = 1; label <= sides; label++) {
    if (label <= from) { urls.push(null); continue; }
    const faceData = faces[label - 1];
    const A = faceData?.c === 'b' ? AB : AR;
    if (mat.map !== A.t) { mat.map = A.t; mat.bumpMap = A.b; mat.needsUpdate = true; }
    const f = poly.faces[poly.labelFace[label - 1]]; const m = new THREE.Matrix4().makeBasis(f.e2, f.e1, f.n).transpose();
    mesh.quaternion.setFromRotationMatrix(m).premultiply(new THREE.Quaternion().setFromEuler(tilt));
    R.render(scene, cam); urls.push(cropToSquare(R.domElement, px));
  }
  scene.remove(mesh); geo.dispose(); mat.dispose();
  if (AR) { AR.t.dispose(); AR.b.dispose(); }
  if (AB) { AB.t.dispose(); AB.b.dispose(); }
  release();
  return urls;
}
