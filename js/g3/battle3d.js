// The 3D solo battle: a controller that drives the rules (engine.js) and performs the result on the
// stage (arena, hero, monsters, dice tray, vfx) with a DOM heads-up display on top.
//
// ui.js calls start(ctx) when a solo quest begins. This module owns Reset -> Roll -> Shape -> Lock ->
// Resolve until the fight ends, then hands back to ui.js (ctx.showVictory / ctx.defeat).
import { h, $, $$, toast, buzz } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as V from '../view.js';
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
  B.b = S.battle; B.hero = S.hero; B.quest = S.quest; B.ended = false; B.busy = true; B.sel = new Set(); B.target = 0; B.lastRep = null; B.straight = 'atk';
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
  if (big && EPITHET[big.id]) { titleCard(...EPITHET[big.id]); sfx.rage?.(); await wait(0.9); }
  world.director.set('intro', { snap: true }); await wait(0.5);
  world.director.set('battle', { lambda: 1.8 });
  await wait(1.1);
  B.busy = false;
  B.bw.arena.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  music.setMood?.(big && big.tier === 'boss' ? 'boss' : 'battle');
  renderReset();
}

export function stop() {
  B.ended = true;
  B.bw?.stage.canvas.removeEventListener('pointerup', pickEnemy);
  const layer = $('#b3'); layer.className = 'b3-layer'; layer.replaceChildren();
  B.plates.clear();
  document.body.classList.remove('in-battle');
  $('#app').classList.remove('hidden');
}

// ------------------------------------------------------------------------------------------ HUD
function buildHud() {
  const layer = $('#b3');
  B.root = h('div', { class: 'b3' });
  B.hud = {
    top: h('div', { class: 'b3-top' }),
    plates: h('div', { class: 'b3-plates' }),
    ribbon: h('div', { class: 'b3-ribbon' }),
    hero: h('div', { class: 'b3-hero' }),
    forecast: h('div', { class: 'b3-forecast' }),
    caption: h('div', { class: 'b3-caption' }),
    cards: h('div', { class: 'b3-cards' }),
    bar: h('div', { class: 'b3-bar' }),
  };
  B.hud.dock = h('div', { class: 'b3-dock' }, B.hud.forecast, B.hud.caption, B.hud.cards, B.hud.bar);
  B.root.append(B.hud.top, B.hud.plates, B.hud.ribbon, B.hud.hero, B.hud.dock);
  const fit = () => { const r = B.hud.dock.getBoundingClientRect(); const portrait = window.innerWidth / window.innerHeight < 1.25; world.director.setSafe(portrait ? Math.max(0, window.innerHeight - r.top) : 0, portrait ? 54 : 0); };
  B.fit = fit; new ResizeObserver(fit).observe(B.hud.dock); window.addEventListener('resize', fit); fit();
  layer.append(B.root);
  for (const [i, e] of B.b.enemies.entries()) addPlate(e, i);
}
function addPlate(e) {
  const el = h('button', { class: `b3-plate tier-${e.tier}`, type: 'button', 'data-uid': e.uid, onclick: () => selectTarget(e.uid), 'aria-label': e.name },
    h('div', { class: 'pl-name' }, e.name),
    h('div', { class: 'pl-bar' }, h('i', { class: 'pl-fill' }), h('i', { class: 'pl-ghost' }), h('b', {})),
    h('div', { class: 'pl-intent' }),
    h('div', { class: 'pl-carry' }));
  B.hud.plates.append(el); B.plates.set(e.uid, el);
  updatePlate(e);
  return el;
}
function updatePlate(e) {
  const el = B.plates.get(e.uid); if (!el) return;
  const dead = e.hp <= 0;
  el.classList.toggle('dead', dead);
  el.classList.toggle('raged', !!e.raged);
  el.querySelector('.pl-name').textContent = e.raged ? `${e.name} · ${e.rageName}` : e.name;
  const pct = Math.max(0, (e.hp / e.maxHp) * 100);
  el.querySelector('.pl-fill').style.width = `${pct}%`;
  setTimeout(() => { const g = el.querySelector('.pl-ghost'); if (g) g.style.width = `${pct}%`; }, 450);
  el.querySelector('.pl-bar b').textContent = `${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}`;
  const box = el.querySelector('.pl-intent');
  const info = !dead && B.showIntents !== false ? V.intentInfo(e) : null;
  el.classList.toggle('has-intent', !!info);
  if (info) {
    box.className = `pl-intent ${info.tone}`;
    box.replaceChildren(h('span', { class: 'iicon' }, info.icon), h('div', { class: 'itext' }, h('b', {}, info.title), h('small', {}, info.text.split(' · ')[0].split('. ')[0])));
  } else box.replaceChildren();
  el.querySelector('.pl-carry').textContent = e.carried ? `carrying ${e.carried} 🪙` : '';
  el.classList.toggle('targeted', B.b.enemies[B.target]?.uid === e.uid && !dead);
}
function updatePlates() { for (const e of B.b.enemies) updatePlate(e); }

