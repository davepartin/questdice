// The Legend of… (Dave, Oct 2026): at the end of every act, one page that tells what happened in it, built from the fights
// themselves, with a title for each hero, what the secret envelopes were hiding, and a teaser for the next act. A table may
// stop after any act, so each act gets its own legend. Pure rules, no DOM: every battle adds to campaign.legend[act]
// (noteBattle, from the round log engine keeps for secret objectives), and legendBeat turns that into a story page that
// story.js shows before the act's closing page.
import { actsOf } from './campaigns.js';

const hashSeed = (...parts) => { let h = 2166136261; for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const fresh = () => ({ fights: 0, wins: 0, falls: [], from: null, boss: null, bossPlace: null, big: null, heroes: {}, secrets: { done: 0, offered: 0, taken: 0, worked: 0, forced: 0, rivalries: 0 } });
const zero = () => ({ dealt: 0, blocked: 0, kills: 0, triples: 0, straights: 0, gold: 0, magic: 0, close: 0, downs: 0, heal: 0, bribes: 0 });

// After every fight, won or lost. c: the campaign (before it moves on); battle: solo or team; reveal: the envelopes' lines.
export function noteBattle(c, battle, { won, quest = battle?.quest, reveal = null } = {}) {
  if (!c || !battle) return null;
  const L = ((c.legend ||= {})[c.act] ||= fresh());
  const place = quest?.place || '';
  L.fights++; if (won) L.wins++; else if (place) L.falls.push(place);
  if (!L.from && place) L.from = place;
  if (won && quest?.kind === 'boss') { L.boss = quest.foeNames?.[0] || quest.name || null; L.bossPlace = place; }
  const hero = (name) => (L.heroes[name] ||= zero());
  const down = new Set();
  for (const r of battle.secretLog || []) {
    const H = hero(r.name);
    H.dealt += r.dealt || 0; H.blocked += r.blocked || 0; H.kills += (r.kills || []).length; H.triples += r.triples || 0;
    H.straights += r.straight ? 1 : 0; H.gold += Math.max(0, r.gold || 0); H.magic += r.magic || 0;
    if ((r.hp ?? 1) <= 0) down.add(r.name);
    if ((r.dealt || 0) > (L.big?.n || 0)) L.big = { name: r.name, n: r.dealt, place };
  }
  for (const name of down) hero(name).downs++;
  const fighters = battle.fighters || (battle.hero ? [{ hero: battle.hero, hp: battle.hp, stats: battle.stats }] : []);
  for (const f of fighters) {
    const H = hero(f.hero.name);
    H.heal += f.stats?.healGiven || 0;
    if (won && f.hp > 0 && f.hp <= 5) H.close++;
  }
  for (const l of reveal?.lines || []) {
    const S = L.secrets;
    if (l.kind === 'bribe') {
      if (l.mode === 'forced') S.forced++;
      else { S.offered++; if (l.accepted) { S.taken++; hero(l.name).bribes++; if (l.gold > 0) S.worked++; } }
    } else if (l.kind === 'rival') { if (l.gold > 0) S.rivalries++; } else if (l.gold > 0) S.done++;
  }
  return L;
}

// One title per hero: whatever they did most of, compared with the rest of the company (or, alone, with a usual fight).
const TITLES = {
  dealt: ['the Hammer', 'the Goblins’ Worst Nightmare', 'the Big Swing'],
  blocked: ['the Wall', 'the Unbudgeable', 'the Shield With Legs'],
  kills: ['the Finisher', 'Last Hit', 'the Closer'],
  triples: ['Lucky Hands', 'the Dice Whisperer', 'Three of a Kind'],
  gold: ['the Pocket', 'the Coin Magnet', 'the Treasurer'],
  magic: ['the Sparkler', 'the Spellslinger', 'the Glow'],
  close: ['the Cliffhanger', 'Nearly Gone', 'the Comeback'],
  downs: ['the Floor Inspector', 'the Lie-Down Champion', 'Mostly Horizontal'],
  heal: ['the Medic', 'the Potion Thrower', 'the Kind One'],
  bribes: ['the Crook', 'Open to Offers', 'the Bribable'],
};
const WHY = {
  dealt: (v) => `${v} damage`, blocked: (v) => `${v} blocked`, kills: (v) => `${v} finishing blow${v === 1 ? '' : 's'}`,
  triples: (v) => `${v} triple${v === 1 ? '' : 's'}`, gold: (v) => `${v} gold picked up`, magic: (v) => `${v} damage by magic`,
  close: (v) => `${v} win${v === 1 ? '' : 's'} on 5 health or less`, downs: (v) => `knocked flat ${v} time${v === 1 ? '' : 's'}`,
  heal: (v) => `${v} health given to friends`, bribes: (v) => `${v} bribe${v === 1 ? '' : 's'} taken`,
};
const PER_FIGHT = { dealt: 40, blocked: 18, kills: 1.3, triples: 0.4, gold: 15, magic: 10, close: 0.15, downs: 0.2, heal: 6, bribes: 0.1 };
function titlesFor(L, names, seed, act) {
  const keys = Object.keys(TITLES); const used = new Set(); const out = [];
  // how much of it, for a usual fight, times this hero's share of the company's (so the Wall is the one who blocked a lot of it)
  const score = (name, k) => {
    const v = L.heroes[name]?.[k] || 0; if (!v) return 0;
    const norm = v / (PER_FIGHT[k] * Math.max(1, L.fights));
    if (names.length < 2) return norm;
    const total = names.reduce((t, n) => t + (L.heroes[n]?.[k] || 0), 0);
    return norm * (v / total) * (k === 'downs' || k === 'bribes' || k === 'close' ? 0.85 : 1); // the funny ones when nothing else stands out
  };
  for (const name of names) {
    const ranked = keys.map((k) => ({ k, s: score(name, k) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    const pick = ranked.find((x) => !used.has(x.k)) || ranked[0]; if (!pick) continue;
    used.add(pick.k);
    const list = TITLES[pick.k]; const t = list[hashSeed(seed, act, name, pick.k) % list.length];
    out.push(`${name}, ${t} (${WHY[pick.k](L.heroes[name][pick.k])})`);
  }
  return out;
}
const best = (L, names, k) => names.map((n) => ({ n, v: L.heroes[n]?.[k] || 0 })).sort((a, b) => b.v - a.v)[0];
const sum = (L, names, k) => names.reduce((t, n) => t + (L.heroes[n]?.[k] || 0), 0);
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export const hasLegend = (c, act) => (c?.legend?.[act]?.fights || 0) > 0;
// The page itself: { kicker, title, icon, text: [the act in a sentence or two], facts: [highlights], teaser }.
export function legendBeat(c, act, heroes = []) {
  const L = c?.legend?.[act]; if (!L || !L.fights) return null;
  const names = heroes.map((h) => h.name).filter((n) => L.heroes[n]);
  for (const n of Object.keys(L.heroes)) if (!names.includes(n)) names.push(n);
  const acts = actsOf(c); const spec = acts[(act - 1) % acts.length] || {};
  const lost = L.fights - L.wins; const places = [...new Set(L.falls)];
  const intro = `${L.from ? `From ${L.from}${L.bossPlace && L.bossPlace !== L.from ? ` to ${L.bossPlace}` : ''}` : 'Along the road'}: ${L.fights} fight${L.fights === 1 ? '' : 's'}, `
    + `${L.wins} won${lost ? `, ${lost} lost along the way (${andList(places)})` : ', and not one lost'}.`
    + (L.boss ? ` ${L.boss} is beaten.` : '');
  const facts = [];
  if (L.big?.n) facts.push(`The biggest single round: ${L.big.name}, ${L.big.n} damage${L.big.place ? ` at ${L.big.place}` : ''}.`);
  const team = names.length > 1;
  const top = (k, say) => { const b = best(L, names, k); if (b?.v) facts.push(say(b)); };
  top('dealt', (b) => (team ? `${b.n} dealt the most damage: ${b.v}.` : `${b.n} dealt ${b.v} damage in all.`));
  top('blocked', (b) => `${b.n} blocked ${b.v} damage${team ? ', more than anyone' : ''}.`);
  top('kills', (b) => `${b.n} landed ${b.v} finishing blow${b.v === 1 ? '' : 's'}.`);
  const tri = sum(L, names, 'triples'); if (tri) facts.push(`${tri} triple${tri === 1 ? '' : 's'} rolled${team ? ` (${best(L, names, 'triples').n} rolled the most)` : ''}.`);
  top('close', (b) => `${b.n} won ${b.v === 1 ? 'a fight' : `${b.v} fights`} on 5 health or less.`);
  const shown = facts.slice(0, 5); const S = L.secrets;
  if (S.done || S.offered || S.forced || S.rivalries) {
    const bits = [];
    if (S.done) bits.push(`${S.done} secret challenge${S.done === 1 ? '' : 's'} done`);
    if (S.rivalries) bits.push(`${S.rivalries} secret rivalr${S.rivalries === 1 ? 'y' : 'ies'} won`);
    if (S.offered) bits.push(`${S.taken} of ${S.offered} bribe${S.offered === 1 ? '' : 's'} taken${S.taken ? ` (${S.worked} paid off)` : ''}`);
    if (S.forced) bits.push(`${S.forced} chosen by the voice`);
    shown.push(`Behind the envelopes: ${andList(bits)}.`);
  }
  const titles = titlesFor(L, names, c.seed, act);
  const next = act < acts.length ? acts[act] : null;
  const teaser = next ? `Next time, Act ${ROMAN[act] || act + 1}: ${next.name}. ${next.tag || ''}`.trim()
    : 'Next time: the Ascent. The same roads, harder, and the monsters remember you.';
  const who = andList(names);
  return {
    kicker: `Act ${ROMAN[act - 1] || act} · ${spec.name || 'The road'}`,
    title: `The Legend of ${who || 'the Road'}`,
    icon: 'crown', text: [intro], facts: [...shown, ...titles], teaser,
  };
}
