// Camp cp3 (Crockpot / Grok Bot, 27 Oct 2026; Dave: "when I click the dice to upgrade, I want the screen to scroll down and show the card"):
// tapping a die in the camp dice grid smooth-scrolls the sheet so the inspection/upgrade card starts below the pinned Camp header band, the Camp
// title and the name/coins chip. Instant under reduced motion. Also checks Talent Upgrade still scrolls to the face picker (cp1).
//   CHROME=... node dev/camp-cp3.mjs [out=/workspace/camp-cp3] [port=8163]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cp3'; const port = +(process.argv[3] || 8163); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const errs = [];
async function session(vw, vh, reducedMotion, fn) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion }); const p = await ctx.newPage(); p.setDefaultTimeout(120000); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Bartholomew', cls: 'knight', seed: 5 }); hh.gold = 600; hh.campaign.act = 1; hh.campaign.step = 3;
    S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await pump(2);
  try { await fn(p, pump); } finally { await ctx.close(); }
}
// the card's top edge against everything pinned above it (the wood band is 62px + notch; the chip and the Camp title are measured)
const measure = (p) => p.evaluate(() => {
  const side = document.querySelector('.sx-side'); const card = document.querySelector('#camp-inspector'); if (!card) return { missing: true };
  const q = card.getBoundingClientRect(); const chip = document.querySelector('.sx-sidetop .sx-chip')?.getBoundingClientRect(); const title = document.querySelector('.cw-camp .sx-viewport .sx-top')?.getBoundingClientRect();
  const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0;
  const pinned = Math.max(62 + safe, chip?.bottom || 0, title?.bottom || 0);
  return { top: Math.round(q.top), bottom: Math.round(q.bottom), pinned: Math.round(pinned), vh: innerHeight, st: Math.round(side.scrollTop), max: Math.round(side.scrollHeight - side.clientHeight), maxed: side.scrollTop >= side.scrollHeight - side.clientHeight - 2 };
});
const okCard = (m) => !m.missing && m.top >= m.pinned - 1 && m.top < m.vh - 120 && (m.maxed || m.top <= m.pinned + 40); // below the header, and scrolled up to it (unless the page has no more to scroll)
const tapDie = async (p, pump, slot, wait = 1300) => { await p.locator(`.cw-cell.s-${slot}`).first().scrollIntoViewIfNeeded(); await p.locator(`.cw-cell.s-${slot}`).first().tap(); await pump(0.3); await p.waitForTimeout(wait); await pump(0.2); };
const label = (p, slot) => p.evaluate((slot) => document.querySelector(`.cw-cell.s-${slot} .cw-label`)?.textContent, slot);
const toTop = (p, pump) => p.evaluate(() => { const s = document.querySelector('.sx-side'); s.scrollTop = 0; }).then(() => pump(0.2));

for (const [vw, vh, tag] of [[390, 844, '390x844'], [375, 667, '375x667']]) {
  await session(vw, vh, 'no-preference', async (p, pump) => {
    const slots = await p.evaluate(() => [...document.querySelectorAll('.cw-cell:not(.off)')].map((c) => [...c.classList].find((x) => /^s-/.test(x)).slice(2)));
    check(`${tag}: grid has several active dice`, slots.length >= 5, slots.join());
    // 1. every die in the grid, from the top of the page
    for (const slot of slots) {
      await p.evaluate(() => { document.querySelector('.cw-nav button[data-camp-page="dice"]')?.click(); }); await pump(0.3); await toTop(p, pump);
      await tapDie(p, pump, slot); const m = await measure(p);
      check(`${tag}: tapping ${slot} (${await label(p, slot)}) shows its card below the header`, okCard(m), JSON.stringify(m));
    }
    // 2. the scroll is smooth (a sample part way is between the start and the end), not a jump
    await p.evaluate(() => { document.querySelector('.sx-side').scrollTop = 0; }); await p.evaluate(() => document.querySelector('.cw-cell.s-N')?.dispatchEvent(new Event('x')));
    await p.evaluate(() => { window.__samples = []; const t0 = performance.now(); const tick = () => { window.__samples.push(Math.round(document.querySelector('.sx-side')?.scrollTop || 0)); if (performance.now() - t0 < 3500) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.locator('.cw-cell.s-S').first().tap(); await p.waitForTimeout(3000);
    const sm = await p.evaluate(() => window.__samples); const distinct = new Set(sm.filter((v) => v > 0)).size;
    check(`${tag}: the scroll glides (several in-between positions, not one jump)`, distinct >= 4, `${distinct} positions, ${sm.filter((v, i) => v !== sm[i - 1]).join(',')}`);
    // 3. two different dice, screenshots
    for (const [slot, n] of [['N', 'head'], ['C', 'heart']]) {
      await p.evaluate(() => { document.querySelector('.sx-side').scrollTop = 0; }); await pump(0.2);
      await tapDie(p, pump, slot, 1800); const m = await measure(p); check(`${tag}: ${n} card in view for the screenshot`, okCard(m), JSON.stringify(m));
      await p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17').forEach((t) => t.remove())); await p.evaluate(() => window.QD.world.stage.step?.(1));
      await p.screenshot({ path: `${OUT}/${tag}-tap-${n}.png` }); console.log('shot', `${OUT}/${tag}-tap-${n}.png`);
    }
    // 4. already open card, tap another die: card moves and is still in view
    await tapDie(p, pump, 'S'); check(`${tag}: tapping another die while a card is open keeps the new card in view`, okCard(await measure(p)), JSON.stringify(await measure(p)));
    // 5. cp1: Talent Upgrade still scrolls to the face picker
    if (slots.includes('SW')) {
      await p.evaluate(() => { document.querySelector('.sx-side').scrollTop = 0; }); await pump(0.2); await tapDie(p, pump, 'SW');
      const y0 = await p.evaluate(() => document.querySelector('.sx-side').scrollTop); const g0 = await p.evaluate(() => ({ g: window.QD.S.hero.gold, z: window.QD.S.hero.special.SW }));
      await p.locator('#camp-inspector .cb-cov.ready[data-slot="SW"]').first().tap(); await pump(0.3); await p.waitForTimeout(2200); await pump(0.3);
      const t = await p.evaluate(() => { const side = document.querySelector('.sx-side'); const el = document.querySelector('.tw-face-heading'); const q = el?.getBoundingClientRect(); return { top: side.scrollTop, g: window.QD.S.hero.gold, z: window.QD.S.hero.special.SW, vis: !!q && q.bottom <= innerHeight && q.top >= 0 }; });
      check(`${tag}: Talent Upgrade still scrolls down to the face picker (cp1)`, t.z > g0.z && t.g < g0.g && t.top > y0 + 40 && t.vis, JSON.stringify({ y0, g0, t }));
    }
  });
}
// reduced motion: the scroll is instant (the card is in place straight away)
await session(390, 844, 'reduce', async (p, pump) => {
  await p.evaluate(() => { document.querySelector('.sx-side').scrollTop = 0; }); await pump(0.2);
  await p.locator('.cw-cell.s-N').first().tap(); await pump(0.2); await p.waitForTimeout(250);
  const m = await measure(p); check('reduced motion: card already in view 250 ms after the tap (instant scroll)', okCard(m) && m.st > 100, JSON.stringify(m));
  const calm = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches); check('reduced motion is on in this session', calm);
});
check('no page errors', !errs.length, errs.join(' | '));
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
