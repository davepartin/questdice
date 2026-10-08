// Weapon models. createWeapon(id, rarity, { quality, style, accent }) -> THREE.Group
//   * grip at the group origin, blade/shaft along +Y, cutting edge / outward face toward +Z
//   * rarity 0..3 is shown in the materials and ornament: bronze (plain, warm), silver (engraved fuller),
//     gold (gold trim, gems, faint glow), diamond (cyan crystal, emissive, animated shimmer)
//   * group.userData: { id, family, hands, mount, length, tip (Object3D), sockets:{grip2}, update(dt,t), ... }
//     mount: 'grip' (in the fist) | 'forearm' (bracer).  update(dt,t) only exists when something animates.
import * as THREE from 'three';
import { mat } from './mats.js';
import { sprite } from './tex.js';
import { WEAPONS } from '../data.js';
import { mulberry32 } from './noise.js';
import {
  loft, ringPts, merge, tint, shade, X, cylBetween, sph, crystal, gemCut, helix, torus, plate, rivets, canvasTex, mirrorGeo, prep, TAU, D, lerp, clamp, sstep,
} from './actors/herokit.js';
import { lathe, tube, worldUV, mergeGeometries } from './util.js';

const QUAL = { high: 1, med: 0.75, low: 0.55 };
const RNAMES = ['bronze', 'silver', 'gold', 'diamond'];

// ----------------------------------------------------------------------------------------------- palettes
const PAL = [
  { blade: 0xe0a05a, bladeDark: 0x8a5a28, trim: 0xb9763a, trimDark: 0x6e4220, leather: 0x6a4428, wood: 0x8a6038, cloth: 0x8a3a2a, gem: 0xc0502a, glow: 0xff8a3a, accent: 0xff9a50 },
  { blade: 0xf1f5fb, bladeDark: 0xaab4c6, trim: 0xd6deea, trimDark: 0x7a8498, leather: 0x2c3040, wood: 0x6a5238, cloth: 0x39507a, gem: 0x6aa0ff, glow: 0xb8d4ff, accent: 0xaac8ff },
  { blade: 0xf4f0e6, bladeDark: 0xbab4a4, trim: 0xffd25a, trimDark: 0xb07a1c, leather: 0x4a1c1c, wood: 0x6a4a2c, cloth: 0x8a1c2a, gem: 0xe02a3a, glow: 0xffd25a, accent: 0xffd25a },
  { blade: 0xa8f2ff, bladeDark: 0x2a8aa8, trim: 0xe4fbff, trimDark: 0x5a9ab0, leather: 0x14283a, wood: 0x2a3a4a, cloth: 0x1a4a6a, gem: 0x6af0ff, glow: 0x7af0ff, accent: 0x8fe8ff },
];

