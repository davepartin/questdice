// The story thread (Dave, Oct 2026): a short beat at the moments that matter, so every fight is part of one journey.
// The Dawn Lantern kept the Marches safe. The Goblin King stole its flame out of greed; the Hollow Lich hid it from
// the Ember Queen out of fear. The heroes carry the light home. Light against the dark; nothing occult.
// Villains are greedy, cold or afraid. Defeated foes fall, crumble, flee or yield.
// Pure data and rules: no DOM. A beat is { kicker, title, icon, text: [paragraphs] }.
// When they show (before the road and the quest board): an act opening at quest 1 (after the last act's closing), a short
// beat before the elite at quest 5 and before the boss at quest 10. Place arrivals show before a fight; victory beats
// after. Seen beats are kept in campaign.storySeen.

import { ACTS, placeSlug, PLACE_ALIAS } from './data.js';
import { beatsOf, placesOf, stepsOf, fillNames, packIdOf, DEFAULT_PACK } from './campaigns.js';
import { hasLegend, legendBeat } from './legend.js';

const slugOf = (name) => PLACE_ALIAS[placeSlug(name)] || placeSlug(name);
const beatsFor = (c) => beatsOf(c) || BEATS;
const placesFor = (c) => placesOf(c) || PLACES;
const landIndex = (act) => ((act - 1) % ACTS_IN_STORY);
const stepRow = (c, act = c?.act, step = c?.step) => stepsOf(c)?.[landIndex(act)]?.[step - 1] || null;
const seenKey = (c, id, act) => {
  const pack = packIdOf(c);
  return pack === DEFAULT_PACK ? `${id}@${act}` : `${pack}/${id}@${act}`;
};

