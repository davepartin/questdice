// Learn to play: a short illustrated lesson deck (the board, every die and symbol, the counters, triples, a round),
// then a guided practice battle against one goblin with set dice and a spotlight on what to tap next.
// Nothing here is saved. ui.js binds the context (startPractice needs startQuest and friends).
import { h, $ } from '../dom.js';
import * as HK from './hudkit.js';
import { sfx } from '../audio.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import { BOARDS } from './tutboard.js';

let X = null;
export function bind(x) { X = x; }
const DONE = 'qd.learned';
export const learned = () => { try { return localStorage.getItem(DONE) === '1'; } catch { return false; } };
const markLearned = () => { try { localStorage.setItem(DONE, '1'); } catch { /* ignore */ } };

const img = (name, cls = '') => h('img', { class: `tu-face ${cls}`, src: `assets/tutorial/${name}.png`, alt: '', draggable: 'false' });
// a forward chevron for the Next button
const fwd = () => { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('class', 'tu-fwd'); sv.innerHTML = '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'; return sv; };
const ic = (name) => h('span', { class: `tu-ic t-${name}` }, HK.icon(name));

// ------------------------------------------------------------------------------------------------ pieces
// The board pictures are stills of the game's real dice tray (dev/trayshot.mjs): `icons` shows what goes in each socket,
// `start` a new Knight's first roll, and d-<slot> one die alone (same camera) so a lesson can drop dice in one at a time.
const SOCK_NAME = { NW: 'Weapon', N: 'Head', NE: 'Weapon 2', W: 'Hand', C: 'Heart', E: 'Hand', SW: 'Talent', S: 'Feet', SE: 'Talent 2', P: 'Pet' };
const SOCK_INFO = {
  NW: ['Left weapon', 'Your weapon’s die. Red faces attack, blue faces block. It adds to the hand below it.'],
  N: ['Head', 'A white d4. Its number pays a symbol: heal, pierce, magic or gold.'],
  NE: ['Second weapon', 'Empty for now. Buy it at camp, or carry a two-handed weapon that fills both.'],
  W: ['Left hand', 'Your Strength. It powers the weapon above it, and it pays a symbol too.'],
  C: ['Heart', 'The gold die in the middle. It boosts the dice around it.'],
  E: ['Right hand', 'Your other Strength die. It powers your second weapon once you have one.'],
  SW: ['Talent', 'A bonus die for the hand above it: 2× Strength, or symbols you choose at camp.'],
  S: ['Feet', 'A white die that pays a symbol. Its number is also your speed: who strikes first.'],
  SE: ['Second talent', 'Empty for now. Buy it at camp as you grow.'],
};
const pic = (n) => `assets/tutorial/board-${n}.webp`;
// A picture of the board. base: which still; dice: dice layers to draw on top (drop: they fall in one by one);
// hi: sockets to light up (the rest dim); tags: labels under sockets; line: a triple's glowing line; tap: tappable sockets.
function boardPic({ base = 'start', dice = [], drop = false, hi = [], dim = hi.length > 0, tags = null, line = null, tap = null, small = false, layer = (s) => s }) {
  const B = BOARDS[base]; const k = B.socks; const ar = B.w / B.h;
  const kids = [h('img', { class: 'tb-base', src: pic(base), alt: '', draggable: 'false' })];
  hi.forEach((s) => kids.push(h('i', { class: 'tb-ring', style: ring(k[s], ar) })));
  dice.forEach((s, i) => kids.push(h('img', { class: `tb-die ${drop ? 'drop' : ''}`, src: pic(`d-${layer(s)}`), alt: '', draggable: 'false', style: { '--ox': `${k[s].x}%`, '--oy': `${k[s].y}%`, '--i': i } })));
  if (line) kids.push(lineEl(line.map((s) => k[s]), ar));
  if (tags) Object.entries(tags).forEach(([s, t], i) => kids.push(h('span', { class: `tb-tag ${drop ? 'drop' : ''}`, style: { left: `${k[s].x}%`, top: `${k[s].y + k[s].r * ar * 0.62}%`, '--i': dice.indexOf(s) >= 0 ? dice.indexOf(s) : i } }, t)));
  if (tap) Object.keys(SOCK_INFO).forEach((s) => kids.push(h('button', { type: 'button', class: 'tb-hit', 'aria-label': SOCK_INFO[s][0], style: ring(k[s], ar), onclick: (e) => tap(s, e.currentTarget) })));
  return h('div', { class: `tb ${dim ? 'dim' : ''} ${small ? 'small' : ''}`, style: { aspectRatio: `${B.w} / ${B.h}` }, 'aria-hidden': tap ? null : 'true' }, ...kids);
}
// a socket's circle in % of the picture (it is seen at an angle, so it is a little flatter than it is wide)
function ring(q, ar) { const w = q.r * 2; const hgt = w * ar * 0.86; return { left: `${q.x - q.r}%`, top: `${q.y - hgt / 2}%`, width: `${w}%`, height: `${hgt}%` }; }
function lineEl(pts, ar) {
  const [a, b] = [pts[0], pts[pts.length - 1]]; const dx = b.x - a.x; const dy = (b.y - a.y) / ar; const len = Math.hypot(dx, dy) + 14;
  const ang = Math.atan2(dy, dx); return h('i', { class: `tb-line ${Math.abs(dx) < 1 ? 'col' : ''}`, style: { left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2}%`, width: `${len}%`, transform: `translate(-50%, -50%) rotate(${ang}rad)` } });
}
// the Quest Dice knight, your guide: a little portrait and a speech bubble
const say = (text) => h('div', { class: 'tu-say' }, h('span', { class: 'tu-knight', 'aria-hidden': 'true' }), h('p', {}, text));
// one of the game's real dice, filmed tumbling (assets/brand/die-*.webp), as on the home screen
function floatDie(kind, { x, y, size, t = 2.4, bob = 4.5, delay = 0, tilt = 0 }) {
  return h('div', { class: `fd fd-${kind}`, style: { left: `${x}%`, top: `${y}%`, '--s': `${size}rem`, '--t': `${t}s`, '--b': `${bob}s`, '--d': `${delay}s`, '--tilt': `${tilt}deg` }, 'aria-hidden': 'true' },
    h('div', { class: 'fd-box' }, h('img', { class: 'fd-strip', src: `assets/brand/die-${kind}.webp`, alt: '', draggable: 'false' })), h('i', { class: 'fd-shadow' }));
}
const knightArt = (small = false) => h('div', { class: `tu-hero ${small ? 'small' : ''}`, 'aria-hidden': 'true' },
  h('div', { class: 'br-float' }, floatDie('strength', { x: 70, y: -4, size: 1.7, t: 3.4, bob: 5, tilt: -8 }), floatDie('talent', { x: 14, y: 4, size: 1.5, t: 2.4, bob: 4, delay: -1.5 }),
    floatDie('heart', { x: -2, y: 62, size: 1.6, t: 4, bob: 6, delay: -2, tilt: 10 }), floatDie('red', { x: 86, y: 60, size: 1.5, t: 2.6, bob: 4.4, delay: -1, tilt: 6 })),
  h('img', { class: 'tu-hero-img', src: 'assets/brand/knight-sword.webp', alt: '', draggable: 'false' }));


const row = (art, title, text) => h('div', { class: 'tu-row' }, h('div', { class: 'tu-row-art' }, art), h('div', { class: 'tu-row-tx' }, h('b', {}, title), text ? h('span', {}, text) : null));
const p = (...kids) => h('p', { class: 'tu-p' }, ...kids);
const counter = (k, label, n) => h('div', { class: `tu-counter fc t-${k}` }, h('span', { class: 'fc-ic' }, HK.icon(k)), h('b', { class: 'fc-n' }, String(n)), h('small', {}, label));
const sum = (...parts) => h('div', { class: 'tu-sum' }, ...parts);
const op = (t) => h('span', { class: 'tu-op' }, t);
const petPic = (type) => h('img', { class: 'tu-pet', src: `assets/pets/${D.PETS[type].img}.webp`, alt: '', draggable: 'false' });

// The board lesson: tap a socket to learn what goes in it.
function boardExplorer() {
  const info = h('div', { class: 'tu-info', 'aria-live': 'polite' }, h('b', {}, 'Tap a socket'), h('span', {}, 'Each one holds a part of your hero.'));
  let on = null;
  const tap = (s, el) => {
    on?.classList.remove('on'); on = el; el.classList.add('on'); sfx.select?.();
    info.replaceChildren(h('b', {}, SOCK_INFO[s][0]), h('span', {}, SOCK_INFO[s][1]));
    info.classList.remove('pop'); void info.offsetWidth; info.classList.add('pop');
  };
  return h('div', { class: 'tu-explore' }, boardPic({ base: 'icons', tags: Object.fromEntries(Object.keys(SOCK_INFO).map((s) => [s, SOCK_NAME[s]])), tap }), info);
}

// ------------------------------------------------------------------------------------------------ the lessons
const LESSONS = [
  {
    title: 'Welcome, hero',
    eyebrow: 'Your guide',
    art: () => knightArt(),
    say: 'I am made of dice, and so are you. Let me show you how it works. It takes about three minutes.',
    body: () => [
      p('In QuestDice your hero is a set of dice laid out like a body: a head, two hands, a heart and feet, with weapons and talents beside them.'),
      p('Each round you roll them all, make the roll better, and then fight. After a few lessons you will play a practice battle with me beside you.'),
    ],
  },
  {
    title: 'Your board',
    eyebrow: 'Every die has its place',
    art: () => boardExplorer(),
    say: 'This is your board. Each socket holds one die. Tap one to see what goes there.',
    body: () => [
      row(ic('atk'), 'Top row', 'Your weapons, with your head between them.'),
      row(ic('heart'), 'Middle row', 'Your two hands, with your heart in the center.'),
      row(ic('magic'), 'Bottom row', 'Two talent dice, with your feet between them.'),
      p('A new hero starts with seven dice. The two sockets marked EMPTY are filled at camp as you grow.'),
    ],
  },
  {
    title: 'Head, hands and feet',
    eyebrow: 'The white dice',
    art: () => boardPic({ base: 'icons', dice: ['N', 'W', 'E', 'S'], drop: true, hi: ['N', 'W', 'E', 'S'], tags: { N: 'Head', W: 'Hand', E: 'Hand', S: 'Feet' } }),
    say: 'Your head, hands and feet are white dice. Every number pays a symbol, and the symbols on the face show how many.',
    body: () => [
      h('div', { class: 'tu-pay' }, [[1, 'heal', 'Heal'], [2, 'pierce', 'Pierce'], [3, 'magic', 'Magic'], [4, 'gold', 'Gold']].map(([n, k, name]) =>
        h('div', { class: `tu-paycard t-${k}` }, img(`white-${n}`), h('b', {}, `${n} = ${name}`)))),
      p('Heal gives health back, pierce hits through armor, magic is saved for rerolls and powers, and gold is spent at camp. Bigger dice keep the pattern going: 5 to 8 pay three of each.'),
    ],
  },
  {
    title: 'Hands are your Strength',
    eyebrow: 'Weapon plus hand',
    art: () => h('div', { class: 'tu-lane' }, boardPic({ base: 'start', dice: ['NW', 'W'], hi: ['NW', 'W'] }),
      sum(img('weapon-red3', 'sm'), op('+'), img('white-4', 'sm'), op('='), counter('atk', 'Attack', 7))),
    say: 'Each hand powers the weapon above it. My sword shows +3 and my hand rolled 4. That makes 7 attack.',
    body: () => [
      p('Add the weapon’s number to the hand’s number. The bigger your hand die, the harder every weapon hits.'),
      p('Your hands still pay their own symbol too, so that 4 also pays 2 gold.'),
    ],
  },
  {
    title: 'Weapon dice',
    eyebrow: 'Red attacks, blue blocks',
    art: () => h('div', { class: 'tu-faces four' }, ['weapon-red3', 'weapon-blue3', 'weapon-zero', 'weapon-red4'].map((n) => img(n))),
    say: 'Watch the colour of your weapon’s face. Red sends that lane into attack, blue into block.',
    body: () => [
      row(img('weapon-red3', 'xs'), 'Red starburst = Attack', 'The weapon’s number plus your hand goes to attack.'),
      row(img('weapon-blue3', 'xs'), 'Blue shield = Block', 'The same sum goes to block instead.'),
      row(img('weapon-zero', 'xs'), '+0', 'Adds nothing, but your hand’s Strength still counts that way.'),
      row(img('weapon-red4', 'xs'), 'Corner symbols', 'Small symbols in the corners are bonuses, like an extra pierce arrow. Forging a weapon at camp adds more.'),
    ],
  },
  {
    title: 'Talent dice',
    eyebrow: 'The bottom corners',
    art: () => boardPic({ base: 'start', dice: ['SW', 'W', 'NW'], hi: ['SW', 'W', 'NW'] }),
    say: 'My talent die rolled 2×, so my hand’s 4 counts twice in my sword: 3 + 4 + 4 = 11 attack.',
    body: () => [
      row(img('talent-blank', 'xs'), 'Blank', 'Nothing this time. Every talent die has two blank faces.'),
      row(img('talent-x2', 'xs'), '2× Strength', 'Counts the hand above it twice in its weapon.'),
      row(img('talent-heal', 'xs'), 'Symbol faces', 'Pay that symbol: one for every point on your hand. A hand of 4 pays 4. You choose the symbols at camp.'),
    ],
  },
  {
    title: 'The heart',
    eyebrow: 'The center die',
    art: () => h('div', { class: 'tu-stack' }, boardPic({ base: 'start', dice: ['C', 'W'], hi: ['C', 'W'], small: true }), h('div', { class: 'tu-faces six' }, [1, 2, 3, 4, 5, 6].map((n) => img(`heart-${n}`)))),
    say: 'The heart boosts the dice around it. My heart shows 4, and so does my left hand: 2 more gold.',
    body: () => [
      row(img('heart-2', 'xs'), '1 to 4', 'Every white die showing the same number pays 2 more of its symbol.'),
      row(img('heart-5', 'xs'), '5', '+4 block on each blue weapon.'),
      row(img('heart-6', 'xs'), '6', '+4 attack on each red weapon.'),
    ],
  },
  {
    title: 'Feet are your speed',
    eyebrow: 'Who strikes first',
    art: () => h('div', { class: 'tu-lane' }, boardPic({ base: 'start', dice: ['S'], hi: ['S'], tags: { S: 'Speed 3' }, small: true }),
      h('div', { class: 'tu-race' }, h('div', { class: 'tu-racer you' }, img('white-3', 'sm'), h('small', {}, 'Your feet')), h('b', {}, 'vs'),
        h('div', { class: 'tu-racer foe' }, h('span', { class: 'tu-foedie' }, '2'), h('small', {}, 'Goblin')), h('span', { class: 'tu-first' }, HK.icon('atk'), 'You strike first'))),
    say: 'Fast feet win fights. Roll higher than a monster, or tie, and you strike before it can swing.',
    body: () => [
      p('Your feet pay their symbol like the other white dice, and their number is also your speed.'),
      p('From round 2 on, each monster rolls its own die against your feet. A monster might fall before it ever swings. Round 1 is always yours.'),
    ],
  },
  {
    title: 'Your six counters',
    eyebrow: 'What your roll adds up to',
    art: () => h('div', { class: 'tu-counters fs' }, counter('atk', 'Attack', 21), counter('pierce', 'Pierce', 2), counter('block', 'Block', 4), counter('magic', 'Magic', 2), counter('heal', 'Heal', 2), counter('gold', 'Gold', 8)),
    say: 'Everything your dice pay lands in these six counters. You will see them under your board in battle.',
    body: () => [
      row(ic('atk'), 'Attack', 'Damage to the monster you target.'),
      row(ic('pierce'), 'Pierce', 'Damage that goes straight through its block.'),
      row(ic('block'), 'Block', 'Taken off the monster’s hit.'),
      row(ic('magic'), 'Magic', 'Saved round to round for rerolls and powers.'),
      row(ic('heal'), 'Heal', 'Health back when the round plays out.'),
      row(ic('gold'), 'Gold', 'Yours to keep. Spend it at camp.'),
    ],
  },
  {
    title: 'Triples and straights',
    eyebrow: 'The big bonuses',
    art: () => h('div', { class: 'tu-triples' },
      h('figure', {}, boardPic({ base: 'tripW', line: ['NW', 'NE'], small: true }), h('figcaption', {}, 'Weapons')),
      h('figure', {}, boardPic({ base: 'final', line: ['W', 'E'], small: true }), h('figcaption', {}, 'Strength')),
      h('figure', {}, boardPic({ base: 'tripH', line: ['N', 'S'], small: true }), h('figcaption', {}, 'Head to Toe'))),
    say: 'Three matching numbers in a line earn +10. Five in a row anywhere on your dice is a straight.',
    body: () => [
      row(ic('atk'), 'Weapons Triple: +10 attack', 'Top row. Both weapons’ +numbers match your head.'),
      row(ic('atk'), 'Strength Triple: +10 attack', 'Middle row. Hand, heart and hand match.'),
      row(ic('block'), 'Head to Toe Triple: +10 block', 'Head, heart and feet match.'),
      row(h('span', { class: 'tu-ic t-gold' }, HK.icon('star')), 'Straight', 'Five numbers in a row anywhere on your dice (like 1-2-3-4-5): +10 attack or +10 gold, your choice. Six in a row pays 18, seven pays 30.'),
    ],
  },
  {
    title: 'How a round goes',
    eyebrow: 'Roll, reroll, lock in',
    art: () => h('div', { class: 'tu-steps' },
      h('div', {}, h('span', { class: 'tu-num' }, '1'), HK.icon('dice'), h('b', {}, 'Roll')),
      h('div', {}, h('span', { class: 'tu-num' }, '2'), HK.icon('reroll'), h('b', {}, 'Reroll')),
      h('div', {}, h('span', { class: 'tu-num' }, '3'), HK.icon('lock'), h('b', {}, 'Lock in')),
      h('div', {}, h('span', { class: 'tu-num' }, '4'), HK.icon('atk'), h('b', {}, 'Fight'))),
    say: 'Read what the monsters plan, roll, fix the dice that let you down, then lock in.',
    body: () => [
      row(h('span', { class: 'tu-plate' }, h('b', {}, 'GOBLIN'), h('i', {}, HK.icon('atk'), '3-6')), 'Read the monsters', 'Each monster’s box shows what it plans this round and how hard it may hit.'),
      row(ic('dice'), 'Roll', 'Tap Roll dice to throw your whole body.'),
      row(ic('reroll'), 'Reroll', `Tap up to ${D.REROLL_DICE} dice, then Reroll. Three rerolls a round are free. After that, each die costs 1 magic.`),
      row(ic('lock'), 'Lock in', 'Tap a monster to choose your target, then Lock In. You and the monsters act, fastest first.'),
    ],
  },
  {
    title: 'Grow at camp',
    eyebrow: 'Pets, potions and powers',
    art: () => h('div', { class: 'tu-camp' },
      h('div', { class: 'tu-petrow' }, ['ember', 'bristle', 'turtle', 'bunny', 'owl', 'penny'].map((t) => h('span', { class: 'tu-petchip', style: { '--pc': D.PETS[t].color } }, petPic(t))))),
    say: 'Between fights you rest at camp. Grow your dice, and adopt a pet: it rolls a little die of luck every round, up by your gold and magic.',
    body: () => [
      row(petPic('bunny'), 'Pets', `The traveler brings one each camp (${D.PET_PRICE} gold). Train its die like a talent die and grow it to a d8.`),
      row(ic('heal'), 'Healing potions', `Carry up to ${E.POTIONS}. Drinking one is free and heals ${E.POTION_HP}.`),
      row(ic('magic'), 'Magic powers', 'The purple button in battle. Paid for with magic; learn more at camp.'),
      row(ic('gold'), 'Grow', 'Spend your gold on new dice, bigger hands and talent symbols.'),
    ],
  },
  {
    title: 'Ready for your first battle?',
    eyebrow: 'Practice',
    final: true,
    art: () => h('div', { class: 'tu-ready' }, knightArt(true), boardPic({ base: 'final', line: ['W', 'E'], small: true })),
    say: 'A goblin waits in the Wolfwood. I will point to each button the first time. Nothing is saved, so try anything.',
    body: () => [
      p('Roll, reroll for a Strength Triple, and bring the goblin down. Then forge your own hero and start the road.'),
    ],
  },
];

// ------------------------------------------------------------------------------------------------ lesson deck
// fetch every board picture up front, so lessons never wait on them
const preload = () => { for (const n of [...Object.keys(BOARDS), 'd-NW', 'd-N', 'd-W', 'd-C', 'd-E', 'd-SW', 'd-S', 'd-E4']) { const im = new Image(); im.src = pic(n); } };
export function showLessons({ at = 0 } = {}) {
  closeLessons(); preload();
  let i = Math.max(0, Math.min(LESSONS.length - 1, at));
  const host = h('div', { id: 'tut', class: 'tu-layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Learn to play' });
  document.body.append(host);
  const go = (n) => { if (n < 0 || n >= LESSONS.length) return; i = n; paint(); sfx.select?.(); };
  const paint = () => {
    const L = LESSONS[i];
    const bar = h('div', { class: 'tu-progress', 'aria-hidden': 'true' }, LESSONS.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })));
    const next = L.final
      ? h('div', { class: 'tu-final' },
        h('button', { type: 'button', class: 'tu-btn tu-go', onclick: () => { markLearned(); closeLessons(); startPractice(); } }, HK.icon('dice'), 'Start practice battle'),
        h('div', { class: 'tu-final-row' },
          h('button', { type: 'button', class: 'tu-btn tu-ghost', onclick: () => go(0) }, 'Read again'),
          h('button', { type: 'button', class: 'tu-btn tu-ghost', onclick: () => { markLearned(); closeLessons(); X?.showTitle(); } }, 'Home')))
      : h('div', { class: 'tu-nav' },
        h('button', { type: 'button', class: 'tu-btn tu-ghost', disabled: i === 0, onclick: () => go(i - 1) }, 'Back'),
        h('button', { type: 'button', class: 'tu-btn tu-go', onclick: () => go(i + 1) }, i === 0 ? 'Start' : 'Next', fwd()));
    host.replaceChildren(h('div', { class: 'tu-card' },
      h('header', { class: 'tu-top' }, h('span', { class: 'tu-kicker' }, 'Learn to play'), h('span', { class: 'tu-count' }, `${i + 1} of ${LESSONS.length}`),
        h('button', { type: 'button', class: 'tu-skip', onclick: () => { closeLessons(); X?.showTitle(); }, 'aria-label': 'Close the guide' }, 'Skip')),
      bar,
      h('div', { class: 'tu-scroll' },
        h('div', { class: 'tu-art' }, L.art()),
        L.eyebrow ? h('div', { class: 'tu-eyebrow' }, L.eyebrow) : null,
        h('h2', { class: 'tu-title' }, L.title),
        L.say ? say(L.say) : null,
        h('div', { class: 'tu-body' }, L.body())),
      next));
    const sc = host.querySelector('.tu-scroll'); sc.scrollTop = 0;
    const more = () => sc.classList.toggle('more', sc.scrollTop + sc.clientHeight < sc.scrollHeight - 6);
    sc.addEventListener('scroll', more, { passive: true }); requestAnimationFrame(more);
  };
  // swipe between lessons
  let sx = null; let sy = null;
  host.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  host.addEventListener('touchend', (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1));
  }, { passive: true });
  host.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'Escape') { closeLessons(); X?.showTitle(); } });
  paint();
  host.tabIndex = -1; host.focus();
}
export function closeLessons() { $('#tut')?.remove(); }

// ------------------------------------------------------------------------------------------------ practice battle
// A Knight with the standard starting dice against one goblin. The first roll and the first reroll are set so the
// lesson lands: 11 attack, then a Strength Triple for 21. After that the dice are free and the guide steps back.
export function startPractice() {
  const hero = E.newHero({ name: 'You', cls: 'knight' });
  hero.tips = Object.fromEntries(['b_roll', 'b_shape', 'b_target', 'b_lock', 'b_triple', 'b_intent', 'm_goblin', 'b_paid'].map((k) => [k, 1])); // the guide replaces these hints
  const quest = { id: 'practice', act: 1, step: 1, kind: 'battle', enemies: ['goblin'], place: 'Wolfwood Edge', name: 'Practice in the Wolfwood', hpMult: 1, flat: 0, rewardMult: 0, practice: true };
  X.practice({ hero, quest, guide: guide() });
}

// The guide: steps that wait for something to happen in the battle, each with a spotlight and a short card.
function guide() {
  const G = { step: 0, api: null, el: null, off: false, round: 1 };
  const STEPS = [
    { on: 'reset', target: 'plate', title: 'This is a goblin', text: 'Its box shows what it will do this round. The number is how hard it may hit you.', next: true },
    { on: 'reset', target: 'divider', title: 'Your health', text: 'The bar across the middle is your health. Keep it above zero.', next: true },
    { on: 'reset', target: 'roll', title: 'Roll your body', text: 'Tap Roll dice to throw all your dice at once.', wait: 'rolled' },
    { on: 'shape', target: 'counters', title: 'Your roll adds up here', text: 'Attack 11, plus a little pierce, magic, heal and gold. Let’s make it bigger.', next: true },
    { on: 'shape', target: ['NW', 'W', 'SW'], title: 'Your left side works together', text: 'Sword +3, plus your hand’s 4, plus the 2× talent counting that 4 again: 11 attack.', next: true },
    { on: 'shape', target: ['W', 'C', 'E'], title: 'Almost a Strength Triple', text: 'Left hand 4, heart 4, right hand 1. Match all three for +10 attack. Tap the right hand die, the 1.', wait: 'picked:E' },
    { on: 'shape', target: 'reroll', title: 'Now reroll it', text: 'Tap Reroll. Your first three rerolls each round are free.', wait: 'rerolled' },
    { on: 'shape', target: ['W', 'C', 'E'], title: 'Strength Triple!', text: 'Three 4s in the middle row: +10 attack. You are up to 21.', next: true, cheer: true },
    { on: 'shape', target: 'lock', title: 'Lock in and fight', text: 'Happy with the roll? Tap Lock In. You strike, then the goblin answers.', wait: 'locked' },
    { on: 'reset2', target: 'powers', title: 'Magic carries over', text: 'The magic you earned is saved. Spend it on extra rerolls or on your magic powers here.', next: true },
    { on: 'reset2', target: 'roll', title: 'Finish it yourself', text: 'The goblin is nearly beaten. Roll, pick dice to reroll, and lock in. You’ve got this.', next: true, last: true },
  ];
  const card = (s) => {
    const done = () => { if (s.last) end(); else advance(); };
    return h('div', { class: `tg-card ${s.cheer ? 'cheer' : ''}` },
      h('div', { class: 'tg-tx' }, h('b', {}, s.title), h('p', {}, s.text)),
      h('div', { class: 'tg-act' },
        h('button', { type: 'button', class: 'tg-skip', onclick: () => end() }, 'End guide'),
        s.next ? h('button', { type: 'button', class: 'tg-ok', onclick: done }, s.last ? 'Let’s go' : 'Next') : h('span', { class: 'tg-wait' }, 'Your turn')));
  };
  const rectOf = (t) => {
    const A = G.api; if (!A) return null;
    if (Array.isArray(t)) {
      const pts = t.map((s) => A.diePoint(s)).filter(Boolean); if (!pts.length) return null;
      const r = A.dieRadius(); const xs = pts.map((q) => q.x); const ys = pts.map((q) => q.y);
      return { left: Math.min(...xs) - r, top: Math.min(...ys) - r, right: Math.max(...xs) + r, bottom: Math.max(...ys) + r };
    }
    const sel = { plate: '.b3-plate', divider: '.b3-divider', roll: '#b3-roll', counters: '.b3-fc .fs', reroll: '#b3-reroll', lock: '#b3-lock', powers: '.b3-powers' }[t];
    const el = sel && A.root.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect(); if (!b.width) return null;
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
  };
  const place = () => {
    if (!G.el || G.off) return; const s = STEPS[G.step]; if (!s) return;
    const r = rectOf(s.target); const spot = G.el.querySelector('.tg-spot'); const cardEl = G.el.querySelector('.tg-card');
    if (!r) { spot.style.opacity = '0'; return; }
    const pad = 8; spot.style.opacity = '1';
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.right - r.left + pad * 2}px`, height: `${r.bottom - r.top + pad * 2}px` });
    // the card sits on the side of the screen away from the spotlight
    const mid = (r.top + r.bottom) / 2; const below = mid < innerHeight * 0.5;
    cardEl.classList.toggle('below', below); cardEl.classList.toggle('above', !below);
    cardEl.style.top = below ? `${Math.min(innerHeight - cardEl.offsetHeight - 12, r.bottom + pad + 14)}px` : '';
    cardEl.style.bottom = below ? '' : `${Math.max(12, innerHeight - r.top + pad + 14)}px`;
  };
  const show = () => {
    const s = STEPS[G.step]; if (!s || G.off || !G.api) return;
    G.el?.remove();
    G.el = h('div', { class: `tg-layer ${s.wait ? 'waits' : ''}` }, h('div', { class: 'tg-spot' }), card(s));
    G.api.root.append(G.el);
    requestAnimationFrame(place); setTimeout(place, 250); setTimeout(place, 700);
    if (s.cheer) sfx.level?.();
  };
  const advance = () => { G.step += 1; G.el?.remove(); G.el = null; const s = STEPS[G.step]; if (s && G.phase && s.on.startsWith(G.phase)) show(); };
  const end = () => { G.off = true; G.el?.remove(); G.el = null; G.api?.unscript?.(); };
  G.attach = (api) => { G.api = api; addEventListener('resize', place); G.tick = setInterval(place, 400); };
  G.detach = () => { removeEventListener('resize', place); clearInterval(G.tick); G.el?.remove(); G.el = null; };
  // events from the battle
  G.on = (ev, arg) => {
    if (G.off) return;
    if (ev === 'rolled' && G.step >= 9) { end(); return; } // round 2: once they roll on their own, the guide steps back
    const s = STEPS[G.step];
    if (ev === 'reset') { G.phase = arg > 1 ? 'reset2' : 'reset'; if (s && s.on === G.phase) setTimeout(show, 600); return; }
    if (ev === 'shape') { G.phase = 'shape'; if (s && s.on === 'shape' && !G.el) show(); else place(); return; }
    if (!s?.wait) return;
    if (s.wait === ev || s.wait === `${ev}:${arg}`) advance();
    else if (ev === 'picked' && s.wait.startsWith('picked:')) G.api?.toast?.('Just the right hand die for now: the 1 in the middle row.');
  };
  // what the guide lets the player do while it is waiting for a particular tap
  G.allow = (action, arg) => {
    if (G.off) return true; const s = STEPS[G.step]; if (!s) return true;
    if (action === 'lock') return s.wait === 'locked';
    if (action === 'reroll') return s.wait === 'rerolled';
    if (action === 'pick') return s.wait === 'picked:E' ? arg === 'E' : s.wait === 'rerolled' ? arg === 'E' : !s.next || G.step > 8;
    if (action === 'roll') return s.wait === 'rolled' || G.step > 8;
    return true;
  };
  G.blockedText = (action) => {
    const s = STEPS[G.step];
    if (s?.next) return 'Tap Next on the guide first.';
    return { lock: 'Not yet. Follow the guide first.', reroll: 'Pick the right hand die first.', roll: 'Follow the guide first.', pick: 'Just the right hand die for now.' }[action] || 'Follow the guide first.';
  };
  return G;
}

