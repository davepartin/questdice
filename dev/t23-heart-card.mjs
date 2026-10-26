// T23 phone render and purchase/save checks. Requires an installed Playwright Chromium.
// node dev/t23-heart-card.mjs [output directory] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out=process.argv[2]||'shots/t23';const port=+(process.argv[3]||8158);fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['dev/serve.mjs',String(port)],{stdio:['ignore','pipe','inherit']});
let browser;let failed=0;
const check=(label,ok,detail)=>{console.log(ok?'PASS':'FAIL',label,detail||'');if(!ok)failed++;};
try {
 await new Promise(r=>server.stdout.once('data',r));
 browser=await chromium.launch({executablePath:process.env.CHROME||chromium.executablePath(),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 for(const [width,height] of [[390,844],[375,548],[430,932]]) {
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('qd.hints','off');localStorage.setItem('qd.tutorial.done','1');localStorage.setItem('questdice.hero.untouched','LIVE');});
  await p.goto(`http://localhost:${port}/preview/heart-upgrades/?debug&manual&q=low`);await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});
  const pump=()=>p.evaluate(async()=>{for(let i=0;i<30;i++){window.QD.world.stage.simulate(1/15,1/30);await new Promise(r=>setTimeout(r,0));}});
  await p.evaluate(async()=>{const {S,E,showCamp}=window.QD;const hero=E.newHero({name:'HeartUI',cls:'knight',seed:5});hero.gold=500;hero.campaign.act=1;S.hero=hero;S.company={members:[hero]};S.seat=0;S.tab='forge';S.campPage='dice';const SV=await import(new URL('js/save.js',document.baseURI));await SV.createSave(hero,'testpass');showCamp();});await pump();
  const open=async()=>{await p.locator('.cw-cell.s-C').click();await pump();};await open();
  const state=()=>p.evaluate(()=>({rank:window.QD.E.heartRankOf(window.QD.S.hero),gold:window.QD.S.hero.gold}));
  await p.locator('[data-heart-rank="2"]').click();check(`${width}: Act I locked`,JSON.stringify(await state())===JSON.stringify({rank:1,gold:500}));
  await p.screenshot({path:`${out}/heart-act1-${width}x${height}.png`});
  await p.evaluate(()=>{window.QD.S.hero.campaign.act=2;window.QD.showCamp();});await pump();await open();
  await p.locator('[data-heart-rank="2"].ready').click();await pump();check(`${width}: Act II purchase`,JSON.stringify(await state())===JSON.stringify({rank:2,gold:300}));
  await p.locator('[data-heart-rank="3"]').click();check(`${width}: rank 3 still gated`,(await state()).rank===2);
  await p.screenshot({path:`${out}/heart-act2-${width}x${height}.png`});
  await p.evaluate(()=>{window.QD.S.hero.campaign.act=3;window.QD.showCamp();});await pump();await open();
  await p.locator('[data-heart-rank="3"].ready').click();await pump();check(`${width}: Act III purchase`,JSON.stringify(await state())===JSON.stringify({rank:3,gold:0}));
  await p.screenshot({path:`${out}/heart-max-${width}x${height}.png`});
  check(`${width}: card fits`,await p.locator('.cb-heart').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
  await p.reload();await p.waitForFunction(()=>window.QD?.world?.stage,null,{timeout:120000});
  const saved=await p.evaluate(async()=>{const SV=await import(new URL('js/save.js',document.baseURI));const h=await SV.openHero('HeartUI','testpass');return {rank:h.heartRank,gold:h.gold,live:localStorage.getItem('questdice.hero.untouched')};});
  check(`${width}: reload and live namespace`,saved.rank===3&&saved.gold===0&&saved.live==='LIVE');check(`${width}: page errors`,!errors.length,errors.join('; '));await ctx.close();
 }
} finally {await browser?.close();server.kill();}
process.exitCode=failed?1:0;
