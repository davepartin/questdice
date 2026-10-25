// Magic as physical cards (Crockpot / Grok Bot, 25 Oct). Mockup only: real Wizard data from js/data.js, no game numbers changed.
const v = new URLSearchParams(location.search).get('v') || 'battle';
const G = { // simple purple glyphs on the card art discs
  bolt: '<svg viewBox="0 0 100 100"><path fill="#ffd34a" d="M58 4 L22 56 H46 L38 96 L80 40 H54 Z"/></svg>',
  missile: '<svg viewBox="0 0 100 100"><path fill="#ff9a3a" d="M10 90 L52 48 L58 54 L16 96 Z M20 70 L46 44 M64 18 L72 34 L90 36 L76 48 L80 66 L64 56 L48 64 L52 46 L40 34 L58 32 Z"/></svg>',
  coil: '<svg viewBox="0 0 100 100"><path fill="none" stroke="#ff5a7a" stroke-width="8" stroke-linecap="round" d="M50 50 m-6 0 a6 6 0 1 1 12 0 a14 14 0 1 1 -28 0 a22 22 0 1 1 44 0 a30 30 0 1 1 -60 0"/></svg>',
  meteor: '<svg viewBox="0 0 100 100"><circle cx="62" cy="62" r="22" fill="#ff7a2a"/><path fill="#ffb05a" d="M8 12 L48 46 L42 52 Z M20 6 L54 40 L50 44 Z M6 26 L44 54 L40 58 Z"/></svg>',
  wall: '<svg viewBox="0 0 100 100"><path fill="#7ab8ff" d="M10 30 H90 V46 H10 Z M10 52 H48 V68 H10 Z M54 52 H90 V68 H54 Z M10 74 H90 V90 H10 Z"/></svg>',
  light: '<svg viewBox="0 0 100 100"><path fill="#6cf0a0" d="M42 14 H58 V42 H86 V58 H58 V86 H42 V58 H14 V42 H42 Z"/></svg>',
};
const P = {
  arcbolt: { slot: 'A', kind: 'Big move', name: 'Arc Bolt', g: 'bolt', min: 2, ef: '1d8 attack, more magic = more dice', text: 'Point. Spark. Roll attack dice. 2 magic = 1d8; every 2 more magic adds a die, up to 5d8.', rule: 'Once a battle' },
  bolt: { slot: 'B', kind: 'Every round', name: 'Magic Missile', g: 'missile', min: 1, ef: '+2 pierce', text: 'Every round: +2 pierce. Small, rude, and on time.', rule: 'Usable every round' },
  coil: { slot: 'C', kind: 'Charge', name: 'Storm Coil', g: 'coil', min: 1, ef: 'Store 1 a round, release 4–10 attack', text: 'Store 1 magic a round (max 4), then release: 4, 6, 8, 10 attack. Half splashes.', rule: 'Charges 0 of 4' },
  meteor: { slot: 'A', kind: 'Big move', name: 'Meteor', g: 'meteor', min: 5, ef: 'Round 3+: 4 × round attack', text: 'Round 3+: attack equal to 4 × the round number; half splashes to the others.', rule: 'Needs Level 5' },
  barrier: { slot: 'B', kind: 'Every round', name: 'Barrier', g: 'wall', min: 1, ef: '+4 block', text: 'Every round: +4 block. A wall you packed yourself.', rule: '' },
  light: { slot: 'C', kind: 'Charge', name: 'Healing Light', g: 'light', min: 1, ef: 'Store 1 a round, release heal 5–11', text: 'Store 1 magic a round (max 4), then release: heal 5, 7, 9, 11.', rule: '' },
};
const tris = (n) => `<span class="cost">${'<i></i>'.repeat(Math.min(n, 5))}${n > 5 ? `<b>${n}</b>` : ''}</span>`;
const have = v === 'battle-low' ? 1 : 12, cap = 19;
const state = (id) => { const p = P[id];
  if (id === 'arcbolt' && v === 'battle-low') return ['no', `Need ${p.min - have} more ▲`];
  return ['ready', 'Ready · tap'];
};
function small(id, { sel = false, camp = '' } = {}) { const p = P[id]; const [k, s] = camp ? camp : state(id);
  return `<button class="pc${k === 'no' || k === 'lock' ? ' off' : ''}${sel ? ' sel' : ''}" data-id="${id}"><div class="face"><div class="slot"><span><b>${p.slot}</b> ${p.kind}</span>${tris(p.min)}</div>
  <div class="art">${G[p.g]}</div><div class="nm">${p.name}</div><div class="ef">${p.ef}</div><div class="st ${k === 'lock' ? 'no' : k}">${s}</div></div></button>`; }
