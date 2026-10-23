// Team games (Dave, Oct 2026: "our first two-player game was very easy"). Pairs of heroes grow along a campaign side by side;
// at every step each fights that step's quest alone, and then the pair fights it together at a table (newPartyBattle, PARTY
// scaling), with the smart bot playing every hero's dice. Prints solo vs team win rate, rounds and health left, by act.
//   node tools/party.mjs [acts=2] [runs=2] [heroes=2]        SKILL=hard for another difficulty, PACK=starfall for a writer's campaign
//   PLAY=first   every hero takes its first roll and locks in on the first monster (the lazy player), solo and team alike
//   MIX=1        the last hero is a fresh level-1 hero who joins at the start of Act II (a veteran with a beginner)
import fs from 'node:fs';
import { CAST_HOOK, isDamageIntent, equipPower, nudge, castPower, makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newPartyBattle, startFighter, commitFighter, resolveParty, withDifficulty } from '../js/engine.js';
import { fight, botCamp, botShape, smartActs } from './sim.mjs';
import { QUESTS_PER_ACT, PARTY, NUDGE_COST } from '../js/data.js';
if (process.env.PARTY_HP) process.env.PARTY_HP.split(',').forEach((v, i) => { if (v) PARTY.hp[i + 1] = Number(v); });
if (process.env.FLAT_PER) for (const k of Object.keys(PARTY.flatBy)) PARTY.flatBy[k] = Number(process.env.FLAT_PER); // FLAT_PER=16: hit power per extra hero
if (process.env.PARTY_FLAT) process.env.PARTY_FLAT.split(',').forEach((v, i) => { if (v) PARTY.flat[i + 1] = Number(v); }); // PARTY_FLAT=4: every hit +4 for two heroes // try other team health: PARTY_HP=2.4 (two heroes), PARTY_HP=2.4,3.2 (two, three)

const ACTS = Number(process.argv[2] || 2); const RUNS = Number(process.argv[3] || 2); const N = Number(process.argv[4] || 2);
const SKILL = process.env.SKILL || 'normal';
// SOFT=hp1.0,adds1,flat8,from6: the six-player experiment, gentler scaling for ordinary battles only (PARTY.ordinary)
if (process.env.SOFT) { const o = { from: 6 }; for (const t of process.env.SOFT.split(',')) { const [, k, v] = t.match(/^([a-z]+)([\d.]+)$/i) || []; if (k === 'hp') o.hpPer = Number(v); else if (k === 'flat') o.flatPer = Number(v); else if (k === 'adds') o.adds = Number(v); else if (k === 'from') o.from = Number(v); } PARTY.ordinary = o; } const TEAMPLAY = !!process.env.TEAMPLAY;
const PAIRS = process.env.PAIRS ? process.env.PAIRS.split(';').map((p) => p.split(',')) : [['wizard', 'bard'], ['knight', 'ranger'], ['dwarf', 'wizard'], ['ranger', 'bard'], ['knight', 'dwarf']]; // PAIRS=ranger,ranger;ranger,knight for other companies
const ALL = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];

