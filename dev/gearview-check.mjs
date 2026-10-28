// The daily challenge's "Your gear": the intro button, the battle menu and tapping the hero's name show the camp dice grid and cards, look only.
//   node dev/gearview-check.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/gear'; const port = +(process.argv[3] || 8163); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; let failed = 0; const check = (label, ok, detail) => { console.log(ok ? 'PASS' : 'FAIL', label, detail || ''); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 660 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* ignore */ } });
  await p.goto(`http://localhost:${port}/?debug`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 }); await sleep(1500);
  const click = (re, scope = 'body') => p.evaluate(([src, sc]) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll(`${sc} button, ${sc} [role=button]`)].find((x) => x.offsetParent && r.test(x.textContent + ' ' + (x.getAttribute('aria-label') || ''))); if (!b) return false; b.click(); return true; }, [re.source, scope]);
  // the daily intro
  await p.evaluate(() => window.QD.showTitle()); await sleep(500);
  check('open the daily intro', await click(/daily challenge|^\s*daily/)); await sleep(900);
  check('the intro has See your gear', await click(/see your gear/)); await sleep(600);
  let txt = await p.evaluate(() => document.querySelector('#modal')?.innerText.replace(/\s+/g, ' ') || '');
  check('the gear view shows the dice grid and only the hero name as its title', /Left weapon/i.test(txt) && /Talent one/i.test(txt) && /Heart/i.test(txt) && !/Look only/i.test(txt) && !/your gear/i.test(txt), txt.slice(0, 160)); await p.screenshot({ path: `${out}/gear-weapon.png` });
  for (const [label, shot] of [['Talent one', 'talent'], ['Heart', 'heart'], ['Head', 'head'], ['Right weapon', 'weapon2']]) { await p.evaluate((l) => [...document.querySelectorAll('#modal .cw-cell')].find((c) => c.getAttribute('aria-label')?.startsWith(l))?.click(), label); await sleep(400); await p.screenshot({ path: `${out}/gear-${shot}.png` }); }
  // every die's card fits on the screen together with the nine boxes (Dave, 28 Oct): the modal sits inside the viewport and nothing scrolls
  const slots = ['Left weapon', 'Head', 'Right weapon', 'Left hand', 'Heart', 'Right hand', 'Talent one', 'Feet', 'Talent two'];
  for (const l of slots) {
    await p.evaluate((x) => [...document.querySelectorAll('#modal .cw-cell')].find((c) => c.getAttribute('aria-label')?.startsWith(x))?.click(), l); await sleep(700);
    const m = await p.evaluate(() => { const f = document.querySelector('#modal .modal-card').getBoundingClientRect(); const c = document.querySelector('#modal .gv-fit'); const cell = document.querySelector('#modal .cw-cell').getBoundingClientRect(); const fr = c.getBoundingClientRect(); const wrap = document.querySelector('#modal .gv-card').getBoundingClientRect(); return { top: Math.round(f.top), bottom: Math.round(f.bottom), vh: innerHeight, cell: Math.round(cell.height), cardBottom: Math.round(fr.bottom), wrapBottom: Math.round(wrap.bottom), scrolls: document.querySelector('#modal .modal-card').scrollHeight > document.querySelector('#modal .modal-card').clientHeight + 1 }; });
    check(`${l}: the card and the nine boxes fit on a 390x660 screen`, m.top >= 0 && m.bottom <= m.vh && m.cardBottom <= m.wrapBottom + 8 && !m.scrolls && m.cell <= 62, JSON.stringify(m));
    await p.screenshot({ path: `${out}/fit-${l.replace(/ /g, '-')}.png` });
  }
  const talentFaces = await p.evaluate(() => { [...document.querySelectorAll('#modal .cw-cell')].find((c) => c.getAttribute('aria-label')?.startsWith('Talent one'))?.click(); return document.querySelectorAll('#modal .cb-hole.set').length; });
  check('the talent card shows the daily hero\'s symbols', talentFaces >= 1, `${talentFaces} filled faces`);
  const tap = await p.evaluate(() => { const g = [...document.querySelectorAll('#modal .cb-hole.open, #modal .cb-cov')][0]; g?.click(); return !!g; }); await sleep(300);
  check('tapping a cover only says "camp" and changes nothing', await p.evaluate(() => !document.querySelector('.tw-workshop, .sh-buy')));
  await p.evaluate(() => [...document.querySelectorAll('#modal button')].find((b) => b.classList.contains('qd-close-top'))?.click()); await sleep(300);
  // in the fight: the hero's name and the battle menu
  check('begin the daily', await click(/^\s*begin/)); await p.waitForFunction(() => document.querySelector('#b3-roll'), null, { timeout: 60000 }).catch(() => {}); await sleep(1500);
  check('tap the hero character', await p.evaluate(() => { const c = document.querySelector('.fb-pc.hero.tappable'); c?.click(); return !!c; })); await sleep(600);
  await p.evaluate(() => [...document.querySelectorAll('#modal button')].find((b) => b.classList.contains('qd-close-top'))?.click()); await sleep(300);
  check('tap the name plate too', await p.evaluate(() => { const c = document.querySelector('.fb-card.hero.tappable'); c?.click(); return !!c; })); await sleep(600);
  check('the gear opens in the fight', await p.evaluate(() => !!document.querySelector('#modal .gv'))); await p.screenshot({ path: `${out}/gear-in-battle.png` });
  await p.evaluate(() => [...document.querySelectorAll('#modal button')].find((b) => b.classList.contains('qd-close-top'))?.click()); await sleep(300);
  await p.evaluate(() => document.querySelector('.b3-menu')?.click()); await sleep(400);
  check('the battle menu has Your gear', await click(/^your gear/, '#modal')); await sleep(400);
  check('and it opens', await p.evaluate(() => !!document.querySelector('#modal .gv')));
  check('Close is the game\'s one button, top right of the card', await p.evaluate(() => { const c = document.querySelector('#modal .modal-card'); const x = c.querySelector('button.qd-close-top'); if (!x) return false; const a = c.getBoundingClientRect(); const b = x.getBoundingClientRect(); return b.right <= a.right && a.right - b.right < 20 && b.top - a.top < 20 && x.textContent === 'Close' && c.querySelectorAll('button.qd-close').length === 1; }));
  check('no page errors', !errors.length, errors.slice(0, 3).join('; '));
} finally { await browser?.close(); server.kill(); }
process.exitCode = failed ? 1 : 0;
