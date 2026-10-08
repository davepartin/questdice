// Shared glue between the rules engine (js/engine.js intents) and actor animation clips.
// An intent is { n: 'Stab', v: 'strike', f, m, k, slam }. Given one, which clip shows it
// TELEGRAPHED before the roll (tele), and which clip PLAYS when the round resolves (act)?

const BY_VERB = {
  strike:  { tele: 'tele_strike', act: 'attack' },
  pierce:  { tele: 'tele_cast',   act: 'throw' },
  drain:   { tele: 'tele_cast',   act: 'siphon' },
  pilfer:  { tele: 'tele_pilfer', act: 'pilfer' },
  guard:   { tele: 'tele_guard',  act: 'guard' },
  mend:    { tele: 'tele_mend',   act: 'mend' },
  charge:  { tele: 'tele_charge', act: 'charge' },
  howl:    { tele: 'tele_howl',   act: 'howl' },
  bind:    { tele: 'tele_hex',    act: 'hex' },
  summon:  { tele: 'tele_summon', act: 'summon' },
  ward:    { tele: 'tele_guard',  act: 'guard' },
  stalk:   { tele: 'tele_charge', act: 'charge' },
  phase:   { tele: 'tele_guard',  act: 'guard' },
};
// Move-name overrides: a Wolf's "Lunge" is a leap, a Goblin's "Fire Bomb" is a throw, etc.
const BY_NAME = {
  Lunge: { act: 'lunge' }, Pounce: { act: 'lunge' }, Rend: { act: 'attack2' }, Slash: { act: 'attack2' }, Smash: { act: 'attack2' },
  Stomp: { act: 'stomp' }, 'Fire Bomb': { act: 'throw' }, 'Fire Bombs': { act: 'throw' }, Slam: { tele: 'tele_slam', act: 'slam' },
  Frenzy: { act: 'attack2' }, 'Bone Throw': { act: 'throw' }, Rally: {}, 'Rally!': {},
};
export function intentClips(intent) {
  if (!intent) return { tele: 'ready', act: 'idle' };
  const v = BY_VERB[intent.v] || {};
  const n = BY_NAME[intent.n] || {};
  const slam = intent.slam && !intent.pounce ? BY_NAME.Slam : {}; // a Pounce leaps instead
  return { tele: slam.tele || n.tele || v.tele || 'ready', act: slam.act || n.act || v.act || 'attack' };
}
// What a given intent looks like to the VFX layer, so the right projectile/aura appears.
export const intentFx = (intent) => ({
  strike: 'melee', pierce: 'projectile', drain: 'siphon', pilfer: 'melee', guard: 'ward', mend: 'heal',
  charge: 'windup', howl: 'howl', bind: 'hex', summon: 'summon', ward: 'ward', stalk: 'windup', phase: 'ward',
}[intent?.v] || 'melee');
