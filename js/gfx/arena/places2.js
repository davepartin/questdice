// Places, part 2: Cinder Ford, Ravens' Rest, Wolfwood Edge, Smoke Hollow, The Toll Bridge, Ashfall Camp, Gallows Hill.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rr, scatter, inClear, smoothstep, CLEAR, instanced, finishGeo, xf } from './common.js';
import { applyPalette, buildBackdrop, defaultPropMats } from './kit.js';
import { dryTree, pine, pineCard, rock, slab, cattail } from './flora.js';
import { hillsHeight, vcolorFn, grassField, rockField, treePoint, placeTrees } from './helpers.js';
import { texMat, rockTex, needleTex, soilTex, ashTex, bannerTex, glintTex } from './tex.js';
import { Emitter } from './fx.js';
import { waterMaterial } from './ground.js';
import { barrel, crate, skull, bone, ribcage, brazier, ruinWall, toppledCart, fenceRun, wagon, steppingStone, wheel } from './props.js';

const LOOK = (o) => ({ bloom: 0.45, bloomRadius: 0.5, bloomThreshold: 1.05, vignette: 0.5, sat: 1.1, contrast: 1.1, tilt: 0.1, focusY: 0.5, grain: 0.04, exposure: 1.0, shadowTint: 0xdbf0ff, highTint: 0xfff0dc, aberration: 0.0004, ...o });
const ENV = (top, hor, gnd, warm, cold) => ({ top, horizon: hor, ground: gnd, lights: [{ color: warm, intensity: 14, pos: [-6, 3, 4], size: 4 }, { color: cold, intensity: 7, pos: [5, 6, -6], size: 5 }, { color: 0xffffff, intensity: 1.2, pos: [0, 9, 0], size: 5 }] });

// ---- shared bits ------------------------------------------------------------------------------------
function ribbon(c, { center, half, t0 = -160, t1 = 160, y = -0.12, axis = 'x', mat, rows = 6, steps = 90 }) {
  const pos = []; const uv = []; const idx = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * i / steps; const [cx, cz] = center(t); const h = half(t);
    for (let j = 0; j <= rows; j++) {
      const k = j / rows; const o = (k - 0.5) * 2 * h;
      pos.push(axis === 'x' ? t : cx + o, y, axis === 'x' ? cz + o : t);
      uv.push(i / steps, k);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j; idx.push(a, a + 1, a + rows + 1, a + 1, a + rows + 2, a + rows + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.frustumCulled = false; m.name = 'river'; c.add(m); c.tris += idx.length / 3; return m;
}
function flagBanner(c, p, { h = 4, tex, w = 1.3, len = 1.9, yaw = 0 }) {
  const { B, rng } = c;
  B.cyl('wood', [0.05, 0.07, h, 6], { p: [p[0], p[1] + h / 2, p[2]] }, [0.7, 0.65, 0.6]);
  B.sph('iron', [0.09, 6, 5], { p: [p[0], p[1] + h + 0.02, p[2]] }, [0.7, 0.7, 0.7]);
  const g = new THREE.PlaneGeometry(w, len, 8, 10); g.translate(w / 2, -len / 2, 0);
  const m = c.arenaMat(`flag|${tex.uuid}`, () => new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.4 }), { flag: 0.5 });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(p[0] + 0.05, p[1] + h - 0.1, p[2]); mesh.rotation.y = yaw; mesh.castShadow = false; mesh.frustumCulled = false; c.add(mesh); c.tris += 160;
}
function pinesAt(c, { pos, scale = [1, 1.5], frost = 0.1, color = [0.55, 0.62, 0.58], tex = {} }) {
  const near = [0, 1, 2].map((i) => pine(c.seed * 9 + i, { h: 8 + i, r: 1.9, tiers: 9, K: 8, frost, color }));
  const mat = c.arenaMat(`pine|${frost}`, () => texMat(needleTex(tex), { repeat: 1, vertexColors: true, envMapIntensity: 0.3 }), { wind: 1, windK: 0.004, windSpeed: 1.1 });
  const lists = near.map(() => []);
  pos.forEach(([x, z, s]) => { const v = Math.floor(c.rng() * 3); const sc = rr(c.rng, scale[0], scale[1]) * (s || 1); const k = rr(c.rng, 0.65, 1); lists[v].push({ p: [x, c.hAt(x, z) - 0.1, z], r: c.rng() * 6.28, s: sc, c: new THREE.Color(k, k, k) }); });
  near.forEach((g, i) => { const n = lists[i].filter((it) => Math.abs(it.p[0]) < 13 && it.p[2] > -14); const f = lists[i].filter((it) => !(Math.abs(it.p[0]) < 13 && it.p[2] > -14)); if (f.length) c.addInstanced(g, mat, f); if (n.length) c.addInstanced(g, mat, n, { cast: true }); });
}
function eyes(c, pts, color = 0xffd040, k = 2.2) {
  pts.forEach(([x, y, z], i) => { for (const s of [-1, 1]) c.glows.push({ p: [x + s * 0.09, y, z], s: 0.16, c: color, k, flick: 0.15, seed: i * 2 + (s > 0 ? 1 : 0) }); });
}
function ravenGeo() {
  const parts = [];
  const mk = (g, col = [0.05, 0.05, 0.07]) => finishGeo(g, { color: col, uv: 0 });
  parts.push(mk(new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.8, 1.7)));
  parts.push(mk(new THREE.SphereGeometry(0.07, 7, 5).translate(0, 0.07, 0.17)));
  parts.push(mk(new THREE.ConeGeometry(0.025, 0.12, 5).rotateX(Math.PI / 2).translate(0, 0.06, 0.28)));
  parts.push(mk(new THREE.BoxGeometry(0.1, 0.01, 0.26).translate(0, 0, -0.3)));
  for (const s of [-1, 1]) parts.push(mk(new THREE.BoxGeometry(0.3, 0.015, 0.2).translate(s * 0.17, 0.02, 0).rotateZ(s * -0.5)));
  return mergeGeometries(parts, false);
}

// =====================================================================================================
// CINDER FORD
// =====================================================================================================
export function cinderFord(c) {
  const { rng, B } = c;
  const zc = (x) => -12.5 + Math.sin(x * 0.07) * 2.6 + Math.sin(x * 0.17 + 1) * 0.8;
  const hw = (x) => 5.4 + Math.sin(x * 0.11 + 2) * 1.3;
  const carve = (x, z, h) => { const d = Math.abs(z - zc(x)); const w = hw(x); const k = smoothstep(w + 2.6, w * 0.55, d); return h * (1 - k) + (-0.55) * k; };
  const ground = {
    height: hillsHeight({ seed: 5, amp: 1.2, freq: 0.03, backRise: 5, backStart: -48, sideRise: 3, sideStart: 16, carve }),
    vcolor: vcolorFn(5, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x6a665c, dark: 0x1a1a1c, seed: 12, pebble: 1.0, damp: 0.5 }), scale: 0.32 },
      { kind: 'grass', tint: 0x3c4a34, dark: 0x0e140c, scale: 0.42, size: 512, seed: 13, opts: { dry: 0.3, dryTint: 0x5a5a3a } },
      { set: soilTex({ tint: 0x7a7a80, dark: 0x1c1c22, seed: 14, pebble: 2.4 }), scale: 0.37 },
      { set: ashTex({ tint: 0x3a3a3c, dark: 0x0a0a0c, seed: 15, cracks: 0.15 }), scale: 0.26 },
    ],
    thresholds: [0.64, 0.62, 0.62], wet: [0.6, 0.5], nstr: 2.0,
  };
  applyPalette(c, {
    sky: { hor: 0x2a3858, mid: 0x1a2444, top: 0x070b1c, glows: [{ az: 18, w: 26, h: 4.5, color: 0xff6a24, k: 1.15 }, { az: -30, w: 50, h: 5, color: 0x4a70b8, k: 0.5 }], moon: { on: 1, az: -22, el: 3.4, size: 2.4, color: 0xd8e6ff }, stars: 0.9, cloud: 0.5, cloudDark: 0x141c34, cloudLit: 0x6a8ad0 },
    fog: { base: 0x1c2a40, dens: 0.0105, fall: 0.25, height: 0.6, glow: 0.8 },
    env: ENV(0x18285a, 0x5a78c0, 0x0a0e18, 0xff8a4a, 0x7aa0ff),
    key: { color: 0xa8c4ff, intensity: 2.1, pos: [-4.8, 4.2, 4.4] },
    rim: { color: 0xff8a50, intensity: 1.2, pos: [4, 4, -9] },
    hemi: { sky: 0x3a4a78, ground: 0x2a2a30, intensity: 0.5 },
    look: LOOK({ bloom: 0.85, sat: 1.05, contrast: 1.12, shadowTint: 0xb0d0ff, highTint: 0xfff0e0 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: 16, haze: 0.6, color: 0x141c30, seed: 3, rim: 0x6a8ad0, rimK: 0.5 }, { radius: 150, arc: 1.9, top: 9, mode: 0, haze: 0.45, color: 0x0c1220, seed: 4, toothW: 4, toothH: 5 }] });
  defaultPropMats(c, { wood: 0x3a3028 });
  // river + ripples
  const wm = waterMaterial(c.U, { deep: 0x0a1424, shallow: 0x2a4050, spark: 0xff8a40, ripple: 1.0, flow: 1.2, tl: 0.075, tlCol: 0x060a14, sparkK: 1.6 }, 'RIVER');
  ribbon(c, { center: (x) => [x, zc(x)], half: hw, mat: wm, y: -0.1 });
  // stepping stones across
  for (let i = 0; i < 9; i++) { const x = -3.2 + i * 0.95 + (rng() - 0.5) * 0.3; steppingStone(B, rng, { p: [x, -0.08, zc(x) + Math.sin(i * 1.7) * 1.2], s: [rr(rng, 0.8, 1.2), 1, rr(rng, 0.8, 1.1)] }); }
  for (let i = 0; i < 25; i++) { const x = rr(rng, -22, 22); const z = zc(x) + rr(rng, -hw(x) * 0.9, hw(x) * 0.9); steppingStone(B, rng, { p: [x, -0.1, z], s: [rr(rng, 0.25, 0.7), 0.5, rr(rng, 0.25, 0.7)] }); }
  // wrecked bridge: two broken piers and a collapsed span
  const bz = zc(0) - 17;
  for (const x of [-18, -6, 6, 18]) B.box('stoneDark', [3.2, 6.2, 4.2], { p: [x, 1.5, bz + Math.sin(x * 0.07) * 2.6] }, [0.6, 0.6, 0.65], { cast: false, uv: 0.3 });
  for (const [x, len, tilt, y] of [[-12, 8, 0.03, 4.5], [12, 8, -0.04, 4.4], [-1, 5, 0.5, 3]]) B.box('stoneDark', [len, 0.8, 3.6], { p: [x, y, bz], r: [0, 0, tilt] }, [0.55, 0.55, 0.6], { cast: false, uv: 0.3 });
  for (let i = 0; i < 22; i++) { const x = rr(rng, -10, 10); B.box('stoneDark', [rr(rng, 0.5, 1.6), rr(rng, 0.4, 1), rr(rng, 0.5, 1.4)], { p: [x, rr(rng, -0.2, 2.5), bz + rr(rng, -2, 2)], r: [rng(), rng() * 3, rng()] }, [0.5, 0.5, 0.55], { cast: false }); }
  c.fire({ p: [-14, 4.9, bz], w: 1.6, h: 3.2, power: 1.1, embers: 10, smoke: 0.35, glow: 1.3 });
  c.fire({ p: [14.5, 4.9, bz], w: 1.2, h: 2.6, power: 0.9, embers: 6, smoke: 0.3, glow: 1.1 });
  c.fire({ p: [26, 0.5, bz - 6], w: 2.5, h: 5, power: 1.0, embers: 8, smoke: 0.4, glow: 1.4 });
  c.fire({ p: [-7.5, 0.1, -0.5], w: 0.6, h: 1.1, power: 0.9, light: true, lightColor: 0xff8a40, lightI: 22, lightDist: 12, embers: 8, tongues: 2 }); // burning wreck in the shallows
  B.box('woodChar', [2.4, 0.2, 0.9], { p: [-7.5, 0.14, -0.5], r: [0, 0.4, 0.1] }, [0.7, 0.7, 0.7]);
  B.box('woodChar', [1.6, 0.18, 0.7], { p: [-7.2, 0.26, -0.7], r: [0, -0.6, 0.3] }, [0.7, 0.7, 0.7]);
  // reeds
  const reedG = [0, 1].map((i) => cattail(c.seed + i * 5, { h: 1.3 + i * 0.4 }));
  const reedM = c.arenaMat('reed', () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), { wind: 1, windK: 0.45, windSpeed: 1.5 });
  reedG.forEach((g) => { const items = []; for (let i = 0; i < c.n(110); i++) { const x = rr(rng, -26, 26); const side = rng() < 0.5 ? -1 : 1; const z = zc(x) + side * (hw(x) * rr(rng, 0.75, 1.15)); if (inClear(x, z, 0.5)) continue; items.push({ p: [x, c.hAt(x, z) + (Math.abs(z - zc(x)) < hw(x) ? -0.1 : 0), z], r: rng() * 6, s: rr(rng, 0.7, 1.5), c: new THREE.Color(rr(rng, 0.7, 1), rr(rng, 0.7, 1), rr(rng, 0.6, 0.9)) }); } c.addInstanced(g, reedM, items); });
  grassField(c, { n: 600, tint: [0.4, 0.5, 0.36], root: [0.03, 0.05, 0.03], hmin: 0.2, hmax: 0.5, rejectFn: (x, z) => Math.abs(z - zc(x)) < hw(x) + 0.5 });
  rockField(c, { n: 45, tint: 0x6a6a70, dark: 0x1a1a20, big: [0.4, 1.3], area: { x: [-30, 30], z: [-8, 8] }, pebbles: 70, rejectNone: true });
  c.puddles = [[-6.8, 3.5, 1.8], [7, 1.5, 2.2], [-3.6, -3.2, 1.4], [6.4, 6.5, 1.5], [-8.5, 7, 1.2]];
  c.puddleOpts = { deep: 0x0a1424, shallow: 0x2a4050, spark: 0xff8a40, tl: 0.07, tlCol: 0x060a14, mirror: 0.15 };
  [[0, 0.3, -9, 60, 16], [-12, 0.6, -14, 46, 14], [10, 0.5, -3, 28, 14], [0, 0.9, -24, 90, 30]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x2a3e5a, dens: 0.34, scale: 0.9, speed: 0.9, seed: i * 2.1 }));
  [[0, 0, -22, 80, 8], [0, 0, -40, 120, 12]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x34486a, dens: 0.4, scale: 0.7, speed: 0.6, seed: 3 + i }));
  c.ambient = { ash: 5, ambientEmbers: 3, wind: 0.5, ashColor: 0x9aa4b4 };
}

