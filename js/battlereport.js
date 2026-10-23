// Battle reports (T10): what actually happened in a fight, kept on this device and shared only when the player chooses.
// Dave plays normally; when a fight feels unfair or confusing he taps "Share battle report" on the victory or defeat screen.
//
// Nothing here changes a rule. The engine calls an optional observer (CAST_HOOK.trace, plus the existing CAST_HOOK.on / .magic) at the
// moments a fight already passes through: a round begins and the monsters' moves are shown, a potion is drunk, a power is cast, the
// round resolves. The observer copies what it is handed; it never draws a random number, changes a number or throws into the game.
//
// What is in a report, and how sure we are:
//   captured     written down at the moment it happened (the moves shown, health, potions, powers, dice, the engine's own round report)
//   derived      worked out afterwards from captured numbers, always inside a `derived` block (the order of the blows, the lethal blow)
//   unavailable  never recorded on this path; the report says so instead of guessing
//
// Privacy: a report is built from a short list of named fields. It never holds a password, a token, a save id or a room code.
// Storage: the latest three reports, each bounded in size, in this browser's own storage and nowhere else (no cloud, no analytics).
import * as E from './engine.js';
import * as D from './data.js';
import { LAB } from './lab.js';

export const REPORT_VERSION = 1;
export const MAX_REPORTS = 3;
export const MAX_REPORT_CHARS = 40000; // one stored report, as JSON
const KEY = LAB ? 'questdice.lab.battlereports' : 'questdice.battlereports';
export const BUILD = (() => { try { return new URL(import.meta.url).searchParams.get('v') || 'dev'; } catch { return 'dev'; } })();

const ROLE_WORD = { N: 'head', W: 'left hand', E: 'right hand', S: 'feet', C: 'heart', NW: 'left weapon', NE: 'right weapon', SW: 'left talent', SE: 'right talent', P: 'pet' };
const slotName = (s) => ROLE_WORD[s] || s;
const MODE_WORD = { solo: 'solo', 'shared-phone': 'shared phone', online: 'online table' };
const ACT_WORD = ['', 'I', 'II', 'III'];

// ------------------------------------------------------------------------------------------------ small helpers
const num = (v) => (Number.isFinite(v) ? v : 0);
const plain = (v) => JSON.parse(JSON.stringify(v ?? null));
const weaponName = (id) => D.WEAPONS?.[id]?.name || id || 'weapon';
const nonZero = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => typeof v === 'number' && v !== 0));
const diceFrom = (hero, board) => Object.entries(board || {}).filter(([s, d]) => d && typeof d === 'object' && Number.isFinite(d.v) && (!E.isActive || E.isActive(hero, s)))
  .map(([slot, d]) => ({ slot, role: slotName(slot), sides: E.sidesOf(hero, slot), v: d.v, ...(d.bound ? { bound: true } : {}), ...(d.chained ? { chained: true } : {}), ...(d.hushed ? { hushed: true } : {}) }));

// What a hero brings to the fight, from the hero and the battle as they stand when it begins.
function heroFacts(hero, f) {
  const c = hero.campaign || {};
  const slots = Object.keys(D.ROLE || {}).filter((s) => (E.isActive ? E.isActive(hero, s) : true));
  const power = (card) => ({ id: card.id, name: card.name, kind: card.kind, level: E.powerLevel(hero, card.id) });
  return {
    name: hero.name, cls: hero.cls, classLabel: D.CLASSES?.[hero.cls]?.name || hero.cls, level: hero.level,
    maxHealth: f.maxHp, startHealth: f.hp, startMagic: f.magic,
    potions: { have: E.potionsLeft(f), heals: E.potionHpOf(hero) },
    diceSides: Object.fromEntries(slots.map((s) => [s, E.sidesOf(hero, s)])),
    weapons: Object.entries(hero.loadout || {}).filter(([, w]) => w && !w.twin).map(([slot, w]) => ({ slot: slotName(slot), id: w.id, name: weaponName(w.id), rarity: w.rarity ?? 0 })),
    talents: plain(hero.talent),
    powers: E.cardsOf(hero).map(power),
    perks: (hero.perks || []).map((id) => ({ id, name: D.PERKS?.[id]?.name || id })),
    charms: (E.charmsOf ? E.charmsOf(hero) : []).map((id) => ({ id, name: D.CHARMS?.[id]?.name || id })),
    roadEffects: (c.blessings || []).filter((bl) => (bl.fights ?? 1) > 0 && (!bl.who || bl.who === hero.name)).map((bl) => ({ name: bl.name, text: bl.text })),
    roadNumbers: nonZero(f.boon),
  };
}
const enemyFacts = (e, idx, joined) => ({
  label: `${idx + 1} ${e.name}`, id: e.id, name: e.name, tier: e.tier, maxHealth: e.maxHp, powerDie: e.powerDie, fightBonus: e.flat, initiativeDie: e.initDie ?? null,
  armor: e.armor ? { dice: e.armor.n, sides: e.armor.s } : null, ...(joined ? { joinedRound: joined } : {}),
});
const moveFacts = (e) => {
  const i = e.intent; if (!i) return null;
  const range = E.intentRange(e);
  return { move: i.n, verb: i.v, ...(i.k ? { k: i.k } : {}), ...(i.slam ? { slam: true } : {}), ...(i.pounce ? { pounce: true } : {}), damageRange: range ? { low: range[0], high: range[1] } : null };
};

