// T19: late-Act-III pacing across classes (read-only measurement; nothing in the game changes).
//   node tools/t19-fights.mjs [seedsPerClass]      Writes a markdown summary to stdout and raw rows to /tmp/t19/rows.json
// For each class: the sim bot plays a campaign to Act III step 8 under the released rules (a greedy camp, not a perfect player), then the SAME hero
// fights each scenario from identical copies: the step-8 fight as designed; the nemesis return that Dave met (Vharaxis wounded at step 5 comes back
// with the Call-for-Help pair); the same return with the nemesis held to the designed Vharaxis health (a counterfactual); and the designed step 5 elite and
// step 10 boss. Per fight it records rounds, rounds against the boss alone, rounds the boss does not attack, hero lows, potions and heal presses.
process.env.RELEASE = '1';
const SIM = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js');
const { fight, campaign, smartActs, botShape } = SIM;
const SEEDS = Number(process.argv[2] || 12);
const CLASSES = Object.keys(D.CLASSES);
const rows = [];
const attackingMove = (e) => e && (e.intent?.v === 'strike' || e.intent?.v === 'breath' || (e.intent?.f || 0) > 0 || e.intent?.slam);
function play(hero, quest, seed, tweak) {
  const rng = E.makeRng(seed); const h = structuredClone(hero); const b = E.newBattle(h, quest, rng, 1); if (tweak) tweak(b);
  const r = { enemyHp: b.enemies.reduce((a, e) => a + e.hp, 0), enemyMax: b.enemies.reduce((a, e) => a + e.maxHp, 0), rounds: 0, bossOnly: 0, bossIdle: 0, bossOnlyIdle: 0, heals: 0, healRounds4: 0, minHp: b.hp, potions0: b.potions, magicSpent: 0 };
  let guard = 0;
  while (!b.outcome && guard++ < 80) {
    const alive = b.enemies.filter((e) => e.hp > 0); const bossAlive = alive.some((e) => e.tier === 'boss'); const only = bossAlive && alive.length === 1;
    E.startRoll(b); botShape(b, rng); const m0 = b.magic; const acts = smartActs(b); const hr = b.healsRound || 0; r.heals += hr; if (hr >= 4) r.healRounds4++;
    const boss = b.enemies.find((e) => e.tier === 'boss' && e.hp > 0); const idle = boss ? !attackingMove(boss) : false;
    r.rounds++; if (only) { r.bossOnly++; if (idle) r.bossOnlyIdle++; } if (idle) r.bossIdle++;
    E.resolve(b, acts); r.magicSpent += Math.max(0, m0 - b.magic); r.minHp = Math.min(r.minHp, b.hp);
  }
  r.outcome = b.outcome || 'timeout'; r.potionsUsed = r.potions0 - (b.potions ?? 0); r.endHpShare = b.hp / b.maxHp;
  return r;
}
const nemQuest = (hero, wound = 0.3) => { const h = structuredClone(hero); const c = h.campaign; c.step = 8; c.nemeses = [{ id: 'vharaxis', name: D.MONSTERS.vharaxis.name, scar: 'blade', wound, act: 3, step: 5, grudge: 0, bounty: 1.5 }]; c.nextPlace = 'Wyrmwatch'; c.nextEnemies = ['gloomstalker', 'dirgesinger']; return { h, q: E.questsFor(h)[0] }; };
const designedBoss = (hero, step) => { const h = structuredClone(hero); h.campaign.step = step; h.campaign.nemeses = []; h.campaign.nextEnemies = null; h.campaign.nextPlace = null; return { h, q: E.questsFor(h)[0] }; };
let made = 0;
const fs = await import('node:fs'); const CACHE = `/tmp/t19/heroes-${SEEDS}.json`; fs.mkdirSync('/tmp/t19', { recursive: true });
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
for (const cls of CLASSES) for (let s = 0; s < SEEDS; s++) {
  const seed = 9000 + s * 7; const ck = `${cls}:${seed}`;
  if (!(ck in cache)) { let res; try { res = campaign(cls, seed, 2.7); } catch (e) { res = null; } cache[ck] = res && res.log.length >= 27 && res.log[res.log.length - 1].outcome === 'victory' ? res.hero : null; fs.writeFileSync(CACHE, JSON.stringify(cache)); }
  if (!cache[ck]) continue; made++;
  const hero = cache[ck]; hero.campaign.step = 8;
  const base = { cls, seed, level: hero.level, hp: E.maxHpOf(hero), weapons: Object.values(hero.loadout).filter(Boolean).map((w) => `${w.id}${w.rarity}`).join('+') };
  const sc = {};
  { const h = structuredClone(hero); h.campaign.nemeses = []; h.campaign.nextEnemies = null; h.campaign.nextPlace = null; sc.step8 = play(h, E.questsFor(h)[0], seed + 1); }
  { const { h, q } = nemQuest(hero); sc.nemesis = play(h, q, seed + 2); sc.nemesis.bossMax = E.newBattle(structuredClone(h), q, E.makeRng(1), 1).enemies.find((e) => e.tier === 'boss')?.maxHp; }
  { const { h, q } = nemQuest(hero); // counterfactual: the returning Vharaxis keeps its designed (step 10 boss) maximum health and the same wound
    const des = designedBoss(hero, 10); const dmax = E.newBattle(structuredClone(des.h), des.q, E.makeRng(1), 1).enemies[0].maxHp;
    sc.nemesisDesigned = play(h, q, seed + 2, (b) => { const v = b.enemies.find((e) => e.tier === 'boss'); const frac = v.hp / v.maxHp; v.maxHp = dmax; v.hp = Math.round(dmax * frac); }); sc.nemesisDesigned.bossMax = dmax; }
  const eliteMax = Math.round(D.MONSTERS.vharaxis.hp * (1 + D.STEP_HP * 7) * D.SET_PIECE.elite.hp[2]); // the designed elite scaling at step 8: 636
  const holdBoss = (b) => { const v = b.enemies.find((e) => e.tier === 'boss'); const frac = v.hp / v.maxHp; v.maxHp = eliteMax; v.hp = Math.round(eliteMax * frac); };
  { const { h, q } = nemQuest(hero); sc.optA = play(h, q, seed + 7, holdBoss); sc.optA.bossMax = eliteMax; }
  { const { h, q } = nemQuest(hero); sc.optB = play(h, { ...q, enemies: ['vharaxis', 'gloomstalker'] }, seed + 8, holdBoss); }
  { const { h, q } = nemQuest(hero); sc.optC = play(h, { ...q, enemies: ['vharaxis'] }, seed + 9, holdBoss); }
  { const { h, q } = nemQuest(hero); h.campaign.nextEnemies = null; h.campaign.nextPlace = null; const qq = E.questsFor(h)[0]; sc.nemesisPlusStep8 = play(h, qq, seed + 5); }
  { const { h, q } = nemQuest(hero); const solo = { ...q, enemies: ['vharaxis'] }; sc.nemesisAlone = play(h, solo, seed + 6); }
  { const { h, q } = designedBoss(hero, 5); sc.elite5 = play(h, q, seed + 3); }
  { const { h, q } = designedBoss(hero, 10); sc.boss10 = play(h, q, seed + 4); }
  rows.push({ ...base, sc });
}
import('node:fs').then((fs) => { fs.mkdirSync('/tmp/t19', { recursive: true }); fs.writeFileSync('/tmp/t19/rows.json', JSON.stringify(rows)); });
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const fmt = (x) => (Math.round(x * 10) / 10).toFixed(1);
const names = { optA: 'Option A: nemesis at its designed elite health (636 max), both foes kept', optB: 'Option B: nemesis at 636 max plus one foe', optC: 'Option C: nemesis at 636 max alone', nemesisPlusStep8: 'Nemesis return on the designed step 8 pair (no Call for Help)', nemesisAlone: 'Nemesis return alone (no other foes)', step8: 'Step 8 as designed (no nemesis)', nemesis: 'Nemesis return (as Dave met it)', nemesisDesigned: 'Nemesis return, boss held to its designed health', elite5: 'Step 5 elite Vharaxis (designed)', boss10: 'Step 10 boss Vharaxis (designed)' };
const out = [`# T19 measurement: late Act III fights (${made} heroes reached step 8 under the sim bot; ${CLASSES.length} classes)`, '', '| Scenario | Fights | Win % | Rounds mean | p50 | p90 | max | Boss-only rounds mean | Boss rounds with no attack (of boss-only) | Heal presses per fight | Fights with 4+ heals in a round | Lowest HP share mean | Potions used | Enemy health at start (mean) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const k of Object.keys(names)) {
  const f = rows.map((r) => r.sc[k]); const rd = f.map((x) => x.rounds);
  out.push(`| ${names[k]} | ${f.length} | ${fmt(100 * f.filter((x) => x.outcome === 'victory').length / f.length)} | ${fmt(mean(rd))} | ${q(rd, 0.5)} | ${q(rd, 0.9)} | ${Math.max(...rd)} | ${fmt(mean(f.map((x) => x.bossOnly)))} | ${fmt(mean(f.map((x) => x.bossOnlyIdle)))} | ${fmt(mean(f.map((x) => x.heals)))} | ${fmt(100 * f.filter((x) => x.healRounds4 > 0).length / f.length)}% | ${fmt(mean(f.map((x) => x.minHp / 1)))} | ${fmt(mean(f.map((x) => x.potionsUsed)))} | ${Math.round(mean(f.map((x) => x.enemyHp)))} of ${Math.round(mean(f.map((x) => x.enemyMax)))} max |`);
}
out.push('', '## By class: rounds (mean) in the nemesis return and at the designed boss', '', '| Class | Heroes | Nemesis return rounds | Win % | Designed boss rounds | Win % | Boss-only rounds in the return | Heal presses in the return |', '|---|---|---|---|---|---|---|---|');
for (const cls of CLASSES) { const rs = rows.filter((r) => r.cls === cls); if (!rs.length) continue; const n = rs.map((r) => r.sc.nemesis); const bo = rs.map((r) => r.sc.boss10);
  out.push(`| ${cls} | ${rs.length} | ${fmt(mean(n.map((x) => x.rounds)))} | ${fmt(100 * n.filter((x) => x.outcome === 'victory').length / n.length)} | ${fmt(mean(bo.map((x) => x.rounds)))} | ${fmt(100 * bo.filter((x) => x.outcome === 'victory').length / bo.length)} | ${fmt(mean(n.map((x) => x.bossOnly)))} | ${fmt(mean(n.map((x) => x.heals)))} |`); }
console.log(out.join('\n'));
