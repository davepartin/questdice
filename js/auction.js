// The roadside auction. Pure rules, no DOM: a traveller shows a few weapons, every player locks a secret gold bid at the
// same moment, the highest bid wins and pays what they bid. A tie means the tied players bid again, each bid higher than the
// tied one. Tie again and the traveller takes the weapon back and nobody gets it. No bids at all and it stays with the game.
// Playing alone there is no bidding: the traveller just names a fixed price.
import { WEAPONS, RARITY } from './data.js';
import { rollDrops, makeRng, hashSeed } from './engine.js';

const TIER_MULT = [1, 2.3, 5, 11];
export const basePrice = (inst) => Math.max(1, Math.round(WEAPONS[inst.id].price * TIER_MULT[inst.rarity | 0]));

// Three weapons: a plain one, a good one, and now and then an amazing one.
export function makeOffers(seed, { act = 1, step = 1, count = 3 } = {}) {
  const rng = makeRng(hashSeed(seed, act, step, 'auction'));
  const tiers = [0, 1, rng() < 0.3 + 0.05 * (act - 1) ? 3 : 2].slice(0, count);
  return tiers.map((t) => {
    const [inst] = rollDrops(rng, 1, { minRarity: t });
    inst.rarity = t;
    return { inst, base: basePrice(inst) };
  });
}

// Judge one round of sealed bids ({ playerId: amount }). `min` is the number a bid must beat to count (round two).
export function judge(bids, min = 0) {
  const live = Object.entries(bids).filter(([, a]) => Number.isFinite(a) && a > min);
  if (!live.length) return { status: 'none' };
  const high = Math.max(...live.map(([, a]) => a));
  const top = live.filter(([, a]) => a === high).map(([id]) => id);
  return top.length === 1 ? { status: 'won', winner: top[0], price: high } : { status: 'tie', tied: top, high };
}

// A lot (one weapon) from first bids to a result. `gold` is { playerId: gold held }; a bid above your gold counts as your gold.
export function newLot(offer, gold) { return { offer, gold: { ...gold }, round: 0, min: 0, eligible: Object.keys(gold), result: null }; }
export function bidsFor(lot) { return lot.eligible; } // who may bid right now
export function submit(lot, bids) {
  const clean = {};
  for (const id of lot.eligible) { const raw = Math.floor(Number(bids[id]) || 0); clean[id] = Math.max(0, Math.min(raw, lot.gold[id] ?? 0)); }
  const j = judge(clean, lot.min);
  if (j.status === 'won') { lot.result = { ...j, bids: clean }; return lot.result; }
  if (j.status === 'none') { lot.result = { status: 'unsold', bids: clean }; return lot.result; }
  if (lot.round === 0) { lot.round = 1; lot.min = j.high; lot.eligible = j.tied; return { status: 'rebid', tied: j.tied, high: j.high, bids: clean }; }
  lot.result = { status: 'taken', tied: j.tied, high: j.high, bids: clean };
  return lot.result;
}
// Settle a won lot onto a hero { gold, bag }.
export function settle(hero, lot) {
  const r = lot.result; if (!r || r.status !== 'won' || hero.gold < r.price) return false;
  hero.gold -= r.price; hero.bag.push({ ...lot.offer.inst }); return true;
}

// Alone: no rivals, just a price the player may take or leave.
export function soloOffer(seed, { act = 1, step = 1 } = {}) {
  const rng = makeRng(hashSeed(seed, act, step, 'solo-traveller'));
  const [inst] = rollDrops(rng, 1, { minRarity: rng() < 0.35 ? 1 : 0 });
  return { inst, price: Math.round(basePrice(inst) * (0.85 + rng() * 0.3)) };
}

