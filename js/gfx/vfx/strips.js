// Camera-facing ribbons: projectile trails, noise-animated beams and jagged lightning.
// One shared vertex shader expands every point sideways in view space, the fragment shaders differ.
// Everything is pooled: a Strip is a fixed-size BufferGeometry whose vertices are rewritten per frame.

import * as THREE from 'three';

const VS = /* glsl */`
  attribute vec3 aNext; attribute vec2 aP; attribute float aSide;
  uniform float uWidth;
  varying vec2 vUv; varying float vW;
  void main(){
    vec4 a = modelViewMatrix * vec4(position, 1.0);
    vec4 b = modelViewMatrix * vec4(aNext, 1.0);
    vec2 d = b.xy - a.xy; float l = length(d);
    d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);
    a.xy += n * aSide * uWidth * aP.y;
    vUv = vec2(aP.x, aSide); vW = aP.y;
    gl_Position = projectionMatrix * a;
  }`;
const NOISE = /* glsl */`
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`;

const FS_TRAIL = /* glsl */`
  uniform vec3 uColor; uniform vec3 uColor2; uniform float uAlpha; uniform float uHdr;
  varying vec2 vUv; varying float vW;
  void main(){
    float v = abs(vUv.y); float u = vUv.x;
    float prof = pow(max(0.0, 1.0 - v), 1.6);
    float core = pow(max(0.0, 1.0 - v), 7.0);
    float fall = pow(max(0.0, 1.0 - u), 1.35);
    vec3 col = mix(uColor, uColor2, u) * uHdr;
    col += vec3(1.0, 0.95, 0.85) * core * (1.0 - u) * 1.4;
    gl_FragColor = vec4(col, prof * fall * uAlpha);
  }`;
