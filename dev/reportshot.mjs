// T10: the Share battle report row, sheet and fallbacks on phone-sized screens, with the storage measurements.
//   node dev/reportshot.mjs     PORT=8135 OUT=docs/team/tasks/T10/shots SIZES=390x664,375x548
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const OUT = process.env.OUT || 'docs/ingame/report'; fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '390x664,375x548').split(',').map((s) => s.split('x').map(Number));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const log = [];
for (const [w, h] of SIZES) for (const native of [false, true]) {
  if (native && w !== SIZES[0][0]) continue; // the native-share stub is checked once, at the first size
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript((native) => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {}
    if (native) { window.__shared = []; navigator.canShare = () => true; navigator.share = async (d) => { window.__shared.push({ title: d.title, files: (d.files || []).map((f) => ({ name: f.name, size: f.size, type: f.type })), text: (d.text || '').slice(0, 80) }); }; } }, native);
  await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; /* the test hero has no save record, so the game would toast "Could not save" */ document.head.append(s); }));
  await p.goto(`http://localhost:${process.env.PORT || 8135}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const tag = `${w}x${h}${native ? '_native' : ''}`;
  // one fight: a potion then lethal blows from three monsters (defeat), or a quick win (victory); the real battle screen starts it, the engine plays it
  const fight = async (kind, n) => {
    await p.evaluate(({ n }) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 + n }); h.level = 6; h.campaign.act = 2; h.campaign.step = 6; S.hero = h; S.company = { members: [h] }; showBoard(); }, { n });
    await pump(1);
    await p.evaluate((kind) => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; if (kind === 'defeat') { q.enemies = ['goblin', 'goblin', 'goblin']; q.foeNames = ['Left Goblin', 'Middle Goblin', 'Right Goblin']; } window.QD.startQuest(q); }, kind);
    for (let i = 0; i < 400; i++) {
      if (await p.evaluate(() => !!window.QD.world.battle && !!document.querySelector('#b3-roll'))) break;
      await p.evaluate(() => [...document.querySelectorAll('.sx-envelope button, .env-btns button')].find((x) => /decline|continue/i.test(x.innerText))?.click()); // a Bonus Goal may be offered first
      await pump(0.5);
    }
    await p.evaluate((kind) => { const { S, E, B3, defeat, showVictory } = window.QD; const bt = S.battle;
      if (kind === 'defeat') { bt.enemies.forEach((e) => { e.intent = { n: 'Maul', v: 'strike', f: 28, m: 1 }; }); bt.hp = 18; E.startRoll(bt); E.drinkPotion(bt); E.resolve(bt, { target: 0 }); B3.stop(); defeat(false); }
      else { bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.startRoll(bt); E.resolve(bt, { target: 0 }); B3.stop(); showVictory(); } }, kind);
    await pump(2);
    for (let i = 0; i < 14 && !(await p.evaluate(() => !!document.querySelector('.vc-title, .df-title'))); i++) { // a reveal or a story page may come first
      await p.evaluate(() => [...document.querySelectorAll('.sx-side button, .sx-cta button')].find((x) => /continue|onward|next|go on/i.test(x.innerText))?.click()); await pump(1.5);
    }
  };
  await fight('defeat', 0);
  const defeatRow = await p.evaluate(() => { const r = document.querySelector('.sx-defeat .br-row'); const cta = document.querySelector('.sx-defeat .sx-cta'); const side = document.querySelector('.sx-defeat .sx-side');
    return { rowText: r?.innerText.replace(/\n+/g, ' | '), rowVisibleInScroll: !!r, ctaText: cta?.innerText.trim(), sideScrolls: side.scrollHeight > side.clientHeight + 2 }; });
  await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/defeat_${tag}.png` });
  await p.evaluate(() => { const s = document.querySelector('.sx-defeat .sx-side'); s.scrollTop = s.scrollHeight; }); await pump(0.3); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/defeat_${tag}_bottom.png` });
  // the sheet
  await p.evaluate(() => document.querySelector('.br-open').click()); await pump(0.5);
  await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/sheet_${tag}.png` });
  const sheet = await p.evaluate(() => { const s = document.querySelector('.br-sheet'); const card = document.querySelector('.modal-card'); const r = card.getBoundingClientRect();
    return { buttons: [...s.querySelectorAll('.br-actions .btn')].map((x) => x.innerText), fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, cardH: Math.round(r.height), vh: innerHeight, previewLines: s.querySelector('.br-preview').innerText.split('\n').length }; });
  const exp = {};
  if (native) {
    await p.evaluate(() => [...document.querySelectorAll('.br-actions .btn')].find((x) => /^share$/i.test(x.innerText)).click()); await pump(0.3);
    exp.shared = await p.evaluate(() => window.__shared);
  } else {
    await p.evaluate(() => [...document.querySelectorAll('.br-actions .btn')].find((x) => /^copy$/i.test(x.innerText)).click()); await pump(0.3);
    exp.clipboardChars = await p.evaluate(() => navigator.clipboard.readText().then((t) => t.length)); exp.clipboardHead = await p.evaluate(() => navigator.clipboard.readText().then((t) => t.split('\n').slice(0, 3).join(' | ')));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => [...document.querySelectorAll('.br-actions .btn')].find((x) => /^download$/i.test(x.innerText)).click())]);
    exp.download = dl.suggestedFilename(); const path = `${OUT}/sample_report_${tag}.txt`; await dl.saveAs(path); exp.downloadBytes = fs.statSync(path).size;
    if (w === SIZES[0][0]) fs.copyFileSync(path, `${OUT}/../sample_report.txt`);
  }
  await p.evaluate(() => [...document.querySelectorAll('.modal-card .btn')].find((x) => /close/i.test(x.innerText)).click()); await pump(0.3);
  // normal actions stay prominent: Return to camp still works
  // a victory, then more fights: only three reports are kept, the newest first
  if (!native) {
    await fight('victory', 1); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/victory_${tag}.png` });
    await p.evaluate(() => { const s = document.querySelector('.sx-victory .sx-side'); s.scrollTop = s.scrollHeight; }); await pump(0.3); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/victory_${tag}_bottom.png` });
    await fight('defeat', 2); await fight('victory', 3);
  }
  const store = await p.evaluate(() => { const raw = localStorage.getItem('questdice.battlereports'); const list = raw ? JSON.parse(raw) : [];
    const heroKey = Object.keys(localStorage).find((k) => k.startsWith('questdice.hero.')); const heroRaw = heroKey ? localStorage.getItem(heroKey) : '';
    return { keyChars: raw?.length || 0, count: list.length, each: list.map((r) => ({ result: r.outcome.result, rounds: r.outcome.roundsResolved, chars: JSON.stringify(r).length })), heroSaveMentionsReport: /battle ?report|rounds":\[\{"n"/i.test(heroRaw), keys: Object.keys(localStorage).filter((k) => /report/i.test(k)) }; });
  // a reload keeps them, and the share row is still offered
  await p.reload(); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  const afterReload = await p.evaluate(async () => { const BR = await import('./js/battlereport.js'); return BR.loadReports().length; });
  log.push({ tag, defeatRow, sheet, exp, store, afterReload });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1));
await b.close();
