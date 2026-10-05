// Actor: the common body for every character and monster. A model builder fills in joints and
// meshes and a clip table; Actor supplies the animator, per-instance materials (so hit flashes and
// the ember-dissolve death never leak onto other actors), UI anchors, and promise-based playback.
//
// Conventions (see docs/GFX.md): 1 unit = 1 metre, +Y up, the actor FACES +Z, feet at y = 0.
//
//   export function create({ seed = 1, quality = 'high', ...opts } = {}) {
//     const a = new Actor({ name: 'goblin', height: 1.25, radius: 0.55 });
//     const hips = a.joint('hips', a.model, 0, 0.55, 0);
//     ...build meshes, parent them under joints...
//     a.anchor('head', headJoint, 0, 0.3, 0);          // overhead UI point (hp bar, intent icon)
//     a.anchor('chest', chestJoint, 0, 0, 0.2);        // impact point
//     a.anchor('mouth' | 'handR' | 'handL' | 'weapon' | 'feet', ...)
//     a.clips = { idle: {...}, ... };
//     return a.finalize();
//   }
import * as THREE from 'three';
import { Animator, Spring } from '../rig.js';

// Fallback chain: if an actor lacks a clip, use the next one it has.
const FALLBACK = {
  tele_strike: ['ready', 'idle'], tele_cast: ['ready', 'idle'], tele_guard: ['guard', 'ready', 'idle'], tele_charge: ['charge', 'ready', 'idle'],
  tele_howl: ['tele_cast', 'ready', 'idle'], tele_hex: ['tele_cast', 'ready', 'idle'], tele_pilfer: ['tele_strike', 'ready', 'idle'],
  tele_summon: ['tele_cast', 'ready', 'idle'], tele_mend: ['tele_cast', 'ready', 'idle'], tele_slam: ['charge', 'tele_strike', 'ready', 'idle'],
  ready: ['idle'], attack: ['idle'], attack2: ['attack', 'idle'], lunge: ['attack', 'idle'], throw: ['attack', 'idle'], cast: ['attack', 'idle'], hex: ['cast', 'attack', 'idle'],
  siphon: ['cast', 'attack', 'idle'], summon: ['cast', 'idle'], guard: ['idle'], charge: ['ready', 'idle'], slam: ['attack', 'idle'], stomp: ['slam', 'attack', 'idle'],
  howl: ['cast', 'idle'], mend: ['cast', 'idle'], hurt: [], die: ['idle'], rage: ['cast', 'idle'], victory: ['idle'], spawn: ['idle'], block: ['guard', 'idle'], pilfer: ['attack', 'idle'],
};

