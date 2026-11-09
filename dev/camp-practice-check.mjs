// Camp practice dummy (Dave, 6 Nov 2026): open camp, tap the dummy, confirm unlimited magic and
// zeroed counters, leave mid-round with the header Back to camp (restore gold/potions/XP), Use a power
// so the coloured totals fill, Again starts at zero, Done restores the run.
//   node dev/camp-practice-check.mjs [out=docs/team/tasks/T36]
// Headless Chromium, not Safari.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'docs/team/tasks/T36';
const port = 8288;
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME
  || (fs.existsSync('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome') ? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'
    : (fs.existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : '/usr/bin/google-chrome-stable'));
const errs = [];
let bad = 0;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => { try { server.kill(); } catch { /* */ } });
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`);
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
const waitPractice = async () => {
  for (let i = 0; i < 60; i++) {
    await pump(0.4);
    await p.waitForTimeout(80);
    if (await p.evaluate(() => !!document.querySelector('.b3') && window.QD?.B3?.battleState?.b?.campPractice && !window.QD.B3.battleState.busy && !window.QD.B3.battleState.starting)) return true;
  }
  return false;
};
const leaveBtn = () => p.evaluate(() => {
  const btn = document.querySelector('.b3-leave-camp');
  const recap = document.querySelector('.b3-top .rc-again');
  const round = document.querySelector('.b3-rline b, .b3-round b');
  const hero = document.querySelector('.fb-slot.hero');
  const r = btn?.getBoundingClientRect();
  const rr = round?.getBoundingClientRect();
  const hr = hero?.getBoundingClientRect();
  const style = btn ? getComputedStyle(btn) : null;
  const recapStyle = recap ? getComputedStyle(recap) : null;
  return {
    visible: !!(btn && !btn.hidden && style?.display !== 'none' && (btn.offsetParent || style?.position === 'absolute' || style?.position === 'fixed')),
    text: (btn?.textContent || '').trim(),
    inHeader: !!btn?.closest('.b3-top'),
    inRoundLine: !!btn?.closest('.b3-rline'),
    recap: !!(recap && !recap.hidden && recapStyle?.display !== 'none' && recap.offsetParent),
    w: r?.width || 0, h: r?.height || 0, y: r?.top || 0, bottom: r?.bottom || 0,
    roundY: rr?.top || 0, heroTop: hr?.top || 0,
    overlay: [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.classList.contains('b3-practice-done')),
  };
});

const setup = await p.evaluate(async () => {
  const { S, E, showCamp } = window.QD;
  const h = E.newHero({ name: 'DummyTap', cls: 'knight', seed: 9 });
  h.gold = 77; h.xp = 12; h.potions = 2; h.dice = null; h.level = 4;
  const SV = await import('./js/save.js');
  if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass');
  S.hero = h; S.company = { members: [h], campaign: h.campaign }; S.seat = 0; S.campPage = 'camp';
  showCamp();
  return { gold: h.gold, xp: h.xp, potions: h.potions, rounds: h.stats.rounds };
});

await p.waitForSelector('.sc-dummy', { timeout: 20000 });
await p.evaluate(() => document.fonts.ready);
await pump(0.4);
await p.screenshot({ path: path.join(OUT, 'camp-dummy.png') });
const camp = await p.evaluate(() => {
  const d = document.querySelector('.sc-dummy');
  const h = document.querySelector('.sc-fig:not(.sc-dummy)');
  const img = d?.querySelector('.sc-img, img');
  const name = d?.querySelector('.sc-name');
  const box = d?.getBoundingClientRect();
  const ir = img?.getBoundingClientRect();
  const nr = name?.getBoundingClientRect();
  return {
    dummy: !!d, label: name?.textContent,
    hero: !!h, tap: box ? box.width >= 40 && box.height >= 40 : false,
    dummyX: box ? box.left + box.width / 2 : 0,
    heroX: h ? h.getBoundingClientRect().left + h.getBoundingClientRect().width / 2 : 0,
    gap: (nr && ir) ? nr.top - ir.bottom : null,
    labelUnderDummy: !!(nr && box && Math.abs((nr.left + nr.right) / 2 - (box.left + box.width / 2)) <= box.width * 0.45),
    labelW: nr?.width || 0, labelH: nr?.height || 0,
  };
});
check('dummy stands by the fire on camp', camp.dummy && camp.label === 'Practice', JSON.stringify(camp));
check('dummy is large enough to tap on a phone', camp.tap, JSON.stringify(camp));
check('dummy is to the right of the hero', camp.dummyX > camp.heroX, JSON.stringify(camp));
check('PRACTICE sits below the dummy’s round base', camp.gap >= 4 && camp.labelUnderDummy && camp.labelW >= 40, JSON.stringify(camp));

const goldTap = await p.evaluate(() => {
  const before = window.QD.S.hero.gold;
  document.querySelector('.sx-chip .ch-copy b')?.click();
  document.querySelector('.sx-chip .sx-coin')?.click();
  document.querySelector('.sx-chip')?.click();
  return { before, after: window.QD.S.hero.gold };
});
check('tapping the camp name and gold does not grant 5000', goldTap.after === goldTap.before && goldTap.after !== 5000, JSON.stringify(goldTap));

const CAMP_TABS = [['camp', 'Camp Store'], ['dice', 'Dice Upgrades'], ['magic', 'Magic Upgrades'], ['upgrades', 'All Upgrades'], ['hero', 'Hero']];
const cdp = await p.context().newCDPSession(p);
const swipeSheet = async () => {
  const box = await p.evaluate(() => {
    const side = document.querySelector('.sx-side');
    const body = document.querySelector('.sx-camp-scroll') || side;
    const sr = side.getBoundingClientRect();
    const r = body.getBoundingClientRect();
    const y = Math.round(Math.min(sr.bottom - 140, Math.max(sr.top + 220, r.top + Math.min(r.height, 240) * 0.55)));
    return { x: Math.round(sr.left + sr.width * 0.5), y, h: sr.height };
  });
  const dist = Math.min(280, Math.max(160, Math.round(box.h * 0.28)));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y, id: 0 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - Math.round((dist * i) / 12), id: 0 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(80);
};
const tabScroll = {};
for (const [id, label] of CAMP_TABS) {
  await p.evaluate((page) => { window.QD.S.campPage = page; window.QD.S.holdScroll = false; window.QD.showCamp(); }, id);
  await p.waitForSelector('.sx-side', { timeout: 10000 });
  await pump(0.2);
  const prepared = await p.evaluate(() => {
    const side = document.querySelector('.sx-side');
    const body = document.querySelector('.sx-camp-scroll');
    const pe = side ? getComputedStyle(side).pointerEvents : '';
    const overflowY = side ? getComputedStyle(side).overflowY : '';
    if (body && side && side.scrollHeight <= side.clientHeight + 24) body.dataset.qdPad = '1', body.style.minHeight = `${side.clientHeight + 900}px`;
    side.scrollTop = 0;
    return {
      pe, overflowY, can: side.scrollHeight > side.clientHeight + 20,
      hole: pe === 'none',
      hit: !!document.querySelector('.camp-dummy-hit:not([hidden])'),
    };
  });
  const before = await p.evaluate(() => document.querySelector('.sx-side')?.scrollTop || 0);
  await swipeSheet();
  const after = await p.evaluate(() => {
    const side = document.querySelector('.sx-side');
    const body = document.querySelector('.sx-camp-scroll');
    const y = side?.scrollTop || 0;
    if (body?.dataset.qdPad) { delete body.dataset.qdPad; body.style.minHeight = ''; }
    return { y, pe: side ? getComputedStyle(side).pointerEvents : '' };
  });
  tabScroll[id] = { label, ...prepared, before, after: after.y };
  check(`camp tab ${label} sheet scrolls on iPhone touch`, !prepared.hole && prepared.pe !== 'none' && /auto|scroll/.test(prepared.overflowY) && after.y > before + 8, JSON.stringify(tabScroll[id]));
}
await p.evaluate(() => { window.QD.S.campPage = 'camp'; window.QD.S.holdScroll = false; window.QD.showCamp(); });
await p.waitForSelector('.sc-dummy', { timeout: 20000 });
await pump(0.3);
const dummyHit = await p.evaluate(() => {
  const hit = document.querySelector('.camp-dummy-hit');
  const r = hit?.getBoundingClientRect();
  const sidePe = getComputedStyle(document.querySelector('.sx-side')).pointerEvents;
  return { present: !!hit, hidden: !!hit?.hidden, w: r?.width || 0, h: r?.height || 0, sidePe };
});
check('dummy hit overlay is on the banner, sheet still receives events', dummyHit.present && !dummyHit.hidden && dummyHit.w >= 24 && dummyHit.h >= 24 && dummyHit.sidePe !== 'none', JSON.stringify(dummyHit));

const tapDummy = async () => {
  const hit = p.locator('.camp-dummy-hit:not([hidden])');
  await hit.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
  if (await hit.count()) await hit.click({ timeout: 8000 });
  else await p.locator('.sc-dummy').click();
};
await tapDummy();
await waitPractice();
const entered = await p.evaluate(() => {
  const B = window.QD.B3.battleState; const chips = B.hud?.forecast?._chips || {};
  return {
    practice: !!B.b?.campPractice, free: !!B.b?.freeMagic, foe: B.b?.enemies?.[0]?.id,
    mag: document.querySelector('.b3-magchip b')?.textContent,
    counters: Object.fromEntries(Object.entries(chips).map(([k, c]) => [k, c._n.textContent])),
    picker: !!document.querySelector('.mnc-veil'),
    foeImg: document.querySelector('.fb-slot.foe img')?.getAttribute('src') || '',
    place: document.querySelector('.fb')?.dataset.place || '',
    tableBg: document.querySelector('.fb-table') ? getComputedStyle(document.querySelector('.fb-table')).backgroundImage : '',
  };
});
check('tapping the dummy enters camp practice', entered.practice && entered.foe === 'training-dummy', JSON.stringify(entered));
check('practice target is the dummy miniature, not a goblin', /training-dummy\.webp/.test(entered.foeImg), JSON.stringify(entered.foeImg));
check('practice skips the monster picker', !entered.picker, JSON.stringify(entered));
check('magic chip shows unlimited', entered.mag === '∞', JSON.stringify(entered));
check('colour counters start at zero', Object.values(entered.counters).every((v) => v === '0' || v === '0.0'), JSON.stringify(entered.counters));
check('practice fight uses the campsite painting, not the brown box', entered.place === 'practice-camp' && /practice-camp\.webp/.test(entered.tableBg) && !/assets\/bg\/camp\.webp/.test(entered.tableBg), JSON.stringify({ place: entered.place, tableBg: entered.tableBg }));

const rollBtn = await p.evaluateHandle(() => document.querySelector('#b3-roll'));
if (rollBtn.asElement()) {
  await rollBtn.asElement().click();
  for (let i = 0; i < 40; i++) {
    await pump(0.3);
    await p.waitForTimeout(80);
    if (await p.evaluate(() => window.QD.B3.battleState.b?.phase === 'shape' && !window.QD.B3.battleState.busy && window.QD.B3.battleState.b.board)) break;
  }
}
const midLeave = await leaveBtn();
check('Back to camp is in the practice header before Lock in', midLeave.visible && midLeave.inHeader && midLeave.inRoundLine && midLeave.text === 'Back to camp' && !midLeave.overlay, JSON.stringify(midLeave));
check('header Back to camp sits on the ROUND line, not on the hero', midLeave.visible && Math.abs(midLeave.y - midLeave.roundY) <= 24 && (midLeave.heroTop === 0 || midLeave.bottom <= midLeave.heroTop + 8), JSON.stringify(midLeave));
check('Recap is not the practice exit; Back to camp is', !midLeave.recap && midLeave.visible, JSON.stringify(midLeave));
check('header Back to camp is large enough to tap on a phone', midLeave.w >= 88 && midLeave.h >= 32, JSON.stringify(midLeave));
await p.screenshot({ path: path.join(OUT, 'practice-mid-round.png') });

await p.evaluate(() => {
  window.QD.S.hero.gold = 1; window.QD.S.hero.potions = 0; window.QD.S.hero.xp = 99;
  const b = window.QD.B3.battleState.b; if (b?.hero) b.hero.gold = 1;
});
await p.locator('.b3-leave-camp').click();
await p.waitForSelector('.sc-dummy', { timeout: 20000 });
const midRestored = await p.evaluate(() => {
  const h = window.QD.S.hero;
  return { gold: h.gold, xp: h.xp, potions: h.potions, practice: !!window.QD.S.campPractice, dummy: !!document.querySelector('.sc-dummy'), battle: !!document.querySelector('.b3') };
});
check('mid-round Back to camp restores camp and the real run (gold, potions, XP)', midRestored.gold === setup.gold && midRestored.xp === setup.xp && midRestored.potions === setup.potions && !midRestored.practice && midRestored.dummy && !midRestored.battle, JSON.stringify({ setup, midRestored }));

await pump(0.3);
await tapDummy();
await waitPractice();

await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 0; });
await p.waitForFunction(() => !window.QD.B3.battleState.busy, null, { timeout: 10000 }).catch(() => null);
const mb = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /magic powers/i.test(b.textContent) && b.offsetParent));
if (mb.asElement()) { await mb.asElement().click(); await p.waitForTimeout(1000); }
const cardBtn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && /Counterstrike/i.test(b.textContent)));
check('Counterstrike is on the Magical Powers sheet', !!cardBtn.asElement());
if (cardBtn.asElement()) { await cardBtn.asElement().click(); await p.waitForTimeout(900); }
const useReady = await p.evaluate(() => {
  const use = document.querySelector('.mc-ctl .mc-use.go:not([disabled])');
  return { use: !!use, magic: window.QD.B3.battleState.b.magic, free: window.QD.B3.battleState.b.freeMagic, busy: window.QD.B3.battleState.busy };
});
check('Use is ready at 0 magic (unlimited)', useReady.use && useReady.free && useReady.magic === 0, JSON.stringify(useReady));
if (useReady.use) {
  await p.locator('.mc-ctl .mc-use.go').first().click({ timeout: 8000 });
  for (let i = 0; i < 40; i++) {
    await pump(0.2);
    await p.waitForTimeout(80);
    const ready = await p.evaluate(() => {
      const go = document.querySelector('.mc-result .mc-res-go, .dr-card .mc-res-go, .mc-res-go');
      if (go && !go.disabled) return true;
      document.querySelector('.mc-card[data-card="riposte"]')?.click();
      return false;
    });
    if (ready) break;
  }
  const go = await p.$('.mc-res-go:not([disabled]), .mc-result.in .mc-res-go:not([disabled])');
  if (go) { await go.click(); await p.waitForTimeout(1400); await pump(0.6); }
}
const scored = await p.evaluate(() => {
  const chips = window.QD.B3.battleState.hud.forecast._chips;
  const b = window.QD.B3.battleState.b;
  return {
    block: Number(chips.block?._n?.textContent || 0),
    atk: Number(chips.atk?._n?.textContent || 0),
    splash: Number(chips.splash?._n?.textContent || 0),
    modsBlock: b.mods?.block || 0,
    lastCast: b.lastCast?.id || null,
    sheet: !!document.querySelector('.b3-sheet.open'),
    potions: window.QD.S.hero.potions,
  };
});
check('Using Counterstrike fills the Block counter', scored.block >= 4 || scored.modsBlock >= 4, JSON.stringify(scored));

const again = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && /^Again/i.test(b.textContent.trim())));
// Again is on the result strip after lock-in. If we have not locked, counters still show the card totals; zero them with debug reset if needed, else Use Again after a lock.
if (!again.asElement()) {
  const roll = await p.evaluateHandle(() => document.querySelector('#b3-roll'));
  if (roll.asElement()) {
    await roll.asElement().click();
    for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(80); if (await p.evaluate(() => window.QD.B3.battleState.b?.phase === 'shape' && !window.QD.B3.battleState.busy && window.QD.B3.battleState.b.board)) break; }
    const lock = await p.evaluateHandle(() => document.querySelector('#b3-lock'));
    if (lock.asElement()) {
      await lock.asElement().click();
      for (let i = 0; i < 50; i++) {
        await pump(0.4);
        await p.waitForTimeout(80);
        if (await p.evaluate(() => window.QD.B3.battleState.b?.phase === 'practice-end' && !window.QD.B3.battleState.busy && [...document.querySelectorAll('button')].some((b) => b.offsetParent && /Again/i.test(b.textContent)))) break;
      }
    }
  }
}
await p.screenshot({ path: path.join(OUT, 'practice-result.png') });
await p.screenshot({ path: path.join(OUT, 'practice-totals.png') });
const endState = await p.evaluate(() => {
  const B = window.QD.B3.battleState;
  const chips = B.hud?.forecast?._chips || {};
  const T = B.lastRep?.T || {};
  return {
    phase: B.b?.phase,
    again: [...document.querySelectorAll('button')].some((b) => b.offsetParent && /^Again/i.test(b.textContent.trim())),
    totals: Object.fromEntries(Object.entries(chips).map(([k, c]) => [k, c._n.textContent])),
    T,
  };
});
check('practice round can be finished and shows Again', endState.phase === 'practice-end' && endState.again, JSON.stringify(endState));
const endLeave = await leaveBtn();
check('header Back to camp stays after Lock in, with Again on the result strip', endLeave.visible && endLeave.inHeader && endLeave.text === 'Back to camp' && endLeave.overlay, JSON.stringify(endLeave));
check('practice result shows coloured totals', endState.phase === 'practice-end' && (Number(endState.totals.block) > 0 || Number(endState.totals.atk) > 0 || (endState.T.atk || 0) > 0 || (endState.T.block || 0) > 0), JSON.stringify(endState));
const againBtn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && /^Again/i.test(b.textContent.trim())));
if (againBtn.asElement()) {
  await againBtn.asElement().click();
  await pump(0.4);
  await p.waitForTimeout(400);
}
const zeroed = await p.evaluate(() => {
  const B = window.QD.B3.battleState; const chips = B.hud.forecast._chips;
  return { phase: B.b.phase, counters: Object.fromEntries(Object.entries(chips).map(([k, c]) => [k, c._n.textContent])), used: Object.keys(B.b.usedRound || {}) };
});
check('Again starts the counters at zero', zeroed.phase === 'reset' && Object.values(zeroed.counters).every((v) => v === '0' || v === '0.0') && !zeroed.used.riposte, JSON.stringify(zeroed));

await p.evaluate(() => { window.QD.S.hero.gold = 1; window.QD.S.hero.potions = 0; window.QD.S.hero.xp = 99; window.QD.B3.battleState.b.hero.gold = 1; });
const done = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && /Back to camp/i.test(b.textContent)));
if (done.asElement()) await done.asElement().click();
else await p.evaluate(() => window.QD.leaveCampPractice());
await p.waitForSelector('.sc-dummy', { timeout: 20000 });
const restored = await p.evaluate(() => {
  const h = window.QD.S.hero;
  return { gold: h.gold, xp: h.xp, potions: h.potions, practice: !!window.QD.S.campPractice, dummy: !!document.querySelector('.sc-dummy') };
});
check('Done restores camp and the real run (gold, potions, XP)', restored.gold === setup.gold && restored.xp === setup.xp && restored.potions === setup.potions && !restored.practice && restored.dummy, JSON.stringify({ setup, restored }));
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));

const summary = { setup, camp, goldTap, dummyHit, tabScroll, entered, midLeave, midRestored, scored, endState, endLeave, zeroed, restored, errors: errs, bad };
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(summary, null, 2));
console.log(bad ? `${bad} failed` : 'all passed');
await br.close();
process.exit(bad ? 1 : 0);
