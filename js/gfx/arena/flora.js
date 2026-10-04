// Vegetation and rocks: recursive dry/charred trees, layered pines, giant dead trees, grass tufts, reeds
// and sculpted rocks. Every builder returns a BufferGeometry with position/normal/uv/color so the
// instances batch into one draw call per variant, with baked vertex-colour AO and wind-ready shapes.
import * as THREE from 'three';
import { tube, displace, paint } from '../util.js';
import { mulberry32 } from '../noise.js';
import { finishGeo, xf, tintGeo, mergeGeometries, rr } from './common.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------------
// Recursive limb tree. Returns { geo, tips: [Vector3...] (branch ends, for ravens / fire), height }
// ---------------------------------------------------------------------------------------------------
export function dryTree(seed, o = {}) {
  const rng = mulberry32(seed);
  const {
    h = 3.2, r = 0.2, limbs = 5, spread = 1.0, depth = 2, curl = 0.4, radial = 6, lean = 0.12, droop = 0.1,
    bark = [0.2, 0.17, 0.15], tip = [0.5, 0.42, 0.36], limbLen = 0.62, twigsMax = 3, ember = 0, splitTop = false,
  } = o;
  const parts = []; const tips = []; const forks = [];
  function grow(p, d, len, rad, lvl) {
    const n = lvl === 0 ? 5 : lvl === 1 ? 4 : 3;
    const pts = [p.clone()]; let cur = p.clone(); const dir = d.clone();
    for (let i = 0; i < n; i++) {
      dir.x += (rng() - 0.5) * curl * (lvl === 0 ? 0.6 : 1); dir.z += (rng() - 0.5) * curl * (lvl === 0 ? 0.6 : 1);
      dir.y += lvl === 0 ? 0.02 : (0.06 - droop * lvl * rng() * 1.6);
      dir.normalize();
      cur = cur.clone().addScaledVector(dir, len / n); pts.push(cur);
    }
    parts.push({ pts, r0: rad, r1: rad * (lvl === 0 ? 0.42 : 0.3), lvl });
    tips.push(cur.clone());
    if (lvl < depth) {
      const kids = lvl === 0 ? limbs : 1 + Math.floor(rng() * twigsMax);
      for (let k = 0; k < kids; k++) {
        const t = lvl === 0 ? 0.3 + 0.7 * ((k + rng() * 0.6) / kids) : 0.3 + rng() * 0.65;
        const idx = Math.max(1, Math.min(n, Math.floor(t * n)));
        const base = pts[idx].clone();
        const az = (lvl === 0 ? k * 2.399 : rng() * Math.PI * 2) + rng() * 0.6;
        const up = lvl === 0 ? 0.55 + rng() * 0.9 : 0.0 + rng() * 0.9;
        const nd = V3(Math.cos(az) * spread, up, Math.sin(az) * spread).normalize();
        forks.push(base);
        grow(base, nd, len * (limbLen + rng() * 0.25) * (lvl === 0 ? 0.95 : 0.85), rad * (lvl === 0 ? 0.62 : 0.6), lvl + 1);
      }
    }
  }
  grow(V3(0, -0.1, 0), V3(lean * (rng() - 0.5) * 2, 1, lean * (rng() - 0.5) * 2).normalize(), h, r, 0);
  if (splitTop) { grow(V3(0, h * 0.8, 0), V3(0.5, 1, 0.2).normalize(), h * 0.45, r * 0.4, 1); }
  const geos = parts.map((pt) => {
    const rad = radial - pt.lvl;
    const flare = pt.lvl === 0 ? r * 0.7 : 0;
    const g = tube(pt.pts, (t) => pt.r0 + (pt.r1 - pt.r0) * t + flare * Math.pow(1 - t, 7), { segs: (pt.pts.length - 1) * 2, radial: Math.max(3, rad) });
    const c = pt.lvl === 0 ? bark : tip;
    const f = finishGeo(g, { color: c, uv: 0.55 });
    tintGeo(f, (x, y, z, col) => { const k = 0.75 + 0.5 * Math.abs(Math.sin(x * 7 + z * 5 + y * 3)); const dark = pt.lvl === 0 ? Math.max(0.35, Math.min(1, y / (h * 0.5))) : 1; return [col[0] * k * dark, col[1] * k * dark, col[2] * k * dark]; });
    return f;
  });
  const geo = mergeGeometries(geos, false);
  return { geo, tips, forks, height: h };
}

