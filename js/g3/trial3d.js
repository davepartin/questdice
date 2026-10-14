// The roll for a test on the road, on the real dice table (Dave, Oct 2026: "use the good graphics and the good dice we already built").
// Your own board, the battle's dice tray, holds only the dice being tested (the head for wisdom, both hands for strength, the feet for
// speed); the other sockets show their carved marks. The other side's dice sit on a small mat across the table, and a scoreboard
// between the two keeps the totals. One tap throws everything; the dice tumble for real and land on the seeded roll (trials.js
// already decided it, this only shows it). Resolves when the player taps Continue.
import * as THREE from 'three';
import { world } from './world.js';
import { h } from '../dom.js';
import { STATS } from '../trials.js';
import { sfx } from '../audio.js';
import { mat } from '../gfx/mats.js';
import { worldUV } from '../gfx/util.js';
import { createDie, restQuat } from '../gfx/dice/dice.js';
import { leanQuat, d4Lift } from '../gfx/dice/poly.js';
import { planRoll, samplePlan, ROLL, ROLL_PLAYBACK } from '../gfx/dice/roll.js';

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FOE_THEME = 'pet-atk'; // the other side's dice: deep red with bright numbers, a colour none of your body's dice wear
const DIE_SCALE = 1.5;        // drawn this much larger than the physics body, as on your board
const MAT_Z = -4.2;           // the other side's mat, across the table from your board (your board's far edge is at -2.35)
const MAT_D = 1.5;
const GAP_Z = -2.92;          // the strip between the two, where the scoreboard sits
const SPACING = 1.3;

// A small board for the other side: a wooden slab with a raised rim and a dark felt top.
function buildMat(n) {
  const w = n * SPACING + 0.55; const d = MAT_D; const g = new THREE.Group(); g.name = 'foeMat';
  const rr = (shape, hw, hd, r) => { shape.moveTo(-hw + r, -hd); shape.lineTo(hw - r, -hd); shape.quadraticCurveTo(hw, -hd, hw, -hd + r); shape.lineTo(hw, hd - r); shape.quadraticCurveTo(hw, hd, hw - r, hd); shape.lineTo(-hw + r, hd); shape.quadraticCurveTo(-hw, hd, -hw, hd - r); shape.lineTo(-hw, -hd + r); shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd); return shape; };
  const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; };
  const wood = mat('woodDark', { repeat: 1, roughness: 0.9 });
  // the slab, down to the table
  let slab = flat(new THREE.ExtrudeGeometry(rr(new THREE.Shape(), w / 2, d / 2, 0.16), { depth: 0.85, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 10 }));
  slab.translate(0, -0.93, 0); slab = worldUV(slab, 0.45);
  const slabM = new THREE.Mesh(slab, wood); slabM.receiveShadow = true; g.add(slabM);
  // the rim
  const ring = rr(new THREE.Shape(), w / 2 + 0.02, d / 2 + 0.02, 0.16); ring.holes.push(rr(new THREE.Path(), w / 2 - 0.13, d / 2 - 0.13, 0.08));
  let rim = flat(new THREE.ExtrudeGeometry(ring, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 10 }));
  rim.translate(0, -0.07, 0); rim = worldUV(rim, 0.45);
  g.add(new THREE.Mesh(rim, wood));
  // a thin brass line just inside the rim
  const brass = mat('bronze', { repeat: 1, roughness: 0.6 }).clone(); brass.color.set(0xffe0a0); brass.envMapIntensity = 1.4;
  const line = rr(new THREE.Shape(), w / 2 - 0.12, d / 2 - 0.12, 0.08); line.holes.push(rr(new THREE.Path(), w / 2 - 0.15, d / 2 - 0.15, 0.06));
  const lineM = new THREE.Mesh(flat(new THREE.ShapeGeometry(line, 10)), brass); lineM.position.y = -0.045; g.add(lineM);
  // the felt
  const felt = mat('leather', { repeat: [2, 2], roughness: 1 }).clone(); felt.color.set(0x3a2a36);
  const fm = new THREE.Mesh(flat(new THREE.ShapeGeometry(rr(new THREE.Shape(), w / 2 - 0.13, d / 2 - 0.13, 0.08), 10)), felt); fm.position.y = -0.05; fm.receiveShadow = true; g.add(fm);
  return g;
}

