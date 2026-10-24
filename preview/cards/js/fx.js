// Background embers + burst sparks on a single canvas. Cheap on purpose.
import { reduced } from './dom.js';
let cv, g, W = 0, H = 0, dpr = 1;
const parts = [];
const rand = (a, b) => a + Math.random() * (b - a);

export function startFx(canvas) {
  cv = canvas; g = cv.getContext('2d');
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.floor(innerWidth * dpr); H = cv.height = Math.floor(innerHeight * dpr);
    cv.style.width = '100%'; cv.style.height = '100%';
  };
  resize(); addEventListener('resize', resize);
  const count = reduced() ? 0 : 38;
  for (let i = 0; i < count; i++) parts.push(ember(true));
  let last = performance.now();
  const frame = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; p.life -= dt;
      if (p.burst) p.vy += 380 * dt;
      if (p.life <= 0 || p.y < -20 || p.x < -20 || p.x > W + 20) {
        if (p.burst) { parts.splice(i, 1); continue; }
        Object.assign(p, ember(false));
      }
      const a = Math.max(0, Math.min(1, p.life / p.max)) * p.alpha;
      g.globalAlpha = a; g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.r * dpr, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function ember(scatter) {
  const life = rand(6, 14);
  return {
    x: rand(0, W || innerWidth), y: scatter ? rand(0, H || innerHeight) : (H || innerHeight) + 10,
    vx: rand(-6, 6), vy: rand(-26, -8), r: rand(0.8, 2.2), life, max: life, alpha: rand(0.12, 0.4),
    color: Math.random() < 0.35 ? '#ffd23d' : Math.random() < 0.5 ? '#4db4ff' : '#8593b8', burst: false,
  };
}
export function burst(x, y, color = '#ffd23d', n = 18, power = 220) {
  if (!g || reduced()) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283); const s = rand(power * 0.4, power);
    parts.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: rand(1.4, 3.4), life: rand(0.35, 0.8), max: 0.8, alpha: 0.95, color, burst: true });
  }
}
export function burstAt(el, color, n, power) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, n, power);
}
export function shake(strength = 1) {
  if (reduced()) return;
  const f = document.querySelector('.app-frame'); if (!f) return;
  f.style.setProperty('--shake', `${4 * strength}px`);
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
}
