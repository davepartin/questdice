// Goblin Skulker: hunched, long-armed thief. Sculpted from signed-distance fields (see parts.js).
//
// Rig:  root > hips > spine > chest > (neck > head > (jaw, lids, earL, earR), shoulderL/R > elbow > wrist > hand)
//       hips > thighL/R > knee > ankle > foot (2-bone IK, targets ikL / ikR), pouch, pot (belt bomb)
// VFX hooks:  anchors head chest feet mouth handR handL weapon (dagger tip) bomb (the throwing hand's pot)
//   a.userData.bomb = { anchor, hand: 'handL'|'handR', release: <seconds into 'throw'> }
//   The belt pot hides while the hand-held pot is visible; at the release time of 'throw' the hand pot hides, so the
//   VFX layer spawns its projectile from anchor 'bomb' at the clip's `hit` event. `a.userData.knifeHand` = 'handL'|'handR'.
import { Actor } from './base.js';
import { sprite as spriteTex } from '../tex.js';
import {
  THREE, sdf, smax, U, mirX, BUMP, sculpt, Kit, tpm, glowMat, finish, spike, leaf, turned, paintGeo, ropeGeo, sampleSurface, legIK,
  mulberry32, makeNoise, rad, clamp, lerp, sstep, sn, ease, qFromDir, Follow, Hang, bumpGeo, rayHit, flapGeo,
} from './parts.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function create({ seed = 1, quality = 'high', id } = {}) {
  const Q = quality === 'low' ? 2.9 : quality === 'med' ? 2.2 : 1.75;
  const rng = mulberry32(seed * 7919 + 13);
  const rr = (a, b) => a + (b - a) * rng();
  const NZ = makeNoise(seed + 50);
  const a = new Actor({ name: 'goblin', height: 1.25, radius: 0.5 });
  const kit = new Kit();
  const R = -1; const L = 1;                  // the actor faces +z, so its right side is -x
  const tc = new THREE.Color(); const sc = new THREE.Color();

  // ---- per-seed variation
  const hue = rr(0.32, 0.4);
  const skinTint = new THREE.Color().setHSL(hue, rr(0.34, 0.45), rr(0.27, 0.33)).getHex();
  const skinDark = new THREE.Color().setHSL(hue, 0.5, 0.07).getHex();
  const vestHue = [0x5a3a24, 0x4a4f36, 0x6a2e26, 0x3b3f4a][Math.floor(rng() * 4)];
  const knifeSide = rng() < 0.5 ? R : L;      // hand that holds the dagger
  const offSide = -knifeSide;                  // free hand: throws the bomb, carries the buckler
  const earTorn = [rng() < 0.9, rng() < 0.65];

  // ---- materials (all from the shared library, triplanar + vertex colours)
  const skin = tpm('skinGoblin', { tint: skinTint, dark: skinDark, seed: 3 + (seed % 5), color: 0xa4b49c }, { scale: 5, nrm: 0.6 });
  const leather = tpm('leather', { tint: vestHue, dark: 0x0c0705, seed: 5, roughness: 0.85 }, { scale: 14, nrm: 0.7 });
  const cloth = tpm('cloth', { tint: 0x8a7a5a, dark: 0x1c140a, seed: 2 }, { scale: 9 });
  const clothDS = tpm('cloth', { tint: 0x8a7a5a, dark: 0x1c140a, seed: 4 }, { scale: 9, side: THREE.DoubleSide });
  const iron = tpm('iron', { seed: 4, metalness: 0.75, roughness: 0.9 }, { scale: 4, nrm: 0.8 });
  const rust = tpm('rust', { seed: 6, metalness: 0.55 }, { scale: 4 });
  const wood = tpm('woodDark', { seed: 2, roughness: 0.9 }, { scale: 2.5 });
  const clay = tpm('dirt', { tint: 0x9a5a38, dark: 0x2a1408, seed: 3 }, { scale: 6 });
  const goldM = tpm('gold', { seed: 5, metalness: 0.8, roughness: 0.6 }, { scale: 6 });
  const eyeM = glowMat(0xffa818, 1.5, { rough: 0.2 });

  // ---------------------------------------------------------------- skeleton
  const root = a.joint('root', a.model, 0, 0, 0);
  const hips = a.joint('hips', root, 0, 0.5, 0);
  const spine = a.joint('spine', hips, 0, 0.03, 0.01);
  const chest = a.joint('chest', spine, 0, 0.15, 0.05);
  const neck = a.joint('neck', chest, 0, 0.13, 0.09);
  const head = a.joint('head', neck, 0, 0.1, 0.09); head.scale.setScalar(1.2);
  const jaw = a.joint('jaw', head, 0, 0.035, 0.0); jaw.rotation.x = 0.2;
  const lids = a.joint('lids', head, 0, 0.096, 0.1);
  spine.rotation.x = 0.12; chest.rotation.x = 0.22; neck.rotation.x = -0.3; head.rotation.x = -0.06;
  const th = {}; const kn = {}; const an = {}; const ft = {}; const sh = {}; const el = {}; const wr = {}; const hd = {};
  for (const sx of [R, L]) {
    const k = sx === R ? 'R' : 'L';
    th[sx] = a.joint(`thigh${k}`, hips, sx * 0.085, -0.03, 0);
    kn[sx] = a.joint(`knee${k}`, th[sx], 0, -0.2, 0.11);
    an[sx] = a.joint(`ankle${k}`, kn[sx], 0, -0.19, -0.115);
    ft[sx] = a.joint(`foot${k}`, an[sx], 0, 0, 0);
    sh[sx] = a.joint(`shoulder${k}`, chest, sx * 0.155, 0.12, 0.035);
    el[sx] = a.joint(`elbow${k}`, sh[sx], sx * 0.02, -0.2, -0.02);
    wr[sx] = a.joint(`wrist${k}`, el[sx], sx * -0.025, -0.22, 0.07);
    hd[sx] = a.joint(`hand${k}`, wr[sx], 0, 0, 0);
  }
  const earJ = { [R]: a.joint('earR', head, R * 0.07, 0.098, -0.012), [L]: a.joint('earL', head, L * 0.07, 0.098, -0.012) };
  const pouchJ = a.joint('pouch', hips, knifeSide * 0.122, 0.035, 0.045);
  const potJ = a.joint('pot', hips, offSide * 0.1, 0.028, 0.098);
  const potHand = a.joint('potHand', hd[offSide], 0, -0.07, 0.03);
  const ik = { [R]: a.joint('ikR', a.model, 0, 0, 0), [L]: a.joint('ikL', a.model, 0, 0, 0) };

  const S = (joint, f, min, max, hBase, color, o = {}) => {
    const g = sculpt(f, { min, max, h: hBase * Q, color, aoR: o.aoR ?? 1.3, aoK: o.aoK ?? 0.9 });
    kit.add(joint, g, o.mat || skin, o.xf || {});
    return g;
  };
  const crevice = (c, ao, k = 1) => { const cr = (1 - ao) * k; c.multiply(sc.setRGB(1 - cr * 0.1, 1 - cr * 0.45, 1 - cr * 0.5)); };
  const plain = (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(1, 1, 1); crevice(c, ao); };
  const skinList = [];

  // ================================================================ HEAD
  const headF = (() => {
    const cranium = sdf.ell(0, 0.105, -0.012, 0.080, 0.07, 0.086);
    const jawFace = mirX(sdf.cap([0.06, 0.07, 0.05], [0.022, 0.012, 0.115], 0.034, 0.02));
    const forehead = sdf.ell(0, 0.112, 0.04, 0.066, 0.05, 0.05);
    const brow = mirX(sdf.cap([0.074, 0.13, 0.064], [0.014, 0.119, 0.106], 0.0155, 0.0125));
    const cheek = mirX(sdf.ell(0.066, 0.06, 0.082, 0.022, 0.018, 0.03, [0, 0.3, 0]));
    const noseBridge = sdf.cap([0, 0.104, 0.108], [0, 0.062, 0.165], 0.014, 0.0135);
    const noseTip = U(0.012, sdf.sphere(0, 0.045, 0.172, 0.0205), mirX(sdf.sphere(0.0165, 0.044, 0.158, 0.0125)), sdf.cap([0, 0.062, 0.165], [0, 0.046, 0.174], 0.0135, 0.019));
    const nostrils = mirX(sdf.ell(0.0098, 0.034, 0.18, 0.0052, 0.004, 0.008, [0.5, 0, 0]));
    const sockets = mirX(sdf.ell(0.043, 0.095, 0.098, 0.031, 0.029, 0.03));
    const sunkCheek = mirX(sdf.ell(0.05, 0.034, 0.088, 0.021, 0.024, 0.024));
    const upperLip = U(0.01, sdf.cap([-0.058, 0.014, 0.112], [0.058, 0.014, 0.112], 0.0125), mirX(sdf.cap([0.058, 0.014, 0.112], [0.07, 0.024, 0.078], 0.0115)));
    const philtrum = sdf.cap([0, 0.034, 0.168], [0, 0.017, 0.123], 0.0075, 0.009);
    const throat = sdf.ell(0, 0.012, 0.03, 0.05, 0.022, 0.034);
    let f = U(0.026, cranium, jawFace, forehead, brow, cheek);
    f = U(0.016, f, noseBridge, noseTip, upperLip, philtrum);
    return (x, y, z) => {
      let d = f(x, y, z);
      d = Math.max(d, -sockets(x, y, z));
      d = Math.max(d, -nostrils(x, y, z));
      d = smax(d, -sunkCheek(x, y, z) + 0.002, 0.01);
      d = Math.max(d, Math.min(0.006 - y, upperLip(x, y, z)));
      return Math.min(d, throat(x, y, z));
    };
  })();
  const headCol = (x, y, z, nx, ny, nz, ao, c) => {
    c.setRGB(1, 1, 1);
    const lip = Math.exp(-(((y - 0.012) / 0.011) ** 2)) * sstep(0.07, 0.11, z);
    c.lerp(sc.setRGB(0.8, 0.42, 0.36), lip * 0.8);
    const inMouth = sstep(0.012, 0.004, y) * sstep(0.12, 0.09, z) * sstep(0.07, 0.05, Math.abs(x));
    c.lerp(sc.setRGB(0.5, 0.12, 0.14), clamp(inMouth * 1.4 + sstep(0.03, 0.0, y - 0.004)));
    crevice(c, ao);
    const eye = Math.exp(-(((Math.abs(x) - 0.043) / 0.03) ** 2 + ((y - 0.07) / 0.014) ** 2)) * sstep(0.07, 0.1, z);
    c.multiply(sc.setRGB(1 - eye * 0.2, 1 - eye * 0.3, 1 - eye * 0.1));
    const brw = Math.exp(-(((y - 0.122) / 0.02) ** 2)) * sstep(0.05, 0.1, z); c.multiply(sc.setRGB(1 - brw * 0.1, 1 - brw * 0.15, 1 - brw * 0.2));
    const flush = Math.exp(-(((Math.abs(x) - 0.066) / 0.02) ** 2 + ((y - 0.06) / 0.02) ** 2)); c.lerp(sc.setRGB(1.0, 0.8, 0.7), flush * 0.35);
  };
  skinList.push({ joint: head, g: S(head, BUMP(headF, { amp: 0.0008, freq: 40, seed: seed + 3 }), [-0.12, 0.0, -0.11], [0.12, 0.2, 0.21], 0.0048, headCol, { aoR: 1.4 }) });

  // lower jaw: heavy underbite chin, lower lip, tongue; hinged at the cheek
  const jawF = (() => {
    const ramus = mirX(sdf.cap([0.058, 0.04, -0.004], [0.03, -0.008, 0.1], 0.023, 0.0165));
    const chin = U(0.012, sdf.ell(0, -0.016, 0.128, 0.026, 0.02, 0.026), sdf.ell(0, -0.008, 0.115, 0.04, 0.018, 0.025));
    const lowLip = sdf.cap([-0.05, 0.003, 0.112], [0.05, 0.001, 0.112], 0.0095);
    const lipCorner = mirX(sdf.cap([0.05, 0.003, 0.112], [0.064, 0.016, 0.075], 0.009));
    const under = sdf.ell(0, -0.012, 0.06, 0.05, 0.018, 0.05);
    const tongue = sdf.ell(0, 0.0, 0.07, 0.022, 0.011, 0.04, [-0.15, 0, 0]);
    const f = U(0.014, ramus, chin, lowLip, lipCorner, under);
    const hollow = sdf.ell(0, 0.022, 0.082, 0.052, 0.02, 0.05);
    return (x, y, z) => Math.min(Math.max(f(x, y, z), -hollow(x, y, z) + 0.004), tongue(x, y, z));
  })();
  const jawCol = (x, y, z, nx, ny, nz, ao, c) => {
    c.setRGB(1, 1, 1);
    const lip = Math.exp(-(((y - 0.002) / 0.01) ** 2)) * sstep(0.07, 0.11, z); c.lerp(sc.setRGB(0.8, 0.42, 0.36), lip * 0.8);
    const inM = sstep(0.0, 0.008, y) * sstep(0.115, 0.08, z) * sstep(0.06, 0.04, Math.abs(x));
    c.lerp(sc.setRGB(0.62, 0.2, 0.22), inM);
    crevice(c, ao);
  };
  skinList.push({ joint: jaw, g: S(jaw, BUMP(jawF, { amp: 0.0006, freq: 40, seed: seed + 8 }), [-0.1, -0.08, -0.03], [0.1, 0.07, 0.17], 0.0046, jawCol, { xf: { p: [0, -0.035, 0] } }) });

  // eyes (one merged mesh: big yellow slit eyes; glow comes from the per-vertex ember mask)
  for (const sx of [R, L]) {
    const eg = new THREE.SphereGeometry(0.0255, 22, 16);
    const pc = eg.attributes.position; const col = new Float32Array(pc.count * 3); const em = new Float32Array(pc.count);
    for (let i = 0; i < pc.count; i++) {
      const x = pc.getX(i); const y = pc.getY(i); const z = pc.getZ(i); const rd = Math.hypot(x, y) / 0.0255; const fr = z > 0 ? 1 : 0;
      const slit = (x / 0.0042) ** 2 + (y / 0.019) ** 2; const inP = fr && slit < 1 ? 1 : 0;
      tc.set(0xffe030).lerp(sc.set(0xff9010), sstep(0.25, 0.8, rd)).lerp(sc.set(0xc03010), sstep(0.8, 1.0, rd) * 0.7);
      const vein = Math.sin(Math.atan2(y, x) * 14 + rd * 6) * 0.5 + 0.5; tc.multiplyScalar(0.8 + vein * 0.2 * sstep(0.4, 0.9, rd));
      let e = lerp(1.0, 0.35, sstep(0.3, 1.0, rd)); if (z < 0) e = 0.3;
      if (inP) { tc.setRGB(0.012, 0.005, 0.0); e = 0; } else if (fr && slit < 1.9) { tc.multiplyScalar(0.55 + 0.45 * sstep(1.0, 1.9, slit)); e *= 0.6 + 0.4 * sstep(1.0, 1.9, slit); }
      const gl = Math.hypot(x - sx * 0.0095, y - 0.0105) < 0.0045 && z > 0 ? 1 : 0; if (gl) { tc.setRGB(1, 1, 1); e = 2.2; }
      col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b; em[i] = e;
    }
    eg.setAttribute('color', new THREE.BufferAttribute(col, 3)); eg.setAttribute('aEmber', new THREE.BufferAttribute(em, 1));
    kit.add(head, eg, eyeM, { p: [sx * 0.043, 0.096, 0.1], r: [0, sx * -0.12, 0] });
  }
  // eyelids: one pivot across both eyes; open = shells swept back, blink/squint = sweep forward over the eyeball
  for (const sx of [R, L]) kit.add(lids, new THREE.SphereGeometry(0.0287, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), skin, { p: [sx * 0.043, 0, 0], r: [rad(-100), 0, sx * rad(-12)] });

  // needle teeth (ivory, untextured): upper hang from the lip line, lower jut up
  const teethAt = (jn, sgn, y0, n, lenBase, jitter) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); const ang = lerp(-1, 1, t);
      const x = ang * 0.054; const z = 0.113 + 0.011 * (1 - ang * ang) - Math.abs(ang) * 0.034;
      const len = lenBase * (0.65 + rng() * 0.85) * (Math.abs(ang) > 0.85 ? 0.6 : 1) * (i === 3 || i === n - 4 ? 1.35 : 1);
      kit.add(jn, spike(len, 0.0031 + rng() * 0.0014, { sides: 5, segs: 3, col0: 0x7a6a38, col1: 0xf4ecc8 }), skin, { p: [x, y0, z + (rng() - 0.5) * jitter], r: [sgn < 0 ? Math.PI : 0, 0, (rng() - 0.5) * 0.35], untex: true });
    }
  };
  teethAt(head, -1, 0.0125, 11, 0.017, 0.004);
  teethAt(jaw, 1, -0.0305, 9, 0.019, 0.004);

  // ears: long leaf shapes with torn notches, cartilage root
  const basisQ = (yd, zh) => { const y = new THREE.Vector3(...yd).normalize(); const z = new THREE.Vector3(...zh); z.addScaledVector(y, -z.dot(y)).normalize(); const x = new THREE.Vector3().crossVectors(y, z).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  for (const [i, sx] of [R, L].entries()) {
    const j = earJ[sx]; const torn = earTorn[i];
    const notch = torn ? [{ u: rr(0.6, 0.8), d: rr(0.45, 0.7), w: 0.06, side: 1 }, { u: rr(0.35, 0.5), d: 0.45, w: 0.045, side: -1 }, { u: 0.9, d: 0.3, w: 0.04, side: 1 }] : [];
    const geo = leaf({ len: 0.26, halfW: (u) => 0.072 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.9)), 0.75) * Math.pow(1 - u * 0.985, 0.55) * (0.5 + 0.5 * Math.min(1, u * 4)), thick: 0.0045, cup: 0.014, bend: 0.2, notch, jag: torn ? 0.1 : 0.03, seed: seed + i, segU: Math.round(22 / Math.sqrt(Q)), segV: 8, col: 0xffffff, edgeCol: 0xc09080 });
    kit.add(j, geo, skin, { q: basisQ([sx * 0.85, 0.42, -0.3], [sx * 0.25, 0.0, 1]) });
    kit.add(j, new THREE.SphereGeometry(0.022, 10, 8), skin, { s: [1, 1, 0.8] });
    if (i === 0 && torn) kit.add(j, new THREE.TorusGeometry(0.01, 0.0018, 6, 14), iron, { p: [sx * 0.13, 0.058, -0.03], r: [0.4, 0.8, 0.1] });
  }

  // ================================================================ BODY
  const ribsMod = (f) => (x, y, z) => {
    const d = f(x, y, z);
    if (d > 0.01) return d;
    const front = sstep(0.0, 0.06, z) * sstep(0.2, 0.0, Math.abs(x) - 0.06);
    return d + 0.0035 * Math.sin(y * 150 + x * 12) * front * sstep(-0.01, 0.06, y);
  };
  const chestF = U(0.03, sdf.ell(0, 0.065, 0.035, 0.135, 0.125, 0.11, [0.42, 0, 0]), sdf.ell(0, 0.135, -0.055, 0.095, 0.075, 0.07, [0.2, 0, 0]),
    sdf.cap([-0.15, 0.115, 0.03], [0.15, 0.115, 0.03], 0.04, 0.04), sdf.cap([0, 0.1, 0.02], [0, 0.13, 0.09], 0.05, 0.042), mirX(sdf.cap([0.012, 0.118, 0.1], [0.118, 0.128, 0.06], 0.0105, 0.0105)));
  const bodyCol = (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(1, 1, 1); crevice(c, ao); const belly = sstep(0.0, 0.1, z) * sstep(0.05, 0.0, y); c.lerp(sc.setRGB(1.0, 0.95, 0.75), belly * 0.25); };
  skinList.push({ joint: chest, g: S(chest, ribsMod(chestF), [-0.24, -0.2, -0.18], [0.24, 0.24, 0.22], 0.0075, bodyCol) });
  const bellyF = U(0.035, sdf.ell(0, 0.06, 0.05, 0.112, 0.105, 0.1), sdf.ell(0, 0.015, 0.03, 0.125, 0.065, 0.095));
  skinList.push({ joint: spine, g: S(spine, bellyF, [-0.18, -0.12, -0.14], [0.18, 0.24, 0.18], 0.0085, bodyCol) });
  skinList.push({ joint: hips, g: S(hips, sdf.ell(0, -0.01, 0.005, 0.115, 0.085, 0.09), [-0.17, -0.16, -0.14], [0.17, 0.12, 0.14], 0.009, plain) });
  S(neck, U(0.02, sdf.cap([0, -0.07, -0.06], [0, 0.07, 0.07], 0.05, 0.036), sdf.sphere(0, 0.01, 0.04, 0.02)), [-0.1, -0.14, -0.12], [0.1, 0.13, 0.12], 0.007, plain);

  for (const sx of [R, L]) {
    const thighF = U(0.03, sdf.cap([0, 0, 0], [0, -0.2, 0.11], 0.062, 0.041), sdf.sphere(0, -0.01, -0.025, 0.058), sdf.ell(0, -0.08, 0.02, 0.045, 0.07, 0.045, [0.5, 0, 0]));
    skinList.push({ joint: th[sx], g: S(th[sx], thighF, [-0.13, -0.3, -0.13], [0.13, 0.1, 0.24], 0.0085, plain) });
    const shinF = U(0.02, sdf.cap([0, 0, 0], [0, -0.19, -0.115], 0.04, 0.024), sdf.sphere(0, 0, 0.005, 0.04), sdf.ell(0, -0.05, -0.035, 0.032, 0.055, 0.03, [-0.55, 0, 0]));
    S(kn[sx], shinF, [-0.1, -0.29, -0.21], [0.1, 0.09, 0.1], 0.0078, plain);
    const angs = [-0.34, 0, 0.34];
    const toes = angs.map((ang) => sdf.cap([Math.sin(ang) * 0.03, -0.062, 0.03], [Math.sin(ang) * 0.14, -0.068, Math.cos(ang) * 0.14 + 0.01], 0.019, 0.011));
    const footF = U(0.014, sdf.ell(0, -0.052, -0.02, 0.027, 0.03, 0.04), sdf.cap([0, -0.04, -0.01], [0, -0.065, 0.06], 0.022, 0.018), ...toes, sdf.cap([0, -0.06, -0.03], [0, -0.07, -0.06], 0.012, 0.007));
    S(ft[sx], footF, [-0.1, -0.1, -0.1], [0.1, 0.04, 0.2], 0.0055, plain);
    angs.forEach((ang) => kit.add(ft[sx], spike(0.04, 0.0075, { curve: -0.25, sides: 5, segs: 4, col0: 0x2a2018, col1: 0xcfc29a }), skin, { p: [Math.sin(ang) * 0.14, -0.071, Math.cos(ang) * 0.14 + 0.01], r: [rad(90) + 0.18, -ang, 0], untex: true }));
    kit.add(ft[sx], spike(0.03, 0.007, { curve: 0.3, col0: 0x2a2018, col1: 0xcfc29a }), skin, { p: [0, -0.066, -0.055], r: [rad(-120), 0, 0], untex: true });
  }
  const handClaw = (jn, p, r, len, curve) => kit.add(jn, spike(len, 0.0056, { curve, col0: 0x2a2018, col1: 0xcfc29a }), skin, { p, r, untex: true });
  for (const sx of [R, L]) {
    const armUp = U(0.025, sdf.cap([0, 0, 0], [sx * 0.02, -0.2, -0.02], 0.037, 0.028), sdf.sphere(0, 0, 0, 0.044), sdf.ell(sx * 0.008, -0.06, 0.005, 0.03, 0.07, 0.03, [0, 0, sx * -0.1]));
    skinList.push({ joint: sh[sx], g: S(sh[sx], armUp, [-0.12, -0.3, -0.11], [0.12, 0.09, 0.11], 0.0075, plain) });
    const foreF = U(0.02, sdf.cap([0, 0, 0], [sx * -0.025, -0.22, 0.07], 0.03, 0.021), sdf.sphere(0, 0, -0.012, 0.03), sdf.ell(sx * -0.004, -0.06, 0.016, 0.03, 0.065, 0.032, [0.3, 0, 0]));
    skinList.push({ joint: el[sx], g: S(el[sx], foreF, [-0.12, -0.32, -0.09], [0.12, 0.08, 0.14], 0.0075, plain) });
    const fist = sx === knifeSide; const hy = -0.075;
    let handF;
    if (fist) {
      const palm = sdf.ell(0, -0.045, 0, 0.026, 0.045, 0.034);
      const loops = [0, 1, 2, 3].map((i) => sdf.torus(0, hy, 0.034 - i * 0.0165, 0.0175, 0.0098 - i * 0.0006, [Math.PI / 2, 0, 0]));
      const thumb = sdf.cap([0, -0.035, 0.032], [0, -0.1, 0.034], 0.011, 0.009);
      const g0 = U(0.008, palm, ...loops, thumb); const bore = sdf.cyl(0, hy, 0.0, 0.0105, 0.1, 0, [Math.PI / 2, 0, 0]);
      handF = (x, y, z) => Math.max(g0(x, y, z), -bore(x, y, z));
    } else {
      const palm = sdf.ell(0, -0.042, 0.002, 0.03, 0.044, 0.014);
      const fing = [];
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.0145; const L2 = 0.05 + (i === 1 || i === 2 ? 0.01 : 0);
        fing.push(sdf.cap([fx, -0.075, 0], [fx * 1.1, -0.075 - L2 * 0.55, 0.012], 0.0095, 0.0078), sdf.cap([fx * 1.1, -0.075 - L2 * 0.55, 0.012], [fx * 1.2, -0.075 - L2 * 0.95, 0.05], 0.0078, 0.0058), sdf.sphere(fx, -0.078, 0.003, 0.0105));
      }
      const thumb = U(0.006, sdf.cap([sx * -0.02, -0.04, 0.008], [sx * -0.036, -0.075, 0.034], 0.012, 0.0085), sdf.cap([sx * -0.036, -0.075, 0.034], [sx * -0.032, -0.1, 0.06], 0.0085, 0.006));
      handF = U(0.01, palm, thumb, ...fing);
    }
    skinList.push({ joint: hd[sx], g: S(hd[sx], handF, [-0.07, -0.2, -0.06], [0.07, 0.03, 0.09], 0.0032, plain, { aoR: 0.8 }) });
    if (!fist) {
      for (let i = 0; i < 4; i++) { const fx = (i - 1.5) * 0.0145; const L2 = 0.05 + (i === 1 || i === 2 ? 0.01 : 0); handClaw(hd[sx], [fx * 1.2, -0.075 - L2 * 0.95, 0.05], [rad(-165), 0, 0], 0.032, 0.25); }
      handClaw(hd[sx], [sx * -0.032, -0.1, 0.06], [rad(-160), 0, 0], 0.03, 0.25);
    } else for (let i = 0; i < 4; i++) handClaw(hd[sx], [0.0, hy + 0.0075, 0.034 - i * 0.0165], [0, 0, rad(205)], 0.026, 0.2);
  }

  // warts scattered over the hide
  {
    const wrng = mulberry32(seed * 31 + 7); const wartG = bumpGeo(1, 0.7, 7);
    for (const sp of skinList) {
      const n = sp.g.attributes.position.count > 3500 ? 8 : 3;
      for (const q of sampleSurface(sp.g, n, wrng, (p, nn) => nn.y > -0.3)) {
        const rw = 0.003 + wrng() * 0.0045;
        kit.add(sp.joint, wartG, skin, { p: [q.p.x + q.n.x * rw * 0.3, q.p.y + q.n.y * rw * 0.3, q.p.z + q.n.z * rw * 0.3], q: qFromDir(q.n.toArray()), s: [rw, rw * 1.1, rw], tint: new THREE.Color(1.0, 0.82 + wrng() * 0.2, 0.62 + wrng() * 0.2) });
      }
    }
  }

  // ================================================================ CLOTHING & PROPS
  const rustCol = new THREE.Color(0xb4602a); const steelCol = new THREE.Color(0xc8ccd0);
  const vestOuter = U(0.03, sdf.ell(0, 0.065, 0.035, 0.149, 0.137, 0.124, [0.42, 0, 0]), sdf.ell(0, 0.135, -0.055, 0.107, 0.087, 0.082, [0.2, 0, 0]));
  const vestW = (y) => 0.014 + 0.062 * sstep(-0.05, 0.15, y);
  const vestOpen = (x, y, z) => Math.max(Math.abs(x) - vestW(y), -(z - 0.03));
  const vestHem = (x, y, z) => -(y + 0.07 + 0.013 * NZ.n3(x * 26, 0, z * 26) + 0.008 * Math.sin(x * 60));
  const vestNeck = sdf.cyl(0, 0.2, 0.055, 0.065, 0.1, 0, [0.5, 0, 0]);
  const armHole = mirX(sdf.cap([0.152, 0.125, 0.035], [0.178, -0.05, 0.0], 0.056, 0.05));
  const vestF = (x, y, z) => Math.max(vestOuter(x, y, z), vestHem(x, y, z), -vestOpen(x, y, z), -vestNeck(x, y, z), -armHole(x, y, z));
  const vestCol = (x, y, z, nx, ny, nz, ao, c) => {
    c.setRGB(1, 1, 1);
    const eo = Math.min(Math.abs(vestOpen(x, y, z)), Math.abs(vestHem(x, y, z)), Math.abs(armHole(x, y, z)), Math.abs(vestNeck(x, y, z)));
    c.multiply(tc.setScalar(1 - sstep(0.012, 0.002, eo) * 0.5));
    const st = sstep(0.0014, 0.0, Math.abs(eo - 0.007)) * (Math.sin((x + y * 1.3 + z) * 420) > 0.2 ? 1 : 0);
    c.lerp(tc.setRGB(0.1, 0.07, 0.05), st * 0.8);
    const wear = 0.5 + 0.5 * NZ.n3(x * 9, y * 9, z * 9); c.multiply(tc.setRGB(0.8 + wear * 0.35, 0.78 + wear * 0.32, 0.72 + wear * 0.3));
    const band = Math.abs((x * 0.82 - y * 0.57) - 0.01);
    c.lerp(tc.setRGB(0.32, 0.2, 0.13), sstep(0.0165, 0.013, band) * 0.9);
  };
  S(chest, vestF, [-0.24, -0.12, -0.2], [0.24, 0.26, 0.2], 0.0078, vestCol, { mat: leather, aoK: 0.8, aoR: 0.9 });
  {
    const hit = rayHit(vestF, [0.04, 0.0, 0.3], [0, 0, -1], 0.5);
    if (hit) {
      kit.add(chest, new THREE.BoxGeometry(0.036, 0.03, 0.007), iron, { p: [hit.p.x, hit.p.y, hit.p.z + 0.007], r: [0.42, 0, 0.5] });
      kit.add(chest, new THREE.BoxGeometry(0.02, 0.016, 0.009), leather, { p: [hit.p.x, hit.p.y, hit.p.z + 0.008], r: [0.42, 0, 0.5], tint: 0x333333 });
    }
    for (let i = 0; i < 7; i++) for (const sd of [-1, 1]) {
      const y = -0.05 + i * 0.026; const x = sd * (vestW(y) + 0.008);
      const h2 = rayHit(vestF, [x, y, 0.3], [0, 0, -1], 0.5); if (!h2) continue;
      kit.add(chest, new THREE.SphereGeometry(0.0042, 8, 6), iron, { p: [h2.p.x, h2.p.y, h2.p.z + 0.001] });
    }
    for (let i = 0; i < 6; i++) {
      const y = -0.04 + i * 0.026; const x = vestW(y) + 0.006; const h2 = rayHit(vestF, [x, y, 0.3], [0, 0, -1], 0.5); const h3 = rayHit(vestF, [-x, y + 0.026, 0.3], [0, 0, -1], 0.5);
      if (!h2 || !h3) continue;
      kit.add(chest, ropeGeo([[h2.p.x, h2.p.y, h2.p.z + 0.002], [0, y + 0.012, Math.min(h2.p.z, h3.p.z) - 0.006], [h3.p.x, h3.p.y, h3.p.z + 0.002]], 0.0022, { segs: 6, radial: 4 }), leather, { tint: 0x2a2018 });
    }
  }
  const beltF = sdf.eltorus(0, 0.048, 0.03, 0.126, 0.104, 0.0155, [-0.12, 0, 0]);
  S(hips, beltF, [-0.2, -0.04, -0.14], [0.2, 0.13, 0.19], 0.0055, (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.5, 0.36, 0.24); }, { mat: leather });
  {
    const hb = rayHit(beltF, [0, 0.05, 0.4], [0, 0, -1], 0.5); const bz = hb ? hb.p.z : 0.13;
    kit.add(hips, new THREE.BoxGeometry(0.05, 0.045, 0.008), iron, { p: [0, 0.052, bz + 0.004], r: [-0.12, 0, 0] });
    kit.add(hips, new THREE.BoxGeometry(0.028, 0.026, 0.01), leather, { p: [0, 0.052, bz + 0.006], r: [-0.12, 0, 0], tint: 0x3a2a20 });
  }
  {
    const sx = offSide; const jn = sh[sx];
    const dome = (cx, cy, cz, rr0, tilt) => { const sph = sdf.sphere(cx, cy, cz, rr0); return (x, y, z) => Math.max(sph(x, y, z), -((y - cy) * Math.cos(tilt) - sx * (x - cx) * Math.sin(tilt))); };
    const p1 = BUMP(dome(sx * 0.012, 0.0, 0.0, 0.082, 0.3), { amp: 0.0028, freq: 38, seed: seed + 2, oct: 2 });
    const p2 = BUMP(dome(sx * 0.034, -0.03, 0.0, 0.082, 0.5), { amp: 0.0025, freq: 41, seed: seed + 3, oct: 2 });
    const pc = (x, y, z, nx, ny, nz, ao, c) => {
      const n = 0.5 + 0.5 * NZ.n3(x * 30, y * 30, z * 30); const rk = sstep(0.55, 0.9, 0.5 + 0.5 * NZ.n3(x * 14 + 3, y * 14, z * 14));
      c.copy(steelCol).multiplyScalar(0.55 + n * 0.35).lerp(rustCol, rk * 0.8);
    };
    const hollow1 = (x, y, z) => Math.max(p1(x, y, z), -(Math.hypot(x - sx * 0.012, y + 0.004, z) - 0.074));
    const hollow2 = (x, y, z) => Math.max(p2(x, y, z), -(Math.hypot(x - sx * 0.034, y + 0.034, z) - 0.074));
    kit.add(jn, sculpt(hollow1, { min: [-0.13, -0.1, -0.12], max: [0.13, 0.12, 0.12], h: 0.0062 * Q * 0.9, color: pc, aoK: 0.7 }), iron);
    kit.add(jn, sculpt(hollow2, { min: [-0.14, -0.13, -0.12], max: [0.14, 0.1, 0.12], h: 0.0062 * Q * 0.9, color: pc, aoK: 0.7 }), iron);
    for (const [px, py, pz] of [[sx * 0.05, 0.062, 0.025], [sx * 0.07, 0.035, -0.02], [sx * 0.015, 0.075, -0.035], [sx * 0.06, -0.012, 0.045]]) kit.add(jn, new THREE.SphereGeometry(0.0055, 8, 6), iron, { p: [px, py, pz] });
  }
  {
    const sx = knifeSide; const jn = el[sx];
    const A = new THREE.Vector3(0, 0, 0); const B = new THREE.Vector3(sx * -0.025, -0.22, 0.07);
    const u = B.clone().sub(A); const len = u.length(); u.normalize();
    const e1 = new THREE.Vector3(0, 0, 1).cross(u).normalize(); const e2 = u.clone().cross(e1);
    const tA = 0.2; const tB = 0.86; const rAt = (t) => lerp(0.03, 0.021, t) + 0.0055;
    const bandF = (x, y, z) => {
      const al = x * u.x + y * u.y + z * u.z; const t = al / len;
      const rx = x - u.x * al; const ry = y - u.y * al; const rz = z - u.z * al; const rd = Math.hypot(rx, ry, rz);
      const th2 = Math.atan2(rx * e2.x + ry * e2.y + rz * e2.z, rx * e1.x + ry * e1.y + rz * e1.z);
      const d = rd - rAt(t) - 0.0035 * (0.5 + 0.5 * Math.sin(th2 + al * 55));
      return Math.max(d, -(t - tA) * len, (t - tB) * len);
    };
    kit.add(jn, sculpt(bandF, { min: [-0.07, -0.26, -0.06], max: [0.07, 0.02, 0.11], h: 0.0042 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.82, 0.74, 0.58); const st = sstep(0.55, 0.9, 0.5 + 0.5 * NZ.n3(x * 20, y * 20, z * 20)); c.lerp(tc.setRGB(0.4, 0.22, 0.14), st * 0.6); }, aoK: 0.9 }), cloth);
  }
  const patchCol = (x, y, c) => {
    c.setRGB(1, 1, 1);
    const inP = (x0, y0, w, h) => Math.abs(x - x0) < w && Math.abs(y - y0) < h;
    if (inP(-0.03, -0.06, 0.035, 0.03)) c.setRGB(0.78, 0.5, 0.42);
    if (inP(0.035, -0.125, 0.03, 0.035)) c.setRGB(0.45, 0.55, 0.42);
    const stitch = (inP(-0.03, -0.06, 0.038, 0.033) && !inP(-0.03, -0.06, 0.032, 0.027)) || (inP(0.035, -0.125, 0.033, 0.038) && !inP(0.035, -0.125, 0.027, 0.032));
    if (stitch && Math.sin((x + y) * 380) > 0) c.setRGB(0.1, 0.07, 0.05);
    c.multiply(tc.setScalar(0.62 + (0.5 + 0.5 * NZ.n3(x * 12, y * 12, 0)) * 0.4 - sstep(-0.1, -0.22, y) * 0.3));
  };
  let hangObj;
  {
    const front = flapGeo({ w: 0.17, h: 0.24, nx: 9, ny: 11, jag: 0.28, seed: seed + 5, colorFn: patchCol, curve: 0.012 }); front.translate(0, 0.045, 0.133);
    const back = flapGeo({ w: 0.15, h: 0.2, nx: 8, ny: 10, jag: 0.3, seed: seed + 6, colorFn: patchCol, curve: 0.01 }); back.rotateY(Math.PI); back.translate(0, 0.045, -0.105);
    const gs = [front, back];
    for (const [sx, z0] of [[1, 0.06], [-1, 0.0]]) {
      const g = flapGeo({ w: 0.05, h: 0.17, nx: 3, ny: 7, jag: 0.35, seed: seed + 8 + sx, colorFn: (x, y, c) => { c.setRGB(0.6, 0.5, 0.4).multiplyScalar(0.7 + 0.3 * NZ.n3(x * 20, y * 20, 0)); } });
      g.rotateY(sx * Math.PI / 2); g.translate(sx * 0.12, 0.04, z0); gs.push(g);
    }
    const merged = mergeGeometries(gs, false);
    hangObj = new Hang(merged, { top: 0.045, len: 0.24 });
    kit.mesh(hips, merged, clothDS).frustumCulled = false;
  }
  {
    const sack = U(0.02, sdf.ell(0, -0.052, 0, 0.056, 0.058, 0.05), sdf.ell(0, -0.03, 0, 0.046, 0.05, 0.042), sdf.cap([0, -0.02, 0], [0, 0.01, 0], 0.03, 0.013));
    S(pouchJ, BUMP(sack, { amp: 0.004, freq: 38, seed: seed + 9, oct: 2 }), [-0.09, -0.15, -0.09], [0.09, 0.05, 0.09], 0.0066, (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.62, 0.48, 0.34).multiply(tc.setScalar(0.85 + 0.2 * NZ.n3(x * 15, y * 15, z * 15))); crevice(c, ao, 0.5); }, { mat: leather, aoK: 0.9 });
    kit.add(pouchJ, new THREE.TorusGeometry(0.0155, 0.0042, 6, 14), leather, { r: [Math.PI / 2, 0, 0], tint: 0x2a1c14 });
    for (const [cx, cz, tilt] of [[-0.006, 0.004, 0.5], [0.008, -0.004, -0.7], [0.0, 0.01, 0.2]]) kit.add(pouchJ, new THREE.CylinderGeometry(0.0125, 0.0125, 0.003, 14), goldM, { p: [cx, 0.011, cz], r: [tilt, 0, tilt * 0.6] });
    kit.add(pouchJ, ropeGeo([[0.012, 0.003, 0.012], [0.03, -0.03, 0.02], [0.034, -0.062, 0.018]], 0.0028, { segs: 8, radial: 5 }), leather, { tint: 0x2a1c14 });
    kit.add(hips, new THREE.BoxGeometry(0.012, 0.045, 0.006), leather, { p: [knifeSide * 0.122, 0.04, 0.052], tint: 0x3a2a20 });
  }
  const potProfile = [[0.0, 0.0], [0.03, 0.001], [0.049, 0.014], [0.06, 0.04], [0.058, 0.068], [0.044, 0.09], [0.03, 0.101], [0.028, 0.112], [0.034, 0.115], [0.034, 0.121], [0.026, 0.123], [0.0, 0.123]];
  const potG = turned(potProfile.map(([r, y]) => [r, y - 0.07]), 24, (x, y, z, c) => {
    const k = sstep(-0.01, 0.05, y); c.setRGB(0.85, 0.5, 0.32).lerp(tc.setRGB(0.12, 0.08, 0.06), k * 0.8 * (0.5 + 0.5 * NZ.n3(x * 40, y * 20, z * 40)));
    c.multiply(tc.setScalar(0.7 + 0.5 * (0.5 + 0.5 * NZ.n3(x * 12, y * 12, z * 12))));
  });
  const buildPot = (jn, straps) => {
    kit.add(jn, potG, clay);
    kit.add(jn, new THREE.CylinderGeometry(0.022, 0.025, 0.03, 12), clay, { p: [0, 0.071, 0], tint: 0xc8a070, untex: true });
    kit.add(jn, ropeGeo([[0.0, 0.085, 0], [0.012, 0.115, 0.004], [0.004, 0.14, -0.006], [0.014, 0.162, 0.0]], 0.0036, { segs: 10, radial: 5 }), clay, { tint: 0xb89a6a, untex: true });
    if (straps) for (const yy of [-0.012, 0.012]) kit.add(jn, new THREE.TorusGeometry(0.0585 - Math.abs(yy) * 0.2, 0.0045, 6, 20), clay, { p: [0, yy, 0], r: [Math.PI / 2, 0, 0], tint: 0x3a2a1c, untex: true });
    kit.add(jn, new THREE.TorusGeometry(0.03, 0.0035, 6, 16), clay, { p: [0, 0.052, 0], r: [Math.PI / 2, 0, 0], tint: 0x3a2a1c, untex: true });
  };
  buildPot(potJ, true); potJ.rotation.z = -knifeSide * 0.12;
  buildPot(potHand, false); potHand.scale.setScalar(0.9); potHand.visible = false;
  const sparks = [];
  for (const jn of [potJ, potHand]) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('glow'), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    spr.position.set(0.014, 0.162, 0.0); spr.scale.setScalar(0.12); jn.add(spr); sparks.push(spr);
  }
  {
    const sh0 = new THREE.Shape();
    sh0.moveTo(-0.0165, 0); sh0.lineTo(-0.017, 0.07); sh0.lineTo(-0.0115, 0.17); sh0.lineTo(0.0, 0.215);
    sh0.lineTo(0.0125, 0.16); sh0.lineTo(0.0155, 0.146); sh0.lineTo(0.0115, 0.139); sh0.lineTo(0.0175, 0.1); sh0.lineTo(0.0125, 0.093); sh0.lineTo(0.0178, 0.052); sh0.lineTo(0.015, 0.046); sh0.lineTo(0.0165, 0); sh0.lineTo(-0.0165, 0);
    const bg = new THREE.ExtrudeGeometry(sh0, { depth: 0.0035, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1, steps: 1 });
    bg.translate(0, 0, -0.00175);
    paintGeo(bg, (x, y, z, c) => { const r = sstep(0.4, 0.8, 0.5 + 0.5 * NZ.n3(x * 60, y * 40, z * 60)); const edge = sstep(0.006, 0.0125, Math.abs(x)); c.copy(steelCol).multiplyScalar(0.7).lerp(rustCol, r * 0.8 + (1 - edge) * 0.15); });
    const hn = hd[knifeSide]; const hy = -0.075;
    kit.add(hn, bg, rust, { p: [0, hy, 0.052], r: [Math.PI / 2, 0, 0] });
    kit.add(hn, new THREE.BoxGeometry(0.075, 0.012, 0.017), iron, { p: [0, hy, 0.047] });
    kit.add(hn, turned([[0.0, -0.05], [0.0105, -0.05], [0.0112, -0.03], [0.0105, -0.01], [0.0112, 0.01], [0.0105, 0.03], [0.011, 0.045], [0, 0.045]], 10), iron, { p: [0, hy, 0.0], r: [Math.PI / 2, 0, 0], tint: 0x2a1c14 });
    kit.add(hn, new THREE.SphereGeometry(0.014, 10, 8), iron, { p: [0, hy, -0.055] });
    a.anchor('weapon', hn, 0, hy, 0.27);
  }
  {
    const sx = offSide; const jn = el[sx];
    const prof = [[0, 0.0], [0.03, 0.0], [0.034, 0.014], [0.05, 0.014], [0.11, 0.005], [0.114, 0.002], [0.114, -0.004], [0.106, -0.006], [0.0, -0.004]];
    const bGeo = turned(prof, 28, (x, y, z, c) => { const r = Math.hypot(x, z); c.setRGB(1, 1, 1); const burn = sstep(0.07, 0.115, r) * (0.5 + 0.5 * NZ.n3(x * 30, 0, z * 30)); c.multiply(tc.setScalar(1 - burn * 0.6)); });
    const mid = { x: sx * -0.012, y: -0.11, z: 0.035 };
    const bq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sx * Math.PI / 2));
    const off = [mid.x + sx * 0.062, mid.y, mid.z];
    kit.add(jn, bGeo, wood, { p: off, q: bq });
    kit.add(jn, new THREE.TorusGeometry(0.108, 0.0065, 8, 40), iron, { p: off, q: bq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))) });
    for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; const loc = new THREE.Vector3(Math.cos(ang) * 0.088, 0.011, Math.sin(ang) * 0.088).applyQuaternion(bq); kit.add(jn, new THREE.SphereGeometry(0.0055, 8, 6), iron, { p: [off[0] + loc.x, off[1] + loc.y, off[2] + loc.z] }); }
    for (const t of [0.3, 0.72]) kit.add(jn, new THREE.TorusGeometry(lerp(0.03, 0.021, t) + 0.004, 0.0048, 6, 18), wood, { p: [sx * -0.025 * t, -0.22 * t, 0.07 * t], r: [Math.PI / 2 + 0.3, 0, 0], tint: 0x4a3020, untex: true });
    kit.add(jn, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), wood, { p: [mid.x + sx * 0.03, mid.y, mid.z], tint: 0x4a3020, untex: true });
  }

  // ================================================================ anchors, IK, build
  a.anchor('head', head, 0, 0.25, 0.05);
  a.anchor('chest', chest, 0, 0.06, 0.15);
  a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', jaw, 0, -0.01, 0.14);
  a.anchor('handR', hd[R], 0, -0.07, 0.03);
  a.anchor('handL', hd[L], 0, -0.07, 0.03);
  a.anchor('bomb', potHand, 0, 0.05, 0);
  a.userData.knifeHand = knifeSide === R ? 'handR' : 'handL';
  a.userData.bomb = { anchor: 'bomb', hand: offSide === R ? 'handR' : 'handL', release: 0.62 };
  kit.build();
  const solveIK = { [R]: legIK(a, { hip: th[R], knee: kn[R], ankle: an[R], target: ik[R] }), [L]: legIK(a, { hip: th[L], knee: kn[L], ankle: an[L], target: ik[L] }) };

  // ================================================================ ANIMATION
  const kS = knifeSide; const oS = offSide;
  const nm = (n, sx) => `${n}${sx === R ? 'R' : 'L'}`;
  const ARM = (P, sx, { sh: s = [0, 0, 0], el: e = [0, 0, 0], wr: w = [0, 0, 0] }) => { P.rot(nm('shoulder', sx), ...s); P.rot(nm('elbow', sx), ...e); P.rot(nm('wrist', sx), ...w); };
  const out = (sx, v) => sx * v;      // positive Z swings a hanging LEFT arm outward; right arm needs the flipped sign
  const blinkAt = (t, period, off = 0) => { const k = ((t + off) % period); return k < 0.14 ? Math.sin((k / 0.14) * Math.PI) : 0; };
  const face = (P, { jawD = 0, lid = 0, earUp = 0, earBack = 0, blink = 0 }) => {
    P.rot('jaw', jawD, 0, 0); P.rot('lids', lid + blink * 3.3, 0, 0);
    for (const sx of [R, L]) P.rot(nm('ear', sx), 0, sx * earBack, sx * earUp);
  };
  const breathe = (P, t, k = 1) => { const b = sn(t, 0.42); P.rot('chest', b * 0.025 * k, 0, 0); P.scl('chest', 1 + b * 0.012 * k, 1 + b * 0.016 * k, 1 + b * 0.012 * k); P.rot('shoulderL', 0, 0, b * 0.02 * k); P.rot('shoulderR', 0, 0, -b * 0.02 * k); };
  const stance = (P, { drop = 0, shiftX = 0, spread = 0, ikz = 0, lean = 0, yaw = 0 }) => {
    P.pos('hips', shiftX, -drop, 0); P.rot('hips', lean, yaw, 0);
    P.pos('ikL', spread, 0, ikz); P.pos('ikR', -spread, 0, ikz);
  };
  const knifeReady = (P, k = 1) => ARM(P, kS, { sh: [-0.5 * k, 0, out(kS, 0.1 * k)], el: [-1.1 * k, 0, 0] });

  const clips = {};
  clips.idle = { loop: true, dur: 2.8, fn: (t, P) => {
    const w = sn(t, 1 / 2.8);
    stance(P, { drop: 0.005, shiftX: w * 0.018, lean: sn(t, 1 / 2.8, 0.25) * 0.015 });
    P.rot('hips', 0, 0, w * 0.035);
    breathe(P, t);
    P.rot('spine', sn(t, 0.42, 0.1) * 0.015, sn(t, 1 / 5.6) * 0.04, 0);
    P.rot('neck', sn(t, 1 / 2.1, 0.3) * 0.03, sn(t, 1 / 5.6, 0.2) * 0.12, sn(t, 1 / 4.2) * 0.04);
    P.rot('head', sn(t, 1 / 2.8, 0.4) * 0.04, sn(t, 1 / 5.6, 0.35) * 0.22, sn(t, 1 / 4.2, 0.1) * 0.07);
    const chatter = Math.max(0, sn(t, 1 / 2.8, 0.7) - 0.6) * 2.5;
    face(P, { jawD: 0.03 * sn(t, 0.42, 0.2) + chatter * 0.05 * Math.sin(t * 38), lid: 0.35 + 0.1 * sn(t, 1 / 3.1), earUp: 0.04 * sn(t, 1 / 2.4), earBack: 0.05 * sn(t, 1 / 3.3, 0.2), blink: blinkAt(t, 2.8, 0.1) });
    P.rot('earR', 0, 0, -Math.max(0, sn(t, 1 / 2.8, 0.55) - 0.7) * 0.5); P.rot('earL', 0, 0, Math.max(0, sn(t, 1 / 2.8, 0.05) - 0.82) * 0.5);
    ARM(P, oS, { sh: [0.02 + sn(t, 1 / 2.8, 0.3) * 0.04, 0, out(oS, 0.05)], el: [-0.12 + sn(t, 1 / 2.8, 0.2) * 0.05, 0, 0] });
    P.rot(nm('wrist', oS), 0.1 * sn(t, 1 / 1.4), 0, 0);
    knifeReady(P, 0.35); P.rot(nm('wrist', kS), -0.15 + 0.06 * sn(t, 1 / 1.4, 0.2), 0, 0);
    P.rot('pouch', sn(t, 1 / 2.8, 0.1) * 0.06, 0, sn(t, 1 / 2.8, 0.3) * 0.06);
    P.rot('pot', sn(t, 1 / 2.8, 0.45) * 0.05, 0, 0);
  } };
  clips.ready = { loop: true, dur: 1.4, fn: (t, P) => {
    stance(P, { drop: 0.06 + 0.012 * sn(t, 1 / 0.7), spread: 0.05, ikz: 0.03, lean: 0.04 });
    breathe(P, t, 2.0);
    P.rot('spine', 0.1, sn(t, 1 / 1.4) * 0.05, 0); P.rot('chest', 0.14, 0, 0); P.rot('neck', -0.06, sn(t, 1 / 2.8) * 0.1, 0); P.rot('head', 0.16, sn(t, 1 / 1.4, 0.3) * 0.1, sn(t, 1 / 2.8) * 0.06);
    face(P, { jawD: 0.12 + 0.05 * Math.sin(t * 24) * Math.max(0, sn(t, 1 / 1.4) - 0.2), lid: 1.5, earBack: 0.22, earUp: -0.05, blink: blinkAt(t, 1.4, 0.3) });
    ARM(P, oS, { sh: [-0.28, 0, out(oS, 0.25)], el: [-0.9, 0, 0] });
    knifeReady(P, 1.0); P.rot(nm('wrist', kS), -0.25, 0, 0);
    P.rot('pot', 0, 0, 0.05 * sn(t, 1 / 0.7)); P.rot('pouch', 0.1 * sn(t, 1 / 0.7), 0, 0);
  } };
  clips.tele_strike = { loop: true, dur: 1.2, fn: (t, P) => {
    stance(P, { drop: 0.1, spread: 0.07, ikz: 0.035, lean: -0.02 });
    P.pos('hips', Math.sin(t * 22) * 0.005, Math.abs(Math.sin(t * 11)) * -0.012, 0);
    breathe(P, t, 2.5); P.rot('spine', -0.05, sn(t, 1 / 1.2) * 0.06, 0); P.rot('chest', -0.14, sn(t, 1 / 1.2) * 0.08, 0);
    P.rot('neck', 0.1, 0, sn(t, 1 / 1.2) * 0.08); P.rot('head', 0.0, sn(t, 1 / 1.2, 0.25) * 0.12, 0.12 * sn(t, 1 / 1.2));
    face(P, { jawD: 0.22 + 0.18 * Math.abs(Math.sin(t * 13)), lid: 1.3, earBack: 0.1, earUp: 0.12 * sn(t, 2) });
    ARM(P, kS, { sh: [-2.55, 0, out(kS, 0.25)], el: [-0.55 + 0.05 * Math.sin(t * 17), 0, 0], wr: [0.4, 0, 0] });
    ARM(P, oS, { sh: [-0.5, 0, out(oS, 0.5)], el: [-1.2, 0, 0] });
    P.rot('pouch', 0.1 * Math.sin(t * 22), 0, 0);
  } };
  clips.tele_guard = { loop: true, dur: 1.6, fn: (t, P) => {
    stance(P, { drop: 0.16, spread: 0.06, ikz: 0.02, lean: 0.1 });
    breathe(P, t, 2); P.rot('spine', 0.18, 0, 0); P.rot('chest', 0.12, 0, 0); P.rot('neck', 0.18, 0, 0); P.rot('head', 0.06 + 0.02 * sn(t, 1 / 1.6), sn(t, 1 / 3.2) * 0.1, 0);
    face(P, { jawD: -0.05, lid: 1.45, earBack: 0.3, earUp: -0.08, blink: blinkAt(t, 1.6, 0.4) });
    P.rot(nm('shoulder', oS), -1.2, out(oS, -0.5), out(oS, 0.1)); P.rot(nm('elbow', oS), -1.9, 0, 0); P.rot(nm('wrist', oS), 0, oS * -1.2, 0);
    knifeReady(P, 0.9); P.rot(nm('wrist', kS), -0.3, 0, 0);
  } };
  clips.guard = { loop: true, dur: 1.6, fn: (t, P) => clips.tele_guard.fn(t, P) };
  clips.tele_cast = { loop: true, dur: 1.4, fn: (t, P) => {
    stance(P, { drop: 0.08, spread: 0.06, ikz: 0.03, lean: -0.05 });
    breathe(P, t, 2); P.rot('spine', -0.06, 0, 0); P.rot('chest', -0.12, 0, 0); P.rot('neck', 0.05, 0, 0); P.rot('head', 0.0, sn(t, 1 / 1.4) * 0.1, 0.08);
    face(P, { jawD: 0.2 + 0.16 * Math.abs(Math.sin(t * 11)), lid: 1.35, earBack: 0.05, earUp: 0.14 * sn(t, 2.2) });
    ARM(P, oS, { sh: [-1.85, 0, out(oS, 0.32)], el: [-1.1, 0, 0], wr: [-0.2, 0, 0] });
    knifeReady(P, 0.7);
  } };
  clips.tele_pilfer = { loop: true, dur: 1.5, fn: (t, P) => {
    stance(P, { drop: 0.14, spread: 0.06, ikz: 0.02 + 0.015 * sn(t, 1 / 1.5), lean: 0.18 });
    breathe(P, t, 2); P.rot('spine', 0.24, sn(t, 1 / 1.5) * 0.08, 0); P.rot('chest', 0.12, 0, 0); P.rot('neck', 0.05, 0, 0); P.rot('head', 0.0, sn(t, 1 / 0.75) * 0.35, sn(t, 1 / 0.75) * 0.1);
    face(P, { jawD: 0.16 + 0.04 * sn(t, 1 / 0.75), lid: 1.2, earBack: -0.12, earUp: 0.2 * sn(t, 1 / 1.5), blink: blinkAt(t, 1.5, 0.2) });
    ARM(P, oS, { sh: [-1.1, 0, out(oS, 0.35)], el: [-0.5, 0, 0], wr: [0.2 + 0.2 * Math.sin(t * 9), 0, 0] });
    knifeReady(P, 0.5); P.rot(nm('shoulder', kS), 0.4, 0, 0);
    P.rot('pouch', 0.08 * Math.sin(t * 9), 0, 0);
  } };
  clips.attack = { dur: 0.95, events: { hit: 0.46 }, fn: (t, P) => {
    const wind = ease.io(clamp(t / 0.32)); const thrust = ease.out(clamp((t - 0.32) / 0.14)); const rec = ease.io(clamp((t - 0.55) / 0.4));
    const lunge = thrust * (1 - rec); const a1 = wind * (1 - thrust) * (1 - rec);
    stance(P, { drop: 0.1 * a1 + 0.05 * lunge, spread: 0.06 * (a1 + lunge), ikz: 0.04 * a1, lean: -0.12 * a1 + 0.2 * lunge });
    P.pos('hips', 0, 0, -0.06 * a1 + 0.28 * lunge);
    P.pos('ikL', 0, 0, 0.2 * lunge); P.pos('ikR', 0, Math.max(0, Math.sin(thrust * Math.PI)) * 0.06 * (1 - rec), 0.22 * lunge);
    P.rot('spine', -0.2 * a1 + 0.3 * lunge, 0, 0); P.rot('chest', -0.18 * a1 + 0.2 * lunge, a1 * out(kS, -0.35) + lunge * out(kS, 0.2), 0);
    P.rot('neck', 0.1 * lunge, 0, 0); P.rot('head', -0.1 * a1 + 0.1 * lunge, 0, 0);
    face(P, { jawD: 0.1 * a1 + 0.3 * lunge, lid: 1.6, earBack: 0.35 * lunge + 0.1 * a1 });
    ARM(P, kS, { sh: [-1.0 * a1 - 1.45 * lunge, 0, out(kS, 0.5) * a1 + out(kS, -0.1) * lunge], el: [-2.2 * a1 + 1.9 * lunge, 0, 0], wr: [-0.2 * a1 + 0.2 * lunge, 0, 0] });
    ARM(P, oS, { sh: [-0.3 * a1 + 0.5 * lunge, 0, out(oS, 0.5) * a1], el: [-0.5 * a1, 0, 0] });
    P.rot('pouch', 0.2 * lunge, 0, 0);
  } };
  clips.attack2 = { dur: 1.0, events: { hit: 0.5 }, fn: (t, P) => {
    const wind = ease.io(clamp(t / 0.36)); const cut = ease.out(clamp((t - 0.36) / 0.16)); const rec = ease.io(clamp((t - 0.62) / 0.36));
    const a1 = wind * (1 - cut); const a2 = cut * (1 - rec); const A = Math.max(a1, a2);
    stance(P, { drop: 0.08 * a1 + 0.07 * a2, spread: 0.06 * A, ikz: 0.03 * A, lean: -0.1 * a1 + 0.22 * a2, yaw: out(kS, 0.5) * a1 - out(kS, 0.7) * a2 });
    P.pos('hips', 0, 0, -0.04 * a1 + 0.22 * a2); P.pos('ikL', 0, 0, 0.18 * a2); P.pos('ikR', 0, Math.sin(cut * Math.PI) * 0.05 * (1 - rec), 0.2 * a2);
    P.rot('spine', -0.14 * a1 + 0.35 * a2, out(kS, 0.4) * a1 - out(kS, 0.6) * a2, 0); P.rot('chest', -0.2 * a1 + 0.2 * a2, out(kS, 0.4) * a1 - out(kS, 0.5) * a2, 0);
    P.rot('head', -0.1 * a1 + 0.15 * a2, out(kS, 0.2) * a1, 0);
    face(P, { jawD: 0.1 * a1 + 0.35 * a2, lid: 1.6, earBack: 0.4 * a2 });
    ARM(P, kS, { sh: [-2.7 * a1 - 0.7 * a2, 0, out(kS, 1.2) * a1 + out(kS, -0.5) * a2], el: [-0.6 * a1 - 0.3 * a2, 0, 0], wr: [0.4 * a1 - 0.3 * a2, 0, 0] });
    ARM(P, oS, { sh: [-0.6 * a1 + 0.2 * a2, 0, out(oS, 0.7) * A], el: [-0.9 * a1, 0, 0] });
    P.rot('pouch', 0.15 * a2, 0, 0.1 * a2);
  } };
  clips.throw = { dur: 1.35, events: { hit: 0.62 }, fn: (t, P) => {
    const grab = ease.io(clamp(t / 0.22)); const up = ease.io(clamp((t - 0.22) / 0.3)); const rel = ease.out(clamp((t - 0.5) / 0.14)); const rec = ease.io(clamp((t - 0.78) / 0.5));
    const wind = up * (1 - rel); const thr = rel * (1 - rec);
    stance(P, { drop: 0.07 * wind + 0.04 * thr, spread: 0.06 * (wind + thr), ikz: 0.04 * wind, lean: -0.16 * wind + 0.15 * thr });
    P.pos('hips', 0, 0, -0.07 * wind + 0.1 * thr); P.pos('ikL', 0, 0, 0.12 * thr); P.pos('ikR', 0, 0, 0.08 * thr);
    P.rot('spine', -0.18 * wind + 0.32 * thr, out(oS, -0.5) * wind + out(oS, 0.4) * thr, 0); P.rot('chest', -0.18 * wind + 0.15 * thr, 0, 0);
    P.rot('neck', 0.1 * thr, 0, 0); P.rot('head', -0.05 * wind, 0, 0);
    face(P, { jawD: 0.14 + 0.2 * Math.abs(Math.sin(t * 10)) * (1 - rel) + 0.3 * thr, lid: 1.35, earBack: 0.1 + 0.3 * thr });
    const g = grab * (1 - up); const w = up * (1 - rel); const f = thr;
    ARM(P, oS, { sh: [0.2 * g - 2.5 * w - 1.4 * f, 0, out(oS, -0.05) * g + out(oS, 0.5) * w], el: [-1.0 * g - 1.3 * w + 1.0 * f, 0, 0], wr: [0.2 * g + 0.5 * w - 0.9 * f, 0, 0] });
    ARM(P, kS, { sh: [-0.4 * wind - 0.3 * thr, 0, out(kS, 0.4) * wind], el: [-0.8 * wind, 0, 0] });
  } };
  clips.pilfer = { dur: 1.2, events: { hit: 0.42 }, fn: (t, P) => {
    const dart = ease.io(clamp(t / 0.24)); const snat = ease.out(clamp((t - 0.24) / 0.18)); const back = ease.io(clamp((t - 0.46) / 0.3)); const stuff = ease.io(clamp((t - 0.7) / 0.2)) * (1 - ease.io(clamp((t - 0.95) / 0.25)));
    const fwd = (dart + snat) * 0.5 * (1 - back);
    stance(P, { drop: 0.1 * (dart + snat) * 0.5 + 0.06 * stuff, spread: 0.05, ikz: 0.05 * fwd, lean: 0.25 * fwd });
    P.pos('hips', 0, 0, 0.3 * fwd); P.pos('ikL', 0, 0, 0.25 * fwd); P.pos('ikR', 0, Math.sin(clamp(t / 0.44) * Math.PI) * 0.05, 0.25 * fwd);
    P.rot('spine', 0.35 * fwd, 0, 0); P.rot('chest', 0.15 * fwd, 0, 0); P.rot('neck', -0.2 * fwd, 0, 0); P.rot('head', -0.1 * fwd, 0.2 * sn(t, 2) * (1 - fwd), 0);
    face(P, { jawD: 0.1 + 0.2 * stuff, lid: 1.2 - 0.6 * stuff, earBack: -0.2 * (1 - fwd), earUp: 0.2 * sn(t, 3) });
    ARM(P, oS, { sh: [-1.55 * fwd - 0.3 * stuff, 0, out(oS, 0.2) * fwd - out(oS, 0.1) * stuff], el: [-0.2 * fwd - 0.6 * stuff, 0, 0], wr: [0.3 * fwd, 0, 0] });
    ARM(P, kS, { sh: [-0.3 * fwd + 0.4 * back, 0, out(kS, 0.5) * fwd], el: [-0.9 * fwd, 0, 0] });
    P.scl('pouch', 1 + 0.35 * stuff, 1 + 0.45 * stuff, 1 + 0.35 * stuff); P.rot('pouch', 0.3 * stuff * Math.sin(t * 30), 0, 0);
  } };
  clips.hurt = { dur: 0.42, fn: (t, P) => {
    const k = Math.sin(clamp(t / 0.42) * Math.PI) ** 0.8; const s2 = Math.sin(t * 40) * (1 - clamp(t / 0.42));
    P.rot('hips', -0.18 * k, 0, 0.1 * k); P.pos('hips', 0, -0.03 * k, -0.1 * k); P.rot('spine', -0.3 * k, 0.2 * k, 0); P.rot('chest', -0.2 * k, 0, 0); P.rot('neck', -0.2 * k, 0, 0); P.rot('head', -0.35 * k + s2 * 0.05, -0.3 * k, 0.15 * k);
    P.rot('jaw', 0.5 * k, 0, 0); P.rot('lids', 2.6 * k, 0, 0); P.rot('earL', 0, 0.6 * k, 0.5 * k); P.rot('earR', 0, -0.6 * k, -0.5 * k);
    P.rot('shoulderL', -0.5 * k, 0, 0.5 * k); P.rot('shoulderR', -0.5 * k, 0, -0.5 * k); P.rot('pouch', 0.5 * k, 0, 0);
  } };
  clips.die = { dur: 1.15, fn: (t, P) => {
    const kk = clamp(t / 1.15); const stag = Math.sin(clamp(t / 0.25) * Math.PI);
    P.pos('root', 0, 0.12 * ease.out(clamp((t - 0.3) / 0.6)), -0.05 * ease.out(clamp(t / 0.9)));
    P.rot('root', -1.4 * ease.in(clamp((t - 0.1) / 0.8)), 0, 0.15 * kk);
    P.rot('hips', 0.2 * stag, 0, 0); P.rot('spine', -0.3 * kk, 0, 0); P.rot('neck', -0.4 * kk, 0, 0); P.rot('head', -0.5 * kk + 0.3 * stag, 0.3 * kk, 0.2 * kk);
    face(P, { jawD: 0.55 * ease.out(clamp(t / 0.2)), lid: 0, earBack: 0.6, earUp: -0.7 * kk, blink: clamp((t - 0.55) / 0.2) * 0.9 });
    for (const sx of [R, L]) {
      const s = ease.out(clamp(t / 0.5)); ARM(P, sx, { sh: [-0.9 * s * (sx === kS ? 1 : 0.6), 0, out(sx, 0.8) * s], el: [-0.4 * s, 0, 0], wr: [0.3 * s, 0, 0] });
      P.rot(nm('thigh', sx), -0.2 * kk, 0, 0); P.rot(nm('knee', sx), 0.8 * kk, 0, 0); P.rot(nm('ankle', sx), 0.2 * kk, 0, 0);
    }
  } };
  clips.spawn = { dur: 1.1, fn: (t, P) => {
    const a1 = clamp(t / 0.5); const arc = Math.sin(a1 * Math.PI); const land = ease.out(clamp((t - 0.5) / 0.15)) * (1 - ease.io(clamp((t - 0.62) / 0.45)));
    P.pos('root', 0, 0.35 * arc, -1.2 * (1 - ease.out(a1))); P.rot('root', -0.35 * (1 - a1) * arc, 0, 0);
    P.pos('hips', 0, -0.13 * land, 0); P.rot('spine', 0.3 * land - 0.35 * arc, 0, 0); P.rot('chest', 0.2 * land, 0, 0); P.rot('head', -0.15 * land, 0, 0);
    P.pos('ikL', 0, 0.15 * arc, -0.5 * (1 - a1)); P.pos('ikR', 0, 0.15 * arc, -0.5 * (1 - a1));
    face(P, { jawD: 0.35 * arc + 0.1 * land, lid: 1.4, earBack: -0.2 * arc, earUp: 0.4 * arc });
    ARM(P, kS, { sh: [-1.2 * arc, 0, out(kS, 0.5) * arc], el: [-1.2 * arc, 0, 0] }); ARM(P, oS, { sh: [-0.8 * arc, 0, out(oS, 0.8) * arc], el: [-0.5 * arc, 0, 0] });
  } };
  a.clips = clips;

  // ---- procedural secondary motion & per-frame hooks
  const follow = new Follow(a, hips, 30, 6);
  a.onUpdate = (dt, t) => {
    const cur = a.animator.cur; const cn = cur?.name; const ct = cur?.t ?? 0;
    if (cn !== 'die') { solveIK[R](); solveIK[L](); }
    follow.update(dt);
    hangObj.update(follow.x * 0.5 + 0.012 * Math.sin(t * 1.7), follow.z * 0.5 + 0.01 * Math.sin(t * 1.3 + 1), 0.006, t, 0, follow.y * 0.2);
    const rel = a.userData.bomb.release;
    potHand.visible = (cn === 'throw' && ct > 0.16 && ct < rel) || cn === 'tele_cast';
    potJ.visible = !(cn === 'throw' && ct > 0.12) && cn !== 'tele_cast';
    for (const [i, spr] of sparks.entries()) {
      const fl = 0.75 + 0.25 * Math.sin(t * 31 + i) * Math.sin(t * 17.3) + 0.2 * Math.sin(t * 53);
      spr.scale.setScalar(0.1 * fl * (a.dissolving ? Math.max(0, 1 - a._uDissolve.value * 3) : 1)); spr.material.opacity = 0.9 * fl;
    }
  };
  return finish(a);
}
