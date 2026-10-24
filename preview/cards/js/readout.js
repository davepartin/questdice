// Combat readout: a short scrolling log of recent rounds, built from the engine's round report.
import { h } from './dom.js';

export const KEEP = 5;

const SLOT_WORD = {
  NW: 'left weapon', NE: 'right weapon', N: 'head', S: 'feet',
  W: 'left hand', E: 'right hand', C: 'heart', SW: 'left talent', SE: 'right talent', P: 'pet',
};

export const foeName = (b, uid) => b?.enemies?.find((e) => e.uid === uid)?.name || 'Foe';
export const boundSlotsOf = (board) => Object.entries(board || {}).filter(([, d]) => d?.bound).map(([s]) => s);

const list = (parts) => {
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
};
const slotWords = (slots) => list((slots || []).map((s) => SLOT_WORD[s] || s));
const heroLabel = (b, rep) => (rep?.party ? (rep.leader || 'the company') : (b?.hero?.name || 'You'));
const strikeVerb = (name) => (name && name !== 'You' ? `${name} strikes` : 'You strike');

function bindLine(rep, b, slots) {
  const names = [...new Set((rep.acts || []).filter((a) => a.v === 'bind').map((a) => foeName(b, a.uid)))];
  const who = names.length ? list(names) : 'A monster';
  const what = slotWords(slots);
  if (what) {
    const whose = rep.party ? `${rep.leader || 'the leader'}'s` : 'your';
    return { kind: 'bad', text: `${who} locked ${whose} ${what}.` };
  }
  const k = rep.bound || names.length || 1;
  if (rep.party && rep.leader) return { kind: 'bad', text: `${who} locked ${k} of ${rep.leader}'s ${k === 1 ? 'die' : 'dice'}.` };
  return { kind: 'bad', text: `${who} locked ${k} ${k === 1 ? 'die' : 'dice'}.` };
}

function hitLine(n, target, a) {
  if (a.v === 'pierce') return { kind: 'bad', text: `${n} hits ${target}: ${a.d} piercing → ${a.net ?? a.d} damage.` };
  const blocked = a.ab ? `, ${target} blocked ${a.ab}` : '';
  return { kind: a.net > 0 ? 'bad' : 'meh', text: `${n} hits ${target}: ${a.d} attack${blocked} → ${a.net} damage.` };
}

function soloLines(rep, b, opts) {
  const L = [];
  const you = b?.hero?.name || 'You';
  const t = foeName(b, rep.targetUid);
  if (rep.heroDown) L.push({ kind: 'bad', text: `${you} falls before striking.` });
  else if (rep.targetUid) {
    const bits = [`${rep.T.atk} attack`];
    if (rep.guarded) bits.push(`${rep.guarded} blocked`);
    if (rep.T.pierce) bits.push(`+${rep.T.pierce} pierce`);
    L.push({ kind: 'you', text: `${strikeVerb(you)} ${t}: ${bits.join(', ')} → ${rep.dealt} damage.` });
  }
  for (const sp of rep.splashed || []) {
    if (sp.uid === rep.targetUid || !sp.dealt) continue;
    L.push({ kind: 'you', text: `Splash ${sp.dealt} on ${foeName(b, sp.uid)}.` });
  }
  for (const u of rep.killed || []) L.push({ kind: 'good', text: `${foeName(b, u)} falls.` });
  if (rep.healed) L.push({ kind: 'good', text: `${you === 'You' ? 'You heal' : `${you} heals`} ${rep.healed}.` });
  if (rep.burned) L.push({ kind: 'bad', text: `Fire Ward burns ${you} for ${rep.burned}.` });
  for (const a of rep.acts || []) {
    if (a.v === 'strike' || a.v === 'drain' || a.v === 'pilfer' || a.v === 'pierce') L.push(hitLine(foeName(b, a.uid), you, a));
  }
  if (rep.bound || (rep.acts || []).some((a) => a.v === 'bind')) L.push(bindLine(rep, b, opts.boundSlots));
  if (rep.magicStolen) L.push({ kind: 'bad', text: `${rep.magicStolen} magic stolen from ${you}.` });
  if (rep.goldStolen) L.push({ kind: 'bad', text: `${rep.goldStolen} gold stolen.` });
  for (const a of (rep.acts || []).filter((x) => x.v === 'summon')) L.push({ kind: 'bad', text: `${foeName(b, a.uid)} summons help.` });
  for (const u of rep.raged || []) {
    const e = b?.enemies?.find((x) => x.uid === u);
    L.push({ kind: 'bad', text: `${e?.name || 'Foe'} rages${e?.rageName ? ` (${e.rageName})` : ''}.` });
  }
  return L;
}

