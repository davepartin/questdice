// Places, part 1: Burnt Orchard, Cinder Ford, Ravens' Rest, Wolfwood Edge.
import * as THREE from 'three';
import { makeNoise } from '../noise.js';
import { rr, rpick, scatter, inClear, smoothstep, CLEAR, instanced } from './common.js';
import { applyPalette, buildBackdrop, defaultPropMats } from './kit.js';
import { dryTree, pine, pineCard, rock, slab, grassTuft, cattail } from './flora.js';
import { hillsHeight, vcolorFn, grassField, rockField, treePoint, placeTrees } from './helpers.js';
import { texMat, rockTex, needleTex, soilTex, ashTex } from './tex.js';
import { Emitter, makeGlows } from './fx.js';
import {
  wheel, barrel, crate, skull, bone, ribcage, plank, brazier, ruinWall, toppledCart, fenceRun, farmhouse, haystack, wagon, steppingStone,
} from './props.js';

const LOOK = (o) => ({ bloom: 0.85, bloomRadius: 0.6, bloomThreshold: 0.78, vignette: 0.5, sat: 1.1, contrast: 1.1, tilt: 0.12, focusY: 0.5, grain: 0.04, exposure: 1.0, shadowTint: 0xdbf0ff, highTint: 0xfff0dc, aberration: 0.0014, ...o });

