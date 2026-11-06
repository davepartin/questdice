// T31 measurement handoff (Director, 6 Nov 2026, docs/team/tasks/T31-director-review.md section 5). Measurement only; nothing in the game changes.
//
// The same paired, same-state, same-seed method as tools/t31-rounds.mjs, widened as the Director asked:
//   1. every colour records monster progress AND every hero's health change; regrowth and summoned health are kept apart from direct damage
//   2. by class, act, party size (1, 2, 4, 6), monsters alive (1, 2, 3+), the target's defence (none, guard, armour, Shield Special),
//      with Counterstrike rounds marked; party tables are played with resolveParty (tools/party.mjs's company growth)
//   3. each campaign seed is the independent unit: the numbers are ratios over rounds with a bootstrap over CAMPAIGNS (not rounds),
//      and card use is reported next to outcomes (how often the bot actually used each card)
//   4. every card of the class library at rank I and rank IV, the minimum and the full Dice Card cast, and Charge Card cash-outs at
//      1 to 4 charges, each cast as one more play on top of the bot's real round and scored the same way; unused charges at the end
//
//   node tools/t31-rounds2.mjs [solo campaigns a class = 3] [party sizes = 2,4] [party companies a size = 2]
//   env: AMT=3 (the bonus), CLASSES=knight,ranger,..., ACTS=2 (party acts), OUT=file.json (all the numbers), CARDS=0 (skip card probes), EVERY=1 (probe every Nth round)
import fs from 'node:fs';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs, botCamp, fight } from './sim.mjs';
applyRelease();
const AMT = +(process.env.AMT || 3);
const SOLO_C = +(process.argv[2] || 3);
const SIZES = (process.argv[3] ?? '2,4').split(',').filter(Boolean).map(Number);
const PARTY_C = +(process.argv[4] || 2);
const CLASSES = (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',');
const PARTY_ACTS = +(process.env.ACTS || 2);
const EVERY = +(process.env.EVERY || 1);
const CARDS = process.env.CARDS !== '0';
const KINDS = ['atk', 'pierce', 'splash', 'block', 'heal'];
const ROMAN = ['I', 'II', 'III'];

// ---------------------------------------------------------------- the store: group -> campaign -> metric -> {sum, count}
const STORE = new Map();
function rec(camp, groups, metrics) {
  for (const g of groups) {
    let gm = STORE.get(g); if (!gm) STORE.set(g, gm = new Map());
    let cm = gm.get(camp); if (!cm) gm.set(camp, cm = new Map());
    for (const [k, v] of Object.entries(metrics)) { const e = cm.get(k); if (e) { e.s += v; e.n++; } else cm.set(k, { s: v, n: 1 }); }
  }
}
const brng = E.makeRng(31);
// ratio of sums over rounds, with a bootstrap over campaigns
function est(group, key, B = 300) {
  const gm = STORE.get(group); if (!gm) return null;
  const cl = [...gm.values()].map((m) => m.get(key)).filter(Boolean); if (!cl.length) return null;
  const ratio = (xs) => { let s = 0, n = 0; for (const x of xs) { s += x.s; n += x.n; } return n ? s / n : 0; };
  const m = ratio(cl); const rs = [];
  for (let i = 0; i < B; i++) { const pick = []; for (let j = 0; j < cl.length; j++) pick.push(cl[Math.floor(brng() * cl.length)]); rs.push(ratio(pick)); }
  rs.sort((a, b) => a - b);
  return { m, lo: rs[Math.floor(B * 0.025)], hi: rs[Math.ceil(B * 0.975) - 1], n: cl.reduce((t, x) => t + x.n, 0), campaigns: cl.length };
}

