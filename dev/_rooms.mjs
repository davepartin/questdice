// Several phones at one table, in one process: each is its own browser context (so its own seat), all talking to
// `node server.mjs` (the table server). Used by dev/room*.mjs.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
export const PORT = Number(process.env.ROOM_PORT || 8140);
export async function startServer() {
  const p = spawn('node', ['server.mjs'], { env: { ...process.env, PORT: String(PORT), QD_CHEAT: '1' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res) => p.stdout.on('data', (d) => { if (String(d).includes('QuestDice table')) res(); }));
  return () => p.kill();
}
export async function phones(names, { w = 393, h = 667, dpr = 2 } = {}) {
  const proxy = process.env.HTTPS_PROXY;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage', ...(proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=localhost;127.0.0.1'] : [])] });
  const out = [];
  for (const name of names) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: dpr });
    await ctx.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch { /* */ } });
    await ctx.route(/gstatic\.com|googleapis\.com|firebase/, (r) => r.abort()); // the sandbox has no cloud: fail fast so a hero saves on the device
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[${name}] ERR`, e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console.error`, m.text().slice(0, 200)); });
    const ph = { name, page, async open(q = '') { await page.goto(`http://localhost:${PORT}/?debug&manual&q=low${q}`); await page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); },
      pump: (s) => page.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s),
      async shot(path) { await page.evaluate(() => window.QD.world.stage.step(1)); await page.screenshot({ path }); },
      click: (sel) => page.evaluate((s) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent !== null) || document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel),
      clickText: (txt) => page.evaluate((t) => { const el = [...document.querySelectorAll('button, .sx-plaque, a')].find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!el) throw new Error('no button: ' + t); el.click(); }, txt),
      fill: (sel, v) => page.fill(sel, v),
      text: () => page.evaluate(() => document.body.innerText),
    };
    out.push(ph);
  }
  return { browser, phones: out };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// tables keep each hero in the cloud behind a password now: fill it when the form asks
const pw = (p) => p.page.evaluate(() => { const el = document.querySelector('#hero-pw, input[type=password]'); if (el) { el.value = 'abc123'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
// Two or more phones: the first opens a table, the rest join, everyone gets to the quest board (past the story and the road).
export async function seat(ps, { cls = [] } = {}) {
  const [a, ...rest] = ps;
  for (const p of ps) await p.open();
  await a.pump(1); await a.clickText('Play together'); await a.pump(1); await a.clickText('Open a table'); await a.pump(2);
  await a.fill('#hero-name', 'Dave1'); await pw(a); await a.clickText('Open the table'); await a.pump(3); await sleep(800);
  // the hero is stashed in the cloud first; in the sandbox that call has to time out before the table opens
  await a.page.waitForFunction(() => window.QD.S.net?.code, null, { timeout: 120000 });
  const code = await a.page.evaluate(() => window.QD.S.net?.code);
  for (const [i, p] of rest.entries()) {
    await p.pump(1); await p.clickText('Play together'); await p.pump(1); await p.clickText('Join a table'); await p.pump(2);
    await p.fill('#table-code', code); await p.fill('#hero-name', p.name.replace(/\s/g, '') + (i + 2)); await pw(p); await p.clickText('Take a seat'); await p.page.waitForFunction(() => window.QD.S.net?.code, null, { timeout: 120000 }); await p.pump(2); await p.pump(3);
    await p.clickText('I am ready'); await sleep(300);
  }
  for (const p of ps) await p.pump(1);
  await a.clickText('Take the road'); await sleep(700);
  for (const p of ps) await p.pump(3);
  return code;
}
export async function toBoard(ps) {
  const [a] = ps;
  for (const p of ps) { await p.pump(2); await p.clickText('Continue').catch(() => {}); }
  for (const p of ps) await p.pump(2);
  await a.click('.sx-choice:not(.off)'); await sleep(500);
  for (const p of ps) await p.pump(2);
  for (const p of ps) { await p.clickText('Onward').catch(() => {}); }
  await sleep(500);
  for (const p of ps) await p.pump(2);
}

export const cheat = (code, what = 'weak') => fetch(`http://localhost:${PORT}/api/cheat`, { method: 'POST', body: JSON.stringify({ code, what }) }).then((r) => r.json());
export async function battleReady(p) { for (let i = 0; i < 120; i++) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw && !window.QD.B3.battleState.busy)) return true; await p.pump(0.5); } return false; }

// One hero's round: roll, lock in (when their buttons are there).
export async function playRound(ps) {
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); } }
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(900); await p.pump(2); } }
  await sleep(1200); for (const p of ps) await p.pump(12);
}
