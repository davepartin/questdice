// The arena kit: builds the shared stage (sky, ridge curtains, terrain, lights, fog, env, post look), owns
// the registries every place feeds (fires, glows, fog layers, shafts, decals, emitters) and turns them into
// a few instanced draw calls at finalize(). Moods are interpolated targets applied in update().
import * as THREE from 'three';
import { mulberry32, hashStr } from '../noise.js';
import { mat as libMat } from '../mats.js';
import { sprite } from '../tex.js';
import {
  makeUniforms, patchArena, instanced, QSCALE, CLEAR, lerp, rr, inClear, scatter, disposeTex,
} from './common.js';
import { makeSky, makeRidge } from './sky.js';
import { makeTerrain, waterMaterial } from './ground.js';
import { makeFlames, makeGlows, makeFogLayers, makeShafts, makeDecals, Emitter } from './fx.js';
import { Batch } from './props.js';
import { rockTex, charTex, texMat, hideTex, thatchTex } from './tex.js';

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export const MARKS = {
  hero: [-1.9, 0, 1.6],
  tray: { pos: [0, 0, 4.6], top: 0.9, size: [4.6, 4.6] },
  camera: { pos: [0.3, 3.7, 9.2], look: [0, 1.3, 0.5], fov: 40 },
  cameraPortrait: { pos: [0.3, 5.6, 14.2], look: [0, 1.5, 0.2], fov: 52 },
  clear: { ...CLEAR },
  monsters(n = 2, kind = 'standard') {
    if (kind !== 'standard' || n <= 1) return [[0.4, 0, -1.8]];
    if (n === 2) return [[-1.0, 0, -1.3], [1.7, 0, -1.8]];
    if (n === 3) return [[-2.2, 0, -1.1], [0.1, 0, -1.9], [2.4, 0, -1.3]];
    return [[-2.8, 0, -1.2], [-0.95, 0, -1.9], [0.95, 0, -1.9], [2.8, 0, -1.2]];
  },
};

// Mood targets (multipliers / blends against the place's calm palette).
const MOODS = {
  calm: { fire: 1, keyMix: 0, keyK: 1, rimK: 1, sky: [1, 1, 1], horMix: 0, storm: 0, ember: 1, bloom: 0, exp: 1, hemiK: 1, glowK: 1, tint: 0 },
  battle: { fire: 1.35, keyMix: 0.35, keyK: 1.22, rimK: 1.1, sky: [1.08, 0.96, 0.94], horMix: 0.12, storm: 0, ember: 1.9, bloom: 0.1, exp: 1.02, hemiK: 0.95, glowK: 1.25, tint: 0 },
  boss: { fire: 1.7, keyMix: 0.25, keyK: 1.15, rimK: 1.7, sky: [1.25, 0.72, 0.72], horMix: 0.55, storm: 1, ember: 3.0, bloom: 0.2, exp: 1.04, hemiK: 0.9, glowK: 1.7, tint: 0 },
  victory: { fire: 0.5, keyMix: 0.7, keyK: 1.18, rimK: 0.7, sky: [1.12, 1.05, 0.9], horMix: 0.65, storm: 0, ember: 0.45, bloom: 0.05, exp: 1.08, hemiK: 1.35, glowK: 0.8, tint: 1 },
  camp: { fire: 0.9, keyMix: 0.5, keyK: 0.85, rimK: 0.75, sky: [1.0, 0.92, 0.88], horMix: 0.15, storm: 0, ember: 0.7, bloom: 0.1, exp: 1.0, hemiK: 1.15, glowK: 0.95, tint: 0 },
};
const KEY_BATTLE = C(0xff8a3a); const KEY_VICTORY = C(0xffe0a6); const HOR_BOSS = C(0xb02418); const HOR_VICTORY = C(0xffb36a);

