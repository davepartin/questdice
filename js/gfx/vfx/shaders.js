// Shader materials and shared geometry for mesh-based combat effects: rings, slash crescents, hex
// shields, danger glyphs, rifts, light pillars, nova shells and the screen overlay.
// All are additive (except the rift) and driven through uniforms by vfx.js.

import * as THREE from 'three';
import { vtex } from './textures.js';

export const NOISE = /* glsl */`
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`;

const PASS_VS = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function mat(vs, fs, uniforms, { blend = 'add', side = THREE.DoubleSide, depthTest = true, polygonOffset = false } = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms, transparent: true, depthWrite: false, depthTest, side,
    blending: blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  if (polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; }
  return m;
}
const col = (c = 0xffffff) => ({ value: new THREE.Color(c) });
const num = (v = 0) => ({ value: v });

export const quadGeo = new THREE.PlaneGeometry(2, 2);

// ---------------------------------------------------------------------------------------------
// Expanding shockwave ring (flat on the ground, or facing the camera)
// ---------------------------------------------------------------------------------------------
const RING_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform float uK; uniform float uR0; uniform float uThick; uniform float uAlpha; uniform float uHdr; uniform float uNoise; uniform float uSeed; uniform float uEase;
  varying vec2 vUv;
  void main(){
    vec2 p = vUv * 2.0 - 1.0; float r = length(p); float ang = atan(p.y, p.x);
    float e = 1.0 - pow(1.0 - uK, uEase);
    float rc = mix(uR0, 0.9, e);
    float d = r - rc;
    float th = uThick * (1.0 - 0.55 * uK) + 0.004;
    float prof = d > 0.0 ? exp(-d * d / (th * th * 0.22)) : exp(d / (th * 3.2));
    float core = exp(-d * d / (th * th * 0.035));
    float n = vn(vec2(ang * 2.5 + uSeed, uK * 3.0)) * 0.6 + vn(vec2(ang * 11.0 + uSeed * 3.0, 4.0)) * 0.55 + 0.35;
    float spokes = mix(1.0, n, uNoise);
    float fade = pow(1.0 - uK, 1.3) * smoothstep(0.0, 0.04, uK + 0.04);
    vec3 c = uColor * uHdr * prof * spokes + vec3(1.0, 0.97, 0.9) * core * 1.2 * spokes;
    float a = clamp((prof * 0.85 + core) * spokes, 0.0, 1.0) * fade * uAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(c, a);
  }`;
export function ringMaterial() {
  return mat(PASS_VS, RING_FS, { uColor: col(), uK: num(), uR0: num(0.05), uThick: num(0.07), uAlpha: num(1), uHdr: num(1.6), uNoise: num(0.4), uSeed: num(0), uEase: num(2.6) },
    { polygonOffset: true });
}

// ---------------------------------------------------------------------------------------------
// Slash crescent
// ---------------------------------------------------------------------------------------------
// Geometry in the XY plane: unit-radius arc bulging up (+Y), travelling along +X. u runs along the arc,
// v from the outer (sharp, bright) edge (0) to the inner (soft) edge (1).
export function crescentGeo({ theta = 1.15, width = 0.34, segs = 40, power = 0.85, lean = 0 } = {}) {
  const pos = []; const uv = []; const idx = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs; const phi = (f * 2 - 1) * theta;
    const cx = Math.sin(phi); const cy = Math.cos(phi) - Math.cos(theta);
    const w = width * Math.pow(Math.sin(Math.PI * f), power) * (1 + lean * (f - 0.5));
    // outer point on the unit circle, inner point toward the circle centre
    pos.push(cx, cy, 0, cx * (1 - w), cy - (1 - (1 - w)) * (Math.cos(phi)) + (1 - (1 - w)) * (Math.cos(theta)) * 0, 0);
    uv.push(f, 0, f, 1);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // fix inner points: move toward centre (0, -cos(theta)) by w
  const arr = new Float32Array(pos);
  for (let i = 0; i <= segs; i++) {
    const f = i / segs; const phi = (f * 2 - 1) * theta;
    const w = width * Math.pow(Math.sin(Math.PI * f), power) * (1 + lean * (f - 0.5));
    const cx = Math.sin(phi); const cy = Math.cos(phi) - Math.cos(theta);
    const ccx = 0; const ccy = -Math.cos(theta);
    arr[i * 6 + 3] = cx + (ccx - cx) * w; arr[i * 6 + 4] = cy + (ccy - cy) * w;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  // centre the crescent on its middle so scaling/rotation pivots around the impact point
  g.translate(0, -(Math.cos(0) - Math.cos(theta)) * 0.5 * 0.9, 0);
  return g;
}
const SLASH_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform vec3 uCore; uniform float uHead; uniform float uTail; uniform float uHdr; uniform float uSeed; uniform float uFade; uniform float uGrit;
  varying vec2 vUv;
  void main(){
    float u = vUv.x; float v = vUv.y;
    float behind = uHead - u;
    if (behind < 0.0) discard;
    float vis = smoothstep(0.0, 0.035, behind) * smoothstep(uTail - 0.02, uTail + 0.3, u);
    float trail = exp(-behind * 2.2);
    float headGlow = exp(-behind * 28.0);
    float body = pow(max(0.0, 1.0 - v), 1.9);
    float edge = smoothstep(0.30, 0.0, v);
    float streak = 0.55 + 0.9 * vn(vec2(u * 7.0 - uHead * 3.0 + uSeed, v * 30.0));
    streak = mix(1.0, streak, uGrit);
    vec3 c = uColor * uHdr * body * streak * (0.5 + trail) + uCore * (edge * edge * 1.6 + headGlow * 2.2 * (1.0 - v));
    float a = clamp(body * streak * 0.95 + edge * 0.9 + headGlow * 0.7, 0.0, 1.0) * vis * (0.35 + 0.65 * trail) * uFade;
    gl_FragColor = vec4(c, a);
  }`;
