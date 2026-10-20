// Writer copy for the starfall pack, "Pip Needs a Lift" (Claude, Oct 2026): a 1–6 hero campaign written to show what a pack can do.
// Every step has its own arrival and win, every quiet step has its own road moment (act.moments[step - 1]), and the secret
// objectives have their own voice (Mother Hob, the wish-broker). The cast is drawn from the whole miniature catalog (docs/MINIS.md),
// mostly the minis no other story has used yet. Hero text uses {names} / {someone}, never "he" or "she".

// The voice that hands out the envelopes before every fight (secrets.js reads pack.voice).
export const voice = {
  name: 'Mother Hob',
  scenes: [
    'Mother Hob, a goblin grandmother in eleven shawls, hands you a sealed envelope. Read it. Don’t show the others.',
    'Mother Hob is sitting on a rock, knitting. “Before you start,” she says. “Hob has an envelope for each of you. Read it. Don’t show the others.”',
    'There is a smell of peppermint and old pennies, and Mother Hob tucks envelopes into pockets. “Hob only wants the star,” she says. “Hob pays for small favours in the meantime.”',
    'A jar rolls to a stop at your feet. Inside is a folded envelope, and a note: ONE EACH. NO PEEKING. — HOB.',
  ],
};

export const beats = {
  'open:1': {
    kicker: 'Prologue',
    title: 'Something Fell at Cinder Ford',
    icon: 'shine',
    text: [
      'On the first night of autumn a star falls over the Ashen Marches and lands in the mud at Cinder Ford. In the crater sits a small green creature with three eyes and a cracked glass stone in its lap. It looks at {names}. It says “Pip,” then points at the highest peak and says “home.”',
      'An old ferryman tells you the stars come closest on the Long Night, three moons from now, at the top of the Ember Throne. By morning every goblin and tusker in the Marches has heard that a fallen star grants a wish.',
    ],
  },
  'elite:1': {
    kicker: 'The Toll Bridge',
    title: 'Old Gravelhide',
    icon: 'skull',
    text: [
      'The only bridge out of the Marches belongs to Old Gravelhide, a dire bear the size of a hay cart. Winter is coming, and Gravelhide has been looking for something warm to sleep on.',
      'Pip’s glass stone is very warm. Gravelhide has noticed. When the bear rears up, the bridge shakes. Pip hides inside {someone}’s hood.',
    ],
  },
  'boss:1': {
    kicker: 'Gallows Hill',
    title: 'Gorvash, Warlord of the Ash-Tusks',
    icon: 'crown',
    text: [
      'On top of Gallows Hill, Gorvash, Warlord of the Ash-Tusks, has built a throne out of shields. He has heard that a fallen star grants one wish. He has a list. The first three are “EMPEROR OF EVERYTHING,” “BIGGER TUSKS,” and “TALLER.”',
      'His raiders have been chasing you since Cinder Ford. The boss has a cleaver and a banner. Pip looks at Gorvash and says “no.”',
    ],
  },
  'close:1': {
    kicker: 'Over the hill',
    title: 'The Stone Is Dimming',
    icon: 'shine',
    text: [
      'Gorvash rolls down the back of Gallows Hill. Pip is not well. The glass stone has a new crack, and its light is fading. Pip lives on starlight. The only road to the Ember Peaks goes down through the Hollow Crypt, where there has been no light for a thousand years.',
      'At the top of the crypt stair sits Mother Hob. “Hob will buy that star off you,” she says. “Hob will ask again.”',
    ],
  },
  'open:2': {
    kicker: 'Act II',
    title: 'Nothing Down Here Glows',
    icon: 'skull',
    text: [
      'The Hollow Crypt is dark in a way that has weight. Pip sits on {someone}’s shoulder and glows as hard as it can. It is still the brightest thing for a mile.',
      'Things that glow get noticed. Far below, something tall and thin has smelled a light it has never seen before, and it has started to climb. You will need more candles. You will need to go faster.',
    ],
  },
  'elite:2': {
    kicker: 'Ossuary Gate',
    title: 'Mister Hush',
    icon: 'shield',
    text: [
      'At the Ossuary Gate a tall ink-black shape with huge white eyes and long pinching fingers stands in a ring of dead candles. The crypt calls it Mister Hush. It has put out every light in the Hollow for a thousand years. Pip is the last light it has never put out.',
      'When it reaches, the torches gutter. When it breathes in, your heart die goes dim. Keep Pip behind you.',
    ],
  },
  'boss:2': {
    kicker: 'Ash Cloister',
    title: 'The Night Courier',
    icon: 'crown',
    text: [
      'In the Ash Cloister a knight on a skeleton horse sits waiting with a sack over the saddle. He is the Night Courier. Everything that falls, he says, belongs to the Night. Especially stars. He has come to deliver Pip to the bottom of the world.',
      'When the horse rears, step aside. When the Courier raises his sword, the whole cloister goes cold. Nobody is signing anything.',
    ],
  },
  'close:2': {
    kicker: 'Out of the dark',
    title: 'Somebody Is Looking for Pip',
    icon: 'shine',
    text: [
      'You climb the last stair out of the crypt into starlight. Pip sits in it until the glass stone glows like a lamp.',
      'High above the Ember Peaks, a swarm of glass wings sweeps the mountains. Pip goes very still. “Mum,” Pip says. Mother Hob says that is the Glass-Hive, and they think somebody has stolen their baby.',
    ],
  },
  'open:3': {
    kicker: 'Act III',
    title: 'Home Is Up',
    icon: 'flame',
    text: [
      'The Ember Peaks are hot underfoot and cold on top. At the summit, on the Ember Throne, the stars will come down close on the Long Night. Between you and it is a mountain, a frost giant, half a hive of glass bees and a basilisk.',
      'The Glass-Hive scouts look exactly like Pip. When they see Pip on {someone}’s shoulder they buzz, point, and fly off to tell somebody very big.',
    ],
  },
  'elite:3': {
    kicker: 'The Brazen Bridge',
    title: 'Hrimvald, the Rime-Giant',
    icon: 'skull',
    text: [
      'Halfway up the mountain the Brazen Bridge crosses a canyon of ice. Sitting in the middle of it is Hrimvald the Rime-Giant. He has been cold for four hundred years, and he has just seen the warmest thing in the world go past on {someone}’s shoulder.',
      '“Give Hrimvald the little stove.” He swings a frozen pine tree like a club. When he stamps, the ice cracks. When he breathes out, everything goes white.',
    ],
  },
  'boss:3': {
    kicker: 'The Ember Throne',
    title: 'The Glass-Hive Queen',
    icon: 'crown',
    text: [
      'On the Long Night you reach the top of the Ember Throne. Pip lifts the glowing glass stone, and the Glass-Hive Queen lands on the summit. She sees her child. She sees {names} standing around her child. She draws the wrong conclusion.',
      'Pip shouts “friends!” but the Queen is too angry to hear. When she calls, her stingers come. When she screams, the mountain shakes. Hold out until she listens.',
    ],
  },
  'close:3': {
    kicker: 'The Long Night',
    title: 'A Lift Home',
    icon: 'shine',
    text: [
      'The Queen stops and listens. Pip climbs onto her head and talks very fast, pointing at you. She hears your names. She lowers her great head to the ground in front of {names}.',
      'Pip gives each of you a tiny bead of warm glass. Then the Hive lifts off into the stars, and Pip is the bright speck at the front. “Home,” you say. Somewhere very far up, something says it back.',
    ],
  },
};