// ---------------------------------------------------------------- one paired measurement
const copy = (b) => { const r = b.rng; delete b.rng; const c = structuredClone(b); b.rng = r; return c; };
const sumHp = (list) => list.reduce((t, e) => t + Math.max(0, e.hp), 0);
function measure(c, run, seed, uids, mon0) {
  c.rng = E.makeRng(seed);
  const rep = run(c);
  const orig = c.enemies.filter((e) => uids.has(e.uid));
  const regrown = (rep?.specials || []).reduce((t, r) => { const m = /regrew (\d+)/.exec(r.line || ''); return t + (m ? +m[1] : 0); }, 0);
  const heroes = c.fighters ? c.fighters.map((f) => Math.max(0, f.hp)) : [Math.max(0, c.hp)];
  return { direct: mon0 - sumHp(orig) + regrown, regrown, summon: sumHp(c.enemies.filter((e) => !uids.has(e.uid))), hero: heroes.reduce((a, v) => a + v, 0) };
}
function defenceOf(e) {
  if (!e) return 'none';
  const sp = e.special; if (sp && sp.id === 'shield' && !sp.broken) return 'Shield Special';
  if (e.armor) return 'armour';
  if (['guard', 'ward'].includes(e.intent?.v)) return 'guard';
  return 'none';
}
const foesOf = (n) => (n >= 3 ? '3+' : String(n));
const fx = (d, base) => ({ dir: (d.direct - base.direct) / AMT, reg: (d.regrown - base.regrown) / AMT, sum: (d.summon - base.summon) / AMT, hero: (d.hero - base.hero) / AMT });

// card probes: one more cast of a library card, on top of the bot's round (same state, same dice)
function cardProbes(b, run, seed, uids, mon0, base, camp, groups, focal) {
  const hero0 = b.fighters ? b.fighters[focal].hero : b.hero;
  const lib = D.CLASSES[hero0.cls].cards.filter((k) => (k.unlock ?? 1) <= hero0.level && !k.frogLoad && !k.frogNeed && k.kind !== 'luck');
  for (const k of lib) for (const rank of [0, 3]) {
    if (rank > E.powerLevelsOf(hero0)) continue;
    const casts = [];
    if (k.kind === 'scale') { const full = E.scaleMax(k, rank); casts.push({ tag: 'min', x: k.cost }); if (full > k.cost) casts.push({ tag: 'full', x: full }); }
    else if (k.kind === 'charge') for (let n = 1; n <= k.max; n++) casts.push({ tag: `use${n}`, n });
    else casts.push({ tag: 'cast' });
    for (const cs of casts) {
      const c = copy(b); if (c.fighters) { c.active = focal; E.focusFighter(c, focal); }
      const h = c.hero; h.learned = [...new Set([...(h.learned || []), k.id])]; h.powerLevel = { ...(h.powerLevel || {}), [k.id]: rank };
      if (!E.equipPower(h, k.id)) continue;
      c.magic = 99; c.usedRound = {}; c.used = {}; c.charge = { ...(c.charge || {}) }; c.rng = E.makeRng((seed ^ 0x5bd1e995) >>> 0); // the card's own dice come from their own stream, so the resolve below still matches the base
      let out;
      if (k.kind === 'charge') { c.charge[k.id] = cs.n; out = E.castPower(c, k.id, { release: true }); }
      else out = E.castPower(c, k.id, k.kind === 'scale' ? { x: cs.x } : {});
      if (!out) continue;
      if (c.fighters) E.commitFighter(c);
      const cost = k.kind === 'charge' ? cs.n * k.cost : (out.cost ?? k.cost);
      const d = fx(measure(c, run, seed, uids, mon0), base); const per = (d.dir + d.hero) * AMT / Math.max(1, cost); // hero/direct are per-AMT already; undo
      rec(camp, groups, { [`card:${k.id}:r${rank + 1}:${cs.tag}:dir`]: d.dir * AMT, [`card:${k.id}:r${rank + 1}:${cs.tag}:hero`]: d.hero * AMT, [`card:${k.id}:r${rank + 1}:${cs.tag}:perMagic`]: per, [`card:${k.id}:r${rank + 1}:${cs.tag}:cost`]: cost });
    }
  }
}

