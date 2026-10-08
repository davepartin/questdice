// The 3D solo battle: a controller that drives the rules (engine.js) and performs the result on the
// stage (arena, hero, monsters, dice tray, vfx) with a DOM heads-up display on top.
//
// ui.js calls start(ctx) when a solo quest begins. This module owns Reset -> Roll -> Shape -> Lock ->
// Resolve until the fight ends, then hands back to ui.js (ctx.showVictory / ctx.defeat).
import { h, $, $$, toast, buzz } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as V from '../view.js';
import * as HK from './hudkit.js';
import * as Coach from '../coach.js';
import { sfx, music } from '../audio.js';
import { world } from './world.js';
import { intentClips } from '../gfx/actors/common.js';
import * as THREE from 'three';

const stopWindups = () => { for (const h of B.windups.splice(0)) { try { h.stop(); } catch { /* ignore */ } } };
let C = null;                // context from ui.js
const B = {
  bw: null, b: null, hero: null, quest: null, root: null, plates: new Map(), sel: new Set(), target: 0, focus: null,
  straight: 'atk', windups: [], busy: false, ringMesh: null, swing: 0, log: null, lastRep: null, ended: false, ro: null, off: null,
};
export const battleState = B;

const wait = (s) => world.stage.wait(s);
const race = (p, s = 2.2) => Promise.race([p, wait(s)]);
const vfx = (name, ...a) => { try { const p = B.bw.vfx[name]?.(...a); return p && p.then ? Promise.race([p, world.stage.wait(2.2)]) : Promise.resolve(); } catch (e) { console.warn('vfx', name, e); return Promise.resolve(); } };
const raw = (name, ...a) => { try { return B.bw.vfx[name]?.(...a); } catch (e) { console.warn('vfx', name, e); } };
const v3 = (a) => (a.isVector3 ? a : new THREE.Vector3(...a));

const EPITHET = {
  goblinking: ['THE GOBLIN KING', 'Lord of Stolen Things'], ogre: ['HILL OGRE', 'Breaker of Gates'], lich: ['THE HOLLOW LICH', 'The Dead Organize'],
  bonewarden: ['BONE WARDEN', 'Keeper of the Stair'],
};

// ------------------------------------------------------------------------------------------ start / stop
export async function start(ctx) {
  C = ctx;
  const { S } = C;
  B.b = S.battle; B.party = !!S.battle.fighters; B.hero = B.party ? S.battle.fighters[0].hero : S.hero; B.active = 0; if (world.director) world.director.pan = 0; B.quest = S.quest; B.ended = false; B.busy = true; B.sel = new Set(); B.resets = 0; B.target = 0; B.lastRep = null; B.straight = 'atk'; B.shownRound = 0; B.fresh = null;
  const layer = $('#b3'); layer.replaceChildren(); layer.className = 'b3-layer on loading';
  layer.append(h('div', { class: 'b3-loading' }, h('div', { class: 'b3-spin' }), h('p', {}, 'Gathering the dark…')));
  $('#app').classList.add('hidden');
  document.body.classList.add('in-battle');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let the loader paint before heavy procedural work
  const b = B.b;
  const bw = await world.buildBattle({ quest: B.quest, hero: B.hero, enemies: b.enemies, heroes: B.party ? b.fighters.map((f) => f.hero) : null });
  B.bw = bw; B.trayBase = bw.tray.object.scale.x;
  bw.tray.onPick = onPick;
  bw.tray.onSound = (kind, o) => { if (kind === 'hit') (sfx.dieHit || sfx.settle)?.(o?.speed); else (sfx.dieSettle || sfx.settle)?.(); };
  bw.stage.canvas.addEventListener('pointerup', pickEnemy);
  B.ringMesh = makeRing();
  bw.stage.scene.add(B.ringMesh);
  bw.stage.onFrame((dt, t) => { if (!B.ended) { positionPlates(); ringUpdate(t); framePan(dt); } });
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
  await Promise.all(b.enemies.map((e, i) => (bw.actors.get(e.uid).play('spawn', { fade: 0 }), Promise.resolve())));
  world.stage.fadeTo(0, 0.9);
  // Boss / elite title card
  const big = b.enemies.find((e) => e.tier !== 'minion');
  if (big && EPITHET[big.id]) { titleCard(...EPITHET[big.id], big.tier); sfx.rage?.(); await wait(0.9); }
  world.director.set('intro', { snap: true }); await wait(0.5);
  world.director.set('battle', { lambda: 1.8 });
  await wait(1.1);
  B.busy = false;
  // the dice are the game: keep the grade clean over every arena (light bloom and vignette, no tilt blur, neutral tints, a bright exposure)
  const c0 = bw.arena.c || bw.arena; if (c0.lookBase) { c0.lookBase.bloom = 0.12; c0.lookBase.exposure = Math.max(1.12, c0.lookBase.exposure ?? 1); }
  world.stage.post.look({ bloom: 0.12, vignette: 0.26, grain: 0.015, aberration: 0, tilt: 0, sat: 1.12, contrast: 1.12, shadowTint: 0xffffff, highTint: 0xffffff, exposure: Math.max(1.12, c0.lookBase?.exposure ?? 1.12) });
  if (!landscape()) { // phones: light the monsters so they read from above
    const L = new THREE.Group(); L.name = 'foeLight';
    const key = new THREE.PointLight(0xfff4e6, 70, 0, 2); key.position.set(0.5, 5.0, -2.5); L.add(key);
    const fill = new THREE.PointLight(0xdfe8ff, 28, 0, 2); fill.position.set(-4, 3.5, -2.5); L.add(fill);
    const fill2 = new THREE.PointLight(0xfff0d8, 28, 0, 2); fill2.position.set(4.5, 3.5, -2.5); L.add(fill2);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a5a, 0.7); L.add(hemi);
    world.stage.scene.add(L); B.foeLight = L;
  }
  B.bw.arena.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  try { if (!bw.vfx.stub) B.ambient = bw.vfx.ambientFor?.(B.quest.place || B.quest.name || '', { intensity: 0.8 }); } catch (e) { console.warn('ambientFor', e); }
  music.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  renderReset();
}

export function stop() {
  C?.tut?.detach?.();
  B.ended = true; if (B.marker) { B.marker.parent?.remove(B.marker); B.marker = null; } if (B.foeLight) { B.foeLight.parent?.remove(B.foeLight); B.foeLight = null; }
  try { B.ambient?.stop?.(); } catch { /* ignore */ } B.ambient = null;
  B.bw?.stage.canvas.removeEventListener('pointerup', pickEnemy);
  const layer = $('#b3'); layer.className = 'b3-layer'; layer.replaceChildren();
  B.plates.clear(); B.ro?.disconnect(); if (B.fit) window.removeEventListener('resize', B.fit);
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
  hud.top = h('div', { class: 'b3-top' }, hud.menu, h('div', { class: 'b3-round' }, hud.place, h('span', { class: 'b3-rline' }, hud.round, hud.score)));
  hud.plates = h('div', { class: 'b3-plates' }); hud.more = h('div', { class: 'b3-more', 'aria-hidden': 'true' }, '▾'); hud.coach = h('div', { class: 'b3-coach' });
  hud.leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); hud.leaders.setAttribute('class', 'b3-leaders'); hud.leaders.setAttribute('aria-hidden', 'true');
  hud.ribbon = h('div', { class: 'b3-ribbon' });
  hud.hero = buildHero();
  hud.therm = h('div', { class: 'b3-therm', 'aria-hidden': 'true' }, h('b', { class: 'th-n' }, '0'), h('div', { class: 'th-bar' }, h('i', { class: 'th-fill' })), h('span', { class: 'th-h' }, HK.icon('heart')));
  hud.magchip = h('div', { class: 'b3-magchip', title: 'Magic' }, HK.icon('magic'), h('b', {}, '0'));
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
    h('div', { class: 'sh-head' }, hud.tabs, h('button', { type: 'button', class: 'sh-x', 'aria-label': 'Close powers', onclick: () => togglePowers(false) }, 'Close')), hud.cards);
  hud.roster = B.party ? h('div', { class: 'b3-roster', role: 'list', 'aria-label': 'The company' }) : null;
  hud.info = h('div', { class: 'b3-sheet b3-info', role: 'dialog', 'aria-label': 'Monster details' });
  hud.bar = h('div', { class: 'b3-bar' });
  hud.dock = h('div', { class: 'b3-dock' }, hud.forecast, hud.caption, hud.bar);
  B.root.append(...[hud.leaders, hud.plates, hud.more, hud.top, hud.roster, hud.ribbon, hud.hero, hud.therm, hud.magchip, hud.divider, hud.dock, hud.sheet, hud.info, hud.coach].filter(Boolean));
  const fit = () => {
    const r = hud.dock.getBoundingClientRect(); const portrait = !landscape();
    world.director.setSafe(portrait ? Math.max(0, window.innerHeight - r.top) : 0, portrait ? Math.round(hud.top.getBoundingClientRect().bottom + 2) : Math.round(hud.plates.getBoundingClientRect().bottom + 4));
    B.root.style.setProperty('--hero-h', `${hud.hero.offsetHeight}px`); B.root.style.setProperty('--plates-b', `${Math.round(hud.plates.getBoundingClientRect().bottom + 6)}px`);
    sizePlates();
    B.root.style.setProperty('--cards-bottom', `${Math.round(window.innerHeight - r.top + 8)}px`); B.root.style.setProperty('--dock-top', `${Math.round(window.innerHeight - r.top)}px`);
    fitTray();
  };
  const moreCheck = () => { const p = hud.plates; const more = !landscape() && p.scrollHeight - p.scrollTop - p.clientHeight > 6; hud.more.classList.toggle('on', more); };
  hud.plates.addEventListener('scroll', moreCheck, { passive: true }); B.moreCheck = moreCheck; setInterval(() => { if (B.root?.isConnected) moreCheck(); }, 400);
  B.fitOff?.(); B.fitOff = world.stage.onFrame(() => { if (landscape() || !B.root?.isConnected) return; const sig = `${world.stage.width}|${world.stage.height}|${Math.round(hud.dock.getBoundingClientRect().top)}|${Math.round(hud.top.getBoundingClientRect().bottom)}|${world.stage.post.trayPass.enabled}`; if (sig !== B.fitSig) { B.fitSig = sig; fit(); } });
  B.fit = fit; B.ro?.disconnect?.(); B.ro = new ResizeObserver(fit); B.ro.observe(hud.dock); B.ro.observe(hud.hero); window.addEventListener('resize', fit);
  layer.append(B.root);
  for (const [i, e] of B.b.enemies.entries()) addPlate(e, i);
  fit();
}

