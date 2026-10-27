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
  const sizes = process.env.TYPE_SIZES ? JSON.parse(process.env.TYPE_SIZES) : baseline ? [[390, 844, 16]] : [[375, 548, 16], [390, 844, 16], [430, 932, 16], [390, 844, 20]];
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
    await page.evaluate(() => window.typeFixture.UI.reveal({ voice: 'Madame Twill', lines: [
      { name: 'Dave', gold: 40, line: 'Dave kept the promise: no healing potions this battle. The team won, and Madame Twill pays 40 gold.' },
      { name: 'Friend', gold: -20, line: 'Friend took the bribe but missed the objective. Madame Twill opens the envelope and collects 20 gold.' },
    ] }, { hero: window.typeFixture.hero, won: true, onDone() {} }));
    await capture('objective-reveal');
    if (!baseline) assert.ok(await page.evaluate(() => {
      const cta = document.querySelector('.sx-revealbeat .sx-cta').getBoundingClientRect();
      return [...document.querySelectorAll('.rv-row p')].every((e) => e.getBoundingClientRect().bottom <= cta.top);
    }), 'Continue must not cover objective results');
    await page.evaluate(() => {
      const { UI, SO } = window.typeFixture;
      UI.envelope(SO.cardView({ act: 2, cards: { Dave: { id: 'fall', mode: 'offer' } }, answered: {}, voice: 'Madame Twill', scene: 'Madame Twill hands you a sealed envelope.', cover: '' }, 'Dave'), { onAnswer() {} });
    });
    await capture('secret-objective');
    await page.evaluate(async () => { const { UI, hero, friend } = window.typeFixture; const { beat } = await import('./js/story.js'); UI.story(beat('open:1', 1, [hero, friend], hero.campaign), () => {}); });
    await capture('story');
    await page.evaluate(async () => {
      const { hero, friend } = window.typeFixture; const { bragBoard } = await import('./js/g3/brag.js');
      bragBoard({ table: { company: { members: [hero, friend] }, rewards: { order: ['Dave', 'Friend'], points: { Dave: 71, Friend: 62 }, place: { Dave: 1, Friend: 2 }, levels: { Dave: 4, Friend: 1 }, gold: { Dave: 40, Friend: 20 }, questName: 'Crumb at the Ford', stats: { Dave: { dealt: 46, healed: 8, blocked: 12 }, Friend: { dealt: 35, blocked: 29, healed: 4 } } } }, youName: 'Dave', onOnward() {} });
    });
    await capture('battle-summary');
    await page.evaluate(async () => {
      (await import('./js/g3/brag.js')).closeBrag(); const { S, E } = window.QD;
      S.rewards = { shown: true, lvBefore: 4, xp: 18, gold: 38, points: 71, drops: [E.makeWeapon('dagger', 1, () => .5, 4)], quest: E.questsFor(S.hero)[0], offer: null, charms: [], broken: [] };
      window.typeFixture.UI.victory(false);
    });
    await capture('rewards');
    await page.evaluate(() => { const { S, showCamp } = window.QD; S.tab = 'forge'; S.campPage = 'dice'; showCamp(); });
    await page.locator('.cw-cell.s-NW').click(); await capture('weapon');
    await page.evaluate(() => { const { S, showCamp } = window.QD; S.tab = 'store'; showCamp(); }); await capture('store');
    assert.deepEqual(errors, []); assert.deepEqual(externalFonts, []);
    await context.close();
  }
  fs.writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 2));
} finally { await browser?.close(); server.kill(); }
