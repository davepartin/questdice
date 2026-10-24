// usage: ROOT=<repo root> OUT=<dir> node shoot.mjs   (serves ROOT over http so the ES-module imports of js/ work)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const root = process.env.ROOT || '/workspace/questdice', out = process.env.OUT || 'png', port = process.env.PORT || 8765;
const srv = spawn('python3', ['-m', 'http.server', port, '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const base = `http://localhost:${port}/docs/team/mockups/cards/`; const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const shot = async (url, file, vp, full) => { const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + url); await p.waitForSelector('body[data-ready]', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${file}`, fullPage: !!full }); if (errs.length) console.log(file, errs); await p.close(); };
await shot('card.html?id=dagger&metal=1&size=6', 'card-dagger_390x664.png', { width: 390, height: 664 });
await shot('card.html?id=dagger&metal=1&size=6', 'card-dagger_375x548.png', { width: 375, height: 548 });
await shot('card.html?kind=objective&id=nopotion', 'card-nopotion_390x664.png', { width: 390, height: 664 });
await shot('gallery.html', 'gallery.png', { width: 1200, height: 900 }, true);
await b.close(); srv.kill(); console.log('done');
