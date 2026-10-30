// Convex polyhedra for the four dice (d4 tetrahedron, d6 cube, d8 octahedron, d10 pentagonal
// trapezohedron) and a generic "rounded polyhedron" mesher: flat faces + cylindrical edge strips +
// spherical vertex patches (a Minkowski sum with a ball), so every edge catches a highlight.
//
// Units are metres; every die is centred on the origin with its faces tangent to an insphere
// (inR), so a die resting on any face has its centre exactly inR above the table.

import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Edge length / radius of each die (metres). Tuned so the five different shapes read as the same weight.
export const SIZES = { 4: { edge: 0.88 }, 6: { edge: 0.65 }, 8: { edge: 0.69 }, 10: { rho: 0.415, h: 0.44 } };

function baseSolid(sides) {
  let verts; let faces;
  if (sides === 4) {
    const s = SIZES[4].edge / (2 * Math.SQRT2);
    verts = [V(1, 1, 1), V(1, -1, -1), V(-1, 1, -1), V(-1, -1, 1)].map((v) => v.multiplyScalar(s));
    faces = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].filter((j) => j !== i)); // face i is opposite vertex i
  } else if (sides === 6) {
    const e = SIZES[6].edge / 2;
    verts = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(V(x * e, y * e, z * e));
    const idx = (x, y, z) => ((x > 0 ? 4 : 0) + (y > 0 ? 2 : 0) + (z > 0 ? 1 : 0));
    faces = [
      [idx(1, 1, 1), idx(1, 1, -1), idx(1, -1, -1), idx(1, -1, 1)], [idx(-1, 1, 1), idx(-1, 1, -1), idx(-1, -1, -1), idx(-1, -1, 1)],
      [idx(1, 1, 1), idx(1, 1, -1), idx(-1, 1, -1), idx(-1, 1, 1)], [idx(1, -1, 1), idx(1, -1, -1), idx(-1, -1, -1), idx(-1, -1, 1)],
      [idx(1, 1, 1), idx(1, -1, 1), idx(-1, -1, 1), idx(-1, 1, 1)], [idx(1, 1, -1), idx(1, -1, -1), idx(-1, -1, -1), idx(-1, 1, -1)],
    ];
  } else if (sides === 8) {
    const s = SIZES[8].edge / Math.SQRT2;
    verts = [V(s, 0, 0), V(-s, 0, 0), V(0, s, 0), V(0, -s, 0), V(0, 0, s), V(0, 0, -s)];
    faces = [];
    for (const sx of [0, 1]) for (const sy of [2, 3]) for (const sz of [4, 5]) faces.push([sx, sy, sz]);
  } else if (sides === 10) {
    const { rho, h } = SIZES[10];
    const c = Math.cos(Math.PI / 5);
    const z0 = h * (1 - c) / (1 + c); // planarity condition of the kites
    verts = [V(0, h, 0), V(0, -h, 0)]; // 0 = top pole, 1 = bottom pole
    for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5; verts.push(V(rho * Math.cos(a), z0, rho * Math.sin(a))); } // U_k = 2+k
    for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5 + Math.PI / 5; verts.push(V(rho * Math.cos(a), -z0, rho * Math.sin(a))); } // L_k = 7+k
    faces = [];
    for (let k = 0; k < 5; k++) {
      const U = (i) => 2 + (i % 5); const L = (i) => 7 + (i % 5);
      faces.push([0, U(k), L(k), U(k + 1)]);          // upper kite  (apex, wide, tip, wide)
      faces.push([1, L(k), U(k + 1), L(k + 1)]);      // lower kite
    }
  } else throw new Error(`no die with ${sides} sides`);
  return { verts, faces };
}

const cache = new Map();

/**
 * @returns {{sides, verts, faces:[{vi,n,e1,e2,c,local,inR2,fi}], inR, outR, labelFace, faceLabel, apexFor?}}
 *   faces[i].e1 = "up" of the numeral in 3D, e2 = its "right", c = visual centre, local = polygon in (right, up) metres relative to c.
 */
