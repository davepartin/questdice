// Private toolkit for the "big" monsters (Hill Ogre, Goblin King).
//
//  * Field / meshField : signed-distance-field sculpting. Overlapping ellipsoids, round-cones and boxes are
//    smooth-unioned into ONE organic skin (muscle, fat, brow, jaw), then meshed with naive surface nets,
//    snapped to the true surface, with SDF-gradient normals, baked ambient occlusion and per-vertex pigment.
//    Every shape is authored in MODEL space (absolute metres) and is converted to joint space on merge.
//  * Merge             : batches thousands of little details (studs, teeth, stitches, hair, rivets) into one
//    mesh per (joint, material), so the actor stays within the draw-call budget.
//  * Puffs             : a single instanced billboard mesh for steam / smoke / flame sprites.
//  * aimJoint/solveArm : tiny runtime IK so two hands can both grip a club, whatever the clip is doing.
import * as THREE from 'three';
import { makeNoise, mulberry32 } from '../noise.js';
import { sprite } from '../tex.js';

const sqrt = Math.sqrt; const abs = Math.abs; const mn = Math.min; const mx = Math.max;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smin = (a, b, k) => { const h = mx(k - abs(a - b), 0) / k; return mn(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => { const h = mx(k - abs(a - b), 0) / k; return mx(a, b) + h * h * k * 0.25; };
export { smin, smax };

// rotation (Euler XYZ) -> row-major 3x3 that maps WORLD offsets into the primitive's LOCAL frame
function invRot(rot) {
  if (!rot) return null;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ')).invert();
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q).elements; // column-major
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

// ------------------------------------------------------------------------------------------------
// Distance field made of smooth-blended primitives
// ------------------------------------------------------------------------------------------------
export class Field {
  constructor({ seed = 1, lump = 0, lumpFreq = 5, mottle = 0 } = {}) {
    this.add = []; this.sub = []; this.stains = []; this.N = makeNoise(seed);
    this.lump = lump; this.lumpFreq = lumpFreq; this.mottle = mottle;
    this.bmin = [1e9, 1e9, 1e9]; this.bmax = [-1e9, -1e9, -1e9];
  }
  _push(p, o) {
    p.k = o.k ?? 0.08; p.tint = o.tint != null ? new THREE.Color(o.tint) : null; p.tw = o.tw ?? 1;
    (o.sub ? this.sub : this.add).push(p);
    if (!o.sub) {
      const pad = p.R + (p.k || 0);
      for (let i = 0; i < 3; i++) { this.bmin[i] = mn(this.bmin[i], p.c[i] - pad); this.bmax[i] = mx(this.bmax[i], p.c[i] + pad); }
    }
    return this;
  }
  sph(c, r, o = {}) {
    const [cx, cy, cz] = c;
    return this._push({ c, R: r, d: (x, y, z) => sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r }, o);
  }
  ell(c, r, o = {}) {
    const [cx, cy, cz] = c; const [rx, ry, rz] = r; const R = invRot(o.rot); const mnr = mn(rx, ry, rz);
    return this._push({
      c, R: mx(rx, ry, rz),
      d: (x, y, z) => {
        let px = x - cx; let py = y - cy; let pz = z - cz;
        if (R) { const a = R[0] * px + R[1] * py + R[2] * pz; const b = R[3] * px + R[4] * py + R[5] * pz; const cc = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = cc; }
        const k0 = sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2);
        const k1 = sqrt((px / (rx * rx)) ** 2 + (py / (ry * ry)) ** 2 + (pz / (rz * rz)) ** 2);
        if (k1 < 1e-9) return -mnr;
        return (k0 * (k0 - 1)) / k1;
      },
    }, o);
  }
  // round cone / capsule between a and b with radii r1 (at a) and r2 (at b)
  cap(a, b, r1, r2 = r1, o = {}) {
    const bax = b[0] - a[0]; const bay = b[1] - a[1]; const baz = b[2] - a[2];
    const l2 = bax * bax + bay * bay + baz * baz; const rr = r1 - r2; const a2 = l2 - rr * rr; const il2 = 1 / l2;
    return this._push({
      c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], R: sqrt(l2) / 2 + mx(r1, r2),
      d: (x, y, z) => {
        const pax = x - a[0]; const pay = y - a[1]; const paz = z - a[2];
        const y0 = pax * bax + pay * bay + paz * baz; const z0 = y0 - l2;
        const qx = pax * l2 - bax * y0; const qy = pay * l2 - bay * y0; const qz = paz * l2 - baz * y0;
        const x2 = qx * qx + qy * qy + qz * qz; const y2 = y0 * y0 * l2; const z2 = z0 * z0 * l2;
        const k = (rr < 0 ? -1 : 1) * rr * rr * x2;
        if ((z0 < 0 ? -1 : 1) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
        if ((y0 < 0 ? -1 : 1) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
        return (sqrt(x2 * a2 * il2) + y0 * rr) * il2 - r1;
      },
    }, o);
  }
  box(c, h, o = {}) { // half extents h, corner rounding o.round
    const [cx, cy, cz] = c; const rd = o.round ?? 0.03; const R = invRot(o.rot);
    return this._push({
      c, R: sqrt(h[0] ** 2 + h[1] ** 2 + h[2] ** 2),
      d: (x, y, z) => {
        let px = x - cx; let py = y - cy; let pz = z - cz;
        if (R) { const a = R[0] * px + R[1] * py + R[2] * pz; const b = R[3] * px + R[4] * py + R[5] * pz; const cc = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = cc; }
        const qx = abs(px) - h[0] + rd; const qy = abs(py) - h[1] + rd; const qz = abs(pz) - h[2] + rd;
        return sqrt(mx(qx, 0) ** 2 + mx(qy, 0) ** 2 + mx(qz, 0) ** 2) + mn(mx(qx, qy, qz), 0) - rd;
      },
    }, o);
  }
  torus(c, Rr, r, o = {}) { // ring in local XZ plane (axis Y); rotate with o.rot
    const [cx, cy, cz] = c; const R = invRot(o.rot);
    return this._push({
      c, R: Rr + r,
      d: (x, y, z) => {
        let px = x - cx; let py = y - cy; let pz = z - cz;
        if (R) { const a = R[0] * px + R[1] * py + R[2] * pz; const b = R[3] * px + R[4] * py + R[5] * pz; const cc = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = cc; }
        const q = sqrt(px * px + pz * pz) - Rr; return sqrt(q * q + py * py) - r;
      },
    }, o);
  }
  // pigment decal on the skin (does not change shape). a = strength 0..1
  stain(c, r, color, a = 0.8) { this.stains.push({ c, r, col: new THREE.Color(color), a }); return this; }
  dist(x, y, z) {
    let d = 1e9;
    const A = this.add;
    for (let i = 0; i < A.length; i++) {
      const p = A[i]; const c = p.c;
      const lb = sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) - p.R;
      if (lb > d + p.k) continue;
      const di = p.d(x, y, z);
      d = p.k > 0 ? smin(d, di, p.k) : mn(d, di);
    }
    const S = this.sub;
    for (let i = 0; i < S.length; i++) {
      const p = S[i]; const c = p.c;
      const lb = sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) - p.R;
      if (lb > p.k - d) continue;
      d = smax(d, -p.d(x, y, z), p.k || 0.001);
    }
    if (this.lump) d += this.lump * (this.N.n3(x * this.lumpFreq, y * this.lumpFreq, z * this.lumpFreq) + 0.5 * this.N.n3(x * this.lumpFreq * 2.3 + 9, y * this.lumpFreq * 2.3, z * this.lumpFreq * 2.3));
    return d;
  }
  grad(x, y, z, e = 0.01, out = new THREE.Vector3()) {
    return out.set(this.dist(x + e, y, z) - this.dist(x - e, y, z), this.dist(x, y + e, z) - this.dist(x, y - e, z), this.dist(x, y, z + e) - this.dist(x, y, z - e)).normalize();
  }
  // snap a point to the surface; returns { p, n }
  project(p, iters = 5, e = 0.01) {
    const q = new THREE.Vector3(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z); const g = new THREE.Vector3();
    for (let i = 0; i < iters; i++) { const d = this.dist(q.x, q.y, q.z); this.grad(q.x, q.y, q.z, e, g); q.addScaledVector(g, -d); }
    this.grad(q.x, q.y, q.z, e, g);
    return { p: q, n: g.clone() };
  }
  // cast a ray (origin o, direction dir) and return { p, n } at the first surface hit (sphere tracing)
  hit(o, dir, maxT = 4) {
    const d3 = new THREE.Vector3(...dir).normalize(); const q = new THREE.Vector3(...o); let t = 0;
    for (let i = 0; i < 90 && t < maxT; i++) { const d = this.dist(q.x, q.y, q.z); if (d < 0.002) { const r = this.project(q, 2); return r; } t += mx(d * 0.8, 0.004); q.set(o[0] + d3.x * t, o[1] + d3.y * t, o[2] + d3.z * t); }
    return null;
  }
  // first sign change of the field along a ray (works from inside or outside); returns { p, n } or null
  shoot(o, dir, maxT = 3, step = 0.02) {
    const d3 = new THREE.Vector3(...dir).normalize(); let t0 = 0; let d0 = this.dist(o[0], o[1], o[2]);
    for (let t = step; t <= maxT; t += step) {
      const d1 = this.dist(o[0] + d3.x * t, o[1] + d3.y * t, o[2] + d3.z * t);
      if ((d0 < 0) !== (d1 < 0)) {
        let lo = t0; let hi = t;
        for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; const dm = this.dist(o[0] + d3.x * m, o[1] + d3.y * m, o[2] + d3.z * m); if ((dm < 0) === (d0 < 0)) lo = m; else hi = m; }
        const tt = (lo + hi) / 2; const p = new THREE.Vector3(o[0] + d3.x * tt, o[1] + d3.y * tt, o[2] + d3.z * tt);
        return { p, n: this.grad(p.x, p.y, p.z, 0.01) };
      }
      t0 = t; d0 = d1;
    }
    return null;
  }
  // random points on the surface inside a box, filtered by test(p, n)
  scatter(count, box, test, rnd, tol = 0.012) {
    const out = []; let tries = 0;
    while (out.length < count && tries++ < count * 60) {
      const q = [box[0][0] + rnd() * (box[1][0] - box[0][0]), box[0][1] + rnd() * (box[1][1] - box[0][1]), box[0][2] + rnd() * (box[1][2] - box[0][2])];
      const r = this.project(q, 6); if (Math.abs(this.dist(r.p.x, r.p.y, r.p.z)) > tol) continue;
      if (r.p.x < box[0][0] || r.p.x > box[1][0] || r.p.y < box[0][1] || r.p.y > box[1][1] || r.p.z < box[0][2] || r.p.z > box[1][2]) continue;
      if (test && !test(r.p, r.n)) continue; out.push(r);
    }
    return out;
  }
  colorAt(x, y, z, out) {
    out.setRGB(1, 1, 1);
    for (const p of this.add) {
      if (!p.tint) continue;
      const c = p.c; if (sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) - p.R > 0.1) continue;
      const w = smoothstep(0.07, -0.07, p.d(x, y, z)) * p.tw; if (w > 0) out.lerp(p.tint, w);
    }
    for (const s of this.stains) {
      const dd = sqrt((x - s.c[0]) ** 2 + (y - s.c[1]) ** 2 + (z - s.c[2]) ** 2);
      if (dd < s.r) out.lerp(s.col, s.a * (1 - dd / s.r) ** 1.3);
    }
    if (this.mottle) { const m = 1 - this.mottle * (0.5 + 0.5 * this.N.n3(x * 2.1 + 3, y * 2.1, z * 2.1)); out.multiplyScalar(m); }
    return out;
  }
}

