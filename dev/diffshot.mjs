// The difficulty cards on the new-hero screen.   node dev/diffshot.mjs  -> docs/ingame/difficulty_cards.png
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.learned', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
await p.evaluate(() => window.QD.showCreate()); await p.waitForTimeout(1500);
await p.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => /^DIFFICULTY$/i.test(e.textContent.trim())); el?.scrollIntoView({ block: 'start' }); });
await p.waitForTimeout(500); await p.evaluate(() => window.QD.world.stage.step(1));
await p.screenshot({ path: 'docs/ingame/difficulty_cards.png' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.df-opt, [class*=diff] button')].map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | ')));
await b.close();
