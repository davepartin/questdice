// Open a table as a brand-new hero, the way a phone does it: Play together -> Open a table -> name, password -> Open the table.
// Runs its own table server (server.mjs), so no cloud is needed.  node dev/hostflow.mjs
import { chromium } from 'playwright-core';
import { start } from '../server.mjs';
const server = await start(0); const port = server.address().port;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => window.QD.online.together()); await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Open a table/.test(e.textContent))?.click()); await p.waitForTimeout(500);
// first a tap with no name (Dave's leftover message), then the real thing
await p.evaluate(() => document.querySelector('.sx-cta .sx-btn')?.click()); await p.waitForTimeout(200);
console.log('empty name says:', await p.evaluate(() => document.querySelector('.form-msg')?.textContent));
await p.fill('#table-name', 'Dad and Mel 1'); await p.fill('#hero-name', 'Dp1'); await p.fill('#hero-pw', 'abc');
await p.evaluate(() => document.querySelector('.sx-cta .sx-btn')?.click());
for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!window.QD.S.net?.code)) break; await p.waitForTimeout(250); }
console.log('seated at table:', await p.evaluate(() => window.QD.S.net?.code || null), '| message:', await p.evaluate(() => document.querySelector('.form-msg')?.textContent || ''), '| screen:', await p.evaluate(() => document.querySelector('#app')?.className));
await p.waitForTimeout(800); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/host_lobby.png' });
// a second phone joins with the code, as a new hero
const code = await p.evaluate(() => window.QD.S.net?.code);
const q = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, hasTouch: true });
q.on('pageerror', (e) => console.log('ERR2', e.message));
await q.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await q.goto(`http://localhost:${port}/?debug&manual&q=low`); await q.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await q.evaluate(() => window.QD.online.join(''));  await q.waitForTimeout(500);
await q.fill('#table-code', code); await q.fill('#hero-name', 'Mel'); await q.fill('#hero-pw', 'xyz');
await q.evaluate(() => document.querySelector('.sx-cta .sx-btn')?.click());
for (let i = 0; i < 40; i++) { if (await q.evaluate(() => !!window.QD.S.net?.code)) break; await q.waitForTimeout(250); }
console.log('second phone seated at:', await q.evaluate(() => window.QD.S.net?.code || null), '| message:', await q.evaluate(() => document.querySelector('.form-msg')?.textContent || ''));
await p.waitForTimeout(2500);
console.log('host sees heroes:', await p.evaluate(() => [...document.querySelectorAll('.sx-screen b, .lb-name, .seat b')].map((e) => e.textContent).filter((t) => /Dp1|Mel/.test(t)).join(', ')));
// step away and come back: the menus say which table this phone still sits at
await p.evaluate(() => window.QD.online.stepAway()); await p.waitForTimeout(600);
console.log('title offers:', await p.evaluate(() => [...document.querySelectorAll('.sx-plaque b, .sx-plaque .pl-title, .sx-plaque')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter((x) => /Rejoin/.test(x)).slice(0, 1).join('')));
await p.evaluate(() => window.QD.online.together()); await p.waitForTimeout(500);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/rejoin_menu.png' });
await b.close(); server.close();
