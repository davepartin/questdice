// Canvas art for the tray: the decal overlay on the leather inlay (stitching, runes, role icons, the
// two-handed bracket) and the class sigil plaque. Everything is vector drawing, redone cheaply on setHero().

import { drawIcon, starPath } from './faces.js';
import { mulberry32 } from '../noise.js';

export const CLASS_THEME = {
  knight: { name: 'Knight', leather: 0xd24848, trim: 0xe8d6a8, glow: '#ff6a52', glowHex: 0xff6a52, sigil: 'knight' },
  ranger: { name: 'Ranger', leather: 0x5aa05a, trim: 0xd8dca0, glow: '#8dff9c', glowHex: 0x8dff9c, sigil: 'ranger' },
  wizard: { name: 'Wizard', leather: 0x4a6ae0, trim: 0xd8dcff, glow: '#8ab4ff', glowHex: 0x8ab4ff, sigil: 'wizard' },
  dwarf: { name: 'Dwarf', leather: 0xd0803c, trim: 0xf0c890, glow: '#ffa24a', glowHex: 0xffa24a, sigil: 'dwarf' },
  bard: { name: 'Bard', leather: 0x30aaa6, trim: 0xf6e0a0, glow: '#6ff5de', glowHex: 0x6ff5de, sigil: 'bard' },
};
export const SLOT_COLOR = { weapon: [0xff4d4d, '#ff4d4d'], head: [0xffe9b8, '#ffe9b8'], feet: [0xffe9b8, '#ffe9b8'], hand: [0xb8c4d8, '#b8c4d8'], heart: [0xffc23d, '#ffc23d'], special: [0xb07dff, '#b07dff'] };

const gold = (c, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fff0b8'); g.addColorStop(0.5, '#d9a73c'); g.addColorStop(1, '#8a5a14'); return g; };

function rune(c, x, y, h, rnd) {
  c.beginPath();
  c.moveTo(x, y - h / 2); c.lineTo(x, y + h / 2);
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const yy = y - h / 2 + (0.15 + rnd() * 0.5) * h; const dir = rnd() < 0.5 ? -1 : 1; const len = h * (0.25 + rnd() * 0.25);
    c.moveTo(x, yy); c.lineTo(x + dir * len, yy + (rnd() < 0.5 ? -1 : 1) * len * 0.8);
  }
  c.stroke();
}

/** Weapon icon name for an equipped weapon id. */
export const weaponIcon = (id) => ({ fists: 'fist', dagger: 'dagger', bracer: 'bracer', sword: 'sword', shield: 'shield', spear: 'spear', bow: 'bow', longsword: 'longsword', staff: 'staff' }[id] || 'sword');

/**
 * @param o { size, FH, pitch, hero, theme, twoHanded, slotPos(slot)->{x,z}, dishR }
 * @returns { albedo: canvas, emissive: canvas }
 */
