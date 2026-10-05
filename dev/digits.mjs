import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 200 } });
await p.goto('http://localhost:8135/index.html?debug&manual&q=low'); 
await p.setContent('<canvas id=c width=1100 height=200 style="background:#f4ecd8"></canvas>');
await p.evaluate(async () => { const m = await import('/js/gfx/dice/faces.js'); const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#140808'; c.strokeStyle = '#140808'; ['0','1','2','3','4','5','6','7','8','9'].forEach((d, i) => m.drawNumeral(c, d, 50 + i * 105, 100, 120, { weight: 16 })); });
await p.screenshot({ path: process.argv[2] }); await b.close();
