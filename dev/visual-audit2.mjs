// Visual audit, second pass: real click-through flows from a fresh page, one screenshot per step (phone size). Not for the camp cards or the Magical Powers sheet.
//   node dev/visual-audit2.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/audit2'; const port = +(process.argv[3] || 8166); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const fresh = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
    await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
    await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* ignore */ } });
    await p.goto(`http://localhost:${port}/?debug`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 }); await sleep(2500); return p; };
  let n = 0; const shot = async (p, name, wait = 1500) => { await sleep(wait); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); console.log('shot', n, name, '|', (await p.evaluate(() => (document.querySelector('#modal.open') || document.querySelector('#app'))?.innerText.replace(/\s+/g, ' ').slice(0, 90))) || ''); };
  const click = (p, re, sc = 'body') => p.evaluate(([src, s]) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll(`${s} button, ${s} [role=button], ${s} a`)].find((x) => x.offsetParent && !x.disabled && r.test(x.textContent + ' ' + (x.getAttribute('aria-label') || ''))); if (!b) return false; b.click(); return true; }, [re.source, sc]);
  // A. title, rules, reports, learn
  let p = await fresh(); await shot(p, 'title', 800);
  await p.evaluate(() => document.querySelector('#help')?.click()); await shot(p, 'rules');
  await click(p, /^close$/, '#modal'); await sleep(400);
  await p.evaluate(() => document.querySelector('#gmenu').click()); await sleep(400); await click(p, /battle reports/, '#modal'); await shot(p, 'reports');
  await click(p, /^close$/, '#modal'); await sleep(400);
  await click(p, /learn to play/); await shot(p, 'learn-1', 4000); await shot(p, 'learn-2', 5000);
  await p.context().close();
  // B. together, cloud
  p = await fresh(); await click(p, /play together/); await shot(p, 'together'); await click(p, /open a table/); await shot(p, 'open-table'); await p.context().close();
  p = await fresh(); await click(p, /open a cloud save/); await shot(p, 'cloud'); await p.context().close();
  // C. a solo hero: story, create, intro pages, the board, a fight, victory, spoils, camp
  p = await fresh(); await click(p, /choose your story/); await sleep(800); await click(p, /dawn lantern/); await shot(p, 'create');
  await p.evaluate(() => { const set = (s, v) => { const e = document.querySelector(s); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } }; set('#hero-name', 'Maelis'); set('#hero-pw', 'abc123'); });
  await click(p, /^wizard$/); await sleep(500); await shot(p, 'create-wizard'); await click(p, /begin the campaign/); await sleep(2500);
  for (let i = 0; i < 8; i++) { const onBoard = await p.evaluate(() => !!document.querySelector('.sx-quest, .quest-card, [class*=quest-card]') || /the road ahead/i.test(document.body.innerText)); await shot(p, `story-${i + 1}`, 1000); if (onBoard) break; if (!(await click(p, /^continue$|onward|^begin/))) break; await sleep(1200); }
  await click(p, /^fight/i); await p.waitForFunction(() => document.querySelector('#b3-roll'), null, { timeout: 90000 }).catch(() => {}); await shot(p, 'battle-start', 2500);
  await p.evaluate(() => { const b = window.QD.S.battle; if (b) for (const e of b.enemies) e.hp = Math.min(e.hp, 1); });
  for (let r = 0; r < 12; r++) { const done = await p.evaluate(() => !document.querySelector('#b3-roll') && /victory|spoils|reveal|envelope|defeat/i.test(document.body.innerText)); if (done) break;
    await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await sleep(1500); if (r === 0) await shot(p, 'battle-rolled', 800);
    await p.evaluate(() => { const l = document.querySelector('#b3-lock'); if (l && !l.disabled) l.click(); }); await sleep(2500); }
  for (let i = 0; i < 8; i++) { await shot(p, `after-${i + 1}`, 1500); if (!(await click(p, /^continue$|onward|take|accept|^done/))) { await p.evaluate(() => document.querySelector('.sx-choice:not(.off)')?.click()); } await sleep(1200); }
  await p.context().close();
} finally { await browser?.close(); server.kill(); }
