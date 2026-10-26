// Exercise the real camp inspector, purchase handlers, stored save and battle die at phone sizes.
// CHROME=/path/to/chrome-headless-shell node dev/weapon-upgrades.mjs [screenshots] [port]
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/weapon-upgrades'; const port = +(process.argv[3] || 8163);
fs.mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));
let browser; const results = [];
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  for (const [width, height] of [[375, 548], [390, 844], [430, 932]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); page.setDefaultTimeout(60000); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
    await page.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
    await page.goto(`http://localhost:${port}/?debug&manual&q=low`);
    await page.waitForFunction(() => window.QD?.world?.stage);
    const pump = () => page.evaluate(async () => { for (let i = 0; i < 20; i++) { window.QD.world.stage.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } });
    await page.evaluate(async (width) => {
      const { S, E, showCamp } = window.QD; const h = E.newHero({ name: `Weapon${width}`, cls: 'wizard', seed: 5 });
      h.gold = 350; S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice';
      const SV = await import('./js/save.js'); await SV.createSave(h, 'testpass'); showCamp();
    }, width);
    await pump(); await page.locator('.cw-cell.s-NW').click(); await pump();
    const card = '#camp-inspector .qc17.cb-weapon';
    const read = () => page.evaluate((selector) => {
      const { S, E } = window.QD, inst = S.hero.loadout.NW, c = document.querySelector(selector);
      const rows = [...c.querySelectorAll('.row:not(.locked) .dz')];
      const shown = rows.flatMap((dz) => JSON.parse(dz.dataset.faces).slice(+dz.dataset.from || 0));
      const actual = E.weaponFaces(inst).map((f) => ({ v: f.v, c: f.c === 'b' ? 'b' : 'r' }));
      const r = c.getBoundingClientRect();
      return { gold: S.hero.gold, size: E.weaponSize(inst), rolling: E.sidesOf(S.hero, 'NW'), hand: E.sidesOf(S.hero, 'W'),
        sell: E.sellValue(inst), chip: +c.querySelector('.sl17 .qd-price b').textContent,
        covers: c.querySelectorAll('.cov.tok:not(.gone)').length,
        prices: [...c.querySelectorAll('.cov.tok .qd-price')].map((x) => +x.dataset.price),
        facesMatch: JSON.stringify(shown.map(({ v, c }) => ({ v, c }))) === JSON.stringify(actual),
        fits: r.left >= 0 && r.right <= innerWidth + .5,
        overflow: document.documentElement.scrollWidth > innerWidth,
        spills: [...c.querySelectorAll('.d17')].some((f) => { const d = f.getBoundingClientRect(); const row = f.closest('.row').getBoundingClientRect(); return d.right > row.right + 1 || d.left < row.left - 1; }),
      };
    }, card);
    let r = await read(); assert.deepEqual(r.prices, [50, 100, 200]);
    assert.ok(r.facesMatch && r.fits && !r.spills && !r.overflow);
    await page.locator(`${card} .cov[data-step="8"]`).click(); await pump();
    assert.equal((await read()).gold, 350, 'later cover cannot skip a size');
    // Capture before purchase with a visible price and reachable Done control.
    await page.locator(`${card} .cov[data-step="6"]`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/before-${width}x${height}.png` });
    for (const [size, gold, sell] of [[6, 300, 34], [8, 200, 84], [10, 0, 184]]) {
      await page.locator(`${card} .cov[data-step="${size}"]`).click(); await pump();
      r = await read(); assert.equal(r.size, size); assert.equal(r.gold, gold); assert.equal(r.sell, sell);
      assert.equal(r.chip, r.sell); assert.equal(r.rolling, size); assert.equal(r.hand, 4);
      assert.equal(r.covers, [4, 6, 8, 10].filter((s) => s > size).length);
      assert.ok(r.facesMatch && r.fits && !r.spills && !r.overflow, JSON.stringify(r));
      await page.locator(card).screenshot({ path: `${OUT}/d${size}-${width}x${height}.png` });
    }
    // Opposite weapon must stay d4, and a poor tap must show the reason without purchasing.
    await page.locator('.cw-cell.s-NE').click(); await pump();
    await page.locator(`${card} .cov[data-step="6"]`).click(); await pump();
    assert.equal(await page.evaluate(() => window.QD.E.weaponSize(window.QD.S.hero.loadout.NE)), 4);
    assert.ok(await page.locator(`${card} .qd-price.poor`).count());
    assert.equal(await page.locator(`${card} .qd-price.poor b`).first().evaluate((e) => getComputedStyle(e).color), 'rgb(255, 122, 106)');
    assert.match(await page.locator(`${card} .toast17`).innerText(), /Need 50 more gold/);
    // A reload opens the actual stored save, rather than reusing the in-memory hero.
    await page.reload(); await page.waitForFunction(() => window.QD?.world?.stage);
    const saved = await page.evaluate(async (width) => {
      const SV = await import('./js/save.js'); const h = await SV.openHero(`Weapon${width}`, 'testpass');
      const { E } = window.QD; const b = E.newBattle(h, E.questsFor(h)[0], E.makeRng(2), 1);
      b.script = { rolls: [{ NW: 10 }] }; E.startRoll(b);
      return { gold: h.gold, size: E.weaponSize(h.loadout.NW), sell: E.sellValue(h.loadout.NW), rolled: b.board.NW.v };
    }, width);
    assert.deepEqual(saved, { gold: 0, size: 10, sell: 184, rolled: 10 });
    assert.deepEqual(errors, []); results.push({ width, height, ...saved, passed: true });
    console.log('PASS', `${width}x${height}`, JSON.stringify(saved)); await ctx.close();
  }
  fs.writeFileSync(`${OUT}/checks.json`, JSON.stringify(results, null, 2));
} finally { await browser?.close(); server.kill(); }
