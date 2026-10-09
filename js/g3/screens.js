// Living 3D scenes behind the non-battle screens: title, hero creation, the road, camp, and the
// victory / defeat poses on top of the battle stage. DOM lives in scrui.js; this file owns what the
// camera sees. Everything is built from the same procedural kit as the battle (arena, hero actor,
// particles) and driven by the stage clock, so shots are deterministic.
//
//   const sc = await scr.enter('title', { cls })      // 'title' | 'create' | 'road' | 'camp'
//   scr.victory() / scr.defeat()                        // re-pose the battle stage that is still on screen
//   scr.layout({ land: { right: .36 }, port: { bottom: .5 } })   // tell the camera where the DOM panels sit
//   scr.portrait.monster('wolf') -> Promise<dataURL>    // cached, queued, lazily rendered
import * as THREE from 'three';
import { world } from './world.js';
import { SHOTS } from './director.js';
import { portrait as renderPortrait, hasPortrait } from './portrait.js';
import { createActor } from '../gfx/actors/index.js';
import { Particles } from '../gfx/particles.js';
import { mat, solid, glow } from '../gfx/mats.js';
import { createWeapon } from '../gfx/weapons.js';
import * as D from '../data.js';
import { music } from '../audio.js';

const stage = () => world.stage;
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------------------------------------------------------------------------------------- shots
// land = wide screens, port = tall phones. Hero stands near the world origin in every scene.
Object.assign(SHOTS, {
  's-title': { land: { pos: [2.4, 0.85, 6.7], look: [-0.6, 1.3, 0.4], fov: 34 }, port: { pos: [1.6, 1.2, 9.4], look: [-1.0, 1.4, 0.4], fov: 46 } },
  's-create': { land: { pos: [0.8, 1.9, 7.4], look: [0, 1.25, 0], fov: 36 }, port: { pos: [0.5, 2.3, 10.2], look: [0, 1.38, 0], fov: 50 } }, // a touch higher and further back (Dave): the hero sits lower in the bright part of the screen, the pedestal ring shows
  's-create-in': { land: { pos: [0.6, 1.5, 6.4], look: [0, 1.25, 0], fov: 34 }, port: { pos: [0.4, 1.5, 7.8], look: [0, 1.25, 0], fov: 48 } },
  's-road': { land: { pos: [0.5, 1.45, 6.4], look: [-2.1, 1.3, -0.5], fov: 38 }, port: { pos: [0.3, 1.5, 7.8], look: [-1.7, 1.25, -0.5], fov: 52 } },
  's-camp': { land: { pos: [2.8, 1.5, 6.0], look: [-0.9, 0.95, 0.2], fov: 38 }, port: { pos: [2.4, 1.7, 7.4], look: [-0.9, 0.95, 0.2], fov: 52 } },
  's-victory': { land: { pos: [-0.5, 1.3, 5.4], look: [-3.2, 1.2, 0.7], fov: 36 }, port: { pos: [-1.8, 1.7, 10.2], look: [-3.1, 1.0, 0.7], fov: 50 } },
  's-defeat': { land: { pos: [-0.8, 0.95, 4.6], look: [-3.2, 0.8, 0.7], fov: 34 }, port: { pos: [-1.8, 1.1, 6.0], look: [-3.1, 0.8, 0.7], fov: 48 } },
});

// ---------------------------------------------------------------------------------------------- bookkeeping
const own = { objs: [], offs: [], arena: null, arenaOff: null, place: null, token: 0, mode: null, handle: null };
export const state = own;
const add = (o, parent) => { (parent || stage().scene).add(o); own.objs.push(o); return o; };
const frame = (fn) => { const off = stage().onFrame(fn); own.offs.push(off); return off; };
function soft() {
  for (const o of own.objs) { o.removeFromParent(); o.traverse?.((x) => { if (x.isLight) return; }); }
  own.objs = [];
  own.offs.forEach((f) => f()); own.offs = [];
  own.handle = null;
}
export const available = () => !!world.available;

export function layout(spec) {
  const d = world.director; if (!d) return;
  d.scrollPx = 0;
  if (!spec) { d.layout = null; d.applySafe(); return; }
  d.layout = (W, H) => {
    const port = d.portrait > 0.5; const s = (port ? spec.port : spec.land) || {};
    // phones: the whole screen scrolls, so the picture rides up with the page (the view window moves down by the scroll)
    return { left: (s.left || 0) * W, right: (s.right || 0) * W, top: (s.top || 0) * H, bottom: (s.bottom || 0) * H + (port ? 2 * (d.scrollPx || 0) : 0) };
  };
  d.applySafe();
}
// Phones: the page scrolled `px`; carry the 3D picture (and the Back button over it) up with it.
export function scrolled(px = 0) {
  const d = world.director; if (!d) return;
  const port = d.portrait > 0.5; d.scrollPx = port ? px : 0; d.applySafe();
  for (const v of document.querySelectorAll('.sx-viewport, .sx-board > .sx-top')) v.style.transform = port && px ? `translateY(${-px}px)` : '';
}

