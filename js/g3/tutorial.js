// Learn to play: a short illustrated lesson deck (the board, every die and symbol, the counters, triples, a round),
// then a guided practice battle against one goblin with set dice and a spotlight on what to tap next.
// Nothing here is saved. ui.js binds the context (startPractice needs startQuest and friends).
import { h, $ } from '../dom.js';
import * as HK from './hudkit.js';
import { sfx } from '../audio.js';
import * as E from '../engine.js';
import * as D from '../data.js';

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
const CELL_NAME = { NW: 'Left weapon', N: 'Head', NE: 'Right weapon', W: 'Left hand', C: 'Heart', E: 'Right hand', SW: 'Talent one', S: 'Feet', SE: 'Talent two' };
const ORDER = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
// A small picture of the dice board. faces: slot -> image name (or null for an EMPTY socket); hi: slots to light up.
function board({ faces = {}, hi = null, names = false, line = null } = {}) {
  return h('div', { class: `tu-board ${hi ? 'has-hi' : ''} ${names ? 'named' : ''}`, 'aria-hidden': 'true' },
    ORDER.map((s) => h('div', { class: `tu-cell c-${s} ${hi?.includes(s) ? 'hi' : ''}` },
      faces[s] ? img(faces[s]) : h('span', { class: 'tu-empty' }, faces[s] === null ? 'EMPTY' : ''),
      names ? h('small', {}, CELL_NAME[s]) : null)),
    line ? h('i', { class: `tu-line ${line}` }) : null);
}
const START = { NW: 'weapon-red3', N: 'white-2', NE: null, W: 'white-4', C: 'heart-4', E: 'white-1', SW: 'talent-x2', S: 'white-3', SE: null };
const row = (art, title, text) => h('div', { class: 'tu-row' }, h('div', { class: 'tu-row-art' }, art), h('div', { class: 'tu-row-tx' }, h('b', {}, title), text ? h('span', {}, text) : null));
const p = (...kids) => h('p', { class: 'tu-p' }, ...kids);
const counter = (k, label, n) => h('div', { class: `tu-counter fc t-${k}` }, h('span', { class: 'fc-ic' }, HK.icon(k)), h('b', { class: 'fc-n' }, String(n)), h('small', {}, label));
const sum = (...parts) => h('div', { class: 'tu-sum' }, ...parts);
const op = (t) => h('span', { class: 'tu-op' }, t);