export function slashMaterial() {
  return mat(PASS_VS, SLASH_FS, { uColor: col(), uCore: col(0xffffff), uHead: num(), uTail: num(), uHdr: num(2.4), uSeed: num(), uFade: num(1), uGrit: num(1) }, { depthTest: false });
}

// ---------------------------------------------------------------------------------------------
// Hex shield dome / plate
// ---------------------------------------------------------------------------------------------
const DOME_VS = /* glsl */`
  varying vec3 vLocal; varying vec3 vN; varying vec3 vWorld; varying vec3 vView;
  void main(){
    vLocal = normalize(position);
    vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - w.xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const DOME_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform float uTime; uniform float uAppear; uniform float uHdr; uniform float uGround; uniform float uAlpha; uniform float uScale;
  uniform vec4 uHit[4]; uniform vec3 uHitDir[4];
  varying vec3 vLocal; varying vec3 vN; varying vec3 vWorld; varying vec3 vView;
  vec4 hexc(vec2 uv){ vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5; vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h; vec2 gv = dot(a, a) < dot(b, b) ? a : b; return vec4(gv, uv - gv); }
  float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
  void main(){
    if (vWorld.y < uGround) discard;
    vec3 p = normalize(vLocal);
    vec2 q = p.xz / (1.0 + abs(p.y) + 0.35) * uScale;
    vec4 hc = hexc(q);
    float edge = smoothstep(0.43, 0.5, hexd(hc.xy));
    float cell = h21(hc.zw);
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.4);
    // appear: cells pop in bottom-up with a random stagger
    float vis = smoothstep(cell * 0.45, cell * 0.45 + 0.35, uAppear * 1.45 - (1.0 - p.y) * 0.2);
    float shimmer = 0.5 + 0.5 * sin(uTime * 2.0 + cell * 40.0);
    float base = 0.05 + 0.12 * shimmer * cell;
    float lit = 0.0; float wave = 0.0; float flash = 0.0;
    for (int i = 0; i < 4; i++) {
      float t = uTime - uHit[i].w;
      if (uHit[i].w > 0.0 && t > 0.0 && t < 1.4) {
        float d = acos(clamp(dot(p, uHitDir[i]), -1.0, 1.0));
        float R = t * 2.6;
        float ring = exp(-pow((d - R) / 0.22, 2.0)) * exp(-t * 2.4);
        wave += ring * uHit[i].x;
        lit += exp(-d * 2.2) * exp(-t * 3.2) * uHit[i].x;
        flash += exp(-d * d * 18.0) * exp(-t * 7.0) * uHit[i].x;
      }
    }
    float e = edge * (0.55 + 0.5 * shimmer) + edge * wave * 2.4;
    float a = (base + fres * 0.55 + e * 0.8 + lit * (0.28 + edge * 0.6) + wave * 0.35 + flash * 1.4) * vis;
    vec3 c = uColor * uHdr * (base + fres * 0.9 + e * 1.1 + lit * 0.9 + wave * 0.8) + vec3(1.0) * flash * 2.2 + vec3(0.8, 0.95, 1.0) * edge * wave * 1.2;
    gl_FragColor = vec4(c * vis, clamp(a, 0.0, 1.0) * uAlpha);
  }`;
