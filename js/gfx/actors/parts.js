// Shared character-building toolkit for the Act I monsters (goblin / wolf / cultist).
//
//  * SDF sculpting: signed-distance fields + a surface-nets mesher turn smooth-unions of ellipsoids and
//    round-cones into genuinely organic meshes (heads, hands, torsos, fur bodies) with baked AO and
//    painted vertex colours. This is what keeps the monsters from reading as "primitives stuck together".
//  * Kit: collects many small geometries per (joint, material) and merges them (few draw calls).
//  * Triplanar material hook: world-stable UVs for sculpted meshes (no UV unwrap exists), plus a per-vertex
//    "ember" emissive mask. Installed AFTER Actor.finalize() so it chains after the dissolve hook.
//  * leaf / spike / ribbon geometry builders, tuft scattering, 2-bone IK, cloth-sway and hang-springs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNoise, mulberry32 } from '../noise.js';
import { mat as libMat } from '../mats.js';
import { Spring } from '../rig.js';

export { THREE, mulberry32, makeNoise };
export const rad = (d) => (d * Math.PI) / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------------
// SDF primitives. Every primitive returns a closure (x, y, z) => signed distance (negative inside).
// ------------------------------------------------------------------------------------------------
const _q = [0, 0, 0];
function rotInv(rot) {
  if (!rot) return null;
  const e = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])).transpose().elements;
  return (x, y, z) => { _q[0] = e[0] * x + e[4] * y + e[8] * z; _q[1] = e[1] * x + e[5] * y + e[9] * z; _q[2] = e[2] * x + e[6] * y + e[10] * z; };
}
export const sdf = {
  sphere: (cx, cy, cz, r) => (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r,
  // ellipsoid (iq's bound approximation), optional XYZ-euler rotation
  ell(cx, cy, cz, rx, ry, rz, rot) {
    const R = rotInv(rot); const ix = 1 / rx; const iy = 1 / ry; const iz = 1 / rz;
    const ix2 = ix * ix; const iy2 = iy * iy; const iz2 = iz * iz; const rm = Math.min(rx, ry, rz);
    return (x, y, z) => {
      x -= cx; y -= cy; z -= cz;
      if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
      const k0 = Math.sqrt(x * x * ix * ix + y * y * iy * iy + z * z * iz * iz);
      const k1 = Math.sqrt(x * x * ix2 * ix2 + y * y * iy2 * iy2 + z * z * iz2 * iz2);
      return k1 < 1e-9 ? -rm : (k0 * (k0 - 1)) / k1;
    };
  },
  // round cone between a and b with radii r1 (at a) and r2 (at b): limbs, fingers, claws, muzzles
  cap(a, b, r1, r2 = r1) {
    const bax = b[0] - a[0]; const bay = b[1] - a[1]; const baz = b[2] - a[2];
    const l2 = bax * bax + bay * bay + baz * baz; const rr = r1 - r2; const a2 = l2 - rr * rr; const il2 = 1 / l2;
    const sg = Math.sign(rr) || 1;
    return (x, y, z) => {
      const pax = x - a[0]; const pay = y - a[1]; const paz = z - a[2];
      const yy = pax * bax + pay * bay + paz * baz; const zz = yy - l2;
      const ux = pax * l2 - bax * yy; const uy = pay * l2 - bay * yy; const uz = paz * l2 - baz * yy;
      const x2 = ux * ux + uy * uy + uz * uz; const y2 = yy * yy * l2; const z2 = zz * zz * l2;
      const k = sg * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    };
  },
  box(cx, cy, cz, hx, hy, hz, round = 0, rot) {
    const R = rotInv(rot);
    return (x, y, z) => {
      x -= cx; y -= cy; z -= cz;
      if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
      const qx = Math.abs(x) - hx + round; const qy = Math.abs(y) - hy + round; const qz = Math.abs(z) - hz + round;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round;
    };
  },
  // torus around the (rotated) Y axis
  torus(cx, cy, cz, R0, r, rot) {
    const R = rotInv(rot);
    return (x, y, z) => {
      x -= cx; y -= cy; z -= cz;
      if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
      return Math.hypot(Math.hypot(x, z) - R0, y) - r;
    };
  },
  // elliptical ring (belts, collars): semi-axes ax, az in the XZ plane, tube radius r
  eltorus(cx, cy, cz, ax, az, r, rot) {
    const R = rotInv(rot); const m = (ax + az) / 2;
    return (x, y, z) => {
      x -= cx; y -= cy; z -= cz;
      if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
      const q = (Math.hypot(x / ax, z / az) - 1) * m;
      return Math.hypot(q, y) - r;
    };
  },
  // capped cylinder along (rotated) Y
  cyl(cx, cy, cz, r, h, round = 0, rot) {
    const R = rotInv(rot);
    return (x, y, z) => {
      x -= cx; y -= cy; z -= cz;
      if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
      const dx = Math.hypot(x, z) - r + round; const dy = Math.abs(y) - h + round;
      return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - round;
    };
  },
};
export const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
// smooth union of any number of fields
export const U = (k, ...fs) => (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k); return d; };
// a minus b (smooth)
export const SUB = (a, b, k = 0.01) => (x, y, z) => smax(a(x, y, z), -b(x, y, z), k);
export const INT = (a, b, k = 0.01) => (x, y, z) => smax(a(x, y, z), b(x, y, z), k);
export const mirX = (f) => (x, y, z) => f(Math.abs(x), y, z);
export const OFF = (f, o) => (x, y, z) => f(x, y, z) - o;                 // grow (o>0) / shrink
export const SHELL = (f, t) => (x, y, z) => Math.abs(f(x, y, z)) - t;      // hollow skin of thickness t
// translate / rotate / scale a field
export function XF(f, { p = [0, 0, 0], r, s = 1 } = {}) {
  const R = rotInv(r); const sc = s;
  return (x, y, z) => {
    x -= p[0]; y -= p[1]; z -= p[2];
    if (R) { R(x, y, z); x = _q[0]; y = _q[1]; z = _q[2]; }
    return f(x / sc, y / sc, z / sc) * sc;
  };
}
// Add noise bumps to a field (skin lumps, wood grain, rock). amp in metres.
export function BUMP(f, { amp = 0.004, freq = 40, seed = 1, oct = 2 } = {}) {
  const N = makeNoise(seed);
  return (x, y, z) => {
    const d = f(x, y, z);
    if (d > amp * 3) return d;
    let n = N.n3(x * freq, y * freq, z * freq);
    if (oct > 1) n += 0.5 * N.n3(x * freq * 2.1 + 5, y * freq * 2.1, z * freq * 2.1);
    return d + n * amp;
  };
}

