// Hero secondary motion: shape-matching verlet cloth, two-bone IK for the off hand, and spring chains.
import * as THREE from 'three';

const _v = new THREE.Vector3(); const _m = new THREE.Matrix4();

// ------------------------------------------------------------------------------------------------ cloth
// A grid of particles hanging from `joint`. restFn(u,v) -> [x,y,z] in joint-local space (u across 0..1, v down 0..1).
// Row 0 is pinned to the animated rest shape; lower rows lag behind it (inertia), pulled back by a spring that weakens
// with v, so the drape is always readable and never explodes. colorFn(u,v)->THREE.Color optional.
export class Cloth {
  constructor(actor, { joint, cols = 10, rows = 10, restFn, material, colorFn, tatter = 0, seed = 1, stiff = [34, 7], wrapU = false, drag = 0.97, gravity = 5, uvScale = [1, 1], parent }) {
    this.a = actor; this.joint = actor.joints[joint]; this.cols = cols; this.rows = rows; this.restFn = restFn; this.wrap = wrapU; this.stiff = stiff; this.drag = drag; this.g = gravity;
    this.nx = cols + 1; this.ny = rows + 1; const N = this.nx * this.ny;
    this.rest = new Float32Array(N * 3); this.p = new Float32Array(N * 3); this.q = new Float32Array(N * 3);
    let k = 0; let rnd = seed * 9301;
    const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    this.tat = new Float32Array(this.nx).map((_, i) => (i % 2 ? 1 : 0.0) * tatter * (0.5 + R()) + R() * tatter * 0.5);
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++, k++) {
      const u = i / cols; let v = j / rows;
      if (j === rows) v = 1 - this.tat[i] / Math.max(0.2, 1) * 0.5 * (tatter ? 1 : 0); // ragged hem
      const r = restFn(u, v); this.rest[k * 3] = r[0]; this.rest[k * 3 + 1] = r[1]; this.rest[k * 3 + 2] = r[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const uv = new Float32Array(N * 2); const colr = new Float32Array(N * 3); const c = new THREE.Color();
    k = 0;
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++, k++) {
      const u = i / cols; const v = j / rows; uv[k * 2] = u * uvScale[0]; uv[k * 2 + 1] = v * uvScale[1];
      if (colorFn) c.copy(colorFn(u, v)); else c.setScalar(1);
      colr[k * 3] = c.r; colr[k * 3 + 1] = c.g; colr[k * 3 + 2] = c.b;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    const idx = [];
    const xmax = wrapU ? cols : cols;
    for (let j = 0; j < rows; j++) for (let i = 0; i < xmax; i++) {
      const a = j * this.nx + i; const b = j * this.nx + (i + 1) % this.nx; const d = a + this.nx; const e = j * this.nx + this.nx + ((i + 1) % this.nx);
      idx.push(a, d, b, b, d, e);
    }
    geo.setIndex(idx);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, material); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    (parent || actor.model).add(this.mesh);
    this.restLen = []; this.ready = false;
  }
  _restWorld(out) {
    this.joint.updateWorldMatrix(true, false); _m.copy(this.joint.matrixWorld);
    const r = this.rest; for (let k = 0; k < this.nx * this.ny; k++) { _v.set(r[k * 3], r[k * 3 + 1], r[k * 3 + 2]).applyMatrix4(_m); out[k * 3] = _v.x; out[k * 3 + 1] = _v.y; out[k * 3 + 2] = _v.z; }
  }
  reset() { this._restWorld(this.p); this.q.set(this.p); this.ready = true; this._write(); }
  update(dt) {
    if (!this.ready) { this.reset(); return; }
    dt = Math.min(dt, 1 / 20); if (dt <= 0) return;
    const sub = Math.max(1, Math.ceil(dt / 0.012)); const h = dt / sub;
    const rw = this._rw || (this._rw = new Float32Array(this.p.length)); this._restWorld(rw);
    const p = this.p; const q = this.q; const nx = this.nx; const ny = this.ny;
    for (let s = 0; s < sub; s++) {
      for (let j = 0; j < ny; j++) {
        const v = j / this.rows; const kk = this.stiff[0] - (this.stiff[0] - this.stiff[1]) * v; const a = 1 - Math.exp(-kk * h);
        for (let i = 0; i < nx; i++) {
          const k = (j * nx + i) * 3;
          if (j === 0) { p[k] = rw[k]; p[k + 1] = rw[k + 1]; p[k + 2] = rw[k + 2]; q[k] = p[k]; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2]; continue; }
          for (let c = 0; c < 3; c++) {
            const cur = p[k + c]; let vel = (cur - q[k + c]) * this.drag; q[k + c] = cur;
            let nxt = cur + vel - (c === 1 ? this.g * h * h : 0);
            nxt += (rw[k + c] - nxt) * a;
            p[k + c] = nxt;
          }
        }
      }
      // keep neighbouring rows within their rest spacing (prevents stretching under fast motion)
      for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = (j * nx + i) * 3; const k0 = ((j - 1) * nx + i) * 3;
        const dx = p[k] - p[k0]; const dy = p[k + 1] - p[k0 + 1]; const dz = p[k + 2] - p[k0 + 2];
        const L = Math.hypot(dx, dy, dz) || 1e-6;
        const rx = rw[k] - rw[k0]; const ry = rw[k + 1] - rw[k0 + 1]; const rz = rw[k + 2] - rw[k0 + 2]; const R = Math.hypot(rx, ry, rz) || 1e-6;
        if (L > R * 1.12) { const f = (R * 1.12) / L; p[k] = p[k0] + dx * f; p[k + 1] = p[k0 + 1] + dy * f; p[k + 2] = p[k0 + 2] + dz * f; }
      }
    }
    this._write();
  }
  _write() {
    const inv = this._inv || (this._inv = new THREE.Matrix4()); inv.copy(this.mesh.parent.matrixWorld).invert();
    const pos = this.geo.attributes.position; const N = this.nx * this.ny;
    for (let k = 0; k < N; k++) { _v.set(this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]).applyMatrix4(inv); pos.setXYZ(k, _v.x, _v.y, _v.z); }
    pos.needsUpdate = true; this.geo.computeVertexNormals(); this.geo.attributes.normal.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------ IK
