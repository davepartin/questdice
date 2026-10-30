// T17 equipment comparison, Spear candidate (Director handoff, 25 Oct 2026, items 1, 2 and 6). Bots on the real engine; nothing in the game changes.
//   node tools/t17-spear.mjs [fights=200] [out=/tmp/t17-spear.md]
// Same hero shell, same encounters, same seeds; only the Spear's faces change (through WEAPON_SIZE.ladder, the isolated T17 face table).
// Base profile and icons are crossed so one can be read without the other:
//   base:  released (today's Spear)  |  steady (no blank, a lower top, the same red and blue totals)
//   icons: none  |  released (today's metal rule: pierce on Silver half the live faces, Gold every live face)  |  spear (pierce 1 on every red face at Silver and Gold, a crit on the top red face, nothing on blue)
// Bronze never has icons. Armor: the ogre family has the same health with and without armor (ogre, treant 1d6, direbear 1d4); Act I uses goblins and shieldbearers.
// Red is attack, blue is block; they are reported apart. Uncertainty is a 95% interval on the mean of the matched differences from the released Spear
// (same seed, same foes), not a blanket figure. The seed matches the opening monster rolls only; the dice diverge after round one, so the interval
// is wide where fights are long, and the tool prints the pairing correlation so that is visible.
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const { smartActs, botShape } = await import('./sim.mjs');
const N = +process.argv[2] || 200; const OUT = process.argv[3] || '/tmp/t17-spear.md';
D.EXPERIMENT.weaponSize = true; D.WEAPON_SIZE.ladder = {};
const METAL = ['Bronze', 'Silver', 'Gold'];
// ---- faces
const parse = (s) => s.split(' ').map((t) => ({ v: +t.slice(1), c: t[0] === 'B' ? 'b' : 'r' }));
const RELEASED = D.WEAPONS2.faces.spear; // d4..d10 strings
// the steady base: the same red total and the same single blue 3 as today's Spear, no blank, a lower top (the table in the report shows the totals)
const STEADY = { 4: 'R1 R1 B3 R3', 6: 'R1 R1 R2 B3 R4 R4', 8: 'R1 R2 R3 R3 B3 R4 R5 R6', 10: 'R1 R2 R2 R3 B3 R4 R6 R7 R8 R8' };
const clone = (list) => list.map((f) => (f.fx ? { ...f, fx: { ...f.fx } } : { ...f }));
// the engine's metalIcons is private, so its ordering rule is reproduced here and checked against the engine on the released base (self-test below)
const KINDS = (() => { const def = D.WEAPONS.spear; const k = [...new Set([...(def.faces || []).flatMap((f) => Object.keys(f.fx || {})), ...(def.bonus || []).flatMap((x) => Object.keys(x.fx))])]; return k.length ? k : ['pierce']; })();
function applyReleased(b, tier) {
  const f = clone(b);
  const live = f.map((x, k) => ({ x, k })).filter((o) => o.x.v > 0 && (o.x.c === 'r' || tier >= 2)).sort((a, c) => (a.x.c === 'r' ? 0 : 1) - (c.x.c === 'r' ? 0 : 1) || c.x.v - a.x.v || c.k - a.k);
  const n = live.length; const count = Math.min(n, tier >= 2 ? n : Math.max(2, Math.ceil(n / 2))); const crit = [1, 2, 3][tier];
  live.forEach((o, i) => { if (i < count) o.x.fx = { [KINDS[i % KINDS.length]]: i === 0 ? crit : 1 }; });
  return f;
}
function spearIcons(b, tier) { // pierce on every red face that has a number; the top red face is a crit of tier+1
  const f = clone(b); const reds = f.map((x, k) => ({ x, k })).filter((o) => o.x.c === 'r' && o.x.v > 0).sort((a, c) => c.x.v - a.x.v || c.k - a.k);
  reds.forEach((o, i) => { o.x.fx = { pierce: i === 0 ? tier + 1 : 1 }; }); return f;
}
const variant = (base, icons, tier, size) => {
  const b = parse(base === 'released' ? RELEASED[size] : STEADY[size]);
  if (icons === 'none' || tier === 0) return b;
  return icons === 'released' ? applyReleased(b, tier) : spearIcons(b, tier);
};
for (const tier of [1, 2]) for (const size of [4, 6, 8, 10]) { // self-test against the engine's own released Spear
  D.WEAPON_SIZE.ladder = {}; const eng = E.weaponFaces(E.makeWeapon('spear', tier, () => 0.5, size), size); const mine = applyReleased(parse(RELEASED[size]), tier);
  const key = (l) => JSON.stringify(l.map((x) => [x.v, x.c, x.fx || null]));
  if (key(eng) !== key(mine)) throw new Error(`released icon rule mismatch ${METAL[tier]} d${size}: ${key(eng)} vs ${key(mine)}`);
}
// ---- statistics
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const corr = (a, b) => { const ma = mean(a); const mb = mean(b); const sa = sd(a); const sb = sd(b); return sa && sb ? a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0) / (a.length - 1) / (sa * sb) : 0; };
// ---- encounters
const ENC = [ // [label, act, step, level, die size, metal, foes[]]
  ['Act I, Bronze d4, goblins (no armor)', 1, 2, 2, 4, 0, ['goblin', 'goblin']], ['Act I, Bronze d4, shieldbearers (armor 1d6)', 1, 2, 2, 4, 0, ['shieldbearer', 'shieldbearer']],
  ['Act II, Silver d6, ogre (no armor)', 2, 5, 5, 6, 1, ['ogre']], ['Act II, Silver d6, treant (armor 1d6)', 2, 5, 5, 6, 1, ['treant']], ['Act II, Silver d6, direbear (armor 1d4)', 2, 5, 5, 6, 1, ['direbear']],
  ['Act III, Gold d8, ogre (no armor)', 3, 8, 8, 8, 2, ['ogre']], ['Act III, Gold d8, treant (armor 1d6)', 3, 8, 8, 8, 2, ['treant']], ['Act III, Gold d8, direbear (armor 1d4)', 3, 8, 8, 8, 2, ['direbear']]];
