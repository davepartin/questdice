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
const card = await p.evaluate(() => { const c = document.querySelector('.qc17.t30'); if (!c) return null; const nm = c.querySelector('.t30-name'); return { metal: c.querySelector('.t30-metal')?.textContent, name: nm?.textContent, faces: c.querySelectorAll('.t30-q.live .t29-f').length, real: c.querySelectorAll('.t30-q.live img.t29-real').length, ups: [...c.querySelectorAll('.t30-up')].map((u) => u.dataset.step), font: parseFloat(getComputedStyle(nm).fontSize), tap: Math.min(...[...c.querySelectorAll('.t30-up')].map((u) => u.getBoundingClientRect().height)) }; });
check('the left weapon opens the new card (BRONZE on the sash, Dagger, four real dice in the d4 corner, three covered corners)', card && /Bronze/.test(card.metal) && card.name === 'Dagger' && card.faces === 4 && card.real === 4 && card.ups.join() === '6,8,10', JSON.stringify(card));
check('the name is big type (at least 20 px on the phone) and a covered corner is a big tap target', card && card.font >= 20 && card.tap >= 44, card && `${card.font}px, ${card.tap}px`);
await p.screenshot({ path: `${OUT}/1-dagger-card.png` });
await p.locator('.qc17.t30 .t30-up[data-step="8"]').click(); await p.waitForTimeout(500);
check('tapping d8 first says to grow to d6 first, and buys nothing', await p.evaluate(() => /d6 first/.test(document.querySelector('.t29-toast')?.textContent || '') && window.QD.S.hero.gold === 160));
await p.locator('.qc17.t30 .t30-up[data-step="6"]').click(); await p.waitForTimeout(1200);
const after = await p.evaluate(() => { const h = window.QD.S.hero; return { gold: h.gold, size: window.QD.E.weaponSize(h.loadout.NW), faces: document.querySelectorAll('.qc17.t30 .t30-q.live .t29-f').length }; });
check('tapping the d6 corner grows the Dagger to d6 for 50 gold, and the card shows six real dice', after.gold === 110 && after.size === 6 && after.faces === 6, JSON.stringify(after));
await p.screenshot({ path: `${OUT}/2-dagger-d6.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelectorAll('body > .cw-pop').forEach((e) => e.remove()));
await p.locator('[data-camp-page="camp"]').click(); await p.waitForTimeout(1200);
await p.evaluate(() => document.getElementById('zn-shelf')?.scrollIntoView({ block: 'start', behavior: 'instant' }) || document.querySelector('.zn-shelf')?.scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(900);
check('the Camp Store shelf shows the new cards', await p.evaluate(() => document.querySelectorAll('.cst-wcard .qc17.t29').length > 0));
await p.screenshot({ path: `${OUT}/3-store-shelf.png` });
check('no Sell or price chip on any weapon card', await p.evaluate(() => ![...document.querySelectorAll('.qc17.t29')].some((c) => c.querySelector('.sell, .sl17') || /\bSELL\b/i.test(c.querySelector('.t30-quads')?.textContent || ''))));
// the store card's Buy button is on the card, and buying puts the weapon in the pack
const before = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, bag: window.QD.S.hero.bag.length }));
const shelfIdx = await p.evaluate(() => { const st = window.QD.E.shopStock(window.QD.S.hero); return st.findIndex((it) => !it.sold && !it.inst.diamond && it.price <= window.QD.S.hero.gold); });
if (shelfIdx >= 0) {
  await p.evaluate(() => { const cards = [...document.querySelectorAll('.cst-wcard')]; const c = cards.find((x) => !x.classList.contains('sold') && x.querySelector('.cst-tag:not([disabled])')); c?.querySelector('.cw-spoilcard')?.click(); });
  await p.waitForTimeout(900);
  const pop = await p.evaluate(() => { const c = document.querySelector('.cw-cardpop .qc17.t29'); const b = c?.querySelector('.t29-acts .sh-buy'); const r = b?.getBoundingClientRect(); const cr = c?.getBoundingClientRect(); return c ? { onCard: !!b && r.top >= cr.top && r.bottom <= cr.bottom + 1, label: b?.textContent, below: !!document.querySelector('.cw-cardpop .cw-modal-acts') } : null; });
  check('the store card opens large with its Buy button on the card', pop && pop.onCard && /Buy/.test(pop.label) && !pop.below, JSON.stringify(pop));
  await p.screenshot({ path: `${OUT}/4-store-card-buy.png` });
  await p.evaluate(() => document.querySelector('.cw-cardpop .t29-acts .sh-buy')?.click()); await p.waitForTimeout(900);
  const got = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, bag: window.QD.S.hero.bag.length }));
  check('Buy on the card puts the weapon in the pack and takes the gold', got.bag === before.bag + 1 && got.gold < before.gold, JSON.stringify({ before, got }));
  // the pack card: Equip / hands / Sell are on the card
  await p.locator('[data-camp-page="dice"]').click(); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('.cw-shelf-die.pack')?.click()); await p.waitForTimeout(900);
  const pk = await p.evaluate(() => { const c = document.querySelector('.cw-cardpop .qc17.t29'); return c ? [...c.querySelectorAll('.t29-acts button')].map((b) => b.textContent.trim()) : null; });
  check('a weapon in the pack opens with its buttons on the card (hands and Sell)', pk && pk.length >= 2 && pk.some((t) => /Sell/.test(t)), JSON.stringify(pk));
  await p.screenshot({ path: `${OUT}/5-pack-card.png` });
} else console.log('SKIP buy checks: nothing affordable on the shelf');
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
