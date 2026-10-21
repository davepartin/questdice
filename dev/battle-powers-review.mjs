// Run from the repo root with Playwright available and CHROMIUM_PATH set to a local Chromium binary.
import {chromium} from 'playwright-core';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=process.cwd(),out=root+'/shots/battle-powers';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs','8135'],{cwd:root});await new Promise(r=>server.stdout.once('data',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await browser.newPage({viewport:{width:390,height:740},deviceScaleFactor:2,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/,r=>r.abort());await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');});
const pump=async seconds=>p.evaluate(async seconds=>{for(let i=0;i<seconds*20;i++){window.QD.world.stage.simulate(.05,.033);await new Promise(r=>setTimeout(r,0));}},seconds);
const shot=async name=>{await pump(.2);await p.screenshot({path:out+'/'+name+'.png'});};
try {
 await p.goto('http://127.0.0.1:8135/?debug&manual&q=low');await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:90000});await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:393,height:852});
 await p.evaluate(async()=>{const {S,E,showBoard}=window.QD;const h=E.newHero({name:'Magic Dave',cls:'wizard',seed:5});h.dice=null;h.level=9;S.hero=h;S.company={members:[h]};const SV=await import('./js/save.js');await SV.createSave(h,'testpass');showBoard();const q={...E.questsFor(h)[0],enemies:['goblin'],kind:'boss'};window.QD.startQuest(q);});
 for(let i=0;i<100;i++){await pump(.5);if(await p.evaluate(()=>window.QD.B3.battleState.bw&&!window.QD.B3.battleState.busy))break;}
 await p.evaluate(()=>{const {B3,E,S}=window.QD;const B=B3.battleState;B.b.board=E.rollBoard(S.hero,E.makeRng(5));B.b.phase='shape';B.b.magic=12;B.b.hp=B.b.maxHp-10;B.busy=false;B3.renderShape();});
 await p.locator('.b3-powers').first().click();await shot('overview');assert.equal(await p.locator('.pw-stage .pw-medal').count(),3);assert.equal(await p.locator('.pw-helpers .pw-medal').count(),3);
 const before=await p.evaluate(()=>JSON.stringify(window.QD.S.battle));await p.locator('[data-power="arcbolt"]').click();assert.equal(await p.evaluate(()=>JSON.stringify(window.QD.S.battle)),before);await shot('selected');
 const cost=await p.locator('.pd-cost b').innerText();await p.getByRole('button',{name:'More magic, one more die'}).click();assert.equal(+await p.locator('.pd-cost b').innerText(),+cost+2);assert.equal(await p.evaluate(()=>JSON.stringify(window.QD.S.battle)),before);
 await p.getByRole('button',{name:'Less magic, one die fewer'}).click();await p.locator('.pw-detail .pw-btn.go').click();await pump(.5);assert.equal(await p.evaluate(()=>window.QD.S.battle.magic),12-Number(cost));await p.waitForFunction(()=>!!document.querySelector('.dr-ok:not(:disabled)'));await p.locator('.dr-ok').click();await pump(.5);
 await p.locator('.b3-powers').first().click();await p.locator('[data-power="coil"]').click();await shot('charge');
 for(const [w,h,name]of[[375,600,'short'],[844,390,'landscape'],[1280,800,'desktop']]){await p.setViewportSize({width:w,height:h});await pump(.4);await p.locator('[data-power="u:heart"]').click();await p.locator('.pw-detail .pw-btn').first().scrollIntoViewIfNeeded();await p.locator('.pw-detail .pw-btn').last().scrollIntoViewIfNeeded();assert.equal(await p.locator('.pw-detail .pw-btn').last().isVisible(),true);await shot(name);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log('PASS: three class powers + three helpers; browsing/scale preview read-only; actual cast deducts exact magic; charge details and heart actions reachable on phone/landscape/desktop; zero page errors');
}finally{await browser.close();server.kill();}
