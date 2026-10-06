import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 } });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showCreate()); await pump(20);
const ids = (process.argv[3] || 'sword,shield,bow,staff,axe,lute,hammer').split(',');
const res = await p.evaluate(async (ids) => { const m = await import('/js/g3/screens.js'); const o = {}; for (const id of ids) { try { o[id] = await m.portraitQ?.weapon?.(id, 0) ?? null; } catch (e) { o[id] = 'ERR ' + e.message; } } return o; }, ids);
for (const [id, u] of Object.entries(res)) { if (u && u.startsWith('data:')) fs.writeFileSync(`${out}/${id}.png`, Buffer.from(u.split(',')[1], 'base64')); else console.log(id, String(u).slice(0, 80)); }
await b.close();
