// The pets (Dave, Oct 2026): five small, friendly companions drawn as inline SVG, coloured by the symbol they start with.
// petSvg('pup') -> an SVG string (100x100). Used at camp (the traveler's offer, the pet card) and as a sprite beside the
// pet die on the battle tray. Big eyes, round shapes, a little blush: cute, never scary.
import * as D from '../data.js';

const EYE = (x, y, r = 7) => `<ellipse cx="${x}" cy="${y}" rx="${r * 0.82}" ry="${r}" fill="#1b1424"/>`
  + `<circle cx="${x - r * 0.28}" cy="${y - r * 0.36}" r="${r * 0.36}" fill="#fff"/><circle cx="${x + r * 0.3}" cy="${y + r * 0.3}" r="${r * 0.16}" fill="#fff" opacity=".8"/>`;
const BLUSH = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="3.2" fill="#ff7c9c" opacity=".55"/>`;
const SMILE = (x, y, w = 4) => `<path d="M${x - w} ${y}q${w / 2} ${w * 0.8} ${w} 0q${w / 2} ${w * 0.8} ${w} 0" fill="none" stroke="#1b1424" stroke-width="2" stroke-linecap="round"/>`;
const SHADOW = '<ellipse cx="50" cy="93" rx="30" ry="5" fill="#000" opacity=".28"/>';

const ART = {
  // Ember Pup: a fox cub, warm red with a cream muzzle and a fluffy tail
  pup: () => `${SHADOW}
    <path d="M70 80c14 2 24-8 22-22-1-6-6-8-9-4 0 9-6 15-15 17z" fill="#ff5a4a" stroke="#7a1d14" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M86 56c3-2 6 0 6 4 0 3-1 6-3 8-2-4-3-8-3-12z" fill="#fff4e4"/>
    <ellipse cx="50" cy="76" rx="20" ry="15" fill="#ff5a4a" stroke="#7a1d14" stroke-width="2.5"/>
    <ellipse cx="50" cy="80" rx="11" ry="9" fill="#fff4e4"/>
    <path d="M22 38L20 10l20 14zM78 38l2-28-20 14z" fill="#ff5a4a" stroke="#7a1d14" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M25 30l-1-13 10 8zM75 30l1-13-10 8z" fill="#3a1410"/>
    <ellipse cx="50" cy="44" rx="30" ry="25" fill="#ff5a4a" stroke="#7a1d14" stroke-width="2.5"/>
    <path d="M24 50c8 0 14 6 26 6s18-6 26-6c-2 10-12 17-26 17S26 60 24 50z" fill="#fff4e4"/>
    ${EYE(38, 43)}${EYE(62, 43)}${BLUSH(29, 54)}${BLUSH(71, 54)}
    <ellipse cx="50" cy="54" rx="4" ry="3" fill="#1b1424"/>${SMILE(50, 58, 3.5)}`,
  // Shellback: a little turtle with a blue patterned shell
  turtle: () => `${SHADOW}
    <ellipse cx="28" cy="84" rx="8" ry="6" fill="#7fd6c2" stroke="#1d4d48" stroke-width="2.5"/><ellipse cx="72" cy="84" rx="8" ry="6" fill="#7fd6c2" stroke="#1d4d48" stroke-width="2.5"/>
    <path d="M14 76c0-22 16-36 36-36s36 14 36 36z" fill="#3aa4ff" stroke="#123a66" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M38 48l12-5 12 5 2 13-14 6-14-6zM18 72l8-14 12 3 2 13zM82 72l-8-14-12 3-2 13zM40 74l10-6 10 6" fill="#9ad3ff" opacity=".55" stroke="#123a66" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 76h76c0 4-3 6-6 6H18c-3 0-6-2-6-6z" fill="#cfe9ff" stroke="#123a66" stroke-width="2.5"/>
    <circle cx="50" cy="30" r="20" fill="#7fd6c2" stroke="#1d4d48" stroke-width="2.5"/>
    ${EYE(42, 28, 6)}${EYE(58, 28, 6)}${BLUSH(35, 37)}${BLUSH(65, 37)}${SMILE(50, 38, 3.5)}`,
  // Sprig: a soft bunny with mint ears and a leaf tucked on one ear
  bunny: () => `${SHADOW}
    <ellipse cx="38" cy="22" rx="8" ry="20" transform="rotate(-12 38 22)" fill="#f4fff6" stroke="#1d5a36" stroke-width="2.5"/>
    <ellipse cx="62" cy="22" rx="8" ry="20" transform="rotate(12 62 22)" fill="#f4fff6" stroke="#1d5a36" stroke-width="2.5"/>
    <ellipse cx="38" cy="23" rx="3.8" ry="13" transform="rotate(-12 38 23)" fill="#38e87a"/><ellipse cx="62" cy="23" rx="3.8" ry="13" transform="rotate(12 62 23)" fill="#38e87a"/>
    <path d="M66 8c8-6 18-4 20 2-6 6-15 6-20-2z" fill="#38e87a" stroke="#1d5a36" stroke-width="2"/><path d="M68 8c5 0 11 1 15 2" stroke="#1d5a36" stroke-width="1.5" fill="none"/>
    <ellipse cx="50" cy="76" rx="22" ry="15" fill="#f4fff6" stroke="#1d5a36" stroke-width="2.5"/>
    <circle cx="72" cy="80" r="6" fill="#fff" stroke="#1d5a36" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="27" ry="23" fill="#f4fff6" stroke="#1d5a36" stroke-width="2.5"/>
    ${EYE(40, 48)}${EYE(60, 48)}${BLUSH(31, 58)}${BLUSH(69, 58)}
    <path d="M47 56h6l-3 3z" fill="#ff7c9c"/>${SMILE(50, 61, 3)}
    <path d="M40 88c3-4 7-4 10 0M50 88c3-4 7-4 10 0" fill="none" stroke="#1d5a36" stroke-width="2"/>`,
  // Starling: a round little owl, violet, with ear tufts and a tiny star on its chest
  owl: () => `${SHADOW}
    <path d="M22 26l4-16 12 12zM78 26l-4-16-12 12z" fill="#b46cff" stroke="#3e1a6e" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="56" rx="32" ry="34" fill="#b46cff" stroke="#3e1a6e" stroke-width="2.5"/>
    <path d="M18 58c-6 6-6 16 2 20 2-8 3-14-2-20zM82 58c6 6 6 16-2 20-2-8-3-14 2-20z" fill="#8f45e6" stroke="#3e1a6e" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="68" rx="18" ry="18" fill="#efe2ff"/>
    <path d="M50 62l2 4.5 4.5.5-3.5 3 1 4.5-4-2.5-4 2.5 1-4.5-3.5-3 4.5-.5z" fill="#ffd34d"/>
    <circle cx="37" cy="42" r="12" fill="#efe2ff"/><circle cx="63" cy="42" r="12" fill="#efe2ff"/>
    ${EYE(37, 42, 7.5)}${EYE(63, 42, 7.5)}
    <path d="M46 50h8l-4 6z" fill="#ffb02e" stroke="#7a4a10" stroke-width="1.5" stroke-linejoin="round"/>
    ${BLUSH(27, 54)}${BLUSH(73, 54)}
    <path d="M40 89l3-4 3 4M54 89l3-4 3 4" fill="none" stroke="#ffb02e" stroke-width="2.5" stroke-linecap="round"/>`,
  // Pip: a cheerful magpie with golden feathers, holding a shiny coin
  magpie: () => `${SHADOW}
    <path d="M24 66L6 84l22-6z" fill="#1f2433" stroke="#0c0e16" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="62" rx="28" ry="26" fill="#ffc21a" stroke="#6b4a00" stroke-width="2.5"/>
    <ellipse cx="54" cy="70" rx="16" ry="15" fill="#fff7d6"/>
    <path d="M26 56c-2 12 4 22 14 24-4-8-6-16-4-24z" fill="#1f2433" stroke="#0c0e16" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="54" cy="34" r="20" fill="#1f2433" stroke="#0c0e16" stroke-width="2.5"/>
    <path d="M40 18c2-8 10-10 12-4-4 0-8 2-12 4z" fill="#1f2433"/>
    <ellipse cx="55" cy="38" rx="16" ry="11" fill="#fff7d6"/>
    ${EYE(48, 35, 6)}${EYE(62, 35, 6)}${BLUSH(44, 44)}${BLUSH(66, 44)}
    <path d="M70 37l14 2-14 5z" fill="#ffb02e" stroke="#7a4a10" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="78" cy="66" r="9" fill="#ffd34d" stroke="#8a5a00" stroke-width="2.5"/><path d="M76 61v10M80 61v10" stroke="#8a5a00" stroke-width="1.5" opacity=".6"/>
    <path d="M44 88l2-5 2 5M56 88l2-5 2 5" fill="none" stroke="#ffb02e" stroke-width="2.5" stroke-linecap="round"/>`,
};

export function petSvg(type, size = 100) {
  const art = ART[type] || ART.pup;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${art()}</svg>`;
}
export const petColor = (type) => D.PETS[type]?.color || '#ffffff';
export const petTypes = () => Object.keys(D.PETS);
