// Cut the painted miniatures out of their cream studio backdrops so they stand on the game's own scene.
//   node dev/minicut.mjs   (reads assets/miniatures/src/*.webp, writes assets/miniatures/*.webp, trimmed and transparent)
// The backdrop is flood-grown in from the edges: a pixel joins it when it is light, nearly colourless and close to its
// already-joined neighbour, so the soft studio gradient and floor shadow go, while the sharp edge of a figure stops it.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const FLAT = Number(process.env.FLAT || 12); const STEP = Number(process.env.STEP || 9); const LUM = Number(process.env.LUM || 150); const SAT = Number(process.env.SAT || 70);
const MAX = 512;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
for (const f of fs.readdirSync('assets/miniatures/src').filter((x) => x.endsWith('.webp'))) {
  const id = f.replace('.webp', '');
  const res = await p.evaluate(async ([dataUrl, STEP, LUM, SAT, MAX, POCKT, FLAT, ERODE]) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const W = img.width; const H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H); const px = d.data;
    const lum = (i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    const sat = (i) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const dist = (i, j) => Math.abs(px[i * 4] - px[j * 4]) + Math.abs(px[i * 4 + 1] - px[j * 4 + 1]) + Math.abs(px[i * 4 + 2] - px[j * 4 + 2]);
    const ok = (i) => lum(i) > LUM && sat(i) < SAT;
    const bg = new Uint8Array(W * H); const st = [];
    for (let x = 0; x < W; x++) { for (const i of [x, (H - 1) * W + x]) if (ok(i) && !bg[i]) { bg[i] = 1; st.push(i); } }
    for (let y = 0; y < H; y++) { for (const i of [y * W, y * W + W - 1]) if (ok(i) && !bg[i]) { bg[i] = 1; st.push(i); } }
    while (st.length) {
      const i = st.pop(); const x = i % W; const y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || bg[j] || !ok(j) || dist(i, j) > STEP) continue; bg[j] = 1; st.push(j);
      }
    }
    // pockets the edge flood cannot reach (between legs, under an arm, inside a bow): a pixel that matches the backdrop colour
    // of its own row band closely, grown in the same careful way, in blobs big enough to be a gap and not a highlight
    const POCK = Number(POCKT);
    const band = new Float32Array(Math.ceil(H / 16) * 3); const bn = new Float32Array(Math.ceil(H / 16));
    for (let i = 0; i < W * H; i++) if (bg[i]) { const r = ((i / W) | 0) >> 4; band[r * 3] += px[i * 4]; band[r * 3 + 1] += px[i * 4 + 1]; band[r * 3 + 2] += px[i * 4 + 2]; bn[r]++; }
    const flat = new Uint8Array(W * H); for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const i = y * W + x; let f = 1; for (const j of [i - 2, i + 2, i - 2 * W, i + 2 * W, i - 1 - W, i + 1 + W]) if (dist(i, j) > FLAT) { f = 0; break; } flat[i] = f; }
    const near = (i) => { if (!flat[i]) return false; const r = ((i / W) | 0) >> 4; if (!bn[r]) return false; return Math.abs(px[i * 4] - band[r * 3] / bn[r]) + Math.abs(px[i * 4 + 1] - band[r * 3 + 1] / bn[r]) + Math.abs(px[i * 4 + 2] - band[r * 3 + 2] / bn[r]) < POCK; };
    const seen = new Uint8Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) { if (bg[s0] || seen[s0] || !near(s0)) continue;
      const comp = [s0]; seen[s0] = 1; for (let k = 0; k < comp.length; k++) { const i = comp[k]; const x = i % W; const y = (i / W) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !bg[j] && !seen[j] && near(j)) { seen[j] = 1; comp.push(j); } }
      if (comp.length > 60) for (const i of comp) { bg[i] = 1; st.push(i); } }
    // then let each cleared gap eat its light fringe the same way the edge flood does
    while (st.length) {
      const i = st.pop(); const x = i % W; const y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || bg[j] || !ok(j) || dist(i, j) > STEP + 4) continue; bg[j] = 1; st.push(j);
      }
    }
    // keep only the biggest figure blob, drop specks; fill pinholes smaller than a few pixels
    const fg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) fg[i] = bg[i] ? 0 : 1;
    const lab = new Int32Array(W * H); let best = 0, bestN = 0, nl = 0;
    for (let s = 0; s < W * H; s++) { if (!fg[s] || lab[s]) continue; nl++; let n = 0; const q = [s]; lab[s] = nl;
      while (q.length) { const i = q.pop(); n++; const x = i % W; const y = (i / W) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && fg[j] && !lab[j]) { lab[j] = nl; q.push(j); } }
      if (n > bestN) { bestN = n; best = nl; } }
    // an erosion of 1px kills the light fringe, then a small blur softens the alpha
    const m = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = lab[i] === best || (fg[i] && lab[i] && bestN > 0 && false) ? 1 : 0;
    // keep other sizeable blobs too (the staff / flame tip can be a separate piece): anything above 0.3% of the picture
    const sizes = new Map(); for (let i = 0; i < W * H; i++) if (lab[i]) sizes.set(lab[i], (sizes.get(lab[i]) || 0) + 1);
    for (let i = 0; i < W * H; i++) if (lab[i] && sizes.get(lab[i]) > W * H * 0.003) m[i] = 1;
    let e = new Float32Array(W * H); e.set(m);
    for (let pass = 0; pass < ERODE; pass++) { const n = new Float32Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; n[i] = Math.min(e[i], e[i - 1], e[i + 1], e[i - W], e[i + W]); } e = n; }
    const a = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += e[i + dy * W + dx]; a[i] = s / 9; }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < W * H; i++) { const v = Math.min(1, a[i] * 1.25); px[i * 4 + 3] = Math.round(255 * v); if (v > 0.3) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    g.putImageData(d, 0, 0);
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
    const k = Math.min(1, MAX / Math.max(x1 - x0, y1 - y0));
    const c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * k); c.height = Math.round((y1 - y0) * k);
    const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    return { w: c.width, h: c.height, webp: c.toDataURL('image/webp', 0.92) };
  }, [`data:image/webp;base64,${fs.readFileSync(`assets/miniatures/src/${f}`).toString('base64')}`, STEP, LUM, SAT, MAX, Number(process.env.POCK || 40), FLAT, Number(process.env.ERODE || 2)]);
  fs.writeFileSync(`assets/miniatures/${id}.webp`, Buffer.from(res.webp.split(',')[1], 'base64'));
  console.log(id, res.w, 'x', res.h, fs.statSync(`assets/miniatures/${id}.webp`).size, 'bytes');
}
await b.close();
