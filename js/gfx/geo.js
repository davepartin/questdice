// Geometry helpers for the weapon builder (weapons.js): lofted cross-sections, mirrored geometry, tinted/merged parts, canvas textures.
import * as THREE from 'three';
import { mergeGeometries, shaped, tube, worldUV } from './util.js';
import { mulberry32 } from './noise.js';

export const TAU = Math.PI * 2;
export const D = Math.PI / 180;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const sgnPow = (v, p) => Math.sign(v) * Math.abs(v) ** p;
export const col = (c) => (c && c.isColor ? c : new THREE.Color(c));

// ------------------------------------------------------------------------------------------ rings
// Points [x,z] of a (super)ellipse. theta = 0 at +Z (front), growing toward +X (the hero's left).
export function ringPts(N, rx, rz = rx, { n = 2, ox = 0, oz = 0, rot = 0, a0 = 0, a1 = TAU, open } = {}) {
  const isOpen = open ?? (a1 - a0 < TAU - 1e-4);
  const M = isOpen ? N + 1 : N; const pts = [];
  const cr = Math.cos(rot); const sr = Math.sin(rot);
  for (let i = 0; i < M; i++) {
    const th = a0 + (a1 - a0) * (i / N);
    const x = rx * sgnPow(Math.sin(th), 2 / n); const z = rz * sgnPow(Math.cos(th), 2 / n);
    pts.push([x * cr + z * sr + ox, -x * sr + z * cr + oz]);
  }
  return pts;
}