// ------------------------------------------------------------------------------------------------
// Surface nets: field -> BufferGeometry with smooth gradient normals, baked AO and painted colours.
// ------------------------------------------------------------------------------------------------
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const CORN = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
export function sculpt(f, { min, max, h = 0.01, color, ember, aoK = 0.9, aoField, aoR = 1, flipUp = false } = {}) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1; const ny = Math.ceil((max[1] - min[1]) / h) + 1; const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const vals = new Float32Array(nx * ny * nz);
  let ii = 0;
  for (let k = 0; k < nz; k++) { const z = min[2] + k * h; for (let j = 0; j < ny; j++) { const y = min[1] + j * h; for (let i = 0; i < nx; i++) vals[ii++] = f(min[0] + i * h, y, z); } }
  const cx = nx - 1; const cy = ny - 1; const cz = nz - 1;
  const cell = new Int32Array(cx * cy * cz).fill(-1);
  const P = []; const v8 = new Float32Array(8);
  const gi = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const o = CORN[c]; const v = vals[gi(i + o[0], j + o[1], k + o[2])]; v8[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0; let sy = 0; let sz = 0; let n = 0;
    for (const [a, b] of EDGES) {
      const va = v8[a]; const vb = v8[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb); const oa = CORN[a]; const ob = CORN[b];
      sx += oa[0] + (ob[0] - oa[0]) * t; sy += oa[1] + (ob[1] - oa[1]) * t; sz += oa[2] + (ob[2] - oa[2]) * t; n++;
    }
    cell[i + cx * (j + cy * k)] = P.length / 3;
    P.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
  }
  const idx = [];
  const ci = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : cell[i + cx * (j + cy * k)]);
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = vals[gi(i, j, k)]; const in0 = v0 < 0;
    if (i + 1 < nx && (vals[gi(i + 1, j, k)] < 0) !== in0) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k), !in0);
    if (j + 1 < ny && (vals[gi(i, j + 1, k)] < 0) !== in0) quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1), !in0);
    if (k + 1 < nz && (vals[gi(i, j, k + 1)] < 0) !== in0) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k), !in0);
  }
  const nv = P.length / 3;
  const pos = new Float32Array(P); const nor = new Float32Array(nv * 3); const col = new Float32Array(nv * 3).fill(1);
  const emb = new Float32Array(nv);
  const e = h * 0.55; const c = new THREE.Color(); const af = aoField || f;
  const grad = (fn, x, y, z, out) => { out[0] = fn(x + e, y, z) - fn(x - e, y, z); out[1] = fn(x, y + e, z) - fn(x, y - e, z); out[2] = fn(x, y, z + e) - fn(x, y, z - e); const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l; };
  const g = [0, 0, 0];
  for (let v = 0; v < nv; v++) {
    let x = pos[v * 3]; let y = pos[v * 3 + 1]; let z = pos[v * 3 + 2];
    grad(f, x, y, z, g); const d = f(x, y, z); const mv = clamp(d, -h, h);
    x -= g[0] * mv; y -= g[1] * mv; z -= g[2] * mv;
    grad(f, x, y, z, g);
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; nor[v * 3] = g[0]; nor[v * 3 + 1] = g[1]; nor[v * 3 + 2] = g[2];
    // ambient occlusion by probing the field along the normal
    let ao = 1;
    if (aoK > 0) {
      let occ = 0; const rs = [0.35, 0.8, 1.6];
      for (let s = 0; s < 3; s++) { const dd = 0.012 * aoR * rs[s] * 1.0; const q = af(x + g[0] * dd, y + g[1] * dd, z + g[2] * dd); occ += clamp((dd - q) / dd) * [0.5, 0.3, 0.2][s]; }
      ao = 1 - occ;
    }
    c.setRGB(1, 1, 1);
    if (color) color(x, y, z, g[0], g[1], g[2], ao, c);
    const m = 1 - aoK * (1 - ao);
    col[v * 3] = c.r * m; col[v * 3 + 1] = c.g * m; col[v * 3 + 2] = c.b * m;
    if (ember) emb[v] = ember(x, y, z, g[0], g[1], g[2], ao) || 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aEmber', new THREE.BufferAttribute(emb, 1));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
  geo.setIndex(idx);
  // verify winding against the gradient normals; flip if the mesher came out inside-out
  if (idx.length) {
    let agree = 0; const A = new THREE.Vector3(); const B = new THREE.Vector3(); const C = new THREE.Vector3();
    for (let t = 0; t < Math.min(idx.length, 600); t += 3) {
      A.fromArray(pos, idx[t] * 3); B.fromArray(pos, idx[t + 1] * 3); C.fromArray(pos, idx[t + 2] * 3);
      B.sub(A); C.sub(A); B.cross(C);
      agree += Math.sign(B.x * nor[idx[t] * 3] + B.y * nor[idx[t] * 3 + 1] + B.z * nor[idx[t] * 3 + 2]);
    }
    if (agree < 0) { const ix = geo.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } }
  }
  return geo;
}