const BEATS = {
  'open:1': { kicker: 'Prologue', title: 'The Night the Light Went Out', icon: 'flame', text: [
    'The Dawn Lantern burned on the hill above Cinder Ford for as long as anyone can remember. Its light kept the Marches green, the roads safe, and the nights short.',
    'Then the goblins came under a moonless sky. Their king carried the flame away in an iron cage. Now the fields smoulder and the wolves grow bold. Bring the light home.',
  ] },
  'elite:1': { kicker: 'The road narrows', title: 'A Guard on the Road', icon: 'skull', text: [
    'The Goblin King posted a hill ogre where the road narrows. He is slow, and he hits like a falling tree. Watch for him winding up.',
    'Get past him and the king’s hill comes into sight.',
  ] },
  'boss:1': { kicker: 'Gallows Hill', title: 'The Goblin King', icon: 'crown', text: [
    'From the top of the hill you can see the Lantern’s flame, pale and thrashing in an iron cage beside the Goblin King’s throne.',
    'He calls it his treasure. He will not give it back. Take it.',
  ] },
  'close:1': { kicker: 'The cage breaks', title: 'Only a Spark', icon: 'shine', text: [
    'The king falls and the iron cage splits open. The flame inside is only a spark now.',
    'A dragon’s claw-seal is burnt into the bars. Far off, a voice like a forge says: “Keep it warm for me, little thieves.” The last sparks drift down the old crypt stair. Follow them.',
  ] },
  'open:2': { kicker: 'Act II', title: 'The Hollow Crypt', icon: 'skull', text: [
    'Beneath the Marches lie the old halls of the dead. The bones have stood up. Each one carries a stolen sliver of the Lantern’s light inside its ribs.',
    'Follow the sparks down. Bring every sliver back.',
  ] },
  'elite:2': { kicker: 'The lower door', title: 'The Bone Warden', icon: 'shield', text: [
    'The lower halls have a keeper: the Bone Warden, a giant of fused bone that has stood at the deep door for a hundred years.',
    'It does not hate you. It will not move. Make it.',
  ] },
  'boss:2': { kicker: 'The bottom of the dark', title: 'The Hollow Lich', icon: 'crown', text: [
    'At the bottom sits the Hollow Lich, a king of bones with an empty chest.',
    '“Do you know what is waiting for that light, up in the mountains? I hid it from her.” He will not give it back. You will have to take it.',
  ] },
  'close:2': { kicker: 'Dawn', title: 'The Light Comes Home', icon: 'shine', text: [
    'The Lich crumbles, and every stolen sliver of light rushes up out of the crypt, back into the Lantern on its hill.',
    'The sun rises on the Marches. On the far mountains something enormous unfolds its wings.',
  ] },
  'open:3': { kicker: 'Act III', title: 'The Ember Peaks', icon: 'flame', text: [
    'The Lantern burns again. A light on a hill can be seen from a long way off, and the Ember Queen has been watching for a thousand years.',
    'The road climbs into the Ember Peaks. She wants back the one gift she ever gave away. Climb to the hoard.',
  ] },
  'elite:3': { kicker: 'The Brazen Bridge', title: 'The Queen on the Bridge', icon: 'crown', text: [
    'A bronze bridge spans a canyon of lava. Vharaxis, the Ember Queen, lands on it. The bronze glows red under her claws.',
    '“Kneel, little thieves. That Lantern was the first thing that was mine.” When she is hurt enough she will fly to her throne and wait for you there.',
  ] },
  'boss:3': { kicker: 'The Ember Throne', title: 'The Ember Throne', icon: 'crown', text: [
    'The throne room is the inside of the volcano. Vharaxis uncoils from the top of the hoard, still scarred from the bridge.',
    'Peeking out from behind a golden goblet is a very small red dragon, holding a single coin.',
  ] },
  'close:3': { kicker: 'A keeper for the light', title: 'A Keeper for the Light', icon: 'shine', text: [
    'The little dragon drops every coin it ever took at your feet. Vharaxis stares at it, and the greed in her eyes goes out.',
    'She shrinks until all that is left is a little warm ember. Cinderling picks it up. The Lantern burns on its hill again, and its new keeper curls around it.',
  ] },
  // The Ascents (act 4 on): the same lands, harder, with a short new chapter each time.
  'open:ascent:1': { kicker: 'Ascent', title: 'The Light Is Tested', icon: 'flame', text: [
    'The Lantern burns again and the Marches are healing. A light on a hill can be seen from far away.',
    'Bolder warbands come down out of the hills. They want the flame back. Stand watch on the road.',
  ] },
  'open:ascent:2': { kicker: 'Ascent', title: 'Deeper Still', icon: 'skull', text: [
    'The old halls have filled again with bones that would rather stay in the dark.',
    'Go down once more, and keep the light where it belongs.',
  ] },
  'open:ascent:3': { kicker: 'Ascent', title: 'The Peaks Remember', icon: 'flame', text: [
    'The Ember Peaks still smoke. The Queen’s children are older and angrier, and they have been told about you.',
    'Climb again.',
  ] },
  'boss:ascent:1': { kicker: 'Gallows Hill', title: 'The King Returns', icon: 'crown', text: [
    'The Goblin King ran from the last fight. Now he is back, greedier than ever.',
    'Remind him why he ran.',
  ] },
  'boss:ascent:2': { kicker: 'The bottom of the dark', title: 'The Lich Rises Again', icon: 'crown', text: [
    'The Hollow Lich has pulled himself back together, colder than before.',
    'Send him back to his rest, and bring the light up with you.',
  ] },
  'boss:ascent:3': { kicker: 'The Ember Throne', title: 'The Queen Stirs', icon: 'crown', text: [
    'The ember on the hill is still a gift. Someone in the peaks still wants it back.',
    'Meet her at the throne once more.',
  ] },
  'close:ascent': { kicker: 'The light holds', title: 'The Road Goes On', icon: 'shine', text: [
    'The light holds, and the land is safer. The road is long, and there is always another hill.',
  ] },
};

