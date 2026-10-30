// T17 candidate: buy sizes through the real camp cover flow in the weapon-roles preview and check the card against the combat die.
//   CHROME=/path/to/chrome node dev/weapon-roles-check.mjs [screenshot dir] [port]
// Builds preview/weapon-roles/ from this checkout first (node tools/preview.mjs . weapon-roles) and serves the repo. Fails (exit 1) on any assertion or page error.
// Per phone size (375x548, 390x844, 430x932) and per weapon (Silver Spear, Gold Axe, Gold Arrows with frost heads, a Silver Mace outside the roster):
//   the covers are the real next-size prices, a later cover buys nothing, gold / purse / sale chip move with each purchase, every face on the card
//   (number, colour, effect kind and count, arrowhead) equals js/weaponladder.js AND the engine's die, a reload of the stored save rolls the new size,
//   the item-specific sentence is right (served: "Every face you have stays..."; the Mace: the old wording), no page errors, nothing spills the width.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { facesOf, METALS } from '../js/weaponladder.js';

const OUT = process.argv[2] || 'shots/weapon-roles'; const port = +(process.argv[3] || 8164);
fs.mkdirSync(OUT, { recursive: true });
execFileSync(process.execPath, ['tools/preview.mjs', '.', 'weapon-roles'], { stdio: 'inherit' });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));
const CASES = [ // [id, metal index, ammo, served by the table?]
  ['spear', 1, null, true], ['axe', 2, null, true], ['quiver', 2, 'frost', true], ['mace', 1, null, false]];
