// T17: pre-rendered "physical" dice for the static weapon card. Real polyhedra from the game (js/gfx/dice/poly.js makePoly +
// roundedGeometry, so the shapes and bevels match the battle tray), a stone-cast body tinted red (attack) or blue (block),
// crisp engraved ivory numerals and the game's bonus icon shapes (card-template SYM = css/powers.css colours).
// Each die is rendered once to a PNG data URL at 4x its card size, so it stays sharp at 2x DPR. No animation.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePoly, roundedGeometry } from '../../../../../js/gfx/dice/poly.js';
import { SYM } from '../card-template.js';
const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };
const BODY = { r: ['#c0141a', '#6e0508'], b: ['#1f5fd0', '#0b2a78'], z: ['#c0141a', '#6e0508'] }; // attack, block, a +0 (rev 5: same red as attack, so every red die matches; the +0 shows in its number)
const STONE = ['#4a4640', '#1c1a17']; // T17 rev 2 variant: Dave's reference, dark stone body; colour moves to the numbers and symbols
const INK = { r: ['#ff8a80', '#d8262a'], b: ['#9cc8ff', '#2f7ae0'], z: ['#c8b8b0', '#8a7a72'] };
let R, scene, cam, env;
function setup() {
  if (R) return; R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.9; R.outputColorSpace = THREE.SRGBColorSpace;
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
// rev 5: each mark sits in a dark inset well and is filled in the game's saturated icon colour (SYM.c) with a dark outline, so the
// bonus reads on a red or blue body at phone size (no white wash)
const POP = { atk: '#ffd23a', block: '#7fd0ff' }; // the attack burst / block shield: brighter than the body so they never sink into it
const icon = (g, k, x, y, s) => { const p = new Path2D((SYM[k] || SYM.star).d); const col = POP[k] || (SYM[k] || SYM.star).c;
  g.save(); g.translate(x, y); const r = s * 0.6; const w = g.createRadialGradient(0, -r * .25, r * .1, 0, 0, r);
  w.addColorStop(0, '#2a0d08'); w.addColorStop(1, '#0d0403'); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = w; g.globalAlpha = .82; g.fill();
  g.globalAlpha = 1; g.lineWidth = s * .05; g.strokeStyle = '#ffffff30'; g.beginPath(); g.arc(0, s * .02, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.translate(-s * .4, -s * .4); g.scale(s * .8 / 24, s * .8 / 24); g.lineJoin = 'round'; g.lineWidth = 3.2; g.strokeStyle = '#000'; g.stroke(p);
  g.fillStyle = col; g.fill(p); g.restore(); };
// atlas: one square cell per face; every face carries its own label (number, attack/block symbol, bonus icons) so the solid reads
// coherently from any angle. faces[label-1] = { v, c 'r'|'b', icons }.
function paintFace(g, poly, fi, f, stone, cell, Hm) {
  const ppm = (cell / 2) / Hm; const inR = poly.faces[fi].inR2 * ppm; const tone = f.v === 0 ? 'z' : f.c === 'b' ? 'b' : 'r';
  const txt = `+${f.v}`; const fs = inR * (poly.sides === 4 ? 0.86 : poly.sides >= 8 ? 0.8 : txt.length > 2 ? 0.84 : 0.94);
  const marks = [f.c === 'b' ? 'block' : 'atk', ...f.icons.slice(0, 3)]; const lift = -inR * (poly.sides >= 8 ? 0.34 : 0.2);
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000a'; g.fillText(txt, 0, lift + fs * .06); g.fillStyle = '#fff6'; g.fillText(txt, -fs * .02, lift - fs * .03);
  const [i0, i1] = stone ? INK[tone] : ['#fffaf0', f.v === 0 ? '#b8aca0' : '#e6d6b8'];
  const tg = g.createLinearGradient(0, lift - fs / 2, 0, lift + fs / 2); tg.addColorStop(0, i0); tg.addColorStop(1, i1); g.fillStyle = tg; g.fillText(txt, 0, lift);
  // the attack starburst or block shield, always first and drawn in ivory (or ink) so shape alone tells them apart; bonus icons follow
  const big = poly.sides >= 8 ? 1.35 : 1; const is = inR * (marks.length > 2 ? 0.5 : 0.62) * big;
  marks.forEach((k, i) => icon(g, k, (i - (marks.length - 1) / 2) * is * 1.24, lift + fs * .55 + is * .5, is));
}
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
  if (!stone) faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi); cellFill(cx, cy, f.c === 'b' ? 'b' : 'r'); });
  grain(g, W, W, 7, stone ? 52 : 26); grain(g, W, W, 31, stone ? 34 : 16, 110); // the same grain over every face
  faces.forEach((f, li) => { const fi = poly.labelFace[li]; if (fi == null || fi < 0 || !f) return; const [cx, cy] = ctr(fi);
    g.save(); g.translate(cx, cy); paintFace(g, poly, fi, f, stone, cell, Hm); g.restore(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  const trim = ctr(n); return { t, uvOf, trimUV: [trim[0] / W, 1 - trim[1] / W], cv };
}
// dieImage(sides, faces, label, { px, view: 'row' | 'slot', stone })  faces = the die's faces in label order (1..sides)
// 'row': the shown face toward the viewer, tipped a little. 'slot': resting on its socket seen from a higher oblique angle, so three
// faces of the solid show (top face = the shown label, plus two side faces with their own real labels).
export function dieImage(sides, faces, label, { px = 240, view = 'row', stone = false } = {}) {
  setup(); R.setSize(px, px, false);
  const poly = makePoly(sides); const f0 = faces[label - 1]; const tone = f0.v === 0 ? 'z' : f0.c === 'b' ? 'b' : 'r';
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
  const d = poly.outR / Math.tan((cam.fov / 2) * Math.PI / 180) * (view === 'slot' ? 0.9 : sides === 4 ? 0.78 : 0.86);
  if (view === 'slot') { const el = 0.72; cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d); } else cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0); mesh.position.y = view !== 'slot' && sides === 4 ? -poly.outR * 0.08 : 0;
  R.render(scene, cam); const url = R.domElement.toDataURL('image/png');
  scene.remove(mesh); geo.dispose(); mat.dispose(); A.t.dispose(); bump.dispose();
  return url;
}
