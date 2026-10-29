// Magic cards mockup (Crockpot / Grok Bot, 29 Oct 2026). MOCKUP ONLY. Numbers come from the live engine/data at each level.
import { h } from '../../../../js/dom.js';
import * as HK from '../../../../js/g3/hudkit.js';
import * as E from '../../../../js/engine.js';
import * as D from '../../../../js/data.js';
import { glyph } from '../../../../js/g3/powers.js';
import { drawSym } from '../../../../js/gfx/dice/faces.js';
const q = new URLSearchParams(location.search); const sel = q.get('p') || 'aimed'; const variant = q.get('v') || 'float'; const charges = +(q.get('c') || 2);
const cards = D.CLASSES.ranger.cards || D.CLASSES.ranger.powers || [];
const card = (id) => (Array.isArray(cards) ? cards : Object.values(cards)).find((c) => c.id === id);
const SVG = 'http://www.w3.org/2000/svg';
// Magic dice colour code (Dave, 29 Oct): orange = pierce, purple = magic, green = health, yellow = gold. A d6 shows its largest face, six pips.
const DIE_COL = { pierce: ['#ff8a1a', '#8a3c00', '#2a1200'], magic: ['#a64dff', '#4a1c80', '#fff'], heal: ['#38e87a', '#106a34', '#06240f'], gold: ['#ffd21a', '#8a6a00', '#2a1e00'] };
const d6 = (fx = 'pierce') => { const [f, e, p] = DIE_COL[fx]; const s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `d6 d6-${fx}`); s.setAttribute('aria-label', `d6 for ${fx}`);
  s.innerHTML = `<rect x="2" y="2" width="20" height="20" rx="4.5" fill="${f}" stroke="${e}" stroke-width="1.6"/><g fill="${p}">${[7.3, 16.7].flatMap((x) => [6.8, 12, 17.2].map((y) => `<circle cx="${x}" cy="${y}" r="1.9"/>`)).join('')}</g>`; return s; };
const mg = (n) => h('span', { class: 'pc' }, HK.icon('magic'), String(n));
const to = () => h('span', { class: 'to' }, '→');
const LV_COST = D.POWER_UPGRADE; // gold for level 2 and 3 on the card (engine levels 1, 2)
// each power's printed rows, per engine level 0/1/2 (card Levels I/II/III)
const ROWS = {
  aimed: (l) => { const k = card('aimed'); const lo = E.powerDice(k, k.cost, l), hi = E.powerDice(k, k.max, l);
    return [h('span', { class: 'ln' }, mg(1), h('span', { class: 'to' }, '='), ...Array.from({ length: lo }, () => d6('pierce'))), h('span', { class: 'mx' }, 'UP TO', ...Array.from({ length: hi }, () => d6('pierce')))]; },
  quickdraw: (l) => [h('span', { class: 'ln' }, HK.icon('reroll'), h('span', { class: 'big' }, `${2 + l}`)), h('span', { class: 'mx' }, 'FREE REROLLS')],
  volley: (l) => { const k = card('volley'); return [h('span', { class: 'dots' }, [1, 2, 3, 4].map((n) => h('span', { class: `dot ${l === 0 && n > charges ? 'g' : ''}` }, String(E.chargeGain(k, n, l).pierce)))), HK.icon('pierce')]; },
};
const NAMES = { aimed: 'Aimed Shot', quickdraw: 'Quick Draw', volley: 'Volley' };
const KICK = { aimed: '1 magic per die', quickdraw: 'every round', volley: 'store · release' };
// Corner stamps: the same embossed metal symbol as the camp cardboard cards (js/g3/cardboard.js emblems(): INSETS, size 34, dark + light offsets,
// steel gradient, a tint over it), here the magic triangle in all four sockets with a purple tint (cardboard.js uses 0.14; 0.32 so it reads purple).
function corners() {
  const W = 720, H = 1052, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'stamps'; const g = c.getContext('2d', { willReadFrequently: true });
  const INSETS = [[63, 60], [655.5, 60], [61.5, 981], [657, 981]]; const size = 34, n = 68, kind = 'magic', tint = '#a64dff';
  INSETS.forEach(([x, y]) => { const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d', { willReadFrequently: true });
    qg.fillStyle = '#000'; drawSym(qg, kind, n / 2, n / 2, size, 0, true); const d = qg.getImageData(0, 0, n, n).data;
    let x0 = n, x1 = -1, y0 = n, y1 = -1; for (let j = 0; j < n * n; j++) if (d[j * 4 + 3] > 0) { const px = j % n, py = (j / n) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const ox = x - (x0 + x1 + 1) / 2 + n / 2, oy = y - (y0 + y1 + 1) / 2 + n / 2;
    const ink = (fill, dx, dy) => { g.fillStyle = fill; drawSym(g, kind, ox + dx, oy + dy, size, 0, true); };
    g.save(); ink('#000000b0', 1.2, 1.2); ink('#e8e2d0a0', -1.2, -1.2);
    qg.clearRect(0, 0, n, n); const m = qg.createLinearGradient(n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    qg.fillStyle = m; drawSym(qg, kind, n / 2, n / 2, size, 0, true); qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.32; qg.fillStyle = tint; qg.fillRect(0, 0, n, n);
    g.drawImage(q, ox - n / 2, oy - n / 2); g.restore(); });
  return c;
}
function powerCard() {
  const k = card(sel); const rows = [0, 1, 2].map((l) => h('div', { class: `lv ${l === 0 ? 'act' : ''}`, 'data-l': l },
    h('span', { class: 'rn' }, ['I', 'II', 'III'][l]), h('span', { class: 'sy' }, ROWS[sel](l)),
    l ? h('div', { class: 'cov' }, h('span', { class: 'lvw' }, `Level ${['I', 'II', 'III'][l]}`, sel === 'aimed' ? h('span', { class: 'cdice' }, h('span', { class: 'pc' }, HK.icon('magic'), '1'), h('span', { class: 'eq' }, '='), ...Array.from({ length: E.powerDice(card('aimed'), 1, l) }, () => d6('pierce'))) : null), h('span', { class: 'cp' }, h('i', { class: 'coin' }), h('b', {}, String(LV_COST[l - 1])))) : null));
  return h('div', { class: 'card purple' }, h('i', { class: 'under' }), corners(), h('img', { class: 'fr', src: '../../../../assets/cards/frame-t17.webp', alt: '' }),
    h('div', { class: 'field' }, h('div', { class: 'plaque' }, NAMES[sel]), (sel === 'aimed' ? h('div', { class: 'paint' }, h('img', { src: 'art/aimed-shot.webp', alt: '' })) : null), h('div', { class: `art ${sel === 'aimed' ? 'small' : ''}` }, glyph(k)), h('div', { class: 'kick' }, KICK[sel]), h('div', { class: 'levels' }, rows)));
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
