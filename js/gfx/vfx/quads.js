// Instanced billboard quads: one draw call per system, camera-facing, world-sized (so they never hit the
// GL point-size limit like THREE.Points do) and able to stretch along their velocity (sparks, streaks).
//
//   const q = new Quads({ max: 600, map: vtex('glow'), blend: 'add' });
//   q.emit({ pos, vel, life, size, sizeEnd, color, colorEnd, alpha, alphaEnd, rot, spin, drag, gravity,
//            turbulence, mode: 'bb'|'streak'|'coin', stretch, fadeIn, fade, grow, aspect, floor, bounce, path });
//
// Modes: 'bb' camera-facing billboard, 'streak' stretched along velocity (tail = |v| * stretch seconds),
// 'coin' billboard whose width flips with rot (a spinning coin) and glints. `path: {p0,c,p1}` drives the
// position along a quadratic bezier over the particle's life (used for motes streaming to the HUD).
// Colours may exceed 1 (HDR) so the bloom pass picks them up.

import * as THREE from 'three';

const VS = /* glsl */`
  attribute vec3 aPos; attribute vec3 aVel; attribute vec4 aT; attribute vec4 aS; attribute vec4 aC; attribute vec4 aC2; attribute vec4 aX;
  varying vec2 vUv; varying vec4 vColor; varying float vCoin;
  void main(){
    float age = aT.x; float life = aT.y;
    vCoin = -1.0;
    if (age >= life || life <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vColor = vec4(0.0); vUv = vec2(0.0); return; }
    float k = clamp(age / life, 0.0, 1.0);
    float ka = pow(k, aX.y);
    vec4 col = mix(aC, aC2, k);
    float aa = mix(aC.a, aC2.a, ka);
    if (aS.w > 0.0) aa *= smoothstep(0.0, aS.w, k);
    vColor = vec4(col.rgb, aa);
    float size = mix(aS.x, aS.y, pow(k, aX.z));
    vUv = position.xy * 0.5 + 0.5;
    float mode = aT.w;
    vec4 h = modelViewMatrix * vec4(aPos, 1.0);
    if (mode > 0.5 && mode < 1.5) {
      vec4 t = modelViewMatrix * vec4(aPos - aVel * aS.z, 1.0);
      vec2 d = h.xy - t.xy; float l = length(d);
      d = l > 1e-5 ? d / l : vec2(1.0, 0.0);
      vec2 n = vec2(-d.y, d.x);
      float along = vUv.x;
      vec4 b = mix(t, h, along);
      b.xy += n * position.y * size * 0.5;
      b.xy += d * (along - 0.0) * size * 0.35; // push head cap forward a little
      gl_Position = projectionMatrix * b;
    } else {
      float c = cos(aT.z); float s = sin(aT.z);
      vec2 p = position.xy * 0.5 * size;
      p.y *= aX.x; // aspect
      if (mode > 1.5) { vCoin = abs(cos(aT.z * 1.0 + aX.w)); p.x *= max(0.12, vCoin); p = vec2(c * 0.0 + p.x, p.y); }
      else p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      h.xy += p;
      gl_Position = projectionMatrix * h;
    }
  }`;
const FS = /* glsl */`
  uniform sampler2D uMap; uniform float uGain;
  varying vec2 vUv; varying vec4 vColor; varying float vCoin;
  void main(){
    vec4 t = texture2D(uMap, vUv);
    vec3 rgb = vColor.rgb * t.rgb * uGain;
    if (vCoin >= 0.0) rgb *= 0.5 + 0.7 * vCoin + 2.2 * pow(vCoin, 14.0);
    gl_FragColor = vec4(rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.002) discard;
  }`;

const _c = new THREE.Color();
const MODE = { bb: 0, streak: 1, coin: 2 };

