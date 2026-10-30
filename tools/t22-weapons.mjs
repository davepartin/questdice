// T22: the weapon roster, measured. Same hero, same fights, only the two weapons change (released rules; bots; nothing in the game changes).
//   node tools/t22-weapons.mjs [fights=80] [out=/tmp/t22.md]
// A cell is one weapon set at one die size and metal, fought on one encounter. The bot is the same everywhere, so the table compares weapons with each other;
// it does not say how a person plays. Hero strength is set to the weapon's size so no hand cap hides the die.
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const SIM = await import('./sim.mjs'); const { smartActs, botShape } = SIM;
const N = +process.argv[2] || 80; const OUT = process.argv[3] || '/tmp/t22.md';
const ENC_ALL = [ // [label, act, step, level, die size, metal index]
  ['Act I step 2, Bronze d4', 1, 2, 2, 4, 0], ['Act II step 5, Silver d6', 2, 5, 5, 6, 1], ['Act III step 8, Gold d8', 3, 8, 8, 8, 2], ['Act III step 9, Gold d10', 3, 9, 9, 10, 2]];
const ENC = process.env.ENC ? process.env.ENC.split(',').map((i) => ENC_ALL[+i]) : ENC_ALL.slice(0, 3); // ENC=0,1 runs some of them (so slices can run on separate cores); T17_CAND=1 plays the T17 candidate faces
const mk = (id, r, s, ammo) => { const w = E.makeWeapon(id, r, () => 0.5, s); if (ammo) w.ammo = ammo; return w; };
const SETS = [ // [label, left id, right id, ammo]
  ['Dagger + Round Shield', 'dagger', 'shield'], ['Sword + Round Shield', 'sword', 'shield'], ['Axe + Round Shield', 'axe', 'shield'], ['Spear + Round Shield', 'spear', 'shield'],
  ['Sword + Tower Shield', 'sword', 'tower'], ['Dagger + Tower Shield', 'dagger', 'tower'], ['Dagger + Dagger', 'dagger', 'dagger'], ['Sword + Sword', 'sword', 'sword'], ['Axe + Axe', 'axe', 'axe'],
  ['Arrows (normal) + Bow', 'quiver', 'bow', 'normal'], ['Arrows (piercing) + Bow', 'quiver', 'bow', 'pierce'], ['Arrows (fire) + Bow', 'quiver', 'bow', 'fire'], ['Arrows (frost) + Bow', 'quiver', 'bow', 'frost']];
D.EXPERIMENT; // (released rules already applied by RELEASE=1)
function fight(set, enc, seed) {
  const [, left, right, ammo] = set; const [, act, step, level, size, metal] = enc;
  const h = E.newHero({ name: 'T', cls: 'knight', seed: 11 }); h.level = level; h.campaign.act = act; h.campaign.step = step; h.strength = { W: size, E: size };
  h.loadout.NW = mk(left, metal, size, left === 'quiver' ? ammo : null); h.loadout.NE = mk(right, metal, size, right === 'quiver' ? ammo : null); if (!h.dice.includes('NE')) h.dice.push('NE');
  const q = E.questsFor(h)[0]; const rng = E.makeRng(seed); const b = E.newBattle(h, q, rng, 1); const hp0 = b.enemies.reduce((s, e) => s + e.maxHp, 0); let taken = 0, absorbed = 0, g = 0;
  while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); const acts = smartActs(b); E.resolve(b, acts); taken += b.report?.taken || 0; absorbed += b.report?.absorbed || 0; }
  const hpLeft = b.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0);
  return { win: b.outcome === 'victory', rounds: b.round, left: Math.max(0, b.hp) / b.maxHp, dealt: hp0 - hpLeft, taken, absorbed };
}
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1); const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
let md = `# T22 weapon roster measurement (bots, ${N} matched fights per cell, released rules)\n\nSame hero (knight shell, level set per encounter), same encounters and seeds; only the two weapons change. Win %, rounds, health left when won, damage dealt per round to the monsters, damage the hero took per round, damage blocked per round.\n`;
const all = {};
for (const enc of ENC) {
  md += `\n## ${enc[0]}\n\n| Weapons | Win % | Rounds | Health left when won | Dealt / round | Taken / round | Blocked / round |\n|---|---|---|---|---|---|---|\n`;
  for (const set of SETS) { const rs = []; for (let i = 0; i < N; i++) rs.push(fight(set, enc, 1000 + i)); const w = rs.filter((r) => r.win);
    const row = { win: 100 * w.length / N, rounds: mean(rs.map((r) => r.rounds)), left: w.length ? 100 * mean(w.map((r) => r.left)) : 0, dealt: mean(rs.map((r) => r.dealt / r.rounds)), taken: mean(rs.map((r) => r.taken / r.rounds)), blocked: mean(rs.map((r) => r.absorbed / r.rounds)) };
    row.raw = rs.map((r, i) => ({ seed: 1000 + i, win: r.win ? 1 : 0, rounds: r.rounds, left: +r.left.toFixed(3), dealt: r.dealt, taken: r.taken, absorbed: r.absorbed })); // per-seed outcomes, so a matched comparison can be paired (T17 review, 26 Oct)
    all[`${enc[0]}|${set[0]}`] = row; md += `| ${set[0]} | ${Math.round(row.win)} | ${f1(row.rounds)} | ${Math.round(row.left)}% | ${f1(row.dealt)} | ${f1(row.taken)} | ${f1(row.blocked)} |\n`; }
}
fs.writeFileSync(OUT, md); fs.writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(all, null, 1)); console.log(md);