const pool = `<div class="pool"><div class="big"><span class="tri"></span>${have}</div><div class="lbl"><b>Magic to spend</b><br>${v === 'battle-low' ? 'Your magic dice add +4 when you Lock in' : 'Max ' + cap + '. Spent magic is gone this battle'}</div><div class="toks">${Array.from({ length: cap }, (_, i) => `<i class="${i < have ? '' : 'off'}"></i>`).join('')}</div></div>`;
const helpers = `<div class="sec"><span>Quick help</span><span>not class powers</span></div><div class="helpers">
 <button class="hl"><span class="ico" style="background:#2f7d4a">+</span><span>Potion<small>2 left · free</small></span></button>
 <button class="hl"><span class="ico" style="background:#2f7d4a">♥</span><span>Heal<small>${tris(2)}</small></span></button>
 <button class="hl"><span class="ico" style="background:#8a2a3a">♥</span><span>Heart<small>${tris(3)}</small></span></button></div>`;
const scene = `<div class="scene"><span class="hint">ROUND 1 · SKULKER</span></div>`;
function battle(sel) {
  return `<div class="scr">${scene}<section class="tray"><h2>Your magic cards <button class="x">✕ Done</button></h2>${pool}
  <div class="sec"><span>Pick one card</span><span>tap to read · cost = ▲</span></div><div class="hand">${['arcbolt', 'bolt', 'coil'].map((id) => small(id, { sel: id === sel })).join('')}</div>
  ${helpers}<p class="tip">Cards stay in your hand. Nothing is spent until you press <b>Cast</b>.</p></section></div>`;
}
function bigCard(id, low) { const p = P[id]; const pick = 6;
  const steps = [2, 4, 6, 8, 10].map((m, i) => `<button class="${m === pick && !low ? 'on' : ''}" ${m > have ? 'disabled' : ''}><span>${i + 1}d8</span><span class="cost"><i></i>${m}</span></button>`).join('');
  return `<div class="veil"><article class="bigc"><div class="slot"><span><b>${p.slot}</b>${p.kind}</span><span>${p.rule}</span></div><div class="art">${G[p.g]}</div><h3>${p.name}</h3><p>${p.text}</p>
  <div class="pick"><div class="q">How much magic?</div><div class="steps">${steps}</div></div>
  ${low ? `<div class="why">Needs at least ${tris(2)} — you have ${have}. Lock in your roll to add your magic dice.</div><button class="go" disabled>Cast · <span class="tri"></span>2</button>`
    : `<div class="after">Rolls <b>3d8 attack</b> now · you keep <b>${have - pick} ▲</b></div><button class="go">Cast Arc Bolt · <span class="tri"></span>${pick}</button>`}
  </article><button class="back">BACK TO CARDS</button></div>`; }
function camp(open) {
  const eq = ['arcbolt', 'bolt', 'coil'], lib = ['meteor', 'barrier', 'light'];
  const st = { meteor: ['lock', 'Level 5'], barrier: ['ready', 'Learn · 50 gold'], light: ['ready', 'Learn · 50 gold'] };
  return `<div class="scr"><div class="camphd"><h1>Spellbook</h1><p>Magic Dave · Level 4 Wizard · <span style="color:#ffd34a">● 420</span></p></div>
  <section class="tray" style="margin-top:4px"><div class="sec"><span>In your hand (one per letter)</span><span>these go to battle</span></div>
  <div class="sockets">${eq.map((id) => small(id, { camp: ['used', 'In hand'] })).join('')}</div>
  <div class="sec" style="margin-top:4px"><span>Other cards you can learn</span><span>tap to read</span></div>
  <div class="lib">${lib.map((id) => small(id, { camp: st[id], sel: id === open })).join('')}</div>
  <p class="tip">Learn a card once, then swap it into its letter any time in camp.</p></section>
  ${open ? `<div class="veil"><article class="bigc"><div class="slot"><span><b>${P[open].slot}</b>${P[open].kind}</span><span>Not learned</span></div><div class="art">${G[P[open].g]}</div><h3>${P[open].name}</h3><p>${P[open].text}</p>
   <div class="rule">Costs ${tris(1)} each round in battle</div><div class="after">Replaces <b>Magic Missile</b> in slot B (you keep Missile to swap back)</div>
   <button class="go" style="background:linear-gradient(#e9b949,#b8821c);box-shadow:0 4px 0 #6b4a12;color:#2e1d10">Learn &amp; put in hand · ● 50</button></article><button class="back">BACK</button></div>` : ''}</div>`;
}
const app = document.getElementById('app');
app.innerHTML = v === 'battle' ? battle() : v === 'battle-low' ? battle() + bigCard('arcbolt', true) : v === 'card' ? battle('arcbolt') + bigCard('arcbolt') : v === 'camp-card' ? camp('barrier') : camp();
await document.fonts.ready; document.body.dataset.ready = 1;