// ------------------------------------------------------------------------------------------------
// Geometry normalisation + Kit (merge per joint & material)
// ------------------------------------------------------------------------------------------------
function norm(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  else if (g.attributes.color.itemSize === 4) { const a = g.attributes.color; const c3 = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c3[i * 3] = a.getX(i); c3[i * 3 + 1] = a.getY(i); c3[i * 3 + 2] = a.getZ(i); } g.setAttribute('color', new THREE.BufferAttribute(c3, 3)); }
  if (!g.attributes.aEmber) g.setAttribute('aEmber', new THREE.BufferAttribute(new Float32Array(n), 1));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aEmber'].includes(k)) g.deleteAttribute(k);
  return g;
}
export function flipWinding(g) {
  for (const a of Object.values(g.attributes)) {
    const s = a.itemSize; const arr = a.array;
    for (let t = 0; t < a.count; t += 3) for (let c = 0; c < s; c++) { const i1 = (t + 1) * s + c; const i2 = (t + 2) * s + c; const tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; }
    a.needsUpdate = true;
  }
  return g;
}
const _m = new THREE.Matrix4(); const _qq = new THREE.Quaternion(); const _e = new THREE.Euler(); const _vp = new THREE.Vector3(); const _vs = new THREE.Vector3();
export function xform(geo, { p, r, q, s, mirror = false, tint } = {}) {
  const g = norm(geo);
  _vp.set(...(p || [0, 0, 0]));
  if (q) _qq.copy(q); else _qq.setFromEuler(_e.set(...(r || [0, 0, 0])));
  if (typeof s === 'number') _vs.set(s, s, s); else _vs.set(...(s || [1, 1, 1]));
  if (mirror) _vs.x *= -1;
  _m.compose(_vp, _qq, _vs);
  g.applyMatrix4(_m);
  if (_m.determinant() < 0) flipWinding(g);
  if (tint) { const c = g.attributes.color; const t = new THREE.Color(tint); for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * t.r, c.getY(i) * t.g, c.getZ(i) * t.b); }
  return g;
}
// quaternion that takes +Y onto direction d
export const qFromDir = (d, up = [0, 1, 0]) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...up), new THREE.Vector3(...d).normalize());

export class Kit {
  constructor() { this.bins = new Map(); this.meshes = []; }
  // geo -> merged into (joint, material). o: { p, r, q, s, mirror, tint }
  add(joint, geo, material, o = {}) {
    const key = `${joint.uuid}|${material.uuid}`;
    let b = this.bins.get(key); if (!b) { b = { joint, material, list: [] }; this.bins.set(key, b); }
    const g = xform(geo, o);
    if (o.untex) g.attributes.aEmber.array.fill(-1);   // flagged: skip the albedo texture (teeth, claws, gems on a textured material)
    if (o.ember != null) g.attributes.aEmber.array.fill(o.ember);
    b.list.push(g);
    return this;
  }
  // geometry that must stay its own mesh (CPU-animated cloth etc.)
  mesh(joint, geo, material, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; joint.add(m); this.meshes.push(m); return m;
  }
  build({ cast = true } = {}) {
    for (const b of this.bins.values()) {
      if (!b.list.length) continue;
      const geo = b.list.length === 1 ? b.list[0] : mergeGeometries(b.list, false);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, b.material); m.castShadow = cast; m.receiveShadow = true; m.name = `${b.joint.name}:${b.material.name || 'mat'}`;
      b.joint.add(m); this.meshes.push(m);
    }
    this.bins.clear();
    return this.meshes;
  }
}

