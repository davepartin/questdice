// View builders: pure functions that turn game state into DOM. Flow and input live in ui.js.
import { h } from './dom.js';
import * as D from './data.js';
import * as E from './engine.js';
import { drawDie, kickDie, watchDie } from './die3d.js';

export { characterMat } from './mat.js';

export const ICON = { gold: '🪙', pierce: '◆', magic: '✦', atk: '⚔', block: '🛡', heal: '✚', stagger: '✸' };
export const SLOT_NAME = {
  NW: 'Left weapon', N: 'Head', NE: 'Right weapon', W: 'Left hand', C: 'Heart',
  E: 'Right hand', SW: 'Left special', S: 'Feet', SE: 'Right special',
};
const LIMBS = new Set(['N', 'W', 'C', 'E', 'S']);
export const RARITY_CLASS = ['bronze', 'silver', 'gold', 'diamond'];

const fxText = (fx) => Object.entries(fx).map(([k, v]) => `${ICON[k === 'loot' ? 'gold' : k] || ''}${v}`).join(' ');

export function dieSpec(hero, slot, v) {
  const role = D.ROLE[slot];
  if (role === 'weapon') {
    const f = E.weaponFaces(hero.loadout[slot])[v - 1];
    return { main: String(f.v), tone: f.c === 'r' ? 'red' : 'blue', chip: f.fx ? fxText(f.fx) : (f.v === 0 ? 'blank' : ''), chipKind: f.fx ? 'c-magic' : 'c-dim', blank: f.v === 0, glyph: f.c === 'r' ? '⚔' : '🛡' };
  }
  if (role === 'special') {
    const sym = E.specialFace(hero, slot, v);
    return { main: sym ? D.talentLabel(sym) : '—', tone: sym ? 'sym' : '', chip: sym ? D.talentName(sym) : 'blank', chipKind: sym ? 'c-pierce' : 'c-dim', blank: !sym };
  }
  let chip = ''; let chipKind = '';
  if (role === 'heart') {
    if (v <= 4) { chip = `${['✚', '◆', '✦', '🪙'][v - 1]} amp`; chipKind = ['c-heal', 'c-pierce', 'c-magic', 'c-gold'][v - 1]; }
    else if (v === 5) { chip = '🛡 +4'; chipKind = 'c-block'; } else { chip = '⚔ +4'; chipKind = 'c-atk'; }
    return { main: String(v), tone: 'heart', chip, chipKind, blank: false };
  }
  chip = payChip(v); chipKind = payKind(v);
  return { main: String(v), tone: '', chip, chipKind, blank: false };
}

const PAY_ICON = { heal: '✚', pierce: '◆', magic: '✦', gold: '🪙' };
const payWords = (v) => { const p = D.FACE_PAY[v]; return p ? Object.entries(p).map(([k, n]) => `${PAY_ICON[k]} ${n} ${k}`).join(' + ') : ''; };
const payChip = (v) => { const p = D.FACE_PAY[v]; return p ? Object.entries(p).map(([k, n]) => `${PAY_ICON[k]}${n}`).join(' ') : ''; };
const payKind = (v) => { const p = D.FACE_PAY[v]; const k = p && Object.keys(p)[0]; return k ? `c-${k}` : ''; };
export function paintDie(el, hero, slot, v) {
  const s = dieSpec(hero, slot, v);
  el.querySelector('.num').textContent = s.main;
  const chip = el.querySelector('.chip');
  chip.textContent = s.chip; chip.className = `chip ${s.chipKind || ''}`;
  el.classList.toggle('blank', !!s.blank);
  el.dataset.tone = s.tone || '';
  const extra = s.chip && s.chip !== 'blank' ? `, ${s.chip}` : '';
  el.setAttribute('aria-label', `${SLOT_NAME[slot]} showing ${s.main}${extra}`);
  if (el.classList.contains('rolling')) kickDie(el);
  else drawDie(el);
}
export function dieEl(hero, slot, die, { selected = false, onclick, twohand = false, dim = false, tabindex } = {}) {
  const role = D.ROLE[slot];
  const sides = role === 'weapon' ? 4 : E.sidesOf(hero, slot);
  const el = h('button', {
    class: `die die--${role} ${LIMBS.has(slot) ? 'limb' : 'corner'} ${selected ? 'sel' : ''} ${die.bound ? 'bound' : ''} ${twohand ? 'twohand' : ''} ${dim ? 'dim' : ''}`,
    'data-slot': slot, 'data-sides': String(sides), type: 'button', onclick, tabindex,
    'aria-label': `${SLOT_NAME[slot]}`, 'aria-pressed': selected ? 'true' : 'false',
  },
  h('canvas', { class: 'die-canvas', width: '2', height: '2', 'aria-hidden': 'true' }),
  h('span', { class: 'num' }),
  h('span', { class: 'chip' }),
  die.bound ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null);
  paintDie(el, hero, slot, die.v);
  watchDie(el);
  return el;
}

