// A small library of ready-made PBR materials built on the procedural textures.
// `mat('stone')` gives a shared material; `mat('stone', { tint: 0x554433, repeat: 3 })` a variant.
// Materials are cached by (name, options), so hundreds of meshes can share a few draw states.

import * as THREE from 'three';
import { pbr } from './tex.js';

const cache = new Map();

// name -> { kind, tex options, material options }
const LIB = {
  stone: { kind: 'stone', tex: {}, m: { envMapIntensity: 0.8 } },
  stoneDark: { kind: 'stone', tex: { tint: 0x55524c, dark: 0x1a1814 }, m: {} },
  cobble: { kind: 'cobble', tex: {}, m: {} },
  wood: { kind: 'wood', tex: {}, m: {} },
  woodDark: { kind: 'wood', tex: { tint: 0x4a2e1a, dark: 0x180e06 }, m: {} },
  leather: { kind: 'leather', tex: {}, m: {} },
  leatherDark: { kind: 'leather', tex: { tint: 0x2c1c12, dark: 0x0c0705 }, m: {} },
  cloth: { kind: 'cloth', tex: {}, m: {} },
  clothRed: { kind: 'cloth', tex: { tint: 0x8a2020, dark: 0x2c0808 }, m: {} },
  clothBlue: { kind: 'cloth', tex: { tint: 0x2a4a8a, dark: 0x081028 }, m: {} },
  clothGreen: { kind: 'cloth', tex: { tint: 0x3a6a3a, dark: 0x0c1c0c }, m: {} },
  clothPurple: { kind: 'cloth', tex: { tint: 0x5a2a7a, dark: 0x1a0828 }, m: {} },
  clothBlack: { kind: 'cloth', tex: { tint: 0x2a2a30, dark: 0x08080a }, m: {} },
  steel: { kind: 'metal', tex: {}, m: { metalness: 1 } },
  steelDark: { kind: 'metal', tex: { tint: 0x7c828c, dark: 0x30343a }, m: { metalness: 1 } },
  iron: { kind: 'metal', tex: { tint: 0x5c6066, dark: 0x1c1e22, hammer: 0.6 }, m: { metalness: 1 } },
  gold: { kind: 'metal', tex: { tint: 0xffd36a, dark: 0xa8761c, hammer: 0.25 }, m: { metalness: 1 } },
  bronze: { kind: 'metal', tex: { tint: 0xd9954a, dark: 0x6a3c14, hammer: 0.3 }, m: { metalness: 1 } },
  silver: { kind: 'metal', tex: { tint: 0xeef2f8, dark: 0x9aa4b2, hammer: 0.15 }, m: { metalness: 1 } },
  rust: { kind: 'rust', tex: {}, m: { metalness: 0.6 } },
  bark: { kind: 'bark', tex: {}, m: {} },
  ash: { kind: 'ash', tex: {}, m: { emissive: 0xffffff, emissiveIntensity: 1.4 } },
  dirt: { kind: 'dirt', tex: {}, m: {} },
  grass: { kind: 'grass', tex: {}, m: {} },
  bone: { kind: 'bone', tex: {}, m: {} },
  skinGreen: { kind: 'skin', tex: { tint: 0x6f8f3a, dark: 0x2c3a14, warts: 0.6 }, m: {} },
  skinOgre: { kind: 'skin', tex: { tint: 0x9a8a5a, dark: 0x3a2e1a, warts: 1 }, m: {} },
  skinHuman: { kind: 'skin', tex: { tint: 0xd9a77e, dark: 0x8a5a3a, vein: 0xb06a50 }, m: {} },
  skinPale: { kind: 'skin', tex: { tint: 0xc8b8b0, dark: 0x6a5a58, vein: 0x7a6a8a }, m: {} },
  fur: { kind: 'fur', tex: {}, m: {} },
  furDark: { kind: 'fur', tex: { tint: 0x3a322c, dark: 0x0e0c0a, light: 0x8a7e70 }, m: {} },
  scales: { kind: 'scales', tex: {}, m: {} },
  parchment: { kind: 'parchment', tex: {}, m: {} },
  rune: { kind: 'rune', tex: {}, m: { emissive: 0xffffff, emissiveIntensity: 1.0 } },
  // [monsters-b]
  ogreHideB: { kind: 'hideB', tex: { normal: 1.2, crease: 0.3, tint: 0x857f58, dark: 0x2e2a1a, mottle: 0x5e6a44 }, m: {} },
  kingHideB: { kind: 'hideB', tex: { tint: 0x86a64a, dark: 0x1f3010, mottle: 0x5a7a2a, warts: 0.9, crease: 0.3, normal: 1.2 }, m: {} },
  brocadeB: { kind: 'brocadeB', tex: {}, m: {} },
  // [monsters-a] additions
  skinGoblin: { kind: 'goblinSkin', tex: {}, m: {} },
  pelt: { kind: 'pelt', tex: {}, m: {} },
  cinderCloth: { kind: 'cinderCloth', tex: {}, m: { emissive: 0xffffff, emissiveIntensity: 1.6 } },
  porcelain: { kind: 'porcelain', tex: {}, m: { emissive: 0xffffff, emissiveIntensity: 1.8 } },
};

