// The story thread (Dave, Oct 2026): a short beat at the moments that matter, so every fight is part of one journey.
// The Dawn Lantern kept the Marches safe. The Goblin King stole its flame out of greed; the Hollow Lich hid it from
// the Ember Queen out of fear. The heroes carry the light home. Light against the dark; nothing occult.
// Villains are greedy, cold or afraid. Defeated foes fall, crumble, flee or yield.
// Pure data and rules: no DOM. A beat is { kicker, title, icon, text: [paragraphs] }.
// When they show (before the road and the quest board): an act opening at quest 1 (after the last act's closing), a short
// beat before the elite at quest 5 and before the boss at quest 10. Place arrivals show before a fight; victory beats
// after. Seen beats are kept in campaign.storySeen.

import { ACTS, placeSlug, PLACE_ALIAS, guardianOf } from './data.js';
import { beatsOf, placesOf, stepsOf, actsOf, fillNames, packIdOf, DEFAULT_PACK } from './campaigns.js';
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
  // T27: the step 5 guardian differs from hero to hero (ACTS[].guardians); the ogre's page above is the default.
  'elite:1:treant': { kicker: 'The road narrows', title: 'The Wrath-Oak', icon: 'skull', text: [
    'The Goblin King’s men set fire to the woods where the road narrows, and the oldest oak in the Marches woke up angry. The Wrath-Oak stands across the road with smoke still curling off its branches.',
    'It grips you with its roots and grows its bark back. When it rocks back to Uproot, brace. Get past it and the king’s hill comes into sight.',
  ] },
  'elite:1:direbear': { kicker: 'The road narrows', title: 'Gravelhide', icon: 'skull', text: [
    'The Goblin King has chained a dire bear across the road where it narrows and fed it nothing but grudges. Gravelhide, the Dire Bear, has a hide like a gravel path and a roar that rattles your teeth.',
    'Watch for it winding up. Get past it and the king’s hill comes into sight.',
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
  'elite:2:lampsnuffer': { kicker: 'The lower door', title: 'The Lamp-Snuffer', icon: 'shield', text: [
    'The lower halls have a keeper: the Lamp-Snuffer, a tall grey figure with a brass snuffer on a pole. For a hundred years it has put out every candle in the crypt, one by one, because it is afraid of what the light will show.',
    'It snuffs out your magic and calls Will-o’-the-Wisps out of the dark. Bring the light anyway.',
  ] },
  'elite:2:barrowrider': { kicker: 'The lower door', title: 'The Barrow Rider', icon: 'shield', text: [
    'The lower halls have a keeper: the Barrow Rider, an old knight on a horse of bones, who rides the same lap of the crypt every night and has long forgotten why.',
    'Watch for the Barrow Charge, and for the Bone Soldiers it calls to its side. It does not hate you. It is only very, very tired.',
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
    'Far below, every village in the Marches lights a candle from the Lantern’s flame. The goblins, the bones and the dragons will tell the story for a hundred years, and every telling ends the same way: with {names}.',
    'You carried the light home. The story is won.',
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
    // T27: the other guardians a hero may meet here (step 5); the arrival is the elite page, so only the victory differs.
    guardians: {
      treant: { win: ['The Wrath-Oak puts its roots back down into the gorge and goes still. A bird lands on it. Gallows Hill rises out of the smoke on the far side.'] },
      direbear: { win: ['You break the chain instead of the bear. Gravelhide, the Dire Bear, shakes its great head, looks at you for a long moment, and lumbers off into the trees. Gallows Hill rises out of the smoke on the far side.'] },
    },
  },
  'smoke-hollow': {
    title: 'Smoke Hollow', icon: 'flame',
    foes: ['cultist', 'cinderling'],
    arrive: ['A bowl-shaped valley where the smoke pools like a lake. Claw prints as wide as a cart are pressed into the scorched earth.', 'An Ember Mage is kneeling in a scorch mark, trying to teach a bored Cinderling to siphon light out of the air.'],
    win: ['The Cinderling flees uphill. The Ember Mage shouts “SHE comes!” and follows it.'],
    // Step 8 comes back here when no one called for help.
    again: {
      foes: ['bonfire', 'raincloud'],
      arrive: ['Smoke Hollow again, and it is smokier than ever. A Wildfire is stomping out of the haze with an armful of stolen fence-posts to feed itself. A grumpy little Squall has been chasing it all morning, raining on it, and missing.', 'The moment you step between them, they both decide you are the problem.'],
      win: ['The Wildfire drops its fence-posts and scurries off to sulk in a ditch. The Squall rains on it one last time, looks very pleased with itself, and drifts away.'],
    },
  },
  'ashfall-camp': {
    title: 'Ashfall Camp', icon: 'flame',
    foes: ['goblin', 'goblin', 'goblin'],
    arrive: ['The Goblin King’s war-camp sprawls across the foot of the hill. On duty at the gate are Pip, Pog and Nib. Pip has a fire bomb. Pog pilfers anything that is not nailed down. Nib ducks behind the other two.'],
    win: ['Pip’s last fire bomb goes off in the cookpot. Pog tries to steal your boot. Nib had already started running. In a pocket: a scrap of a contract signed with a claw. You can make out three words: “…keep it WARM…”'],
    // Step 9: the camp's second fight, the last before Gallows Hill.
    again: {
      foes: ['tuskraider', 'goblin', 'goblin'],
      arrive: ['Back at Ashfall Camp, the gate has new guards. The Goblin King has hired an Ash-Tusk Raider from beyond the hills, a tusked brute with a cleaver and a shield the size of a door. Pog and Nib are standing behind him, holding his coat between them.', 'Watch for the Shield Rush. When the Raider lowers his head, he means it.'],
      win: ['The Ash-Tusk Raider throws down his cleaver. “He said goblins pay in gold,” he grumbles. “He paid me in buttons.” In his purse is a single real coin, stamped with a dragon’s face. Nib is already halfway up Gallows Hill, and Pog takes your boot after all.'],
    },
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
    guardians: {
      lampsnuffer: { win: ['The Lamp-Snuffer drops its brass snuffer. One by one, the candles along the gate light themselves again, and the gate grinds open onto cold black water.'] },
      barrowrider: { win: ['The Barrow Rider’s horse kneels. The rider climbs down for the first time in a hundred years and sits on the steps to rest. The gate grinds open onto cold black water.'] },
    },
  },
  'mourners-row': {
    title: 'Mourner’s Row', icon: 'skull',
    foes: ['wraith', 'gloomstalker'],
    arrive: ['A narrow street of tiny stone houses. A Wraith sits on a doorstep, and the cold coming off it frosts your eyelashes.', 'At the end of the row, a Gloom Stalker waits with a black arrow already on the string. It will fade through the next wall if you stare, and snare your feet if you do not.'],
    win: ['The Wraith fades. The Gloom Stalker leaves a black-fletched arrow in the lintel and is gone.'],
    // Step 8 comes back here when no one called for help.
    again: {
      foes: ['wisp', 'skeleton'],
      arrive: ['Mourner’s Row again. A Will-o’-the-Wisp bobs from doorstep to doorstep, grinning, and a lost Bone Soldier is following it in circles, sure it is the way out.', 'The Wisp leads you astray too, if you let it. Keep your eyes on the bones.'],
      win: ['The Will-o’-the-Wisp pops like a soap bubble. The Bone Soldier sits down on a doorstep, relieved to finally stop walking.'],
    },
  },
  'the-drowned-crypt': {
    title: 'The Drowned Crypt', icon: 'spark',
    foes: ['frostwhelp', 'frostwhelp'],
    arrive: ['Half the crypt has sunk under black, ice-cold water. Under the surface something glows pale blue: a nest of eggs, frozen solid.', 'Two Frostwhelps have hatched. One puffs frost across the ice. The other binds your boots with icy wings. They will flee for the eggs if the fight turns.'],
    win: ['The beaten whelps curl up on an egg. These are dragon eggs.'],
    // Step 9: the last fight before Ash Cloister.
    again: {
      foes: ['gargoyle', 'nightblade'],
      arrive: ['The water in the Drowned Crypt has risen to your knees. It pours out of the mouth of a Vault Sentinel, a stone gargoyle crouched over the last door before Ash Cloister. When it wakes, it spouts ice water across the whole room.', 'Behind it, The Nightblade waits in the dark, sent by the Lich to hush you before you reach the door.'],
      win: ['The Vault Sentinel turns back to stone mid-spout, and the water stops. The Nightblade melts into the shadows. The last door creaks open, and you can feel the cold of Ash Cloister on the other side.'],
    },
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
    foes: ['basilisk', 'shieldbearer'],
    arrive: ['A whole valley melted to glass by dragon fire. Glarefang, the Basilisk, basks on the hot glass, and wherever its stare lands the shine turns to grey stone. Down on the glass, a Shieldbearer is trying to lock shields with a reflection of itself.', 'Glarefang’s Stone Gaze chains a hero’s dice in place. Break its stare before it sets.'],
    win: ['Glarefang slinks into a crack in the glass with its eyes squeezed shut. You slide the Shieldbearer across the valley like a stone on a frozen pond.'],
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
    foes: ['yeti', 'frostwhelp'],
    arrive: ['A mountain lake that boils and freezes at the same time. Big Muriel, a yeti the size of a cottage, is soaking in the warm end with a Frostwhelp tucked under one arm like a hot-water bottle. You splashed her. She is not pleased.', 'Watch for her Wind-Up. A Bear Hug holds a hero fast, and her Frosty Huff splashes everyone.'],
    win: ['Big Muriel climbs out of the tarn, shakes herself dry all over you, and stomps off up the mountain with the Frostwhelp riding on her shoulder.'],
    // Step 8 comes back here when no one called for help.
    again: {
      foes: ['frostwhelp', 'frostwhelp'],
      arrive: ['Back at Kettle Tarn, two Frostwhelps are waiting on the ice. They followed you up from the crypt because you smell like the light, and Big Muriel is not here to tell them off.'],
      win: ['The whelps huddle together in the steam and watch you climb.'],
    },
  },
  'oathbreak-keep': {
    title: 'Oathbreak Keep', icon: 'shield',
    foes: ['fallenchampion'],
    arrive: ['A great castle hall. Every banner shows the Dawn Lantern, all of them scorched. Sir Aldren Hale, the Fallen Champion, stands in blackened armour. Five weapons hang from his belt.', 'He will hush your next words, bind you in gold chain, and wind up an Oath Smite if you let the silence settle.'],
    win: ['His black armour cracks and falls away. Underneath he is just an old man. “Her heart is the ember she gave away,” he whispers. “Remind her.”'],
  },
  'ember-throne-slopes': {
    title: 'Ember Throne slopes', icon: 'flame',
    foes: ['stormtyrant', 'shieldbearer'],
    arrive: ['The peak’s last slope is a river of sliding gold coins, and a storm sits on the summit. Vexmor, the Storm-Tyrant, the Queen’s sworn knight, stands in the path with a glaive full of lightning. Beside him, a Shieldbearer is trying very hard to lock shields with a thundercloud.', 'Sir Aldren broke his oath. Vexmor never has. He will not let you pass while he can stand.'],
    win: ['The Shieldbearer drops the shield and starts walking home. Vexmor’s lightning gutters out. He drives his glaive into the gold and kneels beside it. “Go on, then,” he says. “She is waiting.”'],
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
  if (ascentOf(act) === 1) {
    const g = kind === 'elite' ? guardianFor(camp, act) : null; // T27: this hero's own step 5 guardian has its own page
    if (g && table[`elite:${act}:${g}`]) return `elite:${act}:${g}`;
    return table[`${kind}:${act}`] ? `${kind}:${act}` : null;
  }
  if (kind === 'close') return table['close:ascent'] ? 'close:ascent' : null;
  if (kind === 'elite') return null;
  return table[`${kind}:ascent:${landOf(act)}`] ? `${kind}:ascent:${landOf(act)}` : null;
}
// The step 5 guardian this campaign meets in an act (null for packs and Act III).
export function guardianFor(camp, act = camp?.act) {
  if (!camp || camp.seed == null) return null; // (no seed: a test or a preview; the act's own page)
  return guardianOf(actsOf(camp)[landIndex(act)], camp.seed);
}
// True when this step returns to a place the act's route already visited (Act III's Kettle Tarn, step 8 without a Call for Help).
export function revisit(c, place, step = c?.step) {
  const route = actsOf(c || {})[landIndex(c?.act || 1)]?.route || [];
  const here = slugOf(place); const first = route.findIndex((r) => slugOf(r) === here);
  return first >= 0 && first < step - 1 && slugOf(route[step - 1] || '') === here;
}
export function placeOf(name, camp) { return placesFor(camp)[slugOf(name)] || PLACES[slugOf(name)] || null; }
export function placeBeat(kind, name, { help = false, camp = null, heroes = [], again = false, guard = null } = {}) {
  const p = placeOf(name, camp); if (!p) return null;
  const twice = !help && again && p.again; // a second visit on the route has its own fight and its own lines
  const g = !help && !twice && guard && p.guardians?.[guard]?.[kind] ? guard : null; // T27: this hero's step 5 guardian
  const text = help ? (kind === 'arrive' ? p.helpArrive : p.helpWin) : twice ? (kind === 'arrive' ? p.again.arrive : p.again.win)
    : g ? p.guardians[g][kind] : (kind === 'arrive' ? p.arrive : p.win);
  if (!text?.length) return null;
  const id = g ? `guard-${kind}:${slugOf(name)}:${g}` : `${help ? `help-${kind}` : twice ? `again-${kind}` : kind}:${slugOf(name)}`;
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
  const gm = /^guard-(arrive|win):([^:]+):([a-z0-9]+)$/.exec(id || '');
  if (gm) {
    const p = placesFor(camp)[gm[2]] || PLACES[gm[2]]; const text = p?.guardians?.[gm[3]]?.[gm[1]] || (gm[1] === 'arrive' ? p?.arrive : p?.win);
    if (!text) return null;
    const names = { seed: camp?.seed, lineId: id };
    return { id, act, icon: p.icon || 'road', kicker: fillNames(gm[1] === 'win' ? 'The fight is over' : 'You arrive', heroes, names), title: fillNames(p.title, heroes, names), text: fillNames(text, heroes, names) };
  }
  if (id?.startsWith('arrive:') || id?.startsWith('win:') || id?.startsWith('help-') || id?.startsWith('again-')) {
    const [kind, ...rest] = id.split(':');
    const p = placesFor(camp)[rest.join(':')] || PLACES[rest.join(':')]; if (!p) return null;
    const helpArrive = kind === 'help-arrive';
    const helpWin = kind === 'help-win';
    const twice = kind.startsWith('again-') ? (p.again || p) : null; // a revisit's own lines (or the place's, if it has none)
    const text = twice ? (kind === 'again-arrive' ? twice.arrive : twice.win)
      : helpArrive ? (p.helpArrive || p.arrive) : helpWin ? (p.helpWin || p.win) : kind === 'arrive' ? p.arrive : p.win;
    const names = { seed: camp?.seed, lineId: id };
    return {
      id, act, icon: p.icon || 'road',
      kicker: fillNames(kind === 'win' || helpWin || kind === 'again-win' ? 'The fight is over' : 'You arrive', heroes, names),
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
      const b = placeBeat('arrive', place, { help, camp: c, again: revisit(c, place) });
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
  const b = placeBeat('win', place, { help, camp: c, again: revisit(c, place), guard: c.step === 5 ? guardianFor(c) : null });
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
