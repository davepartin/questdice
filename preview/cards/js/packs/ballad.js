// Writer copy for the ballad pack. Generated from the campaign markdown; edit the source file, not this one.
// Casts are catalog ids from docs/MINIS.md. The King, who sent them, hands out the envelopes as royal notes.

export const voice = {
  name: 'the King',
  scenes: [
    'A royal courier hands you a sealed note from the King. Read it. Don’t show the others.',
    'The King has sent one envelope each. Read yours. Don’t peek.',
    'The King says these are small jobs for the road. Read yours. Keep it to yourself.',
    'One envelope each sits beside the Sunday Crown. Read yours. Don’t show the others.',
  ],
};

export const beats = {
  "open:1": {
    kicker: "Prologue",
    title: "The Knight Who Lost to a Duck",
    icon: "crown",
    text: [
      "Everyone in the kingdom knows the song. It is called “The Knight Who Lost to a Duck.” It was written by {bard} about {knight}, who has never once lost to a duck and would like that put on the record.",
      "The King sends them both over the Ember Peaks with the Sunday Crown, to his niece’s coronation. The knight guards it. The bard makes sure it is sung about. The crown has nine stones. One of them is glass. The King asks that this not be mentioned. At the ford a goblin called Pockets wants {knight}’s autograph, and his purse.",
    ],
  },
  "elite:1": {
    kicker: "The road narrows",
    title: "Mungo Wants a Song",
    icon: "skull",
    text: [
      "The Toll Bridge belongs to a hill ogre called Mungo, who does not take money. Mungo takes songs. If he likes the song you may cross. If he does not, he winds up his club.",
      "His favourite song is “The Knight Who Lost to a Duck.” When {bard} strikes it up, Mungo weeps. When {knight} stops the song at verse two to explain that there was no duck, Mungo stops weeping. Watch for the wind-up.",
    ],
  },
  "boss:1": {
    kicker: "Gallows Hill",
    title: "King Grotbag the Unsung",
    icon: "crown",
    text: [
      "On the hill sits the Goblin King, Grotbag. He is jealous because a knight has a song, and a king does not.",
      "He wants the Sunday Crown, and a ballad, and he wants them now. When he claps, more goblins come running. When he throws fire bombs, get clear. {bard} offers to write him a song on the spot. Nothing rhymes with Grotbag.",
    ],
  },
  "close:1": {
    kicker: "The crown is safe",
    title: "Verse One, Revised",
    icon: "shine",
    text: [
      "King Grotbag falls off his throne. The Sunday Crown is safe. The road to the peaks runs under the earth, because the mountain pass fell in a hundred years ago.",
      "That night {bard} asks {knight} what really happened at the moat. {knight} says it is none of his business.",
    ],
  },
  "open:2": {
    kicker: "Act II",
    title: "The Middle Eight",
    icon: "skull",
    text: [
      "The way to the peaks runs under the earth, through the old halls of the dead. They are quiet, cold and echoey.",
      "On the first landing, two Bone Soldiers called Clack and Tibia hear {bard} and decide they are the percussion. They keep time by hitting things. Mostly heroes.",
    ],
  },
  "elite:2": {
    kicker: "The lower door",
    title: "Your Name’s Not on the List",
    icon: "shield",
    text: [
      "At the Ossuary Gate stands Sergeant Femur, a great Bone Warden who works the door. He has a list. Your names are not on it.",
      "{bard} says they are with the band. {knight} quotes the Code of Conduct. Sergeant Femur raises a wall of bone.",
    ],
  },
  "boss:2": {
    kicker: "The bottom of the dark",
    title: "The Late King Mortimer",
    icon: "crown",
    text: [
      "At the bottom of the crypt sits the Late King Mortimer, who died four hundred years ago and has not got over it. He smelled the Sunday Crown from three floors up.",
      "It is not really the crown he wants. Nobody has ever written a song about him. He has sat in the dark, unsung, calling his old courtiers down off the shelves.",
    ],
  },
  "close:2": {
    kicker: "In the quiet",
    title: "What Happened at the Moat",
    icon: "shine",
    text: [
      "King Mortimer yields. {bard} keeps his promise: four short lines about a king who waited a long time in the dark. The old king listens and lies down to sleep.",
      "Afterwards {knight} tells the truth about the moat. A mother duck was crossing the road with eight ducklings. He pulled the reins so his horse would not step on the last one, and went into the moat in full armour. {bard} folds up the duck song and takes out a fresh sheet of paper.",
    ],
  },
  "open:3": {
    kicker: "Act III",
    title: "The Big Finish",
    icon: "flame",
    text: [
      "The Ember Peaks belong to the Dowager Blazemorrow, an old dragon who has heard every song about dragons. They all end the same way. So she has banned singing in the Peaks, and she means it.",
      "{bard} is writing the true song now, as they climb. On the Kindling Steps two Cinderlings called Spit and Spatter hear the humming and demand an encore.",
    ],
  },
  "elite:3": {
    kicker: "The Brazen Bridge",
    title: "The Dowager on the Bridge",
    icon: "crown",
    text: [
      "On the bronze bridge the sun goes out. The Dowager Blazemorrow lands in front of you. She has seen the crown. She has seen the lute.",
      "“I know how this song goes.” She will not finish this here. When she has had enough she will fly to her throne and wait.",
    ],
  },
  "boss:3": {
    kicker: "The Ember Throne",
    title: "No Song Ends This Way",
    icon: "crown",
    text: [
      "The Dowager waits on her throne in the heart of the volcano. She is old and tired and afraid of how songs end, and she has decided to end this one first.",
      "{knight} reads the Code of Conduct, page nine. “A foe who yields shall be spared, and spared kindly. That is how this one ends. Write it down.” {bard} writes it down.",
    ],
  },
  "close:3": {
    kicker: "Highmere",
    title: "The True Ballad of {knight}",
    icon: "shine",
    text: [
      "The Dowager yields. {knight} spares her, kindly, page nine. {bard} asks whether she would like to come to the coronation. She says nobody has ever asked her to anything.",
      "The Sunday Crown reaches Highmere a day early. The young queen is crowned. At the feast {bard} sings “The True Ballad of {knight},” which has ducklings in it, and a crown, and a dragon who was spared, and not one word that is not true. {knight} says it was perfect. Then: “Perhaps put the duck back in.”",
    ],
  },
};

