// A gallery of the main screens at phone size, for a visual polish review (everything except the camp cards and the Magical Powers sheet, which have their own owners).
//   node dev/visual-audit.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/audit'; const port = +(process.argv[3] || 8165); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* ignore */ } });
  await p.goto(`http://localhost:${port}/?debug`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 }); await sleep(1500);
  const shot = async (name, wait = 1400) => { await sleep(wait); await p.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
  const run = async (name, fn, wait) => { try { await fn(); await shot(name, wait); } catch (e) { console.log('SKIP', name, e.message.split('\n')[0]); } };
  const click = (re, sc = 'body') => p.evaluate(([src, s]) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll(`${s} button, ${s} [role=button], ${s} a`)].find((x) => x.offsetParent && !x.disabled && r.test(x.textContent)); if (!b) return false; b.click(); return true; }, [re.source, sc]);
  const closeModal = () => p.evaluate(() => { document.querySelector('#modal .qd-close')?.click(); const m = document.querySelector('#modal'); if (m?.classList.contains('open')) window.QD.D && 0; });
  await run('01-title', () => p.evaluate(() => window.QD.showTitle()));
  await run('02-stories', () => p.evaluate(() => window.QD.showStories()));
  await run('03-create', () => p.evaluate(() => window.QD.showCreate()));
  // a hero for the in-game screens
  await p.evaluate(() => { const { S, E } = window.QD; const hero = E.newHero({ name: 'Maelis', cls: 'wizard', seed: 7 }); hero.gold = 85; hero.level = 3; S.hero = hero; S.company = { members: [hero] }; S.seat = 0; });
  await run('04-board', () => p.evaluate(() => window.QD.showBoard()));
  await run('05-road', () => p.evaluate(() => window.QD.showRoad()));
  await run('06-camp-dice', () => p.evaluate(() => { window.QD.S.tab = 'forge'; window.QD.S.campPage = 'dice'; window.QD.showCamp(); }));
  await run('07-camp-gear', () => p.evaluate(() => { window.QD.S.campPage = 'gear'; window.QD.showCamp(); }));
  await run('08-camp-supplies', () => p.evaluate(() => { window.QD.S.campPage = 'supplies'; window.QD.showCamp(); }));
  await run('09-camp-hero', () => p.evaluate(() => { window.QD.S.campPage = 'hero'; window.QD.showCamp(); }));
  await run('10-battle', async () => { await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0])); await p.waitForFunction(() => document.querySelector('#b3-roll'), null, { timeout: 60000 }); }, 2500);
  await run('11-battle-rolled', async () => { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await sleep(2500); }, 1500);
  await run('12-victory', async () => { await p.evaluate(() => { const { S } = window.QD; S.battle.outcome = 'victory'; S.battle.hp = Math.max(1, S.battle.hp); for (const e of S.battle.enemies) e.hp = 0; window.QD.showVictory(); }); }, 2500);
  await run('13-defeat', () => p.evaluate(() => window.QD.defeat(false)), 2000);
  await run('14-hero-hub', () => p.evaluate(() => window.QD.showHeroHub()));
  await run('15-daily-intro', async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(600); await click(/daily challenge|^\s*daily/); });
  await run('16-together', async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(600); await p.evaluate(() => window.QD.online.together()); });
  await run('17-join', () => p.evaluate(() => window.QD.online.join('')));
  await run('18-learn', async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(600); await click(/learn to play/); }, 3500);
  for (const [name, re] of [['19-menu', /^$/], ['20-rules', /^Rules$/], ['21-reports', /^Battle reports$/], ['22-graphics', /^Graphics/], ['23-download', /^Download game/]]) {
    await run(name, async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(500); await p.evaluate(() => document.querySelector('#gmenu').click()); await sleep(400); if (name !== '19-menu') await click(re, '#modal'); });
  }
  await run('24-soul-code', async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(600); await click(/bring a hero here/); });
  await run('25-cloud', async () => { await p.evaluate(() => window.QD.showTitle()); await sleep(600); await click(/open a cloud save/); });
} finally { await browser?.close(); server.kill(); }
