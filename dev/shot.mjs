// Screenshot tool for the viewer and for the game itself.
//
//   node dev/shot.mjs --url "http://localhost:8123/dev/viewer.html?m=gfx/demo/materials.js" --out /tmp/a.png \
//        [--w 1280] [--h 720] [--advance 1.0] [--dpr 1] [--eval "window.__qd.ctx..."] [--q low|med|high]
//
// Multi-shot sequence (JSON array of steps; each step is any of {advance, eval, wait, click, shot, size}):
//   node dev/shot.mjs --url ... --seq '[{"advance":0.3,"shot":"a.png"},{"eval":"...","advance":0.2,"shot":"b.png"}]'
//
// The page runs in `manual` time (?shot=1 is added), so the picture is deterministic: nothing moves until
// you advance(). window.__qd.stage.advance(sec) steps simulation + renders. Prints console errors.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
if (!args.url) { console.error('need --url'); process.exit(2); }
const W = Number(args.w || 1280); const H = Number(args.h || 720);
const url = new URL(args.url);
if (!url.searchParams.has('shot')) url.searchParams.set('shot', '1');
if (args.q) url.searchParams.set('q', args.q);
if (args.dpr) url.searchParams.set('dpr', args.dpr);

const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(args.dpr || 1) });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url.toString());
await page.waitForFunction(() => window.__qd?.ready, null, { timeout: Number(args.timeout || 120000) });
const err = await page.evaluate(() => window.__qd.error);
if (err) { console.error('DEMO ERROR\n' + err); }

let steps;
if (args.seq) steps = JSON.parse(args.seq);
else steps = [{ eval: args.eval, advance: args.advance ? Number(args.advance) : 0.5, shot: args.out || 'shot.png' }];
for (const s of steps) {
  if (s.size) { await page.setViewportSize({ width: s.size[0], height: s.size[1] }); await page.waitForTimeout(100); }
  if (s.eval) { const r = await page.evaluate(`(async()=>{ ${s.eval} })()`); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); }
  if (s.click) { await page.click(s.click); }
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.advance) await page.evaluate((a) => window.__qd.stage.advance(a), s.advance);
  else await page.evaluate(() => window.__qd.stage.step(1));
  if (s.shot) { fs.mkdirSync(path.dirname(path.resolve(s.shot)), { recursive: true }); await page.screenshot({ path: s.shot }); console.log('wrote', s.shot); }
}
if (logs.length) console.log(logs.slice(0, 12).join('\n'));
await browser.close();
