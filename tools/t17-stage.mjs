// T17 staged balance (Director's order, 26 Oct): the candidate faces (js/weaponladder.js) against today's, on the SAME heroes, encounters and seeds,
// with every fight's outcome kept so differences can be paired. Bots, not people. Nothing in the game changes.
//   node tools/t17-stage.mjs snap <out.json> [heroesPerClass=5]      grow bot heroes (today's faces) and snapshot them at the stage steps
//   node tools/t17-stage.mjs run <snap.json> <out.json> [part=0/1] [fightSeeds=6]   paired fights; split with part=i/n across cores
//   node tools/t17-compare.mjs <out.json ...>                        the paired tables
// A snapshot is a class hero as the wise bot grows it to that step (powers, dice, hands, gold); a case replaces only its two weapons with the stage's metal and
// size and fights one encounter with both face tables. Early = Act I step 3 (Bronze d4), middle = Act II step 5 (Silver d6), late = Act III step 8 (Gold d8).
process.env.RELEASE = '1';
import fs from 'node:fs';
const S = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const WL = await import('../js/weaponladder.js');
const LADDER = WL.buildLadder();
export const STAGES = { early: { key: '1.03', metal: 0, size: 4 }, mid: { key: '2.05', metal: 1, size: 6 }, late: { key: '3.08', metal: 2, size: 8 } };
const CLASSES = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
// the approved starters first, then the legal alternatives worth comparing (Director: the Bard and Dagger loadouts; Ranger all four ammunitions)
const LOADOUTS = {
  knight: [['sword', 'shield'], ['sword', 'tower'], ['spear', 'shield']],
  ranger: [['quiver:normal', 'bow'], ['quiver:pierce', 'bow'], ['quiver:fire', 'bow'], ['quiver:frost', 'bow']],
  wizard: [['dagger', 'shield'], ['dagger', 'dagger'], ['spear', 'shield']],
  dwarf: [['axe', 'tower'], ['axe', 'shield'], ['sword', 'tower']],
  bard: [['dagger', 'shield'], ['dagger', 'dagger'], ['sword', 'shield']],
};
// late stage: the shield-loadout regressions and the pairs, every class
const MATRIX = [['sword', 'shield'], ['sword', 'tower'], ['dagger', 'shield'], ['dagger', 'tower'], ['axe', 'shield'], ['axe', 'tower'], ['spear', 'shield'], ['spear', 'tower'], ['dagger', 'dagger'], ['sword', 'sword'], ['axe', 'axe'], ['quiver:normal', 'bow']];
// controlled armour: the same encounter with every monster's armour replaced (the monsters' own armour dice are rolled each round and subtract from the blow)
const ARMOUR = { none: null, d6: { n: 1, s: 6 }, '2d6': { n: 2, s: 6 } };
const CONTROL = ['spear', 'axe', 'dagger', 'sword']; // each with the Round Shield: Spear against Axe and Dagger under the same armour

const clone = (h) => structuredClone(h); const pad = (n) => String(n).padStart(2, '0');
const setMode = (m) => { D.WEAPON_SIZE.ladder = m === 'candidate' ? LADDER : null; D.WEAPON_SIZE.cumulative = m === 'candidate'; };

async function snap(out, per) {
  setMode('today'); S.PLAY.style = 'wise'; S.setScore(null); const keys = new Set(Object.values(STAGES).map((s) => s.key)); const snaps = [];
  for (const cls of (process.env.CLS || CLASSES.join(',')).split(',')) for (let s = 0; s < per; s++) { // CLS=knight runs one class (so classes can run on separate cores)
    const seed = 9300 + s; const rng = E.makeRng(seed); const hero = E.newHero({ name: `S${cls}${s}`, cls, seed }); hero.difficulty = 'normal'; let alive = true;
    for (let n = 0; n < D.QUESTS_PER_ACT * 3 && alive; n++) {
      const quest = E.questsFor(hero)[0]; const key = `${hero.campaign.act}.${pad(hero.campaign.step)}`;
      if (keys.has(key)) snaps.push({ cls, seed, key, hero: clone(hero) });
      let b; let tries = 0;
      do { if (tries) while (E.buyPotion(hero)) { /* restock after a retreat */ } b = S.fight(hero, quest, rng); tries++; } while (b.outcome === 'defeat' && tries < 6);
      if (b.outcome !== 'victory') { alive = false; break; }
      const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); S.botLoot(hero, r.drops); E.advanceCampaign(hero); S.botCamp(hero, rng);
    }
    process.stderr.write(`${cls} ${s}: ${alive ? 'cleared' : 'fell'} (${snaps.filter((x) => x.cls === cls && x.seed === seed).length} snapshots)\n`);
  }
  fs.writeFileSync(out, JSON.stringify(snaps)); console.log(`${snaps.length} snapshots`);
}

