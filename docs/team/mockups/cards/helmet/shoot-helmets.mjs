// node shoot-helmets.mjs -> /workspace/card-previews-diceboard-v2/helmet-comparison.jpg
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-diceboard-v2'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8783', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1.5 }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8783/docs/team/mockups/cards/helmet/helmets.html', { waitUntil: 'commit' }); await p.waitForSelector('body[data-sheet]', { timeout: 600000 });
await p.waitForTimeout(500); await p.screenshot({ path: `${out}/helmet-comparison.jpg`, type: 'jpeg', quality: 84, fullPage: true });
await b.close(); srv.kill();
