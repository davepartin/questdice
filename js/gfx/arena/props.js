// Set dressing. Everything is baked into one merged mesh per material (Batch), so hundreds of planks, bones
// and bricks cost a handful of draw calls. Vertex colours carry hand-painted AO: the lowest metre of every
// prop is darkened so it sits in the ground instead of floating on it.
import * as THREE from 'three';
import { lathe, tube, displace, paint } from '../util.js';
import { mulberry32 } from '../noise.js';
import { finishGeo, mergeGeometries, tintGeo, smoothstep } from './common.js';

const E = new THREE.Euler(); const Q = new THREE.Quaternion(); const P3 = new THREE.Vector3(); const S3 = new THREE.Vector3();
function tmat(t = {}) {
  const r = t.r ?? 0; const s = t.s ?? 1;
  E.set(...(Array.isArray(r) ? r : [0, r, 0]), 'YXZ'); Q.setFromEuler(E);
  P3.set(...(t.p || [0, 0, 0])); if (Array.isArray(s)) S3.set(...s); else S3.set(s, s, s);
  return new THREE.Matrix4().compose(P3, Q, S3);
}

export class Batch {
  constructor() { this.parts = new Map(); this.stack = [new THREE.Matrix4()]; this.tris = 0; }
  push(t) { this.stack.push(this.stack[this.stack.length - 1].clone().multiply(tmat(t))); return this; }
  pop() { if (this.stack.length > 1) this.stack.pop(); return this; }
  with(t, fn) { this.push(t); fn(this); this.pop(); return this; }
  add(key, geo, t = {}, color = [1, 1, 1], { uv = 0.6, cast, ao = 1 } = {}) {
    const g = finishGeo(geo, { color, uv });
    const top = this.stack[this.stack.length - 1];
    g.applyMatrix4(tmat(t)); g.applyMatrix4(top);
    const baseY = top.elements[13] + (t.p ? 0 : 0);
    if (ao > 0) tintGeo(g, (x, y, z, c) => { const k = 1 - ao * 0.55 * (1 - smoothstep(0.0, 0.7, y - baseY)); return [c[0] * k, c[1] * k, c[2] * k]; });
    const wx = top.elements[12]; const wz = top.elements[14];
    const doCast = cast ?? (Math.abs(wx) < 12 && wz > -13);
    const k = `${key}|${doCast ? 1 : 0}`;
    if (!this.parts.has(k)) this.parts.set(k, []);
    this.parts.get(k).push(g);
    this.tris += g.attributes.position.count / 3;
    return this;
  }
  box(key, size, t, color, o) { return this.add(key, new THREE.BoxGeometry(...size), t, color, o); }
  cyl(key, [rt, rb, h, seg = 8, hs = 1, open = false], t, color, o) { return this.add(key, new THREE.CylinderGeometry(rt, rb, h, seg, hs, open), t, color, o); }
  cone(key, [r, h, seg = 8], t, color, o) { return this.add(key, new THREE.ConeGeometry(r, h, seg), t, color, o); }
  sph(key, [r, ws = 10, hs = 8], t, color, o) { return this.add(key, new THREE.SphereGeometry(r, ws, hs), t, color, o); }
  tor(key, [R, r, rs = 6, ts = 16], t, color, o) { return this.add(key, new THREE.TorusGeometry(R, r, rs, ts), t, color, o); }
  lathe(key, profile, seg, t, color, o) { return this.add(key, lathe(profile, seg), t, color, o); }
  geo(key, g, t, color, o) { return this.add(key, g, t, color, o); }
  // build meshes: mats maps key -> Material
  finalize(mats, group) {
    for (const [k, list] of this.parts) {
      const [key, cast] = k.split('|');
      const m = mats[key]; if (!m) { console.warn('arena: no material for batch key', key); continue; }
      const g = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = cast === '1'; mesh.receiveShadow = true; mesh.name = `props-${key}`; mesh.frustumCulled = false;
      group.add(mesh);
    }
  }
}

const rnd = (rng, a, b) => a + (b - a) * rng();