export function createCtx(stage, { place, kind, seed, quality, enemyCount }) {
  const q = QSCALE[quality] ?? 1;
  const rng = mulberry32((hashStr(`${place}|${kind}`) ^ (seed * 2654435761)) >>> 0);
  const U = makeUniforms(); U.uCrack = { value: 1 }; U.uFire = { value: 1 }; U.uStorm = { value: 0 };
  const group = new THREE.Group(); group.name = `arena:${place}`;
  const c = {
    stage, place, kind, seed, quality, q, rng, U, group, enemyCount,
    B: new Batch(), propMats: {}, hAt: () => 0, tris: 0,
    fires: [], flames: [], glows: [], fogLayers: [], shafts: [], blobs: [], scorches: [], emitters: [], ticks: [], lights: {}, fireLights: [],
    emberSources: [], smokeSources: [], fogFires: [], puddles: null, puddleOpts: {}, ambient: {}, smokeOpts: {}, extra: [], pal: null, mood: 'calm', disposers: [],
    n: (count) => Math.max(1, Math.round(count * q)),
    mats: new Map(),
  };
  // ------------------------------------------------------------------ materials
  c.arenaMat = (key, make, opts = {}, params = {}) => {
    if (c.mats.has(key)) return c.mats.get(key);
    const m = make(); Object.assign(m, params); patchArena(m, U, opts); c.mats.set(key, m); return m;
  };
  c.libMat = (name, o = {}, opts = {}, params = {}) => c.arenaMat(`lib|${name}|${JSON.stringify(o)}|${JSON.stringify(opts)}|${JSON.stringify(params)}`, () => libMat(name, o).clone(), opts, params);
  c.add = (obj) => { group.add(obj); return obj; };
  c.addInstanced = (geo, material, items, o = {}) => {
    const m = instanced(geo, material, items, o); group.add(m);
    c.tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * items.length; return m;
  };
  // ------------------------------------------------------------------ fire & light registries
  c.fire = ({ p, w = 0.9, h = 1.6, power = 1, light = false, lightColor = 0xff7a30, lightI = 28, lightDist = 14, embers = 14, smoke = 0, seedOff = 0, glow = 1, tongues = 3 }) => {
    const s = rng() * 100 + seedOff;
    w *= 1.5;
    c.flames.push({ p: [p[0], p[1], p[2]], w, h, seed: s, power });
    for (let i = 0; i < tongues; i++) {
      const a = (i / tongues) * 6.28 + rng();
      c.flames.push({ p: [p[0] + Math.cos(a) * w * 0.28, p[1], p[2] + Math.sin(a) * w * 0.28], w: w * rr(rng, 0.55, 0.8), h: h * rr(rng, 0.6, 0.85), seed: s + i * 3.3 + 1, power: power * 0.9 });
    }
    if (glow) {
      c.glows.push({ p: [p[0], p[1] + h * 0.4, p[2]], s: h * 2.2 * glow, c: 0xff7a2a, k: 0.5 * power, flick: 0.7, seed: s });
      c.glows.push({ p: [p[0], p[1] + h * 0.5, p[2]], s: h * 6 * glow, c: 0xff5a14, k: 0.1 * power, flick: 0.5, seed: s + 1 });
      c.glows.push({ p: [p[0], p[1] + h * 0.25, p[2]], s: h * 0.8, c: 0xffd890, k: 0.5 * power, flick: 0.9, seed: s + 2 });
    }
    if (embers) c.emberSources.push({ p: [p[0], p[1] + h * 0.5, p[2]], rate: embers * (0.5 + c.q * 0.5), h, w });
    if (smoke) c.smokeSources.push({ p: [p[0], p[1] + h * 0.9, p[2]], rate: smoke, size: Math.max(1.2, h * 0.9) });
    c.fogFires.push({ p: [p[0], p[1] + h * 0.4, p[2]], k: power * h * w, seed: s });
    if (light) {
      c.fires.push({ p: [p[0], p[1] + h * 0.55, p[2]], color: lightColor, I: lightI, dist: lightDist, seed: s, base: lightI });
    }
  };
  c.rock = (list) => list; // placeholder hook used by places
  c.hAtSafe = (x, z) => c.hAt(x, z);
  return c;
}