export function makePoly(sides) {
  if (cache.has(sides)) return cache.get(sides);
  const { verts, faces: fv } = baseSolid(sides);
  const faces = fv.map((vi, fi) => {
    let pts = vi.map((i) => verts[i]);
    const cen = new THREE.Vector3(); pts.forEach((p) => cen.add(p)); cen.multiplyScalar(1 / pts.length);
    let n = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize();
    if (n.dot(cen) < 0) { vi = [...vi].reverse(); pts = vi.map((i) => verts[i]); n.negate(); }
    return { fi, vi, n, cen };
  });
  const inR = faces[0].n.dot(faces[0].cen);
  let outR = 0; verts.forEach((v) => { outR = Math.max(outR, v.length()); });

  // numeral frame per face
  faces.forEach((f) => {
    let up;
    if (sides === 4) { // up points at the apex vertex (vertex (fi+1)%4 which this face contains)
      f.apex = (f.fi + 1) % 4;
      up = verts[f.apex].clone().sub(f.cen);
    } else if (sides === 10) {
      const pi = f.vi.findIndex((i) => i < 2);
      up = verts[f.vi[pi]].clone().sub(verts[f.vi[(pi + 2) % 4]]);
    } else if (sides === 6) {
      up = Math.abs(f.n.y) > 0.9 ? V(0, 0, -1) : V(0, 1, 0);
    } else { // octahedron: toward the first vertex
      up = verts[f.vi[0]].clone().sub(f.cen);
    }
    up.addScaledVector(f.n, -up.dot(f.n)).normalize();
    f.e1 = up; f.e2 = new THREE.Vector3().crossVectors(up, f.n).normalize();
    // polygon in local 2D, then the incircle centre (visual centre) by a small search
    const loc0 = f.vi.map((i) => { const d = verts[i].clone().sub(f.cen); return [d.dot(f.e2), d.dot(f.e1)]; });
    let best = [0, 0]; let bestD = -1;
    const mnx = Math.min(...loc0.map((p) => p[0])); const mxx = Math.max(...loc0.map((p) => p[0]));
    const mny = Math.min(...loc0.map((p) => p[1])); const mxy = Math.max(...loc0.map((p) => p[1]));
    for (let a = 0; a <= 40; a++) for (let b = 0; b <= 40; b++) {
      const x = mnx + (mxx - mnx) * (a / 40); const y = mny + (mxy - mny) * (b / 40);
      let md = 1e9;
      for (let i = 0; i < loc0.length; i++) {
        const p = loc0[i]; const q = loc0[(i + 1) % loc0.length];
        const ex = q[0] - p[0]; const ey = q[1] - p[1]; const l = Math.hypot(ex, ey);
        md = Math.min(md, (ex * (y - p[1]) - ey * (x - p[0])) / l); // signed distance (left of edge = inside for CCW in this frame)
      }
      if (md > bestD) { bestD = md; best = [x, y]; }
    }
    f.inR2 = bestD;
    f.c = f.cen.clone().addScaledVector(f.e2, best[0]).addScaledVector(f.e1, best[1]);
    f.local = loc0.map((p) => [p[0] - best[0], p[1] - best[1]]);
    // winding in the (right, up) frame must be CCW for the signed-distance test above; if not, flip sign convention
  });
  // fix: if the signed distance came out negative (CW polygons), recompute with abs-based search
  faces.forEach((f) => {
    if (f.inR2 <= 0) {
      const loc0 = f.vi.map((i) => { const d = verts[i].clone().sub(f.cen); return [d.dot(f.e2), d.dot(f.e1)]; });
      let best = [0, 0]; let bestD = -1;
      const mnx = Math.min(...loc0.map((p) => p[0])); const mxx = Math.max(...loc0.map((p) => p[0]));
      const mny = Math.min(...loc0.map((p) => p[1])); const mxy = Math.max(...loc0.map((p) => p[1]));
      for (let a = 0; a <= 40; a++) for (let b = 0; b <= 40; b++) {
        const x = mnx + (mxx - mnx) * (a / 40); const y = mny + (mxy - mny) * (b / 40);
        let md = 1e9;
        for (let i = 0; i < loc0.length; i++) {
          const p = loc0[i]; const q = loc0[(i + 1) % loc0.length];
          const ex = q[0] - p[0]; const ey = q[1] - p[1]; const l = Math.hypot(ex, ey);
          md = Math.min(md, -(ex * (y - p[1]) - ey * (x - p[0])) / l);
        }
        if (md > bestD) { bestD = md; best = [x, y]; }
      }
      f.inR2 = bestD;
      f.c = f.cen.clone().addScaledVector(f.e2, best[0]).addScaledVector(f.e1, best[1]);
      f.local = loc0.map((p) => [p[0] - best[0], p[1] - best[1]]);
    }
  });

  // label <-> face (label = value shown, 1..sides). Opposite faces sum to sides+1 on d6/d8/d10.
  const findFace = (n) => faces.findIndex((f) => f.n.distanceTo(n) < 1e-3);
  let labelFace;
  if (sides === 4) labelFace = [0, 1, 2, 3];
  else if (sides === 6) labelFace = [findFace(V(0, 1, 0)), findFace(V(0, 0, 1)), findFace(V(1, 0, 0)), findFace(V(-1, 0, 0)), findFace(V(0, 0, -1)), findFace(V(0, -1, 0))];
  else if (sides === 8) {
    const s3 = 1 / Math.sqrt(3);
    const F = (x, y, z) => findFace(V(x * s3, y * s3, z * s3));
    labelFace = [F(1, 1, 1), F(-1, 1, 1), F(1, -1, 1), F(1, 1, -1), F(-1, -1, 1), F(-1, 1, -1), F(1, -1, -1), F(-1, -1, -1)]; // 1..8; 1/8 2/7 3/6 4/5 opposite
  } else {
    labelFace = new Array(10).fill(-1);
    const upper = faces.filter((f) => f.vi.includes(0)); // 5 upper kites in order k=0..4
    const odd = [1, 7, 3, 9, 5];
    upper.forEach((f, k) => {
      labelFace[odd[k] - 1] = f.fi;
      const opp = findFace(f.n.clone().negate());
      labelFace[11 - odd[k] - 1] = opp;
    });
  }
  const faceLabel = new Array(faces.length).fill(0);
  labelFace.forEach((fi, i) => { faceLabel[fi] = i + 1; });
  const poly = { sides, verts, faces, inR, outR, labelFace, faceLabel };
  cache.set(sides, poly);
  return poly;
}