export const steps = [
  [
    {
      place: "Cinder Ford",
      icon: "flame",
      foes: ["goblin"],
      names: ["Pockets"],
      arrive: [
        "A goblin called Pockets waits at the ford with bark and a burnt stick. He wants {knight} to sign it as the Duck Knight. While {knight} says no, Pockets goes through his belt pouches.",
        "{bard} offers to sign instead. Pockets wants the duck’s autograph, not the bard’s.",
      ],
      win: [
        "Pockets runs across the stepping stones with the bark, now marked by a muddy gauntlet-print. He will say it is signed. {bard} writes it down as “The Battle of the Ford.” {knight} says it was a pickpocket.",
      ],
    },
    {
      place: "Burnt Orchard",
      icon: "flame",
      foes: ["goblin", "cinderling"],
      names: ["Twang", "Fizz"],
      arrive: [
        "Under the baked apple trees, a goblin called Twang plays “The Knight Who Lost to a Duck” on a one-string fiddle. A Cinderling called Fizz throws sparks at the big moments and takes coins from the hat. Twang has added a verse where the duck is knighted.",
        "{bard} is angry because that verse is good and he did not write it. {knight} is angry because none of it is true.",
      ],
      win: [
        "Fizz runs with the hat. Twang runs with the fiddle and the new verse. {bard} says a cover should pay. {knight} says a song should be true. They walk on.",
      ],
    },
    {
      place: "Ravens’ Rest",
      icon: "skull",
      foes: ["cultist", "wolf"],
      names: ["Madame Flambé", "Fifi"],
      arrive: [
        "At the waystation, an Ember Mage called Madame Flambé was hired for a wedding that was cancelled. She wants the Sunday Crown to cover her fee. Beside her sits Fifi, a dire wolf she calls a poodle. Fifi has a bow in her fur. Fifi has eaten the wedding cake.",
        "Madame Flambé tangles your dice with sparks, throws up a fire ward, and sets Fifi on you. Fifi stalks through the grass.",
      ],
      win: [
        "Madame Flambé’s ward dies out and she leaves with Fifi. {bard} writes “a sorceress and her hound.” {knight} says it was a juggler and a dog.",
      ],
    },
    {
      place: "Wolfwood Edge",
      icon: "skull",
      foes: ["wolf", "wolf"],
      names: ["Bass", "Baritone"],
      arrive: [
        "Two dire wolves called Bass and Baritone live at the edge of the wood. They know the duck song. They howl the chorus, “Quack, Sir, quack,” an octave down, and they have waited for someone to sing the verses.",
        "{bard} sings verse one. Bass and Baritone join the chorus. Then one slips behind {knight} while the other howls to cover it.",
      ],
      win: [
        "Bass and Baritone go back into the trees, still humming. {knight} says the harmonies were good. {bard} writes that down.",
      ],
    },
    {
      place: "The Toll Bridge",
      icon: "skull",
      foes: ["mungo"],
      names: ["Mungo"],
      arrive: [
        "Mungo the hill ogre sits on the Toll Bridge. The sign says TOLL: ONE SONG. He wants the duck song. If anyone stops halfway to argue, he winds up his club.",
      ],
      win: [
        "Mungo sits down, rubbing his head, and asks if the duck was real. {bard} looks at {knight}. {knight} says nothing. Mungo lets them cross.",
      ],
    },
    {
      place: "Smoke Hollow",
      icon: "flame",
      foes: ["goblin", "cultist"],
      names: ["Snivel", "the Royal Conjuror"],
      arrive: [
        "A goblin in a cardboard crown says he is the King and wants the Sunday Crown back. His name is Snivel. An Ember Mage calling herself the Royal Conjuror sets off fireworks whenever he says “royal.” Their scroll has a crown drawn in crayon.",
        "{knight} asks to see their papers. Snivel shows him the crayon. The Royal Conjuror sets fire to the form.",
      ],
      win: [
        "Snivel’s cardboard crown slips over his eyes and he runs into a tree. The Royal Conjuror leaves in a puff of smoke. {bard} writes “a pretender and his court magician.” {knight} says that is accurate.",
      ],
    },
    {
      place: "Ashfall Camp",
      icon: "flame",
      foes: ["goblin", "goblin", "goblin"],
      names: ["Grub", "Snark", "Old Pemberton"],
      arrive: [
        "Three goblin brothers review everything. Grub gives one star. Snark gives two stars, sarcastically. Old Pemberton is eleven and gives five stars. They have reviewed the duck song. Grub said too many ducks. Snark said not enough. Pemberton drew a duck.",
        "They see {bard} and come at you with burnt sticks. Grub has a fire bomb. Snark has quick fingers. Pemberton hides behind them.",
      ],
      win: [
        "Grub’s last fire bomb goes off in his own notebook. Snark tries to take {bard}’s lute and gets a wrong chord. Pemberton has already left to review a beetle. You walk on.",
      ],
    },
    {
      place: "Ravens’ Rest",
      icon: "skull",
      foes: ["goblin", "wolf"],
      names: ["Dirk Snurpin", "Black Bess"],
      arrive: [
        "A goblin highwayman in a tricorn hat leaps out astride a dire wolf. “Stand and deliver!” cries Dirk Snurpin. His wolf, Black Bess, has seen a squirrel.",
        "{bard} wants the material. {knight} draws his sword.",
      ],
      win: [
        "Black Bess bolts after the squirrel with Dirk clinging on. {bard} starts a verse about a highwayman. {knight} says it was a goblin in a hat.",
      ],
    },
    {
      place: "Ashfall Camp",
      icon: "flame",
      foes: ["goblin", "goblin", "bonfire"],
      names: ["Hurrah", "Hooray", "Bang"],
      arrive: [
        "The goblins are rehearsing a welcome for King Grotbag. Hurrah and Hooray practise cheering. A walking bonfire called Bang is the fireworks. Bang goes off early every time and sets the flags on fire.",
        "They decide strangers are a better target than each other.",
      ],
      win: [
        "Bang runs off in sparks. Hurrah and Hooray cheer, then run. Up the hill, a voice asks if that cheering was for him. It was not.",
      ],
    },
    {
      place: "Gallows Hill",
      icon: "crown",
      foes: ["goblinking"],
      names: ["King Grotbag"],
      arrive: [
        "King Grotbag sits on a heap of stolen crowns, wearing two at once, staring at the Sunday Crown. He claps for more goblins. He throws fire bombs. He winds up his sceptre. He wants a song about himself.",
      ],
      win: [
        "King Grotbag falls off his heap of crowns. The Sunday Crown is still yours.",
      ],
    },
  ],
  [
    {
      place: "The Weeping Stair",
      icon: "skull",
      foes: ["skeleton", "skeleton"],
      names: ["Clack", "Tibia"],
      arrive: [
        "On the Weeping Stair two Bone Soldiers, Clack and Tibia, keep time by hitting themselves. When they hear {bard} tune up, they start counting in.",
        "The nearest things to hit are {knight} and {bard}. One of them is saving a bone for the finish.",
      ],
      win: [
        "Clack and Tibia fall down the stairs on the beat. {bard} says they kept good time. {knight} does not want to be played again.",
      ],
    },
    {
      place: "Candle Vault",
      icon: "spark",
      foes: ["wraith", "skeleton"],
      names: ["Miss Strictly-No-Flash", "Programmes"],
      arrive: [
        "The Candle Vault is a theatre now. A Wraith called Miss Strictly-No-Flash pinches out any candle that flickers. A Bone Soldier called Programmes sells blank programmes for a penny.",
        "{bard} catches a lute string on the way in. Miss Strictly-No-Flash points at the sign: PLEASE SILENCE ALL LUTES.",
      ],
      win: [
        "Miss Strictly-No-Flash drifts back through the wall. Programmes sells {knight} a blank programme, and {knight} pays. {bard} writes both their names in it. {knight} tucks it in his breastplate.",
      ],
    },
    {
      place: "The Pale Nave",
      icon: "skull",
      foes: ["skeleton", "skeleton", "wraith"],
      names: ["Mr Bones", "Mrs Bones", "Mr Dimly"],
      arrive: [
        "Mr and Mrs Bones, two Bone Soldiers, are renewing their vows. They were married here three hundred years ago. The registrar is a Wraith called Mr Dimly, who keeps forgetting the words.",
        "They need a band. {knight} says a royal escort may not stop for weddings. Mrs Bones takes that personally. So does Mr Dimly.",
      ],
      win: [
        "Mr Dimly fades mid-sentence. Mr Bones and Mrs Bones sit holding hands. {bard} plays them one slow tune. {knight} stands at the back with his helmet off until it is over.",
      ],
    },
    {
      place: "Grave-Silk Hall",
      icon: "skull",
      foes: ["spider", "spider"],
      names: ["Warp", "Weft"],
      arrive: [
        "Two Crypt Spiders, Warp and Weft, have spent ten years weaving “The Knight Who Lost to a Duck” as a tapestry. Every verse. {knight}’s face, upside down in the moat, in detail.",
        "They want him still for panel two. One webs the door. The other drops from the ceiling to measure him with her fangs.",
      ],
      win: [
        "Warp and Weft go back to the rafters. {bard} asks {knight} if he wants the tapestry cut down. {knight} says no. It is fine work. It is not what happened.",
      ],
    },
    {
      place: "Ossuary Gate",
      icon: "shield",
      foes: ["bonewarden"],
      names: ["Sergeant Femur"],
      arrive: [
        "Sergeant Femur, a Bone Warden, works the door with a list. Your names are not on it. Argue and he raises a wall of bone. Push him and he calls more bones out of the doorframe. He can wind up a swing that clears the hall.",
      ],
      win: [
        "Sergeant Femur checks his list again and finds “Plus two” at the bottom in faded ink. He waves you through.",
      ],
    },
    {
      place: "Mourner’s Row",
      icon: "skull",
      foes: ["gloomstalker", "wraith"],
      names: ["Snapper", "Lady Whisper"],
      arrive: [
        "Word has reached the crypt that the Duck Knight is here. A Gloom Stalker called Snapper waits in doorways with an arrow. A Wraith called Lady Whisper writes gossip and drains the warmth from anyone who will not talk.",
        "They shout for a quack. {knight} goes stiff. {bard} steps in front of him.",
      ],
      win: [
        "Snapper fades into the wall. Lady Whisper leaves to write that the Duck Knight was rude. {knight} asks {bard} why he did that. {bard} says nobody else gets to make fun of him.",
      ],
    },
    {
      place: "The Drowned Crypt",
      icon: "spark",
      foes: ["frostwhelp", "frostwhelp"],
      names: ["Toboggan", "Skid"],
      arrive: [
        "Two Frostwhelps, Toboggan and Skid, have frozen the Drowned Crypt into a sledging run. When they see {knight}’s shield they want it.",
        "One puffs frost across the water. The other ties {knight}’s ankles with ice so he will not get in the way of the shield.",
      ],
      win: [
        "Toboggan and Skid flee across the ice with a coffin lid. {knight} spent most of the fight on his back. {bard} helps him up.",
      ],
    },
    {
      place: "Mourner’s Row",
      icon: "skull",
      foes: ["gargoyle", "spider"],
      names: ["Mr Pending", "Miss Pigeonhole"],
      arrive: [
        "The Crypt Lost-Property Office is here. A gargoyle called Mr Pending runs the desk. A Crypt Spider called Miss Pigeonhole files things in webs: hats, keys, gloves, and a velvet cushion that looks like the Sunday Crown’s.",
        "Mr Pending wants to file the crown as lost. {knight} asks for the form. It is forty pages. Miss Pigeonhole starts webbing.",
      ],
      win: [
        "Mr Pending stamps the form APPROVED on the way down. Miss Pigeonhole hands back the cushion. {knight} fills in the pages. {bard} holds the lamp.",
      ],
    },
    {
      place: "The Drowned Crypt",
      icon: "spark",
      foes: ["nightblade", "skeleton"],
      names: ["Quill", "Footnote"],
      arrive: [
        "Quill, living smoke in a blank white mask, is writing an unauthorised biography of the Duck Knight. He has never met {knight}. His Bone Soldier assistant, Footnote, holds the ink and checks nothing. Chapter one is called “Born in a Pond.”",
        "{knight} and {bard} are angry about the same thing.",
      ],
      win: [
        "Quill fades into the mist with a soaked manuscript. Footnote sinks, still holding the ink. {bard} reads the first page, calls it bad, and tears it up. A cold blue light leaks from the Ash Cloister.",
      ],
    },
    {
      place: "Ash Cloister",
      icon: "crown",
      foes: ["lich"],
      names: ["King Mortimer"],
      arrive: [
        "The Late King Mortimer sits on a stone chair with a saucepan on his head. He will call old courtiers down from the shelves, drain your warmth, freeze your dice, and wrap himself in bone armour. He wants a song about himself. Nobody has written him one.",
      ],
      win: [
        "The Late King Mortimer lets go, sets his saucepan straight, and asks if {bard} will still write him that song.",
      ],
    },
  ],
  [
    {
      place: "Kindling Steps",
      icon: "flame",
      foes: ["cinderling", "cinderling"],
      names: ["Spit", "Spatter"],
      arrive: [
        "Spit and Spatter, two Cinderlings, work the Kindling Steps as an audience. They demand an encore of everything. They are paid in coins people throw, and almost nobody comes up here.",
        "When {bard} hums a bar of the new song, they shout “MORE!” and dive for his hat.",
      ],
      win: [
        "Spit and Spatter flee uphill, still shouting encore. {bard} says the new song is the first in years anyone wanted more of. {knight} says that is because it is true.",
      ],
    },
    {
      place: "The Glass Fields",
      icon: "spark",
      foes: ["gloomstalker", "cinderling"],
      names: ["Scout Vesper", "Smudge"],
      arrive: [
        "The Dowager’s scouts are hunting musicians. Scout Vesper, a Gloom Stalker, and her Cinderling, Smudge, have orders to lock every singer away. They have heard there is a bard.",
        "They go for {bard} first. {knight} is already in the way, shield up.",
      ],
      win: [
        "Vesper’s last arrow skips across the glass. Smudge flees with a lute string. {bard} writes a verse about a shield and does not show {knight}.",
      ],
    },
    {
      place: "Wyrmwatch",
      icon: "flame",
      foes: ["chainbinder", "frostwhelp"],
      names: ["Officer Muffle", "Earmuffs"],
      arrive: [
        "At Wyrmwatch the Dowager keeps a Noise Patrol. Officer Muffle, a Gold-Chain Jailer, has chained every bell so it cannot ring. A Frostwhelp called Earmuffs freezes any tune that gets loose.",
        "{bard} has been humming since breakfast. Officer Muffle chains your dice so they cannot change either.",
      ],
      win: [
        "Officer Muffle’s chains go slack. Every bell in the tower rings. Earmuffs flees with its paws over its ears. Far above, something large lifts its head.",
      ],
    },
    {
      place: "Hoardfall Mine",
      icon: "coin",
      foes: ["cultist", "cinderling"],
      names: ["Mistress Smelt", "Tester"],
      arrive: [
        "The Dowager’s assayer, an Ember Mage called Mistress Smelt, tests gold by melting it. Her Cinderling, Tester, tests it by biting. They want to test the Sunday Crown.",
        "{knight} says royal property may not be melted or bitten. He does not mention the glass stone. Neither does {bard}.",
      ],
      win: [
        "Mistress Smelt’s fire ward dies. Tester flees with a mouthful of coins. {bard} whispers that the glass one is his favourite. {knight} whispers that it is his too.",
      ],
    },
    {
      place: "The Brazen Bridge",
      icon: "crown",
      foes: ["blazemorrow"],
      names: ["The Dowager Blazemorrow"],
      arrive: [
        "The Dowager Blazemorrow lands on the bronze bridge. The metal glows under her claws. She has seen the crown and the lute. Watch for the Inhale: the breath after it hits you both. When she has had enough she will fly to her throne.",
      ],
      win: [
        "The Dowager laughs and launches into the sky before the fight ends. “Come to my throne, little knight. Finish your song.” {bard} shouts that it is not that kind of song. She does not hear.",
      ],
    },
    {
      place: "Kettle Tarn",
      icon: "spark",
      foes: ["gloomstalker", "frostwhelp"],
      names: ["Warden Reed", "Sleet"],
      arrive: [
        "Kettle Tarn is home to the Dowager’s swans. Warden Reed, a Gloom Stalker, guards them with a black arrow. A Frostwhelp called Sleet keeps the ice fresh.",
        "{knight} stops because cygnets are crossing the path, and he will not move until the last one has gone by. Warden Reed takes that for weakness and begins to stalk.",
      ],
      win: [
        "Warden Reed fades into the steam. Sleet flees across the ice. The swans glide off. {bard} watches {knight} wait for the last cygnet. “That is the moat,” says {bard}. “Yes,” says {knight}.",
      ],
    },
    {
      place: "Oathbreak Keep",
      icon: "shield",
      foes: ["chainbinder", "cultist"],
      names: ["Mr Grasp", "Mrs Torch"],
      arrive: [
        "Two bailiffs are emptying Oathbreak Keep for the Dowager. Mr Grasp, a Gold-Chain Jailer, chains whatever is to be taken. Mrs Torch, an Ember Mage, melts what is too big. They are looking at {knight}’s armour.",
        "On the wall is the old Code of the Keepers, carved in stone. {knight} has read about this wall all his life. He wants the bailiffs away from it.",
      ],
      win: [
        "Mr Grasp drops his chains. Mrs Torch’s ward dies. They leave with a stool. {knight} stands before the Code. {bard} copies it out, every word. It does not rhyme.",
      ],
    },
    {
      place: "Kettle Tarn",
      icon: "spark",
      foes: ["bonfire", "raincloud"],
      names: ["Simmer", "Shiver"],
      arrive: [
        "At night the Dowager’s bath-house is run by Simmer, a walking bonfire who heats the water, and Shiver, a small raincloud who cools it. The Dowager likes her bath exactly right. In a hundred years it has never been exactly right.",
        "They see two travellers covered in crypt dust and decide you need a bath.",
      ],
      win: [
        "Simmer and Shiver flee in opposite directions. The water is left perfect. {bard} asks {knight} to teach him one line of the Code. {knight} asks {bard} to teach him one chord. They keep at it until the stars come out.",
      ],
    },
    {
      place: "Ember Throne slopes",
      icon: "flame",
      foes: ["ashwyrm", "cinderling"],
      names: ["Young Lord Scorchington", "Kindle"],
      arrive: [
        "On the slope stands the Dowager’s grandson, Young Lord Scorchington, a wyrm in a bucket helmet. He wants to be a knight. His favourite song is “The Knight Who Lost to a Duck.” He thinks it is about how brave knights are. His page, a Cinderling called Kindle, carries the bucket.",
        "When he sees {knight} he gasps. Then he remembers whose grandson he is, and inhales.",
      ],
      win: [
        "Young Lord Scorchington flees uphill to tell Granny, bucket clanging, Kindle behind him. {knight} calls after him that the best knights fall in moats sometimes. {bard} writes that down. It is going in the song.",
      ],
    },
    {
      place: "The Ember Throne",
      icon: "crown",
      foes: ["blazemorrow"],
      names: ["The Dowager Blazemorrow"],
      arrive: [
        "The Dowager Blazemorrow uncoils from her hoard of crowns. She will breathe fire that hits you both, frighten your dice still, and inhale before the worst of it. She is old and afraid of how this song ends, and she means to end it first.",
      ],
      win: [
        "The Dowager sinks onto her hoard, lowers her head, and waits for the end of the song.",
      ],
    },
  ],
];

