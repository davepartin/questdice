// Atmosphere effects for the arena: instanced flame billboards, additive glow halos, drifting fog layers
// (flat slabs and vertical walls, fire-lit), god-ray shafts, soft contact blobs / scorch decals, and a tiny
// emitter driver for the foundation Particles. All animation is driven by the stage clock via update().
import * as THREE from 'three';
import { noiseTexture, sprite } from '../tex.js';
import { makeNoise } from '../noise.js';
import { Particles } from '../particles.js';
import { GLOW_PARS, canvasTex } from './common.js';

const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _s = new THREE.Vector3(); const _p = new THREE.Vector3(); const _c = new THREE.Color(); const _e = new THREE.Euler();

// ---------------------------------------------------------------------------------------------------
// Flames: cylindrical billboards, noise-warped teardrop, white-hot core -> orange -> red, additive.
// items: { p:[x,y,z], w, h, seed, power }
// ---------------------------------------------------------------------------------------------------
const FLAME_VS = /* glsl */`
attribute float aSeed; attribute float aPow;
varying vec2 vUv; varying float vSeed; varying float vPow;
uniform float uTime;
void main(){
  vUv = uv; vSeed = aSeed; vPow = aPow;
  vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sx = length(instanceMatrix[0].xyz); float sy = length(instanceMatrix[1].xyz);
  vec3 toCam = cameraPosition - ip.xyz; vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
  float sway = sin(uTime * 2.1 + aSeed * 20.0) * 0.07 + sin(uTime * 3.7 + aSeed * 9.0) * 0.045;
  vec3 wp = ip.xyz + right * (position.x * sx + sway * sx * uv.y * uv.y * 2.0) + vec3(0.0, 1.0, 0.0) * position.y * sy;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const FLAME_FS = /* glsl */`