export class Actor {
  constructor({ name = 'actor', height = 1.8, radius = 0.5 } = {}) {
    this.name = name; this.height = height; this.radius = radius;
    this.root = new THREE.Group(); this.root.name = name;
    this.model = new THREE.Group(); this.model.name = `${name}-model`; this.root.add(this.model);
    this.joints = {}; this.anchors = {}; this.clips = {}; this.animator = null;
    this.meshes = []; this.mats = []; this.flashAmt = 0; this.flashColor = new THREE.Color(0xffffff);
    this.dissolveAmt = 0; this.dissolving = false; this.alive = true;
    this.springs = {}; this.onUpdate = null; this.t = 0; this.userData = {};
    this._uDissolve = { value: 0 }; this._uEdge = { value: new THREE.Color(0xff7a1a) };
  }
  joint(name, parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z);
    (parent || this.model).add(g); this.joints[name] = g; return g;
  }
  anchor(name, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Object3D(); o.name = `anchor-${name}`; o.position.set(x, y, z);
    (parent || this.model).add(o); this.anchors[name] = o; return o;
  }
  spring(name, k = 60, d = 8) { return (this.springs[name] ||= new Spring(k, d)); }

  // Call once the model is built. Clones materials per instance and wires up flash + dissolve.
  finalize() {
    const cloneCache = new Map();
    this.root.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.castShadow = o.castShadow !== false; o.receiveShadow = true;
      const swap = (m) => {
        if (m.userData.noActorClone) return m;
        if (!cloneCache.has(m)) {
          const c = m.clone(); c.userData = { ...m.userData, base: m };
          if (c.emissive) { c.userData.emissive0 = c.emissive.clone(); c.userData.emissiveI0 = c.emissiveIntensity; }
          this._hookDissolve(c);
          cloneCache.set(m, c); this.mats.push(c);
        }
        return cloneCache.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
      this.meshes.push(o);
    });
    this.animator = new Animator(this.joints, this.clips);
    if (this.clips.idle) this.animator.play('idle', { fade: 0 });
    this.root.updateMatrixWorld(true);
    return this;
  }
  // ember dissolve: noise-thresholded discard with a glowing edge, injected into any standard material
  _hookDissolve(m) {
    if (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial) return;
    const uD = this._uDissolve; const uE = this._uEdge;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uDissolve = uD; sh.uniforms.uEdge = uE;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vOP; uniform float uDissolve; uniform vec3 uEdge;
          float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                       mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          float dn = n3(vOP * 5.0) * 0.6 + n3(vOP * 13.0) * 0.4;
          float dline = dn - uDissolve * 1.15 + 0.08;
          if (uDissolve > 0.001 && dline < 0.0) discard;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (uDissolve > 0.001) { float edge = smoothstep(0.09, 0.0, dline); totalEmissiveRadiance += uEdge * edge * 6.0; }`);
    };
    m.customProgramCacheKey = () => 'qd-dissolve';
  }

  has(name) { return !!this.clips[name]; }
  resolveClip(name) {
    if (this.clips[name]) return name;
    for (const f of FALLBACK[name] || []) if (this.clips[f]) return f;
    return null;
  }
  // Play a base clip. Returns a promise that resolves on the clip's `hit` event if it has one
  // (so the caller can sync damage to the impact frame), else when it finishes.
  play(name, { fade = 0.12, speed = 1, onEvent, restart = false } = {}) {
    const real = this.resolveClip(name); if (!real) return Promise.resolve();
    const clip = this.clips[real];
    return new Promise((resolve) => {
      let resolved = false; const done = () => { if (!resolved) { resolved = true; resolve(); } };
      this.animator.play(real, {
        fade, speed, restart,
        onEvent: (e) => { onEvent?.(e); if (e === 'hit') done(); },
        onDone: () => { done(); },
      });
      if (clip.loop) done(); // looping clips never "finish"
    });
  }
  // Play a one-shot, then return to `back` (default idle) automatically.
  async once(name, { back = 'idle', fade = 0.1, speed = 1, onEvent } = {}) {
    const real = this.resolveClip(name); if (!real) return;
    await new Promise((resolve) => {
      this.animator.play(real, { fade, speed, onEvent, onDone: resolve });
      if (this.clips[real].loop) resolve();
    });
    if (this.alive && back) this.animator.play(this.resolveClip(back) || 'idle', { fade: 0.2 });
  }
  // Additive flinch layered over whatever is playing.
  hurt(weight = 1) { if (this.clips.hurt) this.animator.overlay('hurt', { weight }); this.flash(0xffffff, 0.9); }
  flash(color = 0xffffff, amt = 1) { this.flashColor.set(color); this.flashAmt = Math.max(this.flashAmt, amt); }
  setGlow(color, k) { // steady emissive tint (rage, charged, frozen...)
    this.glowColor = color == null ? null : new THREE.Color(color); this.glowK = k ?? 0;
  }
  async die({ dur = 1.3, color = 0xff7a1a } = {}) {
    this.alive = false; this._uEdge.value.set(color);
    const hasDie = this.resolveClip('die');
    if (hasDie) this.animator.play(hasDie, { fade: 0.08 });
    this.dissolving = true; this._dissT = -(hasDie ? Math.min(0.55, this.clips[hasDie].dur * 0.7) : 0.15); this._dissDur = dur;
    return new Promise((r) => { this._dieDone = r; });
  }
  revive() { this.alive = true; this.dissolving = false; this._uDissolve.value = 0; this.root.visible = true; this.animator.play('idle', { fade: 0 }); }
  worldAnchor(name, out = new THREE.Vector3()) {
    const a = this.anchors[name] || this.anchors.chest || this.anchors.head || this.root;
    a.updateWorldMatrix(true, false); return a.getWorldPosition(out);
  }
  // face a world point (yaw only)
  faceTo(x, z) { this.root.rotation.y = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  update(dt, t) {
    this.t += dt;
    this.animator?.update(dt);
    for (const s of Object.values(this.springs)) s.update(dt);
    this.onUpdate?.(dt, this.t);
    if (this.dissolving) {
      this._dissT += dt; const k = Math.max(0, this._dissT / this._dissDur);
      this._uDissolve.value = Math.min(1, k);
      if (k >= 1) { this.dissolving = false; this.root.visible = false; this._dieDone?.(); }
    }
    // flash + glow: drive emissive on every cloned material
    this.flashAmt = Math.max(0, this.flashAmt - dt * 4.5);
    const g = this.glowColor ? this.glowK : 0;
    if (this.flashAmt > 0.001 || g > 0 || this._wasLit) {
      for (const m of this.mats) {
        if (!m.emissive) continue;
        const e0 = m.userData.emissive0;
        m.emissive.copy(e0);
        let ei = m.userData.emissiveI0;
        if (g > 0) { m.emissive.lerp(this.glowColor, 0.6); ei = Math.max(ei, g); }
        if (this.flashAmt > 0.001) { m.emissive.lerp(this.flashColor, Math.min(1, this.flashAmt)); ei = Math.max(ei, this.flashAmt * 1.6); }
        m.emissiveIntensity = ei;
      }
      this._wasLit = this.flashAmt > 0.001 || g > 0;
    }
  }
  dispose() { this.root.traverse((o) => o.geometry?.dispose?.()); for (const m of this.mats) m.dispose(); }
}
