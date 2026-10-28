// "Your gear" (Dave, 27 Oct 2026: in the daily challenge you cannot see what you carry): the camp's dice grid and the card behind each die, LOOK ONLY. Opened from a
// battle's menu, the daily screens, and by tapping a hero (the miniature or its name plate). Nothing here can buy, sell, equip or change anything, so it is safe in a fight.
// Dave, 28 Oct: the nine boxes are small and the whole card fits on the screen without scrolling: the card is scaled down to the space that is left (fitCard).
import { h, modal, toast } from '../dom.js';
import * as E from '../engine.js';
import { GRID } from '../campbuy.js';
import { campDie } from './campart.js';
import { strengthCard, talentsCard, heartCard, weaponCard } from './cardboard.js';

const say = () => toast('Upgrades happen at camp.');
function cardFor(hero, slot) {
  if (!E.isActive(hero, slot)) return h('p', { class: 'muted gv-note' }, 'This die is not unlocked yet. Unlock it at camp.');
  if (slot === 'C') return heartCard(hero, { say, onGrow: say });
  if (slot === 'SW' || slot === 'SE') return talentsCard(hero, slot, { say, onFace: say, onGrow: say, onUnlock: say });
  if (slot === 'NW' || slot === 'NE') { const inst = hero.loadout[slot]; return inst ? weaponCard(hero, slot, inst, { say }) : h('p', { class: 'muted gv-note' }, 'Nothing in this hand.'); }
  return strengthCard(hero, slot, { say, onGrow: say });
}
const viewH = () => Math.floor(window.visualViewport?.height || window.innerHeight || 640);
export function openGear(hero, { slot = 'NW' } = {}) {
  if (!hero) return null; E.ensureTwin?.(hero);
  let cur = slot; let close = () => {}; let ro = null;
  const body = h('div', { class: 'gv' });
  const fit = h('div', { class: 'gv-fit' }); const box = h('div', { class: 'gv-card' }, fit);
  // scale the card so that the title, the nine boxes and the whole card are on screen at once
  function fitCard() {
    fit.style.transform = ''; box.style.height = '';
    const natural = Math.max(fit.offsetHeight, fit.scrollHeight) + 4; const w = fit.offsetWidth; if (!natural || !w) return;
    const frame = body.closest('.modal-card'); const chrome = frame ? frame.offsetHeight - body.offsetHeight : 0;
    const used = body.offsetHeight - box.offsetHeight + chrome; // title + grid + padding around the card
    const room = viewH() - 20 - used; const k = Math.max(0.3, Math.min(1, room / natural));
    fit.style.transformOrigin = 'top center'; fit.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : ''; box.style.height = `${Math.ceil(natural * k)}px`;
  }
  function render() {
    const cells = GRID.map(([s, label]) => {
      const active = E.isActive(hero, s); const size = E.sidesOf(hero, s);
      return h('button', { class: `cw-cell s-${s} ${active ? '' : 'off'} ${cur === s ? 'selected' : ''}`, type: 'button', 'aria-pressed': String(cur === s), 'aria-label': `${label}, ${active ? `d${size}` : 'locked'}`,
        onclick: () => { cur = s; render(); } },
      h('small', { class: 'cw-label' }, label), active ? campDie(hero, s, size) : h('span', { class: 'cw-locked' }, '🔒'), h('span', { class: 'cw-cell-foot' }, h('b', {}, active ? `d${size}` : 'Locked')));
    });
    fit.replaceChildren(cardFor(hero, cur));
    body.replaceChildren(
      h('header', { class: 'gv-head' }, h('div', {}, h('h2', {}, `${hero.name}: your gear`), h('small', {}, 'Look only. Upgrades happen at camp.')), h('button', { type: 'button', class: 'gv-x', 'aria-label': 'Close', onclick: () => close() }, '✕')),
      h('section', { class: 'cw-dicegrid gv-grid', 'aria-label': 'Your character dice' }, h('div', { class: 'cw-board' }, cells)), box);
    requestAnimationFrame(fitCard);
    ro?.disconnect(); ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fitCard()) : null; ro?.observe(fit);
  }
  render(); close = modal(body); body.closest('.modal-card')?.classList.add('gv-modal'); requestAnimationFrame(fitCard);
  window.addEventListener('resize', fitCard);
  return close;
}