// ------------------------------------------------------------------------------------------------ the lessons
const LESSONS = [
  {
    title: 'Your body is your dice',
    art: () => board({ faces: START }),
    body: () => [
      p('In QuestDice, your hero is a set of dice laid out like a body. Each round you roll them all, make the roll better, and then fight.'),
      p('This guide shows what every die and symbol does, then walks you through your first battle. It takes about three minutes.'),
    ],
  },
  {
    title: 'The board',
    art: () => board({ faces: START, names: true }),
    body: () => [
      row(ic('atk'), 'Top row', 'Your two weapons, with your head between them.'),
      row(ic('heart'), 'Middle row', 'Your two hands, with your heart in the center.'),
      row(ic('magic'), 'Bottom row', 'Two talent dice, with your feet between them.'),
      p('A new hero starts with seven dice. The sockets marked EMPTY are your second weapon and second talent. You buy them at camp as you grow.'),
    ],
  },
  {
    title: 'White dice pay symbols',
    eyebrow: 'Head, hands and feet',
    art: () => h('div', { class: 'tu-faces four' }, ['white-1', 'white-2', 'white-3', 'white-4'].map((n) => img(n))),
    body: () => [
      p('Your head, hands and feet are white dice. Each number pays a symbol, and the symbols on the face show how many you get:'),
      row(ic('heal'), '1 = Heal', 'Two green crosses: 2 health back.'),
      row(ic('pierce'), '2 = Pierce', 'Two orange arrows: 2 damage that goes through armor.'),
      row(ic('magic'), '3 = Magic', 'Two purple triangles: 2 magic to spend later.'),
      row(ic('gold'), '4 = Gold', 'Two gold coins: 2 gold to spend at camp.'),
      p('Bigger dice keep the pattern going: 5 to 8 pay three of each.'),
    ],
  },
  {
    title: 'Hands are your Strength',
    art: () => h('div', { class: 'tu-lane' }, board({ faces: START, hi: ['NW', 'W'] }),
      sum(img('weapon-red3', 'sm'), op('+'), img('white-4', 'sm'), op('='), counter('atk', 'Attack', 7))),
    body: () => [
      p('Each hand powers the weapon above it. Add the weapon’s number to the hand’s number: a +3 sword over a hand that rolled 4 makes 7 attack.'),
      p('The bigger your hand die, the harder every weapon hits. Your hands still pay their own symbol too, so that 4 also pays 2 gold.'),
    ],
  },
  {
    title: 'Weapon dice',
    art: () => h('div', { class: 'tu-faces four' }, ['weapon-red3', 'weapon-blue3', 'weapon-zero', 'weapon-red4'].map((n) => img(n))),
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
    art: () => h('div', { class: 'tu-faces three' }, ['talent-blank', 'talent-x2', 'talent-heal'].map((n) => img(n))),
    body: () => [
      p('Each talent die works with the hand above it.'),
      row(img('talent-blank', 'xs'), 'Blank', 'Nothing this time. Every talent die has two blank faces.'),
      row(img('talent-x2', 'xs'), '2× Strength', 'Counts that hand’s number twice in its weapon. A hand of 4 becomes 8.'),
      row(img('talent-heal', 'xs'), 'Symbol faces', 'Pay that symbol: one for every point on your hand. A hand of 4 pays 4. You choose your symbols at camp.'),
    ],
  },
  {
    title: 'The heart',
    eyebrow: 'The center die',
    art: () => h('div', { class: 'tu-faces six' }, [1, 2, 3, 4, 5, 6].map((n) => img(`heart-${n}`))),
    body: () => [
      p('The heart boosts the dice around it.'),
      row(img('heart-2', 'xs'), '1 to 4', 'Every white die showing the same number pays 2 more of its symbol. Heart 2 with two white 2s: 4 more pierce.'),
      row(img('heart-5', 'xs'), '5', '+4 block on each blue weapon.'),
      row(img('heart-6', 'xs'), '6', '+4 attack on each red weapon.'),
    ],
  },
  {
    title: 'Feet are your speed',
    eyebrow: 'Initiative',
    art: () => board({ faces: START, hi: ['S'] }),
    body: () => [
      p('Your feet pay their symbol like the other white dice, and their number is also your initiative.'),
      p('From round 2 on, each monster rolls its own die against your feet. If you roll higher, or tie, you strike first, and a monster might fall before it ever swings. Round 1 is always yours.'),
    ],
  },
  {
    title: 'Your six counters',
    eyebrow: 'What your roll adds up to',
    art: () => h('div', { class: 'tu-counters fs' }, counter('atk', 'Attack', 21), counter('pierce', 'Pierce', 2), counter('block', 'Block', 4), counter('magic', 'Magic', 2), counter('heal', 'Heal', 2), counter('gold', 'Gold', 8)),
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
      h('figure', {}, board({ hi: ['NW', 'N', 'NE'], line: 'row1' }), h('figcaption', {}, 'Weapons')),
      h('figure', {}, board({ hi: ['W', 'C', 'E'], line: 'row2' }), h('figcaption', {}, 'Strength')),
      h('figure', {}, board({ hi: ['N', 'C', 'S'], line: 'col' }), h('figcaption', {}, 'Head to Toe'))),
    body: () => [
      p('Three matching numbers in a line earn +10:'),
      row(ic('atk'), 'Weapons Triple: +10 attack', 'Top row. Both weapons’ +numbers match your head.'),
      row(ic('atk'), 'Strength Triple: +10 attack', 'Middle row. Hand, heart and hand match.'),
      row(ic('block'), 'Head to Toe Triple: +10 block', 'Head, heart and feet match.'),
      row(h('span', { class: 'tu-ic t-gold' }, HK.icon('star')), 'Straight', 'Five numbers in a row anywhere on your dice (like 1-2-3-4-5): +10 attack or +10 gold, your choice. Six in a row pays 18, seven pays 30.'),
    ],
  },
  {
    title: 'How a round goes',
    art: () => h('div', { class: 'tu-steps' },
      h('div', {}, h('span', { class: 'tu-num' }, '1'), HK.icon('dice'), h('b', {}, 'Roll')),
      h('div', {}, h('span', { class: 'tu-num' }, '2'), HK.icon('reroll'), h('b', {}, 'Reroll')),
      h('div', {}, h('span', { class: 'tu-num' }, '3'), HK.icon('lock'), h('b', {}, 'Lock in')),
      h('div', {}, h('span', { class: 'tu-num' }, '4'), HK.icon('atk'), h('b', {}, 'Fight'))),
    body: () => [
      row(h('span', { class: 'tu-plate' }, h('b', {}, 'GOBLIN'), h('i', {}, HK.icon('atk'), '3-6')), 'Read the monsters', 'Each monster’s box shows what it plans this round and how hard it may hit.'),
      row(ic('dice'), 'Roll', 'Tap Roll dice to throw your whole body.'),
      row(ic('reroll'), 'Reroll', 'Tap up to 4 dice, then Reroll. Three rerolls a round are free. After that, each die costs 1 magic.'),
      row(ic('lock'), 'Lock in', 'Tap a monster to choose your target, then Lock In. You and the monsters act, fastest first.'),
    ],
  },
  {
    title: 'Powers, potions and growing',
    art: () => h('div', { class: 'tu-pow' }, h('span', { class: 'tu-powbtn' }, h('span', { class: 'bp-tri' }, HK.icon('magic')), h('b', {}, 'Magic powers')), h('span', { class: 'tu-potion' }, HK.icon('heal'), h('b', {}, 'Potions'))),
    body: () => [
      row(ic('magic'), 'Three magic powers', 'The purple button opens them, paid for with magic. A is your big move, once a battle. B is small and works every round. C stores a charge each round for you to let go when it counts. Learn others at camp.'),
      row(ic('heal'), 'Healing potions', `Buy them at camp (${D.POTION_PRICE[0]} gold in Act I) and carry up to ${E.POTIONS}. Drinking one is free and heals ${E.POTION_HP}. Once you drink it, it’s gone, so restock before every road.`),
      row(ic('gold'), 'Camp', 'Win to earn gold, experience and sometimes a new weapon. At camp you buy new dice, bigger hands and talent symbols.'),
    ],
  },
  {
    title: 'Ready for your first battle?',
    final: true,
    art: () => board({ faces: { ...START, E: 'white-4' }, hi: ['W', 'C', 'E'], line: 'row2' }),
    body: () => [
      p('Next is a practice battle against one goblin. A guide points to each button the first time. Nothing is saved, so try whatever you like.'),
    ],
  },
];

// ------------------------------------------------------------------------------------------------ lesson deck
export function showLessons({ at = 0 } = {}) {
  closeLessons();
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
      h('div', { class: 'tu-art' }, h('div', { class: 'tu-badge' }, HK.icon(won ? 'crown' : 'heart'))),
      h('div', { class: 'tu-eyebrow' }, won ? 'Practice complete' : 'Practice over'),
      h('h2', { class: 'tu-title' }, won ? 'You’re ready, hero' : 'Good try. You’ve got the idea.'),
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
