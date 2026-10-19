// Writer copy for the starfall pack, "Pip Needs a Lift" (Claude, Oct 2026): a 1–6 hero campaign written to show what a pack can do.
// Every step has its own arrival and win, every quiet step has its own road moment (act.moments[step - 1]), and the secret
// objectives have their own voice (Mother Hob, the wish-broker). The cast is drawn from the whole miniature catalog (docs/MINIS.md),
// mostly the minis no other story has used yet. Hero text uses {names} / {someone}, never "he" or "she".

// The voice that hands out the envelopes before every fight (secrets.js reads pack.voice).
export const voice = {
  name: 'Mother Hob',
  scenes: [
    'A creaking cart rolls out of nowhere, piled with jars that say WISHES (USED). Mother Hob, a goblin grandmother in eleven shawls, peers at each of you over her spectacles. "Little jobs," she says. "Little jobs, little coins."',
    'Mother Hob is sitting on a rock you are sure was empty a moment ago, knitting something with too many sleeves. "Before you start," she says, not looking up, "Hob has an envelope for each of you. Read it. Don’t show the others. Hob can always tell."',
    'There is a smell of peppermint and old pennies, and Mother Hob is suddenly among you, tucking envelopes into pockets. "Hob only wants the star," she says. "But Hob is patient. Hob pays for small favours in the meantime."',
    'A jar rolls to a stop at your feet. Inside is a folded envelope, and a note: ONE EACH. NO PEEKING. — HOB. From somewhere behind a bush comes the sound of a goblin grandmother trying very hard not to giggle.',
  ],
};

