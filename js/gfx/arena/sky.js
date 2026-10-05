// Sky dome (gradient, horizon glow lobes, moon, stars, lit clouds) and far ridge curtains with
// pine / dead-tree / smooth silhouettes, hazed towards the horizon glow so distance reads as depth.
import * as THREE from 'three';
import { noiseTexture } from '../tex.js';
import { GLOW_PARS, SKYGRAD_PARS } from './common.js';

const SKY_FS = /* glsl */`
varying vec3 vDir;
uniform sampler2D tNoise;
uniform float uTime, uStars, uCloud, uMoonSize, uMoonOn, uStorm;
uniform vec3 uMoonDir, uMoonCol, uCloudDark, uCloudLit;
${SKYGRAD_PARS}
${GLOW_PARS}
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 skyColor(vec3 d){
  vec3 c = qdSkyGrad(d);
  vec3 glow = qdHorizonGlow(d, 1.0);
  c += glow;
  float h = max(d.y, 0.0);
  // ---- clouds: planar projection, lit from below by the glow and from the moon side
  vec2 cp = d.xz / (h + 0.11) * 0.28 + vec2(uTime * 0.0035, uTime * 0.0012);
  float n = texture2D(tNoise, cp).r * 0.55 + texture2D(tNoise, cp * 2.3 + 0.37).g * 0.3 + texture2D(tNoise, cp * 6.1 + 0.11).b * 0.15;
  float cover = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.22, n);
  cover *= smoothstep(-0.01, 0.02, d.y);
  float edge = smoothstep(0.0, 0.5, cover) * (1.0 - smoothstep(0.5, 1.0, cover));
  float md = max(dot(d, uMoonDir), 0.0);
  vec3 lit = qdHorizonGlow(d, 2.6) * 0.9 + uCloudLit * (0.25 + 0.55 * (1.0 - smoothstep(0.0, 0.35, h)) * 0.5);
  lit += uMoonCol * (pow(md, 14.0) * 0.55 + edge * pow(md, 4.0) * 0.5) * uMoonOn;
  vec3 cc = uCloudDark + lit * (0.5 + 0.9 * edge) * (0.55 + 0.45 * (1.0 - cover * 0.5));
  // ---- stars (fade under clouds / glow)
  vec3 sd = d * 140.0; vec3 id = floor(sd); vec3 fp = fract(sd) - 0.5;
  float hs = h31(id); float star = step(0.9935, hs) * smoothstep(0.42, 0.0, length(fp)) * (0.5 + 0.5 * sin(uTime * (1.5 + hs * 6.0) + hs * 40.0));
  float starFade = smoothstep(0.02, 0.18, h) * (1.0 - cover) * (1.0 - clamp(dot(glow, vec3(0.6)), 0.0, 1.0));
  c += vec3(0.8, 0.9, 1.0) * star * uStars * starFade * 1.6;
  // ---- moon
  vec3 mt = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))); vec3 mb = cross(mt, uMoonDir);
  float ang = acos(clamp(dot(d, uMoonDir), -1.0, 1.0));
  vec2 mp = vec2(dot(d, mt), dot(d, mb)) / uMoonSize;
  float disc = smoothstep(uMoonSize, uMoonSize * 0.93, ang);
  float cr = texture2D(tNoise, mp * 0.35 + 0.5).r * 0.6 + texture2D(tNoise, mp * 0.9 + 0.3).g * 0.4;
  float rr = length(mp);
  vec3 moon = uMoonCol * (0.55 + 0.6 * cr) * (0.78 + 0.22 * sqrt(max(1.0 - rr * rr, 0.0)));
  float halo = exp(-ang * 22.0 / (uMoonSize * 6.0 + 0.2)) * 0.5 + exp(-ang * 4.0 / (uMoonSize * 6.0 + 0.2)) * 0.08;
  vec3 withClouds = mix(c, cc, cover * 0.94);
  vec3 outc = withClouds + uMoonCol * halo * (1.0 - cover * 0.7) * uMoonOn * 0.5;
  outc = mix(outc, moon * 2.2, disc * uMoonOn * (1.0 - cover * 0.8));
  return outc;
}
void main(){
  vec3 d = normalize(vDir);
  vec3 c = skyColor(d) * uSkyMul;
  // storm flicker (boss): faint lightning wash behind the clouds
  c += vec3(0.5, 0.35, 0.4) * uStorm * pow(max(sin(uTime * 0.9) * sin(uTime * 2.3 + 1.0), 0.0), 12.0);
  gl_FragColor = vec4(c, 1.0);
}`;

export function makeSky(U) {
  U.uStorm = U.uStorm || { value: 0 };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { ...U, tNoise: { value: noiseTexture() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: SKY_FS,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), mat);
  mesh.renderOrder = -100; mesh.frustumCulled = false; mesh.name = 'sky';
  return mesh;
}

