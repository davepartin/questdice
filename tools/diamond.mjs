// What a Diamond is worth (Dave, Oct 2026: rare one-fight weapons, "save it for a boss"). A hero plays the campaign with the wise
// driver and no Diamonds; at every elite and boss the same hero fights that battle many times holding none, one and two Diamonds of
// the act's size (random kinds), bringing those that help, each in its best hand, with each play style. The aim: a Diamond turns a hard boss into a likely win, not
// a sure one.   SKILL=normal TRIALS=12 node tools/diamond.mjs [acts=3] [campaigns per class=2] [class]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, buyPotion, makeDiamond, takeDiamond, armDiamond, diamondHands } from '../js/engine.js';
import { botRound, botCamp, botLoot, bestDiamondArm, PLAY, setScore } from './sim.mjs';
import { QUESTS_PER_ACT } from '../js/data.js';
const ACTS = Number(process.argv[2] || 3); const N = Number(process.argv[3] || 2);
const classes = process.argv[4] ? [process.argv[4]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const STYLES = (process.env.CMP || 'smart,wise').split(','); const T = Number(process.env.TRIALS || 12);
const clone = (h) => JSON.parse(JSON.stringify(h));
const play = (style) => { PLAY.style = style; setScore(null); };
function trial(hero, quest, seed, style, n) {
  play(style); let wins = 0;
  for (let i = 0; i < T; i++) {
    const h = clone(hero); const r = makeRng(seed * 31 + i); const hands = diamondHands(h);
    for (let k = 0; k < Math.min(n, hands.length); k++) takeDiamond(h, makeDiamond(makeRng(seed * 7 + i * 3 + k), h.campaign.act));
    if (n) for (const x of bestDiamondArm(h, Math.min(n, hands.length)).plan) armDiamond(h, x.uid, x.slot); // holding n: bring what helps, each in its best hand
    const b = newBattle(h, quest, r, 1); let g = 0; while (!b.outcome && g++ < 80) botRound(b, r);
    if (b.outcome === 'victory') wins++;
  }
  return wins / T;
}
const rows = {};
for (const cls of classes) for (let s = 0; s < N; s++) {
  const seed = 9100 + s; const rng = makeRng(seed); const hero = newHero({ name: 'W', cls, seed }); hero.difficulty = process.env.SKILL || 'normal';
  for (let n = 0; n < QUESTS_PER_ACT * ACTS; n++) {
    const quest = questsFor(hero)[0]; const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')} ${quest.kind}`;
    if (quest.kind !== 'battle') { const A = (rows[key] ||= { n: 0 }); A.n++; for (const st of STYLES) for (const k of [0, 1, 2]) A[`${st}${k}`] = (A[`${st}${k}`] || 0) + trial(hero, quest, seed + n, st, k); }
    play('wise'); let b; let tries = 0;
    do { if (tries) while (buyPotion(hero)) { /* restock */ } b = newBattle(hero, quest, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) botRound(b, rng); } while (b.outcome === 'defeat' && tries < 6);
    if (b.outcome !== 'victory') break;
    const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); advanceCampaign(hero); botCamp(hero, rng);
  }
}
const pct = (x) => `${Math.round(100 * x)}%`.padStart(5);
console.log(`difficulty ${process.env.SKILL || 'normal'}: win rate at elites and bosses with 0 / 1 / 2 Diamonds`);
console.log('step        ' + STYLES.map((s) => `${s}: none   one   two`.padEnd(24)).join(''));
for (const k of Object.keys(rows).sort()) { const A = rows[k]; console.log(k.padEnd(12) + STYLES.map((s) => `${' '.repeat(s.length + 1)}${pct(A[`${s}0`] / A.n)} ${pct(A[`${s}1`] / A.n)} ${pct(A[`${s}2`] / A.n)}`.padEnd(24)).join('')); }
