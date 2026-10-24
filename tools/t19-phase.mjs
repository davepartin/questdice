// T19 part 2a: the risky opening against the sustained boss-only phase (read-only measurement; nothing in the game changes).
//   node tools/t19-phase.mjs [seedsPerClass=9]      markdown to stdout, rows to /tmp/t19/phase.json
// Same heroes and scenarios as t19-fights.mjs (the bot's campaign heroes at Act III step 8). For every fight it records, each round: the hero's health,
// the foes' health, who is alive, whether the boss attacks, damage taken, heals pressed. Then, for won fights, the round at which the outcome is
// "secure": the first round from which the hero never again ends a round below 40% of maximum health (retrospective, so it is a measure of when the
// fight WAS safe, not something a player could know). Rounds after that are the safe final grind. "Pressured" rounds (a hit of 15%+ of maximum
// health, or a round ended below half health) are the rounds where the player still has a real decision about defence or healing.
process.env.RELEASE = '1';
const SIM = await import('./sim.mjs'); const E = await import('../js/engine.js'); const D = await import('../js/data.js');
const fs = await import('node:fs');
const { smartActs, botShape } = SIM;
const SEEDS = Number(process.argv[2] || 9); const CLASSES = Object.keys(D.CLASSES);
const cache = JSON.parse(fs.readFileSync(`/tmp/t19/heroes-${SEEDS}.json`, 'utf8'));
const attacking = (e) => e && (e.intent?.v === 'strike' || e.intent?.v === 'breath' || (e.intent?.f || 0) > 0 || e.intent?.slam);
function play(hero, quest, seed, tweak) {
  const rng = E.makeRng(seed); const b = E.newBattle(structuredClone(hero), quest, rng, 1); if (tweak) tweak(b);
  const rows = []; let guard = 0; const max = b.maxHp;
  while (!b.outcome && guard++ < 80) {
    const alive = b.enemies.filter((e) => e.hp > 0); const boss = alive.find((e) => e.tier === 'boss');
    E.startRoll(b); botShape(b, rng); const acts = smartActs(b); const heals = b.healsRound || 0; const hp0 = b.hp; const foe0 = alive.reduce((a, e) => a + e.hp, 0);
    const idle = boss ? !attacking(boss) : false;
    E.resolve(b, acts);
    rows.push({ hp0, hp1: Math.max(0, b.hp), taken: Math.max(0, hp0 - b.hp), alive: alive.length, bossOnly: !!boss && alive.length === 1, boss: !!boss, idle, heals, foe0, bossHp: boss ? boss.hp : 0, bossMax: boss ? boss.maxHp : 0 });
  }
  return { outcome: b.outcome || 'timeout', max, rows };
}
const nemQuest = (hero, wound = 0.3) => { const h = structuredClone(hero); const c = h.campaign; c.step = 8; c.nemeses = [{ id: 'vharaxis', name: D.MONSTERS.vharaxis.name, scar: 'blade', wound, act: 3, step: 5, grudge: 0, bounty: 1.5 }]; c.nextPlace = 'Wyrmwatch'; c.nextEnemies = ['gloomstalker', 'dirgesinger']; return { h, q: E.questsFor(h)[0] }; };
const designed = (hero, step) => { const h = structuredClone(hero); h.campaign.step = step; h.campaign.nemeses = []; h.campaign.nextEnemies = null; h.campaign.nextPlace = null; return { h, q: E.questsFor(h)[0] }; };
const eliteMax = Math.round(D.MONSTERS.vharaxis.hp * (1 + D.STEP_HP * 7) * D.SET_PIECE.elite.hp[2]);
const holdBoss = (b) => { const v = b.enemies.find((e) => e.tier === 'boss'); const f = v.hp / v.maxHp; v.maxHp = eliteMax; v.hp = Math.round(eliteMax * f); };
const SC = {
  'Nemesis return as Dave met it (boss 1,002 max + two foes)': (h, s) => { const { h: hh, q } = nemQuest(h); return play(hh, q, s + 2); },
  'Nemesis return alone (boss 1,002 max)': (h, s) => { const { h: hh, q } = nemQuest(h); return play(hh, { ...q, enemies: ['vharaxis'] }, s + 6); },
  'Designed step 10 boss (690 max)': (h, s) => { const { h: hh, q } = designed(h, 10); return play(hh, q, s + 4); },
  'Option B: nemesis at 636 max plus one foe': (h, s) => { const { h: hh, q } = nemQuest(h); return play(hh, { ...q, enemies: ['vharaxis', 'gloomstalker'] }, s + 8, holdBoss); },
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const out = {}; const lines = [`# T19 part 2a: opening against boss-only phase (${SEEDS * CLASSES.length} hero slots; bot heroes, released rules)`, ''];
for (const [name, fn] of Object.entries(SC)) {
  const fights = [];
  for (const cls of CLASSES) for (let s = 0; s < SEEDS; s++) { const seed = 9000 + s * 7; const hero = cache[`${cls}:${seed}`]; if (!hero) continue; hero.campaign.step = 8; fights.push({ cls, ...fn(hero, seed) }); }
  const won = fights.filter((f) => f.outcome === 'victory'); const A = [];
  for (const f of won) {
    const r = f.rows; const n = r.length; let sec = n; // first round index from which every end-of-round health is >= 40% of maximum
    for (let i = n - 1; i >= 0; i--) { if (r[i].hp1 / f.max >= 0.4 && r[i].hp0 / f.max >= 0.4) sec = i; else break; }
    const after = r.slice(sec); const firstBossOnly = r.findIndex((x) => x.bossOnly); const pressured = (x) => x.taken >= 0.15 * f.max || x.hp1 < 0.5 * f.max;
    A.push({ n, sec, after: after.length, afterShare: after.length / n, bossOnlyFrom: firstBossOnly < 0 ? null : firstBossOnly, openRounds: r.filter((x) => x.boss && !x.bossOnly).length, bossOnlyRounds: r.filter((x) => x.bossOnly).length,
      secBossShare: sec < n ? r[sec].bossHp / (r[sec].bossMax || 1) : 0, afterPressured: after.filter(pressured).length, afterIdle: after.filter((x) => x.idle).length, afterDmg: after.reduce((a, x) => a + x.taken, 0) / f.max, afterHeals: after.reduce((a, x) => a + x.heals, 0),
      beforeHeals: r.slice(0, sec).reduce((a, x) => a + x.heals, 0), healsIdle: r.filter((x) => x.idle).reduce((a, x) => a + x.heals, 0), healsAtk: r.filter((x) => x.boss && !x.idle).reduce((a, x) => a + x.heals, 0), idleRounds: r.filter((x) => x.boss && x.idle).length, atkRounds: r.filter((x) => x.boss && !x.idle).length,
      dmgIdle: mean(r.filter((x) => x.idle).map((x) => x.taken / f.max)), dmgAtk: mean(r.filter((x) => x.boss && !x.idle).map((x) => x.taken / f.max)) });
  }
  const lost = fights.filter((f) => f.outcome !== 'victory');
  out[name] = { fights: fights.length, won: won.length, A, lostRounds: lost.map((f) => f.rows.length), allRounds: fights.map((f) => f.rows.length) };
  const ar = fights.map((f) => f.rows.length);
  lines.push(`## ${name}`, '', `Fights ${fights.length}, won ${won.length} (${f1(100 * won.length / fights.length)}%); rounds p50/p90/max ${pct(ar, 0.5)}/${pct(ar, 0.9)}/${Math.max(...ar)}; lost fights end after ${f1(mean(lost.map((f) => f.rows.length)))} rounds on average.`, '');
  if (A.length) lines.push(`Won fights (${A.length}): rounds with the boss and another foe standing (the opening) ${f1(mean(A.map((a) => a.openRounds)))}; boss alone ${f1(mean(A.map((a) => a.bossOnlyRounds)))}; **outcome secure from round ${f1(mean(A.map((a) => a.sec + 1)))}** of ${f1(mean(A.map((a) => a.n)))}, leaving **${f1(mean(A.map((a) => a.after)))} rounds (${f1(100 * mean(A.map((a) => a.afterShare)))}% of the fight)** after the point where the hero never again ends below 40%; the boss still has ${f1(100 * mean(A.map((a) => a.secBossShare)))}% of its health at that point. In those safe rounds: ${f1(mean(A.map((a) => a.afterPressured)))} rounds with a 15%+ hit or an end below half (the rest need no defensive decision), ${f1(mean(A.map((a) => a.afterIdle)))} boss rounds with no attack, damage taken ${f1(100 * mean(A.map((a) => a.afterDmg)))}% of maximum health in total, ${f1(mean(A.map((a) => a.afterHeals)))} heal presses (against ${f1(mean(A.map((a) => a.beforeHeals)))} before). Telegraphed rounds: the boss did not attack in ${f1(mean(A.map((a) => a.idleRounds)))} of ${f1(mean(A.map((a) => a.idleRounds + a.atkRounds)))} of its rounds; the bot pressed ${f1(mean(A.map((a) => a.healsIdle)))} heals in those and ${f1(mean(A.map((a) => a.healsAtk)))} in the attacking rounds; mean damage taken in an idle round ${f1(100 * mean(A.map((a) => a.dmgIdle)))}% of maximum, in an attacking round ${f1(100 * mean(A.map((a) => a.dmgAtk)))}%.`, '');
}
console.log(lines.join('\n'));
fs.writeFileSync('/tmp/t19/phase.json', JSON.stringify(out));