// Arena: rebuilt only when the place changes (or after a battle left the stage in another mode).
async function arenaFor(place, { seed = 5, mood = 'calm', look } = {}) {
  const st = stage();
  if (world.mode === 'screens' && own.arena && own.place === place) { soft(); own.arena.setMood(mood); return false; }
  st.post.uniforms.uFade.value = 1;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  soft(); own.arenaOff?.(); own.arena = null; world.clear();
  const mod = await import('../gfx/arena.js');
  const arena = mod.buildArena(st, { place, kind: 'standard', seed, enemyCount: 2, quiet: true }); // a calm backdrop: no big blaze behind the hero
  own.arena = arena; own.place = place; world.mode = 'screens';
  // the hero is the subject on these screens: no light shaft (it washes the figure out), a calmer glow
  if (arena.c?.shaftMesh) arena.c.shaftMesh.visible = false; if (arena.c?.lookBase) { arena.c.lookBase.bloom = 0.2; arena.c.lookBase.vignette = 0.3; }
  st.post.look({ vignette: 0.3, aberration: 0, grain: 0.015, tilt: 0 });
  own.arenaOff = st.onFrame((dt, t) => arena.update?.(dt, t));
  arena.setMoodNow?.(mood); arena.setMood(mood);
  return true;
}
const unfade = (s = 0.9) => stage().fadeTo(0, s);

export function loadoutFor(cls) {
  const c = D.CLASSES[cls]; const w = (id) => ({ uid: `p-${id}`, id, rarity: 0 });
  return c.weapons.length === 1 ? { NW: w(c.weapons[0]), NE: w(c.weapons[0]) } : { NW: w(c.weapons[0]), NE: w(c.weapons[1]) };
}
async function makeHero(cls, { loadout, level = 1, seed = 3 } = {}) {
  const a = await createActor('hero', { cls, loadout: loadout || loadoutFor(cls), level, seed, quality: stage().quality });
  frame((dt, t) => a.update(dt, t));
  return a;
}

// ---------------------------------------------------------------------------------------------- props
function particles(max, opts) {
  const ps = new Particles({ max, ...opts }); stage().addParticles(ps);
  own.objs.push(ps.object); own.offs.push(ps._off);
  return ps;
}
// Drifting embers anywhere in a box. rate = particles per second.
function emberField({ box = [-6, 0, -3, 6, 3.5, 6], rate = 14, color = 0xff9a40, size = 0.045, rise = 0.5 } = {}) {
  const r = rng(77); const ps = particles(260, { sprite: 'dot', blending: 'add' }); let acc = 0;
  frame((dt) => {
    acc += dt * rate * (stage().quality === 'low' ? 0.6 : 1) * (reduced() ? 0.3 : 1);
    while (acc >= 1) {
      acc -= 1;
      ps.emit({ pos: [box[0] + r() * (box[3] - box[0]), box[1] + r() * (box[4] - box[1]), box[2] + r() * (box[5] - box[2])], vel: [(r() - 0.5) * 0.3, rise * (0.4 + r()), (r() - 0.5) * 0.2], life: 3 + r() * 3, size: size * (0.5 + r()), sizeEnd: 0.005, color, colorEnd: 0xff3a10, alpha: 0.9, alphaEnd: 0, turbulence: 0.9, drag: 0.2 });
    }
  });
  return ps;
}
// Low ground fog: soft smoke sprites crawling across the floor.
function groundFog({ x = [-7, 7], z = [-4, 6], count = 22, color = 0x8a7a8a, alpha = 0.07 } = {}) {
  const r = rng(31); const ps = particles(count + 4, { sprite: 'smoke', blending: 'normal' });
  const spawn = () => ps.emit({ pos: [x[0] + r() * (x[1] - x[0]), 0.15 + r() * 0.5, z[0] + r() * (z[1] - z[0])], vel: [0.12 + r() * 0.1, 0, (r() - 0.5) * 0.05], life: 14 + r() * 6, size: 3 + r() * 2.5, sizeEnd: 5 + r() * 2, color, colorEnd: color, alpha, alphaEnd: 0, rot: r() * 6, spin: (r() - 0.5) * 0.05 });
  for (let i = 0; i < count; i++) { spawn(); ps.a.aAge.array[(ps.cursor - 1 + ps.max) % ps.max] = r() * 12; }
  let acc = 0; frame((dt) => { acc += dt * (count / 16); while (acc >= 1) { acc -= 1; spawn(); } });
  return ps;
}

