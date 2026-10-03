// The character mat. Dice sit in the wells. Helmet, heart, gauntlets, boots,
// and the equipped weapons stay visible around those wells.
import { h } from './dom.js';
import * as D from './data.js';
import * as E from './engine.js';
import { WELL } from './die3d.js';

let seq = 1;
const nid = (p) => `${p}-${seq++}`;

const svg = (body) => `<svg viewBox="0 0 120 120" class="mat-svg" aria-hidden="true">${body}</svg>`;

function socket(slot, ring) {
  const [fx, fy] = WELL[slot];
  const cx = +(fx * 120).toFixed(1);
  const cy = +(fy * 120).toFixed(1);
  const r = 27;
  const a = r + 5;
  const s = 9;
  const arm = (d) => `<path d="${d}" fill="none" stroke="${ring}" stroke-width="1.7" stroke-linejoin="miter" opacity="0.9"/>`;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#05040a" opacity="0.72"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#100e16"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="4" opacity="0.45"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 1.5}" fill="none" stroke="${ring}" stroke-width="1.4" opacity="0.9"/>
    ${arm(`M${cx - a} ${cy - a + s} V${cy - a} H${cx - a + s}`)}
    ${arm(`M${cx + a - s} ${cy - a} H${cx + a} V${cy - a + s}`)}
    ${arm(`M${cx - a} ${cy + a - s} V${cy + a} H${cx - a + s}`)}
    ${arm(`M${cx + a - s} ${cy + a} H${cx + a} V${cy + a - s}`)}`;
}

function label(text, x, y, anchor, fill) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-family="Oxanium, sans-serif" font-size="8.5" font-weight="700" letter-spacing="1.1">${text}</text>`;
}

