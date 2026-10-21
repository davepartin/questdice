// The 3D solo battle: a controller that drives the rules (engine.js) and performs the result on the
// stage (arena, hero, monsters, dice tray, vfx) with a DOM heads-up display on top.
//
// ui.js calls start(ctx) when a solo quest begins. This module owns Reset -> Roll -> Shape -> Lock ->
// Resolve until the fight ends, then hands back to ui.js (ctx.showVictory / ctx.defeat).
import { h, $, $$, toast, buzz, reduced } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as V from '../view.js';
import * as PW from './powers.js';
import * as HK from './hudkit.js';
import * as Coach from '../coach.js';
import { sfx, music } from '../audio.js';
import { world } from './world.js';
import * as THREE from 'three';
import { petImg } from './pets.js';
import * as Sess from '../session.js';
import { createFlat, replayPace, stanceOf } from './flat.js';
import { monsterOf } from '../campaigns.js';
import { roundCard, noDefence } from './roundcard.js';
import { dieSpecs, faceImage } from '../gfx/dice/dice.js';

let C = null;                // context from ui.js
const B = {
  bw: null, b: null, hero: null, quest: null, root: null, plates: new Map(), sel: new Set(), target: 0, focus: null,
  straight: 'atk', busy: false, lastRep: null, ended: false, ro: null, off: null, fb: null, card: null,
};
export const battleState = B;

const wait = (s) => world.stage.wait(s);
const campOf = () => B.hero?.campaign || B.b?.fighters?.[0]?.hero?.campaign;
const foeDef = (e) => (e && (monsterOf(e.id, campOf()) || D.MONSTERS[e.id])) || {};

const EPITHET = {
  goblinking: ['THE GOBLIN KING', 'Lord of Stolen Things'], ogre: ['HILL OGRE', 'Breaker of Gates'], lich: ['THE HOLLOW LICH', 'The Dead Organize'],
  bonewarden: ['BONE WARDEN', 'Keeper of the Stair'],
  vharaxis: ['VHARAXIS', 'The Ember Queen'], goldbelly: ['DUCHESS GOLDBELLY', 'The Golden Hoard'],
  blazemorrow: ['THE DOWAGER BLAZEMORROW', 'End of the Song'], fallenchampion: ['THE FALLEN CHAMPION', 'Oaths Unkept'],
  ashwyrm: ['ASHMAW', 'The Wyrm of the Peaks'], magpieking: ['THE MAGPIE KING', 'One for Sorrow'],
  silkwood: ['MADAM SILKWOOD', 'The Great Weaver'],
  treant: ['THE WRATH-OAK', 'A Thousand Years of Fury'], lampsnuffer: ['THE LAMP-SNUFFER', 'The Dark That Ate the Vault'],
  yeti: ['BIG MURIEL', 'The Yeti'], direbear: ['GRAVELHIDE', 'The Dire Bear'],
  tuskwarlord: ['GORVASH', 'Warlord of the Ash-Tusks'], barrowrider: ['THE BARROW RIDER', 'From the Ossuary Gate'],
  stormtyrant: ['VEXMOR', 'The Storm-Tyrant'], hivequeen: ['THE GLASS-HIVE QUEEN', 'Where One Lands, the Hive Follows'],
  slagcolossus: ['THE SLAG COLOSSUS', 'Outlived Its Maker'], frostgiant: ['HRIMVALD', 'The Rime-Giant'],
};

// ------------------------------------------------------------------------------------------ start / stop
export async function start(ctx) {
  if (B.starting && !B.ended) return; // a second tap on the quest card while the table is still being set up
  try { await startTable(ctx); } catch (e) { B.starting = false; throw e; }
}
async function startTable(ctx) {
  C = ctx;
  const { S } = C;
  B.net = !!ctx.net; B.starting = true; B.resolving = false; B.lastSig = '';
  B.b = S.battle; B.party = !!S.battle.fighters; B.hero = B.party ? S.battle.fighters[0].hero : S.hero; B.active = 0;
  if (B.net) { B.active = Sess.index(); refocus(); } B.quest = S.quest; B.ended = false; B.busy = true; B.sel = new Set(); B.resets = 0; B.target = 0; B.lastRep = null; B.straight = 'atk'; B.shownRound = 0; B.fresh = null;
  const layer = $('#b3'); layer.replaceChildren(); layer.className = 'b3-layer on loading';
  layer.append(h('div', { class: 'b3-loading' }, h('div', { class: 'b3-spin' }), h('p', {}, 'Setting up the table…')));
  $('#app').classList.add('hidden');
  document.body.classList.add('in-battle');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let the loader paint before the dice table is built
  const b = B.b;
  const bw = await world.buildTable({ hero: B.hero });
  B.bw = bw; B.trayBase = bw.tray.object.scale.x;
  if (B.net || B.party) bw.setActiveHero(B.active, B.hero); // this phone's hero stands in front, and the dice table is theirs
  bw.tray.onPick = onPick;
  bw.tray.onSound = (kind, o) => { if (kind === 'hit') (sfx.dieHit || sfx.settle)?.(o?.speed); else (sfx.dieSettle || sfx.settle)?.(); };
  buildHud();
  if (C.tut) C.tut.attach({
    root: B.root, toast: (t) => toast(t),
    diePoint: (slot) => { const q = B.bw.tray.projectSlot?.(slot, { dy: 0.3 }); if (!q) return null; const r = B.bw.stage.canvas.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; },
    dieRadius: () => Math.max(26, Math.min(innerWidth, 520) * 0.085),
    unscript: () => { if (B.b) B.b.script = null; },
  });
  layer.classList.remove('loading');
  layer.querySelector('.b3-loading')?.remove();
  // Show the board once so the tray is not empty, dimmed, until the first roll.
  idleTray();
  world.stage.post.uniforms.uFade.value = 1;
  world.stage.fadeTo(0, 0.6);
  // the pieces are set down one after another
  for (const pc of B.fb.foes.values()) pc.set('appear', { a: 0 });
  await wait(0.2);
  for (const pc of B.fb.foes.values()) { pc.appear(); await wait(0.12); }
  // Boss / elite title card
  const big = b.enemies.find((e) => e.tier !== 'minion');
  if (big && EPITHET[big.id]) { titleCard(...EPITHET[big.id], big.tier); sfx.rage?.(); await wait(0.9); }
  await wait(0.5);
  B.busy = false;
  // the dice are the game: keep the grade clean (light bloom and vignette, no tilt blur, neutral tints, a bright exposure)
  world.stage.post.look({ bloom: 0.12, vignette: 0.26, grain: 0.015, aberration: 0, tilt: 0, sat: 1.12, contrast: 1.12, shadowTint: 0xffffff, highTint: 0xffffff, exposure: 1.12 });
  music.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  B.starting = false;
  if (B.net) return netSettle(); // a table already mid-round (coming back to it) shows its own state
  renderReset();
}

export function stop() {
  C?.tut?.detach?.();
  B.ended = true;
  B.fb?.dispose(); B.fb = null; B.card = null;
  const layer = $('#b3'); layer.className = 'b3-layer'; layer.replaceChildren();
  B.ro?.disconnect(); if (B.fit) window.removeEventListener('resize', B.fit);
  document.body.classList.remove('in-battle');
  $('#app').classList.remove('hidden');
}

// ------------------------------------------------------------------------------------------ HUD
// Layout lives in css/hud.css (phone: hero strip on top and stacked dock; landscape: side columns).
// Components are built once and updated in place so bars, gems and counts animate between states.
const banner = (text, kind) => { try { HK.banner($('#b3'), text, kind); } catch (e) { C.banner?.(text, kind); } };
const landscape = () => window.innerWidth / window.innerHeight >= 1.25;
// ---- beginner hints: one small card at a time, once per hero each, off when the player turns hints off
function hint(key) {
  const hero = B.hero; if (B.ended || !Coach.wantHint(hero, key) || (C.tut && !C.tut.off)) return;
  if (B.hud.coach.dataset.key) return; // one at a time
  const H = Coach.HINTS[key]; if (!H) return;
  const done = (off) => { Coach.seeHint(hero, key); if (off) Coach.setHints(false); B.hud.coach.dataset.key = ''; B.hud.coach.replaceChildren(); C.persist?.(); };
  B.hud.coach.dataset.key = key;
  B.hud.coach.replaceChildren(h('div', { class: 'b3-coachcard', role: 'note' }, HK.icon('shine'), h('div', { class: 'cc-tx' }, h('b', {}, H.title), h('p', {}, H.text)),
    h('div', { class: 'cc-act' }, h('button', { type: 'button', class: 'cc-ok', onclick: () => done(false) }, 'Got it'), h('button', { type: 'button', class: 'cc-off', onclick: () => done(true) }, 'Hints off'))));
}
function buildHud() {
  const layer = $('#b3');
  B.root = h('div', { class: 'b3' });
  const hud = B.hud = {};
  hud.menu = h('button', { class: 'b3-menu', type: 'button', onclick: () => C.menu(), 'aria-label': 'Menu' }, HK.icon('menu'));
  hud.place = h('small', {}); hud.round = h('b', {}); hud.score = h('span', { class: 'b3-score', 'aria-label': 'Battle points' }, h('i', {}, 'PTS'), h('b', {}, '0'));
  hud.again = h('button', { type: 'button', class: 'rc-again', hidden: true, 'aria-label': 'Show the last round again', onclick: () => showCard(B.lastCard) }, HK.icon('dice'), h('span', {}, 'Recap'));
  hud.top = h('div', { class: 'b3-top' }, hud.menu, h('div', { class: 'b3-round' }, hud.place, h('span', { class: 'b3-rline' }, hud.round, hud.score, hud.again)));
  hud.coach = h('div', { class: 'b3-coach' });
  hud.ribbon = h('div', { class: 'b3-ribbon' });
  hud.hero = buildHero();
  hud.therm = h('div', { class: 'b3-therm', 'aria-hidden': 'true' }, h('b', { class: 'th-n' }, '0'), h('div', { class: 'th-bar' }, h('i', { class: 'th-fill' })), h('span', { class: 'th-h' }, HK.icon('heart')));
  hud.magchip = h('div', { class: 'b3-magchip', title: 'Magic' }, HK.icon('magic'), h('b', {}, '0'));
  hud.goldchip = h('div', { class: 'b3-magchip b3-goldchip', title: 'Gold' }, HK.icon('gold'), h('b', {}, '0')); // your gold, above the magic (Dave)
  // the pet (Dave): off the board, a small badge by the gold and magic. Its die rolls once a round with the others and
  // cannot be rerolled: a bit of luck. Tap it to read what it rolled.
  // the game's difficulty, top right: the same chip as on the quest board (Dave)
  hud.diff = h('span', { class: 'sx-diffchip b3-diffchip' }, HK.icon('skull'), h('b', {}, ''));
  hud.petchip = h('button', { type: 'button', class: 'b3-petchip', hidden: true, 'aria-label': 'Your pet', onclick: () => petInfo() }, h('img', { class: 'pc-pic', alt: '', draggable: 'false' }), h('span', { class: 'pc-die' }));
  // on phones the line between the battlefield and the dice table is the hero's health bar
  hud.divider = h('div', { class: 'b3-divider', 'aria-hidden': 'true' }, h('span', { class: 'dv-h' }, HK.icon('heart')), h('b', { class: 'dv-n' }, '0'), h('div', { class: 'dv-bar' }, h('i', { class: 'dv-fill' })));
  hud.forecast = HK.forecastStrip();
  hud.caption = h('div', { class: 'b3-caption' });
  hud.cards = h('div', { class: 'b3-cards', role: 'group', 'aria-label': 'Magical powers' });
  // company games: the sheet toggles between your magical powers and team actions on a friend
  hud.tabs = B.party ? h('div', { class: 'sh-tabs', role: 'tablist' },
    h('button', { type: 'button', class: 'on', 'data-tab': 'powers', onclick: () => setSheetTab('powers') }, 'Magical powers'),
    h('button', { type: 'button', 'data-tab': 'team', onclick: () => setSheetTab('team') }, 'Team actions')) : h('b', {}, 'Magical powers');
  hud.sheet = h('div', { class: 'b3-sheet', role: 'dialog', 'aria-label': 'Magical powers' },
    h('div', { class: 'sh-head' }, hud.tabs, h('button', { type: 'button', class: 'sh-x sh-cancel', 'aria-label': 'Close the magic powers', onclick: () => togglePowers(false) }, '✕ Close')), hud.cards);
  hud.roster = null; // the company's name/points cards covered faces (Dave); names and health sit under each mini, and a locked-in hero steps up to its target
  hud.info = h('div', { class: 'b3-sheet b3-info', role: 'dialog', 'aria-label': 'Monster details' });
  hud.bar = h('div', { class: 'b3-bar' });
  // Any button on the bottom bar (Lock in, Magic powers, Roll, Reroll) first clears whatever window is up: the round recap, a monster's info sheet,
  // the magic powers sheet (Dave). Magic powers itself still opens and closes its own sheet.
  hud.bar.addEventListener('click', (ev) => {
    const btn = ev.target.closest?.('button'); if (!btn || btn.disabled) return;
    hideCard(); hud.info.classList.remove('open'); hud.info.replaceChildren();
    if (!btn.closest('.b3-powers') && B.sheetOpen) togglePowers(false);
  }, true);
  hud.dock = h('div', { class: 'b3-dock' }, hud.forecast, hud.caption, hud.bar);
  B.root.append(...[hud.top, hud.roster, hud.ribbon, hud.hero, hud.therm, hud.diff, hud.magchip, hud.goldchip, hud.petchip, hud.divider, hud.dock, hud.sheet, hud.info, hud.coach].filter(Boolean));
  // the table: flat painted pieces behind everything (flat.js)
  B.fb = createFlat({ host: B.root, tween: (dur, fn) => world.stage.tween({ dur }, fn), wait, enemies: B.b.enemies, heroes: B.party ? B.b.fighters.map((f) => f.hero) : [B.hero], quest: B.quest, onPick: selectTarget, onInfo: (uid) => { if (B.busy) return; const e = B.b.enemies.find((x) => x.uid === uid); if (e && e.hp > 0) showFoeInfo(e); } });
  const fit = () => {
    const r = hud.dock.getBoundingClientRect();
    B.root.style.setProperty('--hero-h', `${hud.hero.offsetHeight}px`);
    B.root.style.setProperty('--strip-bottom', `${Math.round(hud.top.getBoundingClientRect().bottom + 2)}px`);
    B.root.style.setProperty('--cards-bottom', `${Math.round(window.innerHeight - r.top + 8)}px`); B.root.style.setProperty('--dock-top', `${Math.round(window.innerHeight - r.top)}px`);
    document.body.style.setProperty('--b3-dock-top', `${Math.round(window.innerHeight - r.top)}px`); // battle notes (toasts) sit above the dice totals, never over the buttons
    B.root.style.setProperty('--bar-top', `${Math.round(window.innerHeight - hud.bar.getBoundingClientRect().top)}px`); // the recap may cover the counters and the hint, but never the buttons
    fitTray();
    B.fb?.layout();
  };
  B.fitOff?.(); B.fitOff = world.stage.onFrame(() => { if (!B.root?.isConnected) return; const sig = `${world.stage.width}|${world.stage.height}|${Math.round(hud.dock.getBoundingClientRect().top)}|${Math.round(hud.top.getBoundingClientRect().bottom)}|${world.stage.post.trayPass.enabled}|${!!B.hero?.pet}`; if (sig !== B.fitSig) { B.fitSig = sig; fit(); } });
  B.fit = fit; B.ro?.disconnect?.(); B.ro = new ResizeObserver(fit); B.ro.observe(hud.dock); B.ro.observe(hud.hero); window.addEventListener('resize', fit);
  layer.append(B.root);
  updatePlates();
  B.fb.setActive(B.active || 0);
  fit();
}