export class Quads {
  constructor({ max = 512, map, blend = 'add', depthTest = true, renderOrder = 6, gain = 1, name = 'quads' } = {}) {
    this.max = max; this.cursor = 0; this.hi = 0; this.live = 0; this.name = name;
    const base = new THREE.PlaneGeometry(2, 2);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const f = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    this.a = { aPos: f(3), aVel: f(3), aT: f(4), aS: f(4), aC: f(4), aC2: f(4), aX: f(4) };
    for (const [k, v] of Object.entries(this.a)) g.setAttribute(k, v);
    for (let i = 0; i < max; i++) { this.a.aT.array[i * 4] = 1; this.a.aT.array[i * 4 + 1] = 0; }
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.geo = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest,
      blending: blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uMap: { value: map }, uGain: { value: gain } },
    });
    this.object = new THREE.Mesh(g, this.material);
    this.object.frustumCulled = false; this.object.renderOrder = renderOrder; this.object.name = name;
    this.vel = new Float32Array(max * 3); this.spin = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    this.turb = new Float32Array(max); this.floor = new Float32Array(max).fill(-1e9); this.bounce = new Float32Array(max);
    this.path = new Float32Array(max * 9); this.hasPath = new Uint8Array(max);
    this.dirtyStatic = false; this.any = false;
  }
  emit(o = {}) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max; if (i + 1 > this.hi) this.hi = i + 1;
    const a = this.a; const p = o.pos || [0, 0, 0]; const v = o.vel || [0, 0, 0];
    const px = p.x ?? p[0]; const py = p.y ?? p[1]; const pz = p.z ?? p[2];
    const vx = v.x ?? v[0]; const vy = v.y ?? v[1]; const vz = v.z ?? v[2];
    a.aPos.array[i * 3] = px; a.aPos.array[i * 3 + 1] = py; a.aPos.array[i * 3 + 2] = pz;
    a.aVel.array[i * 3] = this.vel[i * 3] = vx; a.aVel.array[i * 3 + 1] = this.vel[i * 3 + 1] = vy; a.aVel.array[i * 3 + 2] = this.vel[i * 3 + 2] = vz;
    const mode = typeof o.mode === 'string' ? MODE[o.mode] : (o.mode || 0);
    const T = a.aT.array; T[i * 4] = o.age ?? 0; T[i * 4 + 1] = o.life ?? 1; T[i * 4 + 2] = o.rot ?? 0; T[i * 4 + 3] = mode;
    const S = a.aS.array; S[i * 4] = o.size ?? 0.1; S[i * 4 + 1] = o.sizeEnd ?? o.size ?? 0.1; S[i * 4 + 2] = o.stretch ?? 0.05; S[i * 4 + 3] = o.fadeIn ?? 0;
    const al = o.alpha ?? 1;
    _c.set(o.color ?? 0xffffff); const m = o.hdr ?? 1;
    const C = a.aC.array; C[i * 4] = _c.r * m; C[i * 4 + 1] = _c.g * m; C[i * 4 + 2] = _c.b * m; C[i * 4 + 3] = al;
    _c.set(o.colorEnd ?? o.color ?? 0xffffff); const m2 = o.hdrEnd ?? m;
    const C2 = a.aC2.array; C2[i * 4] = _c.r * m2; C2[i * 4 + 1] = _c.g * m2; C2[i * 4 + 2] = _c.b * m2; C2[i * 4 + 3] = o.alphaEnd ?? 0;
    const X = a.aX.array; X[i * 4] = o.aspect ?? 1; X[i * 4 + 1] = o.fade ?? 1; X[i * 4 + 2] = o.grow ?? 1; X[i * 4 + 3] = o.seed ?? ((i * 1.618) % 6.283);
    this.spin[i] = o.spin ?? 0; this.drag[i] = o.drag ?? 0; this.grav[i] = o.gravity ?? 0; this.turb[i] = o.turbulence ?? 0;
    this.floor[i] = o.floor ?? -1e9; this.bounce[i] = o.bounce ?? 0.4;
    if (o.path) {
      const q = this.path; const { p0, c, p1 } = o.path; this.hasPath[i] = 1;
      q[i * 9] = p0[0]; q[i * 9 + 1] = p0[1]; q[i * 9 + 2] = p0[2]; q[i * 9 + 3] = c[0]; q[i * 9 + 4] = c[1]; q[i * 9 + 5] = c[2]; q[i * 9 + 6] = p1[0]; q[i * 9 + 7] = p1[1]; q[i * 9 + 8] = p1[2];
    } else this.hasPath[i] = 0;
    this.dirtyStatic = true; this.any = true; this.object.visible = true;
    return i;
  }
  burst(n, make) { for (let i = 0; i < n; i++) this.emit(make(i, n)); }
  kill(i) { this.a.aT.array[i * 4] = this.a.aT.array[i * 4 + 1] = 1; }
  update(dt) {
    if (!this.any) return;
    const a = this.a; const pos = a.aPos.array; const vv = a.aVel.array; const T = a.aT.array;
    let live = 0;
    for (let i = 0; i < this.hi; i++) {
      const i4 = i * 4;
      if (T[i4] >= T[i4 + 1]) continue;
      live++;
      T[i4] += dt; const k3 = i * 3;
      if (this.hasPath[i]) {
        const u = Math.min(1, T[i4] / T[i4 + 1]); const e = u * u * (3 - 2 * u) * 0.5 + u * 0.5; const w = 1 - e; const q = this.path;
        const j = i * 9;
        pos[k3] = w * w * q[j] + 2 * w * e * q[j + 3] + e * e * q[j + 6];
        pos[k3 + 1] = w * w * q[j + 1] + 2 * w * e * q[j + 4] + e * e * q[j + 7];
        pos[k3 + 2] = w * w * q[j + 2] + 2 * w * e * q[j + 5] + e * e * q[j + 8];
      } else {
        const drag = Math.exp(-this.drag[i] * dt); const tb = this.turb[i]; const age = T[i4];
        const V = this.vel;
        V[k3] = V[k3] * drag + (tb ? Math.sin(age * 3.1 + i) * tb * dt : 0);
        V[k3 + 1] = V[k3 + 1] * drag + this.grav[i] * dt;
        V[k3 + 2] = V[k3 + 2] * drag + (tb ? Math.cos(age * 2.7 + i * 1.7) * tb * dt : 0);
        pos[k3] += V[k3] * dt; pos[k3 + 1] += V[k3 + 1] * dt; pos[k3 + 2] += V[k3 + 2] * dt;
        if (pos[k3 + 1] < this.floor[i] && V[k3 + 1] < 0) {
          pos[k3 + 1] = this.floor[i]; V[k3 + 1] *= -this.bounce[i]; V[k3] *= 0.72; V[k3 + 2] *= 0.72;
          if (Math.abs(V[k3 + 1]) < 0.4) { V[k3 + 1] = 0; this.grav[i] = 0; V[k3] *= 0.5; V[k3 + 2] *= 0.5; this.drag[i] = 6; }
        }
        vv[k3] = V[k3]; vv[k3 + 1] = V[k3 + 1]; vv[k3 + 2] = V[k3 + 2];
      }
      T[i4 + 2] += this.spin[i] * dt;
    }
    this.live = live;
    a.aPos.needsUpdate = a.aVel.needsUpdate = a.aT.needsUpdate = true;
    if (this.dirtyStatic) { a.aS.needsUpdate = a.aC.needsUpdate = a.aC2.needsUpdate = a.aX.needsUpdate = true; this.dirtyStatic = false; }
    this.geo.instanceCount = this.hi;
    if (!live) { this.any = false; this.object.visible = false; }
  }
  clear() { const T = this.a.aT.array; for (let i = 0; i < this.max; i++) { T[i * 4] = 1; T[i * 4 + 1] = 0; } this.any = true; this.update(0); this.hi = 0; this.geo.instanceCount = 0; }
}
