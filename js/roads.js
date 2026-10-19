// The computer is the road. Events are seeded from the campaign, so the same company
// meets the same scene every time they reload, and a choice is the only thing that branches.
import { HELP_FIGHTS, placeOf } from './story.js';
import { actsOf, helpFightsOf, helpOff } from './campaigns.js';
import {
  hashSeed, makeRng, companyGold, payCompany, grantCompany, grantXpEach, potionStock, potionMaxOf,
} from './engine.js';
import { STATS, isTrialStep, rollTrial, oddsLine, rematchCost } from './trials.js';

export function joinNames(members) {
  const n = members.map((m) => m.name);
  if (n.length <= 1) return n[0] || 'you';
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}
const be = (members, one, many) => (members.length > 1 ? many : one);

function helpPair(c, act) {
  const list = act?.help || [];
  if (list.length >= 2) return [list[0], list[1]];
  const places = (act?.places || []).slice(0, 2);
  return [places[0] || 'Cinder Ford', places[1] || 'Burnt Orchard'];
}
function pickHelp(ctx, i) {
  const acts = actsOf(ctx.campaign);
  const act = acts[(ctx.campaign.act - 1) % acts.length];
  const pair = helpPair(ctx.campaign, act);
  const saved = pair[i]; const lost = pair[1 - i];
  ctx.campaign.nextPlace = saved;
  ctx.campaign.nextEnemies = (helpFightsOf(ctx.campaign) || HELP_FIGHTS)[saved] || null;
  ctx.campaign.saved = saved; ctx.campaign.forsaken = lost;
  note(ctx, 'A Call for Help', `They ran for ${saved}. ${lost} had to wait, and the road wrote it down.`);
  return `You turn toward ${saved}. ${lost} will have to stand on its own. A chronicle line will remember the choice. Roads always do.`;
}
function note(ctx, title, text) {
  const c = ctx.campaign;
  c.chronicle = [{ act: c.act, step: c.step, title, text }, ...(c.chronicle || [])].slice(0, 18);
}
function bless(ctx, bl) {
  ctx.campaign.blessings = [...(ctx.campaign.blessings || []), bl];
}
function weighted(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}

export const ROADS = [
  {
    id: 'gate', when: 'opening', kicker: 'The campaign begins', title: 'The Nine-Stone Gate',
    tell: ({ members }) => `${joinNames(members)} ${be(members, 'comes', 'come')} to a gate of nine standing stones, laid out like a person having a lie-down. Head stone. Heart stone. One for each hand and each foot. Four darker stones wait at the corners for weapons and gifts, as if the hill itself wants a go. The dice warm in the niches. Far down the road, something turns its head. It has been waiting.`,
    choices: [
      {
        id: 'march',
        label: () => 'Set the dice in the stones and march',
        hint: () => 'Round 1 of your first fight: +10 attack.',
        apply: (ctx) => {
          bless(ctx, { id: 'gate', name: 'Nine-stone push', text: 'Round 1: +10 attack.', fights: 1, openingAtk: 10 });
          note(ctx, 'The Nine-Stone Gate', 'They set the dice in. The hill knocked back, once, like a friend at the door.');
          return 'The heart stone knocks back. One deep thump, like a fist on a tavern door at dawn. Right then. Off we go. For the first round of the fight ahead, every hero swings at +10 attack.';
        },
      },
    ],
  },
  {
    id: 'help', when: 'help', kicker: 'A call for help', title: 'A Call for Help',
    tell: ({ members, campaign: c }) => {
      const acts = actsOf(c);
      const act = acts[(c.act - 1) % acts.length];
      const [a, b] = helpPair(c, act);
      const pa = placeOf(a, c)?.title || a; const pb = placeOf(b, c)?.title || b;
      return `A runner finds ${joinNames(members)} on the road, out of breath and pointing both ways at once, which is not as helpful as they think. ${pa} is under attack. So is ${pb}. You can only reach one in time. The other will have to stand on its own. That is the sort of sentence that stays with you.`;
    },
    choices: [
      {
        id: 'save-a',
        label: ({ campaign: c }) => { const acts = actsOf(c); return `Save ${helpPair(c, acts[(c.act - 1) % acts.length])[0]}`; },
        hint: () => 'The fight waits there. The other place will remember.',
        apply: (ctx) => pickHelp(ctx, 0),
      },
      {
        id: 'save-b',
        label: ({ campaign: c }) => { const acts = actsOf(c); return `Save ${helpPair(c, acts[(c.act - 1) % acts.length])[1]}`; },
        hint: () => 'The fight waits there. The other place will remember.',
        apply: (ctx) => pickHelp(ctx, 1),
      },
    ],
  },
];