function weaponArt(id, side) {
  const name = escapeXml((D.WEAPONS[id]?.name || 'Weapon').toUpperCase());
  const steel = nid('steel');
  const gold = nid('gold');
  const lean = side === 'R' ? 'translate(120 0) scale(-1 1)' : '';
  const slot = side === 'R' ? 'NE' : 'NW';
  const blade = {
    sword: `
      <defs>
        <linearGradient id="${steel}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c5d0e0"/><stop offset="1" stop-color="#6e7c90"/></linearGradient>
        <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#a87820"/></linearGradient>
      </defs>
      <path d="M14 10 L58 58 L50 66 L8 22 Z" fill="url(#${steel})" stroke="#2a3344" stroke-width="1.2"/>
      <path d="M18 14 L28 24" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/>
      <path d="M46 40 L70 32 L66 48 L42 56 Z" fill="url(#${gold})"/>
      <path d="M52 58 L66 92" stroke="#5c3a22" stroke-width="7" stroke-linecap="round"/>
      <path d="M52 58 L66 92" stroke="#8a5a32" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="66" cy="94" r="4.5" fill="url(#${gold})"/>`,
    longsword: `
      <defs>
        <linearGradient id="${steel}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8aa"/></linearGradient>
        <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#a87820"/></linearGradient>
      </defs>
      <path d="M10 6 L64 64 L54 74 L4 20 Z" fill="url(#${steel})" stroke="#243"/>
      <path d="M40 46 L74 34 L68 56 L36 66 Z" fill="url(#${gold})"/>
      <path d="M56 70 L72 104" stroke="#4a3018" stroke-width="8" stroke-linecap="round"/>`,
    dagger: `
      <defs>
        <linearGradient id="${steel}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9aa"/></linearGradient>
        <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#a87820"/></linearGradient>
      </defs>
      <path d="M22 16 L52 50 L44 58 L14 26 Z" fill="url(#${steel})" stroke="#243"/>
      <path d="M40 42 L60 36 L54 52 L36 56 Z" fill="url(#${gold})"/>
      <path d="M46 56 L58 78" stroke="#5c3a22" stroke-width="6" stroke-linecap="round"/>`,
    spear: `
      <defs><linearGradient id="${steel}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9ab"/></linearGradient></defs>
      <path d="M28 108 L78 16" stroke="#7a4e28" stroke-width="5" stroke-linecap="round"/>
      <path d="M70 8 L92 28 L64 40 Z" fill="url(#${steel})" stroke="#445"/>
      <path d="M74 18 L84 26" stroke="#fff" stroke-width="1.5" opacity=".7"/>`,
    bow: `
      <path d="M30 8 C2 36 2 84 30 112" fill="none" stroke="#c9853a" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 8 C8 36 8 84 30 112" fill="none" stroke="#e8b56a" stroke-width="2"/>
      <path d="M30 12 L30 108" stroke="#f4f1e8" stroke-width="1.3"/>
      <path d="M26 58 L58 58" stroke="#e1b34a" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M54 54 L62 58 L54 62 Z" fill="#e8eef8"/>`,
    staff: `
      <defs><radialGradient id="${gold}" cx="40%" cy="40%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#d9bcff"/><stop offset="1" stop-color="#6a3cb0"/></radialGradient></defs>
      <path d="M34 112 L34 28" stroke="#5c3a22" stroke-width="7" stroke-linecap="round"/>
      <path d="M34 112 L34 28" stroke="#8a5a32" stroke-width="2"/>
      <circle cx="34" cy="18" r="12" fill="url(#${gold})" stroke="#ffe98a" stroke-width="2"/>
      <circle cx="30" cy="14" r="3" fill="#fff" opacity=".8"/>`,
    shield: `
      <defs>
        <linearGradient id="${steel}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d6ea8"/><stop offset="1" stop-color="#10243f"/></linearGradient>
        <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#a87820"/></linearGradient>
      </defs>
      <path d="M16 22 H78 V58 C78 90 47 108 47 108 C47 108 16 90 16 58 Z" fill="url(#${steel})" stroke="#9fd4ff" stroke-width="3"/>
      <path d="M47 30 V96 M28 56 H66" stroke="url(#${gold})" stroke-width="5" stroke-linecap="round"/>
      <circle cx="47" cy="56" r="6" fill="#e1b34a" stroke="#fff2c4" stroke-width="1.5"/>`,
    bracer: `
      <defs><linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#8a6230"/></linearGradient></defs>
      <rect x="14" y="28" width="70" height="46" rx="10" fill="#3a2a1c" stroke="url(#${gold})" stroke-width="3"/>
      <path d="M24 42 H74 M24 54 H74 M24 66 H62" stroke="#1a120c" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="28" cy="36" r="2.4" fill="#e1b34a"/><circle cx="70" cy="36" r="2.4" fill="#e1b34a"/>`,
    fists: `
      <circle cx="30" cy="46" r="16" fill="#e0b89a" stroke="#6a3c28" stroke-width="3"/>
      <circle cx="54" cy="40" r="14" fill="#efc9ad" stroke="#6a3c28" stroke-width="3"/>
      <path d="M18 58 Q40 78 66 54" fill="none" stroke="#6a3c28" stroke-width="4" stroke-linecap="round"/>
      <path d="M22 42 H36 M48 36 H60" stroke="#6a3c28" stroke-width="2" stroke-linecap="round"/>`,
  }[id] || `
    <path d="M14 10 L58 58 L50 66 L8 22 Z" fill="#d5deee" stroke="#243"/>
    <path d="M46 40 L70 32 L66 48 L42 56 Z" fill="#e1b34a"/>`;
  const where = side === 'R'
    ? label(name, 112, 16, 'end', '#e7d7a8')
    : label(name, 8, 16, 'start', '#e7d7a8');
  return svg(`<g transform="${lean}">${blade}</g>${socket(slot, '#e1b34a')}${where}`);
}

function helmet() {
  const steel = nid('helm');
  const gold = nid('hgold');
  return svg(`
    <defs>
      <linearGradient id="${steel}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f9ff"/><stop offset=".45" stop-color="#c5d0e2"/><stop offset="1" stop-color="#6d7d96"/></linearGradient>
      <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset="1" stop-color="#b88828"/></linearGradient>
    </defs>
    <path d="M60 1 C63 10 61 18 60 24 C70 12 78 8 76 1 C70 0 64 0 60 1Z" fill="#ff4d4d"/>
    <path d="M60 2 C57 12 59 18 60 24 C50 12 40 8 44 2 C50 0 56 0 60 2Z" fill="#ff6b6b"/>
    <path d="M60 0 C62 16 60 28 60 34 C78 18 96 10 92 0 Z" fill="#e1062c"/>
    <path d="M60 1 C58 16 60 28 60 34 C42 18 24 10 28 1 Z" fill="#ff4d4d"/>
    <path d="M60 6 C61 20 60 30 60 36" stroke="#7c1220" stroke-width="1.4"/>
    <path d="M16 58 C14 28 34 12 60 10 C86 12 106 28 104 58 L96 70 H24 Z" fill="url(#${steel})" stroke="#2c3648" stroke-width="1"/>
    <path d="M28 34 H92" stroke="url(#${gold})" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 42 H86" stroke="#12151e" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 42 V34 M60 42 V30 M80 42 V34" stroke="#e1b34a" stroke-width="2"/>
    <path d="M16 56 C6 66 8 92 26 100 L30 64 Z" fill="#9aadc4"/>
    <path d="M104 56 C114 66 112 92 94 100 L90 64 Z" fill="#7d90a8"/>
    <circle cx="32" cy="28" r="2.6" fill="#e1b34a"/><circle cx="88" cy="28" r="2.6" fill="#e1b34a"/>
    ${socket('N', '#d5deee')}
    ${label('HEAD', 60, 11, 'middle', '#f4f1e8')}`);
}

