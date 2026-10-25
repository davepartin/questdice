import { HEADS } from './heads.js';
await import('../diceboard/diceboard.js'); // builds the real Head card (window.SL) off-screen
const grid = document.getElementById('grid');
const board = new Image(); board.src = '../../../../../assets/tutorial/board-icons.webp'; await board.decode();
const P = (k) => new Path2D(HEADS[k].d);
function slot(k) { // crop of the real board around the Head slot, old carving covered, new icon carved in
  const c = document.createElement('canvas'); c.width = c.height = 320; const g = c.getContext('2d');
  g.drawImage(board, 310, 54, 180, 180, 0, 0, 320, 320);
  const cx = 160, cy = 155, r = 98; const st = g.createRadialGradient(cx, cy - 20, 10, cx, cy, r); st.addColorStop(0, '#4a423b'); st.addColorStop(1, '#2c2622');
  if (k !== 'current') { g.fillStyle = st; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
  else return c;
  g.save(); g.translate(cx - 50, cy - 50); g.translate(50, 50); g.scale(1.0, 1.0); g.translate(-50, -50);
  g.save(); g.translate(0, 2.5); g.fillStyle = '#120c08cc'; g.fill(P(k), 'evenodd'); g.restore(); // carved shadow
  const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, '#d9a874'); gr.addColorStop(1, '#a8703f'); g.fillStyle = gr; g.fill(P(k), 'evenodd'); g.restore();
  return c;
}
function face(k) { // ivory d4 face, number on top, icon as the face mark (where a watermark would sit)
  const c = document.createElement('canvas'); c.width = c.height = 320; const g = c.getContext('2d');
  g.translate(160, 172); const tri = new Path2D('M0 -140 L136 96 L-136 96 Z');
  const iv = g.createLinearGradient(0, -140, 0, 96); iv.addColorStop(0, '#fbf3e2'); iv.addColorStop(1, '#ddcfb3'); g.fillStyle = iv; g.fill(tri);
  g.lineWidth = 6; g.strokeStyle = '#b9a785'; g.stroke(tri);
  g.save(); g.translate(-48, -22); g.scale(.96, .96); g.fillStyle = '#7a4a1e2e'; g.fill(P(k), 'evenodd'); g.restore(); // watermark
  g.fillStyle = '#3b2a1c'; g.font = '800 64px Oxanium'; g.textAlign = 'center'; g.fillText('4', 0, -40);
  return c;
}
function iconArt(k) { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 40, 0, 470); gr.addColorStop(0, '#ffe2b0'); gr.addColorStop(.5, '#d39a52'); gr.addColorStop(1, '#7a4a1e'); g.fillStyle = gr;
  g.shadowColor = '#000a'; g.shadowBlur = 18; g.shadowOffsetY = 10; g.translate(46, 46); g.scale(4.2, 4.2); g.fill(P(k), 'evenodd'); return c.toDataURL(); }
const head = window.SL.find((s) => s.k === 'N').card;
const only = new URLSearchParams(location.search).get('only')?.split(',');
for (const k of Object.keys(HEADS).filter((k) => !only || only.includes(k))) {
  const n = document.createElement('div'); n.className = 'nm2' + (k === 'current' ? ' cur' : ''); n.innerHTML = `<b>${HEADS[k].name}</b><small>${HEADS[k].note}</small>`;
  const card = head.cloneNode(true); card.querySelector('.gi').src = iconArt(k); const box = document.createElement('div'); box.className = 'cardbox'; box.append(card);
  grid.append(n, slot(k), face(k), box);
}
await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); document.body.dataset.sheet = 1;