// ------------------------------------------------------------------------------------------------ encounters (Dave, Oct 2026)
// Every other camp, something happens on the road. It should matter in the next fight (a potion, +10 in round 1, an enchanted weapon,
// borrowed boots, or a stomach bug that costs health every round), use the heroes' names, be funny, and be short. Nothing here belongs
// to one story, so it reads right in any campaign. The numbers grow with the act.
const AI = (ctx) => Math.min(3, Math.max(1, ctx.act || ctx.campaign?.act || 1)) - 1;
const OPEN = [10, 15, 20]; const PIERCE = [3, 4, 5]; const SICK = [3, 4, 5]; const HP = [10, 15, 20]; const MAGIC = [3, 4, 5]; const BOOTS = [8, 10, 12]; const WOUND = [8, 12, 16];
const by = (ctx, list) => list[AI(ctx)];
// one hero of the company, the same one every time this scene is told
const someone = (ctx, salt) => { const m = ctx.members || []; return m.length ? m[hashSeed(ctx.campaign?.seed || 0, ctx.campaign?.act, ctx.campaign?.step, salt) % m.length].name : 'you'; };
const each = (members, one, many) => (members.length > 1 ? many : one);
function potionsAll(ctx) { return ctx.members.map((m) => givePotion(ctx, m.name)).join(' '); }
const ENCOUNTERS = [
  {
    id: 'enchanter', when: 'road', kicker: 'On the road', title: 'The Hedge Enchanter',
    tell: (ctx) => `A hedge enchanter has a folding table by the road and a sign: WEAPONS ENCHANTED WHILE YOU WAIT. Underneath, smaller: MOSTLY. ${someone(ctx, 'ench')} is already holding out a sword.`,
    choices: [
      { id: 'pay', label: (ctx) => `Pay for the proper spell · ${gp(ctx.act, 15)} gold`, hint: (ctx) => `Next fight: +${by(ctx, PIERCE)} pierce every round, for ${each(ctx.members, 'you', 'everyone')}.`,
        can: (ctx) => companyGold(ctx.members) >= gp(ctx.act, 15),
        apply: (ctx) => { const n = by(ctx, PIERCE); payCompany(ctx.members, gp(ctx.act, 15)); bless(ctx, { id: 'enchant', name: 'Enchanted weapons', text: `+${n} pierce every round.`, fights: 1, pierce: n }); note(ctx, 'The Hedge Enchanter', 'Paid for the proper spell. The weapons hum.');
          return `The enchanter mutters, one weapon hums, then all of them hum, in harmony, which nobody asked for. Next fight: +${n} pierce every round.`; } },
      { id: 'free', label: () => 'Let the apprentice try, for free', hint: (ctx) => `Half the time: +${by(ctx, PIERCE)} pierce every round. Half the time: lavender.`,
        apply: (ctx) => { const n = by(ctx, PIERCE); if (ctx.rng() < 0.5) { bless(ctx, { id: 'enchant', name: 'Enchanted weapons', text: `+${n} pierce every round.`, fights: 1, pierce: n }); note(ctx, 'The Hedge Enchanter', 'The apprentice got it right. Everyone was surprised.'); return `It works! The apprentice is more surprised than anyone. Next fight: +${n} pierce every round.`; }
          note(ctx, 'The Hedge Enchanter', 'The apprentice tried. The swords smell of lavender.'); return 'There is a flash, a pop, and a smell of lavender. That is the whole effect. The weapons are exactly as sharp as before, but they smell lovely.'; } },
      { id: 'walk', label: () => 'Walk on', hint: () => 'Nothing gained.', apply: (ctx) => { note(ctx, 'The Hedge Enchanter', 'Walked past the enchanter.'); return '"Your loss!" calls the enchanter, and then, quieter, "Probably."'; } },
    ],
  },
  {
    id: 'cobbler', when: 'road', kicker: 'On the road', title: 'The Cobbler’s Loaners',
    tell: (ctx) => `A cobbler sits under a sign: LOANER BOOTS, ONE FIGHT ONLY. "Bring them back with the monster still in them, if you can." He is looking at ${someone(ctx, 'cob')}’s feet with professional pity.`,
    choices: [
      { id: 'borrow', label: (ctx) => `Borrow ${each(ctx.members, 'a pair', 'a pair each')}`, hint: (ctx) => `Next fight: your feet roll a d${by(ctx, BOOTS)} (if that is bigger). He takes them back after.`,
        apply: (ctx) => { const n = by(ctx, BOOTS); bless(ctx, { id: 'boots', name: 'Loaner boots', text: `Feet roll a d${n}.`, fights: 1, feet: n }); note(ctx, 'The Cobbler’s Loaners', 'Borrowed fast boots for a fight.');
          return `They fit like a promise. Next fight, your feet roll a d${n}. After it, the cobbler wants them back, and he will know if you ran in a puddle.`; } },
      { id: 'polish', label: () => 'Polish boots for him instead', hint: (ctx) => `Earn ${gp(ctx.act, 8)} gold ${each(ctx.members, '', 'each')}.`.replace(' .', '.'),
        apply: (ctx) => { grantCompany(ctx.members, gp(ctx.act, 8) * ctx.members.length); note(ctx, 'The Cobbler’s Loaners', 'Polished boots for coin.'); return `An hour of polishing. ${gp(ctx.act, 8)} gold ${each(ctx.members, 'for you', 'each')}, and the cleanest boots in the land, none of them yours.`; } },
    ],
  },
  {
    id: 'stew', when: 'road', kicker: 'On the road', title: 'Questionable Stew',
    tell: (ctx) => `A cook with one eyebrow is stirring a cauldron. "Stew," he says. "Hearty." Something in the pot agrees. ${joinNames(ctx.members)} ${be(ctx.members, 'is', 'are')} very hungry.`,
    choices: [
      { id: 'bowl', label: () => 'Have a bowl', hint: (ctx) => `Next fight: +${by(ctx, HP)} health ${each(ctx.members, '', 'each')}.`.replace(' .', '.'),
        apply: (ctx) => { const n = by(ctx, HP); bless(ctx, { id: 'stew', name: 'Hearty stew', text: `+${n} health.`, fights: 1, startHp: n }); note(ctx, 'Questionable Stew', 'Had a bowl. It was hearty.'); return `It is, against all the evidence, delicious. Next fight: +${n} health.`; } },
      { id: 'seconds', label: () => 'Have seconds, and whatever that lump is', hint: (ctx) => `Next fight: +${by(ctx, HP) * 2} health, but the lump might disagree with you.`,
        apply: (ctx) => { const n = by(ctx, HP) * 2; const s = by(ctx, SICK); const sick = ctx.rng() < 0.5;
          bless(ctx, { id: 'stew2', name: 'Seconds', text: `+${n} health.`, fights: 1, startHp: n });
          if (sick) { bless(ctx, { id: 'lump', name: 'The lump', text: `Lose ${s} health every round.`, fights: 1, sick: s, bane: true }); note(ctx, 'Questionable Stew', 'Had seconds. The lump disagreed.'); return `The lump disagrees. Loudly. Next fight: +${n} health, but you lose ${s} every round to a very unhappy stomach.`; }
          note(ctx, 'Questionable Stew', 'Had seconds. The lump was a dumpling.'); return `The lump was a dumpling. Bliss. Next fight: +${n} health.`; } },
      { id: 'pass', label: () => 'Politely decline', hint: () => 'Nothing gained, nothing risked.', apply: (ctx) => { note(ctx, 'Questionable Stew', 'Declined the stew.'); return 'The cook shrugs and eats it himself. The stew looks relieved.'; } },
    ],
  },
  {
    id: 'sergeant', when: 'road', kicker: 'On the road', title: 'The Drill Sergeant',
    tell: (ctx) => `A retired drill sergeant bursts out of a hedge. "YOU CALL THAT A STANCE?" he bellows at ${someone(ctx, 'sgt')}. He offers one free lesson. He offers it very loudly.`,
    choices: [
      { id: 'shield', label: () => 'Shield drill', hint: (ctx) => `Round 1 of the next fight: +${by(ctx, OPEN)} block ${each(ctx.members, '', 'each')}.`.replace(' .', '.'),
        apply: (ctx) => { const n = by(ctx, OPEN); bless(ctx, { id: 'drill-b', name: 'Shield drill', text: `Round 1: +${n} block.`, fights: 1, openingBlock: n }); note(ctx, 'The Drill Sergeant', 'Shield drill, until the arms shook.'); return `"SHIELDS UP! NO, UP-ER!" An hour later, nobody can lower their arms. Round 1 of the next fight: +${n} block.`; } },
      { id: 'charge', label: () => 'Charge drill', hint: (ctx) => `Round 1 of the next fight: +${by(ctx, OPEN)} attack ${each(ctx.members, '', 'each')}.`.replace(' .', '.'),
        apply: (ctx) => { const n = by(ctx, OPEN); bless(ctx, { id: 'drill-a', name: 'Charge drill', text: `Round 1: +${n} attack.`, fights: 1, openingAtk: n }); note(ctx, 'The Drill Sergeant', 'Charge drill. A hedge was harmed.'); return `"CHARGE! AGAIN! WITH FEELING!" The hedge does not survive. Round 1 of the next fight: +${n} attack.`; } },
    ],
  },
  {
    id: 'herbalist', when: 'road', kicker: 'On the road', title: 'The Herbalist’s Cart',
    tell: () => 'A herb cart has lost a wheel. The herbalist, a tiny woman with enormous gloves, glares at the wheel as if it did it on purpose. "Help me," she says, "and I will make it worth your while."',
    choices: [
      { id: 'fix', label: () => 'Fix the wheel', hint: (ctx) => `A healing potion ${each(ctx.members, 'for you', 'for each of you')}.`,
        apply: (ctx) => { const t = potionsAll(ctx); note(ctx, 'The Herbalist’s Cart', 'Fixed a wheel; paid in potions.'); return `The wheel goes back on with a satisfying clunk. She pays in potions. ${t}`; } },
      { id: 'nettles', label: (ctx) => `Pick her stinging nettles · ${gp(ctx.act, 20)} gold`, hint: (ctx) => `Gain the gold, but the rash costs ${by(ctx, SICK)} health a round next fight.`,
        apply: (ctx) => { const s = by(ctx, SICK); grantCompany(ctx.members, gp(ctx.act, 20)); bless(ctx, { id: 'rash', name: 'Nettle rash', text: `Lose ${s} health every round.`, fights: 1, sick: s, bane: true }); note(ctx, 'The Herbalist’s Cart', 'Picked nettles. Itched.');
          return `${gp(ctx.act, 20)} gold and a rash with ambitions. Next fight, it costs ${s} health every round. Try not to scratch. You will scratch.`; } },
    ],
  },
  {
    id: 'well', when: 'road', kicker: 'On the road', title: 'The Wishing Well',
    tell: () => 'A wishing well, half full of coins and half full of frogs. A sign says WISHES 5 GOLD. One frog says nothing, judgmentally.',
    choices: [
      { id: 'wish', label: (ctx) => `Toss in ${gp(ctx.act, 8)} gold and wish`, hint: (ctx) => `Next fight: start with ${by(ctx, MAGIC)} more magic ${each(ctx.members, '', 'each')}.`.replace(' .', '.'),
        can: (ctx) => companyGold(ctx.members) >= gp(ctx.act, 8),
        apply: (ctx) => { const n = by(ctx, MAGIC); payCompany(ctx.members, gp(ctx.act, 8)); bless(ctx, { id: 'wish', name: 'A granted wish', text: `+${n} magic at the start.`, fights: 1, startMagic: n }); note(ctx, 'The Wishing Well', 'Made a wish. The frog approved.');
          return `Plink. The water glows purple, briefly. The frog nods. Next fight: start with ${n} more magic.`; } },
      { id: 'fish', label: (ctx) => `Fish out ${gp(ctx.act, 15)} gold`, hint: (ctx) => `The frogs bite: next fight starts ${by(ctx, WOUND)} health down.`,
        apply: (ctx) => { const w = by(ctx, WOUND); grantCompany(ctx.members, gp(ctx.act, 15)); bless(ctx, { id: 'frogs', name: 'Frog bites', text: `Start ${w} health down.`, fights: 1, wound: w, bane: true }); note(ctx, 'The Wishing Well', 'Robbed a wishing well. The frogs remember.');
          return `${gp(ctx.act, 15)} gold, damp. The frogs bite, and they hold grudges. Next fight starts ${w} health down.`; } },
      { id: 'leave', label: () => 'Leave the frogs in peace', hint: () => 'Nothing gained.', apply: (ctx) => { note(ctx, 'The Wishing Well', 'Left the well alone.'); return 'You leave. The frog watches you go, still judging.'; } },
    ],
  },
  // ---- the night before the boss
  {
    id: 'eve-fire', when: 'boss', kicker: 'The night before', title: 'The Last Campfire',
    tell: (ctx) => `The last camp before the boss. ${joinNames(ctx.members)} sit by the fire. Nobody says it. ${someone(ctx, 'eve')} pokes the fire, which is how heroes say "I am fine."`,
    choices: [
      { id: 'sharpen', label: () => 'Sharpen everything, twice', hint: (ctx) => `The boss fight: +${by(ctx, PIERCE) + 1} pierce every round.`,
        apply: (ctx) => { const n = by(ctx, PIERCE) + 1; bless(ctx, { id: 'sharp', name: 'Sharpened twice', text: `+${n} pierce every round.`, fights: 1, pierce: n }); note(ctx, 'The Last Campfire', 'Sharpened everything, twice.'); return `Scrape, scrape, all night. By dawn the blades could cut a rumour. The boss fight: +${n} pierce every round.`; } },
      { id: 'sleep', label: () => 'Get a proper night’s sleep', hint: (ctx) => `The boss fight: +${by(ctx, HP)} health and ${by(ctx, MAGIC)} more magic at the start.`,
        apply: (ctx) => { const n = by(ctx, HP); const m = by(ctx, MAGIC); bless(ctx, { id: 'rest', name: 'A good night’s sleep', text: `+${n} health, +${m} magic.`, fights: 1, startHp: n, startMagic: m }); note(ctx, 'The Last Campfire', 'Slept well, for once.'); return `Nobody snores, for once. You wake up feeling like a person. The boss fight: +${n} health and ${m} more magic.`; } },
    ],
  },
  {
    id: 'eve-speech', when: 'boss', kicker: 'The night before', title: 'A Speech Before the Boss',
    tell: (ctx) => `${someone(ctx, 'speech')} climbs onto a rock to give a speech. It starts badly. It gets worse. Then, somehow, right at the end, it gets good.`,
    choices: [
      { id: 'rousing', label: () => 'Cheer the rousing bit', hint: (ctx) => `Round 1 of the boss fight: +${by(ctx, OPEN) + 5} attack.`,
        apply: (ctx) => { const n = by(ctx, OPEN) + 5; bless(ctx, { id: 'speech-a', name: 'A rousing speech', text: `Round 1: +${n} attack.`, fights: 1, openingAtk: n }); note(ctx, 'A Speech Before the Boss', 'Cheered the rousing bit.'); return `"...AND THAT IS WHY WE FIGHT!" Everyone cheers, including a passing owl. Round 1 of the boss fight: +${n} attack.`; } },
      { id: 'sensible', label: () => 'Cheer the sensible bit about shields', hint: (ctx) => `Round 1 of the boss fight: +${by(ctx, OPEN) + 5} block.`,
        apply: (ctx) => { const n = by(ctx, OPEN) + 5; bless(ctx, { id: 'speech-b', name: 'A sensible speech', text: `Round 1: +${n} block.`, fights: 1, openingBlock: n }); note(ctx, 'A Speech Before the Boss', 'Cheered the bit about shields.'); return `"...and keep your shields UP." It is not stirring, but it is correct. Round 1 of the boss fight: +${n} block.`; } },
    ],
  },
];
for (const e of ENCOUNTERS) ROADS.push(e);

