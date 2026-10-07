import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1000, height: 300 } });
await p.goto('http://localhost:8135/');
await p.evaluate(async () => {
  const { drawIcon } = await import('/js/gfx/dice/faces.js');
  const names = ['bow', 'sword', 'shield', 'helmet', 'gauntlet', 'heart', 'boots', 'talent', 'staff', 'dagger'];
  const c = document.createElement('canvas'); c.width = 1000; c.height = 260; document.body.innerHTML = ''; document.body.style.background = '#1a0e08'; document.body.appendChild(c);
  const g = c.getContext('2d'); g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 1000, 260);
  names.forEach((n, i) => { g.save(); g.translate(50 + (i % 10) * 100, 60); g.fillStyle = '#d2a868'; drawIcon(g, n, 0, 0, 80); g.restore(); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(n, 30 + (i % 10) * 100, 120); });
});
await p.screenshot({ path: 'docs/ingame/iconsheet.png' }); await b.close();
