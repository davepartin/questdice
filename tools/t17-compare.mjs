// T17 staged balance: the paired tables from tools/t17-stage.mjs output (several part files are merged). Prints markdown.
//   node tools/t17-compare.mjs stage1.json stage2.json ... > report.md
// Every number is a paired difference (candidate minus today) over the same hero, loadout, encounter and fight seed. Intervals are 95% cluster bootstraps
// over heroes (fights of one hero share a build, so they are not independent); with fewer than 4 heroes the interval is not given. Win rates are bot play.
import fs from 'node:fs';
const rows = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const key = (r) => [r.stage, r.group, r.cls, r.heroSeed, r.loadout, r.armour, r.seed].join('|');
const pairs = new Map();
for (const r of rows) { const k = key(r); const p = pairs.get(k) || { k, ...r }; p[r.mode] = r; pairs.set(k, p); }
const all = [...pairs.values()].filter((p) => p.today && p.candidate);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const rng = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; })();
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–'); const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '–');
const sg = (x, d = 1) => (Number.isFinite(x) ? (x >= 0 ? '+' : '') + x.toFixed(d) : '–');
// cluster bootstrap of the mean paired difference of metric m (scaled by `k`)
function diff(ps, m, k = 1) {
  const d = ps.map((p) => (p.candidate[m] - p.today[m]) * k); const mu = mean(d);
  const byHero = new Map(); ps.forEach((p, i) => { const c = `${p.cls}${p.heroSeed}`; (byHero.get(c) || byHero.set(c, []).get(c)).push(d[i]); });
  const cl = [...byHero.values()]; if (cl.length < 4) return { mu, lo: NaN, hi: NaN };
  const B = 1000; const bs = [];
  for (let b = 0; b < B; b++) { let s = 0; let n = 0; for (let i = 0; i < cl.length; i++) { const c = cl[Math.floor(rng() * cl.length)]; for (const v of c) { s += v; n++; } } bs.push(s / n); }
  bs.sort((x, y) => x - y); return { mu, lo: bs[Math.floor(0.025 * B)], hi: bs[Math.floor(0.975 * B)] };
}
const cell = (ps, m, k = 1, d = 1) => { const r = diff(ps, m, k); const sig = Number.isFinite(r.lo) && (r.lo > 0 || r.hi < 0) ? ' *' : ''; return `${sg(r.mu, d)}${Number.isFinite(r.lo) ? ` [${sg(r.lo, d)}, ${sg(r.hi, d)}]` : ''}${sig}`; };
const win = (ps, mode) => 100 * mean(ps.map((p) => p[mode].win));
const row = (label, ps) => `| ${label} | ${ps.length} | ${f1(win(ps, 'today'))} | ${f1(win(ps, 'candidate'))} | ${cell(ps, 'win', 100)} | ${f1(mean(ps.map((p) => p.today.rounds)))} → ${f1(mean(ps.map((p) => p.candidate.rounds)))} | ${cell(ps, 'hpLost', 100)} | ${cell(ps, 'taken')} | ${cell(ps, 'healed')} | ${cell(ps, 'gold')} | ${f1(100 * mean(ps.map((p) => p.candidate.timeout)))} |`;
const HEAD = '| Group | pairs | win % today | win % candidate | win diff, points [95% CI] | rounds | health lost, points | damage taken | healing | gold | timeouts % (cand) |\n|---|---|---|---|---|---|---|---|---|---|---|';
const by = (ps, f) => { const m = new Map(); for (const p of ps) { const k = f(p); (m.get(k) || m.set(k, []).get(k)).push(p); } return m; };
const out = [];
const P = (s = '') => out.push(s);
P('# T17 staged balance: paired fights, today against the candidate faces (bots; PROPOSED, nothing live changes)\n');
P(`${all.length} paired fights (${new Set(all.map((p) => `${p.cls}${p.heroSeed}${p.stage}`)).size} hero snapshots). Differences are candidate minus today over the same hero, loadout, encounter and fight seed; [..] is a 95% cluster bootstrap over heroes; * marks an interval that excludes zero. Damage taken, healing and gold are per fight; health lost is the share of maximum health in points, a lost fight counts as all of it. Timeouts are fights that reached the round cap.\n`);

