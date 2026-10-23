// What the live game plays (Dave's approvals). The rules live behind switches in js/data.js so the tools and tests can compare them;
// this file turns on the approved ones for everyone, before the game boots. ?lab (js/lab.js) plays the same rules with its own saves,
// plus whatever is still being tried there.
//   23 Oct 2026  release 1, the teamwork pass: Heart to Heart (replaces Heartbeat), heart faces and Ready at the table, charms resting,
//                perk cards with before and after (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md)
//   23 Oct 2026  release 2 ("release everything", less monster fury): the six one-handed weapons with Bow and Arrows (Silver and Gold
//                add today's metal icons), the arrows as last measured, and the class rules (Knight Guard, Dwarf Dig In, Bard Verse for a
//                friend). Old two-handed Bows become Arrows + Bow when a save loads (save.js migrateWeapons2). Monster fury from round 4
//                stays in ?lab: with it the campaign cleared 5 of 10 times on Normal (10 of 10 without; docs/balance/curve_release*.txt).
import { TEAMWORK, CLASS2, WEAPONS2, PRESSURE, CLASSES } from './data.js';
import { useWeapons2 } from './engine.js';

export function applyRelease() {
  Object.assign(TEAMWORK, { heartToHeart: true, noCharms: true, perkPreview: true });
  useWeapons2();
  Object.assign(WEAPONS2.arrowRules, { pierce: 'all', frost: 'strength', fire: 'full' }); WEAPONS2.faces.quiver.special = WEAPONS2.faces.quiver.numbered;
  CLASS2.on = true;
  // say the class rules where players read them: Shield Up's card (Guard) and the Dwarf's trait (Dig In)
  const say = (o, k, line) => { if (o && !o[k].includes(line)) o[k] = `${o[k]} ${line}`; };
  if (CLASS2.guard) say(CLASSES.knight.cards.find((c) => c.id === 'shieldwall'), 'text', 'With friends: you step in front and take the monsters’ double share, not the slowest hero.');
  if (CLASS2.digIn) say(CLASSES.dwarf, 'trait', `Digs in: from round 5, heals ${CLASS2.digIn} at the start of every round.`);
}
// ?lab (js/lab.js): the release, its own saves, and what is still being tried: monster fury from round 4 (no rallying, mend or move bag)
export function applyLab() {
  Object.assign(PRESSURE, { on: true, bag: false }); PRESSURE.fury.from = 4; PRESSURE.rally.min = 99; PRESSURE.mend.share = 0;
}
