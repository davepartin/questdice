// The camera director: named shots that adapt to the viewport (landscape desktop vs portrait
// phone), smooth cinematic moves between them, idle breathing, and combat punch-ins.
import * as THREE from 'three';
import { damp } from '../gfx/util.js';

// Each shot: land = wide screens, port = tall phones. Blended by aspect ratio.
export const SHOTS = {
  battle: {
    land: { pos: [0.5, 4.2, 10.0], look: [0, 1.15, 0.7], fov: 36 },
    port: { pos: [0.3, 5.6, 10.6], look: [0, 0.9, 0.8], fov: 48 },
  },
  intro: {
    land: { pos: [-3.5, 2.2, 11.5], look: [0, 1.5, -1], fov: 42 },
    port: { pos: [-2.5, 3.6, 11.5], look: [0, 1.4, -1], fov: 64 },
  },
  attack: {
    land: { pos: [-0.2, 2.7, 7.4], look: [0.2, 1.5, -0.6], fov: 36 },
    port: { pos: [-0.2, 3.9, 7.8], look: [0.1, 1.2, -0.6], fov: 56 },
  },
  defend: {
    land: { pos: [1.8, 2.5, 6.6], look: [-1.4, 1.4, 1.2], fov: 38 },
    port: { pos: [1.4, 3.6, 7.0], look: [-0.9, 1.1, 1.2], fov: 56 },
  },
  victory: {
    land: { pos: [1.2, 1.7, 6.2], look: [-1.5, 1.35, 1.6], fov: 36 },
    port: { pos: [0.6, 1.9, 6.4], look: [-1.1, 1.3, 1.6], fov: 52 },
  },
  title: {
    land: { pos: [3.2, 1.6, 7.0], look: [-1.0, 1.7, 0], fov: 36 },
    port: { pos: [2.0, 1.6, 7.6], look: [-0.7, 1.7, 0], fov: 50 },
  },
  camp: {
    land: { pos: [2.6, 1.9, 6.2], look: [-0.4, 1.2, 0], fov: 38 },
    port: { pos: [1.8, 2.0, 7.2], look: [-0.3, 1.2, 0], fov: 54 },
  },
  road: {
    land: { pos: [0, 9.5, 8.5], look: [0, 0, 0], fov: 38 },
    port: { pos: [0, 12, 8.5], look: [0, 0, 0.5], fov: 54 },
  },
};

export class Director {
  constructor(stage) {
    this.stage = stage;
    this.cur = { pos: new THREE.Vector3(0, 3, 9), look: new THREE.Vector3(0, 1, 0), fov: 40 };
    this.tgt = { pos: new THREE.Vector3(0, 3, 9), look: new THREE.Vector3(0, 1, 0), fov: 40 };
    this.shot = 'battle'; this.punchK = 0; this.lambda = 3.2; this.sway = 1; this.offset = new THREE.Vector3();
    this._v = new THREE.Vector3(); this.manualOverride = false;
    this.set('battle', { snap: true });
    this.safe = { bottom: 0, top: 0 };
    this.attach();
    stage.onResize = () => this.applySafe();
  }
  // 0 = wide landscape, 1 = tall portrait
  get portrait() { const a = this.stage.camera.aspect; return Math.min(1, Math.max(0, (1.55 - a) / (1.55 - 0.62))); }
  resolve(name) {
    const s = SHOTS[name] || SHOTS.battle; const k = this.portrait;
    const l = (a, b) => a + (b - a) * k;
    return {
      pos: new THREE.Vector3(l(s.land.pos[0], s.port.pos[0]), l(s.land.pos[1], s.port.pos[1]), l(s.land.pos[2], s.port.pos[2])),
      look: new THREE.Vector3(l(s.land.look[0], s.port.look[0]), l(s.land.look[1], s.port.look[1]), l(s.land.look[2], s.port.look[2])),
      fov: l(s.land.fov, s.port.fov),
    };
  }
  set(name, { snap = false, lambda } = {}) {
    this.shot = name; this.lambda = lambda ?? 3.2;
    const r = this.resolve(name);
    this.tgt.pos.copy(r.pos); this.tgt.look.copy(r.look); this.tgt.fov = r.fov;
    if (snap) { this.cur.pos.copy(r.pos); this.cur.look.copy(r.look); this.cur.fov = r.fov; this.apply(0); }
  }
  // (Re)register the per-frame hook: stage.clearScene() drops all frame hooks, so world.clear() re-attaches.
  attach() { this.off?.(); this.off = this.stage.onFrame((dt, t) => this.update(dt, t)); }
  // Reserve screen space for the HUD (px at the bottom/top): the 3D composition is centred in what is left.
  setSafe(bottom = 0, top = 0) { this.safe = { bottom, top }; this.applySafe(); }
  // `layout(W, H)` (set by the menu screens) may return { left, right, top, bottom } px of DOM panel space instead.
  applySafe() {
    const cam = this.stage.camera; const W = this.stage.width; const H = this.stage.height;
    const L = this.layout ? this.layout(W, H) : null;
    const sh = L ? ((L.bottom || 0) - (L.top || 0)) / 2 : ((this.safe?.bottom || 0) - (this.safe?.top || 0)) / 2;
    const sx = L ? ((L.right || 0) - (L.left || 0)) / 2 : 0;
    if (Math.abs(sh) < 1 && Math.abs(sx) < 1) { cam.clearViewOffset(); return; }
    cam.setViewOffset(W, H, sx, sh, W, H);
  }
  // kick the field of view for impact; decays on its own
  punch(k = 1) { this.punchK = Math.max(this.punchK, k); }
  update(dt, t) {
    if (this.manualOverride) return;
    // re-resolve every frame so rotating a phone / resizing re-frames immediately
    const r = this.resolve(this.shot);
    this.tgt.pos.copy(r.pos); this.tgt.look.copy(r.look); this.tgt.fov = r.fov;
    const k = 1 - Math.exp(-this.lambda * dt);
    this.cur.pos.lerp(this.tgt.pos, k); this.cur.look.lerp(this.tgt.look, k); this.cur.fov += (this.tgt.fov - this.cur.fov) * k;
    this.punchK = Math.max(0, this.punchK - dt * 3.2);
    this.apply(t);
  }
  apply(t) {
    const cam = this.stage.camera; const s = this.sway;
    cam.position.copy(this.cur.pos);
    cam.position.x += Math.sin(t * 0.31) * 0.09 * s; cam.position.y += Math.sin(t * 0.23 + 1) * 0.05 * s;
    cam.position.add(this.offset);
    cam.lookAt(this._v.copy(this.cur.look).add(this.offset));
    const f = this.cur.fov - this.punchK * this.punchK * 2.6;
    if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); }
  }
}
