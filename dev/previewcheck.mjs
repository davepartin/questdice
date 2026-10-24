// T10 phone preview: the copy served under /preview/<name>/ keeps its own saves and reports, shows its build, and the report flow works.
//   node dev/previewcheck.mjs <port or https://host>  <path, e.g. /preview/battle-report/>    (serve a checkout that holds the preview folder: node dev/serve.mjs <port>)
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const port = process.argv[2] || 8140; const base = process.argv[3] || '/preview/battle-report/'; const OUT = process.env.OUT || 'docs/ingame/preview'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1');
  if (!localStorage.getItem('questdice.hero.liveknight')) localStorage.setItem('questdice.hero.liveknight', '{"live":"untouched"}'); localStorage.setItem('questdice.battlereports', '[{"id":"live-report"}]'); localStorage.setItem('qd.daily', '{"live":1}'); } catch {}
  window.__shared = []; navigator.canShare = () => true; navigator.share = async (d) => { window.__shared.push({ title: d.title, files: (d.files || []).map((f) => ({ name: f.name, size: f.size })) }); }; });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(/^http/.test(port) ? `${port}${base}?debug&manual&q=low` : `http://localhost:${port}${base}?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const res = {};
res.tag = await p.evaluate(() => document.querySelector('.lab-tag')?.textContent || null);
res.build = await p.evaluate(async () => (await import('./js/battlereport.js')).BUILD);
await p.screenshot({ path: `${OUT}/title.png` });
await p.evaluate(async () => { const { S, E, showBoard } = window.QD; const SV = await import('./js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); await SV.createSave(h, 'pw12'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!window.QD.world.battle && !!document.querySelector('#b3-roll'))) break; await p.evaluate(() => [...document.querySelectorAll('.env-btns button, .sx-envelope button')].find((x) => /decline|continue/i.test(x.innerText))?.click()); await pump(0.5); }
await p.evaluate(() => { const { S, E, B3, showVictory } = window.QD; const bt = S.battle; bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.startRoll(bt); E.resolve(bt, { target: 0 }); B3.stop(); showVictory(); });
await pump(2);
for (let i = 0; i < 14 && !(await p.evaluate(() => !!document.querySelector('.vc-title, .df-title'))); i++) { await p.evaluate(() => [...document.querySelectorAll('.sx-side button, .sx-cta button')].find((x) => /continue|onward|next|go on/i.test(x.innerText))?.click()); await pump(1.5); }
await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/victory.png` });
res.rowText = await p.evaluate(() => document.querySelector('.br-row')?.innerText.replace(/\n+/g, ' | ') || null);
await p.evaluate(() => document.querySelector('.br-open').click()); await pump(0.5); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/sheet.png` });
await p.evaluate(() => [...document.querySelectorAll('.br-actions .btn')].find((x) => /^share$/i.test(x.innerText)).click()); await pump(0.3); res.shared = await p.evaluate(() => window.__shared);
await p.evaluate(() => [...document.querySelectorAll('.br-actions .btn')].find((x) => /^copy$/i.test(x.innerText)).click()); await pump(0.3);
res.clipboard = await p.evaluate(() => navigator.clipboard.readText().then((t) => ({ chars: t.length, head: t.split('\n').slice(0, 2).join(' | ') })));
await p.evaluate(() => [...document.querySelectorAll('.modal-card .btn')].find((x) => /close/i.test(x.innerText)).click()); await pump(0.5);
res.closedSheet = await p.evaluate(() => !document.querySelector('.br-sheet'));
// a first victory asks for spoils (and a perk after a level-up) before "To camp" opens; a defeat shows "Return to camp" at once
await p.evaluate(() => { [...document.querySelectorAll('.sx-loot button')].find((x) => /^take$/i.test(x.innerText.trim()))?.click(); }); await pump(0.5);
await p.evaluate(() => { document.querySelector('.sx-perks .perk-card, .sx-perks button')?.click(); }); await pump(0.5);
await p.evaluate(() => { const s = document.querySelector('.sx-victory .sx-side'); s.scrollTop = s.scrollHeight; }); await pump(0.3); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/victory_bottom.png` });
res.returnToCamp = await p.evaluate(() => { const x = document.querySelector('.sx-cta button'); const r = x?.getBoundingClientRect(); return x ? { text: x.innerText.trim(), disabled: x.disabled, inView: r.top >= 0 && r.bottom <= innerHeight } : null; });
if (res.returnToCamp && !res.returnToCamp.disabled) { await p.evaluate(() => document.querySelector('.sx-cta button').click()); await pump(1.5); res.campReached = await p.evaluate(() => !!document.querySelector('.sx-camp, .camp, [class*=camp]')); }
res.keys = await p.evaluate(() => Object.keys(localStorage).sort());
res.liveUntouched = await p.evaluate(() => ({ hero: localStorage.getItem('questdice.hero.liveknight'), reports: localStorage.getItem('questdice.battlereports'), daily: localStorage.getItem('qd.daily') }));
res.previewReports = await p.evaluate(() => JSON.parse(localStorage.getItem('questdice.preview.battlereports') || '[]').length);
res.cloud = await p.evaluate(async () => { try { const C = await import('./js/cloud.js'); const f = C.cloudAvailable || C.available; return f ? String(f()) : 'no probe'; } catch (e) { return e.message; } });
console.log(JSON.stringify(res, null, 1)); await b.close();
