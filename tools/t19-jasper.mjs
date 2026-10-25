// T19: an APPROXIMATE Jasper (what the report's retained data allows) fighting the nemesis return many times with the sim bot. Not an exact replay:
// the seed, the first five rounds, the early choices, the talents' faces, the powers' levels beyond the report and the pet are not known.
// Known from the report: Knight level 13, max health 98, start magic 6, 3 potions of 20, War Hammer (Gold, two-handed, legacy), the dice sizes in the
// final rounds (head d8, feet d6, left hand d8, right hand d10, heart d6, talents d6 and d8, pet d4), the powers Cleave L1, Shield Up, Second Wind L1 and
// the perks Stout Heart, Gold Sense, Ironward x2, Keen Edge, Arcane Reserve x2, Vitality x2, Piercing Pips x2.   Run: node tools/t19-jasper.mjs [fights]
process.env.RELEASE = '1';
const SIM = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js');
const { smartActs, botShape } = SIM; const N = Number(process.argv[2] || 150);
const PERK = (name) => Object.keys(D.PERKS).find((id) => D.PERKS[id].name === name);
const perks = ['Stout Heart', 'Gold Sense', 'Ironward', 'Keen Edge', 'Arcane Reserve', 'Vitality', 'Piercing Pips', 'Arcane Reserve', 'Ironward', 'Vitality', 'Piercing Pips'].map(PERK);
const missing = perks.filter((x) => !x);
const build = () => {
  const h = E.newHero({ name: 'Jasper', cls: 'knight', seed: 3 }); h.level = 13; h.campaign.act = 3; h.campaign.step = 8; h.difficulty = 'normal'; h.dice = null;
  h.mind = { N: 8 }; h.feet = 6; h.strength = { W: 8, E: 10 }; h.special = { SW: 6, SE: 8 }; h.perks = perks.filter(Boolean); h.potions = 3; h.potionMax = 3;
  const ham = { ...E.makeWeapon('warhammer', 2, () => 0.5, 8) }; h.loadout = { NW: ham, NE: { ...ham, uid: `${ham.uid}~R`, twin: true } };
  const c = h.campaign; c.nemeses = [{ id: 'vharaxis', name: D.MONSTERS.vharaxis.name, scar: 'blade', wound: 0.3, act: 3, step: 5, grudge: 0, bounty: 1.5 }]; c.nextPlace = 'Wyrmwatch'; c.nextEnemies = ['gloomstalker', 'dirgesinger'];
  return h;
};
const rows = []; const hero0 = build(); const q0 = E.questsFor(hero0)[0];
for (let i = 0; i < N; i++) {
  const h = structuredClone(hero0); const rng = E.makeRng(500 + i); const b = E.newBattle(h, q0, rng, 1);
  const r = { rounds: 0, bossOnly: 0, heals: 0, maxHealsInRound: 0, minHp: b.hp, healed: 0 }; let g = 0;
  while (!b.outcome && g++ < 90) {
    const alive = b.enemies.filter((e) => e.hp > 0); const only = alive.length === 1 && alive[0].tier === 'boss';
    E.startRoll(b); botShape(b, rng); const a = smartActs(b); const hr = b.healsRound || 0; r.heals += hr; r.maxHealsInRound = Math.max(r.maxHealsInRound, hr);
    r.rounds++; if (only) r.bossOnly++; E.resolve(b, a); r.minHp = Math.min(r.minHp, b.hp);
  }
  r.outcome = b.outcome || 'timeout'; r.maxHp = b.maxHp; r.healed = b.stats.healed; rows.push(r);
}
const win = rows.filter((r) => r.outcome === 'victory'); const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
console.log(JSON.stringify({ note: 'approximate Jasper, not an exact replay', missingPerks: missing.length, maxHp: rows[0].maxHp, enemies: E.newBattle(structuredClone(hero0), q0, E.makeRng(1), 1).enemies.map((e) => ({ id: e.id, startHp: e.hp, maxHp: e.maxHp, flat: e.flat })),
  fights: N, winPct: f1(100 * win.length / N), rounds: { mean: f1(mean(rows.map((r) => r.rounds))), p10: pct(rows.map((r) => r.rounds), 0.1), p50: pct(rows.map((r) => r.rounds), 0.5), p90: pct(rows.map((r) => r.rounds), 0.9), max: Math.max(...rows.map((r) => r.rounds)) },
  winsOnly: { roundsMean: f1(mean(win.map((r) => r.rounds))), bossOnlyMean: f1(mean(win.map((r) => r.bossOnly))), healPressesMean: f1(mean(win.map((r) => r.heals))), maxHealsInARoundMean: f1(mean(win.map((r) => r.maxHealsInRound))), minHpShareMean: f1(100 * mean(win.map((r) => r.minHp / r.maxHp))) },
  reportForComparison: { rounds: 24, bossOnly: 14, healPresses: '35 in rounds 6-24', maxHealsInARound: 8, lowestEndOfRound: '10 of 98' } }, null, 1));
