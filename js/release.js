import { MONSTER_D4 } from './monster-d4.js';
// What the live game plays (Dave's approvals). Base defaults in js/data.js stay unflipped so isolated unit tests and historical comparison
// tools can inspect both pre-release and released rule states in separate processes; this file turns on the live rules before the game boots.
// ?lab (js/lab.js) plays the same rules with its own saves, plus whatever is still being tried there.
//   23 Oct 2026  release 1, the teamwork pass: Heart to Heart (replaces Heartbeat), heart faces and Ready at the table, charms resting,
//                perk cards with before and after (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md)
//   23 Oct 2026  release 2 ("release everything", less monster fury): the six one-handed weapons with Bow and Arrows (Silver and Gold
//                add today's metal icons), the arrows as last measured, and the class rules (Knight Guard, Dwarf Dig In, Bard Verse for a
//                friend). Old two-handed Bows become Arrows + Bow when a save loads (save.js migrateWeapons2). Monster fury from round 4
//                stays in ?lab: with it the campaign cleared 5 of 10 times on Normal (10 of 10 without; docs/balance/curve_release*.txt).
//   25 Oct 2026  weapons never wear out (Dave): no battle counts against a weapon, nothing breaks, no "battles left" anywhere; the old rule stays behind WEAR.off
//   25 Oct 2026  T21 (Dave): every hero starts with both weapon dice live (`START_DICE` includes `'NE'`), the right one at no charge
//   26 Oct 2026  T17 weapon size purchases (`WEAPON_TRAINING.on = true`, 50/100/200 gold)
//    2 Nov 2026  T24 Monster Specials (`SPECIALS.on = true`)
//    3 Nov 2026  Camp training (`useCampTraining()` enabled at boot in js/main.js)
import { TEAMWORK, CLASS2, WEAPONS2, PRESSURE, CLASSES, START_DICE, WEAR, WEAPON_TRAINING, SPECIALS } from './data.js';
import { useWeapons2, useWeapons3 } from './engine.js';

export function applyRelease() {
  MONSTER_D4.on = true; // Four monster moves, approved by Dave (November 2026).
  Object.assign(TEAMWORK, { heartToHeart: true, noCharms: true, perkPreview: true });
  useWeapons2();
  useWeapons3(); // T29: six weapons, live (Dave, 4 Nov 2026)
  SPECIALS.on = true; // T24 Monster Specials, live (Dave, 2 Nov 2026: "I want to not use the lab and do it on main")
  WEAPON_TRAINING.on = true; // Dave, 26 Oct: make the weapon card's size purchases work (50/100/200).
  WEAR.off = true; // Dave, 25 Oct 2026: weapons never wear out in the live game
  if (!START_DICE.includes('NE')) START_DICE.push('NE'); // T21 (Dave, 25 Oct 2026): every hero starts with both weapon dice live, the right one at no charge
  Object.assign(WEAPONS2.arrowRules, { pierce: 'all', frost: 'strength', fire: 'full' }); WEAPONS2.faces.quiver.special = WEAPONS2.faces.quiver.numbered;
  CLASS2.on = true;
  // say the class rules where players read them: Shield Up's card (Guard) and the Dwarf's trait (Dig In)
  const say = (o, k, line) => { if (o && !o[k].includes(line)) o[k] = `${o[k]} ${line}`; };
  if (CLASS2.guard) say(CLASSES.knight.cards.find((c) => c.id === 'shieldwall'), 'text', 'With friends: you step in front and take the double share of every monster’s blow instead of the slowest hero. Everyone else still takes a single share.');
  if (CLASS2.digIn) say(CLASSES.dwarf, 'trait', `Digs in: from round 5, heals ${CLASS2.digIn} at the start of every round.`);
}
// ?lab (js/lab.js): the release, its own saves, and what is still being tried: monster fury from round 4 (no rallying, mend or move bag)
export function applyLab() {
  Object.assign(PRESSURE, { on: true, bag: false }); PRESSURE.fury.from = 4; PRESSURE.rally.min = 99; PRESSURE.mend.share = 0;
}