// Shell of another field (armour plates, helmets): thickness `t` at offset `off` from the source surface,
// clipped by a region function (negative inside the region). Edges are bevelled by smooth intersection.
export function shellField(src, { off = 0.02, t = 0.012, region, bevel = 0.012, bounds, colorAt }) {
  const f = {
    dist: (x, y, z) => { const d = src.dist(x, y, z); const sh = abs(d - off) - t; return region ? smax(sh, region(x, y, z), bevel) : sh; },
    colorAt: colorAt || ((x, y, z, out) => out.setRGB(1, 1, 1)), bmin: bounds[0], bmax: bounds[1],
    grad: Field.prototype.grad, project: Field.prototype.project, shoot: Field.prototype.shoot, scatter: Field.prototype.scatter,
  };
  return f;
}

// Smooth union of several fields (so shells/armour can hug a whole body made of separate meshes)
export function unionField(fields, k = 0.15) {
  const f = {
    dist: (x, y, z) => { let d = fields[0].dist(x, y, z); for (let i = 1; i < fields.length; i++) d = smin(d, fields[i].dist(x, y, z), k); return d; },
    colorAt: (x, y, z, out) => out.setRGB(1, 1, 1),
    bmin: [0, 1, 2].map((i) => Math.min(...fields.map((q) => q.bmin[i]))), bmax: [0, 1, 2].map((i) => Math.max(...fields.map((q) => q.bmax[i]))),
    grad: Field.prototype.grad, project: Field.prototype.project, shoot: Field.prototype.shoot, scatter: Field.prototype.scatter,
  };
  return f;
}

