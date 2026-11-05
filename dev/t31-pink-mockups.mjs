// T31 mockups (Dave, 5 Nov 2026: "a new color and new power opens up a tone for this game. Chain lightning. Meteor strike. Big ax spins."):
// pink dice for the part of a power that hits the other monsters, and a new Dwarf power, the Whirlwind. Mockups only: the game is
// unchanged. Each card is the real camp card (js/g3/magiccard.js) with its panel redrawn as the idea. Headless Chromium, not Safari.
//   node dev/t31-pink-mockups.mjs [out=shots/t31]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/t31'; const port = 8265; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });

const CSS = `
#t31{position:fixed;inset:0;overflow:auto;z-index:99999;background:#120c18;padding:12px;display:flex;flex-direction:column;align-items:center;gap:16px}
#t31>div{width:340px}
.p-row{display:flex;justify-content:center;align-items:center;gap:1.6cqi;flex-wrap:wrap}
.p-row .mc-die,.p-row .mc-space{width:10.4cqi!important;height:10.4cqi!important}
.p-row.small .mc-die,.p-row.small .mc-space{width:8.4cqi!important;height:8.4cqi!important}
.p-arrow{font:900 5cqi/1 var(--font-number,sans-serif);color:#a3105f}
.p-to{display:flex;align-items:center;justify-content:center;gap:1.6cqi;font:800 4.2cqi/1.1 var(--ui,sans-serif);color:#3a2614}
.p-to .ic{width:6.4cqi;height:6.4cqi;overflow:visible}
.p-to.pink{color:#a3105f}
.p-to.red{color:#7a1414}
.p-big{font:900 6cqi/1 var(--font-number,sans-serif)}
`;
const names = await p.evaluate(async (CSS) => {
  const MC = await import('./js/g3/magiccard.js'); const PW = await import('./js/g3/powers.js'); const HK = await import('./js/g3/hudkit.js'); const D = await import('./js/data.js'); const E = window.QD.E;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const wrap = document.createElement('div'); wrap.id = 't31'; document.body.append(wrap);
  const PINK = ['#ff4fb8', '#8a1050', '#fff'];
  const pinkDie = (s, v) => { const d = MC.die('atk', s, v); d.querySelector('path').setAttribute('fill', PINK[0]); d.querySelector('path').setAttribute('stroke', PINK[1]); return d; };
  const socket = (s) => { const d = MC.die('atk', s, s); d.classList.replace('mc-die', 'mc-space'); d.innerHTML = `<path d="${d.querySelector('path').getAttribute('d')}" fill="#6b4a1f26" stroke="#7a5a2c" stroke-width="1.3" stroke-linejoin="round"/>`; return d; };
  const row = (dice, cls = '') => { const r = document.createElement('div'); r.className = `p-row ${cls}`; r.append(...dice); return r; };
  const to = (cls, icon, ...bits) => { const r = document.createElement('div'); r.className = `p-to ${cls}`; if (icon) r.append(HK.icon(icon)); for (const b of bits) r.append(typeof b === 'string' ? document.createTextNode(b) : b); return r; };
  const big = (t) => Object.assign(document.createElement('b'), { className: 'p-big', textContent: t });
  const card = (cls, id, name, build) => {
    const hero = E.newHero({ name: 'Mock' + cls, cls, seed: 3 }); hero.level = 6; const c = MC.campCard(hero, id, { glyph: PW.glyph });
    const box = document.createElement('div'); box.dataset.id = name; box.append(c); wrap.append(box);
    const panel = c.querySelector('.t28'); build(panel, c); return name;
  };
  const out = [];
  // 3a. Arc Bolt as chain lightning: each bolt is a red d8 at your target and a pink d4 that arcs to every other monster (about half, as today)
  out.push(card('wizard', 'arcbolt', 'arcbolt-chain', (panel) => {
    panel.replaceChildren(
      row([MC.die('atk', 8, 7), MC.die('atk', 8, 5), MC.die('atk', 8, 8), socket(8), socket(8), socket(8)]),
      to('red', 'atk', 'Your target'),
      row([pinkDie(4, 3), pinkDie(4, 2), pinkDie(4, 4), socket(4), socket(4), socket(4)], 'small'),
      to('pink', 'splash', 'Arcs to every other monster'),
      Object.assign(document.createElement('div'), { className: 't28-fine', textContent: '2 magic a bolt · up to 6 bolts' }));
  }));
  // 3b. Cleave: every two red d6 bring one pink d6 for the others (exactly half, on average, as today)
  out.push(card('knight', 'cleave', 'cleave-pink', (panel) => {
    panel.replaceChildren(
      row([MC.die('atk', 6, 5), MC.die('atk', 6, 3), MC.die('atk', 6, 6), MC.die('atk', 6, 2), socket(6)]),
      to('red', 'atk', 'Your target'),
      row([pinkDie(6, 4), pinkDie(6, 6), socket(6)], 'small'),
      to('pink', 'splash', 'One pink die for every two red'),
      Object.assign(document.createElement('div'), { className: 't28-fine', textContent: '1 magic a die · up to 5 dice' }));
  }));
  // 4. The Whirlwind (Dwarf): a fistful of pink d6s, and every one hits every monster. A new learnable power; the stand-in picture is Forge Fury's.
  // a pretend Whirlwind, in this page only, so the real card draws its own name, cost and ranks (a dice power: 2 magic a pink d6, up to 6)
  D.CLASSES.dwarf.cards.push({ id: 'whirlwind', slot: 'A', name: 'Whirlwind', kind: 'scale', atwill: true, cost: 2, step: 2, max: 12, maxDice: 6, dice: { n: 1, s: 6, to: 'atk' }, aoe: 1, fx: { atk: 4 }, art: 'dwarf-forgefury', text: 'mockup' });
  out.push(card('dwarf', 'whirlwind', 'whirlwind', (panel, c) => {
    for (const d of c.querySelectorAll('.mc-lv .mc-die')) { d.querySelector('path').setAttribute('fill', PINK[0]); d.querySelector('path').setAttribute('stroke', PINK[1]); } // the rank covers' dice turn pink too
    panel.replaceChildren(
      row([pinkDie(6, 4), pinkDie(6, 6), pinkDie(6, 3), socket(6), socket(6), socket(6)]),
      to('pink', 'splash', 'Every die hits every monster'),
      to('', null, 'Best in a crowd · weak on a lone boss'),
      Object.assign(document.createElement('div'), { className: 't28-fine', textContent: '2 magic a die · up to 6 dice' }));
  }));
  await new Promise((r) => setTimeout(r, 1500));
  return out;
}, CSS);
for (const n of names) { const el = await p.$(`#t31 [data-id="${n}"]`); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await el.screenshot({ path: `${OUT}/${n}.png` }); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
