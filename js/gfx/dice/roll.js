// Dice rolling: a small rigid-body simulation (gravity, vertex-vs-table contacts with restitution and
// friction, tray walls, die-vs-die spheres) that is run *ahead of time* with fixed 1/240 s substeps and
// then played back by the stage clock. Because the game already knows the result, each die is simulated
// from several seeded random throws and the throw that really lands on the right face (and nearest to the
// readable yaw) is performed, so the tumble is genuinely physical. If no throw matches in the budget, the
// best one is nudged onto the right face over the last quarter (quaternion slerp + settle into the socket).
//
// Plans are plain typed arrays: deterministic for a given seed, trivially testable without a renderer.

import * as THREE from 'three';
import { mulberry32, hashStr } from '../noise.js';
import { restQuat, leanQuat, d4Lift } from './poly.js';

export const ROLL = { g: 30, h: 1 / 240, pick: 0.12, phys: 1.08, restitution: 0.46, mu: 0.6, dishDepth: 0.055 };
// How fast a planned roll plays back on screen. 0.5 = twice as long as the simulation (Dave: the dice rolled too fast).
export const ROLL_PLAYBACK = 0.5;

const _q = new THREE.Quaternion(); const _q2 = new THREE.Quaternion();

function simulate(P) {
  const { verts, nv, r, invI, h, steps, rng } = P;
  const G = ROLL.g;
  const pose = new Float32Array(steps * 7);
  const events = [];
  let px = P.p0[0]; let py = P.p0[1]; let pz = P.p0[2];
  let vx = P.v0[0]; let vy = P.v0[1]; let vz = P.v0[2];
  let qx = P.q0[0]; let qy = P.q0[1]; let qz = P.q0[2]; let qw = P.q0[3];
  let wx = P.w0[0]; let wy = P.w0[1]; let wz = P.w0[2];
  const R = new Float64Array(9);
  const invM = 1;
  let calm = 0; let rested = -1; let bounced = false;
  let lastEvt = -1;
  const e0 = ROLL.restitution; const mu = ROLL.mu;
  for (let s = 0; s < steps; s++) {
    if (rested < 0) {
      // ---- forces
      vy -= G * h;
      if (py < 1.5) { // magnet: home in on the socket once we are low, damped
        const k = bounced ? 34 : 14; const c = bounced ? 6.5 : 1.6;
        vx += ((P.sx - px) * k - vx * c) * h; vz += ((P.sz - pz) * k - vz * c) * h;
      }
      px += vx * h; py += vy * h; pz += vz * h;
      // orientation
      const hx = wx * h * 0.5; const hy = wy * h * 0.5; const hz = wz * h * 0.5;
      const nqx = qx + (hx * qw + hy * qz - hz * qy); const nqy = qy + (hy * qw + hz * qx - hx * qz);
      const nqz = qz + (hz * qw + hx * qy - hy * qx); const nqw = qw + (-hx * qx - hy * qy - hz * qz);
      const ql = 1 / Math.hypot(nqx, nqy, nqz, nqw); qx = nqx * ql; qy = nqy * ql; qz = nqz * ql; qw = nqw * ql;
      R[0] = 1 - 2 * (qy * qy + qz * qz); R[1] = 2 * (qx * qy - qz * qw); R[2] = 2 * (qx * qz + qy * qw);
      R[3] = 2 * (qx * qy + qz * qw); R[4] = 1 - 2 * (qx * qx + qz * qz); R[5] = 2 * (qy * qz - qx * qw);
      R[6] = 2 * (qx * qz - qy * qw); R[7] = 2 * (qy * qz + qx * qw); R[8] = 1 - 2 * (qx * qx + qy * qy);
      // ---- table contacts, a few sequential-impulse passes
      let touching = false; let maxImpact = 0;
      for (let it = 0; it < 4; it++) {
        let pen = 0;
        for (let i = 0; i < nv; i++) {
          const lx = verts[i * 3]; const ly = verts[i * 3 + 1]; const lz = verts[i * 3 + 2];
          const rx = R[0] * lx + R[1] * ly + R[2] * lz; const ry = R[3] * lx + R[4] * ly + R[5] * lz; const rz = R[6] * lx + R[7] * ly + R[8] * lz;
          const depth = r - (py + ry);
          if (depth <= 0) continue;
          touching = true; pen = Math.max(pen, depth);
          // contact point velocity
          const cvx = vx + (wy * rz - wz * ry); const cvy = vy + (wz * rx - wx * rz); const cvz = vz + (wx * ry - wy * rx);
          if (cvy < 0) {
            const e = -cvy < 1.0 ? 0 : e0;
            const k = invM + invI * (rx * rx + rz * rz);
            const j = -(1 + e) * cvy / k;
            vy += j * invM; wx += invI * (-rz * j); wz += invI * (rx * j);
            if (-cvy > maxImpact) maxImpact = -cvy;
            // friction
            const tl = Math.hypot(cvx, cvz);
            if (tl > 1e-5) {
              const tx = -cvx / tl; const tz = -cvz / tl;
              const c = rz * tx - rx * tz;
              const kt = invM + invI * (ry * ry + c * c);
              const jt = Math.min(tl / kt, mu * j);
              vx += tx * jt * invM; vz += tz * jt * invM;
              wx += invI * jt * (ry * tz); wy += invI * jt * (rz * tx - rx * tz); wz += invI * jt * (-ry * tx);
            }
          }
        }
        if (pen > 0) py += pen * (it === 0 ? 1 : 0.5);
      }
      if (touching) {
        bounced = true;
        const dk = Math.exp(-5.5 * h); wx *= dk; wy *= dk; wz *= dk;
        const vk = Math.exp(-2.0 * h); vx *= vk; vz *= vk;
        if (maxImpact > 0.9 && s * h - lastEvt > 0.05) { events.push({ s, speed: maxImpact, kind: 'hit' }); lastEvt = s * h; }
      } else { const ak = Math.exp(-0.12 * h); wx *= ak; wy *= ak; wz *= ak; }
      // ---- tray walls (field is +-2.0 around the dice)
      const lim = 1.95;
      if (px > lim) { px = lim; vx = -Math.abs(vx) * 0.5; } else if (px < -lim) { px = -lim; vx = Math.abs(vx) * 0.5; }
      if (pz > lim) { pz = lim; vz = -Math.abs(vz) * 0.5; } else if (pz < -lim) { pz = -lim; vz = Math.abs(vz) * 0.5; }
      // ---- other dice (spheres; they are treated as immovable: the roller yields)
      for (const o of P.others) {
        const ox = o.moving ? o.arr[Math.min(s, o.n - 1) * 7] : o.x; const oy = o.moving ? o.arr[Math.min(s, o.n - 1) * 7 + 1] : o.y; const oz = o.moving ? o.arr[Math.min(s, o.n - 1) * 7 + 2] : o.z;
        const dx = px - ox; const dy = py - oy; const dz = pz - oz; const rr = o.r + P.rb; const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < rr * rr && d2 > 1e-8) {
          const d = Math.sqrt(d2); const nx = dx / d; const ny = dy / d; const nz = dz / d;
          px = ox + nx * rr; py = oy + ny * rr * 0.6 + (py - oy) * 0.4; pz = oz + nz * rr;
          const vn = vx * nx + vy * ny + vz * nz;
          if (vn < 0) {
            vx -= 1.6 * vn * nx; vy -= 1.2 * vn * ny; vz -= 1.6 * vn * nz;
            wx += (rng() - 0.5) * 6; wz += (rng() - 0.5) * 6;
            if (-vn > 0.8 && s * h - lastEvt > 0.05) { events.push({ s, speed: -vn, kind: 'hit' }); lastEvt = s * h; }
          }
        }
      }
      // ---- sleep
      const sp = Math.hypot(vx, vy, vz); const ang = Math.hypot(wx, wy, wz);
      if (touching && sp < 0.22 && ang < 0.9 && py < P.inR + r * 0.0 + 0.12) calm++; else calm = 0;
      if (calm > 10) { rested = s; wx = wy = wz = vx = vy = vz = 0; }
    }
    const o = s * 7; pose[o] = px; pose[o + 1] = py; pose[o + 2] = pz; pose[o + 3] = qx; pose[o + 4] = qy; pose[o + 5] = qz; pose[o + 6] = qw;
  }
  return { pose, events, rested };
}

