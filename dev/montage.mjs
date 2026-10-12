// Put several screenshots side by side (cropped to the top of the screen) in one picture.   node dev/montage.mjs out.png top-px in1.png in2.png ...
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const [out, top, ...ins] = process.argv.slice(2); const H = Number(top) || 340;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const imgs = ins.map((f) => `<figure style="margin:0"><div style="width:${390}px;height:${H}px;overflow:hidden"><img style="width:390px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></div><small style="color:#aaa;font:10px sans-serif">${f.split('/').pop()}</small></figure>`).join('');
await p.setContent(`<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${imgs}</body>`);
await p.waitForTimeout(300); await p.screenshot({ path: out, fullPage: true }); await b.close();
