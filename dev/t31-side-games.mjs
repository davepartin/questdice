// T31 side games (Dave, 5 Nov 2026: "you roll green dice when you have a magic power that heals you, you roll a pink dice to try to do
// some splash damage, maybe sometimes you roll one pink and one pierce... a yellow d6 and get some gold... I could picture that on a
// table playing games with my friends"). Eight learnable magic cards, each a little dice game, drawn on the real camp card
// (js/g3/magiccard.js) with its panel redrawn. Mockups only: the game is unchanged; prices are first guesses for the bots to tune.
//   node dev/t31-side-games.mjs [out=shots/t31-side]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/t31-side'; const port = 8267; fs.mkdirSync(OUT, { recursive: true });
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
#t31 .mc-levels,#t31 .mc-lv:not(.act){display:none}
.sg{display:flex;flex-direction:column;align-items:center;gap:1.8cqi;width:100%}
.sg-row{display:flex;justify-content:center;align-items:center;gap:2cqi;flex-wrap:wrap}
.sg-row .mc-die,.sg-row .mc-space{width:12.4cqi!important;height:12.4cqi!important}
.sg-plus{font:900 6cqi/1 var(--font-number,sans-serif);color:#7a5a2c}
.sg-to{display:flex;align-items:center;justify-content:center;gap:1.4cqi;font:800 4.3cqi/1.1 var(--ui,sans-serif);color:#3a2614;flex-wrap:wrap}
.sg-to .ic{width:6.2cqi;height:6.2cqi;overflow:visible}
.sg-tab{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:1.2cqi 2.4cqi;font:900 5cqi/1 var(--font-number,sans-serif);color:#3a2614}
.sg-tab .mc-die{width:9cqi!important;height:9cqi!important}
.sg-tab .pay{display:flex;align-items:center;gap:1cqi;font-size:5.4cqi}.sg-tab .pay .ic{width:6cqi;height:6cqi}.sg-tab .none{color:#9a8060;font:700 4.2cqi/1 var(--ui,sans-serif)}
.mc-trait .ic{width:1.15em;height:1.15em}.sg-tab .pay .ic{color:currentColor}
.sg-fine{font:600 3.8cqi/1.2 var(--ui,sans-serif);color:#6b5434;text-align:center}
.c-atk{color:#c81e28}.c-pierce{color:#d0620a}.c-block{color:#1a6ad8}.c-heal{color:#14a850}.c-gold{color:#a87800}.c-magic{color:#7a3ec8}.c-splash{color:#d4167e}
.sg-pick{display:grid;grid-template-columns:repeat(5,1fr);gap:1.6cqi;justify-items:center}
.sg-pick .mc-die{width:10cqi!important;height:10cqi!important}
`;
const names = await p.evaluate(async (CSS) => {
  const MC = await import('./js/g3/magiccard.js'); const PW = await import('./js/g3/powers.js'); const HK = await import('./js/g3/hudkit.js'); const D = await import('./js/data.js'); const E = window.QD.E;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const wrap = document.createElement('div'); wrap.id = 't31'; document.body.append(wrap);
  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; for (const k of kids) if (k != null) e.append(typeof k === 'string' ? document.createTextNode(k) : k); return e; };
  const pink = (s, v) => { const d = MC.die('atk', s, v); d.querySelector('path').setAttribute('fill', '#ff4fb8'); d.querySelector('path').setAttribute('stroke', '#8a1050'); return d; };
  const die = (fx, s, v) => (fx === 'splash' ? pink(s, v) : MC.die(fx, s, v));
  const row = (...kids) => el('div', 'sg-row', ...kids);
  const plus = () => el('span', 'sg-plus', '+');
  const to = (...parts) => el('div', 'sg-to', ...parts.map((x) => (Array.isArray(x) ? el('span', `c-${x[0]}`, HK.icon(x[0]), ` ${x[1]}`) : x)));
  const fine = (t) => el('div', 'sg-fine', t);
  const table = (fx, rows) => el('div', 'sg-tab', ...rows.flatMap(([a, b, pay]) => [row(die(fx, 6, a), die(fx, 6, b)), el('b', '', `${a}–${b}`), pay ? el('span', `pay c-${pay[0]}`, HK.icon(pay[0]), `+${pay[1]}`) : el('span', 'none', 'nothing')]));
  const out = [];
  const card = (cls, art, name, cost, kids, tag) => {
    const id = 'sg' + out.length; D.CLASSES[cls].cards.push({ id, slot: 'B', name, kind: 'flat', atwill: true, cost, fx: {}, art, text: 'mockup' });
    const hero = E.newHero({ name: 'Side' + cls, cls, seed: 3 }); hero.level = 6; const c = MC.campCard(hero, id, { glyph: PW.glyph });
    for (const t of c.querySelectorAll('.mc-trait')) t.remove();
    const tags = c.querySelector('.mc-traits'); if (tags && tag) { const t = el('span', `mc-trait ${tag[0]} c-${tag[1]}`, tag[1] === 'splash' ? HK.icon('splash') : null, tag[2]); t.style.cssText = 'display:inline-flex;align-items:center;gap:.25em'; tags.append(t); }
    c.querySelector('.t28').replaceChildren(el('div', 'sg', ...kids));
    const box = el('div', ''); box.dataset.id = `${String(out.length + 1).padStart(2, '0')}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`; box.append(c); wrap.append(box); out.push(box.dataset.id);
  };
  card('bard', 'bard-crowdpleaser', 'Crowd Pleaser', 2, [table('gold', [[1, 2, null], [3, 4, ['gold', 5]], [5, 6, ['gold', 10]]]), to('Roll a gold die: impress the crowd'), fine('About 5 gold a roll, on average')], ['party', 'gold', 'Side game']);
  card('bard', 'bard-battlehymn', 'Battle Hymn', 3, [row(die('heal', 6, 5), die('heal', 6, 3), plus(), die('splash', 4, 3)), to(['heal', 'every hero'], ['splash', 'every other monster']), fine('Two green d6 and a pink d4')], ['splash', 'splash', 'Mixed']);
  card('knight', 'knight-showboat', 'Showboat', 2, [row(die('atk', 6, 4), plus(), die('gold', 6, 5)), to(['atk', 'your target'], ['gold', '5–6: +5 gold']), fine('A red d6 and a gold d6: hit, and play to the crowd')], ['party', 'gold', 'Mixed']);
  card('ranger', 'ranger-thiefsgambit', "Thief's Gambit", 2, [row(die('pierce', 4, 3), plus(), die('gold', 6, 6)), to(['pierce', 'your target'], ['gold', '5–6: +5 gold']), fine('An orange d4 and a gold d6: a quick cut, and a purse')], ['party', 'gold', 'Mixed']);
  card('dwarf', 'dwarf-whirlwind', 'Whirlwind', 2, [row(die('splash', 4, 4), die('splash', 4, 2), die('splash', 4, 3), el('span', 'mc-space-wrap')), to(['splash', 'every monster']), fine('2 magic a pink d4 · up to 6 · each monster\'s block stops it')], ['splash', 'splash', 'Every monster']);
  card('knight', 'knight-fielddressing', 'Field Dressing', 2, [row(die('heal', 6, 4), plus(), die('block', 6, 5)), to(['heal', 'you'], ['block', 'this round']), fine('A green d6 and a blue d6: patch up, brace')], ['party', 'heal', 'Mixed']);
  card('wizard', 'wizard-missile', 'Wild Surge', 2, [table('magic', [[1, 2, null], [3, 5, ['magic', 2]], [6, 6, ['magic', 5]]]).cloneNode(true), to('A purple gamble: your magic back, or more'), fine('Pays back a little under what it costs, on average')], ['party', 'magic', 'Side game']);
  card('ranger', 'ranger-quickdraw', "Adventurer's Choice", 4, [el('div', 'sg-pick', die('atk', 6, 6), die('pierce', 4, 4), die('splash', 4, 4), die('block', 8, 8), die('heal', 6, 6)), to('Pick any 3 dice, then roll them'), fine('4 magic · red d6 · orange d4 · pink d4 · blue d8 · green d6')], ['party', 'dice', 'Your mix']);
  // Wild Surge's table: 3–5 is three faces, so draw it by hand (the gold table pairs two faces a row)
  const ws = wrap.querySelector('[data-id$="wild-surge"] .sg-tab'); if (ws) ws.replaceWith(el('div', 'sg-tab', row(die('magic', 6, 1), die('magic', 6, 2)), el('b', '', '1–2'), el('span', 'none', 'nothing'), row(die('magic', 6, 3), die('magic', 6, 5)), el('b', '', '3–5'), el('span', 'pay c-magic', HK.icon('magic'), '+2'), row(die('magic', 6, 6)), el('b', '', '6'), el('span', 'pay c-magic', HK.icon('magic'), '+5')));
  await new Promise((r) => setTimeout(r, 1500));
  return out;
}, CSS);
for (const n of names) { const e = await p.$(`#t31 [data-id="${n}"]`); await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(120); await e.screenshot({ path: `${OUT}/${n}.png` }); }
console.log(names.join(' ')); console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