export function describeDie(hero, slot, v) {
  const role = D.ROLE[slot]; const name = SLOT_NAME[slot];
  if (role === 'weapon') {
    const inst = hero.loadout[slot]; const f = E.weaponFaces(inst)[v - 1]; const w = D.WEAPONS[inst.id];
    return `${name} · ${D.RARITY[inst.rarity]} ${w.name}: shows ${f.v} ${f.c === 'r' ? 'RED, so this lane attacks' : 'BLUE, so this lane defends'}${f.fx ? ` (icon ${fxText(f.fx)})` : ''}. It adds to your ${slot === 'NW' ? 'left' : 'right'} hand’s strength.`;
  }
  if (role === 'special') {
    const sym = E.specialFace(hero, slot, v);
    return sym ? `${name}: ${D.talentName(sym)}. ${D.talentText(sym)}` : `${name}: a blank. Two faces of every talent die are always empty.`;
  }
  if (role === 'heart') {
    const t = ['Every 1 on your head, hands and feet heals +2 more.', 'Every 2 on your head, hands and feet pierces +2 more.', 'Every 3 on your head, hands and feet gives +2 ✦ more.', 'Every 4 on your head, hands and feet gives +2 🪙 more.', 'Each BLUE weapon lane gets +4 block.', 'Each RED weapon lane gets +4 attack.'][v - 1];
    return `Heart (d6) shows ${v}. ${t}`;
  }
  const base = role === 'hand' ? `${name} · Strength ${v}: adds ${v} to its lane. ` : `${name} (d4) shows ${v}. `;
  const eff = payWords(v) ? `${v} → ${payWords(v)}.` : 'High numbers are pure power.';
  const ini = role === 'feet' ? ` It is also your initiative (${v}): each round every monster rolls its own die, a higher roll strikes first, ties go to you. Round 1 is always yours.` : '';
  return base + eff + ini;
}

export function hpBar(cur, max, { cls = '', label = true } = {}) {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  return h('div', { class: `bar ${cls}` }, h('div', { class: 'bar-fill', style: { width: `${pct}%` } }),
    label ? h('span', { class: 'bar-text' }, `${Math.max(0, Math.ceil(cur))}/${max}`) : null);
}

// ------------------------------------------------------------------ forecast
export function forecastEl(ev, mods) {
  const row = h('div', { class: 'forecast' });
  const chip = (cls, icon, label, n) => row.append(h('div', { class: `fchip ${cls} ${n ? '' : 'zero'}` }, h('span', { class: 'fi' }, icon), h('b', {}, String(n)), h('small', {}, label)));
  chip('c-atk', ICON.atk, 'attack', ev.atk + mods.atk);
  chip('c-pierce', ICON.pierce, 'pierce', ev.pierce + mods.pierce);
  chip('c-block', ICON.block, 'block', ev.block + mods.block);
  chip('c-magic', ICON.magic, 'magic', ev.magic);
  chip('c-heal', ICON.heal, 'heal', ev.heal + mods.heal);
  chip('c-gold', ICON.gold, 'gold', ev.gold);
  return row;
}
export function synergyNotes(ev, mods) {
  const out = [];
  for (const t of ev.triples || []) out.push({ kind: 'good', text: `${t.kind === 'atk' ? '⚔' : '🛡'} ${t.name}! +10 ${t.kind === 'atk' ? 'attack' : 'block'}` });
  if (ev.straight) out.push({ kind: 'good', text: `★ ${ev.straight}-straight! +${ev.straightBonus}` });
  if (mods.weaken) out.push({ kind: '', text: `Foes hit ${mods.weaken} softer` });
  return out;
}

