// Dire Wolf: massive scarred grey wolf. SDF-sculpted body + hundreds of swept fur tufts, 4-leg IK, spring tail.
//
// Rig: root > pelvis > chest > neck1 > neck2 > head > (jaw, eyes, earL/R, lipL/R); pelvis > tail1..4;
//      chest > shoulderL/R > elbow > wrist (paw); pelvis > hipL/R > knee > hock (foot). IK targets ikFL ikFR ikHL ikHR.
// Anchors: head chest feet mouth handR handL (front paws) weapon (=mouth) . Clips: see bottom.
import { Actor } from './base.js';
import {
  THREE, sdf, smax, U, mirX, BUMP, sculpt, Kit, tpm, std, glowMat, finish, setRim, contactShadow, updateShadow, spike, leaf, turned, ropeGeo, sampleSurface, pushTuft, tuftGeo, legIK,
  mulberry32, makeNoise, rad, clamp, lerp, sstep, sn, ease, Follow,
} from './parts.js';

export function create({ seed = 1, quality = 'high', id } = {}) {
  const Q = (quality === 'low' ? 2.9 : quality === 'med' ? 2.2 : 1.75) / 1.75;     // voxel multiplier relative to high
  const TUFT = quality === 'low' ? 0.35 : quality === 'med' ? 0.6 : 0.78;
  const rng = mulberry32(seed * 6271 + 5);
  const rr = (a, b) => a + (b - a) * rng();
  const NZ = makeNoise(seed + 11);
  const a = new Actor({ name: 'wolf', height: 1.2, radius: 0.9 });
  const kit = new Kit();
  const L = 1; const R = -1;
  const tc = new THREE.Color(); const sc = new THREE.Color();
  const warm = rr(0, 1);

  setRim(0xffb040);
  const fur = tpm('pelt', { tint: 0x8a857d, dark: 0x1c1a17, seed: 2 + (seed % 4), color: 0xffffff, roughness: 1 }, { scale: 2.4, nrm: 1.1, rimK: 1.1 });
  const shellMats = [1, 2, 3].map((k) => tpm('pelt', { tint: 0x8a857d, dark: 0x1c1a17, seed: 2 + (seed % 4), color: 0xffffff, roughness: 1 }, { scale: 2.4, nrm: 0.4, shell: k / 4, rimK: 1.1 }));
  const leather = tpm('leatherDark', { seed: 7 }, { scale: 14, nrm: 0.7 });
  const iron = tpm('iron', { seed: 4, metalness: 0.75, roughness: 0.9 }, { scale: 6, nrm: 0.8 });
  const eyeM = glowMat(0xffa21a, 1.7, { rough: 0.2 });
  const noseM = std(0x070605, { rough: 0.22 });

  // ------------------------------------------------------------------ skeleton
  const root = a.joint('root', a.model, 0, 0, 0);
  const pelvis = a.joint('pelvis', root, 0, 0.82, -0.42);
  const chest = a.joint('chest', pelvis, 0, 0.11, 0.82);
  const neck1 = a.joint('neck1', chest, 0, 0.12, 0.3);
  const neck2 = a.joint('neck2', neck1, 0, 0.05, 0.24);
  const head = a.joint('head', neck2, 0, 0.03, 0.2); head.scale.setScalar(1.25);
  neck1.rotation.x = 0.2; neck2.rotation.x = 0.08; head.rotation.x = -0.02; chest.rotation.x = -0.04;   // stalking: shoulders high, head low
  const jaw = a.joint('jaw', head, 0, -0.04, 0.06); jaw.rotation.x = 0.06;
  const eyes = a.joint('eyes', head, 0, 0.05, 0.19);
  const ear = { [L]: a.joint('earL', head, 0.075, 0.13, 0.02), [R]: a.joint('earR', head, -0.075, 0.13, 0.02) };
  const lip = { [L]: a.joint('lipL', head, 0.05, -0.04, 0.37), [R]: a.joint('lipR', head, -0.05, -0.04, 0.37) };
  const tail = [a.joint('tail1', pelvis, 0, 0.06, -0.27)];
  tail.push(a.joint('tail2', tail[0], 0, -0.03, -0.2), a.joint('tail3', tail[1], 0, -0.07, -0.18), a.joint('tail4', tail[2], 0, -0.1, -0.15));
  const sh = {}; const el = {}; const wr = {}; const hp = {}; const kn = {}; const hk = {};
  for (const s of [L, R]) {
    const k = s === L ? 'L' : 'R';
    sh[s] = a.joint(`shoulder${k}`, chest, s * 0.19, -0.12, 0.14);
    el[s] = a.joint(`elbow${k}`, sh[s], 0, -0.34, -0.05);
    wr[s] = a.joint(`wrist${k}`, el[s], 0, -0.36, 0.03);
    hp[s] = a.joint(`hip${k}`, pelvis, s * 0.19, -0.04, -0.02);
    kn[s] = a.joint(`knee${k}`, hp[s], 0, -0.3, 0.2);
    hk[s] = a.joint(`hock${k}`, kn[s], 0, -0.3, -0.26);
  }
  const ikF = { [L]: a.joint('ikFL', a.model, 0, 0, 0), [R]: a.joint('ikFR', a.model, 0, 0, 0) };
  const ikH = { [L]: a.joint('ikHL', a.model, 0, 0, 0), [R]: a.joint('ikHR', a.model, 0, 0, 0) };

  // ------------------------------------------------------------------ sculpt helpers
  const S = (joint, f, min, max, h, color, o = {}) => {
    const g = sculpt(f, { min, max, h: h * Q * 2.1, color, aoR: o.aoR ?? 3.0, aoK: o.aoK ?? 0.85 });
    kit.add(joint, g, o.mat || fur, o.xf || {});
    return g;
  };
  // pelt colouring: dark saddle, light belly/chest/legs-inside, mottled by noise
  const pelt = (lightBelow = 0.55, base = 0.9) => (x, y, z, nx, ny, nz, ao, c) => {
    const n = 0.5 + 0.5 * NZ.n3(x * 6, y * 6, z * 6); const n2 = 0.5 + 0.5 * NZ.n3(x * 21 + 3, y * 21, z * 21);
    const lo = sstep(0.15, -0.55, ny);
    c.setRGB(1.0, 0.97, 0.93).multiplyScalar(base * (0.85 + n * 0.8));
    c.lerp(tc.setRGB(0.95, 0.9, 0.8), lo * lightBelow * (0.6 + 0.4 * n2));
    c.multiply(sc.setScalar(0.85 + 0.3 * n2));
  };
  const furSweep = (flow, len, n, r, joint, g, bendG = 0.0) => {
    const pts = sampleSurface(g, Math.round(n * TUFT), rng);
    const P = []; const C = []; const d = new THREE.Vector3(); const bend = new THREE.Vector3(0, -1, 0);
    for (const q of pts) {
      flow(q.p, d); d.addScaledVector(q.n, 0.55).normalize();
      const l = lerp(len[0], len[1], rng());
      const root = q.c.clone().multiplyScalar(0.75); const tip = q.c.clone().multiplyScalar(1.15 + rng() * 0.35).lerp(tc.setRGB(0.9, 0.86, 0.78), rng() * 0.2);
      pushTuft(P, C, q.p.clone().addScaledVector(q.n, -0.012), d, l, r * (0.7 + rng() * 0.6), bend.clone().multiplyScalar(0.5 + bendG), root, tip);
    }
    if (P.length) kit.add(joint, tuftGeo(P, C), fur);
  };

  // ------------------------------------------------------------------ body
  const pelvisF = U(0.1, mirX(sdf.ell(0.17, -0.07, -0.06, 0.15, 0.23, 0.25)), sdf.ell(0, 0.02, -0.08, 0.2, 0.2, 0.3), sdf.cap([0, -0.1, 0.0], [0, -0.12, 0.62], 0.17, 0.21), sdf.cap([0, 0.15, -0.2], [0, 0.18, 0.55], 0.11, 0.14), sdf.sphere(0, 0.0, -0.3, 0.14));
  const pelvisG = S(pelvis, pelvisF, [-0.42, -0.5, -0.5], [0.42, 0.45, 0.85], 0.032, pelt(0.45));
  const chestF = U(0.1, sdf.ell(0, -0.05, 0, 0.23, 0.34, 0.42), sdf.ell(0, 0.2, 0.12, 0.15, 0.12, 0.24), mirX(sdf.ell(0.19, -0.05, 0.13, 0.1, 0.23, 0.2, [0, 0, 0.12])), sdf.ell(0, -0.3, 0.2, 0.13, 0.15, 0.2), sdf.cap([0, 0, -0.35], [0, 0.0, 0.3], 0.22, 0.24), sdf.cap([0, 0.05, 0.2], [0, 0.1, 0.42], 0.18, 0.16));
  const scar = (x, y, z) => { // pale scar lines on the left flank and across the chest
    const d1 = Math.abs((x - 0.21) * 0.9 + (z - 0.1) * 0.0) < 0.012 && y > -0.2 && y < 0.1 && Math.abs(z - 0.05 - y * 0.8) < 0.1 ? 1 : 0;
    return d1;
  };
  const chestCol = (x, y, z, nx, ny, nz, ao, c) => {
    pelt(0.6)(x, y, z, nx, ny, nz, ao, c);
    const sc1 = sstep(0.012, 0.004, Math.abs(((x - 0.235) * 0.6 + (y - 0.04) * 0.8) - 0.01 * Math.sin(z * 30))) * sstep(0.3, 0.1, Math.abs(z - 0.1)) * (x > 0.1 ? 1 : 0);
    const sc2 = sstep(0.012, 0.004, Math.abs((x + 0.06) * 0.7 + (y + 0.12) * 0.7 - 0.0)) * sstep(0.12, 0.03, Math.abs(z - 0.36)) * (z > 0.2 ? 1 : 0);
    c.lerp(tc.setRGB(0.85, 0.68, 0.62), Math.max(sc1, sc2) * 0.8);
  };
  const chestG = S(chest, chestF, [-0.42, -0.55, -0.55], [0.42, 0.5, 0.7], 0.032, chestCol);
  const neckF1 = U(0.08, sdf.cap([0, -0.02, -0.12], [0, 0.0, 0.3], 0.19, 0.15), sdf.ell(0, 0.05, 0.05, 0.14, 0.16, 0.22), sdf.ell(0, -0.1, 0.1, 0.12, 0.1, 0.2));
  const neckG1 = S(neck1, neckF1, [-0.32, -0.35, -0.3], [0.32, 0.35, 0.5], 0.026, pelt(0.35));
  const neckG2 = S(neck2, U(0.07, sdf.cap([0, -0.02, -0.08], [0, 0.0, 0.27], 0.16, 0.13), sdf.ell(0, -0.07, 0.08, 0.1, 0.1, 0.16)), [-0.28, -0.3, -0.2], [0.28, 0.3, 0.42], 0.024, pelt(0.4));

  // ---- shell fur: three inflated, strand-masked copies of the big masses (dark roots, light tips; the shader discards by strand hash)
  const shellBody = (joint, f, min, max, col) => {
    const g0 = sculpt(f, { min, max, h: 0.058 * Q, color: col, aoK: 0.6, aoR: 3 });
    for (let k = 1; k <= 3; k++) {
      const g = g0.clone(); const p = g.attributes.position; const n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * k * 0.016, p.getY(i) + n.getY(i) * k * 0.016 - k * 0.004, p.getZ(i) + n.getZ(i) * k * 0.016);
      kit.add(joint, g, shellMats[k - 1]);
    }
  };
  shellBody(pelvis, pelvisF, [-0.42, -0.5, -0.5], [0.42, 0.45, 0.85], pelt(0.45));
  shellBody(chest, chestF, [-0.42, -0.55, -0.55], [0.42, 0.5, 0.7], chestCol);

  // ---- head
  const hSkull = U(0.05, sdf.ell(0, 0.045, 0.05, 0.085, 0.11, 0.14), sdf.ell(0, 0.085, 0.0, 0.075, 0.085, 0.1));
  const hBrow = mirX(sdf.cap([0.078, 0.108, 0.07], [0.04, 0.088, 0.2], 0.03, 0.022));
  const hMuz = U(0.03, sdf.cap([0, 0.02, 0.15], [0, -0.01, 0.5], 0.07, 0.042), sdf.ell(0, -0.025, 0.33, 0.06, 0.045, 0.17));
  const hStop = sdf.ell(0, 0.07, 0.19, 0.04, 0.05, 0.07);
  const hCheek = mirX(sdf.ell(0.075, -0.04, 0.04, 0.04, 0.065, 0.09));
  const hSock = mirX(sdf.ell(0.062, 0.062, 0.2, 0.024, 0.02, 0.032));
  const hNose = sdf.sphere(0, -0.008, 0.505, 0.029);
  const hBase = U(0.02, U(0.045, hSkull, hBrow, hMuz, hStop, hCheek), hNose);
  const hFull = (x, y, z) => Math.max(hBase(x, y, z), -(y + 0.098 - 0.0 * z), -hSock(x, y, z));  // flat underside: the jaw is separate
  const hCol = (x, y, z, nx, ny, nz, ao, c) => {
    pelt(0.7)(x, y, z, nx, ny, nz, ao, c);
    const mask = sstep(0.25, 0.45, z) * sstep(0.15, -0.02, y - 0.0);                 // pale muzzle
    c.lerp(tc.setRGB(0.88, 0.82, 0.72), mask * 0.7);
    const eyeR = Math.exp(-(((Math.abs(x) - 0.07) / 0.03) ** 2 + ((y - 0.055) / 0.025) ** 2 + ((z - 0.19) / 0.05) ** 2)); c.multiplyScalar(1 - eyeR * 0.5);
    const nosepad = sstep(0.5, 0.52, z + 0.0) * 1; c.lerp(tc.setRGB(0.02, 0.02, 0.02), nosepad);
    const lipk = Math.exp(-(((y + 0.075) / 0.02) ** 2)) * sstep(0.3, 0.5, z); c.lerp(tc.setRGB(0.05, 0.04, 0.04), lipk * 0.7);
  };
  const headG = S(head, hFull, [-0.25, -0.12, -0.15], [0.25, 0.25, 0.65], 0.015, hCol, { aoR: 1.6 });
  // jaw
  const jawF = (() => {
    const ram = mirX(sdf.cap([0.07, -0.01, 0.02], [0.032, -0.02, 0.45], 0.04, 0.03));
    const chin = sdf.ell(0, -0.03, 0.47, 0.042, 0.03, 0.05);
    const under = sdf.ell(0, -0.04, 0.22, 0.066, 0.04, 0.19);
    return U(0.02, ram, chin, under);
  })();
  S(jaw, jawF, [-0.2, -0.2, -0.12], [0.2, 0.15, 0.6], 0.011, (x, y, z, nx, ny, nz, ao, c) => { pelt(0.9)(x, y, z, nx, ny, nz, ao, c); c.lerp(tc.setRGB(0.55, 0.12, 0.14), sstep(0.0, 0.03, y + 0.025) * sstep(0.5, 0.25, z) * 0.9); }, { xf: { p: [0, -0.0, 0] } });
  // tongue + mouth interior tint is in the jaw colours; nose
  kit.add(head, new THREE.SphereGeometry(0.032, 18, 12), noseM, { p: [0, -0.008, 0.518], s: [1.0, 0.72, 0.8] });
  // teeth: big canines, small incisors, carnassials. ivory, untextured, on the fur material
  const tooth = (jn, p, len, r, flip, ang = 0) => kit.add(jn, spike(len, r, { curve: 0.12, sides: 5, segs: 3, col0: 0x6a5a30, col1: 0xf0e8c8 }), fur, { p, r: [flip ? Math.PI : 0, 0, ang], untex: true });
  for (const s of [L, R]) {
    tooth(head, [s * 0.036, -0.088, 0.485], 0.075, 0.0125, true, s * 0.12);
    tooth(jaw, [s * 0.03, 0.03, 0.455], 0.06, 0.0105, false, s * -0.1);
    for (let i = 0; i < 3; i++) tooth(head, [s * (0.012 + i * 0.012), -0.09, 0.52 - i * 0.004], 0.018, 0.005, true);
    for (let i = 0; i < 3; i++) tooth(jaw, [s * (0.012 + i * 0.01), 0.03, 0.48 - i * 0.004], 0.016, 0.0045, false);
    for (let i = 0; i < 3; i++) { tooth(head, [s * 0.052, -0.09, 0.33 - i * 0.04], 0.026 - i * 0.003, 0.0085, true); tooth(jaw, [s * 0.045, 0.03, 0.32 - i * 0.04], 0.022, 0.0075, false); }
  }
  // eyes: amber, deep set, with a pinched dark pupil and a hot glint
  for (const s of [L, R]) {
    const eg = new THREE.SphereGeometry(0.0235, 18, 14); const pp = eg.attributes.position; const col = new Float32Array(pp.count * 3); const em = new Float32Array(pp.count);
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i); const y = pp.getY(i); const z = pp.getZ(i); const rd = Math.hypot(x, y) / 0.0235; const fr = z > 0;
      tc.set(0xffcf40).lerp(sc.set(0xe86a10), sstep(0.3, 0.9, rd)); let e = lerp(1.2, 0.5, sstep(0.2, 1, rd));
      if (fr && (x / 0.0052) ** 2 + (y / 0.0095) ** 2 < 1) { tc.setRGB(0.01, 0.005, 0); e = 0; }
      if (fr && Math.hypot(x - s * 0.006, y - 0.007) < 0.0028) { tc.setRGB(1, 1, 1); e = 2.4; }
      if (!fr) e = 0.3;
      col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b; em[i] = e;
    }
    eg.setAttribute('color', new THREE.BufferAttribute(col, 3)); eg.setAttribute('aEmber', new THREE.BufferAttribute(em, 1));
    kit.add(eyes, eg, eyeM, { p: [s * 0.058, 0.01, 0.01], r: [0.0, s * 0.5, s * -0.35] });
    // brow fur ridge shading / lids: a darker half-ellipsoid hooding the eye
    kit.add(eyes, new THREE.SphereGeometry(0.021, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), fur, { p: [s * 0.066, 0.001, -0.001], r: [rad(-25), 0, s * rad(-20)], tint: 0x403c38, untex: true });
  }
  // ears: leaf with notch and ragged edge; pinned back at rest
  for (const [i, s] of [L, R].entries()) {
    const notch = i === 0 ? [{ u: 0.55, d: 0.55, w: 0.07, side: 1 }, { u: 0.8, d: 0.35, w: 0.05, side: -1 }] : [{ u: 0.7, d: 0.4, w: 0.05, side: -1 }];
    const g = leaf({ len: 0.27, halfW: (u) => 0.1 * Math.pow(1 - u, 0.8) * Math.min(1, 0.4 + u * 5), thick: 0.006, cup: 0.02, bend: -0.12, notch, jag: 0.12, seed: seed + i, segU: 12, segV: 6, col: 0xffffff, edgeCol: 0x3a3430 });
    kit.add(ear[s], g, fur, { r: [rad(-10), s * rad(10), s * rad(-18)], tint: 0xbcb4a8 });
    const P = []; const C = []; const rimC = new THREE.Color(0.3, 0.28, 0.26); const tipC = new THREE.Color(0.75, 0.7, 0.62);
    for (let k = 0; k < 14; k++) { const u = rng(); const w = 0.07 * (1 - u) * (rng() < 0.5 ? 1 : -1); pushTuft(P, C, new THREE.Vector3(w * 0.9, 0.2 * u * 0.95, 0.0), new THREE.Vector3(0.0, 1, 0.1).normalize(), 0.03, 0.005, new THREE.Vector3(0, 0, -1), rimC, tipC); }
    kit.add(ear[s], tuftGeo(P, C), fur, { r: [rad(-10), s * rad(10), s * rad(-18)] });
  }
  // lips (flews): lift to bare the fangs when snarling
  for (const s of [L, R]) kit.add(lip[s], new THREE.SphereGeometry(1, 14, 10), fur, { p: [s * 0.0, 0.01, 0.0], s: [0.034, 0.03, 0.09], tint: 0x8a857c });

  // ---- limbs
  const legCol = (x, y, z, nx, ny, nz, ao, c) => { pelt(0.05, 1.0)(x, y, z, nx, ny, nz, ao, c); const inner = sstep(0.0, 0.06, -Math.sign(x || 1) * x * 0 + (0.0)); c.multiplyScalar(0.8 + 0.4 * sstep(-0.3, -0.05, y * 0 + z * 0)); void inner; c.multiplyScalar(0.7); };
  for (const s of [L, R]) {
    S(sh[s], U(0.05, sdf.cap([0, 0, 0], [0, -0.34, -0.05], 0.14, 0.095), sdf.ell(0, -0.05, 0.02, 0.12, 0.16, 0.14)), [-0.22, -0.46, -0.22], [0.22, 0.14, 0.2], 0.018, legCol);
    S(el[s], U(0.03, sdf.cap([0, 0, 0], [0, -0.36, 0.03], 0.092, 0.056), sdf.sphere(0, 0.0, -0.03, 0.075)), [-0.18, -0.5, -0.18], [0.18, 0.12, 0.18], 0.016, legCol);
    const toes = [-1, -0.35, 0.35, 1].map((t) => sdf.cap([t * 0.008, -0.08, 0.05], [t * 0.034, -0.105, 0.14 - Math.abs(t) * 0.012], 0.032, 0.026));
    S(wr[s], U(0.02, sdf.cap([0, 0, 0], [0, -0.09, 0.06], 0.042, 0.05), sdf.ell(0, -0.1, 0.09, 0.07, 0.045, 0.1), ...toes), [-0.16, -0.22, -0.12], [0.16, 0.06, 0.28], 0.012, legCol);
    for (const t of [-1, -0.35, 0.35, 1]) kit.add(wr[s], spike(0.04, 0.009, { curve: -0.3, col0: 0x2a2420, col1: 0xb8aa8a }), fur, { p: [t * 0.034, -0.11, 0.152 - Math.abs(t) * 0.012], r: [rad(95), 0, t * -0.1], untex: true });
    // hind
    S(hp[s], U(0.07, sdf.cap([0, 0, 0], [0, -0.3, 0.2], 0.17, 0.1), sdf.ell(s * 0.02, -0.08, -0.02, 0.14, 0.22, 0.19)), [-0.3, -0.5, -0.28], [0.3, 0.18, 0.4], 0.02, legCol);
    S(kn[s], U(0.04, sdf.cap([0, 0, 0], [0, -0.3, -0.26], 0.1, 0.05), sdf.sphere(0, 0, 0.0, 0.09)), [-0.18, -0.42, -0.4], [0.18, 0.12, 0.2], 0.013, legCol);
    const toesH = [-1, -0.35, 0.35, 1].map((t) => sdf.cap([t * 0.008, -0.16, 0.06], [t * 0.032, -0.185, 0.14 - Math.abs(t) * 0.012], 0.03, 0.024));
    S(hk[s], U(0.02, sdf.cap([0, 0, 0], [0, -0.15, 0.05], 0.06, 0.05), sdf.ell(0, -0.17, 0.09, 0.075, 0.042, 0.11), sdf.sphere(0, 0.0, -0.02, 0.06), ...toesH), [-0.16, -0.32, -0.15], [0.16, 0.08, 0.28], 0.012, legCol);
    for (const t of [-1, -0.35, 0.35, 1]) kit.add(hk[s], spike(0.038, 0.009, { curve: -0.3, col0: 0x2a2420, col1: 0xb8aa8a }), fur, { p: [t * 0.032, -0.2, 0.142 - Math.abs(t) * 0.012], r: [rad(95), 0, t * -0.1], untex: true });
    // dewclaw
    kit.add(wr[s], spike(0.03, 0.007, { curve: 0.3, col0: 0x2a2420, col1: 0xb8aa8a }), fur, { p: [s * 0.04, -0.06, -0.01], r: [rad(160), 0, 0], untex: true });
  }
  // tail: tapered bushy chain
  const tailR = [0.085, 0.075, 0.065, 0.05];
  tail.forEach((j, i) => S(j, sdf.cap([0, 0, 0], [0, i < 3 ? [-0.03, -0.07, -0.1][i] : -0.02, [-0.2, -0.18, -0.15, -0.22][i]], tailR[i], i < 3 ? tailR[i + 1] : 0.025), [-0.16, -0.25, -0.34], [0.16, 0.16, 0.12], 0.014, (x, y, z, nx, ny, nz, ao, c) => { pelt(0.2)(x, y, z, nx, ny, nz, ao, c); if (i === 3) c.multiplyScalar(0.55); }));

  // ---- fur tufts: swept back along the body, hanging on legs; denser on mane/shoulders/ruff
  const back = new THREE.Vector3(0, 0, -1);
  const bodyFlow = (p, d) => d.set(0, -0.25, -1).normalize();
  const maneFlow = (p, d) => d.set(0, 0.15, -1).normalize();
  const legFlow = (p, d) => d.set(0, -1, -0.3).normalize();
  furSweep(bodyFlow, [0.06, 0.14], 240, 0.0075, pelvis, pelvisG);
  furSweep(bodyFlow, [0.07, 0.16], 260, 0.0078, chest, chestG);
  furSweep(maneFlow, [0.1, 0.22], 220, 0.009, neck1, neckG1, 0.4);
  furSweep(maneFlow, [0.09, 0.2], 170, 0.009, neck2, neckG2, 0.4);
  furSweep((p, d) => d.set(0, 0.0, -1).normalize(), [0.04, 0.09], 220, 0.0055, head, headG);
  const tailG = null; void tailG; void back;
  for (const s of [L, R]) {
    // legs: grab the sculpt geometry back from the kit lists is awkward, so scatter on simple proxies
    const proxy = (f, min, max) => sculpt(f, { min, max, h: 0.03 * Q, aoK: 0 });
    furSweep(legFlow, [0.05, 0.11], 90, 0.006, sh[s], proxy(U(0.05, sdf.cap([0, 0, 0], [0, -0.34, -0.05], 0.12, 0.085), sdf.ell(0, -0.05, 0.02, 0.1, 0.14, 0.12)), [-0.25, -0.5, -0.25], [0.25, 0.16, 0.22]));
    furSweep(legFlow, [0.04, 0.09], 60, 0.005, el[s], proxy(sdf.cap([0, 0, 0], [0, -0.36, 0.03], 0.082, 0.05), [-0.2, -0.5, -0.2], [0.2, 0.14, 0.2]));
    furSweep(legFlow, [0.06, 0.13], 110, 0.007, hp[s], proxy(U(0.07, sdf.cap([0, 0, 0], [0, -0.3, 0.2], 0.15, 0.09), sdf.ell(s * 0.02, -0.08, -0.02, 0.12, 0.2, 0.16)), [-0.32, -0.5, -0.3], [0.32, 0.2, 0.42]));
    furSweep(legFlow, [0.04, 0.09], 60, 0.005, kn[s], proxy(sdf.cap([0, 0, 0], [0, -0.3, -0.26], 0.09, 0.05), [-0.2, -0.45, -0.42], [0.2, 0.14, 0.22]));
  }
  for (const s of [L, R]) {
    const pawProxy = (f, min, max) => sculpt(f, { min, max, h: 0.02 * Q, aoK: 0, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.4, 0.38, 0.36); } });
    furSweep((p, d) => d.set(0, -0.4, 0.5).normalize(), [0.03, 0.06], 55, 0.0045, wr[s], pawProxy(sdf.ell(0, -0.1, 0.09, 0.075, 0.05, 0.11), [-0.15, -0.2, -0.05], [0.15, 0.03, 0.25]));
    furSweep((p, d) => d.set(0, -0.4, 0.5).normalize(), [0.03, 0.06], 55, 0.0045, hk[s], pawProxy(sdf.ell(0, -0.17, 0.09, 0.075, 0.05, 0.11), [-0.15, -0.26, -0.05], [0.15, -0.08, 0.25]));
  }
  tail.forEach((j, i) => {
    const pr = sculpt(sdf.cap([0, 0, 0], [0, [-0.03, -0.07, -0.1, -0.02][i], [-0.2, -0.18, -0.15, -0.22][i]], tailR[i] + 0.012, i < 3 ? tailR[i + 1] + 0.012 : 0.03), { min: [-0.16, -0.25, -0.34], max: [0.16, 0.16, 0.12], h: 0.03 * Q, aoK: 0, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.45, 0.43, 0.4); if (i === 3) c.multiplyScalar(0.6); } });
    furSweep((p, d) => d.set(0, -0.3, -1).normalize(), [0.07, 0.16], 120, 0.0085, j, pr, 0.5);
  });

  // ---- collar remnant: torn leather band with a snapped chain hanging off an iron ring
  {
    const ring = sdf.eltorus(0, 0, 0.0, 0.2, 0.19, 0.022, [0.25, 0, 0]);
    const cut = sdf.box(0.0, -0.1, 0.0, 0.06, 0.2, 0.2);                 // gap at the throat, torn open
    const collar = (x, y, z) => Math.max(ring(x, y, z), -Math.max(cut(x, y, z) * 1, 0.0) * 0 - ((Math.abs(x) < 0.05 && y < -0.1) ? 1 : -1) * 0.0);
    S(neck1, (x, y, z) => Math.max(ring(x, y - 0.0, z - 0.0), -(sdf.box(0, -0.2, 0.0, 0.05, 0.1, 0.3)(x, y, z))), [-0.3, -0.3, -0.25], [0.3, 0.3, 0.25], 0.016, (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.55, 0.4, 0.3).multiplyScalar(0.6 + 0.4 * (0.5 + 0.5 * NZ.n3(x * 30, y * 30, z * 30))); }, { mat: leather, aoK: 0.6 });
    void collar;
    kit.add(neck1, new THREE.TorusGeometry(0.02, 0.006, 6, 14), iron, { p: [0.05, -0.19, 0.05], r: [0.3, 1.2, 0] });
    for (let i = 0; i < 4; i++) kit.add(neck1, new THREE.TorusGeometry(0.014, 0.0045, 5, 10), iron, { p: [0.058, -0.225 - i * 0.022, 0.058], r: [i % 2 ? Math.PI / 2 : 0, i % 2 ? 0 : Math.PI / 2, 0.3] });
  }

  // ------------------------------------------------------------------ anchors / build / IK
  a.anchor('head', head, 0, 0.35, 0.15);
  a.anchor('chest', chest, 0, 0.1, 0.22);
  a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', jaw, 0, -0.01, 0.5);
  a.anchor('weapon', jaw, 0, -0.01, 0.5);
  a.anchor('handR', wr[R], 0, -0.1, 0.12);
  a.anchor('handL', wr[L], 0, -0.1, 0.12);
  contactShadow(a, 0.85, 1.45, 0.6);
  a.root.scale.setScalar(1.45); a.height = 1.2 * 1.45; a.radius = 1.1;
  kit.build();
  const ik = [];
  for (const s of [L, R]) {
    ik.push(legIK(a, { hip: sh[s], knee: el[s], ankle: wr[s], target: ikF[s], pole: [0, 0, -1] }));
    ik.push(legIK(a, { hip: hp[s], knee: kn[s], ankle: hk[s], target: ikH[s], pole: [0, 0, 1] }));
  }

  // ------------------------------------------------------------------ animation
  const side = (n, s) => `${n}${s === L ? 'L' : 'R'}`;
  const face = (P, { jawD = 0, snarl = 0, earBack = 0, earUp = 0, blink = 0, eyeS = 1 }) => {
    P.rot('jaw', jawD, 0, 0); P.scl('eyes', 1, Math.max(0.05, eyeS * (1 - blink * 0.95)), 1);
    for (const s of [L, R]) { P.rot(side('lip', s), -snarl * 0.9, 0, s * -snarl * 0.5); P.rot(side('ear', s), -earBack, 0, s * earUp); }
  };
  const blinkAt = (t, per, off = 0) => { const k = (t + off) % per; return k < 0.16 ? Math.sin((k / 0.16) * Math.PI) : 0; };
  const tailWave = (P, t, amp, hz, base = 0, lift = 0) => { tail.forEach((j, i) => { P.rot(j.name, base + lift, Math.sin((t * hz - i * 0.16) * Math.PI * 2) * amp * (1 + i * 0.25), 0); }); };
  const feet = (P, f = 0) => { };
  const breathe = (P, t, k = 1) => { const b = sn(t, 0.5); P.scl('chest', 1 + b * 0.012 * k, 1 + b * 0.02 * k, 1 + b * 0.004 * k); P.rot('chest', b * 0.012 * k, 0, 0); P.scl('pelvis', 1, 1 + b * 0.006 * k, 1); };
  const bodyPose = (P, { drop = 0, dropF = 0, pitch = 0, yaw = 0, shiftZ = 0 }) => {   // rear height, front height, pelvis pitch
    P.pos('pelvis', 0, -drop, shiftZ); P.rot('pelvis', pitch, yaw, 0); P.pos('chest', 0, -dropF, 0);
  };
  const neckPose = (P, { n1 = 0, n2 = 0, h = 0, yaw = 0, roll = 0 }) => { P.rot('neck1', n1, yaw * 0.3, roll * 0.3); P.rot('neck2', n2, yaw * 0.4, roll * 0.3); P.rot('head', h, yaw * 0.3, roll * 0.4); };
  const paw = (P, nm, dy = 0, dz = 0, dx = 0) => P.pos(nm, dx, dy, dz);

  const clips = {};
  clips.idle = { loop: true, dur: 3.2, fn: (t, P) => {
    const w = sn(t, 1 / 3.2);
    bodyPose(P, { drop: 0.004 * sn(t, 0.5), dropF: -0.004 * sn(t, 0.5), pitch: 0.005 }); P.pos('pelvis', w * 0.02, 0, 0); P.rot('pelvis', 0, 0, w * 0.02);
    breathe(P, t, 1.6);
    neckPose(P, { n1: 0.04 + sn(t, 0.5, 0.2) * 0.02, n2: 0.0, h: 0.05 + sn(t, 1 / 3.2, 0.3) * 0.04, yaw: sn(t, 1 / 6.4, 0.2) * 0.35, roll: sn(t, 1 / 4.7) * 0.06 });
    const growl = Math.max(0, sn(t, 1 / 3.2, 0.6) - 0.55) * 2.2;
    face(P, { jawD: 0.02 * sn(t, 0.5) + growl * 0.05 * (0.5 + 0.5 * Math.sin(t * 17)), snarl: growl * 0.35, earBack: 0.35 + 0.05 * sn(t, 1 / 2.6), earUp: 0.02, blink: blinkAt(t, 3.2, 0.5), eyeS: 0.85 });
    P.rot('earL', -Math.max(0, sn(t, 1 / 3.2, 0.1) - 0.8) * 0.9, 0, 0); P.rot('earR', 0.0, 0, 0);
    tailWave(P, t, 0.16, 0.3, -0.12);
    P.pos('ikFL', 0, 0, 0); P.pos('ikHL', 0, Math.max(0, sn(t, 1 / 3.2, 0.7) - 0.9) * 0.1, 0);
  } };
  clips.ready = { loop: true, dur: 1.6, fn: (t, P) => {
    bodyPose(P, { drop: 0.08, dropF: 0.14, pitch: 0.04 }); breathe(P, t, 3.5);
    P.pos('ikFL', 0, 0, 0.04); P.pos('ikFR', 0, 0, 0.04); P.pos('ikHL', 0.02, 0, 0); P.pos('ikHR', -0.02, 0, 0);
    neckPose(P, { n1: 0.3, n2: 0.18, h: -0.05, yaw: sn(t, 1 / 3.2) * 0.2, roll: 0 });
    face(P, { jawD: 0.1 + 0.03 * Math.sin(t * 12), snarl: 0.55, earBack: 0.7, blink: 0, eyeS: 0.55 });
    tailWave(P, t, 0.06, 0.5, 0.05, 0.15);
  } };
  clips.tele_strike = { loop: true, dur: 1.4, fn: (t, P) => {      // crouch and growl
    bodyPose(P, { drop: 0.16, dropF: 0.3, pitch: 0.12 }); breathe(P, t, 4);
    P.pos('chest', 0, 0, 0.0); P.pos('ikFL', 0, 0, 0.1); P.pos('ikFR', 0, 0, 0.1); P.pos('ikHL', 0.03, 0, -0.04); P.pos('ikHR', -0.03, 0, -0.04);
    P.rot('chest', 0.05 + 0.02 * Math.sin(t * 10), 0, 0);
    neckPose(P, { n1: 0.5, n2: 0.28, h: -0.15, yaw: sn(t, 1 / 2.8) * 0.12 });
    const g = 0.5 + 0.5 * Math.sin(t * 14);
    face(P, { jawD: 0.22 + 0.06 * g, snarl: 0.95, earBack: 0.95, eyeS: 0.45 });
    tailWave(P, t, 0.04, 0.9, 0.1, 0.25); P.pos('pelvis', Math.sin(t * 30) * 0.003, 0, 0);
  } };
  clips.tele_guard = { loop: true, dur: 1.8, fn: (t, P) => {
    bodyPose(P, { drop: 0.34, dropF: 0.5, pitch: 0.1 }); breathe(P, t, 2.5);
    P.pos('ikFL', 0.04, 0, 0.14); P.pos('ikFR', -0.04, 0, 0.14); P.pos('ikHL', 0.06, 0, -0.12); P.pos('ikHR', -0.06, 0, -0.12);
    neckPose(P, { n1: 0.55, n2: 0.4, h: -0.25, yaw: sn(t, 1 / 3.6) * 0.15 });
    face(P, { jawD: 0.03, snarl: 0.4, earBack: 0.85, eyeS: 0.6, blink: blinkAt(t, 1.8, 0.4) });
    tailWave(P, t, 0.05, 0.4, 0.0, -0.1);
  } };
  clips.guard = { loop: true, dur: 1.8, fn: (t, P) => clips.tele_guard.fn(t, P) };
  clips.tele_howl = { loop: true, dur: 2.0, fn: (t, P) => {          // head thrown back, chest swelling
    const h = ease.io(0.5 + 0.5 * Math.sin((t / 2.0) * Math.PI * 2 - 1.2));
    bodyPose(P, { drop: -0.01, dropF: -0.1, pitch: -0.1 }); P.scl('chest', 1 + h * 0.05, 1 + h * 0.08, 1 + h * 0.03); P.rot('chest', -0.15, 0, 0);
    neckPose(P, { n1: -0.55, n2: -0.6, h: -0.55 });
    face(P, { jawD: 0.18 + 0.1 * h, snarl: 0.1, earBack: 0.1, eyeS: 0.3 });
    tailWave(P, t, 0.05, 0.5, 0.2, 0.45); P.pos('ikFL', 0, 0, -0.05); P.pos('ikFR', 0, 0, -0.05);
  } };
  clips.tele_cast = { loop: true, dur: 2.0, fn: (t, P) => clips.tele_howl.fn(t, P) };
  clips.attack = { dur: 0.95, events: { hit: 0.4 }, fn: (t, P) => {          // Bite: coil, lunge, snap, recover
    const wind = ease.io(clamp(t / 0.26)); const snap = ease.out(clamp((t - 0.26) / 0.14)); const rec = ease.io(clamp((t - 0.52) / 0.43));
    const c = wind * (1 - snap); const s = snap * (1 - rec); const A = Math.max(c, s);
    bodyPose(P, { drop: 0.12 * c + 0.06 * s, dropF: 0.25 * c - 0.03 * s, pitch: 0.1 * c - 0.08 * s, shiftZ: -0.12 * c + 0.45 * s });
    P.pos('ikFL', 0, 0, 0.1 * c + 0.3 * s); P.pos('ikFR', 0, 0, 0.1 * c + 0.3 * s); P.pos('ikHL', 0, 0, 0.0 + 0.25 * s); P.pos('ikHR', 0, 0, 0.0 + 0.25 * s);
    neckPose(P, { n1: 0.5 * c + 0.1 * s, n2: 0.45 * c + 0.05 * s, h: -0.2 * c + 0.12 * s, yaw: 0 });
    const jawA = 0.7 * ease.out(clamp((t - 0.2) / 0.14)) * (1 - ease.in(clamp((t - 0.38) / 0.06)));
    face(P, { jawD: jawA + 0.1 * c, snarl: 0.9 * A, earBack: 0.9 * A, eyeS: 0.5 });
    tailWave(P, t, 0.05, 0.5, 0.1 * A, 0.3 * c + 0.1 * s);
  } };
  clips.attack2 = { dur: 1.15, events: { hit: 0.46 }, fn: (t, P) => {         // Rend: claw swipe then bite
    const wind = ease.io(clamp(t / 0.3)); const swipe = ease.out(clamp((t - 0.3) / 0.16)); const bite = ease.out(clamp((t - 0.5) / 0.12)); const rec = ease.io(clamp((t - 0.7) / 0.4));
    const c = wind * (1 - swipe); const s = swipe * (1 - rec); const b = bite * (1 - rec);
    bodyPose(P, { drop: 0.1 * c + 0.05 * s, dropF: 0.06 * c - 0.08 * s, pitch: -0.08 * c + 0.05 * s, shiftZ: -0.1 * c + 0.3 * s });
    P.rot('chest', 0, 0.35 * c - 0.25 * s, 0.1 * c);
    // right fore paw rakes across: lift and wind outward, then slash down-in
    P.pos('ikFL', 0.2 * c - 0.15 * s, 0.4 * c + 0.12 * s, -0.1 * c + 0.45 * s); P.pos('ikFR', 0, 0, 0.15 * s); P.pos('ikHL', 0, 0, 0.15 * s); P.pos('ikHR', 0, 0, 0.15 * s);
    neckPose(P, { n1: 0.2 * c - 0.25 * b, n2: 0.2 * c - 0.2 * b, h: -0.1 * c + 0.1 * b, yaw: -0.3 * c + 0.2 * s });
    const jawA = 0.65 * ease.out(clamp((t - 0.46) / 0.1)) * (1 - ease.in(clamp((t - 0.6) / 0.07)));
    face(P, { jawD: jawA + 0.1 * c, snarl: 0.8 * (c + s), earBack: 0.9 * (c + s + b), eyeS: 0.5 });
    tailWave(P, t, 0.08, 0.7, 0.1, 0.25 * c);
  } };
  clips.lunge = { dur: 1.5, events: { hit: 0.9 }, fn: (t, P) => {              // pounce: coil, leap on a real arc, land on the target
    const coil = ease.io(clamp(t / 0.34)); const fly = clamp((t - 0.34) / 0.56); const air = Math.sin(fly * Math.PI); const land = ease.out(clamp((t - 0.9) / 0.1)); const rec = ease.io(clamp((t - 1.05) / 0.45));
    const c = coil * (1 - (fly > 0 ? 1 : 0)); const dz = ease.io(fly) * 1.5 * (1 - rec) ;
    P.pos('root', 0, 0.55 * air, dz); P.rot('root', -0.25 * air * (fly < 0.5 ? 1 : -0.6), 0, 0);
    const cr = coil * (1 - ease.in(clamp((t - 0.3) / 0.06)));
    bodyPose(P, { drop: 0.2 * cr + 0.08 * land * (1 - rec), dropF: 0.3 * cr + 0.06 * land * (1 - rec), pitch: 0.12 * cr });
    // feet: planted during the coil, then tucked / reaching in the air, pinned to the ground again after landing (root travelled dz)
    const ground = dz;
    P.pos('ikFL', 0, 0.5 * air, ground + 0.4 * air * (1 - rec) ); P.pos('ikFR', 0, 0.5 * air, ground + 0.4 * air * (1 - rec));
    P.pos('ikHL', 0, 0.35 * air, ground - 0.2 * air); P.pos('ikHR', 0, 0.35 * air, ground - 0.2 * air);
    neckPose(P, { n1: 0.45 * cr - 0.25 * air, n2: 0.3 * cr - 0.15 * air, h: -0.2 * cr });
    const jawA = 0.8 * ease.out(clamp((t - 0.55) / 0.2)) * (1 - ease.in(clamp((t - 0.92) / 0.06)));
    face(P, { jawD: jawA, snarl: 0.9 * Math.max(cr, air), earBack: 1.0 * Math.max(cr, air), eyeS: 0.5 });
    tailWave(P, t, 0.1, 0.8, 0.2 * air, 0.1 * cr + 0.3 * air);
  } };
  clips.howl = { dur: 2.4, events: { hit: 1.0 }, fn: (t, P) => {
    const up = ease.io(clamp(t / 0.7)); const hold = 1 - ease.io(clamp((t - 1.7) / 0.6)); const k = up * hold;
    const swell = (0.5 + 0.5 * Math.sin(t * 7)) * k;
    bodyPose(P, { drop: 0.0, dropF: -0.12 * k, pitch: -0.08 * k }); P.rot('chest', -0.15 * k, 0, 0);
    P.scl('chest', 1 + swell * 0.06 + k * 0.03, 1 + swell * 0.1 + k * 0.04, 1 + swell * 0.04);
    neckPose(P, { n1: -0.6 * k, n2: -0.65 * k, h: -0.6 * k, yaw: Math.sin(t * 1.5) * 0.05 * k });
    face(P, { jawD: 0.45 * k + 0.05 * Math.sin(t * 8) * k, snarl: 0.3 * k, earBack: 0.2 * k, eyeS: 1 - 0.7 * k });
    tailWave(P, t, 0.05, 0.6, 0.2 * k, 0.45 * k); P.pos('ikFL', 0, 0, -0.06 * k); P.pos('ikFR', 0, 0, -0.06 * k);
  } };
  clips.hurt = { dur: 0.4, fn: (t, P) => {
    const k = Math.sin(clamp(t / 0.4) * Math.PI) ** 0.8;
    P.pos('pelvis', 0, -0.03 * k, -0.12 * k); P.rot('pelvis', 0.1 * k, 0.1 * k, 0.05 * k); P.rot('chest', -0.15 * k, -0.25 * k, 0);
    P.rot('neck1', -0.2 * k, -0.3 * k, 0); P.rot('neck2', -0.15 * k, -0.3 * k, 0); P.rot('head', -0.25 * k, -0.2 * k, 0.15 * k);
    P.rot('jaw', 0.5 * k, 0, 0); P.scl('eyes', 1, 1 - 0.7 * k, 1);
    for (const s of [L, R]) P.rot(side('ear', s), -0.6 * k, 0, 0);
    tail.forEach((j) => P.rot(j.name, 0.3 * k, 0, 0));
  } };
  clips.die = { dur: 1.3, fn: (t, P) => {
    const k = ease.in(clamp(t / 0.8)); const kk = clamp(t / 1.3);
    { const ro = 1.45 * ease.in(clamp((t - 0.15) / 0.8)); P.pos('root', 0.9 * Math.sin(ro) , 0.28 * Math.sin(ro), -0.12 * kk); P.rot('root', 0.0, 0, ro); }
    P.rot('neck1', 0.2 * kk, 0.4 * kk, 0); P.rot('neck2', 0.1 * kk, 0.3 * kk, 0); P.rot('head', 0.1 * kk, 0.3 * kk, 0);
    face(P, { jawD: 0.5 * ease.out(clamp(t / 0.25)), earBack: 0.8, blink: clamp((t - 0.5) / 0.2) * 0.9 });
    for (const s of [L, R]) { P.rot(side('shoulder', s), -0.5 * k, 0, 0); P.rot(side('elbow', s), -0.9 * k, 0, 0); P.rot(side('hip', s), -0.4 * k, 0, 0); P.rot(side('knee', s), 0.7 * k, 0, 0); }
    tail.forEach((j) => P.rot(j.name, -0.3 * kk, 0.2 * kk, 0));
  } };
  clips.spawn = { dur: 1.2, fn: (t, P) => {      // bounds out of the dark and skids into a snarl
    const a1 = clamp(t / 0.55); const arc = Math.sin(a1 * Math.PI); const sk = ease.out(clamp((t - 0.55) / 0.15)) * (1 - ease.io(clamp((t - 0.7) / 0.5)));
    P.pos('root', 0, 0.4 * arc, -1.8 * (1 - ease.out(a1))); P.rot('root', -0.2 * arc, 0, 0);
    bodyPose(P, { drop: 0.08 * sk, dropF: 0.18 * sk });
    P.pos('ikFL', 0, 0.3 * arc, -1.8 * (1 - ease.out(a1))); P.pos('ikFR', 0, 0.3 * arc, -1.8 * (1 - ease.out(a1))); P.pos('ikHL', 0, 0.3 * arc, -1.8 * (1 - ease.out(a1))); P.pos('ikHR', 0, 0.3 * arc, -1.8 * (1 - ease.out(a1)));
    neckPose(P, { n1: 0.3 * sk - 0.3 * arc, n2: 0.2 * sk, h: -0.1 * sk });
    face(P, { jawD: 0.4 * arc + 0.2 * sk, snarl: sk, earBack: 0.9 * sk, eyeS: 0.6 });
    tailWave(P, t, 0.1, 1, 0.1, 0.3 * arc);
  } };
  a.clips = clips;
  void feet; void paw;

  const follow = new Follow(a, chest, 25, 5);
  a.onUpdate = (dt, t) => {
    const cn = a.animator.cur?.name;
    if (cn !== 'die') for (const s of ik) s();
    follow.update(dt); updateShadow(a);
    tail.forEach((j, i) => { j.rotation.y += follow.x * (0.15 + i * 0.1); j.rotation.x += -follow.y * 0.05 * (i + 1); });
  };
  return finish(a);
}