// =====================================================================================================
// BURNT ORCHARD
// =====================================================================================================
export function burntOrchard(c) {
  const { rng, B } = c;
  const ground = {
    height: hillsHeight({ seed: 3, amp: 1.6, freq: 0.03, backRise: 4.5, backStart: -42, sideRise: 3, sideStart: 16 }),
    vcolor: vcolorFn(3, { dark: 0.38 }),
    layers: [
      { set: soilTex({ tint: 0x6a5238, dark: 0x1a1008, seed: 2, pebble: 0.6 }), scale: 0.3 },
      { kind: 'grass', tint: 0x4c4c28, dark: 0x12140a, scale: 0.42, size: 512, seed: 3, opts: { dry: 0.7, dryTint: 0x7a6a34 } },
      { kind: 'cobble', tint: 0x4a443c, dark: 0x16120e, scale: 0.35, seed: 4 },
      { set: ashTex({ tint: 0x4a443e, dark: 0x0c0a09, seed: 5, cracks: 0.8 }), scale: 0.26 },
    ],
    thresholds: [0.6, 3, 0.47], wet: [0.82, 0.22], nstr: 2.2,
  };
  c.groundHeightFn = ground.height;
  applyPalette(c, {
    sky: { hor: 0x8a2c20, mid: 0x3c2048, top: 0x120c2c, glows: [{ az: -10, w: 30, h: 5.5, color: 0xff5a1a, k: 1.3 }, { az: 38, w: 55, h: 4.5, color: 0xd0402a, k: 0.45 }, { az: -72, w: 40, h: 4, color: 0x9a2a48, k: 0.35 }], moon: { on: 0 }, stars: 0.5, cloud: 0.72, cloudDark: 0x261630, cloudLit: 0xff6a30 },
    fog: { base: 0x4a1c1c, dens: 0.0095, fall: 0.2, height: 0.6, glow: 0.85 },
    env: { top: 0x2a2050, horizon: 0xff6a30, ground: 0x140a0c, lights: [{ color: 0xff9a5a, intensity: 16, pos: [-6, 3, 4], size: 4 }, { color: 0x7a80ff, intensity: 7, pos: [5, 6, -6], size: 5 }, { color: 0xffffff, intensity: 1.2, pos: [0, 9, 0], size: 5 }] },
    key: { color: 0xff9d5e, intensity: 2.3, pos: [-4.4, 3.6, 5.4] },
    rim: { color: 0x6a82ff, intensity: 1.4, pos: [5, 5, -10] },
    hemi: { sky: 0x3a3454, ground: 0x4a2c1a, intensity: 0.42 },
    look: LOOK({ bloom: 0.95, vignette: 0.52, sat: 1.12, contrast: 1.12, tilt: 0.14, shadowTint: 0xc8e4ff, highTint: 0xfff0d8 }),
  });
  buildBackdrop(c, {
    ground,
    ridges: [
      { radius: 190, arc: 1.9, top: 14, base: 0, mode: 0, haze: 0.62, color: 0x2a1830, seed: 1, rim: 0xff5a20, rimK: 0.7 },
      { radius: 150, arc: 1.9, top: 8, base: 0, mode: 2, haze: 0.45, color: 0x1a1020, seed: 2, toothW: 5, toothH: 6, rim: 0xff4a18, rimK: 0.45 },
    ],
  });
  defaultPropMats(c, { wood: 0x4a3626 });

  // ------------------------------------------------------------------ trees: orchard rows converge on the farm
  const variants = [0, 1, 2, 3].map((i) => dryTree(c.seed * 100 + i * 7, { h: 1.9 + i * 0.3, r: 0.26 + i * 0.015, limbs: 4 + (i % 2), spread: 0.8, depth: 2, curl: 0.75, radial: 6, lean: 0.35, droop: 0.2, twigsMax: 3, bark: [0.2, 0.17, 0.14], tip: [0.5, 0.44, 0.38], limbLen: 0.7 }));
  const treeMat = c.arenaMat('orchardBark', () => c.libMat('bark', { tint: 0x4a3c30, dark: 0x0e0a08 }).clone(), { wind: 1, windK: 0.012, windSpeed: 1.2 }, { vertexColors: true });
  const pos = [];
  const rowsX = [7.6, 12.6, 18, 24];
  for (const sx of [-1, 1]) {
    rowsX.forEach((rx, ri) => {
      for (let z = (ri % 2 ? -1.0 : 1.5); z > -64; z -= 6.0 + rng() * 1.4) {
        if (rng() < 0.22 + ri * 0.04) continue;
        pos.push([sx * (rx + (rng() - 0.5) * 1.0), z + (rng() - 0.5) * 1.2, 1]);
      }
    });
  }
  const lists = placeTrees(c, variants, pos, { material: treeMat, scale: [0.95, 1.45] });
  // burning branches on a few trees near the field + a handful in the distance
  const flat = lists.flat();
  const near = flat.filter((it) => Math.abs(it.p[0]) < 11 && it.p[2] < 3 && it.p[2] > -12).sort((a, b) => Math.abs(a.p[0]) - Math.abs(b.p[0]));
  const lit = [near.find((it) => it.p[0] < 0), near.find((it) => it.p[0] > 0 && it.p[2] < -6)].filter(Boolean);
  lit.forEach((it, i) => {
    const v = variants[it.v]; const tip = v.tips[(2 + i * 5) % v.tips.length];
    const wp = treePoint(it, tip);
    c.fire({ p: [wp[0], wp[1] - 0.2, wp[2]], w: 0.8, h: 1.7, power: 1.1, light: true, lightI: 55, lightDist: 17, embers: 18, tongues: 2 });
    for (let k = 0; k < 2; k++) { const t2 = v.tips[(k * 3 + 4) % v.tips.length]; const w2 = treePoint(it, t2); c.fire({ p: [w2[0], w2[1] - 0.1, w2[2]], w: 0.4, h: 0.8, power: 0.8, embers: 3, tongues: 1, glow: 0.7 }); }
  });
  const far = flat.filter((it) => it.p[2] < -14 && it.p[2] > -45 && Math.abs(it.p[0]) < 24);
  for (let i = 0; i < 8 && far.length; i++) {
    const it = far[Math.floor(rng() * far.length)]; const v = variants[it.v]; const wp = treePoint(it, v.tips[Math.floor(rng() * v.tips.length)]);
    c.fire({ p: [wp[0], wp[1] - 0.15, wp[2]], w: 0.9, h: 1.6, power: 0.9, embers: 4, tongues: 2, glow: 1.1 });
  }

  // ------------------------------------------------------------------ the farm at the end of the lane
  farmhouse(B, rng, { p: [-3.5, c.hAt(-3.5, -50) , -50], r: 0.15 }, { w: 10, d: 6.5, h: 3.6 });
  for (const [dx, dz, h, w] of [[-3.6, -3, 8, 3], [0.8, -2.8, 7, 2.6], [3.2, -1, 9.5, 3.4], [-1, 1.6, 5.5, 2.2], [2, 2.0, 6, 2.4]]) c.fire({ p: [-3.5 + dx, c.hAt(-3.5, -50) + 2.8, -50 + dz], w, h, power: 1.3, embers: 22, smoke: dx === 0.8 ? 0.4 : 0.25, tongues: 3, glow: 1.4 });
  c.glows.push({ p: [-3.5, 4, -52], s: 55, c: 0xff5a1a, k: 0.35, flick: 0.3, seed: 4 });
  // barn / outbuildings, burning too
  farmhouse(B, rng, { p: [-24, c.hAt(-24, -58), -58], r: 0.7 }, { w: 7, d: 5, h: 3 });
  c.fire({ p: [-24, c.hAt(-24, -58) + 2.5, -58], w: 4, h: 7, power: 1.1, embers: 10, smoke: 0.3, glow: 1.2 });
  c.fire({ p: [26, c.hAt(26, -62), -62], w: 3, h: 6, power: 0.9, embers: 6, smoke: 0.3, glow: 1.2 });

  // ------------------------------------------------------------------ ground-level dressing
  toppledCart(B, rng, { p: [8.6, 0, -1.4], r: -0.55 });
  haystack(B, rng, { p: [-9.5, 0, -7.5], s: 1.1 });
  haystack(B, rng, { p: [11.5, 0, -13], s: 1.5 });
  fenceRun(B, rng, { from: [-6.4, 4], to: [-6.9, -34], broken: 0.45 });
  fenceRun(B, rng, { from: [6.3, -5], to: [6.8, -38], broken: 0.5 });
  fenceRun(B, rng, { from: [-6.4, 4], to: [-8.2, 12], broken: 0.6 });
  // fallen logs & stumps
  for (let i = 0; i < 11; i++) {
    const sx = rng() < 0.5 ? -1 : 1; const x = sx * rr(rng, 6.3, 14); const z = rr(rng, -22, 6);
    const len = rr(rng, 1.4, 3.4); const rad = rr(rng, 0.1, 0.24);
    B.cyl('woodChar', [rad * 0.85, rad, len, 7], { p: [x, rad * 0.8, z], r: [0, rng() * 3.14, Math.PI / 2 + (rng() - 0.5) * 0.15] }, [0.85, 0.8, 0.75], { uv: 0.8 });
  }
  for (let i = 0; i < 9; i++) {
    const sx = rng() < 0.5 ? -1 : 1; const x = sx * rr(rng, 5.9, 12); const z = rr(rng, -16, 8); const h = rr(rng, 0.25, 0.7);
    B.cyl('woodChar', [0.16, 0.22, h, 7], { p: [x, h / 2 - 0.05, z], r: [(rng() - 0.5) * 0.2, 0, (rng() - 0.5) * 0.2] }, [0.8, 0.75, 0.7], { uv: 0.8 });
  }
  // bones / skulls / arrows scattered on the margin of the field
  for (let i = 0; i < 6; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 5.6, 8); const z = rr(rng, -3, 6); skull(B, { p: [x, 0.0, z], r: rng() * 6.28 }); }
  for (let i = 0; i < 9; i++) { const x = (rng() < 0.5 ? -1 : 1) * rr(rng, 5.4, 9); const z = rr(rng, -4, 7); bone(B, { p: [x, 0.03, z], r: [0, rng() * 3.14, 0] }, { len: rr(rng, 0.3, 0.6) }); }
  for (let i = 0; i < 7; i++) { const x = rr(rng, -5, 5); const z = rr(rng, -4, 7); B.cyl('wood', [0.006, 0.006, 1.0, 4], { p: [x, 0.42, z], r: [(rng() - 0.5) * 0.7, 0, (rng() - 0.5) * 0.7] }, [0.8, 0.75, 0.7], { ao: 0, cast: false }); }

  grassField(c, { n: 900, tint: [0.62, 0.55, 0.28], root: [0.05, 0.045, 0.02], hmin: 0.22, hmax: 0.6, density: (x, z) => 0.35 + 0.65 * smoothstep(5, 12, Math.hypot(Math.max(Math.abs(x) - 5, 0), Math.max(-z - 4, 0))) });
  rockField(c, { n: 40, tint: 0x5a544c, dark: 0x1a1816, big: [0.35, 1.1], area: { x: [-30, 30], z: [-45, 10] }, pebbles: 45 });
  // scorch marks and ash drifts around the field
  for (let i = 0; i < 12; i++) { const sx = rng() < 0.5 ? -1 : 1; c.scorches.push({ p: [sx * rr(rng, 4, 10), rr(rng, -6, 8)], s: [rr(rng, 1.8, 4.5), rr(rng, 1.5, 3.5)], rot: rng() * 6.28, a: rr(rng, 0.5, 1) }); }
  for (let i = 0; i < 5; i++) c.scorches.push({ p: [rr(rng, -4.8, 4.8), rr(rng, -4, 6.5)], s: [rr(rng, 1.2, 2.4), rr(rng, 1.0, 2.0)], rot: rng() * 6.28, a: 0.55 });
  // puddles of ember-lit water
  c.puddles = [[-6.5, -0.5, 2.2], [7.2, 2.5, 1.8], [-8.5, 3.5, 1.4], [5.9, -3.2, 1.2], [-4.2, -4.8, 1.6], [3.5, 8.4, 1.5], [-12, -10, 3.4], [13, -9, 2.8]];
  c.puddleOpts = { deep: 0x140a0c, shallow: 0x3a2018, spark: 0xff7a30, tl: 0.06, tlCol: 0x120508, mirror: 0.12 };

  // ------------------------------------------------------------------ atmosphere
  const fogCol = 0x42243a; const fogCol2 = 0x5a2a30;
  [[-12, 0.5, -9, 34, 22], [12, 0.7, -16, 36, 24], [0, 0.9, -26, 70, 36], [-2, 1.3, -38, 90, 40], [-8, 0.4, 3, 18, 12], [9, 0.4, 2, 16, 10]].forEach(([x, y, z, w, d], i) => c.fogLayers.push({ kind: 'flat', p: [x, y, z], w, d, col: i % 2 ? fogCol2 : fogCol, dens: i < 4 ? 0.42 : 0.2, scale: 0.9, speed: 0.8, seed: i * 1.9 }));
  [[-4, 0, -20, 70, 11], [6, 0, -32, 90, 14], [0, 0, -46, 120, 16]].forEach(([x, y, z, w, h], i) => c.fogLayers.push({ kind: 'wall', p: [x, y, z], w, d: h, col: 0x5a2a30, dens: 0.55 - i * 0.1, scale: 0.7, speed: 0.6, seed: 5 + i * 2.7 }));
  c.smokeOpts = { smokeCol: 0xff7a34, smokeEnd: 0x2a2030 };
  c.ambient = { ash: 22, ambientEmbers: 9, wind: 0.8 };
}
