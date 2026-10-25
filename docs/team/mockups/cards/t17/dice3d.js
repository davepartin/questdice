// T17: pre-rendered "physical" dice for the static weapon card. Real polyhedra from the game (js/gfx/dice/poly.js makePoly +
// roundedGeometry, so the shapes and bevels match the battle tray), a stone-cast body tinted red (attack) or blue (block),
// crisp engraved ivory numerals and the game's bonus icon shapes (card-template SYM = css/powers.css colours).
// Each die is rendered once to a PNG data URL at 4x its card size, so it stays sharp at 2x DPR. No animation.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePoly, roundedGeometry } from '../../../../../js/gfx/dice/poly.js';
import { SYM } from '../card-template.js';
const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };
const BODY = { n: ['#a86e34', '#5a3410'], r: ['#c0141a', '#6e0508'], b: ['#1f5fd0', '#0b2a78'], z: ['#c0141a', '#6e0508'] }; // attack, block, a +0 (rev 5: same red as attack, so every red die matches; the +0 shows in its number)
const STONE = ['#4a4640', '#1c1a17']; // T17 rev 2 variant: Dave's reference, dark stone body; colour moves to the numbers and symbols
const INK = { n: ['#fff0d0', '#c8a070'], r: ['#ff8a80', '#d8262a'], b: ['#9cc8ff', '#2f7ae0'], z: ['#c8b8b0', '#8a7a72'] };
let R, scene, cam, env;
function setup() {
  if (R) return; R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.62; // rev 6: lower so bright icon colours are not washed out by the filmic curve R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env;
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-2.2, 3.4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.9); rim.position.set(3, 1.5, -2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
}
// seeded value noise for the stone grain
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
const RICH = { atk: '#e07a00', block: '#0b3c9e', gold: '#e39400', pierce: '#ee4400', magic: '#7410cc', heal: '#08a83a', star: '#e88600' }; // pre-tone-mapping, so they land rich
const icon = (g, k, x, y, s) => { const p = new Path2D((SYM[k] || SYM.star).d); const col = RICH[k] || (SYM[k] || SYM.star).c;
  const u = s / 24; const white = Math.min(9, s * 0.085) / u; // ~9 texture px on big icons, proportionally thinner on small d4 icons so the colour still dominates of white border (about 3-4 px on screen at the card's die sizes)
  g.save(); g.translate(x - s / 2, y - s / 2); g.scale(u, u); g.lineJoin = 'round';
  g.save(); g.translate(0, 5 / u); g.lineWidth = white; g.strokeStyle = '#3a0a0688'; g.stroke(p); g.restore(); // shadow under the stamp
  g.lineWidth = white; g.strokeStyle = '#fffdf6'; g.stroke(p); g.fillStyle = col; g.fill(p);
  g.save(); g.clip(p); g.lineWidth = 6 / u; g.translate(0, 3 / u); g.strokeStyle = '#0000004d'; g.stroke(p); g.translate(0, -6 / u); g.strokeStyle = '#ffffff66'; g.stroke(p); g.restore(); // inner bevel
  g.restore(); };