// ------------------------------------------------------------------------------------------------
// Materials: shared library entries, vertex-coloured and flagged for the triplanar hook.
// ------------------------------------------------------------------------------------------------
export function tpm(name, o = {}, { scale = 2.2, nrm = 1, ember = null, emberK = 1.5, side } = {}) {
  const m = libMat(name, { vertexColors: true, ...o }).clone();
  m.name = name;
  if (side !== undefined) m.side = side;
  m.userData.tp = { scale, nrm, ember: ember == null ? null : new THREE.Color(ember).multiplyScalar(emberK).toArray() };
  return m;
}
export function emis(color, ei = 2, { rough = 0.4, metal = 0, base = null, ...rest } = {}) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshStandardMaterial({ color: base == null ? c.clone().multiplyScalar(0.5) : base, emissive: c, emissiveIntensity: ei, roughness: rough, metalness: metal, vertexColors: true, ...rest });
  m.name = 'emis'; return m;
}
export function std(color, { rough = 0.6, metal = 0, ...rest } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, vertexColors: true, ...rest }); m.name = 'std'; return m;
}

const TP_VS_DECL = 'varying vec3 vTpP; varying vec3 vTpN; varying vec3 vTpX; varying vec3 vTpY; varying vec3 vTpZ; attribute float aEmber; varying float vEmber;';
const TP_VS_BODY = 'vTpP = position; vTpN = normal; vTpX = normalMatrix * vec3(1.,0.,0.); vTpY = normalMatrix * vec3(0.,1.,0.); vTpZ = normalMatrix * vec3(0.,0.,1.); vEmber = aEmber;';
const TP_FS_DECL = `varying vec3 vTpP; varying vec3 vTpN; varying vec3 vTpX; varying vec3 vTpY; varying vec3 vTpZ; varying float vEmber;
  uniform float uTpS; uniform float uTpN; uniform vec3 uTpEm;
  vec3 tpW(){ vec3 w = pow(abs(normalize(vTpN)) + 1e-3, vec3(5.0)); return w / (w.x + w.y + w.z); }
  vec4 tpTex(sampler2D t){ vec3 w = tpW(); return texture2D(t, vTpP.zy * uTpS) * w.x + texture2D(t, vTpP.xz * uTpS) * w.y + texture2D(t, vTpP.xy * uTpS) * w.z; }`;
function applyTriplanar(sh, tp) {
  sh.uniforms.uTpS = { value: tp.scale }; sh.uniforms.uTpN = { value: tp.nrm };
  sh.uniforms.uTpEm = { value: new THREE.Color().fromArray(tp.ember || [0, 0, 0]) };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${TP_VS_DECL}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${TP_VS_BODY}`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>\n${TP_FS_DECL}`)
    .replace('#include <map_fragment>', `#ifdef USE_MAP\n diffuseColor *= mix(tpTex(map), vec4(1.0), step(vEmber, -0.5));\n#endif`)
    .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n roughnessFactor *= tpTex(roughnessMap).g;\n#endif`)
    .replace('#include <metalnessmap_fragment>', `float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n metalnessFactor *= tpTex(metalnessMap).b;\n#endif`)
    .replace('#include <normal_fragment_maps>', `#ifdef USE_NORMALMAP_TANGENTSPACE
      { vec3 w = tpW();
        vec3 nX = texture2D(normalMap, vTpP.zy * uTpS).xyz * 2.0 - 1.0;
        vec3 nY = texture2D(normalMap, vTpP.xz * uTpS).xyz * 2.0 - 1.0;
        vec3 nZ = texture2D(normalMap, vTpP.xy * uTpS).xyz * 2.0 - 1.0;
        vec3 pO = vec3(0.0, nX.y, nX.x) * w.x + vec3(nY.x, 0.0, nY.y) * w.y + vec3(nZ.x, nZ.y, 0.0) * w.z;
        normal = normalize(normal + (vTpX * pO.x + vTpY * pO.y + vTpZ * pO.z) * normalScale.x * uTpN); }
    #endif`)
    .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP\n totalEmissiveRadiance *= tpTex(emissiveMap).rgb;\n#endif\n totalEmissiveRadiance += uTpEm * max(vEmber, 0.0);`);
}
// Call instead of a.finalize(): installs the triplanar hook on every cloned material that asked for it.
export function finish(a) {
  a.finalize();
  for (const m of a.mats) {
    const tp = m.userData.tp; if (!tp) continue;
    const prev = m.onBeforeCompile; const prevKey = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r); applyTriplanar(sh, tp); };
    m.customProgramCacheKey = () => `${prevKey ? prevKey.call(m) : ''}|qdtp`;
    m.needsUpdate = true;
  }
  return a;
}

