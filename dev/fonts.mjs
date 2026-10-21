// Font audit (Dave, Oct 2026: "the fonts are getting kind of too many... do a font review and clean this up"). For each screen, every
// visible text element's rendered font (first family that loaded) is counted, with examples, and a screenshot is taken.
//   node dev/fonts.mjs [out=shots/fonts]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/fonts'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => document.fonts.ready);
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const audit = (name) => p.evaluate(async (name) => {
  await document.fonts.ready;
  const seen = {};
  const loaded = (fam) => { const f = fam.trim().replace(/^["']|["']$/g, ''); if (/^(serif|sans-serif|system-ui|ui-sans-serif|ui-monospace|monospace|inherit)$/i.test(f)) return f; return document.fonts.check(`16px "${f}"`) && [...document.fonts].some((x) => x.family.replace(/["']/g, '') === f && x.status === 'loaded') ? f : null; };
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const fams = cs.fontFamily.split(','); const used = fams[0].trim().replace(/^["']|["']$/g, ''); void loaded; // the font the page asks for (this test browser cannot fetch web fonts)
    const key = `${used} ${cs.fontWeight}${cs.fontStyle === 'italic' ? ' italic' : ''}`;
    (seen[key] ||= { n: 0, ex: [] }).n++; const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 24); if (seen[key].ex.length < 4 && t && !seen[key].ex.includes(t)) seen[key].ex.push(t);
  }
  return { name, seen };
}, name);
const report = []; const shot = async (name) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${name}.png` }); report.push(await audit(name)); };
await shot('title');
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 7; h.gold = 167; h.campaign.act = 2; S.hero = h; S.company = { members: [h] }; S.seat = 0; showCamp(); });
await p.waitForTimeout(1500); await shot('camp-dice');
for (const tab of ['Powers', 'Gear', 'Supplies', 'Hero']) { await p.evaluate((t) => [...document.querySelectorAll('.cw-nav button')].find((x) => x.textContent.trim() === t)?.click(), tab); await p.waitForTimeout(700); await shot(`camp-${tab.toLowerCase()}`); }
await p.evaluate(() => { const { S, E, showBoard } = window.QD; showBoard(); }); await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['ogre', 'goblin'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); }
await shot('battle-start');
for (let i = 0; i < 10 && await p.evaluate(() => window.QD.S.battle?.phase === 'reset'); i++) { await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(2); }
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await shot('battle-roll');
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Magic powers/i.test(x.textContent))?.click()); await pump(1);
await p.evaluate(() => document.querySelector('.pw-medal.at-A')?.click()); await pump(0.5);
await shot('battle-magic');
const all = {};
for (const r of report) { console.log(`\n== ${r.name}`); for (const [k, v] of Object.entries(r.seen).sort((a, c) => c[1].n - a[1].n)) { console.log(`  ${String(v.n).padStart(3)}  ${k.padEnd(34)} ${v.ex.join(' | ')}`); const fam = k.replace(/ \d+( italic)?$/, ''); all[fam] = (all[fam] || 0) + v.n; } }
console.log('\n== families on these screens'); for (const [k, v] of Object.entries(all).sort((a, c) => c[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
