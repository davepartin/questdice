// T22: one versioned weapon dataset, generated from the engine (released rules). Cards, the camp grid and the comparison tables read this, so a number is typed in one place.
//   node tools/t22-dataset.mjs [--write]      (no flag: prints whether the committed file still matches the engine)
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); await import('./sim.mjs');
export const FILE = new URL('../docs/team/tasks/T22-weapons-dataset.json', import.meta.url);
const ids = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'];
const face = (f) => ({ v: f.v, c: f.c, ...(f.plus ? { plus: f.plus } : {}), ...(f.fx && Object.keys(f.fx).length ? { fx: f.fx } : {}), ...(f.arrow ? { arrow: f.arrow } : {}) });
export function build() {
  const out = { version: 1, rules: 'released (js/release.js applyRelease)', status: 'PROPOSED: a snapshot of what the engine plays today, for review; not a ruling', metals: D.RARITY.slice(0, 3), sizes: [4, 6, 8, 10], ammo: Object.keys(D.WEAPONS2.ammo), weapons: {} };
  for (const id of ids) { const def = D.WEAPONS[id]; const w = { name: def.name, role: def.lean === 'def' ? 'defence' : 'offence', temper: def.temper, hands: def.hands, price: def.price, faces: {} };
    const variants = id === 'quiver' ? out.ammo : [null];
    for (const am of variants) for (const [mi, m] of out.metals.entries()) for (const s of out.sizes) { const inst = E.makeWeapon(id, mi, () => 0.5, s); if (am) inst.ammo = am; const key = `${am ? `${am}:` : ''}${m}:${s}`; w.faces[key] = E.weaponFaces(inst).map(face); }
    out.weapons[id] = w; }
  return out;
}
const json = JSON.stringify(build(), null, 1);
if (import.meta.url === `file://${process.argv[1]}`) { if (process.argv.includes('--write')) { fs.writeFileSync(FILE, json); console.log('written', json.length); } else console.log(fs.existsSync(FILE) && fs.readFileSync(FILE, 'utf8') === json ? 'dataset matches the engine' : 'DATASET DIFFERS from the engine'); }
export { json };