// A small flickering fire (campfire logs, braziers). Returns { group, light, burst }.
function fire({ pos = [0, 0, 0], scale = 1, logs = true, light = 1, seed = 1, parent } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); add(g, parent);
  const r = rng(seed * 13 + 5);
  if (logs) {
    for (let i = 0; i < 9; i++) { // stone ring
      const a = (i / 9) * Math.PI * 2 + r() * 0.2; const s = 0.13 + r() * 0.06;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s * scale, 0), mat('stoneDark', { color: 0x8a8480 }));
      m.position.set(Math.cos(a) * 0.62 * scale, s * 0.55 * scale, Math.sin(a) * 0.62 * scale); m.rotation.set(r(), r() * 6, r()); m.scale.y = 0.7; m.castShadow = true; g.add(m);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * scale, 0.09 * scale, 0.9 * scale, 8), mat('woodDark', { color: 0x6a5240 }));
      lg.position.set(Math.cos(a) * 0.14 * scale, 0.16 * scale, Math.sin(a) * 0.14 * scale); lg.rotation.set(Math.PI / 2 - 0.2, 0, -a + Math.PI / 2); lg.rotation.order = 'YXZ'; lg.rotation.y = a; lg.rotation.x = Math.PI / 2 - 0.18; lg.castShadow = true; g.add(lg);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 8, 6), glow(0xff5a1a, 2.2)); tip.position.set(Math.cos(a) * 0.05 * scale, 0.2 * scale, Math.sin(a) * 0.05 * scale); g.add(tip);
    }
  }
  const flames = particles(180, { sprite: 'glow', blending: 'add', renderOrder: 6 });
  const core = particles(80, { sprite: 'dot', blending: 'add', renderOrder: 7 });
  const sparks = particles(120, { sprite: 'dot', blending: 'add' });
  const smoke = particles(40, { sprite: 'smoke', blending: 'normal' });
  const L = new THREE.PointLight(0xff8a3a, 0, 16 * scale, 1.6); L.position.set(0, 0.55 * scale, 0); g.add(L);
  const w = new THREE.Vector3(); let acc = 0; let accS = 0; let accM = 0;
  frame((dt, t) => {
    g.getWorldPosition(w);
    const k = reduced() ? 0.5 : 1; const q = stage().quality === 'low' ? 0.6 : 1;
    acc += dt * 60 * k * q; accS += dt * 9 * k * q; accM += dt * 2.2;
    while (acc >= 1) {
      acc -= 1; const a = r() * 6.28; const rad = r() * 0.2 * scale;
      flames.emit({ pos: [w.x + Math.cos(a) * rad, w.y + 0.12 * scale, w.z + Math.sin(a) * rad], vel: [(r() - 0.5) * 0.25, (0.8 + r() * 0.9) * scale, (r() - 0.5) * 0.25], life: 0.55 + r() * 0.45, size: (0.55 + r() * 0.4) * scale, sizeEnd: 0.08 * scale, color: 0xff9a30, colorEnd: 0xd02008, alpha: 0.55, alphaEnd: 0, drag: 0.8, turbulence: 1.4, rot: r() * 6, spin: (r() - 0.5) * 2 });
      core.emit({ pos: [w.x + (r() - 0.5) * 0.14 * scale, w.y + 0.1 * scale, w.z + (r() - 0.5) * 0.14 * scale], vel: [0, (0.5 + r() * 0.5) * scale, 0], life: 0.4 + r() * 0.3, size: 0.28 * scale, sizeEnd: 0.04, color: 0xfff0b0, colorEnd: 0xffa030, alpha: 0.85, alphaEnd: 0, drag: 1 });
    }
    while (accS >= 1) {
      accS -= 1;
      sparks.emit({ pos: [w.x + (r() - 0.5) * 0.3 * scale, w.y + 0.4 * scale, w.z + (r() - 0.5) * 0.3 * scale], vel: [(r() - 0.5) * 0.7, (0.9 + r() * 1.3) * scale, (r() - 0.5) * 0.7], life: 1.6 + r() * 2.2, size: 0.04 * (0.6 + r()) * scale, sizeEnd: 0.008, color: 0xffc060, colorEnd: 0xff3010, alpha: 1, alphaEnd: 0, turbulence: 2.2, drag: 0.35 });
    }
    while (accM >= 1) {
      accM -= 1;
      smoke.emit({ pos: [w.x, w.y + 1.1 * scale, w.z], vel: [0.15, 0.55 * scale, 0.05], life: 3.2, size: 0.4 * scale, sizeEnd: 1.6 * scale, color: 0x3a3430, colorEnd: 0x1a1816, alpha: 0.18, alphaEnd: 0, drag: 0.3, turbulence: 0.6, rot: r() * 6, spin: 0.2 });
    }
    L.intensity = light * (32 + Math.sin(t * 17 + seed) * 5 + Math.sin(t * 7.3) * 6 + Math.sin(t * 29) * 2.5) * scale;
  });
  return { group: g, light: L };
}

