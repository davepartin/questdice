// T27 (Nov 2026): the new road fights (Acts I and II steps 8-9, Act III steps 2, 6, 9) draw on a phone. Starts each new locked fight (Glarefang + Shieldbearer, Big Muriel + Frostwhelp,
// Vexmor + Shieldbearer) at act 3, waits for the monster card picker, checks every miniature picture loaded, and screenshots it.
//   CHROME=/path/to/chrome node dev/road-check.mjs [out=shots/act3-road] [port=8199]      (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/act3-road'; const port = +(process.argv[3] || 8199); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; let bad = 0; const errs = [];
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const FIGHTS = { '1.8': ['bonfire', 'raincloud'], '1.9': ['tuskraider', 'goblin', 'goblin'], '2.8': ['wisp', 'skeleton'], '2.9': ['gargoyle', 'nightblade'],
  '1.5 oak': ['treant'], '1.5 bear': ['direbear'], '2.5 snuffer': ['lampsnuffer'], '2.5 rider': ['barrowrider'],
  '3.2': ['basilisk', 'shieldbearer'], '3.6': ['yeti', 'frostwhelp'], '3.9': ['stormtyrant', 'shieldbearer'] };
for (const [key, foes] of Object.entries(FIGHTS)) {
  const [act, step] = key.split(' ')[0].split('.').map(Number);
  const p = await br.newPage({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, foes, step, act]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 7 }); hh.dice = null; hh.level = [0, 4, 8, 11][act]; hh.campaign.act = act; hh.campaign.step = step; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: foes, step }); }, ['Road' + act + step, foes, step, act]);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => { const no = [...document.querySelectorAll('button')].find((x) => /^decline$/i.test(x.textContent.trim())); if (no) no.click(); return !!document.querySelector('.mnc-veil'); }); }
  check(`${key} (${foes.join(' + ')}): the monster cards open`, up);
  await p.waitForTimeout(2500);
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => /miniatures\//.test(i.src)).map((i) => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
  for (const id of foes) check(`${key}: ${id} picture loaded`, imgs.some((i) => i.src.startsWith(id + '.') && i.ok), JSON.stringify(imgs.filter((i) => !i.ok)));
  // every move name on every card, lit or not (light each one in turn): its name never runs into its dice numbers
  const clash = await p.evaluate(() => { const out = []; for (const f of document.querySelectorAll('.mnc-face')) { const was = f.classList.contains('on'); f.classList.add('on'); const b = f.querySelector('b'); let d = f.querySelector('.mnc-dice'); const temp = !d; if (temp) { d = document.createElement('span'); d.className = 'mnc-dice'; d.textContent = '5+3d12'; f.querySelector('.mnc-face-main').append(d); }
    if (b && d) { const rb = b.getBoundingClientRect(); const rd = d.getBoundingClientRect(); const textRight = rb.left + b.scrollWidth; if ((rb.right > rd.left + 1 || textRight > rd.left + 1) && rb.bottom > rd.top + 1 && rd.bottom > rb.top + 1) out.push(b.textContent); } if (temp) d.remove(); if (!was) f.classList.remove('on'); } return out; });
  check(`${key}: no move name runs into its dice`, clash.length === 0, clash.join(', '));
  await p.screenshot({ path: `${OUT}/road-${key.replace(' ', '-')}.png` }); await p.close();
}
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
