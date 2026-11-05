// Four move faces (Dave, November 2026). Kept separate from the historical six-face sheets
// so comparisons can play either ruleset. Slots are deliberate: basics, character, big hit.
export const MONSTER_D4 = { on: false };
const PICKS = {
  goblin: ['Stab', 'Stab', 'Pilfer', 'Fire Bomb'],
  wolf: ['Bite', 'Lunge', 'Howl', 'Rend'],
  cultist: ['Ember', 'Bolt', 'Fire Ward', 'Siphon'],
  ogre: ['Club', 'Stomp', 'Roar', 'Smash'], bigwheel: ['Club', 'Stomp', 'Roar', 'Smash'], mungo: ['Club', 'Stomp', 'Roar', 'Smash'],
  goblinking: ['Scepter', 'Scepter', 'Rally!', 'Fire Bombs'],
  skeleton: ['Slash', 'Slash', 'Shield Up', 'Stab'],
  wraith: ['Chill', 'Touch', 'Phase', 'Drain'],
  spider: ['Bite', 'Venom', 'Web', 'Pounce'],
  bonewarden: ['Cleave', 'Cleave', 'Raise Dead', 'Smash'],
  lich: ['Soul Bolt', 'Drain Life', 'Dread', 'Soul Storm'],
  shieldbearer: ['Spear', 'Shove', 'Lock Shields', 'Spear Thrust'],
  gloomstalker: ['Black Arrow', 'Knife', 'Stalk', 'Deadeye'],
  chainbinder: ['Chain Bolt', 'Rod', 'Chain', 'Siphon'],
  dirgesinger: ['Lute Smash', 'Sour Note', 'Hush', 'Crescendo'],
  ironwarden: ['Axe', 'Axe', 'Stone Wall', 'Shield Bash'],
  fallenchampion: ['Oathbreaker', 'Oathbreaker', 'Chain', 'Oath Smite'],
  cinderling: ['Nip', 'Nip', 'Hoard', 'Puff'],
  frostwhelp: ['Bite', 'Claw', 'Icy Wings', 'Frost Puff'],
  ashwyrm: ['Claw', 'Tail Sweep', 'Wing Buffet', 'Fire Breath'],
  vharaxis: ['Talons', 'Bite', 'Terrify', 'Ember Bite'],
  goldbelly: ['Talons', 'Bite', 'Terrify', 'Ember Bite'],
  blazemorrow: ['Talons', 'Bite', 'Terrify', 'Ember Bite'],
  magpieking: ['Scepter', 'Scepter', 'Snatch the Luck', 'Royal Strike'],
  magpies: ['Stab', 'Stab', 'Shiny!', 'Slash'],
  foxrogue: ['Knife', 'Knife', 'Pilfer', 'Lunge'],
  treant: ['Branch', 'Stomp', 'Root Grip', 'Uproot Smash'],
  puffball: ['Bite', 'Claw', 'Curl Up', 'Spore Sneeze'],
  raincloud: ['Bite', 'Claw', 'Soaked', 'Washout'],
  bonfire: ['Nip', 'Ember Kick', 'Hot Coals', 'Flare'],
  wisp: ['Chill', 'Touch', 'Lead Astray', 'Bright Flare'],
  lampsnuffer: ['Cleave', 'Cleave', 'Snuff', 'Smash'],
  moonjelly: ['Chill', 'Touch', 'Sleepy Stare', 'Moonbeam'],
  visitor: ['Prod', 'Sour Note', 'Hold Still', 'Take a Sample'],
  hedgeboar: ['Bite', 'Lunge', 'Gore', 'Rend'],
  silkwood: ['Needle', 'Drain Life', 'Web', 'Needle Storm'],
  gargoyle: ['Claw', 'Shove', 'Turn to Stone', 'Spout'],
  yeti: ['Swipe', 'Stomp', 'Bear Hug', 'Frosty Huff'],
  direbear: ['Maul', 'Claw', 'Roar', 'Crushing Maul'],
  tuskraider: ['Cleave', 'Shove', 'War Cry', 'Axe Smash'],
  tuskwarlord: ['Cleave', 'Cleave', 'War Cry', 'Frenzy'],
  barrowrider: ['Cleave', 'Grave Chill', 'Call the Barrow Guard', 'Smash'],
  stormtyrant: ['Glaive', 'Glaive', 'Static Lock', 'Chain Lightning'],
  hivedrone: ['Bite', 'Glass Barb', 'Paralysing Sting', 'Pounce'],
  hivequeen: ['Glass Bolt', 'Drink the Luck', 'Resin', 'Glass Storm'],
  nightblade: ['Shadow Cut', 'Knife', 'From the Dark', 'Backstab'],
  basilisk: ['Fang', 'Bite', 'Stone Gaze', 'Venom Fang'],
  slagcolossus: ['Forge-Fist', 'Forge-Fist', 'Molten Skin', 'Slag Spray'],
  frostgiant: ['Trunk', 'Blizzard', 'Frozen Solid', 'Smash'],
};
const DAMAGE = new Set(['strike', 'pierce', 'drain', 'pilfer', 'breath']);
const avg = (f, size) => DAMAGE.has(f.v) ? (f.f || 0) + (f.m || 0) * (size + 1) / 2 : 0;
// Uses the current sheet (including a pack override/rage). An absent name is a named strike,
// never a second Wind-Up. Copies keep the source sheets and existing saved rounds untouched.
export function fourMoves(id, sheet, base = sheet) {
  if (!MONSTER_D4.on || !sheet?.faces?.length || sheet.faces.length === 4) return sheet?.faces;
  const source = sheet.faces; const size = sheet.power || base.power || 8;
  const hits = source.filter(f => DAMAGE.has(f.v));
  const fallback = [...hits].sort((a, b) => avg(a, size) - avg(b, size));
  const names = PICKS[id] || [fallback[0]?.n, fallback[1]?.n || fallback[0]?.n, source.find(f => !DAMAGE.has(f.v) && f.v !== 'charge')?.n, fallback.at(-1)?.n];
  const faces = names.map((name, i) => {
    const f = source.find(f => f.n === name) || base.faces?.find(f => f.n === name);
    return f && f.v !== 'charge' ? { ...f } : { n: name || (i === 2 ? 'Guard' : 'Strike'), v: i === 2 ? 'guard' : 'strike', f: i === 3 ? 2 : 0, m: 1 };
  });
  // Lunge becomes a basic one-die blow. The big face happens 25%, so don't promote a
  // basic two-die move and then inflate the whole card to beat it.
  for (const f of faces.slice(0, 2)) if (f.m > faces[3].m) f.m = faces[3].m;
  // The fourth face is always the largest direct hit, including after rage/pack changes.
  const need = Math.max(...faces.slice(0, 3).map(f => avg(f, size)));
  if (avg(faces[3], size) <= need) faces[3].f += Math.floor(need - avg(faces[3], size)) + 1;
  return faces;
}
// Signatures move off the die and into the existing, counterable Special system.
// No extra die-based Wind-Up competes with Slam. Ordinary minions keep fight Specials.
export function signatureSpecial(id) {
  if (!MONSTER_D4.on) return null;
  if (['lich', 'silkwood', 'hivequeen'].includes(id)) return { id: 'spawn', name: id === 'lich' ? 'Raise Dead' : id === 'silkwood' ? 'Call Brood' : 'Brood Call' };
  if (['vharaxis', 'goldbelly', 'blazemorrow'].includes(id)) return { id: 'slam', name: 'Inferno', verb: 'breath' };
  if (['ogre', 'bigwheel', 'mungo', 'treant', 'direbear', 'yeti', 'ironwarden', 'slagcolossus', 'frostgiant', 'lampsnuffer', 'bonewarden', 'barrowrider', 'ashwyrm', 'stormtyrant', 'fallenchampion'].includes(id)) return { id: 'slam', name: 'Slam' };
  return null;
}
