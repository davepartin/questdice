// Arena-only procedural textures (built on the foundation's buildPBR): natural rock strata, conifer
// needles, thatch, charred wood, plus canvas sprites (banner sigil, raven wing, coin glint).
import * as THREE from 'three';
import { buildPBR, hex, ramp } from '../tex.js';
import { clamp, smooth, lerp } from '../noise.js';
import { canvasTex } from './common.js';

const cache = new Map();
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function build(kind, opts, fn, size = 256) {
  const key = `${kind}|${JSON.stringify(opts)}|${size}`;
  if (cache.has(key)) return cache.get(key);
  const s = buildPBR(fn, { size, seed: opts.seed || 1, normalStrength: opts.normal ?? 2.6 });
  cache.set(key, s); return s;
}

// Layered, cracked, lichen-flecked rock.
export function rockTex({ tint = 0x6a665e, dark = 0x1c1a18, seed = 3, lichen = 0x6a7a4a, lichenAmt = 0.0, size = 256 } = {}) {
  const lo = hex(dark); const hi = hex(tint); const li = hex(lichen);
  return build('rock', { tint, dark, seed, lichen, lichenAmt }, (u, v, { N }) => {
    const strata = N.fbm(u * 2.2, v * 9, { oct: 4, tile: 0 }) * 0.5 + 0.5;
    const big = N.fbm(u * 3, v * 3, { oct: 5, tile: 3 }) * 0.5 + 0.5;
    const rl = Math.abs(N.fbm(u * 6 + 3, v * 6, { oct: 4, tile: 6 }));
    const crack = smooth(0.05, 0.0, rl) * smooth(0.3, 0.6, big);
    const grit = N.fbm(u * 28, v * 28, { oct: 3, tile: 28 }) * 0.5 + 0.5;
    const l = N.fbm(u * 6 + 4, v * 6 + 9, { oct: 4, tile: 6 }) * 0.5 + 0.5;
    const lich = lichenAmt * smooth(0.62, 0.78, l) * smooth(0.3, 0.7, grit);
    let c = mixc(lo, hi, clamp(0.25 + big * 0.5 + strata * 0.25 + (grit - 0.5) * 0.25));
    c = mixc(c, [c[0] * 0.2, c[1] * 0.2, c[2] * 0.2], crack);
    c = mixc(c, li, lich * 0.7);
    return { h: big * 0.5 + strata * 0.3 + grit * 0.1 - crack * 0.6, c, r: 0.88 - lich * 0.1, ao: 1 - crack * 0.5 };
  }, size);
}

// Dark conifer foliage: dense streaky needles with lighter tips.
export function needleTex({ tint = 0x264636, dark = 0x050c09, light = 0x5a7a68, seed = 5, size = 256 } = {}) {
  const lo = hex(dark); const hi = hex(tint); const li = hex(light);
  return build('needle', { tint, dark, light, seed }, (u, v, { N }) => {
    const s = N.fbm(u * 60, v * 14, { oct: 3 }) * 0.5 + 0.5;
    const s2 = N.n2(u * 130, v * 30, 130, 30) * 0.5 + 0.5;
    const patch = N.fbm(u * 3, v * 3, { oct: 3, tile: 3 }) * 0.5 + 0.5;
    let c = mixc(lo, hi, clamp(0.15 + s * 0.6 + patch * 0.3));
    c = mixc(c, li, smooth(0.7, 1.0, s2 * 0.6 + s * 0.5) * 0.5);
    return { h: s * 0.7 + s2 * 0.3, c, r: 0.85, ao: 0.35 + s * 0.65 };
  }, size);
}

// Straw / reed thatch: long parallel strands.
export function thatchTex({ tint = 0x5a4a2a, dark = 0x1a1208, seed = 7, size = 256 } = {}) {
  const lo = hex(dark); const hi = hex(tint);
  return build('thatch', { tint, dark, seed }, (u, v, { N }) => {
    const s = N.fbm(u * 70, v * 5, { oct: 3 }) * 0.5 + 0.5;
    const bunch = N.fbm(u * 8, v * 4, { oct: 3, tile: 0 }) * 0.5 + 0.5;
    const c = mixc(lo, hi, clamp(0.2 + s * 0.55 + bunch * 0.3));
    return { h: s * 0.6 + bunch * 0.3, c, r: 0.95, ao: 0.5 + s * 0.5 };
  }, size);
}