// ------------------------------------------------------------------------------------------------
// Geometry builders
// ------------------------------------------------------------------------------------------------
// Tapered, optionally curved spike / claw / fang / thorn. Base at origin, tip at +Y (curving toward +Z).
export function spike(len, r0, { curve = 0, sides = 5, segs = 4, r1 = 0, flat = 1, col0, col1 } = {}) {
  const pos = []; const idx = []; const colr = []; const c0 = new THREE.Color(col0 ?? 0xffffff); const c1 = new THREE.Color(col1 ?? col0 ?? 0xffffff);
  for (let s = 0; s <= segs; s++) {
    const t = s / segs; const r = lerp(r0, r1, Math.pow(t, 0.85)) * (s === segs ? 0 : 1);
    const cy = len * t; const cz = curve * len * t * t;
    const col = c0.clone().lerp(c1, t);
    for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2; pos.push(Math.cos(a) * r * flat, cy, cz + Math.sin(a) * r); colr.push(col.r, col.g, col.b); }
  }
  for (let s = 0; s < segs; s++) for (let i = 0; i < sides; i++) {
    const a = s * sides + i; const b = s * sides + ((i + 1) % sides); const c = a + sides; const d = b + sides;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Leaf / ear / feather / torn cloth patch. Base at y=0, tip at y=len, width along X, thickness along Z.
//   halfW: number or (u)=>half width;  notch: [{u, d, w, side}] tears (side +1/-1/0 both);  bend: tip drift in Z; cup: concavity
export function leaf({ len = 0.2, halfW = 0.05, thick = 0.006, bend = 0, cup = 0, segU = 14, segV = 6, notch = [], jag = 0, seed = 1, twist = 0, sweep = 0, tipSharp = 1, col, edgeCol } = {}) {
  const N = makeNoise(seed); const pos = []; const idx = []; const colr = []; const cc = new THREE.Color(1, 1, 1); const ce = edgeCol ? new THREE.Color(edgeCol) : null; const cb = col ? new THREE.Color(col) : null;
  const hw = (u, side) => {
    let w = typeof halfW === 'function' ? halfW(u) : halfW * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 0.98 + 0.02) * 0.9 + 0.12)), 0.9) * Math.pow(1 - u, 0.35 * tipSharp);
    for (const n of notch) { if (n.side && n.side !== side) continue; const du = (u - n.u) / n.w; w *= 1 - n.d * Math.exp(-du * du); }
    if (jag) w *= 1 + jag * N.n3(u * 11 + side * 3, seed, 0.5);
    return Math.max(0.0005, w);
  };
  const rows = (surf) => {
    const base = pos.length / 3;
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      for (let j = 0; j <= segV; j++) {
        const v = (j / segV) * 2 - 1; const side = v >= 0 ? 1 : -1;
        const w = hw(u, side); const x = v * w;
        const prof = Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04)), 0.6);
        let z = bend * len * u * u + surf * thick * (1 - v * v) * prof - (surf > 0 ? cup * (1 - v * v) * prof : 0);
        z += twist * x * u;
        const y = len * u + sweep * x * x;
        pos.push(x, y, z);
        const e = Math.abs(v);
        if (cb || ce) { const t = cb || cc; const k = ce ? sstep(0.55, 1, e) : 0; const c2 = t.clone(); if (ce) c2.lerp(ce, k); colr.push(c2.r, c2.g, c2.b); } else colr.push(1, 1, 1);
      }
    }
    return base;
  };
  const f = rows(1); const b = rows(-1);
  const stride = segV + 1;
  for (let i = 0; i < segU; i++) for (let j = 0; j < segV; j++) {
    const a = f + i * stride + j; const c = a + stride;
    idx.push(a, a + 1, c, a + 1, c + 1, c);
    const a2 = b + i * stride + j; const c2 = a2 + stride;
    idx.push(a2, c2, a2 + 1, a2 + 1, c2, c2 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // front surface winding check (front should face +Z)
  const n0 = g.attributes.normal; if (n0.getZ(f + Math.floor(stride / 2) + stride * 2) < 0) { const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } g.computeVertexNormals(); }
  return g;
}