// quaternion angle between a and b as a rotation about Y (yaw error, 0..PI)
function angleBetween(a, b) { const d = Math.abs(a.dot(b)); return 2 * Math.acos(Math.min(1, d)); }

/**
 * Plan a roll for several dice.
 * @param items [{ slot, die:{poly,physVerts,radius,inR,sides}, start:{pos:Vector3, quat}, sock:Vector3, label, away:[x,z], viewDir?:Vector3, jitter? }]
 * @param statics [{x,y,z,r}] dice that stay put
 * @param opts { seed, mode:'throw'|'toss', maxAttempts }
 * @returns plans keyed by slot: { slot, pose:Float32Array, steps, T, delay, events:[{t,speed,kind,pos}], qFinal, pFinal, matched, attempts, yawErr, pick:{p0,q0} }
 */
export function planRoll(items, statics, opts = {}) {
  const { seed = 1, mode = 'throw', maxAttempts = 36 } = opts;
  const h = ROLL.h; const G = ROLL.g;
  const pick = mode === 'throw' ? ROLL.pick : 0;
  const steps = Math.ceil(ROLL.phys / h) + 1;
  const plans = {};
  const movers = [];
  items.forEach((it, idx) => {
    const rng = mulberry32((seed >>> 0) ^ hashStr(it.slot) ^ (idx * 7919));
    const { die } = it; const poly = die.poly;
    const verts = new Float32Array(poly.verts.length * 3);
    die.physVerts.forEach((v, i) => { verts[i * 3] = v.x; verts[i * 3 + 1] = v.y; verts[i * 3 + 2] = v.z; });
    const outR = poly.outR; const invI = 1 / (0.22 * outR * outR);
    const rb = (poly.inR + poly.outR) * 0.47;
    const delay = Math.min(0.1, idx * 0.012 + rng() * 0.03);
    const jitter = (rng() - 0.5) * 0.5;
    const qTarget = restQuat(poly, it.label, it.away[0], it.away[1], jitter);
    // result face as seen from the rest pose: used to score attempts
    const faceOf = poly.faces[poly.labelFace[it.label - 1]];
    const downBottom = poly.sides === 4 ? poly.faces[faceOf.apex] : null;
    const upN = new THREE.Vector3(); const dn = new THREE.Vector3(0, -1, 0); const up = new THREE.Vector3(0, 1, 0);
    let best = null;
    const others = [...statics.map((s) => ({ ...s, moving: false })), ...movers];
    for (let a = 0; a < maxAttempts; a++) {
      // ---- a random throw
      let p0; let v0; const spin = 9 + rng() * 11;
      const ax = rng() - 0.5; const ay = rng() - 0.5; const az = rng() - 0.5; const al = Math.hypot(ax, ay, az) || 1;
      const w0 = [(ax / al) * spin, (ay / al) * spin, (az / al) * spin];
      const q0 = [rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5]; const ql = Math.hypot(...q0); for (let i = 0; i < 4; i++) q0[i] /= ql;
      const tx = it.sock.x + (rng() - 0.5) * 0.35; const tz = it.sock.z + (rng() - 0.5) * 0.35;
      if (mode === 'throw') {
        p0 = [it.sock.x + (rng() - 0.5) * 0.8, 1.9 + rng() * 0.6, it.sock.z + 1.8 + rng() * 0.7];
        const vy0 = -1.0 - rng() * 3.0; const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * (p0[1] - poly.inR))) / G;
        v0 = [(tx - p0[0]) / t, vy0, (tz - p0[2]) / t];
      } else {
        p0 = [it.start.pos.x, it.start.pos.y, it.start.pos.z];
        v0 = [(rng() - 0.5) * 1.6, 6.2 + rng() * 2.2, (rng() - 0.5) * 1.6];
      }
      const sim = simulate({ verts, nv: poly.verts.length, r: die.radius, invI, h, steps, rng, p0, v0, q0, w0, sx: it.sock.x, sz: it.sock.z, inR: poly.inR, rb, others });
      // ---- score
      const last = (steps - 1) * 7;
      const qf = new THREE.Quaternion(sim.pose[last + 3], sim.pose[last + 4], sim.pose[last + 5], sim.pose[last + 6]);
      let flat = 0; let matched = false;
      if (poly.sides === 4) {
        let bi = 0; let bd = -2;
        poly.faces.forEach((f, i) => { upN.copy(f.n).applyQuaternion(qf); const d = upN.dot(dn); if (d > bd) { bd = d; bi = i; } });
        flat = bd; matched = bi === downBottom.fi;
      } else {
        let bi = 0; let bd = -2;
        poly.faces.forEach((f, i) => { upN.copy(f.n).applyQuaternion(qf); const d = upN.dot(up); if (d > bd) { bd = d; bi = i; } });
        flat = bd; matched = poly.faceLabel[bi] === it.label;
      }
      const settled = sim.rested >= 0 && sim.rested < steps - 8;
      const ok = matched && flat > 0.995;
      const yawErr = ok ? angleBetween(qf, qTarget) : 9;
      const score = (ok ? 100 : matched ? 40 : 0) + (settled ? 10 : 0) - yawErr;
      if (!best || score > best.score) best = { score, sim, ok, yawErr, matched, flat, p0, q0, attempts: a + 1, qf, settled };
      if (ok && settled && yawErr < 0.55) break;
    }
    best.attempts = Math.min(best.attempts, maxAttempts);
    const last = (steps - 1) * 7;
    const pFinal = new THREE.Vector3(it.sock.x, -ROLL.dishDepth + poly.inR + d4Lift(poly), it.sock.z);
    const plan = {
      slot: it.slot, pose: best.sim.pose, steps, h, T: pick + ROLL.phys, pick, delay, mode,
      events: best.sim.events.map((e) => ({ t: pick + e.s * h, speed: e.speed, kind: e.kind, pos: [best.sim.pose[e.s * 7], 0, best.sim.pose[e.s * 7 + 2]] })),
      qFinal: leanQuat(poly, qTarget, it.label), pFinal, matched: best.ok, physMatched: best.matched, attempts: best.attempts, yawErr: best.yawErr,
      restedAt: best.sim.rested >= 0 ? pick + best.sim.rested * h : null, start: it.start, sock: it.sock, qPhys: best.qf.clone(),
    };
    plan.events.push({ t: plan.T, speed: 1, kind: 'settle', pos: [it.sock.x, 0, it.sock.z] });
    plans[it.slot] = plan;
    movers.push({ moving: true, arr: best.sim.pose, n: steps, r: rb });
  });
  return plans;
}