// =====================================================================================================
// RAVENS' REST
// =====================================================================================================
export function ravensRest(c) {
  const { rng, B } = c;
  const ground = {
    height: hillsHeight({ seed: 9, amp: 2.4, freq: 0.04, backRise: 6, backStart: -30, sideRise: 6, sideStart: 12, ridgeAmp: 2 }),
    vcolor: vcolorFn(9, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x6a6a68, dark: 0x1a1a1c, seed: 22, pebble: 1.2 }), scale: 0.32 },
      { kind: 'grass', tint: 0x4a5040, dark: 0x101410, scale: 0.42, size: 512, seed: 23, opts: { dry: 0.8, dryTint: 0x6a6a56 } },
      { set: soilTex({ tint: 0x7a7a80, dark: 0x1c1c22, seed: 24, pebble: 2.6 }), scale: 0.3 },
      { set: ashTex({ tint: 0x38383a, dark: 0x0a0a0c, seed: 25, cracks: 0.05 }), scale: 0.26 },
    ],
    thresholds: [0.6, 0.66, 0.7], wet: [0.82, 0.2], nstr: 2.2, tintMul: 0xdfe2ea,
  };
  applyPalette(c, {
    sky: { hor: 0x424a5a, mid: 0x2a3042, top: 0x0c101c, glows: [{ az: 5, w: 70, h: 6, color: 0x8a9cc0, k: 0.7 }, { az: 55, w: 25, h: 4, color: 0xff6a30, k: 0.35 }], moon: { on: 1, az: 12, el: 3.2, size: 3.0, color: 0xdce8ff }, stars: 0.6, cloud: 0.7, cloudDark: 0x1c2232, cloudLit: 0x8aa0c8 },
    fog: { base: 0x2a3244, dens: 0.0125, fall: 0.28, height: 0.7, glow: 0.7 },
    env: ENV(0x20305a, 0x7088b0, 0x0a0c12, 0xff9a60, 0x8aa8ff),
    key: { color: 0xb8ccff, intensity: 2.0, pos: [-4.6, 4.4, 4.6] },
    rim: { color: 0xffa070, intensity: 1.0, pos: [4, 4, -9] },
    hemi: { sky: 0x4a5878, ground: 0x30302c, intensity: 0.55 },
    look: LOOK({ sat: 0.82, contrast: 1.14, vignette: 0.56, bloom: 0.8, shadowTint: 0xb8d0ff, highTint: 0xf0f0f4 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: 20, haze: 0.55, color: 0x1a2030, seed: 5, rim: 0x9ab0e0, rimK: 0.5 }, { radius: 140, arc: 1.9, top: 11, mode: 2, haze: 0.4, color: 0x10141e, seed: 6, toothW: 7, toothH: 8 }] });
  defaultPropMats(c, { wood: 0x3a342e, stone: 0x6a6c72 });
  // crags
  const crags = [0, 1, 2].map((i) => rock(c.seed + i * 3, { detail: 2, amp: 0.5, freq: 1.1, flat: 1.7, ridged: true, uv: 0.09 }));
  const cm = c.arenaMat('crag', () => texMat(rockTex({ tint: 0x6a6c74, dark: 0x181a20, seed: 31, lichenAmt: 0.4, lichen: 0x4a5a4a }), { repeat: 1, vertexColors: true }), {});
  const cl = [[], [], []];
  [[-14, -3, 2.6], [-17, -12, 4], [-24, -22, 7], [14.5, -5, 2.4], [18, -16, 4.2], [26, -28, 8], [-8, -34, 7], [6, -40, 9], [-32, -10, 7], [34, -8, 7]].forEach(([x, z, s]) => { cl[Math.floor(rng() * 3)].push({ p: [x, c.hAt(x, z) - s * 0.2, z], r: rng() * 6, s: [s, s * rr(rng, 0.9, 1.3), s * 0.85], c: new THREE.Color(0.8, 0.8, 0.85) }); });
  crags.forEach((g, i) => { const near = cl[i].filter((it) => Math.abs(it.p[0]) < 14 && it.p[2] > -16); const far = cl[i].filter((it) => !near.includes(it)); if (far.length) c.addInstanced(g, cm, far); if (near.length) c.addInstanced(g, cm, near, { cast: true }); });
  // standing stones in an arc behind the field
  const sl = [0, 1, 2].map((i) => slab(c.seed * 5 + i, { w: 1.3, h: 3.2 + i * 0.6, d: 0.8 }));
  const slm = c.arenaMat('slab', () => texMat(rockTex({ tint: 0x76767c, dark: 0x1c1c22, seed: 32, lichenAmt: 0.8, lichen: 0x5a6a4a }), { repeat: 1, vertexColors: true }), {});
  const slists = [[], [], []];
  for (let i = 0; i < 9; i++) { const a = -1.3 + i * 0.33; const R = 15 + rng() * 2; const x = Math.sin(a) * R; const z = -Math.cos(a) * R + 2; if (inClear(x, z, 1) || rng() < 0.15) continue; slists[i % 3].push({ p: [x, c.hAt(x, z) - 0.2, z], r: a + rr(rng, -0.4, 0.4), s: rr(rng, 0.9, 1.4), c: new THREE.Color(0.85, 0.85, 0.9) }); }
  sl.forEach((g, i) => { if (slists[i].length) c.addInstanced(g, slm, slists[i], { cast: true }); });
  // the giant dead tree thick with ravens
  const big = dryTree(c.seed * 3, { h: 9, r: 0.95, limbs: 8, spread: 1.3, depth: 3, curl: 0.55, radial: 8, lean: 0.15, droop: 0.1, twigsMax: 3, limbLen: 0.7, bark: [0.2, 0.18, 0.17], tip: [0.34, 0.32, 0.32], splitTop: true });
  const bm = c.arenaMat('bigBark', () => c.libMat('bark', { tint: 0x4a4440, dark: 0x0c0a0a }).clone(), { wind: 1, windK: 0.002 }, { vertexColors: true });
  const tx = 9.5; const tz = -13; const tItem = { p: [tx, c.hAt(tx, tz), tz], r: 0.6, s: 1.3, c: new THREE.Color(1, 1, 1) };
  c.addInstanced(big.geo, bm, [tItem], { cast: true });
  const rg = ravenGeo();
  const rm = c.arenaMat('raven', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, color: 0x9090a8 }), {});
  const perches = big.tips.concat(big.forks).map((t) => treePoint(tItem, t));
  const ravens = [];
  const nR = c.n(34);
  for (let i = 0; i < nR; i++) { const pp = perches[Math.floor(rng() * perches.length)]; ravens.push({ home: [pp[0] + (rng() - 0.5) * 0.3, pp[1] + 0.1, pp[2] + (rng() - 0.5) * 0.3], yaw: rng() * 6.28, lift: 4 + rng() * 14, dir: rng() * 6.28, off: rng() }); }
  for (let i = 0; i < c.n(14); i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 6, 12); const z = rr(rng, -6, 2); const y = c.hAt(x, z) + 0.12; ravens.push({ home: [x, y, z], yaw: rng() * 6.28, lift: 3, dir: rng() * 6.28, off: rng() }); }
  const rmesh = instanced(rg, rm, ravens.map((r) => ({ p: r.home, r: r.yaw, s: 1 })), { cast: false }); c.add(rmesh);
  const M4 = new THREE.Matrix4(); const Qn = new THREE.Quaternion(); const Ev = new THREE.Euler(); const Pv = new THREE.Vector3(); const Sv = new THREE.Vector3();
  c.ticks.push((dt, t) => {
    ravens.forEach((r, i) => {
      // every ~16 s a different third of the flock lifts off, circles and settles again
      const period = 16; const ph = ((t + r.off * 3 + (i % 3) * 5.3) % period + period) % period; const flying = ph > 12.5 && ((Math.floor(t / period) + i) % 3 === 0);
      let x = r.home[0]; let y = r.home[1]; let z = r.home[2]; let yaw = r.yaw; let flap = 1;
      if (flying) { const k = (ph - 12.5) / 3.5; const e = Math.sin(k * Math.PI); x += Math.cos(r.dir) * k * 14; z += Math.sin(r.dir) * k * 10 - k * 3; y += e * r.lift; yaw = -r.dir + 1.57; flap = 0.75 + 0.5 * Math.sin(t * 22 + i); }
      Ev.set(0, yaw, 0); Qn.setFromEuler(Ev); Pv.set(x, y, z); Sv.set(1, flap, 1); M4.compose(Pv, Qn, Sv); rmesh.setMatrixAt(i, M4);
    });
    rmesh.instanceMatrix.needsUpdate = true;
  });
  // bones + cold ground
  for (let i = 0; i < 10; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 5.8, 9); skull(B, { p: [x, 0, rr(rng, -4, 6)], r: rng() * 6 }); bone(B, { p: [x + 0.4, 0.03, rr(rng, -4, 6)], r: [0, rng() * 3, 0] }, { len: 0.5 }); }
  ribcage(B, { p: [-7.2, 0.05, 1.2], r: 0.7 });
  grassField(c, { n: 500, tint: [0.42, 0.45, 0.4], root: [0.04, 0.045, 0.04], hmin: 0.2, hmax: 0.5, wind: 1.3 });
  rockField(c, { n: 50, tint: 0x6a6c74, dark: 0x1a1a20, big: [0.5, 1.6], area: { x: [-30, 30], z: [-40, 10] }, pebbles: 70, lichen: 0.3 });
  c.fire({ p: [-6.8, 0, -2.2], w: 0.5, h: 0.9, power: 0.7, light: true, lightColor: 0xff9050, lightI: 16, lightDist: 10, embers: 5, tongues: 2, glow: 0.8 });
  [[0, 0.5, -8, 50, 14], [-10, 0.8, -16, 60, 18], [8, 0.4, 2, 24, 12], [0, 1.2, -28, 100, 30], [-8, 0.3, 4, 20, 10]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x56627a, dens: 0.5, scale: 0.8, speed: 0.7, seed: i * 3.1 }));
  [[0, 0, -18, 80, 9], [0, 0, -34, 110, 14]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x4a566e, dens: 0.5, scale: 0.7, speed: 0.5, seed: 4 + i }));
  c.ambient = { ash: 3, ambientEmbers: 1, wind: 0.8, ashColor: 0xb0b8c8 };
}

