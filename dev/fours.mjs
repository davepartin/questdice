import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 240 } });

await p.setContent('<canvas id=c width=1100 height=240 style="background:#e9d9b0"></canvas>');
await p.evaluate(async () => {
  const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#0c0606'; c.strokeStyle = '#0c0606';
  const paths = ['x'];
  paths.forEach((d, i) => { const P = new Path2D(d); c.save(); c.translate(30 + i * 175, 40); c.scale(1.9, 1.9); c.lineJoin = 'miter'; c.miterLimit = 2.2; c.lineCap = 'butt'; c.lineWidth = 16; c.stroke(P); c.restore(); c.fillStyle = '#555'; c.font = '16px sans-serif'; c.fillText(String.fromCharCode(65 + i), 30 + i * 175, 232); });
});
await p.screenshot({ path: process.argv[2] }); await b.close();
