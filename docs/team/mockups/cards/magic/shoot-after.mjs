// node shoot-after.mjs -> /workspace/card-previews-diceboard-v2/magic-after-*.jpg
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-diceboard-v2'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8785', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
for (const v of ['battle', 'card', 'battle-low', 'camp', 'camp-card']) {
  await p.goto(`http://localhost:8785/docs/team/mockups/cards/magic/magic.html?v=${v}`); await p.waitForSelector('body[data-ready]');
  await p.waitForTimeout(300); await p.screenshot({ path: `${out}/magic-after-${v}_390x844.jpg`, type: 'jpeg', quality: 84 });
}
await b.close(); srv.kill();
