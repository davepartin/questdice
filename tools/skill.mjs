// Does good play matter, and by how much? (Dave, Oct 2026: on Legendary you must read the monsters and spend magic well, and it must
// still be beatable.) A hero plays the campaign (driven by DRIVER, default the wise bot); at every step the SAME hero fights that
// step's battle many times with each play style (tools/sim.mjs PLAY: first, smart, wise), so the gap is play, not build.
//   SKILL=legendary node tools/skill.mjs [acts=3] [campaigns per class=2] [class]      (sh tools/skill-all.sh runs every class)
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, buyPotion, takeDiamond, shatterDiamonds, WANDER } from '../js/engine.js';
if (process.env.WANDER) Object.assign(WANDER, JSON.parse(process.env.WANDER)); // e.g. WANDER='{"chance":0}' to measure without wanderers
import { botRound, botCamp, botLoot, botArm, PLAY, setScore } from './sim.mjs';
import { QUESTS_PER_ACT } from '../js/data.js';
import * as DATA from '../js/data.js';
if (process.env.TUNE) { // same as tools/progress.mjs
  const put = (dst, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v)) put(dst[k], v); else if (Array.isArray(v)) v.forEach((x, i) => { dst[k][i] = x; }); else dst[k] = v; } };
  for (const [name, v] of Object.entries(JSON.parse(process.env.TUNE))) { if (Array.isArray(v)) v.forEach((x, i) => { DATA[name][i] = x; }); else put(DATA[name], v); }
}
const ACTS = Number(process.argv[2] || 3); const N = Number(process.argv[3] || 2);
const classes = process.argv[4] ? [process.argv[4]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const STYLES = (process.env.CMP || 'first,smart,wise').split(','); const DIAMONDS = process.env.DIAMONDS !== '0'; const DRIVER = process.env.DRIVER || 'wise'; const T = Number(process.env.TRIALS || 8); // DIAMONDS=0: never pick them up
const clone = (h) => JSON.parse(JSON.stringify(h));
const play = (style) => { PLAY.style = style; setScore(null); };
function trial(hero, quest, seed, style) {
  play(style); let wins = 0; let hp = 0; let rounds = 0;
  for (let i = 0; i < T; i++) {
    const rng = makeRng(seed * 31 + i); const b = newBattle(clone(hero), quest, rng, 1); let g = 0;
    while (!b.outcome && g++ < 80) botRound(b, rng);
    if (b.outcome === 'victory') { wins++; hp += b.hp / b.maxHp; } rounds += b.round;
  }
  return { win: wins / T, hp: wins ? hp / wins : 0, rounds: rounds / T };
}
const steps = {}; let clears = 0; let total = 0; let retries = 0;
for (const cls of classes) for (let s = 0; s < N; s++) {
  total++; const seed = 9100 + s; const rng = makeRng(seed); const hero = newHero({ name: 'W', cls, seed, pack: process.env.PACK || undefined }); // PACK=starfall plays a writer's campaign
  hero.difficulty = process.env.SKILL || 'normal'; let alive = true;
  for (let n = 0; n < QUESTS_PER_ACT * ACTS && alive; n++) {
    const quest = questsFor(hero)[0]; const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')}`;
    const A = (steps[key] ||= { kind: quest.kind, n: 0 }); A.n++;
    if (DIAMONDS) { play(DRIVER); botArm(hero, quest); } // the trials below fight with the Diamonds the driver chose to bring
    for (const st of STYLES) { const r = trial(hero, quest, seed + n, st); A[`w_${st}`] = (A[`w_${st}`] || 0) + r.win; A[`h_${st}`] = (A[`h_${st}`] || 0) + r.hp; A[`r_${st}`] = (A[`r_${st}`] || 0) + r.rounds; }
    play(DRIVER); let b; let tries = 0;
    do { if (tries) while (buyPotion(hero)) { /* restock after a retreat */ } b = newBattle(hero, quest, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) botRound(b, rng); shatterDiamonds(hero); } while (b.outcome === 'defeat' && tries < 6);
    retries += tries - 1;
    if (b.outcome !== 'victory') { alive = false; A.fell = (A.fell || 0) + 1; break; }
    const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); if (DIAMONDS && r.diamond) takeDiamond(hero, r.diamond); advanceCampaign(hero); botCamp(hero, rng);
  }
  if (alive) clears++;
}
const out = { steps, clears, total, retries, styles: STYLES };
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify(out)); else console.log(JSON.stringify(out));
