// Dice math for the balance doc: what a lane, a die and a whole board give on average (no rerolls), by build.
//   node tools/dicemath.mjs
import { newHero, heroPower, weaponFaces, makeWeapon, equip, maxHpOf } from '../js/engine.js';
import { WEAPONS, FACE_PAY } from '../js/data.js';

const avg = (n) => (n + 1) / 2;
console.log('Strength die (a hand) average: ' + [4, 6, 8, 10].map((n) => `d${n} ${avg(n).toFixed(1)}`).join(' · '));
console.log('\nHead/hand/feet faces pay (per face):', FACE_PAY.slice(1).map((p, i) => `${i + 1}:${Object.entries(p).map(([k, v]) => `${v}${k[0]}`).join('+')}`).join('  '));
console.log('\nWeapon die, average added to its lane by size (red = attack, blue = block):');
for (const id of ['dagger', 'sword', 'shield', 'spear', 'bow', 'longsword', 'staff']) {
  const row = [4, 6, 8, 10].map((s) => { const f = weaponFaces({ id, rarity: 0, size: s }); const r = f.filter((x) => x.c === 'r').reduce((a, x) => a + x.v, 0) / f.length; const b = f.filter((x) => x.c === 'b').reduce((a, x) => a + x.v, 0) / f.length; return `d${s} ${r.toFixed(1)}r/${b.toFixed(1)}b`; });
  console.log(`  ${WEAPONS[id].name.padEnd(11)} ${row.join('  ')}`);
}
// a lane = weapon face + hand roll, sent to attack (red) or block (blue)
console.log('\nWhole board, average throw (no rerolls, no powers):');
const show = (label, h) => { const p = heroPower(h, 600); console.log(`  ${label.padEnd(40)} attack ${p.atk.toFixed(1).padStart(5)}  pierce ${p.pierce.toFixed(1).padStart(4)}  block ${p.block.toFixed(1).padStart(5)}  heal ${p.heal.toFixed(1).padStart(4)}  magic ${p.magic.toFixed(1).padStart(4)}  gold ${p.gold.toFixed(1).padStart(4)}  hp ${maxHpOf(h)}`); };
for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) {
  const h = newHero({ name: 'M', cls, seed: 1 }); show(`${cls} L1 start`, h);
  const m = newHero({ name: 'M', cls, seed: 1, full: true }); m.level = 5; m.strength = { W: 6, E: 6 }; m.loadout.NW.size = 6; if (m.loadout.NE.id !== 'fists') m.loadout.NE.size = 6; show(`${cls} end of Act I (all dice, d6 hands+weapons)`, m);
  const e = newHero({ name: 'M', cls, seed: 1, full: true }); e.level = 10; e.strength = { W: 8, E: 8 }; e.special = { SW: 6, SE: 6 }; e.loadout.NW.size = 8; e.loadout.NW.rarity = 2; if (e.loadout.NE.id !== 'fists') { e.loadout.NE.size = 8; e.loadout.NE.rarity = 2; } show(`${cls} end of Act II (d8, gold tier)`, e);
  const f = newHero({ name: 'M', cls, seed: 1, full: true }); f.level = 15; f.strength = { W: 10, E: 10 }; f.special = { SW: 6, SE: 6 }; f.loadout.NW.size = 10; f.loadout.NW.rarity = 3; if (f.loadout.NE.id !== 'fists') { f.loadout.NE.size = 10; f.loadout.NE.rarity = 3; } show(`${cls} end of Act III (d10, diamond)`, f);
}
void makeWeapon; void equip;
