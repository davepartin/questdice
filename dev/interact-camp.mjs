// Pokes every control in the battle and camp screens (rerolls, cards, heal, nudge, forge, train, equip, sell, traveller) and reports errors.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const port = args.port || 8135; const out = args.out || 'shots/interact'; fs.mkdirSync(out, { recursive: true });
const W = Number(args.w || 390); const H = Number(args.h || 844);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const problems = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) problems.push(`[console] ${m.text()}`); });
p.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`);
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
const log = (...a) => console.log(...a);
const ev = (f, ...a) => p.evaluate(f, ...a);
const cls = args.cls || 'knight';
await ev((cls) => { const { S, E, showBoard } = window.QD; const hero = E.newHero({ name: 'Dave', cls, seed: 5 }); hero.gold = 900; hero.level = 8; hero.strength = { W: 6, E: 8 }; hero.special = { SW: 6, SE: 4 }; S.hero = hero; S.company = { members: [hero] }; showBoard(); }, cls);
await pump(1);
// ---- camp: forge / train / gear
await ev(() => { window.QD.S.hero.gold = 900; window.QD.showCamp({ fromBoard: true }); }); await pump(2);
await ev(() => document.querySelectorAll('.sx-eye').forEach((e) => { if (/Weapons/i.test(e.textContent)) e.scrollIntoView(); })); await pump(0.5); await shot('camp-forge');
const before = await ev(() => ({ g: window.QD.S.hero.gold, w: window.QD.S.hero.loadout.NW.rarity, sz: window.QD.S.hero.loadout.NW.size || 4 }));
for (let i = 0; i < 4; i++) { await ev(() => [...document.querySelectorAll('.wrow .ur-buy')].find((x) => !x.disabled)?.click()); await pump(0.6); }
log('forge/train: before', JSON.stringify(before), 'after', JSON.stringify(await ev(() => ({ g: window.QD.S.hero.gold, w: window.QD.S.hero.loadout.NW.rarity, sz: window.QD.S.hero.loadout.NW.size || 4, sides: window.QD.E.sidesOf(window.QD.S.hero, 'NW') }))));
await ev(() => [...document.querySelectorAll('.ur-buy')].filter((x) => !x.closest('.wrow') && !x.disabled).forEach((x) => x.click())); await pump(0.6);
await ev(() => { const h = window.QD.S.hero; h.bag.push(window.QD.E.makeWeapon('spear', 2), window.QD.E.makeWeapon('bow', 1)); });
for (const tab of ['Gear', 'Hero']) { await ev((t) => [...document.querySelectorAll('.sx-tabs button')].find((x) => new RegExp(t, 'i').test(x.textContent))?.click(), tab); await pump(1.5); await shot(`camp-${tab.toLowerCase()}`);
  if (tab === 'Gear') {
    const n0 = await ev(() => ({ bag: window.QD.S.hero.bag.length, g: window.QD.S.hero.gold, nw: window.QD.S.hero.loadout.NW.id }));
    await ev(() => [...document.querySelectorAll('.wc-grid .sx-btn')].find((x) => /^Left$/.test(x.textContent.trim()))?.click()); await pump(1);
    await ev(() => document.querySelector('.sx-btn.sell')?.click()); await pump(1);
    await ev(() => [...document.querySelectorAll('.sx-tab.gear .wc-grid')].pop()?.querySelector('.sx-btn')?.click()); await pump(1);
    log('gear: before', JSON.stringify(n0), 'after', JSON.stringify(await ev(() => ({ bag: window.QD.S.hero.bag.length, g: window.QD.S.hero.gold, nw: window.QD.S.hero.loadout.NW.id }))));
  } }
// gear tab: equip, sell, buy
const gear = await ev(() => [...document.querySelectorAll('.sx-btn')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)); log('buttons on gear/hero tab', JSON.stringify(gear.slice(0, 20)));
// ---- traveller
await ev(() => { const h = window.QD.S.hero; Object.assign(h.campaign, { act: 1, step: 5, wins: 4, road: null, travellerAt: 0 }); h.gold = 300; window.QD.showRoad(); }); await pump(2); await shot('traveller');
const trav = await ev(() => [...document.querySelectorAll('.sx-choice')].map((c) => c.textContent.replace(/\s+/g, ' ').trim())); log('traveller choices', JSON.stringify(trav));
await ev(() => document.querySelector('.sx-choice')?.click()); await pump(2); await shot('traveller-result');
log('after traveller: gold', await ev(() => window.QD.S.hero.gold), 'bag', await ev(() => window.QD.S.hero.bag.length));
log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors');
await b.close();
