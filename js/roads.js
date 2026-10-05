// The computer is the road. Events are seeded from the campaign, so the same company
// meets the same scene every time they reload, and a choice is the only thing that branches.
import { CLASSES, WEAPONS, RARITY } from './data.js';
import { gambleOffer, line, revealLine, GAMBLE_ODDS } from './auction.js';
import {
  hashSeed, makeRng, makeWeapon, companyGold, payCompany, grantCompany, grantXpEach,
} from './engine.js';

export function joinNames(members) {
  const n = members.map((m) => m.name);
  if (n.length <= 1) return n[0] || 'you';
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}
const has = (members, cls) => members.some((m) => m.cls === cls);
const named = (members, cls) => members.find((m) => m.cls === cls)?.name;
const be = (members, one, many) => (members.length > 1 ? many : one);
const classLine = (members) => members.map((m) => CLASSES[m.cls].name).join(', ');

function note(ctx, title, text) {
  const c = ctx.campaign;
  c.chronicle = [{ act: c.act, step: c.step, title, text }, ...(c.chronicle || [])].slice(0, 18);
}
function bless(ctx, bl) {
  ctx.campaign.blessings = [...(ctx.campaign.blessings || []), bl];
}
function giveGear(ctx, id, rarity) {
  const inst = makeWeapon(id, rarity, ctx.rng);
  const m = [...ctx.members].sort((a, b) => a.bag.length - b.bag.length || a.name.localeCompare(b.name))[0];
  m.bag.push(inst);
  return { inst, who: m.name };
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
    tell: ({ members }) => `${joinNames(members)} ${be(members, 'comes', 'come')} to a gate of nine standing stones, set in the shape of a body. A head stone. A heart stone. A stone for each hand and each foot, and four darker stones at the corners, waiting for weapons and gifts. The dice warm when they are set into the niches. Far down the ash road, something turns its head.`,
    choices: [
      {
        id: 'march',
        label: () => 'Set the dice in the stones and march',
        hint: () => 'The first round of your first fight hits harder.',
        apply: (ctx) => {
          bless(ctx, { id: 'gate', name: 'Nine-stone push', text: 'Round 1: +3 attack.', fights: 1, openingAtk: 3 });
          note(ctx, 'The Nine-Stone Gate', 'The company set their dice into the gate. The stones pushed back.');
          return 'The heart stone answers with a low knock, like a fist on a shield. For the first round of the fight ahead, every hero swings at +3 attack.';
        },
      },
    ],
  },
  {
    id: 'shrine', when: 'road', title: 'Shrine of the Cross',
    tell: ({ members }) => `A roadside shrine repeats the same shape: nine cups, one for each die of a person. Rain has filled the heart cup. ${joinNames(members)} can drink, or tip the rain out and take the coin someone left underneath.`,
    choices: [
      {
        id: 'drink',
        label: () => 'Drink from the heart cup',
        hint: () => 'Next fight: +2 attack and +2 block.',
        apply: (ctx) => {
          bless(ctx, { id: 'shrine', name: 'Heart-cup', text: '+2 attack, +2 block.', fights: 1, atk: 2, block: 2 });
          note(ctx, 'Shrine of the Cross', 'They drank. The rain tasted like iron and honey.');
          return 'Warmth runs from the cup into the wrists and the ankles. Next fight, every hero has +2 attack and +2 block.';
        },
      },
      {
        id: 'coin',
        label: () => 'Take the coin under the cup',
        hint: () => 'Gain gold. Next fight starts a little wounded.',
        apply: (ctx) => {
          grantCompany(ctx.members, 14);
          bless(ctx, { id: 'shrine-cut', name: 'Nicked by the shrine', text: 'Start the next fight 4 HP down.', fights: 1, wound: 4 });
          note(ctx, 'Shrine of the Cross', 'They took the coin. The shrine took a little blood.');
          return 'Fourteen gold, still warm from a stranger’s hand. The cup’s rim cuts the thumb that lifted it. Next fight begins 4 HP down.';
        },
      },
      {
        id: 'pass',
        label: () => 'Leave the shrine as you found it',
        hint: () => 'Nothing gained, nothing owed.',
        apply: (ctx) => { note(ctx, 'Shrine of the Cross', 'They let the rain keep the cup.'); return 'The rain goes on filling the heart cup. The road does not mind.'; },
      },
    ],
  },
  {
    id: 'toll', when: 'road', title: 'The Red Toll',
    tell: ({ members, act }) => `Goblins have roped a ${act >= 2 ? 'bone' : 'charred'} gate across the road. The shortest one shakes a tin cup at ${joinNames(members)}. “Cross costs coin. Or blood. Or you can try the ditch, if you like snakes.”`,
    choices: [
      {
        id: 'pay',
        label: () => 'Pay 10 gold and pass',
        hint: () => 'The quiet choice.',
        can: (ctx) => companyGold(ctx.members) >= 10,
        apply: (ctx) => {
          payCompany(ctx.members, 10);
          note(ctx, 'The Red Toll', 'They paid. The rope came down.');
          return 'The goblin bites the coin, nods, and drops the rope. No fight. No story. Sometimes that is the treasure.';
        },
      },
      {
        id: 'charge',
        label: () => 'Kick the gate in',
        hint: () => 'An extra goblin joins the next battle. You strike first.',
        apply: (ctx) => {
          ctx.campaign.ambush = [{ id: 'goblin', count: 1 }];
          bless(ctx, { id: 'charge', name: 'Kicked the gate', text: 'Round 1: +4 attack.', fights: 1, openingAtk: 4 });
          note(ctx, 'The Red Toll', 'They kicked the gate. A goblin ran ahead to warn the next camp.');
          return 'The rope snaps. One goblin sprints toward the next fight and will be waiting there. You hit so fast that the first round gains +4 attack.';
        },
      },
      {
        id: 'ditch',
        label: () => 'Slip through the ditch',
        hint: () => 'A coin flip between a clean escape and a nasty bite.',
        apply: (ctx) => {
          const snake = ctx.rng() < 0.5;
          if (snake) {
            bless(ctx, { id: 'snake', name: 'Ditch bite', text: 'Start 5 HP down.', fights: 1, wound: 5 });
            note(ctx, 'The Red Toll', 'The ditch had a snake.');
            return 'It was not a metaphor. Something in the mud bites. Next fight starts 5 HP down, but the toll never sees you.';
          }
          grantCompany(ctx.members, 6);
          note(ctx, 'The Red Toll', 'The ditch was only mud, and somebody’s dropped purse.');
          return 'Mud, roots, and a dropped purse worth 6 gold. The goblins keep shaking their cup at an empty road.';
        },
      },
    ],
  },
  {
    id: 'scout', when: 'road', title: 'The Wounded Scout',
    tell: ({ members }) => `A scout from a burned village is propped against a milestone, one boot off, the ankle wrong. She looks at ${joinNames(members)} — ${classLine(members)} — and decides you are the best chance she has had all day.`,
    choices: [
      {
        id: 'bind',
        label: () => 'Bind the ankle (8 gold in bandages and brandy)',
        hint: () => 'She talks. Next fight starts with +1 Magic, and you earn a little XP.',
        can: (ctx) => companyGold(ctx.members) >= 8,
        apply: (ctx) => {
          payCompany(ctx.members, 8);
          grantXpEach(ctx.members, 6);
          bless(ctx, { id: 'scout', name: 'Scout’s warning', text: 'Start with +1 Magic.', fights: 1, startMagic: 1 });
          note(ctx, 'The Wounded Scout', 'They bound the ankle. She told them where the big one stands.');
          return 'She hisses, drinks, and talks. The next camp of enemies keeps its champion in the back. Everyone gains 6 XP, and the next fight starts with +1 Magic.';
        },
      },
      {
        id: 'carry',
        label: () => 'Carry her as far as the next rise',
        hint: () => 'No gold. Next fight: +3 block. You are tired in the arms.',
        apply: (ctx) => {
          bless(ctx, { id: 'carry', name: 'A person on your shoulder', text: '+3 block, start 2 HP down.', fights: 1, block: 3, wound: 2 });
          grantXpEach(ctx.members, 4);
          note(ctx, 'The Wounded Scout', 'They carried her. The rise had a friendly fire and no more road for her.');
          return 'She is light, and then she is not. Over the rise there is a hay cart and a cousin. Next fight you brace harder (+3 block) and start 2 HP down from the weight. Each hero gains 4 XP.';
        },
      },
      {
        id: 'leave',
        label: () => 'Leave her the waterskin and walk on',
        hint: () => 'A small kindness. Nothing else.',
        apply: (ctx) => { note(ctx, 'The Wounded Scout', 'They left the waterskin.'); return 'She lifts two fingers off the milestone. It is not a blessing and not a curse. The road continues.'; },
      },
    ],
  },
  {
    id: 'chest', when: 'road', title: 'The Locked Reliquary',
    tell: ({ members }) => `In a ditch of cinders sits a reliquary the size of a lunch pail, banded in iron, lid stamped with a hand and a foot. ${has(members, 'ranger') ? `${named(members, 'ranger')} has already found the hinge.` : `${joinNames(members)} ${be(members, 'gathers', 'gather')} around it.`} It is either a gift or a jaw.`,
    choices: [
      {
        id: 'force',
        label: () => 'Pry it open',
        hint: () => 'A weapon, and a wound for whoever is nearest.',
        apply: (ctx) => {
          const gift = giveGear(ctx, ['sword', 'spear', 'dagger', 'bracer'][Math.floor(ctx.rng() * 4)], ctx.rng() < 0.25 ? 2 : 1);
          const victim = ctx.members[Math.floor(ctx.rng() * ctx.members.length)];
          bless(ctx, { id: 'reliquary', name: 'Reliquary snap', text: `${victim.name} starts 6 HP down.`, fights: 1, wound: 6, who: victim.name });
          note(ctx, 'The Locked Reliquary', `${gift.who} took the prize. ${victim.name} took the snap.`);
          return `The lid jumps like a trap and catches ${victim.name} across the knuckles. Inside is a ${['Bronze', 'Silver', 'Gold', 'Diamond'][gift.inst.rarity]} piece for ${gift.who}’s pack. ${victim.name} starts the next fight 6 HP down.`;
        },
      },
      {
        id: 'finesse',
        label: (ctx) => has(ctx.members, 'wizard') || has(ctx.members, 'ranger') ? 'Open it the clever way' : 'Work the lock with a splinter',
        hint: (ctx) => (has(ctx.members, 'wizard') || has(ctx.members, 'ranger')) ? 'Your clever hands have the better of it.' : 'Half the time it opens. Half the time it bites.',
        apply: (ctx) => {
          const clever = has(ctx.members, 'wizard') || has(ctx.members, 'ranger');
          const opens = clever || ctx.rng() < 0.5;
          if (!opens) {
            bless(ctx, { id: 'lockbite', name: 'Lock-bite', text: 'Start 3 HP down.', fights: 1, wound: 3 });
            note(ctx, 'The Locked Reliquary', 'The lock won.');
            return 'The splinter snaps. The needle in the lock finds a finger. Nothing inside is yours. Next fight starts 3 HP down.';
          }
          const gift = giveGear(ctx, clever ? 'longsword' : 'sword', clever ? 1 : 0);
          note(ctx, 'The Locked Reliquary', `${gift.who} opened it clean.`);
          return `The lock gives up like it was tired of its job. ${gift.who} stows a ${['Bronze', 'Silver', 'Gold', 'Diamond'][gift.inst.rarity]} weapon. Nobody bleeds.`;
        },
      },
      {
        id: 'leave',
        label: () => 'Leave it for a worse adventurer',
        hint: () => 'Walk on.',
        apply: (ctx) => { note(ctx, 'The Locked Reliquary', 'They left the box in the ditch.'); return 'You set it back in the cinders. Some gifts can wait until you are the sort of person who wants them.'; },
      },
    ],
  },
  {
    id: 'coals', when: 'road', title: 'Coals of a Dead Camp',
    tell: ({ members, act }) => `Someone camped here last night and left in a hurry. The fire is a red eye in grey ash. ${act >= 2 ? 'The bedrolls are empty in a way that suggests their owners stood up and forgot to bring their bodies.' : 'A bowstring, snapped, lies across a tin plate.'} ${joinNames(members)} ${be(members, 'crouches', 'crouch')} out of the wind.`,
    choices: [
      {
        id: 'read',
        label: (ctx) => has(ctx.members, 'wizard') ? `${named(ctx.members, 'wizard')} reads the coals` : 'Stir the coals and look for a sign',
        hint: () => 'Next fight, the first reroll reaches one die further. Stagger comes easier.',
        apply: (ctx) => {
          bless(ctx, { id: 'coals', name: 'Read the coals', text: '+3 stagger.', fights: 1, stagger: 3, startMagic: has(ctx.members, 'wizard') ? 1 : 0 });
          note(ctx, 'Coals of a Dead Camp', 'The coals showed a wind-up, and how to break it.');
          const extra = has(ctx.members, 'wizard') ? ' The wizard pulls 1 Magic out of the heat as well.' : '';
          return `In the ash, a bootprint faces the wrong way, and a charred diagram of a raised club. Next fight, stagger is +3.${extra}`;
        },
      },
      {
        id: 'share',
        label: () => 'Warm your hands and share what is in the pot',
        hint: () => 'Next fight: +4 HP at the start. The pot was not empty.',
        apply: (ctx) => {
          bless(ctx, { id: 'pot', name: 'A shared pot', text: 'Start with +4 HP.', fights: 1, startHp: 4 });
          note(ctx, 'Coals of a Dead Camp', 'They ate. It helped.');
          return 'Beans, smoke, and a little courage. Next fight, everyone starts with 4 extra HP, above and beyond the usual full rest.';
        },
      },
      {
        id: 'rob',
        label: () => 'Pocket what the sleepers left',
        hint: () => 'Gold now. The next shop charges more.',
        apply: (ctx) => {
          grantCompany(ctx.members, 16);
          ctx.campaign.campFlags = { ...(ctx.campaign.campFlags || {}), hike: (ctx.campaign.campFlags?.hike || 0) + 0.2 };
          note(ctx, 'Coals of a Dead Camp', 'They robbed a cold camp. Word got to the peddler.');
          return 'Sixteen gold in a sock. By the time you reach a peddler, the prices have heard about you and climb by a fifth.';
        },
      },
    ],
  },
  {
    id: 'ridge', when: 'road', title: 'Something on the Ridge',
    tell: ({ members }) => `A howl walks the ridge above the road, too big for a wolf and too pleased with itself. ${has(members, 'ranger') ? `${named(members, 'ranger')} is already counting the echoes.` : `${joinNames(members)} ${be(members, 'stops', 'stop')} without being asked to.`}`,
    choices: [
      {
        id: 'snare',
        label: () => 'Set a snare and move on',
        hint: () => 'Next fight, foes hit 2 softer.',
        apply: (ctx) => {
          bless(ctx, { id: 'snare', name: 'Ridge snare', text: 'Foes hit 2 softer.', fights: 1 });
          // weaken is a card mod, not a standing boon. Encode it as block-equivalent softness by lowering incoming pressure:
          // the engine boon has no weaken field. Add it.
          ctx.campaign.blessings[ctx.campaign.blessings.length - 1].weaken = 2;
          note(ctx, 'Something on the Ridge', 'The snare sang once, far behind them.');
          return 'Wire, a bent sapling, and a piece of dried meat. Whatever was on the ridge stays there. Next fight, every monster hits 2 softer.';
        },
      },
      {
        id: 'hunt',
        label: () => 'Go up and make it come down',
        hint: () => 'A wolf joins the next battle. You gain extra XP if you meant it.',
        apply: (ctx) => {
          ctx.campaign.ambush = [...(ctx.campaign.ambush || []), { id: 'wolf', count: 1 }];
          grantXpEach(ctx.members, 8);
          note(ctx, 'Something on the Ridge', 'They invited the howl down onto the road.');
          return 'You do not catch it. It catches the idea of you, and it will be in the next fight. Everyone gains 8 XP for the nerve.';
        },
      },
      {
        id: 'quiet',
        label: () => 'Walk quietly until the ridge is behind you',
        hint: () => 'No fight, no prize.',
        apply: (ctx) => { note(ctx, 'Something on the Ridge', 'They let the howl keep the high ground.'); return 'The howl loses interest. Pride is intact on both sides.'; },
      },
    ],
  },
  {
    id: 'banner', when: 'road', title: 'A Broken Banner',
    tell: ({ members }) => `A knight’s banner is stuck in a cairn, the sigil a white cross on red, slashed end to end. ${has(members, 'knight') ? `${named(members, 'knight')} knows the oath stitched along the hem.` : 'The oath along the hem is still readable.'} “Stand in front. The others get to live.”`,
    choices: [
      {
        id: 'swear',
        label: (ctx) => has(ctx.members, 'knight') ? `${named(ctx.members, 'knight')} swears it` : 'Swear it together',
        hint: () => 'Next fight: +3 block, and the one who swears draws a harder share of attention only by their own Feet, as always.',
        apply: (ctx) => {
          bless(ctx, { id: 'oath', name: 'The cairn oath', text: '+3 block.', fights: 1, block: 3 });
          const who = named(ctx.members, 'knight') || ctx.members[0].name;
          grantXpEach(ctx.members.filter((m) => m.name === who), 6);
          note(ctx, 'A Broken Banner', `${who} swore to stand in front.`);
          return `${who} ties a strip of the banner around a wrist. Next fight the company blocks at +3. ${who} gains 6 XP. Feet still decide who the monsters actually reach.`;
        },
      },
      {
        id: 'salvage',
        label: () => 'Cut the silk free and sell the thread',
        hint: () => 'Gold. The next fight you are a little easier to frighten: −1 Magic at the start.',
        apply: (ctx) => {
          grantCompany(ctx.members, 12);
          bless(ctx, { id: 'silk', name: 'A lighter oath', text: 'Start with 1 less Magic.', fights: 1, startMagic: -1 });
          note(ctx, 'A Broken Banner', 'They sold the thread. The oath stayed in the cairn.');
          return 'Twelve gold of good silk. The cairn looks smaller without its flag. Next fight starts with 1 less Magic.';
        },
      },
      {
        id: 'bury',
        label: () => 'Lay the banner flat and weigh it with a stone',
        hint: () => 'A quiet respect. +2 HP at the start of the next fight.',
        apply: (ctx) => {
          bless(ctx, { id: 'bury', name: 'Stone on silk', text: 'Start with +2 HP.', fights: 1, startHp: 2 });
          note(ctx, 'A Broken Banner', 'They buried the banner under one more stone.');
          return 'No speech. Next fight starts with +2 HP, the sort of health that comes from having done one decent thing.';
        },
      },
    ],
  },
  {
    id: 'cart', when: 'road', title: 'The Cart in the Ditch',
    tell: ({ members }) => `A cart of flour and nails has slid off the road. The family is trying to lift it with a rope that has already given up. A child is sitting on the flour so it will not be stolen, which is optimistic. They look at ${joinNames(members)} the way people look at armed strangers.`,
    choices: [
      {
        id: 'lift',
        label: () => 'Put your shoulders under it',
        hint: () => 'Costs nothing but effort. Next fight: +2 attack. A little XP.',
        apply: (ctx) => {
          bless(ctx, { id: 'lift', name: 'Under the axle', text: '+2 attack.', fights: 1, atk: 2 });
          grantXpEach(ctx.members, 5);
          note(ctx, 'The Cart in the Ditch', 'They lifted it. The child got down off the flour.');
          return 'The axle screams, then the wheel finds the road. Nobody pays you. Next fight, +2 attack, and 5 XP each for a good use of a back.';
        },
      },
      {
        id: 'buy',
        label: () => 'Buy the flour at a fair price (12 gold)',
        hint: () => 'They eat. You carry supplies: start the next fight at +6 HP.',
        can: (ctx) => companyGold(ctx.members) >= 12,
        apply: (ctx) => {
          payCompany(ctx.members, 12);
          bless(ctx, { id: 'flour', name: 'A sack of flour', text: 'Start with +6 HP.', fights: 1, startHp: 6 });
          note(ctx, 'The Cart in the Ditch', 'They bought the flour. The family bought the evening.');
          return 'Twelve gold changes pockets. You eat better than heroes usually do. Next fight starts with +6 HP.';
        },
      },
      {
        id: 'tax',
        label: () => 'Call it a road tax and take a sack',
        hint: () => 'Gold and a mean reputation. The peddler hikes prices.',
        apply: (ctx) => {
          grantCompany(ctx.members, 10);
          ctx.campaign.campFlags = { ...(ctx.campaign.campFlags || {}), hike: (ctx.campaign.campFlags?.hike || 0) + 0.25 };
          note(ctx, 'The Cart in the Ditch', 'They took a sack. The child will remember the faces.');
          return 'Ten gold of flour you will sell later. Stories of you arrive at the next peddler first, and the prices go up by a quarter.';
        },
      },
    ],
  },
  {
    id: 'riddle', when: 'road', title: 'The Peddler’s Riddle',
    tell: ({ members }) => `A peddler too cheerful for this road blocks the way with a tray of bad apples and good questions. “Free sample of wisdom,” she tells ${joinNames(members)}. “I have a head, two hands and two feet, and I am strongest when I agree with myself. What am I?”`,
    choices: [
      {
        id: 'hero',
        label: () => 'A hero. Nine dice, and a cross of a person.',
        hint: () => 'That is the right answer.',
        apply: (ctx) => {
          grantCompany(ctx.members, 8);
          bless(ctx, { id: 'riddle', name: 'The peddler’s sweet', text: 'Start with +2 Magic.', fights: 1, startMagic: 2 });
          note(ctx, 'The Peddler’s Riddle', 'They answered with themselves. She liked that.');
          return 'She claps once, which is a lot for her. Eight gold, and a glass marble that is really a spark: next fight starts with +2 Magic.';
        },
      },
      {
        id: 'sword',
        label: () => 'A sword with opinions.',
        hint: () => 'Poetic. Wrong.',
        apply: (ctx) => {
          grantCompany(ctx.members, 2);
          note(ctx, 'The Peddler’s Riddle', 'A sword was not the answer. She paid them for the attempt.');
          return '“Swords don’t have feet,” she says, and flicks you 2 gold for the entertainment. The apples were fine.';
        },
      },
      {
        id: 'king',
        label: () => 'The Goblin King, unfortunately.',
        hint: () => 'Funny. Still wrong.',
        apply: (ctx) => {
          note(ctx, 'The Peddler’s Riddle', 'They blamed the Goblin King. The peddler did not disagree, and did not pay.');
          return 'She considers it. “He wishes,” she says, and lets you pass. No prize. The joke was its own reward, which is what people say when there is no reward.';
        },
      },
    ],
  },
  {
    id: 'graves', when: 'road', title: 'Graves that Breathe',
    tell: ({ members, act }) => `${act >= 2 ? 'This far into the crypt, the graves do not bother pretending.' : 'The cemetery is only three graves and a low wall, but one of the mounds is rising and falling.'} ${has(members, 'dwarf') ? `${named(members, 'dwarf')} plants both boots and does not like it.` : `${joinNames(members)} ${be(members, 'stops', 'stop')} at the wall.`}`,
    choices: [
      {
        id: 'seal',
        label: () => 'Seal the mound with a stone and a prayer',
        hint: () => 'Next fight: +4 stagger. Hard things break.',
        apply: (ctx) => {
          bless(ctx, { id: 'seal', name: 'A sealed mound', text: '+4 stagger.', fights: 1, stagger: 4 });
          note(ctx, 'Graves that Breathe', 'They sealed it. The breathing stopped.');
          return 'The mound sighs, then forgets how. Next fight, stagger is +4. Wind-ups are for breaking.';
        },
      },
      {
        id: 'loot',
        label: () => 'Dig. Graves keep jewelry.',
        hint: () => 'Gold, a chill, and a wound.',
        apply: (ctx) => {
          grantCompany(ctx.members, 18);
          bless(ctx, { id: 'dig', name: 'Grave-chill', text: 'Start 5 HP down.', fights: 1, wound: 5 });
          note(ctx, 'Graves that Breathe', 'They dug. The mound was occupied.');
          return 'A ring, a tooth, and 18 gold. A hand gives the shovel back. Next fight starts 5 HP down, and nobody wants to talk about the hand.';
        },
      },
      {
        id: 'kneel',
        label: () => 'Kneel, and do not take anything',
        hint: () => 'Next fight starts with +3 HP.',
        apply: (ctx) => {
          bless(ctx, { id: 'kneel', name: 'Three names', text: 'Start with +3 HP.', fights: 1, startHp: 3 });
          note(ctx, 'Graves that Breathe', 'They knelt. The mound settled.');
          return 'You read the three names aloud. The mound settles like a person turning over in sleep. Next fight starts with +3 HP.';
        },
      },
    ],
  },
  {
    id: 'ore', when: 'road', title: 'Starfall in the Mud',
    tell: ({ members }) => `Last night a star fell, or something that would like to be called a star. It is a fist of pale metal in a crater of glassed mud, ticking as it cools. ${joinNames(members)} ${be(members, 'feels it in the teeth', 'feel it in their teeth')}.`,
    choices: [
      {
        id: 'mine',
        label: () => 'Chip a shard free',
        hint: () => 'A fine weapon. The work leaves you 4 HP down.',
        apply: (ctx) => {
          const gift = giveGear(ctx, ['spear', 'sword', 'staff', 'bow'][Math.floor(ctx.rng() * 4)], 2);
          bless(ctx, { id: 'star', name: 'Star-burn', text: 'Start 4 HP down.', fights: 1, wound: 4 });
          note(ctx, 'Starfall in the Mud', `${gift.who} carries a piece of it.`);
          return `The shard sings and then behaves. ${gift.who} packs a Gold weapon. Everyone starts the next fight 4 HP down from the heat.`;
        },
      },
      {
        id: 'mark',
        label: () => 'Mark the crater and tell the peddler',
        hint: () => 'The next shop owes you a discount.',
        apply: (ctx) => {
          ctx.campaign.campFlags = { ...(ctx.campaign.campFlags || {}), discount: Math.min(0.4, (ctx.campaign.campFlags?.discount || 0) + 0.25) };
          grantXpEach(ctx.members, 3);
          note(ctx, 'Starfall in the Mud', 'They sold the location, not the star.');
          return 'The peddler will hear of it and knock a quarter off the next stock, glad you did not try to haggle with a meteor.';
        },
      },
      {
        id: 'leave',
        label: () => 'Let it cool without you',
        hint: () => 'Walk on.',
        apply: (ctx) => { note(ctx, 'Starfall in the Mud', 'They left the star in its crater.'); return 'By morning it will be a story. You do not need to be in every story.'; },
      },
    ],
  },
  {
    id: 'bridge', when: 'road', title: 'The Bridge of Names',
    tell: ({ members }) => `The bridge is one plank wide and covered, every board carved with a company that crossed. Some carvings are careful. Some are just a cross of five lines, a person reduced to head, hands, heart and feet. There is room for ${joinNames(members)}. The toll is a knife and a little gold, paid to nobody.`,
    choices: [
      {
        id: 'carve',
        label: () => 'Carve the company in (8 gold)',
        hint: (ctx) => ctx.campaign.carved ? 'Your names are already in the wood.' : 'Each hero permanently gains +2 max HP.',
        can: (ctx) => !ctx.campaign.carved && companyGold(ctx.members) >= 8,
        apply: (ctx) => {
          if (ctx.campaign.carved) return 'The names are already there. The wood does not take a second fee.';
          payCompany(ctx.members, 8);
          for (const m of ctx.members) m.bonusHp = Math.min(10, (m.bonusHp || 0) + 2);
          ctx.campaign.carved = true;
          note(ctx, 'The Bridge of Names', 'They carved themselves into the plank. The wood accepted it.');
          return 'Eight gold in the crack of the plank, and a name each. Everyone’s max HP rises by 2, for good. The bridge is slightly more itself.';
        },
      },
      {
        id: 'read',
        label: () => 'Read the older names instead',
        hint: () => 'XP, and +1 Magic next fight. You learn who did not come back.',
        apply: (ctx) => {
          grantXpEach(ctx.members, 7);
          bless(ctx, { id: 'names', name: 'Older names', text: 'Start with +1 Magic.', fights: 1, startMagic: 1 });
          note(ctx, 'The Bridge of Names', 'They read the plank and did not add to it.');
          return 'You say a dozen names under your breath. Each hero gains 7 XP. Next fight starts with +1 Magic, borrowed from people who do not need it anymore.';
        },
      },
      {
        id: 'hurry',
        label: () => 'Cross without touching the knife',
        hint: () => 'The bridge groans. Nothing else.',
        apply: (ctx) => { note(ctx, 'The Bridge of Names', 'They crossed without signing.'); return 'The plank dips, holds, and forgets you. That is allowed.'; },
      },
    ],
  },
  {
    id: 'omen', when: 'boss', title: 'The Night Before',
    tell: ({ members, act }) => `The night before the end of the act, the dark practices your names. ${joinNames(members)} ${be(members, 'sits', 'sit')} at a fire that will not quite catch. ${act >= 2 ? 'The Hollow Lich already knows the shape of your dice.' : 'The Goblin King is somewhere ahead, counting his bombs and his grudges.'} Nobody sleeps well. Somebody should say what the company is for.`,
    choices: [
      {
        id: 'steel',
        label: () => 'Sharpen everything and speak plainly',
        hint: () => 'The boss fight: +2 attack, +2 stagger.',
        apply: (ctx) => {
          bless(ctx, { id: 'steel', name: 'The night before', text: '+2 attack, +2 stagger.', fights: 1, atk: 2, stagger: 2 });
          note(ctx, 'The Night Before', 'They sharpened the steel and said the plan out loud.');
          return 'The fire catches after all. The boss fight begins with +2 attack and +2 stagger. You have agreed who is standing in front.';
        },
      },
      {
        id: 'song',
        label: (ctx) => has(ctx.members, 'bard') ? `${named(ctx.members, 'bard')} sings the old one` : 'Tell the story of why you came',
        hint: () => 'The boss fight starts with +5 HP and +1 Magic.',
        apply: (ctx) => {
          bless(ctx, { id: 'song', name: 'A reason', text: 'Start with +5 HP and +1 Magic.', fights: 1, startHp: 5, startMagic: 1 });
          note(ctx, 'The Night Before', 'They remembered why the dice were rolled in the first place.');
          return 'It is not a long song. The boss fight starts with +5 HP and +1 Magic, which is what courage looks like when it has to be a number.';
        },
      },
      {
        id: 'watch',
        label: () => 'Set a watch and say nothing',
        hint: () => 'The boss fight: +4 block.',
        apply: (ctx) => {
          bless(ctx, { id: 'watch', name: 'A quiet watch', text: '+4 block.', fights: 1, block: 4 });
          note(ctx, 'The Night Before', 'They kept watch. The dark did not get a free look.');
          return 'Four watches, four silences. The boss fight gains +4 block. You will see the first move coming, and you will be ready to meet it.';
        },
      },
    ],
  },
  {
    id: 'crown', when: 'boss', title: 'A Crown in the Ashes',
    tell: ({ members, act }) => `${act >= 2 ? 'A circlet of finger-bones sits on a lectern, politely, as if the Lich expects you to try it on.' : 'A tin crown, child-sized and sharp, has been nailed to a post at the edge of the king’s ground.'} ${joinNames(members)} can take it, mock it, or walk past as if it were litter.`,
    choices: [
      {
        id: 'take',
        label: () => 'Take the crown',
        hint: () => 'Gold and spite. The boss hits harder: start 4 HP down.',
        apply: (ctx) => {
          grantCompany(ctx.members, 20);
          bless(ctx, { id: 'crown', name: 'A stolen crown', text: 'Start 4 HP down.', fights: 1, wound: 4 });
          note(ctx, 'A Crown in the Ashes', 'They took the crown. The boss will have felt it.');
          return 'Twenty gold of insult. The boss fight starts 4 HP down, because some objects are heavy in a way that has nothing to do with weight.';
        },
      },
      {
        id: 'break',
        label: () => 'Break it and leave the pieces',
        hint: () => 'The boss fight: +3 attack.',
        apply: (ctx) => {
          bless(ctx, { id: 'break', name: 'A broken crown', text: '+3 attack.', fights: 1, atk: 3 });
          note(ctx, 'A Crown in the Ashes', 'They broke it.');
          return 'It breaks easier than a symbol should. The boss fight gains +3 attack. You already started winning before the dice were rolled.';
        },
      },
      {
        id: 'ignore',
        label: () => 'Leave it exactly where it is',
        hint: () => 'No omen either way.',
        apply: (ctx) => { note(ctx, 'A Crown in the Ashes', 'They did not touch it.'); return 'The crown can wait. You did not come here for jewelry.'; },
      },
    ],
  },
];

