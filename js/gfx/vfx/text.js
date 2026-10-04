// Floating combat numbers and screen banners. Canvas-drawn (thick stroke, vertical gradient, glow, icons)
// on pooled billboards: pop-in with overshoot, rise with ease-out, drift, fade. Icons are vector paths so
// nothing depends on emoji fonts.

import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { star4Path, diamondPath, crossPath, shieldPath } from './textures.js';

const FONT = "'Archivo Black','Oxanium','Arial Black','Impact','Liberation Sans',sans-serif";

const STYLES = {
  dmg:    { grad: ['#fffbe0', '#ffd34a', '#ff6a1c', '#c4120c'], stroke: '#1c0204', glow: '#ff3a14', hdr: 1.35, size: 1, rise: 1.0, life: 1.15 },
  crit:   { grad: ['#ffffff', '#fff1a0', '#ffb81c', '#e05a00'], stroke: '#3a0a00', glow: '#ffc233', hdr: 1.9, size: 1.45, rise: 1.25, life: 1.6, burst: true },
  pierce: { grad: ['#fbf3ff', '#d2aaff', '#9b5cff', '#4a1fa8'], stroke: '#10052a', glow: '#b07dff', hdr: 1.5, size: 1.1, rise: 1.0, life: 1.2, icon: 'diamond' },
  block:  { grad: ['#f2fcff', '#8fd8ff', '#3a98ff', '#1650b0'], stroke: '#03112a', glow: '#4db4ff', hdr: 1.4, size: 1.0, rise: 0.85, life: 1.1, icon: 'shield' },
  heal:   { grad: ['#f4ffe6', '#9af0b0', '#35d27c', '#0f8a48'], stroke: '#03200f', glow: '#45e08b', hdr: 1.4, size: 1.0, rise: 1.1, life: 1.25, icon: 'cross' },
  magic:  { grad: ['#fffde8', '#ffeb7a', '#ffc21f', '#cf8200'], stroke: '#2a1c00', glow: '#ffd23d', hdr: 1.5, size: 0.95, rise: 1.0, life: 1.2, icon: 'star' },
  gold:   { grad: ['#fff8d0', '#ffd96a', '#f0b43c', '#a8761c'], stroke: '#2a1800', glow: '#f0b43c', hdr: 1.4, size: 0.9, rise: 1.0, life: 1.2, icon: 'coin' },
  miss:   { grad: ['#f2f4f8', '#b8bfcc', '#8890a2', '#5a6272'], stroke: '#0a0c12', glow: '#8890a2', hdr: 1.0, size: 0.8, rise: 0.6, life: 0.9, italic: true },
};

function drawIcon(g, kind, cx, cy, r, st) {
  g.save();
  g.lineJoin = 'round';
  const path = { diamond: () => diamondPath(g, cx, cy, r * 1.05, 0.7), cross: () => crossPath(g, cx, cy, r, 0.4), star: () => star4Path(g, cx, cy, r * 1.15, 0.28), shield: () => shieldPath(g, cx, cy, r * 0.95), coin: () => { g.beginPath(); g.arc(cx, cy, r * 0.95, 0, Math.PI * 2); } }[kind];
  path();
  g.shadowColor = st.glow; g.shadowBlur = r * 0.55; g.lineWidth = r * 0.5; g.strokeStyle = st.stroke; g.stroke(); g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, cy - r, 0, cy + r); gr.addColorStop(0, st.grad[0]); gr.addColorStop(0.45, st.grad[1]); gr.addColorStop(1, st.grad[2]);
  g.fillStyle = gr; path(); g.fill();
  if (kind === 'coin') { g.lineWidth = r * 0.12; g.strokeStyle = 'rgba(120,70,10,.8)'; g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

function drawNumber(c, text, kind) {
  const st = STYLES[kind] || STYLES.dmg; const g = c.getContext('2d'); const W = c.width; const H = c.height;
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.lineJoin = 'round'; g.miterLimit = 2;
  let fs = H * 0.62;
  const font = (s) => `${st.italic ? 'italic ' : ''}900 ${s}px ${FONT}`;
  g.font = font(fs);
  const iconW = () => (st.icon ? fs * 0.78 : 0);
  let tw = g.measureText(text).width + iconW();
  const maxW = W * 0.9;
  if (tw > maxW) { fs *= maxW / tw; g.font = font(fs); tw = g.measureText(text).width + iconW(); }
  const x0 = (W - tw) / 2; const base = H * 0.5 + fs * 0.36;
  const lw = Math.max(10, fs * 0.2);
  if (st.burst) { // starburst behind a crit
    g.save(); g.translate(W / 2, H * 0.5);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.5); gr.addColorStop(0, 'rgba(255,230,120,.55)'); gr.addColorStop(1, 'rgba(255,160,30,0)');
    g.fillStyle = gr;
    for (let i = 0; i < 14; i++) { g.rotate((Math.PI * 2) / 14); g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.5, -fs * 0.06); g.lineTo(W * 0.5, fs * 0.06); g.closePath(); g.fill(); }
    g.restore();
  }
  let x = x0;
  if (st.icon) { drawIcon(g, st.icon, x + fs * 0.34, H * 0.5 + fs * 0.02, fs * 0.3, st); x += iconW(); }
  // glow
  g.save(); g.shadowColor = st.glow; g.shadowBlur = fs * 0.22; g.fillStyle = st.glow; g.globalAlpha = 0.9; g.fillText(text, x, base); g.restore();
  // dark outline
  g.lineWidth = lw; g.strokeStyle = st.stroke; g.strokeText(text, x, base);
  // gradient fill
  const gr = g.createLinearGradient(0, base - fs * 0.75, 0, base + fs * 0.02);
  gr.addColorStop(0, st.grad[0]); gr.addColorStop(0.3, st.grad[1]); gr.addColorStop(0.62, st.grad[2]); gr.addColorStop(1, st.grad[3]);
  g.fillStyle = gr; g.fillText(text, x, base);
  // top bevel highlight and bottom inner shade
  g.save(); g.beginPath(); g.rect(0, base - fs * 0.8, W, fs * 0.36); g.clip();
  g.lineWidth = Math.max(2, fs * 0.03); g.strokeStyle = 'rgba(255,255,255,.55)'; g.strokeText(text, x, base - fs * 0.012); g.restore();
  g.save(); g.beginPath(); g.rect(0, base - fs * 0.12, W, fs * 0.2); g.clip();
  g.lineWidth = Math.max(2, fs * 0.04); g.strokeStyle = 'rgba(0,0,0,.28)'; g.strokeText(text, x, base - fs * 0.02); g.restore();
}

