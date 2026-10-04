// Procedural sprite sheets for the combat VFX (canvas-drawn, white-on-alpha so they can be tinted).
// Everything is cached by name. Safe to import from node (returns null textures without a DOM).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { sprite as baseSprite } from '../tex.js';

const isBrowser = typeof document !== 'undefined';
const cache = new Map();

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, { mip = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
function radial(g, s, stops, cx = s / 2, cy = s / 2, r = s / 2) {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [p, a] of stops) gr.addColorStop(p, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
}

// 4-point sparkle path (concave diamond) centred at 0,0 with radius 1.
export function star4Path(g, cx, cy, r, waist = 0.16) {
  const w = r * waist;
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.quadraticCurveTo(cx + w * 0.4, cy - w * 0.4, cx + r, cy);
  g.quadraticCurveTo(cx + w * 0.4, cy + w * 0.4, cx, cy + r);
  g.quadraticCurveTo(cx - w * 0.4, cy + w * 0.4, cx - r, cy);
  g.quadraticCurveTo(cx - w * 0.4, cy - w * 0.4, cx, cy - r);
  g.closePath();
}
export function diamondPath(g, cx, cy, r, sx = 0.72) {
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * sx, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * sx, cy); g.closePath();
}
export function crossPath(g, cx, cy, r, th = 0.36) {
  const t = r * th; const rad = t * 0.35;
  const rr = (x, y, w, h) => { g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad); g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); };
  g.beginPath(); rr(cx - t, cy - r, t * 2, r * 2); rr(cx - r, cy - t, r * 2, t * 2);
}
export function shieldPath(g, cx, cy, r) {
  g.beginPath();
  g.moveTo(cx - r * 0.85, cy - r * 0.85);
  g.quadraticCurveTo(cx, cy - r * 0.6, cx + r * 0.85, cy - r * 0.85);
  g.lineTo(cx + r * 0.85, cy);
  g.quadraticCurveTo(cx + r * 0.8, cy + r * 0.62, cx, cy + r);
  g.quadraticCurveTo(cx - r * 0.8, cy + r * 0.62, cx - r * 0.85, cy);
  g.closePath();
}