export function paintDecals({ size, FH, pitch, theme, hero, twoHanded, dishR, weaponIds }) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const A = mk(); const E = mk();
  const a = A.getContext('2d'); const e = E.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, size, size);
  const k = size / (2 * FH); // px per metre
  const X = (x) => (x + FH) * k; const Z = (z) => (z + FH) * k;
  const rnd = mulberry32(99);
  const glow = theme.glow;

  // --- gold stitching ring around every socket
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const cx = X((c - 1) * pitch); const cz = Z((r - 1) * pitch);
    for (const [rad, dash, w] of [[(dishR + 0.085) * k, [0.03 * k, 0.025 * k], 0.011 * k], [(dishR + 0.16) * k, [0.012 * k, 0.02 * k], 0.006 * k]]) {
      a.save(); a.strokeStyle = 'rgba(0,0,0,0.5)'; a.lineWidth = w + 2; a.setLineDash(dash); a.beginPath(); a.arc(cx + 1.5, cz + 1.5, rad, 0, Math.PI * 2); a.stroke(); a.restore();
      a.save(); a.strokeStyle = '#d6a845'; a.lineWidth = w; a.setLineDash(dash); a.beginPath(); a.arc(cx, cz, rad, 0, Math.PI * 2); a.stroke(); a.restore();
    }
  }
  // --- margin names: written along the border (reads upward on the left edge, downward on the right); weapon and fist icons sit at matching heights on both sides
  const ox = FH - 0.16; // icon column offset
  const wL = weaponIcon(weaponIds?.NW || 'sword'); const wR = weaponIcon(weaponIds?.NE || 'sword');
  const FONT = (fs) => `800 ${fs * k}px "Trebuchet MS", "Segoe UI", sans-serif`;
  const T = (lines, fs) => { a.font = FONT(fs); return { lines, fs, L: Math.max(...lines.map((t) => a.measureText(t).width + t.length * 0.012 * k)) / k }; };
  const IC = 0.3; const GAP = 0.05; const ZW = -(FH - 0.36); // weapon icons sit at the top corners
  const units = [];
  { // head and feet: icon then name, centred on the top and bottom margins
    for (const [ic, nm, z, sd] of [['helmet', 'HEAD', -ox, 't'], ['boots', 'FEET', ox, 'b']]) {
      const t = T([nm], 0.11); const U = IC + GAP + t.L;
      units.push({ side: sd, x: 0, z, parts: [{ icon: ic, size: 0.31, at: -U / 2 + IC / 2 }, { text: t, at: U / 2 - t.L / 2 }] });
    }
  }
  for (const [sd, flip, wi, wname, hand] of [['l', false, wL, 'LEFT', 'LEFT HAND'], ['r', true, wR, 'RIGHT', 'RIGHT HAND']]) {
    const ts = T(['STRENGTH', hand], 0.1); const tw = T(['WEAPON', wname], 0.1);
    // both edges read upward from the middle: fist, STRENGTH / hand, WEAPON / side, weapon icon in the corner
    const c1 = -(0.17 + ts.L / 2); const c2 = c1 - ts.L / 2 - 0.07 - tw.L / 2; const zi = c2 - tw.L / 2 - GAP - IC / 2;
    units.push({ side: sd, x: sd === 'l' ? -ox : ox, flip, parts: [
      { icon: 'gauntlet', size: 0.3, at: 0 }, { text: ts, at: c1 }, { text: tw, at: c2 }, { icon: wi, size: IC, at: zi },
    ] });
  }
  for (const sd of ['l', 'r']) { // talent dice: names only, no symbol
    const t = T([sd === 'l' ? 'TALENT ONE' : 'TALENT TWO'], 0.11);
    units.push({ side: sd, x: sd === 'l' ? -ox : ox, parts: [{ text: t, at: pitch + 0.25 }] });
  }
  const UNITS = units;
  for (const u of UNITS) { // span along the edge, so the runes keep clear
    const c0 = u.side === 't' || u.side === 'b' ? u.x : 0; const sp = u.parts.map((p) => [p.at - (p.text ? p.text.L / 2 : IC / 2), p.at + (p.text ? p.text.L / 2 : IC / 2)]);
    u.lo = c0 + Math.min(...sp.map((q) => q[0])) - 0.08; u.hi = c0 + Math.max(...sp.map((q) => q[1])) + 0.08;
  }
  // --- frame-hugging gold line + runic band in the margin
  a.save(); a.strokeStyle = '#c99a36'; a.lineWidth = 0.012 * k; a.setLineDash([]);
  const mI = FH - 0.045; a.strokeRect(X(-mI), Z(-mI), 2 * mI * k, 2 * mI * k); a.restore();
  a.save(); a.strokeStyle = '#8a6a2a'; a.lineWidth = 0.006 * k; const mI2 = FH - 0.075; a.strokeRect(X(-mI2), Z(-mI2), 2 * mI2 * k, 2 * mI2 * k); a.restore();
  for (const side of ['t', 'b', 'l', 'r']) {
    for (let i = 0; i < 26; i++) {
      const u = -FH + 0.32 + (i / 25) * (2 * FH - 0.64);
      const off = FH - 0.11;
      const x = side === 'l' ? -off : side === 'r' ? off : u; const z = side === 't' ? -off : side === 'b' ? off : u;
      if (UNITS.some((n) => n.side === side && (side === 't' || side === 'b' ? x : z) > n.lo && (side === 't' || side === 'b' ? x : z) < n.hi)) continue; // leave room for the icons and names
      const rr = mulberry32(i * 31 + side.charCodeAt(0));
      for (const [c, col, lw] of [[a, '#a67c2e', 0.007 * k], [e, glow, 0.007 * k]]) {
        c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.globalAlpha = c === e ? 0.55 : 1;
        c.translate(X(x), Z(z)); if (side === 'l' || side === 'r') c.rotate(Math.PI / 2);
        rune(c, 0, 0, 0.1 * k, rr); c.restore();
      }
    }
  }
  // --- rosettes in the gaps between sockets; hearts around the centre die
  for (const gx of [-1.5, -0.5, 0.5, 1.5]) for (const gz of [-1.5, -0.5, 0.5, 1.5]) {
    const x = gx * pitch; const z = gz * pitch;
    const inner = Math.abs(gx) < 1 && Math.abs(gz) < 1;
    a.save(); a.translate(X(x), Z(z));
    if (inner) {
      a.fillStyle = 'rgba(0,0,0,0.55)'; drawIcon(a, 'heart', 1.5, 2, 0.205 * k); a.fillStyle = gold(a, -0.1 * k, 0.1 * k); drawIcon(a, 'heart', 0, 0, 0.19 * k);
      e.save(); e.translate(X(x), Z(z)); e.fillStyle = '#ff5a30'; e.globalAlpha = 0.35; drawIcon(e, 'heart', 0, 0, 0.17 * k); e.restore();
    } else {
      a.strokeStyle = '#8a6a2a'; a.lineWidth = 0.008 * k; a.beginPath(); a.rect(-0.07 * k, -0.07 * k, 0.14 * k, 0.14 * k); a.save(); a.rotate(Math.PI / 4); a.stroke(); a.restore();
    }
    a.restore();
  }
  // --- role icons in the margins
  const iconAt = (name, x, z, size, flip, tint = null, glowCol = glow) => {
    for (const [c, mode] of [[a, 'a'], [e, 'e']]) {
      c.save(); c.translate(X(x), Z(z)); if (flip) c.scale(-1, 1);
      const s = size * k;
      if (mode === 'a') {
        c.fillStyle = 'rgba(0,0,0,0.65)'; drawIcon(c, name, 0.012 * k, 0.014 * k, s * 1.06);
        c.fillStyle = tint || gold(c, -s / 2, s / 2); drawIcon(c, name, 0, 0, s);
        c.strokeStyle = 'rgba(255,248,210,0.55)'; c.lineWidth = Math.max(1, 0.004 * k); c.save(); c.translate(-0.004 * k, -0.004 * k); c.globalCompositeOperation = 'source-over'; c.restore();
      } else {
        c.fillStyle = glowCol; c.globalAlpha = 0.5; drawIcon(c, name, 0, 0, s * 0.98);
      }
      c.restore();
    }
  };
  for (const n of UNITS) {
    const horiz = n.side === 't' || n.side === 'b'; const rot = horiz ? 0 : -Math.PI / 2;
    // on the left edge the text reads upward, so 'at' (measured along +z) is mirrored for it
    for (const p of n.parts) {
      const along = p.at; const px = horiz ? n.x + along : n.x; const pz = horiz ? n.z : along;
      if (p.icon) { iconAt(p.icon, px, pz, p.size, !!n.flip || p.flip, null, p.glow || glow); continue; }
      const t = p.text; a.save(); a.translate(X(px), Z(pz)); a.rotate(rot); a.textAlign = 'center'; a.textBaseline = 'middle'; a.font = FONT(t.fs);
      if (a.letterSpacing !== undefined) a.letterSpacing = `${0.012 * k}px`;
      t.lines.forEach((ln, i) => { const yy = (i - (t.lines.length - 1) / 2) * t.fs * 1.08 * k; a.lineJoin = 'round'; a.strokeStyle = 'rgba(0,0,0,0.85)'; a.lineWidth = 0.02 * k; a.strokeText(ln, 0, yy); a.fillStyle = '#f3d98a'; a.fillText(ln, 0, yy); });
      a.restore();
    }
  }

  // --- two-handed bracket: a gold bar along the far margin linking both weapon sockets
  if (twoHanded) {
    const zb = -(FH - 0.115); const x0 = -pitch; const x1 = pitch;
    for (const [c, mode] of [[a, 'a'], [e, 'e']]) {
      c.save();
      const hook = (xs, dir) => {
        const p = new Path2D();
        p.moveTo(X(xs), Z(zb)); p.lineTo(X(xs), Z(zb + 0.06)); p.quadraticCurveTo(X(xs), Z(-pitch - dishR - 0.08), X(xs + dir * 0.0), Z(-pitch - dishR - 0.02));
        return p;
      };
      if (mode === 'a') {
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (const [lw, col] of [[0.05 * k, 'rgba(0,0,0,0.55)'], [0.04 * k, gold(c, Z(zb) - 20, Z(zb) + 20)], [0.016 * k, '#fff3c0']]) {
          c.strokeStyle = col; c.lineWidth = lw;
          c.beginPath(); c.moveTo(X(x0), Z(zb)); c.lineTo(X(-0.26), Z(zb)); c.moveTo(X(0.26), Z(zb)); c.lineTo(X(x1), Z(zb)); c.stroke();
          c.stroke(hook(x0, 1)); c.stroke(hook(x1, -1));
        }
        // end knots
        for (const xs of [x0, x1]) { c.fillStyle = gold(c, Z(zb) - 14, Z(zb) + 14); c.beginPath(); c.arc(X(xs), Z(zb), 0.032 * k, 0, Math.PI * 2); c.fill(); }
      } else {
        c.strokeStyle = glow; c.globalAlpha = 0.9; c.lineWidth = 0.012 * k; c.lineCap = 'round';
        c.beginPath(); c.moveTo(X(x0), Z(zb)); c.lineTo(X(-0.26), Z(zb)); c.moveTo(X(0.26), Z(zb)); c.lineTo(X(x1), Z(zb)); c.stroke();
        c.stroke(hook(x0, 1)); c.stroke(hook(x1, -1));
      }
      c.restore();
    }
  }
  return { albedo: A, emissive: E };
}

