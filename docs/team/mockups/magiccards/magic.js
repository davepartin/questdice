// Magic cards mockup (Crockpot / Grok Bot, 29 Oct 2026). MOCKUP ONLY. Numbers come from the live engine/data at each level.
import { h } from '../../../../js/dom.js';
import * as HK from '../../../../js/g3/hudkit.js';
import * as E from '../../../../js/engine.js';
import * as D from '../../../../js/data.js';
import { glyph } from '../../../../js/g3/powers.js';
const q = new URLSearchParams(location.search); const sel = q.get('p') || 'aimed'; const variant = q.get('v') || 'float'; const charges = +(q.get('c') || 2);
const cards = D.CLASSES.ranger.cards || D.CLASSES.ranger.powers || [];
const card = (id) => (Array.isArray(cards) ? cards : Object.values(cards)).find((c) => c.id === id);
const SVG = 'http://www.w3.org/2000/svg';
const d6 = () => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'd6');
  s.innerHTML = '<rect x="2" y="2" width="20" height="20" rx="4.5" fill="#fffaf0" stroke="#2a1a0a" stroke-width="1.8"/><g fill="#2a1a0a"><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="7.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/></g>'; return s; };
const mg = (n) => h('span', { class: 'pc' }, HK.icon('magic'), String(n));
const to = () => h('span', { class: 'to' }, '→');
const LV_COST = D.POWER_UPGRADE; // gold for level 2 and 3 on the card (engine levels 1, 2)
// each power's printed rows, per engine level 0/1/2 (card Levels I/II/III)
const ROWS = {
  aimed: (l) => { const k = card('aimed'); const lo = E.powerDice(k, k.cost, l), hi = E.powerDice(k, k.max, l);
    return [h('span', { class: 'ln' }, mg(1), h('span', { class: 'to' }, '='), ...Array.from({ length: lo }, d6), to(), HK.icon('pierce')), h('span', { class: 'mx' }, `UP TO ${hi}`, d6())]; },
  quickdraw: (l) => [h('span', { class: 'ln' }, HK.icon('reroll'), h('span', { class: 'big' }, `${2 + l}`)), h('span', { class: 'mx' }, 'FREE REROLLS')],
  volley: (l) => { const k = card('volley'); return [h('span', { class: 'dots' }, [1, 2, 3, 4].map((n) => h('span', { class: `dot ${l === 0 && n > charges ? 'g' : ''}` }, String(E.chargeGain(k, n, l).pierce)))), HK.icon('pierce')]; },
};
const NAMES = { aimed: 'Aimed Shot', quickdraw: 'Quick Draw', volley: 'Volley' };
const KICK = { aimed: '1 magic per die', quickdraw: 'every round', volley: 'store · release' };
function powerCard() {
  const k = card(sel); const rows = [0, 1, 2].map((l) => h('div', { class: `lv ${l === 0 ? 'act' : ''}`, 'data-l': l },
    h('span', { class: 'rn' }, ['I', 'II', 'III'][l]), h('span', { class: 'sy' }, ROWS[sel](l)),
    l ? h('div', { class: 'cov' }, h('span', { class: 'lvw' }, `Level ${['I', 'II', 'III'][l]}`), h('span', { class: 'cp' }, h('i', { class: 'coin' }), h('b', {}, String(LV_COST[l - 1])))) : null));
  return h('div', { class: 'card' }, h('i', { class: 'under' }), h('img', { class: 'fr', src: '../../../../assets/cards/frame-t17.webp', alt: '' }),
    h('div', { class: 'field' }, h('div', { class: 'plaque' }, NAMES[sel]), h('div', { class: 'art' }, glyph(k)), h('div', { class: 'kick' }, KICK[sel]), h('div', { class: 'levels' }, rows)));
}
const useBtns = () => sel === 'volley' ? [h('button', { class: 'use rel' }, `Release ${charges}`), h('button', { class: 'use' }, 'Store', HK.icon('magic'), '1')]
  : [h('button', { class: 'use' }, 'Use', HK.icon('magic'), sel === 'aimed' ? '1' : '1')];
const hero = { name: 'Dave', cls: 'ranger' };
const slots = [['aimed', 'Aimed Shot', 1], ['quickdraw', 'Quick Draw', 1], ['volley', 'Volley', 1], ['u:bigheal', 'Potion', 0], ['u:heal', 'Heal', 2], ['u:heart', 'Heart change', 3]];
const app = document.getElementById('app'); app.classList.add(`v-${variant}`);
const stage = h('div', { class: 'stage' }, powerCard());
app.append(
  h('div', { class: 'top' }, h('h1', {}, `${hero.name} · Ranger`), h('button', { class: 'close' }, 'Close')),
  h('div', { class: 'bank' }, h('div', { class: 'h' }, HK.icon('heal'), h('b', {}, '52'), h('small', {}, '/ 60 HEALTH')), h('div', { class: 'm' }, HK.icon('magic'), h('b', {}, '6'), h('small', {}, '/ 16 MAGIC'))),
  h('div', { class: 'grid' }, slots.map(([id, n, c]) => h('div', { class: `slot ${id === sel ? 'on' : ''}` }, glyph({ id }), n, c ? h('span', { class: 'cost' }, HK.icon('magic'), String(c)) : h('span', { class: 'cost', style: 'color:#7cf0a6' }, 'FREE')))),
  stage, h('div', { class: 'tag' }, 'MOCKUP'));
requestAnimationFrame(() => requestAnimationFrame(() => {
  const c = stage.querySelector('.card'); const act = c.querySelector('.lv.act'); const cr = c.getBoundingClientRect(); const ar = act.getBoundingClientRect();
  if (variant === 'float') { const wrap = h('div', { class: 'float', style: `top:${ar.top - cr.top + ar.height / 2}px;display:flex;flex-direction:column;gap:6px` }, useBtns()); c.append(wrap); }
  else { const rail = h('div', { class: 'rail' }); stage.append(rail); const btns = useBtns(); const H = 44, gap = 6; const mid = ar.top - cr.top + ar.height / 2; const tot = btns.length * H + (btns.length - 1) * gap;
    btns.forEach((b, i) => { b.style.top = `${mid - tot / 2 + i * (H + gap)}px`; rail.append(b); }); }
}));
