// Objective audit fixtures (Director, 25 Oct): Lone Wolf and Glass Shield, on the real engine, released rules. Structural impossibility is reported apart from low probability.
//   node tools/t22-objectives.mjs [fights=300] [out=/tmp/t22-obj.md]
// Lone Wolf: "never attack the monster a teammate attacks that round". Impossible by construction in a round where only one monster lives and two heroes strike it.
//   We play two-hero fights with (a) the ordinary bot, and (b) a "wolf" that always picks a monster no earlier teammate picked when one is alive, so (b) fails only where the rule cannot be met.
// Glass Shield: "have no block at all in 2 rounds". Block comes only from blue faces and block powers. We play a hero who, with the legal rerolls, throws away every die that shows a block
//   face (a "dodger") and one who plays normally, with the released shield faces, and count rounds with zero block.
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const S = await import('../js/secrets.js'); const SIM = await import('./sim.mjs'); const { smartActs, botShape } = SIM;
const N = +process.argv[2] || 300; const OUT = process.argv[3] || '/tmp/t22-obj.md';
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1); const pc = (k, n) => `${Math.round(100 * k / Math.max(1, n))}%`;
// ---------------------------------------------------------------------------------------------------- Lone Wolf
function wolfFight(nEnemies, policy, seed) {
  const hs = ['Ada', 'Bea'].map((name, i) => E.newHero({ name, cls: ['knight', 'bard'][i], seed: 5 + i })); for (const h of hs) { h.campaign.act = 1; h.campaign.step = 2; h.level = 2; }
  const q = E.questsFor(hs[0])[0]; q.enemies = Array(nEnemies).fill('goblin'); q.foeNames = q.enemies.map((_, i) => `Goblin ${i + 1}`);
  const rng = E.makeRng(seed); const b = E.newPartyBattle(hs, q, rng); b._real = true; let forced = 0, guard = 0; const startFoes = b.enemies.length;
  while (!b.outcome && guard++ < 60) {
    const alive = b.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0); const chosen = [];
    for (let i = 0; i < b.fighters.length; i++) { if (!E.startFighter(b, i)) continue; botShape(b, rng); const o = smartActs(b); E.commitFighter(b); const f = b.fighters[i];
      let t = o.target; if (policy === 'wolf' && i > 0) { const free = alive.filter((k) => !chosen.includes(k)); if (free.length) t = free[0]; } if (policy === 'wolf' && i === 0) t = alive[0];
      f.target = t; f.straight = o.straight; f.locked = true; chosen.push(t); }
    const strikers = b.fighters.filter((f) => f.hp > 0 && f.locked).length; if (alive.length === 1 && strikers >= 2) forced++;
    E.resolveParty(b); for (const f of b.fighters) f.locked = false;
  }
  const log = b.secretLog || []; const rows = { Ada: log.filter((r) => r.name === 'Ada'), Bea: log.filter((r) => r.name === 'Bea') };
  const pass = S.CARDS.lonewolf.check({ me: rows.Ada, rows, others: ['Bea'] });
  return { pass, forced, rounds: b.round, startFoes, won: b.outcome === 'victory' };
}
let md = `# Objective audit fixtures (bots, ${N} two-hero fights per cell, released rules)\n\n## Lone Wolf: "Never attack the monster a teammate attacks that round"\n\n| Monsters at the start | Policy | Passes the card | Fights with a forced shared target (one monster left, both heroes striking) | Passes when no round was forced | Mean rounds |\n|---|---|---|---|---|---|\n`;
const wolfRes = {};
for (const n of [1, 2, 3, 4]) for (const policy of ['bot', 'wolf']) { const rs = []; for (let i = 0; i < N; i++) rs.push(wolfFight(n, policy, 7000 + i)); const k = rs.filter((r) => r.pass).length; const forced = rs.filter((r) => r.forced > 0).length; const clean = rs.filter((r) => r.forced === 0); const kc = clean.filter((r) => r.pass).length;
  wolfRes[`${n}:${policy}`] = { k, forced, clean: clean.length, kc }; md += `| ${n} | ${policy === 'wolf' ? 'a hero who tries to avoid the teammate' : 'the ordinary bot'} | ${k}/${N} (${pc(k, N)}) | ${forced}/${N} (${pc(forced, N)}) | ${clean.length ? `${kc}/${clean.length} (${pc(kc, clean.length)})` : 'n/a'} | ${f1(rs.reduce((a, r) => a + r.rounds, 0) / N)} |\n`; }
