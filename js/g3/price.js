// The one price chip (Dave, 26 Oct 2026: "it should be universal across the game ... dark brown background with a yellow coin and yellow cost.
// Looks like a board game"). Every gold COST in the game draws this chip: the Talents card covers, camp dice-grid tiles, Add this die, the
// Forge rows, the spoils and pack Sell buttons, the Camp Store tags, the weapon card's sell badge. poor = you are short: same chip, red number
// and red rim. Sizes are in em, so a chip follows the font size of the place it sits in (cards set it in cqi). Styles: css/price.css.
import { h } from '../dom.js';
export function priceChip(n, { poor = false, cls = '' } = {}) {
  return h('span', { class: `qd-price ${poor ? 'poor' : ''} ${cls}`.trim(), 'data-price': String(n) }, h('i', { class: 'qd-coin', 'aria-hidden': 'true' }), h('b', {}, String(n)));
}
// the same chip as an HTML string (the card renderer in cards.js builds its cards as strings)
export const priceChipHtml = (n, { poor = false, cls = '' } = {}) => `<span class="qd-price${poor ? ' poor' : ''}${cls ? ` ${cls}` : ''}" data-price="${String(n).replace(/[^0-9-]/g, '')}"><i class="qd-coin" aria-hidden="true"></i><b>${String(n).replace(/[^0-9-]/g, '')}</b></span>`;