const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const out1 = new THREE.Quaternion(); const out2 = new THREE.Quaternion();

/** Sample a plan at local time t (seconds since the die's own start). Writes into pos/quat; returns {airborne, k}. */
export function samplePlan(plan, t, pos, quat) {
  const { pose, h, pick } = plan;
  const T = plan.T;
  if (t <= 0) { pos.copy(plan.start.pos); quat.copy(plan.start.quat); return { phase: 0 }; }
  if (t >= T) { pos.copy(plan.pFinal); quat.copy(plan.qFinal); return { phase: 2 }; }
  // phys pose at time (t - pick)
  const pt = Math.max(0, t - pick); const fi = Math.min(plan.steps - 1.001, pt / h); const i0 = Math.floor(fi); const f = fi - i0;
  const o0 = i0 * 7; const o1 = o0 + 7;
  const px = pose[o0] + (pose[o1] - pose[o0]) * f; const py = pose[o0 + 1] + (pose[o1 + 1] - pose[o0 + 1]) * f; const pz = pose[o0 + 2] + (pose[o1 + 2] - pose[o0 + 2]) * f;
  out1.set(pose[o0 + 3], pose[o0 + 4], pose[o0 + 5], pose[o0 + 6]); out2.set(pose[o1 + 3], pose[o1 + 4], pose[o1 + 5], pose[o1 + 6]);
  const qp = out1.slerp(out2, f);
  if (t < pick) { // the throw: swoop from the socket to the spawn point
    const k = ss(t / pick);
    pos.set(plan.start.pos.x + (px - plan.start.pos.x) * k, plan.start.pos.y + (py - plan.start.pos.y) * k, plan.start.pos.z + (pz - plan.start.pos.z) * k);
    quat.copy(plan.start.quat).slerp(qp, k);
    return { phase: 0.5 };
  }
  // settle: correct the physical pose onto the exact rest pose over the last 28%
  const tb = T - ROLL.phys * 0.28; const w = ss((t - tb) / (T - tb));
  pos.set(px + (plan.pFinal.x - px) * w, py + (plan.pFinal.y - py) * w, pz + (plan.pFinal.z - pz) * w);
  quat.copy(qp).slerp(plan.qFinal, w);
  return { phase: 1, w };
}
