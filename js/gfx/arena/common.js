// Shared plumbing for the arena kit: the uniform block every atmosphere shader reads (sky, fog, water,
// ridges), the GLSL they share, material patches (directional height fog, wind sway) and small
// instancing / scatter helpers. Everything is deterministic: seeded rng + the stage clock only.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';

// The sacred zone: nothing taller than a pebble in here.
export const CLEAR = { x0: -5.5, x1: 5.5, z0: -4.5, z1: 7.5 };
export const inClear = (x, z, pad = 0) => x > CLEAR.x0 - pad && x < CLEAR.x1 + pad && z > CLEAR.z0 - pad && z < CLEAR.z1 + pad;

export const QSCALE = { low: 0.4, med: 0.7, high: 1 };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const rr = (rng, a, b) => a + (b - a) * rng();
export const rpick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const rsign = (rng) => (rng() < 0.5 ? -1 : 1);
export { mulberry32 };

const C = (h = 0x000000) => new THREE.Color(h);

// One uniform block per arena. Shaders take these by reference, so mood changes are just writes here.
export function makeUniforms() {
  return {
    uTime: { value: 0 },
    uHor: { value: C(0x40202a) }, uMid: { value: C(0x1a1430) }, uTop: { value: C(0x080a1a) },
    uGP: { value: [new THREE.Vector4(0, 0.5, 0.1, 1), new THREE.Vector4(1, 0.5, 0.1, 0), new THREE.Vector4(-1, 0.5, 0.1, 0)] },
    uGC: { value: [C(0xff6a20), C(0xff6a20), C(0xff6a20)] },
    uMoonDir: { value: new THREE.Vector3(0.4, 0.06, -1).normalize() }, uMoonCol: { value: C(0xcfe0ff) }, uMoonSize: { value: 0.035 }, uMoonOn: { value: 1 },
    uStars: { value: 0.8 }, uCloud: { value: 0.55 }, uCloudDark: { value: C(0x1a1424) }, uCloudLit: { value: C(0xff7a40) },
    uSkyMul: { value: C(0xffffff) },
    uFogBase: { value: C(0x120c12) }, uFogDens: { value: 0.016 }, uFogFall: { value: 0.22 }, uFogHeight: { value: 0.65 }, uFogGlow: { value: 0.5 },
    uFlicker: { value: 1 },
  };
}

// ---------------------------------------------------------------------------------------------------
// GLSL shared by sky / fog / water / ridges. `d` is a normalised world direction. Azimuth 0 = straight
// ahead (towards -Z, away from the camera), positive to the right (+X).
// ---------------------------------------------------------------------------------------------------
export const GLOW_PARS = /* glsl */`
uniform vec4 uGP[3]; uniform vec3 uGC[3];
vec3 qdHorizonGlow(vec3 d, float elScale){
  float az = atan(d.x, -d.z);
  float el = max(asin(clamp(d.y, -1.0, 1.0)), 0.0);
  vec3 g = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float da = az - uGP[i].x; da = atan(sin(da), cos(da));
    float a = exp(-(da * da) / (uGP[i].y * uGP[i].y));
    float e = exp(-pow(el / (uGP[i].z * elScale), 1.4));
    g += uGC[i] * (a * e * uGP[i].w);
  }
  return g;
}`;

export const SKYGRAD_PARS = /* glsl */`
uniform vec3 uHor, uMid, uTop, uSkyMul;
vec3 qdSkyGrad(vec3 d){
  float h = max(d.y, 0.0);
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.10, h));
  return mix(c, uTop, smoothstep(0.06, 0.75, h));
}`;

