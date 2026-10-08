// Hero animation: a tiny keyframe/pose engine and the clip tables per weapon family.
// Poses are authored in degrees for an attack hand on the hero's LEFT (+X); they are mirrored automatically when the
// attack hand is the right one. Joint keys: hips spine chest neck head, A*/O* = attack / other side (arm fore hand thigh shin foot),
// hipsP = [x,y,z] metres.
import { D } from './herokit.js';

const sm = (x) => x * x * (3 - 2 * x);
const eo = (x) => 1 - (1 - x) ** 3;
const ei = (x) => x * x * x;
const EASE = { s: sm, o: eo, i: ei, l: (x) => x };

export function makeSampler(keys) {
  const ks = keys.map(([t, p, e]) => ({ t, p, e: e || 's' }));
  return (t) => {
    if (t <= ks[0].t) return ks[0].p;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const a = ks[i - 1]; const b = ks[i]; const k = EASE[b.e]((t - a.t) / (b.t - a.t || 1));
        const out = {}; const names = new Set([...Object.keys(a.p), ...Object.keys(b.p)]);
        for (const n of names) {
          const x = a.p[n] || ZERO3; const y = b.p[n] || ZERO3;
          out[n] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k];
        }
        return out;
      }
    }
    return ks[ks.length - 1].p;
  };
}
const ZERO3 = [0, 0, 0];

// resolve authored names -> joint names + mirror
export function applyPose(P, pose, info) {
  const { A, O } = info; const mm = A === 'L' ? 1 : -1;
  for (const [n, v] of Object.entries(pose)) {
    if (n === 'hipsP') { P.pos('hips', v[0] * mm, v[1], v[2]); continue; }
    if (/^[AO]/.test(n) && n.length > 1 && n !== 'O') {
      const who = n[0]; const part = n.slice(1);
      const side = who === 'A' ? A : O;
      const j = `${part}${part === 'arm' || part === 'fore' || part === 'hand' || part === 'thigh' || part === 'shin' || part === 'foot' ? side : ''}`;
      const flip = A === 'L' ? 1 : -1; // authored for A=L
      P.rot(j, v[0] * D, v[1] * D * flip, v[2] * D * flip);
    } else P.rot(n, v[0] * D, v[1] * D * mm, v[2] * D * mm);
  }
}

// family pose tables ---------------------------------------------------------------------------------------------
const sp = (rx = 0, ry = 0, rz = 0) => [rx, ry, rz];

function carry(fam, shield) {
  const o = shield ? { Oarm: sp(-6, 0, -16), Ofore: sp(-48) } : { Oarm: sp(-6, 0, -6), Ofore: sp(-30) };
  switch (fam) {
    case 'spear': return { Aarm: sp(-12, 0, 6), Afore: sp(-45), Ahand: sp(25), ...o, thighA: sp(-3), thighO: sp(3) };
    case 'bow': return { Aarm: sp(-18, 0, 8), Afore: sp(-30), Ahand: sp(0), Oarm: sp(-8, 0, -6), Ofore: sp(-30) };
    case 'staff': return { Aarm: sp(-18, 0, -6), Afore: sp(-55), Ahand: sp(10), Oarm: sp(-30, 0, 8), Ofore: sp(-70) };
    case 'longsword': return { Aarm: sp(-30, 0, -4), Afore: sp(-70), Ahand: sp(10), Oarm: sp(-35, 0, 8), Ofore: sp(-75) };
    default: return { Aarm: sp(-16, 0, 8), Afore: sp(-50), Ahand: sp(0), ...o };
  }
}
function ready(fam, shield) {
  const base = carry(fam, shield);
  const r = { spine: sp(6, -22, 0), chest: sp(2, -8), head: sp(-3, 20), hipsP: [0, -0.09, 0], thighA: sp(-26, 0, 0), shinA: sp(34), thighO: sp(14, 0, 0), shinO: sp(18) };
  switch (fam) {
    case 'spear': return { ...r, Aarm: sp(-35, 0, 12), Afore: sp(-70), Ahand: sp(55), Oarm: sp(-48, 0, -4), Ofore: sp(-95) };
    case 'bow': return { ...r, spine: sp(2, -30, 0), chest: sp(0, -10), head: sp(-2, 30), Aarm: sp(-70, 0, 6), Afore: sp(-12), Oarm: sp(-30, 0, -20), Ofore: sp(-110) };
    case 'staff': return { ...r, Aarm: sp(-40, 0, -8), Afore: sp(-70), Ahand: sp(25), Oarm: sp(-55, 0, 6), Ofore: sp(-85) };
    case 'longsword': return { ...r, Aarm: sp(-50, 0, -4), Afore: sp(-85), Ahand: sp(10), Oarm: sp(-55, 0, 6), Ofore: sp(-85) };
    default: return { ...r, Aarm: sp(-74, 0, 12), Afore: sp(-56), Ahand: sp(-22), Oarm: shield ? sp(-40, 0, -8) : sp(-40, 0, -14), Ofore: shield ? sp(-90) : sp(-75) };
  }
  void base;
}

