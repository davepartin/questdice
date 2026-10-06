import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 }, hasTouch: true });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showCreate()); await pump(40);
console.log(JSON.stringify(await p.evaluate(() => { const st = window.QD.world.stage; const c = st.camera; const d = window.QD.world.director; return { pos: c.position.toArray().map((x) => +x.toFixed(2)), fov: c.fov, view: c.view && { enabled: c.view.enabled, oy: c.view.offsetY }, exposure: st.renderer.toneMappingExposure, bloom: st.post.bloom.strength, aspect: c.aspect, shot: d.shot }; })));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: process.argv[2] }); await b.close();