// A torch / brazier on a stand: iron bowl + fire.
function brazier(pos, { seed = 2, scale = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); add(g);
  const ironM = mat('iron', { color: 0x9a9690 });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.18, 0.04], [0.3, 0.2], [0.34, 0.3], [0.31, 0.3], [0.26, 0.2], [0.05, 0.09]].map(([x, y]) => new THREE.Vector2(x * scale, y * scale)), 18), ironM);
  bowl.position.y = 1.02 * scale; bowl.castShadow = true; g.add(bowl);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.026 * scale, 1.1 * scale, 6), ironM);
    leg.position.set(Math.cos(a) * 0.14 * scale, 0.52 * scale, Math.sin(a) * 0.14 * scale); leg.rotation.set(Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16); leg.castShadow = true; g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 * scale, 0.012 * scale, 6, 20), ironM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.45 * scale; g.add(ring);
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.26 * scale, 14), glow(0xff5a18, 1.4)); coals.rotation.x = -Math.PI / 2; coals.position.y = 1.2 * scale; g.add(coals);
  fire({ pos: [pos[0], pos[1] + 1.2 * scale, pos[2]], scale: 0.55 * scale, logs: false, light: 0.8, seed });
  return g;
}

function tent({ pos = [0, 0, 0], yaw = 0, w = 2.4, d = 3, h = 1.7, tint = 0x6f604a } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = yaw; add(g);
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat('cloth', { tint, dark: 0x1c1610, side: THREE.DoubleSide, roughness: 0.95 })); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const pole = (x, z, hh) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, hh, 6), mat('woodDark')); p.position.set(x, hh / 2, z); p.castShadow = true; g.add(p); };
  pole(0, d / 2 + 0.05, h * 1.08); pole(0, -d / 2 - 0.05, h * 1.08);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.34, h * 0.62), solid(0x0a0806, { rough: 1 })); door.position.set(0, h * 0.31, d / 2 + 0.006); g.add(door);
  return g;
}
function logSeat(pos, yaw = 0, len = 1.5) {
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, len, 10), mat('bark')); l.rotation.set(0, yaw, Math.PI / 2); l.position.set(...pos); l.position.y = 0.2; l.castShadow = true; l.receiveShadow = true; add(l);
  return l;
}

// A lit stone pedestal with a glowing rune ring (class colour).
function pedestal({ pos = [0, 0, 0], color = 0xffc060 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); add(g);
  const stone = mat('stone', { color: 0xb8b0a8, repeat: 2 });
  const prof = [[0.0, 0], [1.25, 0], [1.28, 0.05], [1.2, 0.1], [1.2, 0.16], [1.05, 0.2], [1.0, 0.3], [1.02, 0.34], [0.0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), stone); base.castShadow = true; base.receiveShadow = true; g.add(base);
  const ringM = glow(color, 2.2); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.016, 8, 72), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.345; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.01, 6, 72), glow(color, 1.1)); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.205; g.add(ring2);
  const rm = mat('rune', { emissive: color, emissiveIntensity: 1.2 }); void rm;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2; const rn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.16), glow(color, 1.8)); rn.position.set(Math.cos(a) * 0.95, 0.343, Math.sin(a) * 0.95); rn.rotation.y = -a; g.add(rn);
  }
  const halo = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, map: null })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03; g.add(halo);
  const L = new THREE.PointLight(color, 5, 7, 1.7); L.position.set(0, 0.8, 0.4); g.add(L);
  g.userData = { ringM, ring, ring2, halo, L, setColor(c) { ringM.color.set(c).multiplyScalar(2.2); ring2.material.color.set(c).multiplyScalar(1.1); halo.material.color.set(c); L.color.set(c); g.traverse((o) => { if (o.material?.isMeshBasicMaterial && o !== halo && o !== ring && o !== ring2) o.material.color.set(c).multiplyScalar(1.8); }); } };
  frame((dt, t) => { halo.material.opacity = 0.16 + Math.sin(t * 1.6) * 0.04; ring.rotation.z = t * 0.1; ring2.rotation.z = -t * 0.06; });
  return g;
}

