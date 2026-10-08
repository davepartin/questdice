// The five hero classes. create({ cls, loadout, level, seed, quality }) -> Actor (see docs/GFX.md section 4).
// Body = one skinned rig (shared joint names, L = hero's left = +X) merged into a handful of SkinnedMeshes;
// cloth, weapons, plume and glow are separate meshes with their own motion.
import * as THREE from 'three';
import { Actor } from './base.js';
import { mat } from '../mats.js';
import { sprite } from '../tex.js';
import { WEAPONS, CLASSES } from '../../data.js';
import { createWeapon, createArrow, emblemTexture } from '../weapons.js';
import { lathe, tube, mergeGeometries } from '../util.js';
import { mulberry32 } from '../noise.js';
import {
  loft, merge, tint, shade, X, cylBetween, sph, gemCut, torus, rivets, canvasTex, mirrorGeo, prep, Skinner, limbW, stackW, TAU, D, lerp, clamp, sstep, helix, crystal, plate,
} from './herokit.js';
import { Cloth, solveArm, Sway } from './herocloth.js';
import { buildClips } from './heroclips.js';

const JOINTS_ORDER = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const OFFENSIVE = new Set(['sword', 'longsword', 'dagger', 'spear', 'bow', 'staff', 'fists', 'mace', 'warhammer']);

// ------------------------------------------------------------------------------------------ class specs
const SPEC = {
  knight: { scale: 1.1, W: 1.13, skin: 0xd8a47c, accent: 0xc02a3a, glow: 0xff6a4a, cloth: 0x9a1f2a, cloth2: 0x6a1420, steel: 0xa6aebc, steelDark: 0x626a78, trim: 0xe0b858, leather: 0x3e281a, hair: 0x3a2a1c, eye: 0x4a6a8a },
  ranger: { scale: 1.08, W: 1.0, skin: 0xcf9a74, accent: 0x45e08b, glow: 0x9aff9a, cloth: 0x437a3e, cloth2: 0x2c5030, steel: 0xa8b0b8, steelDark: 0x5a6068, trim: 0xb08a4a, leather: 0x5a3a22, hair: 0x2c1e14, eye: 0x7ad6a0 },
  wizard: { scale: 1.1, W: 0.97, skin: 0xd9ac88, accent: 0x4db4ff, glow: 0x7ac8ff, cloth: 0x2a46a0, cloth2: 0x1a2c68, steel: 0xb8c0d0, steelDark: 0x6a7288, trim: 0xe6c050, leather: 0x4a3020, hair: 0xc8ccd4, eye: 0x4a90d8 },
  dwarf: { scale: 0.9, W: 1.32, skin: 0xcf9470, accent: 0xff8a2a, glow: 0xff7a2a, cloth: 0x4a3626, cloth2: 0x30221a, steel: 0x7a828e, steelDark: 0x3c4048, trim: 0xd08844, leather: 0x4a2e1c, hair: 0xa8541e, eye: 0x6a4a2a },
  bard: { scale: 1.08, W: 0.97, skin: 0xe0b08c, accent: 0x2fd8c8, glow: 0x6af0e0, cloth: 0x1c8c88, cloth2: 0x125a5c, steel: 0xb8bfca, steelDark: 0x6a7280, trim: 0xe8bc48, leather: 0x6a4026, hair: 0x7a3a1e, eye: 0x3a8a6a },
};

// ------------------------------------------------------------------------------------------ materials
const MATS = {};
function mats() {
  if (MATS.cloth) return MATS;
  const vc = { vertexColors: true };
  const W0 = { tint: 0xffffff };
  MATS.cloth = mat('cloth', { ...vc, ...W0, dark: 0xb4b4b4, metalness: 0, repeat: 3 });
  MATS.leather = mat('leather', { ...vc, ...W0, dark: 0x8c8c8c, metalness: 0.05, roughness: 0.85, repeat: 7 });
  MATS.metal = mat('iron', { ...vc, ...W0, color: 0xece8e0, dark: 0xc0c4cc, metalness: 0.74, roughness: 0.55, envMapIntensity: 1.5, repeat: 2.5, normalScale: 0.6 });
  MATS.dark = mat('iron', { ...vc, ...W0, color: 0xd8d6d4, dark: 0x8c8c94, metalness: 0.7, roughness: 0.62, envMapIntensity: 1.4, repeat: 2.5, normalScale: 0.8 });
  MATS.skin = mat('skinHuman', { ...vc, ...W0, dark: 0xf0f0f0, metalness: 0, roughness: 0.78, repeat: 14, normalScale: 0.15 });
  MATS.hair = mat('furDark', { ...vc, ...W0, dark: 0x909090, metalness: 0, roughness: 0.85, repeat: 2 });
  MATS.eye = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 });
  MATS.glow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2.2, vertexColors: false });
  MATS.clothSim = mat('cloth', { ...vc, ...W0, dark: 0xb4b4b4, metalness: 0, repeat: 3, side: THREE.DoubleSide });
  MATS.leatherSim = mat('leather', { ...vc, ...W0, dark: 0x8c8c8c, metalness: 0.05, roughness: 0.85, repeat: 7, side: THREE.DoubleSide });
  return MATS;
}

// ------------------------------------------------------------------------------------------ geometry helpers
const gauss = (x, s) => Math.exp(-(x * x) / (s * s));
function limb(ys, rxs, o = {}) { // loft along -Y local: ys descending from 0
  return loft(ys.map((y, i) => ({ y: -y, rx: rxs[i][0], rz: rxs[i][1] ?? rxs[i][0], ox: rxs[i][2] || 0, oz: rxs[i][3] || 0, n: o.n || 2 })), { N: o.N || 14, capTop: true, capBottom: true });
}
const sphereShell = (r, a0 = 0.55, seg = 16) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6), 0, TAU, 0, Math.PI * a0);

// ------------------------------------------------------------------------------------------ the face
function skullGeo(sp, seg = 40) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); let y = p.getY(i); let z = p.getZ(i);
    const front = z > 0 ? 1 : 0;
    const jt = sstep(0.1, -0.9, y);
    x *= 1 - 0.34 * jt * (sp.jaw ?? 1);
    z *= 1 - 0.1 * jt;
    z += 0.10 * gauss(x, 0.28) * gauss(y + 0.82, 0.16) * front * (sp.chin ?? 1); // chin
    y -= 0.05 * gauss(x, 0.3) * gauss(y + 0.9, 0.12) * front * (sp.chin ?? 1);
    z += 0.06 * gauss(y - 0.30, 0.12) * front * (sp.brow ?? 1) * (0.6 + 0.4 * gauss(x, 0.7)); // brow ridge
    const ex = Math.abs(x) - 0.42;
    z -= 0.075 * gauss(ex, 0.17) * gauss(y - 0.13, 0.14) * front; // eye socket
    x += Math.sign(x) * 0.05 * gauss(Math.abs(x) - 0.62, 0.2) * gauss(y + 0.12, 0.2) * front; // cheek bone
    z += 0.03 * gauss(x, 0.4) * gauss(y + 0.45, 0.12) * front; // mouth muzzle
    p.setXYZ(i, x * 0.084 * (sp.w ?? 1), y * 0.108 + 0.1, z * 0.1);
  }
  g.computeVertexNormals();
  return g;
}
// Builds the head parts and returns { skin, eye, hair } geometry lists in head-local space.
function buildFace(sp, rng) {
  const skinC = new THREE.Color(sp.skin); const out = { skin: [], eye: [], hair: [], glow: [] };
  const skull = skullGeo(sp);
  tint(skull, skinC, (x, y, z) => {
    const eyeD = Math.hypot(Math.abs(x) - 0.035, y - 0.116, z - 0.082);
    let a = 1 - 0.45 * gauss(eyeD, 0.026) - 0.28 * gauss(y - 0.052, 0.012) * (z > 0.06 ? 1 : 0) * gauss(x, 0.03) - 0.25 * sstep(0.03, -0.01, y);
    a *= 0.88 + 0.12 * sstep(-0.02, 0.1, y);
    if (sp.shadowTop) a *= 1 - sp.shadowTop * sstep(0.095, 0.15, y);
    return Math.max(0.35, a);
  });
  // warm the cheeks / lips
  shade(skull, (x, y, z) => 1);
  out.skin.push(skull);
  const ex = 0.034; const ey = 0.116; const ez = 0.075;
  for (const s of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.0158, 14, 10); const iris = X(new THREE.SphereGeometry(0.0098, 12, 8), { s: [1, 1, 0.45], p: [0, 0, 0.0124] });
    const pupil = X(new THREE.SphereGeometry(0.0048, 8, 6), { s: [1, 1, 0.4], p: [0, 0, 0.0145] });
    const glint = X(new THREE.SphereGeometry(0.0026, 6, 4), { p: [0.0035 * s, 0.0035, 0.0158] });
    const e = merge([tint(eye, 0xe8e4dc, (x, y) => 0.8 + 0.2 * y / 0.0138), tint(iris, sp.eye ?? 0x4a6a8a), tint(pupil, 0x08080a), tint(glint, 0xffffff)]);
    out.eye.push(X(e, { p: [s * ex, ey, ez - 0.0005], r: [0, s * 0.12, 0] }));
    // upper lid + lower lid slivers (skin colour) give the eye shape
    const lid = new THREE.SphereGeometry(0.0172, 14, 8, 0, TAU, 0, Math.PI * (0.36 + (sp.lid ?? 0)));
    out.skin.push(tint(X(lid, { p: [s * ex, ey + 0.001, ez - 0.0005], r: [0.25, s * 0.12, 0] }), skinC));
    const lid2 = new THREE.SphereGeometry(0.0172, 14, 8, 0, TAU, Math.PI * 0.8, Math.PI * 0.2);
    out.skin.push(tint(X(lid2, { p: [s * ex, ey - 0.002, ez - 0.0005], r: [0.1, s * 0.12, 0] }), skinC.clone().multiplyScalar(0.96)));
    // brows
    const brow = X(new THREE.CapsuleGeometry(0.0042 * (sp.browT ?? 1), 0.026, 4, 6), { p: [s * (ex + 0.0025), ey + 0.0235, ez + 0.012], r: [0, 0, Math.PI / 2 + s * (sp.browTilt ?? -0.28)], s: [1, 1, 1] });
    out.hair.push(tint(brow, sp.brow ?? sp.hair));
    // ear
    out.skin.push(tint(X(new THREE.SphereGeometry(0.02, 10, 8), { p: [s * 0.083, 0.096, -0.004], s: [0.38, 1.0, 0.65] }), skinC.clone().multiplyScalar(0.92)));
  }
  // nose: bridge + tip + nostril wings
  const nose = [];
  nose.push(X(new THREE.ConeGeometry(0.011, 0.04, 8), { p: [0, 0.098, 0.088], r: [Math.PI * 0.43, 0, 0], s: [1, 1, 0.8 * (sp.nose ?? 1)] }));
  nose.push(X(new THREE.SphereGeometry(0.0098, 10, 8), { p: [0, 0.085, 0.1 + 0.003 * (sp.nose ?? 1)], s: [0.95, 0.9, 1.0] }));
  for (const s of [-1, 1]) nose.push(X(new THREE.SphereGeometry(0.0072, 8, 6), { p: [s * 0.0105, 0.081, 0.095], s: [1, 0.9, 0.9] }));
  out.skin.push(tint(merge(nose), skinC.clone().multiplyScalar(0.97)));
  // mouth: lips + dark line + optional smirk
  const lipC = skinC.clone().lerp(new THREE.Color(0xa04a48), 0.45);
  const sm = sp.smirk ?? 0;
  out.skin.push(tint(X(new THREE.SphereGeometry(0.0125, 10, 6), { p: [0, 0.056, 0.0935], s: [1.65, 0.5, 0.7] }), lipC));
  out.skin.push(tint(X(new THREE.SphereGeometry(0.0125, 10, 6), { p: [0, 0.0475, 0.092], s: [1.5, 0.6, 0.65] }), lipC.clone().multiplyScalar(1.05)));
  out.eye.push(tint(X(new THREE.BoxGeometry(0.03, 0.0013, 0.004), { p: [sm * 0.002, 0.0525, 0.098] }), 0x2a1210));
  if (sm) { out.skin.push(tint(X(new THREE.SphereGeometry(0.004, 6, 4), { p: [0.016 * Math.sign(sm), 0.0545 + Math.abs(sm) * 0.004, 0.0925] }), skinC.clone().multiplyScalar(0.8))); }
  return out;
}