function heart() {
  const glow = nid('hglow');
  const meat = nid('meat');
  return svg(`
    <defs>
      <radialGradient id="${glow}" cx="50%" cy="48%" r="55%">
        <stop offset="0" stop-color="#ff6a5a" stop-opacity="0.95"/>
        <stop offset=".55" stop-color="#8a1424" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#3a0a12" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${meat}" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#ff8d7c"/><stop offset=".45" stop-color="#ff3b4e"/><stop offset="1" stop-color="#6c0e22"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="52" fill="url(#${glow})"/>
    <path d="M60 108 C14 78 10 46 30 30 C44 18 56 30 60 44 C64 30 76 18 90 30 C110 46 106 78 60 108Z" fill="url(#${meat})" stroke="#ffd0c8" stroke-width="2"/>
    <path d="M44 40 C38 26 56 22 60 38" fill="none" stroke="#ffe9e4" stroke-width="3.5" stroke-linecap="round"/>
    ${socket('C', '#ffd23d')}
    ${label('HEART', 60, 16, 'middle', '#ffd0c8')}`);
}

function gauntlet(side) {
  const slot = side === 'R' ? 'E' : 'W';
  const flip = side === 'R' ? 'translate(120 0) scale(-1 1)' : '';
  const leather = nid('glove');
  const gold = nid('ggold');
  const where = side === 'R'
    ? label('RIGHT HAND', 112, 112, 'end', '#e7d7a8')
    : label('LEFT HAND', 8, 112, 'start', '#e7d7a8');
  return svg(`
    <defs>
      <linearGradient id="${leather}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a4c34"/><stop offset="1" stop-color="#2a1c12"/></linearGradient>
      <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#a87820"/></linearGradient>
    </defs>
    <g transform="${flip}">
      <rect x="2" y="18" width="40" height="11" rx="5" fill="#d7b39a" stroke="#5c3828" stroke-width="1.4"/>
      <rect x="2" y="32" width="44" height="12" rx="5" fill="#e4c2a8" stroke="#5c3828" stroke-width="1.4"/>
      <rect x="2" y="47" width="42" height="12" rx="5" fill="#efc9ad" stroke="#5c3828" stroke-width="1.4"/>
      <rect x="6" y="62" width="34" height="11" rx="5" fill="#d7b39a" stroke="#5c3828" stroke-width="1.4"/>
      <path d="M28 16 C18 8 8 14 10 26" fill="none" stroke="#e4c2a8" stroke-width="7" stroke-linecap="round"/>
      <path d="M22 78 C6 68 4 40 28 32 H92 V96 H36 C18 96 12 88 22 78Z" fill="url(#${leather})" stroke="url(#${gold})" stroke-width="2.6"/>
      <path d="M40 48 H84 M40 62 H84 M40 76 H70" stroke="#1a120c" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M52 32 V20 H70 V32" fill="#d5deee" stroke="#6e829f" stroke-width="1.6"/>
      <circle cx="36" cy="42" r="2.2" fill="#e1b34a"/><circle cx="36" cy="86" r="2.2" fill="#e1b34a"/>
    </g>
    ${socket(slot, '#e1b34a')}
    ${where}`);
}

function boots() {
  const hide = nid('boot');
  const gold = nid('bgold');
  return svg(`
    <defs>
      <linearGradient id="${hide}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a2c"/><stop offset="1" stop-color="#1a140e"/></linearGradient>
      <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#8a6230"/></linearGradient>
    </defs>
    <path d="M8 70 H40 V96 H16 C2 96 0 112 18 116 H56 V100 H44 V70 Z" fill="url(#${hide})" stroke="url(#${gold})" stroke-width="2"/>
    <path d="M64 70 H96 V96 H72 C58 96 56 112 74 116 H112 V100 H100 V70 Z" fill="#3a3026" stroke="url(#${gold})" stroke-width="2"/>
    <path d="M14 116 H58 M70 116 H114" stroke="#1a120c" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 82 H38 M70 82 H94" stroke="#e1b34a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M16 70 H40 V78 H16 Z" fill="#2a2118"/>
    <path d="M72 70 H96 V78 H72 Z" fill="#241c16"/>
    <circle cx="22" cy="82" r="2" fill="#ffe9a8"/><circle cx="78" cy="82" r="2" fill="#ffe9a8"/>
    ${socket('S', '#e1b34a')}
    ${label('FEET', 60, 14, 'middle', '#ffe9a8')}`);
}

