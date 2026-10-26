// v3 (Director 25 Oct): current hero data, real Talent die, readable labels, short phones. -> /workspace/card-previews-director-equip
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-director-equip'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8799', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const runs = [['ranger', 375, 548, ['talent', 6]], ['ranger', 390, 664, ['weapon-arrows', 0]], ['knight', 375, 548, ['talent', 6]], ['wizard', 390, 664, null]];
for (const [cls, w, h, card] of runs) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:8799/docs/team/mockups/cards/diceboard/diceboard.html?cls=${cls}`, { waitUntil: 'commit' }); await p.waitForSelector('body[data-ready]', { timeout: 600000 });
  const n = `board-${cls}_${w}x${h}`; await p.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 86 });
  const chk = await p.evaluate(() => { const nm = [...document.querySelectorAll('.nm')]; const r = nm.map((e) => e.getBoundingClientRect());
    const overlap = r.some((a, i) => r.some((c, j) => j > i && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom));
    const clip = [...document.querySelectorAll('.die,.nm,.lockd')].some((e) => { const q = e.getBoundingClientRect(); return q.left < 0 || q.right > innerWidth || q.top < 0 || q.bottom > innerHeight; });
    return { labels: nm.map((e) => e.textContent).join(' | '), minFontPx: Math.min(...nm.map((e) => parseFloat(getComputedStyle(e).fontSize))).toFixed(1), overlap, clip, scroll: document.documentElement.scrollHeight > innerHeight }; });
  console.log(n, JSON.stringify(chk), errs.length ? 'ERR ' + errs.join(';') : 'no errors');
  if (card) { await p.evaluate((i) => lift(i), card[1]); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/card-${card[0]}-${cls}_${w}x${h}.jpg`, type: 'jpeg', quality: 86 });
    console.log(' card', card[0], await p.evaluate(() => { const c = document.querySelector('#big').getBoundingClientRect(), a = document.querySelector('#acts').getBoundingClientRect(); return { cardBottom: Math.round(c.bottom), actsTop: Math.round(a.top), vh: innerHeight }; })); }
  await p.close();
}
await b.close(); srv.kill();
