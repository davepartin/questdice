// The first three battles of the first road, as they play now (Dave, 6 Nov 2026: practice fights, "a good 4 or 5 rounds ... not hit so hard").
// Two kinds of player, five classes, N heroes each: the smart bot (rerolls, uses powers: a quick, good player) and a beginner who never rerolls,
// never uses a power and always hits the first monster (a slow, weak player). A real new player is somewhere between. Per step: rounds, health
// lost, wins. The knobs are FIRST_FIGHTS in js/data.js (hp x, hit die, fight bonus).
//   node tools/t31-first-fights.mjs [heroes a class = 30]      HP1=2.5 HP2=1.3 DIE=4 override the knobs for a trial without editing
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs } from './sim.mjs';
applyRelease();
const N = +(process.argv[2] || 30); const CLS = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
if (process.env.HP1) D.FIRST_FIGHTS[1].hp = +process.env.HP1; if (process.env.HP2) D.FIRST_FIGHTS[2].hp = +process.env.HP2;
if (process.env.DIE) { D.FIRST_FIGHTS[1].die = D.FIRST_FIGHTS[2].die = +process.env.DIE; }
function run(step, mode) {
  let rounds = 0, lost = 0, won = 0, n = 0; let foes = '';
  for (const cls of CLS) for (let s = 0; s < N; s++) {
    const hero = E.newHero({ name: 'F', cls, seed: 500 + s }); hero.campaign.step = step; hero.campaign.act = 1; if (step > 1) hero.campaign.wins = 1;
    const q = E.questsFor(hero)[0]; const rng = E.makeRng(900 + s); const b = E.newBattle(hero, q, rng, 1); const hp0 = b.hp; let g = 0; foes = b.enemies.map((e) => `${e.name} ${e.hp}hp d${e.powerDie}`).join(', ');
    while (!b.outcome && g++ < 90) { E.startRoll(b); if (mode === 'smart') { botShape(b, rng); E.resolve(b, smartActs(b)); } else E.resolve(b, { target: b.enemies.findIndex((e) => e.hp > 0), straight: 'atk' }); }
    rounds += b.round; lost += (hp0 - Math.max(0, b.hp)) / hp0; won += b.outcome === 'victory' ? 1 : 0; n++;
  }
  return { foes, text: `${(rounds / n).toFixed(1)} rounds, health lost ${(100 * lost / n).toFixed(0)}%, won ${(100 * won / n).toFixed(0)}%` };
}
for (const step of [1, 2, 3]) { const a = run(step, 'smart'), z = run(step, 'lazy'); console.log(`Battle ${step}: ${a.foes}\n  smart player: ${a.text}\n  beginner (no rerolls, no powers): ${z.text}`); }
