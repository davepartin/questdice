// Phone shots of the two-hero campaign picker, hero setup, and Rival Duo prologue.
//   node dev/serve.mjs 8135
//   node dev/duo-campaigns.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const W = 390; const H = 660;
const out = 'docs/ingame';
fs.mkdirSync(out, { recursive: true });

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/google/chrome/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
const problems = [];
p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(`console ${m.text().slice(0, 200)}`); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low');
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => {
  const st = window.QD.world.stage;
  for (let i = 0; i < Math.max(1, Math.round(s * 15)); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); }
}, s);
const shot = async (name) => {
  await pump(1.2);
  await p.waitForTimeout(200);
  await p.evaluate(() => window.QD.world.stage.step(1));
  const file = `${out}/${name}.png`;
  await p.screenshot({ path: file });
  console.log(name, await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 180)));
  return file;
};

await pump(2);
await p.evaluate(() => window.QD.showStories());
await shot('stories_picker');

await p.evaluate(() => window.QD.showCreate('rivalduo'));
await p.evaluate(() => [...document.querySelectorAll('.sx-rail button, .sx-classinfo, [aria-label="Class"] button')].find((e) => /Wizard/i.test(e.textContent || e.getAttribute('aria-label') || ''))?.click());
await shot('rivalduo_setup');

await p.evaluate(async () => {
  const { E, adopt, showRoadOrBoard } = window.QD;
  const SV = await import('/js/save.js');
  const co = E.newCompany({
    name: 'Ada & Bea',
    roster: [{ name: 'Ada', cls: 'wizard' }, { name: 'Bea', cls: 'dwarf' }],
    seed: 18,
    pack: 'rivalduo',
  });
  for (const h of co.members) { try { await SV.createSave(h, 'pass123'); } catch { /* already saved */ } }
  adopt(co);
  showRoadOrBoard();
});
await pump(2);
await shot('rivalduo_prologue');

await p.evaluate(() => window.QD.showCreate('ballad'));
await p.evaluate(() => [...document.querySelectorAll('[aria-label="Class"] button, .sx-rail button')].find((e) => /Knight/i.test(e.textContent || e.getAttribute('aria-label') || ''))?.click());
await shot('ballad_setup');

if (problems.length) console.log('PROBLEMS:\n' + problems.join('\n'));
else console.log('no problems');
await b.close();