const moments = [
  [
    null,
    { title: 'Quack, Sir, Quack', stat: 'wisdom', prize: 'gold', go: 'Count the verses',
      tell: 'A farmer on the road to {place} is whistling the duck song and has lost count of the verses. There are eleven, or twelve if you count Twang’s. Somebody has to settle it.',
      won: '{who} counts eleven. The farmer pays a coin. {knight} does not look at {bard}.', lost: '{who} counts twelve. {bard} looks pleased. {knight} looks at the sky.' },
    null,
    { title: 'Backing Howls', stat: 'speed', prize: 'atk', go: 'Come in on the chorus',
      tell: 'Two howls from the wood on the road to {place} are doing “Quack, Sir, quack,” an octave down. They are waiting for the verses. Somebody has to start.',
      won: '{who} hits the chorus on the beat. The howls go quiet. A bit of that fire stays in the arms.', lost: '{who} comes in early. The howls come in late. It is still quite good.' },
    null,
    { title: 'Mungo’s Favourite', stat: 'wisdom', prize: 'hp', go: 'Hum it right through',
      tell: 'On the far side of the Toll Bridge, on the road to {place}, Mungo is still humming. He wants to know if the duck was real. A kind hum might send him a little courage.',
      won: '{who} hums it through without the splash. Mungo sighs. Everyone feels a little braver.', lost: '{who} hums verse two. Mungo weeps. It is a wet sound.' },
    { title: 'Five Stars', stat: 'strength', prize: 'block', go: 'Hold still for a review',
      tell: 'A bark notebook is nailed to a post on the road to {place}. Someone has drawn a duck and given the road five stars. The post is loose. Somebody should hammer it in.',
      won: '{who} hammers it straight. The duck looks like a shield.', lost: '{who} hammers it. The duck now has three extra legs.' },
    null,
    { title: 'Flags on Fire', stat: 'speed', prize: 'magic', go: 'Catch the last flag',
      tell: 'Someone has been rehearsing a royal welcome on the road to {place}, and the flags are on fire again. One is still only slightly on fire. First to save it gets the spark.',
      won: '{who} snatches it and smothers it. The spark jumps into the next fight.', lost: '{who} snatches it too late. The flag is already gone.' },
    null,
  ],
  [
    { title: 'The Echo Vote', stat: 'wisdom', prize: 'magic', go: 'Sing one true note',
      tell: 'The Weeping Stair on the road to {place} sends every note back three times. One true note might be worth the echo.',
      won: '{who} sings one clean note. It comes back warmer, and stays in the fingers.', lost: '{who} sings a quack, out of habit. It comes back three times.' },
    { title: 'Silence All Lutes', stat: 'speed', prize: 'block', go: 'Muffle the string',
      tell: 'A sign on the road to {place} says PLEASE SILENCE ALL LUTES. {bard}’s lute has other plans. Somebody quick with a sock might save the next performance.',
      won: '{who} muffles it just in time. The sock feels like armour.', lost: '{who} muffles the wrong string. It honks. An usher ahead turns slowly.' },
    null,
    { title: 'The Golden Duck', stat: 'strength', prize: 'atk', go: 'Lift the tapestry edge',
      tell: 'A corner of Warp and Weft’s tapestry hangs into the road to {place}: a golden duck, mid-splash. Somebody should roll it up before {knight} has to look at it again.',
      won: '{who} rolls it gently. Under the duck is a spear-head the weavers used as a needle.', lost: '{who} rolls it. The duck unrolls. {knight} looks at it and does not look away.' },
    null,
    { title: 'Over Here, Duck Knight', stat: 'wisdom', prize: 'gold', go: 'Give them nothing',
      tell: 'Chalk arrows on the road to {place} all say DUCK KNIGHT THIS WAY. A wise hero walks the other way.',
      won: '{who} takes the unmarked door. Behind it, a dropped purse and a bit of quiet.', lost: '{who} follows the chalk. A ghost with a notebook looks delighted.' },
    { title: 'Coffin-Lid Run', stat: 'speed', prize: 'hp', go: 'Sledge the tombs',
      tell: 'The Drowned Crypt on the road to {place} is a sledging run. Tombstones are the jumps. {knight}’s shield would be perfect. {knight} will not lend it. Somebody else will have to run.',
      won: '{who} takes a coffin lid and flies. The landing leaves leftover courage.', lost: '{who} takes the lid. The lid takes {who}.' },
    null,
    { title: 'Chapter One: Born in a Pond', stat: 'wisdom', prize: 'block', go: 'Tear the page',
      tell: 'A soaked first page floats on the water on the road to {place}. Chapter one is called “Born in a Pond.” Somebody should fish it out.',
      won: '{who} fishes it out and tears it. The rip sounds like a shield going up.', lost: '{who} fishes it out. It is already blank.' },
    null,
  ],
  [
    { title: 'Encore of a Rockfall', stat: 'strength', prize: 'atk', go: 'Bow, then climb',
      tell: 'A rockfall on the road to {place} has already had one encore, and the rocks are still in a heap. Somebody has to bow, then move them.',
      won: '{who} bows, heaves, and the path opens with a swing still in the arms.', lost: '{who} bows. The rocks demand another encore.' },
    { title: 'The Shield Verse', stat: 'wisdom', prize: 'block', go: 'Keep it true',
      tell: '{bard} is writing a verse about a shield on the road to {place} and the rhymes keep getting in the way of the truth. Somebody has to hold the line.',
      won: '{who} keeps it true. The verse sits on the shoulders like plate.', lost: '{who} lets it rhyme. {bard} crosses “glows” out before anyone sees.' },
    null,
    { title: 'The Glass Stone', stat: 'wisdom', prize: 'gold', go: 'Do not mention it',
      tell: 'The Sunday Crown’s glass stone catches the mine-light on the road to {place}. The King asked that it not be mentioned. A careful eye might still count nine stones, and find a coin in the dust that matches the ninth.',
      won: '{who} counts nine and says nothing. The coin is there anyway.', lost: '{who} says “glass.” {knight} coughs. {bard} writes it down, then rubs it out.' },
    null,
    { title: 'Cygnets on the Path', stat: 'speed', prize: 'hp', go: 'Wait for the last one',
      tell: 'A line of cygnets is crossing the road to {place}. {knight} will not take a step until the last one has gone by. Somebody has to wait.',
      won: '{who} waits. The last cygnet nods, and everyone feels a little mended.', lost: '{who} waits, then fidgets. A swan looks at {who} as if money were owed.' },
    { title: 'Page Nine', stat: 'strength', prize: 'magic', go: 'Trace the Code',
      tell: 'The old Code of the Keepers is carved in the Keep wall on the road to {place}. Page nine: a foe who yields shall be spared, and spared kindly. Tracing it takes a firm hand.',
      won: '{who} traces every letter. The stone warms. A little of that law stays in the blood.', lost: '{who} traces page eight by mistake. It is about hats.' },
    null,
    { title: 'The Bucket Helmet', stat: 'speed', prize: 'atk', go: 'Catch the bucket',
      tell: 'A small wyrm in a bucket helmet is practising charges on the road to {place}. The bucket keeps falling off. First to catch it gets a swing, and a salute.',
      won: '{who} catches it, sets it straight, and the salute is perfect. The next fight starts keen.', lost: '{who} catches it. It is still slightly on the wyrm. There is a clang.' },
    null,
  ],
];

