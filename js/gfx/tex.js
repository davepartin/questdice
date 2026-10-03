// Procedural PBR textures. No image files: every surface in the game is generated here from
// noise, so the whole look ships in a few KB and can be tinted per monster / biome / rarity.
//
//   const set = pbr('stone', { seed: 3, tint: 0x8a8070 });   // -> { map, normalMap, ormMap, emissiveMap? }
//   material.map = set.map; material.normalMap = set.normalMap;
//   material.roughnessMap = material.metalnessMap = material.aoMap = set.ormMap;
//
// Maps are tileable. Call set.repeat(u, v) or use texture.repeat directly. Results are cached by
// (kind, seed, size, tint), so asking twice is free.

import * as THREE from 'three';
import { makeNoise, clamp, smooth, lerp } from './noise.js';

const cache = new Map();
const isBrowser = typeof document !== 'undefined';

export const hex = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// Colour ramp: stops = [[t, hex], ...] sorted by t
export function ramp(stops, t) {
  const s = stops.map(([p, c]) => [p, typeof c === 'number' ? hex(c) : c]);
  if (t <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) {
    if (t <= s[i][0]) return mixc(s[i - 1][1], s[i][1], (t - s[i - 1][0]) / (s[i][0] - s[i - 1][0] || 1));
  }
  return s[s.length - 1][1];
}

function mkCanvas(w, h) {
  if (!isBrowser) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function toTex(canvas, { srgb = false, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------------------------
// The generic builder. `fn(u, v, ctx)` is called per pixel with u,v in [0,1) and must return
//   { h, c:[r,g,b] (sRGB 0..1), r (roughness 0..1), m (metal 0..1, default 0), ao (default 1), e:[r,g,b]? }
// ---------------------------------------------------------------------------------------------
export function buildPBR(fn, { size = 256, seed = 1, normalStrength = 2.5 } = {}) {
  const N = makeNoise(seed);
  const ctx = { N, size, seed };
  const H = new Float32Array(size * size);
  const col = new Uint8ClampedArray(size * size * 4);
  const orm = new Uint8ClampedArray(size * size * 4);
  let emis = null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const o = fn(x / size, y / size, ctx);
      H[i] = o.h ?? 0.5;
      const c = o.c || [0.5, 0.5, 0.5];
      col[i * 4] = clamp(c[0]) * 255; col[i * 4 + 1] = clamp(c[1]) * 255; col[i * 4 + 2] = clamp(c[2]) * 255; col[i * 4 + 3] = 255;
      orm[i * 4] = clamp(o.ao ?? 1) * 255; orm[i * 4 + 1] = clamp(o.r ?? 0.8) * 255; orm[i * 4 + 2] = clamp(o.m ?? 0) * 255; orm[i * 4 + 3] = 255;
      if (o.e) {
        if (!emis) emis = new Uint8ClampedArray(size * size * 4);
        emis[i * 4] = clamp(o.e[0]) * 255; emis[i * 4 + 1] = clamp(o.e[1]) * 255; emis[i * 4 + 2] = clamp(o.e[2]) * 255; emis[i * 4 + 3] = 255;
      }
    }
  }
  // Height -> tangent-space normal (Sobel, wraps so it tiles).
  const nrm = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * normalStrength; let ny = dy * normalStrength; const nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l;
      const i = (y * size + x) * 4;
      nrm[i] = (nx * 0.5 + 0.5) * 255; nrm[i + 1] = (ny * 0.5 + 0.5) * 255; nrm[i + 2] = (nz / l * 0.5 + 0.5) * 255; nrm[i + 3] = 255;
    }
  }
  if (!isBrowser) return { raw: { H, col, orm, nrm, size } };
  const mk = (data, opts) => {
    const c = mkCanvas(size, size);
    c.getContext('2d').putImageData(new ImageData(data, size, size), 0, 0);
    return toTex(c, opts);
  };
  const set = {
    map: mk(col, { srgb: true }), normalMap: mk(nrm), ormMap: mk(orm),
    emissiveMap: emis ? mk(emis, { srgb: true }) : null, size,
  };
  set.repeat = (u, v = u) => { for (const k of ['map', 'normalMap', 'ormMap', 'emissiveMap']) if (set[k]) set[k].repeat.set(u, v); return set; };
  return set;
}

