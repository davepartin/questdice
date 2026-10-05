// One die: real polyhedron geometry (bevelled), face atlas, and a glossy resin / gem material with a
// little shader sauce: depth-parallax inner glow ("something burns inside"), result-face focus, flash and rim.
//
//   const spec = dieSpecs(hero).NW;            // what to build for this slot
//   const die  = createDie({ spec, quality }); // { mesh, poly, sides, uniforms, ... }
//
// Faces are labelled by value (1..sides). A weapon's 0-face is a blank in its lane colour.

import * as THREE from 'three';
import * as D from '../../data.js';
import * as E from '../../engine.js';
import { makePoly, roundedGeometry, restQuat, readLabel } from './poly.js';
import { buildAtlas, diceStyle } from './faces.js';

export { makePoly, restQuat, readLabel };

// ------------------------------------------------------------------------------- specs
const PIP_BY_NUM = [null, 'gold', 'pierce', 'magic', 'magic'];
const FX_PIP = { heal: 'heal', magic: 'magic', pierce: 'pierce', stagger: 'stagger' };

/** Per-slot build spec from a hero (see engine.js weaponFaces / specialFace / sidesOf). */
export function dieSpecs(hero) {
  const out = {};
  for (const slot of D.SLOTS) {
    const role = D.ROLE[slot]; const sides = E.sidesOf(hero, slot);
    let theme; let labels = [];
    if (role === 'weapon') {
      theme = 'weapon';
      const inst = hero.loadout[slot]; const wid = inst.id;
      labels = E.weaponFaces(inst).map((f) => ({
        text: f.v === 0 ? null : String(f.v), blank: f.v === 0, tone: f.c, pip: f.fx ? FX_PIP[Object.keys(f.fx)[0]] || null : null, wm: D.WEAPONS[wid]?.hands === 2 ? (wid === 'bow' ? 'bow' : wid === 'staff' ? 'staff' : 'longsword') : wid === 'fists' ? 'fist' : wid,
      }));
    } else if (role === 'special') {
      theme = 'amethyst';
      for (let v = 1; v <= sides; v++) { const sym = E.specialFace(hero, slot, v); labels.push(sym ? { sym, text: sym } : { blank: true }); }
    } else if (role === 'heart') {
      theme = 'heart';
      for (let v = 1; v <= 6; v++) labels.push({ text: String(v), pip: v <= 4 ? PIP_BY_NUM[v] : null, tone: v === 5 ? 'b' : v === 6 ? 'r' : '', mark: v === 5 ? 'block' : v === 6 ? 'atk' : null });
    } else {
      theme = role === 'hand' ? 'smoke' : 'bone';
      for (let v = 1; v <= sides; v++) labels.push({ text: String(v), pip: PIP_BY_NUM[v] || null });
    }
    out[slot] = { slot, role, sides, theme, labels, key: `${theme}|${sides}|${JSON.stringify(labels)}` };
  }
  return out;
}

// ------------------------------------------------------------------------------- shader
const GLSL_NOISE = /* glsl */`
float qh31(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float qvn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(qh31(i),qh31(i+vec3(1,0,0)),f.x), mix(qh31(i+vec3(0,1,0)),qh31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(qh31(i+vec3(0,0,1)),qh31(i+vec3(1,0,1)),f.x), mix(qh31(i+vec3(0,1,1)),qh31(i+vec3(1,1,1)),f.x),f.y), f.z); }
float qfbm(vec3 p){ return 0.56*qvn(p)+0.3*qvn(p*2.03+7.1)+0.14*qvn(p*4.07+3.3); }
`;

const INNER = {
  heart: { k: 0.75, col: [1.0, 0.5, 0.1], tint: 0 },
  amethyst: { k: 0.5, col: [0.6, 0.3, 1.0], tint: 0 },
  weapon: { k: 0.55, col: [1, 1, 1], tint: 1 },
  smoke: { k: 0.16, col: [1.0, 0.85, 0.7], tint: 0 },
  bone: { k: 0.0, col: [1, 1, 1], tint: 0 },
};
const BODY = { heart: [0.9, 0.78, 0.5], amethyst: [0.8, 0.7, 1], weapon: [1, 1, 1], smoke: [1, 1, 1], bone: [1, 1, 1] };

