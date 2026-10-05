// Inline SVG icon set for the non-battle screens (no emoji). 24x24, drawn with strokes in currentColor.
// ico('sword') -> <span class="ico"><svg…></span>;  icoHtml('sword') -> string.
const P = {
  sword: '<path d="M19.5 4.5l-9.2 9.2-1.8-1.8L17.7 2.7z" fill="currentColor" fill-opacity=".18"/><path d="M19.5 4.5l-9.2 9.2M7.2 11.2l5.6 5.6M8.6 15.4L4.6 19.4"/><circle cx="4" cy="20" r="1.1" fill="currentColor"/>',
  shield: '<path d="M12 3l7.5 3v5.2c0 4.8-3.1 8-7.5 9.8-4.4-1.8-7.5-5-7.5-9.8V6z" fill="currentColor" fill-opacity=".14"/><path d="M12 7v10M8 11h8"/>',
  bow: '<path d="M6 3.5c10 2.2 10 14.8 0 17"/><path d="M6 3.5v17M6 12h14.5M17.5 9l3 3-3 3"/>',
  star: '<path d="M12 2.8l2.3 6.9 6.9 2.3-6.9 2.3L12 21.2l-2.3-6.9L2.8 12l6.9-2.3z" fill="currentColor" fill-opacity=".16"/>',
  axe: '<path d="M12 3.5V21"/><path d="M12 5.5c4.2-1.6 7.8.4 8.2 4-3.6 1.6-7.4.6-8.2-1.8z" fill="currentColor" fill-opacity=".16"/><path d="M12 5.5C9 5 6.5 6.5 6 9"/>',
  lute: '<circle cx="8.8" cy="15.2" r="5" fill="currentColor" fill-opacity=".14"/><circle cx="8.8" cy="15.2" r="1.3"/><path d="M12.4 11.6L19.5 4.5M17.5 3.5l3 3"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.3 4.3 0 0112 7.8a4.3 4.3 0 017.5 2.3c0 5.8-7.5 10.4-7.5 10.4z" fill="currentColor" fill-opacity=".16"/>',
  spark: '<path d="M12 3l9.4 17H2.6z" fill="currentColor"/>',
  reroll: '<path d="M4.5 12a7.5 7.5 0 0112.9-5.2L20 9.2M20 4.5v4.7h-4.7M19.5 12a7.5 7.5 0 01-12.9 5.2L4 14.8M4 19.5v-4.7h4.7"/>',
  boot: '<path d="M8 3.5h6V12c0 1.6 1.4 2.4 4 3.2 1.8.6 2.5 1.7 2.5 3.3V20H4v-5c0-1.6 3-2.4 4-4z" fill="currentColor" fill-opacity=".2"/>',
  coin: '<circle cx="12" cy="12" r="9" fill="currentColor"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" fill-opacity=".12"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>',
  flame: '<path d="M12.2 2.8c.6 3.8 5.4 5.8 5.4 11a5.6 5.6 0 01-11.2 0c0-2 .9-3.4 2.3-4.6.1 1.9.9 3 2 3.4-.5-3.2-.2-6.3 1.5-9.8z" fill="currentColor" fill-opacity=".2"/>',
  hammer: '<path d="M13.5 4.5l6 6-3 3-6-6z" fill="currentColor" fill-opacity=".2"/><path d="M11.5 9.2L3.8 17l3.2 3.2 7.8-7.7"/><path d="M12.5 3.5l2 2M18.5 9.5l2 2"/>',
  bag: '<path d="M6.2 8.5h11.6l1.1 11.5H5.1z" fill="currentColor" fill-opacity=".14"/><path d="M9 8.5V7a3 3 0 016 0v1.5M9.5 13.5h5"/>',
  scroll: '<path d="M7.5 3.8h10a2 2 0 012 2V17a3.2 3.2 0 01-3.2 3.2H7.8A3.2 3.2 0 014.6 17V6.7a2.9 2.9 0 012.9-2.9z" fill="currentColor" fill-opacity=".12"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>',
  tent: '<path d="M2.8 20L12 4l9.2 16z" fill="currentColor" fill-opacity=".14"/><path d="M12 20v-6.5M9 20l3-6.5 3 6.5"/>',
  map: '<path d="M9 4.5l6 2 5.2-2v14l-5.2 2-6-2-5.2 2v-14z" fill="currentColor" fill-opacity=".12"/><path d="M9 4.5v14M15 6.5v14"/>',
  skull: '<path d="M12 3a7.2 7.2 0 00-7.2 7.2c0 2.6 1.2 4.2 3.2 5.2V19h8v-3.6c2-1 3.2-2.6 3.2-5.2A7.2 7.2 0 0012 3z" fill="currentColor" fill-opacity=".14"/><circle cx="9.2" cy="10.8" r="1.5" fill="currentColor"/><circle cx="14.8" cy="10.8" r="1.5" fill="currentColor"/><path d="M10.5 15.5v2M13.5 15.5v2"/>',
  crown: '<path d="M3.5 18.5l-1-10.5 5.2 4.3L12 5l4.3 7.3 5.2-4.3-1 10.5z" fill="currentColor" fill-opacity=".2"/><path d="M4 21h16"/>',
  key: '<circle cx="8" cy="15.5" r="4.2" fill="currentColor" fill-opacity=".14"/><circle cx="8" cy="15.5" r="1.2"/><path d="M11 12.5L20 3.5M16.5 7l3 3M14 9.5l2.2 2.2"/>',
  people: '<circle cx="8" cy="8.5" r="2.7"/><circle cx="16.4" cy="9.4" r="2.2"/><path d="M2.8 19.5c0-3.3 2.4-5.4 5.2-5.4s5.2 2.1 5.2 5.4M13.4 15.2c.9-.5 1.9-.7 3-.5 2.6.4 4.2 2.2 4.2 4.8"/>',
  book: '<path d="M3.8 5.2c3-1 5.8-.8 8.2 1 2.4-1.8 5.2-2 8.2-1v13.2c-3-1-5.8-.8-8.2 1-2.4-1.8-5.2-2-8.2-1z" fill="currentColor" fill-opacity=".1"/><path d="M12 6.2v13"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.6 4.6L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor" fill-opacity=".14"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  hero: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.2 7.5-6.2s7.5 2.2 7.5 6.2" fill="currentColor" fill-opacity=".12"/>',
  pin: '<path d="M12 21.5s7-6 7-11.5a7 7 0 00-14 0c0 5.500 7 11.500 7 11.500z" fill="currentColor" fill-opacity=".14"/><circle cx="12" cy="10" r="2.4"/>',
  burst: '<path d="M12.00 1.50 L14.22 6.64 L19.42 4.58 L17.36 9.78 L22.50 12.00 L17.36 14.22 L19.42 19.42 L14.22 17.36 L12.00 22.50 L9.78 17.36 L4.58 19.42 L6.64 14.22 L1.50 12.00 L6.64 9.78 L4.58 4.58 L9.78 6.64 Z" fill="currentColor"/>',
  pierce: '<path d="M12 2.5l8.6 9.2h-5.6V21.5H9V11.7H3.4z" fill="currentColor"/>',
  stagger: '<path d="M12 2.5l2.2 6 6.3-2.2-4.3 5.200 6 3-7 1 1.300 7.500-4.500-5.500-4.500 5.500 1.300-7.500-7-1 6-3-4.300-5.200 6.300 2.200z" fill="currentColor" fill-opacity=".2"/>',
  plus: '<path d="M8.5 3.500h7v5h5v7h-5v5h-7v-5h-5v-7h5z" fill="currentColor" fill-opacity=".22"/>',
  bolt: '<path d="M13.500 2L5 13.500h6.200L10 22l9-12h-6.400z" fill="currentColor" fill-opacity=".22"/>',
  sound: '<path d="M4 9.500v5h3.800l5.200 4V5.500l-5.200 4z" fill="currentColor" fill-opacity=".16"/><path d="M16.200 8.800c1.600 1.700 1.600 4.700 0 6.400M18.800 6.200c3 3.100 3 8.500 0 11.600"/>',
  mute: '<path d="M4 9.500v5h3.800l5.200 4V5.500l-5.200 4z" fill="currentColor" fill-opacity=".16"/><path d="M16.500 9.500l5 5M21.500 9.500l-5 5"/>',
  help: '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".1"/><path d="M9.500 9.500a2.600 2.600 0 115 .9c0 1.800-2.500 2-2.500 4"/><circle cx="12" cy="17.300" r=".9" fill="currentColor"/>',
  d4: '<path d="M12 3L22 20H2z" fill="currentColor" fill-opacity=".14"/><path d="M12 3v10.500M2 20l10-6.500L22 20"/>',
  d6: '<path d="M12 2.300l8.700 5v9.400l-8.700 5-8.700-5V7.300z" fill="currentColor" fill-opacity=".14"/><path d="M3.300 7.300l8.700 5 8.700-5M12 12.300v9.400"/>',
  d8: '<path d="M12 2l8.300 10-8.300 10L3.700 12z" fill="currentColor" fill-opacity=".14"/><path d="M3.700 12h16.600M7.800 7l4.200 15 4.200-15M12 2l4.200 5H7.800z"/>',
  d10: '<path d="M12 2l9.300 7.200L18 20.500H6L2.700 9.200z" fill="currentColor" fill-opacity=".14"/><path d="M2.700 9.200L12 12.500l9.300-3.300M12 12.500v8M6 20.500l6-8 6 8M7.500 5.500L12 12.500l4.500-7"/>',
  shine: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500L18 18M18 6l-2.500 2.500M8.500 15.500L6 18"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  road: '<path d="M8 21L10.500 3M16 21L13.500 3M12 6v2.500M12 11.500v2.500M12 17v2.500"/>',
  anvil: '<path d="M3.500 9h13.500c0 3-2.500 4-4 4v2.500h3V19H7v-3.500h3V13c-3 0-6.500-1.500-6.500-4z" fill="currentColor" fill-opacity=".18"/><path d="M17 9c1.800 0 3-.8 3.500-2"/>',
};
const SVG = (inner, size) => `<svg viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
export const icoHtml = (name, size) => SVG(P[name] || P.dice, size);
export function ico(name, cls = '', size) {
  const s = document.createElement('span'); s.className = `ico ico-${name} ${cls}`.trim(); s.innerHTML = SVG(P[name] || P.dice, size); return s;
}
export const CLASS_ICON = { knight: 'sword', ranger: 'bow', wizard: 'star', dwarf: 'axe', bard: 'lute' };
export const dieIcon = (n) => ico(`d${n}`, 'die-ico');
export const hasIcon = (n) => !!P[n];