// Warm rim from behind-left plus a cool fill from the camera side so a hero reads against a bright sky.
function rimKit({ target = [0, 1.2, 0], warm = 0xffa050, cool = 0x7090c8, rim = 4.2, fill = 1.6 } = {}) {
  const t = new THREE.Object3D(); t.position.set(...target); add(t);
  const r = new THREE.DirectionalLight(warm, rim); r.position.set(target[0] - 3, target[1] + 2.5, target[2] - 4); r.target = t; add(r);
  const f = new THREE.DirectionalLight(cool, fill); f.position.set(target[0] + 4, target[1] + 1.2, target[2] + 5); f.target = t; add(f);
}
const CLASS_COLOR = { knight: 0xff6a4a, ranger: 0x7aff9a, wizard: 0x6ab8ff, dwarf: 0xffa040, bard: 0x4ae8d8 };

// ---------------------------------------------------------------------------------------------- scene modes
function drift(amount = 0.35, speed = 0.12) {
  const d = world.director;
  frame((dt, t) => { if (reduced()) { d.offset.set(0, 0, 0); return; } d.offset.set(Math.sin(t * speed) * amount, Math.sin(t * speed * 0.7 + 1) * amount * 0.25, Math.cos(t * speed * 0.8) * amount * 0.4); });
}
function setLook(o) { stage().post.look({ bloom: 0.7, vignette: 0.6, grain: 0.05, aberration: 0.0016, sat: 1.08, contrast: 1.08, tilt: 0, exposure: 1, ...o }); }
function check(token) { if (token !== own.token) throw Object.assign(new Error('stale'), { stale: true }); }