// ------------------------------------------------------------------------------------------------
// Naive surface nets -> BufferGeometry (non-indexed, triplanar UVs, vertex colour = AO * pigment)
// ------------------------------------------------------------------------------------------------
const CORN = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const EDGE = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
export function meshField(F, { min, max, h = 0.03, ao = 0.85, uvScale = 1, shade, aoSamples = [0.05, 0.12, 0.26], refine = 2 } = {}) {
  min = min || F.bmin; max = max || F.bmax;
  const nx = Math.ceil((max[0] - min[0]) / h) + 1; const ny = Math.ceil((max[1] - min[1]) / h) + 1; const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const vals = new Float32Array(nx * ny * nz);
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[at(i, j, k)] = F.dist(min[0] + i * h, min[1] + j * h, min[2] + k * h);
  const cx = nx - 1; const cy = ny - 1; const cz = nz - 1;
  const cellV = new Int32Array(cx * cy * cz).fill(-1);
  const P = []; const v8 = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const o = CORN[c]; const v = vals[at(i + o[0], j + o[1], k + o[2])]; v8[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0; let sy = 0; let sz = 0; let n = 0;
    for (let e = 0; e < 12; e++) {
      const a = EDGE[e][0]; const b = EDGE[e][1]; const va = v8[a]; const vb = v8[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb); const oa = CORN[a]; const ob = CORN[b];
      sx += oa[0] + (ob[0] - oa[0]) * t; sy += oa[1] + (ob[1] - oa[1]) * t; sz += oa[2] + (ob[2] - oa[2]) * t; n++;
    }
    cellV[i + cx * (j + cy * k)] = P.length / 3;
    P.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
  }
  const cv = (i, j, k) => cellV[i + cx * (j + cy * k)];
  const I = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) { I.push(a, d, c, a, c, b); } else { I.push(a, b, c, a, c, d); } };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = vals[at(i, j, k)]; const in0 = v0 < 0;
    if (i < nx - 1 && j >= 1 && k >= 1 && j < ny - 1 && k < nz - 1 && (vals[at(i + 1, j, k)] < 0) !== in0) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !in0);
    if (j < ny - 1 && i >= 1 && k >= 1 && i < nx - 1 && k < nz - 1 && (vals[at(i, j + 1, k)] < 0) !== in0) quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !in0);
    if (k < nz - 1 && i >= 1 && j >= 1 && i < nx - 1 && j < ny - 1 && (vals[at(i, j, k + 1)] < 0) !== in0) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !in0);
  }
  // refine onto the true surface + gradient normals
  const nv = P.length / 3; const N = new Float32Array(nv * 3); const g = new THREE.Vector3(); const e = h * 0.45;
  for (let v = 0; v < nv; v++) {
    let x = P[v * 3]; let y = P[v * 3 + 1]; let z = P[v * 3 + 2];
    for (let it = 0; it < refine; it++) {
      const d = F.dist(x, y, z); F.grad(x, y, z, e, g);
      const s = mx(-h * 0.7, mn(h * 0.7, d)); x -= g.x * s; y -= g.y * s; z -= g.z * s;
    }
    F.grad(x, y, z, e, g);
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; N[v * 3] = g.x; N[v * 3 + 1] = g.y; N[v * 3 + 2] = g.z;
  }
  // per-vertex colour (pigment * AO)
  const C = new Float32Array(nv * 3); const col = new THREE.Color();
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3]; const y = P[v * 3 + 1]; const z = P[v * 3 + 2];
    (F.colorAt ? F.colorAt(x, y, z, col) : col.setRGB(1, 1, 1));
    if (ao > 0) {
      let occ = 0; let wsum = 0;
      for (let s = 0; s < aoSamples.length; s++) {
        const r = aoSamples[s]; const dd = F.dist(x + N[v * 3] * r, y + N[v * 3 + 1] * r, z + N[v * 3 + 2] * r); const w = 1 / (1 + s);
        occ += clamp01((r - dd) / r) * w; wsum += w;
      }
      col.multiplyScalar(1 - ao * (occ / wsum) * 1.25);
    }
    if (shade) shade(x, y, z, col);
    C[v * 3] = col.r; C[v * 3 + 1] = col.g; C[v * 3 + 2] = col.b;
  }
  // expand to non-indexed with per-triangle triplanar UVs
  const nt = I.length / 3; const pos = new Float32Array(nt * 9); const nor = new Float32Array(nt * 9); const uv = new Float32Array(nt * 6); const cc = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    const ia = I[t * 3]; const ib = I[t * 3 + 1]; const ic = I[t * 3 + 2];
    const fnx = N[ia * 3] + N[ib * 3] + N[ic * 3]; const fny = N[ia * 3 + 1] + N[ib * 3 + 1] + N[ic * 3 + 1]; const fnz = N[ia * 3 + 2] + N[ib * 3 + 2] + N[ic * 3 + 2];
    const ax = abs(fnx); const ay = abs(fny); const az = abs(fnz);
    const ids = [ia, ib, ic];
    for (let q = 0; q < 3; q++) {
      const v = ids[q]; const o = t * 9 + q * 3;
      const x = P[v * 3]; const y = P[v * 3 + 1]; const z = P[v * 3 + 2];
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; nor[o] = N[v * 3]; nor[o + 1] = N[v * 3 + 1]; nor[o + 2] = N[v * 3 + 2];
      cc[o] = C[v * 3]; cc[o + 1] = C[v * 3 + 1]; cc[o + 2] = C[v * 3 + 2];
      const u = t * 6 + q * 2;
      if (ax >= ay && ax >= az) { uv[u] = z * uvScale; uv[u + 1] = y * uvScale; } else if (ay >= az) { uv[u] = x * uvScale; uv[u + 1] = z * uvScale; } else { uv[u] = x * uvScale; uv[u + 1] = y * uvScale; }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  return geo;
}