// Charred timber: black alligator-skin checking with orange glow in the cracks.
export function charTex({ tint = 0x2a2420, dark = 0x050403, ember = 0xff5a10, glow = 0.35, seed = 9, size = 256 } = {}) {
  const lo = hex(dark); const hi = hex(tint); const em = hex(ember);
  return build('char', { tint, dark, ember, glow, seed }, (u, v, { N }) => {
    const grain = N.fbm(u * 5, v * 36, { oct: 4 }) * 0.5 + 0.5;
    const w = N.worley(u * 7, v * 12, 7);
    const check = smooth(0.1, 0.0, w.d2 - w.d1);
    const heat = smooth(0.55, 0.85, N.fbm(u * 3 + 2, v * 3, { oct: 3, tile: 3 }) * 0.5 + 0.5);
    let c = mixc(lo, hi, clamp(0.2 + grain * 0.6 - check * 0.3));
    c = mixc(c, [0.02, 0.01, 0.005], check * 0.7);
    return { h: grain * 0.6 - check * 0.5, c, r: 0.88, ao: 1 - check * 0.5, e: [em[0] * check * heat * glow, em[1] * check * heat * glow, em[2] * check * heat * glow] };
  }, size);
}

// Hide / patchwork leather for goblin tents.
export function hideTex({ tint = 0x6a4a30, dark = 0x1c120a, seed = 11, size = 256 } = {}) {
  const lo = hex(dark); const hi = hex(tint);
  return build('hide', { tint, dark, seed }, (u, v, { N }) => {
    const patch = N.worley(u * 3, v * 3, 3);
    const seam = smooth(0.05, 0.0, patch.d2 - patch.d1);
    const stitch = seam > 0.1 ? (Math.sin(v * 220) > 0.2 ? 0.0 : 0.5) : 0;
    const blot = N.fbm(u * 6, v * 6, { oct: 4, tile: 6 }) * 0.5 + 0.5;
    const hair = N.fbm(u * 50, v * 50, { oct: 2, tile: 50 }) * 0.5 + 0.5;
    const tone = clamp(0.25 + (patch.id / 255) * 0.45 + blot * 0.3 + hair * 0.15);
    let c = mixc(lo, hi, tone);
    c = mixc(c, [0.05, 0.03, 0.02], seam * 0.7 + stitch * 0.3);
    return { h: blot * 0.2 + hair * 0.2 - seam * 0.4, c, r: 0.85, ao: 1 - seam * 0.5 };
  }, size);
}


// Churned soil: clods, fine grit, small embedded stones, trampled ruts. size 512 recommended.
export function soilTex({ tint = 0x5a4632, dark = 0x1a120a, seed = 2, pebble = 0.5, damp = 0.0, size = 512 } = {}) {
  const lo = hex(dark); const hi = hex(tint);
  return build('soil', { tint, dark, seed, pebble, damp }, (u, v, { N }) => {
    const big = N.fbm(u * 3, v * 3, { oct: 5, tile: 3 }) * 0.5 + 0.5;
    const clod = N.worley(u * 14, v * 14, 14);
    const grit = N.fbm(u * 70, v * 70, { oct: 2, tile: 70 }) * 0.5 + 0.5;
    const peb = N.worley(u * 34, v * 34, 34);
    const stone = smooth(0.34, 0.12, peb.d1) * (peb.id > 255 * (1 - pebble * 0.35) ? 1 : 0);
    const cl = smooth(0.0, 0.5, clod.d2 - clod.d1);
    const tone = clamp(0.2 + big * 0.5 + (clod.id / 255 - 0.5) * 0.25 + (grit - 0.5) * 0.3 + cl * 0.12);
    let c = mixc(lo, hi, tone);
    c = mixc(c, [c[0] * 1.25 + 0.04, c[1] * 1.2 + 0.04, c[2] * 1.15 + 0.04], stone * 0.8);
    c = [c[0] * (1 - damp * 0.45), c[1] * (1 - damp * 0.4), c[2] * (1 - damp * 0.35)];
    return { h: big * 0.35 + cl * 0.4 + stone * 0.5 + grit * 0.1, c, r: 0.9 - damp * 0.3 + grit * 0.05, ao: 0.55 + cl * 0.45 };
  }, size);
}