// The roadside traveller: not on every road, but every second or third fight. He names a price; the player takes it or leaves it.
// (With a company he is an auction instead: see auction.js.)
ROADS.push({
  id: 'traveller', when: 'special', kicker: 'A stranger on the road', title: 'The Traveller',
  tell: ({ campaign: c }) => `A stranger steps out from behind a tree that was definitely not there a moment ago. ${line('greet', () => 0.5)} He is holding a small bundle wrapped in what might be a tablecloth. "${c.traveller.price} gold for what is inside. I will not tell you what it is. I do not know myself. That is the beauty of it."`,
  choices: [
    {
      id: 'buy',
      label: ({ campaign: c }) => `Buy the bundle · ${c.traveller.price} gold`,
      hint: () => `A weapon. ${Math.round(GAMBLE_ODDS[0] * 100)}% Bronze, ${Math.round(GAMBLE_ODDS[1] * 100)}% Silver, ${Math.round(GAMBLE_ODDS[2] * 100)}% Gold, ${Math.round(GAMBLE_ODDS[3] * 100)}% Diamond.`,
      can: ({ campaign: c, members }) => companyGold(members) >= c.traveller.price,
      apply: (ctx) => {
        const t = ctx.campaign.traveller; const name = WEAPONS[t.inst.id].name; const tier = RARITY[t.inst.rarity | 0];
        payCompany(ctx.members, t.price);
        const m = [...ctx.members].sort((a, b) => a.bag.length - b.bag.length)[0]; m.bag.push({ ...t.inst });
        note(ctx, 'The Traveller', `Paid ${t.price} gold for a bundle: a ${tier} ${name}.`);
        return `You unwrap it. A ${tier} ${name}. ${revealLine(t.inst.rarity, ctx.rng)} It goes into ${m.name}'s pack.`;
      },
    },
    {
      id: 'leave',
      label: () => 'Walk on',
      hint: () => 'Keep your gold. Wonder about the bundle.',
      apply: (ctx) => { note(ctx, 'The Traveller', 'Declined a stranger\'s bundle.'); return `${line('unsold', ctx.rng)} You will think about that bundle for the rest of the day.`; },
    },
  ],
});

