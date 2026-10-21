// The tabletop (Dave, Oct 2026): the top of the battle is a board game, not a 3D scene. Heroes and monsters are painted
// miniatures standing on a calm table. A piece does very little: a lunge when it strikes, a shake and a slight tilt with a
// small spark when it is hit, a topple when it falls. What happened (attack, block, final damage) is told by the round card
// (roundcard.js), not by animation.
//
// Time comes from the caller (`tween`, the stage's clock) so screenshots and tests can step it; nothing here uses rAF.
import { h, reduced } from '../dom.js';
import * as D from '../data.js';
import * as HK from './hudkit.js';
import * as E from '../engine.js';
import { monsterOf } from '../campaigns.js';

// How big each monster stands next to a hero. Flattened (0.62 + 0.38 * size) so the biggest still fits the board.
const SIZE = {
  goblin: 0.72, wolf: 0.9, cultist: 1, ogre: 1.6, bigwheel: 1.6, mungo: 1.6, goblinking: 1.55,
  skeleton: 1, wraith: 1.15, spider: 0.75, bonewarden: 1.7, lich: 1.6,
  // The Act III foes, each with a painted miniature of its own.
  shieldbearer: 1, gloomstalker: 1, chainbinder: 1, dirgesinger: 1,
  ironwarden: 1.55, fallenchampion: 1.55,
  cinderling: 0.78, frostwhelp: 0.82, ashwyrm: 1.6, vharaxis: 1.7, goldbelly: 1.7, blazemorrow: 1.7,
  magpieking: 1.55, magpies: 0.9, foxrogue: 1,
  treant: 1.6, puffball: 0.85, raincloud: 0.88, bonfire: 0.86, wisp: 0.78, lampsnuffer: 1.55,
  moonjelly: 0.85, visitor: 0.9, hedgeboar: 0.95, silkwood: 1.65, gargoyle: 0.95, yeti: 1.6,
  direbear: 1.6, tuskraider: 1.0, tuskwarlord: 1.6, barrowrider: 1.7, stormtyrant: 1.55,
  hivedrone: 0.78, hivequeen: 1.7, nightblade: 1.0, basilisk: 0.95, slagcolossus: 1.7, frostgiant: 1.7,
};
const REL_MAX = 0.62 + 0.38 * 1.7;
export const relOf = (id) => (0.62 + 0.38 * (SIZE[id] || 1)) / REL_MAX; // 'hero' is 1.0

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeIO = (k) => (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2);

// Party board: waiting minis sit at half size; a locked mini steps up to its target. Replay of a
// round is paced to about 15–20 seconds so each hero's strike, then each monster's answer, is readable.
export const WAIT_SCALE = 0.5;
const ANIM_BEAT = 0.85; // typical lunge + hit; remaining time is a pause so initiative order is clear
export function replayPace(n, { reduced: still = false, target = 17 } = {}) {
  const actors = Math.max(1, n | 0);
  if (still) return { intro: 0.35, gap: 0.15, close: 0.25, beat: 0.5 };
  const intro = 1.8; const close = 0.7; const lo = 15; const hi = 19;
  let gap = (target - intro - close) / actors - ANIM_BEAT;
  gap = clamp(gap, 0.5, 2.8);
  let total = intro + close + actors * (ANIM_BEAT + gap);
  if (total < lo) gap += (lo - total) / actors + 0.02;
  total = intro + close + actors * (ANIM_BEAT + gap);
  if (total > hi) gap = Math.max(0.45, (hi - intro - close) / actors - ANIM_BEAT);
  return { intro, gap, close, beat: ANIM_BEAT + gap };
}
// Who stands in the wait zone vs who has stepped up to a monster. `strikes` (a round report) wins
// during replay, because the table has already cleared each fighter's `locked` flag.
export function stanceOf(fighters, enemies, { strikes } = {}) {
  const byName = {};
  if (strikes) for (const s of strikes) { if (s?.name && s.targetUid) byName[s.name] = s.targetUid; }
  return (fighters || []).map((f, i) => {
    const e = enemies?.[f.target];
    const uid = byName[f.hero?.name] || (f.locked && !f.skipped && e?.uid) || null;
    const locked = strikes ? !!byName[f.hero?.name] : !!(f.locked && !f.skipped && uid);
    return { i, name: f.hero?.name, locked, uid: locked ? uid : null, down: (f.hp || 0) <= 0 };
  });
}

