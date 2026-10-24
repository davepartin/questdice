// CONCEPT (docs only, T13). The approved PR #39 card (renderCard) with a d10-ready face grid, a metal treatment and compact views
// (reward, pack row, camp shelf) that share the same identity. Every word and number is live text from the game's data.
import './roster.js'; // applyRelease() first: the released game's faces (see roster.js)
import { WEAPONS, RARITY, BAG_MAX } from '../../../../js/data.js';
import { weaponValue } from '../../../../js/engine.js';
import { renderCard, weaponData, SYM } from './card-template.js';
export { weaponData };
const ART = new URL('../weapons/art/', import.meta.url).href;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// attack = the game's red starburst, block = its blue shield (same shapes as the dice, js/gfx/dice/dice.js:37). Shape AND a word.
export const ico = (k, cls = '') => { const s = SYM[k] || SYM.star; return `<svg class="${cls}" viewBox="0 0 24 24" style="color:${s.c}" aria-hidden="true"><path fill="currentColor" d="${s.d}"/></svg>`; };
const KIND = { r: { k: 'atk', w: 'ATK', long: 'attack' }, b: { k: 'block', w: 'BLK', long: 'block' } };
// One face: "+N" as the die prints it (dice.js:37 labels every weapon face "+N"; a +0 still sends the hand's number), the attack/block
// mark and word, then its bonus icons repeated as on the die (pierce 2 = two arrows, dice.js:38).
export function face(f) {
  const K = KIND[f.c === 'b' ? 'b' : 'r'];
  const icons = [...Array(f.plus || 0).fill(K.k), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(k === 'loot' ? 'gold' : k))];
  const head = f.arrow ? `<i class="ah am-${f.arrow}">${ico('arrow')}</i>` : ''; // arrowhead face: the selected ammo pays (WEAPONS2.arrowRules)
  return `<div class="f13 ${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}" aria-label="${f.arrow ? f.arrow + ' arrowhead, ' : ''}${K.long} +${f.v}${icons.length ? ', ' + icons.join(' ') : ''}">
    <span class="k">${ico(K.k)}<em>${K.w}</em></span><b>${head}+${f.v}</b><span class="fx">${icons.map((k) => ico(k)).join('')}</span></div>`;
}
// money: { label: 'Sell' | 'Store', value } so a card never shows an unexplained gold number (Astra, T14)
export function weaponCard(d, money) {
  const c = renderCard('weapon', money ? { ...d, moneyLabel: money.label, money: money.value } : d);
  c.classList.add('t13', `metal-${d.metal.toLowerCase()}`);
  const n = c.querySelector('.name'); n.innerHTML = `<span>${n.innerHTML}</span>`;
  c.querySelector('.faces').outerHTML = `<div class="faces13 n${d.faces.length}">${d.faces.map(face).join('')}</div>`;
  return c;
}
// the 64 / 128 px icon export of the same painted master (WEAPON_ART.md); a type with no art yet gets a labelled silhouette
const ICON = { dagger: 'dagger', sword: 'sword', mace: 'mace', axe: 'axe', spear: 'spear', shield: 'shield', tower: 'tower', bow: 'bow', quiver: 'quiver' };
// small icons use the baked steel-only tints (wood and leather keep their colour); a legendary falls back to the neutral icon
export const icon = (d, px = 128) => (ICON[d.id] ? `<img class="ic13" src="${ART}${ICON[d.id]}-${['Bronze', 'Silver', 'Gold'].includes(d.metal) && d.id !== 'mace' ? d.metal.toLowerCase() + '-' : ''}${px}.webp" alt="">`
  : `<span class="ic13 ph13" title="art to come">${esc(d.name.slice(0, 1))}</span>`);
export const strip = (d) => `<div class="strip13">${d.faces.map((f) => `<i class="${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}">${ico(f.c === 'b' ? 'block' : 'atk')}${f.v}${(f.plus || Object.keys(f.fx || {}).length) ? '<u></u>' : ''}</i>`).join('')}</div>`;
export const chips = (d) => `<span class="ch13 m-${d.metal.toLowerCase()}">${esc(d.metal)}</span><span class="ch13">d${d.size}</span><span class="ch13">${esc(d.wear)}</span>`;
export const price = (d) => weaponValue({ id: d.id, rarity: RARITY.indexOf(d.metal), size: d.size });
export { BAG_MAX, WEAPONS };

// T16: faces drawn by the game's own die-face renderer (dieface.js), in the die's real shape. Under each face: the attack starburst or
// block shield (shape, not only colour) and the bonus icons from weaponFaces(), since the small corner pips do not survive at card size.
export async function weaponCardDie(d, money, mode = 'die') {
  const { weaponSpec, faceOf } = await import('./dieface.js');
  const c = weaponCard(d, money); const spec = weaponSpec(d.id, ['Bronze', 'Silver', 'Gold'].indexOf(d.metal), d.size, d.ammo);
  const urls = await Promise.all(d.faces.map((_, i) => faceOf(spec, i + 1, mode)));
  c.querySelector('.faces13').outerHTML = `<div class="dfaces n${d.faces.length}${mode === 'ladder' ? ' ladder' : ''}">${d.faces.map((f, i) => {
    const K = f.c === 'b' ? 'block' : 'atk'; const icons = [...Array(f.plus || 0).fill(K), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(k === 'loot' ? 'gold' : k))];
    return `<div class="df ${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}"><img src="${urls[i]}" alt="${K === 'atk' ? 'attack' : 'block'} +${f.v}"><span class="dk">${ico(K)}${f.arrow ? `<i class="ah am-${f.arrow}">${ico('arrow')}</i>` : ''}${icons.map((k) => ico(k)).join('')}</span></div>`; }).join('')}</div>`;
  return c;
}