// Each step: where, who (catalog ids; must match actSpecs fights), the names on the quest card, and the story either side of the fight.
export const steps = [
  [
    {
      place: 'Cinder Ford', icon: 'shine', foes: ['hedgeboar'], names: ['Truffle'],
      arrive: [
        'Before you can get Pip out of the crater, a wild boar called Truffle crashes out of the reeds. Truffle has decided that Pip is the biggest truffle in the Marches. Pip says “no.”',
      ],
      win: [
        'Truffle trots off into the reeds. Pip climbs onto {someone}’s shoulder and says “home,” pointing at the far mountain.',
      ],
    },
    {
      place: 'Burnt Orchard', icon: 'flame', foes: ['bonfire', 'goblin'], names: ['Kindle', 'Smudge'],
      arrive: [
        'The star set the Burnt Orchard on fire again on its way down. The fire has got up and is walking about. It is called Kindle, a log with a flame for a head. A goblin called Smudge is following it around with a stick and a sausage.',
        'Smudge sees Pip and the glowing stone. Kindle wants to burn it.',
      ],
      win: [
        'Kindle sizzles out. Smudge runs off shouting that the star is his. It is not.',
      ],
    },
    {
      place: 'Ravens’ Rest', icon: 'skull', foes: ['tuskraider', 'wolf'], names: ['Snaggle', 'Gnasher'],
      arrive: [
        'At Ravens’ Rest a raider called Snaggle is reading a scrap of paper: WANTED: 1 STAR, FALLEN. REWARD: 1 WISH. — GORVASH. His wolf is called Gnasher. They have spotted the green thing on {someone}’s shoulder.',
      ],
      win: [
        'Snaggle limps away to report. Gnasher goes with him. The Ash-Tusks know where the star is.',
      ],
    },
    {
      place: 'Wolfwood Edge', icon: 'skull', foes: ['goblin', 'hedgeboar'], names: ['Smudge', 'Trotter'],
      arrive: [
        'Smudge is back. He has borrowed a boar called Trotter, put a saddle on it, and is riding it at you, holding a fork like a lance. Trotter did not agree to any of this.',
      ],
      win: [
        'Trotter throws Smudge into a holly bush and trots away. Smudge says Mother Hob promised him a jar of wishes for the star.',
      ],
    },
    {
      place: 'The Toll Bridge', icon: 'skull', foes: ['direbear'], names: ['Old Gravelhide'],
      arrive: [
        'Old Gravelhide stands up on the Toll Bridge and the whole bridge groans. The bear wants Pip’s warm stone for a winter bed. Rocky hide. Big paws. When the bear rears, brace yourselves.',
      ],
      win: [
        'Old Gravelhide lumbers off under the bridge. Pip leaves a warm pebble beside it. Gravelhide curls round it and falls asleep.',
      ],
    },
    {
      place: 'Smoke Hollow', icon: 'flame', foes: ['bonfire', 'raincloud'], names: ['Kindle', 'Drizzle'],
      arrive: [
        'In Smoke Hollow, Kindle the walking bonfire is back, and has met a small, furious raincloud called Drizzle. Every time Drizzle rains on Kindle there is more smoke.',
        'They both see you and both decide you are to blame.',
      ],
      win: [
        'Kindle goes out with a hiss. Drizzle rains itself out into a puddle. The smoke clears.',
      ],
    },
    {
      place: 'Ashfall Camp', icon: 'flame', foes: ['tuskraider', 'tuskraider', 'goblin'], names: ['Grunt', 'Snort', 'Ladle'],
      arrive: [
        'Outside the Ash-Tusk camp two raiders called Grunt and Snort are guarding the gate. Their goblin cook, Ladle, is stirring a pot. They have orders to bring the star to Gorvash.',
      ],
      win: [
        'Grunt and Snort run for the hill to tell the warlord. Ladle stays behind.',
      ],
    },
    {
      place: 'Smoke Hollow', icon: 'flame', foes: ['cultist', 'tuskraider'], names: ['Brother Cinder', 'Snaggle'],
      arrive: [
        'Brother Cinder, the warlord’s fire-priest, is waiting in Smoke Hollow with Snaggle. Brother Cinder’s plan is to set fire to everything around the star until it comes out.',
      ],
      win: [
        'Brother Cinder runs out of fire, then breath, then hill. Snaggle sits down.',
      ],
    },
    {
      place: 'Ashfall Camp', icon: 'shield', foes: ['tuskraider', 'wolf', 'hedgeboar'], names: ['The Tusk Guard', 'Gnasher', 'Truffle'],
      arrive: [
        'The Tusk Guard holds the last gate before Gallows Hill: one raider in shiny armour, Gnasher the wolf, and Truffle the boar, who has been promised all the truffles in the Marches if the star is handed over.',
      ],
      win: [
        'The Tusk Guard throws down his shield and runs. Gnasher gets a stroke from {someone}. Truffle goes back to the reeds. Up on Gallows Hill a big voice bellows for its wish.',
      ],
    },
    {
      place: 'Gallows Hill', icon: 'crown', foes: ['tuskwarlord'], names: ['Gorvash'],
      arrive: [
        'Gorvash sits on his throne of shields with his list of wishes and a cleaver as long as a door. He calls his raiders when he is losing. He hits hardest when he is angry. He wants the star.',
      ],
      win: [
        'Gorvash rolls off his throne of shields, and his list of wishes goes fluttering off over the hill.',
      ],
    },
  ],
  [
    {
      place: 'The Weeping Stair', icon: 'skull', foes: ['wisp', 'wisp'], names: ['Flicker', 'Flit'],
      arrive: [
        'Halfway down the Weeping Stair, two will-o’-the-wisps called Flicker and Flit bob up to meet you. They would love Pip to come and play. Down there. Over the edge.',
      ],
      win: [
        'Flicker and Flit bob off down the stairwell, looking for someone else to lead astray. Pip waves goodbye.',
      ],
    },
    {
      place: 'Candle Vault', icon: 'skull', foes: ['skeleton', 'gargoyle'], names: ['Wick the Keeper', 'Spout'],
      arrive: [
        'The Candle Vault is full of candles, every one of them cold. Wick the Keeper, a skeleton with a taper, guards them with a stone gargoyle called Spout. The rule is that no candle is ever lit. Pip is hungry.',
      ],
      win: [
        'Wick the Keeper falls apart. Spout goes back to sitting on a pillar. You light one candle and give it to Pip. The glass stone brightens a little.',
      ],
    },
    {
      place: 'The Pale Nave', icon: 'skull', foes: ['gloomstalker', 'wraith'], names: ['The Faceless Archer', 'Mournful Mo'],
      arrive: [
        'In the Pale Nave an archer with no face steps out from behind a pillar. A wraith called Mournful Mo drifts down from the roof. They work for Mister Hush, who sent them up the stairs to see what all this glowing was about.',
      ],
      win: [
        'The archer melts back into the shadows to report. Mournful Mo floats off. Somewhere far below, a candle goes out.',
      ],
    },
    {
      place: 'Grave-Silk Hall', icon: 'skull', foes: ['spider', 'nightblade'], names: ['Lacey', 'the Masked One'],
      arrive: [
        'Grave-Silk Hall is hung with webs. A crypt spider called Lacey is wrapping a firefly in a jar. Behind her, something made of smoke with a blank white mask crouches with two curved blades, waiting for Pip.',
      ],
      win: [
        'Lacey scuttles up into the dark. The masked thing comes apart into smoke. You open the jar and let the firefly go.',
      ],
    },
    {
      place: 'Ossuary Gate', icon: 'shield', foes: ['lampsnuffer'], names: ['Mister Hush'],
      arrive: [
        'Mister Hush stands in a ring of dead candles at the Ossuary Gate, reaching for Pip with long pinching fingers. It snuffs your light and dims your dice. Keep Pip behind you.',
      ],
      win: [
        'Mister Hush drifts backwards into the dark. For the first time in a thousand years one of the candles around the gate is still alight. Pip leaves it burning.',
      ],
    },
    {
      place: 'Mourner’s Row', icon: 'skull', foes: ['puffball', 'wisp'], names: ['Sporeton', 'Flit'],
      arrive: [
        'In Mourner’s Row a giant red mushroom called Sporeton sneezes a green cloud that puts out every candle in the row. Flit the wisp is back, and thinks this is funny.',
      ],
      win: [
        'Sporeton waddles off into a damp corner, still sneezing. Flit floats away. Pip has caught a small sneeze. It also blows out your torch.',
      ],
    },
    {
      place: 'The Drowned Crypt', icon: 'skull', foes: ['dirgesinger', 'skeleton', 'skeleton'], names: ['Cantor Grey', 'Bones', 'Other Bones'],
      arrive: [
        'Across the Drowned Crypt a gaunt minstrel called Cantor Grey is leading a choir of two skeletons, Bones and Other Bones, in a song about the dark. The song is meant to put you to sleep. Pip has already nodded off on {someone}’s shoulder.',
      ],
      win: [
        'Cantor Grey loses his place and the choir falls apart into the water. Pip wakes up and blinks all three eyes.',
      ],
    },
    {
      place: 'Mourner’s Row', icon: 'skull', foes: ['nightblade', 'gloomstalker'], names: ['the Masked One', 'The Faceless Archer'],
      arrive: [
        'The Masked One and the Faceless Archer have doubled back to cut you off in Mourner’s Row. They have a delivery slip from the Night Courier: PICK UP 1 STAR. DO NOT BEND.',
      ],
      win: [
        'The two of them fade into the walls and leave the slip behind. On the back: IF YOU MEET MOTHER HOB, DO NOT SELL HER ANYTHING.',
      ],
    },
    {
      place: 'The Drowned Crypt', icon: 'skull', foes: ['wraith', 'gargoyle', 'wisp'], names: ['Mournful Mo', 'Spout', 'Flicker'],
      arrive: [
        'The last stretch of the Drowned Crypt is guarded by Mournful Mo, Spout and Flicker, together. They have talked it over. Mournful Mo has a plan. Spout has climbed off his pillar.',
      ],
      win: [
        'Mo, Spout and Flicker sit down on the far bank. Up ahead, under the last arch, a horse made of bones stamps once on the stone.',
      ],
    },
    {
      place: 'Ash Cloister', icon: 'crown', foes: ['barrowrider'], names: ['The Night Courier'],
      arrive: [
        'The Night Courier sits on his skeleton horse under the last arch, with a sack for Pip and a delivery slip with Pip’s name spelled wrong. The horse rears and charges. The sword makes the cloister cold.',
      ],
      win: [
        'The Night Courier’s sack falls empty on the stones, and the road to the Peaks is open.',
      ],
    },
  ],
  [
    {
      place: 'Kindling Steps', icon: 'flame', foes: ['cinderling', 'frostwhelp'], names: ['Toastie', 'Brr'],
      arrive: [
        'On the Kindling Steps two baby dragons are fighting over a gold coin: Toastie, small and red and puffing fire, and Brr, small and blue and puffing frost. Then they both see Pip’s stone, which is glowing, and is much better than a coin.',
      ],
      win: [
        'Toastie and Brr fly off together, sharing the coin. Pip gives each of them a tiny wave.',
      ],
    },
    {
      place: 'The Glass Fields', icon: 'shine', foes: ['visitor', 'hivedrone'], names: ['Scout Nib', 'a Glass Stinger'],
      arrive: [
        'In the Glass Fields a Hive Scout called Nib pops out of a cracked glass rock. It looks exactly like Pip. It is with a glass stinger, and they have been searching for Pip for three months. They see Pip on {someone}’s shoulder and draw the wrong conclusion.',
        'Pip shouts “friends!” Nib does not listen.',
      ],
      win: [
        'Nib and the stinger zoom off up the mountain to tell somebody. Pip sits down in the glass.',
      ],
    },
    {
      place: 'Hoardfall Mine', icon: 'skull', foes: ['basilisk', 'bonfire'], names: ['Glarefang', 'Kindle the Second'],
      arrive: [
        'Deep in Hoardfall Mine lives Glarefang, a red basilisk with a glowing eye who turns things to stone when it stares. A walking bonfire called Kindle the Second lights the tunnel for it.',
      ],
      win: [
        'Glarefang slinks into a crack in the rock. Kindle the Second gutters out. The stone mouse beside it turns back into a mouse and runs.',
      ],
    },
    {
      place: 'Wyrmwatch', icon: 'coin', foes: ['chainbinder', 'tuskraider'], names: ['Debt-Collector Clink', 'Snort'],
      arrive: [
        'At Wyrmwatch, Mother Hob has hired a jailer called Clink, draped in gold chains, and Snort the raider. “Hob just likes stars,” she calls from behind a rock. “Clink, the green one in the hood.”',
      ],
      win: [
        'Clink runs out of padlocks. Snort leaves. Mother Hob says she is not giving up.',
      ],
    },
    {
      place: 'The Brazen Bridge', icon: 'skull', foes: ['frostgiant'], names: ['Hrimvald'],
      arrive: [
        'Hrimvald the Rime-Giant blocks the Brazen Bridge with his feet in a bucket of ice, wanting Pip for a warm little stove. He swings a frozen pine. His breath freezes the bridge.',
      ],
      win: [
        'Hrimvald sits down on the bridge. Pip walks over to the giant’s frozen foot and hugs one toe. When Pip lets go, the toe is warm. You cross the bridge.',
      ],
    },
    {
      place: 'Kettle Tarn', icon: 'shine', foes: ['moonjelly', 'hivedrone'], names: ['Peepers', 'a Glass Stinger'],
      arrive: [
        'Above Kettle Tarn floats Peepers, a pale-blue moon-jelly with one enormous eye. Peepers wants to look at Pip closer. A glass stinger has come along to make sure Peepers does not take Pip home.',
      ],
      win: [
        'Peepers drifts away over the tarn. The stinger buzzes off to report. Pip blinks all three eyes at the moon-jelly.',
      ],
    },
    {
      place: 'Oathbreak Keep', icon: 'shield', foes: ['visitor', 'visitor', 'hivedrone'], names: ['Scout Nib', 'Scout Nob', 'a Glass Stinger'],
      arrive: [
        'The Hive’s search party has found you in the ruins of Oathbreak Keep: Scout Nib, Scout Nob, and a glass stinger. They have been told to bring the little one home and not to ask questions.',
      ],
      win: [
        'Nib and Nob fly off together. Pip calls after them, “Mum!” For a moment they both look back. Then they go on up the mountain.',
      ],
    },
    {
      place: 'Hoardfall Mine', icon: 'flame', foes: ['hivedrone', 'hivedrone', 'cinderling'], names: ['the Amber Stinger', 'the Violet Stinger', 'Toastie'],
      arrive: [
        'Two of the Queen’s own stingers, the Amber Stinger and the Violet Stinger, have been waiting at the top of the mine shaft. Toastie the baby dragon has come along to watch.',
      ],
      win: [
        'The stingers break off and dive away toward the summit. Toastie comes back down and sits on {someone}’s boot.',
      ],
    },
    {
      place: 'Ember Throne slopes', icon: 'shield', foes: ['hivedrone', 'visitor', 'frostwhelp'], names: ['The Royal Guard', 'Scout Nob', 'Brr'],
      arrive: [
        'The last slope below the summit is held by the Queen’s Royal Guard, with Scout Nob beside it and Brr the frost-whelp on a ledge above. It is nearly the Long Night. The stars are already very close.',
      ],
      win: [
        'The Royal Guard lowers its sting and lets you pass. Scout Nob is not so sure. Above you, on the Ember Throne, something enormous and shining lands.',
      ],
    },
    {
      place: 'The Ember Throne', icon: 'crown', foes: ['hivequeen'], names: ['The Glass-Hive Queen'],
      arrive: [
        'The Glass-Hive Queen towers over the summit with her scythes raised, sure you have stolen her child. She calls her stingers. She shakes the mountain. Hold out until she listens.',
      ],
      win: [
        'The Glass-Hive Queen lowers her scythes at last, and the summit goes very quiet.',
      ],
    },
  ],
];