function relic(kind) {
  const slot = kind === 'mend' ? 'SW' : 'SE';
  const gem = nid('gem');
  const mark = kind === 'mend'
    ? `<path d="M22 28 V52 M10 40 H34" stroke="#45e08b" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M96 18 L102 32 H116 L105 40 L110 54 L96 46 L82 54 L87 40 L76 32 H90 Z" fill="#ffe98a"/>`;
  const name = kind === 'mend' ? 'MEND' : 'SPARK';
  const where = kind === 'mend'
    ? label(name, 8, 112, 'start', '#d9bcff')
    : label(name, 112, 112, 'end', '#d9bcff');
  return svg(`
    <defs><radialGradient id="${gem}" cx="40%" cy="35%" r="65%">
      <stop offset="0" stop-color="#3a2460"/><stop offset="1" stop-color="#120818"/>
    </radialGradient></defs>
    <circle cx="60" cy="58" r="40" fill="url(#${gem})" stroke="#b07dff" stroke-width="3"/>
    <circle cx="60" cy="58" r="28" fill="#1a1030" stroke="#d9bcff" stroke-width="1.4"/>
    ${mark}
    ${socket(slot, '#b07dff')}
    ${where}`);
}

function escapeXml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function floor(two) {
  const spot = nid('spot');
  const leather = nid('leather');
  const grain = nid('grain');
  const bridge = two ? `<path d="M46 28 H254" stroke="#e1b34a" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M70 28 H230" stroke="#fff1c2" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>` : '';
  return `<svg viewBox="0 0 300 300" class="floor-svg" aria-hidden="true">
    <defs>
      <radialGradient id="${spot}" cx="50%" cy="46%" r="68%">
        <stop offset="0" stop-color="#3a2a22"/>
        <stop offset=".42" stop-color="#1c140f"/>
        <stop offset="1" stop-color="#07060a"/>
      </radialGradient>
      <linearGradient id="${leather}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a3828"/>
        <stop offset=".4" stop-color="#2a1d14"/>
        <stop offset="1" stop-color="#120e0c"/>
      </linearGradient>
      <filter id="${grain}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="4" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.4  0 0 0 0 0.22  0 0 0 0.28 0" result="g"/>
        <feBlend in="SourceGraphic" in2="g" mode="overlay"/>
      </filter>
    </defs>
    <rect x="6" y="6" width="288" height="288" rx="36" fill="#1a120c"/>
    <rect x="10" y="10" width="280" height="280" rx="32" fill="url(#${leather})" stroke="#e1b34a" stroke-width="2.5" filter="url(#${grain})"/>
    <rect x="18" y="18" width="264" height="264" rx="26" fill="url(#${spot})" opacity="0.88"/>
    <rect x="18" y="18" width="264" height="264" rx="26" fill="none" stroke="#8a7350" stroke-width="1.2"/>
    <path d="M150 34 V266" stroke="#e1b34a" stroke-width="3" opacity=".28"/>
    <path d="M34 150 H266" stroke="#e1b34a" stroke-width="3" opacity=".22"/>
    <circle cx="150" cy="150" r="22" fill="none" stroke="#ff4d4d" stroke-width="1.5" opacity=".45"/>
    ${bridge}
    <path d="M28 58 H52 V28 M248 28 H272 V58 M28 242 H52 V272 M248 272 H272 V242" fill="none" stroke="#e1b34a" stroke-width="3" stroke-linejoin="miter"/>
  </svg>`;
}

export function characterMat(hero) {
  const two = !!(hero && E.isTwoHanded(hero));
  const left = hero?.loadout?.NW?.id || 'sword';
  const right = two ? left : (hero?.loadout?.NE?.id || 'shield');
  const cells = [
    ['nw', weaponArt(left, 'L')],
    ['n', helmet()],
    ['ne', weaponArt(right, 'R')],
    ['w', gauntlet('L')],
    ['c', heart()],
    ['e', gauntlet('R')],
    ['sw', relic('mend')],
    ['s', boots()],
    ['se', relic('spark')],
  ];
  return h('div', { class: 'char-wrap', 'aria-hidden': 'true' },
    h('div', { class: 'mat-floor', html: floor(two) }),
    h('div', { class: `char-mat${two ? ' is2h' : ''}` }, cells.map(([id, art]) => h('div', { class: `mat-cell mat-${id}`, html: art }))));
}