// ------------------------------------------------------------------------------------------------------
// Apply a palette: sky, fog, env (IBL), lights, post look, ground. Returns nothing; stores base values.
// ------------------------------------------------------------------------------------------------------
export function applyPalette(c, pal) {
  const { U, stage, group } = c;
  c.pal = pal;
  const s = pal.sky;
  U.uHor.value.set(s.hor); U.uMid.value.set(s.mid); U.uTop.value.set(s.top);
  const gl = U.uGP.value; const gc = U.uGC.value;
  for (let i = 0; i < 3; i++) {
    const g = s.glows[i];
    if (g) { gl[i].set(g.az * D2R, g.w * D2R, g.h * D2R, g.k ?? 1); gc[i].set(g.color); } else { gl[i].set(0, 0.5, 0.1, 0); gc[i].set(0x000000); }
  }
  c.baseGlowK = [0, 1, 2].map((i) => gl[i].w);
  const m = s.moon || { on: 0 };
  U.uMoonOn.value = m.on === undefined ? 1 : m.on;
  if (m.az !== undefined) U.uMoonDir.value.set(Math.sin(m.az * D2R) * Math.cos(m.el * D2R), Math.sin(m.el * D2R), -Math.cos(m.az * D2R) * Math.cos(m.el * D2R)).normalize();
  U.uMoonCol.value.set(m.color ?? 0xcfe0ff); U.uMoonSize.value = (m.size ?? 2) * D2R;
  U.uStars.value = s.stars ?? 0.7; U.uCloud.value = s.cloud ?? 0.55; U.uCloudDark.value.set(s.cloudDark ?? 0x1a1424); U.uCloudLit.value.set(s.cloudLit ?? 0xff7a40);
  const f = pal.fog;
  U.uFogBase.value.set(f.base); U.uFogDens.value = f.dens; U.uFogFall.value = f.fall ?? 0.22; U.uFogHeight.value = f.height ?? 0.65; U.uFogGlow.value = f.glow ?? 0.5;
  stage.scene.fog = new THREE.FogExp2(f.base, f.dens);
  stage.scene.background = C(s.hor).multiplyScalar(0.5);
  c.horBase = C(s.hor); c.baseSkyMul = new THREE.Color(1, 1, 1);
  // IBL
  stage.environment(pal.env);
  // lights
  const key = new THREE.DirectionalLight(pal.key.color, pal.key.intensity);
  const kp = pal.key.pos; const tgt = new THREE.Object3D(); tgt.position.set(0, 0, 0.8);
  key.position.set(kp[0] * 2.6, kp[1] * 2.6, kp[2] * 2.6 + 0.8); key.target = tgt;
  key.castShadow = true; const sz = c.quality === 'low' ? 1024 : 2048;
  key.shadow.mapSize.set(sz, sz);
  const sc = key.shadow.camera; sc.left = -9.5; sc.right = 9.5; sc.top = 9.5; sc.bottom = -9.5; sc.near = 2; sc.far = 60;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.035; key.shadow.radius = 3.5; key.shadow.blurSamples = 12;
  const rim = new THREE.DirectionalLight(pal.rim.color, pal.rim.intensity); rim.position.set(...pal.rim.pos); rim.target = tgt;
  const hemi = new THREE.HemisphereLight(pal.hemi.sky, pal.hemi.ground, pal.hemi.intensity);
  group.add(key, tgt, rim, hemi);
  c.lights = { key, rim, hemi, tgt, keyBase: C(pal.key.color), keyI: pal.key.intensity, rimI: pal.rim.intensity, hemiI: pal.hemi.intensity };
  // post
  stage.post.look(pal.look);
  c.lookBase = { ...pal.look };
}

