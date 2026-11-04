// T29 (Dave, 4 Nov 2026): the six-weapon plan against today's weapons. Measurement only; EXPERIMENT.weapons3 is off in the game.
//   node tools/t29-weapons.mjs [fights per step = 6] [out = /tmp/t29.md]
// Part 1, one throw: a Knight with the weapon in the left hand and the Round Shield of the same plan/metal/size in the right (the Staff
// takes both hands); 6000 throws each, no rerolls or powers: what each weapon adds to a throw (attack, pierce, block, heal, magic,
// gold, splash), how often it lands a triple, and how wide its swings are.
// Part 2, real fights: the same hero, its dice grown to the weapon's size, plays that act's story fights with the smart bot.
import fs from 'node:fs';
import { applyRelease } from '../js/release.js';
import * as D from '../js/data.js';
import * as E from '../js/engine.js';
import { botRound } from './sim.mjs';
applyRelease();
const N = +(process.argv[2] || 6); const OUT = process.argv[3] || '/tmp/t29.md';
const SIZES = [4, 6, 8, 10]; const METALS = ['Bronze', 'Silver', 'Gold'];
const STAGE = { 4: { act: 1, level: 3, steps: [2, 3, 4, 6] }, 6: { act: 1, level: 5, steps: [6, 7, 8, 9] }, 8: { act: 2, level: 8, steps: [3, 4, 6, 7, 8, 9] }, 10: { act: 3, level: 12, steps: [2, 3, 4, 6, 8, 9] } };
const ROSTER = { today: ['dagger', 'sword', 'axe', 'staff', 'shield'], plan: ['dagger', 'sword', 'axe', 'staff', 'shield'] };
const setPlan = (on) => { D.EXPERIMENT.weapons3 = on; };
const mk = (id, r, size) => ({ ...E.makeWeapon(id, r, () => 0.5, size), size });
function hero(id, r, size, act = 1, level = 3) {
  const h = E.newHero({ name: 'T29', cls: 'knight', seed: 7 }); h.dice = null; h.level = level; h.campaign.act = act;
  h.strength = { W: size, E: size }; h.mind = { N: Math.min(size, 8) }; h.speed = { S: Math.min(size, 8) }; h.special = { SW: Math.min(size, 8), SE: Math.min(size, 8) };
  const w = mk(id, r, size);
  if (D.WEAPONS[id].hands === 2) h.loadout = { NW: w, NE: E.twinOf(w) }; else h.loadout = { NW: w, NE: mk('shield', r, size) };
  return h;
}
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-');
function throws(id, r, size) {
  const h = hero(id, r, size); const rng = E.makeRng(11); const T = 6000; const a = { atk: 0, pierce: 0, block: 0, heal: 0, magic: 0, gold: 0, splash: 0, tri: 0 }; const hit = [];
  for (let i = 0; i < T; i++) { const ev = E.evaluate(h, E.rollBoard(h, rng)); for (const k of ['atk', 'pierce', 'block', 'heal', 'magic', 'gold', 'splash']) a[k] += ev[k] || 0; a.tri += (ev.triples?.length || 0); hit.push((ev.atk || 0) + (ev.pierce || 0)); }
  hit.sort((x, y) => x - y); for (const k of Object.keys(a)) a[k] /= T;
  return { ...a, p10: hit[Math.floor(T * 0.1)], p90: hit[Math.floor(T * 0.9)] };
}
function fights(id, r, size) {
  const st = STAGE[size]; let won = 0, n = 0, rounds = 0, hp = 0;
  for (const step of st.steps) for (let s = 1; s <= N; s++) {
    const h = hero(id, r, size, st.act, st.level); h.campaign.step = step; h.campaign.wins = step; const rng = E.makeRng(1000 * size + 37 * step + s);
    const b = E.newBattle(h, E.questsFor(h)[0], rng, 1); let g = 0; while (!b.outcome && g++ < 60) botRound(b, rng);
    n++; rounds += b.round; if (b.outcome === 'victory') { won++; hp += b.hp / b.maxHp; }
  }
  return { win: won / n, rounds: rounds / n, hp: won ? hp / won : 0 };
}
const faceText = (fs) => fs.map((f) => `${f.c === 'r' ? 'A' : 'B'}${f.v}${f.fx ? Object.entries(f.fx).map(([k, v]) => `·${{ loot: 'gold', splash: 'splash', pierce: 'pierce', magic: 'magic', heal: 'heal' }[k] || k}${v > 1 ? v : ''}`).join('') : ''}`).join('  ');
let md = `# T29 weapons: the six-weapon plan against today (bots; ${new Date().toISOString().slice(0, 10)})\n\nA = attack face, B = block face, the number is what it adds; ·pierce, ·gold, ·splash, ·magic, ·heal are its icons (a 2 or 3 after the icon: a crit).\n\n`;
md += '## The plan\'s faces\n\n'; setPlan(true);
for (const id of ROSTER.plan) { md += `### ${D.WEAPONS[id].name}${D.WEAPONS[id].hands === 2 ? ' (two hands)' : ''}\n\n_${D.WEAPONS3.because[id]}_\n\n| Size | Bronze | Silver | Gold |\n|---|---|---|---|\n`;
  for (const z of SIZES) md += `| d${z} | ${METALS.map((_, r) => faceText(E.weaponFaces(mk(id, r, z)))).join(' | ')} |\n`; md += '\n'; }
md += '## One throw (Knight, weapon left, Round Shield right; the Staff both hands)\n\n| Weapon | Plan | Metal | Size | Attack | Pierce | Attack + pierce | p10 to p90 | Block | Heal | Magic | Gold | Splash | Triples a throw |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const T = {};
for (const plan of ['today', 'plan']) { setPlan(plan === 'plan'); for (const id of ROSTER[plan]) for (const r of [0, 2]) for (const z of SIZES) { const t = throws(id, r, z); T[`${plan}:${id}:${r}:${z}`] = t;
  md += `| ${D.WEAPONS[id].name} | ${plan} | ${METALS[r]} | d${z} | ${fmt(t.atk)} | ${fmt(t.pierce)} | ${fmt(t.atk + t.pierce)} | ${t.p10} to ${t.p90} | ${fmt(t.block)} | ${fmt(t.heal)} | ${fmt(t.magic)} | ${fmt(t.gold)} | ${fmt(t.splash)} | ${fmt(t.tri, 2)} |\n`; } }
md += `\n## Real fights (smart bot; ${N} fights a step; d4: Act I steps 2-6 at level 3, d6: Act I 6-9 at level 5, d8: Act II at level 8, d10: Act III at level 12)\n\n| Weapon | Plan | Metal | Size | Win | Rounds | Health left |\n|---|---|---|---|---|---|---|\n`;
for (const plan of ['today', 'plan']) { setPlan(plan === 'plan'); for (const id of ROSTER[plan]) for (const r of [0, 2]) for (const z of SIZES) { const f = fights(id, r, z);
  md += `| ${D.WEAPONS[id].name} | ${plan} | ${METALS[r]} | d${z} | ${Math.round(100 * f.win)}% | ${fmt(f.rounds)} | ${Math.round(100 * f.hp)}% |\n`; } }
setPlan(false); fs.writeFileSync(OUT, md); console.log(md);