// ------------------------------------------------------------------------------------------------ the live recorder (solo and shared phone)
const live = new WeakMap(); // the battle -> its draft
const mem = { reports: [] }; // when the device's storage is full or blocked, the latest reports stay here for this visit

function newDraft(b, mode) {
  const fighters = b.fighters || [b];
  const first = fighters[0].hero;
  return {
    mode, quest: { name: b.quest?.name || '', kind: b.quest?.kind || '', place: b.quest?.place || '', perilous: !!b.quest?.perilous },
    difficulty: D.normalizeDifficulty ? D.normalizeDifficulty(first.difficulty) : first.difficulty,
    act: first.campaign?.act ?? null, step: first.campaign?.step ?? null,
    heroes: fighters.map((f) => heroFacts(f.hero, f)), enemies: [], labels: new Map(), rounds: [], cur: null, startedAt: Date.now(),
  };
}
function label(d, e, round) {
  if (!d.labels.has(e.uid)) { const idx = d.enemies.length; d.enemies.push(enemyFacts(e, idx, round > 1 ? round : 0)); d.labels.set(e.uid, d.enemies[idx].label); }
  return d.labels.get(e.uid);
}
const nameOf = (b, who) => (who === b ? b.hero.name : who?.hero?.name || b.hero?.name || '?');
const activeName = (b) => (b.fighters ? b.fighters[b.active]?.hero.name : b.hero.name) || '?';
const heroSlot = (round, name) => (round.heroes[name] ||= { name, actions: [] });

function startRound(d, b) {
  const fighters = b.fighters || [b];
  const living = b.enemies.filter((e) => e.hp > 0);
  const round = { n: b.round, shown: living.map((e) => ({ enemy: label(d, e, b.round), health: e.hp, ...moveFacts(e) })), heroes: {}, order: fighters.map((f) => f.hero.name) };
  for (const f of fighters) { const h = heroSlot(round, f.hero.name); h.healthAtStart = f.hp; h.magicAtStart = f.magic; }
  d.cur = round;
}

function onTrace(kind, b, x) {
  const d = live.get(b); if (!d) return;
  try {
    if (kind === 'round') { if (d.cur && !d.cur.resolved) d.rounds.push({ ...d.cur, unresolved: true }); startRound(d, b); return; }
    if (!d.cur) return;
    if (kind === 'potion') {
      const h = heroSlot(d.cur, nameOf(b, b));
      h.actions.push({ kind: 'potion', thrownBy: nameOf(b, b), for: nameOf(b, x.to), healthBefore: x.before, healthAfter: x.before + x.got, healed: x.got, potionsLeft: E.potionsLeft(b) });
    } else if (kind === 'resolving') snapshotBeforeResolution(d, b, x);
    else if (kind === 'resolved') { recordResolution(d, d.cur, x, !!b.fighters); d.cur.resolved = true; d.rounds.push(d.cur); d.cur = null; }
  } catch { /* the report must never break the fight */ }
}
function onCast(b, cast) {
  const d = live.get(b); if (!d?.cur) return;
  try {
    const to = typeof cast.to === 'number' && b.fighters?.[cast.to] ? b.fighters[cast.to].hero.name : null;
    heroSlot(d.cur, activeName(b)).actions.push({ kind: 'power', id: cast.id, name: cast.name, magicCost: num(cast.cost), ...(cast.rolls?.length ? { rolled: [...cast.rolls] } : {}), gave: num(cast.total) || null, ...(to ? { for: to } : {}), ...(cast.notes?.length ? { notes: [...cast.notes] } : {}) });
  } catch { /* observers never throw */ }
}
function onMagic(b, what, cost) {
  const d = live.get(b); if (!d?.cur) return;
  try { heroSlot(d.cur, activeName(b)).actions.push({ kind: what, magicCost: num(cost) }); } catch { /* observers never throw */ }
}

