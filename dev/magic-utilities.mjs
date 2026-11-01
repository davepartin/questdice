// mb1 (Crockpot / Grok Bot, 29 Oct 2026): the Bard's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-bard.mjs [out=/workspace/magic-bard] [port=8188]
// Mending Song (green d6 heal, 1 magic each, party), Lucky Verse (2 magic d6), Rising Ballad charge/use.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-bard'; const port = +(process.argv[3] || 8190); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'bard', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Mb1Bard');
const setupDeadline=Date.now()+90000;
while(Date.now()<setupDeadline){await pump(.5);if(await p.evaluate(()=>{const B=window.QD.B3?.battleState;return !!B?.bw&&!!B.hud?.place&&!B.starting&&!B.busy;}))break;await p.waitForTimeout(50);}
await p.waitForFunction(()=>{const B=window.QD.B3?.battleState;return !!B?.bw&&!!B.hud?.place&&!B.starting&&!B.busy;},null,{timeout:1000});
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, atk: b.mods.atk || 0, block: b.mods.block || 0, splash: b.mods.splash || 0, gold: b.goldEarned || 0, heal: b.mods.heal || 0, charge: b.charge?.ballad || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 12; B.b.usedRound = {}; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers:not(.b3-team)').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Mending Song, Lucky Verse, Rising Ballad; Potion, Heal, Heart change', tiles.join() === 'mending,luckyverse,ballad,u:bigheal,u:heal,u:heart', tiles.join());
await p.waitForFunction(() => !!document.querySelector('.b3-sheet.open .mc-sheet') && Math.abs(document.querySelector('.b3-sheet.open').getBoundingClientRect().height - innerHeight) < 2); const fs1 = await p.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, vh: innerHeight, sheet: document.querySelector('.b3-sheet.open')?.getBoundingClientRect().height }));
check('Magic sheet is full screen with no scroll', fs1.sh === fs1.vh && Math.abs(fs1.sheet - fs1.vh) < 2, JSON.stringify(fs1));
await shot('mb1-panel');
const css = (sel) => p.evaluate((sel) => { const b = document.querySelector(sel); const cs = getComputedStyle(b); return b.textContent + ' ' + cs.backgroundColor + ' / ' + cs.color; }, sel);

