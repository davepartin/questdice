// One magic card per rank (Dave, 6 Nov 2026: "we can just have a place to click upgrade and they will see the new card, and once they see it,
// they can choose to buy it or not"). Real taps at camp, phone size (headless Chromium, not Safari).
//   node dev/rank-cards-check.mjs [out=shots/rank-cards]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/rank-cards'; const port = 8271; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; let bad = 0; const errs = [];
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill()); // a crashed check must not leave its server holding the port
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${n}.png` }); };
await p.evaluate(async () => { const Q = window.QD; const h = Q.E.newHero({ name: 'Ranks', cls: 'wizard', seed: 7 }); h.level = 6; h.gold = 200; h.campaign.act = 2; h.dice = null;
  const SV = await import(new URL('js/save.js', document.baseURI)); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass');
  Q.S.hero = h; Q.S.company = { members: [h] }; Q.S.seat = 0; Q.S.campPage = 'magic'; Q.showCamp(); });
await p.locator('[data-camp-page="magic"]').click(); await shot('1-magic-page');
const card = () => p.evaluate(() => { const c = document.querySelector('.cp-card-stage .mc-card'); return c ? { name: c.querySelector('.mc-plaque')?.textContent, rank: c.querySelector('.mc-rankno')?.textContent, strips: c.querySelectorAll('.mc-lv').length } : null; });
const c1 = await card(); check('the card shows its rank beside its name, and only its own rank (no strips)', c1 && c1.rank === 'I' && c1.strips === 1, JSON.stringify(c1));
const up = p.locator('.cp-upgrade'); check('an Upgrade button under the card says the next rank and its price', (await up.count()) === 1 && /Upgrade to II/.test(await up.textContent()) && /50/.test(await up.textContent()));
await up.click(); await shot('2-next-card');
const prev = await p.evaluate(() => { const m = document.querySelector('.cp-preview'); const c = m?.querySelector('.mc-card'); return m ? { title: m.querySelector('h2')?.textContent, rank: c?.querySelector('.mc-rankno')?.textContent, buy: !!m.querySelector('.sh-buy'), no: !!m.querySelector('.cp-preview-no') } : null; });
check('Upgrade shows the next card (rank II), with Buy and Not now', prev && prev.rank === 'II' && prev.buy && prev.no, JSON.stringify(prev));
await p.locator('.cp-preview-no').click(); await p.waitForTimeout(500);
check('Not now closes it and buys nothing', await p.evaluate(() => !document.querySelector('.cp-preview') && window.QD.S.hero.gold === 200 && !window.QD.S.hero.powerLevel?.arcbolt));
await p.locator('.cp-upgrade').click(); await p.waitForTimeout(700); await p.locator('.cp-preview .sh-buy').click(); await shot('3-bought');
const after = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, rank: window.QD.S.hero.powerLevel?.arcbolt, card: document.querySelector('.cp-card-stage .mc-rankno')?.textContent, next: document.querySelector('.cp-upgrade')?.textContent }));
check('Buy pays 50 gold, the card becomes rank II, and the button offers III', after.gold === 150 && after.rank === 1 && after.card === 'II' && /Upgrade to III/.test(after.next || ''), JSON.stringify(after));
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(bad ? `${bad} FAILED` : 'all passed'); await br.close(); process.exit(bad ? 1 : 0);
