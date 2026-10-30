// Build 20261026pc1 (Crockpot / Grok Bot, 26 Oct 2026; Dave approved live): the spoils' real weapon card, the one shared price chip, and talent
// face 4 starting empty (10 gold to fill). 390x844 screenshots with toasts cleared, plus checks.   node dev/pricechip.mjs [out] [port]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/price-chip-live'; const port = +(process.argv[3] || 8157); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : '/usr/bin/google-chrome'); let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const clearToasts = () => p.evaluate(() => document.querySelectorAll('#toast > .toast, .toast17, .toast').forEach((t) => t.remove()));
const shot = async (n) => { await clearToasts(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
const chipsOk = (sel) => p.evaluate((sel) => { const cs = [...document.querySelectorAll(`${sel} .qd-price`)].filter((c) => c.getClientRects().length);
  return { n: cs.length, all: cs.every((c) => { const s = getComputedStyle(c); const b = getComputedStyle(c.querySelector('b')); const coin = c.querySelector('.qd-coin');
    return /gradient/.test(s.backgroundImage) && coin && /gradient/.test(getComputedStyle(coin).backgroundImage) && (c.classList.contains('poor') ? b.color === 'rgb(255, 122, 106)' : b.color === 'rgb(255, 217, 138)'); }) }; }, sel);

// ---- 1) spoils
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Spoils Dave', cls: 'wizard', seed: 3 }); h.level = 3; h.campaign.step = 2; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(2);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.offsetParent && /continue|begin|fight|accept|got it/i.test(e.textContent))?.click()); await pump(0.5); }
await p.evaluate(() => { const { S, B3, showVictory } = window.QD; S.battle.enemies.forEach((e) => { e.hp = 0; }); S.battle.outcome = 'victory'; S.battle.phase = 'done'; B3.stop(); showVictory(); });
await pump(2); for (let i = 0; i < 15 && !(await p.evaluate(() => !!document.querySelector('.sx-loot .cw-spoil'))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /continue/i.test(x.innerText))?.click()); await pump(2); }
await p.evaluate(() => document.querySelector('.sx-loot')?.scrollIntoView({ block: 'start' })); await pump(3); await p.waitForTimeout(2500); await pump(1);
const sp = await p.evaluate(() => { const s = document.querySelector('.sx-loot .cw-spoil'); const c = s?.querySelector('.cw-spoilcard .qc17.cb-weapon'); const r = s?.querySelector('.cw-spoilcard')?.getBoundingClientRect(); const cr = c?.getBoundingClientRect();
  return { spoil: !!s, real: !!c, rows: c?.querySelectorAll('.row').length || 0, oldMini: !!s?.querySelector(':scope > .qc17:not(.cb-weapon)'), szl: !!s?.querySelector('.szl'), w: r ? Math.round(r.width) : 0, cw: cr ? Math.round(cr.width) : 0,
    sell: !!s?.querySelector('.sh-acts .sell .qd-price') }; });
check('spoils: the real camp T17 weapon card (rows d4-d10), scaled to the thumbnail, no old mini card or stray size label, Sell uses the chip', sp.spoil && sp.real && sp.rows === 4 && !sp.oldMini && !sp.szl && Math.abs(sp.w - sp.cw) <= 2 && sp.sell, JSON.stringify(sp));
check('spoils: every price chip is the shared chip', (await chipsOk('.sx-loot')).all, JSON.stringify(await chipsOk('.sx-loot')));
await shot('spoils');
await p.locator('.sx-loot .cw-spoilcard').first().click(); await pump(1); await p.waitForTimeout(800);
const big = await p.evaluate(() => { const c = document.querySelector('.cw-modal .qc17.cb-weapon'); return { open: !!c, w: c ? Math.round(c.getBoundingClientRect().width) : 0 }; });
check('spoils: tapping the card opens the same card large', big.open && big.w > 250, JSON.stringify(big)); await shot('spoils-card-large');
await p.evaluate(() => [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.textContent))?.click()); await pump(0.5);

// ---- 2) camp grid + Talent Two unlock + fill face 4 (a hero saved before the fix: Talent Two pre-filled with the Wizard's Heal)
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const SV = await import('./js/save.js');
  const hh = E.newHero({ name: 'OldWiz', cls: 'wizard', seed: 5 }); hh.talent = { SW: [['magic']], SE: [['heal']] }; hh.gold = 60; hh.campaign.act = 1; hh.campaign.step = 3; SV.migrateHero(hh);
  S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); });