// Lathe-turned prop with painted vertex colours (pots, orbs, handles). profile = [[r, y], ...]
export function turned(profile, segs = 20, colorFn) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  g.computeVertexNormals();
  if (colorFn) { const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color(); for (let i = 0; i < p.count; i++) { c.setRGB(1, 1, 1); colorFn(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  return g;
}
// Per-vertex ember glow mask (emissive via the material's tp.ember colour): fn(x,y,z,nx,ny,nz) -> 0..n
export function emberGeo(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position; const n = g.attributes.normal;
  const a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = fn(p.getX(i), p.getY(i), p.getZ(i), n ? n.getX(i) : 0, n ? n.getY(i) : 0, n ? n.getZ(i) : 0, i) || 0;
  g.setAttribute('aEmber', new THREE.BufferAttribute(a, 1)); return g;
}
// Material for glowing eyes / embers: vertex-colour albedo + `aEmber` emissive mask in colour `ember`
export function glowMat(ember, k = 1, { rough = 0.3 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0, vertexColors: true }); m.name = 'glowmat';
  m.userData.tp = { scale: 1, nrm: 0, ember: new THREE.Color(ember).multiplyScalar(k).toArray() }; return m;
}
// Paint helper for any geometry
export function paintGeo(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { c.setRGB(1, 1, 1); fn(p.getX(i), p.getY(i), p.getZ(i), c, n ? n.getX(i) : 0, n ? n.getY(i) : 0, n ? n.getZ(i) : 0, i); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
// Tube along points with radius function; ends capped by taper. Wraps util tube semantics without importing it.
export function ropeGeo(points, radiusFn, { segs = 24, radial = 6, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, closed);
  const pos = g.attributes.position; const nrm = g.attributes.normal; const ring = radial + 1;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const c = curve.getPointAt(t); const r = typeof radiusFn === 'function' ? radiusFn(t) : radiusFn;
    for (let j = 0; j < ring; j++) { const k = i * ring + j; pos.setXYZ(k, c.x + nrm.getX(k) * r, c.y + nrm.getY(k) * r, c.z + nrm.getZ(k) * r); }
  }
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------------------------------------
// Surface scattering (fur tufts, warts, studs): area-weighted samples of a normalised geometry
// ------------------------------------------------------------------------------------------------
export function sampleSurface(geo, count, rng, filter) {
  const g = norm(geo); const p = g.attributes.position; const n = g.attributes.normal; const c = g.attributes.color;
  const tris = p.count / 3; const area = new Float32Array(tris); let total = 0;
  const A = new THREE.Vector3(); const B = new THREE.Vector3(); const C = new THREE.Vector3();
  for (let t = 0; t < tris; t++) { A.fromBufferAttribute(p, t * 3); B.fromBufferAttribute(p, t * 3 + 1); C.fromBufferAttribute(p, t * 3 + 2); B.sub(A); C.sub(A); area[t] = B.cross(C).length() * 0.5; total += area[t]; }
  const cum = new Float32Array(tris); let s = 0; for (let t = 0; t < tris; t++) { s += area[t]; cum[t] = s; }
  const out = []; let guard = count * 6;
  while (out.length < count && guard-- > 0) {
    const r = rng() * total; let lo = 0; let hi = tris - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const t = lo; let u = rng(); let v = rng(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
    const pt = new THREE.Vector3(); const nm = new THREE.Vector3(); const cl = new THREE.Color(0, 0, 0);
    for (let k = 0; k < 3; k++) { const wk = k === 0 ? w : k === 1 ? u : v; pt.x += p.getX(t * 3 + k) * wk; pt.y += p.getY(t * 3 + k) * wk; pt.z += p.getZ(t * 3 + k) * wk; nm.x += n.getX(t * 3 + k) * wk; nm.y += n.getY(t * 3 + k) * wk; nm.z += n.getZ(t * 3 + k) * wk; cl.r += c.getX(t * 3 + k) * wk; cl.g += c.getY(t * 3 + k) * wk; cl.b += c.getZ(t * 3 + k) * wk; }
    nm.normalize();
    if (filter && !filter(pt, nm, cl)) continue;
    out.push({ p: pt, n: nm, c: cl });
  }
  return out;
}
// Append a curved 3-sided hair tuft (9 tris) to flat arrays.
const _t1 = new THREE.Vector3(); const _t2 = new THREE.Vector3(); const _tm = new THREE.Vector3(); const _tt = new THREE.Vector3(); const _ref = new THREE.Vector3();
export function pushTuft(P, C, p, dir, len, r, bend, cRoot, cTip) {
  _ref.set(Math.abs(dir.y) > 0.9 ? 1 : 0, Math.abs(dir.y) > 0.9 ? 0 : 1, 0);
  _t1.crossVectors(dir, _ref).normalize(); _t2.crossVectors(dir, _t1).normalize();
  const ring = (centre, rr, a0) => [0, 1, 2].map((i) => { const a = a0 + (i / 3) * Math.PI * 2; return new THREE.Vector3().copy(centre).addScaledVector(_t1, Math.cos(a) * rr).addScaledVector(_t2, Math.sin(a) * rr); });
  _tm.copy(p).addScaledVector(dir, len * 0.5).addScaledVector(bend, len * 0.12);
  _tt.copy(p).addScaledVector(dir, len).addScaledVector(bend, len * 0.45);
  const r0 = ring(p, r, 0.3); const r1 = ring(_tm, r * 0.62, 0.3);
  const push = (v, c) => { P.push(v.x, v.y, v.z); C.push(c.r, c.g, c.b); };
  const cm = cRoot.clone().lerp(cTip, 0.5);
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    push(r0[i], cRoot); push(r0[j], cRoot); push(r1[i], cm); push(r0[j], cRoot); push(r1[j], cm); push(r1[i], cm);
    push(r1[i], cm); push(r1[j], cm); push(_tt, cTip);
  }
}
export function tuftGeo(P, C) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------------------------------------
// Two-bone IK for legs. Rest pose is read from the built hierarchy, so it reproduces the model exactly at rest.
//   target: a dummy joint (child of a.model) whose animated position/rotation is the ankle target.
// ------------------------------------------------------------------------------------------------
export function legIK(a, { hip, knee, ankle, target, pole }) {
  a.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4(); const tmpM = new THREE.Matrix4();
  const toModel = (o, out) => { inv.copy(a.model.matrixWorld).invert(); tmpM.multiplyMatrices(inv, o.matrixWorld); return out.setFromMatrixPosition(tmpM); };
  const H = toModel(hip, new THREE.Vector3()); const K = toModel(knee, new THREE.Vector3()); const A = toModel(ankle, new THREE.Vector3());
  target.position.copy(A);
  const L1 = knee.position.length(); const L2 = ankle.position.length();
  const b1 = knee.position.clone().normalize(); const b2 = ankle.position.clone().normalize();
  const rd = A.clone().sub(H).normalize();
  const pl = pole ? new THREE.Vector3(...pole) : K.clone().sub(H);
  pl.addScaledVector(rd, -pl.dot(rd)); if (pl.lengthSq() < 1e-8) pl.set(0, 0, 1); pl.normalize();
  const qp = new THREE.Quaternion(); const Hq = new THREE.Vector3(); const d = new THREE.Vector3(); const dir = new THREE.Vector3(); const perp = new THREE.Vector3();
  const Kp = new THREE.Vector3(); const D1 = new THREE.Vector3(); const D2 = new THREE.Vector3(); const q1 = new THREE.Quaternion(); const q2 = new THREE.Quaternion(); const qm = new THREE.Quaternion();
  const sc = new THREE.Vector3(); const tq = new THREE.Quaternion(); const T = new THREE.Vector3();
  return function solve() {
    hip.parent.updateWorldMatrix(true, false);
    hip.updateWorldMatrix(false, false);
    inv.copy(a.model.matrixWorld).invert();
    tmpM.multiplyMatrices(inv, hip.parent.matrixWorld); tmpM.decompose(Hq, qp, sc);
    toModel(hip, Hq);
    T.copy(target.position);
    d.copy(T).sub(Hq); let dist = d.length(); dir.copy(d).divideScalar(dist || 1);
    dist = clamp(dist, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1); const sinA = Math.sqrt(1 - cosA * cosA);
    // keep the pole in the plane of the leg
    perp.copy(pl).addScaledVector(dir, -pl.dot(dir)); if (perp.lengthSq() < 1e-8) perp.copy(pl); perp.normalize();
    Kp.copy(Hq).addScaledVector(dir, L1 * cosA).addScaledVector(perp, L1 * sinA);
    D1.copy(Kp).sub(Hq).normalize();
    const Ap = Hq.clone().addScaledVector(dir, dist);
    D2.copy(Ap).sub(Kp).normalize();
    q1.setFromUnitVectors(b1, D1); // world (model) orientation of the thigh
    hip.quaternion.copy(qp).invert().multiply(q1);
    qm.setFromUnitVectors(b2, D2);
    knee.quaternion.copy(q1).invert().multiply(qm);
    tq.copy(target.quaternion);
    ankle.quaternion.copy(qm).invert().multiply(tq);
    ankle.position.copy(ankle.position); // (kept)
  };
}

// ------------------------------------------------------------------------------------------------
// Secondary motion
// ------------------------------------------------------------------------------------------------
// Drag-follow of a point in model space: returns smoothed velocity-ish offsets for cloth/tails.
export class Follow {
  constructor(a, joint, k = 40, d = 7) {
    this.a = a; this.j = joint; this.p = new THREE.Vector3(); this.prev = new THREE.Vector3(); this.v = new THREE.Vector3(); this.first = true;
    this.sx = new Spring(k, d); this.sy = new Spring(k, d); this.sz = new Spring(k, d);
    this.tmp = new THREE.Vector3(); this.inv = new THREE.Matrix4();
  }
  update(dt) {
    const a = this.a; this.j.updateWorldMatrix(true, false);
    this.inv.copy(a.model.matrixWorld).invert(); this.tmp.setFromMatrixPosition(this.j.matrixWorld).applyMatrix4(this.inv);
    if (this.first) { this.prev.copy(this.tmp); this.first = false; }
    this.v.copy(this.tmp).sub(this.prev).divideScalar(Math.max(dt, 1e-3)); this.prev.copy(this.tmp);
    const kick = (s, val) => { s.v += clamp(-val, -6, 6) * 0.5; };
    kick(this.sx, this.v.x); kick(this.sy, this.v.y); kick(this.sz, this.v.z);
    this.sx.update(dt); this.sy.update(dt); this.sz.update(dt);
    return this;
  }
  get x() { return this.sx.x; } get y() { return this.sy.x; } get z() { return this.sz.x; }
}

// A hanging cloth/rag mesh whose vertices swing from the top (rest positions kept in geo.userData.rest).
// weight(y) = how much a vertex moves, computed from its height below `top`.
export class Hang {
  constructor(geo, { top, len, flow = [0, 0, 0], k = 1 } = {}) {
    this.geo = geo; this.rest = geo.attributes.position.array.slice(); this.top = top; this.len = len; this.k = k; this.flow = flow;
    geo.userData.hang = this;
  }
  // sx, sz: lateral swing (metres at hem); wave: ripple amplitude; ph: phase
  update(sx, sz, wave, t, ph = 0, sy = 0) {
    const p = this.geo.attributes.position; const r = this.rest;
    for (let i = 0; i < p.count; i++) {
      const x = r[i * 3]; const y = r[i * 3 + 1]; const z = r[i * 3 + 2];
      const w = clamp((this.top - y) / this.len); const w2 = w * w;
      const rip = Math.sin(t * 2.3 + ph + y * 7 + x * 5) * wave * w2;
      p.setXYZ(i, x + sx * w2 + rip * 0.6, y + sy * w2 - Math.abs(sx + sz) * w2 * 0.25, z + sz * w2 + rip);
    }
    p.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------
// Clip helpers
// ------------------------------------------------------------------------------------------------
export const TAU = Math.PI * 2;
export const sn = (t, hz, ph = 0) => Math.sin((t * hz + ph) * TAU);
export const ease = { out: (x) => 1 - (1 - x) ** 3, in: (x) => x * x * x, io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2), back: (x, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2 };
// piecewise-linear/smooth keyframe track: keys = [[t, v], ...]
export function track(keys, t, smooth = true) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { let k = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0] || 1); if (smooth) k = k * k * (3 - 2 * k); return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * k; }
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------------------------------------
// More helpers
// ------------------------------------------------------------------------------------------------
// March a ray against a field; returns { p, n } at the first surface crossing or null.
export function rayHit(f, o, d, tmax = 0.6, step = 0.004) {
  const dl = Math.hypot(d[0], d[1], d[2]); const dx = d[0] / dl; const dy = d[1] / dl; const dz = d[2] / dl;
  let t = 0; let prev = f(o[0], o[1], o[2]);
  if (prev < 0) return null;
  for (t = step; t <= tmax; t += step) {
    const v = f(o[0] + dx * t, o[1] + dy * t, o[2] + dz * t);
    if (v < 0) {
      let lo = t - step; let hi = t;
      for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (f(o[0] + dx * m, o[1] + dy * m, o[2] + dz * m) < 0) hi = m; else lo = m; }
      const x = o[0] + dx * hi; const y = o[1] + dy * hi; const z = o[2] + dz * hi; const e = 0.002;
      const n = new THREE.Vector3(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)).normalize();
      return { p: new THREE.Vector3(x, y, z), n };
    }
  }
  return null;
}
// Flat hanging cloth: x across (centered), y from 0 down to -h, z=0. Ragged hem via noise. colorFn(x, y, c, u, v)
export function flapGeo({ w = 0.2, h = 0.3, nx = 8, ny = 10, jag = 0.15, seed = 1, taper = 1, colorFn, topW, curve = 0, ember = null } = {}) {
  const N = makeNoise(seed); const pos = []; const colr = []; const idx = []; const emb = []; const c = new THREE.Color();
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx; const v = j / ny;
      const hem = 1 - jag * (0.5 + 0.5 * N.n3(u * 6.3, seed, 0.3)) * (0.6 + 0.4 * Math.sin(u * 17 + seed));
      const y = -h * v * (v > 0.6 ? lerp(1, hem, sstep(0.6, 1, v)) : 1);
      const ww = lerp(topW ?? w, w * taper, v);
      const x = (u - 0.5) * ww;
      const z = curve * (1 - Math.pow(2 * u - 1, 2)) * (-1) + 0.01 * N.n3(u * 3, v * 3, seed);
      pos.push(x, y, z);
      c.setRGB(1, 1, 1); if (colorFn) colorFn(x, y, c, u, v);
      colr.push(c.r, c.g, c.b);
      emb.push(ember ? ember(u, v, y) : 0);
    }
  }
  const s = nx + 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a0 = j * s + i; idx.push(a0, a0 + s, a0 + 1, a0 + 1, a0 + s, a0 + s + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setAttribute('aEmber', new THREE.Float32BufferAttribute(emb, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// place a sphere-ish bump (wart / stud) on a surface sample
export function bumpGeo(r, flat = 0.6, seg = 8) { const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)); g.scale(1, flat, 1); return g; }