// the probe for one resolved round. run(c) resolves a copy; heroes is the list of fighters (party) or [the hero]
function probe(b, run, camp, base, ctx, rng, party) {
  const seed = Math.floor(rng() * 1e9); const uids = new Set(b.enemies.map((e) => e.uid)); const mon0 = sumHp(b.enemies);
  const alive = b.enemies.filter((e) => e.hp > 0).length;
  const baseC = copy(b); const B0 = measure(baseC, run, seed, uids, mon0);
  const focal = party ? ctx.focal : 0;
  const tgt = b.enemies[party ? b.fighters[focal].target : ctx.target];
  const groups = [`${ctx.tag}|all`, `${ctx.tag}|foes:${foesOf(alive)}`, `${ctx.tag}|def:${defenceOf(tgt)}`, `${ctx.tag}|act:${ctx.act}`, `${ctx.tag}|kind:${ctx.kind}`, `${ctx.tag}|class:${ctx.cls}`];
  if (ctx.riposte) groups.push(`${ctx.tag}|counterstrike`);
  const metrics = { rounds: 1, 'base.dir': B0.direct, 'base.hero': B0.hero };
  for (const k of KINDS) {
    const c = copy(b); const f = party ? c.fighters[focal] : c; f.mods = { ...(f.mods || {}) }; f.mods[k] = (f.mods[k] || 0) + AMT;
    const d = fx(measure(c, run, seed, uids, mon0), B0);
    metrics[`${k}.dir`] = d.dir; metrics[`${k}.reg`] = d.reg; metrics[`${k}.sum`] = d.sum; metrics[`${k}.hero`] = d.hero;
  }
  rec(camp, groups, metrics);
  if (CARDS) cardProbes(b, run, seed, uids, mon0, B0, camp, [`${ctx.tag}|all`, `${ctx.tag}|class:${ctx.cls}`], focal);
}

// ---------------------------------------------------------------- solo campaigns (real bot heroes, Acts I to III)
let t0 = Date.now(); const log = (s) => process.stderr.write(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}\n`);
let round = 0;
for (const cls of CLASSES) for (let s = 0; s < SOLO_C; s++) {
  const camp = `solo:${cls}#${s}`; const rng = E.makeRng(9100 + s); const hero = E.newHero({ name: 'Real', cls, seed: 9100 + s });
  for (let i = 0; i < D.QUESTS_PER_ACT * 3 + 6 && hero.campaign.act <= 3; i++) {
    const quest = E.questsFor(hero)[0]; if (!quest) break; let b = null;
    for (let t = 0; t < 4 && b?.outcome !== 'victory'; t++) {
      b = E.newBattle(hero, quest, rng, 1); let g = 0; let prevUsed = {};
      while (!b.outcome && g++ < 60) {
        E.startRoll(b); botShape(b, rng); const opts = smartActs(b);
        if (t === 0) {
          const act = ROMAN[(b.quest?.act || hero.campaign.act) - 1] || 'III';
          if (round++ % EVERY === 0) probe(b, (c) => E.resolve(c, opts), camp, null, { tag: 'solo', cls, act, kind: quest.kind, target: opts.target, riposte: !!b.riposte }, rng, false);
          // card use: did the bot use this card this round (or, for a once-a-battle power, this battle's first time)
          const use = {}; for (const k of E.cardsOf(hero)) use[`use:${k.id}`] = (b.usedRound?.[k.id] || b.usedRound?.[`${k.id}:release`] || (b.used?.[k.id] && !prevUsed[k.id])) ? 1 : 0;
          rec(camp, [`solo|class:${cls}`], use); prevUsed = { ...(b.used || {}) };
        }
        E.resolve(b, opts);
      }
      if (t === 0) { const left = {}; for (const k of E.cardsOf(hero)) if (k.kind === 'charge') left[`left:${k.id}`] = b.charge?.[k.id] || 0; rec(camp, [`solo|class:${cls}`], { fights: 1, ...left }); }
    }
    if (b.outcome !== 'victory') break;
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); E.advanceCampaign(hero); botCamp(hero, rng);
  }
  log(`solo ${cls} #${s} done, ${round} rounds probed`);
}