// The board, health and moves as they stand when the player locks in (captured).
function snapshotBeforeResolution(d, b, x = {}) {
  const fighters = b.fighters ? b.fighters.filter((f) => f.hp > 0 && f.board) : [b];
  for (const f of fighters) {
    const h = heroSlot(d.cur, f.hero.name);
    const target = b.fighters ? f.target : x.target;
    const tgt = b.enemies[target || 0];
    h.healthBeforeResolution = f.hp; h.magicBeforeResolution = f.magic; h.potionsLeft = E.potionsLeft(f);
    h.dice = diceFrom(f.hero, f.board); h.straight = (b.fighters ? f.straight : x.straight) || 'atk';
    h.target = tgt ? label(d, tgt, b.round) : null;
    h.powersThisRound = nonZero(f.mods);
  }
  d.cur.enemiesBefore = b.enemies.filter((e) => e.hp > 0).map((e) => ({ enemy: label(d, e, b.round), health: e.hp, maxHealth: e.maxHp }));
}

const actFacts = (d, a, who) => ({
  enemy: d.labels.get(a.uid) || '?', move: a.name, verb: a.v, ...(a.early ? { actedBeforeYou: true } : {}), ...(a.slam ? { slam: true } : {}),
  damageRolled: a.mag, ...(a.calc ? { parts: plain(a.calc) } : {}), ...(a.arm ? { enemyArmor: a.arm } : {}), ...(a.frosted ? { chilled: true } : {}), ...(a.cancelled ? { cancelled: true } : {}),
  ...(a.d != null && !who ? { absorbedByBlock: num(a.ab), tookAfterBlock: num(a.net) } : {}), ...(who ? { perHero: who } : {}), ...(a.healed ? { healedItself: a.healed } : {}),
});
const evFacts = (ev) => ev && ({
  attack: ev.atk, block: ev.block, pierce: ev.pierce, heal: ev.heal, magic: ev.magic, gold: ev.gold, heart: ev.heart ?? null,
  triples: (ev.triples || []).map((t) => t.name), straight: ev.straight || 0, notes: [...(ev.notes || [])],
  lanes: Object.values(ev.lanes || {}).map((l) => ({ weapon: slotName(l.slot), face: l.weapon, plus: l.plus, hand: l.str, talent: l.sym ?? null, value: l.value, colour: l.color === 'r' ? 'attack' : 'block' })),
});

// What the engine's own round report says (captured), then the order of the blows worked out from it (derived).
function recordResolution(d, round, rep, party) {
  round.resolution = { acts: [], strikes: [] };
  const r = round.resolution;
  if (!party) {
    const h = heroSlot(round, d.heroes[0].name);
    h.totals = { attack: rep.T.atk, pierce: rep.T.pierce, block: rep.T.block, heal: rep.T.heal, magic: rep.T.magic };
    h.ev = evFacts(rep.ev);
    h.healthAfter = rep.hpAfter; h.magicAfter = rep.magicAfter; h.damageTaken = rep.taken; h.blocked = rep.absorbed; h.healed = rep.healed;
    r.initiative = { you: rep.init.hero, yourDie: rep.init.heroDie, foes: rep.init.foes.map((f) => ({ enemy: d.labels.get(f.uid) || '?', rolled: f.init, die: f.die })), first: rep.init.first, forced: !!rep.init.forced };
    r.acts = rep.acts.map((a) => actFacts(d, a));
    r.strikes = [{ by: h.name, target: d.labels.get(rep.targetUid) || null, dealt: rep.dealt, blockedByMonster: rep.guarded, killed: rep.killed.map((u) => d.labels.get(u)).filter(Boolean), ...(rep.phased ? { phased: true } : {}), ...(rep.burned ? { burnedYou: rep.burned } : {}) }];
    Object.assign(r, { ...(rep.sick ? { sick: rep.sick } : {}), ...(rep.phoenix ? { phoenix: true } : {}), ...(rep.heroDown ? { fellBeforeStriking: true } : {}), ...(rep.magicStolen ? { magicStolen: rep.magicStolen } : {}), ...(rep.goldStolen ? { goldStolen: rep.goldStolen } : {}) });
    round.derived = deriveSolo(round, h, rep);
  } else {
    const names = rep.fighters.map((f) => f.name);
    r.order = (rep.order || []).map((x) => (x.kind === 'hero' ? { hero: x.name, rolled: x.v } : { enemy: d.labels.get(x.uid) || x.name, rolled: x.v }));
    r.leader = rep.leader; r.leaderBecause = rep.leaderWhy === 'guard' ? 'a Knight used Shield Up' : 'slowest feet';
    for (const f of rep.fighters) {
      const h = heroSlot(round, f.name);
      h.healthAfter = f.hpAfter; h.magicAfter = f.magicAfter; h.damageTaken = f.taken; h.blocked = f.absorbed; h.healed = f.healed; if (f.down) h.wasDown = true;
    }
    for (const s of rep.strikes || []) {
      const h = heroSlot(round, s.name);
      h.totals = { attack: s.atk, pierce: s.pierce, block: s.T?.block, heal: s.T?.heal, magic: s.T?.magic }; h.ev = evFacts(s.ev);
      r.strikes.push({ by: s.name, target: d.labels.get(s.targetUid) || null, dealt: s.dealt, blockedByMonster: s.guarded, killed: !!s.killed, ...(s.burned ? { burnedYou: s.burned } : {}) });
    }
    r.acts = rep.acts.map((a) => actFacts(d, a, a.parts ? a.parts.map((part, i) => ({ hero: names[i], share: part, absorbed: part - num(a.nets?.[i]), took: num(a.nets?.[i]) })) : null));
    r.bonuses = { team: rep.team || 0, heartToHeart: rep.hearts || [], verses: rep.verses || [] };
    for (const [k, val] of Object.entries({ fallen: rep.fallen, sick: rep.sick, phoenix: rep.phoenix })) if (val?.length) r[k] = plain(val);
    round.derived = deriveParty(round, rep, names);
  }
}