function makeMaterial(atlas, theme, quality) {
  const T = atlas.textures;
  const inn = INNER[theme];
  const m = new THREE.MeshPhysicalMaterial({
    map: T.map, normalMap: T.normalMap, roughnessMap: T.orm, metalnessMap: T.orm, clearcoatMap: T.orm,
    roughness: 1, metalness: 1, normalScale: new THREE.Vector2(1, 1),
    clearcoat: quality === 'low' ? 0.6 : 1, clearcoatRoughness: 0.035, ior: 1.52, specularIntensity: 1,
    envMapIntensity: 0.5,
    emissive: new THREE.Color(1, 1, 1), emissiveMap: T.emissiveMap || null, emissiveIntensity: T.emissiveMap ? 0.9 : 1,
    sheen: 0, sheenColor: new THREE.Color(0xfff0d0), sheenRoughness: 0.5,
  });
  m.color.setScalar(({ bone: 0.7, smoke: 0.5, weapon: 0.62, heart: 0.62, amethyst: 0.66 }[theme] ?? 1) * diceStyle().bodyK);
  if (!T.emissiveMap) m.emissive = new THREE.Color(0, 0, 0);
  const u = {
    uTime: { value: 0 }, uInner: { value: inn.k }, uInnerCol: { value: new THREE.Vector3(...inn.col) }, uInnerTint: { value: inn.tint },
    uCamObj: { value: new THREE.Vector3(0, 5, 5) }, uFocusDir: { value: new THREE.Vector3(0, 1, 0) }, uFocusRange: { value: new THREE.Vector2(0.5, 0.8) },
    uSide: { value: 1 }, uSelf: { value: ({ weapon: 0.5, bone: 0.2, smoke: 0.3, heart: 0.18, amethyst: 0.3 }[theme] ?? 0.2) * diceStyle().selfK }, uFlash: { value: new THREE.Color(0, 0, 0) }, uRim: { value: new THREE.Color(0, 0, 0) }, uDim: { value: 0 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vWN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vOP; varying vec3 vWN;
uniform float uTime, uInner, uInnerTint, uSide, uDim, uSelf; uniform vec3 uInnerCol, uCamObj, uFocusDir; uniform vec2 uFocusRange; uniform vec3 uFlash, uRim;
${GLSL_NOISE}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float qFocus = smoothstep(uFocusRange.x, uFocusRange.y, dot(normalize(vWN), uFocusDir));
float qDim = mix(uSide, 1.0, qFocus) * (1.0 - uDim * 0.5);
vec3 qAlb = diffuseColor.rgb;
diffuseColor.rgb *= qDim;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), uDim * 0.65);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float qRes = texture2D(roughnessMap, vRoughnessMapUv).r;
  vec3 qV = normalize(vViewPosition); vec3 qN = normalize(normal);
  float qNV = clamp(abs(dot(qN, qV)), 0.0, 1.0);
  vec3 qInner = vec3(0.0);
  if (uInner > 0.001) {
    vec3 dirO = normalize(vOP - uCamObj);
    vec3 q1 = vOP + dirO * 0.22; vec3 q2 = vOP + dirO * 0.52;
    float n1 = qfbm(q1 * 3.6 + vec3(0.0, uTime * 0.2, 0.0));
    float n2 = qfbm(q2 * 6.5 + vec3(uTime * 0.12, 0.0, -uTime * 0.08));
    float v = smoothstep(0.44, 0.84, n1 * 0.62 + n2 * 0.5);
    vec3 tint = mix(uInnerCol, normalize(qAlb + 0.02) * 1.5, uInnerTint);
    qInner = tint * (v * 1.2 + 0.1 + 0.25 * (1.0 - qNV)) * uInner * qRes;
  }
  totalEmissiveRadiance = (totalEmissiveRadiance + qInner + qAlb * uSelf * (0.75 + 0.25 * qRes)) * qDim + uFlash + uRim * pow(1.0 - qNV, 2.2);
}`);
  };
  m.customProgramCacheKey = () => 'qdice-die-1';
  return m;
}

const R_BY = { 4: 0.05, 6: 0.05, 8: 0.037, 10: 0.035 };

/** Build a die mesh for a spec (spec.theme, spec.sides, spec.labels[label-1]). */
export function createDie({ spec, quality = 'high' }) {
  const poly = makePoly(spec.sides);
  const faces = new Array(poly.faces.length).fill(null);
  spec.labels.forEach((l, i) => { const fi = poly.labelFace[i]; if (fi != null && fi >= 0) faces[fi] = l; });
  const atlas = buildAtlas({ poly, faces, theme: spec.theme, quality });
  if (!atlas.geo) {
    const seg = quality === 'high' ? 4 : quality === 'med' ? 3 : 2;
    atlas.geo = roundedGeometry(poly, { r: R_BY[spec.sides], seg, uvOf: atlas.uvOf, trimUV: atlas.trimUV });
  }
  const material = makeMaterial(atlas, spec.theme, quality);
  const mesh = new THREE.Mesh(atlas.geo, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = `die-${spec.slot || ''}-d${spec.sides}`;
  const r = R_BY[spec.sides]; const k = (poly.inR - r) / poly.inR;
  const physVerts = poly.verts.map((v) => v.clone().multiplyScalar(k));
  const u = material.userData.u;
  const die = {
    mesh, poly, sides: spec.sides, theme: spec.theme, spec, uniforms: u, material, atlas,
    radius: r, inR: poly.inR, physVerts,
    // direction a viewer reads the die from (d4 reads the face turned toward the camera)
    setView(dirWorld) {
      if (spec.sides === 4) { u.uFocusDir.value.copy(dirWorld); u.uFocusRange.value.set(0.8, 0.94); } else { u.uFocusDir.value.set(0, 1, 0); u.uFocusRange.value.set(0.52, 0.82); }
    },
    setRest(k01) { u.uSide.value = 1 - 0.4 * k01; },
    updateCamera(camera) { mesh.updateMatrixWorld(); u.uCamObj.value.copy(camera.position); mesh.worldToLocal(u.uCamObj.value); },
    dispose() { material.dispose(); },
  };
  return die;
}
