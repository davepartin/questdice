// The Hill Ogre (Act I elite). A 3.2 m pot-bellied brute: sculpted from smooth-blended distance fields
// (see parts2.js), dressed with hundreds of merged details, animated with a heavy FK rig + runtime IK
// so both fists grip the club during the Wind-Up. Moves: Club, Stomp, Wind-Up (charge), Slam, Roar.
import * as THREE from 'three';
import { Actor } from './base.js';
import { mat, solid } from '../mats.js';
import { sinT, pulse, ramp01 } from '../rig.js';
import { Field, meshField, Merge, Puffs, place, between, solveArm, withEvents, own, rng as mkRng, ease } from './parts2.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function create({ seed = 1, quality = 'high' } = {}) {
  const QK = quality === 'low' ? 1.7 : quality === 'med' ? 1.3 : 1;
  const R = mkRng(seed * 7919 + 17);
  const a = new Actor({ name: 'ogre', height: 3.2, radius: 1.1 });
  const M = new Merge(a);
  const ABS = {};
  const jt = (name, parent, x, y, z) => { const p = parent ? ABS[parent.name] : [0, 0, 0]; ABS[name] = [x, y, z]; return a.joint(name, parent || a.model, x - p[0], y - p[1], z - p[2]); };

  // ---------------------------------------------------------------- joints (model-space absolute positions)
  const hips = jt('hips', null, 0, 1.25, 0);
  const spine = jt('spine', hips, 0, 1.4, 0);
  const chest = jt('chest', spine, 0, 1.85, 0);
  const neck = jt('neck', chest, 0, 2.42, 0.08);
  const head = jt('head', neck, 0, 2.56, 0.26);
  const jaw = jt('jaw', head, 0, 2.5, 0.27);
  const side = { R: -1, L: 1 };
  const J = {};
  for (const [S, sx] of Object.entries(side)) {
    J['sh' + S] = jt('sh' + S, chest, sx * 0.92, 2.12, 0);
    J['el' + S] = jt('el' + S, J['sh' + S], sx * 0.92, 1.3, 0);
    J['hand' + S] = jt('hand' + S, J['el' + S], sx * 0.92, 0.36, 0.06);
    J['hip' + S] = jt('hip' + S, hips, sx * 0.4, 1.18, 0);
    J['kn' + S] = jt('kn' + S, J['hip' + S], sx * 0.42, 0.66, 0.08);
    J['ft' + S] = jt('ft' + S, J['kn' + S], sx * 0.42, 0.14, 0.0);
  }
  const ch = jt('ch', null, 0, 0, 0); // animation channels: x = left-hand IK weight, y = eye fury, z = steam
  const weapon = jt('weapon', J.handR, -0.92, 0.36, 0.06);
  weapon.rotation.x = 1.05; // rest: club points forward-up out of the fist

  // ---------------------------------------------------------------- materials
  const skin = mat('skinOgre', { vertexColors: true, roughness: 0.9 });
  const bone = mat('bone', { vertexColors: true, roughness: 0.8 });
  const iron = mat('iron', { vertexColors: true, roughness: 1.15 });
  const rust = mat('rust', { vertexColors: true });
  const leather = mat('leatherDark', { vertexColors: true, side: THREE.DoubleSide });
  const hairM = mat('furDark', { vertexColors: true, side: THREE.DoubleSide });

  const skinOpt = { uvScale: 0.9, ao: 0.9 };
  const lump = { seed, lump: 0.012, lumpFreq: 6, mottle: 0.25 };
  const at = (f, jointName, o = {}) => M.push(jointName, skin, meshField(f, { h: (o.h || 0.035) * QK, ...skinOpt, ...o }), null);

  // ================================================================ BODY FIELDS
  const SKINTINT = { belly: 0xe6dcc0, scar: 0xd6a08e, dark: 0x8a7a64, mud: 0x6a5a40 };
  // --- hips
  { const f = new Field(lump);
    f.ell([0, 1.18, -0.02], [0.52, 0.36, 0.44], { k: 0.12 }).ell([0, 1.1, -0.2], [0.5, 0.34, 0.3], { k: 0.12 });
    f.sph([-0.4, 1.12, 0], 0.3, { k: 0.12 }).sph([0.4, 1.12, 0], 0.3, { k: 0.12 });
    at(f, hips, { h: 0.04 }); }
  // --- belly
  { const f = new Field(lump);
    f.ell([0, 1.5, 0.26], [0.7, 0.58, 0.62], { k: 0.2, tint: SKINTINT.belly, tw: 0.8 });
    f.ell([0, 1.28, 0.34], [0.5, 0.3, 0.46], { k: 0.15, tint: SKINTINT.belly, tw: 0.8 });
    f.ell([0, 1.55, -0.18], [0.55, 0.42, 0.38], { k: 0.2 });
    f.sph([-0.55, 1.45, 0.0], 0.3, { k: 0.2 }).sph([0.55, 1.45, 0.0], 0.3, { k: 0.2 });
    // navel
    f.sph([0, 1.48, 0.86], 0.05, { sub: true, k: 0.05 });
    f.stain([0, 1.48, 0.88], 0.14, 0x3a2a1c, 0.6);
    at(f, spine, { h: 0.04 }); }
  // --- chest
  { const f = new Field(lump);
    f.ell([0, 2.0, 0.04], [0.74, 0.5, 0.55], { k: 0.2 });
    f.ell([-0.34, 2.0, 0.43], [0.32, 0.24, 0.2], { k: 0.12 }).ell([0.34, 2.0, 0.43], [0.32, 0.24, 0.2], { k: 0.12 });
    f.ell([0, 2.3, -0.25], [0.62, 0.34, 0.42], { k: 0.2 });
    f.cap([0, 2.3, -0.15], [-0.72, 2.2, -0.04], 0.26, 0.28, { k: 0.15 }).cap([0, 2.3, -0.15], [0.72, 2.2, -0.04], 0.26, 0.28, { k: 0.15 });
    f.cap([0, 2.25, 0.02], [0, 2.52, 0.26], 0.3, 0.22, { k: 0.15 });
    f.ell([0, 1.95, -0.25], [0.7, 0.5, 0.35], { k: 0.2 });
    at(f, chest, { h: 0.04 }); }
  // --- head
  const C = [0, 2.6, 0.3];
  { const f = new Field({ ...lump, lump: 0.006, lumpFreq: 9 });
    f.ell([C[0], C[1] + 0.04, C[2] - 0.04], [0.27, 0.25, 0.27], { k: 0.1 });
    for (const sx of [-1, 1]) {
      f.cap([sx * 0.24, C[1] + 0.09, C[2] + 0.19], [sx * 0.04, C[1] + 0.05, C[2] + 0.27], 0.07, 0.075, { k: 0.06 });
      f.sph([sx * 0.2, C[1] - 0.07, C[2] + 0.18], 0.1, { k: 0.08 });
      f.sph([sx * 0.115, C[1] + 0.0, C[2] + 0.25], 0.06, { sub: true, k: 0.03 });
      f.ell([sx * 0.31, C[1] - 0.0, C[2] - 0.02], [0.05, 0.16, 0.1], { k: 0.04, rot: [0, 0, sx * 0.3] });
      f.sph([sx * 0.045, C[1] - 0.115, C[2] + 0.43], 0.03, { sub: true, k: 0.02 });
    }
    f.ell([0, C[1] - 0.1, C[2] + 0.22], [0.17, 0.11, 0.13], { k: 0.08 });
    f.ell([0, C[1] - 0.06, C[2] + 0.35], [0.085, 0.075, 0.08], { k: 0.05 });
    at(f, head, { h: 0.016, aoSamples: [0.03, 0.07, 0.15] }); }
  // --- jaw
  { const f = new Field({ ...lump, lump: 0.006, lumpFreq: 9 });
    f.ell([0, C[1] - 0.22, C[2] + 0.27], [0.2, 0.11, 0.15], { k: 0.08 });
    for (const sx of [-1, 1]) f.cap([sx * 0.2, C[1] - 0.12, C[2] + 0.02], [sx * 0.12, C[1] - 0.22, C[2] + 0.34], 0.07, 0.08, { k: 0.06 });
    at(f, jaw, { h: 0.016 }); }
  // --- arms
  for (const [S, sx] of Object.entries(side)) {
    { const f = new Field(lump);
      f.sph([sx * 0.92, 2.12, 0], 0.36, { k: 0.1 });
      f.cap([sx * 0.92, 2.1, 0], [sx * 0.92, 1.32, 0], 0.3, 0.22, { k: 0.1 });
      f.ell([sx * 0.92, 1.8, 0.12], [0.22, 0.3, 0.2], { k: 0.1 });
      f.ell([sx * 0.92, 1.8, -0.12], [0.2, 0.3, 0.18], { k: 0.1 });
      at(f, J['sh' + S], { h: 0.04 }); }
    { const f = new Field(lump);
      f.sph([sx * 0.92, 1.3, 0], 0.22, { k: 0.05 });
      f.cap([sx * 0.92, 1.3, 0], [sx * 0.92, 0.5, 0.04], 0.24, 0.17, { k: 0.1 });
      f.ell([sx * 0.92, 1.0, 0.05], [0.24, 0.3, 0.22], { k: 0.1 });
      f.ell([sx * 0.92, 0.34, 0.06], [0.2, 0.2, 0.22], { k: 0.08, tint: SKINTINT.dark, tw: 0.5 });
      for (let i = 0; i < 4; i++) f.sph([sx * (0.92 + (i - 1.5) * 0.001), 0.34, 0.06], 0.001, {});
      for (let i = 0; i < 4; i++) f.sph([sx * 0.92 + (i - 1.5) * 0.085 * 1, 0.4 - Math.abs(i - 1.5) * 0.015, 0.27], 0.065, { k: 0.04, tint: SKINTINT.dark, tw: 0.6 });
      f.cap([sx * 0.76, 0.5, 0.2], [sx * 0.8, 0.34, 0.26], 0.06, 0.06, { k: 0.05 });
      at(f, J['el' + S], { h: 0.035 }); }
  }
  // --- legs
  for (const [S, sx] of Object.entries(side)) {
    { const f = new Field(lump);
      f.cap([sx * 0.4, 1.15, 0], [sx * 0.42, 0.7, 0.08], 0.31, 0.22, { k: 0.1 });
      f.ell([sx * 0.52, 0.95, 0], [0.2, 0.3, 0.25], { k: 0.1 });
      f.sph([sx * 0.42, 0.66, 0.08], 0.22, { k: 0.05 });
      at(f, J['hip' + S], { h: 0.04 }); }
    { const f = new Field(lump);
      f.sph([sx * 0.42, 0.66, 0.08], 0.22, { k: 0.05 });
      f.cap([sx * 0.42, 0.66, 0.08], [sx * 0.42, 0.16, 0.0], 0.22, 0.14, { k: 0.1 });
      f.ell([sx * 0.42, 0.45, -0.1], [0.2, 0.2, 0.18], { k: 0.1 });
      at(f, J['kn' + S], { h: 0.035 }); }
    { const f = new Field({ ...lump, lump: 0.008 });
      f.sph([sx * 0.42, 0.15, 0], 0.15, { k: 0.05 }).ell([sx * 0.42, 0.1, -0.1], [0.17, 0.1, 0.14], { k: 0.08 });
      f.ell([sx * 0.42, 0.09, 0.2], [0.24, 0.09, 0.3], { k: 0.08 });
      for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * 0.11; f.cap([sx * 0.42 + ox, 0.09, 0.42], [sx * 0.42 + ox * 1.25, 0.065, 0.58 - Math.abs(i - 1.5) * 0.03], 0.07, 0.06, { k: 0.04 }); }
      at(f, J['ft' + S], { h: 0.03 }); }
  }
  M.build();

  // ---------------------------------------------------------------- anchors
  a.anchor('head', head, 0, 0.55, 0.0); a.anchor('chest', chest, 0, 0.1, 0.55); a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', jaw, 0, -0.05, 0.38); a.anchor('handR', J.handR, 0, 0, 0); a.anchor('handL', J.handL, 0, 0, 0);
  a.anchor('weapon', weapon, 0, 1.6, 0);

  a.clips = {
    idle: { loop: true, dur: 3.2, fn: (t, P) => {
      P.pos('hips', 0, sinT(t, 1 / 3.2) * 0.02, 0); P.rot('chest', sinT(t, 1 / 3.2) * 0.02, 0, 0);
    } },
  };
  withEvents(a);
  return a.finalize();
}