await p.evaluate(()=>{const B=window.QD.B3.battleState;B.b.hp=B.b.maxHp-20;B.b.board.C.v=3;window.QD.B3.renderShape();});
for(const [width,height] of [[390,844],[375,667]]){
await p.setViewportSize({width,height});
for(const id of ['u:bigheal','u:heal','u:heart']){
await p.locator(`.mc-tile[data-power="${id}"]`).click();await pump(.3);
const result=await p.evaluate(()=>{const c=document.querySelector('.mc-utility');const r=c.getBoundingClientRect();return{card:!!c,bottom:r.bottom,scroll:document.scrollingElement.scrollHeight,buttons:[...c.querySelectorAll('button')].length};});
check(`${id} framed card fits ${width}`,result.card&&result.bottom<=height+1&&result.scroll===height,JSON.stringify(result));
check('No utility footer caption', await p.locator('.mc-util-footer').count() === 0);
if(id==='u:heal') check('Heal shows two magic triangles to three life pluses without duplicate health',await p.evaluate(()=>{const c=document.querySelector('.mc-utility.healing');return c.querySelectorAll('.mc-exchange-input .ic-magic').length===2&&c.querySelectorAll('.mc-exchange-output .ic-heal').length===3&&c.querySelector('.mc-exchange-arrow').textContent==='→'&&!c.querySelector('.mc-health-track,.mc-restore,[role="meter"]')&&c.querySelector('.mc-heal-exchange').scrollWidth<=c.querySelector('.mc-util-panel').clientWidth;}));
if(id!=='u:heart') check('Fantasy utility scene loaded without a bottle tint',await p.evaluate(()=>{const im=document.querySelector('.mc-utility-scene');return im?.complete&&im.naturalWidth>0&&im.getAttribute('src').includes('/utilities/')&&getComputedStyle(im).filter==='none';}));
if(id==='u:heart') {
check('Destination faces are larger than the current center face',await p.evaluate(()=>{const cur=document.querySelector('.mc-heart-current .hc-face').getBoundingClientRect().width;return [...document.querySelectorAll('.mc-heart-outcome .hc-face')].every(im=>im.getBoundingClientRect().width>cur*1.4);}));
check('No Heart instruction paragraphs', await p.evaluate(()=>![...document.querySelectorAll('.mc-heart-effect p,.mc-heart-effect small')].length));
check('Heart Change title and boxed actual cost', await p.evaluate(()=>document.querySelector('.mc-utility .mc-plaque').textContent==='Heart Change' && document.querySelector('.mc-tile[data-power="u:heart"] span').textContent==='Heart Change' && document.querySelector('.mc-utility .mc-cast-cost').textContent.trim()==='3'));
check('Dice grid and raised heart die artwork', await p.evaluate(()=>document.querySelector('.mc-heart-map').getAttribute('src')===document.querySelector('.mc-heart-die').getAttribute('src')));
check('Heart buttons above the card: down OR up, with accessible labels', await p.evaluate(()=>{const bar=document.querySelector('.mc-heart-ctl');const card=document.querySelector('.mc-utility.heart');const bs=[...bar.querySelectorAll('.mc-heart-nudge')];return bs.length===2&&bs.map(b=>b.textContent).join('|')==='▼|▲'&&bs.every(b=>!!b.getAttribute('aria-label'))&&bar.querySelector('.mc-or').textContent==='OR'&&!!bar.querySelector('.mc-heart-use')&&bar.querySelector('.mc-heart-use').disabled&&bar.getBoundingClientRect().bottom<=card.getBoundingClientRect().top&&!card.querySelector('button')&&card.querySelectorAll('.mc-heart-faces .hc-face').length===3;}));
}
if(id==='u:bigheal') check('Five slots, two filled healing chits and green life corners',await p.evaluate(()=>document.querySelectorAll('.mc-potion-slot').length===5&&document.querySelectorAll('.mc-potion-chit').length===2&&document.querySelectorAll('.mc-life-corners>.ic').length===4&&[...document.querySelectorAll('.mc-potion-chit b')].every(e=>e.textContent==='+10')));
if(id==='u:bigheal') check('Used and future spaces share the same punchboard material',await p.evaluate(()=>{const slots=[...document.querySelectorAll('.mc-potion-slot')];const style=el=>{const s=getComputedStyle(el,'::before');return [s.backgroundImage,s.backgroundColor,s.clipPath,s.borderStyle].join('|');};return new Set(slots.map(style)).size===1&&getComputedStyle(document.querySelector('.mc-potion-chit'),'::after').clipPath.startsWith('polygon') && getComputedStyle(document.querySelector('.mc-util-panel')).backgroundImage==='none' && slots.every(el=>getComputedStyle(el,'::before').backgroundImage==='none');}));
await p.screenshot({path:`${OUT}/${id.slice(2)}-${width}.png`});
}
const rects=[];
for(const id of tiles){await p.locator(`.mc-tile[data-power="${id}"]`).click();await pump(.05);rects.push(await p.evaluate(()=>{const r=document.querySelector('.mc-card').getBoundingClientRect();return [r.width,r.height,r.top];}));}
check(`All six cards retain the same size and position ${width}`,rects.every(r=>r.every((n,i)=>Math.abs(n-rects[0][i])<1)),JSON.stringify(rects));
}
await p.locator('.mc-tile[data-power="u:heal"]').click();const before=await p.evaluate(()=>{const b=window.QD.B3.battleState.b;return{hp:b.hp,magic:b.magic};});await p.locator('.mc-ctl .mc-use').click();await pump(.3);
check('Heal button converts exactly two magic into three health and retains the exchange card',await p.evaluate(before=>{const b=window.QD.B3.battleState.b;return b.hp===before.hp+3&&b.magic===before.magic-2&&!!document.querySelector('.mc-utility.healing .mc-heal-exchange')&&!document.querySelector('.mc-utility.healing .mc-util-result');},before));
await p.locator('.mc-tile[data-power="u:bigheal"]').click();const pot=await p.evaluate(()=>window.QD.E.potionsLeft(window.QD.B3.battleState.b));await p.locator('.mc-ctl .mc-use').click();check('Consumed chit slides away',await p.evaluate(()=>!!document.querySelector('.mc-potion-depart')));await pump(.3);check('Potion inventory consumed and card retained',await p.evaluate(pot=>window.QD.E.potionsLeft(window.QD.B3.battleState.b)===pot-1&&!!document.querySelector('.mc-utility.potion'),pot));
await p.locator('.mc-tile[data-power="u:heart"]').click();const heartMagic=await p.evaluate(()=>window.QD.B3.battleState.b.magic);await p.locator('.mc-heart-ctl .hc-up').click();await pump(.1);
check('Heart arrow only previews; Use is a separate action',await p.evaluate(m=>{const b=window.QD.B3.battleState.b;return b.board.C.v===3&&b.magic===m&&!b.board.nudged&&document.querySelector('.mc-heart-faces').dataset.selection==='1'&&!document.querySelector('.mc-heart-use').disabled;},heartMagic));

await p.locator('.mc-tile[data-power="u:bigheal"]').click();await p.locator('.mc-ctl .mc-use').click();await pump(.3);check('All five empty recesses look identical after drinking both',await p.evaluate(()=>document.querySelectorAll('.mc-potion-tray .mc-potion-chit').length===0&&new Set([...document.querySelectorAll('.mc-potion-slot')].map(el=>{const s=getComputedStyle(el,'::before');return s.background+'|'+s.clipPath;})).size===1));await p.screenshot({path:`${OUT}/empty-potions.png`});
await p.evaluate(()=>{const b=window.QD.B3.battleState.b;b.potions=1;b.hero.potions=1;});
await p.evaluate(()=>{const {E,B3}=window.QD;const b=B3.battleState.b;b.hero.gold=100;E.buyPotion(b.hero);b.potions=b.hero.potions;B3.renderShape();});await p.locator('.mc-tile[data-power="u:bigheal"]').click();check('Restocked potion fills its slot',await p.evaluate(()=>document.querySelectorAll('.mc-potion-tray .mc-potion-chit').length===2));await p.screenshot({path:`${OUT}/restocked.png`});
check('no page errors',!errs.length,errs.join(' | '));await br.close();server.kill();process.exit(bad?1:0);