// Derived: the blows in the order they landed, with each hero's health after each one, and the first that took them down.
// Healing lands before the blows (the rule); block is spent blow by blow. Marked derived because it is arithmetic on captured numbers.
function deriveSolo(round, h, rep) {
  let hp = num(h.healthBeforeResolution) + num(rep.healed);
  const steps = []; let lethal = null; let blockLeft = rep.T.block;
  const push = (what, took, extra = {}) => { hp -= took; const s = { order: steps.length + 1, what, took, healthAfter: hp, ...extra }; steps.push(s); if (!lethal && hp <= 0) lethal = { order: s.order, what }; };
  const early = rep.acts.filter((a) => a.early); const late = rep.acts.filter((a) => !a.early);
  const blow = (a) => { const name = round.resolution.acts[rep.acts.indexOf(a)]; blockLeft -= num(a.ab); push(`${name.enemy} ${name.move}`, num(a.net), { damageRolled: a.mag, blockSpent: num(a.ab), blockLeft: Math.max(0, blockLeft) }); };
  early.forEach(blow);
  const st = round.resolution.strikes[0];
  if (rep.heroDown) steps.push({ order: steps.length + 1, what: 'you fell before you could strike', took: 0, healthAfter: hp });
  else push(`your strike${st?.target ? ` on ${st.target}` : ''} (dealt ${num(st?.dealt)})${rep.burned ? `, burned by a Fire Ward for ${rep.burned}` : ''}`, num(rep.burned), { yourStrike: true });
  late.forEach(blow);
  if (rep.sick) steps.push({ order: steps.length + 1, what: 'sickness from the road', took: rep.sick, healthAfter: Math.max(0, hp) - rep.sick, note: 'never takes the last point' });
  return { startedFrom: num(h.healthBeforeResolution), healingLandedFirst: num(rep.healed), steps, lethalBlow: lethal };
}
function deriveParty(round, rep, names) {
  const hpNow = {}; const dead = {}; const per = {};
  for (const n of names) { const h = round.heroes[n] || {}; hpNow[n] = num(h.healthBeforeResolution) + num((rep.fighters.find((f) => f.name === n) || {}).healed); per[n] = []; }
  let ai = 0; let si = 0;
  const strike = (name) => {
    const s = (rep.strikes || [])[si++]; if (!s) return;
    hpNow[name] -= num(s.burned);
    per[name].push({ order: per[name].length + 1, what: `their strike on ${round.resolution.strikes[si - 1]?.target || 'a monster'} (dealt ${num(s.dealt)})${s.burned ? `, burned for ${s.burned}` : ''}`, took: num(s.burned), healthAfter: hpNow[name], yourStrike: true });
    if (!dead[name] && hpNow[name] <= 0) dead[name] = per[name].length;
  };
  const blow = (a) => {
    const info = round.resolution.acts[ai++]; if (!a.nets) return;
    names.forEach((n, i) => { if (!(i in a.nets)) return; hpNow[n] -= num(a.nets[i]); per[n].push({ order: per[n].length + 1, what: `${info.enemy} ${info.move}`, damageShare: num(a.parts?.[i]), took: num(a.nets[i]), healthAfter: hpNow[n] }); if (!dead[n] && hpNow[n] <= 0) dead[n] = per[n].length; });
  };
  const seq = rep.order || [];
  if (seq.length) for (const x of seq) { if (x.kind === 'hero') { if (!(rep.fallen || []).includes(x.name)) strike(x.name); } else if (rep.acts[ai] && rep.acts[ai].uid === x.uid) blow(rep.acts[ai]); }
  else rep.acts.forEach(blow);
  const lethalBlow = Object.fromEntries(names.filter((n) => dead[n]).map((n) => [n, per[n][dead[n] - 1]?.what]));
  return { perHero: Object.fromEntries(names.map((n) => [n, { startedFrom: num(round.heroes[n]?.healthBeforeResolution), blows: per[n] }])), lethalBlow };
}