// After the practice battle: well done, then forge a real hero (or read again, or go home).
export function showDone(won) {
  closeLessons(); markLearned();
  const host = h('div', { id: 'tut', class: 'tu-layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Practice complete' });
  host.append(h('div', { class: 'tu-card tu-done' },
    h('div', { class: 'tu-scroll' },
      h('div', { class: 'tu-art' }, knightArt()),
      h('div', { class: 'tu-eyebrow' }, won ? 'Practice complete' : 'Practice over'),
      h('h2', { class: 'tu-title' }, won ? 'You’re ready, hero' : 'Good try. You’ve got the idea.'),
      say(won ? 'Well fought! That goblin never stood a chance. Now let’s make a hero of your own.' : 'Every hero falls sometimes. Get back up: roll, fix the dice that let you down, and lock in.'),
      h('div', { class: 'tu-body' },
        p(won ? 'You rolled, picked a die, rerolled for a Strength Triple, and brought the goblin down. That’s the whole game, one round at a time.' : 'Every battle works the same way: roll, reroll the dice that help most, then lock in. Block keeps you standing.'),
        p('Forge your own hero and start the road. Small hints will show up the first time you meet something new, and the ? button explains any die at any time.'))),
    h('div', { class: 'tu-final' },
      h('button', { type: 'button', class: 'tu-btn tu-go', onclick: () => { closeLessons(); X?.showTitle(); X?.showCreate(); } }, HK.icon('crown'), 'Forge my hero'),
      h('div', { class: 'tu-final-row' },
        h('button', { type: 'button', class: 'tu-btn tu-ghost', onclick: () => { X?.showTitle(); showLessons(); } }, 'Read the guide'),
        h('button', { type: 'button', class: 'tu-btn tu-ghost', onclick: () => { closeLessons(); X?.showTitle(); } }, 'Home')))));
  document.body.append(host);
  sfx[won ? 'level' : 'select']?.();
}