// Phones: make the dice board as wide as the screen. Lower the camera (foreshorten) until the full-width board also fits
// between the monster strip and the dock; the monsters stand behind it in whatever space is left.
function fitTray() {
  const bw = B.bw; if (!bw || landscape() || !B.hud) return;
  const dir = world.director; const stage = world.stage; const W = stage.width; const H = stage.height;
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
    let lo = 4; let hi = 60; for (let i = 0; i < 40; i++) { d = (lo + hi) / 2; place(d); const nl = pt(-HALF, 0.4, EDGE); const nr = pt(HALF, 0.4, EDGE); if (nr[0] - nl[0] > W * frac) lo = d; else hi = d; }
    place(d); const farY = pt(0, 0.9, -EDGE - 0.15)[1]; const nearY = pt(0, 0.0, EDGE + 0.6)[1];
    shift = nearY - want; lineY = farY - shift + 10; B.trayFrac = frac;
    if (lineY >= minLine) break;
  }
  const farY = 0, nearY = 0; void farY; void nearY;
  cam.setViewOffset(W, H, 0, shift, W, H);
  stage.post.trayPass.band = { y: lineY, h: H - lineY };
  B.lineY = lineY; B.root.style.setProperty('--line-y', `${Math.round(lineY)}px`);
  dir.tilt = 0; dir.setSafe(Math.max(0, H - lineY), Math.round(topBar + 2));
  B.trayK = 1; B.trayDz = 0; B.trayDist = d; B.dbg = { d, deg: B.trayDeg, shift, lineY, w: pt(HALF, 0.4, EDGE)[0] - pt(-HALF, 0.4, EDGE)[0] };
}
// ------------------------------------------------------------------------------------------ company (one phone, turns)
// Each living hero rolls and locks in turn; the monsters answer once everyone is locked. b mirrors the hero whose turn it
// is (E.focusFighter); every change is written back with E.commitFighter.
const commit = () => { if (B.party) E.commitFighter(B.b); };
const nextToRoll = () => (B.party ? B.b.fighters.findIndex((f) => f.hp > 0 && !f.board) : -1);
function setActive(i) {
  const b = B.b; if (!B.party || i < 0) return;
  E.focusFighter(b, i); B.active = i; B.hero = b.hero;
  B.bw.setActiveHero(i, B.hero);
  const fresh = buildHero(); B.hud.hero.replaceWith(fresh); B.hud.hero = fresh; B.ro?.observe?.(fresh);
  B.hud.score.querySelector('b').dataset.v = String(E.pointsOf(b)); B.hud.score.querySelector('b').textContent = String(E.pointsOf(b));
  renderRoster();
}
function renderRoster() {
  const el = B.hud?.roster; if (!el) return; const b = B.b;
  const heroes = b.fighters.map((f) => f.hero);
  el.replaceChildren(...b.fighters.map((f, i) => {
    const turn = i === B.active && f.hp > 0; const locked = !!f.board && i !== B.active; const down = f.hp <= 0;
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
  const b = B.b; commit(); const me = b.fighters[B.active]; const usedRound = me.teamRound === b.round;
  const tiles = TEAM.map((t) => {
    const any = b.fighters.some((f, j) => j !== B.active && E.teamActionInfo(b, B.active, t.id, j).ok);
    const flag = t.id === 'potion' ? `${E.potionsLeft(me)} LEFT` : t.id === 'revive' ? (me.reviveUsed ? 'USED' : 'ONCE') : 'ONCE A ROUND';
    return HK.abilityCard({ id: `t:${t.id}`, name: t.name, kind: 'util', cost: t.id === 'potion' ? 0 : t.id === 'magic' ? D.SHARE_MAGIC : D.REVIVE_COST, fx: t.id === 'potion' ? { heal: E.POTION_HP } : {}, text: t.text },
      { spent: false, reset: false, afford: any && !usedRound, onclick: () => showTeamDetail(t.id), disabled: false, fresh: false, flag, cost: t.id === 'potion' ? 0 : t.id === 'magic' ? D.SHARE_MAGIC : D.REVIVE_COST, stepper: null, level: 0 });
  });
  const note = h('p', { class: 'sh-note' }, usedRound ? 'You have used your team action this round.' : 'One team action a round. Pick it, then choose a friend.');
  return [...tiles, note];
}
function showTeamDetail(kind) {
  const b = B.b; commit(); const t = TEAM.find((x) => x.id === kind); const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const friends = b.fighters.map((f, j) => ({ f, j })).filter(({ j }) => j !== B.active);
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, t.name), h('button', { type: 'button', class: 'sh-x', onclick: close }, 'Close')),
    h('p', { class: 'pd-text' }, t.text),
    h('div', { class: 'tm-friends' }, friends.map(({ f, j }) => {
      const r = E.teamActionInfo(b, B.active, kind, j);
      return h('button', { type: 'button', class: `tm-friend ${r.ok ? '' : 'no'}`, disabled: !r.ok, onclick: () => { close(); doTeam(kind, j); } },
        h('b', {}, f.hero.name), h('small', {}, `${Math.max(0, Math.ceil(f.hp))} / ${f.maxHp} health · ${f.magic} magic`), r.ok ? h('span', { class: 'tm-go' }, kind === 'revive' ? 'Revive' : kind === 'magic' ? 'Give' : 'Throw') : h('em', {}, r.why));
    })),
    h('div', { class: 'pd-act' }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Cancel')));
  B.hud.info.classList.add('open'); sfx.select();
}
function doTeam(kind, to) {
  const b = B.b; if (B.busy) return; commit();
  const before = { hp: b.fighters[to].hp, magic: b.fighters[to].magic };
  const r = E.teamAction(b, B.active, kind, to);
  if (!r.ok) { sfx.error(); toast(r.why); return; }
  const fa = B.bw.heroes[to]; const friend = b.fighters[to];
  if (kind === 'potion') { sfx.heal(); vfx('heal', fa.worldAnchor('chest'), { color: 0x45e08b }); number(fa.worldAnchor('head'), `+${friend.hp - before.hp}`, 'heal'); banner(`POTION FOR ${friend.hero.name.toUpperCase()}`, 'good'); }
  if (kind === 'magic') { sfx.magic(); vfx('aura', fa, { kind: 'buff', color: 0xa64dff, dur: 1.0 }); number(fa.worldAnchor('head'), `+${friend.magic - before.magic} magic`, 'pierce'); banner(`MAGIC FOR ${friend.hero.name.toUpperCase()}`, 'gold'); }
  if (kind === 'revive') { sfx.level?.(); vfx('aura', fa, { kind: 'summon', color: 0xfff0a0, dur: 1.4 }); fa.play('idle', { fade: 0.3 }); number(fa.worldAnchor('head'), `REVIVED +${friend.hp}`, 'heal'); banner(`${friend.hero.name.toUpperCase()} IS BACK!`, 'good'); }
  B.sheetOpen = false; B.hud.sheet.classList.remove('open'); renderRoster(); updateScore(); refresh();
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
  const mc = B.hud.magchip; if (mc) mc.querySelector('b').textContent = String(b.magic);
}

function addPlate(e) {
  const r = {
    name: h('span', { class: 'pl-name' }, e.name), hp: HK.bar({ cls: 'pl-bar', seg: Math.max(4, Math.min(12, Math.round(e.maxHp / 10))) }),
    chips: h('div', { class: 'pl-chips' }), intent: h('div', { class: 'pl-intent' }), call: h('div', { class: 'pl-call' }),
  };
  const tierIc = e.tier === 'boss' ? 'crown' : e.tier === 'elite' ? 'rank' : null;
  const el = h('button', { class: `b3-plate tier-${e.tier}`, type: 'button', 'data-uid': e.uid, onclick: () => selectTarget(e.uid), 'aria-label': e.name },
    h('i', { class: 'pl-frame' }),
    h('span', { class: 'pl-reticle', 'aria-hidden': 'true' }, h('i', {}), h('b', {}, 'TARGET')),
    h('div', { class: 'pl-head' }, tierIc ? h('span', { class: 'pl-tier' }, HK.icon(tierIc)) : null, r.name, r.chips),
    r.hp, r.intent, r.call);
  el._r = r;
  const NS = 'http://www.w3.org/2000/svg';
  const ln = document.createElementNS(NS, 'g'); ln.setAttribute('class', 'b3ld');
  ln.innerHTML = '<line class="b3ld-l" x1="0" y1="0" x2="0" y2="0"/><circle class="b3ld-d" r="3"/>';
  B.hud.leaders.append(ln); el._lead = ln;
  B.hud.plates.append(el); B.plates.set(e.uid, el);
  updatePlate(e); sizePlates();
  return el;
}
function sizePlates() {
  const n = Math.max(1, B.b.enemies.filter((e) => e.hp > 0).length); const w = window.innerWidth;
  const px = landscape() ? Math.min(188, Math.max(148, w * 0.15)) : Math.max(104, Math.min(172, Math.floor((w - 16 - 8 * (n - 1)) / n)));
  B.hud.plates.style.setProperty('--plw', `${Math.round(px)}px`);
  B.hud.plates.classList.toggle('compact', px < 150 && !landscape());
}
function intentNode(v) {
  return [HK.medallion(v.shape, v.icon),
    h('div', { class: 'in-main' }, h('b', { class: 'in-name' }, v.title),
      h('div', { class: 'in-fig' }, h('b', {}, v.fig), h('small', {}, v.unit, v.subIcon ? HK.icon(v.subIcon) : null)),
      h('small', { class: 'in-hint' }, v.hint))];
}
function updatePlate(e) {
  const el = B.plates.get(e.uid); if (!el) return;
  const r = el._r; const dead = e.hp <= 0;
  el.classList.toggle('dead', dead);
  el.classList.toggle('raged', !!e.raged);
  r.name.textContent = landscape() ? e.name : (D.MONSTERS[e.id]?.short || e.name.slice(0, 4).toUpperCase());
  HK.setBar(r.hp, e.hp, e.maxHp);
  const v = !dead && B.showIntents !== false ? HK.intentView(e) : null;
  const sig = v ? [v.tone, v.title, v.fig, v.unit, v.hint, v.call?.sub].join('|') : '';
  if (el._sig !== sig) {
    el._sig = sig;
    el.classList.toggle('has-intent', !!v);
    r.intent.className = `pl-intent${v ? ` tone-${v.tone}${v.hazard ? ' hazard' : ''}` : ''}`;
    r.intent.replaceChildren(...(v ? intentNode(v) : []));
    r.call.className = `pl-call${v?.call ? ` on tone-${v.tone}` : ''}`;
    r.call.replaceChildren(...(v?.call ? [HK.icon(v.call.ico || 'windup'), h('span', {}, h('b', {}, v.call.head), h('small', {}, v.call.sub))] : []));
    if (v) HK.replay(r.intent, 'swap');
    el.setAttribute('aria-label', v ? `${e.name}, ${e.hp} of ${e.maxHp} health. Intends ${v.title}: ${v.fig} ${v.unit}. ${v.call ? `${v.call.head}, ${v.call.sub}.` : v.hint}` : `${e.name}${dead ? ', defeated' : ''}`);
  }
  const chips = [];
  if (e.carried) chips.push(h('span', { class: 'plchip gold', title: 'Carrying stolen gold. Kill it to take it back.' }, HK.icon('gold'), h('b', {}, String(e.carried))));
  if (e.raged) chips.push(h('span', { class: 'plchip rage', title: e.rageName }, HK.icon('slam'), e.rageName || 'Enraged'));
  r.chips.replaceChildren(...chips);
  el.classList.toggle('targeted', B.b.enemies[B.target]?.uid === e.uid && !dead);
  el.setAttribute('aria-pressed', el.classList.contains('targeted') ? 'true' : 'false');
}
function updatePlates() { for (const e of B.b.enemies) updatePlate(e); }

// Phone: the monsters' stat plates are a fixed strip under the hero panel (scrolls sideways with many foes) so the dice own the screen.
// Tap a plate or a monster to choose a target.
function stripPlates() {
  const hud = B.hud; const hb = landscape() ? 64 : hud.top.getBoundingClientRect().bottom;
  if (landscape()) hud.plates.style.top = `${Math.round(hb + 6)}px`; else hud.plates.style.top = '';
  let tgt = null;
  for (const e of B.b.enemies) {
    const el = B.plates.get(e.uid); const a = B.bw.actors.get(e.uid); if (!el || !a) continue;
    const vis = a.root.visible && (e.hp > 0 || a.dissolving);
    el.style.display = vis ? '' : 'none'; el._lead.style.display = 'none'; el.style.transform = '';
    el.classList.remove('tiny');
    if (vis && el.classList.contains('targeted')) tgt = el;
  }
  if (tgt && B._scrolledTo !== tgt) { B._scrolledTo = tgt; const c = hud.plates; c.scrollTo({ left: Math.max(0, tgt.offsetLeft - 8), behavior: 'smooth' }); }
  const r = hud.plates.getBoundingClientRect(); const safeTop = Math.round(r.bottom + 2); B.root.style.setProperty('--strip-bottom', `${safeTop}px`);
  if (B._safeTop !== safeTop) { B._safeTop = safeTop; B.fit?.(); }
}
const _p = new THREE.Vector3();
function project(world3, out = {}) {
  const cam = world.stage.camera; _p.copy(world3).project(cam);
  const w = world.stage.width; const hh = world.stage.height;
  out.x = (_p.x * 0.5 + 0.5) * w; out.y = (-_p.y * 0.5 + 0.5) * hh; out.z = _p.z; return out;
}
function positionPlates() {
  return stripPlates();
  const bw = B.bw; const w = world.stage.width;
  const hud = B.hud; const GAP = 8;
  // top limit: below the hero strip (phone) / top bar (landscape), and the ribbon
  let topSafe = 8;
  const rb = (n) => (n && n.offsetHeight ? n.getBoundingClientRect().bottom : 0);
  topSafe = Math.max(topSafe, rb(hud.top) + 4, landscape() ? 0 : rb(hud.hero) + 4, rb(hud.ribbon) + 2);
  const items = [];
  for (const e of B.b.enemies) {
    const el = B.plates.get(e.uid); const a = bw.actors.get(e.uid); if (!el || !a) continue;
    const vis = a.root.visible && (e.hp > 0 || a.dissolving);
    el.style.display = vis ? '' : 'none'; el._lead.style.display = vis && e.hp > 0 ? '' : 'none';
    if (!vis) continue;
    const head = a.worldAnchor('head').clone(); head.y += (a.height || 1.5) * 0.15; const p = project(head);
    const it = { e, el, hx: p.x, hy: p.y, ax: p.x, w: el.offsetWidth || 150, h: el.offsetHeight || 90, x: p.x, y: p.y - 22 };
    if (e.tier !== 'minion') {
      // big monsters: the plate stands beside the body so it never sits on the face
      const hh = a.height || 3; const top = project(head); const low = head.clone(); low.y -= hh * 0.5; const mid = project(low);
      const halfW = Math.abs(mid.y - top.y) * 0.5 * 0.62;
      const side = top.x < w / 2 ? 1 : -1;
      it.ax = top.x + side * (halfW + it.w / 2 + 4); it.y = mid.y + it.h * 0.55; it.big = true;
    }
    items.push(it);
  }
  items.sort((a, b2) => a.ax - b2.ax);
  const total = items.reduce((s, it) => s + it.w, 0) + GAP * Math.max(0, items.length - 1);
  const rows = total > w - 12 ? 2 : 1;
  const place = (list) => {
    for (const it of list) it.x = Math.max(it.w / 2 + 6, Math.min(w - it.w / 2 - 6, it.ax));
    for (let i = 1; i < list.length; i++) { const q = list[i - 1]; const min = q.x + (q.w + list[i].w) / 2 + GAP; if (list[i].x < min) list[i].x = min; }
    for (let i = list.length - 1; i >= 0; i--) { const mx = w - list[i].w / 2 - 6; if (list[i].x > mx) list[i].x = mx; if (i < list.length - 1) { const nx = list[i + 1]; const m2 = nx.x - (nx.w + list[i].w) / 2 - GAP; if (list[i].x > m2) list[i].x = m2; } }
  };
  if (rows === 1) place(items); else { const a = items.filter((_, i) => i % 2 === 0); const b2 = items.filter((_, i) => i % 2 === 1); place(a); place(b2); for (const it of b2) { it.y -= it.h + GAP; it.row = 1; } }
  // phone: plates sit in their own row under the hero strip (never on the monsters); a leader line points down to each head
  if (!landscape()) for (const it of items) it.y = topSafe + it.h + 2 + (it.row || 0) * (it.h + GAP);
  const NS = items.length;
  const obs = [hud.cards, hud.dock, landscape() ? hud.hero : null].filter((n) => n && n.offsetHeight).map((n) => n.getBoundingClientRect()).filter((r) => r.height > 4);
  for (const it of items) {
    // no room above the head: shrink to icon + figure instead of sitting on the monster's face
    if (!it.el.classList.contains('tiny')) it.el._fullH = it.h;
    const tiny = it.y - (it.el._fullH || 90) < topSafe; it.el.classList.toggle('tiny', tiny);
    let y = Math.max(it.h + topSafe, it.y);
    for (const r of obs) if (it.x + it.w / 2 > r.left && it.x - it.w / 2 < r.right && y > r.top - 8 && y - it.h < r.bottom) y = Math.max(it.h + topSafe, r.top - 8);
    it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    const l = it.el._lead; const ln = l.firstChild; const dot = l.lastChild;
    ln.setAttribute('x1', it.x.toFixed(1)); ln.setAttribute('y1', (y - 1).toFixed(1)); ln.setAttribute('x2', it.hx.toFixed(1)); ln.setAttribute('y2', (it.hy - 2).toFixed(1));
    dot.setAttribute('cx', it.hx.toFixed(1)); dot.setAttribute('cy', (it.hy - 2).toFixed(1));
    l.classList.toggle('on', it.el.classList.contains('targeted')); l.classList.toggle('far', NS > 0 && (y - it.hy) < -4);
  }
}
function makeRing() {
  const g = new THREE.RingGeometry(0.78, 0.92, 64);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a3a).multiplyScalar(2.2), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const r = new THREE.Mesh(g, m); r.rotation.x = -Math.PI / 2; r.position.y = 0.04; r.renderOrder = 3; return r;
}
// A gold arrow bobs over the chosen monster's head, with a soft light on it, so the target stands out without moving the camera.
function markerUpdate(a, show, t) {
  if (!B.marker) {
    const g = new THREE.Group(); g.name = 'targetMarker';
    g.add(new THREE.Object3D()); // (no arrow: the red ring already shows who you are fighting; only the soft light stays)
    const lamp = new THREE.PointLight(0xfff0cc, 40, 0, 2); lamp.position.set(0, -1.2, 1.4); g.add(lamp);
    g.visible = false; B.bw.stage.scene.add(g); B.marker = g;
  }
  B.marker.visible = !!show; if (!show) return;
  const top = a.worldAnchor?.('head'); const base = top ? top.clone() : a.root.position.clone().setY((a.height || 2) * 0.9 * (a.root.scale?.y || 1));
  const bob = Math.sin(t * 4) * 0.12; B.marker.position.set(base.x, base.y + 0.55 + bob, base.z);
}
// Phones: slide the picture so the tallest creature stands near the top of the battlefield (no wasted sky),
// while the nearest feet stay above the golden line. Small monsters pan the view down, a towering one keeps it high.
const _fb = new THREE.Box3(); const _fv = new THREE.Vector3();
function framePan(dt) {
  const dir = B.bw?.director; if (!dir || landscape() || !B.hud || !B.lineY || dir.shot !== 'battle') return;
  const cam = B.bw.stage.camera; const topBar = B.hud.top.getBoundingClientRect().bottom; const W = B.bw.stage.width; const H = B.bw.stage.height;
  const roots = [B.bw.hero?.root, ...[...B.bw.actors.entries()].filter(([uid]) => (B.b.enemies.find((e) => e.uid === uid)?.hp ?? 0) > 0).map(([, a]) => a.root)].filter((r) => r && r.visible);
  if (!roots.length) return;
  let top = 1e9; let foot = -1e9;
  for (const r of roots) {
    _fb.setFromObject(r); if (_fb.isEmpty()) continue;
    const cx = (_fb.min.x + _fb.max.x) / 2; const cz = (_fb.min.z + _fb.max.z) / 2;
    _fv.set(cx, _fb.max.y, cz).project(cam); top = Math.min(top, (-_fv.y * 0.5 + 0.5) * H);
    _fv.set(cx, _fb.min.y, cz).project(cam); foot = Math.max(foot, (-_fv.y * 0.5 + 0.5) * H);
  }
  void W; if (top > 1e8) return;
  const want = topBar + 0.16 * (B.lineY - topBar); // where the tallest head should sit
  let delta = want - top; // + moves the picture down, - up
  delta = Math.min(delta, B.lineY - 8 - foot); // keep the nearest feet above the line
  delta = Math.max(delta, topBar + 4 - top); // but never lose a head under the header
  const target = Math.max(-40, Math.min(140, dir.pan - delta));
  dir.pan += (target - dir.pan) * (1 - Math.exp(-2.4 * dt)); dir.applySafe();
}
function ringUpdate(t) {
  const e = B.b.enemies[B.target]; const a = e && B.bw.actors.get(e.uid);
  const show = !!(a && e.hp > 0 && a.root.visible);
  markerUpdate(a, show && B.b.enemies.filter((x) => x.hp > 0).length > 1, t);
  // Prefer the VFX library's animated dashed target ring when it exists.
  if (B.bw.vfx.targetRing && !B.bw.vfx.stub) {
    if (!B.tring && a) { try { B.tring = B.bw.vfx.targetRing(a, { color: 0xff5a3a }); } catch (err) { console.warn('targetRing', err); B.tring = null; B.noTring = true; } }
    if (B.tring) { B.ringMesh.visible = false; if (show) { B.tring.move?.(a); } B.tring.setVisible?.(show); return; }
  }
  B.ringMesh.visible = show;
  if (!show) return;
  B.ringMesh.position.x += (a.root.position.x - B.ringMesh.position.x) * 0.35;
  B.ringMesh.position.z += (a.root.position.z - B.ringMesh.position.z) * 0.35;
  const r = Math.max(0.9, (a.radius || 0.6) * 1.5);
  B.ringMesh.scale.setScalar(r * (1 + Math.sin(t * 4) * 0.03));
  B.ringMesh.rotation.z = t * 0.6;
}
function titleCard(name, sub, tier) {
  const el = HK.titleCard(name, sub, tier);
  B.root.append(el); setTimeout(() => el.remove(), 3800);
}

// ------------------------------------------------------------------------------------------ small helpers
function floatAt(x, y, text, kind = '') {
  const f = h('div', { class: `floater ${kind}`, style: { left: `${x}px`, top: `${y}px` } }, HK.rich(text));
  document.body.append(f); setTimeout(() => f.remove(), 1300);
}
function number(worldPos, text, kind = 'dmg') {
  if (B.bw.vfx && !B.bw.vfx.stub && B.bw.vfx.damageNumber) { B.bw.vfx.damageNumber(v3(worldPos), text, { kind }); return; }
  const p = project(v3(worldPos).clone()); floatAt(p.x, p.y, text, kind);
}
const actorOf = (e) => B.bw.actors.get(e.uid);
const alive = () => B.b.enemies.filter((e) => e.hp > 0);
function targetEnemy() {
  const e = B.b.enemies[B.target];
  if (!e || e.hp <= 0) B.target = Math.max(0, B.b.enemies.findIndex((x) => x.hp > 0));
  return B.b.enemies[B.target];
}
function selectTarget(uid) {
  if (B.busy) return;
  const i = B.b.enemies.findIndex((e) => e.uid === uid);
  if (i < 0 || B.b.enemies[i].hp <= 0) return;
  if (B.target === i) { showFoeInfo(B.b.enemies[i]); return; } // tapping the chosen monster again opens its sheet
  B.target = i; sfx.select(); updatePlates();
}
const VERB = { strike: 'Strikes (block reduces it)', pierce: 'Pierces (ignores block)', guard: 'Guards: blocks your normal attack this round', mend: 'Heals itself', charge: 'Winds up: slams next round. Brace with block', howl: 'Howls: every monster hits harder next round', bind: 'Tangles: locks some of your dice next round', drain: 'Strikes and steals your magic', pilfer: 'Strikes and steals gold (kill it to get it back)', summon: 'Calls reinforcements' };
function showFoeInfo(e) {
  const def = D.MONSTERS[e.id]; const v = HK.intentView(e);
  const faces = def.faces.map((f) => h('li', {}, h('b', {}, f.n), h('span', {}, VERB[f.v] || f.v)));
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  fillInfo(h('div', { class: 'sh-head' }, h('b', {}, `${e.name}${e.tier !== 'minion' ? ` · ${e.tier}` : ''}`), h('button', { type: 'button', class: 'sh-x', onclick: close }, 'Close')),
    h('p', { class: 'fi-hp' }, `Health ${Math.max(0, e.hp)} of ${e.maxHp}  ·  Initiative d${def.init || 4}`),
    h('p', { class: 'fi-init' }, `It rolls a d${def.init || 4} each round; you roll your feet die (d${E.feetSize(B.hero)}). Higher roll strikes first, ties go to you.`),
    v ? h('p', { class: 'fi-now' }, h('b', {}, 'Next: '), `${v.title} ${v.fig} ${v.unit}. ${v.hint || ''}`) : null,
    h('b', { class: 'fi-t' }, 'Everything it can do'), h('ul', { class: 'fi-list' }, faces));
  B.hud.info.classList.add('open'); sfx.select();
}
// Raycast monsters for tap-to-target.
const ray = new THREE.Raycaster(); const v2 = new THREE.Vector2(); let downAt = null;
function pickEnemy(e) {
  if (B.ended || B.busy) return;
  const r = world.stage.canvas.getBoundingClientRect();
  v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v2, world.stage.camera);
  const roots = [...B.bw.actors.values()].filter((a) => a.root.visible).map((a) => a.root);
  const hit = ray.intersectObjects(roots, true)[0];
  if (!hit) return;
  let o = hit.object; while (o && !o.userData?.uid && o.parent) o = o.parent;
  const uid = o?.userData?.uid ?? [...B.bw.actors.entries()].find(([, a]) => a.root === (o || {}))?.[0];
  if (uid) selectTarget(uid);
}