function hairCap(color, { r = [0.092, 0.108, 0.106], p = [0, 0.112, -0.01], a0 = 0.58, fringe = 0.0 } = {}) {
  const g = X(new THREE.SphereGeometry(1, 34, 18, 0, TAU, 0, Math.PI * a0), { s: r, p });
  return tint(g, color, (x, y, z) => 0.7 + 0.3 * sstep(0.02, 0.2, y));
}
function lock(path, r0, r1, color, radial = 6) {
  return tint(tube(path, (t) => lerp(r0, r1, t * t * 0.8 + t * 0.2), { segs: path.length * 5, radial }), color, (x, y) => 0.8);
}

// ------------------------------------------------------------------------------------------ build context
function makeCtx(a, spec, cls, rng) {
  const ctx = { a, spec, cls, rng, W: spec.W, parts: [], tiers: { 1: [], 2: [], 3: [] }, cloth: [], sways: [] };
  return ctx;
}

// ------------------------------------------------------------------------------------------ BODY
const BODYSTACK = [['hips', 0], ['spine', 1.03], ['chest', 1.23], ['neck', 1.56]];
function torsoSecs(W, tune = {}) {
  const k = tune.chest ?? 1; const wst = tune.waist ?? 1;
  return [
    { y: 0.84, rx: 0.15 * W, rz: 0.10, n: 2.3 }, { y: 0.92, rx: 0.175 * W, rz: 0.112 }, { y: 1.0, rx: 0.165 * W * wst, rz: 0.104 }, { y: 1.07, rx: 0.152 * W * wst, rz: 0.098 },
    { y: 1.18, rx: 0.17 * W * k, rz: 0.112 * k }, { y: 1.30, rx: 0.195 * W * k, rz: 0.124 * k }, { y: 1.42, rx: 0.205 * W * k, rz: 0.118 * k, n: 2.4 }, { y: 1.50, rx: 0.17 * W, rz: 0.098 }, { y: 1.55, rx: 0.075, rz: 0.07 },
  ];
}

function addArms(ctx, { sleeve, cuff, glove, sleeveKey = 'cloth', cuffKey = 'leather', gloveKey = 'leather', fat = 1, upperLen = 0.29, lowerLen = 0.27, taperW = 1 }) {
  const { sk, W } = ctx;
  const f = fat * (0.9 + 0.1 * W);
  const up = limb([0, 0.05, 0.15, 0.24, 0.29], [[0.058 * f, 0.058 * f], [0.056 * f], [0.05 * f], [0.046 * f], [0.044 * f]], { N: 14 });
  const lo = limb([0, 0.05, 0.14, 0.22, 0.27], [[0.044 * f], [0.043 * f], [0.04 * f], [0.036 * f], [0.034 * f]], { N: 12 });
  for (const S of ['L', 'R']) {
    sk.add(sleeveKey, tint(up, sleeve, (x, y) => 0.85 + 0.15 * sstep(-0.3, -0.05, y)), `arm${S}`, limbW(`arm${S}`, { parent: 'chest', child: `fore${S}`, len: upperLen, r: 0.04, rp: 0.03 }));
    sk.add(sleeveKey, tint(lo, sleeve), `fore${S}`, limbW(`fore${S}`, { parent: `arm${S}`, child: `hand${S}`, len: lowerLen, r: 0.03, rp: 0.05 }));
    // hand: fist-ish
    const hand = merge([X(sph(0.038, [0, -0.052, 0.004], [1.0, 1.25, 1.0], 12, 9)), X(sph(0.02, [S === 'L' ? -0.028 : 0.028, -0.036, 0.022], [1, 1.5, 1], 8, 6))]);
    sk.add(gloveKey, tint(hand, glove, (x, y) => 0.8 + 0.2 * sstep(-0.1, 0, y)), `hand${S}`, limbW(`hand${S}`, { parent: `fore${S}`, len: 1, r: 0.03 }));
  }
}
function addLegs(ctx, { pants, boots, bootKey = 'leather', pantsKey = 'cloth', bootTop = 0.2, fat = 1 }) {
  const { sk, W } = ctx; const f = fat * (0.92 + 0.08 * W);
  const th = limb([0, 0.08, 0.2, 0.32, 0.43], [[0.092 * f, 0.09 * f], [0.088 * f, 0.085 * f], [0.078 * f], [0.066 * f], [0.057 * f]], { N: 14 });
  const sh = limb([0, 0.06, 0.2, 0.34, 0.43], [[0.056 * f], [0.058 * f, 0.06 * f], [0.05 * f], [0.04 * f], [0.036 * f]], { N: 12 });
  const boot = loft([{ y: 0.0, rx: 0.045, rz: 0.05, oz: 0.0 }, { y: -0.12, rx: 0.05 * f, rz: 0.055 * f }, { y: -0.2, rx: 0.058 * f, rz: 0.06 * f }, { y: -0.3, rx: 0.062 * f, rz: 0.062 * f }, { y: -0.4, rx: 0.058 * f, rz: 0.058 * f }].map((s) => ({ ...s, y: -s.y })), { N: 14 });
  for (const S of ['L', 'R']) {
    const sx = S === 'L' ? 1 : -1;
    sk.add(pantsKey, tint(th, pants), `thigh${S}`, limbW(`thigh${S}`, { parent: 'hips', child: `shin${S}`, len: 0.43, r: 0.045, rp: 0.04 }));
    sk.add(pantsKey, tint(sh, pants), `shin${S}`, limbW(`shin${S}`, { parent: `thigh${S}`, child: `foot${S}`, len: 0.43, r: 0.03, rp: 0.05 }));
    const bt = loft([{ y: 0.0, rx: 0.052 * f, rz: 0.054 * f }, { y: -0.1, rx: 0.056 * f, rz: 0.058 * f }, { y: -0.2, rx: 0.068 * f, rz: 0.07 * f }, { y: -0.3, rx: 0.07 * f, rz: 0.072 * f }].map((s) => ({ ...s, y: s.y + 0.0 })), { N: 14, capTop: true });
    void bt;
    const bootShin = loft([0.0, 0.09, 0.22, 0.34, 0.43].map((d, i) => ({ y: -d, rx: [0.046, 0.05, 0.056, 0.06, 0.056][i] * f, rz: [0.047, 0.052, 0.058, 0.06, 0.058][i] * f })), { N: 14, capTop: true, capBottom: true });
    sk.add(bootKey, tint(X(bootShin, { p: [0, 0, 0] }), boots, (x, y) => 0.75 + 0.25 * sstep(-0.43, -0.2, y)), `shin${S}`, limbW(`shin${S}`, { parent: `thigh${S}`, child: `foot${S}`, len: 0.43, r: 0.03, rp: 0.04 }));
    // foot
    const foot = merge([X(sph(0.062 * f, [0, -0.03, 0.06], [0.9, 0.55, 1.75], 14, 9)), X(sph(0.05 * f, [0, 0.0, -0.0], [1, 0.9, 1.0], 12, 8))]);
    sk.add(bootKey, tint(foot, boots, (x, y) => 0.7 + 0.3 * sstep(-0.08, 0.02, y)), `foot${S}`, limbW(`foot${S}`, { parent: `shin${S}`, len: 1, r: 0.03 }));
  }
}

// belt + buckle + pouches
function addBelt(ctx, { color, buckle, y = 1.02, w = 1, pouches = [] }) {
  const { sk, W } = ctx;
  const belt = loft([{ y: y - 0.03, rx: 0.158 * W + 0.004, rz: 0.108 }, { y: y + 0.03, rx: 0.153 * W + 0.004, rz: 0.104 }], { N: 26, capTop: false });
  sk.addModel('leather', tint(belt, color), stackW(BODYSTACK, 0.06));
  const bk = X(plate([[-0.03, -0.022], [0.03, -0.022], [0.034, 0], [0.03, 0.022], [-0.03, 0.022], [-0.034, 0]], 0.012, 0.003), { p: [0, y, 0.112] });
  sk.addModel('metal', tint(bk, buckle), stackW(BODYSTACK, 0.06));
  for (const pc of pouches) {
    const g = merge([X(new THREE.BoxGeometry(pc.w, pc.h, pc.d), { p: [0, -pc.h / 2, 0] }), X(sph(pc.w * 0.55, [0, -0.002, 0], [1, 0.4, pc.d / pc.w * 0.9], 8, 6))]);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(pc.x, y - 0.02, pc.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pc.ry || 0, 0)), new THREE.Vector3(1, 1, 1));
    const gg = tint(g.clone().applyMatrix4(m), pc.color || 0x4a2e1c);
    sk.addModel('leather', gg, stackW(BODYSTACK, 0.06));
  }
}

// ------------------------------------------------------------------------------------------ per class costumes
function addHead(ctx, hs) { // hs: face spec
  const { sk, spec } = ctx;
  const f = buildFace({ ...hs, skin: spec.skin, hair: hs.hairC ?? spec.hair }, ctx.rng);
  for (const g of f.skin) sk.add('skin', g, 'head');
  for (const g of f.eye) sk.add('eye', g, 'head', null, { uv: 0 });
  for (const g of f.hair) sk.add('hair', g, 'head');
  // neck
  const neck = loft([{ y: -0.03, rx: 0.05, rz: 0.05 }, { y: 0.03, rx: 0.047, rz: 0.048 }, { y: 0.1, rx: 0.045, rz: 0.047 }], { N: 12 });
  sk.add('skin', tint(neck, spec.skin, (x, y) => 0.8 + 0.2 * sstep(-0.03, 0.1, y)), 'neck', (x, y) => [['neck', 1]]);
}


