// The story thread (Dave, Oct 2026): a short beat at the moments that matter, so every fight is part of one journey.
// The Dawn Lantern kept the Marches safe. The Goblin King stole its flame out of greed; the Hollow Lich hid it from
// the Ember Queen out of fear. The heroes carry the light home. Light against the dark; nothing occult.
// Villains are greedy, cold or afraid. Defeated foes fall, crumble, flee or yield.
// Pure data and rules: no DOM. A beat is { kicker, title, icon, text: [paragraphs] }.
// When they show (before the road and the quest board): an act opening at quest 1 (after the last act's closing), a short
// beat before the elite at quest 5 and before the boss at quest 10. Place arrivals show before a fight; victory beats
// after. Seen beats are kept in campaign.storySeen.

import { ACTS, placeSlug, PLACE_ALIAS } from './data.js';

const slugOf = (name) => PLACE_ALIAS[placeSlug(name)] || placeSlug(name);

const BEATS = {
  'open:1': { kicker: 'Prologue', title: 'The Night the Light Went Out', icon: 'flame', text: [
    'For as long as anyone could remember, the Dawn Lantern burned on the hill above Cinder Ford. Its light kept the Marches green, the roads safe, and the long nights mercifully short. Nobody ever thanked it, of course. You don’t thank the sun. You just grumble when it’s cloudy.',
    'Then the goblins came under a moonless sky. Their king carried the Lantern’s flame away in an iron cage and, being a goblin, set fire to several things on the way out. Now the fields smoulder, the wolves grow bold, and everyone agrees that Something Should Be Done.',
    'You are not much yet: a handful of dice and a stubborn heart. But someone has to walk toward the smoke, and everybody else has suddenly remembered urgent business indoors. Bring the light home.',
  ] },
  'elite:1': { kicker: 'The road narrows', title: 'A Guard on the Road', icon: 'skull', text: [
    'The Goblin King has posted a guard where the road narrows: a hill ogre, paid in stolen bread and the vague promise of more.',
    'He is slow, and he is not clever, and he has been told both often enough to be a bit touchy about it. But he hits like a falling tree. Watch for him winding up. Get past him, and the king’s hill comes into sight.',
  ] },
  'boss:1': { kicker: 'Gallows Hill', title: 'The Goblin King', icon: 'crown', text: [
    'From the top of the hill you can see it at last: the Lantern’s flame, pale and thrashing in its iron cage beside the Goblin King’s throne.',
    'He calls it his treasure. He has never once looked at it with joy; he simply cannot bear for anyone else to have it. Which, to be fair, describes most of his belongings. He keeps glancing at the sky, as if someone important is running late. Take it back.',
  ] },
  'close:1': { kicker: 'The cage breaks', title: 'Only a Spark', icon: 'shine', text: [
    'The king falls among his piles of stolen gold, which is at least a soft landing, and the iron cage splits open. But the flame inside is only a spark now, barely warm in your hands.',
    'On the bars, burnt deep, is a dragon’s claw-seal. Far off, a voice like a forge with opinions: “Keep it warm for me, little thieves.”',
    'Something has been drinking the light from below. The last sparks drift away from you, down the old crypt stair, as if they know the way home better than you do. They probably do.',
  ] },
  'open:2': { kicker: 'Act II', title: 'The Hollow Crypt', icon: 'skull', text: [
    'Beneath the Marches lie the old halls of the dead, quiet for a hundred years. Not any more. The bones have stood up, and they march in rows, which is frankly more organised than the living ever managed.',
    'Each one carries a stolen sliver of the Lantern’s light, held tight inside its ribs like a coal it is afraid to drop. Follow the sparks down. Bring every sliver back. Mind the stairs.',
  ] },
  'elite:2': { kicker: 'The lower door', title: 'The Bone Warden', icon: 'shield', text: [
    'The lower halls have a keeper: the Bone Warden, a giant of fused bone that has stood at the deep door for a hundred years without once sitting down.',
    'It does not hate you. It does not want anything. It simply will not move, with all the quiet determination of a queue at the post office. Make it.',
  ] },
  'boss:2': { kicker: 'The bottom of the dark', title: 'The Hollow Lich', icon: 'crown', text: [
    'At the very bottom sits the Hollow Lich, a king of bones with an empty chest. He does not stand when you come in. He just looks very, very tired, like a man who has been kept on hold for a century.',
    '“Do you know what is waiting for that light, up in the mountains? I hid it from her. I am the only thing that ever did.” He would rather the whole world went cold than ask for help. He will not give it back. You will have to take it.',
  ] },
  'close:2': { kicker: 'Dawn', title: 'The Light Comes Home', icon: 'shine', text: [
    'The Lich crumbles, and every stolen sliver of light rushes up out of the crypt at once: up the stair, across the ashen fields, back into the Lantern on its hill.',
    'For the first time in a long time the sun rises on the Marches, and the farmers, being farmers, complain that it is a bit bright. But as dawn breaks, the far mountains glow red, and something enormous unfolds its wings on the highest peak.',
    'The light shines in the darkness. The darkness has not overcome it. Something else is still watching.',
  ] },
  'open:3': { kicker: 'Act III', title: 'The Ember Peaks', icon: 'flame', text: [
    'The Lantern burns again, and a light on a hill can be seen from a very long way off. Somebody has been watching this one for a thousand years, and she is not the forgiving sort.',
    'The road climbs into the Ember Peaks: dragon fire, broken oaths, and a queen who believes that everything that glitters is hers, including several things that only shine a bit in the right light. Above all, she wants back the one gift she ever gave away.',
    'Climb to the hoard. Remind her what she used to be. Take water: it’s a dry heat.',
  ] },
  'elite:3': { kicker: 'The Brazen Bridge', title: 'The Queen on the Bridge', icon: 'crown', text: [
    'A bridge of hammered bronze spans a canyon of lava, wide enough for an army, and quite empty. Then the canyon goes dark, because something has parked itself in front of the sun.',
    'Vharaxis, the Ember Queen, lands on the bridge, and the bronze glows red under her claws. “Kneel, little thieves. Every coin in this land was mine before your grandmothers were born. And that Lantern was the first.”',
    'She will not stay to finish this; queens rarely do their own tidying. When she is hurt enough she will laugh, fly to her throne, and wait for you there.',
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
    'Bolder warbands come down out of the hills, with wolves that remember the dark. They want the flame back. Stand watch on the road. Again.',
  ] },
  'open:ascent:2': { kicker: 'Ascent', title: 'Deeper Still', icon: 'skull', text: [
    'The old halls have filled again with bones that would rather stay in the dark. Nobody is quite sure where they keep finding new ones.',
    'Go down once more, and keep the light where it belongs.',
  ] },
  'open:ascent:3': { kicker: 'Ascent', title: 'The Peaks Remember', icon: 'flame', text: [
    'The Ember Peaks still smoke. Greed is a coal under ash: stamp it out, and it waits.',
    'Climb again. The Queen’s children are older, angrier, and have clearly been told about you. The hoard has grown.',
  ] },
  'boss:ascent:1': { kicker: 'Gallows Hill', title: 'The King Returns', icon: 'crown', text: [
    'He ran from the last fight with a crown of ash and a grudge. Now the Goblin King is back, greedier than ever and wearing a slightly bigger hat.',
    'Some people never learn that the things they grab never make them happy. Remind him why he ran.',
  ] },
  'boss:ascent:2': { kicker: 'The bottom of the dark', title: 'The Lich Rises Again', icon: 'crown', text: [
    'Bones remember. The Hollow Lich has pulled himself back together, colder than before and with one or two bits in the wrong places.',
    'Send him back to his rest, and bring the light up with you.',
  ] },
  'boss:ascent:3': { kicker: 'The Ember Throne', title: 'The Queen Stirs', icon: 'crown', text: [
    'The ember on the hill is still a gift. Someone in the peaks still wants it back.',
    'Meet her at the throne once more, and remind her that giving is how a fire stays warm.',
  ] },
  'close:ascent': { kicker: 'The light holds', title: 'The Road Goes On', icon: 'shine', text: [
    'The light holds, and the land breathes easier. But the road is long, and there is always another hill. Pack a sandwich.',
  ] },
};

