// Weapon card dice: big, readable red (attack) and blue (block) 3D-sided dice faces with high-contrast numbers and bonus icons.
// Loaded on demand by js/g3/cards.js; images are cached by the faces that make them.
let SYM = {}; export const setSymbols = (s) => { SYM = s; }; // the game's symbol paths and colours (js/g3/cards.js SYM)

const PAL = {
  r: { top: '#f03a42', side: '#6e070b', f0: '#df222a', f1: '#b81118', f2: '#84080d', rim: '#ff9a9ecc', well: '#64050966' },
  b: { top: '#4d94ff', side: '#09246e', f0: '#2b72ee', f1: '#1a52c4', f2: '#0d3185', rim: '#9ec5ffcc', well: '#06194d66' },
};
const RICH = {
  arrow_pierce: '#ff5514', arrow_fire: '#ff5218', arrow_frost: '#38bdf8',
  atk: '#ff9416', block: '#2b7fff', gold: '#fbbf24', pierce: '#ff5514', magic: '#a855f7', heal: '#16c652', star: '#f59e0b',
};

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawIcon(g, k, x, y, s) {
  const sym = SYM[k.startsWith('arrow_') ? 'arrow' : k] || SYM.star;
  if (!sym?.d) return;
  const p = new Path2D(sym.d);
  const col = RICH[k] || sym.c || '#fbbf24';
  const u = s / 24;
  const white = Math.max(2.6, Math.min(4.2, (s * 0.11) / u));
  g.save();
  g.translate(x - s / 2, y - s / 2);
  g.scale(u, u);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.save();
  g.translate(0, 2.2 / u);
  g.lineWidth = white + 1.2 / u;
  g.strokeStyle = '#180604aa';
  g.stroke(p);
  g.restore();
  g.lineWidth = white;
  g.strokeStyle = '#fffdf8';
  g.stroke(p);
  g.fillStyle = col;
  g.fill(p);
  g.save();
  g.clip(p);
  g.lineWidth = 2.2 / u;
  g.translate(0, 1.2 / u);
  g.strokeStyle = '#00000044';
  g.stroke(p);
  g.translate(0, -2.4 / u);
  g.strokeStyle = '#ffffff77';
  g.stroke(p);
  g.restore();
  g.restore();
}

function drawDieFace(f, px = 220) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const g = cv.getContext('2d');
  const S = px / 220;
  g.scale(S, S);

  const pal = PAL[f?.c === 'b' ? 'b' : 'r'];
  const fx = 8, fy = 22, fw = 186, fh = 186, r = 30;
  const dx = 16, dy = -14;

  // 1. Extruded 3D top + right side of the die so you can see the sides of the cube
  g.save();
  const sideGrad = g.createLinearGradient(fx, fy + dy, fx + fw + dx, fy + fh);
  sideGrad.addColorStop(0, pal.top);
  sideGrad.addColorStop(0.46, pal.top);
  sideGrad.addColorStop(0.54, pal.side);
  sideGrad.addColorStop(1, pal.side);
  g.fillStyle = sideGrad;
  g.beginPath();
  // Hull connecting front rounded rect (fx,fy) and back-extruded rounded rect (fx+dx, fy+dy)
  g.moveTo(fx + r * 0.35, fy + r * 0.35);
  g.lineTo(fx + dx + r * 0.35, fy + dy + r * 0.35);
  g.arcTo(fx + dx + fw, fy + dy, fx + dx + fw, fy + dy + fh, r);
  g.arcTo(fx + dx + fw, fy + dy + fh, fx + dx, fy + dy + fh, r);
  g.lineTo(fx + fw - r * 0.35, fy + fh - r * 0.35);
  g.closePath();
  g.fill();
  rrect(g, fx + dx, fy + dy, fw, fh, r);
  g.fill();
  g.lineWidth = 2.2;
  g.strokeStyle = '#1a080488';
  g.stroke();
  // Diagonal corner ridge line on top-right 3D bevel
  g.beginPath();
  g.moveTo(fx + fw - r * 0.45, fy + r * 0.45);
  g.lineTo(fx + dx + fw - r * 0.35, fy + dy + r * 0.35);
  g.strokeStyle = '#ffffff55';
  g.lineWidth = 2.5;
  g.stroke();
  g.restore();

  // 2. Front face of the die
  g.save();
  rrect(g, fx, fy, fw, fh, r);
  const fg = g.createLinearGradient(fx, fy, fx + fw * 0.4, fy + fh);
  fg.addColorStop(0, pal.f0);
  fg.addColorStop(0.55, pal.f1);
  fg.addColorStop(1, pal.f2);
  g.fillStyle = fg;
  g.fill();

  // Crisp outer edge + inner highlight bevel
  g.lineWidth = 3;
  g.strokeStyle = '#1e0905aa';
  g.stroke();

  rrect(g, fx + 3.5, fy + 3.5, fw - 7, fh - 7, r - 3);
  g.lineWidth = 2.4;
  g.strokeStyle = pal.rim;
  g.stroke();

  // Subtle recessed face well
  rrect(g, fx + 11, fy + 11, fw - 22, fh - 22, r - 8);
  g.fillStyle = pal.well;
  g.fill();
  g.restore();

  // 3. Number (+0, +1, +2, +4...) and bonus icons
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;
  const txt = `+${f?.v ?? 0}`;
  const marks = (f?.icons || []).slice(0, 5);
  const n = marks.length;

  let fs = 92, ny = cy + 4, pts = [], is = 64;
  if (n === 1) {
    fs = 78; ny = fy + 58; is = 72;
    pts = [[cx, fy + 138]];
  } else if (n === 2) {
    fs = 76; ny = fy + 56; is = 64;
    pts = [[cx - 38, fy + 138], [cx + 38, fy + 138]];
  } else if (n === 3) {
    fs = 72; ny = fy + 54; is = 54;
    pts = [[cx - 55, fy + 138], [cx, fy + 138], [cx + 55, fy + 138]];
  } else if (n === 4) {
    fs = 62; ny = fy + 44; is = 46;
    pts = [
      [cx - 34, fy + 104], [cx + 34, fy + 104],
      [cx - 34, fy + 152], [cx + 34, fy + 152],
    ];
  } else if (n >= 5) {
    fs = 60; ny = fy + 43; is = 44;
    pts = [
      [cx - 48, fy + 104], [cx, fy + 104], [cx + 48, fy + 104],
      [cx - 28, fy + 152], [cx + 28, fy + 152],
    ];
  }

  g.save();
  g.font = `800 ${fs}px Oxanium, "Trebuchet MS", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // Deep stamped drop shadow + crisp dark outline so the number is super legible
  g.lineJoin = 'round';
  g.lineWidth = Math.max(5, fs * 0.09);
  g.strokeStyle = '#180604cc';
  g.strokeText(txt, cx, ny + 3);
  const tg = g.createLinearGradient(0, ny - fs * 0.45, 0, ny + fs * 0.45);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(1, f?.v === 0 ? '#d8cec2' : '#ffe8b8');
  g.fillStyle = tg;
  g.fillText(txt, cx, ny);
  g.restore();

  marks.forEach((k, i) => {
    if (pts[i]) drawIcon(g, k, pts[i][0], pts[i][1], is);
  });

  return cv.toDataURL('image/png');
}

// dieSet(sides, faces, { px, from }): one PNG data URL per label 1..sides.
export function dieSet(sides, faces, { px = 220, from = 0 } = {}) {
  const urls = [];
  for (let label = 1; label <= sides; label++) {
    if (label <= from) { urls.push(null); continue; }
    urls.push(drawDieFace(faces[label - 1], px));
  }
  return urls;
}