export function domeMaterial() {
  const hits = []; const dirs = [];
  for (let i = 0; i < 4; i++) { hits.push(new THREE.Vector4(0, 0, 0, -1)); dirs.push(new THREE.Vector3(0, 1, 0)); }
  return mat(DOME_VS, DOME_FS, { uColor: col(0x4db4ff), uTime: num(), uAppear: num(0), uHdr: num(1.5), uGround: num(0.02), uAlpha: num(1), uScale: num(4.2), uHit: { value: hits }, uHitDir: { value: dirs } });
}

// ---------------------------------------------------------------------------------------------
// Danger glyph (wind-up telegraph), ritual circle on the ground
// ---------------------------------------------------------------------------------------------
const GLYPH_FS = /* glsl */`
  uniform sampler2D uOuter; uniform sampler2D uInner; uniform vec3 uColor; uniform float uTime; uniform float uK; uniform float uAlpha; uniform float uHdr; uniform float uPulse;
  varying vec2 vUv;
  vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  void main(){
    vec2 p = vUv * 2.0 - 1.0; float r = length(p);
    if (r > 1.0) discard;
    float a1 = texture2D(uOuter, rot(p, uTime * 0.35) * 0.5 + 0.5).a;
    float a2 = texture2D(uInner, rot(p, -uTime * 0.6) * 0.5 + 0.5).a;
    float fill = smoothstep(1.0, 0.1, r) * 0.16 + smoothstep(0.98, 0.72, r) * smoothstep(0.55, 0.95, r) * 0.1;
    float rim = exp(-pow((r - 0.965) / 0.025, 2.0)) * 0.9;
    float sweep = pow(0.5 + 0.5 * sin(atan(p.y, p.x) * 1.0 - uTime * 3.2), 6.0) * smoothstep(0.35, 0.9, r) * smoothstep(1.0, 0.9, r);
    float pulse = 0.8 + 0.35 * sin(uTime * (4.0 + uPulse * 5.0));
    float g = (a1 + a2 * 1.1) * pulse + fill + rim + sweep * 0.5;
    vec3 c = uColor * uHdr * g + vec3(1.0, 0.85, 0.6) * (a1 + a2) * 0.35 * pulse;
    float grow = smoothstep(0.0, 0.2, uK);
    gl_FragColor = vec4(c, clamp(g, 0.0, 1.0) * uAlpha * grow);
  }`;
export function glyphMaterial() {
  return mat(PASS_VS, GLYPH_FS, { uOuter: { value: vtex('glyphOuter') }, uInner: { value: vtex('glyphInner') }, uColor: col(0xff3a2a), uTime: num(), uK: num(), uAlpha: num(1), uHdr: num(1.8), uPulse: num(0) }, { polygonOffset: true });
}