function idleTray() {
  const b = B.b; const tray = B.bw.tray;
  const dummy = {}; for (const s of D.SLOTS) dummy[s] = { v: 1 };
  tray.show(b.board || dummy);
  for (const s of D.SLOTS) { tray.setDimmed?.(s, !b.board || !E.isActive(B.hero, s)); tray.setVacant?.(s, !E.isActive(B.hero, s)); }
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
  { id: 'u:heart', name: 'Heart change', kind: 'util', cost: D.NUDGE_COST, fx: {}, text: 'Turn the heart die up or down by one. A matching number can boost your head, hands and feet; a 5 or 6 pumps your best block or attack.' },
  { id: 'u:heal', name: 'Heal', kind: 'util', cost: 2, fx: { heal: D.HEAL_AMOUNT }, text: `Spend magic, heal health right now. As often as you can pay.` },
  { id: 'u:bigheal', name: 'Potion', kind: 'util', cost: 0, fx: { heal: E.POTION_HP }, text: 'Drink a potion and heal right away. Potions are bought at camp; what you drink is gone until you buy more.' },
];
const utilCost = (u) => (u.id === 'u:heal' ? E.healCostOf(B.hero) : u.cost);
function utilState(u, shape) {
  const b = B.b; const cost = utilCost(u); let why = '';
  if (!shape && u.id !== 'u:bigheal') why = 'Roll your dice first. You use powers while you shape the roll.'; // a potion can be drunk any time before you lock in
  else if (!shape && b.phase !== 'reset') why = 'Not now.';
  else if (u.id === 'u:heart') why = b.magic < cost ? `Needs ${cost} magic. You have ${b.magic}.` : '';
  else if (u.id === 'u:heal') why = b.hp >= b.maxHp ? 'You are at full health.' : b.magic < cost ? `Needs ${cost} magic. You have ${b.magic}.` : '';
  else if (E.potionsLeft(b) <= 0) why = 'No potions left. Buy more at camp.'; else if (b.hp >= b.maxHp) why = 'You are at full health.';
  return { cost, why };
}
function cardTiles(reset) {
  const b = B.b; const hero = B.hero; B.powerX = B.powerX || {};
  const utils = UTIL.map((u0) => { const u = { ...u0, cost: utilCost(u0), ...(u0.id === 'u:bigheal' ? { fx: { heal: E.potionHpOf(B.hero) } } : u0.id === 'u:heal' ? { fx: { heal: E.healAmountOf(B.hero) } } : {}) }; const us = utilState(u0, !reset); const el = HK.abilityCard(u, { spent: false, reset, afford: !us.why, rechargeCost: D.RECHARGE_COST, onclick: () => showUtilDetail(u0.id), disabled: false, fresh: false, flag: u.id === 'u:bigheal' ? (E.potionsLeft(b) ? `${E.potionsLeft(b)} LEFT` : 'USED') : 'ANYTIME', cost: u.cost, stepper: null, level: 0, locked: false }); if (u.id === 'u:heart') { const art = el.querySelector('.bc-art'); if (art) { art.replaceChildren(HK.icon('heart')); art.classList.add('heart-art'); } } if (us.why) el.classList.add('is-off'); return el; });
  return [...E.cardsOf(hero).map((k) => {
    const st = E.powerState(b, k); const stored = (b.charge && b.charge[k.id]) || 0;
    const x = k.kind === 'scale' ? Math.max(k.cost, Math.min(k.max, B.powerX[k.id] ?? k.cost)) : k.cost; B.powerX[k.id] = x;
    const canRecharge = !k.atwill && k.kind !== 'super';
    const onclick = () => showPowerDetail(k.id);
    const afford = b.magic >= x;
    const disabled = false; const unavailable = reset ? !(st.spent && canRecharge && b.magic >= D.RECHARGE_COST) : (st.spent || st.early || !afford);
    const fresh = B.fresh === k.id; if (fresh) B.fresh = null;
    const flag = k.kind === 'charge' ? `${stored}/${k.max}` : st.early ? `ROUND ${k.minRound}+` : k.atwill ? (st.spent ? 'USED' : 'EVERY ROUND') : k.kind === 'super' && !st.spent ? 'SUPER' : null;
    const releaseBtn = k.kind === 'charge' && stored > 0 && !reset && !(b.usedRound && b.usedRound[`${k.id}:release`]) ? h('span', { class: 'bc-step rel' }, h('i', { role: 'button', 'aria-label': `Release ${stored} charges`, onclick: (e) => { e.stopPropagation(); doCard(k.id, { release: true }); } }, `⚡ ${stored}`)) : null;
    const stepper = null; void releaseBtn; const _unusedStepper = k.kind === 'scale' && !st.spent && !reset ? h('span', { class: 'bc-step' },
      h('i', { role: 'button', 'aria-label': 'One less magic', onclick: (e) => { e.stopPropagation(); B.powerX[k.id] = Math.max(k.cost, x - 1); renderShape(); } }, '–'),
      h('i', { role: 'button', 'aria-label': 'One more magic', onclick: (e) => { e.stopPropagation(); B.powerX[k.id] = Math.min(k.max, x + 1, Math.max(k.cost, b.magic)); renderShape(); } }, '+')) : null;
    const superReady = k.kind === 'super' && !st.early && !st.spent && afford && !reset;
    if (superReady && B.superSeen !== b.round) { B.superSeen = b.round; setTimeout(() => { const el = B.hud.cards.querySelector('.bcard.super-ready'); if (!B.superToast) { B.superToast = true; toast(`${k.name} is ready!`); } }, 200); }
    const card = HK.abilityCard(k, { spent: st.spent && !k.atwill || (k.atwill && st.spent), reset, afford, rechargeCost: D.RECHARGE_COST, onclick, disabled, fresh, flag: k.atwill && st.spent && reset ? null : flag, cost: x, stepper, level: E.powerLevel(hero, k.id), locked: st.early });
    if (superReady) card.classList.add('super-ready');
    if (unavailable) card.classList.add('is-off');
    if (k.slot) card.classList.add('has-slot'); if (k.slot) card.prepend(h('span', { class: `bc-slot s-${k.slot}`, 'aria-hidden': 'true' }, h('b', {}, k.slot), h('small', {}, D.SLOT_NAME[k.slot])));
    return card;
  }),
  // under the three powers: Healing (your bought potions and magic-to-health), then the heart die
  h('div', { class: 'bc-sec' }, HK.icon('heal'), 'Healing'), ...['u:bigheal', 'u:heal'].map((id) => utils[UTIL.findIndex((u) => u.id === id)]),
  h('div', { class: 'bc-sec' }, HK.icon('heart'), 'Heart die'), utils[UTIL.findIndex((u) => u.id === 'u:heart')]].filter(Boolean);
}
// Tapping a power never casts it: it opens this card first (what it does, how often, what it costs) with Use / Cancel.
const fillInfo = (...kids) => B.hud.info.replaceChildren(...kids.filter(Boolean));
function showPowerDetail(id) {
  const b = B.b; const hero = B.hero; const k = E.cardsOf(hero).find((c) => c.id === id); if (!k) return;
  const st = E.powerState(b, k); const stored = (b.charge && b.charge[k.id]) || 0; B.powerX = B.powerX || {};
  const x = k.kind === 'scale' ? Math.max(k.cost, Math.min(k.max, B.powerX[k.id] ?? k.cost)) : k.cost; B.powerX[k.id] = x;
  const shape = b.phase === 'shape'; const canRecharge = !k.atwill && k.kind !== 'super';
  const word = { atk: 'attack', pierce: 'pierce', block: 'block', heal: 'heal' };
  const uses = k.atwill ? 'Every round. It comes back each round, so use it as often as you like.' : k.kind === 'super' ? 'Once per battle. A super power: the biggest one you have, and it cannot be recharged.' : `Once per battle. After you use it you can recharge it for ${D.RECHARGE_COST} magic between rounds.`;
  const how = k.kind === 'dice' ? `Rolls ${k.dice.n}d${k.dice.s}; the total is added as ${word[k.dice.to] || k.dice.to}.`
    : k.kind === 'scale' ? `You choose how much magic to put in (${k.cost} to ${k.max}). Every extra magic adds a die, so more magic means a bigger roll.`
    : k.kind === 'charge' ? `You pay ${k.cost} magic each round to store a charge, up to ${k.max}. Release them any round for ${Object.entries(typeof k.per === 'number' ? { atk: k.per } : k.per).map(([f, v]) => `${f === 'heal' ? 'heal ' : '+'}${v}${f === 'heal' ? '' : ` ${({ atk: 'attack', block: 'block', pierce: 'pierce', gold: 'gold' })[f] || f}`}`).join(' and ')} each. They stay stored between rounds.`
    : k.kind === 'round' ? `Grows with the round number. Not available until round ${k.minRound}.`
    : k.kind === 'super' ? `Not available until round ${k.minRound}.` : 'A flat bonus for this round.';
  const reasons = !shape ? 'Roll your dice first. You use powers while you shape the roll.'
    : st.spent ? (k.atwill ? 'Already used this round.' : 'Already used this battle.')
    : st.early ? `Unlocks in round ${k.minRound}.` : b.magic < x ? `Needs ${x} magic. You have ${b.magic}.` : '';
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const again = () => showPowerDetail(id);
  const stepRow = k.kind === 'scale' && !st.spent && shape ? h('div', { class: 'pd-step' }, h('span', {}, 'Magic to spend'),
    h('button', { type: 'button', class: 'pd-sq', 'aria-label': 'One less magic', onclick: () => { B.powerX[id] = Math.max(k.cost, x - 1); again(); } }, '–'), h('b', {}, String(x)),
    h('button', { type: 'button', class: 'pd-sq', 'aria-label': 'One more magic', onclick: () => { B.powerX[id] = Math.min(k.max, x + 1, Math.max(k.cost, b.magic)); again(); } }, '+')) : null;
  const releaseRow = k.kind === 'charge' && stored > 0 && shape && !(b.usedRound && b.usedRound[`${k.id}:release`])
    ? h('button', { type: 'button', class: 'pd-btn alt', onclick: () => { close(); doCard(k.id, { release: true }); } }, `Release ${stored} stored charge${stored > 1 ? 's' : ''}`) : null;
  const rechargeBtn = !shape && st.spent && canRecharge ? h('button', { type: 'button', class: 'pd-btn go', disabled: b.magic < D.RECHARGE_COST, onclick: () => { close(); doRecharge(id); } }, `Recharge · ${D.RECHARGE_COST} magic`) : null;
  const useBtn = rechargeBtn || h('button', { type: 'button', class: 'pd-btn go', disabled: !!reasons, onclick: () => { close(); doCard(id); } }, `Use · ${x} magic`);
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, k.name), h('button', { type: 'button', class: 'sh-x', onclick: close }, 'Close')),
    h('p', { class: 'pd-text' }, k.text),
    h('dl', { class: 'pd-facts' }, h('dt', {}, 'Uses'), h('dd', {}, uses), h('dt', {}, 'How it works'), h('dd', {}, how), h('dt', {}, 'Cost'), h('dd', {}, k.kind === 'scale' ? `${k.cost}–${k.max} magic (you choose)` : k.kind === 'charge' ? `${k.cost} magic per charge` : `${k.cost} magic`)),
    stored ? h('p', { class: 'pd-state' }, `${stored} charge${stored > 1 ? 's' : ''} stored.`) : null,
    stepRow, releaseRow,
    !rechargeBtn && reasons ? h('p', { class: 'pd-why' }, reasons) : null,
    h('div', { class: 'pd-act' }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Cancel'), useBtn));
  B.hud.info.classList.add('open'); sfx.select();
}
function showUtilDetail(id) {
  const b = B.b; const u = UTIL.find((x) => x.id === id); if (!u) return; const shape = b.phase === 'shape'; const { cost, why } = utilState(u, shape);
  const close = () => { B.hud.info.classList.remove('open'); B.hud.info.replaceChildren(); };
  const uses = id === 'u:bigheal' ? `You carry ${E.potionsLeft(b)}. Buy more at camp (${E.potionPriceOf(B.hero)} gold each).` : 'Any time you are shaping a roll, as often as you can pay.';
  const body = id === 'u:heart' ? `Turn the heart die one step up or down. It costs ${cost} magic each time. It cannot go below 1 or above 6.` : id === 'u:heal' ? `Heals ${E.healAmountOf(B.hero)} health for ${cost} magic. Do it as often as you can pay for it.` : `Heals ${E.potionHpOf(B.hero)} health right away and costs no magic. Drink it before you roll or while you shape your dice. It is gone once you drink it; buy more at camp.`;
  const nudgeBtn = (d, label) => h('button', { type: 'button', class: 'pd-btn go', disabled: !!why || (d < 0 ? b.board?.C.v <= 1 : b.board?.C.v >= 6), onclick: () => { close(); doNudge(d); } }, label);
  fillInfo(
    h('div', { class: 'sh-head' }, h('b', {}, u.name), h('button', { type: 'button', class: 'sh-x', onclick: close }, 'Close')),
    h('p', { class: 'pd-text' }, u.text),
    h('dl', { class: 'pd-facts' }, h('dt', {}, 'Uses'), h('dd', {}, uses), h('dt', {}, 'How it works'), h('dd', {}, body), h('dt', {}, 'Cost'), h('dd', {}, cost ? `${cost} magic` : 'Free')),
    why ? h('p', { class: 'pd-why' }, why) : null,
    h('div', { class: 'pd-act' }, h('button', { type: 'button', class: 'pd-btn', onclick: close }, 'Cancel'),
      ...(id === 'u:heart' ? [nudgeBtn(-1, 'Turn down'), nudgeBtn(1, 'Turn up')]
        : [h('button', { type: 'button', class: 'pd-btn go', disabled: !!why, onclick: () => { close(); if (id === 'u:heal') doHeal(); else doBigHeal(); } }, cost ? `Use · ${cost} magic` : 'Drink')])));
  B.hud.info.classList.add('open'); sfx.select();
}
function doBigHeal() {
  const b = B.b; if (B.busy) return; const before = b.hp;
  if (!E.healBig(b)) { sfx.error(); return; }
  commit(); renderRoster();
  sfx.heal(); vfx('heal', B.bw.hero.worldAnchor('chest'), { color: 0x45e08b }); number(B.bw.hero.worldAnchor('head'), `+${b.hp - before}`, 'heal'); B.bw.hero.play('drink', { fade: 0.1 }); B.bw.hero.once?.('drink');
  updateScore(); B.sheetOpen = false; B.hud.sheet.classList.remove('open'); refresh();
}
function togglePowers(on) {
  B.sheetOpen = on ?? !B.sheetOpen; B.hud.sheet.classList.toggle('open', B.sheetOpen);
  if (B.sheetOpen) { sfx.select?.(); if (B.party) setSheetTab(B.sheetTab || 'powers'); else B.hud.cards.replaceChildren(...cardTiles(B.b.phase !== 'shape')); }
}
const powersBtn = () => {
  const b = B.b; const list = E.cardsOf(B.hero);
  const ready = list.filter((k) => { const st = E.powerState(b, k); return !st.spent && !st.early && b.magic >= k.cost; }).length;
  const superReady = list.some((k) => k.kind === 'super' && !E.powerState(b, k).spent && !E.powerState(b, k).early && b.magic >= k.cost);
  return h('button', { type: 'button', class: `b3-powers ${superReady ? 'super' : ''}`, 'aria-label': `Magical powers. ${ready} ready.`, onclick: () => togglePowers() },
    h('span', { class: 'bp-tri' }, HK.icon('magic')), h('b', {}, 'Magic powers'), ready ? h('i', { class: 'bp-n' }, String(ready)) : null);
};

