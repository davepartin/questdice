// T29 weapon card in the real camp (phone size, real taps; headless Chromium, not Safari): tap the left weapon on the Dice page, see the new
// card, tap the next grow strip, and the weapon grows (gold paid); a later strip says which size comes first. Also the Camp Store shelf.
//   node dev/weapon-grow-check.mjs [out=shots/weapon-grow] [port=8241]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/weapon-grow'; const port = +(process.argv[3] || 8241); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; let bad = 0; const errs = [];
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
await p.evaluate(async () => { const Q = window.QD; const h = Q.E.newHero({ name: 'Grower', cls: 'bard', seed: 7 }); h.level = 6; h.gold = 160; h.campaign.act = 2; h.dice = null;
  const SV = await import(new URL('js/save.js', document.baseURI)); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass');
  Q.S.hero = h; Q.S.company = { members: [h] }; Q.S.seat = 0; Q.S.tab = 'forge'; Q.S.campPage = 'dice'; Q.showCamp(); });
await p.locator('[data-camp-page="dice"]').click(); await p.waitForTimeout(700);
await p.locator('.cw-cell.s-NW').click(); await p.waitForTimeout(1200);
const card = await p.evaluate(() => { const c = document.querySelector('.qc17.t29'); return c ? { name: c.querySelector('.t29-name')?.textContent, pitch: c.querySelector('.t29-pitch')?.textContent, faces: c.querySelectorAll('.t29-faces .t29-f').length, ups: [...c.querySelectorAll('.t29-up')].map((u) => u.dataset.step), font: parseFloat(getComputedStyle(c.querySelector('.t29-pitch')).fontSize) } : null; });
check('the left weapon opens the new card (Bronze Dagger, its few words, four faces, three grow strips)', card && /Bronze Dagger/.test(card.name) && /Steady hits/.test(card.pitch) && card.faces === 4 && card.ups.join() === '6,8,10', JSON.stringify(card));
check('the few words are big type (at least 20 px on the phone)', card && card.font >= 20, card && `${card.font}px`);
await p.screenshot({ path: `${OUT}/1-dagger-card.png` });
await p.locator('.qc17.t29 .t29-up[data-step="8"]').click(); await p.waitForTimeout(500);
check('tapping d8 first says to grow to d6 first, and buys nothing', await p.evaluate(() => /d6 first/.test(document.querySelector('.t29-toast')?.textContent || '') && window.QD.S.hero.gold === 160));
await p.locator('.qc17.t29 .t29-up[data-step="6"]').click(); await p.waitForTimeout(1200);
const after = await p.evaluate(() => { const h = window.QD.S.hero; return { gold: h.gold, size: window.QD.E.weaponSize(h.loadout.NW), faces: document.querySelectorAll('.qc17.t29 .t29-faces .t29-f').length }; });
check('tapping d6 grows the Dagger to d6 for 50 gold, and the card shows six faces', after.gold === 110 && after.size === 6 && after.faces === 6, JSON.stringify(after));
await p.screenshot({ path: `${OUT}/2-dagger-d6.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelectorAll('body > .cw-pop').forEach((e) => e.remove()));
await p.locator('[data-camp-page="camp"]').click(); await p.waitForTimeout(1200);
await p.evaluate(() => document.getElementById('zn-shelf')?.scrollIntoView({ block: 'start', behavior: 'instant' }) || document.querySelector('.zn-shelf')?.scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(900);
check('the Camp Store shelf shows the new cards', await p.evaluate(() => document.querySelectorAll('.cst-wcard .qc17.t29').length > 0));
await p.screenshot({ path: `${OUT}/3-store-shelf.png` });
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