// A road event comes every second fight (before fights 3, 5, 7, 9) and always before the boss.
export const roadSlot = (c) => c.step >= 3 && (c.step % 2 === 1 || c.step >= 10);
const travellerDue = (c) => (c.wins || 0) - (c.travellerAt || 0) >= 2 + (hashSeed(c.seed, c.act, c.step, 'trav') & 1);

function poolFor(campaign) {
  const opening = campaign.act === 1 && campaign.step === 1 && !(campaign.wins > 0);
  if (opening) return ROADS.filter((e) => e.when === 'opening');
  if (campaign.step >= 10) return ROADS.filter((e) => e.when === 'boss' || e.when === 'road');
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
    const weights = pool.map((e) => (c.step >= 10 && e.when === 'boss' ? 5 : 1));
    c.road = { key, id: pool[weighted(rng, weights)].id, done: false };
    if (!(c.act === 1 && c.step === 1 && !(c.wins > 0)) && travellerDue(c)) {
      c.road.id = 'traveller'; c.travellerAt = c.wins || 0;
      c.traveller = gambleOffer(c.seed, { act: c.act, step: c.step });
    }
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
    id: ev.id, title: ev.title, kicker: ev.kicker || 'The road speaks', tell: ev.tell(ctx),
    choices: ev.choices.map((ch) => ({
      id: ch.id,
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
  const text = choice.apply(ctx);
  c.road.done = true;
  c.seenRoads = [...(c.seenRoads || []), ev.id].slice(-10);
  return { title: ev.title, text };
}
