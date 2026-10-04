// Terrain (non-uniform grid: dense under the playfield, stretching out to the horizon), the four-layer
// splat ground material (dirt / living ground / stone & road / burnt ash with glowing cracks, all blended by
// noise + albedo-height so seams read as natural), and the reflective water shader used by rivers and puddles.
import * as THREE from 'three';
import { pbr, noiseTexture } from '../tex.js';
import { patchArena } from './common.js';
import { GLOW_PARS, SKYGRAD_PARS } from './common.js';

// ---------------------------------------------------------------------------------------------------
export function makeTerrain(U, cfg, quality) {
  const dens = quality === 'low' ? 1.5 : quality === 'med' ? 1.2 : 1;
  const sx = 0.6 * dens;
  const xsR = []; for (let v = 0; v <= 170; v += Math.min(5, sx * Math.pow(1.045, Math.max(0, (v - 9) / 1.5)))) xsR.push(v);
  const X = [...xsR.slice(1).reverse().map((v) => -v), ...xsR];
  // z: dense from -8 to 10, stretching to -190 behind and +45 in front
  const Z = [];
  for (let v = -8; v >= -190; v -= Math.min(5, sx * Math.pow(1.05, Math.max(0, (-8 - v) / 1.5)))) Z.unshift(v);
  for (let v = -8 + sx; v <= 10; v += sx) Z.push(v);
  for (let v = 10; v <= 50; v += Math.min(5, sx * Math.pow(1.06, Math.max(0, (v - 10) / 1.5)))) Z.push(v);
  const nx = X.length; const nz = Z.length;
  const pos = new Float32Array(nx * nz * 3); const col = new Float32Array(nx * nz * 3);
  const H = cfg.height || (() => 0);
  const V = cfg.vcolor || (() => [1, 1, 1]);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3; const x = X[i]; const z = Z[j];
      pos[k] = x; pos[k + 1] = H(x, z); pos[k + 2] = z;
      const c = V(x, z); col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; const b = a + 1; const c = a + nx; const d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const gm = groundMaterial(U, cfg);
  const mesh = new THREE.Mesh(geo, gm);
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'terrain'; mesh.frustumCulled = false;
  return { mesh, hAt: H, tris: idx.length / 3 };
}