/** Class sigil plaque (front apron). */
export function paintSigil({ theme, w = 1024, h = 400 }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, w, h);
  // inlaid panel with brass border
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a1c12'); bg.addColorStop(1, '#120b07');
  g.fillStyle = bg; g.fillRect(14, 14, w - 28, h - 28);
  g.strokeStyle = '#d9a73c'; g.lineWidth = 6; g.strokeRect(22, 22, w - 44, h - 44);
  g.strokeStyle = '#7a5416'; g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
  const cx = w / 2; const cy = h / 2;
  // laurel / flourish lines left and right
  for (const s of [-1, 1]) {
    g.strokeStyle = theme.glow; g.globalAlpha = 0.8; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx + s * 130, cy); g.lineTo(cx + s * 420, cy); g.stroke();
    g.beginPath(); g.moveTo(cx + s * 300, cy); g.lineTo(cx + s * 330, cy - 30); g.moveTo(cx + s * 360, cy); g.lineTo(cx + s * 390, cy - 26); g.moveTo(cx + s * 300, cy); g.lineTo(cx + s * 330, cy + 30); g.moveTo(cx + s * 360, cy); g.lineTo(cx + s * 390, cy + 26); g.stroke();
    g.globalAlpha = 1;
  }
  const S = 250;
  const goldF = () => { const f = g.createLinearGradient(0, cy - S / 2, 0, cy + S / 2); f.addColorStop(0, '#fff0b8'); f.addColorStop(0.5, '#e0b040'); f.addColorStop(1, '#8a5a14'); return f; };
  g.save(); g.translate(cx, cy);
  const line = (w2, col) => { g.lineWidth = w2; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; };
  switch (theme.sigil) {
    case 'knight': {
      g.fillStyle = goldF(); drawIcon(g, 'shield', 0, 8, S);
      g.fillStyle = '#3a0a0e'; drawIcon(g, 'shield', 0, 8, S * 0.82);
      g.fillStyle = goldF(); drawIcon(g, 'sword', 0, 8, S * 0.7);
      break;
    }
    case 'ranger': {
      g.fillStyle = goldF(); drawIcon(g, 'bow', 0, 0, S);
      g.fillStyle = theme.glow; g.globalAlpha = 0.85;
      for (const s of [-1, 1]) { g.save(); g.translate(s * 120, 40); g.rotate(s * 0.5); g.beginPath(); g.ellipse(0, 0, 18, 46, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.globalAlpha = 1; break;
    }
    case 'wizard': {
      g.fillStyle = goldF(); g.save(); g.scale(2.5, 2.5); g.translate(-50, -50); g.fill(starPath(5, 48, 20)); g.restore();
      line(5, theme.glow); g.beginPath(); g.arc(0, 0, 125, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#10142a'; g.beginPath(); g.arc(0, 8, 28, 0, Math.PI * 2); g.fill(); g.fillStyle = goldF(); g.beginPath(); g.arc(0, 8, 14, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'dwarf': {
      line(26, '#d9a73c'); g.beginPath(); g.moveTo(-100, -90); g.lineTo(100, 90); g.moveTo(100, -90); g.lineTo(-100, 90); g.stroke();
      g.fillStyle = goldF(); for (const s of [-1, 1]) { g.save(); g.translate(s * 100, -90); g.rotate(s * 0.9); g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(s * 60, -20, s * 66, 40); g.lineTo(s * 20, 20); g.lineTo(0, 30); g.fill(); g.restore(); }
      g.fillStyle = '#2a140a'; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill(); g.fillStyle = goldF(); drawIcon(g, 'helmet', 0, 0, 78);
      break;
    }
    default: { // bard: lute
      g.fillStyle = goldF(); g.beginPath(); g.ellipse(-20, 50, 70, 84, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a140a'; g.beginPath(); g.arc(-20, 50, 24, 0, Math.PI * 2); g.fill();
      line(14, '#d9a73c'); g.beginPath(); g.moveTo(20, 10); g.lineTo(104, -96); g.stroke();
      g.fillStyle = goldF(); g.fillRect(96, -118, 34, 30);
      g.fillStyle = theme.glow; for (const [x, y] of [[-130, -50], [140, 40]]) { g.beginPath(); g.ellipse(x, y, 16, 12, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(x + 11, y - 52, 5, 52); }
    }
  }
  g.restore();
  return c;
}
