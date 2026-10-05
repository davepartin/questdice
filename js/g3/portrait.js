// Portraits: render any 3D object (a monster, a hero, a weapon) once into a transparent PNG with
// studio lighting, so DOM cards (quests, loot, camp, class select) show the same beautiful
// models as the battle instead of emoji. Uses its own tiny renderer so the main stage is untouched.
import * as THREE from 'three';
import { makeEnvironment } from '../gfx/env.js';

let R = null; let scene = null; let cam = null; let env = null; let rig = null;
let shared = null; let rt = null; let rtKey = '';
const cache = new Map();

// A second WebGL context is very slow to warm up (and doubles shader compiles), so the game hands over the main
// stage's renderer: portraits are drawn into a half-float render target, tone mapped in JS, and returned as PNG.
export function shareRenderer(renderer, environment) { shared = { renderer, environment }; }

const ACES_IN = [0.59719, 0.35458, 0.04823, 0.076, 0.90834, 0.01566, 0.0284, 0.13383, 0.83777];
const ACES_OUT = [1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602];
const half = (u) => { const e = (u >> 10) & 31; const m = u & 1023; const v = e === 0 ? m * 5.960464477539063e-8 : e === 31 ? 65504 : (1 + m / 1024) * 2 ** (e - 15); return u & 0x8000 ? -v : v; };
const srgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function aces(r, g, b, exposure) {
  r *= exposure / 0.6; g *= exposure / 0.6; b *= exposure / 0.6;
  let a = ACES_IN[0] * r + ACES_IN[1] * g + ACES_IN[2] * b; let bb = ACES_IN[3] * r + ACES_IN[4] * g + ACES_IN[5] * b; let c = ACES_IN[6] * r + ACES_IN[7] * g + ACES_IN[8] * b;
  const fit = (v) => { const n = v * (v + 0.0245786) - 0.000090537; const d = v * (0.983729 * v + 0.4329510) + 0.238081; return n / d; };
  a = fit(a); bb = fit(bb); c = fit(c);
  const o = (i) => Math.min(1, Math.max(0, ACES_OUT[i * 3] * a + ACES_OUT[i * 3 + 1] * bb + ACES_OUT[i * 3 + 2] * c));
  return [o(0), o(1), o(2)];
}
function renderShared(size) {
  const r = shared.renderer; const key = size.join('x');
  if (!rt || rtKey !== key) { rt?.dispose(); rt = new THREE.WebGLRenderTarget(size[0], size[1], { type: THREE.HalfFloatType, samples: 4, depthBuffer: true }); rtKey = key; }
  const prevT = r.getRenderTarget(); const prevC = r.getClearColor(new THREE.Color()); const prevA = r.getClearAlpha(); const prevSM = r.shadowMap.enabled;
  scene.environment = (typeof shared.environment === 'function' ? shared.environment() : shared.environment) || null;
  r.shadowMap.enabled = false; r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, cam);
  const buf = new Uint16Array(size[0] * size[1] * 4); r.readRenderTargetPixels(rt, 0, 0, size[0], size[1], buf);
  r.setRenderTarget(prevT); r.setClearColor(prevC, prevA); r.shadowMap.enabled = prevSM;
  const cv = document.createElement('canvas'); cv.width = size[0]; cv.height = size[1]; const ctx = cv.getContext('2d'); const img = ctx.createImageData(size[0], size[1]);
  for (let y = 0; y < size[1]; y++) for (let x = 0; x < size[0]; x++) {
    const i = ((size[1] - 1 - y) * size[0] + x) * 4; const j = (y * size[0] + x) * 4;
    const al = Math.min(1, Math.max(0, half(buf[i + 3])));
    if (al < 0.003) { img.data[j + 3] = 0; continue; }
    const [rr, gg, bb] = aces(half(buf[i]) / al, half(buf[i + 1]) / al, half(buf[i + 2]) / al, 1.05);
    img.data[j] = srgb(rr) * 255; img.data[j + 1] = srgb(gg) * 255; img.data[j + 2] = srgb(bb) * 255; img.data[j + 3] = al * 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

function ensure(size) {
  if (shared) {
    if (!scene) {
      scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
      const key = new THREE.DirectionalLight(0xffd2a0, 3.4); key.position.set(-2.5, 3.2, 3.5);
      const rim = new THREE.DirectionalLight(0x7aa8ff, 2.6); rim.position.set(3, 2.2, -3);
      const fill = new THREE.HemisphereLight(0x8aa0d8, 0x2a2018, 0.55);
      rig = new THREE.Group(); rig.add(key, rim, fill); scene.add(rig);
    }
    cam.aspect = size[0] / size[1]; cam.updateProjectionMatrix();
    return;
  }
  if (!R) {
    const canvas = document.createElement('canvas');
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    R.setClearColor(0x000000, 0);
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
    env = makeEnvironment(R, { top: 0x1a2440, horizon: 0xc27a42, ground: 0x0c0a10 });
    scene.environment = env;
    const key = new THREE.DirectionalLight(0xffd2a0, 3.4); key.position.set(-2.5, 3.2, 3.5);
    const rim = new THREE.DirectionalLight(0x7aa8ff, 2.6); rim.position.set(3, 2.2, -3);
    const fill = new THREE.HemisphereLight(0x8aa0d8, 0x2a2018, 0.55);
    rig = new THREE.Group(); rig.add(key, rim, fill); scene.add(rig);
  }
  R.setSize(size[0], size[1], false);
  cam.aspect = size[0] / size[1]; cam.updateProjectionMatrix();
}

/**
 * @param {THREE.Object3D} obj  the model (it is temporarily added to the portrait scene)
 * @param {object} o { key, size:[w,h], yaw, pitch, fit:'full'|'bust'|'head', pad, fov, tilt }
 * @returns {string} PNG data URL
 */
export function portrait(obj, o = {}) {
  const { key, size = [256, 256], yaw = 0.55, pitch = 0.12, fit = 'full', pad = 1.12, fov = 28 } = o;
  if (key && cache.has(key)) return cache.get(key);
  ensure(size);
  cam.fov = fov; cam.updateProjectionMatrix();
  const holder = new THREE.Group(); holder.add(obj); scene.add(holder);
  holder.rotation.y = yaw;
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const ctr = sphere.center.clone();
  const sz = box.getSize(new THREE.Vector3());
  let target = ctr; let radius = Math.max(sz.y * 0.5, Math.hypot(sz.x, sz.z) * 0.5 / Math.max(0.6, cam.aspect));
  if (fit === 'bust') { target = new THREE.Vector3(ctr.x, box.max.y - sz.y * 0.28, ctr.z); radius = Math.max(sz.x * 0.55, sz.y * 0.3); }
  if (fit === 'head') { target = new THREE.Vector3(ctr.x, box.max.y - sz.y * 0.13, ctr.z); radius = Math.max(sz.x * 0.3, sz.y * 0.16); }
  const dist = (radius * pad) / Math.sin((fov * Math.PI) / 360) * (size[0] > size[1] ? 1 : 1);
  const fitH = (radius * pad) / Math.tan((fov * Math.PI) / 360) / Math.min(1, cam.aspect);
  const d = Math.max(fitH, dist * 0.7);
  cam.position.set(target.x + Math.sin(0) * d, target.y + Math.sin(pitch) * d, target.z + Math.cos(pitch) * d);
  cam.lookAt(target);
  let url;
  if (shared) url = renderShared(size);
  else { R.render(scene, cam); url = R.domElement.toDataURL('image/png'); }
  scene.remove(holder); holder.remove(obj);
  if (key) cache.set(key, url);
  return url;
}
export const hasPortrait = (key) => cache.has(key);
export function clearPortraits() { cache.clear(); }