// =====================================================================================================
// WOLFWOOD EDGE
// =====================================================================================================
export function wolfwoodEdge(c) {
  const { rng, B } = c;
  const ground = {
    height: hillsHeight({ seed: 12, amp: 1.2, freq: 0.03, backRise: 3, backStart: -40, sideRise: 2, sideStart: 14 }),
    vcolor: vcolorFn(12, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x4a4038, dark: 0x120e0c, seed: 32, pebble: 0.4, damp: 0.3 }), scale: 0.3 },
      { kind: 'grass', tint: 0x6a8aa0, dark: 0x1a2630, scale: 0.4, size: 512, seed: 33, opts: { dry: 0.5, dryTint: 0xaac0d0 } },
      { set: soilTex({ tint: 0x6a7480, dark: 0x181c22, seed: 34, pebble: 2.4 }), scale: 0.3 },
      { set: ashTex({ tint: 0x303840, dark: 0x080a0e, seed: 35, cracks: 0.0 }), scale: 0.26 },
    ],
    thresholds: [0.5, 0.74, 0.8], wet: [0.8, 0.15], nstr: 2.2, tintMul: 0xe4eeff,
  };
  applyPalette(c, {
    sky: { hor: 0x1a3048, mid: 0x0e1c34, top: 0x040814, glows: [{ az: 0, w: 55, h: 5, color: 0x4a82c0, k: 0.8 }], moon: { on: 1, az: -18, el: 3.3, size: 2.2, color: 0xe4f0ff }, stars: 1.0, cloud: 0.35, cloudDark: 0x0c1428, cloudLit: 0x4a78b8 },
    fog: { base: 0x14263a, dens: 0.013, fall: 0.3, height: 0.7, glow: 0.8 },
    env: ENV(0x0c1c48, 0x3a6ab0, 0x080c14, 0x8ab0ff, 0x5a90ff),
    key: { color: 0x9cc0ff, intensity: 2.3, pos: [-4.4, 4.8, 4.2] },
    rim: { color: 0xc0d8ff, intensity: 1.5, pos: [4, 5, -9] },
    hemi: { sky: 0x3a5a90, ground: 0x182030, intensity: 0.6 },
    look: LOOK({ bloom: 0.8, sat: 1.0, contrast: 1.15, vignette: 0.58, shadowTint: 0x9cc8ff, highTint: 0xe8f0ff, exposure: 1.05 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: 16, mode: 1, haze: 0.55, color: 0x0a1424, seed: 7, toothW: 5, toothH: 9, rim: 0x6a9ae0, rimK: 0.35 }, { radius: 150, arc: 1.9, top: 8, mode: 1, haze: 0.42, color: 0x070e1a, seed: 8, toothW: 4, toothH: 8 }] });
  defaultPropMats(c, { wood: 0x3a2e26 });
  // pine wall: rows closing in from the sides and across the back
  const pos = [];
  for (let z = 4; z > -70; z -= 3.0 + rng() * 1.6) for (const sx of [-1, 1]) { const x = sx * (6.6 + rng() * 2.2 + (z < -10 ? (-z - 10) * 0.05 : 0)); pos.push([x, z + rng(), 1]); pos.push([sx * (11 + rng() * 5), z + rng() * 2, 1.2]); if (z < -4) pos.push([sx * (17 + rng() * 10), z, 1.3]); }
  for (let x = -7; x < 7; x += 3.2 + rng() * 1.5) { const z = -20 - rng() * 18; pos.push([x, z, 1.1]); }
  for (let x = -40; x < 40; x += 3 + rng() * 2) { pos.push([x, -44 - rng() * 14, 1.5]); pos.push([x + 1.2, -58 - rng() * 14, 1.7]); }
  pinesAt(c, { pos: pos.filter((p) => !inClear(p[0], p[1], 0.8)).slice(0, c.n(190) + 90), frost: 0.12 });
  // far cards
  const cards = [0, 1].map((i) => pineCard(c.seed + i, { h: 10, w: 3 }));
  const cardM = c.arenaMat('pinecard', () => new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x24343c, roughness: 1, side: THREE.DoubleSide }), {});
  cards.forEach((g, i) => { const it = []; for (let k = 0; k < c.n(70); k++) { const x = rr(rng, -90, 90); const z = rr(rng, -110, -70); it.push({ p: [x, c.hAt(x, z), z], r: rng() * 6, s: rr(rng, 1.2, 2.4) }); } c.addInstanced(g, cardM, it); });
  // glowing wolf eyes in the dark
  const ep = []; for (let i = 0; i < 9; i++) { const sx = i % 2 ? 1 : -1; const x = sx * rr(rng, 8, 20); const z = rr(rng, -26, -4); ep.push([x, c.hAt(x, z) + rr(rng, 0.5, 0.9), z]); }
  eyes(c, ep, 0xffd040, 2.4);
  // frost + stones + stumps
  rockField(c, { n: 36, tint: 0x66707c, dark: 0x14181e, big: [0.4, 1.3], area: { x: [-26, 26], z: [-30, 10] }, pebbles: 40, lichen: 0.2, tintMul: [0.85, 0.95, 1.1] });
  grassField(c, { n: 800, tint: [0.55, 0.68, 0.74], root: [0.04, 0.06, 0.07], hmin: 0.18, hmax: 0.5, wind: 0.8 });
  for (let i = 0; i < 6; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 5.8, 9); B.cyl('wood', [0.2, 0.28, rr(rng, 0.4, 0.9), 7], { p: [x, 0.3, rr(rng, -4, 6)] }, [0.6, 0.6, 0.65]); }
  for (let i = 0; i < 7; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 5.6, 10); bone(B, { p: [x, 0.03, rr(rng, -4, 7)], r: [0, rng() * 3, 0] }, { len: 0.45 }); }
  skull(B, { p: [-6.4, 0, 2.5], r: 1 });
  // moonlight shafts through the pines + low mist
  c.shaftOpts = { color: 0x8ab4ff, alpha: 0.2 };
  [[-12, 16, -14], [-5, 18, -22], [8, 17, -18], [15, 15, -10], [2, 18, -30]].forEach(([x, y, z], i) => c.shafts.push({ top: [x, y, z], dir: [0.35, -1, 0.25], len: 20, w: 2 + (i % 3), seed: i * 1.3 }));
  [[0, 0.4, -6, 50, 14], [-12, 0.7, -12, 50, 16], [12, 0.6, -10, 40, 16], [0, 1.0, -20, 90, 30], [0, 0.3, 4, 30, 12]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x3a5a7a, dens: 0.5, scale: 0.9, speed: 1.0, seed: i * 2.3 }));
  [[0, 0, -12, 70, 10], [0, 0, -22, 90, 12], [0, 0, -34, 120, 16], [0, 0, -50, 140, 18]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x2e4a6a, dens: 0.5 - i * 0.05, scale: 0.7, speed: 0.5, seed: 8 + i * 2 }));
  c.fire({ p: [6.4, 0.1, -3.6], w: 0.35, h: 0.6, power: 0.6, light: true, lightColor: 0xff9a50, lightI: 8, lightDist: 8, embers: 3, tongues: 1, glow: 0.7 });
  c.ambient = { ash: 0, ambientEmbers: 0, wind: 0.4 };
  const flakes = new Emitter(c.stage, c.group, { max: Math.round(300 * (0.4 + c.q * 0.6)), sprite: 'dot', blending: 'add', order: 5, rate: 18, spawn: () => ({ pos: [rr(rng, -12, 12), rr(rng, 0.2, 5), rr(rng, -14, 8)], vel: [rr(rng, -0.1, 0.2), -0.05, rr(rng, -0.1, 0.1)], life: 6, size: 0.004, sizeEnd: 0.04, color: 0xbcd8ff, colorEnd: 0xbcd8ff, alpha: 0.8, alphaEnd: 0.0, turbulence: 0.5 }) });
  c.extra.push(flakes);
}

