// T21: the corrected starter (both top weapon dice live) against the old one (the right die locked), same heroes, same seeds, Act I step 2 (The Siege) on Normal.
// Read-only measurement; the sim bot is a greedy plain player. For every class alone, and for two Rangers at a table (what Dave played): wins, rounds, health left, falls.
//   node tools/t21-starters.mjs [fights=40]
process.env.RELEASE = '1';
const E = await import('../js/engine.js'); const SIM = await import('./sim.mjs'); const { smartActs, botShape } = SIM;
const N = Number(process.argv[2] || 40); const CLS = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1); const f0 = (x) => String(Math.round(x));
const mk = (cls, seed, live, name = 'H') => { const h = E.newHero({ name, cls, seed }); h.difficulty = 'normal'; h.campaign.act = 1; h.campaign.step = 2; if (!live) h.dice = h.dice.filter((d) => d !== 'NE'); return h; };
function solo(cls, live, i) { const h = mk(cls, 100 + i, live); const q = E.questsFor(h)[0]; const rng = E.makeRng(500 + i); const b = E.newBattle(h, q, rng, 1); let g = 0; while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); E.resolve(b, smartActs(b)); } return { won: b.outcome === 'victory', rounds: b.round, hp: Math.max(0, b.hp) / b.maxHp }; }
function table(live, i, classes = ['ranger', 'ranger']) { const hs = classes.map((c, k) => { const h = mk(c, 200 + i * 7 + k, live, `P${k}-${c}`); return h; }); const camp = hs[0].campaign; hs.forEach((h) => { h.campaign = structuredClone(camp); });
  const q = E.questsFor(hs[0])[0]; const rng = E.makeRng(900 + i); const b = E.newPartyBattle(hs, q, rng); let g = 0;
  while (!b.outcome && g++ < 60) { for (let k = 0; k < b.fighters.length; k++) { if (!E.startFighter(b, k)) continue; botShape(b, rng); const o = smartActs(b); E.commitFighter(b); const f = b.fighters[k]; f.target = o.target; f.straight = o.straight; f.locked = true; } E.resolveParty(b); for (const f of b.fighters) { f.locked = false; if (f.hp <= 0) f._fell = 1; } }
  return { won: b.outcome === 'victory', rounds: b.round, hp: mean(b.fighters.map((f) => Math.max(0, f.hp) / f.maxHp)), falls: b.fighters.filter((f) => f._fell).length };
}
const rows = [];
for (const cls of CLS) { const r = {}; for (const live of [false, true]) { const x = Array.from({ length: N }, (_, i) => solo(cls, live, i)); r[live ? 'new' : 'old'] = { win: mean(x.map((y) => +y.won)), rounds: mean(x.map((y) => y.rounds)), hp: mean(x.filter((y) => y.won).map((y) => y.hp)) }; } rows.push(['one ' + cls, r]); }
for (const [label, cl] of [['two Rangers', ['ranger', 'ranger']], ['Knight and Bard', ['knight', 'bard']], ['four Rangers', ['ranger', 'ranger', 'ranger', 'ranger']]]) { const r = {}; for (const live of [false, true]) { const x = Array.from({ length: N }, (_, i) => table(live, i, cl)); r[live ? 'new' : 'old'] = { win: mean(x.map((y) => +y.won)), rounds: mean(x.map((y) => y.rounds)), hp: mean(x.filter((y) => y.won).map((y) => y.hp)), falls: mean(x.map((y) => y.falls)) }; } rows.push([label, r]); }
console.log(`Act I step 2, Normal, level 1, ${N} fights per cell (matched seeds). old = right weapon die locked, new = both live.\n`); console.log('| Company | Win % old | Win % new | Rounds old | Rounds new | Health left when won, old | new | Heroes down per fight, old | new |\n|---|---|---|---|---|---|---|---|---|');
for (const [label, r] of rows) console.log(`| ${label} | ${f0(100 * r.old.win)} | ${f0(100 * r.new.win)} | ${r.old.rounds.toFixed(1)} | ${r.new.rounds.toFixed(1)} | ${f0(100 * r.old.hp)}% | ${f0(100 * r.new.hp)}% | ${r.old.falls != null ? r.old.falls.toFixed(2) : '-'} | ${r.new.falls != null ? r.new.falls.toFixed(2) : '-'} |`);
