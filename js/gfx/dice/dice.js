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
import { bodyWatermarkSrc, CLASS_BODY_WATERMARKS } from './bodywm.js';
import { bodyCornerMark } from './bodymarks.js';

export { CLASS_BODY_WATERMARKS, bodyWatermarkSrc };

export { makePoly, restQuat, readLabel };

// ------------------------------------------------------------------------------- specs
const PIP_BY_NUM = [null, 'heal', 'pierce', 'magic', 'gold'];
const FX_PIP = { heal: 'heal', magic: 'magic', pierce: 'pierce', stagger: 'stagger' };

// Body marks on the white dice (a helmet on the head, a glove on each hand, boots on the feet), behind the numbers.
// A look being tried out (Dave, Oct 2026): off (0) in the game for now; setBodyMarks(k) turns it on at strength k.
const BODY_MARK = { N: { wm: 'helmet' }, W: { wm: 'gauntlet' }, E: { wm: 'gauntlet', wmFlip: true }, S: { wm: 'bootpair' } }; // thumbs point in, toward the heart
let bodyMarks = 0;
export function setBodyMarks(k) { bodyMarks = k || 0; }

/** Per-slot build spec from a hero (see engine.js weaponFaces / specialFace / sidesOf). */
export function dieSpecs(hero, previewSizes = {}) {
  const out = {};
  for (const slot of D.SLOTS) {
    const role = D.ROLE[slot]; const sides = previewSizes[slot] ?? E.sidesOf(hero, slot);
    let theme; let labels = [];
    if (role === 'weapon') {
      theme = 'weapon';
      const inst = hero.loadout[slot]; const wid = D.modelOf(inst.id); // a legendary shows its model's mark
      const FXK = { pierce: 'pierce', magic: 'magic', heal: 'heal', stagger: 'stagger', loot: 'gold', splash: 'stagger' }; // Dawnbreaker's splash shows as a burst
      // every weapon face reads "+N" over a big red starburst (attack) or blue shield (block): a +0 still sends the hand's strength that way
      labels = E.weaponFaces(inst, sides).slice(0, sides).map((f) => ({
        text: `+${f.v}`, wface: f.c === 'b' ? 'b' : 'r', zero: f.v === 0, tone: f.c, pip: null,
        corners: [...Array(f.plus || 0).fill(f.c === 'b' ? 'def' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(FXK[k]))].filter(Boolean), // +1 attack/block icons first, then a crit's icons (two or three)
        wm: D.WEAPONS[wid]?.hands === 2 ? (wid === 'bow' ? (inst.twin ? 'arrows' : 'bow') : wid === 'staff' ? 'staff' : wid === 'warhammer' ? 'warhammer' : 'longsword') : wid === 'fists' ? 'fist' : wid,
      }));
    } else if (role === 'special') {
      theme = 'amethyst';
      for (let v = 1; v <= sides; v++) {
        const sym = E.specialFace(hero, slot, v);
        if (sym === 'X2') labels.push({ sym: 'SURGE', text: 'X2' });
        else if (Array.isArray(sym)) labels.push({ text: String(v), corners: sym.map((k) => (k === 'block' ? 'def' : k)) }); // the number it pays, with its symbol
        else if (v >= 4) labels.push({ text: String(v) }); // no symbol yet: it still shows its number (it counts in a straight)
        else labels.push({ blank: true });
      }
    } else if (role === 'heart') {
      theme = 'heart';
      for (let v = 1; v <= 6; v++) labels.push({ text: String(v), pip: v <= 4 ? PIP_BY_NUM[v] : null, tone: v === 5 ? 'b' : v === 6 ? 'r' : '', mark: v === 5 ? 'block' : v === 6 ? 'atk' : null });
    } else {
      theme = 'bone'; // head, hands and feet are all the same white die
      // The ivory d6 pilot uses a compact moulded corner mark. Other shapes keep
      // the existing artwork until their narrower faces receive a separate pass.
      const cornerMark = bodyCornerMark(hero.cls, slot, sides);
      const bodyWm = bodyMarks || cornerMark ? null : bodyWatermarkSrc(hero.cls, slot);
      // what the face pays is what it shows: one symbol per point of heal / pierce / magic / gold (D.FACE_PAY)
      for (let v = 1; v <= sides; v++) {
        const pay = D.FACE_PAY[v]; const corners = []; for (const k of ['heal', 'pierce', 'magic', 'gold']) for (let i = 0; i < (pay?.[k] || 0); i++) corners.push(k);
        labels.push({
          text: String(v), pip: corners[0] || null, corners: corners.length ? corners : undefined,
          ...(bodyWm ? { bodyWm } : {}),
          ...(cornerMark ? { cornerMark } : {}),
          ...(bodyMarks && !cornerMark && BODY_MARK[slot] ? { ...BODY_MARK[slot], wmK: bodyMarks, wmS: sides === 4 || sides === 8 ? 2.3 : sides === 10 ? 2 : 1.8 } : {}),
        });
      }
    }
    out[slot] = { slot, role, sides, theme, labels, key: `${theme}|${sides}|${JSON.stringify(labels)}` };
  }
  // the pet die (its own stand left of the board): face 1 is a paw print and always blank; the rest show their symbols like a talent die
  const pet = hero.pet; const kind = pet ? D.PETS[pet.type]?.kind || 'atk' : 'atk';
  const sides = pet ? E.sidesOf(hero, 'P') : 4; const theme = `pet-${kind}`; const labels = [];
  for (let v = 1; v <= sides; v++) { const syms = pet ? E.petFace(hero, v) : null; labels.push(v === 1 ? { blank: true, paw: true } : syms ? { sym: 'TALENT', syms, text: 'T', corners: syms } : { blank: true }); }
  out.P = { slot: 'P', role: 'pet', sides, theme, labels, pet: pet?.type || null, key: `${theme}|${sides}|${JSON.stringify(labels)}` };
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

function makeMaterial(atlas, themeName, quality) {
  const T = atlas.textures;
  const theme = themeName.startsWith('pet-') ? 'amethyst' : themeName; // a pet die is made like a talent die (its colours are in the atlas)
  const inn = INNER[theme];
  const m = new THREE.MeshPhysicalMaterial({
    map: T.map, normalMap: T.normalMap, roughnessMap: T.orm, metalnessMap: T.orm, clearcoatMap: T.orm,
    roughness: 1, metalness: 1, normalScale: new THREE.Vector2(1, 1),
    clearcoat: quality === 'low' ? 0.6 : 1, clearcoatRoughness: 0.035, ior: 1.52, specularIntensity: 1,
    envMapIntensity: 0.5,
    emissive: new THREE.Color(1, 1, 1), emissiveMap: T.emissiveMap || null, emissiveIntensity: T.emissiveMap ? 0.9 : 1,
    sheen: 0, sheenColor: new THREE.Color(0xfff0d0), sheenRoughness: 0.5,
  });
  // A restrained satin highlight uses the existing lighting and texture atlas. Keep
  // clearcoat off: a second glossy lobe adds glare over the numbers and symbols.
  if (diceStyle().clean) { m.clearcoat = 0; m.clearcoatRoughness = 0.6; m.specularIntensity = 0.26; m.envMapIntensity = 0.16; if (m.emissiveMap) m.emissiveIntensity = 0.2; }
  const ivoryInlay = atlas.finish === 'ivory-inlay';
  if (ivoryInlay) { m.specularIntensity = 0.48; m.envMapIntensity = 0.28; m.normalScale.setScalar(0.65); }
  m.color.setScalar(({ bone: 0.7, smoke: 0.5, weapon: 0.62, heart: 0.62, amethyst: 0.66 }[theme] ?? 1) * (typeof diceStyle().bodyK === 'object' ? (diceStyle().bodyK[theme] ?? 1) : diceStyle().bodyK));
  if (ivoryInlay) m.color.multiplyScalar(1.15);
  if (!T.emissiveMap) m.emissive = new THREE.Color(0, 0, 0);
  const u = {
    uTime: { value: 0 }, uInner: { value: diceStyle().clean ? 0 : inn.k }, uInnerCol: { value: new THREE.Vector3(...(theme === 'heart' && diceStyle().corners ? [1.0, 0.3, 0.55] : theme === 'amethyst' && diceStyle().corners ? [0.85, 0.9, 1.0] : inn.col)) }, uInnerTint: { value: inn.tint },
    uCamObj: { value: new THREE.Vector3(0, 5, 5) }, uFocusDir: { value: new THREE.Vector3(0, 1, 0) }, uFocusRange: { value: new THREE.Vector2(0.5, 0.8) },
    uSide: { value: 1 }, uSelf: { value: (typeof diceStyle().selfFlat === 'object' ? diceStyle().selfFlat[theme] : diceStyle().selfFlat) ?? ({ weapon: 0.5, bone: 0.2, smoke: 0.3, heart: 0.18, amethyst: 0.3 }[theme] ?? 0.2) * diceStyle().selfK }, uFlash: { value: new THREE.Color(0, 0, 0) }, uRim: { value: new THREE.Color(0, 0, 0) }, uDim: { value: 0 },
  };
  if (ivoryInlay) u.uSelf.value = 0.64;
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

// One face of a die as a flat picture (the heart change buttons show the face you are on and the faces either side).
// It is cut from the same painted texture the 3D die wears, so it matches what is on the board.
const faceShots = new Map();
export function faceImage(spec, label, px = 112) {
  const key = `${spec.key || JSON.stringify(spec.labels)}|${label}|${px}`;
  if (faceShots.has(key)) return faceShots.get(key);
  const poly = makePoly(spec.sides);
  const faces = new Array(poly.faces.length).fill(null);
  spec.labels.forEach((l, i) => { const fi = poly.labelFace[i]; if (fi != null && fi >= 0) faces[fi] = l; });
  const atlas = buildAtlas({ poly, faces, theme: spec.theme, quality: 'high' });
  const fi = poly.labelFace[label - 1]; if (fi == null || fi < 0) return null;
  const [W, Hh] = atlas.size; const [u, v] = atlas.uvOf(fi, 0, 0); const cx = u * W; const cy = (1 - v) * Hh;
  const S = (atlas.uvOf(fi, atlas.Hm, 0)[0] - u) * W * 2 * 0.86; // the face, a little inside its cell edge
  const cv = document.createElement('canvas'); cv.width = px; cv.height = px; const c = cv.getContext('2d');
  c.drawImage(atlas.canvases.A, cx - S / 2, cy - S / 2, S, S, 0, 0, px, px);
  if (atlas.canvases.E) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.drawImage(atlas.canvases.E, cx - S / 2, cy - S / 2, S, S, 0, 0, px, px); }
  const url = cv.toDataURL('image/png'); faceShots.set(key, url);
  return url;
}

const SIDE_DIM_D8 = Number(globalThis.__d8dim ?? 0.8); // 0.94 hides a d8's sides; 0.6 shows their numbers too loudly (dev/d8sides.mjs)
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
      if (spec.sides === 4) { u.uFocusDir.value.copy(dirWorld); u.uFocusRange.value.set(0.55, 0.78); } else { u.uFocusDir.value.set(0, 1, 0); u.uFocusRange.value.set(0.52, 0.82); }
    },
    // Keep the result face dominant, but let the side faces describe the solid.
    // A d8 needs slightly more side light to distinguish it from a triangular d4.
    // During a throw (k01 = 0), every face retains its original full brightness.
    setRest(k01) { const dim = diceStyle().clean ? (spec.sides === 8 ? 0.64 : 0.70) : (spec.sides === 8 ? SIDE_DIM_D8 : 0.94); u.uSide.value = 1 - dim * k01; },
    updateCamera(camera) { mesh.updateMatrixWorld(); u.uCamObj.value.copy(camera.position); mesh.worldToLocal(u.uCamObj.value); },
    dispose() { material.dispose(); },
  };
  return die;
}