function toIndexed(g) {
  if (g.index) return g;
  const n = g.attributes.position.count; const ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i;
  g.setIndex(new THREE.BufferAttribute(ix, 1)); return g;
}
function ensureAttrs(g, { uv = true, color = true } = {}) {
  toIndexed(g);
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (uv && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (color && !g.attributes.color) { const c = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
  return g;
}
export const prep = (g) => ensureAttrs(g);

// Orient the triangles of a quad (a,b,c,d positions) so the normal points along `ref`.
function pushQuad(out, a, b, c, d, ref) {
  const ab = new THREE.Vector3().subVectors(b, a); const ad = new THREE.Vector3().subVectors(d, a);
  const nrm = new THREE.Vector3().crossVectors(ab, ad);
  const flip = nrm.dot(ref) < 0;
  const tri = flip ? [a, d, b, b, d, c] : [a, b, d, b, c, d];
  for (const p of tri) out.push(p.x, p.y, p.z);
}

/**
 * Loft cross-sections along Y.  secs = [{ y, rx, rz, n, ox, oz, rot, a0, a1 } | { y, pts }]
 * opts: N radial segments, a0/a1 arc (partial arcs make open shells), thick (shell thickness: adds an inner
 * surface and edge walls), flat (faceted normals), capTop/capBottom, uv:[u,v] scale.
 */
export function loft(secs, o = {}) {
  const { N = 20, thick = 0, flat = false, uv = [1, 1], capTop = false, capBottom = false, ring: ro = {} } = o;
  const rows = secs.map((s) => ({ y: s.y, pts: s.pts || ringPts(s.N || N, s.rx, s.rz ?? s.rx, { ...ro, ...s }) }));
  const M = rows[0].pts.length;
  const a0 = ro.a0 ?? secs[0].a0 ?? 0; const a1 = ro.a1 ?? secs[0].a1 ?? TAU;
  const open = ro.open ?? (a1 - a0 < TAU - 1e-4);
  const closed = !open && !o.noSeam;
  const Mx = closed ? M + 1 : M; const R = rows.length;
  const up = rows[R - 1].y >= rows[0].y;
  const pos = new Float32Array(R * Mx * 3); const uvs = new Float32Array(R * Mx * 2);
  let vacc = 0;
  for (let j = 0; j < R; j++) {
    if (j > 0) vacc += Math.abs(rows[j].y - rows[j - 1].y);
    for (let i = 0; i < Mx; i++) {
      const p = rows[j].pts[i % M]; const k = j * Mx + i;
      pos[k * 3] = p[0]; pos[k * 3 + 1] = rows[j].y; pos[k * 3 + 2] = p[1];
      uvs[k * 2] = (i / (Mx - 1)) * uv[0]; uvs[k * 2 + 1] = vacc * uv[1];
    }
  }
  const idx = [];
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < Mx - 1; i++) {
    const a = j * Mx + i; const b = a + 1; const d = a + Mx; const c = d + 1;
    if (up) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
  }
  const outer = new THREE.BufferGeometry();
  outer.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  outer.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  outer.setIndex(idx);
  outer.computeVertexNormals();
  const nr = outer.attributes.normal;
  if (closed) for (let j = 0; j < R; j++) { // weld the seam normals
    const a = j * Mx; const b = a + Mx - 1;
    const x = nr.getX(a) + nr.getX(b); const y = nr.getY(a) + nr.getY(b); const z = nr.getZ(a) + nr.getZ(b);
    const l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  // pole rows (rings collapsed to a point) get a clean axial normal
  for (const j of [0, R - 1]) {
    let m = 0; for (let i = 0; i < M; i++) m = Math.max(m, Math.abs(rows[j].pts[i][0]), Math.abs(rows[j].pts[i][1]));
    if (m < 2e-3) { const sy = (j === 0) === up ? -1 : 1; for (let i = 0; i < Mx; i++) nr.setXYZ(j * Mx + i, 0, sy, 0); }
  }
  const pieces = [outer];
  if (thick > 0) {
    const ip = new Float32Array(pos.length);
    for (let k = 0; k < R * Mx; k++) { ip[k * 3] = pos[k * 3] - nr.getX(k) * thick; ip[k * 3 + 1] = pos[k * 3 + 1] - nr.getY(k) * thick; ip[k * 3 + 2] = pos[k * 3 + 2] - nr.getZ(k) * thick; }
    const inner = new THREE.BufferGeometry();
    inner.setAttribute('position', new THREE.BufferAttribute(ip, 3)); inner.setAttribute('uv', new THREE.BufferAttribute(uvs.slice(), 2));
    const rev = []; for (let t = 0; t < idx.length; t += 3) rev.push(idx[t], idx[t + 2], idx[t + 1]);
    inner.setIndex(rev); inner.computeVertexNormals(); pieces.push(inner);
    // edge walls (flat shaded)
    const walls = [];
    const P = (k, arr) => new THREE.Vector3(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]);
    const wallRow = (j, ref) => { for (let i = 0; i < Mx - 1; i++) { const k0 = j * Mx + i; const k1 = k0 + 1; pushQuad(walls, P(k0, pos), P(k1, pos), P(k1, ip), P(k0, ip), ref); } };
    wallRow(0, new THREE.Vector3(0, up ? -1 : 1, 0)); wallRow(R - 1, new THREE.Vector3(0, up ? 1 : -1, 0));
    if (open) for (const i of [0, Mx - 1]) for (let j = 0; j < R - 1; j++) {
      const k0 = j * Mx + i; const k1 = k0 + Mx; const kn = j * Mx + (i === 0 ? 1 : Mx - 2);
      const ref = P(k0, pos).sub(P(kn, pos));
      pushQuad(walls, P(k0, pos), P(k1, pos), P(k1, ip), P(k0, ip), ref);
    }
    if (walls.length) { const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3)); w.computeVertexNormals(); pieces.push(w); }
  }
  for (const [flag, j, sy] of [[capTop, R - 1, up ? 1 : -1], [capBottom, 0, up ? -1 : 1]]) {
    if (!flag) continue;
    let cx = 0; let cz = 0; for (const p of rows[j].pts) { cx += p[0]; cz += p[1]; } cx /= M; cz /= M;
    const arr = []; const c = new THREE.Vector3(cx, rows[j].y, cz);
    for (let i = 0; i < (open ? M - 1 : M); i++) {
      const p0 = rows[j].pts[i]; const p1 = rows[j].pts[(i + 1) % M];
      const a = new THREE.Vector3(p0[0], rows[j].y, p0[1]); const b = new THREE.Vector3(p1[0], rows[j].y, p1[1]);
      const nrm = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(a, c), new THREE.Vector3().subVectors(b, c));
      if (nrm.y * sy >= 0) arr.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z); else arr.push(c.x, c.y, c.z, b.x, b.y, b.z, a.x, a.y, a.z);
    }
    if (arr.length) { const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); w.computeVertexNormals(); pieces.push(w); }
  }
  for (const p of pieces) ensureAttrs(p);
  let g = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);
  if (flat) { g = g.toNonIndexed(); g.computeVertexNormals(); ensureAttrs(g); }
  return g;
}

// ------------------------------------------------------------------------------------------ mirror
export function mirrorGeo(g0) {
  const g = toIndexed(g0.clone());
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
  const n = g.attributes.normal; if (n) for (let i = 0; i < n.count; i++) n.setX(i, -n.getX(i));
  const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true;
  return g;
}
export const both = (g) => [g, mirrorGeo(g)];