// ---------------------------------------------------------------------------------------------------
// Generic pieces
// ---------------------------------------------------------------------------------------------------
export function wheel(B, { r = 0.5, spokes = 8, key = 'wood', iron = 'iron', broken = 0 } = {}, t) {
  B.with(t, () => {
    B.tor(key, [r, r * 0.09, 6, 22], { r: [0, Math.PI / 2, 0] }, [0.8, 0.8, 0.8]);
    B.cyl(key, [r * 0.16, r * 0.16, r * 0.3, 8], { r: [0, 0, Math.PI / 2] });
    for (let i = 0; i < spokes; i++) {
      if (broken && i % 3 === broken % 3) continue;
      const a = (i / spokes) * Math.PI * 2;
      B.box(key, [r * 0.07, r * 0.88, r * 0.07], { r: [a, 0, 0], p: [0, Math.cos(a) * 0 , 0] }, [0.75, 0.75, 0.75], { ao: 0 });
    }
    B.tor(iron, [r * 1.0, r * 0.03, 4, 22], { r: [0, Math.PI / 2, 0], p: [0.0, 0, 0] }, [0.6, 0.6, 0.6], { ao: 0 });
  });
}
export function barrel(B, t, { key = 'wood', iron = 'iron', h = 0.9, r = 0.36 } = {}) {
  B.with(t, () => {
    B.lathe(key, [[r * 0.8, 0], [r * 0.95, h * 0.2], [r, h * 0.5], [r * 0.95, h * 0.8], [r * 0.8, h]], 12, {}, [0.85, 0.8, 0.75]);
    for (const y of [0.17, 0.83]) B.tor(iron, [r * (y < 0.5 ? 0.96 : 0.96), 0.018, 4, 14], { p: [0, h * y, 0], r: [Math.PI / 2, 0, 0] }, [0.7, 0.7, 0.7], { ao: 0 });
    B.cyl(key, [r * 0.8, r * 0.8, 0.03, 12], { p: [0, h, 0] }, [0.6, 0.55, 0.5]);
  });
}
export function crate(B, t, { key = 'wood', iron = 'iron', s = 0.7 } = {}) {
  B.with(t, () => {
    B.box(key, [s, s, s], { p: [0, s / 2, 0] }, [0.9, 0.85, 0.8]);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) B.box(key, [0.06, s * 1.02, 0.06], { p: [x * s / 2, s / 2, z * s / 2] }, [0.6, 0.55, 0.5], { ao: 0 });
    B.box(key, [s * 1.01, 0.05, s * 1.01], { p: [0, s * 0.5, 0] }, [0.55, 0.5, 0.45], { ao: 0 });
  });
}
export function skull(B, t, { key = 'bone', big = false } = {}) {
  B.with(t, () => {
    B.sph(key, [0.11, 10, 8], { p: [0, 0.11, 0], s: [1, 0.92, 1.05] }, [1, 0.96, 0.88]);
    B.box(key, [0.12, 0.06, 0.1], { p: [0, 0.03, 0.06] }, [0.95, 0.9, 0.82]);
    for (const x of [-1, 1]) B.sph('boneDark', [0.028, 6, 5], { p: [x * 0.045, 0.12, 0.095] }, [0.1, 0.1, 0.1], { ao: 0 });
    B.box('boneDark', [0.02, 0.03, 0.02], { p: [0, 0.075, 0.115] }, [0.1, 0.1, 0.1], { ao: 0 });
  });
}
export function bone(B, t, { key = 'bone', len = 0.5, r = 0.03 } = {}) {
  B.with(t, () => {
    B.cyl(key, [r, r, len, 6], { r: [0, 0, Math.PI / 2] }, [1, 0.95, 0.85]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) B.sph(key, [r * 1.5, 6, 5], { p: [x * len / 2, 0, z * r * 0.8] }, [1, 0.95, 0.85], { ao: 0 });
  });
}
export function ribcage(B, t, { key = 'bone', h = 0.45 } = {}) {
  B.with(t, () => {
    B.cyl(key, [0.025, 0.025, h * 1.6, 6], { r: [0, 0, Math.PI / 2], p: [0, 0.07, 0] }, [1, 0.95, 0.85]);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * h * 0.2; const k = 1 - Math.abs(i - 3) / 4;
      for (const s of [-1, 1]) B.tor(key, [h * 0.22 * k + 0.06, 0.016, 4, 8, ], { p: [x, 0.07, 0], r: [0, Math.PI / 2, s > 0 ? 0 : 0.0], s: [1, 1, 1] }, [1, 0.95, 0.85], { ao: 0 });
    }
  });
}
export function plank(B, t, { key = 'wood', len = 1.6, w = 0.18, th = 0.04, color = [0.8, 0.75, 0.7] } = {}) {
  B.box(key, [len, th, w], t, color);
}
export function brazier(B, t, { h = 1.1, bowl = 0.34 } = {}) {
  B.with(t, () => {
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; B.cyl('iron', [0.022, 0.03, h, 5], { p: [Math.cos(a) * 0.16, h / 2 - 0.02, Math.sin(a) * 0.16], r: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14] }, [0.6, 0.6, 0.6]); }
    B.lathe('iron', [[0.04, 0], [bowl * 0.8, 0.12], [bowl, 0.26], [bowl * 0.96, 0.27], [bowl * 0.78, 0.15], [0.02, 0.03]], 12, { p: [0, h - 0.04, 0] }, [0.5, 0.5, 0.5], { ao: 0 });
    B.tor('iron', [bowl * 0.96, 0.02, 4, 14], { p: [0, h + 0.22, 0], r: [Math.PI / 2, 0, 0] }, [0.5, 0.5, 0.5], { ao: 0 });
  });
}
export function ruinWall(B, rng, { len = 6, h = 2.2, th = 0.7, key = 'stoneDark', p = [0, 0, 0], yaw = 0, rows = 5, gaps = 0.25, color = [0.7, 0.68, 0.64] } = {}) {
  B.with({ p, r: yaw }, () => {
    for (let row = 0; row < rows; row++) {
      const y = row * (h / rows); let x = -len / 2;
      const cut = 1 - row / rows; // top rows more broken
      while (x < len / 2) {
        const bw = rnd(rng, 0.5, 1.1); const bh = h / rows * rnd(rng, 0.85, 1.0);
        if (rng() > cut * (1 - gaps) + 0.25 * (1 - row / rows) + (row === 0 ? 1 : 0)) { x += bw; continue; }
        const j = (rng() - 0.5) * 0.06;
        B.box(key, [bw * 0.97, bh, th * rnd(rng, 0.85, 1.05)], { p: [x + bw / 2, y + bh / 2, (rng() - 0.5) * 0.05], r: [0, j, (rng() - 0.5) * 0.04] }, color.map((c) => c * rnd(rng, 0.75, 1.1)));
        x += bw;
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------------
// Burnt Orchard pieces
// ---------------------------------------------------------------------------------------------------
export function toppledCart(B, rng, t) {
  B.with(t, () => {
    // bed tipped on its broken axle: front lifted, back dug in
    B.with({ p: [0, 0.38, 0], r: [0, 0, 0.22] }, () => {
      for (let i = 0; i < 6; i++) B.box('wood', [1.9, 0.045, 0.16], { p: [0, 0, -0.5 + i * 0.2], r: [0, 0, (rng() - 0.5) * 0.02] }, [0.85, 0.8, 0.75].map((c) => c * rnd(rng, 0.8, 1.05)), { ao: 0.4 });
      for (const z of [-0.53, 0.53]) {
        for (let k = 0; k < 3; k++) { if (z > 0 && k === 2) continue; B.box('wood', [1.85, 0.12, 0.04], { p: [0, 0.13 + k * 0.14, z], r: [0, 0, (rng() - 0.5) * 0.03] }, [0.8, 0.75, 0.7], { ao: 0.3 }); }
      }
      B.box('wood', [0.05, 0.42, 1.1], { p: [-0.93, 0.2, 0] }, [0.7, 0.66, 0.62]);
      B.box('wood', [0.05, 0.28, 1.1], { p: [0.93, 0.14, 0], r: [0.1, 0, 0.1] }, [0.7, 0.66, 0.62]);
      for (let i = 0; i < 4; i++) B.tor('iron', [0.55, 0.012, 4, 14, ], { p: [-0.7 + i * 0.46, 0.0, 0], r: [0, Math.PI / 2, 0], s: [1, 0.35, 1] }, [0.6, 0.6, 0.6], { ao: 0 });
      // hoops of the burnt canvas cover: bare ribs
      for (let i = 0; i < 4; i++) B.geo('charWood', new THREE.TorusGeometry(0.52, 0.018, 4, 10, Math.PI), { p: [-0.6 + i * 0.4, 0.2, 0], r: [0, Math.PI / 2, 0], s: [1, 1, 1] }, [0.6, 0.6, 0.6], { ao: 0 });
    });
    // shafts, one snapped
    B.box('wood', [2.2, 0.07, 0.07], { p: [-2.0, 0.22, 0.28], r: [0, 0.12, 0.14] }, [0.7, 0.65, 0.6]);
    B.box('wood', [1.1, 0.07, 0.07], { p: [-1.5, 0.12, -0.35], r: [0, -0.3, 0.05] }, [0.65, 0.6, 0.55]);
    // one wheel still on the axle, the other thrown away flat in the dirt
    wheel(B, { r: 0.55, spokes: 8, broken: 2 }, { p: [0.55, 0.55, 0.62], r: [0, 0, 0.0] });
    wheel(B, { r: 0.55, spokes: 8 }, { p: [2.1, 0.07, -1.1], r: [Math.PI / 2 - 0.12, 0.6, 0] });
    barrel(B, { p: [-1.1, 0.34, 1.3], r: [0, 0.5, Math.PI / 2 - 0.1] });
    barrel(B, { p: [1.2, 0.0, 1.5], r: [0, 0, 0.12] });
    // spilled apples (burnt black) and a sack
    for (let i = 0; i < 16; i++) B.sph('ember', [0.055, 6, 5], { p: [rnd(rng, -2, 2.4), 0.05, rnd(rng, 0.8, 2.6)], s: [1, 0.9, 1] }, [0.12, 0.05, 0.03].map((c) => c * rnd(rng, 0.7, 1.4)), { ao: 0 });
    B.sph('cloth', [0.38, 8, 6], { p: [0.2, 0.16, 1.9], s: [1, 0.55, 0.8], r: [0, 0.6, 0] }, [0.4, 0.34, 0.26]);
  });
}

export function fenceRun(B, rng, { from = [0, 0], to = [0, -10], step = 1.8, h = 1.15, broken = 0.4, key = 'woodChar' } = {}) {
  const dx = to[0] - from[0]; const dz = to[1] - from[1]; const len = Math.hypot(dx, dz); const n = Math.max(1, Math.floor(len / step));
  const yaw = Math.atan2(dx, dz);
  for (let i = 0; i <= n; i++) {
    const x = from[0] + dx * i / n; const z = from[1] + dz * i / n;
    const gone = rng() < broken * 0.4; if (gone) continue;
    const hh = h * rnd(rng, 0.45, 1.1);
    B.with({ p: [x, 0, z], r: [rnd(rng, -0.1, 0.1), yaw, rnd(rng, -0.12, 0.12)] }, () => {
      B.cyl(key, [0.045, 0.06, hh, 5], { p: [0, hh / 2 - 0.1, 0] }, [0.8, 0.75, 0.7]);
    });
    if (i < n && rng() > broken) {
      const x2 = from[0] + dx * (i + 1) / n; const z2 = from[1] + dz * (i + 1) / n;
      for (const y of [0.45, 0.85]) {
        if (rng() < broken * 0.6) continue;
        B.box(key, [0.035, 0.07, step * rnd(rng, 0.8, 1.02)], { p: [(x + x2) / 2, y * rnd(rng, 0.8, 1.05) + (rng() - 0.5) * 0.06, (z + z2) / 2], r: [(rng() - 0.5) * 0.15, yaw, (rng() - 0.5) * 0.1] }, [0.75, 0.7, 0.65], { ao: 0.2 });
      }
    }
  }
}

// A burning-farmhouse silhouette for the distance: walls, a ribs-only roof, glowing windows, a chimney.
export function farmhouse(B, rng, t, { w = 9, d = 6, h = 3.4 } = {}) {
  B.with(t, () => {
    const col = [0.5, 0.46, 0.42];
    B.box('stoneDark', [w, h, 0.5], { p: [0, h / 2, -d / 2] }, col, { cast: false, uv: 0.4 });
    B.box('stoneDark', [0.5, h, d], { p: [-w / 2, h / 2, 0] }, col, { cast: false, uv: 0.4 });
    B.box('stoneDark', [0.5, h * 0.7, d], { p: [w / 2, h * 0.35, 0] }, col, { cast: false, uv: 0.4 });
    B.box('stoneDark', [w * 0.55, h * 0.8, 0.5], { p: [-w * 0.22, h * 0.4, d / 2] }, col, { cast: false, uv: 0.4 });
    // gable ends + rafters
    const ridge = h + 2.2;
    for (const z of [-d / 2, d / 2]) {
      const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, ridge - h); sh.closePath();
      const g = new THREE.ShapeGeometry(sh); g.translate(0, h, z);
      B.geo('charWood', g, {}, [0.4, 0.4, 0.4], { cast: false });
    }
    for (let i = 0; i < 9; i++) {
      const z = -d / 2 + (i / 8) * d; if (rng() < 0.22) continue;
      for (const s of [-1, 1]) {
        const len = Math.hypot(w / 2, ridge - h);
        B.box('charWood', [len, 0.14, 0.14], { p: [s * w / 4, h + (ridge - h) / 2, z], r: [0, 0, -s * Math.atan2(ridge - h, w / 2)] }, [0.5, 0.45, 0.4], { cast: false, ao: 0 });
      }
    }
    B.box('charWood', [0.2, 0.2, d + 0.6], { p: [0, ridge, 0] }, [0.45, 0.4, 0.35], { cast: false, ao: 0 });
    for (let i = 0; i < 3; i++) B.box('charWood', [w * 0.45, 0.06, d / 3], { p: [-w * 0.2, h + 0.9 + i * 0.4, -d * 0.3 + i * 0.5], r: [0.3, 0, 0.5] }, [0.45, 0.4, 0.36], { cast: false, ao: 0 });
    // chimney
    B.box('stoneDark', [0.9, ridge + 1.6, 0.9], { p: [w * 0.28, (ridge + 1.6) / 2, -d / 2 + 0.6] }, col, { cast: false, uv: 0.4 });
    // windows lit from inside
    for (const x of [-w * 0.3, w * 0.1]) B.box('emit', [0.9, 0.9, 0.05], { p: [x, h * 0.55, -d / 2 + 0.28] }, [1, 1, 1], { cast: false, ao: 0 });
    B.box('emit', [0.7, 1.2, 0.05], { p: [w / 2 - 0.2, h * 0.3, 1.0], r: [0, Math.PI / 2, 0] }, [1, 0.9, 0.9], { cast: false, ao: 0 });
    // rubble
    for (let i = 0; i < 14; i++) B.box('stoneDark', [rnd(rng, 0.3, 0.9), rnd(rng, 0.2, 0.5), rnd(rng, 0.3, 0.9)], { p: [rnd(rng, -w * 0.7, w * 0.7), 0.15, d / 2 + rnd(rng, 0.3, 2.2)], r: [0, rng() * 3, (rng() - 0.5) * 0.4] }, [0.6, 0.58, 0.55], { cast: false });
  });
}

export function haystack(B, rng, t, { r = 1.2 } = {}) {
  B.with(t, () => {
    const g = new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 1.1, 1);
    B.geo('thatch', displace(g, { amp: 0.12, freq: 1.5, seed: Math.floor(rng() * 99) + 1 }), {}, [0.35, 0.3, 0.22]);
  });
}

// Charred skeleton of a haywain / wagon for Smoke Hollow.
export function wagon(B, rng, t, { burn = true } = {}) {
  B.with(t, () => {
    const ky = burn ? 'charWood' : 'wood';
    B.box(ky, [3.2, 0.12, 1.5], { p: [0, 0.75, 0] }, [0.6, 0.55, 0.5], { cast: true });
    for (let i = 0; i < 5; i++) { const x = -1.4 + i * 0.7; B.box(ky, [0.06, 0.55, 0.06], { p: [x, 1.05, 0.74] }, [0.6, 0.55, 0.5], { ao: 0.2 }); B.box(ky, [0.06, 0.55, 0.06], { p: [x, 1.05, -0.74] }, [0.6, 0.55, 0.5], { ao: 0.2 }); }
    for (const z of [-0.74, 0.74]) { B.box(ky, [3.2, 0.06, 0.06], { p: [0, 1.32, z] }, [0.55, 0.5, 0.45], { ao: 0 }); }
    for (let i = 0; i < 4; i++) B.geo(ky, new THREE.TorusGeometry(0.78, 0.025, 4, 12, Math.PI), { p: [-1.2 + i * 0.8, 1.15, 0], r: [0, Math.PI / 2, 0] }, [0.5, 0.45, 0.4], { ao: 0 });
    wheel(B, { r: 0.72, spokes: 10, key: ky, broken: 1 }, { p: [-1.0, 0.72, 0.9], r: [0, 0, 0] });
    wheel(B, { r: 0.72, spokes: 10, key: ky }, { p: [1.0, 0.72, 0.9], r: [0, 0, 0] });
    wheel(B, { r: 0.72, spokes: 10, key: ky, broken: 2 }, { p: [-1.0, 0.72, -0.9], r: [0, 0.05, 0] });
    B.box(ky, [2.8, 0.08, 0.08], { p: [3.0, 0.5, 0], r: [0, 0, -0.18] }, [0.55, 0.5, 0.45]);
    for (let i = 0; i < 6; i++) B.sph('ember', [rnd(rng, 0.15, 0.3), 6, 5], { p: [rnd(rng, -1.2, 1.2), 0.95, rnd(rng, -0.5, 0.5)], s: [1.2, 0.7, 1] }, [0.12, 0.1, 0.1], { cast: false });
  });
}

// Stepping stones for a ford: flat-topped, slightly wet, dark.
export function steppingStone(B, rng, t, { r = 0.5 } = {}) {
  const g = new THREE.CylinderGeometry(r * 0.9, r, 0.45, 9, 2); const d = displace(g, { amp: r * 0.2, freq: 1.2, seed: Math.floor(rng() * 90) + 1, oct: 2 });
  B.geo('stoneDark', d, t, [0.85, 0.85, 0.9], { cast: false, ao: 0.5 });
}
export { rnd };
