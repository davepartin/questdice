// Cut a character picture (on black, no lettering) into a transparent WebP + PNG, and report where its parts sit.
//   node dev/knightcut.mjs SOURCE.jpg OUT_BASENAME
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
const res = await p.evaluate(async (dataUrl) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const W = img.width; const H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H); const px = d.data;
  for (let i = 0; i < px.length; i += 4) { const m = Math.max(px[i], px[i + 1], px[i + 2]); px[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (m - 16) / 38))); }
  g.putImageData(d, 0, 0);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0; c.getContext('2d').drawImage(cv, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return { box: [x0, y0, x1, y1], w: c.width, h: c.height, webp: c.toDataURL('image/webp', 0.92), png: c.toDataURL('image/png') };
}, `data:image/jpeg;base64,${fs.readFileSync(src).toString('base64')}`);
fs.writeFileSync(`${out}.webp`, Buffer.from(res.webp.split(',')[1], 'base64'));
fs.writeFileSync(`${out}.png`, Buffer.from(res.png.split(',')[1], 'base64'));
console.log('box in source', res.box, 'size', res.w, 'x', res.h);
await b.close();