// Phones: make the dice board as wide as the screen. Lower the camera (foreshorten) until the full-width board also fits
// between the monster strip and the dock; the monsters stand behind it in whatever space is left.
function fitTray() {
  const bw = B.bw; if (!bw || !B.hud) return;
  if (landscape()) return fitTrayWide();
  const stage = world.stage; const W = stage.width; const H = stage.height;
  if (!stage.post.trayPass.enabled) return;
  const dockTop = B.hud.dock.getBoundingClientRect().top; const topBar = B.hud.top.getBoundingClientRect().bottom;
  const cam = stage.trayCamera; const obj = bw.tray.object; const v = new THREE.Vector3();
  let PITCH = (60 * Math.PI) / 180; const LOOK = new THREE.Vector3(0, 0.1, 0.1); const HALF = 1.78; const EDGE = 2.1;
  cam.fov = 34; cam.aspect = W / H; cam.clearViewOffset();
  const place = (d) => { cam.position.set(LOOK.x, LOOK.y + d * Math.sin(PITCH), LOOK.z + d * Math.cos(PITCH)); cam.lookAt(LOOK); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
  const pt = (x, y, z) => { v.set(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
  const want = dockTop + 54; const minLine = Math.max(topBar + 170, H * 0.34); // the table's front edge sits just above the totals; the battlefield keeps at least this much
  let d = 10; let shift = 0; let lineY = 0;
  PITCH = (70 * Math.PI) / 180; B.trayDeg = 70;
  for (let frac = 0.9; frac >= 0.5; frac -= 0.01) { // as wide as the screen if the band allows; otherwise as wide as fits
    let lo = 4; let hi = 60; for (let i = 0; i < 40; i++) { d = (lo + hi) / 2; place(d); const nl = pt(-HALF, 0.4, EDGE); const nr = pt(HALF, 0.4, EDGE);
      const tooWide = nr[0] - nl[0] > W * frac; // too close: back the camera off
      if (tooWide) lo = d; else hi = d; }
    place(d); const farY = pt(LOOK.x, 0.9, -EDGE - 0.15)[1]; const nearY = pt(LOOK.x, 0.0, EDGE + 0.6)[1];
    shift = nearY - want; lineY = farY - shift + 10; B.trayFrac = frac;
    if (lineY >= minLine) break;
  }
  const farY = 0, nearY = 0; void farY; void nearY;
  cam.setViewOffset(W, H, 0, shift, W, H);
  stage.post.trayPass.band = { y: lineY, h: H - lineY };
  B.lineY = lineY; B.root.style.setProperty('--line-y', `${Math.round(lineY)}px`);
  B.trayK = 1; B.trayDz = 0; B.trayDist = d; B.dbg = { d, deg: B.trayDeg, shift, lineY, w: pt(HALF, 0.4, EDGE)[0] - pt(-HALF, 0.4, EDGE)[0] };
}
// Wide screens: the table across the top, the dice table in the middle below it, between your hero panel (left) and the controls (right).
function fitTrayWide() {
  const stage = world.stage; const W = stage.width; const H = stage.height; if (!stage.post.trayPass.enabled) return;
  const hud = B.hud; const cam = stage.trayCamera; const v = new THREE.Vector3();
  const lineY = Math.round(Math.max(hud.top.getBoundingClientRect().bottom + 110, H * 0.36));
  const x0 = Math.min(W * 0.3, hud.hero.getBoundingClientRect().right + 12); const x1 = Math.max(W * 0.7, hud.dock.getBoundingClientRect().left - 12);
  const y0 = lineY + 8; const y1 = H - 8;
  const PITCH = (64 * Math.PI) / 180; const LOOK = new THREE.Vector3(0, 0.1, 0.1); const HALF = 1.9; const EDGE = 2.2;
  cam.fov = 34; cam.aspect = W / H; cam.clearViewOffset();
  const place = (d) => { cam.position.set(LOOK.x, LOOK.y + d * Math.sin(PITCH), LOOK.z + d * Math.cos(PITCH)); cam.lookAt(LOOK); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
  const pt = (x, y, z) => { v.set(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
  const box = () => { const a = pt(-HALF, 0.4, EDGE); const b = pt(HALF, 0.4, EDGE); const c = pt(-HALF, 0.4, -EDGE); const d2 = pt(HALF, 0.4, -EDGE); const xs = [a[0], b[0], c[0], d2[0]]; const ys = [a[1], b[1], c[1], d2[1]]; return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }; };
  let lo = 4; let hi = 80; let d = 20;
  for (let i = 0; i < 40; i++) { d = (lo + hi) / 2; place(d); const q = box(); if (q.r - q.l > x1 - x0 || q.b - q.t > y1 - y0) lo = d; else hi = d; }
  place(d); const q = box();
  cam.setViewOffset(W, H, (q.l + q.r) / 2 - (x0 + x1) / 2, (q.t + q.b) / 2 - (y0 + y1) / 2, W, H);
  stage.post.trayPass.band = { y: lineY, h: H - lineY };
  B.lineY = lineY; B.root.style.setProperty('--line-y', `${lineY}px`);
  B.trayDist = d;
}
// ------------------------------------------------------------------------------------------ the company: roster and team actions
// At a table (net mode) b mirrors this phone's hero (E.focusFighter); the others are in b.fighters.
function renderRoster() {
  const el = B.hud?.roster; if (!el) return; const b = B.b;
  const heroes = b.fighters.map((f) => f.hero);
  el.replaceChildren(...b.fighters.map((f, i) => {
    const turn = i === B.active && f.hp > 0; const locked = !!f.locked || (!B.net && !!f.board && i !== B.active); const down = f.hp <= 0;
    const look = D.lookOf(heroes, i); // each chip wears its hero's colours, so two Knights read apart
    return h('div', { class: `rs-chip ${turn ? 'turn' : ''} ${locked ? 'locked' : ''} ${down ? 'down' : ''}`, role: 'listitem', style: look ? { '--hue': look.hue } : null, 'aria-label': `${f.hero.name}${look && D.lookIndex(heroes, i) ? ` (${look.name})` : ''}, ${Math.max(0, Math.ceil(f.hp))} of ${f.maxHp} health, ${E.pointsOf(f)} points` },
      h('span', { class: 'rs-ic' }, down ? HK.icon('skull') : locked ? HK.icon('lock') : HK.icon(D.CLASSES[f.hero.cls] ? 'heart' : 'heart')),
      h('b', { class: 'rs-name' }, f.hero.name),
      h('i', { class: 'rs-hp' }, h('i', { style: { width: `${Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100))}%` } })),
      h('small', { class: 'rs-pts' }, String(E.pointsOf(f))));
  }));
}
// Team actions: one a round, on a friend. Uses the same potions as your own list.
const TEAM = [
  { id: 'potion', name: 'Potion', icon: 'heal', text: 'Throw one of your potions to a friend to heal them. It comes out of your own belt.', cost: () => 'Free' },
  { id: 'magic', name: 'Share magic', icon: 'magic', text: `Pay ${D.SHARE_MAGIC} magic; your friend gains ${D.SHARE_MAGIC}.`, cost: () => `${D.SHARE_MAGIC} magic` },
  { id: 'revive', name: 'Revive', icon: 'mend', text: `Once a battle: pay ${D.REVIVE_COST} magic and a fallen friend stands back up with ${D.REVIVE_HP} health.`, cost: () => `${D.REVIVE_COST} magic` },
];
function setSheetTab(tab) {
  B.sheetTab = tab;
  for (const bt of B.hud.tabs.querySelectorAll?.('button') || []) bt.classList.toggle('on', bt.dataset.tab === tab);
  B.hud.cards.replaceChildren(...(tab === 'team' ? teamTiles() : cardTiles(B.b.phase !== 'shape')));
}
function teamTiles() {
  const b = B.b; const me = b.fighters[B.active]; const usedRound = me.teamRound === b.round;
  const tiles = TEAM.map((t) => {
    const any = b.fighters.some((f, j) => j !== B.active && E.teamActionInfo(b, B.active, t.id, j).ok);
    const flag = t.id === 'potion' ? `${E.potionsLeft(me)} LEFT` : t.id === 'revive' ? (me.reviveUsed ? 'USED' : 'ONCE') : 'ONCE A ROUND';
    return HK.abilityCard({ id: `t:${t.id}`, name: t.name, kind: 'util', cost: t.id === 'potion' ? 0 : t.id === 'magic' ? D.SHARE_MAGIC : D.REVIVE_COST, fx: t.id === 'potion' ? { heal: E.POTION_HP } : {}, text: t.text },
      { spent: false, reset: false, afford: any && !usedRound, onclick: () => showTeamDetail(t.id), disabled: false, fresh: false, flag, cost: t.id === 'potion' ? 0 : t.id === 'magic' ? D.SHARE_MAGIC : D.REVIVE_COST, stepper: null, level: 0 });
  });
  const note = h('p', { class: 'sh-note' }, usedRound ? 'You have used your team action this round.' : 'One team action a round. Pick it, then choose a friend.');
  return [...tiles, note, teamRules()];
}
// How teams work (Dave, Oct 2026: "hold the line" and team triples were a mystery; explain them under the Team button, the only
// place a team needs them). Each rule in a line or two, with this act's numbers.
function teamRules() {
  const b = B.b; const act = Math.min(3, Math.max(1, b.quest?.act || B.hero?.campaign?.act || 1)); const tri = D.TRIPLE_BY_ACT[act - 1] * D.TEAM_TRIPLE_BONUS / D.TRIPLE_BY_ACT[0];
  const n = b.fighters?.length || 2;
  const rule = (icon, title, text) => h('li', {}, h('span', { class: 'tr-ic' }, HK.icon(icon)), h('div', {}, h('b', {}, title), h('small', {}, text)));
  const open = !B.teamRulesSeen; B.teamRulesSeen = true; // open the first time; a tap folds it away after that
  return h('details', { class: 'tm-rules', open }, h('summary', {}, HK.icon('star'), 'How teams work'),
    h('ul', {},
      rule('windup', 'Who the monsters go after', 'The slowest hero this round (lowest feet roll) is the target and takes a double share of every hit. Everyone else takes a single share. Your block only covers your own share. A tie goes against the hero with more health; if that ties too, a coin flip.'),
      rule('block', 'Hold the line', `If the monsters came at you and you are still standing at the end of the round: +${D.POINTS.heldLine} points. While you are the target, your blocks score double.`),
      rule('atk', 'Team triples', `When two heroes roll the same triple in the same round, each gets +${tri} more. Attack rows (Weapons, Strength, Talent) count when you hit the same monster; guard columns (Head to Toe, Left, Right) count any time.`),
      rule('magic', 'Heartbeat', `If every hero's heart die shows the same number, each of you gains ${n} magic (one for each hero).`),
      rule('atk', 'Morale Boost', `A killing blow fires up the next teammate to strike: +${D.MORAL_BOOST} attack.`),
      rule('windup', 'Turn order', 'Everyone acts by their feet roll, highest first. Ties go to the heroes, and round 1 is always the heroes’.'),
      rule('heal', 'Helping a friend', `One team action a round: throw a potion from your belt, share ${D.SHARE_MAGIC} magic, or (once a battle, ${D.REVIVE_COST} magic) stand a fallen friend back up with ${D.REVIVE_HP} health.`),
      rule('gold', 'Points and places', `Damage, blocks, kills, triples and helping all score points. Gold from the fallen is shared evenly; the top scorer gets half a share more${n >= 3 ? ', and second place a quarter more' : ''}. First place counts in your Hall of Fame.`),
      rule('stagger', 'Tougher monsters', 'Monsters grow with your team’s real strength, so a team fight is as tense as a solo one. Smart play still wins it.')));
}
function showTeamDetail(kind) {
  const b = B.b; const t = TEAM.find((x) => x.id === kind); const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const friends = b.fighters.map((f, j) => ({ f, j })).filter(({ j }) => j !== B.active);
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, t.name), h('button', { type: 'button', class: 'sh-x sh-cancel', onclick: close }, '✕ Close')),
    h('p', { class: 'pd-text' }, t.text),
    h('div', { class: 'tm-friends' }, friends.map(({ f, j }) => {
      const r = E.teamActionInfo(b, B.active, kind, j);
      return h('button', { type: 'button', class: `tm-friend ${r.ok ? '' : 'no'}`, disabled: !r.ok, onclick: () => { close(); doTeam(kind, j); } },
        h('b', {}, f.hero.name), h('small', {}, `${Math.max(0, Math.ceil(f.hp))} / ${f.maxHp} health · ${f.magic} magic`), r.ok ? h('span', { class: 'tm-go' }, kind === 'revive' ? 'Revive' : kind === 'magic' ? 'Give' : 'Throw') : h('em', {}, r.why));
    })),
    h('div', { class: 'pd-act' }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Close')));
  B.hud.info.classList.add('open'); sfx.select();
}
async function doTeam(kind, to) {
  let b = B.b; if (B.busy) return; 
  const before = { hp: b.fighters[to].hp, magic: b.fighters[to].magic };
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'team', kind, to: b.fighters[to].hero.name }); B.busy = false; if (!ok) return; b = B.b; } else {
    const r = E.teamAction(b, B.active, kind, to);
    if (!r.ok) { sfx.error(); toast(r.why); return; }
  }
  const fa = B.fb.hero(to); const friend = b.fighters[to];
  if (kind === 'potion') { sfx.heal(); fa.heal(); fa.num(`+${friend.hp - before.hp}`, 'heal'); banner(`POTION FOR ${friend.hero.name.toUpperCase()}`, 'good'); }
  if (kind === 'magic') { sfx.magic(); fa.glow('magic'); fa.num(`+${friend.magic - before.magic} magic`, 'pierce'); banner(`MAGIC FOR ${friend.hero.name.toUpperCase()}`, 'gold'); }
  if (kind === 'revive') { sfx.level?.(); fa.stand(); fa.glow('buff'); fa.num(`REVIVED +${friend.hp}`, 'heal'); banner(`${friend.hero.name.toUpperCase()} IS BACK!`, 'good'); }
  renderRoster(); updateScore(); refresh(); renderSheet(); // the sheet stays open until you close it
}
function buildHero() {
  const hero = B.hero; const cls = D.CLASSES[hero.cls];
  const r = B.hr = {
    name: h('b', { class: 'hb-name' }, hero.name), cls: h('small', { class: 'hb-cls' }, cls.name),
    hp: HK.bar({ cls: 'hb-hp', seg: 8 }), mn: h('b', { class: 'hb-mn' }, '0'), gems: HK.gems(E.magicCapOf(B.hero)),
  };
  r.hp.prepend(h('span', { class: 'hb-heart' }, HK.icon('heart')));
  return h('div', { class: 'b3-hero' },
    HK.heroMedal(hero.cls, hero.level),
    h('div', { class: 'hb-main' },
      h('div', { class: 'hb-id' }, r.name, r.cls),
      r.hp,
      h('div', { class: 'hb-magic', title: 'Magic' }, h('span', { class: 'hb-mi' }, HK.icon('magic')), r.mn, r.gems)));
}
function updateHero() {
  const b = B.b; const r = B.hr; if (!r) return;
  r.hp.style.setProperty('--seg', Math.max(4, Math.min(12, Math.round(b.maxHp / 5))));
  const d = HK.setBar(r.hp, b.hp, b.maxHp);
  if (d < -0.5) HK.replay(B.hud.hero, 'ouch');
  if (d > 0.5) HK.replay(B.hud.hero, 'mend');
  const prev = Number(r.mn.dataset.v ?? b.magic);
  HK.countTo(r.mn, b.magic, { from: prev, dur: 320 });
  if (b.magic !== prev) HK.replay(r.mn, 'pop');
  HK.setGems(r.gems, b.magic);
  const th = B.hud.therm; if (th) { th.querySelector('.th-n').textContent = String(Math.max(0, Math.ceil(b.hp))); th.querySelector('.th-fill').style.height = `${Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100))}%`; th.classList.toggle('low', b.hp / b.maxHp <= 0.3); if (d < -0.5) HK.replay(th, 'ouch'); if (d > 0.5) HK.replay(th, 'mend'); }
  const dv = B.hud.divider; if (dv) { const k = Math.max(0, Math.min(1, b.hp / b.maxHp)); dv.querySelector('.dv-fill').style.width = `${k * 100}%`; dv.querySelector('.dv-n').textContent = `${Math.max(0, Math.ceil(b.hp))} / ${b.maxHp}`; dv.classList.toggle('low', k <= 0.3); if (d < -0.5) HK.replay(dv, 'ouch'); if (d > 0.5) HK.replay(dv, 'mend'); }
  { const dh = B.hud.diff; const d = D.DIFFICULTY[D.normalizeDifficulty(B.hero?.difficulty)]; const id = D.normalizeDifficulty(B.hero?.difficulty); if (dh) { dh.className = `sx-diffchip b3-diffchip dc-${id}`; dh.querySelector('b').textContent = d.name; dh.title = `${d.name}: ${d.text}`; dh.setAttribute('aria-label', `Difficulty: ${d.name}`); } }
  const mc = B.hud.magchip; if (mc) mc.querySelector('b').textContent = String(b.magic);
  const gc = B.hud.goldchip;
  if (gc) { // your purse plus what this fight has won so far (paid for real at victory), climbing round by round like magic (Dave)
    const mine = B.party ? b.fighters[B.active] || b.fighters.find((f) => f.hero === B.hero) : null; // a team game: this phone's own hero, never the company's sum (Dave)
    const g = Math.max(0, mine ? (mine.hero.gold || 0) + (mine.goldEarned || 0) : (B.hero?.gold ?? 0) + E.battleGoldSoFar(b));
    const gb = gc.querySelector('b'); const was = Number(gb.textContent) || 0;
    if (g !== was && gc.dataset.ready) { HK.countTo(gb, g, { from: was, dur: 420 }); HK.replay(gc, 'pop'); } else gb.textContent = String(g);
    gc.dataset.ready = '1';
  }
  renderPet();
}
// The pet's badge: its picture and a little die face with what it rolled this round (? before the roll).
const SYM_TINT = { atk: '#ff4b4b', pierce: '#ff8a1a', block: '#3aa4ff', heal: '#38e87a', magic: '#b46cff', gold: '#ffc21a' };
function renderPet() {
  const pc = B.hud?.petchip; if (!pc) return; const hero = B.hero; const pet = hero?.pet; const b = B.b;
  pc.hidden = !pet; if (!pet) return;
  pc.style.setProperty('--pc', D.PETS[pet.type]?.color || '#ffffff');
  const img = pc.querySelector('.pc-pic'); const src = petImg(pet.type); if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  const v = b.board?.P?.v; const key = b.board ? `${b.round}:${B.active ?? 0}:${v}` : 'wait';
  if (pc.dataset.k === key) return; pc.dataset.k = key;
  const die = pc.querySelector('.pc-die');
  if (!b.board) { die.replaceChildren(h('b', { class: 'pc-q' }, '?')); pc.classList.add('waiting'); return; }
  pc.classList.remove('waiting');
  const syms = E.petFace(hero, v) || []; const pw = E.petPowerOf(hero);
  die.replaceChildren(...(syms.length ? syms.map((k) => h('span', { class: 'pc-sym', style: { color: SYM_TINT[k] || '#fff' } }, HK.icon(k), h('b', {}, `${pw}`)))
    : [h('b', { class: 'pc-blank' }, '–')]));
  HK.replay(pc, 'pop'); B.bw?.tray?.petHop?.();
}
function petInfo() {
  const hero = B.hero; const b = B.b; if (!hero?.pet) return; sfx.select?.();
  const name = D.PETS[hero.pet.type]?.name || 'Your pet';
  toast(b.board?.P ? `${V.describeDie(hero, 'P', b.board.P.v)} Pets roll once a round; no rerolls.` : `${name} rolls a die of luck with your dice each round. It cannot be rerolled.`);
}

// The monsters' cards (name, health, what each plans) live under their pieces on the table (flat.js).
function updatePlate(e) { B.fb?.paintFoe(e, { intents: B.showIntents !== false, targeted: B.picked !== false && B.b.enemies[B.target]?.uid === e.uid }); }
function updatePlates() { for (const e of B.b.enemies) updatePlate(e); }
export const refreshPlates = () => updatePlates(); // (dev scripts)
function addFoe(e) { const pc = B.fb.addFoe(e); updatePlate(e); return pc; }
function titleCard(name, sub, tier) {
  const el = HK.titleCard(name, sub, tier);
  B.root.append(el); setTimeout(() => el.remove(), 3800);
}

// ------------------------------------------------------------------------------------------ small helpers
const foePc = (uid) => B.fb?.foe(uid);
// the hero pieces: in a company, health under each; the piece whose turn it is stands forward
const myPc = () => B.fb.hero(Math.max(0, B.active ?? 0));
function paintHeroes() {
  const fb = B.fb; if (!fb) return;
  if (B.party) B.b.fighters.forEach((f, i) => fb.paintHero(i, f.hp, f.maxHp));
  fb.setActive(Math.max(0, B.active ?? 0));
  if (B.party) fb.setPartyStance?.(stanceOf(B.b.fighters, B.b.enemies, B.replaying ? { strikes: B.lastRep?.strikes } : {}));
}
const alive = () => B.b.enemies.filter((e) => e.hp > 0);
function targetEnemy() {
  const e = B.b.enemies[B.target];
  if (!e || e.hp <= 0) B.target = Math.max(0, B.b.enemies.findIndex((x) => x.hp > 0));
  return B.b.enemies[B.target];
}
// The round starts by choosing who to hit (Dave): pick a monster, then roll, make your decisions, lock in, see the results, and repeat.
// With more than one monster Roll waits for the pick; once you have rolled, a solo hero's target is fixed for the round (a
// tap on a monster then just opens its sheet). One monster alone needs no choosing.
function selectTarget(uid) {
  if (B.busy) return;
  const i = B.b.enemies.findIndex((e) => e.uid === uid);
  if (i < 0 || B.b.enemies[i].hp <= 0) return;
  const rolled = B.b.phase === 'shape';
  if (B.picked !== false && B.target === i) { showFoeInfo(B.b.enemies[i]); return; } // tapping the chosen monster again opens its sheet
  if (rolled && !B.party) { showFoeInfo(B.b.enemies[i]); toast('Your target is fixed once you roll.'); return; }
  const first = B.picked === false;
  B.target = i; B.picked = true; sfx.select(); updatePlates(); B.fb.setTarget(B.b.enemies[i].uid);
  if (first && !rolled) { document.getElementById('b3-roll')?.removeAttribute('disabled'); B.hud.caption.replaceChildren(caption(e0Warn(), B.picked === false ? 'captarget' : '')); }
}
// The monster sheet (tap a monster twice): what it does next and how to get ready, then the other moves it has, in a few words.
const MOVE = { strike: ['atk', 'hits'], pierce: ['pierce', 'hits through block'], guard: ['block', 'blocks your attack'], mend: ['heal', 'heals itself'],
  charge: ['windup', 'winds up a slam'], howl: ['howl', 'makes all hit harder'], bind: ['bind', 'locks your dice'], drain: ['drain', 'hits, steals magic'],
  pilfer: ['pilfer', 'hits, steals gold'], summon: ['summon', 'calls for help'], ward: ['ward', 'burns you if hit'], stalk: ['stalk', 'pounces if not hit'], phase: ['phase', 'only pierce hurts'],
  breath: ['windup', 'fire that splashes everyone'], chain: ['bind', 'dice keep last face'], hush: ['note', 'blankets your heart'] };
function readyText(e) {
  const i = e.intent; if (!i) return '';
  if (i.slam) return 'A big hit this round. Stack block, or finish it first.';
  return {
    strike: '', pierce: 'Goes through block. Heal up, or finish it first.',
    guard: 'Blocks your attack. Hit another monster, or use pierce.', ward: `Hit it and you burn for ${E.burnOf(e)}. Hit another, or block.`,
    stalk: 'Hit it now, or it pounces next round.', phase: 'Attacks pass through. Only pierce hurts it now.',
    charge: 'Slams next round. Save block, or finish it first.', howl: `Every monster hits ${i.k} harder next round.`,
    bind: `${i.k} of your dice get locked next round.`, drain: `Steals ${i.k} magic.`,
    pilfer: 'Steals gold if it hits. Kill it to get it back.', summon: `Calls ${i.k} more next round.`, mend: 'Heals itself.',
    breath: 'Fire splashes every hero. Block soaks half in a solo fight.',
    chain: `${i.k} of your dice keep last round’s face and cannot be rerolled.`,
    hush: 'Your heart is blanketed next round: no amp, no colour bonus, no triple.',
  }[i.v] || '';
}
// "Its dice": which dice the monster rolls, red for what it hits with, blue for what it blocks with (its speed die is in the stats above).
// A blow is its BASE (the number it always has) plus the die it rolls (times a multiplier for the big moves): "base 6 + d8".
const dieName = (n) => `d${n}`;
const baseDie = (base, i, s, e = null) => [base > 0 ? `base ${base}` : null, E.diceText(e ? E.diceOf(e, i) : (i.m || 0), s) || null].filter(Boolean).join(' + '); // "base 2 + 3d8": its fight bonus is rolled as dice
function diceRows(e, def) {
  const s = e.powerDie; const i = e.intent; const rows = [];
  const die = (kind, size, label, text) => h('span', { class: `fi-die ${kind}` }, HK.icon(`d${[4, 6, 8, 10].includes(size) ? size : size > 10 ? 10 : 6}`), h('b', {}, label), h('small', {}, text));
  const faces = e.faces || def.faces || [];
  const hit = faces.find((f) => ['strike', 'pierce', 'drain', 'pilfer', 'breath'].includes(f.v));
  // what it hits with (this round's move if it is a blow, else its usual blow)
  const atk = i && E.isDamageIntent(i) ? i : hit; if (atk && (atk.m || atk.f)) rows.push(die('red', s, 'Attack', baseDie(E.intentBase(e, atk), atk, s, e)));
  // what it defends with: its guard move's base and die, or a crossed-out blue shield when it has none to roll
  const gd = GUARD_INTENT.has(i?.v) ? i : faces.find((f) => GUARD_INTENT.has(f.v));
  const ar = e.armor || def.armor;
  if (gd && (gd.m || gd.f)) rows.push(die('blue', s, 'Defence', baseDie(gd.f, gd, s)));
  else if (!ar) rows.push(h('span', { class: 'fi-die blue none' }, noDefence('No defence'), h('small', {}, 'does not roll for defence')));
  if (ar) rows.push(die('blue', ar.s, 'Armor', `${ar.n}${dieName(ar.s)} blocked, every round`));
  if (!rows.length) return null;
  return h('div', { class: 'fi-dicebox' }, h('small', { class: 'fi-t' }, 'Its dice'), h('div', { class: 'fi-dice' }, ...rows));
}
const GUARD_INTENT = new Set(['guard', 'ward']);
function showFoeInfo(e) {
  const def = foeDef(e); const v = HK.intentView(e);
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const seen = new Set([e.intent?.n]);
  const others = (e.faces || def.faces).filter((f) => !seen.has(f.n) && seen.add(f.n));
  // the painted miniature, beside its name and numbers
  const img = h('img', { alt: e.name, draggable: 'false', src: def.img }); const pic = h('div', { class: `fi-pic${D.needsFlip(def, 'left') ? ' flip' : ''}` }, img);
  fillInfo(h('div', { class: 'sh-head' }, h('b', {}, `${e.name}${e.tier !== 'minion' ? ` · ${e.tier}` : ''}`), h('button', { type: 'button', class: 'sh-x sh-cancel', onclick: close }, '✕ Close')),
    h('div', { class: 'fi-top' }, pic, h('div', { class: 'fi-stats' }, h('span', {}, HK.icon('heart'), `${Math.max(0, e.hp)} / ${e.maxHp}`), h('span', {}, HK.icon('windup'), `Speed d${def.init || 4}`))),
    v ? h('div', { class: `fi-next tone-${v.tone}` }, h('span', { class: 'fi-ic' }, HK.icon(v.icon)),
      h('div', { class: 'fi-nx' }, h('small', {}, 'Next'), h('b', {}, v.title), readyText(e) ? h('p', {}, readyText(e)) : null), // a plain hit says nothing: block is what stops an attack
      v.fig ? h('strong', { class: 'fi-fig' }, v.fig, v.unit && /^\d/.test(v.fig) ? h('small', {}, v.unit === 'dmg' ? 'damage' : v.unit) : null) : null) : null,
    diceRows(e, def),
    others.length ? h('small', { class: 'fi-t' }, 'It might also') : null,
    others.length ? h('div', { class: 'fi-moves' }, others.map((f) => { const [ic, txt] = MOVE[f.v] || ['atk', f.v]; return h('span', { class: 'fi-mv' }, HK.icon(ic), h('b', {}, f.n), h('small', {}, txt)); })) : null);
  B.hud.info.classList.add('open'); sfx.select();
}
const BOARD = [...D.SLOTS, 'P']; // the nine sockets and the pet's stand (hidden when the hero has no pet)
function idleTray() {
  const b = B.b; const tray = B.bw.tray;
  const dummy = {}; for (const s of BOARD) dummy[s] = { v: 1 };
  tray.show(b.board || dummy);
  for (const s of BOARD) { tray.setDimmed?.(s, !b.board || !E.isActive(B.hero, s)); tray.setVacant?.(s, !E.isActive(B.hero, s)); }
  tray.setWaiting?.(!b.board); // before the throw the circles show what goes in them; the dice fly in on the roll
  tray.setSelected?.(new Set());
}

// ------------------------------------------------------------------------------------------ reset screen
function ribbonNodes() {
  const b = B.b; const rep = B.lastRep;
  if (!rep) return [`${alive().map((e) => e.name).join(' and ')} ${alive().length > 1 ? 'bar' : 'bars'} the way.`];
  return (rep.party ? V.partyReportLines(rep, b) : V.reportLines(rep, b)).slice(0, 3).flatMap((l, i) => [i ? h('i', { class: 'rb-sep' }) : null, h('span', { class: `rb-${l.kind || 'meh'}` }, HK.rich(l.text))]);
}
// Battle points: a small arcade counter beside the round. It ticks up when points land.
function updateScore() {
  const el = B.hud?.score?.querySelector('b'); if (!el) return; const pts = E.pointsOf(B.b);
  const prev = Number(el.dataset.v ?? 0); if (pts === prev && el.dataset.v != null) return;
  el.dataset.v = String(pts); HK.countTo(el, pts, { from: prev, dur: 500 }); if (pts > prev) HK.replay(B.hud.score, 'pop');
}
function setHud({ phase }) {
  const hud = B.hud; const b = B.b;
  hud.place.textContent = B.quest.name;
  if (hud.round.dataset.r !== String(b.round)) { hud.round.dataset.r = String(b.round); hud.round.textContent = `Round ${b.round}`; HK.replay(hud.round, 'tick'); }
  updateScore();
  updateHero();
  hud.ribbon.replaceChildren(h('p', {}, ...ribbonNodes()));
  hud.ribbon.classList.toggle('hide', phase !== 'reset');
  hud.dock.classList.toggle('is-resolving', phase === 'resolve');
  B.root.dataset.phase = phase;
}
// Controls stay on screen (no reflow, no tray jump) but go quiet while a round plays out.
function clearDock() {
  B.hud.dock.classList.add('is-resolving');
  for (const el of B.hud.dock.querySelectorAll('button')) el.disabled = true;
  B.hud.caption.replaceChildren();
}
const UTIL = [
  { id: 'u:heart', name: 'Heart change', kind: 'util', cost: D.NUDGE_COST, fx: {}, text: 'Once a round, turn the heart die up or down by one. A heart of 1 to 4 boosts every head, hand and feet die showing its symbol (1 heal, 2 pierce, 3 magic, 4 gold); a 5 pumps every blocking weapon, a 6 every attacking weapon.' },
  { id: 'u:heal', name: 'Heal', kind: 'util', cost: 2, fx: { heal: D.HEAL_AMOUNT }, text: `Spend magic, heal health right now. As often as you can pay.` },
  { id: 'u:bigheal', name: 'Potion', kind: 'util', cost: 0, fx: { heal: E.POTION_HP }, text: 'Drink a potion and heal right away. Potions are bought at camp; what you drink is gone until you buy more.' },
];
const utilCost = (u) => (u.id === 'u:heal' ? E.healCostOf(B.hero, B.b) : u.cost);
function utilState(u, shape) {
  const b = B.b; const cost = utilCost(u); let why = '';
  if (!shape && u.id !== 'u:bigheal') why = 'Roll your dice first. You use powers while you shape the roll.'; // a potion can be drunk any time before you lock in
  else if (!shape && b.phase !== 'reset') why = 'Not now.';
  else if (u.id === 'u:heart') why = E.nudgedThisRound(b) ? 'Used this round. You can turn the heart once a round.' : b.magic < cost ? `Needs ${cost} magic. You have ${b.magic}.` : '';
  else if (u.id === 'u:heal') why = b.hp >= b.maxHp ? 'You are at full health.' : b.magic < cost ? `Needs ${cost} magic. You have ${b.magic}.` : '';
  else if (E.potionsLeft(b) <= 0) why = 'No potions left. Buy more at camp.'; else if (b.hp >= b.maxHp) why = 'You are at full health.';
  return { cost, why };
}
function cardTiles(reset) {
  const b = B.b; const hero = B.hero; B.powerX = B.powerX || {};
  const powers = E.cardsOf(hero).map((k) => {
    const st = E.powerState(b, k); const stored = (b.charge && b.charge[k.id]) || 0;
    const x = E.powerCost(k, B.powerX[k.id] ?? k.cost, E.powerLevel(hero, k.id)); B.powerX[k.id] = x;
    const superReady = k.kind === 'super' && !st.early && !st.spent && b.magic >= x && !reset;
    if (superReady && B.superSeen !== b.round) { B.superSeen = b.round; if (!B.superToast) { B.superToast = true; setTimeout(() => toast(`${k.name} is ready!`), 200); } }
    return { k, st, stored, x, level: E.powerLevel(hero, k.id), afford: b.magic >= x };
  });
  const util = (id) => { const u = UTIL.find((x) => x.id === id); return { u, ...utilState(u, !reset) }; };
  const pot = util('u:bigheal'); const heal = util('u:heal'); const heart = util('u:heart');
  const full = b.hp >= b.maxHp;
  pot.tag = E.potionsLeft(b) <= 0 ? 'NONE LEFT' : full ? 'FULL HP' : ''; heal.tag = !reset && full ? 'FULL HP' : ''; heart.tag = !reset && E.nudgedThisRound(b) ? 'USED' : '';
  const utils = [
    { id: 'u:bigheal', name: 'Potion', icon: 'heal', tone: 'heal', why: pot.why, tag: pot.tag, cost: 0, badge: `${E.potionsLeft(b)} LEFT`, flag: `${E.potionsLeft(b)} left · free to drink`, text: pot.u.text,
      body: `Heal ${E.potionHpOf(hero)} right away. Once it is gone it is gone; buy more at camp.`, actions: [{ label: 'Drink a potion', fn: () => doBigHeal() }] },
    { id: 'u:heal', name: 'Heal', icon: 'heart', tone: 'heal', why: heal.why, tag: heal.tag, cost: heal.cost, flag: `${heal.cost} magic · as often as you can pay`, text: heal.u.text,
      body: `Turn ${heal.cost} magic into ${E.healAmountOf(hero)} health, right now.`, actions: [{ label: `Heal ${E.healAmountOf(hero)} · ${heal.cost} magic`, fn: () => doHeal() }] },
    { id: 'u:heart', name: 'Heart change', icon: 'heart', tone: 'gold', why: heart.why, tag: heart.tag, cost: heart.cost, flag: E.nudgedThisRound(b) ? 'Used this round' : `${heart.cost} magic · once a round`, text: heart.u.text,
      body: 'Turn your heart die one step up or down. A heart of 1 to 4 adds 2 more to every head, hand or feet die showing its symbol (1 heal, 2 pierce, 3 magic, 4 gold); a 5 pumps every blocking weapon (+4 block), a 6 every attacking weapon (+4 attack).',
      extra: heartNow(b), actions: [heartAction(b, -1), heartAction(b, 1)] },
  ];
  return [PW.sigil({ b, hero, reset, powers, utils, selected: B.pwSel, rechargeCost: D.RECHARGE_COST,
    select: (id) => { B.pwSel = id; sfx.select?.(); renderSheet(); B.hud.sheet.querySelector('.pw-detail')?.scrollIntoView?.({ block: 'nearest' }); }, // short phones: bring its cast button into view
    step: (id, x) => { const k = E.cardsOf(hero).find((c) => c.id === id); B.powerX[id] = E.powerCost(k, x, E.powerLevel(hero, id)); sfx.click?.(); renderSheet(); },
    use: (id, opts) => doCard(id, opts), recharge: (id) => doRecharge(id) })];
}
function renderSheet() { if (!B.sheetOpen) return; if (B.party) setSheetTab(B.sheetTab || 'powers'); else B.hud.cards.replaceChildren(...cardTiles(B.b.phase !== 'shape')); }
// Tapping a power never casts it: it opens this card first (what it does, how often, what it costs) with Use / Close.
const fillInfo = (...kids) => B.hud.info.replaceChildren(...kids.filter(Boolean));
function showPowerDetail(id) {
  const b = B.b; const hero = B.hero; const k = E.cardsOf(hero).find((c) => c.id === id); if (!k) return;
  const st = E.powerState(b, k); const stored = (b.charge && b.charge[k.id]) || 0; B.powerX = B.powerX || {};
  const x = E.powerCost(k, B.powerX[k.id] ?? k.cost, E.powerLevel(hero, k.id)); B.powerX[k.id] = x;
  const shape = b.phase === 'shape'; const canRecharge = !k.atwill && k.kind !== 'super';
  const word = { atk: 'attack', pierce: 'pierce', block: 'block', heal: 'heal' };
  const uses = k.atwill ? 'Every round. It comes back each round, so use it as often as you like.' : k.kind === 'super' ? 'Once per battle. A super power: the biggest one you have, and it cannot be recharged.' : `Once per battle. After you use it you can recharge it for ${D.RECHARGE_COST} magic between rounds.`;
  const how = k.kind === 'dice' ? `Rolls ${k.dice.n}d${k.dice.s}; the total is added as ${word[k.dice.to] || k.dice.to}.`
    : k.kind === 'scale' ? `You choose how much magic to put in (${k.cost} to ${k.max}). Every extra magic adds a die, so more magic means a bigger roll.`
    : k.kind === 'charge' ? `You pay ${k.cost} magic in a round to store a charge, up to ${k.max}, or you release them: one or the other each round. Each charge is worth 2 more than the last, so saving up pays: ${Object.entries(typeof k.per === 'number' ? { atk: k.per } : k.per).map(([f, v]) => `${E.chargeSteps(v, k.max).join(', ')} ${({ atk: 'attack', block: 'block', pierce: 'pierce', gold: 'gold', heal: 'heal' })[f] || f}`).join(' and ')}. Release them any round; they stay stored between rounds.`
    : k.kind === 'round' ? `Grows with the round number. Not available until round ${k.minRound}.`
    : k.kind === 'super' ? `Not available until round ${k.minRound}.` : 'A flat bonus for this round.';
  const reasons = !shape ? 'Roll your dice first. You use powers while you shape the roll.'
    : st.spent ? (k.atwill ? 'Already used this round.' : 'Already used this battle.')
    : st.early ? `Unlocks in round ${k.minRound}.` : b.magic < x ? `Needs ${x} magic. You have ${b.magic}.` : '';
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const again = () => showPowerDetail(id);
  const stepRow = k.kind === 'scale' && !st.spent && shape ? h('div', { class: 'pd-step' }, h('span', {}, 'Magic to spend'),
    h('button', { type: 'button', class: 'pd-sq', 'aria-label': 'One less magic', onclick: () => { B.powerX[id] = E.powerCost(k, x - E.scaleStep(k), E.powerLevel(hero, id)); again(); } }, '–'), h('b', {}, String(x)),
    h('button', { type: 'button', class: 'pd-sq', 'aria-label': 'One more magic', onclick: () => { B.powerX[id] = E.powerCost(k, Math.min(x + E.scaleStep(k), Math.max(k.cost, b.magic)), E.powerLevel(hero, id)); again(); } }, '+')) : null;
  const releaseRow = k.kind === 'charge' && stored > 0 && shape && !(b.usedRound && (b.usedRound[`${k.id}:release`] || b.usedRound[k.id]))
    ? h('button', { type: 'button', class: 'pd-btn alt', onclick: () => { close(); doCard(k.id, { release: true }); } }, `Release ${stored} stored charge${stored > 1 ? 's' : ''}`) : null;
  const rechargeBtn = !shape && st.spent && canRecharge ? h('button', { type: 'button', class: 'pd-btn go', disabled: b.magic < D.RECHARGE_COST, onclick: () => { close(); doRecharge(id); } }, `Recharge · ${D.RECHARGE_COST} magic`) : null;
  const useBtn = rechargeBtn || h('button', { type: 'button', class: 'pd-btn go', disabled: !!reasons, onclick: () => { close(); doCard(id); } }, `Use · ${x} magic`);
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, k.name), h('button', { type: 'button', class: 'sh-x sh-cancel', onclick: close }, '✕ Close')),
    h('p', { class: 'pd-text' }, k.text),
    h('dl', { class: 'pd-facts' }, h('dt', {}, 'Uses'), h('dd', {}, uses), h('dt', {}, 'How it works'), h('dd', {}, how), h('dt', {}, 'Cost'), h('dd', {}, k.kind === 'scale' ? `${k.cost}–${k.max} magic (you choose)` : k.kind === 'charge' ? `${k.cost} magic per charge` : `${k.cost} magic`)),
    stored ? h('p', { class: 'pd-state' }, `${stored} charge${stored > 1 ? 's' : ''} stored.`) : null,
    stepRow, releaseRow,
    !rechargeBtn && reasons ? h('p', { class: 'pd-why' }, reasons) : null,
    h('div', { class: 'pd-act' }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Close'), useBtn));
  B.hud.info.classList.add('open'); sfx.select();
}
// Heart change (Dave): show the heart face you are on and the face each button turns it to, as the dice pictures themselves.
function heartFace(v, cls) {
  if (!(v >= 1 && v <= 6)) return null;
  let spec = null; try { spec = dieSpecs(B.hero).C; } catch { return null; } // no die art: the words still say it
  const src = spec && faceImage(spec, v); return src ? h('img', { class: `hc-face ${cls}`, src, alt: `heart ${v}` }) : null;
}
function heartNow(b) { const cur = b.board?.C?.v || 0; return cur ? h('div', { class: 'hc-now' }, h('span', {}, 'Your heart now'), heartFace(cur, 'now')) : null; }
function heartAction(b, d, label = d < 0 ? 'Turn down' : 'Turn up') {
  const cur = b.board?.C?.v || 0; const to = cur + d; const off = !cur || to < 1 || to > 6;
  return { alt: d < 0, disabled: off, aria: off ? label : `${label} to ${to}`, fn: () => doNudge(d),
    content: [d < 0 ? h('span', { class: 'hc-arrow' }, '▼') : null, off ? null : heartFace(to, 'to'), h('span', { class: 'hc-word' }, off ? label : `${d < 0 ? 'Down' : 'Up'} to ${to}`), d > 0 ? h('span', { class: 'hc-arrow' }, '▲') : null] };
}
function showUtilDetail(id) {
  const b = B.b; const u = UTIL.find((x) => x.id === id); if (!u) return; const shape = b.phase === 'shape'; const { cost, why } = utilState(u, shape);
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const uses = id === 'u:bigheal' ? `You carry ${E.potionsLeft(b)}. Buy more at camp (${E.potionPriceOf(B.hero)} gold each).` : id === 'u:heart' ? 'Once a round, while you shape your roll.' : 'Any time you are shaping a roll, as often as you can pay.';
  const body = id === 'u:heart' ? `Turn the heart die one step up or down, once a round. It costs ${cost} magic. It cannot go below 1 or above 6.` : id === 'u:heal' ? `Heals ${E.healAmountOf(B.hero)} health for ${cost} magic. Do it as often as you can pay for it.` : `Heals ${E.potionHpOf(B.hero)} health right away and costs no magic. Drink it before you roll or while you shape your dice. It is gone once you drink it; buy more at camp.`;
  const nudgeBtn = (d, label) => { const a = heartAction(b, d, label); return h('button', { type: 'button', class: 'pd-btn go hc-btn', disabled: !!why || a.disabled, 'aria-label': a.aria, onclick: () => { close(); doNudge(d); } }, ...a.content); };
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, u.name), h('button', { type: 'button', class: 'sh-x sh-cancel', onclick: close }, '✕ Close')),
    h('p', { class: 'pd-text' }, u.text),
    h('dl', { class: 'pd-facts' }, h('dt', {}, 'Uses'), h('dd', {}, uses), h('dt', {}, 'How it works'), h('dd', {}, body), h('dt', {}, 'Cost'), h('dd', {}, cost ? `${cost} magic` : 'Free')),
    why ? h('p', { class: 'pd-why' }, why) : null,
    id === 'u:heart' ? heartNow(b) : null,
    h('div', { class: `pd-act${id === 'u:heart' ? ' hc-act' : ''}` }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Close'),
      ...(id === 'u:heart' ? [nudgeBtn(-1, 'Turn down'), nudgeBtn(1, 'Turn up')]
        : [h('button', { type: 'button', class: 'pd-btn go', disabled: !!why, onclick: () => { close(); if (id === 'u:heal') doHeal(); else doBigHeal(); } }, cost ? `Use · ${cost} magic` : 'Drink')])));
  B.hud.info.classList.add('open'); sfx.select();
}
async function doBigHeal() {
  let b = B.b; if (B.busy) return; const before = b.hp;
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'drink' }); B.busy = false; if (!ok) return; b = B.b; } else
  if (!E.healBig(b)) { sfx.error(); return; }
  renderRoster();
  sfx.heal(); myPc().heal(); myPc().num(`+${b.hp - before}`, 'heal');
  updateScore(); refresh(); renderSheet(); // the sheet stays open (Dave): keep tapping, watch the health go up
}
// The powers sheet reaches right down to the top of the counter boxes (Dave: "there is room, so let's use it").
function sheetToCounters() {
  const fc = B.hud.forecast?.querySelector('.fc'); if (!fc) return;
  B.root.style.setProperty('--counters-top', `${Math.round(window.innerHeight - fc.getBoundingClientRect().top + 3)}px`);
}
function togglePowers(on, tab = 'powers') {
  const same = (B.sheetTab || 'powers') === tab;
  B.sheetOpen = on ?? (B.sheetOpen && same ? false : true); B.hud.sheet.classList.toggle('open', B.sheetOpen);
  if (B.sheetOpen) { B.pwSel = null; if (B.party) B.sheetTab = tab; sheetToCounters(); sfx.select?.(); renderSheet(); } // opens with nothing chosen (Dave)
}
// Team games (Dave): Lock in · Team · Magic powers · Roll. Team opens the same sheet on its team actions.
const teamBtn = () => h('button', { type: 'button', class: 'b3-powers b3-team', 'aria-label': 'Team actions: potion, share magic, revive', onclick: () => togglePowers(undefined, 'team') },
  h('span', { class: 'bp-tri' }, HK.icon('team')), h('b', {}, 'Team'));