// ------------------------------------------------------------------ enemies
export function intentInfo(e) {
  const i = e.intent; if (!i) return null;
  const r = E.intentRange(e);
  const rng = r ? (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`) : '';
  switch (i.v) {
    case 'strike': return { icon: i.slam ? '💥' : '⚔', tone: i.slam ? 'slam' : 'atk', title: i.n, text: `${rng} damage · block stops it` };
    case 'pierce': return { icon: '◆', tone: 'pierce', title: i.n, text: `${rng} piercing · block can’t stop it` };
    case 'guard': return { icon: '🛡', tone: 'block', title: i.n, text: `blocks ${rng} of your non-piercing damage` };
    case 'mend': return { icon: '✚', tone: 'heal', title: i.n, text: `heals ${rng}` };
    case 'charge': return { icon: '⚡', tone: 'charge', title: i.n, text: 'SLAM next round. Brace with block' };
    case 'howl': return { icon: '📣', tone: 'buff', title: i.n, text: `every foe’s next strike +${i.k}` };
    case 'bind': return { icon: '⛓', tone: 'bind', title: i.n, text: `locks ${i.k} of your dice next round` };
    case 'drain': return { icon: '☾', tone: 'drain', title: i.n, text: `${rng} damage and steals ${i.k} ✦` };
    case 'pilfer': return { icon: '🪙', tone: 'gold', title: i.n, text: `${rng} damage; steals gold if it hits` };
    case 'summon': return { icon: '✦', tone: 'summon', title: i.n, text: `calls ${i.k} reinforcement${i.k > 1 ? 's' : ''}` };
    default: return { icon: '?', tone: '', title: i.n, text: '' };
  }
}
export function enemyCard(e, { targeted = false, onclick, showText = false } = {}) {
  const dead = e.hp <= 0; const info = !dead && intentInfo(e);
  return h('button', {
    class: `ecard tier-${e.tier} ${dead ? 'dead' : ''} ${targeted ? 'targeted' : ''} ${e.raged ? 'raged' : ''}`, type: 'button',
    'data-uid': e.uid, onclick, disabled: dead, 'aria-label': e.name,
  },
  h('div', { class: 'eportrait' }, h('span', {}, e.glyph)),
  h('div', { class: 'ename' }, e.name, e.raged ? h('em', {}, ` · ${e.rageName}`) : null),
  hpBar(e.hp, e.maxHp, { cls: 'enemy-bar' }),
  info ? h('div', { class: `intent ${info.tone}` }, h('span', { class: 'iicon' }, info.icon), h('div', { class: 'itext' }, h('b', {}, info.title), showText ? h('small', {}, info.text) : h('small', {}, info.text.split(' · ')[0].split('. ')[0]))) : null,
  e.carried ? h('div', { class: 'carried' }, `carrying ${e.carried} 🪙`) : null);
}

// ------------------------------------------------------------------ weapons
export function weaponCard(inst, { actions = [], note = '', compact = false } = {}) {
  const w = D.WEAPONS[inst.id]; const faces = E.weaponFaces(inst);
  return h('div', { class: `wcard rar-${RARITY_CLASS[inst.rarity]} ${compact ? 'compact' : ''}` },
    h('div', { class: 'whead' },
      h('span', { class: 'wglyph' }, w.glyph || '✊'),
      h('div', { class: 'wtitle' }, h('b', {}, w.name), h('small', {}, `${D.RARITY[inst.rarity]} · ${w.hands === 2 ? 'two-handed' : 'one-handed'}`))),
    h('div', { class: 'wfaces' }, faces.map((f) => h('span', { class: `wf ${f.c === 'r' ? 'red' : 'blue'} ${f.v === 0 ? 'zero' : ''}` }, String(f.v), f.fx ? h('i', {}, fxText(f.fx)) : null))),
    compact ? null : h('p', { class: 'wtag' }, w.tag),
    note ? h('p', { class: 'wnote' }, note) : null,
    actions.length ? h('div', { class: 'wactions' }, actions) : null);
}

// ------------------------------------------------------------------ report
export function reportLines(rep, b) {
  const name = (uid) => b.enemies.find((e) => e.uid === uid)?.name || 'Foe';
  const L = [];
  const t = name(rep.targetUid);
  L.push({ kind: 'you', text: `You strike ${t}: ${rep.T.atk} attack${rep.guarded ? ` (${rep.guarded} guarded)` : ''}${rep.T.pierce ? ` + ${rep.T.pierce} ◆ pierce` : ''} → ${rep.dealt} damage.` });
  for (const t of rep.ev.triples || []) L.push({ kind: 'good', text: `${t.name}! +10 ${t.kind === 'atk' ? 'attack' : 'block'}.` });
  if (rep.ev.straight) L.push({ kind: 'good', text: `${rep.ev.straight}-straight!` });
  for (const u of rep.killed) L.push({ kind: 'good', text: `${name(u)} falls.` });
  for (const a of rep.acts) {
    const n = name(a.uid);
    if (a.v === 'strike' || a.v === 'drain' || a.v === 'pilfer') L.push({ kind: a.net > 0 ? 'bad' : 'meh', text: `${n} ${a.name}: ${a.d}${a.ab ? `, you block ${a.ab}` : ''} → ${a.net} damage.` });
    else if (a.v === 'pierce') L.push({ kind: 'bad', text: `${n} ${a.name}: ${a.d} piercing damage.` });
    else if (a.v === 'guard') L.push({ kind: 'meh', text: `${n} braces (${a.name}).` });
    else if (a.v === 'mend') L.push({ kind: 'meh', text: `${n} mends ${a.healed || 0}.` });
    else if (a.v === 'charge') L.push({ kind: a.cancelled ? 'good' : 'bad', text: a.cancelled ? `${n}’s wind-up is cancelled.` : `${n} winds up. A Slam is coming.` });
    else if (a.v === 'howl') L.push({ kind: 'bad', text: `${n} howls. The pack grows bolder.` });
    else if (a.v === 'bind') L.push({ kind: 'bad', text: `${n} casts ${a.name}. ${rep.bound} die locked next round.` });
    else if (a.v === 'summon') L.push({ kind: 'bad', text: `${n} calls for help.` });
  }
  if (rep.goldStolen) L.push({ kind: 'bad', text: `A thief takes ${rep.goldStolen} 🪙. Kill it to get it back.` });
  if (rep.magicStolen) L.push({ kind: 'bad', text: `${rep.magicStolen} ✦ drained from you.` });
  for (const u of rep.raged) L.push({ kind: 'bad', text: `${name(u)} flies into a rage!` });
  if (rep.healed) L.push({ kind: 'good', text: `You heal ${rep.healed}.` });
  const gains = [];
  if (rep.T.magic) gains.push(`+${rep.T.magic} ✦`); if (rep.T.gold) gains.push(`+${rep.T.gold} 🪙`);
  if (gains.length) L.push({ kind: 'meh', text: `Gathered ${gains.join('  ')}.` });
  return L;
}

// ------------------------------------------------------------------ rules text
export function partyReportLines(rep, b) {
  const name = (uid) => b.enemies.find((e) => e.uid === uid)?.name || 'Foe';
  const L = [];
  for (const t of rep.team || []) L.push({ kind: 'good', text: `${t.label} +${t.bonus}: ${t.names.join(' and ')}.` });
  if (rep.heartbeat) L.push({ kind: 'good', text: `Heartbeat! Every heart shows ${rep.heartbeat.face}: +${rep.heartbeat.magic} magic each.` });
  for (const m of rep.moral || []) L.push({ kind: 'good', text: `Moral Boost +${m.n}: ${m.from}’s killing blow fires up ${m.to}.` });
  if (rep.order?.length) {
    const seq = rep.order.map((x) => `${x.name}${x.v != null ? ` ⚡${x.v}` : ''}`).join('  →  ');
    L.push({ kind: 'meh', text: rep.init?.forced ? `Round 1: the heroes always go first. ${seq}` : `Initiative (high to low, ties to the heroes): ${seq}` });
  }
  if (rep.leader) L.push({ kind: 'meh', text: `${rep.leader} is quickest and draws the monsters’ heat (a double share of every blow).` });
  const heroLines = (s) => {
    const o = [{ kind: 'you', text: `${s.name} strikes ${name(s.targetUid)}: ${s.atk} attack${s.guarded ? ` (${s.guarded} guarded)` : ''}${s.pierce ? ` + ${s.pierce} ◆ pierce` : ''} → ${s.dealt} damage.` }];
    for (const t of s.ev?.triples || []) o.push({ kind: 'good', text: `${s.name} lands a ${t.name}.` });
    if (s.ev?.straight) o.push({ kind: 'good', text: `${s.name} rolls a ${s.ev.straight}-straight.` });
    if (s.killed) o.push({ kind: 'good', text: `${name(s.targetUid)} falls.` });
    return o;
  };
  const foeLine = (a) => {
    const n = name(a.uid);
    if (a.v === 'strike' || a.v === 'drain' || a.v === 'pilfer') return { kind: a.net > 0 ? 'bad' : 'meh', text: `${n} ${a.name}: ${a.d}, split by initiative${a.ab ? `, ${a.ab} blocked` : ''} → ${a.net} damage.` };
    if (a.v === 'pierce') return { kind: 'bad', text: `${n} ${a.name}: ${a.d} piercing, split across the company.` };
    if (a.v === 'guard') return { kind: 'meh', text: `${n} braces (${a.name}).` };
    if (a.v === 'mend') return { kind: 'meh', text: `${n} mends ${a.healed || 0}.` };
    if (a.v === 'charge') return { kind: a.cancelled ? 'good' : 'bad', text: a.cancelled ? `${n}’s wind-up breaks.` : `${n} winds up. A Slam is coming.` };
    if (a.v === 'howl') return { kind: 'bad', text: `${n} howls. The pack grows bolder.` };
    if (a.v === 'bind') return { kind: 'bad', text: `${n} tangles ${rep.leader || 'the leader'}. ${rep.bound} ${rep.bound === 1 ? 'die' : 'dice'} locked next round.` };
    if (a.v === 'summon') return { kind: 'bad', text: `${n} calls for help.` };
    return null;
  };
  if (rep.order?.length) {
    for (const x of rep.order) {
      if (x.kind === 'hero') { const s = (rep.strikes || []).find((q) => q.name === x.name); if (s) L.push(...heroLines(s)); else if (rep.fallen?.includes(x.name)) L.push({ kind: 'bad', text: `${x.name} is dropped before they can swing.` }); }
      else { const a = (rep.acts || []).find((q) => q.uid === x.uid); const l = a && foeLine(a); if (l) L.push(l); }
    }
    } else {
    for (const s of rep.strikes || []) L.push(...heroLines(s));
      for (const a of rep.acts) { const l = foeLine(a); if (l) L.push(l); }
  }
  if (rep.goldStolen) L.push({ kind: 'bad', text: `A thief takes ${rep.goldStolen} 🪙 from ${rep.leader}. Kill it to get the purse back.` });
  if (rep.magicStolen) L.push({ kind: 'bad', text: `${rep.magicStolen} ✦ drained from ${rep.leader}.` });
  for (const u of rep.raged) L.push({ kind: 'bad', text: `${name(u)} flies into a rage.` });
  for (const f of rep.fighters || []) {
    if (f.down) continue;
    if (f.taken) L.push({ kind: 'bad', text: `${f.name} takes ${f.taken}${f.absorbed ? ` (${f.absorbed} blocked)` : ''}.` });
    if (f.healed) L.push({ kind: 'good', text: `${f.name} heals ${f.healed}.` });
  }
  return L;
}

export function rosterEl(fighters, active = -1) {
  return h('div', { class: 'roster' }, fighters.map((f, i) => {
    const c = D.CLASSES[f.hero.cls];
    const feet = f.board ? ` · feet ${f.board.S.v}` : '';
    return h('div', { class: `mate ${i === active ? 'on' : ''} ${f.hp <= 0 ? 'down' : ''}` },
      h('div', { class: 'mate-name' }, h('span', {}, c.glyph), h('b', {}, f.hero.name)),
      hpBar(f.hp, f.maxHp, { cls: 'hero-bar', label: true }),
      h('small', {}, `✦ ${f.magic}${feet}${f.hp <= 0 ? ' · down' : ''}`));
  }));
}

export function howToPlay() {
  const p = (...c) => h('p', {}, ...c);
  return h('div', { class: 'howto' },
    h('h2', {}, 'How to play'),
    p('Your nine dice are your ', h('b', {}, 'body'), '. Roll them, shape the result with a few rerolls, then lock in. You and the monsters resolve together, and your blow lands first.'),
    h('h3', {}, 'Reading the board'),
    p(h('b', {}, 'Hands'), ' are strength. A weapon die sits above each hand and adds its number; its ', h('b', { class: 'red' }, 'red'), ' or ', h('b', { class: 'blue' }, 'blue'), ' colour decides whether that side ', h('b', {}, 'attacks'), ' or ', h('b', {}, 'blocks'), '.'),
    p(h('b', {}, 'Head, hands and feet'), ' always pay out: 1 = 🪙 gold, 2 = ◆ pierce (ignores block), 3 and 4 = ✦ magic. Big numbers are pure power.'),
    p(h('b', {}, 'Heart'), ' (the d6 in the middle) amplifies matching dice on your own board. A 5 boosts your best block; a 6 your best attack.'),
    p(h('b', {}, 'Specials'), ' (lower corners) always have two blank faces. Their symbols use your hand’s number: ✚ heal, ✦ magic, ⚡ doubles that hand.'),
    h('h3', {}, 'Each round'),
    p(h('b', {}, '1. Reset.'), ' Monsters roll their ', h('b', {}, 'Intention'), ' first and show it to you. You see what is coming. Spend ✦ to heal or recharge a card, then roll.'),
    p(h('b', {}, '2. Shape.'), ' The first reroll is free (tap up to 3 dice). Two more cost 1 ✦ per die. Cards, healing and heart nudges cost ✦ too.'),
    p(h('b', {}, '3. Lock in.'), ' Tap a monster to choose your target. Triples (+10) and 5-straights pay extra.'),
    h('h3', {}, 'Monsters'),
    p('They never reroll. A ⚡ ', h('b', {}, 'Wind-Up'), ' means a huge Slam next round. You cannot stop it, so brace with ', h('b', {}, 'block'), ' or kill the monster first. Bosses change their ways at half health.'),
    h('h3', {}, 'The company'),
    p('One to six heroes, each on their own phone. The monsters choose when the round opens, and every hero shapes their own dice at the same time. Other phones see who has locked in, not the dice. When every hero has locked, the fight runs once. Highest ', h('b', {}, 'Feet'), ' draws the most damage. Healing and blocking count toward who picks loot first.'),
    h('h3', {}, 'The road'),
    p('Between quests the road speaks. It knows your names. Some choices pay, some bite, and some only change the next fight. The same company meets the same scene if you reload before you choose.'),
    h('h3', {}, 'Between fights'),
    p(h('b', {}, 'Camp'), ' is where gold lives: bigger dice, new weapons, and a save point. Magic only matters inside a fight.'));
}