// ---------------------------------------------------------------- party companies (tools/party.mjs's growth: the table fights each step, then every hero grows alone)
const ALL = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
function teamFight(heroes, quest, rng, camp, size, act) {
  const clones = heroes.map((h) => structuredClone(h));
  const b = E.newPartyBattle(clones, quest, rng); let turn = 0;
  for (let guard = 0; guard < 60 && !b.outcome; guard++) {
    for (let i = 0; i < b.fighters.length; i++) {
      if (!E.startFighter(b, i)) continue; botShape(b, rng);
      const o = smartActs(b); E.commitFighter(b); const f = b.fighters[i]; f.target = o.target; f.straight = o.straight; f.locked = true;
    }
    const living = b.fighters.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);
    if (living.length && round++ % EVERY === 0) { const focal = living[turn++ % living.length]; probe(b, (c) => E.resolveParty(c), camp, null, { tag: `party${size}`, cls: b.fighters[focal].hero.cls, act, kind: quest.kind, focal, riposte: false }, rng, true); }
    E.resolveParty(b);
    for (const f of b.fighters) f.locked = false;
  }
  return b;
}
for (const size of SIZES) for (let run = 0; run < PARTY_C; run++) {
  const camp = `party${size}#${run}`; const rng = E.makeRng(1000 * run + 17 + size);
  const heroes = Array.from({ length: size }, (_, i) => { const h = E.newHero({ name: `${ALL[(run + i) % 5]}${i}`, cls: ALL[(run + i) % 5], seed: 97 * run + 13 * size + i }); h.difficulty = 'normal'; return h; });
  for (let n = 0; n < D.QUESTS_PER_ACT * PARTY_ACTS; n++) {
    const quest = E.questsFor(heroes[0])[0]; const act = ROMAN[heroes[0].campaign.act - 1] || 'III';
    teamFight(heroes, quest, E.makeRng(1000 * run + 17 + size + 7919 * (n + 1)), camp, size, act);
    for (const h of heroes) {
      const q = E.questsFor(h)[0]; let b = fight(h, q, rng); let tries = 1;
      while (b.outcome !== 'victory' && tries++ < 4) b = fight(h, q, rng);
      if (b.outcome === 'victory') { const r = E.battleRewards(b); h.gold += r.gold; E.gainXp(h, r.xp); }
      E.advanceCampaign(h); botCamp(h, rng);
    }
  }
  log(`party ${size} company ${run} done, ${round} rounds probed`);
}

// ---------------------------------------------------------------- the report
const f2 = (x) => (x == null ? '' : x.toFixed(2));
const cell = (e) => (e ? `${f2(e.m)} (${f2(e.lo)} to ${f2(e.hi)})` : '–');
const out = []; const say = (t = '') => out.push(t);
const GROUP_ORDER = (tag) => ['all', 'foes:1', 'foes:2', 'foes:3+', 'def:none', 'def:guard', 'def:armour', 'def:Shield Special', 'act:I', 'act:II', 'act:III', 'kind:battle', 'kind:elite', 'kind:boss', ...CLASSES.map((c) => `class:${c}`), 'counterstrike'].map((g) => `${tag}|${g}`).filter((g) => STORE.has(g));
function colourTable(tag, title) {
  const groups = GROUP_ORDER(tag); if (!groups.length) return;
  say(`### ${title}`); say();
  say('One point of each colour, per round, 95% bootstrap over campaigns in brackets. First table: monster health removed (direct damage; regrowth added back). Second table: change in every hero\'s health at the table, summed (the monsters you hurt or kill hit you less; block and heal count here).'); say();
  say('| Group | Campaigns | Rounds | Red: monster | Orange: monster | Pink: monster |'); say('|---|---|---|---|---|---|');
  for (const g of groups) { const r = est(g, 'rounds'); const mon = (k) => est(g, `${k}.dir`); say(`| ${g.split('|')[1]} | ${r.campaigns} | ${r.n} | ${cell(mon('atk'))} | ${cell(mon('pierce'))} | ${cell(mon('splash'))} |`); }
  say();
  say('| Group | Red: hero health | Orange: hero health | Pink: hero health | Blue: hero health | Green: hero health |'); say('|---|---|---|---|---|---|');
  for (const g of groups) { const h = (k) => est(g, `${k}.hero`); say(`| ${g.split('|')[1]} | ${cell(h('atk'))} | ${cell(h('pierce'))} | ${cell(h('splash'))} | ${cell(h('block'))} | ${cell(h('heal'))} |`); }
  say();
  say('Side effects, all rounds: one point\'s change in summoned health and in monster regrowth (negative: the point prevents it).'); say();
  say('| Colour | Summoned health | Regrowth |'); say('|---|---|---|');
  for (const k of KINDS) { const g = `${tag}|all`; say(`| ${k} | ${cell(est(g, `${k}.sum`))} | ${cell(est(g, `${k}.reg`))} |`); }
  say();
}
say(`# T31 measurement: the Director's handoff (generated by tools/t31-rounds2.mjs)`); say();
say(`Bonus per probe: +${AMT}. Solo: ${CLASSES.join(', ')}, ${SOLO_C} bot campaigns each (Acts I to III). Party: ${SIZES.map((s) => `${s} heroes`).join(', ') || 'none'}, ${PARTY_C} companies each (${PARTY_ACTS} acts). Each round is probed once on its first try; every probe plays the round again from a copy, same dice, with one change. Chrome is not involved; this is the engine only.`); say();
colourTable('solo', 'Solo, party size 1');
for (const s of SIZES) colourTable(`party${s}`, `Party of ${s} (the probe adds the points to one hero, rotating; health is every hero summed)`);

