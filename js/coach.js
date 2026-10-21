// Beginner hints. Every hint appears once per hero (stored in hero.tips); the whole system is switched off from the menu or
// when a hero is created with "I have played before". The setting lives on this device, not in the save.
const KEY = 'qd.hints';
export const hintsOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export const setHints = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ } };
export const wantHint = (hero, key) => !!hero && hintsOn() && !(hero.tips && hero.tips[key]);
export const seeHint = (hero, key) => { if (!hero) return; hero.tips = hero.tips || {}; hero.tips[key] = 1; };

// All the words in one place. {magic} and similar are plain words here; the UI adds the symbols.
export const HINTS = {
  b_roll: { title: 'Your body is the board', text: 'Head, hands, feet, heart and your weapon: each is a die. Tap Roll Dice and throw the lot.' },
  b_shape: { title: 'Read the counters', text: 'The counters under your board show what this roll earns. Attack hits the monster you picked, block softens its hit, magic is saved for later. Not happy? Tap up to 3 dice, then press Reroll. Your first 3 rerolls are free. A fourth die can be bought at camp.' },
  b_target: { title: 'Pick your target', text: 'Tap a monster, or the plaque under it, to choose who your attack hits. The plaque shows what it plans to do.' },
  b_paid: { title: 'Free rerolls used up', text: 'Each extra die you reroll now costs 1 magic (the purple triangle). Only magic you saved from earlier rounds counts, so spend it where it matters.' },
  b_lock: { title: 'Ready? Lock in', text: 'Press Lock In to fight. Before you do, you can play a card or heal with magic. Block is spent on the monster\'s hit this round; attack hits the target.' },
  b_triple: { title: 'A triple!', text: 'Three matching dice in a line earn a big bonus: rows (across) add attack, columns (down) add block. The glowing bar shows which dice go together, and the note says what you get.' },
  b_straight: { title: 'A straight!', text: 'Six numbers in a row, anywhere on your dice: +10. Seven pays 20, eight 30, all nine 50. Before you lock in, choose above the buttons: take it as attack, or cash it in for the same in gold.' },
  b_init: { title: 'Who strikes first', text: 'Your feet die is your initiative. Every monster rolls its own die against it each round (tap the little i on a monster to see its die: a wolf rolls a d8, an ogre only a d4). If a monster rolls higher it strikes before you; ties and lower rolls go to you. Round 1 is always yours. Strike first and a monster may fall before it ever swings.' },
  b_round2: { title: 'Magic carries over', text: 'Magic you earned last round is saved. Spend it on rerolls, cards, healing, or turning the heart die. Gold and XP come when the monsters fall.' },
  b_intent: { title: 'What the monster plans', text: 'The plaque under each monster shows its move this round, like SLASH 2+d8: it hits for 2 plus whatever its d8 rolls. Your block is taken off that, so the more block you earn, the less it hurts. The shield at the end of its health bar is its guard. Tap a monster to pick who you attack, and tap the little i to read about it.' },
  m_goblin: { title: 'Goblin Skulker', text: 'Small and sneaky. Some of its moves steal your gold; kill it to take the gold back. Its Duck move blocks your attack, so hit the other goblin that round, or use pierce, which ignores block.' },
  m_wolf: { title: 'Dire Wolf', text: 'Fast and hungry. When it Stalks, it holds back this round, but if you do not hurt it, it Pounces next round for a big hit. So when you see STALK, aim at the wolf. Its Howl makes every monster hit harder next round.' },
  m_cultist: { title: 'Ember Mage', text: 'Its Fire Ward blocks your attack and burns you if you hit it anyway, and block does not stop the burn. That round, hit another monster or put your dice into block. Tangle locks some of your dice next round, and Siphon steals your magic.' },
  m_wraith: { title: 'Wraith', text: 'A cold spirit. When it Phases, your normal attack passes right through it. Only pierce can hurt it that round, so hit something else, or lean on your pierce. Its Chill pierces your block, and Drain steals your magic.' },
  m_ogre: { title: 'Hill Ogre: a tough one', text: 'An elite. Slow, and built like a falling tree. When it winds up, a huge Slam comes next round. You cannot stop it, so earn a lot of block that round, or take it down before it swings. Its plaque shows the wind-up.' },
  m_king: { title: 'The Goblin King: the boss', text: 'He calls goblins to the fight and slams hard. Watch his plaque each round, deal with the wind-up, and use your cards and magic freely: this is the fight to spend them in.' },
  b_powers: { title: 'Your magical powers', text: 'Tap the purple POWERS button to open your powers, paid for with magic. Most work once a battle; the ones tagged EVERY ROUND come back each round. Some roll dice, some grow with the round, and your SUPER wakes up in round 3 and hits every monster. Tap the little i on a monster to see everything it can do.' },
  c_first: { title: 'Camp, after every fight', text: 'This is where you spend gold on dice. Tap a die to grow it or add one. Gold you earned pays for it.' },
  c_talent: { title: 'Your talent dice', text: 'Every talent die has two blank faces (1 and 3) and a 2× (on the 2). Its numbers also count toward straights. The other faces show a number; buy a symbol for a face and it pays that number: a 6 with magic is 6 magic. Bigger numbers cost more, and you can use each symbol twice on a die. A good first buy: your class\'s main job on the biggest face you have.' },
  c_hands: { title: 'Bigger hands', text: 'A bigger hand die is worth more on every symbol and every weapon. It also lets your weapon dice grow, so hands come first, then weapons.' },
  v_loot: { title: 'Spoils', text: 'Choose one weapon. A one-handed weapon fills one hand; a two-handed one fills both, and both weapon dice roll it. You equip weapons in Camp, under Gear.' },
  v_twohand: { title: 'A two-handed weapon', text: 'It uses both hands, so you lose your second weapon, but both weapon spots roll the same weapon, and its faces hit hard. A small burst on a face is +1: a 3 with one hits for 4, yet still counts as a 3 for triples and straights. Try it in Camp under Gear.' },
  g_gear: { title: 'Gear', text: 'Tap Left or Right to put a weapon in that hand, or Equip for a two-hander. The weapon you swap out goes to your pack. Sell spares for gold.' },
  r_trial: { title: 'A test on the road', text: 'You roll part of your body against the other side\'s dice: your head for wisdom, both hands for strength, your feet for speed. Highest total wins. Ties go to you. Your odds are right there on the choice. Grow those dice at camp.' },
  r_road: { title: 'The road', text: 'Every other fight a stranger or a place offers a choice. They can pay you, cost you, or change the next fight. Be kind when you can. Be clever when you cannot.' },
};