// ---- shared armour / cape builders
function pauldron(ctx, side, { r = 0.11, n = 4, col, col2, trim, tier2 = false }) {
  const { sk } = ctx; const sx = side === 'L' ? 1 : -1; const c = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
  const tilt = { r: [0, 0, -sx * 0.5] };
  for (let i = 0; i < n; i++) {
    const y = 0.07 - i * 0.045; const rad = r * (1 + 0.07 * i);
    const lame = loft([{ y: y + 0.03, rx: rad * 0.9, rz: rad * 0.98, ox: sx * 0.022 }, { y: y - 0.022, rx: rad, rz: rad * 1.04, ox: sx * 0.022 }], { N: 22, ring: { a0: c - 1.75, a1: c + 1.75, open: true }, thick: 0.006 });
    sk.add('metal', tint(X(lame, tilt), i % 2 ? col2 : col, (x, yy) => 0.78 + 0.22 * sstep(y - 0.03, y + 0.03, yy)), `arm${side}`, null);
    sk.add('metal', tint(X(torus(rad * 1.0, 0.0045, 22, 5), { p: [sx * 0.022, y - 0.022, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.04, 1] }).applyMatrix4(new THREE.Matrix4().makeRotationZ(-sx * 0.5)), trim), `arm${side}`, null);
  }
  const dome = X(sphereShell(r * 0.6, 0.3, 14), { p: [sx * 0.02, 0.085, 0], s: [1, 0.5, 1.0] }).applyMatrix4(new THREE.Matrix4().makeRotationZ(-sx * 0.5));
  sk.add('metal', tint(dome, col2), `arm${side}`, null);
  sk.add('metal', tint(rivets([[sx * 0.09, 0.09, 0.02, sx, 1, 0], [sx * 0.07, 0.1, 0.07, 0, 1, 1], [sx * 0.07, 0.1, -0.07, 0, 1, -1]], 0.009), trim), `arm${side}`, null);
  if (tier2) sk.add('2:metal', tint(X(new THREE.ConeGeometry(0.02, 0.1, 8), { p: [sx * (r + 0.03), 0.1, 0], r: [0, 0, -sx * 1.15] }), trim), `arm${side}`, null);
}
function couter(ctx, side, col, trim) {
  const { sk } = ctx; const sx = side === 'L' ? 1 : -1;
  sk.add('metal', tint(X(sph(0.054, [0, 0, 0.0], [1, 1.05, 1], 12, 8)), col), `fore${side}`, null);
  sk.add('metal', tint(X(new THREE.ConeGeometry(0.03, 0.09, 6), { p: [sx * 0.035, 0.0, -0.05], r: [-1.35, 0, -sx * 0.5] }), col), `fore${side}`, null);
  sk.add('metal', tint(X(torus(0.052, 0.005, 14, 5), { p: [0, -0.045, 0], r: [Math.PI / 2, 0, 0] }), trim), `fore${side}`, null);
}
function legArmor(ctx, col, col2, trim, { fat = 1 } = {}) {
  const { sk } = ctx;
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const cu = loft([0.04, 0.12, 0.24, 0.36].map((d, i) => ({ y: -d, rx: [0.108, 0.104, 0.094, 0.082][i] * fat, rz: [0.108, 0.104, 0.096, 0.086][i] * fat })), { N: 18, ring: { a0: -2.7, a1: 2.7, open: true }, thick: 0.006 });
    sk.add('metal', tint(cu, col, (x, y) => 0.72 + 0.28 * sstep(-0.4, -0.05, y)), `thigh${s}`, limbW(`thigh${s}`, { parent: 'hips', child: `shin${s}`, len: 0.43, r: 0.02, rp: 0.03 }));
    for (const d of [0.14, 0.26]) sk.add('metal', tint(X(torus(0.098 * fat - d * 0.1, 0.005, 18, 5), { p: [0, -d, 0], r: [Math.PI / 2, 0, 0] }), trim), `thigh${s}`, null);
    const pol = X(sph(0.066 * fat, [0, -0.43, 0.04], [1.05, 1, 0.8], 14, 9));
    sk.add('metal', tint(pol, col), `thigh${s}`, null);
    sk.add('metal', tint(X(new THREE.ConeGeometry(0.03, 0.08, 6), { p: [sx * 0.075, -0.43, 0.02], r: [0, 0, -sx * 1.5] }), col2), `thigh${s}`, null);
    sk.add('metal', tint(X(torus(0.07 * fat, 0.006, 16, 5), { p: [0, -0.4, 0.0], r: [Math.PI / 2, 0, 0] }), trim), `thigh${s}`, null);
    const gr = loft([0.03, 0.14, 0.27, 0.4].map((d, i) => ({ y: -d, rx: [0.064, 0.074, 0.068, 0.056][i] * fat, rz: [0.07, 0.078, 0.072, 0.06][i] * fat })), { N: 16, ring: { a0: -2.9, a1: 2.9, open: true }, thick: 0.005 });
    sk.add('metal', tint(gr, col, (x, y) => 0.7 + 0.3 * sstep(-0.4, -0.05, y)), `shin${s}`, limbW(`shin${s}`, { parent: `thigh${s}`, child: `foot${s}`, len: 0.43, r: 0.02, rp: 0.02 }));
    sk.add('metal', tint(X(new THREE.BoxGeometry(0.008, 0.3, 0.02), { p: [0, -0.2, 0.075] }), trim), `shin${s}`, null);
    // sabaton: armoured foot with pointed toe and lames
    const sab = merge([X(sph(0.066 * fat, [0, -0.035, 0.07], [0.88, 0.52, 1.8], 14, 9)), X(new THREE.ConeGeometry(0.03, 0.08, 8), { p: [0, -0.04, 0.2], r: [Math.PI / 2, 0, 0] })]);
    sk.add('metal', tint(sab, col2), `foot${s}`, null);
    for (let i = 0; i < 3; i++) sk.add('metal', tint(X(torus(0.052 * fat, 0.005, 12, 5), { p: [0, -0.035, 0.05 + i * 0.045], r: [0, 0, 0], s: [1, 0.7, 1] }), trim), `foot${s}`, null);
  }
}
// two-layer cape with a centre slit: outer halves + a shorter darker underlayer, frayed hems, spring cloth
function capeLayers(ctx, { joint = 'chest', color, color2, len = 0.95, wTop = 0.4, wBot = 0.66, top = 0.2, zBack = -0.14, slit = 0.02, tatter = 0.07, trim }) {
  const { W } = ctx;
  const mk = (sign) => ({ joint, cols: 6, rows: 11, material: MATS.clothSim, tatter, uvScale: [2, 3], stiff: [26, 4.2],
    colorFn: (u, v) => new THREE.Color(color).multiplyScalar(0.62 + 0.38 * (1 - v) * (0.9 + 0.1 * Math.sin(u * 22))).lerp(new THREE.Color(trim || color), v > 0.95 ? 0.7 : 0),
    restFn: (u, v) => { const half = (wTop + (wBot - wTop) * v) * W * 0.5; const x = sign * (slit * (0.3 + v) + u * half); return [x, top - v * len, zBack - 0.06 * v + (0.07 * Math.sin(u * 8 + sign + v * 1.5) + 0.03 * Math.sin(u * 21 + v * 4)) * (0.15 + v) - 0.03 * Math.abs(u - 0.3) * (1 - v)]; } });
  ctx.cloth.push(mk(1), mk(-1));
  ctx.cloth.push({ joint, cols: 8, rows: 9, material: MATS.clothSim, tatter: tatter * 0.8, uvScale: [2, 3], stiff: [30, 6],
    colorFn: (u, v) => new THREE.Color(color2).multiplyScalar(0.55 + 0.35 * (1 - v)),
    restFn: (u, v) => [(u - 0.5) * (wTop * 0.85 + (wBot - wTop) * 0.6 * v) * W, top - 0.02 - v * len * 0.82, zBack + 0.035 - 0.035 * v] });
}

function costumeKnight(ctx) {
  const { sk, spec, W } = ctx; const S = spec;
  const steel = S.steel; const dk = S.steelDark; const trim = S.trim;
  addLegs(ctx, { pants: 0x25272e, boots: 0x30333b, bootKey: 'dark', pantsKey: 'cloth', fat: 1.12 });
  legArmor(ctx, steel, dk, trim, { fat: 1.08 });
  // gambeson body under the plates
  const body = loft(torsoSecs(W, { chest: 1.0 }), { N: 26, capBottom: true, capTop: true });
  sk.addModel('cloth', tint(body, 0x2a2a32, (x, y) => 0.8 + 0.2 * sstep(0.85, 1.3, y)), stackW(BODYSTACK, 0.07));
  // stepped cuirass: pectoral plate, three belly lames, fauld
  const pecSecs = [{ y: 1.22, rx: 0.2 * W, rz: 0.134 }, { y: 1.32, rx: 0.226 * W, rz: 0.15 }, { y: 1.42, rx: 0.215 * W, rz: 0.14 }, { y: 1.5, rx: 0.17 * W, rz: 0.108 }].map((q) => ({ ...q, rx: q.rx + 0.012, rz: q.rz + 0.016, n: 2.5 }));
  const pec = loft(pecSecs, { N: 24, ring: { a0: -2.0, a1: 2.0, open: true }, thick: 0.008 });
  sk.addModel('metal', tint(pec, steel, (x, y, z) => (0.7 + 0.3 * sstep(1.2, 1.45, y)) * (0.85 + 0.15 * sstep(-0.2, 0.2, z))), stackW(BODYSTACK, 0.05));
  const keel = loft([{ y: 1.22, rx: 0.006, rz: 0.004, oz: 0.15 }, { y: 1.32, rx: 0.013, rz: 0.008, oz: 0.172 }, { y: 1.44, rx: 0.008, rz: 0.005, oz: 0.15 }], { N: 6, capTop: true, capBottom: true });
  sk.addModel('metal', tint(keel, trim), stackW(BODYSTACK, 0.05));
  for (let i = 0; i < 3; i++) {
    const y0 = 1.2 - i * 0.07; const k = 0.012 * i;
    const lm = loft([{ y: y0 + 0.045, rx: (0.19 + 0.0 * i) * W + 0.012 + k, rz: 0.128 + 0.012 + k }, { y: y0 - 0.03, rx: 0.2 * W + 0.02 + k, rz: 0.136 + 0.02 + k }], { N: 22, ring: { a0: -2.4, a1: 2.4, open: true }, thick: 0.006 });
    sk.addModel('metal', tint(lm, i % 2 ? dk : steel, (x, y) => 0.8 + 0.2 * sstep(y0 - 0.03, y0 + 0.04, y)), stackW(BODYSTACK, 0.04));
    sk.addModel('metal', tint(X(torus(0.2 * W + 0.02 + k, 0.004, 24, 5), { p: [0, y0 - 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.68 + 0.0, 1] }), trim), stackW(BODYSTACK, 0.04));
  }
  for (let i = 0; i < 3; i++) {
    const y = 0.99 - i * 0.05;
    const f = loft([{ y: y + 0.03, rx: (0.168 + i * 0.016) * W, rz: 0.114 + i * 0.014 }, { y: y - 0.024, rx: (0.186 + i * 0.016) * W, rz: 0.128 + i * 0.014 }], { N: 24, thick: 0.005 });
    sk.addModel('metal', tint(f, i % 2 ? dk : steel, (x, yy) => 0.78 + 0.2 * sstep(y - 0.024, y + 0.03, yy)), stackW([['hips', 0], ['spine', 1.03]], 0.05));
  }
  // back plate: two plates + spine ridge + straps
  const backP = loft(pecSecs.map((q) => ({ ...q })), { N: 22, ring: { a0: Math.PI - 1.35, a1: Math.PI + 1.35, open: true }, thick: 0.007 });
  sk.addModel('metal', tint(backP, dk, (x, y) => 0.7 + 0.3 * sstep(1.2, 1.45, y)), stackW(BODYSTACK, 0.05));
  for (let i = 0; i < 3; i++) { const y0 = 1.17 - i * 0.07; sk.addModel('metal', tint(loft([{ y: y0 + 0.045, rx: 0.19 * W + 0.014, rz: 0.13 + 0.012 }, { y: y0 - 0.03, rx: 0.2 * W + 0.022, rz: 0.14 + 0.02 }], { N: 20, ring: { a0: Math.PI - 1.5, a1: Math.PI + 1.5, open: true }, thick: 0.006 }), i % 2 ? steel : dk), stackW(BODYSTACK, 0.04)); }
  sk.addModel('metal', tint(loft([{ y: 1.0, rx: 0.008, rz: 0.006, oz: -0.14 }, { y: 1.3, rx: 0.012, rz: 0.008, oz: -0.168 }, { y: 1.46, rx: 0.008, rz: 0.006, oz: -0.14 }], { N: 6, capTop: true, capBottom: true }), trim), stackW(BODYSTACK, 0.05));
  for (const sd of [-1, 1]) sk.addModel('leather', tint(tube([[sd * 0.16 * W, 1.42, -0.06], [sd * 0.06, 1.28, -0.17], [-sd * 0.05, 1.08, -0.15], [-sd * 0.15 * W, 0.98, -0.07]], 0.016, { segs: 16, radial: 5 }), S.leather), stackW(BODYSTACK, 0.05));
  sk.addModel('metal', tint(X(new THREE.BoxGeometry(0.04, 0.03, 0.012), { p: [0, 1.2, -0.168] }), trim), stackW(BODYSTACK, 0.05));
  // gorget: stacked collar lames
  for (let i = 0; i < 3; i++) { const y = 1.5 + i * 0.03; sk.addModel('metal', tint(loft([{ y: y - 0.02, rx: (0.115 - i * 0.012) * W, rz: 0.092 - i * 0.008 }, { y: y + 0.02, rx: (0.105 - i * 0.012) * W, rz: 0.085 - i * 0.008 }], { N: 20, thick: 0.005 }), i % 2 ? dk : steel), stackW(BODYSTACK, 0.04)); }
  sk.addModel('metal', tint(X(torus(0.112 * W, 0.006, 22, 5), { p: [0, 1.495, 0], r: [Math.PI / 2, 0, 0] }), trim), stackW(BODYSTACK, 0.04));
  addBelt(ctx, { color: S.leather, buckle: trim, y: 0.98, pouches: [{ x: -0.17 * W, z: 0.03, w: 0.06, h: 0.07, d: 0.04, ry: -1.4 }, { x: -0.06, z: -0.13, w: 0.1, h: 0.06, d: 0.04, ry: 3.14 }] });
  addArms(ctx, { sleeve: 0x30323c, glove: 0x3a3d48, sleeveKey: 'dark', gloveKey: 'dark', fat: 1.18 });
  for (const s of ['L', 'R']) {
    const vamb = loft([0.04, 0.1, 0.18, 0.25].map((d, i) => ({ y: -d, rx: [0.058, 0.056, 0.05, 0.044][i] + 0.006, rz: [0.058, 0.056, 0.05, 0.044][i] + 0.006 })), { N: 14, thick: 0.004 });
    sk.add('metal', tint(vamb, steel, (x, y) => 0.7 + 0.3 * sstep(-0.25, -0.04, y)), `fore${s}`, limbW(`fore${s}`, { parent: `arm${s}`, child: `hand${s}`, len: 0.27, r: 0.01, rp: 0.01 }));
    sk.add('metal', tint(X(torus(0.052, 0.005, 14, 5), { p: [0, -0.26, 0], r: [Math.PI / 2, 0, 0] }), trim), `fore${s}`, null);
    sk.add('dark', tint(X(sph(0.05, [0, -0.07, 0.02], [1, 1.5, 1.1], 10, 8), {}), steel), `hand${s}`, null);
    couter(ctx, s, steel, trim);
    pauldron(ctx, s, { r: 0.118, n: 4, col: steel, col2: dk, trim, tier2: true });
    sk.add('metal', tint(loft([0.1, 0.2, 0.27].map((d, i) => ({ y: -d, rx: 0.062 - i * 0.004, rz: 0.062 - i * 0.004 })), { N: 14, thick: 0.004 }), dk), `arm${s}`, limbW(`arm${s}`, { parent: 'chest', child: `fore${s}`, len: 0.29, r: 0.01, rp: 0.01 }));
  }
  addHead(ctx, { jaw: 1.1, chin: 1.0, brow: 1.1, nose: 1.0, eye: S.eye, browTilt: -0.3 });
  // great helm with glowing slit, tall crest and a big plume
  const helmSecs = [-0.02, 0.03, 0.09, 0.15, 0.2, 0.24, 0.272].map((y, i) => ({ y, rx: [0.1, 0.108, 0.115, 0.117, 0.11, 0.09, 0.04][i], rz: [0.108, 0.118, 0.126, 0.128, 0.121, 0.1, 0.044][i], n: 2.2, oz: -0.008 }));
  const helm = loft(helmSecs, { N: 28, capTop: true, thick: 0.004 });
  sk.add('metal', tint(helm, steel, (x, y, z) => 0.66 + 0.34 * sstep(0.0, 0.22, y) * (0.85 + 0.15 * sstep(-0.1, 0.1, z))), 'head', null);
  sk.add('metal', tint(loft([{ y: 0.04, rx: 0.008, rz: 0.13, oz: -0.008 }, { y: 0.16, rx: 0.016, rz: 0.142, oz: -0.01 }, { y: 0.3, rx: 0.012, rz: 0.07, oz: -0.014 }, { y: 0.34, rx: 0.004, rz: 0.03, oz: -0.016 }], { N: 6 }), trim), 'head', null);
  sk.add('metal', tint(X(new THREE.BoxGeometry(0.225, 0.018, 0.022), { p: [0, 0.148, 0.112], r: [0.15, 0, 0] }), dk), 'head', null);
  sk.add('metal', tint(X(new THREE.BoxGeometry(0.014, 0.12, 0.014), { p: [0, 0.09, 0.126] }), dk), 'head', null);
  sk.add('glow', X(new THREE.BoxGeometry(0.14, 0.014, 0.012), { p: [0, 0.118, 0.12] }), 'head', null, { uv: 0 });
  const vents = []; for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) vents.push(X(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 6), { p: [sd * 0.072, 0.03 + i * 0.012, 0.1], r: [Math.PI / 2, 0, 0] }));
  sk.add('dark', tint(merge(vents), 0x050505), 'head', null);
  sk.add('metal', tint(rivets([[0.098, 0.14, 0.04, 1, 0, 0.3], [-0.098, 0.14, 0.04, -1, 0, 0.3], [0.0, 0.2, 0.09, 0, 1, 0.4]], 0.008), trim), 'head', null);
  const plume = [];
  for (let i = 0; i < 13; i++) { const sw = (i - 6) * 0.011; const L = 1 + Math.abs(i - 6) * -0.04; plume.push(tint(tube([[sw * 0.5, 0.0, 0], [sw, 0.09, -0.05], [sw * 1.4, 0.1, -0.16], [sw * 1.8, 0.0, -0.3 * L], [sw * 2.1, -0.18, -0.38 * L], [sw * 2.2, -0.34, -0.4 * L]], (t) => 0.018 * (1 - t * 0.7), { segs: 16, radial: 5 }), i % 2 ? S.cloth : S.cloth2)); }
  sk.add('cloth', merge(plume), 'plume', null);
  ctx.sways.push(['head', ['plume'], { gain: 1.6, wind: 0.05 }]);
  // tabard (emblem) front/back, knee-length two-layer cape
  const em = emblemTexture('crown', { a: '#9a1f2a', b: '#f0d070', c: '#1a1210' });
  const tabMat = new THREE.MeshStandardMaterial({ map: em, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, vertexColors: true });
  const fold = (u, v) => 0.014 * Math.sin(u * 14 + v * 2.5) * (0.3 + v);
  ctx.cloth.push({ joint: 'hips', cols: 8, rows: 8, material: tabMat, uvScale: [1, 1], restFn: (u, v) => [(u - 0.5) * (0.28 + 0.06 * v) * W, 0.07 - v * 0.64, 0.17 + 0.03 * v + fold(u, v)], stiff: [40, 8] });
  ctx.cloth.push({ joint: 'hips', cols: 6, rows: 8, material: MATS.clothSim, colorFn: () => new THREE.Color(S.cloth2), uvScale: [2, 3], restFn: (u, v) => [(u - 0.5) * (0.28 + 0.05 * v) * W, 0.07 - v * 0.58, -0.15 - 0.03 * v + fold(u, v)], stiff: [40, 8] });
  capeLayers(ctx, { color: S.cloth, color2: S.cloth2, len: 1.0, wTop: 0.42, wBot: 0.7, top: 0.2, zBack: -0.185, trim: S.trim });
  sk.addModel('metal', tint(X(torus(0.075, 0.008, 12, 5), { p: [0.0, 1.47, -0.115] }), trim), stackW(BODYSTACK, 0.04));
  sk.addModel('2:metal', tint(X(torus(0.125, 0.007, 20, 6), { p: [0, 1.53, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 1, 0.9] }), trim), stackW(BODYSTACK, 0.05));
  return { weaponScaleHint: 1 };
}

