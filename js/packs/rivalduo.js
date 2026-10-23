// Writer copy for the rivalduo pack. Generated from the campaign markdown; edit the source file, not this one.
// Casts are catalog ids from docs/MINIS.md. Madame Twill, who sold the bangle, hands out the envelopes.

export const voice = {
  name: 'Madame Twill',
  scenes: [
    'Madame Twill hands you a sealed envelope. Read it. Don’t show the others.',
    'Madame Twill hands out one envelope each. Read yours. Don’t show your friend.',
    'Madame Twill tucks an envelope into every pocket. Read it. Keep it to yourself.',
    'Madame Twill leaves one envelope each. Read yours. Don’t peek.',
  ],
};

export const beats = {
  "open:1": {
    kicker: "Prologue",
    title: "Some Assembly Required",
    icon: "spark",
    text: [
      "Market day in Cinder Ford. {wizard} bought a Friendship Bangle from Madame Twill’s Novelty Charms and tried to improve the charm. The flourish goes sideways. The bangle splits in two and clasps one wrist of {wizard} and one wrist of {dwarf}, who was buying a sign that says NO MAGIC.",
      "The small print reads: “Removes on completion of One Worthy Quest, undertaken jointly. Wearers straying more than ten paces apart will be gently corrected.” Gently means it plays a tune and yanks. A goblin called Crumb staggers past carrying the label from Gerald, the Centenary Cheese. Gerald has been stolen. The bangle jingles. Cheese counts.",
    ],
  },
  "elite:1": {
    kicker: "The road narrows",
    title: "One and a Half Fares",
    icon: "skull",
    text: [
      "The Toll Bridge has a new toll-keeper: Big Norman, a hill ogre. The goblins paid him in cheese rind to stop anyone following.",
      "His sign says ONE PERSON, ONE PENNY. He looks at {wizard}. He looks at {dwarf}. He looks at the bangle. He settles on one and a half, and winds up a very large club to explain the pricing.",
    ],
  },
  "boss:1": {
    kicker: "Gallows Hill",
    title: "His Royal Cheesiness",
    icon: "crown",
    text: [
      "At the top of the hill sits the Goblin King, Grabbo, on a throne that is round, golden and waxed. It is Gerald. He is sitting on Gerald.",
      "He has never eaten the cheese. He will not let anyone else have it. When pressed, he claps, and more goblins come running.",
    ],
  },
  "close:1": {
    kicker: "Down the stair",
    title: "Gerald Rolls On",
    icon: "shine",
    text: [
      "King Grabbo topples off his throne. Gerald, free at last, rolls. He rolls through the camp, past the Toll Bridge, and straight down the old crypt stair into the dark beneath the Marches.",
      "{wizard} and {dwarf} look at the stair. The bangle jingles. They follow.",
    ],
  },
  "open:2": {
    kicker: "Act II",
    title: "The Cellars Under Everything",
    icon: "skull",
    text: [
      "Long before it was a crypt, the hollow under the Marches was the finest cheese cellar in the land. The dead moved in later and kept the rules. KEEP LEFT. NO RUNNING. NO CHEESE WITHOUT A TICKET.",
      "On the first landing two Bone Soldiers, Left and Right, are enforcing the first sign. You cannot keep left on a spiral stair when you are fastened at the wrist. Left and Right do not care.",
    ],
  },
  "elite:2": {
    kicker: "The lower door",
    title: "Big Wheel",
    icon: "shield",
    text: [
      "A hundred years of cheeses left on the back shelves have matured into a person. Big Wheel stands at the Ossuary Gate: eight feet of stacked rounds and rinds, a cheese-wire in one fist. It heard Gerald roll past and has decided he is family.",
      "Watch it wind up. It hits like a falling larder.",
    ],
  },
  "boss:2": {
    kicker: "The bottom of the dark",
    title: "The Night Porter",
    icon: "crown",
    text: [
      "At the bottom of the crypt stands the Night Porter: a giant of old bones who has minded the cellar door for three hundred years and has never once let anyone in after dark. It is always dark.",
      "Gerald is behind him. The Porter will not move. When pressed, he calls a colleague from the back. The colleague is also bones. {dwarf} sets his boots. {wizard} steps behind the tower shield.",
    ],
  },
  "close:2": {
    kicker: "Up the chimney",
    title: "Gone in a Puff",
    icon: "shine",
    text: [
      "The Night Porter sits down and hands {dwarf} his keys. Then, just as {wizard} reaches for Gerald, a long golden snout comes down the cloister chimney and plucks the cheese up and away into the sky.",
      "The scorch marks on the chimney point toward the Ember Peaks. {wizard} and {dwarf} follow.",
    ],
  },
  "open:3": {
    kicker: "Act III",
    title: "The Long Way Up",
    icon: "flame",
    text: [
      "The Ember Peaks belong to the Duchess Goldbelly, a dragon of enormous appetite and very poor eyesight, who collects everything round and golden. Word has reached her of the largest, roundest, goldest coin in the world. The coin is Gerald.",
      "On the first steps two Cinderlings, Flicker and Flicker’s Cousin Gareth, are biting every coin that comes up the stair. They are now looking at {wizard}’s buttons.",
    ],
  },
  "elite:3": {
    kicker: "The Brazen Bridge",
    title: "The Royal Taster",
    icon: "crown",
    text: [
      "On the bronze bridge waits Lord Grillbert, the Duchess’s Taster. It was his snout that came down the chimney. He has been tasting Gerald for three days.",
      "He inhales before every breath of fire. When he has had enough he will flap off to tell the Duchess.",
    ],
  },
  "boss:3": {
    kicker: "The Ember Throne",
    title: "Her Grace, the Duchess Goldbelly",
    icon: "crown",
    text: [
      "The throne room is the inside of the volcano. On a hill of round golden things lies the Duchess Goldbelly, squinting. Gerald is propped up beside her. She has not noticed that he is cheese.",
      "“The biggest coin in the world,” she says. “Mine.” The bangle jingles. Worthy Quest. Undertaken jointly. Nearly finished.",
    ],
  },
  "close:3": {
    kicker: "Home for the fair",
    title: "Ten Paces",
    icon: "shine",
    text: [
      "The Duchess bites the coin. She lets them take Gerald home, in exchange for one cheese delivered every Midsummer. Gerald reaches the Cinder Ford fair a day late and slightly bitten, and wins first prize. The Friendship Bangle clicks open. Worthy Quest, completed.",
      "{wizard} and {dwarf} step apart. One pace. Five. Ten. Nothing tugs. Then {dwarf} writes “except {wizard}” on his NO MAGIC sign, and they walk home the same way, on purpose.",
    ],
  },
};

