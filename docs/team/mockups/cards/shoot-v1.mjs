// Renders chittray.html + shop.html at 390x844 (Crockpot / Grok Bot, 26 Oct 2026)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync, readdirSync } from 'node:fs'; import os from 'node:os';
const root = new URL('../../../../', import.meta.url).pathname;
const exe = `${os.homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const srv = spawn('python3', ['-m', 'http.server', '8817', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const jobs = (process.env.ONLY || 'chittray,shop').split(',');
const pages = { chittray: ['chittray.html?state=tray', '/workspace/card-previews-chittray-v1', 'chittray'], shop: ['shop.html', '/workspace/card-previews-shop-v1', 'shop'], shop2: ['shop.html?seed=5', '/workspace/card-previews-shop-v2', 'shop'], diamond: ['diamond.html', '/workspace/card-previews-shop-v2', 'diamond-card'] };
for (const j of jobs) { const [u, out, name] = pages[j]; mkdirSync(out, { recursive: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:8817/docs/team/mockups/cards/${u}`); await p.waitForSelector('body[data-done]', { timeout: 15000 }).catch(() => errs.push('timeout')); await p.waitForTimeout(400);
  const over = await p.evaluate(() => [...document.querySelectorAll('[data-chk]')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 0.5; }).map((e) => e.className));
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: `${out}/${name}_390x844.png` }); if (H > 844) await p.screenshot({ path: `${out}/${name}_390x844_full.png`, fullPage: true });
  console.log(j, 'height', H, 'overflowX', JSON.stringify(over), errs.join(' | ') || 'ok'); await p.close(); }
await b.close(); srv.kill();