const easeOutBack = (t, s = 2.2) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

export function createText(stage, scene) {
  const cam = stage.camera;
  const geo = new THREE.PlaneGeometry(1, 1);
  const pool = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(geo, m); mesh.visible = false; mesh.renderOrder = 100; mesh.frustumCulled = false;
    scene.add(mesh);
    pool.push({ mesh, c, tex, m, busy: false, t: 0, life: 1, base: new THREE.Vector3(), dx: 0, rise: 1, size: 1, hdr: 1, crit: false, delay: 0 });
  }
  let rngSeq = 1; const rng = mulberry32(1234);
  const _q = new THREE.Quaternion(); const _v = new THREE.Vector3(); const _cp = new THREE.Vector3();

  function damageNumber(pos, text, { kind = 'dmg', size = 1, delay = 0, seed } = {}) {
    let slot = pool.find((p) => !p.busy);
    if (!slot) { slot = pool.reduce((a, b) => (a.t > b.t ? a : b)); }
    const st = STYLES[kind] || STYLES.dmg;
    drawNumber(slot.c, String(text), kind); slot.tex.needsUpdate = true;
    const p = pos.isVector3 ? pos : new THREE.Vector3(pos[0], pos[1], pos[2]);
    slot.base.copy(p);
    // stack: lift above numbers that appeared here very recently
    let stack = 0;
    for (const o of pool) if (o.busy && o !== slot && o.t < 0.5 && o.base.distanceToSquared(p) < 0.8) stack++;
    slot.base.y += stack * 0.45 * size;
    const r = seed != null ? mulberry32(seed) : rng; rngSeq++;
    slot.dx = (r() - 0.5) * 0.9; slot.dxz = (r() - 0.5) * 0.3;
    slot.rise = st.rise * (0.9 + r() * 0.25); slot.size = st.size * size; slot.hdr = st.hdr; slot.life = st.life; slot.kind = kind;
    slot.t = -delay; slot.busy = true; slot.crit = kind === 'crit'; slot.m.opacity = 0; slot.mesh.visible = false; slot.rot = (r() - 0.5) * 0.18;
    return new Promise((res) => stage.wait(delay + 0.08).then(res));
  }

  function update(dt) {
    cam.getWorldQuaternion(_q); cam.getWorldPosition(_cp);
    const aspect = cam.aspect;
    for (const s of pool) {
      if (!s.busy) continue;
      s.t += dt;
      if (s.t < 0) continue;
      const t = s.t; const L = s.life;
      if (t >= L) { s.busy = false; s.mesh.visible = false; continue; }
      s.mesh.visible = true;
      const k = t / L;
      // pop with overshoot, settle, then a slow swell as it fades
      let sc;
      if (t < 0.075) sc = 0.15 + 1.18 * easeOutBack(t / 0.075, 1.4);
      else if (t < 0.2) sc = 1.28 - 0.28 * ((t - 0.075) / 0.125);
      else sc = 1 + 0.06 * (k - 0.2) / 0.8;
      if (s.crit && t < 0.3) sc *= 1 + 0.12 * Math.sin(t * 60) * (1 - t / 0.3);
      // rise: fast then easing
      const rise = s.rise * 1.1 * (1 - Math.exp(-t * 3.4));
      const dist = s.base.distanceTo(_cp);
      const phone = aspect < 1.2 ? Math.max(0.7, aspect / 1.2 + 0.25) : 1; // portrait already magnifies (narrow hfov)
      const unit = (dist / 11) * phone; // keep a stable on-screen size at any camera distance
      const h = 1.15 * s.size * unit * sc;
      s.mesh.scale.set(h * 2, h, 1);
      _v.set(s.dx * (1 - Math.exp(-t * 3)) * unit, rise * unit, s.dxz * t).add(s.base);
      if (s.crit && t < 0.25) { _v.x += Math.sin(t * 150) * 0.03 * unit; _v.y += Math.cos(t * 130) * 0.02 * unit; }
      s.mesh.position.copy(_v);
      s.mesh.quaternion.copy(_q); s.mesh.rotateZ(s.rot * (t < 0.2 ? 1 - t / 0.2 : 0) + s.rot * 0.3);
      const op = Math.min(1, t / 0.03) * (k > 0.62 ? 1 - ((k - 0.62) / 0.38) ** 1.5 : 1);
      s.m.opacity = op;
      s.m.color.setScalar(s.hdr * (t < 0.12 ? 1.5 - 0.5 * (t / 0.12) : 1));
    }
  }

  // ---- banner (camera-space, big, brief): "WIND-UP!", "VICTORY", "ROUND 3"
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 256;
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
  const bm = new THREE.MeshBasicMaterial({ map: btex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const bmesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), bm); bmesh.renderOrder = 200; bmesh.visible = false; bmesh.frustumCulled = false;
  cam.add(bmesh);
  let bstate = null;
  const BSTYLE = {
    warn: { grad: ['#ffe8d0', '#ff9a4a', '#ff3a1a', '#8a0a0a'], stroke: '#200404', glow: '#ff3a1a', hdr: 1.5 },
    win: { grad: ['#fffbe0', '#ffe27a', '#ffb81c', '#b86a00'], stroke: '#2a1800', glow: '#ffd23d', hdr: 1.6 },
    info: { grad: ['#f2fcff', '#a8dcff', '#4db4ff', '#1a5ab8'], stroke: '#04122a', glow: '#4db4ff', hdr: 1.4 },
    lose: { grad: ['#e8e0f0', '#9a8ab8', '#5a4a78', '#2a2040'], stroke: '#08040e', glow: '#6a4aa8', hdr: 1.1 },
  };
  function banner(text, { kind = 'warn', dur = 1.4, y = 0.22 } = {}) {
    const st = BSTYLE[kind] || BSTYLE.warn; const g = bc.getContext('2d');
    g.clearRect(0, 0, 1024, 256); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    let fs = 150; g.font = `900 ${fs}px ${FONT}`;
    const spaced = String(text).toUpperCase();
    while (g.measureText(spaced).width + spaced.length * 8 > 960 && fs > 40) { fs -= 6; g.font = `900 ${fs}px ${FONT}`; }
    if ('letterSpacing' in g) g.letterSpacing = '8px';
    g.save(); g.shadowColor = st.glow; g.shadowBlur = 40; g.fillStyle = st.glow; g.fillText(spaced, 512, 128); g.restore();
    g.lineWidth = fs * 0.16; g.strokeStyle = st.stroke; g.strokeText(spaced, 512, 128);
    const gr = g.createLinearGradient(0, 128 - fs * 0.5, 0, 128 + fs * 0.5);
    gr.addColorStop(0, st.grad[0]); gr.addColorStop(0.35, st.grad[1]); gr.addColorStop(0.65, st.grad[2]); gr.addColorStop(1, st.grad[3]);
    g.fillStyle = gr; g.fillText(spaced, 512, 128);
    btex.needsUpdate = true;
    bstate = { t: 0, dur, hdr: st.hdr, y };
    return stage.wait(0.15);
  }
  function updateBanner(dt) {
    if (!bstate) return;
    const s = bstate; s.t += dt; const k = s.t / s.dur;
    if (k >= 1) { bmesh.visible = false; bstate = null; return; }
    bmesh.visible = true;
    const fov = Math.tan((cam.fov * Math.PI) / 360) * 2; const d = 2;
    const hh = fov * d; const ww = hh * cam.aspect;
    const w = Math.min(ww * 0.8, hh * 3.2);
    const pop = s.t < 0.18 ? easeOutBack(s.t / 0.18, 2.4) : 1;
    const sc = w * pop * (1 + 0.04 * Math.sin(s.t * 3));
    bmesh.scale.set(sc, sc, 1);
    bmesh.position.set(0, hh * s.y, -d);
    bm.opacity = Math.min(1, s.t / 0.06) * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
    bm.color.setScalar(s.hdr);
  }
  return { damageNumber, banner, bmesh, update(dt) { update(dt); updateBanner(dt); }, pool };
}
