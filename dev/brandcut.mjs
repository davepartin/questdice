// Cut the Quest Dice knight and the "QUEST" / "DICE" lettering out of the owner's art (black background -> transparent).
//   node dev/brandcut.mjs SOURCE.jpg OUTDIR
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(src).toString('base64')}`;
const res = await p.evaluate(async (dataUrl) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const W = img.width; const H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H); const px = d.data;
  // black -> transparent with a soft ramp, so the bronze edges stay smooth
  for (let i = 0; i < px.length; i += 4) { const m = Math.max(px[i], px[i + 1], px[i + 2]); px[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (m - 16) / 38))); }
  g.putImageData(d, 0, 0);
  const alphaAt = (x, y) => px[(y * W + x) * 4 + 3];
  // find the gap row between the knight and the lettering, then the bounding box of each part
  const rowInk = (y, x0 = 0, x1 = W) => { let n = 0; for (let x = x0; x < x1; x++) if (alphaAt(x, y) > 60) n++; return n; };
  let gap = Math.round(H * 0.72); let best = 1e9;
  for (let y = Math.round(H * 0.68); y < Math.round(H * 0.8); y++) { const n = rowInk(y); if (n < best) { best = n; gap = y; } }
  const bbox = (x0, y0, x1, y1) => { let a = x1, bb = y1, c = x0, e = y0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (alphaAt(x, y) > 40) { if (x < a) a = x; if (x > c) c = x; if (y < bb) bb = y; if (y > e) e = y; } return [a, bb, c + 1, e + 1]; };
  const knight = bbox(0, 0, W, gap);
  const letters = bbox(Math.round(W * 0.19), gap, Math.round(W * 0.81), H); // the words without the side flourishes
  const full = bbox(0, gap, W, H);
  // split QUEST | DICE at the widest empty column near the middle of the letters
  let split = Math.round((letters[0] + letters[2]) / 2); let bestc = 1e9;
  for (let x = Math.round(letters[0] + (letters[2] - letters[0]) * 0.5); x < letters[0] + (letters[2] - letters[0]) * 0.65; x++) { let n = 0; for (let y = letters[1]; y < letters[3]; y++) if (alphaAt(x, y) > 40) n++; if (n < bestc) { bestc = n; split = x; } }
  const crop = (r, type = 'image/webp', q = 0.92, pad = 6) => { const [x0, y0, x1, y1] = [Math.max(0, r[0] - pad), Math.max(0, r[1] - pad), Math.min(W, r[2] + pad), Math.min(H, r[3] + pad)];
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0; c.getContext('2d').drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0); return { url: c.toDataURL(type, q), w: c.width, h: c.height }; };
  // the words alone (no side flourishes, no underline) for stacking QUEST over DICE: inside the flourish tips, above the underline
  // (measured on this art: the Q's tail ends ~196px below the top of the letters, the underline starts just under it)
  const fullLogo = crop(full); const fullLogoPng = crop(full, 'image/png'); // the one-line logo keeps its underline
  // erase the underline that starts just right of the Q's tail, so QUEST stands alone with its full Q
  { const x0 = letters[0] + 36 + 140; const y0 = letters[1] + 166; const ctx = cv.getContext('2d'); ctx.clearRect(x0, y0, split - x0 + 4, 40); for (let y = y0; y < y0 + 40; y++) for (let x = x0; x < split + 4; x++) px[(y * W + x) * 4 + 3] = 0; }
  const quest = bbox(letters[0] + 36, letters[1], split - 16, letters[1] + 200); const dice = bbox(split, letters[1], letters[2] - 36, letters[1] + 180);
  return { W, H, gap, knight, letters, split, parts: { knight: crop(knight), quest: crop(quest), dice: crop(dice), logo: fullLogo, knight_png: crop(knight, 'image/png'), logo_png: fullLogoPng } };
}, dataUrl);
for (const [k, v] of Object.entries(res.parts)) { const ext = k.endsWith('_png') ? 'png' : 'webp'; const name = k.replace('_png', ''); fs.writeFileSync(path.join(out, `${name}.${ext}`), Buffer.from(v.url.split(',')[1], 'base64')); console.log(`${name}.${ext}`, v.w, 'x', v.h); }
console.log('quest', res.parts.quest.w, 'gap row', res.gap, 'knight box', res.knight, 'letters', res.letters, 'split', res.split);
await b.close();