const MAKERS = {
  glow(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 1], [0.08, 0.85], [0.2, 0.45], [0.38, 0.17], [0.6, 0.05], [1, 0]]);
    return toTex(c);
  },
  dot(s = 64) {
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 1], [0.55, 1], [0.8, 0.5], [1, 0]]);
    return toTex(c);
  },
  flare(s = 256) { // hot core + anamorphic cross streaks + halo: the "impact flash" sprite
    const c = canvas(s); const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    radial(g, s, [[0, 1], [0.035, 0.95], [0.08, 0.4], [0.18, 0.1], [0.4, 0.02], [1, 0]]);
    const streak = (sx, sy, a) => {
      g.save(); g.translate(s / 2, s / 2); g.scale(sx, sy);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.3, `rgba(255,255,255,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s / 2, 0, Math.PI * 2); g.fill(); g.restore();
    };
    streak(1, 0.03, 1); streak(0.03, 1, 0.7); streak(0.55, 0.018, 0.5);
    g.save(); g.translate(s / 2, s / 2); g.rotate(Math.PI / 4); g.translate(-s / 2, -s / 2); g.scale(1, 1);
    g.restore();
    return toTex(c);
  },
  star4(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 0.8], [0.18, 0.38], [0.45, 0.08], [1, 0]]);
    g.shadowColor = 'white'; g.shadowBlur = s * 0.05; g.fillStyle = 'white';
    star4Path(g, s / 2, s / 2, s * 0.46, 0.22); g.fill();
    g.fillStyle = 'white'; star4Path(g, s / 2, s / 2, s * 0.22, 0.5); g.fill();
    return toTex(c);
  },
  diamond(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 0.7], [0.3, 0.25], [0.6, 0.05], [1, 0]]);
    g.shadowColor = 'white'; g.shadowBlur = s * 0.06; g.fillStyle = 'white';
    diamondPath(g, s / 2, s / 2, s * 0.38); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.moveTo(s / 2, s * 0.12); g.lineTo(s / 2 + s * 0.27, s / 2); g.lineTo(s / 2, s / 2); g.closePath(); g.fill();
    return toTex(c);
  },
  cross(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 0.6], [0.35, 0.22], [0.7, 0.04], [1, 0]]);
    g.shadowColor = 'white'; g.shadowBlur = s * 0.07; g.fillStyle = 'white';
    crossPath(g, s / 2, s / 2, s * 0.36); g.fill();
    return toTex(c);
  },
  streak(s = 128) { // velocity streak: u=0 tail (transparent) .. u=1 hot head; soft across
    const c = canvas(s); const g = c.getContext('2d'); const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = x / (s - 1); const v = (y / (s - 1)) * 2 - 1;
      const along = Math.pow(u, 1.6) * Math.min(1, (1 - u) * 14 + 0.0);
      const head = Math.exp(-((u - 0.9) * (u - 0.9)) * 90);
      const across = Math.exp(-v * v * 7);
      const a = Math.min(1, along * across * 0.9 + head * across * across);
      const i = (y * s + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return toTex(c);
  },
  chunk(s = 64) {
    const c = canvas(s); const g = c.getContext('2d'); const R = mulberry32(5);
    g.beginPath(); const n = 9;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const r = s * (0.28 + R() * 0.17); const x = s / 2 + Math.cos(a) * r; const y = s / 2 + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath();
    const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#d8d2c6'); gr.addColorStop(0.5, '#8e887c'); gr.addColorStop(1, '#3c3830');
    g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
    return toTex(c);
  },
  shard(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    g.shadowColor = 'white'; g.shadowBlur = s * 0.05;
    const gr = g.createLinearGradient(0, 0, s, 0); gr.addColorStop(0, 'rgba(255,255,255,.4)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.25)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(s / 2, s * 0.02); g.lineTo(s * 0.66, s * 0.5); g.lineTo(s / 2, s * 0.98); g.lineTo(s * 0.34, s * 0.5); g.closePath(); g.fill();
    return toTex(c);
  },
  coin(s = 128) {
    const c = canvas(s); const g = c.getContext('2d');
    const gr = g.createRadialGradient(s * 0.42, s * 0.38, s * 0.04, s / 2, s / 2, s * 0.46);
    gr.addColorStop(0, '#fff4b8'); gr.addColorStop(0.45, '#f4c23c'); gr.addColorStop(0.85, '#b9791a'); gr.addColorStop(1, '#6e420c');
    g.fillStyle = gr; g.beginPath(); g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2); g.fill();
    g.lineWidth = s * 0.05; g.strokeStyle = 'rgba(120,70,10,.85)'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2); g.stroke();
    g.lineWidth = s * 0.03; g.strokeStyle = 'rgba(255,240,170,.8)'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(120,70,10,.7)'; star4Path(g, s / 2, s / 2, s * 0.19, 0.3); g.fill();
    return toTex(c);
  },
  ring(s = 256) {
    const c = canvas(s); const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = s * 0.1; g.beginPath(); g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2); g.stroke();
    g.shadowColor = 'white'; g.shadowBlur = s * 0.05; g.strokeStyle = 'white'; g.lineWidth = s * 0.03;
    g.beginPath(); g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2); g.stroke();
    return toTex(c);
  },
  wisp(s = 128) { // teardrop soul flame, pointing up
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 0.5], [0.4, 0.14], [1, 0]]);
    const gr = g.createLinearGradient(0, s * 0.1, 0, s * 0.9); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.9)');
    g.fillStyle = gr; g.shadowColor = 'white'; g.shadowBlur = s * 0.06;
    g.beginPath(); g.moveTo(s / 2, s * 0.06); g.bezierCurveTo(s * 0.62, s * 0.4, s * 0.76, s * 0.55, s / 2, s * 0.86); g.bezierCurveTo(s * 0.24, s * 0.55, s * 0.38, s * 0.4, s / 2, s * 0.06); g.fill();
    return toTex(c);
  },
  smoke() { return baseSprite('smoke'); },
  // Danger glyph: outer ring with ticks and runes. Drawn white; tinted + rotated in shader.
  glyphOuter(s = 512) {
    const c = canvas(s); const g = c.getContext('2d'); const R = mulberry32(21); const m = s / 2;
    g.strokeStyle = 'white'; g.fillStyle = 'white'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = 'white'; g.shadowBlur = s * 0.012;
    g.lineWidth = s * 0.012; g.beginPath(); g.arc(m, m, s * 0.48, 0, Math.PI * 2); g.stroke();
    g.lineWidth = s * 0.006; g.beginPath(); g.arc(m, m, s * 0.455, 0, Math.PI * 2); g.stroke();
    g.lineWidth = s * 0.01; g.beginPath(); g.arc(m, m, s * 0.335, 0, Math.PI * 2); g.stroke();
    // tick marks between rings
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2; const long = i % 6 === 0; const r0 = s * 0.455; const r1 = s * (long ? 0.395 : 0.435);
      g.lineWidth = s * (long ? 0.01 : 0.005);
      g.beginPath(); g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); g.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); g.stroke();
    }
    // runes in the band
    g.lineWidth = s * 0.008;
    for (let i = 0; i < 24; i++) {
      const a = ((i + 0.5) / 24) * Math.PI * 2; g.save(); g.translate(m + Math.cos(a) * s * 0.365, m + Math.sin(a) * s * 0.365); g.rotate(a + Math.PI / 2);
      const h = s * 0.02;
      g.beginPath(); g.moveTo(0, -h); g.lineTo(0, h);
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) { const yy = (R() * 2 - 1) * h * 0.8; const dir = R() < 0.5 ? -1 : 1; g.moveTo(0, yy); g.lineTo(dir * h * (0.4 + R() * 0.5), yy + (R() - 0.3) * h * 0.8); }
      g.stroke(); g.restore();
    }
    return toTex(c);
  },
  glyphInner(s = 512) {
    const c = canvas(s); const g = c.getContext('2d'); const m = s / 2;
    g.strokeStyle = 'white'; g.fillStyle = 'white'; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = 'white'; g.shadowBlur = s * 0.012;
    g.lineWidth = s * 0.012; g.beginPath(); g.arc(m, m, s * 0.3, 0, Math.PI * 2); g.stroke();
    g.lineWidth = s * 0.007; g.beginPath(); g.arc(m, m, s * 0.255, 0, Math.PI * 2); g.stroke();
    // 5-point star (pentagram) + triangle: clearly "ritual circle"
    g.lineWidth = s * 0.011;
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + ((i * 2) % 5) * (Math.PI * 2 / 5); const x = m + Math.cos(a) * s * 0.3; const y = m + Math.sin(a) * s * 0.3; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.lineWidth = s * 0.008; g.beginPath();
    for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + i * (Math.PI * 2 / 3); const x = m + Math.cos(a) * s * 0.17; const y = m + Math.sin(a) * s * 0.17; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    // small circles on star points
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); g.beginPath(); g.arc(m + Math.cos(a) * s * 0.3, m + Math.sin(a) * s * 0.3, s * 0.018, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(m, m, s * 0.03, 0, Math.PI * 2); g.fill();
    return toTex(c);
  },
  cracks(s = 256) { // jagged radial cracks (ground impact): white on alpha
    const c = canvas(s); const g = c.getContext('2d'); const R = mulberry32(77); const m = s / 2;
    g.strokeStyle = 'white'; g.lineCap = 'round'; g.shadowColor = 'white'; g.shadowBlur = s * 0.02;
    const branch = (x, y, a, len, w, depth) => {
      g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
      let cx = x; let cy = y; let ca = a; const steps = 7;
      for (let i = 0; i < steps; i++) {
        ca += (R() - 0.5) * 0.7; cx += Math.cos(ca) * len / steps; cy += Math.sin(ca) * len / steps; g.lineTo(cx, cy);
        if (depth < 2 && R() < 0.28) { const sx = cx; const sy = cy; g.stroke(); branch(sx, sy, ca + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.5), len * 0.4, w * 0.6, depth + 1); g.beginPath(); g.moveTo(sx, sy); }
      }
      g.stroke();
    };
    const n = 11;
    for (let i = 0; i < n; i++) branch(m, m, (i / n) * Math.PI * 2 + R() * 0.4, s * (0.28 + R() * 0.2), s * 0.022, 0);
    radial(g, s, [[0, 0.5], [0.12, 0.2], [0.3, 0]]);
    return toTex(c);
  },
  scorch(s = 128) { // dark soft burn mark for normal blending
    const c = canvas(s); const g = c.getContext('2d');
    radial(g, s, [[0, 0.85], [0.4, 0.5], [0.75, 0.12], [1, 0]]);
    return toTex(c);
  },
};

export function vtex(name) {
  if (!isBrowser) return null;
  if (cache.has(name)) return cache.get(name);
  const mk = MAKERS[name];
  if (!mk) throw new Error(`unknown vfx texture ${name}`);
  const t = mk(); cache.set(name, t); return t;
}