// Encounters come every other camp (Dave, Oct 2026: the road used to stop you before nearly every fight): a choice before fight 3,
// a dice test before the elite (fight 5), a Call for Help before fight 8 (a dice test where the story locks that fight), and the
// night before the boss. The other camps go straight on to the fight. The first step of the campaign has its own opening.
export const roadSlot = (c) => c.step === 3 || c.step === 8 || c.step >= 10 || isTrialStep(c);

function poolFor(campaign) {
  const opening = campaign.act === 1 && campaign.step === 1 && !(campaign.wins > 0);
  if (opening) return ROADS.filter((e) => e.when === 'opening');
  if (campaign.step === 8) {
    // Duo packs lock a fight on step 8; Call for Help would replace that cast, so a dice test waits there instead.
    if (helpOff(campaign)) return ROADS.filter((e) => e.when === 'trial');
    return ROADS.filter((e) => e.when === 'help');
  }
  if (isTrialStep(campaign)) return ROADS.filter((e) => e.when === 'trial');
  if (campaign.step >= 10) return ROADS.filter((e) => e.when === 'boss');
  return ROADS.filter((e) => e.when === 'road');
}

export function ensureRoad(hero, members) {
  const c = hero.campaign;
  const key = `${c.act}.${c.step}`;
  if (!c.road || c.road.key !== key) {
    const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'road'));
    let pool = poolFor(c);
    const seen = new Set(c.seenRoads || []);
    const fresh = pool.filter((e) => !seen.has(e.id));
    if (fresh.length) pool = fresh;
    const weights = pool.map(() => 1);
    c.road = { key, id: pool[weighted(rng, weights)].id, done: false };
  }
  return present(c.road.id, hero, members);
}
export function roadIsOpen(hero) {
  const c = hero.campaign;
  if (!c) return false;
  const key = `${c.act}.${c.step}`;
  const opening = c.act === 1 && c.step === 1 && !(c.wins > 0);
  if (!opening && !roadSlot(c)) return false; // most fights follow straight on from camp
  return !(c.road && c.road.key === key && c.road.done);
}
function present(id, hero, members) {
  const ev = ROADS.find((e) => e.id === id) || ROADS[0];
  const ctx = { campaign: hero.campaign, members, act: hero.campaign.act };
  return {
    id: ev.id, title: ev.title, kicker: ev.kicker || 'The road has a word', tell: ev.tell(ctx), stat: ev.stat || null, hard: !!ev.hard, foe: ev.foe || null,
    choices: ev.choices.map((ch) => ({
      id: ch.id, test: !!ch.test,
      label: ch.label(ctx),
      hint: ch.hint(ctx),
      ok: ch.can ? ch.can(ctx) : true,
    })),
  };
}
export function chooseRoad(hero, members, choiceId) {
  const c = hero.campaign;
  const ev = ROADS.find((e) => e.id === c.road?.id);
  const choice = ev?.choices.find((ch) => ch.id === choiceId);
  if (!ev || !choice) return null;
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'road-choice', choiceId));
  const ctx = { campaign: c, members, rng, act: c.act, hero };
  if (choice.can && !choice.can(ctx)) return null;
  let text; let trial = null;
  if (choice.test) { // a test: pay any stake, roll the champion's dice against the other side's, then win or lose
    const stake = choice.stake ? choice.stake(ctx) : 0;
    if (stake && !payCompany(members, stake)) return null;
    trial = rollTrial({ campaign: c, members, stat: ev.stat, hard: ev.hard, chooser: hero, key: `trial:${choiceId}` });
    text = trial.win ? choice.win(ctx, trial) : choice.lose(ctx, trial);
    c.road.trial = { ...trial, choiceId, stake, rematched: false };
  } else text = choice.apply(ctx);
  c.road.done = true;
  c.seenRoads = [...(c.seenRoads || []), ev.id].slice(-10);
  return { title: ev.title, text, trial: trial ? { ...trial, foe: ev.foe, stake: c.road.trial.stake, canRematch: !trial.win, rematchCost: rematchCost(c.act) } : null };
}
// After a lost test, one rematch for a little gold. A win pays out as usual; the first loss still stands.
export function rematchInfo(hero, members) {
  const c = hero.campaign; const t = c.road?.trial;
  if (!t || t.win || t.rematched) return null;
  const cost = rematchCost(c.act); return { cost, ok: companyGold(members) >= cost };
}
export function rematchTrial(hero, members) {
  const c = hero.campaign; const info = rematchInfo(hero, members); if (!info?.ok) return null;
  const ev = ROADS.find((e) => e.id === c.road.id); const choice = ev?.choices.find((ch) => ch.id === c.road.trial.choiceId); if (!choice) return null;
  payCompany(members, info.cost);
  const ctx = { campaign: c, members, rng: makeRng(hashSeed(c.seed, c.act, c.step, 'rematch')), act: c.act, hero };
  const r = rollTrial({ campaign: c, members, stat: ev.stat, hard: ev.hard, chooser: hero, key: `trial:${choice.id}`, attempt: 1 });
  const stake = c.road.trial.stake || 0;
  let text;
  if (r.win) text = choice.win(ctx, r); else text = `A rematch, ${roll2(r)}. No luck this time either. Some days the dice have other plans.`;
  c.road.trial = { ...r, choiceId: choice.id, stake, rematched: true };
  return { title: ev.title, text, trial: { ...r, foe: ev.foe, stake, canRematch: false, rematchCost: info.cost } };
}

