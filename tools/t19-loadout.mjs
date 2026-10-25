// T19: expected throw of a Jasper-like hero (Knight level 13, dice as in the report's final rounds) with the legacy War Hammer and with active-roster loadouts.
// No rerolls or powers, single throws: a relative comparison of what the weapons add, not a fight result. Read-only.
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
applyRelease();
const build = (weapons) => {
  const h = E.newHero({ name: 'Jasper', cls: 'knight', seed: 3 }); h.level = 13; h.campaign.act = 3; h.campaign.step = 8; h.dice = null;
  h.mind = { N: 8 }; h.feet = 6; h.strength = { W: 8, E: 10 }; h.special = { SW: 6, SE: 8 }; h.pet = { kind: 'turtle', size: 4, faces: [] };
  h.loadout = {}; for (const [slot, w] of Object.entries(weapons)) h.loadout[slot] = w; return h;
};
const mk = (id, r, size, extra = {}) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...extra });
const hammer = mk('warhammer', 2, 8); const hammerR = { ...hammer, uid: `${hammer.uid}~R`, twin: true };
const sets = {
  'War Hammer (Gold d8, two-handed; as in the report)': { NW: hammer, NE: hammerR },
  'Gold Sword d8 + Gold Axe d8': { NW: mk('sword', 2, 8), NE: mk('axe', 2, 8) },
  'Gold Sword d8 + Gold Round Shield d8': { NW: mk('sword', 2, 8), NE: mk('shield', 2, 8) },
  'Gold Axe d8 + Gold Tower Shield d8': { NW: mk('axe', 2, 8), NE: mk('tower', 2, 8) },
  'Gold Spear d8 + Gold Sword d8': { NW: mk('spear', 2, 8), NE: mk('sword', 2, 8) },
};
const N = 4000; const rows = [];
for (const [name, w] of Object.entries(sets)) {
  const h = build(w); const rng = E.makeRng(11); const a = { atk: 0, pierce: 0, block: 0, heal: 0, magic: 0 }; const atkSamples = [];
  for (let i = 0; i < N; i++) { const ev = E.evaluate(h, E.rollBoard(h, rng)); for (const k of Object.keys(a)) a[k] += ev[k] || 0; atkSamples.push((ev.atk || 0) + (ev.pierce || 0)); }
  atkSamples.sort((x, y) => x - y);
  rows.push(`| ${name} | ${(a.atk / N).toFixed(1)} | ${(a.pierce / N).toFixed(1)} | ${((a.atk + a.pierce) / N).toFixed(1)} | ${(a.block / N).toFixed(1)} | ${atkSamples[Math.floor(N * 0.1)]} | ${atkSamples[Math.floor(N * 0.5)]} | ${atkSamples[Math.floor(N * 0.9)]} |`);
}
console.log('| Loadout | Attack | Pierce | Attack + pierce | Block | p10 (att+pierce) | p50 | p90 |\n|---|---|---|---|---|---|---|---|\n' + rows.join('\n'));
