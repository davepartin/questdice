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
  B.b = S.battle; B.hero = S.hero; B.quest = S.quest; B.ended = false; B.busy = true; B.sel = new Set(); B.target = 0; B.lastRep = null; B.straight = 'atk'; B.shownRound = 0; B.fresh = null;
  const layer = $('#b3'); layer.replaceChildren(); layer.className = 'b3-layer on loading';
  layer.append(h('div', { class: 'b3-loading' }, h('div', { class: 'b3-spin' }), h('p', {}, 'Gathering the dark…')));
  $('#app').classList.add('hidden');
  document.body.classList.add('in-battle');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let the loader paint before heavy procedural work
  const b = B.b;
  const bw = await world.buildBattle({ quest: B.quest, hero: B.hero, enemies: b.enemies });
  B.bw = bw;
  bw.tray.onPick = onPick;
  bw.tray.onSound = (kind, o) => { if (kind === 'hit') (sfx.dieHit || sfx.settle)?.(o?.speed); else (sfx.dieSettle || sfx.settle)?.(); };
  bw.stage.canvas.addEventListener('pointerup', pickEnemy);
  B.ringMesh = makeRing();
  bw.stage.scene.add(B.ringMesh);
  bw.stage.onFrame((dt, t) => { if (!B.ended) { positionPlates(); ringUpdate(t); } });
  buildHud();
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
  B.bw.arena.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  try { if (!bw.vfx.stub) B.ambient = bw.vfx.ambientFor?.(B.quest.place || B.quest.name || '', { intensity: 0.8 }); } catch (e) { console.warn('ambientFor', e); }
  music.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  renderReset();
}

export function stop() {
  B.ended = true;
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
function buildHud() {
  const layer = $('#b3');
  B.root = h('div', { class: 'b3' });
  const hud = B.hud = {};
  hud.menu = h('button', { class: 'b3-menu', type: 'button', onclick: () => C.menu(), 'aria-label': 'Menu' }, HK.icon('menu'));
  hud.place = h('small', {}); hud.round = h('b', {});
  hud.top = h('div', { class: 'b3-top' }, hud.menu, h('div', { class: 'b3-round' }, hud.place, hud.round));
  hud.plates = h('div', { class: 'b3-plates' });
  hud.leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); hud.leaders.setAttribute('class', 'b3-leaders'); hud.leaders.setAttribute('aria-hidden', 'true');
  hud.ribbon = h('div', { class: 'b3-ribbon' });
  hud.hero = buildHero();
  hud.forecast = HK.forecastStrip();
  hud.caption = h('div', { class: 'b3-caption' });
  hud.cards = h('div', { class: 'b3-cards', role: 'group', 'aria-label': 'Ability cards' });
  hud.bar = h('div', { class: 'b3-bar' });
  hud.dock = h('div', { class: 'b3-dock' }, hud.forecast, hud.caption, hud.cards, hud.bar);
  B.root.append(hud.leaders, hud.plates, hud.top, hud.ribbon, hud.hero, hud.dock);
  const fit = () => {
    const r = hud.dock.getBoundingClientRect(); const portrait = !landscape();
    world.director.setSafe(portrait ? Math.max(0, window.innerHeight - r.top) : 0, portrait ? Math.round(hud.hero.getBoundingClientRect().bottom + 84) : 0);
    B.root.style.setProperty('--hero-h', `${hud.hero.offsetHeight}px`);
    sizePlates();
  };
  B.fit = fit; B.ro?.disconnect?.(); B.ro = new ResizeObserver(fit); B.ro.observe(hud.dock); B.ro.observe(hud.hero); window.addEventListener('resize', fit);
  layer.append(B.root);
  for (const [i, e] of B.b.enemies.entries()) addPlate(e, i);
  fit();
}

