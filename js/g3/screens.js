// The scenes behind the non-battle screens: title, hero creation, the road and camp are painted scenes with the heroes'
// miniatures standing in them (scenery.js, flat DOM); victory and defeat are the hero's miniature on the felt (below).
// The only 3D left in the game is the dice tray in battle and the weapon pictures, drawn once to a still image.
//
//   const sc = await scr.enter('title', { cls })      // 'title' | 'create' | 'road' | 'camp'
//   scr.victory(hero, place) / scr.defeat(hero, place)
//   scr.portraitQ.weapon('sword', 0) -> Promise<dataURL>    // cached, queued, lazily rendered
import * as THREE from 'three';
import { world } from './world.js';
import { portrait as renderPortrait, hasPortrait } from './portrait.js';
import { createDie, restQuat } from '../gfx/dice/dice.js';
import { diceStyle } from '../gfx/dice/faces.js';
import { preloadBodyWatermarks } from '../gfx/dice/bodywm.js';
import { createWeapon } from '../gfx/weapons.js';
import * as D from '../data.js';
import { h } from '../dom.js';
import { music } from '../audio.js';
import { applyPlace, atmoLayers } from './flat.js';
import * as Scenery from './scenery.js';

const own = { token: 0, mode: null, handle: null, key: null };
export const state = own;
export const available = () => !!world.available;

// (the screens' panels used to tell a 3D camera where they sit; nothing is 3D here any more)
export function layout() {}
// Phones: the page scrolled `px`; carry the picture (and the Back button over it) up with it.
export function scrolled(px = 0) {
  const port = window.innerWidth / window.innerHeight < 1.25;
  // the hero chip (name, level, gold) stays pinned at the top: the choices further down need it in sight (Dave)
  const pinned = (el) => el.matches('.sx-top') && !!el.querySelector('.sx-chip');
  for (const v of document.querySelectorAll('.sx-viewport > *, .sx-board > .sx-top')) v.style.transform = port && px && !pinned(v) ? `translateY(${-px}px)` : '';
}

// The hero-choice miniature is seated by CSS (`object-fit: contain` in a padded box). `pin` stays on the
// create handle so callers can refresh the flip class after a colour change; it does not measure the image.
function pinHeroArt() {
  const host = document.querySelector('.sx-hero-art');
  if (!host) return;
  const k = D.CLASSES[host.dataset.cls];
  const look = D.lookById(host.dataset.cls, host.dataset.color) || k;
  host.classList.toggle('flip', D.needsFlip(look, 'right'));
  host.classList.add('is-seated');
}

// Every screen is a painted scene (scenery.js). The title and hero choice share the burnt orchard behind the miniature.
const orchard = () => Scenery.enter('road', { heroes: [], act: 1, place: 'Burnt Orchard' });
const MODES = {
  async title() { orchard(); music.setMood?.('title'); return { hero: null }; },
  async create() { orchard(); music.setMood?.('title'); return { hero: null, ped: null, pick: () => Promise.resolve(null), push() {}, pin: pinHeroArt, drag() {} }; },
  // The road and camp are painted scenes with the miniatures standing in them (scenery.js): no 3D here.
  async road({ hero, heroes, place = 'Cinder Ford' } = {}, token) {
    await Scenery.enter('road', { heroes: heroes?.length ? heroes : [hero], act: hero?.campaign?.act || 1, place });
    music.setMood?.('road');
    return { hero: null, sync() {} };
  },
  async camp({ hero, heroes } = {}, token) {
    await Scenery.enter('camp', { heroes: heroes?.length ? heroes : [hero], act: hero?.campaign?.act || 1 });
    music.setMood?.('camp');
    return { hero: null, sync() {} };
  },
};

export async function enter(mode, opts = {}, key = null) {
  if (!available()) return null;
  const token = ++own.token;
  try {
    const hd = await MODES[mode](opts, token);
    if (token !== own.token) return null;
    own.mode = mode; own.handle = hd; own.key = key;
    return hd;
  } catch (e) {
    console.warn('[screens] scene failed', mode, e);
    return null;
  }
}
export const current = () => own.handle;
// Called when a battle (or anything else) takes the stage: forget everything.
export function release() { cancelPortraits(); own.token++; own.handle = null; own.mode = null; own.key = null; Scenery.hide(); }

// ---------------------------------------------------------------------------------------------- victory / defeat on the battle stage
// Victory and defeat are on the table too (Dave, Oct 2026): the hero's painted miniature, flat, on the felt. The screen's own
// viewport (`.sx-viewport`) holds it; the rewards panel sits beside or below.
function endTable(kind, hero, place) {
  const bw = world.battle; if (!bw) return null;
  if (bw.tray?.object) bw.tray.object.visible = false;
  if (bw.stage.post?.trayPass) bw.stage.post.trayPass.enabled = false; // the empty dice table's band went dark under the picture
  const host = document.querySelector('.sx-viewport'); const k = D.CLASSES[hero?.cls]; const img = k?.img; if (!host || !img) return bw;
  const act = hero?.campaign?.act || 1;
  const look = D.placeLook(place);
  const gold = kind === 'victory' ? Array.from({ length: 16 }, (_, i) => h('i', { class: 'fb-gold', style: { '--x': `${6 + ((i * 53) % 88)}%`, '--d': `${(i * 0.37) % 3}s`, '--s': `${0.5 + ((i * 29) % 7) / 10}` } })) : [];
  const el = h('div', { class: `fb fb-end ${kind} act-${act}` }, h('div', { class: 'fb-table' }, h('i', { class: 'fb-rim bot' })),
    h('div', { class: 'fb-atmo', 'aria-hidden': 'true' }, ...atmoLayers(look.weather)),
    h('div', { class: `fb-stand${D.needsFlip(k, 'right') ? ' flip' : ''}` }, h('img', { class: 'fb-img', src: img, alt: hero.name, draggable: 'false' })), ...gold);
  applyPlace(el, place);
  host.replaceChildren(el);
  return bw;
}
export function victory(hero, place) { music.setMood?.('victory'); return endTable('victory', hero, place); }
export function defeat(hero, place) { music.setMood?.('road'); return endTable('defeat', hero, place); }

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
  die(spec, label = spec.sides) {
    const key = `cd:${diceStyle().name}:${label}:${spec.key}`;
    // Only still images are retained here; mesh materials are released after each render.
    const previous = [...pmem.keys()].filter(k => k.startsWith('cd:'));
    if (previous.length >= 48 && !pmem.has(key)) pmem.delete(previous[0]);
    return queue(key, async () => {
      await preloadBodyWatermarks();
      const die = createDie({ spec, quality: 'med' });
      die.mesh.quaternion.copy(restQuat(die.poly, label, 0, -1));
      die.setRest(0.35); // camp shows the side faces, without changing battle shading
      try {
        return renderPortrait(die.mesh, { size: [224, 224], trim: true, yaw: 0.18, pitch: spec.sides === 4 ? 0.68 : 1.03, pad: 1.08, fov: 28,
          prepare: camera => { die.setView(camera.position.clone().normalize()); die.updateCamera(camera); } });
      } finally { die.dispose(); }
    });
  },
  weapon(id, rarity = 0, { size = [200, 200] } = {}) { // cards show it as a small thumbnail (about 54px; 200 stays sharp on a 3x phone)
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
