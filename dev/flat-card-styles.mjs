// Every-round magic cards (Dave, 6 Nov 2026: "This needs to have plus 2 in orange next to it. We need to find a pattern we like. Either
// show 2 arrows or have the plus number... Give me 4 ways"): four ways to draw a fixed bonus card, on the real Magic Missile camp card.
// Mockups only. Headless Chromium, not Safari.     node dev/flat-card-styles.mjs [out=shots/flat-styles] [card=bolt] [class=wizard]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/flat-styles'; const ID = process.argv[3] || 'bolt'; const CLS = process.argv[4] || 'wizard'; const port = 8270; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });
const CSS = `
#fs{position:fixed;inset:0;overflow:auto;z-index:99999;background:#120c18;padding:12px;display:flex;flex-direction:column;align-items:center;gap:16px}
#fs>div{width:340px}
.fx{--c:#e8740c;--d:#8a3c00}.fx.block{--c:#2f7fe0;--d:#0c4a80}.fx.atk{--c:#e0262e;--d:#7a1010}.fx.heal{--c:#1fb85c;--d:#106a34}.fx.gold{--c:#d4a000;--d:#7a5a00}
.o{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.6cqi;width:100%;flex:1}
.o .ic{color:var(--c);overflow:visible}
.o .num{font:900 17cqi/1 var(--font-number,sans-serif);color:var(--c);letter-spacing:-.02em}
.o .word{font:900 6.4cqi/1 var(--ui,sans-serif);color:var(--c);letter-spacing:.06em;text-transform:uppercase}
.o .when{font:700 4.6cqi/1.2 var(--ui,sans-serif);color:#3a2614;display:flex;align-items:center;gap:1.4cqi}
.o .when .ic{width:5cqi;height:5cqi;color:#8a4de0}
.o .row{display:flex;align-items:center;justify-content:center;gap:3cqi}
/* A: symbol + number side by side (like Counterstrike) */
.oA .ic.big{width:24cqi;height:24cqi}
/* B: count the symbols, no number */
.oB .row{gap:1.6cqi;flex-wrap:wrap;max-width:80%}.oB .ic.big{width:19cqi;height:19cqi;filter:drop-shadow(0 .6cqi 0 var(--d))}
.oB .tally{font:800 4.2cqi/1 var(--ui,sans-serif);color:#6b5434}
/* C: one bold coloured pill */
.oC .pill{display:flex;align-items:center;gap:2.4cqi;padding:2.6cqi 6cqi 2.6cqi 4cqi;border-radius:99px;background:var(--c);box-shadow:inset 0 -1.2cqi 0 var(--d),0 1cqi 2cqi #0004}
.oC .pill .ic{width:15cqi;height:15cqi;color:#fff}.oC .pill .num{color:#fff;font-size:15cqi}.oC .pill .word{color:#fff;font-size:5.6cqi}
/* D: magic in, effect out */
.oD .eq{display:flex;align-items:center;justify-content:center;gap:3cqi}
.oD .mgem{display:flex;align-items:center;gap:1.2cqi;padding:1.6cqi 3cqi;border-radius:3cqi;background:#2a1a50;box-shadow:inset 0 0 0 .6cqi #8a4de0}.oD .mgem .ic{width:9cqi;height:9cqi;color:#b47cff}.oD .mgem b{font:900 10cqi/1 var(--ui,sans-serif);color:#fff}
.oD .to{font:900 8cqi/1 var(--ui,sans-serif);color:#7a5a2c}
.oD .out{display:flex;align-items:center;gap:1.4cqi;padding:1.6cqi 3.4cqi;border-radius:4cqi;background:#fff8ea;box-shadow:inset 0 0 0 .7cqi var(--c)}
.oD .out .ic{width:14cqi;height:14cqi}.oD .out .num{font-size:14cqi}
`;
const names = await p.evaluate(async ({ CSS, ID, CLS }) => {
  const MC = await import('./js/g3/magiccard.js'); const PW = await import('./js/g3/powers.js'); const HK = await import('./js/g3/hudkit.js'); const D = await import('./js/data.js'); const E = window.QD.E;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const wrap = document.createElement('div'); wrap.id = 'fs'; document.body.append(wrap);
  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; for (const k of kids) if (k != null) e.append(typeof k === 'string' ? document.createTextNode(k) : k); return e; };
  const k = D.CLASSES[CLS].cards.find((c) => c.id === ID); const [fx, v0] = Object.entries(k.fx)[0]; const v = E.scaleNum(v0, 0);
  const WORD = { pierce: 'Pierce', block: 'Block', atk: 'Attack', heal: 'Heal', gold: 'Gold', magic: 'Magic' };
  const icon = (big = true) => HK.icon(fx, big ? 'big' : '');
  const once = () => el('div', 'when', ...Array.from({ length: k.cost }, () => HK.icon('magic')), ` ${k.cost} magic · once a round`);
  const OPTS = {
    A: () => [el('div', 'row', icon(), el('b', 'num', `+${v}`)), el('div', 'word', WORD[fx]), once()],
    B: () => [el('div', 'row', ...Array.from({ length: v }, () => icon())), el('div', 'word', WORD[fx]), el('div', 'tally', `one ${WORD[fx].toLowerCase()} for each symbol`), once()],
    C: () => [el('div', 'pill', icon(), el('b', 'num', `+${v}`), el('span', 'word', WORD[fx])), once()],
    D: () => [el('div', 'eq', (() => { const g = el('span', 'mgem'); g.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M12 3 L22 20 H2 Z" fill="#b47cff"/></svg><b>${k.cost}</b>`; return g; })(), el('span', 'to', '→'), el('span', 'out', icon(), el('b', 'num', `+${v}`))), el('div', 'word', WORD[fx]), el('div', 'when', 'once a round')],
  };
  const out = [];
  for (const [key, build] of Object.entries(OPTS)) {
    const hero = E.newHero({ name: 'Style', cls: CLS, seed: 3 }); hero.level = 6; const c = MC.campCard(hero, ID, { glyph: PW.glyph });
    const panel = c.querySelector('.t28'); const rank = panel.querySelector('.t28-rank');
    panel.replaceChildren(...(rank ? [rank] : []), el('div', `o o${key} fx ${fx}`, ...build()));
    const box = el('div', ''); box.dataset.id = key; box.append(c); wrap.append(box); out.push(key);
  }
  await new Promise((r) => setTimeout(r, 1200)); return out;
}, { CSS, ID, CLS });
for (const n of names) { const e = await p.$(`#fs [data-id="${n}"]`); await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(120); await e.screenshot({ path: `${OUT}/${ID}-${n}.png` }); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