const _p = new THREE.Vector3();
function project(world3, out = {}) {
  const cam = world.stage.camera; _p.copy(world3).project(cam);
  const w = world.stage.width; const hh = world.stage.height;
  out.x = (_p.x * 0.5 + 0.5) * w; out.y = (-_p.y * 0.5 + 0.5) * hh; out.z = _p.z; return out;
}
function positionPlates() {
  const bw = B.bw; const w = world.stage.width; const hh = world.stage.height;
  const placed = [];
  for (const e of B.b.enemies) {
    const el = B.plates.get(e.uid); const a = bw.actors.get(e.uid); if (!el || !a) continue;
    const head = a.worldAnchor('head'); const p = project(head);
    el.style.display = a.root.visible && (e.hp > 0 || a.dissolving) ? '' : 'none';
    const pw = el.offsetWidth || 150;
    let x = Math.max(pw / 2 + 6, Math.min(w - pw / 2 - 6, p.x));
    const topSafe = w / hh < 1.25 ? 124 : 56;
    let y = Math.max(el.offsetHeight + topSafe, p.y - 6);
    for (const q of placed) {
      if (Math.abs(q.x - x) < (q.w + pw) / 2 + 4 && Math.abs(q.y - y) < el.offsetHeight + 4) {
        const dir = x >= q.x ? 1 : -1; const nx = q.x + dir * ((q.w + pw) / 2 + 6);
        if (nx - pw / 2 >= 4 && nx + pw / 2 <= w - 4) x = nx; else y = q.y - el.offsetHeight - 6;
      }
    }
    placed.push({ x, y, w: pw });
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
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
  B.ringMesh.visible = show;
  if (!show) return;
  B.ringMesh.position.x += (a.root.position.x - B.ringMesh.position.x) * 0.35;
  B.ringMesh.position.z += (a.root.position.z - B.ringMesh.position.z) * 0.35;
  const r = Math.max(0.9, (a.radius || 0.6) * 1.5);
  B.ringMesh.scale.setScalar(r * (1 + Math.sin(t * 4) * 0.03));
  B.ringMesh.rotation.z = t * 0.6;
}
function titleCard(name, sub) {
  const el = h('div', { class: 'b3-titlecard' }, h('div', { class: 'tc-bar' }), h('div', { class: 'tc-copy' }, h('small', {}, sub), h('b', {}, name)), h('div', { class: 'tc-bar' }));
  B.root.append(el); setTimeout(() => el.remove(), 3200);
}

// ------------------------------------------------------------------------------------------ small helpers
function floatAt(x, y, text, kind = '') {
  const f = h('div', { class: `floater ${kind}`, style: { left: `${x}px`, top: `${y}px` } }, text);
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
function heroBox() {
  const b = B.b; const hero = B.hero; const cls = D.CLASSES[hero.cls];
  const pct = Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100));
  const gems = Array.from({ length: D.MAGIC_CAP }, (_, i) => h('i', { class: i < b.magic ? 'on' : '' }));
  return [
    h('div', { class: 'hb-id' }, h('span', { class: 'hb-glyph' }, cls.glyph), h('div', {}, h('b', {}, hero.name), h('small', {}, `Lv ${hero.level} ${cls.name}`))),
    h('div', { class: 'hb-hp' }, h('i', { class: 'hb-fill', style: { width: `${pct}%` } }), h('span', {}, `${Math.max(0, Math.ceil(b.hp))}/${b.maxHp}`)),
    h('div', { class: 'hb-magic' }, h('span', { class: 'hb-m-n' }, `✦ ${b.magic}`), h('div', { class: 'hb-gems' }, gems)),
  ];
}
function top() {
  const b = B.b;
  return [
    h('button', { class: 'b3-menu', type: 'button', onclick: () => C.menu(), 'aria-label': 'Menu' }, '☰'),
    h('div', { class: 'b3-round' }, h('small', {}, B.quest.name), h('b', {}, `Round ${b.round}`)),
  ];
}
function ribbonText() {
  const b = B.b; const rep = B.lastRep;
  if (!rep) return `${alive().map((e) => e.name).join(' and ')} ${alive().length > 1 ? 'bar' : 'bars'} the way.`;
  return V.reportLines(rep, b).slice(0, 3).map((l) => l.text).join('  ');
}
function setHud({ phase }) {
  const hud = B.hud;
  hud.top.replaceChildren(...top());
  hud.hero.replaceChildren(...heroBox());
  hud.ribbon.replaceChildren(h('p', {}, ribbonText()));
  hud.ribbon.classList.toggle('hide', phase !== 'reset');
  if (phase === 'resolve') hud.forecast.replaceChildren();
  B.root.dataset.phase = phase;
}
function cardTiles(reset) {
  const b = B.b; const hero = B.hero;
  return E.cardsOf(hero).map((k) => {
    const spent = b.used[k.id];
    const onclick = reset ? (spent ? () => doRecharge(k.id) : null) : () => doCard(k.id);
    const disabled = reset ? !(spent && b.magic >= D.RECHARGE_COST) : (spent || b.magic < k.cost);
    return h('button', { class: `b3-card ${spent ? 'spent' : ''}`, type: 'button', disabled, onclick },
      h('span', { class: 'bc-cost' }, `${reset && spent ? D.RECHARGE_COST : k.cost}✦`), h('b', {}, k.name), h('small', {}, spent ? (reset ? 'Recharge' : 'spent') : k.text));
  });
}
function btn(label, onclick, { cls = '', disabled = false, id } = {}) { return h('button', { class: `b3-btn ${cls}`, type: 'button', id, onclick, disabled }, label); }

