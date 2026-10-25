// Weapon card dice (T05, ported from Grok's T17 rev 14 mockup): real polyhedra from the game (js/gfx/dice/poly.js, so shapes and bevels match the
// battle tray), flat red (attack) / blue (block) bodies, the number and bonus icons fitted inside each true face polygon. One atlas and one solid are
// built per weapon (its faces), then every label is photographed from the front into a small PNG; images are cached by the faces that make them.
// Loaded on demand by js/g3/cards.js (it needs WebGL and three.js, which a plain test run does not have); one shared context, released when idle.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePoly, roundedGeometry } from '../gfx/dice/poly.js';
let SYM = {}; export const setSymbols = (s) => { SYM = s; }; // the game's symbol paths and colours (js/g3/cards.js SYM)
const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };
const BODY = { r: ['#c0141a', '#6e0508'], b: ['#1f5fd0', '#0b2a78'], z: ['#c0141a', '#6e0508'] }; // attack, block, a +0 (the same red as attack; the +0 shows in its number)
let R, scene, cam, env, idle;
function setup() {
  clearTimeout(idle); if (R) return; R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.62; R.outputColorSpace = THREE.SRGBColorSpace; // lower exposure so bright icon colours are not washed out by the filmic curve
  scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; pm.dispose();
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-2.2, 3.4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.9); rim.position.set(3, 1.5, -2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
}
// give the graphics memory back a few seconds after the last card was drawn
function release() { idle = setTimeout(() => { try { env?.dispose(); R?.dispose(); R?.forceContextLoss(); } catch { /* already gone */ } R = scene = cam = env = null; }, 4000); }
// seeded value noise for the grain
function grain(g, W, H, seed, a, C = 24) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  const cells = Array.from({ length: (C + 1) * (C + 1) }, rnd);
  const at = (x, y) => { const gx = x / W * C, gy = y / H * C, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy; const v = (i, j) => cells[(iy + j) * (C + 1) + ix + i];
    return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fy) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fy; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const n = (at(x, y) - 0.5) * a + (rnd() - 0.5) * a * 0.55; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
// rev 6 (Dave): no dark well; each mark is a rich saturated colour with a ~3-4 screen-px white border (scaled to the texture), a soft
// drop shadow below and a light top bevel, so it reads as stamped/embossed into the die on red and blue bodies alike
const RICH = { arrow_pierce: '#ee4400', arrow_fire: '#e0420a', arrow_frost: '#1f9ad6',  atk: '#e07a00', block: '#0b3c9e', gold: '#e39400', pierce: '#ee4400', magic: '#7410cc', heal: '#08a83a', star: '#e88600' }; // pre-tone-mapping, so they land rich
const icon = (g, k, x, y, s) => { const sym = SYM[k.startsWith('arrow_') ? 'arrow' : k] || SYM.star; const p = new Path2D(sym.d); const col = RICH[k] || sym.c;
  const u = s / 24; const white = Math.min(9, s * 0.085) / u; // ~9 texture px on big icons, proportionally thinner on small d4 icons so the colour still dominates of white border (about 3-4 px on screen at the card's die sizes)
  g.save(); g.translate(x - s / 2, y - s / 2); g.scale(u, u); g.lineJoin = 'round';
  g.save(); g.translate(0, 5 / u); g.lineWidth = white; g.strokeStyle = '#3a0a0688'; g.stroke(p); g.restore(); // shadow under the stamp
  g.lineWidth = white; g.strokeStyle = '#fffdf6'; g.stroke(p); g.fillStyle = col; g.fill(p);
  g.save(); g.clip(p); g.lineWidth = 6 / u; g.translate(0, 3 / u); g.strokeStyle = '#0000004d'; g.stroke(p); g.translate(0, -6 / u); g.strokeStyle = '#ffffff66'; g.stroke(p); g.restore(); // inner bevel
  g.restore(); };

