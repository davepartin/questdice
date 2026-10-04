// Goblin Skulker: hunched, long-armed thief. Sculpted from signed-distance fields (see parts.js).
import { Actor } from './base.js';
import { sprite as spriteTex } from '../tex.js';
import {
  THREE, sdf, smin, smax, U, SUB, mirX, BUMP, OFF, SHELL, XF, sculpt, Kit, tpm, emis, std, finish, spike, leaf, turned, paintGeo, ropeGeo, sampleSurface, legIK,
  mulberry32, rad, clamp, lerp, sstep, sn, track, ease, qFromDir, Follow, Hang, bumpGeo, rayHit, flapGeo,
} from './parts.js';

export function create({ seed = 1, quality = 'high', id } = {}) {
  const Q = quality === 'low' ? 1.7 : quality === 'med' ? 1.25 : 1;
  const rng = mulberry32(seed * 7919 + 13);
  const rr = (a, b) => a + (b - a) * rng();
  const a = new Actor({ name: 'goblin', height: 1.25, radius: 0.5 });
  const kit = new Kit();

  // ---- per-seed variation
  const hue = rr(0.32, 0.4);
  const skinTint = new THREE.Color().setHSL(hue, rr(0.34, 0.45), rr(0.27, 0.33)).getHex();
  const skinDark = new THREE.Color().setHSL(hue, 0.5, 0.07).getHex();
  const vestHue = [0x5a3a24, 0x4a4f36, 0x6a2e26, 0x3b3f4a][Math.floor(rng() * 4)];
  const knifeSide = rng() < 0.5 ? -1 : 1;     // -1 = actor's right hand (x<0)
  const earTorn = [rng() < 0.85, rng() < 0.6];
  const pauldronSide = -knifeSide;           // iron pauldron on the off shoulder
  const R = -1; const L = 1;                  // actor's right is -x (it faces +z)

  const skin = tpm('skinGoblin', { tint: skinTint, dark: skinDark, seed: 3 + (seed % 5), color: 0xa4b49c }, { scale: 5, nrm: 0.6 });
  const leather = tpm('leather', { tint: vestHue, dark: 0x0c0705, seed: 5, roughness: 0.85 }, { scale: 14, nrm: 0.7 });
  const leatherDark = tpm('leatherDark', { seed: 7 }, { scale: 14, nrm: 0.7 });
  const cloth = tpm('cloth', { tint: 0x6e5a3c, dark: 0x1c140a, seed: 2 }, { scale: 5 });
  const iron = tpm('iron', { seed: 4, metalness: 0.75, roughness: 0.9 }, { scale: 4, nrm: 0.8 });
  const rust = tpm('rust', { seed: 6, metalness: 0.55 }, { scale: 4 });
  const boneM = tpm('bone', { tint: 0xe4d6a0, dark: 0x8a7440, seed: 9 }, { scale: 6 });
  const wood = tpm('woodDark', { seed: 2 }, { scale: 2.5 });
  const clay = tpm('dirt', { tint: 0x8a4a2a, dark: 0x2a1408, seed: 3 }, { scale: 3 });
  const goldM = tpm('gold', { seed: 5 }, { scale: 6 });
  const eyeM = emis(0xffa818, 0.55, { rough: 0.25, base: 0xffffff });
  const pupilM = std(0x050200, { rough: 0.3 });
  const mouthM = std(0x3a0a0e, { rough: 0.5 });
  const tongueM = std(0xa04048, { rough: 0.4 });

  // ---------------------------------------------------------------- skeleton
  const root = a.joint('root', a.model, 0, 0, 0);
  const hips = a.joint('hips', root, 0, 0.5, 0);
  const spine = a.joint('spine', hips, 0, 0.03, 0.01);
  const chest = a.joint('chest', spine, 0, 0.15, 0.05);
  const neck = a.joint('neck', chest, 0, 0.13, 0.09);
  const head = a.joint('head', neck, 0, 0.1, 0.09); head.scale.setScalar(1.2);
  const jaw = a.joint('jaw', head, 0, 0.035, 0.0); jaw.rotation.x = 0.17;
  spine.rotation.x = 0.12; chest.rotation.x = 0.22; neck.rotation.x = -0.3; head.rotation.x = -0.06;

  // ---------------------------------------------------------------- head sculpt
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
    const bottomCut = (x, y, z) => 0.006 - y;                       // upper head ends at the lip line
    let f = U(0.026, cranium, jawFace, forehead, brow, cheek);
    f = U(0.016, f, noseBridge, noseTip, upperLip, philtrum);
    return (x, y, z) => {
      let d = f(x, y, z);
      d = Math.max(d, -sockets(x, y, z));
      d = Math.max(d, -nostrils(x, y, z));
      d = smax(d, -sunkCheek(x, y, z) + 0.002, 0.01);
      // lip line: allow lip capsule to extend below the cut
      const cut = bottomCut(x, y, z); const lip = upperLip(x, y, z);
      d = Math.max(d, Math.min(cut, lip));
      return d;
    };
  })();
  const headFB = BUMP(headF, { amp: 0.0012, freq: 55, seed: seed + 3 });

  const sc = new THREE.Color();
  const skinCol = (x, y, z, nx, ny, nz, ao, c) => {
    const lip = Math.exp(-(((y - 0.012) / 0.011) ** 2)) * sstep(0.07, 0.11, z);
    c.setRGB(1, 1, 1);
    c.lerp(sc.setRGB(0.8, 0.42, 0.36), lip * 0.8);
    const roof = sstep(0.2, -0.6, ny) * sstep(0.02, 0.0, y - 0.0) ; c.lerp(sc.setRGB(0.6, 0.22, 0.24), clamp(roof));
    const crev = 1 - ao; c.multiply(sc.setRGB(1 - crev * 0.12, 1 - crev * 0.5, 1 - crev * 0.55));
    // brow ridge and cheekbones a touch lighter / yellower, under-eye bags darker
    const eye = Math.exp(-(((Math.abs(x) - 0.043) / 0.03) ** 2 + ((y - 0.07) / 0.014) ** 2)) * sstep(0.07, 0.1, z);
    c.multiply(sc.setRGB(1 - eye * 0.2, 1 - eye * 0.3, 1 - eye * 0.1));
  };
  kit.add(head, sculpt(headFB, { min: [-0.12, 0.0, -0.11], max: [0.12, 0.2, 0.21], h: 0.0036 * Q, color: skinCol, aoR: 1.3 }), skin);

  // lower jaw (own joint, hinged at the back of the cheek)
  const jawF = (() => {
    const ramus = mirX(sdf.cap([0.058, 0.04, -0.004], [0.03, -0.008, 0.1], 0.023, 0.0165));
    const chin = U(0.012, sdf.ell(0, -0.016, 0.128, 0.026, 0.02, 0.026), sdf.ell(0, -0.008, 0.115, 0.04, 0.018, 0.025));
    const lowLip = sdf.cap([-0.05, 0.003, 0.112], [0.05, 0.001, 0.112], 0.0095);
    const lipCorner = mirX(sdf.cap([0.05, 0.003, 0.112], [0.064, 0.016, 0.075], 0.009));
    const under = sdf.ell(0, -0.012, 0.06, 0.05, 0.018, 0.05);
    const hollow = sdf.ell(0, 0.022, 0.082, 0.052, 0.02, 0.05);
    let f = U(0.014, ramus, chin, lowLip, lipCorner, under);
    return (x, y, z) => Math.max(f(x, y, z), -hollow(x, y, z) + 0.004);
  })();
  kit.add(jaw, sculpt(BUMP(jawF, { amp: 0.001, freq: 55, seed: seed + 8 }), { min: [-0.1, -0.08, -0.03], max: [0.1, 0.07, 0.17], h: 0.0036 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { skinCol(x, y + 0.012, z, nx, ny, nz, ao, c); } }), skin, { p: [0, -0.035, 0] });
  // mouth interior (dark red) fills the gap
  kit.add(head, new THREE.SphereGeometry(1, 16, 10), mouthM, { p: [0, 0.006, 0.062], s: [0.058, 0.026, 0.06] });
  kit.add(jaw, new THREE.SphereGeometry(1, 16, 10), mouthM, { p: [0, -0.02, 0.062], s: [0.052, 0.02, 0.055] });
  kit.add(jaw, new THREE.SphereGeometry(1, 16, 10), tongueM, { p: [0, -0.024, 0.075], s: [0.03, 0.012, 0.045] });

  // eyes
  const eyeJ = {};
  for (const sx of [R, L]) {
    const j = a.joint(sx === R ? 'eyeR' : 'eyeL', head, sx * 0.043, 0.096, 0.1); eyeJ[sx] = j;
    kit.add(j, paintGeo(new THREE.SphereGeometry(0.0255, 24, 16), (x, y, z, c) => { const k = clamp(z / 0.0255); c.set(0xff8a10).lerp(sc.set(0xffe030), sstep(0.2, 0.95, k)); if (Math.abs(y) > 0.012 && k < 0.7) c.lerp(sc.set(0xd03010), 0.4); }), eyeM);
    // slit pupil
    kit.add(j, new THREE.SphereGeometry(1, 12, 10), pupilM, { p: [sx * -0.001, 0, 0.0238], s: [0.0045, 0.019, 0.004] });
    // glint
    kit.add(j, new THREE.SphereGeometry(0.0042, 8, 6), emis(0xffffff, 2.2), { p: [sx * 0.009, 0.01, 0.0235] });
  }
  // lids: half shells in skin colour, rotated open at rest; used for blink and the angry squint
  const lidJ = {};
  for (const sx of [R, L]) {
    const j = a.joint(sx === R ? 'lidR' : 'lidL', head, sx * 0.043, 0.096, 0.1); lidJ[sx] = j;
    const g = new THREE.SphereGeometry(0.0285, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    kit.add(j, g, skin, { r: [rad(-100), 0, sx * rad(-10)] });
  }

  // teeth: needle fangs, uneven, upper hang from the lip line, lower jut up
  const teeth = (jn, sgn, y0, n, lenBase) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); const ang = lerp(-1, 1, t);
      const x = ang * 0.052; const z = 0.112 + 0.01 * (1 - Math.abs(ang) ** 2) - 0.0 + Math.abs(ang) * -0.03;
      const len = lenBase * (0.7 + rng() * 0.8) * (Math.abs(ang) > 0.85 ? 0.6 : 1);
      kit.add(jn, spike(len, 0.0032 + rng() * 0.0015, { curve: sgn * -0.25, sides: 5, segs: 3, col0: 0x8a7440, col1: 0xf0e4b8 }), boneM, { p: [x, y0, z], r: [sgn < 0 ? 0 : Math.PI, 0, (rng() - 0.5) * 0.3] });
    }
  };
  teeth(head, -1, 0.012, 11, 0.017);
  teeth(jaw, 1, -0.0305, 9, 0.019);

  // ears (parametric leaf, torn notches), one joint each, hinged at the head side
  const earJ = {};
  const basisQ = (yd, zh) => { const y = new THREE.Vector3(...yd).normalize(); const z = new THREE.Vector3(...zh); z.addScaledVector(y, -z.dot(y)).normalize(); const x = new THREE.Vector3().crossVectors(y, z).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  for (const [i, sx] of [R, L].entries()) {
    const j = a.joint(sx === R ? 'earR' : 'earL', head, sx * 0.07, 0.098, -0.012); earJ[sx] = j;
    const torn = earTorn[i];
    const notch = torn ? [{ u: rr(0.6, 0.8), d: rr(0.45, 0.7), w: 0.06, side: 1 }, { u: rr(0.35, 0.5), d: 0.45, w: 0.045, side: -1 }, { u: 0.9, d: 0.3, w: 0.04, side: 1 }] : [];
    const geo = leaf({ len: 0.26, halfW: (u) => 0.072 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.9)), 0.75) * Math.pow(1 - u * 0.985, 0.55) * (0.5 + 0.5 * Math.min(1, u * 4)), thick: 0.0045, cup: 0.014, bend: 0.2, notch, jag: torn ? 0.1 : 0.03, seed: seed + i, segU: 22, segV: 8, col: 0xffffff, edgeCol: 0xc09080 });
    const q = basisQ([sx * 0.85, 0.42, -0.3], [sx * 0.25, 0.0, 1]);
    kit.add(j, geo, skin, { q });
    kit.add(j, new THREE.SphereGeometry(0.022, 10, 8), skin, { p: [sx * 0.0, 0, 0], s: [1, 1, 0.8] });
  }

  // ---------------------------------------------------------------- skeleton extras
  const th = {}; const kn = {}; const an = {}; const ft = {}; const sh = {}; const el = {}; const wr = {}; const hd = {};
  for (const sx of [R, L]) {
    const k = sx === R ? 'R' : 'L';
    th[sx] = a.joint(`thigh${k}`, hips, sx * -0.0 + -sx * 0.0 + sx * 0.085 * -1 * -1, -0.03, 0);
    th[sx].position.x = sx * 0.085;
    kn[sx] = a.joint(`knee${k}`, th[sx], 0, -0.2, 0.11);
    an[sx] = a.joint(`ankle${k}`, kn[sx], 0, -0.19, -0.115);
    ft[sx] = a.joint(`foot${k}`, an[sx], 0, 0, 0);
    sh[sx] = a.joint(`shoulder${k}`, chest, sx * 0.155, 0.12, 0.035);
    el[sx] = a.joint(`elbow${k}`, sh[sx], sx * 0.02, -0.2, -0.02);
    wr[sx] = a.joint(`wrist${k}`, el[sx], sx * -0.025, -0.22, 0.07);
    hd[sx] = a.joint(`hand${k}`, wr[sx], 0, 0, 0);
  }
  const skinList = [];
  const addSkin = (joint, f, min, max, hh, color, o = {}) => {
    const g = sculpt(f, { min, max, h: hh * Q, color: color || skinCol, aoR: o.aoR ?? 1.3, aoK: o.aoK ?? 0.9, aoField: o.aoField });
    kit.add(joint, g, skin, o.xf || {});
    skinList.push({ joint, g, xf: o.xf });
    return g;
  };
  const plain = (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(1, 1, 1); const crev = 1 - ao; c.multiply(sc.setRGB(1 - crev * 0.1, 1 - crev * 0.4, 1 - crev * 0.45)); };
  const bumpy = (f, seedOff, amp = 0.001, freq = 50) => BUMP(f, { amp, freq, seed: seed + seedOff });

  // ---- torso, belly, pelvis (ribs show: a starved, wiry thief)
  const ribsMod = (f) => (x, y, z) => {
    const d = f(x, y, z);
    if (d > 0.01) return d;
    const front = sstep(0.0, 0.06, z) * sstep(0.2, 0.0, Math.abs(x) - 0.06);
    return d + 0.0035 * Math.sin(y * 150 + x * 12) * front * sstep(-0.01, 0.06, y);
  };
  const chestF = (() => {
    const ribcage = sdf.ell(0, 0.065, 0.035, 0.135, 0.125, 0.11, [0.42, 0, 0]);
    const hump = sdf.ell(0, 0.135, -0.055, 0.095, 0.075, 0.07, [0.2, 0, 0]);
    const girdle = sdf.cap([-0.15, 0.115, 0.03], [0.15, 0.115, 0.03], 0.04, 0.04);
    const neckBase = sdf.cap([0, 0.1, 0.02], [0, 0.13, 0.09], 0.05, 0.042);
    const collar = mirX(sdf.cap([0.012, 0.118, 0.1], [0.118, 0.128, 0.06], 0.0105, 0.0105));
    const pec = mirX(sdf.ell(0.05, 0.065, 0.1, 0.045, 0.035, 0.03, [0.4, 0, 0]));
    return U(0.03, ribcage, hump, girdle, neckBase, collar);
  })();
  addSkin(chest, bumpy(ribsMod(chestF), 11), [-0.24, -0.2, -0.18], [0.24, 0.24, 0.22], 0.005);
  const bellyF = U(0.035, sdf.ell(0, 0.06, 0.05, 0.112, 0.105, 0.1), sdf.ell(0, 0.015, 0.03, 0.125, 0.065, 0.095));
  addSkin(spine, bumpy(bellyF, 12), [-0.18, -0.12, -0.14], [0.18, 0.24, 0.18], 0.005);
  addSkin(hips, bumpy(sdf.ell(0, -0.01, 0.005, 0.115, 0.085, 0.09), 13), [-0.17, -0.16, -0.14], [0.17, 0.12, 0.14], 0.006);
  addSkin(neck, bumpy(U(0.02, sdf.cap([0, -0.07, -0.06], [0, 0.07, 0.07], 0.05, 0.036), sdf.sphere(0, 0.01, 0.04, 0.02)), 14), [-0.1, -0.14, -0.12], [0.1, 0.13, 0.12], 0.004);

  // ---- legs
  for (const sx of [R, L]) {
    const thighF = bumpy(U(0.03, sdf.cap([0, 0, 0], [0, -0.2, 0.11], 0.062, 0.041), sdf.sphere(0, -0.01, -0.025, 0.058), sdf.ell(0, -0.08, 0.02, 0.045, 0.07, 0.045, [0.5, 0, 0])), 20 + sx);
    addSkin(th[sx], thighF, [-0.13, -0.3, -0.13], [0.13, 0.1, 0.24], 0.005);
    const shinF = bumpy(U(0.02, sdf.cap([0, 0, 0], [0, -0.19, -0.115], 0.04, 0.024), sdf.sphere(0, 0, 0.005, 0.04), sdf.ell(0, -0.05, -0.035, 0.032, 0.055, 0.03, [-0.55, 0, 0])), 22 + sx);
    addSkin(kn[sx], shinF, [-0.1, -0.29, -0.21], [0.1, 0.09, 0.1], 0.0045);
    // foot: heel + three splayed toes
    const toes = [-0.34, 0, 0.34].map((ang, i) => { const tx = Math.sin(ang) * 0.14; const tz = Math.cos(ang) * 0.14 + 0.01; return sdf.cap([sx * 0.0 + Math.sin(ang) * 0.03, -0.062, 0.03], [tx, -0.068, tz], 0.019, 0.011); });
    const footF = bumpy(U(0.014, sdf.ell(0, -0.052, -0.02, 0.027, 0.03, 0.04), sdf.cap([0, -0.04, -0.01], [0, -0.065, 0.06], 0.022, 0.018), ...toes, sdf.cap([0, -0.06, -0.03], [0, -0.07, -0.06], 0.012, 0.007)), 24 + sx);
    addSkin(ft[sx], footF, [-0.1, -0.1, -0.1], [0.1, 0.04, 0.2], 0.0035);
    // claws
    [-0.34, 0, 0.34].forEach((ang) => {
      kit.add(ft[sx], spike(0.04, 0.0075, { curve: -0.25, sides: 5, segs: 4, col0: 0x2a2018, col1: 0xcfc29a }), boneM, { p: [Math.sin(ang) * 0.14, -0.071, Math.cos(ang) * 0.14 + 0.01], r: [rad(90) + 0.18, ang * -1 + 0, 0] });
    });
    // back spur
    kit.add(ft[sx], spike(0.03, 0.007, { curve: 0.3, col0: 0x2a2018, col1: 0xcfc29a }), boneM, { p: [0, -0.066, -0.055], r: [rad(-120), 0, 0] });
  }

  // ---- arms and hands
  const handMade = {};
  for (const sx of [R, L]) {
    const armUp = bumpy(U(0.025, sdf.cap([0, 0, 0], [sx * 0.02, -0.2, -0.02], 0.037, 0.028), sdf.sphere(0, 0, 0, 0.044), sdf.ell(sx * 0.008, -0.06, 0.005, 0.03, 0.07, 0.03, [0, 0, sx * -0.1])), 30 + sx);
    addSkin(sh[sx], armUp, [-0.12, -0.3, -0.11], [0.12, 0.09, 0.11], 0.0042);
    const foreF = bumpy(U(0.02, sdf.cap([0, 0, 0], [sx * -0.025, -0.22, 0.07], 0.03, 0.021), sdf.sphere(0, 0, -0.012, 0.03), sdf.ell(sx * -0.004, -0.06, 0.016, 0.03, 0.065, 0.032, [0.3, 0, 0])), 32 + sx);
    addSkin(el[sx], foreF, [-0.12, -0.32, -0.09], [0.12, 0.08, 0.14], 0.0042);
    const fistHand = sx === knifeSide;
    handMade[sx] = fistHand;
    // hand frame: -Y toward the fingertips. fist wraps a hilt along +Z at (hx, hy)
    let handF;
    if (fistHand) {
      const hx = sx * -0.0; const hy = -0.075;
      const palm = sdf.ell(0, -0.045, 0, 0.026, 0.045, 0.034);
      const loops = [0, 1, 2, 3].map((i) => sdf.torus(0, hy, 0.034 - i * 0.0165, 0.0175, 0.0098 - i * 0.0006, [Math.PI / 2, 0, 0]));
      const thumb = sdf.cap([sx * 0.0, -0.035, 0.032], [sx * -0.0, -0.1, 0.034], 0.011, 0.009);
      handF = U(0.008, palm, ...loops, thumb);
      handF = ((g) => (x, y, z) => Math.max(g(x, y, z), -sdf.cyl(0, hy, 0.0, 0.0105, 0.1, 0, [Math.PI / 2, 0, 0])(x, y, z)))(handF);
    } else {
      const palm = sdf.ell(0, -0.042, 0.002, 0.03, 0.044, 0.014);
      const fing = [];
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.0145; const L2 = 0.05 + (i === 1 || i === 2 ? 0.01 : -0.005 * (i === 3 ? 1 : 0));
        fing.push(sdf.cap([fx, -0.075, 0], [fx * 1.1, -0.075 - L2 * 0.55, 0.012], 0.0095, 0.0078));
        fing.push(sdf.cap([fx * 1.1, -0.075 - L2 * 0.55, 0.012], [fx * 1.2, -0.075 - L2 * 0.95, 0.05], 0.0078, 0.0058));
        fing.push(sdf.sphere(fx, -0.078, 0.003, 0.0105));
      }
      const thumb = U(0.006, sdf.cap([sx * -0.02, -0.04, 0.008], [sx * -0.036, -0.075, 0.034], 0.012, 0.0085), sdf.cap([sx * -0.036, -0.075, 0.034], [sx * -0.032, -0.1, 0.06], 0.0085, 0.006));
      handF = U(0.01, palm, thumb, ...fing);
    }
    addSkin(hd[sx], bumpy(handF, 34 + sx, 0.0006, 80), [-0.07, -0.2, -0.06], [0.07, 0.03, 0.09], 0.0028, plain, { aoR: 0.8 });
    // claws
    if (!fistHand) {
      for (let i = 0; i < 4; i++) { const fx = (i - 1.5) * 0.0145; const L2 = 0.05 + (i === 1 || i === 2 ? 0.01 : -0.005 * (i === 3 ? 1 : 0)); kit.add(hd[sx], spike(0.032, 0.0058, { curve: 0.25, col0: 0x2a2018, col1: 0xcfc29a }), boneM, { p: [fx * 1.2, -0.075 - L2 * 0.95, 0.05], r: [rad(-165), 0, 0] }); }
      kit.add(hd[sx], spike(0.03, 0.0058, { curve: 0.25, col0: 0x2a2018, col1: 0xcfc29a }), boneM, { p: [sx * -0.032, -0.1, 0.06], r: [rad(-160), 0, 0] });
    } else {
      for (let i = 0; i < 4; i++) kit.add(hd[sx], spike(0.026, 0.0052, { curve: 0.2, col0: 0x2a2018, col1: 0xcfc29a }), boneM, { p: [0.0, -0.075 + 0.0175 * 0.4, 0.034 - i * 0.0165], r: [0, 0, rad(180 + 25)] });
    }
  }

  // warts scattered over the hide
  {
    const wrng = mulberry32(seed * 31 + 7);
    const wartG = bumpGeo(1, 0.7, 8);
    for (const sp of skinList) {
      const n = Math.round(sp.g.attributes.position.count / 3 > 3000 ? 9 : 4);
      const pts = sampleSurface(sp.g, n, wrng, (p, nn) => nn.y > -0.3);
      for (const q of pts) {
        const rwr = 0.003 + wrng() * 0.0045;
        const pc = new THREE.Color().setRGB(1.0, 0.82 + wrng() * 0.2, 0.62 + wrng() * 0.2);
        kit.add(sp.joint, wartG, skin, { p: [q.p.x + q.n.x * rwr * 0.3, q.p.y + q.n.y * rwr * 0.3, q.p.z + q.n.z * rwr * 0.3], q: qFromDir(q.n.toArray()), s: [rwr, rwr * 1.1, rwr], tint: pc });
      }
    }
  }

  // ================================================================ clothing & props
  const Nz = makeNoiseLocal(seed + 50);
  function makeNoiseLocal(sd) { return { n3: (x, y, z) => Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + sd) * Math.cos(x * 4.1 + z * 3.3 + sd * 2.1) }; }
  const rustCol = new THREE.Color(0xb4602a); const steelCol = new THREE.Color(0xc8ccd0); const tc = new THREE.Color();

  // ---- vest (sculpted shell that hugs the ribcage; V-front, torn hem, armholes)
  const vestOuter = U(0.03, sdf.ell(0, 0.065, 0.035, 0.135 + 0.014, 0.125 + 0.012, 0.11 + 0.014, [0.42, 0, 0]), sdf.ell(0, 0.135, -0.055, 0.107, 0.087, 0.082, [0.2, 0, 0]));
  const vestW = (y) => 0.014 + 0.062 * sstep(-0.05, 0.15, y);
  const vestOpen = (x, y, z) => Math.max(Math.abs(x) - vestW(y), -(z - 0.03));
  const vestHem = (x, y, z) => -(y + 0.07 + 0.013 * Nz.n3(x * 26, 0, z * 26) + 0.008 * Math.sin(x * 60));
  const vestNeck = sdf.cyl(0, 0.2, 0.055, 0.065, 0.1, 0, [0.5, 0, 0]);
  const armHole = mirX(sdf.cap([0.152, 0.125, 0.035], [0.178, -0.05, 0.0], 0.056, 0.05));
  const vestShell = SHELL(vestOuter, 0.0048);
  const vestF = (x, y, z) => {
    let d = vestShell(x, y, z);
    d = Math.max(d, vestHem(x, y, z));
    d = Math.max(d, -vestOpen(x, y, z));
    d = Math.max(d, -vestNeck(x, y, z));
    d = Math.max(d, -armHole(x, y, z));
    return d;
  };
  const vestCol = (x, y, z, nx, ny, nz, ao, c) => {
    c.setRGB(1, 1, 1);
    const eo = Math.min(Math.abs(vestOpen(x, y, z)), Math.abs(vestHem(x, y, z)) * 1.0, Math.abs(armHole(x, y, z)), Math.abs(vestNeck(x, y, z)));
    const edge = sstep(0.011, 0.002, eo);
    c.multiply(tc.setRGB(1 - edge * 0.55, 1 - edge * 0.55, 1 - edge * 0.5));
    // stitch ticks along the binding
    const st = sstep(0.0014, 0.0, Math.abs(eo - 0.007)) * (Math.sin((x + y * 1.3 + z) * 420) > 0.2 ? 1 : 0);
    c.lerp(tc.setRGB(0.12, 0.09, 0.07), st * 0.8);
    const wear = 0.5 + 0.5 * Nz.n3(x * 9, y * 9, z * 9);
    c.multiply(tc.setRGB(0.8 + wear * 0.35, 0.78 + wear * 0.32, 0.72 + wear * 0.3));
  };
  kit.add(chest, sculpt(vestF, { min: [-0.24, -0.12, -0.2], max: [0.24, 0.26, 0.2], h: 0.0036 * Q, color: vestCol, aoK: 0.8, aoR: 0.9 }), leather);
  // diagonal bandolier strap with buckle + studs
  {
    const strapBand = (x, y, z) => Math.abs((x * 0.82 - y * 0.57) - 0.01) - 0.0125;
    const strapF = (x, y, z) => Math.max(SHELL(OFF(vestOuter, 0.0055), 0.0032)(x, y, z), strapBand(x, y, z), vestHem(x, y, z), -vestOpen(x, y, z) * 0.0 + (vestOpen(x, y, z) < 0 ? -0.01 : -1) * 0);
    kit.add(chest, sculpt((x, y, z) => Math.max(strapF(x, y, z), -((Math.abs(x) - vestW(y) - 0.002) * 0 + (vestOpen(x, y, z) < 0 ? 1 : -1) * 0.004 * 0) ), { min: [-0.24, -0.12, -0.2], max: [0.24, 0.26, 0.2], h: 0.0034 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.55, 0.38, 0.26); c.multiply(tc.setScalar(0.75 + 0.3 * (0.5 + 0.5 * Nz.n3(x * 20, y * 20, z * 20)))); } }), leatherDark);
    const hit = rayHit(vestF, [0.04, 0.0, 0.3], [0, 0, -1], 0.5);
    if (hit) {
      kit.add(chest, new THREE.BoxGeometry(0.036, 0.03, 0.007), iron, { p: [hit.p.x + 0.0, hit.p.y + 0.0, hit.p.z + 0.007], r: [0.42, 0, 0.5] });
      kit.add(chest, new THREE.BoxGeometry(0.02, 0.016, 0.009), leatherDark, { p: [hit.p.x, hit.p.y, hit.p.z + 0.008], r: [0.42, 0, 0.5] });
    }
    // lacing studs down the opening
    for (let i = 0; i < 7; i++) for (const sd of [-1, 1]) {
      const y = -0.05 + i * 0.026; const x = sd * (vestW(y) + 0.008);
      const h2 = rayHit(vestF, [x, y, 0.3], [0, 0, -1], 0.5); if (!h2) continue;
      kit.add(chest, new THREE.SphereGeometry(0.0042, 8, 6), iron, { p: [h2.p.x, h2.p.y, h2.p.z + 0.001] });
    }
  }

  // ---- belt, buckle, hanging bits (hips frame)
  const beltF = BUMP(sdf.eltorus(0, 0.048, 0.03, 0.126, 0.104, 0.0155, [-0.12, 0, 0]), { amp: 0.0012, freq: 90, seed: 3 });
  kit.add(hips, sculpt(beltF, { min: [-0.2, -0.04, -0.14], max: [0.2, 0.13, 0.19], h: 0.0035 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.5, 0.36, 0.24); } }), leatherDark);
  {
    const hb = rayHit(beltF, [0, 0.05, 0.4], [0, 0, -1], 0.5);
    const bz = hb ? hb.p.z : 0.13;
    kit.add(hips, box(0.05, 0.045, 0.008, 0.002), iron, { p: [0, 0.052, bz + 0.004], r: [-0.12, 0, 0] });
    kit.add(hips, box(0.028, 0.026, 0.01, 0.002), leatherDark, { p: [0, 0.052, bz + 0.006], r: [-0.12, 0, 0] });
    kit.add(hips, new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6), iron, { p: [0, 0.052, bz + 0.013], r: [-0.12, 0, Math.PI / 2] });
  }
  function box(w, h, d, r) { const g = new THREE.BoxGeometry(w, h, d); return g; }

  // ---- iron pauldron on the off shoulder (hammered scrap, rivets, rolled rim)
  {
    const sx = pauldronSide; const jn = sh[sx];
    const cup = (cx, cy, cz, rr0, rot, th0) => {
      const sph = sdf.sphere(cx, cy, cz, rr0);
      const cutPlane = (x, y, z) => -((y - cy) * Math.cos(rot) + (x - cx) * sx * Math.sin(rot) * -1 + 0.012);
      return (x, y, z) => Math.max(Math.abs(sph(x, y, z)) - th0, cutPlane(x, y, z));
    };
    const p1 = BUMP(cup(sx * 0.012, 0.004, 0.0, 0.082, 0.35, 0.0042), { amp: 0.0028, freq: 38, seed: seed + 2, oct: 2 });
    const p2 = BUMP(cup(sx * 0.03, -0.028, 0.0, 0.082, 0.5, 0.004), { amp: 0.0025, freq: 41, seed: seed + 3, oct: 2 });
    const pc = (x, y, z, nx, ny, nz, ao, c) => {
      const n = 0.5 + 0.5 * Nz.n3(x * 30, y * 30, z * 30); const rustk = sstep(0.55, 0.9, 0.5 + 0.5 * Nz.n3(x * 14 + 3, y * 14, z * 14));
      c.copy(steelCol).multiplyScalar(0.55 + n * 0.35).lerp(rustCol, rustk * 0.8);
      const r0 = Math.hypot(x - sx * 0.02, z) * 0; void r0;
    };
    kit.add(jn, sculpt(p1, { min: [-0.12, -0.12, -0.12], max: [0.12, 0.12, 0.12], h: 0.0034 * Q, color: pc, aoK: 0.7 }), iron);
    kit.add(jn, sculpt(p2, { min: [-0.13, -0.14, -0.12], max: [0.13, 0.1, 0.12], h: 0.0034 * Q, color: pc, aoK: 0.7 }), iron);
    for (const [px, py, pz] of [[sx * 0.05, 0.062, 0.025], [sx * 0.07, 0.035, -0.02], [sx * 0.015, 0.075, -0.035], [sx * 0.06, -0.012, 0.045]]) kit.add(jn, new THREE.SphereGeometry(0.0055, 8, 6), iron, { p: [px, py, pz] });
  }

  // ---- bandaged forearm on the knife arm
  {
    const sx = knifeSide; const jn = el[sx];
    const A = new THREE.Vector3(0, 0, 0); const B = new THREE.Vector3(sx * -0.025, -0.22, 0.07);
    const u = B.clone().sub(A); const len = u.length(); u.normalize();
    const e1 = new THREE.Vector3(0, 0, 1).cross(u).normalize(); const e2 = u.clone().cross(e1);
    const tA = 0.2; const tB = 0.86;
    const rAt = (t) => lerp(0.03, 0.021, t) + 0.0055;
    const bandF = (x, y, z) => {
      const px = x - A.x; const py = y - A.y; const pz = z - A.z;
      const along = (px * u.x + py * u.y + pz * u.z); const t = along / len;
      const rx = px - u.x * along; const ry = py - u.y * along; const rz = pz - u.z * along;
      const rad2 = Math.hypot(rx, ry, rz);
      const th = Math.atan2(rx * e2.x + ry * e2.y + rz * e2.z, rx * e1.x + ry * e1.y + rz * e1.z);
      const ph = th + along * 55;
      const wrap = 0.0035 * (0.5 + 0.5 * Math.sin(ph));
      let d = rad2 - rAt(t) - wrap;
      d = Math.max(d, -(t - tA) * len, (t - tB) * len);
      return d;
    };
    kit.add(jn, sculpt(bandF, { min: [-0.07, -0.26, -0.06], max: [0.07, 0.02, 0.11], h: 0.0028 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.82, 0.74, 0.58); const st = sstep(0.55, 0.9, 0.5 + 0.5 * Nz.n3(x * 20, y * 20, z * 20)); c.lerp(tc.setRGB(0.4, 0.22, 0.14), st * 0.6); }, aoK: 0.9 }), cloth);
  }

  // ---- loincloth flaps, patched and stitched (hips frame, sway with Hang)
  const hangs = [];
  const clothDS = tpm('cloth', { tint: 0x74603e, dark: 0x1c140a, seed: 4 }, { scale: 5, side: THREE.DoubleSide });
  {
    const patchCol = (x, y, c, u, v) => {
      c.setRGB(1, 1, 1);
      const inP = (x0, y0, w, h) => Math.abs(x - x0) < w && Math.abs(y - y0) < h;
      if (inP(-0.03, -0.06, 0.035, 0.03)) c.setRGB(0.78, 0.5, 0.42);
      if (inP(0.035, -0.125, 0.03, 0.035)) c.setRGB(0.45, 0.55, 0.42);
      const stitch = (inP(-0.03, -0.06, 0.038, 0.033) && !inP(-0.03, -0.06, 0.032, 0.027)) || (inP(0.035, -0.125, 0.033, 0.038) && !inP(0.035, -0.125, 0.027, 0.032));
      if (stitch && Math.sin((x + y) * 380) > 0) c.setRGB(0.1, 0.07, 0.05);
      const st = 0.5 + 0.5 * Nz.n3(x * 12, y * 12, 0); c.multiply(tc.setScalar(0.72 + st * 0.4 - sstep(-0.1, -0.22, y) * 0.35));
    };
    const front = flapGeo({ w: 0.17, h: 0.24, nx: 9, ny: 11, jag: 0.28, seed: seed + 5, colorFn: patchCol, curve: 0.012 });
    front.translate(0, 0.045, 0.133); front.rotateX(0.0);
    const back = flapGeo({ w: 0.15, h: 0.2, nx: 8, ny: 10, jag: 0.3, seed: seed + 6, colorFn: patchCol, curve: 0.01 });
    back.rotateY(Math.PI); back.translate(0, 0.045, -0.105);
    for (const g of [front, back]) { const hg = new Hang(g, { top: 0.045, len: 0.24 }); const m = kit.mesh(hips, g, clothDS); m.frustumCulled = false; hangs.push({ hg, ph: Math.random() * 6 }); }
    // two ragged side rags
    for (const [sx, z0] of [[1, 0.06], [-1, 0.0]]) {
      const g = flapGeo({ w: 0.05, h: 0.17, nx: 3, ny: 7, jag: 0.35, seed: seed + 8 + sx, colorFn: (x, y, c) => { c.setRGB(0.6, 0.5, 0.4).multiplyScalar(0.7 + 0.3 * Nz.n3(x * 20, y * 20, 0)); } });
      g.rotateY(sx * Math.PI / 2); g.translate(sx * 0.12, 0.04, z0);
      const hg = new Hang(g, { top: 0.04, len: 0.17 }); const m = kit.mesh(hips, g, clothDS); m.frustumCulled = false; hangs.push({ hg, ph: sx });
    }
  }

  // ---- coin pouch (bulges; he steals gold) on the knife side
  const pouchJ = a.joint('pouch', hips, knifeSide * 0.122, 0.035, 0.045);
  {
    const sack = U(0.02, sdf.ell(0, -0.052, 0, 0.056, 0.058, 0.05), sdf.ell(0, -0.03, 0, 0.046, 0.05, 0.042), sdf.cap([0, -0.02, 0], [0, 0.01, 0], 0.03, 0.013));
    const lumpy = BUMP(sack, { amp: 0.004, freq: 38, seed: seed + 9, oct: 2 });
    kit.add(pouchJ, sculpt(lumpy, { min: [-0.09, -0.15, -0.09], max: [0.09, 0.05, 0.09], h: 0.0036 * Q, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.62, 0.48, 0.34); const wr = sstep(-0.01, -0.06, y); c.multiply(tc.setScalar(0.85 + 0.2 * Nz.n3(x * 15, y * 15, z * 15))); }, aoK: 0.9 }), leather);
    kit.add(pouchJ, new THREE.TorusGeometry(0.0155, 0.0042, 6, 14), leatherDark, { p: [0, 0.0, 0], r: [Math.PI / 2, 0, 0] });
    // coins peeking out the top, plus a dangling tie
    for (const [cx, cz, tilt] of [[-0.006, 0.004, 0.5], [0.008, -0.004, -0.7], [0.0, 0.01, 0.2]]) {
      kit.add(pouchJ, new THREE.CylinderGeometry(0.0125, 0.0125, 0.003, 14), goldM, { p: [cx, 0.011, cz], r: [tilt, 0, tilt * 0.6] });
    }
    kit.add(pouchJ, ropeGeo([[0.012, 0.003, 0.012], [0.03, -0.03, 0.02], [0.034, -0.062, 0.018]], 0.0028, { segs: 8, radial: 5 }), leatherDark);
    // strap up to the belt
    kit.add(hips, box(0.012, 0.045, 0.006), leatherDark, { p: [knifeSide * 0.122, 0.04, 0.052], r: [0, 0, 0.0] });
  }

  // ---- clay fire-bomb pot on the off-hand hip, fuse lit
  const potJ = a.joint('pot', hips, -knifeSide * 0.1, 0.028, 0.098);
  const potProfile = [[0.0, 0.0], [0.03, 0.001], [0.049, 0.014], [0.06, 0.04], [0.058, 0.068], [0.044, 0.09], [0.03, 0.101], [0.028, 0.112], [0.034, 0.115], [0.034, 0.121], [0.026, 0.123], [0.0, 0.123]];
  const potG = turned(potProfile.map(([r, y]) => [r, y - 0.07]), 24, (x, y, z, c) => {
    const k = sstep(-0.01, 0.05, y); c.setRGB(0.75, 0.38, 0.22).lerp(tc.setRGB(0.12, 0.08, 0.06), k * 0.8 * (0.5 + 0.5 * Nz.n3(x * 40, y * 20, z * 40)));
    c.multiply(tc.setScalar(0.7 + 0.5 * (0.5 + 0.5 * Nz.n3(x * 12, y * 12, z * 12))));
  });
  const buildPot = (jn, withStraps) => {
    kit.add(jn, potG, clay, {});
    kit.add(jn, new THREE.CylinderGeometry(0.022, 0.025, 0.03, 12), wood, { p: [0, 0.071, 0] });
    kit.add(jn, ropeGeo([[0.0, 0.085, 0], [0.012, 0.115, 0.004], [0.004, 0.14, -0.006], [0.014, 0.162, 0.0]], 0.0036, { segs: 10, radial: 5 }), cloth);
    if (withStraps) {
      for (const yy of [-0.012, 0.012]) kit.add(jn, new THREE.TorusGeometry(0.0585 - Math.abs(yy) * 0.2, 0.0045, 6, 20), leatherDark, { p: [0, yy - 0.0, 0], r: [Math.PI / 2, 0, 0] });
    }
    kit.add(jn, new THREE.TorusGeometry(0.03, 0.0035, 6, 16), leatherDark, { p: [0, 0.052, 0], r: [Math.PI / 2, 0, 0] });
  };
  buildPot(potJ, true);
  potJ.position.y += 0.0; potJ.rotation.z = -knifeSide * 0.12;
  const potHand = a.joint('potHand', hd[-knifeSide], 0, -0.06, 0.03); potHand.rotation.x = 0.0; potHand.visible = false;
  buildPot(potHand, false);
  potHand.scale.setScalar(0.9);
  // fuse spark: emissive core + additive glow sprites (one on the belt pot, one on the hand pot)
  const sparkTex = null; void sparkTex;
  const sparks = [];
  const mkSpark = (jn) => {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('glow'), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    spr.position.set(0.014, 0.162 + 0.0, 0.0); spr.scale.setScalar(0.1); jn.add(spr);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.4).multiplyScalar(3) }));
    core.position.copy(spr.position); jn.add(core); sparks.push({ spr, core });
  };
  mkSpark(potJ); mkSpark(potHand);

  // ---- notched rusty dagger in the knife hand
  {
    const sh0 = new THREE.Shape();
    const nt = [0.05, 0.1, 0.145];
    sh0.moveTo(-0.0165, 0); sh0.lineTo(-0.017, 0.07);
    sh0.lineTo(-0.0115, 0.17); sh0.lineTo(0.0, 0.215);        // tip
    // cutting edge with nicks
    sh0.lineTo(0.0125, 0.16); sh0.lineTo(0.0155, 0.146); sh0.lineTo(0.0115, 0.139); sh0.lineTo(0.0175, 0.1); sh0.lineTo(0.0125, 0.093); sh0.lineTo(0.0178, 0.052); sh0.lineTo(0.015, 0.046); sh0.lineTo(0.0165, 0);
    sh0.lineTo(-0.0165, 0);
    const bg = new THREE.ExtrudeGeometry(sh0, { depth: 0.0035, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1, steps: 1 });
    bg.translate(0, 0, -0.00175);
    paintGeo(bg, (x, y, z, c) => { const r = sstep(0.4, 0.8, 0.5 + 0.5 * Nz.n3(x * 60, y * 40, z * 60)); const edge = sstep(0.006, 0.0125, Math.abs(x)); c.copy(steelCol).multiplyScalar(0.7).lerp(rustCol, r * 0.8 + (1 - edge) * 0.15); });
    const hn = hd[knifeSide];
    const hy = -0.075; const base = { p: [0, hy, 0], r: [Math.PI / 2, 0, 0] };
    kit.add(hn, bg, rust, { p: [0, hy, 0.052], r: [Math.PI / 2, 0, 0] });
    kit.add(hn, new THREE.BoxGeometry(0.075, 0.012, 0.017), iron, { p: [0, hy, 0.047] , r: [0, 0, 0] });
    kit.add(hn, turned([[0.0, -0.05], [0.0105, -0.05], [0.0112, -0.03], [0.0105, -0.01], [0.0112, 0.01], [0.0105, 0.03], [0.011, 0.045], [0, 0.045]], 10), leatherDark, { p: [0, hy, 0.0], r: [Math.PI / 2, 0, 0] });
    kit.add(hn, new THREE.SphereGeometry(0.014, 10, 8), iron, { p: [0, hy, -0.055] });
  }

  // ---- wooden buckler strapped to the off forearm
  {
    const sx = -knifeSide; const jn = el[sx];
    const prof = [[0, 0.0], [0.03, 0.0], [0.034, 0.014], [0.05, 0.014], [0.11, 0.005], [0.114, 0.002], [0.114, -0.004], [0.106, -0.006], [0.0, -0.004]];
    const bGeo = turned(prof.map(([r, y]) => [r, y]), 28, (x, y, z, c) => { const r = Math.hypot(x, z); c.setRGB(1, 1, 1); const burn = sstep(0.07, 0.115, r) * (0.5 + 0.5 * Nz.n3(x * 30, 0, z * 30)); c.multiply(tc.setScalar(1 - burn * 0.6)); });
    // centre of the buckler out from the forearm's mid-point, face normal pointing outward (+/-x)
    const mid = { x: sx * -0.012, y: -0.11, z: 0.035 };
    const bq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sx * Math.PI / 2));
    const off = [mid.x + sx * 0.062, mid.y, mid.z];
    kit.add(jn, bGeo, wood, { p: off, q: bq });
    // iron rim
    kit.add(jn, new THREE.TorusGeometry(0.108, 0.0065, 8, 40), iron, { p: [off[0] + sx * 0.0, off[1], off[2]], q: bq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))) });
    const faceDir = new THREE.Vector3(sx, 0, 0);
    for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; const loc = new THREE.Vector3(Math.cos(ang) * 0.088, 0.011, Math.sin(ang) * 0.088).applyQuaternion(bq); kit.add(jn, new THREE.SphereGeometry(0.0055, 8, 6), iron, { p: [off[0] + loc.x, off[1] + loc.y, off[2] + loc.z] }); }
    // forearm straps
    for (const t of [0.3, 0.72]) {
      const cy = -0.22 * t; const cxx = sx * -0.025 * t; const czz = 0.07 * t;
      kit.add(jn, new THREE.TorusGeometry(lerp(0.03, 0.021, t) + 0.004, 0.0048, 6, 18), leatherDark, { p: [cxx, cy, czz], r: [Math.PI / 2 + 0.3, 0, 0] });
    }
    // grip bar inside (visible from the back)
    kit.add(jn, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), leatherDark, { p: [mid.x + sx * 0.03, mid.y, mid.z] });
  }

  // ---------------------------------------------------------------- build + finalize
  a.anchor('head', head, 0, 0.3, 0.05);
  a.anchor('chest', chest, 0, 0.05, 0.18);
  a.anchor('feet', a.model, 0, 0.02, 0);
  kit.build();
  a.clips = { idle: { loop: true, dur: 2.4, fn: (t, P) => { P.rot('chest', Math.sin(t * 2.6) * 0.02, 0, 0); } } };
  return finish(a);
}