export const actSpecs = [
  {
    id: 1,
    name: "Verse the First",
    land: 1,
    tag: "Fans, buskers, critics and a goblin king who wants a song of his own. Guard the crown. Ignore the chorus.",
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
      "Ravens’ Rest",
      "Ashfall Camp",
      "Gallows Hill",
    ],
    fights: [
      ["goblin"],
      ["goblin", "cinderling"],
      ["cultist", "wolf"],
      ["wolf", "wolf"],
      ["mungo"],
      ["goblin", "cultist"],
      ["goblin", "goblin", "goblin"],
      ["goblin", "wolf"],
      ["goblin", "goblin", "bonfire"],
      ["goblinking"],
    ],
    names: [
      ["Pockets"],
      ["Twang", "Fizz"],
      ["Madame Flambé", "Fifi"],
      ["Bass", "Baritone"],
      ["Mungo"],
      ["Snivel", "the Royal Conjuror"],
      ["Grub", "Snark", "Old Pemberton"],
      ["Dirk Snurpin", "Black Bess"],
      ["Hurrah", "Hooray", "Bang"],
      ["King Grotbag"],
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
    name: "The Middle Eight",
    land: 2,
    tag: "Every song has a strange middle bit. This one is underground, extremely echoey, and full of fans.",
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
      ["skeleton", "skeleton", "wraith"],
      ["spider", "spider"],
      ["bonewarden"],
      ["gloomstalker", "wraith"],
      ["frostwhelp", "frostwhelp"],
      ["gargoyle", "spider"],
      ["nightblade", "skeleton"],
      ["lich"],
    ],
    names: [
      ["Clack", "Tibia"],
      ["Miss Strictly-No-Flash", "Programmes"],
      ["Mr Bones", "Mrs Bones", "Mr Dimly"],
      ["Warp", "Weft"],
      ["Sergeant Femur"],
      ["Snapper", "Lady Whisper"],
      ["Toboggan", "Skid"],
      ["Mr Pending", "Miss Pigeonhole"],
      ["Quill", "Footnote"],
      ["King Mortimer"],
    ],
    fightHp: {
      "3": 0.5,
      "6": 1.2,
      "7": 1.15,
      "8": 1,
      "9": 1.1,
      "10": 0.85,
    },
    moments: moments[1],
    help: [],
  },
  {
    id: 3,
    name: "The Big Finish",
    land: 3,
    tag: "A dragon who has heard every song about dragons and hates how they end. Singing is banned. Sing anyway.",
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
      ["gloomstalker", "cinderling"],
      ["chainbinder", "frostwhelp"],
      ["cultist", "cinderling"],
      ["blazemorrow"],
      ["gloomstalker", "frostwhelp"],
      ["chainbinder", "cultist"],
      ["bonfire", "raincloud"],
      ["ashwyrm", "cinderling"],
      ["blazemorrow"],
    ],
    names: [
      ["Spit", "Spatter"],
      ["Scout Vesper", "Smudge"],
      ["Officer Muffle", "Earmuffs"],
      ["Mistress Smelt", "Tester"],
      ["The Dowager Blazemorrow"],
      ["Warden Reed", "Sleet"],
      ["Mr Grasp", "Mrs Torch"],
      ["Simmer", "Shiver"],
      ["Young Lord Scorchington", "Kindle"],
      ["The Dowager Blazemorrow"],
    ],
    fightHp: {
      "2": 1.2,
      "3": 1.2,
      "4": 1.4,
      "6": 1.2,
      "7": 1.3,
      "8": 1.2,
      "9": 0.9,
      "10": 0.8,
    },
    gates: {
      "5": {
        kind: "elite",
        place: "The Brazen Bridge",
        enemies: ["blazemorrow"],
      },
      "10": {
        kind: "boss",
        place: "The Ember Throne",
        enemies: ["blazemorrow"],
      },
    },
    moments: moments[2],
    help: [],
  },
];
