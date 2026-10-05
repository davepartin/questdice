// Reusable scene-building helpers shared by every place: terrain height recipes, grass / rock / pebble
// fields, tree placement and fire-on-branch helpers.
import * as THREE from 'three';
import { makeNoise, mulberry32 } from '../noise.js';
import { mat as libMat } from '../mats.js';
import { rr, rpick, scatter, inClear, smoothstep, CLEAR } from './common.js';
import { rock, slab, grassTuft, cattail, dryTree, pine, pineCard } from './flora.js';
import { texMat, rockTex, needleTex } from './tex.js';
import { Emitter } from './fx.js';

// Terrain height: flat under the playfield, rolling hills outside it. `carve(x,z,h)` can cut riverbeds.
export function hillsHeight({ seed = 1, amp = 2.5, freq = 0.035, backRise = 0, backStart = -30, sideRise = 0, sideStart = 12, carve = null, flatR = 16, ridgeAmp = 0 } = {}) {
  const N = makeNoise(seed);
  return (x, z) => {
    const dx = Math.max(Math.abs(x) - 8.5, 0); const dz = z < -5.5 ? -5.5 - z : z > 9 ? z - 9 : 0;
    const d = Math.hypot(dx, dz); const mask = smoothstep(0, flatR, d);
    let h = N.fbm(x * freq, z * freq, { oct: 4 }) * amp * mask;
    if (ridgeAmp) h += (1 - Math.abs(N.fbm(x * freq * 1.7 + 9, z * freq * 1.7, { oct: 3 }))) * ridgeAmp * mask * mask;
    h += smoothstep(backStart, backStart - 40, z) * backRise * (0.7 + 0.3 * N.fbm(x * 0.03, 5, { oct: 2 }));
    h += smoothstep(sideStart, sideStart + 28, Math.abs(x)) * sideRise;
    h += N.fbm(x * 0.5, z * 0.5, { oct: 2 }) * 0.045 * mask;
    return carve ? carve(x, z, h, mask) : h;
  };
}
export function vcolorFn(seed = 1, { dark = 0.4, light = 1.0, far = [6, 16], tintVar = 0.12 } = {}) {
  const N = makeNoise(seed + 50);
  return (x, z) => {
    const dx = Math.max(Math.abs(x) - 7.5, 0); const dz = z < -5 ? -5 - z : z > 8 ? z - 8 : 0;
    const d = Math.hypot(dx, dz);
    const k = (1 - (1 - dark) * smoothstep(far[0], far[1], d)) * light;
    const m = 1 + N.fbm(x * 0.07, z * 0.07, { oct: 3 }) * tintVar;
    return [k * m, k * m * (1 + N.fbm(x * 0.11 + 3, z * 0.11, { oct: 2 }) * 0.05), k * m];
  };
}

// Grass tufts everywhere; shorter / sparser inside the clear zone.
export function grassField(c, { n = 700, tint = [0.9, 0.9, 0.5], root = [0.07, 0.07, 0.03], hmin = 0.25, hmax = 0.6, wind = 1.0, rejectFn = null, innerKeep = 0.12, area = { x: [-40, 40], z: [-50, 14] }, density = null, spread = 0.22, blades = 11, color = null, windK = 0.55 } = {}) {
  const count = c.n(n);
  const geos = [0, 1, 2].map((i) => grassTuft(c.seed * 11 + i * 17, { blades, h: 0.5, w: 0.075, spread, rootCol: root, tipCol: [1, 1, 1] }));
  const per = Math.ceil(count / geos.length);
  const mat = c.arenaMat(`grass|${tint}|${root}`, () => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.3 }), { wind, windK, windSpeed: 1.7 });
  geos.forEach((g, gi) => {
    const items = [];
    for (let i = 0; i < per; i++) {
      let x; let z; let ok = false;
      for (let t = 0; t < 12 && !ok; t++) {
        x = rr(c.rng, area.x[0], area.x[1]); z = rr(c.rng, area.z[0], area.z[1]);
        ok = true;
        if (inClear(x, z) && c.rng() > innerKeep) ok = false;
        if (ok && rejectFn && rejectFn(x, z)) ok = false;
        if (ok && density && c.rng() > density(x, z)) ok = false;
      }
      if (!ok) continue;
      const inner = inClear(x, z);
      const s = rr(c.rng, hmin, hmax) * (inner ? 0.55 : 1) * (0.7 + 0.6 * smoothstep(8, 30, Math.hypot(x, z)));
      const col = color ? color(x, z) : [tint[0] * rr(c.rng, 0.6, 1.1), tint[1] * rr(c.rng, 0.6, 1.1), tint[2] * rr(c.rng, 0.6, 1.1)];
      items.push({ p: [x, c.hAt(x, z) - 0.02, z], r: c.rng() * 6.28, s: [s * rr(c.rng, 0.8, 1.2), s * rr(c.rng, 0.8, 1.2) * 1.25, s * rr(c.rng, 0.8, 1.2)], c: new THREE.Color(col[0], col[1], col[2]) });
    }
    c.addInstanced(g, mat, items);
  });
}

