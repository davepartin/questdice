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
    'For as long as anyone could remember, the Dawn Lantern burned on the hill above Cinder Ford. Its light kept the Marches green, the roads safe, and the long nights mercifully short. Nobody ever thanked it, of course. You don’t thank the sun. You just grumble when it’s cloudy.',
    'Then the goblins came under a moonless sky. Their king carried the Lantern’s flame away in an iron cage and, being a goblin, set fire to several things on the way out. Now the fields smoulder. The wolves grow bold. And everyone agrees that Something Should Be Done, preferably by somebody else.',
    'You are not much yet: a handful of dice and a stubborn heart. But someone has to walk toward the smoke, and everybody else has suddenly remembered urgent business indoors. Bring the light home.',
  ] },
  'elite:1': { kicker: 'The road narrows', title: 'A Guard on the Road', icon: 'skull', text: [
    'The Goblin King has posted a guard where the road narrows: a hill ogre, paid in stolen bread and the vague promise of more. The bread arrived. The more did not.',
    'He is slow, and he is not clever, and he has been told both often enough to be a bit touchy about it. But he hits like a falling tree. Watch for him winding up. Get past him, and the king’s hill comes into sight.',
  ] },
  'boss:1': { kicker: 'Gallows Hill', title: 'The Goblin King', icon: 'crown', text: [
    'From the top of the hill you can see it at last: the Lantern’s flame, pale and thrashing in its iron cage beside the Goblin King’s throne.',
    'He calls it his treasure. He has never once looked at it with joy; he simply cannot bear for anyone else to have it. Which, to be fair, describes most of his belongings, including several spoons. He keeps glancing at the sky, as if someone important is running late. Take it back.',
  ] },
  'close:1': { kicker: 'The cage breaks', title: 'Only a Spark', icon: 'shine', text: [
    'The king falls among his piles of stolen gold, which is at least a soft landing, and the iron cage splits open. But the flame inside is only a spark now, barely warm in your hands.',
    'On the bars, burnt deep, is a dragon’s claw-seal. Far off, a voice like a forge with opinions: “Keep it warm for me, little thieves.”',
    'Something has been drinking the light from below. The last sparks drift away from you, down the old crypt stair, as if they know the way home better than you do. They probably do. Follow them anyway.',
  ] },
  'open:2': { kicker: 'Act II', title: 'The Hollow Crypt', icon: 'skull', text: [
    'Beneath the Marches lie the old halls of the dead, quiet for a hundred years. Not any more. The bones have stood up, and they march in rows, which is frankly more organised than the living ever managed.',
    'Each one carries a stolen sliver of the Lantern’s light, held tight inside its ribs like a coal it is afraid to drop. Follow the sparks down. Bring every sliver back. Mind the stairs. They are not on your side.',
  ] },
  'elite:2': { kicker: 'The lower door', title: 'The Bone Warden', icon: 'shield', text: [
    'The lower halls have a keeper: the Bone Warden, a giant of fused bone that has stood at the deep door for a hundred years without once sitting down. The back must be killing it. It does not appear to care.',
    'It does not hate you. It does not want anything. It simply will not move, with all the quiet determination of a queue at the post office. Make it.',
  ] },
  'boss:2': { kicker: 'The bottom of the dark', title: 'The Hollow Lich', icon: 'crown', text: [
    'At the very bottom sits the Hollow Lich, a king of bones with an empty chest. He does not stand when you come in. He just looks very, very tired, like a man who has been kept on hold for a century.',
    '“Do you know what is waiting for that light, up in the mountains? I hid it from her. I am the only thing that ever did.” He would rather the whole world went cold than ask for help. He will not give it back. You will have to take it.',
  ] },
  'close:2': { kicker: 'Dawn', title: 'The Light Comes Home', icon: 'shine', text: [
    'The Lich crumbles, and every stolen sliver of light rushes up out of the crypt at once: up the stair, across the ashen fields, back into the Lantern on its hill.',
    'For the first time in a long time the sun rises on the Marches, and the farmers, being farmers, complain that it is a bit bright. But as dawn breaks, the far mountains glow red, and something enormous unfolds its wings on the highest peak.',
    'The light shines in the darkness. The darkness has not overcome it. Something else is still watching. Bring a hat. It looks windy up there.',
  ] },
  'open:3': { kicker: 'Act III', title: 'The Ember Peaks', icon: 'flame', text: [
    'The Lantern burns again, and a light on a hill can be seen from a very long way off. Somebody has been watching this one for a thousand years, and she is not the forgiving sort.',
    'The road climbs into the Ember Peaks: dragon fire, broken oaths, and a queen who believes that everything that glitters is hers, including several things that only shine a bit in the right light. Above all, she wants back the one gift she ever gave away.',
    'Climb to the hoard. Remind her what she used to be. Take water. It’s a dry heat.',
  ] },
  'elite:3': { kicker: 'The Brazen Bridge', title: 'The Queen on the Bridge', icon: 'crown', text: [
    'A bridge of hammered bronze spans a canyon of lava, wide enough for an army, and quite empty. Then the canyon goes dark, because something has parked itself in front of the sun.',
    'Vharaxis, the Ember Queen, lands on the bridge, and the bronze glows red under her claws. “Kneel, little thieves. Every coin in this land was mine before your grandmothers were born. And that Lantern was the first.”',
    'She will not stay to finish this; queens rarely do their own tidying. When she is hurt enough she will laugh, fly to her throne, and wait for you there. Do bring her Lantern. She asked nicely, for a dragon.',
  ] },
  'boss:3': { kicker: 'The Ember Throne', title: 'The Ember Throne', icon: 'crown', text: [
    'The throne room is the inside of the volcano: a hoard so vast the walls are made of it, with crowns stacked like dinner plates and rivers of rubies nobody has ever dusted.',
    'Vharaxis uncoils from the top of it, still scarred from the bridge and not at all gracious about it, eyes like twin furnaces. The first thing she ever gave away is the one thing she cannot stop wanting back.',
    'Peeking out from behind a golden goblet is a very small red dragon, holding a single coin. Your coin, the first one it ever stole. It has the decency to look slightly embarrassed.',
  ] },
  'close:3': { kicker: 'A keeper for the light', title: 'A Keeper for the Light', icon: 'shine', text: [
    'The little dragon waddles out and drops every coin it ever took at your feet, along with three buttons and somebody’s spoon. Vharaxis stares at it, and the greed in her eyes gutters out like a candle.',
    'She shrinks, smaller and smaller, until all that is left is a little warm ember, the same one that once lit a shepherd’s lantern. Cinderling picks it up gently.',
    'The Lantern burns on its hill again, brighter than anyone remembers, and curled around it, snoring sparks, is its new keeper. The light shines in the darkness, and the darkness has not overcome it.',
  ] },
  // The Ascents (act 4 on): the same lands, harder, with a short new chapter each time.
  'open:ascent:1': { kicker: 'Ascent', title: 'The Light Is Tested', icon: 'flame', text: [
    'The Lantern burns again and the Marches are healing. But a light on a hill can be seen from far away, and some people never take a hint.',
    'Bolder warbands come down out of the hills, with wolves that remember the dark. They want the flame back. Stand watch on the road. Again. The stew can wait.',
  ] },
  'open:ascent:2': { kicker: 'Ascent', title: 'Deeper Still', icon: 'skull', text: [
    'The old halls have filled again with bones that would rather stay in the dark. Nobody is quite sure where they keep finding new ones. Best not to ask the closets.',
    'Go down once more, and keep the light where it belongs.',
  ] },
  'open:ascent:3': { kicker: 'Ascent', title: 'The Peaks Remember', icon: 'flame', text: [
    'The Ember Peaks still smoke. Greed is a coal under ash: stamp it out, and it waits.',
    'Climb again. The Queen’s children are older, angrier, and have clearly been told about you. The hoard has grown. So, with any luck, have you.',
  ] },
  'boss:ascent:1': { kicker: 'Gallows Hill', title: 'The King Returns', icon: 'crown', text: [
    'He ran from the last fight with a crown of ash and a grudge. Now the Goblin King is back, greedier than ever and wearing a slightly bigger hat.',
    'Some people never learn that the things they grab never make them happy. Remind him why he ran. Bring a bigger hat if you like. It will not help him.',
  ] },
  'boss:ascent:2': { kicker: 'The bottom of the dark', title: 'The Lich Rises Again', icon: 'crown', text: [
    'Bones remember. The Hollow Lich has pulled himself back together, colder than before and with one or two bits in the wrong places.',
    'Send him back to his rest, and bring the light up with you. He can keep the spare elbow.',
  ] },
  'boss:ascent:3': { kicker: 'The Ember Throne', title: 'The Queen Stirs', icon: 'crown', text: [
    'The ember on the hill is still a gift. Someone in the peaks still wants it back.',
    'Meet her at the throne once more, and remind her that giving is how a fire stays warm.',
  ] },
  'close:ascent': { kicker: 'The light holds', title: 'The Road Goes On', icon: 'shine', text: [
    'The light holds, and the land breathes easier. But the road is long, and there is always another hill. Pack a sandwich. Pack two. Hills are hungry work.',
  ] },
};