// Powdery ash with wind ripples, thin hairline cracks that glow (emissive) and the odd live ember.
export function ashTex({ tint = 0x4a443e, dark = 0x0c0a09, ember = 0xff5a14, cracks = 0.6, seed = 5, size = 512 } = {}) {
  const lo = hex(dark); const hi = hex(tint); const em = hex(ember);
  return build('ashp', { tint, dark, ember, cracks, seed }, (u, v, { N }) => {
    const big = N.fbm(u * 4, v * 4, { oct: 5, tile: 4 }) * 0.5 + 0.5;
    const rip = Math.sin((v * 26 + N.fbm(u * 5, v * 5, { oct: 3, tile: 5 }) * 5) * Math.PI) * 0.5 + 0.5;
    const grit = N.fbm(u * 60, v * 60, { oct: 2, tile: 60 }) * 0.5 + 0.5;
    const w = N.worley(u * 3, v * 3, 3); const w2 = N.worley(u * 7 + 0.4, v * 7, 7);
    const line = Math.max(smooth(0.03, 0.0, w.d2 - w.d1), smooth(0.022, 0.0, w2.d2 - w2.d1) * 0.7);
    const heat = smooth(0.4, 0.75, N.fbm(u * 5 + 3, v * 5, { oct: 3, tile: 5 }) * 0.5 + 0.5);
    const crack = line * heat * cracks;
    const spark = smooth(0.5, 1.0, N.fbm(u * 90, v * 90, { oct: 2, tile: 90 }) * 0.5 + 0.5) * heat * smooth(0.55, 0.75, big) * 0.6 * cracks;
    const peb = N.worley(u * 40, v * 40, 40); const stone = smooth(0.0, 0.3, peb.d2 - peb.d1) * (peb.id > 215 ? 0.5 : 0.1);
    let c = mixc(lo, hi, clamp(0.12 + big * 0.55 + rip * 0.08 + (grit - 0.5) * 0.25 + stone * 0.2));
    c = mixc(c, [0.015, 0.008, 0.005], crack * 0.9);
    return { h: big * 0.3 + rip * 0.1 + stone * 0.2 - crack * 0.25, c, r: 0.95, ao: 0.8 - crack * 0.4, e: [em[0] * (crack * 0.9 + spark), em[1] * (crack * 0.9 + spark), em[2] * (crack * 0.9 + spark)] };
  }, size);
}

// ---------------------------------------------------------------------------------------------------
// Canvas sprites
// ---------------------------------------------------------------------------------------------------
// A crude crown sigil on cloth: used by goblin-king banners.
export function bannerTex(bg = '#6a1410', fg = '#e0a23a') {
  return canvasTex(`banner|${bg}|${fg}`, 256, (g, s) => {
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    const N = (a) => (Math.sin(a * 91.7) * 43758.5453) % 1;
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + Math.abs(N(i)) * 0.06})`; g.fillRect(Math.abs(N(i + 1)) * s, Math.abs(N(i + 2)) * s, 2 + Math.abs(N(i + 3)) * 10, 1 + Math.abs(N(i + 4)) * 3); }
    g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = s * 0.035; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(s * 0.2, s * 0.68); g.lineTo(s * 0.16, s * 0.32); g.lineTo(s * 0.34, s * 0.5); g.lineTo(s * 0.5, s * 0.24);
    g.lineTo(s * 0.66, s * 0.5); g.lineTo(s * 0.84, s * 0.32); g.lineTo(s * 0.8, s * 0.68); g.closePath(); g.stroke();
    g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
    for (const [x, y] of [[0.16, 0.3], [0.5, 0.22], [0.84, 0.3]]) { g.beginPath(); g.arc(s * x, s * y, s * 0.032, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(s * 0.22, s * 0.78); g.lineTo(s * 0.78, s * 0.78); g.stroke();
    // tatters at the bottom edge
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * s / 9, s); g.lineTo(i * s / 9 + s / 18, s * (0.9 + Math.abs(N(i + 20)) * 0.08)); g.lineTo((i + 1) * s / 9, s); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  });
}
export function plainClothTex(color = '#222') {
  return canvasTex(`cloth|${color}`, 64, (g, s) => { g.fillStyle = color; g.fillRect(0, 0, s, s); });
}
// A small four-point glint for gold / frost sparkle.
export function glintTex() {
  return canvasTex('arena-glint', 64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.15, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,.95)';
    for (const [w, h] of [[1, 0.05], [0.05, 1]]) { g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.5 * w, s * 0.5 * h, 0, 0, Math.PI * 2); g.fill(); }
  });
}

export function texMat(set, { repeat = 1, ...params } = {}) {
  const cl = (t) => { if (!t) return null; const c = t.clone(); c.repeat.set(repeat, repeat); c.needsUpdate = true; return c; };
  const m = new THREE.MeshStandardMaterial({
    map: cl(set.map), normalMap: cl(set.normalMap), roughnessMap: cl(set.ormMap), metalness: 0, roughness: 1, envMapIntensity: 0.6,
    ...params,
  });
  if (set.emissiveMap) { m.emissiveMap = cl(set.emissiveMap); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = params.emissiveIntensity ?? 1; }
  m.normalScale = new THREE.Vector2(1, 1);
  return m;
}