// atlas: one square cell per face; every face carries its own label (number, attack/block symbol, bonus icons) so the solid reads
// coherently from any angle. faces[label-1] = { v, c 'r'|'b', icons }.
// rev 10: a face layout system. Every face is fitted, not hand-tuned: the face's real polygon (poly.faces[fi].local, in texture px,
// shrunk by the rounded-edge bevel plus a margin) is the box; the number sits on top and the marks (attack/block mark + up to 4 bonus
// icons) go below in rows (1-3 in a row; 4 as 2x2; 5 as 3+2). For each row plan and a few vertical offsets, a binary search finds the
// largest scale where the number's box and every icon's circle (white border included) are inside the polygon; the best plan wins.
export const FIT = []; // per painted face: { sides, label, marks, scale, ok } (read by faces-test.html)
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
function paintFace(g, poly, fi, f, stone, cell, Hm, label) {
  const ppm = (cell / 2) / Hm; const F = poly.faces[fi]; const inR = F.inR2 * ppm; const tone = f.c === 'n' ? 'n' : f.v === 0 ? 'z' : f.c === 'b' ? 'b' : 'r';
  // rev 13: 'n' = a plain Bronze face (Dave direction, PROPOSAL): no attack/block marker, just the number, or nothing for a blank
  const plain = f.c === 'n' || f.plain; if (plain && !f.v && !f.icons.length) return;
  const txt = plain ? (f.v ? `${f.v}` : '') : `+${f.v}`; const marks = [...(plain ? [] : [f.c === 'b' ? 'block' : 'atk']), ...f.icons.slice(0, 4)];
  // the face polygon in canvas px (y down), inset by the bevel (R_BY metres) + 4% of the inradius as the margin
  const P = F.local.map(([x, y]) => [x * ppm, -y * ppm]); let A = 0; P.forEach(([x, y], i) => { const [u, v] = P[(i + 1) % P.length]; A += x * v - u * y; }); const sign = A > 0 ? -1 : 1; // interior side of the edges
  const inset = R_BY[poly.sides] * ppm * 1.15 + inR * 0.04; // inset = required clearance from every edge
  g.font = `800 100px Oxanium, "Trebuchet MS", sans-serif`; const txtW = g.measureText(txt).width / 100 * 0.94;
  const L = layout(P, sign, marks.length, txtW, inR, inset); const ok = !!L;
  const { fs, is, ny, pts } = L || { fs: inR * .4, is: inR * .25, ny: -inR * .3, pts: marks.map((_, i) => [(i - (marks.length - 1) / 2) * inR * .3, inR * .2]) };
  FIT.push({ sides: poly.sides, label, marks: marks.length, fs: +(fs / inR).toFixed(3), is: +(is / inR).toFixed(3), ok });
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000a'; g.fillText(txt, 0, ny + fs * .06); g.fillStyle = '#fff6'; g.fillText(txt, -fs * .02, ny - fs * .03);
  const [i0, i1] = stone ? INK[tone] : ['#fffaf0', f.v === 0 ? '#b8aca0' : '#e6d6b8'];
  const tg = g.createLinearGradient(0, ny - fs / 2, 0, ny + fs / 2); tg.addColorStop(0, i0); tg.addColorStop(1, i1); g.fillStyle = tg; g.fillText(txt, 0, ny);
  marks.forEach((k, i) => icon(g, k, pts[i][0], pts[i][1], is));
  if (DEBUG) { g.save(); g.strokeStyle = '#0f0'; g.lineWidth = 3; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); g.restore(); }
}
let DEBUG = false; export const setDebug = (v) => { DEBUG = v; };
// flat atlas cells for the test sheet: returns a data URL of the face (sides, faces[label-1]) painted on its own, with its outline
export function faceTile(sides, face, label = 1, px = 256) {
  const poly = makePoly(sides); const fi = poly.labelFace[label - 1]; let Hm = 0; poly.faces.forEach((q) => q.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); })); Hm *= 1.12;
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'); const ppm = 256 / Hm; const F = poly.faces[fi];
  g.translate(256, 256); g.beginPath(); F.local.forEach(([x, y], i) => (i ? g.lineTo(x * ppm, -y * ppm) : g.moveTo(x * ppm, -y * ppm))); g.closePath();
  g.fillStyle = BODY[face.c === 'b' ? 'b' : 'r'][0]; g.fill(); const was = DEBUG; DEBUG = true; paintFace(g, poly, fi, face, false, 512, Hm, label); DEBUG = was;
  const o = document.createElement('canvas'); o.width = o.height = px; o.getContext('2d').drawImage(cv, 0, 0, px, px); return o.toDataURL(); }
