// CONCEPT (T16, docs only). Weapon faces drawn by the GAME's own die-face renderer: js/gfx/dice/dice.js faceImage() cuts each face from
// the same painted atlas the 3D die wears, in the die's real shape (d4 triangle, d6 square, d8 triangle, d10 kite; js/gfx/dice/poly.js).
// The labels come from the game's dieSpecs() (dice.js:26-40), which reads weaponFaces() after applyRelease(). Nothing is re-drawn here.
import './roster.js';
import { newHero } from '../../../../js/engine.js';
import { dieSpecs, faceImage } from '../../../../js/gfx/dice/dice.js';
import { makeWeapon } from '../../../../js/engine.js';
const H = newHero({ name: 'Preview', cls: 'knight', seed: 1 });
// the spec the game would build for a weapon in the left hand at this size
export function weaponSpec(id, rarity, size, ammo) {
  const w = makeWeapon(id, rarity, () => 0.5, size); if (ammo) w.ammo = ammo;
  H.loadout.NW = w; return dieSpecs(H, { NW: size }).NW;
}
export const faceSrc = (spec, label, px = 160) => faceImage(spec, label, px);

// faceImage() returns a square cut around the face; key out the dark backdrop and trim, so only the face's own shape remains.
const cut = new Map();
export function shaped(url, pad = 0) {
  const ck = url + '|' + pad; if (cut.has(ck)) return cut.get(ck);
  const p = new Promise((res) => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const D = x.getImageData(0, 0, c.width, c.height); const a = D.data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let i = 0; i < a.length; i += 4) { const m = Math.max(a[i], a[i + 1], a[i + 2]); const k = Math.min(1, Math.max(0, (m - 34) / 26)); a[i + 3] = Math.round(a[i + 3] * k);
      if (k > 0.5) { const p = i / 4, px = p % c.width, py = (p / c.width) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } }
    x.putImageData(D, 0, 0); const o = document.createElement('canvas'); const w = x1 - x0 + 1, h = y1 - y0 + 1; const s = Math.round(Math.max(w, h) * (1 + 2 * pad)); o.width = s; o.height = s;
    o.getContext('2d').drawImage(c, x0, y0, w, h, (s - w) / 2, (s - h) / 2, w, h); res(o.toDataURL('image/png')); }; im.src = url; });
  cut.set(ck, p); return p;
}
// Dave's variant: each face keeps the shape of the smallest die that has it (1-4 triangle, 5-6 square, 7-8 d8 triangle, 9-10 kite),
// still showing what THIS die rolls on that face. The game's renderer draws it: the face's own label on a smaller die's polygon.
export const ladderSides = (i) => (i <= 4 ? 4 : i <= 6 ? 6 : i <= 8 ? 8 : 10);
export function faceUrl(spec, label, mode = 'die', px = 160) {
  if (mode !== 'ladder' || ladderSides(label) === spec.sides) return faceImage(spec, label, px);
  const sides = ladderSides(label); const labels = Array.from({ length: sides }, (_, i) => spec.labels[i === 0 ? label - 1 : i % spec.labels.length]);
  return faceImage({ ...spec, sides, labels, key: `${spec.key}|ladder${label}` }, 1, px);
}

// one face, die-shaped and trimmed; a d6 face is cut from inside its square, so it gets a margin to sit level with the others
export const faceOf = (spec, label, mode = 'die') => shaped(faceUrl(spec, label, mode), (mode === 'ladder' ? ladderSides(label) : spec.sides) === 6 ? 0.13 : 0);
