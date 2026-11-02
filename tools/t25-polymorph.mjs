// Polymorph as a Charge card (Dave, 2 Nov 2026, via Grok's board request), measured: the same Wizard, fights and seeds with the old Polymorph
// (3 magic every round, 2 at Level III) and the new one (charge 1 a round, max 3; a d6 on Use: 4-6, 2-6, sure). Bots, released rules, solo.
//   node tools/t25-polymorph.mjs [campaigns=4] [acts=3] [difficulty=normal] [out=/tmp/t25.md] [player=wise|frog]
// player wise: the careful bot (plays out its choices); frog: a Wizard who plays Polymorph first every round it can, on the hardest hitter (the loop Dave wants gone).
// The hero walks the campaign with the new card; at every step both versions fight that step TR times from the same state.
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const S = await import('./sim.mjs');
const N = +process.argv[2] || 4; const ACTS = +process.argv[3] || 3; const SKILL = process.argv[4] || 'normal'; const OUT = process.argv[5] || '/tmp/t25.md'; const PLAYER = process.argv[6] || 'wise'; const TR = 4;
const style = () => { S.PLAY.style = PLAYER === 'frog' ? 'smart' : 'wise'; S.PLAY.frog = PLAYER === 'frog'; S.setScore(null); };
const cells = {}; const cell = (k) => (cells[k] ||= { n: 0, win: 0, rounds: 0, low: 0, frogs: 0, magic: 0 });
function play(hero, q, seed, which) {
  S.usePolymorph(which); style();
  const b = E.newBattle(structuredClone(hero), q, E.makeRng(seed), 1); const r = E.makeRng(seed + 1); let low = 1, g = 0, frogs = 0, m0 = 0, seen = null;
  E.CAST_HOOK.on = (bb, out) => { if (bb === b && out.id === 'polymorph') m0 += out.cost || 0; }; // (the bot's look-ahead copies cast too: count only the real battle)
  while (!b.outcome && g++ < 80) { S.botRound(b, r); low = Math.min(low, Math.max(0, b.hp) / b.maxHp); if (b.report?.frog && b.report !== seen) frogs++; seen = b.report; }
  E.CAST_HOOK.on = null; S.usePolymorph('new'); return { win: b.outcome === 'victory', rounds: b.round, low, frogs, magic: m0 };
}
for (let s = 0; s < N; s++) {
  const seed = 7100 + s; const rng = E.makeRng(seed); const hero = E.newHero({ name: 'W', cls: 'wizard', seed }); hero.difficulty = SKILL; let alive = true;
  for (let n = 0; n < D.QUESTS_PER_ACT * ACTS && alive; n++) {
    style(); const q = E.questsFor(hero)[0]; S.botArm(hero, q);
    const key = `Act ${hero.campaign.act} ${q.kind === 'battle' ? 'battles' : q.kind}`;
    for (let t = 0; t < TR; t++) for (const which of ['old', 'new']) { const r = play(hero, q, (seed + n) * 131 + t, which); const c = cell(`${key}|${which}`); c.n++; c.win += r.win; c.rounds += r.rounds; c.low += r.low; c.frogs += r.frogs; c.magic += r.magic; }
    style();
    let b; let tries = 0; do { if (tries) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, q, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) S.botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && tries < 6);
    if (b.outcome !== 'victory') { alive = false; break; }
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); S.botLoot(hero, r.drops); if (r.diamond) E.takeDiamond(hero, r.diamond); E.advanceCampaign(hero); S.botCamp(hero, rng);
  }
}
const order = (k) => k.replace(/battles/, '1').replace(/elite/, '2').replace(/boss/, '3');
let md = `# Polymorph, old vs new (bots, ${PLAYER === 'frog' ? 'frog-first play' : 'wise play'}, solo Wizard, ${SKILL}; ${N} campaigns, ${TR} trials a step, matched seeds)\n\n| Act and fight | Polymorph | Fights | Win | Rounds | Lowest health | Frog rounds a fight | Magic on Polymorph a fight |\n|---|---|---|---|---|---|---|---|\n`;
for (const k of Object.keys(cells).sort((a, b) => order(a).localeCompare(order(b)))) { const c = cells[k]; const [a, w] = k.split('|'); md += `| ${a} | ${w} | ${c.n} | ${Math.round((100 * c.win) / c.n)}% | ${(c.rounds / c.n).toFixed(1)} | ${Math.round((100 * c.low) / c.n)}% | ${(c.frogs / c.n).toFixed(1)} | ${(c.magic / c.n).toFixed(1)} |\n`; }
fs.writeFileSync(OUT, md); console.log(md);
