// The five pets side by side.  node dev/petsheet.mjs
import { chromium } from 'playwright-core';
import { petSvg } from '../js/g3/pets.js';
import { PETS } from '../js/data.js';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1000, height: 260 } });
await p.setContent(`<body style="margin:0;background:#0c0a12;display:flex;gap:20px;padding:20px;font:14px sans-serif;color:#ddd">${Object.entries(PETS).map(([k, v]) => `<div style="text-align:center">${petSvg(k, 170)}<div>${v.name}</div></div>`).join('')}</body>`);
await p.screenshot({ path: 'docs/ingame/pets_sheet.png' }); await b.close();
