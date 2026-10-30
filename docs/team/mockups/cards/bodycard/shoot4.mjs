// rev 4 renders -> /workspace/card-previews-bodycard-v4 (body card 390x844 + 375x548; talent options 390x844)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync, statSync, readdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-bodycard-v4'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8814', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const U = 'http://localhost:8814/docs/team/mockups/cards/bodycard/';
const shots = [
  ['body-strength-default', 'bodycard.html?rev=2&cls=knight&state=4,6,8,6', 1], ['body-strength-ranger-fresh', 'bodycard.html?rev=2&cls=ranger', 1],
  ['body-alt-gear', 'bodycard.html?rev=2&title=GEAR&cls=knight&state=4,6,8,6', 1],
];
for (const [n, q, both] of shots) for (const [w, h] of both ? [[390, 844], [375, 548]] : [[390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + q); await p.waitForSelector('body[data-ready]', { timeout: 300000 }); await p.waitForTimeout(500);
  const T = await p.evaluate(() => { const t = globalThis.__title; if (!t) return null; const r = document.querySelector('.bc .fr').getBoundingClientRect(), k = r.width / t.W;
    const px = (o) => Object.fromEntries(Object.entries(o).map(([a, v]) => [a, v * k]));
    const P = t.plaque, I = t.ink, pc = { x: (P.x + P.w / 2) * k, y: ((P.bandTop + P.bandBot) / 2) * k }, ic = { x: (I.l + I.r) / 2 * k, y: (I.t + I.b) / 2 * k };
    return { dx: +(ic.x - pc.x).toFixed(2), dy: +(ic.y - pc.y).toFixed(2), band: [P.bandTop - P.y, P.bandBot - P.y], scale: +k.toFixed(3) }; });
  if (T) console.log('  title centre offset (CSS px) dx', T.dx, 'dy', T.dy, 'band', T.band, Math.abs(T.dx) <= 1 && Math.abs(T.dy) <= 1 ? 'PASS' : 'FAIL');
  const fit = await p.evaluate(() => { const r = document.querySelector('.bc').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  await p.screenshot({ path: `${out}/${n}_${w}x${h}.jpg`, type: 'jpeg', quality: 85 });
  if (n === 'talent-B-one-mixed') { await p.click('.slot.empty[data-v="6"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/talent-B-choose-symbol_${w}x${h}.jpg`, type: 'jpeg', quality: 85 });
    await p.click('.pick button[data-sym="magic"]'); await p.waitForTimeout(200); await p.click('.cov[data-step="10"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/talent-B-set-and-out-of-order_${w}x${h}.jpg`, type: 'jpeg', quality: 85 }); }
  if (n === 'body-strength-default') { await p.click('.cell[data-k="N"][data-size="8"] .cov'); await p.waitForTimeout(250); console.log('  toast', await p.textContent('.toast')); }
  console.log(n, `${w}x${h}`, 'fits', fit, errs.length ? 'ERR ' + errs : 'ok'); await p.close();
}
await b.close(); srv.kill();
for (const f of readdirSync(out)) console.log(f, (statSync(`${out}/${f}`).size / 1024 | 0) + 'KB');
