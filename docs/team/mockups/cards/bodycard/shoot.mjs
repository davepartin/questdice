// renders the body card mockup -> /workspace/card-previews-bodycard-v1 (fresh, mixed, out-of-order, peel strip) at 390x844 and 375x548
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process'; import { mkdirSync, statSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-bodycard-v1'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8812', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const U = 'http://localhost:8812/docs/team/mockups/cards/bodycard/bodycard.html';
for (const [w, h] of [[390, 844], [375, 548]]) {
  const go = async (q) => { const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(U + q); await p.waitForSelector('body[data-ready]', { timeout: 300000 }); await p.waitForTimeout(500); return [p, errs]; };
  const sz = `${w}x${h}`; const shot = (p, n) => p.screenshot({ path: `${out}/${n}_${sz}.jpg`, type: 'jpeg', quality: 85 });
  let [p, errs] = await go('?cls=knight'); await shot(p, 'fresh-knight');
  const fit = await p.evaluate(() => { const r = document.querySelector('.bc').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  // out of order: tap Head d8 while d6 is still covered
  await p.click('.cell[data-k="N"][data-size="8"] .cov'); await p.waitForTimeout(250); const msg = await p.textContent('.toast'); await shot(p, 'out-of-order');
  await p.waitForTimeout(1600);
  const clip = await p.evaluate(() => { const c = document.querySelector('.cell[data-k="E"][data-size="6"]').getBoundingClientRect(); return { x: c.left - 10, y: c.top - 10, width: c.width * 2.4, height: c.height + 20 }; });
  console.log(sz, 'fits', fit, 'toast:', msg, errs.length ? 'ERR ' + errs : 'no errors'); await p.close();
  [p, errs] = await go('?cls=knight&state=4,6,8,6'); await shot(p, 'mixed'); 
  const cov = await p.evaluate(() => [...document.querySelectorAll('.cov')].map((c) => c.closest('.cell').dataset.k + c.dataset.step + ':' + c.textContent).join(' '));
  console.log(' mixed covers', cov, errs.length ? 'ERR' : ''); await p.close();
  [p] = await go('?cls=ranger'); await shot(p, 'fresh-ranger'); await p.close();
  // strip frames side by side with a per-frame clip around the cell (animation travels right)
  const p2 = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await p2.goto(U + '?cls=knight'); await p2.waitForSelector('body[data-ready]'); await p2.waitForTimeout(400);
  const frames = []; const t0 = [0, 110, 220, 340, 800]; await p2.click('.cell[data-k="E"][data-size="6"] .cov'); let last = 0;
  for (const t of t0) { await p2.waitForTimeout(t - last); last = t; const f = `${out}/_f${frames.length}.png`; await p2.screenshot({ path: f, clip }); frames.push(f); }
  await p2.close();
  execFileSync('python3', ['-c', `import sys;from PIL import Image,ImageDraw
fs=[Image.open(f).convert('RGB') for f in sys.argv[2:]];W=sum(f.width for f in fs)+12*(len(fs)+1);H=max(f.height for f in fs)+24
o=Image.new('RGB',(W,H),(20,16,12));x=12
for f in fs: o.paste(f,(x,12)); x+=f.width+12
o.save(sys.argv[1],quality=86)`, `${out}/peel-strip_${sz}.jpg`, ...frames]);
}
execFileSync('sh', ['-c', `rm -f ${out}/_*.png`]);
await b.close(); srv.kill();
for (const f of execFileSync('ls', [out]).toString().trim().split('\n')) console.log(f, (statSync(`${out}/${f}`).size / 1024 | 0) + 'KB');