function atlas(poly, faces, tone, stone, cell = 512) {
  const n = poly.faces.length; const cols = Math.ceil(Math.sqrt(n + 1)); const W = cols * cell; const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d', { willReadFrequently: true });
  // rev 5: every face cell gets the SAME flat body colour (rev 4 ran one gradient across the whole
  // atlas, so a face's colour depended on where it sat in the atlas and some dice came out much darker)
  const body = (k) => stone ? STONE : BODY[k]; g.fillStyle = body(tone)[0]; g.fillRect(0, 0, W, W);
  const cellFill = (cx, cy, k) => { g.fillStyle = body(k)[0]; g.fillRect(cx - cell / 2, cy - cell / 2, cell, cell); }; // flat: the 3D lighting does the shading
  for (let i = 0; i <= n; i++) cellFill((i % cols + .5) * cell, ((i / cols | 0) + .5) * cell, tone);
  
  let Hm = 0; poly.faces.forEach((f) => f.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); })); Hm *= 1.12;
  const ctr = (fi) => [(fi % cols + .5) * cell, ((fi / cols | 0) + .5) * cell];
  const uvOf = (fi, x, y) => { const [cx, cy] = ctr(fi); return [(cx + (x / Hm) * (cell / 2)) / W, 1 - (cy - (y / Hm) * (cell / 2)) / W]; };
  if (!stone) faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi); cellFill(cx, cy, f.c === 'n' ? 'n' : f.c === 'b' ? 'b' : 'r'); });
  grain(g, W, W, 7, stone ? 52 : 26); grain(g, W, W, 31, stone ? 34 : 16, 110); // the same grain over every face
  faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi);
    g.save(); g.translate(cx, cy); paintFace(g, poly, fi, f, stone, cell, Hm, li + 1); g.restore(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  const trim = ctr(n); return { t, uvOf, trimUV: [trim[0] / W, 1 - trim[1] / W], cv };
}
// dieImage(sides, faces, label, { px, view: 'row' | 'slot', stone })  faces = the die's faces in label order (1..sides)
// 'row': the shown face toward the viewer, tipped a little. 'slot': resting on its socket seen from a higher oblique angle, so three
// faces of the solid show (top face = the shown label, plus two side faces with their own real labels).
export function dieImage(sides, faces, label, { px = 240, view = 'row', stone = false } = {}) {
  setup(); R.setSize(px, px, false);
  const poly = makePoly(sides); const f0 = faces[label - 1]; const tone = f0.c === 'n' ? 'n' : f0.v === 0 ? 'z' : f0.c === 'b' ? 'b' : 'r';
  const A = atlas(poly, faces, tone, stone); const geo = roundedGeometry(poly, { r: R_BY[sides], seg: 4, uvOf: A.uvOf, trimUV: A.trimUV });
  const bump = new THREE.CanvasTexture(A.cv); bump.flipY = true;
  const mat = new THREE.MeshPhysicalMaterial({ map: A.t, roughness: stone ? 0.78 : 0.5, metalness: 0.04, clearcoat: stone ? 0.1 : 0.4, clearcoatRoughness: 0.5, bumpMap: bump, bumpScale: stone ? 2 : 1.4, envMapIntensity: 0.32 });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  const f = poly.faces[poly.labelFace[label - 1]];
  const m = new THREE.Matrix4().makeBasis(f.e2, f.e1, f.n).transpose(); const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const tilt = view === 'slot' ? new THREE.Euler(sides === 4 ? -0.62 : -0.78, sides === 4 ? 0.5 : 0.62, 0, 'YXZ') : new THREE.Euler(-0.3, sides === 4 ? 0.22 : 0.24, 0);
  if (view === 'slot') { // face up toward +Y (resting), then view from above-front at an oblique angle
    q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
    q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sides === 4 ? 0.5 : 0.62, 0)));
  } else q.premultiply(new THREE.Quaternion().setFromEuler(tilt));
  mesh.quaternion.copy(q);
  const d = poly.outR / Math.tan((cam.fov / 2) * Math.PI / 180) * (view === 'slot' ? 1.18 : sides === 4 ? 0.78 : 0.86);
  if (view === 'slot') { const el = 0.72; cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d); } else cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0); mesh.position.y = view !== 'slot' && sides === 4 ? -poly.outR * 0.08 : 0;
  R.render(scene, cam); const url = R.domElement.toDataURL('image/png');
  scene.remove(mesh); geo.dispose(); mat.dispose(); A.t.dispose(); bump.dispose();
  return url;
}