// ------------------------------------------------------------------------------------------------ begin, finish, hook
let installed = false;
export function install() {
  if (installed) return; installed = true;
  const prevOn = E.CAST_HOOK.on; const prevMagic = E.CAST_HOOK.magic; const prevTrace = E.CAST_HOOK.trace;
  E.CAST_HOOK.on = (b, cast) => { prevOn?.(b, cast); onCast(b, cast); };
  E.CAST_HOOK.magic = (b, what, cost) => { prevMagic?.(b, what, cost); onMagic(b, what, cost); };
  E.CAST_HOOK.trace = (kind, b, x) => { prevTrace?.(kind, b, x); onTrace(kind, b, x); };
}
// A fight starts (solo or one phone shared by a company). Call once, right after the battle is made.
export function begin(b, { mode } = {}) {
  if (!b || live.has(b)) return;
  try { install(); const d = newDraft(b, mode || (b.fighters ? 'shared-phone' : 'solo')); live.set(b, d); startRound(d, b); } catch { /* the report is optional */ }
}
// The fight is over: assemble, bound and keep the report. Returns it (or null when this fight was not recorded).
export function finish(b, result) {
  const d = b && live.get(b); if (!d) return null;
  live.delete(b);
  try {
    if (d.cur && (Object.values(d.cur.heroes).some((h) => h.actions.length) || result === 'withdrew')) d.rounds.push({ ...d.cur, unresolved: true });
    const report = build(d, result, b.enemies.filter((e) => e.hp > 0).map((e) => d.labels.get(e.uid) || e.name));
    saveReport(report);
    return report;
  } catch { return null; }
}

const UNAVAILABLE = {
  solo: [], 'shared-phone': [],
  online: ['powers cast, rerolls and potions used by the other heroes', 'the other heroes’ dice faces and equipment', 'health a hero had just before resolution, if this phone missed that update'],
};
function build(d, result, enemiesLeft) {
  return {
    v: REPORT_VERSION, kind: 'Quest Dice battle report', id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, build: BUILD, savedAt: new Date().toISOString(),
    mode: d.mode, difficulty: d.difficulty, act: d.act, step: d.step, quest: d.quest,
    legend: { captured: 'written down by the game at the moment it happened', derived: 'worked out afterwards from captured numbers (inside `derived` blocks)', unavailable: UNAVAILABLE[d.mode] || [] },
    heroes: d.heroes, enemies: d.enemies, rounds: d.rounds.map(tidy),
    outcome: { result, roundsResolved: d.rounds.filter((r) => r.resolved).length, enemiesLeft },
  };
}
const tidy = (r) => ({ ...r, heroes: Object.values(r.heroes) });

