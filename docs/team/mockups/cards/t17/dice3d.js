// T17: pre-rendered "physical" dice for the static weapon card. Real polyhedra from the game (js/gfx/dice/poly.js makePoly +
// roundedGeometry, so the shapes and bevels match the battle tray), a stone-cast body tinted red (attack) or blue (block),
// crisp engraved ivory numerals and the game's bonus icon shapes (card-template SYM = css/powers.css colours).
// Each die is rendered once to a PNG data URL at 4x its card size, so it stays sharp at 2x DPR. No animation.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePoly, roundedGeometry } from '../../../../../js/gfx/dice/poly.js';
import { SYM } from '../card-template.js';
const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };
const BODY = { r: ['#6e0f12', '#2a0406'], b: ['#1b3f78', '#081530'], z: ['#4a2c2a', '#1c1110'] }; // attack, block, a +0 (dimmer red)
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
const icon = (g, k, x, y, s) => { const p = new Path2D((SYM[k] || SYM.star).d); g.save(); g.translate(x - s / 2, y - s / 2); g.scale(s / 24, s / 24);
  g.fillStyle = '#000a'; g.translate(.6, .9); g.fill(p); g.translate(-.6, -.9); g.fillStyle = (SYM[k] || SYM.star).c; g.fill(p); g.lineWidth = .9; g.strokeStyle = '#fff6'; g.stroke(p); g.restore(); };
// atlas: one square cell per face, painted with the body, and for the shown face the numeral and bonus icons
function atlas(poly, face, tone, cell = 512) {
  const n = poly.faces.length; const cols = Math.ceil(Math.sqrt(n + 1)); const W = cols * cell; const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d', { willReadFrequently: true });
  const [c0, c1] = BODY[tone]; const gr = g.createLinearGradient(0, 0, W, W); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, W, W); grain(g, W, W, 7 + n, 40); grain(g, W, W, 31 + n, 26, 110);
  let Hm = 0; poly.faces.forEach((f) => f.local.forEach((p) => { Hm = Math.max(Hm, Math.abs(p[0]), Math.abs(p[1])); })); Hm *= 1.12;
  const ctr = (fi) => [(fi % cols + .5) * cell, ((fi / cols | 0) + .5) * cell];
  const uvOf = (fi, x, y) => { const [cx, cy] = ctr(fi); return [(cx + (x / Hm) * (cell / 2)) / W, 1 - (cy - (y / Hm) * (cell / 2)) / W]; };
  const fi = poly.labelFace[face.label - 1]; const [cx, cy] = ctr(fi); const f = poly.faces[fi]; const ppm = (cell / 2) / Hm; const inR = f.inR2 * ppm;
  // a faint polished tablet inside the face so the numeral reads like a cut stone die
  g.save(); g.translate(cx, cy);
  const txt = `+${face.v}`; const fs = inR * (poly.sides === 4 ? 0.95 : txt.length > 2 ? 0.92 : 1.05);
  const icons = face.icons.slice(0, 3); const lift = icons.length ? -inR * 0.22 : 0;
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#0009'; g.fillText(txt, 0, lift + fs * .06);  // engraved shadow
  g.fillStyle = '#fff8'; g.fillText(txt, -fs * .02, lift - fs * .03);
  const tg = g.createLinearGradient(0, lift - fs / 2, 0, lift + fs / 2); tg.addColorStop(0, '#fffaf0'); tg.addColorStop(1, face.v === 0 ? '#b8aca0' : '#e6d6b8'); g.fillStyle = tg; g.fillText(txt, 0, lift);
  const is = inR * (icons.length > 1 ? 0.56 : 0.72); icons.forEach((k, i) => icon(g, k, (i - (icons.length - 1) / 2) * is * 1.05, lift + fs * .56 + is * .45, is));
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  const trim = ctr(n); return { t, uvOf, trimUV: [trim[0] / W, 1 - trim[1] / W], cv };
}
// face = { label (1..sides), v, c 'r'|'b', icons:[sym keys] }
export function dieImage(sides, face, px = 240) {
  setup(); R.setSize(px, px, false);
  const poly = makePoly(sides); const tone = face.v === 0 ? 'z' : face.c === 'b' ? 'b' : 'r';
  const A = atlas(poly, face, tone); const geo = roundedGeometry(poly, { r: R_BY[sides], seg: 4, uvOf: A.uvOf, trimUV: A.trimUV });
  const bump = new THREE.CanvasTexture(A.cv); bump.flipY = true;
  const mat = new THREE.MeshPhysicalMaterial({ map: A.t, roughness: 0.62, metalness: 0.08, clearcoat: 0.25, clearcoatRoughness: 0.5, bumpMap: bump, bumpScale: 1.4, envMapIntensity: 0.32 });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  const f = poly.faces[poly.labelFace[face.label - 1]];
  // turn the face toward the camera, numeral upright, then tip it a little so the bevels and side faces show
  const m = new THREE.Matrix4().makeBasis(f.e2, f.e1, f.n).transpose(); const q = new THREE.Quaternion().setFromRotationMatrix(m);
  q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, sides === 4 ? 0.22 : 0.24, 0)));
  mesh.quaternion.copy(q);
  const d = poly.outR / Math.tan((cam.fov / 2) * Math.PI / 180) * (sides === 4 ? 0.78 : 0.86); cam.position.set(0, 0, d); cam.lookAt(0, 0, 0);
  mesh.position.y = sides === 4 ? -poly.outR * 0.08 : 0;
  R.render(scene, cam); const url = R.domElement.toDataURL('image/png');
  scene.remove(mesh); geo.dispose(); mat.dispose(); A.t.dispose(); bump.dispose();
  return url;
}