// ---------------------------------------------------------------------------------------------
// Summon rift: a swirling dark disc with a bright ragged rim (normal blend so it reads as a hole)
// ---------------------------------------------------------------------------------------------
const RIFT_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform float uTime; uniform float uOpen; uniform float uAlpha; uniform float uHdr;
  varying vec2 vUv;
  void main(){
    vec2 p = vUv * 2.0 - 1.0; float ang = atan(p.y, p.x); float r = length(p);
    float rag = 0.86 + 0.16 * (vn(vec2(ang * 3.0, uTime * 0.7)) - 0.5) + 0.07 * vn(vec2(ang * 13.0 + 3.0, uTime * 1.3));
    float R = rag * uOpen;
    float d = r - R;
    if (d > 0.22) discard;
    float inside = smoothstep(0.02, -0.03, d);
    float sw = fbm(vec2(ang * 1.6 + r * 6.0 - uTime * 1.6, r * 3.0 + uTime * 0.4));
    float void_ = (0.35 + 0.65 * (1.0 - r / max(R, 0.01))) * inside;
    float rim = exp(-d * d / 0.0030) * (0.55 + 0.9 * sw);
    float halo = exp(-max(d, 0.0) * 12.0) * step(0.0, d) * 0.7;
    vec3 c = vec3(0.01, 0.03, 0.02) * void_ + uColor * uHdr * (rim * 1.7 + halo * 0.8 + inside * sw * sw * 0.8);
    float a = clamp(void_ * 0.92 + rim + halo * 0.6 + inside * sw * 0.4, 0.0, 1.0) * uAlpha;
    gl_FragColor = vec4(c, a);
  }`;
export function riftMaterial() {
  return mat(PASS_VS, RIFT_FS, { uColor: col(0x6fe04a), uTime: num(), uOpen: num(0), uAlpha: num(1), uHdr: num(1.5) }, { blend: 'normal', polygonOffset: true });
}

// ---------------------------------------------------------------------------------------------
// Light pillar (heal / buff / summon column): open cylinder, vertical gradient with rising streaks
// ---------------------------------------------------------------------------------------------
const PILLAR_VS = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vView;
  void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
const PILLAR_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform float uTime; uniform float uK; uniform float uAlpha; uniform float uHdr; uniform float uTop;
  varying vec2 vUv; varying vec3 vN; varying vec3 vView;
  void main(){
    float y = vUv.y; // 0 bottom .. 1 top
    float ang = vUv.x * 6.2831853;
    float fres = 1.0 - abs(dot(normalize(vN), normalize(vView)));
    float streaks = vn(vec2(ang * 3.0 + 0.0, y * 2.0 - uTime * 2.4)) * 0.7 + vn(vec2(ang * 7.0 + 4.0, y * 4.0 - uTime * 3.6)) * 0.5;
    float grad = pow(1.0 - y, 1.4) * smoothstep(0.0, 0.04, y) * smoothstep(uTop + 0.02, uTop - 0.25, y);
    float edge = 0.35 + 1.2 * pow(fres, 1.5);
    float a = grad * (0.25 + streaks * 0.75) * edge * uAlpha;
    vec3 c = uColor * uHdr * (0.5 + streaks) * grad * edge + vec3(1.0) * pow(grad, 3.0) * 0.25 * edge;
    gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  }`;
export function pillarMaterial() {
  return mat(PILLAR_VS, PILLAR_FS, { uColor: col(0x45e08b), uTime: num(), uK: num(), uAlpha: num(1), uHdr: num(1.6), uTop: num(1) });
}
export const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, 0.5, 0);

// ---------------------------------------------------------------------------------------------
// Nova shell: fresnel sphere
// ---------------------------------------------------------------------------------------------
const SHELL_FS = /* glsl */`
  ${NOISE}
  uniform vec3 uColor; uniform float uAlpha; uniform float uHdr; uniform float uTime;
  varying vec2 vUv; varying vec3 vN; varying vec3 vView;
  void main(){
    float f = 1.0 - abs(dot(normalize(vN), normalize(vView)));
    float n = fbm(vUv * vec2(10.0, 6.0) + uTime * 0.8);
    float a = (pow(f, 2.2) * 1.1 + 0.08) * (0.6 + 0.8 * n) * uAlpha;
    vec3 c = uColor * uHdr * a * 1.8 + vec3(1.0) * pow(f, 6.0) * uAlpha;
    gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  }`;
export function shellMaterial() {
  return mat(PILLAR_VS, SHELL_FS, { uColor: col(0xffffff), uAlpha: num(1), uHdr: num(1.6), uTime: num() }, { side: THREE.FrontSide });
}
export const shellGeo = new THREE.SphereGeometry(1, 32, 20);

// ---------------------------------------------------------------------------------------------
// Fullscreen overlay (vignette pulse / flashes) and banner quads live in camera space
// ---------------------------------------------------------------------------------------------
const OVERLAY_FS = /* glsl */`
  uniform vec3 uColor; uniform float uAmt; uniform float uHole;
  varying vec2 vUv;
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p * vec2(0.9, 1.0));
    float v = smoothstep(uHole, 1.45, r);
    gl_FragColor = vec4(uColor * (0.6 + v * 1.4), v * v * uAmt);
  }`;
export function overlayMaterial() {
  return mat(PASS_VS, OVERLAY_FS, { uColor: col(0xff2a1a), uAmt: num(0), uHole: num(0.45) }, { depthTest: false });
}