// ------------------------------------------------------------------------------------------------ an online table (this phone's view)
// At an online table the rules run on whichever phone acted, so this phone sees the fight only through the shared view: the moves shown,
// every hero's health, its own board, and the engine's round report. A report built here has all of that, and says plainly what it lacks.
const online = { d: null };
const MY = (bt) => bt.me?.hero?.name;
function newOnline(view, bt) {
  const me = bt.me; const c = me?.hero?.campaign || {}; const hero = me?.hero;
  const d = { mode: 'online', quest: { name: bt.questName || '', kind: '', place: '', perilous: false }, difficulty: view.difficulty, act: c.act ?? null, step: c.step ?? null,
    heroes: [], enemies: [], labels: new Map(), rounds: [], cur: null, curN: 0, startedAt: Date.now(), joinedMidFight: bt.round > 1, mine: MY(bt) };
  for (const r of bt.roster || []) {
    if (hero && r.name === hero.name) d.heroes.push(heroFacts(hero, { maxHp: me.maxHp, hp: me.hp, magic: me.magic, boon: null, potions: hero.potions }));
    else d.heroes.push({ name: r.name, cls: r.cls, classLabel: D.CLASSES?.[r.cls]?.name || r.cls, maxHealth: r.maxHp, startHealth: r.hp, detail: 'unavailable' });
  }
  return d;
}
function onlineRound(d, bt) {
  const round = { n: bt.round, shown: [], heroes: {}, order: (bt.roster || []).map((r) => r.name), pre: null };
  for (const e of bt.enemies || []) if (e.hp > 0) round.shown.push({ enemy: label(d, e, bt.round), health: e.hp, ...moveFacts(e) });
  for (const r of bt.roster || []) { const h = heroSlot(round, r.name); h.healthAtStart = r.hp; }
  if (bt.me) { const h = heroSlot(round, MY(bt)); h.magicAtStart = bt.me.magic; round.potions = bt.me.hero?.potions; round.lastHp = bt.me.hp; }
  d.cur = round; d.curN = bt.round;
}
// The last view of a round before the report: each hero's health and this phone's own board as the player locked in.
function onlinePre(d, bt) {
  const r = d.cur; if (!r) return;
  r.pre = { health: Object.fromEntries((bt.roster || []).map((x) => [x.name, x.hp])), me: bt.me && { magic: bt.me.magic, board: bt.me.board && plain(bt.me.board), mods: nonZero(bt.me.mods), target: bt.me.target, straight: bt.me.straight, potions: bt.me.hero?.potions, hp: bt.me.hp } };
  const me = bt.me; if (me && r.potions != null && me.hero?.potions < r.potions) {
    heroSlot(r, MY(bt)).actions.push({ kind: 'potion', thrownBy: MY(bt), for: '(this hero, seen on this phone)', healthBefore: r.lastHp, healthAfter: me.hp, healed: me.hp - r.lastHp, potionsLeft: me.hero.potions });
  }
  if (me) { r.potions = me.hero?.potions; r.lastHp = me.hp; }
}
function onlineResolve(d, rep) {
  const r = d.cur; if (!r || r.resolved) return;
  for (const [n, hp] of Object.entries(r.pre?.health || {})) heroSlot(r, n).healthBeforeResolution = hp;
  const me = r.pre?.me; const mine = d.mine && heroSlot(r, d.mine);
  if (me && mine) {
    const hero = d.heroes.find((x) => x.name === d.mine);
    mine.magicBeforeResolution = me.magic; mine.potionsLeft = me.potions; mine.straight = me.straight || 'atk'; mine.powersThisRound = me.mods;
    const tgt = (rep.strikes || []).find((s) => s.name === d.mine)?.targetUid; mine.target = tgt ? d.labels.get(tgt) || null : null;
    if (me.board && hero?.name) mine.dice = Object.entries(me.board).filter(([, x]) => x && typeof x === 'object' && Number.isFinite(x.v)).map(([slot, x]) => ({ slot, role: slotName(slot), sides: hero.diceSides?.[slot] ?? null, v: x.v, ...(x.bound ? { bound: true } : {}) }));
  }
  recordResolution(d, r, rep, true); r.resolved = true; delete r.pre; delete r.potions; delete r.lastHp; d.rounds.push(r); d.cur = null;
}
function onlineFinish(d, result) {
  const left = [];
  const report = build(d, result, left);
  report.legend.unavailable = [...UNAVAILABLE.online, ...(d.joinedMidFight ? ['rounds before this phone joined the view'] : []), 'the quest’s kind and place, and the other monsters’ armour and initiative dice'];
  saveReport(report);
  return report;
}
// Call with every view this phone gets (from the session's change listener). Returns a report when the fight has just ended.
export function observeView(view) {
  try {
    if (!view) return null;
    const bt = view.battle;
    if (view.phase === 'battle' && bt) {
      if (online.d && (bt.round < online.d.curN || (bt.questName && bt.questName !== online.d.quest.name))) online.d = null;
      const d = online.d ||= newOnline(view, bt);
      if (bt.round !== d.curN) {
        if (d.cur && bt.report && bt.report.round === d.curN) onlineResolve(d, bt.report);
        else if (d.cur) { d.rounds.push({ ...d.cur, resolved: false, missed: true }); d.cur = null; }
        onlineRound(d, bt);
      }
      onlinePre(d, bt);
      return null;
    }
    const d = online.d;
    if (d && (view.phase === 'victory' || view.phase === 'defeat')) {
      online.d = null;
      if (d.cur && view.report && view.report.round === d.curN) onlineResolve(d, view.report);
      return onlineFinish(d, view.phase === 'victory' ? 'victory' : (view.defeat?.retreat ? 'withdrew' : 'defeat'));
    }
    if (d && view.phase !== 'battle' && view.phase !== 'envelope') online.d = null;
  } catch { /* the report is optional */ }
  return null;
}
export const forgetOnline = () => { online.d = null; };