const MODES = {
  async title({ cls = 'knight', hero: saved } = {}, token) {
    await arenaFor('Burnt Orchard', { seed: 11, mood: 'calm' }); check(token);
    setLook({ vignette: 0.75, bloom: 0.55, exposure: 0.82 });
    // the home screen's hero is now Dave's Quest Dice knight (a picture over this scene, assets/brand); the scene keeps the
    // burnt orchard, the embers and the fog behind him
    void cls; void saved;
    rimKit({ target: [-0.9, 1.2, 1.5] });
    emberField({ box: [-6, 0, -3, 6, 3.5, 6], rate: 18 });
    groundFog();
    world.director.set('s-title', { snap: true, lambda: 1.2 }); drift(0.3, 0.1);
    music.setMood?.('title');
    return { hero: null, arena: own.arena };
  },
  async create({ cls = 'knight' } = {}, token) {
    await arenaFor('Burnt Orchard', { seed: 11, mood: 'calm' }); check(token);
    setLook({ vignette: 0.28, bloom: 0.7, exposure: 1.14 }); // light vignette: on a phone only the top of the picture shows above the panel, and a heavy one made it dark (Dave)
    rimKit({ target: [0, 1.2, 0], rim: 3.2, fill: 2.4 }); // a fill from the camera side so the hero's face and armour read, not a black shape
    const ped = pedestal({ pos: [0, 0, 0], color: CLASS_COLOR[cls] });
    brazier([-2.6, 0, -0.6], { seed: 3 }); brazier([2.7, 0, -0.9], { seed: 4 }); brazier([-3.2, 0, 2.8], { seed: 5, scale: 0.9 });
    const pivot = new THREE.Group(); pivot.position.set(0, 0.34, 0); add(pivot);
    // each hero arrives turned a little to the left, then turns to face you and sways gently (Dave: it slowly spun until you saw its back)
    const FRONT = 0.22; const ARRIVE = -1.3; const cache = new Map(); let cur = null; let yaw = ARRIVE; let vel = 0; let dragging = false; let idle = 0; let mounting = 0; let turnT = 0; let turnFrom = ARRIVE; let swayT = 0;
    const burst = particles(120, { sprite: 'dot', blending: 'add' });
    const sh = { cls: null };
    async function pick(c, { quiet = false } = {}) {
      const my = ++mounting; sh.cls = c;
      let a = cache.get(c);
      if (!a) { a = await createActor('hero', { cls: c, loadout: loadoutFor(c), level: 1, seed: 3, quality: stage().quality }); cache.set(c, a); }
      if (my !== mounting || token !== own.token) return null;
      if (cur) pivot.remove(cur.root);
      cur = a; pivot.add(a.root); a.play('ready', { restart: true, fade: 0.15 });
      yaw = ARRIVE; turnFrom = ARRIVE; turnT = 0.0001; vel = 0; swayT = 0; // arrive turned to the left, then turn toward the player
      ped.userData.setColor(CLASS_COLOR[c]);
      if (!quiet) {
        const r = rng(Date.now() & 0xffff);
        for (let i = 0; i < 46; i++) { const ang = r() * 6.28; burst.emit({ pos: [Math.cos(ang) * 0.85, 0.4, Math.sin(ang) * 0.85], vel: [Math.cos(ang) * 0.5, 1 + r() * 1.6, Math.sin(ang) * 0.5], life: 1 + r(), size: 0.05 + r() * 0.04, sizeEnd: 0.005, color: CLASS_COLOR[c], colorEnd: 0xff6a20, alpha: 1, alphaEnd: 0, drag: 0.8, gravity: 0.2 }); }
        stage().flash(CLASS_COLOR[c], 0.12);
      }
      return a;
    }
    frame((dt, t) => {
      if (cur) cur.update?.(0, t);
      if (turnT > 0) { // the turn toward you: ease out over about two seconds
        turnT = Math.min(1, turnT + dt / 1.8); const e = 1 - (1 - turnT) ** 3; yaw = turnFrom + (FRONT - turnFrom) * e;
        if (turnT >= 1) { turnT = 0; swayT = 0; }
      } else if (!dragging) {
        idle += dt; vel *= Math.exp(-3 * dt); yaw += vel * dt;
        if (idle > 2.5 && Math.abs(vel) < 0.05) { // let go a while ago: drift back toward facing you, with a slow gentle sway
          swayT += dt; const want = FRONT + (reduced() ? 0 : Math.sin(swayT * 0.45) * 0.28);
          const d = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)); yaw += d * (1 - Math.exp(-1.2 * dt));
        }
      } else yaw += vel * dt;
      pivot.rotation.y = yaw;
    });
    emberField({ box: [-5, 0, -3, 5, 3.5, 5], rate: 10 });
    await pick(cls, { quiet: true }); check(token);
    world.director.set('s-create', { snap: true, lambda: 1.4 }); drift(0.12, 0.1);
    music.setMood?.('title');
    const handle = {
      pick, ped,
      push(inn) { world.director.set(inn ? 's-create-in' : 's-create', { lambda: 2.2 }); },
      drag(dx, end) { dragging = !end; idle = 0; turnT = 0; if (end) return; yaw += dx * 0.011; vel = dx * 0.011 * 60; },
      get hero() { return cur; },
    };
    return handle;
  },
  // The road: the hero from three-quarters behind, looking down a ruined track at dusk.
  async road({ hero: saved, place = 'Cinder Ford', seed = 5 } = {}, token) {
    await arenaFor(place, { seed, mood: 'calm' }); check(token);
    setLook({ vignette: 0.65, exposure: 1.0 });
    const hero = await makeHero(saved.cls, { loadout: saved.loadout, level: saved.level, seed: saved.campaign?.seed }); check(token);
    hero.root.position.set(-1.3, 0, 2.2); hero.root.rotation.y = Math.PI - 0.55; add(hero.root);
    hero.play('ready', { restart: true });
    emberField({ box: [-6, 0, -6, 6, 3, 6], rate: 12 });
    world.director.set('s-road', { snap: true, lambda: 1.2 }); drift(0.35, 0.09);
    music.setMood?.('road');
    return { hero, arena: own.arena };
  },
  async camp({ hero: saved } = {}, token) {
    await arenaFor('Ravens’ Rest', { seed: 9, mood: 'camp' }); check(token);
    setLook({ vignette: 0.7, bloom: 0.9, exposure: 1.02, sat: 1.12 });
    const f = fire({ pos: [0, 0, 0], scale: 1.1, seed: 4, light: 1.4 });
    logSeat([-1.9, 0, 0.5], 0.5, 1.5); logSeat([0.9, 0, -1.9], 0.2, 1.4);
    tent({ pos: [-3.3, 0, -2.4], yaw: 0.6, tint: 0x6a5a44 }); tent({ pos: [3.4, 0, -3.2], yaw: -0.5, w: 2.8, d: 3.4, h: 1.9, tint: 0x4e5a48 });
    // supply crates and a bedroll for story
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.55), mat('wood')); crate.position.set(2.2, 0.28, -1.0); crate.rotation.y = 0.4; crate.castShadow = true; add(crate);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat('woodDark')); crate2.position.set(2.7, 0.2, -0.5); crate2.rotation.y = -0.3; crate2.castShadow = true; add(crate2);
    let hero = await makeHero(saved.cls, { loadout: saved.loadout, level: saved.level, seed: saved.campaign?.seed }); check(token);
    const place = (a) => { a.root.position.set(-1.35, 0, 1.0); a.root.rotation.y = Math.atan2(1.35, -1.0); add(a.root); a.play('idle', { restart: true }); };
    place(hero);
    let sig = ''; const sigOf = (sv) => JSON.stringify([sv.name, sv.cls, sv.level, sv.loadout]); sig = sigOf(saved); let swapping = 0;
    const sync = async (sv) => {
      if (!sv || sigOf(sv) === sig) return; const old = sig; sig = sigOf(sv);
      const prev = JSON.parse(old);
      if (prev[0] === sv.name && prev[1] === sv.cls) { hero.setLoadout(sv.loadout); hero.setLevel?.(sv.level); hero.play('idle', { restart: true }); stage().flash(0xffc070, 0.1); return; }
      const my = ++swapping; const a = await createActor('hero', { cls: sv.cls, loadout: sv.loadout, level: sv.level, seed: sv.campaign?.seed, quality: stage().quality });
      if (my !== swapping || token !== own.token) return;
      hero.root.removeFromParent(); hero = a; frame((dt, t) => a.update(dt, t)); place(a);
    };
    emberField({ box: [-5, 0, -4, 5, 3, 5], rate: 9, rise: 0.35 });
    groundFog({ alpha: 0.05 });
    world.director.set('s-camp', { snap: true, lambda: 1.2 }); drift(0.22, 0.1);
    music.setMood?.('camp');
    return { get hero() { return hero; }, fire: f, arena: own.arena, sync };
  },
};

