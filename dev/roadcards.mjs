// T09: the road's answer on phone screens, six examples (solo success and failure with the dice overlay, a company winner, a company
// tie, a walk-on, a cost with a temporary benefit). Viewports are the space Safari leaves on an iPhone, browser bars subtracted.
//   node dev/roadcards.mjs            OUT=docs/team/tasks/T09/rev2 PORT=8135 SIZES=390x664,430x746,375x548
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const OUT = process.env.OUT || 'docs/ingame/roadcards'; fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '390x664,430x746,375x548').split(',').map((s) => s.split('x').map(Number));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

// in the page: find a seed that gives the wanted result, then set the company up with it and return the result
async function setUp(p, ex) {
  return p.evaluate(async (ex) => {
    const { S, E } = window.QD; const R = await import('./js/roads.js');
    const make = (seed) => {
      const hs = ex.names.map((name, i) => { const h = E.newHero({ name, cls: ex.cls[i % ex.cls.length], seed: seed + i }); h.gold = 120; return h; });
      const c = hs[0].campaign; Object.assign(c, { act: ex.act, step: ex.step, wins: (ex.act - 1) * 10 + ex.step - 1, storySeen: { all: true } });
      for (const h of hs) h.campaign = c;
      c.road = { key: `${ex.act}.${ex.step}`, id: ex.road, done: false };
      return hs;
    };
    for (let seed = 1; seed < 4000; seed++) {
      const probe = make(seed); const r = R.chooseRoad(probe[0], probe, ex.choice);
      if (!r || !window.__want(ex.want, r)) continue;
      const hs = make(seed); S.hero = hs[0]; S.company = { kind: hs.length > 1 ? 'party' : 'solo', members: hs, campaign: hs[0].campaign };
      return { seed, res: ex.flow ? null : R.chooseRoad(hs[0], hs, ex.choice) };
    }
    return null;
  }, ex);
}
const EX = [
  { id: '1-solo-success', names: ['Ann'], cls: ['knight'], act: 1, step: 5, road: 't-troll', choice: 'answer', want: 'win', flow: true },
  { id: '2-solo-failure', names: ['Ann'], cls: ['ranger'], act: 2, step: 5, road: 't-chicken', choice: 'chase', want: 'lose', flow: true },
  { id: '3-company-winner', names: ['Ann', 'Bob', 'Cy', 'Dee', 'Eve', 'Fitzwilliam'], cls: ['wizard', 'dwarf', 'knight', 'bard', 'ranger'], act: 1, step: 2, road: 'm-rope', choice: 'go', want: 'one' },
  { id: '4-company-tie', names: ['Ann', 'Bob', 'Cy'], cls: ['knight', 'dwarf', 'ranger'], act: 2, step: 4, road: 'm-stars', choice: 'go', want: 'tie' },
  { id: '5-walk-on', names: ['Ann'], cls: ['bard'], act: 1, step: 3, road: 'well', choice: 'leave', want: 'any' },
  { id: '6-cost-and-benefit', names: ['Ann', 'Bob'], cls: ['dwarf', 'wizard'], act: 2, step: 3, road: 'stew', choice: 'seconds', want: 'sick' },
].filter((e) => !ONLY || ONLY.some((o) => e.id.startsWith(o)));

const report = [];
for (const [w, hgt] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.setDefaultTimeout(240000);
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
  await p.goto(`http://localhost:${process.env.PORT || 8135}/?debug&manual&q=low`);
  await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  await p.evaluate(() => { window.__want = (want, r) => want === 'any' || (want === 'win' && r.trial?.win) || (want === 'lose' && r.trial && !r.trial.win)
    || (want === 'one' && r.rolls?.filter((x) => x.won).length === 1) || (want === 'tie' && r.rolls?.filter((x) => x.won).length > 1) || (want === 'sick' && /lose \d+ health every round/.test(r.effect || '')); });
  const step = async (n) => { for (let i = 0; i < n; i++) await p.evaluate(() => window.QD.world.stage.step(1)); };
  for (const ex of EX) {
    const got = await setUp(p, ex); if (!got) { console.log('no seed for', ex.id); continue; }
    const tag = `${ex.id}_${w}x${hgt}`;
    if (ex.flow) { // the real path: the road screen, the dice overlay, then the result (with the rematch offer after a loss)
      await p.evaluate(() => window.QD.showRoad()); await p.waitForTimeout(900);
      await p.evaluate(() => document.querySelectorAll('.sx-choice')[0].click()); // the test is the first choice
      await p.waitForSelector('.tr-go:not([disabled])'); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('.tr-go').click());
      for (let i = 0; i < 900 && !(await p.evaluate(() => /Continue/.test(document.querySelector('.tr-go')?.textContent || ''))); i++) await step(2);
      await step(30); await p.waitForTimeout(500);
      if (w === 390) await p.screenshot({ path: `${OUT}/${ex.id}_overlay_${w}x${hgt}.png` });
      await p.evaluate(() => document.querySelector('.tr-go').click()); await p.waitForSelector('.sx-roadres'); await p.waitForTimeout(900);
    } else { await p.evaluate((res) => window.QD.showRoadResult(res), got.res); await p.waitForTimeout(900); }
    await step(1); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    // does it fit? the card, the buttons, anything overlapping, and whether the side panel scrolls
    const m = await p.evaluate(() => {
      const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
      const side = document.querySelector('.sx-side'); const btns = [...document.querySelectorAll('.sx-side button')].map((x) => x.getBoundingClientRect());
      let overlap = false; for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i]; const c = btns[j]; if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) overlap = true; }
      const eff = document.querySelector('.rr-effect')?.getBoundingClientRect(); const cta = document.querySelector('.sx-cta')?.getBoundingClientRect();
      const fonts = [...document.querySelectorAll('.rr-chip, .rr-sum, .rr-effect span, .rr-prose')].map((e) => parseFloat(getComputedStyle(e).fontSize));
      return { tale: r('.sx-tale'), cta: r('.sx-cta'), effect: r('.rr-effect'), scrolls: side ? side.scrollHeight > side.clientHeight + 2 : null, sideH: side?.clientHeight, sideScroll: side?.scrollHeight,
        buttonsOverlap: overlap, effectUnderCta: !!(eff && cta && eff.bottom > cta.top + 1), minFont: Math.min(...fonts), text: document.querySelector('.sx-tale')?.innerText.replace(/\n+/g, ' | '),
        buttons: [...document.querySelectorAll('.sx-side button')].map((x) => x.innerText.trim()).filter(Boolean).join(' / ') };
    });
    if (m.scrolls) { await p.evaluate(() => { const s = document.querySelector('.sx-side'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${tag}_scrolled.png` }); }
    report.push({ tag, seed: got.seed, ...m });
    console.log(tag, JSON.stringify(m));
  }
  await p.close();
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
await b.close();
