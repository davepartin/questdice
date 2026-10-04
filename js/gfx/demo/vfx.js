// VFX viewer: a dummy hero and three monster stand-ins on a dark stone floor, plus a catalogue of canned
// effects. Usage:
//   dev/viewer.html?m=gfx/demo/vfx.js&fx=slash&view=game|close|hero|mon
// Then in --seq:  {"eval":"__qd.fire('slash')","advance":0.1,"shot":"a.png"}
// window.__qd.vfx is the library, __qd.fire(name, opts) plays a preset, __qd.dt sets the step size used by
// advance() (default 1/30) so fast effects can be sampled at e.g. 1/120 s.
import * as THREE from 'three';
import { createVfx } from '../vfx.js';
import { mat } from '../mats.js';
import { createActor } from '../actors/index.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function dummyFigure({ h = 1.8, color = 0x7a8a5a, kind = 'monster', shield = false, horns = false }) {
  const g = new THREE.Group(); const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.2, h * 0.38, 6, 16), kind === 'hero' ? dark : skin); body.position.y = h * 0.52; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.13, 20, 14), kind === 'hero' ? dark : skin); head.position.set(0, h * 0.88, h * 0.03); g.add(head);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.07, h * 0.3, 4, 10), kind === 'hero' ? dark : skin); leg.position.set(s * h * 0.1, h * 0.2, 0); g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.055, h * 0.28, 4, 10), kind === 'hero' ? dark : skin); arm.position.set(s * h * 0.27, h * 0.55, 0); arm.rotation.z = s * 0.15; g.add(arm);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(h * 0.02, 8, 6), new THREE.MeshBasicMaterial({ color: kind === 'hero' ? 0x9fd8ff : 0xffd23d })); eye.position.set(s * h * 0.05, h * 0.9, h * 0.14); g.add(eye);
    if (horns) { const hn = new THREE.Mesh(new THREE.ConeGeometry(h * 0.04, h * 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.6 })); hn.position.set(s * h * 0.1, h * 1.02, 0); hn.rotation.z = -s * 0.5; g.add(hn); }
  }
  if (shield) {
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.2, h * 0.2, h * 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x4a5870, metalness: 1, roughness: 0.35 }));
    sh.rotation.x = Math.PI / 2; sh.rotation.z = 0.3; sh.position.set(h * 0.34, h * 0.55, h * 0.12); g.add(sh);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(h * 0.04, h * 0.5, h * 0.015), new THREE.MeshStandardMaterial({ color: 0xc8d0dc, metalness: 1, roughness: 0.2 })); sw.position.set(-h * 0.34, h * 0.78, h * 0.1); sw.rotation.x = 0.3; g.add(sw);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export async function demo({ stage, stdLights, cam, params, num }) {
  stage.scene.fog = new THREE.FogExp2(0x0a0c14, 0.018);
  stdLights({ floor: false });
  // floor: dark carved stone
  const floorM = mat('stoneDark', { repeat: [9, 9], color: 0x9a9690 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.scene.add(floor);
  // warm ember glow low behind the monsters, cold rim: so bloom has context
  const back = new THREE.PointLight(0xff8a3a, 30, 14, 2); back.position.set(0.5, 1.4, -4.5); stage.scene.add(back);

  const view = params.get('view') || 'game';
  if (view === 'close') cam([0.4, 1.9, 4.6], [0.1, 1.2, -0.6], 38);
  else if (view === 'hero') cam([-0.5, 1.9, 5.2], [-1.9, 1.1, 1.6], 40);
  else if (view === 'mon') cam([1.6, 1.8, 3.6], [1.2, 1.2, -1.6], 40);
  else if (view === 'top') cam([0.3, 7.5, 6.5], [0, 0, 0.5], 40);
  else if (view === 'phone') cam([0.3, 4.6, 12.2], [0, 1.4, 0.2], 40);
  else cam([0.3, 3.7, 9.2], [0, 1.3, 0.5], 40);
  if (view === 'phone') stage.resize?.(540, 960);

  // actors (stand-ins unless ?actors=1 and the real modules exist)
  const useReal = params.has('actors');
  const heroPos = V(-1.9, 0, 1.6);
  const specs = [
    { id: 'goblin', pos: V(-0.3, 0, -1.5), h: 1.25, color: 0x6f8f3a },
    { id: 'cultist', pos: V(1.25, 0, -1.7), h: 1.7, color: 0x5a3a6a },
    { id: 'ogre', pos: V(3.0, 0, -1.9), h: 2.7, color: 0x9a8a5a, horns: true },
  ];
  const mons = [];
  let hero;
  const face = (o, from, to) => { o.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); };
  if (useReal) {
    try {
      hero = await createActor('hero', { cls: 'knight', quality: stage.quality });
      hero.root.position.copy(heroPos); face(hero.root, heroPos, specs[0].pos); stage.scene.add(hero.root);
      stage.onFrame((dt, t) => hero.update(dt, t));
      for (const s of specs) { const a = await createActor(s.id, { quality: stage.quality }); a.root.position.copy(s.pos); face(a.root, s.pos, heroPos); stage.scene.add(a.root); stage.onFrame((dt, t) => a.update(dt, t)); mons.push(a); }
    } catch (e) { console.warn('real actors failed', e); }
  }
  if (!hero) {
    const h = dummyFigure({ h: 1.85, kind: 'hero', shield: true }); h.position.copy(heroPos); face(h, heroPos, specs[0].pos); stage.scene.add(h);
    hero = { root: h, height: 1.85, radius: 0.5, worldAnchor(name, out = new THREE.Vector3()) { return out.set(heroPos.x, name === 'feet' ? 0.02 : name === 'head' ? 2.1 : name === 'mouth' ? 1.65 : 1.15, heroPos.z); } };
    for (const s of specs) {
      const g = dummyFigure({ h: s.h, color: s.color, horns: s.horns }); g.position.copy(s.pos); face(g, s.pos, heroPos); stage.scene.add(g);
      const a = { root: g, height: s.h, radius: s.h * 0.3, kill() { g.visible = false; }, revive() { g.visible = true; }, worldAnchor(name, out = new THREE.Vector3()) { return out.set(s.pos.x, name === 'feet' ? 0.02 : name === 'head' ? s.h * 1.1 : name === 'mouth' ? s.h * 0.85 : s.h * 0.55, s.pos.z); } };
      mons.push(a);
    }
  }
  const vfx = createVfx(stage);
  stage.post.look({ bloom: Number(params.get('bloom') || 0.5) });

  // deterministic, controllable stepping: __qd.dt is the step used by advance()
  const q = window.__qd; q.dt = 1 / 30;
  const dtNow = () => (q.ready ? q.dt : 0.0001);
  const step0 = stage.step.bind(stage);
  stage.step = (f = 1, dt = dtNow()) => step0(f, dt);
  stage.advance = (sec, dt = dtNow()) => step0(Math.max(1, Math.round(sec / dt)), dt);
  q.vfx = vfx; q.hero = hero; q.mons = mons;

  const M = (i) => mons[i].worldAnchor('chest', new THREE.Vector3());
  const H = () => hero.worldAnchor('chest', new THREE.Vector3());
  const heroFeet = () => hero.worldAnchor('feet', new THREE.Vector3());
  const handR = () => H().add(V(0.3, 0.1, 0.4));
  const diceCenter = V(-0.6, 0.15, 1.2);
  const PRE = {
    slash: (o) => vfx.slash(M(0), o),
    slash2: (o) => vfx.slash(M(1), { dir: -2.4, ...o }),
    claw: (o) => vfx.slash(H(), { kind: 'claw', ...o }),
    blunt: (o) => vfx.slash(heroFeet().add(V(0, 0.2, 0)), { kind: 'blunt', size: 1.2, ...o }),
    'impact:flesh': (o) => vfx.impact(M(0), { kind: 'flesh', dir: V(1, 0.2, -1), ...o }),
    'impact:steel': (o) => vfx.impact(M(1), { kind: 'steel', dir: V(1, 0.2, -1), ...o }),
    'impact:stone': (o) => vfx.impact(mons[2].worldAnchor('feet').add(V(0, 0.3, 0.6)), { kind: 'stone', ...o }),
    'impact:shield': (o) => vfx.impact(H().add(V(0.6, 0, -0.3)), { kind: 'shield', ...o }),
    'impact:magic': (o) => vfx.impact(M(0), { kind: 'magic', ...o }),
    'impact:pierce': (o) => vfx.impact(M(1), { kind: 'pierce', dir: V(1, 0.1, -1), ...o }),
    arrow: (o) => vfx.projectile(handR(), M(0), { kind: 'arrow', ...o }),
    dagger: (o) => vfx.projectile(handR(), M(1), { kind: 'dagger', ...o }),
    fireball: (o) => vfx.projectile(handR().add(V(0, 0.3, 0)), M(1), { kind: 'fireball', ...o }),
    bomb: (o) => vfx.projectile(mons[0].worldAnchor('chest').add(V(0, 0.4, 0.3)), H().add(V(0, -0.8, 0)), { kind: 'bomb', ...o }),
    bolt: (o) => vfx.projectile(handR(), M(0), { kind: 'bolt', ...o }),
    bone: (o) => vfx.projectile(M(1), H(), { kind: 'bone', ...o }),
    'proj:pierce': (o) => vfx.projectile(handR(), M(1), { kind: 'pierce', ...o }),
    'proj:magic': (o) => vfx.projectile(handR(), M(0), { kind: 'magic', ...o }),
    beam: (o) => vfx.beam(handR(), M(1), { kind: 'pierce', ...o }),
    'beam:magic': (o) => vfx.beam(handR(), M(0), { kind: 'magic', ...o }),
    lightning: (o) => vfx.lightning(null, M(0), o),
    nova: (o) => vfx.nova(H().add(V(0, -0.5, 0)), o),
    shield: (o) => { const s = vfx.shield(H(), o); setTimeout(() => {}, 0); q.lastShield = s; return s; },
    'shield:guard': (o) => vfx.shield(M(1), { guard: true, radius: 1.5, ...o }),
    heal: (o) => vfx.heal(H(), o),
    magicGain: (o) => vfx.magicGain(H(), { toScreen: [1180, 50], ...o }),
    pierceGain: (o) => vfx.pierceGain(H(), { toScreen: [1180, 110], ...o }),
    goldGain: (o) => vfx.goldGain(M(0), o),
    windup: (o) => vfx.aura(mons[2], { kind: 'windup', radius: 2.6, ...o }),
    rage: (o) => vfx.aura(mons[2], { kind: 'rage', radius: 1.6, ...o }),
    hex: (o) => vfx.aura(diceCenter, { kind: 'hex', radius: 1.4, y: 0.5, ...o }),
    howl: (o) => vfx.aura(mons[1], { kind: 'howl', radius: 1.2, ...o }),
    summon: (o) => vfx.aura(V(-1.2, 0, -3.0), { kind: 'summon', radius: 1.1, ...o }),
    drain: (o) => vfx.aura(M(1), { kind: 'drain', from: H(), ...o }),
    mend: (o) => vfx.aura(mons[1], { kind: 'mend', radius: 1.0, ...o }),
    buff: (o) => vfx.aura(hero, { kind: 'buff', radius: 1.0, ...o }),
    shockwave: (o) => vfx.shockwave(V(1.2, 0, -0.5), o),
    footstep: (o) => vfx.footstep(mons[2].worldAnchor('feet'), true, o),
    dust: (o) => vfx.dust(V(0, 0, 0), o),
    death: (o) => vfx.death(mons[0], { coins: 6, ...o }),
    blockSpark: (o) => vfx.blockSpark(H().add(V(0.6, 0, -0.3)), o),
    'amb:embers': (o) => vfx.ambient('embers', o),
    'amb:dust': (o) => vfx.ambient('dust', o),
    'amb:ash': (o) => vfx.ambient('ash', o),
    'amb:fireflies': (o) => vfx.ambient('fireflies', o),
    'amb:leaves': (o) => vfx.ambient('leaves', o),
    'amb:snow': (o) => vfx.ambient('snow', o),
    'amb:all': (o) => { for (const k of ['embers', 'dust']) vfx.ambient(k, o); },
    slam: (o) => vfx.telegraph(mons[2], { kind: 'slam', radius: 2.8, fill: 1.6, ...o }),
    'tele:hex': (o) => vfx.telegraph(hero, { kind: 'hex', radius: 1.8, ...o }),
    targetRing: (o) => { const r = vfx.targetRing(mons[0], o); q.ring = r; return r; },
    'death:boss': (o) => vfx.death(mons[2], { boss: true, ...o }),
    'hit:fire': (o) => vfx.slash(M(0), { element: 'fire', ...o }),
    'hit:ice': (o) => vfx.slash(M(1), { element: 'ice', ...o }),
    muzzle: (o) => vfx.muzzle(handR(), { dir: V(0.3, 0, -1), ...o }),
    'num:dmg': (o) => vfx.damageNumber(mons[0].worldAnchor('head'), '12', o),
    'num:crit': (o) => vfx.damageNumber(mons[1].worldAnchor('head'), '27', { kind: 'crit', ...o }),
    'num:pierce': (o) => vfx.damageNumber(mons[2].worldAnchor('head').add(V(-0.8, 0, 0)), '9', { kind: 'pierce', ...o }),
    'num:block': (o) => vfx.damageNumber(hero.worldAnchor('head'), '6', { kind: 'block', ...o }),
    'num:heal': (o) => vfx.damageNumber(hero.worldAnchor('head').add(V(0.6, 0, 0)), '+5', { kind: 'heal', ...o }),
    'num:magic': (o) => vfx.damageNumber(hero.worldAnchor('head').add(V(-0.5, -0.2, 0)), '+2', { kind: 'magic', ...o }),
    'num:gold': (o) => vfx.damageNumber(mons[0].worldAnchor('chest'), '+6', { kind: 'gold', ...o }),
    'num:miss': (o) => vfx.damageNumber(mons[1].worldAnchor('head'), 'MISS', { kind: 'miss', ...o }),
    banner: (o) => vfx.banner3D('WIND-UP!', o),
  };
  PRE.nums = () => { for (const k of ['dmg', 'crit', 'pierce', 'block', 'heal', 'magic', 'gold', 'miss']) PRE[`num:${k}`](); };
  PRE.round = async () => { // a little combat sequence
    const a = vfx.slash(M(0), {}); await a; vfx.damageNumber(mons[0].worldAnchor('head'), '14', { kind: 'dmg' });
    await vfx.wait?.(0.1);
  };
  q.fire = (name, opts = {}) => { const f = PRE[name]; if (!f) throw new Error(`unknown fx ${name}: ${Object.keys(PRE).join(' ')}`); return f(opts); };
  q.presets = Object.keys(PRE);
  if (params.has('fx')) for (const n of params.get('fx').split(',')) q.fire(n);
  stage.step(1, 0.0001);
}