// Arrival and victory lines for every painted place. Help-revisit copy is used at the Call for Help (step 8).
const PLACES = {
  'cinder-ford': {
    title: 'Cinder Ford', icon: 'flame',
    arrive: ['The river runs grey with ash, and the stepping stones hiss when you cross. On the far bank the Lantern hill stands dark for the first time in living memory.', 'A lone goblin is trying to make off with the ferryman’s cooking pot. It is very much too heavy for him, and he is very much too proud to say so.'],
    win: ['The pot clangs back onto the bank and the goblin leaves at speed. The ferryman points a shaking finger up toward the smoke. “They went that way. With the light. And, I think, my good ladle.”'],
    helpArrive: ['Smoke rises from the ferryman’s hut: a goblin counter-raid, led by a goblin wearing a little red dragon on his head like a hat. The hat is puffing sparks at the thatch. The goblin has not noticed.'],
    helpWin: ['You saved the ferry; the other place will have to wait. It goes in the chronicle, and the ferryman presses a warm crust into your hand, which is the most generous thing anyone in the Marches has done all week.'],
  },
  'burnt-orchard': {
    title: 'Burnt Orchard', icon: 'flame',
    arrive: ['Rows of apple trees stand black and smoking, but the air smells wonderful: every apple has been baked on the branch. It is, technically, a disaster. It is also, technically, pudding.', 'Something small and red is curled up in a pile of stolen goblin coins, crunching baked apples and hiccupping sparks. The goblins want their gold back. So, it turns out, does the something.'],
    win: ['The little dragon sneezes a spark at you, grabs one last coin, and scampers off into the smoke, looking enormously pleased with itself. You have a funny feeling you will see it again.'],
    helpArrive: ['The last unburnt tree, the one the village kids climb, is surrounded by Ember Mages who want to light it as a beacon. The village kids have strong opinions about this. So should you.'],
    helpWin: ['The tree still stands, and the village kids will climb it again, against all sensible advice. The other call will have to wait.'],
  },
  'ravens-rest': {
    title: 'Ravens’ Rest', icon: 'skull',
    arrive: ['An old waystation with a slumped roof, where a hundred ravens line every beam and watch you in total, judgemental silence.', 'A caravan’s lanterns lie smashed in the yard, and the trail of wax drips leads inside. Someone in a red hood is chanting over a bonfire made of wagon wheels, which is not what wagon wheels are for.'],
    win: ['The ravens take off all at once, a black roar of wings, and drop a single bright feather at your feet. From a raven, that is practically a standing ovation.'],
  },
  'wolfwood-edge': {
    title: 'Wolfwood Edge', icon: 'skull',
    arrive: ['The forest stops in a hard line, as if the trees are afraid to step into the burnt fields. Between the trunks, yellow eyes blink in pairs, then threes, then too many to count. You stop counting.', 'A howl starts low and climbs until the leaves shiver.'],
    win: ['The pack melts back into the trees. One old wolf stops at the edge, looks at you for a long moment, and decides you are not worth the bother. You choose to take this as a compliment.'],
  },
  'the-toll-bridge': {
    title: 'The Toll Bridge', icon: 'skull',
    arrive: ['A narrow stone bridge over a gorge full of steam, with a toll gate made of goblin-painted shields.', 'The toll-keeper is enormous. He sits on the bridge eating a whole loaf in one bite, and a sign at his feet reads “TOLL: EVRYTHING”. The spelling is his own. So, apparently, is the bridge.'],
    win: ['The ogre sits down hard. The bridge holds, just. Gallows Hill rises out of the smoke on the far side, and nobody asks you for a penny.'],
  },
  'smoke-hollow': {
    title: 'Smoke Hollow', icon: 'flame',
    arrive: ['A bowl-shaped valley where the smoke pools like a lake, thick enough to taste. Strange tracks are pressed into the scorched earth: claw prints as wide as a cart, with the grass burnt in the shape of wings.', 'The Ember Mages are here, kneeling in the middle of a scorch mark the size of a house, looking hopeful in a way you do not like.'],
    win: ['A shadow sweeps across the hollow, huge and fast, and is gone before you can look up. The mages shout “SHE comes!” and flee, which is an odd way to greet someone you have been waiting for all day.'],
  },
  'ashfall-camp': {
    title: 'Ashfall Camp', icon: 'flame',
    arrive: ['The Goblin King’s war-camp sprawls across the foot of the hill: tents patched from stolen quilts, cookpots, and piles of loot higher than the tents. Ash falls like grey snow and settles on everything, including the goblins, who have not noticed.', 'A goblin herald is hammering out a new sign: “KING’S TREESURY: KEEP OUT (THIS MEANS DRAGONS).”'],
    win: ['In the herald’s pocket: a scrap of a contract, scorched at the edges, signed with a claw. You can only make out three words: “…keep it WARM…” Goblins, it turns out, never read the small print.'],
  },
  'gallows-hill': {
    title: 'Gallows Hill', icon: 'crown',
    arrive: ['The goblin road zig-zags up the hill past old wooden posts that once held lanterns for travellers. At the top, a pale light thrashes in an iron cage.', 'The Goblin King’s throne is a mountain of stolen gold: spoons, door-knockers, a church bell, somebody’s grandmother’s teapot. He grins with a mouth full of gold teeth, not all of them his, and claps twice.'],
    win: ['The Goblin King topples off his throne in a landslide of spoons. Somebody’s grandmother gets her teapot back. It’s a start.'],
  },
  'the-weeping-stair': {
    title: 'The Weeping Stair', icon: 'skull',
    arrive: ['A spiral stair cut into the rock, slick with water that drips from the ceiling like slow tears. The last sparks of the Lantern drift down ahead of you, lighting one step at a time, which is helpful, on steps that are slippery, which is not.', 'Below, something goes click, click, click in perfect marching rhythm.'],
    win: ['Two slivers of light slip out of the fallen bones and swirl into your lantern. It is a little warmer already. So, frankly, are you.'],
  },
  'candle-vault': {
    title: 'Candle Vault', icon: 'spark',
    arrive: ['Thousands of candles crowd every shelf, ledge and nook, and not one of them is lit. Somebody has gone to enormous trouble to make this room gloomy.', 'In the middle of the vault a Wraith is pinching out the very last flame, one by one, with a long and deeply satisfied sigh.'],
    win: ['You touch your spark to one candle, it leaps to the next, and the whole vault blazes gold. The dark at the edges backs away, muttering.'],
    helpArrive: ['The candles you lit are going out one row at a time: the wraiths have come back, and this time they have brought snuffers.'],
    helpWin: ['The place you saved glows behind you like a lighthouse all the way down.'],
  },
  'the-pale-nave': {
    title: 'The Pale Nave', icon: 'skull',
    arrive: ['A long, tall hall with rows of stone benches, all facing nothing. A choir of dusty figures stands where the singers used to stand.', 'As you enter they all turn their heads at once, and the song they sing has no warmth in it at all. Also, two of them are flat.'],
    win: ['The cold song breaks off mid-note. Your own whistling fills the hall instead, slightly out of tune, and it echoes back warmer.'],
    helpArrive: ['The choir has re-formed for an encore nobody asked for, and their song is pulling the warmth out of the whole level.'],
    helpWin: ['The hall is quiet, and a little warmer. The other call will have to wait.'],
  },
  'grave-silk-hall': {
    title: 'Grave-Silk Hall', icon: 'skull',
    arrive: ['Webs hang from the ceiling like pale curtains, so thick that the hall glows faintly where your light touches them. Whoever did the dusting gave up some centuries ago.', 'Wrapped bundles sway gently in the silk: some are crates of stolen treasure, and one of them is wriggling. Eight glossy eyes appear above you, then sixteen.'],
    win: ['The wriggling bundle turns out to be a very cross, very alive goblin, who swears he will never steal again. Probably. He is already eyeing your purse.'],
  },
  'ossuary-gate': {
    title: 'Ossuary Gate', icon: 'shield',
    arrive: ['A doorway made entirely of stacked bones, two storeys high, with a giant built from the same bones standing in front of it. The architect clearly had a theme and stuck to it.', 'It does not speak. It does not move. It has stood here for a hundred years, and it will stand here a hundred more unless somebody makes it step aside.'],
    win: ['The Warden lowers its great arm, almost gently, and the gate grinds open onto cold black water.'],
  },
  'mourners-row': {
    title: 'Mourner’s Row', icon: 'skull',
    arrive: ['A narrow street of tiny stone houses carved into the crypt wall, each with a door the size of a cupboard. Grey shapes sit on every doorstep, and the cold coming off them frosts your eyelashes.', 'At the end of the row, a pair of glittering eyes reflect your light. They are too big for a spider and too warm for a ghost.'],
    win: ['The mourners fade one by one, and for the first time they look peaceful.'],
  },
  'the-drowned-crypt': {
    title: 'The Drowned Crypt', icon: 'spark',
    arrive: ['Half the crypt has sunk under black, ice-cold water, and the tombs stick up like islands. Under the surface something glows a pale blue: a nest of eggs, each as big as a shield, frozen solid.', 'One egg has a crack in it, and a tiny white head is poking out, puffing snowflakes.'],
    win: ['A puff of frost, a sneeze of snow. Adorable. Also, regrettably, lethal. The beaten whelp curls up on an egg to keep it company. These are dragon eggs. Whose?'],
  },
  'ash-cloister': {
    title: 'Ash Cloister', icon: 'crown',
    arrive: ['A square garden at the bottom of the world, where the trees are made of stone and the “grass” is fine grey ash. In the middle stands a cloister with a cold blue light leaking out of every window.', 'The Hollow Lich sits on a plain stone chair with the stolen light swirling in the hollow of his chest like a trapped sunrise.'],
    win: ['The Hollow Lich lets go at last. For a moment he looks almost relieved, like a man finally allowed to put down something heavy. Then the light in his chest begins to rise.'],
  },
  'kindling-steps': {
    title: 'Kindling Steps', icon: 'flame',
    arrive: ['A staircase of black volcanic rock climbs into the clouds, every step warm enough to toast your boots. Gold coins are wedged in the cracks, dropped by dragons flying home to the hoard. Nobody has ever been brave enough to pick them up.', 'Halfway up, a long, scaled shape is draped across the path with a notched wing and a fresh scar glowing like a forge seam.'],
    win: ['Ashmaw has not forgotten your face, and now he will not forget your dice either. Beaten again, he flees uphill, roaring for his mother.'],
  },
  'the-glass-fields': {
    title: 'The Glass Fields', icon: 'spark',
    arrive: ['A whole valley melted to glass by dragon fire long ago, smooth as a frozen lake and reflecting a hundred copies of you, none of whom look ready. Every step rings like a bell.', 'Shapes dart under the surface. No, wait: they are reflections of something on the ridges, drawing bows.'],
    win: ['You slide the last shieldbearer across the glass like a curling stone, and the whole valley rings with a note that sounds a lot like cheering.'],
  },
  'wyrmwatch': {
    title: 'Wyrmwatch', icon: 'flame',
    arrive: ['A crooked tower on a needle of rock, built by people who once kept watch for dragons. Now dragons keep watch from it, which rather defeats the point. Bells hang from every window, each rung to warn the Queen.', 'A jailer in chains of gold stands on the top floor, tying the bell-ropes so they ring whenever you move. Sneaking is off the table.'],
    win: ['You ring every bell in the tower at once, and across the peaks a hundred hidden villagers ring theirs back: “We’re here. We’re with you.”'],
    helpArrive: ['The villagers who rang their bells back are being hunted, and Gloom Stalkers are circling the tower.'],
    helpWin: ['The tower stands, and the bells still answer. The other call will have to wait.'],
  },
  'hoardfall-mine': {
    title: 'Hoardfall Mine', icon: 'coin',
    arrive: ['A mineshaft spills an avalanche of coins down the mountainside, a frozen waterfall of gold. Miners in chains dig it out by lantern light, and every time they lift a coin, a little red dragon snatches it. Productivity is poor.', 'Deeper in, the tunnels glow orange: this is the edge of the Queen’s hoard.'],
    win: ['You break the chains and the miners go home with full pockets and a fair wage, for once. One of them asks if you are hiring.'],
    helpArrive: ['The freed miners came back to rescue their friends, and they are trapped under a cave-in with Cinderlings chewing on the support beams.'],
    helpWin: ['The miners walk out into the light. The other call will have to wait.'],
  },
  'the-brazen-bridge': {
    title: 'The Brazen Bridge', icon: 'crown',
    arrive: ['A bridge of hammered bronze spans a canyon of lava, wide enough for an army, and it is empty. Then the canyon goes dark, because something has blotted out the sun.', 'Vharaxis, the Ember Queen, lands on the bridge. “Kneel, little thieves. Every coin in this land was mine before your grandmothers were born. And that Lantern was the first.”'],
    win: ['At last she laughs, a sound like a collapsing forge, and launches into the sky. “Come up to my throne, then. Bring my Lantern.” She does not say please. Dragons never do.'],
  },
  'kettle-tarn': {
    title: 'Kettle Tarn', icon: 'spark',
    arrive: ['A mountain lake that boils and freezes at the same time. The dragon-heat from below meets the snowmelt from above, so the steam rises in towers and crashes back as hail. The weather here cannot make up its mind, so it does everything at once.', 'Frostwhelps slide across the ice patches and squabble with the boiling bubbles. They came up from the crypt following you, because you smell like the light.'],
    win: ['The whelps huddle together in the steam, small and shivering, and the tiny red Cinderling, who has been trailing you since the orchard, shares its warmth with them. It pretends this was an accident.'],
  },
  'oathbreak-keep': {
    title: 'Oathbreak Keep', icon: 'shield',
    arrive: ['A great castle hall where every banner shows the Dawn Lantern, all of them scorched. At the far end a knight in blackened armour kneels before a heap of dragon gold with his sword planted point-down.', 'He stands, and five different weapons hang from his belt: a knight’s blade, a ranger’s bow, a wizard’s chain, a warden’s shield, a bard’s horn. Sir Aldren Hale. The Lantern’s first Keeper.'],
    win: ['His black armour cracks and falls away like old bark. Underneath he is just an old man with kind, tired eyes. “Her heart is the ember she gave away,” he whispers. “Remind her.”'],
  },
  'ember-throne-slopes': {
    title: 'Ember Throne slopes', icon: 'flame',
    arrive: ['The peak’s last slope is a river of slowly sliding gold coins, and climbing it is like wading uphill through a treasure chest. Lava falls glow on both sides.', 'Above, the Queen’s roar shakes the whole mountain, and loose gold rains down around you.'],
    win: ['The last hired guards drop their weapons, shrug, and start walking home. “She never paid anyone anyway,” says one. “Not once. Dragons.”'],
  },
  'the-ember-throne': {
    title: 'The Ember Throne', icon: 'crown',
    arrive: ['The throne room is the inside of the volcano: a hoard so vast the walls are made of it. Vharaxis uncoils from the top of it, still scarred from the bridge, eyes like twin furnaces.', 'Peeking out from behind a golden goblet is a very small red dragon, holding a single coin. Your coin.'],
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
export function beatId(kind, act) {
  if (ascentOf(act) === 1) return BEATS[`${kind}:${act}`] ? `${kind}:${act}` : null;
  if (kind === 'close') return 'close:ascent';
  if (kind === 'elite') return null;
  return BEATS[`${kind}:ascent:${landOf(act)}`] ? `${kind}:ascent:${landOf(act)}` : null;
}
export function placeOf(name) { return PLACES[slugOf(name)] || null; }
export function placeBeat(kind, name, { help = false } = {}) {
  const p = placeOf(name); if (!p) return null;
  const text = help ? (kind === 'arrive' ? p.helpArrive : p.helpWin) : (kind === 'arrive' ? p.arrive : p.win);
  if (!text?.length) return null;
  const id = `${help ? `help-${kind}` : kind}:${slugOf(name)}`;
  return { id, kicker: kind === 'arrive' ? 'You arrive' : 'The fight is over', title: p.title, icon: p.icon || 'road', text };
}
// A beat ready to show: the text, with the kicker naming the act and Ascent.
export function beat(id, act) {
  if (id?.startsWith('arrive:') || id?.startsWith('win:') || id?.startsWith('help-')) {
    const [kind, ...rest] = id.split(':');
    const p = PLACES[rest.join(':')]; if (!p) return null;
    const helpArrive = kind === 'help-arrive';
    const helpWin = kind === 'help-win';
    const text = helpArrive ? (p.helpArrive || p.arrive) : helpWin ? (p.helpWin || p.win) : kind === 'arrive' ? p.arrive : p.win;
    return { id, act, kicker: kind === 'win' || helpWin ? 'The fight is over' : 'You arrive', title: p.title, icon: p.icon || 'road', text };
  }
  const b = BEATS[id]; if (!b) return null;
  const asc = ascentOf(act);
  const kicker = asc > 1 && b.kicker === 'Ascent' ? `Ascent ${asc} · Act ${romans[landOf(act) - 1]}` : b.kicker;
  return { id, act, kicker, title: b.title, icon: b.icon, text: b.text };
}
const seen = (c, id, act) => (c.storySeen || []).includes(`${id}@${act}`);
// What to show now, in order (usually zero or one beat; at an act's first quest, the last act's closing then this act's opening).
export function pending(c, place) {
  if (!c) return [];
  const out = [];
  const add = (kind, act) => { const id = beatId(kind, act); if (id && !seen(c, id, act)) out.push({ id, act }); };
  if (c.step === 1) { if (c.act > 1) add('close', c.act - 1); add('open', c.act); }
  if (c.step === 5) add('elite', c.act);
  if (c.step === 10) add('boss', c.act);
  // Elite and boss cards already tell the set-piece; skip the matching place arrival so it isn't told twice.
  const skipPlace = c.step === 5 || c.step === 10
    || out.some((x) => /^(open|close|elite|boss):/.test(x.id));
  if (place && !skipPlace) {
    const help = c.step === 8 && !!c.nextPlace;
    const b = placeBeat('arrive', place, { help });
    if (b && !seen(c, b.id, c.act)) out.push({ id: b.id, act: c.act, place });
  }
  return out;
}
export function pendingVictory(c, place) {
  if (!c || !place) return null;
  const help = c.step === 8 && !!c.nextPlace;
  const b = placeBeat('win', place, { help });
  if (!b || seen(c, b.id, c.act)) return null;
  return { id: b.id, act: c.act, place };
}
export function markSeen(c, id, act) { c.storySeen = [...new Set([...(c.storySeen || []), `${id}@${act}`])]; }
export function applyPlaceVictory(campaign, place) {
  if (!campaign || !place) return;
  if (slugOf(place) === 'oathbreak-keep') {
    campaign.blessings = [...(campaign.blessings || []), {
      id: 'keepers-oath', name: 'Keeper’s Oath', text: '+3 block against breath.', fights: 2, breathBlock: 3, block: 0,
    }];
  }
}
// The story so far: every beat up to where the campaign stands, in order (for the menu's "The story so far").
export function storySoFar(c) {
  if (!c) return [];
  const out = [];
  for (let a = 1; a <= c.act; a++) {
    const here = a === c.act;
    const push = (kind) => { const id = beatId(kind, a); if (id) out.push(beat(id, a)); };
    push('open');
    if (!here || c.step >= 5) push('elite');
    if (!here || c.step >= 10) push('boss');
    if (!here) push('close');
  }
  return out;
}
