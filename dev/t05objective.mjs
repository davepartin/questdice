// T05: the Objective / Secret Objective fronts drawn by the shared renderer (js/g3/cards.js) from the game's own data: all 44 cards (plus the free-try, staked and
// offered-bribe terms) at the narrowest card width a phone gets (250 px) and the widest (330 px). Fails when text spills the frame or the emblem is squeezed out.
//   node dev/serve.mjs 8140   then   node dev/t05objective.mjs [port=8140] [out=docs/team/tasks/T05/objectives]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const port = process.argv[2] || 8140; const OUT = process.argv[3] || 'docs/team/tasks/T05/objectives'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* */ } });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const res = await p.evaluate(async () => {
  const CW = await import('./js/g3/cards.js'); const S = await import('./js/secrets.js');
  const cards = []; // [label, html]
  for (const id of Object.keys(S.BONUS_GOALS)) { cards.push([`obj:${id}:staked`, CW.objectiveCardHtml('objective', CW.objectiveData(id, 2))]); const d = CW.objectiveData(id, 2); d.stake = 0; d.free = true; d.net = d.back; cards.push([`obj:${id}:free`, CW.objectiveCardHtml('objective', d)]); }
  for (const id of Object.keys(S.CARDS)) { const d = CW.secretData(id, 2); const parts = CW.envelopeCardParts({ id, name: d.name, rule: d.rule, stakes: d.stakes, mode: d.mode, terms: d.terms }, false); cards.push([`sec:${id}:${parts[0]}`, CW.objectiveCardHtml(...parts)]); }
  const out = []; const holder = document.createElement('div'); holder.id = 'objtest'; holder.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#15100c;padding:8px;display:flex;flex-wrap:wrap;gap:8px;width:1600px;overflow:auto;max-height:100vh'; document.body.append(holder);
  for (const w of [250, 330]) {
    holder.innerHTML = cards.map(([, h]) => h).join(''); holder.querySelectorAll('.qo').forEach((e) => e.style.setProperty('--w', `${w}px`));
    await new Promise((r) => setTimeout(r, 400)); await document.fonts.ready;
    [...holder.querySelectorAll('.qo')].forEach((el, i) => {
      const inn = el.querySelector('.in'); const emb = el.querySelector('.emb'); const card = el.getBoundingClientRect(); const e = emb.getBoundingClientRect(); const ib = inn.getBoundingClientRect();
      const kids = [...inn.children].map((c) => c.getBoundingClientRect()); const bottom = Math.max(...kids.map((k) => k.bottom)); const wide = [...inn.querySelectorAll('*')].some((c) => c.getBoundingClientRect().right > ib.right + 1.5);
      const small = [...inn.querySelectorAll('.goal,.t,.t b,.t small,.chip,.ttl')].map((c) => parseFloat(getComputedStyle(c).fontSize));
      out.push({ w, label: cards[i][0], h: Math.round(card.height), emblem: Math.round(e.height), emblemShare: +(e.height / card.height).toFixed(2), spillY: Math.round(bottom - ib.bottom), spillX: wide, minFont: Math.min(...small), imgs: [...el.querySelectorAll('img')].every((m) => m.complete && m.naturalWidth > 0) });
    });
    window.__sheet = window.__sheet || {};
  }
  return { out, count: cards.length };
});
fs.writeFileSync(`${OUT}/check.json`, JSON.stringify(res.out, null, 1));
let bad = 0; const fail = (m) => { bad++; console.log('FAIL', m); };
for (const r of res.out) { if (r.spillY > 1) fail(`${r.label} @${r.w}: text spills the frame by ${r.spillY}px`); if (r.spillX) fail(`${r.label} @${r.w}: spills sideways`); if (r.emblemShare < (/wager/.test(r.label) ? 0.1 : 0.14)) fail(`${r.label} @${r.w}: emblem squeezed to ${r.emblem}px (${r.emblemShare})`); if (!r.imgs) fail(`${r.label}: an image did not load`); }
const small = res.out.filter((r) => r.w === 250); console.log(`${res.count} cards; at 250 px: smallest text ${Math.min(...small.map((r) => r.minFont))}px, emblem share ${Math.min(...small.map((r) => r.emblemShare))} to ${Math.max(...small.map((r) => r.emblemShare))}`);
// contact sheets (250 px): objectives, then secret objectives in pages of 12
await p.evaluate(async () => { document.querySelectorAll('.qo').forEach((e) => e.style.setProperty('--w', '250px')); });
const nObj = res.out.filter((r) => r.w === 250 && r.label.startsWith('obj:')).length;
for (const [name, from, to] of [['objectives-1', 0, 12], ['objectives-2', 12, nObj], ['secret-1', nObj, nObj + 12], ['secret-2', nObj + 12, nObj + 24], ['secret-3', nObj + 24, res.count]]) {
  await p.evaluate(([f, t]) => { document.querySelectorAll('#objtest .qo').forEach((e, i) => { e.style.display = i >= f && i < t ? '' : 'none'; }); document.getElementById('objtest').style.width = '1020px'; }, [from, to]);
  await p.setViewportSize({ width: 1040, height: 1100 }); await p.waitForTimeout(300); await p.locator('#objtest').screenshot({ path: `${OUT}/sheet-${name}.png` });
}
console.log(bad ? `${bad} FAILED` : 'all cards fit'); await b.close(); process.exit(bad ? 1 : 0);