// Arrival and victory lines for every painted place. `foes` is the locked first-pass fight (must match ACTS.fights).
// Help-revisit copy (`helpFoes` / helpArrive / helpWin) is used at the Call for Help (step 8).
const PLACES = {
  'cinder-ford': {
    title: 'Cinder Ford', icon: 'flame',
    foes: ['goblin'],
    helpFoes: ['cinderling', 'goblin'],
    arrive: ['The river runs grey with ash. On the far bank the Lantern hill stands dark for the first time in living memory.', 'A lone goblin is trying to make off with the ferryman’s cooking pot.'],
    win: ['The goblin drops the pot and runs. The ferryman points up toward the smoke. “They went that way. With the light.”'],
    helpArrive: ['Smoke rises from the ferryman’s hut. A goblin is leading a counter-raid, with a Cinderling on his head puffing sparks at the thatch.'],
    helpWin: ['The Cinderling flees with one last coin. You saved the ferry. The ferryman presses a warm crust into your hand.'],
  },
  'burnt-orchard': {
    title: 'Burnt Orchard', icon: 'flame',
    foes: ['cinderling', 'goblin'],
    helpFoes: ['cultist', 'goblin'],
    arrive: ['Rows of apple trees stand black and smoking. A Cinderling is curled up in a pile of stolen goblin coins. A goblin named Skiv is trying to snatch the gold back.'],
    win: ['The little dragon grabs one last coin and runs into the smoke. Skiv flees the other way.'],
    helpArrive: ['The last unburnt tree is surrounded by an Ember Mage who wants to light it as a beacon, and a goblin holding the matches.'],
    helpWin: ['The Ember Mage’s fire-ward fizzles. The goblin drops the matches. The tree still stands.'],
  },
  'ravens-rest': {
    title: 'Ravens’ Rest', icon: 'skull',
    foes: ['cultist', 'wolf'],
    arrive: ['An old waystation. A caravan’s lanterns lie smashed in the yard. An Ember Mage in a red hood is reciting over a bonfire of wagon wheels, while a dire wolf named Soot stalks the porch.'],
    win: ['The Ember Mage’s ward burns out and Soot’s howl cracks. The ravens take off and drop a single bright feather at your feet.'],
  },
  'wolfwood-edge': {
    title: 'Wolfwood Edge', icon: 'skull',
    foes: ['wolf', 'wolf'],
    arrive: ['The forest stops in a hard line. Between the trunks, two pairs of yellow eyes. Two wolves. One stalks. The other howls so you look the wrong way.'],
    win: ['The pair melts back into the trees. One old wolf looks at you, then decides you are not worth it.'],
  },
  'the-toll-bridge': {
    title: 'The Toll Bridge', icon: 'skull',
    foes: ['ogre'],
    arrive: ['A narrow stone bridge over a gorge. The toll-keeper is a hill ogre. A sign at his feet reads “TOLL: EVRYTHING”. Watch for him winding up. He hits like a falling tree.'],
    win: ['The ogre sits down hard. Gallows Hill rises out of the smoke on the far side.'],
  },
  'smoke-hollow': {
    title: 'Smoke Hollow', icon: 'flame',
    foes: ['cultist', 'cinderling'],
    arrive: ['A bowl-shaped valley where the smoke pools like a lake. Claw prints as wide as a cart are pressed into the scorched earth.', 'An Ember Mage is kneeling in a scorch mark, trying to teach a bored Cinderling to siphon light out of the air.'],
    win: ['The Cinderling flees uphill. The Ember Mage shouts “SHE comes!” and follows it.'],
  },
  'ashfall-camp': {
    title: 'Ashfall Camp', icon: 'flame',
    foes: ['goblin', 'goblin', 'goblin'],
    arrive: ['The Goblin King’s war-camp sprawls across the foot of the hill. On duty at the gate are Pip, Pog and Nib. Pip has a fire bomb. Pog pilfers anything that is not nailed down. Nib ducks behind the other two.'],
    win: ['Pip’s last fire bomb goes off in the cookpot. Pog tries to steal your boot. Nib had already started running. In a pocket: a scrap of a contract signed with a claw. You can make out three words: “…keep it WARM…”'],
  },
  'gallows-hill': {
    title: 'Gallows Hill', icon: 'crown',
    foes: ['goblinking'],
    arrive: ['The goblin road zig-zags up the hill. At the top, a pale light thrashes in an iron cage.', 'The Goblin King’s throne is a mountain of stolen gold. He grins and claps twice. That is the Rally: more goblins, if you let him. He also likes fire bombs and a gold shield.'],
    win: ['The Goblin King topples off his throne.'],
  },
  'the-weeping-stair': {
    title: 'The Weeping Stair', icon: 'skull',
    foes: ['skeleton', 'skeleton'],
    arrive: ['A spiral stair cut into the rock, slick with water. The last sparks of the Lantern drift down ahead of you.', 'Below, two Bone Soldiers march in rhythm. One keeps its shield up. The other is saving a bone to throw.'],
    win: ['Two slivers of light slip out of the fallen bones and swirl into your lantern.'],
  },
  'candle-vault': {
    title: 'Candle Vault', icon: 'spark',
    foes: ['wraith', 'skeleton'],
    helpFoes: ['wraith', 'skeleton'],
    arrive: ['Thousands of candles crowd every shelf, and not one of them is lit.', 'A Wraith is pinching out the last flame. A Bone Soldier holds the basket of snuffers. The Wraith will phase through a swing if you let it.'],
    win: ['You touch your spark to one candle and the whole vault blazes gold. The Wraith backs through a wall. The Bone Soldier drops the snuffers.'],
    helpArrive: ['The candles you lit are going out one row at a time. The Wraith has come back, and this time the Bone Soldier is carrying two snuffers.'],
    helpWin: ['The Wraith’s chill fades and the Bone Soldier sits down. The place you saved glows behind you.'],
  },
  'the-pale-nave': {
    title: 'The Pale Nave', icon: 'skull',
    foes: ['dirgesinger', 'skeleton', 'skeleton'],
    helpFoes: ['dirgesinger', 'skeleton'],
    arrive: ['A long hall with rows of stone benches. A Dirge Singer in a moth-eaten collar is winding up a hush that will steal the words out of your next roll. Two Bone Soldiers hold the hymn-books.'],
    win: ['The Dirge Singer’s hush cracks mid-note. The Bone Soldiers stop.'],
    helpArrive: ['The Dirge Singer has re-formed the choir, and a Bone Soldier is back on the aisle. Their song is pulling the warmth out of the whole level.'],
    helpWin: ['The hall is quiet, and a little warmer.'],
  },
  'grave-silk-hall': {
    title: 'Grave-Silk Hall', icon: 'skull',
    foes: ['spider', 'spider'],
    arrive: ['Webs hang from the ceiling like pale curtains. Two Crypt Spiders have split the hall. One webs the doorway. The other drips venom and skitters along the beams.'],
    win: ['The spiders skitter for the dark. A crate of spoons is left in the silk.'],
  },
  'ossuary-gate': {
    title: 'Ossuary Gate', icon: 'shield',
    foes: ['bonewarden'],
    arrive: ['A doorway made of stacked bones. The Bone Warden stands in front of it. If you let it, it will raise a Bone Soldier from the doorframe and put up a bone wall. It will not move unless you make it.'],
    win: ['The Warden lowers its great arm and the gate grinds open onto cold black water.'],
  },
  'mourners-row': {
    title: 'Mourner’s Row', icon: 'skull',
    foes: ['wraith', 'gloomstalker'],
    arrive: ['A narrow street of tiny stone houses. A Wraith sits on a doorstep, and the cold coming off it frosts your eyelashes.', 'At the end of the row, a Gloom Stalker waits with a black arrow already on the string. It will fade through the next wall if you stare, and snare your feet if you do not.'],
    win: ['The Wraith fades. The Gloom Stalker leaves a black-fletched arrow in the lintel and is gone.'],
  },
  'the-drowned-crypt': {
    title: 'The Drowned Crypt', icon: 'spark',
    foes: ['frostwhelp', 'frostwhelp'],
    arrive: ['Half the crypt has sunk under black, ice-cold water. Under the surface something glows pale blue: a nest of eggs, frozen solid.', 'Two Frostwhelps have hatched. One puffs frost across the ice. The other binds your boots with icy wings. They will flee for the eggs if the fight turns.'],
    win: ['The beaten whelps curl up on an egg. These are dragon eggs.'],
  },
  'ash-cloister': {
    title: 'Ash Cloister', icon: 'crown',
    foes: ['lich'],
    arrive: ['A square garden at the bottom of the world. The Hollow Lich sits on a plain stone chair with the stolen light swirling in the hollow of his chest.', 'He will raise the dead, drain what warmth you have left, and wrap bone armour around himself if you let the fight go long.'],
    win: ['The Hollow Lich lets go. The light in his chest begins to rise.'],
  },
  'kindling-steps': {
    title: 'Kindling Steps', icon: 'flame',
    foes: ['cinderling', 'cinderling'],
    arrive: ['A staircase of black volcanic rock climbs into the clouds. Halfway up, two Cinderlings have claimed the landing. One puffs a splash of sparks. The other snatches a coin and sits on it.'],
    win: ['The Cinderlings flee uphill in a shower of sparks. They will tell their mother.'],
  },
  'the-glass-fields': {
    title: 'The Glass Fields', icon: 'spark',
    foes: ['gloomstalker', 'shieldbearer'],
    arrive: ['A whole valley melted to glass by dragon fire. A Gloom Stalker is on the ridge with a black arrow already drawn, fading in and out of the heat-haze. Down on the glass, a Shieldbearer is trying to lock shields with a reflection of itself.'],
    win: ['You slide the Shieldbearer across the glass. The Gloom Stalker’s last arrow skips off into the glare.'],
  },
  'wyrmwatch': {
    title: 'Wyrmwatch', icon: 'flame',
    foes: ['chainbinder', 'cinderling'],
    helpFoes: ['gloomstalker', 'dirgesinger'],
    arrive: ['A crooked tower on a needle of rock. A Gold-Chain Jailer stands on the top floor, tying the bell-ropes so they ring whenever you move, and siphoning the spark out of the air. A Cinderling is perched on the clapper of the biggest bell.'],
    win: ['The Jailer’s chains slacken. The Cinderling flees out a window. Across the peaks, hidden villagers ring their bells back.'],
    helpArrive: ['The villagers who rang their bells back are being hunted. A Gloom Stalker is circling the tower with a black arrow, and a Dirge Singer on the stair is hushing the bells.'],
    helpWin: ['The Gloom Stalker fades into the heat. The Dirge Singer’s hush cracks. The bells still answer.'],
  },
  'hoardfall-mine': {
    title: 'Hoardfall Mine', icon: 'coin',
    foes: ['ironwarden', 'cinderling'],
    helpFoes: ['cinderling', 'cinderling'],
    arrive: ['A mineshaft spills coins down the mountainside. Miners in chains dig it out, and every time they lift a coin, a Cinderling snatches it.', 'The foreman is an Ironclad Warden in a dented helm, standing in the mouth of the shaft with a stone wall already half-raised.'],
    win: ['The Ironclad Warden’s wall comes down. The Cinderling flees with both cheeks full of coins. You break the miners’ chains.'],
    helpArrive: ['The freed miners came back for their friends and are trapped under a cave-in. Two Cinderlings are chewing on the support beams.'],
    helpWin: ['The Cinderlings flee. The miners walk out into the light.'],
  },
  'the-brazen-bridge': {
    title: 'The Brazen Bridge', icon: 'crown',
    foes: ['vharaxis'],
    arrive: ['A bridge of hammered bronze spans a canyon of lava. Vharaxis, the Ember Queen, lands on the bridge.', '“Kneel, little thieves. Every coin in this land was mine. And that Lantern was the first.” Watch for the Inferno. When she inhales, the next breath will splash.'],
    win: ['She laughs and launches into the sky. “Come up to my throne, then. Bring my Lantern.”'],
  },
  'kettle-tarn': {
    title: 'Kettle Tarn', icon: 'spark',
    foes: ['frostwhelp', 'frostwhelp'],
    arrive: ['A mountain lake that boils and freezes at the same time. Two Frostwhelps slide across the ice. One puffs frost at a geyser. The other binds your knees with icy wings. They followed you up from the crypt because you smell like the light.'],
    win: ['The whelps huddle together in the steam.'],
  },
  'oathbreak-keep': {
    title: 'Oathbreak Keep', icon: 'shield',
    foes: ['fallenchampion'],
    arrive: ['A great castle hall. Every banner shows the Dawn Lantern, all of them scorched. Sir Aldren Hale, the Fallen Champion, stands in blackened armour. Five weapons hang from his belt.', 'He will hush your next words, bind you in gold chain, and wind up an Oath Smite if you let the silence settle.'],
    win: ['His black armour cracks and falls away. Underneath he is just an old man. “Her heart is the ember she gave away,” he whispers. “Remind her.”'],
  },
  'ember-throne-slopes': {
    title: 'Ember Throne slopes', icon: 'flame',
    foes: ['ashwyrm', 'shieldbearer'],
    arrive: ['The peak’s last slope is a river of sliding gold coins. Ashmaw the Wyrm is draped across the path, inhaling for a fire-breath that will splash anyone standing too close. Beside him, a Shieldbearer is trying to lock shields with a dragon.'],
    win: ['Ashmaw flees uphill. The Shieldbearer drops the shield and starts walking home.'],
  },
  'the-ember-throne': {
    title: 'The Ember Throne', icon: 'crown',
    foes: ['vharaxis'],
    arrive: ['The throne room is the inside of the volcano. Vharaxis uncoils from the top of the hoard, still scarred from the bridge. Inferno. Terrify. Inhale.', 'Peeking out from behind a golden goblet is a very small red dragon, holding a single coin.'],
    win: ['The Ember Queen sinks onto her hoard. Behind a golden goblet, something small and red takes a deep breath and steps out.'],
  },
};