export async function enter(mode, opts = {}, key = null) {
  if (!available()) return null;
  if (key && own.mode === mode && own.key === key && own.handle && world.mode === 'screens') { unfade(0.4); return own.handle; }
  const token = ++own.token;
  try {
    const h = await MODES[mode](opts, token);
    if (token !== own.token) return null;
    own.mode = mode; own.handle = h; own.key = key;
    unfade(0.9);
    return h;
  } catch (e) {
    if (e.stale) return null;
    console.warn('[screens] scene failed', mode, e);
    stage().post.uniforms.uFade.value = 0;
    return null;
  }
}
export const current = () => own.handle;
// Called when a battle (or anything else) takes the stage: forget everything.
export function release() { cancelPortraits(); own.token++; own.objs = []; own.offs = []; own.arena = null; own.arenaOff = null; own.place = null; own.handle = null; own.mode = null; own.key = null; layout(null); }

// ---------------------------------------------------------------------------------------------- victory / defeat on the battle stage
export function victory() {
  const bw = world.battle; if (!bw) return null;
  if (bw._victory) return bw; bw._victory = true;
  bw.arena.setMood?.('victory'); if (bw.tray?.object) bw.tray.object.visible = false;
  bw.hero.play('victory', { restart: true });
  setLook({ bloom: 0.85, exposure: 1.06, sat: 1.12 });
  const yaw = aimAtHero('s-victory', bw.hero); world.director.pan = 0; // (the battle's own framing nudge would push the hero up out of the picture)
  if (bw.stage.post?.trayPass) bw.stage.post.trayPass.enabled = false; // the empty dice table's band went dark under the picture
  world.director.set('s-victory', { lambda: 1.4 });
  music.setMood?.('victory');
  // a rain of gold sparks over the hero
  const st = stage(); const ps = new Particles({ max: 220, sprite: 'dot', blending: 'add' }); st.addParticles(ps); const r = rng(5); let acc = 0; const hp = bw.hero.root.position;
  const off = st.onFrame((dt) => { acc += dt * (reduced() ? 8 : 26); while (acc >= 1) { acc -= 1; ps.emit({ pos: [hp.x + (r() - 0.5) * 3.2, 3.2 + r(), hp.z + (r() - 0.5) * 2.4], vel: [(r() - 0.5) * 0.3, -0.5 - r() * 0.5, (r() - 0.5) * 0.3], life: 3.2, size: 0.05 + r() * 0.05, sizeEnd: 0.02, color: r() > 0.3 ? 0xffd870 : 0xfff2c0, colorEnd: 0xff9a30, alpha: 1, alphaEnd: 0, turbulence: 1.2, drag: 0.2 }); } });
  // the hero turns round to face the camera over about a second
  const hr = bw.hero.root; const turn = st.onFrame((dt) => { let d = yaw - hr.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); hr.rotation.y += d * (1 - Math.exp(-(reduced() ? 60 : 3.2) * dt)); });
  bw.stage.scene.userData.victoryOff = () => { off(); turn(); ps.object.removeFromParent(); };
  return bw;
}
// The victory camera comes to the hero, wherever the battle placed them (phones stand the hero in the foreground, wide
// screens further back), and the hero turns round to face it, so the raised arms and the face are seen (Dave).
// Returns the yaw the hero should turn to.
function aimAtHero(name, actor) {
  const p = actor.root.position;
  let dx = 0.42; let dz = 1; const l = Math.hypot(dx, dz); dx /= l; dz /= l; // from the hero toward the viewer's side, a little to the right
  const tall = Math.max(1.6, (actor.worldAnchor?.('head')?.y ?? 2) - p.y + 0.6); // head to raised hands (and hats)
  const mid = tall * 0.55;
  const at = (d, up, lift = 0) => ({ pos: [p.x + dx * d, p.y + mid + up + lift, p.z + dz * d], look: [p.x, p.y + mid + lift, p.z] });
  // phones: the picture is the band above the results panel, so stand further back
  SHOTS[name] = { land: { ...at(tall * 2.2, 0.3), fov: 36 }, port: { ...at(tall * 3.2, 0.45, tall * 0.16), fov: 50 } }; // (lift: the hero sits lower in the band, clear of the top)
  return Math.atan2(dx, dz) - 0.25; // face the camera, turned a touch toward the battlefield
}
export function defeat() {
  const bw = world.battle; if (!bw) return null;
  bw.arena.setMood?.('calm'); if (bw.tray?.object) bw.tray.object.visible = false;
  bw.hero.play('lastStand', { restart: true });
  setLook({ bloom: 0.5, sat: 0.55, exposure: 0.82, vignette: 0.9, contrast: 1.12 });
  world.director.set('s-defeat', { lambda: 0.9 });
  music.setMood?.('road');
  return bw;
}
export function leaveBattleStage() { try { stage().scene.userData.victoryOff?.(); } catch { /* ignore */ } }