P('## 1. The approved starters and their alternatives, by class and stage\n');
for (const stage of ['early', 'mid', 'late']) {
  const ps = all.filter((p) => p.stage === stage && p.group === 'starters'); if (!ps.length) continue;
  P(`### ${stage === 'early' ? 'Early: Act I step 3, Bronze d4' : stage === 'mid' ? 'Middle: Act II step 5, Silver d6' : 'Late: Act III step 8, Gold d8'}\n`); P(HEAD);
  for (const [cls, g] of by(ps, (p) => p.cls)) for (const [lo, h] of by(g, (p) => p.loadout)) P(row(`${cls}: ${lo.replace(/quiver:/g, 'arrows ')}`, h));
  P(row('**all starters and alternatives**', ps)); P();
}
P('## 2. Late matrix: the shield loadouts, the pairs and the arrows, every class (Act III step 8, Gold d8)\n'); P(HEAD);
{ const ps = all.filter((p) => p.group === 'matrix'); for (const [lo, g] of by(ps, (p) => p.loadout)) P(row(lo.replace(/quiver:/g, 'arrows '), g));
  const shield = ps.filter((p) => /shield|tower/.test(p.loadout)); const other = ps.filter((p) => !/shield|tower/.test(p.loadout));
  P(row('**the loadouts with a shield**', shield)); P(row('**the loadouts without one**', other)); P(row('**all**', ps)); }
P('\n## 3. Spear, Axe, Dagger and Sword with the Round Shield, under controlled armour\n');
P('Every monster in the encounter gets the stated armour (rolled each round and taken off your blow; "natural" is the encounter as the game builds it). The Spear against the Axe and the Dagger: each weapon\'s candidate against today first, then the gap between weapons (win points, same hero and fight seed), today and candidate.\n');
for (const stage of ['mid', 'late']) {
  P(`### ${stage === 'mid' ? 'Middle: Silver d6' : 'Late: Gold d8'}\n`); P(HEAD);
  const ps = all.filter((p) => p.stage === stage && p.group === 'control');
  for (const arm of ['natural', 'd6', '2d6']) for (const w of ['spear', 'axe', 'dagger', 'sword']) { const g = ps.filter((p) => p.armour === arm && p.loadout === `${w}+shield`); if (g.length) P(row(`armour ${arm}: ${w} + shield`, g)); }
  P('\n| Armour | gap (points of win rate) | today [95% CI] | candidate [95% CI] |\n|---|---|---|---|');
  for (const arm of ['natural', 'd6', '2d6']) for (const [a, b] of [['spear', 'axe'], ['spear', 'dagger'], ['spear', 'sword']]) {
    const A = by(ps.filter((p) => p.armour === arm && p.loadout === `${a}+shield`), (p) => `${p.cls}${p.heroSeed}|${p.seed}`); const B = by(ps.filter((p) => p.armour === arm && p.loadout === `${b}+shield`), (p) => `${p.cls}${p.heroSeed}|${p.seed}`);
    const gap = (mode) => { const g = []; for (const [k, [x]] of A) { const y = B.get(k)?.[0]; if (y) g.push({ cls: x.cls, heroSeed: x.heroSeed, d: 100 * (x[mode].win - y[mode].win) }); } return g; };
    const fmt = (g) => { const m = mean(g.map((x) => x.d)); const cl = new Map(); g.forEach((x) => { const c = `${x.cls}${x.heroSeed}`; (cl.get(c) || cl.set(c, []).get(c)).push(x.d); }); const cs = [...cl.values()]; if (cs.length < 4) return sg(m); const bs = []; for (let i = 0; i < 1000; i++) { let s = 0; let n = 0; for (let j = 0; j < cs.length; j++) { const c = cs[Math.floor(rng() * cs.length)]; for (const v of c) { s += v; n++; } } bs.push(s / n); } bs.sort((x, y) => x - y); const lo = bs[25]; const hi = bs[974]; return `${sg(m)} [${sg(lo)}, ${sg(hi)}]${lo > 0 || hi < 0 ? ' *' : ''}`; };
    P(`| ${arm}: ${a} minus ${b} | | ${fmt(gap('today'))} | ${fmt(gap('candidate'))} |`);
  }
  P();
}
P('## 4. Everything pooled, by stage\n'); P(HEAD);
for (const stage of ['early', 'mid', 'late']) { const ps = all.filter((p) => p.stage === stage); if (ps.length) P(row(stage, ps)); }
P('\n## Notes\n\n- Bots, not people; the same wise bot plays every build, so this compares face tables with each other and says nothing about how a person plays.\n- Heroes are grown by the bot under today\'s faces and then given the stage\'s two weapons; the candidate changes only the weapon faces. Powers, monsters, prices, Heart and Diamonds are as released.\n- Support actions, revives, magic sharing and Heart choices are only what the bot does; party play is in the party report.\n');
console.log(out.join('\n'));
