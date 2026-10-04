// The Hill Ogre (Act I elite). A 3.2 m pot-bellied brute: sculpted from smooth-blended distance fields
// (see parts2.js), dressed with hundreds of merged details, animated with a heavy FK rig + runtime IK
// so both fists grip the club during the Wind-Up. Moves: Club, Stomp, Wind-Up (charge), Slam, Roar.
//
// Extras: a.on('hit'|'shake', fn) subscribes to clip events; clips 'stomp' and 'slam' emit 'shake' at impact.
import * as THREE from 'three';
import { Actor } from './base.js';
import { mat, solid } from '../mats.js';
import { sinT, ramp01 } from '../rig.js';
import { Field, shellField, unionField, meshField, Merge, Puffs, place, solveArm, withEvents, own, rng as mkRng, smoothstep } from './parts2.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;
const rotM = (x, y, z) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
const trM = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const SKIN = { belly: 0xcfc4a2, scar: 0xd6a08e, dark: 0x8a7a64, mud: 0x6a5a40, pale: 0xcfc4a0 };

export function create({ seed = 1, quality = 'high' } = {}) {
  const QK = quality === 'low' ? 3.0 : quality === 'med' ? 2.5 : 2.0; // body skin cell scale
  const QF = quality === 'low' ? 2.2 : quality === 'med' ? 1.7 : 1.4; // face cell scale
  const HQ = quality === 'high' ? 0.7 : quality === 'med' ? 0.45 : 0.25; // detail-count multiplier
  const R = mkRng(seed * 7919 + 17);
  const rr = (a, b) => a + (b - a) * R();
  const a = new Actor({ name: 'ogre', height: 3.2, radius: 1.1 });
  const ABS = {};
  const jt = (name, parent, x, y, z) => { const p = parent ? ABS[parent.name] : [0, 0, 0]; ABS[name] = [x, y, z]; return a.joint(name, parent || a.model, x - p[0], y - p[1], z - p[2]); };

  // ---------------------------------------------------------------- joints (model-space absolute positions)
  const hips = jt('hips', null, 0, 1.25, 0);
  const spine = jt('spine', hips, 0, 1.4, 0);
  const chest = jt('chest', spine, 0, 1.85, 0);
  const neck = jt('neck', chest, 0, 2.42, 0.08);
  const head = jt('head', neck, 0, 2.56, 0.26);
  const jaw = jt('jaw', head, 0, 2.5, 0.27);
  const C = [0, 2.6, 0.3]; // head centre
  const side = { R: -1, L: 1 };
  const J = {};
  for (const [S, sx] of Object.entries(side)) {
    J['sh' + S] = jt('sh' + S, chest, sx * 0.92, 2.12, 0);
    J['el' + S] = jt('el' + S, J['sh' + S], sx * 0.92, 1.3, 0);
    J['hand' + S] = jt('hand' + S, J['el' + S], sx * 0.92, 0.36, 0.06);
    J['hip' + S] = jt('hip' + S, hips, sx * 0.4, 1.18, 0);
    J['kn' + S] = jt('kn' + S, J['hip' + S], sx * 0.42, 0.66, 0.08);
    J['ft' + S] = jt('ft' + S, J['kn' + S], sx * 0.42, 0.14, 0.0);
    J['brow' + S] = jt('brow' + S, head, sx * 0.14, C[1] + 0.06, C[2] + 0.21);
    J['eye' + S] = jt('eye' + S, head, sx * 0.115, C[1], C[2] + 0.245);
    J['lid' + S] = jt('lid' + S, head, sx * 0.115, C[1], C[2] + 0.245);
    J['lid' + S].rotation.x = -1.15; // rest: open (rotated up under the brow)
    J['ear' + S] = jt('ear' + S, head, sx * 0.27, C[1] + 0.02, C[2] - 0.02);
  }
  const ch = jt('ch', null, 0, 0, 0); // animation channels: x = left-hand IK weight, y = eye fury, z = steam
  const weapon = jt('weapon', J.handR, -0.92, 0.36, 0.06);
  weapon.rotation.x = 1.05; // rest: club points forward-up out of the fist
  const ch2 = jt('ch2', null, 0, 0, 0); // x = left-grip offset along the shaft, y = eye fury, z = steam rate
  const clubFree = jt('clubFree', null, 0, 0, 0); // animated club transform (model space) used by two-handed moves
  a.root.updateMatrixWorld(true);
  const club = new THREE.Group(); club.name = 'club'; a.model.add(club);
  club.matrixAutoUpdate = false; club.matrix.copy(weapon.matrixWorld); club.updateMatrixWorld(true);
  // swinging bits (springs drive these)
  const flap = {
    F: jt('flapF', hips, 0, 1.19, 0.74), B: jt('flapB', hips, 0, 1.15, -0.62), L: jt('flapL', hips, 0.62, 1.15, 0.2), R: jt('flapR', hips, -0.62, 1.15, 0.2),
  };
  const trophy = { A: jt('trophyA', spine, -0.4, 1.2, 0.72), B: jt('trophyB', spine, 0.42, 1.2, 0.7), C: jt('trophyC', spine, 0.0, 1.2, -0.7) };
  const chain = jt('chain', J.handL, 0.92, 0.5, 0.2);
  const chain2 = jt('chain2', chain, 0.92, 0.38, 0.2);

  // ---------------------------------------------------------------- materials
  const skin = mat('ogreHideB', { vertexColors: true, roughness: 0.95 });
  const bone = mat('bone', { vertexColors: true, roughness: 0.85 });
  const iron = mat('iron', { vertexColors: true, roughness: 1.2, side: THREE.DoubleSide });
  const rust = mat('rust', { vertexColors: true, roughness: 1.0, side: THREE.DoubleSide });
  const leather = mat('leatherDark', { vertexColors: true, side: THREE.DoubleSide });
  const hairM = mat('furDark', { vertexColors: true, side: THREE.DoubleSide });
  const cloth = mat('cloth', { vertexColors: true, side: THREE.DoubleSide, tint: 0xa89a78, dark: 0x4a3e28 });
  const barkM = mat('bark', { vertexColors: true, roughness: 1 });
  const eyeM = solid(0xffa626, { rough: 0.3, emissive: 0xff7a10, ei: 1.1 });
  const pupilM = solid(0x0a0604, { rough: 0.3 });
  const mouthM = solid(0x3a0f12, { rough: 0.5 });
  const tongueM = solid(0x8a3a3c, { rough: 0.5 });
  const nailM = solid(0x2a2218, { rough: 0.6 });

  const M = new Merge(a);
  const skinOpt = { uvScale: 0.9, ao: 0.9 };
  const lump = { seed, lump: 0.012, lumpFreq: 6, mottle: 0.4 };
  const FLD = {};
  const grime = (x, y, z, c) => { const g = smoothstep(0.75, 0.0, y); c.multiplyScalar((0.72 + 0.28 * Math.sin(x * 9 + 1) * Math.sin(y * 7 + z * 5)) * (1 - g * 0.5)); c.lerp(new THREE.Color(0x4a3c28), g * 0.25); };
  const mesh = (key, f, joint, o = {}) => { FLD[key] = f; M.push(joint, o.mat || skin, meshField(f, { shade: grime, ...skinOpt, ...o, h: (o.h || 0.035) * (o.h && o.h < 0.02 ? QF : QK) }), null); };

  // ================================================================ BODY FIELDS
  { const f = new Field(lump);
    f.ell([0, 1.18, -0.02], [0.52, 0.36, 0.44], { k: 0.12 }).ell([0, 1.1, -0.2], [0.5, 0.34, 0.3], { k: 0.12 });
    f.sph([-0.4, 1.12, 0], 0.3, { k: 0.12 }).sph([0.4, 1.12, 0], 0.3, { k: 0.12 });
    mesh('hips', f, hips, { h: 0.04 }); }
  { const f = new Field(lump);
    f.ell([0, 1.5, 0.26], [0.7, 0.58, 0.62], { k: 0.2, tint: SKIN.belly, tw: 0.8 });
    f.ell([0, 1.28, 0.34], [0.5, 0.3, 0.46], { k: 0.15, tint: SKIN.belly, tw: 0.8 });
    f.ell([0, 1.55, -0.18], [0.55, 0.42, 0.38], { k: 0.2 });
    f.sph([-0.55, 1.45, 0.0], 0.3, { k: 0.2 }).sph([0.55, 1.45, 0.0], 0.3, { k: 0.2 });
    f.sph([0, 1.5, 0.88], 0.05, { sub: true, k: 0.05 });
    f.stain([0, 1.5, 0.9], 0.16, 0x3a2a1c, 0.55);
    mesh('belly', f, spine, { h: 0.04 }); }
  { const f = new Field(lump);
    f.ell([0, 2.0, 0.04], [0.74, 0.5, 0.55], { k: 0.2 });
    f.ell([-0.34, 2.0, 0.43], [0.32, 0.24, 0.2], { k: 0.12 }).ell([0.34, 2.0, 0.43], [0.32, 0.24, 0.2], { k: 0.12 });
    f.ell([0, 2.3, -0.25], [0.62, 0.34, 0.42], { k: 0.2 });
    f.cap([0, 2.3, -0.15], [-0.72, 2.2, -0.04], 0.26, 0.28, { k: 0.15 }).cap([0, 2.3, -0.15], [0.72, 2.2, -0.04], 0.26, 0.28, { k: 0.15 });
    f.cap([0, 2.25, 0.02], [0, 2.52, 0.26], 0.3, 0.22, { k: 0.15 });
    f.ell([0, 1.95, -0.25], [0.7, 0.5, 0.35], { k: 0.2 });
    mesh('chest', f, chest, { h: 0.04 }); }
  // --- head (cranium, snout, nose, cheeks, ears) ; brows and jaw are separate so they can animate
  { const f = new Field({ ...lump, lump: 0.006, lumpFreq: 9 });
    f.ell([C[0], C[1] + 0.04, C[2] - 0.04], [0.27, 0.25, 0.27], { k: 0.1 });
    for (const sx of [-1, 1]) {
      f.sph([sx * 0.2, C[1] - 0.07, C[2] + 0.18], 0.1, { k: 0.08 });
      f.sph([sx * 0.115, C[1] + 0.0, C[2] + 0.25], 0.062, { sub: true, k: 0.03 });
      f.ell([sx * 0.3, C[1] + 0.02, C[2] - 0.02], [0.045, 0.14, 0.09], { k: 0.05, rot: [0, 0, sx * -0.2] });
      f.sph([sx * 0.045, C[1] - 0.115, C[2] + 0.43], 0.03, { sub: true, k: 0.02 });
    }
    f.ell([0, C[1] - 0.1, C[2] + 0.22], [0.17, 0.11, 0.13], { k: 0.08 });
    f.ell([0, C[1] - 0.06, C[2] + 0.35], [0.085, 0.075, 0.08], { k: 0.05 });
    mesh('head', f, head, { h: 0.019, aoSamples: [0.03, 0.07, 0.15] }); }
  { const f = new Field({ ...lump, lump: 0.006, lumpFreq: 9 });
    f.ell([0, C[1] - 0.22, C[2] + 0.27], [0.2, 0.11, 0.15], { k: 0.08 });
    for (const sx of [-1, 1]) f.cap([sx * 0.2, C[1] - 0.12, C[2] + 0.02], [sx * 0.12, C[1] - 0.22, C[2] + 0.34], 0.07, 0.08, { k: 0.06 });
    mesh('jaw', f, jaw, { h: 0.019 }); }
  for (const [S, sx] of Object.entries(side)) {
    { const f = new Field({ ...lump, lump: 0.006, lumpFreq: 9 });
      f.cap([sx * 0.265, C[1] + 0.085, C[2] + 0.17], [sx * 0.04, C[1] + 0.05, C[2] + 0.27], 0.07, 0.075, { k: 0.06 });
      f.sph([sx * 0.2, C[1] + 0.1, C[2] + 0.17], 0.075, { k: 0.05 });
      mesh('brow' + S, f, J['brow' + S], { h: 0.014, aoSamples: [0.03, 0.07, 0.15] }); }
    { const f = new Field(lump);
      f.sph([sx * 0.92, 2.12, 0], 0.36, { k: 0.1 });
      f.cap([sx * 0.92, 2.1, 0], [sx * 0.92, 1.32, 0], 0.3, 0.22, { k: 0.1 });
      f.ell([sx * 0.92, 1.8, 0.12], [0.22, 0.3, 0.2], { k: 0.1 }).ell([sx * 0.92, 1.8, -0.12], [0.2, 0.3, 0.18], { k: 0.1 });
      mesh('arm' + S, f, J['sh' + S], { h: 0.04 }); }
    { const f = new Field(lump);
      f.sph([sx * 0.92, 1.3, 0], 0.22, { k: 0.05 });
      f.cap([sx * 0.92, 1.3, 0], [sx * 0.92, 0.5, 0.04], 0.24, 0.17, { k: 0.1 });
      f.ell([sx * 0.92, 1.0, 0.05], [0.24, 0.3, 0.22], { k: 0.1 });
      f.ell([sx * 0.92, 0.34, 0.06], [0.2, 0.2, 0.22], { k: 0.08, tint: SKIN.dark, tw: 0.5 });
      for (let i = 0; i < 4; i++) f.sph([sx * 0.92 + (i - 1.5) * 0.085, 0.4 - Math.abs(i - 1.5) * 0.015, 0.27], 0.065, { k: 0.04, tint: SKIN.dark, tw: 0.6 });
      f.cap([sx * 0.76, 0.5, 0.2], [sx * 0.8, 0.34, 0.26], 0.06, 0.06, { k: 0.05 });
      mesh('fore' + S, f, J['el' + S], { h: 0.035 }); }
    { const f = new Field(lump);
      f.cap([sx * 0.4, 1.15, 0], [sx * 0.42, 0.7, 0.08], 0.31, 0.22, { k: 0.1 });
      f.ell([sx * 0.52, 0.95, 0], [0.2, 0.3, 0.25], { k: 0.1 });
      f.sph([sx * 0.42, 0.66, 0.08], 0.22, { k: 0.05 });
      mesh('thigh' + S, f, J['hip' + S], { h: 0.04 }); }
    { const f = new Field(lump);
      f.sph([sx * 0.42, 0.66, 0.08], 0.22, { k: 0.05 });
      f.cap([sx * 0.42, 0.66, 0.08], [sx * 0.42, 0.16, 0.0], 0.22, 0.14, { k: 0.1 });
      f.ell([sx * 0.42, 0.45, -0.1], [0.2, 0.2, 0.18], { k: 0.1 });
      mesh('shin' + S, f, J['kn' + S], { h: 0.035 }); }
    { const f = new Field({ ...lump, lump: 0.008 });
      f.sph([sx * 0.42, 0.15, 0], 0.15, { k: 0.05 }).ell([sx * 0.42, 0.1, -0.1], [0.17, 0.1, 0.14], { k: 0.08 });
      f.ell([sx * 0.42, 0.09, 0.2], [0.24, 0.09, 0.3], { k: 0.08 });
      for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * 0.11; f.cap([sx * 0.42 + ox, 0.09, 0.42], [sx * 0.42 + ox * 1.25, 0.065, 0.58 - Math.abs(i - 1.5) * 0.03], 0.07, 0.06, { k: 0.04 }); }
      mesh('foot' + S, f, J['ft' + S], { h: 0.03 }); }
  }

  // ================================================================ DETAILS
  const coneG = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
  const sphG = new THREE.SphereGeometry(1, 6, 4);
  const cylG = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
  const col = (h, v = 0.12) => new THREE.Color(h).multiplyScalar(1 - v + R() * v * 2);
  const A3 = (v) => [v.x, v.y, v.z];
  const hairCols = [0x3a3026, 0x2a221c, 0x4a3e30, 0x5a5044, 0x6a6458];
  // --- coarse hair patches (hump, neck, forearms, shins, shoulders, head crest, chest) -- the "mange"
  const hairPatch = (F, joint, box, n, test, len = [0.07, 0.15], thick = 0.005) => {
    const pts = F.scatter(Math.round(n * HQ), box, test, R);
    for (const { p, n: nn } of pts) {
      const dir = [nn.x * 0.6 + rr(-0.25, 0.25), nn.y * 0.6 + 0.0 + rr(-0.25, 0.1), nn.z * 0.6 + rr(-0.25, 0.25)];
      const L = rr(len[0], len[1]);
      M.strand(joint, hairM, A3(p), dir, L, thick * rr(0.8, 1.4), { bend: [rr(-0.1, 0.1), -rr(0.2, 0.6), rr(-0.1, 0.1)], rings: 3, radial: 3, color: col(hairCols[(R() * hairCols.length) | 0], 0.15), r1: 0.1 });
    }
  };
  hairPatch(FLD.chest, chest, [[-0.7, 2.15, -0.5], [0.7, 2.6, 0.0]], 150, (p, n) => n.y > 0.1 && n.z < 0.3, [0.1, 0.2], 0.006);          // hump / back mane
  hairPatch(FLD.chest, chest, [[-0.4, 1.9, 0.3], [0.4, 2.2, 0.6]], 70, (p, n) => n.z > 0.5, [0.04, 0.09], 0.0045);                        // chest tufts
  hairPatch(FLD.head, head, [[-0.2, 2.78, 0.1], [0.2, 2.95, 0.4]], 50, (p, n) => n.y > 0.4, [0.06, 0.14], 0.006);                         // crest
  for (const [S, sx] of Object.entries(side)) {
    hairPatch(FLD['fore' + S], J['el' + S], [[sx * 0.7, 0.55, -0.25], [sx * 1.15, 1.25, 0.25]], 90, (p, n) => true, [0.04, 0.1], 0.0045);
    hairPatch(FLD['shin' + S], J['kn' + S], [[sx * 0.15, 0.25, -0.35], [sx * 0.7, 0.62, 0.3]], 70, (p, n) => true, [0.04, 0.09], 0.0045);
    hairPatch(FLD['arm' + S], J['sh' + S], [[sx * 0.5, 1.6, -0.4], [sx * 1.3, 2.4, 0.3]], 50, (p, n) => n.y > -0.2, [0.05, 0.11], 0.005);
  }
  hairPatch(FLD.belly, spine, [[-0.5, 1.2, 0.5], [0.5, 1.6, 0.9]], 36, (p, n) => true, [0.03, 0.07], 0.004);
  // --- warts
  const wartCount = Math.round(46 * HQ);
  for (const [key, joint, box] of [['chest', chest, [[-0.7, 1.7, -0.5], [0.7, 2.5, 0.5]]], ['belly', spine, [[-0.6, 1.1, -0.4], [0.6, 1.7, 0.8]]], ['head', head, [[-0.28, 2.4, 0.0], [0.28, 2.85, 0.5]]]]) {
    for (const { p, n } of FLD[key].scatter(key === 'head' ? 10 : Math.round(wartCount / 2), box, null, R)) {
      const s = key === 'head' ? rr(0.008, 0.018) : rr(0.014, 0.034);
      M.push(joint, skin, sphG, place(A3(p), A3(n), [s, s * 0.7, s]).multiply(new THREE.Matrix4().makeTranslation(0, -0.1, 0)), col(0xcdb58f, 0.1));
    }
  }
  // --- scars with stitches
  const stitch = (F, joint, A, B, n = 7, w = 0.04) => {
    const pa = V(...A); const pb = V(...B); const dir = pb.clone().sub(pa).normalize();
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const q = F.project(pa.clone().lerp(pb, i / n), 6);
      const sd = new THREE.Vector3().crossVectors(q.n, dir).normalize();
      if (prev) { // ridge
        const seg = q.p.clone().sub(prev.p); M.strand(joint, skin, A3(prev.p.clone().addScaledVector(prev.n, -0.002)), A3(seg.clone().normalize()), seg.length(), 0.014, { rings: 1, radial: 5, color: SKIN.scar, r1: 1 });
      }
      if (i > 0 && i < n) { // thread across the wound
        const c0 = q.p.clone().addScaledVector(q.n, 0.008);
        M.strand(joint, leather, A3(c0.clone().addScaledVector(sd, -w)), A3(sd), w * 2, 0.0042, { rings: 2, radial: 3, color: 0x120c08, r1: 1, bend: A3(q.n.clone().multiplyScalar(0.01)) });
        M.push(joint, leather, sphG, place(A3(c0.clone().addScaledVector(sd, w)), A3(q.n), 0.007), 0x120c08);
        M.push(joint, leather, sphG, place(A3(c0.clone().addScaledVector(sd, -w)), A3(q.n), 0.007), 0x120c08);
      }
      prev = q;
    }
  };
  stitch(FLD.belly, spine, [0.28, 1.72, 0.58], [0.1, 1.2, 0.86], 9, 0.04);      // across the belly
  stitch(FLD.chest, chest, [-0.45, 2.25, 0.3], [-0.2, 1.75, 0.52], 7, 0.035);   // chest
  stitch(FLD.head, head, [-0.05, C[1] + 0.2, C[2] + 0.16], [-0.17, C[1] + 0.2, C[2] + 0.02], 5, 0.02); // scalp
  stitch(FLD.forearmL || FLD.foreL, J.elL, [0.98, 1.35, 0.2], [0.98, 0.85, 0.24], 6, 0.035);
  stitch(FLD.shinR, J.knR, [-0.45, 0.4, 0.15], [-0.4, 0.25, 0.14], 4, 0.03);
  // old claw scars / bruises as stains
  FLD.belly.stain([-0.3, 1.4, 0.8], 0.2, 0x7a4a52, 0.35);

  // --- FACE: eyes, lids, teeth, tusks, nose ring, ear bolt
  for (const [S, sx] of Object.entries(side)) {
    const ej = J['eye' + S]; const e0 = ABS['eye' + S];
    M.push(ej, eyeM, new THREE.SphereGeometry(0.043, 14, 10), place(e0, [0, 0, 1], 1).multiply(new THREE.Matrix4().identity()));
    M.push(ej, pupilM, new THREE.SphereGeometry(0.014, 8, 6), new THREE.Matrix4().makeTranslation(e0[0] + sx * -0.006, e0[1] - 0.004, e0[2] + 0.04));
    const lid = new THREE.SphereGeometry(0.052, 16, 10, 0, Math.PI * 2, 0, 1.95);
    M.push(ej, skin, lid, new THREE.Matrix4().makeTranslation(e0[0], e0[1], e0[2]), col(0xb89c78, 0.05));
  }
  // lower teeth + tusks (jaw), upper teeth (head)
  const tooth = (joint, p, dir, len, r, tint) => M.strand(joint, bone, p, dir, len, r, { rings: 2, radial: 5, color: tint, r1: 0.25, bend: [dir[0] * 0.0, 0.04, 0.0] });
  const jawZ = C[2]; const jawY = C[1];
  for (let i = 0; i < 9; i++) {
    const t = (i / 8) * 2 - 1; const x = t * 0.15; const z = jawZ + 0.33 + (1 - Math.abs(t)) * 0.07 - Math.abs(t) ** 2 * 0.04;
    const L = rr(0.02, 0.05) * (1 - Math.abs(t) * 0.3);
    if (Math.abs(t) > 0.5 || i % 2 === 0) tooth(jaw, [x, jawY - 0.155, z - 0.02], [x * 0.2, 1, 0.1], L, 0.011 * rr(0.8, 1.3), col(0xb9a77c, 0.2));
  }
  for (let i = 0; i < 6; i++) {
    const t = (i / 5) * 2 - 1; const x = t * 0.115; const z = jawZ + 0.4;
    tooth(head, [x, jawY - 0.19, z - 0.05 - Math.abs(t) * 0.04], [0, -1, 0.1], rr(0.015, 0.035), 0.009, col(0xc2b088, 0.2));
  }
  for (const sx of [-1, 1]) { // broken tusks
    const base = [sx * 0.118, jawY - 0.165, jawZ + 0.385];
    M.strand(jaw, bone, base, [sx * 0.15, 1, 0.45], 0.16, 0.034, { rings: 5, radial: 8, bend: [sx * 0.2, 0.06, 0.25], color: 0xcdbf98, r1: 0.45 });
    M.strand(jaw, bone, [base[0] + sx * 0.012, base[1] + 0.13, base[2] + 0.055], [sx * 0.25, 1, 0.6], 0.04, 0.012, { rings: 1, radial: 4, color: 0xb0a07a, r1: 0.2 }); // splinter
    M.push(jaw, mouthM, new THREE.CircleGeometry(0.02, 8), new THREE.Matrix4().makeTranslation(base[0], base[1] + 0.1, base[2] + 0.04), 0x000000);
  }
  // mouth interior: dark cavity + tongue (visible when the jaw opens)
  M.push(jaw, mouthM, sphG, new THREE.Matrix4().compose(V(0, jawY - 0.13, jawZ + 0.2), new THREE.Quaternion(), V(0.12, 0.05, 0.15)));
  M.push(jaw, tongueM, sphG, new THREE.Matrix4().compose(V(0, jawY - 0.15, jawZ + 0.22), new THREE.Quaternion(), V(0.07, 0.03, 0.1)));
  M.push(head, mouthM, sphG, new THREE.Matrix4().compose(V(0, jawY - 0.16, jawZ + 0.2), new THREE.Quaternion(), V(0.12, 0.035, 0.14)));
  // nose ring (rusted iron) through the septum
  M.push(head, rust, new THREE.TorusGeometry(0.052, 0.0105, 8, 20), new THREE.Matrix4().compose(V(0, jawY - 0.15, jawZ + 0.42), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0)), V(1, 1.1, 1)));
  // ear: rusted bolt + nut through the left ear, ring in the right
  M.push(J.earL, rust, new THREE.CylinderGeometry(0.011, 0.011, 0.16, 8), new THREE.Matrix4().compose(V(0.3, C[1] + 0.06, C[2] - 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), V(1, 1, 1)));
  M.push(J.earL, rust, new THREE.CylinderGeometry(0.026, 0.026, 0.014, 6), new THREE.Matrix4().compose(V(0.38, C[1] + 0.06, C[2] - 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), V(1, 1, 1)));
  M.push(J.earL, rust, new THREE.CylinderGeometry(0.03, 0.03, 0.01, 8), new THREE.Matrix4().compose(V(0.226, C[1] + 0.06, C[2] - 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), V(1, 1, 1)));
  M.push(J.earR, iron, new THREE.TorusGeometry(0.04, 0.008, 6, 14), new THREE.Matrix4().compose(V(-0.3, C[1] - 0.06, C[2] - 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), V(1, 1, 1)));

  // ================================================================ PROPS & CLOTHING
  const pelvisShape = new Field({}); pelvisShape.ell([0, 1.18, -0.02], [0.52, 0.36, 0.44], { k: 0.12 }).ell([0, 1.1, -0.2], [0.5, 0.34, 0.3], { k: 0.12 });
  const torsoAll = unionField([FLD.belly, pelvisShape, FLD.chest], 0.12);
  const bnd = (lo, hi) => [lo, hi];
  const studG = new THREE.SphereGeometry(1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2); // dome stud, base at y=0, up +Y
  const spikeG = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
  const ringsAround = (F, joint, mtl, yy, n, rad, off, size, from = [0, 0, 0], jitter = 0, aoff = 0) => {
    for (let i = 0; i < n; i++) {
      const ang = aoff + (i / n) * Math.PI * 2; const dir = [Math.sin(ang), jitter * rr(-1, 1), Math.cos(ang)];
      const h = F.shoot([from[0], yy, from[2]], dir, 1.6); if (!h) continue;
      M.push(joint, mtl, studG, place(A3(h.p.clone().addScaledVector(h.n, off)), A3(h.n), size), col(0x8a8a90, 0.15));
    }
  };
  // ---- skull geometry (shared): face +Z, ~0.17 m wide
  const skullGeo = (() => {
    const f = new Field({ seed: 5, lump: 0.0025, lumpFreq: 25 });
    f.ell([0, 0.012, -0.006], [0.07, 0.066, 0.078], { k: 0.02 }).ell([0, -0.042, 0.046], [0.046, 0.04, 0.042], { k: 0.02 }).ell([0, -0.076, 0.035], [0.03, 0.022, 0.034], { k: 0.012 });
    for (const sx of [-1, 1]) { f.sph([sx * 0.042, -0.03, 0.05], 0.016, { k: 0.015 }); f.sph([sx * 0.028, -0.006, 0.063], 0.022, { sub: true, k: 0.01 }); f.sph([sx * 0.02, -0.088, 0.062], 0.013, { sub: true, k: 0.008 }); }
    f.ell([0, -0.04, 0.086], [0.01, 0.018, 0.012], { sub: true, k: 0.008 });
    return meshField(f, { h: 0.022 * QK / 1.35, uvScale: 5, ao: 0.9, aoSamples: [0.015, 0.04, 0.08] });
  })();
  const skullAt = (joint, p, n, s = 1, roll = 0, up = [0, 1, 0], pre = null) => {
    const f = V(...n).normalize(); const u0 = V(...up); const u = u0.sub(f.clone().multiplyScalar(u0.dot(f))); if (u.lengthSq() < 1e-4) u.set(0, 0, 1).sub(f.clone().multiplyScalar(f.z)); u.normalize();
    const r = u.clone().cross(f).normalize(); const mtx = new THREE.Matrix4().makeBasis(r, u, f).multiply(rotM(0, 0, roll)); mtx.scale(V(s, s, s)); mtx.setPosition(...p);
    M.push(joint, bone, skullGeo, pre ? pre.clone().multiply(mtx) : mtx, col(0x9a8e74, 0.1)); };
  // ---- belt (studded leather) with buckle + trophies
  const belt = shellField(torsoAll, { off: 0.012, t: 0.034, region: (x, y) => Math.abs(y - 1.2) - 0.085, bevel: 0.012, bounds: [[-1, 1.0, -0.9], [1, 1.4, 1.1]],
    colorAt: (x, y, z, o) => { o.setRGB(1, 1, 1); o.multiplyScalar(0.8 + 0.2 * Math.sin(x * 40 + z * 31)); } });
  M.push(spine, leather, meshField(belt, { h: 0.03 * QK / 1.35, uvScale: 1.6, ao: 0.6, aoSamples: [0.02, 0.05] }), null);
  ringsAround(torsoAll, spine, iron, 1.245, Math.round(34 * HQ + 8), 0, 0.05, 0.014, [0, 0, 0.0]);
  ringsAround(torsoAll, spine, iron, 1.155, Math.round(34 * HQ + 8), 0, 0.05, 0.014, [0, 0, 0.0], 0, 0.05);
  { // buckle plate: iron slab + central boss + rusty rivets
    const h = torsoAll.shoot([0, 1.2, 0], [0, 0, 1], 1.4);
    M.push(spine, iron, new THREE.BoxGeometry(0.2, 0.17, 0.03), new THREE.Matrix4().compose(V(0, 1.2, h.p.z + 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0)), V(1, 1, 1)));
    M.push(spine, rust, studG, place([0, 1.2, h.p.z + 0.068], [0, 0.12, 1], 0.05), col(0xb06a30, 0.1));
    for (const [dx, dy] of [[-0.075, -0.06], [0.075, -0.06], [-0.075, 0.06], [0.075, 0.06]]) M.push(spine, rust, studG, place([dx, 1.2 + dy, h.p.z + 0.066], [0, 0.1, 1], 0.012));
  }
  // trophies: skulls on thongs hanging from the belt (their joints swing)
  const hang = (joint, p, len, kind) => {
    M.strand(joint, leather, p, [0, -1, 0], len, 0.006, { rings: 2, radial: 3, r1: 1, color: 0x1a120c });
    const q = [p[0], p[1] - len, p[2]];
    if (kind === 'skull') skullAt(joint, [q[0], q[1] - 0.05, q[2] + 0.02], [0, 0, 1], 0.9, rr(-0.3, 0.3));
    if (kind === 'bone') { M.push(joint, bone, new THREE.CylinderGeometry(0.014, 0.014, 0.22, 7), new THREE.Matrix4().compose(V(q[0], q[1] - 0.1, q[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0.3)), V(1, 1, 1)), 0xcfc2a4); for (const s of [1, -1]) M.push(joint, bone, sphG, new THREE.Matrix4().compose(V(q[0] - s * 0.027, q[1] - 0.1 + s * 0.104, q[2] + s * 0.02), new THREE.Quaternion(), V(0.026, 0.02, 0.022)), 0xcfc2a4); }
    if (kind === 'tooth') M.strand(joint, bone, [q[0], q[1], q[2]], [0, -1, 0.1], 0.12, 0.022, { rings: 3, radial: 6, r1: 0.2, color: 0xc9b98f, bend: [0, 0, 0.1] });
  };
  { const A = ABS.trophyA; const B = ABS.trophyB; const Cc = ABS.trophyC;
    hang(trophy.A, A, 0.1, 'skull'); hang(trophy.A, [A[0] - 0.09, A[1] + 0.01, A[2] - 0.08], 0.14, 'bone'); hang(trophy.A, [A[0] + 0.1, A[1], A[2] - 0.02], 0.12, 'tooth');
    hang(trophy.B, B, 0.14, 'skull'); hang(trophy.B, [B[0] + 0.1, B[1], B[2] - 0.08], 0.08, 'skull'); hang(trophy.B, [B[0] - 0.12, B[1], B[2] - 0.06], 0.12, 'tooth');
    hang(trophy.C, Cc, 0.1, 'skull'); hang(trophy.C, [Cc[0] + 0.15, Cc[1], Cc[2] + 0.02], 0.15, 'bone'); }
  // ---- bandolier across the chest, with studs
  { const P0 = V(0.55, 2.3, 0); const nrm = V(1, -1, 0).normalize();
    const strapF = shellField(unionField([FLD.chest, FLD.belly], 0.12), { off: 0.012, t: 0.024, region: (x, y, z) => Math.abs(V(x, y, z).sub(P0).dot(nrm)) - 0.075, bevel: 0.01, bounds: [[-1, 1.0, -0.9], [1, 2.6, 1.1]],
      colorAt: (x, y, z, o) => { o.setRGB(1, 1, 1); o.multiplyScalar(0.75 + 0.25 * Math.sin(y * 50 + x * 40)); } });
    M.push(chest, leather, meshField(strapF, { h: 0.03 * QK / 1.35, uvScale: 1.6, ao: 0.6, aoSamples: [0.02, 0.05] }), null);
    const tang = V(-1.1, -1.1, 0).normalize();
    for (let i = 0; i < 16; i++) { // studs along the front of the strap
      const t = i / 15; const o = P0.clone().addScaledVector(tang, -0.18 + t * 1.5); const hh = strapF.shoot([o.x, o.y, 1.2], [0, 0, -1], 1.6); if (!hh) continue;
      M.push(chest, iron, studG, place(A3(hh.p.clone().addScaledVector(hh.n, 0.0)), A3(hh.n), 0.014), 0x9a9aa0);
    }
  }
  // ---- tooth necklace
  { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; const x = -0.42 + t * 0.84; const hh = FLD.chest.shoot([x, 2.6 - 0.35 * Math.sin(Math.PI * t) * 0.8 + 0.1, 1.2], [0, -0.25, -1], 2.0); if (hh) pts.push(hh); }
    for (let i = 0; i < pts.length - 1; i++) { const a0 = pts[i].p.clone().addScaledVector(pts[i].n, 0.025); const b0 = pts[i + 1].p.clone().addScaledVector(pts[i + 1].n, 0.025); const d = b0.clone().sub(a0); M.strand(chest, leather, A3(a0), A3(d.clone().normalize()), d.length(), 0.0055, { rings: 1, radial: 3, r1: 1, color: 0x1a120c });
      if (i % 2 === 1) M.strand(chest, bone, A3(a0), [0, -1, 0.35], rr(0.05, 0.085), 0.013, { rings: 2, radial: 5, r1: 0.15, color: col(0xcbbd98, 0.15), bend: [0, 0, 0.05] }); }
    const m = pts[7]; if (m) M.push(chest, iron, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14), new THREE.Matrix4().compose(m.p.clone().addScaledVector(m.n, 0.04), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), m.n), V(1, 1, 1)), 0x8a6a40); }
  // ---- left shoulder: hammered scrap-iron pad (three riveted plates) + biceps strap
  { const F = FLD.armL; const ctr = V(0.92, 2.12, 0);
    const plates = [[V(1.0, 2.42, 0.0), 0.32, rust, 0], [V(0.94, 2.26, 0.26), 0.2, iron, 1], [V(1.24, 2.24, -0.02), 0.2, iron, 2], [V(0.82, 2.3, -0.24), 0.17, rust, 3]];
    for (const [c, rad, mt, i] of plates) {
      const sh = shellField(F, { off: 0.03 + i * 0.008, t: 0.017, region: (x, y, z) => V(x, y, z).sub(c).length() - rad, bevel: 0.012, bounds: [[0.4, 1.8, -0.7], [1.5, 2.8, 0.7]],
        colorAt: (x, y, z, o) => { o.setRGB(1, 1, 1); o.multiplyScalar(0.8 + 0.3 * Math.sin(x * 55) * Math.sin(z * 47 + y * 20)); } });
      M.push(J.shL, mt, meshField(sh, { h: 0.025 * QK / 1.35, uvScale: 1.5, ao: 0.5, aoSamples: [0.02, 0.05] }), null);
      const axis = c.clone().sub(ctr).normalize(); const u = V(0, 0, 1).cross(axis).normalize(); const v = axis.clone().cross(u);
      const n = Math.round(11 * HQ + 4);
      for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2 + i; const q = c.clone().addScaledVector(u, Math.cos(an) * rad * 0.78).addScaledVector(v, Math.sin(an) * rad * 0.78); const dir = q.clone().sub(ctr);
        const hh = F.shoot(A3(ctr), A3(dir), 1.2); if (!hh) continue; M.push(J.shL, iron, studG, place(A3(hh.p.clone().addScaledVector(hh.n, 0.03 + i * 0.008 + 0.012)), A3(hh.n), 0.016), 0xa0a0a6); }
      if (i === 0) for (const [dx, dz] of [[0, 0], [0.13, 0.08], [-0.1, 0.1]]) { const hh = F.shoot([0.92 + dx, 2.9, dz], [0, -1, 0], 1.2); if (hh) M.push(J.shL, iron, spikeG, place(A3(hh.p.clone().addScaledVector(hh.n, 0.04)), A3(hh.n), [0.036, 0.16 - Math.abs(dx) * 0.4, 0.036]), 0x7a7a80); }
    }
    const strap = shellField(F, { off: 0.008, t: 0.02, region: (x, y) => Math.abs(y - 1.85) - 0.055, bevel: 0.01, bounds: [[0.4, 1.6, -0.7], [1.5, 2.1, 0.7]] });
    M.push(J.shL, leather, meshField(strap, { h: 0.02 * QK / 1.35, uvScale: 1.6, ao: 0.6, aoSamples: [0.02, 0.05] }), null);
    const hh = F.shoot([0.92, 1.85, 1.0], [0, 0, -1], 1.5); if (hh) M.push(J.shL, iron, new THREE.BoxGeometry(0.07, 0.09, 0.02), new THREE.Matrix4().compose(hh.p.clone().addScaledVector(hh.n, 0.04), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), hh.n), V(1, 1, 1)), 0x8a8a90); }
  // ---- left wrist: rusted manacle with a broken chain
  { const F = FLD.foreL; const man = shellField(F, { off: 0.006, t: 0.024, region: (x, y) => Math.abs(y - 0.6) - 0.075, bevel: 0.012, bounds: [[0.6, 0.3, -0.4], [1.3, 0.9, 0.4]],
      colorAt: (x, y, z, o) => { o.setRGB(1, 1, 1); o.multiplyScalar(0.7 + 0.3 * Math.sin(x * 33) * Math.sin(z * 37)); } });
    M.push(J.elL, rust, meshField(man, { h: 0.025 * QK / 1.35, uvScale: 1.5, ao: 0.5, aoSamples: [0.02, 0.05] }), null);
    M.push(J.elL, rust, new THREE.TorusGeometry(0.045, 0.014, 8, 14), new THREE.Matrix4().compose(V(1.14, 0.58, 0.07), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), V(1, 1, 1)));
    for (const dy of [-0.05, 0.05]) { const hh = F.shoot([0.92, 0.6 + dy, 0.07], [1, 0, 0], 1); if (hh) M.push(J.elL, iron, studG, place(A3(hh.p.clone().addScaledVector(hh.n, 0.03)), A3(hh.n), 0.02), 0x808086); }
    // chain: three heavy links + a snapped link (parented to the swinging 'chain' joints)
    const link = (jnt, x, y, z, ry, bro) => M.push(jnt, rust, bro ? new THREE.TorusGeometry(0.04, 0.012, 7, 10, 4.4) : new THREE.TorusGeometry(0.04, 0.012, 7, 14), new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, bro ? 0.7 : 0)), V(0.75, 1.5, 1)));
    link(chain, 1.14, 0.505, 0.07, 0, false); link(chain, 1.14, 0.43, 0.07, Math.PI / 2, false); link(chain2, 1.14, 0.355, 0.07, 0, false); link(chain2, 1.14, 0.28, 0.07, Math.PI / 2, true); }
  // ---- right knee bandage
  { const F = FLD.shinR; const bandage = shellField(F, { off: 0.006, t: 0.014, region: (x, y) => Math.abs(y - 0.64) - 0.12, bevel: 0.008, bounds: [[-0.8, 0.4, -0.35], [-0.1, 0.9, 0.45]],
      colorAt: (x, y, z, o) => { const w = Math.sin((y * 90 + x * 40 + z * 55)); o.setRGB(1, 1, 1).multiplyScalar(0.78 + 0.22 * w); const bl = smoothstep(0.17, 0.0, V(x + 0.62, y - 0.62, z - 0.25).length()); o.lerp(new THREE.Color(0x6a1a14), bl * 0.75); } });
    M.push(J.knR, cloth, meshField(bandage, { h: 0.025 * QK / 1.35, uvScale: 2.5, ao: 0.5, aoSamples: [0.02, 0.05] }), null);
    M.strand(J.knR, cloth, [-0.54, 0.62, 0.22], [-0.3, -1, 0.6], 0.2, 0.02, { rings: 4, radial: 4, r1: 0.9, color: 0xb8a888, bend: [0.0, -0.1, 0.12] }); }

  // ---- loincloth: fur-and-hide panels hanging from the belt (each pivots on its own joint)
  const panelGeo = (w, h, sw, sh, o = {}) => {
    const { R: Rc = 0.6, jag = 0.08, wob = 0.03, seedN = 1 } = o; const pos = []; const uv = []; const nrm = []; const colr = []; const idx = [];
    const Nz = (i, j) => Math.sin(i * 12.9898 + j * 78.233 + seedN * 3.1) * 43758.5453 % 1;
    for (let j = 0; j <= sh; j++) for (let i = 0; i <= sw; i++) {
      const u = i / sw; const v = j / sh; const x = (u - 0.5) * w; const edge = Math.abs(Nz(i, 99)) * jag * v ** 2;
      const y = -v * (h - edge * 1.0); const z = Rc - Math.sqrt(Math.max(Rc * Rc - x * x, 0.0001)) ; // wrap back at the edges
      const fold = Math.sin(u * 18 + seedN) * wob * (0.3 + v) + Math.sin(u * 7 + v * 5) * wob * 0.5;
      pos.push(x, y, -z * 0.9 + fold); uv.push(u * 1.2, v * 1.2); nrm.push(0, 0, 1);
      const b = 0.55 + 0.45 * smoothstep(0, 0.9, v) ; const tone = 0.85 + 0.15 * Math.sin(u * 40 + seedN * 2);
      colr.push(b * tone, b * tone * 0.96, b * tone * 0.9);
    }
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) { const a0 = j * (sw + 1) + i; idx.push(a0, a0 + 1, a0 + sw + 1, a0 + 1, a0 + sw + 2, a0 + sw + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const addPanel = (joint, yaw, topP, w, h, o = {}) => {
    const mtx = trM(...topP).multiply(rotM(0, yaw, 0));
    M.push(joint, leather, panelGeo(w, h, 10, 8, o), mtx, col(0x6a5238, 0.1));
    // fur fringe along the hem + two pelts layered on top
    const g2 = panelGeo(w * 0.86, h * 0.62, 8, 6, { ...o, seedN: (o.seedN || 1) + 5, wob: 0.05 });
    M.push(joint, hairM, g2, mtx.clone().multiply(trM(0, -0.02, 0.035)), col(0x5a4c3c, 0.1));
    const nH = Math.round(26 * HQ + 8);
    for (let i = 0; i < nH; i++) { const x = (i / (nH - 1) - 0.5) * w * 0.84; const pp = V(x, -h * 0.62 + 0.02, 0.05).applyMatrix4(mtx); M.strand(joint, hairM, A3(pp), [0.0, -1, 0.15], rr(0.06, 0.12), 0.007, { rings: 2, radial: 3, r1: 0.1, color: col(hairCols[(R() * 5) | 0], 0.2), bend: [rr(-0.1, 0.1), 0, 0.05] }); }
  };
  addPanel(flap.F, 0, [0, ABS.flapF[1], ABS.flapF[2] + 0.02], 0.52, 0.62, { R: 0.5, seedN: 1 });
  addPanel(flap.L, Math.PI * 0.5, [ABS.flapL[0], ABS.flapL[1], ABS.flapL[2] - 0.15], 0.44, 0.46, { R: 0.45, seedN: 2 });
  addPanel(flap.R, -Math.PI * 0.5, [ABS.flapR[0], ABS.flapR[1], ABS.flapR[2] - 0.15], 0.44, 0.46, { R: 0.45, seedN: 3 });
  addPanel(flap.B, Math.PI, [0, ABS.flapB[1], ABS.flapB[2]], 0.7, 0.62, { R: 0.55, seedN: 4 });
  // bones sewn onto the front flap
  M.push(flap.F, bone, new THREE.CylinderGeometry(0.014, 0.014, 0.2, 7), new THREE.Matrix4().compose(V(0.12, 0.9, 0.8), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.5)), V(1, 1, 1)), 0xcfc2a4);

  // ================================================================ THE CLUB (tree trunk): grip at the weapon joint's origin, +Y along the shaft
  { const f = new Field({ seed: seed + 3, lump: 0.02, lumpFreq: 4.5 });
    f.cap([0, -0.42, 0], [0, 1.5, 0], 0.062, 0.275, { k: 0.1 });
    f.sph([0, 1.5, 0], 0.255, { k: 0.1 }); f.sph([0, -0.42, 0], 0.085, { k: 0.05 });
    for (let i = 0; i < 9; i++) { const y = rr(0.7, 1.45); const an = R() * 6.28; const rad = 0.062 + (y + 0.42) / 1.92 * 0.213; f.sph([Math.sin(an) * rad, y, Math.cos(an) * rad], rr(0.04, 0.075), { k: 0.06 }); }
    // two broken branch stubs
    f.cap([0.1, 0.55, 0.0], [0.26, 0.72, 0.03], 0.045, 0.035, { k: 0.04 }); f.cap([-0.08, 0.95, -0.1], [-0.2, 1.08, -0.2], 0.05, 0.04, { k: 0.04 });
    f.stain([0, 1.5, 0], 0.5, 0x2a1a10, 0.5);
    const Mw = weapon.matrixWorld;
    M.push(club, barkM, meshField(f, { h: 0.042 * QK / 1.35, uvScale: 1.1, ao: 0.9, shade: (x, y, z, c) => { c.multiplyScalar(0.75 + 0.25 * smoothstep(-0.4, 1.3, y)); } }), Mw);
    const lm = (m) => Mw.clone().multiply(m);
    // iron bands
    for (const [yb, wd, mt] of [[1.12, 0.06, iron], [1.38, 0.05, rust], [0.3, 0.05, iron]]) {
      const band = shellField(f, { off: 0.012, t: 0.02, region: (x, y) => Math.abs(y - yb) - wd, bevel: 0.008, bounds: [[-0.5, yb - 0.1, -0.5], [0.5, yb + 0.1, 0.5]], colorAt: (x, y, z, o) => { o.setRGB(1, 1, 1).multiplyScalar(0.7 + 0.3 * Math.sin(x * 40 + z * 33)); } });
      M.push(club, mt, meshField(band, { h: 0.025 * QK / 1.35, uvScale: 1.5, ao: 0.5, aoSamples: [0.02, 0.05] }), Mw);
      const n = 12; for (let k = 0; k < n; k++) { const an = (k / n) * 6.28; const hh = f.shoot([0, yb, 0], [Math.sin(an), 0, Math.cos(an)], 1); if (hh) M.push(club, mt, studG, lm(place(A3(hh.p.clone().addScaledVector(hh.n, 0.032)), A3(hh.n), 0.016))); }
    }
    // nails and spikes all over the head
    const nails = Math.round(34 * HQ + 8);
    for (let i = 0; i < nails; i++) { const y = rr(0.78, 1.62); const an = R() * 6.28; const dir = [Math.sin(an), (y > 1.45 ? 0.6 : 0) * R(), Math.cos(an)]; const hh = f.shoot([0, Math.min(y, 1.45), 0], dir, 1); if (!hh) continue;
      const L = rr(0.06, 0.13); M.push(club, iron, spikeG, lm(place(A3(hh.p.clone().addScaledVector(hh.n, -0.01)), A3(hh.n.clone().add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), rr(-0.2, 0.2))).normalize()), [0.014, L, 0.014])), col(0x7a7a80, 0.2));
      M.push(club, rust, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 6), lm(place(A3(hh.p.clone().addScaledVector(hh.n, 0.0)), A3(hh.n), 1)), col(0x8a5a30, 0.2)); }
    // impaled skull on a big spike
    { const an = 1.1; const dir = V(Math.sin(an), 0.25, Math.cos(an)).normalize(); const hh = f.shoot([0, 1.2, 0], A3(dir), 1); if (hh) {
      M.push(club, iron, spikeG, lm(place(A3(hh.p.clone().addScaledVector(hh.n, -0.05)), A3(hh.n), [0.03, 0.34, 0.03])), 0x8a8a90);
      skullAt(club, A3(hh.p.clone().addScaledVector(hh.n, 0.1)), A3(hh.n), 2.0, 0, [0, 1, 0], Mw); } }
    // wrist thong
    M.strand(club, leather, A3(V(0.07, 0.0, 0.02).applyMatrix4(Mw)), A3(V(0.2, -1, 0.3).transformDirection(Mw)), 0.34, 0.008, { rings: 4, radial: 3, r1: 0.9, color: 0x1a120c, bend: A3(V(0.05, -0.2, 0.0).transformDirection(Mw)) });
  }

  M.build();


  // ================================================================ ANCHORS
  a.anchor('nostrilL', head, 0.045, C[1] - 0.12 - ABS.head[1], C[2] + 0.43 - ABS.head[2]);
  a.anchor('nostrilR', head, -0.045, C[1] - 0.12 - ABS.head[1], C[2] + 0.43 - ABS.head[2]);
  a.anchor('head', head, 0, 0.62, 0.0); a.anchor('chest', chest, 0, 0.1, 0.55); a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', jaw, 0, -0.05, 0.38); a.anchor('handR', J.handR, 0, 0, 0); a.anchor('handL', J.handL, 0, 0, 0);
  a.anchor('weapon', club, 0, 1.55, 0);
  a.anchor('shoulderL', J.shL, 0, 0.2, 0); a.anchor('shoulderR', J.shR, 0, 0.2, 0);
  const gripL = new THREE.Object3D(); club.add(gripL); gripL.position.set(0, -0.28, 0);

  // ================================================================ POSES & CLIPS
  // A pose is { joint: [rx, ry, rz] (degrees), 'joint.p': [x, y, z] (metres) }. Missing joints = rest.
  //   clubPitch: [deg]   absolute pitch of the glued club (so arm poses never fight the club angle)
  //   ch.p  = [clubFree, rightIK, leftIK]   ch2.p = [leftGripOffset, eyeFury, steam]
  const Z3 = [0, 0, 0];
  const lerpP = (A, B, k) => { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) { const x = A[key] || Z3; const y = B[key] || Z3; o[key] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; } return o; };
  const EZ = { io: (k) => k * k * (3 - 2 * k), in: (k) => k * k * k, in2: (k) => k * k, out: (k) => 1 - (1 - k) ** 3, lin: (k) => k, back: (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2 };
  const track = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, A] = keys[i - 1]; const [t1, B, e] = keys[i]; return lerpP(A, B, (EZ[e || 'io'])((t - t0) / (t1 - t0))); }
    return keys[keys.length - 1][1];
  };
  const CHAIN = ['hips', 'spine', 'chest', 'shR', 'elR', 'handR'];
  const apply = (P, pose, w = 1) => {
    for (const key in pose) {
      const v = pose[key];
      if (key === 'clubPitch') { const sum = CHAIN.reduce((q, j) => q + (pose[j] ? pose[j][0] : 0), 0); P.rot('weapon', (v[0] - sum - 60.16) * D * w, 0, 0); } else if (key.endsWith('.p')) P.pos(key.slice(0, -2), v[0] * w, v[1] * w, v[2] * w); else P.rot(key, v[0] * D * w, v[1] * D * w, v[2] * D * w);
    }
  };
  const mk = (base, o) => ({ ...base, ...o });
  const STAND = {
    spine: [5, 0, 0], chest: [3, 0, 0], neck: [-8, 0, 0], head: [5, 0, 0], jaw: [7, 0, 0], 'hips.p': [0, -0.04, 0],
    hipL: [-3, 0, 2], hipR: [-3, 0, -2], knL: [6, 0, 0], knR: [6, 0, 0], ftL: [-3, 0, 0], ftR: [-3, 0, 0],
    shL: [-6, 0, 5], elL: [-12, 0, 0], shR: [-20, 0, -7], elR: [-50, 0, 0], clubPitch: [38, 0, 0],
    browL: [0, 0, 8], browR: [0, 0, -8], lidL: [0.25, 0, 0], lidR: [0.25, 0, 0], 'ch2.p': [-0.28, 0.2, 0.0],
  };
  // --- wind-up (overhead, two-handed): k = how far into the pose (0..1), pw = extra power
  const windup = (k, pw = 0) => ({
    spine: [lerpV(5, -14 - 4 * pw, k), 0, 0], chest: [lerpV(3, -16 - 4 * pw, k), 0, 0], neck: [lerpV(-8, 10, k), 0, 0], head: [lerpV(5, -30 - 6 * pw, k), 0, 0], jaw: [lerpV(7, 62, k), 0, 0],
    'hips.p': [0, lerpV(-0.04, 0.0, k), lerpV(0, -0.12, k)], hipL: [lerpV(-3, 4, k), 0, 2], hipR: [lerpV(-3, 4, k), 0, -2], knL: [lerpV(6, 4, k), 0, 0], knR: [lerpV(6, 4, k), 0, 0], ftL: [lerpV(-3, 14, k), 0, 0], ftR: [lerpV(-3, 14, k), 0, 0],
    shL: [lerpV(-6, -30, k), 0, 10], elL: [lerpV(-12, -40, k), 0, 0], shR: [-20, 0, -7], elR: [-50, 0, 0],
    'clubFree.p': [lerpV(-0.75, -0.04, k), lerpV(1.0, 3.2 + 0.3 * pw, k), lerpV(0.8, 0.12 - 0.15 * pw, k)], clubFree: [lerpV(38, -22 - 12 * pw, k), 0, lerpV(0, -4, k)],
    'ch.p': [Math.min(1, k * 2.2), Math.min(1, k * 2.2), Math.min(1, k * 2.2)], 'ch2.p': [-0.28, k, k],
    browL: [0, 0, lerpV(8, 18, k)], browR: [0, 0, lerpV(-8, -18, k)], lidL: [lerpV(0.25, 0.55, k), 0, 0], lidR: [lerpV(0.25, 0.55, k), 0, 0],
  });
  function lerpV(a0, b0, k) { return a0 + (b0 - a0) * k; }
  const GRIP = [0.0, 0.0, 0.0];
  const clubDown = (extra = {}) => ({ // impact: club head planted ahead of the ogre
    spine: [24, 0, 0], chest: [18, 0, 0], neck: [-6, 0, 0], head: [10, 0, 0], jaw: [18, 0, 0], 'hips.p': [0, -0.2, 0.16], hipL: [-18, 0, 2], hipR: [-18, 0, -2], knL: [32, 0, 0], knR: [32, 0, 0], ftL: [-12, 0, 0], ftR: [-12, 0, 0],
    shL: [-30, 0, 10], elL: [-40, 0, 0], 'clubFree.p': [0.0, 1.0, 1.0], clubFree: [122, 0, 0], 'ch.p': [1, 1, 1], 'ch2.p': [-0.28, 0.6, 0.4],
    browL: [0, 0, 20], browR: [0, 0, -20], lidL: [0.65, 0, 0], lidR: [0.65, 0, 0], ...extra,
  });
  const clips = {};
  // ---- idle: heavy breathing, weight shifts, a slow menacing head sweep, club hand sagging
  clips.idle = { loop: true, dur: 6.4, fn: (t, P) => {
    const b = sinT(t, 1 / 3.2); const w = sinT(t, 1 / 6.4);
    apply(P, STAND);
    P.rot('chest', b * 0.035, 0, 0); P.rot('spine', b * 0.012, 0, w * 0.012); P.pos('hips', w * 0.035, b * 0.012, 0); P.rot('hips', 0, w * 0.03, w * 0.03);
    P.rot('head', -b * 0.03 + sinT(t, 1 / 6.4, 0.3) * 0.03, sinT(t, 1 / 6.4, 0.1) * 0.22 * 0.6 + sinT(t, 1 / 3.2, 0.5) * 0.04, 0);
    P.rot('neck', 0, sinT(t, 1 / 6.4, 0.05) * 0.1, 0);
    P.rot('jaw', Math.max(0, b) * 0.07, 0, 0); P.rot('shL', b * 0.03, 0, 0); P.rot('shR', -b * 0.025, 0, 0); P.rot('elL', -b * 0.03, 0, 0);
    P.rot('weapon', sinT(t, 1 / 3.2, 0.2) * 0.04, 0, sinT(t, 1 / 6.4) * 0.05);
    P.rot('browL', 0, 0, sinT(t, 1 / 3.2, 0.3) * 0.05); P.rot('browR', 0, 0, -sinT(t, 1 / 3.2, 0.3) * 0.05);
    P.rot('earL', 0, 0, Math.max(0, sinT(t, 1 / 4.1, 0.2) - 0.8) * 0.8); P.rot('earR', 0, 0, -Math.max(0, sinT(t, 1 / 5.3, 0.6) - 0.8) * 0.8);
  } };
  clips.ready = { loop: true, dur: 2.4, fn: (t, P) => {
    const b = sinT(t, 1 / 1.6); const e = sinT(t, 1 / 2.4);
    apply(P, mk(STAND, {
      spine: [14, 0, 0], chest: [8, 0, 0], neck: [-16, 0, 0], head: [2, 0, 0], jaw: [16, 0, 0], 'hips.p': [0, -0.14, 0.08], hipL: [-14, 0, 5], hipR: [-14, 0, -5], knL: [24, 0, 0], knR: [24, 0, 0], ftL: [-10, 0, 0], ftR: [-10, 0, 0],
      shL: [-45, 0, 14], elL: [-85, 0, 0], shR: [-30, 0, -16], elR: [-105, 0, 0], clubPitch: [-12, 0, 0], browL: [0, 0, 20], browR: [0, 0, -20], lidL: [0.6, 0, 0], lidR: [0.6, 0, 0], 'ch2.p': [-0.28, 0.5, 0.35],
    }));
    P.rot('chest', b * 0.05, e * 0.05, 0); P.rot('spine', b * 0.02, 0, 0); P.pos('hips', e * 0.03, b * 0.02, 0); P.rot('head', 0, sinT(t, 1 / 2.4, 0.2) * 0.14, 0); P.rot('jaw', Math.max(0, b) * 0.1, 0, 0);
    P.rot('shL', b * 0.04, 0, 0); P.rot('elL', -b * 0.05, 0, 0);
  } };
  // ---- telegraphs: loops that show what is coming
  const strikeCock = (t) => mk(STAND, {
    spine: [-10, 0, 8], chest: [-12, 0, 10], neck: [-2, 0, 0], head: [12, 0, -4], jaw: [14, 0, 0], 'hips.p': [0.06, -0.1, -0.08], hipL: [-6, 0, 3], hipR: [-6, 0, -3], knL: [14, 0, 0], knR: [14, 0, 0],
    shL: [-50, 0, 20], elL: [-60, 0, 0], 'clubFree.p': [-0.5, 2.85, -0.2], clubFree: [-60, 0, -14], 'ch.p': [1, 1, 0], 'ch2.p': [-0.28, 0.8, 0.5], browL: [0, 0, 22], browR: [0, 0, -22], lidL: [0.7, 0, 0], lidR: [0.7, 0, 0],
  });
  clips.tele_strike = { loop: true, dur: 1.6, fn: (t, P) => {
    const b = sinT(t, 1 / 1.6); apply(P, strikeCock(t));
    P.rot('chest', b * 0.04, 0, 0); P.pos('clubFree', sinT(t, 3) * 0.004, b * 0.03, 0); P.rot('clubFree', sinT(t, 2) * 0.012, 0, 0); P.rot('head', 0, sinT(t, 1 / 1.6, 0.2) * 0.06, 0);
  } };
  const holdCharge = (pw) => (t, P) => {
    const cur = a.animator.cur; const T = cur && cur.clip === a.clips[cur.name] && (cur.name === 'charge' || cur.name === 'tele_charge' || cur.name === 'tele_slam') ? cur.t : 9;
    const k = EZ.io(Math.min(1, T / 0.7)); const over = T < 0.9 ? Math.sin(Math.min(1, T / 0.9) * Math.PI) * 0.12 : 0;
    apply(P, windup(Math.min(1.12, k + over), pw));
    const tr = 0.55 + pw * 0.5; const q = (hz, ph) => sinT(t, hz, ph);
    P.rot('spine', q(9, 0.1) * 0.012 * tr, 0, q(7, 0.4) * 0.01 * tr); P.rot('chest', q(11, 0.3) * 0.014 * tr, 0, q(8, 0.9) * 0.012 * tr); P.rot('head', q(13, 0.5) * 0.02 * tr, q(7, 0.2) * 0.02 * tr, 0);
    P.pos('clubFree', q(10, 0.2) * 0.008 * tr, q(12, 0.6) * 0.008 * tr, q(9, 0.1) * 0.006 * tr); P.rot('clubFree', q(8, 0.3) * 0.012 * tr, 0, q(11, 0.7) * 0.014 * tr);
    P.pos('hips', q(14, 0.2) * 0.006 * tr, q(17, 0.4) * 0.005 * tr, 0); P.rot('jaw', Math.max(0, q(5, 0.1)) * 0.12, 0, 0);
    P.rot('shL', q(12, 0.1) * 0.01 * tr, 0, 0); P.rot('ftL', q(15, 0) * 0.02 * tr, 0, 0); P.rot('ftR', q(15, 0.5) * 0.02 * tr, 0, 0);
  };
  clips.charge = { loop: true, dur: 1.4, fn: holdCharge(0) };
  clips.tele_charge = { loop: true, dur: 1.4, fn: holdCharge(0) };
  clips.tele_slam = { loop: true, dur: 1.4, fn: holdCharge(1) };
  // tele_guard: club held across the chest in both hands like a bar
  clips.tele_guard = { loop: true, dur: 1.8, fn: (t, P) => {
    const b = sinT(t, 1 / 1.8);
    apply(P, mk(STAND, {
      spine: [10, 0, 0], chest: [6, 0, 0], neck: [-12, 0, 0], head: [4, 0, 0], jaw: [10, 0, 0], 'hips.p': [0, -0.12, 0.04], hipL: [-10, 0, 5], hipR: [-10, 0, -5], knL: [20, 0, 0], knR: [20, 0, 0],
      shL: [-30, 0, 12], elL: [-60, 0, 0], 'clubFree.p': [-0.3, 1.95, 0.88], clubFree: [-8, 0, 78], 'ch.p': [1, 1, 1], 'ch2.p': [-0.28, 0.4, 0.2], browL: [0, 0, 14], browR: [0, 0, -14], lidL: [0.5, 0, 0], lidR: [0.5, 0, 0],
    }));
    P.rot('chest', b * 0.03, 0, 0); P.pos('clubFree', 0, b * 0.012, 0);
  } };
  // ---- attack: heavy overhead Club (hit at 0.95 s)
  clips.attack = { dur: 1.75, events: { hit: 0.95 }, fn: (t, P) => {
    const pose = track([[0, STAND], [0.5, windup(0.8), 'io'], [0.74, windup(1.1, 0.3), 'io'], [0.95, clubDown(), 'in2'], [1.06, clubDown({ 'hips.p': [0, -0.24, 0.18], head: [14, 0, 0] }), 'out'], [1.75, STAND, 'io']], t);
    apply(P, pose);
    if (t < 0.95 && t > 0.5) { /* tremble at the top */ P.pos('clubFree', sinT(t, 11) * 0.006, 0, 0); }
    const imp = t > 0.95 && t < 1.5 ? Math.exp(-(t - 0.95) * 7) * sinT(t - 0.95, 8) : 0; P.rot('spine', imp * 0.04, 0, 0); P.rot('head', imp * 0.07, 0, 0);
  } };
  // ---- attack2: horizontal backhand sweep (hit at 0.78 s)
  clips.attack2 = { dur: 1.5, events: { hit: 0.78 }, fn: (t, P) => {
    const back = mk(STAND, { spine: [4, -34, 0], chest: [3, -38, 6], neck: [-6, 14, 0], head: [6, 20, 0], jaw: [24, 0, 0], 'hips.p': [0.08, -0.1, -0.05], hipL: [-6, -12, 3], hipR: [-6, -12, -3], knL: [14, 0, 0], knR: [14, 0, 0],
      shL: [-30, 0, 24], elL: [-30, 0, 0], 'clubFree.p': [-1.15, 1.75, -0.45], clubFree: [-12, 118, -84], 'ch.p': [1, 1, 0.8], 'ch2.p': [-0.28, 0.7, 0.4], browL: [0, 0, 22], browR: [0, 0, -22], lidL: [0.7, 0, 0], lidR: [0.7, 0, 0] });
    const through = mk(back, { spine: [10, 40, 0], chest: [8, 46, -4], neck: [-4, -20, 0], head: [4, -28, 0], 'hips.p': [-0.06, -0.18, 0.1], hipL: [-12, 22, 3], hipR: [-12, 22, -3], knL: [24, 0, 0], knR: [24, 0, 0],
      shL: [-20, 0, 18], 'clubFree.p': [0.9, 1.3, 1.1], clubFree: [4, -62, -88] });
    apply(P, track([[0, STAND], [0.42, back, 'io'], [0.58, back, 'io'], [0.78, through, 'in2'], [0.92, through, 'out'], [1.5, STAND, 'io']], t));
  } };
  // ---- slam: the devastating follow-through (hit + shake at 1.55 s)
  clips.slam = { dur: 2.7, events: { hit: 1.55, shake: 1.55 }, fn: (t, P) => {
    const top = windup(1.1, 1); const rear = mk(windup(1.15, 1.2), { spine: [-24, 0, 0], chest: [-26, 0, 0], 'clubFree.p': [-0.04, 3.45, -0.2], clubFree: [-42, 0, -2], head: [-42, 0, 0], jaw: [80, 0, 0] });
    const hitP = clubDown({ spine: [34, 0, 0], chest: [26, 0, 0], head: [16, 0, 0], 'hips.p': [0, -0.32, 0.26], knL: [44, 0, 0], knR: [44, 0, 0], hipL: [-26, 0, 2], hipR: [-26, 0, -2], 'clubFree.p': [0, 0.95, 1.1] });
    apply(P, track([[0, STAND], [0.7, top, 'io'], [1.2, rear, 'io'], [1.55, hitP, 'in2'], [1.66, mk(hitP, { 'hips.p': [0, -0.36, 0.28], spine: [38, 0, 0] }), 'out'], [2.15, mk(hitP, { spine: [30, 0, 0], head: [8, 0, 0], jaw: [10, 0, 0], 'ch2.p': [-0.28, 0.9, 0.7] }), 'io'], [2.7, STAND, 'io']], t));
    if (t > 0.7 && t < 1.55) { const m = ramp01(t, 0.7, 1.2); P.pos('clubFree', sinT(t, 13) * 0.01 * m, sinT(t, 17) * 0.008 * m, 0); P.rot('chest', sinT(t, 11) * 0.014 * m, 0, 0); }
    const imp = t > 1.55 && t < 2.2 ? Math.exp(-(t - 1.55) * 5) * sinT(t - 1.55, 7) : 0; P.rot('spine', imp * 0.07, 0, 0); P.rot('head', imp * 0.1, 0, 0); P.pos('hips', 0, imp * 0.04, 0);
  } };
  // ---- stomp: lift the right leg, hold, stamp (hit + shake at 0.9 s)
  clips.stomp = { dur: 1.6, events: { hit: 0.9, shake: 0.9 }, fn: (t, P) => {
    const up = mk(STAND, { spine: [-6, 0, -6], chest: [-8, 0, -8], neck: [-6, 0, 0], head: [-8, 0, 0], jaw: [38, 0, 0], 'hips.p': [0.2, 0.0, 0], hips: [0, 0, 6], hipR: [-84, 0, -6], knR: [96, 0, 0], ftR: [30, 0, 0], hipL: [2, 0, 4], knL: [8, 0, 0],
      shL: [-30, 0, 55], elL: [-20, 0, 0], shR: [-25, 0, -48], elR: [-45, 0, 0], clubPitch: [20, 0, 0], browL: [0, 0, 20], browR: [0, 0, -20], lidL: [0.6, 0, 0], lidR: [0.6, 0, 0], 'ch2.p': [-0.28, 0.7, 0.5] });
    const down = mk(up, { spine: [18, 0, 0], chest: [14, 0, 0], head: [10, 0, 0], jaw: [20, 0, 0], 'hips.p': [0.1, -0.28, 0.1], hips: [0, 0, 2], hipR: [-34, 0, -6], knR: [44, 0, 0], ftR: [-6, 0, 0], hipL: [-8, 0, 4], knL: [22, 0, 0], shL: [-45, 0, 38], shR: [-35, 0, -36], clubPitch: [58, 0, 0] });
    apply(P, track([[0, STAND], [0.55, up, 'io'], [0.74, up, 'io'], [0.9, down, 'in2'], [1.0, mk(down, { 'hips.p': [0.1, -0.31, 0.1] }), 'out'], [1.6, STAND, 'io']], t));
    const imp = t > 0.9 && t < 1.5 ? Math.exp(-(t - 0.9) * 6) * sinT(t - 0.9, 7) : 0; P.rot('spine', imp * 0.05, 0, 0); P.rot('head', imp * 0.08, 0, 0); P.rot('weapon', imp * 0.12, 0, 0);
  } };
  // ---- guard: the Roar (chest-beat, club hoisted)
  clips.guard = { dur: 2.2, fn: (t, P) => {
    const roar = mk(STAND, { spine: [-14, 0, 0], chest: [-18, 0, 0], neck: [10, 0, 0], head: [-34, 0, 0], jaw: [78, 0, 0], 'hips.p': [0, 0.0, -0.06], hipL: [4, 0, 4], hipR: [4, 0, -4], knL: [2, 0, 0], knR: [2, 0, 0], ftL: [12, 0, 0], ftR: [12, 0, 0],
      shL: [-62, 0, 24], elL: [-120, 0, 0], shR: [-150, 0, -26], elR: [-30, 0, 0], clubPitch: [-6, 0, 0], browL: [0, 0, 20], browR: [0, 0, -20], lidL: [0.6, 0, 0], lidR: [0.6, 0, 0], 'ch2.p': [-0.28, 1, 1] });
    apply(P, track([[0, STAND], [0.4, roar, 'back'], [1.75, roar, 'io'], [2.2, STAND, 'io']], t));
    const beat = (c) => Math.exp(-(((t - c) * 14) ** 2)); const bs = beat(0.62) + beat(1.0) + beat(1.38);
    P.rot('elL', bs * 0.55, 0, 0); P.rot('shL', bs * 0.1, 0, -bs * 0.18); P.rot('chest', -bs * 0.05, 0, 0); P.pos('hips', 0, -bs * 0.015, 0);
    const shake = t > 0.4 && t < 1.75 ? 1 : 0; P.rot('head', sinT(t, 12) * 0.012 * shake, sinT(t, 9) * 0.02 * shake, 0); P.rot('jaw', sinT(t, 7) * 0.08 * shake, 0, 0);
  } };
  clips.hurt = { dur: 0.45, fn: (t, P) => {
    const k = Math.sin(Math.min(1, t / 0.45) * Math.PI) * Math.exp(-t * 2);
    P.rot('spine', -0.12 * k, 0, 0.05 * k); P.rot('chest', -0.14 * k, 0.05 * k, 0); P.rot('head', -0.28 * k, 0.12 * k, 0); P.rot('jaw', 0.5 * k, 0, 0); P.pos('hips', 0, 0, -0.12 * k); P.rot('shL', 0.2 * k, 0, 0); P.rot('shR', 0.2 * k, 0, 0);
    P.rot('lidL', 0.5 * k, 0, 0); P.rot('lidR', 0.5 * k, 0, 0);
  } };
  clips.die = { dur: 3.0, fn: (t, P) => {
    const stag = mk(STAND, { spine: [-14, 0, 6], chest: [-18, 0, 8], neck: [8, 0, 0], head: [-30, 0, 8], jaw: [60, 0, 0], 'hips.p': [0.05, -0.1, -0.2], hipL: [-4, 0, 4], hipR: [-4, 0, -4], knL: [16, 0, 0], knR: [16, 0, 0], shL: [10, 0, 22], elL: [-10, 0, 0], shR: [14, 0, -26], elR: [-20, 0, 0], clubPitch: [60, 0, 0], lidL: [0.9, 0, 0], lidR: [0.9, 0, 0] });
    const kneel = mk(stag, { spine: [24, 0, 4], chest: [20, 0, 4], neck: [0, 0, 0], head: [20, 0, 6], jaw: [40, 0, 0], 'hips.p': [0.05, -0.62, -0.1], hipL: [-80, 0, 6], hipR: [-70, 0, -8], knL: [118, 0, 0], knR: [110, 0, 0], ftL: [50, 0, 0], ftR: [50, 0, 0],
      shL: [-18, 0, 12], elL: [-30, 0, 0], shR: [-8, 0, -20], elR: [-20, 0, 0], clubPitch: [100, 0, 0], lidL: [1.3, 0, 0], lidR: [1.3, 0, 0], 'ch.p': [0.0, 0, 0], 'ch2.p': [-0.28, 0, 0] });
    const slump = mk(kneel, { spine: [64, 0, 6], chest: [30, 0, 6], head: [30, 0, 6], 'hips.p': [0.05, -0.74, 0.16], hipL: [-92, 0, 8], hipR: [-84, 0, -8], knL: [128, 0, 0], knR: [122, 0, 0], shL: [-60, 0, 20], shR: [-50, 0, -24], elL: [-20, 0, 0], elR: [-10, 0, 0], jaw: [24, 0, 0] });
    apply(P, track([[0, STAND], [0.4, stag, 'out'], [1.2, kneel, 'in2'], [2.2, slump, 'out'], [3.0, slump, 'io']], t));
  } };
  clips.spawn = { dur: 1.7, fn: (t, P) => {
    const low = mk(STAND, { spine: [40, 0, 0], chest: [22, 0, 0], neck: [10, 0, 0], head: [24, 0, 0], 'hips.p': [0, -0.55, 0.22], hipL: [-60, 0, 8], hipR: [-60, 0, -8], knL: [100, 0, 0], knR: [100, 0, 0], ftL: [30, 0, 0], ftR: [30, 0, 0], shL: [-30, 0, 20], shR: [-30, 0, -20], elL: [-30, 0, 0], elR: [-60, 0, 0], clubPitch: [100, 0, 0], lidL: [1.2, 0, 0], lidR: [1.2, 0, 0] });
    const stretch = guardRoarPose();
    apply(P, track([[0, low], [0.7, STAND, 'out'], [0.7, STAND, 'io'], [1.1, stretch, 'back'], [1.7, STAND, 'io']], t));
    P.rot('head', sinT(t, 12) * 0.01 * ramp01(t, 0.8, 1.1), 0, 0);
  } };
  function guardRoarPose() { return mk(STAND, { spine: [-12, 0, 0], chest: [-16, 0, 0], neck: [8, 0, 0], head: [-30, 0, 0], jaw: [70, 0, 0], shL: [-20, 0, 40], shR: [-30, 0, -40], elL: [-20, 0, 0], elR: [-40, 0, 0], clubPitch: [10, 0, 0], 'ch2.p': [-0.28, 0.8, 1], 'hips.p': [0, 0, -0.04], lidL: [0.5, 0, 0], lidR: [0.5, 0, 0] }); }
  a.clips = clips;

  // ================================================================ RIG LOGIC: club blend, IK, springs, blinks, glow, steam, dust
  const puffs = new Puffs(quality === 'low' ? 36 : 72); a.root.add(puffs.mesh);
  const sp = (n, k, d) => a.spring(n, k, d);
  const tmpA = new THREE.Matrix4(); const gp = new THREE.Vector3(); const gq = new THREE.Quaternion(); const gs = new THREE.Vector3(); const fp = new THREE.Vector3(); const fq = new THREE.Quaternion(); const fs = new THREE.Vector3();
  const wv = new THREE.Vector3(); const tgt = new THREE.Vector3(); const pole = new THREE.Vector3(); const mdl = a.model;
  const prev = { chest: new THREE.Vector3(), vel: new THREE.Vector3(), head: new THREE.Vector3(), hv: new THREE.Vector3(), hand: new THREE.Vector3(), hav: new THREE.Vector3(), init: false };
  let eyeMat = null;
  let acc = 0; let blinkT = 0; let lastT = 0; let lastName = ''; let accN = 0;
  const toLocal = (w, out = new THREE.Vector3()) => a.root.worldToLocal(out.copy(w));
  const bursts = { dust: (p, n = 14, spread = 1.2, big = 1) => { for (let i = 0; i < n; i++) { const an = (i / n) * 6.283 + R(); puffs.emit({ pos: [p.x + Math.cos(an) * 0.2, 0.08, p.z + Math.sin(an) * 0.2], vel: [Math.cos(an) * spread * rr(0.5, 1.3), rr(0.15, 0.7), Math.sin(an) * spread * rr(0.5, 1.3)], life: rr(1.0, 1.8), size: rr(0.3, 0.5) * big, sizeEnd: rr(1.0, 1.7) * big, color: 0x6b5c48, colorEnd: 0x3a3028, alpha: 0.5, rise: 0.15, drag: 1.6, turb: 0.4 }); }
    for (let i = 0; i < 12; i++) { const an = R() * 6.283; puffs.emit({ pos: [p.x, 0.1, p.z], vel: [Math.cos(an) * rr(0.5, 2.4), rr(1.4, 3.6), Math.sin(an) * rr(0.5, 2.4)], life: rr(0.5, 1.2), size: 0.06, sizeEnd: 0.01, color: 0xffb040, colorEnd: 0xff4010, alpha: 1, kind: 1, add: 1, rise: -5, drag: 0.6 }); } } };
  a.userData.fx = bursts;
  a.onUpdate = (dt, t) => {
    if (!dt) return;
    a.root.updateMatrixWorld(true);
    const wFree = Math.min(1, Math.max(0, ch.position.x)); const wR = Math.min(1, Math.max(0, ch.position.y)); const wL = Math.min(1, Math.max(0, ch.position.z));
    const gLo = ch2.position.x; const fury = Math.min(1.2, Math.max(0, ch2.position.y)); const steam = Math.max(0, ch2.position.z);
    // ---- club: blend glued-to-hand and free transforms (both in model space)
    tmpA.copy(mdl.matrixWorld).invert().multiply(weapon.matrixWorld).decompose(gp, gq, gs);
    clubFree.matrix.decompose(fp, fq, fs);
    gp.lerp(fp, wFree); gq.slerp(fq, wFree); club.matrix.compose(gp, gq, gs.set(1, 1, 1)); club.updateMatrixWorld(true);
    gripL.position.y = gLo;
    // ---- IK: both fists follow the club shaft
    if (wR > 0.001) { club.localToWorld(tgt.set(0, 0, 0)); pole.set(-0.5, -0.6, -0.8).transformDirection(mdl.matrixWorld); solveArm(J.shR, J.elR, 0.82, 0.942, tgt, pole, wR); }
    if (wL > 0.001) { gripL.updateWorldMatrix(true, false); gripL.getWorldPosition(tgt); pole.set(0.5, -0.6, -0.8).transformDirection(mdl.matrixWorld); solveArm(J.shL, J.elL, 0.82, 0.942, tgt, pole, wL); }
    // ---- secondary motion: springs kicked by body accelerations
    chest.getWorldPosition(wv); const cv = wv.clone().sub(prev.chest).divideScalar(dt); const ca = cv.clone().sub(prev.vel); prev.chest.copy(wv); prev.vel.copy(cv);
    club.getWorldPosition(wv); const hv = wv.clone().sub(prev.hand).divideScalar(dt); const ha = hv.clone().sub(prev.hav); prev.hand.copy(wv); prev.hav.copy(hv);
    if (!prev.init) { prev.init = true; ca.set(0, 0, 0); ha.set(0, 0, 0); }
    const kick = (n, v) => { const s = sp(n, 90, 5); s.kick(Math.max(-9, Math.min(9, v))); return s.x; };
    const bellyS = kick('belly', -ca.y * 0.9); const bellyZ = kick('bellyz', -ca.z * 0.5);
    spine.scale.set(1 + bellyS * 0.012, 1 + bellyS * 0.03, 1 - bellyS * 0.01 + bellyZ * 0.01);
    chest.rotation.x += kick('chestx', -ca.y * 0.2) * 0.006;
    head.rotation.x += kick('headx', ca.y * 0.8) * 0.01 - kick('headz', ca.z * 0.8) * 0.01; head.rotation.y += kick('heady', ca.x * 0.8) * 0.01;
    for (const [k, j, g] of [['F', flap.F, 1], ['B', flap.B, -1], ['L', flap.L, 1], ['R', flap.R, 1]]) { const sx = kick('fl' + k, ca.z * 0.3 * g + ca.y * 0.05); j.rotation.x += -sx * 0.025 * g; if (k === 'L' || k === 'R') j.rotation.z += kick('flz' + k, ca.x * 0.3) * 0.02; }
    for (const [k, j] of Object.entries(trophy)) { j.rotation.x += kick('tr' + k, ca.z * 0.6 - ca.y * 0.1) * 0.03; j.rotation.z += kick('trz' + k, -ca.x * 0.6) * 0.03; }
    { const cx = kick('chx', ca.z * 0.8 + ha.z * 0.1); const cz = kick('chz', -ca.x * 0.8); chain.rotation.x += cx * 0.05; chain.rotation.z += cz * 0.05; chain2.rotation.x += cx * 0.04; chain2.rotation.z += cz * 0.04; }
    for (const S of ['L', 'R']) { const e = J['ear' + S]; e.rotation.z += kick('ear' + S, ca.y * 0.5) * 0.02 * (S === 'L' ? 1 : -1); }
    // ---- blinking + eyes
    blinkT += dt; const per = 3.3 + 1.4 * Math.sin(t * 0.37); const ph = blinkT % per; const blink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    for (const S of ['L', 'R']) { J['lid' + S].rotation.x += blink * 1.5; J['eye' + S].rotation.y = Math.sin(t * 0.6) * 0.1 + (S === 'L' ? 0.02 : -0.02); }
    const glowK = 1.0 + fury * 3.2 + (a.alive ? 0 : -0.7) + 0.2 * Math.sin(t * 7) * fury;
    if (!eyeMat) eyeMat = [own(a, eyeM)];
    for (const m of eyeMat) if (m) { m.emissiveIntensity = Math.max(0.1, glowK); m.userData.emissiveI0 = Math.max(0.1, glowK); m.emissive.setRGB(1, 0.42 - 0.2 * fury, 0.06); m.userData.emissive0.copy(m.emissive); }
    // ---- steam from the nostrils; heavy venting during the wind-up
    const bph = (a.t % 3.2) / 3.2; const exhale = bph > 0.5 && bph < 0.7 ? 1 : 0; const rate = (a.alive ? (exhale * 14 + 3 + steam * 70) : 0);
    acc += rate * dt; accN += steam * 26 * dt;
    while (acc >= 1) { acc -= 1; for (const n of ['nostrilL', 'nostrilR']) { if (R() < 0.5) continue; a.anchors[n].getWorldPosition(wv); toLocal(wv); puffs.emit({ pos: [wv.x, wv.y, wv.z], vel: [rr(-0.1, 0.1) + (steam > 0.3 ? rr(-0.3, 0.3) : 0), -0.25 - steam * 0.6, 0.5 + steam * 0.8], life: 1.0 + steam * 0.7, size: 0.08 + steam * 0.04, sizeEnd: 0.35 + steam * 0.3, color: 0xd8d4cc, colorEnd: 0x8a8680, alpha: 0.28 + steam * 0.16, rise: 0.45, drag: 1.4, turb: 0.35 }); } }
    while (accN >= 1) { accN -= 1; // vents on shoulders / upper back
      const j = R() < 0.5 ? J.shL : J.shR; j.getWorldPosition(wv); wv.y += 0.45 + rr(0, 0.1); wv.x += rr(-0.15, 0.15); toLocal(wv);
      puffs.emit({ pos: [wv.x, wv.y, wv.z - 0.1], vel: [rr(-0.2, 0.2), rr(0.4, 0.9), rr(-0.3, 0.1)], life: rr(1.2, 1.9), size: 0.2, sizeEnd: 0.8, color: 0xe8e4dc, colorEnd: 0x9a948c, alpha: 0.3, rise: 0.5, drag: 1.0, turb: 0.5 }); }
    // ---- events: dust + embers at impact
    const cur = a.animator.cur;
    if (cur) {
      if (cur.name !== lastName) { lastName = cur.name; lastT = 0; }
      const ct = cur.t;
      if (cur.name === 'slam' && lastT < 1.55 && ct >= 1.55) { a.anchors.weapon.getWorldPosition(wv); wv.y = 0; toLocal(wv); bursts.dust(wv, 22, 2.4, 1.6); }
      if (cur.name === 'attack' && lastT < 0.95 && ct >= 0.95) { a.anchors.weapon.getWorldPosition(wv); wv.y = 0; toLocal(wv); bursts.dust(wv, 12, 1.5, 1.0); }
      if (cur.name === 'stomp' && lastT < 0.9 && ct >= 0.9) { J.ftR.getWorldPosition(wv); toLocal(wv); bursts.dust(wv, 18, 2.0, 1.3); }
      lastT = ct;
    }
    puffs.update(dt);
  };
  withEvents(a);
  a.finalize();
  // dissolve-friendly: eyes keep their glow but follow the base class flash
  return a;
}
