// node shoot-v3.mjs -> /workspace/card-previews-magic-v3/magic-after-*.jpg (Dave's 3 tweaks on Claude's live tile panel)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-magic-v3'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8797', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [q, n, h] of [['', 'arcbolt', 844], ['?low=1', 'lowmagic', 844], ['', 'arcbolt', 664]]) {
  const p = await b.newPage({ viewport: { width: 390, height: h }, deviceScaleFactor: 2 });
  await p.goto(`http://localhost:8797/docs/team/mockups/cards/magic/magic-v3.html${q}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/magic-after-${n}_390x${h}.jpg`, type: 'jpeg', quality: 86 }); await p.close();
}
await b.close(); srv.kill();
