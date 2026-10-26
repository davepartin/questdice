// Camp dice grid -> inspection card (Crockpot / Grok Bot, 25 Oct, building for Claude): opens Head, Feet and Heart in the camp's inline inspector,
// screenshots each at 375x548 and 390x844, buys the Head upgrade through the real button and checks gold, size and the saved hero after a reload.
//   node dev/camp-cards.mjs [out] [port] [tag]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/card-previews-director-equip/live'; const port = +(process.argv[3] || 8150); const TAG = process.argv[4] || 'after'; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, h] of [[375, 548], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const tag = `${w}x${h}`; const name = `Carder${w}`;
  await p.evaluate(async (name) => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name, cls: 'knight', seed: 5 }); hh.gold = 200; hh.campaign.act = 1; hh.campaign.step = 3;
    S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); }, name);
  await pump(2);
  for (const [slot, n] of [['N', 'head'], ['S', 'feet'], ['C', 'heart'], ['W', 'lefthand'], ['E', 'righthand']]) {
    await p.locator(`.cw-cell.s-${slot}`).click(); await pump(1.5); await p.waitForTimeout(600);
    await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const side = i?.closest('.sx-side'); if (i && side) side.scrollTop += i.getBoundingClientRect().top - 70; }); await pump(0.5); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/camp-${n}-${TAG}_${tag}.jpg`, type: 'jpeg', quality: 82 });
    const st = await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.qc-gear'); const done = [...(i?.querySelectorAll('button') || [])].find((x) => /Done|Close/.test(x.textContent));
      return { card: !!c, title: c?.querySelector('.title17')?.textContent || '', buy: !!i?.querySelector('.sh-buy, .sh-done, .sh-lockline'), close: !!done, cardW: c ? Math.round(c.getBoundingClientRect().width) : 0, vw: innerWidth }; });
    check(`${tag} ${n}: inspector has ${TAG === 'after' ? 'the card, ' : ''}a buy/limit line and Done`, (TAG !== 'after' || (st.card && st.cardW <= st.vw)) && (n === 'heart' || st.buy) && st.close, JSON.stringify(st));
  }
  if (TAG === 'after') { // the hands grow independently: buy the right hand only
    await p.locator('.cw-cell.s-E').click(); await pump(1);
    const b0 = await p.evaluate(() => ({ ...window.QD.S.hero.strength, gold: window.QD.S.hero.gold }));
    await p.locator('#camp-inspector .sh-buy:not([disabled])').first().click(); await pump(1.5);
    const b1 = await p.evaluate(() => ({ ...window.QD.S.hero.strength, gold: window.QD.S.hero.gold, card: document.querySelector('#camp-inspector .qc-gear .sz17')?.textContent }));
    check(`${tag}: buying the Right Hand grows E only (W unchanged), spends gold`, b1.E > b0.E && b1.W === b0.W && b1.gold < b0.gold, JSON.stringify({ b0, b1 }));
    await p.screenshot({ path: `${OUT}/camp-righthand-bought_${tag}.jpg`, type: 'jpeg', quality: 82 });
  }
  if (TAG === 'after') {
    await p.locator('.cw-cell.s-N').click(); await pump(1);
    const before = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, size: window.QD.E.mindSize(window.QD.S.hero) }));
    await p.locator('#camp-inspector .sh-buy:not([disabled])').first().click(); await pump(1.5); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, size: window.QD.E.mindSize(window.QD.S.hero), title: document.querySelector('#camp-inspector .qc-gear .sz17')?.textContent }));
    check(`${tag}: buying Head through the real button spends ${before.gold - after.gold} gold and grows d${before.size} -> d${after.size}`, after.size > before.size && after.gold < before.gold, JSON.stringify({ before, after }));
    await p.screenshot({ path: `${OUT}/camp-head-bought_${tag}.jpg`, type: 'jpeg', quality: 82 });
    await p.reload(); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
    const saved = await p.evaluate(async (name) => { const SV = await import('./js/save.js'); const hh = await SV.openHero(name, 'testpass'); return hh ? { gold: hh.gold, mind: hh.mind?.N } : null; }, name);
    check(`${tag}: the saved hero has the new Head size and gold after the purchase`, saved && saved.mind === after.size && saved.gold === after.gold, JSON.stringify(saved));
  }
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | ')); await ctx.close();
}
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
