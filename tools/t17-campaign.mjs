// T17 staged balance: matched-seed solo campaigns, today's faces against the candidate (bots; nothing in the game changes).
//   node tools/t17-campaign.mjs run <out.json> [campaignsPerClass=12] [part=0/1] [acts=3]     one campaign per class and seed, played twice (same seed, same bot)
//   node tools/t17-campaign.mjs report <part.json ...>                                        paired tables, resampling over CAMPAIGNS (fights of one campaign are dependent)
// The wise bot plays a whole campaign (fights, retreats with a restock, loot, camp spending) with each face table. Same hero seed and same fight seed stream, but the
// two runs diverge as soon as a die lands differently, so the comparison is across campaigns, not step by step. Retreat = a lost fight that was fought again.
process.env.RELEASE = '1';
import fs from 'node:fs';
const S = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const WL = await import('../js/weaponladder.js');
const LADDER = WL.buildLadder(); const CLASSES = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const setMode = (m) => { D.WEAPON_SIZE.ladder = m === 'candidate' ? LADDER : null; D.WEAPON_SIZE.cumulative = m === 'candidate'; };
function campaign(cls, seed, mode, acts) {
  setMode(mode); S.PLAY.style = 'wise'; S.setScore(null);
  const rng = E.makeRng(seed); const hero = E.newHero({ name: 'C', cls, seed }); hero.difficulty = 'normal';
  const r = { mode, cls, seed, cleared: 0, steps: 0, retreats: 0, fights: 0, firstTry: 0, rounds: 0, hpLost: 0, bossFirst: 0, bossN: 0, eliteFirst: 0, eliteN: 0, battleFirst: 0, battleN: 0, gold: 0, level: 0, fell: null };
  let alive = true;
  for (let n = 0; n < D.QUESTS_PER_ACT * acts && alive; n++) {
    const quest = E.questsFor(hero)[0]; let b; let tries = 0; let first = null;
    do { if (tries) while (E.buyPotion(hero)) { /* restock after a retreat */ } b = S.fight(hero, quest, rng); tries++; if (first === null) first = b.outcome === 'victory' ? 1 : 0; r.fights++; r.rounds += b.round; } while (b.outcome === 'defeat' && tries < 6);
    r.retreats += tries - 1; r.firstTry += first; const k = quest.kind === 'boss' ? 'boss' : quest.kind === 'elite' ? 'elite' : 'battle'; r[`${k}N`]++; r[`${k}First`] += first;
    if (b.outcome !== 'victory') { alive = false; r.fell = `${hero.campaign.act}.${hero.campaign.step}`; break; }
    r.hpLost += 1 - b.hp / b.maxHp; r.steps++;
    const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); S.botLoot(hero, rw.drops); E.advanceCampaign(hero); S.botCamp(hero, rng);
  }
  r.cleared = alive ? 1 : 0; r.gold = hero.gold; r.level = hero.level; r.hpLost = r.steps ? r.hpLost / r.steps : 0; return r;
}
const [, , cmd, a, b, c, d] = process.argv;
if (cmd === 'run') {
  const per = +(b || 12); const [pi, pn] = (c || '0/1').split('/').map(Number); const acts = +(d || 3); const tasks = [];
  for (let s = 0; s < per; s++) for (const cls of CLASSES) tasks.push({ cls, seed: 9500 + s });
  const rows = [];
  for (const [i, t] of tasks.entries()) { if (i % pn !== pi) continue; for (const mode of ['today', 'candidate']) rows.push(campaign(t.cls, t.seed, mode, acts)); process.stderr.write(`part ${c || '0/1'}: ${t.cls} ${t.seed} done (${rows.length} campaigns)\n`); }
  fs.writeFileSync(a, JSON.stringify(rows)); console.log(`${rows.length} campaigns written`);
} else if (cmd === 'report') {
  const rows = process.argv.slice(3).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8'))); const pairs = new Map();
  for (const r of rows) { const k = `${r.cls}|${r.seed}`; const p = pairs.get(k) || { cls: r.cls, seed: r.seed }; p[r.mode] = r; pairs.set(k, p); }
  const all = [...pairs.values()].filter((p) => p.today && p.candidate); const mean = (x) => x.reduce((s, v) => s + v, 0) / (x.length || 1);
  let seed = 4242; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const ci = (ps, f) => { const d = ps.map(f); const mu = mean(d); if (d.length < 6) return { mu }; const bs = []; for (let i = 0; i < 2000; i++) { let s = 0; for (let j = 0; j < d.length; j++) s += d[Math.floor(rnd() * d.length)]; bs.push(s / d.length); } bs.sort((x, y) => x - y); return { mu, lo: bs[50], hi: bs[1949] }; };
  const sg = (x, k = 1, dp = 1) => `${x * k >= 0 ? '+' : ''}${(x * k).toFixed(dp)}`; const cell = (ps, f, k = 1, dp = 1) => { const r = ci(ps, f); const star = r.lo != null && (r.lo > 0 || r.hi < 0) ? ' *' : ''; return `${sg(r.mu, k, dp)}${r.lo != null ? ` [${sg(r.lo, k, dp)}, ${sg(r.hi, k, dp)}]` : ''}${star}`; };
  const m = (ps, mode, f) => mean(ps.map((p) => f(p[mode])));
  const out = []; const P = (s = '') => out.push(s);
  P('# T17 staged balance: matched-seed solo campaigns, today against the candidate (bots; PROPOSED, nothing live changes)\n');
  P(`${all.length} campaigns a mode (${CLASSES.map((k) => `${k} ${all.filter((p) => p.cls === k).length}`).join(', ')}), the wise bot, Normal difficulty, released rules. Unit = the campaign: [..] is a 95% bootstrap over campaigns of the paired difference (candidate minus today); * marks an interval that excludes zero. Fights inside a campaign are dependent, so none of the per-fight numbers is treated as independent. "Retreats" are lost fights that were fought again (up to six tries).\n`);
  const HEAD = '| Group | campaigns | cleared % today | cleared % candidate | cleared diff, points | steps reached | retreats a campaign | first-try win % (all fights) | boss first-try % | elite first-try % | rounds a fight | health lost per won fight, points | gold at the end | level |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const line = (label, ps) => `| ${label} | ${ps.length} | ${(100 * m(ps, 'today', (x) => x.cleared)).toFixed(0)} | ${(100 * m(ps, 'candidate', (x) => x.cleared)).toFixed(0)} | ${cell(ps, (p) => p.candidate.cleared - p.today.cleared, 100, 0)} | ${m(ps, 'today', (x) => x.steps).toFixed(1)} → ${m(ps, 'candidate', (x) => x.steps).toFixed(1)} | ${m(ps, 'today', (x) => x.retreats).toFixed(2)} → ${m(ps, 'candidate', (x) => x.retreats).toFixed(2)} (${cell(ps, (p) => p.candidate.retreats - p.today.retreats, 1, 2)}) | ${(100 * mean(ps.map((p) => p.today.firstTry / p.today.fights))).toFixed(0)} → ${(100 * mean(ps.map((p) => p.candidate.firstTry / p.candidate.fights))).toFixed(0)} (${cell(ps, (p) => p.candidate.firstTry / p.candidate.fights - p.today.firstTry / p.today.fights, 100, 1)}) | ${(100 * m(ps, 'today', (x) => x.bossFirst / (x.bossN || 1))).toFixed(0)} → ${(100 * m(ps, 'candidate', (x) => x.bossFirst / (x.bossN || 1))).toFixed(0)} | ${(100 * m(ps, 'today', (x) => x.eliteFirst / (x.eliteN || 1))).toFixed(0)} → ${(100 * m(ps, 'candidate', (x) => x.eliteFirst / (x.eliteN || 1))).toFixed(0)} | ${m(ps, 'today', (x) => x.rounds / (x.fights || 1)).toFixed(1)} → ${m(ps, 'candidate', (x) => x.rounds / (x.fights || 1)).toFixed(1)} | ${cell(ps, (p) => p.candidate.hpLost - p.today.hpLost, 100, 1)} | ${m(ps, 'today', (x) => x.gold).toFixed(0)} → ${m(ps, 'candidate', (x) => x.gold).toFixed(0)} | ${m(ps, 'today', (x) => x.level).toFixed(1)} → ${m(ps, 'candidate', (x) => x.level).toFixed(1)} |`;
  P(HEAD); for (const k of CLASSES) P(line(k, all.filter((p) => p.cls === k))); P(line('**all classes**', all));
  const fell = (mode) => { const o = {}; for (const p of all) if (p[mode].fell) o[p[mode].fell] = (o[p[mode].fell] || 0) + 1; return Object.entries(o).sort().map(([k2, v]) => `${k2} ×${v}`).join(', ') || 'none'; };
  P(`\nWhere campaigns ended without a clear (act.step): today: ${fell('today')}. Candidate: ${fell('candidate')}.`);
  console.log(out.join('\n'));
}