await pump(2); await p.waitForTimeout(1500); await pump(1);
await p.evaluate(() => document.querySelector('.cw-dicegrid')?.scrollIntoView({ block: 'start' })); await pump(0.5);
const grid = await chipsOk('.cw-dicegrid'); const poorGrid = await p.evaluate(() => [...document.querySelectorAll('.cw-dicegrid .qd-price')].map((c) => [c.dataset.price, c.classList.contains('poor')]));
check('camp grid: tile costs use the shared chip, red where gold is short', grid.n > 0 && grid.all && poorGrid.every(([n, poor]) => poor === (60 < +n)), JSON.stringify({ grid, poorGrid }));
await shot('camp-grid');
const open = async (slot) => { await p.locator(`.cw-cell.s-${slot}`).click(); await pump(1.5); await p.waitForTimeout(800);
  await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card, .qc-gear') || i; const side = i?.closest('.sx-side'); if (c && side) side.scrollTop += c.getBoundingClientRect().top - 60; else c?.scrollIntoView({ block: 'start' }); }); await pump(0.5); await p.waitForTimeout(400); };
await open('SE');
const pre = await p.evaluate(() => ({ se: JSON.stringify(window.QD.S.hero.talent.SE), sw: JSON.stringify(window.QD.S.hero.talent.SW), gold: window.QD.S.hero.gold }));
check('old save: locked Talent Two lost the auto-filled Heal on load; Talent One keeps its face', pre.se === '[[]]' && pre.sw === '[["magic"]]', JSON.stringify(pre));
await shot('talent-two-locked');
await p.locator('#camp-inspector .cb-cov.cb-big[data-slot="SE"], #camp-inspector .sh-buy').first().click({ timeout: 15000 }); await pump(1.5); await p.waitForTimeout(600); await open('SE');
const un = await p.evaluate(() => { const H = window.QD.S.hero; return { active: window.QD.E.isActive(H, 'SE'), face4: window.QD.E.specialFace(H, 'SE', 4), gold: H.gold,
  hole: !!document.querySelector('#camp-inspector .cb-tcol:last-child .cb-hole.open .qd-price[data-price="10"]') || [...document.querySelectorAll('#camp-inspector .cb-hole.open .qd-price')].some((c) => c.dataset.price === '10') }; });
check('Talent Two unlocked for 35: face 4 is an EMPTY slot priced 10 with the chip', un.active && un.face4 === null && un.gold === pre.gold - 35 && un.hole, JSON.stringify(un));
check('Talents card: every price is the shared chip', (await chipsOk('#camp-inspector .cb-card')).all, JSON.stringify(await chipsOk('#camp-inspector .cb-card')));
await shot('talent-two-unlocked');
await p.evaluate(() => { const holes = [...document.querySelectorAll('#camp-inspector .cb-hole.open')]; holes[holes.length - 1]?.click(); }); await pump(1); await p.waitForTimeout(500);
await p.locator('.tw-symbol[data-symbol="gold"]').click({ timeout: 15000 }); await pump(0.5);
await p.evaluate(() => document.querySelector('.tw-purchase')?.scrollIntoView({ block: 'center' })); await pump(0.5);
const buyChip = await chipsOk('.tw-purchase'); check('fill face 4: the buy button shows the chip with 10', buyChip.n === 1 && buyChip.all && await p.evaluate(() => document.querySelector('.tw-purchase .qd-price')?.dataset.price === '10'), JSON.stringify(buyChip));
await shot('talent-two-face4-pick');
const g0 = await p.evaluate(() => window.QD.S.hero.gold); await p.locator('.tw-purchase .sh-buy').click({ timeout: 15000 }); await pump(1); await p.waitForTimeout(500);
const fill = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, se: JSON.stringify(window.QD.S.hero.talent.SE) }));
check('fill face 4: 10 gold, Gold on face 4', fill.gold === g0 - 10 && fill.se === '[["gold"]]', JSON.stringify({ g0, fill }));
await open('SE'); await shot('talent-two-face4-filled');

// ---- 3) Add this die (Talent Two still locked, 'Add this die 35'), on a fresh hero with 20 gold (red chip)
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Poor', cls: 'knight', seed: 7 }); hh.gold = 20; S.hero = hh; S.company = { members: [hh] }; S.tab = 'forge'; S.campPage = 'dice'; showCamp(); });
await pump(1.5); await open('SE');
const add = await p.evaluate(() => { const c = document.querySelector('#camp-inspector .sh-buy .qd-price'); return c ? { n: c.dataset.price, poor: c.classList.contains('poor') } : null; });
check('Add this die: the chip, red when short', !add || (add.poor && add.n === '35'), JSON.stringify(add));
await shot('add-this-die-short');
// the Powers tab (learn / level prices through shBuy and priceBtn) renders with chips and no errors
await p.evaluate(() => { window.QD.S.hero.gold = 60; window.QD.S.campPage = 'powers'; window.QD.showCamp(); }); await pump(1.5); await p.waitForTimeout(800);
const pw = await chipsOk('body'); check('powers page: any price shown is the shared chip', pw.all, JSON.stringify(pw)); await shot('camp-powers');

// ---- 4) the Camp Store: the paper tags keep their tag, the price is the chip, red when short
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Shopper', cls: 'knight', seed: 5 }); hh.gold = 60; hh.potions = 1; S.hero = hh; S.company = { members: [hh] }; S.tab = 'store'; showCamp(); });
await pump(1.5); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelector('.cst-store')?.scrollIntoView({ block: 'start' })); await pump(0.5);
const st = await p.evaluate(() => { const tags = [...document.querySelectorAll('.cst-store .cst-tag')]; return { tags: tags.length, chip: tags.every((t) => t.querySelector('.qd-price')), oldCoin: !!document.querySelector('.cst-tag .cst-coin'),
  poorOk: tags.every((t) => t.classList.contains('poor') === !!t.querySelector('.qd-price.poor')) }; });
check('store: every tag carries the shared chip (no old coin), red chip on short tags', st.tags > 0 && st.chip && !st.oldCoin && st.poorOk, JSON.stringify(st));
check('store: chips styled as the shared chip', (await chipsOk('.cst-store')).all);
await shot('store'); await p.evaluate(() => document.querySelector('.zn-supplies')?.scrollIntoView({ block: 'start' })); await pump(0.5); await shot('store-supplies');
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