export const steps = [
  [
    {
      place: "Cinder Ford",
      icon: "flame",
      foes: ["goblin"],
      names: ["Crumb"],
      arrive: [
        "The ferry landing is deserted except for a goblin called Crumb, who was given the job of carrying Gerald’s prize label. The others carried Gerald. He has only now realised that everyone else has gone home.",
        "He brandishes the label at {wizard} and {dwarf}. He also tries to pick {wizard}’s pocket.",
      ],
      win: [
        "Crumb drops the label and scampers uphill after his friends. {dwarf} pockets the card as evidence.",
      ],
    },
    {
      place: "Burnt Orchard",
      icon: "flame",
      foes: ["cinderling", "goblin"],
      names: ["Toastie", "Grater"],
      arrive: [
        "Every apple in the orchard has baked on the branch. A goblin called Grater and a Cinderling called Toastie have been waiting for the cheese called Gerald.",
        "Then they see {dwarf}’s beard. It is yellowish. They look at each other with hope. {dwarf} has never been so insulted in his life.",
      ],
      win: [
        "Toastie flees with a slice of toast. Grater runs the other way with the loaf.",
      ],
    },
    {
      place: "Ravens’ Rest",
      icon: "skull",
      foes: ["wolf", "goblin"],
      names: ["Sniffer", "Lead"],
      arrive: [
        "At the old waystation a goblin called Lead is being taken for a walk by his wolf. The wolf is called Sniffer. She was trained to sniff out cheese. Lead has tied the rope round his own wrist.",
        "Sniffer catches the scent of Gerald on {dwarf}’s gloves. She does not wait for orders.",
      ],
      win: [
        "Sniffer bolts into the trees with Lead bouncing behind her. The ravens drop a single feather at {wizard}’s feet.",
      ],
    },
    {
      place: "Wolfwood Edge",
      icon: "skull",
      foes: ["wolf", "wolf"],
      names: ["Grizzle", "Also Grizzle"],
      arrive: [
        "Two dire wolves step out of the tree line: Grizzle and Also Grizzle. One stalks low through the bracken. The other howls to make you look the wrong way.",
        "The trouble is the bangle. {wizard} dodges left. {dwarf} charges right. The bangle reaches ten paces, plays its tune, and yanks them back together.",
      ],
      win: [
        "Grizzle and Also Grizzle trot back into the wood. {dwarf} says that from now on they go round things on the same side.",
      ],
    },
    {
      place: "The Toll Bridge",
      icon: "skull",
      foes: ["ogre"],
      names: ["Big Norman"],
      arrive: [
        "Big Norman sits on the Toll Bridge. His sign says ONE PERSON, ONE PENNY, and he is staring at the bangle. Two people fastened together, he has decided, come to one and a half. When the sums get too hard, he winds up his club.",
      ],
      win: [
        "Big Norman sits down heavily. On the far side, a cheese-shaped rut leads on toward Smoke Hollow.",
      ],
    },
    {
      place: "Smoke Hollow",
      icon: "flame",
      foes: ["shieldbearer", "goblin"],
      names: ["Private Standhere", "Nudge"],
      arrive: [
        "In the middle of the hollow stands a hired Shieldbearer, Private Standhere, who was told by the goblins to stand here. A goblin called Nudge has been left to keep him company.",
        "Private Standhere locks his shield and will not let anyone past.",
      ],
      win: [
        "Private Standhere sits down at last. Nudge runs off to report this.",
      ],
    },
    {
      place: "Ashfall Camp",
      icon: "flame",
      foes: ["goblin", "goblin", "goblin"],
      names: ["Brie", "Edam", "Colin"],
      arrive: [
        "Guarding the goblin camp are three goblin triplets: Brie, Edam and Colin. Brie throws fire bombs. Edam pinches anything not nailed down. Colin hides behind the other two.",
        "{wizard} says Colin is not a cheese. {dwarf} says it is. They argue long enough that the triplets attack first.",
      ],
      win: [
        "Brie’s last fire bomb goes off in the cookpot. Edam tries to pinch {wizard}’s hat. Colin was already halfway down the hill.",
      ],
    },
    {
      place: "Smoke Hollow",
      icon: "flame",
      foes: ["wolf", "cinderling"],
      names: ["Mrs Paws", "Little Sizzle"],
      arrive: [
        "Back through Smoke Hollow at dusk, a dire wolf called Mrs Paws has adopted a Cinderling. She calls it Little Sizzle. She is fiercely protective.",
        "The goblins sent Little Sizzle to sniff out Gerald. Mrs Paws has come along.",
      ],
      win: [
        "Little Sizzle flees in a puff of sparks. Mrs Paws lopes after it.",
      ],
    },
    {
      place: "Ashfall Camp",
      icon: "flame",
      foes: ["goblin", "goblin", "shieldbearer"],
      names: ["Chairman Gob", "Minutes", "Sergeant Quorum"],
      arrive: [
        "In the heart of the camp the goblins are holding a meeting of the Cheese Committee. Chairman Gob bangs a ladle. A goblin called Minutes writes everything down. A hired Shieldbearer, Sergeant Quorum, stands at the door.",
        "Today’s first item is two fastened intruders.",
      ],
      win: [
        "The Committee breaks up. Sergeant Quorum leaves. Minutes drops his notes. The last line reads: “Agreed: give cheese to King. Nobody to eat cheese.”",
      ],
    },
    {
      place: "Gallows Hill",
      icon: "crown",
      foes: ["goblinking"],
      names: ["King Grabbo"],
      arrive: [
        "At the top of the hill King Grabbo sits on Gerald. He claps when he wants more goblins. He throws fire bombs when he wants attention. When he winds up his sceptre, it is best to be elsewhere. He will not let anybody eat the cheese.",
      ],
      win: [
        "King Grabbo slides off Gerald. Gerald, for the first time in a week, is free.",
      ],
    },
  ],
  [
    {
      place: "The Weeping Stair",
      icon: "skull",
      foes: ["skeleton", "skeleton"],
      names: ["Left", "Right"],
      arrive: [
        "Two Bone Soldiers, Left and Right, enforce the sign KEEP LEFT on the Weeping Stair. A wizard and a dwarf fastened at the wrist cannot keep left on a spiral stair.",
        "Up go the shields. One of them is saving a bone to throw.",
      ],
      win: [
        "Left and Right clatter into a heap at the bottom. {wizard} takes the wall. {dwarf} takes the banister. It gets them down the stairs.",
      ],
    },
    {
      place: "Candle Vault",
      icon: "spark",
      foes: ["wraith", "skeleton"],
      names: ["Mildred", "Spare Rib"],
      arrive: [
        "The Candle Vault is blazing with light, because a Wraith called Mildred has lit every candle. She has been cold for two hundred years. Her assistant, a Bone Soldier called Spare Rib, follows her about with a blanket.",
        "Mildred wails that they have left the door open. She drifts through a wall to make her point.",
      ],
      win: [
        "Mildred sinks into her blanket. Spare Rib tucks her in. {wizard} slips a small warming charm into the bottle on the way out.",
      ],
    },
    {
      place: "The Pale Nave",
      icon: "skull",
      foes: ["dirgesinger", "skeleton", "skeleton"],
      names: ["Madam Shush", "Stamp", "Overdue"],
      arrive: [
        "The Pale Nave has become a library. Its Head Librarian is a Dirge Singer called Madam Shush. Her hush takes the words out of your next roll. Her junior librarians, two Bone Soldiers called Stamp and Overdue, stamp books and frown.",
        "The bangle jingles. Every skull in the nave turns at once.",
      ],
      win: [
        "Madam Shush’s last hush cracks. Stamp and Overdue fall over. {wizard} finds a book that names a hard white cheese called Colin. He shows {dwarf}.",
      ],
    },
    {
      place: "Grave-Silk Hall",
      icon: "skull",
      foes: ["spider", "spider"],
      names: ["Mrs Tuffet", "Mrs Tuffet-Next-Door"],
      arrive: [
        "Two Crypt Spiders, Mrs Tuffet and Mrs Tuffet-Next-Door, have made a web jumper with two neck holes and three sleeves.",
        "They would like {wizard} and {dwarf} to try it on. One webs the door. The other comes down from the beams with a tape measure and a mouthful of venom.",
      ],
      win: [
        "The Tuffets scuttle back into the rafters. {dwarf} cuts the jumper off. {wizard} keeps the third sleeve. The crypt is cold.",
      ],
    },
    {
      place: "Ossuary Gate",
      icon: "shield",
      foes: ["bigwheel"],
      names: ["Big Wheel"],
      arrive: [
        "Big Wheel blocks the Ossuary Gate: eight feet of forgotten cheeses that matured until they stood up, with a cheese-wire in one hand. It heard Gerald roll past and has decided he is family. It winds up for a blow like a falling larder.",
      ],
      win: [
        "Big Wheel topples and rolls away into the dark. {dwarf} says it is a crime to waste cheese like that.",
      ],
    },
    {
      place: "Mourner’s Row",
      icon: "skull",
      foes: ["wraith", "gloomstalker"],
      names: ["Mrs Peering", "Constable Lurk"],
      arrive: [
        "Mourner’s Row has a Neighbourhood Watch. A Wraith called Mrs Peering watches from behind her net curtains. A Gloom Stalker, Constable Lurk, patrols the street with a black arrow.",
        "Two strangers, fastened together, at night. Mrs Peering says it is suspicious. Constable Lurk fades into a wall and begins to stalk.",
      ],
      win: [
        "Mrs Peering draws her curtains. Constable Lurk leaves an arrow in the lintel with a note that says “Reported.”",
      ],
    },
    {
      place: "The Drowned Crypt",
      icon: "spark",
      foes: ["frostwhelp", "frostwhelp"],
      names: ["Sorbet", "Slush"],
      arrive: [
        "Two Frostwhelps, Sorbet and Slush, have moved into the Drowned Crypt because it is cold enough for cheese. They heard a cheese went by, and they would like it.",
        "One puffs frost across the water. The other ties {dwarf}’s boots together with a flick of its wings.",
      ],
      win: [
        "Sorbet and Slush flee across the ice. {dwarf}’s beard has frozen solid. {wizard} thaws it with the tip of his staff.",
      ],
    },
    {
      place: "Mourner’s Row",
      icon: "skull",
      foes: ["gargoyle", "spider"],
      names: ["Sweeps", "Cobweb Kate"],
      arrive: [
        "Back on Mourner’s Row, a stone gargoyle called Sweeps sweeps the street every night. Every night a Crypt Spider called Cobweb Kate webs it all back up.",
        "Then they both decide the strangers are making a mess, and for the first time they are on the same side.",
      ],
      win: [
        "Sweeps and Cobweb Kate end up in a tangle of broom and web.",
      ],
    },
    {
      place: "The Drowned Crypt",
      icon: "spark",
      foes: ["spider", "frostwhelp"],
      names: ["Netta", "Sorbet"],
      arrive: [
        "Sorbet the Frostwhelp is back, freezing a hole in the black water. A Crypt Spider called Netta fishes through it with a net of web.",
        "Netta looks at the bangle and wonders whether two heroes, tied together, count as one big fish.",
      ],
      win: [
        "Sorbet flees with a hat. Netta keeps the eel. Beyond the water, a cold light shows the way to the Ash Cloister, where Gerald waits.",
      ],
    },
    {
      place: "Ash Cloister",
      icon: "crown",
      foes: ["bonewarden"],
      names: ["The Night Porter"],
      arrive: [
        "The Night Porter stands at the cloister door with Gerald behind him. He will put up a wall of bone, call a colleague from the back, and wind up a swing that could clear a room. There is a form for moving. Nobody has ever filled it in.",
      ],
      win: [
        "The Night Porter sits down. He hands {dwarf} the keys and asks him to lock up on the way out. From the chimney above comes the scrape of claws.",
      ],
    },
  ],
  [
    {
      place: "Kindling Steps",
      icon: "flame",
      foes: ["cinderling", "cinderling"],
      names: ["Flicker", "Cousin Gareth"],
      arrive: [
        "Two Cinderlings guard the Kindling Steps for the Duchess: Flicker, and Flicker’s Cousin Gareth. Their job is to bite every coin that comes up the stair. Gareth is now looking very hard at {wizard}’s buttons.",
        "Flicker puffs sparks over both heroes. Gareth snatches a button.",
      ],
      win: [
        "Flicker and Gareth flee uphill. That night {dwarf} sews up the gap in {wizard}’s robe.",
      ],
    },
    {
      place: "The Glass Fields",
      icon: "spark",
      foes: ["shieldbearer", "gloomstalker"],
      names: ["Barry", "Shade"],
      arrive: [
        "On the Glass Fields a hired Shieldbearer called Barry is on his first day. On the ridge above him waits his supervisor, a Gloom Stalker called Shade, who fades out of sight whenever Barry asks a question.",
        "Barry’s first question is whether two heroes fastened together count as one target or two.",
      ],
      win: [
        "Barry sits down on the glass. Shade’s last arrow skitters off into the glare. {wizard} tells Barry he did well for a first day.",
      ],
    },
    {
      place: "Wyrmwatch",
      icon: "flame",
      foes: ["chainbinder", "cinderling"],
      names: ["Constable Clank", "Snitch"],
      arrive: [
        "At Wyrmwatch the Duchess’s Gold-Chain Jailer, Constable Clank, has spotted the Friendship Bangle. In his view it is unlicensed. A Cinderling called Snitch rings the tower bells whenever anybody moves.",
        "Clank starts chaining your dice down so they cannot change their minds.",
      ],
      win: [
        "Constable Clank’s chains go slack. Snitch flies out of a window, still holding a bell-rope.",
      ],
    },
    {
      place: "Hoardfall Mine",
      icon: "coin",
      foes: ["bonfire", "frostwhelp"],
      names: ["Brother Ingot", "Sister Frostbite"],
      arrive: [
        "The coin-mine is silent because the miners are on strike. Brother Ingot, a walking bonfire, and Sister Frostbite, a Frostwhelp, want a share of the Duchess’s biggest coin. Their banner says FAIR PAY, ROUND PAY, CHEESE PAY.",
        "{dwarf} says he supports their right to strike. That is when Brother Ingot snatches his purse.",
      ],
      win: [
        "Brother Ingot flees with both cheeks stuffed with coins. Sister Frostbite flees with the banner.",
      ],
    },
    {
      place: "The Brazen Bridge",
      icon: "crown",
      foes: ["ashwyrm"],
      names: ["Lord Grillbert"],
      arrive: [
        "Lord Grillbert, the Duchess’s Taster, sits on the bronze bridge with crumbs of Gerald in his whiskers. He inhales before each breath of fire. When the fight turns he will fly to Her Grace.",
      ],
      win: [
        "Lord Grillbert takes off and flaps away up the mountain to complain to the Duchess. {dwarf} offers to take the shield on the next climb so {wizard} can keep both hands free for spells.",
      ],
    },
    {
      place: "Kettle Tarn",
      icon: "spark",
      foes: ["frostwhelp", "raincloud"],
      names: ["Drip", "Drop"],
      arrive: [
        "Kettle Tarn boils at one end and freezes at the other. A Frostwhelp called Drip and a small raincloud called Drop have been trying to make tea for a year. Drip fills the kettle at the boiling end. Drop rains on it at once.",
        "{wizard} has not had a proper cup of tea since market day.",
      ],
      win: [
        "Drip flees across the ice. Drop rains himself out. {wizard} makes the tea properly and pours three cups: one for himself, one for {dwarf}, and one on a rock for the pair.",
      ],
    },
    {
      place: "Oathbreak Keep",
      icon: "shield",
      foes: ["shieldbearer", "chainbinder"],
      names: ["Lugg", "Mr Inventory"],
      arrive: [
        "The Duchess has sent her removals team to Oathbreak Keep to collect anything round and golden. A Shieldbearer called Lugg does the lifting. A Gold-Chain Jailer called Mr Inventory does the counting.",
        "Mr Inventory looks at {dwarf}’s round shield, writes it down, and sends Lugg to fetch it.",
      ],
      win: [
        "Lugg drops a crate of door-knobs. Mr Inventory’s chains clatter to the floor. {dwarf} hands {wizard} his shield to hold while he hangs a portrait back on the wall.",
      ],
    },
    {
      place: "Kettle Tarn",
      icon: "spark",
      foes: ["nightblade", "frostwhelp"],
      names: ["Night-Watch Nora", "Pickle"],
      arrive: [
        "By night the tarn is guarded by Night-Watch Nora, a figure of living smoke in a blank white mask, and a Frostwhelp called Pickle. Pickle is meant to raise the alarm.",
        "Pickle sees the heroes and binds their knees with its icy wings. Nora takes this as her cue.",
      ],
      win: [
        "Night-Watch Nora fades into the steam. Pickle flees after her, comes back for a pebble, then flees again.",
      ],
    },
    {
      place: "Ember Throne slopes",
      icon: "flame",
      foes: ["ashwyrm", "shieldbearer"],
      names: ["Lord Grillbert", "Barry"],
      arrive: [
        "Lord Grillbert is back on the golden slope with a fresh grudge. Beside him stands Barry the Shieldbearer, on his second day. Grillbert is inhaling before Barry can ask any questions.",
      ],
      win: [
        "Lord Grillbert flees uphill roaring for Her Grace. Barry lays down his shield. Above them the mountain rumbles. The Duchess has noticed.",
      ],
    },
    {
      place: "The Ember Throne",
      icon: "crown",
      foes: ["goldbelly"],
      names: ["Duchess Goldbelly"],
      arrive: [
        "The Duchess Goldbelly lies on her hill of round golden things, squinting, with Gerald propped beside her. She will breathe fire that splashes on you both, frighten your dice still, and inhale before her biggest blasts. She still has not noticed that her coin is cheese.",
      ],
      win: [
        "The Duchess sinks onto her hoard, squints at the coin, and, for the first time, takes a bite.",
      ],
    },
  ],
];

