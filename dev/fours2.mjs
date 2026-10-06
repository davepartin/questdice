import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 260 } });
await p.setContent('<canvas id=c width=1100 height=260 style="background:#fbf8ee"></canvas>');
await p.evaluate(() => {
  const c = document.getElementById('c').getContext('2d');
  const paths = ['M52 78 V6 L-8 56 H62', 'M54 80 V4 L-4 58 H66', 'M56 80 V4 L6 62 H68', 'M52 80 V4 L8 40 L-4 58 H66', 'M54 78 V6 L2 54 H64 M54 6 L2 54'];
  paths.forEach((d, i) => { const P = new Path2D(d); for (const [lw, col] of [[16 + 16, '#fff'], [16 + 6, '#000'], [16, '#0c0606']]) { c.save(); c.translate(70 + i * 210, 30); c.scale(2.3, 2.3); c.lineJoin = 'miter'; c.miterLimit = 2.2; c.lineCap = 'butt'; c.lineWidth = lw; c.strokeStyle = col; c.stroke(P); c.restore(); } c.fillStyle = '#555'; c.font = '16px sans-serif'; c.fillText(String.fromCharCode(65 + i), 70 + i * 210, 250); });
});
await p.screenshot({ path: process.argv[2] }); await b.close();