// =====================================================================================================
// SMOKE HOLLOW
// =====================================================================================================
export function smokeHollow(c) {
  const { rng, B } = c;
  const ground = {
    height: hillsHeight({ seed: 15, amp: 1.5, freq: 0.04, backRise: 9, backStart: -18, sideRise: 9, sideStart: 10 }),
    vcolor: vcolorFn(15, { dark: 0.35 }),
    layers: [
      { set: soilTex({ tint: 0x4a3c32, dark: 0x120c0a, seed: 42, pebble: 0.5 }), scale: 0.3 },
      { kind: 'grass', tint: 0x3a3828, dark: 0x0c0c08, scale: 0.42, size: 512, seed: 43, opts: { dry: 0.9, dryTint: 0x4a4430 } },
      { kind: 'cobble', tint: 0x3a3632, dark: 0x100e0c, scale: 0.35, seed: 44 },
      { set: ashTex({ tint: 0x504a46, dark: 0x0e0c0b, seed: 45, cracks: 1.0 }), scale: 0.24 },
    ],
    thresholds: [0.7, 3, 0.36], wet: [0.84, 0.15], nstr: 2.2, tintMul: 0xf0e4dc,
  };
  applyPalette(c, {
    sky: { hor: 0x5a2c1c, mid: 0x2a1a1c, top: 0x0c0a10, glows: [{ az: 0, w: 60, h: 8, color: 0xff6a20, k: 0.9 }, { az: -50, w: 40, h: 6, color: 0xc04a1c, k: 0.45 }, { az: 50, w: 40, h: 6, color: 0xc04a1c, k: 0.45 }], moon: { on: 0 }, stars: 0.0, cloud: 0.9, cloudDark: 0x241816, cloudLit: 0xff6a30 },
    fog: { base: 0x1c0c08, dens: 0.0085, fall: 0.2, height: 0.55, glow: 0.35 },
    env: ENV(0x241418, 0xc0582a, 0x120a08, 0xff8a4a, 0x6a60a0),
    key: { color: 0xffa060, intensity: 2.2, pos: [-4.4, 3.6, 5.4] },
    rim: { color: 0xff7a40, intensity: 1.3, pos: [4, 4, -9] },
    hemi: { sky: 0x5a3a30, ground: 0x4a2a1a, intensity: 0.55 },
    look: LOOK({ bloom: 0.95, sat: 1.0, contrast: 1.1, vignette: 0.6, shadowTint: 0xffd8c8, highTint: 0xffd8b0, exposure: 0.98 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 170, arc: 1.9, top: 22, haze: 0.5, color: 0x2a1614, seed: 9, rim: 0xff5a20, rimK: 0.5 }, { radius: 120, arc: 1.9, top: 14, mode: 2, haze: 0.4, color: 0x180e0c, seed: 10, toothW: 6, toothH: 8 }] });
  defaultPropMats(c, { wood: 0x3a2a20 });
  // burning wagons and timber
  wagon(B, rng, { p: [-8.5, 0, -2], r: 0.6 }); wagon(B, rng, { p: [9, 0, -6], r: -0.4 }); wagon(B, rng, { p: [-13, 0, -14], r: 1.2 }); wagon(B, rng, { p: [14, 0, -22], r: 2.4 });
  c.fire({ p: [-8.5, 0.9, -2], w: 1.6, h: 3.2, power: 1.1, light: true, lightI: 50, lightDist: 16, embers: 20, smoke: 0.5, tongues: 3 });
  c.fire({ p: [9, 0.9, -6], w: 1.4, h: 2.8, power: 1.0, light: true, lightI: 44, lightDist: 15, embers: 16, smoke: 0.5, tongues: 3 });
  c.fire({ p: [-13, 0.9, -14], w: 2, h: 4, power: 1.1, embers: 14, smoke: 0.6, tongues: 3, glow: 0.8 });
  c.fire({ p: [14, 0.9, -22], w: 2, h: 4, power: 1.0, embers: 10, smoke: 0.6, tongues: 3, glow: 1.2 });
  c.fire({ p: [0, 0.5, -34], w: 5, h: 9, power: 1.2, embers: 12, smoke: 0.8, tongues: 4, glow: 0.9 });
  c.fire({ p: [-24, 0.5, -30], w: 4, h: 7, power: 1.0, embers: 8, smoke: 0.6, glow: 0.8 });
  c.fire({ p: [25, 0.5, -36], w: 4, h: 7, power: 1.0, embers: 8, smoke: 0.6, glow: 0.8 });
  for (let i = 0; i < 30; i++) { const sx = rng() < 0.5 ? -1 : 1; const x = sx * rr(rng, 6.2, 22); const z = rr(rng, -30, 6); const len = rr(rng, 1.5, 4.5); B.box('woodChar', [len, 0.2, 0.2], { p: [x, 0.18 + (rng() < 0.3 ? 0.3 : 0), z], r: [0, rng() * 3.14, (rng() - 0.5) * 0.3] }, [0.8, 0.8, 0.8]); }
  for (let i = 0; i < 9; i++) { const sx = rng() < 0.5 ? -1 : 1; const x = sx * rr(rng, 7, 20); const z = rr(rng, -30, 0); const h = rr(rng, 1.2, 3.4); B.box('woodChar', [0.22, h, 0.22], { p: [x, h / 2, z], r: [(rng() - 0.5) * 0.2, rng(), (rng() - 0.5) * 0.2] }, [0.7, 0.7, 0.7]); }
  ruinWall(B, rng, { len: 7, h: 2.6, p: [-17, 0, -8], yaw: 0.5 }); ruinWall(B, rng, { len: 6, h: 2.2, p: [18, 0, -12], yaw: -0.6 });
  barrel(B, { p: [6.8, 0, 3.5], r: [0, 0, 1.4] }); crate(B, { p: [-6.6, 0, 4] }); crate(B, { p: [-6.3, 0, 4.8], r: 0.5 });
  for (let i = 0; i < 6; i++) skull(B, { p: [(rng() < 0.5 ? -1 : 1) * rr(rng, 5.6, 9), 0, rr(rng, -4, 7)], r: rng() * 6 });
  rockField(c, { n: 36, tint: 0x4a4440, dark: 0x120e0c, big: [0.4, 1.4], area: { x: [-26, 26], z: [-30, 10] }, pebbles: 50 });
  grassField(c, { n: 300, tint: [0.4, 0.34, 0.2], root: [0.04, 0.03, 0.02], hmin: 0.15, hmax: 0.4 });
  for (let i = 0; i < 16; i++) c.scorches.push({ p: [rr(rng, -12, 12), rr(rng, -8, 8)], s: [rr(rng, 2, 5), rr(rng, 1.5, 4)], rot: rng() * 6, a: 0.8 });
  // thick smoke layers, underlit
  [[0, 3.5, -16, 70, 30], [-10, 5, -10, 50, 26], [12, 6, -20, 60, 30], [0, 8, -30, 100, 40], [0, 2.2, -6, 50, 22]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x24120c, dens: 0.2, scale: 0.55, speed: 0.6, seed: i * 2.7 }));
  [[0, 0, -12, 80, 14], [0, 0, -26, 100, 18], [0, 0, -40, 130, 24]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x2a140e, dens: 0.3 - i * 0.06, scale: 0.55, speed: 0.4, seed: 5 + i }));
  c.puddles = [[-6.5, 2.4, 1.5], [6.8, 3.5, 1.3], [-3.5, -4, 1.1]];
  c.puddleOpts = { deep: 0x140a08, shallow: 0x3a2018, spark: 0xff7a30, tl: 0.05, tlCol: 0x120806, mirror: 0.1 };
  c.smokeOpts = { smokeCol: 0xff7a34, smokeEnd: 0x1e1818 };
  c.ambient = { ash: 70, ambientEmbers: 10, wind: 0.6, ashColor: 0x8a8480 };
}

