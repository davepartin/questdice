// Tray effects: payout pulses, synergy light-lines, lock flare, dust and spark puffs.
// Everything is additive sprites / one small tube mesh, driven by the tray's clock.

import * as THREE from 'three';
import { Particles } from '../particles.js';
import { sprite } from '../tex.js';
import { mulberry32 } from '../noise.js';

export const PULSE_COLORS = { gold: 0xf0b43c, pierce: 0xb07dff, magic: 0xffd23d, atk: 0xff4d4d, block: 0x4db4ff, heal: 0x45e08b };
export const NAMED = { red: 0xff4d4d, blue: 0x4db4ff, gold: 0xffd23d, yellow: 0xffd23d, purple: 0xb07dff, green: 0x45e08b, white: 0xfff4d8 };
const colorOf = (c, d = 0xffd23d) => (typeof c === 'number' ? c : NAMED[c] ?? PULSE_COLORS[c] ?? (typeof c === 'string' ? new THREE.Color(c).getHex() : d));

const lineVS = /* glsl */`
  varying vec2 vUv; varying float vW;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; }`;
const lineFS = /* glsl */`
  uniform vec3 uColor; uniform float uHead; uniform float uFade; uniform float uTime;
  varying vec2 vUv;
  void main(){
    float u = vUv.x; float v = abs(vUv.y - 0.5) * 2.0;
    float core = smoothstep(1.0, 0.0, v);
    float behind = clamp(uHead - u, 0.0, 1.0);
    float lit = step(u, uHead);
    float trail = lit * (0.35 + 0.65 * exp(-behind * 3.0));
    float head = exp(-abs(u - uHead) * 28.0) * 2.5;
    float shimmer = 0.85 + 0.15 * sin(u * 40.0 - uTime * 9.0);
    float a = (trail * shimmer + head) * (core * core * 0.9 + 0.15 * core) * uFade;
    vec3 col = mix(uColor, vec3(1.0), head * 0.35 + core * core * 0.25);
    gl_FragColor = vec4(col * a * 4.0, a);
  }`;