const moments = [
  [
    null,
    { title: 'The Sign Says No', stat: 'wisdom', prize: 'block', go: 'Read the fine print',
      tell: '{dwarf}’s NO MAGIC sign has picked up a smudge on the road to {place}. Under the smudge, in Madame Twill’s hand, there is a line nobody noticed: except in emergencies.',
      won: '{who} spots the extra line. It covers {who} a little.', lost: '{who} rubs the smudge. The line is gone.' },
    null,
    { title: 'Ten Paces Exactly', stat: 'speed', prize: 'atk', go: 'Measure the tug',
      tell: 'The bangle on the road to {place} is getting opinions about distance. Somebody has to walk it out: ten paces, no more, and see who gets yanked first.',
      won: '{who} hits ten exactly. The next swing starts a little keener.', lost: '{who} hits eleven. The bangle plays its tune and both heroes meet in the middle.' },
    null,
    { title: 'A Rind on the Post', stat: 'strength', prize: 'hp', go: 'Lift Big Norman’s leftover',
      tell: 'Big Norman paid himself in cheese rind and then ate it. On the road to {place} one rind is still nailed to the toll-post, out of reach.',
      won: '{who} wrenches it down. It is terrible. It is also strengthening.', lost: '{who} tugs. The post tugs back.' },
    { title: 'Colin Is a Cheese', stat: 'wisdom', prize: 'gold', go: 'Settle the argument',
      tell: 'On the road to {place}, {wizard} and {dwarf} are still arguing about whether Colin is a cheese. A peddler has left a wheel by the path with a label.',
      won: '{who} reads it: COLIN, HARD WHITE, WEDDINGS. {dwarf} was right. There is a coin under the rind.', lost: '{who} reads it upside down. Nobody is happy.' },
    null,
    { title: 'The Cheese Committee’s Notes', stat: 'speed', prize: 'magic', go: 'Grab the minutes',
      tell: 'A burnt-stick page is still smoking on the road to {place}. The last line trails off. First to read it gets a spark of whatever they were voting on.',
      won: '{who} snatches it: “Agreed: give cheese to King.” The spark jumps.', lost: '{who} snatches a blank page.' },
    null,
  ],
  [
    { title: 'Keep Left', stat: 'wisdom', prize: 'block', go: 'Read the signs',
      tell: 'The cellar signs on the road to {place} say KEEP LEFT. NO RUNNING. NO CHEESE WITHOUT A TICKET. A wizard and a dwarf fastened at the wrist cannot keep left on a spiral stair unless somebody thinks.',
      won: '{who} works it out: both take the wall.', lost: '{who} takes the banister. {dwarf} takes the wall. The bangle yanks.' },
    { title: 'The Vault Door', stat: 'speed', prize: 'magic', go: 'Shut the door',
      tell: 'The Candle Vault door on the road to {place} does not close. A wail is already practising in the dark. Somebody quick might wedge it with a blanket.',
      won: '{who} wedges it. The draught stops. A little warmth stays in the hands.', lost: '{who} wedges it with {wizard}’s hat.' },
    null,
    { title: 'Mrs Tuffet’s Flat', stat: 'strength', prize: 'atk', go: 'Lift the tea table',
      tell: 'A tea table made of silk and bone blocks the hall on the road to {place}. Mrs Tuffet-Next-Door left it there. It is heavier than furniture has any right to be.',
      won: '{who} hoists the tea table aside.', lost: '{who} lifts one end. The other end sits down.' },
    null,
    { title: 'Net Curtains', stat: 'wisdom', prize: 'hp', go: 'Wave politely',
      tell: 'Net curtains on the road to {place} twitch even when nobody is home. A polite wave might still be worth something.',
      won: '{who} waves. A very small plate of cold soup appears on the step. It is strengthening.', lost: '{who} waves with the wrong hand. The curtains snap shut. A note says “Reported.”' },
    { title: 'Black Water', stat: 'strength', prize: 'gold', go: 'Break a path',
      tell: 'The Drowned Crypt on the road to {place} is iced over, and a coin is frozen in the surface. Somebody has to break a path without losing it.',
      won: '{who} cracks a neat lane and flicks the coin free.', lost: '{who} stamps. The coin slides under.' },
    null,
    { title: 'The Form for Moving', stat: 'wisdom', prize: 'block', go: 'Fill it in',
      tell: 'The Night Porter’s form for moving is nailed to a stone tree on the road to {place}. It is three hundred years out of date. It is also the only form.',
      won: '{who} fills every blank. The dark steps back a pace.', lost: '{who} writes “cheese” in every box. The form accepts it. The Porter will not.' },
    null,
  ],
  [
    { title: 'Buttons Are Not Gold', stat: 'speed', prize: 'gold', go: 'Save the buttons',
      tell: 'Flicker’s Cousin Gareth is still thinking about {wizard}’s buttons on the road to {place}. First to cover them keeps them, and any coin Gareth dropped in the attempt.',
      won: '{who} gets there first. Two buttons, one coin.', lost: '{who} is too slow. Gareth has a button.' },
    { title: 'Barry’s First Day', stat: 'wisdom', prize: 'block', go: 'Answer his question',
      tell: 'Barry the Shieldbearer has left a note on the glass on the road to {place}: “Do two heroes fastened together count as one target or two? Please advise.”',
      won: '{who} writes “one.” Barry, later, will lock shields with the right person.', lost: '{who} writes “yes.” Barry will be confused.' },
    null,
    { title: 'Fair Pay, Round Pay', stat: 'strength', prize: 'hp', go: 'Hold the banner',
      tell: 'The strike banner on the road to {place} has fallen over: FAIR PAY, ROUND PAY, CHEESE PAY. The miners will want it back. Somebody should stand it up.',
      won: '{who} plants it. A crust is pressed into {who}’s hand.', lost: '{who} plants it upside down.' },
    null,
    { title: 'A Proper Cup of Tea', stat: 'wisdom', prize: 'magic', go: 'Boil it once',
      tell: 'A kettle sits between boil and freeze on the road to {place}. Someone has been filling it and cooling it for a year. {wizard} has not had a cup of tea since market day.',
      won: '{who} makes it properly. The steam sparkles. Even {dwarf} takes a sip.', lost: '{who} lets the rain end in it.' },
    { title: 'Round and Golden', stat: 'speed', prize: 'atk', go: 'Rescue a door-knob',
      tell: 'Mr Inventory has packed the door-knobs of Oathbreak Keep into a crate on the road to {place}. One has rolled out. It is round. It is golden.',
      won: '{who} nips the door-knob.', lost: '{who} nips it. It is chained to the next one.' },
    null,
    { title: 'The Last Ten Paces', stat: 'strength', prize: 'block', go: 'Climb together',
      tell: 'The coin-slope to {place} is steep, and the bangle has opinions about heroes who climb at different speeds. Shoulder to shoulder, or it will sing.',
      won: '{who} matches pace all the way. The bangle is quiet. The slope feels like a shield.', lost: '{who} pulls ahead. The tune plays. They arrive in a heap.' },
    null,
  ],
];

