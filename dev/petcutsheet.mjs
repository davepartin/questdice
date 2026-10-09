// The cut pet pictures on a light and a dark background (to spot halos).  node dev/petcutsheet.mjs
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const ids = ['ember', 'bristle', 'turtle', 'bunny', 'owl', 'penny'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 440 } });
const im = (id) => `<img src="data:image/webp;base64,${fs.readFileSync(`assets/pets/${id}.webp`).toString('base64')}" style="height:180px">`;
await p.setContent(`<body style="margin:0"><div style="display:flex;gap:10px;padding:10px;background:#8a8f99">${ids.map(im).join('')}</div><div style="display:flex;gap:10px;padding:10px;background:radial-gradient(#3a1010,#0b0608)">${ids.map(im).join('')}</div></body>`);
await p.waitForTimeout(300); await p.screenshot({ path: 'docs/ingame/pets_cut.png' }); await b.close();
