// Particles on the GPU: one THREE.Points per system with per-particle size, colour, rotation and
// age handled in the shader. CPU only writes spawn data and integrates a simple Euler step.
//
//   const embers = new Particles({ max: 400, sprite: 'dot', blending: 'add', gravity: -0.4 });
//   scene.add(embers.object);
//   stage.onFrame((dt) => embers.update(dt));
//   embers.emit({ pos: [0,1,0], vel: [0,1,0], life: 2, size: 0.08, color: 0xff8a2a, ... });
//   embers.burst(30, () => ({ ... }));
//
// emit() options: pos, vel, life, size, sizeEnd, color, colorEnd, alpha, alphaEnd, drag, gravity, spin, turbulence

import * as THREE from 'three';
import { sprite } from './tex.js';

const VS = /* glsl */`
  attribute float aSize; attribute vec4 aColor; attribute float aRot; attribute float aAge; attribute float aLife; attribute float aSizeEnd; attribute vec4 aColorEnd;
  uniform float uScale; uniform float uStretch;
  varying vec4 vColor; varying float vRot;
  void main(){
    float k = clamp(aAge / aLife, 0.0, 1.0);
    vColor = mix(aColor, aColorEnd, k);
    vRot = aRot;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float s = mix(aSize, aSizeEnd, k);
    gl_PointSize = s * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
    if (aAge >= aLife || aLife <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }`;
const FS = /* glsl */`
  uniform sampler2D uMap; varying vec4 vColor; varying float vRot;
  void main(){
    vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
    vec4 t = texture2D(uMap, p);
    gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.003) discard;
  }`;

const _c = new THREE.Color();
export class Particles {
  constructor({ max = 256, sprite: spr = 'glow', blending = 'add', gravity = 0, drag = 0, depthTest = true, scale = 1, renderOrder = 5 } = {}) {
    this.max = max; this.gravity = gravity; this.drag = drag; this.cursor = 0; this.live = 0;
    const g = new THREE.BufferGeometry();
    const f = (n) => new THREE.BufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    this.a = { position: f(3), aSize: f(1), aSizeEnd: f(1), aColor: f(4), aColorEnd: f(4), aRot: f(1), aAge: f(1), aLife: f(1) };
    for (const [k, v] of Object.entries(this.a)) g.setAttribute(k, v);
    this.vel = new Float32Array(max * 3); this.spin = new Float32Array(max); this.dragA = new Float32Array(max); this.grav = new Float32Array(max); this.turb = new Float32Array(max);
    for (let i = 0; i < max; i++) { this.a.aLife.array[i] = 0; this.a.aAge.array[i] = 1; }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest,
      blending: blending === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uMap: { value: typeof spr === 'string' ? sprite(spr) : spr }, uScale: { value: 600 * scale }, uStretch: { value: 0 } },
    });
    this.object = new THREE.Points(g, this.material);
    this.object.frustumCulled = false; this.object.renderOrder = renderOrder;
  }
  // The point-size scale depends on viewport height; the stage calls this on resize if you want exact sizes.
  setViewportHeight(h, fovDeg = 42) { this.material.uniforms.uScale.value = h / (2 * Math.tan((fovDeg * Math.PI) / 360)); }
  emit(o = {}) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const a = this.a;
    const p = o.pos || [0, 0, 0]; const v = o.vel || [0, 0, 0];
    a.position.setXYZ(i, p[0], p[1], p[2]);
    this.vel[i * 3] = v[0]; this.vel[i * 3 + 1] = v[1]; this.vel[i * 3 + 2] = v[2];
    const life = o.life ?? 1;
    a.aLife.array[i] = life; a.aAge.array[i] = 0;
    a.aSize.array[i] = o.size ?? 0.1; a.aSizeEnd.array[i] = o.sizeEnd ?? o.size ?? 0.1;
    _c.set(o.color ?? 0xffffff); const al = o.alpha ?? 1;
    a.aColor.setXYZW(i, _c.r, _c.g, _c.b, al);
    _c.set(o.colorEnd ?? o.color ?? 0xffffff);
    a.aColorEnd.setXYZW(i, _c.r, _c.g, _c.b, o.alphaEnd ?? 0);
    a.aRot.array[i] = o.rot ?? 0; this.spin[i] = o.spin ?? 0;
    this.dragA[i] = o.drag ?? this.drag; this.grav[i] = o.gravity ?? this.gravity; this.turb[i] = o.turbulence ?? 0;
    this.dirty = true;
    return i;
  }
  burst(n, make) { for (let i = 0; i < n; i++) this.emit(make(i, n)); }
  update(dt) {
    const a = this.a; const pos = a.position.array; const age = a.aAge.array; const life = a.aLife.array; const rot = a.aRot.array;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (age[i] >= life[i]) continue;
      any = true;
      age[i] += dt;
      const k = i * 3; const drag = Math.exp(-this.dragA[i] * dt);
      const tb = this.turb[i];
      this.vel[k] = this.vel[k] * drag + (tb ? (Math.sin(age[i] * 3.1 + i) * tb) * dt : 0);
      this.vel[k + 1] = this.vel[k + 1] * drag + this.grav[i] * dt;
      this.vel[k + 2] = this.vel[k + 2] * drag + (tb ? (Math.cos(age[i] * 2.7 + i * 1.7) * tb) * dt : 0);
      pos[k] += this.vel[k] * dt; pos[k + 1] += this.vel[k + 1] * dt; pos[k + 2] += this.vel[k + 2] * dt;
      rot[i] += this.spin[i] * dt;
    }
    if (any || this.dirty) {
      for (const at of Object.values(a)) at.needsUpdate = true;
      this.dirty = false;
    }
  }
  clear() { this.a.aAge.array.fill(1); this.a.aLife.array.fill(0); for (const at of Object.values(this.a)) at.needsUpdate = true; }
}