// cards
const tags = ['solo', ...SIZES.map((s) => `party${s}`)].filter((t) => STORE.has(`${t}|all`));
say('### Cards: one more play on top of the bot\'s real round'); say();
say('Each card of the class library (the ones the hero has unlocked) is cast as one extra play in the probed state, at rank I and rank IV, the minimum and the full Dice Card cast, and a Charge Card cashed out at 1 to 4 charges. Score = monster health removed + hero health gained, per magic (a charge cash-out counts the magic paid over the rounds it took to store). A Dice Card, rank IV, full cast pays more magic and gets more dice.'); say();
for (const tag of tags) {
  say(`#### ${tag === 'solo' ? 'Solo' : `Party of ${tag.slice(5)}`}`); say();
  say('| Class | Card | Cast | Rank I swing / magic | Rank IV swing / magic | Rank I: monster + hero | Rank IV: monster + hero | Rounds |'); say('|---|---|---|---|---|---|---|---|');
  for (const cls of CLASSES) { const g = `${tag}|class:${cls}`; if (!STORE.has(g)) continue;
    for (const k of D.CLASSES[cls].cards) {
      const casts = k.kind === 'scale' ? ['min', 'full'] : k.kind === 'charge' ? Array.from({ length: k.max }, (_, i) => `use${i + 1}`) : ['cast'];
      for (const cs of casts) { const a = est(g, `card:${k.id}:r1:${cs}:perMagic`), z = est(g, `card:${k.id}:r4:${cs}:perMagic`); if (!a && !z) continue;
        const d = (r) => { const m = est(g, `card:${k.id}:${r}:${cs}:dir`); const h = est(g, `card:${k.id}:${r}:${cs}:hero`); return m || h ? `${f2(m?.m)} + ${f2(h?.m)}` : '–'; };
        say(`| ${cls} | ${k.name} | ${cs} | ${cell(a)} | ${cell(z)} | ${d('r1')} | ${d('r4')} | ${(a || z).n} |`); } } }
  say();
}

// card use and unused charges (solo only)
if (STORE.has('solo|all')) {
say('### Card use: how often the bot actually used each card (solo)'); say();
say('For each equipped card: the share of probed rounds in which it was used (a once-a-battle power: the round it was first used). Equipped cards only; a card the bot never equips shows nothing.'); say();
say('| Class | Card | Used in this share of rounds | Rounds | Campaigns |'); say('|---|---|---|---|---|');
for (const cls of CLASSES) { const g = `solo|class:${cls}`; for (const k of D.CLASSES[cls].cards) { const e = est(g, `use:${k.id}`); if (e) say(`| ${cls} | ${k.name} | ${(100 * e.m).toFixed(0)}% (${(100 * e.lo).toFixed(0)} to ${(100 * e.hi).toFixed(0)}) | ${e.n} | ${e.campaigns} |`); } }
say();
say('Charge Cards: charges still stored when the fight ended (solo, first try of each fight).'); say();
say('| Class | Card | Charges left at the end of a fight | Fights |'); say('|---|---|---|---|');
for (const cls of CLASSES) { const g = `solo|class:${cls}`; for (const k of D.CLASSES[cls].cards) { if (k.kind !== 'charge') continue; const e = est(g, `left:${k.id}`); if (e) say(`| ${cls} | ${k.name} | ${cell(e)} | ${e.n} |`); } }
say();
}
say('Campaign sizes are small on purpose (the cloud computer is slow); each cell\'s bracket is the honest uncertainty. A bracket that crosses a neighbour\'s means the two are not told apart. These are measurements of one extra play in real states, not whole-fight results; whole-fight matches are still the test for any price change.');
process.stdout.write(out.join('\n') + '\n');
if (process.env.OUT) { const o = {}; for (const [g, gm] of STORE) { o[g] = {}; const keys = new Set([...gm.values()].flatMap((m) => [...m.keys()])); for (const k of keys) { const e = est(g, k, 100); if (e) o[g][k] = e; } } fs.writeFileSync(process.env.OUT, JSON.stringify(o, null, 1)); }
log('done');