const X = new THREE.Vector3(); const Y = new THREE.Vector3(); const Z = new THREE.Vector3();
const qa = new THREE.Quaternion(); const qb = new THREE.Quaternion(); const mm = new THREE.Matrix4();
export function solveArm(a, side, targetWorld, w = 1, { L1 = 0.29, L2 = 0.27, pole = [0, -1, -0.3] } = {}) {
  if (w <= 0.001) return;
  const arm = a.joints[`arm${side}`]; const fore = a.joints[`fore${side}`];
  arm.updateWorldMatrix(true, false);
  const S = new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld);
  const T = targetWorld.clone();
  const dir = T.clone().sub(S); let d = dir.length(); dir.normalize();
  d = Math.min(d, (L1 + L2) * 0.999);
  const aL = (L1 * L1 - L2 * L2 + d * d) / (2 * d); const hh = Math.sqrt(Math.max(0, L1 * L1 - aL * aL));
  const sideSign = side === 'L' ? 1 : -1;
  const rootQ = a.root.getWorldQuaternion(new THREE.Quaternion());
  const pw = new THREE.Vector3(pole[0] * sideSign, pole[1], pole[2]).applyQuaternion(rootQ);
  const perp = pw.clone().sub(dir.clone().multiplyScalar(pw.dot(dir))).normalize();
  const E = S.clone().addScaledVector(dir, aL).addScaledVector(perp, hh);
  const T2 = S.clone().addScaledVector(dir, d);
  const up = E.clone().sub(S).normalize(); const lo = T2.clone().sub(E).normalize();
  const hinge = new THREE.Vector3().crossVectors(up, lo);
  if (hinge.lengthSq() < 1e-8) hinge.crossVectors(up, perp);
  hinge.normalize(); X.copy(hinge).negate();
  const basis = (y) => { Y.copy(y).negate(); Z.crossVectors(X, Y).normalize(); const xx = new THREE.Vector3().crossVectors(Y, Z).normalize(); mm.makeBasis(xx, Y, Z); return qa.setFromRotationMatrix(mm).clone(); };
  const qUp = basis(up);
  const pq = arm.parent.getWorldQuaternion(new THREE.Quaternion());
  const loc = pq.clone().invert().multiply(qUp);
  arm.quaternion.slerp(loc, w);
  arm.updateMatrixWorld(true);
  const qLo = basis(lo);
  const loc2 = arm.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qLo);
  fore.quaternion.slerp(loc2, w);
  fore.updateMatrixWorld(true);
}

// ------------------------------------------------------------------------------------------------ sway chain
// Spring follower for a hanging joint chain: reacts to the anchor's acceleration plus a little wind.
export class Sway {
  constructor(actor, anchorJoint, names, { k = 50, d = 5, gain = 0.9, wind = 0.05, speed = 1.3, phase = 0 } = {}) {
    this.a = actor; this.anchor = actor.joints[anchorJoint]; this.names = names; this.gain = gain; this.wind = wind; this.speed = speed; this.phase = phase;
    this.sx = names.map(() => actor.spring('sw' + Math.random(), k, d)); this.sz = names.map(() => actor.spring('sw' + Math.random(), k, d));
    this.prev = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.has = false; this.t = 0;
    this.baseR = names.map((n) => actor.joints[n].rotation.clone());
  }
  update(dt) {
    this.t += dt; this.anchor.updateWorldMatrix(true, false);
    const p = new THREE.Vector3().setFromMatrixPosition(this.anchor.matrixWorld);
    if (!this.has) { this.prev.copy(p); this.has = true; }
    const v = p.clone().sub(this.prev).divideScalar(Math.max(dt, 1e-3)); this.prev.copy(p);
    const acc = v.clone().sub(this.vel).divideScalar(Math.max(dt, 1e-3)); this.vel.copy(v);
    const loc = acc.clone().transformDirection(this.anchor.matrixWorld.clone().invert()).multiplyScalar(acc.length());
    this.names.forEach((n, i) => {
      const f = this.gain * 0.012 * (1 + i * 0.4);
      this.sx[i].v += THREE.MathUtils.clamp(loc.z * f, -2, 2); this.sz[i].v += THREE.MathUtils.clamp(-loc.x * f, -2, 2);
      this.sx[i].target = Math.sin((this.t * this.speed + this.phase + i * 0.7) * 2) * this.wind; this.sz[i].target = Math.sin((this.t * this.speed * 0.8 + this.phase + i) * 2.3) * this.wind * 0.7;
      const j = this.a.joints[n]; const b = this.baseR[i];
      j.rotation.set(b.x + THREE.MathUtils.clamp(this.sx[i].x, -0.7, 0.7), b.y, b.z + THREE.MathUtils.clamp(this.sz[i].x, -0.7, 0.7));
    });
  }
}