// ---------------------------------------------------------------------------------------------------
// Material patches. `patchArena(mat, U, opts)` adds (a) directional height fog: the fog colour is the
// horizon glow in the direction you are looking, so the far field burns orange towards the fire and
// goes cold elsewhere, and (b) optional wind sway for instanced vegetation / banners.
// ---------------------------------------------------------------------------------------------------
export function patchArena(material, U, opts = {}) {
  const { wind = 0, windK = 0.06, windSpeed = 1.6, flag = 0, ground = null, extraVertex = '', extraFrag = '', emissiveBoost = null } = opts;
  const key = `qdarena|${wind > 0}|${flag > 0}|${!!ground}|${extraVertex.length}|${extraFrag.length}|${!!emissiveBoost}`;
  material.fog = true;
  material.customProgramCacheKey = () => key;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    const u = shader.uniforms;
    u.uTime = U.uTime; u.uGP = U.uGP; u.uGC = U.uGC; u.uFogBase = U.uFogBase; u.uFogDens = U.uFogDens; u.uFogFall = U.uFogFall; u.uFogHeight = U.uFogHeight; u.uFogGlow = U.uFogGlow;
    u.uWindAmp = { value: wind }; u.uWindK = { value: windK }; u.uWindSpeed = { value: windSpeed }; u.uFlag = { value: flag };
    if (ground) ground.uniforms(u);
    let vs = shader.vertexShader; let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', `#include <common>
      varying vec3 vFogDir; varying vec3 vWPos;
      uniform float uTime, uWindAmp, uWindK, uWindSpeed, uFlag;
      ${extraVertex}`);
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${wind > 0 ? `{
        float hh = max(position.y, 0.0);
        vec4 ip = vec4(0.0, 0.0, 0.0, 1.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix * ip;
        #endif
        float ph = ip.x * 0.37 + ip.z * 0.53;
        float w = uWindAmp * pow(hh, 1.6) * uWindK;
        float gust = 0.6 + 0.4 * sin(uTime * 0.31 + ip.x * 0.05);
        transformed.x += (sin(uTime * uWindSpeed + ph) + 0.45 * sin(uTime * uWindSpeed * 2.7 + ph * 1.9)) * w * gust;
        transformed.z += cos(uTime * uWindSpeed * 0.83 + ph) * w * 0.55 * gust;
      }` : ''}
      ${flag > 0 ? `{
        float fx = max(position.x, 0.0);
        float ph2 = position.y * 1.3;
        transformed.z += (sin(uTime * 2.4 - fx * 3.2 + ph2) * 0.6 + sin(uTime * 4.1 - fx * 5.0) * 0.25) * uFlag * fx * fx;
        transformed.y += sin(uTime * 3.0 - fx * 4.0) * 0.12 * uFlag * fx * fx;
      }` : ''}`);
    vs = vs.replace('#include <fog_vertex>', `#include <fog_vertex>
      { vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        wp4 = modelMatrix * wp4; vFogDir = wp4.xyz - cameraPosition; vWPos = wp4.xyz; }`);
    fs = fs.replace('#include <common>', `#include <common>
      varying vec3 vFogDir; varying vec3 vWPos;
      uniform float uTime, uFogDens, uFogFall, uFogHeight, uFogGlow;
      uniform vec3 uFogBase;
      ${GLOW_PARS}
      ${extraFrag}`);
    fs = fs.replace('#include <fog_fragment>', `
      #ifdef USE_FOG
        { vec3 fd = normalize(vFogDir);
          float dist = vFogDepth;
          float f = 1.0 - exp(-uFogDens * uFogDens * dist * dist);
          float wy = vFogDir.y + cameraPosition.y;
          f *= mix(1.0, exp(-max(wy, 0.0) * uFogFall), uFogHeight);
          vec3 fc = uFogBase + qdHorizonGlow(fd, 1.6) * uFogGlow;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, clamp(f, 0.0, 1.0)); }
      #endif`);
    if (ground) { vs = ground.vertex(vs); fs = ground.fragment(fs); }
    if (emissiveBoost) fs = emissiveBoost(fs);
    shader.vertexShader = vs; shader.fragmentShader = fs;
  };
  material.needsUpdate = true;
  return material;
}