// =====================================================================================================
// THE TOLL BRIDGE
// =====================================================================================================
function archedBridge(c, z, { len = 64, h = 5, depth = 5 }) {
  const { B } = c;
  const sh = new THREE.Shape(); sh.moveTo(-len / 2, -4); sh.lineTo(len / 2, -4); sh.lineTo(len / 2, h); sh.lineTo(-len / 2, h); sh.closePath();
  const n = 5; const span = len / n;
  for (let i = 0; i < n; i++) { const cx = -len / 2 + span * (i + 0.5); const p = new THREE.Path(); const r = span * 0.36; p.moveTo(cx - r, -4); p.lineTo(cx - r, 0.4); p.absarc(cx, 0.4, r, Math.PI, 0, true); p.lineTo(cx + r, -4); p.closePath(); sh.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2);
  B.geo('stoneDark', g, { p: [0, 0, z] }, [0.75, 0.74, 0.78], { cast: false, uv: 0.35, ao: 0 });
  // parapets with crenellations
  for (const zz of [-depth / 2 + 0.25, depth / 2 - 0.25]) {
    B.box('stoneDark', [len, 0.8, 0.5], { p: [0, h + 0.4, z + zz] }, [0.8, 0.8, 0.84], { cast: false, ao: 0 });
    for (let x = -len / 2 + 1; x < len / 2; x += 2) B.box('stoneDark', [1, 0.6, 0.5], { p: [x, h + 1.1, z + zz] }, [0.75, 0.75, 0.8], { cast: false, ao: 0 });
  }
}
export function tollBridge(c) {
  const { rng, B } = c;
  const zb = -24;
  const rc = (z) => [Math.sin(z * 0.05) * 2.0 + 0.5, z]; const rhalf = (z) => 6.5 + Math.sin(z * 0.09) * 1.2;
  const carve = (x, z, h) => { if (z > -9) return h; const cx = rc(z)[0]; const d = Math.abs(x - cx); const w = rhalf(z); const k = smoothstep(w + 3.5, w * 0.5, d) * smoothstep(-9, -14, z); return h * (1 - k) + (-0.9) * k; };
  const ground = {
    height: hillsHeight({ seed: 18, amp: 1.0, freq: 0.03, backRise: 5, backStart: -50, sideRise: 3, sideStart: 18, carve }),
    vcolor: vcolorFn(18, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x5a4c3c, dark: 0x181210, seed: 52, pebble: 0.8, damp: 0.2 }), scale: 0.3 },
      { kind: 'grass', tint: 0x445030, dark: 0x10140a, scale: 0.42, size: 512, seed: 53, opts: { dry: 0.5, dryTint: 0x6a6038 } },
      { kind: 'cobble', tint: 0x7a7468, dark: 0x201c18, scale: 0.36, size: 512, seed: 54 },
      { set: ashTex({ tint: 0x403a36, dark: 0x0c0a09, seed: 55, cracks: 0.4 }), scale: 0.26 },
    ],
    thresholds: [0.62, 3, 0.72], road: { x: 0, amp: 1.6, freq: 0.07, w: 3.9 }, wet: [0.8, 0.2], nstr: 2.2,
  };
  applyPalette(c, {
    sky: { hor: 0x40303c, mid: 0x1e1c38, top: 0x080a1a, glows: [{ az: -8, w: 28, h: 5, color: 0xff7a30, k: 0.9 }, { az: 36, w: 40, h: 4, color: 0x5a78c0, k: 0.5 }], moon: { on: 1, az: 32, el: 3.4, size: 2.2, color: 0xd8e4ff }, stars: 0.8, cloud: 0.5, cloudDark: 0x1a1a30, cloudLit: 0xff8a50 },
    fog: { base: 0x241c30, dens: 0.0105, fall: 0.22, height: 0.6, glow: 0.8 },
    env: ENV(0x1c2050, 0xa06a50, 0x0c0a10, 0xff8a40, 0x7a90ff),
    key: { color: 0xffa868, intensity: 2.3, pos: [-4.6, 3.8, 5.0] },
    rim: { color: 0x7a90ff, intensity: 1.5, pos: [4, 5, -9] },
    hemi: { sky: 0x42466a, ground: 0x3a2a20, intensity: 0.5 },
    look: LOOK({ bloom: 0.9, sat: 1.08, contrast: 1.12, shadowTint: 0xc0d8ff, highTint: 0xfff0d8 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: 16, haze: 0.58, color: 0x1a1830, seed: 11, rim: 0xff7a40, rimK: 0.4 }] });
  defaultPropMats(c, { wood: 0x4a3626 });
  const wm = waterMaterial(c.U, { deep: 0x0a0c18, shallow: 0x303a48, spark: 0xff9a50, ripple: 1.1, flow: 1.2, tl: 0.09, tlCol: 0x06070e, sparkK: 1.8 }, 'RIVER');
  ribbon(c, { center: rc, half: rhalf, axis: 'z', t0: -180, t1: -10, mat: wm, y: -0.15, steps: 80 });
  // bridge, gatehouse, braziers
  archedBridge(c, zb, { len: 66, h: 4.6, depth: 5 });
  const gz = zb;
  for (const x of [-5.5, 5.5]) { B.box('stone', [4, 11, 6], { p: [x, 5.5, gz] }, [0.8, 0.8, 0.84], { cast: false, uv: 0.3 }); for (let k = -1; k <= 1; k++) B.box('stone', [1, 1, 1], { p: [x + k * 1.5, 11.5, gz - 2.6] }, [0.75, 0.75, 0.8], { cast: false }); B.cone('wood', [3, 3, 4], { p: [x, 12.6, gz], r: 0.78 }, [0.5, 0.35, 0.3], { cast: false }); }
  B.box('stone', [7.5, 3, 6], { p: [0, 9.8, gz] }, [0.8, 0.8, 0.84], { cast: false, uv: 0.3 });
  B.box('emit', [0.7, 1.2, 0.1], { p: [-5.5, 7.5, gz + 3.02] }, [1, 1, 1], { cast: false, ao: 0 }); B.box('emit', [0.7, 1.2, 0.1], { p: [5.5, 7.5, gz + 3.02] }, [1, 1, 1], { cast: false, ao: 0 });
  for (const x of [-9, -3, 3, 9, -16, 16, -24, 24]) { brazier(B, { p: [x, 5.0, gz + 2.0] }, { h: 1.1 }); c.fire({ p: [x, 6.2, gz + 2.0], w: 0.55, h: 1.1, power: 1.0, embers: 4, tongues: 2, glow: 1.1 }); }
  c.fires.push({ p: [-3, 7, gz + 4], color: 0xff8a40, I: 80, dist: 30, seed: 3, base: 80 }); c.fires.push({ p: [3, 7, gz + 4], color: 0xff8a40, I: 80, dist: 30, seed: 5, base: 80 });
  // toll barrier & chain posts on the road's edge
  B.cyl('wood', [0.14, 0.18, 1.6, 8], { p: [6.4, 0.8, -3.0] }, [0.7, 0.65, 0.6]);
  B.box('wood', [4.5, 0.12, 0.12], { p: [8.4, 1.55, -3.0], r: [0, 0, 0.55] }, [0.8, 0.3, 0.3]);
  B.box('stoneDark', [0.6, 0.6, 0.6], { p: [6.4, 0.3, -3.0 + 0.5] }, [0.7, 0.7, 0.7]);
  for (let i = 0; i < 8; i++) { const x = 6.1 + (i % 4) * 0.01; const z = -3.5 - i * 1.6; B.cyl('wood', [0.08, 0.1, 1.0, 6], { p: [6.3, 0.5, z] }, [0.6, 0.6, 0.6]); if (i < 7) B.add('iron', new THREE.TorusGeometry(0.5, 0.025, 4, 10, Math.PI).rotateZ(Math.PI), { p: [6.3, 0.95, z - 0.8], r: [0, Math.PI / 2, 0], s: [1.5, 0.5, 1] }, [0.6, 0.6, 0.6], { ao: 0 }); }
  for (let i = 0; i < 7; i++) { const z = -3.5 - i * 1.6; B.cyl('wood', [0.08, 0.1, 1.0, 6], { p: [-6.3, 0.5, z] }, [0.6, 0.6, 0.6]); }
  crate(B, { p: [-7.5, 0, -1.5] }); barrel(B, { p: [-7.4, 0, -2.8] }); toppledCart(B, rng, { p: [-10.5, 0, 3], r: 0.9 });
  ruinWall(B, rng, { len: 6, h: 1.6, p: [10, 0, -8], yaw: -0.4 }); ruinWall(B, rng, { len: 5, h: 1.4, p: [-10, 0, -9], yaw: 0.5 });
  c.fire({ p: [-6.6, 0.9, 1.5], w: 0.35, h: 0.7, power: 0.9, light: true, lightColor: 0xff9040, lightI: 18, lightDist: 11, embers: 4, tongues: 1, glow: 0.7 });
  brazier(B, { p: [-6.6, 0, 1.5] }, { h: 0.9 });
  grassField(c, { n: 500, tint: [0.45, 0.5, 0.3], root: [0.04, 0.045, 0.02], hmin: 0.2, hmax: 0.5, rejectFn: (x, z) => Math.abs(x - Math.sin(z * 0.07) * 1.6) < 3.6 && z > -20 });
  rockField(c, { n: 36, tint: 0x6a665e, dark: 0x1a1816, big: [0.4, 1.3], area: { x: [-30, 30], z: [-16, 10] }, pebbles: 50 });
  const trees = [0, 1].map((i) => dryTree(c.seed * 41 + i, { h: 4 + i, r: 0.22, limbs: 5, spread: 0.9, depth: 2, curl: 0.6, droop: 0.2 }));
  const tm = c.arenaMat('tollBark', () => c.libMat('bark', { tint: 0x3a3028, dark: 0x0a0806 }).clone(), { wind: 1, windK: 0.01 }, { vertexColors: true });
  const tp = []; for (let i = 0; i < c.n(26); i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 9, 30); const z = rr(rng, -18, 6); tp.push([x, z, 1]); } placeTrees(c, trees, tp, { material: tm, scale: [0.9, 1.4] });
  c.puddles = [[3.5, 3.2, 1.4], [-6.2, -1.2, 1.2], [6.5, 6, 1.5], [-3, 8.6, 1.2]];
  c.puddleOpts = { deep: 0x0a0c18, shallow: 0x303a48, spark: 0xff9a50, tl: 0.07, tlCol: 0x06070e, mirror: 0.15 };
  [[0, 0.4, -14, 50, 18], [0, 0.4, -34, 90, 20], [-12, 0.5, -8, 24, 12], [12, 0.5, -10, 24, 12]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x34304a, dens: 0.4, scale: 0.8, speed: 0.8, seed: i * 2 }));
  c.fogLayers.push({ kind: 'wall', p: [0, 0, -44], w: 140, d: 16, col: 0x34304a, dens: 0.45, scale: 0.7, speed: 0.5, seed: 4 });
  c.ambient = { ash: 5, ambientEmbers: 5, wind: 0.5 };
}

