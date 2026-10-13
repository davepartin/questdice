// Party battle board: waiting zone, lock-in pairing, and a paced replay.
//   node dev/partyboard.mjs [outdir]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const out = process.argv[2] || '/opt/cursor/artifacts/screenshots';
mkdirSync(out, { recursive: true });

const srv = spawn('node', ['dev/serve.mjs', '8135'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((res) => srv.stdout.on('data', (d) => { if (String(d).includes('http://')) res(); }));

const chrome = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/google/chrome/chrome', '/usr/local/bin/google-chrome'].find((p) => existsSync(p));
const b = await chromium.launch({ executablePath: chrome, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, hasTouch: true });
const problems = [];
p.on('pageerror', (e) => { problems.push(e.message); console.log('ERR', e.message); });
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 240)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch { /* */ } });
await p.goto('http://localhost:8135/?debug&manual&q=low');
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });

const pump = (s) => p.evaluate(async (s) => {
  const st = window.QD.world.stage;
  const n = Math.max(1, Math.round(s * 15));
  for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); }
}, s);
const clipFb = async () => {
  await p.evaluate(() => window.QD.world.stage.step(1));
  const box = await p.locator('.fb').boundingBox();
  return box ? { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height } : null;
};
const shot = async (name) => {
  const clip = await clipFb();
  const path = `${out}/${name}.png`;
  if (clip) await p.screenshot({ path, clip });
  else await p.screenshot({ path });
  console.log('shot', name);
};

await p.evaluate(() => {
  const { S, E, showBoard } = window.QD;
  const list = ['knight', 'ranger', 'wizard', 'dwarf'].map((c, i) => E.newHero({ name: ['Ada', 'Bea', 'Cy', 'Di'][i], cls: c, seed: 11 + i }));
  S.hero = list[0]; S.company = { members: list }; showBoard();
});
await pump(1);
await p.evaluate(() => {
  const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'wolf', 'skeleton'], kind: 'battle' };
  window.QD.startQuest(q);
});
for (let i = 0; i < 400; i++) {
  if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break;
  await pump(0.5);
}
await pump(2);
await shot('party_waiting_zone');

const info = (sel) => p.evaluate((s) => {
  const slots = [...document.querySelectorAll(s)].map((el) => ({
    name: el.querySelector('.fb-name')?.textContent, wait: el.classList.contains('wait'), locked: el.classList.contains('locked'),
    scale: getComputedStyle(el.querySelector('.fb-pc')).transform,
  }));
  const letters = [...document.querySelectorAll('.fb-letter, .fb-pc > .fb-tag')].map((el) => el.textContent.trim());
  return { slots, letters, links: document.querySelectorAll('.fb-links line').length, party: document.querySelector('.fb.party')?.dataset.heroes };
}, sel);
console.log('waiting', JSON.stringify(await info('.fb-slot.hero')));

await p.evaluate(() => {
  const B = window.QD.B3.battleState;
  const enemies = B.b.enemies;
  B.b.fighters.forEach((f, i) => { f.locked = i < 2; f.target = i % enemies.length; f.skipped = false; });
  B.fb.setPartyStance(B.b.fighters.map((f, i) => ({
    i, locked: !!f.locked && !f.skipped, uid: f.locked ? enemies[f.target]?.uid : null, down: f.hp <= 0,
  })));
});
await pump(1.2);
await shot('party_locked_pairing');
console.log('paired', JSON.stringify(await info('.fb-slot.hero')));
console.log('links', await p.evaluate(() => document.querySelectorAll('.fb-links line').length));

await p.evaluate(() => {
  const { S, E, B3 } = window.QD;
  const b = S.battle;
  b.fighters.forEach((f, i) => { E.startFighter(b, i); f.target = i % b.enemies.length; f.locked = true; f.skipped = false; });
  const rep = E.resolveParty(b);
  window.__rep = rep;
  B3.devParty(rep);
});
let mid = false;
for (let k = 0; k < 40; k++) {
  await pump(0.5);
  const busy = await p.evaluate(() => window.QD.B3.battleState.busy);
  const acting = await p.evaluate(() => !!document.querySelector('.fb-num, .fb-spark'));
  if (!mid && (k >= 10 || acting)) { await shot('party_mid_replay'); mid = true; }
  if (!busy && k > 6) break;
}
if (!mid) await shot('party_mid_replay');
await p.screenshot({ path: `${out}/party_full_battle.png` });

const extra = await p.evaluate(() => {
  const order = window.__rep?.order?.map((s) => s.kind + ':' + (s.name || s.uid));
  const letters = [...document.querySelectorAll('.fb')].some((el) => /\b[ABCD]\b/.test(el.querySelector('.fb-letter')?.textContent || ''));
  return { order, letters, wait: document.querySelectorAll('.fb-slot.hero.wait').length, locked: document.querySelectorAll('.fb-slot.hero.locked').length };
});
console.log('replay', JSON.stringify(extra));
console.log(problems.join('|') || 'ok');
await b.close();
srv.kill();