// ---------------------------------------------------------------------------------------------------
function groundMaterial(U, cfg) {
  const L = cfg.layers;
  const sets = L.map((l) => l.set || pbr(l.kind, { seed: l.seed || 1, tint: l.tint, dark: l.dark, size: l.size || 256, ...(l.opts || {}) }));
  const ten = (s) => s.normalMap;
  const base = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0, vertexColors: true, envMapIntensity: 0.55 });
  const G = {
    uniforms(u) {
      u.tNoise = { value: noiseTexture() };
      sets.forEach((s, i) => { u[`tC${i}`] = { value: s.map }; u[`tN${i}`] = { value: ten(s) }; });
      u.tE3 = { value: sets[3].emissiveMap || sets[3].map };
      u.uSc = { value: new THREE.Vector4(...L.map((l) => l.scale)) };
      u.uT = { value: new THREE.Vector3(...(cfg.thresholds || [0.55, 2, 0.6])) };
      const r = cfg.road || { x: 0, amp: 0, freq: 0, w: 0 };
      u.uRoad = { value: new THREE.Vector4(r.x, r.amp, r.freq, r.w) };
      u.uCrack = U.uCrack; u.uWet = { value: new THREE.Vector2(...(cfg.wet || [0.8, 0.3])) }; u.uNStr = { value: cfg.nstr ?? 0.9 };
      u.uTint = { value: new THREE.Color(cfg.tintMul ?? 0xffffff) };
    },
    vertex: (vs) => vs,
    fragment: (fs) => fs
      .replace('#include <common>', `#include <common>
        uniform sampler2D tNoise, tC0, tC1, tC2, tC3, tN0, tN1, tN2, tN3, tE3;
        uniform vec4 uSc, uRoad; uniform vec3 uT, uTint; uniform vec2 uWet; uniform float uNStr, uCrack;
        vec3 qdL(sampler2D tc, sampler2D tn, vec2 p, float s, out vec2 nxy){
          vec2 uv = p * s;
          vec3 a = texture2D(tc, uv).rgb; vec3 b = texture2D(tc, uv * 0.29 + vec2(0.37, 0.71)).rgb;
          vec2 na = texture2D(tn, uv).xy * 2.0 - 1.0; vec2 nb = texture2D(tn, uv * 0.29 + vec2(0.37, 0.71)).xy * 2.0 - 1.0;
          nxy = na + nb * 0.5;
          return a * (0.5 + 1.0 * dot(b, vec3(0.333)));
        }
        float qdLum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }`)
      .replace('#include <map_fragment>', `
        vec2 gP = vWPos.xz;
        vec3 gnA = texture2D(tNoise, gP * 0.019).rgb; vec3 gnB = texture2D(tNoise, gP * 0.061 + 3.1).rgb; vec3 gnC = texture2D(tNoise, gP * 0.21 + 7.7).rgb;
        vec2 gn0, gn1, gn2, gn3;
        vec3 gc0 = qdL(tC0, tN0, gP, uSc.x, gn0); vec3 gc1 = qdL(tC1, tN1, gP, uSc.y, gn1);
        vec3 gc2 = qdL(tC2, tN2, gP, uSc.z, gn2); vec3 gc3 = qdL(tC3, tN3, gP, uSc.w, gn3);
        float gLo = gnA.r * 0.55 + gnB.g * 0.45;
        float gwB = smoothstep(uT.x - 0.1, uT.x + 0.1, gLo + (gnC.r - 0.5) * 0.3);
        float gRoadD = abs(gP.x - (uRoad.x + sin(gP.y * uRoad.z) * uRoad.y + sin(gP.y * uRoad.z * 2.3 + 1.3) * uRoad.y * 0.3));
        float gRoad = uRoad.w > 0.0 ? 1.0 - smoothstep(uRoad.w * 0.55, uRoad.w, gRoadD + (gnB.r - 0.5) * 1.6 + (gnC.g - 0.5) * 0.5) : 0.0;
        float gwC = max(gRoad, smoothstep(uT.y - 0.07, uT.y + 0.07, gnA.b * 0.5 + gnB.b * 0.5 + (gnC.g - 0.5) * 0.3));
        float gwD = smoothstep(uT.z - 0.09, uT.z + 0.09, gnA.g * 0.55 + gnB.r * 0.45 + (gnC.b - 0.5) * 0.22);
        vec4 gw = vec4(1.0 - gwB, gwB, 0.0, 0.0);
        gw *= (1.0 - gwD); gw.w = gwD; gw *= (1.0 - gwC); gw.z = gwC;
        vec4 gh = vec4(qdLum(gc0), qdLum(gc1), qdLum(gc2), qdLum(gc3));
        vec4 gws = pow(gw * (0.2 + gh * 1.6), vec4(1.7)); gws /= (gws.x + gws.y + gws.z + gws.w + 1e-4);
        vec3 gAlb = (gc0 * gws.x + gc1 * gws.y + gc2 * gws.z + gc3 * gws.w) * uTint;
        float gWet = smoothstep(uWet.x, uWet.x + 0.1, gnB.b * 0.6 + gnA.r * 0.4) * uWet.y;
        gAlb *= 1.0 - gWet * 0.45;
        float gRough = mix(0.94, 0.22, gWet);
        vec2 gN = gn0 * gws.x + gn1 * gws.y + gn2 * gws.z + gn3 * gws.w;
        vec3 gEm = texture2D(tE3, gP * uSc.w).rgb * gws.w * uCrack * (0.65 + 0.55 * sin(uTime * 1.4 + gnC.r * 30.0) * sin(uTime * 0.8 + gnB.g * 20.0));
        diffuseColor.rgb *= gAlb;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', `{ vec3 gwp = vec3(gN.x, 0.0, -gN.y) * uNStr; normal = normalize(normal + (viewMatrix * vec4(gwp, 0.0)).xyz); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gEm;'),
  };
  U.uCrack = U.uCrack || { value: 1 };
  return patchArena(base, U, { ground: G });
}

// ---------------------------------------------------------------------------------------------------
// Water: sky + glow + moon reflection at the reflected direction, ripple normals from scrolling noise,
// a dark tree-line silhouette in the reflection, sparkle where the far fire reflects, soft shores.
// ---------------------------------------------------------------------------------------------------
const WATER_VS = /* glsl */`
varying vec3 vW; varying vec2 vUv; varying float vSeed; varying float vDepth;
void main(){
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  vSeed = 0.0;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p; vSeed = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].z * 0.291);
  #endif
  vec4 w = modelMatrix * p; vW = w.xyz;
  vec4 mv = viewMatrix * w; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const WATER_FS = /* glsl */`
varying vec3 vW; varying vec2 vUv; varying float vSeed; varying float vDepth;
uniform sampler2D tNoise;
uniform float uTime, uRipple, uFlow, uOpacity, uMirror, uTL, uTLJag, uFoam, uSparkK, uFogDens, uFogFall, uFogHeight, uFogGlow, uMoonSize, uMoonOn, uRough;
uniform vec3 uDeep, uShallow, uSpark, uMoonDir, uMoonCol, uFogBase, uTLCol, uFireCol; uniform vec4 uFireP[4];
${SKYGRAD_PARS}
${GLOW_PARS}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec2 q = vW.xz;
  float e = 0.03;
  vec2 u1 = q * uRipple * 0.31 + vec2(uTime * uFlow * 0.06, uTime * 0.011);
  vec2 u2 = q * uRipple * 0.83 + vec2(-uTime * uFlow * 0.045, -uTime * 0.02) + 0.3;
  float a0 = texture2D(tNoise, u1).r; float ax = texture2D(tNoise, u1 + vec2(e, 0.0)).r; float az = texture2D(tNoise, u1 + vec2(0.0, e)).r;
  float b0 = texture2D(tNoise, u2).g; float bx = texture2D(tNoise, u2 + vec2(e, 0.0)).g; float bz = texture2D(tNoise, u2 + vec2(0.0, e)).g;
  vec2 gr = (vec2(ax - a0, az - a0) * 0.9 + vec2(bx - b0, bz - b0) * 0.6) / e * 0.12;
  vec3 N = normalize(vec3(-gr.x * uRough, 1.0, -gr.y * uRough));
  vec3 R = reflect(-V, N); R.y = max(R.y, 0.015);
  vec3 sky = (qdSkyGrad(R) * 1.4 + qdHorizonGlow(R, 3.2) * 1.5) * uSkyMul;
  float md = max(dot(R, uMoonDir), 0.0);
  sky += uMoonCol * (pow(md, 900.0) * 6.0 + pow(md, 60.0) * 0.5) * uMoonOn;
  // tree-line / far silhouette in the reflection
  float jag = (texture2D(tNoise, vec2(atan(R.x, -R.z) * 3.0, 0.2)).r - 0.5) * uTLJag + (a0 - 0.5) * 0.02;
  float tl = smoothstep(uTL - 0.012, uTL + 0.012, R.y + jag);
  sky = mix(uTLCol, sky, tl);
  float F = clamp(0.035 + 0.965 * pow(1.0 - max(dot(N, V), 0.0), 4.0) + uMirror, 0.0, 1.0);
  float edge = 1.0; float shore = 0.0;
  #ifdef RIVER
    edge = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    shore = 1.0 - edge;
  #endif
  #ifdef PUDDLE
    vec2 c = vUv - 0.5; float rn = texture2D(tNoise, vUv * 1.4 + vSeed * 7.0).r;
    float rad = length(c) * 2.0 + (rn - 0.5) * 0.9;
    edge = smoothstep(1.0, 0.55, rad); shore = smoothstep(1.0, 0.7, rad) - smoothstep(0.85, 0.55, rad);
  #endif
  vec3 col = mix(mix(uDeep, uShallow, shore * 0.6), sky, F);
  float glowK = dot(qdHorizonGlow(R, 1.6), vec3(0.33));
  float sp = texture2D(tNoise, q * 3.3 + vec2(uTime * 0.04, -uTime * 0.05)).b * 0.6 + texture2D(tNoise, q * 7.1 - uTime * 0.03).g * 0.4;
  col += uSpark * pow(smoothstep(0.62, 0.92, sp), 2.5) * glowK * uSparkK * (0.4 + F);
  for (int i = 0; i < 4; i++) { vec3 L = uFireP[i].xyz - vW; float dd = length(L); L /= max(dd, 0.1); float sp2 = pow(max(dot(R, L), 0.0), 36.0); col += uFireCol * uFireP[i].w * sp2 * 26.0 / (1.0 + dd * dd * 0.012) * (0.3 + F); }
  float foam = shore * smoothstep(0.55, 0.9, texture2D(tNoise, q * 2.2 + uTime * 0.02).b) * uFoam;
  col = mix(col, vec3(0.5, 0.55, 0.62) * (0.3 + glowK), foam * 0.6);
  // fog (same recipe as the standard patch)
  vec3 fd = normalize(vW - cameraPosition);
  float f = (1.0 - exp(-uFogDens * uFogDens * vDepth * vDepth)) * mix(1.0, exp(-max(vW.y, 0.0) * uFogFall), uFogHeight);
  col = mix(col, uFogBase + qdHorizonGlow(fd, 1.6) * uFogGlow, clamp(f, 0.0, 1.0));
  float alpha = uOpacity * edge;
  gl_FragColor = vec4(col, alpha);
}`;

export function waterMaterial(U, o = {}, mode = 'RIVER') {
  const {
    deep = 0x0a1018, shallow = 0x1d2c34, spark = 0xff8a40, ripple = 1, flow = 1, opacity = 0.96, mirror = 0.0, tl = 0.07, tlJag = 0.05, tlCol = 0x05060a,
    foam = 0.5, sparkK = 1, rough = 1,
  } = o;
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    defines: { [mode]: 1 },
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: {
      tNoise: { value: noiseTexture() }, uTime: U.uTime, uGP: U.uGP, uGC: U.uGC, uHor: U.uHor, uMid: U.uMid, uTop: U.uTop, uSkyMul: U.uSkyMul,
      uMoonDir: U.uMoonDir, uMoonCol: U.uMoonCol, uMoonSize: U.uMoonSize, uMoonOn: U.uMoonOn,
      uFogBase: U.uFogBase, uFogDens: U.uFogDens, uFogFall: U.uFogFall, uFogHeight: U.uFogHeight, uFogGlow: U.uFogGlow, uFireP: U.uFireP, uFireCol: U.uFireCol,
      uRipple: { value: ripple }, uFlow: { value: flow }, uOpacity: { value: opacity }, uMirror: { value: mirror }, uTL: { value: tl }, uTLJag: { value: tlJag }, uTLCol: { value: new THREE.Color(tlCol) },
      uFoam: { value: foam }, uSparkK: { value: sparkK }, uRough: { value: rough },
      uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uSpark: { value: new THREE.Color(spark) },
    },
    vertexShader: WATER_VS, fragmentShader: WATER_FS,
  });
}