// =====================================================================================================
// ASHFALL CAMP
// =====================================================================================================
function tent(c, p, yaw, s = 1) {
  const { B, rng } = c;
  B.with({ p, r: yaw, s }, () => {
    const g = new THREE.ConeGeometry(2.0, 2.8, 7, 4, true); g.translate(0, 1.4, 0);
    const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); const a = Math.atan2(pp.getZ(i), pp.getX(i)); const sag = Math.sin(a * 7) * 0.12 * (1 - y / 2.8); pp.setX(i, pp.getX(i) * (1 + sag)); pp.setZ(i, pp.getZ(i) * (1 + sag)); }
    g.computeVertexNormals();
    B.geo('hide', g, {}, [0.8, 0.72, 0.64], { uv: 0.5 });
    B.box('wood', [0.07, 1.6, 0.07], { p: [0, 3.4, 0] }, [0.7, 0.65, 0.6]);
    for (let i = 0; i < 3; i++) skull(B, { p: [0, 2.7 + i * 0.12, 0.15 + i * 0.04], r: i }, { });
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; B.cyl('wood', [0.04, 0.05, 3.1, 5], { p: [Math.cos(a) * 1.0, 1.6, Math.sin(a) * 1.0], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }, [0.65, 0.6, 0.55], { ao: 0 }); }
    B.box('boneDark', [0.8, 1.4, 0.05], { p: [0, 0.7, 1.66], r: [0, 0, 0] }, [1, 1, 1], { ao: 0 });
  });
}
function palisade(c, from, to, { h = 2.6, broken = 0.3 } = {}) {
  const { B, rng } = c;
  const dx = to[0] - from[0]; const dz = to[1] - from[1]; const len = Math.hypot(dx, dz); const n = Math.floor(len / 0.5);
  for (let i = 0; i <= n; i++) {
    if (rng() < broken * 0.5) continue;
    const x = from[0] + dx * i / n; const z = from[1] + dz * i / n; const hh = h * rr(rng, 0.4, 1.15);
    B.with({ p: [x, 0, z], r: [rr(rng, -0.08, 0.08), 0, rr(rng, -0.1, 0.1)] }, () => {
      B.cyl('wood', [0.16, 0.2, hh, 7], { p: [0, hh / 2 - 0.1, 0] }, [0.7, 0.62, 0.55], { uv: 0.7 });
      B.cone('wood', [0.16, 0.5, 7], { p: [0, hh + 0.12, 0] }, [0.65, 0.58, 0.52], { ao: 0 });
    });
  }
  B.box('wood', [len, 0.14, 0.14], { p: [(from[0] + to[0]) / 2, h * 0.5, (from[1] + to[1]) / 2], r: [0, Math.atan2(dx, dz) + Math.PI / 2, 0] }, [0.6, 0.55, 0.5], { ao: 0 });
}
function totem(c, p, h = 3.4) {
  const { B, rng } = c;
  B.with({ p }, () => {
    B.cyl('wood', [0.1, 0.14, h, 6], { p: [0, h / 2, 0] }, [0.6, 0.55, 0.5]);
    for (let i = 0; i < 5; i++) skull(B, { p: [(rng() - 0.5) * 0.06, h * 0.45 + i * 0.28, 0.1], r: (rng() - 0.5) * 0.6 });
    B.cone('bone', [0.07, 0.7, 5], { p: [-0.4, h + 0.15, 0], r: [0, 0, 0.5] }, [1, 0.95, 0.85], { ao: 0 }); B.cone('bone', [0.07, 0.7, 5], { p: [0.4, h + 0.15, 0], r: [0, 0, -0.5] }, [1, 0.95, 0.85], { ao: 0 });
    B.box('hide', [0.5, 0.9, 0.04], { p: [0, h - 0.5, 0.2], r: [0.2, 0, 0.1] }, [0.8, 0.6, 0.5], { ao: 0 });
  });
}
function lootPile(c, p, s = 1) {
  const { B, rng } = c;
  B.with({ p, s }, () => {
    crate(B, { p: [0, 0, 0] }); crate(B, { p: [0.7, 0, 0.3], r: 0.5 }, { s: 0.55 }); crate(B, { p: [0.1, 0.7, 0.05], r: 0.3 }, { s: 0.5 });
    barrel(B, { p: [-0.8, 0, 0.2] });
    B.sph('cloth', [0.4, 8, 6], { p: [-0.3, 0.2, 0.9], s: [1, 0.7, 0.9] }, [0.45, 0.38, 0.28]); B.sph('cloth', [0.34, 8, 6], { p: [0.4, 0.17, 1.0], s: [1, 0.8, 0.9] }, [0.4, 0.35, 0.3]);
    B.box('wood', [0.9, 0.5, 0.55], { p: [-1.5, 0.25, -0.5], r: 0.4 }, [0.7, 0.55, 0.45]); B.box('gold', [0.92, 0.1, 0.57], { p: [-1.5, 0.5, -0.5], r: 0.4 }, [1, 1, 1], { ao: 0 });
    for (let i = 0; i < 28; i++) B.cyl('gold', [0.07, 0.07, 0.015, 8], { p: [rr(rng, -1.9, 0.6), rr(rng, 0.02, 0.3), rr(rng, -1.1, 0.7)], r: [rr(rng, -0.6, 0.6), rng() * 6, rr(rng, -0.6, 0.6)] }, [1, 1, 1], { ao: 0 });
  });
}
export function ashfallCamp(c) {
  const { rng, B } = c;
  const ground = {
    height: hillsHeight({ seed: 21, amp: 1.0, freq: 0.035, backRise: 4, backStart: -34, sideRise: 3, sideStart: 15 }),
    vcolor: vcolorFn(21, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x6a5238, dark: 0x1a1008, seed: 62, pebble: 0.6, damp: 0.3 }), scale: 0.3 },
      { kind: 'grass', tint: 0x4a4a2a, dark: 0x12140a, scale: 0.42, size: 512, seed: 63, opts: { dry: 0.8, dryTint: 0x7a6a38 } },
      { set: soilTex({ tint: 0x6a6258, dark: 0x1a1612, seed: 64, pebble: 2.4 }), scale: 0.3 },
      { set: ashTex({ tint: 0x4a443e, dark: 0x0c0a09, seed: 65, cracks: 0.9 }), scale: 0.26 },
    ],
    thresholds: [0.68, 0.8, 0.5], wet: [0.82, 0.2], nstr: 2.2,
  };
  applyPalette(c, {
    sky: { hor: 0x5a2a20, mid: 0x30203a, top: 0x0c0a1c, glows: [{ az: 0, w: 55, h: 6, color: 0xff6a24, k: 0.85 }, { az: -45, w: 40, h: 5, color: 0xd0402a, k: 0.45 }], moon: { on: 0 }, stars: 0.6, cloud: 0.6, cloudDark: 0x241828, cloudLit: 0xff6a30 },
    fog: { base: 0x30161a, dens: 0.0125, fall: 0.2, height: 0.6, glow: 0.8 },
    env: ENV(0x241848, 0xd0602a, 0x120a0a, 0xff8a40, 0x6a70ff),
    key: { color: 0xff9a54, intensity: 2.4, pos: [-4.4, 3.4, 5.4] },
    rim: { color: 0x6a80ff, intensity: 1.4, pos: [4, 5, -9] },
    hemi: { sky: 0x4a3a5a, ground: 0x4a2a18, intensity: 0.5 },
    look: LOOK({ bloom: 0.95, sat: 1.1, contrast: 1.12, shadowTint: 0xc8dcff, highTint: 0xffe8cc }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: 14, haze: 0.6, color: 0x24142a, seed: 13, rim: 0xff5a20, rimK: 0.5 }, { radius: 140, arc: 1.9, top: 8, mode: 2, haze: 0.45, color: 0x180c1c, seed: 14, toothW: 6, toothH: 6 }] });
  defaultPropMats(c, { wood: 0x4a3626 });
  const crown = bannerTex('#6a1410', '#e0a23a'); const crown2 = bannerTex('#241018', '#c8902c');
  tent(c, [-9, 0, -4], 0.4, 1.15); tent(c, [10, 0, -6], -0.5, 1.3); tent(c, [-14, 0, -14], 1.0, 1.4); tent(c, [15, 0, -17], 2.2, 1.2); tent(c, [-4, 0, -26], 0.2, 1.5); tent(c, [6, 0, -30], -0.8, 1.6); tent(c, [-22, 0, -26], 0.9, 1.3);
  palisade(c, [-7, -9], [-24, -9.5], { broken: 0.45 }); palisade(c, [7.5, -11], [26, -10], { broken: 0.4 }); palisade(c, [-6.4, 6], [-6.9, 0], { h: 1.8, broken: 0.6 });
  [[-6.8, -6.5], [7.5, -8], [-18, -20], [18, -22], [0, -36]].forEach(([x, z], i) => totem(c, [x, c.hAt(x, z), z], 3 + (i % 2)));
  flagBanner(c, [-6.9, 0, -6], { h: 5, tex: crown, yaw: 0.3 }); flagBanner(c, [7.4, 0, -4.5], { h: 5.5, tex: crown, yaw: -0.2 }); flagBanner(c, [-13, 0, -22], { h: 6.5, tex: crown2 }); flagBanner(c, [14, 0, -26], { h: 7, tex: crown, yaw: 0.5 }); flagBanner(c, [0, 0, -40], { h: 9, tex: crown2, w: 2.2, len: 3.2 });
  lootPile(c, [8.8, 0, 1], 1.1); lootPile(c, [-9.5, 0, 2.5], 1.0); lootPile(c, [12, 0, -12], 1.2);
  // campfires with big flames
  c.fire({ p: [-8.4, 0.1, 5.5], w: 1.3, h: 2.2, power: 1.1, light: true, lightI: 55, lightDist: 16, embers: 22, smoke: 0.2, tongues: 3 });
  c.fire({ p: [8.0, 0.1, 6.2], w: 1.0, h: 1.8, power: 1.0, light: true, lightI: 40, lightDist: 14, embers: 16, smoke: 0.15, tongues: 3 });
  c.fire({ p: [-3.2, 0.1, -20], w: 1.6, h: 2.8, power: 1.1, embers: 14, smoke: 0.3, tongues: 3, glow: 1.3 });
  c.fire({ p: [9, 0.1, -22], w: 1.3, h: 2.4, power: 1.0, embers: 12, smoke: 0.3, tongues: 3, glow: 1.2 });
  c.fire({ p: [0, 0.1, -32], w: 2.4, h: 4.4, power: 1.2, embers: 14, smoke: 0.4, tongues: 4, glow: 1.4 });
  for (const [x, z] of [[-8.4, 5.5], [8.0, 6.2], [-3.2, -20], [9, -22], [0, -32]]) { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; B.sph('stoneDark', [0.2, 7, 5], { p: [x + Math.cos(a) * 0.95, 0.1, z + Math.sin(a) * 0.95], s: [1, 0.7, 1] }, [0.7, 0.7, 0.7]); } for (let i = 0; i < 4; i++) B.cyl('woodChar', [0.07, 0.09, 1.1, 5], { p: [x, 0.15, z], r: [0, i * 0.8, Math.PI / 2 - 0.2] }, [0.9, 0.9, 0.9]); c.scorches.push({ p: [x, z], s: [3.5, 3], rot: x, a: 0.85 }); }
  for (let i = 0; i < 12; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 6, 14); skull(B, { p: [x, 0, rr(rng, -6, 6)], r: rng() * 6 }); bone(B, { p: [x + 0.5, 0.03, rr(rng, -6, 6)], r: [0, rng() * 3, 0] }, { len: 0.5 }); }
  for (let i = 0; i < 10; i++) B.cyl('wood', [0.006, 0.006, 0.9, 4], { p: [rr(rng, -5, 5), 0.4, rr(rng, -4, 6)], r: [(rng() - 0.5) * 0.8, 0, (rng() - 0.5) * 0.8] }, [0.8, 0.75, 0.7], { ao: 0, cast: false });
  rockField(c, { n: 30, tint: 0x5a544c, dark: 0x1a1816, big: [0.4, 1.2], area: { x: [-28, 28], z: [-30, 10] }, pebbles: 55 });
  grassField(c, { n: 400, tint: [0.55, 0.5, 0.26], root: [0.05, 0.045, 0.02], hmin: 0.18, hmax: 0.45 });
  [[-10, 0.5, -6, 34, 20], [12, 0.6, -14, 36, 22], [0, 1.0, -26, 80, 30], [0, 0.4, 2, 30, 14]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: 0x42242a, dens: 0.4, scale: 0.9, speed: 0.8, seed: i * 2.2 }));
  [[0, 0, -24, 90, 10], [0, 0, -42, 130, 16]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x4a2630, dens: 0.5, scale: 0.7, speed: 0.5, seed: 6 + i }));
  c.puddles = [[-5.5, -1, 1.5], [6, 3.5, 1.3], [-3, 9, 1.4]];
  c.puddleOpts = { deep: 0x140a0c, shallow: 0x3a2018, spark: 0xff7a30, tl: 0.05, tlCol: 0x120508, mirror: 0.1 };
  c.ambient = { ash: 20, ambientEmbers: 12, wind: 0.7 };
}

