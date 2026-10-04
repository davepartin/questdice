// The Goblin King (Act I boss): a bloated, greedy, regal goblin. Sculpted from distance fields (parts2.js),
// armoured with plates that hug the flesh (shellField), draped in a verlet-simulated crimson cloak.
// API: a.setRage(on) = "Greed-Mad" form (flaming crown, red eyes, flushed skin, white-hot ruby, jittery idle).
// Events (a.on / play onEvent): 'hit' on attack clips, 'rage' clip hits at its peak (shockwave sync), 'shake'.
import * as THREE from 'three';
import { Actor } from './base.js';
import { mat, solid, gem } from '../mats.js';
import { sinT, ramp01 } from '../rig.js';
import { Field, shellField, unionField, meshField, Merge, Puffs, place, withEvents, own, rng as mkRng, smoothstep } from './parts2.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;
const A3 = (v) => [v.x, v.y, v.z];
const rotM = (x, y, z) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
const trM = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

export function create({ seed = 1, quality = 'high' } = {}) {
  const QK = quality === 'low' ? 3.0 : quality === 'med' ? 2.3 : 1.8;
  const QF = quality === 'low' ? 2.2 : quality === 'med' ? 1.7 : 1.4;
  const HQ = quality === 'high' ? 1 : quality === 'med' ? 0.6 : 0.35;
  const R = mkRng(seed * 4231 + 5);
  const rr = (a, b) => a + (b - a) * R();
  const a = new Actor({ name: 'goblinking', height: 2.3, radius: 0.9 });
  const ABS = {};
  const jt = (name, parent, x, y, z) => { const p = parent ? ABS[parent.name] : [0, 0, 0]; ABS[name] = [x, y, z]; return a.joint(name, parent || a.model, x - p[0], y - p[1], z - p[2]); };

  // ---------------------------------------------------------------- joints
  const hips = jt('hips', null, 0, 0.85, 0);
  const spine = jt('spine', hips, 0, 0.95, 0);
  const chest = jt('chest', spine, 0, 1.3, 0);
  const head = jt('head', chest, 0, 1.78, 0.1);
  const jaw = jt('jaw', head, 0, 1.88, 0.18);
  const crown = jt('crown', head, 0, 2.17, 0.1);
  const C = [0, 1.98, 0.14];
  const side = { R: -1, L: 1 }; const J = {};
  for (const [S, sx] of Object.entries(side)) {
    J['sh' + S] = jt('sh' + S, chest, sx * 0.55, 1.6, 0);
    J['el' + S] = jt('el' + S, J['sh' + S], sx * 0.58, 1.18, 0.02);
    J['hand' + S] = jt('hand' + S, J['el' + S], sx * 0.6, 0.76, 0.1);
    J['hip' + S] = jt('hip' + S, hips, sx * 0.22, 0.8, 0);
    J['kn' + S] = jt('kn' + S, J['hip' + S], sx * 0.24, 0.42, 0.05);
    J['ft' + S] = jt('ft' + S, J['kn' + S], sx * 0.24, 0.09, 0);
    J['eye' + S] = jt('eye' + S, head, sx * 0.095, C[1] + 0.02, C[2] + 0.19);
    J['lid' + S] = jt('lid' + S, head, sx * 0.095, C[1] + 0.02, C[2] + 0.19); J['lid' + S].rotation.x = -0.75; // half-lidded rest
    J['brow' + S] = jt('brow' + S, head, sx * 0.1, C[1] + 0.09, C[2] + 0.17);
    J['ear' + S] = jt('ear' + S, head, sx * 0.2, C[1] + 0.02, C[2] - 0.02);
  }
  const ch = jt('ch', null, 0, 0, 0);   // x = rage-flare of cloak, y = shield, z = bombs visible
  const ch2 = jt('ch2', null, 0, 0, 0); // x = ruby glow, y = eye fury, z = steam/embers
  const weapon = jt('weapon', J.handR, -0.6, 0.76, 0.1); weapon.rotation.x = 0.35;
  const bombs = [0, 1, 2].map((i) => jt('bomb' + i, null, 0, 0, 0));
  a.root.updateMatrixWorld(true);

  // ---------------------------------------------------------------- materials
  const skin = mat('kingHideB', { vertexColors: true, roughness: 0.85 });
  const gold = solid(0xffe27a, { rough: 0.38, metal: 1, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  const goldR = solid(0xffe898, { rough: 0.2, metal: 1, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const leather = mat('leatherDark', { vertexColors: true, side: THREE.DoubleSide });
  const fur = mat('fur', { vertexColors: true, side: THREE.DoubleSide, tint: 0xcdb88a, dark: 0x5a4a30 });
  const bone = mat('bone', { vertexColors: true });
  const clay = mat('dirt', { vertexColors: true, tint: 0x8a4a2a, dark: 0x2a1408 });
  const ruby = gem(0xff1030, { emissive: 0xff0820, ei: 1.6 });
  const emer = gem(0x10c850, { emissive: 0x06602a, ei: 0.7 });
  const rubyS = gem(0xff1030, { emissive: 0xff0820, ei: 0.9 });
  const eyeM = solid(0xffd040, { rough: 0.3, emissive: 0xffb000, ei: 1.0 });
  const pupilM = solid(0x0a0604, { rough: 0.3 });
  const mouthM = solid(0x3a0f12, { rough: 0.5 });
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const shieldM = new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  shieldM.userData.noActorClone = true;

  const M = new Merge(a);
  const lump = { seed, lump: 0.01, lumpFreq: 7, mottle: 0.35 };
  const FLD = {};
  const grime = (x, y, z, c) => { const g = smoothstep(0.4, 0.0, y); c.multiplyScalar(1 - g * 0.4); };
  const mesh = (key, f, joint, o = {}) => { FLD[key] = f; M.push(joint, skin, meshField(f, { uvScale: 1.1, ao: 0.9, shade: grime, ...o, h: (o.h || 0.04) * (o.h && o.h < 0.025 ? QF : QK) }), null); };
  const GRN = { belly: 0xb8c880, dark: 0x7a8c50, pink: 0xc89a8a };

  // ================================================================ BODY
  { const f = new Field(lump); f.ell([0, 0.85, 0], [0.4, 0.28, 0.34], { k: 0.1 }); f.sph([-0.22, 0.78, 0], 0.22, { k: 0.1 }).sph([0.22, 0.78, 0], 0.22, { k: 0.1 }); mesh('hips', f, hips); }
  { const f = new Field(lump); f.ell([0, 1.05, 0.2], [0.58, 0.52, 0.52], { k: 0.2, tint: GRN.belly, tw: 0.8 }); f.ell([0, 0.9, 0.28], [0.42, 0.28, 0.4], { k: 0.15, tint: GRN.belly, tw: 0.8 }); f.ell([0, 1.15, -0.12], [0.45, 0.36, 0.3], { k: 0.15 });
    f.sph([0, 1.05, 0.7], 0.035, { sub: true, k: 0.04 }); mesh('belly', f, spine); }
  { const f = new Field(lump); f.ell([0, 1.5, 0], [0.5, 0.34, 0.38], { k: 0.15 }); f.ell([0, 1.62, -0.18], [0.46, 0.2, 0.22], { k: 0.15 }); f.cap([0, 1.62, 0], [0, 1.82, 0.1], 0.2, 0.15, { k: 0.1 }); mesh('chest', f, chest); }
  // head: big, with a hooked nose; brows & ears & jaw animate separately
  { const f = new Field({ ...lump, lump: 0.005, lumpFreq: 10 });
    f.ell([C[0], C[1], C[2] - 0.02], [0.24, 0.215, 0.235], { k: 0.1 });
    for (const sx of [-1, 1]) { f.sph([sx * 0.15, C[1] - 0.08, C[2] + 0.12], 0.09, { k: 0.07 }); f.sph([sx * 0.095, C[1] + 0.02, C[2] + 0.19], 0.055, { sub: true, k: 0.03 }); f.sph([sx * 0.035, C[1] - 0.14, C[2] + 0.36], 0.02, { sub: true, k: 0.015 }); }
    f.ell([0, C[1] - 0.08, C[2] + 0.18], [0.14, 0.08, 0.1], { k: 0.07 });
    f.cap([0, C[1] - 0.02, C[2] + 0.2], [0, C[1] - 0.1, C[2] + 0.42], 0.055, 0.04, { k: 0.05 }); f.cap([0, C[1] - 0.1, C[2] + 0.42], [0, C[1] - 0.2, C[2] + 0.38], 0.04, 0.032, { k: 0.04 }); // hooked nose
    mesh('head', f, head, { h: 0.022, aoSamples: [0.03, 0.07, 0.15] }); }
  { const f = new Field({ ...lump, lump: 0.004, lumpFreq: 10 });
    f.ell([0, C[1] - 0.2, C[2] + 0.2], [0.17, 0.08, 0.12], { k: 0.06 }); for (const sx of [-1, 1]) f.cap([sx * 0.17, C[1] - 0.1, C[2] + 0.0], [sx * 0.1, C[1] - 0.2, C[2] + 0.24], 0.06, 0.06, { k: 0.05 }); mesh('jaw', f, jaw, { h: 0.022 }); }
  for (const [S, sx] of Object.entries(side)) {
    { const f = new Field({ ...lump, lump: 0.004, lumpFreq: 10 }); f.cap([sx * 0.22, C[1] + 0.1, C[2] + 0.1], [sx * 0.03, C[1] + 0.07, C[2] + 0.22], 0.045, 0.05, { k: 0.04 }); mesh('brow' + S, f, J['brow' + S], { h: 0.02 }); }
    { const f = new Field({ ...lump, lump: 0.003, lumpFreq: 12 }); f.cap([sx * 0.2, C[1], C[2] - 0.02], [sx * 0.46, C[1] + 0.08, C[2] - 0.08], 0.05, 0.03, { k: 0.04 }); f.cap([sx * 0.46, C[1] + 0.08, C[2] - 0.08], [sx * 0.64, C[1] + 0.2, C[2] - 0.14], 0.03, 0.012, { k: 0.03 }); mesh('ear' + S, f, J['ear' + S], { h: 0.02, ao: 0.6 }); }
    { const f = new Field(lump); f.sph([sx * 0.55, 1.6, 0], 0.2, { k: 0.1 }); f.cap([sx * 0.55, 1.6, 0], [sx * 0.58, 1.2, 0.02], 0.2, 0.15, { k: 0.1 }); mesh('arm' + S, f, J['sh' + S], { h: 0.03 }); }
    { const f = new Field(lump); f.sph([sx * 0.58, 1.18, 0.02], 0.15, { k: 0.05 }); f.cap([sx * 0.58, 1.18, 0.02], [sx * 0.6, 0.84, 0.1], 0.15, 0.11, { k: 0.08 }); f.ell([sx * 0.6, 0.74, 0.1], [0.13, 0.13, 0.15], { k: 0.06 });
      for (let i = 0; i < 4; i++) f.cap([sx * 0.6 + (i - 1.5) * 0.045, 0.74, 0.2], [sx * 0.6 + (i - 1.5) * 0.05, 0.66, 0.24], 0.032, 0.026, { k: 0.02 }); mesh('fore' + S, f, J['el' + S], { h: 0.03 }); }
    { const f = new Field(lump); f.cap([sx * 0.22, 0.85, 0], [sx * 0.24, 0.46, 0.05], 0.22, 0.16, { k: 0.08 }); f.sph([sx * 0.24, 0.42, 0.05], 0.16, { k: 0.04 }); mesh('thigh' + S, f, J['hip' + S], { h: 0.03 }); }
    { const f = new Field(lump); f.sph([sx * 0.24, 0.42, 0.05], 0.16, { k: 0.04 }); f.cap([sx * 0.24, 0.42, 0.05], [sx * 0.24, 0.12, 0], 0.16, 0.1, { k: 0.08 }); mesh('shin' + S, f, J['kn' + S], { h: 0.035 }); }
    { const f = new Field(lump); f.sph([sx * 0.24, 0.1, 0], 0.1, { k: 0.04 }); f.ell([sx * 0.24, 0.06, 0.14], [0.13, 0.06, 0.22], { k: 0.05 }); for (let i = 0; i < 3; i++) f.cap([sx * 0.24 + (i - 1) * 0.08, 0.06, 0.28], [sx * 0.24 + (i - 1) * 0.09, 0.05, 0.4], 0.045, 0.04, { k: 0.03 }); mesh('foot' + S, f, J['ft' + S], { h: 0.03 }); }
  }

  // ================================================================ DETAILS
  const sphG = new THREE.SphereGeometry(1, 7, 5); const cylG = new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0);
  const spikeG = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0); const studG = new THREE.SphereGeometry(1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const col = (h, v = 0.1) => new THREE.Color(h).multiplyScalar(1 - v + R() * v * 2);
  const gcol = () => col(0xffe9a0, 0.12);
  // warts
  for (const [key, joint, box] of [['head', head, [[-0.24, 1.8, -0.1], [0.24, 2.2, 0.4]]], ['chest', chest, [[-0.5, 1.4, -0.3], [0.5, 1.8, 0.35]]], ['belly', spine, [[-0.5, 0.7, 0.0], [0.5, 1.4, 0.7]]]]) {
    for (const { p, n } of FLD[key].scatter(Math.round((key === 'head' ? 14 : 12) * HQ + 3), box, null, R)) { const s = key === 'head' ? rr(0.008, 0.016) : rr(0.012, 0.025); M.push(joint, skin, sphG, place(A3(p), A3(n), [s, s * 0.7, s]), col(0xa0b870, 0.1)); }
  }
  // face: greedy eyes, drooping lids, tusks, gold teeth, ear rings
  for (const [S, sx] of Object.entries(side)) {
    const e0 = ABS['eye' + S];
    M.push(J['eye' + S], eyeM, new THREE.SphereGeometry(0.046, 14, 10), trM(...e0));
    M.push(J['eye' + S], pupilM, new THREE.SphereGeometry(0.015, 8, 6), trM(e0[0] - sx * 0.006, e0[1] - 0.006, e0[2] + 0.043));
    M.push(J['lid' + S], skin, new THREE.SphereGeometry(0.054, 16, 10, 0, Math.PI * 2, 0, 1.95), trM(...e0), col(0x9ab060, 0.05));
    // gold ring in each ear (and a stud)
    M.push(J['ear' + S], gold, new THREE.TorusGeometry(0.05, 0.009, 8, 18), new THREE.Matrix4().compose(V(sx * 0.40, C[1] - 0.005, C[2] - 0.075), new THREE.Quaternion(), V(1, 1, 1)));
    M.push(J['ear' + S], gold, new THREE.TorusGeometry(0.04, 0.008, 8, 16), new THREE.Matrix4().compose(V(sx * 0.57, C[1] + 0.13, C[2] - 0.115), new THREE.Quaternion(), V(1, 1, 1)));
    M.push(J['ear' + S], emer, sphG, new THREE.Matrix4().compose(V(sx * 0.3, C[1] + 0.03, C[2] - 0.04), new THREE.Quaternion(), V(0.012, 0.012, 0.012)));
    // tusks
    M.strand(jaw, bone, [sx * 0.105, C[1] - 0.21, C[2] + 0.31], [sx * 0.1, 1, 0.3], 0.1, 0.02, { rings: 3, radial: 6, r1: 0.15, color: 0xdccfa8, bend: [sx * 0.08, 0.0, 0.06] });
    // brow/cheek rivets of gold? gold tooth caps
  }
  for (let i = 0; i < 9; i++) { const t = (i / 8) * 2 - 1; const x = t * 0.12; const z = C[2] + 0.28 + (1 - Math.abs(t)) * 0.04; const L = rr(0.018, 0.035);
    const gt = i % 3 === 1; M.strand(jaw, gt ? gold : bone, [x, C[1] - 0.17, z], [0, 1, 0.1], L, 0.011, { rings: 2, radial: 5, r1: 0.35, color: gt ? 0xffe090 : col(0xcfc08a, 0.2) }); }
  for (let i = 0; i < 7; i++) { const t = (i / 6) * 2 - 1; M.strand(head, i % 2 ? gold : bone, [t * 0.1, C[1] - 0.17, C[2] + 0.27], [0, -1, 0.1], rr(0.012, 0.028), 0.009, { rings: 2, radial: 5, r1: 0.3, color: i % 2 ? 0xffe090 : col(0xc8b88a, 0.2) }); }
  M.push(jaw, mouthM, sphG, new THREE.Matrix4().compose(V(0, C[1] - 0.15, C[2] + 0.17), new THREE.Quaternion(), V(0.11, 0.05, 0.12)));
  M.push(head, mouthM, sphG, new THREE.Matrix4().compose(V(0, C[1] - 0.17, C[2] + 0.17), new THREE.Quaternion(), V(0.11, 0.03, 0.12)));

  // ---- CROWN: jagged gold, chunky gems
  { const nS = 9; const base = [0, 2.14, 0.1];
    for (let i = 0; i < 24; i++) { const an = (i / 24) * 6.283; M.push(crown, gold, new THREE.BoxGeometry(0.075, 0.1, 0.05), new THREE.Matrix4().compose(V(base[0] + Math.sin(an) * 0.215, base[1], base[2] + Math.cos(an) * 0.215), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, an, 0)), V(1, 1, 1)), gcol()); }
    M.push(crown, gold, new THREE.TorusGeometry(0.215, 0.022, 8, 28), new THREE.Matrix4().compose(V(...base).add(V(0, -0.05, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1)));
    M.push(crown, gold, new THREE.TorusGeometry(0.215, 0.016, 8, 28), new THREE.Matrix4().compose(V(...base).add(V(0, 0.045, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1)));
    for (let i = 0; i < nS; i++) { const an = (i / nS) * 6.283; const h = i % 2 ? 0.2 : 0.3; const px = base[0] + Math.sin(an) * 0.215; const pz = base[2] + Math.cos(an) * 0.215;
      M.push(crown, gold, spikeG, place([px, base[1] + 0.04, pz], [Math.sin(an) * 0.18, 1, Math.cos(an) * 0.18], [0.05, h + rr(-0.03, 0.03), 0.034]), gcol());
      if (i % 3 === 0) M.push(crown, i % 2 ? emer : ruby, new THREE.OctahedronGeometry(1, 0), place([px + Math.sin(an) * 0.03, base[1] - 0.01, pz + Math.cos(an) * 0.03], [Math.sin(an), 0.3, Math.cos(an)], [0.032, 0.05, 0.032]));
      else M.push(crown, i % 2 ? rubyS : emer, sphG, trM(px + Math.sin(an) * 0.03, base[1] + 0.0, pz + Math.cos(an) * 0.03).multiply(new THREE.Matrix4().makeScale(0.02, 0.02, 0.02))); }
    M.push(crown, ruby, new THREE.OctahedronGeometry(1, 0), place([0, base[1] + 0.0, base[2] + 0.245], [0, 0.2, 1], [0.05, 0.075, 0.05])); }

  // ---- ARMOUR: mismatched gold plates that hug the body
  const torso = unionField([FLD.chest, FLD.belly], 0.12);
  const plateMesh = (src, joint, mtl, o, h = 0.02) => { const sh = shellField(src, { bevel: 0.01, ...o }); M.push(joint, mtl, meshField(sh, { h: h * QK / 1.35, uvScale: 1.6, ao: 0.5, aoSamples: [0.02, 0.05] }), null); return sh; };
  const hammer = (x, y, z, o) => { o.setRGB(1, 1, 1).multiplyScalar(0.72 + 0.18 * Math.sin(x * 47) * Math.sin(z * 41 + y * 23)); };
  // breastplate stretched over the gut (front only, rim lifted)
  plateMesh(torso, spine, gold, { off: 0.03, t: 0.016, region: (x, y, z) => Math.max(-(z - 0.05), Math.abs(y - 1.2) - 0.38, Math.abs(x) - 0.52), bounds: [[-0.8, 0.6, -0.2], [0.8, 1.85, 0.9]], colorAt: hammer }, 0.02);
  // rivets around the plate and a central embossed boss + a gem
  for (let i = 0; i < Math.round(26 * HQ + 8); i++) { const an = (i / (26 * HQ + 8)) * 6.283; const x = Math.sin(an) * 0.47; const y = 1.2 + Math.cos(an) * 0.33; const h = torso.shoot([x, y, 1.4], [0, 0, -1], 2); if (h) M.push(spine, gold, studG, place(A3(h.p.clone().addScaledVector(h.n, 0.04)), A3(h.n), 0.014), gcol()); }
  { const h = torso.shoot([0, 1.18, 1.4], [0, 0, -1], 2); if (h) { M.push(spine, goldR, new THREE.CylinderGeometry(0.1, 0.12, 0.03, 18), new THREE.Matrix4().compose(h.p.clone().addScaledVector(h.n, 0.05), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), h.n), V(1, 1, 1))); M.push(spine, ruby, new THREE.OctahedronGeometry(1, 0), place(A3(h.p.clone().addScaledVector(h.n, 0.085)), A3(h.n), [0.055, 0.04, 0.055])); } }
  // belt with a huge buckle
  plateMesh(torso, spine, leather, { off: 0.012, t: 0.025, region: (x, y) => Math.abs(y - 0.8) - 0.06, bounds: [[-0.8, 0.6, -0.8], [0.8, 1.0, 0.9]] });
  { const h = torso.shoot([0, 0.8, 1.4], [0, 0, -1], 2); if (h) { M.push(spine, goldR, new THREE.BoxGeometry(0.2, 0.13, 0.03), new THREE.Matrix4().compose(h.p.clone().addScaledVector(h.n, 0.05), new THREE.Quaternion(), V(1, 1, 1))); M.push(spine, emer, sphG, trM(h.p.x, h.p.y, h.p.z + 0.075).multiply(new THREE.Matrix4().makeScale(0.035, 0.035, 0.02))); } }
  // big pauldron on the right shoulder (club-hand side), small one on the left
  for (const [S, c, rad, off] of [['R', V(-0.56, 1.76, 0.0), 0.3, 0.035], ['L', V(0.55, 1.72, 0.05), 0.18, 0.03]]) {
    plateMesh(FLD['arm' + S], J['sh' + S], gold, { off, t: 0.017, region: (x, y, z) => V(x, y, z).sub(c).length() - rad, bounds: [[-1, 1.2, -0.5], [1, 2.1, 0.5]], colorAt: hammer }, 0.02);
    const ctr = V((S === 'R' ? -1 : 1) * 0.55, 1.6, 0); const axis = c.clone().sub(ctr).normalize(); const u = V(0, 0, 1).cross(axis).normalize(); const v = axis.clone().cross(u);
    for (let k = 0; k < 9; k++) { const an = (k / 9) * 6.283; const q = c.clone().addScaledVector(u, Math.cos(an) * rad * 0.8).addScaledVector(v, Math.sin(an) * rad * 0.8); const h = FLD['arm' + S].shoot(A3(ctr), A3(q.sub(ctr)), 1); if (h) M.push(J['sh' + S], gold, studG, place(A3(h.p.clone().addScaledVector(h.n, off + 0.017)), A3(h.n), 0.013), gcol()); }
    if (S === 'R') { const h = FLD.armR.shoot(A3(ctr), [-0.2, 1, 0.1], 1); if (h) M.push(J.shR, gold, spikeG, place(A3(h.p.clone().addScaledVector(h.n, 0.04)), A3(h.n), [0.04, 0.15, 0.04]), gcol()); }
  }
  // greaves (mismatched: one polished, one hammered)
  for (const [S] of [['R'], ['L']]) plateMesh(FLD['shin' + S], J['kn' + S], S === 'R' ? goldR : gold, { off: 0.02, t: 0.014, region: (x, y, z) => Math.max(Math.abs(y - 0.26) - 0.11, -(z + 0.02)), bounds: [[-0.6, 0.0, -0.4], [0.6, 0.6, 0.4]], colorAt: hammer }, 0.02);
  // heaps of chains, medallions and coins stuck all over
  { const loops = [[0.0, 0.0], [0.07, 0.1], [0.14, 0.2]];
    loops.forEach(([dy, dz], li) => { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; const x = -0.34 + t * 0.68; const h = FLD.chest.shoot([x, 1.95 - 0.38 * Math.sin(Math.PI * t) * (0.9 + li * 0.2) - dy, 1.2], [0, -0.2, -1], 2); if (h) pts.push(h); }
      for (let i = 0; i < pts.length - 1; i++) { const a0 = pts[i].p.clone().addScaledVector(pts[i].n, 0.03); const b0 = pts[i + 1].p.clone().addScaledVector(pts[i + 1].n, 0.03); const d = b0.clone().sub(a0);
        M.push(chest, gold, new THREE.TorusGeometry(0.014, 0.004, 5, 8), new THREE.Matrix4().compose(a0.clone().lerp(b0, 0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.clone().normalize()), V(1, 1, 1)).multiply(rotM(0, 0, i * 1.57)).multiply(new THREE.Matrix4().makeScale(d.length() * 35, 1, 1)), gcol()); }
      const m = pts[7]; if (m && li !== 1) M.push(chest, goldR, new THREE.CylinderGeometry(0.05 + li * 0.012, 0.05 + li * 0.012, 0.01, 16), new THREE.Matrix4().compose(m.p.clone().addScaledVector(m.n, 0.045), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), m.n), V(1, 1, 1))); }); }
  for (const [key, joint, box, n] of [['chest', chest, [[-0.45, 1.3, -0.35], [0.45, 1.8, 0.4]], 22], ['belly', spine, [[-0.55, 0.7, -0.2], [0.55, 1.35, 0.7]], 26], ['arm' + 'L', J.shL, [[0.4, 1.2, -0.2], [0.8, 1.7, 0.2]], 8], ['thighL', J.hipL, [[0.0, 0.4, -0.2], [0.5, 0.85, 0.3]], 8]]) {
    for (const { p, n: nn } of FLD[key].scatter(Math.round(n * HQ + 4), box, null, R)) { const s = rr(0.026, 0.04); M.push(joint, goldR, new THREE.CylinderGeometry(s, s, 0.007, 8), place(A3(p.clone().addScaledVector(nn, 0.004)), A3(nn), 1, R() * 6), gcol()); }
  }
  // fur collar: lumpy fat torus + fur strands
  { const f = new Field({ seed: seed + 9, lump: 0.02, lumpFreq: 8 }); f.torus([0, 1.8, 0.04], 0.27, 0.085, { k: 0.05 }); f.torus([0, 1.76, -0.03], 0.31, 0.07, { k: 0.05 });
    M.push(chest, fur, meshField(f, { h: 0.034 * QK / 1.35, uvScale: 2, ao: 0.8 }), null);
    for (let i = 0; i < Math.round(150 * HQ + 30); i++) { const an = R() * 6.283; const r0 = 0.27 + rr(-0.03, 0.08); const y = 1.8 + rr(-0.02, 0.1); const p = [Math.sin(an) * r0, y, 0.04 + Math.cos(an) * r0 * 0.9]; M.strand(chest, fur, p, [Math.sin(an) * 0.5, 1, Math.cos(an) * 0.5], rr(0.05, 0.1), 0.006, { rings: 2, radial: 3, r1: 0.1, color: col(0xeee6d6, 0.15), bend: [Math.sin(an) * 0.2, -0.2, Math.cos(an) * 0.2] }); } }
  // bombs on the belt + pouch
  for (let i = 0; i < 3; i++) { const x = 0.25 + i * 0.09; M.push(spine, clay, new THREE.SphereGeometry(0.05, 10, 8), trM(-x + 0.3, 0.72 - i * 0.015, 0.5 - i * 0.02)); M.strand(spine, leather, [0.3 - x, 0.77 - i * 0.015, 0.5 - i * 0.02], [0.1, 1, 0], 0.04, 0.004, { rings: 1, radial: 3, r1: 1, color: 0x1a1008 }); }
  // throwable bombs (hidden until the throw clip): clay sphere + fuse spark
  for (const b of bombs) { M.push(b, clay, new THREE.SphereGeometry(0.075, 12, 10), new THREE.Matrix4(), 0xffffff); M.push(b, goldR, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), trM(0, 0.08, 0)); M.push(b, ruby, sphG, trM(0, 0.115, 0).multiply(new THREE.Matrix4().makeScale(0.016, 0.016, 0.016))); }

  // ================================================================ SCEPTER (grip at weapon origin; shaft +Y)
  { const Mw = weapon.matrixWorld; const lm = (m) => Mw.clone().multiply(m);
    const prof = [[0.026, -0.35], [0.04, -0.33], [0.026, -0.3], [0.024, 0.0], [0.036, 0.04], [0.026, 0.08], [0.024, 0.5], [0.04, 0.54], [0.026, 0.58], [0.025, 1.05], [0.05, 1.1], [0.03, 1.16], [0.03, 1.3], [0.06, 1.34], [0.04, 1.4]];
    M.push(weapon, goldR, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14), Mw);
    for (let i = 0; i < 12; i++) M.push(weapon, goldR, new THREE.TorusGeometry(0.03, 0.006, 5, 10), lm(new THREE.Matrix4().compose(V(0, 0.1 + i * 0.035, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1))));
    // golden skull holding the ruby
    const sk = new Field({ seed: 5, lump: 0.002, lumpFreq: 25 });
    sk.ell([0, 0.012, -0.006], [0.07, 0.066, 0.078], { k: 0.02 }).ell([0, -0.042, 0.046], [0.046, 0.04, 0.042], { k: 0.02 }).ell([0, -0.076, 0.035], [0.03, 0.022, 0.034], { k: 0.012 });
    for (const sx of [-1, 1]) { sk.sph([sx * 0.028, -0.006, 0.063], 0.022, { sub: true, k: 0.01 }); sk.sph([sx * 0.042, -0.03, 0.05], 0.016, { k: 0.015 }); }
    sk.ell([0, -0.04, 0.086], [0.01, 0.018, 0.012], { sub: true, k: 0.008 });
    M.push(weapon, goldR, meshField(sk, { h: 0.014 * QK / 1.35, uvScale: 5, ao: 0.8, aoSamples: [0.015, 0.04, 0.08] }), lm(trM(0, 1.5, 0).multiply(rotM(0.3, 0, 0)).multiply(new THREE.Matrix4().makeScale(1.35, 1.35, 1.35))));
    for (let i = 0; i < 6; i++) { const an = (i / 6) * 6.283; M.strand(weapon, goldR, A3(V(Math.sin(an) * 0.03, 1.38, Math.cos(an) * 0.03).applyMatrix4(Mw)), A3(V(Math.sin(an) * 0.35, 1, Math.cos(an) * 0.35).transformDirection(Mw)), 0.14, 0.012, { rings: 2, radial: 4, r1: 0.35, color: 0xffe9a0 }); }
    M.push(weapon, ruby, new THREE.IcosahedronGeometry(0.06, 1), lm(trM(0, 1.62, 0.04)));
  }
  // shield aura mesh (translucent gold dome in front); hex rings
  const shield = new THREE.Group(); shield.name = 'shield'; a.model.add(shield); shield.position.set(0, 1.15, 0.75);
  { const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), shieldM); dome.rotation.x = Math.PI / 2; dome.scale.set(0.95, 0.95, 0.7); dome.castShadow = false; shield.add(dome);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.6 + i * 0.25, 0.012, 6, 40), shieldM); r.position.z = 0.02 + i * 0.05; r.castShadow = false; shield.add(r); } shield.visible = false; }

  // ================================================================ CLOAK (verlet cloth, moth-eaten, gold trim)
  const nC = quality === 'low' ? 9 : 13; const nR = quality === 'low' ? 10 : 15; const CL = [];
  const pinsLocal = []; for (let i = 0; i < nC; i++) { const u = i / (nC - 1); const x = (u - 0.5) * 1.1; pinsLocal.push(V(x, 1.7 - 1.3 + 0.0, -0.16 - 0.26 * (1 - (2 * u - 1) ** 2) + 0.14 * 0)); } // chest-local
  pinsLocal.forEach((p) => { p.y = 0.4; });
  const cloakPos = new Float32Array(nC * nR * 3); const prevPos = new Float32Array(nC * nR * 3); const rest = [];
  const chestW = new THREE.Vector3(); const cloakRoot = new THREE.Group(); a.root.add(cloakRoot);
  const pinW = (i, out) => { out.copy(pinsLocal[i]); chest.localToWorld(out); return a.root.worldToLocal(out); };
  { const tmp = V(0, 0, 0); for (let r = 0; r < nR; r++) for (let i = 0; i < nC; i++) { pinW(i, tmp); const k = (r * nC + i) * 3; const u = i / (nC - 1) - 0.5; cloakPos[k] = tmp.x * (1 + 0.5 * r / nR); cloakPos[k + 1] = tmp.y - r * 0.105; cloakPos[k + 2] = tmp.z - r * 0.025; prevPos[k] = cloakPos[k]; prevPos[k + 1] = cloakPos[k + 1]; prevPos[k + 2] = cloakPos[k + 2]; } }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cloakPos, 3));
  const cuv = new Float32Array(nC * nR * 2); for (let r = 0; r < nR; r++) for (let i = 0; i < nC; i++) { cuv[(r * nC + i) * 2] = (i / (nC - 1)) * 1.6; cuv[(r * nC + i) * 2 + 1] = (r / (nR - 1)) * 2.2; }
  cg.setAttribute('uv', new THREE.BufferAttribute(cuv, 2));
  const idxB = []; const idxG = [];
  for (let r = 0; r < nR - 1; r++) for (let i = 0; i < nC - 1; i++) {
    if (r > 3 && r < nR - 2 && i > 0 && i < nC - 2 && R() < 0.045) continue; // moth holes
    if (r >= nR - 2 && R() < 0.3) continue; // ragged hem
    const a0 = r * nC + i; const q = [a0, a0 + 1, a0 + nC, a0 + 1, a0 + nC + 1, a0 + nC];
    ((i === 0 || i === nC - 2 || r === nR - 2 || r === 0) ? idxG : idxB).push(...q);
  }
  { const all = [...idxB, ...idxG]; cg.setIndex(all); cg.addGroup(0, idxB.length, 0); cg.addGroup(idxB.length, idxG.length, 1); }
  const cloakM = mat('brocadeB', { side: THREE.DoubleSide, roughness: 1 });
  const cloak = new THREE.Mesh(cg, [cloakM, goldR]); cloak.frustumCulled = false; cloak.castShadow = true; cloakRoot.add(cloak);
  const colSph = [[0, 1.5, -0.02, 0.46], [0, 1.05, 0.0, 0.62], [0, 0.72, -0.05, 0.44], [-0.22, 0.35, -0.02, 0.26], [0.22, 0.35, -0.02, 0.26], [-0.62, 1.55, -0.02, 0.26], [0.62, 1.55, -0.02, 0.26]];
  let simAcc = 0; const wP = V(0, 0, 0);
  const stepCloak = (h, flare, rageK, t) => {
    const g = -9.5 + flare * 9; const n = nC * nR;
    for (let r = 1; r < nR; r++) for (let i = 0; i < nC; i++) { const k = (r * nC + i) * 3;
      for (let c = 0; c < 3; c++) { const v = (cloakPos[k + c] - prevPos[k + c]) * 0.985; prevPos[k + c] = cloakPos[k + c]; cloakPos[k + c] += v; }
      cloakPos[k + 1] += g * h * h * (1 - 0.0); cloakPos[k + 2] += (-flare * 5 + Math.sin(t * 2.1 + i * 0.9 + r * 0.35) * (0.4 + flare * 2.4 + rageK * 1.2)) * h * h; cloakPos[k] += Math.sin(t * 1.7 + r * 0.6) * (0.3 + flare * 2.0) * h * h * (i / nC - 0.5); }
    for (let i = 0; i < nC; i++) { pinW(i, wP); cloakPos[i * 3] = wP.x; cloakPos[i * 3 + 1] = wP.y; cloakPos[i * 3 + 2] = wP.z; }
    for (let it = 0; it < 4; it++) {
      for (let r = 0; r < nR; r++) for (let i = 0; i < nC; i++) {
        const k = (r * nC + i) * 3;
        const sat = (j, L) => { const dx = cloakPos[j] - cloakPos[k]; const dy = cloakPos[j + 1] - cloakPos[k + 1]; const dz = cloakPos[j + 2] - cloakPos[k + 2]; const d = Math.hypot(dx, dy, dz) || 1e-6; const df = (d - L) / d * 0.5;
          const kp = r === 0; const jp = (j / 3 | 0) < nC; if (!kp) { cloakPos[k] += dx * df * (jp ? 2 : 1); cloakPos[k + 1] += dy * df * (jp ? 2 : 1); cloakPos[k + 2] += dz * df * (jp ? 2 : 1); } if (!jp) { cloakPos[j] -= dx * df * (kp ? 2 : 1); cloakPos[j + 1] -= dy * df * (kp ? 2 : 1); cloakPos[j + 2] -= dz * df * (kp ? 2 : 1); } };
        if (r < nR - 1) sat(((r + 1) * nC + i) * 3, 0.107);
        if (i < nC - 1) sat((r * nC + i + 1) * 3, r === 0 ? (pinsLocal[1].x - pinsLocal[0].x) * 1.0 + 0.0 : 0.09 + 0.045 * r / nR);
        if (r > 0) for (const [cx, cy, cz, rad] of colSph) { const dx = cloakPos[k] - cx; const dy = cloakPos[k + 1] - cy; const dz = cloakPos[k + 2] - cz; const d = Math.hypot(dx, dy, dz); if (d < rad + 0.03) { const s = (rad + 0.03) / (d || 1e-6); cloakPos[k] = cx + dx * s; cloakPos[k + 1] = cy + dy * s; cloakPos[k + 2] = cz + dz * s; } }
        if (cloakPos[k + 1] < 0.02) cloakPos[k + 1] = 0.02;
      }
    }
  };

  M.build();
  // scepter light (the only light) + anchors
  const rubyLight = new THREE.PointLight(0xff2030, 0.6, 2.2, 2); rubyLight.position.set(0, 1.62, 0.04); weapon.add(rubyLight);
  const flame = new Puffs(quality === 'low' ? 40 : 90); a.root.add(flame.mesh);
  a.anchor('head', head, 0, 0.62, 0); a.anchor('chest', chest, 0, 0.1, 0.5); a.anchor('feet', a.model, 0, 0.02, 0); a.anchor('mouth', jaw, 0, -0.04, 0.28);
  a.anchor('handR', J.handR, 0, 0, 0); a.anchor('handL', J.handL, 0, 0, 0); a.anchor('weapon', weapon, 0, 1.62, 0.04); a.anchor('crown', crown, 0, 0.2, 0); a.anchor('ruby', weapon, 0, 1.62, 0.04);

  // ================================================================ POSES & CLIPS
  const Z3 = [0, 0, 0];
  const lerpP = (A, B, k) => { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) { const x = A[key] || Z3; const y = B[key] || Z3; o[key] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; } return o; };
  const EZ = { io: (k) => k * k * (3 - 2 * k), in: (k) => k * k * k, in2: (k) => k * k, out: (k) => 1 - (1 - k) ** 3, lin: (k) => k, back: (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2 };
  const track = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, A] = keys[i - 1]; const [t1, B, e] = keys[i]; return lerpP(A, B, (EZ[e || 'io'])((t - t0) / (t1 - t0))); } return keys[keys.length - 1][1]; };
  const CHN = ['hips', 'spine', 'chest', 'shR', 'elR', 'handR'];
  const apply = (P, pose) => { for (const key in pose) { const v = pose[key]; if (key === 'weapon') { const sum = CHN.reduce((q, j) => q + (pose[j] ? pose[j][0] : 0), 0); P.rot('weapon', (v[0] - sum - 20.05) * D, v[1] * D, v[2] * D); } else if (key.endsWith('.p')) P.pos(key.slice(0, -2), v[0], v[1], v[2]); else P.rot(key, v[0] * D, v[1] * D, v[2] * D); } };
  const mk = (b, o) => ({ ...b, ...o });
  const STAND = { spine: [4, 0, 0], chest: [2, 0, 0], head: [4, 0, 0], jaw: [4, 0, 0], 'hips.p': [0, -0.03, 0], hipL: [-3, 0, 4], hipR: [-3, 0, -4], knL: [5, 0, 0], knR: [5, 0, 0], shL: [-8, 0, 12], elL: [-30, 0, 0], shR: [-35, 0, -8], elR: [-60, 0, 0], weapon: [35, 0, 0], browL: [0, 0, -6], browR: [0, 0, 6], lidL: [0.15, 0, 0], lidR: [0.15, 0, 0], 'ch.p': [0, 0, 0], 'ch2.p': [0.4, 0.1, 0] };
  const clips = {};
  clips.idle = { loop: true, dur: 5.6, fn: (t, P) => {
    const b = sinT(t, 1 / 2.8); const w = sinT(t, 1 / 5.6); const j = a.userData.rageK || 0; const jit = j * (sinT(t, 9) * 0.01 + sinT(t, 13.3, 0.3) * 0.008);
    apply(P, STAND); P.rot('chest', b * 0.03, w * 0.04, 0); P.pos('hips', w * 0.03, b * 0.01, 0); P.rot('hips', 0, w * 0.04, w * 0.02);
    P.rot('head', -b * 0.03 + sinT(t, 1 / 5.6, 0.3) * 0.05 + jit * 3, sinT(t, 1 / 5.6, 0.1) * 0.28 + jit * 2, sinT(t, 1 / 5.6, 0.6) * 0.07);
    P.rot('jaw', Math.max(0, b) * 0.05 + Math.max(0, sinT(t, 1 / 2.4, 0.7) - 0.7) * 0.2, 0, 0); P.rot('shL', b * 0.03, 0, 0); P.rot('elL', -b * 0.06 - sinT(t, 1 / 2.8, 0.3) * 0.08 + jit * 6, 0, 0); P.rot('shR', -b * 0.02 + jit * 3, 0, 0); P.rot('weapon', sinT(t, 1 / 2.8, 0.2) * 0.04 + jit * 3, 0, sinT(t, 1 / 5.6) * 0.05);
    P.rot('earL', 0, 0, Math.max(0, sinT(t, 1 / 4.1) - 0.8) * 0.9); P.rot('earR', 0, 0, -Math.max(0, sinT(t, 1 / 5.3, 0.6) - 0.8) * 0.9);
    P.rot('browL', 0, 0, sinT(t, 1 / 2.8, 0.2) * 0.06); P.rot('browR', 0, 0, -sinT(t, 1 / 2.8, 0.2) * 0.06);
  } };
  clips.ready = { loop: true, dur: 2.0, fn: (t, P) => { const b = sinT(t, 1 / 1.4);
    apply(P, mk(STAND, { spine: [12, 0, 0], chest: [8, 0, 0], head: [-4, 0, 0], jaw: [14, 0, 0], 'hips.p': [0, -0.1, 0.04], hipL: [-12, 0, 5], hipR: [-12, 0, -5], knL: [22, 0, 0], knR: [22, 0, 0], shL: [-40, 0, 24], elL: [-50, 0, 0], shR: [-60, 0, -10], elR: [-70, 0, 0], weapon: [45, 0, 0], browL: [0, 0, -18], browR: [0, 0, 18], lidL: [0.4, 0, 0], lidR: [0.4, 0, 0], 'ch2.p': [0.7, 0.4, 0] }));
    P.rot('chest', b * 0.05, sinT(t, 1 / 2) * 0.05, 0); P.pos('hips', sinT(t, 1 / 2) * 0.03, b * 0.015, 0); P.rot('jaw', Math.max(0, b) * 0.1, 0, 0); P.rot('head', 0, sinT(t, 1 / 2, 0.2) * 0.1, 0); } };
  const raised = (o = {}) => mk(STAND, { spine: [-8, 0, 0], chest: [-10, 0, 0], head: [-14, 0, 0], jaw: [26, 0, 0], 'hips.p': [0, 0, -0.04], shR: [-155, 0, -16], elR: [-18, 0, 0], weapon: [-10, 0, 0], shL: [-25, 0, 35], elL: [-40, 0, 0], browL: [0, 0, -22], browR: [0, 0, 22], lidL: [0.55, 0, 0], lidR: [0.55, 0, 0], ...o });
  clips.tele_strike = { loop: true, dur: 1.5, fn: (t, P) => { apply(P, raised({ shR: [-135, 0, -22], elR: [-70, 0, 0], jaw: [8, 0, 0], 'ch2.p': [0.8, 0.5, 0] })); P.rot('chest', sinT(t, 1 / 1.5) * 0.03, 0, 0); P.rot('weapon', sinT(t, 3) * 0.015, 0, 0); } };
  const holdWind = (ik) => (t, P) => { const cur = a.animator.cur; const T = cur && /charge|slam/.test(cur.name) ? cur.t : 9; const k = EZ.io(Math.min(1, T / 0.6)); const tr = 0.012 * k * (1 + ik);
    apply(P, lerpP(STAND, raised({ shR: [-165, 0, -10], jaw: [34, 0, 0], head: [-22, 0, 0], spine: [-14, 0, 0], chest: [-16, 0, 0], 'hips.p': [0, 0.02, -0.08], ftL: [18, 0, 0], ftR: [18, 0, 0], 'ch.p': [1, 0, 0], 'ch2.p': [1, 1, 1] }), Math.min(1.08, k + (T < 0.8 ? Math.sin(T / 0.8 * Math.PI) * 0.1 : 0))));
    P.rot('spine', sinT(t, 9) * tr, 0, sinT(t, 7, 0.4) * tr); P.rot('chest', sinT(t, 11, 0.3) * tr, 0, 0); P.rot('head', sinT(t, 13) * tr * 1.5, sinT(t, 8) * tr, 0); P.rot('shR', sinT(t, 12) * tr, 0, 0); P.rot('weapon', sinT(t, 10, 0.6) * tr * 2, 0, sinT(t, 8) * tr * 2); P.rot('shL', sinT(t, 14) * tr, 0, 0); P.pos('hips', sinT(t, 15) * 0.004, 0, 0); P.rot('jaw', Math.max(0, sinT(t, 5)) * 0.1, 0, 0); };
  clips.charge = { loop: true, dur: 1.4, fn: holdWind(0) }; clips.tele_charge = { loop: true, dur: 1.4, fn: holdWind(0) }; clips.tele_slam = { loop: true, dur: 1.4, fn: holdWind(1) };
  clips.tele_guard = { loop: true, dur: 1.8, fn: (t, P) => { const b = sinT(t, 1 / 1.8); apply(P, mk(STAND, { spine: [8, 0, 0], head: [2, 0, 0], jaw: [10, 0, 0], shL: [-75, 0, 10], elL: [-70, 0, 0], shR: [-30, 0, -30], elR: [-90, 0, 0], weapon: [60, 0, 0], 'ch.p': [0.2, 1, 0], 'ch2.p': [0.7, 0.3, 0], lidL: [0.4, 0, 0], lidR: [0.4, 0, 0] })); P.rot('chest', b * 0.03, 0, 0); } };
  clips.tele_summon = { loop: true, dur: 1.6, fn: (t, P) => { const b = sinT(t, 1 / 1.6); apply(P, raised({ shR: [-170, 0, -22], elR: [-10, 0, 0], jaw: [40, 0, 0], head: [-26, 0, 0], shL: [-20, 0, 70], elL: [-20, 0, 0], 'ch.p': [0.7, 0, 0], 'ch2.p': [1, 0.7, 0.6] })); P.rot('head', 0, 0, sinT(t, 9) * 0.02); P.rot('chest', b * 0.04, 0, 0); P.rot('weapon', sinT(t, 1 / 1.6) * 0.06, 0, sinT(t, 1.4) * 0.08); } };
  clips.tele_cast = { loop: true, dur: 1.5, fn: (t, P) => { const b = sinT(t, 1 / 1.5); apply(P, mk(STAND, { spine: [10, 0, 0], head: [2, 0, 0], jaw: [18, 0, 0], shR: [-95, 0, -12], elR: [-30, 0, 0], weapon: [70, 0, 0], shL: [-80, 0, 30], elL: [-60, 0, 0], browL: [0, 0, -20], browR: [0, 0, 20], lidL: [0.5, 0, 0], lidR: [0.5, 0, 0], 'ch2.p': [1, 0.6, 0.2] })); P.rot('shL', b * 0.08, 0, 0); P.rot('elL', sinT(t, 2) * 0.3, 0, 0); } };
  const down = (o = {}) => mk(STAND, { spine: [26, 0, 0], chest: [20, 0, 0], head: [12, 0, 0], jaw: [24, 0, 0], 'hips.p': [0, -0.14, 0.12], hipL: [-18, 0, 5], hipR: [-18, 0, -5], knL: [34, 0, 0], knR: [34, 0, 0], shR: [-10, 0, -10], elR: [-20, 0, 0], weapon: [125, 0, 0], shL: [-30, 0, 20], elL: [-50, 0, 0], browL: [0, 0, -24], browR: [0, 0, 24], lidL: [0.6, 0, 0], lidR: [0.6, 0, 0], 'ch.p': [0.4, 0, 0], 'ch2.p': [1, 0.8, 0.3], ...o });
  clips.attack = { dur: 1.4, events: { hit: 0.72 }, fn: (t, P) => { apply(P, track([[0, STAND], [0.4, raised({ shR: [-150, 0, -14], jaw: [14, 0, 0] }), 'io'], [0.56, raised({ shR: [-162, 0, -14], spine: [-14, 0, 0], jaw: [10, 0, 0] }), 'io'], [0.72, down(), 'in2'], [0.82, down({ 'hips.p': [0, -0.17, 0.14] }), 'out'], [1.4, STAND, 'io']], t));
    const imp = t > 0.72 && t < 1.2 ? Math.exp(-(t - 0.72) * 8) * sinT(t - 0.72, 8) : 0; P.rot('spine', imp * 0.05, 0, 0); P.rot('head', imp * 0.08, 0, 0); } };
  clips.attack2 = { dur: 1.3, events: { hit: 0.62 }, fn: (t, P) => { const back = mk(STAND, { spine: [4, -30, 0], chest: [2, -34, 0], head: [4, 18, 0], jaw: [22, 0, 0], shR: [-50, -60, -50], elR: [-20, 0, 0], weapon: [85, 0, -30], browL: [0, 0, -22], browR: [0, 0, 22] }); const thr = mk(back, { spine: [10, 36, 0], chest: [8, 40, 0], head: [2, -20, 0], shR: [-40, 70, -20], weapon: [85, 0, 30], 'hips.p': [0, -0.08, 0.06] }); apply(P, track([[0, STAND], [0.34, back, 'io'], [0.62, thr, 'in2'], [0.76, thr, 'out'], [1.3, STAND, 'io']], t)); } };
  clips.slam = { dur: 2.4, events: { hit: 1.4, shake: 1.4 }, fn: (t, P) => { const top = raised({ shR: [-170, 0, -8], spine: [-20, 0, 0], chest: [-22, 0, 0], head: [-30, 0, 0], jaw: [60, 0, 0], 'ch.p': [1, 0, 0], 'ch2.p': [1, 1, 1], ftL: [18, 0, 0], ftR: [18, 0, 0], 'hips.p': [0, 0.03, -0.1] });
    apply(P, track([[0, STAND], [0.7, top, 'io'], [1.15, mk(top, { spine: [-26, 0, 0], head: [-36, 0, 0] }), 'io'], [1.4, down({ spine: [34, 0, 0], chest: [26, 0, 0], 'hips.p': [0, -0.24, 0.18], knL: [44, 0, 0], knR: [44, 0, 0], weapon: [125, 0, 0] }), 'in2'], [1.5, down({ spine: [38, 0, 0], 'hips.p': [0, -0.27, 0.2], knL: [46, 0, 0], knR: [46, 0, 0] }), 'out'], [1.95, down(), 'io'], [2.4, STAND, 'io']], t));
    if (t > 0.7 && t < 1.4) { const m = ramp01(t, 0.7, 1.15); P.rot('chest', sinT(t, 12) * 0.015 * m, 0, 0); P.rot('shR', sinT(t, 14) * 0.012 * m, 0, 0); } const imp = t > 1.4 && t < 2 ? Math.exp(-(t - 1.4) * 5) * sinT(t - 1.4, 7) : 0; P.rot('spine', imp * 0.06, 0, 0); P.rot('head', imp * 0.09, 0, 0); } };
  clips.stomp = clips.slam;
  clips.guard = { dur: 1.8, fn: (t, P) => { const g = mk(STAND, { spine: [6, 0, 0], head: [-6, 0, 0], jaw: [30, 0, 0], shL: [-90, 0, 8], elL: [-60, 0, 0], shR: [-30, 0, -40], elR: [-100, 0, 0], weapon: [60, 0, 0], 'ch.p': [0.4, 1, 0], 'ch2.p': [1, 0.5, 0.2] });
    apply(P, track([[0, STAND], [0.3, g, 'back'], [1.4, g, 'io'], [1.8, STAND, 'io']], t)); } };
  clips.summon = { dur: 2.0, fn: (t, P) => { const s = raised({ shR: [-172, 0, -24], elR: [-8, 0, 0], jaw: [75, 0, 0], head: [-30, 0, 0], spine: [-14, 0, 0], chest: [-18, 0, 0], shL: [-15, 0, 80], elL: [-10, 0, 0], 'ch.p': [1, 0, 0], 'ch2.p': [1, 1, 1] });
    apply(P, track([[0, STAND], [0.45, s, 'back'], [1.5, s, 'io'], [2.0, STAND, 'io']], t)); P.rot('jaw', sinT(t, 7) * 0.08 * ramp01(t, 0.4, 0.6), 0, 0); P.rot('head', sinT(t, 11) * 0.02 * ramp01(t, 0.4, 0.6), 0, 0); P.rot('weapon', sinT(t, 1.5) * 0.08, 0, 0); } };
  // throw: juggle three clay bombs, then hurl them (hit at release 1.25)
  clips.throw = { dur: 1.9, events: { hit: 1.25 }, fn: (t, P) => {
    apply(P, track([[0, STAND], [0.3, mk(STAND, { spine: [6, 0, 0], shL: [-60, 0, 22], elL: [-80, 0, 0], shR: [-60, 0, -22], elR: [-95, 0, 0], weapon: [40, 0, 0], jaw: [18, 0, 0], browL: [0, 0, -16], browR: [0, 0, 16], 'ch2.p': [0.8, 0.4, 0] }), 'io'], [1.0, mk(STAND, { spine: [-6, 0, 0], shL: [-75, 0, 22], elL: [-70, 0, 0], shR: [-60, 0, -22], elR: [-95, 0, 0], weapon: [40, 0, 0], jaw: [24, 0, 0], 'ch2.p': [0.8, 0.5, 0] }), 'io'], [1.12, mk(STAND, { spine: [-14, 0, -6], chest: [-10, 0, 0], shL: [-150, 0, 10], elL: [-20, 0, 0], shR: [-60, 0, -22], elR: [-95, 0, 0], weapon: [40, 0, 0], jaw: [30, 0, 0] }), 'io'], [1.25, mk(STAND, { spine: [18, 0, 6], chest: [14, 0, 0], shL: [-40, 0, 6], elL: [-15, 0, 0], shR: [-60, 0, -22], elR: [-95, 0, 0], weapon: [40, 0, 0], jaw: [24, 0, 0], 'hips.p': [0, -0.06, 0.1] }), 'in2'], [1.9, STAND, 'io']], t));
    const vis = t > 0.25 && t < 1.7 ? 1 : 0; P.pos('ch', 0, 0, vis ? 1 : 0);
    // bomb juggling arcs about the hands; after release they fly forward
    bombs.forEach((b, i) => { const ph = t * 1.35 + i / 3; const f = ph % 1; const hx = 0.28 * Math.sin(ph * Math.PI * 2 / 1); let x = (f < 0.5 ? -0.3 + f * 1.2 : 0.3 - (f - 0.5) * 1.2) * (i % 2 ? 1 : 1); let y = 1.45 + Math.sin(f * Math.PI) * 0.55; let z = 0.55;
      if (t > 1.25) { const u = t - 1.25; const dir = (i - 1) * 0.25; x = x * (1 - Math.min(1, u * 3)) + dir * u * 5; y = 1.5 + u * 1.6 - u * u * 6; z = 0.6 + u * 8; }
      P.pos('bomb' + i, x, y, z); }); } };
  clips.rage = { dur: 2.6, events: { hit: 1.05, shake: 1.05 }, fn: (t, P) => { const crouch = mk(STAND, { spine: [28, 0, 0], chest: [20, 0, 0], head: [20, 0, 0], jaw: [10, 0, 0], 'hips.p': [0, -0.2, 0.06], hipL: [-20, 0, 8], hipR: [-20, 0, -8], knL: [38, 0, 0], knR: [38, 0, 0], shL: [-20, 0, 6], elL: [-100, 0, 0], shR: [-40, 0, -4], elR: [-100, 0, 0], weapon: [40, 0, 0], browL: [0, 0, -26], browR: [0, 0, 26], lidL: [0.9, 0, 0], lidR: [0.9, 0, 0], 'ch2.p': [0.8, 0.6, 0.3] });
    const scream = mk(STAND, { spine: [-22, 0, 0], chest: [-26, 0, 0], head: [-30, 0, 0], jaw: [92, 0, 0], 'hips.p': [0, 0.05, -0.1], ftL: [22, 0, 0], ftR: [22, 0, 0], shL: [-30, 0, 70], elL: [-20, 0, 0], shR: [-160, 0, -40], elR: [-10, 0, 0], weapon: [-10, 0, 0], browL: [0, 0, -28], browR: [0, 0, 28], lidL: [-0.4, 0, 0], lidR: [-0.4, 0, 0], 'ch.p': [1, 0, 0], 'ch2.p': [1, 1, 1] });
    apply(P, track([[0, STAND], [0.6, crouch, 'io'], [1.05, scream, 'back'], [1.9, scream, 'io'], [2.6, STAND, 'io']], t));
    const sh = t > 0.6 && t < 1.9 ? 1 : 0; P.rot('head', sinT(t, 17) * 0.03 * sh, sinT(t, 13) * 0.04 * sh, 0); P.rot('spine', sinT(t, 15) * 0.02 * sh, 0, sinT(t, 11) * 0.02 * sh); P.pos('hips', sinT(t, 19) * 0.01 * sh, 0, 0); P.rot('jaw', sinT(t, 9) * 0.08 * sh, 0, 0); } };
  clips.hurt = { dur: 0.45, fn: (t, P) => { const k = Math.sin(Math.min(1, t / 0.45) * Math.PI) * Math.exp(-t * 2); P.rot('spine', -0.15 * k, 0, 0.08 * k); P.rot('chest', -0.15 * k, 0.08 * k, 0); P.rot('head', -0.3 * k, 0.15 * k, 0); P.rot('jaw', 0.5 * k, 0, 0); P.pos('hips', 0, 0, -0.1 * k); P.rot('shR', 0.2 * k, 0, 0); P.rot('shL', 0.2 * k, 0, 0); P.rot('lidL', 0.5 * k, 0, 0); P.rot('lidR', 0.5 * k, 0, 0); } };
  clips.die = { dur: 2.8, fn: (t, P) => { const st = mk(STAND, { spine: [-14, 0, 8], chest: [-18, 0, 8], head: [-34, 0, 10], jaw: [60, 0, 0], 'hips.p': [0.04, -0.08, -0.2], knL: [16, 0, 0], knR: [16, 0, 0], shL: [10, 0, 30], shR: [14, 0, -30], elR: [-20, 0, 0], weapon: [60, 0, 0], lidL: [0.9, 0, 0], lidR: [0.9, 0, 0] });
    const kn = mk(st, { spine: [26, 0, 6], chest: [20, 0, 4], head: [24, 0, 8], jaw: [30, 0, 0], 'hips.p': [0.04, -0.42, -0.05], hipL: [-86, 0, 10], hipR: [-80, 0, -10], knL: [124, 0, 0], knR: [118, 0, 0], ftL: [50, 0, 0], ftR: [50, 0, 0], shL: [-20, 0, 14], shR: [-12, 0, -22], elL: [-30, 0, 0], weapon: [100, 0, 0], lidL: [1.3, 0, 0], lidR: [1.3, 0, 0] });
    const sl = mk(kn, { spine: [70, 0, 6], chest: [30, 0, 6], head: [30, 0, 8], 'hips.p': [0.04, -0.52, 0.12], hipL: [-92, 0, 10], knL: [130, 0, 0], knR: [124, 0, 0], shL: [-70, 0, 30], shR: [-60, 0, -30] });
    apply(P, track([[0, STAND], [0.4, st, 'out'], [1.1, kn, 'in2'], [2.0, sl, 'out'], [2.8, sl, 'io']], t)); } };
  clips.spawn = { dur: 1.6, fn: (t, P) => { const low = mk(STAND, { spine: [34, 0, 0], head: [22, 0, 0], 'hips.p': [0, -0.4, 0.15], hipL: [-60, 0, 8], hipR: [-60, 0, -8], knL: [100, 0, 0], knR: [100, 0, 0], lidL: [1.2, 0, 0], lidR: [1.2, 0, 0], weapon: [40, 0, 0] });
    const pose = mk(STAND, { spine: [-10, 0, 0], head: [-22, 0, 0], jaw: [50, 0, 0], shR: [-130, 0, -20], elR: [-30, 0, 0], shL: [-30, 0, 50], 'ch2.p': [1, 0.6, 0.4], 'ch.p': [0.6, 0, 0] });
    apply(P, track([[0, low], [0.6, STAND, 'out'], [1.0, pose, 'back'], [1.6, STAND, 'io']], t)); } };
  a.clips = clips;

  // ================================================================ RIG LOGIC
  const own_ = {}; let blinkT = 0; let rageTarget = 0; a.userData.rageK = 0; let acc = 0; let lastName = ''; let lastT = 0;
  a.setRage = (on = true) => { rageTarget = on ? 1 : 0; a.userData.rage = !!on; };
  a.isRaged = () => rageTarget > 0.5;
  const wv = new THREE.Vector3(); const toLocal = (w) => a.root.worldToLocal(wv.copy(w));
  const prev = { c: new THREE.Vector3(), v: new THREE.Vector3(), init: false };
  const kick = (n, v) => { const s = a.spring(n, 90, 5); s.kick(Math.max(-9, Math.min(9, v))); return s.x; };
  a.onUpdate = (dt, t) => {
    if (!dt) return;
    a.root.updateMatrixWorld(true);
    if (!own_.skin) { own_.skin = own(a, skin); own_.eye = own(a, eyeM); own_.ruby = own(a, ruby); own_.rubyS = own(a, rubyS); own_.skinC = own_.skin.color.clone(); own_.bomb = null; }
    const rk = a.userData.rageK += (rageTarget - a.userData.rageK) * Math.min(1, dt * 2.2);
    const flare = Math.min(1.2, Math.max(0, ch.position.x)) + rk * 0.25; const shieldK = Math.min(1, Math.max(0, ch.position.y)); const bombVis = ch.position.z > 0.5;
    const ruby0 = Math.max(0, ch2.position.x); const fury = Math.min(1.2, Math.max(0, ch2.position.y)) + rk * 0.6; const steam = Math.max(0, ch2.position.z);
    bombs.forEach((b) => { b.visible = bombVis; });
    // springs: belly, head lag, ears
    chest.getWorldPosition(wv); const cv = wv.clone().sub(prev.c).divideScalar(dt); const ca = cv.clone().sub(prev.v); prev.c.copy(wv); prev.v.copy(cv); if (!prev.init) { prev.init = true; ca.set(0, 0, 0); }
    const bs = kick('belly', -ca.y * 0.9); spine.scale.set(1 + bs * 0.015, 1 + bs * 0.035, 1 - bs * 0.012);
    head.rotation.x += kick('hx', ca.y * 0.8) * 0.01; head.rotation.y += kick('hy', ca.x * 0.8) * 0.01;
    for (const S of ['L', 'R']) J['ear' + S].rotation.z += kick('ear' + S, ca.y * 0.6) * 0.03 * (S === 'L' ? 1 : -1);
    // blinks (lazy, heavy)
    blinkT += dt; const per = 3.8 + 1.6 * Math.sin(t * 0.31); const ph = blinkT % per; const blink = ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI) : 0;
    for (const S of ['L', 'R']) { J['lid' + S].rotation.x += blink * 1.4 + (rk > 0.5 ? -0.3 * rk : 0); J['eye' + S].rotation.y = Math.sin(t * 0.5 + (S === 'L' ? 0.3 : 0)) * 0.12; J['eye' + S].rotation.x = Math.sin(t * 0.37) * 0.04; }
    // rage: skin flush, eyes, ruby
    own_.skin.color.copy(own_.skinC).lerp(new THREE.Color(1.6, 0.55, 0.4), rk * 0.55);
    own_.eye.emissive.setRGB(1, 0.78 - 0.7 * rk, 0.15 - 0.1 * rk); own_.eye.emissiveIntensity = 0.9 + fury * 1.8 + (rk > 0.1 ? (1.2 * rk + 0.4 * Math.sin(t * 9) * rk) : 0); own_.eye.userData.emissiveI0 = own_.eye.emissiveIntensity; own_.eye.userData.emissive0.copy(own_.eye.emissive);
    const rb = 0.9 + ruby0 * 2.6 + rk * 3 + 0.35 * Math.sin(t * 6.3); own_.ruby.emissiveIntensity = rb; own_.ruby.userData.emissiveI0 = rb; own_.ruby.emissive.setRGB(1, 0.05 + rk * 0.8, 0.1 + rk * 0.75); own_.ruby.userData.emissive0.copy(own_.ruby.emissive);
    rubyLight.intensity = 0.3 + ruby0 * 0.9 + rk * 1.2 + 0.12 * Math.sin(t * 11.3) + 0.08 * Math.sin(t * 5.1); rubyLight.color.setRGB(1, 0.15 + rk * 0.6, 0.2 + rk * 0.55);
    // shield aura
    shield.visible = shieldK > 0.01; if (shield.visible) { shield.scale.setScalar(0.6 + 0.4 * shieldK); shieldM.opacity = shieldK * (0.16 + 0.05 * Math.sin(t * 6)); shield.rotation.z = t * 0.4; shield.userData.t = t; }
    // cloak physics (fixed substeps)
    simAcc += Math.min(dt, 0.05); while (simAcc >= 1 / 60) { simAcc -= 1 / 60; stepCloak(1 / 60, flare, rk, t); }
    cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
    // flames on the crown (rage), embers on the cloak, sparkles from the ruby
    const emit = (p, o) => flame.emit({ pos: [p.x, p.y, p.z], ...o });
    if (a.alive && rk > 0.05) {
      acc += dt * (50 * rk); while (acc >= 1) { acc -= 1; const an = R() * 6.283; a.anchors.crown.getWorldPosition(wv); wv.x += Math.sin(an) * 0.17; wv.z += Math.cos(an) * 0.17; wv.y -= 0.05; toLocal(wv);
        emit(wv, { vel: [rr(-0.15, 0.15), rr(0.8, 1.6), rr(-0.15, 0.15)], life: rr(0.45, 0.9), size: rr(0.1, 0.17), sizeEnd: 0.03, color: 0xffd060, colorEnd: 0xff3000, alpha: 0.9, kind: 1, add: 1, rise: 1.6, drag: 0.8, turb: 0.6 });
        if (R() < 0.35) emit(wv, { vel: [rr(-0.2, 0.2), rr(0.6, 1.0), rr(-0.2, 0.2)], life: rr(0.9, 1.5), size: 0.12, sizeEnd: 0.5, color: 0x3a2a24, colorEnd: 0x1a1412, alpha: 0.35, rise: 0.8, drag: 0.8 }); }
      if (R() < rk * 0.5) { const k = ((R() * nC * nR) | 0) * 3; emit(wv.set(cloakPos[k], cloakPos[k + 1], cloakPos[k + 2]), { vel: [rr(-0.2, 0.2), rr(0.5, 1.2), rr(-0.4, 0.1)], life: rr(0.7, 1.4), size: 0.045, sizeEnd: 0.01, color: 0xffa030, colorEnd: 0xff2000, alpha: 1, kind: 1, add: 1, rise: 0.8, drag: 0.7 }); }
    }
    if (a.alive && (steam > 0.2 || ruby0 > 0.7) && R() < dt * 30) { a.anchors.ruby.getWorldPosition(wv); toLocal(wv); emit(wv, { vel: [rr(-0.4, 0.4), rr(0.2, 0.8), rr(-0.4, 0.4)], life: rr(0.5, 1.0), size: 0.05, sizeEnd: 0.01, color: rk > 0.4 ? 0xffffff : 0xff4060, colorEnd: 0xff2020, alpha: 1, kind: 1, add: 1, rise: 0.5, drag: 0.8 }); }
    // coin burst on hurt/impact events and crown shockwave embers at rage peak
    const cur = a.animator.cur;
    if (cur) { if (cur.name !== lastName) { lastName = cur.name; lastT = 0; }
      const ct = cur.t; const dust = (p, n, sp) => { for (let i = 0; i < n; i++) { const an = (i / n) * 6.283 + R(); flame.emit({ pos: [p.x + Math.cos(an) * 0.15, 0.06, p.z + Math.sin(an) * 0.15], vel: [Math.cos(an) * sp * rr(0.5, 1.3), rr(0.1, 0.5), Math.sin(an) * sp * rr(0.5, 1.3)], life: rr(0.9, 1.5), size: rr(0.25, 0.4), sizeEnd: rr(0.9, 1.4), color: 0x6b5c48, colorEnd: 0x3a3028, alpha: 0.45, rise: 0.15, drag: 1.6, turb: 0.4 }); } };
      if ((cur.name === 'slam' && lastT < 1.4 && ct >= 1.4) || (cur.name === 'attack' && lastT < 0.72 && ct >= 0.72)) { a.anchors.weapon.getWorldPosition(wv); wv.y = 0; toLocal(wv); dust(wv, cur.name === 'slam' ? 20 : 10, cur.name === 'slam' ? 2.2 : 1.4); for (let i = 0; i < 14; i++) { const an = R() * 6.283; flame.emit({ pos: [wv.x, 0.1, wv.z], vel: [Math.cos(an) * rr(0.5, 2.6), rr(1.5, 3.8), Math.sin(an) * rr(0.5, 2.6)], life: rr(0.5, 1.1), size: 0.05, sizeEnd: 0.01, color: 0xffd040, colorEnd: 0xff5010, alpha: 1, kind: 1, add: 1, rise: -5, drag: 0.6 }); } }
      if (cur.name === 'rage' && lastT < 1.05 && ct >= 1.05) { for (let i = 0; i < 40; i++) { const an = (i / 40) * 6.283; flame.emit({ pos: [0, 0.2, 0], vel: [Math.cos(an) * 4.5, rr(0.2, 0.8), Math.sin(an) * 4.5], life: 0.8, size: rr(0.15, 0.3), sizeEnd: 0.05, color: 0xffb040, colorEnd: 0xff2000, alpha: 0.9, kind: 1, add: 1, rise: 0, drag: 2.2 }); } }
      lastT = ct; }
    flame.update(dt);
  };
  withEvents(a);
  a.finalize();
  return a;
}
