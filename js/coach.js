// Beginner hints. Every hint appears once per hero (stored in hero.tips); the whole system is switched off from the menu or
// when a hero is created with "I have played before". The setting lives on this device, not in the save.
const KEY = 'qd.hints';
export const hintsOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export const setHints = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ } };
export const wantHint = (hero, key) => !!hero && hintsOn() && !(hero.tips && hero.tips[key]);
export const seeHint = (hero, key) => { if (!hero) return; hero.tips = hero.tips || {}; hero.tips[key] = 1; };

// All the words in one place. {magic} and similar are plain words here; the UI adds the symbols.
export const HINTS = {
  b_roll: { title: 'Your body is the board', text: 'Head, hands, feet, heart and your weapon: each is a die. Tap Roll Dice to throw them all.' },
  b_shape: { title: 'Read the tiles', text: 'The tiles show what this roll earns. Attack hits the monster you picked, block softens its hit, magic is saved for later. Not happy? Tap up to 4 dice, then press Reroll. Your first 3 rerolls are free.' },
  b_target: { title: 'Pick your target', text: 'Tap a monster, or its box at the top, to choose who your attack hits. The box shows what it plans to do.' },
  b_paid: { title: 'Free rerolls used up', text: 'Each extra die you reroll now costs 1 magic (the purple triangle). Only magic you saved from earlier rounds counts, so spend it where it matters.' },
  b_lock: { title: 'Ready? Lock in', text: 'Press Lock In to fight. Before you do, you can play a card or heal with magic. Block is spent on the monster\'s hit this round; attack hits the target.' },
  b_triple: { title: 'A triple!', text: 'Three matching dice in a line earn a big bonus. The glowing bar shows which dice go together, and the note says what you get.' },
  b_round2: { title: 'Magic carries over', text: 'Magic you earned last round is saved. Spend it on rerolls, cards, healing, or turning the heart die. Gold and XP come when the monsters fall.' },
  c_first: { title: 'Camp, after every fight', text: 'This is where you grow. Your first job: add your first bonus die in the Forge tab. Gold you earned pays for it.' },
  c_talent: { title: 'Your talent dice', text: 'Each talent die is powered by the hand above it: left die by your left hand, right die by your right. A symbol is worth that hand\'s strength. Put the symbols you want most on the faces you fill. A good first buy: a second symbol for your class\'s main job.' },
  c_hands: { title: 'Bigger hands', text: 'A bigger hand die is worth more on every symbol and every weapon. It also lets your weapon dice grow, so hands come first, then weapons.' },
  v_loot: { title: 'Spoils', text: 'Choose one weapon. A one-handed weapon fills one hand; a two-handed one fills both and unlocks the top-row triple. You equip weapons in Camp, under Gear.' },
  v_twohand: { title: 'A two-handed weapon', text: 'It uses both hands, so you lose your second weapon, but you get the big top-row triple and often a stronger face. Try it in Camp under Gear.' },
  g_gear: { title: 'Gear', text: 'Tap Left or Right to put a weapon in that hand, or Equip for a two-hander. The weapon you swap out goes to your pack. Sell spares for gold.' },
  r_traveller: { title: 'A gamble', text: 'The traveller sells a hidden weapon for a flat price. You see the odds, not the weapon. Buy it if you can spare the gold, or walk on.' },
  r_road: { title: 'The road', text: 'Every other fight a stranger or a place offers a choice. They can pay you, cost you, or change the next fight.' },
};