/**
 * @param {string} name   key of the library above
 * @param {object} o      { tint, dark, seed, size, repeat | repeat:[u,v], color (multiplier), roughness,
 *                          metalness, emissive, emissiveIntensity, envMapIntensity, side, physical, normalScale,
 *                          ...any MeshStandardMaterial parameter }
 */
export function mat(name, o = {}) {
  const key = `${name}|${JSON.stringify(o)}`;
  if (cache.has(key)) return cache.get(key);
  const def = LIB[name];
  if (!def) throw new Error(`unknown material ${name}`);
  const { tint, dark, seed = 1, size, repeat = 1, physical = false, normalScale = 1, roughness, metalness, color = 0xffffff, ...rest } = o;
  const texOpts = { ...def.tex, seed };
  if (tint !== undefined) texOpts.tint = tint;
  if (dark !== undefined) texOpts.dark = dark;
  if (size) texOpts.size = size;
  // clone the texture objects so repeat can differ per material without mutating the cache
  const set = pbr(def.kind, texOpts);
  const rep = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const cl = (t) => { if (!t) return null; const c = t.clone(); c.repeat.set(rep[0], rep[1]); c.needsUpdate = true; return c; };
  const params = {
    map: cl(set.map), normalMap: cl(set.normalMap), roughnessMap: cl(set.ormMap), metalnessMap: cl(set.ormMap), aoMap: null,
    color, roughness: roughness ?? 1, metalness: metalness ?? 1, // multipliers: the ORM map carries the real values
    ...def.m, ...rest,
  };
  if (metalness !== undefined) params.metalness = metalness; else params.metalness = 1;
  if (set.emissiveMap) { params.emissiveMap = cl(set.emissiveMap); params.emissive = rest.emissive ?? 0xffffff; params.emissiveIntensity = rest.emissiveIntensity ?? def.m.emissiveIntensity ?? 1; }
  else { delete params.emissive; delete params.emissiveIntensity; }
  params.normalScale = new THREE.Vector2(normalScale, normalScale);
  const M = physical ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params);
  M.name = name;
  cache.set(key, M);
  return M;
}

// Plain colour materials, cached.
const plain = new Map();
export function solid(color, { rough = 0.6, metal = 0, emissive = 0x000000, ei = 0, ...rest } = {}) {
  const key = `${color}|${rough}|${metal}|${emissive}|${ei}|${JSON.stringify(rest)}`;
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei, ...rest }));
  return plain.get(key);
}
// Self-lit glow material (fire, runes, eyes). Tone-mapped but unlit, so bloom picks it up.
export function glow(color, intensity = 2, { opacity = 1, additive = false, ...rest } = {}) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1 || additive, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive, toneMapped: true, ...rest });
}
// Gemstone / resin / glass: physical material with transmission-free fake depth.
export function gem(color, { rough = 0.12, ior = 1.5, clearcoat = 1, emissive = 0x000000, ei = 0, ...rest } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, ior, clearcoat, clearcoatRoughness: 0.05, emissive, emissiveIntensity: ei, ...rest });
}

export const RARITY_COLORS = [0xcd7f32, 0xc3cde0, 0xffd23d, 0x8fe8ff];
