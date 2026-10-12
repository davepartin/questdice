// Contact sheet of the painted miniatures (light and dark backgrounds, to spot background halos).  node dev/minisheet.mjs [out.png]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const out = process.argv[2] || 'docs/ingame/minis_sheet.png';
const ids = ['knight', 'ranger', 'wizard', 'dwarf', 'bard', 'goblin', 'wolf', 'cultist', 'ogre', 'goblinking', 'skeleton', 'wraith', 'spider', 'bonewarden', 'lich'];
const dir = process.env.DIR || 'assets/miniatures';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1250, height: 800 } });
const im = (id) => { const f = `${dir}/${id}.webp`; return fs.existsSync(f) ? `<figure style="margin:0;text-align:center;color:#ccc;font:12px sans-serif"><img src="data:image/webp;base64,${fs.readFileSync(f).toString('base64')}" style="width:230px;height:230px;object-fit:contain;background:${process.env.BG || '#0d0a14'}">${id}</figure>` : ''; };
await p.setContent(`<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${ids.map(im).join('')}</body>`);
await p.waitForTimeout(500); await p.screenshot({ path: out, fullPage: true }); await b.close();