// ----------------------------------------------------------------------------------------------- textures
function runeTexture(r, kind = 'blade') {
  const dia = r === 3;
  return canvasTex(`wep-rune|${kind}|${r}`, 128, 512, (g, w, h) => {
    const rng = mulberry32(7 + r * 13);
    g.fillStyle = dia ? '#000' : '#ffffff'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (!dia) {
      // fuller groove: darker core with soft edges, then rune glyphs and edge hatch
      const gr = g.createLinearGradient(w * 0.34, 0, w * 0.66, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, `rgba(20,24,34,${r === 0 ? 0.18 : 0.5})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(w * 0.34, h * 0.05, w * 0.32, h * 0.7);
    }
    if (r >= 1) {
      g.strokeStyle = dia ? '#7af0ff' : 'rgba(30,36,50,0.85)'; g.lineWidth = 2.2;
      for (let i = 0; i < 9; i++) { // glyphs along the fuller
        const cy = h * (0.12 + i * 0.065); const cx = w * 0.5;
        g.beginPath();
        const k = 1 + Math.floor(rng() * 4);
        g.moveTo(cx, cy - 12); g.lineTo(cx, cy + 12);
        if (k & 1) { g.moveTo(cx - 8, cy - 4 - rng() * 6); g.lineTo(cx, cy + 2); g.lineTo(cx + 8, cy - 5 - rng() * 5); }
        if (k & 2) { g.moveTo(cx - 8, cy + 9); g.lineTo(cx + 8, cy + 4); }
        if (k === 3) { g.moveTo(cx + 8, cy - 9); g.lineTo(cx - 6, cy - 12); }
        g.stroke();
      }
      g.lineWidth = 1.2; g.strokeStyle = dia ? 'rgba(122,240,255,0.7)' : 'rgba(40,46,60,0.55)';
      g.beginPath(); g.moveTo(w * 0.28, h * 0.05); g.lineTo(w * 0.28, h * 0.8); g.moveTo(w * 0.72, h * 0.05); g.lineTo(w * 0.72, h * 0.8); g.stroke();
    }
    if (dia) { // crystal glow: veins + vertical gradient
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(60,200,230,0.55)'); gr.addColorStop(0.5, 'rgba(120,235,255,0.25)'); gr.addColorStop(1, 'rgba(200,255,255,0.7)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(190,250,255,0.8)'; g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { g.beginPath(); const x0 = rng() * w; g.moveTo(x0, rng() * h); g.lineTo(x0 + (rng() - 0.5) * 60, rng() * h); g.stroke(); }
      g.strokeStyle = '#baf8ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.5, h * 0.04); g.lineTo(w * 0.5, h * 0.8); g.stroke();
    }
  }, { srgb: !dia, aniso: 4 });
}
function glyphTexture(r) {
  return canvasTex(`wep-glyph|${r}`, 128, 512, (g, w, h) => {
    const rng = mulberry32(7 + r * 13); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 2.6;
    for (let i = 0; i < 9; i++) { const cy = h * (0.12 + i * 0.065); const cx = w * 0.5; g.beginPath(); const k = 1 + Math.floor(rng() * 4);
      g.moveTo(cx, cy - 12); g.lineTo(cx, cy + 12); if (k & 1) { g.moveTo(cx - 8, cy - 4); g.lineTo(cx, cy + 2); g.lineTo(cx + 8, cy - 6); } if (k & 2) { g.moveTo(cx - 8, cy + 9); g.lineTo(cx + 8, cy + 4); } g.stroke(); }
  }, { srgb: true, aniso: 4 });
}
// engraved leather / trim stripes, used on shields and quivers elsewhere
export function emblemTexture(kind, { a = '#8a1c24', b = '#f0d070', c = '#1a1a1a' } = {}) {
  return canvasTex(`emblem|${kind}|${a}|${b}|${c}`, 512, 512, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    const grd = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.75);
    grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(1, 'rgba(0,0,0,0.38)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2);
    g.fillStyle = b; g.strokeStyle = b; g.lineJoin = 'round'; g.lineCap = 'round';
    if (kind === 'crown') { // sword + crown
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
      g.beginPath(); g.moveTo(-110, 20); g.lineTo(-120, -60); g.lineTo(-62, -14); g.lineTo(-30, -92); g.lineTo(0, -20); g.lineTo(30, -92); g.lineTo(62, -14); g.lineTo(120, -60); g.lineTo(110, 20); g.closePath(); g.fill();
      g.fillRect(-112, 24, 224, 26);
      g.fillStyle = c; for (const x of [-70, 0, 70]) { g.beginPath(); g.arc(x, 37, 7, 0, TAU); g.fill(); }
      g.fillStyle = b; for (const [x, y] of [[-120, -66], [-30, -98], [30, -98], [120, -66]]) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
      g.fillStyle = b; g.beginPath(); g.moveTo(-9, 56); g.lineTo(9, 56); g.lineTo(9, 200); g.lineTo(0, 224); g.lineTo(-9, 200); g.closePath(); g.fill();
      g.fillRect(-52, 78, 104, 14); g.beginPath(); g.arc(0, 66, 14, 0, TAU); g.fill();
    } else if (kind === 'lion') {
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.lineWidth = 16;
      g.beginPath(); g.ellipse(0, -40, 62, 58, 0, 0, TAU); g.fill(); // mane
      g.fillStyle = a; g.beginPath(); g.ellipse(0, -34, 40, 44, 0, 0, TAU); g.fill();
      g.fillStyle = b; g.beginPath(); g.ellipse(0, -28, 26, 30, 0, 0, TAU); g.fill();
      g.fillStyle = c; for (const x of [-12, 12]) { g.beginPath(); g.arc(x, -38, 5, 0, TAU); g.fill(); }
      g.beginPath(); g.moveTo(-8, -20); g.lineTo(8, -20); g.lineTo(0, -8); g.fill();
      g.fillStyle = b; g.beginPath(); g.moveTo(-60, 20); g.quadraticCurveTo(0, 140, 60, 20); g.quadraticCurveTo(0, 60, -60, 20); g.fill();
    } else if (kind === 'rune') {
      g.lineWidth = 10; g.shadowColor = b; g.shadowBlur = 14;
      for (const r of [190, 150]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      g.lineWidth = 12;
      g.beginPath(); g.moveTo(0, -105); g.lineTo(0, 105); g.moveTo(-60, -60); g.lineTo(0, -105); g.lineTo(60, -60); g.moveTo(-70, 40); g.lineTo(0, 0); g.lineTo(70, 40); g.stroke();
      g.lineWidth = 6; for (let i = 0; i < 12; i++) { const a2 = (i / 12) * TAU; g.beginPath(); g.moveTo(Math.cos(a2) * 156, Math.sin(a2) * 156); g.lineTo(Math.cos(a2) * 184, Math.sin(a2) * 184); g.stroke(); }
    } else if (kind === 'hammer') { // dwarven anvil + hammer
      g.lineWidth = 14; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
      g.beginPath(); g.moveTo(-100, -20); g.lineTo(100, -20); g.lineTo(60, 10); g.lineTo(40, 50); g.lineTo(70, 90); g.lineTo(-70, 90); g.lineTo(-40, 50); g.lineTo(-60, 10); g.closePath(); g.fill();
      g.save(); g.rotate(-0.6); g.fillRect(-8, -130, 16, 120); g.fillRect(-36, -150, 72, 36); g.restore();
    }
    g.restore();
  }, { aniso: 8 });
}

// ----------------------------------------------------------------------------------------------- materials
const matCache = new Map();
const r0g = (name) => (name === 'blade1' ? 0.35 : 0.55);
function metal(color, { rough = 0.3, metalness = 0.9, glyph = null, name = 'm', map = null, bump = null, bumpScale = 1.5, env = 1.2, emissive = 0x000000, ei = 0 } = {}) {
  if (glyph) { emissive = PAL[+name.slice(5)]?.glow ?? 0xffffff; ei = r0g(name); }
  const key = `${name}|${color}|${rough}|${map?.uuid}|${emissive}|${ei}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, metalness: metalness, roughness: rough, vertexColors: true, envMapIntensity: env, map, bumpMap: bump, bumpScale, emissive, emissiveIntensity: ei, emissiveMap: glyph });
  matCache.set(key, m); return m;
}
function surf(kind, o, extra = {}) {
  const key = `s|${kind}|${JSON.stringify(o)}|${JSON.stringify(extra)}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = mat(kind, { vertexColors: true, ...o, ...extra }); matCache.set(key, m); return m;
}
function weaponMats(r) {
  const p = PAL[r]; const dia = r === 3;
  const rune = runeTexture(r);
  const M = {};
  if (!dia) {
    M.blade = metal(0xffffff, { name: `blade${r}`, glyph: r >= 1 ? glyphTexture(r) : null, rough: r === 0 ? 0.46 : r === 1 ? 0.3 : 0.26, map: rune, bump: rune, bumpScale: r === 0 ? 0.4 : 1.5, env: 1.7 });
  } else {
    M.blade = null; // created per instance (animated)
  }
  M.trim = metal(0xffffff, { name: `trim${r}`, rough: r === 2 ? 0.28 : 0.36, env: 1.6 });
  M.dark = metal(0xffffff, { name: 'dark', rough: 0.55, env: 1.0 });
  M.leather = surf('leather', { repeat: 2, roughness: 0.85, metalness: 0 }, { });
  M.leather.metalness = 0;
  M.wood = surf('wood', { repeat: 1.4, roughness: 0.9, metalness: 0 }); M.wood.metalness = 0;
  M.cloth = surf('cloth', { repeat: 3, metalness: 0 }); M.cloth.metalness = 0;
  M.gem = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.08, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, emissive: p.gem, emissiveIntensity: r >= 2 ? 0.55 : 0.12, ior: 1.7, envMapIntensity: 1.8 });
  M.glow = new THREE.MeshStandardMaterial({ color: 0x000000, vertexColors: false, emissive: p.glow, emissiveIntensity: 2.2, roughness: 0.4, metalness: 0 });
  return M;
}
function crystalMaterial(r, accent, glow = 0x1aa4c8) {
  const rune = runeTexture(3);
  const c = new THREE.Color(accent ?? PAL[3].blade);
  const m = new THREE.MeshPhysicalMaterial({
    color: c.clone().multiplyScalar(0.6), vertexColors: true, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04,
    emissive: new THREE.Color(glow), emissiveMap: rune.clone(), emissiveIntensity: 0.6, ior: 2.1, iridescence: 0.7, iridescenceIOR: 1.6, envMapIntensity: 2.2,
    transparent: true, opacity: 0.92, specularIntensity: 1,
  });
  m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapT = THREE.RepeatWrapping;
  return m;
}

// ----------------------------------------------------------------------------------------------- build helpers
class Parts {
  constructor() { this.list = {}; }
  add(role, geo, color = 0xffffff, ao) { if (!geo) return; (this.list[role] ||= []).push(tint(geo, color, ao)); }
  merged(role) { const l = this.list[role]; return l && l.length ? merge(l) : null; }
}
function planar(geo, fnU, fnV) {
  const p = geo.attributes.position; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = fnU(p.getX(i), p.getY(i), p.getZ(i)); uv[i * 2 + 1] = fnV(p.getX(i), p.getY(i), p.getZ(i)); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

// A blade lofted along +Y. Width runs along Z (the edge faces +Z), thickness along X.
function bladeGeo({ y0 = 0, len = 0.7, w0 = 0.028, w1 = 0.022, leaf = 0, t = 0.0055, fuller = null, tip = 0.1, flatness = 1, spine = false, bend = 0 }) {
  const secs = []; const K = 18;
  const bodyLen = len - tip;
  const wAt = (u) => lerp(w0, w1, u) * (1 + leaf * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)));
  const sec = (y, w, tt, d, fw) => {
    const fz = Math.max(0.0001, fw); const dd = d;
    const pts = [
      [0, w], [tt * 0.5, w * 0.82], [tt, w * 0.46], [tt, fz], [tt - dd, fz * 0.72], [tt - dd, -fz * 0.72], [tt, -fz], [tt, -w * 0.46], [tt * 0.5, -w * 0.82], [0, -w],
      [-tt * 0.5, -w * 0.82], [-tt, -w * 0.46], [-tt, -fz], [-(tt - dd), -fz * 0.72], [-(tt - dd), fz * 0.72], [-tt, fz], [-tt, w * 0.46], [-tt * 0.5, w * 0.82],
    ];
    if (!spine) return { y, pts };
    return { y, pts };
  };
  for (let i = 0; i <= K; i++) {
    const u = i / K; const y = y0 + bodyLen * u; const w = wAt(u);
    let d = 0; let fw = w * 0.34;
    if (fuller) d = fuller.d * sstep(fuller.u0, fuller.u0 + 0.08, u) * (1 - sstep(fuller.u1 - 0.12, fuller.u1, u));
    secs.push(sec(y, w, t * (1 - 0.12 * u), d, fw));
  }
  const wEnd = wAt(1);
  for (let j = 1; j <= 6; j++) {
    const v = j / 6; const y = y0 + bodyLen + tip * v;
    const w = wEnd * Math.max(0.0, 1 - v ** 2.2) ** 0.85; const tt = t * 0.88 * (1 - v ** 1.5 * 0.92);
    secs.push(sec(y, Math.max(w, 0.0003), Math.max(tt, 0.0002), 0, Math.max(w * 0.34, 0.0001)));
  }
  if (bend) for (const s of secs) { const u = (s.y - y0) / len; const off = bend * u * u; s.pts = s.pts.map((p) => [p[0] + off, p[1]]); }
  const g = loft(secs, { flat: true, ring: { open: false }, noSeam: false });
  const wMax = Math.max(w0, w1) * (1 + leaf);
  planar(g, (x, y, z) => z / (2 * wMax) + 0.5, (x, y) => (y - y0) / len);
  prep(g);
  if (fuller) shade(g, (x, y, z) => { const u = (y - y0) / len; const w = wAt(Math.min(1, (y - y0) / bodyLen)); return (Math.abs(z) < w * 0.37 && u > fuller.u0 + 0.01 && u < fuller.u1 - 0.01 && Math.abs(x) < t - fuller.d * 0.45) ? 0.38 : 1; });
  // darken the very edge a touch so the bevel reads
  shade(g, (x, y, z) => 1 + 0.35 * sstep(0.75, 1, Math.abs(z) / wMax));
  return g;
}

function gripWrap(y0, y1, r, { wire = 0.0032, color = 0x3a2418, coreColor = 0x1a100a, turns = 16, ring = null, ringColor = 0xb0b8c4, taper = 0.12 } = {}, P) {
  // taper: slight swell in the middle
  const secs = []; const K = 8;
  for (let i = 0; i <= K; i++) { const u = i / K; secs.push({ y: lerp(y0, y1, u), rx: r * (1 + taper * Math.sin(u * Math.PI)), rz: r * 0.94 * (1 + taper * Math.sin(u * Math.PI)) }); }
  P.add('leather', loft(secs, { N: 14, capTop: true, capBottom: true }), coreColor);
  const hg = helix(r * 1.02, y0 + 0.004, y1 - 0.004, turns, wire, { seg: turns * 10, radial: 4, rz: r * 0.96 });
  P.add('leather', hg, color, (x, y) => 0.75 + 0.25 * Math.sin(y * 900));
  if (ring) for (const y of [y0, y1]) P.add('trim', X(torus(r * 1.08, wire * 1.6, 12, 5), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }), ringColor);
}
function lathePart(profile, seg = 16, o = {}) { return lathe(profile, seg, o); }

// pommel: style 0 disc, 1 wheel/faceted ball, 2 ornate, 3 crystal
function pommel(r, y, rr, P, pal, big = 1) {
  const s = 0.017 * big;
  if (r === 0) {
    P.add('trim', lathePart([[0, y - s * 1.05], [s * 0.7, y - s * 0.95], [s * 1.15, y - s * 0.2], [s, y + s * 0.5], [s * 0.45, y + s * 0.9], [0, y + s]], 14), pal.trim, (x, yy) => 0.8 + 0.2 * (yy - y + s) / (2 * s));
    P.add('dark', X(torus(s * 1.0, s * 0.18, 12, 5), { p: [0, y + s * 0.15, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  } else if (r === 1) {
    P.add('trim', lathePart([[0, y - s * 1.2], [s * 0.8, y - s * 1.0], [s * 1.25, y - s * 0.1], [s * 1.2, y + s * 0.4], [s * 0.7, y + s * 0.9], [s * 0.35, y + s * 1.05], [0, y + s * 1.1]], 16), pal.trim);
    P.add('dark', X(torus(s * 1.22, s * 0.12, 16, 5), { p: [0, y + s * 0.15, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
    P.add('gem', X(gemCut(s * 0.45, 8), { p: [0, y - s * 1.25, 0], r: [Math.PI, 0, 0] }), pal.gem);
  } else if (r === 2) {
    P.add('trim', lathePart([[0, y - s * 1.45], [s * 0.7, y - s * 1.1], [s * 1.3, y - s * 0.3], [s * 1.35, y + s * 0.3], [s * 0.9, y + s * 0.85], [s * 0.45, y + s * 1.1], [0, y + s * 1.25]], 14), pal.trim);
    for (let i = 0; i < 6; i++) P.add('trim', X(torus(s * 1.36, s * 0.1, 10, 4), { p: [0, y + s * 0.0, 0], r: [Math.PI / 2, 0, (i / 6) * Math.PI] }), pal.trim);
    P.add('gem', X(gemCut(s * 0.7, 8), { p: [0, y - s * 1.55, 0], r: [Math.PI, 0, 0] }), pal.gem);
    P.add('trim', X(torus(s * 0.62, s * 0.12, 10, 5), { p: [0, y - s * 1.45, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  } else {
    P.add('blade', X(crystal(s * 1.2, 1.5, 6), { p: [0, y - s * 0.4, 0] }), 0xffffff);
    P.add('trim', X(torus(s * 1.25, s * 0.16, 12, 5), { p: [0, y + s * 0.8, 0], r: [Math.PI / 2, 0, 0] }), pal.trim);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; P.add('blade', X(crystal(s * 0.38, 1.7, 5), { p: [Math.cos(a) * s * 1.35, y + s * 0.15, Math.sin(a) * s * 1.35], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }), 0xffffff); }
  }
}

// A curved feather/wing plate lying in the guard plane: spans +-Z (length L), droops in -Y, thickness along X.
function wingPlate(L, wd, droop, thick = 0.0045, sgn = 1, tipUp = 0) {
  const outline = [[0, 0.0], [L * 0.25, wd * 0.5], [L * 0.62, wd * 0.46], [L * 0.94, wd * 0.2], [L, 0.0], [L * 0.93, -wd * 0.24], [L * 0.6, -wd * 0.48], [L * 0.22, -wd * 0.52]];
  const g = plate(outline, thick, thick * 0.35);
  // plate lives in XY (length along x, width along y), extruded along z. Map: x->z*sgn, y->y, z->x
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i);
    const u = x / L; const dy = -droop * u * u + tipUp * u ** 3;
    p.setXYZ(i, z, y + dy, x * sgn);
  }
  g.computeVertexNormals();
  // swapped axes flip winding when sgn is negative; fix by mirroring winding for sgn<0
  if (sgn < 0) { const ix = g.index ? g.index.array : null; if (ix) for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } else { const pos = g.attributes.position; for (let i = 0; i < pos.count; i += 3) { for (const k of ['position', 'normal', 'uv']) { const a2 = g.attributes[k]; if (!a2) continue; const n2 = a2.itemSize; for (let c = 0; c < n2; c++) { const t = a2.array[(i + 1) * n2 + c]; a2.array[(i + 1) * n2 + c] = a2.array[(i + 2) * n2 + c]; a2.array[(i + 2) * n2 + c] = t; } } } } g.computeVertexNormals(); }
  return g;
}
// Cross guard lying along Z (the blade's width axis stays Z so the guard spans front/back like the blade).
function guard(r, y, span, P, pal, { big = 1 } = {}) {
  const hz = span / 2; const th = 0.011 * big; const dp = 0.016 * big;
  const bar = (curveFn, thick, depth, col, role = 'trim', N = 14) => {
    const secs = []; const K = 18;
    for (let i = 0; i <= K; i++) { const u = (i / K) * 2 - 1; const ay = Math.abs(u);
      secs.push({ y: u * hz, rx: thick * (1 - 0.4 * ay ** 2), rz: depth * (1 - 0.55 * ay ** 2), n: 2.6, N }); }
    const g = loft(secs, { N, capTop: true, capBottom: true });
    const q = X(g, { r: [Math.PI / 2, 0, 0] }); const p = q.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = clamp(p.getZ(i) / hz, -1, 1); p.setY(i, p.getY(i) + (curveFn(u).dy || 0)); }
    q.computeVertexNormals();
    P.add(role, X(q, { p: [0, y, 0] }), col);
  };
  const collar = (rad, h, col) => P.add('trim', lathePart([[0.0, y - h], [rad, y - h * 0.8], [rad * 1.1, y], [rad, y + h * 0.8], [0.0, y + h]], 14), col);
  if (r === 0) {
    bar((u) => ({ dy: -0.012 * u * u }), th * 0.9, dp * 0.85, pal.trim);
    for (const s of [-1, 1]) P.add('trim', X(sph(0.0115 * big, [0, 0, 0], [0.9, 0.9, 1.1]), { p: [0, y - 0.0125, s * hz * 1.01] }), pal.trim);
    collar(0.02 * big, 0.013, pal.trimDark);
  } else if (r === 1) {
    bar((u) => ({ dy: -0.02 * u * u }), th, dp, pal.trim);
    for (const s of [-1, 1]) {
      P.add('trim', X(sph(0.0128 * big, [0, 0, 0], [1, 1, 1], 12, 8), { p: [0, y - 0.0195, s * hz * 1.02] }), pal.trim);
      P.add('dark', X(torus(0.0112 * big, 0.003, 10, 4), { p: [0, y - 0.0095, s * hz * 0.76], r: [0, Math.PI / 2, 0] }), pal.trimDark);
    }
    collar(0.023 * big, 0.018, pal.trim);
    P.add('trim', X(torus(0.022 * big, 0.003, 12, 4), { p: [0, y + 0.017, 0], r: [Math.PI / 2, 0, 0] }), pal.trim);
    P.add('gem', X(gemCut(0.0085 * big, 8), { p: [0.0115 * big, y, 0], r: [0, 0, -Math.PI / 2] }), pal.gem);
    P.add('gem', X(gemCut(0.0085 * big, 8), { p: [-0.0115 * big, y, 0], r: [0, 0, Math.PI / 2] }), pal.gem);
  } else if (r === 2) { // winged guard: three layered feathers per side + gem boss
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const L = hz * (1.12 - k * 0.2); const wd = (0.03 - k * 0.002) * big;
      const wp = wingPlate(L, wd, 0.026 + k * 0.006, 0.0042 + k * 0.0008, s, 0.012);
      P.add('trim', X(wp, { p: [(k - 1) * 0.0011, y + 0.008 - k * 0.004, s * 0.012] }), pal.trim, (x, yy, zz) => 0.78 + 0.1 * k + 0.1 * Math.abs(zz) / hz);
    }
    P.add('trim', lathePart([[0, y - 0.024], [0.027 * big, y - 0.018], [0.031 * big, y], [0.027 * big, y + 0.02], [0, y + 0.027]], 16), pal.trim);
    for (const sx of [-1, 1]) P.add('gem', X(gemCut(0.0165 * big, 8), { p: [sx * 0.0125 * big, y + 0.002, 0.0], r: [0, 0, -sx * Math.PI / 2] }), pal.gem);
    P.add('trim', X(torus(0.0235 * big, 0.0036, 18, 5), { p: [0, y + 0.002, 0], r: [0, Math.PI / 2, 0] }), pal.trim);
    P.add('trim', X(torus(0.0275 * big, 0.0042, 18, 5), { p: [0, y + 0.02, 0], r: [Math.PI / 2, 0, 0] }), pal.trim);
  } else { // crystal guard: angular shards sweeping up and out
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const L = hz * (1.1 - k * 0.2); const wd = (0.026 - k * 0.003) * big;
        const wp = wingPlate(L, wd, -0.004, 0.0048 + k * 0.001, s, 0.03 + k * 0.012);
        P.add('blade', X(wp, { p: [(k - 1) * 0.0011, y + 0.004 + k * 0.006, s * 0.012] }), 0xffffff);
      }
      P.add('trim', X(box3(0.011 * big, 0.011 * big, hz * 0.5), { p: [0, y - 0.002, s * hz * 0.33] }), pal.trim);
    }
    collar(0.028 * big, 0.02, pal.trim);
    P.add('blade', X(crystal(0.013 * big, 1.5, 6), { p: [0.0, y + 0.034, 0.0] }), 0xffffff);
    P.add('gem', X(crystal(0.011 * big, 1.35, 6), { p: [0.0, y + 0.002, 0.0], r: [0, 0, Math.PI / 2] }), 0xffffff);
  }
}
function box3(w, h, d, r = 0) { return merge([new THREE.BoxGeometry(w, h, d)]); }

// ----------------------------------------------------------------------------------------------- the weapons
function buildSword(r, P, pal, { long = false } = {}) {
  const S = long ? 1.0 : 1;
  const L = long ? 1.0 : 0.72;
  const gy0 = long ? -0.2 : -0.068; const gy1 = long ? 0.06 : 0.058; const guardY = gy1 + 0.014; const bladeY0 = guardY + 0.014;
  const w = long ? 0.05 : 0.042; const t = long ? 0.0075 : 0.0068;
  const style = Math.min(3, r);
  // blade
  const fuller = r === 0 ? { d: 0.0026, u0: 0.04, u1: 0.66 } : { d: 0.0036, u0: 0.04, u1: 0.78 };
  const bg = bladeGeo({ y0: bladeY0, len: L, w0: w, w1: w * (r === 0 ? 0.78 : 0.7), leaf: r === 0 ? 0.0 : 0.05, t, fuller, tip: long ? 0.13 : 0.1 });
  P.add('blade', bg, r === 3 ? 0xffffff : (r === 0 ? PAL[0].blade : 0xffffff), (x, y) => 1);
  // ricasso + guard blocks
  P.add('trim', X(merge([new THREE.BoxGeometry(0.012, 0.02, w * 1.9)]), { p: [0, bladeY0 + 0.006, 0] }), pal.trimDark);
  P.add('trim', lathePart([[0, guardY - 0.014], [0.014, guardY - 0.014], [0.013, guardY + 0.0], [0.011, guardY + 0.016], [0, guardY + 0.016]], 12), pal.trimDark);
  guard(r, guardY, long ? 0.3 : 0.24, P, pal, { big: long ? 1.3 : 1.15 });
  // grip
  const gripCol = r === 0 ? 0x4c2e1c : r === 1 ? 0x20242e : r === 2 ? 0x5a1c22 : 0x143a50;
  gripWrap(gy0, gy1, long ? 0.0165 : 0.0155, { color: gripCol, coreColor: 0x120a06, turns: long ? 26 : 14, ring: r >= 1, ringColor: pal.trim }, P);
  if (r >= 2) { for (let i = 0; i < 2; i++) P.add('trim', helix(long ? 0.0175 : 0.0165, gy0 + 0.004, gy1 - 0.004, long ? 13 : 7, 0.0012, { seg: 120, radial: 4, phase: Math.PI }), pal.trim); }
  pommel(r, gy0 - 0.02 * S, r, P, pal, long ? 1.2 : 1);
  if (r === 3) { // glowing inlay along the grip & guard
    P.add('glow', X(new THREE.TorusGeometry(0.0172, 0.0016, 5, 16), { p: [0, gy0 + 0.04, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff);
    P.add('glow', X(new THREE.TorusGeometry(0.0172, 0.0016, 5, 16), { p: [0, gy1 - 0.04, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff);
  }
  return { tipY: bladeY0 + L, length: bladeY0 + L - (gy0 - 0.05), grip2: long ? [0, -0.135, 0] : null, bladeY0, L };
}

function buildDagger(r, P, pal) {
  const gy0 = -0.058; const gy1 = 0.045; const guardY = gy1 + 0.011; const by0 = guardY + 0.01;
  const L = 0.27; const w = 0.033;
  const fuller = r === 0 ? null : { d: 0.0018, u0: 0.05, u1: 0.55 };
  const bg = bladeGeo({ y0: by0, len: L, w0: w * 0.78, w1: w * 0.5, leaf: 0.55, t: 0.0048, fuller, tip: 0.075, bend: r >= 1 ? 0.006 : 0 });
  P.add('blade', bg, r === 0 ? PAL[0].blade : 0xffffff);
  // guard: down-swept
  const hz = 0.052;
  for (const s of [-1, 1]) {
    const pts = [[0, guardY, 0], [0, guardY - 0.001, s * hz * 0.5], [0, guardY - 0.008, s * hz * 0.92], [0, guardY - 0.02, s * hz * 1.05]];
    if (r === 3) P.add('blade', X(crystal(0.0085, 5, 5), { p: [0, guardY - 0.003, s * hz * 0.6], r: [s * (Math.PI / 2 - 0.2), 0, 0] }), 0xffffff);
    else P.add('trim', X(tube(pts, (t) => 0.0085 - 0.0045 * t, { segs: 10, radial: 6 }), { s: [0.65, 1, 1] }), pal.trim);
    if (r !== 3) P.add('trim', X(sph(0.006, [0, guardY - 0.021, s * hz * 1.07], [0.9, 1, 1], 8, 6)), pal.trim);
  }
  P.add('trim', lathePart([[0, guardY - 0.012], [0.012, guardY - 0.01], [0.011, guardY + 0.012], [0, guardY + 0.012]], 10), pal.trimDark);
  gripWrap(gy0, gy1, 0.0125, { color: r === 0 ? 0x5a3a22 : r === 1 ? 0x232838 : r === 2 ? 0x601e26 : 0x15384c, turns: 12, ring: r >= 1, ringColor: pal.trim, wire: 0.0026 }, P);
  pommel(r, gy0 - 0.012, r, P, pal, 0.75);
  if (r >= 2) P.add('gem', X(gemCut(0.0075, 8), { p: [0, guardY + 0.001, 0.0128], r: [Math.PI / 2, 0, 0] }), pal.gem);
  return { tipY: by0 + L, length: by0 + L - gy0 + 0.03, grip2: null };
}

// -- shield ---------------------------------------------------------------------------------------
function heaterOutline(w = 0.25, top = 0.32, bot = -0.38, seg = 20) {
  const pts = [];
  const hw = w;
  pts.push([-hw, top], [-hw * 0.5, top + 0.012], [0, top + 0.016], [hw * 0.5, top + 0.012], [hw, top]);
  // right side curving to the point
  for (let i = 1; i <= seg; i++) { const t = i / seg; const x = hw * Math.cos(t * Math.PI / 2) ** 0.8 * (1 - 0.0 * t); const y = lerp(top, bot, Math.sin(t * Math.PI / 2) ** 1.6 * 0.5 + t * 0.5 * 0.0 + (t ** 1.6) * 0.5 * 1) ; pts.push([x, lerp(top - 0.04, bot, t ** 1.35)]); }
  for (let i = seg - 1; i >= 0; i--) { const t = i / seg; pts.push([-hw * Math.cos(t * Math.PI / 2) ** 0.8, lerp(top - 0.04, bot, t ** 1.35)]); }
  return pts;
}
const dishZ = (x, y) => -(x * x) * 1.5 - (Math.max(0, -y - 0.05) ** 2) * 0.3 - (y > 0.15 ? (y - 0.15) ** 2 * 0.3 : 0);
function buildShield(r, P, pal, o, F) {
  const style = o.style || 'heater';
  const emblem = o.emblem ?? (style === 'round' ? 'rune' : 'crown');
  const faceMat = F;
  if (style === 'heater') {
    const w = 0.25; const top = 0.3; const bot = -0.4;
    // outline (clockwise) for body & rim
    const prof = [];
    const N = 26;
    for (let i = 0; i <= N; i++) { // right half: top corner -> bottom point
      const t = i / N; const y = lerp(top, bot, t); const x = w * (t < 0.35 ? 1 - 0.0 * t : Math.cos((t - 0.35) / 0.65 * Math.PI / 2) ** 0.85);
      prof.push([x, y]);
    }
    const outline = [[-w, top + 0.004], [0, top + 0.03], [w, top + 0.004], ...prof.slice(1).map((p) => [p[0], p[1]]), ...prof.slice(0, -1).reverse().slice(0, -0).map((p) => [-p[0], p[1]])];
    // build the face plate by extrude with dish curvature
    const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8, steps: 1 });
    // heavy tessellation for a curved dish: bend z by x^2 and y
    const gg = g; const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); p.setZ(i, p.getZ(i) + 0.085 + dishZ(x, y)); }
    gg.computeVertexNormals();
    planar(gg, (x) => x / (2 * w) + 0.5, (x, y) => (y - bot) / (top - bot));
    gg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
    P.add('face', gg, 0xffffff);
    // rim: tube around the outline slightly proud
    const rim = outline.map((q) => { const z = 0.085 + 0.024 + dishZ(q[0], q[1]); return [q[0], q[1], z]; });
    P.add('trim', tube([...rim, rim[0]], 0.0105, { segs: 160, radial: 7, closed: false }), pal.trim);
    // boss and rivets
    const bz = 0.085 + 0.032;
    P.add('trim', lathePart([[0, 0.0], [0.05, 0.0], [0.054, 0.01], [0.044, 0.03], [0.024, 0.044], [0, 0.05]], 20), pal.trim, undefined);
    P.list.trim[P.list.trim.length - 1].translate(0, 0, 0);
    // place boss: rotate lathe (axis Y) to Z
    const bossG = P.list.trim.pop(); P.add('trim', X(bossG, { p: [0, 0.02, bz], r: [Math.PI / 2, 0, 0] }), pal.trim);
    const rv = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; rv.push([Math.cos(a) * 0.075, 0.02 + Math.sin(a) * 0.075, bz - 0.005 + 0.0, 0, 0, 1]); }
    const rg = rivets(rv, 0.0075, 8); if (rg) P.add('trim', rg, pal.trim);
    const rv2 = []; for (const q of rim.filter((_, i) => i % 5 === 2 && i < rim.length - 1)) rv2.push([q[0] * 0.93, q[1] * 0.97, q[2] - 0.002, 0, 0, 1]);
    // back: wooden backing, strap and handle
    const back = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 6 });
    const bp = back.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); const y = bp.getY(i); bp.setZ(i, bp.getZ(i) + 0.07 + dishZ(x, y)); }
    back.computeVertexNormals(); P.add('wood', back, 0x6a4a30);
    P.add('leather', X(box3(0.026, 0.12, 0.012), { p: [0, 0.0, 0.06] }), 0x3a2216);
    P.add('trim', cylBetween([0, -0.06, 0.052], [0, 0.06, 0.052], 0.009, 0.009, 8), pal.trimDark);
    P.add('leather', X(box3(0.34, 0.03, 0.01), { p: [0, 0.2, 0.062] }), 0x2e1a10);
    P.add('trim', tube([[0, 0.28, 0.085 + dishZ(0, 0.28) + 0.02], [0, 0.0, 0.085 + 0.034], [0, -0.3, 0.085 + dishZ(0, -0.3) + 0.02], [0, -0.4, 0.085 + dishZ(0, -0.4) + 0.02]], 0.01, { segs: 24, radial: 6 }), pal.trim);
    P.add('trim', X(torus(0.12, 0.007, 36, 6), { p: [0, 0.02, bz + 0.0] }), pal.trimDark);
    // gem / crystal details by rarity
    if (r >= 2) { P.add('gem', X(gemCut(0.022, 8), { p: [0, 0.02, bz + 0.052], r: [Math.PI / 2, 0, 0] }), pal.gem); P.add('trim', X(torus(0.03, 0.005, 14, 6), { p: [0, 0.02, bz + 0.046] }), pal.trim); }
    if (r === 3) P.add('glow', X(torus(0.19, 0.0045, 40, 6), { p: [0, -0.02, 0.095], s: [1, 1.35, 1] }), 0xffffff);
    return { height: 0.74, tipY: 0.34, length: 0.78, grip2: null, faceW: w, faceH: top - bot };
  }
  // round shield (studded)
  const R = 0.34;
  const prof = [[0, 0.05], [0.07, 0.048], [0.14, 0.04], [0.24, 0.024], [0.31, 0.012], [R, 0.0], [R, -0.012], [0.3, -0.018], [0, -0.012]];
  const dish = lathe(prof, 56);
  const dp = dish.attributes.position;
  planar(dish, (x, y, z) => x / (2 * R) + 0.5, (x, y, z) => z / (2 * R) + 0.5);
  dish.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dp.count * 3).fill(1), 3));
  P.add('face', X(dish, { p: [0, 0, 0.0], r: [Math.PI / 2, 0, 0] }), 0xffffff);
  // rim band + studs
  P.add('trim', X(torus(R + 0.002, 0.012, 56, 8), { p: [0, 0, 0.0] }), pal.trim);
  P.add('trim', X(torus(R - 0.012, 0.005, 56, 6), { p: [0, 0, 0.012] }), pal.trimDark);
  const studs = []; const ns = 18; for (let i = 0; i < ns; i++) { const a = (i / ns) * TAU; studs.push([Math.cos(a) * (R - 0.04), Math.sin(a) * (R - 0.04), 0.02, 0, 0, 1]); }
  const sg = rivets(studs, 0.011, 8); if (sg) P.add('trim', sg, pal.trim);
  const st2 = []; for (let i = 0; i < 10; i++) { const a = (i / 10 + 0.05) * TAU; st2.push([Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.037, 0, 0, 1]); }
  const sg2 = rivets(st2, 0.0085, 8); if (sg2) P.add('dark', sg2, pal.trimDark);
  // boss with spike
  P.add('trim', X(lathePart([[0, 0.0], [0.07, 0.0], [0.078, 0.014], [0.062, 0.044], [0.03, 0.062], [0, 0.066]], 24), { p: [0, 0, 0.045], r: [Math.PI / 2, 0, 0] }), pal.trim);
  P.add('trim', X(new THREE.ConeGeometry(0.014, 0.075, 10), { p: [0, 0, 0.12], r: [Math.PI / 2, 0, 0] }), pal.trim);
  P.add('dark', X(torus(0.068, 0.006, 24, 6), { p: [0, 0, 0.05] }), pal.trimDark);
  // back
  P.add('wood', X(lathe([[0, -0.012], [R - 0.01, -0.012], [R - 0.01, -0.02], [0, -0.02]], 40), { r: [Math.PI / 2, 0, 0] }), 0x5a3a24);
  P.add('trim', cylBetween([0, -0.07, -0.03], [0, 0.07, -0.03], 0.01, 0.01, 8), pal.trimDark);
  P.add('leather', X(box3(0.04, 0.17, 0.012), { p: [0, 0, -0.022] }), 0x3a2216);
  if (r >= 2) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; P.add('gem', X(gemCut(0.016, 8), { p: [Math.cos(a) * 0.115, Math.sin(a) * 0.115, 0.034], r: [Math.PI / 2, 0, 0] }), pal.gem); }
  if (r === 3) { P.add('glow', X(torus(0.23, 0.005, 48, 6), { p: [0, 0, 0.026] }), 0xffffff); P.add('glow', X(torus(0.115, 0.004, 40, 6), { p: [0, 0, 0.03] }), 0xffffff); }
  return { height: 0.7, tipY: 0.34, length: 0.7, grip2: null, faceW: 2 * R, faceH: 2 * R };
}

// -- spear -------------------------------------------------------------------------------------------
function buildSpear(r, P, pal) {
  const yb = -0.62; const yt = 1.15; // butt .. head socket
  const secs = []; const K = 20;
  for (let i = 0; i <= K; i++) { const u = i / K; const y = lerp(yb, yt, u); const rr = 0.0165 - 0.0025 * u + (Math.abs(y) < 0.12 ? 0.0006 : 0); secs.push({ y, rx: rr, rz: rr }); }
  const woodCol = r === 0 ? 0x8a6238 : r === 1 ? 0x6a5238 : r === 2 ? 0x5a3a24 : 0x253448;
  P.add('wood', loft(secs, { N: 12, uv: [1, 2] }), woodCol, (x, y) => 0.85 + 0.15 * Math.sin(y * 40));
  // grip wrap
  gripWrap(-0.13, 0.1, 0.0185, { color: r === 0 ? 0x5a3a22 : r === 1 ? 0x22262f : r === 2 ? 0x5a1c22 : 0x14384c, turns: 22, ring: true, ringColor: pal.trim, wire: 0.003 }, P);
  // butt: ferrule + spike
  P.add('trim', lathe([[0, yb - 0.08], [0.004, yb - 0.075], [0.014, yb - 0.02], [0.021, yb + 0.0], [0.021, yb + 0.07], [0.0185, yb + 0.075], [0, yb + 0.075]], 12), pal.trim);
  P.add('dark', X(torus(0.0215, 0.003, 12, 5), { p: [0, yb + 0.04, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  // langets (metal strips) down from the socket
  for (const s of [-1, 1]) for (const a of [0, Math.PI / 2]) { void s; }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; P.add('trim', X(box3(0.006, 0.34, 0.0035), { p: [Math.cos(a) * 0.0185, yt - 0.14, Math.sin(a) * 0.0185], r: [0, -a + Math.PI / 2, 0] }), pal.trim); }
  // socket collar
  P.add('trim', lathe([[0.0185, yt - 0.3], [0.022, yt - 0.29], [0.021, yt - 0.28], [0.0185, yt - 0.27], [0.0185, yt - 0.04], [0.026, yt - 0.02], [0.03, yt + 0.0], [0.026, yt + 0.025], [0.0, yt + 0.03]], 14), pal.trim);
  for (const y of [yt - 0.22, yt - 0.1]) P.add('dark', X(torus(0.0195, 0.0032, 12, 5), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  // head
  const hl = r === 0 ? 0.26 : r === 1 ? 0.3 : 0.32; const hw = r === 0 ? 0.044 : r === 1 ? 0.052 : 0.056;
  const fuller = r === 0 ? null : { d: 0.003, u0: 0.1, u1: 0.8 };
  const hg = bladeGeo({ y0: yt + 0.02, len: hl, w0: hw * 0.75, w1: hw * 0.2, leaf: r === 0 ? 0.55 : 0.75, t: 0.0075, fuller, tip: hl * 0.5 });
  P.add('blade', hg, r === 0 ? PAL[0].blade : 0xffffff);
  if (r >= 1) { // barbs / wings at the socket
    for (const s of [-1, 1]) P.add('trim', X(cone2(0.011, 0.07, 6), { p: [0, yt + 0.02, s * 0.028], r: [s * (Math.PI / 2 + 0.55), 0, 0] }), pal.trim);
  }
  // pennon / tassel under the head
  const rng = mulberry32(31 + r);
  const tail = (z0, len, col) => {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([0.022 + Math.sin(t * 2.5 + z0) * 0.012 * t, yt - 0.04 - t * len, Math.sin(t * 3 + z0 * 3) * 0.02 * t + z0 * 0.01]); }
    return tube(pts, (t) => 0.0045 * (1 - t * 0.8), { segs: 14, radial: 4 });
  };
  for (let i = 0; i < 6; i++) P.add('cloth', tail(i - 3, 0.12 + rng() * 0.12), r === 3 ? pal.gem : pal.cloth);
  P.add('cloth', X(sph(0.011, [0.022, yt - 0.04, 0], [1, 1.3, 1], 8, 6)), pal.cloth);
  if (r >= 2) { P.add('gem', X(gemCut(0.012, 8), { p: [0, yt + 0.045, 0.0], r: [0, 0, 0] }), pal.gem); }
  if (r === 3) { P.add('glow', X(torus(0.0215, 0.0022, 12, 5), { p: [0, yt - 0.25, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff); P.add('glow', X(torus(0.0215, 0.0022, 12, 5), { p: [0, yt - 0.04, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff); }
  return { tipY: yt + 0.02 + hl, length: yt + 0.02 + hl - yb, grip2: [0, 0.34, 0], yb, yt };
}
function cone2(r, h, seg) { return new THREE.ConeGeometry(r, h, seg, 1).translate(0, h / 2, 0); }

// -- bow ---------------------------------------------------------------------------------------------
const BOW_H = 0.7;
const bowZ = (y) => { const u = Math.abs(y) / BOW_H; return -0.13 * u ** 1.9 + 0.06 * Math.max(0, u - 0.86) ** 1 * 6 * (u > 0.86 ? 1 : 0) * 0.55; };
function buildBow(r, P, pal, group, mats) {
  const secs = []; const K = 40;
  const woodCol = r === 0 ? 0x8a5c30 : r === 1 ? 0x6a4a2a : r === 2 ? 0x5a3220 : 0x2a4a5a;
  const lam2 = r === 0 ? 0xc89a60 : r === 1 ? 0xd2b080 : r === 2 ? 0xe2c07a : 0x6ae6ff;
  const limb = (sgn) => {
    const s2 = []; const n = 22;
    for (let i = 0; i <= n; i++) {
      const u = i / n; const y = sgn * (0.07 + (BOW_H - 0.07) * u);
      const w = 0.0135 * (1 - 0.62 * u) + 0.004; const d = 0.0105 * (1 - 0.5 * u) + 0.0035;
      s2.push({ y, rx: w, rz: d, n: 2.6, oz: bowZ(y) - 0.0, N: 12 });
    }
    return loft(sgn > 0 ? s2 : s2.reverse(), { N: 12, capTop: true, capBottom: false });
  };
  for (const s of [1, -1]) {
    const lg = limb(s);
    P.add('wood', lg, woodCol);
    // contrasting lamination stripe on the belly (back toward +Z)
    const s3 = []; const n = 22;
    for (let i = 0; i <= n; i++) { const u = i / n; const y = s * (0.07 + (BOW_H - 0.07) * u); s3.push({ y, rx: (0.0135 * (1 - 0.62 * u) + 0.004) * 0.55, rz: (0.0105 * (1 - 0.5 * u) + 0.0035) * 0.35, n: 2.6, oz: bowZ(y) + (0.0105 * (1 - 0.5 * u) + 0.0035) * 0.8, N: 8 }); }
    P.add('wood', loft(s > 0 ? s3 : s3.reverse(), { N: 8 }), lam2);
    // horn nock tip
    const ty = s * BOW_H; const tz = bowZ(ty);
    P.add(r === 3 ? 'blade' : 'trim', X(crystal(0.0105, 3.0, r === 3 ? 6 : 8), { p: [0, ty + s * 0.012, tz + 0.004], r: [s > 0 ? 0 : Math.PI, 0, 0] }), r === 0 ? 0xd8c8a0 : r === 3 ? 0xffffff : pal.trim);
    // metal bands along limb (rarity)
    if (r >= 1) for (const u of [0.28, 0.5, 0.72]) { const y = s * (0.07 + (BOW_H - 0.07) * u); const w = 0.0135 * (1 - 0.62 * u) + 0.0042; P.add('trim', X(torus(1, 0.0028, 14, 5), { p: [0, y, bowZ(y)], r: [Math.PI / 2, 0, 0], s: [w * 1.02, w * 1.02, (0.0105 * (1 - 0.5 * u) + 0.0042) * 1.0] }), pal.trim); }
    if (r >= 2) for (const u of [0.38, 0.62]) { const y = s * (0.07 + (BOW_H - 0.07) * u); P.add('gem', X(gemCut(0.0075, 8), { p: [0, y, bowZ(y) + 0.011], r: [Math.PI / 2, 0, 0] }), pal.gem); }
  }
  // riser / handle
  const hs = []; for (let i = 0; i <= 12; i++) { const u = i / 12; const y = lerp(-0.1, 0.1, u); hs.push({ y, rx: 0.0185 * (1 + 0.15 * Math.sin(u * Math.PI)), rz: 0.0165 * (1 + 0.1 * Math.sin(u * Math.PI)), n: 2.6, oz: -0.002 + 0.01 * Math.sin(u * Math.PI) }); }
  P.add('wood', loft(hs, { N: 12, capTop: true, capBottom: true }), woodCol);
  gripWrap(-0.06, 0.06, 0.0195, { color: r === 0 ? 0x4c2e1c : r === 1 ? 0x232838 : r === 2 ? 0x601e26 : 0x14384c, turns: 12, ring: true, ringColor: pal.trim, wire: 0.003, taper: 0.05 }, P);
  // arrow shelf (small bump where the arrow rests) + riser plates
  P.add('trim', X(box3(0.022, 0.026, 0.02), { p: [0.0, 0.072, 0.012] }), pal.trim);
  P.add('trim', X(box3(0.01, 0.07, 0.014), { p: [0.0, 0.092, 0.0] }), pal.trimDark);
  if (r >= 2) P.add('gem', X(gemCut(0.0105, 8), { p: [0, 0.0, 0.026], r: [Math.PI / 2, 0, 0] }), pal.gem);
  // string
  const str = new THREE.MeshStandardMaterial({ color: r === 3 ? 0x000000 : 0xe8dcc0, emissive: r === 3 ? 0x7af0ff : 0x000000, emissiveIntensity: r === 3 ? 3.0 : 0, roughness: 0.7, metalness: 0 });
  const mkStr = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 5, 1, true), str); m.castShadow = false; return m; };
  const s1 = mkStr(); const s2 = mkStr(); group.add(s1, s2);
  const tipTop = new THREE.Vector3(0, BOW_H + 0.01, bowZ(BOW_H) + 0.0); const tipBot = new THREE.Vector3(0, -BOW_H - 0.01, bowZ(-BOW_H) + 0.0);
  const nock = new THREE.Object3D(); group.add(nock);
  const place = (m, a, b) => { const d = b.clone().sub(a); const l = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, l, 1); };
  const setDraw = (k) => { // k 0..1
    const restZ = bowZ(BOW_H) - 0.0; nock.position.set(0, 0, restZ - 0.54 * k);
    place(s1, tipTop, nock.position); place(s2, nock.position, tipBot);
  };
  setDraw(0);
  group.userData.setDraw = setDraw; group.userData.nock = nock; group.userData.stringMat = str;
  // nocking point bead
  return { tipY: BOW_H, length: BOW_H * 2, grip2: [0, 0, bowZ(BOW_H)], bow: true };
}

// arrows (also used for the quiver by the ranger)
export function createArrow(rarity = 0, { quality = 'high', len = 0.78, fletch = 0xc8c0a8, glowTip = false } = {}) {
  const pal = PAL[rarity];
  const g = new THREE.Group(); const P = new Parts();
  P.add('wood', X(cylBetween([0, 0, 0], [0, 0, len], 0.0042, 0.0042, 6), {}), 0xc8a070);
  // head (steel broadhead)
  const head = X(new THREE.ConeGeometry(0.0085, 0.052, 5), { p: [0, 0, len + 0.026], r: [Math.PI / 2, 0, 0] });
  P.add('trim', head, rarity === 3 ? 0xdfffff : 0xb8bcc6);
  P.add('trim', X(torus(0.0052, 0.0016, 8, 4), { p: [0, 0, len - 0.004] }), 0x8a8e98);
  // fletching: three vanes
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU; const v = plate([[0, 0], [0.012, 0.005], [0.012, 0.075], [0.0, 0.06]], 0.0008, 0);
    P.add('cloth', X(v, { p: [Math.cos(a) * 0.004, Math.sin(a) * 0.004, 0.02], r: [0, 0, 0] }).rotateZ(0), 0xffffff);
    const last = P.list.cloth[P.list.cloth.length - 1];
    // rotate vane about the arrow axis; vane lies in its local XY plane with extrusion along Z -> remap: x=out, y=along
    last.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); // y->z
    last.applyMatrix4(new THREE.Matrix4().makeRotationZ(a));
    tint(last, i === 0 ? 0xb42a2a : fletch);
  }
  P.add('trim', X(cylBetween([0, 0, -0.006], [0, 0, 0.012], 0.0052, 0.0046, 6), {}), 0xe8e0c8);
  const M = { wood: surf('wood', { repeat: 1, roughness: 0.9, metalness: 0 }), trim: metal(0xffffff, { name: 'arrowhead', rough: 0.35 }), cloth: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }) };
  M.wood.metalness = 0;
  for (const role of Object.keys(P.list)) { const m = new THREE.Mesh(P.merged(role), M[role]); m.castShadow = true; g.add(m); }
  g.userData.length = len + 0.05;
  return g;
}

// -- staff -------------------------------------------------------------------------------------------
function buildStaff(r, P, pal, group, o) {
  const accent = new THREE.Color(o.accent ?? 0x5aa8ff);
  const yb = -0.62; const yTop = 1.28;
  const rng = mulberry32(99 + r);
  const woodCol = r === 0 ? 0x6a4a2e : r === 1 ? 0x5a4636 : r === 2 ? 0x4a2e20 : 0x1c2c3e;
  // gnarled shaft along a gently wavy path
  const pts = []; const n = 14;
  for (let i = 0; i <= n; i++) { const t = i / n; const y = lerp(yb, yTop, t); pts.push([Math.sin(t * 5 + 1) * 0.012 * (1 - t * 0.3), y, Math.cos(t * 4.2) * 0.012]); }
  const shaft = tube(pts, (t) => 0.0225 - 0.007 * t + 0.0035 * Math.sin(t * 38 + 1) * Math.sin(t * 7) + (t > 0.9 ? (t - 0.9) * 0.1 : 0), { segs: 90, radial: 10 });
  P.add('wood', shaft, woodCol, (x, y) => 0.8 + 0.2 * Math.sin(y * 60 + x * 80));
  // knots and branch stubs
  for (let i = 0; i < 7; i++) { const t = 0.12 + rng() * 0.74; const y = lerp(yb, yTop, t); const a = rng() * TAU; const px = Math.sin(t * 5 + 1) * 0.012; const pz = Math.cos(t * 4.2) * 0.012;
    P.add('wood', X(sph(0.016 + rng() * 0.008, [0, 0, 0], [1, 1.5, 1], 8, 6), { p: [px + Math.cos(a) * 0.016, y, pz + Math.sin(a) * 0.016] }), woodCol); }
  // vine / twist wrap climbing the shaft
  P.add('wood', helix(0.0245, -0.15, 0.95, 4.5, 0.0045, { seg: 150, radial: 5, phase: 1 }), 0x3a5a2a);
  gripWrap(-0.09, 0.09, 0.0245, { color: r === 0 ? 0x5a3a22 : r === 1 ? 0x1e222c : r === 2 ? 0x5a1c22 : 0x143a50, turns: 18, ring: true, ringColor: pal.trim, wire: 0.0032, taper: 0.03 }, P);
  // butt cap
  P.add('trim', lathe([[0, yb - 0.04], [0.012, yb - 0.035], [0.022, yb + 0.0], [0.026, yb + 0.05], [0.02, yb + 0.06], [0, yb + 0.06]], 12), pal.trim);
  // head cage: curled claws around the orb
  const orbY = yTop + 0.12; const orbR = r === 3 ? 0.062 : 0.058;
  const claws = r === 0 ? 4 : 5;
  for (let i = 0; i < claws; i++) {
    const a = (i / claws) * TAU + 0.3; const ca = Math.cos(a); const sa = Math.sin(a);
    const cp = [[ca * 0.01, yTop - 0.04, sa * 0.01], [ca * 0.05, yTop + 0.03, sa * 0.05], [ca * 0.085, yTop + 0.11, sa * 0.085], [ca * 0.07, yTop + 0.18, sa * 0.07], [ca * 0.036, yTop + 0.225, sa * 0.036]];
    P.add(r === 0 ? 'wood' : 'trim', tube(cp, (t) => 0.014 * (1 - t * 0.75) + 0.002, { segs: 20, radial: 6 }), r === 0 ? woodCol : pal.trim);
    if (r >= 1) P.add('trim', X(cone2(0.006, 0.04, 6), { p: [ca * 0.036, yTop + 0.225, sa * 0.036], r: [sa * 0.7, 0, -ca * 0.7] }), pal.trim);
  }
  if (r >= 1) { P.add('trim', X(torus(0.055, 0.007, 20, 6), { p: [0, yTop + 0.09, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1] }), pal.trim); P.add('trim', X(torus(0.03, 0.006, 16, 5), { p: [0, yTop - 0.015, 0], r: [Math.PI / 2, 0, 0] }), pal.trim); }
  if (r >= 2) { for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; P.add('gem', X(gemCut(0.0095, 8), { p: [Math.cos(a) * 0.058, yTop + 0.09, Math.sin(a) * 0.058], r: [Math.PI / 2 * 0, 0, 0] }), pal.gem); } }
  P.add('trim', lathe([[0.0235, yTop - 0.09], [0.03, yTop - 0.06], [0.034, yTop - 0.03], [0.026, yTop - 0.005], [0.016, yTop + 0.02]], 14), r === 0 ? 0x5a3a22 : pal.trim);
  // diamond: floating crystal shards ringing the orb
  const shards = [];
  if (r === 3) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; P.add('blade', X(crystal(0.011, 2.4, 5), { p: [Math.cos(a) * 0.12, orbY + (i % 2 ? 0.05 : -0.04), Math.sin(a) * 0.12], r: [0.0, 0, 0.35 * (i % 2 ? 1 : -1)] }), 0xffffff); }
  // orb: inner glowing core + glass shell + additive glow sprite
  const orbMat = new THREE.MeshStandardMaterial({ color: accent.clone().multiplyScalar(0.25), emissive: accent, emissiveIntensity: 2.4, roughness: 0.15, metalness: 0 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(orbR * 0.82, 24, 16), orbMat); orb.position.set(0, orbY, 0); group.add(orb);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(orbR, 28, 18), new THREE.MeshPhysicalMaterial({ color: accent.clone().lerp(new THREE.Color(0xffffff), 0.4), roughness: 0.03, metalness: 0, transmission: 0, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 2.5, emissive: accent, emissiveIntensity: 0.4, depthWrite: false }));
  shell.position.copy(orb.position); group.add(shell);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(orbR * 0.38, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff).lerp(accent, 0.3), emissiveIntensity: 3.2, flatShading: true }));
  core.position.copy(orb.position); group.add(core);
  const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite('glow'), color: accent, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false }));
  gs.scale.set(0.5, 0.5, 0.5); gs.position.copy(orb.position); group.add(gs);
  group.userData.orb = orb; group.userData.orbMat = orbMat; group.userData.glowSprite = gs; group.userData.accent = accent; group.userData.orbShell = shell;
  group.userData.tip = new THREE.Object3D(); group.userData.tip.position.copy(orb.position); group.add(group.userData.tip);
  group.userData.orbR = orbR;
  const rings = [];
  if (r >= 2) for (let i = 0; i < (r === 3 ? 2 : 1); i++) {
    const rg = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.03, 0.0035, 6, 48), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: r === 3 ? 0x8fe8ff : 0xffd25a, emissiveIntensity: 1.6 }));
    rg.position.copy(orb.position); group.add(rg); rings.push(rg);
  }
  group.userData._staff = { orb, core, gs, rings, orbMat, shell, r };
  return { tipY: orbY + orbR, length: orbY + orbR - yb, grip2: [0, 0.36, 0], yb, orbY };
}

// -- bracer ------------------------------------------------------------------------------------------
function buildBracer(r, P, pal) {
  // vambrace: half-cylinder cuff with layered lames, leather straps on the back, a small spiked buckler plate outside
  const len = 0.27; const y0 = -0.13;
  const lameCol = pal.blade;
  const lames = 5;
  for (let i = 0; i < lames; i++) {
    const y = y0 + (i + 0.5) * (len / lames); const taper = 1 - (i / lames) * 0.28;
    const rad = 0.052 * (0.96 + 0.38 * (1 - i / lames) * 0.2) * (1.0 - 0.0);
    const rr = 0.056 - 0.012 * (i / (lames - 1));
    P.add('trim', loft([{ y: y - 0.0295, rx: rr * 0.97, rz: rr * 0.95 }, { y: y - 0.026, rx: rr, rz: rr }, { y: y + 0.0245, rx: rr * 1.025, rz: rr * 1.025 }, { y: y + 0.0295, rx: rr * 1.0, rz: rr * 1.0 }], { N: 18, ring: { a0: -2.0, a1: 2.0, open: true }, thick: 0.004 }), r === 0 ? 0x9a6a38 : r === 3 ? 0xdffaff : 0xd6dae2, (x, yy) => 0.78 + 0.22 * ((yy - y + 0.03) / 0.06));
  }
  // back-of-arm straps
  for (const y of [y0 + 0.05, y0 + 0.13, y0 + 0.21]) {
    P.add('leather', loft([{ y: y - 0.011, rx: 0.052, rz: 0.052 }, { y: y + 0.011, rx: 0.052, rz: 0.052 }], { N: 18, ring: { a0: 1.7, a1: TAU - 1.7, open: true }, thick: 0.004 }), 0x3a2216);
    P.add('trim', X(box3(0.018, 0.016, 0.006), { p: [-0.034, y, -0.044], r: [0, 0.6, 0] }), pal.trim);
  }
  // raised center ridge
  P.add('trim', X(loft([{ y: y0 + 0.01, rx: 0.011, rz: 0.011, oz: 0.056 }, { y: y0 + 0.14, rx: 0.016, rz: 0.012, oz: 0.062 }, { y: y0 + 0.26, rx: 0.011, rz: 0.01, oz: 0.056 }], { N: 8, capTop: true, capBottom: true }), {}), pal.trim);
  // buckler: small round plate on the outer side with spike and studs
  const bz = 0.07;
  P.add('trim', X(lathe([[0, 0.012], [0.03, 0.01], [0.055, 0.0], [0.058, -0.004], [0.0, -0.004]], 28), { p: [0, 0.015, bz], r: [Math.PI / 2, 0, 0] }), pal.trim);
  P.add('trim', X(torus(0.056, 0.005, 28, 6), { p: [0, 0.015, bz] }), pal.trim);
  P.add('dark', X(new THREE.ConeGeometry(0.009, 0.04, 8), { p: [0, 0.015, bz + 0.036], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  const st = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; st.push([Math.cos(a) * 0.042, 0.015 + Math.sin(a) * 0.042, bz + 0.009, 0, 0, 1]); }
  P.add('dark', rivets(st, 0.0058, 6), pal.trimDark);
  if (r >= 2) P.add('gem', X(gemCut(0.012, 8), { p: [0, 0.015, bz + 0.012], r: [Math.PI / 2, 0, 0] }), pal.gem);
  if (r === 3) P.add('glow', X(torus(0.043, 0.0032, 28, 5), { p: [0, 0.015, bz + 0.004] }), 0xffffff);
  // wrist cuff flare
  P.add('leather', loft([{ y: y0 - 0.004, rx: 0.05, rz: 0.05 }, { y: y0 + 0.02, rx: 0.046, rz: 0.046 }], { N: 18, thick: 0.004 }), 0x3a2216);
  return { tipY: 0.14, length: 0.3, grip2: null };
}

// -- mace (one hand): a wooden haft with a flanged steel head ----------------------------------------
function buildMace(r, P, pal) {
  const yb = -0.13; const yt = 0.36; const headY = yt + 0.06;
  const woodCol = r === 0 ? 0x7a5432 : r === 1 ? 0x5e4a36 : r === 2 ? 0x4e321e : 0x223244;
  P.add('wood', loft([{ y: yb, rx: 0.016, rz: 0.016 }, { y: yt, rx: 0.019, rz: 0.019 }], { N: 12, capTop: true, capBottom: true }), woodCol);
  gripWrap(-0.11, 0.08, 0.0175, { color: r === 0 ? 0x5a3a22 : r === 1 ? 0x22262f : r === 2 ? 0x5a1c22 : 0x14384c, turns: 14, ring: true, ringColor: pal.trim }, P);
  pommel(r, yb - 0.014, r, P, pal, 0.9);
  // socket collar and the head core
  P.add('trim', lathePart([[0.019, yt - 0.06], [0.026, yt - 0.05], [0.024, yt - 0.03], [0.03, yt - 0.01], [0.032, yt + 0.0]], 14), pal.trim);
  const blade = r === 0 ? PAL[0].blade : 0xffffff;
  P.add('blade', lathePart([[0, yt - 0.005], [0.044, yt + 0.008], [0.054, headY + 0.01], [0.044, headY + 0.07], [0.016, headY + 0.095], [0, headY + 0.1]], 16), blade);
  // flanges: six fins around the head
  const fins = 6 + (r >= 2 ? 2 : 0);
  for (let i = 0; i < fins; i++) {
    const a = (i / fins) * TAU;
    const fin = new THREE.Shape([new THREE.Vector2(0, -0.065), new THREE.Vector2(0.04, -0.045), new THREE.Vector2(0.048, 0.026), new THREE.Vector2(0.016, 0.072), new THREE.Vector2(0, 0.078)].map((v) => v));
    const g = new THREE.ExtrudeGeometry(fin, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
    g.translate(0.034, 0, -0.005);
    P.add('blade', X(g, { p: [0, headY + 0.012, 0], r: [0, -a, 0] }), blade, (x, y) => 0.85 + 0.15 * (y + 0.05) / 0.11);
  }
  P.add('blade', X(new THREE.ConeGeometry(0.015, 0.065, 8), { p: [0, headY + 0.13, 0] }), blade);
  P.add('dark', X(torus(0.036, 0.004, 16, 5), { p: [0, yt + 0.005, 0], r: [Math.PI / 2, 0, 0] }), pal.trimDark);
  if (r >= 2) for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + TAU / 8; P.add('gem', X(gemCut(0.011, 8), { p: [Math.cos(a) * 0.052, headY + 0.016, Math.sin(a) * 0.052], r: [0, -a, Math.PI / 2] }), pal.gem); }
  if (r === 3) P.add('glow', X(torus(0.022, 0.0022, 12, 5), { p: [0, yt - 0.03, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff);
  return { tipY: headY + 0.16, length: headY + 0.16 - yb + 0.03, grip2: null };
}

// -- war hammer (two hands): a long haft, a square striking face and a back spike --------------------
function buildHammer(r, P, pal) {
  const yb = -0.36; const yt = 0.62;
  const woodCol = r === 0 ? 0x7a5432 : r === 1 ? 0x5e4a36 : r === 2 ? 0x4e321e : 0x223244;
  P.add('wood', loft([{ y: yb, rx: 0.017, rz: 0.017 }, { y: yt, rx: 0.02, rz: 0.02 }], { N: 12, capTop: true, capBottom: true }), woodCol, (x, y) => 0.85 + 0.15 * Math.sin(y * 40));
  gripWrap(-0.33, 0.06, 0.0185, { color: r === 0 ? 0x5a3a22 : r === 1 ? 0x22262f : r === 2 ? 0x5a1c22 : 0x14384c, turns: 24, ring: true, ringColor: pal.trim, wire: 0.003 }, P);
  P.add('trim', lathe([[0, yb - 0.05], [0.012, yb - 0.04], [0.021, yb - 0.01], [0.021, yb + 0.04], [0, yb + 0.04]], 12), pal.trim);
  // langets up to the head
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; P.add('trim', X(box3(0.006, 0.2, 0.0035), { p: [Math.cos(a) * 0.02, yt - 0.1, Math.sin(a) * 0.02], r: [0, -a + Math.PI / 2, 0] }), pal.trim); }
  const blade = r === 0 ? PAL[0].blade : 0xffffff;
  // head: a heavy block across the haft (along Z), a broad face on +Z and a curved spike on -Z
  const hy = yt + 0.05;
  P.add('blade', X(box3(0.115, 0.13, 0.27), { p: [0, hy, 0.03] }), blade, (x, y, z) => 0.82 + 0.18 * (z + 0.1) / 0.27);
  P.add('blade', X(box3(0.135, 0.15, 0.045), { p: [0, hy, 0.18] }), blade);
  P.add('blade', X(new THREE.ConeGeometry(0.048, 0.2, 4), { p: [0, hy, -0.2], r: [-Math.PI / 2, Math.PI / 4, 0] }), blade);
  P.add('blade', X(new THREE.ConeGeometry(0.02, 0.1, 6), { p: [0, hy + 0.11, 0.03] }), blade);
  for (const z of [-0.07, 0.12]) P.add('dark', X(box3(0.122, 0.138, 0.012), { p: [0, hy, z] }), pal.trimDark);
  if (r >= 1) P.add('trim', X(box3(0.125, 0.018, 0.24), { p: [0, hy + 0.068, 0.03] }), pal.trim);
  if (r >= 2) for (const sx of [-1, 1]) P.add('gem', X(gemCut(0.019, 8), { p: [sx * 0.058, hy, 0.05], r: [0, 0, -sx * Math.PI / 2] }), pal.gem);
  if (r === 3) { P.add('glow', X(torus(0.023, 0.0024, 12, 5), { p: [0, yt - 0.18, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff); P.add('glow', X(torus(0.023, 0.0024, 12, 5), { p: [0, 0.08, 0], r: [Math.PI / 2, 0, 0] }), 0xffffff); }
  return { tipY: yt + 0.2, length: yt + 0.2 - yb + 0.05, grip2: [0, -0.24, 0] };
}

// -- tower shield (one hand): tall, nearly rectangular, gently curved ---------------------------------
function buildTower(r, P, pal) {
  const w = 0.24; const top = 0.44; const bot = -0.5; const c = 0.05; // chamfered corners
  const outline = [[-w + c, top], [0, top + 0.02], [w - c, top], [w, top - c], [w, bot + c * 1.5], [w - c * 1.5, bot], [0, bot - 0.025], [-w + c * 1.5, bot], [-w, bot + c * 1.5], [-w, top - c]];
  const shape = new THREE.Shape(outline.map((q) => new THREE.Vector2(q[0], q[1])));
  const curve = (x) => -(x * x) * 1.6;
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 6, steps: 1 });
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.085 + curve(p.getX(i)));
  g.computeVertexNormals();
  planar(g, (x) => x / (2 * w) + 0.5, (x, y) => (y - bot) / (top - bot));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
  P.add('face', g, 0xffffff);
  const rim = outline.map((q) => [q[0], q[1], 0.085 + 0.024 + curve(q[0])]);
  P.add('trim', tube([...rim, rim[0]], 0.011, { segs: 120, radial: 7, closed: false }), pal.trim);
  // two horizontal bands and a central boss
  for (const y of [top - 0.12, bot + 0.14]) P.add('trim', tube([[-w, y, 0.11 + curve(w)], [0, y, 0.115], [w, y, 0.11 + curve(w)]], 0.008, { segs: 24, radial: 6 }), pal.trimDark);
  P.add('trim', X(lathePart([[0, 0.0], [0.045, 0.0], [0.05, 0.01], [0.04, 0.03], [0.02, 0.042], [0, 0.046]], 18), { p: [0, 0.0, 0.112], r: [Math.PI / 2, 0, 0] }), pal.trim);
  const rv = []; for (const q of rim.filter((_, i) => i % 1 === 0)) rv.push([q[0] * 0.9, q[1] * 0.95, q[2] - 0.004, 0, 0, 1]);
  const rg = rivets(rv, 0.008, 8); if (rg) P.add('trim', rg, pal.trim);
  const back = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 4 });
  const bp = back.attributes.position; for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) + 0.07 + curve(bp.getX(i)));
  back.computeVertexNormals(); P.add('wood', back, 0x5e4028);
  P.add('leather', X(box3(0.028, 0.14, 0.012), { p: [0, 0.0, 0.06] }), 0x3a2216);
  P.add('trim', cylBetween([0, -0.07, 0.052], [0, 0.07, 0.052], 0.009, 0.009, 8), pal.trimDark);
  if (r >= 2) { P.add('gem', X(gemCut(0.022, 8), { p: [0, 0.0, 0.16], r: [Math.PI / 2, 0, 0] }), pal.gem); for (const y of [top - 0.12, bot + 0.14]) P.add('gem', X(gemCut(0.012, 8), { p: [0, y, 0.125], r: [Math.PI / 2, 0, 0] }), pal.gem); }
  if (r === 3) P.add('glow', tube([...rim.map((q) => [q[0] * 0.86, q[1] * 0.9, q[2] - 0.006]), [rim[0][0] * 0.86, rim[0][1] * 0.9, rim[0][2] - 0.006]], 0.0035, { segs: 120, radial: 5 }), 0xffffff);
  return { height: top - bot, tipY: top, length: top - bot + 0.04, grip2: null, faceW: 2 * w, faceH: top - bot };
}

// -- fists -------------------------------------------------------------------------------------------
function buildFists(r, P, pal) {
  // hand wraps + a knuckle bar; origin at the middle of the fist, +Y along the grip axis
  for (let i = 0; i < 5; i++) { const y = -0.035 + i * 0.017; P.add('cloth', X(torus(0.0445, 0.0075, 20, 6), { p: [0, y, 0.0], r: [Math.PI / 2, 0, 0], s: [1.0, 1.2, 1] }), r === 0 ? 0xb8a888 : r === 1 ? 0xaab4c8 : r === 2 ? 0xe0c070 : 0x70dfff); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 0.55 - 0.3; P.add('trim', X(sph(0.0125, [0, 0, 0], [1.3, 1, 1.2], 10, 7), { p: [Math.sin(a * 2) * 0.0, 0.0, 0.048 + 0.0], r: [0, 0, 0] }).translate(0, 0, 0), pal.trim); }
  P.list.trim = [];
  const kn = []; for (let i = 0; i < 4; i++) kn.push([-0.039 + i * 0.026, 0.05, 0.0, 0, 0, 1]);
  void kn;
  for (let i = 0; i < 4; i++) P.add('trim', X(sph(0.0125, [0, 0, 0], [1.1, 1.0, 0.9], 10, 8), { p: [0, -0.033 + i * 0.022, 0.049] }), pal.trim);
  P.add('trim', X(box3(0.01, 0.1, 0.007), { p: [0, 0.0, 0.056] }), pal.trimDark);
  return { tipY: 0.06, length: 0.12, grip2: null };
}

// ----------------------------------------------------------------------------------------------- entry points
// A legendary borrows its ordinary weapon's model, crowned with Diamond detail and a warm sunlit glow instead of ice blue.
const LEGEND_GLOW = { blade: 0xffe7a0, emissive: 0xd88a1a, halo: 0xffc040, face: 0xffb030 };
export function createWeapon(id, rarity = 0, o = {}) {
  const legend = WEAPONS[id]?.legendary ? id : null;
  if (legend) { id = WEAPONS[id].model; rarity = 3; }
  const r = Math.max(0, Math.min(3, rarity | 0)); const pal = PAL[r];
  const def = WEAPONS[id]; if (!def) throw new Error(`unknown weapon ${id}`);
  const group = new THREE.Group(); group.name = `weapon-${id}-${RNAMES[r]}`; const ud0 = group.userData;
  const P = new Parts(); const M = weaponMats(r);
  let info;
  const field = o.tint != null ? `#${new THREE.Color(o.tint).getHexString()}` : null; // a company hero's own colour on the shield
  const faceMap = (id === 'shield' || id === 'tower') ? emblemTexture(o.emblem ?? (o.style === 'round' ? 'rune' : 'crown'), o.style === 'round' ? { a: field || '#6a3a1a', b: '#ffcf80', c: '#1c1008' } : { a: field || '#8a1c24', b: '#f0d070', c: '#14100a' }) : null;
  switch (id) {
    case 'sword': info = buildSword(r, P, pal); break;
    case 'longsword': info = buildSword(r, P, pal, { long: true }); break;
    case 'dagger': info = buildDagger(r, P, pal); break;
    case 'shield': info = buildShield(r, P, pal, o); break;
    case 'spear': info = buildSpear(r, P, pal); break;
    case 'bow': info = buildBow(r, P, pal, group, M); break;
    case 'staff': info = buildStaff(r, P, pal, group, o); break;
    case 'bracer': info = buildBracer(r, P, pal); break;
    case 'fists': info = buildFists(r, P, pal); break;
    case 'mace': info = buildMace(r, P, pal); break;
    case 'warhammer': info = buildHammer(r, P, pal); break;
    case 'tower': info = buildTower(r, P, pal); break;
    default: throw new Error(`no model for ${id}`);
  }
  // materials per role
  const roleMat = { ...M };
  const shimmer = [];
  const roleMesh = {};
  if (r === 3) { roleMat.blade = legend ? crystalMaterial(r, LEGEND_GLOW.blade, LEGEND_GLOW.emissive) : crystalMaterial(r, o.accent3); shimmer.push(roleMat.blade); }
  if (id === 'shield' || id === 'tower') {
    const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, map: faceMap, vertexColors: true, roughness: 0.55, metalness: 0.35, envMapIntensity: 1.0, bumpMap: faceMap, bumpScale: 0.8 });
    roleMat.face = fm;
    if (r === 3) { fm.emissive = new THREE.Color(legend ? LEGEND_GLOW.face : 0x35c4e4); fm.emissiveMap = faceMap; fm.emissiveIntensity = 0.5; shimmer.push(fm); }
    if (r === 2) { fm.emissive = new THREE.Color(0xffd25a); fm.emissiveMap = faceMap; fm.emissiveIntensity = 0.12; }
  }
  const q = QUAL[o.quality || 'high'] || 1; void q;
  for (const role of Object.keys(P.list)) {
    const g = P.merged(role); if (!g) continue;
    const m = new THREE.Mesh(g, roleMat[role]); m.castShadow = true; m.receiveShadow = true; m.name = `${id}-${role}`; m.userData.role = role; group.add(m); roleMesh[role] = m;
    if (role === 'blade' && r === 3) {
      m.userData.shimmer = true;
      const halo = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: legend ? LEGEND_GLOW.halo : 0x2ab8e0, transparent: true, opacity: legend ? 0.3 : 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, toneMapped: true }));
      halo.scale.set(1.9, 1, 1.22); halo.name = `${id}-halo`; group.add(halo); ud0.halo = halo;
    }
  }
  const tip = group.userData.tip || new THREE.Object3D(); tip.position.set(0, info.tipY ?? 0.5, 0); if (!tip.parent) group.add(tip);
  const ud = group.userData;
  ud.id = id; ud.legend = legend; ud.rarity = r; ud.family = id; ud.hands = def.hands; ud.length = info.length; ud.tip = tip; ud.mount = id === 'bracer' ? 'forearm' : 'grip';
  ud.sockets = { grip2: info.grip2 || null };
  ud.info = info;
  // animation hooks
  const st = ud._staff; const dia = r === 3; const glowMats = [M.glow];
  const wob = (r + 1) * 1.3;
  ud.update = (dt, t) => {
    if (dia) {
      for (const rl of ['blade', 'face']) { const m = roleMesh[rl]?.material; if (!m || !m.emissiveMap || (rl === 'blade' && !dia) ) continue; const e = m.emissiveMap; if (e) { e.offset.y = ((t * 0.16) % 1); } m.emissiveIntensity = 0.65 + 0.3 * Math.sin(t * 2.3) + 0.12 * Math.sin(t * 5.1 + 1); if (rl === 'face') m.emissiveIntensity = 0.45 + 0.3 * Math.sin(t * 2.3); }
      if (roleMesh.glow) roleMesh.glow.material.emissiveIntensity = 2.0 + 0.9 * Math.sin(t * 3.1 + wob);
    } else if (r === 2) { if (roleMesh.glow) roleMesh.glow.material.emissiveIntensity = 1.6 + 0.4 * Math.sin(t * 2.0); if (roleMesh.gem) roleMesh.gem.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 1.7); }
    if (r >= 1 && r < 3 && roleMesh.blade) roleMesh.blade.material.emissiveIntensity = (r === 1 ? 0.3 : 0.5) + 0.15 * Math.sin(t * 2.2);
    if (st) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.0); const fl = 0.5 + 0.5 * Math.sin(t * 7.3 + Math.sin(t * 3.1) * 2);
      const om = st.orb.material; om.emissiveIntensity = 1.9 + 0.9 * pulse + 0.25 * fl; st.core.rotation.y = t * 0.9; st.core.rotation.x = t * 0.6;
      const k = ud.charge || 0; // 0..1 extra when channeling
      st.gs.scale.setScalar((0.42 + 0.1 * pulse + 0.05 * fl) * (1 + k * 1.2)); st.gs.material.opacity = (0.65 + 0.2 * pulse) * (ud.fade ?? 1);
      om.emissiveIntensity += k * 3;
      st.rings.forEach((rg, i) => { rg.rotation.x = Math.PI / 2 + Math.sin(t * (0.8 + i * 0.6)) * 0.45; rg.rotation.y = t * (0.7 + i * 0.5); });
    }
  };
  ud.dispose = () => { group.traverse((m) => { m.geometry?.dispose?.(); }); };
  if (id === 'bow') ud.setDraw(0);
  void glowMats;
  return group;
}
export const WEAPON_IDS = Object.keys(WEAPONS); // (legendaries included: they draw as their model in gold light)
export const RARITY_PALETTE = PAL;