// ---------------------------------------------------------------------------------------------------- Glass Shield
const SETS = [['Sword + Round Shield (Bronze d4)', 'sword', 'shield', 0, 4], ['Sword + Tower Shield (Bronze d4)', 'sword', 'tower', 0, 4], ['Dagger + Dagger (Bronze d4)', 'dagger', 'dagger', 0, 4], ['Arrows + Bow (Bronze d4)', 'quiver', 'bow', 0, 4], ['Sword + Round Shield (Silver d6)', 'sword', 'shield', 1, 6]];
function glassFight(set, policy, seed) {
  const [, left, right, metal, size] = set; const h = E.newHero({ name: 'G', cls: 'knight', seed: 9 }); h.level = 3; h.campaign.act = 1; h.campaign.step = 2; h.strength = { W: size, E: size };
  const w = (id) => { const x = E.makeWeapon(id, metal, () => 0.5, size); if (id === 'quiver') x.ammo = 'normal'; return x; }; h.loadout.NW = w(left); h.loadout.NE = w(right); if (!h.dice.includes('NE')) h.dice.push('NE');
  const q = E.questsFor(h)[0]; const rng = E.makeRng(seed); const b = E.newBattle(h, q, rng, 1); let zero = 0, rounds = 0, guard = 0;
  while (!b.outcome && guard++ < 40) {
    E.startRoll(b);
    if (policy === 'dodger') for (let k = 0; k < 6; k++) { // legal rerolls only: every die showing a block face goes back in the cup while a free reroll remains
      const base = E.evaluate(b.hero, b.board).block; if (!base) break; // already no block at all
      const blue = E.activeSlots(b.hero).filter((sl) => b.board[sl] && !b.board[sl].bound && (() => { const sides = E.sidesOf(b.hero, sl) || 4; for (let v = 1; v <= sides; v++) { const bd = { ...b.board, [sl]: { ...b.board[sl], v } }; if (E.evaluate(b.hero, bd).block < base) return true; } return false; })()); // the dice that are paying block right now
      if (!blue.length) break; const pick = blue.slice(0, E.rerollDiceOf(b.hero)); if (!E.canReroll(b, pick)) break; E.reroll(b, pick); }
    else botShape(b, rng);
    const acts = smartActs(b); E.resolve(b, acts); rounds++; const row = (b.secretLog || []).filter((r) => r.name === 'G').pop(); if (row && !row.blk) zero++;
  }
  return { zero, rounds, pass: zero >= 2, won: b.outcome === 'victory' };
}
md += `\n## Glass Shield: "Have no block at all in 2 rounds"\n\nBlock comes from blue faces (a blue +0 still pays the hand's number) and block powers. "Dodger" throws back every die that shows a block face with the legal free rerolls; "ordinary" plays like the bot.\n\n| Loadout | Policy | Rounds with zero block (mean per fight) | Passes the card (two zero-block rounds) | Mean fight length |\n|---|---|---|---|---|\n`;
for (const set of SETS) for (const policy of ['ordinary', 'dodger']) { const rs = []; for (let i = 0; i < N; i++) rs.push(glassFight(set, policy, 9000 + i)); const k = rs.filter((r) => r.pass).length; md += `| ${set[0]} | ${policy} | ${f1(rs.reduce((a, r) => a + r.zero, 0) / N)} | ${k}/${N} (${pc(k, N)}) | ${f1(rs.reduce((a, r) => a + r.rounds, 0) / N)} |\n`; }
fs.writeFileSync(OUT, md); console.log(md);