function wield(h, ids, stage, rng) {
  const mk = (spec) => { const [id, ammo] = spec.split(':'); const w = E.makeWeapon(id, stage.metal, rng, stage.size); if (ammo) w.ammo = ammo; return w; };
  h.loadout.NW = mk(ids[0]); h.loadout.NE = mk(ids[1]); if (!h.dice.includes('NE')) h.dice.push('NE'); h.bag = h.bag || [];
}
function battle(snapHero, ids, stage, armour, seed, mode) {
  setMode(mode); const h = clone(snapHero); const rng = E.makeRng(seed); wield(h, ids, stage, E.makeRng(7)); const q = E.questsFor(h)[0];
  const b = E.newBattle(h, q, rng, 1); if (armour) for (const e of b.enemies) e.armor = { ...ARMOUR[armour] };
  let g = 0; while (!b.outcome && g++ < 60) S.botRound(b, rng);
  const win = b.outcome === 'victory';
  return { seed, win: win ? 1 : 0, timeout: b.outcome ? 0 : 1, rounds: b.round, hpLost: win ? +(1 - b.hp / b.maxHp).toFixed(3) : 1, dealt: b.stats.dealt || 0, taken: b.stats.taken || 0, healed: b.stats.healed || 0, blocked: b.stats.blocked || 0, gold: b.goldEarned || 0, potions: (b.potions0 ?? 0) - (b.potions ?? 0) };
}
async function run(snapFile, outFile, part, seedsPer) {
  const snaps = JSON.parse(fs.readFileSync(snapFile, 'utf8')); const [pi, pn] = part.split('/').map(Number); const tasks = [];
  const add = (stageName, group, cls, hero, ids, armour) => { for (let k = 0; k < seedsPer; k++) tasks.push({ stageName, group, cls, hero, ids, armour, seed: 5000 + k }); };
  for (const [stageName, stage] of Object.entries(STAGES)) for (const sn of snaps.filter((x) => x.key === stage.key)) {
    for (const ids of LOADOUTS[sn.cls]) add(stageName, 'starters', sn.cls, sn, ids, null);
    if (stageName === 'late') for (const ids of MATRIX) add(stageName, 'matrix', sn.cls, sn, ids, null);
    if (stageName !== 'early') for (const c of CONTROL) for (const a of ['none', 'd6', '2d6']) add(stageName, 'control', sn.cls, sn, [c, 'shield'], a === 'none' ? null : a);
  }
  const mine = tasks.filter((_, i) => i % pn === pi); const rows = [];
  for (const t of mine) {
    const stage = STAGES[t.stageName]; const base = { stage: t.stageName, group: t.group, cls: t.cls, heroSeed: t.hero.seed, loadout: t.ids.join('+'), armour: t.armour || 'natural' };
    for (const mode of ['today', 'candidate']) rows.push({ ...base, mode, ...battle(t.hero.hero, t.ids, stage, t.armour, t.seed, mode) });
    if (rows.length % 400 === 0) process.stderr.write(`part ${part}: ${rows.length} of ${mine.length * 2} fights\n`);
  }
  fs.writeFileSync(outFile, JSON.stringify(rows)); console.log(`part ${part}: ${rows.length} fights written`);
}
const [, , cmd, a, b, c, d] = process.argv;
if (cmd === 'snap') await snap(a, +(b || 5));
else if (cmd === 'run') await run(a, b, c || '0/1', +(d || 6));