// A writer's road moment for each quiet step (roads.js reads act.moments[step - 1]; steps 3, 5, 8 and 10 have bigger encounters, and
// Act I step 1 has the opening). {who} is the hero who rolled best, {place} is where the road leads, {company} is everyone.
const moments = [
  [
    null,
    { title: 'Pip Learns to Ride', stat: 'wisdom', prize: 'magic', go: 'Teach Pip to hold on',
      tell: 'Pip keeps falling off shoulders. On the road to {place}, somebody has to teach a three-eyed blob how to hold on.',
      won: '{who} shows Pip how to grab a collar. Pip grabs it and does not let go.', lost: '{who} explains it slowly. Pip lets go to clap, and falls off again.' },
    null,
    { title: 'Smudge’s Wanted Poster', stat: 'speed', prize: 'gold', go: 'Rip the posters down',
      tell: 'Every tree on the road to {place} has a poster on it: WANTED, 1 STAR. Somebody has drawn Pip with too many teeth. Tear them all down before anyone reads them.',
      won: '{who} tears down twenty posters in a minute flat, and finds a reward purse taped behind the last one.', lost: '{who} tears down one poster. Behind it is another poster.' },
    null,
    { title: 'The Bear’s Pebble', stat: 'strength', prize: 'hp', go: 'Carry the big pebble',
      tell: 'Pip wants to bring Old Gravelhide a second warm pebble for the long winter, and Pip has picked the biggest one on the riverbank. Somebody will have to carry it on the way to {place}.',
      won: '{who} hoists the pebble. You all feel warmer for it.', lost: '{who} lifts it as far as the knees and has to sit down.' },
    { title: 'Soup at Ashfall', stat: 'wisdom', prize: 'atk', go: 'Fix Ladle’s soup',
      tell: 'Ladle the goblin cook has followed you up the road to {place}, still worried about the soup. It still tastes of boots. Can anyone work out why?',
      won: '{who} fishes a boot out of the bottom of the pot. The soup is strengthening now.', lost: '{who} adds salt. The soup now tastes of salty boots.' },
    null,
    { title: 'Up the Hill', stat: 'speed', prize: 'block', go: 'Race to the top',
      tell: 'Gallows Hill is steep and the Ash-Tusks are at the top. On the way to {place}, the quickest climber gets the high ground, and the best cover.',
      won: '{who} reaches the top first and finds a fallen shield in good shape.', lost: '{who} slips on the last bit of slope and slides back to the bottom.' },
    null,
  ],
  [
    { title: 'The Last Candle', stat: 'wisdom', prize: 'magic', go: 'Find a candle',
      tell: 'Pip is fading. On the road to {place} there must be a candle somewhere in all this dark. Look carefully.',
      won: '{who} spots a candle stub in a crack in the wall. Pip eats it and glows, and the light tingles through {who}’s fingers too.', lost: '{who} finds a candle. It is a bone.' },
    { title: 'Counting Stairs', stat: 'speed', prize: 'block', go: 'Run down the stairs',
      tell: 'The stairs to {place} go down and down. A sign at the top says nine hundred and ninety-nine steps.',
      won: '{who} runs every step without tripping once and arrives with plenty of breath to spare.', lost: '{who} counts the steps aloud and loses count at four hundred.' },
    null,
    { title: 'The Web Door', stat: 'strength', prize: 'atk', go: 'Tear through the web',
      tell: 'A thick silver web blocks the passage to {place}. It is very strong and very sticky. Pip has already touched it and is stuck to it by one foot.',
      won: '{who} rips the web open with one heave, and peels Pip off it.', lost: '{who} pulls. {who} is also now stuck to the web.' },
    null,
    { title: 'Mister Hush’s Candles', stat: 'wisdom', prize: 'hp', go: 'Light the old candles',
      tell: 'Around the Ossuary Gate, the old candles still stand where Mister Hush left them. If you can work out how they were lit, the road to {place} will be a little less dark.',
      won: '{who} finds the old tinderbox in a niche. One by one the candles take, and the warm light feels like a good meal.', lost: '{who} strikes a spark. It lands on {who}’s sleeve instead.' },
    { title: 'Sneeze Practice', stat: 'speed', prize: 'magic', go: 'Catch Pip’s sneeze',
      tell: 'Pip has caught Sporeton’s sneeze, and every sneeze blows out a torch. On the road to {place}, someone has to be quick with a hanky.',
      won: '{who} catches the sneeze in a hanky. Something sparkly was in it.', lost: '{who} is too slow. Every torch goes out.' },
    null,
    { title: 'Rowing the Dark', stat: 'strength', prize: 'block', go: 'Row the boat',
      tell: 'The only way across the Drowned Crypt to {place} is an old flat boat with one oar. The water is black and cold. Row hard, and row straight.',
      won: '{who} rows across in great strong strokes, and the far bank is closer than you feared.', lost: '{who} rows hard. In a circle.' },
    null,
  ],
  [
    { title: 'First Starlight', stat: 'wisdom', prize: 'magic', go: 'Find Pip’s star',
      tell: 'Out of the crypt at last, under the open sky on the road to {place}. Pip wants to know which star is home. Somebody has to read the sky.',
      won: '{who} finds it: a faint green star low in the east. Pip stares at it all night, glowing, and some of that glow rubs off.', lost: '{who} points at a star. It is a moth.' },
    { title: 'Glass Is Slippery', stat: 'speed', prize: 'atk', go: 'Skate the glass',
      tell: 'The Glass Fields on the road to {place} are as slippery as a frozen pond. You could walk round. It would take a day. Or you could skate.',
      won: '{who} skates across in one long glide and arrives full of fire.', lost: '{who} skates sideways and lands in a heap.' },
    null,
    { title: 'Hob’s Bargain', stat: 'wisdom', prize: 'gold', go: 'Haggle with Hob',
      tell: 'Mother Hob’s cart is parked across the road to {place}. She is selling “genuine star dust” in jars. Pip tastes some. It is sugar. Can anyone out-haggle Mother Hob?',
      won: '{who} haggles so well that Mother Hob ends up paying you to take the jar away.', lost: '{who} buys three jars of sugar for the price of a horse.' },
    null,
    { title: 'Warm Toes', stat: 'strength', prize: 'hp', go: 'Light a fire for Hrimvald',
      tell: 'Before you go on to {place}, Pip wants to leave Hrimvald a fire, so the giant’s toes stay warm. The wood is wet. It needs a lot of chopping.',
      won: '{who} chops a mountain of wood and builds a fire. You all feel warm for hours.', lost: '{who} chops one log and gets the axe stuck in it.' },
    { title: 'Talk to the Twins', stat: 'wisdom', prize: 'block', go: 'Try the wind-chime language',
      tell: 'Pip has been teaching you some words of wind-chime on the road to {place}. If the Hive Scouts come again, maybe one of you can tell them the truth.',
      won: '{who} manages a whole sentence: “Pip is safe.” Pip glows like a lantern.', lost: '{who} tries. It seems to mean something else.' },
    null,
    { title: 'The Last Climb', stat: 'speed', prize: 'magic', go: 'Climb for the summit',
      tell: 'The Long Night is tonight. The summit is up there, the stars are coming down, and the road to {place} is the steepest yet. Climb fast.',
      won: '{who} reaches the ledge below the summit first and pulls everyone else up. The stars are close.', lost: '{who} gets there last, just in time. Pip says “nearly.”' },
    null,
  ],
];