varying vec2 vUv; varying float vSeed; varying float vPow;
uniform sampler2D tNoise; uniform float uTime, uFire;
void main(){
  float x = (vUv.x - 0.5) * 2.0; float y = vUv.y;
  float t = uTime * (0.85 + vSeed * 0.35) + vSeed * 50.0;
  vec2 np = vec2(x * 0.30 + vSeed * 3.0, y * 0.42 - t * 0.62);
  float n1 = texture2D(tNoise, np).r; float n2 = texture2D(tNoise, np * 2.3 + vec2(0.3, -t * 0.4)).g;
  float n = n1 * 0.62 + n2 * 0.38;
  float taper = pow(max(1.0 - y, 0.0), 0.95) * smoothstep(0.0, 0.16, y + 0.06);
  float width = taper * (0.95 + 0.5 * (n - 0.5));
  float turb = (n - 0.5) * 1.7 * y * y + (n2 - 0.5) * 0.7 * y;
  float d = abs(x + turb) / max(width, 0.001);
  float body = smoothstep(1.0, 0.18, d);
  float fray = smoothstep(0.0, 0.22, 1.0 - y - (n - 0.42) * 0.7 * y);
  float a = body * fray * smoothstep(0.0, 0.07, y);
  float core = smoothstep(0.62, 0.0, d) * (1.0 - y * 0.85);
  vec3 c = mix(vec3(1.0, 0.12, 0.02), vec3(1.0, 0.52, 0.09), clamp(body * (1.15 - y * 0.55), 0.0, 1.0));
  c = mix(c, vec3(1.0, 0.9, 0.5), core * core);
  c *= (1.1 + 1.3 * core) * vPow * uFire;
  gl_FragColor = vec4(c, a);
  if (a < 0.004) discard;
}`;

export function makeFlames(U, items) {
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const seeds = new Float32Array(items.length); const pows = new Float32Array(items.length);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    uniforms: { tNoise: { value: noiseTexture() }, uTime: U.uTime, uFire: U.uFire },
    vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    _p.set(...it.p); _s.set(it.w, it.h, 1); _q.identity(); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    seeds[i] = it.seed ?? i * 0.37; pows[i] = it.power ?? 1;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute('aPow', new THREE.InstancedBufferAttribute(pows, 1));
  mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.name = 'flames';
  return mesh;
}

// ---------------------------------------------------------------------------------------------------
// Glow halos: camera-facing additive quads, per-instance colour (can exceed 1 to feed bloom) + flicker.
// items: { p, s (diameter m), c (hex or Color), k (intensity), flick (0..1), seed }
// ---------------------------------------------------------------------------------------------------
export function makeGlows(U, items, { spriteName = 'glow', order = 7, depthTest = true } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(items.length); const flicks = new Float32Array(items.length);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { tMap: { value: sprite(spriteName) }, uTime: U.uTime, uFire: U.uFire },
    vertexShader: `attribute float aSeed; attribute float aFlick; varying vec2 vUv; varying vec3 vCol; varying float vF;
      uniform float uTime; uniform float uFire;
      void main(){ vUv = uv; vCol = instanceColor;
        float f = 1.0 - aFlick * (0.5 + 0.5 * sin(uTime * (5.0 + aSeed * 4.0) + aSeed * 40.0) * sin(uTime * 2.3 + aSeed * 11.0));
        vF = f * mix(1.0, uFire, aFlick);
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sc = length(instanceMatrix[0].xyz);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 wp = ip.xyz + (right * position.x + up * position.y) * sc * (0.94 + 0.06 * f);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vCol; varying float vF; uniform sampler2D tMap;
      void main(){ float a = texture2D(tMap, vUv).a; gl_FragColor = vec4(vCol * vF, a); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    _p.set(...it.p); _s.set(it.s, it.s, it.s); _m.compose(_p, _q.identity(), _s); mesh.setMatrixAt(i, _m);
    _c.set(it.c ?? 0xff8a40).multiplyScalar(it.k ?? 1); mesh.setColorAt(i, _c);
    seeds[i] = it.seed ?? i * 0.61; flicks[i] = it.flick ?? 0;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute('aFlick', new THREE.InstancedBufferAttribute(flicks, 1));
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.name = 'glows';
  return mesh;
}

// ---------------------------------------------------------------------------------------------------
// Fog layers: noise-masked slabs ('flat' lies on the ground at some height, 'wall' stands facing the camera).
// Normal blending, tinted by the moon/base colour and lit warm by nearby fires (uFireP uniform).
// ---------------------------------------------------------------------------------------------------
const FOGL_VS = /* glsl */`
attribute vec4 aP; varying vec2 vUv; varying vec3 vW; varying vec3 vCol; varying vec4 vP; varying float vDepth;
void main(){
  vUv = uv; vP = aP;
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(0.5);
  #endif
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
  vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const FOGL_FS = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vCol; varying vec4 vP; varying float vDepth;
uniform sampler2D tNoise; uniform float uTime, uFogGlow; uniform vec4 uFireP[4]; uniform vec3 uFireCol;
${GLOW_PARS}
void main(){
  float t = uTime * vP.z;
  vec2 p = vW.xz * 0.045 * vP.y;
  float n = texture2D(tNoise, p + vec2(t * 0.020, t * 0.007) + vP.w).r * 0.55 + texture2D(tNoise, p * 2.7 - vec2(t * 0.015, 0.0) + vP.w * 3.0).g * 0.45;
  float m = smoothstep(0.34, 0.78, n);
  float edge = 1.0;
  #ifdef FLAT
    vec2 c = vUv - 0.5; edge = smoothstep(0.5, 0.18, length(c * vec2(1.0, 1.0)));
  #else
    edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * pow(max(1.0 - vUv.y, 0.0), 1.35) * smoothstep(0.0, 0.05, vUv.y);
  #endif
  float near = smoothstep(1.8, 8.5, vDepth);
  vec3 dir = normalize(vW - cameraPosition);
  vec3 col = vCol + qdHorizonGlow(vec3(dir.x, 0.0, dir.z), 1.6) * 0.5 * uFogGlow;
  for (int i = 0; i < 4; i++) { vec3 dv = vW - uFireP[i].xyz; col += uFireCol * uFireP[i].w / (1.0 + dot(dv, dv) * 0.07); }
  float a = vP.x * m * edge * near;
  gl_FragColor = vec4(col, a);
  if (a < 0.003) discard;
}`;

// items: { p, w, d (flat: x,z extents; wall: w, height), col, dens, scale, speed, seed, kind: 'flat'|'wall' }
export function makeFogLayers(U, items) {
  const fireP = U.uFireP.value; const fireCol = U.uFireCol.value;
  const out = [];
  for (const kind of ['flat', 'wall']) {
    const list = items.filter((i) => (i.kind || 'flat') === kind);
    if (!list.length) continue;
    const geo = new THREE.PlaneGeometry(1, 1);
    if (kind === 'flat') geo.rotateX(-Math.PI / 2);
    const aP = new Float32Array(list.length * 4);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, defines: kind === 'flat' ? { FLAT: 1 } : {},
      uniforms: { tNoise: { value: noiseTexture() }, uTime: U.uTime, uFogGlow: U.uFogGlow, uGP: U.uGP, uGC: U.uGC, uFireP: U.uFireP, uFireCol: U.uFireCol },
      vertexShader: FOGL_VS, fragmentShader: FOGL_FS,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      _p.set(...it.p);
      if (kind === 'wall') { _s.set(it.w, it.d, 1); } else { _s.set(it.w, 1, it.d); }
      _q.setFromEuler(_e.set(0, it.yaw || 0, 0));
      _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
      if (kind === 'wall') { /* anchor: bottom edge at p.y */ }
      _c.set(it.col ?? 0x445566); mesh.setColorAt(i, _c);
      aP.set([it.dens ?? 0.3, it.scale ?? 1, it.speed ?? 1, it.seed ?? i * 1.7], i * 4);
    });
    if (kind === 'wall') geo.translate(0, 0.5, 0);
    geo.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4));
    mesh.frustumCulled = false; mesh.renderOrder = kind === 'flat' ? 6 : 4; mesh.name = `fog-${kind}`;
    out.push(mesh);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// God-ray shafts: merged crossed quads, additive, noise streaks, fade at the foot and edge-on.