// ---------------------------------------------------------------------------------------------------
// Pine: jagged drooping skirts on a trunk. tiers * K * 2 triangles. frost lightens the upper faces.
// ---------------------------------------------------------------------------------------------------
export function pine(seed, { h = 7, r = 1.7, tiers = 10, K = 10, frost = 0.0, dead = 0, color = [0.55, 0.62, 0.58] } = {}) {
  const rng = mulberry32(seed);
  const parts = [];
  // trunk
  const trunk = new THREE.CylinderGeometry(0.06 * h * 0.12, 0.2 * h * 0.12, h * 0.95, 6, 2, true).translate(0, h * 0.475, 0);
  parts.push(finishGeo(trunk, { color: [0.25, 0.18, 0.13], uv: 0.4 }));
  const pos = []; const col = [];
  for (let t = 0; t < tiers; t++) {
    const k = t / (tiers - 1);
    const yb = h * (0.14 + 0.82 * k * 0.95); const rad = r * (1.0 - k * 0.92) * (0.9 + rng() * 0.2) + 0.12;
    const hgt = h * (0.2 + 0.05 * (1 - k)); const yTop = yb + hgt;
    const ring = [];
    for (let i = 0; i < K * 2; i++) {
      const a = (i / (K * 2)) * Math.PI * 2 + (t % 2) * 0.3 + (rng() - 0.5) * 0.15;
      const rad2 = rad * (i % 2 ? 0.55 : 1.0) * (0.85 + rng() * 0.3);
      const droop = (i % 2 ? 0.0 : -0.18 * rad) - rng() * 0.12 * rad;
      ring.push([Math.cos(a) * rad2, yb + droop, Math.sin(a) * rad2]);
    }
    const apex = [0, yTop, 0];
    for (let i = 0; i < K * 2; i++) {
      const a = ring[i]; const b = ring[(i + 1) % (K * 2)];
      pos.push(...apex, ...b, ...a);
      // colour: dark underneath/at the ring, lighter near the apex (+ frost on upward faces)
      const lum = 0.55 + rng() * 0.25;
      for (const q of [apex, b, a]) {
        const up = (q[1] - yb) / hgt;
        const fr = frost * up;
        col.push(color[0] * (lum * (0.55 + up * 0.7)) + fr * 0.7, color[1] * (lum * (0.55 + up * 0.7)) + fr * 0.75, color[2] * (lum * (0.55 + up * 0.7)) + fr * 0.85);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  parts.push(finishGeo(g, { uv: 0.9 }));
  return mergeGeometries(parts, false);
}

// Cheap flat pine card for the far wall: 3 stacked triangles in one plane + a cross plane.
export function pineCard(seed, { h = 8, w = 3 } = {}) {
  const rng = mulberry32(seed); const pos = []; const col = [];
  for (let c = 0; c < 2; c++) {
    const ca = c * Math.PI / 2; const cx = Math.cos(ca); const cz = Math.sin(ca);
    for (let t = 0; t < 5; t++) {
      const k = t / 4; const yb = h * (0.12 + 0.62 * k); const yt = yb + h * 0.3; const hw = w * (1 - k * 0.8) * (0.9 + rng() * 0.2);
      pos.push(-hw * cx, yb, -hw * cz, hw * cx, yb, hw * cz, 0, yt, 0);
      const l = 0.4 + rng() * 0.2; for (let i = 0; i < 3; i++) col.push(l * (i === 2 ? 1.2 : 0.8), l * (i === 2 ? 1.3 : 0.9), l * (i === 2 ? 1.25 : 0.95));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return finishGeo(g, { uv: 0.5 });
}

// ---------------------------------------------------------------------------------------------------
// Grass tuft: N tapered, curved blades. Blade colour ramps root (dark) to tip (light) in vertex colour.
// ---------------------------------------------------------------------------------------------------
export function grassTuft(seed, { blades = 7, h = 0.45, w = 0.045, spread = 0.18, rootCol = [0.18, 0.18, 0.08], tipCol = [1, 1, 1], reed = false } = {}) {
  const rng = mulberry32(seed); const pos = []; const col = []; const nrm = [];
  for (let b = 0; b < blades; b++) {
    const a = rng() * Math.PI * 2; const d = Math.sqrt(rng()) * spread;
    const bx = Math.cos(a) * d; const bz = Math.sin(a) * d;
    const ha = rng() * Math.PI * 2; const hh = h * (0.55 + rng() * 0.7); const lean = (0.1 + rng() * 0.45) * (reed ? 0.4 : 1);
    const dx = Math.cos(ha); const dz = Math.sin(ha); const px = -dz; const pz = dx;
    const ww = w * (0.7 + rng() * 0.6);
    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs; const t1 = (s + 1) / segs;
      const f = (t) => ({ y: hh * t, o: lean * hh * t * t, w: ww * (1 - t * 0.92) });
      const A = f(t0); const B = f(t1);
      const v = (F, side, t) => [bx + dx * F.o + px * F.w * side, F.y, bz + dz * F.o + pz * F.w * side];
      const p0 = v(A, -1); const p1 = v(A, 1); const p2 = v(B, -1); const p3 = v(B, 1);
      if (s === segs - 1) { pos.push(...p0, ...p1, bx + dx * B.o, B.y, bz + dz * B.o); } else { pos.push(...p0, ...p1, ...p2, ...p1, ...p3, ...p2); }
      const nCount = s === segs - 1 ? 3 : 6;
      for (let i = 0; i < nCount; i++) nrm.push(0, 1, 0);
      const c0 = [rootCol[0] + (tipCol[0] - rootCol[0]) * t0, rootCol[1] + (tipCol[1] - rootCol[1]) * t0, rootCol[2] + (tipCol[2] - rootCol[2]) * t0];
      const c1 = [rootCol[0] + (tipCol[0] - rootCol[0]) * t1, rootCol[1] + (tipCol[1] - rootCol[1]) * t1, rootCol[2] + (tipCol[2] - rootCol[2]) * t1];
      const cs = s === segs - 1 ? [c0, c0, c1] : [c0, c0, c1, c0, c1, c1];
      cs.forEach((c) => col.push(...c));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  return g;
}

// Cattail: a tall blade cluster with brown seed heads.
export function cattail(seed, { h = 1.5 } = {}) {
  const blades = grassTuft(seed, { blades: 6, h, w: 0.035, spread: 0.12, rootCol: [0.1, 0.12, 0.06], tipCol: [0.55, 0.55, 0.3], reed: true });
  const rng = mulberry32(seed + 3);
  const heads = [];
  for (let i = 0; i < 2; i++) {
    const hh = h * (0.8 + rng() * 0.25); const a = rng() * 6.28; const d = 0.05 + rng() * 0.07;
    const cyl = new THREE.CylinderGeometry(0.028, 0.028, 0.2, 6).translate(0, hh, 0);
    xf(cyl, { p: [Math.cos(a) * d, 0, Math.sin(a) * d] });
    heads.push(finishGeo(cyl, { color: [0.22, 0.12, 0.06], uv: 1 }));
    const st = new THREE.CylinderGeometry(0.008, 0.008, hh, 4).translate(0, hh / 2, 0); xf(st, { p: [Math.cos(a) * d, 0, Math.sin(a) * d] });
    heads.push(finishGeo(st, { color: [0.15, 0.17, 0.08], uv: 1 }));
  }
  return mergeGeometries([finishGeo(blades, { uv: 0 }), ...heads], false);
}

// ---------------------------------------------------------------------------------------------------
// Rocks: displaced icospheres, flattened, with baked AO (dark underside, lit crown). Flat-faceted.
// ---------------------------------------------------------------------------------------------------
export function rock(seed, { detail = 1, amp = 0.38, freq = 1.3, flat = 0.7, ridged = false, strata = 0 } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g = displace(g, { amp, freq, seed, oct: 3, ridged });
  g.scale(1, flat, 1);
  if (strata) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.round(p.getY(i) * strata * 4) / (strata * 4) * 0.5 + p.getY(i) * 0.5); }
  g.computeVertexNormals();
  g.translate(0, 0.0, 0);
  paint(g, (x, y, z, c) => { const k = 0.35 + 0.65 * Math.max(0, Math.min(1, (y + 0.5 * flat) / (1.0 * flat))); c.setRGB(k, k * 0.98, k * 0.96); });
  return finishGeo(g, { uv: 0.6 });
}

// A tall monolith / crag slab: segmented box pushed around by ridged noise.
export function slab(seed, { w = 1.2, h = 3.5, d = 0.7, amp = 0.16 } = {}) {
  let g = new THREE.BoxGeometry(w, h, d, 5, 12, 4);
  g = displace(g, { amp, freq: 1.4, seed, oct: 3 });
  // taper + lean toward the top
  const p = g.attributes.position; const rng = mulberry32(seed);
  const lean = (rng() - 0.5) * 0.3;
  for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + h / 2) / h; p.setX(i, p.getX(i) * (1 - k * 0.25) + lean * k * k); p.setZ(i, p.getZ(i) * (1 - k * 0.2)); }
  g.computeVertexNormals();
  g.translate(0, h / 2 - 0.15, 0);
  paint(g, (x, y, z, c) => { const k = 0.3 + 0.7 * Math.min(1, Math.max(0, y / h) * 1.4); c.setRGB(k, k, k); });
  return finishGeo(g, { uv: 0.5 });
}

export const randomRotY = (rng) => rng() * Math.PI * 2;
export { rr };