const sideBtns = () => (B.party ? [teamBtn(), powersBtn()] : [powersBtn()]);
const powersBtn = () => {
  const b = B.b; const list = E.cardsOf(B.hero);
  const ready = list.filter((k) => { const st = E.powerState(b, k); return !st.spent && !st.early && b.magic >= k.cost; }).length;
  const superReady = list.some((k) => k.kind === 'super' && !E.powerState(b, k).spent && !E.powerState(b, k).early && b.magic >= k.cost);
  return h('button', { type: 'button', class: `b3-powers ${superReady ? 'super' : ''}`, 'aria-label': `Magical powers. ${ready} ready.`, onclick: () => togglePowers() },
    h('span', { class: 'bp-tri' }, HK.icon('magic')), h('b', {}, 'Magic powers'));
};

export function renderReset() {
  try { B.fit?.(); } catch { /* ignore */ }
  B.bw?.tray?.setLink?.(null); B.bw?.tray?.setStraight?.(null);
  B.resets = (B.resets || 0) + 1;
  const monsterHint = () => { for (const e of (B.b?.enemies || [])) { if (e.hp > 0 && Coach.HINTS['m_' + (e.id === 'goblinking' ? 'king' : e.id)] && Coach.wantHint(B.hero, 'm_' + (e.id === 'goblinking' ? 'king' : e.id))) return 'm_' + (e.id === 'goblinking' ? 'king' : e.id); } return null; };
  setTimeout(() => { if (Coach.wantHint(B.hero, 'b_roll')) hint('b_roll'); else if (Coach.wantHint(B.hero, 'b_intent')) hint('b_intent'); else if (monsterHint()) hint(monsterHint()); else if (B.resets > 1 && Coach.wantHint(B.hero, 'b_init')) hint('b_init'); else if (B.resets > 1 && Coach.wantHint(B.hero, 'b_round2')) hint('b_round2'); else if (B.resets > 1) hint('b_powers'); }, 300);
  if (B.ended) return;
  const b = B.b; const bw = B.bw;
  if (B.net || B.party) renderRoster();
  setHud({ phase: 'reset' });
  targetEnemy();
  if (B.pickRound !== b.round || B.pickRound == null) { B.pickRound = b.round; B.picked = alive().length <= 1; } // a new round: with several monsters, choose who to hit before you roll
  B.sel.clear();
  updatePlates(); paintHeroes();
  B.fb.setTarget(B.picked ? b.enemies[B.target]?.uid : null);
  idleTray();
  HK.setForecast(B.hud.forecast, {}); HK.setNotes(B.hud.forecast, []);
  B.hud.forecast.classList.add('idle');
  B.hud.caption.replaceChildren(caption(e0Warn(), B.picked === false ? 'captarget' : ''));
  B.hud.cards.replaceChildren(...cardTiles(true)); if (B.sheetOpen) togglePowers(false);
  B.hud.bar.replaceChildren(
    h('div', { class: 'b3-acts b3-acts3 reset' }, HK.button({ kind: 'cta', icon: 'lock', label: 'Lock in', id: 'b3-lock-off', disabled: true, cls: 'sq', aria: 'Lock in (roll first)' }), ...sideBtns(), HK.button({ kind: 'cta', icon: 'dice', label: B.party ? 'Roll' : 'Roll dice', sub: B.picked === false ? 'choose target' : B.party ? 'throw' : 'tap to throw', id: 'b3-roll', disabled: B.picked === false, onclick: doRoll, cls: 'blue', aria: 'Roll the dice' })));
  if (B.shownRound !== b.round) { B.shownRound = b.round; if (b.round > 1 || !B.root.querySelector('.b3-titlecard')) { if (B.card) B.flourishLater = b.round; else HK.roundFlourish(B.root, b.round); } } // the next round's banner waits for the recap to close (it played unseen behind it)
  C.tut?.on('reset', b.round);
}
const caption = (content, cls = '') => h('p', { class: cls }, content);
function e0Warn() {
  if (B.picked === false) return h('span', { class: 'cap-warn' }, HK.icon('atk'), h('b', {}, 'Choose target'));
  const wind = alive().filter((e) => e.intent?.slam);
  const charge = alive().filter((e) => e.intent?.v === 'charge');
  const call = (ic, a, ...rest) => h('span', { class: 'cap-warn' }, HK.icon(ic), h('b', {}, a), ...rest);
  if (wind.length) return call('slam', `${wind.map((e) => e.name).join(', ')} will SLAM.`, ' Brace with block.');
  if (charge.length) return call('windup', `${charge.map((e) => e.name).join(', ')} is winding up.`, ' Plan your block.');
  return 'Roll the dice.';
}