// ---------------------------------------------------------------------------------------------
// Rounded mesher
// ---------------------------------------------------------------------------------------------
const arc = (a, b, t) => a.clone().multiplyScalar(1 - t).addScaledVector(b, t).normalize();

/**
 * @param poly makePoly()
 * @param r   rounding radius (m)
 * @param seg arc subdivisions on edges/corners
 * @param uvOf (faceIndex, xMetres, yMetres)=>[u,v]  maps the flat face region into the atlas
 * @param trimUV [u,v] atlas texel used for every bevel/corner
 */
export function roundedGeometry(poly, { r = 0.04, seg = 3, uvOf, trimUV }) {
  const k = (poly.inR - r) / poly.inR;
  const S = poly.verts.map((v) => v.clone().multiplyScalar(k));
  const pos = []; const nor = []; const uv = [];
  const tri = (pa, pb, pc, na, nb, nc, ua, ub, uc) => {
    const cr = new THREE.Vector3().crossVectors(pb.clone().sub(pa), pc.clone().sub(pa));
    const avg = na.clone().add(nb).add(nc);
    if (cr.dot(avg) < 0) { [pb, pc] = [pc, pb]; [nb, nc] = [nc, nb]; [ub, uc] = [uc, ub]; }
    for (const [p, n, u] of [[pa, na, ua], [pb, nb, ub], [pc, nc, uc]]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(u[0], u[1]); }
  };
  // faces
  poly.faces.forEach((f) => {
    const c2 = f.c.clone().multiplyScalar(k).addScaledVector(f.n, r);
    const pts = f.vi.map((j) => S[j].clone().addScaledVector(f.n, r));
    const us = pts.map((p) => { const d = p.clone().sub(c2); return uvOf(f.fi, d.dot(f.e2), d.dot(f.e1)); });
    for (let t = 1; t < pts.length - 1; t++) tri(pts[0], pts[t], pts[t + 1], f.n, f.n, f.n, us[0], us[t], us[t + 1]);
  });
  // edges
  const edgeFaces = new Map();
  poly.faces.forEach((f) => {
    for (let i = 0; i < f.vi.length; i++) {
      const a = f.vi[i]; const b = f.vi[(i + 1) % f.vi.length];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!edgeFaces.has(key)) edgeFaces.set(key, { a: Math.min(a, b), b: Math.max(a, b), fs: [] });
      edgeFaces.get(key).fs.push(f);
    }
  });
  for (const e of edgeFaces.values()) {
    const [f, g] = e.fs;
    const ring = [];
    for (let m = 0; m <= seg; m++) ring.push(arc(f.n, g.n, m / seg));
    for (let m = 0; m < seg; m++) {
      const n0 = ring[m]; const n1 = ring[m + 1];
      const A0 = S[e.a].clone().addScaledVector(n0, r); const A1 = S[e.a].clone().addScaledVector(n1, r);
      const B0 = S[e.b].clone().addScaledVector(n0, r); const B1 = S[e.b].clone().addScaledVector(n1, r);
      tri(A0, A1, B1, n0, n1, n1, trimUV, trimUV, trimUV);
      tri(A0, B1, B0, n0, n1, n0, trimUV, trimUV, trimUV);
    }
  }
  // vertex patches
  poly.verts.forEach((v, j) => {
    const fs = poly.faces.filter((f) => f.vi.includes(j));
    const axis = v.clone().normalize();
    const ref = new THREE.Vector3(0, 1, 0); if (Math.abs(axis.y) > 0.9) ref.set(1, 0, 0);
    const t1 = new THREE.Vector3().crossVectors(axis, ref).normalize(); const t2 = new THREE.Vector3().crossVectors(axis, t1);
    fs.sort((p, q) => Math.atan2(p.n.dot(t2), p.n.dot(t1)) - Math.atan2(q.n.dot(t2), q.n.dot(t1)));
    const c = new THREE.Vector3(); fs.forEach((f) => c.add(f.n)); c.normalize();
    const P = (d) => S[j].clone().addScaledVector(d, r);
    for (let i = 0; i < fs.length; i++) {
      const n1 = fs[i].n; const n2 = fs[(i + 1) % fs.length].n;
      const dir = (a, b) => c.clone().multiplyScalar((seg - a - b) / seg).addScaledVector(n1, a / seg).addScaledVector(n2, b / seg).normalize();
      for (let a = 0; a < seg; a++) for (let b = 0; a + b < seg; b++) {
        const d00 = dir(a, b); const d10 = dir(a + 1, b); const d01 = dir(a, b + 1);
        tri(P(d00), P(d10), P(d01), d00, d10, d01, trimUV, trimUV, trimUV);
        if (a + b + 2 <= seg) { const d11 = dir(a + 1, b + 1); tri(P(d10), P(d11), P(d01), d10, d11, d01, trimUV, trimUV, trimUV); }
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

// Quaternion that rests `label` face-up with its numeral's "up" pointing along `topDir` (horizontal, xz).
// d4: the label's face tilts toward the viewer instead (a tetrahedron has no flat top): it rests on the face
// opposite the numeral's apex, with the numbered face turned toward `topDir` negated (the camera).
const _m1 = new THREE.Matrix4(); const _m2 = new THREE.Matrix4();
// The d4 cannot lie with its number face flat, but players must read it from above: present it leaned back toward the
// camera (visual only; physics and the roll still resolve on the true resting pose). `setD4Lean(0)` turns it off.
let D4_LEAN = 0.6;
export const setD4Lean = (r) => { D4_LEAN = r; };
const _Y = new THREE.Vector3(0, 1, 0);
export function leanQuat(poly, q, label, out = new THREE.Quaternion()) {
  out.copy(q);
  if (poly.sides !== 4 || !D4_LEAN) return out;
  const n = poly.faces[poly.labelFace[label - 1]].n.clone().applyQuaternion(q); n.y = 0;
  if (n.lengthSq() < 1e-6) return out;
  n.normalize();
  const axis = new THREE.Vector3().crossVectors(_Y, n).normalize();
  return out.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, -D4_LEAN));
}
// how far the leaned d4 must rise so its lowest corner still touches the floor
const _lift = new Map();
export function d4Lift(poly) {
  if (poly.sides !== 4 || !D4_LEAN) return 0;
  const key = D4_LEAN; if (_lift.has(poly) && _lift.get(poly).k === key) return _lift.get(poly).v;
  const q0 = restQuat(poly, 1, 0, -1, 0); const q1 = leanQuat(poly, q0, 1);
  const minY = (q) => poly.verts.reduce((m, v) => Math.min(m, v.clone().applyQuaternion(q).y), 1e9);
  const v = Math.max(0, minY(q0) - minY(q1)); _lift.set(poly, { k: key, v }); return v;
}
export function restQuat(poly, label, awayX, awayZ, jitter = 0, out = new THREE.Quaternion()) {
  const f = poly.faces[poly.labelFace[label - 1]];
  const ang = Math.atan2(awayX, -awayZ) + jitter; // yaw of "away from the camera" about +Y (0 = -Z)
  const away = new THREE.Vector3(Math.sin(ang), 0, -Math.cos(ang));
  if (poly.sides === 4) {
    // bottom = face opposite apex = poly.faces[f.apex]
    const b = poly.faces[f.apex];
    const down = new THREE.Quaternion().setFromUnitVectors(b.n, new THREE.Vector3(0, -1, 0));
    const nf = f.n.clone().applyQuaternion(down); nf.y = 0; nf.normalize();
    // numbered face should look toward the camera (opposite of `away`)
    const want = away.clone().negate();
    const yaw = Math.atan2(want.x, want.z) - Math.atan2(nf.x, nf.z);
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    return out.copy(qy).multiply(down);
  }
  const Y = new THREE.Vector3(0, 1, 0);
  const E1 = away.clone();
  const L = _m1.makeBasis(f.e1, f.n, new THREE.Vector3().crossVectors(f.e1, f.n));
  const W = _m2.makeBasis(E1, Y, new THREE.Vector3().crossVectors(E1, Y));
  const R = W.clone().multiply(L.clone().transpose());
  return out.setFromRotationMatrix(R);
}

// Which label is "reading" for orientation q: highest n.up (d6/d8/d10) or best facing `view` (d4).
export function readLabel(poly, q, view = null) {
  let best = -2; let bi = 0;
  const n = new THREE.Vector3();
  const dir = poly.sides === 4 ? (view || new THREE.Vector3(0, 0.62, 0.78)) : new THREE.Vector3(0, 1, 0);
  poly.faces.forEach((f, i) => { n.copy(f.n).applyQuaternion(q); const d = n.dot(dir); if (d > best) { best = d; bi = i; } });
  return { label: poly.faceLabel[bi], face: bi, dot: best };
}
