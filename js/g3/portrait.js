// Portraits: render any 3D object (a monster, a hero, a weapon) once into a transparent PNG with
// studio lighting, so DOM cards (quests, loot, camp, class select) show the same beautiful
// models as the battle instead of emoji. Uses its own tiny renderer so the main stage is untouched.
import * as THREE from 'three';
import { makeEnvironment } from '../gfx/env.js';

let R = null; let scene = null; let cam = null; let env = null; let rig = null;
const cache = new Map();

function ensure(size) {
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
  let target = ctr; let radius = sphere.radius;
  if (fit === 'bust') { target = new THREE.Vector3(ctr.x, box.max.y - sz.y * 0.28, ctr.z); radius = Math.max(sz.x * 0.55, sz.y * 0.3); }
  if (fit === 'head') { target = new THREE.Vector3(ctr.x, box.max.y - sz.y * 0.13, ctr.z); radius = Math.max(sz.x * 0.3, sz.y * 0.16); }
  const dist = (radius * pad) / Math.sin((fov * Math.PI) / 360) * (size[0] > size[1] ? 1 : 1);
  const fitH = (radius * pad) / Math.tan((fov * Math.PI) / 360) / Math.min(1, cam.aspect);
  const d = Math.max(fitH, dist * 0.7);
  cam.position.set(target.x + Math.sin(0) * d, target.y + Math.sin(pitch) * d, target.z + Math.cos(pitch) * d);
  cam.lookAt(target);
  R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  scene.remove(holder); holder.remove(obj);
  if (key) cache.set(key, url);
  return url;
}
export const hasPortrait = (key) => cache.has(key);
export function clearPortraits() { cache.clear(); }
