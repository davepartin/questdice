// Camp dice grid -> cardboard cards, live (Crockpot / Grok Bot, 25 Oct 2026). Opens every camp die at 375x548 and 390x844, checks the card fits,
// buys Head, Right Hand and Talent One through the card covers (HE.upgradeDie underneath) and checks gold, size and the saved hero after a reload.
//   node dev/camp-cardboard.mjs [out] [port]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cards-live'; const port = +(process.argv[3] || 8151); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, h] of [[390, 844], [375, 548]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const tag = `${w}x${h}`; const name = `Board${w}`;
  await p.evaluate(async (name) => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name, cls: 'knight', seed: 5 }); hh.gold = 400; hh.campaign.act = 1; hh.campaign.step = 3;
    S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); }, name);
  await pump(2);
  const open = async (slot) => { await p.locator(`.cw-cell.s-${slot}`).click(); await pump(1.5); await p.waitForTimeout(800);
    await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card, .qc-gear') || i; const side = i?.closest('.sx-side'); if (c && side) side.scrollTop += c.getBoundingClientRect().top - 60; }); await pump(0.5); await p.waitForTimeout(400); };
  const shot = async (n) => { const f = `${OUT}/camp-${n}_${tag}.png`; const c = p.locator('#camp-inspector .cb-card, #camp-inspector .qc-gear').first(); await p.screenshot({ path: f }); return f; };
  for (const [slot, n, want] of [['N', 'strength', 'STRENGTH'], ['SW', 'talents', 'TALENT'], ['C', 'heart', 'HEART']]) {
    await open(slot); await shot(n);
    const st = await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card'); const r = c?.getBoundingClientRect();
      const tiny = c ? [...c.querySelectorAll('*')].filter((e) => e.childNodes[0]?.nodeType === 3 && e.textContent.trim() && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 10.9).map((e) => e.textContent.trim()).slice(0, 5) : [];
      return { cb: c?.getAttribute('aria-label') || '', gear: !!i?.querySelector('.qc-gear, .ww, .sh-weapon, .gc-face'), x0: r ? Math.round(r.left) : 0, x1: r ? Math.round(r.right) : 0, vw: innerWidth, tiny }; });
    const ok = want === 'qc-gear' ? !st.cb : (st.cb.toUpperCase().includes(want) && st.x0 >= 0 && st.x1 <= st.vw && !st.tiny.length);
    check(`${tag} ${n}: opens the right card, fits, text >= 11 px`, ok, JSON.stringify(st));
  }
  for (const [slot, n] of [['NW', 'weapon-left'], ['NE', 'weapon-right']]) { // the approved T17 weapon card (rev 15 sized layout), current rules
    await open(slot); await p.evaluate(() => document.querySelectorAll('#toast > .toast, .toast17').forEach((t) => t.remove())); await shot(`${n}-v4`);
    const st = await p.evaluate((slot) => { const { S, E } = window.QD; const inst = S.hero.loadout[slot]; const c = document.querySelector('#camp-inspector .qc17.cb-weapon'); const r = c?.getBoundingClientRect();
      const tiny = c ? [...c.querySelectorAll('small,b,span,em')].filter((e) => e.childNodes[0]?.nodeType === 3 && e.textContent.trim() && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 10.9).map((e) => e.textContent.trim()).slice(0, 5) : [];
      return { card: !!c, id: inst?.id, size: E.weaponSize(inst), rows: c?.querySelectorAll('.row').length, covers: c?.querySelectorAll('.cov.tok').length, perRow: [...(c?.querySelectorAll('.row:not(.locked)') || [])].map((r) => [+r.dataset.size, r.querySelectorAll('.d17').length]), chipArt: !!c?.querySelector('.art17 .sl17'), chipInRow: !!c?.querySelector('.row .sl17'), dieW: [...new Set([...(c?.querySelectorAll('.d17') || [])].map((f) => Math.round(f.getBoundingClientRect().width * 2) / 2))], overlap: (() => { const a = c?.querySelector('.sl17')?.getBoundingClientRect(); return a ? [...c.querySelectorAll('.d17')].some((f) => { const b = f.getBoundingClientRect(); return b.left < a.right && b.right > a.left && b.top < a.bottom && b.bottom > a.top; }) : true; })(), chip: c?.querySelector('.sl17 b')?.textContent, sell: E.sellValue(inst), wear: /wear|battles/i.test(c?.textContent || ''), cw: r ? r.width : 0, spill: [...(c?.querySelectorAll('.d17') || [])].some((f) => { const b = f.getBoundingClientRect(), row = f.closest('.row').getBoundingClientRect(); return b.left < row.left - 0.5 || b.right > row.right + 0.5 || b.top < row.top - 0.5 || b.bottom > row.bottom + 0.5; }), x0: r ? Math.round(r.left) : -1, x1: r ? Math.round(r.right) : 999, vw: innerWidth, tiny }; }, slot);
    check(`${tag} ${n}: T17 card, rows d4-d10, covers above d${st.size}, sell chip in the art window = engine sellValue, dice 13cqi on every row, inside their rows, each row only the faces its size adds, no wear, fits, text >= 11 px`, st.card && st.rows === 4 && st.covers === [4, 6, 8, 10].filter((z) => z > st.size).length && st.chipArt && !st.chipInRow && st.dieW.length === 1 && Math.abs(st.dieW[0] - st.cw * 0.13) <= 1 && !st.spill && st.perRow.every(([z, n]) => n === (z === 4 ? 4 : 2)) && !st.overlap && +st.chip === st.sell && !st.wear && st.x0 >= 0 && st.x1 <= st.vw && !st.tiny.length, JSON.stringify(st));
    const g0 = await p.evaluate(() => window.QD.S.hero.gold); const cov = p.locator('#camp-inspector .qc17.cb-weapon .cov.tok').first();
    if (await cov.count()) { await cov.click({ timeout: 10000 }); await pump(0.5); } await p.locator('#camp-inspector .qc17.cb-weapon .sl17').click({ force: true, timeout: 10000 }); await pump(0.5);
    const g1 = await p.evaluate((slot) => ({ gold: window.QD.S.hero.gold, still: !!window.QD.S.hero.loadout[slot] && window.QD.S.hero.loadout[slot].id !== 'fists' }), slot);
    check(`${tag} ${n}: tapping a cover or the sell chip changes nothing (no size purchase or loadout sale in the current rules)`, g1.gold === g0 && g1.still, JSON.stringify({ g0, g1 }));
  }
  for (const [slot, n] of [['W', 'lefthand'], ['E', 'righthand'], ['S', 'feet'], ['SE', 'talent-two']]) { await open(slot); await shot(n); }
  const buy = async (slot, sel, read, label) => { await open(slot); const a = await p.evaluate(read); await p.locator(sel).first().click(); await pump(1.5); await p.waitForTimeout(500); const z = await p.evaluate(read);
    check(`${tag}: ${label}`, z.size > a.size && z.gold < a.gold, JSON.stringify({ a, z })); return z; };
  await buy('N', '#camp-inspector .cb-cov.ready[data-slot="N"]', () => ({ size: window.QD.E.mindSize(window.QD.S.hero), gold: window.QD.S.hero.gold }), 'Head cover buys through the game (gold down, die up)');
  await shot('strength-bought');
  await buy('E', '#camp-inspector .cb-cov.ready[data-slot="E"]', () => ({ size: window.QD.S.hero.strength.E, w: window.QD.S.hero.strength.W, gold: window.QD.S.hero.gold }), 'Right Hand cover grows E only');
  const sym0 = await p.evaluate(() => JSON.stringify(window.QD.S.hero.talent.SW));
  await buy('SW', '#camp-inspector .cb-cov.ready[data-slot="SW"]', () => ({ size: window.QD.S.hero.special.SW, gold: window.QD.S.hero.gold }), 'Talent One cover grows the talent die');
  check(`${tag}: Talent One keeps its symbols`, sym0 === await p.evaluate(() => JSON.stringify(window.QD.S.hero.talent.SW)));
  await shot('talents-grown');
  const now = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, mind: window.QD.E.mindSize(window.QD.S.hero) }));
  await p.reload(); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const saved = await p.evaluate(async (name) => { const SV = await import('./js/save.js'); const hh = await SV.openHero(name, 'testpass'); return hh ? { gold: hh.gold, mind: hh.mind?.N } : null; }, name);
  check(`${tag}: the save has the new gold and Head size`, saved && saved.gold === now.gold && saved.mind === now.mind, JSON.stringify({ now, saved }));
  // ---- the cardboard Camp Store (26 Oct 2026): sections, pencil price tags (red when short), Diamond case, supplies, and every buy through the game
  const SOUT = process.env.STORE_OUT || '/workspace/camp-store-live'; fs.mkdirSync(SOUT, { recursive: true });
  const clearToasts = () => p.evaluate(() => document.querySelectorAll('#toast > .toast, .toast17, .toast').forEach((t) => t.remove()));
  await p.evaluate(async (name) => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name, cls: 'knight', seed: 5 }); hh.gold = 60; hh.potions = 1; hh.campaign.act = 1; hh.campaign.step = 1;
    S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'store'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); }, `Store${w}`);
  await pump(1.5); await p.waitForTimeout(1500);
  const look = () => p.evaluate(() => { const st = document.querySelector('.cst-store'); const r = (e) => e.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.cst-card, .cst-diawrap')]; const tags = [...document.querySelectorAll('.cst-tag, .cst-sticker')];
    const hit = []; for (const t of tags) { const a = r(t); for (const c of cards) { if (c.contains(t)) continue; const b = r(c); if (a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2) hit.push(t.textContent + ' on ' + (c.querySelector('.cst-title')?.textContent || 'diamond')); } }
    const out = cards.filter((c) => { const b = r(c); return b.left < -1 || b.right > innerWidth + 1; }).length;
    const tiny = st ? [...st.querySelectorAll('small,b,span,h2,p')].filter((e) => e.childNodes[0]?.nodeType === 3 && e.textContent.trim() && e.getClientRects().length && !e.closest('.qc17') && parseFloat(getComputedStyle(e).fontSize) < 10.9).map((e) => e.textContent.trim()).slice(0, 5) : ['no store'];
    return { zones: [...document.querySelectorAll('.cst-zone')].map((z) => z.className.split(' ')[1]), sign: !!document.querySelector('.cst-sign'), pencil: [...document.querySelectorAll('.cst-tag .cst-coin, .cst-purse .cst-coin')].filter((c) => /radial-gradient/.test(getComputedStyle(c).backgroundImage) && getComputedStyle(c).backgroundImage.includes('242, 180, 22')).length - 1, hand: [...document.querySelectorAll('.cst-tag b')].every((b) => /Caveat/.test(getComputedStyle(b).fontFamily) && document.fonts.check('700 17px Caveat')), svgcoin: document.querySelectorAll('.cst-store .cst-tag svg, .cst-purse svg').length, ntag: document.querySelectorAll('.cst-tag').length, tags: tags.length,
      poor: [...document.querySelectorAll('.cst-tag.poor')].map((t) => t.querySelector('b').textContent), dia: !!document.querySelector('.cst-diawrap .qc17.cst-dia'), charm: /charm/i.test(st?.textContent || ''), hit, out, tiny,
      gold: window.QD.S.hero.gold }; });
  let L = await look();
  check(`${tag} store: sign, 5 sections in order, the mockup's yellow coin on every tag and the purse (no svg coin), handwritten Caveat numbers, Diamond T17 card, no charms`, L.sign && L.zones.join() === 'zn-specials,zn-shelf,zn-diamond,zn-odd,zn-supplies' && L.pencil === L.ntag && L.ntag > 0 && L.hand && !L.svgcoin && L.dia && !L.charm, JSON.stringify(L));
  const want = await p.evaluate(() => { const { S, E } = window.QD; const h = S.hero; const all = [...E.shopStock(h).map((i) => i.price), ...E.storeTonics(h).map((t) => t.price), E.bundleOffer(h).price, E.petOffer(h).price, E.potionBuyInfo(h).price, E.potionUpgrade(h).cost, E.rerollDieInfo(h).cost];
    return { poor: all.filter((x) => x > h.gold).sort((a, b) => a - b).join(), belt: E.potionUpgrade(h) }; });
  check(`${tag} store: tags are red exactly when the purse is short (60 gold), the belt shows Needs Level 4`, L.poor.map(Number).sort((a, b) => a - b).join() === want.poor && await p.locator('.cst-card.belt .cst-sticker').textContent() === 'Needs Level 4', JSON.stringify({ poor: L.poor, want }));
  check(`${tag} store: no tag or sticker over another card, every card inside the screen, text >= 11 px`, !L.hit.length && !L.out && !L.tiny.length, JSON.stringify(L));
  if (w === 390) { await clearToasts(); await p.screenshot({ path: `${SOUT}/store-top_390x844.png` }); }
  if (w === 390) { await p.evaluate(() => { const s = document.querySelector('.sx-side'); const z = document.querySelector('.zn-diamond'); if (s && z) s.scrollTop += z.getBoundingClientRect().top - 70; }); await clearToasts(); await p.screenshot({ path: `${SOUT}/store-diamond_390x844.png` });
    await p.evaluate(() => { const s = document.querySelector('.sx-side'); const z = document.querySelector('.zn-odd'); if (s && z) s.scrollTop += z.getBoundingClientRect().top - 70; }); await clearToasts(); await p.screenshot({ path: `${SOUT}/store-supplies_390x844.png` }); }
  await p.evaluate(() => { window.QD.S.hero.gold = 2000; window.QD.S.hero.level = 4; window.QD.S.holdScroll = true; }); await p.evaluate(() => window.QD.showCamp()); await pump(0.5); await p.waitForTimeout(800);
  const buyTag = async (sel, label, price) => { const g0 = await p.evaluate(() => window.QD.S.hero.gold); const t = p.locator(sel).first(); await t.scrollIntoViewIfNeeded(); await t.click({ timeout: 10000 }); await pump(0.6); await p.waitForTimeout(300);
    const conf = p.locator('.confirm-home .sx-primary'); if (await conf.count()) { await conf.first().click(); await pump(0.5); }
    const g1 = await p.evaluate(() => window.QD.S.hero.gold); check(`${tag} store: ${label} (gold ${g0} -> ${g1}, price ${price})`, g0 - g1 === price, ''); };
  const P = await p.evaluate(() => { const { S, E } = window.QD; const h = S.hero; const st = E.shopStock(h); return { tonic: E.storeTonics(h)[0].price, bundle: E.bundleOffer(h).price, dia: st.find((i) => i.inst.diamond)?.price, wpn: st.find((i) => !i.inst.diamond).price, pet: E.petOffer(h).price, pot: E.potionBuyInfo(h).price, belt: E.potionUpgrade(h).cost, rr: E.rerollDieInfo(h).cost }; });
  await buyTag('.zn-specials .cst-card:not(.parcel) .cst-tag', 'a special buys through HE.buyTonic', P.tonic);
  await buyTag('.zn-specials .cst-card.parcel .cst-tag', 'the mystery bundle buys through HE.buyBundle', P.bundle);
  await buyTag('.zn-shelf .cst-card .cst-tag', 'a shelf weapon buys through HE.buyItem', P.wpn);
  await buyTag('.zn-diamond .cst-tag', 'the Diamond buys into the Diamond case', P.dia);
  await buyTag('.zn-odd .cst-tag', 'the pet adopts through HE.buyPet', P.pet);
  await buyTag('.cst-card.potion .cst-tag', 'a healing potion buys through HE.buyPotion', P.pot);
  await buyTag('.cst-card.belt .cst-tag', 'the potion belt (level 4) buys through HE.upgradePotions', P.belt);
  await buyTag('.cst-card.reroll .cst-tag', 'the 4th reroll die buys through HE.buyRerollDie', P.rr);
  const after = await p.evaluate(() => { const h = window.QD.S.hero; return { dia: (h.diamonds || []).length, bag: h.bag.length, pet: !!h.pet, potMax: window.QD.E.potionMaxOf(h), rr: window.QD.E.rerollDiceOf(h), stamps: [...document.querySelectorAll('.cst-stamp')].map((e) => e.textContent) }; });
  check(`${tag} store: the hero got them (Diamond, pet, belt of 3, 4 reroll dice) and the cards stamp Sold / Yours / Opened / Max`, after.dia === 1 && after.pet && after.potMax === 3 && after.rr === 4 && ['Sold', 'Yours', 'Opened', 'Max'].every((x) => after.stamps.includes(x)), JSON.stringify(after));
  L = await look(); check(`${tag} store after buying: still no overlaps`, !L.hit.length && !L.out, JSON.stringify(L.hit));
  await p.evaluate(() => { const { S } = window.QD; S.tab = 'forge'; S.campPage = 'supplies'; window.QD.showCamp(); }); await pump(0.5);
  check(`${tag} Camp > Supplies: the potion and reroll rows moved to the store (a button opens it)`, await p.evaluate(() => !document.querySelector('.cw-supplies [aria-label^="Carry "], .cw-supplies [aria-label^="Reroll "]') && !!document.querySelector('.cst-goto')));
  if (w === 390) { await p.evaluate(() => { const { S } = window.QD; S.tab = 'store'; S.hero.gold = 60; window.QD.showCamp(); }); await pump(0.5); await p.waitForTimeout(800);
    const tall = await p.evaluate(() => document.querySelector('.sx-side').scrollHeight); await p.setViewportSize({ width: 390, height: Math.min(6000, tall) }); await pump(0.5); await p.waitForTimeout(800); await clearToasts();
    await p.screenshot({ path: `${SOUT}/store-full_390xfull.png`, fullPage: true }); await p.setViewportSize({ width: w, height: h }); }
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | ')); await ctx.close();
}
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