function buildHero() {
  const hero = B.hero; const cls = D.CLASSES[hero.cls];
  const r = B.hr = {
    name: h('b', { class: 'hb-name' }, hero.name), cls: h('small', { class: 'hb-cls' }, cls.name),
    hp: HK.bar({ cls: 'hb-hp', seg: 8 }), mn: h('b', { class: 'hb-mn' }, '0'), gems: HK.gems(D.MAGIC_CAP),
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
  r.name.textContent = e.name;
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

const _p = new THREE.Vector3();
function project(world3, out = {}) {
  const cam = world.stage.camera; _p.copy(world3).project(cam);
  const w = world.stage.width; const hh = world.stage.height;
  out.x = (_p.x * 0.5 + 0.5) * w; out.y = (-_p.y * 0.5 + 0.5) * hh; out.z = _p.z; return out;
}
function positionPlates() {
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
function ringUpdate(t) {
  const e = B.b.enemies[B.target]; const a = e && B.bw.actors.get(e.uid);
  const show = !!(a && e.hp > 0 && a.root.visible);
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
  B.target = i; sfx.select(); updatePlates();
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
  for (const s of D.SLOTS) tray.setDimmed?.(s, !b.board);
  tray.setSelected?.(new Set());
}

// ------------------------------------------------------------------------------------------ reset screen
function ribbonNodes() {
  const b = B.b; const rep = B.lastRep;
  if (!rep) return [`${alive().map((e) => e.name).join(' and ')} ${alive().length > 1 ? 'bar' : 'bars'} the way.`];
  return V.reportLines(rep, b).slice(0, 3).flatMap((l, i) => [i ? h('i', { class: 'rb-sep' }) : null, h('span', { class: `rb-${l.kind || 'meh'}` }, HK.rich(l.text))]);
}
function setHud({ phase }) {
  const hud = B.hud; const b = B.b;
  hud.place.textContent = B.quest.name;
  if (hud.round.dataset.r !== String(b.round)) { hud.round.dataset.r = String(b.round); hud.round.textContent = `Round ${b.round}`; HK.replay(hud.round, 'tick'); }
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
function cardTiles(reset) {
  const b = B.b; const hero = B.hero;
  return E.cardsOf(hero).map((k) => {
    const spent = b.used[k.id];
    const onclick = reset ? (spent ? () => doRecharge(k.id) : null) : () => doCard(k.id);
    const afford = b.magic >= k.cost;
    const disabled = reset ? !(spent && b.magic >= D.RECHARGE_COST) : (spent || !afford);
    const fresh = B.fresh === k.id; if (fresh) B.fresh = null;
    return HK.abilityCard(k, { spent, reset, afford, rechargeCost: D.RECHARGE_COST, onclick, disabled, fresh });
  });
}
const healBtn = () => {
  const cost = E.healCostOf(B.hero); const dis = B.busy || B.b.magic < cost || B.b.hp >= B.b.maxHp;
  return HK.button({ kind: 'mini', icon: 'heal', badge: HK.costGem(cost, 'badge'), onclick: doHeal, disabled: dis, cls: 'k-heal', aria: `Heal ${D.HEAL_AMOUNT} health for ${cost} magic` });
};

export function renderReset() {
  B.bw?.tray?.setLink?.(null);
  if (B.ended) return;
  const b = B.b; const bw = B.bw;
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
  B.hud.cards.replaceChildren(...cardTiles(true));
  B.hud.bar.replaceChildren(
    healBtn(),
    HK.button({ kind: 'cta', icon: 'dice', label: 'Roll dice', id: 'b3-roll', onclick: doRoll, aria: 'Roll the dice' }));
  if (B.shownRound !== b.round) { B.shownRound = b.round; if (b.round > 1 || !B.root.querySelector('.b3-titlecard')) HK.roundFlourish(B.root, b.round); }
}
const caption = (content, cls = '') => h('p', { class: cls }, content);
function e0Warn() {
  const wind = alive().filter((e) => e.intent?.slam);
  const charge = alive().filter((e) => e.intent?.v === 'charge');
  const call = (ic, a, ...rest) => h('span', { class: 'cap-warn' }, HK.icon(ic), h('b', {}, a), ...rest);
  if (wind.length) return call('slam', `${wind.map((e) => e.name).join(', ')} will SLAM.`, ' Brace with block, or burst it down.');
  if (charge.length) return call('windup', `${charge.map((e) => e.name).join(', ')} is winding up.`, ` Deal ${charge[0].staggerAt}+ in one round to break it.`);
  return 'The monsters have shown their hand. Roll when you are ready.';
}


// ------------------------------------------------------------------------------------------ roll & shape
async function doRoll() {
  if (B.busy) return; B.busy = true;
  const b = B.b; const bw = B.bw;
  E.startRoll(b);
  B.sel.clear(); B.focus = null; B.straight = 'atk';
  sfx.diceRoll ? sfx.diceRoll() : sfx.roll();
  for (const s of D.SLOTS) bw.tray.setDimmed?.(s, false);
  renderShape();
  await bw.tray.roll(b.board);
  for (const s of D.SLOTS) bw.tray.setBound?.(s, !!b.board[s].bound);
  if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} locked by a hex.`, 'bad'); sfx.hurt(); }
  B.busy = false;
  renderShape();
}
function rerollText(info) {
  if (info.kind === 'none') return { label: 'No rerolls left', sub: 'actions spent' };
  const n = B.sel.size; const cost = info.perDie * n;
  if (n) return { label: `Reroll ${n} ${n === 1 ? 'die' : 'dice'}`, sub: cost ? HK.costGem(cost) : 'free' };
  return { label: 'Reroll', sub: info.perDie ? [`up to ${info.dice} · `, HK.costGem(info.perDie), ' each'] : `up to ${info.dice} · free` };
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
  if (ev.offense3) lines.push(['NW', 'N', 'NE']);
  if (ev.defense3) lines.push(['N', 'C', 'S']);
  if (lines.length) bw.tray.highlight?.(lines.flat(), 'gold'); else bw.tray.clearHighlight?.();
  B.hud.forecast.classList.remove('idle');
  HK.setForecast(B.hud.forecast, HK.forecastValues(ev, b.mods));
  HK.setNotes(B.hud.forecast, HK.synergyList(ev, b.mods));
  // triples glow on the tray: a bar through the three dice that go together (the note above says what they give)
  bw.tray.setLink?.([ev.offense3 ? { slots: ['NW', 'N', 'NE'], color: 0xff3b3b } : null, ev.defense3 ? { slots: ['N', 'C', 'S'], color: 0x3aa4ff } : null].filter(Boolean));
  B.hud.caption.replaceChildren(B.focus ? caption(HK.rich(V.describeDie(hero, B.focus, b.board[B.focus].v)), 'captip') : caption('Tap dice to pick them for a reroll. Tap a monster to choose your target.'));
  B.hud.cards.replaceChildren(...cardTiles(false));
  const pips = h('div', { class: 'b3-pips', role: 'img', 'aria-label': `${b.actionsLeft} of ${D.REROLL_ACTIONS} reroll actions left${b.freeActions.length ? `, plus ${b.freeActions.length} free` : ''}` },
    h('small', {}, 'REROLLS'), Array.from({ length: D.REROLL_ACTIONS }, (_, i) => h('i', { class: i < b.actionsLeft ? 'on' : '' })), b.freeActions.length ? h('b', {}, `+${b.freeActions.length}`) : null);
  const seg = (k, ic, label) => h('button', { type: 'button', class: B.straight === k ? 'on' : '', 'aria-pressed': B.straight === k ? 'true' : 'false', onclick: () => { B.straight = k; renderShape(); } }, HK.icon(ic), label);
  const straight = ev.straight ? h('div', { class: 'b3-straight' }, h('span', { class: 'st-l' }, HK.icon('star'), h('b', {}, `${ev.straight}-straight`), h('em', {}, `+${ev.straightBonus} to`)),
    h('div', { class: 'fseg' }, seg('atk', 'atk', 'Attack'), seg('gold', 'gold', 'Gold'))) : null;
  const cantNudge = (d) => B.busy || b.magic < D.NUDGE_COST || (d < 0 ? b.board.C.v <= 1 : b.board.C.v >= 6);
  const nudge = (d) => HK.button({ kind: 'mini', icon: h('span', { class: 'nudge' }, HK.icon('heart'), h('i', { class: d < 0 ? 'dn' : 'up' })), badge: HK.costGem(D.NUDGE_COST, 'badge'), onclick: () => doNudge(d), disabled: cantNudge(d), aria: `Nudge the heart die ${d < 0 ? 'down' : 'up'} one, costs ${D.NUDGE_COST} magic` });
  const rr = rerollText(info);
  B.hud.bar.replaceChildren(...[
    straight,
    h('div', { class: 'b3-tools' }, pips, h('div', { class: 'b3-mini' }, nudge(-1), nudge(1), healBtn())),
    h('div', { class: 'b3-acts' },
      HK.button({ kind: 'reroll', icon: 'reroll', label: rr.label, sub: rr.sub, id: 'b3-reroll', onclick: doReroll, disabled: B.busy || !E.canReroll(b, [...B.sel]), aria: rr.label }),
      HK.button({ kind: 'cta', icon: 'lock', label: 'Lock in', id: 'b3-lock', onclick: lockIn, disabled: B.busy, aria: 'Lock in your dice and fight' }))].filter(Boolean));
}

function onPick(slot) {
  if (B.busy || B.ended || B.b.phase !== 'shape') return;
  const b = B.b; const info = E.rerollInfo(b);
  B.focus = slot;
  if (b.board[slot].bound) { sfx.error(); toast('That die is hexed. It cannot be rerolled this round.', 'bad'); renderShape(); return; }
  if (B.sel.has(slot)) B.sel.delete(slot);
  else if (info.kind === 'none') { sfx.error(); toast('No reroll actions left.'); }
  else if (B.sel.size >= info.dice) { sfx.error(); toast(`You can reroll up to ${info.dice} dice at a time.`); }
  else { B.sel.add(slot); sfx.select(); }
  renderShape();
}
async function doReroll() {
  if (B.busy) return; const b = B.b; const slots = [...B.sel];
  if (!E.canReroll(b, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  B.busy = true; E.reroll(b, slots); B.sel.clear(); sfx.diceRoll ? sfx.diceRoll(slots.length) : sfx.roll();
  renderShape();
  await B.bw.tray.roll(b.board, { slots });
  B.busy = false; renderShape();
}
function doNudge(dir) {
  const b = B.b; if (B.busy) return;
  if (!E.nudge(b, dir)) { sfx.error(); toast(b.magic < D.NUDGE_COST ? 'Not enough ✦ Magic.' : 'The heart cannot go that way.'); return; }
  sfx.magic(); B.bw.tray.setValue?.('C', b.board.C.v, { animate: true }); B.bw.tray.pulse?.('C', 'magic'); renderShape();
}
function doHeal() {
  const b = B.b; if (B.busy) return; const before = b.hp;
  if (!E.healSpend(b)) { sfx.error(); toast(b.hp >= b.maxHp ? 'You are at full health.' : 'Not enough ✦ Magic.'); return; }
  sfx.heal(); const hp = B.bw.hero.worldAnchor('chest');
  vfx('heal', hp, { color: 0x45e08b }); number(B.bw.hero.worldAnchor('head'), `+${b.hp - before}`, 'heal'); B.bw.hero.play('drink', { fade: 0.1 });
  B.bw.hero.once?.('drink');
  refresh();
}
function doCard(id) {
  const b = B.b; if (B.busy) return;
  if (!E.playCard(b, id)) { sfx.error(); toast('Not enough ✦ Magic, or already spent.'); return; }
  sfx.card(); buzz(20); B.fresh = id;
  const k = E.cardsOf(B.hero).find((c) => c.id === id);
  const fx = k.fx; const color = fx.heal ? 0x45e08b : fx.block ? 0x4db4ff : fx.pierce ? 0xff8a1a : fx.atk ? 0xff5a4a : 0xa64dff;
  B.bw.hero.once('cast', { back: 'ready' });
  vfx('aura', B.bw.hero, { kind: 'buff', color, dur: 1.1 });
  if (fx.heal) { vfx('heal', B.bw.hero.worldAnchor('chest')); number(B.bw.hero.worldAnchor('head'), `+${fx.heal}`, 'heal'); }
  banner(k.name.toUpperCase(), fx.heal ? 'good' : 'gold');
  renderShape();
}
function doRecharge(id) {
  const b = B.b; if (B.busy) return;
  if (E.recharge(b, id)) { sfx.magic(); vfx('aura', B.bw.hero, { kind: 'buff', color: 0xffd23d, dur: 0.8 }); renderReset(); } else { sfx.error(); toast('Not enough ✦ Magic.'); }
}
function refresh() { if (B.b.phase === 'shape') renderShape(); else renderReset(); }

// ------------------------------------------------------------------------------------------ lock in: perform the round
async function lockIn() {
  try { await lockInInner(); } catch (e) { console.error('lockIn failed', e.stack); B.busy = false; B.at = `ERR ${e.message}`; try { C.toast?.('Something went wrong in the fight.'); } catch { /* */ } if (B.b.outcome === 'victory') win(); else if (B.b.outcome === 'defeat') lose(); else renderReset(); }
}
async function lockInInner() {
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
    sfx.synergy(); banner(ev.offense3 || ev.defense3 ? 'TRIPLE!  +10' : `${ev.straight}-STRAIGHT!`, 'gold');
    const l = []; if (ev.offense3) l.push('NW', 'N', 'NE'); if (ev.defense3) l.push('N', 'C', 'S');
    if (l.length) bw.tray.highlight?.(l, 'gold'); stage.flash(0xffd23d, 0.18);
    await wait(0.55);
  } else await wait(0.25);

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
  if (tEnemy) updatePlate(tEnemy);
  for (const e of b.enemies) updatePlate(e);
  stage.hitStop?.(0.06);
  await wait(0.28);
  for (const uid of rep.killed) {
    const a = bw.actors.get(uid); if (!a) continue;
    sfx.deathEmber?.(); vfx('death', a, { size: a.height });
    a.die({ dur: 1.2 }); updatePlate(b.enemies.find((e) => e.uid === uid));
  }
  if (rep.staggered.length) { banner('STAGGERED!', 'gold'); sfx.synergy(); for (const uid of rep.staggered) { const a = bw.actors.get(uid); a?.hurt(); vfx('impact', a.worldAnchor('chest'), { kind: 'steel', power: 1 }); stage.shake(0.9); } await wait(0.5); }
  await wait(rep.killed.length ? 0.55 : 0.2);

  // ---------- 2. the survivors act
  bw.director.set('defend', { lambda: 3.5 });
  for (const act of rep.acts) {
    const e = b.enemies.find((x) => x.uid === act.uid); const a = e && bw.actors.get(e.uid); if (!a) continue;
    const intent = { v: act.v, n: act.name, slam: act.name === 'Slam' };
    const clips = intentClips(intent);
    const heroChest = bw.hero.worldAnchor('chest');
    const dmgVerb = ['strike', 'pierce', 'drain', 'pilfer'].includes(act.v);
    const ev2 = new Promise((res) => a.play(clips.act, { fade: 0.08, onEvent: (en) => { if (en === 'hit') res(); } }).then(res));
    if (act.v === 'charge' && !act.cancelled) { sfx.windup(); vfx('aura', a, { kind: 'windup', color: 0xff3a2a }); }
    if (act.v === 'howl') { sfx.howl?.(); vfx('aura', a, { kind: 'howl', color: 0xffffff }); }
    if (act.v === 'bind') { sfx.hex?.(); vfx('aura', bw.hero, { kind: 'hex', color: 0x9a4aff }); }
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
  }
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
  if (rep.lastStand) { banner('LAST STAND', 'bad'); sfx.rage(); bw.hero.once?.('lastStand', { back: 'idle' }); }
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

async function win() {
  const bw = B.bw; B.busy = true;
  bw.arena.setMood?.('victory'); music.setMood?.('victory');
  bw.director.set('victory', { lambda: 2.2 });
  bw.hero.play('victory', { fade: 0.2 }); sfx.win();
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
