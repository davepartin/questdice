// Cut painted miniatures out of a studio backdrop so they stand on the game's own scene.
//   node dev/minicut.mjs
// Reads DIR (default assets/miniatures/src), writes OUT (default assets/miniatures), trimmed transparent WebP, max 512.
//
// Two backdrops:
//   cream  — light, nearly colourless studio (original Act I/II src). Flood from the edges while the pixel
//            stays light, low-sat and close to its neighbour.
//   checker — a PAINTED gray/white checkerboard (not real alpha). The two greys are ~12px squares; a pixel
//            is backdrop when its cell matches that pattern. High-sat paint (wizard glow, gold trim) and
//            textured cloth stay. Set CHECKER=1, or it is detected from the border.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const FLAT = Number(process.env.FLAT || 12);
const STEP = Number(process.env.STEP || 9);
const LUM = Number(process.env.LUM || 150);
const SAT = Number(process.env.SAT || 70);
const MAX = Number(process.env.MAX || 512);
const SRC = process.env.DIR || 'assets/miniatures/src';
const DST = process.env.OUT || 'assets/miniatures';
const FORCE_CHECKER = process.env.CHECKER === '1';

const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
if (!chrome) throw new Error('no chrome');

const files = fs.readdirSync(SRC).filter((x) => x.endsWith('.webp') || x.endsWith('.png') || x.endsWith('.jpg'));
if (!files.length) throw new Error(`no pictures in ${SRC}`);
fs.mkdirSync(DST, { recursive: true });

const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const p = await b.newPage();

