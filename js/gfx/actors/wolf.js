// Dire Wolf: lean grey-brown wolf with a dark saddle, cream muzzle/chest/belly, a heavy ruff and a stalking pose.
// SDF-sculpted body, shell fur + swept tufts only on the neck/shoulders/tail, 4-leg IK, spring tail.
//
// Rig: root > pelvis > chest > neck1 > neck2 > head > (jaw, eyes, earL/R, lipL/R); pelvis > tail1..4;
//      chest > shoulderL/R > elbow > wrist (paw); pelvis > hipL/R > knee > hock (foot). IK targets ikFL ikFR ikHL ikHR.
// Anchors: head chest feet mouth handR handL (front paws) weapon (=mouth).
import { Actor } from './base.js';
import {
  THREE, sdf, smax, U, mirX, BUMP, sculpt, Kit, tpm, std, glowMat, finish, setRim, contactShadow, updateShadow, spike, leaf, paintGeo, sampleSurface, pushTuft, tuftGeo, legIK,
  mulberry32, makeNoise, rad, clamp, lerp, sstep, sn, ease, Follow,
} from './parts.js';

export function create({ seed = 1, quality = 'high', id } = {}) {
  const Q = (quality === 'low' ? 2.9 : quality === 'med' ? 2.2 : 1.75) / 1.75;
  const TUFT = quality === 'low' ? 0.35 : quality === 'med' ? 0.6 : 0.9;
  const rng = mulberry32(seed * 6271 + 5);
  const NZ = makeNoise(seed + 11);
  const a = new Actor({ name: 'wolf', height: 1.2, radius: 0.9 });
  const kit = new Kit();
  const L = 1; const R = -1;
  const tc = new THREE.Color(); const sc = new THREE.Color();

  setRim(0xffe0a8);
  const FUR = { tint: 0xd8d0c4, dark: 0x6a625a, seed: 2 + (seed % 4), color: 0xffffff, roughness: 1 };
  const fur = tpm('pelt', FUR, { scale: 7, nrm: 0.25, rimK: 0.7 });
  const shellMats = [1, 2, 3].map((k) => tpm('pelt', FUR, { scale: 7, nrm: 0.15, shell: k / 4, rimK: 0.0 }));
  const leather = tpm('leatherDark', { seed: 7 }, { scale: 14, nrm: 0.7 });
  const iron = tpm('iron', { seed: 4, metalness: 0.75, roughness: 0.9 }, { scale: 6, nrm: 0.8 });
  const eyeM = glowMat(0xffa21a, 2.0, { rough: 0.2 });
  const noseM = std(0x070605, { rough: 0.18 });

  // ------------------------------------------------------------------ skeleton (sloped back: shoulders higher than the rump)
  const root = a.joint('root', a.model, 0, 0, 0);
  const pelvis = a.joint('pelvis', root, 0, 0.73, -0.42);
  const chest = a.joint('chest', pelvis, 0, 0.14, 0.78);
  const neck1 = a.joint('neck1', chest, 0, 0.12, 0.28);
  const neck2 = a.joint('neck2', neck1, 0, 0.05, 0.22);
  const head = a.joint('head', neck2, 0, 0.03, 0.18);
  const jaw = a.joint('jaw', head, 0, -0.035, 0.045); jaw.rotation.x = 0.1;
  const eyes = a.joint('eyes', head, 0, 0.045, 0.16);
  const ear = { [L]: a.joint('earL', head, 0.05, 0.095, 0.03), [R]: a.joint('earR', head, -0.05, 0.095, 0.03) };
  const lip = { [L]: a.joint('lipL', head, 0.032, -0.05, 0.27), [R]: a.joint('lipR', head, -0.032, -0.05, 0.27) };
  lip[L].rotation.x = -0.3; lip[R].rotation.x = -0.3;      // a permanent half-snarl
  const tail = [a.joint('tail1', pelvis, 0, 0.04, -0.25)];
  tail.push(a.joint('tail2', tail[0], 0, -0.03, -0.2), a.joint('tail3', tail[1], 0, -0.07, -0.18), a.joint('tail4', tail[2], 0, -0.1, -0.16));
  const sh = {}; const el = {}; const wr = {}; const hp = {}; const kn = {}; const hk = {};
  for (const s of [L, R]) {
    const k = s === L ? 'L' : 'R';
    sh[s] = a.joint(`shoulder${k}`, chest, s * 0.125, -0.12, 0.14);
    el[s] = a.joint(`elbow${k}`, sh[s], 0, -0.34, -0.05);
    wr[s] = a.joint(`wrist${k}`, el[s], 0, -0.36, 0.04);
    hp[s] = a.joint(`hip${k}`, pelvis, s * 0.12, -0.04, -0.02);
    kn[s] = a.joint(`knee${k}`, hp[s], 0, -0.27, 0.18);
    hk[s] = a.joint(`hock${k}`, kn[s], 0, -0.27, -0.23);
  }
  neck1.rotation.x = 0.16; neck2.rotation.x = 0.04; head.rotation.x = 0.0; chest.rotation.x = -0.05; pelvis.rotation.x = 0.0;
  const ikF = { [L]: a.joint('ikFL', a.model, 0, 0, 0), [R]: a.joint('ikFR', a.model, 0, 0, 0) };
  const ikH = { [L]: a.joint('ikHL', a.model, 0, 0, 0), [R]: a.joint('ikHR', a.model, 0, 0, 0) };

  // ------------------------------------------------------------------ helpers
  const S = (joint, f, min, max, h, color, o = {}) => {
    const g = sculpt(f, { min, max, h: h * Q * 1.6, color, aoR: o.aoR ?? 2.4, aoK: o.aoK ?? 0.85 });
    kit.add(joint, g, o.mat || fur, o.xf || {}); return g;
  };
  // coat colour: grey-brown body, darker saddle on the back, cream underside; medium-frequency mottling (no streaks)
  const coat = (o = {}) => (x, y, z, nx, ny, nz, ao, c) => {
    const n = 0.5 + 0.5 * NZ.n3(x * 7, y * 7, z * 7); const n2 = 0.5 + 0.5 * NZ.n3(x * 19 + 3, y * 19, z * 19 + 1);
    c.setRGB(0.44, 0.41, 0.38).multiplyScalar(1.0 + (n - 0.5) * 0.7);
    c.lerp(tc.setRGB(0.1, 0.095, 0.09), sstep(-0.15, 0.45, ny + (n2 - 0.5) * 0.5) * (o.saddle ?? 0.95));
    c.lerp(tc.setRGB(1.0, 0.9, 0.72), sstep(0.05, -0.65, ny + (n2 - 0.5) * 0.3) * (o.cream ?? 0.9));
    if (o.fx) c.lerp(tc.setRGB(0.12, 0.1, 0.09), sstep(0.35, 0.8, nz) * o.fx);        // dark leg fronts
    if (o.dark) c.multiplyScalar(o.dark);
    c.multiplyScalar(0.8 + 0.4 * n2);
    c.r *= c.r; c.g *= c.g; c.b *= c.b; c.multiplyScalar(1.7);          // sRGB-ish authoring -> linear vertex colours
  };

  // ------------------------------------------------------------------ torso: deep narrow chest, tucked waist, sloped back
  const pelvisF = U(0.08, mirX(sdf.ell(0.13, -0.07, -0.06, 0.12, 0.21, 0.25)), sdf.ell(0, 0.0, -0.08, 0.16, 0.19, 0.3), sdf.cap([0, -0.08, 0.05], [0, -0.1, 0.55], 0.1, 0.13), sdf.cap([0, 0.12, -0.2], [0, 0.14, 0.45], 0.075, 0.09), sdf.sphere(0, -0.01, -0.3, 0.11));
  S(pelvis, pelvisF, [-0.35, -0.45, -0.5], [0.35, 0.4, 0.8], 0.026, coat({ cream: 0.8 }));
  const chestF = U(0.08, sdf.ell(0, -0.06, 0.0, 0.17, 0.3, 0.38), sdf.ell(0, 0.17, 0.1, 0.1, 0.1, 0.22), mirX(sdf.ell(0.12, -0.05, 0.12, 0.07, 0.2, 0.17, [0, 0, 0.1])), sdf.ell(0, -0.26, 0.16, 0.11, 0.11, 0.2), sdf.cap([0, 0, -0.3], [0, 0, 0.25], 0.13, 0.15), sdf.cap([0, 0.04, 0.2], [0, 0.1, 0.4], 0.1, 0.085));
  const chestCol = (x, y, z, nx, ny, nz, ao, c) => { coat({ cream: 1.0 })(x, y, z, nx, ny, nz, ao, c); const sc1 = sstep(0.01, 0.003, Math.abs((x - 0.17) * 0.6 + (y - 0.04) * 0.8)) * (x > 0.1 ? 1 : 0) * sstep(0.25, 0.1, Math.abs(z - 0.1)); c.lerp(tc.setRGB(0.9, 0.7, 0.62), sc1 * 0.7); };
  const chestG = S(chest, chestF, [-0.35, -0.55, -0.5], [0.35, 0.5, 0.65], 0.026, chestCol);
  const neckF1 = U(0.07, sdf.cap([0, -0.02, -0.12], [0, 0.0, 0.28], 0.1, 0.075), sdf.ell(0, 0.03, 0.05, 0.075, 0.09, 0.2), sdf.ell(0, -0.08, 0.1, 0.06, 0.06, 0.18));
  const neckG1 = S(neck1, neckF1, [-0.28, -0.3, -0.28], [0.28, 0.3, 0.45], 0.022, coat({ cream: 0.9, saddle: 0.6 }));
  const neckG2 = S(neck2, U(0.06, sdf.cap([0, -0.02, -0.08], [0, 0.0, 0.24], 0.08, 0.065), sdf.ell(0, -0.05, 0.08, 0.055, 0.06, 0.15)), [-0.25, -0.26, -0.2], [0.25, 0.26, 0.38], 0.02, coat({ cream: 0.9, saddle: 0.5 }));

  // ------------------------------------------------------------------ head: narrow skull, straight wedge muzzle (~45% of head length), flat bridge
  const hSkull = U(0.05, sdf.ell(0, 0.04, 0.06, 0.075, 0.085, 0.12), sdf.ell(0, 0.07, 0.01, 0.065, 0.07, 0.09));
  const hBrow = mirX(sdf.cap([0.06, 0.082, 0.1], [0.032, 0.07, 0.19], 0.02, 0.016));
  const hMuz = U(0.025, sdf.cap([0, 0.015, 0.16], [0, 0.0, 0.43], 0.05, 0.03), sdf.ell(0, -0.012, 0.32, 0.045, 0.03, 0.13));
  const hCheek = mirX(sdf.ell(0.055, -0.03, 0.05, 0.03, 0.05, 0.08));
  const hSock = mirX(sdf.ell(0.052, 0.052, 0.165, 0.02, 0.016, 0.026, [0, 0, 0.4]));
  const hNose = sdf.ell(0, 0.002, 0.45, 0.03, 0.022, 0.03);
  const hBase = U(0.02, U(0.035, hSkull, hBrow, hMuz, hCheek), hNose);
  const hFull = (x, y, z) => Math.max(hBase(x, y, z), -(y + 0.062), -hSock(x, y, z));
  const hCol = (x, y, z, nx, ny, nz, ao, c) => {
    coat({ cream: 0.7, saddle: 0.7 })(x, y, z, nx, ny, nz, ao, c);
    c.lerp(tc.setRGB(1.0, 0.92, 0.76), sstep(0.2, 0.36, z) * sstep(0.04, -0.01, y + 0.0) * 0.8);                // cream muzzle
    c.lerp(tc.setRGB(0.12, 0.1, 0.09), sstep(0.24, 0.34, z) * sstep(-0.005, 0.03, y) * 0.55);                    // dark bridge stripe
    c.multiplyScalar(1 - Math.exp(-(((Math.abs(x) - 0.052) / 0.03) ** 2 + ((y - 0.052) / 0.025) ** 2 + ((z - 0.165) / 0.05) ** 2)) * 0.6);
    c.lerp(tc.setRGB(0.02, 0.02, 0.02), sstep(0.42, 0.44, z));
  };
  const headG = S(head, hFull, [-0.2, -0.1, -0.12], [0.2, 0.2, 0.55], 0.011, hCol, { aoR: 1.4 });
  kit.add(head, new THREE.SphereGeometry(0.033, 18, 12), noseM, { p: [0, 0.0, 0.452], s: [1.0, 0.72, 0.8] });
  const jawF = (() => {
    const ram = mirX(sdf.cap([0.05, -0.012, 0.0], [0.026, -0.022, 0.36], 0.032, 0.02));
    const chin = sdf.ell(0, -0.022, 0.375, 0.03, 0.02, 0.04);
    return U(0.018, ram, chin, sdf.ell(0, -0.03, 0.2, 0.05, 0.03, 0.17));
  })();
  S(jaw, jawF, [-0.15, -0.12, -0.1], [0.15, 0.1, 0.5], 0.01, (x, y, z, nx, ny, nz, ao, c) => { coat({ cream: 1.0 })(x, y, z, nx, ny, nz, ao, c); c.lerp(tc.setRGB(1.0, 0.92, 0.76), 0.6); c.lerp(tc.setRGB(0.5, 0.1, 0.12), sstep(0.0, 0.02, y + 0.012) * sstep(0.3, 0.15, z) * 0.9); });
  // fangs: long canines, small incisors, carnassials; ivory, untextured
  const tooth = (jn, p, len, r, flip, ang = 0) => kit.add(jn, spike(len, r, { curve: 0.1, sides: 5, segs: 3, col0: 0x6a5a30, col1: 0xf4ecd0 }), fur, { p, r: [flip ? Math.PI : 0, 0, ang], untex: true });
  for (const s of [L, R]) {
    tooth(head, [s * 0.03, -0.062, 0.385], 0.062, 0.011, true, s * 0.1);
    tooth(jaw, [s * 0.025, 0.022, 0.35], 0.05, 0.009, false, s * -0.08);
    for (let i = 0; i < 3; i++) { tooth(head, [s * (0.01 + i * 0.01), -0.062, 0.42 - i * 0.004], 0.016, 0.0045, true); tooth(jaw, [s * (0.01 + i * 0.009), 0.022, 0.385 - i * 0.004], 0.014, 0.004, false); }
    for (let i = 0; i < 3; i++) { tooth(head, [s * 0.04, -0.062, 0.3 - i * 0.035], 0.024 - i * 0.003, 0.0075, true); tooth(jaw, [s * 0.034, 0.022, 0.29 - i * 0.035], 0.02, 0.0065, false); }
  }
  // eyes: amber, slanted under a heavy brow, hot glint
  for (const s of [L, R]) {
    const eg = new THREE.SphereGeometry(0.0185, 18, 14); const pp = eg.attributes.position; const col = new Float32Array(pp.count * 3); const em = new Float32Array(pp.count);
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i); const y = pp.getY(i); const z = pp.getZ(i); const rd = Math.hypot(x, y) / 0.0185; const fr = z > 0;
      tc.set(0xffd040).lerp(sc.set(0xe86a10), sstep(0.3, 0.9, rd)); let e = lerp(1.3, 0.5, sstep(0.2, 1, rd));
      if (fr && (x / 0.0042) ** 2 + (y / 0.0085) ** 2 < 1) { tc.setRGB(0.01, 0.005, 0); e = 0; }
      if (fr && Math.hypot(x - s * 0.006, y - 0.007) < 0.0028) { tc.setRGB(1, 1, 1); e = 2.6; }
      if (!fr) e = 0.3;
      col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b; em[i] = e;
    }
    eg.setAttribute('color', new THREE.BufferAttribute(col, 3)); eg.setAttribute('aEmber', new THREE.BufferAttribute(em, 1));
    kit.add(eyes, eg, eyeM, { p: [s * 0.05, 0.003, 0.0], r: [0.0, s * 0.55, s * -0.5] });
    kit.add(eyes, new THREE.SphereGeometry(0.023, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), fur, { p: [s * 0.05, 0.004, -0.002], r: [rad(-30), 0, s * rad(-35)], tint: 0x2a2623, untex: true });
  }
  // ears: tall, pointed, tilted forward; dark tips; a notch torn from the left one
  for (const [i, s] of [L, R].entries()) {
    const notch = i === 0 ? [{ u: 0.62, d: 0.5, w: 0.06, side: 1 }] : [];
    const g = leaf({ len: 0.24, halfW: (u) => 0.06 * Math.pow(1 - u, 0.9) * Math.min(1, 0.5 + u * 4), thick: 0.005, cup: 0.014, bend: 0.1, notch, jag: i === 0 ? 0.1 : 0.04, seed: seed + i, segU: 12, segV: 5, col: 0xffffff, edgeCol: 0x3a3430 });
    paintGeo(g, (x, y, z, c) => { c.setRGB(0.7, 0.6, 0.5); c.lerp(tc.setRGB(0.1, 0.08, 0.07), sstep(0.09, 0.2, y)); c.lerp(tc.setRGB(0.9, 0.78, 0.65), sstep(0.07, 0.0, y) * (z > 0 ? 0.5 : 0)); });
    kit.add(ear[s], g, fur, { r: [rad(14), s * rad(-6), s * rad(-14)] });
    const P = []; const C = []; for (let k = 0; k < 10; k++) { const u = 0.05 + rng() * 0.5; const w = 0.055 * (1 - u) * (rng() < 0.5 ? 1 : -1); pushTuft(P, C, new THREE.Vector3(w * 0.9, 0.24 * u, 0.004), new THREE.Vector3(0, 1, 0.2).normalize(), 0.025, 0.004, new THREE.Vector3(0, 0, -1), new THREE.Color(0.5, 0.45, 0.4), new THREE.Color(0.9, 0.82, 0.7)); }
    kit.add(ear[s], tuftGeo(P, C), fur, { r: [rad(14), s * rad(-6), s * rad(-14)] });
  }
  for (const s of [L, R]) kit.add(lip[s], new THREE.SphereGeometry(1, 14, 10), fur, { p: [0, 0.01, 0.0], s: [0.022, 0.022, 0.085], tint: 0xe6d6b8, untex: true });

  // ------------------------------------------------------------------ limbs: thin, long, digitigrade; big dark paws
  const legF = coat({ cream: 0.3, saddle: 0.3, fx: 0.7, dark: 0.85 });
  for (const s of [L, R]) {
    S(sh[s], U(0.04, sdf.cap([0, 0, 0], [0, -0.34, -0.05], 0.095, 0.062), sdf.ell(0, -0.06, 0.02, 0.085, 0.14, 0.12)), [-0.2, -0.5, -0.2], [0.2, 0.14, 0.2], 0.013, legF);
    S(el[s], U(0.025, sdf.cap([0, 0, 0], [0, -0.36, 0.04], 0.06, 0.038), sdf.sphere(0, 0, -0.03, 0.06)), [-0.15, -0.54, -0.15], [0.15, 0.1, 0.18], 0.011, legF);
    const toes = [-1, -0.35, 0.35, 1].map((t) => sdf.cap([t * 0.008, -0.04, 0.05], [t * 0.03, -0.062, 0.15 - Math.abs(t) * 0.012], 0.028, 0.022));
    S(wr[s], U(0.02, sdf.cap([0, 0, 0], [0, -0.05, 0.05], 0.032, 0.04), sdf.ell(0, -0.045, 0.08, 0.06, 0.04, 0.1), ...toes), [-0.14, -0.2, -0.1], [0.14, 0.04, 0.28], 0.009, (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.1, 0.085, 0.075).multiplyScalar(0.8 + 0.4 * ao); });
    for (const t of [-1, -0.35, 0.35, 1]) kit.add(wr[s], spike(0.04, 0.008, { curve: -0.3, col0: 0x1a1612, col1: 0x6a5c48 }), fur, { p: [t * 0.03, -0.065, 0.152 - Math.abs(t) * 0.012], r: [rad(95), 0, t * -0.1], untex: true });
    // hind: slim thigh with a visible muscle, angled shin, long hock, big paw
    S(hp[s], U(0.05, sdf.cap([0, 0, 0], [0, -0.27, 0.18], 0.125, 0.068), sdf.ell(s * 0.015, -0.07, -0.02, 0.12, 0.2, 0.17)), [-0.25, -0.46, -0.28], [0.25, 0.16, 0.38], 0.014, legF);
    S(kn[s], U(0.03, sdf.cap([0, 0, 0], [0, -0.27, -0.23], 0.07, 0.04), sdf.sphere(0, 0, 0.0, 0.07)), [-0.14, -0.42, -0.4], [0.14, 0.1, 0.16], 0.011, legF);
    const toesH = [-1, -0.35, 0.35, 1].map((t) => sdf.cap([t * 0.008, -0.14, 0.06], [t * 0.03, -0.16, 0.14 - Math.abs(t) * 0.012], 0.028, 0.022));
    S(hk[s], U(0.02, sdf.cap([0, 0, 0], [0, -0.13, 0.05], 0.036, 0.034), sdf.ell(0, -0.15, 0.08, 0.06, 0.04, 0.1), sdf.sphere(0, 0.0, -0.02, 0.04), ...toesH), [-0.14, -0.28, -0.1], [0.14, 0.06, 0.26], 0.009, (x, y, z, nx, ny, nz, ao, c) => { const k = sstep(-0.1, 0.0, y); coat({ cream: 0.2, saddle: 0.2, dark: 0.85 })(x, y, z, nx, ny, nz, ao, c); c.lerp(tc.setRGB(0.1, 0.085, 0.075), 1 - k); });
    for (const t of [-1, -0.35, 0.35, 1]) kit.add(hk[s], spike(0.038, 0.008, { curve: -0.3, col0: 0x1a1612, col1: 0x6a5c48 }), fur, { p: [t * 0.03, -0.17, 0.142 - Math.abs(t) * 0.012], r: [rad(95), 0, t * -0.1], untex: true });
  }
  // bushy low tail
  const tailR = [0.075, 0.075, 0.07, 0.05];
  const tailF = (i) => sdf.cap([0, 0, 0], [0, i < 3 ? [-0.03, -0.07, -0.1][i] : -0.02, [-0.2, -0.18, -0.16, -0.22][i]], tailR[i], i < 3 ? tailR[i + 1] : 0.03);
  tail.forEach((j, i) => S(j, tailF(i), [-0.16, -0.25, -0.34], [0.16, 0.16, 0.12], 0.016, (x, y, z, nx, ny, nz, ao, c) => { coat({ cream: 0.3, saddle: 0.8 })(x, y, z, nx, ny, nz, ao, c); if (i === 3) c.lerp(tc.setRGB(0.1, 0.09, 0.08), 0.7); }));

  // ------------------------------------------------------------------ fur: shells + swept tufts only on neck, shoulders (chest) and tail
  const shellBody = (joint, f, min, max, col) => {
    const g0 = sculpt(f, { min, max, h: 0.06 * Q, color: col, aoK: 0.5, aoR: 3 });
    for (let k = 1; k <= 3; k++) {
      const g = g0.clone(); const p = g.attributes.position; const n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * k * 0.01, p.getY(i) + n.getY(i) * k * 0.01 - k * 0.003, p.getZ(i) + n.getZ(i) * k * 0.01);
      kit.add(joint, g, shellMats[k - 1]);
    }
  };
  shellBody(chest, chestF, [-0.35, -0.55, -0.5], [0.35, 0.5, 0.65], chestCol);
  shellBody(neck1, neckF1, [-0.28, -0.3, -0.28], [0.28, 0.3, 0.45], coat({ cream: 0.9, saddle: 0.6 }));
  const furSweep = (flow, len, n, r, joint, g, bend = 0.3) => {
    const pts = sampleSurface(g, Math.round(n * TUFT), rng); const P = []; const C = []; const d = new THREE.Vector3(); const bv = new THREE.Vector3(0, -1, 0);
    for (const q of pts) {
      flow(q.p, d); d.addScaledVector(q.n, 0.5).normalize(); const l = lerp(len[0], len[1], rng());
      pushTuft(P, C, q.p.clone().addScaledVector(q.n, -0.012), d, l, r * (0.7 + rng() * 0.6), bv.clone().multiplyScalar(0.5 + bend), q.c.clone().multiplyScalar(0.7), q.c.clone().multiplyScalar(1.3 + rng() * 0.3));
    }
    if (P.length) kit.add(joint, tuftGeo(P, C), fur);
  };
  const mane = (p, d) => d.set(0, 0.1, -1).normalize();
  furSweep(mane, [0.12, 0.26], 420, 0.009, neck1, neckG1, 0.5);
  furSweep(mane, [0.1, 0.22], 280, 0.009, neck2, neckG2, 0.5);
  furSweep((p, d) => d.set(0, -0.2, -1).normalize(), [0.07, 0.16], 220, 0.0085, chest, chestG, 0.4);
  furSweep((p, d) => d.set(0, 0.0, -1).normalize(), [0.04, 0.09], 90, 0.0055, head, headG);
  tail.forEach((j, i) => {
    const pr = sculpt(sdf.cap([0, 0, 0], [0, i < 3 ? [-0.03, -0.07, -0.1][i] : -0.02, [-0.2, -0.18, -0.16, -0.22][i]], tailR[i] + 0.012, i < 3 ? tailR[i + 1] + 0.012 : 0.04), { min: [-0.16, -0.25, -0.34], max: [0.16, 0.16, 0.12], h: 0.03 * Q, aoK: 0, color: (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.5, 0.43, 0.36); if (i === 3) c.multiplyScalar(0.3); else if (i < 2) c.multiplyScalar(0.6); } });
    furSweep((p, d) => d.set(0, -0.3, -1).normalize(), [0.08, 0.2], 130, 0.009, j, pr, 0.6);
  });
  // collar remnant: torn leather band with a snapped chain
  {
    const ring = sdf.eltorus(0, 0, 0.0, 0.14, 0.13, 0.016, [0.25, 0, 0]);
    S(neck1, (x, y, z) => Math.max(ring(x, y, z), -(sdf.box(0, -0.2, 0.0, 0.04, 0.1, 0.3)(x, y, z))), [-0.22, -0.22, -0.2], [0.22, 0.22, 0.2], 0.016, (x, y, z, nx, ny, nz, ao, c) => { c.setRGB(0.55, 0.4, 0.3).multiplyScalar(0.6 + 0.4 * (0.5 + 0.5 * NZ.n3(x * 30, y * 30, z * 30))); }, { mat: leather, aoK: 0.6 });
    for (let i = 0; i < 4; i++) kit.add(neck1, new THREE.TorusGeometry(0.012, 0.004, 5, 10), iron, { p: [0.04, -0.14 - i * 0.02, 0.05], r: [i % 2 ? Math.PI / 2 : 0, i % 2 ? 0 : Math.PI / 2, 0.3] });
  }

  // ------------------------------------------------------------------ anchors / build / IK
  contactShadow(a, 0.8, 1.4, 0.6);
  a.root.scale.setScalar(1.5); a.height = 1.15 * 1.5; a.radius = 1.1;
  a.anchor('head', head, 0, 0.3, 0.15);
  a.anchor('chest', chest, 0, 0.1, 0.22);
  a.anchor('feet', a.model, 0, 0.02, 0);
  a.anchor('mouth', jaw, 0, -0.01, 0.42);
  a.anchor('weapon', jaw, 0, -0.01, 0.42);
  a.anchor('handR', wr[R], 0, -0.06, 0.12);
  a.anchor('handL', wr[L], 0, -0.06, 0.12);
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
