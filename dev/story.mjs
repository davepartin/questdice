// The story thread: the prologue, a road event in the new story card, the boss beat, the story so far, and the monster
// sheet with its front picture.  node dev/story.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (name) => { await pump(1.5); await p.waitForTimeout(300); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${name}.png` }); };
const scrollTo = (sel) => p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return; const box = el.closest('.sx-side') || document.scrollingElement; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -40); }, sel);
await p.evaluate(async () => { const { E, adopt, showRoadOrBoard } = window.QD; const SV = await import('/js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); await SV.createSave(h, 'pass123'); adopt(h, 'hero'); showRoadOrBoard(); });
await scrollTo('.sx-tale'); await shot('story_prologue');
console.log('screen 1:', await p.evaluate(() => document.querySelector('.sx-tale')?.innerText.slice(0, 80).replace(/\n+/g, ' | ')));
await p.evaluate(() => [...document.querySelectorAll('.sx-cta button')].find((x) => /Continue/i.test(x.textContent))?.click()); await pump(1.5);
await scrollTo('.sx-tale'); await shot('story_roadcard');
console.log('screen 2:', await p.evaluate(() => document.querySelector('.sx-tale')?.innerText.slice(0, 80).replace(/\n+/g, ' | ')));
// jump to quest 10 for the boss beat
await p.evaluate(() => { const h = window.QD.S.hero; h.campaign.step = 10; h.campaign.wins = 9; h.campaign.road = null; window.QD.showRoadOrBoard(); }); await pump(1.5);
await scrollTo('.sx-tale'); await shot('story_boss');
console.log('screen 3:', await p.evaluate(() => document.querySelector('.sx-tale')?.innerText.slice(0, 80).replace(/\n+/g, ' | ')));
await p.evaluate(() => [...document.querySelectorAll('.sx-cta button')].find((x) => /Continue/i.test(x.textContent))?.click()); await pump(1.5);
console.log('then:', await p.evaluate(() => document.querySelector('.sx-board') ? 'quest board' : document.querySelector('.sx-tale')?.innerText.slice(0, 40)));
// the story so far
await p.evaluate(() => { const m = [...document.querySelectorAll('button')].find((x) => /^Menu$/i.test(x.textContent.trim())); m?.click(); }); await pump(0.5);
await p.evaluate(() => [...document.querySelectorAll('.modal-card button')].find((x) => /story so far/i.test(x.textContent))?.click()); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/story_sofar.png' });
console.log('story so far:', await p.evaluate(() => [...document.querySelectorAll('.ssf-beat h3')].map((x) => x.textContent).join(' / ')));
await p.evaluate(() => [...document.querySelectorAll('.modal-card button')].find((x) => /Close/.test(x.textContent))?.click()); await pump(0.3);
// the monster sheet with its picture
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['cultist', 'wolf'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(4); await p.waitForTimeout(1500);
await p.evaluate(() => { document.querySelectorAll('.b3-plate')[0]?.click(); }); await pump(0.5);
if (!(await p.evaluate(() => document.querySelector('.b3-info.open')))) { await p.evaluate(() => document.querySelectorAll('.b3-plate')[0]?.click()); await pump(0.5); }
for (let i = 0; i < 20 && await p.evaluate(() => !!document.querySelector('.fi-pic.shimmer')); i++) { await pump(0.5); await p.waitForTimeout(500); }
await p.screenshot({ path: 'docs/ingame/monster_sheet_pic.png', clip: { x: 0, y: 180, width: 430, height: 340 } });
for (const k of [1]) { await p.evaluate(() => { document.querySelector('.sh-x')?.click(); }); await pump(0.3); await p.evaluate((k) => { document.querySelectorAll('.b3-plate')[k]?.click(); }, k); await pump(0.4); await p.evaluate((k) => { document.querySelectorAll('.b3-plate')[k]?.click(); }, k); await pump(0.5);
  for (let i = 0; i < 20 && await p.evaluate(() => !!document.querySelector('.fi-pic.shimmer')); i++) { await pump(0.5); await p.waitForTimeout(500); }
  await p.screenshot({ path: `docs/ingame/monster_sheet_pic${k}.png`, clip: { x: 0, y: 180, width: 430, height: 340 } }); }
console.log('pic ready:', await p.evaluate(() => { const i = document.querySelector('.fi-pic img'); return !!i && i.naturalWidth > 0; }));
console.log('errors:', errs.length ? errs : 'none');
await b.close();
