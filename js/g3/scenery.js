// The places between fights (Dave, Oct 2026): camp, the road and the lobby are painted scenes with the heroes' miniatures
// standing in them, like the battle table. At camp the company stands around the campfire, and each hero's pet sits at their
// feet. Flat DOM, no WebGL: a full-screen painting (#scene, behind the screen's panels) and a stage of figures inside the
// screen's `.sx-viewport`, so the panels and the figures share one layout.
//
// Backgrounds, best first. Grokabot is painting the camp and road scenes; until a file exists the next one down is used:
//   camp:  assets/bg/camp-act<N>.webp, assets/bg/camp.webp, then a calm painted place of the act
//   road:  assets/bg/road-act<N>.webp, then the painting of the place where the next fight is
import { h } from '../dom.js';
import * as D from '../data.js';
import { petImg } from './pets.js';

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// A calm place for each act's camp, until the camp paintings arrive.
const CAMP_PLACE = { 1: 'wolfwood-edge', 2: 'candle-vault', 3: 'smoke-hollow' };
// Paintings made for these scenes. When Grokabot's files are in assets/bg, add their names here (no guessing at the network):
//   'camp-act1', 'camp-act2', 'camp-act3', 'camp' (any act), 'road-act1', 'road-act2', 'road-act3'
export const PAINTED = [];
const have = (names) => names.filter((n) => PAINTED.includes(n)).map((n) => `assets/bg/${n}.webp`);
export const campArt = (act = 1) => [...have([`camp-act${act}`, 'camp']), `assets/bg/${CAMP_PLACE[Math.min(3, act)] || CAMP_PLACE[1]}.webp`];
export const roadArt = (act = 1, place = '') => [...have([`road-act${act}`]), D.placeLook(place).url || `assets/bg/${CAMP_PLACE[1]}.webp`];
export const artFor = (list) => list[0]; // the best one that exists (the list holds only files that do)

// Where the figures stand: [x %, feet y %, faces left (1) or right (0), size]. Pairs sit either side of the fire, then back rows.
const AROUND_FIRE = [[26, 94, 0, 1], [74, 94, 1, 1], [17, 85, 0, 0.88], [83, 85, 1, 0.88], [37, 77, 0, 0.78], [63, 77, 1, 0.78]];
const ON_ROAD = [[26, 94, 0, 1], [48, 92, 0, 0.94], [16, 86, 0, 0.84], [68, 88, 0, 0.88], [36, 80, 0, 0.74], [84, 84, 0, 0.8]];

let layer = null;
function ensureLayer() {
  if (layer && layer.isConnected) return layer;
  layer = h('div', { id: 'scene', class: 'scene', 'aria-hidden': 'true' }, h('div', { class: 'sc-bg' }), h('div', { class: 'sc-shade' }));
  const frame = document.querySelector('.app-frame'); const app = document.getElementById('app');
  if (frame) frame.insertBefore(layer, app || null);
  return layer;
}
export function hide() { if (layer) { layer.classList.remove('on'); document.body.classList.remove('has-scene'); } }
export const active = () => !!layer?.classList.contains('on');

const fireEl = () => h('div', { class: 'sc-fire' },
  h('i', { class: 'sc-pool' }), h('i', { class: 'sc-glow' }),
  h('div', { class: 'sc-logs' }, h('i', { class: 'log a' }), h('i', { class: 'log b' }), h('i', { class: 'log c' })),
  h('div', { class: 'sc-flames' }, h('i', { class: 'fl f1' }), h('i', { class: 'fl f2' }), h('i', { class: 'fl f3' }), h('i', { class: 'fl core' })),
  ...Array.from({ length: 9 }, (_, i) => h('i', { class: 'sc-spark', style: { '--x': `${(i * 37) % 60 - 30}%`, '--d': `${(i * 0.53) % 3.2}s`, '--t': `${2.4 + (i % 4) * 0.55}s`, '--dx': `${((i * 53) % 40) - 20}px` } })));

function figure(hero, slot, { petSide }) {
  const [x, y, flip, s] = slot; const c = D.CLASSES[hero.cls]; const base = c?.imgBase || { x: 0.5, y: 0.98, w: 0.7 };
  const pet = hero.pet ? h('img', { class: 'sc-pet', src: petImg(hero.pet.type), alt: D.PETS[hero.pet.type]?.name || 'pet', draggable: 'false', decoding: 'async' }) : null;
  const img = h('img', { class: 'sc-img', src: c?.img || '', alt: hero.name, draggable: 'false', decoding: 'async' });
  const el = h('div', { class: `sc-fig ${flip ? 'flip' : ''}`, style: { '--x': `${x}%`, '--y': `${y}%`, '--s': String(s), '--bx': String(flip ? 1 - base.x : base.x), '--by': String(base.y), '--delay': `${(x * 7) % 5}s`, zIndex: y > 88 ? 3 : 1 } },
    h('i', { class: 'sc-shadow' }), img, pet, h('b', { class: 'sc-name' }, hero.name));
  void petSide;
  return el;
}

// kind: 'camp' | 'road'. opts: { heroes, act, place, fire }. Safe to call again for the same screen (the stage is rebuilt, the painting kept).
export function enter(kind, { heroes = [], act = 1, place = '', hot = true } = {}) {
  const el = ensureLayer(); const token = (el._t = (el._t || 0) + 1);
  const list = kind === 'camp' ? campArt(act) : roadArt(act, place);
  const url = artFor(list);
  const bg = el.querySelector('.sc-bg'); const full = `url("${url}")`;
  if (bg.style.backgroundImage !== full) bg.style.backgroundImage = full;
  void token; el.className = `scene on k-${kind} act-${act}`; document.body.classList.add('has-scene');
  mountStage(kind, heroes, hot);
}
// The figures go inside the screen's own viewport (the screen has just been mounted).
export function mountStage(kind, heroes, hot = true) {
  let host = document.querySelector('.sx-viewport');
  if (!host) { // the quest board has no viewport of its own: give it one
    const root = document.getElementById('app'); if (!root || !root.classList.contains('sx-screen')) return false;
    host = root.querySelector(':scope > .sc-host'); if (!host) { host = h('div', { class: 'sc-host' }); root.prepend(host); }
  }
  host.querySelector(':scope > .sc-stage')?.remove();
  const slots = kind === 'camp' ? AROUND_FIRE : ON_ROAD;
  const members = heroes.slice(0, 6).filter((m) => m && D.CLASSES[m.cls]);
  const figs = members.map((m, i) => figure(m, slots[i], {})).sort((a, b) => parseFloat(a.style.getPropertyValue('--y')) - parseFloat(b.style.getPropertyValue('--y')));
  const stage = h('div', { class: `sc-stage k-${kind} n${members.length} ${reduced() ? 'still' : ''}` }, h('i', { class: 'sc-warm' }), kind === 'camp' && hot ? fireEl() : null, ...figs);
  host.prepend(stage);
  return true;
}