// ------------------------------------------------------------------------------------------ roll & shape
async function doRoll() {
  if (B.busy || !guideSays('roll')) return;
  if (B.picked === false) { sfx.error?.(); toast('Pick a monster to hit first.'); return; }
  B.busy = true; hideCard();
  let b = B.b; const bw = B.bw;
  if (B.net) { if (!(await netDo({ type: 'roll' }))) { B.busy = false; return; } b = B.b; } else { E.startRoll(b); if (B.party) E.commitFighter(b); }
  B.sel.clear(); B.focus = null; B.straight = 'atk';
  sfx.diceRoll ? sfx.diceRoll() : sfx.roll();
  for (const s of BOARD) { bw.tray.setDimmed?.(s, !E.isActive(B.hero, s)); bw.tray.setVacant?.(s, !E.isActive(B.hero, s)); }
  renderShape();
  await bw.tray.roll(b.board);
  for (const s of BOARD) bw.tray.setBound?.(s, !!b.board[s]?.bound);
  if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} held in a tangle.`, 'bad'); sfx.hurt(); }
  B.busy = false;
  renderShape();
  C.tut?.on('rolled');
}
function rerollText(info) {
  const b = B.b;
  if (info.kind === 'none') return { label: 'No rerolls', sub: 'all used' };
  const n = B.sel.size; const cost = info.perDie * n;
  // Dave: say plainly which rerolls are free and that magic ones come after ("3 free, then they cost magic")
  const k = info.kind === 'free' ? D.RULES.free + D.RULES.paid - b.actionsLeft + 1 : D.RULES.paid - b.actionsLeft + 1;
  if (info.kind === 'card') return { label: n ? `Free reroll ${n}` : 'Free reroll', sub: 'from your card' };
  if (info.kind === 'free') return { label: n ? `Free reroll ${n}` : 'Free reroll', sub: k >= D.RULES.free ? 'last free one' : `${k} of ${D.RULES.free} free` };
  if (n) return { label: `Magic reroll ${n}`, sub: [HK.costGem(cost), ` · ${k} of ${D.RULES.paid}`] };
  return { label: 'Magic reroll', sub: [HK.costGem(1), ` a die · ${k} of ${D.RULES.paid}`] };
}
export function renderShape() {
  if (B.ended) return;
  const b = B.b; const hero = B.hero; const bw = B.bw;
  if (B.net && !B.resolving) { const st = myStage(); if (st === 'locked') return renderLocked(); if (st === 'skipped' || st === 'down') return renderLocked(st); }
  if (b.phase !== 'shape') return renderReset();
  paintHeroes();
  setHud({ phase: 'shape' });
  const ev = E.evaluate(hero, b.board, { straight: B.straight });
  const info = E.rerollInfo(b);
  bw.tray.setSelected?.(B.sel);
  // synergy lines glow
  const lines = [];
  for (const t of ev.triples || []) lines.push(t.slots);
  if (lines.length) bw.tray.highlight?.(lines.flat(), 'gold'); else bw.tray.clearHighlight?.();
  B.hud.forecast.classList.remove('idle');
  HK.setForecast(B.hud.forecast, HK.forecastValues(ev, b.mods));
  HK.setNotes(B.hud.forecast, HK.synergyList(ev, b.mods).filter((n) => !n.key.startsWith('s'))); // the straight chooser in the bar says it already
  // triples glow on the tray: a bar through the three dice that go together (the note above says what they give)
  // one card at a time, in teaching order: read the tiles, then target, triple, paid rerolls, lock in
  hint('b_shape');
  if (!Coach.wantHint(B.hero, 'b_shape')) {
    if (B.b.enemies.filter((e) => e.hp > 0).length > 1) hint('b_target');
    if (ev.offense3 || ev.defense3) hint('b_triple'); else if (ev.straight) hint('b_straight');
    if (E.rerollInfo(b).kind === 'paid') hint('b_paid'); else if (b.actionsLeft < E.rerollTotal()) hint('b_lock');
  }
  bw.tray.setLink?.((ev.triples || []).map((t) => ({ slots: t.slots, color: t.kind === 'atk' ? 0xff3b3b : 0x3aa4ff })));
  bw.tray.setStraight?.(ev.straightSlots || null); // the dice in a straight glow a soft cyan underneath
  B.hud.caption.replaceChildren(B.focus ? caption(HK.rich(V.describeDie(hero, B.focus, b.board[B.focus].v)), 'captip') : caption('Tap dice to reroll, then Lock in.'));
  B.hud.cards.replaceChildren(...cardTiles(false));
  const seg = (k, ic, label) => h('button', { type: 'button', class: B.straight === k ? 'on' : '', 'aria-pressed': B.straight === k ? 'true' : 'false', onclick: () => { B.straight = k; renderShape(); } }, HK.icon(ic), label);
  const straight = ev.straight ? h('div', { class: 'b3-straight' }, h('span', { class: 'st-l' }, HK.icon('star'), h('b', {}, `${ev.straight}-straight`)),
    h('div', { class: 'fseg' }, seg('atk', 'atk', `Attack ${ev.straightBonus}`), seg('gold', 'gold', `Gold ${ev.straightBonus}`))) : null;
  const rr = rerollText(info);
  B.hud.bar.replaceChildren(...[
    straight,
    h('div', { class: 'b3-acts b3-acts3' },
      HK.button({ kind: 'cta', icon: 'lock', label: 'Lock in', sub: B.net ? lockSub() : undefined, id: 'b3-lock', onclick: lockIn, disabled: B.busy, cls: 'sq', aria: 'Lock in your dice and fight' }),
      ...sideBtns(),
      HK.button({ kind: 'reroll', icon: 'reroll', label: rr.label, sub: rr.sub, id: 'b3-reroll', onclick: doReroll, disabled: B.busy || E.rerollInfo(b).kind === 'none', cls: 'blue', aria: `${rr.label}` }))].filter(Boolean));
  if (!B.busy) C.tut?.on('shape');
}
// The practice guide may hold a tap back until its card says so.
function guideSays(action, arg) { if (!C.tut || C.tut.allow(action, arg)) return true; sfx.error(); toast(C.tut.blockedText(action)); return false; }

function onPick(slot) {
  if (!E.isActive(B.hero, slot)) { sfx.error(); toast('An empty socket. Buy this die at camp and it goes right here.'); return; }
  if (B.busy || B.ended || B.b.phase !== 'shape') return;
  if (!guideSays('pick', slot)) return;
  const b = B.b; const info = E.rerollInfo(b);
  B.focus = slot;
  if (b.board[slot].bound) { sfx.error(); toast('That die is tangled. It cannot be rerolled this round.', 'bad'); renderShape(); return; }
  if (B.sel.has(slot)) B.sel.delete(slot);
  else if (info.kind === 'none') { sfx.error(); toast('No reroll actions left.'); }
  else if (B.sel.size >= info.dice) { sfx.error(); toast(`You can reroll up to ${info.dice} dice at a time.`); }
  else { B.sel.add(slot); sfx.select(); C.tut?.on('picked', slot); warnBreaks(slot); }
  renderShape();
}
// Picking a die that holds a straight or a triple together: say what a reroll could cost (Dave: breaking it should be a choice)
function warnBreaks(slot) {
  const ev = E.evaluate(B.hero, B.b.board, { straight: B.straight }); const lost = [];
  if ((ev.straightSlots || []).includes(slot)) lost.push(`your ${ev.straight}-straight (+${ev.straightBonus} ${B.straight === 'gold' ? 'gold' : 'attack'})`);
  for (const t of ev.triples || []) if (t.slots.includes(slot)) lost.push(`your ${t.name} (+${t.bonus ?? 10} ${t.kind === 'atk' ? 'attack' : 'block'})`);
  if (lost.length) toast(`Careful: rerolling this die could break ${lost.join(' and ')}.`, 'warn');
}
async function doReroll() {
  if (B.busy || !guideSays('reroll')) return; const b = B.b; const slots = [...B.sel];
  if (!E.canReroll(b, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  B.busy = true;
  if (B.net) { if (!(await netDo({ type: 'reroll', slots }))) { B.busy = false; renderShape(); return; } } else { E.reroll(b, slots); }
  B.sel.clear(); sfx.diceRoll ? sfx.diceRoll(slots.length) : sfx.roll();
  renderShape();
  await B.bw.tray.roll(B.b.board, { slots });
  B.busy = false; renderShape();
  C.tut?.on('rerolled');
}
async function doNudge(dir) {
  let b = B.b; if (B.busy) return;
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'nudge', dir }); B.busy = false; if (!ok) return; b = B.b; sfx.magic(); B.bw.tray.setValue?.('C', b.board.C.v, { animate: true }); B.bw.tray.pulse?.('C', 'magic'); renderShape(); renderSheet(); return; }
  if (!E.nudge(b, dir)) { sfx.error(); toast(E.nudgedThisRound(b) ? 'You already turned the heart this round.' : b.magic < D.NUDGE_COST ? 'Not enough ✦ Magic.' : 'The heart cannot go that way.'); return; }
  sfx.magic(); B.bw.tray.setValue?.('C', b.board.C.v, { animate: true }); B.bw.tray.pulse?.('C', 'magic'); renderShape(); renderSheet();
}
async function doHeal() {
  let b = B.b; if (B.busy) return; const before = b.hp;
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'heal' }); B.busy = false; if (!ok) return; b = B.b; } else
  if (!E.healSpend(b)) { sfx.error(); toast(b.hp >= b.maxHp ? 'You are at full health.' : 'Not enough ✦ Magic.'); return; }
  renderRoster(); sfx.heal(); myPc().heal(); myPc().num(`+${b.hp - before}`, 'heal');
  refresh(); renderSheet(); // stays open: every tap pays for another heal
}
async function doCard(id, opts = {}) {
  let b = B.b; if (B.busy) return;
  const k = E.cardsOf(B.hero).find((c) => c.id === id);
  const modsBefore = { ...b.mods }; const magicBefore = b.magic; const goldBefore = b.goldEarned || 0; const freeBefore = (b.freeActions || []).length;
  let r;
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'card', id, x: B.powerX?.[id], release: !!opts.release }); B.busy = false; r = ok ? B.b.lastCast : null; if (!ok) return; } else r = E.castPower(b, id, { x: B.powerX?.[id], ...opts });
  b = B.b;
  if (!r) { sfx.error(); toast(k && b.round < (k.minRound || 0) ? `${k.name} unlocks in round ${k.minRound}.` : 'Not enough ✦ Magic, or already used.'); return; }
  sfx.card(); buzz(20); B.fresh = id;
  const tone = PW.toneOf(k);
  myPc().glow(tone === 'heal' ? 'heal' : tone === 'block' ? 'block' : tone === 'pierce' ? 'pierce' : tone === 'atk' ? 'hit' : tone === 'gold' ? 'gold' : 'magic');
  myPc().sparkle(sparkleOf(B.hero?.cls)); // (the magic sheet stays open: you may want two or three powers; Close shuts it)
  // what the power actually added this round (the counters before and after)
  const gains = {};
  for (const [key, v] of Object.entries(b.mods)) { const d = (v || 0) - (modsBefore[key] || 0); if (d > 0) gains[key] = d; }
  const mg = b.magic - (magicBefore - (r.cost || 0)); if (mg > 0) gains.magic = mg;
  const gg = (b.goldEarned || 0) - goldBefore; if (gg > 0) gains.gold = gg;
  const fr = (b.freeActions || []).length - freeBefore; if (fr > 0) gains.free = b.freeActions[b.freeActions.length - 1];
  r.foes = b.enemies.filter((e) => e.hp > 0).length;
  // every power shows what it did, in a small window, then OK (Dave: each one should feel special)
  B.busy = true; renderShape();
  try { await PW.castReveal(B.root || document.body, { k, r, gains, round: b.round, level: E.powerLevel(B.hero, id) }); } finally { B.busy = false; }
  if (gains.heal) { myPc().heal(); myPc().num(`+${gains.heal}`, 'heal'); }
  renderShape(); renderSheet(); bumpCounters(gains);
}
// The counters that a power just filled give a little pulse, so you can see where it went.
function bumpCounters(gains) {
  const chips = B.hud.forecast?._chips; if (!chips) return;
  for (const key of Object.keys(gains)) { const c = chips[key === 'splash' ? 'atk' : key]; if (!c) continue; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 1200); }
}
async function doRecharge(id) {
  const b = B.b; if (B.busy) return;
  if (B.net) { B.busy = true; const ok = await netDo({ type: 'recharge', id }); B.busy = false; if (ok) { sfx.magic(); myPc().glow('gold'); refresh(); } return; }
  if (E.recharge(b, id)) { sfx.magic(); myPc().glow('gold'); renderReset(); } else { sfx.error(); toast('Not enough ✦ Magic.'); }
}
function refresh() { if (B.b.phase === 'shape') renderShape(); else renderReset(); }


// ------------------------------------------------------------------------------------------ at a shared table (net mode)
// Every phone is one hero. The table (session.js) is the truth: a command goes out, the next table comes back, and
// refocus() points this controller at it. Other heroes' moves arrive as new tables (netChanged). When everyone has
// locked in, the table plays the round once and every phone plays the same report (netResolve).
export const running = () => !!B.bw && !B.ended;
function refocus() {
  const t = Sess.current(); const i = Sess.index(); if (!t?.battle || i < 0) return false;
  const b = t.battle; E.focusFighter(b, i); const f = b.fighters[i];
  b.phase = f.board && f.hp > 0 ? 'shape' : 'reset';
  B.b = b; B.active = i; B.hero = b.hero; if (C?.S) { C.S.battle = b; C.S.hero = b.hero; }
  return true;
}
// Send one command; true when the table took it.
async function netDo(cmd) {
  try { await Sess.send(cmd); } catch (e) { sfx.error(); toast(e?.message || 'The table did not answer.', 'bad'); return false; }
  return refocus();
}
const myFighter = () => B.b?.fighters?.[B.active];
function myStage() {
  const f = myFighter(); if (!f) return 'reset';
  if (f.hp <= 0) return 'down'; if (f.skipped) return 'skipped'; if (f.locked) return 'locked'; return f.board ? 'shape' : 'reset';
}
const waitingFor = () => (B.b?.fighters || []).filter((f, i) => f.hp > 0 && !f.locked && i !== B.active).map((f) => f.hero.name);
const waitingText = () => { const w = waitingFor(); return w.length ? `Locked in. Waiting for ${w.join(', ')}…` : 'Locked in. The monsters answer…'; };
// What to show for this phone's hero right now (after joining, coming back, or any change that is not a played round).
function netSettle() {
  if (B.ended || !refocus()) return;
  renderRoster();
  const st = myStage(); const b = B.b;
  const sig = `${b.round}:${st}`;
  if (st === 'shape') {
    const bw = B.bw; bw.tray.show?.(b.board);
    for (const s of BOARD) { bw.tray.setDimmed?.(s, !E.isActive(B.hero, s)); bw.tray.setVacant?.(s, !E.isActive(B.hero, s)); bw.tray.setBound?.(s, !!b.board[s]?.bound); }
    bw.tray.setWaiting?.(false); B.sel.clear(); B.lastSig = sig; return renderShape();
  }
  if (st === 'locked') { B.lastSig = sig; B.busy = false; return renderLocked(); }
  if (st === 'skipped' || st === 'down') { B.lastSig = sig; B.busy = false; return renderLocked(st); }
  B.lastSig = sig; renderReset();
}
// The table changed (someone else moved, or my own command came back).
export function netChanged(prev, next) {
  if (!B.bw || B.starting || B.ended || B.resolving) return;
  const round = (t) => (t?.battle ? t.battle.round : 0);
  if (next.phase !== 'battle' || round(next) > round(prev)) { netResolve(prev, next); return; }
  if (!refocus()) return;
  renderRoster();
  paintHeroes(); // live: a mate locking in steps their mini up beside the target
  const st = myStage(); const sig = `${B.b.round}:${st}`; const changed = sig !== B.lastSig; B.lastSig = sig;
  if (st === 'locked' || st === 'skipped' || st === 'down') { B.busy = false; renderLocked(st === 'locked' ? '' : st); return; } // (also refreshes who is still choosing)
  if (changed && !B.busy) (st === 'shape' ? renderShape : renderReset)(); // e.g. the host skipped me and then let me back, or I took my lock back
}
// The round has been played by the table: play it here too, then the next round, or the end.
async function netResolve(prev, next) {
  B.resolving = true; Sess.hold();
  try {
    const rep = next.lastReport; const outcome = next.phase === 'victory' ? 'victory' : next.phase === 'defeat' ? 'defeat' : null;
    if (next.phase === 'defeat' && next.retreat) { await lose(); return; }
    // the battle as it stands after the round (a lost battle is gone from the table: use the one we had)
    const src = next.battle || prev?.battle; if (!src || !rep) { await finishNet(next); return; }
    if (next.battle) { E.focusFighter(src, Sess.index()); B.b = src; B.active = Sess.index(); B.hero = src.hero; C.S.battle = src; C.S.hero = src.hero; src.phase = 'reset'; }
    B.busy = true; B.sel.clear();
    await playParty(rep, outcome);
    B.lastSig = `${B.b.round}:${outcome ? 'end' : 'reset'}`;
  } catch (e) { console.error('netResolve failed', e.stack); B.busy = false; }
  finally { B.resolving = false; B.busy = false; Sess.release(); }
}
function finishNet(next) { B.busy = false; if (next.phase === 'victory') return win(); if (next.phase === 'defeat') return lose(); }
// Locked in (or away, or down): the dice stay as they are and the screen says who is still choosing.
function renderLocked(kind = '') {
  if (B.ended) return;
  const b = B.b; const bw = B.bw; const hero = B.hero; const f = myFighter();
  setHud({ phase: 'shape' }); bw.tray.setSelected?.(new Set());
  if (b.board) {
    const ev = E.evaluate(hero, b.board, { straight: f?.straight || 'atk' });
    HK.setForecast(B.hud.forecast, HK.forecastValues(ev, b.mods)); HK.setNotes(B.hud.forecast, HK.synergyList(ev, b.mods).filter((n) => !n.key.startsWith('s')));
    B.hud.forecast.classList.remove('idle');
  }
  B.hud.cards.replaceChildren(...cardTiles(!b.board));
  paintHeroes();
  const msg = kind === 'down' ? 'You are down. Your friends will finish this fight.' : kind === 'skipped' ? 'The host marked you away this round.' : waitingText();
  const skips = Sess.isHost() ? (b.fighters || []).map((g, i) => ({ g, i })).filter(({ g, i }) => i !== B.active && g.hp > 0 && !g.locked).map(({ g }) => h('button', { type: 'button', class: 'b3-skip', onclick: () => netDo({ type: 'skip', playerId: Sess.mates().find((p) => p.hero === g.hero)?.id }).then(() => netSettle()) }, `Skip ${g.hero.name} this round`)) : [];
  B.hud.caption.replaceChildren(caption(msg), ...skips);
  B.hud.bar.replaceChildren(h('div', { class: 'b3-acts b3-acts3 reset' },
    HK.button({ kind: 'cta', icon: 'lock', label: kind ? 'Waiting' : 'Locked in', id: 'b3-lock-off', disabled: true, cls: 'sq', aria: 'Locked in' }), ...sideBtns(),
    kind ? HK.button({ kind: 'reroll', icon: 'reroll', label: 'Waiting', sub: 'for the round', id: 'b3-wait', disabled: true, cls: 'blue' })
      : HK.button({ kind: 'reroll', icon: 'reroll', label: 'Unlock', sub: 'take it back', id: 'b3-unlock', onclick: doUnlock, cls: 'blue' })));
  B.busy = false;
}
async function doUnlock() { if (B.busy) return; B.busy = true; const ok = await netDo({ type: 'unlock' }); B.busy = false; if (ok) { sfx.select?.(); netSettle(); } }

// ------------------------------------------------------------------------------------------ lock in: perform the round
async function lockIn() {
  if (!B.busy && !guideSays('lock')) return;
  if (C.tut && !B.busy) C.tut.on('locked');
  try { await lockInInner(); } catch (e) { console.error('lockIn failed', e.stack); B.busy = false; B.at = `ERR ${e.message}`; try { C.toast?.('Something went wrong in the fight.'); } catch { /* */ } if (B.b.outcome === 'victory') win(); else if (B.b.outcome === 'defeat') lose(); else renderReset(); }
}
// Company: who rolls after this hero (or the monsters, when everyone has locked)
function lockSub() { const w = waitingFor(); return w.length ? `${w.length} to go` : undefined; }
async function lockNet() {
  B.busy = true; sfx.lock(); buzz(30);
  B.sel.clear(); B.bw.tray.setSelected?.(new Set());
  // the answer comes back as the next table; if I was the last to lock, it is the round already played (netApply)
  const ok = await netDo({ type: 'lock', target: B.target, straight: B.straight });
  if (!ok) { B.busy = false; renderShape(); }
}
// ---- the pieces perform one blow at a time (flat.js). Hardly any animation: a lunge, then a shake and a slight tilt with a spark.
const heroPiece = (name) => (B.party ? B.fb.heroByName(name) : B.fb.hero(0));
const HIT_KIND = (pierceOnly, caster) => (caster ? 'magic' : pierceOnly ? 'pierce' : 'hit');
// The word for what soaked a blow, told on the monster: its own move (Duck, Fire Ward, Shield Up...), Phase if it slipped out of reach, Armor if it wears some.
const blockWord = (s, rep) => {
  const act = (rep?.acts || []).find((a) => a.uid === s.targetUid);
  if (s.phased) return act?.name || 'Phase';
  return act && (act.v === 'guard' || act.v === 'ward') ? act.name : 'Armor';
};
// ---- feel (Dave, Oct 2026: "the moment of impact"): a crit gets its own ring and banner, a big hit jolts the table, a kill lands with
// a thump, and a boss falls slowly to a boom and a brass swell. Haptics where the phone allows; no shaking when motion is reduced.
const FX_WORD = { pierce: 'pierce', heal: 'heal', magic: 'magic', loot: 'gold', splash: 'splash' };
function critsOf(ev) { // a weapon face with two or three icons of one kind is a crit (Silver and Gold top faces, every Diamond's top)
  return Object.values(ev.lanes || {}).filter((l) => l.fx && Math.max(...Object.values(l.fx)) >= 2)
    .map((l) => { const [kind, n] = Object.entries(l.fx).sort((a, b) => b[1] - a[1])[0]; return { slot: l.slot, kind, n }; });
}
async function critMoment(crits) {
  if (!crits.length) return;
  sfx.crit(); buzz([18, 40, 18]);
  const c = crits[0]; banner(crits.length > 1 ? 'DOUBLE CRIT!' : `CRIT!  +${c.n} ${FX_WORD[c.kind] || c.kind}`, 'gold');
  B.bw.tray.highlight?.(crits.map((x) => x.slot).filter(Boolean), 'gold'); B.fb.shake(0.45); B.bw.stage.flash(0xfff2c0, 0.22);
  await wait(0.55);
}
const isBoss = (uid) => { const e = B.b.enemies.find((x) => x.uid === uid); return !!e && (e.tier === 'boss' || foeDef(e).tier === 'boss'); };
async function killMoment(uids) {
  if (!uids.length) return;
  const bossUid = uids.find(isBoss);
  if (bossUid) { // the boss falls slowly: a boom, a brass swell, the whole table shakes
    const e = B.b.enemies.find((x) => x.uid === bossUid);
    music.setIntensity?.(0.4); sfx.bossFall(); buzz([40, 60, 90]); B.fb.shake(1); B.bw.stage.flash(0xffe9a0, 0.5); B.fb.flash('#ffd23d', 0.45);
    banner(`${(e?.name || 'The boss').toUpperCase()} FALLS!`, 'gold');
    for (const uid of uids) foePc(uid)?.fall(1, uid === bossUid ? 1.6 : 0.7);
    await wait(1.6); return;
  }
  for (const uid of uids) { sfx.kill(); sfx.deathEmber?.(); foePc(uid)?.fall(1); }
  buzz(45); B.fb.shake(0.5);
}
// the Phoenix Feather: a blow that would fell you leaves you at 10, once a battle
async function phoenixMoment(pc) {
  if (!pc) return;
  sfx.level?.(); sfx.heal(); buzz([30, 40, 60]); banner('PHOENIX FEATHER!  BACK TO 10', 'gold'); B.fb.flash('#ffb43d', 0.45); B.bw.stage.flash(0xffd9a0, 0.3);
  pc.heal(); pc.num('+10 · rises', 'heal'); updatePlates(); await wait(0.9);
}
// the music leans in when it is close: you are low, or a boss is nearly down
function moodOfFight() {
  const b = B.b; const hp = B.party ? Math.min(...b.fighters.filter((f) => f.hp > 0).map((f) => f.hp / f.maxHp), 1) : b.hp / b.maxHp;
  const boss = b.enemies.find((e) => e.hp > 0 && (e.tier === 'boss' || foeDef(e).tier === 'boss'));
  music.setIntensity?.(hp < 0.3 || (boss && boss.hp / boss.maxHp < 0.3) ? 1.4 : 1);
}
// Each class sparkles in its own colour when a power goes into a blow (Dave: "little splashes here, little splashes there").
const CLASS_SPARKLE = { knight: '#ffd34a', ranger: '#7dff8a', wizard: '#8fb8ff', dwarf: '#ff9a3a', bard: '#ff8ad8' };
const sparkleOf = (cls) => CLASS_SPARKLE[cls] || '#c08cff';
async function strikeAnim(hp, s, { caster = false, cls = null } = {}) {
  const ta = foePc(s.targetUid); if (!hp || !ta) return;
  const jobs = []; const big = s.dealt >= 15;
  if (caster || s.magic) sfx.magic?.(); else sfx.slash?.(); // the swing, before the blow lands
  if (s.magic) hp.sparkle(sparkleOf(cls));
  await hp.lunge(ta, () => {
    if (s.magic && s.dealt > 0) ta.sparkle(sparkleOf(cls));
    // numbers stay up five seconds: the damage in red, and the word of whatever soaked some of it (Duck, Fire Ward, Armor...) in blue
    const word = blockWord(s, B.lastRep);
    if (s.phased) { jobs.push(ta.glow('magic')); ta.num(`${word}: passes through`, 'block', { dy: -12 }); }
    else if (s.guarded > 0) { jobs.push(ta.guard()); ta.num(`${word} −${s.guarded}`, 'block', { dy: -12 }); sfx.block(); }
    if (s.dealt > 0) { sfx.hit(); jobs.push(ta.hit(Math.min(1, s.dealt / 25), HIT_KIND(s.atk === 0 && s.pierce > 0, caster))); ta.num(`−${s.dealt}`, 'dmg', { dy: 14 }); if (s.pierce) { sfx.pierce?.(); ta.num(`◆ ${s.pierce}`, 'pierce', { dx: 34, dy: 34 }); }
      if (big) { B.fb.shake(Math.min(1, s.dealt / 35)); buzz(35); B.bw.stage.flash(0xffffff, 0.12); } }
    else if (!s.guarded && !s.phased) { ta.num('0', 'meh', { dy: 14 }); sfx.block(); }
    if (s.burned) { sfx.hurt(); buzz(60); jobs.push(hp.hit(0.6, 'fire')); hp.num(`🔥 −${s.burned}`, 'hurt'); B.fb.flash('#ff6a2a', 0.35); }
  });
  if (big) await wait(0.12); // a beat of hit-stop: let the big one land
  await Promise.all(jobs);
}
// a monster acts. `heroes`: [{ pc, part, net }] who it hit and how it came out (a company shares the blow).
async function foeAnim(act, heroes) {
  const a = foePc(act.uid); if (!a) return;
  const first = heroes[0]?.pc;
  const dmgVerb = ['strike', 'pierce', 'drain', 'pilfer'].includes(act.v);
  if (!dmgVerb) {
    if (act.v === 'charge' && !act.cancelled) { sfx.windup(); await a.glow('fire'); }
    else if (act.v === 'howl') { sfx.howl?.(); await a.glow('buff'); }
    else if (act.v === 'bind') { sfx.hex?.(); a.glow('magic'); if (first) await first.glow('magic'); }
    else if (act.v === 'summon') { sfx.summon?.(); await a.glow('buff'); }
    else if (act.v === 'guard') { await a.guard(); }
    else if (act.v === 'ward') { await a.glow('fire'); }
    else if (act.v === 'phase') { await a.glow('magic'); }
    else if (act.v === 'stalk') { await a.glow('buff'); }
    else if (act.v === 'mend') { sfx.heal(); await a.heal(); }
    await wait(0.15);
    return;
  }
  const jobs = [];
  // a big blow (a slam, or a lot of damage at once) winds back further, lands harder and booms (Dave: a bigger bash, a bigger sound)
  const total = heroes.reduce((t, x) => t + (x.part || 0), 0); const big = !!act.slam || total >= 15;
  await a.lunge(first, () => {
    if (big) { sfx.slam?.(); B.fb.shake(Math.min(1, 0.55 + total / 40)); buzz(120); }
    // each hero shows what got through in red, and the block that soaked the rest (the recap names the move)
    for (const { pc, part, net } of heroes) {
      const ab = part - net;
      if (net > 0) { sfx.hurt(); buzz(60); jobs.push(pc.hit(Math.min(1, net / 14), act.v === 'pierce' ? 'pierce' : 'hit')); B.fb.flash('#ff3a2a', Math.min(0.45, 0.2 + net / 40)); pc.num(`−${net}`, 'hurt', { dy: 14 }); }
      if (ab > 0) { jobs.push(pc.guard()); pc.num(`Block −${ab}`, 'block', { dy: -12 }); sfx.block(); }
      if (net <= 0 && ab <= 0 && !['drain', 'pilfer'].includes(act.v)) pc.num('0', 'meh', { dy: 14 });
    }
  }, { big });
  await Promise.all(jobs);
  await wait(0.12);
}
// What a round's report said, as the card over the board (roundcard.js). Closed by a tap, or when the next roll starts.
function showCard(el = B.card) {
  if (!el || B.ended) return;
  B.card?.remove(); B.card = el; B.root.append(el); B.hud.again.hidden = true;
  // a long fight's recap shrinks a little (rather than scrolling) until all of it shows
  const body = el.querySelector('.rc-body'); if (body) { body.style.zoom = ''; let k = 1; while (el.scrollHeight > el.clientHeight + 1 && k > 0.66) { k -= 0.04; body.style.zoom = k.toFixed(2); } }
}
function hideCard() { if (B.card) { B.card.remove(); } if (B.lastCard) B.hud.again.hidden = false; B.card = null; }
function makeCard(rep) { B.lastCard = roundCard(rep, B.b, { onClose: closeCard }); return B.lastCard; }
// The player closed the recap: now the next round begins on screen (its banner held back while the recap was up).
function closeCard() { hideCard(); const r = B.flourishLater; B.flourishLater = null; if (r && !B.ended && r === B.b?.round) HK.roundFlourish(B.root, r); }
async function lockLocalParty() {
  if (B.busy) return; B.busy = true;
  const b = B.b; const bw = B.bw; const f = b.fighters[B.active];
  if (!f?.board) { B.busy = false; return; }
  sfx.lock(); buzz(30);
  B.sel.clear(); bw.tray.setSelected?.(new Set());
  f.target = B.target; f.straight = B.straight;
  E.commitFighter(b);
  f.locked = true;
  const next = b.fighters.findIndex((g) => g.hp > 0 && !g.locked);
  if (next >= 0) {
    banner(`${b.fighters[next].hero.name.toUpperCase()}'S TURN`, 'gold');
    await wait(0.45);
    E.focusFighter(b, next);
    B.active = next; B.hero = b.hero;
    if (C?.S) { C.S.hero = b.hero; C.S.battle = b; }
    bw.setActiveHero?.(next, B.hero);
    B.busy = false; bw.tray.unlock?.();
    renderRoster();
    renderReset();
    return;
  }
  const rep = E.resolveParty(b);
  await playParty(rep, b.outcome);
}
async function lockInInner() {
  if (B.net) return lockNet();
  if (B.party) return lockLocalParty();
  if (B.busy) return; B.busy = true;
  const b = B.b; const bw = B.bw; const hero = B.hero; const stage = world.stage;
  sfx.lock(); buzz(30);
  B.sel.clear(); bw.tray.setSelected?.(new Set());
  const ev = E.evaluate(hero, b.board, { straight: B.straight });
  bw.tray.lock?.();
  setHud({ phase: 'resolve' }); clearDock(); hideCard();
  targetEnemy();
  const rep = E.resolve(b, { target: B.target, straight: B.straight });
  B.lastRep = rep;
  const card = makeCard(rep);
  if (ev.offense3 || ev.defense3 || ev.straight) {
    sfx.synergy(); banner(ev.triples?.length ? `${ev.triples[0].name.toUpperCase()}!  +${ev.triples[0].bonus ?? 10}` : `${ev.straight}-STRAIGHT!`, 'gold');
    const l = (ev.triples || []).flatMap((t) => t.slots);
    if (l.length) bw.tray.highlight?.(l, 'gold'); stage.flash(0xffd23d, 0.18); B.fb.shake(0.3); buzz(25);
    await wait(0.55);
  } else await wait(0.25);
  await critMoment(critsOf(ev));
  const me = B.fb.hero(0);

  // ---------- initiative: who goes first this round
  {
    const ini = rep.init; const nm = (uid) => b.enemies.find((e) => e.uid === uid)?.name || 'Monster';
    if (ini.forced) { banner('YOU STRIKE FIRST', 'gold'); }
    else {
      for (const f of ini.foes) foePc(f.uid)?.num(`⚡ ${f.init}`, f.init > ini.hero ? 'hurt' : 'block');
      me.num(`⚡ ${ini.hero}`, 'pierce');
      const quick = ini.foes.filter((f) => rep.early.includes(f.uid)).map((f) => nm(f.uid));
      banner(quick.length ? `${quick.length > 1 ? 'MONSTERS' : quick[0].toUpperCase()} STRIKE${quick.length > 1 ? '' : 'S'} FIRST` : `YOU STRIKE FIRST  ⚡${ini.hero}`, quick.length ? 'bad' : 'gold');
    }
    sfx.synergy?.();
    await wait(ini.forced ? 0.6 : 1.1);
  }
  const playAct = (act) => foeAnim(act, [{ pc: me, part: act.d ?? 0, net: act.net ?? 0 }]);
  // monsters that rolled higher than your feet strike before you
  for (const act of rep.acts.filter((a) => a.early)) await playAct(act);
  if (rep.heroDown && !rep.phoenix) { updatePlates(); me.fall(-1); sfx.lose?.(); await wait(0.8); B.busy = false; bw.tray.unlock?.(); return lose(rep); }
  if (rep.heroDown && rep.phoenix) { await phoenixMoment(me); }

  // ---------- 1. your strike
  const weaponId = hero.loadout.NW.id;
  await strikeAnim(me, { atk: rep.T.atk, pierce: rep.T.pierce, guarded: rep.guarded, dealt: rep.dealt, phased: rep.phased, burned: rep.burned, targetUid: rep.targetUid, magic: rep.magicHit }, { caster: weaponId === 'staff', cls: hero.cls });
  for (const sp of rep.splashed || []) { // splash / area damage on the other monsters
    if (sp.uid === rep.targetUid || sp.dealt <= 0) continue;
    const a = foePc(sp.uid); if (!a) continue;
    a.hit(Math.min(1, sp.dealt / 20)); a.num(`−${sp.dealt}`, 'dmg');
  }
  for (const e of b.enemies) updatePlate(e);
  await wait(0.2);
  await killMoment(rep.killed);
  await wait(rep.killed.length ? 0.6 : 0.15);

  // ---------- 2. the survivors act
  for (const act of rep.acts.filter((x) => !x.early)) await playAct(act);
  for (const st of rep.stalks || []) { // a Stalk ends: broken, or the wolf will pounce
    const a = foePc(st.uid); if (!a) continue;
    a.num(st.broken ? 'Stalk broken!' : 'Ready to pounce!', st.broken ? 'block' : 'hurt');
    if (!st.broken) { sfx.windup(); a.glow('fire'); }
  }
  // reinforcements, rage
  for (const uid of rep.summoned) {
    const e = b.enemies.find((x) => x.uid === uid); if (!e) continue;
    addFoe(e).appear();
  }
  for (const uid of rep.raged) { const a = foePc(uid); banner('ENRAGED!', 'bad'); sfx.rage(); B.fb.flash('#ff2a1a', 0.35); await a?.rage(); }
  for (const uid of rep.fled || []) foePc(uid)?.num('Flees', 'meh');
  if (rep.phoenix && !rep.heroDown) await phoenixMoment(me);
  if (rep.healed) { sfx.heal(); me.heal(); me.num(`+${rep.healed}`, 'heal'); }
  if (rep.sick) { me.num(`SICK −${rep.sick}`, 'bad'); toast(`Feeling sick: −${rep.sick} health this round.`, 'bad'); await wait(0.4); } // a bane from the road
  if (rep.T.pierce) bw.tray.pulse?.('S', 'pierce');
  bw.tray.unlock?.();
  setHud({ phase: 'resolve' });
  for (const e of b.enemies) updatePlate(e);
  await wait(1.0); // (Dave, Oct 2026: let the last hits, falls and numbers finish on the board before the recap covers it)

  // ---------- 3. next
  B.busy = false;
  if (b.outcome === 'victory') return win(rep);
  if (b.outcome === 'defeat') return lose(rep);
  moodOfFight();
  showCard(card);
  renderReset();
}