// Rocks of all sizes: tiny pebbles inside the clear zone (flush with the ground), boulders outside.
export function rockField(c, { n = 60, tint = 0x77726a, dark = 0x1e1c1a, big = [0.5, 1.6], area = { x: [-40, 40], z: [-60, 12] }, pebbles = 40, lichen = 0, seedOff = 0, strata = 0, tintMul = [1, 1, 1], ridged = false } = {}) {
  const geos = [0, 1, 2, 3].map((i) => rock(c.seed * 7 + i * 13 + seedOff, { detail: 1, amp: 0.34 + i * 0.03, freq: 1.2 + i * 0.25, flat: 0.55 + (i % 2) * 0.25, ridged: ridged && i > 1, strata, uv: 0.7 / Math.max(1, big[1]) }));
  const m = c.arenaMat(`rock|${tint}|${dark}|${lichen}`, () => texMat(rockTex({ tint, dark, seed: 6 + seedOff, lichenAmt: lichen, lichen: 0x5a6a3a }), { repeat: 1, vertexColors: true, envMapIntensity: 0.5 }), {});
  const nBig = c.n(n); const nPeb = c.n(pebbles);
  geos.forEach((g, gi) => {
    const items = [];
    for (let i = 0; i < Math.ceil(nBig / 4); i++) {
      const [x, z] = scatter(c.rng, 1, { x: area.x, z: area.z, pad: 0.5 })[0] || [20, -20];
      const s = rr(c.rng, big[0], big[1]) * (c.rng() < 0.2 ? 1.8 : 1);
      const k = rr(c.rng, 0.8, 1.1); const sh = c.rng() > 0.5;
      items.push({ p: [x, c.hAt(x, z) - s * 0.18, z], r: [0, c.rng() * 6.28, 0], s: [s * rr(c.rng, 0.9, 1.5), s * rr(c.rng, 0.7, 1.2), s * rr(c.rng, 0.9, 1.4)], c: new THREE.Color(k * tintMul[0], k * tintMul[1], k * tintMul[2]) });
    }
    for (let i = 0; i < Math.ceil(nPeb / 4); i++) {
      const x = rr(c.rng, CLEAR.x0 - 2, CLEAR.x1 + 2); const z = rr(c.rng, CLEAR.z0 - 2, CLEAR.z1 + 1);
      if (Math.abs(x - -1.9) < 0.9 && Math.abs(z - 1.6) < 0.9) continue;
      const s = rr(c.rng, 0.05, 0.18);
      items.push({ p: [x, c.hAt(x, z) - s * 0.25, z], r: [0, c.rng() * 6.28, 0], s: [s * 1.3, s * 0.7, s], c: new THREE.Color(rr(c.rng, 0.6, 1), rr(c.rng, 0.6, 1), rr(c.rng, 0.6, 1)) });
    }
    c.addInstanced(g, m, items, { cast: false });
  });
}

// World position of a tree-local point under instance placement.
export function treePoint(item, local) {
  const s = item.s; const ca = Math.cos(item.r); const sa = Math.sin(item.r);
  const lx = local.x * s; const ly = local.y * s; const lz = local.z * s;
  return [item.p[0] + lx * ca + lz * sa, item.p[1] + ly, item.p[2] - lx * sa + lz * ca];
}

// Instanced trees from a set of dryTree variants; returns the item lists for fire placement.
export function placeTrees(c, variants, positions, { material, scale = [0.85, 1.3], tintVar = 0.25, castNear = true } = {}) {
  const lists = variants.map(() => []);
  positions.forEach(([x, z, sMul], i) => {
    const v = Math.floor(c.rng() * variants.length);
    const s = rr(c.rng, scale[0], scale[1]) * (sMul || 1);
    const k = 1 - tintVar * c.rng();
    lists[v].push({ p: [x, c.hAt(x, z) - 0.08, z], r: c.rng() * 6.28, s, c: new THREE.Color(k, k * 0.98, k * 0.96), v });
    if (Math.abs(x) < 18 && z > -30) c.blobs.push({ p: [x, z], s: [2.2 * s, 2.0 * s], a: 0.6, y: c.hAt(x, z) });
  });
  const meshes = variants.map((g, i) => {
    const near = lists[i].filter((it) => Math.abs(it.p[0]) < 13 && it.p[2] > -14);
    const far = lists[i].filter((it) => !(Math.abs(it.p[0]) < 13 && it.p[2] > -14));
    const out = [];
    if (far.length) out.push(c.addInstanced(g.geo || g, material, far, { cast: false }));
    if (near.length) out.push(c.addInstanced(g.geo || g, material, near, { cast: castNear }));
    return out;
  });
  return lists;
}
