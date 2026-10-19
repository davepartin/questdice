// A table game's road, the way Dave's Rival Duo game met it: the company picks a road choice with a test roll (now before
// the elite, step 5). The roll and the result must come before the next place's story page, and that page's Continue must go on.
//   node dev/serve.mjs 8135 ; node dev/roadbeat.mjs
import { chromium } from 'playwright-core';
import { createTable, joinTable, command, playerView, saveTable } from '../js/table.js';
const viewFor = (t, id) => ({ ...playerView(t, id), code: t.code, state: saveTable(t), seq: t.seq });
import * as R from '../js/roads.js';
const table = createTable({ code: 'RDTE', seed: 777, name: 'Gerald Recovery', pack: 'rivalduo' });
const ps = [['Ada', 'wizard'], ['Smalls', 'dwarf']].map(([name, cls], i) => joinTable(table, { name, cls, token: `tok${i}aaaa` }).player);
for (const p of ps) command(table, p.id, { type: 'ready', name: p.name, cls: p.cls });
console.log('start', command(table, ps[0].id, { type: 'start' }).ok, 'phase', table.phase);
// walk to the road before the elite (the dice test)
table.company.campaign.step = 5; table.company.campaign.wins = 4; table.phase = 'road'; table.company.campaign.road = null;
for (const m of table.company.members) { m.campaign.road = null; }
const ev = R.ensureRoad(table.company.members[0], table.company.members); table.company.campaign.road = table.company.members[0].campaign.road;
const pick = ev.choices.find((c) => c.test && c.ok) || ev.choices.find((c) => c.ok);
console.log('road', ev.title, '| choosing', pick.label, pick.test ? '(test roll)' : '');
const r = command(table, ps[0].id, { type: 'choose', id: pick.id }); console.log('choose ok', r.ok, r.error || '', '| trial?', !!table.roadResult?.trial, '| phase', table.phase);
const me = Number(process.env.PHONE ?? 1); // PHONE=0 watches from the other hero's phone
const view = viewFor(table, ps[me].id);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const screen = () => p.evaluate(() => (document.querySelector('.sx-storybeat') ? 'STORY: ' : 'SCREEN: ') + (document.querySelector('.sx-side, #app')?.textContent || '').replace(/\s+/g, ' ').slice(0, 110));
await p.waitForTimeout(2500);
await p.evaluate((v) => window.QD.online.openTable(v), view);
console.log('session phase', await p.evaluate(() => window.QD.session.current()?.phase));
await p.waitForTimeout(1500);
await p.evaluate(() => [...document.querySelectorAll('.sx-storybeat .sx-cta button')].find((e) => /Continue/.test(e.textContent))?.click()); await p.waitForTimeout(1500); // the elite's story page first
console.log('1 on the road  ->', await screen());
await p.screenshot({ path: '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad/rb_road.png' });
if (process.env.HOWTO) { await p.evaluate(() => document.querySelector('.sx-saved')?.click()); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad/rb_howto.png' }); await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => /Got it/.test(e.textContent))?.click()); }
console.log('  roll overlay:', await p.evaluate(() => { const l = document.querySelector('.t3, .tr-layer'); return l ? `${l.querySelector('.t3-head p, .tr-who')?.textContent} [${l.querySelector('.t3-go, .tr-go')?.textContent}]` : 'none'; }), '| this phone is', view.you?.name, '| roller', table.roadResult?.trial?.who);
// nobody taps the roll here: the other phone moves the table on (Onward), and this phone's roll must close by itself
await p.waitForTimeout(6000); console.log('2 after roll   ->', await screen());
command(table, ps[0].id, { type: 'onward' }); const o = command(table, ps[1].id, { type: 'onward' }); console.log('onward', o.ok, o.error || '', 'phase', table.phase);
await p.evaluate((v) => { window.QD.session.adopt(v, 'test'); window.QD.online.show(); }, viewFor(table, ps[me].id));
await p.waitForTimeout(1200); console.log('3 board        ->', await screen());
console.log('  roll overlay left over:', await p.evaluate(() => !!document.querySelector('.t3, .tr-layer')));
await p.evaluate(() => [...document.querySelectorAll('.sx-cta .sx-btn')].find((e) => /Continue/.test(e.textContent))?.click());
await p.waitForTimeout(1200); console.log('4 after Continue ->', await screen());
await b.close();
