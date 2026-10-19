// Secret objectives at a table (docs/SECRET_OBJECTIVES.md): the Envelope on one phone, then the Reveal on the victory screen.
//   node dev/serve.mjs 8135 ; node dev/envelope.mjs        (OFFER=1 looks for a table where this phone is offered a bribe)
import { chromium } from 'playwright-core';
import { createTable, joinTable, command, playerView, saveTable } from '../js/table.js';
import * as E from '../js/engine.js';
const OUT = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const viewFor = (t, id) => ({ ...playerView(t, id), code: t.code, state: saveTable(t), seq: t.seq });
function setUp(seed) {
  const table = createTable({ code: 'ENVL', seed, name: 'Ash Company' });
  const ps = [['WizKid', 'wizard'], ['Smalls', 'dwarf'], ['Ada', 'knight']].map(([name, cls], i) => joinTable(table, { name, cls, token: `tok${i}aaaa` }).player);
  for (const p of ps) command(table, p.id, { type: 'ready', name: p.name, cls: p.cls });
  command(table, ps[0].id, { type: 'start' });
  const road = playerView(table, ps[0].id).road; command(table, ps[1].id, { type: 'choose', id: road.choices[0].id });
  for (const p of ps) command(table, p.id, { type: 'onward' });
  table.phase = 'board';
  command(table, ps[0].id, { type: 'quest', id: E.questsFor(table.company.members[0])[0].id });
  return { table, ps };
}
let seed = 100; let T;
for (; seed < 400; seed++) { T = setUp(seed); const c = T.table.envelope?.cards?.WizKid; if (!process.env.OFFER || c?.mode === 'offer') break; }
const { table, ps } = T; console.log('seed', seed, 'phase', table.phase, 'cards', JSON.stringify(Object.fromEntries(Object.entries(table.envelope.cards).map(([k, v]) => [k, v.id + (v.mode ? `/${v.mode}` : '')]))));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.waitForTimeout(2000);
// the server stands in for the table: every command this phone sends is played on our copy and the new view comes back
await p.exposeFunction('qdSend', (cmd) => { const r = command(table, ps[0].id, cmd); return { ok: r.ok, error: r.error, view: viewFor(table, ps[0].id) }; });
await p.evaluate((v) => window.QD.online.openTable(v), viewFor(table, ps[0].id));
await p.waitForTimeout(1500);
const side = () => p.evaluate(() => (document.querySelector('.sx-side')?.textContent || '').replace(/\s+/g, ' ').slice(0, 400));
console.log('ENVELOPE ->', await side());
const to = (sel) => p.evaluate((sel) => { const s = document.querySelector('.sx-side'); const e = document.querySelector(sel); if (s && e) s.scrollTop = e.offsetTop - 90; window.QD.world.stage.step?.(1); }, sel);
await to('.env-card'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/env_card.png` });
await to('.env-cover'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/env_btns.png` });
// this phone answers (the button), the others answer on the table
command(table, ps[0].id, { type: 'envelope', accept: true });
await p.evaluate((v) => { window.QD.session.adopt(v, 'test'); window.QD.online.show(); }, viewFor(table, ps[0].id));
await p.waitForTimeout(800); await to('.env-cover');
await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/env_wait.png` }); console.log('WAIT ->', (await side()).slice(-160));
command(table, ps[1].id, { type: 'envelope', accept: true }); command(table, ps[2].id, { type: 'envelope' }); console.log('phase', table.phase);
for (let i = 0; i < 80 && table.phase === 'battle'; i++) for (const q of ps) { const f = table.battle?.fighters.find((x) => x.hero === q.hero); if (!f || f.hp <= 0 || f.locked) continue; command(table, q.id, { type: 'roll' }); command(table, q.id, { type: 'lock', target: 0, straight: 'atk' }); }
console.log('after battle', table.phase, JSON.stringify(table.reveal?.lines?.map((l) => l.line), null, 1));
await p.evaluate((v) => { window.QD.session.adopt(v, 'test'); window.QD.online.show(); }, viewFor(table, ps[0].id));
await p.waitForTimeout(1500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => /^Onward|Continue|Close/.test(e.textContent.trim()) && e.closest('.brag, .bb, [class*=brag]'))?.click()); await p.waitForTimeout(600); await to('.sx-reveal');
await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/env_reveal.png` });
await b.close();