for (const f of files) {
  const id = path.basename(f).replace(/\.(webp|png|jpg)$/i, '');
  const buf = fs.readFileSync(path.join(SRC, f));
  const mime = f.endsWith('.png') ? 'image/png' : f.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
  const res = await p.evaluate(async ([dataUrl, opts]) => {
    const { STEP, LUM, SAT, MAX, POCK, FLAT, ERODE, FORCE_CHECKER } = opts;
    const img = new Image(); img.src = dataUrl; await img.decode();
    const W = img.width; const H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H); const px = d.data;
    const lum = (i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    const sat = (i) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const dist = (i, j) => Math.abs(px[i * 4] - px[j * 4]) + Math.abs(px[i * 4 + 1] - px[j * 4 + 1]) + Math.abs(px[i * 4 + 2] - px[j * 4 + 2]);
    const palDist = (i, pal) => {
      let best = 1e9;
      for (const c of pal) {
        const v = Math.abs(px[i * 4] - c[0]) + Math.abs(px[i * 4 + 1] - c[1]) + Math.abs(px[i * 4 + 2] - c[2]);
        if (v < best) best = v;
      }
      return best;
    };
    const neighbors = (i) => {
      const x = i % W; const y = (i / W) | 0; const o = [];
      if (x > 0) o.push(i - 1); if (x < W - 1) o.push(i + 1);
      if (y > 0) o.push(i - W); if (y < H - 1) o.push(i + W);
      return o;
    };

    // Detect a painted checkerboard from the 12px border: two grey clusters, low sat, repeating.
    const border = [];
    for (let x = 0; x < W; x++) { border.push(x); border.push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { border.push(y * W); border.push(y * W + W - 1); }
    let grey = 0; for (const i of border) if (sat(i) < 18 && lum(i) > 160) grey++;
    const greyFrac = grey / border.length;
    // two means on the grey border pixels
    let palA = [250, 250, 250]; let palB = [205, 205, 205];
    for (let it = 0; it < 6; it++) {
      let aS = [0, 0, 0], bS = [0, 0, 0], an = 0, bn = 0;
      for (const i of border) {
        if (sat(i) >= 18) continue;
        const da = Math.abs(px[i * 4] - palA[0]) + Math.abs(px[i * 4 + 1] - palA[1]) + Math.abs(px[i * 4 + 2] - palA[2]);
        const db = Math.abs(px[i * 4] - palB[0]) + Math.abs(px[i * 4 + 1] - palB[1]) + Math.abs(px[i * 4 + 2] - palB[2]);
        (da <= db ? aS : bS)[0] += px[i * 4]; (da <= db ? aS : bS)[1] += px[i * 4 + 1]; (da <= db ? aS : bS)[2] += px[i * 4 + 2];
        if (da <= db) an++; else bn++;
      }
      if (an) palA = [aS[0] / an, aS[1] / an, aS[2] / an];
      if (bn) palB = [bS[0] / bn, bS[1] / bn, bS[2] / bn];
    }
    const split = Math.abs(palA[0] - palB[0]) + Math.abs(palA[1] - palB[1]) + Math.abs(palA[2] - palB[2]);
    const useChecker = FORCE_CHECKER || (greyFrac > 0.7 && split > 40 && split < 220);

    const bg = new Uint8Array(W * H);
    const st = [];
    let mode = 'cream';

    if (useChecker) {
      mode = 'checker';
      const pal = [palA.map(Math.round), palB.map(Math.round)];
      // cell size: median run of similar luminance along the top interior row
      const yScan = 6;
      const runs = [];
      let prev = lum(yScan * W); let run = 1;
      for (let x = 1; x < W; x++) {
        const L = lum(yScan * W + x);
        if (Math.abs(L - prev) < 22) run++;
        else { if (run >= 4 && run <= 24) runs.push(run); run = 1; prev = L; }
      }
      runs.sort((p, q) => p - q);
      const CS = runs.length ? runs[(runs.length / 2) | 0] : 12;
      // phase: which pal the top-left cell matches
      const sample = (cx, cy) => {
        let s = [0, 0, 0], n = 0;
        const x0 = cx * CS; const y0 = cy * CS;
        for (let y = y0; y < Math.min(H, y0 + CS); y++) for (let x = x0; x < Math.min(W, x0 + CS); x++) {
          const i = y * W + x; s[0] += px[i * 4]; s[1] += px[i * 4 + 1]; s[2] += px[i * 4 + 2]; n++;
        }
        return n ? [s[0] / n, s[1] / n, s[2] / n] : pal[0];
      };
      const tl = sample(0, 0);
      const d0 = Math.abs(tl[0] - pal[0][0]) + Math.abs(tl[1] - pal[0][1]) + Math.abs(tl[2] - pal[0][2]);
      const d1 = Math.abs(tl[0] - pal[1][0]) + Math.abs(tl[1] - pal[1][1]) + Math.abs(tl[2] - pal[1][2]);
      const phase = d0 <= d1 ? 0 : 1;
      const cols = Math.ceil(W / CS); const rows = Math.ceil(H / CS);
      const cellKind = new Uint8Array(cols * rows); // 1 = checker cell
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
        const expect = pal[(cx + cy + phase) & 1];
        const x0 = cx * CS; const y0 = cy * CS;
        const x1 = Math.min(W, x0 + CS); const y1 = Math.min(H, y0 + CS);
        let hit = 0, n = 0, varAcc = 0, meanL = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const i = y * W + x; n++;
          const pd = Math.abs(px[i * 4] - expect[0]) + Math.abs(px[i * 4 + 1] - expect[1]) + Math.abs(px[i * 4 + 2] - expect[2]);
          const L = lum(i); meanL += L;
          if (pd < 55 && sat(i) < 22) hit++;
        }
        meanL /= n || 1;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const L = lum(y * W + x); varAcc += (L - meanL) * (L - meanL); }
        const v = varAcc / (n || 1);
        // a checker cell is mostly the expected grey and fairly flat; a painted robe is not
        cellKind[cy * cols + cx] = (hit / (n || 1) > 0.55 && v < 1400) ? 1 : 0;
      }
      // flood checker cells from the image border
      const cellBg = new Uint8Array(cols * rows);
      const cq = [];
      const pushC = (cx, cy) => {
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
        const k = cy * cols + cx; if (cellBg[k] || !cellKind[k]) return;
        cellBg[k] = 1; cq.push(k);
      };
      for (let cx = 0; cx < cols; cx++) { pushC(cx, 0); pushC(cx, rows - 1); }
      for (let cy = 0; cy < rows; cy++) { pushC(0, cy); pushC(cols - 1, cy); }
      while (cq.length) {
        const k = cq.pop(); const cx = k % cols; const cy = (k / cols) | 0;
        pushC(cx - 1, cy); pushC(cx + 1, cy); pushC(cx, cy - 1); pushC(cx, cy + 1);
      }
      // interior checker pockets (between legs, under an arm) that the border flood missed, if they are sizeable
      const seenC = new Uint8Array(cols * rows);
      for (let s0 = 0; s0 < cols * rows; s0++) {
        if (cellBg[s0] || seenC[s0] || !cellKind[s0]) continue;
        const comp = [s0]; seenC[s0] = 1;
        for (let k = 0; k < comp.length; k++) {
          const i = comp[k]; const cx = i % cols; const cy = (i / cols) | 0;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = cx + dx; const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const j = ny * cols + nx; if (seenC[j] || !cellKind[j] || cellBg[j]) continue;
            seenC[j] = 1; comp.push(j);
          }
        }
        if (comp.length >= 3) for (const i of comp) cellBg[i] = 1;
      }
      // pixel mask: checker-cell pixels that look like the two greys go; high-sat / textured paint stays
      const like = (i) => palDist(i, pal) < 58 && sat(i) < 24;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (sat(i) > 38) { bg[i] = 0; continue; } // glow, gold, grass, cloth colour
        const cx = Math.min(cols - 1, (x / CS) | 0); const cy = Math.min(rows - 1, (y / CS) | 0);
        if (cellBg[cy * cols + cx] && like(i)) bg[i] = 1;
      }
      const lvar = new Float32Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; let s = 0, s2 = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const L = lum(i + dy * W + dx); s += L; s2 += L * L; }
        lvar[i] = s2 / 9 - (s / 9) * (s / 9);
      }
      // grow into leftover checker AA and smooth painted greys (vignettes), stop on colour / texture
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (bg[i]) st.push(i);
      }
      const fog = (i) => sat(i) < 16 && lum(i) > 165 && palDist(i, pal) < 95 && lvar[i] < 55;
      const STEP_C = 28;
      while (st.length) {
        const i = st.pop();
        for (const j of neighbors(i)) {
          if (bg[j]) continue;
          if (sat(j) > 32) continue;
          const close = like(j) || fog(j) || (palDist(j, pal) < 70 && sat(j) < 14);
          if (!close && palDist(j, pal) > 62) continue;
          if (!close && dist(i, j) > STEP_C && palDist(j, pal) > 36) continue;
          bg[j] = 1; st.push(j);
        }
      }
    } else {
      const ok = (i) => lum(i) > LUM && sat(i) < SAT;
      for (let x = 0; x < W; x++) { for (const i of [x, (H - 1) * W + x]) if (ok(i) && !bg[i]) { bg[i] = 1; st.push(i); } }
      for (let y = 0; y < H; y++) { for (const i of [y * W, y * W + W - 1]) if (ok(i) && !bg[i]) { bg[i] = 1; st.push(i); } }
      while (st.length) {
        const i = st.pop();
        for (const j of neighbors(i)) {
          if (bg[j] || !ok(j) || dist(i, j) > STEP) continue; bg[j] = 1; st.push(j);
        }
      }
      const band = new Float32Array(Math.ceil(H / 16) * 3); const bn = new Float32Array(Math.ceil(H / 16));
      for (let i = 0; i < W * H; i++) if (bg[i]) { const r = ((i / W) | 0) >> 4; band[r * 3] += px[i * 4]; band[r * 3 + 1] += px[i * 4 + 1]; band[r * 3 + 2] += px[i * 4 + 2]; bn[r]++; }
      const flat = new Uint8Array(W * H); for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const i = y * W + x; let f = 1; for (const j of [i - 2, i + 2, i - 2 * W, i + 2 * W, i - 1 - W, i + 1 + W]) if (dist(i, j) > FLAT) { f = 0; break; } flat[i] = f; }
      const near = (i) => { if (!flat[i]) return false; const r = ((i / W) | 0) >> 4; if (!bn[r]) return false; return Math.abs(px[i * 4] - band[r * 3] / bn[r]) + Math.abs(px[i * 4 + 1] - band[r * 3 + 1] / bn[r]) + Math.abs(px[i * 4 + 2] - band[r * 3 + 2] / bn[r]) < POCK; };
      const seen = new Uint8Array(W * H);
      for (let s0 = 0; s0 < W * H; s0++) { if (bg[s0] || seen[s0] || !near(s0)) continue;
        const comp = [s0]; seen[s0] = 1; for (let k = 0; k < comp.length; k++) { const i = comp[k];
          for (const j of neighbors(i)) if (!bg[j] && !seen[j] && near(j)) { seen[j] = 1; comp.push(j); } }
        if (comp.length > 60) for (const i of comp) { bg[i] = 1; st.push(i); } }
      while (st.length) {
        const i = st.pop();
        for (const j of neighbors(i)) {
          if (bg[j] || !ok(j) || dist(i, j) > STEP + 4) continue; bg[j] = 1; st.push(j);
        }
      }
    }

    const fg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) fg[i] = bg[i] ? 0 : 1;
    const lab = new Int32Array(W * H); let best = 0, bestN = 0, nl = 0;
    for (let s = 0; s < W * H; s++) { if (!fg[s] || lab[s]) continue; nl++; let n = 0; const q = [s]; lab[s] = nl;
      while (q.length) { const i = q.pop(); n++;
        for (const j of neighbors(i)) if (fg[j] && !lab[j]) { lab[j] = nl; q.push(j); } }
      if (n > bestN) { bestN = n; best = nl; } }
    const m = new Float32Array(W * H);
    const sizes = new Map(); for (let i = 0; i < W * H; i++) if (lab[i]) sizes.set(lab[i], (sizes.get(lab[i]) || 0) + 1);
    const satSum = new Map(); for (let i = 0; i < W * H; i++) if (lab[i]) satSum.set(lab[i], (satSum.get(lab[i]) || 0) + sat(i));
    const keepLab = new Set([best]);
    for (const [id, n] of sizes) {
      if (id === best) continue;
      const meanSat = (satSum.get(id) || 0) / n;
      // a separate spark of magic, a sword tip: keep. leftover checker islands: drop.
      if (useChecker) { if (meanSat > 26 && n > 40) keepLab.add(id); }
      else if (n > W * H * 0.003) keepLab.add(id);
    }
    for (let i = 0; i < W * H; i++) if (lab[i] && keepLab.has(lab[i])) m[i] = 1;
    let e = new Float32Array(W * H); e.set(m);
    const erodeN = useChecker ? Math.min(ERODE, 1) : ERODE;
    for (let pass = 0; pass < erodeN; pass++) { const n = new Float32Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; n[i] = Math.min(e[i], e[i - 1], e[i + 1], e[i - W], e[i + W]); } e = n; }
    const alpha = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += e[i + dy * W + dx]; alpha[i] = s / 9; }
    // despill leftover checker grey on the fringe: the more a pixel looks like the backdrop, the more transparent
    if (useChecker) {
      const pal = [palA.map(Math.round), palB.map(Math.round)];
      for (let i = 0; i < W * H; i++) {
        if (alpha[i] < 0.02) { px[i * 4 + 3] = 0; continue; }
        const pd = palDist(i, pal);
        let v = Math.min(1, alpha[i] * 1.25);
        if (sat(i) < 20 && pd < 70) v *= Math.min(1, pd / 40);
        px[i * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, v)));
      }
    } else {
      for (let i = 0; i < W * H; i++) px[i * 4 + 3] = Math.round(255 * Math.min(1, alpha[i] * 1.25));
    }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < W * H; i++) { const v = px[i * 4 + 3] / 255; if (v > 0.3) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    g.putImageData(d, 0, 0);
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
    const k = Math.min(1, MAX / Math.max(x1 - x0, y1 - y0));
    const c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * k); c.height = Math.round((y1 - y0) * k);
    const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    return { w: c.width, h: c.height, mode, webp: c.toDataURL('image/webp', 0.92) };
  }, [`data:${mime};base64,${buf.toString('base64')}`, {
    STEP, LUM, SAT, MAX, POCK: Number(process.env.POCK || 40), FLAT, ERODE: Number(process.env.ERODE || 2), FORCE_CHECKER,
  }]);
  fs.writeFileSync(path.join(DST, `${id}.webp`), Buffer.from(res.webp.split(',')[1], 'base64'));
  console.log(id, res.mode, res.w, 'x', res.h, fs.statSync(path.join(DST, `${id}.webp`)).size, 'bytes');
}
await b.close();
