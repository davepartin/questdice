// The daily challenge (Dave, Oct 2026: "a reason to play again"). Everyone gets the same day: the same hero of the day (a class, a
// build for the day's act and one charm), the same five fights (the act turns with the days: three of its fights drawn by the day,
// then its elite and its boss), the same dice seed. Your score is the battle points you earn plus 100 for every fight you win and a 250 bonus for clearing all five. Play as
// often as you like; your best counts. Pure logic here; the screens are in ui.js and g3/scrui.js, the leaderboard in cloud.js.
import * as E from './engine.js';
import { keyOf } from './lab.js';
import { CLASSES, CHARMS, CLASS_TALENT } from './data.js';

export const FIGHTS = 5;
export const WIN_BONUS = 100;
export const CLEAR_BONUS = 250;
// the hero of the day, built as a careful player has it around each act's elite
const BUILD = {
  1: { level: 4, hands: 6, talent: 4, head: 4, feet: 4, rarity: 1, size: 4, extra: ['NE'] },
  2: { level: 8, hands: 6, talent: 6, head: 6, feet: 6, rarity: 1, size: 6, extra: ['NE', 'SW', 'SE'] },
  3: { level: 14, hands: 8, talent: 8, head: 8, feet: 8, rarity: 2, size: 8, extra: ['NE', 'SW', 'SE'], rerollDie: true },
};
const pad = (n) => String(n).padStart(2, '0');
// today's key in the player's own time zone, e.g. '2026-10-16'
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayLabel = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); };

// The day's run: who you play, which charm you carry, and the five fights.
export function dailyRun(key = dayKey()) {
  const seed = E.hashSeed('questdice-daily', key);
  const rng = E.makeRng(seed);
  const classes = Object.keys(CLASSES); const cls = classes[Math.floor(rng() * classes.length)];
  const charms = Object.keys(CHARMS); const charm = charms[Math.floor(rng() * charms.length)];
  const act = 1 + (Math.floor(Date.UTC(...key.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) / 864e5) % 3); // the act turns with the days
  const pool = [1, 2, 3, 4, 6, 7, 8, 9]; const pick = []; while (pick.length < 3) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const steps = [...pick, 5, 10].sort((a, b) => a - b); // three of the act's fights, its elite, its boss
  const scratch = E.newHero({ name: 'Day', cls, seed }); scratch.campaign.act = act; scratch.campaign.seed = seed;
  const quests = steps.map((step) => { scratch.campaign.step = step; return E.questsFor(scratch)[0]; });
  return { key, seed, cls, charm, act, steps, quests };
}
// The hero of the day: a mid-road build (as a careful player has around the Act II elite), the same for everyone.
export function dailyHero(run) {
  const B = BUILD[run.act || 2];
  const h = E.newHero({ name: `Today’s ${CLASSES[run.cls].name}`, cls: run.cls, seed: run.seed });
  h.daily = run.key; h.difficulty = 'normal'; h.level = B.level; h.xp = 0; h.pendingPerks = 0;
  h.campaign.act = run.act || 2; h.campaign.step = 5; h.campaign.seed = run.seed;
  h.dice = [...new Set([...(h.dice || ['NW', 'N', 'W', 'C', 'E', 'S']), ...B.extra])];
  h.strength = { W: B.hands, E: B.hands }; h.special = { SW: B.talent, SE: B.talent }; h.mind = { N: B.head }; h.speed = { S: Math.max(B.feet, E.feetSize(h)) };
  for (const k of ['NW', 'NE']) { const w = h.loadout[k]; if (w && w.id !== 'fists') { w.rarity = B.rarity; if (B.size > 4) w.size = B.size; } }
  h.gold = 10000; for (const k of E.cardsOf(h)) E.upgradePower(h, k.id);
  // Talent dice: a careful player has bought symbols by now. Since 26 Oct talent faces start empty (they used to carry the class symbol), so the hero of the day buys them here:
  // 1 face in Act I, 2 in Act II, 4 in Act III on each active talent die, the die's own class symbol first and the other die's after it (at most two of one symbol).
  const talentFaces = { 1: 1, 2: 2, 3: 4 }[run.act || 2]; const own = CLASS_TALENT[run.cls];
  for (const slot of ['SW', 'SE']) { if (!h.dice.includes(slot)) continue; const mine = own[slot]; const other = own[slot === 'SW' ? 'SE' : 'SW'];
    for (let f = 0; f < talentFaces; f++) E.addTalent(h, slot, f, f < 2 ? mine : other); }
  h.gold = 0; // every equipped power at level 1
  if (B.rerollDie) h.rerollDie = true; // a 4th reroll die, as a hero this far has bought
  E.takeCharm(h, run.charm);
  return h;
}
// What a fight is worth: its battle points, plus the win, plus every gold coin earned in it (Dave: the daily has no camp to spend it at,
// so gold counts as points): the gold your dice rolled, and the gold of each monster you felled.
export const goldOf = (b) => Math.max(0, Math.round((b?.goldEarned || 0) + (b?.stolen || 0) + (b?.enemies || []).filter((e) => e.hp <= 0 && !e.fled).reduce((a, e) => a + (e.gold || 0), 0)));
export const fightScore = (b, won) => E.pointsOf(b) + (won ? WIN_BONUS : 0) + goldOf(b);
// Points spent on potions between fights come off the score (Dave, 27 Oct 2026: "maybe you spend points for potions, since daily battles are about points").
export const finalScore = (fights, spent = 0) => Math.max(0, fights.reduce((a, f) => a + f.score, 0) + (fights.length === FIGHTS && fights.every((f) => f.won) ? CLEAR_BONUS : 0) - spent);
// A potion costs 50 points in every act (Dave, 28 Oct 2026; it started at 100 / 150 / 200). Only between fights, only up to the belt (2), and only with the points to pay: the score cannot go below 0.
export const POTION_POINTS = [50, 50, 50];
export const potionCost = (run) => POTION_POINTS[Math.max(1, Math.min(3, run?.act || 2)) - 1];
export function potionShop(d, hero) {
  const have = E.potionStock(hero); const max = E.potionMaxOf(hero); const cost = potionCost(d.run); const points = finalScore(d.fights, d.spent || 0);
  const why = have >= max ? 'Belt full' : points < cost ? `Need ${cost - points} more points` : '';
  return { have, max, cost, points, heal: E.potionHpOf(hero), ok: !why, why };
}
export function buyPotion(d, hero) {
  const s = potionShop(d, hero); if (!s.ok) return false;
  hero.potions = s.have + 1; d.spent = (d.spent || 0) + s.cost; return true;
}