if (process.env.HARD) for (const e of ENC.splice(2)) { e[0] = e[0].replace(/ogre|treant|direbear/, (m) => `two ${m}s`); e[6] = [...e[6], ...e[6]]; ENC.push(e); } // HARD=1: the same Acts II and III foes, two of them (Act I is dropped by ONLY)
const mkw = (id, tier, size) => E.makeWeapon(id, tier, () => 0.5, size);
function fight(setup, enc, seed) {
  const [, act, step, level, size, metal, foes] = enc;
  const h = E.newHero({ name: 'T', cls: 'knight', seed: 11 }); h.level = level; h.campaign.act = act; h.campaign.step = step; h.strength = { W: size, E: size };
  h.loadout.NW = mkw(setup.id, metal, size); h.loadout.NE = mkw('shield', metal, size); if (!h.dice.includes('NE')) h.dice.push('NE');
  D.WEAPON_SIZE.ladder = setup.faces ? { spear: { [METAL[metal]]: { [size]: setup.faces(metal, size) } } } : {};
  const q = { ...E.questsFor(h)[0], enemies: foes }; const rng = E.makeRng(seed); const b = E.newBattle(h, q, rng, 1); const hp0 = b.enemies.reduce((s, e) => s + e.maxHp, 0);
  let taken = 0, red = 0, pierce = 0, blue = 0, g = 0;
  while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); E.resolve(b, smartActs(b)); const r = b.report; taken += r?.taken || 0; red += r?.T?.atk || 0; pierce += r?.T?.pierce || 0; blue += r?.T?.block || 0; }
  const left = b.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0); const R = Math.max(1, b.round); const won = b.outcome === 'victory';
  return { win: won ? 1 : 0, rounds: b.round, left: won ? Math.max(0, b.hp) / b.maxHp : 0, dealtPR: (hp0 - left) / R, takenPR: taken / R, redPR: red / R, piercePR: pierce / R, bluePR: blue / R };
}
const VAR = (base, icons) => ({ key: `${base} base, ${icons} icons`, id: 'spear', faces: (tier, size) => variant(base, icons, tier, size) });
const REF = [['Sword (released)', 'sword'], ['Dagger (released)', 'dagger'], ['Axe (released)', 'axe']].map(([key, id]) => ({ key, id, faces: null }));
const METRICS = [['win', 'Win %', 100, 0], ['dealtPR', 'Damage dealt / round', 1, 1], ['takenPR', 'Damage taken / round', 1, 1], ['redPR', 'Red attack rolled / round', 1, 1], ['piercePR', 'Pierce rolled / round', 1, 1], ['bluePR', 'Blue block rolled / round', 1, 1], ['rounds', 'Rounds', 1, 1], ['left', 'Health left when won %', 100, 0]];
const fmt = (x, k) => (k ? x.toFixed(k) : String(Math.round(x))); const sgn = (x, k) => (x >= 0 ? '+' : '−') + fmt(Math.abs(x), k);
let md = `# T17 Spear candidate, matched measurement (bots, ${N} matched fights per cell, released rules, nothing in the game changes)\n\nTool: tools/t17-spear.mjs. Knight shell, Round Shield in the other hand, strength set to the weapon's size, hero level and act per encounter. Only the left-hand weapon changes between rows. **Red (attack), pierce and blue (block) are reported separately; nothing here is "average hit".** Intervals are 95% on the mean of the matched differences from today's Spear (same seed, same foes); r is the correlation between the two rows' fights, which shows how much the matching helps (the opening monster rolls match, the dice diverge from round one, so it is small and the interval is close to an unpaired one for fight-length measures). One hero shell, bots, one fight at a time: this cannot validate the cumulative ladder, other classes, party play or human play.\n`;
md += `\n## Faces (analytic, per roll of the die by itself)\n\nRed and blue are the mean face value of that colour over all faces; blanks are faces showing 0; peak is the biggest number.\n\n| Size | Base | Red mean | Blue mean | Blanks | Peak | Red total / blue total |\n|---|---|---|---|---|---|---|\n`;
for (const size of [4, 6, 8, 10]) for (const [name, s] of [['released', RELEASED[size]], ['steady', STEADY[size]]]) {
  const f = parse(s); const red = f.filter((x) => x.c === 'r'); const blue = f.filter((x) => x.c === 'b'); const tot = (l) => l.reduce((a, x) => a + x.v, 0);
  md += `| d${size} | ${name} | ${(tot(red) / f.length).toFixed(2)} | ${(tot(blue) / f.length).toFixed(2)} | ${f.filter((x) => x.v === 0).length}/${f.length} | ${Math.max(...f.map((x) => x.v))} | ${tot(red)} / ${tot(blue)} |\n`;
}
md += `\nPierce icon points per roll on the released base (the number on the face is unchanged by icons):\n\n| Size | Metal | released icons | spear icons (pierce on every red face) |\n|---|---|---|---|\n`;
const ip = (l) => l.reduce((a, x) => a + (x.fx?.pierce || 0), 0) / l.length;
for (const size of [6, 8]) for (const tier of [1, 2]) md += `| d${size} | ${METAL[tier]} | ${ip(applyReleased(parse(RELEASED[size]), tier)).toFixed(2)} | ${ip(spearIcons(parse(RELEASED[size]), tier)).toFixed(2)} |\n`;
const icons = ['none', 'released', 'spear']; const full = ['released', 'steady'].flatMap((b) => icons.map((i) => VAR(b, i)));
const groups = { 0: [VAR('released', 'none'), VAR('steady', 'none')], 1: full, 2: full };
const all = {};
const PICK = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; // ONLY=0,1 runs those encounters (to split the work across processes)
for (const [ei, enc] of ENC.entries()) {
  if (PICK && !PICK.includes(ei)) continue;
  const metal = enc[5]; const vars = groups[metal]; const cells = [...vars, ...REF];
  const base = vars.find((v) => v.key === (metal === 0 ? 'released base, none icons' : 'released base, released icons'));
  const data = {}; for (const c of cells) { data[c.key] = []; for (let i = 0; i < N; i++) data[c.key].push(fight(c, enc, 5000 + i)); }
  const ref = data[base.key]; all[enc[0]] = {};
  md += `\n## ${enc[0]}\n\nThe control row (today's Spear${metal ? ' with its released icons' : ''}) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.\n\n| Left-hand weapon | ${METRICS.map((m) => m[1]).join(' | ')} |\n|---|${METRICS.map(() => '---').join('|')}|\n`;
  for (const c of cells) {
    const row = METRICS.map(([k, , mult, dp]) => {
      const xs = data[c.key].map((r) => r[k] * mult); const rs = ref.map((r) => r[k] * mult);
      if (c.key === base.key) return fmt(mean(xs), dp);
      const d = xs.map((x, i) => x - rs[i]);
      return `${fmt(mean(xs), dp)} (${sgn(mean(d), dp)} ± ${fmt(1.96 * sd(d) / Math.sqrt(N), dp)}, r ${corr(xs, rs).toFixed(2)})`;
    });
    md += `| ${c.key === base.key ? `**control: ${c.key}**` : c.key} | ${row.join(' | ')} |\n`;
    all[enc[0]][c.key] = Object.fromEntries(METRICS.map(([k, , mult]) => [k, mean(data[c.key].map((r) => r[k] * mult))]));
  }
  process.stderr.write(`done ${enc[0]}\n`);
}
fs.writeFileSync(OUT, md); fs.writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(all, null, 1)); console.log(md.length, 'chars ->', OUT);
