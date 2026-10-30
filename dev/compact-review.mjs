// Render the real UI with presentation-only fixtures. No campaign simulation or user saves.
// CHROME=/path/to/chrome-headless-shell node dev/typography.mjs [out] [port] [baseline-css]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.argv[2] || 'shots/typography'; const port = +(process.argv[3] || 8181);
const baseline = process.argv[4] && fs.readFileSync(process.argv[4], 'utf8');
const faces = fs.readFileSync('css/fonts.css', 'utf8').split('/* Quest Dice typography:')[0];
fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));
let browser; const report = [];
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const sizes = process.env.TYPE_SIZES ? JSON.parse(process.env.TYPE_SIZES) : baseline ? [[390, 844, 16]] : [[375, 548, 16], [390, 664, 16], [430, 760, 16]];
  for (const [width, height, rootSize] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(60000); const errors = [], externalFonts = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) externalFonts.push(r.url()); });
    await page.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
    if (baseline) await page.route(/\/css\/fonts\.css/, (r) => r.fulfill({ contentType: 'text/css', body: faces + '\n' + baseline }));
    await page.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
    await page.goto(`http://localhost:${port}/?debug&manual&q=low`); await page.waitForFunction(() => window.QD?.world?.stage);
    await page.evaluate(async (rootSize) => {
      document.documentElement.style.fontSize = `${rootSize}px`;
      const { S, E, showCamp } = window.QD;
      const hero = E.newHero({ name: 'Dave', cls: 'wizard', seed: 5, pack: 'rivalduo' });
      const friend = E.newHero({ name: 'Friend', cls: 'dwarf', seed: 6, pack: 'rivalduo' });
      hero.level = 4; hero.gold = 225;
      S.hero = hero; S.company = { members: [hero, friend] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; showCamp();
      window.typeFixture = { hero, friend, UI: await import('./js/g3/scrui.js'), SO: await import('./js/secrets.js') };
      await document.fonts.ready;
    }, rootSize);
    const tag = `${width}x${height}-${rootSize}`;
    async function capture(name) {
      await page.evaluate(async () => { await document.fonts.ready; for (let i = 0; i < 12; i++) { window.QD.world.stage.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } });
      await page.waitForTimeout(150);
      const audit = await page.evaluate(() => {
        const families = {}, styles = [];
        for (const e of document.querySelectorAll('body *')) {
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const b = e.getBoundingClientRect(), c = getComputedStyle(e);
          if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight || c.visibility === 'hidden' || c.display === 'none') continue;
          const first = c.fontFamily.split(',')[0].trim().replaceAll('"', '').replaceAll("'", '');
          (families[first] ||= []).push(e.textContent.trim().slice(0, 35));
          styles.push({ selector: e.className?.baseVal ?? e.className, family: first, weight: c.fontWeight, size: c.fontSize, italic: c.fontStyle });
        }
        const inCard = document.querySelector('.qo .in'); const cardRect = inCard?.getBoundingClientRect();
        const escapedCardText = cardRect ? [...inCard.querySelectorAll('.goal,.ttl,.terms,.chip')].some((e) => { const r = e.getBoundingClientRect(); return r.bottom > cardRect.bottom + 2 || r.left < cardRect.left - 2 || r.right > cardRect.right + 2; }) : false;
        return { families, styles, escapedCardText, overflow: document.documentElement.scrollWidth > innerWidth,
          loaded: Object.fromEntries(['Inter', 'Cormorant Garamond', 'Oxanium'].map((family) => [family, [...document.fonts].some((f) => f.family.replaceAll('"', '') === family && f.status === 'loaded')])) };
      });
      assert.equal(audit.overflow, false, `${name} horizontal overflow at ${tag}`);
      assert.equal(audit.escapedCardText, false, `${name} card text escapes at ${tag}`);
      if (!baseline) {
        assert.deepEqual(Object.keys(audit.families).filter((f) => !['Inter', 'Cormorant Garamond', 'Oxanium', 'Archivo Black'].includes(f)), [], `${name} unexpected family: ${JSON.stringify(audit.families)}`);
        for (const family of Object.keys(audit.families).filter((f) => f !== 'Archivo Black')) assert.ok(audit.loaded[family], `${name}: ${family} must really load`);
      }
      await page.screenshot({ path: `${out}/${name}-${tag}.png` });
      report.push({ name, tag, ...audit }); console.log('PASS', name, tag, Object.keys(audit.families).join(', '));
    }
    await page.evaluate(() => { const { S, E } = window.QD; S.hero.campaign.act = 1; S.hero.campaign.step = 0; const q = {...E.questsFor(S.hero)[0], enemies: ['bonfire', 'goblin'], kind: 'battle'}; window.QD.startQuest(q); });
    for (let i=0;i<300;i++) {
      if (await page.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break;
      await page.evaluate(() => { [...document.querySelectorAll('button')].find(e => /^(Decline|Continue)$/.test(e.textContent.trim()))?.click(); window.QD.world.stage.simulate(1/15,1/30); });
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => { for (const e of window.QD.S.battle.enemies) { e.intent = e.faces?.find(f=>f.v==='pierce') || e.intent; } window.QD.B3.renderReset(); });
    for (let foe=0;foe<2;foe++) {
      await page.locator('.fb-info').nth(foe).click();
      await page.waitForSelector('.b3-info.open .fi-head');
      await page.evaluate(() => document.fonts.ready);
      const fit = await page.locator('.b3-info').evaluate(e => ({height:e.clientHeight,scroll:e.scrollHeight}));
      assert.ok(fit.scroll <= fit.height+1, `Enemy ${foe} must fit: ${JSON.stringify(fit)}`);
      await page.screenshot({path:`${out}/enemy-${foe}-${tag}.png`});
      await page.locator('.fi-head .qd-close').click();
      assert.equal(await page.locator('.b3-info.open').count(),0);
      console.log('PASS enemy',foe,tag,JSON.stringify(fit));
    }
    await page.evaluate(() => { window.QD.B3.stop(); window.typeFixture.UI.reveal({bonus:true, voice:'Mother Hob', lines:[{name:'DaveKnight2',kind:'bonus',objective:'Deal 50 damage this fight.',objectiveName:'Heavy Hitter',accepted:true,met:false,gold:0,line:'DaveKnight2 took the Objective: Deal 50 damage this fight. Not this time.'}]},{hero:window.typeFixture.hero,won:true,onDone(){}}); });
    await page.waitForTimeout(2800); await capture('objective-single');
    assert.deepEqual(errors, []); assert.deepEqual(externalFonts, []);
    await context.close();
  }
  fs.writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 2));
} finally { await browser?.close(); server.kill(); }
