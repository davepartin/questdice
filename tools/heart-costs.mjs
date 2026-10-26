// Heart rank marginal output: exact uniform-roll expectations, not a combat simulation.
// node tools/heart-costs.mjs
import { FACE_PAY, HEAL_AMOUNT, HEAL_COST } from '../js/data.js';
const shapes = [[4,4,4,4],[6,6,6,6],[8,8,8,6],[10,10,10,6],[10,10,10,8]];
const symbols = ['heal','pierce','magic','gold'];
for (const sizes of shapes) {
  const perRound = Object.fromEntries(symbols.map(sym => [sym,
    sizes.reduce((total,size) => total + Array.from({length:size},(_,i)=>FACE_PAY[i+1]?.[sym] ? 1 : 0).reduce((a,b)=>a+b,0)/size,0)/6
  ]));
  // Two active weapon lanes, each red OR blue; colour frequencies need not match.
  // Heart 5 and 6 each have probability 1/6, and the increment is 2 per eligible lane.
  perRound.attackPlusBlock = 2*2/6;
  console.log(JSON.stringify({sizes,perRankStepPerRound:perRound,
    perRankStepTenRounds:Object.fromEntries(Object.entries(perRound).map(([k,v])=>[k,10*v])),
    magicOnlyHealingEquivalentTenRounds:10*perRound.magic*HEAL_AMOUNT/HEAL_COST}));
}
console.log(JSON.stringify({focusedUpperBoundPerRankStep:{extraMagicPerRound:4,healingEquivalent:4*HEAL_AMOUNT/HEAL_COST},
  assumptions:'Uniform independent fresh rolls; no rerolls, turning, hush, caps, spill, overheal, damage prevention or gold multipliers. Upper bound assumes all four eligible dice match the selected resource, not an attainable average. Rank 3 versus rank 1 doubles marginal outputs. Attack plus block are combined only in this labelled diagnostic; not asserted equal in value.'}));