// Spark colours by what happened.
const SPARK = { hit: '#ffd27a', pierce: '#ff8a1a', block: '#7ab4ff', heal: '#6aff9a', magic: '#c08cff', fire: '#ff6a2a', gold: '#ffd23d', buff: '#ffe9a0' };

// The plan on a monster's plaque: one word (the move's name) and the dice it rolls for it, like "2×d8" (a multiplier on its power die).
// Hits show the red attack sign, guards the blue shield; moves with no dice (a howl, a wind-up) show just the word.
const DICE_VERBS = new Set(['strike', 'pierce', 'drain', 'pilfer', 'breath', 'guard', 'ward', 'mend']);
export function planOf(e, v) {
  const i = e.intent; if (!i) return null;
  const raw = String(i.n || v.title || '').trim();
  const words = raw.split(/\s+/);
  // a long two-word move reads as its most telling word (Raise Dead -> RAISE, Fire Ward -> WARD, Gold Shield -> SHIELD): the longest, the last on a tie
  const word = words.length > 1 && raw.length > 8 ? words.reduce((best, w) => (w.length >= best.length ? w : best), '') : raw;
  // "6+d8": its base, then the die it rolls (2×d8 when the move rolls it twice over). No base shows just the die.
  const base = E.intentBase(e, i); const die = i.m && e.powerDie ? E.diceText(E.diceOf(e, i), e.powerDie) : ''; // 2+3d8: its fight bonus is rolled as dice
  const dice = DICE_VERBS.has(i.v) && (die || base) ? `${base > 0 && die ? `${base}+` : base > 0 ? base : ''}${die}` : '';
  return { word: word.toUpperCase(), dice, icon: v.icon, tone: v.tone };
}

// Shrink the plan's word until it fits beside its dice (a long word like FIRE WARD next to 2×d8 on a narrow plaque).
function fitPlan(chip) {
  const w = chip?.querySelector('.fb-word'); if (!w || !chip.clientWidth) return;
  w.style.fontSize = ''; let fs = parseFloat(getComputedStyle(w).fontSize) || 11; let n = 0;
  while (w.scrollWidth > w.clientWidth + 0.5 && fs > 6 && n++ < 30) { fs -= 0.4; w.style.fontSize = `${fs.toFixed(1)}px`; }
}

