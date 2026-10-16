// The daily challenge through the real screens: the title's Daily plaque, the briefing, a fight won, the breath between fights,
// then a loss and the score page.  node dev/daily.mjs [port]   (shots: docs/ingame/daily_*.png)
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); await p.emulateMedia({ reducedMotion: 'reduce' });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showTitle()); await pump(2);
await p.screenshot({ path: 'docs/ingame/daily_0title.png' });
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((x) => /daily/i.test(x.innerText))?.click()); await pump(2); await p.waitForTimeout(800);
await p.screenshot({ path: 'docs/ingame/daily_1intro.png' });
console.log('intro:', await p.evaluate(() => document.querySelector('.sx-board-head')?.innerText.replace(/\s+/g, ' ')));
await p.evaluate(() => [...document.querySelectorAll('.sx-cta .sx-btn')].find((x) => /begin/i.test(x.innerText))?.click());
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
console.log('battle:', await p.evaluate(() => `${window.QD.S.hero.name} vs ${window.QD.S.battle.enemies.map((e) => e.name).join(', ')}; daily ${!!window.QD.S.daily}`));
await p.evaluate(() => { const { S, B3 } = window.QD; S.battle.enemies.forEach((e) => { e.hp = 0; }); S.battle.points = 180; S.battle.outcome = 'victory'; S.battle.phase = 'done'; B3.battleState && (B3.battleState.busy = false); });
await p.evaluate(() => { window.QD.B3.stop(); window.QD.dailyAfter(true); });
await pump(2); await p.screenshot({ path: 'docs/ingame/daily_2between.png' });
console.log('between:', await p.evaluate(() => document.querySelector('.sx-board-head')?.innerText.replace(/\s+/g, ' ')));
// the next fight: lose it, and see the score page
await p.evaluate(() => [...document.querySelectorAll('.sx-cta .sx-btn')].find((x) => /fight/i.test(x.innerText))?.click());
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await p.evaluate(() => { const { S, B3 } = window.QD; S.battle.points = 60; S.battle.hp = 0; S.battle.outcome = 'defeat'; B3.stop(); window.QD.dailyAfter(false); });
await pump(2); await p.waitForTimeout(1500); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/daily_3result.png' });
console.log('result:', await p.evaluate(() => document.querySelector('.sx-board-head')?.innerText.replace(/\s+/g, ' ')), '| board:', await p.evaluate(() => document.querySelector('.dl-board')?.innerText.replace(/\s+/g, ' ')));
console.log('saved heroes untouched:', await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => /hero/i.test(k)))), 'daily record:', await p.evaluate(() => localStorage.getItem('qd.daily')));
await p.evaluate(() => document.querySelector('.sx-top-actions .sx-btn')?.click()); await pump(2);
await p.screenshot({ path: 'docs/ingame/daily_4title.png' });
console.log('title plaque:', await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((x) => /daily/i.test(x.innerText))?.innerText.replace(/\s+/g, ' ')));
await b.close();