// Arrival and victory lines for every painted place. `foes` is the locked first-pass fight (must match ACTS.fights).
// Help-revisit copy (`helpFoes` / helpArrive / helpWin) is used at the Call for Help (step 8).
const PLACES = {
  'cinder-ford': {
    title: 'Cinder Ford', icon: 'flame',
    foes: ['goblin'],
    helpFoes: ['cinderling', 'goblin'],
    arrive: ['The river runs grey with ash, and the stepping stones hiss when you cross, as if they would rather not. On the far bank the Lantern hill stands dark for the first time in living memory.', 'A lone goblin is trying to make off with the ferryman’s cooking pot. It is very much too heavy for him, and he is very much too proud to say so. He has already stuffed a ladle down his shirt, in case the pot does not work out. Goblins pilfer first and plan later.'],
    win: ['The pot clangs back onto the bank and the goblin leaves at speed, taking his dignity with him, such as it was, and leaving the ladle, which is progress. The ferryman points a shaking finger up toward the smoke. “They went that way. With the light. And, I think, my good spoon as well.”'],
    helpArrive: ['Smoke rises from the ferryman’s hut: a goblin counter-raid, led by a goblin wearing a Cinderling on his head like a hat. The little dragon is puffing sparks at the thatch and snatching coins off the windowsill. The goblin has not noticed. Hats rarely do the noticing, in fairness.'],
    helpWin: ['The Cinderling hops off and flees with one last coin, as little dragons do when the fire goes out of them. You saved the ferry; the other place will have to wait. The ferryman presses a warm crust into your hand, which is the most generous thing anyone in the Marches has done all week.'],
  },
  'burnt-orchard': {
    title: 'Burnt Orchard', icon: 'flame',
    foes: ['cinderling', 'goblin'],
    helpFoes: ['cultist', 'goblin'],
    arrive: ['Rows of apple trees stand black and smoking, but the air smells wonderful: every apple has been baked on the branch. It is, technically, a disaster. It is also, technically, pudding.', 'A Cinderling is curled up in a pile of stolen goblin coins, crunching baked apples and hiccupping sparks. A goblin named Skiv is trying to snatch the gold back without getting toasted. They have been arguing for an hour. Neither is winning. Both are very sure they are.'],
    win: ['The little dragon puffs a splash of sparks at you, grabs one last coin, and scampers off into the smoke when the fight turns, looking enormously pleased with itself. Skiv flees the other way, still shouting about receipts. You have a funny feeling you will see the dragon again. Funny feelings are often right, on this road.'],
    helpArrive: ['The last unburnt tree, the one the village kids climb, is surrounded by an Ember Mage who wants to light it as a beacon, and a goblin holding the matches and looking very important. The village kids have strong opinions about this. So should you.'],
    helpWin: ['The Ember Mage’s fire-ward fizzles, the goblin drops the matches, and the tree still stands. The village kids will climb it again, against all sensible advice. The other call will have to wait.'],
  },
  'ravens-rest': {
    title: 'Ravens’ Rest', icon: 'skull',
    foes: ['cultist', 'wolf'],
    arrive: ['An old waystation with a slumped roof, where a hundred ravens line every beam and watch you in total, judgemental silence. You have been judged. The verdict is pending.', 'A caravan’s lanterns lie smashed in the yard. An Ember Mage in a red hood is reciting over a bonfire made of wagon wheels, which is not what wagon wheels are for, while a dire wolf named Soot stalks the porch and howls whenever the chant misses a beat. The mage tangles the air with sparks. Soot is the one with the better sense of timing.'],
    win: ['The Ember Mage’s ward burns out and Soot’s howl cracks in the middle. The ravens take off all at once, a black roar of wings, and drop a single bright feather at your feet. From a raven, that is practically a standing ovation.'],
  },
  'wolfwood-edge': {
    title: 'Wolfwood Edge', icon: 'skull',
    foes: ['wolf', 'wolf'],
    arrive: ['The forest stops in a hard line, as if the trees are afraid to step into the burnt fields. Between the trunks, two pairs of yellow eyes blink in time. Not a nation of wolves. A pair. That is quite enough.', 'They have a system. One stalks and waits to pounce. The other howls until the leaves shiver, so you will look the wrong way. You look both ways anyway. They seem faintly put out.'],
    win: ['The pair melts back into the trees. One old wolf stops at the edge, looks at you for a long moment, and decides you are not worth the bother. You choose to take this as a compliment.'],
  },
  'the-toll-bridge': {
    title: 'The Toll Bridge', icon: 'skull',
    foes: ['ogre'],
    arrive: ['A narrow stone bridge over a gorge full of steam, with a toll gate made of goblin-painted shields. The paint is enthusiastic. The engineering is not.', 'The toll-keeper is a hill ogre. He sits on the bridge eating a whole loaf in one bite, and a sign at his feet reads “TOLL: EVRYTHING”. The spelling is his own. So, apparently, is the bridge. Watch for him winding up. He hits like a falling tree, and he has been told so often enough to be a bit touchy about it.'],
    win: ['The ogre sits down hard after the last wind-up goes nowhere. The bridge holds, just. Gallows Hill rises out of the smoke on the far side, and nobody asks you for a penny. Progress.'],
  },
  'smoke-hollow': {
    title: 'Smoke Hollow', icon: 'flame',
    foes: ['cultist', 'cinderling'],
    arrive: ['A bowl-shaped valley where the smoke pools like a lake, thick enough to taste. Strange tracks are pressed into the scorched earth: claw prints as wide as a cart, with the grass burnt in the shape of wings.', 'An Ember Mage is kneeling in the middle of a scorch mark the size of a house, looking hopeful in a way you do not like, and trying to teach a bored Cinderling to siphon the light out of the air. The little dragon would rather puff sparks at passing moths. The lesson is not going well. The moths are having a worse time.'],
    win: ['The Cinderling flees uphill in a splash of sparks the moment the fight turns, which is its one reliable skill. The Ember Mage shouts “SHE comes!” and follows it, which is an odd way to greet someone you have been waiting for all day. You do not wait to ask.'],
  },
  'ashfall-camp': {
    title: 'Ashfall Camp', icon: 'flame',
    foes: ['goblin', 'goblin', 'goblin'],
    arrive: ['The Goblin King’s war-camp sprawls across the foot of the hill: tents patched from stolen quilts, cookpots, and piles of loot higher than the tents. Ash falls like grey snow and settles on everything, including the goblins, who have not noticed.', 'On duty at the gate are Pip, Pog and Nib, goblin triplets, each wearing a stolen sock as a sash. Pip is the one with the fire bomb. Pog pilfers anything that is not nailed down, and several things that are. Nib ducks behind the other two and claims this is tactics. They are arguing about whose turn it is to hammer a new sign: “KING’S TREESURY: KEEP OUT (THIS MEANS DRAGONS).” The spelling is a work in progress. The fear is not.'],
    win: ['Pip’s last fire bomb goes off in the cookpot. Pog tries to steal your boot mid-fight and comes away with a lace. Nib had already started running. In the herald’s pocket: a scrap of a contract, scorched at the edges, signed with a claw. You can only make out three words: “…keep it WARM…” Goblins, it turns out, never read the small print.'],
  },
  'gallows-hill': {
    title: 'Gallows Hill', icon: 'crown',
    foes: ['goblinking'],
    arrive: ['The goblin road zig-zags up the hill past old wooden posts that once held lanterns for travellers. At the top, a pale light thrashes in an iron cage.', 'The Goblin King’s throne is a mountain of stolen gold: spoons, door-knockers, a church bell, somebody’s grandmother’s teapot. He grins with a mouth full of gold teeth, not all of them his, and claps twice. That is the Rally: more goblins, if you let him. He also likes fire bombs and a gold shield, and he will wind up if you let him think. Try not to let him think.'],
    win: ['The Goblin King topples off his throne in a landslide of spoons. Somebody’s grandmother gets her teapot back. It’s a start. The spoons will sort themselves out.'],
  },
  'the-weeping-stair': {
    title: 'The Weeping Stair', icon: 'skull',
    foes: ['skeleton', 'skeleton'],
    arrive: ['A spiral stair cut into the rock, slick with water that drips from the ceiling like slow tears. The last sparks of the Lantern drift down ahead of you, lighting one step at a time, which is helpful, on steps that are slippery, which is not.', 'Below, two Bone Soldiers go click, click, click in perfect marching rhythm. They have been practising. One keeps its shield up. The other is saving a bone to throw, which is not polite on stairs.'],
    win: ['Two slivers of light slip out of the fallen bones and swirl into your lantern. It is a little warmer already. So, frankly, are you.'],
  },
  'candle-vault': {
    title: 'Candle Vault', icon: 'spark',
    foes: ['wraith', 'skeleton'],
    helpFoes: ['wraith', 'skeleton'],
    arrive: ['Thousands of candles crowd every shelf, ledge and nook, and not one of them is lit. Somebody has gone to enormous trouble to make this room gloomy.', 'In the middle of the vault a Wraith is pinching out the very last flame, one by one, with a long and deeply satisfied sigh. It has hobbies. Unfortunate ones. A Bone Soldier holds the basket of snuffers and looks, as much as a skull can, like it would rather be anywhere else. The Wraith will phase through a swing if you let it show off.'],
    win: ['You touch your spark to one candle, it leaps to the next, and the whole vault blazes gold. The Wraith backs through a wall, muttering. The Bone Soldier drops the snuffers with a clatter that sounds a lot like relief.'],
    helpArrive: ['The candles you lit are going out one row at a time: the Wraith has come back, and this time the Bone Soldier is carrying two snuffers and an expression of grim professionalism. Dedicated, you will give them that.'],
    helpWin: ['The Wraith’s chill fades and the Bone Soldier sits down, which is a first. The place you saved glows behind you like a lighthouse all the way down. Warmth has a way of lingering, once you invite it.'],
  },
  'the-pale-nave': {
    title: 'The Pale Nave', icon: 'skull',
    foes: ['dirgesinger', 'skeleton', 'skeleton'],
    helpFoes: ['dirgesinger', 'skeleton'],
    arrive: ['A long, tall hall with rows of stone benches, all facing nothing. A choir of dusty figures stands where the singers used to stand.', 'The soloist is a Dirge Singer in a moth-eaten collar, already winding up a hush that will steal the words out of your next roll. On either side, two Bone Soldiers hold the hymn-books upside down. Also, two of them are flat. Reviews would not be kind. The dirge itself has no warmth in it at all, which is rather the point.'],
    win: ['The Dirge Singer’s hush cracks mid-note. The Bone Soldiers stop, as if someone has closed a book. Your own whistling fills the hall instead, slightly out of tune, and it echoes back warmer. That will do.'],
    helpArrive: ['The Dirge Singer has re-formed the choir for an encore nobody asked for, and a Bone Soldier is back on the aisle with a collection plate. Their song is pulling the warmth out of the whole level.'],
    helpWin: ['The hall is quiet, and a little warmer. The other call will have to wait.'],
  },
  'grave-silk-hall': {
    title: 'Grave-Silk Hall', icon: 'skull',
    foes: ['spider', 'spider'],
    arrive: ['Webs hang from the ceiling like pale curtains, so thick that the hall glows faintly where your light touches them. Whoever did the dusting gave up some centuries ago.', 'Two Crypt Spiders have split the hall the way some people split a flat. One webs the doorway so you will stay for tea. The other drips venom and skitters along the beams, which is its idea of hospitality. Eight glossy eyes appear above you, then sixteen. You stop counting. Again.'],
    win: ['The wriggling bundle in the silk turns out to be a crate of spoons and one very cross moth. The spiders skitter for the dark, leaving a hall that could use a broom and about three centuries. You take the spoons. Somebody’s grandmother is having a week.'],
  },
  'ossuary-gate': {
    title: 'Ossuary Gate', icon: 'shield',
    foes: ['bonewarden'],
    arrive: ['A doorway made entirely of stacked bones, two storeys high, with a giant built from the same bones standing in front of it. The architect clearly had a theme and stuck to it.', 'The Bone Warden does not speak. It does not move. It has stood here for a hundred years, and it will stand here a hundred more unless somebody makes it step aside. If you let it, it will raise a Bone Soldier from the doorframe and put up a bone wall. It does not hate you. It simply will not move, with all the quiet determination of a queue at the post office.'],
    win: ['The Warden lowers its great arm, almost gently, and the gate grinds open onto cold black water. You are not sure that is an improvement. You go on anyway.'],
  },
  'mourners-row': {
    title: 'Mourner’s Row', icon: 'skull',
    foes: ['wraith', 'gloomstalker'],
    arrive: ['A narrow street of tiny stone houses carved into the crypt wall, each with a door the size of a cupboard. A Wraith sits on a doorstep, and the cold coming off it frosts your eyelashes.', 'At the end of the row, a Gloom Stalker waits with a black arrow already on the string. Its eyes are too warm for a ghost and much too interested. It will fade through the next wall if you stare, and snare your feet if you do not. The Wraith prefers to drain the warmth out of you while you make up your mind. Take your time. They have all night.'],
    win: ['The Wraith fades, and for the first time it looks peaceful. The Gloom Stalker leaves a black-fletched arrow in the lintel as a sort of rude review, and is gone. Peace looks well on the row.'],
  },
  'the-drowned-crypt': {
    title: 'The Drowned Crypt', icon: 'spark',
    foes: ['frostwhelp', 'frostwhelp'],
    arrive: ['Half the crypt has sunk under black, ice-cold water, and the tombs stick up like islands. Under the surface something glows a pale blue: a nest of eggs, each as big as a shield, frozen solid.', 'Two Frostwhelps have hatched and are having a territorial dispute about a puddle. One puffs frost across the ice. The other binds your boots with a flick of icy wings, then looks very pleased with itself. Adorable. You do not trust adorable. Not down here. They will flee for the eggs if the fight turns, which is almost charming.'],
    win: ['A puff of frost, a sneeze of snow. Adorable. Also, regrettably, lethal. The beaten whelps curl up on an egg to keep it company. These are dragon eggs. Whose?'],
  },
  'ash-cloister': {
    title: 'Ash Cloister', icon: 'crown',
    foes: ['lich'],
    arrive: ['A square garden at the bottom of the world, where the trees are made of stone and the “grass” is fine grey ash. In the middle stands a cloister with a cold blue light leaking out of every window.', 'The Hollow Lich sits on a plain stone chair with the stolen light swirling in the hollow of his chest like a trapped sunrise. He does not stand. He looks as if standing would be a lot to ask. He will raise the dead, drain what warmth you have left, and wrap a bone armour around himself if you let the fight go long. He would rather the whole world went cold than ask for help.'],
    win: ['The Hollow Lich lets go at last. For a moment he looks almost relieved, like a man finally allowed to put down something heavy. Then the light in his chest begins to rise.'],
  },
  'kindling-steps': {
    title: 'Kindling Steps', icon: 'flame',
    foes: ['cinderling', 'cinderling'],
    arrive: ['A staircase of black volcanic rock climbs into the clouds, every step warm enough to toast your boots. Gold coins are wedged in the cracks, dropped by dragons flying home to the hoard. Nobody has ever been brave enough to pick them up. You understand why, looking at them.', 'Halfway up, two Cinderlings have claimed the landing as a counting-house. They are named Ember and Almost-Ember, and they are having a very loud disagreement about whose coin is whose. One puffs a splash of sparks. The other snatches the disputed coin and sits on it. Neither will flee until the other does, on principle.'],
    win: ['Ember and Almost-Ember flee uphill in a shower of sparks, still arguing about the coin, which is now somewhere in your pack. They will tell their mother. Mothers, in their experience, solve things.'],
  },
  'the-glass-fields': {
    title: 'The Glass Fields', icon: 'spark',
    foes: ['gloomstalker', 'shieldbearer'],
    arrive: ['A whole valley melted to glass by dragon fire long ago, smooth as a frozen lake and reflecting a hundred copies of you, none of whom look ready. Every step rings like a bell.', 'A Gloom Stalker is on the ridge with a black arrow already drawn, fading in and out of the heat-haze whenever you look straight at it. Down on the glass, a Shieldbearer is trying to lock shields with a reflection of itself and looking faintly betrayed. You liked it better when it was just you, looking unready.'],
    win: ['You slide the Shieldbearer across the glass like a curling stone. The Gloom Stalker’s last arrow skips off into the glare. The whole valley rings with a note that sounds a lot like cheering.'],
  },
  'wyrmwatch': {
    title: 'Wyrmwatch', icon: 'flame',
    foes: ['chainbinder', 'cinderling'],
    helpFoes: ['gloomstalker', 'dirgesinger'],
    arrive: ['A crooked tower on a needle of rock, built by people who once kept watch for dragons. Now dragons keep watch from it, which rather defeats the point. Bells hang from every window, each rung to warn the Queen.', 'A Gold-Chain Jailer stands on the top floor, tying the bell-ropes so they ring whenever you move, and siphoning the spark out of the air for good measure. A Cinderling is perched on the clapper of the biggest bell, puffing sparks in time. Sneaking is off the table. It was never much on it, with you.'],
    win: ['The Jailer’s chains slacken. The Cinderling flees out a window, still holding a bell-rope, and rings one last note on the way down. Across the peaks a hundred hidden villagers ring theirs back: “We’re here. We’re with you.”'],
    helpArrive: ['The villagers who rang their bells back are being hunted. A Gloom Stalker is circling the tower with a black arrow, and a Dirge Singer on the stair is hushing the bells so nobody else can answer. The bells have opinions about this. So should you.'],
    helpWin: ['The Gloom Stalker fades into the heat, the Dirge Singer’s hush cracks, and the bells still answer. The other call will have to wait.'],
  },
  'hoardfall-mine': {
    title: 'Hoardfall Mine', icon: 'coin',
    foes: ['ironwarden', 'cinderling'],
    helpFoes: ['cinderling', 'cinderling'],
    arrive: ['A mineshaft spills an avalanche of coins down the mountainside, a frozen waterfall of gold. Miners in chains dig it out by lantern light, and every time they lift a coin, a Cinderling snatches it. Productivity is poor. Morale is poorer.', 'The foreman is an Ironclad Warden in a dented helm, standing in the mouth of the shaft with a stone wall already half-raised and a look that says the Queen still has not paid him. Deeper in, the tunnels glow orange: this is the edge of the hoard.'],
    win: ['The Ironclad Warden’s wall comes down. The Cinderling flees with both cheeks full of coins, which is at least a kind of payroll. You break the miners’ chains and they go home with full pockets and a fair wage, for once. One of them asks if you are hiring.'],
    helpArrive: ['The freed miners came back to rescue their friends, and they are trapped under a cave-in with two Cinderlings chewing on the support beams and puffing sparks at the props. The Cinderlings look well fed. The beams do not.'],
    helpWin: ['The Cinderlings flee with one last mouthful of timber. The miners walk out into the light. The other call will have to wait.'],
  },
  'the-brazen-bridge': {
    title: 'The Brazen Bridge', icon: 'crown',
    foes: ['vharaxis'],
    arrive: ['A bridge of hammered bronze spans a canyon of lava, wide enough for an army, and it is empty. Then the canyon goes dark, because something has blotted out the sun.', 'Vharaxis, the Ember Queen, lands on the bridge. The bronze glows red under her claws. “Kneel, little thieves. Every coin in this land was mine before your grandmothers were born. And that Lantern was the first.” Watch for the Inferno. When she inhales, the next breath will splash. She will not stay to finish this; queens rarely do their own tidying.'],
    win: ['At last she laughs, a sound like a collapsing forge, and launches into the sky before the fight can end properly. “Come up to my throne, then. Bring my Lantern.” She does not say please. Dragons never do.'],
  },
  'kettle-tarn': {
    title: 'Kettle Tarn', icon: 'spark',
    foes: ['frostwhelp', 'frostwhelp'],
    arrive: ['A mountain lake that boils and freezes at the same time. The dragon-heat from below meets the snowmelt from above, so the steam rises in towers and crashes back as hail. The weather here cannot make up its mind, so it does everything at once.', 'Two Frostwhelps slide across the ice patches and squabble with the boiling bubbles. One puffs frost at a geyser and looks personally offended when it answers in steam. The other binds your knees with icy wings and then sits down, as if that settled the matter. They came up from the crypt following you, because you smell like the light. A mixed compliment, on the whole.'],
    win: ['The whelps huddle together in the steam, small and shivering, and the tiny red Cinderling, who has been trailing you since the orchard and is not in this fight, thank you, shares its warmth with them. It pretends this was an accident.'],
  },
  'oathbreak-keep': {
    title: 'Oathbreak Keep', icon: 'shield',
    foes: ['fallenchampion'],
    arrive: ['A great castle hall where every banner shows the Dawn Lantern, all of them scorched. At the far end a figure in blackened armour kneels before a heap of dragon gold with a sword planted point-down.', 'He stands, and five different weapons hang from his belt: a blade, a bow, a chain, a shield, a horn. Sir Aldren Hale. The Fallen Champion. The Lantern’s first Keeper, and a man who could not pick a job, and then picked the wrong one. He will hush your next words, bind you in gold chain, and wind up an Oath Smite if you let the silence settle.'],
    win: ['His black armour cracks and falls away like old bark. Underneath he is just an old man with kind, tired eyes. “Her heart is the ember she gave away,” he whispers. “Remind her.”'],
  },
  'ember-throne-slopes': {
    title: 'Ember Throne slopes', icon: 'flame',
    foes: ['ashwyrm', 'shieldbearer'],
    arrive: ['The peak’s last slope is a river of slowly sliding gold coins, and climbing it is like wading uphill through a treasure chest. Lava falls glow on both sides. You would enjoy the view, if it were not trying to cook you.', 'Ashmaw the Wyrm is draped across the path with a notched wing and a fresh scar, inhaling for a fire-breath that will splash anyone standing too close. Beside him, a Shieldbearer in unpaid livery is still trying to lock shields with a dragon, which is a poor plan and a long contract. They are bickering about who is actually in charge of the slope. Above, the Queen’s roar shakes the whole mountain.'],
    win: ['Ashmaw flees uphill, roaring for his mother, which is becoming a habit. The Shieldbearer drops the shield, shrugs, and starts walking home. “She never paid anyone anyway,” he says. “Not once. Dragons.”'],
  },
  'the-ember-throne': {
    title: 'The Ember Throne', icon: 'crown',
    foes: ['vharaxis'],
    arrive: ['The throne room is the inside of the volcano: a hoard so vast the walls are made of it. Vharaxis uncoils from the top of it, still scarred from the bridge, eyes like twin furnaces. Inferno. Terrify. Inhale. She has been practising.', 'Peeking out from behind a golden goblet is a very small red dragon, holding a single coin. Your coin. You had wondered where that went. It is not in this fight. It has the decency to look slightly embarrassed about that.'],
    win: ['The Ember Queen sinks onto her hoard, and for the first time in a thousand years the coins go quiet. Behind a golden goblet, something small and red takes a deep breath and steps out.'],
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