// Company round: everyone has locked; the monsters answer. Plays in initiative order (rep.order).
// Play a round's report: the same on a shared phone and on every phone at a table.
async function playParty(rep, outcome = B.b.outcome) {
  const b = B.b; const bw = B.bw; const stage = world.stage;
  bw.tray.lock?.(); setHud({ phase: 'resolve' }); clearDock(); hideCard();
  B.lastRep = rep;
  const card = makeCard(rep);
  const pcOf = (n) => heroPiece(n);
  B.replaying = true;
  B.fb?.setPartyStance?.(stanceOf(b.fighters, b.enemies, { strikes: rep.strikes }));
  const pace = replayPace((rep.order || []).length, { reduced: reduced() });
  // team triples and Heartbeat
  for (const t of rep.team || []) {
    sfx.synergy(); banner(`${t.label.toUpperCase()}  +${t.bonus}`, 'gold'); stage.flash(0xffd23d, 0.18);
    for (const n of t.names) pcOf(n)?.glow('buff');
    await wait(1.0);
  }
  if (rep.heartbeat) { sfx.magic(); banner(`HEARTBEAT  +${rep.heartbeat.magic} MAGIC EACH`, 'good'); for (const pc of B.fb.heroes) pc.glow('heal'); await wait(1.0); }
  // initiative
  if (rep.init.forced) { banner('THE COMPANY STRIKES FIRST', 'gold'); }
  else {
    for (const x of rep.init.heroes) pcOf(x.name)?.num(`⚡ ${x.init}`, 'pierce');
    for (const x of rep.init.foes) foePc(x.uid)?.num(`⚡ ${x.init}`, 'hurt');
  }
  // the slowest Feet draws the monsters (a tie: whoever has more health)
  if (rep.leader && rep.fighters.filter((x) => !x.down).length > 1) banner(`MONSTERS TARGET ${rep.leader.toUpperCase()} · SLOWEST FEET`, 'bad');
  await wait(pace.intro);
  const snapNames = rep.fighters.filter((x) => !x.down).map((x) => x.name);
  const strikes = rep.strikes.map((s) => ({ ...s })); const acts = rep.acts.map((a) => ({ ...a }));
  const t0 = () => world.stage.time;
  for (const step of rep.order) {
    const started = t0();
    if (step.kind === 'hero') { const s = strikes.find((x) => x.name === step.name && !x.done); if (s) { s.done = true; await playStrike(s, rep); } }
    else { const act = acts.find((x) => x.uid === step.uid && !x.done); if (act) { act.done = true; await playFoe(act, snapNames); } }
    const rest = pace.beat - (t0() - started); if (rest > 0.05) await wait(rest);
  }
  for (const st of rep.stalks || []) { const a = foePc(st.uid); if (a) a.num(st.broken ? 'Stalk broken!' : 'Ready to pounce!', st.broken ? 'block' : 'hurt'); }
  for (const uid of rep.summoned) {
    const e = b.enemies.find((x) => x.uid === uid); if (!e) continue;
    addFoe(e).appear();
  }
  for (const uid of rep.raged) { const a = foePc(uid); banner('ENRAGED!', 'bad'); sfx.rage(); B.fb.flash('#ff2a1a', 0.35); await a?.rage(); }
  for (const uid of rep.fled || []) foePc(uid)?.num('Flees', 'meh');
  for (const x of rep.fighters) {
    const pc = pcOf(x.name); if (!pc) continue;
    if (x.healed > 0) { pc.heal(); pc.num(`+${x.healed}`, 'heal'); }
    const sick = (rep.sick || []).find((y) => y.name === x.name); if (sick) pc.num(`SICK −${sick.n}`, 'bad'); // a bane from the road
    if (x.hpAfter <= 0 && !x.down) { pc.fall(-1); banner(`${x.name.toUpperCase()} IS DOWN`, 'bad'); }
  }
  // the company's shield: the hero the monsters went after is still standing
  if (rep.shield?.held) {
    const pc = pcOf(rep.shield.name);
    if (pc) { pc.glow('block'); pc.num(`HELD THE LINE +${D.POINTS.heldLine}`, 'block'); }
    banner(`${rep.shield.name.toUpperCase()} HELD THE LINE`, 'good'); sfx.block?.(); await wait(0.9);
  }
  bw.tray.unlock?.();
  for (const e of b.enemies) updatePlate(e);
  B.replaying = false;
  paintHeroes();
  await wait(pace.close + 0.6); // let the board settle before the recap covers it
  B.busy = false;
  if (outcome === 'victory') return win(B.net ? null : rep); // at a shared table every phone moves on together (no waiting on a tap)
  if (outcome === 'defeat') return lose(B.net ? null : rep);
  if (!B.net && B.party) {
    for (const g of b.fighters) { g.locked = false; g.skipped = false; }
    const i = b.fighters.findIndex((g) => g.hp > 0);
    if (i >= 0) {
      E.focusFighter(b, i);
      B.active = i; B.hero = b.hero;
      bw.setActiveHero?.(i, B.hero);
      if (C?.S) C.S.hero = b.hero;
    }
  } else if (!B.net) B.active = -1;
  showCard(card);
  renderReset();
}
async function playStrike(s, rep) {
  const b = B.b;
  const ha = heroPiece(s.name); const ta = foePc(s.targetUid); if (!ha || !ta) return;
  const m = (rep.moral || []).find((x) => x.to === s.name);
  if (m) { banner(`MORALE BOOST +${m.n} · ${s.name.toUpperCase()}`, 'good'); ha.glow('buff'); await wait(0.5); }
  const hero = b.fighters.find((f) => f.hero.name === s.name)?.hero; const wid = D.modelOf(hero?.loadout.NW.id);
  await strikeAnim(ha, s, { caster: wid === 'staff', cls: hero?.cls });
  const e = b.enemies.find((x) => x.uid === s.targetUid); if (e) updatePlate(e);
  for (const sp of s.splashed || []) { // splash / area damage on the other monsters
    const a = foePc(sp.uid); if (!a || sp.dealt <= 0) continue;
    a.hit(Math.min(1, sp.dealt / 20)); a.num(`−${sp.dealt}`, 'dmg');
    const x = b.enemies.find((y) => y.uid === sp.uid); if (x) updatePlate(x);
  }
  const down = [...(s.killed ? [s.targetUid] : []), ...(s.splashed || []).filter((sp) => sp.killed && sp.uid !== s.targetUid).map((sp) => sp.uid)];
  if (down.length) { await killMoment(down); await wait(0.5); }
  await wait(0.15);
}
async function playFoe(act, names) {
  const heroes = [];
  if (Array.isArray(act.parts)) act.parts.forEach((part, i) => { const pc = names[i] && heroPiece(names[i]); if (pc && part > 0) heroes.push({ pc, part, net: act.nets?.[i] ?? part }); });
  else if (names[0]) heroes.push({ pc: heroPiece(names[0]), part: act.d ?? 0, net: act.net ?? 0 });
  await foeAnim(act, heroes.length ? heroes : [{ pc: heroPiece(names[0]), part: 0, net: 0 }]);
}
// The round that ended the fight gets its recap too (Dave: see the final blow land), then a tap moves on.
function finalRecap(rep, kind) {
  if (!rep || B.ended) return null;
  clearDock();
  return new Promise((done) => {
    const el = roundCard(rep, B.b, { closeLabel: kind === 'victory' ? 'Victory ›' : 'Continue ›', title: kind === 'victory' ? 'the final blow' : 'the last round',
      onClose: () => { B.card?.remove(); B.card = null; B.lastCard = null; done(); } });
    showCard(el);
  });
}
async function win(rep) {
  if (B.ended) return; // the player went home mid-round
  B.busy = true;
  await finalRecap(rep, 'victory'); if (B.ended) return;
  music.setIntensity?.(1); music.setMood?.('victory'); sfx.win(); buzz([30, 60, 30, 60, 120]);
  B.bw.stage.flash(0xffe9a0, 0.25);
  clearDock(); hideCard();
  B.hud.ribbon.classList.add('hide');
  for (const [i, pc] of B.fb.heroes.entries()) if (!B.party || B.b.fighters[i].hp > 0) { pc.hop(); await wait(0.15); }
  await wait(1.0);
  B.hud.ribbon.classList.remove('hide');
  if (!B.ended) C.showVictory();
}
async function lose(rep) {
  if (B.ended) return;
  B.busy = true;
  await finalRecap(rep, 'defeat'); if (B.ended) return;
  sfx.lose(); hideCard();
  for (const pc of B.fb.heroes) if (!pc.dead) pc.fall(-1);
  B.bw.stage.fadeTo(0.7, 1.4);
  await wait(1.5);
  if (!B.ended) C.defeat(false);
}
export function leave() { stop(); }

// Test hooks (dev scripts): play a company round's report here, and step the stage until the controller is idle.
export const devParty = (rep) => { B.busy = true; return playParty(rep, B.b.outcome); };

export function idle() { return !B.busy; }
