// T21 follow-up (Dave, 25 Oct): the whole Magic area on a real two-phone ONLINE table (the game's cloud code against dev/fakecloud.mjs; not Safari). For every power
// the sheet offers (the Ranger's A, B and C, the helper row: Potion, Heal, Heart) and the Team actions tab, at each phone size: opens it and measures whether the
// name, short effect, actual cost, the reason when it cannot be used, the primary action, health and magic and Close are all on screen together with no inner scrolling.
//   node dev/t21magic.mjs [label=before] [out=docs/team/tasks/T21/magic] [sizes=375x548,390x664]
import fs from 'node:fs';
import { bringUp, seat, sleep } from './_cloudphones.mjs';
import { toBoard, battleReady } from './_rooms.mjs';
import { applyRelease } from '../js/release.js'; applyRelease();
const label = process.argv[2] || 'before'; const OUT = process.argv[3] || 'docs/team/tasks/T21/magic'; fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.argv[4] || '375x548,390x664').split(',').map((s) => s.split('x').map(Number)); const res = []; let bad = 0;
const check = (name, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name, d ?? ''); return !!ok; };
const grab = (p) => p.page.evaluate(() => {
  const vh = innerHeight, vw = innerWidth; const sheet = document.querySelector('.b3-sheet.open'); if (!sheet) return null; const sr = sheet.getBoundingClientRect();
  const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), left: Math.round(q.left), right: Math.round(q.right), text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90), disabled: !!e.disabled }; };
  const det = sheet.querySelector('.pw-detail'); const vis = (q) => !q || (q.top >= sr.top - 2 && q.bottom <= Math.min(sr.bottom, vh) + 2);
  const scrollers = [sheet, ...sheet.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => `${e.className.toString().slice(0, 24)}+${e.scrollHeight - e.clientHeight}px`);
  const close = r(sheet.querySelector('.sh-x')); const tally = r(sheet.querySelector('.pw-tally')); const name = r(det?.querySelector('.pd-id b, .hc-top b, .pd-top b')); const cost = r(det?.querySelector('.pd-cost, .hc-state'));
  const why = r(det?.querySelector('.pd-why, .hc-state')); const primary = r(det?.querySelector('.pw-btn.go, .hc-btn')); const buttons = [...(det?.querySelectorAll('button') || [])].map(r);
  return { vw, vh, sheet: { top: Math.round(sr.top), bottom: Math.round(sr.bottom) }, scrollers, close, tally, name, cost, why, primary, detail: r(det), buttons, allVisible: [close, tally, r(det), primary].every(vis), text: det?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 220) };
});
for (const [w, h] of sizes) {
  const { phones: ps, fake, close } = await bringUp(['Dav', 'JP'], { w, h }); const [a] = ps; const r = { size: `${w}x${h}`, label, items: {} };
  try {
    await seat(ps, ['Ranger', 'Ranger']); await toBoard(ps); await a.click('.sx-qcard'); await sleep(900);
    for (let i = 0; i < 6; i++) { if ((await a.table())?.phase === 'battle') break; for (const p of ps) { await p.pump(1); await p.clickText('Continue').catch(() => {}); } await sleep(600); }
    check(`${w}x${h}: in battle`, (await battleReady(a)));
    await a.click('#b3-roll'); await sleep(900); await a.pump(5); for (let k = 0; k < 20 && await a.page.evaluate(() => window.QD.B3.battleState.busy); k++) await a.pump(1);
    await a.page.evaluate(() => document.querySelector('.b3-powers:not(.b3-team)')?.click()); await a.pump(1.2);
    const ids = await a.page.evaluate(() => [...document.querySelectorAll('.b3-sheet.open [data-power]')].map((e) => e.dataset.power));
    await a.shot(`${OUT}/${label}-${w}x${h}-sheet.png`); r.ids = ids;
    for (const id of ids) {
      await a.page.evaluate((i) => document.querySelector(`.b3-sheet.open [data-power="${i}"]`)?.click(), id); await a.pump(1);
      const g = await grab(a); r.items[id] = g; const safe = id.replace(/[^a-z0-9]/gi, '_'); await a.shot(`${OUT}/${label}-${w}x${h}-${safe}.png`);
    }
    // the Team actions tab
    await a.page.evaluate(() => document.querySelector('.sh-tabs [data-tab="team"]')?.click()); await a.pump(1.2);
    const team = await a.page.evaluate(() => { const s = document.querySelector('.b3-sheet.open'); if (!s) return null; const sr = s.getBoundingClientRect(); const bs = [...s.querySelectorAll('button')].map((e) => { const q = e.getBoundingClientRect(); return { text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), top: Math.round(q.top), bottom: Math.round(q.bottom), disabled: !!e.disabled }; }); return { vh: innerHeight, sheet: { top: Math.round(sr.top), bottom: Math.round(sr.bottom) }, scrolls: s.scrollHeight > s.clientHeight + 2 || [...s.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)), buttons: bs, text: s.innerText.replace(/\s+/g, ' ').slice(0, 400) }; });
    r.team = team; await a.shot(`${OUT}/${label}-${w}x${h}-team.png`);
    // choosing a friend for a team action (the second panel)
    await a.page.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .bcard')].find((e) => /share magic/i.test(e.textContent))?.click()); await a.pump(1.2);
    const pick = await a.page.evaluate(() => { const i = document.querySelector('.b3-info.open'); if (!i) return null; const ir = i.getBoundingClientRect(); const rr = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 70), disabled: !!e.disabled }; };
      return { vh: innerHeight, panel: { top: Math.round(ir.top), bottom: Math.round(ir.bottom) }, scrolls: i.scrollHeight > i.clientHeight + 2, close: rr(i.querySelector('.sh-x')), friends: [...i.querySelectorAll('.tm-friend')].map(rr), text: i.innerText.replace(/\s+/g, ' ').slice(0, 300) }; });
    r.pick = pick; if (pick) await a.shot(`${OUT}/${label}-${w}x${h}-team-pick.png`);
    check(`${w}x${h} choosing a friend: the action, who can be chosen, why not, and Close all on screen, no inner scrolling`, pick && !pick.scrolls && pick.close && pick.close.bottom <= pick.vh && pick.friends.every((f) => f.bottom <= pick.vh), pick ? `${pick.text.slice(0, 160)} scrolls:${pick.scrolls}` : 'no panel');
    await a.page.evaluate(() => document.querySelector('.b3-info.open .sh-x')?.click()); await a.pump(0.6);
    for (const [id, g] of Object.entries(r.items)) { check(`${w}x${h} ${id}: name, cost, reason, action, health/magic and Close all on screen, no inner scrolling`, g && g.allVisible && g.scrollers.length === 0, g ? `${g.name?.text || '?'} | ${g.cost?.text || '-'} | scroll:${g.scrollers.join(',') || 'none'} vis:${g.allVisible}` : 'no sheet'); }
    check(`${w}x${h} team tab: every action visible, no inner scrolling`, team && !team.scrolls && team.buttons.every((b) => b.bottom <= team.vh), team ? JSON.stringify(team.buttons.map((b) => b.text)) : 'none');
    check(`${w}x${h}: no page errors`, ps.every((p) => p.errors.length === 0), JSON.stringify(ps.map((p) => p.errors)));
  } catch (e) { check(`${w}x${h}: script ran`, false, e.stack?.split('\n').slice(0, 3).join(' | ')); } finally { res.push(r); await close(); }
}
fs.writeFileSync(`${OUT}/${label}-check.json`, JSON.stringify(res, null, 1)); console.log(bad ? `${bad} FAILED` : 'all passed');
