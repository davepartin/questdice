// Procedural animation for hierarchical characters (no skinned meshes, no animation files).
// A character is a tree of Groups ("joints"). Clips are plain functions that pose those joints.
//
//   const anim = new Animator(joints, {
//     idle:   { loop: true,  dur: 2.4, fn: (t, P) => { P.rot('spine', Math.sin(t * 2.6) * 0.02, 0, 0); } },
//     attack: { loop: false, dur: 0.7, events: { hit: 0.32 }, fn: (t, P, k) => { ... } },
//   });
//   anim.play('attack', { fade: 0.1, onEvent: (name) => ..., onDone: () => ... });
//   anim.update(dt);
//
// Inside fn: t = seconds into the clip (looped clips wrap), P is the pose writer, k = normalized 0..1.
//   P.rot(joint, x, y, z)   add rotation (radians) on top of the rest pose
//   P.pos(joint, x, y, z)   add translation
//   P.scl(joint, x, y, z)   multiply scale
// An `overlay` clip (hit flinch, blink, breathe) plays additively over the base clip.

import * as THREE from 'three';

export class Animator {
  constructor(joints, clips) {
    this.joints = joints; this.clips = clips; this.names = Object.keys(joints);
    this.rest = {};
    for (const [n, j] of Object.entries(joints)) this.rest[n] = { p: j.position.clone(), q: j.quaternion.clone(), s: j.scale.clone() };
    this.cur = null; this.prev = null; this.over = null; this.speed = 1;
    this._pose = {}; this._snap = null; this.fade = 0; this.fadeT = 0;
    this._e = new THREE.Euler(); this._q = new THREE.Quaternion();
  }
  has(name) { return !!this.clips[name]; }
  get name() { return this.cur?.name; }
  get busy() { return !!this.cur && !this.cur.clip.loop && !this.cur.done; }
  play(name, { fade = 0.12, onEvent, onDone, speed = 1, restart = false } = {}) {
    const clip = this.clips[name];
    if (!clip) { console.warn('missing clip', name); return; }
    if (this.cur?.name === name && clip.loop && !restart) return;
    this._snap = this._capture();
    this.cur = { name, clip, t: 0, done: false, onEvent, onDone, fired: new Set(), speed };
    this.fade = fade; this.fadeT = 0;
  }
  overlay(name, { onEvent, onDone, speed = 1, weight = 1 } = {}) {
    const clip = this.clips[name]; if (!clip) return;
    this.over = { name, clip, t: 0, done: false, onEvent, onDone, fired: new Set(), speed, weight };
  }
  _capture() {
    const s = {};
    for (const n of this.names) { const j = this.joints[n]; s[n] = { p: j.position.clone(), q: j.quaternion.clone(), s: j.scale.clone() }; }
    return s;
  }
  _write(inst, dt) {
    const pose = {}; const P = {
      rot: (n, x = 0, y = 0, z = 0) => { const o = (pose[n] ||= { r: [0, 0, 0], p: [0, 0, 0], s: [1, 1, 1] }); o.r[0] += x; o.r[1] += y; o.r[2] += z; },
      pos: (n, x = 0, y = 0, z = 0) => { const o = (pose[n] ||= { r: [0, 0, 0], p: [0, 0, 0], s: [1, 1, 1] }); o.p[0] += x; o.p[1] += y; o.p[2] += z; },
      scl: (n, x = 1, y = x, z = x) => { const o = (pose[n] ||= { r: [0, 0, 0], p: [0, 0, 0], s: [1, 1, 1] }); o.s[0] *= x; o.s[1] *= y; o.s[2] *= z; },
    };
    const c = inst.clip; inst.t += dt * this.speed * inst.speed;
    let t = inst.t;
    if (c.loop) t = c.dur ? t % c.dur : t;
    else if (t >= c.dur) { t = c.dur; if (!inst.done) { inst.done = true; inst.onDone?.(); } }
    if (c.events && inst.onEvent) for (const [en, et] of Object.entries(c.events)) if (!inst.fired.has(en) && inst.t >= et) { inst.fired.add(en); inst.onEvent(en); }
    c.fn(t, P, c.dur ? t / c.dur : 0);
    return pose;
  }
  update(dt) {
    if (!this.cur) return;
    const base = this._write(this.cur, dt);
    const over = this.over ? this._write(this.over, dt) : null; const overW = this.over ? this.over.weight : 0;
    if (this.over?.done && this.over.t > this.over.clip.dur + 0.001) this.over = null;
    this.fadeT = Math.min(this.fade, this.fadeT + dt);
    const w = this.fade > 0 ? this.fadeT / this.fade : 1; const ew = w * w * (3 - 2 * w);
    for (const n of this.names) {
      const j = this.joints[n]; const r = this.rest[n]; const b = base[n]; const o = over?.[n];
      // target = rest + clip delta (+ overlay delta)
      const tp = r.p.clone(); const ts = r.s.clone();
      this._e.set(0, 0, 0); let rx = 0; let ry = 0; let rz = 0;
      if (b) { tp.x += b.p[0]; tp.y += b.p[1]; tp.z += b.p[2]; ts.x *= b.s[0]; ts.y *= b.s[1]; ts.z *= b.s[2]; rx += b.r[0]; ry += b.r[1]; rz += b.r[2]; }
      if (o) { const ow = overW; tp.x += o.p[0] * ow; tp.y += o.p[1] * ow; tp.z += o.p[2] * ow; ts.x *= 1 + (o.s[0] - 1) * ow; ts.y *= 1 + (o.s[1] - 1) * ow; ts.z *= 1 + (o.s[2] - 1) * ow; rx += o.r[0] * ow; ry += o.r[1] * ow; rz += o.r[2] * ow; }
      this._e.set(rx, ry, rz, 'XYZ');
      const tq = r.q.clone().multiply(this._q.setFromEuler(this._e));
      if (ew < 1 && this._snap?.[n]) {
        const s = this._snap[n];
        j.position.copy(s.p).lerp(tp, ew); j.scale.copy(s.s).lerp(ts, ew); j.quaternion.copy(s.q).slerp(tq, ew);
      } else { j.position.copy(tp); j.scale.copy(ts); j.quaternion.copy(tq); }
    }
  }
}

// Spring-damped follower for secondary motion (tails, capes, antennae, hair).
export class Spring {
  constructor(k = 60, d = 8, v = 0) { this.k = k; this.d = d; this.x = v; this.v = 0; this.target = v; }
  update(dt) { const a = -this.k * (this.x - this.target) - this.d * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; }
  kick(impulse) { this.v += impulse; }
}
export const TAU = Math.PI * 2;
export const sinT = (t, hz, ph = 0) => Math.sin((t * hz + ph) * TAU);
// 0 -> 1 -> 0 pulse over [a, b] with a smooth peak at p
export function pulse(t, a, p, b) { if (t <= a || t >= b) return 0; return t < p ? ((t - a) / (p - a)) ** 2 * (3 - 2 * ((t - a) / (p - a))) : (1 - (t - p) / (b - p)) ** 2 * (3 - 2 * (1 - (t - p) / (b - p))); }
// smooth ramp between two times
export const ramp01 = (t, a, b) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