// ------------------------------------------------------------------------------------------------------
// Terrain + ridges + sky
// ------------------------------------------------------------------------------------------------------
export function buildBackdrop(c, { ground, ridges = [] }) {
  const { U } = c;
  const sky = makeSky(U); c.add(sky); c.skyMesh = sky;
  for (const r of ridges) c.add(makeRidge(U, r));
  const t = makeTerrain(U, ground, c.quality);
  c.hAt = t.hAt; c.tris += t.tris; c.add(t.mesh); c.terrain = t;
  c.groundCfg = ground;
}

// Standard prop material table; places can override entries before finalize().
export function defaultPropMats(c, o = {}) {
  const { U } = c;
  const P = c.propMats;
  const vc = { vertexColors: true };
  P.wood = c.libMat('woodDark', { tint: o.wood ?? 0x5a3a22, dark: 0x180e06 }, {}, vc);
  P.woodChar = P.charWood = c.arenaMat('woodChar', () => texMat(charTex({ glow: o.charGlow ?? 0.45 }), { repeat: 1, emissiveIntensity: 1.2, vertexColors: true }), {}, {});
  P.stone = c.arenaMat('stone', () => texMat(rockTex({ tint: o.stone ?? 0x77726a, dark: 0x1e1c1a, seed: 4 }), { repeat: 1, vertexColors: true }), {});
  P.stoneDark = c.arenaMat('stoneDark', () => texMat(rockTex({ tint: o.stoneDark ?? 0x58544e, dark: 0x14120f, seed: 8 }), { repeat: 1, vertexColors: true }), {});
  P.iron = c.libMat('iron', { tint: 0x5c6066, dark: 0x1c1e22 }, {}, { vertexColors: true, roughness: 0.7 });
  P.bone = c.libMat('bone', {}, {}, vc);
  P.boneDark = new THREE.MeshBasicMaterial({ color: 0x0a0806, vertexColors: false });
  P.cloth = c.libMat('clothBlack', {}, {}, { ...vc, side: THREE.DoubleSide });
  P.hide = c.arenaMat('hide', () => texMat(hideTex({ tint: o.hide ?? 0x6a4a30 }), { repeat: 1, vertexColors: true, side: THREE.DoubleSide }), {});
  P.gold = c.libMat('gold', {}, {}, { vertexColors: true, roughness: 0.38 });
  P.thatch = c.arenaMat('thatch', () => texMat(thatchTex({ tint: o.thatch ?? 0x6a5a30 }), { repeat: 1, vertexColors: true }), {});
  P.ember = c.arenaMat('emberBlack', () => new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: 0.8, vertexColors: true, emissive: 0xff4a10, emissiveIntensity: 0.25 }), {});
  P.emit = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, 0.35), vertexColors: true, fog: false });
  P.rope = c.libMat('leatherDark', {}, {}, vc);
  Object.assign(P, o.override || {});
}