// Stretch helper for grain-like textures (wood, fur, brushed metal): sample noise anisotropically.
const stretch = (N, u, v, fx, fy, o = {}) => N.fbm(u * fx, v * fy, { tile: 0, ...o, ...{ tile: 0 } });

// ---------------------------------------------------------------------------------------------
// Presets. Colour arguments are 0xRRGGBB. Every one is tileable.
// ---------------------------------------------------------------------------------------------
const P = {
  // Cut stone blocks with mortar, wear and moss-free grit.
  stone({ tint = 0x8a857a, dark = 0x3a362f, blocks = 4, mortar = 0.06 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const w = N.worley(u * blocks, v * blocks, blocks);
      const edge = w.d2 - w.d1;
      const grit = N.fbm(u * 12, v * 12, { oct: 4, tile: 12 });
      const wear = N.fbm(u * 3 + 5, v * 3, { oct: 3, tile: 3 });
      const crack = smooth(mortar * 1.4, 0, edge);
      const shade = clamp(0.55 + wear * 0.5 + grit * 0.25 + (w.id / 255 - 0.5) * 0.25);
      let c = mixc(lo, hi, shade);
      c = mul(c, 1 - crack * 0.7);
      return { h: clamp(0.62 + grit * 0.12 - crack * 0.5 + wear * 0.08), c, r: clamp(0.78 + grit * 0.15 + crack * 0.2), ao: 1 - crack * 0.6 };
    };
  },
  // Flagstones / cobbles for floors: rounded cells.
  cobble({ tint = 0x6f685c, dark = 0x2a2620, cells = 6 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const w = N.worley(u * cells, v * cells, cells);
      const e = clamp((w.d2 - w.d1) * 2.2);
      const dome = smooth(0, 0.55, e);
      const grit = N.fbm(u * 24, v * 24, { oct: 3, tile: 24 });
      const tone = clamp(0.5 + (w.id / 255 - 0.5) * 0.7 + grit * 0.25);
      let c = mixc(lo, hi, tone);
      c = mul(c, 0.45 + 0.55 * dome);
      return { h: dome * 0.8 + grit * 0.06, c, r: 0.85 - dome * 0.1 + grit * 0.1, ao: 0.35 + 0.65 * dome };
    };
  },
  // Planks with grain. Vertical grain in texture space; rotate the UVs if you need horizontal.
  wood({ tint = 0x8a5a34, dark = 0x3a2412, planks = 4, gap = 0.012 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const pi = Math.floor(u * planks); const pu = u * planks - pi;
      const tone = (N.n2(pi * 3.7 + 1, 0.5, 256, 0) * 0.5 + 0.5);
      const grain = N.fbm(u * 6 + pi * 9, v * 1.5, { oct: 5, lac: 2.1, tile: 0 }) * 0.5 + 0.5;
      const rings = Math.sin((u * planks * 7 + grain * 6 + pi * 2) * 3.14159) * 0.5 + 0.5;
      const knot = Math.max(0, 1 - Math.hypot(pu - 0.5, (v * 4) % 1 - 0.5) * 6) * (tone > 0.78 ? 1 : 0);
      const seam = smooth(gap * planks, 0, Math.min(pu, 1 - pu));
      let c = mixc(lo, hi, clamp(0.35 + tone * 0.3 + grain * 0.35 - knot * 0.3));
      c = mul(c, 1 - rings * 0.18 - seam * 0.8);
      return { h: 0.6 + (grain - 0.5) * 0.15 - seam * 0.6 - knot * 0.1, c, r: 0.6 + grain * 0.25, ao: 1 - seam * 0.8 };
    };
  },
  leather({ tint = 0x5a3a24, dark = 0x1e120a, grain = 14 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const w = N.worley(u * grain, v * grain, grain);
      const pebble = smooth(0, 0.6, w.d2 - w.d1);
      const blot = N.fbm(u * 4, v * 4, { oct: 4, tile: 4 });
      const c = mul(mixc(lo, hi, clamp(0.5 + blot * 0.5 + pebble * 0.2)), 0.7 + pebble * 0.3);
      return { h: pebble * 0.5 + blot * 0.1, c, r: 0.5 + (1 - pebble) * 0.3 + blot * 0.1, ao: 0.7 + pebble * 0.3 };
    };
  },
  cloth({ tint = 0x7a2e2e, dark = 0x2a1010, weave = 48 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const a = Math.sin(u * weave * Math.PI * 2) * 0.5 + 0.5;
      const b = Math.sin(v * weave * Math.PI * 2) * 0.5 + 0.5;
      const over = (Math.floor(u * weave) + Math.floor(v * weave)) % 2 ? a : b;
      const lint = N.fbm(u * 8, v * 8, { oct: 4, tile: 8 });
      const c = mixc(lo, hi, clamp(0.45 + over * 0.3 + lint * 0.35));
      return { h: over * 0.5 + lint * 0.1, c, r: 0.92, ao: 0.65 + over * 0.35 };
    };
  },
  // Brushed / hammered metal. `hammer` adds dished dents. Roughness varies: polished spots.
  metal({ tint = 0xc9ced6, dark = 0x6a7078, hammer = 0, scratch = 1 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const brush = N.fbm(u * 2, v * 70, { oct: 3, tile: 0 });
      const fine = N.n2(u * 140, v * 4, 140, 4);
      let h = 0.5 + brush * 0.04 * scratch + fine * 0.015 * scratch;
      let dent = 0;
      if (hammer) { const w = N.worley(u * 7, v * 7, 7); dent = smooth(0.5, 0, w.d1); h -= dent * 0.35 * hammer; }
      const wear = N.fbm(u * 3, v * 3, { oct: 3, tile: 3 }) * 0.5 + 0.5;
      const c = mixc(lo, hi, clamp(0.55 + brush * 0.35 + wear * 0.15 - dent * 0.2 * hammer));
      return { h, c, r: clamp(0.22 + wear * 0.28 + Math.abs(brush) * 0.25 + dent * 0.1), m: 1, ao: 1 - dent * 0.25 };
    };
  },
  rust({ tint = 0x8a4a22, dark = 0x2a1608 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const a = N.fbm(u * 5, v * 5, { oct: 5, tile: 5 }) * 0.5 + 0.5;
      const pit = N.worley(u * 18, v * 18, 18).d1;
      const c = mixc(lo, hi, clamp(a * 1.1 - smooth(0.25, 0, pit) * 0.3));
      return { h: a * 0.4 + pit * 0.3, c, r: 0.7 + a * 0.25, m: clamp(0.6 - a * 0.5), ao: 0.6 + a * 0.4 };
    };
  },
  bark({ tint = 0x4a3a2c, dark = 0x120c08 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const r = N.ridged(u * 7, v * 1.4, { oct: 5, tile: 0 });
      const warp = N.fbm(u * 3, v * 2, { oct: 2, tile: 3 }) * 0.4;
      const ridge = clamp(N.ridged(u * 8 + warp, v * 1.5 + warp, { oct: 4, tile: 0 }));
      const c = mixc(lo, hi, clamp(0.25 + ridge * 0.75 + r * 0.1));
      return { h: ridge, c: mul(c, 0.55 + ridge * 0.45), r: 0.92, ao: 0.4 + ridge * 0.6 };
    };
  },
  // Scorched earth with ember cracks (emissive).
  ash({ tint = 0x3a342e, dark = 0x0c0a09, ember = 0xff6a1a, cracks = 0.55 } = {}) {
    const lo = hex(dark); const hi = hex(tint); const em = hex(ember);
    return (u, v, { N }) => {
      const a = N.fbm(u * 5, v * 5, { oct: 5, tile: 5 }) * 0.5 + 0.5;
      const peb = N.worley(u * 22, v * 22, 22);
      const w = N.worley(u * 4 + a * 0.3, v * 4, 4);
      const crack = smooth(0.085, 0.0, w.d2 - w.d1) * smooth(0.35, 0.65, N.fbm(u * 6, v * 6, { oct: 3, tile: 6 }) * 0.5 + 0.5) * cracks;
      const stone = smooth(0.0, 0.5, peb.d2 - peb.d1);
      const c = mul(mixc(lo, hi, clamp(a * 0.9 + stone * 0.2)), 0.7 + stone * 0.4);
      return { h: a * 0.45 + stone * 0.35 - crack * 0.5, c: mixc(c, [0.05, 0.02, 0.01], crack), r: 0.95, ao: 0.5 + stone * 0.4 - crack * 0.4, e: mul(em, crack * (0.7 + a * 0.6)) };
    };
  },
  dirt({ tint = 0x6a5238, dark = 0x20160c } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const a = N.fbm(u * 4, v * 4, { oct: 6, tile: 4 }) * 0.5 + 0.5;
      const peb = N.worley(u * 30, v * 30, 30);
      const stone = smooth(0.0, 0.45, peb.d2 - peb.d1) * (peb.id > 190 ? 1 : 0.15);
      const c = mixc(lo, hi, clamp(a * 0.85 + stone * 0.25));
      return { h: a * 0.5 + stone * 0.5, c, r: 0.96, ao: 0.6 + a * 0.4 };
    };
  },
  grass({ tint = 0x4b6a2c, dark = 0x121c08, dry = 0.35, dryTint = 0x8a7a3a } = {}) {
    const lo = hex(dark); const hi = hex(tint); const dr = hex(dryTint);
    return (u, v, { N }) => {
      const blades = N.fbm(u * 60, v * 60, { oct: 3, tile: 60 }) * 0.5 + 0.5;
      const patch = N.fbm(u * 3, v * 3, { oct: 4, tile: 3 }) * 0.5 + 0.5;
      const base = mixc(lo, hi, clamp(0.3 + blades * 0.7));
      const c = mixc(base, mul(dr, 0.5 + blades * 0.5), smooth(1 - dry, 1, patch));
      return { h: blades * 0.5, c, r: 0.92, ao: 0.5 + blades * 0.5 };
    };
  },
  bone({ tint = 0xd9cfb8, dark = 0x8a7c5e } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const a = N.fbm(u * 6, v * 6, { oct: 4, tile: 6 }) * 0.5 + 0.5;
      const pore = N.worley(u * 40, v * 40, 40).d1;
      const stain = N.fbm(u * 2 + 3, v * 2, { oct: 3, tile: 2 }) * 0.5 + 0.5;
      const c = mixc(lo, hi, clamp(0.55 + a * 0.35 - smooth(0.2, 0.0, pore) * 0.25 - stain * 0.25));
      return { h: 0.6 + a * 0.1 - smooth(0.2, 0, pore) * 0.2, c, r: 0.55 + a * 0.2, ao: 0.8 + a * 0.2 };
    };
  },
  // Creature skin: pores, mottling, optional veins. `warts` adds raised bumps.
  skin({ tint = 0x6f8f3a, dark = 0x2c3a14, warts = 0, vein = 0x2f4a22 } = {}) {
    const lo = hex(dark); const hi = hex(tint); const vn = hex(vein);
    return (u, v, { N }) => {
      const pore = N.worley(u * 36, v * 36, 36);
      const blot = N.fbm(u * 5, v * 5, { oct: 4, tile: 5 }) * 0.5 + 0.5;
      const vv = smooth(0.1, 0.0, Math.abs(N.fbm(u * 5 + 2, v * 5 + 7, { oct: 3, tile: 5 })));
      let h = 0.55 + blot * 0.1 - smooth(0.18, 0, pore.d1) * 0.3;
      let wart = 0;
      if (warts) { const w = N.worley(u * 7, v * 7, 7); wart = smooth(0.28, 0.05, w.d1) * (w.id > 150 ? 1 : 0); h += wart * 0.5 * warts; }
      let c = mixc(lo, hi, clamp(0.35 + blot * 0.55 + wart * 0.1));
      c = mixc(c, vn, vv * 0.35);
      return { h, c: mul(c, 1 - smooth(0.2, 0, pore.d1) * 0.15), r: 0.55 + blot * 0.2 - wart * 0.1, ao: 0.8 + blot * 0.2 };
    };
  },
  fur({ tint = 0x6a5f55, dark = 0x1e1a17, light = 0xb0a595, streak = 90 } = {}) {
    const lo = hex(dark); const hi = hex(tint); const li = hex(light);
    return (u, v, { N }) => {
      const s = N.fbm(u * streak, v * 6, { oct: 3, tile: 0 }) * 0.5 + 0.5;
      const s2 = N.n2(u * streak * 2.1, v * 11, streak * 2, 11) * 0.5 + 0.5;
      const patch = N.fbm(u * 3, v * 3, { oct: 4, tile: 3 }) * 0.5 + 0.5;
      let c = mixc(lo, hi, clamp(0.25 + s * 0.45 + patch * 0.4));
      c = mixc(c, li, smooth(0.62, 0.95, s2 * 0.6 + patch * 0.5) * 0.7);
      return { h: s * 0.6 + s2 * 0.4, c, r: 0.8 + s * 0.15, ao: 0.4 + s * 0.6 };
    };
  },
  scales({ tint = 0x4a6a4a, dark = 0x101c10, count = 12 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const w = N.worley(u * count, v * count, count);
      const e = smooth(0, 0.5, w.d2 - w.d1);
      const c = mul(mixc(lo, hi, clamp(0.4 + (w.id / 255) * 0.5 + e * 0.2)), 0.5 + e * 0.5);
      return { h: e, c, r: 0.4 + (1 - e) * 0.4, ao: 0.3 + e * 0.7 };
    };
  },
  // Aged map paper: fibres, stains, folds.
  parchment({ tint = 0xd8c49a, dark = 0x7a5e34 } = {}) {
    const lo = hex(dark); const hi = hex(tint);
    return (u, v, { N }) => {
      const fib = N.fbm(u * 40, v * 40, { oct: 3, tile: 40 }) * 0.5 + 0.5;
      const stain = N.fbm(u * 3, v * 3, { oct: 5, tile: 3 }) * 0.5 + 0.5;
      const edge = Math.pow(Math.abs(u - 0.5) * 2, 6) + Math.pow(Math.abs(v - 0.5) * 2, 6);
      const c = mixc(hi, lo, clamp((1 - stain) * 0.45 + fib * 0.1 + edge * 0.5));
      return { h: fib * 0.25 + stain * 0.1, c, r: 0.88, ao: 1 };
    };
  },
  // Dark carved stone with a faint glow in the grooves: the dice tray / runic plates.
  rune({ tint = 0x2a2d3a, dark = 0x0a0b10, glow = 0x6a8cff, tiles = 3 } = {}) {
    const lo = hex(dark); const hi = hex(tint); const gl = hex(glow);
    return (u, v, { N }) => {
      const w = N.worley(u * tiles, v * tiles, tiles);
      const edge = smooth(0.07, 0.0, w.d2 - w.d1);
      const grit = N.fbm(u * 16, v * 16, { oct: 4, tile: 16 });
      const line = smooth(0.012, 0.0, Math.abs(((u * tiles * 6) % 1) - 0.5) - 0.48);
      const c = mixc(lo, hi, clamp(0.5 + grit * 0.5));
      return { h: 0.6 + grit * 0.1 - edge * 0.4, c: mul(c, 1 - edge * 0.6), r: 0.55 + grit * 0.2, ao: 1 - edge * 0.5, e: mul(gl, edge * 0.12 + line * 0.05) };
    };
  },
  // [monsters-b] Thick monster hide: mottled colour, deep creases, pores, sparse warts, faint scars.
  hideB({ tint = 0x9a8c62, dark = 0x3c2f1c, mottle = 0x6c6a46, warts = 0.7, crease = 1, pores = 1 } = {}) {
    const lo = hex(dark); const hi = hex(tint); const mo = hex(mottle);
    return (u, v, { N }) => {
      const big = N.fbm(u * 3, v * 3, { oct: 4, tile: 3 }) * 0.5 + 0.5;
      const blot = N.fbm(u * 7 + 2, v * 7, { oct: 4, tile: 7 }) * 0.5 + 0.5;
      const wp = N.fbm(u * 4 + 5, v * 4, { oct: 2, tile: 4 }) * 0.12;
      const rid = 1 - Math.abs(N.fbm((u + wp) * 6, (v + wp) * 6, { oct: 3, tile: 6 })) * 2;
      const cr = smooth(0.62, 0.95, rid) * crease;
      const fine = 1 - Math.abs(N.fbm(u * 22, v * 22, { oct: 2, tile: 22 })) * 2;
      const fcr = smooth(0.75, 0.97, fine) * 0.5 * crease;
      const pr = N.worley(u * 44, v * 44, 44); const pit = smooth(0.17, 0.02, pr.d1) * pores;
      const ww = N.worley(u * 5, v * 5, 5); const wart = smooth(0.24, 0.05, ww.d1) * (ww.id > 165 ? 1 : 0) * warts;
      let c = mixc(lo, hi, clamp(0.28 + big * 0.55 + blot * 0.25));
      c = mixc(c, mo, smooth(0.5, 0.85, blot) * 0.4);
      c = mul(c, 1 - cr * 0.55 - fcr * 0.3 - pit * 0.22);
      c = mixc(c, [c[0] * 1.2 + 0.05, c[1] * 1.05, c[2] * 0.95], wart * 0.6);
      c = mixc(c, mul(hex(0x6a2a1a), 1), wart * smooth(0.12, 0.0, ww.d1) * 0.35);
      return { h: 0.55 + blot * 0.08 - cr * 0.3 - fcr * 0.12 - pit * 0.1 + wart * 0.55, c, r: 0.62 + blot * 0.2 - wart * 0.15 + cr * 0.15, ao: 1 - cr * 0.5 - pit * 0.2 };
    };
  },
  // [monsters-b] Moth-eaten crimson brocade: dark velvet, a faint gold diamond lattice, stains.
  brocadeB({ tint = 0x9a1f26, dark = 0x2a0508, gold = 0xd6a53c } = {}) {
    const lo = hex(dark); const hi = hex(tint); const go = hex(gold);
    return (u, v, { N }) => {
      const pile = N.fbm(u * 60, v * 60, { oct: 2, tile: 60 }) * 0.5 + 0.5;
      const stain = N.fbm(u * 3, v * 3, { oct: 5, tile: 3 }) * 0.5 + 0.5;
      const dx = Math.abs(((u * 6) % 1) - 0.5) + Math.abs(((v * 6) % 1) - 0.5); // diamond lattice
      const line = smooth(0.06, 0.0, Math.abs(dx - 0.42)) * 0.6;
      const dot = smooth(0.09, 0.02, Math.hypot(((u * 6) % 1) - 0.5, ((v * 6) % 1) - 0.5));
      const wv = Math.sin(u * 150) * Math.sin(v * 150) * 0.5 + 0.5;
      let c = mixc(lo, hi, clamp(0.35 + pile * 0.3 + stain * 0.4 - 0.1));
      c = mul(c, 0.82 + wv * 0.18);
      c = mixc(c, mul(go, 0.75), clamp(line + dot * 0.5) * 0.55);
      c = mul(c, 0.65 + 0.35 * smooth(0.15, 0.7, stain));
      return { h: 0.5 + wv * 0.12 + (line + dot) * 0.12, c, r: 0.85 - (line + dot) * 0.3, m: (line + dot) * 0.3, ao: 0.7 + pile * 0.3 };
    };
  },
};