// items: { top:[x,y,z], dir:[dx,dy,dz] (towards the ground), len, w, seed }
// ---------------------------------------------------------------------------------------------------
export function makeShafts(U, items, { color = 0x9ab8ff, alpha = 0.16 } = {}) {
  const pos = []; const uv = []; const nrm = []; const seed = []; const idx = [];
  let vi = 0;
  items.forEach((it, n) => {
    const top = new THREE.Vector3(...it.top); const dir = new THREE.Vector3(...it.dir).normalize();
    const bot = top.clone().addScaledVector(dir, it.len);
    for (let k = 0; k < 2; k++) {
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (k === 1) side.applyAxisAngle(dir, Math.PI / 2);
      const nn = new THREE.Vector3().crossVectors(dir, side).normalize();
      const wTop = it.w * 0.45; const wBot = it.w;
      const pts = [top.clone().addScaledVector(side, -wTop), top.clone().addScaledVector(side, wTop), bot.clone().addScaledVector(side, wBot), bot.clone().addScaledVector(side, -wBot)];
      const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]];
      pts.forEach((p, i) => { pos.push(p.x, p.y, p.z); uv.push(...uvs[i]); nrm.push(nn.x, nn.y, nn.z); seed.push(it.seed ?? n); });
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); vi += 4;
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { tNoise: { value: noiseTexture() }, uTime: U.uTime, uCol: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, uMood: { value: 1 } },
    vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vSeed; varying vec3 vW; varying vec3 vN;
      void main(){ vUv = uv; vSeed = aSeed; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vUv; varying float vSeed; varying vec3 vW; varying vec3 vN; uniform sampler2D tNoise; uniform float uTime, uAlpha, uMood; uniform vec3 uCol;
      void main(){
        float across = smoothstep(0.0, 0.5, 1.0 - abs(vUv.x * 2.0 - 1.0));
        float along = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.7, vUv.y) * 0.0 + smoothstep(0.0, 0.25, vUv.y) * (0.35 + 0.65 * vUv.y);
        float streak = texture2D(tNoise, vec2(vUv.x * 2.5 + vSeed * 5.0, vUv.y * 0.15 + uTime * 0.012)).r;
        streak = smoothstep(0.25, 0.8, streak);
        float V = abs(dot(normalize(cameraPosition - vW), vN));
        float nearf = smoothstep(2.5, 10.0, distance(cameraPosition, vW));
        float flick = 0.8 + 0.2 * sin(uTime * 0.6 + vSeed * 9.0);
        float a = uAlpha * across * along * streak * pow(V, 1.2) * nearf * flick * uMood;
        gl_FragColor = vec4(uCol, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.name = 'shafts';
  return mesh;
}

// ---------------------------------------------------------------------------------------------------
// Soft decals lying on the ground: contact blobs under props, scorch marks. One instanced draw each.
// items: { p:[x,z], y?, s:[sx,sz] | n, rot, a (opacity multiplier) }
// ---------------------------------------------------------------------------------------------------
function blobTex() {
  return canvasTex('arena-blob', 128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.65)'); r.addColorStop(0.7, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
}
function scorchTex() {
  return canvasTex('arena-scorch', 256, (g, s) => {
    const N = makeNoise(21); const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = (x / s - 0.5) * 2; const dy = (y / s - 0.5) * 2; const d = Math.hypot(dx, dy);
      const n = N.fbm(x / 36, y / 36, { oct: 5 }) * 0.5 + 0.5; const n2 = N.fbm(x / 9 + 40, y / 9, { oct: 3 }) * 0.5 + 0.5;
      const a = Math.max(0, Math.min(1, (1 - d * (0.85 + (n - 0.5) * 0.9)) * 2.2)) * (0.65 + 0.5 * n2);
      const i = (y * s + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * a * 255);
    }
    g.putImageData(img, 0, 0);
  });
}
export function makeDecals(U, items, { kind = 'blob', color = 0x000000, opacity = 0.55, lift = 0.014, order = 1 } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: kind === 'blob' ? blobTex() : scorchTex(), color, transparent: true, opacity, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    const s = Array.isArray(it.s) ? it.s : [it.s, it.s];
    _p.set(it.p[0], (it.y ?? 0) + lift, it.p[1]); _q.setFromEuler(_e.set(0, it.rot || 0, 0)); _s.set(s[0], 1, s[1]);
    _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    _c.setScalar(it.a ?? 1); mesh.setColorAt(i, _c);
  });
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.name = `decal-${kind}`;
  return mesh;
}

// ---------------------------------------------------------------------------------------------------
// Particle emitters: a Particles system plus a rate + spawn function. Deterministic (rng passed in).
// ---------------------------------------------------------------------------------------------------
export class Emitter {
  constructor(stage, group, { max, sprite: spr = 'dot', blending = 'add', gravity = 0, drag = 0, rate, spawn, order = 5, depthTest = true }) {
    this.ps = new Particles({ max, sprite: spr, blending, gravity, drag, renderOrder: order, depthTest });
    group.add(this.ps.object);
    this.stage = stage; this.rate = rate; this.spawn = spawn; this.acc = 0; this.mul = 1;
  }
  step(dt, rng, scale) {
    this.ps.material.uniforms.uScale.value = scale;
    this.acc += this.rate * this.mul * dt;
    let guard = 0;
    while (this.acc >= 1 && guard++ < 60) { this.acc -= 1; this.ps.emit(this.spawn(rng)); }
    this.ps.update(dt);
  }
  dispose() { this.ps.object.removeFromParent(); this.ps.object.geometry.dispose(); this.ps.material.dispose(); }
}