export function renderReset() {
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
  updatePlates();
  bw.hero.play('idle', { fade: 0.3 });
  idleTray();
  B.hud.forecast.replaceChildren();
  B.hud.caption.replaceChildren(h('p', {}, e0Warn()));
  B.hud.cards.replaceChildren(...cardTiles(true));
  const wind = alive().find((e) => e.intent?.slam);
  B.hud.bar.replaceChildren(
    btn(`✚ Heal +${D.HEAL_AMOUNT} · ${E.healCostOf(B.hero)}✦`, doHeal, { cls: 'ghost', disabled: b.magic < E.healCostOf(B.hero) || b.hp >= b.maxHp }),
    btn('🎲  Roll the dice', doRoll, { cls: 'primary big', id: 'b3-roll' }));
}
function e0Warn() {
  const wind = alive().filter((e) => e.intent?.slam);
  const charge = alive().filter((e) => e.intent?.v === 'charge');
  if (wind.length) return `⚠ ${wind.map((e) => e.name).join(', ')} will SLAM. Brace with block, or burst it down.`;
  if (charge.length) return `⚠ ${charge.map((e) => e.name).join(', ')} is winding up. Deal ${charge[0].staggerAt}+ in one round to break it.`;
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
function rerollLabel(info) {
  if (info.kind === 'none') return 'No rerolls left';
  const n = B.sel.size; const cost = info.perDie * n;
  return n ? `Reroll ${n} ${n === 1 ? 'die' : 'dice'} · ${cost ? `${cost}✦` : 'free'}` : `Reroll up to ${info.dice} · ${info.perDie ? `${info.perDie}✦ each` : 'free'}`;
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
  B.hud.forecast.replaceChildren(V.forecastEl(ev, b.mods), h('div', { class: 'notes' }, V.synergyNotes(ev, b.mods).map((n) => h('span', { class: `note ${n.kind}` }, n.text))));
  B.hud.caption.replaceChildren(h('p', {}, B.focus ? V.describeDie(hero, B.focus, b.board[B.focus].v) : 'Tap dice to pick them for a reroll. Tap a monster to choose your target.'));
  B.hud.cards.replaceChildren(...cardTiles(false));
  const pips = h('div', { class: 'b3-pips', 'aria-label': 'Reroll actions left' }, Array.from({ length: D.REROLL_ACTIONS }, (_, i) => h('i', { class: i < b.actionsLeft ? 'on' : '' })), b.freeActions.length ? h('b', {}, `+${b.freeActions.length}`) : null);
  const straight = ev.straight ? h('div', { class: 'b3-straight' }, h('span', {}, `★ ${ev.straight}-straight · ${ev.straightBonus}`),
    h('div', { class: 'seg' }, h('button', { type: 'button', class: B.straight === 'atk' ? 'on' : '', onclick: () => { B.straight = 'atk'; renderShape(); } }, '⚔ Attack'),
      h('button', { type: 'button', class: B.straight === 'gold' ? 'on' : '', onclick: () => { B.straight = 'gold'; renderShape(); } }, '🪙 Gold'))) : null;
  B.hud.bar.replaceChildren(...[
    pips, straight,
    h('div', { class: 'b3-mini' },
      btn('♥▼', () => doNudge(-1), { cls: 'ghost sm', disabled: B.busy || b.magic < D.NUDGE_COST || b.board.C.v <= 1 }),
      btn('♥▲', () => doNudge(1), { cls: 'ghost sm', disabled: B.busy || b.magic < D.NUDGE_COST || b.board.C.v >= 6 }),
      btn(`✚ ${E.healCostOf(hero)}✦`, doHeal, { cls: 'ghost sm', disabled: B.busy || b.magic < E.healCostOf(hero) || b.hp >= b.maxHp })),
    btn(rerollLabel(info), doReroll, { cls: 'reroll', id: 'b3-reroll', disabled: B.busy || !E.canReroll(b, [...B.sel]) }),
    btn('🔒  Lock in', lockIn, { cls: 'primary big', id: 'b3-lock', disabled: B.busy })].filter(Boolean));
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
  sfx.card(); buzz(20);
  const k = E.cardsOf(B.hero).find((c) => c.id === id);
  const fx = k.fx; const color = fx.heal ? 0x45e08b : fx.block ? 0x4db4ff : fx.pierce ? 0xb07dff : fx.atk ? 0xff5a4a : 0xffd23d;
  B.bw.hero.once('cast', { back: 'ready' });
  vfx('aura', B.bw.hero, { kind: 'buff', color, dur: 1.1 });
  if (fx.heal) { vfx('heal', B.bw.hero.worldAnchor('chest')); number(B.bw.hero.worldAnchor('head'), `+${fx.heal}`, 'heal'); }
  C.banner(k.name.toUpperCase(), fx.heal ? 'good' : 'gold');
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
  setHud({ phase: 'resolve' }); B.hud.bar.replaceChildren(); B.hud.cards.replaceChildren(); B.hud.caption.replaceChildren();
  stopWindups();
  const target = targetEnemy();
  const rep = E.resolve(b, { target: B.target, straight: B.straight });
  B.lastRep = rep;
  if (ev.offense3 || ev.defense3 || ev.straight) {
    sfx.synergy(); C.banner(ev.offense3 || ev.defense3 ? 'TRIPLE!  +10' : `${ev.straight}-STRAIGHT!`, 'gold');
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
  const hcol = rep.T.pierce > 0 && rep.T.atk === 0 ? 0xb07dff : 0xff5a4a;
  if (rep.dealt > 0 || rep.guarded > 0) {
    if (ranged) await vfx('projectile', bw.hero.worldAnchor('weapon'), chest, { kind: 'arrow', color: 0xffe0a0 });
    else if (caster) await vfx('projectile', bw.hero.worldAnchor('weapon'), chest, { kind: 'magic', color: 0xb07dff });
    else vfx('slash', chest, { color: hcol, kind: 'blade' });
  }
  if (rep.guarded > 0 && tEnemy?.intent?.v === 'guard') { vfx('shield', chest, { color: 0xffd23d, dur: 0.8 }); number(headP, `Guarded ${rep.guarded}`, 'block'); sfx.block(); }
  if (rep.dealt > 0) {
    sfx.hit(); stage.shake(0.5 + Math.min(0.5, rep.dealt / 40)); bw.director.punch(Math.min(1, 0.5 + rep.dealt / 30));
    vfx('impact', chest, { kind: 'flesh', power: Math.min(1, rep.dealt / 25) });
    tAct.hurt(); number(headP, `−${rep.dealt}`, 'dmg');
    if (rep.T.pierce) { vfx('beam', bw.hero.worldAnchor('chest'), chest, { color: 0xb07dff, dur: 0.25 }); number(headP.clone().add(new THREE.Vector3(0.5, 0.35, 0)), `◆ ${rep.T.pierce}`, 'pierce'); }
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
  if (rep.staggered.length) { C.banner('STAGGERED!', 'gold'); sfx.synergy(); for (const uid of rep.staggered) { const a = bw.actors.get(uid); a?.hurt(); vfx('impact', a.worldAnchor('chest'), { kind: 'steel', power: 1 }); stage.shake(0.9); } await wait(0.5); }
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
      await vfx('projectile', a.worldAnchor('handR'), heroChest, { kind: /Bomb/.test(act.name) ? 'bomb' : /Ember|Bolt/.test(act.name) ? 'fireball' : act.v === 'pierce' ? 'pierce' : 'bone', color: act.v === 'pierce' ? 0xb07dff : 0xff8a2a });
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
    const a = bw.actors.get(uid); C.banner('ENRAGED!', 'bad'); sfx.rage(); stage.shake(1.2); stage.flash(0xff2a1a, 0.35);
    a?.setRage?.(true); await race(a?.play('rage', { fade: 0.1 }) ?? Promise.resolve(), 1.8); vfx('aura', a, { kind: 'rage', color: 0xff3a1a });
  }
  if (rep.lastStand) { C.banner('LAST STAND', 'bad'); sfx.rage(); bw.hero.once?.('lastStand', { back: 'idle' }); }
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
  B.hud.bar.replaceChildren(); B.hud.cards.replaceChildren(); B.hud.forecast.replaceChildren(); B.hud.caption.replaceChildren();
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