const DEFAULT_SIZE = { default: 256 };

export function pbr(kind, opts = {}) {
  const { seed = 1, size = DEFAULT_SIZE.default, normal = 2.5, ...rest } = opts;
  const key = `${kind}|${seed}|${size}|${normal}|${JSON.stringify(rest)}`;
  if (cache.has(key)) return cache.get(key);
  if (!P[kind]) throw new Error(`unknown texture kind ${kind}`);
  const set = buildPBR(P[kind](rest), { size, seed, normalStrength: normal });
  cache.set(key, set);
  return set;
}
export const textureKinds = () => Object.keys(P);

// ---------------------------------------------------------------------------------------------
// One-off sprite textures (non-tiling, with alpha), for particles, glows and decals.
// ---------------------------------------------------------------------------------------------
function drawTex(size, draw, opts) {
  if (!isBrowser) return null;
  const c = mkCanvas(size, size); const g = c.getContext('2d'); draw(g, size);
  return toTex(c, { srgb: true, repeat: false, ...opts });
}
const sprites = new Map();
export function sprite(name, size = 128) {
  if (sprites.has(name)) return sprites.get(name);
  let t;
  switch (name) {
    case 'glow': t = drawTex(size, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)');
      r.addColorStop(0.5, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }); break;
    case 'dot': t = drawTex(size, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.55, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }); break;
    case 'smoke': t = drawTex(256, (g, s) => {
      const N = makeNoise(11); const img = g.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const dx = (x / s - 0.5) * 2; const dy = (y / s - 0.5) * 2; const d = Math.hypot(dx, dy);
        const n = N.fbm(x / 40, y / 40, { oct: 5 }) * 0.5 + 0.5;
        const a = clamp((1 - d) * 1.4) * clamp(n * 1.4 - 0.1);
        const i = (y * s + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * a * 255;
      }
      g.putImageData(img, 0, 0);
    }); break;
    case 'spark': t = drawTex(size, (g, s) => {
      const gr = g.createLinearGradient(0, s / 2, s, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(s / 2, s / 2, s / 2, s * 0.07, 0, 0, Math.PI * 2); g.fill();
    }); break;
    case 'ring': t = drawTex(size, (g, s) => {
      g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = s * 0.06; g.shadowColor = 'white'; g.shadowBlur = s * 0.08;
      g.beginPath(); g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2); g.stroke();
    }); break;
    case 'star': t = drawTex(size, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const [w, h] of [[1, 0.035], [0.035, 1]]) { g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.5 * w, s * 0.5 * h, 0, 0, Math.PI * 2); g.fill(); }
    }); break;
    case 'slash': t = drawTex(256, (g, s) => {
      // crescent streak
      const gr = g.createLinearGradient(0, 0, s, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath();
      g.moveTo(0, s * 0.62); g.quadraticCurveTo(s * 0.5, s * 0.1, s, s * 0.62); g.quadraticCurveTo(s * 0.5, s * 0.34, 0, s * 0.62); g.fill();
    }); break;
    case 'vignette': t = drawTex(256, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s * 0.72);
      r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }); break;
    default: throw new Error(`unknown sprite ${name}`);
  }
  sprites.set(name, t);
  return t;
}

// A generic tileable noise texture for shaders (fog, heat, dissolve): R = fbm 0..1.
let noiseTex = null;
export function noiseTexture(size = 256) {
  if (noiseTex) return noiseTex;
  const set = buildPBR((u, v, { N }) => {
    const n = N.fbm(u * 6, v * 6, { oct: 5, tile: 6 }) * 0.5 + 0.5;
    const m = N.fbm(u * 6 + 9, v * 6 + 4, { oct: 5, tile: 6 }) * 0.5 + 0.5;
    return { h: n, c: [n, m, N.fbm(u * 12, v * 12, { oct: 3, tile: 12 }) * 0.5 + 0.5], r: 1 };
  }, { size, seed: 99 });
  if (set.map) { set.map.colorSpace = THREE.NoColorSpace; set.map.needsUpdate = true; }
  noiseTex = set.map;
  return noiseTex;
}