function partyLines(rep, b, opts) {
  const L = [];
  const target = heroLabel(b, rep);
  const strike = (s) => {
    const bits = [`${s.atk} attack`];
    if (s.guarded) bits.push(`${s.guarded} blocked`);
    if (s.pierce) bits.push(`+${s.pierce} pierce`);
    L.push({ kind: 'you', text: `${s.name} strikes ${foeName(b, s.targetUid)}: ${bits.join(', ')} → ${s.dealt} damage.` });
    if (s.killed) L.push({ kind: 'good', text: `${foeName(b, s.targetUid)} falls.` });
    if (s.burned) L.push({ kind: 'bad', text: `Fire Ward burns ${s.name} for ${s.burned}.` });
  };
  const foeAct = (a) => {
    if (a.v === 'strike' || a.v === 'drain' || a.v === 'pilfer' || a.v === 'pierce') L.push(hitLine(foeName(b, a.uid), target, a));
  };
  if (rep.order?.length) {
    for (const x of rep.order) {
      if (x.kind === 'hero') {
        const s = (rep.strikes || []).find((q) => q.name === x.name);
        if (s) strike(s);
        else if (rep.fallen?.includes(x.name)) L.push({ kind: 'bad', text: `${x.name} falls before striking.` });
      } else {
        const a = (rep.acts || []).find((q) => q.uid === x.uid);
        if (a) foeAct(a);
      }
    }
  } else {
    for (const s of rep.strikes || []) strike(s);
    for (const a of rep.acts || []) foeAct(a);
  }
  if (rep.bound || (rep.acts || []).some((a) => a.v === 'bind')) L.push(bindLine(rep, b, opts.boundSlots));
  if (rep.magicStolen) L.push({ kind: 'bad', text: `${rep.magicStolen} magic stolen from ${rep.leader || target}.` });
  if (rep.goldStolen) L.push({ kind: 'bad', text: `${rep.goldStolen} gold stolen from ${rep.leader || target}.` });
  for (const a of (rep.acts || []).filter((x) => x.v === 'summon')) L.push({ kind: 'bad', text: `${foeName(b, a.uid)} summons help.` });
  for (const u of rep.raged || []) L.push({ kind: 'bad', text: `${foeName(b, u)} rages.` });
  for (const f of rep.fighters || []) {
    if (f.down || !f.healed) continue;
    L.push({ kind: 'good', text: `${f.name} heals ${f.healed}.` });
  }
  return L;
}

export function formatLines(rep, b, opts = {}) {
  if (!rep) return [];
  return rep.party ? partyLines(rep, b, opts) : soloLines(rep, b, opts);
}

let hist = [];
export const history = () => hist;
export function reset() { hist = []; }

export function push(rep, b, opts = {}) {
  if (!rep) return hist;
  hist = hist.filter((r) => r.n !== rep.round);
  hist.push({ n: rep.round, rep, b, opts: { ...opts } });
  if (hist.length > KEEP) hist = hist.slice(-KEEP);
  return hist;
}

export function noteBounds(board) {
  const last = hist.at(-1); if (!last) return;
  const slots = boundSlotsOf(board);
  if (slots.length) last.opts = { ...last.opts, boundSlots: slots };
}

export function panelEl() {
  return h('aside', { class: 'qd-readout', 'aria-label': 'Combat readout' },
    h('div', { class: 'qd-ro-h' }, 'Last rounds'),
    h('ol', { class: 'qd-ro-log' }));
}

export function paint(el) {
  if (!el) return;
  const log = el.querySelector('.qd-ro-log'); if (!log) return;
  if (!hist.length) { el.hidden = true; log.replaceChildren(); return; }
  el.hidden = false;
  log.replaceChildren(...hist.map((r) => h('li', { class: 'qd-ro-round' },
    h('b', { class: 'qd-ro-n' }, `R${r.n}`),
    h('ul', {}, formatLines(r.rep, r.b, r.opts).map((l) => h('li', { class: l.kind || 'meh' }, l.text))))));
  log.scrollTop = log.scrollHeight;
}

export function view() {
  if (!hist.length) return null;
  const el = panelEl(); paint(el); return el;
}

export function refresh() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.qd-readout').forEach(paint);
}

export function record(rep, b, opts) {
  push(rep, b, opts);
  refresh();
}