function costumeRanger(ctx) {
  const { sk, spec, W } = ctx; const S = spec;
  addLegs(ctx, { pants: 0x3a3226, boots: 0x4a3020, fat: 0.96 });
  const body = loft(torsoSecs(W, { chest: 1.0 }), { N: 26, capBottom: true, capTop: true });
  sk.addModel('leather', tint(body, S.leather, (x, y) => 0.8 + 0.2 * sstep(0.85, 1.3, y)), stackW(BODYSTACK, 0.07));
  // jerkin with studded straps and green tunic hem
  const hem = loft([{ y: 0.78, rx: 0.19 * W, rz: 0.13 }, { y: 0.9, rx: 0.172 * W, rz: 0.115 }, { y: 1.0, rx: 0.164 * W, rz: 0.107 }], { N: 26, thick: 0.004 });
  sk.addModel('cloth', tint(hem, S.cloth, (x, y) => 0.6 + 0.4 * sstep(0.78, 1.0, y)), stackW([['hips', 0], ['spine', 1.03]], 0.06));
  for (const s of [-1, 1]) {
    const strap = loft([{ y: 1.05, rx: 0.012, rz: 0.02, ox: s * 0.12 * W, oz: 0.1 }, { y: 1.25, rx: 0.012, rz: 0.02, ox: s * 0.04 * W, oz: 0.135 }, { y: 1.42, rx: 0.012, rz: 0.02, ox: -s * 0.1 * W, oz: 0.12 }], { N: 8, uv: [1, 1] });
    sk.addModel('leather', tint(strap, 0x2a1a10), stackW(BODYSTACK, 0.05));
  }
  addBelt(ctx, { color: 0x2a1a10, buckle: S.trim, y: 1.02, pouches: [{ x: -0.15 * W, z: 0.04, w: 0.06, h: 0.07, d: 0.04, ry: -1.0 }, { x: 0.14 * W, z: 0.05, w: 0.05, h: 0.06, d: 0.035, ry: 0.9, color: 0x3a2414 }, { x: -0.04, z: -0.12, w: 0.1, h: 0.06, d: 0.04, ry: 3.14 }] });
  addArms(ctx, { sleeve: S.cloth, glove: 0x4a3020, sleeveKey: 'cloth', gloveKey: 'leather' });
  for (const s of ['L', 'R']) { // bracers
    const br = loft([0.08, 0.14, 0.2, 0.26].map((d, i) => ({ y: -d, rx: 0.044 - i * 0.003 + 0.005, rz: 0.044 - i * 0.003 + 0.005 })), { N: 14, thick: 0.004 });
    sk.add('leather', tint(br, 0x5a3a22, (x, y) => 0.7 + 0.3 * sstep(-0.26, -0.08, y)), `fore${s}`, limbW(`fore${s}`, { parent: `arm${s}`, child: `hand${s}`, len: 0.27, r: 0.01, rp: 0.01 }));
    for (const d of [0.12, 0.2]) sk.add('metal', tint(X(torus(0.046, 0.003, 14, 5), { p: [0, -d, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
    const sx = s === 'L' ? 1 : -1;
    sk.add('leather', tint(X(sphereShell(0.085, 0.55, 14), { p: [sx * 0.012, 0.03, 0], s: [1.1, 0.7, 1.0], r: [0, 0, sx * -0.4] }), 0x3a2a1a), `arm${s}`, null);
  }
  addHead(ctx, { jaw: 1.0, chin: 1.0, brow: 1.2, nose: 1.05, eye: S.eye, browTilt: -0.35, smirk: 0.5, shadowTop: 0.55 });
  // hood: deep, casting shadow on the upper face
  const hood = loft([-0.05, 0.02, 0.1, 0.17, 0.23, 0.275, 0.29].map((y, i) => ({ y, rx: [0.115, 0.122, 0.128, 0.126, 0.112, 0.082, 0.04][i], rz: [0.125, 0.14, 0.15, 0.148, 0.13, 0.1, 0.05][i], oz: [-0.02, -0.025, -0.03, -0.03, -0.03, -0.03, -0.03][i], n: 2.2 })), { N: 28, ring: { a0: 0.9, a1: TAU - 0.9, open: true }, thick: 0.004 });
  sk.add('cloth', tint(hood, S.cloth, (x, y, z) => 0.5 + 0.5 * sstep(-0.05, 0.28, y)), 'head', null);
  const peak = loft([{ y: 0.25, rx: 0.1, rz: 0.12, oz: -0.01 }, { y: 0.19, rx: 0.108, rz: 0.142, oz: 0.0 }, { y: 0.15, rx: 0.1, rz: 0.146, oz: 0.004 }], { N: 22, ring: { a0: -1.25, a1: 1.25, open: true }, thick: 0.004 });
  sk.add('cloth', tint(peak, S.cloth2, (x, y) => 0.45 + 0.55 * sstep(0.15, 0.25, y)), 'head', null);
  // eyes glint
  for (const s of [-1, 1]) sk.add('glow', X(new THREE.SphereGeometry(0.0035, 6, 4), { p: [s * 0.034, 0.118, 0.0905] }), 'head', null, { uv: 0 });
  // lower-face scarf
  const scarf = loft([{ y: -0.02, rx: 0.09, rz: 0.1 }, { y: 0.02, rx: 0.105, rz: 0.112 }, { y: 0.045, rx: 0.1, rz: 0.108 }], { N: 20, ring: { a0: 1.2, a1: TAU - 1.2, open: true }, thick: 0.004 });
  sk.add('cloth', tint(scarf, S.cloth2), 'head', null);
  // collar shoulders mantle
  const mantle = loft([{ y: 1.52, rx: 0.16 * W, rz: 0.12 }, { y: 1.45, rx: 0.24 * W, rz: 0.15 }, { y: 1.36, rx: 0.255 * W, rz: 0.158 }], { N: 26, thick: 0.004 });
  sk.addModel('cloth', tint(mantle, S.cloth, (x, y) => 0.55 + 0.45 * sstep(1.36, 1.52, y)), stackW(BODYSTACK, 0.06));
  // quiver on the back with fletched arrows
  const quiver = loft([{ y: -0.26, rx: 0.045, rz: 0.04 }, { y: -0.1, rx: 0.056, rz: 0.05 }, { y: 0.14, rx: 0.062, rz: 0.055 }], { N: 14, capBottom: true, thick: 0.004 });
  const q = new THREE.Matrix4().compose(new THREE.Vector3(-0.03, 1.28, -0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, -0.35)), new THREE.Vector3(1, 1, 1));
  sk.addModel('leather', tint(quiver.clone().applyMatrix4(q), 0x4a2e1a, (x, y) => 0.7 + 0.3 * sstep(1.0, 1.4, y)), stackW(BODYSTACK, 0.05));
  const arrows = [];
  const ar = ctx.rng;
  for (let i = 0; i < 7; i++) { const ax = (ar() - 0.5) * 0.06; const az = (ar() - 0.5) * 0.05; const g = merge([tint(cylBetween([ax, 0.1, az], [ax * 1.4, 0.34 + ar() * 0.08, az * 1.4], 0.0035, 0.0035, 5), 0xc8a070), tint(X(new THREE.BoxGeometry(0.02, 0.07, 0.003), { p: [ax * 1.4, 0.3 + ar() * 0.07, az * 1.4], r: [0, ar() * 3, 0] }), i % 3 ? 0xd8d0b8 : 0xb42a2a)]); arrows.push(g.clone().applyMatrix4(q)); }
  sk.addModel('cloth', merge(arrows), stackW(BODYSTACK, 0.05));
  sk.addModel('leather', tint(X(new THREE.BoxGeometry(0.05, 0.006, 0.012), { p: [0, 1.0, 0] }), 0x2a1a10), stackW(BODYSTACK, 0.05));
  const strapQ = tint(tube([[0.1, 1.46, -0.04], [0.0, 1.3, -0.14], [-0.14, 1.06, -0.08]], 0.014, { segs: 14, radial: 4 }), 0x2a1a10);
  sk.addModel('leather', strapQ, stackW(BODYSTACK, 0.05));
  // cloaks: long tattered cloak + shoulder cape
  capeLayers(ctx, { color: S.cloth, color2: S.cloth2, len: 1.15, wTop: 0.44, wBot: 0.8, top: 0.2, zBack: -0.19, tatter: 0.12, trim: S.cloth2 });
  ctx.cloth.push({ joint: 'chest', cols: 10, rows: 5, material: MATS.clothSim, tatter: 0.05, colorFn: (u, v) => new THREE.Color(S.cloth2).multiplyScalar(0.8 + 0.2 * (1 - v)), uvScale: [3, 1.5], restFn: (u, v) => [(u - 0.5) * (0.44 + 0.2 * v) * W, 0.24 - v * 0.42, -0.095 - 0.12 * (1 - Math.abs(u - 0.5) * 2) * 0.0 - 0.06 * v], stiff: [30, 6] });
  for (const s of ['L', 'R']) sk.add('2:leather', tint(X(sph(0.035, [0, 0.04, 0.0], [1.2, 0.7, 1.2], 8, 6)), S.trim), `arm${s}`, null);
}

function costumeWizard(ctx) {
  const { sk, spec, W } = ctx; const S = spec;
  addLegs(ctx, { pants: S.cloth2, boots: 0x3a2a1c, fat: 0.94 });
  const body = loft(torsoSecs(W, { chest: 0.98 }), { N: 26, capBottom: true, capTop: true });
  sk.addModel('cloth', tint(body, S.cloth, (x, y) => 0.75 + 0.25 * sstep(0.85, 1.3, y)), stackW(BODYSTACK, 0.07));
  // gold-embroidered trim bands (canvas)
  const trimTex = canvasTex('wiz-trim', 128, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e6b840'; g.fillStyle = '#e6b840'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const y = i * 64 + 32; g.beginPath(); g.arc(w / 2, y, 14, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(w / 2, y - 22); g.lineTo(w / 2 + 6, y); g.lineTo(w / 2, y + 22); g.lineTo(w / 2 - 6, y); g.closePath(); g.fill(); }
  }, { repeat: false });
  void trimTex;
  // robe skirt (static flare skinned to hips/thighs) + cloth sim hem
  const skirtSecs = [{ y: 1.02, rx: 0.16 * W, rz: 0.112 }, { y: 0.9, rx: 0.19 * W, rz: 0.14 }, { y: 0.7, rx: 0.2 * W, rz: 0.155 }, { y: 0.55, rx: 0.2 * W, rz: 0.158 }];
  sk.addModel('cloth', tint(loft(skirtSecs, { N: 26, thick: 0.004 }), S.cloth, (x, y) => 0.6 + 0.4 * sstep(0.55, 1.0, y)), stackW([['hips', 0], ['spine', 1.03]], 0.06));
  ctx.cloth.push({ joint: 'hips', cols: 18, rows: 7, material: MATS.clothSim, tatter: 0.0, colorFn: (u, v) => new THREE.Color(S.cloth).multiplyScalar(0.6 + 0.4 * (1 - v)).lerp(new THREE.Color(S.trim), v > 0.94 ? 0.9 : 0), uvScale: [6, 3], restFn: (u, v) => { const a = u * TAU + Math.PI / 2; const R = 0.2 * W + 0.06 * v; return [Math.cos(a) * R * 1.05, -0.06 - v * 0.8, Math.sin(a) * R * 0.95 * (0.82)]; }, stiff: [34, 8] });
  // sash belt with potions and scrolls
  addBelt(ctx, { color: 0x6a4020, buckle: S.trim, y: 1.03, pouches: [{ x: 0.15 * W, z: 0.04, w: 0.05, h: 0.05, d: 0.04, ry: 0.9 }] });
  for (let i = 0; i < 3; i++) {
    const x = -0.17 * W + i * 0.04; const flask = lathe([[0, 0], [0.016, 0.004], [0.02, 0.025], [0.012, 0.045], [0.007, 0.06], [0.009, 0.075], [0, 0.075]], 10);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.98, 0.085 - i * 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0.1 * i)), new THREE.Vector3(1, 1, 1));
    sk.addModel('glow', flask.clone().applyMatrix4(m), stackW(BODYSTACK, 0.05), { uv: 0 });
  }
  sk.addModel('cloth', tint(X(cylBetween([0.15, 0.93, 0.0], [0.17, 0.99, -0.1], 0.02, 0.02, 8)), 0xe8dcc0), stackW(BODYSTACK, 0.05));
  // wide sleeves
  addArms(ctx, { sleeve: S.cloth, glove: S.skin, sleeveKey: 'cloth', gloveKey: 'skin', fat: 1.0 });
  for (const s of ['L', 'R']) {
    const cuff = loft([0.12, 0.2, 0.27].map((d, i) => ({ y: -d, rx: 0.06 + i * 0.03, rz: 0.06 + i * 0.03 })), { N: 16, thick: 0.004 });
    void 0;
    sk.add('cloth', tint(cuff, S.cloth2, (x, y) => 0.6 + 0.4 * sstep(-0.27, -0.1, y)), `fore${s}`, limbW(`fore${s}`, { parent: `arm${s}`, len: 0.27, r: 0.02, rp: 0.02 }));
    sk.add('metal', tint(X(torus(0.122, 0.005, 18, 5), { p: [0, -0.27, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
    sk.add('metal', tint(X(torus(0.097, 0.005, 18, 5), { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
  }
  // mantle with gold collar
  const mantle = loft([{ y: 1.53, rx: 0.12 * W, rz: 0.1 }, { y: 1.46, rx: 0.22 * W, rz: 0.14 }, { y: 1.36, rx: 0.24 * W, rz: 0.15 }], { N: 26, thick: 0.004 });
  sk.addModel('cloth', tint(mantle, S.cloth2), stackW(BODYSTACK, 0.06));
  sk.addModel('metal', tint(X(torus(0.235 * W, 0.006, 26, 5), { p: [0, 1.365, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.66, 1] }), S.trim), stackW(BODYSTACK, 0.06));
  // face + beard + hat
  addHead(ctx, { jaw: 0.95, chin: 0.9, brow: 1.3, nose: 1.25, eye: S.eye, browTilt: 0.18, browT: 1.9, hairC: 0xd8dce2, lid: 0.04 });
  const hairC = 0xc8ccd4; const rng = ctx.rng;
  const hair = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; if (Math.cos(a) > 0.55) continue; const R = 0.088; hair.push(lock([[Math.sin(a) * R, 0.15, Math.cos(a) * R - 0.02], [Math.sin(a) * (R + 0.012), 0.08, Math.cos(a) * (R + 0.012) - 0.03], [Math.sin(a) * (R + 0.01), 0.0, Math.cos(a) * (R + 0.01) - 0.035], [Math.sin(a) * (R + 0.02), -0.08 - rng() * 0.05, Math.cos(a) * (R + 0.01) - 0.04]], 0.014, 0.004, hairC)); }
  sk.add('hair', merge(hair), 'head');
  const beard = [];
  for (let i = 0; i < 26; i++) {
    const t = i / 25; const sx = (t - 0.5) * 2; const x0 = sx * 0.06; const len = 0.28 + (1 - Math.abs(sx)) * 0.2 + rng() * 0.05;
    beard.push(lock([[x0, 0.062 - Math.abs(sx) * 0.02, 0.085 - Math.abs(sx) * 0.03], [x0 * 1.1, 0.0, 0.1], [x0 * 0.8 + (rng() - 0.5) * 0.02, -len * 0.45, 0.115], [x0 * 0.5 + (rng() - 0.5) * 0.04, -len, 0.105 + (rng() - 0.5) * 0.02]], 0.017, 0.003, rng() > 0.5 ? hairC : 0xa8acb6, 5));
  }
  sk.add('hair', merge(beard), 'head');
  // mustache
  for (const s of [-1, 1]) sk.add('hair', lock([[s * 0.004, 0.06, 0.1], [s * 0.025, 0.052, 0.105], [s * 0.05, 0.042, 0.1], [s * 0.065, 0.025, 0.09]], 0.011, 0.003, hairC), 'head');
  // pointed wide-brim hat
  const hatMat = 'cloth';
  const brim = loft([{ y: 0.2, rx: 0.15, rz: 0.15 }, { y: 0.215, rx: 0.26, rz: 0.26 }, { y: 0.2, rx: 0.3, rz: 0.3 }, { y: 0.19, rx: 0.3, rz: 0.3 }], { N: 34, thick: 0.004 });
  const bp = brim.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); const z = bp.getZ(i); const r = Math.hypot(x, z); bp.setY(i, bp.getY(i) + (r > 0.14 ? 0.02 * Math.sin(Math.atan2(z, x) * 3) * (r - 0.14) * 3 - (r - 0.14) * 0.15 * (z < 0 ? -0.8 : 0.6) : 0)); }
  brim.computeVertexNormals();
  sk.add(hatMat, tint(brim, S.cloth2, (x, y) => 0.8), 'head', null);
  const cone = loft([0.195, 0.24, 0.31, 0.4, 0.5, 0.58].map((y, i) => ({ y, rx: [0.105, 0.095, 0.075, 0.05, 0.028, 0.008][i], rz: [0.112, 0.1, 0.08, 0.053, 0.03, 0.008][i], ox: [0, 0, 0, 0.01, 0.03, 0.065][i] * 0, oz: [0, 0, -0.01, -0.03, -0.07, -0.13][i] })), { N: 22, thick: 0.004 });
  sk.add(hatMat, tint(cone, S.cloth, (x, y) => 0.6 + 0.4 * sstep(0.2, 0.55, y)), 'head', null);
  sk.add('metal', tint(X(torus(0.105, 0.012, 24, 6), { p: [0, 0.225, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.1, 1] }), S.trim), 'head', null);
  sk.add('metal', tint(X(sph(0.016, [0, 0.225, 0.115], [1, 1, 0.6], 10, 8)), S.trim), 'head', null);
  // tier 2: star embroidery shoulder discs
  for (const s of ['L', 'R']) sk.add('2:metal', tint(X(sph(0.04, [0, 0.05, 0.0], [1, 0.6, 1], 10, 8)), S.trim), `arm${s}`, null);
}

function costumeDwarf(ctx) {
  const { sk, spec, W } = ctx; const S = spec;
  addLegs(ctx, { pants: 0x3a2a1e, boots: 0x2a2018, fat: 1.18, bootKey: 'leather' });
  for (const s of ['L', 'R']) {
    const gr = loft([0.05, 0.16, 0.3, 0.41].map((d, i) => ({ y: -d, rx: [0.066, 0.08, 0.075, 0.062][i] + 0.004, rz: [0.07, 0.085, 0.078, 0.066][i] + 0.004 })), { N: 14, ring: { a0: -2.6, a1: 2.6, open: true }, thick: 0.004 });
    sk.add('dark', tint(gr, S.steel, (x, y) => 0.6 + 0.4 * sstep(-0.4, -0.05, y)), `shin${s}`, limbW(`shin${s}`, { parent: `thigh${s}`, child: `foot${s}`, len: 0.43, r: 0.02, rp: 0.02 }));
    sk.add('dark', tint(X(sph(0.07, [0, -0.43, 0.04], [1, 0.9, 0.8], 12, 8)), S.steel), `thigh${s}`, null);
  }
  legArmor(ctx, S.steel, S.steelDark, S.trim, { fat: 1.2 });
  const body = loft(torsoSecs(W, { chest: 1.02, waist: 1.05 }), { N: 28, capBottom: true, capTop: true });
  sk.addModel('dark', tint(body, 0x40434c, (x, y) => 0.7 + 0.3 * sstep(0.85, 1.3, y)), stackW(BODYSTACK, 0.07));
  const chestSecs = [{ y: 1.04, rx: 0.17 * W, rz: 0.113 }, { y: 1.14, rx: 0.19 * W, rz: 0.128 }, { y: 1.26, rx: 0.215 * W, rz: 0.14 }, { y: 1.38, rx: 0.226 * W, rz: 0.138 }, { y: 1.47, rx: 0.2 * W, rz: 0.115 }].map((s) => ({ ...s, rx: s.rx + 0.012, rz: s.rz + 0.014, n: 2.6 }));
  const plate = loft(chestSecs, { N: 24, ring: { a0: -2.2, a1: 2.2, open: true }, thick: 0.008 });
  sk.addModel('dark', tint(plate, S.steel, (x, y, z) => (0.6 + 0.4 * sstep(1.0, 1.4, y)) * (0.8 + 0.2 * sstep(-0.3, 0.3, z))), stackW(BODYSTACK, 0.05));
  // rune plate on chest (emissive) + copper trim
  const runeTex = emblemTexture('hammer', { a: '#2a2c33', b: '#ff9a3a', c: '#000' });
  void runeTex;
  sk.addModel('glow', X(new THREE.TorusGeometry(0.045, 0.004, 5, 20), { p: [0, 1.3, 0.172 * 1.0], s: [1, 1, 0.5] }), stackW(BODYSTACK, 0.05), { uv: 0 });
  const rn = []; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; rn.push(cylBetween([Math.cos(a) * 0.015, 1.3 + Math.sin(a) * 0.015, 0.176], [Math.cos(a) * 0.04, 1.3 + Math.sin(a) * 0.04, 0.176], 0.0035, 0.0035, 5)); }
  sk.addModel('glow', merge(rn), stackW(BODYSTACK, 0.05), { uv: 0 });
  for (const y of [1.12, 1.46]) sk.addModel('metal', tint(X(torus(0.19 * W + 0.01, 0.007, 28, 5), { p: [0, y, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.76 * (0.12 / 0.12), 1] }), S.trim), stackW(BODYSTACK, 0.05));
  const rvt = []; for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 3.0; rvt.push([Math.sin(a) * 0.222 * W, 1.38 + (i % 2) * 0.0, Math.cos(a) * 0.155, Math.sin(a), 0, Math.cos(a)]); }
  sk.addModel('metal', tint(rivets(rvt, 0.01), S.trim), stackW(BODYSTACK, 0.05));
  // wide belt with big buckle and a hammer hung at the hip
  addBelt(ctx, { color: 0x2c1c10, buckle: S.trim, y: 1.0, pouches: [{ x: 0.17 * W, z: 0.02, w: 0.07, h: 0.08, d: 0.05, ry: 1.3 }] });
  const hm = merge([tint(cylBetween([0, 0, 0], [0, 0.36, 0], 0.016, 0.014, 8), 0x5a3a22), tint(X(new THREE.BoxGeometry(0.05, 0.1, 0.08), { p: [0, 0.38, 0] }), S.steel), tint(X(new THREE.BoxGeometry(0.03, 0.04, 0.06), { p: [0, 0.46, 0] }), S.trim)]);
  const hq = new THREE.Matrix4().compose(new THREE.Vector3(-0.2 * W, 0.84, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0.12)), new THREE.Vector3(1, 1, 1));
  sk.addModel('dark', hm.clone().applyMatrix4(hq), stackW(BODYSTACK, 0.05));
  addArms(ctx, { sleeve: 0x3e4048, glove: 0x4a2e1c, sleeveKey: 'dark', gloveKey: 'leather', fat: 1.3 });
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const vamb = loft([0.04, 0.1, 0.18, 0.25].map((d, i) => ({ y: -d, rx: [0.062, 0.062, 0.056, 0.05][i] + 0.006, rz: [0.062, 0.062, 0.056, 0.05][i] + 0.006 })), { N: 14, thick: 0.005 });
    sk.add('dark', tint(vamb, S.steel, (x, y) => 0.65 + 0.35 * sstep(-0.25, -0.04, y)), `fore${s}`, limbW(`fore${s}`, { parent: `arm${s}`, child: `hand${s}`, len: 0.27, r: 0.01, rp: 0.01 }));
    sk.add('metal', tint(X(torus(0.064, 0.006, 16, 5), { p: [0, -0.04, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
    pauldron(ctx, s, { r: 0.15, n: 4, col: S.steel, col2: S.steelDark, trim: S.trim });
    couter(ctx, s, S.steel, S.trim);
    sk.add('metal', tint(rivets([[sx * 0.11, 0.1, 0.0, sx, 1, 0], [sx * 0.07, 0.12, 0.07, 0, 1, 1], [sx * 0.07, 0.12, -0.07, 0, 1, -1]], 0.012), S.trim), `arm${s}`, null);
    // spikes on tier 2
    sk.add('2:metal', tint(X(new THREE.ConeGeometry(0.022, 0.1, 8), { p: [sx * 0.14, 0.11, 0], r: [0, 0, -sx * 1.15] }), S.trim), `arm${s}`, null);
  }
  addHead(ctx, { jaw: 1.25, chin: 0.8, brow: 1.5, nose: 1.5, w: 1.12, eye: S.eye, browTilt: -0.5, browT: 2.2, hairC: S.hair, smirk: -0.4, lid: 0.04 });
  // great helm: open-faced with nose guard, horns
  const helm = loft([0.165, 0.19, 0.215, 0.245, 0.28, 0.295].map((y, i) => ({ y, rx: [0.118, 0.12, 0.116, 0.108, 0.08, 0.03][i], rz: [0.13, 0.133, 0.128, 0.12, 0.09, 0.034][i], oz: -0.01 })), { N: 28, ring: { a0: 0.0, a1: TAU }, capTop: true, thick: 0.005 });
  sk.add('dark', tint(helm, S.steel, (x, y, z) => 0.6 + 0.4 * sstep(0.14, 0.27, y)), 'head', null);
  const rear = loft([0.0, 0.06, 0.12, 0.165].map((y, i) => ({ y, rx: [0.108, 0.114, 0.118, 0.12][i], rz: [0.116, 0.124, 0.13, 0.13][i], oz: -0.01 })), { N: 22, ring: { a0: 1.45, a1: TAU - 1.45, open: true }, thick: 0.005 });
  sk.add('dark', tint(rear, S.steelDark), 'head', null);
  for (const s of [-1, 1]) sk.add('dark', tint(X(new THREE.BoxGeometry(0.01, 0.075, 0.07), { p: [s * 0.105, 0.085, 0.045], r: [0, 0, s * 0.1] }), S.steelDark), 'head', null);
  const open = X(new THREE.BoxGeometry(0.15, 0.08, 0.05), { p: [0, 0.07, 0.11] }); void open;
    sk.add('metal', tint(X(torus(0.117, 0.01, 26, 6), { p: [0, 0.165, -0.008], r: [Math.PI / 2, 0, 0], s: [1, 1.1, 1] }), S.trim), 'head', null);
  for (const s of [-1, 1]) {
    sk.add('metal', tint(tube([[s * 0.1, 0.2, 0], [s * 0.19, 0.22, 0.01], [s * 0.25, 0.3, 0.04], [s * 0.22, 0.38, 0.07]], (t) => 0.026 * (1 - t * 0.85), { segs: 18, radial: 8 }), 0xe0d8c0, (x, y) => 0.8 + 0.2 * sstep(0.2, 0.38, y)), 'head', null);
    sk.add('metal', tint(X(torus(0.027, 0.005, 12, 5), { p: [s * 0.14, 0.205, 0.0], r: [0, Math.PI / 2, 0] }), S.trim), 'head', null);
  }
  const rv = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; rv.push([Math.sin(a) * 0.122, 0.165, Math.cos(a) * 0.134 - 0.008, Math.sin(a), 0, Math.cos(a)]); }
  sk.add('metal', tint(rivets(rv, 0.008), S.trim), 'head', null);
  // huge braided beard with metal rings
  const rng = ctx.rng; const bc = S.hair; const beard = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 39; const sx = (t - 0.5) * 2; const x0 = sx * 0.075; const len = 0.34 + (1 - Math.abs(sx)) * 0.16 + rng() * 0.05;
    beard.push(lock([[x0, 0.07 - Math.abs(sx) * 0.03, 0.08], [x0 * 1.3, 0.0, 0.13], [x0 * 1.25 + (rng() - 0.5) * 0.02, -len * 0.5, 0.15], [x0 * 0.8 + (rng() - 0.5) * 0.03, -len, 0.12]], 0.02, 0.004, [bc, 0xc86a2a, 0x8a3a14][i % 3], 5));
  }
  sk.add('hair', merge(beard), 'head');
  for (const s of [-1, 1]) {
    const bp = [[s * 0.035, 0.0, 0.14], [s * 0.04, -0.1, 0.16], [s * 0.03, -0.2, 0.165], [s * 0.03, -0.33, 0.15], [s * 0.025, -0.44, 0.13]];
    const tb = [];
    for (let k = 0; k < 22; k++) { const u = k / 21; const c = new THREE.CatmullRomCurve3(bp.map((p) => new THREE.Vector3(...p))).getPoint(u); tb.push(tint(X(sph(0.018 * (1 - u * 0.4), [0, 0, 0], [1, 0.9, 1], 8, 6), { p: [c.x + Math.sin(k * 1.4) * 0.007, c.y, c.z] }), [bc, 0xc86a2a][k % 2])); }
    sk.add('hair', merge(tb), 'head');
    for (const u of [0.35, 0.65, 0.95]) { const c = new THREE.CatmullRomCurve3(bp.map((p) => new THREE.Vector3(...p))).getPoint(u); sk.add('metal', tint(X(torus(0.021, 0.005, 12, 5), { p: [c.x, c.y, c.z], r: [Math.PI / 2, 0, 0] }), S.trim), 'head', null); }
  }
  for (const sd of [-1, 1]) sk.add('hair', lock([[sd * 0.004, 0.066, 0.105], [sd * 0.035, 0.062, 0.115], [sd * 0.07, 0.05, 0.11], [sd * 0.085, 0.01, 0.1], [sd * 0.08, -0.06, 0.11]], 0.02, 0.006, bc), 'head');
  // leather apron (cloth)
  ctx.cloth.push({ joint: 'hips', cols: 6, rows: 6, material: MATS.leatherSim, colorFn: () => new THREE.Color(S.leather), uvScale: [2, 2], restFn: (u, v) => [(u - 0.5) * 0.3 * W, 0.06 - v * 0.42, 0.13 * (W * 0.9) + 0.02 * v], stiff: [40, 10] });
  capeLayers(ctx, { color: S.cloth, color2: S.cloth2, len: 0.8, wTop: 0.44, wBot: 0.62, top: 0.18, zBack: -0.2 * W * 0.8, trim: S.trim });
}

function costumeBard(ctx) {
  const { sk, spec, W } = ctx; const S = spec;
  addLegs(ctx, { pants: 0x4a2030, boots: 0x6a3a22, bootKey: 'leather', fat: 0.95 });
  const body = loft(torsoSecs(W, { chest: 0.98, waist: 0.92 }), { N: 26, capBottom: true, capTop: true });
  sk.addModel('cloth', tint(body, S.cloth, (x, y) => 0.8 + 0.2 * sstep(0.85, 1.3, y)), stackW(BODYSTACK, 0.07));
  // gold-trimmed jerkin with peplum tails
  const pep = loft([{ y: 1.0, rx: 0.157 * W, rz: 0.104 }, { y: 0.92, rx: 0.19 * W, rz: 0.135 }, { y: 0.8, rx: 0.2 * W, rz: 0.148 }], { N: 28, thick: 0.004 });
  const pp = pep.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getX(i), pp.getZ(i)); pp.setY(i, pp.getY(i) - Math.max(0, 0.04 * Math.cos(a * 4.0)) * sstep(1.0, 0.8, pp.getY(i))); } pep.computeVertexNormals();
  sk.addModel('cloth', tint(pep, S.cloth2, (x, y) => 0.6 + 0.4 * sstep(0.78, 1.0, y)), stackW([['hips', 0], ['spine', 1.03]], 0.06));
  for (const y of [0.8]) sk.addModel('metal', tint(X(torus(0.2 * W, 0.005, 28, 5), { p: [0, y + 0.0, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.74, 1] }), S.trim), stackW([['hips', 0]], 0.06));
  // diagonal gold lacing on chest
  for (let i = 0; i < 6; i++) { const y = 1.08 + i * 0.05; sk.addModel('metal', tint(cylBetween([-0.07 * W, y, 0.12], [0.07 * W, y + 0.02, 0.12], 0.003, 0.003, 5), S.trim), stackW(BODYSTACK, 0.05)); }
  for (const s of [-1, 1]) sk.addModel('metal', tint(cylBetween([s * 0.075 * W, 1.05, 0.118], [s * 0.075 * W, 1.38, 0.13], 0.005, 0.005, 6), S.trim), stackW(BODYSTACK, 0.05));
  addBelt(ctx, { color: 0x4a2a16, buckle: S.trim, y: 1.03, pouches: [{ x: 0.15 * W, z: 0.04, w: 0.05, h: 0.06, d: 0.04, ry: 0.9, color: 0x5a3a22 }] });
  // dagger sheath at hip
  sk.addModel('leather', tint(X(cylBetween([0, 0, 0], [0, -0.26, 0.0], 0.02, 0.012, 8)), 0x3a2216).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(-0.17 * W, 0.98, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0.25)), new THREE.Vector3(1, 1, 1))), stackW(BODYSTACK, 0.05));
  addArms(ctx, { sleeve: S.cloth, glove: 0x5a3a22, sleeveKey: 'cloth', gloveKey: 'leather', fat: 0.98 });
  for (const s of ['L', 'R']) {
    const slv = loft([0.04, 0.1, 0.2, 0.28].map((d, i) => ({ y: -d, rx: 0.056 + [0, 0.012, 0.016, 0.006][i], rz: 0.056 + [0, 0.012, 0.016, 0.006][i] })), { N: 14, thick: 0.004 });
    sk.add('cloth', tint(slv, S.cloth2, (x, y) => 0.7 + 0.3 * sstep(-0.3, -0.04, y)), `arm${s}`, limbW(`arm${s}`, { parent: 'chest', child: `fore${s}`, len: 0.29, r: 0.02, rp: 0.02 }));
    sk.add('metal', tint(X(torus(0.052, 0.005, 14, 5), { p: [0, -0.14, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
    const cf = loft([0.06, 0.1, 0.16, 0.22].map((d, i) => ({ y: -d, rx: [0.05, 0.05, 0.043, 0.038][i] + 0.004, rz: [0.05, 0.05, 0.043, 0.038][i] + 0.004 })), { N: 14, thick: 0.004 });
    sk.add('leather', tint(cf, 0x6a4026), `fore${s}`, limbW(`fore${s}`, { parent: `arm${s}`, child: `hand${s}`, len: 0.27, r: 0.01, rp: 0.01 }));
    sk.add('cloth', tint(X(sph(0.07, [0, 0.03, 0.0], [1.15, 0.7, 1.1], 12, 8)), S.cloth2), `arm${s}`, null);
  }
  addHead(ctx, { jaw: 0.9, chin: 0.9, brow: 0.8, nose: 0.85, eye: S.eye, browTilt: 0.12, hairC: S.hair, smirk: 0.8, lid: 0.02 });
  // hair: swept back, shoulder-length
  const rng = ctx.rng; sk.add('hair', hairCap(S.hair, { a0: 0.6 }), 'head');
  const locks = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; if (Math.cos(a) > 0.6) continue; const R = 0.09; locks.push(lock([[Math.sin(a) * R, 0.16, Math.cos(a) * R * 0.9 - 0.03], [Math.sin(a) * (R + 0.015), 0.08, Math.cos(a) * R - 0.04], [Math.sin(a) * (R + 0.02), 0.0, Math.cos(a) * R - 0.05], [Math.sin(a) * (R + 0.03), -0.07 - rng() * 0.04, Math.cos(a) * R - 0.06]], 0.016, 0.005, S.hair)); }
  sk.add('hair', merge(locks), 'head');
  sk.add('hair', lock([[-0.04, 0.2, 0.06], [-0.07, 0.17, 0.09], [-0.085, 0.14, 0.085]], 0.014, 0.004, S.hair), 'head');
  // goatee + moustache
  sk.add('hair', lock([[0, 0.032, 0.095], [0, 0.0, 0.1], [0, -0.03, 0.095]], 0.012, 0.004, S.hair), 'head');
  for (const s of [-1, 1]) sk.add('hair', lock([[s * 0.004, 0.062, 0.1], [s * 0.025, 0.06, 0.103], [s * 0.045, 0.052, 0.097], [s * 0.052, 0.036, 0.09]], 0.007, 0.0025, S.hair), 'head');
  // feathered cap
  const cap = loft([0.15, 0.185, 0.22, 0.245].map((y, i) => ({ y, rx: [0.097, 0.092, 0.075, 0.04][i], rz: [0.11, 0.108, 0.09, 0.05][i], oz: -0.01 })), { N: 24, capTop: true, thick: 0.004 });
  sk.add('cloth', tint(cap, S.cloth2, (x, y) => 0.7 + 0.3 * sstep(0.15, 0.24, y)), 'head', null);
  const brim = loft([{ y: 0.15, rx: 0.1, rz: 0.115 }, { y: 0.158, rx: 0.14, rz: 0.15, oz: 0.01 }, { y: 0.17, rx: 0.15, rz: 0.158, oz: 0.015 }], { N: 24, ring: { a0: -2.7, a1: 2.7, open: true }, thick: 0.004 });
  sk.add('cloth', tint(brim, S.cloth), 'head', null);
  sk.add('metal', tint(X(new THREE.BoxGeometry(0.02, 0.014, 0.006), { p: [0.07, 0.185, 0.07], r: [0, 0.7, 0] }), S.trim), 'head', null);
  // long red feather on its own chain
  const feather = []; const fp = [[0, 0, 0], [0.02, 0.07, -0.04], [0.04, 0.11, -0.12], [0.03, 0.08, -0.2], [0.02, 0.0, -0.26]];
  feather.push(tint(tube(fp, 0.0025, { segs: 20, radial: 4 }), 0xeee4d0));
  for (let i = 0; i < 18; i++) { const t = 0.1 + i / 18 * 0.85; const c = new THREE.CatmullRomCurve3(fp.map((p) => new THREE.Vector3(...p))).getPoint(t); const sd = i % 2 ? 1 : -1; feather.push(tint(X(new THREE.ConeGeometry(0.008, 0.07 * (1 - Math.abs(t - 0.45) * 0.7), 5), { p: [c.x + sd * 0.025, c.y, c.z], r: [0, 0, sd * 1.35 + 0.3] }), i % 3 ? 0xe8503a : 0xf0e0c0)); }
  sk.add('cloth', merge(feather), 'plume', null);
  ctx.sways.push(['head', ['plume'], { gain: 1.2, wind: 0.05 }]);
  // lute on the back: body, neck, pegs, strings
  const bodyL = lathe([[0, -0.18], [0.07, -0.16], [0.125, -0.09], [0.14, 0.0], [0.12, 0.08], [0.07, 0.14], [0.03, 0.17], [0, 0.17]], 28);
  const lq = new THREE.Matrix4().compose(new THREE.Vector3(-0.0, 1.15, -0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0.55)), new THREE.Vector3(1, 0.55, 1.0).set(1, 1, 0.55));
  const lute = [];
  lute.push(tint(bodyL, 0x9a5a28, (x, y) => 0.65 + 0.35 * sstep(-0.18, 0.15, y)));
  lute.push(tint(X(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 18), { p: [0, 0.02, 0.1 * 0.55], r: [Math.PI / 2, 0, 0], s: [1, 1, 1] }), 0x1a0e08));
  lute.push(tint(X(box0(0.034, 0.34, 0.022), { p: [0, 0.34, 0.0] }), 0x3a2216));
  lute.push(tint(X(box0(0.05, 0.1, 0.03), { p: [0, 0.54, -0.01], r: [0.0, 0, 0] }), 0x2a1810));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) lute.push(tint(X(cylBetween([s * 0.025, 0.52 + i * 0.03, -0.005], [s * 0.055, 0.52 + i * 0.03, -0.005], 0.005, 0.005, 6), {}), S.trim));
  const lg = merge(lute); lg.applyMatrix4(lq);
  sk.addModel('leather', lg, stackW(BODYSTACK, 0.05));
  for (let i = 0; i < 4; i++) sk.addModel('metal', tint(cylBetween([0, 0, 0], [0, 0.0, 0], 0.001, 0.001, 3), S.trim).applyMatrix4(lq), stackW(BODYSTACK, 0.05));
  sk.addModel('leather', tint(tube([[0.1, 1.46, -0.03], [0.0, 1.32, -0.13], [-0.13, 1.1, -0.1]], 0.016, { segs: 14, radial: 5 }), 0x3a2216), stackW(BODYSTACK, 0.05));
  // flowing cape
  capeLayers(ctx, { color: S.cloth2, color2: S.cloth, len: 1.0, wTop: 0.4, wBot: 0.72, top: 0.2, zBack: -0.2, tatter: 0.05, trim: S.trim });
  for (const s of ['L', 'R']) sk.add('2:metal', tint(X(torus(0.052, 0.005, 14, 5), { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0] }), S.trim), `fore${s}`, null);
}
function box0(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

const COSTUME = { knight: costumeKnight, ranger: costumeRanger, wizard: costumeWizard, dwarf: costumeDwarf, bard: costumeBard };

// ------------------------------------------------------------------------------------------ the actor
export function create({ cls = 'knight', loadout, level = 1, seed = 1, quality = 'high' } = {}) {
  if (!SPEC[cls]) cls = 'knight';
  const spec = SPEC[cls]; const M = mats();
  const rng = mulberry32(seed * 7919 + cls.length);
  const a = new Actor({ name: `hero-${cls}`, height: 1.8 * spec.scale, radius: 0.5 * Math.max(1, spec.W * 0.9) });
  const W = spec.W;
  // ---- skeleton
  const J = (n, p, x, y, z) => a.joint(n, p, x, y, z);
  const hips = J('hips', a.model, 0, 0.93, 0); const spine = J('spine', hips, 0, 0.1, 0); const chest = J('chest', spine, 0, 0.2, 0);
  const neck = J('neck', chest, 0, 0.3, 0); const head = J('head', neck, 0, 0.07, 0);
  for (const S of ['L', 'R']) {
    const sx = S === 'L' ? 1 : -1;
    const arm = J(`arm${S}`, chest, sx * 0.205 * W, 0.22, 0); const fore = J(`fore${S}`, arm, 0, -0.29, 0); J(`hand${S}`, fore, 0, -0.27, 0);
    arm.rotation.z = sx * 0.1; fore.rotation.x = -0.12;
    const th = J(`thigh${S}`, hips, sx * 0.095 * W, -0.06, 0); const sh = J(`shin${S}`, th, 0, -0.43, 0); J(`foot${S}`, sh, 0, -0.43, 0);
  }
  const extras = [];
  if (cls === 'knight' || cls === 'bard') { J('plume', head, 0, cls === 'knight' ? 0.26 : 0.2, cls === 'knight' ? -0.02 : -0.05); extras.push('plume'); }
  a.root.updateMatrixWorld(true);
  const ctx = makeCtx(a, spec, cls, rng);
  const names = [...JOINTS_ORDER, ...extras];
  ctx.sk = new Skinner(a, names);
  // tier routing: keys like '2:metal' are tier-2 parts
  const addOrig = ctx.sk.add.bind(ctx.sk); const addModelOrig = ctx.sk.addModel.bind(ctx.sk);
  ctx.sk.add = (key, geo, joint, w, o) => addOrig(/^\d:/.test(key) ? key : `1:${key}`, geo, joint ?? 'chest', w, o);
  ctx.sk.addModel = (key, geo, w, o) => addModelOrig(/^\d:/.test(key) ? key : `1:${key}`, geo, w, o);
  COSTUME[cls](ctx);
  // ---- meshes
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: spec.glow, emissiveIntensity: 2.0 });
  const built = ctx.sk.build((key) => { const m = key.split(':')[1]; return m === 'glow' ? glowMat : M[m]; }, a.model);
  for (const [k, mesh] of Object.entries(built)) { const tier = +k[0]; (ctx.tiers[tier] ||= []).push(mesh); }
  // ---- cloth
  const cloths = ctx.cloth.map((c, i) => new Cloth(a, { seed: seed + i * 17, parent: a.model, ...c, material: c.material }));
  // ---- anchors
  const shTex = canvasTex('hero-blob', 128, 128, (g, w, hh) => { const r = g.createRadialGradient(w / 2, hh / 2, 4, w / 2, hh / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.55, 'rgba(0,0,0,0.38)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5 * Math.max(1, W * 0.9), 1.2 * Math.max(1, W * 0.9)), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  blob.rotation.x = -Math.PI / 2; blob.position.set(0, 0.012, -0.05); blob.renderOrder = 1; blob.userData.noActorClone = true; a.root.add(blob); a.userData.blob = blob;
  a.anchor('head', head, 0, 0.36, 0); a.anchor('chest', chest, 0, 0.08, 0.16); a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', head, 0, 0.055, 0.1); a.anchor('handL', a.joints.handL, 0, -0.06, 0); a.anchor('handR', a.joints.handR, 0, -0.06, 0);
  a.anchor('weapon', a.model, 0, 1.2, 0.5); a.anchor('staffTip', a.model, 0, 1.8, 0.2);
  // ---- hands: grip sockets, flask
  const grip = {};
  for (const S of ['L', 'R']) { const g = new THREE.Group(); g.position.set(0, -0.055, 0); g.rotation.x = Math.PI / 2; a.joints[`hand${S}`].add(g); grip[S] = g; }
  const flask = new THREE.Mesh(lathe([[0, 0], [0.022, 0.004], [0.028, 0.03], [0.016, 0.06], [0.01, 0.085], [0.013, 0.1], [0, 0.1]], 12), new THREE.MeshStandardMaterial({ color: 0x331122, emissive: 0x55e07a, emissiveIntensity: 1.6, roughness: 0.2 }));
  flask.rotation.x = -Math.PI / 2; flask.position.set(0, 0.0, 0.0); flask.visible = false; grip.R.add(flask); a.userData.flask = flask;
  a.userData.ikT = { L: 0, R: 0 }; const ik = { L: 0, R: 0 };
  a.userData.cls = cls; a.userData.spec = spec;
  // ---- state
  const S = { level: 0, loadout: null, weapons: [], info: null, orbLight: null };
  a.userData.state = S;
  // glow light for wizard staff
  if (cls === 'wizard') { const l = new THREE.PointLight(0x5aa8ff, 3.2, 6, 1.6); l.castShadow = false; a.model.add(l); S.orbLight = l; }

  const defLoad = () => { const w = CLASSES[cls].weapons; return w.length === 1 ? { NW: { id: w[0], rarity: 0 }, NE: { id: w[0], rarity: 0 } } : { NW: { id: w[0], rarity: 0 }, NE: { id: w[1], rarity: 0 } }; };

  const adoptCache = new Map();
  function adopt(obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const swap = (m) => {
        if (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial) return m;
        if (!adoptCache.has(m)) { const c = m.clone(); c.userData = { ...m.userData, base: m }; if (c.emissive) { c.userData.emissive0 = c.emissive.clone(); c.userData.emissiveI0 = c.emissiveIntensity; } a._hookDissolve(c); adoptCache.set(m, c); a.mats.push(c); }
        return adoptCache.get(m);
      };
      o.material = swap(o.material);
    });
  }
  function clearWeapons() { for (const w of S.weapons) { w.parent?.remove(w); w.userData.dispose?.(); } S.weapons = []; a.userData.bow = a.userData.staff = a.userData.arrow = null; }
  function mountWeapons(lo) {
    clearWeapons();
    const nw = lo.NW; const ne = lo.NE; const two = WEAPONS[nw.id].hands === 2;
    const opts = { quality, style: cls === 'dwarf' ? 'round' : 'heater', emblem: cls === 'knight' ? 'crown' : cls === 'dwarf' ? 'rune' : undefined, accent: spec.accent };
    const place = (w, side, id) => {
      if (id === 'shield') w.scale.setScalar(cls === 'dwarf' ? 1.1 : 1.3);
      if (id === 'tower') w.scale.setScalar(1.15);
      if (id === 'bracer') { const fore = a.joints[`fore${side}`]; w.rotation.y = side === 'L' ? Math.PI / 2 : -Math.PI / 2; w.position.set(0, -0.16, 0); fore.add(w); }
      else grip[side].add(w);
      S.weapons.push(w);
    };
    if (two) {
      const fam = nw.id; const side = fam === 'bow' ? 'L' : 'R';
      const w = createWeapon(nw.id, nw.rarity | 0, opts); place(w, side, nw.id);
      if (fam === 'bow') { a.userData.bow = w; const arrow = createArrow(nw.rarity | 0); arrow.rotation.set(0, 0, 0); w.userData.nock.add(arrow); arrow.visible = false; a.userData.arrow = arrow; w.userData.setDraw(0); }
      if (fam === 'staff') { a.userData.staff = w; }
      S.main = w; S.mainSide = side;
    } else {
      const wl = createWeapon(nw.id, nw.rarity | 0, opts); place(wl, 'L', nw.id);
      const wr = createWeapon(ne.id, ne.rarity | 0, opts); place(wr, 'R', ne.id);
      S.mainL = wl; S.mainR = wr;
    }
    for (const w of S.weapons) adopt(w);
    a.mats = a.mats.filter((m, i, arr) => arr.indexOf(m) === i);
    // attack info
    const info = { shield: false, twoHand: two };
    if (two) { info.fam = nw.id; info.A = nw.id === 'bow' ? 'L' : 'R'; info.offIK = nw.id === 'staff' || nw.id === 'longsword' || nw.id === 'warhammer'; }
    else {
      const offs = [['L', nw], ['R', ne]].filter(([, w]) => OFFENSIVE.has(w.id));
      info.A = offs.length ? offs[0][0] : 'L'; info.fam = offs.length ? offs[0][1].id : 'fists';
      info.shield = ['shield', 'tower'].includes(nw.id) || ['shield', 'tower'].includes(ne.id);
    }
    info.O = info.A === 'L' ? 'R' : 'L';
    S.info = info;
    const cur = a.animator?.name;
    a.clips = buildClips(a, info);
    if (a.animator) { a.animator.clips = a.clips; if (cur && a.clips[cur]) a.animator.play(cur, { fade: 0.0, restart: true }); }
    // weapon anchor: tip of the offensive weapon
    const offW = two ? S.main : (info.A === 'L' ? S.mainL : S.mainR);
    const tip = offW?.userData.tip; if (tip) { a.anchors.weapon.removeFromParent(); tip.add(a.anchors.weapon); a.anchors.weapon.position.set(0, 0, 0); }
    if (a.userData.staff) { const t = a.userData.staff.userData.tip; a.anchors.staffTip.removeFromParent(); t.add(a.anchors.staffTip); a.anchors.staffTip.position.set(0, 0, 0); if (S.orbLight) { S.orbLight.removeFromParent(); t.add(S.orbLight); S.orbLight.position.set(0, 0, 0); } }
    S.loadout = lo;
  }
  a.setLoadout = (lo) => { mountWeapons({ NW: { ...(lo?.NW || defLoad().NW) }, NE: { ...(lo?.NE || defLoad().NE) } }); };
  a.setLevel = (n) => { S.level = n; ctx.tiers[1]?.forEach((m) => { m.visible = true; }); ctx.tiers[2]?.forEach((m) => { m.visible = n >= 5; }); ctx.tiers[3]?.forEach((m) => { m.visible = n >= 10; }); a.userData.level = n; };
  a.setLevel(level);
  // ---- sway chains
  const sways = ctx.sways.map(([anchor, nm, o]) => new Sway(a, anchor, nm, o));
  // ---- finalize with default clips so the animator exists, then mount weapons
  a.clips = { idle: { loop: true, dur: 1, fn: () => {} } };
  a.finalize();
  a.setLoadout(loadout || defLoad());
  a.animator.play('idle', { fade: 0, restart: true });
  a.model.scale.setScalar(spec.scale);
  a.root.updateMatrixWorld(true);
  const s = spec.scale;
  // ---- per frame
  const eyeBlink = { t: 2 + rng() * 3 };
  const tmp = new THREE.Vector3();
  a.onUpdate = (dt, t) => {
    a.root.updateMatrixWorld(true);
    // IK
    const T = a.userData.ikT;
    for (const sd of ['L', 'R']) ik[sd] += (T[sd] - ik[sd]) * Math.min(1, dt * 14);
    const info = S.info;
    if (info) {
      if (ik[info.O] > 0.01) {
        if (info.fam === 'bow') { const b = a.userData.bow; if (b) { b.userData.nock.getWorldPosition(tmp); solveArm(a, info.O, tmp, ik[info.O], { L1: 0.29 * s, L2: 0.27 * s, pole: [0.5, -1, -0.5] }); } }
        else { const w = S.main; const g2 = w?.userData.sockets.grip2; if (w && g2) { tmp.set(g2[0], g2[1], g2[2]); w.localToWorld(tmp); tmp.addScaledVector(new THREE.Vector3(0, 0.0, 0), 0); solveArm(a, info.O, tmp.clone().add(new THREE.Vector3(0, 0.05 * s, 0).applyQuaternion(w.getWorldQuaternion(new THREE.Quaternion()))), ik[info.O], { L1: 0.29 * s, L2: 0.27 * s, pole: [0.6, -1, -0.2] }); } }
      }
    }
    for (const sw of sways) sw.update(dt);
    a.root.updateMatrixWorld(true);
    for (const c of cloths) c.update(dt);
    for (const w of S.weapons) w.userData.update?.(dt, t);
    if (S.orbLight) { const st = a.userData.staff; const c = st?.userData.charge || 0; S.orbLight.intensity = (2.4 + 0.8 * Math.sin(t * 7.1 + Math.sin(t * 2.3) * 2) + 0.5 * Math.sin(t * 3.3)) * (1 + c * 2.5); }
    const dis = a.dissolving ? Math.min(1, a._dissT / (a._dissDur || 1)) : 0;
    blob.material.opacity = 1 - Math.min(1, dis * 1.6);
    for (const c of cloths) c.windT = t;
    if (dis > 0.02) for (const w of S.weapons) w.traverse((o) => { if (o.isMesh && !(o.material.isMeshStandardMaterial)) o.visible = false; if (o.isSprite) o.visible = false; });
    if (S.orbLight) S.orbLight.visible = dis < 0.5 && a.alive;
    // decay staff charge toward zero outside channel clips
    const st = a.userData.staff; if (st && !['attack', 'attack2', 'cast'].includes(a.animator.name)) st.userData.charge = (st.userData.charge || 0) * Math.max(0, 1 - dt * 4);
    // blink handled by eye scale
  };
  void eyeBlink;
  a.update(0.0001, 0);
  for (const c of cloths) c.reset();
  return a;
}