// Standard material with the arena patch: always a fresh clone, never mutates the shared mat() cache.
export function arenaMat(base, U, opts = {}, params = {}) {
  const m = base.clone();
  Object.assign(m, params);
  return patchArena(m, U, opts);
}

// ---------------------------------------------------------------------------------------------------
// Instancing & scatter helpers
// ---------------------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _e = new THREE.Euler(); const _s = new THREE.Vector3(); const _p = new THREE.Vector3(); const _c = new THREE.Color();

// items: [{ p:[x,y,z], r: yaw | [rx,ry,rz], s: n | [x,y,z], c: hex|Color }]
export function instanced(geo, material, items, { cast = false, receive = true, name } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
  mesh.count = items.length;
  let hasC = false;
  items.forEach((it, i) => {
    const r = it.r ?? 0; const s = it.s ?? 1;
    _e.set(...(Array.isArray(r) ? r : [0, r, 0]), 'YXZ'); _q.setFromEuler(_e);
    if (Array.isArray(s)) _s.set(...s); else _s.set(s, s, s);
    _p.set(...it.p);
    _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    if (it.c !== undefined) { _c.set(it.c); mesh.setColorAt(i, _c); hasC = true; }
  });
  if (hasC && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.frustumCulled = false;
  if (name) mesh.name = name;
  return mesh;
}

// Rejection sampling of positions in a region, outside the clear zone, with an optional density fn.
export function scatter(rng, n, { x = [-60, 60], z = [-80, 12], reject = null, density = null, pad = 0.6, tries = 40, clear = true } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < tries; t++) {
      const px = rr(rng, x[0], x[1]); const pz = rr(rng, z[0], z[1]);
      if (clear && inClear(px, pz, pad)) continue;
      if (reject && reject(px, pz)) continue;
      if (density && rng() > density(px, pz)) continue;
      out.push([px, pz]); break;
    }
  }
  return out;
}

// Cheap soft gradient textures drawn on a canvas (no files). Cached by name.
const texCache = new Map();
export function canvasTex(name, size, draw, { srgb = true } = {}) {
  if (texCache.has(name)) return texCache.get(name);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  texCache.set(name, t);
  return t;
}
export function disposeTex() { for (const t of texCache.values()) t.dispose(); texCache.clear(); }

// Merge helper that guarantees matching attribute sets (position, normal, uv, color).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function finishGeo(geo, { color = [1, 1, 1], uv = 0.5 } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv || uv > 0) {
    const pos = g.attributes.position; const nrm = g.attributes.normal; const uvs = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const ax = Math.abs(nrm.getX(i)); const ay = Math.abs(nrm.getY(i)); const az = Math.abs(nrm.getZ(i));
      const x = pos.getX(i) * uv; const y = pos.getY(i) * uv; const z = pos.getZ(i) * uv;
      if (ax >= ay && ax >= az) { uvs[i * 2] = z; uvs[i * 2 + 1] = y; } else if (ay >= az) { uvs[i * 2] = x; uvs[i * 2 + 1] = z; } else { uvs[i * 2] = x; uvs[i * 2 + 1] = y; }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  if (!g.attributes.color) {
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = color[0]; col[i * 3 + 1] = color[1]; col[i * 3 + 2] = color[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  return g;
}
export function xf(geo, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(Array.isArray(r) ? r : [0, r, 0]), 'YXZ')), Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
  geo.applyMatrix4(m); return geo;
}
// Tint a geometry's vertex colours by a function (x,y,z,[r,g,b]) -> [r,g,b] multiplier or absolute.
export function tintGeo(geo, fn) {
  const pos = geo.attributes.position; const col = geo.attributes.color;
  const out = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    out[0] = col.getX(i); out[1] = col.getY(i); out[2] = col.getZ(i);
    const r = fn(pos.getX(i), pos.getY(i), pos.getZ(i), out, i);
    if (r) { col.setXYZ(i, r[0], r[1], r[2]); } else col.setXYZ(i, out[0], out[1], out[2]);
  }
  return geo;
}
export { mergeGeometries };