// ------------------------------------------------------------------------------------------------ keeping reports (the latest three)
const storeOf = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };
const sizeOf = (r) => JSON.stringify(r).length;
// Bound one report: drop the heaviest detail from the earliest rounds first, then whole early rounds, and say so.
export function fit(report, max = MAX_REPORT_CHARS) {
  let r = plain(report); if (sizeOf(r) <= max) return r;
  const trim = [(x) => { x.heroes.forEach((h) => { delete h.diceSides; delete h.talents; }); }, (x) => { x.rounds.slice(0, -2).forEach((rd) => rd.heroes.forEach((h) => { delete h.ev; })); },
    (x) => { x.rounds.slice(0, -2).forEach((rd) => rd.heroes.forEach((h) => { delete h.dice; })); }];
  for (const t of trim) { t(r); if (sizeOf(r) <= max) { r.trimmed = true; return r; } }
  const total = r.rounds.length; let keep = total;
  while (keep > 2 && sizeOf(r) > max) { keep -= 1; r.rounds = r.rounds.slice(-keep); }
  r.trimmed = true; r.roundsOmitted = total - r.rounds.length;
  return r;
}
export function saveReport(report, storage = storeOf()) {
  const kept = fit(report);
  const list = [kept, ...loadReports(storage).filter((x) => x.id !== kept.id)].slice(0, MAX_REPORTS);
  mem.reports = list;
  if (!storage) return { stored: false, reason: 'storage is unavailable', kept: list.length };
  for (let n = list.length; n >= 1; n--) {
    try { storage.setItem(KEY, JSON.stringify(list.slice(0, n))); return { stored: true, kept: n }; } catch { /* full: keep fewer */ }
  }
  return { stored: false, reason: 'storage is full', kept: list.length };
}
export function loadReports(storage = storeOf()) {
  try { const raw = storage?.getItem(KEY); const list = raw ? JSON.parse(raw) : null; if (Array.isArray(list)) return list.filter((r) => r && r.v === REPORT_VERSION && Array.isArray(r.rounds)).slice(0, MAX_REPORTS); } catch { /* damaged: ignore */ }
  return mem.reports.slice(0, MAX_REPORTS);
}
export const latestReport = (storage) => loadReports(storage)[0] || null;
export function forgetReports(storage = storeOf()) { mem.reports = []; try { storage?.removeItem(KEY); } catch { /* nothing to forget */ } }
export const reportsKey = () => KEY;