export const HELP_FIGHTS = {
  'Cinder Ford': ['cinderling', 'goblin'],
  'Burnt Orchard': ['cultist', 'goblin'],
  'Candle Vault': ['wraith', 'skeleton'],
  'The Pale Nave': ['dirgesinger', 'skeleton'],
  'Wyrmwatch': ['gloomstalker', 'dirgesinger'],
  'Hoardfall Mine': ['cinderling', 'cinderling'],
};

const ACTS_IN_STORY = 3; // Act I, II, III; then the Ascents repeat them
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ascentOf = (act) => Math.floor((act - 1) / ACTS_IN_STORY) + 1; // 1 = the first time through
const landOf = (act) => ((act - 1) % ACTS_IN_STORY) + 1;             // 1 = the Marches, 2 = the Crypt, 3 = the Peaks

// The beat id for a moment in a given act ('open' | 'elite' | 'boss' | 'close'), or null when that act has none.
export function beatId(kind, act, camp) {
  const table = beatsFor(camp);
  if (ascentOf(act) === 1) return table[`${kind}:${act}`] ? `${kind}:${act}` : null;
  if (kind === 'close') return table['close:ascent'] ? 'close:ascent' : null;
  if (kind === 'elite') return null;
  return table[`${kind}:ascent:${landOf(act)}`] ? `${kind}:ascent:${landOf(act)}` : null;
}
export function placeOf(name, camp) { return placesFor(camp)[slugOf(name)] || PLACES[slugOf(name)] || null; }
export function placeBeat(kind, name, { help = false, camp = null, heroes = [] } = {}) {
  const p = placeOf(name, camp); if (!p) return null;
  const text = help ? (kind === 'arrive' ? p.helpArrive : p.helpWin) : (kind === 'arrive' ? p.arrive : p.win);
  if (!text?.length) return null;
  const id = `${help ? `help-${kind}` : kind}:${slugOf(name)}`;
  const names = { seed: camp?.seed, lineId: id };
  return {
    id,
    kicker: fillNames(kind === 'arrive' ? 'You arrive' : 'The fight is over', heroes, names),
    title: fillNames(p.title, heroes, names),
    icon: p.icon || 'road',
    text: fillNames(text, heroes, names),
  };
}
export function stepBeat(kind, camp, { heroes = [], act = camp?.act, step = camp?.step } = {}) {
  const row = stepRow(camp, act, step);
  if (!row) return null;
  const text = kind === 'arrive' ? row.arrive : row.win;
  if (!text?.length) return null;
  const id = `${kind}:${landOf(act)}.${step}`;
  const names = { seed: camp?.seed, lineId: id };
  return {
    id,
    kicker: fillNames(kind === 'arrive' ? 'You arrive' : 'The fight is over', heroes, names),
    title: fillNames(row.names?.[0] || row.place, heroes, names),
    icon: row.icon || 'road',
    text: fillNames(text, heroes, names),
  };
}
function dressBeat(b, { id, act, heroes, camp }) {
  const asc = ascentOf(act);
  const kicker = asc > 1 && (b.kicker === 'Ascent' || b.kicker?.endsWith(' Ascent'))
    ? `Ascent ${asc} · Act ${romans[landOf(act) - 1]}` : b.kicker;
  const names = { seed: camp?.seed, lineId: id };
  return {
    id, act, icon: b.icon,
    kicker: fillNames(kicker, heroes, names),
    title: fillNames(b.title, heroes, names),
    text: fillNames(b.text, heroes, names),
  };
}
// A beat ready to show: the text, with the kicker naming the act and Ascent. `heroes` fills {name}/{wizard}/…
export function beat(id, act, heroes = [], camp = null) {
  const lg = /^legend:(\d+)$/.exec(id || '');
  if (lg) { const b = legendBeat(camp, Number(lg[1]), heroes); return b ? { id, act, ...b } : null; }
  const stepMatch = /^(arrive|win):(\d+)\.(\d+)$/.exec(id || '');
  if (stepMatch) {
    return stepBeat(stepMatch[1], camp, { heroes, act: Number(stepMatch[2]), step: Number(stepMatch[3]) });
  }
  if (id?.startsWith('arrive:') || id?.startsWith('win:') || id?.startsWith('help-')) {
    const [kind, ...rest] = id.split(':');
    const p = placesFor(camp)[rest.join(':')] || PLACES[rest.join(':')]; if (!p) return null;
    const helpArrive = kind === 'help-arrive';
    const helpWin = kind === 'help-win';
    const text = helpArrive ? (p.helpArrive || p.arrive) : helpWin ? (p.helpWin || p.win) : kind === 'arrive' ? p.arrive : p.win;
    const names = { seed: camp?.seed, lineId: id };
    return {
      id, act, icon: p.icon || 'road',
      kicker: fillNames(kind === 'win' || helpWin ? 'The fight is over' : 'You arrive', heroes, names),
      title: fillNames(p.title, heroes, names),
      text: fillNames(text, heroes, names),
    };
  }
  const b = beatsFor(camp)[id]; if (!b) return null;
  return dressBeat(b, { id, act, heroes, camp });
}
const seen = (c, id, act) => (c.storySeen || []).includes(seenKey(c, id, act));
// What to show now, in order (usually zero or one beat; at an act's first quest, the last act's closing then this act's opening).
export function pending(c, place) {
  if (!c) return [];
  const out = [];
  const add = (kind, act) => { const id = beatId(kind, act, c); if (id && !seen(c, id, act)) out.push({ id, act }); };
  if (c.step === 1) {
    // the act just finished: its Legend first (what happened, a title for each hero, a teaser), then its closing page
    if (c.act > 1 && hasLegend(c, c.act - 1) && !seen(c, `legend:${c.act - 1}`, c.act - 1)) out.push({ id: `legend:${c.act - 1}`, act: c.act - 1 });
    if (c.act > 1) add('close', c.act - 1); add('open', c.act);
  }
  if (c.step === 5) add('elite', c.act);
  if (c.step === 10) add('boss', c.act);
  // Elite and boss cards already tell the set-piece; skip the matching place arrival so it isn't told twice.
  const skipPlace = c.step === 5 || c.step === 10
    || out.some((x) => /^(open|close|elite|boss):/.test(x.id));
  if (place && !skipPlace) {
    const row = stepRow(c);
    if (row) {
      const b = stepBeat('arrive', c);
      if (b && !seen(c, b.id, c.act)) out.push({ id: b.id, act: c.act, place: row.place });
    } else {
      const help = c.step === 8 && !!c.nextPlace;
      const b = placeBeat('arrive', place, { help, camp: c });
      if (b && !seen(c, b.id, c.act)) out.push({ id: b.id, act: c.act, place });
    }
  }
  return out;
}
export function pendingVictory(c, place) {
  if (!c || !place) return null;
  const row = stepRow(c);
  if (row) {
    const b = stepBeat('win', c);
    if (!b || seen(c, b.id, c.act)) return null;
    return { id: b.id, act: c.act, place: row.place };
  }
  const help = c.step === 8 && !!c.nextPlace;
  const b = placeBeat('win', place, { help, camp: c });
  if (!b || seen(c, b.id, c.act)) return null;
  return { id: b.id, act: c.act, place };
}
export function markSeen(c, id, act) { c.storySeen = [...new Set([...(c.storySeen || []), seenKey(c, id, act)])]; }
export function applyPlaceVictory(campaign, place) {
  if (!campaign || !place) return;
  if (slugOf(place) === 'oathbreak-keep') {
    campaign.blessings = [...(campaign.blessings || []), {
      id: 'keepers-oath', name: 'Keeper’s Oath', text: '+3 block against breath. He asked you to remind her.', fights: 2, breathBlock: 3, block: 0,
    }];
  }
}
// The story so far: every beat up to where the campaign stands, in order (for the menu's "The story so far").
export function storySoFar(c, heroes = []) {
  if (!c) return [];
  const out = [];
  for (let a = 1; a <= c.act; a++) {
    const here = a === c.act;
    const push = (kind) => { const id = beatId(kind, a, c); if (id) out.push(beat(id, a, heroes, c)); };
    push('open');
    if (!here || c.step >= 5) push('elite');
    if (!here || c.step >= 10) push('boss');
    if (!here && hasLegend(c, a)) { const lb = beat(`legend:${a}`, a, heroes, c); if (lb) out.push(lb); }
    if (!here) push('close');
  }
  return out;
}