// ------------------------------------------------------------------------------------------ one piece
class Piece {
  constructor(fb, { kind, key, img, name, rel = 1, hue = null, flip = false }) {
    this.fb = fb; this.kind = kind; this.key = key; this.name = name; this.p = {}; this.dead = false; this.rel = rel; this.flip = flip;
    this.img = h('img', { class: 'fb-img', src: img, alt: name, draggable: 'false', decoding: 'async' });
    this.mark = h('i', { class: 'fb-mark', 'aria-hidden': 'true' });
    this.ring = h('i', { class: 'fb-ring', 'aria-hidden': 'true' });
    this.chev = h('i', { class: 'fb-chev', 'aria-hidden': 'true' });
    this.el = h('button', { type: 'button', class: 'fb-pc', 'aria-label': name, style: hue ? { '--hue': hue } : null }, this.mark, this.ring, this.img, this.chev);
    this.el.style.setProperty('--rel', String(rel));
  }
  // rotate and lunge around the painted disc, not the image centre
  seat(base) {
    if (!base) return this;
    this.img.style.transformOrigin = `${((this.flip ? 1 - base.x : base.x) * 100).toFixed(2)}% ${((base.y - 0.07) * 100).toFixed(2)}%`;
    return this;
  }
  // the piece's centre and head, in board pixels
  rect() { const b = this.fb.el.getBoundingClientRect(); const r = this.img.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height, cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2, top: r.top - b.top, bottom: r.bottom - b.top }; }
  set(name, v) { if (v) this.p[name] = v; else delete this.p[name]; this.render(); }
  render() {
    let x = 0; let y = 0; let r = 0; let s = 1; let a = 1; let br = 1;
    for (const v of Object.values(this.p)) { x += v.x || 0; y += v.y || 0; r += v.r || 0; s *= v.s ?? 1; a *= v.a ?? 1; br *= v.b ?? 1; }
    // mirrored when the painting looks the other way (look on the class/monster; front-facing pieces stay)
    this.img.style.transform = x || y || r || s !== 1 || this.flip ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(this.flip ? -s : s).toFixed(3)}, ${s.toFixed(3)})` : '';
    this.img.style.opacity = a < 1 ? a.toFixed(2) : '';
    this.img.style.filter = br !== 1 ? `brightness(${br.toFixed(2)})` : '';
  }
  // a short push toward a target and back, with a little lean. `onImpact` fires at the far point.
  async lunge(target, onImpact, { big = false } = {}) {
    const a = this.rect(); const t = target ? target.rect() : { cx: a.cx + (this.kind === 'hero' ? 80 : -80) };
    const g = big ? 1.7 : 1; // a big blow: a longer wind back, a deeper lunge
    const dx = clamp((t.cx - a.cx) * 0.24 * g, -34 * g, 34 * g); const dir = Math.sign(dx) || 1; let fired = false;
    await this.fb.tween(big ? 0.55 : 0.36, (k) => {
      const p = k < 0.38 ? easeOut(k / 0.38) : 1 - easeIO((k - 0.38) / 0.62);
      if (k >= 0.38 && !fired) { fired = true; onImpact?.(); }
      this.set('lunge', { x: dx * p, y: -7 * g * p, r: dir * 6 * g * p, s: 1 + 0.05 * g * p });
    });
    if (!fired) onImpact?.();
    this.set('lunge', null);
  }
  // hit: a shake with a slight tilt, a flash, and a spark
  async hit(power = 0.5, kind = 'hit') {
    this.spark(kind, power);
    const amp = 4 + power * 7; const tilt = 3 + power * 4; const dir = Math.random() < 0.5 ? -1 : 1;
    await this.fb.tween(0.4, (k) => {
      const d = (1 - k) ** 1.6;
      this.set('hit', { x: Math.sin(k * 30) * amp * d, r: dir * Math.sin(k * 20) * tilt * d, b: 1 + 0.9 * d * d });
    });
    this.set('hit', null);
  }
  // the blow was soaked: a small step back and a blue ring
  async guard() {
    this.spark('block', 0.6);
    await this.fb.tween(0.3, (k) => { const d = Math.sin(k * Math.PI); this.set('guard', { s: 1 + 0.06 * d, y: -2 * d }); });
    this.set('guard', null);
  }
  async heal() {
    this.spark('heal', 0.7);
    await this.fb.tween(0.4, (k) => { const d = Math.sin(k * Math.PI); this.set('heal', { y: -6 * d, b: 1 + 0.35 * d }); });
    this.set('heal', null);
  }
  async glow(kind = 'buff') {
    this.spark(kind, 0.5);
    await this.fb.tween(0.45, (k) => { const d = Math.sin(k * Math.PI); this.set('glow', { b: 1 + 0.5 * d, s: 1 + 0.04 * d }); });
    this.set('glow', null);
  }
  // an angry shake in place (a boss changing its ways)
  async rage() {
    this.el.classList.add('raged');
    await this.fb.tween(0.6, (k) => { const d = 1 - k; this.set('rage', { x: Math.sin(k * 44) * 4 * d, b: 1 + 0.6 * d, s: 1 + 0.08 * Math.sin(k * Math.PI) }); });
    this.set('rage', null);
  }
  async appear() {
    this.set('appear', { a: 0, s: 0.7 });
    await this.fb.tween(0.4, (k) => this.set('appear', { a: easeOut(k), s: 0.7 + 0.3 * easeOut(k), y: -10 * (1 - k) }));
    this.set('appear', null);
  }
  // knocked over like a board-game piece, then it lies there, dim
  async fall(dir = 1, dur = 0.7) {
    this.dead = true; this.el.classList.add('down'); this.spark('hit', 0.9);
    await this.fb.tween(dur, (k) => { const e = easeOut(k); this.set('fall', { r: dir * 82 * e, y: 14 * e, x: dir * 8 * e, a: 1 - 0.62 * e, b: 1 - 0.3 * e }); });
  }
  async hop() { await this.fb.tween(0.5, (k) => this.set('hop', { y: -Math.abs(Math.sin(k * Math.PI * 2)) * 9 })); this.set('hop', null); }
  stand() { this.dead = false; this.p = {}; this.el.classList.remove('down', 'raged'); this.render(); }
  spark(kind = 'hit', power = 0.5) { this.fb.spark(this, kind, power); }
  sparkle(color) { this.fb.sparkle(this, color); }
  num(text, kind = 'dmg', opts) { this.fb.num(this, text, kind, opts); }
}

// A place name on the board: data-place plus the painted backdrop (felt stays the fallback).
export function applyPlace(el, place) {
  const look = D.placeLook(place);
  if (look.slug) el.dataset.place = look.slug;
  else { delete el.dataset.place; el.style.removeProperty('--place-img'); }
  el.classList.toggle('wx-ash', look.weather === 'ash');
  el.classList.toggle('wx-crypt', look.weather === 'crypt');
  el.classList.toggle('wx-ember', look.weather === 'ember');
  return look;
}
export function atmoLayers(weather) {
  if (weather === 'ash') {
    const embers = Array.from({ length: 8 }, (_, i) => h('i', { class: 'fb-ember', style: { '--x': `${(i * 29 + 8) % 94}%`, '--y': `${30 + ((i * 47) % 55)}%`, '--d': `${(i * 1.4) % 8}s`, '--t': `${8 + (i * 2) % 6}s`, '--s': String(0.45 + ((i * 11) % 6) / 10) } }));
    return [h('i', { class: 'fb-fog a' }), h('i', { class: 'fb-fog b' }), ...embers];
  }
  if (weather === 'crypt') {
    const dust = Array.from({ length: 7 }, (_, i) => h('i', { class: 'fb-dust', style: { '--x': `${(i * 41 + 7) % 94}%`, '--y': `${12 + ((i * 29) % 70)}%`, '--d': `${(i * 1.3) % 8}s`, '--t': `${11 + (i * 2) % 9}s`, '--s': String(0.4 + ((i * 13) % 5) / 10) } }));
    return [h('i', { class: 'fb-flicker' }), ...dust];
  }
  if (weather === 'ember') {
    const sparks = Array.from({ length: 12 }, (_, i) => h('i', { class: 'fb-ember fb-spark', style: { '--x': `${(i * 23 + 5) % 96}%`, '--y': `${18 + ((i * 37) % 70)}%`, '--d': `${(i * 0.9) % 6}s`, '--t': `${5 + (i * 1.3) % 7}s`, '--s': String(0.55 + ((i * 9) % 7) / 10) } }));
    return [h('i', { class: 'fb-fog a ember' }), h('i', { class: 'fb-fog b ember' }), h('i', { class: 'fb-flicker ember' }), ...sparks];
  }
  return [];
}

// ------------------------------------------------------------------------------------------ the board
export function createFlat({ host, tween, wait, enemies, heroes, quest, onPick, onInfo }) {
  const fb = { tween, wait, pieces: new Map(), foes: new Map(), heroes: [], active: 0 };
  const camp = heroes[0]?.campaign;
  const act = quest?.act || 1; const boss = enemies.some((e) => e.tier === 'boss');
  const look = D.placeLook(quest?.place);
  const motes = Array.from({ length: 9 }, (_, i) => h('i', { class: 'fb-mote', style: { '--x': `${(i * 37 + 11) % 96}%`, '--y': `${20 + ((i * 53) % 60)}%`, '--d': `${(i * 1.7) % 9}s`, '--t': `${9 + (i * 3) % 7}s`, '--s': String(0.5 + ((i * 17) % 6) / 8) } }));
  const table = h('div', { class: 'fb-table' }, h('i', { class: 'fb-lamp' }), ...motes, h('i', { class: 'fb-rim top' }), h('i', { class: 'fb-rim bot' }));
  const atmo = h('div', { class: 'fb-atmo', 'aria-hidden': 'true' }, ...atmoLayers(look.weather));
  const party = heroes.length > 1;
  const heroSide = h('div', { class: `fb-side heroes${party ? ' wait' : ''}`, 'aria-label': party ? 'Waiting to lock in' : null });
  const foeSide = h('div', { class: 'fb-side foes' });
  const field = h('div', { class: 'fb-field' }, heroSide, foeSide);
  const fx = h('div', { class: 'fb-fx', 'aria-hidden': 'true' });
  const flashEl = h('i', { class: 'fb-flash', 'aria-hidden': 'true' });
  const links = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  links.setAttribute('class', 'fb-links');
  links.setAttribute('aria-hidden', 'true');
  fb.el = h('div', { class: `fb act-${act}${boss ? ' boss' : ''}${party ? ' party' : ''}`, 'data-heroes': String(heroes.length) }, table, atmo, field, fx, flashEl);
  applyPlace(fb.el, quest?.place);
  if (party) fb.el.append(links);
  host.prepend(fb.el);

  // ---- heroes
  heroes.forEach((hero, i) => {
    const look = D.lookOf(heroes, i);
    const k = D.CLASSES[hero.cls];
    const def = look || k;
    const pc = new Piece(fb, { kind: 'hero', key: `hero:${i}`, img: def.img || k.img, name: hero.name, rel: relOf('hero'), hue: look?.hue || null, flip: D.needsFlip(def, 'right') }).seat(def.imgBase || k.imgBase); // every hero looks toward the monsters
    pc.el.classList.add('hero');
    const hp = h('i', { class: 'fb-hp' }, h('i', { class: 'fb-hp-ghost' }), h('i', { class: 'fb-hp-fill' }));
    const card = h('div', { class: 'fb-card hero' }, h('b', { class: 'fb-name' }, hero.name), heroes.length > 1 ? hp : null);
    const slot = h('div', { class: `fb-slot hero${party ? ' wait' : ''}`, 'data-i': String(i) }, pc.el, card);
    pc.slot = slot; pc.card = card; pc.hpEl = hp; pc.idx = i; pc.home = heroSide;
    heroSide.append(slot); fb.heroes.push(pc);
  });

  // ---- monsters
  const cardOf = (e) => {
    const core = e.name.replace(/^The /, '').split(/,? the /)[0]; // The Magpie King → Magpie King; Vharaxis, the Ember Queen → Vharaxis
    const shown = core.length > 11 ? core.split(' ').pop() : core;
    const name = h('b', { class: `fb-name${shown.length > 10 ? ' long xl' : shown.length > 8 ? ' long' : ''}`, title: e.name }, shown); // long names read as their last word (Skulker)
    const hpNum = h('i', { class: 'fb-hpn' });
    // the far right of the health bar says how it defends: [shield d8], or a crossed-out shield when it has nothing to block with
    const def = h('i', { class: 'fb-def' });
    const hp = h('i', { class: 'fb-hp' }, h('i', { class: 'fb-hp-ghost' }), h('i', { class: 'fb-hp-fill' }), hpNum, def);
    const intent = h('div', { class: 'fb-intent' });
    return { el: h('div', { class: 'fb-card foe' }, name, hp, intent), name, hp, hpNum, intent, def };
  };
  fb.addFoe = (e) => {
    const def = monsterOf(e.id, camp) || D.MONSTERS[e.id] || {};
    const pc = new Piece(fb, { kind: 'foe', key: e.uid, img: def.img || 'assets/miniatures/goblin.webp', name: e.name, rel: relOf(e.id), flip: D.needsFlip(def, 'left') }).seat(def.imgBase); // every monster looks toward the heroes
    pc.el.classList.add('foe', `tier-${e.tier}`); pc.el.dataset.uid = e.uid;
    const c = cardOf(e); pc.c = c;
    const pair = h('div', { class: 'fb-pair', 'aria-hidden': 'true' });
    const slot = h('div', { class: `fb-slot foe tier-${e.tier}`, 'data-uid': e.uid }, pc.el, pair, c.el);
    pc.slot = slot; pc.uid = e.uid; pc.pair = pair;
    const tap = () => onPick?.(e.uid);
    pc.el.addEventListener('click', tap); c.el.addEventListener('click', tap);
    // a small gold "i" on the plaque: tap it to read about this monster (tapping the chosen one again does the same)
    const info = h('button', { type: 'button', class: 'fb-info', 'aria-label': `About ${e.name}`, onclick: (ev) => { ev.stopPropagation(); onInfo?.(e.uid); } }, 'i');
    c.el.append(info);
    foeSide.append(slot); fb.pieces.set(e.uid, pc); fb.foes.set(e.uid, pc);
    fb.layout();
    return pc;
  };
  fb.foe = (uid) => fb.foes.get(uid);
  fb.hero = (i) => fb.heroes[i] || fb.heroes[0];
  fb.heroByName = (name) => fb.heroes.find((p) => p.name === name) || fb.heroes[0];

  // ---- sizes: the field height sets the hero's height; the rest follow
  fb.layout = () => {
    const r = field.getBoundingClientRect(); if (!r.height) return;
    const cardH = Math.min(70, Math.max(46, r.height * 0.3));
    const pieceH = Math.max(60, r.height - cardH - 6);
    fb.el.style.setProperty('--ph', `${Math.round(pieceH)}px`);
    fb.el.style.setProperty('--foes', String(Math.max(1, foeSide.children.length)));
  };
  fb.ro = new ResizeObserver(() => { fb.layout(); fb.paintLinks?.(); for (const pc of fb.foes.values()) fitPlan(pc.c?.intent); }); fb.ro.observe(field);

  // ---- party: wait on the left at half size; lock in and step up beside the chosen monster
  const pairOf = (uid) => fb.foes.get(uid)?.pair;
  fb.paintLinks = () => {
    while (links.firstChild) links.removeChild(links.firstChild);
    if (!party || reduced()) return;
    const W = fb.el.clientWidth || 1; const H = fb.el.clientHeight || 1;
    links.setAttribute('viewBox', `0 0 ${W} ${H}`);
    for (const pc of fb.heroes) {
      if (!pc.slot.classList.contains('locked') || pc.dead) continue;
      const foe = fb.foes.get(pc._uid); if (!foe || foe.dead) continue;
      const a = pc.rect(); const t = foe.rect();
      const hue = getComputedStyle(pc.el).getPropertyValue('--hue').trim() || '#ffd23d';
      const mk = (w, op) => {
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('x1', (a.cx + a.w * 0.18).toFixed(1)); ln.setAttribute('y1', (a.top + a.h * 0.55).toFixed(1));
        ln.setAttribute('x2', (t.cx - t.w * 0.12).toFixed(1)); ln.setAttribute('y2', (t.top + t.h * 0.55).toFixed(1));
        ln.setAttribute('stroke', hue); ln.setAttribute('stroke-width', String(w)); ln.setAttribute('stroke-opacity', String(op));
        ln.setAttribute('stroke-linecap', 'round');
        links.append(ln);
      };
      mk(7, 0.22); mk(2, 0.9);
    }
  };
  const park = (pc, dest, row) => {
    dest.append(pc.slot);
    pc._uid = row.uid || null;
    pc.slot.classList.toggle('wait', !row.locked);
    pc.slot.classList.toggle('locked', !!row.locked);
    pc.slot.classList.toggle('committed', !!row.locked);
    pc.el.classList.toggle('committed', !!row.locked);
    const foe = row.uid && fb.foes.get(row.uid);
    pc.el.setAttribute('aria-label', row.locked && foe ? `${pc.name}, locked in on ${foe.name}` : `${pc.name}${row.down ? ', down' : ', waiting'}`);
  };
  // FLIP: measure, reparent, tween the leftover offset away with the same ease as a lunge.
  const stepTo = async (pc, dest, row) => {
    if (pc.slot.parentNode === dest && !!row.locked === pc.slot.classList.contains('locked')) return;
    if (reduced()) { park(pc, dest, row); return; }
    const from = pc.rect();
    park(pc, dest, row);
    const to = pc.rect();
    const dx = from.cx - to.cx; const dy = from.cy - to.cy;
    if (Math.hypot(dx, dy) < 3) return;
    pc.set('lunge', { x: dx, y: dy });
    await fb.tween(0.36, (k) => {
      const p = 1 - easeOut(k);
      pc.set('lunge', { x: dx * p, y: dy * p });
      if (k === 0 || k > 0.2) fb.paintLinks();
    });
    pc.set('lunge', null);
  };
  fb.setPartyStance = (rows) => {
    if (!party) return;
    const jobs = [];
    for (const row of rows || []) {
      const pc = fb.heroes[row.i]; if (!pc) continue;
      const dest = row.locked && pairOf(row.uid) ? pairOf(row.uid) : pc.home;
      jobs.push(stepTo(pc, dest, row));
    }
    Promise.all(jobs).then(() => fb.paintLinks());
  };

  // ---- target ring and cards
  fb.setTarget = (uid, show = true) => { for (const [id, pc] of fb.foes) { const on = show && id === uid && !pc.dead; pc.el.classList.toggle('targeted', on); pc.slot.classList.toggle('targeted', on); } };
  fb.setActive = (i) => { fb.active = i; fb.heroes.forEach((pc, k) => { pc.slot.classList.toggle('active', k === i); pc.slot.classList.toggle('back', k !== i); }); };
  fb.paintHero = (i, hp, maxHp, down = false) => {
    const pc = fb.heroes[i]; if (!pc) return; const k = clamp(hp / Math.max(1, maxHp), 0, 1);
    if (pc.hpEl) pc.hpEl.querySelector('.fb-hp-fill').style.width = `${k * 100}%`;
    pc.slot.classList.toggle('low', k <= 0.3 && hp > 0);
    if (down && !pc.dead) pc.fall(-1);
  };
  fb.paintFoe = (e, { intents = true, targeted = false } = {}) => {
    const pc = fb.foes.get(e.uid); if (!pc) return; const c = pc.c;
    const dead = e.hp <= 0; const k = clamp(e.hp / Math.max(1, e.maxHp), 0, 1);
    c.hp.querySelector('.fb-hp-fill').style.width = `${k * 100}%`;
    const ghost = c.hp.querySelector('.fb-hp-ghost'); if (k * 100 >= parseFloat(ghost.style.width || '100')) ghost.style.width = `${k * 100}%`; else { clearTimeout(c.gt); c.gt = setTimeout(() => { ghost.style.width = `${k * 100}%`; }, 420); }
    c.hpNum.textContent = String(Math.max(0, Math.ceil(e.hp)));
    if (c.defSig !== (e.armor ? 'a' : '') + (e.faces?.length || 0)) { // its defence (guard die, armour, or none) does not change with the round
      c.defSig = (e.armor ? 'a' : '') + (e.faces?.length || 0);
      const d = monsterOf(e.id, camp) || D.MONSTERS[e.id] || {}; const faces = e.faces || d.faces || []; const armor = e.armor || d.armor; const size = e.powerDie || d.power;
      const guard = faces.some((f) => ['guard', 'ward'].includes(f.v)); const phase = faces.some((f) => f.v === 'phase');
      const txt = guard ? `d${size}` : armor ? `${armor.n}d${armor.s}` : '';
      c.def.className = `fb-def${txt || phase ? '' : ' none'}`;
      c.def.title = txt ? `Defends with ${txt}` : phase ? 'Slips out of reach: only pierce hurts it' : 'No defence: nothing soaks your attack';
      c.def.replaceChildren(HK.icon(phase && !txt ? 'phase' : 'block'), ...(txt ? [h('b', {}, txt)] : []));
    }
    c.hp.classList.toggle('low', k > 0 && k <= 0.3);
    pc.slot.classList.toggle('dead', dead); pc.slot.classList.toggle('raged', !!e.raged);
    pc.el.classList.toggle('targeted', targeted && !dead); pc.slot.classList.toggle('targeted', targeted && !dead);
    // the plaque's third line is the whole plan: the move's name in one word, and the dice it will roll (red = it hits, blue = it guards)
    const v = !dead && intents ? HK.intentView(e) : null;
    const plan = v ? planOf(e, v) : null;
    const sig = plan ? [plan.tone, plan.word, plan.dice, plan.icon].join('|') : '';
    if (c.sig !== sig) {
      c.sig = sig;
      c.intent.className = `fb-intent${plan ? ` tone-${plan.tone}` : ''}`;
      c.intent.replaceChildren(...(plan ? [HK.icon(plan.icon), h('b', { class: `fb-word${plan.word.length > 8 ? ' xs' : plan.word.length > 6 ? ' sm' : ''}` }, plan.word), plan.dice ? h('small', { class: 'fb-dice' }, plan.dice) : null].filter(Boolean) : []));
      requestAnimationFrame(() => fitPlan(c.intent));
      pc.el.setAttribute('aria-label', plan ? `${e.name}, ${Math.max(0, e.hp)} of ${e.maxHp} health. Plans ${plan.word}${plan.dice ? `, rolling ${plan.dice}` : ''}.` : `${e.name}${dead ? ', defeated' : ''}`);
    }
    return pc;
  };

  // ---- effects
  const at = (pc, fy = 0.45) => { const r = pc.rect(); return { x: r.cx, y: r.top + r.h * fy, r }; };
  fb.spark = (pc, kind = 'hit', power = 0.5, fy = 0.42) => {
    const { x, y } = at(pc, fy); const col = SPARK[kind] || SPARK.hit; const n = kind === 'heal' ? 5 : 8;
    const el = h('div', { class: `fb-spark ${kind}`, style: { left: `${x}px`, top: `${y}px`, '--c': col, '--p': String(0.7 + power * 0.7) } },
      h('u', { class: 'fb-shock' }), h('b', { class: 'fb-spark-core' }), ...Array.from({ length: n }, (_, i) => h('i', { style: { '--a': `${(360 / n) * i + (kind === 'heal' ? 0 : 12)}deg`, '--d': `${0.8 + ((i * 37) % 5) / 10}` } })));
    fx.append(el);
    tween(kind === 'heal' ? 0.7 : 0.42, (k) => { el.style.setProperty('--k', k.toFixed(3)); el.style.opacity = String(1 - k * k); }).then(() => el.remove());
  };
  // magic: a little burst of twinkling stars in the hero's own colour, drifting up as they fade
  fb.sparkle = (pc, color = SPARK.magic) => {
    const { x, y } = at(pc, 0.4); const n = 14;
    const el = h('div', { class: 'fb-sparkle', style: { left: `${x}px`, top: `${y}px`, '--c': color } },
      ...Array.from({ length: n }, (_, i) => h('i', { style: { '--a': `${(360 / n) * i + ((i * 53) % 30)}deg`, '--r': `${34 + ((i * 41) % 36)}px`, '--z': String(0.6 + ((i * 7) % 5) / 6) } }, '✦')));
    fx.append(el);
    tween(0.9, (k) => { el.style.setProperty('--k', k.toFixed(3)); el.style.opacity = String(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4); }).then(() => el.remove());
  };
  fb.num = (pc, text, kind = 'dmg', { dx = 0, dy = 0 } = {}) => {
    const { x, r } = at(pc); const W = fb.el.clientWidth || 360; const long = String(text).length > 8;
    const mag = Number(String(text).replace(/[^0-9]/g, '')) || 0;
    const el = h('div', { class: `fb-num ${kind}${long ? ' long' : ''}${mag >= 25 && !long ? ' big huge' : mag >= 10 && !long ? ' big' : ''}`, style: { left: `${x + dx}px`, top: `${Math.max(2, r.top + 6 + dy)}px` } }, HK.rich(text));
    fx.append(el);
    const half = (el.offsetWidth || 40) / 2 + 4; el.style.left = `${clamp(x + dx, half, W - half)}px`; // never off the edge of the table
    // stays up five seconds (Dave) so it can be read: it pops in, drifts up slowly, and fades only at the end
    tween(5, (k) => { el.style.transform = `translate(-50%, ${(-46 * easeOut(k)).toFixed(1)}px) scale(${(k < 0.04 ? 0.6 + k * 10 : 1).toFixed(2)})`; el.style.opacity = String(k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2); }).then(() => el.remove());
  };
  // the whole table jolts (a big hit, a kill, a crit); quiet when the player asks for less motion
  fb.shake = (amt = 0.5) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const A = 5 + amt * 9;
    tween(0.3 + amt * 0.18, (k) => { const d = (1 - k) ** 2; fb.el.style.translate = `${(Math.sin(k * 47) * A * d).toFixed(1)}px ${(Math.cos(k * 39) * A * 0.55 * d).toFixed(1)}px`; }).then(() => { fb.el.style.translate = ''; });
  };
  // a red edge flash when a hero is hurt, a warm one for a triple
  fb.flash = (color = '#ff3a2a', amt = 0.4) => {
    flashEl.style.setProperty('--fc', color);
    tween(0.4, (k) => { flashEl.style.opacity = String(amt * (1 - k) ** 1.5); }).then(() => { flashEl.style.opacity = '0'; });
  };
  fb.dim = (on) => fb.el.classList.toggle('dim', !!on);

  fb.dispose = () => { fb.ro?.disconnect(); fb.el.remove(); };
  fb.setActive(0);
  for (const e of enemies) fb.addFoe(e);
  return fb;
}
