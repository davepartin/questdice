// Geometry and scene helpers shared by every model in the game.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeNoise } from './noise.js';

export { mergeGeometries, RoundedBoxGeometry };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// A mesh with shadows on by default.
export function mesh(geo, mat, { cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}
export function group(name, ...kids) {
  const g = new THREE.Group(); if (name) g.name = name; kids.forEach((k) => k && g.add(k)); return g;
}
// A named joint: a Group you rotate to pose a limb. Children hang off it.
export function joint(name, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); return g; }

// Lathe from a 2D profile [[radius, y], ...] -> solid of revolution (swords, bottles, trunks, helmets).
export function lathe(profile, segs = 24, { phi = Math.PI * 2 } = {}) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segs, 0, phi);
}
// Tube following a list of [x,y,z] points: tails, tentacles, rope, branches. Radius may be a fn of t in 0..1.
export function tube(points, radius = 0.05, { segs = 24, radial = 8, closed = false, taper = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, closed);
  if (taper || typeof radius === 'function') {
    const pos = g.attributes.position; const nrm = g.attributes.normal;
    const ring = radial + 1;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs; const c = curve.getPointAt(t);
      const r = typeof radius === 'function' ? radius(t) : radius * (taper ? taper(t) : 1);
      for (let j = 0; j < ring; j++) {
        const k = i * ring + j;
        const nx = nrm.getX(k); const ny = nrm.getY(k); const nz = nrm.getZ(k);
        pos.setXYZ(k, c.x + nx * r, c.y + ny * r, c.z + nz * r);
      }
    }
  } else {
    const pos = g.attributes.position; const nrm = g.attributes.normal; const ring = radial + 1;
    for (let i = 0; i <= segs; i++) {
      const c = curve.getPointAt(i / segs);
      for (let j = 0; j < ring; j++) { const k = i * ring + j; pos.setXYZ(k, c.x + nrm.getX(k) * radius, c.y + nrm.getY(k) * radius, c.z + nrm.getZ(k) * radius); }
    }
  }
  g.computeVertexNormals();
  return g;
}
// Push vertices along their normals by a noise field: turns spheres into rocks, skulls, lumpy heads, blobs.
export function displace(geo, { amp = 0.1, freq = 2, seed = 1, oct = 3, ridged = false } = {}) {
  const N = makeNoise(seed); const g = geo.index ? geo.toNonIndexed() : geo.clone();
  // weld by position so the surface doesn't tear: displace by a function of position only
  const pos = g.attributes.position; const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    let n = 0; let a = 1; let f = freq; let s = 0;
    for (let o = 0; o < oct; o++) { n += a * N.n3(x * f, y * f, z * f); s += a; a *= 0.5; f *= 2; }
    n /= s; if (ridged) n = 1 - Math.abs(n) * 2;
    const d = n * amp;
    pos.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d);
  }
  g.computeVertexNormals();
  return g;
}
// Scale a geometry non-uniformly and move it: the workhorse for sculpting a body from primitives.
export function shaped(geo, { s = [1, 1, 1], p = [0, 0, 0], r = [0, 0, 0] } = {}) {
  const g = geo.clone();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  g.applyMatrix4(m);
  return g;
}
export const sphere = (r = 0.5, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);
export const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
export const box = (w, h, d, r = 0, seg = 3) => (r > 0 ? new RoundedBoxGeometry(w, h, d, seg, r) : new THREE.BoxGeometry(w, h, d));
export const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);
export const capsule = (r, len, cs = 6, rs = 16) => new THREE.CapsuleGeometry(r, len, cs, rs);

// Vertex colours from a function of position: baked gradients/AO that cost nothing at runtime.
export function paint(geo, fn) {
  const pos = geo.attributes.position; const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { fn(pos.getX(i), pos.getY(i), pos.getZ(i), c, i); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
// Triplanar-ish box UVs so tiling textures don't stretch on sculpted primitives (world-space scale).
export function worldUV(geo, scale = 1) {
  const pos = geo.attributes.position; const nrm = geo.attributes.normal; const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i)); const ay = Math.abs(nrm.getY(i)); const az = Math.abs(nrm.getZ(i));
    const x = pos.getX(i) * scale; const y = pos.getY(i) * scale; const z = pos.getZ(i) * scale;
    if (ax >= ay && ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else if (ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
// Mirror an object across X (left/right limbs). Returns a clone with negative X scale, so
// materials should be double-sided or the clone is rebuilt with flipped winding.
export function mirrorX(obj) { const c = obj.clone(true); c.scale.x *= -1; c.traverse((o) => { if (o.isMesh) o.material = o.material; }); return c; }

export function setShadow(obj, cast = true, receive = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}
export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    // materials/textures from the shared cache are intentionally kept
  });
}
export const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
export const easeOutElastic = (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
