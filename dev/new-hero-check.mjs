// New hero, start to finish (Dave, 3 Nov 2026: "I'm trying to click on choose a story to start a new hero, but nothing happens"): the title's
// Choose your story → a story → Choose your hero → name and password → Begin the campaign. Fails on any page error. Real touchscreen taps.
//   CHROME=/path/to/chrome node dev/new-hero-check.mjs [out=shots/new-hero] [port=8259]      (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process';
import fs from 'node:fs'; const OUT = process.argv[2] || 'shots/new-hero'; const port = +(process.argv[3] || 8259); fs.mkdirSync(OUT, { recursive: true }); const errs = []; const log = (...a) => console.log(...a);
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await br.newPage({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.setDefaultTimeout(30000);
p.on('pageerror', (e) => { errs.push(e.message); log('PAGEERROR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' / ')); });
p.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text().slice(0, 300)); });
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?q=low`); await p.waitForTimeout(8000);
log('title buttons', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button, [role=button]')].map((b) => b.textContent.trim().slice(0, 40)).filter(Boolean).slice(0, 12))));
await p.screenshot({ path: `${OUT}/title.png` });
const target = p.locator('text=Choose your story').first(); log('found', await target.count());
const tapText = async (t) => { const b = await p.evaluate((t) => { const el = [...document.querySelectorAll('button, [role=button], a')].find((x) => x.textContent.includes(t)); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t); if (!b) { log('NO', t); return false; } await p.touchscreen.tap(b.x, b.y); return true; };
await tapText('Choose your story');
await p.waitForTimeout(3000);
log('after click', JSON.stringify(await p.evaluate(() => ({ stories: !!document.querySelector('.sx-stories'), text: document.body.innerText.slice(0, 200).replace(/\n+/g, ' | ') }))));
await p.screenshot({ path: `${OUT}/after.png` });
await tapText('The Dawn Lantern'); await p.waitForTimeout(3000);
log('after story', JSON.stringify(await p.evaluate(() => document.body.innerText.slice(0, 260).replace(/\n+/g, ' | '))));
await p.screenshot({ path: `${OUT}/after-story.png` });
log('buttons', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 30)).filter(Boolean))));
const name = 'Newbie' + Date.now() % 1000;
const ins = p.locator('input'); log('inputs', await ins.count()); await p.locator('input:not([type=checkbox]):not([type=password])').first().fill(name); const pw = p.locator('input[type=password]'); if (await pw.count()) await pw.first().fill('testpass');
for (const t of ['Begin', 'Start', 'Create', 'Continue', 'Next']) { if (await p.evaluate((t) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith(t) && !b.disabled), t)) { log('tapping', t); await tapText(t); break; } }
for (let i = 0; i < 20; i++) { await p.waitForTimeout(1000); if (!(await p.evaluate(() => /Choose your hero/.test(document.body.innerText)))) break; }
log('next screen', JSON.stringify(await p.evaluate(() => document.body.innerText.slice(0, 240).replace(/\n+/g, ' | '))));
await p.screenshot({ path: `${OUT}/after-create.png` });
const ok = !errs.length && !(await p.evaluate(() => /Choose your hero/.test(document.body.innerText))); log(ok ? 'PASS new hero reaches its first screen' : 'FAIL new hero', JSON.stringify(errs)); await br.close(); server.kill(); process.exit(ok ? 0 : 1);