export const beats = {
  'open:1': {
    kicker: 'Prologue',
    title: 'Something Fell at Cinder Ford',
    icon: 'shine',
    text: [
      'On the first night of autumn a star falls out of the sky over the Ashen Marches. It does not burn up, the way stars are supposed to. It wobbles, says something that sounds very like “uh-oh,” and lands in the mud at Cinder Ford with a noise like a dropped teapot.',
      'You get there first. In the smoking crater sits a small green creature with three eyes and a cracked glass stone in its lap. It looks at {names}. It looks at the sky. It says “Pip,” which seems to be its name, and then it points one stubby arm at the highest peak on the horizon and says “home,” very sadly.',
      'An old ferryman tells you the stars come closest to the world on the Long Night, three moons from now, at the top of the Ember Throne. That is a long way. And by morning every goblin, tusker and grandmother in the Marches has heard that a fallen star grants a wish.',
    ],
  },
  'elite:1': {
    kicker: 'The Toll Bridge',
    title: 'Old Gravelhide',
    icon: 'skull',
    text: [
      'The only bridge out of the Marches belongs to Old Gravelhide, a dire bear the size of a hay cart with rocks growing on one shoulder. Winter is coming, and Gravelhide has been looking for something warm to sleep on until spring.',
      'Pip’s glass stone is very warm. Gravelhide has noticed.',
      'When the bear rears up, the bridge shakes. When the bear sits down, the bridge shakes more. Pip hides inside {someone}’s hood and says “nope” over and over, which is a new word, and a good one.',
    ],
  },
  'boss:1': {
    kicker: 'Gallows Hill',
    title: 'Gorvash, Warlord of the Ash-Tusks',
    icon: 'crown',
    text: [
      'On top of Gallows Hill, Gorvash, Warlord of the Ash-Tusks, has built a throne out of shields and a sign that says WISHES COLLECTED HERE. He has heard that a fallen star grants one wish. He has a list. It is very long. The first three are “EMPEROR OF EVERYTHING,” “BIGGER TUSKS,” and “TALLER,” underlined twice.',
      'His raiders have been chasing you since Cinder Ford. Now they have you in front of the boss, and the boss has a cleaver, a banner and no sense of humour at all.',
      'Pip looks at Gorvash for a long moment with all three eyes. Then it says “no,” firmly, which is how you know Pip is going to be all right.',
    ],
  },
  'close:1': {
    kicker: 'Over the hill',
    title: 'The Stone Is Dimming',
    icon: 'shine',
    text: [
      'Gorvash rolls down the back of Gallows Hill shouting that he did not want a stupid wish anyway. His list blows away in the wind. Somewhere a raider picks it up, reads “TALLER,” and quietly agrees.',
      'But Pip is not well. The glass stone has a new crack, and its light is fading, and Pip’s three eyes are fading with it. Pip lives on light, you realise. Starlight, mostly. And the only road to the Ember Peaks that the Ash-Tusks have not burned goes down, under the Marches, through the Hollow Crypt, where there has been no light for a thousand years.',
      'At the top of the crypt stair sits a cart full of jars, and a goblin grandmother in eleven shawls. “Hob will buy that star off you,” says Mother Hob kindly. “Hob will give you a very good price. No?” She smiles. “Hob will ask again.”',
    ],
  },
  'open:2': {
    kicker: 'Act II',
    title: 'Nothing Down Here Glows',
    icon: 'skull',
    text: [
      'The Hollow Crypt is dark in a way that has weight. Your torches seem smaller down here, as if the dark were leaning on them. Pip sits on {someone}’s shoulder and glows as hard as a very small, very tired creature can, and it is still the brightest thing for a mile in any direction.',
      'That is a problem. In the crypt, things that glow get noticed. Far below, something tall and thin has smelled a light it has never seen before, and it has started to climb.',
      'Pip finds a stub of candle on the first step and eats it, wick and all, and feels a little better. You will need more candles. You will need to go faster.',
    ],
  },
  'elite:2': {
    kicker: 'Ossuary Gate',
    title: 'Mister Hush',
    icon: 'shield',
    text: [
      'At the Ossuary Gate it is waiting for you: a tall ink-black shape with huge white eyes and long pinching fingers, standing in a ring of dead candles. The crypt calls it Mister Hush. It has put out every light in the Hollow for a thousand years, one by one, with a little pinch and a little sigh. Pip is the last light it has never put out.',
      'It does not speak. It just holds out its fingers, very politely, as if Pip were a candle at the end of a long evening.',
      'When it reaches, the torches gutter. When it breathes in, your heart die goes dim. Keep Pip behind you. Keep swinging.',
    ],
  },
  'boss:2': {
    kicker: 'Ash Cloister',
    title: 'The Night Courier',
    icon: 'crown',
    text: [
      'In the Ash Cloister, under the last arch before the road to the Peaks, a knight on a skeleton horse sits waiting with a sack over the saddle. He is the Night Courier. Everything that falls, he says, belongs to the Night: dropped coins, lost keys, leaves, rain, and stars. Especially stars. He has come to deliver Pip to the bottom of the world.',
      'He has a delivery slip. It has Pip’s name on it, spelled wrong. He would like a signature.',
      'When the horse rears, step aside. When the Courier raises his sword, the whole cloister goes cold. Nobody is signing anything.',
    ],
  },
  'close:2': {
    kicker: 'Out of the dark',
    title: 'Somebody Is Looking for Pip',
    icon: 'shine',
    text: [
      'The Night Courier’s horse throws a shoe, and then the rest of itself, and the Courier rides off into the dark on foot with his sack, muttering about undelivered parcels. You climb the last stair out of the crypt into starlight, and Pip sits in it with all three eyes shut, drinking it in, until the glass stone glows like a lamp.',
      'And then, high above the Ember Peaks, something glitters. A swarm of glass wings, purple and amber, sweeping back and forth across the mountains in long lines like people searching a field for a lost ring. Pip sees them and goes very still. “Mum,” Pip says.',
      'Behind you, Mother Hob closes her cart with a snap. “Oh dear,” she says, and for once she does not sound like she is selling anything. “Hob knows that swarm. That is the Glass-Hive. And they think somebody has stolen their baby.”',
    ],
  },
  'open:3': {
    kicker: 'Act III',
    title: 'Home Is Up',
    icon: 'flame',
    text: [
      'The Ember Peaks are hot underfoot and cold on top, and full of things that glitter. At the very summit, on the Ember Throne, the stars will come down close on the Long Night. That is a week away. Between you and it is a mountain, a frost giant, half a hive of glass bees and a basilisk who has never once said sorry.',
      'The Glass-Hive is everywhere now. Their scouts look exactly like Pip, only grumpier, and when they see Pip on {someone}’s shoulder they buzz, and point, and fly off fast to tell somebody very big.',
      'Pip has started saying “nearly” every morning. You do not know who taught it that. It is right.',
    ],
  },
  'elite:3': {
    kicker: 'The Brazen Bridge',
    title: 'Hrimvald, the Rime-Giant',
    icon: 'skull',
    text: [
      'Halfway up the mountain the Brazen Bridge crosses a canyon of ice, and sitting in the middle of it, with his feet in a bucket, is Hrimvald the Rime-Giant. His beard is frozen. His toes are frozen. He has been cold for four hundred years, and he has just seen the warmest thing in the world go past on {someone}’s shoulder.',
      '“Little stove,” he rumbles, with real longing. “Give Hrimvald the little stove.”',
      'He swings a frozen pine tree like a club. When he stamps, the ice cracks. When he breathes out, everything goes white. He does not hate you. He would just like warm feet. It is hard not to sympathise. It is easy not to hand over Pip.',
    ],
  },
  'boss:3': {
    kicker: 'The Ember Throne',
    title: 'The Glass-Hive Queen',
    icon: 'crown',
    text: [
      'On the Long Night you reach the top of the Ember Throne, and the stars come down so close you could touch them. Pip stands on the highest rock and lifts the glowing glass stone over its head, and far above, something answers: a long purple shimmer, coming down.',
      'It is not a ship. It is the Glass-Hive Queen, vast and shining, with scythe arms and wings like stained-glass windows, and she lands on the summit with a sound like every bell in the world. She sees her child. She sees {names}, standing around her child. She has been searching the mountains for three months. She draws exactly the wrong conclusion.',
      'Pip shouts “no!” and “friends!” and “stop!” but the Queen is too angry to hear. You will have to hold out until she does. When she calls, her stingers come. When she screams, the mountain shakes. Do not let her take Pip back thinking you are the villains.',
    ],
  },
  'close:3': {
    kicker: 'The Long Night',
    title: 'A Lift Home',
    icon: 'shine',
    text: [
      'At last the Queen stops, and folds her scythes, and listens. Pip climbs up her glass leg onto her head and talks very fast for a long time, in a language that sounds like wind chimes, with a lot of pointing at you. You catch your own names in it, said carefully, the way you say words you have practised.',
      'The Queen lowers her great head to the ground in front of {names}, which, you later learn, is the Glass-Hive’s highest honour, and is never given to anybody, and is not given to Mother Hob, who has been hiding behind a rock all evening with an empty jar.',
      'Before they go, Pip hops down one last time and gives each of you a tiny bead of warm glass. It glows a little on cold nights. Then the Hive lifts off into the stars, one long shimmer, and Pip is the bright speck at the very front, and you watch until you cannot tell which light is Pip any more. “Home,” you say, to nobody in particular. Somewhere very far up, something says it back.',
    ],
  },
};

