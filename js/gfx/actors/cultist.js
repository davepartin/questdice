// Ashen Cultist: tall gaunt robed caster with a cracked porcelain mask and an ember-crowned staff.
//
// Rig: root > hips > spine > chest > (neck > head, shoulderL/R > elbow > wrist > hand). staff (under handR), fireball (under handL).
// Anchors: head chest feet mouth handR handL staff (flame, = weapon) fireball sigil
// FX hooks: a.userData.fireball = { anchor:'fireball', release: seconds in 'throw'/'cast' }  (hand fireball hides at release; VFX spawns the bolt)
//           a.userData.light = the staff PointLight (the one dynamic light), flickers in onUpdate.
import { Actor } from './base.js';
import { Particles } from '../particles.js';
import { sprite as spriteTex } from '../tex.js';
import {
  setRim, contactShadow, updateShadow, THREE, sdf, smax, U, mirX, BUMP, sculpt, Kit, tpm, std, glowMat, finish, spike, leaf, turned, paintGeo, ropeGeo, sampleSurface, flapGeo, Hang, Follow,
  mulberry32, makeNoise, rad, clamp, lerp, sstep, sn, ease,
} from './parts.js';

// parametric robe / skirt: elliptical cone with folds, ragged hem, ember-lit lower edge. Hangs from y = yTop.
function robeGeo({ yTop = 0, yBot = -0.9, rTop = 0.19, rBot = 0.36, rz = 0.9, nA = 56, nT = 16, gap = 0, folds = 7, foldAmp = 0.03, jag = 0.12, seed = 1, base = [0.2, 0.19, 0.18], tipC = null, glow = 1 }) {
  const N = makeNoise(seed); const pos = []; const col = []; const emb = []; const idx = [];
  const a0 = gap / 2; const a1 = Math.PI * 2 - gap / 2; const c = new THREE.Color();
  for (let j = 0; j <= nT; j++) {
    const t = j / nT;
    for (let i = 0; i <= nA; i++) {
      const u = i / nA; const th = lerp(a0, a1, u);
      const hemN = 0.5 + 0.5 * N.n3(th * 3.1, seed, 0.4); const hemS = 0.5 + 0.5 * Math.sin(th * 9 + seed * 3);
      const cut = 1 - jag * (hemN * 0.7 + hemS * 0.3) * sstep(0.55, 1, t);
      const rr = lerp(rTop, rBot, Math.pow(t, 1.35)) * (1 + foldAmp * Math.sin(folds * th + N.n3(th * 2, t * 2, seed) * 1.5) * Math.pow(t, 0.7) + 0.02 * N.n3(th * 5, t * 4, seed + 2));
      const y = yTop + (yBot - yTop) * t * (t > 0.55 ? lerp(1, cut, sstep(0.55, 1, t)) : 1);
      pos.push(Math.sin(th) * rr, y, Math.cos(th) * rr * rz);
      const sh = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(folds * th + 1.2)); c.setRGB(base[0], base[1], base[2]).multiplyScalar(sh * (0.8 + 0.4 * N.n3(th * 4, t * 3, seed + 5) * 0.5 + 0.2) * (1 - 0.4 * (1 - t)));
      col.push(c.r, c.g, c.b);
      const hem = Math.pow(sstep(0.78, 1, t), 2.4) * (0.45 + 0.7 * hemN) * glow;
      emb.push(hem);
    }
  }
  const s = nA + 1;
  for (let j = 0; j < nT; j++) for (let i = 0; i < nA; i++) { const q = j * s + i; idx.push(q, q + s, q + 1, q + 1, q + s, q + s + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aEmber', new THREE.Float32BufferAttribute(emb, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.setIndex(idx); g.computeVertexNormals(); void tipC; return g;
}

export function create({ seed = 1, quality = 'high', id } = {}) {
  const Q = quality === 'low' ? 2.9 : quality === 'med' ? 2.2 : 1.75;
  const rng = mulberry32(seed * 4421 + 9);
  const NZ = makeNoise(seed + 21);
  const a = new Actor({ name: 'cultist', height: 1.95, radius: 0.5 });
  const kit = new Kit();
  const R = -1; const L = 1;
  const tc = new THREE.Color(); const sc = new THREE.Color();
  const EMBER = 0xff6a1a;

  setRim(0xc070ff);
  // ---- materials
  const robeDark = tpm('cinderCloth', { tint: 0x3a3633, dark: 0x0a0908, seed: 3, roughness: 1 }, { scale: 3, nrm: 0.8, ember: EMBER, side: THREE.DoubleSide });
  const robeAsh = tpm('cinderCloth', { tint: 0x8a857e, dark: 0x1e1c1a, seed: 5, roughness: 1 }, { scale: 3, nrm: 0.8, ember: EMBER, side: THREE.DoubleSide });
  const robeSolid = tpm('cinderCloth', { tint: 0x7a756e, dark: 0x181614, seed: 7, roughness: 1 }, { scale: 3, nrm: 0.8, ember: EMBER });
  const mask = tpm('porcelain', { tint: 0xe9e3d3, dark: 0x8a8070, seed: 4, physical: true, clearcoat: 0.6, clearcoatRoughness: 0.3 }, { scale: 4, nrm: 0.6, ember: EMBER });
  const skinP = tpm('skinPale', { seed: 3, color: 0xb0a8a4 }, { scale: 8, nrm: 0.6 });
  const wood = tpm('bark', { tint: 0x3a2e26, dark: 0x0c0806, seed: 3 }, { scale: 2.4, nrm: 1.0, ember: EMBER });
  const bone = tpm('bone', { tint: 0xcabfa6, dark: 0x4a4030, seed: 9 }, { scale: 6 });
  const leather = tpm('leatherDark', { seed: 7 }, { scale: 14, nrm: 0.7 });
  const iron = tpm('iron', { seed: 4, metalness: 0.75, roughness: 0.9 }, { scale: 5 });
  const eyeGlow = glowMat(EMBER, 3.5);
  const fireM = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  // ---- skeleton
  const root = a.joint('root', a.model, 0, 0, 0);
  const hips = a.joint('hips', root, 0, 0.95, 0);
  const spine = a.joint('spine', hips, 0, 0.1, 0);
  const chest = a.joint('chest', spine, 0, 0.2, 0);
  const neck = a.joint('neck', chest, 0, 0.3, 0.02);
  const head = a.joint('head', neck, 0, 0.1, 0.035);
  const sh = {}; const el = {}; const wr = {}; const hd = {};
  for (const s of [R, L]) {
    const k = s === R ? 'R' : 'L';
    sh[s] = a.joint(`shoulder${k}`, chest, s * 0.21, 0.24, 0);
    el[s] = a.joint(`elbow${k}`, sh[s], s * 0.02, -0.3, 0.02);
    wr[s] = a.joint(`wrist${k}`, el[s], 0, -0.27, 0.0);
    hd[s] = a.joint(`hand${k}`, wr[s], 0, 0, 0);
  }
  const tome = a.joint('tome', hips, 0.2, -0.12, 0.05);
  // rest pose: staff arm (right) bent forward holding the staff, off arm relaxed
  sh[R].rotation.set(-0.45, 0, -0.1); el[R].rotation.set(-1.15, 0, 0); wr[R].rotation.set(0.1, 0, 0);
  sh[L].rotation.set(-0.12, 0, 0.12); el[L].rotation.set(-0.5, 0, 0);
  spine.rotation.x = 0.04; head.rotation.x = 0.06;
  a.root.updateMatrixWorld(true);

  const S = (joint, f, min, max, h, color, o = {}) => {
    const g = sculpt(f, { min, max, h: h * Q, color, aoR: o.aoR ?? 1.5, aoK: o.aoK ?? 0.85, ember: o.ember });
    kit.add(joint, g, o.mat || robeSolid, o.xf || {}); return g;
  };
  const clothCol = (base, k = 1) => (x, y, z, nx, ny, nz, ao, c) => {
    const n = 0.5 + 0.5 * NZ.n3(x * 7, y * 7, z * 7); const fold = 0.65 + 0.35 * Math.sin(x * 60 + y * 20 + NZ.n3(x * 4, y * 4, z * 4) * 4);
    c.setRGB(base[0], base[1], base[2]).multiplyScalar((0.55 + n * 0.5) * fold * k);
  };

  // ================================================================ upper body: gaunt torso under a layered robe
  const torsoF = U(0.05, sdf.ell(0, 0.04, 0.0, 0.17, 0.25, 0.115, [0.04, 0, 0]), sdf.cap([-0.2, 0.2, 0], [0.2, 0.2, 0], 0.07, 0.07), sdf.cap([0, 0.18, 0], [0, 0.3, 0.02], 0.1, 0.07), sdf.ell(0, -0.2, 0.0, 0.15, 0.13, 0.11));
  const bodyEmber = (x, y, z) => { const n = NZ.n3(x * 9, y * 9, z * 9); return Math.pow(sstep(0.55, 0.9, 0.5 + 0.5 * n), 3) * 0.9 * sstep(-0.2, -0.38, y) * 0; };
  S(chest, torsoF, [-0.34, -0.42, -0.22], [0.34, 0.42, 0.22], 0.012, clothCol([0.62, 0.6, 0.57]), { mat: robeSolid, ember: bodyEmber });
  // the sash/over-tabard: front panel hanging from the chest
  // mantle / cowl draped over the shoulders (thick folds, glowing frayed edge)
  const cowlF = U(0.05, sdf.eltorus(0, 0.25, 0.0, 0.23, 0.17, 0.05, [-0.15, 0, 0]), sdf.eltorus(0, 0.18, 0.02, 0.25, 0.19, 0.04, [-0.15, 0, 0]), sdf.cap([0, 0.3, -0.02], [0, 0.34, 0.03], 0.1, 0.08));
  const cowlFold = (x, y, z) => { const d = cowlF(x, y, z); return d + 0.006 * Math.sin(Math.atan2(x, z) * 11 + y * 25); };
  S(chest, cowlFold, [-0.4, 0.04, -0.3], [0.4, 0.42, 0.32], 0.011, clothCol([0.42, 0.4, 0.38]), { mat: robeSolid, ember: (x, y, z) => sstep(0.17, 0.12, y) * 0.3 });

  // skirts: charcoal under-robe, ash over-robe (open front), ragged glowing hems, swaying
  const hangs = [];
  const skirt1 = robeGeo({ yTop: 0.06, yBot: -0.94, rTop: 0.16, rBot: 0.29, nA: 96, nT: 20, folds: 11, foldAmp: 0.06, jag: 0.1, seed: seed + 1, base: [0.3, 0.29, 0.28], glow: 1.1 });
  const skirt2 = robeGeo({ yTop: 0.05, yBot: -0.72, rTop: 0.18, rBot: 0.32, nA: 84, nT: 18, gap: 1.2, folds: 9, foldAmp: 0.07, jag: 0.22, seed: seed + 2, base: [0.62, 0.6, 0.57], glow: 1.0 });
  const skirt3 = robeGeo({ yTop: 0.06, yBot: -0.5, rTop: 0.19, rBot: 0.27, nA: 24, nT: 12, gap: Math.PI * 1.35, folds: 7, foldAmp: 0.08, jag: 0.3, seed: seed + 3, base: [0.45, 0.43, 0.4], glow: 1.2 });
  skirt3.rotateY(Math.PI);
  for (const [g, mt, len] of [[skirt1, robeDark, 1.0], [skirt2, robeAsh, 0.78], [skirt3, robeAsh, 0.56]]) {
    const hg = new Hang(g, { top: 0.06, len }); const m = kit.mesh(hips, g, mt); m.frustumCulled = false; hangs.push(hg);
  }
  // charred boots peeking out
  for (const s of [R, L]) kit.add(hips, new THREE.SphereGeometry(1, 12, 8), leather, { p: [s * 0.1, -0.93, 0.1], s: [0.06, 0.04, 0.12], tint: 0x2a2018 });

  // ---- belt: knotted rope with charms, a vial, and a burnt tome on a chain
  kit.add(hips, new THREE.TorusGeometry(0.17, 0.014, 6, 36), leather, { p: [0, 0.03, 0], r: [Math.PI / 2 + 0.05, 0, 0], s: [1, 0.88, 1], tint: 0x9a8a6a });
  kit.add(hips, new THREE.TorusGeometry(0.17, 0.011, 6, 36), leather, { p: [0, 0.055, 0], r: [Math.PI / 2 + 0.05, 0, 0], s: [1, 0.88, 1], tint: 0x7a6a50 });
  for (let i = 0; i < 6; i++) {
    const an = -1.1 + i * 0.4; const x = Math.sin(an) * 0.175; const z = Math.cos(an) * 0.16;
    const len = 0.05 + rng() * 0.08;
    kit.add(hips, ropeGeo([[x, 0.03, z], [x * 1.04, 0.03 - len * 0.5, z + 0.01], [x * 1.05, 0.03 - len, z + 0.012]], 0.0035, { segs: 5, radial: 4 }), leather, { tint: 0x8a7a5a });
    if (i % 2 === 0) kit.add(hips, new THREE.SphereGeometry(0.014, 8, 6), bone, { p: [x * 1.05, 0.03 - len - 0.01, z + 0.012], s: [0.8, 1.3, 0.8], untex: true, tint: 0xd8ccb0 });
    else kit.add(hips, new THREE.CylinderGeometry(0.012, 0.014, 0.05, 8), iron, { p: [x * 1.05, 0.03 - len - 0.02, z + 0.012] });
  }
  kit.add(hips, ropeGeo([[0.17, 0.03, 0.02], [0.2, -0.04, 0.04], [0.2, -0.1, 0.05]], 0.0045, { segs: 6, radial: 4 }), iron);
  kit.add(tome, new THREE.BoxGeometry(0.15, 0.2, 0.045, 1, 1, 1), leather, { p: [0, -0.1, 0], tint: 0x2a2220 });
  kit.add(tome, new THREE.BoxGeometry(0.135, 0.185, 0.034), robeSolid, { p: [0.004, -0.1, 0.0], tint: 0xb8a888, untex: true });
  kit.add(tome, new THREE.BoxGeometry(0.145, 0.195, 0.004), leather, { p: [0, -0.1, 0.023], tint: 0x3a2a24 });
  kit.add(tome, new THREE.BoxGeometry(0.03, 0.03, 0.006), iron, { p: [0.0, -0.1, 0.027] });

  // ================================================================ arms: wide sleeves, gaunt wrapped hands
  const sleeveCuff = (x, y, z) => -(y + 0.275 + 0.02 * NZ.n3(x * 20, 0, z * 20) + 0.015 * Math.sin(Math.atan2(x, z) * 7));
  for (const s of [R, L]) {
    const upper = U(0.03, sdf.cap([0, 0, 0], [s * 0.02, -0.3, 0.02], 0.068, 0.082), sdf.sphere(0, 0.0, 0, 0.075));
    S(sh[s], upper, [-0.18, -0.42, -0.16], [0.18, 0.12, 0.16], 0.011, clothCol([0.55, 0.53, 0.5]), { mat: robeSolid });
    const lower = (x, y, z) => Math.max(sdf.cap([0, 0.0, 0], [0, -0.27, 0.0], 0.07, 0.1)(x, y, z), sleeveCuff(x, y, z));
    S(el[s], lower, [-0.2, -0.42, -0.2], [0.2, 0.1, 0.2], 0.011, clothCol([0.5, 0.48, 0.46]), { mat: robeSolid, ember: (x, y, z) => sstep(-0.22, -0.28, y) * 0.55 });
    // hand: gaunt long fingers, bound with wrappings (wrap bands tint the vertex colours)
    const fist = s === R;
    const fing = [];
    let handF;
    // staff axis in hand space = inverse of the hand's rest world rotation applied to world up
    hd[s].updateWorldMatrix(true, false);
    const qh = new THREE.Quaternion(); hd[s].getWorldQuaternion(qh); const qi = qh.clone().invert();
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(qi);
    const eul = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
    if (fist) {
      const palm = sdf.ell(0, -0.045, 0.0, 0.032, 0.05, 0.026);
      const loops = [0, 1, 2, 3].map((i) => { const off = axis.clone().multiplyScalar((i - 1.5) * 0.0175); const c0 = new THREE.Vector3(0, -0.07, 0.025).add(off); return sdf.torus(c0.x, c0.y, c0.z, 0.0225, 0.0095, [eul.x, eul.y, eul.z]); });
      const g0 = U(0.008, palm, ...loops);
      const bc = new THREE.Vector3(0, -0.07, 0.025); const ax = axis.clone();
      const bore = (x, y, z) => { const p = new THREE.Vector3(x - bc.x, y - bc.y, z - bc.z); const al = p.dot(ax); const rd = p.addScaledVector(ax, -al).length(); return Math.max(rd - 0.0125, Math.abs(al) - 0.1); };
      handF = (x, y, z) => Math.max(g0(x, y, z), -bore(x, y, z));
    } else {
      const palm = sdf.ell(0, -0.045, 0.0, 0.034, 0.05, 0.016);
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.0165; const Ln = 0.065 + (i === 1 || i === 2 ? 0.014 : 0);
        fing.push(sdf.cap([fx, -0.085, 0], [fx * 1.15, -0.085 - Ln * 0.5, 0.012], 0.0095, 0.0078), sdf.cap([fx * 1.15, -0.085 - Ln * 0.5, 0.012], [fx * 1.3, -0.085 - Ln, 0.04], 0.0078, 0.006));
      }
      const thumb = U(0.006, sdf.cap([s * -0.024, -0.04, 0.0], [s * -0.04, -0.08, 0.03], 0.012, 0.0085), sdf.cap([s * -0.04, -0.08, 0.03], [s * -0.04, -0.11, 0.055], 0.0085, 0.006));
      handF = U(0.01, palm, thumb, ...fing);
    }
    const wrap = (x, y, z, nx, ny, nz, ao, c) => {
      c.setRGB(1, 1, 1); const band = 0.5 + 0.5 * Math.sin(y * 150 + x * 40 + z * 30); const w = sstep(-0.01, -0.05, y) * sstep(-0.12, -0.07, y) + sstep(0.0, -0.02, y) * 0;
      const wrapZone = (y > -0.06 ? 1 : 0.0) + (y < -0.09 ? 0.5 : 0);
      c.lerp(sc.setRGB(0.45, 0.4, 0.34).multiplyScalar(0.55 + band * 0.5), clamp(wrapZone * band));
      void w; c.multiply(tc.setScalar(0.65 + 0.35 * ao));
    };
    S(hd[s], handF, [-0.08, -0.22, -0.08], [0.08, 0.04, 0.1], 0.0055, wrap, { mat: skinP, aoR: 0.8 });
    if (!fist) for (let i = 0; i < 4; i++) { const fx = (i - 1.5) * 0.0165; const Ln = 0.065 + (i === 1 || i === 2 ? 0.014 : 0); kit.add(hd[s], spike(0.022, 0.005, { curve: 0.2, col0: 0x2a2420, col1: 0x6a5c4a }), skin2(), { p: [fx * 1.3, -0.085 - Ln, 0.04], r: [rad(-165), 0, 0], untex: true }); }
  }
  function skin2() { return skinP; }

  // ================================================================ head: deep hood, cracked porcelain mask, ember eye-slits
  // mask plate
  const maskF = (() => {
    const plate = sdf.ell(0, 0.06, 0.055, 0.082, 0.115, 0.07);
    const brow = mirX(sdf.cap([0.06, 0.1, 0.095], [0.012, 0.095, 0.115], 0.014, 0.012));
    const nose = sdf.cap([0, 0.09, 0.115], [0, 0.04, 0.145], 0.012, 0.014);
    const cheek = mirX(sdf.ell(0.055, 0.045, 0.095, 0.022, 0.02, 0.022));
    const chin = sdf.ell(0, -0.03, 0.1, 0.034, 0.04, 0.034);
    const eyeSlit = mirX(sdf.ell(0.037, 0.082, 0.118, 0.026, 0.0065, 0.04, [0, 0, 0.28]));
    const mouthSlit = sdf.ell(0, 0.0, 0.135, 0.032, 0.004, 0.03);
    const cutBack = (x, y, z) => -(z - 0.03);
    const f = U(0.02, plate, brow, nose, cheek, chin);
    return (x, y, z) => Math.max(f(x, y, z), cutBack(x, y, z), -eyeSlit(x, y, z), -mouthSlit(x, y, z));
  })();
  const eyeSlitF = mirX(sdf.ell(0.037, 0.082, 0.118, 0.026, 0.0065, 0.04, [0, 0, 0.28]));
  const maskCol = (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(1, 1, 1); c.multiply(tc.setScalar(0.5 + 0.5 * ao)); const e = sstep(0.012, 0.0, eyeSlitF(x, y, z)); c.lerp(sc.setRGB(0.05, 0.02, 0.01), e); };
  S(head, maskF, [-0.12, -0.1, 0.0], [0.12, 0.2, 0.2], 0.0036, maskCol, { mat: mask, aoR: 1.2, ember: (x, y, z) => {
    const e = sstep(0.011, 0.001, eyeSlitF(x, y, z)) * 1.6;
    const crack = Math.max(0, 1 - Math.abs(Math.sin((x * 0.6 + y * 1.1) * 38 + NZ.n3(x * 8, y * 8, z * 8) * 5)) * 7) * sstep(0.02, 0.08, y) * 0.3;
    return e + crack;
  } });
  // eye-glow cores deep inside the slits
  for (const s of [R, L]) kit.add(head, new THREE.SphereGeometry(1, 10, 8), eyeGlow, { p: [s * 0.037, 0.082, 0.098], s: [0.022, 0.0055, 0.012], r: [0, 0, s * -0.28], ember: 1.2 });
  kit.add(head, new THREE.SphereGeometry(1, 12, 10), eyeGlow, { p: [0, 0.0, 0.118], s: [0.026, 0.0035, 0.01], ember: 0.5 });
  // hood: thick shell that frames the mask, falls to a point at the back
  const hoodF = (() => {
    const outer = U(0.06, sdf.ell(0, 0.09, -0.015, 0.145, 0.165, 0.18), sdf.cap([0, 0.1, -0.1], [0, -0.1, -0.3], 0.1, 0.03), sdf.cap([-0.14, 0.0, 0.0], [0.14, 0.0, 0.0], 0.1, 0.1));
    const inner = sdf.ell(0, 0.07, 0.0, 0.105, 0.14, 0.16);
    const open = sdf.box(0, 0.05, 0.22, 0.095, 0.17, 0.12, 0.05);
    const chinCut = sdf.box(0, -0.2, 0.0, 0.5, 0.15, 0.5);
    return (x, y, z) => Math.max(outer(x, y, z), -inner(x, y, z) * 1, -(open(x, y, z)) * 1, -(chinCut(x, y, z)) * 0 - Math.max(0, 0) + (y < -0.07 ? 0 : 0) , -(y + 0.09) * 0 - 0);
  })();
  const hoodShell = (x, y, z) => { const d = hoodF(x, y, z); return d; };
  S(head, BUMP(hoodShell, { amp: 0.0025, freq: 9, seed: seed + 5, oct: 1 }), [-0.24, -0.25, -0.36], [0.24, 0.3, 0.3], 0.0085, (x, y, z, nx, ny, nz, ao, c) => { clothCol([0.36, 0.34, 0.32])(x, y, z, nx, ny, nz, ao, c); const inside = sstep(0.0, 0.06, z - 0.0) * (nz < -0.1 ? 0 : 0); c.multiplyScalar(0.3 + 0.7 * ao); void inside; }, { mat: robeSolid, ember: (x, y, z) => sstep(0.0, 0.1, z) * sstep(0.04, 0.0, Math.abs(Math.abs(x) - 0.104)) * 0.4 * 0 });
  // dark void inside the hood
  kit.add(head, new THREE.SphereGeometry(0.1, 14, 10), std(0x020101, { rough: 1 }), { p: [0, 0.07, 0.0], s: [1, 1.2, 1.0] });

  // ================================================================ staff: gnarled charred wood, prongs cradling a skull + living flame
  const staff = a.joint('staff', hd[R], 0, -0.07, 0.025);
  const fireball = a.joint('fireball', hd[L], 0, -0.1, 0.05); fireball.visible = false;
  {
    const qh = new THREE.Quaternion(); hd[R].getWorldQuaternion(qh); staff.quaternion.copy(qh.clone().invert());
    a.root.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); staff.getWorldPosition(wp);
    const below = wp.y; const above = 2.12 - wp.y;           // base touches the ground, tip at ~2.1 m
    const pts = []; const nPts = 16;
    for (let i = 0; i <= nPts; i++) { const t = i / nPts; const y = lerp(-below, above - 0.12, t); pts.push([0.018 * Math.sin(t * 7 + seed) + 0.01 * Math.sin(t * 17), y, 0.016 * Math.cos(t * 5.3 + 1) + 0.008 * Math.sin(t * 13)]); }
    const geo = ropeGeo(pts, (t) => 0.021 * (0.8 + 0.5 * Math.sin(t * 40) * 0.12 + (t > 0.9 ? 0.4 * (t - 0.9) * 10 : 0)) * (1 - 0.15 * t), { segs: 80, radial: 8 });
    paintGeo(geo, (x, y, z, c) => { const n = 0.5 + 0.5 * NZ.n3(x * 30, y * 20, z * 30); c.setScalar(0.55 + n * 0.5); });
    kit.add(staff, geo, wood, { ember: 0 });
    // knots and a bound-on charm
    for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.17; const yy = lerp(-below, above - 0.12, t); kit.add(staff, new THREE.SphereGeometry(0.03, 8, 6), wood, { p: [0.02 * Math.sin(t * 7 + seed), yy, 0.02], s: [1, 1.4, 1] }); }
    // prongs: curved charred horns that hold the skull
    const topY = above - 0.12;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      kit.add(staff, spike(0.2, 0.017, { curve: 0.0, sides: 6, segs: 6, col0: 0x2a2018, col1: 0x6a4a30 }), wood, { p: [Math.sin(ang) * 0.018, topY, Math.cos(ang) * 0.018], r: [Math.cos(ang) * 0.5, 0, -Math.sin(ang) * 0.5], untex: true });
    }
    // skull: SDF, charred, hollow sockets with an ember glow
    const skullF = (() => {
      const cr = sdf.ell(0, 0, 0, 0.06, 0.055, 0.065); const jawS = sdf.ell(0, -0.045, 0.025, 0.04, 0.025, 0.035);
      const sock = mirX(sdf.ell(0.026, 0.0, 0.05, 0.016, 0.016, 0.02)); const nas = sdf.ell(0, -0.025, 0.065, 0.008, 0.014, 0.015);
      const f = U(0.02, cr, jawS);
      return (x, y, z) => Math.max(f(x, y, z), -sock(x, y, z), -nas(x, y, z));
    })();
    const sockF = mirX(sdf.ell(0.026, 0.0, 0.05, 0.016, 0.016, 0.02));
    kit.add(staff, sculpt(skullF, { min: [-0.1, -0.1, -0.1], max: [0.1, 0.09, 0.11], h: 0.0032 * Q / 1.75 * 1.75, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.9, 0.85, 0.75).multiplyScalar(0.35 + 0.5 * ao * (0.6 + 0.4 * NZ.n3(x * 40, y * 40, z * 40))); const soot = sstep(0.0, 0.06, y + 0.03); c.lerp(sc.setRGB(0.05, 0.04, 0.03), soot * 0.5); }, ember: (x, y, z) => sstep(0.006, -0.012, sockF(x, y, z)) * 0.0 }), bone, { p: [0, topY + 0.07, 0.0], r: [0.0, 0, 0] });
    for (const s of [R, L]) kit.add(staff, new THREE.SphereGeometry(0.011, 8, 6), eyeGlow, { p: [s * 0.026, topY + 0.07, 0.052], ember: 1.4 });
    // flame: layered translucent tongues (animated), plus glow sprite & the light
    a.userData._flameTop = topY + 0.17;
  }
  const flame = new THREE.Group(); flame.position.set(0, a.userData._flameTop, 0); staff.add(flame);
  const tongues = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.ConeGeometry(0.05 - i * 0.005, 0.22 + i * 0.02, 10, 6, true);
    const p = g.attributes.position; const cl = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) { const k = clamp((p.getY(v) / (0.22 + i * 0.02)) + 0.5); tc.setRGB(1, 0.25 + 0.7 * (1 - k) ** 1.4, 0.03 + 0.5 * (1 - k) ** 3).multiplyScalar(1.8 - i * 0.2); cl[v * 3] = tc.r; cl[v * 3 + 1] = tc.g; cl[v * 3 + 2] = tc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.translate(0, 0.11, 0);
    const m = new THREE.Mesh(g, fireM); m.renderOrder = 6; m.rotation.y = i * 1.3; m.userData.k = i; flame.add(m); tongues.push(m);
  }
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('glow'), color: 0xff7a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); flameGlow.position.y = 0.1; flameGlow.scale.setScalar(0.7); flame.add(flameGlow);
  const light = new THREE.PointLight(0xff7a2a, 2.6, 6, 2); light.position.set(0, 0.12, 0.05); light.castShadow = false; flame.add(light);
  a.userData.light = light;

  // fireball prop (appears in the off hand during Ember casts) and sigil / ward effects
  {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18).multiplyScalar(2.5) })); fireball.add(orb);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('glow'), color: 0xff6a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); gl.scale.setScalar(0.55); fireball.add(gl);
    a.userData.fireball = { anchor: 'fireball', release: 0.6 }; fireball.userData.gl = gl;
  }
  const fx = new THREE.Group(); a.model.add(fx);
  const sigil = new THREE.Group(); sigil.position.set(0, 1.3, 0.55); fx.add(sigil); sigil.visible = false;
  {
    const mk = (tex, sz, col) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(tex), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(sz); sigil.add(sp); return sp; };
    sigil.userData.parts = [mk('ring', 0.7, 0x9a5aff), mk('star', 0.5, 0xc08aff), mk('ring', 0.42, 0x6a3acc)];
  }
  const wardRing = new THREE.Group(); wardRing.position.set(0, 1.2, 0); fx.add(wardRing); wardRing.visible = false;
  const wardEmbers = [];
  for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('glow'), color: 0xff8a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(0.11); wardRing.add(sp); wardEmbers.push(sp); }

  // drifting ash & embers that follow the actor
  const ash = new Particles({ max: 90, sprite: 'dot', gravity: 0.04, blending: 'add' });
  a.model.add(ash.object); ash.object.onBeforeRender = (r, sc2, cam) => { const h = r.getDrawingBufferSize(new THREE.Vector2()).y; ash.material.uniforms.uScale.value = h / (2 * Math.tan((cam.fov * Math.PI) / 360)); };
  let emitAcc = 0;

  // ================================================================ anchors
  contactShadow(a, 0.55, 0.55, 0.6);
  a.root.scale.setScalar(1.15); a.height = 1.95 * 1.15; a.radius = 0.6;
  a.anchor('head', head, 0, 0.3, 0.0);
  a.anchor('chest', chest, 0, 0.05, 0.14);
  a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', head, 0, 0.0, 0.15);
  a.anchor('handR', hd[R], 0, -0.07, 0.03);
  a.anchor('handL', hd[L], 0, -0.07, 0.03);
  a.anchor('staff', flame, 0, 0.12, 0); a.anchors.weapon = a.anchors.staff;
  a.anchor('fireball', fireball, 0, 0, 0);
  a.anchor('sigil', sigil, 0, 0, 0);
  kit.build();

  // ================================================================ animation
  const nm = (n, s) => `${n}${s === R ? 'R' : 'L'}`;
  const out = (s, v) => s * v;
  const breathe = (P, t, k = 1) => { const b = sn(t, 0.36); P.rot('chest', b * 0.02 * k, 0, 0); P.scl('chest', 1 + b * 0.01 * k, 1 + b * 0.014 * k, 1 + b * 0.01 * k); P.rot('shoulderL', 0, 0, b * 0.015 * k); P.rot('shoulderR', 0, 0, -b * 0.015 * k); };
  const blinkAmt = (t, per) => 0; void blinkAmt;
  const clips = {};
  // helper: staff arm hold (rest) + off arm
  clips.idle = { loop: true, dur: 4.0, fn: (t, P) => {
    const w = sn(t, 0.25);
    P.pos('hips', w * 0.012, sn(t, 0.36) * 0.004, 0); P.rot('hips', 0, w * 0.03, w * 0.012);
    breathe(P, t); P.rot('spine', sn(t, 0.36, 0.2) * 0.012, sn(t, 0.125) * 0.05, 0);
    P.rot('neck', sn(t, 0.2, 0.3) * 0.03, sn(t, 0.125, 0.4) * 0.15, sn(t, 0.17) * 0.03); P.rot('head', 0.02 + sn(t, 0.25, 0.1) * 0.03, sn(t, 0.125, 0.45) * 0.2, sn(t, 0.17, 0.2) * 0.04);
    P.rot('shoulderL', sn(t, 0.25, 0.3) * 0.03, 0, 0); P.rot('elbowL', sn(t, 0.25, 0.5) * 0.04, 0, 0); P.rot('wristL', sn(t, 0.5) * 0.08, 0, 0);
    P.rot('shoulderR', sn(t, 0.25, 0.1) * 0.015, 0, 0); P.rot('wristR', sn(t, 0.3, 0.2) * 0.03, 0, sn(t, 0.2) * 0.03);
    P.rot('tome', sn(t, 0.25, 0.6) * 0.05, 0, sn(t, 0.25) * 0.05);
  } };
  clips.ready = { loop: true, dur: 2.0, fn: (t, P) => {
    P.pos('hips', 0, -0.02, 0); P.rot('spine', 0.05, sn(t, 0.5) * 0.04, 0); P.rot('chest', 0.04, 0, 0); breathe(P, t, 2);
    P.rot('neck', 0.06, 0, 0); P.rot('head', 0.12, sn(t, 0.25) * 0.1, 0);
    P.rot('shoulderL', -0.5, 0, 0.3); P.rot('elbowL', -1.0, 0, 0); P.rot('wristL', 0.3 * sn(t, 1), 0, 0);
    P.rot('shoulderR', -0.1, 0, 0); P.rot('elbowR', -0.1, 0, 0);
  } };
  clips.tele_cast = { loop: true, dur: 1.6, fn: (t, P) => {          // fireball gathering in the off hand
    P.pos('hips', 0, -0.015, 0); breathe(P, t, 2); P.rot('spine', -0.04, 0, 0); P.rot('chest', -0.1, 0.1, 0); P.rot('neck', -0.05, 0, 0); P.rot('head', -0.05, 0.05 * sn(t, 0.6), 0);
    P.rot('shoulderL', -1.2, 0, out(L, 0.25)); P.rot('elbowL', -1.25, 0, 0); P.rot('wristL', -0.2 + 0.1 * sn(t, 2), 0, 0);
    P.rot('shoulderR', -0.1, 0, 0); P.rot('elbowR', -0.05, 0, 0);
  } };
  clips.tele_hex = { loop: true, dur: 2.0, fn: (t, P) => {            // both arms raised, sigil spinning
    P.pos('hips', 0, 0.0, 0); breathe(P, t, 1.5); P.rot('spine', -0.08, 0, 0); P.rot('chest', -0.15, 0, 0); P.rot('neck', -0.1, 0, 0); P.rot('head', -0.15, sn(t, 0.5) * 0.06, 0);
    for (const s of [R, L]) { P.rot(nm('shoulder', s), -2.3 + 0.4 * 0 - (s === R ? 0.0 : 0.0), 0, out(s, 0.35 + 0.05 * sn(t, 1))); P.rot(nm('elbow', s), -0.4, 0, 0); P.rot(nm('wrist', s), -0.4 + 0.1 * sn(t, 1.5, s), 0, 0); }
    P.rot('shoulderR', 0.0, 0, 0);
  } };
  clips.tele_guard = { loop: true, dur: 2.0, fn: (t, P) => {          // crossed arms, a ring of embers
    P.pos('hips', 0, -0.015, 0); breathe(P, t, 1.5); P.rot('spine', 0.06, 0, 0); P.rot('head', 0.12, 0, 0);
    for (const s of [R, L]) { P.rot(nm('shoulder', s), -0.55, out(s, -0.9), out(s, -0.25)); P.rot(nm('elbow', s), -2.0, 0, 0); P.rot(nm('wrist', s), 0.1, 0, 0); }
  } };
  clips.guard = { loop: true, dur: 2.0, fn: (t, P) => clips.tele_guard.fn(t, P) };
  clips.tele_strike = { loop: true, dur: 1.4, fn: (t, P) => {         // staff drawn back like a spear
    P.pos('hips', 0, -0.02, -0.02); breathe(P, t, 2); P.rot('spine', 0.05, 0.25, 0); P.rot('chest', 0, 0.2, 0); P.rot('head', 0.1, -0.1, 0);
    P.rot('shoulderR', -0.55, 0, 0.0); P.rot('elbowR', -0.6, 0, 0); P.rot('shoulderL', -0.8, 0, 0.35); P.rot('elbowL', -0.9, 0, 0);
  } };
  clips.tele_siphon = clips.tele_cast;
  clips.attack = { dur: 0.9, events: { hit: 0.42 }, fn: (t, P) => {      // Bolt: staff thrust, flame flares
    const w = ease.io(clamp(t / 0.3)); const th = ease.out(clamp((t - 0.3) / 0.12)); const rec = ease.io(clamp((t - 0.55) / 0.35)); const a1 = w * (1 - th); const a2 = th * (1 - rec);
    P.pos('hips', 0, 0, -0.04 * a1 + 0.14 * a2); P.rot('spine', -0.1 * a1 + 0.18 * a2, 0.3 * a1 - 0.25 * a2, 0); P.rot('chest', -0.1 * a1 + 0.1 * a2, 0.2 * a1, 0); P.rot('head', 0.05, 0, 0);
    P.rot('shoulderR', -0.2 * a1 - 0.9 * a2, 0, 0.0); P.rot('elbowR', -0.3 * a1 + 0.5 * a2, 0, 0); P.rot('wristR', 0.0, 0, 0.0);
    P.rot('shoulderL', -0.5 * a1 - 0.6 * a2, 0, 0.3); P.rot('elbowL', -0.8 * a1 - 0.4 * a2, 0, 0);
  } };
  clips.attack2 = clips.attack;
  clips.throw = { dur: 1.2, events: { hit: 0.6 }, fn: (t, P) => {      // Ember: gather, hurl
    const g = ease.io(clamp(t / 0.4)); const th = ease.out(clamp((t - 0.45) / 0.15)); const rec = ease.io(clamp((t - 0.7) / 0.5)); const a1 = g * (1 - th); const a2 = th * (1 - rec);
    P.pos('hips', 0, 0, -0.03 * a1 + 0.08 * a2); P.rot('spine', -0.12 * a1 + 0.15 * a2, 0.15 * a1 - 0.2 * a2, 0); P.rot('chest', -0.1 * a1 + 0.05 * a2, 0, 0); P.rot('head', -0.05 * a1 + 0.08 * a2, 0, 0);
    P.rot('shoulderL', -1.2 * a1 - 1.5 * a2 + 0.0, 0, out(L, 0.25) * a1); P.rot('elbowL', -1.25 * a1 + 1.0 * a2, 0, 0); P.rot('wristL', -0.2 * a1 - 0.5 * a2, 0, 0);
    P.rot('shoulderR', -0.1, 0, 0);
  } };
  clips.cast = clips.throw;
  clips.hex = { dur: 1.6, events: { hit: 0.7 }, fn: (t, P) => {         // arms raised, sigil descends, hands clench
    const up = ease.io(clamp(t / 0.5)); const cl = ease.out(clamp((t - 0.6) / 0.2)); const down = ease.io(clamp((t - 1.1) / 0.5)); const k = up * (1 - down);
    P.pos('hips', 0, 0.01 * k, 0); P.rot('spine', -0.08 * k + 0.12 * cl, 0, 0); P.rot('chest', -0.15 * k + 0.1 * cl, 0, 0); P.rot('head', -0.15 * k + 0.2 * cl, 0, 0);
    for (const s of [R, L]) { P.rot(nm('shoulder', s), -2.3 * k + 0.6 * cl * (1 - down), 0, out(s, 0.35) * k); P.rot(nm('elbow', s), -0.4 * k - 0.5 * cl * (1 - down), 0, 0); P.rot(nm('wrist', s), -0.4 * k + 0.5 * cl, 0, 0); }
  } };
  clips.siphon = { dur: 1.8, events: { hit: 0.9 }, fn: (t, P) => {      // arms out, pulling inward
    const o = ease.io(clamp(t / 0.5)); const pull = Math.sin(clamp((t - 0.5) / 1.0) * Math.PI); const back = 1 - ease.io(clamp((t - 1.4) / 0.4)); const k = o * back;
    P.rot('spine', -0.1 * k, 0, 0); P.rot('chest', -0.12 * k - 0.1 * pull, 0, 0); P.rot('head', -0.1 * k, 0, 0); P.pos('hips', 0, 0, -0.02 * pull);
    for (const s of [R, L]) { P.rot(nm('shoulder', s), -0.9 * k + 0.4 * pull, 0, out(s, 1.1) * k - out(s, 0.5) * pull); P.rot(nm('elbow', s), -0.3 * k - 0.7 * pull, 0, 0); P.rot(nm('wrist', s), -0.2 * k, 0, 0); }
  } };
  clips.hurt = { dur: 0.45, fn: (t, P) => {
    const k = Math.sin(clamp(t / 0.45) * Math.PI) ** 0.8;
    P.pos('hips', 0, 0, -0.1 * k); P.rot('spine', -0.3 * k, 0.2 * k, 0); P.rot('chest', -0.15 * k, 0, 0.05 * k); P.rot('neck', -0.2 * k, 0, 0); P.rot('head', -0.3 * k, -0.2 * k, 0.1 * k);
    P.rot('shoulderL', -0.5 * k, 0, 0.5 * k); P.rot('shoulderR', 0.2 * k, 0, -0.3 * k);
  } };
  clips.die = { dur: 1.5, fn: (t, P) => {
    const k = ease.in(clamp(t / 1.0)); const kk = clamp(t / 1.5);
    P.pos('root', 0, 0.12 * ease.in(clamp((t - 0.15) / 1.0)), 0.0); P.rot('root', -1.45 * ease.in(clamp((t - 0.15) / 1.0)), 0, 0);
    P.rot('head', -0.4 * kk, 0.3 * kk, 0.2 * kk); P.rot('neck', -0.3 * kk, 0, 0);
    P.rot('shoulderL', -0.4 * k, 0, 1.0 * k); P.rot('shoulderR', -0.2 * k, 0, -1.1 * k); P.rot('elbowL', -0.3 * k, 0, 0); P.rot('elbowR', 0.4 * k, 0, 0);
  } };
  clips.spawn = { dur: 1.3, fn: (t, P) => {      // rises out of the ash, hood first
    const r = ease.out(clamp(t / 0.9)); const flare = Math.sin(clamp(t / 1.3) * Math.PI);
    P.pos('root', 0, -1.0 * (1 - r), 0); P.rot('head', 0.3 * (1 - r), 0, 0); P.rot('spine', 0.2 * (1 - r), 0, 0);
    P.rot('shoulderL', -0.9 * flare, 0, 0.5 * flare); P.rot('shoulderR', -0.1 * flare, 0, -0.1 * flare);
  } };
  a.clips = clips;
  a.clips.tele_hex = clips.tele_hex;

  const follow = new Follow(a, hips, 22, 5); const followH = new Follow(a, head, 28, 5);
  const wardOn = new Set(['guard', 'tele_guard']); const hexOn = new Set(['hex', 'tele_hex']);
  a.onUpdate = (dt, t) => {
    const cn = a.animator.cur?.name; const ct = a.animator.cur?.t ?? 0; const alive = a.alive;
    follow.update(dt); followH.update(dt); updateShadow(a);
    const fade = a.dissolving ? Math.max(0, 1 - a._uDissolve.value * 2.5) : 1;
    hangs.forEach((h, i) => h.update(follow.x * (0.5 + i * 0.1) + 0.012 * Math.sin(t * 1.1 + i), follow.z * 0.5 + 0.012 * Math.sin(t * 0.9 + i * 2), 0.01 + 0.004 * i, t, i * 1.7, follow.y * 0.2));
    // flame: lively tongues + deterministic flicker of the one point light
    const fl = 0.8 + 0.2 * Math.sin(t * 13.1) * Math.sin(t * 7.3) + 0.1 * Math.sin(t * 27);
    tongues.forEach((m, i) => { const k = m.userData.k; m.scale.set(1 + 0.15 * Math.sin(t * 9 + k * 2), (0.85 + 0.35 * Math.sin(t * 11 + k * 1.7) * fl) * (1 - k * 0.1), 1 + 0.15 * Math.cos(t * 8 + k)); m.rotation.y = k * 1.3 + t * (1.5 + k * 0.4); m.rotation.z = 0.08 * Math.sin(t * 6 + k) + followH.x * 0.3; m.visible = alive; });
    flame.scale.setScalar(fade); flameGlow.scale.setScalar(0.7 * fl * fade); light.intensity = 2.6 * fl * fade; light.visible = fade > 0.02;
    // fireball in the off hand while gathering/hurling
    const fb = (cn === 'tele_cast' || cn === 'tele_siphon') || ((cn === 'throw' || cn === 'cast') && ct < a.userData.fireball.release);
    fireball.visible = fb; if (fb) { const s2 = (cn === 'throw' || cn === 'cast') ? ease.out(clamp(ct / 0.35)) : 0.7 + 0.3 * Math.sin(t * 3); fireball.scale.setScalar(Math.max(0.2, s2 * (0.9 + 0.1 * Math.sin(t * 19)))); fireball.userData.gl.material.opacity = 0.8 + 0.2 * Math.sin(t * 15); }
    // hex sigil and ward embers
    const hexing = hexOn.has(cn); sigil.visible = hexing && alive;
    if (hexing) { const k = cn === 'hex' ? ease.out(clamp(ct / 0.6)) * (1 - ease.io(clamp((ct - 1.2) / 0.4))) : 0.9; sigil.scale.setScalar(Math.max(0.01, k)); const [r1, st, r2] = sigil.userData.parts; r1.material.rotation = t * 1.2; st.material.rotation = -t * 0.8; r2.material.rotation = t * 2.1; sigil.position.set(0, 1.55 + 0.05 * Math.sin(t * 2), 0.55); }
    const warding = wardOn.has(cn); wardRing.visible = warding && alive;
    if (warding) wardEmbers.forEach((sp, i) => { const an = t * 1.4 + (i / wardEmbers.length) * Math.PI * 2; sp.position.set(Math.sin(an) * 0.55, Math.sin(t * 2 + i) * 0.08 + (i % 3) * 0.12 - 0.1, Math.cos(an) * 0.45); sp.scale.setScalar(0.1 * (0.7 + 0.5 * Math.sin(t * 9 + i * 2))); });
    // ash and ember motes drifting off the shoulders
    emitAcc += dt * (alive ? 24 : 0); fx.visible = fade > 0.05;
    while (emitAcc > 1) {
      emitAcc -= 1; const sx = (rng() < 0.5 ? -1 : 1) * (0.12 + rng() * 0.18);
      const hot = rng() < 0.35;
      ash.emit({ pos: [sx, 1.45 + rng() * 0.25, (rng() - 0.5) * 0.3], vel: [(rng() - 0.5) * 0.08, 0.1 + rng() * 0.15, (rng() - 0.5) * 0.08], life: 2.6 + rng() * 1.6, size: hot ? 0.03 : 0.05, sizeEnd: hot ? 0.01 : 0.03, color: hot ? 0xff8a2a : 0x8a847c, colorEnd: hot ? 0xff3a10 : 0x3a3632, alpha: hot ? 1 : 0.5, turbulence: 0.6 });
    }
    ash.update(dt);
  };
  return finish(a);
}
