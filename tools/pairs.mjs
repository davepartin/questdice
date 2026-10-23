// Matched campaigns, compared (the six-player experiment, 23 Oct 2026). Each arm of tools/party.mjs ran the same companies on the
// same seeds (OUT=file.json); the difference is taken inside each campaign, then averaged, with its standard error across campaigns.
//   node tools/pairs.mjs base.json arm1.json [arm2.json ...]
import fs from 'node:fs';
const [base, ...arms] = process.argv.slice(2).map((f) => ({ f, ...JSON.parse(fs.readFileSync(f, 'utf8')) }));
const rate = (c, k) => {
  if (k === 'battles') return c.bn ? c.bw / c.bn : NaN;
  if (k === 'falls') return c.heroFights ? c.falls / c.heroFights : NaN;
  if (k === 'hpLeft') return c.bw ? c.hpLeft / c.bw : NaN;
  if (k === 'rounds') return c.bn ? c.rounds / c.bn : NaN;
  if (k === 'bosses') return c.bossN ? c.bossW / c.bossN : NaN;
  if (k === 'elites') return c.eliteN ? c.eliteW / c.eliteN : NaN;
  return NaN;
};
const KEYS = [['battles', 'battles won first try', true], ['falls', 'hero-fights where the hero fell (battles)', true], ['hpLeft', 'health left after a won battle', true], ['rounds', 'rounds a battle', false], ['bosses', 'bosses won first try', true], ['elites', 'elites won first try', true]];
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const fmt = (k, pc, x) => (pc ? pct(x) : x.toFixed(2));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const se = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1) / a.length); };
const keys = Object.keys(base.camps);
console.log(`Base: ${base.f} (${keys.length} campaigns)`);
for (const [k, label, pc] of KEYS) { const v = keys.map((c) => rate(base.camps[c], k)).filter((x) => !Number.isNaN(x)); console.log(`  ${label.padEnd(44)} ${fmt(k, pc, mean(v))} ± ${fmt(k, pc, se(v))}`); }
for (const a of arms) {
  const shared = keys.filter((c) => a.camps[c]);
  console.log(`\n${a.f}: ${JSON.stringify(a.soft)} · ${shared.length} matched campaigns`);
  for (const [k, label, pc] of KEYS) {
    const v = shared.map((c) => rate(a.camps[c], k)); const d = shared.map((c) => rate(a.camps[c], k) - rate(base.camps[c], k)).filter((x) => !Number.isNaN(x));
    const better = d.filter((x) => (k === 'falls' || k === 'rounds' ? x < 0 : x > 0)).length;
    console.log(`  ${label.padEnd(44)} ${fmt(k, pc, mean(v.filter((x) => !Number.isNaN(x))))}   change ${d.length ? `${mean(d) >= 0 ? '+' : ''}${fmt(k, pc, mean(d))} ± ${fmt(k, pc, se(d))}` : '-'} (${k === 'rounds' ? 'shorter' : 'better'} in ${better} of ${d.length})`);
  }
}