// ------------------------------------------------------------------------------------------------ tests on the road (trials.js)
// Before the elite (and on step 8 where the story locks that fight) the road asks for wisdom (the head die), strength (both hands) or
// speed (the feet). A test choice rolls the champion's dice against the other side's; `win` / `lose` say what happened, and both
// should be felt in the next fight. Plain choices (walk on) work like any road event.
const gp = (act, n) => n * Math.min(3, Math.max(1, act)); // gold grows with the act
const findHero = (ctx, name) => ctx.members.find((m) => m.name === name) || ctx.members[0];
function givePotion(ctx, name) {
  const m = findHero(ctx, name); const have = potionStock(m); const max = potionMaxOf(m);
  if (have < max) { m.potions = have + 1; return `${m.name} tucks a healing potion into the belt.`; }
  const g = gp(ctx.act, 10); grantCompany([m], g); return `${m.name}’s belt is already full, so the gift becomes ${g} gold instead.`;
}
const roll2 = (r) => `${r.heroTotal} against ${r.oppTotal}`;

const statWord = { wisdom: 'head', strength: 'hands', speed: 'feet' };
void statWord;
export const TRIALS = [
  // ---- WISDOM: the head die
  {
    id: 't-troll', foe: 'The bridge troll', stat: 'wisdom', kicker: 'A test of wisdom', title: 'The Riddling Troll',
    tell: (ctx) => `A troll sits on a bridge with a riddle and a club. "Answer right, I tell you where monsters are soft. Answer wrong, I use the club. Gently. Mostly." ${someone(ctx, 'troll')} cracks their knuckles, which does not help with riddles.`,
    choices: [
      { id: 'answer', test: true, label: () => 'Answer the riddle', hint: (c) => oddsLine(c.members, 'wisdom', c.act),
        win: (ctx, r) => { const n = by(ctx, PIERCE); bless(ctx, { id: 'troll', name: 'The troll’s secret', text: `+${n} pierce every round.`, fights: 1, pierce: n }); note(ctx, 'The Riddling Troll', `${r.who} out-riddled a troll.`); return `"An echo!" says ${r.who}, ${roll2(r)}. The troll sulks, then whispers where monsters are soft. Next fight: +${n} pierce every round.`; },
        lose: (ctx, r) => { const w = by(ctx, WOUND); bless(ctx, { id: 'club', name: 'Clubbed, gently', text: `${r.who} starts ${w} health down.`, fights: 1, wound: w, who: r.who, bane: true }); note(ctx, 'The Riddling Troll', `${r.who} lost a riddle and met the club.`); return `Wrong, ${roll2(r)}. The club is gentle-ish. Next fight, ${r.who} starts ${w} health down.`; } },
      { id: 'around', label: () => 'Wade the river instead', hint: () => 'No test. Wet socks.', apply: (ctx) => { note(ctx, 'The Riddling Troll', 'Waded the river.'); return 'The river is cold and full of opinions. The troll shouts the answer after you anyway. It was "an echo".'; } },
    ],
  },
  {
    id: 't-mushroom', foe: 'The mushrooms', stat: 'wisdom', kicker: 'A test of wisdom', title: 'Which Mushroom?',
    tell: (ctx) => `A ring of mushrooms. Some heal. Some make you hear colours. ${someone(ctx, 'shroom')} is sure they know which is which. ${someone(ctx, 'shroom')} is usually sure.`,
    choices: [
      { id: 'forage', test: true, label: () => 'Pick the good ones', hint: (c) => oddsLine(c.members, 'wisdom', c.act),
        win: (ctx, r) => { const t = potionsAll(ctx); note(ctx, 'Which Mushroom?', `${r.who} picked the good mushrooms.`); return `${r.who} picks well, ${roll2(r)}, and brews them up. ${t}`; },
        lose: (ctx, r) => { const s = by(ctx, SICK); bless(ctx, { id: 'shroom', name: 'The wrong mushroom', text: `${r.who} loses ${s} health every round.`, fights: 1, sick: s, who: r.who, bane: true }); note(ctx, 'Which Mushroom?', `${r.who} ate the wrong one.`); return `${r.who} eats the wrong one, ${roll2(r)}, and hears purple. Next fight, ${r.who} loses ${s} health every round, and hiccups.`; } },
      { id: 'leave', label: () => 'Leave the mushrooms alone', hint: () => 'No test.', apply: (ctx) => { note(ctx, 'Which Mushroom?', 'Left the mushrooms.'); return 'Wise. Probably. The mushrooms look disappointed, which is its own warning.'; } },
    ],
  },
  // ---- STRENGTH: both hands
  {
    id: 't-tug', foe: 'The goblins', stat: 'strength', kicker: 'A test of strength', title: 'The Goblins’ Tug-of-War',
    tell: (ctx) => `A rope across a muddy ditch. On the far side, goblins jeer. "Pull us over and we run off. Lose, and we follow you to your next fight." ${someone(ctx, 'tug')} looks at the mud. The mud looks back.`,
    choices: [
      { id: 'pull', test: true, label: () => 'Grab the rope and pull', hint: (c) => oddsLine(c.members, 'strength', c.act),
        win: (ctx, r) => { const n = by(ctx, OPEN); bless(ctx, { id: 'tug', name: 'Goblins in the mud', text: `Round 1: +${n} attack.`, fights: 1, openingAtk: n }); note(ctx, 'Tug-of-War', `${r.who} pulled the goblins into the ditch.`); return `Heave! ${r.who} drags the whole band face-first into the mud, ${roll2(r)}. Your blood is up: round 1 of the next fight, +${n} attack.`; },
        lose: (ctx, r) => { ctx.campaign.ambush = [{ id: 'goblin', count: 1 }]; note(ctx, 'Tug-of-War', 'Lost a tug-of-war; a goblin followed them.'); return `The rope wins, ${roll2(r)}, and ${r.who} slides into the ditch. A delighted goblin follows you to the next fight and joins in.`; } },
      { id: 'leave', label: () => 'Cut the rope and walk on', hint: () => 'No test.', apply: (ctx) => { note(ctx, 'Tug-of-War', 'Cut the rope.'); return 'Snip. Three goblins sit down very suddenly. They do not follow; they are arguing about whose fault it was.'; } },
    ],
  },
  {
    id: 't-cart', foe: 'The stuck cart', stat: 'strength', kicker: 'A test of strength', title: 'The Stuck Cart',
    tell: () => 'A farmer’s cart is stuck to the axles. "Push it out and you can borrow my late husband’s shield," she says. "He won’t need it. He is in the cart, also stuck, eating a pie."',
    choices: [
      { id: 'push', test: true, label: () => 'Put your shoulders into it', hint: (c) => oddsLine(c.members, 'strength', c.act),
        win: (ctx, r) => { const n = by(ctx, OPEN); bless(ctx, { id: 'cart', name: 'A borrowed shield', text: `Round 1: +${n} block.`, fights: 1, openingBlock: n }); note(ctx, 'The Stuck Cart', `${r.who} pushed a cart out of the mud.`); return `Squelch, pop! Out it comes, ${roll2(r)}. The husband waves his pie. Round 1 of the next fight: +${n} block from his shield.`; },
        lose: (ctx, r) => { const w = by(ctx, WOUND); bless(ctx, { id: 'strain', name: 'Pulled something', text: `${r.who} starts ${w} health down.`, fights: 1, wound: w, who: r.who, bane: true }); note(ctx, 'The Stuck Cart', `${r.who} pulled something.`); return `The cart wins, ${roll2(r)}. ${r.who} pulls something important. Next fight, ${r.who} starts ${w} health down.`; } },
      { id: 'leave', label: () => 'Wish them luck and walk on', hint: () => 'No test.', apply: (ctx) => { note(ctx, 'The Stuck Cart', 'Walked past a stuck cart.'); return '"Lovely," says the husband, through pie. You do not look back. You hear him eat the whole thing.'; } },
    ],
  },
  // ---- SPEED: the feet
  {
    id: 't-chicken', foe: 'Duchess the chicken', stat: 'speed', kicker: 'A test of speed', title: 'Catch That Chicken!',
    tell: (ctx) => `A prize chicken has escaped. "Catch Duchess and you can borrow my racing boots!" cries the owner. Duchess looks at ${someone(ctx, 'hen')} and smirks, which chickens should not be able to do.`,
    choices: [
      { id: 'chase', test: true, label: () => 'Chase the chicken', hint: (c) => oddsLine(c.members, 'speed', c.act),
        win: (ctx, r) => { const n = by(ctx, BOOTS); bless(ctx, { id: 'racing', name: 'Racing boots', text: `Feet roll a d${n}.`, fights: 1, feet: n }); note(ctx, 'Catch That Chicken!', `${r.who} caught Duchess.`); return `${r.who} dives, ${roll2(r)}, and comes up holding an outraged chicken. The racing boots are yours for a fight: your feet roll a d${n}.`; },
        lose: (ctx, r) => { const s = by(ctx, SICK); bless(ctx, { id: 'feathers', name: 'Feathers up the nose', text: `${r.who} loses ${s} health every round.`, fights: 1, sick: s, who: r.who, bane: true }); note(ctx, 'Catch That Chicken!', `${r.who} lost to a chicken.`); return `Duchess wins, ${roll2(r)}. ${r.who} gets a nose full of feathers and cannot stop sneezing. Next fight, ${r.who} loses ${s} health every round.`; } },
      { id: 'leave', label: () => 'Let Duchess live free', hint: () => 'No test.', apply: (ctx) => { note(ctx, 'Catch That Chicken!', 'Let the chicken go.'); return 'Duchess struts off into the sunset. Somewhere, a fox reconsiders its life choices.'; } },
    ],
  },
  {
    id: 't-slide', foe: 'The rockslide', stat: 'speed', hard: true, kicker: 'A test of speed', title: 'Rockslide!',
    tell: (ctx) => `A rumble, then the hillside starts to move. ${joinNames(ctx.members)} can run for the cave ahead, which glows faintly, or go back the long way round.`,
    choices: [
      { id: 'run', test: true, label: () => 'Run for the glowing cave', hint: (c) => oddsLine(c.members, 'speed', c.act, true),
        win: (ctx, r) => { const n = by(ctx, MAGIC); bless(ctx, { id: 'moss', name: 'Glowing moss', text: `+${n} magic at the start.`, fights: 1, startMagic: n }); note(ctx, 'Rockslide!', `${r.who} outran a rockslide.`); return `${r.who} makes it, ${roll2(r)}, into a cave full of glowing moss that tingles. Next fight: start with ${n} more magic.`; },
        lose: (ctx, r) => { const w = by(ctx, WOUND); bless(ctx, { id: 'pebbles', name: 'Bruised by rocks', text: `Start ${w} health down.`, fights: 1, wound: w, bane: true }); note(ctx, 'Rockslide!', 'Caught by a rockslide.'); return `Too slow, ${roll2(r)}. Nobody is squashed, but everybody is bruised. Next fight starts ${w} health down.`; } },
      { id: 'back', label: () => 'Go back the long way', hint: () => 'No test. It takes all afternoon.', apply: (ctx) => { note(ctx, 'Rockslide!', 'Took the long way round.'); return 'It takes all afternoon, and the cave was probably lovely. You will never know.'; } },
    ],
  },
];
for (const t of TRIALS) ROADS.push({ ...t, when: 'trial' });