// =====================================================================================================
// GALLOWS HILL  (standard | elite | boss)
// =====================================================================================================
export function gallowsHill(c) {
  const { rng, B } = c;
  const boss = c.kind === 'boss'; const elite = c.kind === 'elite';
  const ground = {
    height: hillsHeight({ seed: 27, amp: 1.2, freq: 0.03, backRise: boss ? 5 : 3, backStart: -45, sideRise: 3, sideStart: 18 }),
    vcolor: vcolorFn(27, { dark: 0.4 }),
    layers: [
      { set: soilTex({ tint: 0x5a5038, dark: 0x16120c, seed: 72, pebble: 0.8 }), scale: 0.3 },
      { kind: 'grass', tint: 0x5a5a34, dark: 0x14160c, scale: 0.4, size: 512, seed: 73, opts: { dry: 0.9, dryTint: 0x8a7a44 } },
      { set: soilTex({ tint: 0x76726a, dark: 0x1a1816, seed: 74, pebble: 2.4 }), scale: 0.3 },
      { set: ashTex({ tint: 0x403c38, dark: 0x0c0a09, seed: 75, cracks: boss ? 0.7 : 0.2 }), scale: 0.26 },
    ],
    thresholds: [0.5, 0.74, 0.76], wet: [0.84, 0.15], nstr: 2.2,
  };
  const moonCol = boss ? 0xff9a7a : 0xf0f4ff;
  applyPalette(c, {
    sky: boss
      ? { hor: 0x7a1c14, mid: 0x3a1020, top: 0x120610, glows: [{ az: 0, w: 60, h: 6, color: 0xff3a14, k: 0.8 }, { az: -50, w: 40, h: 5, color: 0xc01a1a, k: 0.45 }, { az: 50, w: 40, h: 5, color: 0xc01a1a, k: 0.45 }], moon: { on: 1, az: -10, el: 4.0, size: 3.4, color: moonCol }, stars: 0.2, cloud: 0.85, cloudDark: 0x2a0c14, cloudLit: 0xff3a20 }
      : { hor: 0x2a3050, mid: 0x161a38, top: 0x060818, glows: [{ az: 14, w: 35, h: 5, color: 0x6a88d0, k: 0.8 }, { az: -60, w: 30, h: 4, color: 0xff6a30, k: 0.35 }], moon: { on: 1, az: -8, el: 3.8, size: elite ? 2.2 : 4.4, color: moonCol }, stars: 1.0, cloud: elite ? 0.8 : 0.4, cloudDark: 0x141830, cloudLit: 0x7a90c8 },
    fog: boss ? { base: 0x2a0c10, dens: 0.0078, fall: 0.22, height: 0.6, glow: 0.45 } : { base: elite ? 0x141a28 : 0x1c2440, dens: elite ? 0.016 : 0.0105, fall: elite ? 0.45 : 0.25, height: 0.7, glow: 0.7 },
    env: boss ? ENV(0x300c1c, 0xc03a28, 0x100808, 0xff7a40, 0x8a60c0) : ENV(0x141c4a, 0x5a78b8, 0x0a0c12, 0xff9a60, 0x8aa8ff),
    key: boss ? { color: 0xff8a50, intensity: 2.6, pos: [-4.4, 3.8, 5.2] } : { color: elite ? 0xa0b4e8 : 0xb8d0ff, intensity: elite ? 1.7 : 2.3, pos: [-4.6, 4.6, 4.8] },
    rim: boss ? { color: 0xff3a2a, intensity: 2.2, pos: [4, 5, -9] } : { color: 0xffa070, intensity: 1.1, pos: [4, 5, -9] },
    hemi: boss ? { sky: 0x5a2a3a, ground: 0x3a1a14, intensity: 0.5 } : { sky: 0x3a4a78, ground: 0x2a2a28, intensity: elite ? 0.4 : 0.55 },
    look: LOOK(boss ? { bloom: 1.0, sat: 1.12, contrast: 1.15, vignette: 0.58, shadowTint: 0xffc8c8, highTint: 0xffe0b8 } : { bloom: 0.8, sat: elite ? 0.85 : 1.0, contrast: 1.15, vignette: elite ? 0.66 : 0.56, shadowTint: 0xb0ccff, highTint: 0xf0f0ff, exposure: elite ? 0.95 : 1.02 }),
  });
  buildBackdrop(c, { ground, ridges: [{ radius: 190, arc: 1.9, top: boss ? 12 : 10, haze: 0.55, color: boss ? 0x24101a : 0x121826, seed: 15, rim: boss ? 0xff3a20 : 0x7a98d8, rimK: 0.5 }, { radius: 140, arc: 1.9, top: 6, mode: 2, haze: 0.4, color: boss ? 0x180a10 : 0x0a0e18, seed: 16, toothW: 8, toothH: 9 }] });
  defaultPropMats(c, { wood: 0x3a3028 });
  // the gallows
  const gx = -9.5; const gzz = -3.5;
  B.with({ p: [gx, 0, gzz], r: 0.35 }, () => {
    B.box('wood', [4.2, 0.4, 3.2], { p: [0, 0.2, 0] }, [0.7, 0.65, 0.6], { uv: 0.8 });
    for (let i = 0; i < 4; i++) B.box('wood', [0.9, 0.04, 0.5], { p: [-3 + i * 0.2, 0.1 + i * 0.1, 0.0] }, [0.6, 0.6, 0.6], { ao: 0 });
    B.box('wood', [0.32, 5.4, 0.32], { p: [-1.5, 3.0, 0] }, [0.65, 0.6, 0.55]); B.box('wood', [3.6, 0.3, 0.32], { p: [0.2, 5.5, 0] }, [0.65, 0.6, 0.55]);
    B.box('wood', [0.2, 1.9, 0.2], { p: [-0.7, 4.7, 0], r: [0, 0, 0.78] }, [0.6, 0.55, 0.5]);
    B.cyl('rope', [0.025, 0.025, 1.7, 5], { p: [1.0, 4.65, 0] }, [1, 0.9, 0.8], { ao: 0 }); B.tor('rope', [0.22, 0.03, 5, 12], { p: [1.0, 3.7, 0], r: [0, Math.PI / 2, 0] }, [1, 0.9, 0.8], { ao: 0 });
  });
  const ravenG = ravenGeo(); const rvm = c.arenaMat('crow', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, color: 0x9090a8 }), {});
  c.addInstanced(ravenG, rvm, [[gx - 1.2, 5.95, gzz + 0.2], [gx + 0.6, 5.95, gzz - 0.2], [gx + 1.4, 5.92, gzz + 0.1], [gx - 3.0, 0.18, gzz + 2], [gx + 2.4, 0.1, gzz + 3.2]].map((p, i) => ({ p: [p[0] + (i < 3 ? 0.4 : 0), p[1], p[2]], r: rng() * 6, s: 1.1 })), { cast: false });
  // dead trees, windswept
  const dts = [0, 1, 2].map((i) => dryTree(c.seed * 29 + i * 3, { h: 4.5 + i * 1.2, r: 0.22, limbs: 5, spread: 1.1, depth: 3, curl: 0.7, droop: 0.2, radial: 6, lean: 0.4, bark: [0.17, 0.15, 0.14], tip: [0.3, 0.28, 0.27] }));
  const dtm = c.arenaMat('gallowsBark', () => c.libMat('bark', { tint: 0x4a4440, dark: 0x0a0808 }).clone(), { wind: 1, windK: 0.012, windSpeed: 1.4 }, { vertexColors: true });
  const tp = []; for (let i = 0; i < c.n(22); i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 8, 34); tp.push([x, rr(rng, -40, 2), 1]); }
  placeTrees(c, dts, tp, { material: dtm, scale: [0.9, 1.6] });
  grassField(c, { n: 800, tint: [0.62, 0.58, 0.34], root: [0.05, 0.05, 0.03], hmin: 0.25, hmax: 0.6, wind: 1.9, windK: 0.8 });
  rockField(c, { n: 30, tint: 0x66625a, dark: 0x1a1816, big: [0.4, 1.4], area: { x: [-30, 30], z: [-35, 10] }, pebbles: 50 });
  for (let i = 0; i < 7; i++) skull(B, { p: [(rng() < 0.5 ? -1 : 1) * rr(rng, 5.8, 9), 0, rr(rng, -4, 7)], r: rng() * 6 });
  for (let i = 0; i < 4; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 9, 14); const z = rr(rng, -10, 2); B.cyl('wood', [0.04, 0.05, 1.5, 5], { p: [x, 0.7, z], r: [0, 0, (rng() - 0.5) * 0.3] }, [0.6, 0.6, 0.6]); B.box('wood', [0.5, 0.3, 0.05], { p: [x + 0.2, 1.4, z] }, [0.6, 0.55, 0.5]); }
  c.fire({ p: [6.8, 0.8, -1.5], w: 0.5, h: 0.9, power: 0.9, light: true, lightColor: 0xff8a40, lightI: boss ? 40 : 22, lightDist: 12, embers: 6, tongues: 2, glow: 0.9 });
  brazier(B, { p: [6.8, 0, -1.5] }, { h: 0.8 });
  if (boss) {
    // throne ruins, gold hoard, braziers, banners, gold glints
    B.with({ p: [0.4, 0, -9.5] }, () => {
      for (let i = 0; i < 4; i++) B.box('stone', [7 - i * 1.2, 0.35, 5 - i * 0.9], { p: [0, 0.18 + i * 0.35, 0] }, [0.6, 0.58, 0.58], { cast: false, uv: 0.4 });
      B.box('stone', [1.6, 1.0, 1.6], { p: [0, 1.9, -0.4] }, [0.6, 0.58, 0.58], { cast: false }); B.box('stone', [1.7, 3.0, 0.5], { p: [0, 3.5, -1.0] }, [0.55, 0.53, 0.53], { cast: false }); B.box('stone', [0.5, 1.4, 1.6], { p: [-0.9, 2.9, -0.4] }, [0.55, 0.53, 0.53], { cast: false }); B.box('stone', [0.5, 1.0, 1.6], { p: [0.9, 2.7, -0.4] }, [0.55, 0.53, 0.53], { cast: false });
      B.box('gold', [1.0, 0.3, 1.0], { p: [0, 2.5, -0.4] }, [1, 1, 1], { cast: false, ao: 0 }); B.box('gold', [1.2, 0.2, 0.1], { p: [0, 5.1, -1.0] }, [1, 1, 1], { cast: false, ao: 0 });
      for (const x of [-5, 5]) { B.cyl('stone', [0.5, 0.6, 5, 8], { p: [x, 2.5, -1] }, [0.6, 0.6, 0.6], { cast: false }); B.cyl('stone', [0.5, 0.6, 2.5, 8], { p: [x * 1.7, 1.2, 1], r: [0, 0, 0.9] }, [0.55, 0.55, 0.55], { cast: false }); }
    });
    // hoard heaps
    for (const [x, z, s] of [[-4.6, -8.5, 1.5], [5.5, -9.5, 1.7], [0.6, -7.2, 1.0], [-7.5, -14, 2.0], [8.5, -13, 1.8]]) {
      const g = new THREE.SphereGeometry(1.4 * s, 14, 8, 0, 6.283, 0, 1.2).scale(1.3, 0.55, 1); const d = (await0(g, c.seed + z)); B.geo('gold', d, { p: [x, c.hAt(x, z) - 0.1, z] }, [0.9, 0.8, 0.7], { cast: true, uv: 0.5, ao: 0.4 });
      for (let i = 0; i < 40; i++) { const a = rng() * 6.28; const r = Math.sqrt(rng()) * 1.5 * s; B.cyl('gold', [0.09, 0.09, 0.02, 8], { p: [x + Math.cos(a) * r, 0.45 * s * Math.max(0.1, 1 - r / (1.6 * s)) + 0.06, z + Math.sin(a) * r * 0.8], r: [rr(rng, -0.7, 0.7), rng() * 6, rr(rng, -0.7, 0.7)] }, [1, 1, 1], { ao: 0 }); }
      B.cyl('gold', [0.1, 0.06, 0.25, 8], { p: [x + 0.6 * s, 0.7 * s, z - 0.2], r: [0.3, 0, 0.4] }, [1, 1, 1], { ao: 0 }); B.box('wood', [0.9, 0.5, 0.6], { p: [x - 1.0 * s, 0.25, z + 0.8], r: 0.5 }, [0.6, 0.45, 0.35], {});
      c.glows.push({ p: [x, 0.8 * s, z], s: 3 * s, c: 0xffb840, k: 0.5, flick: 0.3, seed: x });
    }
    for (const [x, z] of [[-6, -6], [7, -7], [-3.5, -12], [4, -13], [-10, -9], [11, -10]]) { brazier(B, { p: [x, 0, z] }, { h: 1.3 }); c.fire({ p: [x, 1.5, z], w: 0.8, h: 1.7, power: 1.3, embers: 10, tongues: 2, glow: 1.2, light: x === -6 || x === 7, lightI: 40, lightDist: 14 }); }
    const crown = bannerTex('#5a0e10', '#e8b040');
    flagBanner(c, [-7.4, 0, -4], { h: 6.5, tex: crown, w: 1.6, len: 2.6 }); flagBanner(c, [8.0, 0, -5.5], { h: 6.5, tex: crown, w: 1.6, len: 2.6, yaw: 0.3 }); flagBanner(c, [-1.8, 0, -16], { h: 8, tex: crown, w: 2, len: 3.2 }); flagBanner(c, [3, 0, -17], { h: 8, tex: crown, w: 2, len: 3.2 });
    // glints
    const glint = new Emitter(c.stage, c.group, { max: 120, sprite: glintTex(), blending: 'add', order: 9, rate: 8 * (0.4 + c.q * 0.6), spawn: () => { const hp = [[-4.6, -8.5], [5.5, -9.5], [0.6, -7.2], [-7.5, -14], [8.5, -13]][Math.floor(rng() * 5)]; return { pos: [hp[0] + rr(rng, -1.6, 1.6), rr(rng, 0.3, 1.1), hp[1] + rr(rng, -1.2, 1.2)], vel: [0, 0.03, 0], life: 1.1, size: 0.02, sizeEnd: 0.4, color: 0xffe08a, colorEnd: 0xffc040, alpha: 1, alphaEnd: 0, rot: rng() * 3, spin: 1 }; } });
    c.extra.push(glint);
    c.ambient = { ash: 20, ambientEmbers: 30, wind: 1.0 };
    c.stormy = true;
  } else if (elite) {
    // ogre camp remains: giant bones, a cooking pot over a smouldering fire, a looming rock formation
    const mon = rock(c.seed + 77, { detail: 2, amp: 0.55, freq: 0.9, flat: 2.4, ridged: true, uv: 0.07 });
    const mm = c.arenaMat('looming', () => texMat(rockTex({ tint: 0x58545a, dark: 0x120f14, seed: 81 }), { repeat: 1, vertexColors: true }), {});
    c.addInstanced(mon, mm, [{ p: [-3.5, 0, -17], r: 0.4, s: [9, 11, 6], c: new THREE.Color(0.8, 0.8, 0.85) }, { p: [7, 0, -20], r: 2, s: [7, 8, 6], c: new THREE.Color(0.8, 0.8, 0.85) }, { p: [-13, 0, -10], r: 1, s: [4, 6, 4], c: new THREE.Color(0.8, 0.8, 0.85) }], { cast: true });
    for (let i = 0; i < 6; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 6, 10); const z = rr(rng, -5, 4); B.cyl('bone', [0.12, 0.12, rr(rng, 1.2, 2.2), 7], { p: [x, 0.15, z], r: [0, rng() * 3, Math.PI / 2] }, [1, 0.95, 0.85]); B.sph('bone', [0.2, 8, 6], { p: [x + 0.8, 0.2, z] }, [1, 0.95, 0.85]); }
    for (let i = 0; i < 6; i++) skull(B, { p: [(rng() < 0.5 ? -1 : 1) * rr(rng, 5.8, 10), 0, rr(rng, -4, 6)], r: rng() * 6 }); ribcage(B, { p: [-7.5, 0.05, 3.5], r: 0.4 }, { h: 1.4 }); ribcage(B, { p: [8.2, 0.05, -2.5], r: 2.2 }, { h: 1.2 });
    B.lathe('iron', [[0.2, 0], [0.8, 0.3], [1.0, 0.9], [0.95, 1.3], [0.85, 1.3], [0.9, 0.9], [0.7, 0.35], [0.1, 0.05]], 14, { p: [9.2, 0.6, -5] }, [0.6, 0.6, 0.6]);
    for (let i = 0; i < 3; i++) B.cyl('iron', [0.05, 0.06, 0.7, 5], { p: [9.2 + Math.cos(i * 2.1) * 0.6, 0.35, -5 + Math.sin(i * 2.1) * 0.6] }, [0.5, 0.5, 0.5]);
    B.cyl('wood', [0.14, 0.2, 3.4, 8], { p: [-7.8, 0.25, -4.2], r: [0, 0.6, Math.PI / 2 - 0.1] }, [0.6, 0.5, 0.45]); B.sph('wood', [0.5, 8, 6], { p: [-6.5, 0.45, -3.4] }, [0.55, 0.45, 0.4]);
    c.fire({ p: [9.2, 0.1, -5], w: 0.9, h: 1.4, power: 1.0, light: true, lightColor: 0xff7a30, lightI: 34, lightDist: 13, embers: 12, smoke: 0.3, tongues: 3 });
    c.ambient = { ash: 10, ambientEmbers: 4, wind: 0.6, ashColor: 0x8a8a90 };
  } else { c.ambient = { ash: 3, ambientEmbers: 2, wind: 1.0, ashColor: 0xb0b8d0 }; }
  [[0, 0.4, -8, 50, 16], [-12, 0.6, -14, 50, 18], [10, 0.5, -4, 26, 12], [0, 1, -26, 100, 30]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, elite ? y * 0.6 : y, z], w, d, col: boss ? 0x4a1c24 : 0x34425e, dens: elite ? 0.55 : boss ? 0.12 : 0.34, scale: 0.9, speed: boss ? 1.2 : 0.9, seed: i * 2.7 }));
  [[0, 0, -22, 90, 9], [0, 0, -40, 130, 12]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: boss ? 0x3a1018 : 0x2a3a58, dens: boss ? 0.2 : 0.45, scale: 0.7, speed: 0.6, seed: 9 + i }));
  if (boss) c.smokeSources.push({ p: [-20, 2, -30], rate: 0.3, size: 5 }, { p: [22, 2, -34], rate: 0.3, size: 5 });
  c.puddles = [[-5.8, 2, 1.3], [6.5, 4, 1.4], [-3, -4.2, 1.1]];
  c.puddleOpts = { deep: boss ? 0x180808 : 0x0a0c18, shallow: boss ? 0x3a1818 : 0x283040, spark: boss ? 0xff5a30 : 0xff9a60, tl: 0.05, tlCol: 0x06060c, mirror: 0.15 };
}
function await0(g, seed) { // displaced mound (sync helper)
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7) * 0.08 + Math.sin(x * 9 + z * 7) * 0.025; p.setY(i, y + n * (y > 0.05 ? 1 : 0)); }
  g.computeVertexNormals(); return g;
}