// ------------------------------------------------------------------------------------------------ the readable summary, and the export
const hp = (n) => (n == null ? 'unavailable' : String(n));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export function titleOf(r) {
  const word = { victory: 'Victory', defeat: 'Defeat', withdrew: 'Withdrew' }[r.outcome?.result] || 'Battle';
  return `${word} · Act ${ACT_WORD[r.act] || r.act} step ${r.step} · ${r.quest?.name || 'battle'}`;
}
function roundLines(r, rd, solo) {
  const out = [`ROUND ${rd.n}${rd.unresolved ? ' (not finished)' : ''}`];
  out.push(`  Moves shown before you committed: ${(rd.shown || []).map((m) => `${m.enemy} ${m.move}${m.damageRange ? ` ${m.damageRange.low}–${m.damageRange.high}` : ''}${m.slam ? ' (slam)' : ''}`).join('; ') || 'none'}`);
  for (const h of rd.heroes) {
    const who = solo ? 'You' : h.name;
    out.push(`  ${who}: health at round start ${hp(h.healthAtStart)}, before resolution ${hp(h.healthBeforeResolution)}, after ${hp(h.healthAfter)}`);
    for (const a of h.actions || []) {
      if (a.kind === 'potion') out.push(`    drank a potion for ${a.for}: ${a.healthBefore} → ${a.healthAfter} (+${a.healed}), ${plural(a.potionsLeft, 'potion')} left`);
      else if (a.kind === 'power') out.push(`    power ${a.name}${a.rolled ? ` rolled ${a.rolled.join('+')}` : ''}${a.gave ? ` (${a.gave})` : ''}${a.for ? ` for ${a.for}` : ''}, ${plural(a.magicCost, 'magic')}`);
      else out.push(`    ${a.kind} (${plural(a.magicCost, 'magic')})`);
    }
    if (h.dice) out.push(`    final dice: ${h.dice.map((x) => `${x.role} d${x.sides}=${x.v}`).join(', ')}${h.target ? `; aimed at ${h.target}` : ''}`);
    if (h.totals) out.push(`    totals: attack ${h.totals.attack}, pierce ${h.totals.pierce}, block ${h.totals.block}, heal ${h.totals.heal}`);
  }
  const res = rd.resolution; if (!res) return out;
  for (const x of res.strikes) out.push(`  ${solo ? 'Your' : `${x.by}'s`} strike on ${x.target || 'nothing'}: dealt ${x.dealt}${x.blockedByMonster ? ` (it blocked ${x.blockedByMonster})` : ''}${Array.isArray(x.killed) ? (x.killed.length ? `, killed ${x.killed.join(', ')}` : '') : x.killed ? ', killed it' : ''}`);
  for (const a of res.acts) out.push(`  ${a.enemy} ${a.move}: rolled ${a.damageRolled}${a.enemyArmor ? ` (armour ${a.enemyArmor})` : ''}${a.chilled ? ', chilled' : ''}${a.perHero ? `; ${a.perHero.map((p) => `${p.hero} blocked ${p.absorbed}, took ${p.took}`).join('; ')}` : a.tookAfterBlock != null ? `; blocked ${a.absorbedByBlock}, took ${a.tookAfterBlock}` : ''}`);
  const d = rd.derived;
  if (d?.steps) { out.push(`  Order of blows (derived): ${d.steps.map((s) => `${s.order}. ${s.what} → health ${s.healthAfter}`).join('; ')}`); out.push(`  Lethal blow (derived): ${d.lethalBlow ? `${d.lethalBlow.order}. ${d.lethalBlow.what}` : 'none'}`); }
  if (d?.perHero) for (const [n, v] of Object.entries(d.perHero)) out.push(`  ${n} (derived): ${v.blows.map((s) => `${s.order}. ${s.what} → ${s.healthAfter}`).join('; ') || 'no blows'}${d.lethalBlow?.[n] ? ` — lethal: ${d.lethalBlow[n]}` : ''}`);
  return out;
}
export function summaryText(r) {
  const solo = r.mode === 'solo'; const L = [];
  L.push('QUEST DICE BATTLE REPORT', titleOf(r), `Build ${r.build} · ${MODE_WORD[r.mode] || r.mode} · ${r.difficulty} · ${r.outcome.result} after ${plural(r.outcome.roundsResolved, 'round')}`);
  if (r.trimmed) L.push(`(Trimmed to fit${r.roundsOmitted ? `: the first ${plural(r.roundsOmitted, 'round')} left out` : ''}.)`);
  L.push('', 'HEROES');
  for (const h of r.heroes) {
    if (h.detail === 'unavailable') { L.push(`  ${h.name}, ${h.classLabel}: health ${h.startHealth}/${h.maxHealth}; equipment, powers and perks unavailable on this phone`); continue; }
    L.push(`  ${h.name}, ${h.classLabel} level ${h.level}: health ${h.startHealth}/${h.maxHealth}, magic ${h.startMagic}, potions ${h.potions.have} (each heals ${h.potions.heals})`);
    if (h.weapons?.length) L.push(`    weapons: ${h.weapons.map((w) => w.name).join(', ')}`);
    if (h.powers?.length) L.push(`    powers: ${h.powers.map((p) => `${p.name}${p.level ? ` L${p.level}` : ''}`).join(', ')}`);
    if (h.perks?.length) L.push(`    perks: ${h.perks.map((p) => p.name).join(', ')}`);
    if (h.charms?.length) L.push(`    charms: ${h.charms.map((p) => p.name).join(', ')}`);
    if (h.roadEffects?.length) L.push(`    road effects: ${h.roadEffects.map((p) => `${p.name} (${p.text})`).join('; ')}`);
  }
  L.push('', 'ENEMIES');
  for (const e of r.enemies) L.push(`  ${e.label} (${e.tier}): health ${e.maxHealth}, power die d${e.powerDie}, fight bonus ${e.fightBonus}${e.armor ? `, armour ${e.armor.dice}d${e.armor.sides}` : ''}${e.joinedRound ? `, joined round ${e.joinedRound}` : ''}`);
  L.push('');
  for (const rd of r.rounds) L.push(...roundLines(r, rd, solo), '');
  L.push(`OUTCOME: ${r.outcome.result}, ${plural(r.outcome.roundsResolved, 'round')} resolved${r.outcome.enemiesLeft.length ? `; still standing: ${r.outcome.enemiesLeft.join(', ')}` : ''}`);
  if (r.legend.unavailable.length) L.push(`NOT RECORDED on this path: ${r.legend.unavailable.join('; ')}`);
  L.push('Captured = written down by the game when it happened. Derived = worked out afterwards from captured numbers.');
  return L.join('\n');
}
// What is shared: the summary, then every detail as JSON for debugging.
export function exportText(r) { return `${summaryText(r)}\n\n--- details (JSON) ---\n${JSON.stringify(r)}\n`; }
export const exportName = (r) => `questdice-battle-report-${String(r.savedAt || '').slice(0, 10) || 'today'}-${r.outcome?.result || 'fight'}.txt`;