// ---------------------------------------------------------------------------------------------- portraits (cached, queued)
const pq = []; let pbusy = false; const pmem = new Map();
// Drop queued (not yet started) portrait jobs, e.g. when a quest starts and the battle needs the main thread.
export function cancelPortraits() { for (const j of pq.splice(0)) { pmem.delete(j.key); j.resolve(null); } }
function pump() {
  if (pbusy) return; const job = pq.shift(); if (!job) return;
  pbusy = true;
  const go = async () => {
    try { job.resolve(await job.fn()); } catch (e) { console.warn('[portrait]', job.key, e); job.resolve(null); }
    pbusy = false; setTimeout(pump, 140); // breathing room so taps and clicks are handled between portrait builds
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 8)))(go, { timeout: 1500 });
}
function queue(key, fn) {
  if (pmem.has(key)) return pmem.get(key);
  const p = new Promise((resolve) => { pq.push({ key, fn, resolve }); pump(); });
  pmem.set(key, p); return p;
}
export const portraitQ = {
  has: (key) => hasPortrait(key),
  monster(id, { tier = D.MONSTERS[id]?.tier || 'minion', size = [360, 360], fit = 'full', yaw = 0.5 } = {}) {
    const key = `m:${id}:${fit}${yaw !== 0.5 ? `:y${yaw}` : ''}`; // yaw 0 = straight from the front (the monster sheet)
    return queue(key, async () => {
      const a = await createActor(id, { tier, seed: 5, quality: 'low' });
      a.play?.('ready', { restart: true, fade: 0 }); for (let i = 0; i < 12; i++) a.update(0.05, 0.05 * i);
      const url = renderPortrait(a.root, { key, size, yaw, pitch: 0.08, fit, pad: tier === 'boss' ? 0.98 : 1.0, fov: 30 });
      a.dispose?.();
      return url;
    });
  },
  hero(cls, { size = [360, 440], fit = 'full', loadout } = {}) {
    const key = `h:${cls}:${fit}`;
    return queue(key, async () => {
      const a = await createActor('hero', { cls, loadout: loadout || loadoutFor(cls), level: 1, seed: 3, quality: 'med' });
      a.play('ready', { restart: true, fade: 0 }); for (let i = 0; i < 14; i++) a.update(0.05, 0.05 * i);
      const url = renderPortrait(a.root, { key, size, yaw: 0.45, pitch: 0.06, fit, pad: 1.05, fov: 28 });
      a.dispose?.();
      return url;
    });
  },
  weapon(id, rarity = 0, { size = [380, 380] } = {}) {
    const key = `w:${id}:${rarity}`;
    return queue(key, async () => {
      const w = createWeapon(id, rarity, { quality: 'med' }); const holder = new THREE.Group(); holder.add(w);
      const hands2 = D.WEAPONS[id].hands === 2; id = D.modelOf(id); // a legendary is posed like its model
      w.rotation.z = id === 'shield' || id === 'tower' || id === 'bracer' ? 0 : id === 'bow' ? -0.78 : id === 'staff' ? -0.72 : (hands2 ? -0.7 : -0.62); // long weapons lie on the diagonal so they fill the picture
      if (id === 'shield' || id === 'tower') w.rotation.y = -0.5;
      if (id === 'bracer') { w.rotation.x = -0.4; w.rotation.y = 0.6; }
      w.updateMatrixWorld(true); for (let i = 0; i < 8; i++) w.userData.update?.(0.05, 0.5 + i * 0.1);
      const url = renderPortrait(holder, { key, size, yaw: id === 'shield' || id === 'tower' ? 0.25 : 0.5, pitch: 0.1, fit: 'full', pad: 1.1, fov: 24 });
      w.userData.dispose?.();
      return url;
    });
  },
};
