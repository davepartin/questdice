// T17: the cumulative size ladder (proposal for review; measuring only, nothing in the game uses it).
// One ladder per weapon, metal and ammunition: d4 faces fixed, d6 appends two faces, d8 appends two, d10 appends two. A face's full identity
// (colour, number, bonus plus, every effect, ammunition marking) never changes once it is on the ladder. The appended faces come from the
// engine's own released spread at that size: take today's faces for that die, remove one copy of every face already on the ladder, and append
// the two best of what is left (highest hit, then most icons); if fewer than two are left, the best of today's faces fill in.
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
applyRelease();
export const SIZES = [4, 6, 8, 10];
export const ACTIVE = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'];
export const METAL = ['Bronze', 'Silver', 'Gold'];
export const AMMO = Object.keys(D.WEAPONS2.ammo);
export const hit = (f) => f.v + (f.plus || 0);
export const icons = (f) => (f.plus ? 1 : 0) + Object.values(f.fx || {}).reduce((a, n) => a + (n | 0), 0);
// full identity of a face: everything that makes it that face
export const identity = (f) => JSON.stringify({ c: f.c, v: f.v, plus: f.plus || 0, fx: Object.fromEntries(Object.entries(f.fx || {}).sort()), arrow: f.arrow || null });
const inst = (id, r, size, ammo) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...(ammo ? { ammo } : {}) });
const today = (id, r, size, ammo) => E.weaponFaces(inst(id, r, size, ammo)).map((f) => structuredClone(f));
export function ladder(id, r, ammo) {
  const out = { 4: today(id, r, 4, ammo) };
  for (const s of SIZES.slice(1)) {
    const prev = out[SIZES[SIZES.indexOf(s) - 1]]; const spread = today(id, r, s, ammo);
    const left = [...spread];
    for (const f of prev) { const k = left.findIndex((x) => identity(x) === identity(f)); if (k >= 0) left.splice(k, 1); }
    const best = (a, b) => hit(b) - hit(a) || icons(b) - icons(a);
    const pick = [...left].sort(best).slice(0, 2);
    if (pick.length < 2) pick.push(...[...spread].sort(best).slice(0, 2 - pick.length));
    out[s] = [...prev.map((f) => structuredClone(f)), ...pick.map((f) => structuredClone(f))];
  }
  return out;
}
// the checks the Director asked for: counts equal the die size, and every earlier size is an exact prefix of the next
export function check(l) {
  const problems = [];
  SIZES.forEach((s, i) => {
    if (l[s].length !== s) problems.push(`d${s} has ${l[s].length} faces`);
    if (i) { const p = l[SIZES[i - 1]]; p.forEach((f, k) => { if (identity(f) !== identity(l[s][k])) problems.push(`d${s} face ${k + 1} differs from d${SIZES[i - 1]}`); }); }
  });
  return problems;
}
export const variants = () => ACTIVE.flatMap((id) => (id === 'quiver' ? AMMO.map((a) => ({ id, ammo: a })) : [{ id, ammo: undefined }]));
// what a size gives per roll (each face is equally likely): expected attack and block, and how often each effect is on the die
export function stats(faces) {
  const n = faces.length; const atk = faces.filter((f) => f.c === 'r'); const blk = faces.filter((f) => f.c === 'b');
  const fx = {}; for (const f of faces) for (const [k, v] of Object.entries(f.fx || {})) { fx[k] = fx[k] || { faces: 0, icons: 0 }; fx[k].faces++; fx[k].icons += v | 0; }
  for (const f of faces) if (f.plus) { const k = f.c === 'b' ? 'block+' : 'attack+'; fx[k] = fx[k] || { faces: 0, icons: 0 }; fx[k].faces++; fx[k].icons += f.plus; }
  for (const f of faces) if (f.arrow) { const k = `arrow:${f.arrow}`; fx[k] = fx[k] || { faces: 0, icons: 0 }; fx[k].faces++; fx[k].icons++; }
  return { n, attackFaces: atk.length, blockFaces: blk.length, eAttack: atk.reduce((a, f) => a + hit(f), 0) / n, eBlock: blk.reduce((a, f) => a + hit(f), 0) / n, fx };
}
// Diamond (PROPOSAL for review): the weapon's Gold ladder (same colours, numbers and identity, so shields stay block weapons and the quiver keeps
// its ammunition faces) plus a "crit step": the best face of the d4 set and the best face appended at each size carries one more of its icon
// (or gets one icon if it had none). The extra icons are fixed once added, so the ladder stays cumulative. A permanent tier, not a one-fight one.
export function diamondLadder(id, ammo) {
  const g = ladder(id, 2, ammo); const out = {}; const kindOf = (f) => Object.keys(f.fx || {})[0] || (f.c === 'b' ? 'heal' : 'pierce');
  const bump = (f) => { const k = kindOf(f); f.fx = { ...(f.fx || {}), [k]: ((f.fx || {})[k] | 0) + 1 }; };
  const bestIn = (faces, from, to) => { let b = from; for (let k = from; k < to; k++) if (hit(faces[k]) > hit(faces[b]) || (hit(faces[k]) === hit(faces[b]) && icons(faces[k]) > icons(faces[b]))) b = k; return b; };
  let prev = [];
  for (const s of SIZES) {
    const faces = [...prev.map((f) => structuredClone(f)), ...g[s].slice(prev.length).map((f) => structuredClone(f))];
    const from = prev.length; const to = faces.length; bump(faces[bestIn(faces, from, to)]);
    out[s] = faces; prev = faces;
  }
  return out;
}
