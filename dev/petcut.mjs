// Cut Dave's pet pictures (on black) into small transparent WebPs. The background is flood-filled in from the edges,
// so a dark pet (the black dragon) keeps its body.   node dev/petcut.mjs   (reads assets/pets/src/*.jpg, writes assets/pets/*.webp)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const T = Number(process.env.T || 6); const MAX = 420;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
for (const f of fs.readdirSync('assets/pets/src').filter((x) => x.endsWith('.jpg'))) {
  const id = f.replace('.jpg', '');
  const res = await p.evaluate(async ([dataUrl, T, MAX]) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const W = img.width; const H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H); const px = d.data;
    const lum = (i) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const bg = new Uint8Array(W * H); const st = [];
    for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
    while (st.length) { const i = st.pop(); if (bg[i] || lum(i) > T) continue; bg[i] = 1; const x = i % W; const y = (i / W) | 0;
      if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    // soft edge: alpha from a 5x5 box average of the mask
    const a = new Float32Array(W * H); const R = 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) { s++; n++; continue; } s += bg[yy * W + xx]; n++; } a[y * W + x] = 1 - s / n; }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < W * H; i++) { const v = bg[i] ? 0 : Math.min(1, a[i] * 1.6); px[i * 4 + 3] = Math.round(255 * v); if (v > 0.2) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    g.putImageData(d, 0, 0);
    const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
    const k = Math.min(1, MAX / Math.max(x1 - x0, y1 - y0));
    const c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * k); c.height = Math.round((y1 - y0) * k);
    const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    return { w: c.width, h: c.height, webp: c.toDataURL('image/webp', 0.9) };
  }, [`data:image/jpeg;base64,${fs.readFileSync(`assets/pets/src/${f}`).toString('base64')}`, T, MAX]);
  fs.writeFileSync(`assets/pets/${id}.webp`, Buffer.from(res.webp.split(',')[1], 'base64'));
  console.log(id, res.w, 'x', res.h, fs.statSync(`assets/pets/${id}.webp`).size, 'bytes');
}
await b.close();