// rev 10: a face layout system. Every face is fitted, not hand-tuned: the face's real polygon (poly.faces[fi].local, in texture px,
// shrunk by the rounded-edge bevel plus a margin) is the box; the number sits on top and the marks (attack/block mark + up to 4 bonus
// icons) go below in rows (1-3 in a row; 4 as 2x2; 5 as 3+2). For each row plan and a few vertical offsets, a binary search finds the
// largest scale where the number's box and every icon's circle (white border included) are inside the polygon; the best plan wins.
const ROWS = { 1: [1], 2: [2], 3: [3], 4: [[2, 2], [4]], 5: [[3, 2], [2, 3]] };
function edgeDist(P, x, y, sg = 1) { let m = Infinity; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
  const ex = bx - ax, ey = by - ay, L = Math.hypot(ex, ey); const d = sg * ((x - ax) * ey - (y - ay) * ex) / L; m = Math.min(m, d); } return m; }
function layout(P, sign, nMarks, txtW, inR, extra = 0) {
  const inside = (x, y, r) => edgeDist(P, x, y, sign) >= r + extra; const plans = [].concat(ROWS[nMarks] ? (Array.isArray(ROWS[nMarks][0]) ? ROWS[nMarks] : [ROWS[nMarks]]) : [[nMarks]]);
  let best = null;
  for (const plan of plans) for (let oy = -0.5; oy <= 0.5001; oy += 0.05) {
    const fits = (k) => { const fs = k, is = k * 0.62, gap = is * 1.18; const rows = plan.length; const hT = fs * 0.78, hI = rows * gap;
      const top = oy * inR - (hT + hI) / 2; const ny = top + hT / 2; const tw = txtW * fs;
      for (const [cx, cy] of [[-tw / 2, ny - hT / 2], [tw / 2, ny - hT / 2], [-tw / 2, ny + hT / 2], [tw / 2, ny + hT / 2]]) if (!inside(cx, cy, 0)) return null;
      const pts = []; plan.forEach((n, r) => { for (let i = 0; i < n; i++) pts.push([(i - (n - 1) / 2) * gap, top + hT + gap * (r + .5)]); });
      const rr = is * 0.5 + Math.min(9, is * 0.085) / 2; for (const [x, y] of pts) if (!inside(x, y, rr)) return null;
      return { fs, is, ny, pts }; };
    let lo = 0, hi = inR * 2, got = null; for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; const r = fits(mid); if (r) { lo = mid; got = r; } else hi = mid; }
    if (got && (!best || got.fs > best.fs)) best = got; }
  return best;
}
function paintFace(g, poly, fi, f, cell, Hm) {
  const ppm = (cell / 2) / Hm; const F = poly.faces[fi]; const inR = F.inR2 * ppm;   const txt = `+${f.v}`; const marks = [f.c === 'b' ? 'block' : 'atk', ...f.icons.slice(0, 4)];
  // the face polygon in canvas px (y down), inset by the bevel (R_BY metres) + 4% of the inradius as the margin
  const P = F.local.map(([x, y]) => [x * ppm, -y * ppm]); let A = 0; P.forEach(([x, y], i) => { const [u, v] = P[(i + 1) % P.length]; A += x * v - u * y; }); const sign = A > 0 ? -1 : 1; // interior side of the edges
  const inset = R_BY[poly.sides] * ppm * 1.15 + inR * 0.04; // inset = required clearance from every edge
  g.font = `800 100px Oxanium, "Trebuchet MS", sans-serif`; const txtW = g.measureText(txt).width / 100 * 0.94;
  const L = layout(P, sign, marks.length, txtW, inR, inset);   const { fs, is, ny, pts } = L || { fs: inR * .4, is: inR * .25, ny: -inR * .3, pts: marks.map((_, i) => [(i - (marks.length - 1) / 2) * inR * .3, inR * .2]) };
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000a'; g.fillText(txt, 0, ny + fs * .06); g.fillStyle = '#fff6'; g.fillText(txt, -fs * .02, ny - fs * .03);
  const [i0, i1] = ['#fffaf0', f.v === 0 ? '#b8aca0' : '#e6d6b8'];
  const tg = g.createLinearGradient(0, ny - fs / 2, 0, ny + fs / 2); tg.addColorStop(0, i0); tg.addColorStop(1, i1); g.fillStyle = tg; g.fillText(txt, 0, ny);
  marks.forEach((k, i) => icon(g, k, pts[i][0], pts[i][1], is));
}
function atlas(poly, faces, cell = 256) {
  const n = poly.faces.length; const cols = Math.ceil(Math.sqrt(n + 1)); const W = cols * cell; const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d', { willReadFrequently: true });
  // rev 5: every face cell gets the SAME flat body colour (rev 4 ran one gradient across the whole
  // atlas, so a face's colour depended on where it sat in the atlas and some dice came out much darker)
  const body = (k) => BODY[k]; g.fillStyle = body('r')[0]; g.fillRect(0, 0, W, W);
  const cellFill = (cx, cy, k) => { g.fillStyle = body(k)[0]; g.fillRect(cx - cell / 2, cy - cell / 2, cell, cell); }; // flat: the 3D lighting does the shading
  for (let i = 0; i <= n; i++) cellFill((i % cols + .5) * cell, ((i / cols | 0) + .5) * cell, 'r');
  
  let Hm = 0; poly.faces.forEach((f) => f.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); })); Hm *= 1.12;
  const ctr = (fi) => [(fi % cols + .5) * cell, ((fi / cols | 0) + .5) * cell];
  const uvOf = (fi, x, y) => { const [cx, cy] = ctr(fi); return [(cx + (x / Hm) * (cell / 2)) / W, 1 - (cy - (y / Hm) * (cell / 2)) / W]; };
  faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi); cellFill(cx, cy, f.c === 'n' ? 'n' : f.c === 'b' ? 'b' : 'r'); });
  grain(g, W, W, 7, 26); grain(g, W, W, 31, 16, 110); // the same grain over every face
  faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi);
    g.save(); g.translate(cx, cy); paintFace(g, poly, fi, f, cell, Hm); g.restore(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  const trim = ctr(n); return { t, uvOf, trimUV: [trim[0] / W, 1 - trim[1] / W], cv };
}