// ------------------------------------------------------------------------------------------------
// Merge: collect geometry per (joint, material). All inputs are in MODEL space.
// ------------------------------------------------------------------------------------------------
class Buf { constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; } }
const _m = new THREE.Matrix4(); const _nm = new THREE.Matrix3(); const _v = new THREE.Vector3();
export class Merge {
  constructor(a) { this.a = a; this.map = new Map(); a.root.updateMatrixWorld(true); this.inv = new Map(); this.tris = 0; }
  _inv(j) { let i = this.inv.get(j); if (!i) { j.updateWorldMatrix(true, false); i = j.matrixWorld.clone().invert(); this.inv.set(j, i); } return i; }
  _buf(j, m) { const k = `${j.uuid}|${m.uuid}`; let b = this.map.get(k); if (!b) { b = { j, m, buf: new Buf() }; this.map.set(k, b); } return b.buf; }
  // push any BufferGeometry (indexed or not). matrix: model-space transform of the geometry. color: optional multiplier.
  push(joint, material, geo, matrix, color) {
    const b = this._buf(joint, material);
    _m.copy(this._inv(joint)); if (matrix) _m.multiply(matrix);
    _nm.getNormalMatrix(_m);
    const pa = geo.attributes.position; const na = geo.attributes.normal; const ua = geo.attributes.uv; const ca = geo.attributes.color; const ix = geo.index;
    const cnt = ix ? ix.count : pa.count; const cr = color != null ? new THREE.Color(color) : null;
    for (let q = 0; q < cnt; q++) {
      const v = ix ? ix.getX(q) : q;
      _v.fromBufferAttribute(pa, v).applyMatrix4(_m); b.p.push(_v.x, _v.y, _v.z);
      if (na) { _v.fromBufferAttribute(na, v).applyMatrix3(_nm).normalize(); b.n.push(_v.x, _v.y, _v.z); } else b.n.push(0, 1, 0);
      if (ua) b.uv.push(ua.getX(v), ua.getY(v)); else b.uv.push(0, 0);
      let r = 1; let g = 1; let bl = 1;
      if (ca) { r = ca.getX(v); g = ca.getY(v); bl = ca.getZ(v); }
      if (cr) { r *= cr.r; g *= cr.g; bl *= cr.b; }
      b.c.push(r, g, bl);
    }
    this.tris += cnt / 3;
  }
  // thin tapered curved strand (hair, stitch thread, bristle): from p along dir, bending toward `bend`
  strand(joint, material, p, dir, len, r, { bend = null, rings = 3, radial = 3, color = null, r1 = 0.08, uv = 0 } = {}) {
    const b = this._buf(joint, material); const iv = this._inv(joint);
    const d = new THREE.Vector3(...dir).normalize(); const bd = bend ? new THREE.Vector3(...bend) : new THREE.Vector3();
    const pts = []; const tans = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      pts.push(new THREE.Vector3(p[0] + d.x * len * t + bd.x * len * t * t, p[1] + d.y * len * t + bd.y * len * t * t, p[2] + d.z * len * t + bd.z * len * t * t));
      tans.push(new THREE.Vector3(d.x + 2 * bd.x * t, d.y + 2 * bd.y * t, d.z + 2 * bd.z * t).normalize());
    }
    const ref = abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const ring = []; const nrm = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings; const rad = r * (1 - t * (1 - r1)); const T = tans[i];
      const N0 = new THREE.Vector3().crossVectors(T, ref).normalize(); const B0 = new THREE.Vector3().crossVectors(T, N0);
      const rr = []; const nn = [];
      for (let j = 0; j < radial; j++) {
        const a = (j / radial) * Math.PI * 2; const cn = Math.cos(a); const sn = Math.sin(a);
        const nv = new THREE.Vector3().addScaledVector(N0, cn).addScaledVector(B0, sn);
        rr.push(pts[i].clone().addScaledVector(nv, rad).applyMatrix4(iv)); nn.push(nv.clone().transformDirection(iv));
      }
      ring.push(rr); nrm.push(nn);
    }
    const cr = color != null ? new THREE.Color(color) : null;
    const put = (v, n) => { b.p.push(v.x, v.y, v.z); b.n.push(n.x, n.y, n.z); b.uv.push(uv, uv); b.c.push(cr ? cr.r : 1, cr ? cr.g : 1, cr ? cr.b : 1); };
    for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = ring[i][j]; const bb = ring[i][j2]; const c = ring[i + 1][j2]; const dd = ring[i + 1][j];
      put(a, nrm[i][j]); put(bb, nrm[i][j2]); put(c, nrm[i + 1][j2]); put(a, nrm[i][j]); put(c, nrm[i + 1][j2]); put(dd, nrm[i + 1][j]);
      this.tris += 2;
    }
  }
  build(castShadow = true) {
    const out = [];
    for (const { j, m, buf } of this.map.values()) {
      if (!buf.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(buf.c, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const me = new THREE.Mesh(g, m); me.castShadow = castShadow; me.receiveShadow = true; me.name = `${j.name}:${m.name || 'mat'}`;
      j.add(me); out.push(me);
    }
    this.map.clear();
    return out;
  }
}

// Matrix that places a unit-Y geometry at p, pointing along n, with scale s (number or [x,y,z]) and roll.
const _q = new THREE.Quaternion(); const _up = new THREE.Vector3(0, 1, 0);
export function place(p, n, s = 1, roll = 0) {
  const nn = new THREE.Vector3(n[0] ?? n.x, n[1] ?? n.y, n[2] ?? n.z).normalize();
  _q.setFromUnitVectors(_up, nn);
  if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(_up, roll));
  const sc = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
  return new THREE.Matrix4().compose(new THREE.Vector3(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z), _q.clone(), sc);
}
// Matrix that places a geometry at p, with local +Y along dir=(b-a) normalised, local origin at a.
export const between = (a, b, rad = 1, roll = 0) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length();
  return place(a, d, [rad, L, rad], roll);
};