// This phone's record of the days it played: { [key]: { best, tries, cleared, fights } }
const STORE = keyOf('qd.daily'); // the lab and the preview keep their own record (js/lab.js)
const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage blocked: the day is still played */ } };
export const dayRecord = (key = dayKey()) => read()[key] || { best: 0, tries: 0, cleared: false, fights: 0 };
export function recordRun(key, score, fights) {
  const all = read(); const r = all[key] || { best: 0, tries: 0, cleared: false, fights: 0 };
  const won = fights.filter((f) => f.won).length; const isBest = score > r.best;
  all[key] = { best: Math.max(r.best, score), tries: r.tries + 1, cleared: r.cleared || won === FIGHTS, fights: isBest ? won : r.fights };
  for (const k of Object.keys(all).sort().slice(0, -30)) delete all[k]; // keep a month
  write(all); return { ...all[key], isBest };
}
// How many days in a row this phone has played, ending today (or yesterday, so a streak survives until you play today).
export function streak(today = dayKey()) {
  const all = read(); let n = 0; const d = new Date(`${today}T12:00:00`);
  if (!all[today]) d.setDate(d.getDate() - 1);
  while (all[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function shareText(run, score, fights) {
  const marks = Array.from({ length: FIGHTS }, (_, i) => (fights[i] ? (fights[i].won ? (i === FIGHTS - 1 ? '👑' : '⚔️') : '💀') : '▫️')).join('');
  return `QuestDice Daily ${run.key}\n${CLASSES[run.cls].name}${E.charmsResting() ? '' : ` with the ${CHARMS[run.charm].name}`}\n${marks} ${score.toLocaleString()} points\nhttps://davepartin.github.io/questdice/`;
}