export function renderReset() {
  try { B.fit?.(); } catch { /* ignore */ }
  B.bw?.tray?.setLink?.(null);
  B.resets = (B.resets || 0) + 1;
  const monsterHint = () => { for (const e of (B.b?.enemies || [])) { if (e.hp > 0 && Coach.HINTS['m_' + (e.id === 'goblinking' ? 'king' : e.id)] && Coach.wantHint(B.hero, 'm_' + (e.id === 'goblinking' ? 'king' : e.id))) return 'm_' + (e.id === 'goblinking' ? 'king' : e.id); } return null; };
  setTimeout(() => { if (Coach.wantHint(B.hero, 'b_roll')) hint('b_roll'); else if (Coach.wantHint(B.hero, 'b_intent')) hint('b_intent'); else if (monsterHint()) hint(monsterHint()); else if (B.resets > 1 && Coach.wantHint(B.hero, 'b_init')) hint('b_init'); else if (B.resets > 1 && Coach.wantHint(B.hero, 'b_round2')) hint('b_round2'); else if (B.resets > 1) hint('b_powers'); }, 300);
  if (B.ended) return;
  const b = B.b; const bw = B.bw;
  if (B.party) { const nx = nextToRoll(); if (nx >= 0 && nx !== B.active) setActive(nx); else E.focusFighter(b, B.active); renderRoster(); }
  setHud({ phase: 'reset' });
  targetEnemy();
  B.sel.clear();
  stopWindups();
  // monsters telegraph
  for (const e of b.enemies) {
    const a = actorOf(e); if (!a || e.hp <= 0) continue;
    if (a.alive) { const c = intentClips(e.intent); a.play(c.tele, { fade: 0.25 }); }
    if (e.intent?.slam || e.intent?.v === 'charge') { const h = raw('aura', a, { kind: 'windup', color: 0xff3a2a, urgency: e.intent.slam ? 1 : 0.5 }); if (h?.stop) B.windups.push(h); }
  }
  updatePlates(); sizePlates();
  bw.hero.play('idle', { fade: 0.3 });
  idleTray();
  HK.setForecast(B.hud.forecast, {}); HK.setNotes(B.hud.forecast, []);
  B.hud.forecast.classList.add('idle');
  B.hud.caption.replaceChildren(caption(e0Warn()));
  B.hud.cards.replaceChildren(...cardTiles(true)); if (B.sheetOpen) togglePowers(false);
  B.hud.bar.replaceChildren(
    h('div', { class: 'b3-acts b3-acts3 reset' }, HK.button({ kind: 'cta', icon: 'lock', label: 'Lock in', id: 'b3-lock-off', disabled: true, cls: 'sq', aria: 'Lock in (roll first)' }), powersBtn(), HK.button({ kind: 'cta', icon: 'dice', label: B.party ? `Roll · ${B.hero.name}` : 'Roll dice', sub: B.party ? `${b.fighters.filter((f) => f.hp > 0 && f.board).length} of ${b.fighters.filter((f) => f.hp > 0).length} ready` : 'tap to throw', id: 'b3-roll', onclick: doRoll, cls: 'blue', aria: 'Roll the dice' })));
  if (B.shownRound !== b.round) { B.shownRound = b.round; if (b.round > 1 || !B.root.querySelector('.b3-titlecard')) HK.roundFlourish(B.root, b.round); }
  C.tut?.on('reset', b.round);
}
const caption = (content, cls = '') => h('p', { class: cls }, content);
function e0Warn() {
  const wind = alive().filter((e) => e.intent?.slam);
  const charge = alive().filter((e) => e.intent?.v === 'charge');
  const call = (ic, a, ...rest) => h('span', { class: 'cap-warn' }, HK.icon(ic), h('b', {}, a), ...rest);
  if (wind.length) return call('slam', `${wind.map((e) => e.name).join(', ')} will SLAM.`, ' Brace with block, or burst it down.');
  if (charge.length) return call('windup', `${charge.map((e) => e.name).join(', ')} is winding up.`, ' A big Slam is coming next round. Plan your block.');
  return 'The monsters have shown their hand. Roll when you are ready.';
}


