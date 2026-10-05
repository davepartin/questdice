// Combat VFX library: hits, magic, shields, projectiles, auras, deaths and floating numbers.
// Everything is procedural, pooled and driven by the stage clock (so it is deterministic in manual mode).
//
//   const vfx = createVfx(stage);                       // adds its meshes/particles to stage.scene
//   await vfx.slash(monsterChest, { kind: 'blade' });   // resolves at the *impact moment*
//   vfx.damageNumber(monsterHead, '12', { kind: 'crit' });
//
// Positions are THREE.Vector3, [x,y,z], an Object3D (world position) or an Actor (its chest anchor).
// See the exported function list at the bottom of createVfx for the whole API.

import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { Quads } from './vfx/quads.js';
import { vtex } from './vfx/textures.js';
import { createStrips } from './vfx/strips.js';
import { createText } from './vfx/text.js';
import * as SH from './vfx/shaders.js';

const TAU = Math.PI * 2;
const C = { red: 0xff4d4d, blue: 0x4db4ff, yellow: 0xffd23d, purple: 0xb07dff, green: 0x45e08b, gold: 0xf0b43c };

export function createVfx(stage, opts = {}) {
  const scene = stage.scene; const camera = stage.camera;
  const groundY = opts.groundY ?? 0;
  const Q = stage.quality === 'low' ? 0.45 : stage.quality === 'med' ? 0.75 : 1;
  const n = (x) => Math.max(1, Math.round(x * Q));
  let T = 0.001; // vfx clock (accumulated stage dt)
  let seedCounter = 0x9e3779b9;

  // ---------------------------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------------------------
  const _cq = new THREE.Quaternion();
  const cr = new THREE.Vector3(); const cu = new THREE.Vector3(); const cf = new THREE.Vector3();
  function camBasis() {
    camera.getWorldQuaternion(_cq);
    cr.set(1, 0, 0).applyQuaternion(_cq); cu.set(0, 1, 0).applyQuaternion(_cq); cf.set(0, 0, -1).applyQuaternion(_cq);
  }
  function toV(p, out = new THREE.Vector3()) {
    if (!p) return out.set(0, 0, 0);
    if (p.isVector3) return out.copy(p);
    if (Array.isArray(p)) return out.set(p[0], p[1], p[2]);
    if (p.worldAnchor) return p.worldAnchor('chest', out);
    if (p.isObject3D) { p.updateWorldMatrix(true, false); return p.getWorldPosition(out); }
    if (p.root) return p.root.getWorldPosition(out);
    return out.set(p.x || 0, p.y || 0, p.z || 0);
  }
  function anchorOf(target, name) {
    if (target?.worldAnchor) return target.worldAnchor(name, new THREE.Vector3());
    return toV(target);
  }
  function rngOf(o) {
    seedCounter = (Math.imul(seedCounter, 1664525) + 1013904223) >>> 0;
    const r = mulberry32(o?.seed ?? seedCounter);
    return { r, rr: (a, b) => a + (b - a) * r(), pm: (a) => (r() * 2 - 1) * a };
  }
  const _s = new THREE.Vector3();
  function randDir(R, out = _s) { // uniform on the sphere
    const z = R.r() * 2 - 1; const a = R.r() * TAU; const q = Math.sqrt(1 - z * z);
    return out.set(q * Math.cos(a), z, q * Math.sin(a));
  }
  // direction around `base` with `spread` (0 = exactly base, 1+ = nearly random). Writes into out, normalised.
  function spray(R, base, spread, out = new THREE.Vector3()) {
    randDir(R, out);
    if (!base) return out;
    out.multiplyScalar(spread).add(base).normalize();
    return out;
  }
  const hexRGB = (c) => new THREE.Color(c);
  const lerpHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  const later = (sec, fn) => new Promise((res) => { timers.push({ t: sec, fn, res }); });
  const timers = []; const fireList = [];
  const tasks = [];
  // per-frame emitter: fn(dt, k, elapsed) until elapsed >= dur
  function task(dur, fn, done) { return new Promise((res) => { tasks.push({ t: 0, dur, fn, res, done }); }); }
  function withHandle(promise, h) { return Object.assign(promise, h); }

  // ---------------------------------------------------------------------------------------------
  // shared systems
  // ---------------------------------------------------------------------------------------------
  const sys = {
    glow: new Quads({ max: 900, map: vtex('glow'), blend: 'add', depthTest: false, renderOrder: 9, name: 'vfx-glow' }),
    flare: new Quads({ max: 160, map: vtex('flare'), blend: 'add', depthTest: false, renderOrder: 11, name: 'vfx-flare' }),
    spark: new Quads({ max: 1100, map: vtex('streak'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-spark' }),
    star: new Quads({ max: 400, map: vtex('star4'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-star' }),
    ember: new Quads({ max: 700, map: vtex('dot'), blend: 'add', depthTest: true, renderOrder: 9, name: 'vfx-ember' }),
    smoke: new Quads({ max: 260, map: vtex('smoke'), blend: 'normal', depthTest: true, renderOrder: 7, name: 'vfx-smoke' }),
    chunk: new Quads({ max: 260, map: vtex('chunk'), blend: 'normal', depthTest: true, renderOrder: 8, name: 'vfx-chunk' }),
    drop: new Quads({ max: 320, map: vtex('dot'), blend: 'normal', depthTest: true, renderOrder: 8, name: 'vfx-drop' }),
    shard: new Quads({ max: 160, map: vtex('shard'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-shard' }),
    coin: new Quads({ max: 120, map: vtex('coin'), blend: 'normal', depthTest: true, renderOrder: 9, name: 'vfx-coin' }),
    cross: new Quads({ max: 120, map: vtex('cross'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-cross' }),
    diamond: new Quads({ max: 120, map: vtex('diamond'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-diamond' }),
    flame: new Quads({ max: 700, map: vtex('flame'), blend: 'add', depthTest: true, renderOrder: 9, name: 'vfx-flame' }),
    wisp: new Quads({ max: 24, map: vtex('wisp'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-wisp' }),
    ringB: new Quads({ max: 40, map: vtex('ring'), blend: 'add', depthTest: false, renderOrder: 10, name: 'vfx-ringb' }),
  };
  for (const s of Object.values(sys)) { s.object.visible = false; scene.add(s.object); }

  const strips = createStrips(scene);
  const text = createText(stage, scene);

  // ---------------------------------------------------------------------------------------------
  // lights: a tiny permanent pool (never added/removed: that would recompile every lit material)
  // ---------------------------------------------------------------------------------------------
  const lights = [];
  const LIGHTS = opts.lights ?? 3;
  for (let i = 0; i < LIGHTS; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 9, 2); l.castShadow = false; l.name = 'vfx-light'; scene.add(l);
    lights.push({ l, t: 1, dur: 0, peak: 0, att: 0.04, held: false });
  }
  function lightFlash(pos, color, peak = 50, dur = 0.25, dist = 9, att = 0.04) {
    let best = null; let bs = Infinity;
    for (const s of lights) { if (s.held) continue; const rem = s.dur - s.t; if (rem < bs) { bs = rem; best = s; } }
    if (!best) return null;
    best.l.position.copy(pos); best.l.color.set(color); best.l.distance = dist; best.t = 0; best.dur = dur; best.peak = peak * (stage.quality === 'low' ? 0.8 : 1); best.att = att; best.l.intensity = 0;
    return best;
  }
  function holdLight() {
    let best = null; let bs = Infinity;
    for (const s of lights) { if (s.held) continue; const rem = s.dur - s.t; if (rem < bs) { bs = rem; best = s; } }
    if (!best) return { set() {}, release() {} };
    best.held = true; best.t = 1; best.dur = 0;
    return {
      set(pos, color, intensity, dist = 8) { best.l.position.copy(pos); best.l.color.set(color); best.l.intensity = intensity; best.l.distance = dist; },
      release() { best.held = false; best.l.intensity = 0; },
    };
  }
  function updateLights(dt) {
    for (const s of lights) {
      if (s.held) continue;
      if (s.t >= s.dur) { if (s.l.intensity !== 0) s.l.intensity = 0; continue; }
      s.t += dt; const k = Math.min(1, s.t / s.dur);
      const f = k < s.att / s.dur ? k / (s.att / s.dur) : (1 - (k - s.att / s.dur) / (1 - s.att / s.dur)) ** 2;
      s.l.intensity = s.peak * Math.max(0, f);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // mesh pools: rings, decals, slashes, shields, glyphs, pillars, shells, rifts
  // ---------------------------------------------------------------------------------------------
  const rings = []; const ringLive = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(SH.quadGeo, SH.ringMaterial()); m.visible = false; m.frustumCulled = false; m.renderOrder = 6; scene.add(m);
    rings.push({ mesh: m, busy: false, t: 0, dur: 1, cam: false, k: 0 });
  }
  // ring({ at, color, r, dur, flat, thick, hdr, noise, r0, ease, alpha, delay })
  function ring(o) {
    const slot = rings.find((s) => !s.busy) || rings.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    const u = slot.mesh.material.uniforms; const R = o.r ?? 1;
    u.uColor.value.set(o.color ?? 0xffffff); u.uThick.value = o.thick ?? 0.08; u.uHdr.value = o.hdr ?? 1.8; u.uNoise.value = o.noise ?? 0.35; u.uR0.value = o.r0 ?? 0.04;
    u.uSeed.value = (seedCounter % 997) * 0.37; u.uEase.value = o.ease ?? 2.6; u.uAlpha.value = o.alpha ?? 1; u.uK.value = 0;
    u.uTrail.value = o.trail ?? (o.flat ? 1.5 : 0.55); u.uHold.value = o.hold ? 1 : 0; slot.manual = !!o.manual;
    slot.at = toV(o.at, slot.at || new THREE.Vector3()); slot.dur = o.dur ?? 0.5; slot.t = -(o.delay ?? 0); slot.cam = !o.flat; slot.busy = true;
    slot.mesh.scale.set(R, R, 1);
    if (o.flat) { slot.mesh.rotation.set(-Math.PI / 2, 0, 0); slot.mesh.position.set(slot.at.x, (o.y ?? groundY) + 0.03, slot.at.z); slot.mesh.renderOrder = 6; slot.mesh.material.depthTest = true; } else { slot.mesh.position.copy(slot.at); slot.mesh.material.depthTest = false; slot.mesh.renderOrder = 12; }
    slot.mesh.visible = slot.t >= 0;
    if (!ringLive.includes(slot)) ringLive.push(slot);
    return slot;
  }
  function updateRings(dt) {
    for (let i = ringLive.length - 1; i >= 0; i--) {
      const s = ringLive[i]; s.t += dt;
      if (s.t < 0) continue;
      if (s.manual) { s.mesh.visible = true; if (s.cam) s.mesh.quaternion.copy(_cq); continue; }
      if (s.t >= s.dur) { s.busy = false; s.mesh.visible = false; ringLive.splice(i, 1); continue; }
      s.mesh.visible = true; s.mesh.material.uniforms.uK.value = s.t / s.dur;
      if (s.cam) s.mesh.quaternion.copy(_cq);
    }
  }

  // ground decals (cracks, scorch)
  const decals = []; const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: vtex('cracks'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff7a2a, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.visible = false; m.renderOrder = 5; scene.add(m); decals.push({ mesh: m, busy: false, t: 0, dur: 1, size: 1, hot: new THREE.Color(), cold: new THREE.Color() });
  }
  function crackDecal(at, { size = 3, color = 0xffa040, dur = 1.8, rot } = {}) {
    const d = decals.find((x) => !x.busy) || decals[0]; const p = toV(at);
    d.busy = true; d.t = 0; d.dur = dur; d.size = size; d.hot.set(color).multiplyScalar(3); d.cold.set(0x6a0c04);
    d.mesh.position.set(p.x, groundY + 0.02, p.z); d.mesh.rotation.y = rot ?? seedCounter % 6.28; d.mesh.scale.set(size, 1, size); d.mesh.visible = true;
  }
  function updateDecals(dt) {
    for (const d of decals) {
      if (!d.busy) continue; d.t += dt; const k = d.t / d.dur;
      if (k >= 1) { d.busy = false; d.mesh.visible = false; continue; }
      d.mesh.material.color.copy(d.hot).lerp(d.cold, Math.min(1, k * 1.6)); d.mesh.material.opacity = Math.min(1, d.t / 0.04) * (1 - k * k);
      const s = d.size * (0.85 + 0.15 * Math.min(1, d.t / 0.25)); d.mesh.scale.set(s, 1, s);
    }
  }

  // slash crescents
  const GEO = {
    blade: SH.crescentGeo({ theta: 1.1, width: 0.5, power: 0.8 }),
    thin: SH.crescentGeo({ theta: 1.25, width: 0.16, power: 0.9 }),
    claw: SH.crescentGeo({ theta: 0.62, width: 0.14, power: 0.75 }),
  };
  const slashes = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(GEO.blade, SH.slashMaterial()); m.visible = false; m.frustumCulled = false; m.renderOrder = 13; scene.add(m);
    slashes.push({ mesh: m, busy: false });
  }
  const _q2 = new THREE.Quaternion(); const _zAxis = new THREE.Vector3(0, 0, 1); const _yAxis = new THREE.Vector3(0, 1, 0);
  function crescent(o) {
    const s = slashes.find((x) => !x.busy); if (!s) return;
    const u = s.mesh.material.uniforms;
    s.mesh.geometry = GEO[o.geo || 'blade'];
    u.uColor.value.set(o.color); u.uCore.value.set(o.core ?? 0xffffff); u.uHdr.value = o.hdr ?? 2.4; u.uSeed.value = o.seed ?? 0; u.uFade.value = 1; u.uGrit.value = o.grit ?? 1;
    u.uHead.value = 0; u.uTail.value = 0;
    Object.assign(s, { busy: true, t: -(o.delay ?? 0), dur: o.dur ?? 0.3, at: new THREE.Vector3().copy(o.at), ang: o.ang, tilt: o.tilt ?? 0, scale: o.size, ox: o.ox ?? 0, oy: o.oy ?? 0, sy: o.sy ?? 1, run: o.run ?? 0.17, tailAt: o.tailAt ?? 0.1 });
    s.mesh.visible = false;
  }
  function updateSlashes(dt) {
    for (const s of slashes) {
      if (!s.busy) continue; s.t += dt;
      if (s.t < 0) continue;
      if (s.t >= s.dur) { s.busy = false; s.mesh.visible = false; continue; }
      s.mesh.visible = true;
      const u = s.mesh.material.uniforms; const p = Math.min(1, s.t / s.run);
      u.uHead.value = 1.12 * (p * p * (3 - 2 * p) * 0.6 + p * 0.4);
      u.uTail.value = 1.15 * Math.pow(Math.max(0, (s.t - s.tailAt) / (s.dur - s.tailAt)), 1.5);
      u.uFade.value = 1 - Math.pow(Math.max(0, (s.t - s.dur * 0.55) / (s.dur * 0.45)), 2);
      const ca = Math.cos(s.ang); const sa = Math.sin(s.ang);
      s.mesh.position.copy(s.at).addScaledVector(cr, s.ox * ca - s.oy * sa).addScaledVector(cu, s.ox * sa + s.oy * ca);
      s.mesh.quaternion.copy(_cq); _q2.setFromAxisAngle(_zAxis, s.ang); s.mesh.quaternion.multiply(_q2);
      if (s.tilt) { _q2.setFromAxisAngle(_yAxis, s.tilt); s.mesh.quaternion.multiply(_q2); }
      s.mesh.scale.set(s.scale, s.scale * s.sy, 1);
    }
  }

  // hex shields
  const domeGeo = new THREE.SphereGeometry(1, 48, 32);
  const plateGeo = new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, 0.82);
  const shields = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(domeGeo, SH.domeMaterial()); m.visible = false; m.frustumCulled = false; m.renderOrder = 8; scene.add(m);
    shields.push({ mesh: m, busy: false, hitI: 0 });
  }
  const _inv = new THREE.Quaternion(); const _hv = new THREE.Vector3();
  function shieldHit(s, point, strength = 1) {
    const u = s.mesh.material.uniforms; const i = s.hitI = (s.hitI + 1) % 4;
    _hv.copy(point).sub(s.center).normalize();
    _inv.copy(s.mesh.quaternion).invert(); _hv.applyQuaternion(_inv);
    u.uHit.value[i].set(strength, 0, 0, T); u.uHitDir.value[i].copy(_hv);
  }
  function updateShields(dt) {
    for (const s of shields) {
      if (!s.busy) continue; s.t += dt;
      const u = s.mesh.material.uniforms; u.uTime.value = T;
      const ap = Math.min(1, s.t / 0.38); const app = 1 - (1 - ap) ** 3;
      let out = 1;
      if (s.stopping) { s.out += dt / 0.35; out = Math.max(0, 1 - s.out); if (s.out >= 1) { s.busy = false; s.mesh.visible = false; const i = shieldLive.indexOf(s); if (i >= 0) shieldLive.splice(i, 1); continue; } } else if (s.t > s.dur) { s.stopping = true; s.out = 0; }
      u.uAppear.value = app; u.uAlpha.value = out;
      const sc = s.radius * (0.82 + 0.18 * app + 0.01 * Math.sin(T * 3));
      s.mesh.scale.setScalar(sc);
      s.mesh.position.copy(s.center);
    }
  }
  const shieldLive = [];

  // pillars (light columns), shells (nova), glyphs, rifts
  const pillars = []; const shellsP = []; const glyphs = []; const rifts = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(SH.pillarGeo, SH.pillarMaterial()); m.visible = false; m.frustumCulled = false; m.renderOrder = 7; scene.add(m); pillars.push({ mesh: m, busy: false }); }
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(SH.shellGeo, SH.shellMaterial()); m.visible = false; m.frustumCulled = false; m.renderOrder = 8; scene.add(m); shellsP.push({ mesh: m, busy: false }); }
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(SH.quadGeo, SH.glyphMaterial()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 5; scene.add(m); glyphs.push({ mesh: m, busy: false }); }
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(SH.quadGeo, SH.riftMaterial()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 5; scene.add(m); rifts.push({ mesh: m, busy: false }); }
  const discs = [];
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(SH.quadGeo, SH.discMaterial()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 4; scene.add(m); discs.push({ mesh: m, busy: false }); }
  // pillar({ at, color, r, h, dur, hdr, rise })
  function pillar(o) {
    const s = pillars.find((x) => !x.busy); if (!s) return null;
    const p = toV(o.at); const u = s.mesh.material.uniforms;
    u.uColor.value.set(o.color ?? 0xffffff); u.uHdr.value = o.hdr ?? 1.6; u.uAlpha.value = o.alpha ?? 1;
    Object.assign(s, { busy: true, t: -(o.delay ?? 0), dur: o.dur ?? 1, r: o.r ?? 0.6, h: o.h ?? 2.4, x: p.x, y: o.y ?? groundY, z: p.z, grow: o.grow ?? 0.25, alpha: o.alpha ?? 1 });
    s.mesh.visible = false; return s;
  }
  function updatePillars(dt) {
    for (const s of pillars) {
      if (!s.busy) continue; s.t += dt; if (s.t < 0) continue;
      if (s.t >= s.dur) { s.busy = false; s.mesh.visible = false; continue; }
      const k = s.t / s.dur; s.mesh.visible = true;
      const up = Math.min(1, s.t / s.grow); const e = 1 - (1 - up) ** 3;
      s.mesh.position.set(s.x, s.y, s.z); s.mesh.scale.set(s.r * (0.65 + 0.35 * e) * (1 - 0.25 * k), s.h * (0.15 + 0.85 * e), s.r * (0.65 + 0.35 * e) * (1 - 0.25 * k));
      const u = s.mesh.material.uniforms; u.uTime.value = T; u.uTop.value = 1;
      u.uAlpha.value = s.alpha * Math.min(1, s.t / 0.08) * (1 - Math.max(0, (k - 0.45) / 0.55) ** 1.4);
    }
  }
  // shell({ at, color, r, dur })
  function shell(o) {
    const s = shellsP.find((x) => !x.busy); if (!s) return;
    const p = toV(o.at); const u = s.mesh.material.uniforms; u.uColor.value.set(o.color ?? 0xffffff); u.uHdr.value = o.hdr ?? 1.6;
    Object.assign(s, { busy: true, t: 0, dur: o.dur ?? 0.4, r: o.r ?? 2, x: p.x, y: p.y, z: p.z, r0: o.r0 ?? 0.2 }); s.mesh.visible = true;
  }
  function updateShells(dt) {
    for (const s of shellsP) {
      if (!s.busy) continue; s.t += dt; const k = s.t / s.dur;
      if (k >= 1) { s.busy = false; s.mesh.visible = false; continue; }
      const e = 1 - (1 - k) ** 3; const r = s.r0 + (s.r - s.r0) * e;
      s.mesh.position.set(s.x, s.y, s.z); s.mesh.scale.setScalar(r);
      const u = s.mesh.material.uniforms; u.uTime.value = T; u.uAlpha.value = (1 - k) ** 1.5;
    }
  }

  // overlay (screen-edge pulses) lives on the camera
  const overlay = new THREE.Mesh(SH.quadGeo, SH.overlayMaterial()); overlay.renderOrder = 150; overlay.visible = false; overlay.frustumCulled = false; camera.add(overlay);
  const ovReq = { amt: 0, color: new THREE.Color() };
  function vig(color, amt) { if (amt > ovReq.amt) { ovReq.amt = amt; ovReq.color.set(color); } }
  const pulses = [];
  function updateOverlay() {
    const d = 0.6; const hh = Math.tan((camera.fov * Math.PI) / 360) * d; overlay.scale.set(hh * camera.aspect, hh, 1); overlay.position.set(0, 0, -d);
    for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; p.t += 0; }
    const u = overlay.material.uniforms;
    if (ovReq.amt > 0.002) { u.uColor.value.copy(ovReq.color); u.uAmt.value = ovReq.amt; overlay.visible = true; } else overlay.visible = false;
    ovReq.amt = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // emit helpers
  // ---------------------------------------------------------------------------------------------
  const ZERO = new THREE.Vector3();
  function flare(p, { color = 0xffffff, size = 1, life = 0.14, hdr = 3, rot, aspect = 1, R, streak = true } = {}) {
    const r0 = rot ?? (R ? R.r() * TAU : 0);
    sys.flare.emit({ pos: p, life, size: size * 0.5, sizeEnd: size * 0.75, color, hdr: hdr * 0.55, hdrEnd: hdr * 0.2, alpha: 1, alphaEnd: 0, rot: r0, aspect, fade: 0.5, grow: 0.4 });
    if (streak && aspect === 1) { // soft anamorphic cross streaks (squeezed glow), what makes a flash read as a flash
      sys.glow.emit({ pos: p, life: life * 1.2, size: size * 3.4, sizeEnd: size * 4.6, color, hdr: hdr * 0.55, hdrEnd: 0.2, alpha: 0.9, alphaEnd: 0, rot: r0, aspect: 0.1, fade: 0.55, grow: 0.5 });
      sys.glow.emit({ pos: p, life: life, size: size * 2.0, sizeEnd: size * 2.6, color: 0xffffff, hdr: hdr * 0.4, hdrEnd: 0.2, alpha: 0.8, alphaEnd: 0, rot: r0 + 1.5708, aspect: 0.12, fade: 0.55, grow: 0.5 });
    }
  }
  function glowPop(p, color, size, life = 0.22, alpha = 0.7, hdr = 1.5) {
    sys.glow.emit({ pos: p, life, size: size * 0.5, sizeEnd: size, color, hdr, alpha, alphaEnd: 0, fade: 0.7, grow: 0.5 });
  }
  // sparks: stretched streaks. dirV biases the fan, spread in 0..2
  function sparks(R, p, count, { color = 0xfff0c0, colorEnd = 0xff6a20, speed = [4, 12], dirV = null, spread = 2, life = [0.25, 0.55], size = 0.06, grav = -9, stretch = 0.07, drag = 1.6, hdr = 2.4, floor } = {}) {
    for (let i = 0; i < count; i++) {
      const d = spray(R, dirV, spread); const sp = R.rr(speed[0], speed[1]);
      sys.spark.emit({ pos: p, vel: [d.x * sp, d.y * sp, d.z * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.7, 1.3), color, colorEnd, hdr, hdrEnd: hdr * 0.4, alpha: 1, alphaEnd: 0, gravity: grav, drag, stretch, fade: 1.8, mode: 'streak', floor });
    }
  }
  function embers(R, p, count, { color = 0xffa040, colorEnd = 0xff3010, speed = [0.5, 3], dirV = null, spread = 2, life = [0.6, 1.4], size = 0.05, grav = 1.2, drag = 0.8, turb = 1.5, hdr = 2.2 } = {}) {
    for (let i = 0; i < count; i++) {
      const d = spray(R, dirV, spread); const sp = R.rr(speed[0], speed[1]);
      sys.ember.emit({ pos: p, vel: [d.x * sp, d.y * sp, d.z * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.6, 1.4), sizeEnd: size * 0.2, color, colorEnd, hdr, alpha: 1, alphaEnd: 0, gravity: grav, drag, turbulence: turb, fade: 1.5 });
    }
  }
  function smokePuffs(R, p, count, { color = 0x6a645a, spread = 0.4, speed = [0.2, 1.2], size = 0.5, grow = 2.4, life = [0.7, 1.3], rise = 0.5, alpha = 0.45, dirV = null, drag = 1.8, spin = 0.5, flat = false } = {}) {
    for (let i = 0; i < count; i++) {
      const d = spray(R, dirV, 1.2); const sp = R.rr(speed[0], speed[1]); if (flat) d.y = Math.abs(d.y) * 0.2;
      sys.smoke.emit({ pos: [p.x + R.pm(spread), p.y + R.pm(spread * 0.4), p.z + R.pm(spread)], vel: [d.x * sp, d.y * sp + rise, d.z * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.7, 1.2), sizeEnd: size * grow, color, alpha, alphaEnd: 0, fadeIn: 0.12, fade: 1.2, rot: R.r() * TAU, spin: R.pm(spin), drag });
    }
  }
  function debris(R, p, count, { color = 0x8a8478, speed = [3, 8], up = 3, size = 0.1, life = [0.9, 1.5], dirV = null, spread = 1.4 } = {}) {
    for (let i = 0; i < count; i++) {
      const d = spray(R, dirV, spread); const sp = R.rr(speed[0], speed[1]);
      sys.chunk.emit({ pos: p, vel: [d.x * sp, Math.abs(d.y) * sp * 0.6 + up * R.r(), d.z * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.6, 1.5), sizeEnd: size * 0.8, color, alpha: 1, alphaEnd: 0, fade: 5, gravity: -17, drag: 0.4, rot: R.r() * TAU, spin: R.pm(14), floor: groundY + 0.03, bounce: 0.32 });
    }
  }
  function droplets(R, p, count, { color = 0x8a0c0c, colorEnd = 0x2a0404, speed = [2.5, 7], dirV = null, spread = 1.1, size = 0.07, life = [0.5, 0.9] } = {}) {
    for (let i = 0; i < count; i++) {
      const d = spray(R, dirV, spread); const sp = R.rr(speed[0], speed[1]);
      sys.drop.emit({ pos: p, vel: [d.x * sp, d.y * sp + 1, d.z * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.5, 1.4), sizeEnd: size * 0.6, color, colorEnd, alpha: 1, alphaEnd: 0, fade: 4, gravity: -16, drag: 0.7, floor: groundY + 0.02, bounce: 0.1 });
    }
  }
  // the dust ring kicked up by a heavy hit/step, on the ground around (x,z)
  function dustRing(R, p, count, { r = 1, color = 0x8b8272, size = 0.5, speed = 2.4, life = [0.7, 1.2], alpha = 0.4 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + R.pm(0.3); const sp = speed * R.rr(0.6, 1.2);
      sys.smoke.emit({ pos: [p.x + Math.cos(a) * r * 0.25, groundY + 0.12, p.z + Math.sin(a) * r * 0.25], vel: [Math.cos(a) * sp, R.rr(0.1, 0.5), Math.sin(a) * sp], life: R.rr(life[0], life[1]), size: size * R.rr(0.7, 1.2), sizeEnd: size * 2.6, color, alpha, alphaEnd: 0, fadeIn: 0.1, fade: 1.1, rot: R.r() * TAU, spin: R.pm(0.6), drag: 2.4 });
    }
  }
  const shake = (a) => stage.shake?.(Math.min(1.4, a));

  // ---------------------------------------------------------------------------------------------
  // IMPACT: layered burst per material
  // ---------------------------------------------------------------------------------------------
  const _d = new THREE.Vector3(); const _p = new THREE.Vector3();
  // ---------------------------------------------------------------------------------------------
  // hit feel: white emissive flash on the struck actor, element-coloured burst, hit-stop, chromatic punch
  // ---------------------------------------------------------------------------------------------
  const ELEMENT = { fire: 0xff7a1a, ice: 0x8fe8ff, poison: 0x7ad03a, holy: 0xffe9a0, arcane: 0xb07dff, lightning: 0x9fc8ff, blood: 0xc01818, shadow: 0x7a3dff };
  const elementColor = (o) => (o && o.element ? ELEMENT[o.element] : undefined);
  const vfxOpts = { hitStop: opts.hitStop ?? true, chroma: opts.chroma ?? true };
  const hitTarget = (t, delay = 0, color = 0xffffff) => { if (t && typeof t.flash === 'function') later(delay).then(() => t.flash(color, 0.95)); };
  // the whole stage freezes for `ms` of wall-clock time (real-time only; manual mode never freezes)
  function hitStop(ms) {
    if (!vfxOpts.hitStop || stage.manual || stage.frozen || ms < 8) return;
    stage.frozen = true; setTimeout(() => { stage.frozen = false; }, ms);
  }
  let punch = 0; let baseAb = null;
  function chromaPunch(a) { if (vfxOpts.chroma && stage.post?.uniforms?.uAberration) punch = Math.max(punch, Math.min(1, a)); }
  function updatePunch(dt) {
    const u = stage.post?.uniforms?.uAberration; if (!u) return;
    if (punch <= 0.002) { if (baseAb !== null) { u.value = baseAb; baseAb = null; } punch = 0; return; }
    if (baseAb === null) baseAb = u.value;
    u.value = baseAb + punch * 0.0075; punch *= Math.exp(-dt * 10);
  }
  function impactFeel(kind, pw) {
    const heavy = { blunt: 1, fire: 1, stone: 0.7, pierce: 0.6, steel: 0.5, flesh: 0.5, claw: 0.5, magic: 0.4, shield: 0.3 }[kind] ?? 0.4;
    chromaPunch(heavy * Math.min(1.3, pw) * 0.9);
    if (kind === 'blunt') hitStop(70 + 20 * Math.min(1, pw - 1)); else if (kind === 'fire') hitStop(60); else if (pw >= 1.05 && (kind === 'flesh' || kind === 'steel' || kind === 'claw' || kind === 'pierce')) hitStop(45);
  }
  // extra element-coloured sparkle burst on top of the base hit
  function elementBurst(p, color, pw, R) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n(10 * pw); i++) {
      const d = randDir(R, _d); const sp = R.rr(2, 6);
      sys.star.emit({ pos: p, vel: [d.x * sp, d.y * sp + 0.8, d.z * sp], life: R.rr(0.4, 0.8), size: 0.2 * R.rr(0.6, 1.3), sizeEnd: 0.03, color: c, hdr: 2.4, alpha: 1, alphaEnd: 0, drag: 2, rot: R.r() * TAU, spin: R.pm(6), fade: 1.8 });
    }
    sparks(R, p, n(12 * pw), { color: lerpHex(color, 0xffffff, 0.4), colorEnd: color, speed: [3, 9], spread: 2, size: 0.05, life: [0.25, 0.55], grav: -3 });
    ring({ at: p, color, r: 1.1 * pw, dur: 0.28, thick: 0.05, hdr: 2.2, noise: 0.2 });
    lightFlash(p, color, 30 * pw, 0.25, 6);
  }

  function burst(kind, p, power, o, R) {
    camBasis();
    impactFeel(kind, power);
    const pw = power; const dirV = o.dirV || null;
    const onGround = p.y < 0.45;
    switch (kind) {
      case 'flesh': {
        const c = o.color ?? 0xff5a3a;
        flare(p, { color: lerpHex(c, 0xffffff, 0.55), size: 0.8 * pw, life: 0.09, hdr: 1.9, R });
        glowPop(p, c, 0.8 * pw, 0.14, 0.2);
        droplets(R, p, n(18 * pw), { color: o.blood ?? 0x9a0e0e, colorEnd: 0x2a0404, dirV, spread: 1.0, size: 0.075 });
        droplets(R, p, n(6 * pw), { color: o.blood ?? 0xc01818, colorEnd: 0x400606, speed: [5, 10], dirV, spread: 0.6, size: 0.05 });
        sparks(R, p, n(10 * pw), { color: 0xffc080, colorEnd: 0xff3a10, speed: [3, 9], dirV, spread: 1.2, size: 0.032 });
        smokePuffs(R, p, n(2 * pw), { color: 0x6a2a20, size: 0.45, grow: 2.2, life: [0.5, 0.8], alpha: 0.32, rise: 0.3 });
        ring({ at: p, color: c, r: 0.6 * pw, dur: 0.18, thick: 0.06, noise: 0.5, alpha: 0.6, hdr: 1.4 });
        lightFlash(p, c, 24 * pw, 0.2);
        shake(0.2 + 0.12 * pw);
        break;
      }
      case 'steel': {
        const c = o.color ?? 0xffe9b0;
        flare(p, { color: 0xfff6dc, size: 1.0 * pw, life: 0.09, hdr: 2.2, R });
        flare(p, { color: 0xffd890, size: 0.8 * pw, life: 0.09, hdr: 2.2, rot: R.r() * TAU, streak: false });
        glowPop(p, 0xffb050, 0.7 * pw, 0.12, 0.25);
        sparks(R, p, n(34 * pw), { color: 0xfff4d0, colorEnd: 0xff7a20, speed: [5, 15], dirV, spread: 1.8, size: 0.055, life: [0.28, 0.6], hdr: 2.8 });
        sparks(R, p, n(8 * pw), { color: 0xffffff, colorEnd: 0xffb050, speed: [9, 18], dirV, spread: 0.9, size: 0.03, life: [0.15, 0.3], stretch: 0.09 });
        embers(R, p, n(8 * pw), { speed: [0.6, 3], life: [0.5, 1.1], size: 0.04 });
        ring({ at: p, color: 0xfff0c8, r: 0.95 * pw, dur: 0.2, thick: 0.035, noise: 0.1, hdr: 2.2 });
        lightFlash(p, 0xffc070, 32 * pw, 0.18, 6);
        shake(0.24 + 0.1 * pw);
        break;
      }
      case 'stone': {
        flare(p, { color: 0xffe0b0, size: 1.4 * pw, life: 0.14, hdr: 2.6, R });
        glowPop(p, 0xffa050, 1.6 * pw, 0.2, 0.4);
        debris(R, p, n(14 * pw), { color: 0x8a8478, dirV, size: 0.11 });
        smokePuffs(R, p, n(6 * pw), { color: 0x8b8272, size: 0.6, grow: 2.6, life: [0.9, 1.5], alpha: 0.4, spread: 0.3, rise: 0.4 });
        sparks(R, p, n(14 * pw), { color: 0xffe0a0, colorEnd: 0xff6a20, speed: [3, 10], dirV, spread: 1.4, size: 0.03 });
        if (onGround) ring({ at: p, flat: true, color: 0xd8c8a8, r: 1.6 * pw, dur: 0.5, thick: 0.1, hdr: 1.2, noise: 0.6 });
        ring({ at: p, color: 0xffe8c8, r: 0.9 * pw, dur: 0.24, thick: 0.08 });
        lightFlash(p, 0xffb060, 55 * pw, 0.24);
        shake(0.35 + 0.15 * pw);
        break;
      }
      case 'shield': {
        const c = o.color ?? C.blue;
        flare(p, { color: 0xd8f2ff, size: 1.5 * pw, life: 0.16, hdr: 3, R });
        glowPop(p, c, 1.4 * pw, 0.24, 0.45, 1.8);
        sparks(R, p, n(18 * pw), { color: 0xcfeaff, colorEnd: c, speed: [3, 9], dirV, spread: 1.6, size: 0.035, life: [0.25, 0.5], grav: -5 });
        for (let i = 0; i < n(7 * pw); i++) { // glass-like hex shards
          const d = spray(R, dirV, 1.6); const sp = R.rr(1.5, 4.5);
          sys.shard.emit({ pos: p, vel: [d.x * sp, d.y * sp, d.z * sp], life: R.rr(0.3, 0.6), size: 0.18 * R.rr(0.6, 1.2), sizeEnd: 0.05, color: c, hdr: 2, alpha: 1, alphaEnd: 0, drag: 2.5, rot: R.r() * TAU, spin: R.pm(10), fade: 2 });
        }
        ring({ at: p, color: c, r: 1.1 * pw, dur: 0.3, thick: 0.07, hdr: 2.4, noise: 0.2 });
        lightFlash(p, c, 32 * pw, 0.24, 6);
        shake(0.2 + 0.08 * pw);
        // flare any shield that is up around here
        for (const s of shieldLive) if (s.center.distanceTo(p) < s.radius * 1.5) { _hv.copy(p); shieldHit(s, p, Math.min(1.4, 0.7 + 0.5 * pw)); }
        break;
      }
      case 'magic': {
        const c = o.color ?? C.yellow;
        flare(p, { color: lerpHex(c, 0xffffff, 0.6), size: 1.3 * pw, life: 0.15, hdr: 3, R });
        glowPop(p, c, 1.6 * pw, 0.3, 0.45, 1.6);
        for (let i = 0; i < n(12 * pw); i++) {
          const d = randDir(R, _d); const sp = R.rr(1, 3.8);
          sys.star.emit({ pos: p, vel: [d.x * sp, d.y * sp + 0.6, d.z * sp], life: R.rr(0.5, 1.0), size: 0.22 * R.rr(0.6, 1.3), sizeEnd: 0.04, color: c, hdr: 2.6, alpha: 1, alphaEnd: 0, drag: 1.8, rot: R.r() * TAU, spin: R.pm(6), fade: 1.8 });
        }
        sparks(R, p, n(16 * pw), { color: lerpHex(c, 0xffffff, 0.5), colorEnd: c, speed: [3, 9], spread: 2, size: 0.03, grav: -2, life: [0.3, 0.7] });
        ring({ at: p, color: c, r: 1.3 * pw, dur: 0.38, thick: 0.06, hdr: 2.4, noise: 0.15 });
        ring({ at: p, color: 0xffffff, r: 0.7 * pw, dur: 0.22, thick: 0.05, hdr: 2, noise: 0, delay: 0.03 });
        lightFlash(p, c, 36 * pw, 0.35, 6);
        shake(0.2 + 0.1 * pw);
        break;
      }
      case 'pierce': {
        const c = o.color ?? C.purple;
        const ax = dirV ? Math.atan2(cu.dot(dirV), cr.dot(dirV)) : -0.5; // lance axis on screen
        flare(p, { color: 0xf2e6ff, size: 2.1 * pw, life: 0.2, hdr: 3.2, R });
        sys.flare.emit({ pos: p, life: 0.22, size: 4.2 * pw, sizeEnd: 5.4 * pw, color: c, hdr: 2.4, alpha: 1, alphaEnd: 0, rot: ax, aspect: 0.16, fade: 0.6 });
        sys.flare.emit({ pos: p, life: 0.16, size: 3 * pw, sizeEnd: 3.6 * pw, color: 0xffffff, hdr: 2.2, alpha: 1, alphaEnd: 0, rot: ax, aspect: 0.07, fade: 0.6 });
        glowPop(p, c, 1.5 * pw, 0.24, 0.45, 1.8);
        for (let i = 0; i < n(9 * pw); i++) { // shards along and across the lance axis
          const a = ax + (i % 2 ? 0 : Math.PI) + R.pm(0.35); const sp = R.rr(4, 11);
          const vx = (cr.x * Math.cos(a) + cu.x * Math.sin(a)) * sp; const vy = (cr.y * Math.cos(a) + cu.y * Math.sin(a)) * sp; const vz = (cr.z * Math.cos(a) + cu.z * Math.sin(a)) * sp;
          sys.shard.emit({ pos: p, vel: [vx, vy, vz], life: R.rr(0.25, 0.5), size: 0.34 * R.rr(0.6, 1.2), sizeEnd: 0.04, color: i % 3 ? c : 0xf2e6ff, hdr: 2.4, alpha: 1, alphaEnd: 0, drag: 3, rot: a + Math.PI / 2, fade: 1.5 });
        }
        sparks(R, p, n(22 * pw), { color: 0xe6d4ff, colorEnd: c, speed: [4, 13], dirV, spread: 1.7, size: 0.034, grav: -4, life: [0.25, 0.6], hdr: 2.6 });
        ring({ at: p, color: c, r: 1.2 * pw, dur: 0.3, thick: 0.06, hdr: 2.6, noise: 0.2 });
        lightFlash(p, c, 36 * pw, 0.28, 6);
        shake(0.26 + 0.1 * pw);
        break;
      }
      case 'blunt': {
        const c = o.color ?? 0xffb060;
        flare(p, { color: 0xfff0d0, size: 1.5 * pw, life: 0.14, hdr: 3.0, R });
        // speed lines in the camera plane
        for (let i = 0; i < n(26 * pw); i++) {
          const a = R.r() * TAU; const sp = R.rr(7, 17);
          const vx = (cr.x * Math.cos(a) + cu.x * Math.sin(a)) * sp; const vy = (cr.y * Math.cos(a) + cu.y * Math.sin(a)) * sp; const vz = (cr.z * Math.cos(a) + cu.z * Math.sin(a)) * sp;
          sys.spark.emit({ pos: p, vel: [vx, vy, vz], life: R.rr(0.14, 0.3), size: 0.07 * R.rr(0.6, 1.3), color: 0xffffff, colorEnd: c, hdr: 2.6, alpha: 1, alphaEnd: 0, drag: 3.6, stretch: 0.075, fade: 1.5, mode: 'streak' });
        }
        sparks(R, p, n(16 * pw), { color: 0xffe0a0, colorEnd: 0xff5a10, speed: [3, 10], dirV, spread: 1.6, size: 0.034 });
        debris(R, p, n(16 * pw), { color: 0x9a9488, dirV, size: 0.12, speed: [3, 9] });
        smokePuffs(R, p, n(6 * pw), { color: 0x8b8272, size: 0.7, grow: 2.8, life: [0.9, 1.5], alpha: 0.42, spread: 0.3, rise: 0.4 });
        dustRing(R, onGround ? p : _p.set(p.x, groundY, p.z), n(12 * pw), { r: 1.2, size: 0.55, speed: 2.8 });
        ring({ at: p, flat: true, color: 0xffd8a0, r: 2.6 * pw, dur: 0.55, thick: 0.1, hdr: 1.6, noise: 0.6, y: groundY });
        ring({ at: p, color: 0xfff0d0, r: 1.3 * pw, dur: 0.22, thick: 0.05, hdr: 2.2, noise: 0.3 });
        crackDecal(_p.set(p.x, 0, p.z), { size: 2.4 * pw + 0.6, color: 0xff8a30 });
        lightFlash(p, c, 60 * pw, 0.28, 8);
        shake(0.75 + 0.2 * pw);
        stage.flash?.(0xfff0d8, 0.05 * Math.min(1.5, pw));
        break;
      }
      case 'claw': {
        const c = o.color ?? 0xff3a30;
        flare(p, { color: 0xffd0c8, size: 0.8 * pw, life: 0.09, hdr: 1.9, R });
        glowPop(p, c, 0.8 * pw, 0.14, 0.2);
        droplets(R, p, n(22 * pw), { color: o.blood ?? 0xa01010, colorEnd: 0x300404, dirV, spread: 1.0, size: 0.08 });
        sparks(R, p, n(12 * pw), { color: 0xff8a70, colorEnd: 0xff2a10, speed: [3, 9], dirV, spread: 1.2, size: 0.03 });
        smokePuffs(R, p, n(2 * pw), { color: 0x6a2a20, size: 0.45, grow: 2, life: [0.5, 0.8], alpha: 0.3 });
        ring({ at: p, color: c, r: 0.6 * pw, dur: 0.2, thick: 0.06, noise: 0.5, alpha: 0.6, hdr: 1.4 });
        lightFlash(p, c, 28 * pw, 0.22, 6);
        shake(0.25 + 0.12 * pw);
        break;
      }
      case 'fire': {
        explode(p, pw, R, o);
        break;
      }
      default: burst('flesh', p, power, o, R);
    }
  }

  function impact(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const kind = o.kind || 'flesh'; const power = o.power ?? 1;
    const dirV = o.dir ? toV(o.dir).normalize() : null; const elc = elementColor(o);
    burst(kind, p, power, { ...o, color: elc ?? o.color, dirV }, R); if (elc) elementBurst(p, elc, power, R);
    hitTarget(at, 0);
    return later(0.02);
  }

  // layered flame tongue: red outer, orange body, white-yellow core (same texture, three tints)
  function flameTongue(R, p, { scale = 1, vel = [0, 1.2, 0], life = 0.7, color } = {}) {
    const L = [[1.0, color ?? 0xff3a0a, 0xa01000, 0.55, 1.5], [0.72, 0xff8a1a, 0xff3a0a, 0.8, 2.0], [0.42, 0xffe08a, 0xff9a30, 0.95, 2.6]];
    const rot = R.pm(0.18);
    for (const [k, c0, c1, al, hdr] of L) sys.flame.emit({ pos: p, vel: [vel[0] * (1.2 - k * 0.2), vel[1], vel[2] * (1.2 - k * 0.2)], life: life * (0.75 + 0.25 * k), size: 0.9 * scale * k, sizeEnd: 0.45 * scale * k, aspect: 1.9, color: c0, colorEnd: c1, hdr, alpha: al, alphaEnd: 0, fade: 1.4, grow: 0.7, rot: rot + R.pm(0.08), turbulence: 1.4, drag: 0.6 });
  }
  const flames = [];
  // persistent fire: vfx.flame(pos, { scale, color, sparks, light }) -> { move(pos), set(scale), stop() }
  function flame(at, o = {}) {
    const R = rngOf(o); const pos = toV(at); const h = { pos, scale: o.scale ?? 1, alive: true, acc: 0, color: o.color, hold: o.light ? holdLight() : null, t: 0 };
    h.move = (a) => { toV(a, h.pos); return h; }; h.set = (s_) => { h.scale = s_; return h; };
    h.stop = () => { h.alive = false; h.hold?.release(); const i = flames.indexOf(h); if (i >= 0) flames.splice(i, 1); };
    h.upd = (dt) => {
      h.t += dt; h.acc += dt * 26 * Q * Math.max(0.4, h.scale);
      while (h.acc >= 1) { h.acc -= 1; const sc = h.scale;
        flameTongue(R, [h.pos.x + R.pm(0.18 * sc), h.pos.y, h.pos.z + R.pm(0.18 * sc)], { scale: sc * R.rr(0.7, 1.15), vel: [R.pm(0.25), 0.9 + R.r() * 0.9, R.pm(0.25)], life: R.rr(0.55, 0.95), color: h.color });
        if (R.r() < 0.22) sys.ember.emit({ pos: [h.pos.x + R.pm(0.2 * sc), h.pos.y + 0.3 * sc, h.pos.z + R.pm(0.2 * sc)], vel: [R.pm(0.5), R.rr(1, 2.6), R.pm(0.5)], life: R.rr(0.9, 1.8), size: R.rr(0.03, 0.06), sizeEnd: 0.01, color: 0xffa040, colorEnd: 0xff3010, hdr: 2.2, alpha: 1, alphaEnd: 0, turbulence: 1.4, fade: 1.5 });
        if (R.r() < 0.05) sys.smoke.emit({ pos: [h.pos.x, h.pos.y + 1.1 * sc, h.pos.z], vel: [R.pm(0.2), 0.6, R.pm(0.2)], life: 1.6, size: 0.3 * sc, sizeEnd: 0.9 * sc, color: 0x3a3430, alpha: 0.25, alphaEnd: 0, fadeIn: 0.2, rot: R.r() * TAU });
      }
      h.hold?.set(_p.set(h.pos.x, h.pos.y + 0.7 * h.scale, h.pos.z), 0xff8a30, (14 + Math.sin(h.t * 23) * 3 + Math.sin(h.t * 37) * 2) * h.scale, 7);
      return true;
    };
    flames.push(h); return h;
  }
  function updateFlames(dt) { for (const f of flames) f.upd(dt); }
  // ambient layers per place (names as in the quest data)
  const PLACE_AMBIENT = [
    [/orchard/i, [['embers', 0.8], ['ash', 0.7]]], [/wolfwood/i, [['leaves', 0.8], ['dust', 0.7]]], [/hollow/i, [['ash', 1]]],
    [/ashfall|camp/i, [['embers', 1]]], [/gallows/i, [['embers', 1.5], ['ash', 1.4]]], [/ford/i, [['fireflies', 1], ['dust', 0.4]]],
    [/bridge/i, [['dust', 0.9], ['embers', 0.4]]], [/raven/i, [['dust', 0.8], ['fireflies', 0.5]]],
  ];
  function ambientFor(place, o = {}) {
    api.ambient(null);
    const hit = PLACE_AMBIENT.find(([re]) => re.test(String(place || '')));
    const layers = hit ? hit[1] : [['dust', 0.6]];
    const hs = layers.map(([k, i]) => api.ambient(k, { intensity: i * (o.intensity ?? 1) }));
    return { stop() { hs.forEach((h) => h?.stop()); }, layers: layers.map((l) => l[0]) };
  }

  // big fiery explosion (bomb, fireball)
  function explode(p, pw, R, o = {}) {
    const hot = o.color ?? 0xff8a2a;
    flare(p, { color: 0xfff2d0, size: 4.2 * pw, life: 0.22, hdr: 3.6, R });
    flare(p, { color: hot, size: 2.6 * pw, life: 0.3, hdr: 2.6, R });
    shell({ at: p, color: hot, r: 1.9 * pw, dur: 0.38, hdr: 2.2 });
    for (let i = 0; i < n(16); i++) { // rolling fireball billows
      const d = randDir(R, _d); const sp = R.rr(0.8, 3.6) * pw;
      sys.glow.emit({ pos: [p.x + d.x * 0.15, p.y + d.y * 0.15, p.z + d.z * 0.15], vel: [d.x * sp, Math.abs(d.y) * sp * 0.6 + 0.6, d.z * sp], life: R.rr(0.4, 0.7), size: 0.5 * pw * R.rr(0.7, 1.2), sizeEnd: 1.2 * pw, color: 0xffb050, colorEnd: 0xff3a08, hdr: 1.6, alpha: 0.5, alphaEnd: 0, drag: 2.2, fade: 1.3, grow: 0.5 });
      flameTongue(R, [p.x + d.x * 0.3, Math.max(groundY + 0.1, p.y + d.y * 0.2), p.z + d.z * 0.3], { scale: 1.5 * pw * R.rr(0.8, 1.3), vel: [d.x * sp * 0.5, 1.4 + Math.abs(d.y) * sp * 0.5, d.z * sp * 0.5], life: R.rr(0.5, 0.9) });
    }
    smokePuffs(R, _p.set(p.x, p.y + 0.3, p.z), n(9), { color: 0x2a2622, size: 0.9 * pw, grow: 2.8, life: [1.1, 1.8], alpha: 0.6, spread: 0.5 * pw, rise: 1.0, speed: [0.3, 1.6] });
    sparks(R, p, n(40), { color: 0xfff0c0, colorEnd: 0xff4a10, speed: [6, 18], spread: 2, size: 0.045, life: [0.4, 0.9], grav: -9, hdr: 2.8 });
    embers(R, p, n(34), { speed: [1, 6], life: [0.8, 1.8], size: 0.06, grav: 0.8 });
    debris(R, p, n(8), { color: 0x3a3028, size: 0.13, speed: [4, 9] });
    ring({ at: p, flat: true, color: hot, r: 3.4 * pw, dur: 0.6, thick: 0.1, hdr: 2, noise: 0.7, y: groundY });
    ring({ at: p, color: 0xffe0b0, r: 2.4 * pw, dur: 0.3, thick: 0.07, hdr: 2.6, noise: 0.3 });
    dustRing(R, p.y < 1 ? p : _p.set(p.x, groundY, p.z), n(12), { r: 1.6, size: 0.7, speed: 3.2, color: 0x6a5e50, alpha: 0.45 });
    lightFlash(p, hot, 220 * pw, 0.55, 14, 0.02);
    shake(0.85 * Math.min(1.4, pw)); stage.flash?.(0xffa860, 0.22 * Math.min(1.4, pw));
  }

  // ---------------------------------------------------------------------------------------------
  // SLASH
  // ---------------------------------------------------------------------------------------------
  function slashAngle(o, at, R, kind) {
    camBasis();
    if (typeof o.dir === 'number') return o.dir;
    const d = o.dir ? toV(o.dir) : (o.from ? toV(o.from).sub(at).multiplyScalar(-1) : null);
    if (d && d.lengthSq() > 1e-6) return Math.atan2(cu.dot(d), cr.dot(d));
    if (kind === 'claw') return -Math.PI + 0.75 + R.pm(0.25); // monsters rake toward the hero, left and down
    return -0.62 + R.pm(0.22);
  }
  function slash(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const kind = o.kind || 'blade'; const size = o.size ?? 1;
    const ang = slashAngle(o, p, R, kind);
    camBasis();
    const dirV = new THREE.Vector3().addScaledVector(cr, Math.cos(ang)).addScaledVector(cu, Math.sin(ang)); // travel direction in the world
    const tilt = o.tilt ?? R.pm(0.25); const elc = elementColor(o);
    if (kind === 'blunt') {
      // anticipation tick then the smash
      const c = elc ?? o.color ?? 0xffb060; hitTarget(at, 0.05);
      return later(0.05).then(() => { burst('blunt', p, size, { color: c, dirV: new THREE.Vector3(0, 1, 0.3).normalize() }, R); if (elc) elementBurst(p, elc, size, R); return later(0.02); });
    }
    if (kind === 'claw') {
      const c = elc ?? o.color ?? 0xff3a30; hitTarget(at, 0.075);
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 0.34 * size;
        crescent({ at: p, ang, size: 1.6 * size * (1 - Math.abs(i - 1) * 0.08), sy: 1.3, geo: 'claw', color: c, core: 0xffe0d8, hdr: 1.9, ox: 0, oy: off, delay: i * 0.025, dur: 0.3, run: 0.12, tailAt: 0.08, seed: R.r() * 10, tilt, grit: 0.7 });
      }
      later(0.075).then(() => { burst('claw', p, 0.9 * size, { color: c, dirV, blood: o.blood }, R); if (elc) elementBurst(p, elc, 0.9 * size, R); });
      return later(0.09);
    }
    // blade
    const c = elc ?? o.color ?? 0xff5a3c; hitTarget(at, 0.085);
    crescent({ at: p, ang, size: 1.25 * size, geo: 'blade', color: c, core: 0xfff2e6, hdr: 2.1, dur: 0.34, seed: R.r() * 10, tilt });
    crescent({ at: p, ang, size: 1.5 * size, sy: 1.05, geo: 'thin', color: 0xffffff, core: 0xffffff, hdr: 1.25, delay: 0.015, dur: 0.3, run: 0.15, tailAt: 0.08, seed: R.r() * 10, tilt, grit: 0.5 });
    // sparks scraped off along the cut
    later(0.05).then(() => {
      camBasis();
      for (let i = 0; i < n(16); i++) {
        const f = R.rr(-0.55, 0.55) * size; const a = ang;
        const pos = [p.x + (cr.x * Math.cos(a) + cu.x * Math.sin(a)) * f, p.y + (cr.y * Math.cos(a) + cu.y * Math.sin(a)) * f, p.z + (cr.z * Math.cos(a) + cu.z * Math.sin(a)) * f];
        const d = spray(R, dirV, 1.3); const sp = R.rr(3, 9);
        sys.spark.emit({ pos, vel: [d.x * sp, d.y * sp + 1, d.z * sp], life: R.rr(0.2, 0.45), size: 0.03, color: 0xfff0c8, colorEnd: 0xff5a20, hdr: 2.6, alpha: 1, alphaEnd: 0, gravity: -8, drag: 1.5, stretch: 0.05, fade: 1.8, mode: 'streak' });
      }
    });
    later(0.085).then(() => { burst(o.hit === 'steel' ? 'steel' : 'flesh', p, 1.05 * size, { color: c, dirV, blood: o.blood }, R); if (elc) elementBurst(p, elc, 1.05 * size, R); });
    // extra white-hot flash + bladed sparks fan right at impact so the cut reads as a hit
    later(0.085).then(() => { sparks(R, p, n(20), { color: 0xfff4d0, colorEnd: 0xff6a20, speed: [5, 14], dirV, spread: 0.9, size: 0.035, life: [0.25, 0.5] }); });
    return later(0.085);
  }

  // ---------------------------------------------------------------------------------------------
  // PROJECTILES
  // ---------------------------------------------------------------------------------------------
  const MESH = {};
  const stdMat = (color, { metal = 0, rough = 0.6, emissive = 0, ei = 0 } = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive, emissiveIntensity: ei });
  function proto(kind) {
    if (MESH[kind]) return MESH[kind];
    const g = new THREE.Group();
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = false; g.add(m); return m; };
    if (kind === 'arrow') {
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), stdMat(0x8a6a44, { rough: 0.8 }), 0, 0, 0, Math.PI / 2);
      add(new THREE.ConeGeometry(0.04, 0.16, 8), stdMat(0xc8d0dc, { metal: 1, rough: 0.3 }), 0, 0, 0.55, Math.PI / 2);
      const fl = stdMat(0xe8e0d0, { rough: 0.9 });
      for (let i = 0; i < 3; i++) { const f = add(new THREE.BoxGeometry(0.004, 0.09, 0.2), fl, 0, 0, -0.36); f.rotation.z = (i / 3) * Math.PI; f.position.y = 0; }
      g.scale.setScalar(1.15);
    } else if (kind === 'dagger') {
      add(new THREE.BoxGeometry(0.05, 0.012, 0.32), stdMat(0xd8dde8, { metal: 1, rough: 0.2 }), 0, 0, 0.2);
      add(new THREE.ConeGeometry(0.036, 0.1, 4), stdMat(0xd8dde8, { metal: 1, rough: 0.2 }), 0, 0, 0.41, Math.PI / 2, Math.PI / 4);
      add(new THREE.BoxGeometry(0.13, 0.02, 0.025), stdMat(0x8a6a2a, { metal: 1, rough: 0.4 }), 0, 0, 0.02);
      add(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), stdMat(0x3a2418, { rough: 0.9 }), 0, 0, -0.07, Math.PI / 2);
      g.scale.setScalar(1.3);
    } else if (kind === 'bone') {
      const b = stdMat(0xe6dcc2, { rough: 0.85 });
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), b, 0, 0, 0, Math.PI / 2);
      for (const sz of [-1, 1]) for (const sy of [-1, 1]) add(new THREE.SphereGeometry(0.052, 10, 8), b, 0, sy * 0.032, sz * 0.26);
      g.scale.setScalar(1.3);
    } else if (kind === 'bomb') {
      const pts = [[0.001, 0], [0.12, 0.01], [0.2, 0.08], [0.25, 0.2], [0.22, 0.32], [0.13, 0.4], [0.11, 0.46], [0.15, 0.49], [0.15, 0.52], [0.001, 0.52]].map(([r, y]) => new THREE.Vector2(r, y));
      const pot = add(new THREE.LatheGeometry(pts, 20), stdMat(0x9a6034, { rough: 0.8, emissive: 0x3a1a08, ei: 0.6 }), 0, -0.26, 0);
      add(new THREE.TorusGeometry(0.235, 0.018, 6, 20), stdMat(0x2a1a10, { rough: 0.9 }), 0, -0.1, 0, Math.PI / 2);
      add(new THREE.TorusGeometry(0.165, 0.014, 6, 20), stdMat(0x2a1a10, { rough: 0.9 }), 0, 0.13, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), stdMat(0x2a2218, { rough: 1 }), 0.02, 0.32, 0).rotation.z = 0.35;
      pot.castShadow = false;
      g.userData.fuse = new THREE.Vector3(0.07, 0.4, 0);
      g.scale.setScalar(2.1);
    } else if (kind === 'pierce') {
      const m = add(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8b8ff).multiplyScalar(2.2) }));
      m.scale.set(0.45, 0.45, 4.2);
      add(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3), transparent: true }), 0, 0, 0).scale.set(0.2, 0.2, 3.2);
    }
    MESH[kind] = g; return g;
  }

  const PK = { // per-kind defaults
    arrow: { speed: 26, arc: 0.12, impact: 'flesh', pw: 0.75, trail: { color: 0xfff2d8, color2: 0xa89878, width: 0.025, life: 0.22, hdr: 1.2, alpha: 0.7 } },
    dagger: { speed: 20, arc: 0.1, impact: 'flesh', pw: 0.85, spin: 28, trail: { color: 0xe8f0ff, color2: 0x8898b8, width: 0.045, life: 0.24, hdr: 1.4, alpha: 0.8 } },
    bone: { speed: 13, arc: 0.45, impact: 'bone', pw: 0.9, spin: 16, trail: { color: 0xe6dcc2, color2: 0x7a705a, width: 0.05, life: 0.26, hdr: 0.9, alpha: 0.6 } },
    bomb: { speed: 8, arc: 2.2, impact: 'fire', pw: 1.15, spin: 6, trail: { color: 0xffb060, color2: 0x502010, width: 0.04, life: 0.35, hdr: 1.8, alpha: 0.8 } },
    fireball: { speed: 12, arc: 0.25, impact: 'fire', pw: 1.0, trail: { color: 0xffa040, color2: 0xa01808, width: 0.2, life: 0.4, hdr: 2.2, alpha: 1 } },
    bolt: { speed: 34, arc: 0, impact: 'magic', pw: 0.9, trail: { color: 0x9fc8ff, color2: 0x2a5aff, width: 0.08, life: 0.22, hdr: 2.6, alpha: 1 } },
    pierce: { speed: 30, arc: 0, impact: 'pierce', pw: 1.0, trail: { color: C.purple, color2: 0x3a1a88, width: 0.12, life: 0.3, hdr: 2.6, alpha: 1 } },
    magic: { speed: 15, arc: 0.3, impact: 'magic', pw: 1.0, trail: { color: C.yellow, color2: 0xa86a00, width: 0.16, life: 0.4, hdr: 2.4, alpha: 1 } },
  };
  const _pa = new THREE.Vector3(); const _pb = new THREE.Vector3(); const _pc = new THREE.Vector3();
  function projectile(from, to, o = {}) {
    const kind = o.kind || 'arrow'; const def = PK[kind] || PK.arrow; const R = rngOf(o);
    const A = toV(from); const B = toV(to);
    const dist = A.distanceTo(B); const speed = o.speed ?? def.speed;
    const dur = Math.max(0.16, dist / speed); const arc = (o.arc ?? def.arc) * (kind === 'bomb' ? 1 : Math.min(1, dist / 5)) * (kind === 'bomb' ? Math.min(1.4, dist / 4) : 1);
    const color = o.color ?? ({ fireball: 0xff8a2a, bolt: 0x9fc8ff, pierce: C.purple, magic: C.yellow, bone: 0xe6dcc2 }[kind] ?? 0xffffff);
    const tr = strips.trail({ ...def.trail, color: o.color ?? def.trail.color, color2: o.color ? lerpHex(o.color, 0x000000, 0.5) : def.trail.color2 });
    const holds = (kind === 'fireball' || kind === 'magic' || kind === 'pierce' || kind === 'bolt') ? holdLight() : null;
    let obj = null;
    if (['arrow', 'dagger', 'bone', 'bomb', 'pierce'].includes(kind)) { obj = proto(kind).clone(true); scene.add(obj); }
    const prev = new THREE.Vector3().copy(A); const pos = new THREE.Vector3().copy(A);
    const fuse = obj?.userData?.fuse; const fp = new THREE.Vector3();
    let spinAcc = R.r() * TAU;
    const pathAt = (e, out) => { out.lerpVectors(A, B, e); out.y += arc * 4 * e * (1 - e); return out; };
    const p = task(dur, (dt, k) => {
      const e = k; prev.copy(pos); pathAt(e, pos); pathAt(Math.min(1, e + 0.02), _pb); _pc.subVectors(_pb, pos);
      if (_pc.lengthSq() < 1e-8) _pc.subVectors(B, A);
      if (obj) {
        obj.position.copy(pos); _pa.copy(pos).add(_pc); obj.lookAt(_pa);
        if (def.spin) { spinAcc += def.spin * dt; obj.rotateX(spinAcc); }
        if (kind === 'bomb') { obj.rotateZ(spinAcc * 0.3); }
      }
      tr.push(pos.x, pos.y, pos.z);
      // per-kind emission (a few particles per frame)
      const vk = speed / (_pc.length() || 1);
      const tail = _pa.copy(_pc).normalize().multiplyScalar(-1);
      if (kind === 'fireball') {
        sys.glow.emit({ pos, life: 0.09, size: 0.85, sizeEnd: 0.75, color: 0xff7a20, hdr: 2.0, alpha: 0.5, alphaEnd: 0.1 });
        sys.glow.emit({ pos, life: 0.09, size: 0.5, sizeEnd: 0.45, color: 0xffcc60, hdr: 2.6, alpha: 0.9, alphaEnd: 0.2 });
        sys.glow.emit({ pos, life: 0.09, size: 0.26, sizeEnd: 0.24, color: 0xffffff, hdr: 3.0, alpha: 1, alphaEnd: 0.4 });
        for (let i = 0; i < 2; i++) sys.glow.emit({ pos: [pos.x + R.pm(0.12), pos.y + R.pm(0.12), pos.z + R.pm(0.12)], vel: [tail.x * 1.5 + R.pm(0.8), tail.y * 1.5 + R.pm(0.8) + 0.6, tail.z * 1.5 + R.pm(0.8)], life: R.rr(0.3, 0.55), size: 0.3, sizeEnd: 0.05, color: 0xffa030, colorEnd: 0xc01808, hdr: 2.2, alpha: 0.9, alphaEnd: 0, fade: 1.2 });
        if (R.r() < 0.5) sys.spark.emit({ pos, vel: [tail.x * 3 + R.pm(2), tail.y * 3 + R.pm(2) + 1, tail.z * 3 + R.pm(2)], life: 0.35, size: 0.03, color: 0xffe0a0, colorEnd: 0xff4010, hdr: 2.6, gravity: -3, stretch: 0.06, mode: 'streak', alpha: 1, alphaEnd: 0 });
        if (R.r() < 0.4) sys.smoke.emit({ pos, vel: [R.pm(0.3), 0.3, R.pm(0.3)], life: 0.8, size: 0.3, sizeEnd: 0.9, color: 0x3a2c24, alpha: 0.35, alphaEnd: 0, fadeIn: 0.1, rot: R.r() * TAU });
        holds.set(pos, 0xff8a30, 22 + R.r() * 6, 7);
      } else if (kind === 'bomb') {
        fp.copy(fuse).applyMatrix4(obj.matrixWorld);
        sys.glow.emit({ pos: fp, life: 0.07, size: 0.28, sizeEnd: 0.2, color: 0xffd080, hdr: 3.2, alpha: 1, alphaEnd: 0.3 });
        sys.spark.emit({ pos: fp, vel: [R.pm(2) , R.rr(0.5, 2.5), R.pm(2)], life: R.rr(0.2, 0.4), size: 0.03, color: 0xfff0c0, colorEnd: 0xff6a20, hdr: 2.8, gravity: -6, stretch: 0.05, mode: 'streak', alpha: 1, alphaEnd: 0 });
        if (R.r() < 0.5) sys.smoke.emit({ pos: fp, vel: [R.pm(0.2), 0.5, R.pm(0.2)], life: 0.7, size: 0.1, sizeEnd: 0.4, color: 0x5a5248, alpha: 0.3, alphaEnd: 0, fadeIn: 0.1, rot: R.r() * TAU });
      } else if (kind === 'magic') {
        sys.glow.emit({ pos, life: 0.09, size: 1.1, sizeEnd: 1, color, hdr: 2, alpha: 0.6, alphaEnd: 0.1 });
        sys.glow.emit({ pos, life: 0.09, size: 0.5, sizeEnd: 0.45, color: 0xffffff, hdr: 3.2, alpha: 1, alphaEnd: 0.3 });
        sys.flare.emit({ pos, life: 0.09, size: 0.9, sizeEnd: 0.8, color, hdr: 1.8, alpha: 0.8, alphaEnd: 0.1, rot: spinAcc });
        if (R.r() < 0.8) sys.star.emit({ pos: [pos.x + R.pm(0.18), pos.y + R.pm(0.18), pos.z + R.pm(0.18)], vel: [R.pm(0.6), R.pm(0.6), R.pm(0.6)], life: R.rr(0.3, 0.6), size: 0.2, sizeEnd: 0.02, color, hdr: 2.6, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(5) });
        holds.set(pos, color, 24, 6);
      } else if (kind === 'bolt') {
        sys.glow.emit({ pos, life: 0.07, size: 0.6, sizeEnd: 0.5, color, hdr: 2.2, alpha: 0.7, alphaEnd: 0.2 });
        sys.spark.emit({ pos, vel: [_pc.x * vk, _pc.y * vk, _pc.z * vk], life: 0.07, size: 0.14, color: 0xffffff, hdr: 3.4, stretch: 0.045, mode: 'streak', alpha: 1, alphaEnd: 0.5 });
        holds.set(pos, color, 20, 6);
      } else if (kind === 'pierce') {
        sys.glow.emit({ pos, life: 0.08, size: 0.9, sizeEnd: 0.8, color, hdr: 2.2, alpha: 0.6, alphaEnd: 0.1 });
        sys.spark.emit({ pos, vel: [_pc.x * vk, _pc.y * vk, _pc.z * vk], life: 0.08, size: 0.18, color: 0xf2e6ff, hdr: 3.4, stretch: 0.06, mode: 'streak', alpha: 1, alphaEnd: 0.5 });
        if (R.r() < 0.6) sys.shard.emit({ pos, vel: [R.pm(1.5), R.pm(1.5), R.pm(1.5)], life: 0.3, size: 0.2, sizeEnd: 0.02, color, hdr: 2.2, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(8) });
        holds.set(pos, color, 24, 6);
      } else if (kind === 'bone' && R.r() < 0.4) {
        sys.smoke.emit({ pos, vel: [R.pm(0.3), R.pm(0.3), R.pm(0.3)], life: 0.5, size: 0.12, sizeEnd: 0.4, color: 0xcfc6ac, alpha: 0.25, alphaEnd: 0, rot: R.r() * TAU });
      } else if (kind === 'dagger' && R.r() < 0.35) {
        sys.star.emit({ pos, life: 0.12, size: 0.16, sizeEnd: 0.02, color: 0xe8f0ff, hdr: 2.4, alpha: 1, alphaEnd: 0, rot: R.r() * TAU });
      }
    }, () => {
      tr.end(); holds?.release();
      if (obj) scene.remove(obj);
    });
    return p.then(() => {
      hitTarget(to, 0); if (o.element) elementBurst(B, elementColor(o), o.power ?? def.pw, rngOf(o));
      if (o.impact !== false) {
        const dirV = _pc.subVectors(B, A).normalize().clone();
        const ik = o.impactKind || def.impact;
        if (ik === 'fire') { const R2 = rngOf(o); burst('fire', B, o.power ?? def.pw, { color: kind === 'fireball' ? 0xff8a2a : 0xff9a3a }, R2); }
        else if (ik === 'bone') { const R2 = rngOf(o); burst('flesh', B, 0.7, { color: 0xe6dcc2, blood: 0xd8ceb4, dirV }, R2); debris(R2, B, n(8), { color: 0xe6dcc2, size: 0.07, dirV, speed: [2, 6] }); }
        else if (ik === 'bolt') burst('magic', B, o.power ?? def.pw, { color }, rngOf(o));
        else burst(ik, B, o.power ?? def.pw, { color: ik === 'pierce' || ik === 'magic' ? color : o.impactColor, dirV }, rngOf(o));
      }
      return B;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // BEAM, LIGHTNING, NOVA
  // ---------------------------------------------------------------------------------------------
  function beam(from, to, o = {}) {
    const A = toV(from); const B = toV(to); const R = rngOf(o); const kind = o.kind || 'pierce';
    const color = o.color ?? (kind === 'magic' ? C.yellow : C.purple); const width = o.width ?? (kind === 'pierce' ? 0.34 : 0.4); const dur = o.dur ?? 0.7;
    strips.beam({ from: A, to: B, color, width, dur, seed: R.r() * 10, hdr: 2.2, bend: o.bend ?? 0, grow: 0.07, taper: kind === 'pierce' ? 0.55 : 0 });
    // muzzle flare at the source, impact at the target when the head arrives
    flare(A, { color: lerpHex(color, 0xffffff, 0.5), size: 1.6, life: 0.2, hdr: 3, R });
    glowPop(A, color, 1.8, 0.3, 0.7, 2);
    const len = A.distanceTo(B);
    task(Math.min(dur * 0.7, 0.5), (dt) => { // sparkles shed along the beam
      for (let i = 0; i < n(Math.max(2, len * 0.9)); i++) {
        const f = R.r(); const p = [A.x + (B.x - A.x) * f + R.pm(0.12), A.y + (B.y - A.y) * f + R.pm(0.12), A.z + (B.z - A.z) * f + R.pm(0.12)];
        if (R.r() < 0.5) sys.star.emit({ pos: p, vel: [R.pm(0.8), R.pm(0.8) + 0.4, R.pm(0.8)], life: R.rr(0.25, 0.5), size: 0.16, sizeEnd: 0.02, color, hdr: 2.6, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(6) });
        else sys.spark.emit({ pos: p, vel: [R.pm(2), R.pm(2), R.pm(2)], life: R.rr(0.15, 0.35), size: 0.025, color: 0xffffff, colorEnd: color, hdr: 2.6, alpha: 1, alphaEnd: 0, stretch: 0.05, mode: 'streak', drag: 2 });
      }
    });
    const dirV = new THREE.Vector3().subVectors(B, A).normalize();
    const hold = holdLight();
    task(dur, (dt, k) => { hold.set(B, color, 30 * (1 - k * k) * (0.85 + 0.15 * Math.sin(T * 50)), 7); }, () => hold.release());
    hitTarget(to, 0.07);
    return later(0.07).then(() => { burst(kind === 'pierce' ? 'pierce' : 'magic', B, o.power ?? 1.1, { color, dirV }, R); return B; });
  }
  function lightning(from, to, o = {}) {
    const B = toV(to); const R = rngOf(o);
    const A = from ? toV(from) : new THREE.Vector3(B.x + R.pm(0.8), B.y + 7.5, B.z + R.pm(0.8) - 0.5);
    const color = o.color ?? 0x9fc8ff; const dur = o.dur ?? 0.36;
    const L = strips.bolt({ from: A, to: B, color, width: o.width ?? 0.2, dur, jag: o.jag ?? 0.42, branches: o.branches ?? 2, rng: R.r, flicker: 16 });
    if (L) { // build the first frame right away
      camBasis();
    }
    flare(B, { color: 0xffffff, size: 2.6, life: 0.18, hdr: 3.6, R });
    glowPop(B, color, 3, 0.3, 0.7, 2);
    sparks(R, B, n(26), { color: 0xffffff, colorEnd: color, speed: [4, 13], spread: 2, size: 0.035, life: [0.2, 0.5], grav: -4, hdr: 3 });
    ring({ at: B, flat: true, color, r: 1.8, dur: 0.4, thick: 0.08, hdr: 2.4, noise: 0.6 });
    ring({ at: B, color: 0xffffff, r: 1.2, dur: 0.22, thick: 0.06, hdr: 2.4 });
    lightFlash(B, color, 80, 0.35, 9, 0.02);
    shake(0.45); stage.flash?.(color, 0.1);
    return later(0.03).then(() => B);
  }
  function nova(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const color = o.color ?? C.yellow; const r = o.radius ?? 3; const dur = o.dur ?? 0.55;
    flare(p, { color: lerpHex(color, 0xffffff, 0.6), size: r * 1.1, life: 0.25, hdr: 3, R });
    shell({ at: p, color, r, dur: dur * 0.7, hdr: 2 });
    ring({ at: p, flat: true, color, r: r * 1.3, dur, thick: 0.1, hdr: 2.2, noise: 0.5, y: groundY });
    ring({ at: p, color, r: r * 0.9, dur: dur * 0.8, thick: 0.07, hdr: 2.2, noise: 0.2 });
    ring({ at: p, color: 0xffffff, r: r * 0.5, dur: dur * 0.5, thick: 0.06, hdr: 2.4, noise: 0, delay: 0.04 });
    for (let i = 0; i < n(30); i++) {
      const a = (i / 30) * TAU + R.pm(0.1); const sp = R.rr(r * 2, r * 5);
      sys.spark.emit({ pos: p, vel: [Math.cos(a) * sp, R.pm(1.2), Math.sin(a) * sp], life: R.rr(0.3, 0.6), size: 0.04, color: 0xffffff, colorEnd: color, hdr: 2.6, alpha: 1, alphaEnd: 0, stretch: 0.07, drag: 2.5, mode: 'streak', fade: 1.5 });
    }
    for (let i = 0; i < n(12); i++) { const d = randDir(R, _d); const sp = R.rr(1, 3.5); sys.star.emit({ pos: p, vel: [d.x * sp, Math.abs(d.y) * sp + 0.5, d.z * sp], life: R.rr(0.6, 1.2), size: 0.22, sizeEnd: 0.04, color, hdr: 2.6, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(5), drag: 1.2 }); }
    lightFlash(p, color, 160, 0.5, 12);
    shake(0.5);
    return later(0.08);
  }

  // ---------------------------------------------------------------------------------------------
  // SHIELD
  // ---------------------------------------------------------------------------------------------
  function shield(at, o = {}) {
    const s = shields.find((x) => !x.busy) || shields[0];
    const center = toV(at); const guard = !!o.guard;
    const color = o.color ?? (guard ? C.gold : C.blue); const radius = o.radius ?? 1.35; const dur = o.dur ?? 1.6;
    const u = s.mesh.material.uniforms; u.uColor.value.set(color); u.uHdr.value = o.hdr ?? 1.6; u.uAppear.value = 0; u.uAlpha.value = 1; u.uScale.value = o.hex ?? 4.4;
    for (let i = 0; i < 4; i++) u.uHit.value[i].set(0, 0, 0, -1);
    if (o.kind === 'plate') {
      s.mesh.geometry = plateGeo; const f = o.facing ? toV(o.facing).normalize() : new THREE.Vector3(0, 0, 1);
      s.mesh.quaternion.setFromUnitVectors(_yAxis, f); u.uGround.value = -99;
    } else { s.mesh.geometry = domeGeo; s.mesh.quaternion.identity(); u.uGround.value = groundY + 0.02; }
    Object.assign(s, { busy: true, t: 0, dur, radius, center, stopping: false, out: 0 }); s.mesh.visible = true; s.mesh.position.copy(center); s.mesh.scale.setScalar(radius * 0.8);
    if (!shieldLive.includes(s)) shieldLive.push(s);
    const R = rngOf(o);
    ring({ at: center, flat: true, color, r: radius * 1.35, dur: 0.5, thick: 0.08, hdr: 2.2, noise: 0.3, y: groundY });
    camBasis(); sparks(R, center, n(10), { color: 0xe0f4ff, colorEnd: color, speed: [1.5, 4.5], spread: 2, size: 0.03, grav: 1 });
    lightFlash(center, color, 40, 0.45);
    const p = later(0.2);
    return withHandle(p, {
      hit(point, strength = 1) { shieldHit(s, toV(point), strength); const hp = toV(point); const R2 = rngOf({}); burst('shield', hp, 0.8 * strength, { color }, R2); },
      dismiss() { s.stopping = true; s.out = 0; },
      get active() { return s.busy; },
    });
  }
  function blockSpark(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const c = o.color ?? C.blue;
    flare(p, { color: 0xeaf6ff, size: 1.3, life: 0.14, hdr: 3.2, R });
    sys.flare.emit({ pos: p, life: 0.18, size: 2.3, sizeEnd: 2.8, color: lerpHex(c, 0xffffff, 0.5), hdr: 2.4, alpha: 1, alphaEnd: 0, rot: R.pm(0.5), aspect: 0.14, fade: 0.6 });
    sparks(R, p, n(16), { color: 0xffffff, colorEnd: c, speed: [3, 10], spread: 2, size: 0.032, life: [0.15, 0.4], grav: -4, hdr: 3 });
    ring({ at: p, color: c, r: 0.8, dur: 0.22, thick: 0.07, hdr: 2.6, noise: 0.2 });
    lightFlash(p, c, 45, 0.18);
    shake(0.15);
    return later(0.02);
  }

  // ---------------------------------------------------------------------------------------------
  // HEAL & GAINS
  // ---------------------------------------------------------------------------------------------
  function screenToWorld(px, py, depth = 6) {
    const w = stage.width || 1280; const h = stage.height || 720;
    const v = new THREE.Vector3((px / w) * 2 - 1, -(py / h) * 2 + 1, 0.5).unproject(camera);
    const dir = v.sub(camera.getWorldPosition(new THREE.Vector3())).normalize();
    return camera.getWorldPosition(new THREE.Vector3()).addScaledVector(dir, depth);
  }
  function targetOf(o, from, fallbackUp = 2.2) {
    if (o.toScreen) {
      const t = o.toScreen; const px = t.x ?? t[0]; const py = t.y ?? t[1];
      const d = camera.getWorldPosition(new THREE.Vector3()).distanceTo(from) * 0.8;
      return t.ndc ? new THREE.Vector3(px, py, 0.4).unproject(camera) : screenToWorld(px, py, d);
    }
    if (o.to) return toV(o.to);
    return new THREE.Vector3(from.x, from.y + fallbackUp, from.z);
  }
  // motes streaming along curved paths to a target; resolves when the first batch arrives
  function streamMotes(system, from, to, R, { count = 14, color, spawn = 0.35, life = [0.65, 0.95], size = 0.24, hdr = 2.4, spread = 0.5, arc = 1.2, mode, trail = true, glowColor }) {
    const motes = [];
    const arrive = [];
    for (let i = 0; i < count; i++) {
      const delay = (i / count) * spawn; const lf = R.rr(life[0], life[1]);
      const p0 = [from.x + R.pm(spread), from.y + R.pm(spread * 0.6), from.z + R.pm(spread)];
      const mid = [(from.x + to.x) / 2 + R.pm(arc), (from.y + to.y) / 2 + R.rr(0.2, arc), (from.z + to.z) / 2 + R.pm(arc * 0.5)];
      motes.push({ delay, lf, p0, mid, idx: -1, born: false });
    }
    let last = 0;
    const done = task(spawn + life[1] + 0.05, (dt, k, el) => {
      for (const m of motes) {
        if (!m.born && el >= m.delay) {
          m.born = true;
          m.idx = system.emit({ pos: m.p0, life: m.lf, size, sizeEnd: size * 0.55, color, hdr, alpha: 1, alphaEnd: 0.9, fade: 6, rot: R.r() * TAU, spin: R.pm(5), mode: mode || 'bb', path: { p0: m.p0, c: m.mid, p1: [to.x, to.y, to.z] } });
          m.arrive = m.delay + m.lf;
          if (trail === 'glow' || trail === true) sys.glow.emit({ pos: m.p0, life: 0.25, size: 0.4, sizeEnd: 0.1, color: glowColor ?? color, hdr: 1.8, alpha: 0.6, alphaEnd: 0 });
        }
        if (m.born && trail && el < m.arrive) {
          const a = system.a.aPos.array; const i3 = m.idx * 3;
          sys.glow.emit({ pos: [a[i3], a[i3 + 1], a[i3 + 2]], life: 0.28, size: 0.26, sizeEnd: 0.04, color: glowColor ?? color, hdr: 1.8, alpha: 0.6, alphaEnd: 0, fade: 1.2 });
        }
        if (m.born && !m.landed && el >= m.arrive) { m.landed = true; sys.glow.emit({ pos: to, life: 0.2, size: 0.2, sizeEnd: 0.7, color: glowColor ?? color, hdr: 2.6, alpha: 0.9, alphaEnd: 0, fade: 0.7 }); }
      }
    });
    const firstArrive = Math.min(...motes.map((m) => m.delay + m.lf));
    return { done, firstArrive, lastArrive: Math.max(...motes.map((m) => m.delay + m.lf)) };
  }
  function magicGain(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const color = o.color ?? C.yellow; const to = targetOf(o, p);
    flare(p, { color: lerpHex(color, 0xffffff, 0.5), size: 1.3, life: 0.2, hdr: 2.6, R });
    ring({ at: p, color, r: 0.9, dur: 0.35, thick: 0.07, hdr: 2.2, noise: 0.1 });
    const s = streamMotes(sys.star, p, to, R, { count: n(o.count ?? 12), color, glowColor: color, size: 0.26 });
    lightFlash(p, color, 40, 0.35);
    later(s.lastArrive).then(() => { camBasis(); flare(to, { color: 0xffffff, size: 0.9, life: 0.18, hdr: 3, R }); ring({ at: to, color, r: 0.7, dur: 0.3, thick: 0.08, hdr: 2.6, noise: 0 }); o.onArrive?.(); });
    return later(s.lastArrive);
  }
  function pierceGain(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const color = o.color ?? C.purple; const to = targetOf(o, p);
    flare(p, { color: lerpHex(color, 0xffffff, 0.5), size: 1.3, life: 0.2, hdr: 2.6, R });
    ring({ at: p, color, r: 0.9, dur: 0.35, thick: 0.07, hdr: 2.2, noise: 0.1 });
    const s = streamMotes(sys.diamond, p, to, R, { count: n(o.count ?? 10), color, glowColor: color, size: 0.3 });
    lightFlash(p, color, 40, 0.35);
    later(s.lastArrive).then(() => { camBasis(); flare(to, { color: 0xffffff, size: 0.9, life: 0.18, hdr: 3, R }); ring({ at: to, color, r: 0.7, dur: 0.3, thick: 0.08, hdr: 2.6, noise: 0 }); o.onArrive?.(); });
    return later(s.lastArrive);
  }
  function coinSpill(R, p, count, { power = 1, spread = 1.4, floor = groundY + 0.05 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = R.r() * TAU; const sp = R.rr(0.5, spread);
      sys.coin.emit({ pos: [p.x + R.pm(0.1), p.y, p.z + R.pm(0.1)], vel: [Math.cos(a) * sp, R.rr(4, 7.5) * power, Math.sin(a) * sp], life: R.rr(1.5, 2.2), size: 0.34, sizeEnd: 0.34, color: 0xffffff, hdr: 1.3, alpha: 1, alphaEnd: 0, fade: 8, gravity: -17, drag: 0.1, rot: R.r() * TAU, spin: R.rr(10, 22) * (R.r() < 0.5 ? 1 : -1), mode: 'coin', floor, bounce: 0.45 });
      if (i % 2 === 0) sys.star.emit({ pos: [p.x + R.pm(0.3), p.y + R.rr(0.2, 1.2), p.z + R.pm(0.3)], life: R.rr(0.2, 0.5), size: 0.3, sizeEnd: 0.05, color: 0xffe9a0, hdr: 2.8, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(3), seed: 1 });
    }
  }
  function goldGain(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const count = n(o.count ?? 14);
    flare(p, { color: 0xffe9a0, size: 1.3, life: 0.2, hdr: 2.6, R });
    glowPop(p, C.gold, 1.8, 0.3, 0.6, 2);
    ring({ at: p, color: C.gold, r: 0.8, dur: 0.3, thick: 0.07, hdr: 2.2, noise: 0.2 });
    lightFlash(p, C.gold, 40, 0.35);
    if (o.toScreen) {
      const to = targetOf(o, p); const s = streamMotes(sys.coin, p, to, R, { count, color: 0xffffff, size: 0.2, hdr: 1.2, mode: 'coin', trail: 'glow', glowColor: C.gold, spread: 0.3 });
      later(s.lastArrive).then(() => { flare(to, { color: 0xffe9a0, size: 0.9, life: 0.18, hdr: 3, R }); o.onArrive?.(); });
      return later(s.lastArrive);
    }
    coinSpill(R, p, count, { power: o.power ?? 1 });
    return later(0.25);
  }
  function heal(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const color = o.color ?? C.green; const base = p.y < 0.6 ? 0 : groundY;
    const h = o.height ?? 2.2; const r = o.radius ?? 0.75;
    pillar({ at: p, color, r: r, h, dur: 1.2, hdr: 1.7, alpha: 0.9 });
    ring({ at: p, flat: true, color, r: r * 2.1, dur: 0.9, thick: 0.1, hdr: 2.2, noise: 0.15, y: groundY, ease: 2 });
    ring({ at: p, flat: true, color: 0xd8ffe8, r: r * 1.5, dur: 0.7, thick: 0.06, hdr: 2.2, noise: 0, y: groundY, delay: 0.18 });
    flare(_p.set(p.x, groundY + 0.25, p.z), { color: 0xe8ffe8, size: 1.8, life: 0.25, hdr: 2.6, R });
    // rising motes + crosses over ~1 s
    task(1.0, (dt, k) => {
      const rate = (1 - k * 0.6) * 56 * dt * Q;
      let c = rate; while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const a = R.r() * TAU; const rad = R.rr(0.05, r);
        sys.glow.emit({ pos: [p.x + Math.cos(a) * rad, groundY + R.rr(0.05, 0.5), p.z + Math.sin(a) * rad], vel: [R.pm(0.15), R.rr(1.1, 2.6), R.pm(0.15)], life: R.rr(0.8, 1.5), size: R.rr(0.12, 0.26), sizeEnd: 0.03, color: R.r() < 0.5 ? color : 0xc8ffd8, hdr: 2.4, alpha: 0.9, alphaEnd: 0, turbulence: 1.4, drag: 0.4, fade: 1.6 });
      }
      if (R.r() < dt * 7) sys.cross.emit({ pos: [p.x + R.pm(r * 0.8), groundY + R.rr(0.2, 0.9), p.z + R.pm(r * 0.8)], vel: [R.pm(0.1), R.rr(0.8, 1.4), R.pm(0.1)], life: R.rr(0.9, 1.3), size: 0.34, sizeEnd: 0.2, color: 0xaaffcc, hdr: 2.4, alpha: 1, alphaEnd: 0, fade: 2, turbulence: 0.6, rot: R.pm(0.25) });
    });
    const hold = holdLight();
    task(1.1, (dt, k) => { hold.set(_p.set(p.x, groundY + 1.3, p.z), color, 30 * Math.min(1, k * 8) * (1 - k) * (0.8 + 0.2 * Math.sin(k * 25)), 6); }, () => hold.release());
    return later(0.28);
  }

  // ---------------------------------------------------------------------------------------------
  // AURAS (telegraphs and actions)
  // ---------------------------------------------------------------------------------------------
  const liveGlyphs = new Set(); const liveAuras = [];
  function aura(target, o = {}) {
    const kind = o.kind || 'buff';
    const p = toV(target); const R = rngOf(o);
    const feet = new THREE.Vector3(p.x, groundY, p.z); if (target?.worldAnchor) target.worldAnchor('feet', feet);
    feet.y = groundY;
    const rad = o.radius ?? (target?.radius ? target.radius * 2.2 : 1.5);
    switch (kind) {
      case 'windup': return auraWindup(target, feet, Math.max(rad, 1.9), o, R);
      case 'rage': return auraRage(p, feet, rad, o, R);
      case 'hex': return auraHex(p, feet, rad, o, R);
      case 'howl': { const m = target?.worldAnchor ? target.worldAnchor('mouth', new THREE.Vector3()) : p; return auraHowl(m, feet, rad, o, R); }
      case 'summon': return auraSummon(feet, rad, o, R);
      case 'drain': return auraDrain(p, o, R);
      case 'mend': return auraMend(p, feet, rad, o, R);
      default: return auraBuff(p, feet, rad, o, R);
    }
  }
  function auraBuff(p, feet, rad, o, R) {
    const color = o.color ?? C.yellow; const dur = o.dur ?? 1.3;
    pillar({ at: feet, color, r: rad * 0.45, h: 2.6, dur: dur * 0.9, hdr: 1.6, alpha: 0.8 });
    ring({ at: feet, flat: true, color, r: rad * 1.3, dur: 0.8, thick: 0.1, hdr: 2.2, noise: 0.15, y: groundY });
    ring({ at: feet, flat: true, color: 0xffffff, r: rad * 0.9, dur: 0.6, thick: 0.06, hdr: 2.2, noise: 0, y: groundY, delay: 0.12 });
    flare(_p.set(feet.x, groundY + 0.3, feet.z), { color: lerpHex(color, 0xffffff, 0.6), size: 1.6, life: 0.22, hdr: 2.6, R });
    task(dur, (dt, k, el) => { // spiral of motes
      const rate = 46 * dt * Q * (1 - k * 0.5); let c = rate;
      while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const a = el * 5 + R.r() * TAU; const rr_ = rad * 0.5 * R.rr(0.7, 1);
        sys.star.emit({ pos: [feet.x + Math.cos(a) * rr_, groundY + 0.1, feet.z + Math.sin(a) * rr_], vel: [-Math.sin(a) * 0.5, R.rr(1.4, 2.8), Math.cos(a) * 0.5], life: R.rr(0.7, 1.2), size: 0.2, sizeEnd: 0.04, color, hdr: 2.4, alpha: 1, alphaEnd: 0, rot: R.r() * TAU, spin: R.pm(4), fade: 1.6 });
      }
    });
    lightFlash(_p.set(feet.x, 1.2, feet.z), color, 40, 0.7);
    return later(0.25);
  }
  function auraMend(p, feet, rad, o, R) {
    const color = o.color ?? C.green; const dur = o.dur ?? 1.4;
    pillar({ at: feet, color, r: rad * 0.4, h: 2.4, dur: dur * 0.8, hdr: 1.5, alpha: 0.7 });
    ring({ at: feet, flat: true, color, r: rad * 1.2, dur: 0.8, thick: 0.09, hdr: 2, noise: 0.15, y: groundY });
    task(dur, (dt, k, el) => {
      for (let j = 0; j < 2; j++) { // two helix strands
        const a = el * 6 + j * Math.PI; const y = (el * 1.6) % 1.8; const rr_ = rad * 0.45 * (1 - y * 0.12);
        if (R.r() < 0.9) sys.glow.emit({ pos: [feet.x + Math.cos(a) * rr_, groundY + y + 0.05, feet.z + Math.sin(a) * rr_], vel: [0, 0.3, 0], life: 0.7, size: 0.2, sizeEnd: 0.03, color: j ? 0xc8ffd8 : color, hdr: 2.6, alpha: 0.9, alphaEnd: 0, fade: 1.4 });
      }
      if (R.r() < dt * 6) sys.cross.emit({ pos: [feet.x + R.pm(rad * 0.5), groundY + 0.3, feet.z + R.pm(rad * 0.5)], vel: [0, R.rr(0.8, 1.3), 0], life: 1.1, size: 0.3, sizeEnd: 0.18, color: 0xaaffcc, hdr: 2.4, alpha: 1, alphaEnd: 0, fade: 2, rot: R.pm(0.2) });
    });
    lightFlash(_p.set(feet.x, 1.2, feet.z), color, 35, 0.8);
    return later(0.25);
  }
  // Ground-projected telegraph decal: 'slam' = hazard-striped danger disc whose wavefront grows to the rim
  // as the hit nears + rotating rune ring; 'hex' = violet rotating ritual glyph with orbiting sigils.
  // Returns a promise with { stop(), setProgress(k), active }.
  function telegraph(target, o = {}) { return auraWindup(target, anchorFeet(target), o.radius ?? (target?.radius ? Math.max(1.9, target.radius * 2.6) : 2), { ...o, kind: o.kind || 'slam' }, rngOf(o)); }
  function anchorFeet(t) { const f = toV(t, new THREE.Vector3()); if (t?.worldAnchor) t.worldAnchor('feet', f); f.y = groundY; return f; }
  function auraWindup(target, feet, rad, o, R) {
    const kind = o.kind === 'hex' ? 'hex' : 'slam'; const hex = kind === 'hex';
    const color = o.color ?? (hex ? 0x8a3dff : 0xff3a24); const dur = o.dur ?? Infinity; const fill = o.fill ?? 1.8;
    const g = glyphs.find((x) => !x.busy); const d = hex ? null : discs.find((x) => !x.busy);
    const a = { stop() { a.stopping = true; }, t: 0, alive: true, manual: null, setProgress(k) { a.manual = k; } };
    if (g) { g.busy = true; g.mesh.visible = true; const u = g.mesh.material.uniforms; u.uColor.value.set(color); u.uAlpha.value = 1; u.uHdr.value = o.hdr ?? (hex ? 1.5 : 1.25); }
    if (d) { d.busy = true; d.mesh.visible = true; const u = d.mesh.material.uniforms; u.uColor.value.set(color); u.uK.value = 0; }
    ring({ at: feet, flat: true, color, r: rad * 1.2, dur: 0.55, thick: 0.05, hdr: 1.8, noise: 0.3, y: groundY });
    if (!hex) { shake(0.14); chromaPunch(0.25); }
    const upd = (dt) => {
      a.t += dt; const t = a.t; const k = Math.min(1, t / 0.5); const e = 1 - (1 - k) ** 3;
      if (a.stopping && a.stopT === undefined) a.stopT = t;
      const fadeOut = a.stopping ? Math.max(0, 1 - (t - a.stopT) / 0.35) : 1;
      if (a.stopping && fadeOut <= 0) { a.alive = false; if (g) { g.busy = false; g.mesh.visible = false; } if (d) { d.busy = false; d.mesh.visible = false; } return false; }
      if (!a.stopping && t > dur) a.stopping = true;
      const prog = a.manual ?? Math.min(1, t / fill);
      if (g) {
        const u = g.mesh.material.uniforms; const sc = rad * (0.5 + 0.5 * e) * (hex ? 0.85 : 0.9);
        g.mesh.position.set(feet.x, groundY + 0.03, feet.z); g.mesh.scale.set(sc, sc, 1);
        u.uTime.value = t * (hex ? 1.4 : 1 + prog); u.uK.value = k; u.uAlpha.value = fadeOut * (hex ? 1 : 0.8); u.uPulse.value = prog;
      }
      if (d) { const u = d.mesh.material.uniforms; d.mesh.position.set(feet.x, groundY + 0.02, feet.z); d.mesh.scale.set(rad * e, rad * e, 1); u.uK.value = prog; u.uTime.value = t; u.uAlpha.value = fadeOut * Math.min(1, t / 0.15); }
      // embers drifting up off the decal (sparse and small: the decal itself must carry the read)
      let c = (hex ? 14 : 22) * dt * Q * fadeOut; while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const ang = R.r() * TAU; const rr_ = rad * R.rr(0.3, 0.95);
        const sys_ = hex ? sys.diamond : sys.ember;
        sys_.emit({ pos: [feet.x + Math.cos(ang) * rr_, groundY + 0.05, feet.z + Math.sin(ang) * rr_], vel: [R.pm(0.2), R.rr(0.6, 1.8), R.pm(0.2)], life: R.rr(0.9, 1.5), size: hex ? 0.2 : R.rr(0.035, 0.07), sizeEnd: 0.01, color: hex ? 0xb07dff : 0xff8a2a, colorEnd: hex ? 0x5a2aa8 : 0xff2010, hdr: 2.2, alpha: 1, alphaEnd: 0, turbulence: 1.2, drag: 0.3, fade: 1.5, rot: R.pm(0.3) });
      }
      if (!hex) vig(0xff2a18, fadeOut * (0.03 + 0.07 * prog) * (0.5 + 0.5 * Math.sin(t * (4 + prog * 5))));
      return true;
    };
    liveAuras.push({ upd });
    const p = later(0.45);
    return withHandle(p, { stop: () => a.stop(), setProgress: (k) => a.setProgress(k), get active() { return a.alive; } });
  }
  function auraRage(p, feet, rad, o, R) {
    const color = o.color ?? 0xff5a1a;
    camBasis();
    flare(_p.set(feet.x, 0.9, feet.z), { color: 0xffe0b0, size: 2.6, life: 0.22, hdr: 2.8, R });
    shell({ at: _p.set(feet.x, 0.9, feet.z), color, r: rad * 1.6, dur: 0.45, hdr: 2.2 });
    ring({ at: feet, flat: true, color, r: rad * 3, dur: 0.7, thick: 0.12, hdr: 2.4, noise: 0.7, y: groundY });
    ring({ at: feet, flat: true, color: 0xffe0b0, r: rad * 2, dur: 0.5, thick: 0.07, hdr: 2.4, noise: 0.5, y: groundY, delay: 0.06 });
    ring({ at: _p.set(feet.x, 0.9, feet.z), color: 0xfff0d0, r: rad * 1.7, dur: 0.3, thick: 0.07, hdr: 2.6, noise: 0.3 });
    pillar({ at: feet, color, r: rad * 0.6, h: 4.2, dur: 0.9, hdr: 2, alpha: 1, grow: 0.18 });
    crackDecal(feet, { size: rad * 3.2, color: 0xff6a20, dur: 2.6 });
    task(0.6, (dt, k) => {
      let c = 90 * dt * Q * (1 - k); while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const ang = R.r() * TAU; const rr_ = rad * R.rr(0.2, 0.9);
        sys.glow.emit({ pos: [feet.x + Math.cos(ang) * rr_, groundY + 0.1, feet.z + Math.sin(ang) * rr_], vel: [Math.cos(ang) * 0.6, R.rr(3, 7), Math.sin(ang) * 0.6], life: R.rr(0.5, 1.0), size: R.rr(0.5, 1.0), sizeEnd: 0.1, color: 0xffd070, colorEnd: 0xff2a08, hdr: 2.6, alpha: 0.85, alphaEnd: 0, drag: 1.1, turbulence: 2, fade: 1.2 });
      }
    });
    sparks(R, _p.set(feet.x, 0.6, feet.z), n(40), { color: 0xfff0c0, colorEnd: 0xff4a10, speed: [5, 14], spread: 2, size: 0.045, life: [0.4, 0.9], hdr: 2.8, grav: -3 });
    embers(R, _p.set(feet.x, 0.5, feet.z), n(40), { speed: [2, 6], life: [1, 2.2], size: 0.07, grav: 1.5 });
    smokePuffs(R, _p.set(feet.x, 0.4, feet.z), n(6), { color: 0x2a2220, size: 0.9, grow: 2.6, life: [1.2, 1.9], alpha: 0.5, spread: rad * 0.6, rise: 1.2 });
    dustRing(R, feet, n(12), { r: rad, size: 0.8, speed: 4, color: 0x7a5e48, alpha: 0.45 });
    lightFlash(_p.set(feet.x, 1.2, feet.z), color, 200, 0.8, 14, 0.03);
    shake(1.0); stage.flash?.(0xff8a40, 0.1); stage.hurt?.(0.35);
    return later(0.12);
  }
  // chain ring for hex
  let chainMesh = null;
  function auraHex(p, feet, rad, o, R) {
    const color = o.color ?? 0x8a3dff; const dur = o.dur ?? 1.8; const N = 14; const cy = o.y ?? Math.max(0.5, p.y);
    if (!chainMesh) {
      chainMesh = [];
      for (let j = 0; j < 2; j++) {
        const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.3, 0.08, 10, 18), new THREE.MeshStandardMaterial({ color: 0x3a2e4e, metalness: 1, roughness: 0.3, emissive: 0x7a30ff, emissiveIntensity: 1.1 }), N);
        mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 6; scene.add(mesh); chainMesh.push({ mesh, busy: false });
      }
    }
    const cm = chainMesh.find((x) => !x.busy);
    const dummy = new THREE.Object3D();
    if (cm) { cm.busy = true; cm.mesh.visible = true; cm.mesh.material.emissive.set(color); }
    { const g = glyphs.find((x) => !x.busy); if (g) { g.busy = true; g.mesh.visible = true; const gu = g.mesh.material.uniforms; gu.uColor.value.set(color); gu.uHdr.value = 1.6; gu.uK.value = 1; gu.uPulse.value = 0.3;
      task(dur, (dt, k, el) => { const sc = rad * 1.35 * Math.min(1, 0.4 + el * 3); g.mesh.position.set(feet.x, groundY + 0.03, feet.z); g.mesh.scale.set(sc, sc, 1); gu.uTime.value = el * 1.4; gu.uAlpha.value = (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1) * Math.min(1, el * 5); }, () => { g.busy = false; g.mesh.visible = false; }); } }
    ring({ at: feet, flat: true, color, r: rad * 1.4, dur: 0.7, thick: 0.1, hdr: 2.2, noise: 0.5, y: groundY });
    ring({ at: _p.set(p.x, cy, p.z), color, r: rad * 1.1, dur: 0.4, thick: 0.07, hdr: 2.4 });
    flare(_p.set(p.x, cy, p.z), { color: 0xd8b8ff, size: 2.2, life: 0.22, hdr: 2.6, R });
    // sparks that converge as the chains lock on
    for (let i = 0; i < n(24); i++) {
      const a = R.r() * TAU; const dd = rad * R.rr(1.6, 2.4); const sp = dd / 0.3;
      sys.spark.emit({ pos: [p.x + Math.cos(a) * dd, cy + R.pm(0.6), p.z + Math.sin(a) * dd], vel: [-Math.cos(a) * sp, 0, -Math.sin(a) * sp], life: 0.3, size: 0.035, color: 0xe0c8ff, colorEnd: color, hdr: 2.6, alpha: 1, alphaEnd: 0, stretch: 0.08, mode: 'streak' });
    }
    lightFlash(_p.set(p.x, cy, p.z), color, 60, 0.6);
    shake(0.2);
    task(dur, (dt, k, el) => {
      const tight = Math.min(1, el / 0.35); const rr_ = rad * (1 + 0.45 * (1 - (1 - (1 - tight)) ** 2) * (1 - tight) + 0.0) ;
      const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
      if (cm) {
        for (let i = 0; i < N; i++) {
          const a = (i / N) * TAU + el * 1.1; const wob = Math.sin(el * 2.5 + i * 0.9) * 0.05;
          dummy.position.set(p.x + Math.cos(a) * (rr_ + wob), cy + Math.sin(a * 2 + el * 1.5) * 0.12, p.z + Math.sin(a) * (rr_ + wob));
          dummy.rotation.set(i % 2 ? Math.PI / 2 : 0, -a, i % 2 ? 0 : Math.PI / 2 * 0.0 + 0.0);
          if (i % 2 === 0) dummy.rotation.set(0, -a + Math.PI / 2, 0); else dummy.rotation.set(Math.PI / 2, -a + Math.PI / 2, 0);
          const sc = Math.max(0.001, fade * Math.min(1, el * 6));
          dummy.scale.setScalar(sc * 1.5); dummy.updateMatrix(); cm.mesh.setMatrixAt(i, dummy.matrix);
        }
        cm.mesh.instanceMatrix.needsUpdate = true;
        cm.mesh.material.emissiveIntensity = 0.7 + 0.5 * Math.sin(el * 6);
      }
      // orbiting sigils + dark smoke curling up
      if (R.r() < dt * 18) { const a = R.r() * TAU; sys.diamond.emit({ pos: [p.x + Math.cos(a) * rad, cy + R.pm(0.4), p.z + Math.sin(a) * rad], vel: [-Math.sin(a) * 1.2, R.rr(0.2, 0.8), Math.cos(a) * 1.2], life: R.rr(0.6, 1.0), size: 0.28, sizeEnd: 0.06, color, hdr: 2.4, alpha: 1, alphaEnd: 0, fade: 1.6, rot: R.pm(0.4) }); }
      if (R.r() < dt * 10) sys.smoke.emit({ pos: [p.x + R.pm(rad), cy - 0.3, p.z + R.pm(rad)], vel: [R.pm(0.3), R.rr(0.4, 0.9), R.pm(0.3)], life: R.rr(0.9, 1.4), size: 0.5, sizeEnd: 1.2, color: 0x2a1450, alpha: 0.45 * fade, alphaEnd: 0, fadeIn: 0.15, rot: R.r() * TAU, spin: R.pm(0.4) });
    }, () => { if (cm) { cm.busy = false; cm.mesh.visible = false; } });
    return later(0.4);
  }
  function auraHowl(m, feet, rad, o, R) {
    const color = o.color ?? 0xf0e4c8;
    camBasis();
    for (let i = 0; i < 4; i++) ring({ at: m, color, r: rad * (1.7 + i * 0.35), dur: 0.7 + i * 0.05, thick: 0.045, hdr: 1.8, noise: 0.15, delay: i * 0.13, ease: 2 });
    ring({ at: feet, flat: true, color, r: rad * 2.6, dur: 0.9, thick: 0.08, hdr: 1.6, noise: 0.6, y: groundY, delay: 0.05 });
    flare(m, { color: 0xfff4e0, size: 1.4, life: 0.2, hdr: 2.2, R });
    for (let i = 0; i < n(28); i++) { // radial wind streaks
      const a = R.r() * TAU; const sp = R.rr(6, 13);
      const vx = (cr.x * Math.cos(a) + cu.x * Math.sin(a)) * sp; const vy = (cr.y * Math.cos(a) + cu.y * Math.sin(a)) * sp; const vz = (cr.z * Math.cos(a) + cu.z * Math.sin(a)) * sp;
      sys.spark.emit({ pos: m, vel: [vx, vy, vz], life: R.rr(0.25, 0.5), size: 0.04, color, hdr: 1.8, alpha: 0.9, alphaEnd: 0, drag: 2.2, stretch: 0.1, mode: 'streak', fade: 1.3 });
    }
    dustRing(R, feet, n(10), { r: rad, size: 0.6, speed: 3, color: 0x8b8272, alpha: 0.3 });
    shake(0.45); later(0.28).then(() => shake(0.3)); later(0.55).then(() => shake(0.22));
    return later(0.2);
  }
  const riftState = [];
  function auraSummon(feet, rad, o, R) {
    const color = o.color ?? 0x6fe04a; const dur = o.dur ?? 1.8;
    const g = rifts.find((x) => !x.busy);
    if (g) { g.busy = true; g.mesh.visible = true; g.mesh.material.uniforms.uColor.value.set(color); }
    ring({ at: feet, flat: true, color, r: rad * 1.9, dur: 0.7, thick: 0.1, hdr: 2.2, noise: 0.5, y: groundY });
    pillar({ at: feet, color, r: rad * 0.55, h: 2.2, dur: dur * 0.8, hdr: 1.3, alpha: 0.55, grow: 0.5 });
    lightFlash(_p.set(feet.x, 0.6, feet.z), color, 60, dur * 0.7);
    shake(0.2);
    const hold = holdLight();
    task(dur, (dt, k, el) => {
      const open = Math.min(1, el / 0.55); const close = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      const e = (1 - (1 - open) ** 3) * close;
      if (g) { const u = g.mesh.material.uniforms; u.uTime.value = el; u.uOpen.value = e; u.uAlpha.value = close; g.mesh.position.set(feet.x, groundY + 0.025, feet.z); g.mesh.scale.set(rad * 1.15, rad * 1.15, 1); }
      hold.set(_p.set(feet.x, 0.5, feet.z), color, 14 * e * (0.8 + 0.2 * Math.sin(el * 12)), 5);
      let c = 40 * dt * Q * e; while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const a = R.r() * TAU; const rr_ = rad * R.rr(0.2, 1.0);
        sys.smoke.emit({ pos: [feet.x + Math.cos(a) * rr_, groundY + 0.1, feet.z + Math.sin(a) * rr_], vel: [R.pm(0.2), R.rr(0.5, 1.4), R.pm(0.2)], life: R.rr(0.9, 1.5), size: 0.45, sizeEnd: 1.3, color: 0x4a8a2a, alpha: 0.42 * close, alphaEnd: 0, fadeIn: 0.15, rot: R.r() * TAU, spin: R.pm(0.4), drag: 0.5 });
        if (R.r() < 0.4) sys.glow.emit({ pos: [feet.x + Math.cos(a) * rr_, groundY + 0.1, feet.z + Math.sin(a) * rr_], vel: [R.pm(0.2), R.rr(1, 2.4), R.pm(0.2)], life: R.rr(0.6, 1.2), size: 0.14, sizeEnd: 0.02, color, hdr: 2.6, alpha: 1, alphaEnd: 0, turbulence: 1, fade: 1.5 });
      }
    }, () => { hold.release(); if (g) { g.busy = false; g.mesh.visible = false; } });
    return later(0.55);
  }
  function auraDrain(p, o, R) {
    const color = o.color ?? C.yellow; const from = o.from ? toV(o.from) : new THREE.Vector3(p.x - 3, p.y, p.z + 3);
    camBasis();
    flare(from, { color: lerpHex(color, 0xffffff, 0.4), size: 1.2, life: 0.2, hdr: 2.4, R });
    ring({ at: from, color, r: 0.8, dur: 0.3, thick: 0.07, hdr: 2.2, noise: 0.1 });
    const s = streamMotes(sys.star, from, p, R, { count: n(o.count ?? 12), color, glowColor: color, size: 0.26, arc: 0.7, spread: 0.5, life: [0.55, 0.85] });
    // the thief swells with it
    later(s.firstArrive).then(() => { task(0.5, (dt, k) => { sys.glow.emit({ pos: p, life: 0.12, size: 1.1 * (1 - k * 0.5), sizeEnd: 0.9, color: lerpHex(color, 0xff3a90, 0.5), hdr: 2, alpha: 0.5 * (1 - k), alphaEnd: 0 }); }); });
    later(s.lastArrive).then(() => { flare(p, { color: 0xffe0f0, size: 2, life: 0.22, hdr: 2.8, R }); ring({ at: p, color: lerpHex(color, 0xff3a90, 0.4), r: 1.2, dur: 0.4, thick: 0.08, hdr: 2.4, noise: 0.2 }); lightFlash(p, lerpHex(color, 0xff3a90, 0.4), 50, 0.35); });
    return later(s.lastArrive);
  }

  // ---------------------------------------------------------------------------------------------
  // GROUND stuff and DEATH
  // ---------------------------------------------------------------------------------------------
  function groundRing(at, o = {}) { const p = toV(at); ring({ at: p, flat: true, color: o.color ?? 0xffffff, r: o.r ?? 1.5, dur: o.dur ?? 0.6, thick: o.thick ?? 0.1, hdr: o.hdr ?? 2, noise: o.noise ?? 0.3, y: groundY }); return later(0.05); }
  function dust(at, o = {}) { const p = toV(at); const R = rngOf(o); dustRing(R, p, n(o.n ?? 8), { r: o.r ?? 0.8, size: o.size ?? 0.5, speed: o.speed ?? 2, color: o.color ?? 0x8b8272, alpha: o.alpha ?? 0.4 }); return later(0.02); }
  function footstep(at, big = false, o = {}) {
    const p = toV(at); const R = rngOf(o); p.y = groundY;
    if (!big) { dustRing(R, p, n(5), { r: 0.5, size: 0.35, speed: 1.2, alpha: 0.3 }); ring({ at: p, flat: true, color: 0xb8a888, r: 0.9, dur: 0.35, thick: 0.1, hdr: 0.9, noise: 0.5, y: groundY }); shake(0.06); }
    else {
      dustRing(R, p, n(14), { r: 1.2, size: 0.8, speed: 3.4, alpha: 0.5 }); debris(R, _p.set(p.x, 0.15, p.z), n(8), { color: 0x8a8478, size: 0.1, speed: [2, 6] });
      ring({ at: p, flat: true, color: 0xe0c8a0, r: 3.4, dur: 0.6, thick: 0.1, hdr: 1.5, noise: 0.7, y: groundY });
      crackDecal(p, { size: 2.6, color: 0xff8a30, dur: 1.4 });
      lightFlash(_p.set(p.x, 0.5, p.z), 0xffa860, 40, 0.2); shake(0.45);
    }
    return later(0.03);
  }
  function shockwave(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const r = o.radius ?? 3.2; const c = o.color ?? 0xffd9a0; p.y = groundY;
    ring({ at: p, flat: true, color: c, r, dur: 0.65, thick: 0.12, hdr: 2.2, noise: 0.6, y: groundY });
    ring({ at: p, flat: true, color: 0xffffff, r: r * 0.7, dur: 0.45, thick: 0.07, hdr: 2.4, noise: 0.3, y: groundY, delay: 0.05 });
    dustRing(R, p, n(18), { r: r * 0.6, size: 0.9, speed: r * 1.1, alpha: 0.42 });
    for (let i = 0; i < n(24); i++) { const a = (i / 24) * TAU + R.pm(0.1); const sp = R.rr(r * 2.4, r * 4); sys.spark.emit({ pos: [p.x, groundY + 0.1, p.z], vel: [Math.cos(a) * sp, R.rr(0.1, 1), Math.sin(a) * sp], life: R.rr(0.2, 0.4), size: 0.05, color: 0xffffff, colorEnd: c, hdr: 2, alpha: 0.9, alphaEnd: 0, drag: 3.5, stretch: 0.09, mode: 'streak' }); }
    shake(o.shake ?? 0.55);
    return later(0.05);
  }
  function death(who, o = {}) {
    const R = rngOf(o); const isActor = !!who?.worldAnchor;
    const chest = isActor ? who.worldAnchor('chest', new THREE.Vector3()) : toV(who);
    const feet = isActor ? who.worldAnchor('feet', new THREE.Vector3()) : new THREE.Vector3(chest.x, groundY, chest.z);
    const size = o.size ?? (isActor ? Math.max(0.7, who.height / 1.4) : 1); const color = o.color ?? 0xff7a1a;
    camBasis();
    flare(chest, { color: 0xffd8b0, size: 2 * size, life: 0.22, hdr: 2.6, R });
    ring({ at: feet, flat: true, color, r: 1.6 * size, dur: 0.9, thick: 0.1, hdr: 2, noise: 0.5, y: groundY });
    lightFlash(_p.set(feet.x, 0.8 * size, feet.z), color, 70 * size, 0.9, 10, 0.05);
    // embers pour off the dissolving body: lifted along its height for ~1.2 s
    task(1.3, (dt, k) => {
      let c = 170 * dt * Q * size * (1 - k * 0.6); while (c > 0) { if (c < 1 && R.r() > c) break; c -= 1;
        const a = R.r() * TAU; const rr_ = R.rr(0, 0.5) * size; const y = R.rr(0.1, 1.5) * size;
        sys.ember.emit({ pos: [chest.x + Math.cos(a) * rr_, groundY + y, chest.z + Math.sin(a) * rr_], vel: [R.pm(0.5), R.rr(0.8, 3.6), R.pm(0.5)], life: R.rr(1.0, 2.2), size: R.rr(0.06, 0.14) * size, sizeEnd: 0.01, color: 0xffc060, colorEnd: color === 0xff7a1a ? 0xff2a08 : color, hdr: 2.6, alpha: 1, alphaEnd: 0, turbulence: 1.6, drag: 0.35, gravity: 0.6, fade: 1.6 });
      }
      if (R.r() < dt * 14) sys.smoke.emit({ pos: [chest.x + R.pm(0.5 * size), groundY + R.rr(0.2, 1.4) * size, chest.z + R.pm(0.5 * size)], vel: [R.pm(0.3), R.rr(0.4, 1.0), R.pm(0.3)], life: R.rr(1.4, 2.2), size: 0.7 * size, sizeEnd: 1.8 * size, color: 0x3a3632, alpha: 0.4, alphaEnd: 0, fadeIn: 0.15, rot: R.r() * TAU, spin: R.pm(0.3) });
    });
    for (let i = 0; i < n(26); i++) { const d = randDir(R, _d); const sp = R.rr(1, 5) * size; sys.spark.emit({ pos: chest, vel: [d.x * sp, Math.abs(d.y) * sp + 1, d.z * sp], life: R.rr(0.4, 0.9), size: 0.035, color: 0xffe0a0, colorEnd: color, hdr: 2.6, alpha: 1, alphaEnd: 0, gravity: -2, drag: 1.2, stretch: 0.06, mode: 'streak' }); }
    // soul wisp
    if (o.wisp !== false) {
      const top = [chest.x + R.pm(0.3), groundY + 4.2 * size, chest.z + R.pm(0.3)];
      const mid = [chest.x + R.pm(1.2), groundY + 2.2 * size, chest.z + R.pm(1.2)];
      const wi = sys.wisp.emit({ pos: chest, life: 2.4, size: 0.5 * size, sizeEnd: 0.28 * size, color: 0xbfe8ff, hdr: 2.6, alpha: 1, alphaEnd: 0, fade: 4, path: { p0: [chest.x, chest.y, chest.z], c: mid, p1: top } });
      task(2.4, (dt, k) => { const a = sys.wisp.a.aPos.array; const i3 = wi * 3; if (R.r() < 0.85) sys.glow.emit({ pos: [a[i3] + R.pm(0.05), a[i3 + 1] - 0.15, a[i3 + 2] + R.pm(0.05)], life: 0.5, size: 0.28 * size, sizeEnd: 0.03, color: 0xa8d8ff, hdr: 2, alpha: 0.6 * (1 - k), alphaEnd: 0, fade: 1.2 }); });
    }
    // ash column + low glow so the spot stays marked, and a shockwave for anything big
    pillar({ at: feet, color: 0xff8a3a, r: 0.55 * size, h: 3.2 * size, dur: 1.4, hdr: 1.3, alpha: 0.55, grow: 0.4 });
    smokePuffs(R, _p.set(feet.x, 0.5 * size, feet.z), n(8), { color: 0x4a4640, size: 0.8 * size, grow: 2.4, life: [1.4, 2.2], alpha: 0.45, spread: 0.5 * size, rise: 0.9 });
    chromaPunch(0.5);
    if (o.boss ?? size >= 2.2) { shockwave(feet, { radius: 3.5 * size, color: 0xffb060, shake: 0.9 }); chromaPunch(1); hitStop(120); crackDecal(feet, { size: 3 * size, color: 0xff8a30, dur: 2.6 }); }
    const coinsN = o.coins ?? (size >= 1.4 ? Math.round(5 * size) : 0);
    if (coinsN) coinSpill(R, _p.set(chest.x, groundY + 0.6, chest.z), n(coinsN), { power: 0.8, spread: 1.8 });
    return later(0.2);
  }

  // ---------------------------------------------------------------------------------------------
  // TARGET RING: animated dashed glowing selection ring projected on the ground
  // ---------------------------------------------------------------------------------------------
  const targetRings = [];
  function targetRing(actor, o = {}) {
    const m = new THREE.Mesh(SH.quadGeo, SH.targetMaterial()); m.rotation.x = -Math.PI / 2; m.frustumCulled = false; m.renderOrder = 4; scene.add(m);
    const u = m.material.uniforms; u.uColor.value.set(o.color ?? 0xff4d3a); u.uDash.value = o.dashes ?? 14; u.uAlpha.value = o.alpha ?? 1;
    const h = { mesh: m, actor: null, pos: new THREE.Vector3(), rad: 1, base: o.radius ?? 0, t: Math.random() * 6, visible: true, color: o.color ?? 0xff4d3a, dead: false, first: true };
    const feetOf = (a, out) => { if (a?.worldAnchor) a.worldAnchor('feet', out); else toV(a, out); out.y = groundY; return out; };
    const radiusOf = (a) => h.base || Math.max(0.95, (a?.radius || 0.6) * 1.55);
    h.move = (a) => { h.actor = a; if (h.first && a) { feetOf(a, h.pos); h.rad = radiusOf(a); h.first = false; } return h; };
    h.setColor = (c) => { h.color = c; u.uColor.value.set(c); return h; };
    h.setVisible = (v) => { h.visible = v; m.visible = v && !!h.actor; return h; };
    h.dispose = () => { h.dead = true; scene.remove(m); m.material.dispose(); const i = targetRings.indexOf(h); if (i >= 0) targetRings.splice(i, 1); };
    h.move(actor); targetRings.push(h);
    return h;
  }
  const _tf = new THREE.Vector3();
  function updateTargetRings(dt) {
    for (const h of targetRings) {
      h.t += dt; const u = h.mesh.material.uniforms; u.uTime.value = h.t;
      const a = h.actor; const show = h.visible && !!a && (a.root ? a.root.visible !== false : true);
      h.mesh.visible = show; if (!show) continue;
      if (a.worldAnchor) a.worldAnchor('feet', _tf); else toV(a, _tf);
      const k = 1 - Math.exp(-14 * dt);
      h.pos.x += (_tf.x - h.pos.x) * k; h.pos.z += (_tf.z - h.pos.z) * k;
      const r = h.base || Math.max(0.95, (a.radius || 0.6) * 1.55); h.rad += (r - h.rad) * k;
      const sc = h.rad * (1 + Math.sin(h.t * 4) * 0.025);
      h.mesh.position.set(h.pos.x, groundY + 0.035, h.pos.z); h.mesh.scale.set(sc, sc, 1);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // AMBIENT: optional additive particle layers that keep static frames alive. Default off.
  //   vfx.ambient('embers' | 'dust' | 'ash' | 'fireflies' | 'leaves' | 'snow', { intensity, color, area }) -> { stop(), set(i) }
  //   vfx.ambient(null) stops every layer. Embers come in three depths: far (tiny), mid, near (big and soft).
  // ---------------------------------------------------------------------------------------------
  const amb = {}; const ambLive = new Map();
  function ambSys(name) {
    if (amb[name]) return amb[name];
    const def = { glow: ['glow', 'add', 520], dot: ['dot', 'add', 420], dotN: ['dot', 'normal', 520], leaf: ['chunk', 'normal', 120] }[name];
    const q = new Quads({ max: def[2], map: vtex(def[0]), blend: def[1], depthTest: true, renderOrder: 6, name: `vfx-amb-${name}` });
    q.object.visible = false; scene.add(q.object); amb[name] = q; sys[`amb_${name}`] = q; return q;
  }
  const AMBIENT = {
    embers: { layers: [
      { rate: 9, z: [-9, -4], make: (R, p, age) => ({ sys: 'glow', size: R.rr(0.09, 0.16), color: R.r() < 0.5 ? 0xff9a3a : 0xff5a1a, hdr: 1.8, alpha: 0.75, life: R.rr(7, 11), vy: R.rr(0.2, 0.5), turb: 0.5, fadeIn: 0.2 }) },
      { rate: 7, z: [-4, 2.5], make: (R) => ({ sys: 'glow', size: R.rr(0.14, 0.26), color: R.r() < 0.5 ? 0xffb050 : 0xff6a20, hdr: 2.0, alpha: 0.85, life: R.rr(6, 9), vy: R.rr(0.3, 0.7), turb: 0.7, fadeIn: 0.2 }) },
      { rate: 1.4, z: [3, 7], make: (R) => ({ sys: 'glow', size: R.rr(0.5, 0.9), color: 0xff8a30, hdr: 1.4, alpha: 0.3, life: R.rr(6, 9), vy: R.rr(0.35, 0.7), turb: 0.9, fadeIn: 0.3 }) }] },
    dust: { layers: [
      { rate: 9, z: [-5, 3], shaft: true, make: (R, p) => ({ sys: 'dot', size: R.rr(0.04, 0.08), color: 0xffe6b8, hdr: 1.8, alpha: p.inShaft ? 0.95 : 0.22, life: R.rr(8, 13), vy: R.rr(-0.04, 0.1), turb: 0.25, fadeIn: 0.3 }) }] },
    ash: { layers: [
      { rate: 9, z: [-7, 3], top: true, make: (R) => ({ sys: 'dotN', size: R.rr(0.03, 0.06), color: R.r() < 0.5 ? 0x9a948c : 0x5a5650, alpha: 0.6, life: R.rr(9, 13), vy: -R.rr(0.3, 0.65), turb: 0.8, fadeIn: 0.1 }) },
      { rate: 2.5, z: [3, 7], top: true, make: (R) => ({ sys: 'dotN', size: R.rr(0.1, 0.17), color: 0x8a847c, alpha: 0.3, life: R.rr(9, 12), vy: -R.rr(0.4, 0.8), turb: 1, fadeIn: 0.1 }) }] },
    fireflies: { layers: [
      { rate: 2.4, z: [-6, 4], low: true, make: (R) => ({ sys: 'glow', size: R.rr(0.09, 0.15), color: R.r() < 0.7 ? 0xc8ff6a : 0xffe36a, hdr: 2.6, alpha: 0.95, life: R.rr(4, 7), vy: R.pm(0.1), turb: 1.3, fadeIn: 0.35, fade: 0.7 }) }] },
    leaves: { layers: [
      { rate: 2, z: [-6, 5], top: true, make: (R) => ({ sys: 'leaf', size: R.rr(0.07, 0.11), color: R.r() < 0.5 ? 0x8a5a2a : 0x6a4a22, alpha: 0.95, life: R.rr(9, 12), vy: -R.rr(0.35, 0.6), turb: 1.6, fadeIn: 0.05, spin: R.pm(3) }) }] },
    snow: { layers: [
      { rate: 16, z: [-7, 4], top: true, make: (R) => ({ sys: 'dotN', size: R.rr(0.03, 0.055), color: 0xeef4ff, alpha: 0.85, life: R.rr(7, 10), vy: -R.rr(0.7, 1.1), turb: 0.5, fadeIn: 0.08 }) },
      { rate: 2.5, z: [3, 7], top: true, make: (R) => ({ sys: 'dotN', size: R.rr(0.09, 0.16), color: 0xdde8ff, alpha: 0.4, life: R.rr(7, 10), vy: -R.rr(0.9, 1.3), turb: 0.7, fadeIn: 0.08 }) }] },
  };
  AMBIENT.motes = AMBIENT.dust;
  function ambient(kind, o = {}) {
    if (!kind || kind === 'off') { for (const h of [...ambLive.values()]) h.stop(); return null; }
    const spec = AMBIENT[kind]; if (!spec) return null;
    ambLive.get(kind)?.stop();
    const R = rngOf(o); const area = o.area || {}; const ax = area.x || [-10, 10]; const ay = area.y || [0, 6]; const cx = o.center ?? 0;
    const h = { kind, intensity: o.intensity ?? 1, acc: spec.layers.map(() => 0), alive: true };
    const place = (L) => {
      const z = R.rr(L.z[0], L.z[1]); const x = R.rr(ax[0], ax[1]) + cx;
      let y = R.rr(ay[0] + 0.1, ay[1]); const p = { inShaft: false };
      if (L.low) y = R.rr(0.25, 2.4);
      if (L.top) y = R.rr(1, ay[1] + 1);
      if (L.shaft) { const f = R.r(); if (R.r() < 0.7) { const sx = -6 + f * 5 + R.pm(0.9); const sy = 6 - f * 5.5 + R.pm(0.5); p.inShaft = true; return { x: sx + cx, y: Math.max(0.2, sy), z, p }; } }
      return { x, y, z, p };
    };
    const spawn = (L, age) => {
      const q = place(L); const m = L.make(R, q.p);
      const S = ambSys(m.sys); const drift = R.pm(0.15) + (kind === 'leaves' ? 0.25 : 0) + (kind === 'ash' ? 0.12 : 0);
      S.emit({ pos: [q.x, q.y, q.z], vel: [drift, m.vy, R.pm(0.08)], life: m.life, age: age ?? 0, size: m.size, sizeEnd: m.size * (m.sys === 'glow' ? 0.6 : 1), color: o.color ?? m.color, hdr: m.hdr ?? 1, alpha: m.alpha * Math.min(1, h.intensity + 0.15), alphaEnd: 0, fadeIn: m.fadeIn ?? 0.15, fade: m.fade ?? 1.2, turbulence: m.turb, drag: 0.1, rot: R.r() * TAU, spin: m.spin ?? 0 });
    };
    // pre-warm so the frame is already alive the moment it is enabled
    spec.layers.forEach((L) => { const cnt = Math.round(L.rate * 8 * h.intensity * Q); for (let i = 0; i < cnt; i++) spawn(L, R.r() * 7); });
    h.upd = (dt) => {
      if (!h.alive) return false;
      spec.layers.forEach((L, i) => { h.acc[i] += L.rate * dt * Q * h.intensity; while (h.acc[i] >= 1) { h.acc[i] -= 1; spawn(L, 0); } });
      return true;
    };
    h.set = (v) => { h.intensity = v; return h; };
    h.stop = () => { h.alive = false; ambLive.delete(kind); };
    ambLive.set(kind, h);
    return h;
  }
  function updateAmbient(dt) { for (const h of ambLive.values()) h.upd(dt); }

  // ---------------------------------------------------------------------------------------------
  // misc wrappers
  // ---------------------------------------------------------------------------------------------
  const followers = [];
  function trail(object, o = {}) {
    const tr = strips.trail({ color: o.color ?? 0xffffff, color2: o.color2, width: o.width ?? 0.08, life: o.life ?? 0.35, hdr: o.hdr ?? 1.6, alpha: o.alpha ?? 1 });
    const f = { obj: object, tr, v: new THREE.Vector3(), off: o.offset ? toV(o.offset) : null };
    followers.push(f);
    return { stop() { tr.end(); const i = followers.indexOf(f); if (i >= 0) followers.splice(i, 1); } };
  }
  function muzzle(at, o = {}) {
    const p = toV(at); const R = rngOf(o); const c = o.color ?? 0xffd890; const dirV = o.dir ? toV(o.dir).normalize() : null;
    camBasis();
    flare(p, { color: lerpHex(c, 0xffffff, 0.5), size: (o.size ?? 1) * 1.4, life: 0.12, hdr: 3, R });
    sys.flare.emit({ pos: p, life: 0.12, size: 2.2 * (o.size ?? 1), sizeEnd: 2.8 * (o.size ?? 1), color: c, hdr: 2, alpha: 1, alphaEnd: 0, rot: dirV ? Math.atan2(cu.dot(dirV), cr.dot(dirV)) : 0, aspect: 0.18, fade: 0.6 });
    sparks(R, p, n(10), { color: 0xfff0c0, colorEnd: c, speed: [3, 9], dirV, spread: 0.7, size: 0.03, life: [0.15, 0.35] });
    lightFlash(p, c, 40, 0.14);
    return later(0.02);
  }
  const screenFlash = (color = 0xffffff, amt = 0.4) => stage.flash?.(color, amt);
  function vignettePulse(color = 0xff2a18, amt = 0.6, dur = 0.5) {
    const isRed = new THREE.Color(color).r > 0.7 && new THREE.Color(color).g < 0.4;
    if (isRed) stage.hurt?.(amt);
    task(dur, (dt, k) => { vig(color, amt * 0.5 * (1 - k) ** 1.5); });
  }

  // ---------------------------------------------------------------------------------------------
  // Keep effect geometry out of the GTAO depth/normal pre-pass: flat transparent quads would otherwise
  // punch black rectangles of "occlusion" into the picture at --q high.
  // ---------------------------------------------------------------------------------------------
  const aoSkip = () => [...Object.values(sys).map((x) => x.object), ...rings.map((x) => x.mesh), ...decals.map((x) => x.mesh), ...slashes.map((x) => x.mesh), ...shields.map((x) => x.mesh),
    ...pillars.map((x) => x.mesh), ...shellsP.map((x) => x.mesh), ...glyphs.map((x) => x.mesh), ...rifts.map((x) => x.mesh), ...strips.meshes, ...text.pool.map((x) => x.mesh), text.bmesh, overlay, ...discs.map((x) => x.mesh), ...targetRings.map((x) => x.mesh), ...(chainMesh ? chainMesh.map((x) => x.mesh) : [])];
  if (stage.post?.gtao && !stage.post.gtao._vfxHooked) {
    const g = stage.post.gtao; const orig = g.render.bind(g); g._vfxHooked = true;
    g.render = function (...args) {
      const list = aoSkip(); const vis = list.map((o) => o.visible); list.forEach((o) => { o.visible = false; });
      try { return orig(...args); } finally { list.forEach((o, i) => { o.visible = vis[i]; }); }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // frame loop
  // ---------------------------------------------------------------------------------------------
  const off = stage.onFrame((dt, t) => {
    T += dt;
    camBasis();
    // timers
    if (timers.length) {
      let w = 0; fireList.length = 0;
      for (let i = 0; i < timers.length; i++) { const tm = timers[i]; tm.t -= dt; if (tm.t <= 0) fireList.push(tm); else timers[w++] = tm; }
      timers.length = w;
      for (const tm of fireList) { try { tm.fn?.(); } catch (e) { console.error(e); } tm.res(); }
    }
    // tasks
    if (tasks.length) {
      let w = 0;
      for (let i = 0; i < tasks.length; i++) {
        const ts = tasks[i]; ts.t += dt; const k = Math.min(1, ts.t / ts.dur);
        try { ts.fn(dt, k, ts.t); } catch (e) { console.error(e); }
        if (ts.t >= ts.dur) { try { ts.done?.(); } catch (e) { console.error(e); } ts.res(); } else tasks[w++] = ts;
      }
      tasks.length = w;
    }
    for (const f of followers) { toV(f.obj, f.v); if (f.off) f.v.add(f.off); f.tr.push(f.v.x, f.v.y, f.v.z); }
    for (let i = liveAuras.length - 1; i >= 0; i--) if (!liveAuras[i].upd(dt)) liveAuras.splice(i, 1);
    for (const s of Object.values(sys)) s.update(dt);
    updateRings(dt); updateSlashes(dt); updateShields(dt); updatePillars(dt); updateShells(dt); updateDecals(dt);
    strips.update(dt, T);
    text.update(dt);
    updateLights(dt);
    updateOverlay();
    updatePunch(dt);
    updateTargetRings(dt); updateAmbient(dt); updateFlames(dt);
  });

  // ---------------------------------------------------------------------------------------------
  const api = {
    // hits
    slash, impact, projectile, beam, lightning, nova,
    // defence
    shield, blockSpark,
    // gains
    heal, magicGain, goldGain, pierceGain,
    // auras and telegraphs
    aura,
    // ground
    groundRing, dust, footstep, shockwave,
    // death
    death,
    // text
    damageNumber: (pos, textStr, o) => text.damageNumber(toV(pos), textStr, o),
    banner3D: (textStr, o) => text.banner(textStr, o),
    // wrappers
    trail, muzzle, screenFlash, vignettePulse,
    // telegraphs and selection
    telegraph, targetRing,
    // ambient layers (default off)
    ambient, ambientFor, flame,
    // hit feel
    hitStop, punch: chromaPunch, options: vfxOpts,
    // utilities
    screenToWorld, later,
    stats() { return { live: Object.fromEntries(Object.entries(sys).map(([k, s]) => [k, s.live])), lights: lights.map((l) => +l.l.intensity.toFixed(1)), tasks: tasks.length, timers: timers.length, rings: ringLive.length }; },
    sys, lights,
    dispose() { off(); for (const s of Object.values(sys)) { scene.remove(s.object); s.geo.dispose(); } },
  };
  return api;
}