export async function showTrial3D(trial, { title = '', members = [] } = {}) {
  const champ = members.find((m) => m.name === trial.who && m.cls === trial.cls) || members.find((m) => m.name === trial.who) || members[0];
  if (!champ || !world.available || !world.stage) throw new Error('no table');
  const st = STATS[trial.stat] || STATS.wisdom; const slots = st.slots;
  const bw = await world.buildTable({ hero: champ });
  const stage = bw.stage; const tray = bw.tray; const cam = stage.trayCamera;
  tray.onSound = (kind, o) => { if (kind === 'hit') (sfx.dieHit || sfx.settle)?.(o?.speed); else (sfx.dieSettle || sfx.settle)?.(); };
  // your board: the tested dice show their biggest face; every other socket shows only its carved mark
  const board = {}; slots.forEach((sl, i) => { board[sl] = { v: trial.heroSizes[i] }; });
  tray.show(board);
  tray.setWaiting(true, ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'].filter((sl) => !slots.includes(sl)));
  // the other side's dice on their own mat, turned round so they throw from their side toward you
  const n = trial.oppSizes.length;
  const foeGroup = new THREE.Group(); foeGroup.position.set(0, 0, MAT_Z); foeGroup.rotation.y = Math.PI; stage.trayScene.add(foeGroup);
  foeGroup.add(buildMat(n));
  const foe = trial.oppSizes.map((sides, i) => {
    const labels = Array.from({ length: sides }, (_, k) => ({ text: String(k + 1) }));
    const die = createDie({ spec: { slot: `F${i}`, sides, theme: FOE_THEME, labels, key: `foe|${sides}` }, quality: 'high' });
    die.mesh.scale.setScalar(DIE_SCALE); foeGroup.add(die.mesh);
    const x = (i - (n - 1) / 2) * SPACING;
    return { die, sock: new THREE.Vector3(-x, 0, 0), pos: new THREE.Vector3(), quat: new THREE.Quaternion(), value: sides, anim: null, rest: 1 };
  });
  const restY = (f) => -ROLL.dishDepth + f.die.inR + d4Lift(f.die.poly);
  const awayLocal = () => { const v = foeGroup.worldToLocal(cam.position.clone()); const l = Math.hypot(v.x, v.z) || 1; return [-v.x / l, -v.z / l]; };
  const placeFoe = (f, i) => { const a = awayLocal(); restQuat(f.die.poly, f.value, a[0], a[1], (i - 0.5) * 0.18, f.quat); leanQuat(f.die.poly, f.quat, f.value, f.quat); f.pos.set(f.sock.x, restY(f), f.sock.z); };
  const view = new THREE.Vector3(); const p = new THREE.Vector3(); const q = new THREE.Quaternion();
  let foeDone = null;
  stage.onFrame((dt, t) => {
    const c = Math.cos(0.34); const a = cam.position.clone().setY(0).normalize(); view.set(a.x * c, Math.sin(0.34), a.z * c);
    let rolling = false;
    foe.forEach((f) => {
      if (f.anim) {
        rolling = true; const an = f.anim; an.t += dt * ROLL_PLAYBACK; const lt = an.t - an.plan.delay;
        samplePlan(an.plan, lt, p, q); f.pos.copy(p); f.quat.copy(q);
        while (an.ev < an.plan.events.length && an.plan.events[an.ev].t <= lt) { const e = an.plan.events[an.ev++]; if (e.kind === 'hit') { if (e.speed > 2.2) (sfx.dieHit || sfx.settle)?.(e.speed); } else (sfx.dieSettle || sfx.settle)?.(); }
        if (lt >= an.plan.T) { f.anim = null; f.pos.set(f.sock.x, restY(f), f.sock.z); f.quat.copy(an.plan.qFinal); }
      }
      const die = f.die; const U = die.uniforms;
      die.mesh.position.set(f.pos.x, f.pos.y + (DIE_SCALE - 1) * (die.inR + d4Lift(die.poly)), f.pos.z); die.mesh.quaternion.copy(f.quat);
      U.uTime.value = t; die.mesh.updateWorldMatrix(true, false); die.updateCamera(cam);
      const air = THREE.MathUtils.clamp((f.pos.y - restY(f)) / 0.5, 0, 1); f.rest += ((1 - air) - f.rest) * (1 - Math.exp(-14 * dt));
      die.setRest(f.rest); die.setView(view);
    });
    if (!rolling && foeDone) { const r = foeDone; foeDone = null; r(); }
  });

  // ---------------------------------------------------------------------------------------------- the screen over it
  const foeName = trial.foe || 'The other side'; const who = trial.who;
  const sizes = (list) => list.map((s) => `d${s}`).join(' + ');
  const theirs = h('b', { class: 't3-num' }, '–'); const mine = h('b', { class: 't3-num' }, '–');
  const foePlate = h('div', { class: 't3-plate them' }, h('b', {}, foeName), h('small', {}, sizes(trial.oppSizes)));
  const score = h('div', { class: 't3-score' },
    h('div', { class: 't3-side them' }, theirs, h('small', {}, foeName)),
    h('i', { class: 't3-vs' }, 'VS'),
    h('div', { class: 't3-side me' }, mine, h('small', {}, who)));
  const myPlate = h('div', { class: 't3-plate me' }, h('b', {}, who), h('small', {}, `${st.name} · ${sizes(trial.heroSizes)}`));
  const verdict = h('div', { class: 't3-verdict', 'aria-live': 'polite' });
  const go = h('button', { type: 'button', class: 'dr-ok tr-go t3-go' }, `Roll ${trial.heroSizes.length > 1 ? 'your dice' : 'your die'}`);
  const head = h('header', { class: 't3-head' }, h('small', { class: 'dr-kicker' }, st.word), h('h3', {}, title),
    h('p', {}, `${who} rolls ${st.die === 'hands' ? 'both hands' : `the ${st.die} die`}. Highest total wins; a tie goes to you.`));
  const layer = h('div', { class: `t3 st-${trial.stat}`, role: 'dialog', 'aria-label': `${st.word}: ${title}` }, head, foePlate, score, myPlate, h('footer', { class: 't3-foot' }, verdict, go));
  document.body.append(layer); document.body.classList.add('t3-on'); sfx.uiOpen?.();

  // ---------------------------------------------------------------------------------------------- frame the table under the header
  const v3 = new THREE.Vector3();
  const pt = (x, y, z) => { v3.set(x, y, z).project(cam); return [(v3.x * 0.5 + 0.5) * stage.width, (-v3.y * 0.5 + 0.5) * stage.height]; };
  function fit() {
    const W = stage.width; const H = stage.height; const top = head.getBoundingClientRect().bottom; const foot = layer.querySelector('.t3-foot').getBoundingClientRect().top;
    const x0 = Math.max(10, W / 2 - 300); const x1 = Math.min(W - 10, W / 2 + 300); const y0 = top + 56; const y1 = foot - 54;
    const PITCH = (64 * Math.PI) / 180; const LOOK = new THREE.Vector3(0, 0, -1.2);
    cam.fov = 34; cam.aspect = W / H; cam.clearViewOffset();
    const place = (d) => { cam.position.set(LOOK.x, LOOK.y + d * Math.sin(PITCH), LOOK.z + d * Math.cos(PITCH)); cam.lookAt(LOOK); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
    const corners = []; for (const x of [-2.4, 2.4]) for (const z of [MAT_Z - MAT_D / 2 - 0.05, 2.45]) for (const y of [0, 0.35]) corners.push([x, y, z]);
    const box = () => { const ps = corners.map((c) => pt(...c)); const xs = ps.map((a) => a[0]); const ys = ps.map((a) => a[1]); return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }; };
    let lo = 4; let hi = 90; let d = 20;
    for (let i = 0; i < 40; i++) { d = (lo + hi) / 2; place(d); const b = box(); if (b.r - b.l > x1 - x0 || b.b - b.t > y1 - y0) lo = d; else hi = d; }
    place(d); const b = box();
    cam.setViewOffset(W, H, (b.l + b.r) / 2 - (x0 + x1) / 2, (b.t + b.b) / 2 - (y0 + y1) / 2, W, H); cam.updateMatrixWorld();
    const lineY = Math.round(top + 6); // the table fills everything under the header (the other side's dice fly in from up there)
    stage.post.trayPass.band = { y: lineY, h: H - lineY };
    layer.style.setProperty('--line', `${lineY}px`); document.body.style.setProperty('--t3-line', `${lineY}px`);
    // the labels follow the table (the other side's plate sits above the tops of their dice)
    const fp = pt(0, 0.8, MAT_Z - MAT_D / 2 - 0.1); foePlate.style.left = `${fp[0]}px`; foePlate.style.top = `${fp[1]}px`;
    const sp = pt(0, 0, GAP_Z); score.style.left = `${sp[0]}px`; score.style.top = `${sp[1]}px`;
    const mp = pt(0, 0, 2.5); myPlate.style.left = `${mp[0]}px`; myPlate.style.top = `${mp[1]}px`;
    foe.forEach((f, i) => { if (!f.anim) placeFoe(f, i); });
  }
  fit(); stage.step?.(0);
  const onResize = () => requestAnimationFrame(fit); window.addEventListener('resize', onResize);
  slots.forEach((sl) => tray.pulse(sl, 'gold'));

  // ---------------------------------------------------------------------------------------------- the throw
  const count = (el, to) => { el.textContent = String(to); el.parentElement.classList.remove('pop'); void el.offsetWidth; el.parentElement.classList.add('pop'); };
  return new Promise((resolve) => {
    let state = 0;
    const close = () => {
      window.removeEventListener('resize', onResize);
      layer.classList.add('out'); document.body.classList.remove('t3-on');
      world.clear(); world.mode = null;
      setTimeout(() => { layer.remove(); resolve(); }, 200);
    };
    go.onclick = async () => {
      if (state === 2) { close(); return; }
      if (state) return; state = 1; go.disabled = true; sfx.click?.();
      const fast = reduced();
      slots.forEach((sl, i) => { board[sl].v = trial.heroDice[i]; });
      sfx.diceRoll?.(Math.min(9, 3 + (slots.length + n) * 2));
      const mineP = fast ? (tray.show(board), Promise.resolve()) : tray.roll(board, { slots, seed: (trial.heroTotal * 7919 + trial.attempt * 31 + 17) >>> 0, mode: 'throw' });
      mineP.then(() => { count(mine, trial.heroTotal); slots.forEach((sl) => tray.pulse(sl, 'gold')); });
      // the other side answers a moment later
      if (!fast) await stage.wait(0.45);
      const a = awayLocal();
      foe.forEach((f, i) => { f.value = trial.oppDice[i]; });
      if (fast) foe.forEach((f, i) => placeFoe(f, i));
      else {
        const items = foe.map((f, i) => ({ slot: `F${i}`, die: f.die, start: { pos: f.pos.clone(), quat: f.quat.clone() }, sock: f.sock, label: f.value, away: a, box: [f.sock.x - 0.42, f.sock.x + 0.42, -0.4, 0.4] }));
        const plans = planRoll(items, [], { seed: (trial.oppTotal * 104729 + trial.attempt * 13 + 5) >>> 0, mode: 'throw' });
        foe.forEach((f, i) => { f.anim = { plan: plans[`F${i}`], t: 0, ev: 0 }; });
      }
      const theirP = fast ? Promise.resolve() : new Promise((r) => { foeDone = r; });
      theirP.then(() => count(theirs, trial.oppTotal));
      await Promise.all([mineP, theirP]);
      if (!fast) await stage.wait(0.35);
      layer.classList.add(trial.win ? 'won' : 'lost');
      verdict.replaceChildren(h('b', {}, trial.win ? 'You win!' : 'Not this time'), h('span', {}, trial.win ? (trial.heroTotal === trial.oppTotal ? `${trial.heroTotal} ties ${trial.oppTotal}, and a tie goes to you` : `${trial.heroTotal} beats ${trial.oppTotal}`) : `${trial.oppTotal} beats ${trial.heroTotal}`));
      if (trial.win) { sfx.level?.(); slots.forEach((sl) => tray.pulse(sl, 'heal')); } else sfx.error?.();
      go.textContent = 'Continue'; go.disabled = false; state = 2; go.focus?.();
    };
  });
}
