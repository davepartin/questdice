// Tests on the road (Dave, Oct 2026): like a tabletop game's ability check. Four times an act the road asks for one of your body's dice:
//   WISDOM   the head die   (a chess match, a riddle at a bridge, an old map)
//   STRENGTH both hands     (arm-wrestling, a fallen tree on a wagon, a goblin tug-of-war)
//   SPEED    the feet die   (a footrace, a runaway goat, a rockslide)
// You roll against the other side's dice, shown before you choose; highest total wins and a tie goes to you. In a company the hero with the
// best dice for the test steps up (the champion). Every roll is seeded from the campaign, so reloading cannot change it. Lose and you may ask
// for one rematch, for a little gold. Pure rules: roads.js turns these into road events, the screens show the dice (g3/trialui.js).
import { hashSeed, makeRng, mindSize, feetSize } from './engine.js';

export const STATS = {
  wisdom: { name: 'Wisdom', die: 'head', slots: ['N'], icon: 'head', word: 'Test of Wisdom' },
  strength: { name: 'Strength', die: 'hands', slots: ['W', 'E'], icon: 'hand', word: 'Test of Strength' },
  speed: { name: 'Speed', die: 'feet', slots: ['S'], icon: 'feet', word: 'Test of Speed' },
};
// Steps of an act that hold a test instead of (or before) a plain fight: four an act, about every other battle.
export const TRIAL_STEPS = [5]; // a dice test before the elite (Dave, Oct 2026: encounters every other camp; step 8 also tests when the story locks that fight)
export const isTrialStep = (c) => TRIAL_STEPS.includes(c.step) && !(c.act === 1 && c.step === 1);
// The other side's die by act (a "hard" test is one size bigger): Act I d4, Act II d6, Act III d8. Grow your dice to keep winning.
export const OPP_DIE = { 1: 4, 2: 6, 3: 8 };
export const oppSize = (act, hard = false) => Math.min(12, (OPP_DIE[Math.min(3, Math.max(1, act | 0))] || 8) + (hard ? 2 : 0));
export const rematchCost = (act) => 5 * Math.min(3, Math.max(1, act | 0));

// The dice a hero brings to a test.
export function statDice(hero, stat) {
  if (stat === 'wisdom') return [mindSize(hero)];
  if (stat === 'speed') return [feetSize(hero)];
  return [hero.strength?.W || 4, hero.strength?.E || 4];
}
const avg = (sizes) => sizes.reduce((a, s) => a + (s + 1) / 2, 0);
// Who steps up for the company: the best dice for this test (the one who chose wins a tie).
export function championFor(members, stat, chooser) {
  const list = chooser ? [chooser, ...members.filter((m) => m !== chooser)] : members;
  return list.reduce((best, m) => (avg(statDice(m, stat)) > avg(statDice(best, stat)) ? m : best), list[0]);
}
// The exact chance that the hero's total (sum of their dice) beats or ties the other side's.
function dist(sizes) {
  let d = new Map([[0, 1]]);
  for (const s of sizes) { const n = new Map(); for (const [t, p] of d) for (let v = 1; v <= s; v++) n.set(t + v, (n.get(t + v) || 0) + p / s); d = n; }
  return d;
}
export function winChance(heroSizes, oppSizes) {
  const H = dist(heroSizes); const O = dist(oppSizes); let p = 0;
  for (const [h, ph] of H) for (const [o, po] of O) if (h >= o) p += ph * po;
  return p;
}
// Roll it: seeded by the campaign and the attempt, so the same test always lands the same way.
export function rollTrial({ campaign: c, members, stat, hard, chooser, attempt = 0, key = 'trial' }) {
  const champ = championFor(members, stat, chooser);
  const heroSizes = statDice(champ, stat);
  const opp = oppSize(c.act, hard); const oppSizes = heroSizes.map(() => opp);
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, key, attempt));
  const heroDice = heroSizes.map((s) => 1 + Math.floor(rng() * s));
  const oppDice = oppSizes.map((s) => 1 + Math.floor(rng() * s));
  const heroTotal = heroDice.reduce((a, v) => a + v, 0); const oppTotal = oppDice.reduce((a, v) => a + v, 0);
  return { stat, who: champ.name, cls: champ.cls, heroSizes, heroDice, heroTotal, oppSizes, oppDice, oppTotal, win: heroTotal >= oppTotal, attempt };
}
// The line under a test choice: your dice against theirs, and the odds, so nobody walks in blind.
// The roll summary for a test (T09), the same on the result card and the dice overlay: "Your roll 7 · Challenge 2" alone,
// "Ann’s roll 7 · Challenge 2" in a company, so every phone at a table reads the same.
export function rollLine(trial, members = []) {
  return `${members.length > 1 && trial.who ? `${trial.who}’s` : 'Your'} roll ${trial.heroTotal} · Challenge ${trial.oppTotal}`;
}
export function oddsLine(members, stat, act, hard) {
  const champ = championFor(members, stat);
  const mine = statDice(champ, stat); const opp = oppSize(act, hard);
  const dice = (sizes) => sizes.map((s) => `d${s}`).join('+');
  const who = members.length > 1 ? `${champ.name}'s ` : 'Your ';
  return `${who}${dice(mine)} against ${dice(mine.map(() => opp))} · about ${Math.round(winChance(mine, mine.map(() => opp)) * 100)}% to win`;
}
