// The monsters' move dice on their plaques (Dave, 3 Nov 2026): each living monster shows the face it rolled for this round's move; tapping the die
// opens the monster cards with that monster on top (to choose before the roll; to read, with Close, after it). Real touchscreen taps.
//   CHROME=/path/to/chrome node dev/monster-dice.mjs [out=shots/monster-dice] [port=8209]      (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/monster-dice'; const port = +(process.argv[3] || 8209); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; let bad = 0; const errs = [];
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 5 }); hh.dice = null; hh.level = 9; hh.campaign.step = 6; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin', 'skeleton', 'wolf'], kind: 'boss', step: 6 }); }, 'DiceWatcher');
let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
const ready = async () => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => { const b = document.querySelector('.mnc-pick'); return !b || !b.disabled; })) return; await p.waitForTimeout(150); } }; // the move dice roll for two seconds first
const tapEl = async (sel) => { const r = await p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel); if (r) await p.touchscreen.tap(r.x, r.y); return !!r; };
await ready(); await tapEl('.mnc-pick'); await pump(1); await p.waitForTimeout(400); // choose the first monster
const dice = () => p.evaluate(() => { const B = window.QD.B3.battleState; return B.b.enemies.filter((e) => e.hp > 0).map((e) => { const d = document.querySelector(`.fb-slot.foe[data-uid="${e.uid}"] .fb-mdie`); return { uid: e.uid, face: e.face, move: e.intent?.n, shown: d && !d.hidden ? (d.classList.contains('off') ? 0 : d.querySelectorAll('i.p').length) : -1 }; }); });
let ds = await dice();
check('every living monster shows its move die, with as many pips as the face it rolled', ds.length === 3 && ds.every((d) => d.shown === (d.face || 0)), JSON.stringify(ds));
await p.screenshot({ path: `${OUT}/1-dice-on-plaques.png` });
// tap the third monster's die: the cards open with it on top, to choose
const third = ds[2].uid; await tapEl(`.fb-slot.foe[data-uid="${third}"] .fb-mdie`); await p.waitForTimeout(500); await ready();
let st = await p.evaluate(() => ({ veil: !!document.querySelector('.mnc-veil'), top: document.querySelector('.mnc-card.top')?.dataset.uid, btn: document.querySelector('.mnc-pick')?.textContent, rolled: (document.querySelector('.mnc-card.top .mnc-roll-result b')?.textContent || '').replace(/\D/g, '') }));
check('tapping a die opens the cards with that monster on top (before the roll: Attack)', st.veil && st.top === third && st.btn === 'Attack' && st.rolled === String(ds[2].face || ''), JSON.stringify(st));
await p.screenshot({ path: `${OUT}/2-tapped-die.png` });
await tapEl('.mnc-pick'); await pump(1); await p.waitForTimeout(300);
const t = await p.evaluate(() => { const B = window.QD.B3.battleState; return B.b.enemies[B.target]?.uid; }); check('Attack there makes it the target', t === third, t);
// roll, then tap a die: read-only, Close leaves the target alone
await tapEl('#b3-roll'); for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(200); if (await p.evaluate(() => !window.QD.B3.battleState.busy && window.QD.B3.battleState.b.phase === 'shape')) break; }
await tapEl(`.fb-slot.foe[data-uid="${ds[0].uid}"] .fb-mdie`); await p.waitForTimeout(500); await ready();
st = await p.evaluate(() => ({ veil: !!document.querySelector('.mnc-veil'), top: document.querySelector('.mnc-card.top')?.dataset.uid, btn: document.querySelector('.mnc-pick')?.textContent, head: document.querySelector('.mnc-head')?.textContent }));
check('after the roll a die opens the cards to read (Close)', st.veil && st.top === ds[0].uid && st.btn === 'Close', JSON.stringify(st));
await p.screenshot({ path: `${OUT}/3-after-roll-read.png` });
await tapEl('.mnc-pick'); await pump(0.5);
const t2 = await p.evaluate(() => { const B = window.QD.B3.battleState; return { tuid: B.b.enemies[B.target]?.uid, veil: !!document.querySelector('.mnc-veil') }; });
check('Close shuts the cards and keeps the target', !t2.veil && t2.tuid === third, JSON.stringify(t2));
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); process.exit(bad ? 1 : 0);
