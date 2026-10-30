// Integrated card frame for rev 2 (Crockpot / Grok Bot, 25 Oct): the approved T17 frame with one kraft field set INTO it, not on it.
// The field is painted on a canvas under the frame's inner border; the corner filigree (and the frame's own bevel line) is then
// redrawn ON TOP of the field from the frame's own pixels, so the ornaments overlap the field edges and the border reads as one card.
// The frame's own title plaque (cut from frame-t17.webp) is moved to the top of the field for a short title.
const SRC = '../../../../../assets/cards/frame-t17.webp';
const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
export const FIELD = { x: 86, y: 84, w: 548, h: 884 }; // in frame pixels (720 x 1052)
import { drawSym } from '../../../../../js/gfx/dice/faces.js';
// rev 9 (Dave, Talent card): opt-in emblems stamped into the four round corner insets, the game's own icon shapes, metal-toned with a faint tint.
const EMB = [['atk', '#ff3b3b'], ['def', '#3aa4ff'], ['magic', '#a64dff'], ['heal', '#38e87a']]; // TL, TR, BL, BR
// rev 10: the circles' TRUE centres, fitted to frame-t17.webp (dark disc vs metal rim, 0.5 px grid; radius ~26.5 px). The bottom insets sit
// 8 px higher than the top ones are low, so the old mirrored (63, 63) guess was off by up to 8 px.
export const INSETS = [[63, 60, 26.5], [655.5, 60, 26.5], [61.5, 981, 26.5], [657, 981, 26]]; // TL, TR, BL, BR: x, y, r (frame px)
function emblems(g, W, H) {
  const size = 34; const before = g.getImageData(0, 0, W, H).data; const meas = [];
  INSETS.forEach(([x, y, r], i) => { const [kind, tint] = EMB[i];
    // centre by the icon's VISUAL bounding box (alpha > 0), not its path origin
    const n = size * 2; const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d', { willReadFrequently: true });
    qg.fillStyle = '#000'; drawSym(qg, kind, n / 2, n / 2, size, 0, true); const d = qg.getImageData(0, 0, n, n).data;
    let x0 = n, x1 = -1, y0 = n, y1 = -1; for (let j = 0; j < n * n; j++) if (d[j * 4 + 3] > 0) { const px = j % n, py = (j / n) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const ox = x - (x0 + x1 + 1) / 2 + n / 2, oy = y - (y0 + y1 + 1) / 2 + n / 2; // where the path origin must go
    const ink = (fill, dx, dy) => { g.fillStyle = fill; g.strokeStyle = fill; drawSym(g, kind, ox + dx, oy + dy, size, 0, true); };
    g.save(); ink('#000000b0', 1.2, 1.2); ink('#e8e2d0a0', -1.2, -1.2); // stamped: shadow + light, equal and opposite so the centre stays put
    qg.clearRect(0, 0, n, n); const m = qg.createLinearGradient(n / 2 - size / 2, n / 2 - size / 2, n / 2 + size / 2, n / 2 + size / 2); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    qg.fillStyle = m; drawSym(qg, kind, n / 2, n / 2, size, 0, true);
    qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.14; qg.fillStyle = tint; qg.fillRect(0, 0, n, n);
    g.drawImage(q, ox - n / 2, oy - n / 2); g.restore();
    // measure what was actually painted: changed pixels near this inset
    const after = g.getImageData(0, 0, W, H).data; let a0 = W, a1 = -1, b0 = H, b1 = -1;
    for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) { const k = (yy * W + xx) * 4; if (Math.abs(after[k] - before[k]) + Math.abs(after[k + 1] - before[k + 1]) + Math.abs(after[k + 2] - before[k + 2]) > 6) { a0 = Math.min(a0, xx); a1 = Math.max(a1, xx); b0 = Math.min(b0, yy); b1 = Math.max(b1, yy); } }
    meas.push({ kind, circle: { l: x - r, r: x + r, t: y - r, b: y + r }, icon: { l: a0, r: a1 + 1, t: b0, b: b1 + 1 } });
  });
  globalThis.__emb = meas;
}
export async function frameArt({ title = '', emblem = false } = {}) {
  await document.fonts.load('800 34px Cinzel').catch(() => {}); const f = await load(SRC); const W = 720, H = 1052; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(f, 0, 0);
  // kraft field
  const { x, y, w, h } = FIELD; const rr = 14;
  const path = () => { g.beginPath(); g.roundRect(x, y, w, h, rr); };
  g.save(); path(); g.clip();
  const k = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.45, 620); k.addColorStop(0, '#dcc394'); k.addColorStop(0.7, '#c6a574'); k.addColorStop(1, '#a8845a'); g.fillStyle = k; g.fillRect(x, y, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? '#5a3a1a14' : '#fff4dc18'; g.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2); } // fine fibre grain
  const sh = g.createLinearGradient(0, y, 0, y + 30); sh.addColorStop(0, '#2a160699'); sh.addColorStop(1, '#2a160600'); g.fillStyle = sh; g.fillRect(x, y, w, 30); // inner shadow under the frame lip
  g.restore();
  g.lineWidth = 4; g.strokeStyle = '#4a2e14'; path(); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#e8c88a66'; g.beginPath(); g.roundRect(x - 3, y - 3, w + 6, h + 6, rr + 3); g.stroke();
  // corner filigree back on top: keep only the bright metal (not the dark leather) from the frame's four corners
  const top = document.createElement('canvas'); top.width = W; top.height = H; const tg = top.getContext('2d');
  const cut = 236; const tmp = document.createElement('canvas'); tmp.width = tmp.height = cut; const t = tmp.getContext('2d', { willReadFrequently: true });
  for (const [cx, cy] of [[0, 0], [W - cut, 0], [0, H - cut], [W - cut, H - cut]]) {
    t.clearRect(0, 0, cut, cut); t.drawImage(f, cx, cy, cut, cut, 0, 0, cut, cut); const d = t.getImageData(0, 0, cut, cut); const p = d.data;
    for (let i = 0; i < p.length; i += 4) { const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; const a = Math.max(0, Math.min(1, (L - 62) / 40)) * Math.max(0, Math.min(1, (60 - (p[i] - p[i + 2])) / 25)); p[i + 3] *= a; } // keep bright, grey metal only (not leather, not parchment)
    t.putImageData(d, 0, 0); for (const q of [g, tg]) { q.save(); q.shadowColor = '#000c'; q.shadowBlur = 6; q.shadowOffsetY = 3; q.drawImage(tmp, cx, cy); q.restore(); }
  }
  if (title) { // the frame's own plaque, moved to the top of the field
    const py = y + 22; g.save(); g.shadowColor = '#0009'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.drawImage(f, 74, 386, 572, 60, 160, py, 400, 54); g.restore();
    // rev 4: centre the text's INK box (not the font's em box) on the plaque's dark inner band, measured from the drawn pixels
    const col = g.getImageData(Math.round(W / 2) - 60, py, 1, 54).data; let t0 = -1, t1 = -1;
    for (let i = 0; i < 54; i++) { const L = 0.3 * col[i * 4] + 0.59 * col[i * 4 + 1] + 0.11 * col[i * 4 + 2]; if (L < 60) { if (t0 < 0) t0 = i; t1 = i; } }
    const bandMid = t0 < 0 ? py + 27 : py + (t0 + t1 + 1) / 2;
    g.font = '800 34px Cinzel'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; const m = g.measureText(title);
    const tx = W / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2; const base = bandMid + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.fillStyle = '#1a0e06'; g.fillText(title, tx, base + 2); g.fillStyle = '#f0d49a'; g.fillText(title, tx, base);
    const inkL = tx - m.actualBoundingBoxLeft, inkR = tx + m.actualBoundingBoxRight;
    globalThis.__title = { plaque: { x: 160, y: py, w: 400, h: 54, bandTop: py + t0, bandBot: py + t1 + 1 }, ink: { l: inkL, r: inkR, t: base - m.actualBoundingBoxAscent, b: base + m.actualBoundingBoxDescent }, W };
  }
  if (emblem) emblems(g, W, H);
  return { card: c.toDataURL('image/jpeg', 0.92), corners: top.toDataURL() }; // corners: a layer to lay over the grid as well
}