// The acts: fights by step (catalog ids), the names on the quest cards, the road through the land, and per-step health tuning
// (fightHp, measured with SKILL=normal PACK=starfall sh tools/skill-all.sh against the Dawn Lantern).
export const actSpecs = [
  {
    id: 1, name: 'The Star at Cinder Ford', land: 1,
    tag: 'A star fell in the Marches with a little green passenger inside. Everyone wants the star. Pip wants to go home.',
    places: ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'Smoke Hollow', 'The Toll Bridge', 'Ashfall Camp', 'Gallows Hill'],
    route: ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'The Toll Bridge', 'Smoke Hollow', 'Ashfall Camp', 'Smoke Hollow', 'Ashfall Camp', 'Gallows Hill'],
    fights: [
      ['hedgeboar'],
      ['bonfire', 'goblin'],
      ['tuskraider', 'wolf'],
      ['goblin', 'hedgeboar'],
      ['direbear'],
      ['bonfire', 'raincloud'],
      ['tuskraider', 'tuskraider', 'goblin'],
      ['cultist', 'tuskraider'],
      ['tuskraider', 'wolf', 'hedgeboar'],
      ['tuskwarlord'],
    ],
    names: [
      ['Truffle'], ['Kindle', 'Smudge'], ['Snaggle', 'Gnasher'], ['Smudge', 'Trotter'], ['Old Gravelhide'],
      ['Kindle', 'Drizzle'], ['Grunt', 'Snort', 'Ladle'], ['Brother Cinder', 'Snaggle'], ['The Tusk Guard', 'Gnasher', 'Truffle'], ['Gorvash'],
    ],
    fightHp: { 1: 0.75, 7: 0.7, 9: 0.55, 10: 1.15 },
    moments: moments[0],
    help: [],
  },
  {
    id: 2, name: 'Nothing Down Here Glows', land: 2,
    tag: 'The only road to the mountains runs through the crypt, Pip is running out of light, and something down there eats it.',
    places: ['The Weeping Stair', 'Ossuary Gate', 'Candle Vault', 'The Pale Nave', 'Grave-Silk Hall', 'Mourner’s Row', 'The Drowned Crypt', 'Ash Cloister'],
    route: ['The Weeping Stair', 'Candle Vault', 'The Pale Nave', 'Grave-Silk Hall', 'Ossuary Gate', 'Mourner’s Row', 'The Drowned Crypt', 'Mourner’s Row', 'The Drowned Crypt', 'Ash Cloister'],
    fights: [
      ['wisp', 'wisp'],
      ['skeleton', 'gargoyle'],
      ['gloomstalker', 'wraith'],
      ['spider', 'nightblade'],
      ['lampsnuffer'],
      ['puffball', 'wisp'],
      ['dirgesinger', 'skeleton', 'skeleton'],
      ['nightblade', 'gloomstalker'],
      ['wraith', 'gargoyle', 'wisp'],
      ['barrowrider'],
    ],
    names: [
      ['Flicker', 'Flit'], ['Wick the Keeper', 'Spout'], ['The Faceless Archer', 'Mournful Mo'], ['Lacey', 'the Masked One'], ['Mister Hush'],
      ['Sporeton', 'Flit'], ['Cantor Grey', 'Bones', 'Other Bones'], ['the Masked One', 'The Faceless Archer'], ['Mournful Mo', 'Spout', 'Flicker'], ['The Night Courier'],
    ],
    fightHp: { 7: 0.55, 9: 0.68, 10: 1.25 },
    moments: moments[1],
    help: [],
  },
  {
    id: 3, name: 'Home Is Up', land: 3,
    tag: 'Up the Ember Peaks before the Long Night, with a frost giant, a basilisk and a whole glass hive in the way.',
    places: ['Kindling Steps', 'The Glass Fields', 'Hoardfall Mine', 'Wyrmwatch', 'The Brazen Bridge', 'Kettle Tarn', 'Oathbreak Keep', 'Ember Throne slopes', 'The Ember Throne'],
    route: ['Kindling Steps', 'The Glass Fields', 'Hoardfall Mine', 'Wyrmwatch', 'The Brazen Bridge', 'Kettle Tarn', 'Oathbreak Keep', 'Hoardfall Mine', 'Ember Throne slopes', 'The Ember Throne'],
    fights: [
      ['cinderling', 'frostwhelp'],
      ['visitor', 'hivedrone'],
      ['basilisk', 'bonfire'],
      ['chainbinder', 'tuskraider'],
      ['frostgiant'],
      ['moonjelly', 'hivedrone'],
      ['visitor', 'visitor', 'hivedrone'],
      ['hivedrone', 'hivedrone', 'cinderling'],
      ['hivedrone', 'visitor', 'frostwhelp'],
      ['hivequeen'],
    ],
    names: [
      ['Toastie', 'Brr'], ['Scout Nib', 'a Glass Stinger'], ['Glarefang', 'Kindle the Second'], ['Debt-Collector Clink', 'Snort'], ['Hrimvald'],
      ['Peepers', 'a Glass Stinger'], ['Scout Nib', 'Scout Nob', 'a Glass Stinger'], ['the Amber Stinger', 'the Violet Stinger', 'Toastie'], ['The Royal Guard', 'Scout Nob', 'Brr'], ['The Glass-Hive Queen'],
    ],
    fightHp: { 7: 0.45, 8: 0.4, 9: 0.5, 10: 0.45 },
    gates: {
      5: { kind: 'elite', place: 'The Brazen Bridge', enemies: ['frostgiant'] },
      10: { kind: 'boss', place: 'The Ember Throne', enemies: ['hivequeen'] },
    },
    moments: moments[2],
    help: [],
  },
];