// ------------------------------------------------------------------------------------------------
// Billboard FX: one instanced draw call for steam, smoke, sparks and flame
// ------------------------------------------------------------------------------------------------
export class Puffs {
  constructor(max = 64) {
    this.max = max; this.cur = 0;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    g.instanceCount = max;
    const mk = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aPos = mk(3); this.aData = mk(4); this.aCol = mk(4); this.aKind = mk(2);
    g.setAttribute('aPos', this.aPos); g.setAttribute('aData', this.aData); g.setAttribute('aCol', this.aCol); g.setAttribute('aKind', this.aKind);
    this.st = Array.from({ length: max }, () => ({ life: 0, age: 1, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uSmoke: { value: sprite('smoke') }, uGlow: { value: sprite('glow') } },
      vertexShader: `attribute vec3 aPos; attribute vec4 aData; attribute vec4 aCol; attribute vec2 aKind; varying vec2 vUv; varying vec4 vCol; varying vec2 vKind;
        void main(){ vUv = uv; vCol = aCol; vKind = aKind;
          vec4 mv = modelViewMatrix * vec4(aPos, 1.0); float c = cos(aData.w), s = sin(aData.w);
          vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
          mv.xy += q * aData.x; gl_Position = projectionMatrix * mv; if (aData.y >= aData.z) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
      fragmentShader: `uniform sampler2D uSmoke; uniform sampler2D uGlow; varying vec2 vUv; varying vec4 vCol; varying vec2 vKind;
        void main(){ float a = mix(texture2D(uSmoke, vUv).a, texture2D(uGlow, vUv).a, vKind.x) * vCol.a;
          gl_FragColor = vec4(vCol.rgb * a, a * (1.0 - vKind.y)); if (a < 0.002) discard; }`,
    });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 12; this.mesh.name = 'puffs';
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.userData.noActorClone = true; mat.userData.noActorClone = true;
    for (let i = 0; i < max; i++) this.aData.array[i * 4 + 1] = 1;
  }
  // o: pos, vel, life, size, sizeEnd, color, alpha, rise, drag, spin, kind: 0 smoke / 1 glow, add: 0..1 additive fraction
  emit(o) {
    const i = this.cur; this.cur = (this.cur + 1) % this.max; const s = this.st[i];
    s.p.set(...o.pos); s.v.set(...(o.vel || [0, 0, 0])); s.life = o.life ?? 1; s.age = 0; s.size0 = o.size ?? 0.2; s.size1 = o.sizeEnd ?? s.size0 * 2;
    s.col = new THREE.Color(o.color ?? 0xffffff); s.col1 = new THREE.Color(o.colorEnd ?? o.color ?? 0xffffff); s.alpha = o.alpha ?? 0.5; s.rise = o.rise ?? 0.3; s.drag = o.drag ?? 1.2;
    s.rot = o.rot ?? Math.random() * 6.28; s.spin = o.spin ?? (Math.random() - 0.5) * 0.8; s.kind = o.kind ?? 0; s.add = o.add ?? 0; s.turb = o.turb ?? 0.2; s.fadeIn = o.fadeIn ?? 0.15;
    return i;
  }
  update(dt) {
    const c = new THREE.Color();
    for (let i = 0; i < this.max; i++) {
      const s = this.st[i];
      if (s.age >= s.life) { this.aData.array[i * 4 + 1] = 1; this.aData.array[i * 4 + 2] = 0; continue; }
      s.age += dt; const k = clamp01(s.age / s.life);
      const dr = Math.exp(-s.drag * dt);
      s.v.multiplyScalar(dr); s.v.y += s.rise * dt; s.v.x += Math.sin(s.age * 3 + i) * s.turb * dt; s.v.z += Math.cos(s.age * 2.3 + i * 1.7) * s.turb * dt;
      s.p.addScaledVector(s.v, dt); s.rot += s.spin * dt;
      c.copy(s.col).lerp(s.col1, k);
      const fa = smoothstep(0, s.fadeIn, k) * (1 - k) ** 1.4;
      this.aPos.setXYZ(i, s.p.x, s.p.y, s.p.z);
      this.aData.setXYZW(i, s.size0 + (s.size1 - s.size0) * k, s.age, s.life, s.rot);
      this.aCol.setXYZW(i, c.r, c.g, c.b, s.alpha * fa);
      this.aKind.setXY(i, s.kind, s.add);
    }
    this.aPos.needsUpdate = this.aData.needsUpdate = this.aCol.needsUpdate = this.aKind.needsUpdate = true;
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// ------------------------------------------------------------------------------------------------
// Runtime IK
// ------------------------------------------------------------------------------------------------
const _pm = new THREE.Matrix4(); const _t = new THREE.Vector3(); const _qq = new THREE.Quaternion(); const _ax = new THREE.Vector3();
// Rotate `joint` (whose geometry points along local `axis`) so the axis aims at world point `target`.
export function aimJoint(joint, target, w = 1, axis = [0, -1, 0]) {
  joint.parent.updateWorldMatrix(true, false);
  _pm.copy(joint.parent.matrixWorld).invert();
  _t.copy(target).applyMatrix4(_pm).sub(joint.position).normalize();
  _qq.setFromUnitVectors(_ax.set(...axis).normalize(), _t);
  joint.quaternion.slerp(_qq, w);
  joint.updateMatrixWorld(true);
}
const _s = new THREE.Vector3(); const _u = new THREE.Vector3(); const _e = new THREE.Vector3(); const _pp = new THREE.Vector3();
// 2-bone arm/leg IK. shoulder & elbow joints (elbow is a child), L1/L2 bone lengths, world target, world pole hint.
export function solveArm(shoulder, elbow, L1, L2, target, pole, w = 1) {
  shoulder.updateWorldMatrix(true, false); shoulder.getWorldPosition(_s);
  _u.copy(target).sub(_s); let d = _u.length(); _u.normalize();
  d = mx(mn(d, (L1 + L2) * 0.998), Math.abs(L1 - L2) + 0.02);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d); const hh = sqrt(mx(L1 * L1 - a * a, 0));
  _pp.copy(pole).addScaledVector(_u, -pole.dot(_u)).normalize();
  _e.copy(_s).addScaledVector(_u, a).addScaledVector(_pp, hh);
  aimJoint(shoulder, _e, w); aimJoint(elbow, target, w);
}

// ------------------------------------------------------------------------------------------------
// Misc helpers
// ------------------------------------------------------------------------------------------------
// a.on('hit'|'shake'|..., fn): subscribe to clip events regardless of who started the clip.
export function withEvents(a) {
  const L = {};
  a.on = (ev, fn) => { (L[ev] ||= new Set()).add(fn); return () => L[ev].delete(fn); };
  const wrap = (o = {}) => ({ ...o, onEvent: (e) => { o.onEvent?.(e); L[e]?.forEach((f) => f(e, a)); } });
  const play = a.play.bind(a); const once = a.once.bind(a);
  a.play = (n, o) => play(n, wrap(o)); a.once = (n, o) => once(n, wrap(o));
  return a;
}
// find the cloned instance of a shared material after finalize()
export const own = (a, m) => a.mats.find((c) => c.userData.base === m);
export const rng = mulberry32;
export const lerpV = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const TAU = Math.PI * 2;
export const ease = { inOut: (t) => t * t * (3 - 2 * t), out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, outBack: (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2 };