// Each step: where, who (catalog ids; must match actSpecs fights), the names on the quest card, and the story either side of the fight.
export const steps = [
  [
    {
      place: 'Cinder Ford', icon: 'shine', foes: ['hedgeboar'], names: ['Truffle'],
      arrive: [
        'Before you can get Pip out of the crater, a wild boar called Truffle crashes out of the reeds. Truffle has a nose for things that are buried and valuable, and has decided that Pip is the biggest truffle in the history of the Marches. Pip says “no,” for the first time. It will not be the last.',
      ],
      win: [
        'Truffle trots off into the reeds to dig up something less argumentative. Pip climbs up onto {someone}’s shoulder, holds on to an ear, and says “home” again, pointing at the far mountain. It seems you are going that way.',
      ],
    },
    {
      place: 'Burnt Orchard', icon: 'flame', foes: ['bonfire', 'goblin'], names: ['Kindle', 'Smudge'],
      arrive: [
        'The star set the Burnt Orchard on fire again on its way down, and the fire has got up and is walking about. It is called Kindle, a log with a flame for a head, and it is having a lovely time. A goblin called Smudge is following it around with a stick and a sausage, toasting things.',
        'Smudge sees Pip, and the glowing stone, and has a very simple goblin thought: shiny. Kindle has an even simpler one: burn.',
      ],
      win: [
        'Kindle sizzles out into a pile of grumpy embers, and Smudge runs off with half a sausage, shouting that the star is HIS and he SAW it FIRST. He did not. Pip eats a small ember to see what it is like, makes a face, and does not do it again.',
      ],
    },
    {
      place: 'Ravens’ Rest', icon: 'skull', foes: ['tuskraider', 'wolf'], names: ['Snaggle', 'Gnasher'],
      arrive: [
        'At Ravens’ Rest a big grey-green raider in scorched armour is reading a scrap of paper with his lips moving. It says WANTED: 1 STAR, FALLEN. REWARD: 1 WISH (MINUS EXPENSES). — GORVASH. The raider is called Snaggle. His wolf is called Gnasher. They have spotted the green thing on {someone}’s shoulder.',
      ],
      win: [
        'Snaggle limps away to report, and Gnasher goes with him, looking back as if he would quite like a stroke. So now the Ash-Tusks know where the star is. Pip learns the word “uh-oh” properly, and uses it twice before supper.',
      ],
    },
    {
      place: 'Wolfwood Edge', icon: 'skull', foes: ['goblin', 'hedgeboar'], names: ['Smudge', 'Trotter'],
      arrive: [
        'Smudge is back. Smudge has borrowed a boar called Trotter, put a saddle on it, and is riding it at you very fast, holding a fork like a lance. Trotter did not agree to any of this, and is going where Trotter likes. Mostly in circles.',
      ],
      win: [
        'Trotter throws Smudge into a holly bush and trots away free. Smudge, upside down in the holly, explains that Mother Hob promised him a whole jar of wishes for the star. You have never heard of Mother Hob. You will.',
      ],
    },
    {
      place: 'The Toll Bridge', icon: 'skull', foes: ['direbear'], names: ['Old Gravelhide'],
      arrive: [
        'Old Gravelhide stands up on the Toll Bridge and the whole bridge groans. The bear wants Pip’s warm stone for a winter bed, and is not going to ask twice. Rocky hide. Big paws. When the bear rears, brace yourselves.',
      ],
      win: [
        'Old Gravelhide lumbers off under the bridge and lies down in the cool mud, grumbling. Pip, feeling sorry for the bear, leaves a warm pebble beside it. Gravelhide sniffs it, curls round it, and is asleep before you reach the far bank.',
      ],
    },
    {
      place: 'Smoke Hollow', icon: 'flame', foes: ['bonfire', 'raincloud'], names: ['Kindle', 'Drizzle'],
      arrive: [
        'In Smoke Hollow, Kindle the walking bonfire is back, and has met a small, furious raincloud called Drizzle. They are arguing about whose fault the smoke is. Every time Drizzle rains on Kindle there is more smoke. Every time there is more smoke, Drizzle gets angrier and rains harder.',
        'They both see you at once, and both decide you are the one to blame.',
      ],
      win: [
        'Kindle goes out with a hiss, and Drizzle rains itself out into a puddle, and the smoke finally clears. Pip jumps in the puddle. Pip jumps in it again. You are going to be here for a while.',
      ],
    },
    {
      place: 'Ashfall Camp', icon: 'flame', foes: ['tuskraider', 'tuskraider', 'goblin'], names: ['Grunt', 'Snort', 'Ladle'],
      arrive: [
        'Outside the Ash-Tusk camp two raiders called Grunt and Snort are guarding the gate, and their goblin cook, Ladle, is stirring a pot that smells of boots. They have orders to bring the star to Gorvash. They also have orders to have the soup ready by six. They are not sure which order matters more.',
      ],
      win: [
        'Grunt and Snort run for the hill to tell the warlord. Ladle stays behind, sighs, and offers you some soup. It does taste of boots. Pip has two bowls.',
      ],
    },
    {
      place: 'Smoke Hollow', icon: 'flame', foes: ['cultist', 'tuskraider'], names: ['Brother Cinder', 'Snaggle'],
      arrive: [
        'Brother Cinder, the warlord’s fire-priest, is waiting in Smoke Hollow with Snaggle, who has a bandage now and a grudge to match. Brother Cinder has a plan to get the star: set fire to everything around it until it comes out. It is not a good plan. It is the only plan Brother Cinder ever has.',
      ],
      win: [
        'Brother Cinder runs out of fire, then breath, then hill. Snaggle sits down and says he is thinking of leaving the Ash-Tusks and opening a small bakery. You wish him well. Pip says “bread,” which is new.',
      ],
    },
    {
      place: 'Ashfall Camp', icon: 'shield', foes: ['tuskraider', 'wolf', 'hedgeboar'], names: ['The Tusk Guard', 'Gnasher', 'Truffle'],
      arrive: [
        'The Tusk Guard holds the last gate before Gallows Hill: one raider in very shiny armour, Gnasher the wolf, and, somehow, Truffle the boar, who has been promised all the truffles in the Marches if the star is handed over. Truffle does not know what a promise is, but likes the sound of the truffles.',
      ],
      win: [
        'The Tusk Guard throws down his shiny shield and runs. Gnasher finally gets his stroke, from {someone}, and Truffle goes back to the reeds still hoping. Up on Gallows Hill a big voice bellows for its wish. It has been waiting long enough.',
      ],
    },
    {
      place: 'Gallows Hill', icon: 'crown', foes: ['tuskwarlord'], names: ['Gorvash'],
      arrive: [
        'Gorvash sits on his throne of shields with his list of wishes and a cleaver as long as a door. He calls his raiders when he is losing. He hits hardest when he is angry. He wants the star, and the wish, and to be taller.',
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
        'Halfway down the Weeping Stair, two little lights come bobbing up to meet you, grinning. They are will-o’-the-wisps called Flicker and Flit, and they are delighted to see another light at last. They would love Pip to come and play. Down there. Over the edge. Just a little further.',
      ],
      win: [
        'Flicker and Flit bob off down the stairwell, giggling, looking for someone sillier to lead astray. Pip waves goodbye. It turns out Pip also says “bye” now, and does so to everything: the wisps, the stairs, a beetle, a wall.',
      ],
    },
    {
      place: 'Candle Vault', icon: 'skull', foes: ['skeleton', 'gargoyle'], names: ['Wick the Keeper', 'Spout'],
      arrive: [
        'The Candle Vault is full of candles, every one of them cold. Wick the Keeper, a skeleton with a taper, guards them with a stone gargoyle called Spout. The rule of the vault is that no candle is ever lit. Pip, who is hungry, would like to break the rule.',
      ],
      win: [
        'Wick the Keeper falls apart neatly into a basket, and Spout goes back to sitting on a pillar pretending to be decoration. You light just one candle and give it to Pip, who eats it slowly, like a lollipop. The glass stone brightens a little.',
      ],
    },
    {
      place: 'The Pale Nave', icon: 'skull', foes: ['gloomstalker', 'wraith'], names: ['The Faceless Archer', 'Mournful Mo'],
      arrive: [
        'In the Pale Nave an archer with no face steps out from behind a pillar, and a wraith called Mournful Mo drifts down from the roof, moaning. They work for Mister Hush, who sent them up the stairs to see what all this glowing was about. Now they know.',
      ],
      win: [
        'The archer melts back into the shadows to report, and Mournful Mo floats off, still moaning, though now it sounds a little embarrassed. Somewhere far below, a candle you cannot see goes out with a small pinch.',
      ],
    },
    {
      place: 'Grave-Silk Hall', icon: 'skull', foes: ['spider', 'nightblade'], names: ['Lacey', 'the Masked One'],
      arrive: [
        'Grave-Silk Hall is hung with webs, and a crypt spider called Lacey is busy wrapping the last light in the hall: a firefly in a jar, which she is saving for later. Behind her, something made of smoke with a blank white mask crouches with two curved blades, waiting for Pip to come closer.',
      ],
      win: [
        'Lacey scuttles up into the dark, and the masked thing comes apart into smoke and drifts away. You open the jar and let the firefly go. It circles Pip twice, as if saying thank you, and Pip says “bye” to it very solemnly.',
      ],
    },
    {
      place: 'Ossuary Gate', icon: 'shield', foes: ['lampsnuffer'], names: ['Mister Hush'],
      arrive: [
        'Mister Hush stands in a ring of dead candles at the Ossuary Gate, reaching for Pip with long pinching fingers. It snuffs your light and dims your dice. It never hurries. Keep Pip behind you.',
      ],
      win: [
        'Mister Hush wavers, and thins, and drifts backwards into the dark it came from, and for the first time in a thousand years one of the candles around the gate is still alight. Pip leaves it burning on purpose.',
      ],
    },
    {
      place: 'Mourner’s Row', icon: 'skull', foes: ['puffball', 'wisp'], names: ['Sporeton', 'Flit'],
      arrive: [
        'In Mourner’s Row a giant red mushroom called Sporeton is very sorry about everything. Every time Sporeton sneezes, a green cloud puffs out and every candle in the row goes out. Sporeton sneezes a great deal. Flit the wisp is back, and thinks this is the funniest thing that has ever happened.',
      ],
      win: [
        'Sporeton waddles off into a damp corner, still sneezing, still apologising. Flit is laughing too hard to fight any more and floats away hiccuping. Pip has caught a small sneeze. It is very cute. It also blows out your torch.',
      ],
    },
    {
      place: 'The Drowned Crypt', icon: 'skull', foes: ['dirgesinger', 'skeleton', 'skeleton'], names: ['Cantor Grey', 'Bones', 'Other Bones'],
      arrive: [
        'Across the Drowned Crypt, ankle-deep in black water, a gaunt minstrel called Cantor Grey is leading a choir of two skeletons in a song about the dark. The song is meant to put you to sleep. It is working. Pip has already nodded off on {someone}’s shoulder and is snoring in a tiny high whistle.',
      ],
      win: [
        'Cantor Grey loses his place in the music and the choir falls apart, quite literally, into the water. Pip wakes up, blinks all three eyes, and hums the tune back, perfectly, which is somehow worse.',
      ],
    },
    {
      place: 'Mourner’s Row', icon: 'skull', foes: ['nightblade', 'gloomstalker'], names: ['the Masked One', 'The Faceless Archer'],
      arrive: [
        'The masked smoke-thing and the faceless archer have doubled back to cut you off in Mourner’s Row. They have a delivery slip with them, from someone called the Night Courier. It says: PICK UP 1 STAR. DO NOT BEND.',
      ],
      win: [
        'The two of them fade into the walls and leave the slip behind. On the back, in shaky writing, someone has added: AND IF YOU MEET MOTHER HOB, DO NOT SELL HER ANYTHING. Good advice. Hard to follow.',
      ],
    },
    {
      place: 'The Drowned Crypt', icon: 'skull', foes: ['wraith', 'gargoyle', 'wisp'], names: ['Mournful Mo', 'Spout', 'Flicker'],
      arrive: [
        'The last stretch of the Drowned Crypt is guarded by everyone you have already beaten, together, because they have talked it over and decided that was the problem. Mournful Mo has a plan. Spout has climbed off his pillar. Flicker has brought snacks.',
      ],
      win: [
        'Mo, Spout and Flicker sit down together on the far bank to talk about what went wrong. It is going to be a long talk. Up ahead, under the last arch, a horse made of bones stamps, once, on the stone.',
      ],
    },
    {
      place: 'Ash Cloister', icon: 'crown', foes: ['barrowrider'], names: ['The Night Courier'],
      arrive: [
        'The Night Courier sits on his skeleton horse under the last arch, with a sack for Pip and a delivery slip with Pip’s name spelled wrong. The horse rears and charges. The sword makes the cloister cold. He will not leave without his parcel.',
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
        'On the Kindling Steps two baby dragons are fighting over a gold coin: Toastie, small and red and puffing fire, and Brr, small and blue and puffing frost. Every time they breathe at each other the coin goes hot, then cold, then hot. Then they both see Pip’s stone, which is glowing, and is much better than a coin.',
      ],
      win: [
        'Toastie and Brr fly off in opposite directions, then come back and fly off together, sharing the coin. Pip gives each of them a tiny wave. They wave back with their tails. It is the most polite thing that has happened all week.',
      ],
    },
    {
      place: 'The Glass Fields', icon: 'shine', foes: ['visitor', 'hivedrone'], names: ['Scout Nib', 'a Glass Stinger'],
      arrive: [
        'In the Glass Fields a small green creature with three eyes pops out of a cracked glass rock. It looks exactly like Pip. It is not Pip. It is a Hive Scout called Nib, and it is with a glass stinger the size of a dog, and they have been searching for Pip for three months. They see Pip on {someone}’s shoulder and draw the obvious, wrong, conclusion.',
        'Pip shouts “friends!” Nib does not listen. Nobody in this family listens, it seems.',
      ],
      win: [
        'Nib and the stinger zoom off up the mountain, buzzing loudly, to tell somebody. Pip sits down in the glass and sulks for nearly a minute, which for Pip is a very long time.',
      ],
    },
    {
      place: 'Hoardfall Mine', icon: 'skull', foes: ['basilisk', 'bonfire'], names: ['Glarefang', 'Kindle the Second'],
      arrive: [
        'Deep in Hoardfall Mine lives Glarefang, a red basilisk with a glowing eye who turns things to stone when it stares, and has never once said sorry about it. There is a stone mouse beside it, looking surprised. A walking bonfire called Kindle the Second lights the tunnel for it. (Kindle the First is a family legend.)',
      ],
      win: [
        'Glarefang slinks into a crack in the rock, and Kindle the Second gutters out. As you pass, the stone mouse turns back into a mouse, says something unprintable, and runs. Pip says it too. You will have to talk about that later.',
      ],
    },
    {
      place: 'Wyrmwatch', icon: 'coin', foes: ['chainbinder', 'tuskraider'], names: ['Debt-Collector Clink', 'Snort'],
      arrive: [
        'At the old watchtower of Wyrmwatch, Mother Hob has stopped asking nicely. She has hired a jailer called Clink, draped in gold chains and padlocks, and Snort the raider, who needed the work. “Nothing personal,” calls Mother Hob from behind a rock. “Hob just likes stars. Clink, dear, the green one in the hood.”',
      ],
      win: [
        'Clink runs out of padlocks, and Snort runs out of patience and leaves to join Snaggle’s bakery. Mother Hob sighs from behind her rock. “Fine,” she says. “But Hob is not giving up. Hob will just have to give you more envelopes.”',
      ],
    },
    {
      place: 'The Brazen Bridge', icon: 'skull', foes: ['frostgiant'], names: ['Hrimvald'],
      arrive: [
        'Hrimvald the Rime-Giant blocks the Brazen Bridge with his feet in a bucket of ice, wanting Pip for a warm little stove. He swings a frozen pine. His breath freezes the bridge. He is cold, and sad, and very big.',
      ],
      win: [
        'Hrimvald sits down on the bridge with a crash and puts his head in his hands. Pip climbs down, walks over to the giant’s enormous frozen foot, and hugs one toe for as long as it takes. When Pip lets go, the toe is warm. Hrimvald cries a single icicle. You cross the bridge in silence.',
      ],
    },
    {
      place: 'Kettle Tarn', icon: 'shine', foes: ['moonjelly', 'hivedrone'], names: ['Peepers', 'a Glass Stinger'],
      arrive: [
        'Above Kettle Tarn floats Peepers, a pale-blue moon-jelly with one enormous eye, drifting gently in the steam. Peepers has never seen anything as interesting as Pip, and wants to look at it closer. Much closer. With the eye. A glass stinger has come along to make sure Peepers does not take Pip home.',
      ],
      win: [
        'Peepers drifts away over the tarn, blinking happily, having had a very good look. The stinger buzzes off to report. Pip blinks all three eyes at the moon-jelly, and Peepers, with its one, blinks back. Some friendships are just like that.',
      ],
    },
    {
      place: 'Oathbreak Keep', icon: 'shield', foes: ['visitor', 'visitor', 'hivedrone'], names: ['Scout Nib', 'Scout Nob', 'a Glass Stinger'],
      arrive: [
        'The Hive’s search party has found you in the ruins of Oathbreak Keep: Scout Nib, Scout Nob, who is Nib’s twin and worse, and a glass stinger. They have been told to bring the little one home and not to ask questions. They are very good at not asking questions.',
      ],
      win: [
        'Nib and Nob fly off together, arguing in wind-chime about whose idea this was. Pip calls after them, “Mum!”, and for a moment they both stop in the air and look back. Then they go on up the mountain. Faster.',
      ],
    },
    {
      place: 'Hoardfall Mine', icon: 'flame', foes: ['hivedrone', 'hivedrone', 'cinderling'], names: ['the Amber Stinger', 'the Violet Stinger', 'Toastie'],
      arrive: [
        'Two of the Queen’s own stingers, one amber and one violet, have been waiting for you at the top of the mine shaft, and Toastie the baby dragon has come along to watch, because Toastie has never seen anything this exciting and wants to tell Brr.',
      ],
      win: [
        'The stingers break off and dive away toward the summit. Toastie follows them halfway up, then comes back down and sits on {someone}’s boot, puffing small, happy smoke rings. Pip feeds Toastie a coin. Toastie eats it. It is that sort of week.',
      ],
    },
    {
      place: 'Ember Throne slopes', icon: 'shield', foes: ['hivedrone', 'visitor', 'frostwhelp'], names: ['The Royal Guard', 'Scout Nob', 'Brr'],
      arrive: [
        'The last slope below the summit is held by the Queen’s Royal Guard, a stinger in shining violet glass, with Scout Nob beside it and Brr the frost-whelp on a ledge above, trying to help everyone at once and mostly freezing the wrong things. It is nearly the Long Night. The stars are already very close.',
      ],
      win: [
        'The Royal Guard lowers its sting and lets you pass, looking at Pip for a long time on the way by. Scout Nob is not so sure. Above you, on the Ember Throne, something enormous and shining lands with a sound like a hundred bells.',
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
      tell: 'Pip keeps falling off shoulders. On the road to {place}, somebody has to teach a three-eyed blob how to hold on, and it is not going to be easy.',
      won: '{who} shows Pip how to grab a collar. Pip grabs it, beams, and does not let go for three days.', lost: '{who} explains it slowly. Pip nods, lets go to clap, and falls off again.' },
    null,
    { title: 'Smudge’s Wanted Poster', stat: 'speed', prize: 'gold', go: 'Rip the posters down',
      tell: 'Every tree on the road to {place} has a poster on it: WANTED, 1 STAR. Somebody has drawn Pip with too many teeth. Pip is upset. Tear them all down before anyone reads them.',
      won: '{who} tears down twenty posters in a minute flat, and finds a reward purse taped behind the last one.', lost: '{who} tears down one poster. Behind it is another poster. Behind that, another.' },
    null,
    { title: 'The Bear’s Pebble', stat: 'strength', prize: 'hp', go: 'Carry the big pebble',
      tell: 'Pip wants to bring Old Gravelhide a second warm pebble for the long winter, and Pip has picked the biggest one on the riverbank. Somebody will have to carry it on the way to {place}.',
      won: '{who} hoists the pebble like a sack of flour. The bear, asleep, smiles. You all feel warmer for it.', lost: '{who} lifts it as far as the knees and has a little sit down. Pip pats {who} kindly on the head.' },
    { title: 'Soup at Ashfall', stat: 'wisdom', prize: 'atk', go: 'Fix Ladle’s soup',
      tell: 'Ladle the goblin cook has followed you up the road to {place}, still worried about the soup. It still tastes of boots. Can anyone work out why?',
      won: '{who} fishes a boot out of the bottom of the pot. Ladle is amazed. The soup is wonderful now, and very strengthening.', lost: '{who} adds salt. The soup now tastes of salty boots. Ladle says it is an improvement.' },
    null,
    { title: 'Up the Hill', stat: 'speed', prize: 'block', go: 'Race to the top',
      tell: 'Gallows Hill is steep and the Ash-Tusks are at the top. On the way to {place}, the quickest climber gets the high ground, and the best cover.',
      won: '{who} reaches the top first and finds a fallen shield in perfect shape. Nobody will hit {who} easily now.', lost: '{who} slips on the last bit of slope and slides gently all the way back to the bottom.' },
    null,
  ],
  [
    { title: 'The Last Candle', stat: 'wisdom', prize: 'magic', go: 'Find a candle',
      tell: 'Pip is fading. On the road to {place} there must be a candle somewhere in all this dark. Look carefully.',
      won: '{who} spots a candle stub in a crack in the wall. Pip eats it and glows, and the light tingles through {who}’s fingers too.', lost: '{who} finds a candle. It is a bone. Pip is polite about it.' },
    { title: 'Counting Stairs', stat: 'speed', prize: 'block', go: 'Run down the stairs',
      tell: 'The stairs to {place} go down and down and down. A sign at the top says nine hundred and ninety-nine steps. A sign at the bottom, you suspect, will say something different.',
      won: '{who} runs every step without tripping once and arrives with plenty of breath to spare.', lost: '{who} counts the steps aloud and loses count at four hundred, and has to start again, and nobody lets it go.' },
    null,
    { title: 'The Web Door', stat: 'strength', prize: 'atk', go: 'Tear through the web',
      tell: 'A thick silver web blocks the passage to {place}. It is very strong. It is also very sticky. Pip has already touched it and is stuck to it by one foot.',
      won: '{who} rips the web open with one heave, and peels Pip off it like a sticker.', lost: '{who} pulls. {who} is also now stuck to the web. Pip finds this very funny.' },
    null,
    { title: 'Mister Hush’s Candles', stat: 'wisdom', prize: 'hp', go: 'Light the old candles',
      tell: 'Around the Ossuary Gate, the old candles still stand where Mister Hush left them. If you can work out how they were lit, the road to {place} will be a little less dark.',
      won: '{who} finds the old tinderbox in a niche. One by one the candles take, and the warm light feels like a good meal.', lost: '{who} strikes a spark. It lands on {who}’s sleeve instead. Lots of light. Not the useful kind.' },
    { title: 'Sneeze Practice', stat: 'speed', prize: 'magic', go: 'Catch Pip’s sneeze',
      tell: 'Pip has caught Sporeton’s sneeze, and every sneeze blows out a torch. On the road to {place}, someone has to be quick with a hanky.',
      won: '{who} catches the sneeze in a hanky, neatly. Something sparkly was in it. Pip sneezes magic, it turns out.', lost: '{who} is too slow. Every torch goes out. In the dark, Pip says “sorry” for the first time.' },
    null,
    { title: 'Rowing the Dark', stat: 'strength', prize: 'block', go: 'Row the boat',
      tell: 'The only way across the Drowned Crypt to {place} is an old flat boat with one oar. The water is black and cold. Row hard, and row straight.',
      won: '{who} rows across in great strong strokes, and the far bank is a lot closer than you feared.', lost: '{who} rows hard. In a perfect circle. Pip waves at the same skeleton three times.' },
    null,
  ],
  [
    { title: 'First Starlight', stat: 'wisdom', prize: 'magic', go: 'Find Pip’s star',
      tell: 'Out of the crypt at last, under the open sky on the road to {place}. Pip wants to know which star is home. Somebody has to read the sky.',
      won: '{who} finds it: a faint green star low in the east. Pip stares at it all night, glowing, and some of that glow rubs off.', lost: '{who} points confidently at a star. It is a moth again. It is always a moth.' },
    { title: 'Glass Is Slippery', stat: 'speed', prize: 'atk', go: 'Skate the glass',
      tell: 'The Glass Fields on the road to {place} are as slippery as a frozen pond. You could walk round. It would take a day. Or you could skate.',
      won: '{who} skates across in one long beautiful glide and arrives full of fire.', lost: '{who} skates across in one long, beautiful, completely sideways slide, and lands in a heap.' },
    null,
    { title: 'Hob’s Bargain', stat: 'wisdom', prize: 'gold', go: 'Haggle with Hob',
      tell: 'Mother Hob’s cart is parked across the road to {place}. She is selling “genuine star dust” in jars. Pip tastes some. It is sugar. Can anyone out-haggle Mother Hob?',
      won: '{who} haggles so well that Mother Hob ends up paying you to take the jar away. She is impressed. She is also furious.', lost: '{who} somehow buys three jars of sugar for the price of a horse. Mother Hob hums all the way down the hill.' },
    null,
    { title: 'Warm Toes', stat: 'strength', prize: 'hp', go: 'Light a fire for Hrimvald',
      tell: 'Before you go on to {place}, Pip wants to leave Hrimvald a fire, so the giant’s toes stay warm. The wood is wet. It needs a lot of chopping.',
      won: '{who} chops a mountain of wood and builds a fire you could see from the moon. Hrimvald sighs with joy. You all feel warm for hours.', lost: '{who} chops one log and gets the axe stuck in it. Hrimvald, very kindly, pulls it out for you.' },
    { title: 'Talk to the Twins', stat: 'wisdom', prize: 'block', go: 'Try the wind-chime language',
      tell: 'Pip has been teaching you some words of wind-chime on the road to {place}. If the Hive Scouts come again, maybe one of you can tell them the truth.',
      won: '{who} manages a whole sentence: “Pip is safe.” Pip is so proud it glows like a lantern.', lost: '{who} tries. It seems to mean “I am a teapot.” Pip laughs so hard it falls off.' },
    null,
    { title: 'The Last Climb', stat: 'speed', prize: 'magic', go: 'Climb for the summit',
      tell: 'The Long Night is tonight. The summit is up there, the stars are coming down, and the road to {place} is the steepest yet. Climb, all of you. Climb fast.',
      won: '{who} reaches the ledge below the summit first and pulls everyone else up. The stars are so close they fizz.', lost: '{who} gets there last, puffing, just in time. Pip pats {who}’s cheek and says “nearly.”' },
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