// ------------------------------------------------------------------------------------------ small builders
export const merge = (list) => { const l = list.filter(Boolean).map((g) => prep(g.isBufferGeometry ? g : g)); return l.length === 1 ? l[0] : mergeGeometries(l, false); };
export const X = (geo, o = {}) => shaped(geo, o);
// tapered cylinder between two points
export function cylBetween(p0, p1, r0, r1 = r0, seg = 8, cap = true) {
  const a = new THREE.Vector3(...p0); const b = new THREE.Vector3(...p1);
  const len = a.distanceTo(b) || 1e-4;
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, !cap);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}
export function sph(r, p = [0, 0, 0], s = [1, 1, 1], seg = 12, rings = 8) { return shaped(new THREE.SphereGeometry(r, seg, rings), { p, s }); }
// faceted gem: flattened octahedron-ish crystal
export function crystal(r = 0.02, h = 1.6, seg = 6, { flat = true } = {}) {
  const pts = [[0, -h], [r, -h * 0.25], [r * 1.05, h * 0.35], [0, h]].map(([a, b]) => new THREE.Vector2(a, b * r));
  const g = new THREE.LatheGeometry(pts, seg); const f = g.toNonIndexed(); if (flat) f.computeVertexNormals(); return ensureAttrs(f);
}
export function gemCut(r = 0.02, seg = 8) { // brilliant-ish cabochon / cut stone
  const pts = [[0, -0.7], [0.62, -0.1], [1, 0.05], [0.8, 0.3], [0.45, 0.42], [0, 0.45]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
  const g = new THREE.LatheGeometry(pts, seg).toNonIndexed(); g.computeVertexNormals(); return ensureAttrs(g);
}
export function helix(r, y0, y1, turns, wire, { seg = 160, radial = 5, phase = 0, rz = r } = {}) {
  const pts = []; for (let i = 0; i <= seg; i++) { const t = i / seg; const a = phase + t * turns * TAU; pts.push([Math.cos(a) * r, y0 + (y1 - y0) * t, Math.sin(a) * rz]); }
  return tube(pts, wire, { segs: seg, radial });
}
export function torus(R, r, seg = 16, radial = 6) { return new THREE.TorusGeometry(R, r, radial, seg); }
// Flat polygon extrusion with a small bevel: plates, tabs, belt buckles. pts in XY, extruded along Z.
export function plate(pts, depth = 0.01, bevel = 0.002, { curve = 0 } = {}) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  if (curve) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + (p.getX(i) ** 2) * curve); g.computeVertexNormals(); }
  return ensureAttrs(g);
}
export function rivets(points, r = 0.008, seg = 6) {
  const list = points.map((p) => { const g = new THREE.SphereGeometry(r, seg, 4, 0, TAU, 0, Math.PI * 0.55); const m = new THREE.Matrix4(); const n = new THREE.Vector3(p[3] ?? 0, p[4] ?? 0, p[5] ?? 1).normalize(); m.compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n), new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m); return g; });
  return list.length ? merge(list) : null;
}

// Paint a uniform colour (+ optional AO function of position, 0..1) into the vertex colours.
export function tint(g, c, ao) {
  prep(g);
  const k = col(c); const p = g.attributes.position; const cc = g.attributes.color;
  for (let i = 0; i < p.count; i++) {
    const a = ao ? ao(p.getX(i), p.getY(i), p.getZ(i), i) : 1;
    cc.setXYZ(i, k.r * a, k.g * a, k.b * a);
  }
  return g;
}
// Multiply existing vertex colours by an AO/gradient function.
export function shade(g, fn) {
  prep(g); const p = g.attributes.position; const cc = g.attributes.color;
  for (let i = 0; i < p.count; i++) { const a = fn(p.getX(i), p.getY(i), p.getZ(i), i); cc.setXYZ(i, cc.getX(i) * a, cc.getY(i) * a, cc.getZ(i) * a); }
  return g;
}
export function tintMerge(list) { // list of [geo, color, ao?]
  return merge(list.filter((e) => e && e[0]).map(([g, c, ao]) => tint(g, c, ao)));
}
export { worldUV, tube, shaped, mergeGeometries };

// ------------------------------------------------------------------------------------------ canvas
const canvasCache = new Map();
export function canvasTex(key, w, h, draw, { srgb = true, repeat = false, aniso = 8 } = {}) {
  if (canvasCache.has(key)) return canvasCache.get(key);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.needsUpdate = true;
  canvasCache.set(key, t); return t;
}

// ------------------------------------------------------------------------------------------ skinning
const MAX_INF = 4;