export const actSpecs = [
  {
    id: 1,
    name: "The Ten-Pace Problem",
    land: 1,
    tag: "Goblins, a stolen cheese, and a bangle with opinions. Stay within ten paces.",
    places: [
      "Cinder Ford",
      "Burnt Orchard",
      "Ravens’ Rest",
      "Wolfwood Edge",
      "Smoke Hollow",
      "The Toll Bridge",
      "Ashfall Camp",
      "Gallows Hill",
    ],
    route: [
      "Cinder Ford",
      "Burnt Orchard",
      "Ravens’ Rest",
      "Wolfwood Edge",
      "The Toll Bridge",
      "Smoke Hollow",
      "Ashfall Camp",
      "Smoke Hollow",
      "Ashfall Camp",
      "Gallows Hill",
    ],
    fights: [
      ["goblin"],
      ["cinderling", "goblin"],
      ["wolf", "goblin"],
      ["wolf", "wolf"],
      ["ogre"],
      ["shieldbearer", "goblin"],
      ["goblin", "goblin", "goblin"],
      ["wolf", "cinderling"],
      ["goblin", "goblin", "shieldbearer"],
      ["goblinking"],
    ],
    names: [
      ["Crumb"],
      ["Toastie", "Grater"],
      ["Sniffer", "Lead"],
      ["Grizzle", "Also Grizzle"],
      ["Big Norman"],
      ["Private Standhere", "Nudge"],
      ["Brie", "Edam", "Colin"],
      ["Mrs Paws", "Little Sizzle"],
      ["Chairman Gob", "Minutes", "Sergeant Quorum"],
      ["King Grabbo"],
    ],
    fightHp: {
      "2": 0.9,
      "4": 0.85,
      "7": 0.55,
      "9": 0.55,
    },
    moments: moments[0],
    help: [],
  },
  {
    id: 2,
    name: "The Cellars Under Everything",
    land: 2,
    tag: "Long before the dead moved in, it was a cheese cellar. They kept the rules.",
    places: [
      "The Weeping Stair",
      "Ossuary Gate",
      "Candle Vault",
      "The Pale Nave",
      "Grave-Silk Hall",
      "Mourner’s Row",
      "The Drowned Crypt",
      "Ash Cloister",
    ],
    route: [
      "The Weeping Stair",
      "Candle Vault",
      "The Pale Nave",
      "Grave-Silk Hall",
      "Ossuary Gate",
      "Mourner’s Row",
      "The Drowned Crypt",
      "Mourner’s Row",
      "The Drowned Crypt",
      "Ash Cloister",
    ],
    fights: [
      ["skeleton", "skeleton"],
      ["wraith", "skeleton"],
      ["dirgesinger", "skeleton", "skeleton"],
      ["spider", "spider"],
      ["bigwheel"],
      ["wraith", "gloomstalker"],
      ["frostwhelp", "frostwhelp"],
      ["gargoyle", "spider"],
      ["spider", "frostwhelp"],
      ["bonewarden"],
    ],
    names: [
      ["Left", "Right"],
      ["Mildred", "Spare Rib"],
      ["Madam Shush", "Stamp", "Overdue"],
      ["Mrs Tuffet", "Mrs Tuffet-Next-Door"],
      ["Big Wheel"],
      ["Mrs Peering", "Constable Lurk"],
      ["Sorbet", "Slush"],
      ["Sweeps", "Cobweb Kate"],
      ["Netta", "Sorbet"],
      ["The Night Porter"],
    ],
    fightHp: {
      "3": 0.5,
      "5": 1.8,
      "6": 1.2,
      "7": 1.15,
      "8": 1,
      "9": 1,
      "10": 1.25,
    },
    moments: moments[1],
    help: [],
  },
  {
    id: 3,
    name: "The Long Way Up",
    land: 3,
    tag: "A near-sighted duchess, a hoard of round golden things, and one very famous cheese. Mind the steps.",
    places: [
      "Kindling Steps",
      "The Glass Fields",
      "Wyrmwatch",
      "Hoardfall Mine",
      "The Brazen Bridge",
      "Kettle Tarn",
      "Oathbreak Keep",
      "Ember Throne slopes",
      "The Ember Throne",
    ],
    route: [
      "Kindling Steps",
      "The Glass Fields",
      "Wyrmwatch",
      "Hoardfall Mine",
      "The Brazen Bridge",
      "Kettle Tarn",
      "Oathbreak Keep",
      "Kettle Tarn",
      "Ember Throne slopes",
      "The Ember Throne",
    ],
    fights: [
      ["cinderling", "cinderling"],
      ["shieldbearer", "gloomstalker"],
      ["chainbinder", "cinderling"],
      ["bonfire", "frostwhelp"],
      ["ashwyrm"],
      ["frostwhelp", "raincloud"],
      ["shieldbearer", "chainbinder"],
      ["nightblade", "frostwhelp"],
      ["ashwyrm", "shieldbearer"],
      ["goldbelly"],
    ],
    names: [
      ["Flicker", "Cousin Gareth"],
      ["Barry", "Shade"],
      ["Constable Clank", "Snitch"],
      ["Brother Ingot", "Sister Frostbite"],
      ["Lord Grillbert"],
      ["Drip", "Drop"],
      ["Lugg", "Mr Inventory"],
      ["Night-Watch Nora", "Pickle"],
      ["Lord Grillbert", "Barry"],
      ["Duchess Goldbelly"],
    ],
    fightHp: {
      "2": 1.2,
      "3": 1.2,
      "4": 1.05,
      "5": 1.6,
      "6": 1.2,
      "7": 1.25,
      "8": 1.0,
      "9": 0.55,
      "10": 0.5,
    },
    gates: {
      "5": {
        kind: "elite",
        place: "The Brazen Bridge",
        enemies: ["ashwyrm"],
      },
      "10": {
        kind: "boss",
        place: "The Ember Throne",
        enemies: ["goldbelly"],
      },
    },
    moments: moments[2],
    help: [],
  },
];
