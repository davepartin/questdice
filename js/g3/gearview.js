// "Your gear" (Dave, 27 Oct 2026: in the daily challenge you cannot see what you carry): the camp's dice grid and the card behind each die, LOOK ONLY. Opened from a
// battle's menu and from tapping a hero's name under its miniature. Nothing here can buy, sell, equip or change anything, so it is safe in the middle of a fight.
import { h, modal } from '../dom.js';
import * as E from '../engine.js';
import { GRID } from '../campbuy.js';
import { campDie } from './campart.js';
import { strengthCard, talentsCard, heartCard, weaponCard } from './cardboard.js';
import { toast } from '../dom.js';

const KIND = { N: 'head', W: 'hand', E: 'hand', S: 'feet' };
const say = () => toast('Upgrades happen at camp.');
function cardFor(hero, slot) {
  if (!E.isActive(hero, slot)) return h('p', { class: 'muted gv-note' }, 'This die is not unlocked yet. Unlock it at camp.');
  if (slot === 'C') return h('div', {}, heartCard(hero, { say, onGrow: say }), h('p', { class: 'muted gv-note' }, `Heart level ${E.heartRankOf(hero)} of 3.`));
  if (slot === 'SW' || slot === 'SE') return talentsCard(hero, slot, { say, onFace: say, onGrow: say, onUnlock: say });
  if (slot === 'NW' || slot === 'NE') { const inst = hero.loadout[slot]; return inst ? weaponCard(hero, slot, inst, { say }) : h('p', { class: 'muted gv-note' }, 'Nothing in this hand.'); }
  return strengthCard(hero, slot, { say, onGrow: say });
}
export function openGear(hero, { slot = 'NW' } = {}) {
  if (!hero) return null; E.ensureTwin?.(hero);
  let cur = slot; let close = () => {}; const body = h('div', { class: 'form gv' });
  function render() {
    const cells = GRID.map(([s, label]) => {
      const active = E.isActive(hero, s); const size = E.sidesOf(hero, s);
      return h('button', { class: `cw-cell s-${s} ${active ? '' : 'off'} ${cur === s ? 'selected' : ''}`, type: 'button', 'aria-pressed': String(cur === s), 'aria-label': `${label}, ${active ? `d${size}` : 'locked'}`,
        onclick: () => { cur = s; render(); } },
      h('small', { class: 'cw-label' }, label), active ? campDie(hero, s, size) : h('span', { class: 'cw-locked' }, '🔒'), h('span', { class: 'cw-cell-foot' }, h('b', {}, active ? `d${size}` : 'Locked')));
    });
    body.replaceChildren(h('h2', {}, `${hero.name}: your gear`), h('p', { class: 'muted' }, 'Look only. Tap a die to see its card. Upgrades happen at camp.'),
      h('section', { class: 'cw-dicegrid', 'aria-label': 'Your character dice' }, h('div', { class: 'cw-board' }, cells)),
      h('div', { class: 'cw-inspector gv-card' }, cardFor(hero, cur)),
      h('div', { class: 'row end' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => close() }, 'Close')));
  }
  render(); close = modal(body); return close;
}
