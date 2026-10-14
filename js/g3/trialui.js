// The roll for a test on the road (trials.js): your dice board with every socket dark except the dice being tested (the head for wisdom,
// both hands for strength, the feet for speed), the other side's dice across from it, one tap to throw. The result is already decided by
// the seeded roll; this only shows it. Resolves when the player taps Continue.
import { h, reduced } from '../dom.js';
import * as HK from './hudkit.js';
import { STATS } from '../trials.js';
import { sfx } from '../audio.js';

// the nine sockets, as on the battle board
const BOARD = [['NW', 'Weapon'], ['N', 'Head'], ['NE', 'Weapon'], ['W', 'Hand'], ['C', 'Heart'], ['E', 'Hand'], ['SW', 'Talent'], ['S', 'Feet'], ['SE', 'Talent']];
const dieEl = (size, tone, i) => { const n = h('b', {}, '?'); return { n, el: h('div', { class: `dr-die d${size} ${tone} tr-die`, style: { '--i': i } }, h('span', { class: 'dr-shape' }), n, h('small', { class: 'tr-size' }, `d${size}`)) }; };

export function showTrial(trial, { title = '', host = document.body } = {}) {
  return new Promise((resolve) => {
    const st = STATS[trial.stat] || STATS.wisdom; const slow = !reduced();
    const timers = []; const later = (ms, fn) => timers.push(setTimeout(fn, slow ? ms : 0));
    // your board: only the tested sockets are lit, each holding one of your dice
    const mine = trial.heroSizes.map((s, i) => dieEl(s, 'tr-bone', i));
    let k = 0;
    const board = h('div', { class: 'tr-board', 'aria-hidden': 'true' }, BOARD.map(([slot, label]) => {
      const lit = st.slots.includes(slot);
      return h('div', { class: `tr-sock ${lit ? 'lit' : ''}` }, lit ? mine[k++].el : h('small', {}, label));
    }));
    const theirs = trial.oppSizes.map((s, i) => dieEl(s, 'tr-foe', i + 2));
    const sumMine = h('b', { class: 'tr-sum' }, '–'); const sumTheirs = h('b', { class: 'tr-sum' }, '–');
    const verdict = h('div', { class: 'tr-verdict' });
    const go = h('button', { type: 'button', class: 'dr-ok tr-go' }, `Roll ${trial.heroSizes.length > 1 ? 'your dice' : 'your die'}`);
    const card = h('div', { class: `dr-card tr-card st-${trial.stat}`, role: 'dialog', 'aria-label': `${st.word}: ${title}` },
      h('small', { class: 'dr-kicker' }, st.word), h('h3', {}, title),
      h('p', { class: 'tr-who' }, `${trial.who} rolls ${st.die === 'hands' ? 'both hands' : `the ${st.die} die`} for ${st.name.toLowerCase()}. Highest wins; a tie goes to you.`),
      h('div', { class: 'tr-field' },
        h('div', { class: 'tr-side me' }, h('small', {}, trial.who), board, sumMine),
        h('div', { class: 'tr-vs' }, 'VS'),
        h('div', { class: 'tr-side them' }, h('small', {}, trial.foe || 'The other side'), h('div', { class: 'tr-their' }, theirs.map((d) => d.el)), sumTheirs)),
      verdict, go);
    const layer = h('div', { class: 'dr-layer tr-layer' }, card);
    host.append(layer); sfx.uiOpen?.();
    const close = () => { timers.forEach(clearTimeout); layer.classList.add('out'); setTimeout(() => { layer.remove(); resolve(); }, 220); };
    let rolled = false;
    go.onclick = () => {
      if (rolled) { close(); return; }
      rolled = true; go.disabled = true;
      const all = [...mine.map((d, i) => ({ d, v: trial.heroDice[i], size: trial.heroSizes[i] })), ...theirs.map((d, i) => ({ d, v: trial.oppDice[i], size: trial.oppSizes[i] }))];
      all.forEach(({ d }) => d.el.classList.add('rolling'));
      sfx.diceRoll?.(Math.min(9, 3 + all.length * 2));
      const flick = slow ? setInterval(() => { for (const { d, size } of all) if (d.el.classList.contains('rolling')) d.n.textContent = String(1 + Math.floor(Math.random() * size)); }, 70) : null;
      let a = 0; let b = 0;
      all.forEach(({ d, v }, i) => later(700 + i * 420, () => {
        d.el.classList.remove('rolling'); d.el.classList.add('landed'); d.n.textContent = String(v); sfx.dieSettle?.();
        if (i < mine.length) { a += v; sumMine.textContent = String(a); } else { b += v; sumTheirs.textContent = String(b); }
        if (i === all.length - 1) {
          clearInterval(flick);
          later(350, () => {
            card.classList.add(trial.win ? 'won' : 'lost');
            verdict.replaceChildren(h('b', {}, trial.win ? 'You win!' : 'Not this time'), h('span', {}, `${trial.heroTotal} against ${trial.oppTotal}`));
            if (trial.win) sfx.level?.(); else sfx.error?.();
            go.textContent = 'Continue'; go.disabled = false; go.focus?.();
          });
        }
      }));
    };
  });
}
// a small badge for a test choice on the road: the stat's name
export const statBadge = (stat) => { const st = STATS[stat]; return st ? h('span', { class: `tr-badge st-${stat}` }, HK.icon(stat === 'wisdom' ? 'magic' : stat === 'strength' ? 'atk' : 'windup'), st.name) : null; };
