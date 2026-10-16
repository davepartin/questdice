// Print imgBase numbers for cut miniatures: IB(W, H, cx, by, bw)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const dir = process.argv[2] || 'assets/miniatures';
const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const p = await b.newPage();
for (const f of files) {
  const res = await p.evaluate(async (dataUrl) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const W = img.width, H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, W, H).data;
    const a = (x, y) => px[(y * W + x) * 4 + 3];
    let y1 = 0;
    for (let y = H - 1; y >= 0; y--) { let hit = false; for (let x = 0; x < W; x++) if (a(x, y) > 80) { hit = true; break; } if (hit) { y1 = y; break; } }
    // disc lives in the bottom ~11% of the figure
    const yTop = Math.max(0, y1 - Math.round(H * 0.11));
    let x0 = W, x1 = 0;
    for (let y = yTop; y <= y1; y++) for (let x = 0; x < W; x++) if (a(x, y) > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const cx = (x0 + x1) / 2; const bw = x1 - x0; const by = y1;
    return { W, H, cx, by, bw, x0, x1, xf: +(cx / W).toFixed(3), yf: +(by / H).toFixed(3), wf: +(bw / W).toFixed(3) };
  }, `data:image/webp;base64,${fs.readFileSync(`${dir}/${f}`).toString('base64')}`);
  console.log(`${f.replace('.webp', '')}: IB(${res.W}, ${res.H}, ${res.cx}, ${res.by}, ${res.bw})  x=${res.xf} y=${res.yf} w=${res.wf}`);
}
await b.close();