export function buildClips(a, info) {
  const { shield } = info;
  const fam = { mace: 'sword', warhammer: 'longsword' }[info.fam] || info.fam; // new weapons borrow a family's poses
  const rd = ready(fam, shield); const cy = carry(fam, shield);
  const run = (keys) => makeSampler(keys);
  const apply = (P, pose) => applyPose(P, pose, info);
  const clips = {};
  const IK = (side, w) => { a.userData.ikT[side] = Math.max(a.userData.ikT[side], w); };
  const twoHandIK = () => { if (info.twoHand && info.offIK) IK(info.O, 1); };
  const mix = (p, q, k) => { const o = {}; for (const n of new Set([...Object.keys(p), ...Object.keys(q)])) { const x = p[n] || ZERO3; const y = q[n] || ZERO3; o[n] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; } return o; };
  const bowDraw = (k) => { const b = a.userData.bow; if (b) { b.userData.setDraw(k); } const ar = a.userData.arrow; if (ar) ar.visible = k > 0.02 && !a.userData.released; };

  // ---- idle / ready loops
  clips.idle = {
    loop: true, dur: 3.2, fn: (t, P) => {
      const s = Math.sin(t / 3.2 * Math.PI * 2); const s2 = Math.sin(t / 3.2 * Math.PI * 4 + 0.6); const wsh = Math.sin(t / 3.2 * Math.PI * 2 - 0.9);
      apply(P, mix(rd, cy, 0.3));
      P.rot('chest', s * 0.04, 0, 0); P.rot('spine', s * 0.02, 0, wsh * 0.014); P.rot('armL', s * 0.03, 0, 0); P.rot('armR', s * 0.03, 0, 0); P.rot('foreA'.replace('A', info.A), s2 * 0.03, 0, 0); P.pos('hips', wsh * 0.007, s2 * 0.003 - 0.002, 0);
      P.rot('head', -s * 0.018 + 0.02, Math.sin(t / 3.2 * Math.PI * 2 * 0.5) * 0.06, 0); P.rot('neck', -s * 0.01, 0, 0);
      P.rot('armL', 0, 0, s * 0.012); P.rot('armR', 0, 0, -s * 0.012); P.rot('thighL', 0, 0, wsh * 0.01); P.rot('thighR', 0, 0, wsh * 0.01);
      if (fam === 'bow') bowDraw(0);
      twoHandIK();
    },
  };
  clips.ready = {
    loop: true, dur: 2.4, fn: (t, P) => {
      const s = Math.sin(t / 2.4 * Math.PI * 2); const s2 = Math.sin(t / 2.4 * Math.PI * 4);
      apply(P, rd);
      P.rot('chest', s * 0.02, 0, 0); P.pos('hips', 0, s2 * 0.004, 0); P.rot('head', -s * 0.012, 0, 0);
      P.rot('armA'.replace('A', info.A), s * 0.01, 0, 0);
      if (fam === 'bow') bowDraw(0.12 + 0.02 * s);
      twoHandIK();
    },
  };

  // ---- attacks per family
  const strikeKeys = {
    sword: () => ([
      [0, rd], [0.2, { ...rd, spine: sp(6, 34, 0), chest: sp(0, 18), Aarm: sp(-128, 0, 42), Afore: sp(-60), Ahand: sp(-20), hipsP: [0, -0.06, -0.06], thighA: sp(10), shinA: sp(12), head: sp(-6, -20) }, 's'],
      [0.31, { ...rd, spine: sp(16, -34, 0), chest: sp(2, -18), Aarm: sp(-64, 0, -24), Afore: sp(-14), Ahand: sp(12), hipsP: [0, -0.11, 0.16], thighA: sp(-42), shinA: sp(40), thighO: sp(22), shinO: sp(10), head: sp(2, 22) }, 'i'],
      [0.46, { ...rd, spine: sp(14, -38, 0), chest: sp(2, -22), Aarm: sp(-40, 0, -52), Afore: sp(-22), Ahand: sp(18), hipsP: [0, -0.1, 0.17], thighA: sp(-42), shinA: sp(40), thighO: sp(22), head: sp(2, 24) }, 'o'],
      [0.9, rd, 's']]),
    sword2: () => ([
      [0, rd], [0.2, { ...rd, spine: sp(4, -30, 0), chest: sp(0, -14), Aarm: sp(-50, 0, -60), Afore: sp(-40), Ahand: sp(-10), hipsP: [0, -0.07, -0.04], head: sp(0, 18) }, 's'],
      [0.31, { ...rd, spine: sp(10, 30, 0), chest: sp(0, 16), Aarm: sp(-85, 0, 30), Afore: sp(-12), Ahand: sp(8), hipsP: [0, -0.1, 0.14], thighA: sp(-38), shinA: sp(36), thighO: sp(20), head: sp(0, -18) }, 'i'],
      [0.5, { ...rd, spine: sp(10, 34, 0), Aarm: sp(-88, 0, 44), Afore: sp(-14), hipsP: [0, -0.1, 0.15], thighA: sp(-38), shinA: sp(36) }, 'o'],
      [0.95, rd, 's']]),
    spear: () => ([
      [0, rd], [0.22, { ...rd, spine: sp(2, 28, 0), chest: sp(0, 12), Aarm: sp(-18, 0, 22), Afore: sp(-100), Ahand: sp(78), hipsP: [0, -0.07, -0.09], thighA: sp(12), shinA: sp(20), head: sp(0, -18) }, 's'],
      [0.32, { ...rd, spine: sp(14, -24, 0), chest: sp(0, -12), Aarm: sp(-86, 0, 4), Afore: sp(-6), Ahand: sp(88), hipsP: [0, -0.1, 0.22], thighA: sp(-48), shinA: sp(48), thighO: sp(26), shinO: sp(8), head: sp(0, 20) }, 'i'],
      [0.5, { ...rd, spine: sp(14, -24, 0), Aarm: sp(-84, 0, 4), Afore: sp(-8), Ahand: sp(88), hipsP: [0, -0.1, 0.23], thighA: sp(-48), shinA: sp(48), thighO: sp(26) }, 'l'],
      [0.95, rd, 's']]),
    bow: () => ([
      [0, rd], [0.12, { ...rd, Aarm: sp(-92, 0, 6), Afore: sp(-6), Oarm: sp(-70, 0, -50), Ofore: sp(-95) }, 's'],
      [0.52, { ...rd, spine: sp(2, -38, 0), head: sp(-2, 36), Aarm: sp(-94, 0, 6), Afore: sp(-4), Oarm: sp(-70, 0, -50), Ofore: sp(-95) }, 's'],
      [0.6, { ...rd, spine: sp(2, -38, 0), head: sp(-2, 36), Aarm: sp(-92, 0, 4), Afore: sp(-4), Oarm: sp(-75, 0, -50), Ofore: sp(-80) }, 'o'],
      [1.05, rd, 's']]),
    staff: () => ([
      [0, rd], [0.26, { ...rd, spine: sp(-6, 10, 0), Aarm: sp(-100, 0, -16), Afore: sp(-84), Ahand: sp(-10), hipsP: [0, -0.02, -0.05], head: sp(-8, 0) }, 's'],
      [0.38, { ...rd, spine: sp(14, -16, 0), Aarm: sp(-96, 0, -8), Afore: sp(-18), Ahand: sp(52), hipsP: [0, -0.08, 0.16], thighA: sp(-34), shinA: sp(34), thighO: sp(18), head: sp(4, 10) }, 'i'],
      [0.6, { ...rd, spine: sp(12, -16, 0), Aarm: sp(-94, 0, -8), Afore: sp(-22), Ahand: sp(50), hipsP: [0, -0.08, 0.16], thighA: sp(-34), shinA: sp(34) }, 'o'],
      [1.05, rd, 's']]),
    longsword: () => ([
      [0, rd], [0.3, { ...rd, spine: sp(-4, 30, 0), chest: sp(0, 14), Aarm: sp(-150, 0, 22), Afore: sp(-70), Ahand: sp(-10), hipsP: [0, -0.05, -0.08], thighA: sp(12), shinA: sp(16), head: sp(-8, -16) }, 's'],
      [0.43, { ...rd, spine: sp(24, -30, 0), chest: sp(4, -14), Aarm: sp(-70, 0, -10), Afore: sp(-24), Ahand: sp(20), hipsP: [0, -0.14, 0.2], thighA: sp(-46), shinA: sp(46), thighO: sp(26), head: sp(6, 18) }, 'i'],
      [0.62, { ...rd, spine: sp(22, -34, 0), Aarm: sp(-50, 0, -22), Afore: sp(-26), hipsP: [0, -0.14, 0.2], thighA: sp(-46), shinA: sp(46), thighO: sp(26) }, 'o'],
      [1.15, rd, 's']]),
  };
  const family = { sword: 'sword', dagger: 'sword', fists: 'sword', mace: 'sword', spear: 'spear', bow: 'bow', staff: 'staff', longsword: 'longsword', warhammer: 'longsword' }[fam] || 'sword';
  const k1 = strikeKeys[family]; const k2 = strikeKeys[family === 'sword' ? 'sword2' : family];
  const hitT = { sword: 0.31, spear: 0.32, bow: 0.58, staff: 0.38, longsword: 0.43 }[family];
  const mkAttack = (keys, dur, hit, extra) => {
    const S = makeSampler(keys());
    return { dur, events: family === 'bow' ? { release: hit, hit: hit + 0.02 } : { hit }, fn: (t, P) => { apply(P, S(t)); extra?.(t, P); twoHandIK(); } };
  };
  if (family === 'bow') {
    clips.attack = mkAttack(k1, 1.05, 0.58, (t) => {
      const k = t < 0.12 ? 0 : t < 0.52 ? sm((t - 0.12) / 0.4) : t < 0.6 ? 1 - (t - 0.52) / 0.08 : 0;
      a.userData.released = t >= 0.58; bowDraw(k); IK(info.O, t > 0.06 && t < 0.98 ? 1 : 0.0);
    });
    clips.attack2 = clips.attack;
  } else {
    const chargeF = (t, hit) => { const b = a.userData.staff; if (b) b.userData.charge = family === 'staff' ? Math.max(0, Math.min(1, t / hit)) * (t < hit + 0.25 ? 1 : 0.2) : 0; };
    clips.attack = mkAttack(k1, family === 'longsword' ? 1.15 : 0.9, hitT, family === 'staff' ? (t, P) => chargeF(t, hitT) : undefined);
    clips.attack2 = mkAttack(k2, family === 'longsword' ? 1.15 : 0.95, hitT);
  }
  // ---- block
  const blockPose = shield
    ? { ...rd, Oarm: sp(-62, 0, -4), Ofore: sp(-112), Aarm: sp(-40, 0, 18), Afore: sp(-80), spine: sp(8, -8, 0), hipsP: [0, -0.09, 0.0], thighA: sp(-18), shinA: sp(26), thighO: sp(14), shinO: sp(14), head: sp(6, 6) }
    : fam === 'staff' || fam === 'longsword' ? { ...rd, Aarm: sp(-72, 0, -10), Afore: sp(-60), Ahand: sp(70), Oarm: sp(-70, 0, 14), Ofore: sp(-80), hipsP: [0, -0.08, 0], head: sp(6, 0) }
      : { ...rd, Aarm: sp(-85, 0, -20), Afore: sp(-120), Ahand: sp(0), Oarm: sp(-85, 0, 20), Ofore: sp(-120), spine: sp(10, 0, 0), hipsP: [0, -0.08, 0], thighA: sp(-12), shinA: sp(20), head: sp(8, 0) };
  const bS = makeSampler([[0, rd], [0.14, blockPose, 'o'], [0.6, blockPose, 'l'], [0.9, rd, 's']]);
  clips.block = { dur: 0.9, fn: (t, P) => { apply(P, bS(t)); twoHandIK(); if (fam === 'bow') bowDraw(0); } };
  // ---- cast (cards, heals)
  const castUp = { ...rd, Aarm: sp(-150, 0, 22), Afore: sp(-30), Oarm: sp(-140, 0, -22), Ofore: sp(-30), spine: sp(-10, 0, 0), chest: sp(-8), head: sp(-18, 0), hipsP: [0, 0.02, 0] };
  const cS = makeSampler([[0, rd], [0.35, { ...rd, Aarm: sp(-70, 0, 30), Afore: sp(-110), Oarm: sp(-70, 0, -30), Ofore: sp(-110), spine: sp(10, 0, 0), head: sp(8, 0), hipsP: [0, -0.07, 0] }, 's'], [0.65, castUp, 'o'], [1.15, castUp, 'l'], [1.5, rd, 's']]);
  clips.cast = { dur: 1.5, events: { hit: 0.65 }, fn: (t, P) => { apply(P, cS(t)); const b = a.userData.staff; if (b) b.userData.charge = Math.min(1, t / 0.65) * (t < 1.3 ? 1 : 0.2); if (fam === 'bow') bowDraw(0); twoHandIK(); } };
  // ---- hurt (additive)
  clips.hurt = { dur: 0.42, fn: (t, P) => { const k = Math.sin(Math.min(1, t / 0.42) * Math.PI) * (1 - t / 0.42 * 0.3); P.rot('spine', -0.22 * k, 0.1 * k, 0); P.rot('chest', -0.12 * k, 0, 0.06 * k); P.rot('head', -0.3 * k, 0.15 * k, 0); P.pos('hips', 0, -0.03 * k, -0.1 * k); P.rot(`arm${info.A}`, 0.25 * k, 0, 0.1 * k); P.rot(`arm${info.O}`, 0.25 * k, 0, -0.1 * k); } };
  // ---- die
  const dS = makeSampler([[0, rd], [0.25, { ...rd, hipsP: [0, -0.2, -0.05], thighA: sp(-50), shinA: sp(90), thighO: sp(-40), shinO: sp(80), spine: sp(-12), head: sp(-25), Aarm: sp(10, 0, 40), Afore: sp(-20), Oarm: sp(10, 0, -40), Ofore: sp(-20) }, 'o'],
    [0.7, { hipsP: [0, -0.62, -0.3], hips: sp(-70), thighA: sp(-30, 0, 10), shinA: sp(60), thighO: sp(-20, 0, -10), shinO: sp(50), spine: sp(-12), head: sp(-20), Aarm: sp(20, 0, 60), Afore: sp(-10), Oarm: sp(20, 0, -60), Ofore: sp(-10) }, 'i'],
    [1.1, { hipsP: [0, -0.83, -0.55], hips: sp(-88), thighA: sp(-10, 0, 14), shinA: sp(20), thighO: sp(-6, 0, -14), shinO: sp(16), head: sp(-10, 20), Aarm: sp(25, 0, 70), Oarm: sp(25, 0, -70) }, 'o']]);
  clips.die = { dur: 1.1, fn: (t, P) => { apply(P, dS(t)); if (fam === 'bow') bowDraw(0); } };
  // ---- victory
  const vTop = { ...rd, Aarm: sp(-165, 0, 18), Afore: sp(-20), Oarm: sp(-30, 0, -30), Ofore: sp(-60), spine: sp(-6, 0, 0), head: sp(-14, 0), chest: sp(-10), hipsP: [0, 0, 0], thighA: sp(-4), shinA: sp(4), thighO: sp(4), shinO: sp(4) };
  const vS = makeSampler([[0, rd], [0.3, { ...vTop, hipsP: [0, -0.1, 0], thighA: sp(-30), shinA: sp(40), thighO: sp(-30), shinO: sp(40) }, 'o'], [0.5, { ...vTop, hipsP: [0, 0.07, 0] }, 'o'], [0.8, vTop, 'o'], [2.0, vTop, 'l']]);
  clips.victory = { loop: true, dur: 2.2, fn: (t, P) => { const tt = Math.min(t, 2.0); apply(P, vS(tt)); P.rot('head', 0, Math.sin(t * 2) * 0.15, 0); P.rot('chest', Math.sin(t * 2.6) * 0.02, 0, 0); twoHandIK(); if (fam === 'bow') bowDraw(0); } };
  // ---- last stand: one knee down, head up, glowing
  const lP = { hipsP: [0, -0.4, 0.04], thighA: sp(-82, 0, 6), shinA: sp(96), footA: sp(-12), thighO: sp(14, 0, -6), shinO: sp(60), spine: sp(18), chest: sp(4), head: sp(-24), Aarm: sp(-30, 0, 30), Afore: sp(-70), Oarm: sp(-8, 0, -30), Ofore: sp(-50) };
  const lS = makeSampler([[0, rd], [0.4, { ...lP, hipsP: [0, -0.46, 0.02], head: sp(8) }, 'o'], [0.8, lP, 's']]);
  clips.lastStand = { loop: true, dur: 2.0, fn: (t, P) => { apply(P, lS(Math.min(t, 0.8))); const s = Math.sin(t / 2.0 * Math.PI * 2); P.rot('chest', 0.04 + s * 0.03, 0, 0); P.rot('head', -s * 0.03, 0, 0); P.pos('hips', 0, s * 0.006, 0); twoHandIK(); if (fam === 'bow') bowDraw(0); } };
  // ---- drink: other hand brings a flask to the mouth
  const dk = { ...cy, Oarm: sp(-95, 0, -14), Ofore: sp(-125), Ohand: sp(-30), head: sp(-14), spine: sp(4), chest: sp(-4) };
  const dkS = makeSampler([[0, cy], [0.4, dk, 'o'], [1.2, dk, 'l'], [1.6, cy, 's']]);
  clips.drink = { dur: 1.6, fn: (t, P) => { apply(P, dkS(t)); P.rot('head', -0.12 * Math.sin(Math.max(0, t - 0.5) * 4) * (t > 0.5 && t < 1.2 ? 1 : 0), 0, 0); a.userData.flask && (a.userData.flask.visible = t > 0.1 && t < 1.5); twoHandIK(); } };
  clips.spawn = { dur: 1.0, fn: (t, P) => { const k = Math.min(1, t); apply(P, mix({ ...cy, hipsP: [0, -0.1, 0], head: sp(10) }, cy, sm(k))); P.pos('hips', 0, 0, 0); twoHandIK(); } };
  clips.guard = clips.block; clips.charge = clips.ready;
  // wrap every clip so IK targets reset each frame
  for (const [n, c] of Object.entries(clips)) {
    const fn = c.fn; c.fn = (t, P, k) => { a.userData.ikT.L = 0; a.userData.ikT.R = 0; if (a.userData.flask && n !== 'drink') a.userData.flask.visible = false; fn(t, P, k); };
  }
  return clips;
}