const FS_BEAM = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform vec3 uCore; uniform float uTime; uniform float uAlpha; uniform float uLen; uniform float uHdr; uniform float uSeed;
  varying vec2 vUv; varying float vW;
  void main(){
    float u = vUv.x; float v = vUv.y; float av = abs(v);
    float x = u * uLen;
    float n1 = vn(vec2(x * 2.2 - uTime * 9.0 + uSeed, v * 2.0 + uTime * 1.7));
    float n2 = vn(vec2(x * 6.0 + uTime * 17.0, v * 3.5 - uTime * 2.0 + uSeed));
    float core = exp(-pow(v / (0.10 + 0.07 * n1), 2.0));
    float mid = exp(-pow(v / 0.36, 2.0)) * (0.55 + 0.9 * n2);
    float glow = exp(-pow(v / 0.85, 2.0)) * 0.33;
    float s1 = sin(x * 5.0 - uTime * 11.0 + uSeed) * 0.34 * (0.5 + n1);
    float s2 = sin(x * 5.0 - uTime * 11.0 + uSeed + 3.14159) * 0.34 * (0.5 + n1);
    float strands = exp(-pow((v - s1) / 0.055, 2.0)) + exp(-pow((v - s2) / 0.055, 2.0));
    float ends = smoothstep(0.0, 0.05, u) * smoothstep(1.0, 0.97, u);
    vec3 col = uColor * uHdr * (mid * 1.5 + glow * 1.2 + strands * 0.9) + uCore * core * 3.2;
    float a = clamp(core + mid + glow + strands * 0.8, 0.0, 1.0) * ends * uAlpha;
    gl_FragColor = vec4(col, a);
  }`;
const FS_BOLT = /* glsl */`
  uniform vec3 uColor; uniform vec3 uCore; uniform float uAlpha; uniform float uHdr; uniform float uFlick;
  varying vec2 vUv; varying float vW;
  void main(){
    float v = vUv.y;
    float core = exp(-pow(v / 0.13, 2.0));
    float glow = exp(-pow(v / 0.55, 2.0));
    float ends = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    vec3 col = uColor * uHdr * glow * 1.6 + uCore * core * 4.0;
    gl_FragColor = vec4(col, clamp(core + glow * 0.7, 0.0, 1.0) * uAlpha * uFlick * ends * clamp(vW * 1.3, 0.0, 1.0));
  }`;

class Strip {
  constructor(maxPts, fs, uniforms) {
    this.max = maxPts; this.n = 0;
    const g = new THREE.BufferGeometry();
    const vc = maxPts * 2;
    this.pos = new Float32Array(vc * 3); this.next = new Float32Array(vc * 3); this.p = new Float32Array(vc * 2); this.side = new Float32Array(vc);
    for (let i = 0; i < maxPts; i++) { this.side[i * 2] = -1; this.side[i * 2 + 1] = 1; }
    const idx = [];
    for (let i = 0; i < maxPts - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aNext', new THREE.BufferAttribute(this.next, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aP', new THREE.BufferAttribute(this.p, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uWidth: { value: 0.1 }, ...uniforms },
    });
    this.mesh = new THREE.Mesh(g, this.material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; this.mesh.visible = false;
  }
  // points: array of [x,y,z] (or a flat Float32Array) with per-point u (0..1) and width scale
  begin() { this.n = 0; }
  push(x, y, z, u, w) {
    const i = this.n++; if (i >= this.max) { this.n = this.max; return; }
    const o = i * 6; const q = i * 4;
    this.pos[o] = this.pos[o + 3] = x; this.pos[o + 1] = this.pos[o + 4] = y; this.pos[o + 2] = this.pos[o + 5] = z;
    this.p[q] = this.p[q + 2] = u; this.p[q + 1] = this.p[q + 3] = w;
  }
  end() {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const j = Math.min(n - 1, i + 1); const o = i * 6; let nx; let ny; let nz;
      if (i === n - 1 && n > 1) { // extrapolate for the last point
        const k = (i - 1) * 6; nx = this.pos[o] * 2 - this.pos[k]; ny = this.pos[o + 1] * 2 - this.pos[k + 1]; nz = this.pos[o + 2] * 2 - this.pos[k + 2];
      } else { nx = this.pos[j * 6]; ny = this.pos[j * 6 + 1]; nz = this.pos[j * 6 + 2]; }
      this.next[o] = this.next[o + 3] = nx; this.next[o + 1] = this.next[o + 4] = ny; this.next[o + 2] = this.next[o + 5] = nz;
    }
    const a = this.geo.attributes; a.position.needsUpdate = a.aNext.needsUpdate = a.aP.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, n - 1) * 6);
    this.mesh.visible = n > 1;
  }
}

const hexv = (c) => new THREE.Color(c);

export function createStrips(scene) {
  const trails = []; const beams = []; const bolts = [];
  const mk = (arr, n, pts, fs, uni) => {
    for (let i = 0; i < n; i++) { const s = new Strip(pts, fs, uni()); s.busy = false; scene.add(s.mesh); arr.push(s); }
  };
  mk(trails, 14, 32, FS_TRAIL, () => ({ uColor: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() }, uAlpha: { value: 1 }, uHdr: { value: 1 } }));
  mk(beams, 4, 20, FS_BEAM, () => ({ uColor: { value: new THREE.Color() }, uCore: { value: new THREE.Color(1, 1, 1) }, uTime: { value: 0 }, uAlpha: { value: 1 }, uLen: { value: 4 }, uHdr: { value: 1 }, uSeed: { value: 0 } }));
  mk(bolts, 12, 36, FS_BOLT, () => ({ uColor: { value: new THREE.Color() }, uCore: { value: new THREE.Color(1, 1, 1) }, uAlpha: { value: 1 }, uHdr: { value: 1 }, uFlick: { value: 1 } }));
  const grab = (arr) => { for (const s of arr) if (!s.busy) { s.busy = true; return s; } return null; };

  // ---- trails: a fading ribbon behind a moving point
  const liveTrails = [];
  function trail({ color = 0xffffff, color2, width = 0.08, life = 0.35, hdr = 1.5, alpha = 1, minDist = 0.03 } = {}) {
    const s = grab(trails); if (!s) return { push() {}, end() {}, dead: true };
    const t = {
      s, n: 0, life, width, ended: false, alpha, minDist,
      px: new Float32Array(32), py: new Float32Array(32), pz: new Float32Array(32), age: new Float32Array(32),
      push(x, y, z) {
        if (this.ended) return;
        if (this.n) { // skip tiny steps, but keep the head glued to the object
          const dx = x - this.px[0]; const dy = y - this.py[0]; const dz = z - this.pz[0];
          if (dx * dx + dy * dy + dz * dz < this.minDist * this.minDist) { this.px[0] = x; this.py[0] = y; this.pz[0] = z; return; }
        }
        for (let i = Math.min(this.n, 31); i > 0; i--) { this.px[i] = this.px[i - 1]; this.py[i] = this.py[i - 1]; this.pz[i] = this.pz[i - 1]; this.age[i] = this.age[i - 1]; }
        this.px[0] = x; this.py[0] = y; this.pz[0] = z; this.age[0] = 0; this.n = Math.min(32, this.n + 1);
      },
      end() { this.ended = true; },
    };
    const u = s.material.uniforms; u.uColor.value.set(color); u.uColor2.value.set(color2 ?? color); u.uAlpha.value = alpha; u.uHdr.value = hdr; u.uWidth.value = width;
    liveTrails.push(t);
    return t;
  }
  function updateTrails(dt) {
    for (let k = liveTrails.length - 1; k >= 0; k--) {
      const t = liveTrails[k]; const s = t.s;
      for (let i = 0; i < t.n; i++) t.age[i] += dt;
      while (t.n > 0 && t.age[t.n - 1] > t.life) t.n--;
      if (t.n < 1 && t.ended) { s.mesh.visible = false; s.busy = false; liveTrails.splice(k, 1); continue; }
      if (t.ended && t.n === 1) { s.mesh.visible = false; continue; }
      s.begin();
      for (let i = 0; i < t.n; i++) { const u = t.age[i] / t.life; s.push(t.px[i], t.py[i], t.pz[i], u, 1 - u * 0.75); }
      s.end();
    }
  }

  // ---- beams
  const liveBeams = [];
  const _a = new THREE.Vector3(); const _b = new THREE.Vector3();
  function beam({ from, to, color = 0xb07dff, core = 0xffffff, width = 0.35, dur = 0.6, hdr = 2.2, seed = 1, bend = 0, taper = 0, grow = 0.08 } = {}) {
    const s = grab(beams); if (!s) return null;
    const b = { s, t: 0, dur, width, bend, taper, grow, from: new THREE.Vector3().copy(from), to: new THREE.Vector3().copy(to), done: false, alpha: 1 };
    const u = s.material.uniforms; u.uColor.value.set(color); u.uCore.value.set(core); u.uHdr.value = hdr; u.uSeed.value = seed * 7.13;
    u.uLen.value = b.from.distanceTo(b.to);
    liveBeams.push(b);
    return b;
  }
  function updateBeams(dt, time) {
    for (let k = liveBeams.length - 1; k >= 0; k--) {
      const b = liveBeams[k]; const s = b.s; b.t += dt;
      const kk = b.t / b.dur;
      if (kk >= 1) { s.mesh.visible = false; s.busy = false; liveBeams.splice(k, 1); continue; }
      // envelope: flash in, hold with pulse, decay
      const att = Math.min(1, b.t / 0.05); const dec = kk > 0.6 ? 1 - (kk - 0.6) / 0.4 : 1;
      const pulse = 0.9 + 0.1 * Math.sin(b.t * 60);
      const w = b.width * (0.4 + 0.6 * Math.min(1, b.t / 0.09)) * (b.taper ? 1 : 1) * (kk > 0.6 ? dec : 1);
      s.material.uniforms.uTime.value = time; s.material.uniforms.uAlpha.value = att * dec * pulse; s.material.uniforms.uWidth.value = w;
      // travel: the head reaches the end over `grow` seconds
      const head = Math.min(1, b.t / Math.max(0.001, b.grow));
      s.begin();
      const N = 14; const dx = b.to.x - b.from.x; const dy = b.to.y - b.from.y; const dz = b.to.z - b.from.z;
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1); const ff = f * head; const arc = b.bend ? Math.sin(f * Math.PI) * b.bend : 0;
        const wt = b.taper ? (1 - b.taper * f) : 1;
        s.push(b.from.x + dx * ff, b.from.y + dy * ff + arc * (head), b.from.z + dz * ff, f, wt);
      }
      s.end();
    }
  }

  // ---- lightning
  const liveBolts = [];
  function bolt({ from, to, color = 0x9fc8ff, core = 0xffffff, width = 0.12, dur = 0.35, jag = 0.35, branches = 2, hdr = 2.4, rng = Math.random, flicker = 14 } = {}) {
    const main = grab(bolts); if (!main) return null;
    const L = { segs: [main], t: 0, dur, width, jag, from: new THREE.Vector3().copy(from), to: new THREE.Vector3().copy(to), rng, flicker, seed: 0, branches: [], accum: 1, hdr };
    for (let i = 0; i < branches; i++) { const bs = grab(bolts); if (bs) { L.segs.push(bs); L.branches.push({ s: bs, f: 0.25 + rng() * 0.5, side: (rng() < 0.5 ? -1 : 1) }); } }
    for (const s of L.segs) { const u = s.material.uniforms; u.uColor.value.set(color); u.uCore.value.set(core); u.uHdr.value = hdr; }
    liveBolts.push(L);
    return L;
  }
  const _d = new THREE.Vector3(); const _p = new THREE.Vector3(); const _u = new THREE.Vector3(); const _v = new THREE.Vector3(); const _up = new THREE.Vector3(0, 1, 0);
  function jagged(strip, a, b, jag, rng, n, wBase, taperEnd) {
    _d.subVectors(b, a); const len = _d.length(); _d.divideScalar(len || 1);
    _u.crossVectors(_d, _up); if (_u.lengthSq() < 1e-4) _u.set(1, 0, 0); _u.normalize(); _v.crossVectors(_d, _u).normalize();
    strip.begin();
    let ox = 0; let oy = 0;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1); const env = Math.sin(f * Math.PI) ** 0.6;
      if (i > 0 && i < n - 1) { ox = ox * 0.5 + (rng() - 0.5) * jag * len * 0.22; oy = oy * 0.5 + (rng() - 0.5) * jag * len * 0.22; } else { ox = oy = 0; }
      _p.copy(a).addScaledVector(_d, len * f).addScaledVector(_u, ox * env).addScaledVector(_v, oy * env);
      const w = taperEnd ? (1 - f * 0.85) : 1;
      strip.push(_p.x, _p.y, _p.z, f, w * (0.6 + 0.4 * env));
    }
    strip.end();
  }
  function updateBolts(dt) {
    for (let k = liveBolts.length - 1; k >= 0; k--) {
      const L = liveBolts[k]; L.t += dt; L.accum += dt;
      const kk = L.t / L.dur;
      if (kk >= 1) { for (const s of L.segs) { s.mesh.visible = false; s.busy = false; } liveBolts.splice(k, 1); continue; }
      const alpha = kk < 0.15 ? 1 : 1 - (kk - 0.15) / 0.85;
      const flick = L.rng() < 0.25 ? 0.55 : 1;
      const rebuild = L.accum > 1 / L.flicker; if (rebuild) L.accum = 0;
      for (const s of L.segs) { s.material.uniforms.uAlpha.value = alpha * alpha; s.material.uniforms.uFlick.value = flick; s.material.uniforms.uWidth.value = L.width * (s === L.segs[0] ? 1 : 0.55); }
      if (rebuild) {
        jagged(L.segs[0], L.from, L.to, L.jag, L.rng, 26, 1, false);
        for (const br of L.branches) {
          const s0 = L.segs[0]; const i = Math.floor(br.f * (s0.n - 1)); const o = i * 6;
          _a.set(s0.pos[o], s0.pos[o + 1], s0.pos[o + 2]);
          _b.subVectors(L.to, L.from); const len = _b.length();
          _b.normalize(); _u.crossVectors(_b, _up).normalize(); _b.multiplyScalar(len * 0.3).addScaledVector(_u, br.side * len * 0.18).add(_a); _b.y -= len * 0.05;
          jagged(br.s, _a, _b, L.jag * 1.2, L.rng, 14, 0.7, true);
        }
      }
    }
  }

  return {
    trail, beam, bolt,
    get meshes() { return [...trails, ...beams, ...bolts].map((x) => x.mesh); },
    update(dt, time) { updateTrails(dt); updateBeams(dt, time); updateBolts(dt); },
    get busy() { return liveTrails.length + liveBeams.length + liveBolts.length; },
  };
}