// ------------------------------------------------------------------------------------------ roll & shape
async function doRoll() {
  if (B.busy || !guideSays('roll')) return; B.busy = true;
  const b = B.b; const bw = B.bw;
  if (B.party) E.startFighter(b, B.active); else E.startRoll(b);
  B.sel.clear(); B.focus = null; B.straight = 'atk';
  sfx.diceRoll ? sfx.diceRoll() : sfx.roll();
  for (const s of D.SLOTS) { bw.tray.setDimmed?.(s, !E.isActive(B.hero, s)); bw.tray.setVacant?.(s, !E.isActive(B.hero, s)); }
  renderShape();
  await bw.tray.roll(b.board);
  for (const s of D.SLOTS) bw.tray.setBound?.(s, !!b.board[s].bound);
  if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} held in a tangle.`, 'bad'); sfx.hurt(); }
  B.busy = false;
  renderShape();
  C.tut?.on('rolled');
}
function rerollText(info) {
  const b = B.b;
  if (info.kind === 'none') return { label: 'No rerolls', sub: 'all used' };
  const n = B.sel.size; const cost = info.perDie * n;
  const ord = info.kind === 'free' ? `${D.RULES.free + D.RULES.paid - b.actionsLeft + 1} of ${D.RULES.free}` : info.kind === 'paid' ? `${D.RULES.paid - b.actionsLeft + 1} of ${D.RULES.paid}` : 'free card';
  const base = info.kind === 'paid' ? 'Magic reroll' : 'Reroll';
  if (n) return { label: `${base} ${n}`, sub: info.kind === 'paid' ? [`${ord} · `, HK.costGem(cost)] : ord };
  return { label: base, sub: info.kind === 'paid' ? [`tap dice · ${ord} · `, HK.costGem(1), ' each'] : `tap dice · ${ord}` };
}
export function renderShape() {
  if (B.ended) return;
  const b = B.b; const hero = B.hero; const bw = B.bw;
  if (b.phase !== 'shape') return renderReset();
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
    if (ev.offense3 || ev.defense3) hint('b_triple');
    if (E.rerollInfo(b).kind === 'paid') hint('b_paid'); else if (b.actionsLeft < E.rerollTotal()) hint('b_lock');
  }
  bw.tray.setLink?.((ev.triples || []).map((t) => ({ slots: t.slots, color: t.kind === 'atk' ? 0xff3b3b : 0x3aa4ff })));
  B.hud.caption.replaceChildren(B.focus ? caption(HK.rich(V.describeDie(hero, B.focus, b.board[B.focus].v)), 'captip') : caption('Tap dice to pick them for a reroll. Tap a monster to choose your target.'));
  B.hud.cards.replaceChildren(...cardTiles(false));
  const seg = (k, ic, label) => h('button', { type: 'button', class: B.straight === k ? 'on' : '', 'aria-pressed': B.straight === k ? 'true' : 'false', onclick: () => { B.straight = k; renderShape(); } }, HK.icon(ic), label);
  const straight = ev.straight ? h('div', { class: 'b3-straight' }, h('span', { class: 'st-l' }, HK.icon('star'), h('b', {}, `${ev.straight}-straight`)),
    h('div', { class: 'fseg' }, seg('atk', 'atk', `Attack ${ev.straightBonus}`), seg('gold', 'gold', `Gold ${ev.straightBonus}`))) : null;
  const rr = rerollText(info);
  B.hud.bar.replaceChildren(...[
    straight,
    h('div', { class: 'b3-acts b3-acts3' },
      HK.button({ kind: 'cta', icon: 'lock', label: 'Lock in', sub: B.party ? lockSub() : undefined, id: 'b3-lock', onclick: lockIn, disabled: B.busy, cls: 'sq', aria: 'Lock in your dice and fight' }),
      powersBtn(),
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
  else { B.sel.add(slot); sfx.select(); C.tut?.on('picked', slot); }
  renderShape();
}
async function doReroll() {
  if (B.busy || !guideSays('reroll')) return; const b = B.b; const slots = [...B.sel];
  if (!E.canReroll(b, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  B.busy = true; E.reroll(b, slots); commit(); B.sel.clear(); sfx.diceRoll ? sfx.diceRoll(slots.length) : sfx.roll();
  renderShape();
  await B.bw.tray.roll(b.board, { slots });
  B.busy = false; renderShape();
  C.tut?.on('rerolled');
}
function doNudge(dir) {
  const b = B.b; if (B.busy) return;
  if (!E.nudge(b, dir)) { sfx.error(); toast(b.magic < D.NUDGE_COST ? 'Not enough ✦ Magic.' : 'The heart cannot go that way.'); return; }
  commit(); sfx.magic(); B.bw.tray.setValue?.('C', b.board.C.v, { animate: true }); B.bw.tray.pulse?.('C', 'magic'); B.sheetOpen = false; B.hud.sheet.classList.remove('open'); renderShape();
}
function doHeal() {
  const b = B.b; if (B.busy) return; const before = b.hp;
  if (!E.healSpend(b)) { sfx.error(); toast(b.hp >= b.maxHp ? 'You are at full health.' : 'Not enough ✦ Magic.'); return; }
  commit(); renderRoster(); sfx.heal(); const hp = B.bw.hero.worldAnchor('chest');
  vfx('heal', hp, { color: 0x45e08b }); number(B.bw.hero.worldAnchor('head'), `+${b.hp - before}`, 'heal'); B.bw.hero.play('drink', { fade: 0.1 });
  B.bw.hero.once?.('drink');
  B.sheetOpen = false; B.hud.sheet.classList.remove('open'); refresh();
}
function doCard(id, opts = {}) {
  const b = B.b; if (B.busy) return;
  const k = E.cardsOf(B.hero).find((c) => c.id === id);
  const r = E.castPower(b, id, { x: B.powerX?.[id], ...opts });
  if (!r) { sfx.error(); toast(k && b.round < (k.minRound || 0) ? `${k.name} unlocks in round ${k.minRound}.` : 'Not enough ✦ Magic, or already used.'); return; }
  commit(); sfx.card(); buzz(20); B.fresh = id;
  const fx = { ...k.fx, ...(k.dice ? { [k.dice.to]: r.total } : {}) }; const color = fx.heal ? 0x45e08b : fx.block ? 0x4db4ff : fx.pierce ? 0xff8a1a : fx.atk ? 0xff5a4a : 0xa64dff;
  B.bw.hero.once('cast', { back: 'ready' });
  vfx('aura', B.bw.hero, { kind: 'buff', color, dur: 1.1 });
  if (k.dice?.to === 'heal' || (!k.dice && fx.heal)) { vfx('heal', B.bw.hero.worldAnchor('chest')); number(B.bw.hero.worldAnchor('head'), `+${k.dice ? r.total : fx.heal}`, 'heal'); }
  const dice = r.released ? `  ⚡ x${r.released} = ${r.total}` : r.charged ? `  charge ${r.charged}` : r.rolls.length ? `  ${r.rolls.join(' + ')}${r.rolls.length > 1 ? ` = ${r.total}` : ''}` : '';
  banner(`${k.name.toUpperCase()}${dice}`, fx.heal ? 'good' : 'gold');
  B.sheetOpen = false; B.hud.sheet.classList.remove('open');
  renderShape();
}
function doRecharge(id) {
  const b = B.b; if (B.busy) return;
  if (E.recharge(b, id)) { commit(); sfx.magic(); vfx('aura', B.bw.hero, { kind: 'buff', color: 0xffd23d, dur: 0.8 }); renderReset(); } else { sfx.error(); toast('Not enough ✦ Magic.'); }
}
function refresh() { if (B.b.phase === 'shape') renderShape(); else renderReset(); }

// ------------------------------------------------------------------------------------------ lock in: perform the round
async function lockIn() {
  if (!B.busy && !guideSays('lock')) return;
  if (C.tut && !B.busy) C.tut.on('locked');
  try { await lockInInner(); } catch (e) { console.error('lockIn failed', e.stack); B.busy = false; B.at = `ERR ${e.message}`; try { C.toast?.('Something went wrong in the fight.'); } catch { /* */ } if (B.b.outcome === 'victory') win(); else if (B.b.outcome === 'defeat') lose(); else renderReset(); }
}
// Company: who rolls after this hero (or the monsters, when everyone has locked)
function lockSub() { const b = B.b; const nx = b.fighters.findIndex((f, i) => i !== B.active && f.hp > 0 && !f.board); return nx >= 0 ? `then ${b.fighters[nx].hero.name}` : 'monsters answer'; }
async function lockParty() {
  const b = B.b; B.busy = true; sfx.lock(); buzz(30);
  commit(); const f = b.fighters[B.active]; f.target = B.target; f.straight = B.straight;
  B.sel.clear(); B.bw.tray.setSelected?.(new Set());
  const nx = nextToRoll();
  if (nx >= 0) { b.phase = 'reset'; banner(`${f.hero.name.toUpperCase()} IS READY`, 'gold'); await wait(0.5); B.busy = false; return renderReset(); }
  return performParty();
}
async function lockInInner() {
  if (B.party) return lockParty();
  if (B.busy) return; B.busy = true;
  const b = B.b; const bw = B.bw; const hero = B.hero; const stage = world.stage;
  sfx.lock(); buzz(30);
  B.sel.clear(); bw.tray.setSelected?.(new Set());
  const ev = E.evaluate(hero, b.board, { straight: B.straight });
  bw.tray.lock?.();
  setHud({ phase: 'resolve' }); clearDock();
  stopWindups();
  const target = targetEnemy();
  const rep = E.resolve(b, { target: B.target, straight: B.straight });
  B.lastRep = rep;
  if (ev.offense3 || ev.defense3 || ev.straight) {
    sfx.synergy(); banner(ev.triples?.length ? `${ev.triples[0].name.toUpperCase()}!  +10` : `${ev.straight}-STRAIGHT!`, 'gold');
    const l = (ev.triples || []).flatMap((t) => t.slots);
    if (l.length) bw.tray.highlight?.(l, 'gold'); stage.flash(0xffd23d, 0.18);
    await wait(0.55);
  } else await wait(0.25);

  // ---------- initiative: who goes first this round
  {
    const ini = rep.init; const nm = (uid) => b.enemies.find((e) => e.uid === uid)?.name || 'Monster';
    if (ini.forced) { banner('YOU STRIKE FIRST', 'gold'); }
    else {
      for (const f of ini.foes) { const a = bw.actors.get(f.uid); if (a) number(a.worldAnchor('head'), `⚡ ${f.init}`, f.init > ini.hero ? 'hurt' : 'block'); }
      number(bw.hero.worldAnchor('head'), `⚡ ${ini.hero}`, 'pierce');
      const quick = ini.foes.filter((f) => rep.early.includes(f.uid)).map((f) => nm(f.uid));
      banner(quick.length ? `${quick.length > 1 ? 'MONSTERS' : quick[0].toUpperCase()} STRIKE${quick.length > 1 ? '' : 'S'} FIRST` : `YOU STRIKE FIRST  ⚡${ini.hero}`, quick.length ? 'bad' : 'gold');
    }
    sfx.synergy?.();
    await wait(ini.forced ? 0.6 : 1.1);
  }
  const playAct = async (act) => {
    const e = b.enemies.find((x) => x.uid === act.uid); const a = e && bw.actors.get(e.uid); if (!a) return;
    const intent = { v: act.v, n: act.name, slam: act.name === 'Slam' };
    const clips = intentClips(intent);
    const heroChest = bw.hero.worldAnchor('chest');
    const dmgVerb = ['strike', 'pierce', 'drain', 'pilfer'].includes(act.v);
    const ev2 = new Promise((res) => a.play(clips.act, { fade: 0.08, onEvent: (en) => { if (en === 'hit') res(); } }).then(res));
    if (act.v === 'charge' && !act.cancelled) { sfx.windup(); vfx('aura', a, { kind: 'windup', color: 0xff3a2a }); }
    if (act.v === 'howl') { sfx.howl?.(); vfx('aura', a, { kind: 'howl', color: 0xffffff }); }
    if (act.v === 'bind') { sfx.hex?.(); vfx('aura', bw.hero, { kind: 'buff', color: 0x7ab4ff, dur: 1.1 }); }
    if (act.v === 'summon') { sfx.summon?.(); vfx('aura', a, { kind: 'summon', color: 0x6aff6a }); }
    if (act.v === 'guard') { vfx('shield', a.worldAnchor('chest'), { color: 0xffd23d, radius: a.height * 0.5, dur: 1.0 }); }
    if (act.v === 'mend') { vfx('heal', a.worldAnchor('chest')); }
    if (dmgVerb && (act.v === 'pierce' || a.has('throw') && /Bomb|Ember|Bone/.test(act.name))) {
      await race(ev2, 1.2);
      await vfx('projectile', a.worldAnchor('handR'), heroChest, { kind: /Bomb/.test(act.name) ? 'bomb' : /Ember|Bolt/.test(act.name) ? 'fireball' : act.v === 'pierce' ? 'pierce' : 'bone', color: act.v === 'pierce' ? 0xff8a1a : 0xff8a2a });
    } else await race(ev2, 1.4);
    if (dmgVerb) {
      if (act.net > 0) {
        sfx.hurt(); buzz(60); stage.shake(act.net >= 8 ? 1.0 : 0.7); stage.hurt(Math.min(1, 0.4 + act.net / 14)); bw.director.punch(0.7);
        vfx('impact', heroChest, { kind: 'flesh', power: Math.min(1, act.net / 14) });
        bw.hero.hurt(); number(bw.hero.worldAnchor('head'), `−${act.net}`, 'hurt');
      }
      if (act.ab > 0) { vfx('shield', heroChest, { color: 0x4db4ff, radius: 1.0, dur: 0.8 }); sfx.block(); bw.hero.once?.('block', { back: 'idle' }); number(bw.hero.worldAnchor('head').clone().add(new THREE.Vector3(0.6, -0.3, 0)), `🛡 ${act.ab}`, 'block'); }
      if (act.net <= 0 && !act.ab) number(bw.hero.worldAnchor('head'), 'Blocked!', 'block');
    }
    await wait(0.3);
  };
  // monsters that rolled higher than your feet strike before you
  if (rep.acts.some((a) => a.early)) { bw.director.set('defend', { lambda: 3.5 }); for (const act of rep.acts.filter((a) => a.early)) await playAct(act); }
  if (rep.heroDown) { for (const e of b.enemies) updatePlate(e); B.busy = false; bw.tray.unlock?.(); return lose(); }

  // ---------- 1. your strike
  const tAct = bw.actors.get(rep.targetUid); const tEnemy = b.enemies.find((e) => e.uid === rep.targetUid);
  bw.director.set('attack', { lambda: 5 });
  const weaponId = hero.loadout.NW.id;
  const ranged = weaponId === 'bow'; const caster = weaponId === 'staff';
  const swing = (B.swing++ % 2) ? 'attack2' : 'attack';
  const heroClip = (rep.T.atk + rep.T.pierce) > 0 ? swing : 'cast';
  const hitP = new Promise((res) => bw.hero.play(heroClip, { fade: 0.08, onEvent: (en) => { if (en === 'hit' || en === 'release') res(); } }).then(res));
  await race(hitP, 1.6);
  const chest = tAct.worldAnchor('chest'); const headP = tAct.worldAnchor('head');
  const hcol = rep.T.pierce > 0 && rep.T.atk === 0 ? 0xff8a1a : 0xff5a4a;
  if (rep.dealt > 0 || rep.guarded > 0) {
    if (ranged) await vfx('projectile', bw.hero.worldAnchor('weapon'), chest, { kind: 'arrow', color: 0xffe0a0 });
    else if (caster) await vfx('projectile', bw.hero.worldAnchor('weapon'), chest, { kind: 'magic', color: 0xa64dff });
    else vfx('slash', chest, { color: hcol, kind: 'blade' });
  }
  if (rep.guarded > 0 && tEnemy?.intent?.v === 'guard') { vfx('shield', chest, { color: 0xffd23d, dur: 0.8 }); number(headP, `Guarded ${rep.guarded}`, 'block'); sfx.block(); }
  if (rep.dealt > 0) {
    sfx.hit(); stage.shake(0.5 + Math.min(0.5, rep.dealt / 40)); bw.director.punch(Math.min(1, 0.5 + rep.dealt / 30));
    vfx('impact', chest, { kind: 'flesh', power: Math.min(1, rep.dealt / 25) });
    tAct.hurt(); number(headP, `−${rep.dealt}`, 'dmg');
    if (rep.T.pierce) { vfx('beam', bw.hero.worldAnchor('chest'), chest, { color: 0xff8a1a, dur: 0.25 }); number(headP.clone().add(new THREE.Vector3(0.5, 0.35, 0)), `◆ ${rep.T.pierce}`, 'pierce'); }
  } else if (!rep.guarded) { number(headP, '0', 'meh'); sfx.block(); }
  for (const sp of rep.splashed || []) { // splash / area damage on the other monsters
    if (sp.uid === rep.targetUid || sp.dealt <= 0) continue;
    const a = bw.actors.get(sp.uid); if (!a) continue;
    a.hurt(); vfx('impact', a.worldAnchor('chest'), { kind: 'flesh', power: Math.min(1, sp.dealt / 20) }); number(a.worldAnchor('head'), `−${sp.dealt}`, 'dmg');
  }
  if (tEnemy) updatePlate(tEnemy);
  for (const e of b.enemies) updatePlate(e);
  stage.hitStop?.(0.06);
  await wait(0.28);
  for (const uid of rep.killed) {
    const a = bw.actors.get(uid); if (!a) continue;
    sfx.deathEmber?.(); vfx('death', a, { size: a.height });
    a.die({ dur: 1.2 }); updatePlate(b.enemies.find((e) => e.uid === uid));
  }
  await wait(rep.killed.length ? 0.55 : 0.2);

  // ---------- 2. the survivors act
  bw.director.set('defend', { lambda: 3.5 });
  for (const act of rep.acts.filter((x) => !x.early)) await playAct(act);
  // reinforcements, rage
  for (const uid of rep.summoned) {
    const i = b.enemies.findIndex((e) => e.uid === uid); if (i < 0) continue;
    const a = await bw.addEnemy(b.enemies[i], i, b.enemies);
    addPlate(b.enemies[i]); vfx('aura', a, { kind: 'summon', color: 0x6aff6a }); a.play('spawn', { fade: 0 });
  }
  for (const uid of rep.raged) {
    const a = bw.actors.get(uid); banner('ENRAGED!', 'bad'); sfx.rage(); stage.shake(1.2); stage.flash(0xff2a1a, 0.35);
    a?.setRage?.(true); await race(a?.play('rage', { fade: 0.1 }) ?? Promise.resolve(), 1.8); vfx('aura', a, { kind: 'rage', color: 0xff3a1a });
  }
  if (rep.healed) { sfx.heal(); vfx('heal', bw.hero.worldAnchor('chest')); number(bw.hero.worldAnchor('head'), `+${rep.healed}`, 'heal'); }
  if (rep.T.magic) { vfx('magicGain', bw.tray.worldPos?.('E') ?? bw.hero.worldAnchor('chest')); }
  if (rep.T.gold) { vfx('goldGain', bw.tray.worldPos?.('W') ?? bw.hero.worldAnchor('chest')); }
  if (rep.T.pierce) bw.tray.pulse?.('S', 'pierce');
  bw.tray.unlock?.();
  setHud({ phase: 'resolve' });
  for (const e of b.enemies) updatePlate(e);
  await wait(0.45);

  // ---------- 3. next
  B.busy = false;
  bw.director.set('battle', { lambda: 2.2 });
  if (b.outcome === 'victory') return win();
  if (b.outcome === 'defeat') return lose();
  renderReset();
}

// Company round: everyone has locked; the monsters answer. Plays in initiative order (rep.order).
async function performParty() {
  const b = B.b; const bw = B.bw; const stage = world.stage;
  bw.tray.lock?.(); setHud({ phase: 'resolve' }); clearDock(); stopWindups();
  const rep = E.resolveParty(b); B.lastRep = rep;
  const idxOf = (n) => b.fighters.findIndex((f) => f.hero.name === n);
  const actorOfHero = (n) => bw.heroes[idxOf(n)];
  // team triples and Heartbeat
  for (const t of rep.team || []) {
    sfx.synergy(); banner(`${t.label.toUpperCase()}  +${t.bonus}`, 'gold'); stage.flash(0xffd23d, 0.18);
    for (const n of t.names) { const a = actorOfHero(n); if (a) vfx('aura', a, { kind: 'buff', color: t.row === 'headtoe' ? 0x4db4ff : 0xff5a4a, dur: 1.0 }); }
    await wait(1.0);
  }
  if (rep.heartbeat) { sfx.magic(); banner(`HEARTBEAT  +${rep.heartbeat.magic} MAGIC EACH`, 'good'); for (const a of bw.heroes) vfx('aura', a, { kind: 'buff', color: 0xff6a9a, dur: 1.0 }); await wait(1.0); }
  // initiative
  if (rep.init.forced) { banner('THE COMPANY STRIKES FIRST', 'gold'); await wait(0.8); }
  else {
    for (const x of rep.init.heroes) { const a = actorOfHero(x.name); if (a) number(a.worldAnchor('head'), `⚡ ${x.init}`, 'pierce'); }
    for (const x of rep.init.foes) { const a = bw.actors.get(x.uid); if (a) number(a.worldAnchor('head'), `⚡ ${x.init}`, 'hurt'); }
  }
  // the slowest Feet draws the monsters (a tie: whoever has more health)
  if (rep.leader && rep.fighters.filter((x) => !x.down).length > 1) banner(`MONSTERS TARGET ${rep.leader.toUpperCase()} · SLOWEST FEET`, 'bad');
  await wait(1.1);
  const snapNames = rep.fighters.filter((x) => !x.down).map((x) => x.name);
  const strikes = rep.strikes.map((s) => ({ ...s })); const acts = rep.acts.map((a) => ({ ...a }));
  bw.director.set('attack', { lambda: 4 });
  for (const step of rep.order) {
    if (step.kind === 'hero') { const s = strikes.find((x) => x.name === step.name && !x.done); if (s) { s.done = true; await playStrike(s, rep, actorOfHero); } }
    else { const act = acts.find((x) => x.uid === step.uid && !x.done); if (act) { act.done = true; await playFoe(act, snapNames, actorOfHero); } }
  }
  for (const uid of rep.summoned) {
    const i = b.enemies.findIndex((e) => e.uid === uid); if (i < 0) continue;
    const a = await bw.addEnemy(b.enemies[i], i, b.enemies); addPlate(b.enemies[i]); vfx('aura', a, { kind: 'summon', color: 0x6aff6a }); a.play('spawn', { fade: 0 });
  }
  for (const uid of rep.raged) { const a = bw.actors.get(uid); banner('ENRAGED!', 'bad'); sfx.rage(); stage.shake(1.2); a?.setRage?.(true); await race(a?.play('rage', { fade: 0.1 }) ?? Promise.resolve(), 1.8); }
  for (const x of rep.fighters) {
    const a = actorOfHero(x.name); if (!a) continue;
    if (x.healed > 0) { vfx('heal', a.worldAnchor('chest')); number(a.worldAnchor('head'), `+${x.healed}`, 'heal'); }
    if (x.hpAfter <= 0 && !x.down) { a.play('die', { fade: 0.1 }); banner(`${x.name.toUpperCase()} IS DOWN`, 'bad'); }
  }
  // the company's shield: the hero the monsters went after is still standing
  if (rep.shield?.held) {
    const a = actorOfHero(rep.shield.name);
    if (a) { vfx('aura', a, { kind: 'buff', color: 0x4db4ff, dur: 1.0 }); number(a.worldAnchor('head'), `HELD THE LINE +${D.POINTS.heldLine}`, 'block'); }
    banner(`${rep.shield.name.toUpperCase()} HELD THE LINE`, 'good'); sfx.block?.(); await wait(0.9);
  }
  bw.tray.unlock?.();
  for (const e of b.enemies) updatePlate(e);
  await wait(0.6);
  B.busy = false;
  bw.director.set('battle', { lambda: 2.2 });
  if (b.outcome === 'victory') return win();
  if (b.outcome === 'defeat') return lose();
  B.active = -1; renderReset();
}
async function playStrike(s, rep, actorOfHero) {
  const b = B.b; const bw = B.bw; const stage = world.stage;
  const ha = actorOfHero(s.name); const ta = bw.actors.get(s.targetUid); if (!ha || !ta) return;
  const m = (rep.moral || []).find((x) => x.to === s.name);
  if (m) { banner(`MORAL BOOST +${m.n} · ${s.name.toUpperCase()}`, 'good'); vfx('aura', ha, { kind: 'buff', color: 0xffd23d, dur: 0.9 }); await wait(0.5); }
  const hero = b.fighters.find((f) => f.hero.name === s.name)?.hero; const wid = D.modelOf(hero?.loadout.NW.id);
  const hitP = new Promise((res) => ha.play((s.atk + s.pierce) > 0 ? ((B.swing++ % 2) ? 'attack2' : 'attack') : 'cast', { fade: 0.08, onEvent: (en) => { if (en === 'hit' || en === 'release') res(); } }).then(res));
  await race(hitP, 1.4);
  const chest = ta.worldAnchor('chest'); const head = ta.worldAnchor('head');
  if (s.dealt > 0 || s.guarded > 0) {
    if (wid === 'bow') await vfx('projectile', ha.worldAnchor('weapon'), chest, { kind: 'arrow', color: 0xffe0a0 });
    else if (wid === 'staff') await vfx('projectile', ha.worldAnchor('weapon'), chest, { kind: 'magic', color: 0xa64dff });
    else vfx('slash', chest, { color: 0xff5a4a, kind: 'blade' });
  }
  if (s.guarded > 0) { vfx('shield', chest, { color: 0xffd23d, dur: 0.7 }); number(head, `Guarded ${s.guarded}`, 'block'); sfx.block(); }
  if (s.dealt > 0) { sfx.hit(); stage.shake(0.4 + Math.min(0.5, s.dealt / 40)); vfx('impact', chest, { kind: 'flesh', power: Math.min(1, s.dealt / 25) }); ta.hurt(); number(head, `−${s.dealt}`, 'dmg'); }
  else if (!s.guarded) number(head, '0', 'meh');
  const e = b.enemies.find((x) => x.uid === s.targetUid); if (e) updatePlate(e);
  if (s.killed) { sfx.deathEmber?.(); vfx('death', ta, { size: ta.height }); ta.die({ dur: 1.2 }); await wait(0.5); }
  await wait(0.25);
}
async function playFoe(act, names, actorOfHero) {
  const b = B.b; const bw = B.bw; const stage = world.stage;
  const e = b.enemies.find((x) => x.uid === act.uid); const a = e && bw.actors.get(e.uid); if (!a) return;
  const clips = intentClips({ v: act.v, n: act.name, slam: act.name === 'Slam' });
  const lead = actorOfHero(names[0]) || bw.hero;
  const ev2 = new Promise((res) => a.play(clips.act, { fade: 0.08, onEvent: (en) => { if (en === 'hit') res(); } }).then(res));
  if (act.v === 'charge' && !act.cancelled) { sfx.windup(); vfx('aura', a, { kind: 'windup', color: 0xff3a2a }); }
  if (act.v === 'howl') { sfx.howl?.(); vfx('aura', a, { kind: 'howl', color: 0xffffff }); }
  if (act.v === 'guard') vfx('shield', a.worldAnchor('chest'), { color: 0xffd23d, radius: a.height * 0.5, dur: 1.0 });
  if (act.v === 'mend') vfx('heal', a.worldAnchor('chest'));
  if (act.v === 'bind') vfx('aura', lead, { kind: 'buff', color: 0x7ab4ff, dur: 1.0 });
  await race(ev2, 1.3);
  if (Array.isArray(act.parts)) {
    act.parts.forEach((part, i) => {
      const ha = actorOfHero(names[i]); if (!ha || part <= 0) return;
      const net = act.nets?.[i] ?? part; const ab = part - net;
      if (net > 0) { ha.hurt(); vfx('impact', ha.worldAnchor('chest'), { kind: 'flesh', power: Math.min(1, net / 14) }); number(ha.worldAnchor('head'), `−${net}`, 'hurt'); }
      if (ab > 0) { vfx('shield', ha.worldAnchor('chest'), { color: 0x4db4ff, radius: 0.9, dur: 0.7 }); number(ha.worldAnchor('head').clone().add(new THREE.Vector3(0.5, -0.3, 0)), `🛡 ${ab}`, 'block'); }
    });
    if (act.net > 0) { sfx.hurt(); stage.shake(act.net >= 10 ? 0.9 : 0.6); } else if (act.ab > 0) sfx.block();
  }
  await wait(0.3);
}
async function win() {
  const bw = B.bw; B.busy = true;
  bw.arena.setMood?.('victory'); music.setMood?.('victory');
  bw.director.set('victory', { lambda: 2.2 });
  for (const [i, a] of (bw.heroes || [bw.hero]).entries()) if (!B.party || B.b.fighters[i].hp > 0) a.play('victory', { fade: 0.2 }); sfx.win();
  bw.stage.flash(0xffe9a0, 0.25);
  clearDock();
  B.hud.ribbon.classList.add('hide');
  await wait(1.2);
  B.hud.ribbon.classList.remove('hide');
  C.showVictory();
}
async function lose() {
  const bw = B.bw; B.busy = true;
  sfx.lose(); bw.hero.play('die', { fade: 0.1 }); bw.stage.fadeTo(0.7, 1.4);
  await wait(1.5);
  C.defeat(false);
}
export function leave() { stop(); }

// Test hook: step the stage until the controller is idle (manual-time screenshots).
export function idle() { return !B.busy; }