// dieSet(sides, faces, { px }): one PNG data URL per label 1..sides, each the die turned so that label faces the viewer (tipped a little).
// faces[label - 1] = { v, c: 'r' | 'b', icons: [kind...] }. One atlas, one solid, one render per label.
export function dieSet(sides, faces, { px = 200 } = {}) {
  setup(); R.setSize(px, px, false);
  const poly = makePoly(sides); const A = atlas(poly, faces); const geo = roundedGeometry(poly, { r: R_BY[sides], seg: 4, uvOf: A.uvOf, trimUV: A.trimUV });
  const bump = new THREE.CanvasTexture(A.cv); bump.flipY = true;
  const mat = new THREE.MeshPhysicalMaterial({ map: A.t, roughness: 0.5, metalness: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.5, bumpMap: bump, bumpScale: 1.4, envMapIntensity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh); const urls = [];
  const tilt = new THREE.Euler(-0.3, sides === 4 ? 0.22 : 0.24, 0); const dist = poly.outR / Math.tan((cam.fov / 2) * Math.PI / 180) * (sides === 4 ? 0.78 : 0.86);
  cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); mesh.position.y = sides === 4 ? -poly.outR * 0.08 : 0;
  for (let label = 1; label <= sides; label++) {
    const f = poly.faces[poly.labelFace[label - 1]]; const m = new THREE.Matrix4().makeBasis(f.e2, f.e1, f.n).transpose();
    mesh.quaternion.setFromRotationMatrix(m).premultiply(new THREE.Quaternion().setFromEuler(tilt));
    R.render(scene, cam); urls.push(R.domElement.toDataURL('image/png'));
  }
  scene.remove(mesh); geo.dispose(); mat.dispose(); A.t.dispose(); bump.dispose(); release();
  return urls;
}
