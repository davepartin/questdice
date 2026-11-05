// T28 camp (Dave, 4 Nov 2026): the Magic page shows only the powers a hero knows; every other power is on the Camp Store's
// Learn-magic shelf, bought like a weapon. Real taps at phone size (headless Chromium, not Safari).
//   node dev/learn-magic-check.mjs [out=shots/learn-magic] [port=8203]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/learn-magic'; const port = +(process.argv[3] || 8203); fs.mkdirSync(OUT, { recursive: true });
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
await p.evaluate(async () => { const Q = window.QD; const h = Q.E.newHero({ name: 'Spellbook', cls: 'knight', seed: 7 }); h.level = 6; h.gold = 200; h.campaign.act = 2; h.dice = null;
  const SV = await import(new URL('js/save.js', document.baseURI)); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass');
  Q.S.hero = h; Q.S.company = { members: [h] }; Q.S.seat = 0; Q.S.campPage = 'magic'; Q.showCamp(); });
await p.locator('[data-camp-page="magic"]').click(); await shot('1-magic-page');
const opts = await p.evaluate(() => document.querySelectorAll('.cp-library .mc-camp-choice').length);
check('Magic page: no unlearned power choices for slot 1 (only the starting power)', opts === 0, `${opts} choices`);
check('Magic page: a way to the Learn-magic shelf', await p.evaluate(() => !!document.querySelector('.cp-more')));
await p.locator('.cp-more').click(); await p.waitForTimeout(800);
check('the Learn-magic link opens the Camp Store', await p.evaluate(() => window.QD.S.campPage === 'camp' && !!document.getElementById('zn-magic')));
const shelf = await p.evaluate(() => [...document.querySelectorAll('#zn-magic .cst-card')].map((c) => c.querySelector('.cst-title')?.textContent));
check('Learn magic lists the knight\'s six other powers (with the side games Showboat and Field Dressing)', shelf.length === 6 && ['Judgment', 'Shield Up', 'Press the Attack', 'Second Wind', 'Showboat', 'Field Dressing'].every((n) => shelf.includes(n)), shelf.join(', '));
const pics = await p.evaluate(() => [...document.querySelectorAll('#zn-magic img')].map((i) => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
await p.evaluate(() => document.getElementById('zn-magic').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(1500);
const pics2 = await p.evaluate(() => [...document.querySelectorAll('#zn-magic img')].map((i) => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
check('every power on the shelf shows its painted art', pics2.length === 6 && pics2.every((i) => i.ok), JSON.stringify(pics2.filter((i) => !i.ok)));
check('no sideways scrolling', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const cover = await p.evaluate(() => [...document.querySelectorAll('#zn-magic .cst-card')].map((c) => { const r = c.getBoundingClientRect(); const x = r.left + r.width / 2, y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2)); const el = document.elementFromPoint(x, y); return { card: c.querySelector('.cst-title')?.textContent, on: r.bottom > 0 && r.top < innerHeight, ok: !el || c.contains(el), hit: el?.className?.toString().slice(0, 60) }; }).filter((x) => x.on));
check('nothing covers the magic cards on screen', cover.every((x) => x.ok), JSON.stringify(cover.filter((x) => !x.ok)));
await shot('2-learn-magic-shelf');
// open Shield Up's card and learn it from the pop-up
await p.evaluate(() => [...document.querySelectorAll('#zn-magic .cst-card')].find((c) => /Shield Up/.test(c.textContent)).querySelector('.cst-face').click());
await p.waitForTimeout(900); await shot('3-shield-up-card');
check('the pop-up shows the power card and a Learn button whose words fit', await p.evaluate(() => !!document.querySelector('.cw-powerpop .mc-card') && /Learn Shield Up/.test(document.querySelector('.cw-powerpop .cw-modal-acts')?.textContent || '') && [...document.querySelectorAll('.cw-powerpop .cw-modal-acts button')].every((b) => { const r = b.getBoundingClientRect(); return b.scrollWidth <= b.clientWidth + 1 && r.left >= 0 && r.right <= innerWidth; }) && [...document.querySelectorAll('.cw-powerpop .cw-modal-acts > *')].every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 && el.scrollWidth <= el.clientWidth + 1; })));
await p.evaluate(() => document.querySelector('.cw-powerpop .cw-modal-acts button.sh-buy, .cw-powerpop .cw-modal-acts button').click()); await p.waitForTimeout(900);
const after = await p.evaluate(() => { const h = window.QD.S.hero; return { gold: h.gold, learned: h.learned, eq: window.QD.E.cardsOf(h).map((c) => c.id), shelf: [...document.querySelectorAll('#zn-magic .cst-title')].map((t) => t.textContent) }; });
check('learning Shield Up costs 50 gold, equips it in slot 2, and takes it off the shelf', after.gold === 150 && after.learned?.includes('shieldwall') && after.eq.includes('shieldwall') && !after.shelf.includes('Shield Up'), JSON.stringify(after));
await p.locator('[data-camp-page="magic"]').click(); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.cp-slots [data-slot="B"]').click()); await p.waitForTimeout(800);
const two = await p.evaluate(() => [...document.querySelectorAll('.cp-library .mc-camp-choice')].map((c) => c.getAttribute('aria-label')));
check('Magic Slot 2 now offers the two learned powers (Shield Up and Counterstrike) to swap', two.length === 2, two.join(' | '));
await shot('4-magic-slot2-swap');
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