// ------------------------------------------------------------------------------------------------------
// Finalize: flames, glows, fog layers, lights, particles, decals, props; returns the Arena object.
// ------------------------------------------------------------------------------------------------------
export function finalize(c, opts = {}) {
  const { stage, U, group, q } = c;
  // ---- props
  c.B.finalize(c.propMats, group); c.tris += c.B.tris;
  // ---- contact blobs at the staging marks (always) + whatever places added
  const marks = [{ p: [MARKS.hero[0], MARKS.hero[2]], s: [1.5, 1.2], a: 0.9, y: c.hAt(MARKS.hero[0], MARKS.hero[2]) }];
  for (const m of MARKS.monsters(c.enemyCount, c.kind)) marks.push({ p: [m[0], m[2]], s: c.kind === 'standard' ? [1.6, 1.3] : [3.0, 2.4], a: 0.9, y: 0 });
  c.add(makeDecals(U, [...marks, ...c.blobs], { kind: 'blob', opacity: 0.6 }));
  if (c.scorches.length) c.add(makeDecals(U, c.scorches, { kind: 'scorch', color: 0x050403, opacity: 0.85, lift: 0.012 }));
  if (c.puddles && c.puddles.length) {
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const pm = waterMaterial(U, c.puddleOpts, 'PUDDLE');
    const items = c.puddles.map(([x, z, r]) => ({ p: [x, c.hAt(x, z) + 0.014, z], r: c.rng() * 6.28, s: [r * 2.6, 1, r * 2] }));
    const pmesh = instanced(geo, pm, items); pmesh.renderOrder = 2; pmesh.name = 'puddles'; c.add(pmesh);
  }
  // ---- fire visuals
  const fl = makeFlames(U, c.flames); c.add(fl); c.tris += c.flames.length * 2;
  const gl = makeGlows(U, c.glows); c.add(gl);
  // ---- point lights (cap at 3: the strongest / first registered)
  c.fireLights = [];
  c.fires.slice(0, 3).forEach((f) => {
    const L = new THREE.PointLight(f.color, f.I, f.dist, 1.6); L.position.set(...f.p); L.userData = f; group.add(L); c.fireLights.push(L);
  });
  // fire positions for fog lighting
  c.fireP = U.uFireP.value; c.fireCol = U.uFireCol.value;
  c.fogTop = c.fogFires.sort((a, b) => b.k - a.k).slice(0, 4);
  c.fogTop.forEach((f, i) => c.fireP[i].set(f.p[0], f.p[1], f.p[2], 0.35));
  const fogMeshes = makeFogLayers(U, c.fogLayers); fogMeshes.forEach((m) => c.add(m));
  if (c.shafts.length) { c.shaftMesh = makeShafts(U, c.shafts, c.shaftOpts || {}); c.add(c.shaftMesh); }
  // ---- particle emitters (embers, ash, smoke, + place specific)
  const rngP = mulberry32(c.seed * 977 + 13);
  const pickSrc = (list) => list[Math.floor(rngP() * list.length)];
  if (c.emberSources.length || opts.ambientEmbers !== false) {
    const total = c.emberSources.reduce((a, s) => a + s.rate, 0) || 1;
    const ambient = (opts.ambientEmbers ?? 6) * (0.4 + q * 0.6);
    c.embers = new Emitter(stage, group, {
      max: Math.round(520 * (0.4 + q * 0.6)), sprite: 'dot', blending: 'add', gravity: 0.1, order: 9, rate: total + ambient,
      spawn: () => {
        let px; let py; let pz; let up = 0.9;
        if (c.emberSources.length && rngP() < total / (total + ambient)) {
          let r = rngP() * total; let s = c.emberSources[0];
          for (const e of c.emberSources) { r -= e.rate; if (r <= 0) { s = e; break; } }
          px = s.p[0] + (rngP() - 0.5) * s.w; py = s.p[1] + (rngP() - 0.5) * s.h * 0.4; pz = s.p[2] + (rngP() - 0.5) * s.w; up = 0.8 + s.h * 0.35;
        } else { px = rr(rngP, -16, 16); py = rr(rngP, 0.1, 1.2); pz = rr(rngP, -16, 8); up = 0.4; }
        const hot = rngP();
        return {
          pos: [px, py, pz], vel: [(rngP() - 0.3) * 0.6 + (opts.wind ?? 0.5), up * (0.5 + rngP() * 0.9), (rngP() - 0.5) * 0.5], life: 2.5 + rngP() * 3.5,
          size: 0.025 + rngP() * 0.05, sizeEnd: 0.008, color: hot > 0.7 ? 0xffd070 : 0xff8a2a, colorEnd: 0xff2a08, alpha: 0.95, alphaEnd: 0, turbulence: 1.6 + rngP() * 1.5, drag: 0.15, gravity: 0.05,
        };
      },
    });
    c.emitters.push(c.embers);
  }
  const ashRate = (opts.ash ?? 14) * (0.3 + q * 0.7);
  if (ashRate > 0) {
    c.ash = new Emitter(stage, group, {
      max: Math.round(520 * (0.3 + q * 0.7)), sprite: 'dot', blending: 'normal', gravity: -0.08, order: 4, rate: ashRate,
      spawn: () => ({
        pos: [rr(rngP, -14, 14), rr(rngP, 3.5, 8), rr(rngP, -14, 8)], vel: [(rngP() - 0.2) * 0.5 + (opts.wind ?? 0.5), -0.1 - rngP() * 0.25, (rngP() - 0.5) * 0.3],
        life: 8 + rngP() * 6, size: 0.004, sizeEnd: 0.03 + rngP() * 0.04, color: opts.ashColor ?? 0x7a7470, colorEnd: opts.ashColor ?? 0x7a7470, alpha: 0.85, alphaEnd: 0.1, turbulence: 0.9, drag: 0.2, gravity: -0.06, spin: 1,
      }),
    });
    c.emitters.push(c.ash);
  }
  if (c.smokeSources.length) {
    const total = c.smokeSources.reduce((a, s) => a + s.rate, 0);
    c.smoke = new Emitter(stage, group, {
      max: Math.round(130 * (0.4 + q * 0.6)), sprite: 'smoke', blending: 'normal', order: 3, rate: total, depthTest: true,
      spawn: () => {
        let r = rngP() * total; let s = c.smokeSources[0];
        for (const e of c.smokeSources) { r -= e.rate; if (r <= 0) { s = e; break; } }
        return {
          pos: [s.p[0] + (rngP() - 0.5) * s.size * 0.3, s.p[1], s.p[2] + (rngP() - 0.5) * s.size * 0.3], vel: [0.25 + rngP() * 0.4, 1.0 + rngP() * 0.7, (rngP() - 0.5) * 0.2],
          life: 9 + rngP() * 5, size: s.size * 0.8, sizeEnd: s.size * 4.2, color: opts.smokeCol ?? 0xff6a2a, colorEnd: opts.smokeEnd ?? 0x2a2230, alpha: 0.5, alphaEnd: 0.0, rot: rngP() * 6, spin: (rngP() - 0.5) * 0.3, drag: 0.1, turbulence: 0.5,
        };
      },
    });
    c.emitters.push(c.smoke);
  }
  for (const e of c.extra) c.emitters.push(e);
  // ---- shadows: every prop mesh near the field already flagged; ensure sky etc. do not cast
  group.traverse((o) => { if (o.isMesh && (o.name === 'sky' || o.name === 'ridge')) { o.castShadow = false; o.receiveShadow = false; } });
  stage.scene.add(group);
  c.fireVecs = c.fireP;
}

