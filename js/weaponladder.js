// T17 candidate (PROPOSED, OFF in the release): one cumulative face ladder for every weapon, built from a small role profile.
// Rules that make it cumulative and readable (Dave and Astra, 24 to 26 Oct 2026, docs/team/tasks/T17.md):
//   - base numbers run in order: d4 has 1 to 4, d6 adds 5 and 6, d8 adds 7 and 8, d10 adds 9 and 10 (so every die takes part in straights);
//   - a face is fixed by its NUMBER: its colour, its effect kinds and their amounts depend only on the number, the metal and the weapon,
//     never on the die's size, so a bigger die keeps every earlier face exactly and adds two;
//   - every weapon has red and blue faces (Dave: each weapon balances attack and block); the weapon's role is how much of each, where its
//     effects sit and how big they are;
//   - metal adds effects, never numbers: Bronze none, Silver about half an icon a roll, Gold about one, placed by the weapon's role.
// A face is { v, c: 'r' | 'b', fx?: { pierce | heal | magic: n }, arrow?: 'pierce' | 'fire' | 'frost' } like the faces in js/engine.js.
export const SIZES = [4, 6, 8, 10];
export const METALS = ['Bronze', 'Silver', 'Gold'];
// colours by number 1..10 (R red = attack, B blue = block), what a red / blue face pays, and for Silver and Gold the number -> icons map
// (a face with no entry carries none). Where the effects sit is the role: spread thin and small on the even mixers, only on the big numbers
// and big on the brutes. Budgets stay close to today's: Silver about half an icon a roll, Gold about one.
const ALL = (n10 = 1) => ({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: n10 });
export const ROLES = {
  dagger: { name: 'Dagger', role: 'Quick: an even mix of strike and guard, a small effect on every other face: pierce when it strikes, a heal when it guards.', colors: 'RBRBRBRBRB', kinds: { r: 'pierce', b: 'heal' },
    silver: { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1 }, gold: ALL(2) },
  sword: { name: 'Sword', role: 'Reliable: leans to attack, guards almost as often; magic when it strikes, a heal when it guards.', colors: 'RRBRBRRBRB', kinds: { r: 'magic', b: 'heal' },
    silver: { 2: 1, 4: 1, 6: 1, 7: 1, 9: 1 }, gold: ALL(2) },
  axe: { name: 'Axe', role: 'Brute: every big number attacks and only the big numbers carry effects, big ones; the two smallest guard.', colors: 'BBRRRRRRRR', kinds: { r: 'pierce' },
    silver: { 4: 1, 6: 1, 8: 2, 10: 2 }, gold: { 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3 } },
  spear: { name: 'Spear', role: 'Armour breaker: a steady single pierce on strike and guard faces alike, never a big one.', colors: 'RRBRRBRRBR', kinds: { r: 'pierce', b: 'pierce' },
    silver: { 2: 1, 3: 1, 5: 1, 8: 1, 9: 1 }, gold: ALL(1) },
  shield: { name: 'Round Shield', role: 'Steady guard: leans to block, and only its guards carry effects: a heal on the guard, nothing on the few strikes.', colors: 'BBRBBRBBRB', kinds: { b: 'heal' },
    silver: { 2: 1, 4: 1, 5: 1, 8: 1, 10: 2 }, gold: ALL(2) },
  tower: { name: 'Tower Shield', role: 'Wall: every big number guards, only the big numbers carry effects (magic, and big); the two smallest strike.', colors: 'RRBBBBBBBB', kinds: { b: 'magic' },
    silver: { 4: 1, 6: 1, 8: 2, 10: 2 }, gold: { 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3 } },
  bow: { name: 'Bow', role: 'Even: strikes and guards in turn, leaning a little to guard; a pierce on the strikes, magic on the guards.', colors: 'RBBRBRBBRB', kinds: { r: 'pierce', b: 'magic' },
    silver: { 2: 1, 4: 1, 6: 1, 8: 1, 10: 2 }, gold: ALL(2) },
  quiver: { name: 'Arrows', role: 'All attack: a pierce on every other strike, and the ammunition marks three arrowheads.', colors: 'RRRRRRRRRR', kinds: { r: 'pierce' }, heads: [3, 5, 7],
    silver: { 2: 1, 4: 1, 6: 1, 8: 1, 10: 2 }, gold: ALL(2) },
};
export const AMMO = ['normal', 'pierce', 'fire', 'frost'];
export function face(id, metal, v, ammo) {
  const R = ROLES[id]; const c = R.colors[v - 1].toLowerCase();
  const f = { v, c };
  if (id === 'quiver' && ammo && ammo !== 'normal' && R.heads.includes(v)) f.arrow = ammo;
  const tier = METALS.indexOf(metal);
  if (tier === 0 || f.arrow) return f; // Bronze is plain; an arrowhead already carries its effect
  const n = (tier === 1 ? R.silver : R.gold)[v]; const kind = R.kinds[c];
  if (n && kind) f.fx = { [kind]: n };
  return f;
}
// the faces of a die of this size: numbers 1 to size, in order
export function facesOf(id, metal, size, ammo) { return Array.from({ length: size }, (_, i) => face(id, metal, i + 1, ammo)); }
// the whole table in the shape engine.js reads (WEAPON_SIZE.ladder[id][metal][size]); the arrows by ammunition as `quiver:<ammo>`
export function buildLadder() {
  const out = {};
  for (const id of Object.keys(ROLES)) {
    const keys = id === 'quiver' ? AMMO.map((a) => ({ key: `quiver:${a}`, ammo: a })) : [{ key: id, ammo: null }];
    for (const { key, ammo } of keys) { out[key] = {}; for (const m of METALS) { out[key][m] = {}; for (const s of SIZES) out[key][m][s] = facesOf(id, m, s, ammo); } }
  }
  return out;
}