// ---------------------------------------------------------------------------------------------------
// Ridge curtains: an open arc of wall at radius R around the playfield. The silhouette is cut in the
// fragment shader (smooth hills, a pine saw-tooth line, or ragged dead trees), then hazed.
// ---------------------------------------------------------------------------------------------------
const RIDGE_FS = /* glsl */`
varying vec3 vW; varying vec2 vUv;
uniform sampler2D tNoise;
uniform float uTime, uHaze, uRidgeTop, uMode, uSeed, uToothW, uToothH, uRim;
uniform vec3 uRidgeCol, uRimCol, uCamPos;
${SKYGRAD_PARS}
${GLOW_PARS}
float hh(float x){ return fract(sin(x * 127.1 + uSeed * 31.7) * 43758.5453); }
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float x = atan(vW.x, -vW.z) * 200.0;
  // silhouette height above the ridge base (uTop = max)
  float low = texture2D(tNoise, vec2(x * 0.0021 + uSeed * 0.31, 0.37)).r * 0.65 + texture2D(tNoise, vec2(x * 0.0061 + 0.5, 0.71)).g * 0.35;
  float hgt = uRidgeTop * (0.35 + 0.9 * low);
  float tooth = 0.0;
  if (uMode > 0.5 && uMode < 1.5) {          // pines: saw-tooth with per-tree random height
    float cell = x / uToothW; float id = floor(cell); float f = fract(cell);
    float tri = 1.0 - abs(f - 0.5) * 2.0;
    float tall = 0.45 + 0.9 * hh(id);
    float lay = 0.5 + 0.5 * sin((vW.y) * 3.4 + hh(id) * 6.0) * 0.0;
    tooth = pow(tri, 1.4) * uToothH * tall;
    // ragged tiers
    tooth *= 0.85 + 0.15 * step(0.5, fract(vW.y * 0.9 + hh(id) * 3.0));
  } else if (uMode > 1.5) {                   // dead trees: sparse thin spikes with forks
    float cell = x / uToothW; float id = floor(cell); float f = fract(cell);
    float spike = smoothstep(0.08, 0.0, abs(f - 0.5)) * step(0.55, hh(id)) * uToothH * (0.5 + hh(id + 5.0));
    float fork = smoothstep(0.05, 0.0, abs(f - 0.5 - (hh(id + 2.0) - 0.5) * 0.5)) * step(0.7, hh(id + 3.0)) * uToothH * 0.6 * (0.6 + hh(id + 9.0));
    tooth = max(spike, fork);
  }
  float y = vW.y - uCamPos.y;       // height above the ridge base plane
  float top = hgt + tooth;
  if (y > top) discard;
  float k = clamp(y / max(top, 0.01), 0.0, 1.0);
  // haze: thicker towards the foot and with distance; rim light near the crest from the horizon glow
  vec3 hor = qdSkyGrad(vec3(d.x, 0.0, d.z)) + qdHorizonGlow(vec3(d.x, 0.0, d.z), 1.0) * 0.9;
  float haze = clamp(uHaze + (1.0 - k) * 0.5, 0.0, 1.0);
  vec3 col = mix(uRidgeCol * (0.55 + 0.45 * k), hor, haze);
  float crest = smoothstep(0.82, 1.0, k);
  col += uRimCol * crest * uRim * (0.4 + 0.6 * low);
  gl_FragColor = vec4(col * uSkyMul, 1.0);
}`;

export function makeRidge(U, { radius = 170, arc = 2.6, top = 18, base = 0, mode = 0, haze = 0.7, color = 0x120c14, rim = 0x000000, rimK = 0, seed = 1, toothW = 6, toothH = 5, center = 0 } = {}) {
  const segs = 96;
  const geo = new THREE.BufferGeometry();
  const pos = []; const uv = []; const idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = center + (i / segs - 0.5) * arc * 2; // azimuth around -Z
    const x = Math.sin(a) * radius; const z = -Math.cos(a) * radius;
    pos.push(x, base - 20, z, x, base + top * 1.9 + toothH * 2, z);
    uv.push(i / segs, 0, i / segs, 1);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false, depthWrite: true,
    uniforms: {
      tNoise: { value: noiseTexture() }, uTime: U.uTime, uGP: U.uGP, uGC: U.uGC, uHor: U.uHor, uMid: U.uMid, uTop: U.uTop, uRidgeTop: { value: top }, uSkyMul: U.uSkyMul,
      uHaze: { value: haze }, uMode: { value: mode }, uSeed: { value: seed }, uToothW: { value: toothW }, uToothH: { value: toothH }, uRim: { value: rimK },
      uRidgeCol: { value: new THREE.Color(color) }, uRimCol: { value: new THREE.Color(rim) }, uCamPos: { value: new THREE.Vector3(0, base, 0) },
    },
    vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: RIDGE_FS,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = -50; mesh.name = 'ridge';
  return mesh;
}