const icons = (f) => [...Array(f.plus || 0).fill(f.c === 'b' ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(4, n | 0)).fill(k === 'loot' ? 'gold' : k)), ...(f.arrow ? [`arrow_${f.arrow}`] : [])];
const shape = (f) => JSON.stringify({ v: f.v, c: f.c === 'b' ? 'b' : 'r', icons: icons(f).sort() });
const results = []; let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  for (const [width, height] of [[375, 548], [390, 844], [430, 932]]) for (const [id, metal, ammo, served] of CASES) {
    const tag = `${id}-${width}x${height}`;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); page.setDefaultTimeout(60000); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
    await page.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
    await page.goto(`http://localhost:${port}/preview/weapon-roles/?debug&manual&q=low`);
    await page.waitForFunction(() => window.QD?.world?.stage);
    assert.ok(await page.evaluate(() => /weapon roles/i.test(document.querySelector('.lab-tag')?.textContent || '')), 'the preview tag shows');
    const pump = () => page.evaluate(async () => { for (let i = 0; i < 20; i++) { window.QD.world.stage.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } });
    const name = `Roles${id}${width}`;
    await page.evaluate(async ({ id, metal, ammo, name }) => {
      const { S, E, showCamp } = window.QD; const h = E.newHero({ name, cls: 'wizard', seed: 5 }); h.gold = 400;
      const w = E.makeWeapon(id, metal, E.makeRng(2), 4); if (ammo) w.ammo = ammo; h.bag = [w]; E.equip(h, w.uid, 'NW');
      S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice';
      const SV = await import('./js/save.js'); await SV.createSave(h, 'testpass'); showCamp();
    }, { id, metal, ammo, name });
    await pump(); await page.locator('.cw-cell.s-NW').click(); await pump();
    const card = '#camp-inspector .qc17.cb-weapon';
    const read = () => page.evaluate((selector) => {
      const { S, E } = window.QD, inst = S.hero.loadout.NW, c = document.querySelector(selector);
      const rows = [...c.querySelectorAll('.row:not(.locked) .dz')];
      const shown = rows.flatMap((dz) => JSON.parse(dz.dataset.faces).slice(+dz.dataset.from || 0));
      const r = c.getBoundingClientRect();
      return { gold: S.hero.gold, size: E.weaponSize(inst), rolling: E.sidesOf(S.hero, 'NW'), sell: E.sellValue(inst), chip: +c.querySelector('.sl17 .qd-price b').textContent,
        purse: S.hero.gold, covers: c.querySelectorAll('.cov.tok:not(.gone)').length, prices: [...c.querySelectorAll('.cov.tok .qd-price')].map((x) => +x.dataset.price),
        shown, actual: E.weaponFaces(inst), served: E.servedByLadder(inst), note: document.querySelector('.cw-balance')?.textContent || '',
        fits: r.left >= 0 && r.right <= innerWidth + .5, overflow: document.documentElement.scrollWidth > innerWidth,
        spills: [...c.querySelectorAll('.d17')].some((f) => { const d = f.getBoundingClientRect(); const row = f.closest('.row').getBoundingClientRect(); return d.right > row.right + 1 || d.left < row.left - 1; }) };
    }, card);
    const check = (r, label) => {
      assert.ok(r.fits && !r.overflow && !r.spills, `${label}: fits ${JSON.stringify({ fits: r.fits, overflow: r.overflow, spills: r.spills })}`);
      assert.equal(r.chip, r.sell, `${label}: sale chip is the engine's sale value`);
      assert.deepEqual(r.shown.map((f) => JSON.stringify({ v: f.v, c: f.c === 'b' ? 'b' : 'r', icons: [...f.icons].sort() })),
        r.actual.map(shape), `${label}: the card shows exactly the die that rolls (number, colour, effect kind and count, arrowhead)`);
      if (served) assert.deepEqual(r.actual.map(shape), facesOf(id, METALS[metal], r.size, ammo).map(shape), `${label}: and that die is the candidate table`);
      assert.equal(r.served, served, `${label}: served by the table`);
      if (r.note) assert.equal(r.note, served ? 'Every face you have stays. The new size adds two.' : 'Face numbers and symbols can change at each size.', `${label}: item-specific sentence`);
    };
    let r = await read(); assert.deepEqual(r.prices, [50, 100, 200], `${tag}: next covers cost 50, 100, 200`); check(r, `${tag} d4`);
    assert.ok(r.note, `${tag}: the sentence is on the sheet`);
    await page.locator(`${card} .cov[data-step="8"]`).click(); await pump();
    assert.equal((await read()).gold, 400, `${tag}: a later cover cannot skip a size`);
    await page.screenshot({ path: `${OUT}/${tag}-before.png` });
    let gold = 400; let sell = r.sell; const bought = [];
    for (const [size, price] of [[6, 50], [8, 100], [10, 200]]) {
      await page.locator(`${card} .cov[data-step="${size}"]`).click(); await pump();
      r = await read(); gold -= price; bought.push(size);
      assert.equal(r.size, size, `${tag}: bought d${size}`); assert.equal(r.gold, gold, `${tag}: gold after d${size}`); assert.equal(r.rolling, size, `${tag}: rolls d${size}`);
      assert.ok(r.sell > sell, `${tag}: the sale value rose with the purchase`); sell = r.sell;
      assert.equal(r.covers, [4, 6, 8, 10].filter((s) => s > size).length, `${tag}: covers left`);
      check(r, `${tag} d${size}`);
      if (served) { // the earlier faces are still the first faces of the bigger die
        const small = facesOf(id, METALS[metal], size, ammo).map(shape); const first = facesOf(id, METALS[metal], 10, ammo).map(shape).slice(0, size);
        assert.deepEqual(small, first, `${tag}: d${size} is the first ${size} faces of the d10`);
      }
      await page.locator(card).screenshot({ path: `${OUT}/${tag}-d${size}.png` });
    }
    // the stored save: a reload opens the real save, not the in-memory hero, and rolls the new size
    await page.reload(); await page.waitForFunction(() => window.QD?.world?.stage);
    const saved = await page.evaluate(async (name) => {
      const SV = await import('./js/save.js'); const h = await SV.openHero(name, 'testpass'); const { E } = window.QD;
      const b = E.newBattle(h, E.questsFor(h)[0], E.makeRng(2), 1); b.script = { rolls: [{ NW: 10 }] }; E.startRoll(b);
      return { gold: h.gold, size: E.weaponSize(h.loadout.NW), sell: E.sellValue(h.loadout.NW), rolled: b.board.NW.v, faces: E.weaponFaces(h.loadout.NW).length };
    }, name);
    assert.deepEqual({ gold: saved.gold, size: saved.size, rolled: saved.rolled, faces: saved.faces }, { gold: 50, size: 10, rolled: 10, faces: 10 }, `${tag}: stored save`);
    assert.deepEqual(errors, [], `${tag}: page errors`);
    results.push({ tag, width, height, case: id, served, ...saved, passed: true }); console.log('PASS', tag, JSON.stringify(saved)); await ctx.close();
  }
  fs.writeFileSync(`${OUT}/checks.json`, JSON.stringify(results, null, 2));
  console.log(`all ${results.length} runs passed`);
} catch (e) { console.error('FAIL', e.message); process.exitCode = 1; } finally { await browser?.close(); server.kill(); }