// One team fight: each living hero rolls, rerolls and locks in with the smart bot, then the table resolves the round.
function teamFight(heroes, quest, rng) {
  const clones = heroes.map((h) => structuredClone(h));
  if (process.env.BARD_DISCORD) for (const h of clones) if (h.cls === 'bard') { h.learned = [...new Set([...(h.learned || []), 'discord'])]; equipPower(h, 'discord'); } // BARD_DISCORD=1: every Bard carries Discord in its every-round slot
  const b = newPartyBattle(clones, quest, rng); b._real = true; // the support count listens to this table only
  for (let guard = 0; guard < 60 && !b.outcome; guard++) {
    for (let i = 0; i < b.fighters.length; i++) {
      if (!startFighter(b, i)) continue;
      const lazy = process.env.PLAY === 'first';
      if (!lazy) botShape(b, rng);
      // TEAMPLAY=1: players who use the teamwork rules on purpose. A Knight with Shield Up steps in front when a friend is worse off
      // and it is itself above half health; a hero joins a friend who locked in with the same heart (or turns its heart by one to
      // match, if it can pay), on that friend's monster. Without it the bots are the plain smart player (hearts match by chance).
      const me = b.fighters[i]; const ratio = (x) => x.hp / x.maxHp; let join = null;
      if (TEAMPLAY && !lazy) {
        const mates = b.fighters.filter((x, k) => k !== i && x.hp > 0);
        if (me.hero.cls === 'knight' && ratio(me) > 0.5 && mates.some((x) => ratio(x) < ratio(me))) castPower(b, 'shieldwall');
        const locked = mates.filter((x) => x.locked && x.board && b.enemies[x.target]?.hp > 0); const v = b.board.C?.v;
        const same = locked.find((x) => x.board.C.v === v);
        if (same) join = same.target;
        else { const near = locked.find((x) => Math.abs(x.board.C.v - v) === 1); if (near && b.magic >= NUDGE_COST + 1 && nudge(b, near.board.C.v > v ? 1 : -1)) join = near.target; }
      }
      const o = lazy ? { target: b.enemies.findIndex((e) => e.hp > 0), straight: 'atk' } : smartActs(b); if (join != null) o.target = join; commitFighter(b);
      const f = b.fighters[i]; f.target = o.target; f.straight = o.straight; f.locked = true;
    }
    resolveParty(b); tally(b);
    for (const f of b.fighters) { f.locked = false; f._low = Math.min(f._low ?? 1, Math.max(0, f.hp) / f.maxHp); if (f.hp <= 0) f._fell = 1; }
  }
  return b;
}
// what the bots actually did with the teamwork rules, by company size (ChatGPT: "check that the party uses the new teamwork abilities")
const USE = {}; const CAMP = {}; // each company is one independent campaign
// Support, per hero (ChatGPT: "report Bard's full support contribution, not healing alone"). Each real cast at a table is counted
// for its caster: a verse sung for a friend, and Discord (every monster hits 2 softer: up to 2 x the monsters about to hit, each round).
const SUP = {}; const supOf = (cls) => (SUP[cls] ||= { n: 0, verse: 0, discord: 0, discordUpTo: 0, potions: 0, magic: 0, revives: 0, triples: 0, h2h: 0, heal: 0 });
CAST_HOOK.on = (b, out) => {
  if (!Array.isArray(b?.fighters) || !b._real) return; const f = b.fighters[b.active]; if (!f) return; const c = supOf(f.hero.cls);
  if (out.to != null) c.verse++;
  if (out.id === 'discord') { c.discord++; c.discordUpTo += 2 * b.enemies.filter((e) => e.hp > 0 && e.intent && isDamageIntent(e.intent)).length; }
};
function tally(b) {
  const r = b.report; if (!r) return; const faces = r.heartFaces || []; const u = (USE[b.fighters.length] ||= { rounds: 0, heroRounds: 0, h2h: 0, focus: 0, guard: 0, verse: 0, verseHeal: 0 });
  u.rounds++; u.heroRounds += faces.length; u.h2h += (r.hearts || []).reduce((a, g) => a + g.names.length, 0);
  const on = {}; for (const x of faces) if (x.uid) on[x.uid] = (on[x.uid] || 0) + 1; u.focus += Math.max(0, ...Object.values(on));
  if (r.leaderWhy === 'guard') u.guard++; u.verse += (r.verses || []).length; u.verseHeal += (r.verses || []).reduce((a, v) => a + v.n, 0);
  const clsOf = (name) => b.fighters.find((f) => f.hero.name === name)?.hero.cls;
  for (const t of r.team || []) for (const n of t.names || []) { const c = clsOf(n); if (c) supOf(c).triples++; }
  for (const g of r.hearts || []) for (const n of g.names) { const c = clsOf(n); if (c) supOf(c).h2h++; }
  for (const f of b.fighters) if (f.hero.name === r.leader) { f._lead = (f._lead || 0) + 1; if (r.leaderWhy === 'guard') f._guard = (f._guard || 0) + 1; }
}
const acts = {}; const key = (a, k) => `${a}|${k}`; const byClass = {}; // each class at the table: its own lowest health, its friend's, the damage it took and the healing it gave friends
const mAt = []; // the company's strength factor, by act
const add = (a, kind, mode, won, rounds, hpk) => { const r = (acts[key(a, kind)] ||= { a, kind, solo: { n: 0, w: 0, r: 0, h: 0 }, team: { n: 0, w: 0, r: 0, h: 0 } })[mode]; r.n++; r.w += won ? 1 : 0; r.r += rounds; r.h += hpk; };
for (let run = 0; run < RUNS; run++) {
  for (const [p, pair0] of PAIRS.entries()) {
    const pair = process.env.PAIRS || N === 2 ? pair0 : Array.from({ length: N }, (_, i) => ALL[(p + i) % ALL.length]);
    const rng = makeRng(1000 * run + 17 * p + 3);
    const heroes = pair.map((cls, i) => { const h = newHero({ name: `${cls}${i}`, cls, seed: 97 * run + 13 * p + i, pack: process.env.PACK || undefined }); h.difficulty = SKILL; return h; });
    for (let n = 0; n < QUESTS_PER_ACT * ACTS; n++) {
      if (process.env.MIX && n === QUESTS_PER_ACT) { const last = heroes.length - 1; const old = heroes[last]; const kid = newHero({ name: `${old.cls}new`, cls: old.cls, seed: 991 + p }); kid.difficulty = SKILL; kid.campaign = structuredClone(heroes[0].campaign); heroes[last] = kid; }
      const quest = questsFor(heroes[0])[0]; const act = heroes[0].campaign.act;
      // the team, against this step's quest
      const tb = teamFight(heroes, quest, makeRng(1000 * run + 17 * p + 3 + 7919 * (n + 1))); // its own seed per step: arms that change only the table fight stay matched (mAt[act] ||= []).push(tb.team?.m || 0);
      const alive = tb.fighters.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / tb.fighters.length;
      add(act, quest.kind, 'team', tb.outcome === 'victory', tb.round, tb.outcome === 'victory' ? alive : 0);
      { const c = (CAMP[`${run}|${p}`] ||= { bw: 0, bn: 0, xw: 0, xn: 0, falls: 0, heroFights: 0, hpLeft: 0, bossW: 0, bossN: 0, eliteW: 0, eliteN: 0, rounds: 0 }); const won = tb.outcome === 'victory' ? 1 : 0;
        if (quest.kind === 'boss' && act === 3) { c.xn++; c.xw += won; }
        if (quest.kind === 'boss') { c.bossN++; c.bossW += won; } else if (quest.kind === 'elite') { c.eliteN++; c.eliteW += won; }
        else if (quest.kind === 'battle') { c.bn++; c.bw += won; c.rounds += tb.round; c.heroFights += tb.fighters.length; c.falls += tb.fighters.filter((f) => f._fell).length; c.hpLeft += won ? tb.fighters.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / tb.fighters.length : 0; } }
      tb.fighters.forEach((f, i) => { const mate = tb.fighters.filter((x) => x !== f); const c = (byClass[f.hero.cls] ||= { n: 0, low: 0, fell: 0, taken: 0, given: 0, mateLow: 0, mateFell: 0, share: 0, blockShare: 0 }); const teamDealt = tb.fighters.reduce((a, x) => a + (x.stats.dealt || 0), 0); const teamBlocked = tb.fighters.reduce((a, x) => a + (x.stats.blocked || 0), 0);
        c.n++; c.share += teamDealt ? (f.stats.dealt || 0) / teamDealt : 0; c.blockShare += teamBlocked ? (f.stats.blocked || 0) / teamBlocked : 0; c.low += f._low ?? 1; c.fell += f._fell || 0; c.taken += f.stats.taken || 0; c.given += f.stats.healGiven || 0; c.lead = (c.lead || 0) + (f._lead || 0); c.guard = (c.guard || 0) + (f._guard || 0);
        { const u = supOf(f.hero.cls); u.n++; u.potions += f.stats.potionsThrown || 0; u.magic += f.stats.shares || 0; u.revives += f.stats.revives || 0; u.heal += f.stats.healGiven || 0; }
        c.mateLow += mate.reduce((a, x) => a + (x._low ?? 1), 0) / Math.max(1, mate.length); c.mateFell += mate.reduce((a, x) => a + (x._fell || 0), 0) / Math.max(1, mate.length); void i; });
      // each hero alone (the way the solo campaign grows them)
      for (const h of heroes) {
        const q = questsFor(h)[0];
        let b = fight(h, q, rng); let tries = 1;
        add(act, q.kind, 'solo', b.outcome === 'victory', b.round, b.outcome === 'victory' ? b.hp / b.maxHp : 0);
        while (b.outcome !== 'victory' && tries++ < 4) b = fight(h, q, rng);
        if (b.outcome === 'victory') { const r = battleRewards(b); h.gold += r.gold; gainXp(h, r.xp); }
        advanceCampaign(h); botCamp(h, rng);
      }
    }
  }
}
void withDifficulty;
const pct = (x) => `${Math.round(100 * x)}%`.padStart(5);
console.log(`${PARTY.ordinary ? `SOFT ${JSON.stringify(PARTY.ordinary)} · ` : ''}${process.env.PLAY || 'smart'} play${TEAMPLAY ? ' using the teamwork rules on purpose (TEAMPLAY)' : ''}${process.env.MIX ? ', a beginner joins in Act II' : ''} · company strength by act ${mAt.map((a, i) => (a ? `${i}: x${(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2)}` : '')).filter(Boolean).join(' ')} · ${SKILL}, ${[...new Set(PAIRS.map((p) => p.length))].join(" or ")} heroes, ${RUNS * PAIRS.length} companies: win rate (first try) · rounds · health left when won`);
console.log('act kind      solo: win  rnds  hp     n      team: win  rnds  hp     n   (n: fights; team wins ± one standard error)');
for (const r of Object.values(acts).sort((x, y) => x.a - y.a || x.kind.localeCompare(y.kind))) {
  const s = r.solo; const t = r.team;
  console.log(`${r.a}   ${r.kind.padEnd(7)}   ${pct(s.w / s.n)}  ${(s.r / s.n).toFixed(1).padStart(4)}  ${pct(s.h / Math.max(1, s.w))}  ${String(s.n).padStart(4)}      ${pct(t.w / t.n)}  ${(t.r / t.n).toFixed(1).padStart(4)}  ${pct(t.h / Math.max(1, t.w))}  ${String(t.n).padStart(4)}  ±${Math.round(100 * Math.sqrt((t.w / t.n) * (1 - t.w / t.n) / t.n))}%`);
}
console.log(`\nBy class at the table${process.env.CLASSID ? ` · class identity ${process.env.CLASSID}` : ''}${process.env.RELEASE ? ' · the released rules' : ''}: hero-fights · lowest health in a fight · fell · damage taken · healing given to friends · the friend's lowest health · the friend fell · share of the team's damage · share of the team's block (a fair share is 1 / heroes) · rounds a fight taking the double share (of them by Shield Up). Every number is per hero: two heroes of one class each count separately.`);
for (const [cls, c] of Object.entries(byClass)) console.log(`${cls.padEnd(7)} ${String(c.n).padStart(5)}  ${pct(c.low / c.n)}  ${pct(c.fell / c.n)}  ${(c.taken / c.n).toFixed(1).padStart(5)}  ${(c.given / c.n).toFixed(1).padStart(5)}     ${pct(c.mateLow / c.n)}  ${pct(c.mateFell / c.n)}   ${pct(c.share / c.n)}  ${pct(c.blockShare / c.n)}   ${((c.lead || 0) / c.n).toFixed(1).padStart(4)} (${((c.guard || 0) / c.n).toFixed(1)})`);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ soft: PARTY.ordinary, camps: CAMP, support: SUP }));
console.log('\nSupport each hero gave, a fight (per hero: two of a class each count): healing to friends · verses sung for a friend · Discord casts (damage it could soften for the table, at most) · potions thrown · magic shared · revives · team triples joined · Heart to Heart groups joined · double-share rounds taken (from the table above)');
for (const [cls, u] of Object.entries(SUP)) { if (!u.n) continue; const k = (x) => (x / u.n).toFixed(2); console.log(`${cls.padEnd(7)} heal ${k(u.heal).padStart(5)} · verses ${k(u.verse)} · Discord ${k(u.discord)} (up to ${k(u.discordUpTo)}) · potions ${k(u.potions)} · magic ${k(u.magic)} · revives ${k(u.revives)} · triples ${k(u.triples)} · H2H ${k(u.h2h)} · double shares ${((byClass[cls]?.lead || 0) / u.n).toFixed(2)}`); }
{ const cs = Object.values(CAMP); const rates = cs.filter((c) => c.bn).map((c) => c.bw / c.bn); const mu = rates.reduce((a, x) => a + x, 0) / rates.length; const se = Math.sqrt(rates.reduce((a, x) => a + (x - mu) ** 2, 0) / Math.max(1, rates.length - 1) / rates.length);
  console.log(`\nIndependent campaigns: ${cs.length}. Team battles won on the first try, per campaign: ${pct(mu)} ± ${Math.round(100 * se)}% (standard error across campaigns). Act III boss, team: ${cs.reduce((a, c) => a + c.xw, 0)} of ${cs.reduce((a, c) => a + c.xn, 0)} won on the first try, in ${cs.filter((c) => c.xn).length} campaigns.`); }
console.log('\nTeamwork the bots used, by company size: hero-rounds in a Heart to Heart group · hero-rounds on the most-chosen monster (focus) · rounds a Knight took the double share by Shield Up · Bard verses sung for a friend a fight, and the healing they gave');
for (const [n, u] of Object.entries(USE)) console.log(`${n} heroes: ${pct(u.h2h / Math.max(1, u.heroRounds))} in Heart to Heart · ${pct(u.focus / Math.max(1, u.heroRounds))} focused · ${pct(u.guard / Math.max(1, u.rounds))} of rounds guarded · ${(u.verse / Math.max(1, u.rounds)).toFixed(2)} verses for a friend a round (${u.verse ? (u.verseHeal / u.verse).toFixed(1) : '-'} healing each) · ${u.rounds} team rounds`);
