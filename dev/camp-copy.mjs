// Camp copy changes (Crockpot / Grok Bot, 27 Oct 2026; Dave): camp bar "Store" opens the store directly, Heart card level text, Talent card scrolls to the
// symbols with "Gives +N" labels and the max-2 note. 390x844 screens + checks.   CHROME=... node dev/camp-copy.mjs [out=/workspace/camp-copy-cp1] [port=8153]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-copy-cp1'; const port = +(process.argv[3] || 8153); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(120000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'CopyCheck', cls: 'knight', seed: 5 }); hh.gold = 600; hh.campaign.act = 1; hh.campaign.step = 3;
  S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); });
await pump(2);
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', `${OUT}/${n}.png`); };
// 1. camp bar
await p.evaluate(() => { const n = document.querySelector('.cw-nav'); const s = document.querySelector('.sx-side'); if (n && s) s.scrollTop += n.getBoundingClientRect().top - 110; }); await pump(0.4);
const labels = await p.evaluate(() => [...document.querySelectorAll('.cw-nav button')].map((x) => x.textContent.trim()));
check('camp bar reads Dice, Powers, Gear, Store, Hero', labels.join() === 'Dice,Powers,Gear,Store,Hero', labels.join());
await shot('1-camp-bar-store');
// 2. Store opens directly
await p.locator('.cw-nav button[data-camp-page="store"]').click(); await pump(0.6); await p.waitForTimeout(600);
const st = await p.evaluate(() => ({ tab: window.QD.S.tab, notice: /moved|now lives|sold in the Camp Store now|Open the Camp Store/i.test(document.body.textContent), store: !!document.querySelector('.sx-tab.store') }));
check('one tap on Store opens the store, with no "moved" notice', st.tab === 'store' && st.store && !st.notice, JSON.stringify(st));
await p.evaluate(() => { const s = document.querySelector('.sx-side'); if (s) s.scrollTop = 0; window.scrollTo(0, 0); }); await pump(0.3);
await shot('2-store-opened');
// Hero page keeps the pet / shrink / Soul Code things that used to sit under Supplies
await p.evaluate(() => { const { S } = window.QD; S.tab = 'forge'; S.campPage = 'hero'; window.QD.showCamp(); }); await pump(0.4);
check('Hero page keeps "Make a die smaller" and Soul Code', await p.evaluate(() => !!document.querySelector('.cw-shrink') && [...document.querySelectorAll('button')].some((x) => /Soul Code/.test(x.textContent))));
await p.evaluate(() => { const { S } = window.QD; S.tab = 'forge'; S.campPage = 'dice'; window.QD.showCamp(); }); await pump(0.4);
// 3. Heart card
const open = async (slot) => { await p.locator(`.cw-cell.s-${slot}`).click(); await pump(1.2); await p.waitForTimeout(700);
  await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card') || i; const side = i?.closest('.sx-side'); if (c && side) side.scrollTop += c.getBoundingClientRect().top - 60; }); await pump(0.4); await p.waitForTimeout(400); };
await open('C');
const heart = await p.evaluate(() => { const lv = [...document.querySelectorAll('#camp-inspector .cb-lv p')].map((x) => [...x.children].map((c) => c.textContent)); const cov = [...document.querySelectorAll('#camp-inspector .cb-cov .cb-hl-cov')].map((x) => [...x.children].map((c) => c.textContent));
  const c = document.querySelector('#camp-inspector .cb-card'); const r = c?.getBoundingClientRect(); const over = [...document.querySelectorAll('#camp-inspector .cb-lv p, #camp-inspector .cb-hl-cov')].filter((e) => { const q = e.getBoundingClientRect(); const slot = e.closest('.cb-slot')?.getBoundingClientRect(); return slot && (q.bottom > slot.bottom + 1 || q.top < slot.top - 1 || q.right > slot.right + 1); }).length;
  return { lv, cov, fits: !!r && r.left >= 0 && r.right <= innerWidth, over }; });
check('Heart level 1 text is exactly "+2 boost to matching symbols on white strength dice" / "+4 boost to matching weapon dice"', heart.lv[0]?.join('|') === '+2 boost to matching symbols on white strength dice|+4 boost to matching weapon dice', JSON.stringify(heart.lv));
check('Heart levels 2 and 3 use the same wording with +3/+6 and +4/+8', heart.cov.join('|') === '+3 boost to matching symbols on white strength dice,+6 boost to matching weapon dice|+4 boost to matching symbols on white strength dice,+8 boost to matching weapon dice', JSON.stringify(heart.cov));
check('Heart card text stays inside its rows and the card fits the phone', heart.over === 0 && heart.fits, JSON.stringify({ over: heart.over, fits: heart.fits }));
await shot('3-heart-card');
// 4. Talent card: Upgrade (grow) scrolls to the symbols
await p.evaluate(() => document.querySelector('.sx-side').scrollTop = 0); await open('SW');
const y0 = await p.evaluate(() => document.querySelector('.sx-side').scrollTop);
await shot('4a-talent-card-before');
const g0 = await p.evaluate(() => ({ g: window.QD.S.hero.gold, z: window.QD.S.hero.special.SW }));
await p.locator('#camp-inspector .cb-cov.ready[data-slot="SW"]').first().click(); await pump(0.3);
await p.waitForTimeout(250); const mid = await p.evaluate(() => document.querySelector('.sx-side').scrollTop); // smooth: not yet there
await p.waitForTimeout(1600); await pump(0.3);
const t = await p.evaluate(() => { const side = document.querySelector('.sx-side'); const el = document.querySelector('.tw-face-heading'); const q = el.getBoundingClientRect(); const sq = side.getBoundingClientRect(); const stick = parseFloat(side.style.getPropertyValue('--stick')) || 0;
  return { top: side.scrollTop, headTop: Math.round(q.top - sq.top), stick, g: window.QD.S.hero.gold, z: window.QD.S.hero.special.SW, gives: [...document.querySelectorAll('.tw-face small')].map((x) => x.textContent).filter(Boolean), max: document.querySelector('.tw-max')?.textContent, rule: document.querySelector('.tw-rule')?.textContent,
    vis: q.bottom <= innerHeight && q.top >= 0 }; });
check('tapping Upgrade talent grows the die (gold spent) and scrolls down to the symbol area', t.z > g0.z && t.g < g0.g && t.top > y0 + 100 && t.vis, JSON.stringify({ y0, mid, t }));
check('the note "Max 2 of the same power symbol per die. Choose wisely." is shown', t.max === 'Max 2 of the same power symbol per die. Choose wisely.', t.max);
// pick an empty face -> picker shows "Gives +N"
await p.locator('.tw-faces .tw-face.tw-unset').first().click(); await pump(0.3); await p.waitForTimeout(300);
const pv = await p.evaluate(() => document.querySelector('.tw-result b')?.textContent + ' | ' + document.querySelector('.tw-result p')?.textContent);
await p.locator('.tw-symbol').first().click(); await pump(0.3); await p.waitForTimeout(300);
const pv2 = await p.evaluate(() => document.querySelector('.tw-result b')?.textContent);
check('the face preview says "Gives +N <symbol>"', /^Gives \+\d+ /.test(pv2 || ''), `${pv} -> ${pv2}`);
await p.evaluate(() => { const side = document.querySelector('.sx-side'); const el = document.querySelector('.tw-face-heading'); side.scrollTop += el.getBoundingClientRect().top - side.getBoundingClientRect().top - (parseFloat(side.style.getPropertyValue('--stick')) || 0) - 8; }); await pump(0.3); await p.waitForTimeout(300);
await shot('4-talent-card-symbols');
check('no page errors', !errs.length, errs.join(' | '));
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
