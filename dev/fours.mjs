import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 240 } });

await p.setContent('<canvas id=c width=1100 height=240 style="background:#e9d9b0"></canvas>');
await p.evaluate(async () => {
  const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#0c0606'; c.strokeStyle = '#0c0606';
  const paths = ['M42 76 V6 L2 44 V50 H50', 'M42 78 V6 L2 40 V46 H50', 'M42 72 V6 L2 52 V58 H50', 'M40 72 V8 M40 20 L4 57 H50', 'M38 72 V8 L3 56 H49', 'M12 8 V46 H46 M38 8 V72', 'M42 72 V6 L2 52 V58 H50', 'M34 72 V10 M34 10 L4 56 H50', 'M14 8 L4 52 H44 M36 8 V72'];
  paths.forEach((d, i) => { const P = new Path2D(d); c.save(); c.translate(30 + i * 175, 40); c.scale(1.9, 1.9); c.lineJoin = 'miter'; c.miterLimit = 2.2; c.lineCap = 'butt'; c.lineWidth = 16; c.stroke(P); c.restore(); c.fillStyle = '#555'; c.font = '16px sans-serif'; c.fillText(String.fromCharCode(65 + i), 30 + i * 175, 232); });
});
await p.screenshot({ path: process.argv[2] }); await b.close();
