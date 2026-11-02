// T24 Monster Specials, measured: the same hero, fights and seeds with the switch off and on (bots, released rules). Nothing in the game changes.
//   node tools/t24-specials.mjs [campaigns per class=2] [acts=2] [out=/tmp/t24.md]
// Per act and kind of fight: win rate, rounds, lowest health; and per Special how often the bot met its goal and what the miss cost.
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const S = await import('./sim.mjs');
const N = +process.argv[2] || 2; const ACTS = +process.argv[3] || 2; const OUT = process.argv[4] || '/tmp/t24.md'; const TR = 4;
const classes = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const cells = {}; const spec = {}; const cell = (k) => (cells[k] ||= { n: 0, win: 0, rounds: 0, low: 0 });
function play(hero, q, seed, on) {
  D.SPECIALS.on = on; S.PLAY.style = 'wise'; S.setScore(null);
  const b = E.newBattle(structuredClone(hero), q, E.makeRng(seed), 1); const r = E.makeRng(seed + 1); let low = 1, g = 0;
  while (!b.outcome && g++ < 80) { S.botRound(b, r); low = Math.min(low, Math.max(0, b.hp) / b.maxHp); for (const x of b.report?.specials || []) { const c = (spec[x.id] ||= { n: 0, ok: 0 }); c.n++; c.ok += x.ok ? 1 : 0; } }
  D.SPECIALS.on = false; return { win: b.outcome === 'victory', rounds: b.round, low };
}
for (const cls of classes) for (let s = 0; s < N; s++) {
  const seed = 9300 + s; const rng = E.makeRng(seed); const hero = E.newHero({ name: 'C', cls, seed }); hero.difficulty = 'normal'; let alive = true;
  for (let n = 0; n < D.QUESTS_PER_ACT * ACTS && alive; n++) {
    S.PLAY.style = 'wise'; S.setScore(null); const q = E.questsFor(hero)[0]; S.botArm(hero, q);
    const key = `Act ${hero.campaign.act} ${q.kind}`;
    for (let t = 0; t < TR; t++) for (const on of [false, true]) { const r = play(hero, q, (seed + n) * 131 + t, on); const c = cell(`${key}|${on ? 'on' : 'off'}`); c.n++; c.win += r.win; c.rounds += r.rounds; c.low += r.low; }
    S.PLAY.style = 'wise'; S.setScore(null);
    let b; let tries = 0; do { if (tries) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, q, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) S.botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && tries < 6);
    if (b.outcome !== 'victory') { alive = false; break; }
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); S.botLoot(hero, r.drops); if (r.diamond) E.takeDiamond(hero, r.diamond); E.advanceCampaign(hero); S.botCamp(hero, rng);
  }
}
let md = `# T24 Monster Specials, matched (bots, wise player, solo, Normal; ${N} campaigns per class, ${TR} trials a step)\n\n| Act and fight | Specials | Fights | Win | Rounds | Lowest health |\n|---|---|---|---|---|---|\n`;
for (const k of Object.keys(cells).sort()) { const c = cells[k]; const [a, onoff] = k.split('|'); md += `| ${a} | ${onoff} | ${c.n} | ${Math.round((100 * c.win) / c.n)}% | ${(c.rounds / c.n).toFixed(1)} | ${Math.round((100 * c.low) / c.n)}% |\n`; }
md += `\n| Special | Rounds it asked | Goal met |\n|---|---|---|\n`; for (const [id, c] of Object.entries(spec)) md += `| ${id} | ${c.n} | ${Math.round((100 * c.ok) / c.n)}% |\n`;
fs.writeFileSync(OUT, md); console.log(md);