export function createFX({ root, stage, getCenter, dieHeight }) {
  const rnd = mulberry32(4242);
  const q = stage.quality;
  const dust = new Particles({ max: q === 'low' ? 80 : 200, sprite: 'smoke', blending: 'normal', gravity: 0.05, drag: 1.8, renderOrder: 4 });
  const sparks = new Particles({ max: q === 'low' ? 160 : 420, sprite: 'dot', blending: 'add', gravity: -1.5, drag: 0.8, renderOrder: 6 });
  const glows = new Particles({ max: 60, sprite: 'glow', blending: 'add', gravity: 0, drag: 0, renderOrder: 7 });
  root.add(dust.object, sparks.object, glows.object);

  // ---- ring pool (expanding shock ring on the table, used by pulses, settles, flare)
  const ringTex = sprite('ring');
  const rings = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 8; root.add(m);
    rings.push({ m, t: 1, dur: 1, s0: 1, s1: 2, a: 1, free: true });
  }
  const _c = new THREE.Color();
  function ring(x, y, z, color, { dur = 0.6, s0 = 0.6, s1 = 2.4, a = 1.2 } = {}) {
    const r = rings.find((o) => o.free) || rings[0];
    r.free = false; r.t = 0; r.dur = dur; r.s0 = s0; r.s1 = s1; r.a = a;
    r.m.position.set(x, y, z); r.m.material.color.setHex(color).multiplyScalar(a); r.m.visible = true;
    r.m.scale.setScalar(s0);
  }

  // ---- puffs
  function dustPuff(x, z, speed) {
    const n = Math.min(10, 3 + Math.round(speed * 0.5));
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2; const sp = 0.35 + rnd() * 0.5;
      dust.emit({ pos: [x + Math.cos(a) * 0.2, 0.04, z + Math.sin(a) * 0.2], vel: [Math.cos(a) * sp, 0.25 + rnd() * 0.35, Math.sin(a) * sp], life: 0.55 + rnd() * 0.35, size: 0.22 + rnd() * 0.16, sizeEnd: 0.6 + rnd() * 0.3, color: 0x8a7a66, colorEnd: 0x2a2420, alpha: 0.28 + Math.min(0.2, speed * 0.015), alphaEnd: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 1.5 });
    }
  }
  function sparkBurst(x, y, z, n, color, { speed = 2.4, up = 1.4, size = 0.05, life = 0.5 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2; const sp = speed * (0.3 + rnd() * 0.8);
      sparks.emit({ pos: [x, y, z], vel: [Math.cos(a) * sp, up * (0.4 + rnd()), Math.sin(a) * sp], life: life * (0.6 + rnd() * 0.8), size: size * (0.6 + rnd()), sizeEnd: 0.01, color, colorEnd: 0xff5a10, alpha: 1, alphaEnd: 0, gravity: -6, drag: 0.7 });
    }
  }
  function impact(x, z, speed) {
    if (speed > 4.5) dustPuff(x, z, speed);
    if (speed > 6) sparkBurst(x, 0.05, z, Math.min(14, 4 + Math.round(speed)), 0xffc873, { speed: 1.8 + speed * 0.12, up: 0.8, size: 0.035, life: 0.4 });
    if (speed > 9) ring(x, 0.006, z, 0xffc873, { dur: 0.35, s0: 0.5, s1: 1.7, a: 0.5 });
  }

  // ---- payout pulse
  function pulse(slot, kind) {
    const c = colorOf(kind, 0xffd23d); const p = getCenter(slot);
    ring(p.x, 0.01, p.z, c, { dur: 0.7, s0: 0.7, s1: 2.5, a: 1.6 });
    ring(p.x, 0.012, p.z, 0xffffff, { dur: 0.45, s0: 0.5, s1: 1.7, a: 0.7 });
    glows.emit({ pos: [p.x, p.y + 0.15, p.z], vel: [0, 0.4, 0], life: 0.6, size: 1.6, sizeEnd: 2.6, color: c, alpha: 0.85, alphaEnd: 0 });
    sparkBurst(p.x, p.y + 0.15, p.z, q === 'low' ? 10 : 22, c, { speed: 2.6, up: 3.2, size: 0.06, life: 0.7 });
    if (kind === 'gold') for (let i = 0; i < 5; i++) sparks.emit({ pos: [p.x + (rnd() - 0.5) * 0.4, p.y + 0.3, p.z + (rnd() - 0.5) * 0.4], vel: [(rnd() - 0.5) * 0.6, 1.6 + rnd(), (rnd() - 0.5) * 0.6], life: 0.9, size: 0.09, color: 0xffe08a, colorEnd: 0xe0a020, alpha: 1, alphaEnd: 0, gravity: -2 });
    return c;
  }

  // ---- synergy light line
  const lines = [];
  function highlight(points, color, { hold = 1.5, sweep = 0.55, radius = 0.085 } = {}) {
    const col = colorOf(color, 0xff4d4d);
    const pts = points.map((p) => p.clone());
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3) : new THREE.LineCurve3(pts[0], pts[1] || pts[0].clone().add(new THREE.Vector3(0.01, 0, 0)));
    // a flat ribbon lying on the dice (so it reads from a high camera): tube with squashed section
    const geo = new THREE.TubeGeometry(curve, 48, radius, 6, false);
    const mat = new THREE.ShaderMaterial({ vertexShader: lineVS, fragmentShader: lineFS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, uniforms: { uColor: { value: new THREE.Color(col) }, uHead: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } } });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 12; mesh.frustumCulled = false; root.add(mesh);
    const L = { mesh, mat, curve, t: 0, sweep, hold, col, emitted: 0, done: null, pts };
    const prom = new Promise((res) => { L.done = res; });
    lines.push(L);
    return { promise: prom, line: L };
  }
  function clearHighlights(fast = true) { for (const L of lines) { L.hold = Math.min(L.hold, L.t - L.sweep + (fast ? 0.15 : 0.5)); } }

  const _v = new THREE.Vector3();
  function update(dt, t) {
    dust.material.uniforms.uScale.value = sparks.material.uniforms.uScale.value = glows.material.uniforms.uScale.value = (stage.height * stage.dpr) / (2 * Math.tan((stage.camera.fov * Math.PI) / 360));
    dust.update(dt); sparks.update(dt); glows.update(dt);
    for (const r of rings) {
      if (r.free) continue;
      r.t += dt; const k = r.t / r.dur;
      if (k >= 1) { r.free = true; r.m.visible = false; continue; }
      const e = 1 - (1 - k) ** 3; r.m.scale.setScalar(r.s0 + (r.s1 - r.s0) * e);
      r.m.material.opacity = (1 - k) * (1 - k);
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const L = lines[i]; L.t += dt;
      const head = Math.min(1.02, L.t / L.sweep);
      L.mat.uniforms.uHead.value = head; L.mat.uniforms.uTime.value = t;
      const idle = L.t - L.sweep;
      const breathe = 0.82 + 0.18 * Math.sin(t * 5);
      const fadeOut = idle > L.hold ? Math.max(0, 1 - (idle - L.hold) / 0.4) : 1;
      L.mat.uniforms.uFade.value = (head < 1 ? 1 : breathe) * fadeOut;
      // sparks along the head
      if (head < 1.0 && head > 0) {
        L.curve.getPointAt(Math.min(0.999, head), _v);
        for (let k = 0; k < 3; k++) sparks.emit({ pos: [_v.x, _v.y, _v.z], vel: [(rnd() - 0.5) * 1.2, 0.4 + rnd() * 1.3, (rnd() - 0.5) * 1.2], life: 0.5 + rnd() * 0.4, size: 0.05 + rnd() * 0.04, sizeEnd: 0.01, color: L.col, colorEnd: 0xffffff, alpha: 1, alphaEnd: 0, gravity: -2.5, drag: 0.5 });
      } else if (fadeOut > 0.99 && rnd() < 0.5) {
        L.curve.getPointAt(rnd() * 0.999, _v);
        sparks.emit({ pos: [_v.x, _v.y, _v.z], vel: [(rnd() - 0.5) * 0.4, 0.5 + rnd() * 0.5, (rnd() - 0.5) * 0.4], life: 0.7, size: 0.04, sizeEnd: 0.01, color: L.col, alpha: 0.9, alphaEnd: 0, gravity: -1 });
      }
      if (idle > L.hold + 0.4) { root.remove(L.mesh); L.mesh.geometry.dispose(); L.mat.dispose(); lines.splice(i, 1); L.done?.(true); }
    }
  }
  function dispose() { for (const L of lines) { root.remove(L.mesh); L.mesh.geometry.dispose(); L.mat.dispose(); L.done?.(false); } lines.length = 0; for (const r of rings) { r.m.geometry.dispose(); r.m.material.dispose(); root.remove(r.m); } for (const p of [dust, sparks, glows]) { root.remove(p.object); p.object.geometry.dispose(); p.material.dispose(); } }
  return { dust, sparks, glows, ring, dustPuff, sparkBurst, impact, pulse, highlight, clearHighlights, update, dispose, activeLines: () => lines.length };
}