// The solo traveller is a gamble: a wrapped weapon at a flat price. You do not learn what is inside until you have paid.
// Most are plain, a few are very good, now and then a Diamond. The prize is fixed by the campaign seed, so reloading cannot reroll it.
export const GAMBLE_ODDS = [0.5, 0.3, 0.15, 0.05];
export const gamblePrice = (act = 1) => 70 + 25 * (act - 1);
export function gambleOffer(seed, { act = 1, step = 1 } = {}) {
  const rng = makeRng(hashSeed(seed, act, step, 'gamble-traveller'));
  let r = rng(); let tier = 0;
  for (let i = 0; i < GAMBLE_ODDS.length; i++) { r -= GAMBLE_ODDS[i]; if (r < 0) { tier = i; break; } }
  const [inst] = rollDrops(rng, 1, { minRarity: tier }); inst.rarity = tier;
  return { inst, price: gamblePrice(act), odds: GAMBLE_ODDS };
}

// ---- the traveller's patter (the game is meant to be funny)
const LINES = {
  greet: [
    'Fine goods, honest prices, and only slightly sticky. Do not ask from what.',
    'I found these in a ditch. A very well-stocked ditch. Some ditches have standards.',
    'Step right up. Not too right. A little left. There. You have a gift for standing.',
    'Everything must go. Mostly because it keeps trying to leave on its own. I respect the ambition.',
  ],
  rebid: [
    'A tie! How awkward for everyone. Again, and this time with feeling, and more gold. I am not paid in feeling.',
    'Two of you want it exactly as much? Charming. Bid higher or I shall start charging for the drama. I will, you know.',
    'Same bid. Same face. Same look of betrayal. Go again, higher. The tree is getting impatient.',
  ],
  taken: [
    'You lot are far too difficult to work with. I am keeping it. It likes me better anyway.',
    'Tied twice. Very impressive. Nobody gets it. Go and think about what you have done. Take your time. I have a tree.',
    'I have seen siblings share a last biscuit more gracefully. The weapon goes back in the bag. It had a lucky escape.',
  ],
  unsold: [
    'Nothing? Not even a pity bid? The sword and I are both quite hurt. The sword more so. It has a thinner skin.',
    'No takers. That is fine. It will wait. It is very good at waiting. I taught it myself.',
    'Silence. Lovely. I shall tell the sword you were all too shy. It will pretend not to mind.',
  ],
  won: [
    'Sold! To the one with the most gold and the least dignity. A winning combination, historically.',
    'Sold, and may your enemies be allergic to it. I cannot promise they will be. I can hope.',
    'Congratulations. You are now poorer and better armed. The natural order of things. Try not to spend the rest on apples.',
  ],
  lost: [
    'Better luck next time. Or at least a better bluff. I have seen statues with more poker in them.',
    'You could have bid more. We both know it. We all know it. The tree knows it. Do not look at the tree.',
  ],
  reveal: [
    ['Bronze', 'Ah. Bronze. Well. It is a weapon. It is technically a weapon. The rest is optimism.', 'Bronze. I did say it was a gamble. I did not say it was a good one. The small print was very small.'],
    ['Silver', 'Silver! Not bad. Not bad at all. I am a little jealous and a little relieved. Mostly jealous.', 'Silver, and still warm from the ditch. The ditch sends its regards.'],
    ['Gold', 'Gold! I may have underpriced it. I will not be telling my wife. If I had a wife. Which I do not. Stop looking at me.', 'Gold! Please do not tell the other travellers. They will want one, and I only have the one tree.'],
    ['Diamond', 'DIAMOND. I am going to sit down. Do not look at me. Do not look at the tree either.', 'A Diamond. I want to be clear that I had no idea. I had every idea. Both of those can be true.'],
  ],
  solo: [
    'Just the one customer? I shall not mention the pressure. I am mentioning it now, of course.',
    'Take it or leave it. I will not be offended. I will be slightly offended. I am very honest about that.',
  ],
};
export const LINE_KINDS = Object.keys(LINES).filter((k) => k !== 'reveal');
export function revealLine(tier, rng = Math.random) { const e = LINES.reveal[tier | 0]; return e[1 + Math.floor(rng() * 2)]; }
export function line(kind, rng = Math.random) { const l = LINES[kind]; return l[Math.floor(rng() * l.length)]; }
export const tierName = (inst) => RARITY[inst.rarity | 0];
