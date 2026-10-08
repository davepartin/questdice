// The story thread (Dave, Oct 2026): a short beat at the moments that matter, so every fight is part of one journey.
// The Dawn Lantern kept the Marches safe. The Goblin King stole its flame out of greed; the Hollow Lich drained it from
// below out of cold emptiness. The heroes carry the light home. Light against the dark; nothing occult.
// Pure data and rules: no DOM. A beat is { kicker, title, icon, text: [paragraphs] }.
// When they show (before the road and the quest board): an act opening at quest 1 (after the last act's closing), a short
// beat before the elite at quest 5 and before the boss at quest 10. Seen beats are kept in campaign.storySeen.

const BEATS = {
  'open:1': { kicker: 'Prologue', title: 'The Night the Light Went Out', icon: 'flame', text: [
    'For as long as anyone could remember, the Dawn Lantern burned on the hill above Cinder Ford. Its light kept the Marches green, the roads safe, and the long nights short.',
    'Then the goblins came under a moonless sky. Their king carried the Lantern’s flame away in an iron cage and set the Marches burning with it. Now the fields smoulder, the wolves grow bold, and the fire will not die.',
    'You are not much yet: a handful of dice and a stubborn heart. But someone has to walk toward the smoke. Bring the light home.',
  ] },
  'elite:1': { kicker: 'The road narrows', title: 'A Guard on the Road', icon: 'skull', text: [
    'The Goblin King has posted a guard where the road narrows: a hill ogre, paid in stolen bread and promised more.',
    'He is slow, and he is not clever, but he hits like a falling tree. Watch for him winding up. Get past him, and the king’s hill comes into sight.',
  ] },
  'boss:1': { kicker: 'Gallows Hill', title: 'The Goblin King', icon: 'crown', text: [
    'From the top of the hill you can see it at last: the Lantern’s flame, pale and thrashing in its iron cage beside the Goblin King’s throne.',
    'He calls it his treasure. He has never once looked at it with joy. He only cannot bear for anyone else to have it. Take it back.',
  ] },
  'close:1': { kicker: 'The cage breaks', title: 'Only a Spark', icon: 'shine', text: [
    'The king falls among his piles of stolen gold, and the iron cage splits open. But the flame inside is only a spark now, barely warm in your hands.',
    'Something has been drinking the light from below. The last sparks drift away from you, down the old crypt stair, as if they know the way home better than you do.',
  ] },
  'open:2': { kicker: 'Act II', title: 'The Hollow Crypt', icon: 'skull', text: [
    'Beneath the Marches lie the old halls of the dead, quiet for a hundred years. Not anymore. The bones have stood up, and they march in rows.',
    'Each one carries a stolen sliver of the Lantern’s light, held tight inside its ribs like a coal it is afraid to drop. Follow the sparks down. Bring every sliver back.',
  ] },
  'elite:2': { kicker: 'The lower door', title: 'The Bone Warden', icon: 'shield', text: [
    'The lower halls have a keeper: the Bone Warden, a giant of fused bone that has stood at the deep door for a hundred years.',
    'It does not hate you. It does not want anything. It simply will not move. Make it.',
  ] },
  'boss:2': { kicker: 'The bottom of the dark', title: 'The Hollow Lich', icon: 'crown', text: [
    'At the very bottom sits the one who started it all: the Hollow Lich, a king of bones with an empty chest.',
    'He drank the light because he cannot feel warm anymore, and he would rather the whole world went cold with him than ask for help. He will not give it back. You will have to take it.',
  ] },
  'close:2': { kicker: 'Dawn', title: 'The Light Comes Home', icon: 'shine', text: [
    'The Lich crumbles, and every stolen sliver of light rushes up out of the crypt at once: up the stair, across the ashen fields, back into the Lantern on its hill.',
    'For the first time in a long time the sun rises on the Marches, and nobody is afraid of it. You did not do it alone. Every friend who stood beside you, every hand that held the line, is part of that light now.',
    'The light shines in the darkness, and the darkness has not overcome it.',
  ] },
  // The Ascents (act 3 on): the same lands, harder, with a short new chapter each time.
  'open:ascent:1': { kicker: 'Ascent', title: 'The Light Is Tested', icon: 'flame', text: [
    'The Lantern burns again and the Marches are healing. But a light on a hill can be seen from far away.',
    'Bolder warbands come down out of the hills, with wolves that remember the dark. They want the flame back. Stand watch on the road.',
  ] },
  'open:ascent:2': { kicker: 'Ascent', title: 'Deeper Still', icon: 'skull', text: [
    'The old halls have filled again with bones that would rather stay in the dark, and they are reaching up for the light.',
    'Go down once more, and keep the light where it belongs.',
  ] },
  'boss:ascent:1': { kicker: 'Gallows Hill', title: 'The King Returns', icon: 'crown', text: [
    'He ran from the last fight with a crown of ash and a grudge. Now the Goblin King is back, greedier than ever.',
    'Some people never learn that the things they grab never make them happy. Remind him why he ran.',
  ] },
  'boss:ascent:2': { kicker: 'The bottom of the dark', title: 'The Lich Rises Again', icon: 'crown', text: [
    'Bones remember. The Hollow Lich has pulled himself back together, colder than before.',
    'Send him back to his rest, and bring the light up with you.',
  ] },
  'close:ascent': { kicker: 'The light holds', title: 'The Road Goes On', icon: 'shine', text: [
    'The light holds, and the land breathes easier. But the road is long, and there is always another hill.',
  ] },
};

const ACTS_IN_STORY = 2; // Act I and Act II; then the Ascents repeat them
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ascentOf = (act) => Math.floor((act - 1) / ACTS_IN_STORY) + 1; // 1 = the first time through
const landOf = (act) => ((act - 1) % ACTS_IN_STORY) + 1;             // 1 = the Marches, 2 = the Crypt

// The beat id for a moment in a given act ('open' | 'elite' | 'boss' | 'close'), or null when that act has none.
export function beatId(kind, act) {
  if (ascentOf(act) === 1) return BEATS[`${kind}:${act}`] ? `${kind}:${act}` : null;
  if (kind === 'close') return 'close:ascent';
  if (kind === 'elite') return null;
  return `${kind}:ascent:${landOf(act)}`;
}
// A beat ready to show: the text, with the kicker naming the act and Ascent.
export function beat(id, act) {
  const b = BEATS[id]; if (!b) return null;
  const asc = ascentOf(act);
  const kicker = asc > 1 && b.kicker === 'Ascent' ? `Ascent ${asc} · Act ${romans[landOf(act) - 1]}` : b.kicker;
  return { id, act, kicker, title: b.title, icon: b.icon, text: b.text };
}
const seen = (c, id, act) => (c.storySeen || []).includes(`${id}@${act}`);
// What to show now, in order (usually zero or one beat; at an act's first quest, the last act's closing then this act's opening).
export function pending(c) {
  if (!c) return [];
  const out = [];
  const add = (kind, act) => { const id = beatId(kind, act); if (id && !seen(c, id, act)) out.push({ id, act }); };
  if (c.step === 1) { if (c.act > 1) add('close', c.act - 1); add('open', c.act); }
  if (c.step === 5) add('elite', c.act);
  if (c.step === 10) add('boss', c.act);
  return out;
}
export function markSeen(c, id, act) { c.storySeen = [...new Set([...(c.storySeen || []), `${id}@${act}`])]; }
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
