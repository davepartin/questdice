// Post-battle brag board: a per-phone overlay of who did what, ranked by points.
import { h } from '../dom.js';
import * as D from '../data.js';
import { kit } from './scrui.js';

const BADGES = [
  { label: 'Kingslayer', stat: 'bossKill', bool: true },
  { label: 'Most damage', stat: 'dealt' },
  { label: 'Most kills', stat: 'kills' },
  { label: 'Wall of the company', stat: 'blocked' },
  { label: 'Held the line', stat: 'heldLine' },
  { label: 'Most healing', stat: 'healed' },
  { label: 'Lifesaver', stat: 'revives' },
  { label: 'Field medic', stat: 'potionsThrown' },
  { label: 'Open hand', stat: 'magicShared' },
];

export function badgeFor(name, statsMap) {
  const mine = statsMap?.[name] || {};
  for (const b of BADGES) {
    if (b.bool) { if (mine[b.stat]) return b.label; continue; }
    const val = mine[b.stat] || 0;
    if (val <= 0) continue;
    let max = 0;
    for (const s of Object.values(statsMap || {})) max = Math.max(max, s[b.stat] || 0);
    if (val === max) return b.label;
  }
  return '';
}

let host = null;
export function closeBrag() { host?.remove(); host = null; }
export const bragOpen = () => !!host;

export function bragBoard({ table, youName, onOnward } = {}) {
  closeBrag();
  const { btn, eyebrow, flourish } = kit;
  const R = table?.rewards || {};
  const members = table?.company?.members || [];
  const n = members.length;
  const order = R.order || members.map((m) => m.name);
  const lead = order[0] || '';
  const statsMap = R.stats || {};
  const placeWord = (p) => (p === 1 && n >= 2 ? '1st' : p === 2 && n >= 3 ? '2nd' : '');

  const cards = order.map((name) => {
    const m = members.find((x) => x.name === name);
    if (!m) return null;
    const place = R.place?.[name] || 0;
    const st = statsMap[name] || {};
    const leveled = m.level > (R.levels?.[name] || 0);
    const first = place === 1 && n >= 2;
    const second = place === 2 && n >= 3;
    const mine = name === youName;
    const badge = badgeFor(name, statsMap);
    const mini = D.CLASSES[m.cls]?.img;
    const cells = [
      ['Damage', st.dealt || 0],
      ['Kills', st.kills || 0],
      ['Blocked', st.blocked || 0],
      ['Healed', st.healed || 0],
      ['Taken', st.taken || 0],
      ['Gold', R.gold?.[name] ?? 0],
    ];
    return h('article', { class: `brag-card ${first ? 'gold' : ''} ${second ? 'silver' : ''} ${mine ? 'you' : ''} ${first ? 'lead' : ''}` },
      h('span', { class: 'brag-medal', 'aria-hidden': 'true' }, placeWord(place) ? (place === 1 ? '1' : '2') : ''),
      h('div', { class: 'brag-mini' }, mini
        ? h('img', { src: mini, alt: '', draggable: 'false' })
        : h('span', { class: 'brag-glyph' }, D.CLASSES[m.cls]?.glyph || '')),
      h('div', { class: 'brag-who' },
        h('b', {}, name),
        h('small', {}, `Level ${m.level}`, leveled ? h('em', { class: 'brag-lvl' }, 'Level up!') : null)),
      h('div', { class: 'brag-pts' }, h('b', {}, String(R.points?.[name] || 0)), h('small', {}, 'points')),
      badge ? h('div', { class: 'brag-badge' }, badge) : null,
      h('dl', { class: 'brag-grid' }, cells.flatMap(([label, val]) => [
        h('div', {}, h('dt', {}, label), h('dd', {}, String(val))),
      ])));
  });

  host = h('div', { id: 'brag', class: 'brag-layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Brag board' },
    h('div', { class: 'brag-sheet' },
      h('header', { class: 'brag-head' },
        eyebrow(R.questName || 'The road'),
        h('h1', { class: 'brag-title' }, 'Victory'),
        h('p', { class: 'brag-lead' }, n >= 2 && lead ? `${lead} did the most this battle.` : 'The way is open.'),
        flourish()),
      h('div', { class: 'brag-list' }, cards),
      h('div', { class: 'brag-cta' },
        btn('Onward', () => { onOnward?.(); }, { big: true, cls: 'wide', icon: 'chevron', iconAfter: true, aria: 'Close the brag board' }))));
  document.body.append(host);
  return closeBrag;
}
