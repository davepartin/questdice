// T20: captioned contact sheets from the screenshots dev/t20arrows.mjs took (one PNG per case; labelled as a demonstration with set dice).
//   node dev/t20sheet.mjs [dir=docs/team/tasks/T20]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'docs/team/tasks/T20');
const R = JSON.parse(fs.readFileSync(`${dir}/ui-results.json`, 'utf8')); const build = R.info.build;
const hp = (r, i) => `${r.hpBefore[i]} → ${r.hp[i][1]}`;
const cases = [
  ['normal', 'Normal arrows, die face 4 (R4)', (L) => `Left hand shows 4, die face 4 is R4: 4 + 4 = ${L[0].T.atk} attack. The goblin raised a guard of 3, so ${L[0].hpBefore[0] - L[0].hp[0][1]} goes through: ${hp(L[0], 0)}.`, ['dice', 'result-b']],
  ['pierce', 'Piercing arrows, arrowhead face 4 (A2)', (L) => `A2 + 4 = ${L[0].T.pierce} and all of it is pierce, so the guard of 3 does not matter: ${hp(L[0], 0)} (Normal did 5 here).`, ['dice', 'result-b']],
  ['fire-group', 'Fire arrows, arrowhead face 4, three goblins', (L) => `A2 + 4 = ${L[0].T.atk} on the chosen goblin (guard 3 leaves 3: ${hp(L[0], 0)}). The hand’s 4 splashes to each OTHER goblin before its own guard: the open one takes 4 (${hp(L[0], 1)}); the one guarding 3 takes 1 (${hp(L[0], 2)}).`, ['dice', 'result-b']],
  ['fire-lone', 'Fire arrows, arrowhead face 4, a lone boss', (L) => `The same 6 on the target (${hp(L[0], 0)}), but nobody else is standing, so the splash of 4 has nowhere to go.`, ['dice', 'result-b']],
  ['fire-numbered', 'Fire arrows, ordinary numbered face 3 (R2, not an arrowhead)', (L) => `R2 + 4 = ${L[0].T.atk}, the same on the target as the arrowhead (${hp(L[0], 0)}), but there is no mark, so no Fire and the others are untouched (60, 60).`, ['dice', 'result-b']],
  ['frost-first', 'Frost arrows, arrowhead face 4, the archer acts first (round 1)', (L) => `A2 + 4 = ${L[0].T.atk} on the Ogre. In round 1 the archer always strikes first, so its 12-point Club is already chilled: ${L[0].acts[0][1]} before any block.`, ['dice', 'result-b']],
  ['frost-numbered', 'Frost arrows, ordinary numbered face 3 (R2, not an arrowhead)', (L) => `R2 + 4 = ${L[0].T.atk}. No arrowhead, no chill: the Club still lands for ${L[0].acts[0][1]}.`, ['dice', 'result-b']],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const img = (f) => `file://${dir}/${f}.png`;
const page = (title, panels, note) => `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#101418;color:#f1ead8;font:15px/1.4 "DejaVu Sans",sans-serif;padding:18px;width:${panels.length * 390 + (panels.length - 1) * 16 + 36}px}
h1{margin:0 0 4px;font:700 22px "DejaVu Serif",serif}.demo{background:#7a3b10;border:1px solid #d9893c;padding:6px 10px;border-radius:6px;font-size:12.5px;margin:8px 0 12px}.row{display:flex;gap:16px;align-items:flex-start}
.p{width:390px}.p img{width:390px;border-radius:8px;border:1px solid #444;display:block}.p b{display:block;margin:6px 0 0;color:#e8c46c;font-size:13px}.note{margin-top:12px;font-size:15px;max-width:${panels.length * 390}px}</style>
<h1>${title}</h1><div class=demo>DEMONSTRATION ONLY: the dice were set with the practice battle’s own script, not rolled. Released rules, build ${build}, headless Chromium (not Safari), fresh profile.</div>
<div class=row>${panels.map((p) => `<div class=p><img src="${img(p.f)}"><b>${p.cap}</b></div>`).join('')}</div><div class=note>${note}</div>`;
async function sheet(name, title, panels, note) { const p = await b.newPage({ viewport: { width: 400, height: 400 } }); const f = `${dir}/.sheet-${name}.html`; fs.writeFileSync(f, page(title, panels, note)); await p.goto(`file://${f}`); await p.waitForLoadState('load'); await p.waitForTimeout(400); fs.unlinkSync(f); await p.screenshot({ path: `${dir}/sheet-${name}.jpg`, type: 'jpeg', quality: 84, fullPage: true }); await p.close(); }
for (const [key, title, note, shots] of cases) { const L = R.results[key === 'fire-group' ? 'fireGroup' : key === 'fire-lone' ? 'fireLone' : key === 'fire-numbered' ? 'fireNumbered' : key === 'frost-first' ? 'frostFirst' : key === 'frost-numbered' ? 'frostNumbered' : key];
  await sheet(key, title, shots.map((s) => ({ f: `${key}-r1-${s}`, cap: s === 'dice' ? 'Before Lock in: the board shows the arrow die, the hand and the banner' : 'After the round: the report' })), note(L)); }
{ const L = R.results.frostLate; const e = (r) => `${r.acts[0][0]} ${r.acts[0][1]}${r.acts[0][2] ? ' (chilled)' : ''}${r.acts[0][3] ? ', struck first' : ''}`;
  await sheet('frost-late', 'Frost arrows, the monster acts first: the chill softens its NEXT blow', [1, 2, 3].map((n) => ({ f: `frost-late-r${n}-result-b`, cap: `Round ${n}: arrow die ${L[n - 1].dice} · ${e(L[n - 1])}` })), `Round 1 (no arrowhead): the Ogre’s Club lands for 12. Round 2: the arrowhead lands, but the Ogre’s initiative die beat the archer’s feet (set for the demonstration), so its Club had already struck at ${L[1].acts[0][1]}; the arrow leaves the chill. Round 3: the chill is spent on its next blow: ${L[2].acts[0][1]} instead of 12. The chill reduces a blow that has not happened yet; it cannot undo one that has. (The banner at the top of each picture already shows the next round.)`); }
{ const f = ['normal', 'pierce', 'fire', 'frost'].map((a) => ({ f: `camp-${a}`, cap: { normal: 'Normal', pierce: 'Piercing', fire: 'Fire', frost: 'Frost' }[a] })); await sheet('camp', 'Camp: choosing the ammunition (free, any time)', f, 'Gear → Left weapon die → Arrows → AMMUNITION. The face strip under “Current” changes with the choice (an arrowhead is the face with the mark: Piercing ➶, Fire 🔥, Frost ❄; Normal has none).'); }
await b.close(); console.log(fs.readdirSync(dir).filter((f) => f.startsWith('sheet-')));