export function makeArenaObject(c, marksOverride = {}) {
  const { stage, U, lights, group } = c;
  const cur = { ...MOODS.calm, sky: [...MOODS.calm.sky] };
  let target = MOODS.calm;
  const tmpC = new THREE.Color();
  let simT = 0; let warmed = false;
  const scaleFor = () => (stage.height * stage.dpr) / (2 * Math.tan((stage.camera.fov * Math.PI) / 360));

  function applyMood(dt) {
    const k = dt >= 1 ? 1 : 1 - Math.exp(-1.6 * dt);
    for (const key of Object.keys(MOODS.calm)) {
      if (key === 'sky') for (let i = 0; i < 3; i++) cur.sky[i] += (target.sky[i] - cur.sky[i]) * k;
      else cur[key] += (target[key] - cur[key]) * k;
    }
    U.uFire.value = cur.fire; U.uStorm.value = cur.storm;
    U.uSkyMul.value.set(cur.sky[0], cur.sky[1], cur.sky[2]);
    // key colour: base -> battle orange or victory gold
    const warmTarget = target === MOODS.victory ? KEY_VICTORY : KEY_BATTLE;
    lights.key.color.copy(lights.keyBase).lerp(warmTarget, cur.keyMix);
    lights.key.intensity = lights.keyI * cur.keyK;
    lights.rim.intensity = lights.rimI * cur.rimK;
    lights.hemi.intensity = lights.hemiI * cur.hemiK;
    U.uHor.value.copy(c.horBase).lerp(target === MOODS.victory ? HOR_VICTORY : HOR_BOSS, cur.horMix);
    const gp = U.uGP.value; for (let i = 0; i < 3; i++) gp[i].w = c.baseGlowK[i] * cur.glowK;
    U.uCrack.value = cur.fire;
    c.stage.post.look({ bloom: (c.lookBase.bloom ?? 0.8) + cur.bloom, exposure: (c.lookBase.exposure ?? 1) * cur.exp });
    if (c.shaftMesh) c.shaftMesh.material.uniforms.uMood.value = target === MOODS.victory ? 1.5 : 1;
    for (const e of c.emitters) if (e === c.embers) e.mul = cur.ember; else if (e === c.smoke) e.mul = 0.6 + 0.4 * cur.fire;
  }
  const flicker = (t, s) => 0.78 + 0.14 * Math.sin(t * 9.1 + s * 3.0) + 0.1 * Math.sin(t * 17.3 + s * 7.0) * Math.sin(t * 3.1 + s) + 0.08 * Math.sin(t * 31 + s * 11);

  function sim(dt, t) {
    U.uTime.value = t;
    applyMood(dt);
    for (const L of c.fireLights) { const f = L.userData; L.intensity = f.base * flicker(t, f.seed) * cur.fire; }
    c.fireP.forEach((v, i) => { const f = c.fogTop[i]; if (f) v.w = 0.35 * flicker(t, f.seed) * cur.fire; });
    const scale = scaleFor();
    for (const e of c.emitters) e.step(dt, e.rngRef || c.rngSim, scale);
    for (const fn of c.ticks) fn(dt, t, cur);
    // ash fade-in handled by alpha ramp in spawn: patch alpha after emission
  }
  c.rngSim = mulberry32(c.seed * 31 + 7);
  const arena = {
    group, marks: { ...MARKS, ...marksOverride, monsters: (n = c.enemyCount, kind = c.kind) => MARKS.monsters(n, kind) },
    place: c.place, kind: c.kind, stats: () => stats(c),
    update(dt, t) {
      if (!warmed) { warmed = true; arena.warm(); }
      sim(dt, t);
    },
    warm(seconds = 6) {
      // pre-simulate so particles / smoke are already established on the first frame
      const old = U.uTime.value; const step = 0.1;
      for (let s = 0; s < seconds / step; s++) sim(step, old - seconds + s * step);
      U.uTime.value = old; warmed = true;
    },
    setMood(m = 'calm') { target = MOODS[m] || MOODS.calm; c.mood = m; if (!arena._moodSet) { arena._moodSet = true; } },
    setMoodNow(m) { target = MOODS[m] || MOODS.calm; applyMood(10); },
    dispose() {
      for (const e of c.emitters) e.dispose();
      group.traverse((o) => { o.geometry?.dispose?.(); });
      group.removeFromParent();
      for (const m of c.mats.values()) m.dispose?.();
      stage.scene.fog = null;
      c.disposers.forEach((fn) => fn());
    },
  };
  return arena;
}

export function stats(c) {
  let tris = 0; let calls = 0; let lightsN = 0; let shadowCasters = 0; const list = [];
  c.group.traverse((o) => {
    if (o.isLight) lightsN++;
    if (!(o.isMesh || o.isPoints)) return;
    if (o.visible === false) return;
    calls++;
    if (o.isPoints) return;
    const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
    list.push([o.name || o.type, Math.round(n * (o.isInstancedMesh ? o.count : 1)), o.castShadow ? 'cast' : '']);
    if (o.castShadow) shadowCasters++;
  });
  list.sort((a, b) => b[1] - a[1]);
  return { tris: Math.round(tris), drawCalls: calls, shadowCasters, lights: lightsN, top: list.slice(0, 8) };
}
